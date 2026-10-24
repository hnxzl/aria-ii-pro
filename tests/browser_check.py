"""Headless browser check against the WebHID simulator (tests/mock-hid.js).

Usage (from the project root, with Playwright for Python installed):
    python3 -m http.server 8765 &   # any static server
    python3 tests/browser_check.py http://127.0.0.1:8765/ [screenshot-dir]

It drives the real UI and asserts that every interaction produced the expected
frames on the (simulated) wire and that the UI shows the value read back.
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/"
OUT = sys.argv[2] if len(sys.argv) > 2 else "."
MOCK = open(os.path.join(os.path.dirname(__file__), "mock-hid.js")).read()
fails, passes = [], 0

def check(name, cond, info=""):
    global passes
    if cond:
        passes += 1
    else:
        fails.append(f"{name} {info}")
        print("FAIL", name, info)

def frames(page, op=None):
    log = page.evaluate("window.__mock.log")
    return [f for f in log if op is None or f[0] == op]

def hexs(f):
    return " ".join(f"{x:02x}" for x in f)

with sync_playwright() as p:
    exe = "/opt/pw-browsers/chromium" if os.path.exists("/opt/pw-browsers/chromium") else None
    b = p.chromium.launch(executable_path=exe) if exe and os.path.isfile(exe) else p.chromium.launch()
    page = b.new_page(viewport={"width": 1560, "height": 940})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.add_init_script(MOCK)
    page.goto(URL)
    page.wait_for_timeout(400)
    page.screenshot(path=os.path.join(OUT, "01-disconnected.png"))
    check("connect box visible", page.is_visible("#btnPair"))

    page.click("#btnPair")
    page.wait_for_selector("body.is-connected", timeout=8000)
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, "02-connected-performance.png"))
    reads = frames(page, 0x08)
    check("full flash read 0x00..0xBF", len([f for f in reads if ((f[2] << 8) | f[3]) <= 0xBE]) >= 20, str(len(reads)))
    check("GetCurrentConfig sent", len(frames(page, 0x0E)) >= 1)
    check("battery requested", len(frames(page, 0x04)) >= 1)
    check("battery % from voltage (4055 mV → 88)", page.inner_text("#battPct").strip() == "88%", page.inner_text("#battPct"))
    cards = page.locator("#homeFacts .stat-card")
    check("4 status cards", cards.count() == 4)
    txt = [cards.nth(i).inner_text().replace("\n", " ") for i in range(4)]
    check("card Firmware v2.19", "FIRMWARE" in txt[0].upper() and "v2.19" in txt[0], str(txt))
    check("card Connection 2.4 GHz Receiver", "2.4 GHz Receiver" in txt[1], str(txt))
    check("card Polling 1000 Hz", "1000 Hz" in txt[2], str(txt))
    check("card Active DPI 800 · Stage 2 of 4", "800 DPI" in txt[3] and "Stage 2/4" in txt[3], str(txt))
    grid_cols = page.evaluate("getComputedStyle(document.getElementById('homeFacts')).gridTemplateColumns.split(' ').length")
    check("status grid is 2 columns", grid_cols == 2, str(grid_cols))
    heights = page.evaluate("[...document.querySelectorAll('#homeFacts .stat-card')].map(e => e.getBoundingClientRect().height)")
    check("status cards equal height", max(heights) - min(heights) < 1.5, str(heights))
    overflow = page.evaluate("[...document.querySelectorAll('#homeFacts .stat-val')].some(e => e.scrollWidth > e.clientWidth + 1)")
    check("no clipped status values", not overflow)
    check("debounce disabled until enabled", page.locator("#debounceInput").is_disabled() and page.locator("#debouncePlus").is_disabled())
    check("debounce shows mouse value 8", page.input_value("#debounceInput") == "8")
    check("4 DPI chips", page.locator(".dpi-chip").count() == 4)
    check("stage 2 active (currentDPI=1)", "active" in page.get_attribute("#dpiChip1", "class"))
    check("pills show DPI Loop", "DPI Loop" in page.inner_text("#btnPills"))
    check("1000 Hz active", page.locator("#pollingRate .seg-btn.active").inner_text().strip() == "1K")

    # polling rate → 2000 Hz: one 0x07 to 0x00 and readback; Mode becomes Corded; no 0xB9 write
    n0 = len(page.evaluate("window.__mock.log"))
    page.click("#pollingRate .seg-btn[data-val='16']")
    page.wait_for_timeout(300)
    new = page.evaluate("window.__mock.log")[n0:]
    check("rate write frame", any(hexs(f).startswith("07 00 00 00 02 10 45") for f in new), str([hexs(f) for f in new]))
    check("rate readback", any(hexs(f).startswith("08 00 00 00 02") for f in new))
    check("no 0xB9 write on 2K", not any(f[0] == 7 and f[3] == 0xB9 for f in new))
    check("Corded shown", page.locator("#modeSelect .seg-btn.active").inner_text().strip() == "Corded")
    check("Home polling card follows readback (2000 Hz)", "2000 Hz" in page.locator("#homeFacts .stat-card").nth(2).inner_text())
    check("write status verified", "verified" in page.inner_text("#writeStatus"))
    page.click("#pollingRate .seg-btn[data-val='1']")
    page.wait_for_timeout(300)

    # DPI: type 1650 into stage editor of stage 2
    page.fill("#dpiInput", "1650")
    page.dispatch_event("#dpiInput", "change")
    page.wait_for_timeout(400)
    new = page.evaluate("window.__mock.log")
    check("DPI 1650 write 0x10", any(hexs(f).startswith("07 00 00 10 04 20 20 00 15") for f in new))
    check("DPI chip shows 1650", "1650" in page.inner_text("#dpiChip1"))
    check("Home DPI card matches active chip", "1650 DPI" in page.locator("#homeFacts .stat-card").nth(3).inner_text() and "Stage 2" in page.locator("#homeFacts .stat-card").nth(3).inner_text())

    # stage count 4 → 3 while stage 2 active: no swap needed
    page.click("#stageStepper button >> nth=0")
    page.wait_for_timeout(400)
    check("stage count write", any(hexs(f).startswith("07 00 00 02 02 03 52") for f in page.evaluate("window.__mock.log")))
    check("3 chips", page.locator(".dpi-chip").count() == 3)
    page.click("#stageStepper button >> nth=1")
    page.wait_for_timeout(400)

    # Sensor tab
    page.click("[data-tab='perf']")
    page.wait_for_timeout(100)
    page.screenshot(path=os.path.join(OUT, "03-sensor.png"))
    # Debounce stepper (Customize panel)
    n0 = len(page.evaluate("window.__mock.log"))
    page.evaluate("document.getElementById('debouncePlus').click()")  # disabled: must do nothing
    page.wait_for_timeout(900)
    check("no write while debounce disabled", not any(f[0] == 7 and f[3] == 0xA9 for f in page.evaluate("window.__mock.log")[n0:]))
    page.check("#debounceGate")
    check("stepper enabled after tick", not page.locator("#debounceInput").is_disabled())
    for _ in range(3):
        page.click("#debounceMinus")
    check("draft value 5 shown before write", page.input_value("#debounceInput") == "5" and "Unsaved" in page.inner_text("#debounceHint"))
    page.wait_for_timeout(1100)
    log = page.evaluate("window.__mock.log")[n0:]
    dw = [hexs(f)[:20] for f in log if f[0] == 7 and f[3] == 0xA9]
    check("three clicks → one debounce write of 5", dw == ["07 00 00 a9 02 05 50"], str(dw))
    check("debounce readback", any(hexs(f).startswith("08 00 00 a9 02") for f in log))
    check("gate re-collapsed after write (official)", not page.is_checked("#debounceGate"))
    check("stepper shows confirmed 5", page.input_value("#debounceInput") == "5")
    page.check("#debounceGate")
    page.fill("#debounceInput", "25")
    page.press("#debounceInput", "Enter")
    page.wait_for_timeout(300)
    check("out-of-range 25 rejected, not written", not any(f[0] == 7 and f[3] == 0xA9 and f[5] == 25 for f in page.evaluate("window.__mock.log")) and page.input_value("#debounceInput") == "5")
    page.fill("#debounceInput", "20")
    page.press("#debounceInput", "Enter")
    page.wait_for_timeout(400)
    check("typed 20 written", any(hexs(f).startswith("07 00 00 a9 02 14 41") for f in page.evaluate("window.__mock.log")))
    page.check("#debounceGate")
    check("plus disabled at 20", page.locator("#debouncePlus").is_disabled())
    page.fill("#debounceInput", "0")
    page.dispatch_event("#debounceInput", "input")
    page.uncheck("#debounceGate")
    page.wait_for_timeout(900)
    check("unticking discards the draft", page.input_value("#debounceInput") == "20" and not any(f[0] == 7 and f[3] == 0xA9 and f[5] == 0 for f in page.evaluate("window.__mock.log")))
    page.screenshot(path=os.path.join(OUT, "03b-debounce.png"))
    page.click("[data-tab='sensor']")
    check("peak duration disabled while peak off", page.locator("#peakDuration").is_disabled())
    page.check("#peakPerf")
    page.wait_for_timeout(300)
    check("peak on written", any(hexs(f).startswith("07 00 00 b5 02 01 54") for f in page.evaluate("window.__mock.log")))
    check("peak duration enabled", not page.locator("#peakDuration").is_disabled())
    page.select_option("#peakDuration", "90")
    page.wait_for_timeout(300)
    check("peak 15 min = 0x5A", any(hexs(f).startswith("07 00 00 b7 02 5a fb") for f in page.evaluate("window.__mock.log")))
    page.check("#angleSnap")
    page.wait_for_timeout(300)
    check("angle snapping → 0xAF", any(hexs(f).startswith("07 00 00 af 02 01 54") for f in page.evaluate("window.__mock.log")))
    check("LOD shows only 1/2 mm", page.locator("#lodControl .seg-btn").count() == 2)

    # Lighting & Power
    page.click("[data-tab='perf']")
    page.wait_for_timeout(100)
    check("brightness disabled in Flicker", page.locator("#brightnessRange").is_disabled())
    page.click("#ledEffect .seg-btn[data-val='1']")
    page.wait_for_timeout(300)
    check("fixed light → mode 1", any(hexs(f).startswith("07 00 00 4c 02 01 54") for f in page.evaluate("window.__mock.log")))
    check("brightness enabled in Fixed", not page.locator("#brightnessRange").is_disabled())
    n0 = len(page.evaluate("window.__mock.log"))
    page.click("#ledEffect .seg-btn[data-val='0']")
    page.wait_for_timeout(300)
    new = page.evaluate("window.__mock.log")[n0:]
    check("Off writes only enable=0", [hexs(f)[:20] for f in new if f[0] == 7] == ["07 00 00 52 02 00 55"], str([hexs(f) for f in new if f[0] == 7]))
    page.click("[data-tab='settings']")
    labels = page.evaluate("[...document.querySelectorAll('#sleepSelect option')].map(o => [o.value, o.textContent])")
    expect = [["1", "10 seconds"], ["3", "30 seconds"], ["6", "1 minute"], ["30", "5 minutes"], ["60", "10 minutes"], ["90", "15 minutes"], ["120", "20 minutes"], ["150", "25 minutes"], ["180", "30 minutes"], ["210", "35 minutes"], ["240", "40 minutes"]]
    check("sleep options = official values + labels", labels == expect, str(labels))
    check("sleep shows mouse value 10 minutes", page.input_value("#sleepSelect") == "60" and "register value 60" in page.inner_text("#sleepState"))
    for val, _ in expect:
        n0 = len(page.evaluate("window.__mock.log"))
        page.select_option("#sleepSelect", val)
        page.wait_for_timeout(250)
        v = int(val)
        w = [f for f in page.evaluate("window.__mock.log")[n0:] if f[0] == 7]
        check(f"sleep {val} serialized", len(w) == 1 and w[0][3] == 0xAD and w[0][5] == v and w[0][6] == (0x55 - v) & 255, str([hexs(f) for f in w]))
    page.select_option("#sleepSelect", "120")
    page.wait_for_timeout(250)
    check("sleep confirmed 20 minutes", "20 minutes (register value 120)" in page.inner_text("#sleepState"))
    page.screenshot(path=os.path.join(OUT, "04-lighting-power.png"))

    # Receiver
    page.click("[data-tab='settings']")
    page.wait_for_timeout(100)
    page.check("#longDistance")
    page.wait_for_timeout(300)
    check("long distance frame", any(hexs(f).startswith("16 00 00 00 0a 01") for f in page.evaluate("window.__mock.log")))
    check("long distance readback 0x17", len(frames(page, 0x17)) >= 2)
    page.click(".radio-card:has(input[value='3'])")
    page.wait_for_timeout(300)
    check("receiver LED mode 3", any(hexs(f).startswith("14 00 00 00 0a 03") for f in page.evaluate("window.__mock.log")))
    check("LED card 3 active", "active" in page.locator(".radio-card").nth(2).get_attribute("class"))
    page.screenshot(path=os.path.join(OUT, "05-receiver.png"))

    # Button picker: Forward (k4) → DPI Loop, then Mute
    page.click(".btn-pill:has-text('Forward')")
    page.wait_for_timeout(150)
    page.screenshot(path=os.path.join(OUT, "06-picker.png"))
    page.click("#btnPicker .pick-chip:has-text('DPI Loop')")
    page.wait_for_timeout(300)
    check("Forward slot k4 = DPI Loop", any(hexs(f).startswith("07 00 00 70 04 02 01 00 52") for f in page.evaluate("window.__mock.log")))
    page.click(".btn-pill >> nth=4")
    page.wait_for_timeout(150)
    page.select_option("#pickMedia", str(0xE2))
    page.click("#btnPicker [data-set='media']")
    page.wait_for_timeout(400)
    log = page.evaluate("window.__mock.log")
    check("Mute block at 0x180", any(hexs(f).startswith("07 00 01 80 08 02 82 e2 00 42 e2 00 cb") for f in log))
    check("Mute entry at 0x70", any(hexs(f).startswith("07 00 00 70 04 05 00 00 50") for f in log))
    check("pill shows Mute", "Mute" in page.inner_text("#btnPills"))
    page.click(".btn-pill >> nth=1")  # Left (locked)
    page.wait_for_timeout(100)
    check("Left button locked", "kept as Left" in page.inner_text("#btnPicker"))
    page.click("#btnPicker [data-close]")

    # Macro manager: insert a click pair twice, save, write to button 4 (k4) until released
    page.click("#macroBtn")
    page.wait_for_timeout(200)
    page.fill("#mName", "cycle releas")
    page.dispatch_event("#mName", "input")
    for _ in range(3):
        page.click("button:has-text('Insert Action')")
    page.click("button:has-text('Save')")
    page.wait_for_timeout(100)
    page.select_option("#mButton", "4")
    page.click("#mWrite")
    page.wait_for_timeout(1200)
    log = page.evaluate("window.__mock.log")
    w = [hexs(f) for f in log if f[0] == 7 and ((f[2] << 8) | f[3]) >= 0x900 and ((f[2] << 8) | f[3]) < 0x940]
    check("macro chunk 0x900", any(x.startswith("07 00 09 00 0a 0c 63 79 63 6c 65 20 72 65 6c") for x in w), str(w))
    check("macro last chunk 0x93C", any(x.startswith("07 00 09 3c 03 00 0a b5") for x in w), str(w))
    check("macro binding 06 04 fe", any(hexs(f).startswith("07 00 00 70 04 06 04 fe 4d") for f in log))
    page.screenshot(path=os.path.join(OUT, "07-macros.png"))
    check("on-mouse list shows macro", "cycle releas" in page.inner_text("#mMouse"))

    # Profile switch → 0x0F, 0x0E, full re-read
    n0 = len(page.evaluate("window.__mock.log"))
    page.click("#profileSwitch [data-profile='2']")
    page.wait_for_timeout(1500)
    new = page.evaluate("window.__mock.log")[n0:]
    check("SetCurrentConfig 2", any(hexs(f).startswith("0f 00 00 00 01 02") for f in new))
    check("re-read after switch", len([f for f in new if f[0] == 8]) >= 20)
    check("profile 3 active", page.locator("#profileSwitch .seg-btn.active").inner_text().strip() == "3")
    check("profile 3 has factory Forward", "Forward" in page.inner_text("#btnPills"))
    page.screenshot(path=os.path.join(OUT, "08-profile3.png"))

    # Notification: DPI button pressed on the mouse (0x0A bit0) → re-read 0x02
    page.evaluate("""() => { const m = window.__mockProfiles[window.__mock.profile]; m[4] = 3; m[5] = 0x52;
      const b = new Uint8Array(16); b.set([0x0a,0,0,0,0x0a,0x01]); let s=0; for (let i=0;i<15;i++) s+=b[i]; b[15]=(0x4d-s)&255; window.__mockDevice._emit(b); }""")
    page.wait_for_timeout(600)
    check("0x0A bit0 → active stage 4 shown", "active" in page.get_attribute("#dpiChip3", "class"))

    # Stage count 4 → 3 while stage 4 is active: official swap (M:29909)
    page.click("[data-tab='perf']")
    n0 = len(page.evaluate("window.__mock.log"))
    page.click("#stageStepper button >> nth=0")
    page.wait_for_timeout(800)
    new = [hexs(f)[:26] for f in page.evaluate("window.__mock.log")[n0:] if f[0] == 7]
    exp_sw = ["07 00 00 02 02 03 52", "07 00 00 04 02 02 53", "07 00 00 14 04 3f 3f 00 d7", "07 00 00 34 04 ff 00 ff 57", "07 00 00 18 04 1f 1f 00 17", "07 00 00 38 04 00 ff 00 56"]
    check("swap writes in official (native diff) order", len(new) == 6 and all(new[k].startswith(exp_sw[k]) for k in range(6)), str(new))
    check("stage 3 now active with 3200", "active" in page.get_attribute("#dpiChip2", "class") and "3200" in page.inner_text("#dpiChip2"))

    # Export → official .bin; re-importing the same file must find nothing to write
    page.click("[data-tab='settings']")
    with page.expect_download() as dl:
        page.click("#panelRight button:has-text('Export')")
    exp = dl.value.path()
    data = open(exp, "rb").read()
    check("export is 10,492 bytes", len(data) == 10492, str(len(data)))
    check("export header Compx Inc / 3395", data[:9] == b"Compx Inc" and data[32:36] == b"3395")
    n0 = len(page.evaluate("window.__mock.log"))
    page.set_input_files("#profileFileInput", exp)
    page.wait_for_timeout(300)
    page.click("#modalCard [data-act='go']")
    page.wait_for_timeout(2500)
    new = page.evaluate("window.__mock.log")[n0:]
    fw = [hexs(f)[:14] for f in new if f[0] == 7 and ((f[2] << 8) | f[3]) < 0x100]
    check("re-import of own export writes no settings", fw == [], str(fw))
    check("re-import done message", "Done:" in page.inner_text("#modalProgress"), page.inner_text("#modalProgress"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    # Import the official export.bin from the workspace (if available)
    official = os.environ.get("ARIA_EXPORT_BIN", os.path.join(os.path.dirname(__file__), "..", "export.bin"))
    if os.path.exists(official):
        n0 = len(page.evaluate("window.__mock.log"))
        page.set_input_files("#profileFileInput", official)
        page.wait_for_timeout(300)
        page.click("#modalCard [data-act='go']")
        page.wait_for_timeout(2500)
        new = page.evaluate("window.__mock.log")[n0:]
        check("import wrote 2000 Hz", any(hexs(f).startswith("07 00 00 00 02 10 45") for f in new))
        check("import wrote 1 stage", any(hexs(f).startswith("07 00 00 02 02 01 54") for f in new))
        check("import result shown", "1 DPI" not in page.inner_text("#modalCard") and page.locator(".dpi-chip").count() == 1)
        check("import re-read the mouse", len([f for f in new if f[0] == 8]) >= 20)
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)

    # Indonesian
    page.click(".lang-switch [data-lang='id']")
    page.wait_for_timeout(200)
    check("ID translation", "performa" in page.inner_text("#settingsTabs").lower())
    page.screenshot(path=os.path.join(OUT, "09-indonesian.png"))
    page.click(".lang-switch [data-lang='en']")

    # Diagnostics
    page.click("button:has-text('Diagnostics')")
    page.wait_for_timeout(200)
    check("diagnostics lists traffic", "mismatches 0" in page.inner_text("#diagRows"))
    page.screenshot(path=os.path.join(OUT, "10-diagnostics.png"))
    page.keyboard.press("Escape")

    # Unplug → UI returns to the connect screen
    page.evaluate("""() => { const e = new Event('disconnect'); e.device = window.__mockDevice; navigator.hid.dispatchEvent(e); }""")
    page.wait_for_timeout(300)
    check("disconnect handled", not page.evaluate("document.body.classList.contains('is-connected')") and page.is_visible("#btnPair"))
    # Receiver present but mouse off → waiting state, no config reads
    page.evaluate("window.__mock.online = false")
    n0 = len(page.evaluate("window.__mock.log"))
    page.click("#btnPair")
    page.wait_for_timeout(600)
    check("offline mouse: waiting message", "off or asleep" in page.inner_text("#heroNote"))
    check("offline mouse: no flash reads", not any(f[0] == 8 for f in page.evaluate("window.__mock.log")[n0:]))
    page.evaluate("window.__mock.online = true")
    page.wait_for_timeout(2600)
    check("mouse wakes → configuration read", page.evaluate("document.body.classList.contains('is-connected')"))

    # Mouse falls asleep (0x03 → 0, 0x04 unanswered): keep UI, block writes, re-read on wake
    page.evaluate("window.__mock.online = false")
    page.wait_for_timeout(5600)
    check("asleep: UI kept, marked asleep", page.evaluate("document.body.classList.contains('is-asleep') && document.body.classList.contains('is-connected')"))
    check("asleep: chip says so", "asleep" in page.inner_text("#connChip").lower())
    n0 = len(page.evaluate("window.__mock.log"))
    page.evaluate("app.writeField('lod', 2, 'LOD')")
    page.wait_for_timeout(300)
    check("asleep: no write sent", not any(f[0] == 7 for f in page.evaluate("window.__mock.log")[n0:]))
    page.evaluate("window.__mock.online = true")
    page.wait_for_timeout(5800)
    check("woke: asleep cleared and configuration re-read", not page.evaluate("document.body.classList.contains('is-asleep')") and any(f[0] == 8 for f in page.evaluate("window.__mock.log")[n0:]))

    # Smaller viewports
    for w, h, name in [(1280, 800, "11-1280.png"), (820, 1000, "12-820-narrow.png"), (390, 844, "13-390-phone.png")]:
        page.set_viewport_size({"width": w, "height": h})
        page.wait_for_timeout(250)
        page.screenshot(path=os.path.join(OUT, name), full_page=True)
        hscroll = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
        check(f"no horizontal scroll at {w}px", not hscroll)
        clipped = page.evaluate("[...document.querySelectorAll('#homeFacts .stat-val')].some(e => e.scrollWidth > e.clientWidth + 1)")
        check(f"status values not clipped at {w}px", not clipped)
        cols = page.evaluate("getComputedStyle(document.getElementById('homeFacts')).gridTemplateColumns.split(' ').length")
        check(f"2×2 grid kept at {w}px", cols == 2)
    page.set_viewport_size({"width": 1560, "height": 940})
    page.wait_for_timeout(200)

    # Destructive commands never sent during the run
    log = page.evaluate("window.__mock.log")
    check("no ClearSetting / pairing sent", not any(f[0] in (0x05, 0x06, 0x09) for f in log))
    check("never wrote unparsed regions", not any(f[0] == 7 and (0x54 <= ((f[2] << 8) | f[3]) < 0x60 or ((f[2] << 8) | f[3]) == 0xBB) for f in log))

    # ── Mocked failure handling for button data writes (official order: record → data) ──
    EV = "[{kind:'mouse',down:true,code:1,delay:10},{kind:'mouse',down:false,code:1,delay:10}]"
    def assign(k, name):
        return page.evaluate(f"app.assignButton({k}, {{t:'macro', mode:'released', times:1}}, {{macro:{{name:'{name}', events:{EV}}}}})")
    def addr_writes(log, a):
        return [f for f in log if f[0] == 7 and ((f[2] << 8) | f[3]) == a]
    # retry: two lost echoes on the first macro chunk, then success
    page.evaluate("window.__mock.drop = {addr: 0x900, count: 2}")
    n0 = len(page.evaluate("window.__mock.log"))
    ok = assign(4, "retry")
    new = page.evaluate("window.__mock.log")[n0:]
    check("retry: write succeeds after 2 lost echoes", ok is True)
    check("retry: chunk 0x900 sent 3 times", len(addr_writes(new, 0x900)) == 3, str(len(addr_writes(new, 0x900))))
    w7 = [((f[2] << 8) | f[3]) for f in new if f[0] == 7]
    check("official order: record 0x70 before macro 0x900", w7.index(0x70) < w7.index(0x900), str(w7))
    check("retry: macro read back", any(f[0] == 8 and ((f[2] << 8) | f[3]) == 0x900 for f in new))
    # failure midway with a previous plain assignment (button 2 = Right): record rolled back
    page.evaluate("window.__mock.drop = {addr: 0x480 + 10, count: -1}")
    ok = assign(1, "breaks")
    page.evaluate("window.__mock.drop = null")
    mem = page.evaluate("Array.from(window.__mockProfiles[window.__mock.profile].slice(0x64, 0x68))")
    check("failure: assignButton reports failure", ok is False)
    check("failure: button 2 rolled back to Right Button", mem == [1, 2, 0, 0x52], str(mem))
    check("failure: status explains rollback", "previous assignment restored" in page.inner_text("#writeStatus"))
    check("failure: UI shows Right Button again", "Right Button" in page.locator(".btn-pill").nth(2).inner_text())
    # failure while replacing a macro on the same slot: old macro cannot be rewritten → factory function
    page.evaluate("window.__mock.drop = {addr: 0x900 + 10, count: -1}")
    ok = assign(4, "longer name xx")
    page.evaluate("window.__mock.drop = null")
    mem = page.evaluate("Array.from(window.__mockProfiles[window.__mock.profile].slice(0x70, 0x74))")
    check("failure on same slot: button 4 falls back to factory Forward", ok is False and mem == [1, 0x10, 0, 0x44], str(mem))
    check("failure on same slot: explained", "factory function" in page.inner_text("#writeStatus"))

    # ── Mocked pairing (receiver states 1, 1, 3) ──
    page.click("[data-tab='settings']")
    page.click("#receiverSection button:has-text('Pair')")
    page.click("#pairGo")
    page.wait_for_timeout(4500)
    log = page.evaluate("window.__mock.log")
    pe = [hexs(f) for f in log if f[0] == 5]
    check("pairing frame exactly as the official driver", pe == ["05 00 00 00 02 00 00 0d 00 00 00 00 00 00 00 39"], str(pe))
    check("pairing polls 0x06", len([f for f in log if f[0] == 6]) >= 3)
    check("pairing success reported", "reported success" in page.inner_text("#modalProgress"))
    page.screenshot(path=os.path.join(OUT, "14-pairing.png"))
    page.click("#pairClose")
    page.wait_for_timeout(300)
    # no ack to 0x05: official keeps polling; we must not claim success
    page.evaluate("window.__mock.pairAck = false; window.__mock.pairStates = []")
    page.click("#receiverSection button:has-text('Pair')")
    page.click("#pairGo")
    page.wait_for_timeout(9000)
    check("unacknowledged pairing keeps polling", "no answer to the pairing request" in page.inner_text("#modalProgress"))
    page.click("#pairClose")
    page.wait_for_timeout(1500)
    page.evaluate("window.__mock.pairAck = true")
    # failure reported by the receiver, after an unknown status value (ignored, like FormPair)
    page.evaluate("window.__mock.pairStates = [9, 2]")
    page.click("#receiverSection button:has-text('Pair')")
    page.click("#pairGo")
    page.wait_for_timeout(3600)
    check("pairing failure (status 2) reported", "pairing failed" in page.inner_text("#modalProgress"))
    page.click("#pairClose")
    page.wait_for_timeout(1500)
    # cancel while waiting: never reported as success
    page.evaluate("window.__mock.pairStates = [1, 1, 1, 1, 1, 1, 1, 1]")
    page.click("#receiverSection button:has-text('Pair')")
    page.click("#pairGo")
    page.wait_for_timeout(1500)
    page.click("#pairClose")
    page.wait_for_timeout(2500)
    check("cancelled pairing not reported as success", "reported success" not in page.inner_text("#modalCard"))
    page.evaluate("window.__mock.pairStates = [1, 1, 3]")

    # ── Mocked Restore: official sequence ──
    page.evaluate("app.assignButton(4, {t:'media', usage:0xe2})")
    page.wait_for_timeout(300)
    n0 = len(page.evaluate("window.__mock.log"))
    page.click("#panelRight button:has-text('Restore')")
    page.check("#restoreAck")
    page.click("#restoreGo")
    page.wait_for_timeout(5000)
    new = page.evaluate("window.__mock.log")[n0:]
    ids = [f[0] for f in new]
    seq = [i for i in ids if i in (9, 0x16, 0x14)]
    check("restore order 09 → 16 → 14", seq[:3] == [9, 0x16, 0x14], str(seq))
    check("restore 16 01 / 14 02", any(hexs(f).startswith("16 00 00 00 0a 01") for f in new) and any(hexs(f).startswith("14 00 00 00 0a 02") for f in new))
    check("full re-read after ClearSetting", ids.index(8) > ids.index(0x14))
    check("restore clears used shortcut slot 4 with 00 ff", any(hexs(f).startswith("07 00 01 80 02 00 ff") for f in new))
    check("restore clears used macro slot 4", any(hexs(f).startswith("07 00 09 1e 03 ff 00 55") for f in new) and page.evaluate("window.__mockProfiles[window.__mock.profile][0x900]") == 0, str([hexs(f) for f in new if f[0] == 7][:8]))
    check("restore leaves factory values in UI", "Forward" in page.inner_text("#btnPills") and "1000 Hz" in page.locator("#homeFacts .stat-card").nth(2).inner_text())
    page.screenshot(path=os.path.join(OUT, "15-restore.png"))
    errors = [e for e in errors if "net::ERR" not in e]  # CDN fonts/Pickr unreachable in the sandbox
    check("no page errors", not errors, str(errors))
    b.close()

print(f"{passes} passed, {len(fails)} failed")
sys.exit(1 if fails else 0)
