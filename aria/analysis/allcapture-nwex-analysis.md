# Analisis `allcapture.pcapng` dan `nwex.bin`

Tanggal artefak: 23 Oktober 2026. Tujuan dokumen ini memisahkan transaksi yang terlihat di capture dari pemaknaan kontrol berdasarkan urutan aksi pengguna.

## Identitas artefak

- `C:\Users\Goolagoon\Downloads\allcapture.pcapng`: 6,401,320 byte; SHA-256 `93A6D9DDB4AFD8BAACDEED078995D211612D9863D7CD20C958EA5218A496B1DD`.
- `C:\Users\Goolagoon\Downloads\nwex.bin`: 10,492 byte; SHA-256 `B15E268F83DBC41E6F867374D71DB0DA1E69C6E1AE2F3AA1321ECB91F82D8B9D`.
- `C:\Users\Goolagoon\Downloads\aria-ii-pro-hid-observation (6).json`: 13,068 byte; SHA-256 `5C3A0EFC31AF54BBAFA5DA9F8E862F36090A2D4A96272DFDD5C1DBB0FDD89506` (capture emitted by this WebHID app).
- `C:\Users\Goolagoon\Downloads\aria-ii-pro-hid-observation (7).json`: 5,824 byte; SHA-256 `1F530E837EE84E2BF296877B67449DD69B74EEC341F24545BE933533735D0DEB` (capture emitted by this WebHID app).
- `nwex.bin` memiliki header 64 byte diikuti map konfigurasi 10,428 byte. Header memuat `Compx Inc` dan sensor `3395`.
- Snapshot `C:\Users\Goolagoon\AppData\Local\Fantech\Fantech Aria II Pro\Device_Info\Device_CID13_MID8.bin` berukuran 10,428 byte dan bertanggal 23 Oktober 2026 11:39:18Z, sekitar 8 menit setelah capture berakhir. Map ini dibandingkan byte per byte dengan bagian map `nwex.bin`; snapshot ini bukan baseline pra-capture.
- Perbedaan map hanya offset `0x003F` (`01`→`02`), `0x0040` (`10`→`FF`), dan `0x0042` (`01`→`00`). Karena sebagian besar perubahan capture tidak tampak di map ekspor, ekspor ini tidak diperlakukan sebagai snapshot hasil akhir dari seluruh aksi.

## Transport dan format yang terlihat

**Terkonfirmasi dari capture:** TShark/Wireshark membaca 99,716 frame USB dari satu interface USBPcap. Perangkat pada descriptor memiliki VID `0x3554`, PID `0xF523`. Laporan vendor memakai report ID `0x08` dan 16 byte data. Pada capture, permintaan tulis tampak sebagai control transfer vendor HID; report body diawali opcode `0x07` untuk tulis flash.

Format `WriteFlashData` yang didukung oleh frame-frame teramati:

| Byte body | Arti | Bukti |
|---|---|---|
| 0 | opcode `07` | frame 28375 dan seluruh frame penulisan di bawah |
| 1–3 | alamat 24-bit big-endian | contoh alamat `00000A`, `0000B7`, `00000C` |
| 4 | panjang payload | frame 28375 memakai `04`; toggle memakai `02` |
| 5… | payload | tercantum di tabel berikut |
| 15 | byte checksum report | pola report sama dengan permintaan baca/tulis yang telah diverifikasi di proyek; frame valid berjumlah `0x4D` modulo 256 |

Untuk setting satu byte, frame flash menyertakan pasangan nilai dan komplemen: `value`, `(0x55 - value) & 0xFF`. Contoh `08 4D` di alamat `000000`, `02 53` di `00000A`, dan `01 54` di toggle. Ini terkonfirmasi pada payload capture. Report mentah 17 byte USB yang TShark tampilkan mencakup report ID `08` di depan 16-byte body.

## Penulisan konfigurasi yang tertangkap

Nomor frame merujuk ke `allcapture.pcapng`. Pemaknaan kontrol di kolom kanan menggunakan urutan aksi yang pengguna jelaskan; nama fitur ditandai sebagai inferensi jika belum ada readback atau trace kode UI.

