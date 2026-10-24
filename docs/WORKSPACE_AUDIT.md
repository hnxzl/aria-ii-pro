# Workspace Audit — `/home/hnxzl/Downloads/aria-ii-pro/`

Audit date: 2026-10-23 (Asia/Jakarta). Read-only with respect to all existing files. The only files this audit created are listed in §8. A full SHA-256 baseline of every pre-existing relevant file was taken **before** anything was written: `docs/evidence/SHA256SUMS-baseline.txt` (197 files).

## 1. Summary answers

1. **What was found:** two separate WebHID front-ends, one Windows reverse-engineering handoff package, 19 USB captures, 3 official profile exports, 12 official-app screenshots, 1 UI mockup, an ILSpy C# export, native DLL copies, Ghidra projects, the official installer, and two generations of reports.
2. **WebHID source of truth:**
   * Protocol: `aria/aria-ii-pro-webhid/app.js` is the only code shown to talk correctly to the device (browser read/write/readback evidence, R in the ledger). Its `0x14`/`0x16` frames are malformed and its receiver-LED labels are swapped (§5).
   * Product UI: the root project (`index.html` + `styles.css` + `assets/` + `udev/` + `docs/`) is the Linux/Arch deliverable shell and its design target matches `windows-capture/notes/ui.png`. Its protocol engine is **not** trustworthy: it sends Long-distance and receiver-LED commands from the DPI controls, and it uses an inverted polling map (§5).
   * Recommended direction for the implementation phase: keep the root project as the application, and replace its protocol layer with a new engine built from `docs/EVIDENCE_LEDGER.md`, reusing the proven request/response/readback logic of `aria/aria-ii-pro-webhid/app.js`. This is a recommendation only; nothing was changed.
   * There is no Git repository anywhere in the tree (`git status` fails at the mount boundary). History was reconstructed from file timestamps and content (§4).
