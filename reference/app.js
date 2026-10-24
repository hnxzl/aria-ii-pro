
const VENDOR_ID = 0x3554,
  PID_PRO = 0xf523,
  PRODUCT_IDS = [PID_PRO],
  REPORT_OUT = 0x08,
  REPORT_IN = 0x09;

const T = (key, vars) => {
  if (window.I18n) return window.I18n.t(key, vars);
  let out = String(key);
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return out;
};
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));


const REG = {
  POLLING: 0x00, // 1=1000Hz 2=500 4=250 8=125
  STAGES: 0x02, // 1..7
  LOD: 0x0a, // 1=1mm 2=2mm
  DPI_BASE: 0x0c, // + i*4 -> raw, raw, 0x00, chk
  LED_COLOR_BASE: 0x2c, // + i*4 -> R, G, B, chk
  LED_EFFECT: 0x4c, // mode,~mode, bRaw,~bRaw, speed,~speed
  DEBOUNCE: 0xa9, // ms
  MOTION_SYNC: 0xab, // 0/1
  ANGLE_SNAP: 0xaf, // 0/1
  RIPPLE: 0xb1, // 0/1
  SLEEP: 0xb5, // 1=10s 2=20s 3=30s 6=1m 12=2m 30=5m 60=10m
};
const SLEEP_VALUES = [1, 2, 3, 6, 12, 30, 60];
const MEM_BASE = 0x0000;
const MEM_SIZE = 0x2000;


const BTN_TABLE = 0x60;
const BTN_DATA = 0x100;
const BUTTON_SLOTS = [
  { idx: 0, name: "Left Click", anchor: [40, 63], label: [3, 90], side: "l" },
  { idx: 1, name: "Right Click", anchor: [25, 41], label: [3, 13], side: "l" },
  { idx: 2, name: "Wheel Click", anchor: [29, 51], label: [3, 30], side: "l" },
  { idx: 3, name: "Back", anchor: [71, 51], label: [97, 78], side: "r" },
  { idx: 4, name: "Forward", anchor: [57, 60], label: [97, 92], side: "r" },

  { idx: 5, name: "DPI Button", under: true, anchor: [41, 79], label: [41, 93], side: "b" },
];
const DEFAULT_BUTTONS = [
  { t: "mouse", v: "left" },
  { t: "mouse", v: "right" },
  { t: "mouse", v: "middle" },
  { t: "mouse", v: "back" },
  { t: "mouse", v: "forward" },
  { t: "dpi", v: "loop" },
];
const MOUSE_MASK = { left: 0x01, right: 0x02, middle: 0x04, back: 0x08, forward: 0x10 };
const MOUSE_NAMES = {
  left: "Left Click",
  right: "Right Click",
  middle: "Middle Click",
  back: "Back",
  forward: "Forward",
};
const DPI_FN = { loop: 0x01, up: 0x02, down: 0x03 };
const WHEEL_NAMES = { up: "Wheel Up", down: "Wheel Down", left: "Tilt Left", right: "Tilt Right" };
const DPI_NAMES = { loop: "DPI Loop", up: "DPI +", down: "DPI −" };
const MEDIA_KEYS = [
  [0xcd, "Play / Pause"],
  [0xb7, "Stop"],
  [0xb6, "Previous Track"],
  [0xb5, "Next Track"],
  [0xe9, "Volume Up"],
  [0xea, "Volume Down"],
  [0xe2, "Mute"],
  [0x183, "Media Player"],
  [0x18a, "Email"],
  [0x192, "Calculator"],
  [0x194, "My Computer"],
  [0x221, "Web Search"],
  [0x223, "Web Home"],
  [0x224, "Web Back"],
  [0x225, "Web Forward"],
  [0x226, "Web Stop"],
  [0x227, "Web Refresh"],
  [0x22a, "Favorites"],
];
// KeyboardEvent.code -> HID keyboard usage
const HID_KEYS = (() => {
  const m = {};
  for (let i = 0; i < 26; i++) m["Key" + String.fromCharCode(65 + i)] = 0x04 + i;
  for (let i = 1; i <= 9; i++) m["Digit" + i] = 0x1d + i;
  m.Digit0 = 0x27;
  for (let i = 1; i <= 12; i++) m["F" + i] = 0x39 + i;
  for (let i = 13; i <= 24; i++) m["F" + i] = 0x5b + i;
  for (let i = 1; i <= 9; i++) m["Numpad" + i] = 0x58 + i;
  Object.assign(m, {
    Enter: 0x28, Escape: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c,
    Minus: 0x2d, Equal: 0x2e, BracketLeft: 0x2f, BracketRight: 0x30,
    Backslash: 0x31, Semicolon: 0x33, Quote: 0x34, Backquote: 0x35,
    Comma: 0x36, Period: 0x37, Slash: 0x38, CapsLock: 0x39,
    PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48, Insert: 0x49,
    Home: 0x4a, PageUp: 0x4b, Delete: 0x4c, End: 0x4d, PageDown: 0x4e,
    ArrowRight: 0x4f, ArrowLeft: 0x50, ArrowDown: 0x51, ArrowUp: 0x52,
    NumLock: 0x53, NumpadDivide: 0x54, NumpadMultiply: 0x55,
    NumpadSubtract: 0x56, NumpadAdd: 0x57, NumpadEnter: 0x58,
    Numpad0: 0x62, NumpadDecimal: 0x63, IntlBackslash: 0x64, ContextMenu: 0x65,
  });
  return m;
})();
const HID_KEY_NAMES = (() => {
  const n = {};
  for (const [code, usage] of Object.entries(HID_KEYS)) {
    n[usage] = code
      .replace(/^Key/, "")
      .replace(/^Digit/, "")
      .replace(/^Numpad(?=\d)/, "Num ")
      .replace(/^Arrow/, "")
      .replace(/^Numpad/, "Num ");
  }
  return n;
})();
const MOD_BITS = { ctrl: 1, shift: 2, alt: 4, win: 8 };

const ButtonCodec = {
  // action -> { entry: [b0,b1,b2], block?: number[] (without checksum) }
  encode(a) {
    switch (a?.t) {
      case "mouse":
        return { entry: [0x01, MOUSE_MASK[a.v] ?? 0x01, 0x00] };
      case "click":
        return { entry: [0x04, 0x32, a.n === 3 ? 3 : 2] };
      case "fire":
        return {
          entry: [
            0x04,
            Math.max(3, Math.min(255, a.speed | 0)),
            Math.max(0, Math.min(3, a.times | 0)),
          ],
        };
      case "dpi":
        return { entry: [0x02, DPI_FN[a.v] ?? 0x01, 0x00] };
      case "dpiLock": {
        const raw = Math.max(0, Math.min(255, Math.round(a.dpi / 50) - 1));
        return { entry: [0x0a, raw, 0x00] };
      }
      case "rgb":
        return { entry: [a.v === "cycle" ? 0x07 : 0x08, 0x00, 0x00] };
      case "wheel":
        // 0x0b = vertical wheel step, 0x03 = horizontal (tilt) — CompX enum
        return {
          entry: a.v === "left" || a.v === "right"
            ? [0x03, a.v === "left" ? 1 : 2, 0x00]
            : [0x0b, a.v === "down" ? 2 : 1, 0x00],
        };
      case "media": {
        const lo = a.usage & 0xff,
          hi = (a.usage >> 8) & 0xff;
        return { entry: [0x05, 0, 0], block: [2, 0x82, lo, hi, 0x42, lo, hi] };
      }
      case "key": {
    
        const ev = [];
        for (const bit of [1, 2, 4, 8]) if (a.mods & bit) ev.push([0x80, bit, 0]);
        if (a.key) ev.push([0x81, a.key, 0]);
        for (const bit of [1, 2, 4, 8]) if (a.mods & bit) ev.push([0x40, bit, 0]);
        if (a.key) ev.push([0x41, a.key, 0]);
        return { entry: [0x05, 0, 0], block: [ev.length, ...ev.flat()] };
      }
      case "macro":
      case "raw":
        return { entry: a.bytes.slice(0, 3) };
      case "off":
      default:
        return { entry: [0x00, 0x00, 0x00] };
    }
  },

  decode(e, block) {
    const [b0, b1, b2] = e;
    if (b0 === 0x00) return { t: "off" };
    if (b0 === 0x01) {
      const v = Object.keys(MOUSE_MASK).find((k) => MOUSE_MASK[k] === b1);
      if (v) return { t: "mouse", v };
    }
    if (b0 === 0x02) {
      const v = Object.keys(DPI_FN).find((k) => DPI_FN[k] === b1);
      if (v) return { t: "dpi", v };
    }
    if (b0 === 0x04) {
      if (b1 === 0x32 && (b2 === 2 || b2 === 3)) return { t: "click", n: b2 };
      return { t: "fire", speed: b1, times: b2 };
    }
    if (b0 === 0x03 && (b1 === 1 || b1 === 2)) return { t: "wheel", v: b1 === 1 ? "left" : "right" };
    if (b0 === 0x0b && (b1 === 1 || b1 === 2)) return { t: "wheel", v: b1 === 1 ? "up" : "down" };
    if (b0 === 0x07) return { t: "rgb", v: "cycle" };
    if (b0 === 0x08) return { t: "rgb", v: "toggle" };
    if (b0 === 0x0a) return { t: "dpiLock", dpi: (b1 + 1) * 50 };
    if (b0 === 0x05 && block) {
      const n = block[0];
      const ev = [];
      for (let i = 0; i < n; i++) ev.push(block.slice(1 + i * 3, 4 + i * 3));
      const media = ev.find((x) => x[0] === 0x82);
      if (media) return { t: "media", usage: media[1] | (media[2] << 8) };
      let mods = 0,
        key = 0;
      for (const [op, v] of ev) {
        if (op === 0x80) mods |= v;
        if (op === 0x81 && !key) key = v;
      }
      return { t: "key", mods, key };
    }
    if (b0 === 0x06) return { t: "macro", bytes: [b0, b1, b2] };
    return { t: "raw", bytes: [b0, b1, b2] };
  },

  label(a) {
    switch (a?.t) {
      case "mouse":
        return T(MOUSE_NAMES[a.v] || "Mouse");
      case "click":
        return T(a.n === 3 ? "Triple Click" : "Double Click");
      case "fire":
        return T("Fire Key");
      case "dpi":
        return T(DPI_NAMES[a.v] || "DPI");
      case "dpiLock":
        return T("DPI Lock") + " " + a.dpi;
      case "rgb":
        return T(a.v === "cycle" ? "LED Mode Switch" : "LED On / Off");
      case "media":
        return T(MEDIA_KEYS.find(([u]) => u === a.usage)?.[1] || "Media");
      case "key": {
        const parts = [];
        if (a.mods & 1) parts.push("Ctrl");
        if (a.mods & 2) parts.push("Shift");
        if (a.mods & 4) parts.push("Alt");
        if (a.mods & 8) parts.push("Win");
        if (a.key) parts.push(HID_KEY_NAMES[a.key] || "Key " + a.key);
        return parts.join(" + ") || T("Keyboard");
      }
      case "wheel":
        return T(WHEEL_NAMES[a.v] || "Wheel");
      case "macro":
        return T("Macro") + " " + ((a.bytes?.[1] ?? 0) + 1);
      case "off":
        return T("Disabled");
      default:
        return T("Custom");
    }
  },

  same(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  },
};

class AriaHID {
  constructor() {
    this.device = null;
    this.debug = true;

    this.preferredUsagePage = 0xff00;
    this.allowVendorUsageFallback = true;
    this._memBase = MEM_BASE;
    this._mem = new Uint8Array(MEM_SIZE);
    this._pendingRead = new Map();
    this._featureReadInFlight = new Set();
    this._lastRxReportId = null;
    this._featureReportIds = new Set();
    this._outputReportIds = new Set();

    this.readbackSupported = null; // null=unknown, true/false after probe
    this._sawReadData = false;
    this._warnedReadback = false;

    this.transport = null;
    this._timeoutScale = 1;
    this.candidates = []; // every device the browser offered, for Diagnostics
    this.lastReadback = null; // { addr, ok, sent, read } of the last verify
    this.lastBatteryAt = null;
    this._macroBusy = false;

    this._resetIO();
  }

