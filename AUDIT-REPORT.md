# Aria II Pro Configurator — Onboarding Audit Report

Generated: 2026-10-23

## 1. Repository Structure

| File/Directory | Purpose |
|---|---|
| `index.html` | Single-page app with connect screen + home mockup (157 lines) |
| `styles.css` | Dark/glassmorphism UI (230 lines) |
| `README.md` | Brief starter instructions |
| `OLD-README.md` | Prior project README with detailed design notes |
| `assets/` | Product images, favicon, topography SVG |
| `windows-capture/screenshots/` | 8 screenshots of official Fantech software |
| `windows-capture/usb-captures/` | 10 pcapng files from USBPcap/Wireshark |
| `windows-capture/usb-identification/` | Empty directory (no files) |
| `windows-capture/notes/` | Single `ui.png` screenshot |

**Framework:** Plain HTML/CSS/JS — no build tools, no npm, no framework.

## 2. Current Application State

### Working
- Disconnected glassmorphism connect screen (HTML+CSS)
- Connected home screen layout (HTML+CSS, hidden by default)
- Responsive layout with mobile breakpoints
- CSS-only mouse placeholder (fallback when `assets/mouse1.webp` missing)
- About section with HNXZL credits and tako.id link

### Not Working
- `assets/mouse1.webp` referenced but missing → falls back to CSS placeholder
- Connect button shows alert placeholder — no WebHID integration
- All controls are inert — no device communication
- No JavaScript beyond the placeholder connect handler
- DPI/Hz values show "—" / "Awaiting device read" (correct behavior for disconnected)

### Missing
- No WebHID device connection code
- No protocol implementation
- No feature guide / about page with feature explanations
- No bilingual (EN/ID) support
- No DPI, Performance, Sensor, Button, Macro, Advanced, or Profile pages

## 3. Device Identity Evidence

| Device | VID:PID | Evidence Source |
|---|---|---|
| Wireless 2.4 GHz receiver | `3554:F523` | **Confirmed** in pcapng captures (device address 5) |
| Wired USB | `3554:F5A5` | Listed in OLD-README.md; **not observed** in any capture |

The wireless receiver at device address 5 in all captures is a composite USB device with 3 HID interfaces:
- Interface 0: HID Keyboard (class 0x03, subclass 0x01, protocol 0x01) — 8-byte reports
- Interface 1: HID Vendor-specific (class 0x03, subclass 0x00, protocol 0x00) — 49-byte max packet (endpoint 0x82 IN)
- Interface 2: HID Mouse (class 0x03, subclass 0x01, protocol 0x02) — 7-byte reports (endpoint 0x83 IN)

**Configuration communication uses Interface 1** (49-byte vendor-specific HID).

## 4. Visual Assets

| File | Dimensions | Description |
|---|---|---|
| `front.webp` | 1024×1024 | Product photo (front view) — **should be used as mouse image** |
| `aria2banner-readable.webp` | 3584×1184 | Wide banner image |
| `button.webp` | 2768×1536 | Button/side view photo |
| `fantech-logo.webp` | 640×573 | Fantech brand logo |
| `topography.svg` | 720×720 | Contour line texture for backgrounds |
| `fav.ico` | 32×32 | Favicon |
| `mouse1.webp` | **MISSING** | Referenced in HTML but not in assets |

## 5. Protocol Analysis (from USB Captures)

### 5.1 Communication Format

All configuration uses Interface 1 with 17-byte HID reports:

```
Byte[0]:    0x08 (constant header)
Byte[1]:    Command type
Byte[2-3]:  Extended address / flags (usually 0x0000)
Byte[4-5]:  Register address (big-endian)
Byte[6]:    Value
Byte[7]:    Value complement (0x55 - byte[6]) mod 256
Byte[8-15]: Extended data / padding
Byte[16]:   Checksum: (0x55 - sum(bytes[0..15])) mod 256
```

**Write pattern:** Host sends packet → device echoes identical packet as confirmation.

### 5.2 Command Types

