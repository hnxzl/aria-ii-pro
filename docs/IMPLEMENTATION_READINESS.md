# Implementation Readiness

Audit date: 2026-10-23; updated the same evening with owner decisions D1–D6 (`OPEN_QUESTIONS.md`).

> **Final status 2026-10-24 (later):** G3 closed by `restore-profile3-4.pcapng` (all four profiles reset, profile 1 active); Sleep Mode = lighting idle-off (owner-observed at 10 s, 30 s write captured); DPI > 12800 and wired WebHID owner-confirmed. Open: macro 0xFF/0xFD stop rules, pairing failure on hardware (mock-tested), CPI calibration, physical timing of other Sleep values. See EVIDENCE_LEDGER §11.1.
>
> **Status 2026-10-24:** implemented in `protocol.js` + `app.js` (root app). Restore and Pairing follow the official sequences (OPEN_QUESTIONS Part 4) but remain hardware-unverified (G3, G4). Sleep Mode = LED idle-off (D1 resolved). Physical behaviour of every feature still needs the §4 validation order; mocked and capture-based tests only so far.

## 1. Approach

1. **One application:** the root project (`index.html`, `styles.css`, `assets/`, `udev/`, `docs/`) is the product.
2. **Replace its protocol engine:** do not patch the existing `buildPacket`/`sendCommand` code. It sends Long-distance and receiver-LED commands from DPI controls, inverts the polling map, mis-parses battery and firmware replies, and accepts any input report as a reply. The new engine implements `EVIDENCE_LEDGER.md` §2–§5 and reuses the proven parts of `aria/aria-ii-pro-webhid/app.js`: address/length matching, readback after write, and JSON logging.
3. **Transport rules from the official driver:**
   * One request in flight at a time.
   * Match a reply by command `id`, and for flash also by address and length.
   * Treat a write as accepted only on a byte-identical echo.
   * Time out after 1 s (5 s for ClearSetting), with up to 5 attempts.
   * Handle unsolicited `0x0A` notifications outside the queue.
4. **Write discipline:**
   * Read state first.
   * Write only fields whose value changed.
   * Re-read every written field and show "saved" only on a readback match.
   * Never write `0x54–0x5F`, `0xBB`, or any address not listed in ledger §4.
5. **Honesty rule:** any feature whose behaviour is only owner-specified or statically inferred shows an "unverified on hardware" marker until its gap is closed (§4).

## 2. Feature set and readiness

**Legend:**
* **Ready**: wire format and official semantics are established; build now.
* **Ready — marked**: build now, but label the behaviour unverified until the named gap closes.
* **Gated**: build, but keep it disabled behind a gate until the gap closes.
* **Excluded**: by owner decision or because it does not apply.

