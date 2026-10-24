# Open Questions — Resolved Decisions and Remaining Gaps

First issued 2026-10-23. Owner answers received 2026-10-23 (22:26 WIB) and reconciled with the evidence below. This file now records (1) each owner decision together with the evidence it rests on, and (2) the gaps that remain, none of which needs another owner decision.

---

## Part 1 — Owner decisions (binding for implementation)

### D1 — Sleep Mode (resolved 2026-10-24)
* **Owner-confirmed meaning:** LED idle-off. After the chosen time without movement the mouse lighting turns off to save battery. It is **not** sensor sleep, and the UI must not describe it as such.
* **Protocol / values (CONFIRMED_STATIC + CAPTURE):** flash `0xAD` (`mouseConfig.allLedOffTime`), raw values `1, 3, 6, 30, 60, 90, 120, 150, 180, 210, 240` in 10-second units, shown as 10 seconds … 40 minutes. The raw value is serialized. No other register.
* **Physical effect and timing:** unverified until tested on hardware (gap G1). The official Settings label for this model ("time until mouse sleep") is a vendor wording quoted as evidence only.

### D2 — LOD
* **Decision:** offer **1 mm and 2 mm only**. Do not expose 0.7 mm.
* **Evidence:** XML `0.7mm=3, 1mm=1, 2mm=2`. The official code removes 0.7 mm when the sensor ≠ "3950", and `Config.ini` says `3395`. CONFIRMED_STATIC.

### D3 — Macro cycle modes
* **Owner specification (user-facing semantics):**
  * Cycle Until Key Released (`0xFE`): repeat while the trigger is held; stop on release.
  * Cycle Until Key Pressed (`0xFF`): toggle — press once to start, press the same trigger again to stop.
  * Cycle Until This Key Pressed (`0xFD`): repeat until the firmware detects its terminating input. The owner's description refers to another specified key/button.
  * Times of Cycles (`1–250`): repeat N times, then stop.
* **Decision:** send the official codes. **No terminating-key picker and no new serialised field**, because the official software stores none (button record `06 <slot> <mode>` only).
* **Status:** `0xFE` playback is CONFIRMED_RUNTIME (capture). The stop conditions of `0xFF` and `0xFD` **require runtime verification** → Gap G2. Help text must present them as the intended behaviour, not as verified.

### D4 — Main mouse LED
* **Decision:** no main-LED page. The seven generic modes are `NOT_APPLICABLE` for this hardware/UI configuration (`DisplayLight=0`, lighting tab removed by the official app, no screenshot or capture of it). DPI Light Effects stays a separate feature.

### D5 — Restore (implementation status 2026-10-24: official sequence implemented; G3 still open)
* **Decision:** match the official sequence:
  1. `0x09` ClearSetting.
  2. Long Distance = On (`16 … 0A 01`).
  3. Receiver LED = Battery State (`14 … 0A 02`).
  4. Full flash re-read.
  5. Host-side shortcut/macro reset.
* **Guards:** destructive-action warning plus explicit confirmation. Never automatic.
* **Limitation:** whether ClearSetting resets one profile or all four is **unconfirmed**. Restore must not be released until this is resolved → Gap G3.

### D6 — Pairing (implementation status 2026-10-24: checked against FormPair source; G4 still open)
* **Decision:** include it, behind explicit user initiation and the official instructions. Show progress and the success/failure result. Handle timeout, disconnection and interruption without false success. Warn that a failed pairing may leave the mouse unpaired. No automatic pairing and no firmware-update step.
* The verification you asked for is done; see Part 3. The remaining runtime gap is G4.

---

## Part 2 — Remaining genuine gaps (no owner decision needed; runtime evidence needed)

