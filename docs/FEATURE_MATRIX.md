# Aria II Pro — Feature Matrix (one row per control)

Audit date: 2026-10-23; updated with owner decisions D1–D6 (see `OPEN_QUESTIONS.md`). Every wire detail cited here is specified, with its evidence, in `EVIDENCE_LEDGER.md` (§ numbers below refer to it). Frames are written as bytes 1..15 of the 17-byte report (report ID `0x08` and checksum omitted). `W(a)=v` means a WriteFlashData `07 00 00 a 02 v (55−v)`. `R(a,n)` means a ReadFlashData `08 00 00 a n`.

## Status labels

**Protocol status** is how well the device protocol is known:
* `CONFIRMED_STATIC`: proven by managed/native code or official resources.
* `CONFIRMED_RUNTIME`: additionally seen working on the real device. That means a device reply carrying the value back (readback or getter), a device-originated effect report, or a WebHID readback. An echo of a write alone does **not** qualify.
* `STRONGLY_INFERRED`, `UNKNOWN`, `NOT_APPLICABLE`: as named.

**Impl** is the state of the two existing front-ends: **root** = `index.html`, **aria** = `aria/aria-ii-pro-webhid`. Each is `NOT_IMPLEMENTED`, `PARTIALLY_IMPLEMENTED`, or `WRONG` (sends a frame that does something else). "Implemented" is never claimed without a matching readback.

Evidence types used: **M** managed C#, **N** native DLL, **X** installer resources, **C** capture, **B** export, **S** screenshot, **R** reported WebHID observation (JSON missing).

> **Status 2026-10-24:** the root app now implements these rows per `OPEN_QUESTIONS.md` Part 4. The "Impl (root / aria)" column below describes the state *before* that work. Nothing here is physically verified unless the row says CONFIRMED_RUNTIME.

---

## A. Profiles, buttons, debounce