| Feature | Readiness | Basis / constraint |
|---|---|---|
| Connect, online state, firmware version (`v2.19` format) | Ready | `03`, `12` |
| Battery % and charging | Ready | `04` reply → `BatVoltageToLevel` (21-point table), 5 s poll, ±1 % smoothing; raw byte kept in the debug log |
| Status notifications (`0A`) | Ready | Targeted re-reads on DPI/rate/profile/battery bits |
| Profiles 1–4 select + readback | Ready | `0F`, `0E`, then full re-read |
| Button mapping: mouse buttons, DPI Loop/+/−, Disabled, polling-rate switch, fire key, scroll, DPI lock | Ready | `0x60+4k`; UI 4 → slot 4, UI 5 → slot 3; Left kept on button 1 |
| Media keys | Ready | Type `05` + shortcut block; captured end-to-end |
| Combo (keyboard) shortcuts | Ready — marked (G6) | Same block, never captured with keyboard usages |
| Debounce: checkbox gate + 0–20 ms, warning below 8 ms | Ready | The checkbox is UI-only in the official app, so it is implemented as an enable gate as specified |
| DPI stage count (1–4), active stage, per-stage colour, DPI Loop | Ready | `0x02`, `0x04`, `0x2C+4i`; reproduce the official swap when the count drops below the active stage |
| Per-stage DPI 50–12800 | Ready (runtime-verified path) | `0x0C+4i` |
| Per-stage DPI 12850–26000 | Gated (G5) | DPIex high bits unverified on this sensor |
| Polling 125–8000 Hz | Ready | Codes `08/04/02/01/10/20/40` |
| LP/HP at ≤1000 Hz; Corded + disabled selector at ≥2000 Hz (and when wired) | Ready | Never write `0xB9` while locked |
| LOD 1 mm / 2 mm | Ready | D2; 0.7 mm not offered |
| Peak Performance + duration (30 s … 15 min) | Ready | Duration enabled only while Peak is on |
| Ripple, Angle snapping, Motion sync | Ready | `0xB1`, `0xAF`, `0xAB` |
| DPI Light Effects (Off/Fixed/Flicker, brightness, speed) | Ready | Off ⇒ enable 0 only; brightness only in Fixed, speed only in Flicker |
| Macro library, recording, editing, insert action, delays | Ready | Library in browser storage + JSON import/export (the official app keeps it host-side too) |
| Macro upload + assignment; modes Released (`FE`) and Times (`1–250`) | Ready | `FE` playback runtime-confirmed |
| Macro modes Until Key Pressed (`FF`) / Until This Key Pressed (`FD`) | Ready — marked (G2) | Owner semantics in the help text; no terminating-key picker (D3) |
| Sleep Mode = LED idle-off (11 official values) | Ready — marked (G1) | D1 resolved: lighting off after inactivity, not sensor sleep; timing not runtime-confirmed |
| Long Distance set/get | Ready | Wireless only; in wired mode only Off |
| Receiver LED: Connection/Rate (1), Battery (2), Only warning (3) + readback | Ready | Official English help texts |
| Export / Import (official `.bin`) | Ready | 64-byte header + 10,428-byte managed map (struct port needed) |
| **Restore** | **Gated (G3)** | D5 sequence and confirmation can be built, but **release is blocked until ClearSetting scope is known** |
| **Pairing** | **Gated (G4)** | D6; frames verified statically (`08 05 … 0D … 39`, poll `08 06 … 47` every 1 s); own timeout (30 s, not official); live exchange never observed |
| Main LED page | Excluded | D4 |
| Calibration, Run on boot, Windows Mouse Properties | Excluded | Cosmetic or Windows-only |
| Wired mode (`F5A5`) specifics | Ready — marked (G7) | Filter included; wired gating per official rules |

## 3. Remaining genuine blockers

These need runtime evidence on your mouse, not owner decisions. Steps are in `OPEN_QUESTIONS.md` Part 2.

1. **G3 — Restore scope.** One supervised test with all profiles exported first. Blocks only the release of Restore.
2. **G4 — Pairing live check.** One read-only `06` probe, then one supervised pairing. Blocks only the release of Pairing.
3. **G1 / G2 — Sleep effect and macro FF/FD stop conditions.** They block no code, only the "verified" status.
4. **G5–G7 — DPI > 12800, combo keys, wired mode.** Minor; gated or marked.

Nothing else is blocked. All other features in your general direction have sufficient evidence.

## 4. Safe validation order (after implementation, one step at a time)

1. **Read-only:** `03`, `12`, `0E`, `15`, `17`, `04`, `R(0x00..0xBF)`; compare with the official app.
2. **Reversible single fields with readback:** debounce, then a DPI stage value.
3. **Receiver commands:** `17`/`16` toggle and restore; `15`/`14` each mode with a visual LED check, then restore.
4. **Profiles:** `0E` → `0F` → `0E` → full read → back.
5. **Buttons:** UI 4 → DPI Loop, press it, expect `0A 01`, restore Forward.
6. **Macros:** autoclick with mode `FE`, then G2 tests for `FF`/`FD`; restore Forward.
7. **G1** sleep test.
8. **G3** Restore-scope test (exports first), then unlock Restore.
9. **G4** pairing probe and supervised pairing, then unlock Pairing.

## 5. Documentation follow-ups after implementation
* Replace the protocol sections of root `README.md` and `docs/protocol-analysis.md` with a pointer to `EVIDENCE_LEDGER.md` (currently only a banner was added).
* Correct `docs/linux-setup.md`: `F5A5` is the official wired PID (static evidence).
