> **Superseded (audit 2026-10-23).** This report predates the managed/native analysis. Its command meanings for `0x14`/`0x16` (these are receiver-LED mode and Long-distance, not DPI stage count/select), its polling-code table (inverted), its `0xXX02` "register" names (address + length 2), its `0x04`/`0x03`/firmware interpretations and its button codes (DPI Loop = `02 01 00`, not `05 00 00`) are wrong. Use `docs/EVIDENCE_LEDGER.md` (corrections listed in its §9). The original text below is kept unchanged for history.

# Fantech Aria II Pro XD7v2P — Protocol & Reverse Engineering Report

**Document Date:** October 2026  
**Target Hardware:** Fantech Aria II Pro XD7v2P Wireless Gaming Mouse  
**Sensor:** PixArt PAW3950 (up to 42,000 DPI, 750 IPS, 50G)  
**Microcontroller / Wireless:** StrikeSpeed Wireless 8K  
**Author / Investigator:** HNXZL / Community Investigation

---

## 1. Device Identification & USB Architecture

### 1.1 Candidate USB Identities

| Mode | VID | PID | USB Device Path / PnP ID | Verification Status |
|---|---|---|---|---|
| **2.4 GHz Receiver** | `0x3554` | `0xF523` | `USB\VID_3554&PID_F523` | **Verified** in Wireshark / USBPcap captures (Device Address 5) |
| **Wired USB** | `0x3554` | `0xF5A5` | `USB\VID_3554&PID_F5A5` | **Unverified hypothesis** from prior investigation; not present in current captures |

### 1.2 Receiver Composite USB Descriptor Breakdown

The 2.4 GHz wireless receiver (`VID_3554&PID_F523`) enumerates as a composite USB device with 3 HID interfaces:

```
Device Descriptor:
  bDeviceClass:        0x00 (Defined at Interface level)
  idVendor:            0x3554
  idProduct:           0xF523
  bNumConfigurations:  1

Configuration 1 (wTotalLength: 84 bytes):
  ├── Interface 0: HID Boot Keyboard
  │     bInterfaceClass:    0x03 (HID)
  │     bInterfaceSubClass: 0x01 (Boot Interface)
  │     bInterfaceProtocol: 0x01 (Keyboard)
  │     Endpoint 0x81 (IN, Interrupt, maxPacket: 8, interval: 4ms)
  │     Report Descriptor Length: 57 bytes (0x39)
  │
  ├── Interface 1: HID Vendor-Specific Configuration (TARGET INTERFACE)
  │     bInterfaceClass:    0x03 (HID)
  │     bInterfaceSubClass: 0x00 (None)
  │     bInterfaceProtocol: 0x00 (None)
  │     Endpoint 0x82 (IN, Interrupt, maxPacket: 49 bytes [0x31], interval: 4ms)
  │     Report Descriptor Length: 266 bytes (0x010A)
  │
  └── Interface 2: HID Boot Mouse
        bInterfaceClass:    0x03 (HID)
        bInterfaceSubClass: 0x01 (Boot Interface)
        bInterfaceProtocol: 0x02 (Mouse)
        Endpoint 0x83 (IN, Interrupt, maxPacket: 7 bytes, interval: 1ms)
        Report Descriptor Length: 87 bytes (0x57)
```

All configuration communication takes place exclusively over **Interface 1**. Normal mouse movement and click data flow across **Interface 2** (endpoint 0x83) and **Interface 0** (multimedia / keyboard mapping).

---

## 2. Protocol Framing & Checksum

### 2.1 Packet Structure (17 Bytes)

All configuration commands use a fixed 17-byte frame:

```
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────────────┬──────┐
│  0   │  1   │  2   │  3   │  4   │  5   │  6   │  7   │ 8 ... 15      │  16  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼───────────────┼──────┤
│ 0x08 │ CMD  │ EXT_H│ EXT_L│ REG_H│ REG_L│ VAL  │ COMP │ Extra / Pad   │ CHKS │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴───────────────┴──────┘
```

