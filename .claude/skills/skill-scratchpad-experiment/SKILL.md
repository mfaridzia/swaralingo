---
name: skill-scratchpad-experiment
description: "Prosedur eksperimen kode terisolasi di folder scratch/ sebelum masuk codebase utama."
---

# Skill Procedure: Isolated Scratchpad Experimentation

1. Buat script eksperimen baru di `scratch/experiment-[topic].ts`.
2. Uji coba library baru atau logika bisnis rumit di file tersebut.
3. Setelah terbukti berhasil, refactor kode ke dalam `src/` dengan type-safety lengkap.
4. Bersihkan atau hapus file eksperimen di `scratch/`.