| Frame | Alamat | Payload | Kesimpulan dan keyakinan |
|---:|---:|---|---|
| 37495 | `000002` | `04 51` | **Terkonfirmasi**: byte nilai `04` ditulis. **Kuat diinferensikan**: jumlah DPI stage = 4, karena tepat cocok dengan aksi stage-count yang dilaporkan. |
| 38273, 38653, 40591, 47695 | `000004` | `01 54`, `02 53`, `01 54`, `00 55` | **Terkonfirmasi**: empat nilai selector ditulis. **Kuat diinferensikan**: pemilihan stage aktif/DPI-loop, sesuai urutan aksi. |
| 39345 | `000014` | `4E 4E 00 B9` | **Terkonfirmasi**: empat byte ditulis pada stage-record address `0x14`. Decoder DPI di proyek mengartikan record ini sebagai 3,950 DPI (checksum byte `B9`). |
| 44527 | `000030` | `93 AC EE 28` | **Terkonfirmasi**: 4 byte berubah. **Belum dipastikan**: hubungan record ke kontrol warna/stage; jangan anggap RGB tanpa korelasi kode atau readback. |
| 49417–49983 | `000000` | `08 4D`, `04 51`, `02 53`, `01 54` | **Terkonfirmasi**: kode polling-rate ditulis berurutan. Nilai kode sesuai urutan user 125, 250, 500, 1000 Hz; encoding rate `08/04/02/01` ini kuat. |
| 52329–54017 | `000000` | `10 45`, `20 35`, `40 15`, `10 45` | **Terkonfirmasi**: kode polling-rate lanjutan `10`, `20`, `40`, lalu `10` sekali lagi. Urutan aksi menyatakan 2000/4000/8000 Hz; interpretasi skala kode konsisten dengan grup ini, tetapi arti penulisan ulang kode `10` terakhir belum diketahui. |
| 50961, 51265 | `0000B9` | `01 54`, `00 55` | **Terkonfirmasi**: nilai mode dikirim dua keadaan. **Kuat diinferensikan** sebagai selector LP/HP dari urutan aksi pengguna; pemetaan `0/1` ke nama LP atau HP belum dipastikan. |
| 55291, 55569 | `00000A` | `02 53`, `01 54` | **Terkonfirmasi**: dua nilai ditulis. **Kuat diinferensikan**: LOD 2 mm lalu 1 mm dari urutan aksi. |
| 56365, 56385 | `0000B5` | `00 55`, `01 54` | **Terkonfirmasi**: toggle dua keadaan. **Kuat diinferensikan**: Peak Performance on/off berdasarkan urutan aksi. |
| 56777, 57107, 57649, 58423, 58887 | `0000B7` | `06 4F`, `0C 49`, `1E 37`, `3C 19`, `03 52` | **Terkonfirmasi**: lima kode durasi dikirim. **Belum dipastikan**: durasi mana yang cocok ke setiap kode, khususnya kode tambahan `03`. |
| 59641/59659 | `0000B1` | `01 54` / `00 55` | **Terkonfirmasi**: toggle. **Kuat diinferensikan** Ripple Control dari urutan aksi. |
| 59803/59815 | `0000AF` | `01 54` / `00 55` | **Terkonfirmasi**: toggle. **Kuat diinferensikan** Angle Snapping dari urutan aksi. |
| 59955/59967 | `0000AB` | `01 54` / `00 55` | **Terkonfirmasi**: toggle. **Kuat diinferensikan** Motion Sync dari urutan aksi. |
| 61701, 64375 | `00004C` | `01 54`, `02 53` | **Terkonfirmasi**: mode efek berubah menjadi kode 1 dan 2. Label Fixed vs Breathing/Flicker kuat berdasarkan urutan aksi, tetapi kode Off tidak muncul sebagai tulis pada bagian ini. |
| 61705, 67013 | `000052` | `01 54`, `00 55` | **Terkonfirmasi**: keadaan enable berubah. Keterkaitan ke efek DPI diinferensikan dari waktu aksi yang berdekatan. |
| 62493, 62617, 62947 | `00004E` | `1E 37`, `5A FB`, `FF 56` | **Terkonfirmasi**: tiga nilai brightness byte dikirim. Range 1–10 UI belum diketahui encoding skala dari sampel ini. |
| 65295, 65899 | `000050` | `01 54`, `05 50` | **Terkonfirmasi**: nilai speed byte berubah; sesuai aksi speed efek 1–5. |
| 75585–79021 | `0000AD` | `01 54`, `03 52`, `06 4F`, `1E 37`, `F0 65`, `1E 37` | **Terkonfirmasi**: kode sleep mentah yang tertulis. Pemetaan kode ke 10 detik/5 menit/40 menit belum dapat ditentukan dari ekspor yang disertakan. |
| 80411, 80541 | opcode `16`, parameter `0A` | `01`, `00` | **Terkonfirmasi**: command non-flash `0x16` dengan parameter byte `0A` berubah. **Unknown**: label/arti kontrol dongle yang tepat. |
| 81747, 81987, 82239, 82375 | opcode `14`, parameter `0A` | `02`, `03`, `02`, `01` | **Terkonfirmasi**: empat command non-flash `0x14` terlihat. **Unknown**: apakah ini tiga pilihan LED dongle dan pemetaan nilai ke mode. |

