/* Aria II Pro WebHID configurator — application.
 *
 * UI → handler → validation → Aria II Pro command (protocol.js) → transport
 * (AriaHID, one request in flight, echo + readback) → device state (app.dev)
 * → render. The UI only ever shows values that came back from the mouse; the
 * one exception is a control that is being edited or saved, which is drawn in
 * a "pending" style until the readback arrives.
 *
 * Protocol source of truth: docs/EVIDENCE_LEDGER.md. Visual language: the Aria
 * XD7 configurator in reference/ (layout, glass panels, pills, picker, chips).
 */
"use strict";

const P = window.AriaProto;
const T = (key, vars) => {
  if (window.I18n) return window.I18n.t(key, vars);
  let s = String(key);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
};
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hx = (n, w = 2) => "0x" + (n >>> 0).toString(16).padStart(w, "0").toUpperCase();

class HidError extends Error {}

/* ═══════════════════════════════════════════════════════════════════════
   Transport — EVIDENCE_LEDGER §2.3
   ═══════════════════════════════════════════════════════════════════════ */
class AriaHID {
  constructor() {
    this.device = null;
    this.candidates = [];
    this.wire = [];
    this.stats = { tx: 0, rx: 0, timeouts: 0, retries: 0, mismatches: 0 };
    this.lastVerify = null;
    this.onStatus = null;
    this._pending = null;
    this._chain = Promise.resolve();
    this._onInput = this._onInput.bind(this);
  }
  get connected() {
    return !!(this.device && this.device.opened);
  }
  get transport() {
    return this.device && this.device.productId === P.PID_WIRED ? "wired" : "receiver";
  }
  static hasVendorChannel(d) {
    return (d.collections || []).some((c) => (c.outputReports || []).some((r) => r.reportId === P.REPORT_ID));
  }
  static isOurs(d) {
    return d.vendorId === P.VID && (d.productId === P.PID_RECEIVER || d.productId === P.PID_WIRED);
  }
  remember(list) {
    this.candidates = (list || []).map((d) => ({
      device: d,
      name: d.productName || "?",
      vid: d.vendorId,
      pid: d.productId,
      vendor: AriaHID.hasVendorChannel(d),
      pages: (d.collections || []).map((c) => c.usagePage),
    }));
  }
  pick(list) {
    this.remember(list);
    return (list || []).filter(AriaHID.isOurs).find(AriaHID.hasVendorChannel) || null;
  }
  async request() {
    const list = await navigator.hid.requestDevice({
      filters: [
        { vendorId: P.VID, productId: P.PID_RECEIVER },
        { vendorId: P.VID, productId: P.PID_WIRED },
      ],
    });
    return this.pick(list);
  }
  async known() {
    return this.pick(await navigator.hid.getDevices());
  }
  async open(d) {
    if (!d.opened) await d.open();
    d.removeEventListener("inputreport", this._onInput);
    d.addEventListener("inputreport", this._onInput);
    this.device = d;
    this._chain = Promise.resolve();
    this._pending = null;
  }
  async close() {
    const d = this.device;
    this.device = null;
    if (this._pending) {
      clearTimeout(this._pending.timer);
      this._pending.reject(new HidError(T("Device disconnected")));
      this._pending = null;
    }
    if (d) {
      d.removeEventListener("inputreport", this._onInput);
      try {
        if (d.opened) await d.close();
      } catch {}
    }
  }
  _log(dir, body, reportId = P.REPORT_ID) {
    this.wire.push({ t: Date.now(), dir, rid: reportId, hex: P.hex(body) });
    if (this.wire.length > 400) this.wire.splice(0, this.wire.length - 400);
  }
  _onInput(e) {
    if (e.device !== this.device) return;
    const body = new Uint8Array(e.data.buffer.slice(e.data.byteOffset, e.data.byteOffset + e.data.byteLength));
    this.stats.rx++;
    this._log("RX", body, e.reportId);
    if (e.reportId !== P.REPORT_ID || body.length < 16) return; // e.g. 0x0B macro playback reports
    const f = P.parseBody(body);
    if (!f.ok) return; // the official driver drops frames with a bad checksum
    if (f.id === P.CMD.STATUS) {
      if (this.onStatus) this.onStatus(f.data[0]);
      return;
    }
    const p = this._pending;
    if (p && p.match(body, f)) {
      this._pending = null;
      clearTimeout(p.timer);
      p.resolve(f);
    }
  }
  _exchange(frame, match, timeout) {
    return new Promise((resolve, reject) => {
      if (!this.connected) return reject(new HidError(T("Not connected")));
      const p = { match, resolve, reject, timer: 0 };
      this._pending = p;
      p.timer = setTimeout(() => {
        if (this._pending === p) {
          this._pending = null;
          this.stats.timeouts++;
          reject(Object.assign(new HidError("timeout"), { timeout: true }));
        }
      }, timeout);
      this.stats.tx++;
      this._log("TX", frame);
      this.device.sendReport(P.REPORT_ID, frame).catch((err) => {
        if (this._pending === p) {
          this._pending = null;
          clearTimeout(p.timer);
        }
        reject(err);
      });
    });
  }
  async _transact(frame, match, { timeout = 1000, attempts = 5 } = {}) {
    let last;
    for (let i = 0; i < attempts; i++) {
      if (i) this.stats.retries++;
      try {
        return await this._exchange(frame, match, timeout);
      } catch (e) {
        last = e;
        if (!e.timeout) throw e;
      }
    }
    throw new HidError(T("The mouse did not answer (command {id})", { id: hx(frame[0]) }) + (last && !last.timeout ? ": " + last.message : ""));
  }
  /** Serialise every exchange: only one request may be in flight (ledger §2.3). */
  enqueue(fn) {
    const run = this._chain.then(() => {
      if (!this.connected) throw new HidError(T("Not connected"));
      return fn();
    });
    this._chain = run.catch(() => {});
    return run;
  }
  // ── primitives, only call inside enqueue ──
  _read(addr, len) {
    return this._transact(P.readFrame(addr, len), (b, f) => f.id === P.CMD.READ && f.addr === addr && f.len === len).then((f) => f.data.slice(0, len));
  }
  async _readRange(addr, len) {
    const out = [];
    for (let o = 0; o < len; o += 10) out.push(...(await this._read(addr + o, Math.min(10, len - o))));
    return out;
  }
  _writeEcho(addr, bytes) {
    const fr = P.writeFrame(addr, bytes);
    // 0x07 is accepted only on a byte-identical echo of the request.
    return this._transact(fr, (b) => b.length >= 16 && fr.every((x, i) => x === b[i]));
  }
  _cmd(id, frame, opts) {
    return this._transact(frame || P.simpleFrame(id), (b, f) => f.id === id, opts);
  }
  // ── public API ──
  read(addr, len) {
    return this.enqueue(() => this._readRange(addr, len));
  }
  cmd(id, frame, opts) {
    return this.enqueue(() => this._cmd(id, frame, opts));
  }
  /** Write in ≤10-byte chunks, each echo-confirmed, then read every chunk back. */
  writeVerified(addr, bytes) {
    return this.enqueue(async () => {
      const data = Array.from(bytes);
      for (let o = 0; o < data.length; o += 10) await this._writeEcho(addr + o, data.slice(o, o + 10));
      const back = await this._readRange(addr, data.length);
      const ok = back.length === data.length && back.every((x, i) => x === data[i]);
      this.lastVerify = { addr, sent: data, read: back, ok, t: Date.now() };
      if (!ok) {
        this.stats.mismatches++;
        throw new HidError(T("Readback mismatch at {addr}: wrote [{w}], mouse holds [{r}]", { addr: hx(addr, 4), w: P.hex(data), r: P.hex(back) }));
      }
      return back;
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   UI constants
   ═══════════════════════════════════════════════════════════════════════ */
// Pill layout over the 456×400 render box (percent of the box). The image
// (2768×1536) is letterboxed to 18.4 %–81.6 % of the box height.
const BUTTON_SLOTS = [
  { k: 2, ui: 3, name: "Middle Button", anchor: [33, 37.6], label: [8, 7], side: "l" },
  { k: 0, ui: 1, name: "Left Button", anchor: [38, 46.6], label: [8, 26], side: "l" },
  { k: 1, ui: 2, name: "Right Button", anchor: [14, 51.1], label: [8, 88], side: "l" },
  { k: 3, ui: 5, name: "Back", anchor: [79, 39.9], label: [92, 7], side: "r" },
  { k: 4, ui: 4, name: "Forward", anchor: [69, 43.8], label: [84, 18], side: "r" },
  { k: 5, ui: 6, name: "DPI Button", anchor: [52, 72.5], label: [56, 82], side: "b", under: true },
];
const MOUSE_NAMES = { left: "Left Button", right: "Right Button", middle: "Middle Button", back: "Back", forward: "Forward" };
const MOUSE_CODE_NAMES = { 1: "Left Key", 2: "Right Key", 4: "Middle Key", 8: "Back Key", 16: "Forward Key" };
const DPI_NAMES = { loop: "DPI Loop", up: "DPI+", down: "DPI−" };
const MOD_NAMES = { 1: "Ctrl", 2: "Shift", 4: "Alt", 8: "Win", 16: "Right Ctrl", 32: "Right Shift", 64: "Right Alt", 128: "Right Win" };
const MOD_CODES = { ControlLeft: 1, ShiftLeft: 2, AltLeft: 4, MetaLeft: 8, OSLeft: 8, ControlRight: 16, ShiftRight: 32, AltRight: 64, MetaRight: 128, OSRight: 128 };
// KeyboardEvent.code → USB HID keyboard usage (HID Usage Tables, page 0x07).
const HID_KEYS = (() => {
  const m = {};
  for (let i = 0; i < 26; i++) m["Key" + String.fromCharCode(65 + i)] = 0x04 + i;
  for (let i = 1; i <= 9; i++) m["Digit" + i] = 0x1d + i;
  m.Digit0 = 0x27;
  for (let i = 1; i <= 12; i++) m["F" + i] = 0x39 + i;
  for (let i = 1; i <= 9; i++) m["Numpad" + i] = 0x58 + i;
  Object.assign(m, {
    Enter: 0x28, Escape: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c, Minus: 0x2d, Equal: 0x2e,
    BracketLeft: 0x2f, BracketRight: 0x30, Backslash: 0x31, Semicolon: 0x33, Quote: 0x34, Backquote: 0x35,
    Comma: 0x36, Period: 0x37, Slash: 0x38, CapsLock: 0x39, PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48,
    Insert: 0x49, Home: 0x4a, PageUp: 0x4b, Delete: 0x4c, End: 0x4d, PageDown: 0x4e, ArrowRight: 0x4f,
    ArrowLeft: 0x50, ArrowDown: 0x51, ArrowUp: 0x52, NumLock: 0x53, NumpadDivide: 0x54, NumpadMultiply: 0x55,
    NumpadSubtract: 0x56, NumpadAdd: 0x57, NumpadEnter: 0x58, Numpad0: 0x62, NumpadDecimal: 0x63,
    IntlBackslash: 0x64, ContextMenu: 0x65,
  });
  return m;
})();
const HID_KEY_NAMES = (() => {
  const n = {};
  for (const [code, u] of Object.entries(HID_KEYS))
    n[u] = code.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Numpad(?=\d)/, "Num ").replace(/^Numpad/, "Num ").replace(/^Arrow/, "");
  return n;
})();
const RECEIVER_LED = [
  { v: 1, name: "Connection State and ReportRate", desc: "Must when mouse connects. Red (125 Hz), Blue (250 Hz), Yellow (500 Hz), Cyan (1000 Hz), Purple (2000 Hz), Green (4000 Hz), White (8000 Hz)." },
  { v: 2, name: "Battery State", desc: "Based on the current battery level of the mouse: Green (100 %), Blue (66 %), Yellow (33 %) and Red (0 %)." },
  { v: 3, name: "Only battery warning", desc: "Light stays off; red blinks only when the mouse battery is low." },
];
const STORE_MACROS = "aria2pro.macros.v1";
const STORE_TAB = "aria2pro.tab";

const fmtSecs = (s) => (s < 60 ? s + "s" : s % 60 ? Math.floor(s / 60) + "m" + (s % 60) + "s" : s / 60 + "m");
// Sleep register values are in 10-second units (ledger §4, 0xAD).
const sleepLabel = (v, long) => {
  const s = v * 10;
  if (!long) return fmtSecs(s);
  if (s < 60) return T("{n} seconds", { n: s });
  const m = s / 60;
  return m === 1 ? T("1 minute") : T("{n} minutes", { n: m });
};
const peakLabel = (v) => fmtSecs((P.PEAK_DURATIONS.find((x) => x.v === v) || { s: v * 10 }).s);
const rateLabel = (hz) => (hz >= 1000 ? hz / 1000 + "K" : String(hz));
const lsGet = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch {
    return d;
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   Application
   ═══════════════════════════════════════════════════════════════════════ */
const hid = new AriaHID();

const app = {
  dev: null, // confirmed device state; null until a full read succeeds
  pending: new Set(), // keys of controls whose write/readback is in flight
  want: {}, // requested value per pending key, drawn (blinking) until the readback lands
  busy: null, // label of a blocking operation (profile load, import, restore)
  tab: "perf",
  dpiSel: 0,
  pickerSlot: null,
  dpiDraft: null, // { i, value } while the slider is dragged (local, unsaved)
  colorDraft: null, // { i, hex } while the colour picker is open (local, unsaved)
  macros: [],
  macroSel: null,
  macroEdit: null,
  _timers: {},
  _statusBits: 0,

  /* ── lifecycle ─────────────────────────────────────────────────────── */
  init() {
    this._bindStageScale();
    this._bindStatic();
    this.macros = lsGet(STORE_MACROS, []).filter((m) => m && Array.isArray(m.events));
    if (this.macros.length) this.editMacro(this.macros[0].id);
    else this.newMacro();
    const t = lsGet(STORE_TAB, "perf");
    this.setTab("perf");
    document.addEventListener("aria:lang", () => this.renderAll());
    hid.onStatus = (bits) => this._onStatusBits(bits);
    this.renderAll();
    $("writeStatus").textContent = T("Changes save automatically.");
    if (!("hid" in navigator)) {
      $("btnPair").disabled = true;
      $("heroNote").textContent = T("WebHID is not available. Use desktop Chrome, Edge or Chromium over https:// or localhost.");
      return;
    }
    navigator.hid.addEventListener("disconnect", (ev) => {
      if (ev.device === hid.device) this._lost(T("Device disconnected"));
    });
    navigator.hid.addEventListener("connect", (ev) => {
      if (!hid.connected && AriaHID.isOurs(ev.device)) setTimeout(() => this.autoConnect(), 400);
    });
    this.autoConnect();
  },

  STAGE_W: 1560,
  STAGE_H: 940,
  _bindStageScale() {
    const fit = () => {
      // Narrow windows: stack the windows and scroll instead of shrinking the
      // whole canvas until the text is unreadable (see styles.css .narrow).
      const narrow = window.innerWidth < 1000 || window.innerWidth / this.STAGE_W < 0.62;
      document.body.classList.toggle("narrow", narrow);
      const s = narrow ? 1 : Math.min(window.innerWidth / this.STAGE_W, window.innerHeight / this.STAGE_H);
      document.documentElement.style.setProperty("--stage-scale", String(s));
    };
    fit();
    window.addEventListener("resize", fit);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);
  },

  _bindStatic() {
    $("settingsTabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]");
      if (b) this.setTab(b.dataset.tab);
    });
    $("pollingRate").addEventListener("click", (e) => {
      const b = e.target.closest(".seg-btn");
      if (b && !b.disabled) this.setRate(parseInt(b.dataset.val, 10));
    });
    $("modeSelect").addEventListener("click", (e) => {
      const b = e.target.closest(".seg-btn");
      if (b && !b.disabled) this.setMode(parseInt(b.dataset.val, 10));
    });
    $("lodControl").addEventListener("click", (e) => {
      const b = e.target.closest(".seg-btn");
      if (b && !b.disabled) this.writeField("lod", parseInt(b.dataset.val, 10), T("Lift-Off Distance"));
    });
    $("ledEffect").addEventListener("click", (e) => {
      const b = e.target.closest(".seg-btn");
      if (b && !b.disabled) this.setLedEffect(parseInt(b.dataset.val, 10));
    });
    $("sleepSelect").addEventListener("change", (e) => {
      const v = parseInt(e.target.value, 10);
      // Only official register values are offered; the raw value is serialized.
      if (P.SLEEP_VALUES.includes(v)) this.writeField("sleep", v, T("Sleep Mode") + " · " + sleepLabel(v, true));
    });
    $("profileSwitch").addEventListener("click", (e) => {
      const b = e.target.closest("[data-profile]");
      if (b && !b.disabled) {
        $("profileSwitch").classList.remove("open");
        this.selectProfile(parseInt(b.dataset.profile, 10));
      } else if (e.target.closest(".profile-trigger")) {
        const open = !$("profileSwitch").classList.contains("open");
        $("profileSwitch").classList.toggle("open", open);
        e.target.closest(".profile-trigger").setAttribute("aria-expanded", String(open));
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#profileSwitch")) {
        $("profileSwitch").classList.remove("open");
        const trigger = $("profileSwitch").querySelector(".profile-trigger");
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      }
    });
    $("debounceMinus").addEventListener("click", () => this.stepDebounce(-1));
    $("debouncePlus").addEventListener("click", () => this.stepDebounce(1));
    $("debounceInput").addEventListener("input", (e) => this.typeDebounce(e.target.value, false));
    // Leaving the field commits — except when focus moves to the enable box,
    // where unticking must discard the draft instead.
    $("debounceInput").addEventListener("focusout", (e) => {
      if (e.relatedTarget && e.relatedTarget.id === "debounceGate") return;
      if (this.debDraft != null || e.target.value !== String(this.cv("debounce"))) this.typeDebounce(e.target.value, true);
    });
    $("debounceInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.typeDebounce(e.target.value, true);
      if (e.key === "Escape") this.cancelDebounce();
    });
    $("dongleLed").addEventListener("change", (e) => {
      this.setDongleLed(parseInt(e.target.value, 10));
    });
    $("peakPerf").addEventListener("change", (e) => this.writeField("peak", e.target.checked ? 1 : 0, T("Peak Performance")));
    $("peakDuration").addEventListener("change", (e) => this.writeField("peakDuration", parseInt(e.target.value, 10), T("Peak Performance duration")));
    $("motionSync").addEventListener("change", (e) => this.writeField("motionSync", e.target.checked ? 1 : 0, T("Motion Sync")));
    $("rippleControl").addEventListener("change", (e) => this.writeField("ripple", e.target.checked ? 1 : 0, T("Ripple Control")));
    $("angleSnap").addEventListener("change", (e) => this.writeField("angleSnap", e.target.checked ? 1 : 0, T("Angle Snapping")));
    $("debounceGate").addEventListener("change", (e) => {
      if (!e.target.checked) this.cancelDebounce(); // unchecked: drop any unsaved value
      this.renderSensor();
    });
    $("longDistance").addEventListener("change", (e) => this.setLongDistance(e.target.checked));
    const slider = (id, key) => {
      const el = $(id);
      el.addEventListener("input", () => this._sliderPreview(key, parseInt(el.value, 10)));
      el.addEventListener("change", () => (key === "brightness" ? this.setBrightness(parseInt(el.value, 10)) : this.setSpeed(parseInt(el.value, 10))));
    };
    slider("brightnessRange", "brightness");
    slider("speedRange", "speed");
    $("profileFileInput").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (f) this.importProfileFile(f);
    });
    $("macroFileInput").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (f) this.importMacroFile(f);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (this._recording) return;
      if (this.pickerSlot != null) this.closePicker();

    });
    document.addEventListener("click", (e) => {
      const menu = $("fabMenu");
      if (menu.classList.contains("active") && !e.target.closest(".fab-container")) this.toggleFab(false);
    });
  },

  setTab(tab) {
    this.tab = tab;
    lsSet(STORE_TAB, tab);
    document.querySelectorAll("#settingsTabs .tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tab);
      b.setAttribute("aria-selected", b.dataset.tab === tab ? "true" : "false");
    });
    document.querySelectorAll(".tab-page").forEach((p) => (p.hidden = p.dataset.page !== tab));
  },

  /* ── connection ───────────────────────────────────────────────────── */
  async autoConnect() {
    if (hid.connected || this._connecting) return;
    try {
      const d = await hid.known();
      if (d) await this._openAndLoad(d);
    } catch {}
  },

  async connect() {
    if (!("hid" in navigator)) return;
    const dlg = $("diagDialog");
    if (dlg.open) dlg.close();
    let d;
    try {
      d = await hid.request();
    } catch (e) {
      return this.toast(e.message, "error");
    }
    if (!d) {
      if (hid.candidates.length) this.toast(T("The selected device has no configuration interface. Pick the entry for the Aria II Pro receiver or cable."), "error");
      return;
    }
    if (hid.connected && hid.device !== d) await hid.close();
    await this._openAndLoad(d);
  },

  async _openAndLoad(d) {
    this._connecting = true;
    const btn = $("btnPair");
    btn.disabled = true;
    btn.textContent = T("Connecting…");
    try {
      await hid.open(d);
    } catch (e) {
      this._connecting = false;
      btn.disabled = false;
      btn.textContent = T("Connect Device");
      if (/linux/i.test(navigator.userAgent)) this.showLinuxSetup(e);
      else this.toast(T("Could not open the device: {m}", { m: e.message }), "error");
      return;
    }
    this._connecting = false;
    this.dev = null;
    this.renderAll();
    await this.loadAll({ first: true });
  },

  async disconnect() {
    await hid.close();
    this._lost(null);
  },

  _lost(msg) {
    this._stopTimers();
    hid.close();
    this.dev = null;
    this.busy = null;
    this.pending.clear();
    this.closePicker();
    this.renderAll();
    if (msg) this.toast(msg, "error");
  },

  _stopTimers() {
    for (const k of Object.keys(this._timers)) {
      clearInterval(this._timers[k]);
      clearTimeout(this._timers[k]);
    }
    this._timers = {};
  },

  /* ── full configuration read (ledger §4, official order) ─────────── */
  async loadAll({ first = false } = {}) {
    if (!hid.connected) return;
    const prev = this.dev;
    this.busy = T("Reading the mouse…");
    this.renderAll();
    try {
      const online = await hid.cmd(P.CMD.ONLINE);
      const isOnline = online.data[0] !== 0;
      if (!isOnline) {
        this.dev = { online: false, transport: hid.transport };
        this.busy = null;
        this.renderAll();
        this._watchOnline();
        return;
      }
      const dev = { online: true, transport: hid.transport, mem: new Int16Array(0x1b00).fill(-1), shortcuts: {}, macros: {} };
      const put = (addr, bytes) => bytes.forEach((b, i) => (dev.mem[addr + i] = b));
      put(0x00, await hid.read(0x00, 0xc0));
      const mem = (a) => (dev.mem[a] < 0 ? undefined : dev.mem[a]);
      dev.cfg = P.parseConfig(mem);
      for (const { k } of P.BUTTONS) await this._loadButtonData(dev, k);
      const ver = await hid.cmd(P.CMD.VERSION);
      dev.version = ver.len >= 2 ? P.formatVersion(ver.data[0], ver.data[1]) : null;
      const prof = await hid.cmd(P.CMD.GET_PROFILE);
      dev.profile = prof.len >= 1 ? prof.data[0] & 3 : 0;
      dev.profiles = prof.len >= 1 ? 4 : 1;
      if (dev.transport === "receiver") {
        dev.longRange = (await hid.cmd(P.CMD.GET_LONG_RANGE)).data[0] ? 1 : 0;
        dev.dongleLed = (await hid.cmd(P.CMD.GET_DONGLE_LED)).data[0];
      }
      dev.battery = prev && prev.battery ? prev.battery : null;
      this.dev = dev;
      this.debDraft = null; // a draft belongs to the profile it was typed for
      clearTimeout(this._timers.deb);
      if (this.dpiSel >= dev.cfg.maxDPI) this.dpiSel = dev.cfg.currentDPI;
      if (first || !prev) this.dpiSel = dev.cfg.currentDPI;
      this.busy = null;
      this.renderAll();
      await this.readBattery();
      this._startBattery();
      if (first) this.toast(T("Aria II Pro connected · profile {n} read from the mouse", { n: dev.profile + 1 }), "success");
    } catch (e) {
      this.busy = null;
      if (!hid.connected) return;
      this.dev = prev && prev.online ? prev : null;
      this.renderAll();
      this.toast(T("Reading the configuration failed: {m}", { m: e.message }), "error");
    }
  },

  async _loadButtonData(dev, k) {
    const e = dev.cfg.keys[k];
    if (!e) return;
    if (e[0] === 0x05) {
      const base = P.SHORTCUT_BASE + P.SHORTCUT_STRIDE * k;
      const bytes = await hid.read(base, 20);
      bytes.forEach((b, i) => (dev.mem[base + i] = b));
      dev.shortcuts[k] = P.decodeShortcut(bytes);
    } else if (e[0] === 0x06) {
      const slot = e[1];
      if (slot > 15) return;
      const base = P.MACRO_BASE + P.MACRO_STRIDE * slot;
      const head = await hid.read(base, 0x20);
      const h = P.decodeMacroHeader(head);
      let bytes = head;
      if (h) bytes = head.concat(await hid.read(base + 0x20, h.total - 0x20));
      bytes.forEach((b, i) => (dev.mem[base + i] = b));
      dev.macros[slot] = h ? P.decodeMacro(bytes) : null;
    }
  },

  _watchOnline() {
    clearInterval(this._timers.online);
    this._timers.online = setInterval(async () => {
      if (!hid.connected) return clearInterval(this._timers.online);
      if (this.busy) return;
      try {
        const r = await hid.cmd(P.CMD.ONLINE, null, { attempts: 1 });
        if (r.data[0]) {
          clearInterval(this._timers.online);
          await this.loadAll({ first: true });
        }
      } catch {}
    }, 2000);
  },

  /* ── battery (ledger §8; official 5 s poll, display smoothing) ────── */
  /* Official status timer: 0x03 (online) then 0x04 (battery) every 5 s.
     sleepmode-ledidle.pcapng: after ~10 s without movement the receiver
     answers 0x03 with online = 0 and leaves 0x04 unanswered until the mouse
     moves again. The configuration stays on screen; writes wait. */
  _startBattery() {
    clearInterval(this._timers.battery);
    this._timers.battery = setInterval(() => this._statusTick(), 5000);
  },
  async _statusTick() {
    if (this.busy || !this.dev || !this.dev.cfg || !hid.connected) return;
    let online;
    try {
      online = (await hid.cmd(P.CMD.ONLINE, null, { attempts: 1 })).data[0] !== 0;
    } catch {
      return;
    }
    if (!online) {
      if (!this.dev.asleep) {
        this.dev.asleep = true;
        this.renderAll();
      }
      return;
    }
    if (this.dev.asleep) {
      // Woke up: re-read so nothing changed elsewhere is missed.
      this.dev.asleep = false;
      return this.loadAll();
    }
    await this.readBattery();
  },
  async readBattery() {
    if (!this.dev || !this.dev.online || this.dev.asleep) return;
    try {
      const r = await hid.cmd(P.CMD.BATTERY, null, { attempts: 1 });
      const b = P.parseBattery(r.data);
      const prev = this.dev.battery;
      let shown = b.percent;
      if (prev && prev.shown != null) {
        // BatteryHandle: move 1 % per reading toward the measured value,
        // down only while discharging, up only while charging; jump on ≥30 %.
        const diff = b.percent - prev.shown;
        if (Math.abs(diff) >= 30) shown = b.percent;
        else if (b.charging) shown = diff > 0 ? prev.shown + 1 : prev.shown;
        else shown = diff < 0 ? prev.shown - 1 : prev.shown;
      }
      this.dev.battery = { ...b, shown, at: Date.now() };
      this.renderBattery();
    } catch {}
  },

  /* ── 0x0A notifications (ledger §3, §6.4) ─────────────────────────── */
  _onStatusBits(bits) {
    this._statusBits |= bits;
    clearTimeout(this._timers.status);
    this._timers.status = setTimeout(() => this._handleStatus(), 150);
  },
  async _handleStatus() {
    const bits = this._statusBits;
    this._statusBits = 0;
    if (!this.dev || !this.dev.online) {
      if (hid.connected && (bits & 0x04)) this.loadAll();
      return;
    }
    if (this._profileSwitching) return; // selectProfile does its own re-read
    try {
      if (bits & 0x04) return this.loadAll(); // profile/config changed on the mouse
      if (bits & 0x01) this._applyFlash(0x02, await hid.read(0x02, 4)); // maxDPI + currentDPI
      if (bits & 0x02) this._applyFlash(0x00, await hid.read(0x00, 2));
      if (bits & 0x08) this._applyFlash(0x4c, await hid.read(0x4c, 8));
      if (bits & 0x40) await this.readBattery();
      if (bits & 0x0b) this.renderAll();
    } catch {}
  },
  _applyFlash(addr, bytes) {
    const d = this.dev;
    bytes.forEach((b, i) => (d.mem[addr + i] = b));
    d.cfg = P.parseConfig((a) => (d.mem[a] < 0 ? undefined : d.mem[a]));
  },

  /* ── generic guarded write ────────────────────────────────────────── */
  ready() {
    // On refusal, redraw so a toggled checkbox/radio snaps back to the device value.
    if (this.dev && this.dev.asleep) {
      this.toast(T("The mouse is asleep. Move it, then try again."), "error");
      setTimeout(() => this.renderAll());
      return false;
    }
    if (!hid.connected || !this.dev || !this.dev.online) {
      this.toast(T("Connect the mouse first"), "error");
      setTimeout(() => this.renderAll());
      return false;
    }
    if (this.busy) {
      this.toast(T("Please wait: {what}", { what: this.busy }), "error");
      setTimeout(() => this.renderAll());
      return false;
    }
    return true;
  },

  /** Value to draw: the requested one while its write is pending, else the confirmed one. */
  cv(name) {
    return this.pending.has(name) && name in this.want ? this.want[name] : this.dev.cfg[name];
  },

  /** Write one two-byte field, wait for the echo, read it back, update state. */
  async writeField(name, value, label, { silentSame = true } = {}) {
    if (!this.ready()) return false;
    const f = P.F[name];
    if (silentSame && this.dev.cfg[name] === value) return true;
    this.pending.add(name);
    this.want[name] = value;
    this.renderAll();
    try {
      const back = await hid.writeVerified(f.addr, P.enc2(value));
      this._applyFlash(f.addr, back);
      this.saved(label);
      return true;
    } catch (e) {
      this.failed(label, e);
      await this._resync(f.addr, 2);
      return false;
    } finally {
      this.pending.delete(name);
      delete this.want[name];
      this.renderAll();
    }
  },
  async _resync(addr, len) {
    try {
      if (hid.connected && this.dev && this.dev.mem) this._applyFlash(addr, await hid.read(addr, len));
    } catch {}
  },
  async _writeRecord(key, addr, bytes, label) {
    if (!this.ready()) return null;
    this.pending.add(key);
    this.renderAll();
    try {
      const back = await hid.writeVerified(addr, bytes);
      this._applyFlash(addr, back);
      this.saved(label);
      return back;
    } catch (e) {
      this.failed(label, e);
      await this._resync(addr, bytes.length);
      return null;
    } finally {
      this.pending.delete(key);
      this.renderAll();
    }
  },
  saved(label) {
    const el = $("writeStatus");
    el.className = "write-status";
    el.textContent = "";
  },
  failed(label, e) {
    const el = $("writeStatus");
    el.className = "write-status err";
    el.textContent = T("{what} not saved: {m}", { what: label, m: e.message });
    this.toast(T("{what} not saved: {m}", { what: label, m: e.message }), "error");
  },

  /* ── Performance ──────────────────────────────────────────────────── */
  setRate(code) {
    return this.writeField("reportRate", code, T("Polling Rate") + " " + P.rateHz(code) + " Hz");
  },
  modeLocked() {
    const d = this.dev;
    return !d || !d.cfg || d.transport === "wired" || d.cfg.reportRate >= 0x10;
  },
  setMode(v) {
    // Corded (10) is a UI sentinel and is never written (ledger §6.5).
    if (v === 10 || this.modeLocked()) return;
    return this.writeField("mode", v, T("Mode Select"));
  },

  selectStage(i) {
    if (!this.dev || !this.dev.cfg || i >= this.dev.cfg.maxDPI) return;
    this.dpiSel = i;
    this.dpiDraft = null;
    this.renderPerformance();
    // In the official app clicking a stage also makes it the active stage.
    if (this.dev.cfg.currentDPI !== i) this.writeField("currentDPI", i, T("Active DPI stage {n}", { n: i + 1 }));
  },

  async changeStageCount(delta) {
    if (!this.ready()) return;
    const c = this.dev.cfg;
    const n = Math.max(1, Math.min(P.STAGES_MAX, c.maxDPI + delta));
    if (n === c.maxDPI) return;
    const label = T("DPI stages: {n}", { n });
    // Official behaviour and order (M:29902–29939, native diff writer): count,
    // then active stage, then per stage DPI record and colour. When the active
    // stage falls outside the new count, x/y and colour move into slot n−1 while
    // each slot keeps its own DPIex byte.
    const plan = P.stageCountPlan(c, n);
    this.pending.add("stages");
    this.renderAll();
    try {
      for (const w of plan.writes) this._applyFlash(w.addr, await hid.writeVerified(w.addr, w.bytes));
      this.dpiSel = this.dev.cfg.currentDPI;
      this.saved(label);
    } catch (e) {
      this.failed(label, e);
      await this._resync(0x00, 0x4c);
    } finally {
      this.pending.delete("stages");
      this.renderAll();
    }
  },

  slideDPI(i, v) {
    this.dpiDraft = { i, value: Math.round(v / 50) * 50 };
    this._paintDpiEditor();
  },
  wheelDPI(ev, i) {
    ev.preventDefault();
    if (!this.dev || !this.dev.cfg) return;
    const base = this.dpiDraft && this.dpiDraft.i === i ? this.dpiDraft.value : this.dev.cfg.dpi[i];
    this.slideDPI(i, Math.max(P.DPI_MIN, Math.min(P.DPI_MAX, base + (ev.deltaY < 0 ? 50 : -50))));
    clearTimeout(this._timers.wheel);
    this._timers.wheel = setTimeout(() => this.commitDPI(i), 600);
  },
  stepDPI(i, delta) {
    if (!this.dev || !this.dev.cfg) return;
    const base = this.dpiDraft && this.dpiDraft.i === i ? this.dpiDraft.value : this.dev.cfg.dpi[i];
    this.slideDPI(i, Math.max(P.DPI_MIN, Math.min(P.DPI_MAX, base + delta)));
    clearTimeout(this._timers.wheel);
    this._timers.wheel = setTimeout(() => this.commitDPI(i), 500);
  },
  typeDPI(i, v) {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return this.renderPerformance();
    this.slideDPI(i, Math.max(P.DPI_MIN, Math.min(P.DPI_MAX, n)));
    this.commitDPI(i);
  },
  async commitDPI(i) {
    clearTimeout(this._timers.wheel);
    const d = this.dpiDraft;
    if (!d || d.i !== i) return;
    if (d.value === this.dev.cfg.dpi[i]) {
      this.dpiDraft = null;
      return this.renderPerformance();
    }
    const back = await this._writeRecord("dpi" + i, 0x0c + 4 * i, P.encodeDpi(d.value), T("Stage {n} DPI {v}", { n: i + 1, v: d.value }));
    if (this.dpiDraft === d) this.dpiDraft = null;
    this.renderPerformance();
    return back;
  },

  /* colour picker (Pickr with native fallback) */
  _getPicker() {
    if (this._picker || !window.Pickr) return this._picker || null;
    try {
      this._picker = window.Pickr.create({
        el: "#pickr-anchor",
        theme: "classic",
        default: "#ff0000",
        useAsButton: true,
        components: { preview: true, opacity: false, hue: true, interaction: { input: true, hex: true, save: true } },
      });
      this._picker.on("change", (c) => {
        if (!c || this._colorTarget == null) return;
        this.colorDraft = { i: this._colorTarget, hex: c.toHEXA().toString().slice(0, 7) };
        this._paintDpiEditor();
      });
      this._picker.on("save", () => this._picker.hide());
      this._picker.on("hide", () => this.commitColor());
    } catch {
      this._picker = null;
    }
    return this._picker;
  },
  openColorPicker(i) {
    if (!this.ready()) return;
    this._colorTarget = i;
    const cur = this.dev.cfg.colors[i] || "#ffffff";
    const p = this._getPicker();
    if (!p) {
      const inp = document.createElement("input");
      inp.type = "color";
      inp.value = cur;
      inp.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(inp);
      inp.addEventListener("input", () => {
        this.colorDraft = { i, hex: inp.value };
        this._paintDpiEditor();
      });
      inp.addEventListener("change", () => {
        inp.remove();
        this.commitColor();
      });
      inp.click();
      return;
    }
    // Pickr opens next to its anchor: move the (fixed) anchor onto the swatch.
    const sw = $("dpiSwatch"),
      anchor = $("pickr-anchor");
    if (sw && anchor) {
      const r = sw.getBoundingClientRect();
      anchor.style.left = r.left + "px";
      anchor.style.top = r.bottom + "px";
      anchor.style.width = r.width + "px";
      anchor.style.height = "1px";
    }
    p.setColor(cur, true);
    p.show();
  },
  async commitColor() {
    const d = this.colorDraft;
    if (!d) return;
    if ((this.dev.cfg.colors[d.i] || "").toLowerCase() === d.hex.toLowerCase()) {
      this.colorDraft = null;
      return this.renderPerformance();
    }
    await this._writeRecord("color" + d.i, 0x2c + 4 * d.i, P.encodeColor(...P.hexToRgb(d.hex)), T("Stage {n} colour", { n: d.i + 1 }));
    if (this.colorDraft === d) this.colorDraft = null;
    this.renderPerformance();
  },

  /* ── Sensor ───────────────────────────────────────────────────────── */
  /* Debounce: the checkbox is the official UI-only gate (ledger §6.3). Edits
     are local drafts until committed; a commit writes 0xA9 and reads it back. */
  debDraft: null,
  _debBase() {
    return this.debDraft != null ? this.debDraft : this.cv("debounce");
  },
  stepDebounce(delta) {
    if (!$("debounceGate").checked || !this.dev || !this.dev.cfg) return;
    this.debDraft = Math.max(0, Math.min(20, this._debBase() + delta));
    this.renderSensor();
    clearTimeout(this._timers.deb);
    this._timers.deb = setTimeout(() => this.commitDebounce(), 700);
  },
  typeDebounce(raw, commit) {
    if (!$("debounceGate").checked || !this.dev || !this.dev.cfg) return;
    clearTimeout(this._timers.deb);
    const n = Number(raw);
    if (raw === "" || !Number.isInteger(n) || n < 0 || n > 20) {
      $("debounceHint").textContent = T("Enter a whole number from 0 to 20 ms.");
      $("debounceHint").className = "p-hint deb-hint warn-text";
      $("debounceHint").hidden = false;
      $("debounceStepper").classList.add("invalid");
      if (commit) {
        this.debDraft = null;
        $("debounceInput").value = this.cv("debounce"); // snap back to the confirmed value
        $("debounceStepper").classList.remove("invalid");
        this._renderDebounce();
        $("debounceHint").textContent = T("Enter a whole number from 0 to 20 ms.");
        $("debounceHint").className = "p-hint deb-hint warn-text";
        $("debounceHint").hidden = false;
      }
      return;
    }
    $("debounceStepper").classList.remove("invalid");
    this.debDraft = n;
    if (commit) this.commitDebounce();
    else {
      this._paintDebounceHint();
      this._timers.deb = setTimeout(() => this.commitDebounce(), 1500);
    }
  },
  cancelDebounce() {
    clearTimeout(this._timers.deb);
    this.debDraft = null;
    $("debounceStepper").classList.remove("invalid");
    this.renderSensor();
  },
  async commitDebounce() {
    clearTimeout(this._timers.deb);
    const ms = this.debDraft;
    if (ms == null) return;
    if (!$("debounceGate").checked) return this.cancelDebounce(); // never write while disabled
    this.debDraft = null;
    if (ms === this.dev.cfg.debounce) return this.renderSensor(); // nothing to write
    const ok = await this.writeField("debounce", ms, T("Debounce Time {v} ms", { v: ms }));
    // Official: choosing a value closes the gate again (M:30805).
    if (ok) $("debounceGate").checked = false;
    this.renderSensor();
  },

  /* ── DPI light effects (ledger §6.6) ──────────────────────────────── */
  ledIndex() {
    const c = this.dev && this.dev.cfg;
    if (!c) return null;
    return c.ledEnable ? c.ledMode : 0;
  },
  async setLedEffect(idx) {
    if (!this.ready()) return;
    const c = this.dev.cfg;
    const label = T("DPI Light Effect");
    this.want.ledIdx = idx;
    if (idx === 0) return this.writeField("ledEnable", 0, label);
    this.pending.add("ledMode");
    this.renderAll();
    try {
      // One frame per changed field, in address order (0x4C mode, 0x52 enable).
      if (c.ledMode !== idx) this._applyFlash(0x4c, await hid.writeVerified(0x4c, P.enc2(idx)));
      if (this.dev.cfg.ledEnable !== 1) this._applyFlash(0x52, await hid.writeVerified(0x52, P.enc2(1)));
      this.saved(label);
    } catch (e) {
      this.failed(label, e);
      await this._resync(0x4c, 8);
    } finally {
      this.pending.delete("ledMode");
      this.renderAll();
    }
  },
  _sliderPreview(key, v) {
    const max = key === "brightness" ? 10 : 5;
    $(key + "Label").textContent = v;
    $(key + "Track").style.width = ((v - 1) / (max - 1)) * 100 + "%";
  },
  setBrightness(ui) {
    const c = this.dev && this.dev.cfg;
    if (!c || !(c.ledEnable && c.ledMode === 1)) return this.renderLighting();
    return this.writeField("ledBrightness", P.BRIGHTNESS_RAW[ui - 1], T("Brightness {v}", { v: ui }));
  },
  setSpeed(ui) {
    const c = this.dev && this.dev.cfg;
    if (!c || !(c.ledEnable && c.ledMode === 2)) return this.renderLighting();
    return this.writeField("ledSpeed", ui, T("Speed {v}", { v: ui }));
  },

  /* ── Receiver (ledger §6.8, §6.10) ────────────────────────────────── */
  async setLongDistance(on) {
    if (!this.ready() || this.dev.transport !== "receiver") return this.renderReceiver();
    const label = T("Long distance");
    this.pending.add("longRange");
    this.want.longRange = on;
    this.renderReceiver();
    try {
      await hid.cmd(P.CMD.SET_LONG_RANGE, P.longRangeFrame(on));
      const r = await hid.cmd(P.CMD.GET_LONG_RANGE);
      this.dev.longRange = r.data[0] ? 1 : 0;
      if (this.dev.longRange !== (on ? 1 : 0)) throw new HidError(T("The receiver reports a different value"));
      this.saved(label);
    } catch (e) {
      this.failed(label, e);
    } finally {
      this.pending.delete("longRange");
      this.renderReceiver();
    }
  },
  async setDongleLed(mode) {
    if (!this.ready() || this.dev.transport !== "receiver") return this.renderReceiver();
    const label = T("Receiver LED indicator");
    this.pending.add("dongleLed");
    this.want.dongleLed = mode;
    this.renderReceiver();
    try {
      await hid.cmd(P.CMD.SET_DONGLE_LED, P.dongleLedFrame(mode));
      const r = await hid.cmd(P.CMD.GET_DONGLE_LED);
      this.dev.dongleLed = r.data[0];
      if (this.dev.dongleLed !== mode) throw new HidError(T("The receiver reports a different value"));
      this.saved(label);
    } catch (e) {
      this.failed(label, e);
    } finally {
      this.pending.delete("dongleLed");
      this.renderReceiver();
    }
  },

  /* ── Profiles (ledger §6.1) ───────────────────────────────────────── */
  async selectProfile(p) {
    if (!this.ready() || p === this.dev.profile) return;
    this._profileSwitching = true;
    this.busy = T("Switching to profile {n}…", { n: p + 1 });
    this.closePicker();
    this.renderAll();
    try {
      await hid.cmd(P.CMD.SET_PROFILE, P.profileFrame(p));
      await sleep(120);
      const r = await hid.cmd(P.CMD.GET_PROFILE);
      if ((r.data[0] & 3) !== p) throw new HidError(T("The mouse stayed on profile {n}", { n: (r.data[0] & 3) + 1 }));
      this.busy = null;
      await this.loadAll();
      this.saved(T("Profile {n}", { n: p + 1 }));
    } catch (e) {
      this.busy = null;
      this.failed(T("Profile {n}", { n: p + 1 }), e);
      await this.loadAll();
    } finally {
      this._profileSwitching = false;
      this.renderAll();
    }
  },

  /* ── Buttons (ledger §5.4–§5.6, §6.2) ─────────────────────────────── */
  actionOf(k) {
    const c = this.dev && this.dev.cfg;
    if (!c || !c.keys[k]) return null;
    const e = c.keys[k];
    return P.decodeAction(e, this.dev.shortcuts[k], e[0] === 6 ? this.dev.macros[e[1]] : null);
  },
  actionLabel(a) {
    if (!a) return "—";
    switch (a.t) {
      case "off":
        return T("Disabled");
      case "mouse":
        return T(MOUSE_NAMES[a.v]);
      case "dpi":
        return T(DPI_NAMES[a.v]);
      case "hscroll":
        return T(a.v === "left" ? "Scroll Left" : "Scroll Right");
      case "vscroll":
        return T(a.v === "up" ? "Scroll Up" : "Scroll Down");
      case "fire":
        return T("Fire key") + ` · ${a.interval} ms · ${a.times ? "×" + a.times : T("hold")}`;
      case "media": {
        const m = P.MEDIA.find(([u]) => u === a.usage);
        return m ? T(m[1]) : T("Media key") + " " + hx(a.usage, 3);
      }
      case "combo":
        return a.unknown ? T("Combo Key") : this.comboLabel(a);
      case "macro":
        return T("Macro") + (a.name ? " · " + a.name : "");
      case "rate":
        return T("Polling Rate Switch");
      case "dpiLock":
        return T("DPI Lock") + " " + a.dpi;
      default:
        return T("Unknown") + " " + P.hex(a.bytes);
    }
  },
  comboLabel(a) {
    const parts = [];
    for (const bit of [1, 2, 4, 8, 16, 32, 64, 128]) if (a.mods & bit) parts.push(MOD_NAMES[bit]);
    for (const k of a.keys || []) parts.push(HID_KEY_NAMES[k] || hx(k));
    return parts.join(" + ") || T("Combo Key");
  },
  macroModeLabel(a) {
    if (a.mode === "released") return T("Cycle Until Key Released");
    if (a.mode === "pressed") return T("Cycle Until Key Pressed");
    if (a.mode === "thisKey") return T("Cycle Until This Key Pressed");
    return T("Times of cycles: {n}", { n: a.times });
  },

  async assignButton(k, action, { macro } = {}) {
    if (!this.ready()) return false;
    if (k === 0) {
      this.toast(T("Button 1 stays Left Button (the official app requires a Left button)."), "error");
      return false;
    }
    const slot = BUTTON_SLOTS.find((s) => s.k === k);
    const label = T(slot.name) + " → " + this.actionLabel({ ...action, name: macro && macro.name });
    let block = null,
      macroBytes = null;
    try {
      if (action.t === "media" || action.t === "combo") block = P.encodeShortcut(action);
      if (action.t === "macro") macroBytes = P.encodeMacro(macro.name, macro.events);
    } catch (e) {
      this.toast(e.message, "error");
      return false;
    }
    const entry = P.encodeAction(action, k);
    const recAddr = 0x60 + 4 * k;
    const scAddr = P.SHORTCUT_BASE + P.SHORTCUT_STRIDE * k;
    const mkAddr = P.MACRO_BASE + P.MACRO_STRIDE * k;
    // What the button and its data area hold now, for rollback.
    const mem = this.dev.mem;
    const raw = (a, n) => Array.from({ length: n }, (_, i) => mem[a + i]);
    const prevEntry = this.dev.cfg.keys[k] ? this.dev.cfg.keys[k].slice() : null;
    const prevSc = prevEntry && prevEntry[0] === 5 && this.dev.shortcuts[k] ? raw(scAddr, this.dev.shortcuts[k].count * 3 + 2) : null;
    const prevMk = prevEntry && prevEntry[0] === 6 && prevEntry[1] === k && this.dev.macros[k] ? raw(mkAddr, 0x20 + 5 * this.dev.macros[k].events.length + 1) : null;
    this.pending.add("btn" + k);
    this.closePicker();
    this.renderAll();
    let entryWritten = false,
      dataTouched = false;
    try {
      // Official order (native diff writer N:FUN_10006d40): key record, then
      // shortcut block, then macro slot. Each frame is echo-confirmed and every
      // write is read back before the next one starts.
      this._applyFlash(recAddr, await hid.writeVerified(recAddr, P.buttonRecord(entry)));
      entryWritten = true;
      if (block) {
        dataTouched = true;
        this._applyFlash(scAddr, await hid.writeVerified(scAddr, block));
        this.dev.shortcuts[k] = P.decodeShortcut(block);
      }
      if (macroBytes) {
        dataTouched = true;
        this._applyFlash(mkAddr, await hid.writeVerified(mkAddr, macroBytes));
        this.dev.macros[k] = P.decodeMacro(macroBytes);
      }
      this.saved(label);
      return true;
    } catch (e) {
      let note = "";
      if (entryWritten && dataTouched) note = await this._rollbackButton(k, prevEntry, prevSc, prevMk, !!block, !!macroBytes);
      this.failed(label, Object.assign(new Error(e.message + (note ? " · " + note : "")), {}));
      await this._resync(0x60, 0x20);
      try {
        await this._loadButtonData(this.dev, k);
      } catch {}
      return false;
    } finally {
      this.pending.delete("btn" + k);
      this.renderAll();
    }
  },

  /**
   * A data write failed after the key record already points at it. Put the
   * previous assignment back (data first, then record); if that is impossible,
   * fall back to the factory function of that button, which needs no data, so
   * the button never points at a half-written block.
   */
  async _rollbackButton(k, prevEntry, prevSc, prevMk, newSc, newMk) {
    const recAddr = 0x60 + 4 * k;
    const scAddr = P.SHORTCUT_BASE + P.SHORTCUT_STRIDE * k;
    const mkAddr = P.MACRO_BASE + P.MACRO_STRIDE * k;
    try {
      const prevUsesSc = prevEntry && prevEntry[0] === 5;
      const prevUsesMk = prevEntry && prevEntry[0] === 6 && prevEntry[1] === k;
      // Data the previous assignment depends on was overwritten → restore it first.
      if (prevUsesSc && newSc) {
        if (!prevSc) throw new Error("no copy");
        this._applyFlash(scAddr, await hid.writeVerified(scAddr, prevSc));
      }
      if (prevUsesMk && newMk) {
        if (!prevMk) throw new Error("no copy");
        this._applyFlash(mkAddr, await hid.writeVerified(mkAddr, prevMk));
      }
      if (!prevEntry) throw new Error("no previous record");
      this._applyFlash(recAddr, await hid.writeVerified(recAddr, P.buttonRecord(prevEntry)));
      return T("previous assignment restored");
    } catch {
      try {
        const fac = P.encodeAction(P.FACTORY_BUTTONS[k], k);
        this._applyFlash(recAddr, await hid.writeVerified(recAddr, P.buttonRecord(fac)));
        return T("button reset to its factory function because the previous data could not be restored");
      } catch {
        return T("the button may point to incomplete data: re-read the mouse and assign it again");
      }
    }
  },

  /* ═════ Rendering ═════════════════════════════════════════════════ */
  renderAll() {
    const d = this.dev;
    const connected = hid.connected;
    const ready = !!(d && d.online && d.cfg);
    document.body.classList.toggle("is-connected", connected && ready);
    document.body.classList.toggle("is-busy", !!this.busy);
    document.body.classList.toggle("is-asleep", !!(d && d.asleep));
    const pc = $("panelCenter");
    pc.classList.toggle("connected", connected && ready);
    $("btnPair").textContent = T(connected ? (d && !d.online ? "Waiting for the mouse…" : "Reading the mouse…") : "Connect Device");
    $("btnPair").disabled = connected;
    $("heroPair").hidden = !(connected && d && !d.online && hid.transport === "receiver");
    $("heroNote").textContent = connected && d && !d.online ? T("Receiver connected · move the mouse") : T("Use the 2.4 GHz receiver or the USB cable.");
    this.renderConn();
    this.renderBattery();
    this.renderProfiles();
    this.renderButtonMap();
    this.renderFacts();
    this.renderPerformance();
    this.renderSensor();
    this.renderLighting();
    this.renderReceiver();
    const wired = !!(d && d.transport === "wired");
    $("receiverSection").hidden = wired;
    $("longDistanceWrap").hidden = wired;
    $("wiredNote").hidden = !wired;
    $("fabProfileName").textContent = ready ? T("Profile {n}", { n: d.profile + 1 }) : "—";
    this._renderMacroLists();
    if ($("diagDialog").open) this.renderDiagnostics();
  },

  renderConn() {
    const chip = $("connChip");
    const d = this.dev;
    let text = T("Not connected"),
      on = false;
    if (hid.connected) {
      on = !!(d && d.online);
      const via = hid.transport === "wired" ? T("USB cable") : T("2.4 GHz receiver");
      text = this.busy ? this.busy : d && !d.online ? T("Receiver connected · mouse offline") : d && d.asleep ? T("Mouse asleep · move it to wake") : T("Connected via {via}", { via });
    }
    if (d && d.asleep) on = false;
    chip.classList.toggle("on", on);
    chip.classList.toggle("warn", hid.connected && !on);
    chip.querySelector(".conn-text").textContent = text;
  },

  renderBattery() {
    const b = this.dev && this.dev.battery;
    const ring = $("battRing");
    ring.classList.toggle("active", !!(this.dev && this.dev.online));
    const fill = $("battArc"),
      txt = $("battPct");
    if (!b) {
      fill.setAttribute("width", "0");
      txt.textContent = "--";
      $("battBolt").hidden = true;
      ring.title = T("No battery reading yet");
      return;
    }
    const pct = Math.max(0, Math.min(100, b.shown));
    fill.setAttribute("width", ((19.6 * pct) / 100).toFixed(1));
    fill.style.fill = pct <= 15 ? "var(--danger)" : pct <= 40 ? "var(--accent)" : "var(--success)";
    txt.textContent = pct + "%";
    $("battBolt").hidden = !b.charging;
    ring.title = T("{mv} mV · firmware level {raw} % · {state}", { mv: b.mv, raw: b.rawLevel, state: b.charging ? T("charging") : T("not charging") });
  },

  renderProfiles() {
    const d = this.dev;
    const ready = !!(d && d.cfg);
    const n = ready ? d.profiles : 4;
    const activeProfile = ready ? d.profile + 1 : 1;
    let html = `<button type="button" class="profile-trigger" aria-haspopup="listbox" aria-expanded="false"><span>${esc(T("Profile"))} ${activeProfile}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="profile-menu" role="listbox">`;
    for (let p = 0; p < n; p++) {
      const active = ready && d.profile === p;
      html += `<button type="button" class="profile-option${active ? " active" : ""}" data-profile="${p}" ${ready && !this.busy ? "" : "disabled"} role="option" aria-selected="${active}">${esc(T("Profile"))} ${p + 1}</button>`;
    }
    html += "</div>";
    $("profileSwitch").innerHTML = html;
  },

  renderFacts() {
    const d = this.dev;
    $("firmwareStatus").textContent = d && d.version ? `${T("Firmware")} ${d.version}` : "";
  },

  renderButtonMap() {
    const svg = $("btnLines"),
      box = $("btnPills");
    let lines = "",
      pills = "";
    for (const s of BUTTON_SLOTS) {
      const a = this.actionOf(s.k);
      const factory = P.FACTORY_BUTTONS[s.k];
      const changed = a && JSON.stringify(P.encodeAction(a, s.k)) !== JSON.stringify(P.encodeAction(factory, s.k));
      const pend = this.pending.has("btn" + s.k);
      const cls = `${changed ? " changed" : ""}${this.pickerSlot === s.k ? " open" : ""}${a && a.t === "macro" ? " is-macro" : ""}${pend ? " pending" : ""}${s.k === 0 ? " locked" : ""}`;
      const val = pend ? T("Saving…") : this.actionLabel(a);
      const [ax, ay] = s.anchor,
        [lx, ly] = s.label;
      if (s.side === "b") lines += `<polyline class="under" points="${ax},${ay} ${lx},${ly}" /><circle cx="${ax}" cy="${ay}" r="1.1" />`;
      else {
        const ex = s.side === "l" ? lx + 6 : lx - 6;
        lines += `<polyline points="${ax},${ay} ${ex},${ly} ${lx + (s.side === "l" ? 2 : -2)},${ly}" /><circle cx="${ax}" cy="${ay}" r="1.1" />`;
      }
      const pos = s.side === "b" ? `left:${lx}%;top:${ly}%` : `${s.side === "l" ? "left" : "right"}:${s.side === "l" ? lx : 100 - lx}%;top:${ly}%`;
      pills += `<button type="button" class="btn-pill side-${s.side}${cls}" style="${pos}" onclick="app.openPicker(${s.k})" aria-label="${esc(T(s.name))}: ${esc(val)}">
        <span class="pill-name"><b class="pill-num">${s.ui}</b> ${esc(T(s.name))}${s.under ? " · " + esc(T("underside")) : ""}</span>
        <span class="pill-val">${esc(val)}</span></button>`;
    }
    svg.innerHTML = lines;
    box.innerHTML = pills;
  },

  renderPerformance() {
    const d = this.dev,
      c = d && d.cfg;
    const host = $("dpiStages");
    if (!c) {
      host.innerHTML = "";
      $("pollingRate").innerHTML = "";
      return;
    }
    $("stageCount").value = c.maxDPI;
    $("stageStepper").classList.toggle("pending", this.pending.has("stages"));
    if (this.dpiSel >= c.maxDPI) this.dpiSel = c.currentDPI;
    const n = c.maxDPI,
      i = this.dpiSel;
    let chips = "";
    for (let k = 0; k < n; k++) {
      const dv = this.dpiDraft && this.dpiDraft.i === k ? this.dpiDraft.value : c.dpi[k];
      const col = this.colorDraft && this.colorDraft.i === k ? this.colorDraft.hex : c.colors[k] || "#ffffff";
      const pend = this.pending.has("dpi" + k) || this.pending.has("color" + k) || (this.pending.has("currentDPI") && k === i);
      chips += `<button type="button" class="dpi-chip${k === c.currentDPI ? " active" : ""}${k === i ? " selected" : ""}${pend ? " pending" : ""}${(this.dpiDraft && this.dpiDraft.i === k) || (this.colorDraft && this.colorDraft.i === k) ? " draft" : ""}" id="dpiChip${k}" style="--stage-color:${col}" onclick="app.selectStage(${k})" aria-pressed="${k === c.currentDPI}">
        <span class="chip-stage">${k + 1}</span><span class="chip-val">${dv ?? "?"}</span><span class="chip-dot"></span></button>`;
    }
    host.innerHTML = `
      <div class="dpi-chips" style="grid-template-columns:repeat(${n},1fr)">${chips}</div>
      <div class="dpi-edit">
        <button type="button" class="color-swatch" id="dpiSwatch" title="${esc(T("Indicator colour for stage {n}", { n: i + 1 }))}" aria-label="${esc(T("Indicator colour for stage {n}", { n: i + 1 }))}" onclick="app.openColorPicker(${i})"></button>
        <div class="dpi-slider-wrap">
          <div class="slider-track" id="dpiTrack"></div>
          <input type="range" id="dpiRange" min="${P.DPI_MIN}" max="${P.DPI_MAX}" step="${P.DPI_STEP}" aria-label="${esc(T("DPI for stage {n}", { n: i + 1 }))}"
            oninput="app.slideDPI(${i}, this.value)" onchange="app.commitDPI(${i})" onwheel="app.wheelDPI(event, ${i})">
        </div>
        <div class="stepper sm">
          <button type="button" onclick="app.stepDPI(${i}, -50)" aria-label="−50">&minus;</button>
          <input type="number" id="dpiInput" min="${P.DPI_MIN}" max="${P.DPI_MAX}" step="${P.DPI_STEP}" aria-label="${esc(T("DPI for stage {n}", { n: i + 1 }))}" onchange="app.typeDPI(${i}, this.value)">
          <button type="button" onclick="app.stepDPI(${i}, 50)" aria-label="+50">+</button>
        </div>
      </div>
      <div class="dpi-note" id="dpiNote"></div>`;
    this._paintDpiEditor();

    // polling
    $("pollingRate").innerHTML = P.RATES.map(
      (r) => `<button type="button" class="seg-btn${this.cv("reportRate") === r.code ? " active" : ""}" data-val="${r.code}" title="${r.hz} Hz">${rateLabel(r.hz)}</button>`,
    ).join("");
    $("pollingRate").classList.toggle("pending", this.pending.has("reportRate"));

    // mode select
    const locked = this.modeLocked();
    $("modeSelect").querySelectorAll(".seg-btn").forEach((b) => {
      const v = parseInt(b.dataset.val, 10);
      b.classList.toggle("active", locked ? v === 10 : v === this.cv("mode"));
      b.disabled = v === 10 ? true : locked;
      b.hidden = v === 10 && !locked;
    });
    $("modeSelect").classList.toggle("pending", this.pending.has("mode"));
    $("modeHint").textContent = d.transport === "wired" ? T("Wired · Corded") : locked ? T("2K+ · Corded") : T("LP saves battery · HP lowers latency");
  },

  _paintDpiEditor() {
    const c = this.dev && this.dev.cfg;
    if (!c || !$("dpiRange")) return;
    const i = this.dpiSel;
    const v = this.dpiDraft && this.dpiDraft.i === i ? this.dpiDraft.value : c.dpi[i];
    const col = this.colorDraft && this.colorDraft.i === i ? this.colorDraft.hex : c.colors[i] || "#ffffff";
    const r = $("dpiRange");
    if (document.activeElement !== r) r.value = v;
    const inp = $("dpiInput");
    if (document.activeElement !== inp) inp.value = v;
    $("dpiTrack").style.width = ((v - P.DPI_MIN) / (P.DPI_MAX - P.DPI_MIN)) * 100 + "%";
    $("dpiSwatch").style.background = col;
    const chip = $("dpiChip" + i);
    if (chip) {
      chip.querySelector(".chip-val").textContent = v;
      chip.style.setProperty("--stage-color", col);
    }
    const note = $("dpiNote");
    const parts = [];
    if (this.dpiDraft && this.dpiDraft.i === i) parts.push(`<span class="tag">${esc(T("unsaved"))}</span> ${esc(T("Release the slider to write {v} DPI", { v }))}`);
    else if (this.pending.has("dpi" + i)) parts.push(esc(T("Writing and reading back…")));
    if (v > P.DPI_VERIFIED_MAX) parts.push(esc(T("Above 12800 DPI: official encoding, captured and read back.")));
    if (!parts.length) parts.push(esc(T("Stage {n}/{m} · click to activate", { n: i + 1, m: c.maxDPI })));
    note.innerHTML = parts.join(" ");
    this.renderFacts();
  },

  renderSensor() {
    const c = this.dev && this.dev.cfg;
    if (!c) return;
    $("lodControl").querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", parseInt(b.dataset.val, 10) === this.cv("lod")));
    $("lodControl").classList.toggle("pending", this.pending.has("lod"));
    $("peakPerf").checked = !!this.cv("peak");
    $("peakPerf").closest(".check").classList.toggle("pending", this.pending.has("peak"));
    const sel = $("peakDuration");
    sel.innerHTML = P.PEAK_DURATIONS.map((p) => `<option value="${p.v}"${p.v === this.cv("peakDuration") ? " selected" : ""}>${peakLabel(p.v)}</option>`).join("") + (P.PEAK_DURATIONS.some((p) => p.v === c.peakDuration) ? "" : `<option selected disabled>${esc(T("raw {v}", { v: c.peakDuration }))}</option>`);
    sel.disabled = !c.peak; // official: duration enabled only while Peak is on
    sel.classList.toggle("pending", this.pending.has("peakDuration"));
    for (const [id, key] of [["motionSync", "motionSync"], ["rippleControl", "ripple"], ["angleSnap", "angleSnap"]]) {
      $(id).checked = !!this.cv(key);
      $(id).closest(".check").classList.toggle("pending", this.pending.has(key));
    }
    this._renderDebounce();
  },

  _renderDebounce() {
    const c = this.dev && this.dev.cfg;
    const gate = $("debounceGate");
    const inp = $("debounceInput");
    const pend = this.pending.has("debounce");
    if (!c) {
      gate.checked = false;
      gate.disabled = true;
      inp.value = "";
      return;
    }
    gate.disabled = pend;
    const on = gate.checked && !pend;
    const v = this._debBase();
    if (document.activeElement !== inp || !on || this.debDraft == null) inp.value = v;
    inp.disabled = !on;
    $("debounceMinus").disabled = !on || v <= 0;
    $("debouncePlus").disabled = !on || v >= 20;
    const st = $("debounceStepper");
    st.classList.toggle("disabled", !on);
    st.classList.toggle("pending", pend);
    st.classList.toggle("draft", this.debDraft != null);
    this._paintDebounceHint();
  },
  _paintDebounceHint() {
    const c = this.dev && this.dev.cfg;
    const h = $("debounceHint");
    if (!c || !h) return;
    $("debounceStepper").classList.toggle("draft", this.debDraft != null);
    // Minimal: the hint only appears when there is something to say.
    let txt = "",
      warn = false;
    if (this.pending.has("debounce")) txt = T("Writing {v} ms…", { v: this.want.debounce });
    else if (this.debDraft != null && this.debDraft !== c.debounce) txt = T("Unsaved · Enter to write (mouse: {cur} ms)", { cur: c.debounce });
    const shown = this.debDraft != null ? this.debDraft : c.debounce;
    if (!this.pending.has("debounce") && shown < 8) {
      txt = (txt ? txt + " · " : "") + T("below 8 ms may double-click");
      warn = true;
    }
    h.textContent = txt;
    h.hidden = !txt;
    h.className = "p-hint deb-hint" + (warn ? " warn-text" : "");
  },

  renderLighting() {
    const c = this.dev && this.dev.cfg;
    if (!c) return;
    const idx = this.pending.has("ledMode") || this.pending.has("ledEnable") ? this.want.ledIdx : this.ledIndex();
    $("ledEffect").querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", parseInt(b.dataset.val, 10) === idx));
    $("ledEffect").classList.toggle("pending", this.pending.has("ledMode") || this.pending.has("ledEnable"));
    const bUi = P.brightnessToUi(c.ledBrightness);
    const fixed = c.ledEnable && c.ledMode === 1,
      flick = c.ledEnable && c.ledMode === 2;
    $("brightnessRange").value = bUi;
    $("brightnessRange").disabled = !fixed;
    $("brightnessGroup").hidden = !fixed;
    $("brightnessGroup").classList.toggle("disabled", !fixed);
    $("brightnessGroup").classList.toggle("pending", this.pending.has("ledBrightness"));
    this._sliderPreview("brightness", bUi);
    $("speedRange").value = c.ledSpeed;
    $("speedRange").disabled = !flick;
    $("speedGroup").hidden = !flick;
    $("speedGroup").classList.toggle("disabled", !flick);
    $("speedGroup").classList.toggle("pending", this.pending.has("ledSpeed"));
    this._sliderPreview("speed", Math.max(1, Math.min(5, c.ledSpeed)));
    const sel = $("sleepSelect");
    const shown = this.cv("sleep");
    const known = P.SLEEP_VALUES.includes(c.sleep);
    sel.innerHTML =
      P.SLEEP_VALUES.map((v) => `<option value="${v}"${v === shown ? " selected" : ""}>${esc(sleepLabel(v, true))}</option>`).join("") +
      (known ? "" : `<option value="" selected disabled>${esc(T("Unknown value {v}", { v: c.sleep }))}</option>`);
    sel.classList.toggle("pending", this.pending.has("sleep"));
    sel.disabled = this.pending.has("sleep");
    const st = $("sleepState");
    st.textContent = this.pending.has("sleep")
      ? T("Writing {v} and reading it back…", { v: sleepLabel(this.want.sleep, true) })
      : c.invalid.includes("sleep")
        ? T("The stored value failed its check; the mouse uses its default.")
        : T("On the mouse: {v} (register value {raw})", { v: known ? sleepLabel(c.sleep, true) : "?", raw: c.sleep });
  },

  renderReceiver() {
    const d = this.dev;
    const host = $("dongleLed");
    if (!d || !d.cfg || d.transport !== "receiver") {
      host.innerHTML = "";
      return;
    }
    $("longDistance").checked = this.pending.has("longRange") ? !!this.want.longRange : !!d.longRange;
    $("longDistance").closest(".check").classList.toggle("pending", this.pending.has("longRange"));
    host.classList.toggle("pending", this.pending.has("dongleLed"));
    const led = this.pending.has("dongleLed") ? this.want.dongleLed : d.dongleLed;
    host.innerHTML = RECEIVER_LED.map(
      (m) => `<option value="${m.v}"${led === m.v ? " selected" : ""}>${esc(T(m.name))}</option>`,
    ).join("");
  },

  /* ── button picker (reference pattern) ────────────────────────────── */
  openPicker(k) {
    if (!this.dev || !this.dev.cfg) return;
    const slot = BUTTON_SLOTS.find((s) => s.k === k);
    this.pickerSlot = k;
    this._pendingCombo = null;
    const cur = this.actionOf(k) || { t: "off" };
    const same = (a) => cur && JSON.stringify(P.encodeAction(cur, k)) === JSON.stringify(P.encodeAction(a, k)) && cur.t === a.t;
    const chip = (a, text) => `<button type="button" class="pick-chip${same(a) ? " active" : ""}" data-action='${esc(JSON.stringify(a))}'>${esc(text || this.actionLabel(a))}</button>`;
    const el = $("btnPicker");
    if (k === 0) {
      el.innerHTML = `<div class="pick-head"><div><div class="pick-sub">${esc(T("Button {n}", { n: 1 }))}</div><div class="pick-title">${esc(T("Left Button"))}</div></div><button type="button" class="pick-close" data-close aria-label="Close">&times;</button></div>
        <div class="pick-body"><p class="pick-hint">${esc(T("Button 1 is kept as Left Button. The official software requires a Left button, and remapping it could leave the mouse without a primary click."))}</p></div>`;
    } else {
      const fire = cur.t === "fire" ? cur : { interval: 10, times: 3 };
      const lock = cur.t === "dpiLock" ? cur.dpi : 400;
      const media = cur.t === "media" ? cur.usage : P.MEDIA[1][0];
      const curMacro = cur.t === "macro" ? cur : { mode: "released", times: 1 };
      const libOpts = this.macros.map((m) => `<option value="${esc(m.id)}">${esc(m.name)} (${m.events.length})</option>`).join("");
      el.innerHTML = `
      <div class="pick-head">
        <div><div class="pick-sub">${esc(T("Assign button {n}", { n: slot.ui }))}</div><div class="pick-title">${esc(T(slot.name))}</div></div>
        <button type="button" class="pick-close" data-close aria-label="Close">&times;</button>
      </div>
      <div class="pick-body">
        <div class="pick-current">${esc(T("On the mouse now"))}: <b>${esc(this.actionLabel(cur))}</b>${cur.t === "macro" ? " · " + esc(this.macroModeLabel(cur)) : ""}</div>
        <div class="pick-group"><div class="pick-label">${esc(T("Mouse"))}</div><div class="pick-chips">
          ${["left", "right", "middle", "back", "forward"].map((v) => chip({ t: "mouse", v })).join("")}
        </div></div>
        <div class="pick-group"><div class="pick-label">${esc(T("DPI"))}</div><div class="pick-chips">
          ${["loop", "up", "down"].map((v) => chip({ t: "dpi", v })).join("")}
        </div>
          <div class="pick-row"><span>${esc(T("DPI Lock"))}</span>
            <select id="pickLock">${P.DPI_LOCK_VALUES.map((v) => `<option value="${v}"${v === lock ? " selected" : ""}>${v}</option>`).join("")}</select>
            <button type="button" class="pick-set${cur.t === "dpiLock" ? " active" : ""}" data-set="dpiLock">${esc(T("Set"))}</button></div>
        </div>
        <div class="pick-group"><div class="pick-label">${esc(T("Scroll"))}</div><div class="pick-chips">
          ${chip({ t: "vscroll", v: "up" })}${chip({ t: "vscroll", v: "down" })}${chip({ t: "hscroll", v: "left" })}${chip({ t: "hscroll", v: "right" })}
        </div></div>
        <div class="pick-group"><div class="pick-label">${esc(T("Fire key"))}</div>
          <div class="pick-row"><span>${esc(T("Interval (ms)"))}</span><input type="number" id="pickFireInt" min="10" max="255" value="${fire.interval}">
            <span>${esc(T("Times"))}</span><select id="pickFireTimes">${[0, 1, 2, 3].map((n) => `<option value="${n}"${n === fire.times ? " selected" : ""}>${n === 0 ? esc(T("while held")) : n}</option>`).join("")}</select>
            <button type="button" class="pick-set${cur.t === "fire" ? " active" : ""}" data-set="fire">${esc(T("Set"))}</button></div>
        </div>
        <div class="pick-group"><div class="pick-label">${esc(T("Media Key"))}</div>
          <div class="pick-row"><select id="pickMedia">${P.MEDIA.map(([u, n]) => `<option value="${u}"${u === media ? " selected" : ""}>${esc(T(n))}</option>`).join("")}</select>
            <button type="button" class="pick-set${cur.t === "media" ? " active" : ""}" data-set="media">${esc(T("Set"))}</button></div>
        </div>
        <div class="pick-group"><div class="pick-label">${esc(T("Combo Key"))} <span class="tag warn" title="${esc(T("Same block as media keys, but never captured with keyboard usages (gap G6)."))}">${esc(T("unverified"))}</span></div>
          <div class="pick-row"><input type="text" id="pickCombo" class="pick-capture" readonly placeholder="${esc(T("Click here, then press up to 3 keys"))}" value="${cur.t === "combo" && !cur.unknown ? esc(this.comboLabel(cur)) : ""}">
            <button type="button" class="pick-set${cur.t === "combo" ? " active" : ""}" data-set="combo">${esc(T("Set"))}</button></div>
        </div>
        <div class="pick-group"><div class="pick-label">${esc(T("Macro"))}</div>
          ${
            this.macros.length
              ? `<div class="pick-row"><select id="pickMacro">${libOpts}</select></div>
          <div class="pick-row"><select id="pickMacroMode">
            <option value="released"${curMacro.mode === "released" ? " selected" : ""}>${esc(T("Cycle Until Key Released"))}</option>
            <option value="pressed"${curMacro.mode === "pressed" ? " selected" : ""}>${esc(T("Cycle Until Key Pressed"))} · ${esc(T("unverified"))}</option>
            <option value="thisKey"${curMacro.mode === "thisKey" ? " selected" : ""}>${esc(T("Cycle Until This Key Pressed"))} · ${esc(T("unverified"))}</option>
            <option value="times"${curMacro.mode === "times" ? " selected" : ""}>${esc(T("Times of cycles"))}</option>
          </select><input type="number" id="pickMacroTimes" min="1" max="250" value="${curMacro.times || 1}" title="${esc(T("Times of cycles"))}">
          <button type="button" class="pick-set${cur.t === "macro" ? " active" : ""}" data-set="macro">${esc(T("Set"))}</button></div>`
              : `<p class="pick-hint">${esc(T("No macros in your library yet."))}</p>`
          }
          <div class="pick-row"><button type="button" class="pick-chip" data-open-macros>${esc(T("Open Macro Manager…"))}</button></div>
        </div>
        <div class="pick-group"><div class="pick-label">${esc(T("Other"))}</div><div class="pick-chips">
          ${chip({ t: "rate" })}${chip({ t: "off" })}
        </div></div>
      </div>
      <div class="pick-foot"><button type="button" class="pick-reset" data-action='${esc(JSON.stringify(P.FACTORY_BUTTONS[k]))}'>${esc(T("Reset to factory default"))} (${esc(this.actionLabel(P.FACTORY_BUTTONS[k]))})</button></div>`;
    }
    el.hidden = false;
    this._bindPicker(el, k);
    this.renderButtonMap();
  },
  closePicker() {
    const el = $("btnPicker");
    if (el) el.hidden = true;
    if (this.pickerSlot != null) {
      this.pickerSlot = null;
      this.renderButtonMap();
    }
  },
  _bindPicker(el, k) {
    el.onclick = (e) => {
      if (e.target.closest("[data-close]")) return this.closePicker();
      if (e.target.closest("[data-open-macros]")) {
        this.closePicker();
        return this.openMacros();
      }
      const a = e.target.closest("[data-action]");
      if (a) return this.assignButton(k, JSON.parse(a.dataset.action));
      const set = (e.target.closest("[data-set]") || {}).dataset;
      if (!set || !set.set) return;
      switch (set.set) {
        case "dpiLock":
          return this.assignButton(k, { t: "dpiLock", dpi: parseInt(el.querySelector("#pickLock").value, 10) });
        case "fire": {
          const interval = P.clamp(el.querySelector("#pickFireInt").value, 10, 255);
          return this.assignButton(k, { t: "fire", interval, times: parseInt(el.querySelector("#pickFireTimes").value, 10) });
        }
        case "media":
          return this.assignButton(k, { t: "media", usage: parseInt(el.querySelector("#pickMedia").value, 10) });
        case "combo":
          if (!this._pendingCombo || !(this._pendingCombo.keys.length || this._pendingCombo.mods)) return this.toast(T("Click the box and press a key combination first"), "error");
          return this.assignButton(k, this._pendingCombo);
        case "macro": {
          const m = this.macros.find((x) => x.id === el.querySelector("#pickMacro").value);
          if (!m) return;
          const mode = el.querySelector("#pickMacroMode").value;
          return this.assignButton(k, { t: "macro", mode, times: P.clamp(el.querySelector("#pickMacroTimes").value, 1, 250) }, { macro: m });
        }
      }
    };
    const cap = el.querySelector("#pickCombo");
    if (cap)
      cap.addEventListener("keydown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        const combo = this._pendingCombo && this._pendingCombo.fresh ? this._pendingCombo : { t: "combo", mods: 0, keys: [], fresh: true };
        if (MOD_CODES[e.code]) combo.mods |= MOD_CODES[e.code];
        else if (HID_KEYS[e.code] && !combo.keys.includes(HID_KEYS[e.code])) combo.keys.push(HID_KEYS[e.code]);
        else if (!HID_KEYS[e.code]) return (cap.value = T("Key not supported"));
        const count = combo.keys.length + [1, 2, 4, 8, 16, 32, 64, 128].filter((b) => combo.mods & b).length;
        if (count > 3) return (cap.value = T("At most 3 keys including modifiers"));
        this._pendingCombo = combo;
        cap.value = this.comboLabel(combo);
      });
    if (cap) cap.addEventListener("keyup", () => this._pendingCombo && (this._pendingCombo.fresh = false));
  },

  /* ═════ Macro Manager ═════════════════════════════════════════════ */
  toggleMacros() {
    if ($("panelLayout").classList.contains("is-macro-open")) this.closeMacros();
    else this.openMacros();
  },

  openMacros() {
    this.closePicker();
    document.body.classList.add("macros-open");
    $("panelLayout").classList.add("is-macro-open");
    $("stage").classList.add("is-macro-open");
    if (!this.macroEdit) {
      if (this.macros.length) this.editMacro(this.macros[0].id);
      else this.newMacro();
    }
    const w = $("macroWin");
    w.scrollIntoView({ block: "nearest", behavior: "smooth" });
    w.querySelector(".panel").classList.remove("flash");
    void w.offsetWidth;
    w.querySelector(".panel").classList.add("flash");
    const n = $("mName");
    if (n) n.focus();
  },
  closeMacros() {
    document.body.classList.remove("macros-open");
    $("panelLayout").classList.remove("is-macro-open");
    $("stage").classList.remove("is-macro-open");
    this.stopRecording();
  },
  _saveLib() {
    if (!lsSet(STORE_MACROS, this.macros)) this.toast(T("Browser storage is unavailable: the macro library will be lost when this page closes. Export it as JSON."), "error");
  },
  newMacro() {
    this.stopRecording();
    this.macroEdit = { id: null, name: T("New macro"), events: [], dirty: true };
    this.macroSel = null;
    this.renderMacros();
  },
  editMacro(id) {
    this.stopRecording();
    const m = this.macros.find((x) => x.id === id);
    if (!m) return;
    this.macroEdit = { id: m.id, name: m.name, events: m.events.map((e) => ({ ...e })), dirty: false };
    this.macroSel = null;
    this.renderMacros();
  },
  copyDeviceMacro(slot) {
    const m = this.dev && this.dev.macros[slot];
    if (!m) return;
    this.stopRecording();
    this.macroEdit = { id: null, name: m.name, events: m.events.filter((e) => e.kind !== "raw").map((e) => ({ kind: e.kind, down: e.down, code: e.code, delay: e.delay })), dirty: true };
    this.renderMacros();
    this.toast(T("Copied from the mouse into the editor. Save it to keep it in your library."), "success");
  },
  saveMacro() {
    this.stopRecording();
    const e = this.macroEdit;
    if (!e) return;
    const name = (e.name || "").trim().slice(0, P.MACRO_NAME_MAX);
    if (!name) return this.toast(T("Give the macro a name"), "error");
    if (/[^\x20-\x7e]/.test(name)) return this.toast(T("The mouse stores names as plain ASCII; remove accented or special characters."), "error");
    if (e.events.length < P.MACRO_MIN_EVENTS) return this.toast(T("A macro needs at least 2 events"), "error");
    if (e.events.length > P.MACRO_MAX_EVENTS) return this.toast(T("A macro can hold at most 70 events"), "error");
    const rec = { id: e.id || "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, events: e.events.map((x) => ({ ...x })) };
    const i = this.macros.findIndex((x) => x.id === rec.id);
    if (i >= 0) this.macros[i] = rec;
    else this.macros.push(rec);
    this._saveLib();
    this.macroEdit = { ...rec, events: rec.events.map((x) => ({ ...x })), dirty: false };
    this._renderMacroLists();
    this._renderMacroEvents();
    this.toast(T("Saved to the macro library in this browser (not yet on the mouse)"), "success");
  },
  deleteMacro() {
    const e = this.macroEdit;
    if (!e) return;
    if (e.id && !confirm(T("Delete “{n}” from the library? Macros already written to a button stay on the mouse.", { n: e.name }))) return;
    this.macros = this.macros.filter((x) => x.id !== e.id);
    this._saveLib();
    this.macroEdit = null;
    if (this.macros.length) this.editMacro(this.macros[0].id);
    else this.newMacro();
  },
  exportMacros() {
    const blob = new Blob([JSON.stringify({ format: "aria-ii-pro-macros", version: 1, macros: this.macros }, null, 2)], { type: "application/json" });
    this._download(blob, "aria-ii-pro-macros.json");
  },
  async importMacroFile(f) {
    try {
      const j = JSON.parse(await f.text());
      const list = (j.macros || []).filter((m) => m && typeof m.name === "string" && Array.isArray(m.events));
      const clean = list.map((m) => ({
        id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: m.name.slice(0, 30),
        events: m.events.filter((e) => ["key", "mod", "media", "mouse"].includes(e.kind)).slice(0, 70).map((e) => ({ kind: e.kind, down: !!e.down, code: e.code | 0, delay: P.clamp(e.delay, 10, 65535) })),
      }));
      this.macros.push(...clean);
      this._saveLib();
      this._renderMacroLists();
      this.toast(T("Imported {n} macros", { n: clean.length }), "success");
    } catch (e) {
      this.toast(T("Not a macro library file: {m}", { m: e.message }), "error");
    }
  },
  evLabel(e) {
    let name;
    if (e.kind === "mouse") name = T(MOUSE_CODE_NAMES[e.code] || "Mouse " + e.code);
    else if (e.kind === "mod") name = MOD_NAMES[e.code] || "Mod " + e.code;
    else if (e.kind === "media") name = T((P.MEDIA.find(([u]) => u === e.code) || [0, "Media " + hx(e.code, 3)])[1]);
    else name = HID_KEY_NAMES[e.code] || T("Key") + " " + hx(e.code);
    return name;
  },
  macroOp(op, i) {
    const e = this.macroEdit;
    if (!e) return;
    const ev = e.events;
    if (op === "del") ev.splice(i, 1);
    if (op === "up" && i > 0) [ev[i - 1], ev[i]] = [ev[i], ev[i - 1]];
    if (op === "down" && i < ev.length - 1) [ev[i + 1], ev[i]] = [ev[i], ev[i + 1]];
    if (op === "sel") this.macroSel = this.macroSel === i ? null : i;
    if (op !== "sel") {
      this.macroSel = null;
      e.dirty = true;
    }
    this._renderMacroEvents();
  },
  setEventDelay(i, v) {
    const e = this.macroEdit;
    if (!e || !e.events[i]) return;
    e.events[i].delay = P.clamp(v, P.MACRO_DELAY_MIN, P.MACRO_DELAY_MAX);
    e.dirty = true;
    this._renderMacroEvents();
  },
  insertAction() {
    const e = this.macroEdit;
    if (!e) return;
    const code = parseInt($("mInsert").value, 10);
    const delay = P.clamp($("mDelay").value, 0, 65535);
    if (e.events.length + 2 > P.MACRO_MAX_EVENTS) return this.toast(T("A macro can hold at most 70 events"), "error");
    const at = this.macroSel == null ? e.events.length : this.macroSel + 1;
    e.events.splice(at, 0, { kind: "mouse", down: true, code, delay }, { kind: "mouse", down: false, code, delay });
    e.dirty = true;
    this.macroSel = at + 1;
    this._renderMacroEvents();
  },

  /* recording inside the capture pad */
  toggleRecording() {
    if (this._recording) this.stopRecording();
    else this.startRecording();
  },
  startRecording() {
    const e = this.macroEdit;
    if (!e) return;
    const pad = $("mPad");
    this._recording = { auto: $("mDelayMode").value === "auto", fixed: P.clamp($("mDelay").value, 0, 65535), last: 0, down: new Set() };
    pad.hidden = false;
    const push = (ev) => {
      const r = this._recording;
      if (!r) return;
      if (e.events.length >= P.MACRO_MAX_EVENTS) {
        this.stopRecording();
        return this.toast(T("A macro can hold at most 70 events"), "error");
      }
      const now = performance.now();
      if (e.events.length && r.auto && r.last) e.events[e.events.length - 1].delay = P.clamp(now - r.last, 10, 65535);
      r.last = now;
      e.events.push({ ...ev, delay: r.fixed });
      e.dirty = true;
      this._renderMacroEvents();
    };
    this._recHandlers = {
      keydown: (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.repeat) return;
        if (ev.code === "Escape" && !ev.shiftKey) return this.stopRecording();
        if (MOD_CODES[ev.code]) push({ kind: "mod", down: true, code: MOD_CODES[ev.code] });
        else if (HID_KEYS[ev.code]) push({ kind: "key", down: true, code: HID_KEYS[ev.code] });
      },
      keyup: (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (MOD_CODES[ev.code]) push({ kind: "mod", down: false, code: MOD_CODES[ev.code] });
        else if (HID_KEYS[ev.code]) push({ kind: "key", down: false, code: HID_KEYS[ev.code] });
      },
      pointerdown: (ev) => {
        const code = [1, 4, 2, 8, 16][ev.button];
        if (!code) return;
        ev.preventDefault();
        pad.focus();
        push({ kind: "mouse", down: true, code });
      },
      pointerup: (ev) => {
        const code = [1, 4, 2, 8, 16][ev.button];
        if (!code) return;
        ev.preventDefault();
        push({ kind: "mouse", down: false, code });
      },
      contextmenu: (ev) => ev.preventDefault(),
      auxclick: (ev) => ev.preventDefault(),
    };
    for (const [k, fn] of Object.entries(this._recHandlers)) pad.addEventListener(k, fn);
    pad.classList.add("recording");
    pad.focus();
    this._renderMacroRecord();
  },
  stopRecording() {
    const pad = $("mPad");
    if (this._recHandlers && pad) for (const [k, fn] of Object.entries(this._recHandlers)) pad.removeEventListener(k, fn);
    this._recHandlers = null;
    if (pad) {
      pad.classList.remove("recording");
      pad.hidden = true;
    }
    if (this._recording) {
      // Recorded official macros end with a 0 ms delay on the last event
      // (both 2026-10-24 macro captures), so the cycle restarts immediately.
      const e = this.macroEdit;
      if (this._recording.auto && this._recording.last && e && e.events.length) e.events[e.events.length - 1].delay = 0;
      this._recording = null;
      this._renderMacroRecord();
      this._renderMacroEvents();
    }
  },

  async writeMacroToButton() {
    const e = this.macroEdit;
    if (!e) return;
    const k = parseInt($("mButton").value, 10);
    const mode = $("mMode").value || "released";
    const times = P.clamp($("mTimes").value, 1, 250);
    const name = (e.name || "").trim();
    if (!name || /[^\x20-\x7e]/.test(name)) return this.toast(T("The mouse stores names as plain ASCII; remove accented or special characters."), "error");
    if (e.events.length < 2 || e.events.length > 70) return this.toast(T("A macro needs 2–70 events"), "error");
    const ok = await this.assignButton(k, { t: "macro", mode, times }, { macro: { name, events: e.events } });
    if (ok) this.toast(T("Macro written to button {n} and verified by readback", { n: BUTTON_SLOTS.find((s) => s.k === k).ui }), "success");
  },

  _renderMacroLists() {
    if (!$("mLib")) return this.renderMacros();
    const { libHtml, mouseHtml } = this._macroListsHtml();
    $("mLib").innerHTML = libHtml;
    $("mMouse").innerHTML = mouseHtml;
    const d = this.dev;
    $("mMouseHead").textContent = T("On the mouse (profile {n})", { n: d && d.cfg ? d.profile + 1 : "—" });
    $("mWrite").disabled = !(d && d.cfg);
  },
  _macroListsHtml() {
    const e = this.macroEdit;
    const d = this.dev;
    const onMouse = [];
    if (d && d.cfg)
      for (const s of BUTTON_SLOTS) {
        const a = this.actionOf(s.k);
        if (a && a.t === "macro") onMouse.push({ s, a, m: d.macros[a.slot] });
      }
    const sameAsLib = (m) => this.macros.find((x) => m && x.name === m.name && JSON.stringify(x.events.map((v) => [v.kind, v.down, v.code, v.delay])) === JSON.stringify(m.events.map((v) => [v.kind, v.down, v.code, v.delay])));
    const libHtml = this.macros.length
      ? this.macros
          .map((m) => {
            const where = onMouse.filter((o) => o.m && sameAsLib(o.m) === m).map((o) => o.s.ui);
            return `<button type="button" class="m-item${e && e.id === m.id ? " active" : ""}" onclick="app.editMacro('${esc(m.id)}')"><span>${esc(m.name)}</span><small>${m.events.length} ${esc(T("events"))}${where.length ? " · " + esc(T("on button {n}", { n: where.join(", ") })) : " · " + esc(T("local"))}</small></button>`;
          })
          .join("")
      : `<p class="pick-hint">${esc(T("No macros yet."))}</p>`;
    const mouseHtml = onMouse.length
      ? onMouse
          .map(
            (o) =>
              `<div class="m-item static"><span>${esc(T("Button {n}", { n: o.s.ui }))} · ${esc(o.m ? o.m.name : T("unreadable"))}</span><small>${esc(this.macroModeLabel(o.a))}${o.m ? " · " + o.m.events.length + " " + esc(T("events")) : ""}</small>${o.m ? `<button type="button" class="btn-sm ghost" onclick="app.copyDeviceMacro(${o.a.slot})">${esc(T("Copy to editor"))}</button>` : ""}</div>`,
          )
          .join("")
      : `<p class="pick-hint">${esc(d && d.cfg ? T("No button has a macro.") : T("Connect the mouse to see its macros."))}</p>`;
    return { libHtml, mouseHtml };
  },
  renderMacros() {
    const host = $("macroPanel");
    const e = this.macroEdit;
    const d = this.dev;
    const { libHtml, mouseHtml } = this._macroListsHtml();
    const btnOpts = BUTTON_SLOTS.filter((s) => s.k !== 0)
      .sort((a, b) => a.ui - b.ui)
      .map((s) => `<option value="${s.k}">${esc(T("Button {n}", { n: s.ui }))} · ${esc(T(s.name))}</option>`)
      .join("");
    const tipFF = T("Code 0xFF. Capture: playback stopped together with a Left-button press; the bound button's own presses are not visible on USB, so the exact stop rule is not proven (gap G2).");
    const tipFD = T("Code 0xFD. Capture: a Left click during playback did not stop it; it stopped with no other button report, consistent with pressing the bound button again (gap G2).");
    // One column, top to bottom: library → editor → record/insert → write to a button → what the mouse holds.
    host.innerHTML = `
      <div class="m-sec">
        <div class="m-head row">${esc(T("Macros List"))}
          <span class="m-tools">
            <button type="button" class="btn-sm" onclick="app.newMacro()">${esc(T("New Macro"))}</button>
            <button type="button" class="btn-sm ghost" onclick="app.deleteMacro()" ${e ? "" : "disabled"}>${esc(T("Delete"))}</button>
            <button type="button" class="btn-sm ghost" onclick="document.getElementById('macroFileInput').click()" title="${esc(T("Import a macro library (.json)"))}">${esc(T("Import"))}</button>
            <button type="button" class="btn-sm ghost" onclick="app.exportMacros()" ${this.macros.length ? "" : "disabled"} title="${esc(T("Export the macro library (.json)"))}">${esc(T("Export"))}</button>
          </span></div>
        <div class="m-list lib" id="mLib">${libHtml}</div>
      </div>
      <div class="m-sec grow">
        <div class="m-head row"><input type="text" class="field m-name" id="mName" maxlength="30" value="${esc(e ? e.name : "")}" aria-label="${esc(T("Macro name"))}" oninput="app.macroEdit && (app.macroEdit.name = this.value, app.macroEdit.dirty = true, app._renderMacroEvents())">
          <span class="m-count" id="mCount"></span>
          <button type="button" class="btn-sm accent" onclick="app.saveMacro()">${esc(T("Save"))}</button></div>
        <div class="m-list events" id="mEvents"></div>
        <div class="m-dirty" id="mDirty"></div>
        <div class="m-row">
          <button type="button" class="btn-sm rec" id="mRec" onclick="app.toggleRecording()"><span class="rec-dot"></span><span id="mRecText"></span></button>
          <select id="mDelayMode" class="field" aria-label="${esc(T("Delay while recording"))}">
            <option value="auto">${esc(T("Automatic Insertion Delay"))}</option>
            <option value="fixed">${esc(T("Default Time Delay"))}</option>
          </select>
          <input type="number" id="mDelay" class="field tiny" min="0" max="65535" value="${P.MACRO_DELAY_DEFAULT}" aria-label="${esc(T("Default delay (ms)"))}"><span class="m-unit">ms</span>
        </div>
        <div class="m-pad" id="mPad" tabindex="0" hidden>${esc(T("While recording, press keys or click mouse buttons inside this box. Esc stops."))}</div>
        <div class="m-row">
          <select id="mInsert" class="field" aria-label="${esc(T("Insert Action"))}">${Object.entries(MOUSE_CODE_NAMES).map(([c, n]) => `<option value="${c}">${esc(T(n))}</option>`).join("")}</select>
          <button type="button" class="btn-sm" onclick="app.insertAction()">${esc(T("Insert Action"))}</button>
        </div>
      </div>
      <div class="m-sec">
        <div class="m-head">${esc(T("Write to a button"))}</div>
        <div class="m-row">
          <select id="mButton" class="field" aria-label="${esc(T("Button"))}">${btnOpts}</select>
          <select id="mMode" class="field" aria-label="${esc(T("Cycle mode"))}" onchange="document.getElementById('mTimes').disabled = this.value !== 'times'">
            <option value="released">${esc(T("Cycle Until Key Released"))}</option>
            <option value="pressed" title="${esc(tipFF)}">${esc(T("Cycle Until Key Pressed"))}</option>
            <option value="thisKey" title="${esc(tipFD)}">${esc(T("Cycle Until This Key Pressed"))}</option>
            <option value="times">${esc(T("Times of cycles"))}</option>
          </select>
          <input type="number" id="mTimes" class="field tiny" min="1" max="250" value="1" disabled aria-label="${esc(T("Times of cycles"))}">
        </div>
        <div class="m-row">
          <button type="button" class="btn-sm accent wide" id="mWrite" onclick="app.writeMacroToButton()" ${d && d.cfg ? "" : "disabled"}>${esc(T("Write to mouse"))}</button>
        </div>
        <p class="pick-hint m-note">${esc(T("Saved to the active profile."))}</p>
      </div>
      <div class="m-sec">
        <div class="m-head" id="mMouseHead">${esc(T("On the mouse (profile {n})", { n: d && d.cfg ? d.profile + 1 : "—" }))}</div>
        <div class="m-list short" id="mMouse">${mouseHtml}</div>
      </div>`;
    this._renderMacroEvents();
    this._renderMacroRecord();
  },
  _renderMacroEvents() {
    const e = this.macroEdit;
    const list = $("mEvents");
    if (!list) return;
    if (!e || !e.events.length) {
      list.innerHTML = `<p class="pick-hint">${esc(T("No events yet."))}</p>`;
    } else {
      list.innerHTML = e.events
        .map(
          (ev, i) => `<div class="m-ev${this.macroSel === i ? " sel" : ""}" onclick="if(!event.target.closest('input,button'))app.macroOp('sel',${i})">
          <span class="m-arrow ${ev.down ? "down" : "up"}">${ev.down ? "↓" : "↑"}</span><span class="m-evname">${esc(this.evLabel(ev))}</span>
          <span class="m-delay"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><input type="number" min="0" max="65535" value="${ev.delay}" onchange="app.setEventDelay(${i}, this.value)" aria-label="${esc(T("Delay after event"))}"> ms</span>
          <span class="m-evbtns"><button type="button" class="ic-btn" onclick="app.macroOp('up',${i})" aria-label="Up">▲</button><button type="button" class="ic-btn" onclick="app.macroOp('down',${i})" aria-label="Down">▼</button><button type="button" class="ic-btn danger" onclick="app.macroOp('del',${i})" aria-label="${esc(T("Delete"))}">✕</button></span></div>`,
        )
        .join("");
      if (this._recording) list.scrollTop = list.scrollHeight;
    }
    const cnt = $("mCount");
    if (cnt) cnt.textContent = `${e ? e.events.length : 0} / ${P.MACRO_MAX_EVENTS}`;
    const dirty = $("mDirty");
    if (dirty) dirty.textContent = e && e.dirty ? T("unsaved changes") : e && e.id ? T("saved in library") : "";
  },
  _renderMacroRecord() {
    const b = $("mRec");
    if (!b) return;
    b.classList.toggle("recording", !!this._recording);
    $("mRecText").textContent = this._recording ? T("Stop Recording") : T("Start Recording");
  },

  /* ═════ Profile import / export (.bin, ledger §6.12) ═══════════════ */
  toggleFab(force) {
    const m = $("fabMenu");
    const on = force === undefined ? !m.classList.contains("active") : force;
    m.classList.toggle("active", on);
    $("fabBtn").setAttribute("aria-expanded", on ? "true" : "false");
  },
  _download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  },
  exportProfile() {
    this.toggleFab(false);
    const d = this.dev;
    if (!d || !d.cfg) return this.toast(T("Connect the mouse first"), "error");
    const m = (a) => (d.mem[a] < 0 ? 0 : d.mem[a]);
    const dec = (a) => P.dec2(m(a), m(a + 1)) ?? 0;
    const shortcuts = {},
      macros = {};
    for (const { k } of P.BUTTONS) if (d.shortcuts[k]) shortcuts[k] = d.shortcuts[k];
    for (const [slot, mk] of Object.entries(d.macros)) if (mk) macros[slot] = mk;
    const bin = P.buildBin({
      cfg: d.cfg,
      spin: [dec(0x06), dec(0x08)],
      moveOffLed: dec(0xb3),
      ledBar: [0, 1, 2, 3, 4, 5].map((i) => m(0xa0 + i)).concat([dec(0xa7)]),
      shortcuts,
      macros,
    });
    this._download(new Blob([bin], { type: "application/octet-stream" }), `aria-ii-pro-profile-${d.profile + 1}.bin`);
    this.toast(T("Profile {n} exported in the official .bin format", { n: d.profile + 1 }), "success");
  },
  openProfileImport() {
    this.toggleFab(false);
    if (!this.ready()) return;
    $("profileFileInput").click();
  },
  /** Read the headers of all 16 shortcut and macro slots (what the official
   *  driver reads at start-up) and report which ones hold data. */
  async _scanSlots() {
    const mem = this.dev.mem;
    const shortcutUsed = [],
      macroUsed = [];
    for (let k = 0; k < 16; k++) {
      const a = P.SHORTCUT_BASE + P.SHORTCUT_STRIDE * k;
      const sc = await hid.read(a, 10);
      sc.forEach((b, i) => (mem[a + i] = b));
      shortcutUsed[k] = sc[0] >= 2 && sc[0] <= 6;
      const m = P.MACRO_BASE + P.MACRO_STRIDE * k;
      const head = (await hid.read(m, 10)).concat(await hid.read(m + 0x1f, 1));
      macroUsed[k] = head[0] >= 1 && head[0] <= P.MACRO_NAME_MAX && head[10] >= P.MACRO_MIN_EVENTS && head[10] <= P.MACRO_MAX_EVENTS;
    }
    return { shortcutUsed, macroUsed };
  },

  async _runWrites(list, prog, label) {
    let done = 0;
    for (const w of list) {
      if (prog) prog.textContent = T("{label}: {i} / {n} · {what}", { label, i: done + 1, n: list.length, what: w.what });
      const back = await hid.writeVerified(w.addr, w.bytes);
      if (w.addr < 0xc0) this._applyFlash(w.addr, back.slice(0, Math.max(0, 0xc0 - w.addr)));
      done++;
    }
    return done;
  },

  async importProfileFile(file) {
    if (!this.ready()) return;
    let p;
    try {
      p = P.parseBin(new Uint8Array(await file.arrayBuffer()));
    } catch (e) {
      return this.toast(e.message, "error");
    }
    // ImportConfigFile → DPIMaxGrade check (official error dialog 26)
    if (p.mc.maxDPI > P.STAGES_MAX) return this.toast(T("This file uses {n} DPI stages; the Aria II Pro supports at most 4.", { n: p.mc.maxDPI }), "error");
    const notes = [];
    if (!P.LOD_OPTIONS.includes(p.mc.lod)) notes.push(T("The file stores LOD value {v}, which this app does not offer; it is written as stored, like the official import.", { v: p.mc.lod }));
    if (P.hex(p.keys[0]) !== "01 01 00") notes.push(T("The file assigns button 1 to something other than Left Button; it is written as stored, like the official import."));
    const body = `<header class="diag-head"><h3>${esc(T("Import profile"))}</h3></header>
      <p>${esc(T("“{f}” will be written to profile {n} (the active profile), the way the official app imports: shortcut and macro slots on the mouse are cleared first, then every field that differs from the file is written.", { f: file.name, n: this.dev.profile + 1 }))}</p>
      ${notes.length ? `<ul class="modal-notes">${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      <p class="setup-dim">${esc(T("Each write is echo-confirmed and read back. Unparsed regions (0x54–0x5F, 0xBB) are never written."))}</p>
      <div class="modal-progress" id="modalProgress"></div>
      <div class="setup-actions"><button type="button" class="setup-btn ghost" data-act="close">${esc(T("Cancel"))}</button><button type="button" class="setup-btn" data-act="go">${esc(T("Import"))}</button></div>`;
    this.modal(body, async (act, card) => {
      if (act !== "go") return true;
      card.querySelectorAll("button").forEach((b) => (b.disabled = true));
      const prog = $("modalProgress");
      this.busy = T("Importing profile…");
      this.renderAll();
      let stage = "scan";
      try {
        prog.textContent = T("Reading slot headers…");
        const used = await this._scanSlots();
        const plan = P.importPlan({ mem: (a) => (this.dev.mem[a] < 0 ? undefined : this.dev.mem[a]), ...used }, p);
        stage = "clear";
        await this._runWrites(plan.clears, prog, T("Clearing slots"));
        stage = "write";
        await this._runWrites(plan.writes, prog, T("Writing"));
        prog.textContent = T("Done: {c} slots cleared, {n} writes, all verified by readback.", { c: plan.clears.length, n: plan.writes.length });
        this.busy = null;
        await this.loadAll();
        this.saved(T("Profile import"));
        return true;
      } catch (e) {
        this.busy = null;
        prog.textContent = T("Import stopped ({stage}): {m}. The mouse holds a partial import; re-import or fix it manually.", { stage, m: e.message });
        card.querySelector("[data-act=close]").disabled = false;
        await this.loadAll();
        return false;
      }
    });
  },

  /* ═════ Restore (D5): official sequence, captured in profiles-config #15535…#16505 ═════ */
  openRestore() {
    this.toggleFab(false);
    if (!this.ready()) return;
    const recv = this.dev.transport === "receiver";
    const body = `<header class="diag-head"><h3 class="danger-text">${esc(T("Restore factory settings"))}</h3></header>
      <p>${esc(T("Runs the official Restore: ClearSetting (0x09), then — through the receiver — Long distance On and receiver LED Battery State, a full re-read, and clearing of every shortcut and macro slot that still holds data."))}</p>
      <p class="warn-box">${esc(T("All four profiles return to factory settings and profile 1 becomes active (official capture restore-profile3-4). Macros and shortcuts are cleared in a separate step afterwards. Export any profile you want to keep first."))}</p>
      <label class="check"><input type="checkbox" id="restoreAck"><span>${esc(T("I understand this cannot be undone"))}</span></label>
      <div class="modal-progress" id="modalProgress"></div>
      <div class="setup-actions"><button type="button" class="setup-btn ghost" data-act="close">${esc(T("Cancel"))}</button><button type="button" class="setup-btn danger" data-act="go" disabled id="restoreGo">${esc(T("Restore"))}</button></div>`;
    this.modal(body, async (act, card) => {
      if (act !== "go") return true;
      card.querySelectorAll("button, input").forEach((b) => (b.disabled = true));
      this.busy = T("Restoring factory settings…");
      this.renderAll();
      const prog = $("modalProgress");
      const problems = [];
      try {
        prog.textContent = T("Sending ClearSetting…");
        // Native rule: 0x09 waits up to 5000 ms per attempt, up to 5 attempts.
        await hid.cmd(P.CMD.CLEAR, null, { timeout: 5000, attempts: 5 });
      } catch (e) {
        this.busy = null;
        prog.textContent = T("The mouse did not confirm ClearSetting: {m}. Nothing else was sent.", { m: e.message });
        card.querySelector("[data-act=close]").disabled = false;
        await this.loadAll();
        return false;
      }
      if (recv) {
        // ClearSetting handler (M:13197): Advanced = 1,2 from Config.ini.
        try {
          prog.textContent = T("Long distance → On…");
          await hid.cmd(P.CMD.SET_LONG_RANGE, P.longRangeFrame(true));
        } catch (e) {
          problems.push(T("Long distance: {m}", { m: e.message }));
        }
        try {
          prog.textContent = T("Receiver LED → Battery State…");
          await hid.cmd(P.CMD.SET_DONGLE_LED, P.dongleLedFrame(2));
        } catch (e) {
          problems.push(T("Receiver LED: {m}", { m: e.message }));
        }
      }
      try {
        prog.textContent = T("Reading the mouse…");
        this.busy = null;
        await this.loadAll();
        if (!this.dev || !this.dev.cfg) throw new Error(T("re-read failed"));
        this.busy = T("Restoring factory settings…");
        this.renderAll();
        // deviceRestore branch (M:13339): host shortcut/macro data are cleared and
        // pushed, i.e. every slot that still holds data gets its clearing form.
        prog.textContent = T("Reading slot headers…");
        const used = await this._scanSlots();
        await this._runWrites(P.restoreClearPlan(used.shortcutUsed, used.macroUsed), prog, T("Clearing slots"));
        this.busy = null;
        await this.loadAll();
      } catch (e) {
        problems.push(e.message);
        this.busy = null;
      }
      if (problems.length) {
        prog.textContent = T("ClearSetting was confirmed, but: {m}", { m: problems.join(" · ") });
        card.querySelector("[data-act=close]").disabled = false;
        return false;
      }
      this.saved(T("Restore factory settings"));
      this.toast(T("Factory settings restored · configuration re-read from the mouse"), "success");
      return true;
    });
    $("restoreAck").addEventListener("change", (e) => ($("restoreGo").disabled = !e.target.checked));
  },

  /* ═════ Pairing (D6, gap G4) ═════════════════════════════════════════ */
  openPairing() {
    if (!hid.connected || hid.transport !== "receiver") return this.toast(T("Must be in wireless mode to pair"), "error");
    if (this.busy) return this.toast(T("Please wait: {what}", { what: this.busy }), "error");
    const body = `<header class="diag-head"><h3>${esc(T("Pair receiver"))}</h3></header>
      <ol class="pair-steps">
        <li>${esc(T("Press the left, right and middle buttons on the mouse together until the light flashes yellow."))}</li>
        <li>${esc(T("Then click Start pairing (or press Space)."))}</li>
      </ol>
      <p class="warn-box">${esc(T("Not verified on hardware (gap G4). If pairing fails, the mouse may stay unpaired until you pair it again here or with the official app."))}</p>
      <p class="setup-dim">${esc(T("This browser waits up to 30 s for a result (the official app has no time limit). A timeout is reported as not confirmed, never as success."))}</p>
      <div class="modal-progress" id="modalProgress"></div>
      <div class="setup-actions"><button type="button" class="setup-btn ghost" data-act="close" id="pairClose">${esc(T("Close"))}</button><button type="button" class="setup-btn" data-act="go" id="pairGo">${esc(T("Start pairing"))}</button></div>`;
    const keyH = (e) => {
      if (e.code === "Space" && !$("pairGo").disabled) {
        e.preventDefault();
        $("pairGo").click();
      }
    };
    document.addEventListener("keydown", keyH);
    this.modal(
      body,
      async (act) => {
        if (act !== "go") {
          this._pairAbort = true;
          return true;
        }
        await this._runPairing();
        return false;
      },
      () => document.removeEventListener("keydown", keyH),
    );
  },
  async _runPairing() {
    const prog = $("modalProgress");
    const go = $("pairGo");
    go.disabled = true;
    this._pairAbort = false;
    this._stopTimers();
    this.busy = T("Pairing…");
    this.renderAll();
    let result = "unconfirmed";
    try {
      prog.textContent = T("Asking the receiver to enter pairing mode…");
      // FormPair.DongleEnterPairing: the 1 s status timer runs regardless of
      // whether the receiver answers 0x05, so a missing answer is logged, not fatal.
      const t0 = Date.now();
      try {
        await hid.cmd(P.CMD.PAIR_ENTER, P.pairFrame(13));
        this._pairAck = true;
      } catch {
        this._pairAck = false;
      }
      while (Date.now() - t0 < 30000) {
        if (this._pairAbort) {
          result = "aborted";
          break;
        }
        await sleep(1000);
        if (!hid.connected) {
          result = "lost";
          break;
        }
        let st;
        try {
          st = (await hid.cmd(P.CMD.PAIR_STATE, null, { attempts: 1 })).data[0];
        } catch {
          continue;
        }
        prog.textContent = T("Pairing… {s} s (receiver status {st})", { s: Math.round((Date.now() - t0) / 1000), st }) + (this._pairAck ? "" : " · " + T("no answer to the pairing request"));
        if (st === 2) {
          result = "fail";
          break;
        }
        if (st === 3) {
          result = "ok";
          break;
        }
      }
    } catch (e) {
      result = "error:" + e.message;
    }
    this.busy = null;
    const msg = {
      ok: T("Receiver reported success. Move the mouse to confirm it responds."),
      fail: T("Receiver reported that pairing failed. Try again."),
      aborted: T("Stopped waiting. The receiver may still be in pairing mode for a short time."),
      lost: T("The receiver disappeared during pairing."),
      unconfirmed: T("No result within 30 s: pairing is NOT confirmed."),
    }[result] || T("Pairing request failed: {m}", { m: result.slice(6) });
    prog.textContent = msg;
    go.disabled = false;
    if (hid.connected) await this.loadAll();
    this.renderAll();
  },

  /* ═════ modal helper ═════════════════════════════════════════════════ */
  modal(html, onAction, onClose) {
    const dlg = $("modalDialog");
    const card = $("modalCard");
    card.innerHTML = html;
    card.onclick = async (e) => {
      const act = (e.target.closest("[data-act]") || {}).dataset;
      if (!act || !act.act || e.target.closest("[data-act]").disabled) return;
      const close = await onAction(act.act, card);
      if (close && act.act === "close") dlg.close();
      else if (close) setTimeout(() => dlg.open && dlg.close(), 900);
    };
    dlg.onclose = () => {
      if (onClose) onClose();
      if (this.busy == null && hid.connected && this.dev && this.dev.online && !this._timers.battery) this._startBattery();
    };
    dlg.oncancel = (e) => {
      if (this.busy) e.preventDefault();
    };
    if (!dlg.open) dlg.showModal();
  },

  openHelp() {
    this.modal(`
      <header class="diag-head">
        <h3>${esc(T("Features guide"))}</h3>
        <button type="button" class="pick-close" data-act="close" aria-label="${esc(T("Close"))}">&times;</button>
      </header>
      <div class="help-grid">
        <div><b>${esc(T("Performance"))}</b><span>${esc(T("DPI, polling, profiles, debounce"))}</span><small>${esc(T("DPI stages are selected by clicking their number."))}</small></div>
        <div><b>${esc(T("Sensor"))}</b><span>${esc(T("LOD, Peak, Motion Sync, Ripple, Angle Snap"))}</span><small>${esc(T("LP saves battery; HP lowers latency."))}</small></div>
        <div><b>${esc(T("Lighting"))}</b><span>${esc(T("DPI effect, brightness, speed, idle-off"))}</span><small>${esc(T("Idle-off controls lighting, not sensor sleep."))}</small></div>
        <div><b>${esc(T("Receiver"))}</b><span>${esc(T("Long distance, LED, pairing"))}</span><small>${esc(T("Pairing is for the 2.4 GHz receiver."))}</small></div>
        <div class="help-wide"><b>${esc(T("Receiver LED indicator"))}</b><span>${esc(T("Connection State and ReportRate"))}: ${esc(T("Must when mouse connects. Red (125 Hz), Blue (250 Hz), Yellow (500 Hz), Cyan (1000 Hz), Purple (2000 Hz), Green (4000 Hz), White (8000 Hz)."))}</span><span>${esc(T("Battery State"))}: ${esc(T("Based on the current battery level of the mouse: Green (100 %), Blue (66 %), Yellow (33 %) and Red (0 %)."))}</span><span>${esc(T("Only battery warning"))}: ${esc(T("Light stays off; red blinks only when the mouse battery is low."))}</span></div>
        <div><b>${esc(T("Macros"))}</b><span>${esc(T("Record, edit, import, export, assign"))}</span><small>${esc(T("Macro data is saved to the active profile."))}</small></div>
        <div><b>${esc(T("Profiles"))}</b><span>${esc(T("Import, export, restore"))}</span><small>${esc(T("Restore resets device settings."))}</small></div>
      </div>
    `, (act) => act === "close");
  },

  /* ═════ Diagnostics ══════════════════════════════════════════════════ */
  openDiagnostics() {
    this.renderDiagnostics();
    const dlg = $("diagDialog");
    if (!dlg.open) dlg.showModal();
  },
  _diagRows() {
    const d = hid.device,
      s = this.dev;
    const rows = [
      [T("Status"), hid.connected ? (s && s.online ? T("Connected · mouse online") : T("Receiver open · mouse offline")) : T("Not connected")],
      [T("Device"), d ? `${d.productName || "?"} · VID ${hx(d.vendorId, 4)} · PID ${hx(d.productId, 4)} (${hid.transport})` : "—"],
      [T("Collections"), d ? (d.collections || []).map((c) => `page ${hx(c.usagePage, 4)} out[${(c.outputReports || []).map((r) => r.reportId)}] in[${(c.inputReports || []).map((r) => r.reportId)}]`).join(" · ") : "—"],
      [T("Firmware"), (s && s.version) || "—"],
      [T("Profile"), s && s.cfg ? `${s.profile + 1} / ${s.profiles}` : "—"],
      [T("Battery"), s && s.battery ? `${s.battery.shown}% shown · ${s.battery.percent}% from ${s.battery.mv} mV · raw ${s.battery.rawLevel} · ${s.battery.charging ? "charging" : "not charging"}` : "—"],
      [T("Receiver"), s && s.transport === "receiver" && s.cfg ? `long distance ${s.longRange} · LED mode ${s.dongleLed}` : "—"],
      [T("Invalid fields"), s && s.cfg ? s.cfg.invalid.join(", ") || T("none") : "—"],
      [T("Last verify"), hid.lastVerify ? `${hx(hid.lastVerify.addr, 4)} ${hid.lastVerify.ok ? "OK" : "MISMATCH"} · sent [${P.hex(hid.lastVerify.sent)}] read [${P.hex(hid.lastVerify.read)}]` : "—"],
      [T("Traffic"), `tx ${hid.stats.tx} · rx ${hid.stats.rx} · timeouts ${hid.stats.timeouts} · retries ${hid.stats.retries} · mismatches ${hid.stats.mismatches}`],
    ];
    if (s && s.cfg) for (const b of P.BUTTONS) rows.push([T("Button {n}", { n: b.ui }), `${hx(0x60 + 4 * b.k)} [${P.hex(s.cfg.keys[b.k] || [])}] ${this.actionLabel(this.actionOf(b.k))}`]);
    return rows;
  },
  renderDiagnostics() {
    $("diagRows").innerHTML = this._diagRows()
      .map(([k, v]) => `<div class="diag-k">${esc(k)}</div><div class="diag-v">${esc(v)}</div>`)
      .join("");
    $("diagCandidates").innerHTML = hid.candidates.length
      ? hid.candidates.map((c) => `<li class="${c.device === hid.device ? "current" : ""}"><b>${esc(c.name)}</b> · VID ${hx(c.vid, 4)} PID ${hx(c.pid, 4)} · ${c.vendor ? "config channel" : "no config channel"} · pages [${c.pages.map((p) => hx(p, 4)).join(", ")}]</li>`).join("")
      : `<li class="dim">—</li>`;
    $("diagWire").textContent = hid.wire.slice(-60).map((w) => `${new Date(w.t).toISOString().slice(11, 23)} ${w.dir} ${w.rid === 8 ? "" : "rid=" + hx(w.rid) + " "}${w.hex}`).join("\n") || "—";
  },
  diagnosticsReport() {
    return [...this._diagRows().map(([k, v]) => `${k}: ${v}`), "", "Wire log:", ...hid.wire.slice(-120).map((w) => `${new Date(w.t).toISOString()} ${w.dir} rid=${w.rid} ${w.hex}`), "", "userAgent: " + navigator.userAgent].join("\n");
  },
  copyDiagnostics() {
    navigator.clipboard
      .writeText(this.diagnosticsReport())
      .then(() => this.toast(T("Diagnostics copied"), "success"))
      .catch(() => this.toast(T("Copy failed"), "error"));
  },
  downloadWireLog() {
    this._download(new Blob([JSON.stringify({ device: hid.device ? { vid: hid.device.vendorId, pid: hid.device.productId, name: hid.device.productName } : null, wire: hid.wire }, null, 1)], { type: "application/json" }), "aria-ii-pro-wire-log.json");
  },
  async dumpFlash() {
    if (!this.ready()) return;
    const out = $("diagDump"),
      btn = $("diagDumpBtn");
    btn.disabled = true;
    this.busy = T("Dumping flash…");
    this.renderConn();
    const buf = new Uint8Array(0x1b00);
    try {
      for (let a = 0; a < 0x1b00; a += 10) {
        const n = Math.min(10, 0x1b00 - a);
        const r = await hid.enqueue(() => hid._read(a, n));
        buf.set(r, a);
        if (a % 200 === 0) out.textContent = T("Reading… {p}%", { p: Math.floor((a / 0x1b00) * 100) });
      }
      this._download(new Blob([buf], { type: "application/octet-stream" }), `aria-ii-pro-flash-profile-${this.dev.profile + 1}.bin`);
      out.textContent = T("Done · {n} bytes", { n: buf.length });
    } catch (e) {
      out.textContent = T("Dump failed: {m}", { m: e.message });
    } finally {
      this.busy = null;
      btn.disabled = false;
      this.renderAll();
    }
  },

  showLinuxSetup(err) {
    const rules =
      'ACTION!="remove", SUBSYSTEM=="hidraw", KERNEL=="hidraw*", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="f523", MODE="0660", TAG+="uaccess"\n' +
      'ACTION!="remove", SUBSYSTEM=="hidraw", KERNEL=="hidraw*", ATTRS{idVendor}=="3554", ATTRS{idProduct}=="f5a5", MODE="0660", TAG+="uaccess"';
    const cmd = "sudo cp udev/99-fantech-aria-ii-pro.rules /etc/udev/rules.d/ && sudo udevadm control --reload-rules && sudo udevadm trigger --subsystem-match=hidraw";
    this.modal(
      `<header class="diag-head"><h3>${esc(T("One-time Linux setup"))}</h3></header>
      <p>${esc(T("The browser could not open the receiver ({m}). Linux only lets the logged-in user open it after a udev rule is installed. From the project folder run:", { m: err && err.message ? err.message : "?" }))}</p>
      <pre class="setup-cmd">${esc(cmd)}</pre>
      <p class="setup-dim">${esc(T("The rule file contains:"))}</p><pre class="setup-cmd">${esc(rules)}</pre>
      <p>${esc(T("Then unplug and re-plug the receiver and click Connect Device again."))}</p>
      <div class="setup-actions"><button type="button" class="setup-btn ghost" data-act="copy">${esc(T("Copy command"))}</button><button type="button" class="setup-btn" data-act="close">${esc(T("Close"))}</button></div>`,
      async (act) => {
        if (act === "copy") {
          navigator.clipboard.writeText(cmd).then(() => this.toast(T("Command copied"), "success"), () => {});
          return false;
        }
        return true;
      },
    );
  },

  /* ═════ toast ════════════════════════════════════════════════════════ */
  toast(msg, type = "success") {
    const box = $("toastContainer");
    if (this._toastEl) {
      this._toastEl.remove();
      clearTimeout(this._toastTimer);
    }
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${type === "error" ? "var(--danger)" : "var(--success)"}" stroke-width="2">${type === "error" ? '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>'}</svg><span>${esc(msg)}</span>`;
    box.appendChild(el);
    this._toastEl = el;
    this._toastTimer = setTimeout(() => {
      el.classList.add("toast-out");
      setTimeout(() => {
        el.remove();
        if (this._toastEl === el) this._toastEl = null;
      }, 300);
    }, type === "error" ? 5000 : 3000);
  },
};

window.app = app;
document.addEventListener("DOMContentLoaded", () => app.init());
