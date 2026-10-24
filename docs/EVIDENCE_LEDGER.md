# Aria II Pro — Evidence Ledger and Protocol Specification

Audit date: 2026-10-23. Scope: Fantech Aria II Pro (XD7V2P) with the 2.4 GHz receiver `3554:F523`. This is the mouse configurator, not the aria2 download manager.

This ledger is the protocol source of truth for the next implementation phase. It reconciles the managed C# code, the native DLL, the installer resources, every capture in the workspace, the profile exports and the screenshots. Where it contradicts earlier reports, §9 lists the contradiction and the evidence that settles it.

Companion documents: `WORKSPACE_AUDIT.md` (what exists where), `FEATURE_MATRIX.md` (status per control), `OPEN_QUESTIONS.md`, `IMPLEMENTATION_READINESS.md`. Raw supporting material is under `docs/evidence/`.

---

## 1. Evidence sources and what each one can prove

| ID prefix | Source (workspace path) | What it establishes | What it cannot establish |
|---|---|---|---|
| **M** | `aria/ghidra manual/Mouse-Drive-Beta.cs` — ILSpy export of `Mouse Drive Beta.exe` v1.0.0.4 (installer copy SHA-256 `f59265cd…5832`, identical to the hash recorded in the earlier Windows report). Cited as `M:<line>`. | UI handler → data-model field, enum values, UI gating, host-side algorithms (battery, DPI decode, macro editing). | Bytes on the wire; firmware behaviour. |
| **N** | `aria/ghidra manual/costura32.hidusb32.dll` (SHA-256 `09bb39ac…20fc`, same as the earlier `fantech-hidusb32.dll`). Decompiled for this audit with Ghidra 11.4.2 headless on a scratch copy; excerpts in `docs/evidence/HIDUSB32_NATIVE_EXCERPTS.c`. Cited as `N:<function>@<address>`. | Exact request frames, checksum, flash address of every field, response matching, parsers, retry and timeout rules. | Firmware behaviour after a frame is accepted. |
| **X** | Installer `aria/aria 2 pro.exe` (Inno Setup, SHA-256 `4d159937…630a`), extracted with innoextract on a scratch copy. Text resources copied to `aria/analysis/installer-extract/`: `Config.ini`, `0-English.xml`, `driver_sensor.h`, `Description.xml`. Cited as `X:<file>`. | Official option lists and the values stored for them, per-device parameters (sensor, PIDs, defaults, which pages are shown). | Whether the firmware honours a value. |
| **C** | 19 PCAPNG files (USBPcap). Decoded transcripts in `docs/evidence/CAPTURE_TRANSCRIPTS.txt`. Cited as `C:<file>#<frame>`. | What the official app actually sent, and the receiver's reply/echo. | Persistence (unless a later read shows it) or physical effect (unless a device-originated report shows it). |
| **B** | Three official profile exports in `aria/aria-ii-pro-capture-2026-10-23-rev2/before/*.bin`. | The managed `FlashDataMap` state at export time. | Wire format (the export is the managed struct, not flash bytes). |
| **S** | Screenshots in `aria/screenshoots/` and `windows-capture/screenshots/`. | Labels and states visible in the official UI. | Encodings. |
| **P** | Earlier reports whose raw artifacts are **not** in this workspace (`allcapture.pcapng`, `nwex.bin`, observation JSON 1–7, `Device1_log.txt`, `Device_CID13_MID8.bin`). Cited as `P:<report>`. | Secondary evidence only, accepted where it agrees with M/N/C. | Anything not independently re-checkable here. |
| **R** | Runtime WebHID observations as reported in `aria/analysis/*.md` (observations 3–7). | The browser `sendReport(0x08, …)` path works on this device, and DPI stage writes persist (read back). | Re-verification: the JSON files are not in the workspace. |

**Confidence vocabulary used below:** `CONFIRMED_STATIC` (code/resources prove it), `CONFIRMED_CAPTURE` (official app traffic shows it), `CONFIRMED_RUNTIME` (a browser readback or a device-originated report shows it), `STRONGLY_INFERRED`, `UNKNOWN`.

---

## 2. Transport and frame format

### 2.1 USB identity

| Item | Value | Evidence | Confidence |
|---|---|---|---|
| Vendor ID | `0x3554` | C: all captures (descriptor of device 4.x), X:`Config.ini` `VID`=base64 `FANTECH3554` | CONFIRMED |
| Receiver (dongle) PID | `0xF523` | C: descriptors; X:`Config.ini` `D_PID`=base64 `FANTECHF523` | CONFIRMED |
| Wired mouse PID | `0xF5A5` | X:`Config.ini` `M_PID`=base64 `FANTECHF5A5` | CONFIRMED_STATIC; never observed in a capture |
| Interface | 1 (vendor HID, IN endpoint `0x82`, 49-byte max packet) | C: descriptors; X:`Config.ini` `Interfaceid=1` | CONFIRMED |
| Other interfaces | 0 = boot keyboard, 2 = boot mouse (EP `0x83`) | C: descriptors | CONFIRMED |
| MCUs | mouse `NRF52840`, dongle `CX52650N`, 8K dongle `CH32V305` | X:`Config.ini` `MM`/`DM`/`D8M` (base64) | CONFIRMED_STATIC |
| Sensor string used by the app | `3395` | X:`Config.ini` `Sensor=MzM5NQ==`; B: export header | CONFIRMED_STATIC (the marketing PAW3950 claim in `docs/protocol-analysis.md` is not what the app is configured with) |

### 2.2 17-byte frame (same layout for requests and replies)

```
idx: 0     1    2       3     4     5     6 … 15        16
     0x08  id   status  addrH addrL len   data[0..9]    chk
```

* `0x08` is the HID report ID. In WebHID this is `sendReport(0x08, body)` where `body` is bytes 1–16 (16 bytes), and `inputreport` events deliver the same 16-byte body with `reportId === 0x08`.
* `id` is the command. For this DLL the raw byte equals the managed `UsbCommandID` value: every native sender writes the literal constant into byte 1 (`N:CS_UsbServer_ReadBatteryLevel@1000cdc0` writes 4, `UsbServer_SetCurrentConfig@1000d4b0` writes 0x0F, etc.) and the managed callback reads `id = array[1]` and switches on `UsbCommandID` (`M:3714`, `M:13153`). **CONFIRMED_STATIC + CONFIRMED_CAPTURE.**
* `status` is always 0 in requests (`N:FUN_10006b00@10006b00`). The earlier "24-bit address" description treats this byte as an address high byte; that is harmless for flash addresses (<0x1B00) but is not how the native code builds it.
* `addr` is a 16-bit big-endian flash address (`N:FUN_10006b00`, `N:UsbServer_ReadFalshData@1000ca70`).
* `len` is the payload length (≤10). The native code ORs `0x80` into it only after `UsbServer_KeyboardStart`, which the mouse app never calls, so it is always clear for this mouse (`N:UsbServer_KeyboardStart@1000c770`).
* `chk = (0x55 − Σ bytes[0..15]) & 0xFF`, i.e. all 17 bytes sum to `0x55`; equivalently the 16-byte WebHID body sums to `0x4D`. Native helper `FUN_1000c190(buf,start,end)` returns `0x55 − Σ buf[start:end]` and is reused for every inner checksum below. **CONFIRMED_STATIC + every frame in every capture verifies (`ck=ok` in the transcripts).**

