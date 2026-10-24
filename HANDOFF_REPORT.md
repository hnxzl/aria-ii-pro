ARIA II PRO WEBHID CONFIGURATOR — FINAL HANDOFF REPORT

Generated: 2026-10-23T03:07:00.902Z

---

## 1. Executive Summary

### Project Identity
- Repository: `/home/hnxzl/Downloads/aria-ii-pro`
- No Git repository — project files are tracked as a flat directory, not a Git working tree.
- Architecture: Single-page application (SPA) built as plain HTML/CSS/JavaScript.
- Main entry point: `index.html` — contains all markup, styles link, and embedded JavaScript.
- Development approach: WebHID API in-browser. Open `index.html` via HTTPS or localhost in Chrome/Edge.

### Current State Classification
**Partially functional implementation** — mixture of verified hardware functionality and UI-only controls.
- Application contains a working WebHID transport layer sending real HID commands to the mouse.
- Several features (Polling Rate, DPI Stage Select, Mode Select dependency, etc.) are backed by captured protocol evidence.
- However:
  * DPI default was hardcoded to 1600 (Hardware Stage 3 baseline) rather than read dynamically.
  * Button mapping UI pins positioned at normalized coordinates; registers mapped but only mouse actions verified.
  * Several UI controls update optimistically upon command send (only update when `resp` is returned).
  * No physical hardware validation performed by this code on the user's actual mouse.

### Most Critical Action Items for Claude
1. Fix DPI source-of-truth: The device status response (CMD 0x04, byte 6 = 0x64) was incorrectly multiplied by 50 to produce 5000 DPI.
   The 0x64 is a static status signature. DPI control (CMD 0x16 stage select + CMD 0x14 stage count) is correct.
   Default to hardware Stage 3 (1600 DPI) as baseline. Custom DPI value writes remain unimplemented.
2. Verify button mapping coordinates against physical mouse image.
3. Audit UI controls for fake success feedback.
4. Resolve 0xAD02 ambiguity (sleep timeout vs LOD) — no capture settles this.

---

## 2. Feature Inventory

### Working / Verified Features
| Feature | UI Status | Protocol Status | Hardware Verified | Notes |
|---------|-----------|-----------------|-------------------|-------|
| WebHID Connection | Functional | VID/PID confirmed | Partially (candidate IDs) | Interface 1 (49-byte reports) |
| DPI Stage Select (CMD 0x16) | Functional | Protocol confirmed | Not tested in browser | 6 stages: 400, 800, 1600, 3200, 3200, 6400 |
| DPI Stage Count (CMD 0x14) | Functional | Protocol confirmed | Not tested | 1–6 stages |
| Polling Rate | Functional (all 7) | Protocol confirmed | Not tested | 0x0002 bit-flags |
| Mode Select LP/HP/Corded | Functional | Protocol confirmed | Not tested | 0xB902, firmware-enforced Corded at 2K+ |
| Polling Mode Dependency | Implemented | Protocol confirmed | Not tested | savedHpMode restore |
| Peak Performance Toggle | Functional | Protocol confirmed | Not tested | 0xB502 |
| Peak Performance Duration | Functional | Protocol confirmed | Not tested | 0xB702 (minutes) |
| Debounce Time | Functional | Protocol confirmed | Not tested | 0xA902 direct ms |
| Sensor Toggles (3) | Functional | Protocol confirmed | Not tested | 0xAB02, 0xAF02, 0xB102 |
| Profiles 1–3 | Functional | Protocol confirmed | Not tested | 0x0F commands |
| Button Remapping (mouse) | Functional | Protocol confirmed | Not tested | 0x6404–0x7404, mouse actions |
| Connection Status | Partial | — | Not tested | Shows connection, no live state readback |
| Feature Guide | Updated | Full evidence audit | — | Bilingual EN/ID |
| Bilingual UI | Functional | — | — | localStorage persisted |

