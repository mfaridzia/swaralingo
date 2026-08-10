import { Hono } from 'hono';
import { z } from 'zod';
import webpush from 'web-push';
import db from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import { getEnvVar } from '../config.js';

const notificationsRouter = new Hono();

// Generate or read VAPID keys
let vapidKeys = {
  publicKey: '',
  privateKey: '',
};

function getVapidKeys() {
  if (vapidKeys.publicKey && vapidKeys.privateKey) {
    return vapidKeys;
  }
  const pub = getEnvVar('VAPID_PUBLIC_KEY');
  const priv = getEnvVar('VAPID_PRIVATE_KEY');
  if (pub && priv) {
    vapidKeys.publicKey = pub;
    vapidKeys.privateKey = priv;
  } else {
    // Dynamically generate for local development
    try {
      const generated = webpush.generateVAPIDKeys();
      vapidKeys.publicKey = generated.publicKey;
      vapidKeys.privateKey = generated.privateKey;
      console.log('VAPID Keys generated dynamically for dev session.');
    } catch (e) {
      console.error('Failed to generate VAPID keys:', e);
    }
  }
  return vapidKeys;
}

// Set up webpush configuration
function setupWebPush() {
  const keys = getVapidKeys();
  const contact = getEnvVar('VAPID_CONTACT_EMAIL') || 'mailto:admin@swaralingo.dev';
  if (keys.publicKey && keys.privateKey) {
    webpush.setVapidDetails(contact, keys.publicKey, keys.privateKey);
  }
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
    const count = await triggerDailyReminders();
    return c.json({ success: true, triggeredCount: count });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Triggers sending push notifications to all users whose alarm_time matches the current hour/minute.
 * Runs on cron schedule (every minute or every 15 minutes, matches HH:MM UTC).
 */
export async function triggerDailyReminders(): Promise<number> {
  setupWebPush();
  
  // Get current time in UTC formatted as "HH:MM"
  const now = new Date();
  const utcHours = now.getUTCHours().toString().padStart(2, '0');
  const utcMinutes = now.getUTCMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${utcHours}:${utcMinutes}`;
  
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
    return 0;
  }

  let sentCount = 0;
  for (const sub of activeSubs) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    const payload = JSON.stringify({
      title: 'Time to practice! ⚡',
      body: 'Keep your daily streak alive. Open SwaraLingo to practice speaking English now.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: {
        url: '/dashboard'
      }
    });

    try {
      await webpush.sendNotification(pushSubscription, payload);
      sentCount++;
    } catch (err: any) {
      // Clean up dead/expired subscriptions (Web Push returns 410 Gone or 404 Not Found if expired)
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`[Push Notification Cron] Cleaning up expired subscription ID: ${sub.id}`);
        const deleteStmt = db.prepare('DELETE FROM push_subscriptions WHERE id = ?');
        await deleteStmt.run(sub.id);
      } else {
        console.error(`[Push Notification Cron] Failed to send to sub ID ${sub.id}:`, err.message);
      }
    }
  }

  return sentCount;
}

export default notificationsRouter;