| # | Control | Official behaviour | Protocol | Impl (root / aria) | Wire · evidence | Readback / physical | Remaining gap → smallest safe test | Owner input? |
|---|---|---|---|---|---|---|---|---|
| A1 | Profile 1–4 select | Switches the device to another onboard profile; all later writes go to it | CONFIRMED_RUNTIME | root: 3 profiles, no readback · aria: 4, send-only | `0F 00 00 00 01 p` → echo + `0A 04`; M:14805, N:@1000d4b0, C:`profiles-config#2971` | `0E` returned 01/02/00 after selecting 1/2/0 (C) | Selecting is the only profile action; there is no "save profile". Test: WebHID `0E` read → `0F` to another profile → `0E` read → `R(0x00,10)`. | No |
| A2 | Active-profile readback | Shown in the combo on connect | CONFIRMED_RUNTIME | not implemented in either | `0E 00 00 00 00` → `0E … 01 p` | C | — | No |
| A3 | Button 1 (Left) | Remappable only if another button keeps Left ("Must keep Left key") | CONFIRMED_STATIC | root: hard-locked · aria: — | slot k0 `0x60`; X:`ReserveLeftKey` | Factory `01 01 00 53` (C) | Keep locked in v1 (safe default). | No |
| A4 | Buttons 2–6 → mouse functions (Left/Right/Middle/Back/Forward) | Assign a mouse button function | CONFIRMED_RUNTIME (format) | root: right addresses, labels from user order · aria: — | `07 00 00 (60+4k) 04 01 b 00 chk`; UI 4 → k4 `0x70`, UI 5 → k3 `0x6C` (§5.4); C: both remap captures | Echo only. Restoring Forward/Back reproduced factory values (C) | Read back the slot with `R(0x60+4k,4)`, then do a physical click test. | No |
| A5 | DPI Loop / DPI+ / DPI− | DPI Loop cycles the configured stages | CONFIRMED_STATIC (+ capture of the official write) | root: **WRONG** (sends `05 00 00`, a media key without its data) · aria: — | `02 01 00 52` / `02 02 00 51` / `02 03 00 50`; C:`button-remap#36565`; X | Factory slot k5 = `02 01` (C) | Test: map UI 4 → DPI Loop, press it, expect `0A 01` and a changed `R(0x04,2)`. | No |
| A6 | Disabled | Button does nothing | CONFIRMED_STATIC | root: `00 00` | `00 00 00 55`; C:`button-remap#13239` | echo | — | No |
| A7 | Fire key | Repeats clicks: interval 10–255 ms, times 0–3 (0 = while held) | CONFIRMED_STATIC | none | `04 interval times chk`; M:2637; X dialogs; C:`04 0a 03` | echo | Physical test. | No |
| A8 | Polling-rate switch key | Cycles report rate | CONFIRMED_STATIC | none | `07 00 00 4e`; C:`button-remap#4451` | echo; device sends `0A` bit1 (M:13473) | — | No |
| A9 | Media key / combo key (Mute, Volume, Play, …; up to 3-key combos) | Sends consumer/keyboard usages | CONFIRMED_RUNTIME | none | key `05 00 00 50` + shortcut block at `0x100+0x20k` (§5.5); X `<SubKeyFunction>` codes; C:`button remap#6049/6053` | Device emitted consumer report `05 e2 00` (Mute) when pressed (C:`button remap#8223…`) | Combo-key encoding is static only. | No |
| A10 | Scroll L/R, Scroll Up/Down, DPI lock | As named | CONFIRMED_STATIC | none | types `03`, `0B`, `0A` (§5.4) | not captured | Physical test per function. | No |
| A11 | Assign macro to button | Binds macro + cycle mode to a button | CONFIRMED_RUNTIME | none | key `06 k cycle chk` + macro slot `0x300+0x180k` (§5.6) | Device played the macro on its own (`0x0B` reports, C) | See section F. | See F |
| A12 | Debounce checkbox | Must be checked to choose a value; unchecked = read-only | CONFIRMED_STATIC — **UI-only gate, not serialized** | root: absent · aria: absent | No device field (M:30575–30883) | n/a | Implement as a UI gate. Selecting a value re-collapses the list (official). | No |
| A13 | Debounce time | 0–20 ms; warning under 8 ms | CONFIRMED_STATIC (+ capture) | root: subset 0–5/10/15/20, no gate · aria: none | `W(0xA9)=ms`; X `<DebounceTime>`; C: 1, 2, 3, 4, 5, 15, 20, 0 | echo only | `R(0xA9,2)` after write. | No |
| A14 | Restore | Factory reset of settings, then re-apply Long distance = On and receiver LED = Battery State | CONFIRMED_STATIC (+ capture) | none | `09 00 00 00 00` (≈600 ms) then `16…01`, `14…02`, full re-read; M:14678, M:13197 | C:`profiles-config#15535` | **Owner decision D5:** official sequence, warning + explicit confirmation, never automatic. Scope (one profile or all) UNKNOWN; **release blocked until gap G3 is resolved.** | Decided |
| A15 | Import | Load a `.bin` profile and push it | CONFIRMED_STATIC | none | 64-byte header + 10,428-byte managed map → diff writes; M:14693 | B: format verified | Needs a JS port of the managed struct layout. | No |
| A16 | Export | Save the current map as `.bin` | CONFIRMED_STATIC | none | M:14781; B | B | — | No |

## B. DPI