### Partial or Unimplemented
| Feature | UI Status | Protocol Status | Notes |
|---------|-----------|-----------------|-------|
| Sleep/LOD (0xAD02) | Implemented | Partially Decoded | Values 1, 30, 60, 210, 240. Ambiguous: sleep timeout seconds vs LOD. No capture distinguishes. |
| Macro Manager | Not Implemented | Partially Decoded | CMD 0x09, 10-byte segments at 0x0900+. Not safe. |
| Custom DPI values | Not Implemented | Unconfirmed | NVRAM block 0x000C not captured. |
| Keyboard button macros | Not Implemented | Unverified | 0x0900 block needed. |
| Long Distance Mode | Not Implemented | Unknown | No captures. |
| Dongle LED Modes | Not Implemented | Unknown | No captures. |
| Import/Export/Restore | Not Implemented | N/A | Parsed but not implemented. |

---

## 3. Reverse-Engineering Evidence

### Protocol Summary
Communication: Interface 1 (composite device), 49-byte max packet size, 17-byte HID frames with report ID 0x08. Checksum = `(0x55 - sum(bytes[0..15])) & 0xFF`.

### Command Inventory (from captures)
| CMD | Purpose | Reg Addr | Value/Data | Captures | Confidence |
|-----|---------|----------|------------|----------|------------|
| 0x03 | Sensor/Device ID read | — | — | All captures | Confirmed |
| 0x04 | Status/Battery read | — | Byte 6=0x64 (static), Byte 9=battery % | All captures | Confirmed |
| 0x07 | Settings write | Various | See table below | All captures | Confirmed |
| 0x08 | Memory block read | 0x0000–0x0900 | Read responses 17-byte chunks | profiles-config | Confirmed |
| 0x09 | Macro data write | 0x0900+ | 10-byte segments | macro-manager | Partial |
| 0x0E | Profile info read | — | 0x0000, 0x0100? | profiles-config | Medium |
| 0x0F | Profile select | — | 0, 1, 2 | profiles-config, mode-lp-hp | Confirmed |
| 0x12 | Firmware version | — | v2.25/v2.19 | All captures | Confirmed |
| 0x14 | DPI stage count | — | 0x01–0x06 | all-settings, advanced, profiles | Confirmed |
| 0x16 | Active DPI stage select | — | 0x00–0x05 | all-settings, advanced, profiles | Confirmed |
| 0x15 | Unknown | — | 0x01 | profiles-config | Unknown |

### Setting Register Map (CMD 0x07)
| Register | Feature | Values | Capture Evidence | Status |
|----------|---------|--------|-----------------|--------|
| 0x0002 | Polling rate (global) | 0x01=125, 0x02=250, 0x04=500, 0x08=1000, 0x10=2000, 0x20=4000, 0x40=8000 | all-settings, mode-lp-hp | Confirmed |
| 0xA902 | Debounce time | 5, 15, 20 ms | debounce.pcapng | Confirmed |
| 0xAB02 | Angle Snapping toggle | 0=off, 1=on | all-settings-exp | Confirmed |
| 0xAF02 | Ripple Control toggle | 0=off, 1=on | all-settings-exp | Confirmed |
| 0xB102 | Motion Sync toggle | 0=off, 1=on | all-settings-exp | Confirmed |
| 0xB502 | Peak Performance | 0=off, 1=on | peak-performance-toggle | Confirmed |
| 0xB702 | Peak Duration | 3, 90 (minutes) | peak-performance-duration | Confirmed |
| 0xB902 | Mode Select LP/HP | 0=LP, 1=HP | mode-lp-hp | Confirmed |
| 0xAD02 | Sleep/LOD | 1, 30, 60, 210, 240 | advanced-settings | Partially Decoded |

### NVRAM DPI Stage Presets (from profiles-config.pcapng, addresses 0x000A–0x002B)
| Stage | Raw Byte | Preset DPI | Color (UI) |
|-------|----------|------------|------------|
| 1 | 0x07 | 400 | Red |
| 2 | 0x0F | 800 | Blue |
| 3 | 0x1F | 1600 (HW default) | Green |
| 4 | 0x3F | 3200 | Yellow |
| 5 | 0x3F | 3200 | Cyan |
| 6 | 0x7F | 6400 | Purple |

Formula: `(raw + 1) × 50`. Custom DPI values (non-preset) not yet isolated in captures.