  _t(ms) {
    return Math.round(ms * this._timeoutScale);
  }

  _hasReport(dev, kind, id) {
    return (dev?.collections || []).some((c) =>
      (c[kind] || []).some((r) => r.reportId === id),
    );
  }

    _guessTransport(dev) {
    if (!dev) return null;
    // Aria II Pro VID/PID has no WebHID bus indicator. Use USB as the
    // conservative label and keep timeout scale at 1; channel probe verifies
    // the actual report path.
    return "usb";
  }

  get link() {
    if (!this.device) return null;
    if (this.transport === "bluetooth") return "bluetooth";
    return "usb";
  }

  get transportLabel() {
    return { bluetooth: "Bluetooth", dongle: T("2.4G receiver"), cable: T("USB cable"), usb: "USB" }[this.link] || "—";
  }

  _resetIO() {
    this._queue = Promise.resolve();
    this._queueDepth = 0;

    this._pendingWrites = new Map();
    this._pendingAck = null;
    this._writeGen = 0;
    this._syncing = false;
  }

  _hex(bytes) {
    try {
      return Array.from(bytes)
        .map((b) => (b & 0xff).toString(16).padStart(2, "0"))
        .join(" ");
    } catch {
      return "";
    }
  }

  _wire(dir, id, bytes) {
    const log = (this.wireLog = this.wireLog || []);
    log.push(`${new Date().toISOString().slice(11, 23)} ${dir} ${id != null ? "id=0x" + id.toString(16) + " " : ""}${this._hex(bytes || [])}`);
    if (log.length > 60) log.shift();
  }

  _logTx(label, bytes) {
    this._wire("TX " + (this._outMode || "?"), REPORT_OUT, bytes);
    if (!this.debug) return;
    console.debug(
      "[ARIA] TX",
      label || "",
      "len=" + (bytes?.length ?? 0),
      this._hex(bytes || []),
    );
  }

  _logRx(reportId, bytes) {
    this._wire("RX", reportId, bytes);
    if (!this.debug) return;
    console.debug(
      "[ARIA] RX",
      "id=0x" + (reportId ?? 0).toString(16),
      "len=" + (bytes?.length ?? 0),
      this._hex(bytes || []),
    );
  }

  _logRxFeature(reportId, bytes) {
    if (!this.debug) return;
    console.debug(
      "[ARIA] RX-FEATURE",
      "rid=0x" + (reportId ?? 0).toString(16),
      "len=" + (bytes?.length ?? 0),
      this._hex(bytes || []),
    );
  }

  discoverReports() {
    this._featureReportIds.clear();
    this._outputReportIds.clear();

    try {
      for (const col of this.device?.collections || []) {
        for (const fr of col.featureReports || []) {
          if (typeof fr.reportId === "number")
            this._featureReportIds.add(fr.reportId);
        }
        for (const or of col.outputReports || []) {
          if (typeof or.reportId === "number")
            this._outputReportIds.add(or.reportId);
        }
      }

      if (this.debug) {
        console.debug(
          "[ARIA] reports",
          "featureReportIds=",
          Array.from(this._featureReportIds.values()),
          "outputReportIds=",
          Array.from(this._outputReportIds.values()),
        );
      }
    } catch (e) {
      if (this.debug) console.warn("[ARIA] discoverReports failed:", e);
    }
  }

  async connect(device) {
    this._stopTimers();
    this._resetIO();
    this.readbackSupported = null;
    this.device = device;
    this._outMode = null;
    this.lastReadback = null;
    this.transport = this._guessTransport(device);
    this._timeoutScale = this.transport === "bluetooth" ? 2.5 : 1;
    this._reconnectTries = 0;
    if (this.debug)
      console.debug(
        "[ARIA] connected",
        "pid=0x" + device.productId.toString(16),
        "name=" + device.productName,
        "transport=" + this.transport,
      );
    app.btnConnecting();
    try {
      if (!device.opened) await device.open();
    } catch (e) {
      app.pairFailed();
      if (AriaHID.isLinux()) {
   
        console.error(
          "[ARIA] open() failed on Linux — install the udev rule:\n" +
            "  sudo cp linux/70-fantech-aria-xd7.rules /etc/udev/rules.d/\n" +
            "  sudo udevadm control --reload-rules && sudo udevadm trigger\n" +
            "then unplug/replug the mouse (or dongle) and reload this page.",
          e,
        );
        app.showLinuxSetup();
      } else {
        app.toast("Failed to open HID device", "error");
      }
      e._ariaHandled = true;
      throw e;
    }

    this.discoverReports();


    this._listening = this._listening || new WeakSet();
    if (!this._listening.has(device)) {
      this._listening.add(device);
      device.addEventListener("inputreport", (e) => {
        if (e.device === this.device || e.target === this.device) this.onInputReport(e);
      });
    }

    try {
      app.onConnected();
      app.syncUIFromState();
    } catch {}

    try {
      await this.readCurrentConfig();
    } catch (e) {
      console.warn("[ARIA] readCurrentConfig failed:", e);
      // Keep UI active, but show a hint.
      app.toast("Connected, but failed to read settings", "error");
    }
  }

  getVendorInterface(devices) {
    if (!devices || !devices.length) return null;

    const valid = devices.filter((d) => d.vendorId === VENDOR_ID && d.productId === PID_PRO);
    if (!valid.length) return null;
    const hasPage = (d, pred) => (d.collections || []).some(pred);
    const hasReport = (d, kind, id) =>
      hasPage(d, (c) => (c[kind] || []).some((r) => r.reportId === id));

    const known = valid.filter((d) => PRODUCT_IDS.includes(d.productId));
    const pool = known.length ? known : valid;


    const byReports = pool.find(
      (d) =>
        hasReport(d, "featureReports", REPORT_OUT) ||
        hasReport(d, "outputReports", REPORT_OUT),
    );
    if (byReports) return byReports;
    const byInput = pool.find((d) => hasReport(d, "inputReports", REPORT_IN));
    if (byInput) return byInput;

    const exact = pool.find((d) =>
      hasPage(d, (c) => c.usagePage === this.preferredUsagePage),
    );
    if (exact) return exact;

    if (this.allowVendorUsageFallback) {
      const vendor = pool.find((d) =>
        hasPage(d, (c) => (c.usagePage & 0xffff) >= 0xff00),
      );
      if (vendor) return vendor;
    }

    return null;
  }

  static isLinux() {
    const p =
      navigator.userAgentData?.platform || navigator.platform || "";
    return /linux/i.test(p) && !/android/i.test(navigator.userAgent);
  }

    _rankDevice(d) {
    let s = 0;
    if (d.vendorId === VENDOR_ID) s += 8;
    if (PRODUCT_IDS.includes(d.productId)) s += 4;
    if ((d.collections || []).some((c) => c.usagePage === 0xff00)) s += 16;
    else if ((d.collections || []).some((c) => (c.usagePage & 0xffff) >= 0xff00)) s += 5;
    if (this._hasReport(d, "featureReports", REPORT_OUT)) s += 10;
    if (this._hasReport(d, "outputReports", REPORT_OUT)) s += 5;
    if (this._hasReport(d, "inputReports", REPORT_IN)) s += 3;
    return s;
  }


  _rememberCandidates(devices) {
    this.candidates = (devices || [])
      .map((d) => ({
        device: d,
        score: this._rankDevice(d),
        name: d.productName || "(unnamed)",
        vid: d.vendorId,
        pid: d.productId,
        pages: (d.collections || []).map((c) => c.usagePage),
        transport: this._guessTransport(d),
      }))
      .sort((a, b) => b.score - a.score);
  }


  async pair({ all = false } = {}) {
    try {
      // Vendor-only filter so wired, dongle and Bluetooth all show up.
      const devices = await navigator.hid.requestDevice({
        filters: all ? [] : [{ vendorId: VENDOR_ID }],
      });
      if (!devices || !devices.length) {
        app.pairFailed();
        return;
      }
      this._rememberCandidates(devices);

      if (this.debug) {
        for (const d of devices || []) {
          const pages = (d.collections || []).map((c) => c.usagePage);
          console.debug(
            "[ARIA] device candidate",
            "productId=0x" + d.productId.toString(16),
            "usagePages=",
            pages,
          );
        }
      }

      const target = this.getVendorInterface(devices);
      if (target) await this.connect(target);
      else if (devices.some((d) => this._guessTransport(d) === "bluetooth")) {
   
        app.pairFailed();
        app.showBluetoothLimit();
        return;
      } else {
        const pages = (devices || [])
          .flatMap((d) => (d.collections || []).map((c) => c.usagePage))
          .filter((v) => typeof v === "number");
        throw new Error(
          T("No usable Aria XD7 interface. Detected usagePages: {pages}", {
            pages: pages.length
              ? pages.map((p) => "0x" + p.toString(16)).join(", ")
              : "(none)",
          }),
        );
      }
    } catch (e) {
      app.pairFailed();
      if (e && e._ariaHandled) return;
      if (e?.name === "NotFoundError") return; // chooser closed
      app.toast(
        e && e.message ? e.message : "Pair/connect failed",
        "error",
      );
    }
  }

  async autoConnect() {
    const devices = await navigator.hid.getDevices();
    if (!this.candidates.length) this._rememberCandidates(devices);
    const target = this.getVendorInterface(devices);
    if (target) await this.connect(target);
    return !!target;
  }


  scheduleReconnect() {
    if (this.transport !== "bluetooth") return;
    clearTimeout(this._reconnectTimer);
    const tick = async () => {
      if (this.connected) return;
      if ((this._reconnectTries = (this._reconnectTries || 0) + 1) > 6) return;
      try {
        if (await this.autoConnect()) return;
      } catch {}
      this._reconnectTimer = setTimeout(tick, 3000);
    };
    this._reconnectTimer = setTimeout(tick, 3000);
  }

  // === Packet Helpers ===
  // OUT payload is 16 bytes (sent with report id 0x08):
  // [0]=cmd (0x08 read / 0x07 write), [2..3]=addr BE,
  // [4]=len, [5..14]=data, [15]=checksum
  // checksum = (0x4d - sum(payload[0..14])) & 0xff
  // IN payload (report 0x09) checksum at [15]: (0x4c - sum(data[0..14]))
  checksumOut(p16) {
    let sum = 0;
    for (let i = 0; i < 15; i++) sum = (sum + (p16[i] & 0xff)) & 0xff;
    return (0x4d - sum) & 0xff;
  }

  checksumIn(p16) {
    let sum = 0;
    for (let i = 0; i < 15; i++) sum = (sum + (p16[i] & 0xff)) & 0xff;
    return (0x4c - sum) & 0xff;
  }

  _frame(cmd, addr, len, data) {
    const p = new Uint8Array(16);
    p[0] = cmd;
    p[2] = (addr >> 8) & 0xff;
    p[3] = addr & 0xff;
    p[4] = len & 0xff;
    if (data) {
      const arr = data instanceof Uint8Array ? data : Uint8Array.from(data);
      p.set(arr.subarray(0, 10), 5);
    }
    p[15] = this.checksumOut(p);
    return p;
  }

  buildWakeupPacket() {
    // 08 03 00 00 00 00 00 00 00 00 00 00 00 00 00 4a
    const p = new Uint8Array(16);
    p[0] = 0x03;
    p[15] = this.checksumOut(p);
    return p;
  }

  buildReadRequest(address16, length) {
    return this._frame(0x08, address16, length, null);
  }

  // Writes bytes into local memory mirror (BE address, data at [5..])
  _memWrite(address16, bytes) {
    const start = address16 - this._memBase;
    if (start < 0 || start >= this._mem.length) return;
    for (let i = 0; i < bytes.length; i++) {
      const idx = start + i;
      if (idx >= 0 && idx < this._mem.length) this._mem[idx] = bytes[i];
    }
  }

  _memReadU8(address16) {
    const idx = address16 - this._memBase;
    if (idx < 0 || idx >= this._mem.length) return 0xff;
    return this._mem[idx];
  }