| ID | Gap | Blocks | Smallest safe test |
|---|---|---|---|
| **G1** | Physical effect and timing of the `0xAD` LED idle-off (meaning settled by D1) | Claiming the behaviour as verified. Does **not** block implementing the control (D1). | Set 10 s, leave the mouse still for 20 s, then move it. Note whether the first movement is lost or delayed, and whether `03` (online) or any `0A` notification changes, using the WebHID debug log. |
| **G2** | Stop conditions of macro modes `0xFF` and `0xFD` | Calling them verified. Does not block sending the codes. | Bind the 6-event autoclick to UI button 4: (a) mode FF — press, release, wait, press the same button, press a different button; (b) the same with FD. Record when the `0x0B` reports stop. |
| **G3** | ClearSetting scope (one profile vs all four) | **Releasing Restore** (D5). | Export all 4 profiles. Give profile 2 a distinctive value (e.g. debounce 12 ms) and select profile 1. Run Restore. Read profile 1, switch to 2, read `0xA9`. Re-import the exports afterwards. |
| **G4** | Pairing exchange never observed on the wire | Releasing Pairing without a live check. | Read-only first: send `06` (GetPairState) once while idle and record the reply. Then run one supervised pairing with the official app available as fallback, and capture it if possible. |
| G5 | DPI values > 12800 (DPIex high bits) | Offering > 12800 as verified | Write 13000 to a spare stage, read it back, restore. |
| G6 | Combo (keyboard) shortcuts — same block as media keys, never captured with keyboard usages | Calling combo keys verified | Assign Ctrl+C to one button, press it in a text field, restore. |
| G7 | Wired mode `F5A5` | Wired-specific gating | Plug in the cable; check `lsusb` and the WebHID collections. |

---

## Part 3 — Pairing chain, verified as requested

| Item | Finding | Evidence |
|---|---|---|
| Entry point | Settings "Pair(Space)" → `UC_Pair.customButton_Pairing_Click`. A firmware-update check runs first; per D6 we skip it. Then `new FormPair(driveParam.CID)`. | C# 22477, 22530 |
| Precondition | Pair button is enabled only when the selected device is **not** USB-wired (`!isUSB`); otherwise the hint "Must be in wireless mode to pair" is shown. | C# 17833–17849 |
| User instruction | "Press left, right and middle button on mouse together, then there's yellow flashing light to indicate the start of pairing. Press space bar again, or click 'Start Pair', driver will run into pairing mode." | `0-English.xml` `PairTips` |
| CID value | `Config.ini CID` = base64 `"Fantech Aria II Pro13"`. The app removes `DriveName` and parses `"13"` as decimal → **CID = 13 = 0x0D** (matches the `Device_CID13_MID8.bin` naming). | C# 23810–23828 |
| Request | `UsbServer.EnterDonglePairOnlyCid((byte)13)` → native `UsbServer_EnterDonglePairOnlyCid@1000cef0`. Disassembly confirms the 17-byte frame **`08 05 00 00 00 02 00 00 0D 00 00 00 00 00 00 00 39`**. The length byte says 2, but the CID sits at frame offset 8 (`[ebp-0xd]`), not offset 6. Reproduce the bytes exactly. | `docs/evidence/HIDUSB32_NATIVE_EXCERPTS.c` + objdump of the same DLL |
| Status poll | `ReadDonglePairStatus` → **`08 06 00 00 00 00 … 00 47`**, sent every **1000 ms** by `PairingTimer`. | C# 17786, 17885–17888; native `UsbServer_ReadDonglePairStatus` |
| Reply parsing | Reply `id 0x06`, `data[0]` (frame byte 6): **1 = still pairing** (ignored), **2 = fail**, **3 = success**. | C# 17917–17961 |
| Failure without a reply | Fail also when the receiver disappears from HID enumeration during polling. | C# 17889–17914 |
| Timeout | **The official app has no overall timeout**; it polls until 2/3 or until the device disappears. WebHID therefore needs its **own** bounded timeout (not an official value; recommended 30 s, labelled as such). After a timeout it reports "not confirmed" and must never report success. | absence in C# |
| Transport | Pairing reuses the normal receiver vendor interface (`UsbServer.Start(PairDevice, …)` with the same device path). | C# 17876 |
| Wire status | **Never captured.** Request bytes are CONFIRMED_STATIC (managed + native + disassembly); behaviour is unverified → G4. | — |