| Cmd | Direction | Purpose | Confidence |
|---|---|---|---|
| 0x03 | Read | Sensor/device identity | High — always returns same data |
| 0x04 | Read | Status + battery level indicator | High — bytes 5-6 are static 0x02 0x64 (NOT DPI); byte 9 is battery % |
| 0x07 | Write | Setting change (many registers) | **High** — most settings use this |
| 0x08 | Read | Memory block read (profiles, macros) | Medium — complex address scheme |
| 0x09 | Write | Memory block write (macros) | Medium — seen in macro capture |
| 0x0E | Read | Profile info | Medium |
| 0x0F | Write | Profile select (0,1,2) | High |
| 0x12 | Read | Firmware info (v2.19 or v2.25) | Medium |
| 0x14 | Write | DPI active stage count (1..6) | High — verified in official captures |
| 0x16 | Write | Active DPI stage select (Stages 1..6: 400, 800, 1600, 3200, 6400 DPI) | High — verified in official captures |

### 5.3 Decoded Setting Registers (cmd 0x07)

| Register | Feature | Values Observed | Confidence |
|---|---|---|---|
| 0x0002 | Polling rate (global) | 0x01=125Hz, 0x02=250, 0x04=500, 0x08=1000, 0x10=2000, 0x20=4000, 0x40=8000 | **High** |
| 0x4C02 | Polling rate (profile-specific?) | Same bit flags as 0x0002 | Medium |
| 0x4E02 | Polling rate (profile-specific?) | Same bit flags | Medium |
| 0x5002 | Polling rate (profile-specific?) | Same bit flags | Medium |
| 0x5202 | Polling rate (profile-specific?) | Same bit flags | Medium |
| 0xA902 | Debounce time (ms) | 0x05=5ms, 0x0F=15ms, 0x14=20ms (direct value) | **High** |
| 0xAB02 | Sensor toggle (likely Angle Snapping) | 0x00=Off, 0x01=On | **High** (toggle confirmed; label uncertain) |
| 0xAD02 | Sleep timeout or LOD | 0x01, 0x1E=30, 0x3C=60, 0xD2=210, 0xF0=240 | Medium |
| 0xAF02 | Sensor toggle (likely Ripple Control) | 0x00=Off, 0x01=On | **High** (toggle confirmed; label uncertain) |
| 0xB102 | Sensor toggle (likely Motion Sync) | 0x00=Off, 0x01=On | **High** (toggle confirmed; label uncertain) |
| 0xB502 | Peak Performance toggle | 0x00=Off, 0x01=On | **High** |
| 0xB702 | Peak Performance duration | 0x03, 0x5A (3 and 90 — minutes or seconds) | Medium |
| 0xB902 | Mode Select (LP/HP) | 0x00=Low Power, 0x01=High Performance (125–1000 Hz only; 2000–8000 Hz locks to Corded with no secondary command) | **High** |

### 5.4 Button Mapping (Registers 0x6404–0x7404)

Five physical remapping registers correspond to Buttons 2 through 6 (Button 1 / Left Click is locked in hardware/firmware for primary safety):
- **Button 2 (Right Button):** Register `0x6404`
- **Button 3 (Middle Button):** Register `0x6804`
- **Button 4 (Forward):** Register `0x7004`
- **Button 5 (Back):** Register `0x6C04`
- **Button 6 (DPI Loop):** Register `0x7404`

Packet framing:
`08 07 00 00 [REG_HI] [REG_LO] [ACT_1] [ACT_2] [ACT_3] [COMP] 00 00 00 00 00 00 [CHKS]`
- `COMP = (0x55 - (ACT_1 + ACT_2 + ACT_3)) & 0xFF`
- `CHKS = (0x55 - sum(bytes[0..15])) & 0xFF`

Verified mouse action encodings:
- `0101` = Left Click (`01 01 00 53`)
- `0102` = Right Click (`01 02 00 52`)
- `0104` = Middle Click (`01 04 00 50`)
- `0110` = Forward (`01 10 00 44`)
- `0108` = Back (`01 08 00 4C`)
- `0500` = DPI Loop (`05 00 00 50`)
- `0000` = Disabled (`00 00 00 55`)

### 5.5 Macro Data (cmd 0x09)

Macro writing uses segmented memory writes with:
- Address starting at 0x0900
- Segment size 0x0A (10 bytes)
- Data contains macro name (ASCII), key sequences with delays

### 5.6 Sensor Identity Response (cmd 0x03)