  _memReadRgb(address16) {
    const r = this._memReadU8(address16);
    const g = this._memReadU8(address16 + 1);
    const b = this._memReadU8(address16 + 2);
    if (r === 0xff || g === 0xff || b === 0xff) return null;
    return (
      "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
    );
  }

  async readCurrentConfig() {
    this._mem.fill(0xff);

    // 1) wakeup 0x03.
    try {
      await this.sendRaw16(this.buildWakeupPacket());
    } catch (e) {
      console.warn("[ARIA] wakeup failed:", e);
    }

    try {
      app.onConnected();
      app.syncUIFromState();
    } catch {}

    this.requestBattery().catch(() => {});
    this._startBatteryPoll();


    // Always re-probe on fresh connect or variant switch
    this.readbackSupported = null;
    try {
      await this._probeDirectRead();
    } catch {}

    // Even if probe failed, try reading config anyway — battery works means mouse is alive
    try {
      await this.autoReadBlocks();
    } catch (e) {
      console.warn("[ARIA] auto-read failed:", e);
    }

    this.applyMemoryToState();
    this._startDeviceSync();
  }


  _waitForPassiveDump(timeout) {
    return new Promise((resolve) => {
      if (this._mem[MEM_BASE] !== 0xff) return resolve();
      const startedAt = Date.now();
      const tick = setInterval(() => {
        if (this._mem[MEM_BASE] !== 0xff || Date.now() - startedAt >= timeout) {
          clearInterval(tick);
          resolve();
        }
      }, 40);
    });
  }


  _startBatteryPoll() {
    if (this._battTimer) return;
    this._battTimer = setInterval(() => {
      if (!this.connected) return this._stopTimers();
      if (document.hidden) return;
      this.requestBattery().catch(() => {});
    }, 60000);
  }

  requestBattery() {
    if (!this.connected) return Promise.resolve();
    return this._enqueue(async () => {
      await this.sendRaw16(this._frame(0x04, 0x0000, 0, null));
      await new Promise((r) => setTimeout(r, 30));
    });
  }

  _stopTimers() {
    clearInterval(this._battTimer);
    clearInterval(this._syncTimer);
    this._battTimer = this._syncTimer = null;
  }

  _startDeviceSync() {
    if (this._syncTimer) return;
    this._syncTimer = setInterval(() => this._syncTick(), 4000);
    if (!this._visBound) {
      this._visBound = true;
      document.addEventListener("visibilitychange", () => {
        if (document.hidden || !this.connected) return;
        this.requestBattery().catch(() => {});
        this._syncTick();
      });
    }
  }

  async _syncTick() {
    if (!this.connected) return this._stopTimers();
    if (this._syncing || this._macroBusy || document.hidden) return;
    if (this._queueDepth || this._pendingWrites.size) return;
    if (app.isUserBusy()) return;
    this._syncing = true;
    const gen = this._writeGen;
    try {
      await this.autoReadBlocks();
      if (gen !== this._writeGen || this._pendingWrites.size) return;
      if (app.isUserBusy()) return;
      this.applyMemoryToState();
    } catch {
    } finally {
      this._syncing = false;
    }
  }

  _enqueue(job) {
    this._queueDepth++;
    const run = this._queue.then(job);
    this._queue = run.catch(() => {}).finally(() => this._queueDepth--);
    return run;
  }


  buildBatteryRequest() {
    return this._frame(0x02, 0x0000, 1, Uint8Array.from([0x01]));
  }


  _channelOrder() {
    const feat = this._featureReportIds.has(REPORT_OUT);
    const out = this._outputReportIds.has(REPORT_OUT);
    let order = this.transport === "bluetooth" ? ["output", "feature"] : ["feature", "output"];
    if (feat !== out) order = order.filter((m) => (m === "feature" ? feat : out)).concat(order.filter((m) => (m === "feature" ? !feat : !out)));
    return order;
  }