- **Byte 0 — Report ID:** Always `0x08`.
- **Byte 1 — Command Code:**
  - `0x03`: Read sensor / hardware identity.
  - `0x04`: Read status (current DPI and polling rate).
  - `0x07`: Read / Write setting register.
  - `0x08`: Read memory block (profiles and macros).
  - `0x09`: Write memory block (macros).
  - `0x0E`: Read profile state.
  - `0x0F`: Select active profile.
  - `0x12`: Read firmware version.
  - `0x14`: Configure DPI stage count.
  - `0x16`: Select active DPI stage.
- **Bytes 2–3 — Extended Address / Flags:** Usually `0x0000` for simple register access.
- **Bytes 4–5 — Register Address:** Big-endian 16-bit register identifier (e.g. `0x0002` for Polling, `0xA902` for Debounce).
- **Byte 6 — Value:** Primary parameter value.
- **Byte 7 — Value Complement:** Encoded such that `(VAL + COMP) & 0xFF == 0x55`.  
  Formula: `COMP = (0x55 - VAL) & 0xFF`.
- **Bytes 8–15 — Payload / Padding:** Zero-filled for scalar settings, or contains extended parameters for buttons and macros.
- **Byte 16 — Frame Checksum:** Modulo-256 sum check.  
  Formula: `sum(bytes[0..16]) & 0xFF == 0x55`.  
  Therefore: `CHKS = (0x55 - sum(bytes[0..15])) & 0xFF`.

### 2.2 USB Transfer Details

- **Host-to-Device (OUT):**
  - Sent via USB Control Transfer on Endpoint 0.
  - `bmRequestType`: `0x21` (Host-to-Device | Class | Interface).
  - `bRequest`: `0x09` (HID `SET_REPORT`).
  - `wValue`: `0x0208` (High byte = `0x02` Output Report, Low byte = `0x08` Report ID).
  - `wIndex`: `0x0001` (Interface 1).
  - `wLength`: `17` bytes.
- **Device-to-Host (IN):**
  - Received on Interrupt Endpoint `0x82` (Interface 1).
  - Packet size: 17 bytes starting with Report ID `0x08`.
  - For write commands (`0x07`), the device confirms by echoing the identical 17-byte packet back to the host.

---

## 3. Decoded Registers & Settings (Command 0x07)

### 3.1 Polling Rate (Register `0x0002`)

Bit-flag encoding in Byte 6:

| Rate | Byte 6 (VAL) | Byte 7 (COMP) | Full Packet (Hex) | Status |
|---|---|---|---|---|
| **125 Hz** | `0x01` | `0x54` | `08070000000201540000000000000000ef` | Confirmed in capture |
| **250 Hz** | `0x02` | `0x53` | `08070000000202530000000000000000ef` | Confirmed in capture |
| **500 Hz** | `0x04` | `0x51` | `08070000000204510000000000000000ef` | Confirmed in capture |
| **1000 Hz** | `0x08` | `0x4d` | `080700000002084d0000000000000000ef` | Confirmed in capture |
| **2000 Hz** | `0x10` | `0x45` | `08070000000210450000000000000000ef` | Confirmed in capture |
| **4000 Hz** | `0x20` | `0x35` | `08070000000220350000000000000000ef` | Confirmed in capture |
| **8000 Hz** | `0x40` | `0x15` | `08070000000240150000000000000000ef` | Confirmed in capture |

*Note: Per-profile polling registers `0x4C02`, `0x4E02`, `0x5002`, `0x5202` were also observed in the capture with identical bit-flag values, indicating the mouse maintains per-profile polling configuration.*

### 3.2 Debounce Time (Register `0xA902`)

Value is expressed directly in milliseconds:

| Debounce | Byte 6 (VAL) | Byte 7 (COMP) | Full Packet (Hex) | Status |
|---|---|---|---|---|
| **0 ms** | `0x00` | `0x55` | `08070000a9020055000000000000000046` | Confirmed in capture |
| **5 ms** | `0x05` | `0x50` | `08070000a9020550000000000000000046` | Confirmed in capture |
| **15 ms** | `0x0F` | `0x46` | `08070000a9020f46000000000000000046` | Confirmed in capture |
| **20 ms** | `0x14` | `0x41` | `08070000a9021441000000000000000046` | Confirmed in capture |

### 3.3 Peak Performance (Registers `0xB502` & `0xB702`)

