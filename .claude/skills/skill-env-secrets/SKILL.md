---
name: skill-env-secrets
description: "Prosedur validasi environment variables & secret management menggunakan Zod Schema saat startup."
---

# Skill Procedure: Type-Safe Environment Variables Validation

1. Buat file `src/env.ts`.
2. Definikan Zod Schema untuk seluruh variabel env:
   ```ts
   import { z } from 'zod';
   export const envSchema = z.object({
     DATABASE_URL: z.string().url(),
     JWT_SECRET: z.string().min(32),
     NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
   });
   export const env = envSchema.parse(process.env);
   ```
3. Import `env` dari `src/env.ts` di seluruh aplikasi. Aplikasi akan langsung crash dengan pesan error jelas jika ada env variable yang hilang saat disatukan!