| # | Control | Official behaviour | Protocol | Impl (root / aria) | Wire · evidence | Readback / physical | Gap → test | Owner? |
|---|---|---|---|---|---|---|---|---|
| B1 | DPI Stages count (1–4) | Number of stages in the DPI-Loop cycle | CONFIRMED_STATIC (+ capture) | root: **WRONG** (sends `0x14` receiver-LED command with 1–6) · aria: raw `W(0x02)` | `W(0x02)=n`; if active ≥ n the app swaps the active stage's DPI/colour into slot n−1 and writes the records (M:29902–29939); C:`dpi stages#3141/22721/25721/33479` | R: obs. 6 (echo) | `R(0x02,2)` after write. Reproduce the swap semantics. | No |
| B2 | Active stage (click stage button) | Sets the current DPI | CONFIRMED_STATIC (+ capture) | root: **WRONG** (sends `0x16` Long distance) · aria: raw `W(0x04)` | `W(0x04)=i` (0-based, < count); C:`dpi stages#10111…` | R: obs. 6 (echo) | `R(0x04,2)`. | No |
| B3 | Active stage readback / live change from the DPI button | UI follows the hardware button | CONFIRMED_STATIC | none | device → `0A 01`; host `R(0x04,2)` (M:13381, M:13469) | C: `0A 01` frames | Handle `0x0A` input reports. | No |
| B4 | Per-stage DPI value (50–26000, step 50) | Each stage's DPI | CONFIRMED_RUNTIME (≤12800) | root: preview only · aria: read/write + readback | `07 00 00 (0C+4i) 04 x x ex chk` (§5.2) | R: obs. 5, obs. 7 read back | Above 12800 needs DPIex bits (encoder in `ValueToDPI.current.il.txt`). Test: write 13000 to a spare stage, read back, then restore. | No |
| B5 | Per-stage indicator colour | Colour of each stage | CONFIRMED_STATIC (+ capture, two stages) | root: none · aria: writes `0x2C+4i` labelled "inferred" | `07 00 00 (2C+4i) 04 R G B chk`; C: stage 1 → `0x2C`, stage 2 → `0x30`; N parser loop | echo only | `R(0x2C,10)`/`R(0x34,8)` after write; check the LED colour visually. | No |
| B6 | DPI Loop cycling uses only the configured stages | 3 stages ⇒ no 4th | STRONGLY_INFERRED | — | Firmware; the parser enforces `current < count` | — | Physical: set count 3, press DPI Loop 4×, watch `0A 01` + `R(0x04)` values 0,1,2,0. | No |

## C. Polling rate and sensor

| # | Control | Official behaviour | Protocol | Impl (root / aria) | Wire · evidence | Readback / physical | Gap → test | Owner? |
|---|---|---|---|---|---|---|---|---|
| C1 | 125/250/500/1000 Hz | Report rate | CONFIRMED_STATIC (+ capture) | root: **WRONG labels** (`0x01` sent for "125") · aria: correct codes | `W(0x00)` = 08/04/02/01 | R: obs. 6 echo for `0x00=01` | `R(0x00,2)`; host-side rate measurement is optional. | No |
| C2 | 2000/4000/8000 Hz | Report rate (8K dongle) | CONFIRMED_STATIC (+ capture) | root: wrong labels · aria: correct | `W(0x00)` = 10/20/40; shown when DeviceType is 2K/4K/8K | echo | — | No |
| C3 | Mode Select LP/HP | Sensor power mode at ≤1000 Hz | CONFIRMED_STATIC (+ capture) | root: `W(0xB9)` · aria: disables at ≥2000 ✓ | `W(0xB9)` 0 = LP, 1 = HP; C:`mode-lp-hp#1863/2119` | echo only (C) | `R(0xB9,2)`. | No |
| C4 | Mode Select → Corded at 2000–8000 Hz | Combo shows "Corded" and is disabled; nothing is written | CONFIRMED_STATIC (+ capture) | root: UI-only ✓ · aria: disables ✓ | M:25785, M:26143; C:`mode-lp-hp#3261` | — | The same lock applies in wired mode (`USBConnect`). | No |
| C5 | LOD | 1 mm / 2 mm (0.7 mm only if the configured sensor were "3950") | CONFIRMED_STATIC (+ capture) | root: none (its `0xAD` "Sleep/LOD" is wrong) · aria: offers 0.7/1/2 | `W(0x0A)` 1 = 1 mm, 2 = 2 mm (3 = 0.7 mm is not offered); M:25823 | R: obs. 6 echo `0x0A=02` | **Owner decision D2:** 1 mm and 2 mm only. | Decided |
| C6 | Peak Performance checkbox | Enables Peak; enables the duration combo | CONFIRMED_STATIC (+ capture) | root: `W(0xB5)` · aria: raw | `W(0xB5)` 0/1 (`sensorCustomSleepTimeEnable`) | echo | Sensor behaviour beyond the official tooltip is unproven. | No |
| C7 | Peak duration | 30 s, 1, 2, 5, 10, 15 min | CONFIRMED_STATIC (+ capture) | root: **WRONG values** (3/5/10/15/30/60/90 "min") · aria: correct | `W(0xB7)` 3/6/12/30/60/90 | echo | `R(0xB7,2)`. | No |
| C8 | Ripple control | Independent toggle | CONFIRMED_STATIC (+ capture) | root: mislabelled (`0xAF`) · aria: correct `0xB1` | `W(0xB1)` | R: obs. 6 echo | — | No |
| C9 | Angle snapping | Independent toggle | CONFIRMED_STATIC (+ capture) | root: mislabelled (`0xAB`) · aria: correct `0xAF` | `W(0xAF)` | R: obs. 6 echo | — | No |
| C10 | Motion sync | Independent toggle | CONFIRMED_STATIC (+ capture) | root: mislabelled (`0xB1`) · aria: correct `0xAB` | `W(0xAB)` | R: obs. 6 echo | — | No |

