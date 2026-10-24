# Linux WebHID Setup Guide: Fantech Aria II Pro XD7v2P
# Panduan Pengaturan WebHID Linux: Fantech Aria II Pro XD7v2P

> **Quick Language Navigation / Navigasi Cepat:**
> - [🇬🇧 English Guide](#english-guide)
> - [🇮🇩 Panduan Bahasa Indonesia](#panduan-bahasa-indonesia)

---

<a id="english-guide"></a>
## English Guide

This guide explains how to configure device permissions on **Arch Linux** (and other systemd-based Linux distributions, including Hyprland / Wayland environments) so that Chromium-based web browsers can access the **Fantech Aria II Pro XD7v2P** via WebHID without root privileges.

---

### 1. Understanding the Linux Permission Requirement

By default, Linux grants ownership of raw HID character devices (`/dev/hidraw*`) exclusively to `root:root` with mode `0600` (`crw-------`). 

When you use WebHID in a browser:
1. `navigator.hid.requestDevice()` can query device metadata via udev. The browser prompt will show the mouse.
2. When you click **Connect**, `device.open()` attempts an `open("/dev/hidrawX", O_RDWR)` system call.
3. If permissions are not configured, the system call fails with `EACCES (Permission denied)`, and the browser reports an error such as `Failed to open device` or `SecurityError`.

**Arch Linux uses `systemd-logind`**, which dynamically grants permissions to the currently active desktop user through POSIX Access Control Lists (ACLs) using the `TAG+="uaccess"` udev property.

---

### 2. Identifying the Device

With the receiver or USB cable connected, open a terminal and run:

```bash
lsusb -d 3554:
```

Expected output for the 2.4 GHz StrikeSpeed receiver:
```
Bus 001 Device 026: ID 3554:f523 Compx Fantech StrikeSpeed Pro
```

If connected via USB-C cable, the candidate identity is:
```
ID 3554:f5a5 Compx Fantech Aria II Pro (Wired)
```

#### Locating the `/dev/hidraw` Device Node
To locate which `/dev/hidraw*` node corresponds to Interface 1 (the configuration channel):

```bash
for dev in /dev/hidraw*; do
  echo "--- $dev ---"
  udevadm info -q property -n "$dev" | grep -E "ID_VENDOR_ID|ID_MODEL_ID|DEVPATH"
done
```

For the Aria II Pro receiver (`3554:f523`), three hidraw nodes exist:
- **Interface 0 (e.g. `1-1:1.0`):** Keyboard endpoints.
- **Interface 1 (e.g. `1-1:1.1`):** **Configuration channel (target for WebHID).**
- **Interface 2 (e.g. `1-1:1.2`):** Standard mouse movement/clicks.

---

### 3. Installing the udev Rule

The repository includes a ready-to-use udev rule at [`udev/99-fantech-aria-ii-pro.rules`](../udev/99-fantech-aria-ii-pro.rules).

#### Recommended Copy-Paste Installation
Run the following transparent command in your terminal. This creates a dedicated rule file in `/etc/udev/rules.d/`:

```bash
sudo tee /etc/udev/rules.d/99-fantech-aria-ii-pro.rules << 'EOF'
# Fantech Aria II Pro XD7v2P — WebHID Device Access Rules
# Wireless 2.4 GHz StrikeSpeed Receiver (VID: 0x3554, PID: 0xf523 - Hardware Verified)
ACTION!="remove", SUBSYSTEM=="hidraw", KERNEL=="hidraw*", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="f523", MODE="0660", TAG+="uaccess"

# Wired USB Cable Connection (VID: 0x3554, PID: 0xf5a5 - Candidate ID)
ACTION!="remove", SUBSYSTEM=="hidraw", KERNEL=="hidraw*", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="f5a5", MODE="0660", TAG+="uaccess"
EOF
```

#### What each part of the rule does:
- `ACTION!="remove"`: Matches device addition and change events, ignoring removal.
- `SUBSYSTEM=="hidraw"`: Scopes matching strictly to the HID raw character subsystem.
- `KERNEL=="hidraw*"`: Applies only to hidraw device nodes.
- `ATTRS{idVendor}=="3554"`: Matches Compx / Fantech USB vendor ID.
- `ATTRS{idProduct}=="f523"` / `"f5a5"`: Matches the specific wireless receiver or wired mouse.
- `MODE="0660"`: Sets read/write permissions for owner and group.
- `TAG+="uaccess"`: Informs `systemd-logind` to grant read/write ACLs to the user currently logged into the local seat (seat0), without needing manual user groups.

---

### 4. Reloading Rules and Applying Permissions

After creating the rule file, reload the udev daemon and trigger rule re-evaluation:

```bash
# 1. Reload udev rule definitions into the kernel manager
sudo udevadm control --reload-rules

# 2. Trigger the new rules for currently connected hidraw devices
sudo udevadm trigger --subsystem-match=hidraw
```

#### Reconnect the Device
For complete certainty, **unplug the 2.4 GHz USB dongle (or USB-C cable) and plug it back in**.

---

### 5. Verifying Device Permissions

Check whether the ACL was successfully applied to the Aria II Pro hidraw nodes:

```bash
# List hidraw nodes with permissions
ls -l /dev/hidraw*
```

Look for the `+` sign at the end of the file permissions (e.g. `crw-rw----+ 1 root root`).

Inspect the exact ACL with `getfacl`:
```bash
getfacl /dev/hidraw4
```

Expected output (where `username` is your local Arch Linux user):
```
# file: dev/hidraw4
# owner: root
# group: root
user::rw-
user:username:rw-
group::---
mask::rw-
other::---
```

If `user:<your-username>:rw-` appears, your user has read/write permission, and WebHID will work.

---

### 6. Troubleshooting & Diagnostics

#### 6.1 Distinguishing Permission Issues from Browser Issues
- **Problem: Browser says WebHID is unavailable.**
  - *Cause:* You are using Firefox, Safari, or an unsupported browser.
  - *Fix:* Use a Chromium-based browser (Chromium, Brave, Google Chrome, Microsoft Edge).
- **Problem: The device picker dialog does not show the mouse.**
  - *Cause:* The receiver is disconnected, the mouse is off, or the browser is running over unencrypted HTTP.
  - *Fix:* Ensure the mouse is on, the receiver is plugged in, and you are using `https://` or `http://localhost`.
- **Problem: The mouse appears in the picker, but clicking Connect fails.**
  - *Cause:* Linux permission denied on `/dev/hidraw*`, or sandbox blocking access.
  - *Check:* Open `chrome://device-log` in your browser. Look for `Failed to open device: Access denied (EACCES)`.
  - *Fix:* Verify udev rule and run `getfacl /dev/hidraw*`.

#### 6.2 Flatpak & Sandboxed Browser Troubleshooting
If your browser was installed via **Flatpak** (e.g. `com.google.Chrome` or `com.brave.Browser`), Flatpak's sandbox blocks direct access to host `/dev` devices by default, even if the udev rule is correct.

To grant device access to Flatpak:
```bash
# For Google Chrome Flatpak:
flatpak override --user --device=all com.google.Chrome

# For Brave Flatpak:
flatpak override --user --device=all com.brave.Browser

# For Chromium Flatpak:
flatpak override --user --device=all org.chromium.Chromium
```
Alternatively, open **Flatseal** (GUI permission manager), select your browser, scroll to **Devices**, and enable **All devices (`--device=all`)**.

#### 6.3 Wayland / Hyprland Considerations
WebHID operates at the kernel/USB driver level and is completely independent of Wayland or X11 compositor protocols. You do not need any Hyprland-specific window rules or environment variables for WebHID.

---

### 7. Uninstalling / Removing the udev Rule

If you ever wish to remove the custom rule:

```bash
# 1. Remove the rule file
sudo rm /etc/udev/rules.d/99-fantech-aria-ii-pro.rules

# 2. Reload udev rules and reset device tags
sudo udevadm control --reload-rules
sudo udevadm trigger --subsystem-match=hidraw
```

---

### 8. Security Best Practices

- **NEVER** run your web browser using `sudo` or as root. Doing so exposes your entire system to untrusted web content.
- **NEVER** run `chmod 666 /dev/hidraw*`. That grants all local users and rogue background processes unrestricted read/write access to every input device, including keyboards (which can log keystrokes).
- **DO NOT** use the legacy `plugdev` group. Arch Linux does not use `plugdev`; using `TAG+="uaccess"` is the official, secure systemd mechanism.
- WebHID cannot automatically write to system files. Any website claiming to "auto-install" udev rules without terminal execution is deceptive.

---

<a id="panduan-bahasa-indonesia"></a>
## Panduan Bahasa Indonesia

Panduan ini menjelaskan cara mengonfigurasi hak akses perangkat pada **Arch Linux** (serta distribusi Linux berbasis systemd lainnya, termasuk lingkungan Hyprland / Wayland) agar peramban Chromium dapat mengakses **Fantech Aria II Pro XD7v2P** via WebHID tanpa hak akses root.

---

### 1. Memahami Kebutuhan Izin pada Linux

Secara default, Linux mengatur kepemilikan berkas antarmuka HID (`/dev/hidraw*`) hanya untuk `root:root` dengan izin `0600` (`crw-------`).

Ketika Anda menggunakan WebHID di browser:
1. `navigator.hid.requestDevice()` dapat membaca metadata perangkat melalui udev. Dialog pemilihan perangkat akan muncul di browser.
2. Ketika Anda mengklik **Hubungkan perangkat**, perintah `device.open()` mencoba membuka berkas `/dev/hidrawX` dengan mode baca/tulis (`O_RDWR`).
3. Tanpa konfigurasi hak akses, sistem menolak pemanggilan tersebut dengan kode kesalahan `EACCES (Permission denied)`, sehingga browser gagal terhubung.

**Arch Linux menggunakan `systemd-logind`**, yang memberikan izin secara otomatis kepada pengguna desktop aktif melalui POSIX Access Control List (ACL) menggunakan tanda `TAG+="uaccess"`.

---

### 2. Mengidentifikasi Perangkat

Sambungkan receiver nirkabel atau kabel USB mouse, lalu buka terminal dan jalankan:

```bash
lsusb -d 3554:
```

Keluaran yang diharapkan untuk receiver 2.4 GHz StrikeSpeed:
```
Bus 001 Device 026: ID 3554:f523 Compx Fantech StrikeSpeed Pro
```

Jika tersambung via kabel USB-C:
```
ID 3554:f5a5 Compx Fantech Aria II Pro (Wired)
```

#### Menemukan Node `/dev/hidraw` yang Sesuai
Untuk melihat node `/dev/hidraw*` yang berkaitan dengan Interface 1 (jalur konfigurasi):

```bash
for dev in /dev/hidraw*; do
  echo "--- $dev ---"
  udevadm info -q property -n "$dev" | grep -E "ID_VENDOR_ID|ID_MODEL_ID|DEVPATH"
done
```

Untuk receiver Aria II Pro (`3554:f523`), terbentuk tiga node hidraw:
- **Interface 0 (contoh `1-1:1.0`):** Jalur keyboard.
- **Interface 1 (contoh `1-1:1.1`):** **Jalur konfigurasi vendor-specific (target WebHID).**
- **Interface 2 (contoh `1-1:1.2`):** Jalur pergerakan dan klik mouse standar.

---

### 3. Memasang Aturan udev

Repositori ini menyediakan berkas aturan udev siap pakai di [`udev/99-fantech-aria-ii-pro.rules`](../udev/99-fantech-aria-ii-pro.rules).

#### Pemasangan Salin-Tempel (Copy-Paste) yang Direkomendasikan
Jalankan perintah berikut di terminal Anda. Perintah ini membuat berkas aturan baru di direktori `/etc/udev/rules.d/`:

```bash
sudo tee /etc/udev/rules.d/99-fantech-aria-ii-pro.rules << 'EOF'
# Fantech Aria II Pro XD7v2P — WebHID Device Access Rules
# Wireless 2.4 GHz StrikeSpeed Receiver (VID: 0x3554, PID: 0xf523 - Terverifikasi pada Hardware)
ACTION!="remove", SUBSYSTEM=="hidraw", KERNEL=="hidraw*", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="f523", MODE="0660", TAG+="uaccess"

# Wired USB Cable Connection (VID: 0x3554, PID: 0xf5a5 - Kandidat ID)
ACTION!="remove", SUBSYSTEM=="hidraw", KERNEL=="hidraw*", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="f5a5", MODE="0660", TAG+="uaccess"
EOF
```

#### Penjelasan Komponen Aturan:
- `ACTION!="remove"`: Hanya memproses perangkat saat dipasang atau diubah.
- `SUBSYSTEM=="hidraw"`: Membatasi aturan hanya untuk subsistem character device hidraw.
- `KERNEL=="hidraw*"`: Berlaku spesifik untuk node `/dev/hidraw*`.
- `ATTRS{idVendor}=="3554"`: Mencocokkan Vendor ID Compx / Fantech.
- `ATTRS{idProduct}=="f523"` / `"f5a5"`: Mencocokkan Product ID receiver atau kabel USB.
- `MODE="0660"`: Memberikan izin baca/tulis bagi pemilik dan grup.
- `TAG+="uaccess"`: Menginstruksikan `systemd-logind` agar secara otomatis memberikan hak akses ACL baca/tulis kepada pengguna desktop yang sedang login pada sesi aktif (seat0).

---

### 4. Memuat Ulang Aturan udev

Setelah berkas dibuat, muat ulang layanan udev dan terapkan aturan:

```bash
# 1. Muat ulang definisi aturan ke kernel udev manager
sudo udevadm control --reload-rules

# 2. Terapkan aturan pada perangkat hidraw yang sedang terpasang
sudo udevadm trigger --subsystem-match=hidraw
```

#### Pasang Ulang Perangkat
Untuk memastikan aturan aktif sepenuhnya, **cabut dongle receiver 2.4 GHz (atau kabel USB) lalu pasang kembali**.

---

### 5. Memverifikasi Izin Perangkat

Periksa apakah tanda ACL (`+`) sudah diterapkan pada node hidraw Aria II Pro:

```bash
ls -l /dev/hidraw*
```

Periksa detail ACL menggunakan perintah `getfacl`:
```bash
getfacl /dev/hidraw4
```

Keluaran yang diharapkan:
```
# file: dev/hidraw4
# owner: root
# group: root
user::rw-
user:nama_user:rw-
group::---
mask::rw-
other::---
```

Jika baris `user:<nama_user_anda>:rw-` muncul, artinya akun Anda telah memiliki izin baca/tulis penuh ke perangkat.

---

### 6. Panduan Pemecahan Masalah & Diagnostik

#### 6.1 Membedakan Masalah Izin dengan Masalah Browser
- **Masalah: Browser menampilkan pesan WebHID tidak tersedia.**
  - *Penyebab:* Anda menggunakan Firefox, Safari, atau browser yang belum mendukung WebHID.
  - *Solusi:* Gunakan browser berbasis Chromium (Chromium, Brave, Chrome, Edge).
- **Masalah: Kotak dialog tidak menampilkan mouse sama sekali.**
  - *Penyebab:* Receiver belum terpasang, mouse mati, atau halaman dibuka via HTTP tidak terenkripsi.
  - *Solusi:* Pastikan mouse menyala, dongle terpasang, dan akses via `https://` atau `http://localhost`.
- **Masalah: Perangkat muncul di dialog, namun gagal saat diklik Connect.**
  - *Penyebab:* Izin Linux ditolak pada `/dev/hidraw*`, atau terhalang sandbox peramban.
  - *Pemeriksaan:* Buka `chrome://device-log` pada browser, amati apakah ada log `Failed to open device: Access denied (EACCES)`.
  - *Solusi:* Pastikan aturan udev terpasang dan cek hasil `getfacl`.

#### 6.2 Browser Versi Flatpak
Jika browser Anda dipasang via **Flatpak** (contoh `com.google.Chrome` atau `com.brave.Browser`), sistem isolasi Flatpak secara default memblokir akses ke berkas `/dev` fisik.

Beri izin akses perangkat fisik pada Flatpak dengan perintah:
```bash
# Untuk Google Chrome Flatpak:
flatpak override --user --device=all com.google.Chrome

# Untuk Brave Flatpak:
flatpak override --user --device=all com.brave.Browser

# Untuk Chromium Flatpak:
flatpak override --user --device=all org.chromium.Chromium
```
Atau gunakan aplikasi **Flatseal** (GUI pengatur izin), pilih browser Anda, lalu aktifkan opsi **All devices (`--device=all`)**.

#### 6.3 Penggunaan pada Wayland / Hyprland
WebHID beroperasi langsung di level kernel USB/HID dan tidak dipengaruhi oleh protokol display Wayland maupun Hyprland. Tidak diperlukan konfigurasi jendela (*window rules*) khusus di Hyprland.

---

### 7. Menghapus Aturan udev (Uninstall)

Jika Anda ingin mengembalikan konfigurasi sistem seperti semula:

```bash
# 1. Hapus berkas aturan
sudo rm /etc/udev/rules.d/99-fantech-aria-ii-pro.rules

# 2. Muat ulang udev
sudo udevadm control --reload-rules
sudo udevadm trigger --subsystem-match=hidraw
```

---

### 8. Keamanan & Praktik Terbaik

- **JANGAN PERNAH** menjalankan browser web menggunakan `sudo` atau sebagai pengguna root. Hal ini membahayakan seluruh sistem dari serangan skrip web berbahaya.
- **JANGAN PERNAH** menjalankan `chmod 666 /dev/hidraw*` secara global. Tindakan tersebut membuka akses baca/tulis seluruh perangkat input komputer (termasuk keyboard yang bisa disadap ketikannya) kepada semua proses aplikasi.
- **JANGAN** menggunakan grup usang seperti `plugdev`. Arch Linux menggunakan `TAG+="uaccess"` sebagai standar resmi dan aman berbasis systemd.
- Aplikasi web ini tidak dapat dan tidak akan menjalankan perintah privileged secara diam-diam.