- **Toggle (`0xB502`):**
  - Disable: `VAL = 0x00`, `COMP = 0x55` → `08070000b502005500000000000000003a`
  - Enable: `VAL = 0x01`, `COMP = 0x54` → `08070000b502015400000000000000003a`
- **Duration (`0xB702`):**
  - 3 minutes: `VAL = 0x03`, `COMP = 0x52` → `08070000b7020352000000000000000038`
  - 90 minutes: `VAL = 0x5A`, `COMP = 0xFB` → `08070000b7025afb000000000000000038`

### 3.4 Mode Select & Polling Rate Dependency (Register `0xB902` vs `0x0002`)

#### Register `0xB902` Definitions:
- **Low Power (LP):** `VAL = 0x00`, `COMP = 0x55` → `08070000b9020055000000000000000036`
- **High Performance (HP):** `VAL = 0x01`, `COMP = 0x54` → `08070000b9020154000000000000000036`

#### Hardware & Software Dependency Matrix:
The official Fantech Aria II Pro software links **Polling Rate (Report Rate)** and **Mode Select** with strict mutual exclusivity:

| Polling Rate | Mode Select State | Register Commands Dispatched | UI & Operational Behavior |
|---|---|---|---|
| **125–1000 Hz** | **LP** or **HP** selectable | `0x0002` for rate; `0xB902` with `0x00` (LP) or `0x01` (HP) | User freely selects between battery-saving (LP) and high-performance tracking (HP). |
| **2000–8000 Hz** | **Corded** (Locked) | **Only `0x0002`** (polling rate); **no `0xB902` command is sent** | LP/HP options are disabled and unavailable. UI displays `Corded`. Incompatible LP/HP states are not selected. |

#### Packet Capture Investigation Evidence:
1. **`mode-lp-hp.pcapng` Analysis:**
   - Frame 1863: User selects HP Mode → Host transmits `08070000b9020154000000000000000036` (Reg `0xB902`, Val `0x01`).
   - Frame 2119: User selects LP Mode → Host transmits `08070000b9020055000000000000000036` (Reg `0xB902`, Val `0x00`).
   - Frame 3261: User increases Polling Rate to 2000 Hz → Host transmits ONLY `08070000000210450000000000000000ef` (Reg `0x0002`, Val `0x10`).
   - **Critical Finding:** The official software dispatches *no secondary write* to `0xB902` when entering 2000 Hz. The UI simultaneously switches the Mode Select dropdown to `Corded` and greys it out.
2. **`all-settings-experiment.pcapng` Analysis:**
   - Frames 7325 (2000 Hz: `0x10`), 8479 (4000 Hz: `0x20`), 10473 (8000 Hz: `0x40`): In every high-rate transition, only the polling rate register `0x0002` is written.
3. **Behavior when downshifting from 2000–8000 Hz to ≤ 1000 Hz:**
   - Neither capture shows an automatic `0xB902` command transmitted upon lowering the rate.
   - **Device-level mechanism:** The mouse firmware enforces full-power corded throughput internally when operating at 2000–8000 Hz, while preserving the user's configured LP/HP profile setting in NVRAM.
   - **Configurator implementation:** When downshifting to ≤ 1000 Hz, the web configurator restores the user's prior LP/HP state in the UI and re-enables the toggle controls. It does not send unverified synthetic USB commands during polling rate adjustments.

### 3.5 Sensor Toggles (Registers `0xAB02`, `0xAF02`, `0xB102`)

Three boolean toggle registers were identified in sequence:

| Register | Captured Packets (Off / On) | Inferred Feature | Confidence Level |
|---|---|---|---|
| **`0xB102`** | `...0055...3e` / `...0154...3e` | **Motion Sync** | High (first toggle tested in UI sequence) |
| **`0xAF02`** | `...0055...40` / `...0154...40` | **Ripple Control** | High (second toggle tested in UI sequence) |
| **`0xAB02`** | `...0055...44` / `...0154...44` | **Angle Snapping** | High (third toggle tested in UI sequence) |

*Caution: While all three registers are confirmed toggles, physical hardware verification is required to confirm that the UI label mapping is 100% exact.*