## D. DPI Light Effects

| # | Control | Official behaviour | Protocol | Impl (root / aria) | Wire · evidence | Readback / physical | Gap → test | Owner? |
|---|---|---|---|---|---|---|---|---|
| D1 | Effect = Off | DPI LED off | CONFIRMED_STATIC | aria: writes mode 0 to `0x4C` ✗ (official writes enable = 0 only) | `W(0x52)=0`, mode kept; M:26089 | echo | — | No |
| D2 | Effect = Fixed light | Steady; brightness enabled | CONFIRMED_STATIC (+ capture) | aria: separate raw writes | `W(0x52)=1` + `W(0x4C)=1` | C, R: obs. 6 echo | `R(0x4C,8)`. | No |
| D3 | Effect = Flicker | Blinking; speed enabled | CONFIRMED_STATIC (+ capture) | aria: raw | `W(0x52)=1` + `W(0x4C)=2` | C | Same. | No |
| D4 | Brightness 1–10 | Fixed light only | CONFIRMED_STATIC (+ capture) | aria: table ✓ | `W(0x4E)` = 16,30,60,90,128,150,180,210,230,255 | C:`0x10` = UI 1 | Write only when enable && mode = 1 (official). | No |
| D5 | Speed 1–5 | Flicker only | CONFIRMED_STATIC (+ capture) | aria: raw | `W(0x50)` = 1..5 | C: 5, 1 | Write only when enable && mode = 2. | No |
| D6 | "Breathing" | — | NOT_APPLICABLE | — | Not offered by this app version (X lists Off/Fixed/Flicker) | — | — | No |

## E. Main mouse LED ("Lighting Mode")

| # | Control | Official behaviour | Protocol | Impl | Wire · evidence | Readback | Gap → test | Owner? |
|---|---|---|---|---|---|---|---|---|
| E1 | Lighting mode (OFF, Rainbow Moving, Single color, Rainbow Fixed, Neon, Rainbow Flicker, Colorful Fixed) | **Tab hidden for this model** (`DisplayLight=0`) | NOT_APPLICABLE (format CONFIRMED_STATIC, never captured; D4) | none | `0xA0` 7-byte record + `W(0xA7)` enable (§6.11) | — | **Owner decision D4:** not implemented for this hardware/UI configuration. | Decided |
| E2 | Colour / brightness / speed per mode | Per the `SetLEDMode` table | NOT_APPLICABLE | none | §6.11 table | — | as E1 (D4) | Decided |
| E3 | Lights off when moving | Hidden lighting-page checkbox | NOT_APPLICABLE | none | `W(0xB3)` | — | as E1 (D4) | Decided |

## F. Macro Manager