Frame pada `00000C` (71495, 71531, 71543, 71555, 71899, 71911, 71923, 71943) mengubah record 4-byte berulang: `20 20 00 15`, `21 21 00 13`, `22 22 00 11`, `23 23 00 0F`, lalu kembali hingga `1F 1F 00 17`. **Terkonfirmasi**: record stage DPI mengikuti encoding x/y dan checksum yang sudah diuji di aplikasi. Beberapa tahapan itu sesuai pengubahan DPI; jumlah stage tetap tidak boleh disimpulkan hanya dari record ini.

## Fitur yang belum terbukti atau belum dibuat

- Export `nwex.bin` tidak mengandung hasil sebagian besar perubahan capture; butuh ekspor setelah satu kontrol diubah dan aplikasi melakukan save/commit, atau readback map sesudah perubahan.
- Tiga pilihan LED dongle, warna rate dan battery state, serta low-battery-only: command `0x14`/`0x16` membuktikan command terkait UI terjadi, tetapi hubungan nilai dan payload warna belum dipetakan.
- Custom DPI color: satu payload 4 byte pada `0x30` terlihat, tetapi struktur warna, stage, dan nilai awal/akhir belum diketahui.
- Peak/sleep code-to-duration mapping, enum mode LP/HP, brightness skala 1–10 ke byte, dan fungsi byte enable `0x52` memerlukan trace UI/readback yang terpisah.
- Ganti profil, pemetaan tombol, macro, debounce, battery query/level, firmware version, connection state, dan receiver operation tidak memperoleh call-chain atau hasil semantik lengkap dari capture ini.

## WebHID saat ini

`aria-ii-pro-webhid` sekarang menyediakan penulisan satu nilai flash pada alamat yang tertangkap (rate `0x00`, selector `0x02/0x04`, LOD `0x0A`, mode-code `0xB9`, opsi sensor `0xAB/0xAF/0xB1`, Peak `0xB5/0xB7`, efek DPI `0x4C/0x4E/0x50`, dan sleep code `0xAD`). Brightness hanya menawarkan tiga byte yang benar-benar tampak di capture (`1E`, `5A`, `FF`); konversi angka UI 1–10 belum diasumsikan. Report menggunakan bentuk `WriteFlashData` teramati dan minta konfirmasi sebelum dikirim. Balasan yang cocok hanya membuktikan frame balasan cocok; untuk nilai yang bisa dibaca, lakukan readback sebelum menyatakan pengaturan tersimpan.

## Observation (6): controlled WebHID writes

Observation (6) was captured 2026-10-23 11:48:31Z. It reports VID `0x3554`, PID `0xF523`; `productName` was `Fantech StrikeSpeed Pro`, so identity is keyed to VID/PID rather than that descriptive string. Two reads succeeded: address `0x4C`, length 8, response in 3 ms; and DPI record `0x0C`, length 4, response in 2 ms. Record `1F 1F 00 17` decodes as 1600 DPI.

Ten writes produced matching input frames after 3–6 ms: `0x00=01`, `0x02=01`, `0x04=00`, `0x0A=02`, `0xB1=00`, `0xAF=01`, `0xAB=01`, `0x4C=02`, `0x4C=01`, and `0xAD=03` (each payload includes its observed complement byte). This confirms that the WebHID report format and echo matching work with the physical device for these writes. The JSON does **not** contain reads after the writes, so it does not confirm persistent readback or the user-visible effect of each code.