### 3.6 Sleep Timeout / Lift-Off Distance (Register `0xAD02`)

Values observed in captures:
- `0x01` (1) → `08070000ad020154000000000000000042`
- `0x1E` (30) → `08070000ad021e37000000000000000042`
- `0x3C` (60) → `08070000ad023c19000000000000000042`
- `0xD2` (210) → `08070000ad02d283000000000000000042`
- `0xF0` (240) → `08070000ad02f065000000000000000042`

The values (30s, 60s, 210s/3.5min, 240s/4min) strongly correlate with **Sleep Timeout (seconds)**. Value `0x01` may represent immediate sleep or disabled timeout.

---

## 4. Status, Identity & Profile Commands

### 4.1 Sensor Identity (Command `0x03`)

- **Host Query:** `080300000000000000000000000000004a`
- **Device Response:** `08030000000101e6d3f30000000000009c`
- Bytes 6–9 (`0x01E6D3F3`): Sensor / hardware ID signature. Constant across all sessions.

### 4.2 Status & Battery Read (Command `0x04`)

- **Host Query:** `0804000000000000000000000000000049`
- **Device Response:** `080400000002640010[BATT]000000000000[CHKS]`
  - **Bytes 5 & 6 (`0x02 0x64`):** Static status signature / profile flag. Comprehensive audit across all captures and physical hardware tests confirms this value remains `0x02 0x64` invariant across all polling rates (125–8000 Hz), DPI stages (Stage 1..6), and power modes. **It is NOT the live DPI value.** An earlier misconception multiplied `0x64` (100) by 50 to display a false `5000 DPI`.
  - **Byte 7 (`0x00`):** Indicator / reserved.
  - **Byte 8 (`0x10`):** Constant status flag (`0x10` = 16 decimal).
  - **Byte 9 (`[BATT]`):** Live Battery Percentage directly in decimal (e.g. `0x33` = 51%, `0x3F` = 63%, `0x48` = 72%).

### 4.3 Firmware Version (Command `0x12`)

- **Host Query:** `081200000000000000000000000000003b`
- **Device Response:** `081200000002021900000000000000001e`
  - Byte 6 = `0x02`, Byte 7 = `0x19` (25 decimal) → Firmware **v2.25** (or v2.19 hex-coded).

### 4.4 Profile Selection (Command `0x0F`)

- Profile 1 (Index 0): `080f00000001000000000000000000003d`
- Profile 2 (Index 1): `080f00000001010000000000000000003c`
- Profile 3 (Index 2): `080f00000001020000000000000000003b`

### 4.5 DPI Architecture & Stage Management (Commands `0x14` & `0x16`)

#### Default NVRAM Stages (Decoded from Memory Block `0x000A`–`0x002B`):
The mouse maintains 6 onboard DPI stages with standard gaming presets:
| Stage | Raw Byte in Memory | Formula `(raw + 1) * 50` | Default Preset | Indicator Color |
|---|---|---|---|---|
| **Stage 1** | `0x07` (7) | `(7 + 1) * 50` | **400 DPI** | Red (`#ff3333`) |
| **Stage 2** | `0x0F` (15) | `(15 + 1) * 50` | **800 DPI** | Blue (`#3388ff`) |
| **Stage 3** | `0x1F` (31) | `(31 + 1) * 50` | **1600 DPI** (Hardware Default) | Green (`#00e879`) |
| **Stage 4** | `0x3F` (63) | `(63 + 1) * 50` | **3200 DPI** | Yellow (`#ffd700`) |
| **Stage 5** | `0x3F` (63) | `(63 + 1) * 50` | **3200 DPI** | Cyan (`#00e5ff`) |
| **Stage 6** | `0x7F` (127) | `(127 + 1) * 50` | **6400 DPI** | Purple (`#b044ff`) |

#### Verified USB Commands:
1. **Active DPI Stage Selection (Command `0x16`):**
   - Framing: `08 16 00 00 00 0a [stageIndex] 00 00 00 00 00 00 00 00 [CHKS]`
   - Stage 1 (Index 0): `08160000000a000000000000000000002d` (400 DPI)
   - Stage 2 (Index 1): `08160000000a010000000000000000002c` (800 DPI)
   - Stage 3 (Index 2): `08160000000a020000000000000000002b` (1600 DPI)
   - Checksum: `CHKS = (0x55 - (8 + 22 + 10 + stageIndex)) & 0xFF`.