  async _probeDirectRead() {
    this._sawReadData = false;
    const order = this._channelOrder();
    this.probeLog = [];
    for (const mode of order) {
      this._outMode = mode;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await this._enqueue(() => this.sendRaw16(this.buildWakeupPacket()));
        } catch (e) {
          this.probeLog.push(`${mode}: send failed (${e?.name || e})`);
          break;
        }
        await sleepMs(this._t(60));
        try {
          await this._enqueue(() => this._readChunk(MEM_BASE, 1, this._t(700)));
          this.readbackSupported = true;
          this.probeLog.push(`${mode}: answered`);
          if (this.debug) console.debug("[ARIA] channel", mode, "answers");
          return;
        } catch {
          this.probeLog.push(`${mode}: no answer (try ${attempt + 1})`);
        }
      }
    }
    this._outMode = order[0];
    this.readbackSupported = this._sawReadData ? true : false;
    if (this.debug) console.debug("[ARIA] no channel answered", this.probeLog);
  }


  _field(addr, n) {
    const v = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const b = this._memReadU8(addr + i);
      v.push(b);
      sum += b;
    }
    const chk = this._memReadU8(addr + n);
    return chk === ((0x55 - sum) & 0xff) ? v : null;
  }


  static encodeDPI(dpi) {
    const raw = Math.max(0, Math.min(519, Math.round(dpi / 50) - 1));
    const lo = raw & 0xff,
      hi = (raw >> 8) & 0x03;
    return [lo, lo, (hi << 2) | (hi << 6)];
  }

  static decodeDPI(lo, hiBits) {
    const hi = (hiBits >> 2) & 0x03;
    return ((lo | (hi << 8)) + 1) * 50;
  }

  applyMemoryToState() {
    const s = app.state;
    const before = JSON.stringify(s);
    const one = (addr) => this._field(addr, 1)?.[0];

    const stages = one(REG.STAGES);
    if (stages >= 1 && stages <= 7) s.stages = stages;

    const polling = one(REG.POLLING);
    if ([1, 2, 4, 8].includes(polling)) s.pollingRate = polling;

    const lod = one(REG.LOD);
    if (lod === 1 || lod === 2) s.lod = lod;

    for (let i = 0; i < 7; i++) {
      const f = this._field(REG.DPI_BASE + i * 4, 3);
      if (f) s.dpi[i] = Math.min(26000, AriaHID.decodeDPI(f[0], f[2]));
    }

    for (let i = 0; i < 7; i++) {
      const f = this._field(REG.LED_COLOR_BASE + i * 4, 3);
      if (f)
        s.colors[i] =
          "#" + f.map((v) => v.toString(16).padStart(2, "0")).join("");
    }

    // LED effect: mode, brightness and speed are each <value, 0x55-value>.
    const ledMode = one(REG.LED_EFFECT);
    if (ledMode >= 0 && ledMode <= 2) {
      s.ledMode = ledMode;
      const bRaw = one(REG.LED_EFFECT + 2);
      if (bRaw !== undefined)
        s.brightness = Math.max(
          1,
          Math.min(10, Math.round((bRaw - 16) / 26.556 + 1)),
        );
      const speed = one(REG.LED_EFFECT + 4);
      if (speed >= 1 && speed <= 5) s.speed = speed;
    }

    const debounce = one(REG.DEBOUNCE);
    if (debounce !== undefined && debounce <= 30) s.debounce = debounce;
    const motion = one(REG.MOTION_SYNC);
    if (motion <= 1) s.motionSync = motion === 1;
    const angle = one(REG.ANGLE_SNAP);
    if (angle <= 1) s.angleSnap = angle === 1;
    const ripple = one(REG.RIPPLE);
    if (ripple <= 1) s.ripple = ripple === 1;
    const sleep = one(REG.SLEEP);
    if (SLEEP_VALUES.includes(sleep)) s.sleep = sleep;

    for (const { idx } of BUTTON_SLOTS) {
      const e = this._field(BTN_TABLE + idx * 4, 3);
      if (!e) continue;
      if (e[0] === 0x05) {
        const block = this._buttonBlock(idx);
        if (block) s.buttons[idx] = ButtonCodec.decode(e, block);
      } else s.buttons[idx] = ButtonCodec.decode(e, null);
    }

    app.onConnected();

    if (JSON.stringify(s) !== before) {
      app.syncUIFromState();
      app.saveProfile();
    }
  }

  onInputReport(event) {
    const data = event.data;
    let bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    if (!event.reportId && bytes.length === 17 && bytes[0] === REPORT_IN) bytes = bytes.subarray(1);
    this._lastRxReportId = event.reportId;
    this._logRx(event.reportId, bytes);

    // Battery report (verified: 04 00 00 00 02 <pct> … e2, 100% = 0x64)
    if (bytes[0] === 0x04 && data.byteLength >= 6) {
      const pct = bytes[4] === 0x02 ? bytes[5] : bytes[4];
      if (pct >= 0 && pct <= 100) {
        this.lastBatteryAt = Date.now();
        this.lastBattery = pct;
        app.updateBattery(pct);
      }
      return;
    }

    // Ignore ACK packets (per requirement)
    if (bytes[0] === 0x1c) return;

    // Write echo: 07 00 addrHi addrLo len data... confirms the write landed.
    if (bytes[0] === 0x07 && this._pendingAck) {
      const addr = (bytes[2] << 8) | bytes[3];
      if (addr === this._pendingAck.addr) this._pendingAck.resolve(true);
      return;
    }

    // Process only data packets that start with 0x08
    if (bytes[0] === 0x08) {
      this._handleDataPacket(bytes);
      return;
    }
  }

  _handleDataPacket(bytes) {
    // Verified input frame: 08 00 addrHi addrLo len data[10] checksum
    if (bytes.length < 6) return;
    const address = (bytes[2] << 8) | bytes[3];
    const len = bytes[4];

    // Optional strict check: reject frames with a bad checksum.
    if (this.debug && this.checksumIn(bytes) !== bytes[15]) {
      console.warn(
        "[ARIA] bad input checksum @0x" +
          address.toString(16) +
          " got=" +
          bytes[15].toString(16),
      );
    }

    if (bytes[1] === 0x00 || bytes[1] === 0x08) {
      this._sawReadData = true;
      const payload = bytes.slice(5, 5 + Math.min(len, 10));
      if (payload.length) this._memWrite(address, payload);
      const pending = this._pendingRead.get(address);
      if (pending) {
        this._pendingRead.delete(address);
        pending.resolve({ address, payload });
      }
      return;
    }

    if (bytes[1] === 0x01 && this._pendingRead.has(address)) {
      void this._tryReceiveFeatureForRead(address, len);
    }
  }

  async _tryReceiveFeatureForRead(address16, len) {
    if (!this.device || !this.device.opened) return;
    const key = address16;
    if (this._featureReadInFlight.has(key)) return;
    this._featureReadInFlight.add(key);

    try {
      if (!this._featureReportIds.size) this.discoverReports();

      const candidateIds = [
        REPORT_OUT,
        REPORT_IN,
        ...Array.from(this._featureReportIds.values()),
      ].filter((v, i, a) => Number.isInteger(v) && a.indexOf(v) === i);

      // Poll a few times; some firmwares update GET_FEATURE asynchronously.
      const tries = 6;
      for (let attempt = 0; attempt < tries; attempt++) {
        await new Promise((r) => setTimeout(r, attempt === 0 ? 35 : 55));

        for (const rid of candidateIds) {
          let dv;
          try {
            dv = await this.device.receiveFeatureReport(rid);
          } catch (e) {
            if (this.debug)
              console.warn(
                "[ARIA] receiveFeatureReport failed (rid=0x" +
                  rid.toString(16) +
                  "):",
                e,
              );
            continue;
          }

          const b = new Uint8Array(dv.buffer);
          this._logRxFeature(rid, b);

          if (b.length >= 6 && b[0] === 0x08) {
            const addr = b[2] | (b[3] << 8);
            const l = b[4];

            // 08 08 addrLo addrHi len payload...
            if (b[1] === 0x08) {
              this._sawReadData = true;
              const payload = b.slice(5, 5 + l);
              if (payload.length) this._memWrite(addr, payload);
              const pending = this._pendingRead.get(addr);
              if (pending) {
                this._pendingRead.delete(addr);
                pending.resolve({ address: addr, payload });
              }
              break;
            }

            // Alternate: 08 00 addrLo addrHi len payload...
            if (b[1] === 0x00 && addr === address16 && l === len) {
              this._sawReadData = true;
              const payload = b.slice(5, 5 + l);
              if (payload.length) this._memWrite(addr, payload);
              const pending = this._pendingRead.get(addr);
              if (pending) {
                this._pendingRead.delete(addr);
                pending.resolve({ address: addr, payload });
              }
              break;
            }
          }

          if (!this._pendingRead.has(key)) break;
        }

        if (!this._pendingRead.has(key)) break;
      }
    } catch (e) {
      if (this.debug)
        console.warn("[ARIA] receiveFeatureReport failed:", e);
    } finally {
      this._featureReadInFlight.delete(key);
    }
  }

  get connected() {
    return this.device && this.device.opened;
  }

 
  async sendRaw16(payload) {
    if (!this.device || !this.device.opened) return;
    this._lastTx = Date.now();
    this._logTx("out", payload);
    if (!this._outMode) this._outMode = this._channelOrder()[0];
    if (!this._outMode) {
      try {
        await this.device.sendFeatureReport(REPORT_OUT, payload);
        this._outMode = "feature";
        return;
      } catch (e) {
        if (this.debug) console.warn("[ARIA] feature write failed:", e);
      }
      try {
        await this.device.sendReport(REPORT_OUT, payload);
        this._outMode = "output";
        return;
      } catch (e) {
        if (this.debug) console.warn("[ARIA] output write failed:", e);
        throw e;
      }
    }
    if (this._outMode === "feature")
      await this.device.sendFeatureReport(REPORT_OUT, payload);
    else await this.device.sendReport(REPORT_OUT, payload);
  }

  // === Direct Memory Read ===
  async readMemory(address16, length, opts = {}) {

    const maxChunk = 10;
    const timeoutMs = opts.timeoutMs ?? this._t(1200);
    let offset = 0;
    while (offset < length) {
      const chunkLen = Math.min(maxChunk, length - offset);
      const addr = (address16 + offset) & 0xffff;
      // One chunk per queue slot so a user write can slip in between
      // chunks instead of waiting for the whole read cycle.
      await this._enqueue(() => this._readChunk(addr, chunkLen, timeoutMs));
      offset += chunkLen;
    }
  }

  _readChunk(address16, len, timeoutMs) {
    const key = address16;
    if (this._pendingRead.has(key)) this._pendingRead.delete(key);

    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingRead.delete(key);
        reject(new Error("Read timeout @0x" + address16.toString(16)));
      }, timeoutMs);

      this._pendingRead.set(key, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });

      try {
        await this.sendRaw16(this.buildReadRequest(address16, len));
      } catch (e) {
        clearTimeout(timer);
        this._pendingRead.delete(key);
        reject(e);
      }
    });
  }

  async autoReadBlocks() {
    const blocks = [
      { name: "core", addr: 0x0000, len: 0x0c },
      { name: "dpi", addr: 0x000c, len: 7 * 4 },
      { name: "colors", addr: 0x002c, len: 7 * 4 },
      { name: "led", addr: 0x004c, len: 0x06 },
      { name: "advanced", addr: 0x00a9, len: 0x0e },
      { name: "buttons", addr: BTN_TABLE, len: BUTTON_SLOTS.length * 4 },
    ];

    for (const b of blocks) {
      try {
        await this.readMemory(b.addr, b.len, { timeoutMs: this._t(800) });
      } catch (e) {
        if (this.debug) console.warn("[ARIA] read block failed:", b.name, e);
        throw e;
      }
    }

    // Keyboard / media buttons keep their key events in a side block.
    for (const { idx } of BUTTON_SLOTS) {
      const e = this._field(BTN_TABLE + idx * 4, 3);
      if (e && e[0] === 0x05)
        await this.readMemory(BTN_DATA + idx * 0x20, 0x20, { timeoutMs: this._t(800) });
    }
  }

  // count, count×3 event bytes, chk (0x55 - sum of everything before it)
  _buttonBlock(idx) {
    const base = BTN_DATA + idx * 0x20;
    const n = this._memReadU8(base);
    if (n === 0xff || n * 3 + 2 > 0x20) return null;
    const bytes = [];
    for (let i = 0; i < n * 3 + 1; i++) bytes.push(this._memReadU8(base + i));
    const sum = bytes.reduce((a, b) => a + b, 0);
    return this._memReadU8(base + n * 3 + 1) === ((0x55 - sum) & 0xff)
      ? bytes
      : null;
  }

  async setButton(idx, action) {
    const { entry, block } = ButtonCodec.encode(action);
    const jobs = [];
    if (block) {
      // Key events first (like the official driver), then the table
      // entry that points at them. Max 10 data bytes per frame.
      const sum = block.reduce((a, b) => a + b, 0);
      const data = [...block, (0x55 - sum) & 0xff];
      const base = BTN_DATA + idx * 0x20;
      for (let off = 0; off < data.length; off += 10) {
        const chunk = data.slice(off, off + 10);
        jobs.push(this.sendSetting(base + off, chunk.length, chunk));
      }
    }
    jobs.push(
      this.sendSetting(BTN_TABLE + idx * 4, 4, this.complement(entry)),
    );
    await Promise.all(jobs);
  }

  // === Write path ===
  // Field encoding is verified from data hex.txt: every value byte is
  // followed by (0x55 - value), then one checksum at the end.
  complement(bytes) {
    let s = 0;
    for (const b of bytes) s = (s + b) & 0xff;
    return [...bytes, (0x55 - s) & 0xff];
  }

  pairedComplement(values) {
    const out = [];
    for (const v of values) {
      out.push(v, (0x55 - v) & 0xff);
    }
    return out;
  }

  buildPacket(subCmd, register, dataLen, dataBytes) {
    return this._frame(subCmd, register, dataLen, dataBytes);
  }

  async send(buf) {
    await this.sendRaw16(buf);
  }


  sendSetting(register, dataLen, dataBytes) {
    const queued = this._pendingWrites.get(register);
    if (queued) {
      queued.len = dataLen;
      queued.data = dataBytes;
      return queued.promise;
    }
    const entry = { len: dataLen, data: dataBytes };
    this._pendingWrites.set(register, entry);
    this._writeGen++;
    entry.promise = this._enqueue(async () => {
      this._pendingWrites.delete(register);
      this._writeGen++;
      const pkt = this.buildPacket(0x07, register, entry.len, entry.data);
      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        ok = await this._writeAndWaitAck(register, pkt, this._t(400));
      }
      if (!ok) throw new Error("Mouse did not confirm the change (asleep?)");

      const want = Array.from(entry.data.slice(0, entry.len));
      if (this.readbackSupported) {
        let got = null,
          same = false;
        for (let i = 0; i < 3 && !same; i++) {
          await sleepMs(this._t(i ? 120 : 15));
          try {
            const r = await this._readChunk(register, want.length, this._t(600));
            got = Array.from(r.payload || []);
            same = want.every((b, k) => got[k] === b);
          } catch {}
        }
        this.lastReadback = { addr: register, ok: same, sent: want, read: got };
        if (!same)
          throw new Error(
            T("The mouse did not keep 0x{addr} — sent [{sent}], read [{read}]", {
              addr: register.toString(16).padStart(4, "0"),
              sent: this._hex(want),
              read: got ? this._hex(got) : "—",
            }),
          );
      }
      this._memWrite(register, want);
    });
    return entry.promise;
  }

  async _writeAndWaitAck(addr, pkt, timeoutMs) {
    const acked = new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      this._pendingAck = {
        addr,
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
      };
    });
    try {
      await this.sendRaw16(pkt);
      return await acked;
    } finally {
      this._pendingAck = null;
    }
  }

  async setDPI(stage, dpi) {
    await this.sendSetting(
      REG.DPI_BASE + (stage - 1) * 4,
      4,
      this.complement(AriaHID.encodeDPI(dpi)),
    );
  }
  async setStages(count) {
    await this.sendSetting(REG.STAGES, 2, this.complement([count]));
  }
  async setPollingRate(val) {
    await this.sendSetting(REG.POLLING, 2, this.complement([val]));
  }
  async setLOD(val) {
    await this.sendSetting(REG.LOD, 2, this.complement([val]));
  }
  async setDebounce(val) {
    await this.sendSetting(REG.DEBOUNCE, 2, this.complement([val]));
  }
  async setMotionSync(on) {
    await this.sendSetting(
      REG.MOTION_SYNC,
      2,
      this.complement([on ? 1 : 0]),
    );
  }
  async setAngleSnap(on) {
    await this.sendSetting(
      REG.ANGLE_SNAP,
      2,
      this.complement([on ? 1 : 0]),
    );
  }
  async setRipple(on) {
    await this.sendSetting(REG.RIPPLE, 2, this.complement([on ? 1 : 0]));
  }
  async setSleep(val) {
    await this.sendSetting(REG.SLEEP, 2, this.complement([val]));
  }
  async setLEDColor(stage, hex) {
    const r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    await this.sendSetting(
      REG.LED_COLOR_BASE + (stage - 1) * 4,
      4,
      this.complement([r, g, b]),
    );
  }
  async setLEDEffect(mode, brightness, speed) {
    if (mode === 0)
      await this.sendSetting(REG.LED_EFFECT, 2, this.complement([0x00]));
    else {
      const bVal = Math.round(16 + (brightness - 1) * 26.556);
      await this.sendSetting(
        REG.LED_EFFECT,
        6,
        this.pairedComplement([mode, bVal, speed]),
      );
    }
  }


  async _readExact(addr, len, timeoutMs) {
    const out = new Uint8Array(len);
    for (let off = 0; off < len; off += 10) {
      const n = Math.min(10, len - off);
      const a = addr + off;
      let res = null,
        lastErr = null;
      for (let attempt = 0; attempt < 2 && !res; attempt++) {
        try {
          res = await this._enqueue(() =>
            this._readChunk(a, n, timeoutMs ?? this._t(1200)),
          );
        } catch (e) {
          lastErr = e;
        }
      }
      if (!res) throw lastErr || new Error(T("Read timeout @0x{addr}", { addr: a.toString(16) }));
      if (!res.payload || res.payload.length < n)
        throw new Error(
          T("Short read at 0x{addr}: asked {want}, got {got}", {
            addr: a.toString(16).padStart(4, "0"),
            want: n,
            got: res.payload ? res.payload.length : 0,
          }),
        );
      out.set(res.payload.subarray(0, n), off);
    }
    return out;
  }


  async _readBytes(addr, len, onProgress) {
    const out = new Uint8Array(len).fill(0xff);
    for (let off = 0; off < len; off += 10) {
      const n = Math.min(10, len - off);
      try {
        const res = await this._enqueue(() =>
          this._readChunk(addr + off, n, this._t(1500)),
        );
        if (res?.payload) out.set(res.payload.subarray(0, n), off);
      } catch {}
      onProgress?.(Math.min(len, off + n), len, addr + off);
    }
    return out;
  }

  async writeMemory(addr, bytes, onProgress) {
    const data = Array.from(bytes);
    for (let off = 0; off < data.length; off += 10) {
      const chunk = data.slice(off, off + 10);
      const a = addr + off;
      let ok = false,
        read = null;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        this._writeGen++;
        await this._enqueue(() =>
          this._writeAndWaitAck(a, this._frame(0x07, a, chunk.length, chunk), this._t(400)),
        );
        await sleepMs(this._t(12));
        try {
          read = Array.from(await this._readExact(a, chunk.length));
          ok = read.every((b, i) => b === chunk[i]);
        } catch (e) {
          read = null;
        }
      }
      this.lastReadback = { addr: a, ok, sent: chunk, read };
      if (!ok)
        throw new Error(
          T("The mouse did not keep 0x{addr} — sent [{sent}], read [{read}]", {
            addr: a.toString(16).padStart(4, "0"),
            sent: this._hex(chunk),
            read: read ? this._hex(read) : "—",
          }),
        );
      this._memWrite(a, chunk);
      onProgress?.(Math.min(data.length, off + 10), data.length);
    }
  }

  async wakeup() {
    try {
      await this._enqueue(() => this.sendRaw16(this.buildWakeupPacket()));
      await sleepMs(this._t(40));
    } catch {}
  }

  async dumpMemory(onProgress) {
    this._macroBusy = true;
    try {
      await this.wakeup();
      return await this._readBytes(0x0000, MEM_SIZE, onProgress);
    } finally {
      this._macroBusy = false;
    }
  }

}

