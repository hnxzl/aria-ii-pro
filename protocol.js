/* Aria II Pro protocol codec.
 *
 * Pure functions only (no DOM, no WebHID) so the same file runs in the browser
 * (window.AriaProto) and under Node for the capture-based tests (tests/).
 *
 * Every constant here is taken from docs/EVIDENCE_LEDGER.md (§2–§8). Section
 * numbers are cited next to the code that implements them. Nothing is borrowed
 * from the Aria XD7 protocol.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AriaProto = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ── §2.1 USB identity ──────────────────────────────────────────────────
  const VID = 0x3554;
  const PID_RECEIVER = 0xf523; // 2.4 GHz receiver (dongle)
  const PID_WIRED = 0xf5a5; // wired mouse — static evidence only (gap G7)
  const REPORT_ID = 0x08;

  // ── §3 command ids ─────────────────────────────────────────────────────
  const CMD = {
    ONLINE: 0x03,
    BATTERY: 0x04,
    PAIR_ENTER: 0x05,
    PAIR_STATE: 0x06,
    WRITE: 0x07,
    READ: 0x08,
    CLEAR: 0x09, // "Restore" — destructive
    STATUS: 0x0a, // device → host notification
    GET_PROFILE: 0x0e,
    SET_PROFILE: 0x0f,
    VERSION: 0x12,
    SET_DONGLE_LED: 0x14,
    GET_DONGLE_LED: 0x15,
    SET_LONG_RANGE: 0x16,
    GET_LONG_RANGE: 0x17,
  };

  // ── §2.2 frame: body = bytes 1..16 of the 17-byte frame ────────────────
  // body: [id, status, addrH, addrL, len, data0..9, chk]; Σbody ≡ 0x4D (mod 256)
  function checksum(body15) {
    let s = 0;
    for (let i = 0; i < 15; i++) s += body15[i] | 0;
    return (0x4d - s) & 0xff;
  }
  function frame(id, addr = 0, len = 0, data = []) {
    const b = new Uint8Array(16);
    b[0] = id;
    b[1] = 0;
    b[2] = (addr >> 8) & 0xff;
    b[3] = addr & 0xff;
    b[4] = len;
    for (let i = 0; i < data.length && i < 10; i++) b[5 + i] = data[i] & 0xff;
    b[15] = checksum(b);
    return b;
  }
  function checksumOk(body) {
    if (!body || body.length < 16) return false;
    return checksum(body) === body[15];
  }
  /** Parse a 16-byte input body (WebHID strips the report id). */
  function parseBody(body) {
    return {
      id: body[0],
      status: body[1],
      addr: (body[2] << 8) | body[3],
      len: body[4],
      data: Array.from(body.slice(5, 15)),
      ok: checksumOk(body),
    };
  }

  const readFrame = (addr, len) => frame(CMD.READ, addr, len);
  const writeFrame = (addr, bytes) => frame(CMD.WRITE, addr, bytes.length, bytes);
  const simpleFrame = (id) => frame(id, 0, 0);
  const profileFrame = (p) => frame(CMD.SET_PROFILE, 0, 1, [p & 3]);
  // §3: 0x14/0x16 payload starts at byte 6 with len = 0x0A at byte 5.
  const dongleLedFrame = (mode) => frame(CMD.SET_DONGLE_LED, 0, 0x0a, [mode]);
  const longRangeFrame = (on) => frame(CMD.SET_LONG_RANGE, 0, 0x0a, [on ? 1 : 0]);
  // OPEN_QUESTIONS Part 3: reproduce exactly — CID 13 at frame offset 8
  // (body index 7) although len says 2.
  function pairFrame(cid = 13) {
    const b = new Uint8Array(16);
    b[0] = CMD.PAIR_ENTER;
    b[4] = 0x02;
    b[7] = cid & 0xff;
    b[15] = checksum(b);
    return b;
  }

  // ── §4 two-byte fields: value, 0x55 − value ─────────────────────────────
  const enc2 = (v) => [v & 0xff, (0x55 - v) & 0xff];
  const dec2 = (a, b) => (((a + b) & 0xff) === 0x55 ? a : null);
  const chk = (bytes) => (0x55 - bytes.reduce((s, x) => s + x, 0)) & 0xff;

  // Fields the app is allowed to write (ledger §4). 0x54–0x5F, 0xBB, 0xA0/0xA7
  // (hidden main LED), 0x06/0x08 (spindown) are never written.
  const F = {
    reportRate: { addr: 0x00, def: 1 },
    maxDPI: { addr: 0x02, def: 6 },
    currentDPI: { addr: 0x04, def: 2 },
    lod: { addr: 0x0a, def: 0 },
    ledMode: { addr: 0x4c, def: 2 },
    ledBrightness: { addr: 0x4e, def: 0x80 },
    ledSpeed: { addr: 0x50, def: 3 },
    ledEnable: { addr: 0x52, def: 1 },
    debounce: { addr: 0xa9, def: 8 },
    motionSync: { addr: 0xab, def: 1 },
    sleep: { addr: 0xad, def: 6 },
    angleSnap: { addr: 0xaf, def: 0 },
    ripple: { addr: 0xb1, def: 0 },
    peak: { addr: 0xb5, def: 0 },
    peakDuration: { addr: 0xb7, def: 6 },
    mode: { addr: 0xb9, def: 0 },
  };
  const FIELD_BY_ADDR = Object.fromEntries(Object.entries(F).map(([k, v]) => [v.addr, k]));

  // ── §5.1 report rate ───────────────────────────────────────────────────
  const RATES = [
    { code: 0x08, hz: 125 },
    { code: 0x04, hz: 250 },
    { code: 0x02, hz: 500 },
    { code: 0x01, hz: 1000 },
    { code: 0x10, hz: 2000 },
    { code: 0x20, hz: 4000 },
    { code: 0x40, hz: 8000 },
  ];
  const rateHz = (code) => (code < 0x10 ? (code ? 1000 / code : 0) : (code / 16) * 2000);

  // ── official option lists (installer XML / ledger §4, §6) ─────────────
  const LOD_OPTIONS = [1, 2]; // D2: 0.7 mm (3) not offered for sensor 3395
  const PEAK_DURATIONS = [
    { v: 3, s: 30 },
    { v: 6, s: 60 },
    { v: 12, s: 120 },
    { v: 30, s: 300 },
    { v: 60, s: 600 },
    { v: 90, s: 900 },
  ];
  const SLEEP_VALUES = [1, 3, 6, 30, 60, 90, 120, 150, 180, 210, 240]; // ×10 s
  const BRIGHTNESS_RAW = [16, 30, 60, 90, 128, 150, 180, 210, 230, 255]; // UI 1..10
  const brightnessToUi = (raw) => {
    let best = 0;
    for (let i = 0; i < BRIGHTNESS_RAW.length; i++)
      if (Math.abs(BRIGHTNESS_RAW[i] - raw) < Math.abs(BRIGHTNESS_RAW[best] - raw)) best = i;
    return best + 1;
  };
  const DPI_MIN = 50,
    DPI_MAX = 26000,
    DPI_STEP = 50,
    DPI_VERIFIED_MAX = 12800, // above: encoding captured (dpi12800.pcapng) + read back; sensor effect not measured
    STAGES_MAX = 4;

  // ── §5.2 DPI record, sensor "3395" (Config.ini DPIRange=50,26000,50,0x00) ─
  // Port of DPIControl.ValueToDPI for Sensor.DPIex = 0, Discord = false.
  function encodeDpi(dpi) {
    const v = Math.max(DPI_MIN, Math.min(DPI_MAX, Math.round(dpi / DPI_STEP) * DPI_STEP));
    const code = v / 50 - 1;
    const hi = code >> 8;
    const x = code & 0xff;
    const ex = ((hi << 2) | (hi << 6)) & 0xff;
    return [x, x, ex, chk([x, x, ex])];
  }
  function decodeDpi(rec) {
    if (!rec || rec.length < 4) return null;
    const [x, , ex, c] = rec;
    if (chk([rec[0], rec[1], ex]) !== c) return null;
    let value = x | ((ex >> 6) << 8);
    let dpi = (value + 1) * (ex & 0x22 ? 100 : 50);
    if (ex & 0x11) dpi *= 2;
    return dpi;
  }

  // ── §5.3 colour record ─────────────────────────────────────────────────
  const encodeColor = (r, g, b) => [r & 0xff, g & 0xff, b & 0xff, chk([r, g, b])];
  const decodeColor = (rec) =>
    rec && rec.length >= 4 && chk(rec.slice(0, 3)) === rec[3] ? [rec[0], rec[1], rec[2]] : null;
  const hexToRgb = (h) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || "");
    const n = m ? parseInt(m[1], 16) : 0xffffff;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgbToHex = (c) => "#" + c.map((x) => x.toString(16).padStart(2, "0")).join("");

  // ── §5.4 button table (0x60 + 4k) ──────────────────────────────────────
  // Physical button order as the official UI numbers them → flash slot k.
  const BUTTONS = [
    { ui: 1, k: 0, key: "left" },
    { ui: 2, k: 1, key: "right" },
    { ui: 3, k: 2, key: "middle" },
    { ui: 4, k: 4, key: "forward" },
    { ui: 5, k: 3, key: "back" },
    { ui: 6, k: 5, key: "dpi" },
  ];
  const MOUSE = { left: 0x01, right: 0x02, middle: 0x04, back: 0x08, forward: 0x10 };
  const DPI_FN = { loop: 1, up: 2, down: 3 };
  const FACTORY_BUTTONS = {
    0: { t: "mouse", v: "left" },
    1: { t: "mouse", v: "right" },
    2: { t: "mouse", v: "middle" },
    3: { t: "mouse", v: "back" },
    4: { t: "mouse", v: "forward" },
    5: { t: "dpi", v: "loop" },
  };
  // Media list from installer <SubKeyFunction type="05">.
  const MEDIA = [
    [0x183, "Media Player"],
    [0x0cd, "Play/Pause"],
    [0x0b5, "Next"],
    [0x0b6, "Previous"],
    [0x0b7, "Stop"],
    [0x0e2, "Mute"],
    [0x0e9, "Volume Up"],
    [0x0ea, "Volume Down"],
    [0x18a, "Email"],
    [0x192, "Calculator"],
    [0x194, "My Computer"],
    [0x223, "Home Page"],
    [0x221, "Search"],
    [0x225, "Web Forward"],
    [0x224, "Web Back"],
    [0x226, "Web Stop"],
    [0x227, "Refresh"],
    [0x22a, "Favorites"],
  ];
  const DPI_LOCK_VALUES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];
  // Macro cycle modes stored in the button record p2 (§5.6).
  const MACRO_MODE = { RELEASED: 0xfe, PRESSED: 0xff, THIS_KEY: 0xfd };

  /** action → button entry [type, p1, p2]. `k` is the flash slot (macro slot = k). */
  function encodeAction(a, k) {
    switch (a && a.t) {
      case "off":
        return [0x00, 0, 0];
      case "mouse":
        return [0x01, MOUSE[a.v] || 1, 0];
      case "dpi":
        return [0x02, DPI_FN[a.v] || 1, 0];
      case "hscroll":
        return [0x03, a.v === "right" ? 2 : 1, 0];
      case "fire":
        return [0x04, clamp(a.interval, 10, 255), clamp(a.times, 0, 3)];
      case "combo":
      case "media":
        return [0x05, 0, 0];
      case "macro": {
        const m = a.mode;
        const p2 = m === "pressed" ? 0xff : m === "thisKey" ? 0xfd : m === "times" ? clamp(a.times, 1, 250) : 0xfe;
        return [0x06, k & 0xff, p2];
      }
      case "rate":
        return [0x07, 0, 0];
      case "dpiLock":
        return [0x0a, Math.round(clamp(a.dpi, 100, 1200) / 50) - 1, 0];
      case "vscroll":
        return [0x0b, a.v === "down" ? 2 : 1, 0];
      case "raw":
        return a.bytes.slice(0, 3);
      default:
        return [0x00, 0, 0];
    }
  }
  const buttonRecord = (entry) => [entry[0], entry[1], entry[2], chk(entry)];

  /** entry (+ decoded shortcut / macro) → action */
  function decodeAction(e, shortcut, macro) {
    const [t, p1, p2] = e;
    if (t === 0x00) return { t: "off" };
    if (t === 0x01) {
      const v = Object.keys(MOUSE).find((x) => MOUSE[x] === p1);
      if (v) return { t: "mouse", v };
    }
    if (t === 0x02) {
      const v = Object.keys(DPI_FN).find((x) => DPI_FN[x] === p1);
      if (v) return { t: "dpi", v };
    }
    if (t === 0x03 && (p1 === 1 || p1 === 2)) return { t: "hscroll", v: p1 === 1 ? "left" : "right" };
    if (t === 0x04) return { t: "fire", interval: p1, times: p2 };
    if (t === 0x05) {
      if (shortcut && shortcut.events.length) {
        const media = shortcut.events.find((x) => x.type === 2);
        if (media) return { t: "media", usage: media.v0 | (media.v1 << 8) };
        let mods = 0;
        const keys = [];
        for (const ev of shortcut.events) {
          if (!ev.down) continue;
          if (ev.type === 0) mods |= ev.v0;
          else if (ev.type === 1) keys.push(ev.v0);
        }
        return { t: "combo", mods, keys };
      }
      return { t: "combo", mods: 0, keys: [], unknown: true };
    }
    if (t === 0x06) {
      const mode = p2 === 0xfe ? "released" : p2 === 0xff ? "pressed" : p2 === 0xfd ? "thisKey" : "times";
      return { t: "macro", slot: p1, mode, times: mode === "times" ? p2 : 1, name: macro ? macro.name : null };
    }
    if (t === 0x07) return { t: "rate" };
    if (t === 0x0a) return { t: "dpiLock", dpi: (p1 + 1) * 50 };
    if (t === 0x0b && (p1 === 1 || p1 === 2)) return { t: "vscroll", v: p1 === 1 ? "up" : "down" };
    return { t: "raw", bytes: [t, p1, p2] };
  }

  // ── §5.5 shortcut block (0x100 + 0x20k) ────────────────────────────────
  // Event wire triplet: [flags|type, v0, v1]; flags 0x80 = down, 0x40 = up.
  // Types: 0 modifier bitmask, 1 keyboard usage, 2 consumer usage (lo, hi).
  const SHORTCUT_BASE = 0x100,
    SHORTCUT_STRIDE = 0x20;
  function encodeShortcut(a) {
    const ev = [];
    if (a.t === "media") {
      const lo = a.usage & 0xff,
        hi = (a.usage >> 8) & 0xff;
      ev.push([0x82, lo, hi], [0x42, lo, hi]);
    } else {
      // App_StringToShortcutKey / App_AddShortCutKey: presses, then releases in reverse.
      const items = [];
      for (const bit of [1, 2, 4, 8, 16, 32, 64, 128]) if (a.mods & bit) items.push([0, bit]);
      for (const k of a.keys || []) items.push([1, k]);
      for (const [type, v] of items) ev.push([0x80 | type, v, 0]);
      for (let i = items.length - 1; i >= 0; i--) ev.push([0x40 | items[i][0], items[i][1], 0]);
    }
    if (ev.length < 2 || ev.length > 6) throw new Error("A combo can hold 1–3 keys including modifiers");
    const body = [ev.length, ...ev.flat()];
    return [...body, chk(body)];
  }
  function decodeShortcut(bytes) {
    if (!bytes || !bytes.length) return null;
    const n = bytes[0];
    if (n < 2 || n > 6 || bytes.length < 2 + 3 * n) return null;
    const body = bytes.slice(0, 1 + 3 * n);
    if (chk(body) !== bytes[1 + 3 * n]) return null;
    const events = [];
    for (let i = 0; i < n; i++) {
      const f = body[1 + 3 * i];
      events.push({ down: !!(f & 0x80), up: !!(f & 0x40), type: f & 0x0f, v0: body[2 + 3 * i], v1: body[3 + 3 * i] });
    }
    return { count: n, events };
  }

  // ── §5.6 macro slot (0x300 + 0x180k) ───────────────────────────────────
  const MACRO_BASE = 0x300,
    MACRO_STRIDE = 0x180,
    MACRO_MAX_EVENTS = 70,
    MACRO_MIN_EVENTS = 2,
    MACRO_NAME_MAX = 30,
    // Captured official macros end with a 0 ms delay on the last event
    // (Cycle Until (This) Key Pressed macro.pcapng); inserted actions default to 10 ms.
    MACRO_DELAY_MIN = 0,
    MACRO_DELAY_DEFAULT = 10,
    MACRO_DELAY_MAX = 65535;
  /** events: [{kind:'key'|'mod'|'media'|'mouse', down:bool, code:number, delay:ms}] */
  const KIND_TYPE = { mod: 0, key: 1, media: 2, mouse: 4 };
  const TYPE_KIND = { 0: "mod", 1: "key", 2: "media", 4: "mouse" };
  function encodeMacro(name, events) {
    if (events.length < MACRO_MIN_EVENTS || events.length > MACRO_MAX_EVENTS)
      throw new Error(`A macro needs ${MACRO_MIN_EVENTS}–${MACRO_MAX_EVENTS} events`);
    const nm = Array.from(asciiBytes(name || "Macro")).slice(0, MACRO_NAME_MAX);
    if (!nm.length) nm.push(0x4d);
    const out = [nm.length, ...nm];
    while (out.length < 0x1f) out.push(0xff);
    out.push(events.length);
    for (const e of events) {
      const type = KIND_TYPE[e.kind];
      if (type == null) throw new Error("Unsupported macro event");
      const code = e.code & 0xffff;
      const d = clamp(e.delay, MACRO_DELAY_MIN, MACRO_DELAY_MAX);
      out.push((e.down ? 0x80 : 0x40) | type, code & 0xff, type === 2 ? code >> 8 : 0, (d >> 8) & 0xff, d & 0xff);
    }
    out.push(chk(out.slice(0x1f)));
    return out;
  }
  /** Decode a macro slot. `bytes` must start at the slot base. */
  function decodeMacroHeader(bytes) {
    if (!bytes || bytes.length < 0x20) return null;
    const nl = bytes[0];
    const count = bytes[0x1f];
    if (nl < 1 || nl > MACRO_NAME_MAX || count < MACRO_MIN_EVENTS || count > MACRO_MAX_EVENTS) return null;
    return { nameLength: nl, count, total: 0x20 + 5 * count + 1 };
  }
  function decodeMacro(bytes) {
    const h = decodeMacroHeader(bytes);
    if (!h || bytes.length < h.total) return null;
    if (chk(bytes.slice(0x1f, h.total - 1)) !== bytes[h.total - 1]) return null;
    const name = String.fromCharCode(...bytes.slice(1, 1 + h.nameLength));
    const events = [];
    for (let i = 0; i < h.count; i++) {
      const o = 0x20 + 5 * i;
      const f = bytes[o];
      const type = f & 0x0f;
      const kind = TYPE_KIND[type];
      events.push({
        kind: kind || "raw",
        down: !!(f & 0x80),
        code: type === 2 ? bytes[o + 1] | (bytes[o + 2] << 8) : bytes[o + 1],
        delay: (bytes[o + 3] << 8) | bytes[o + 4],
        raw: kind ? undefined : bytes.slice(o, o + 5),
      });
    }
    return { name, events };
  }

  // ── §8 battery ─────────────────────────────────────────────────────────
  const BAT_TABLE = [3050, 3420, 3480, 3540, 3600, 3660, 3720, 3760, 3800, 3840, 3880, 3920, 3940, 3960, 3980, 4000, 4020, 4040, 4060, 4080, 4110];
  /** Port of BatteryHandle.BatVoltageToLevel (M:23490). */
  function batVoltageToLevel(mv, charging) {
    const t = BAT_TABLE;
    if (mv >= t[t.length - 1]) return charging ? 99 : 100;
    let idx = -1;
    for (let i = 0; i < t.length; i++)
      if (mv < t[i]) {
        idx = i;
        break;
      }
    if (idx <= 0) return 0;
    const step = Math.trunc((t[idx] - t[idx - 1]) / 5);
    let b = Math.trunc((mv - t[idx - 1]) / step) + (idx - 1) * 5;
    if (b === 0 || b === 15) b++;
    return b;
  }
  /** data = body bytes 5.. of a 0x04 reply */
  function parseBattery(data) {
    const level = data[0],
      charging = data[1] === 1,
      mv = (data[2] << 8) | data[3];
    return { rawLevel: level, charging, mv, percent: mv > 0 ? batVoltageToLevel(mv, charging) : level };
  }
  /** 0x06 reply (pairing.pcapng #7395: len 02, data 03 13). Only data[0] is
   *  parsed by the official FormPair: 1 pairing, 2 failed, 3 success. */
  const parsePairState = (data) => ({ state: data[0], extra: data[1] });
  const formatVersion = (hi, lo) => "v" + hi.toString(16) + "." + lo.toString(16).padStart(2, "0");

  // ── §4 parse the profile flash 0x00–0xBF ───────────────────────────────
  /** mem: function(addr) → byte | undefined */
  function parseConfig(mem) {
    const invalid = [];
    const get2 = (name) => {
      const f = F[name];
      const a = mem(f.addr),
        b = mem(f.addr + 1);
      const v = a == null || b == null ? null : dec2(a, b);
      if (v == null) {
        invalid.push(name);
        return f.def;
      }
      return v;
    };
    const s = {};
    for (const name of Object.keys(F)) s[name] = get2(name);
    if (!(s.currentDPI < s.maxDPI)) {
      invalid.push("currentDPI");
      s.currentDPI = 2;
    }
    s.dpi = [];
    s.dpiRaw = [];
    s.colors = [];
    for (let i = 0; i < 8; i++) {
      const rec = [0, 1, 2, 3].map((j) => mem(0x0c + 4 * i + j));
      s.dpiRaw.push(rec);
      s.dpi.push(decodeDpi(rec));
      const c = decodeColor([0, 1, 2, 3].map((j) => mem(0x2c + 4 * i + j)));
      s.colors.push(c ? rgbToHex(c) : null);
    }
    s.keys = [];
    for (let k = 0; k < 16; k++) {
      const rec = [0, 1, 2, 3].map((j) => mem(0x60 + 4 * k + j));
      const ok = rec.every((x) => x != null) && chk(rec.slice(0, 3)) === rec[3];
      s.keys.push(ok ? rec.slice(0, 3) : null);
    }
    s.invalid = invalid;
    return s;
  }

  // ── §6.12 official .bin export/import (64-byte header + 10,428-byte map) ──
  // Layout = Marshal.SizeOf(FlashDataMap) with default packing:
  //  MouseConfig 15 @0, DPIConfig[8]×6 @15, DPILed 4 @63, LedBar 7 @67,
  //  KeyFunMap[16]×3 @74, ShortCutKey[16]×52 @124, MacroKey[16]×592 @956.
  //  MacroContext = keyState(0 press/1 release), type, value[2], uint delay LE.
  const BIN = { HEADER: 64, MAP: 10428, MC: 0, DPI: 15, LED: 63, BAR: 67, KEYS: 74, SC: 124, SC_SIZE: 52, MK: 956, MK_SIZE: 592 };
  const MC_ORDER = ["reportRate", "maxDPI", "currentDPI", "xSpindown", "ySpindown", "lod", "debounce", "motionSync", "sleep", "angleSnap", "ripple", "moveOffLed", "peak", "peakDuration", "mode"];

  function writeCtx(buf, o, ev) {
    buf[o] = ev.down ? 0 : 1;
    buf[o + 1] = ev.type;
    buf[o + 2] = ev.v0 & 0xff;
    buf[o + 3] = ev.v1 & 0xff;
    const d = ev.delay >>> 0;
    buf[o + 4] = d & 0xff;
    buf[o + 5] = (d >> 8) & 0xff;
    buf[o + 6] = (d >> 16) & 0xff;
    buf[o + 7] = (d >> 24) & 0xff;
  }
  function readCtx(buf, o) {
    return {
      down: buf[o] === 0,
      type: buf[o + 1],
      v0: buf[o + 2],
      v1: buf[o + 3],
      delay: (buf[o + 4] | (buf[o + 5] << 8) | (buf[o + 6] << 16) | (buf[o + 7] << 24)) >>> 0,
    };
  }

  /**
   * Build an official export from device state.
   * dev: { cfg (parseConfig result + raw extras), shortcuts[k], macros[k], ledBar[7], spin[2], moveOffLed }
   */
  function buildBin(dev) {
    const out = new Uint8Array(BIN.HEADER + BIN.MAP);
    out.set(asciiBytes("Compx Inc"), 0);
    out.set(asciiBytes("3395"), 32);
    const m = out.subarray(BIN.HEADER);
    const c = dev.cfg;
    const mcVals = {
      reportRate: c.reportRate,
      maxDPI: c.maxDPI,
      currentDPI: c.currentDPI,
      xSpindown: dev.spin ? dev.spin[0] : 0,
      ySpindown: dev.spin ? dev.spin[1] : 0,
      lod: c.lod,
      debounce: c.debounce,
      motionSync: c.motionSync,
      sleep: c.sleep,
      angleSnap: c.angleSnap,
      ripple: c.ripple,
      moveOffLed: dev.moveOffLed || 0,
      peak: c.peak,
      peakDuration: c.peakDuration,
      mode: c.mode,
    };
    MC_ORDER.forEach((k, i) => (m[BIN.MC + i] = mcVals[k] & 0xff));
    for (let i = 0; i < 8; i++) {
      const r = c.dpiRaw[i] || [0xff, 0xff, 0, 0];
      const col = c.colors[i] ? hexToRgb(c.colors[i]) : [255, 255, 255];
      m.set([r[0] ?? 0xff, r[1] ?? 0xff, r[2] ?? 0, ...col], BIN.DPI + 6 * i);
    }
    m.set([c.ledMode, c.ledBrightness, c.ledSpeed, c.ledEnable], BIN.LED);
    m.set(dev.ledBar || [1, 255, 255, 255, 8, 9, 1], BIN.BAR);
    for (let k = 0; k < 16; k++) m.set(c.keys[k] || [0, 0, 0], BIN.KEYS + 3 * k);
    for (let k = 0; k < 16; k++) {
      const sc = dev.shortcuts && dev.shortcuts[k];
      if (!sc) continue;
      const o = BIN.SC + BIN.SC_SIZE * k;
      m[o] = sc.count;
      sc.events.forEach((ev, i) => writeCtx(m, o + 4 + 8 * i, { ...ev, delay: 0 }));
    }
    for (let k = 0; k < 16; k++) {
      const mk = dev.macros && dev.macros[k];
      if (!mk) continue;
      const o = BIN.MK + BIN.MK_SIZE * k;
      const nm = Array.from(asciiBytes(mk.name)).slice(0, 30);
      m[o] = nm.length;
      m.set(nm, o + 1);
      m[o + 31] = mk.events.length;
      mk.events.forEach((e, i) => {
        const type = KIND_TYPE[e.kind] ?? 1;
        writeCtx(m, o + 32 + 8 * i, { down: e.down, type, v0: e.code & 0xff, v1: type === 2 ? e.code >> 8 : 0, delay: e.delay });
      });
    }
    return out;
  }

  /** Parse an official export. Throws on header mismatch (ImportConfigFile codes 1/2). */
  function parseBin(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (b.length < BIN.HEADER + BIN.MAP) throw new Error("File is too short for an Aria II Pro profile");
    const str = (o, n) => String.fromCharCode(...b.slice(o, o + n)).replace(/\0.*$/s, "");
    if (str(0, 32) !== "Compx Inc") throw new Error("Not an official profile file (manufacturer header)");
    if (str(32, 32) !== "3395") throw new Error("Profile was exported for a different sensor");
    const m = b.subarray(BIN.HEADER, BIN.HEADER + BIN.MAP);
    const mc = {};
    MC_ORDER.forEach((k, i) => (mc[k] = m[i]));
    const dpiRaw = [],
      colors = [];
    for (let i = 0; i < 8; i++) {
      const o = BIN.DPI + 6 * i;
      const x = m[o],
        y = m[o + 1],
        ex = m[o + 2];
      dpiRaw.push([x, y, ex, chk([x, y, ex])]);
      colors.push(rgbToHex([m[o + 3], m[o + 4], m[o + 5]]));
    }
    const keys = [];
    for (let k = 0; k < 16; k++) keys.push(Array.from(m.slice(BIN.KEYS + 3 * k, BIN.KEYS + 3 * k + 3)));
    const shortcuts = [],
      macros = [];
    for (let k = 0; k < 16; k++) {
      const o = BIN.SC + BIN.SC_SIZE * k;
      const n = m[o];
      if (n >= 2 && n <= 6) {
        const events = [];
        for (let i = 0; i < n; i++) events.push(readCtx(m, o + 4 + 8 * i));
        shortcuts[k] = { count: n, events };
      }
      const mo = BIN.MK + BIN.MK_SIZE * k;
      const nl = m[mo],
        cnt = m[mo + 31];
      if (nl >= 1 && nl <= 30 && cnt >= 2 && cnt <= 70) {
        const events = [];
        for (let i = 0; i < cnt; i++) {
          const ctx = readCtx(m, mo + 32 + 8 * i);
          events.push({ kind: TYPE_KIND[ctx.type] || "key", down: ctx.down, code: ctx.type === 2 ? ctx.v0 | (ctx.v1 << 8) : ctx.v0, delay: Math.max(MACRO_DELAY_MIN, Math.min(MACRO_DELAY_MAX, ctx.delay)) });
        }
        macros[k] = { name: String.fromCharCode(...m.slice(mo + 1, mo + 1 + nl)), events };
      }
    }
    return {
      mc,
      dpiRaw,
      colors,
      led: { mode: m[BIN.LED], brightness: m[BIN.LED + 1], speed: m[BIN.LED + 2], enable: m[BIN.LED + 3] },
      ledBar: Array.from(m.slice(BIN.BAR, BIN.BAR + 7)),
      keys,
      shortcuts,
      macros,
    };
  }
  /** shortcut events (from parseBin) → wire block */
  function shortcutEventsToWire(sc) {
    const body = [sc.count];
    for (const ev of sc.events) body.push((ev.down ? 0x80 : 0x40) | ev.type, ev.v0, ev.v1);
    return [...body, chk(body)];
  }

  // ── Native diff writer order (N:FUN_10006d40) ─────────────────────────
  // One frame per changed field, emitted in this order: mouseConfig fields
  // (note 0xA9…0xB9 come before the DPI table), then per stage i the DPI
  // record 0x0C+4i followed by its colour 0x2C+4i, then DPI LED 0x4C–0x52,
  // LED bar 0xA0 (7 bytes) and 0xA7, keys 0x60+4k, shortcut blocks, macro slots.
  const MC_FIELDS = [
    [0x00, "reportRate"], [0x02, "maxDPI"], [0x04, "currentDPI"], [0x06, "xSpindown"], [0x08, "ySpindown"], [0x0a, "lod"],
    [0xa9, "debounce"], [0xab, "motionSync"], [0xad, "sleep"], [0xaf, "angleSnap"], [0xb1, "ripple"], [0xb3, "moveOffLed"],
    [0xb5, "peak"], [0xb7, "peakDuration"], [0xb9, "mode"],
  ];
  function officialRank(addr) {
    const mc = MC_FIELDS.findIndex(([a]) => a === addr);
    if (mc >= 0) return mc;
    if (addr >= 0x0c && addr < 0x2c) return 100 + ((addr - 0x0c) >> 2) * 2;
    if (addr >= 0x2c && addr < 0x4c) return 101 + ((addr - 0x2c) >> 2) * 2;
    if (addr >= 0x4c && addr <= 0x52) return 200 + addr;
    if (addr === 0xa0 || addr === 0xa7) return 300 + addr;
    if (addr >= 0x60 && addr < 0xa0) return 600 + addr;
    if (addr >= SHORTCUT_BASE && addr < MACRO_BASE) return 1000 + addr;
    return 10000 + addr; // macro slots
  }
  const sortOfficial = (writes) => writes.sort((a, b) => officialRank(a.addr) - officialRank(b.addr));

  // Clearing forms produced by ShortcutKeyToBuffer / MacroKeyToBuffer for an
  // empty slot (buffer pre-filled with 0xFF; captured after Restore,
  // profiles-config #16469 and #16481…#16503).
  const SHORTCUT_CLEAR = [0x00, 0xff];
  const MACRO_CLEAR = [0x00, ...new Array(30).fill(0xff), 0x00, 0x55];

  /**
   * DPI stage-count change (M:29902–29939 + native diff order).
   * cfg needs maxDPI, currentDPI, dpiRaw[8] (x, y, ex, chk) and colors[8].
   * If the active stage lies beyond the new count, the official app swaps
   * xDPI/yDPI and the colour between slot n−1 and the active slot, keeps each
   * slot's own DPIex, and makes slot n−1 active. Returns writes in order.
   */
  function stageCountPlan(cfg, n) {
    n = clamp(n, 1, STAGES_MAX);
    const writes = [{ addr: 0x02, bytes: enc2(n), what: "maxDPI" }];
    const cur = cfg.currentDPI;
    let active = cur;
    if (cur > n - 1) {
      const b = n - 1;
      const rec = (i) => (cfg.dpiRaw[i] || []).slice(0, 3).map((x, j) => (x == null ? (j < 2 ? 0xff : 0) : x));
      const rb = rec(b), rc = rec(cur);
      const nb = [rc[0], rc[1], rb[2]];
      const nc = [rb[0], rb[1], rc[2]];
      const colB = cfg.colors[b] || "#ffffff", colC = cfg.colors[cur] || "#ffffff";
      writes.push({ addr: 0x04, bytes: enc2(b), what: "currentDPI" });
      for (const [i, r, oldR, col, oldCol] of [[b, nb, rb, colC, colB], [cur, nc, rc, colB, colC]]) {
        if (r.some((x, j) => x !== oldR[j])) writes.push({ addr: 0x0c + 4 * i, bytes: [...r, chk(r)], what: "dpi" + (i + 1) });
        if (col.toLowerCase() !== oldCol.toLowerCase()) writes.push({ addr: 0x2c + 4 * i, bytes: encodeColor(...hexToRgb(col)), what: "colour" + (i + 1) });
      }
      active = b;
    }
    return { writes: sortOfficial(writes), active };
  }

  /**
   * Official Import (M:14693): clear every shortcut/macro slot that is not empty
   * on the mouse, then write every field of the file that differs (native diff).
   * dev: { mem(addr) → byte|undefined, shortcutUsed[16], macroUsed[16] }.
   */
  function importPlan(dev, file) {
    if (file.mc.maxDPI > STAGES_MAX) return { error: "maxDPI", writes: [], clears: [] };
    const clears = [];
    for (let k = 0; k < 16; k++) {
      if (dev.shortcutUsed[k]) clears.push({ addr: SHORTCUT_BASE + SHORTCUT_STRIDE * k, bytes: SHORTCUT_CLEAR, what: "clear shortcut " + k });
      if (dev.macroUsed[k]) clears.push({ addr: MACRO_BASE + MACRO_STRIDE * k, bytes: MACRO_CLEAR, what: "clear macro " + k });
    }
    sortOfficial(clears);
    const m = dev.mem;
    const writes = [];
    const two = (addr, v, what) => {
      if (m(addr) !== (v & 0xff) || m(addr + 1) !== ((0x55 - v) & 0xff)) writes.push({ addr, bytes: enc2(v), what });
    };
    for (const [addr, name] of MC_FIELDS) {
      let v = file.mc[name];
      if (name === "motionSync") v = v ? 1 : 0; // native writes (value != 0)
      two(addr, v, name);
    }
    for (let i = 0; i < 8; i++) {
      const r = file.dpiRaw[i].slice(0, 3);
      if (r.some((x, j) => m(0x0c + 4 * i + j) !== x)) writes.push({ addr: 0x0c + 4 * i, bytes: [...r, chk(r)], what: "dpi" + (i + 1) });
      const c = hexToRgb(file.colors[i]);
      if (c.some((x, j) => m(0x2c + 4 * i + j) !== x)) writes.push({ addr: 0x2c + 4 * i, bytes: encodeColor(...c), what: "colour" + (i + 1) });
    }
    two(0x4c, file.led.mode, "ledMode");
    two(0x4e, file.led.brightness, "ledBrightness");
    two(0x50, file.led.speed, "ledSpeed");
    two(0x52, file.led.enable, "ledEnable");
    const bar = file.ledBar.slice(0, 6);
    if (bar.some((x, j) => m(0xa0 + j) !== x)) writes.push({ addr: 0xa0, bytes: [...bar, chk(bar)], what: "ledBar" });
    two(0xa7, file.ledBar[6], "ledBarEnable");
    for (let k = 0; k < 16; k++) {
      const e = file.keys[k];
      if (e.some((x, j) => m(0x60 + 4 * k + j) !== x) || m(0x63 + 4 * k) !== chk(e)) writes.push({ addr: 0x60 + 4 * k, bytes: buttonRecord(e), what: "key" + k });
    }
    for (let k = 0; k < 16; k++) if (file.shortcuts[k]) writes.push({ addr: SHORTCUT_BASE + SHORTCUT_STRIDE * k, bytes: shortcutEventsToWire(file.shortcuts[k]), what: "shortcut" + k });
    for (let k = 0; k < 16; k++) if (file.macros[k]) writes.push({ addr: MACRO_BASE + MACRO_STRIDE * k, bytes: encodeMacro(file.macros[k].name, file.macros[k].events), what: "macro" + k });
    return { clears, writes: sortOfficial(writes) };
  }

  /** Restore follow-up (M:13339–13351): clear the slots still holding data. */
  function restoreClearPlan(shortcutUsed, macroUsed) {
    const clears = [];
    for (let k = 0; k < 16; k++) {
      if (shortcutUsed[k]) clears.push({ addr: SHORTCUT_BASE + SHORTCUT_STRIDE * k, bytes: SHORTCUT_CLEAR, what: "clear shortcut " + k });
      if (macroUsed[k]) clears.push({ addr: MACRO_BASE + MACRO_STRIDE * k, bytes: MACRO_CLEAR, what: "clear macro " + k });
    }
    return sortOfficial(clears);
  }

  // ── helpers ────────────────────────────────────────────────────────────
  function clamp(v, lo, hi) {
    v = Math.round(Number(v));
    if (!Number.isFinite(v)) v = lo;
    return Math.max(lo, Math.min(hi, v));
  }
  function asciiBytes(s) {
    const out = [];
    for (const ch of String(s)) {
      const c = ch.charCodeAt(0);
      out.push(c >= 0x20 && c < 0x7f ? c : 0x3f);
    }
    return Uint8Array.from(out);
  }
  const hex = (arr) => Array.from(arr || [], (x) => (x ?? 0).toString(16).padStart(2, "0")).join(" ");

  return {
    VID, PID_RECEIVER, PID_WIRED, REPORT_ID, CMD,
    checksum, checksumOk, frame, parseBody, readFrame, writeFrame, simpleFrame, profileFrame, dongleLedFrame, longRangeFrame, pairFrame,
    enc2, dec2, chk, F, FIELD_BY_ADDR,
    RATES, rateHz, LOD_OPTIONS, PEAK_DURATIONS, SLEEP_VALUES, BRIGHTNESS_RAW, brightnessToUi,
    DPI_MIN, DPI_MAX, DPI_STEP, DPI_VERIFIED_MAX, STAGES_MAX,
    encodeDpi, decodeDpi, encodeColor, decodeColor, hexToRgb, rgbToHex,
    BUTTONS, MOUSE, DPI_FN, FACTORY_BUTTONS, MEDIA, DPI_LOCK_VALUES, MACRO_MODE,
    encodeAction, decodeAction, buttonRecord,
    SHORTCUT_BASE, SHORTCUT_STRIDE, encodeShortcut, decodeShortcut, shortcutEventsToWire,
    MACRO_BASE, MACRO_STRIDE, MACRO_MAX_EVENTS, MACRO_MIN_EVENTS, MACRO_NAME_MAX, MACRO_DELAY_MIN, MACRO_DELAY_DEFAULT, MACRO_DELAY_MAX,
    encodeMacro, decodeMacro, decodeMacroHeader,
    BAT_TABLE, batVoltageToLevel, parseBattery, formatVersion, parsePairState,
    parseConfig, BIN, buildBin, parseBin,
    MC_FIELDS, officialRank, sortOfficial, SHORTCUT_CLEAR, MACRO_CLEAR, stageCountPlan, importPlan, restoreClearPlan,
    clamp, hex,
  };
});