| # | Control | Official behaviour | Protocol | Impl | Wire · evidence | Readback / physical | Gap → test | Owner? |
|---|---|---|---|---|---|---|---|---|
| F1 | Macros List / New / Delete / Rename / Import / Export | Host-side library file; macros reach the mouse only when bound to a button | CONFIRMED_STATIC | none | `MacroFile.SaveLocalMacroKey` (M:15609) | — | WebHID needs its own library store (planned: browser storage + JSON import/export). | No |
| F2 | Start Recording / Keys List | Captures key down/up with delays (keyboard hook; media keys ignored); max 70 events | CONFIRMED_STATIC | none | M:14826–14906, M:2699 | — | Browser recording uses `keydown`/`keyup`; OS-reserved keys cannot be captured. | No |
| F3 | Automatic Insertion Delay / Default Time Delay | Real elapsed time, or a fixed delay ≥ 10 ms | CONFIRMED_STATIC | none | M:14840–14842 | — | — | No |
| F4 | Insert Action (Key Press, Key Release, Delay, Left/Right/Middle/Forward/Back key, Move XY) | Edits the event list | CONFIRMED_STATIC | none | X `customComboBox_InsertEvent`; M:2754, M:2797 | — | — | No |
| F5 | Modify / Delete / Save | Save updates the library and any bound button | CONFIRMED_STATIC | none | M:15566–15609, M:27904 | — | — | No |
| F6 | Upload/serialisation to the device | Slot `0x300+0x180k`, 10-byte chunks | CONFIRMED_RUNTIME | none | §5.6; C: two macros, checksums verified | The device played the autoclick macro by itself (`0x0B` reports, C) | Readback of the slot after upload. | No |
| F7 | Cycle Until Key Released | Repeat while held | CONFIRMED_RUNTIME | none | key p2 = `0xFE`; C:`macro autoclick#30677` | 614 press/release reports while held (C) | — | No |
| F8 | Cycle Until Key Pressed | Owner spec: toggle (start on press, stop on next press) | CONFIRMED_STATIC encoding; behaviour UNKNOWN | none | p2 = `0xFF`; C:`cycle#6203` | No playback captured | **Owner spec D3:** toggle on the same trigger. The stop condition requires runtime verification (gap G2). | Decided (spec) |
| F9 | Cycle Until This Key Pressed | Owner spec: stop on a "specified terminating key" | CONFIRMED_STATIC encoding; behaviour UNKNOWN | none | p2 = `0xFD`; C:`cycle#11197`; **there is no field for a terminating key** | not captured | **Owner spec D3:** stop on the terminating input. No picker and no new field; the stop condition requires runtime verification (gap G2). | Decided (spec) |
| F10 | Times of Cycles | 1–250 repetitions | CONFIRMED_STATIC (+ capture of value 1) | none | p2 = n; UI clamps to 250 (M:15779) | — | Physical: n = 3, count the clicks. | No |

## G. Battery and status

| # | Control | Official behaviour | Protocol | Impl (root / aria) | Wire · evidence | Readback / physical | Gap → test | Owner? |
|---|---|---|---|---|---|---|---|---|
| G1 | Battery percentage | Polled every 5 s; smoothed | CONFIRMED_RUNTIME (read path in official captures) | root: **WRONG** (reads voltage low byte) · aria: none | `04 00 00 00 00` → `04 00 00 00 02 L C VH VL`; % = `BatVoltageToLevel(mV)` (§8) | C: 100/90/85 with 4046–4168 mV | First WebHID read: compare with the official display. | No |
| G2 | Charging indicator | Charging icon | CONFIRMED_STATIC | none | byte `C` | C: always 0 (never charging in captures) | Read once while the cable is charging. | No |
| G3 | Mouse online | Required for most settings | CONFIRMED_STATIC (+ capture) | root: mis-parsed as "sensor ID" | `03 …` → data[0] ≠ 0 | C: always 01 | Read with the mouse switched off to see the 0 case. | No |
| G4 | Device notifications | DPI/rate/profile/battery changed | CONFIRMED_RUNTIME | none | unsolicited `0A <bits>` | C | — | No |
| G5 | Mouse firmware version | "Mouse Firmware ver" | CONFIRMED_RUNTIME | root: decimal "2.25" ✗ | `12…` → `02 19` = v2.19 | C | — | No |

## H. Settings page

