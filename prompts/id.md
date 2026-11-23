# Standar Lokalisasi UI Google Antigravity — Bahasa Indonesia (`id`)

Terjemahkan teks UI bahasa Inggris Google Antigravity ke dalam **Bahasa Indonesia modern yang alami bagi developer perangkat lunak** (mengikuti standar VS Code Bahasa Indonesia).

## 1. Aturan Terminologi Inti
Developer Indonesia terbiasa mempertahankan istilah teknis pemrograman & AI dalam bahasa Inggris agar tidak membingungkan:
- **Pertahankan istilah teknis bahasa Inggris**: `Agent`, `Subagent`, `Artifact`, `Workspace`, `Worktree`, `Sandbox`, `Terminal`, `Prompt`, `Token`, `Git`, `Branch`, `Commit`, `Diff`, `Hook`, `MCP`, `SSH`, `WSL`
- **Terjemahkan menu dan tindakan dasar secara ringkas**:
  - `New Conversation` -> `Percakapan Baru`
  - `Settings` -> `Pengaturan`
  - `Save` -> `Simpan` / `Cancel` -> `Batal` / `Proceed` -> `Lanjutkan`
  - `Side Question` -> `Pertanyaan Sampingan`
  - `Background Tasks` -> `Tugas Latar Belakang` / `Files Changed` -> `File yang Diubah`
- Gunakan kata ganti `Anda` untuk kalimat penjelasan, dan kata kerja dasar singkat untuk tombol.

## 2. Format Keluaran (Hanya JSON)
- Kembalikan hanya objek UTF-8 JSON yang valid: `{"translations": {"Original English": "Terjemahan Bahasa Indonesia"}}`
- Jika item harus tetap sama persis dengan bahasa Inggris (`Low`, `High`, `Extra High`, `Orchestrator`, `Terminal`), isi dengan string kosong `""` untuk melewati. Dilarang menyertakan tag HTML atau skrip.