### 2.3 Request/response rules in the official driver (`N:UsbReaderWriterServer@1000e320`, `N:FUN_1000dc20@1000dc20`)

* Requests are serialised from a queue. Each is written with `WriteFile` (17 bytes) after a short busy-wait of about 8 clock ticks.
* A reply is accepted only if its checksum is valid and its `id` equals the queued request's `id`.
* For `id 0x07` (WriteFlashData) the reply must be a **byte-identical echo** of all 17 bytes; any difference marks the request for retry. An echo therefore proves the receiver accepted the frame. It does not prove the field persisted; only a later 0x08 read can show that.
* Timeout is 1000 ms (5000 ms for `0x09` ClearSetting); up to 5 attempts.
* Data handed to the managed callback = bytes 6..15 of each reply; data length = sum of `len` fields, except replies to `0x03` and `0x04` are forced to 4 bytes.
* `id 0x0A` frames are **unsolicited** device notifications, handled outside the queue.

---

## 3. Command table

| id | Managed name | Request (bytes 1..15, chk omitted) | Reply / behaviour | Evidence | Confidence |
|---|---|---|---|---|---|
| 0x01 | EncryptionData | `01 00 00 00 00 …` | data → `CS_GetDeviceInfo`: CID = data[4], MID = data[5], DeviceType = data[6] | M:2201, N:CS_GetDeviceInfo@10006420 | CONFIRMED_STATIC (not seen in workspace captures) |
| 0x02 | PCDriverStatus | `02 00 00 00 01 <0/1>` | echo | N:UsbServer_SetPCDriverStatus@1000cc50; P: log correlation | CONFIRMED_STATIC |
| 0x03 | DeviceOnLine | `03 00 00 00 00` | `03 00 00 00 01 <online> e6 d3 f3 …`; `online = data[0] != 0` | N:CS_isDeviceOnLine@10006440, N:CS_UsbServer_ReadOnLine@1000cd40; C: every capture (`01` = online) | CONFIRMED_STATIC + CAPTURE. Bytes `e6 d3 f3` are not parsed by anything (not a sensor ID). |
| 0x04 | BatteryLevel | `04 00 00 00 00` | `04 00 00 00 02 <level> <isCharging> <mV hi> <mV lo>` | N:CS_UsbServer_ReadBatteryLevel@1000cdc0, N:CS_GetDeviceBatteryStatus@10006450, M:13161; C: e.g. `mode-lp-hp#1967/1969` | CONFIRMED_STATIC + CAPTURE (§8) |
| 0x05 | DongleEnterPair | `05 00 00 00 02 00 00 0D 00…` (OnlyCid form used by the pairing dialog; CID 13 at frame offset 8, verified in disassembly; full frame `08 05 00 00 00 02 00 00 0D 00 00 00 00 00 00 00 39`) | progress polled with 0x06 every 1 s | N:UsbServer_EnterDonglePairOnlyCid@1000cef0 + objdump, M:17865, M:23810 (CID parse) | CONFIRMED_STATIC; never captured |
| 0x06 | GetPairState | `06 00 00 00 00` (frame chk `47`) | data[0]: 1 = pairing, 2 = fail, 3 = success; no official overall timeout | M:17885–17961 | CONFIRMED_STATIC |
| 0x07 | WriteFlashData | `07 00 aH aL len data…` | byte-identical echo | N:FUN_10006b00; C: all write captures | CONFIRMED |
| 0x08 | ReadFlashData | `08 00 aH aL len 00…` (len ≤10) | `08 00 aH aL len data…` | N:UsbServer_ReadFalshData; C:`profiles-config#3209…`; R: obs. 3–7 | CONFIRMED_RUNTIME |
| 0x09 | ClearSetting ("Restore") | `09 00 00 00 00` | echo after ~600 ms; app then re-applies Advanced defaults and re-reads flash | N:CS_UsbServer_SetClearSetting@1000d020, M:14678, M:13197; C:`profiles-config#15535/15537` | CONFIRMED. **Destructive.** |
| 0x0A | StatusChanged (device → host) | — | data[0] bit0 DPI, bit1 report rate, bit2 config/profile, bit3 DPI LED, bit4 logo LED, bit5 LED bar, bit6 battery | N:CS_GetDeviceStatusChanged@10006480, M:13467; C:`wireshark#9913` (bit0, unsolicited), `profiles-config#2977` (bit2 right after a profile switch) | CONFIRMED_CAPTURE |
| 0x0E | GetCurrentConfig | `0E 00 00 00 00` | `0E 00 00 00 01 <profile 0..3>` | N:CS_UsbServer_ReadConfig@1000d430, M:13218; C:`profiles-config#3521/4577/7005` → 01, 02, 00 after selecting 1, 2, 0 | CONFIRMED_CAPTURE |
| 0x0F | SetCurrentConfig | `0F 00 00 00 01 <profile>` | echo, then 0x0A bit2 | N:UsbServer_SetCurrentConfig@1000d4b0; C:`profiles-config#2971/2975/2977` | CONFIRMED_CAPTURE |
| 0x12 | ReadVersionID | `12 00 00 00 00` | `12 00 00 00 02 <hi> <lo>`; shown as `v` + hex(hi) + `.` + hex2(lo) → `v2.19` for `02 19` | N:CS_UsbServer_ReadVersion@1000d5d0, M:20538, M:13303; C:`profiles-config#3517` | CONFIRMED |
| 0x14 | Set4KDongleRGB (receiver LED mode) | `14 00 00 00 0A <mode> c1R c1G c1B c2R … c3B` (official sends colours all 0) | echo | N:UsbServer_Set4KDongleRGB@1000d6a0, M:21896; C:`all-settings#32085…`, `aria adv settings *.pcapng` | CONFIRMED (mode mapping §6.10) |
| 0x15 | Get4KDongleRGBValue | `15 00 00 00 00` | `15 00 00 00 0A <mode> …` | N:CS_UsbServer_Get4KDongleRGBValue@1000d750, M:13419; C:`profiles-config#3528` (01) and `#16464` (02) | CONFIRMED_CAPTURE |
| 0x16 | SetLongRangeMode | `16 00 00 00 0A <0/1>` | echo | N:UsbServer_SetLongRangeMode@1000d890, M:22358; C:`all-settings#31113/31461`, `advanced-settings#8055/8505` | CONFIRMED_CAPTURE |
| 0x17 | GetLongRangeMode | `17 00 00 00 00` | `17 00 00 00 0A <0/1> …` | N:CS_UsbServer_GetLongRangeMode@1000d930, M:13435; C:`profiles-config#3525` (00), `#16459` (01) | CONFIRMED_CAPTURE |
| 0x18 / 0x19 | Set/GetDongleRGBBarMode | exported natively | — | N:CS_UsbServer_SetDongleRGBBarMode@1000da30 | Not referenced by the managed app → NOT_APPLICABLE |

