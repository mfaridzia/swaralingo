---
name: skill-security-audit
description: "Prosedur audit keamanan API berdasarkan standar OWASP Top 10."
---

# Skill Procedure: Security Audit (OWASP Checklist)

1. Verifikasi penulisan DB query menggunakan Drizzle ORM (Zero Raw SQL concatenation).
2. Verifikasi CORS middleware terkonfigurasi dengan domain yang diizinkan saja.
3. Verifikasi hashing password menggunakan `argon2` atau `bcrypt`.
4. Pastikan Rate Limiting middleware terpasang pada route Auth/Login.