3. **`aria/` contains** the Windows-side handoff (§3): its own static WebHID app, managed IL dumps, Ghidra projects, the C# export, native DLL copies, the official installer, 9 newer targeted captures, 3 profile exports, 4 screenshots and the earlier reports.
4. **New Windows handoff evidence:** `aria/` (captures at `aria/*.pcapng`, exports at `aria/aria-ii-pro-capture-2026-10-23-rev2/before/`, C# export at `aria/ghidra manual/Mouse-Drive-Beta.cs`, DLLs at `aria/ghidra manual/costura*.dll`, IL at `aria/analysis/*.il.txt`, reports at `aria/README-NEXT-AGENT.md`, `aria/WINDOWS-CAPTURE-CHECKLIST.md`, `aria/analysis/*.md`).
5. **Overlaps and conflicts:** §5.
6. **Missing referenced files:** §6.
7. **Originals that must stay untouched:** §7.

## 2. Inventory (relevant files)

Sizes in bytes. Timestamps are the file mtimes shown by the linked shell. "Role" is what the content is, not what its name suggests.

### 2.1 Root — Linux WebHID project (UI shell)
| Path | Size | Role |
|---|---:|---|
| `index.html` | 93,725 | SPA: pages Home, Performance, Sensor, Buttons, Profiles, Guide, About; embedded JS protocol engine (lines 594–1590) and EN/ID dictionaries. Protocol faults in §5. |
| `index.html.bak` | 83,966 | Earlier copy of the same SPA (1,532 vs 1,592 lines). Same command set and same inverted `POLL_MAP`; stale. |
| `styles.css` | 36,431 | Styles for `index.html`. |
| `README.md` | 34,931 | Bilingual guide; repeats the superseded protocol claims (0x14/0x16, register names). |
| `OLD-README.md` | 6,108 | README of an older read-only "Web Device Lab" variant (mentions a `docs/reverse-engineering.md`, `check-static-site.py` and a Pages workflow that do not exist here). Historical. |
| `AUDIT-REPORT.md` | 10,826 | First onboarding audit (capture-only analysis). Many conclusions superseded (EVIDENCE_LEDGER §9). |
| `HANDOFF_REPORT.md` | 18,942 | Handoff describing the root SPA. Same superseded protocol model. |
| `docs/protocol-analysis.md` | 17,524 | Root protocol report. Same superseded model; a supersession banner was added at its top (§8). |
| `docs/linux-setup.md` | 15,524 | udev/hidraw guide for Arch. Still valid apart from calling `F523` "verified" and `F5A5` "candidate" (`F5A5` is now confirmed statically as the wired PID). |
| `udev/99-fantech-aria-ii-pro.rules` | 624 | `uaccess` rules for `3554:f523` and `3554:f5a5`. |
| `assets/` | — | `front.webp` and `mouse1.webp` are **byte-identical** (same SHA-256), so the old "mouse1.webp missing" note is obsolete. Also `button.webp`, `aria2banner-readable.webp`, `fantech-logo.webp`, `topography.svg`, `fav.ico`. |
| `windows-capture/usb-captures/*.pcapng` | 10 files, 0.43–3.7 MB | First capture set (2026-10-23 06:41–07:04 local). |
| `windows-capture/screenshots/*.png` | 8 | Official-app screenshots (button page, DPI/sensor page, Peak durations dropdown, Settings page, device cards 8K wireless/wired). |
| `windows-capture/notes/ui.png` | 1,493,398 | **Design mockup** for the new configurator (not an official-app screenshot). |
| `windows-capture/usb-identification/` | empty | — |

### 2.2 `aria/` — Windows handoff package
| Path | Role |
|---|---|
| `aria/aria-ii-pro-webhid/{index.html,app.js,style.css,serve.cjs,README.md}` | Indonesian-language "observation" WebHID app. Flash read with auto-readback after write; DPI stage read/write; single-byte setting writes; DPI colour; profile/long-range/receiver-LED senders; raw report log and JSON export. `serve.cjs` binds 127.0.0.1:8765. |
| `aria/README-NEXT-AGENT.md`, `aria/WINDOWS-CAPTURE-CHECKLIST.md` | Previous agent's handoff and capture plan (Indonesian). |
| `aria/analysis/allcapture-nwex-analysis.md`, `aria-ii-pro-hid-observation.md`, `observation-2-export-bin.md` | Reports covering the missing `allcapture.pcapng`, observation JSONs 1–7, `nwex.bin`, `export.bin`, the official log, and managed metadata. |
| `aria/analysis/*.il.txt` (95 files) + `dump-managed-il.ps1`, `dump-feature-il.ps1` | Per-method CIL dumps. Duplicates noted in §5.3. |
| `aria/analysis/ghidra/AriaIIPro-HIDUsb32{,-verified}.{gpr,rep}`, `ghidra_scripts/ExportEvidence.{java,py}`, `script-run.log` | Ghidra projects of the 32-bit DLL. The log shows the export script failed (OSGi bundle error); no pseudocode was exported there. |
| `aria/ghidra manual/Aria-II-Pro-ReverseEngineering.{gpr,rep}` | Manual Ghidra project (exe + DLL). |
| `aria/ghidra manual/Mouse-Drive-Beta.cs` | 1.1 MB ILSpy C# export of `Mouse Drive Beta.exe` 1.0.0.4. **The richest managed source.** |
| `aria/ghidra manual/mouse driver exe.csv` | Ghidra defined-strings export of the exe. |
| `aria/ghidra manual/costura32.hidusb32.dll` (114,688) / `costura64.hidusb.dll` (145,408) | Costura-embedded native libraries. The 32-bit copy has the same hash as the earlier `%TEMP%\fantech-hidusb32.dll`. |
| `aria/costura64.hidusb.dll.txt` | 6.7 MB Ghidra *listing* (disassembly) of the 64-bit DLL; no pseudocode. |
| `aria/{usbserver,usbfinder,dataparser32,macrokeydriver,costuraassemblyloader}.txt` | Single-class C# exports (subsets of `Mouse-Drive-Beta.cs`). |
| `aria/aria 2 pro.exe` (5,843,860) | **Official Inno Setup installer.** Contains `Mouse Drive Beta.exe` (SHA-256 `f59265cd…5832`, matching the earlier report), `Config.ini`, `Language/*.xml`, `driver_sensor.h`, `Description.xml`. |
| `aria/*.pcapng` (9) | Second, targeted capture set (2026-10-23 19:15–19:25 local): button remap, debounce, macro autoclick "cycle until release", cycle until key pressed / this key pressed, receiver LED ×3, DPI stages with colours, DPI colour red→blue→red. |
| `aria/aria-ii-pro-capture-2026-10-23-rev2/before/{before edit,button remap,debounce}.bin` | Official profile exports (64-byte header + 10,428-byte map). `after/` is empty. |
| `aria/screenshoots/*.png` (4) | Official app: profile dropdown 1–4, DPI page, Macro Manager, Settings page. |

### 2.3 Analysis tooling actually used in this audit
* TShark 4.x (installed in the cloud workspace). Every capture was decoded; transcripts are in `docs/evidence/CAPTURE_TRANSCRIPTS.txt`. TShark is not installed on the Arch machine, so all capture work ran on staged copies.
* Ghidra 11.4.2 headless (cloud workspace) on a copy of `costura32.hidusb32.dll`. Full decompilation succeeded; cited functions are in `docs/evidence/HIDUSB32_NATIVE_EXCERPTS.c`. The existing Ghidra projects were not opened or modified.
* innoextract on a copy of `aria/aria 2 pro.exe`. Text resources were copied into `aria/analysis/installer-extract/`.
* The REA analysis provider was not used, and no capture analysis is attributed to it.

## 3. What `aria/` actually is
It is the Windows-side working directory of the previous agent (`C:\Users\Goolagoon\aria\`), copied into this workspace. It holds a second, independent WebHID app and the static and runtime evidence behind `aria/analysis/allcapture-nwex-analysis.md`. Its reports are later and more accurate than the root reports (they use the flash-address model and managed IL). They contain three errors that this audit corrects: the 0x14/0x16 byte offsets, the receiver-LED mode mapping, and "stage 2 vs stage 3" naming.

## 4. Chronology (from mtimes and content, no VCS)
1. 06:20–07:08 local: first captures and screenshots in `windows-capture/`.
2. 06:19 local (`OLD-README.md`), then 08:10–11:01 local: `udev/`, `docs/`, root `README.md`, `AUDIT-REPORT.md`, `HANDOFF_REPORT.md`, `index.html.bak`, `styles.css`, then `index.html`. These are built on capture-only interpretation.
3. 17:15–19:05 local (`aria/` mtimes 10:15–12:05 UTC): Windows agent IL dumps, Ghidra attempts, observation-driven `aria-ii-pro-webhid`, reports.
4. 19:12–20:36 local: second capture set, rev2 exports, screenshots, Ghidra "manual" project, C# export, DLL extractions.

The root SPA therefore predates every finding in `aria/`, and nothing in the root was updated afterwards.

## 5. Overlaps and conflicts

### 5.1 Two WebHID implementations
| Aspect | Root `index.html` | `aria/aria-ii-pro-webhid/app.js` | Correct (ledger) |
|---|---|---|---|
| Polling codes | `0x01=125 … 0x08=1000` (inverted) | `8=125 … 1=1000` ✓ | §5.1 |
| "DPI stage select" | sends `0x16` = **Long distance** with the stage index (values 0–5) | flash `0x04` ✓ | §4 |
| "DPI stage count" | sends `0x14` = **receiver LED mode** with 1–6 | flash `0x02` ✓ | §4 |
| DPI values | preview only, hard-coded 6 stages | read/write with auto readback ✓ | §5.2 |
| Battery | reads body[9] (voltage low byte) as % | not implemented | §8 |
| `0x04` parse | body[7] (voltage high byte) interpreted as a polling code; a `0x10` byte sets the UI to 2000 Hz/Corded | — | §8 |
| Firmware | `resp[5].resp[6]` decimal ("2.25") | — | `v2.19` |
| Response matching | first input report with ID 0x08 | address/length match ✓ | §2.3 |
| Buttons | DPI Loop sent as `05 00 00` without its shortcut block | — | `02 01 00` |
| Peak duration | 3/5/10/15/30/60/90 "min" | XML values ✓ | §4 |
| Profiles | 3 | 4 ✓ (no readback) | 4, readback `0x0E` |
| `0x14`/`0x16` frame | wrong (see above) | `body[3]=0x0A, body[4]=value` ✗ | `body[4]=0x0A, body[5]=value` |
| Receiver LED labels | — | 1 = low battery, 2 = connection, 3 = battery ✗ | 1 = connection, 2 = battery, 3 = only warning |

### 5.2 Reports
* Root `AUDIT-REPORT.md`, `HANDOFF_REPORT.md`, `README.md`, `docs/protocol-analysis.md` share one superseded model (register names `0xXX02`, inverted polling, 0x14/0x16 as DPI, 0xAD as "sleep or LOD", `05 00` as DPI Loop).
* `aria/analysis/*.md` and `aria/README-NEXT-AGENT.md` use the correct flash model but carry the errors in §3.
* All contradictions are tabulated in `EVIDENCE_LEDGER.md` §9.

### 5.3 Duplicate or mislabeled evidence files (identical SHA-256)
* `ReadBatteryLevel.il.txt` = `UsbServer.ReadBattery.il.txt`; `GetDeviceBatteryStatus.il.txt` = `DataParser.BatteryStatus.il.txt`; `ProtocolParser.il.txt` = `DataParser.ProtocolParser.il.txt`; `Update.il.txt` = `DataParser.Update.il.txt`; `UpdateDPI.current.il.txt` = `DPIControl.UpdateDPI.il.txt`; `UpdateFlash.il.txt` = `CustomKeyFunction.UpdateFlash.il.txt`; `UpdataUSBData{,.current}.il.txt`; `UpdateFlashDataMap_ValueChange{,.current}.il.txt`; `customCheckBox_MovingCloseLight_CheckChange` = `FormMain.MovingCloseLightChanged`; `customComboBox_Config_OnSelectedIndexChanged` = `FormMain.ProfileChanged`; `Advanced.DongleLEDChanged` = `Advanced.DongleRGB_LEDChange`; `Advanced.LongRange.Click` = `Advanced.LongRangeChanged`.
* **Mislabeled:** `ValueToDPI.il.txt` has the same content as `FormAdvancedSetting_AdvancedChange.il.txt` and `FormMain.AdvancedChanged.il.txt`; it is not `ValueToDPI`. The real body is `ValueToDPI.current.il.txt` (7,444 bytes).
* `aria/analysis/ghidra/ExportEvidence.java` = `ghidra_scripts/ExportEvidence.java`.
* `assets/front.webp` = `assets/mouse1.webp`.

## 6. Referenced but missing
| Referenced file | Referenced by | Impact |
|---|---|---|
| `C:\Users\Goolagoon\Downloads\allcapture.pcapng` (SHA-256 `93A6D9DD…96B1DD`) | `aria/analysis/allcapture-nwex-analysis.md` | Its frame numbers cannot be re-checked here. Every feature it covered is independently covered by other captures, except the one `0x14`/`4E 4E 00 B9` DPI write and the `0x30 93 AC EE 28` colour write. |
| `nwex.bin`, `export.bin` | same + `observation-2-export-bin.md` | Superseded by the three rev2 exports, which are present. |
| `aria-ii-pro-hid-observation (1)…(7).json` | `aria/analysis/*.md` | The only browser runtime evidence (DPI persistence, read path). Recommended: copy into `aria/analysis/observations/`. |
| `Device1_log.txt` (SHA-256 `C3AA85E1…E283`) | same | Source of the battery callback payloads and log↔frame correlations; not re-checkable. |
| `Device_Info/Device_CID13_MID8.bin` | same | Not needed (equivalent to an export map). |
| Standalone `Mouse Drive Beta.exe`, `Config.ini`, `Language/*.xml`, `Description.xml`, `driver_sensor.h` | prompt, earlier reports | **Recovered** from the installer present in `aria/`. Copies are in `aria/analysis/installer-extract/`. |
| `analysis/allcapture-nwex-analysis.md` (path as written in the task) | task prompt | Exists at `aria/analysis/allcapture-nwex-analysis.md`. |
| `docs/reverse-engineering.md`, `check-static-site.py`, `.github/workflows/pages.yml`, `app.js` (root) | `OLD-README.md` | Belong to an older project variant; absent. |
| `.ghidra-appdata`, `.ghidra-local` | task prompt | Not present in this workspace; nothing to exclude. |

## 7. Originals that must remain untouched
* All captures (`windows-capture/usb-captures/*.pcapng`, `aria/*.pcapng`), exports (`aria/aria-ii-pro-capture-2026-10-23-rev2/**`), screenshots, the installer `aria/aria 2 pro.exe`, the DLLs in `aria/ghidra manual/`, `Mouse-Drive-Beta.cs`, all `aria/analysis/*.il.txt`, both Ghidra project directories, and `aria/costura64.hidusb.dll.txt`. Integrity can be checked against `docs/evidence/SHA256SUMS-baseline.txt`.
* Historical reports: `AUDIT-REPORT.md`, `HANDOFF_REPORT.md`, `OLD-README.md`, `aria/README-NEXT-AGENT.md`, `aria/WINDOWS-CAPTURE-CHECKLIST.md`, `aria/analysis/*.md`.
* Implementation files (`index.html`, `index.html.bak`, `styles.css`, `aria/aria-ii-pro-webhid/*`) are frozen during this phase per the stop condition.

## 8. Files created or changed by this audit
* `docs/WORKSPACE_AUDIT.md`, `docs/EVIDENCE_LEDGER.md`, `docs/FEATURE_MATRIX.md`, `docs/OPEN_QUESTIONS.md`, `docs/IMPLEMENTATION_READINESS.md` (new).
* `docs/evidence/SHA256SUMS-baseline.txt`, `docs/evidence/CAPTURE_TRANSCRIPTS.txt`, `docs/evidence/HIDUSB32_NATIVE_EXCERPTS.c` (new).
* `aria/analysis/installer-extract/{Config.ini,0-English.xml,driver_sensor.h,Description.xml}` (new; extracted from the installer).
* `docs/protocol-analysis.md`: a supersession notice was **prepended**. The original text below it is unchanged.

No HTML, CSS or JavaScript file was modified.

## 9. Directories inspected and files read
Every directory under the root was listed recursively. Read in full or in the relevant parts: all root reports and docs, both `index.html` files (protocol sections), `aria/aria-ii-pro-webhid/{app.js,index.html,README.md}`, all `aria/*.md` and `aria/analysis/*.md`, `aria/ghidra manual/Mouse-Drive-Beta.cs` (DriverLib, FormMain handlers, `_3In1`, `DPIControl`, `CustomKeyFunction`, `KeyDebounce`, `UC_*`, `FormPair`, `FormCalibration`, `BatteryHandle`, `ValueConvert`, `DriveConfig`), `aria/analysis/ghidra/script-run.log`, all 19 PCAPNG files (decoded), the 3 `.bin` exports, all 12 screenshots plus `ui.png`, and the installer's `Config.ini`, `0-English.xml`, `driver_sensor.h`, `Description.xml`. The `.il.txt` files were hashed and spot-checked; their methods are covered by the full C# export. The 6.7 MB 64-bit listing was sampled only, because the 32-bit DLL was fully decompiled instead.

**Artifacts not parsed, with reason:** Ghidra `.rep` databases (binary project stores; superseded by fresh decompilation); `mouse driver exe.csv` (string table, sampled only); 64-bit DLL (not decompiled, because the managed code selects identical exports for both architectures).
