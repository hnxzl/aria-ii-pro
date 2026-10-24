# Aria II Pro WebHID

Configurator WebHID untuk **Fantech Aria II Pro XD7V2P**. Folder ini berisi
eksperimen dan front-end WebHID terpisah dari aplikasi utama di root proyek.

## Menjalankan

```powershell
node .\serve.cjs
```

Buka alamat lokal yang ditampilkan server di Chrome, Edge, Brave, atau
Chromium desktop. Tutup aplikasi resmi Fantech sebelum menghubungkan perangkat.

## Dukungan

- Receiver `VID 0x3554 / PID 0xF523`
- Mouse wired `VID 0x3554 / PID 0xF5A5`
- Pembacaan dan penulisan DPI stage
- Polling rate, mode sensor, LOD, Peak Performance
- Motion Sync, Ripple Control, Angle Snap
- Efek lampu DPI dan LED idle-off
- Profile, macro, receiver LED, long-distance, pairing, dan diagnostics

Implementasi utama dan dokumentasi terbaru berada di root proyek:
[`../../README.md`](../../README.md).