The 0x14 and 0x16 payloads start at **byte 6** (`len = 0x0A` at byte 5). `aria/aria-ii-pro-webhid/app.js` (`vendorCommandFrame`) puts `0x0A` at byte 4 and the value at byte 5. That frame does not match the official one (§9).

---

## 4. Flash map of the active profile

The official driver reads flash at power-up and after `0x0A` bit2. It reads `0x0000–0x00BF` and the headers of each shortcut and macro slot, then parses with `N:ProtocolDataParser@100068d0`. Writes are generated by diffing the managed map against the cached map (`N:FUN_10006d40@10006d40`), and each changed field becomes one `0x07` frame. Flash content is per-profile. After `0x0F` the same addresses return the newly selected profile's data (C:`profiles-config` re-reads after each switch).

Two-byte fields are stored as `value, 0x55 − value`. The parser ignores a field whose complement does not match and substitutes the default.

| Addr | Len | Field (managed `MouseConfig` etc.) | Encoding / legal values | Parser default | Evidence |
|---|---|---|---|---|---|
| 0x00 | 2 | `reportRate` | 1=1000, 2=500, 4=250, 8=125, 0x10=2000, 0x20=4000, 0x40=8000 Hz | 1 | N:MouseConfigParser@10006500; M:2358 enum, M:25890 decode; C:`all-settings#6259…10471` |
| 0x02 | 2 | `maxDPI` (stage count, 1..4 in UI) | count, not index | 6 | N:MouseConfigParser; M:29746 (`SelectIndex = maxDPI−1`), M:29907; C:`dpi stages#3141/22721/25721/33479` |
| 0x04 | 2 | `currentDPI` (active stage, 0-based) | must be < maxDPI or parser uses 2 | 2 | N:MouseConfigParser (`< maxDPI` check); M:29877; C:`dpi stages#10111…31731` |
| 0x06 / 0x08 | 2 / 2 | `xSpindown` / `ySpindown` | not exposed in UI | 0 | N |
| 0x0A | 2 | `silenceHeight` (LOD) | 1 = 1 mm, 2 = 2 mm, 3 = 0.7 mm (0.7 hidden for sensor ≠ "3950", §6.5) | 0 | N; X:`0-English.xml` `customComboBox_LOD`; M:25823 |
| 0x0C + 4i (i=0..7) | 4 | `dpiConfig[i]` xDPI, yDPI, DPIex, chk | `chk = 0x55 − (x+y+ex)`; decode in §5.2 | FF FF 00 | N:ProtocolDataParser; C:`dpi stages#27037` (`0x18`); R: obs. 5 and 7 |
| 0x2C + 4i | 4 | `dpiConfig[i].color` R, G, B, chk | `chk = 0x55 − (R+G+B)` | FF FF FF | N:ProtocolDataParser (`pbVar6+0x20`); C:`dpi color#8069/13853/18347` (stage 1 → 0x2C), `dpi stages#13297/18991` (stage 2 → 0x30) |
| 0x4C | 2 | `dpiLed.mode` | 1 = Fixed light, 2 = Flicker (Off is expressed by enable = 0) | 2 | N:ProtocolDataParser; M:26083 |
| 0x4E | 2 | `dpiLed.brightness` | raw `[16,30,60,90,128,150,180,210,230,255]` for UI 1..10 | 0x80 | M:20549 / M:20574; C:`all-settings#16149` (0x10 = UI 1) |
| 0x50 | 2 | `dpiLed.breathSpeed` | UI 1..5 stored directly | 3 | M:26104; C:`all-settings#18999/20135` |
| 0x52 | 2 | `dpiLed.enable` | 0/1 | 1 | M:26091/26095; C:`all-settings#14791` |
| 0x54–0x5F | — | not parsed by this DLL (contains `ff 00 ff 57 00 55 80 d5 03 52 00 55`) | — | — | C:`profiles-config#3241/3245/3249` — UNKNOWN, do not write |
| 0x60 + 4k (k=0..15) | 4 | `keys[k]` type, param1, param2, chk | §5.4 | 00 00 00 | N:ProtocolDataParser; C: button captures |
| 0xA0 | 7 | `ledBar` mode, R, G, B, speed, brightness, chk | `chk = 0x55 − Σ6` | 01 FF FF FF 08 09 | N:ProtocolDataParser, N:FUN_10006d40 (`0xa0, 7`) — main LED, hidden for this model (§6.11) |
| 0xA7 | 2 | `ledBar.enable` | 0/1 | 1 | N |
| 0xA9 | 2 | `keyDebounceTime` | ms, 0..20 | 8 | N:MouseConfigParser; X:`0-English.xml` `<DebounceTime>`; C:`debounce` captures |
| 0xAB | 2 | `motionSyncEnable` | 0/1 | 1 | N; M:26180; C:`all-settings#4279/4291` |
| 0xAD | 2 | `allLedOffTime` | units of 10 s: 1,3,6,30,60,90,120,150,180,210,240 = 10 s … 40 min | 6 | N; M:22242, M:14669; X:`customComboBox_PowerSaveTime`; C:`advanced-settings#4983…` (§6.9) |
| 0xAF | 2 | `linearCorrectionEnable` (Angle snapping) | 0/1 | 0 | N; M:26174 (`customCheckBox_FixLine`); X: label_FixLine = "Angle snapping" |
| 0xB1 | 2 | `rippleControlEnable` | 0/1 | 0 | N; M:26168 |
| 0xB3 | 2 | `moveOffLedEnable` ("Lights off when moving") | 0/1 | 0 | N; M:14640 — on the hidden lighting page |
| 0xB5 | 2 | `sensorCustomSleepTimeEnable` (UI: Peak Performance checkbox) | 0/1 | 0 | N; M:26186 |
| 0xB7 | 2 | `sensorSleepTime` (UI: Peak Performance duration) | 3,6,12,30,60,90 = 30 s,1,2,5,10,15 min | 6 | N; M:26130; X:`customComboBox_FullPerformance` |
| 0xB9 | 2 | `sensorPowerSavingModeEnable` (Mode Select) | 0 = LP, 1 = HP (10 = Corded is a UI sentinel and is never written) | 0 | N; M:26140; X:`customComboBox_ModeSelect` |
| 0xBB | 2 | not parsed (observed `0a 4b`) | — | — | C:`profiles-config#3297` — UNKNOWN, do not write |
| 0x100 + 0x20k | ≤20 | `shortCutKey[k]` (combo / media key) | §5.5 | — | N:ShortcutKeyToBuffer@100078a0, N:BufferToShortcutKey@10007970 |
| 0x300 + 0x180k | ≤383 | `macroKey[k]` (macro bound to button k) | §5.6 | — | N:MacroKeyToBuffer@10007a60, N:BufferToMacroKey@10007b30 |
| total | 0x1B00 | `MAX_FLASH_SIZE = 6912` | | | M:2158 |

---

## 5. Encodings