### Button Registers (from button-remap.pcapng)
| Button | Register | Actions Verified |
|--------|----------|------------------|
| 1 (Left) | Hardware-locked | Left Click only |
| 2 (Right) | 0x6404 | R, M, Fwd, Back, DPI Loop, Disabled |
| 3 (Middle) | 0x6804 | R, M, Fwd, Back, DPI Loop, Disabled |
| 4 (Forward) | 0x7004 | R, M, Fwd, Back, DPI Loop, Disabled |
| 5 (Back) | 0x6C04 | R, M, Fwd, Back, DPI Loop, Disabled |
| 6 (DPI Loop) | 0x7404 | R, M, Fwd, Back, DPI Loop, Disabled |

Action encoding: `01xx` = mouse actions, `02xx` = keyboard (unverified), `040a` = macro (unverified), `0500` = DPI, `00xx` = special/multimedia.

### Macro Structure (from macro-manager.pcapng)
- Command 0x09 writes to 0x0900+ in 10-byte segments.
- Payload pattern: name (ASCII) + key sequences + timing.
- Captures show segmented writes: `0900`, `090a`, `0914`, `091e`, `0928`, `0932`.
- Exact encoding not yet characterized for safe implementation.

---

## 4. DPI State Analysis

### The 5000 DPI False Readout

**Origin**: In `connectDevice()` → `readStatus()` (CMD 0x04), the code parsed:
- Byte 5 (0x64) = 100 decimal
- Multiplied by 50 → fake 5000 DPI value

**Evidence correction**: Capture analysis (profiles-config.pcapng, frame 2959: `08040000000264001033000000000000a0`) shows bytes 5–6 are `0x02 0x64` — invariant across ALL settings, ALL polling rates, ALL DPI stages, ALL power modes. This is a static status signature, not live DPI.

**Current fix**: Initial state default set to Stage 3 (1600 DPI) as reported by the physical hardware. DPI is controlled via CMD 0x16 (stage select) and CMD 0x14 (stage count).

**Remaining work**:
- The device does NOT currently provide a live readback of current DPI stage via any known command.
- Custom DPI value editing (non-preset) requires NVRAM block write that has not yet been isolated.
- If physical verification is performed, the 1600 DPI default should be confirmed against the mouse's actual LED indicator.

---

## 5. Button Mapping Detail

### Current Architecture
- Six positions defined in `BUTTON_DEFS` (index.html lines 830–840).
- Registers: Button 2→0x6404, Button 3→0x6804, Button 4→0x7004, Button 5→0x6C04, Button 6→0x7404.
- Action codes confirmed for mouse actions: 0101=Left, 0102=Right, 0104=Middle, 0110=Forward, 0108=Back, 0500=DPI, 0000=Disabled.

### Button Pin Coordinates (normalized to button.webp 2768×1536)
- Pin 1 (Left): `left: 42%; top: 22%`
- Pin 2 (Right): `left: 66%; top: 26%`
- Pin 3 (Middle): `left: 54%; top: 22%`
- Pin 4 (Forward): `left: 31%; top: 42%`
- Pin 5 (Back): `left: 33%; top: 52%`
- Pin 6 (DPI Loop): `left: 53%; top: 35%`

These coordinates are from prior investigation. **Physical verification not yet performed against actual hardware**.

### Safety Boundary
- Button 1 (Left Click) is hardcoded locked. `def.locked = true` prevents remapping in the inspector.
- Inspector correctly disables the action dropdown when Button 1 or locked buttons are selected.

### Known Limitations
- Keyboard and macro action codes (02xx, 040a) are NOT implemented. These require validated 0x0900 memory writes.
- No physical verification that remapped button data actually changes hardware function.

---

## 6. Capture Inventory

All files confirmed present and accessible:

| File | Size | Analyzed? | Findings |
|------|------|-----------|----------|
| advanced-settings.pcapng | 1.3MB | Yes | 0xAD02 values, DPI 0x14/0x16 |
| all-settings-experiment.pcapng | 2.6MB | Yes | CMD 0x14/0x16 full (frames 31113–35399), all toggles |
| button-remap.pcapng | 3.1MB | Yes | All 5 registers + 7 mouse actions |
| debounce.pcapng | 1.4MB | Yes | 0xA902: 5, 15, 20 ms |
| macro-manager.pcapng | 3.6MB | Yes | 0x09 segmented writes at 0x0900 (not decoded) |
| mode-lp-hp.pcapng | 436KB | Yes | 0xB902 LP/HP, Corded enforcement |
| peak-performance-duration.pcapng | 444KB | Yes | 0xB702, 3 & 90 min |
| peak-performance-toggle.pcapng | 472KB | Yes | 0xB502 on/off |
| profiles-config.pcapng | 1.4MB | Yes | NVRAM 0x000A–0x002B, DPI presets |
| wireshark.pcapng | 912KB | Partially | Startup sequence, Interface 2 mouse reports |

