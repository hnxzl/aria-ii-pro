# Aria II Pro Web Device Lab

Read-only browser HID inspection companion for Fantech Aria II Pro XD7v2P. Separate static-site project; no Aria XD7 commands reused.

## Design and workflow

UI now ports parent index.html and style.css directly: same fixed 1560×940 stage, centered Customize and right Performance panels, palace backdrop, glass panels, DPI/mouse hotspots, polling, lift-off, debounce, sleep and lighting controls. Only parent language/model selectors and XD7 runtime are removed. Controls remain inert/locked where Pro protocol is unverified. Connect Device stays in original center-panel position; it opens read-only descriptor inspection.

Connection remains read-only: HID descriptor metadata only; no reports sent and no settings changed.

Palace background, mouse render, Aria II Pro product image and Fantech mark are copied unchanged from parent source assets. Parent files remain untouched.

> **Safety:** Current build requests permission and inspects HID metadata only. It sends no HID reports and changes no settings. Polling, Peak Performance, macros, DPI, lighting, and remapping remain unavailable until Aria II Pro protocol framing is verified. Official code calls a checkbox `Full Performance`; static analysis indicates custom sensor-sleep enable/timeout fields, not a confirmed sensor performance mode. Those fields also remain disabled pending native serialization and device verification.

## Quick start
1. Use desktop Chromium (Chrome or Edge recommended; Firefox and Safari lack WebHID).
2. Open GitHub Pages over HTTPS or run locally from repository root:
   ```bash
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000`.
3. Attach mouse over USB or receiver. Click **Connect device**, choose matching device, then inspect descriptor metadata. No reports are sent.
4. Click **Disconnect** to close opened HID handle and return to the branded mouse view.

WebHID requires secure context: HTTPS or localhost. Permission request runs only after explicit Connect click. No backend, account, telemetry, configuration upload, or persistent device metadata.

## Device IDs and browser
| Device | VID:PID | Status |
|---|---|---|
| Aria II Pro XD7v2P wired mouse | `3554:f5a5` | chooser filter; not hardware-tested in this session |
| StrikeSpeed Pro 2.4 GHz receiver | `3554:f523` | chooser filter; not hardware-tested in this session |

Desktop Chromium intended. OS/browser permission must allow HID. Bluetooth configuration is not supported by this read-only tool.

### Linux
Chromium may need hidraw access. No Linux udev installer ships: existing Aria XD7 rules target different IDs and are not included or recommended. Diagnose OS/browser access if chooser sees device but open fails.

## Controls and troubleshooting
- **Connect Device:** parent center-panel button filters chooser to two investigation-listed IDs, opens selected device, and displays descriptor metadata only. No reports sent; wired VID:PID remains unverified.
- **Disconnect:** closes handle, hides configuration sections and returns to branded mouse view. Physical unplug updates status and returns to disconnected presentation.
- **Mouse mapping:** original parent button pills and mouse artwork retained. Clicking mapping targets cannot edit device; Pro assignment protocol unverified.
- **Performance:** original DPI, polling, lift-off, debounce, sleep and lighting layout retained from parent. Controls do not send device writes; unsupported settings stay disabled pending Pro validation.
- Profile and XD7 memory diagnostics removed.
- WebHID unavailable: use desktop Chrome/Edge and HTTPS/localhost.
- Permission/open failure: check chooser grant, OS device access, cable/receiver, and browser device log (`chrome://device-log`).
- Cancel chooser: remains disconnected; no device selected.

## Feature verification
| Feature | Status | Evidence / limitation |
|---|---|---|
| HID descriptor inspection | Implemented; browser-mocked | Metadata only; hardware not tested |
| Target VID/PIDs | Implemented | `3554:f5a5`, `3554:f523` from investigation notes |
| Polling 125–1000 Hz | Not offered | Native record-to-report path incomplete |
| Polling 2K/4K/8K | Not offered | Official UI tags exist; firmware acceptance unproven |
| Peak Performance, DPI, lighting, buttons, macros | Not offered | No verified Pro command mapping; never inherit XD7 commands |

## GitHub Pages
Project repository name: `aria-ii-pro-web`. `.github/workflows/pages.yml` publishes static allowlisted files; no framework build needed. Paths are relative and the static check stages a nested project URL.
1. Create separate repository `aria-ii-pro-web` or use approved target.
2. Place project contents at repository root, preserving workflow and complete `assets/` directory.
3. In Settings → Pages choose **GitHub Actions**.
4. Push to `main` after review, then inspect Actions and Pages URL. No push/deployment has happened yet.
Workflow scopes read access and Pages deploy permissions to the relevant jobs.

## Developer checks
Run from repository root:
```bash
node --check app.js
python3 check-static-site.py
```
The checker verifies local refs, duplicate IDs, absence of HID report APIs and native artifacts, stale legacy-file exclusion, allowlisted assets, and nested-path staging. Additional local checks parse the workflow, verify staged files and docs links, and confirm HTTP 200 for page, report and assets. They do not deploy or access hardware. A mocked WebHID path tested connect, metadata render, status and disconnect. Firefox headless captured desktop/mobile views; screenshots are not checked into the repository.

## Technical report
See [reverse-engineering report](docs/reverse-engineering.md) for certainty levels, native addresses, polling byte table, read/write distinction, implementation comparison and unknowns.

## Privacy
No credentials, logs, firmware, installer, DLL, decompilation or device memory are included. App requests access only after user click, reads WebHID descriptor metadata only, and invokes no HID report APIs. No third-party runtime dependency.