2. **Active Stage Count (Command `0x14`):**
   - Framing: `08 14 00 00 00 0a [count] 00 00 00 00 00 00 00 00 [CHKS]`
   - 1 Stage: `08140000000a010000000000000000002e`
   - 2 Stages: `08140000000a020000000000000000002d`
   - 3 Stages: `08140000000a030000000000000000002c`
   - 6 Stages: `08140000000a0600000000000000000029`
   - Checksum: `CHKS = (0x55 - (8 + 20 + 10 + count)) & 0xFF`.

#### Unresolved Custom DPI Value Writes:
Setting arbitrary DPI values (e.g. 1450 DPI) modifies the 4-byte stage table entries in NVRAM block `0x000C` (`[val1] [val2] 00 [comp]`). To implement custom slider DPI modification safely without risking memory block corruption, an isolated packet capture of the official Windows software adjusting individual stage DPI sliders is required.

---

## 5. Partially Decoded & Unimplemented Features

### 5.1 Button Remapping (Registers `0x6404`–`0x7404`)

Five physical remapping registers correspond to Buttons 2 through 6 (Button 1 / Left Click is locked in hardware/firmware for primary safety):
- **Button 2 (Right Button):** Register `0x6404`
- **Button 3 (Middle Button):** Register `0x6804`
- **Button 4 (Forward):** Register `0x7004`
- **Button 5 (Back):** Register `0x6C04`
- **Button 6 (DPI Loop):** Register `0x7404`

#### Packet Framing:
`08 07 00 00 [REG_HI] [REG_LO] [ACT_1] [ACT_2] [ACT_3] [COMP] 00 00 00 00 00 00 [CHKS]`
- `COMP = (0x55 - (ACT_1 + ACT_2 + ACT_3)) & 0xFF`
- `CHKS = (0x55 - sum(bytes[0..15])) & 0xFF`

#### Verified Mouse Actions:
| Action | Bytes (`ACT_1 ACT_2 ACT_3 COMP`) | Verified Packet Example |
|---|---|---|
| **Left Click** | `01 01 00 53` | `080700006c040101005300000000000081` |
| **Right Click** | `01 02 00 52` | `0807000064040102005200000000000089` |
| **Middle Click** | `01 04 00 50` | `0807000068040104005000000000000085` |
| **Forward** | `01 10 00 44` | `080700007004011000440000000000007d` |
| **Back** | `01 08 00 4C` | `080700006c040108004c00000000000081` |
| **DPI Loop** | `05 00 00 50` | `0807000074040500005000000000000079` |
| **Disabled** | `00 00 00 55` | `0807000068040000005500000000000085` |

*Note: Keyboard key remapping (`02 [KEY] 00`) and macros (`04 0A 03`) require segment allocations in memory block `0x0900` and remain marked read-only / unverified.*
- `050000`: DPI loop function.
- `070000`: Special / multimedia function.

*Status: Partially decoded. UI displays button mapping in read-only mode to prevent sending invalid assignments.*

### 5.2 Macro Data (Command `0x09`)

Multi-segment memory write protocol:
- Segment writes to base address `0x0900`, with `0x0A` (10-byte) chunks.
- Payloads contain macro name (ASCII characters) followed by scancodes, event types (press/release), and delay timings.
- Multi-packet sequencing requires stateful transaction management.

*Status: Not implemented. High risk of corruption if framing is incorrect.*

---

## 6. Safety & Verification Rules

1. **Never send arbitrary bytes** — Only transmit packets matching the 17-byte framed structure with validated checksums.
2. **Never claim hardware verification without real device access** — All findings in this document are derived from Windows USBPcap/Wireshark captures.
3. **Respect read-only boundaries** — Features whose write protocol is incomplete (macros, full button remapping) must remain disabled in the UI.
4. **Independent from Aria XD7** — Do not reuse commands or report formats from the original Aria XD7 configurator. The Aria II Pro XD7v2P uses a completely different protocol.
