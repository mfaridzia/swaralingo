---
name: skill-code-review
description: "Prosedur audit kualitas kode, strict type-safety, memory leaks check, dan refactoring suggestion."
---

# Skill Procedure: Code Review & Quality Audit

1. Jalankan `tsc --noEmit` untuk memverifikasi nol type error.
2. Cari dan tandai jika ada penggunaan `any` atau `@ts-ignore`.
3. Verifikasi bahwa setiap `catch` block mencatat log atau menangani error secara eksplisit.
4. Pastikan tidak ada credential/secret key yang di-hardcode.
