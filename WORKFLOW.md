# Workflow & Git Guidelines

## 1. Feature Development Flow
1. Baca `MEMORY.md` untuk memahami konteks & progress terakhir.
2. Konsultasikan rancangan fitur dengan **Architect Agent** & **PM Agent**.
3. Implementasikan backend route + migration + unit test terlebih dahulu.
4. Implementasikan frontend UI component & TanStack integration.
5. Jalankan `npm run check` (`tsc --noEmit && vitest run`) sebelum commit.
6. Update `MEMORY.md` dengan progress terbaru.

## 2. Git Commit Conventions
Format commit message: `<type>(<scope>): <short summary>`
- `feat`: Fitur baru
- `fix`: Perbaikan bug
- `docs`: Perubahan dokumentasi
- `refactor`: Perubahan struktur kode tanpa mengubah fungsionalitas
- `test`: Menambah atau memperbaiki tes