The WebHID client has since been updated to automatically read the same address/length after a matching write frame. It will report **readback match**, **readback mismatch**, or a read error separately from the matching-frame signal.

## Observation (7): DPI value persisted on stage 2

Observation (7) at 2026-10-23 11:50:57Z reads stage 2 record at `0x000010` as `07 07 00 47`, writes the same record twice, and automatically reads it back after both writes. Both writes returned matching input reports in 3–4 ms, and both automatic readbacks returned the same four bytes in 3 ms with `readbackStatus: readback-match`. Using the existing Aria II Pro record decoder, `07 07 00 47` is 400 DPI (scale 50, encoded value `(7 + 1) × 50`).

This is **confirmed runtime evidence** that the browser write and flash readback path persisted 400 DPI on stage 2 for this connected device. It is the strongest end-to-end DPI verification so far. It does not establish persistence for every other setting field or decode the still-unknown duration/LED/profile commands.

Lihat addendum static-IL di bawah untuk pemetaan kontrol yang kemudian berhasil dikonfirmasi dari implementasi managed resmi. Bagian di atas merekam keadaan pengetahuan saat analisis capture awal dan beberapa pernyataannya telah superseded.

## Addendum: static IL resmi dan pembaruan implementasi

Sumber UI resmi: `C:\Program Files (x86)\Fantech Aria II Pro\Config.ini` dan `Language\0-English.xml`. Metode managed yang dibuang ke `analysis/*.il.txt` berasal dari `Mouse Drive Beta.exe` (x86 .NET Framework 4.8); metode event handler menyimpan nilai UI ke `FlashDataMap`, lalu memanggil `UpdateValue`. `UsbServer` menjadi wrapper P/Invoke untuk native `HIDUsb32.dll`. Kesimpulan ini berasal dari implementasi IL + korelasi capture, bukan dari kemiripan dengan Aria XD7.

Pemetaan yang terkonfirmasi dari IL:

- `ThreeInOne.ReportRateClick`: menulis `mouseConfig.reportRate`; mode LP/HP diperbarui hanya ketika kode rate di bawah `0x10` dan wireless. Nilai code capture `08/04/02/01/10/20/40` cocok dengan 125/250/500/1000/2000/4000/8000 Hz dari urutan aksi pengguna. UI XML berisi LP=0, HP=1, Corded=10. Karena itu picker mode harus tersedia hanya untuk rate <2000 Hz, dan UI sekarang menonaktifkannya saat rate >=2000.
- `ThreeInOne.ModeSelectChanged`: menyimpan `sensorPowerSavingModeEnable`; `10` adalah sentinel Corded dan tidak ditulis lewat pengaturan mode biasa.
- `ThreeInOne.LODChanged`: `mouseConfig.silenceHeight`; XML memetakan 3=0.7 mm, 1=1 mm, 2=2 mm.
- `DPIControl.StageChanged`: combo stage count mengubah `mouseConfig.maxDPI`; active selector `currentDPI` berindeks 0..3. XML config membatasi DPI stages ke 4.
- `DPIControl.ColorChange`: menyimpan RGB di `dpiConfig[SelectIndex].color[0..2]`. Capture stage2 mengubah alamat `0x30` ke `93 AC EE 28`; alamat stage color dipetakan dengan kuat sebagai `0x2C+4*stage`, payload RGB+checksum. Base `0x2C` dan pola stage lain belum dibuktikan melalui sweep/readback, jadi semua stage color tetap **strongly inferred**.
- `ThreeInOne.PeakChanged` menyimpan `sensorCustomSleepTimeEnable`; `PeakDurationChanged` menyimpan `sensorSleepTime`. XML duration: 3=30s, 6=1m, 12=2m, 30=5m, 60=10m, 90=15m. Capture merekam code `0C,1E,3C,03`; mapping 30s/1m/2m/5m/10m/15m benar-benar berasal dari XML+IL, bukan tebakan payload.
- Ripple, Angle Snap, Motion Sync event handlers menyimpan masing-masing `rippleControlEnable`, `linearCorrectionEnable`, `motionSyncEnable`; alamat teramati `B1`, `AF`, `AB` dari capture.
- DPI effect: `ThreeInOne.DPIEffectChanged` menyetel `dpiLed.enable` dan `dpiLed.mode` (off=0, fixed=1, flicker=2). Mode di `0x4C`, enable di `0x52`. Brightness UI 1..10 dikonversi oleh `ValueConvert.DPIIndexToBrightness` ke `[16,30,60,90,128,150,180,210,230,255]` (addr `0x4E`). Speed 1..5 disimpan langsung (`0x50`).
- `FormMain.SleepChanged` menyimpan `mouseConfig.allLedOffTime`; XML kontrol yang cocok berlabel “time until lights off after not moving”, kode 1,3,6,30,60,90,120,150,180,210,240 untuk 10s..40m. Ini adalah lampu mati saat idle, bukan timer sleep sensor. Jangan sebut sebagai mouse sleep.
- Profile selector memanggil `UsbServer.SetCurrentConfig(value)`. Timestamp log resmi + PCAP mengonfirmasi opcode `0x0F`, byte body[4]=1, body[5]=index 0..3. Perintahnya sudah di UI, tetapi tidak ada readback profil yang diterapkan browser.
- `FormAdvancedSetting.LongRange.Click` mengarah ke `SetLongRangeMode(bool)` (opcode capture `0x16`, body[3]=0x0A, body[4]=0/1). Dongle UI memanggil `Set4KDongleRGB`; opcode capture `0x14`, body[3]=0x0A, body[4]=mode. XML + urutan aksi memberi pemetaan kuat mode 1=low battery warning, 2=connection/report rate, 3=battery state. Belum ada balasan/readback atau bukti tampilan LED di WebHID.