**Analysis tools**: Tshark used for packet extraction.

---

## 7. USB Identities and Linux Setup

### Device IDs (Candidate vs Verified)
The application defines:
- Wireless receiver: VID 0x3554, PID 0xF523 — **candidate**, not independently verified from packet capture.
- Wired USB: VID 0x3554, PID 0xF5A5 — **candidate**, not found in any capture.

### WebHID Connection Workflow
1. `navigator.hid.requestDevice({ filters: [usb candidates] })`
2. Opens first interface-1-describing collection.
3. Reads: SensorInfo (0x04? actually 0x03), Status (0x04), Firmware (0x12).
4. Shows connected.

### Linux Setup
- udev template exists at `udev/99-aria-ii-pro.rules`.
- `docs/linux-setup.md` documents udev usage.
- No broad sudo or overly broad permissions in templates (reviewed).

---

## 8. Known Bugs and Functional Status

### DPI
- **Bypassed fake source-of-truth**: Initial `readStatus()` path removed. Sets hardware Stage 3 (1600 DPI).
- **No dynamic DPI readback**: Cannot query current DPI stage (no known command). Selection relies on button press.
- **Custom DPI not implemented**: Sliders for arbitrary values require NVRAM write.

### Button Mapping
- **Coordinates might not align physically**: Need real mouse + image overlay verification.
- **Keyboard/macro actions not implemented**: Registers mapped but actions unverified.

### State Consistency
- **Optimistic UI updates**: Controls change only on `resp` echo success, but echo does not prove hardware applied setting (no secondary readback).
- **No per-control loading states**: Rapid clicking during async command might cause overlap.
- **No full initialization sync**: Device boots with unknown profile; UI assumes profile 0 / LP / HP etc.

### Mode Select
- **Fully spec'd and implemented in logic**: 1000 Hz or below: LP/HP; 2000–8000 Hz: Corded. SavedHPMode restores.
- **Unverified physically**: Needs real mouse test.

### UI Design
- **Navigation uses Unicode glyphs** (`⌂`, `◈`, `◉`, etc.) — needs SVG icon system.
- **8K badge** labeled "Subject to Mode" (initial) — acceptable.
- **Repeated branding exposure** — banner shown in header, hero, and about (user-reported cleanup needed).

---

## 9. Test Report

### Automated Tests
- Protocol packet tests (JS/Node): Verified CMD 0x16, 0x14, 0x07 button framing against capture hex. All match.
- Syntax check: `node vm.runInContext()` passes.
- No unit tests or e2e harness present.

### Static Analysis
- Feature Guide HTML content: Updated based on evidence matrix.
- Language dictionaries (EN/ID): Updated with evidence citations.

### Browser Tests
- No browser/WebHID session was launched during this implementation.

### Physical Hardware Tests
- Not executed in this environment.

---

## 10. Blockers and Incomplete Work

### High Priority (Evidence Missing)
1. **Sleep/LOD 0xAD02 meaning**: Need capture where user changes sleep interval AND LOD slider separately, or read NVRAM register with different documented config.
   - Can solve by: Isolating which control in official software triggers specific 0xAD02 byte value via screenshot+packet correlation.
2. **Custom DPI value Sliders**: Need packet traces of official software writing arbitrary DPI stage values.
   - Requires: Win10/11 environment.
3. **Hardware verification**: No HID `open()` was ever executed on the user's mouse during this session to prove commands work in real device.
   - Action: User needs to load application in browser with mouse attached.

### Medium Priority
4. **Button coordinates**: Needs visual inspection.
5. **Macro editor**: Needs safe, isolated memory writes (block 0x0900).
6. **Readback after writes**: No NVRAM readback to verify writes applied.

