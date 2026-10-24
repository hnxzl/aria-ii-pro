# Hasil QA Audit Aria II Pro WebHID

Audit dilakukan pada baseline root [`index.html`](./index.html), dengan pembanding utama [`docs/EVIDENCE_LEDGER.md`](./docs/EVIDENCE_LEDGER.md), [`docs/FEATURE_MATRIX.md`](./docs/FEATURE_MATRIX.md), serta capture dan reverse-engineering yang tersedia.

> **Kesimpulan:** aplikasi saat ini **belum functional end-to-end**. Banyak kontrol terlihat lengkap, tetapi engine protokol root masih memakai asumsi lama dan belum melakukan pembacaan konfigurasi/readback yang diperlukan.

## Ringkasan status

| Status | Jumlah |
|---|---:|
| PASS — VERIFIED | 0 |
| PARTIAL | 8 |
| UI ONLY | 2 |
| FAIL | 15 |
| UNVERIFIED | 0 |
| NOT IMPLEMENTED | 7 |
| **Total baris audit** | **32** |

## Tabel audit fitur

| Feature | UI | Handler | HID Request | Response/Readback | Persistence | Test Evidence | Status |
|---|---|---|---|---|---|---|---|
| WebHID connect/disconnect | Ada | `connectDevice`, `disconnectDevice` | Filter VID `3554`, PID `F523/F5A5` | Membaca `03`, `04`, `12`; tidak membaca konfigurasi | Tidak ada reload state | Browser halaman terbuka; tidak ada hardware | **PARTIAL** |
| Empat profile | Ada 4 pilihan | `selectProfile` | Mencoba mengirim `0x0F` | Tidak mengirim `0x0E` setelah switch; checksum salah | UI state lokal saja | Ledger membuktikan format resmi, tetapi root belum cocok | **PARTIAL** |
| Button mapping | Ada | `applyButtonRemap` | Mencoba menulis `0x07` ke slot button | Hanya menunggu echo; tidak readback | Tidak dipulihkan setelah reconnect | Address sebagian benar; tidak ada runtime test | **PARTIAL** |
| DPI Loop assignment | Ada sebagai `0500` | `applyButtonRemap` | Mengirim `05 00 00` | Tidak readback | Tidak ada | Format resmi adalah `02 01 00` | **FAIL** |
| Debounce checkbox | Tidak ada checkbox gate | `setDebounce` langsung aktif | Menulis `0xA9` | Tidak readback | Tidak ada | Official UI memakai checkbox sebagai gate | **FAIL** |
| Debounce range | Ada 0,1,2,3,4,5,10,15,20 | `setDebounce` | Address benar secara konsep | ACK saja | Tidak ada | Range resmi 0–20 ms, tetapi UI tidak lengkap dan tanpa gate | **FAIL** |
| DPI stage count 1–4 | Ada | `setDPIStageCount` | Mengirim command `0x14` | Tidak readback `R(0x02,2)` | Tidak ada | `0x14` adalah receiver LED; stage count seharusnya flash address `0x02` | **FAIL** |
| DPI active stage | Ada | `setDPIStage` | Mengirim command `0x16` | Tidak readback `R(0x04,2)` | Tidak ada | `0x16` adalah Long Distance; active stage seharusnya flash address `0x04` | **FAIL** |
| DPI value per stage | Tampilan stage dapat diedit via prompt | `openDPIEditor`, `setDPIValue` | **Tidak mengirim HID** | Tidak ada readback | Hanya `deviceState` lokal | `setDPIValue` hanya mengubah state dan toast preview | **UI ONLY** |
| DPI slider/input end-to-end | Tidak ada slider resmi; hanya `prompt` | `setDPIValue` | Tidak ada write | Tidak ada readback | Tidak persisten | Tidak ada pengujian hardware | **UI ONLY** |
| DPI range/step | Tidak divalidasi penuh terhadap konfigurasi resmi | Validasi 50–26000 di prompt | Tidak relevan karena tidak ada write | Tidak ada | Tidak ada | `DPIRange=50,26000,50` tersedia di evidence | **PARTIAL** |
| DPI color per stage | Tidak tersedia | Tidak ada handler root | Tidak ada | Tidak ada | Tidak ada | Evidence mendukung `0x2C + 4i` | **NOT IMPLEMENTED** |
| DPI Loop hanya stage aktif | UI count ada | Tidak ada implementasi device DPI Loop yang benar | Assignment salah | Tidak ada `0x0A`/`R(0x04)` handling | Tidak ada | Firmware behavior tersedia di evidence | **FAIL** |
| Polling rate 125–8000 Hz | Semua 7 pilihan ada | `setPollingRate` | Mencoba menulis `0x0002` | ACK saja; tidak readback | Tidak ada | Mapping UI terlihat benar, tetapi response matching bermasalah | **PARTIAL** |
| LP/HP/Corded | UI ada | `setHPMode`, logic lokal polling | Mencoba `0xB9` | Tidak readback | Tidak ada | Corded berasal dari UI state, bukan state perangkat | **FAIL** |
| LOD 1 mm / 2 mm | Hanya 1/2 mm | `setSleepLOD` | Address `0x000A` | Tidak readback | Tidak ada | Range sudah sesuai owner decision | **PARTIAL** |
| Peak Performance toggle | Ada | `setPeakPerformance` | Mencoba `0xB5` | Echo/response saja | Tidak ada | Register cocok, tetapi tidak ada readback | **PARTIAL** |
| Peak duration | Ada 3,5,10,15,30,60,90 | `setPeakDuration` | Mengirim angka tampilan langsung | Tidak readback | Tidak ada | Raw enum resmi `3,6,12,30,60,90`; opsi 5/10/15 salah | **FAIL** |
| Motion Sync / Ripple / Angle Snapping | Ada tiga toggle | `setSensorToggle` | Address ditulis | Tidak readback | Tidak ada | Mapping root salah terhadap register official | **FAIL** |
| DPI Light Effects | Tidak ada panel lengkap | Tidak ada handler root | Tidak ada | Tidak ada | Tidak ada | Official map `0x4C/0x4E/0x50/0x52` tersedia | **NOT IMPLEMENTED** |
| Macro name/edit local | Ada editor sederhana | `saveMacroLocally` | Tidak ada HID | Tidak ada device readback | Hanya localStorage | Local save ada, tetapi bukan konfigurasi mouse | **PARTIAL** |
| Macro event/delay/ordering | Textarea hex manual | Tidak ada parser resmi | Tidak ada | Tidak ada | Local saja | Tidak memakai format event resmi | **PARTIAL** |
| Macro modes | Empat label ada | Tidak ada serializer mode | Tidak ada | Tidak ada | Tidak ada | Tidak menghasilkan mode `FE/FF/FD/1..250` | **NOT IMPLEMENTED** |
| Macro assignment ke tombol | Tidak ada | Tidak ada | Tidak ada macro slot `0x300 + 0x180k` | Tidak ada | Tidak ada | Official macro binding belum di-port | **NOT IMPLEMENTED** |
| Long Distance | UI receiver setting ada | Fungsi tertulis di dalam `selectProfile` | Mencoba `0x16` | Tidak ada `0x17` readback | Tidak ada | Handler tidak tersedia sebagai inline global | **FAIL** |
| Receiver LED mode | UI ada, mapping value salah | Fungsi nested | Mencoba `0x14` | Tidak ada `0x15` readback | Tidak ada | Official mapping `1=Connection/Rate`, `2=Battery`, `3=Only warning` | **FAIL** |
| LED idle-off / Sleep Mode | UI timeout ada | Fungsi nested | Mencoba `0xAD` | Tidak readback | Tidak ada | Label waktu salah unit | **FAIL** |
| Battery percentage | Tidak lengkap | `readStatus` | Mengirim `0x04` | Offset parser salah; charging/voltage tidak ditampilkan | Tidak ada polling 5 detik | Evidence resmi menyediakan level, charging, dan mV | **FAIL** |
| Firmware/version | Label firmware ada | `readFirmware` | Mengirim `0x12` | Offset response salah | Tidak ada validasi | Tidak ada hardware test | **FAIL** |
| Restore factory defaults | Tombol ada | Fungsi nested di `selectProfile` | Tidak dapat dipanggil dari inline handler | Tidak full config readback | Hanya menghapus macro local | Tidak dijalankan karena destruktif | **FAIL** |
| Receiver pairing | Tombol/instruksi ada | Fungsi nested di `selectProfile` | Frame dirakit melalui helper checksum salah | Tidak dapat dipanggil dari inline handler | Tidak ada | Official frame/status tersedia, live exchange belum diuji | **FAIL** |
| Import/export konfigurasi | Tidak ada UI | Tidak ada handler | Tidak ada | Tidak ada | Tidak ada | Official `.bin` format tersedia | **NOT IMPLEMENTED** |
| Reconnect/config reload | Connect hanya membaca sensor/status/firmware | Tidak ada `0x0E` + flash dump | Tidak ada config read | UI memakai default/hardcoded state | Tidak ada | Tidak memenuhi reload nilai perangkat sebenarnya | **NOT IMPLEMENTED** |