### 5.1 Report rate
`code < 0x10 → Hz = 1000 / code`; `code ≥ 0x10 → Hz = code / 16 × 2000` (M:25890). The UI rate buttons carry the code in their `Tag` (M:26063). The official option order 125, 250, 500, 1000, 2000, 4000, 8000 therefore maps to `08, 04, 02, 01, 10, 20, 40`. 2K/4K/8K buttons are shown only when `DeviceType` contains 2K/4K/8K and `SensorUI[0] > 4/5/6` (M:25885; X:`Config.ini` `SensorUI=8,…`). **CONFIRMED_STATIC + CAPTURE.**

### 5.2 DPI record (`0x0C + 4i`)
Managed decode for sensor types 3395/3950 (M:29785–29796):
```
value = xDPI | ((DPIex >> 6) << 8)
dpi   = (value + 1) × (DPIex & 0x22 ? 100 : 50)
if (DPIex & 0x11) dpi ×= 2
```
Examples: `1F 1F 00 17` = 1600, `07 07 00 47` = 400, `3F 3F 00 D7` = 3200, `7F 7F 00 57` = 6400, `CC CC 00 BD` = 10250, `4E 4E 00 B9` = 3950. The UI slider range is 50–26000 in 50 steps (X:`Config.ini` `DPIRange=50,26000,50`). The encoder is `DPIControl.ValueToDPI` (managed, sensor-table driven). Writes above 12800 DPI need the DPIex high-bit path. `aria-ii-pro-webhid` only writes values representable in the stage's existing scale. **Stage writes are CONFIRMED_RUNTIME (R: obs. 5 and 7, read back). Values above 12800 DPI are STRONGLY_INFERRED.**

### 5.3 DPI colour (`0x2C + 4i`)
`R G B (0x55 − R − G − B)`. Captures prove i=0 → 0x2C and i=1 → 0x30. Base and stride also match the native parser loop. **CONFIRMED_STATIC + CAPTURE for the address formula.** The `DPIControl.ColorChange` handler writes the colour of the *selected* stage button (M:29891). The selected button is not necessarily the active stage.

### 5.4 Button function (`0x60 + 4k`): `type, p1, p2, 0x55−Σ`
| type | Meaning (managed `KEY_CLASS`, X:`<KeyFunction>`) | p1 / p2 | Evidence |
|---|---|---|---|
| 0x00 | Disabled | 0 / 0 | C:`button-remap#13239` |
| 0x01 | Mouse button | 1 Left, 2 Right, 4 Middle, 8 Back, 0x10 Forward | C: both remap captures |
| 0x02 | DPI switch | 1 Loop, 2 DPI+, 3 DPI− | C:`button-remap#36565` (`02 01 00` = DPI Loop) |
| 0x03 | Scroll left/right | 1 / 2 | X only |
| 0x04 | Fire key | interval ms (10–255) / times (0–3) | C:`button-remap#9337` (`04 0a 03`); X: FireKey dialogs |
| 0x05 | Combo key or media key — the key events live in `shortCutKey[k]` (§5.5) | 0 / 0 | C:`button remap#6049+6053` with Mute |
| 0x06 | Macro | p1 = macro slot = button index k; p2 = cycle mode (§5.6) | M:27904–27914; C: macro captures |
| 0x07 | Polling-rate switch | 0 / 0 | C:`button-remap#4451` |
| 0x08 | Light switch | 0/3/4 | X; irrelevant without lights |
| 0x0A | DPI lock | p1 = code (1=100, 3=200 … 0x17=1200) | X only |
| 0x0B | Scroll up/down | 1 / 2 | X only |

UI numbering versus slot k, from `Config.ini` `KeyParamN`, managed `DeleteMacro` 3↔4 swap (M:27932) and both remap captures: **UI 1 Left → k0 (0x60), UI 2 Right → k1 (0x64), UI 3 Middle → k2 (0x68), UI 4 Forward → k4 (0x70), UI 5 Back → k3 (0x6C), UI 6 DPI Loop → k5 (0x74)**. Factory content observed: `01 01`, `01 02`, `01 04`, `01 08`, `01 10`, `02 01` (C:`profiles-config#3253…3263`). The UI never offers remapping Left without keeping another Left (X: `ReserveLeftKey` "Must keep Left key"). **CONFIRMED.**

The earlier claim "DPI Loop = `05 00 00`" is wrong. Type 05 is a combo/media key. `05 00 00` together with the shortcut block `02 82 e2 00 42 e2 00 cb` is **Mute**: the device later emitted consumer report `05 e2 00` when the button was pressed (C:`button remap#8223…10911`).

### 5.5 Shortcut block (`0x100 + 0x20k`)
`count, then count × (flags|type, codeLo, codeHi), then chk over [0 .. 3·count]`.
`flags`: 0x80 = key down, 0x40 = key up; low nibble = HID code type (1 keyboard, 2 consumer, …). Valid `count` is 2–6 (N:BufferToShortcutKey). Clearing writes `00 ff` (count 0, chk). Managed `App_AddShortCutKey` emits all presses, then releases in reverse (M:20804). **CONFIRMED_STATIC + CAPTURE (Mute).**

### 5.6 Macro slot (`0x300 + 0x180k`, k = button index)
```
+0x00  nameLength (1..30)          +0x01..0x1E name (unused bytes 0xFF)
+0x1F  contextCount (2..70)
+0x20  contextCount × 5 bytes: [flags|type] [value0] [value1] [delay hi] [delay lo]
+0x20+5n  chk = 0x55 − Σ bytes[0x1F .. 0x1F+5n]
```
`flags` 0x80 = press, 0x40 = release, 0x00 = other (mouse-move contexts). Type: 1 = keyboard, 2 = consumer, 4 = mouse button (value0 = MouseKey bit), 5 = move XY. Delay is big-endian milliseconds after that event (managed caps at 65535, UI minimum 10). Written in 10-byte `0x07` chunks starting at the slot base (C:`macro autoclick#30681…30705`: "cycle releas", 6 contexts `84 01 00 00 0a / 44 01 00 00 0a`, chk `b5`, verified). Cycle mode lives in the **button** record `06 k p2`: `p2` = 1–250 repeat count, `0xFE` until key released, `0xFF` until key pressed, `0xFD` until this key pressed (M:15574–15593, M:15006–15031; C:`macro autoclick#30677` FE, `cycle#6203` FF, `#11197` FD). There is no field for a separate "terminating key". The macro **library** (the list on the left of the Macro Manager) is a host-side file (`MacroFile.SaveLocalMacroKey`, M:15609). The mouse only stores macros that are bound to a button. **Format CONFIRMED_STATIC + CAPTURE. On-device playback CONFIRMED_RUNTIME for the autoclick macro:** the device emitted 307 report-ID `0x0B` press/release pairs every 10 ms on interface 1 with no host traffic (C:`macro autoclick#31559…32921`).

### 5.7 Receiver LED colours
`DongleRGB` has three colour triplets after the mode byte, but the official UI always sends zeros (M:21901). The colour behaviour of each mode is implemented in receiver firmware. The host never computes battery bands.

---

## 6. Feature call chains

