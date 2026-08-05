---
name: skill-a11y-audit
description: "Prosedur audit aksesibilitas UI berdasarkan standar WCAG 2.1 AA."
---

# Skill Procedure: Accessibility Audit

1. Verifikasi semua `<img />` memiliki atribut `alt`.
2. Verifikasi button tanpa teks memiliki `aria-label`.
3. Pastikan elemen yang dapat diklik dapat di-tab via keyboard dan menampilkan ring focus (`focus-visible:ring-2`).
4. Uji kontras warna teks dan background via WCAG contrast checker.
