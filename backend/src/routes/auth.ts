import { Hono } from 'hono';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import db from '../database.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { getEnvVar } from '../config.js';

const authRouter = new Hono();

const getOAuthClient = () => {
  const clientId = getEnvVar('GOOGLE_CLIENT_ID') || 'dummy';
  return new OAuth2Client(clientId);
};

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
        return c.json({ success: true, data: user });
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

    return c.json({ success: true, data: user });
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
    const passwordHash = await Bun.password.hash(password);

    try {
      const stmt = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)');
      const info = await stmt.run(email, name, passwordHash);

      return c.json({ success: true, data: { id: info.lastInsertRowid, email, name, target_language: 'English' } }, 201);
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

    const isMatch = await Bun.password.verify(password, user.password_hash);
    if (!isMatch) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    return c.json({ success: true, data: { id: user.id, name: user.name, email: user.email || email, target_language: user.target_language } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

const updateProfileSchema = z.object({
  userId: z.number(),
  name: z.string().min(1),
  password: z.string().min(6).optional(),
  target_language: z.string().optional(),
});

authRouter.post('/update-profile', authRateLimiter, async (c) => {
  try {
    const body = await c.req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, error: 'Invalid update payload' }, 400);
    }

    const { userId, name, password, target_language } = result.data;

    if (password) {
      const passwordHash = await Bun.password.hash(password);
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