// ═══ App Controller ═══
const hid = new AriaHID();
const app = {
  _profileStorageKey: "aria_xd7_profile_v1",
  profileName: "Profile",
  _saveTimer: null,
  state: {
    stages: 7,
    dpi: [800, 1600, 2000, 2400, 3200, 5000, 26000],
    colors: [
      "#ff0000", // 255,0,0
      "#0000ff", // 0,0,255
      "#00ff00", // 0,255,0
      "#ff00ff", // 255,0,255
      "#00ffff", // 0,255,255
      "#ff8000", // 255,128,0
      "#ffffff", // 255,255,255
    ],
    pollingRate: 1,
    lod: 1,
    debounce: 3,
    motionSync: false,
    angleSnap: false,
    ripple: false,
    sleep: 6,
    ledMode: 1,
    brightness: 6,
    speed: 4,
    buttons: DEFAULT_BUTTONS.map((b) => ({ ...b })),
    battery: 0,
    variant: "xd7",
  },


  isUserBusy() {
    if (this._pointerDown) return true;
    if (this._pickerSlot != null) return true;
    if (Date.now() - (this._lastInteract || 0) < 2500) return true;
    const el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type !== "range") return true;
    try {
      if (this._colorPicker?.isOpen()) return true;
    } catch {}
    return false;
  },

  _bindInteractionTracking() {
    const touch = () => (this._lastInteract = Date.now());
    document.addEventListener("pointerdown", () => {
      this._pointerDown = true;
      touch();
    });
    const up = () => {
      this._pointerDown = false;
      touch();
    };
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    ["input", "change", "keydown", "wheel"].forEach((ev) =>
      document.addEventListener(ev, touch, { passive: true }),
    );
  },

  getPollingRateOptions() {
    return [
      { val: 8, label: "125" },
      { val: 4, label: "250" },
      { val: 2, label: "500" },
      { val: 1, label: "1000" },
    ];
  },

  renderPollingRateButtons() {
    const seg = document.getElementById("pollingRate");
    if (!seg) return;
    const opts = this.getPollingRateOptions();
    let html = "";
    for (const opt of opts) {
      const active = this.state.pollingRate === opt.val ? " active" : "";
      html += `<button class="seg-btn${active}" data-val="${opt.val}">${opt.label}</button>`;
    }
    seg.innerHTML = html;
  },

  init() {
    this.bindVariantSelector();
    this._bindStageScale();
    this._bindInteractionTracking();
    this.bindSegmented();
    this._bindProfileImport();
    this.loadSavedProfile();
    this.syncUIFromState();
    this._updateConnectionUI();
    document.addEventListener("aria:lang", () => {
      this.renderButtonMap();
      this.renderDPIStages();
      this._updateConnectionUI();
      if (this._pickerSlot != null) this.openButtonPicker(this._pickerSlot);
      if (document.getElementById("diagDialog")?.open) this._renderDiagnostics();
    });
    if (navigator.hid) {
      navigator.hid.addEventListener("disconnect", (ev) => {
        if (hid.device && ev.device !== hid.device) return;
        hid._stopTimers();
        hid._resetIO();
        this.onDisconnected();
        this.toast("Device disconnected", "error");
        hid.scheduleReconnect();
      });
      navigator.hid.addEventListener("connect", (ev) => {
        if (hid.connected || ev.device?.vendorId !== VENDOR_ID || ev.device?.productId !== PID_PRO) return;
        hid.autoConnect().catch(() => {});
      });
      hid.autoConnect().catch(() => {});
    } else this.toast("WebHID not supported on this browser", "error");
  },


  STAGE_W: 1560,
  STAGE_H: 940,
  _bindStageScale() {
    const stage = document.getElementById("stage");
    if (!stage) return;
    const fit = () => {
      const s = Math.min(window.innerWidth / this.STAGE_W, window.innerHeight / this.STAGE_H);
      document.documentElement.style.setProperty("--stage-scale", String(s));
    };
    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
  },

  bindVariantSelector() {
    const btns = document.querySelectorAll(".variant-btn");
    const banner = document.getElementById("proBanner");
    const heroTitle = document.getElementById("heroTitle");
    const heroSubtitle = document.getElementById("heroSubtitle");
    const mouseRender = document.querySelector(".mouse-render");

    const applyVariant = (variant) => {
      btns.forEach(b => b.classList.toggle("active", b.dataset.variant === variant));
      this.currentVariant = variant;

      if (variant === "pro") {
        banner.hidden = false;
        heroTitle.textContent = "ARIA II PRO";
        heroSubtitle.textContent = "Pro-Wireless Gaming Mouse";
        if (mouseRender) mouseRender.src = "aria2pro.webp";
      } else {
        banner.hidden = true;
        heroTitle.textContent = "ARIA XD7";
        heroSubtitle.textContent = "Web Configurator";
        if (mouseRender) mouseRender.src = "button.webp";
      }
      this.renderPollingRateButtons();
    };

    btns.forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("active")) return;
        applyVariant(btn.dataset.variant);
        this.syncUIFromState();
        if (hid && hid.connected) {
          hid.readbackSupported = null; // force re-probe
          hid.readCurrentConfig().catch(() => {});
        }
      });
    });

    // Restore saved variant
    applyVariant(this.state.variant || "xd7");
  },

  onDisconnected() {
    this._isConnectedUI = false;
    try {
      const btn = document.getElementById("btnPair");
      btn.classList.remove("hidden");
      btn.textContent = T("Connect Device");
      btn.disabled = false;
      document.getElementById("statusInfo").classList.remove("active");
      document.getElementById("battRing").classList.remove("active");
      document.getElementById("panelCenter").classList.remove("connected");
      document.body.classList.remove("is-connected");
      this.closeButtonPicker();
    } catch {}
    this._updateConnectionUI();
  },

  _updateConnectionUI() {
    const chip = document.getElementById("connChip");
    if (!chip) return;
    const on = hid.connected && this._isConnectedUI;
    chip.classList.toggle("on", !!on);
    chip.classList.toggle("bt", on && hid.transport === "bluetooth");
    chip.querySelector(".conn-text").textContent = on
      ? T("Connected over {transport}", { transport: hid.transportLabel })
      : T("Not connected");
  },

  openProfileImport() {
    document.getElementById("fabMenu").classList.remove("active");
    const input = document.getElementById("profileFileInput");
    if (!input) return this.toast("Profile input not found", "error");
    input.click();
  },

  _bindProfileImport() {
    const input = document.getElementById("profileFileInput");
    if (!input) return;
    input.addEventListener("change", async () => {
      try {
        const file = input.files && input.files[0];
        input.value = "";
        if (!file) return;
        const text = await file.text();
        const obj = JSON.parse(text);
        this.importProfileObject(obj, {
          name: file.name.replace(/\.(json)$/i, ""),
          source: "file",
        });
        this.toast("Profile imported", "success");
      } catch (e) {
        this.toast(e?.message || "Failed to import profile", "error");
      }
    });
  },

  _setProfileLabel(name) {
    this.profileName = name || "Profile";
    const el = document.getElementById("profileLabel");
    if (el) el.textContent = this.profileName;
  },

  renameProfile(name) {
    const clean = (name || "").trim().replace(/\s{2,}/g, " ").slice(0, 32);
    this._setProfileLabel(clean || "Profile");
    this.saveProfile({ immediate: true });
  },

  _sanitizeProfileState(candidate) {
    const next = {};
    const s = candidate || {};

    next.stages = Math.max(1, Math.min(7, parseInt(s.stages) || 7));

    const dpi = Array.isArray(s.dpi) ? s.dpi : [];
    next.dpi = Array.from({ length: 7 }, (_, i) => {
      const v =
        Math.round((parseInt(dpi[i]) || this.state.dpi[i]) / 50) * 50;
      return Math.max(50, Math.min(26000, v));
    });

    const colors = Array.isArray(s.colors) ? s.colors : [];
    const isHex = (x) =>
      typeof x === "string" && /^#[0-9a-fA-F]{6}$/.test(x);
    next.colors = Array.from({ length: 7 }, (_, i) =>
      isHex(colors[i]) ? colors[i] : this.state.colors[i],
    );

    const pollingOpts = this.getPollingRateOptions().map(o => o.val);
    next.pollingRate = pollingOpts.includes(parseInt(s.pollingRate))
      ? parseInt(s.pollingRate)
      : this.state.pollingRate;
    next.lod = [1, 2].includes(parseInt(s.lod))
      ? parseInt(s.lod)
      : this.state.lod;
    const deb = parseInt(s.debounce);
    next.debounce = Number.isFinite(deb)
      ? Math.max(0, Math.min(30, deb))
      : this.state.debounce;
    next.motionSync = !!s.motionSync;
    next.angleSnap = !!s.angleSnap;
    next.ripple = !!s.ripple;
    next.sleep = SLEEP_VALUES.includes(parseInt(s.sleep))
      ? parseInt(s.sleep)
      : this.state.sleep;
    next.ledMode = [0, 1, 2].includes(parseInt(s.ledMode))
      ? parseInt(s.ledMode)
      : this.state.ledMode;
    next.brightness = Math.max(
      1,
      Math.min(10, parseInt(s.brightness) || this.state.brightness),
    );
    next.speed = Math.max(
      1,
      Math.min(5, parseInt(s.speed) || this.state.speed),
    );

    const known = ["mouse", "click", "fire", "dpi", "dpiLock", "rgb", "wheel", "media", "key", "off"];
    const valid = (b) =>
      b &&
      (known.includes(b.t) ||
        ((b.t === "macro" || b.t === "raw") &&
          Array.isArray(b.bytes) &&
          b.bytes.length === 3));
    const btns = Array.isArray(s.buttons) ? s.buttons : [];
    next.buttons = DEFAULT_BUTTONS.map((def, i) =>
      valid(btns[i]) ? JSON.parse(JSON.stringify(btns[i])) : { ...def },
    );

    next.battery = this.state.battery;

    return next;
  },

  getProfileObject() {
    return {
      meta: {
        app: "aria-xd7-web",
        version: 1,
        name: this.profileName || "Profile",
        updatedAt: new Date().toISOString(),
      },
      state: {
        stages: this.state.stages,
        dpi: this.state.dpi,
        colors: this.state.colors,
        pollingRate: this.state.pollingRate,
        lod: this.state.lod,
        debounce: this.state.debounce,
        motionSync: this.state.motionSync,
        angleSnap: this.state.angleSnap,
        ripple: this.state.ripple,
        sleep: this.state.sleep,
        ledMode: this.state.ledMode,
        brightness: this.state.brightness,
        speed: this.state.speed,
        buttons: this.state.buttons,
        variant: this.state.variant,
      },
    };
  },

  importProfileObject(obj, { name, source } = {}) {
    const metaName = obj?.meta?.name;
    const label =
      name || metaName || (source === "file" ? "Imported" : "Local");
    const candidateState = obj?.state ?? obj;
    this.state = this._sanitizeProfileState(candidateState);
    this._setProfileLabel(label);
    this.syncUIFromState();
    this.saveProfile({ immediate: true });
  },

  loadSavedProfile() {
    try {
      const raw = localStorage.getItem(this._profileStorageKey);
      if (!raw) {
        this._setProfileLabel("Profile");
        return;
      }
      const obj = JSON.parse(raw);
      this.importProfileObject(obj, {
        name: obj?.meta?.name || "Local",
        source: "local",
      });
    } catch {
      this._setProfileLabel("Profile");
    }
  },

  saveProfile({ immediate } = {}) {
    const commit = () => {
      try {
        localStorage.setItem(
          this._profileStorageKey,
          JSON.stringify(this.getProfileObject()),
        );
      } catch {}
    };
    if (immediate) return commit();
    if (this.profileName === "Profile") this._setProfileLabel("Profile");
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(commit, 150);
  },

  exportProfile() {
    try {
      document.getElementById("fabMenu").classList.remove("active");
      const data = JSON.stringify(this.getProfileObject(), null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (this.profileName || "aria-profile")
        .toLowerCase()
        .replace(/[^a-z0-9\-_.]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-_.]+|[-_.]+$/g, "");
      a.href = url;
      a.download = `${safeName || "aria-xd7"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.toast("Profile exported", "success");
    } catch (e) {
      this.toast(e?.message || "Failed to export profile", "error");
    }
  },

  async applyProfileToMouse() {
    if (!hid.connected)
      return this.toast("Connect mouse first to apply profile", "error");

    document.getElementById("fabMenu").classList.remove("active");
    this.toast("Applying profile to mouse...");

    try {
      await hid.setPollingRate(this.state.pollingRate);
      await hid.setLOD(this.state.lod);
      await hid.setDebounce(this.state.debounce);
      await hid.setMotionSync(this.state.motionSync);
      await hid.setAngleSnap(this.state.angleSnap);
      await hid.setRipple(this.state.ripple);
      await hid.setSleep(this.state.sleep);
      await hid.setStages(this.state.stages);
      for (let i = 0; i < this.state.stages; i++) {
        await hid.setDPI(i + 1, this.state.dpi[i]);
        await hid.setLEDColor(i + 1, this.state.colors[i]);
      }
      await hid.setLEDEffect(
        this.state.ledMode,
        this.state.brightness,
        this.state.speed,
      );
      for (const { idx } of BUTTON_SLOTS)
        await hid.setButton(idx, this.state.buttons[idx]);
      this.toast("Profile applied successfully!", "success");
    } catch (e) {
      this.toast(e?.message || "Failed to apply profile", "error");
    }
  },

  pair() {
    hid.pair();
  },

  btnConnecting() {
    const btn = document.getElementById("btnPair");
    btn.textContent = T("Syncing...");
    btn.disabled = true;
  },

  pairFailed() {
    const btn = document.getElementById("btnPair");
    btn.textContent = T("Connect Device");
    btn.disabled = false;
  },

  onConnected() {
    if (this._isConnectedUI) return;
    this._isConnectedUI = true;
    document.getElementById("btnPair").classList.add("hidden");
    document.getElementById("statusInfo").classList.add("active");
    document.getElementById("battRing").classList.add("active");
    document.getElementById("panelCenter").classList.add("connected");
    document.body.classList.add("is-connected");
    this._updateConnectionUI();
    this.toast("Aria XD7 Successfully Synced", "success");
  },

  syncUIFromState() {
    const s = this.state;
    document.getElementById("stageCount").value = s.stages;
    document.getElementById("debounceVal").value = s.debounce;
    document.getElementById("motionSync").checked = s.motionSync;
    document.getElementById("angleSnap").checked = s.angleSnap;
    document.getElementById("ripple").checked = s.ripple;

    document.getElementById("brightnessRange").value = s.brightness;
    document.getElementById("brightnessLabel").textContent = s.brightness;
    document.getElementById("brightnessTrack").style.width =
      ((s.brightness - 1) / 9) * 100 + "%";

    document.getElementById("speedRange").value = s.speed;
    document.getElementById("speedLabel").textContent = s.speed;
    document.getElementById("speedTrack").style.width =
      ((s.speed - 1) / 4) * 100 + "%";

    this.renderPollingRateButtons();
    ["pollingRate", "lodControl", "sleepTimer", "ledEffect"].forEach(
      (id) => {
        const seg = document.getElementById(id);
        const val =
          id === "pollingRate"
            ? s.pollingRate
            : id === "lodControl"
              ? s.lod
              : id === "sleepTimer"
                ? s.sleep
                : s.ledMode;
        seg
          .querySelectorAll(".seg-btn")
          .forEach((b) =>
            b.classList.toggle("active", parseInt(b.dataset.val) === val),
          );
      },
    );
    this.updateEffectUI();
    this.renderDPIStages();
    this.renderButtonMap();
  },

  updateBattery(pct) {
    if (pct < 0 || pct > 100) return;
    this.state.battery = pct;
    const fill = document.getElementById("battArc"),
      txt = document.getElementById("battPct");
    if (fill) {
      fill.setAttribute("width", ((19.6 * pct) / 100).toFixed(1));
      fill.style.fill = pct <= 20 ? "var(--danger)" : pct <= 50 ? "var(--accent)" : "var(--success)";
    }
    if (txt) txt.textContent = pct + "%";
  },

  syncStageIndicators() {
    // Firmware stage count controls availability. Preserve stored colors; only
    // active stages are rendered, so reducing count never deletes config data.
    this.renderDPIStages();
  },

  async changeStages(delta) {
    const next = Math.max(1, Math.min(7, this.state.stages + delta));
    if (next === this.state.stages) return;
    const previous = this.state.stages;
    this.state.stages = next;
    document.getElementById("stageCount").value = next;
    this.syncStageIndicators();
    this.saveProfile();
    if (!hid.connected) return;
    try {
      await hid.setStages(next);
      await hid.readCurrentConfig();
    } catch (e) {
      this.state.stages = previous;
      this.syncUIFromState();
      this.toast(e.message, "error");
    }
  },


  _dpiSel: 0,
  selectDPIStage(i) {
    this._dpiSel = i;
    this.renderDPIStages();
  },

  _updateDpiChip(i) {
    const chip = document.getElementById("dpiChip" + i);
    if (!chip) return;
    chip.querySelector(".chip-val").textContent = this.state.dpi[i];
    chip.style.setProperty("--stage-color", this.state.colors[i]);
  },

  renderDPIStages() {
    const n = this.state.stages;
    if (this._dpiSel >= n) this._dpiSel = n - 1;
    const i = this._dpiSel;
    const v = this.state.dpi[i];
    const pct = ((v - 50) / (26000 - 50)) * 100;
    let chips = "";
    for (let k = 0; k < n; k++)
      chips += `<button type="button" class="dpi-chip${k === i ? " active" : ""}" id="dpiChip${k}" style="--stage-color:${this.state.colors[k]}" onclick="app.selectDPIStage(${k})" aria-pressed="${k === i}"><span class="chip-dot"></span><span class="chip-val">${this.state.dpi[k]}</span></button>`;
    document.getElementById("dpiStagesContainer").innerHTML = `
      <div class="dpi-chips">${chips}</div>
      <div class="dpi-edit">
        <button type="button" class="color-swatch" id="swatch${i}" style="background:${this.state.colors[i]}" title="${T("LED color for stage {n}", { n: i + 1 })}" aria-label="${T("LED color for stage {n}", { n: i + 1 })}" onclick="app.openColorPicker(${i})"></button>
        <div class="dpi-slider-wrap">
          <div class="slider-track" id="dpiTrack${i}" style="width:${pct}%"></div>
          <input type="range" id="dpiRange${i}" min="50" max="26000" step="50" value="${v}"
            aria-label="${T("DPI slider for stage {n}", { n: i + 1 })}"
            onwheel="app.wheelDPI(event,${i})"
            oninput="app.slideDPI(${i},this.value)"
            onchange="app.commitDPI(${i},this.value)">
        </div>
        <div class="stepper sm">
          <button type="button" onclick="app.changeDPI(${i},-50)" aria-label="${T("Decrease DPI stage {n}", { n: i + 1 })}">&minus;</button>
          <input type="number" id="dpi${i}" value="${v}" min="50" max="26000" step="50"
            aria-label="${T("DPI value for stage {n}", { n: i + 1 })}"
            onchange="app.setDPI(${i},this.value)">
          <button type="button" onclick="app.changeDPI(${i},50)" aria-label="${T("Increase DPI stage {n}", { n: i + 1 })}">+</button>
        </div>
      </div>`;
  },

  _esc(t) {
    return String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  },

  renderButtonMap() {
    const svg = document.getElementById("btnLines");
    const box = document.getElementById("btnPills");
    if (!svg || !box) return;
    let lines = "",
      pills = "";
    for (const slot of BUTTON_SLOTS) {
      const action = this.state.buttons[slot.idx];
      const changed = !ButtonCodec.same(action, DEFAULT_BUTTONS[slot.idx]);
      const cls = `${changed ? " changed" : ""}${this._pickerSlot === slot.idx ? " open" : ""}${action?.t === "macro" ? " is-macro" : ""}`;
      const name = T(slot.name);
      const val = ButtonCodec.label(action);
      const [ax, ay] = slot.anchor;
      const [lx, ly] = slot.label;
      if (slot.side === "b") {
        // straight down from the underside to a pill centered below the render
        lines += `<polyline class="under" points="${ax},${ay} ${lx},${ly}" />
          <circle cx="${ax}" cy="${ay}" r="1.1" />`;
      } else {
        // elbow: go horizontal into the pill's row
        const ex = slot.side === "l" ? lx + 14 : lx - 14;
        lines += `<polyline${slot.under ? ' class="under"' : ""} points="${ax},${ay} ${ex},${ly} ${lx + (slot.side === "l" ? 2 : -2)},${ly}" />
          <circle cx="${ax}" cy="${ay}" r="1.1" />`;
      }
      const pos =
        slot.side === "b"
          ? `left:${lx}%;top:${ly}%`
          : `${slot.side === "l" ? "left" : "right"}:${slot.side === "l" ? lx : 100 - lx}%;top:${ly}%`;
      pills += `<button type="button" class="btn-pill side-${slot.side}${cls}"
        style="${pos}"
        onclick="app.openButtonPicker(${slot.idx})"
        aria-label="${this._esc(name)}: ${this._esc(val)}">
        <span class="pill-name">${this._esc(name)}${slot.under ? " · " + this._esc(T("underside")) : ""}</span>
        <span class="pill-val">${this._esc(val)}</span>
      </button>`;
    }
    svg.innerHTML = lines;
    box.innerHTML = pills;
  },

  openButtonPicker(idx) {
    const slot = BUTTON_SLOTS.find((x) => x.idx === idx);
    if (!slot) return;
    this._pickerSlot = idx;
    this._pendingKey = null;
    const cur = this.state.buttons[idx];
    const is = (a) => (ButtonCodec.same(cur, a) ? " active" : "");
    const chip = (a, text) =>
      `<button type="button" class="pick-chip${is(a)}" data-action='${this._esc(JSON.stringify(a))}'>${this._esc(text ?? ButtonCodec.label(a))}</button>`;
    const fire = cur.t === "fire" ? cur : { speed: 10, times: 3 };
    const lock = cur.t === "dpiLock" ? cur.dpi : 400;
    const media = cur.t === "media" ? cur.usage : MEDIA_KEYS[0][0];
    const el = document.getElementById("btnPicker");
    el.innerHTML = `
      <div class="pick-head">
        <div><div class="pick-sub">${T("Assign button")}</div><div class="pick-title">${this._esc(T(slot.name))}</div></div>
        <button type="button" class="pick-close" data-close aria-label="${T("Close")}">&times;</button>
      </div>
      <div class="pick-body">
        <div class="pick-group"><div class="pick-label">${T("Mouse")}</div><div class="pick-chips">
          ${Object.keys(MOUSE_NAMES).map((v) => chip({ t: "mouse", v })).join("")}
          ${chip({ t: "click", n: 2 })}${chip({ t: "click", n: 3 })}
        </div></div>
        <div class="pick-group"><div class="pick-label">${T("DPI")}</div><div class="pick-chips">
          ${Object.keys(DPI_FN).map((v) => chip({ t: "dpi", v })).join("")}
        </div>
          <div class="pick-row">
            <span>${T("DPI Lock")}</span>
            <input type="number" id="pickLockDpi" min="50" max="12800" step="50" value="${lock}" aria-label="${T("DPI lock value")}">
            <button type="button" class="pick-set${cur.t === "dpiLock" ? " active" : ""}" data-set="dpiLock">${T("Set")}</button>
          </div>
        </div>
        <div class="pick-group"><div class="pick-label">${T("Wheel")}</div><div class="pick-chips">
          ${["up", "down", "left", "right"].map((v) => chip({ t: "wheel", v })).join("")}
        </div><div class="pick-hint">${T("Wheel and tilt come from the newer CompX firmware. The mouse confirms the write; if the button does nothing, this firmware does not support it.")}</div></div>
        <div class="pick-group"><div class="pick-label">${T("Keyboard")}</div>
          <div class="pick-row">
            <input type="text" id="pickKey" class="pick-capture" readonly placeholder="${T("Click here, then press keys")}"
              value="${cur.t === "key" ? this._esc(ButtonCodec.label(cur)) : ""}" aria-label="${T("Key combination")}">
            <button type="button" class="pick-set${cur.t === "key" ? " active" : ""}" data-set="key">${T("Set")}</button>
          </div>
        </div>
        <div class="pick-group"><div class="pick-label">${T("Media")}</div>
          <div class="pick-row">
            <select id="pickMedia" aria-label="${T("Media function")}">
              ${MEDIA_KEYS.map(([u, n]) => `<option value="${u}"${u === media ? " selected" : ""}>${T(n)}</option>`).join("")}
            </select>
            <button type="button" class="pick-set${cur.t === "media" ? " active" : ""}" data-set="media">${T("Set")}</button>
          </div>
        </div>
        <div class="pick-group"><div class="pick-label">${T("Fire Key (auto click)")}</div>
          <div class="pick-row">
            <span>${T("Speed")}</span><input type="number" id="pickFireSpeed" min="3" max="255" value="${fire.speed}" aria-label="${T("Fire speed 3 to 255")}">
            <span>${T("Times")}</span><input type="number" id="pickFireTimes" min="0" max="3" value="${fire.times}" aria-label="${T("Fire times 0 to 3")}">
            <button type="button" class="pick-set${cur.t === "fire" ? " active" : ""}" data-set="fire">${T("Set")}</button>
          </div>
        </div>
        <div class="pick-group"><div class="pick-label">${T("Other")}</div><div class="pick-chips">
          ${chip({ t: "rgb", v: "toggle" })}${chip({ t: "rgb", v: "cycle" })}${chip({ t: "off" })}
        </div></div>
      </div>
      <div class="pick-foot">
        <button type="button" class="pick-reset" data-action='${this._esc(JSON.stringify(DEFAULT_BUTTONS[idx]))}'>${T("Reset to default")} (${this._esc(ButtonCodec.label(DEFAULT_BUTTONS[idx]))})</button>
      </div>`;
    el.hidden = false;
    this._bindPicker(el, idx);
    this.renderButtonMap();
  },

  closeButtonPicker() {
    const el = document.getElementById("btnPicker");
    if (el) el.hidden = true;
    this._pickerSlot = null;
    this.renderButtonMap();
  },

  _bindPicker(el, idx) {
    if (!this._pickerBound) {
      this._pickerBound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this._pickerSlot != null && e.target.id !== "pickKey")
          this.closeButtonPicker();
      });
    }
    el.onclick = (e) => {
      if (e.target.closest("[data-close]")) return this.closeButtonPicker();
      const a = e.target.closest("[data-action]");
      if (a) return this.assignButton(this._pickerSlot, JSON.parse(a.dataset.action));
      const set = e.target.closest("[data-set]")?.dataset.set;
      if (set === "dpiLock") {
        const v = Math.round(parseInt(el.querySelector("#pickLockDpi").value) / 50) * 50;
        return this.assignButton(this._pickerSlot, { t: "dpiLock", dpi: Math.max(50, Math.min(12800, v || 400)) });
      }
      if (set === "media")
        return this.assignButton(this._pickerSlot, { t: "media", usage: parseInt(el.querySelector("#pickMedia").value) });
      if (set === "fire") {
        const speed = Math.max(3, Math.min(255, parseInt(el.querySelector("#pickFireSpeed").value) || 10));
        const times = Math.max(0, Math.min(3, parseInt(el.querySelector("#pickFireTimes").value) || 0));
        return this.assignButton(this._pickerSlot, { t: "fire", speed, times });
      }
      if (set === "key") {
        if (!this._pendingKey?.key)
          return this.toast("Click the box and press a key (with Ctrl/Shift/Alt/Win if you want)", "error");
        return this.assignButton(this._pickerSlot, this._pendingKey);
      }
    };
    const cap = el.querySelector("#pickKey");
    cap.addEventListener("keydown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const mods =
        (e.ctrlKey ? MOD_BITS.ctrl : 0) |
        (e.shiftKey ? MOD_BITS.shift : 0) |
        (e.altKey ? MOD_BITS.alt : 0) |
        (e.metaKey ? MOD_BITS.win : 0);
      const key = HID_KEYS[e.code] || 0;
      if (!key && !/^(Control|Shift|Alt|Meta|OS)/.test(e.code)) {
        cap.value = T("Key not supported");
        this._pendingKey = null;
        return;
      }
      this._pendingKey = { t: "key", mods, key };
      cap.value = ButtonCodec.label(this._pendingKey) + (key ? "" : " + …");
    });
  },

  assignButton(idx, action) {
    const next = this.state.buttons.map((b, i) => (i === idx ? action : b));
    if (!next.some((b) => b.t === "mouse" && b.v === "left")) {
      this.toast("At least one button must stay Left Click", "error");
      return false;
    }
    this.state.buttons = next;
    this.saveProfile();
    this.closeButtonPicker();
    if (hid.connected)
      return hid
        .setButton(idx, action)
        .then(() => {
          this.toast(`${T(BUTTON_SLOTS[idx].name)} → ${ButtonCodec.label(action)}`, "success");
          return true;
        })
        .catch((e) => {
          this.toast(e.message, "error");
          return false;
        });
    return true;
  },

  slideDPI(stage, val) {
    const n = document.getElementById("dpi" + stage);
    if (n) n.value = val;
    const track = document.getElementById("dpiTrack" + stage);
    if (track) track.style.width = ((val - 50) / 25950) * 100 + "%";
    const chip = document.getElementById("dpiChip" + stage);
    if (chip) chip.querySelector(".chip-val").textContent = val;
  },

  wheelDPI(ev, stage) {
    ev.preventDefault();
    const dir = ev.deltaY < 0 || ev.deltaX > 0 ? 1 : -1;
    this.changeDPI(stage, dir * 50);
  },

  commitDPI(stage, val) {
    this.setDPI(stage, val);
  },

  changeDPI(stage, delta) {
    const val = Math.max(
      50,
      Math.min(26000, this.state.dpi[stage] + delta),
    );
    this.setDPI(stage, val);
  },

  setDPI(stage, val) {
    val = Math.round(
      Math.max(50, Math.min(26000, Math.round(val / 50) * 50)),
    );
    const changed = this.state.dpi[stage] !== val;
    this.state.dpi[stage] = val;
    const num = document.getElementById("dpi" + stage);
    if (num) num.value = val;
    const rng = document.getElementById("dpiRange" + stage);
    if (rng) rng.value = val;
    const track = document.getElementById("dpiTrack" + stage);
    if (track) track.style.width = ((val - 50) / 25950) * 100 + "%";
    this._updateDpiChip(stage);
    if (!changed) return;
    this.saveProfile();
    if (hid.connected)
      hid
        .setDPI(stage + 1, val)
        .catch((e) => this.toast(e.message, "error"));
  },

  setLEDColor(stage, hex) {
    this.state.colors[stage] = hex;
    const sw = document.getElementById("swatch" + stage);
    this._updateDpiChip(stage);
    if (sw) sw.style.background = hex;
    else {
      this.renderDPIStages();
      this.saveProfile();
      if (hid.connected)
        hid
          .setLEDColor(stage + 1, hex)
          .catch((e) => this.toast(e.message, "error"));
      return;
    }
    // Stage dot without re-rendering the whole list.
    if (stage === 0) {
      const dot = document.querySelector(
        ".dpi-row:first-child .nav-dot",
      );
      if (dot) dot.style.background = hex;
    }
    this.saveProfile();
    if (hid.connected)
      hid
        .setLEDColor(stage + 1, hex)
        .catch((e) => this.toast(e.message, "error"));
  },


  _colorPicker: null,
  _colorTarget: -1,

  _getPicker() {
    if (this._colorPicker || !window.Pickr) return this._colorPicker;
    try {
      this._colorPicker = window.Pickr.create({
        el: "#pickr-anchor",
        default: "#ff0000",
        useAsButton: true,
        components: {
          preview: true,
          opacity: false,
          hue: true,
          interaction: { input: true, hex: true, rgba: false, hsva: true },
        },
      });
      this._colorPicker.on("change", (color) => {
        if (!color || !color.toHEXA || this._colorTarget < 0) return;
        this.setLEDColor(
          this._colorTarget,
          color.toHEXA().toString(),
        );
      });
    } catch {
      return null;
    }
    return this._colorPicker;
  },

  openColorPicker(stage) {
    const picker = this._getPicker();
    // No library (offline / CDN blocked): fall back to native input.
    if (!picker) return this._openNativeColor(stage);
    this._colorTarget = stage;
    picker.setColor(this.state.colors[stage] || "#ffffff", true);
    picker.show();
  },

  _openNativeColor(stage) {
    const inp = document.createElement("input");
    inp.type = "color";
    inp.value = this.state.colors[stage] || "#ffffff";
    inp.style.position = "fixed";
    inp.style.opacity = "0";
    inp.style.pointerEvents = "none";
    document.body.appendChild(inp);
    inp.addEventListener("input", () => this.setLEDColor(stage, inp.value));
    inp.addEventListener("change", () => inp.remove(), { once: true });
    inp.click();
  },

  _initPickers() {
  },

  _destroyPickers() {
  },

  bindSegmented() {
    this.renderPollingRateButtons();
    document.querySelectorAll(".segmented").forEach((seg) => {
      seg.querySelectorAll(".seg-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          seg
            .querySelectorAll(".seg-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const val = parseInt(btn.dataset.val);
          if (seg.id === "pollingRate") {
            this.state.pollingRate = val;
            this.saveProfile();
            if (hid.connected)
              hid
                .setPollingRate(val)
                .catch((e) => this.toast(e.message, "error"));
          }
          if (seg.id === "lodControl") {
            this.state.lod = val;
            this.saveProfile();
            if (hid.connected)
              hid
                .setLOD(val)
                .catch((e) => this.toast(e.message, "error"));
          }
          if (seg.id === "sleepTimer") {
            this.state.sleep = val;
            this.saveProfile();
            if (hid.connected)
              hid
                .setSleep(val)
                .catch((e) => this.toast(e.message, "error"));
          }
          if (seg.id === "ledEffect") {
            this.state.ledMode = val;
            this.saveProfile();
            this.updateEffectUI();
            if (hid.connected)
              hid
                .setLEDEffect(
                  val,
                  this.state.brightness,
                  this.state.speed,
                )
                .catch((e) => this.toast(e.message, "error"));
          }
        });
      });
    });
  },

  setToggle(name, checked) {
    this.state[name] = checked;
    this.saveProfile();
    if (!hid.connected) return;
    const fn = {
      motionSync: () => hid.setMotionSync(checked),
      angleSnap: () => hid.setAngleSnap(checked),
      ripple: () => hid.setRipple(checked),
    };
    fn[name]?.().catch((e) => this.toast(e.message, "error"));
  },

  changeDebounce(delta) {
    const next = Math.max(0, Math.min(30, this.state.debounce + delta));
    this.setDebounceManual(next);
  },

  setDebounceManual(val) {
    const next = Math.max(0, Math.min(30, parseInt(val) || 0));
    this.state.debounce = next;
    document.getElementById("debounceVal").value = next;
    this.saveProfile();
    if (hid.connected)
      hid.setDebounce(next).catch((e) => this.toast(e.message, "error"));
  },

  updateEffectUI() {
    const mode = this.state.ledMode;
    document.getElementById("brightnessGroup").style.display =
      mode === 1 ? "" : "none";
    document.getElementById("speedGroup").style.display =
      mode === 2 ? "" : "none";
  },

  slidePreview(el, type) {
    const v = parseInt(el.value);
    document.getElementById(type + "Label").textContent = v;
    document.getElementById(type + "Track").style.width =
      ((v - 1) / (type === "brightness" ? 9 : 4)) * 100 + "%";
  },

  updateEffectSlider() {
    const b = parseInt(document.getElementById("brightnessRange").value);
    const s = parseInt(document.getElementById("speedRange").value);
    this.state.brightness = b;
    this.state.speed = s;
    this.saveProfile();
    if (hid.connected)
      hid
        .setLEDEffect(this.state.ledMode, b, s)
        .catch((e) => this.toast(e.message, "error"));
  },


  async restoreDefaults() {
    if (!hid.connected)
      return this.toast(
        "Connect mouse first to restore defaults",
        "error",
      );
    if (
      !confirm("Are you sure you want to restore defaults to the mouse?")
    )
      return;
    document.getElementById("fabMenu").classList.remove("active");

    this.toast("Restoring default settings...");
    this._setProfileLabel("Profile");
    this.state = {
      stages: 7,
      dpi: [800, 1600, 2000, 2400, 3200, 5000, 26000],
      colors: [
        "#ff0000",
        "#0000ff",
        "#00ff00",
        "#ff00ff",
        "#00ffff",
        "#ff8000",
        "#ffffff",
      ],
      pollingRate: 1,
      lod: 1,
      debounce: 3,
      motionSync: false,
      angleSnap: false,
      ripple: false,
      sleep: 6,
      ledMode: 1,
      brightness: 6,
      speed: 4,
      buttons: DEFAULT_BUTTONS.map((b) => ({ ...b })),
      battery: this.state.battery,
    };

    this.syncUIFromState();
    this.saveProfile({ immediate: true });

    try {
      await hid.setPollingRate(1);
      await hid.setLOD(1);
      await hid.setDebounce(3);
      await hid.setMotionSync(false);
      await hid.setAngleSnap(false);
      await hid.setRipple(false);
      await hid.setSleep(6);
      await hid.setStages(7);
      for (let i = 0; i < 7; i++) {
        await hid.setDPI(i + 1, this.state.dpi[i]);
        await hid.setLEDColor(i + 1, this.state.colors[i]);
      }
      await hid.setLEDEffect(1, 6, 4);
      for (const { idx } of BUTTON_SLOTS)
        await hid.setButton(idx, this.state.buttons[idx]);
      await hid.readCurrentConfig();
      this.syncStageIndicators();
      this.toast("Mouse settings restored successfully!", "success");
    } catch (e) {
      this.toast(e.message, "error");
    }
  },

  openDiagnostics() {
    const dlg = document.getElementById("diagDialog");
    if (!dlg) return;
    this._renderDiagnostics();
    if (!dlg.open) dlg.showModal();
  },

  closeDiagnostics() {
    document.getElementById("diagDialog")?.close();
  },

  _diagRows() {
    const d = hid.device;
    const hex = (v, n = 4) => (typeof v === "number" ? "0x" + v.toString(16).padStart(n, "0") : "—");
    const rb = hid.lastReadback;
    return [
      ["Status", hid.connected ? T("Connected") : T("Not connected")],
      ["Transport", hid.transport ? hid.transportLabel : T("unknown")],
      ["Interface", d ? `${d.productName || "?"} · VID ${hex(d.vendorId)} · PID ${hex(d.productId)} · usagePage ${(d.collections || []).map((c) => hex(c.usagePage)).join(", ") || "—"}` : "—"],
      ["Write channel", hid._outMode === "feature" ? T("Feature report 0x08") : hid._outMode === "output" ? T("Output report 0x08 (BLE style)") : T("not probed yet")],
      ["Read-back", hid.readbackSupported == null ? T("unknown") : hid.readbackSupported ? T("supported") : T("no data returned")],
      ["Last verify", rb ? `0x${rb.addr.toString(16).padStart(4, "0")} ${rb.ok ? "OK" : "FAIL"} · sent [${hid._hex(rb.sent)}] read [${rb.read ? hid._hex(rb.read) : "—"}]` : "—"],
      ["Last battery", hid.lastBatteryAt ? `${hid.lastBattery}% · ${new Date(hid.lastBatteryAt).toLocaleTimeString()}` : T("no answer")],
      ["Timeout scale", "×" + hid._timeoutScale],
      ["Channel probe", (hid.probeLog || []).join(" · ") || "—"],
      ...BUTTON_SLOTS.map((b) => {
        const e = hid._field(BTN_TABLE + b.idx * 4, 3);
        return [T(b.name), e ? hid._hex(e) + " · " + ButtonCodec.label(ButtonCodec.decode(e, null)) : "—"];
      }),
    ];
  },

  _renderDiagnostics() {
    const rows = document.getElementById("diagRows");
    const cand = document.getElementById("diagCandidates");
    if (!rows || !cand) return;
    rows.innerHTML = this._diagRows()
      .map(([k, v]) => `<div class="diag-k">${this._esc(T(k))}</div><div class="diag-v">${this._esc(v)}</div>`)
      .join("");
    const dump = document.getElementById("diagDump");
    if (dump && !this._dumpBusy && !this._dumped) dump.textContent = T("Not dumped yet.");
    const hex = (v) => "0x" + (v ?? 0).toString(16).padStart(4, "0");
    cand.innerHTML = hid.candidates.length
      ? hid.candidates
          .map(
            (c) =>
              `<li class="${c.device === hid.device ? "current" : ""}"><b>${this._esc(c.name)}</b> · VID ${hex(c.vid)} PID ${hex(c.pid)} · ${c.transport} · usagePages [${c.pages.map((p) => "0x" + p.toString(16)).join(", ")}] · score ${c.score}</li>`,
          )
          .join("")
      : `<li class="dim">—</li>`;
  },

  diagnosticsReport() {
    const lines = this._diagRows().map(([k, v]) => `${k}: ${v}`);
    lines.push("", "Candidates:");
    for (const c of hid.candidates)
      lines.push(`  ${c.name} vid=0x${c.vid.toString(16)} pid=0x${c.pid.toString(16)} transport=${c.transport} pages=[${c.pages.map((p) => "0x" + p.toString(16)).join(",")}] score=${c.score}`);
    if (hid.device)
      lines.push(
        "", "Reports declared:",
        ...(hid.device.collections || []).map(
          (c) => `  page 0x${c.usagePage.toString(16)} usage 0x${(c.usage ?? 0).toString(16)} in=[${(c.inputReports || []).map((r) => r.reportId)}] out=[${(c.outputReports || []).map((r) => r.reportId)}] feat=[${(c.featureReports || []).map((r) => r.reportId)}]`,
        ),
      );
    lines.push("", "Channel probe: " + ((hid.probeLog || []).join(" | ") || "—"));
    lines.push("", "Last frames:", ...(hid.wireLog || []).map((l) => "  " + l));
    lines.push("", "userAgent: " + navigator.userAgent);
    return lines.join("\n");
  },

  copyDiagnostics() {
    navigator.clipboard
      .writeText(this.diagnosticsReport())
      .then(() => this.toast("Diagnostics copied", "success"))
      .catch(() => this.toast("Copy failed", "error"));
  },

  async rescanDevices() {
    try {
      const devices = await navigator.hid.getDevices();
      hid._rememberCandidates(devices);
      if (!hid.connected) await hid.autoConnect();
    } catch {}
    this._renderDiagnostics();
  },

  async pairAll() {
    await hid.pair({ all: true });
    this._renderDiagnostics();
  },

  async dumpMemory() {
    if (!hid.connected) return this.toast("Connect the mouse first", "error");
    const out = document.getElementById("diagDump");
    const btn = document.getElementById("diagDumpBtn");
    if (btn) btn.disabled = true;
    this._dumpBusy = true;
    try {
      const bytes = await hid.dumpMemory((done, total, addr) => {
        if (out)
          out.textContent = T("Reading… {pct}% (0x{addr})", {
            pct: Math.floor((done / total) * 100),
            addr: addr.toString(16).padStart(4, "0"),
          });
      });
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "aria-xd7-memory.bin";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      this._dumped = true;
      if (out) out.textContent = "aria-xd7-memory.bin · " + bytes.length + " bytes";
      this.toast("Memory dumped — aria-xd7-memory.bin", "success");
    } catch (e) {
      if (out) out.textContent = e?.message || T("Dump failed");
      this._dumped = true;
      this.toast("Dump failed", "error");
    } finally {
      this._dumpBusy = false;
      if (btn) btn.disabled = false;
    }
  },

  _toastEl: null,
  _timer: null,

  showBluetoothLimit() {
    if (document.getElementById("btLimit")) return;
    const wrap = document.createElement("div");
    wrap.id = "btLimit";
    wrap.className = "setup-overlay";
    wrap.innerHTML = `
      <div class="setup-card" role="dialog" aria-modal="true" aria-labelledby="btLimitTitle">
        <h3 id="btLimitTitle">${T("Settings can't be changed over Bluetooth")}</h3>
        <p>${T("Over Bluetooth the Aria XD7 only exposes its mouse and media-key interfaces. The configuration channel that the cable and the 2.4G receiver have is not there, so no app — this one or the official driver — can read or write settings over Bluetooth.")}</p>
        <p>${T("Settings live in the mouse itself: change them once over the USB cable or the 2.4G receiver, then switch back to Bluetooth — DPI, buttons and macros stay.")}</p>
        <div class="setup-actions">
          <button class="setup-btn" data-act="close">${T("OK")}</button>
        </div>
      </div>`;
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest("[data-act=close]")) wrap.remove();
    });
    document.body.appendChild(wrap);
  },


  showLinuxSetup() {
    if (document.getElementById("linuxSetup")) return;
    const cmd =
      "printf '%s\n' 'KERNEL==\"hidraw*\", ATTRS{idVendor}==\"25a7\", TAG+=\"uaccess\"' 'KERNEL==\"hidraw*\", ATTRS{idVendor}==\"3554\", TAG+=\"uaccess\"' " +
      "'KERNEL==\"hidraw*\", KERNELS==\"*:25A7:*\", TAG+=\"uaccess\"' " +
      "'KERNEL==\"hidraw*\", ATTRS{idVendor}==\"3554\", TAG+=\"uaccess\"' " +
      "'KERNEL==\"hidraw*\", KERNELS==\"*:3554:*\", TAG+=\"uaccess\"' " +
      "| sudo tee /etc/udev/rules.d/70-fantech-aria-xd7.rules >/dev/null " +
      "&& sudo udevadm control --reload-rules && sudo udevadm trigger --subsystem-match=hidraw";
  const wrap = document.createElement("div");
    wrap.id = "linuxSetup";
    wrap.className = "setup-overlay";
    wrap.innerHTML = `
      <div class="setup-card" role="dialog" aria-modal="true" aria-labelledby="linuxSetupTitle">
        <h3 id="linuxSetupTitle">One-time Linux setup</h3>
        <p>Linux blocks browsers from opening the mouse until you allow it once. Open a terminal, paste this command and enter your password:</p>
        <pre class="setup-cmd"></pre>
        <ol>
          <li>Unplug the mouse / dongle and plug it back in.</li>
          <li>Click <b>Connect Device</b> again.</li>
        </ol>
        <p class="setup-dim">Only needed once per computer. Windows and macOS need no setup.</p>
        <div class="setup-actions">
          <button class="setup-btn" data-act="copy">Copy command</button>
          <button class="setup-btn ghost" data-act="close">Close</button>
        </div>
      </div>`;
    wrap.querySelector(".setup-cmd").textContent = cmd;
    const close = () => wrap.remove();
    wrap.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (e.target === wrap || act === "close") close();
      else if (act === "copy") {
        navigator.clipboard
          .writeText(cmd)
          .then(() => this.toast("Command copied", "success"))
          .catch(() => this.toast("Copy failed — select the text manually", "error"));
      }
    });
    document.body.appendChild(wrap);
  },

  toast(msg, type = "success") {
    const box = document.getElementById("toastContainer");
    msg = this._esc(T(String(msg ?? "")));
    if (this._toastEl) {
      this._toastEl.remove();
      clearTimeout(this._timer);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${type === "error" ? "var(--danger)" : "var(--success)"}" stroke-width="2">${type === "error" ? '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>'}</svg><span style="color:${type === "error" ? "var(--danger)" : "var(--text-main)"}">${msg}</span>`;
    box.appendChild(el);
    this._toastEl = el;
    this._timer = setTimeout(() => {
      el.classList.add("toast-out");
      setTimeout(() => {
        el.remove();
        if (this._toastEl === el) this._toastEl = null;
      }, 300);
    }, 3000);
  },
};

document.addEventListener("DOMContentLoaded", () => app.init());