Format: **UI control → managed handler → model field / wrapper → native → frame → reply handling → UI update.**

### 6.1 Profiles 1–4
`customComboBox_Config` → `customComboBox_Config_OnSelectedIndexChanged` (M:14805) → `UsbServer.SetCurrentConfig(value)` (M:3940) → `CS_UsbServer_SetCurrentConfig` → `UsbServer_SetCurrentConfig@1000d4b0` → `0F 00 00 00 01 <p>` → echo + `0A 04` → managed re-reads all flash (`ReadFlashData` 6912 bytes, M:13317), `ReadConfig` → `0E` reply sets the combo (M:13218). Profile count: 4 when `0x0E` returns data, else 1 (M:13258). **Selecting** a profile is the only profile command. There is no separate "save profile". Every later write goes to the selected profile's flash. CONFIRMED_CAPTURE (select 1→2→0 and readback 01, 02, 00).

### 6.2 Button mapping
`CustomKeyFunction` sub-menus (M:28181, M:28282) → `gFlashDataMap.keys[k]` (+ `shortCutKey[k]` for type 5, `macroKey[k]` for type 6) → `UpdateValue` → `FormMain.UpdataUSBData` → `DataParser.Update` (M:2282) → `CS_ProtocolDataUpdate@10006d00` → diff `FUN_10006d40` → `0x07` writes to `0x60+4k` (+ `0x100+0x20k` / `0x300+0x180k`) → echo. CONFIRMED.

### 6.3 Debounce
`KeyDebounce` list (M:30575) built from `<DebounceTime>` 0–20 ms (X). Clicking an entry → `keyDebounce1_ButtonSelect` (M:28378) → `keyDebounceTime = ms` → write `0xA9`. Values below 8 ms show the double-click warning (`DebounceTips`, M:30799). **The checkbox is a UI-only expand/collapse gate.** When checked, the full list is shown and scrollable. When unchecked, only the selected value is shown and nothing can be picked. Selecting a value unchecks it again (M:30805, M:30867). No enable flag exists in `MouseConfig` or flash. CONFIRMED_STATIC + CAPTURE (`debounce` captures: 5, 15, 20 and 1, 2, 3, 4).