### Status protokol / keyakinan

| Fitur | Mekanisme baca | Mekanisme tulis | Keyakinan / batas |
|---|---|---|---|
| DPI nilai stage | ReadFlashData opcode `08`, address `0x0C+4*n`, length 4; observation (7) baca balik stage2 `07 07 00 47`=400 DPI | WriteFlashData opcode `07`, same record, RGB-independent checksum; auto readback browser | Terkonfirmasi end-to-end untuk stage2=400 DPI; encoder/range existing app berlaku |
| Stage count / active stage | Flash read address `02` / `04` | WriteFlashData; active index 0..3 | Call-chain + capture; persisten belum dites semua |
| Rate, LP/HP, LOD, sensor toggles, Peak, DPI LED, idle LED timer | ReadFlashData alamat write | WriteFlashData; value/complement pair, 16-byte body checksum 0x4D | Call-chain IL dan capture; browser auto readback |
| DPI color | belum diuji browser secara menyeluruh | addr base `2C+4*n`, RGB+checksum | Struktur IL terkonfirmasi; alamat base per-stage inferensi kuat dari satu capture |
| Profiles | native `GetCurrentConfig` tersedia tetapi response belum diparse | opcode `0F` | write command cocok dengan capture/log, belum readback/verify di browser |
| Long-distance | native getter ada tapi belum dipanggil dari WebHID | opcode `16`, parameter 0A, boolean | call-chain dan request capture; konfirmasi runtime fisik perlu |
| Dongle LED | native getter ada; belum dipanggil/response diparse | opcode `14`, parameter 0A, enum 1/2/3 | command terkonfirmasi; label-value dari urutan aksi+XML kuat diinferensikan |
| Battery / firmware / connected state | native `ReadBatteryLevel`, `ReadVersionID`, parser; managed `BatteryStatus { level, isCharging, BatVoltage }` | query/response belum dipetakan penuh | Perlu trace parser native atau targeted PCAP; jangan tampilkan hasil decode palsu |
| Button remap / macro / debounce / mouse sleep / main LED | IL UI dan sebagian object tersedia; transport serialization belum selesai | belum direplikasi | Memerlukan native call chain + transaksi dan readback konkret |

### Koreksi implementasi terkini

`aria-ii-pro-webhid/app.js` menulis flash melalui `sendReport(0x08, 16-byte-body)`, mencocokkan respons, lalu membaca alamat/length yang sama. UI sekarang memakai label stage 1..4; rate >=2000 menonaktifkan mode LP/HP. DPI brightness dan idle light timer memakai label serta nilai XML/IL, sementara DPI enable tetap kontrol terpisah karena app WebHID belum menggabungkan dua write secara berurutan. Tersedia kontrol profil, RGB DPI, long-distance, dan mode LED dongle dengan status “sent-no-readback”. Implementasi warna per-stage perlu validasi lebih lanjut sebelum disebut terkonfirmasi.