The alternative `EnterDonglePairWithCidMid` puts CID/MID at offsets 6/7 instead. It is **not** used by the pairing dialog, so do not use it.

---

## Part 4 — Implementation reconciliation (2026-10-24)

* **Restore:** `app.js openRestore` sends exactly the captured sequence (`profiles-config` #15535–#16505): `09` (5 s, ≤5 attempts) → `16 … 0A 01` → `14 … 0A 02` (receiver only, M:13197) → full re-read → clearing writes for every shortcut slot (`00 ff`) and macro slot (33-byte clear form) that still holds data (deviceRestore branch, M:13339). Behind an explicit acknowledgement. Scope (G3) unknown and stated in the dialog.
* **Pairing:** frame `05 00 00 00 02 00 00 0D …` (chk 39), 1 s `06` poll, status 1/2/3 parsed from data[0], receiver-only, fails when the receiver disappears — as in `FormPair` (C# 17800–17961). Like the official app, polling continues even if `05` gets no reply. The 30 s timeout is this app's own (D6). Never exercised on hardware (G4).
* **DPI stage count:** official swap moves xDPI/yDPI and colour only; each slot keeps its DPIex (M:29909–29939). Writes follow the native diff order (`02`, `04`, record i, colour i, …). Unit-tested in `tests/protocol.test.cjs`.
* **Button data order:** native diff writer emits key record → shortcut block → macro slot (N:FUN_10006d40; captures `button remap#6049/6053`, `macro autoclick#30677/30681`). The app now uses that order; on a failed data write it restores the previous assignment, or the button's factory function if the old data cannot be rewritten (mock-tested).
* **Import:** follows M:14693 — clear used slots, then write every differing field of the file in native diff order (all 16 keys, LED bar 0xA0/0xA7, spindown, 0xB3 included); only `maxDPI > 4` is rejected.
* **Wired (F5A5):** official wired rules applied (Corded mode, no receiver getters/setters, no pairing, Restore without `16`/`14`). Not captured, not verified (G7).

## Part 5 — What the 2026-10-24 captures settled (details: EVIDENCE_LEDGER §11)

| Gap | Status now |
|---|---|
| G1 Sleep/LED idle-off | No `0xAD` write was captured. Observed instead: with `0xAD` = 1 stored (read shortly after), the receiver reported the mouse **offline** after ~10 s idle and stopped answering battery requests until it moved. LED behaviour not observable on USB. The owner's D1 meaning (LED idle-off) is unchanged in the UI; the radio-offline observation is recorded for the owner to weigh. |
| G2 Macro FF / FD stop | FF stopped together with a Left-button press; FD ignored a Left click and stopped without any other report. Consistent with "any key" vs "the bound key", not proven. |
| G3 Restore scope | Active profile reset; profile 1 becomes active; slot data survives ClearSetting. Profiles 3–4 still unknown. |
| G4 Pairing | Request, echo and success reply (`03 13`) captured. Failure path unobserved. |
| G5 DPI > 12800 | Encoding captured and read back. Sensor effect unmeasured. |
| G7 Wired | PID F5A5 and identical protocol captured; web app over cable untested. |

## Part 6 — Final status (2026-10-24, after `restore-profile3-4` and `sleepmode-write-30s`)

* **Resolved:** G1 meaning (lighting idle-off, owner-observed at 10 s; 30 s write captured; offline-while-idle is independent of `0xAD`), G3 (all four profiles reset, profile 1 active), G5 (encoding, readback, owner-confirmed use), G7 (protocol captured, owner-confirmed WebHID over cable), G4 success path.
* **Still open:** exact stop conditions of macro modes `0xFF`/`0xFD`; pairing failure path on hardware (mock-tested only); calibrated CPI accuracy; physical timing of Sleep values other than 10 s.