### 6.4 DPI stages, active stage, DPI Loop
* Stage count: `customComboBox_DPIGrade` (items 1..4, X:`DPIMaxGrade=4`) → `maxDPI = n` (M:29902). If the active stage is beyond the new count, the app **swaps** the active stage's DPI value and colour into slot `n−1` and makes it active (M:29909–29939). That produces DPI/colour record writes as well as `0x02`/`0x04` writes.
* Active stage: clicking a stage button (M:29863) → `currentDPI = i` → write `0x04`. Pressing a DPI-Loop-mapped button changes the active stage **on the device** and the device sends `0A 01` (bit0 = DPI changed). The app then reads `0x04` (M:13381, M:13469). `wireshark.pcapng` contains four unsolicited `0A 01` frames with no host request (#9913–#9919). That is consistent with DPI-button presses, but the capture has no note saying so.
* Per-stage DPI value: slider → `ValueToDPI` → `dpiConfig[SelectIndex]` → write `0x0C+4i`.
* Per-stage colour: colour picker → write `0x2C+4i` (§5.3).
* DPI Loop is cycled by firmware through stages `0..maxDPI−1`. Host code cannot prove the 4th stage is skipped when `maxDPI=3`, but the parser rejects `currentDPI ≥ maxDPI` (N:MouseConfigParser), which is consistent.

### 6.5 Report rate, Mode Select, LOD, Peak Performance, sensor toggles (`_3In1`, M:24981–26196)
* Rate: §5.1. After a rate click, `UpdateModeSelect(rate ≥ 0x10 || USBConnect)` (M:26066). If true, the Mode combo gets a "Corded" item and is **disabled**, and nothing is written to `0xB9`. Otherwise the combo shows LP/HP from the stored `0xB9` value (M:25785–25822). C:`mode-lp-hp#3261` shows only `0x00` written on the 2000 Hz change.
* Mode Select: writes `0xB9` only when the value ≠ 10 (M:26143).
* LOD: options come from XML `0.7mm=3, 1mm=1, 2mm=2`. **If the configured sensor string is not "3950", the first item (0.7 mm) is removed** (M:25823, M:25908, M:26038). This device's `Config.ini` says `3395`, so the official UI offers only **1 mm and 2 mm**. LOD is enabled only if `SUPPORT_LOD_CAL` lists the sensor (X:`driver_sensor.h`: 3395 is listed).
* Peak Performance (`FullPerformance` controls): checkbox → `sensorCustomSleepTimeEnable` (0xB5). The duration combo is enabled only while the box is checked (M:26193) → `sensorSleepTime` (0xB7). The official tooltip says "The sensor LED is highlighted and sensor is in maximum performance mode" (X:`FullPerformanceDes`). The firmware field names (`sensorCustomSleepTime*`) suggest the duration is how long the sensor stays at full performance before its own low-power sleep. That reading is STRONGLY_INFERRED and is not a confirmed behaviour.
* Ripple → 0xB1, Angle snapping (`FixLine`) → 0xAF, Motion sync → 0xAB. Each is independent (M:26168–26184). Visibility is gated by `driver_sensor.h` (all three listed for 3395).

### 6.6 DPI Light Effects (`_3In1`)
* Effect combo (M:26083): index 0 → write **only** `enable(0x52)=0`, and the mode is kept. Index 1/2 → `enable=1` and `mode(0x4C)=index`. In one `DataParser.Update` the native diff emits one frame per changed field.
* Brightness slider: committed only when `enable && mode==1` (Fixed). Speed slider: only when `enable && mode==2` (Flicker) (M:26108–26127). `ValueConvert.SetDPIEffect` enables brightness only for Fixed and speed only for Flicker (M:20591).
* There is no "Breathing" option in this app version. Only Off / Fixed light / Flicker exist (X).

### 6.7 Battery
Initial read (`ReadBatteryLevel` after the flash dump, M:13328), then every 5 s from `GetBatteryTimer` (M:23330), plus on `0A` bit6. The reply goes to the native battery optimiser (enabled with `Config.ini` `BatteryParam`, M:13713) → callback payload `[level', isCharging, mV hi, mV lo]` → `GetDeviceBatteryStatus` → UI shows `level'` and the charging icon (M:13161–13195). Detail in §8.

### 6.8 Receiver LED indicator (Advanced Setting)
`UC_DongleLED` radio `Tag` → `DongleRGB.mode` → `Set4KDongleRGB` (M:21896–21906) → `14 00 00 00 0A <mode> 00…`. **Tag 1 = Connection State and ReportRate, Tag 2 = Battery State, Tag 3 = Only battery warning** (M:22012, M:22031, M:21993; duplicate control at M:27113/27132/27094). The rev2 captures agree, one write each: "connection state" → 01, "battery state" → 02, "only battery warning" → 03. Shown only for wireless DeviceType 1 (4K) or 5 (8K) and `Advanced[1] ≥ 0` (M:13335). Readback `0x15`. After Restore the app writes `Advanced[1] = 2` (Battery State) (M:13203; X:`Advanced=1,2`; C:`profiles-config#15551`). **CONFIRMED.** The earlier mapping (1 = only warning, 2 = connection, 3 = battery) is wrong.

### 6.9 Sleep Mode (Settings page) — the `0xAD` conflict, fully traced
* `Config.ini` has `DisplayLight=0`. Because of that, `FormMain.UIInit` removes the lighting tab (M:13972), and the Settings page inserts `UC_Light` instead (M:28753).
* `UC_Light` contains `label_SleepMode` ("Sleep mode") and `label_MouseSleepTime`, whose English text is **"Time until mouse sleep after not moving"** (X:`MouseSleepTime`; S:`192707.png`, `062548.png`). Its Chinese design-time default is 静止灯光节能时间, roughly "stationary lighting power-saving time" (M:22288).
* Its combo `customComboBox_PowerSaveTime` writes **`mouseConfig.allLedOffTime` → flash 0xAD** (M:22246). It uses the same value list as the lighting-page control labelled **"Time until lights off after not moving"** (X:`label_PowerSaveTime`, M:14669).
* The native flash map has no other idle or sleep timer (N:MouseConfigParser enumerates every `MouseConfig` field). The only other "sleep" fields are `sensorCustomSleepTimeEnable/sensorSleepTime`, which the UI presents as Peak Performance.
* Conclusion: the official Sleep Mode control and the hidden "lights off" control are **the same firmware field**. On this unlit model the vendor relabels it as mouse sleep. Whether the firmware puts the sensor/radio to sleep or only turns lights off on expiry cannot be decided from host code. This is the single remaining unknown (OPEN_QUESTIONS Q1).

### 6.10 Long distance (Advanced Setting)
`UC_LongDistance` checkbox → `SetLongRangeMode(bool)` (M:22358) → `16 00 00 00 0A <0/1>`. In wired mode it can only be turned off. Turning it on shows "Must be in wireless mode to set" and the box reverts (M:22371–22381, M:22384). Readback `0x17` (M:13435). After Restore the app writes `Advanced[0]=1` = **On** (M:13199; C:`profiles-config#15543`). **CONFIRMED_CAPTURE** for write and read. No physical range measurement exists; the UI text is the only behavioural claim.

### 6.11 Main LED ("Lighting Mode") — not shown for this model
The lighting tab is removed when `DisplayLight=0` (M:13972), and none of the screenshots shows a lighting page. Encoding for completeness (static only): `0xA0` = mode 0..6 (OFF, Rainbow Moving, Single color, Rainbow Fixed, Neon, Rainbow Flicker, Colorful Fixed), R, G, B, speed, brightness, chk. `0xA7` = enable (mode 0 ⇒ enable 0). Control availability per mode from `ValueConvert.SetLEDMode` (M:20614):

| mode | colour | brightness | speed |
|---|---|---|---|
| 0 OFF | – | – | – |
| 1 Rainbow Moving | – | ✓ | ✓ |
| 2 Single color | ✓ | ✓ | ✓ |
| 3 Rainbow Fixed | ✓ | ✓ | – |
| 4 Neon | – | ✓ | ✓ |
| 5 Rainbow Flicker | – | ✓ | ✓ |
| 6 Colorful Fixed | – | ✓ | – |

Never captured.

### 6.12 Restore / Import / Export
* **Restore** = `0x09` ClearSetting (M:14678) after a confirm dialog. It then re-enables battery optimisation, writes Long distance = 1 and receiver LED = 2 (`Advanced=1,2`), re-reads flash, and clears host shortcut/macro data (M:13197–13213, M:13339–13351). Whether it resets only the current profile or all profiles is UNKNOWN (gap G3; owner decision D5 blocks release of Restore until this is known).
* **Export** writes a 64-byte header (`"Compx Inc"` at 0, sensor `"3395"` at 32) plus the 10,428-byte managed `FlashDataMap` (M:14781; `P:observation-2-export-bin.md`; B: three files verified).
* **Import** requires an online device, checks the header, refuses files whose `maxDPI` exceeds `DPIMaxGrade`, clamps an unsupported high report rate, clears shortcut/macro slots, then pushes the whole map through the normal diff writer (M:14693–14768).

### 6.13 Pairing — "Pair(Space)"
Settings → `UC_Pair.customButton_Pairing_Click` (M:22477) → firmware-update check → `FormPair` (M:22530). In `FormPair`, Space or the button calls `DongleEnterPairing` (M:17865): it starts a server on the receiver's path, sends `05 … <cid>` (EnterDonglePairOnlyCid), then polls `0x06` until 2 (fail) or 3 (success) (M:17917). The user prepares the mouse by pressing Left+Right+Middle together (X:`PairTips`). This is a real receiver-pairing operation, not a host key event.
* CID = 13: `Config.ini CID` decodes to `"Fantech Aria II Pro13"`, and the app removes the drive name before parsing (M:23810).
* Polling: every 1000 ms, with no overall timeout. The official app fails only on status 2 or when the receiver disappears (M:17885).
* Wireless only (M:17833).
* Never captured; owner decision D6 includes it behind confirmation, and a live check is gap G4.

### 6.14 Windows-only Settings items
"Run On System Boot" writes the Windows Run registry key (M:22650). "Windows Mouse Properties" launches `main.cpl` (M:22640). Neither touches the device → NOT_APPLICABLE for WebHID. "Drive ver" shows `Config.ini Version=1.0.0.43` (S:`192707.png`). Mouse firmware version comes from `0x12`.

### 6.15 Calibration
`FormCalibration` (M:9560) sends **no** device command. "Start" waits 3 s and reports Pass (M:9643, M:9606). It is launched only from `FormAdvancedSetting`, which nothing instantiates. NOT_APPLICABLE / cosmetic.

---

## 7. Runtime evidence carried forward (R, P)

* Browser output report `0x08` with a 16-byte body is accepted. A read of `0x4C`/8 returned a matching reply in 2–3 ms (obs. 3 and 4).
* DPI writes persisted: stage index 2 (`0x14`) 1600 → 400 read back twice (obs. 5); stage index 1 (`0x10`) `07 07 00 47` written twice, read back both times (obs. 7). The earlier report calls this "stage 2" in one place and "Stage 3" in another; the address identifies the slot unambiguously.
* Ten single-byte writes produced echoes in obs. 6 (`0x00, 0x02, 0x04, 0x0A, 0xB1, 0xAF, 0xAB, 0x4C×2, 0xAD`). They were not read back.
* `productName` reported by Chrome: "Fantech StrikeSpeed Pro" (obs. 1/6). Device identity must be matched on VID/PID, not the name.
* The underlying JSON files are absent from this workspace, so these remain P-grade until they are copied in (WORKSPACE_AUDIT §6).

---

## 8. Battery — exact path

1. Request `08 04 00 00 00 00 …` (`N:CS_UsbServer_ReadBatteryLevel`). In WebHID: `sendReport(0x08, [0x04,0,0,0,0, 0×10, chk])`.
2. Reply input report `0x08`: body `04 00 00 00 02 L C VH VL …`. Raw `L` is a coarse firmware level. Captures show only 100, 90 and 85 (`docs/evidence/CAPTURE_TRANSCRIPTS.txt`). `C` = charging flag. `VH:VL` = millivolts, big-endian (`N:CS_GetDeviceBatteryStatus`).
3. The official driver passes the reply through its native battery optimiser (`N:FUN_10005ab0`, parameters from `BatteryParam`). That optimiser synthesises a new 4-byte callback payload with a smoothed level. The log payloads `58 00 0F D7`, `57 00 0F D3`, `56 00 0F CE`, `55 00 0F CA` (P) are exactly `BatVoltageToLevel(4055/4051/4046/4042) = 88/87/86/85`, using the 21-point table `3050 … 4110` and the 5-percent-per-segment interpolation in M:23490–23528. Example: 4055 mV lies in [4040, 4060), so (4055 − 4040) / 4 + 17 × 5 = 88. The same voltage in the raw reply carried level 90. **The displayed percentage is voltage-derived and smoothed; the raw byte is coarser.**
4. Smoothing used by the managed `BatteryHandle`: display moves 1 % per Level1 tick toward the measured value, only downward while discharging. At ≤15 % it clamps to 15 once, and it shows 100 only after 8 consecutive full readings while charging (M:23345–23488). The exact native optimiser timing is not decompiled in detail. Values `10000` and `300000` ms are passed in (M:13713).
5. `0x03` online flag: when the mouse is off or asleep the receiver still answers. Whether the flag drops to 0 is UNKNOWN; every capture shows `01`.

Status: **request/response CONFIRMED_STATIC + CAPTURE; percentage formula CONFIRMED_STATIC; not yet exercised from WebHID.**

---

## 9. Contradictions with earlier reports (resolved)

| Earlier claim (source) | Finding | Settled by |
|---|---|---|
| `0x16` = active DPI stage select, `0x14` = DPI stage count (`docs/protocol-analysis.md`, `AUDIT-REPORT.md`, `HANDOFF_REPORT.md`, root `index.html`) | `0x16` = Long-distance on/off, `0x14` = receiver LED mode. Stage count and active stage are flash `0x02`/`0x04`. | N:UsbServer_SetLongRangeMode / Set4KDongleRGB; M:21896, M:22358; C: values only 0/1 for 0x16 and 1–3 for 0x14 |
| Polling map `0x01=125 … 0x08=1000` (root docs and root `index.html` `POLL_MAP`) | Inverted: `0x01=1000`, `0x08=125` | M:2358 enum, M:25890; C:`all-settings` order |
| "Registers `0xA902`, `0xB502` …" | Address `0xA9`, `0xB5` … with length byte 2. The trailing `02` is the length. | N:FUN_10006b00 |
| `0x4C02/0x4E02/0x5002/0x5202` = per-profile polling | DPI LED mode / brightness / speed / enable | N:ProtocolDataParser; M:26083–26127 |
| `0x04` reply bytes `02 64` are a "static signature"; battery = byte 9 | `02` = length, `64` = level 100, `00` = not charging, `10 3F` = 4159 mV. Byte 9 is the voltage low byte. | N:CS_GetDeviceBatteryStatus; C |
| `0x03` = sensor/firmware identity `01 E6 D3 F3` | DeviceOnLine; only data[0] is used | N:CS_isDeviceOnLine |
| Firmware "v2.25" | `02 19` is displayed as v2.19 (hex formatting) | M:20538 |
| DPI Loop = `05 00 00` | DPI Loop = `02 01 00`; `05` = combo/media key | §5.4 |
| `04 0A 03` = macro | Fire key, interval 10 ms, 3 times | M:2637; X |
| `07 00 00` = special/multimedia | Polling-rate switch | X:`<KeyFunction>` |
| Peak durations 3 and 90 "minutes" (root UI offers 3/5/10/15/30/60/90 min) | Codes 3,6,12,30,60,90 = 30 s … 15 min; 5 and 10 are not legal | X; S:`062505.png` |
| `0xAD` = sleep timeout in seconds or LOD | `allLedOffTime` in 10-second units; LOD is `0x0A` | N; X |
| Sensor toggles `0xB1` Motion Sync, `0xAF` Ripple, `0xAB` Angle (root) | `0xAB` Motion Sync, `0xAF` Angle snapping, `0xB1` Ripple | N + M handler names |
| Receiver LED 1 = only warning, 2 = connection, 3 = battery (`aria/README-NEXT-AGENT.md`, `aria-ii-pro-webhid`) | 1 = connection/report rate, 2 = battery state, 3 = only battery warning | M Tags; rev2 captures |
| `0x14`/`0x16` frame `body[3]=0x0A, body[4]=value` (`aria-ii-pro-webhid/app.js`) | `body[4]=0x0A` (len), `body[5]=value` | N; C |
| Profiles 1–3 (root UI) | 4 profiles (0..3) | X:`customComboBox_Config`; S:`192641.png` |
| LOD options 0.7 / 1 / 2 mm | 0.7 mm hidden for sensor "3395" (this device's config) | M:25823 |
| "Calibration" as a device feature | Cosmetic, no command | M:9643 |
| Battery level can be read straight from the 4-byte log payloads | Those payloads are post-optimiser callback data; the wire reply is the 17-byte frame in §8 | N:FUN_10005ab0 |

---

## 10. Items still not established

1. Physical meaning of `0xAD` expiry (§6.9). Owner decision D1: implement as Sleep Mode with the official values; the effect is still to be verified on hardware (G1).
2. Stop conditions of macro cycle modes `0xFF`/`0xFD`. The owner semantics are recorded as D3; runtime verification is gap G2.
3. Whether `0x09` Restore resets one profile or all four (G3).
4. Wired-mode (`F5A5`) behaviour of this protocol; no wired capture exists.
5. Encoder correctness for DPI values above 12800 (DPIex high bits) on this sensor.
6. Unparsed flash regions `0x54–0x5F` and `0xBB`.
7. `0x03` online flag behaviour while the mouse sleeps or is off.
8. Live pairing exchange (G4).

---

## 11. Captures of 2026-10-24 (owner-supplied, Windows USBPcap, official app 1.0.0.43)

Decoded with `tools/usbpcap_decode.py`; full transcripts and SHA-256 of every file in `evidence/CAPTURE_TRANSCRIPTS_2026-10-24.txt`. OUT = host→device SET_REPORT on interface 1; IN82 = device→host on interrupt EP 0x82. All frames checksum-valid. Byte-level fixtures: `tests/captures.test.cjs` (44 checks; every app-built frame equals the official one).

| File | What it proves | What it does not prove |
|---|---|---|
| `restore.pcapng` | Same Restore sequence as `profiles-config`: `09` (echo after 0.60 s) → `16 … 0A 01` → `14 … 0A 02` → full re-read → `12`,`0E`,`17`,`15` → clearing writes `00 ff` at 0x160/0x180/0x1A0 and the 33-byte macro clear at 0x900/0xA80. **New:** before Restore `0E` = 01 (profile 2) and its stage-3 record read `24 24 44 c9` (14650 DPI); after Restore `0E` = **00** (ClearSetting makes profile 1 active) and profile 2, re-selected with `0F 01`, read `1f 1f 00 17` (factory 1600) — the previously active profile's settings were reset. Profile 1 after Restore had factory settings but **still held shortcut/macro slot data** until the host cleared it, so ClearSetting does not erase slot data. | Whether profiles 3 and 4 are reset (never read); profile 1's settings before the reset (never read). G3 is narrowed, not closed. |
| `wired.pcapng` | Cable PID **0xF5A5** (device descriptor), same interface layout (if1 vendor, EP 0x82, 49-byte max packet), same SET_REPORT/echo/read protocol and checksum. `0x01` reply DeviceType = **03** (receiver: 05); CID 0x0D, MID 08 in both. The official app sends no `14/15/16/17/05/06` when wired. Battery reply carries **charging = 1** and rising mV over the cable (`5f 01 10 48` … `10 5d`). Flash read back stages 12800/16550/22550 and `0xAD` = 01. | Behaviour of this web app over the cable (not run). |
| `sleepmode-ledidle.pcapng` | **No configuration write** — no `0xAD` transaction. Only `03`/`04` polls: `03` online = 1 at 1.8 s and 6.9 s, **0 at 11.9/17.0/22.0 s** while no mouse reports arrived (last movement 0.41 s), `04` left unanswered (3 tries each) in that window, answered again at 26.5 s when movement resumed; online = 1 at 27.0 s. | The register value during this capture (no read); any LED behaviour (not visible on USB). Link to `0xAD` is inference only: `wired.pcapng` one minute later read `0xAD` = 1 (10 s) on profile 1, and the offline threshold here lies between 6.5 s and 11.5 s of idle. |
| `Cycle Until Key Pressed macro.pcapng` | Write order key record `0x70 = 06 04 ff 4c` then macro chunks at 0x900 (10/10/10/10/10/3 bytes). Macro "ctrlc": `80 01 00 01 78` (modifier type 0, bitmask 1 = LCtrl, press, 376 ms), `81 06 00 00 76` (keyboard type 1, usage 0x06 'C', 118 ms), `41 06 00 00 34`, `40 01 00 00 00` (**last delay 0 ms**), chk `9e`. Playback appears on the keyboard boot interface EP 0x81 (Ctrl+C reports). | Stop rule: playback stopped 1 ms after a Left-button report on EP 0x83; the bound button itself (Forward) emits nothing on USB, so the trigger of the stop is not provable. |
| `Cycle Until This Key Pressed macro.pcapng` | Same layout, macro "ctrl", delays 318/117/37/0 ms, chk `e8`, binding `06 04 fd 4e`; later `0x70 = 01 10 00 44` restores Forward. Playback ran ~6.5 s (≈14 cycles); a Left click at 45.0 s did **not** stop it; it stopped at 47.36 s with no other button report. Unsolicited `0A 40` (battery bit) seen. | Which input stopped it (consistent with the bound button). |
| `dpi12800.pcapng` | DPI writes `0x10 = ff ff 00 57` (12800), `0x14 = 4a 4a 44 7d` (16550), `0x18 = c2 c2 44 8d` (22550): DPIex = `(hi<<2)|(hi<<6)`, `x = (dpi/50−1) & 0xFF`, chk = 0x55−Σ3 — exactly `encodeDpi`. Echo only in this file; the values are read back in `wired.pcapng`, and `restore.pcapng` read a stored 14650 (`24 24 44 c9`). | Physical sensor resolution above 12800. |
| `pairing.pcapng` | Start frame `08 05 00 00 00 02 00 00 0D 00…00 39` (CID 13 at frame offset 8) with a byte-identical echo; 1.0 s later `06` poll → reply `len 02, data 03 13` = **success** on the first poll (data[0]=3; second byte 0x13 not parsed by the official app). Link was offline (`03` = 0) from the moment the user started pairing on the mouse and online again 2.5 s after success. | Failure path (status 2) and the meaning of the extra byte. |

**Status changes:** G5 (DPI > 12800 encoding) → CONFIRMED_CAPTURE + readback; G7 (wired protocol) → CONFIRMED_CAPTURE; G4 (pairing request/success response) → CONFIRMED_CAPTURE, failure path still unobserved; G3 → partially answered (active profile reset, profile 1 becomes active, slots survive); G2 → observations above, rule not proven; G1 → no `0xAD` transaction captured, offline-after-idle observed. Also confirmed: `0x01 EncryptionData` request `01 00 00 00 08 <4 bytes>` → reply `<4 bytes> CID MID DeviceType`, and `0x02 PCDriverStatus 01` sent at start by the official app (the web app sends neither; nothing observed depends on them).

### 11.1 Later the same day: `restore-profile3-4.pcapng`, `sleepmode-write-30s.pcapng`

| File | What it proves | What it does not prove |
|---|---|---|
| `restore-profile3-4.pcapng` | Before Restore the official app selected and fully read profiles 2, 3, 4 (`0F 01/02/03`, `0E` confirms): stage DPIs read back as 400/6700/12150/3200, 400/4450/10400/2200 and 1450/4450/8050/13650 (profile 4 holds a stored 13650). ClearSetting `09` was sent with profile 4 active (echo after 0.60 s), then `16 … 01`, `14 … 02`, re-read with `0E` = 00. Afterwards profiles 1, 2, 3, 4 and 1 again were selected and read: **all five reads of 0x00–0xBF are byte-identical** (factory: 1000 Hz, 4 stages, active stage 2, 400/800/1600/3200, red/blue/green/magenta). No slot-clearing writes followed (no occupied slots). **G3 closed: ClearSetting resets all four profiles' settings and makes profile 1 active.** Combined with `restore.pcapng`: shortcut/macro slot data is not erased by `09`; the official app clears it afterwards. | Profile 1's pre-reset values (not read in this file). |
| `sleepmode-write-30s.pcapng` | Flash read before the change: `0xAD` = 06 (1 min). Official write `07 00 AD 02 03 52` (value 3 = 30 s, chk ok) with byte-identical echo. The owner also switched DPI lighting on (`4C = 01 54` Fixed, `52 = 01 54` enable). After the last mouse report (20.3 s) the receiver still reported online at 30.3 s (≈10 s idle) and **offline from 35.3 s (≈15 s idle)** until movement at 63.5 s. Since the stored value was 30 s, the link going offline after 10–15 s idle is **not controlled by `0xAD`**; it is separate firmware power behaviour. | Readback of `0xAD` after the write (no later read in the file); LED timing (not visible on USB). |

**Sleep Mode (owner decision, final):** `0xAD` = lighting idle-off after inactivity. Owner observed lighting and receiver LED turn off after ≈10 s at the 10-second setting and come back on movement. Protocol for the 30-second value captured (write + echo). Durations other than 10 s (observed) and 30 s (write captured) are untested physically. The receiver-reported "offline while idle" state is independent of this setting.

**Owner confirmations (2026-10-24):** high DPI above 12800 works in use; this WebHID app works over the cable (PID F5A5).

