import { Hono } from 'hono';
import { z } from 'zod';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import db from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import { getEnvVar } from '../config.js';

const notificationsRouter = new Hono();

const DEFAULT_VAPID_PUB = "BBJn3qbYXZxRcKLbX_T2mow56XrAFGinh9Je4xcpHba0GIn70jGjvc1Hud6jXk_9Ipa6kC3wGchrEJiW12qg7S8";
const DEFAULT_VAPID_PRIV = "aGBvX0eyJD4yLKFtDesBkivpea4O2z-apAAjJwIfdIU";

function getVapidKeys() {
  const pub = getEnvVar('VAPID_PUBLIC_KEY') || DEFAULT_VAPID_PUB;
  const priv = getEnvVar('VAPID_PRIVATE_KEY') || DEFAULT_VAPID_PRIV;
  return { publicKey: pub, privateKey: priv };
}

// Zod schemas
const subscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  alarmTime: z.string().regex(/^\d{2}:\d{2}$/), // UTC HH:MM
});

// GET: Get VAPID Public Key (Frontend needs this to subscribe)
notificationsRouter.get('/vapid-public-key', (c) => {
  const keys = getVapidKeys();
  return c.json({ success: true, publicKey: keys.publicKey });
});

// POST: Save or update subscription
notificationsRouter.post('/subscribe', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const result = subscriptionSchema.safeParse(body);
    if (!result.success) {
      return c.json({ success: false, error: 'Invalid subscription data format' }, 400);
    }

    const userId = c.get('authUserId');
    const { subscription, alarmTime } = result.data;

    // Save to database (upsert by endpoint)
    const existing = await db.query(
      'SELECT id FROM push_subscriptions WHERE endpoint = ?'
    ).get(subscription.endpoint) as { id: number } | undefined;

    if (existing) {
      const stmt = db.prepare(
        'UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ?, alarm_time = ? WHERE id = ?'
      );
      await stmt.run(userId, subscription.keys.p256dh, subscription.keys.auth, alarmTime, existing.id);
    } else {
      const stmt = db.prepare(
        'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, alarm_time) VALUES (?, ?, ?, ?, ?)'
      );
      await stmt.run(userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, alarmTime);
    }

    return c.json({ success: true, message: 'Subscribed successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST: Unsubscribe (Delete subscription)
notificationsRouter.post('/unsubscribe', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const endpoint = body?.endpoint;
    if (!endpoint) {
      return c.json({ success: false, error: 'Endpoint is required' }, 400);
    }
    const userId = c.get('authUserId');
    const stmt = db.prepare(
      'DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?'
    );
    await stmt.run(endpoint, userId);
    return c.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST: Trigger check for scheduled notifications (Manual or cron backup)
notificationsRouter.post('/trigger-cron', async (c) => {
  // Simple check for cron secret key if deployed, or bypass in local dev
  const cronSecret = getEnvVar('CRON_SECRET');
  const authHeader = c.req.header('Authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    let body: any = {};
    try {
      body = await c.req.json();
    } catch (e) {
      // Ignored
    }
    const result = await triggerDailyReminders(body?.time);
    return c.json({ success: true, triggeredCount: result.sentCount, errors: result.errors });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Triggers sending push notifications to all users whose alarm_time matches the current hour/minute.
 * Runs on cron schedule (every minute or every 15 minutes, matches HH:MM UTC).
 */
export async function triggerDailyReminders(overrideTime?: string): Promise<{ sentCount: number, errors: string[] }> {
  let currentTimeStr = overrideTime;
  if (!currentTimeStr) {
    // Get current time in UTC formatted as "HH:MM"
    const now = new Date();
    const utcHours = now.getUTCHours().toString().padStart(2, '0');
    const utcMinutes = now.getUTCMinutes().toString().padStart(2, '0');
    currentTimeStr = `${utcHours}:${utcMinutes}`;
  }
  
  console.log(`[Push Notification Cron] Running at UTC ${currentTimeStr}...`);

  // Query all subscriptions matching the current time slot
  // We match matching alarm_time (e.g. "12:00")
  const activeSubs = await db.query(
    'SELECT * FROM push_subscriptions WHERE alarm_time = ?'
  ).all(currentTimeStr) as Array<{
    id: number;
    user_id: number;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>;

  if (activeSubs.length === 0) {
    return { sentCount: 0, errors: [] };
  }

  const errors: string[] = [];
  let sentCount = 0;
  
  for (const sub of activeSubs) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      expirationTime: null,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    const keys = getVapidKeys();
    const vapid = {
      subject: getEnvVar('VAPID_CONTACT_EMAIL') || 'mailto:admin@swaralingo.dev',
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    };

    const message = {
      data: JSON.stringify({
        title: 'Time to practice! ⚡',
        body: 'Keep your daily streak alive. Open SwaraLingo to practice speaking English now.',
        icon: '/icon.svg',
        badge: '/icon.svg',
        data: {
          url: '/dashboard'
        }
      }),
      options: {
        ttl: 60 * 60, // 1 hour
      }
    };

    try {
      const payload = await buildPushPayload(message, pushSubscription, vapid);
      const res = await fetch(pushSubscription.endpoint, {
        method: payload.method,
        headers: payload.headers,
        body: payload.body as any,
      });

      if (res.status === 201 || res.status === 200 || res.status === 202) {
        sentCount++;
      } else {
        if (res.status === 410 || res.status === 404) {
          console.log(`[Push Notification Cron] Cleaning up expired subscription ID: ${sub.id}`);
          const deleteStmt = db.prepare('DELETE FROM push_subscriptions WHERE id = ?');
          await deleteStmt.run(sub.id);
        } else {
          const resText = await res.text();
          console.error(`[Push Notification Cron] HTTP ${res.status} error for sub ID ${sub.id}:`, resText);
          errors.push(`Sub ID ${sub.id} HTTP Error ${res.status}: ${resText}`);
        }
      }
    } catch (err: any) {
      console.error(`[Push Notification Cron] Exception for sub ID ${sub.id}:`, err);
      errors.push(`Sub ID ${sub.id} Exception: ${err.message || err.toString()}`);
    }
  }

  return { sentCount, errors };
}

export default notificationsRouter;
