# Aria II Pro Web Configurator

Configurator berbasis browser untuk **Fantech Aria II Pro XD7V2P**. Aplikasi ini
berkomunikasi langsung dengan mouse/receiver melalui **WebHID**, sehingga tidak
memerlukan aplikasi desktop tambahan.

> Proyek ini adalah proyek komunitas independen. Gunakan dengan risiko Anda
> sendiri dan jangan mengubah perangkat saat baterai hampir habis.

## Fitur

- WebHID untuk receiver 2.4 GHz dan koneksi USB
- Polling rate 125–8000 Hz
- DPI stage, nilai DPI 50–26000, jumlah stage, dan warna indikator
- Debounce 0–20 ms
- Low Power, High Performance, dan Corded mode
- Lift-Off Distance
- Peak Performance dan durasi
- Motion Sync, Ripple Control, dan Angle Snapping
- Efek lampu DPI: off, fixed, flicker, brightness, dan speed
- LED idle-off
- Pemetaan tombol mouse, DPI, scroll, media, fire key, dan macro
- Macro Manager: rekam, edit, import/export JSON, dan assign ke tombol
- Empat onboard profile dengan readback
- Receiver long-distance mode dan indikator LED
- Pairing mouse dengan receiver
- Import/export profile `.bin`
- Restore factory settings
- Status baterai, firmware, koneksi, dan diagnostics
- Bahasa Inggris dan Bahasa Indonesia

Setiap penulisan konfigurasi menggunakan validasi, echo, dan readback dari
perangkat sebelum UI menampilkan status tersimpan.

## Menjalankan lokal

### Prasyarat

- Google Chrome, Microsoft Edge, Brave, atau Chromium desktop
- Node.js 18 atau lebih baru
- Receiver Aria II Pro atau kabel USB

### Langkah

```bash
node serve.cjs
```

Buka <http://127.0.0.1:8765/> di browser desktop.

1. Tutup aplikasi resmi Fantech.
2. Hubungkan receiver 2.4 GHz atau kabel USB.
3. Klik **Connect Device**.
4. Pilih perangkat Aria II Pro.
5. Baca konfigurasi awal sebelum menyimpan perubahan.

WebHID tidak tersedia di sebagian besar browser mobile. `localhost` dan
`127.0.0.1` dianggap secure context oleh browser yang mendukung WebHID.

## Identitas perangkat

| Mode | VID | PID |
|---|---:|---:|
| Receiver 2.4 GHz | `0x3554` | `0xF523` |
| USB wired | `0x3554` | `0xF5A5` |

## Struktur proyek

| Path | Keterangan |
|---|---|
| `index.html` | UI utama |
| `styles.css` | Visual dan layout |
| `i18n.js` | Bahasa Inggris/Indonesia |
| `protocol.js` | Codec dan validasi frame |
| `app.js` | WebHID transport, state, dan handler UI |
| `serve.cjs` | Server lokal |
| `tests/` | Test protocol dan browser |
| `docs/` | Evidence ledger dan catatan protokol |
| `assets/` | Gambar dan ikon UI |

## Pengujian

```bash
node tests/protocol.test.cjs
python3 tests/browser_check.py http://127.0.0.1:8765/
```

Test browser membutuhkan server lokal yang sedang berjalan.

## Catatan protokol

Implementasi ini dibuat khusus untuk Aria II Pro dan **tidak menggunakan
protokol Aria XD7 secara langsung**. Bukti reverse engineering, capture, dan
format command disimpan di [`docs/EVIDENCE_LEDGER.md`](docs/EVIDENCE_LEDGER.md).

## Kredit

Dibuat oleh **HNXZL**. Proyek sebelumnya:
<https://github.com/hnxzl/ariaxd7>

Dukungan:
<https://tako.id/hnxzl>