Constant response: `08 03 00 00 00 01 01 E6 D3 F3 00 00 00 00 00 00 9C`
- Bytes 6-9: `01 E6 D3 F3` — likely sensor + firmware identifier
- PAW3950 sensor expected for Aria II Pro

## 6. Screenshot Inventory

8 screenshots from official Fantech software captured at timestamps 06:20–07:08.
Cannot view image content (model limitation), but filenames and pcapng correlations suggest they cover:
- Main DPI/button mapping UI
- Polling rate selection
- Sensor settings (Motion Sync, Ripple Control, Angle Snapping)
- Peak Performance settings
- Advanced settings (LOD, sleep, debounce)
- Macro manager
- Profile configuration

## 7. Feature Status Matrix

| Feature | UI Present | Protocol Known | Capture Evidence | Can Implement |
|---|---|---|---|---|
| Device connection (WebHID) | Placeholder | VID/PID confirmed | Yes | **Yes** |
| Polling rate | No controls | **Fully decoded** | Yes | **Yes** |
| Debounce time | Dropdown (inert) | **Decoded** (direct ms) | Yes | **Yes** |
| Motion Sync toggle | Toggle (inert) | **Toggle decoded** (register uncertain) | Yes | **Yes** |
| Ripple Control toggle | Toggle (inert) | **Toggle decoded** (register uncertain) | Yes | **Yes** |
| Angle Snapping toggle | Toggle (inert) | **Toggle decoded** (register uncertain) | Yes | **Yes** |
| Peak Performance on/off | No | **Decoded** | Yes | **Yes** |
| Peak Performance duration | No | **Decoded** | Yes | **Yes** |
| LP/HP mode | No | **Decoded** | Yes | **Yes** |
| DPI stage selection & count | Yes | Fully decoded (CMD 0x14, 0x16) | Yes | **Yes** (Custom slider values partial) |
| Button mapping | Interactive pins & editor | Fully decoded (0x6404–0x7404) | Yes | **Yes** (Standard mouse actions; Left locked) |
| Profile select | Cards (inert) | **Decoded** (0,1,2) | Yes | **Yes** |
| Macro recording | No | Partially decoded | Yes | No (complex) |
| Sleep timeout / LOD | No | Partially decoded | Yes | **Partial** |
| Firmware version | No | **Decoded** | Yes | **Yes** |

## 8. Implementation Plan (Priority Order)

### Phase 1 — Core Connection & Reading (HIGH PRIORITY)
1. WebHID connection with VID `0x3554`, PID `0xF523` filter
2. Protocol engine: packet builder, checksum, send/receive
3. Device identity read (cmd 0x03)
4. Status read (cmd 0x04) → display DPI and polling rate
5. Firmware version read (cmd 0x12)

### Phase 2 — Setting Controls (HIGH PRIORITY)
6. Polling rate selector (125–8000 Hz)
7. Debounce time control
8. Sensor toggles (Motion Sync, Ripple Control, Angle Snapping)
9. Peak Performance toggle + duration
10. LP/HP mode toggle

### Phase 3 — Profile & DPI Management (MEDIUM PRIORITY)
11. Profile selection (3 profiles)
12. DPI stage management
13. Sleep timeout / LOD configuration

### Phase 4 — Advanced Features (LOWER PRIORITY)
14. Button mapping UI (basic)
15. Feature guide / About page
16. Bilingual support (EN/ID)

### Phase 5 — Complex Features (FUTURE)
17. Full button mapping with action types
18. Macro recording and management
19. Profile import/export

## 9. Risks and Unknowns

1. **Sensor toggle register-to-label mapping uncertain** — 0xAB02, 0xAF02, 0xB102 are confirmed toggles but exact UI labels (Motion Sync vs Ripple Control vs Angle Snapping) need device testing.
2. **0xAD02 purpose ambiguous** — could be sleep timeout or LOD.
3. **DPI value encoding not fully understood** — byte 0x64 in status response needs interpretation.
4. **Wired PID 0xF5A5 unverified** — no capture evidence; wired mode may use different interface.
5. **No physical device testing** — all analysis is from captures only.
6. **Button mapping action encoding complex** — partial decode only.
7. **Macro format partially understood** — name + key sequences seen but timing format unclear.
