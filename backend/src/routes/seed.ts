import { Hono } from 'hono';
import db from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const seedRouter = new Hono();

// Hanya seed ke akun sendiri (session token) — mencegah hapus chunks user lain
seedRouter.use('*', requireAuth);

seedRouter.post('/', async (c) => {
  try {
    const userId = c.get('authUserId');
    const initialChunks = [
      { phrase: "I'm working on...", meaning: "Saya sedang mengerjakan...", example: "I'm working on the payment gateway API." },
      { phrase: "I managed to...", meaning: "Saya berhasil...", example: "I managed to optimize the query speed by 50%." },
      { phrase: "I'm stuck with...", meaning: "Saya terkendala/macet dengan...", example: "I'm stuck with this configuration error." },
      { phrase: "Could you help me with...", meaning: "Bisakah kamu membantu saya dengan...", example: "Could you help me with the deployment setup?" },
      { phrase: "From my point of view...", meaning: "Dari sudut pandang saya...", example: "From my point of view, we should rewrite this helper." },
    ];

    const deleteStmt = db.prepare('DELETE FROM sentence_chunks WHERE user_id = ?');
    await deleteStmt.run(userId);

    const insertStmt = db.prepare(
      'INSERT INTO sentence_chunks (user_id, phrase, meaning, example, category) VALUES (?, ?, ?, ?, ?)'
    );

    for (const chunk of initialChunks) {
      await insertStmt.run(userId, chunk.phrase, chunk.meaning, chunk.example, 'IT & Daily');
    }

    return c.json({ success: true, message: 'Seeded default templates successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default seedRouter;