## Temuan teknis paling kritis

### 1. Fungsi receiver, restore, dan pairing tidak dapat dipanggil dari UI

Di [`selectProfile`](./index.html#L1289), fungsi berikut dideklarasikan sebelum kurung penutup fungsi `selectProfile`:

- `setReceiverLongRange`
- `setReceiverLedMode`
- `setSleepTimeout`
- `restoreFactoryDefaults`
- `startReceiverPairing`

Fungsi menjadi local nested functions, bukan binding global yang dapat dipanggil oleh `onclick`. Klik tombol akan menghasilkan `ReferenceError`.

### 2. Checksum protocol salah

[`buildPacket`](./index.html#L958) menggunakan target checksum `0x55`, sedangkan command frame official pada ledger menggunakan body checksum `0x4D`.

Contoh pairing official:

```text
08 05 00 00 00 02 00 00 0D 00 00 00 00 00 00 00 39
```

Untuk frame tersebut:

- checksum target `0x4D` menghasilkan `39`
- checksum target `0x55` menghasilkan `57`

Masalah ini memengaruhi command profile, receiver, sensor, dan write lainnya.

### 3. `sendAndReceive` dapat menggantung permanen

Di [`sendAndReceive`](./index.html#L989), listener dan timeout dihapus sebelum opcode diverifikasi:

```js
clearTimeout(timeout);
hidDevice.removeEventListener('inputreport', handler);
if (response[0] !== packet[1]) return;
```

Jika ada input report yang tidak cocok, promise tidak resolve maupun reject. Response matching juga hanya berdasarkan opcode, bukan address/length untuk flash readback.

### 4. DPI slider tidak menulis perangkat

[`setDPIValue`](./index.html#L1127) hanya mengubah `deviceState.perStageValues`, `deviceState.dpi`, memanggil `updateUI`, dan menampilkan toast preview.

Tidak ada encoder `ValueToDPI`, `0x07 WriteFlashData`, address `0x0C + 4i`, checksum payload, confirmation, atau readback `0x08`.

### 5. Active stage dan stage count memakai opcode yang salah

Root mengirim `0x14` untuk stage count dan `0x16` untuk active stage. Menurut [`EVIDENCE_LEDGER.md`](./docs/EVIDENCE_LEDGER.md):

- `0x14` = receiver LED mode
- `0x16` = Long Distance
- stage count = WriteFlashData ke address `0x0002`
- active stage = WriteFlashData ke address `0x0004`

### 6. Receiver LED mapping salah

UI root memakai `1=Only battery warning`, `2=Connection state and report rate`, `3=Battery state`. Official mapping adalah `1=Connection state and report rate`, `2=Battery state`, `3=Only battery warning`.

### 7. Parsing response menggunakan offset yang bergeser

`InputReportEvent.data` tidak memasukkan report ID. Root masih menggunakan offset seolah-olah report ID berada di payload pada beberapa parser:

- [`readSensorInfo`](./index.html#L1035)
- [`readStatus`](./index.html#L1046)
- [`readFirmware`](./index.html#L1056)

Akibatnya firmware, battery, charging, voltage, dan sensor information dapat tampil salah.

## Jawaban khusus DPI

**Tidak. DPI slider saat ini belum benar-benar menulis dan membaca kembali nilai DPI.**

| Subfitur DPI | Status |
|---|---|
| DPI value | **UI ONLY** |
| DPI stage count | **FAIL** |
| Active stage | **FAIL** |
| DPI color | **NOT IMPLEMENTED** |
| DPI Loop | **FAIL** |

Tidak ada persistence setelah reconnect, dan belum ada pembuktian hardware untuk DPI write.

## Bug paling kritis

1. Checksum `0x55` menggantikan checksum command official `0x4D`.
2. Fungsi restore/pairing/receiver nested di dalam `selectProfile`.
3. DPI value editor hanya mengubah state lokal.
4. DPI stage count mengirim opcode receiver LED.
5. Active DPI stage mengirim opcode Long Distance.
6. DPI Loop menggunakan `05 00 00`, bukan action resmi `02 01 00`.
7. Receiver LED mode mapping terbalik.
8. Response parser menggunakan offset WebHID yang salah.
9. Response mismatch dapat meninggalkan promise menggantung.
10. Tidak ada `0x0E` active-profile readback dan flash configuration reload setelah connect.
11. Sensor toggle labels salah terhadap register official.
12. Peak duration options tidak mengikuti raw enum official.
13. Sleep timeout labels salah unit.
14. Restore belum memverifikasi seluruh konfigurasi/profile scope.

## Source files yang perlu diperbaiki

Prioritas utama adalah [`index.html`](./index.html), khususnya:

- protocol constants dan checksum
- `buildPacket`, `sendAndReceive`, `sendCommand`
- `readSensorInfo`, `readStatus`, `readFirmware`
- `setDPIValue`, `setDPIStage`, `setDPIStageCount`
- `setPollingRate`, `setPeakDuration`, `setSensorToggle`
- `applyButtonRemap`, `selectProfile`
- receiver functions yang saat ini nested
- restore/pairing flow
- reconnect configuration readback

Reference yang perlu dipertahankan:

- [`docs/EVIDENCE_LEDGER.md`](./docs/EVIDENCE_LEDGER.md)
- [`docs/FEATURE_MATRIX.md`](./docs/FEATURE_MATRIX.md)
- [`docs/IMPLEMENTATION_READINESS.md`](./docs/IMPLEMENTATION_READINESS.md)

## Tes dan pemeriksaan yang benar-benar dijalankan

- Membuka halaman melalui browser lokal `file:///.../index.html`.
- Memeriksa render connect screen melalui accessibility snapshot.
- Menekan **Connect device** tanpa perangkat.
- Menjalankan validasi sintaks JavaScript inline menggunakan `node --check`.
- Memeriksa referensi inline handler secara statis.
- Menelusuri source UI → handler → packet builder → response parser.
- Membandingkan opcode, address, dan checksum terhadap evidence ledger.

Tidak dijalankan:

- Restore
- Pairing
- firmware update
- physical DPI write
- physical macro write
- operasi yang mengubah pairing atau konfigurasi perangkat

## Perilaku yang belum dapat dibuktikan secara fisik

- DPI write dan persistence setiap stage.
- DPI Loop stage boundary setelah stage count berubah.
- DPI LED color effect.
- Profile switch persistence/readback melalui `0x0E`.
- Button mapping physical behavior.
- Debounce physical behavior.
- Peak Performance dan duration behavior.
- Motion Sync, Ripple Control, Angle Snapping effect.
- Receiver Long Distance effect.
- Receiver LED modes dan battery color bands.
- LED idle-off timing.
- Battery charging/voltage display.
- Restore scope terhadap seluruh empat profile.
- Pairing success/failure/status polling secara live.
- Macro playback, assignment, dan stop-condition `FF/FD`.
- Wired-specific behavior untuk PID `F5A5`.

## Verdict

Aplikasi belum boleh dinyatakan selesai. Prioritas perbaikan harus dimulai dari protocol engine dan readback, kemudian DPI end-to-end, lalu mapping core configuration, sebelum Restore atau Pairing diaktifkan.
