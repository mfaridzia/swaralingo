import { Hono } from 'hono';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import db from '../database.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { requireAuth, setAuthCookie, clearAuthCookie, signToken } from '../middleware/auth.js';
import { getInitialDashboardData } from '../helpers/dashboard.js';
import { getEnvVar } from '../config.js';

const authRouter = new Hono();

const getOAuthClient = () => {
  const clientId = getEnvVar('GOOGLE_CLIENT_ID') || 'dummy';
  return new OAuth2Client(clientId);
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey", "deriveBits"]
  );
  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(key)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('$2')) {
    if (typeof Bun !== 'undefined') {
      return await Bun.password.verify(password, storedHash);
    }
    throw new Error("Legacy bcrypt hash cannot be verified in this environment.");
  }
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [saltHex, hashHex] = parts;
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey", "deriveBits"]
  );
  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const currentHashHex = Array.from(new Uint8Array(key)).map(b => b.toString(16).padStart(2, '0')).join('');
  return currentHashHex === hashHex;
}

authRouter.post('/google', authRateLimiter, async (c) => {
  try {
    const { credential } = await c.req.json();
    if (!credential) {
      return c.json({ success: false, error: 'Missing Google credential token.' }, 400);
    }

    let payload;
    const clientId = getEnvVar('GOOGLE_CLIENT_ID');
    try {
      const ticket = await getOAuthClient().verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (verifyErr: any) {
      if (!clientId || clientId.includes('dummy')) {
        console.warn("Using dummy Client ID. Simulating Google OAuth decoding...");
        const mockEmail = 'farid.dev@gmail.com';
        const mockName = 'Muhammad Farid Zia';
        
        let user = await db.query('SELECT id, name, email, target_language FROM users WHERE email = ?').get(mockEmail) as any;
        if (!user) {
          const stmt = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)');
          const info = await stmt.run(mockEmail, mockName, 'GOOGLE_AUTH_EXTERNAL');
          user = { id: info.lastInsertRowid, name: mockName, email: mockEmail, target_language: 'English' };
        }
        await setAuthCookie(c, user.id);
        const token = await signToken(user.id);
        const dashboard = await getInitialDashboardData(user.id);
        return c.json({ success: true, data: user, token, dashboard });
      }
      throw verifyErr;
    }

    if (!payload || !payload.email) {
      return c.json({ success: false, error: 'Invalid Google payload data.' }, 400);
    }

    const { email, name = 'Google User' } = payload;
    let user = await db.query('SELECT id, name, email, target_language FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      const stmt = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)');
      const info = await stmt.run(email, name, 'GOOGLE_AUTH_EXTERNAL');
      user = { id: info.lastInsertRowid, name, email, target_language: 'English' };
    }

    await setAuthCookie(c, user.id);
    const token = await signToken(user.id);
    const dashboard = await getInitialDashboardData(user.id);
    return c.json({ success: true, data: user, token, dashboard });
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    return c.json({ success: false, error: 'Failed to verify Google Sign-In: ' + error.message }, 500);
  }
});

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
});

authRouter.post('/register', authRateLimiter, async (c) => {
  try {
    const body = await c.req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, error: 'Invalid parameters. Password min 6 chars.' }, 400);
    }

    const { email, name, password } = result.data;
    const passwordHash = await hashPassword(password);

    try {
      const stmt = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)');
      const info = await stmt.run(email, name, passwordHash);

      await setAuthCookie(c, Number(info.lastInsertRowid));
      const token = await signToken(Number(info.lastInsertRowid));
      const dashboard = await getInitialDashboardData(Number(info.lastInsertRowid));
      return c.json({ success: true, data: { id: info.lastInsertRowid, email, name, target_language: 'English' }, token, dashboard }, 201);
    } catch (dbErr: any) {
      if (dbErr.message.includes('UNIQUE constraint failed')) {
        return c.json({ success: false, error: 'Email already registered' }, 400);
      }
      throw dbErr;
    }
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Logout: hapus session cookie
authRouter.post('/logout', requireAuth, async (c) => {
  clearAuthCookie(c);
  return c.json({ success: true, data: null });
});

authRouter.post('/login', authRateLimiter, async (c) => {
  try {
    const body = await c.req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, error: 'Invalid login details' }, 400);
    }

    const { email, password } = result.data;
    const stmt = db.prepare('SELECT id, name, email, target_language, password_hash FROM users WHERE email = ?');
    const user = await stmt.get(email) as any;

    if (!user) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    if (user.password_hash === 'GOOGLE_AUTH_EXTERNAL') {
      return c.json({ success: false, error: 'This account uses Google Sign-In. Please sign in with Google.' }, 401);
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    await setAuthCookie(c, user.id);
    const token = await signToken(user.id);
    const dashboard = await getInitialDashboardData(user.id);
    return c.json({ success: true, data: { id: user.id, name: user.name, email: user.email || email, target_language: user.target_language }, token, dashboard });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

const updateProfileSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(6).optional(),
  target_language: z.string().optional(),
});

// Identitas dari session token — userId client diabaikan (menutup IDOR account takeover)
authRouter.post('/update-profile', authRateLimiter, requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, error: 'Invalid update payload' }, 400);
    }

    const userId = c.get('authUserId');
    const { name, password, target_language } = result.data;

    if (password) {
      const passwordHash = await hashPassword(password);
      if (target_language) {
        const stmt = db.prepare('UPDATE users SET name = ?, password_hash = ?, target_language = ? WHERE id = ?');
        await stmt.run(name, passwordHash, target_language, userId);
      } else {
        const stmt = db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE id = ?');
        await stmt.run(name, passwordHash, userId);
      }
    } else {
      if (target_language) {
        const stmt = db.prepare('UPDATE users SET name = ?, target_language = ? WHERE id = ?');
        await stmt.run(name, target_language, userId);
      } else {
        const stmt = db.prepare('UPDATE users SET name = ? WHERE id = ?');
        await stmt.run(name, userId);
      }
    }

    const getStmt = db.prepare('SELECT id, name, email, target_language FROM users WHERE id = ?');
    const updatedUser = await getStmt.get(userId) as any;

    return c.json({ success: true, data: updatedUser });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default authRouter;