| # | Control | Official behaviour | Protocol | Impl | Wire · evidence | Readback | Gap → test | Owner? |
|---|---|---|---|---|---|---|---|---|
| H1 | Pair(Space) | Firmware-update check, then pairing dialog; Space/Start sends receiver pairing | CONFIRMED_STATIC | none | `08 05 00 00 00 02 00 00 0D 00…00 39` (CID 13 at offset 8; verified in disassembly), then poll `08 06 …00 47` every 1 s; `data[0]` 1 = busy, 2 = fail, 3 = ok; wireless only; the official app has no timeout. M:17833–17961, M:23810 | not captured | **Owner decision D6:** include with instructions and confirmation, and add our own bounded timeout. Live behaviour needs a check (gap G4). | Decided |
| H2 | Sleep Mode = LED idle-off (official label: "Time until mouse sleep after not moving") | 10 s … 40 min | CONFIRMED_STATIC (+ capture); meaning settled by owner (D1, LED idle-off); **timing unverified (G1)** | root: "Sleep/LOD" with arbitrary values ✗ · aria: labelled "lampu mati saat diam" (lights off) | `W(0xAD)` = 1,3,6,30,60,90,120,150,180,210,240 (`allLedOffTime`, §6.9) | echo | **Owner decision D1 (2026-10-24):** LED idle-off, not sensor sleep; 11 official values. Physical effect not runtime-confirmed (gap G1). | Decided |
| H3 | Run On System Boot | Windows registry | NOT_APPLICABLE | — | M:22650 | — | — | No |
| H4 | Windows Mouse Properties | Opens `main.cpl` | NOT_APPLICABLE | — | M:22640 | — | — | No |
| H5 | Drive ver | App version 1.0.0.43 | NOT_APPLICABLE (show the WebHID app's own version instead) | — | X `Version` | — | — | No |

## I. Advanced Settings (mandatory)

| # | Control | Official behaviour | Protocol | Impl (root / aria) | Wire · evidence | Readback / physical | Gap → test | Owner? |
|---|---|---|---|---|---|---|---|---|
| I1 | Long distance on/off | Longer range and interference resistance, more current; wireless only (in wired mode it can only be turned off) | CONFIRMED_RUNTIME (set + get) | root: reached by accident via "DPI stage" ✗ · aria: **malformed frame** | `16 00 00 00 0A v` / `17` → `17 … 0A v` | C: `0x17` = 01 after setting 1 | No range measurement (none needed beyond the UI text). | No |
| I2 | Receiver LED: Connection State & ReportRate | Receiver colour shows the rate while the mouse is connected | CONFIRMED_RUNTIME (set + get) | root: reached by accident via "stage count" ✗ · aria: malformed + mislabelled | `14 00 00 00 0A 01 00…` | `0x15` getter (C); visible effect not recorded | Watch the receiver LED after the write. | No |
| I3 | Receiver LED: Battery State | Receiver colour bands by battery | CONFIRMED_RUNTIME | as above | `14 … 0A 02` (official default after Restore) | C | Band thresholds are firmware-side; the English UI text (100/66/33/0 %) differs from the Chinese default (>80/>60/>20/<20 %). Display the official English text. | No |
| I4 | Receiver LED: Only battery warning | Off; red blink when low | CONFIRMED_RUNTIME | as above | `14 … 0A 03` | C | The low-battery trigger is firmware-side. | No |
| I5 | Receiver LED / Long distance readback on connect | UI reflects the current values | CONFIRMED_RUNTIME | none | `15`, `17` | C | — | No |

## J. Other

| # | Control | Official behaviour | Protocol | Impl | Evidence | Note |
|---|---|---|---|---|---|---|
| J1 | Mousepad surface calibration | Animation only; no device command | NOT_APPLICABLE | — | M:9643, M:9381 (form never instantiated) | Do not build. |
| J2 | Device connect | `requestDevice` VID `3554` / PID `F523` (dongle), `F5A5` (wired); interface 1 | CONFIRMED_RUNTIME for F523 | root ✓ filters · aria: vendor-only filter | X, C, R | Chrome reports `productName` "Fantech StrikeSpeed Pro". |
| J3 | Wired mode (`F5A5`) | Same protocol over the cable; Long distance can only be turned off; mode select locked | STRONGLY_INFERRED | — | X, M:22364 | Test: plug in the cable, check `lsusb` and the WebHID descriptor. |
| J4 | Unparsed flash `0x54–0x5F`, `0xBB` | — | UNKNOWN | — | C | Never write. |

---

### What each evidence type establishes
* A **label in XML/Config** proves the official UI offers the option and which stored value it uses. It does not prove the firmware honours it.
* A **captured request** proves the official app sent it. Its **echo** proves the receiver accepted the frame (the official driver retries on any mismatch). Neither proves persistence.
* A **getter reply or ReadFlashData readback** of the new value proves persistence in device state.
* A **device-originated report** (consumer `05`, mouse `0B`, status `0A`) proves a physical/firmware effect.