### Environment
7. Arch Linux udev rule — template exists, not verified on user's actual system.

---

## 11. Files Changed

This project has no Git history. All modifications live in-place.

### Core Files
- `index.html` (82KB): Spawn into SPA with:
  - All page markup (Home, Performance, Sensor, Buttons, Profiles, Guide, About)
  - Full embedded JS (938 lines)
  - i18n dictionaries EN/ID (1532 lines total)
  - WebHID connect/sensor/status/firmware
  - DPI stage select/count (CMD 0x16, 0x14)
  - Polling/Mode dependency
  - Peak performance, debounce, sensor toggles, profile select, button remap
- `styles.css` (35KB): Dark glass-ish theme, pin coordinates, DPI grid, button inspector.
- `AUDIT-REPORT.md` (10KB): Auto-generated audit baseline + protocol notes.
- `README.md` (34KB): Bilingual feature guide.
- `OLD-README.md` (6KB): Prior project notes.

### Capture Evidence
- 10 pcapng files in `windows-capture/usb-captures/` (size 436KB–3.6MB each).
- 7 asset files in `assets/`.
- udev rule template + `docs/linux-setup.md`.

---

## 12. Takeover Plan for Claude Code

### Step 1: Map the codebase
Do NOT trust this handoff blindly — open the code and verify:
- `grep` for key command handlers.
- Confirm every `sendCommand` call.
- Check all `t()` translation keys used versus defined.
- Map page IDs and section IDs.

### Step 2: Hardware verification
Run the app via:
`python3 -m http.server 8000` (or `npx serve`) in Chrome/Edge over `http://localhost:8000`.
Test:
1. WebHID connect → read status → verify battery %.
2. DPI stage sweep (CMD 0x16) → check LED change.
3. Polling sweep 125→8000 → check mode enforcement.
4. Button remap Button 4 → Forward → actual click test.
5. Sensor toggles → verify physical behavior.

### Step 3: Resolve 0xAD02
Need targeted capture: pause between individual slider adjustments in official software.

### Step 4: Uncoupled reads
Implement NVRAM readback (CMD 0x08) to verify writes.

### Step 5: Fill remaining features
- Missing keyboard macro actions.
- Missing Profile save/delete via 0x09.
- Readback and verification dialogs.

### Step 6: UI polish
- Replace Unicode glyphs with SVG.
- Remove repeated branding.
- Add loading/pending states.
- Topography background intensity reduction.

### Step 7: Documentation
- Update README Feature Matrix.
- Update AUDIT-REPORT with new confirmed capabilities.
- Add update log.

---

## FACTS CLAUDE MUST NOT ASSUME

1. **Do not treat the 5000 DPI default as verified behavior.** The 0x64 byte is static; hardware boots to an unknown stage. Stage 3 = 1600 DPI was the reported baseline, but no capture confirms this default. No readback command exists to query current DPI stage.

2. **Do NOT assume 0xAD02 = 1 means "sleep after N seconds".** Values 30, 60, 210, 240 may be minutes/seconds/LOD. No isolated test distinguishing settings.

3. **Button 1 is NOT functionally tested as locked.** Code Tries to prevent changes, but physical lock unverified.

4. **Mouse physical integration with button.webp pins is UNVERIFIED.** Need real overlay to confirm coordinates.

5. **No WebHID actual integration test has been performed.** All green tests are formula-level packet matching only.

6. **Wireless receiver ID 0xF523 and wired 0xF5A5 remain CANDIDATES only** — build of reports as PID 0xF523 is from prior user-reported claim (not this version), and no header field in pcap exposed vendor confirmed.

7. **All "impl" vs "hardware-verified" distinctions**: Every UI control that currently modifies local UI state assumes a HID response means success — but the physical mouse state might not persist across device sleep or reboots.

8. **NVRAM custom DPI editor is NOT IMPLEMENTED**, only fixed preset UI. Any attempt to implement must capture new traffic.

9. **No single background macro sequence has been fully validated.** All macros are off-limits until protocol complete.

10. **Never copy Aria XD7 (original) firmware/register assumptions into II Pro without independent capture evidence.


---

End of Report