---
name: skill-monitoring-sentry
description: "Prosedur integrasi error tracking Sentry & structured JSON logging untuk produksi."
---

# Skill Procedure: Production Monitoring & Observability

1. Pasang Sentry SDK di Backend Hono dan Frontend React.
2. Buat error handler middleware Hono untuk menangkap unhandled exceptions dan mengirimnya ke Sentry:
   ```ts
   app.onError((err, c) => {
     Sentry.captureException(err);
     return c.json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: err.message } }, 500);
   });
   ```
3. Gunakan structured JSON logger (`Pino.js`) untuk memudahkan query log di cloud providers.
