// Capture-based regression tests for protocol.js.
// Run from the project root:  node tests/protocol.test.cjs
// Every expected byte string below is copied from docs/evidence/CAPTURE_TRANSCRIPTS.txt
// (official app traffic) or from the official profile exports in the workspace.
"use strict";
const fs = require("fs");
const path = require("path");
const P = require("../protocol.js");

let pass = 0,
  fail = 0;
const hex = (a) => Array.from(a, (x) => x.toString(16).padStart(2, "0")).join(" ");
const unhex = (s) => s.trim().split(/\s+/).map((x) => parseInt(x, 16));
function eq(name, got, want) {
  const g = typeof got === "string" ? got : JSON.stringify(got);
  const w = typeof want === "string" ? want : JSON.stringify(want);
  if (g === w) pass++;
  else {
    fail++;
    console.error(`FAIL ${name}\n  got:  ${g}\n  want: ${w}`);
  }
}
// Capture line → 16-byte WebHID body (id st aH aL len data[10] chk)
function body(id, addr, len, data) {
  const f = P.frame(id, addr, len, unhex(data));
  return f;
}

// ── frame checksum (§2.2) ──
eq("pair frame (OPEN_QUESTIONS Part 3)", "08 " + hex(P.pairFrame(13)), "08 05 00 00 00 02 00 00 0d 00 00 00 00 00 00 00 39");
eq("pair state poll frame", hex(P.simpleFrame(0x06)).split(" ")[15], "47");
eq("read 0x4C len 8 (observation 3)", hex(P.readFrame(0x4c, 8)), "08 00 00 4c 08 00 00 00 00 00 00 00 00 00 00 f1");
{
  const sample = unhex("07 00 00 0C 04 20 20 00 15 00 00 00 00 00 00 E1");
  eq("checksum of logged DPI write", P.checksumOk(Uint8Array.from(sample)), true);
  eq("rebuild logged DPI write", hex(P.writeFrame(0x0c, [0x20, 0x20, 0x00, 0x15])), hex(sample));
}
eq("0x14 frame puts len at byte4, mode at byte5", hex(P.dongleLedFrame(2)).slice(0, 17), "14 00 00 00 0a 02");
eq("0x16 frame", hex(P.longRangeFrame(true)).slice(0, 17), "16 00 00 00 0a 01");
eq("0x0F profile frame", hex(P.profileFrame(1)).slice(0, 17), "0f 00 00 00 01 01");

// ── two-byte fields from captures ──
eq("debounce 1 ms → 01 54", P.enc2(1), [1, 0x54]);
eq("debounce 20 ms → 14 41", P.enc2(20), [0x14, 0x41]);
eq("peak duration 90 → 5a fb", P.enc2(90), [0x5a, 0xfb]);
eq("rate 2000 Hz code 0x10 → 10 45", P.enc2(0x10), [0x10, 0x45]);
eq("dec2 rejects bad complement", P.dec2(0x01, 0x55), null);
eq("rate code 0x40 = 8000 Hz", P.rateHz(0x40), 8000);
eq("rate code 0x08 = 125 Hz", P.rateHz(0x08), 125);

// ── DPI (§5.2) ──
const dpiCases = [
  ["1f 1f 00 17", 1600],
  ["07 07 00 47", 400],
  ["3f 3f 00 d7", 3200],
  ["7f 7f 00 57", 6400],
  ["0f 0f 00 37", 800],
  ["20 20 00 15", 1650],
  ["4e 4e 00 b9", 3950],
];
for (const [rec, dpi] of dpiCases) {
  eq(`decode ${rec}`, P.decodeDpi(unhex(rec)), dpi);
  eq(`encode ${dpi}`, hex(P.encodeDpi(dpi)), rec);
}
eq("decode CC CC 00 BD (ledger example)", P.decodeDpi(unhex("cc cc 00 bd")), 10250);
for (const v of [50, 12800, 12850, 20000, 26000]) eq(`round-trip ${v}`, P.decodeDpi(P.encodeDpi(v)), v);
eq("encode clamps to 26000", P.decodeDpi(P.encodeDpi(99999)), 26000);
eq("decode rejects bad checksum", P.decodeDpi([0x1f, 0x1f, 0, 0x18]), null);

// ── colours (§5.3) ──
eq("red stage colour (dpi color capture #8069)", hex(P.encodeColor(255, 0, 0)), "ff 00 00 56");
eq("blue stage colour (#13853)", hex(P.encodeColor(0, 0, 255)), "00 00 ff 56");

// ── buttons (§5.4) ──
const btn = (a, k) => hex(P.buttonRecord(P.encodeAction(a, k)));
eq("DPI Loop record (button-remap #36565)", btn({ t: "dpi", v: "loop" }, 5), "02 01 00 52");
eq("Forward record", btn({ t: "mouse", v: "forward" }, 4), "01 10 00 44");
eq("Back record", btn({ t: "mouse", v: "back" }, 3), "01 08 00 4c");
eq("Right record", btn({ t: "mouse", v: "right" }, 1), "01 02 00 52");
eq("Fire key 10 ms ×3 (#9337)", btn({ t: "fire", interval: 10, times: 3 }, 2), "04 0a 03 44");
eq("Disabled (#13239)", btn({ t: "off" }, 2), "00 00 00 55");
eq("Polling-rate switch (#4451)", btn({ t: "rate" }, 1), "07 00 00 4e");
eq("Media/Combo entry (#6049)", btn({ t: "media", usage: 0xe2 }, 4), "05 00 00 50");
eq("Macro until released (#30677)", btn({ t: "macro", mode: "released" }, 4), "06 04 fe 4d");
eq("Macro until pressed (cycle #6203)", btn({ t: "macro", mode: "pressed" }, 4), "06 04 ff 4c");
eq("Macro until this key (cycle #11197)", btn({ t: "macro", mode: "thisKey" }, 4), "06 04 fd 4e");
eq("Macro 1 cycle (macro-manager #43307)", btn({ t: "macro", mode: "times", times: 1 }, 4), "06 04 01 4a");
eq("DPI lock 100 → code 1", P.encodeAction({ t: "dpiLock", dpi: 100 })[1], 1);
eq("DPI lock 1200 → code 0x17", P.encodeAction({ t: "dpiLock", dpi: 1200 })[1], 0x17);
eq("decode DPI Loop", P.decodeAction([2, 1, 0]), { t: "dpi", v: "loop" });
eq("decode fire", P.decodeAction([4, 10, 3]), { t: "fire", interval: 10, times: 3 });

// ── shortcut block (§5.5) ──
eq("Mute shortcut block (#6053)", hex(P.encodeShortcut({ t: "media", usage: 0xe2 })), "02 82 e2 00 42 e2 00 cb");
{
  const sc = P.decodeShortcut(unhex("02 82 e2 00 42 e2 00 cb"));
  eq("decode Mute", P.decodeAction([5, 0, 0], sc), { t: "media", usage: 0xe2 });
}
{
  const blk = P.encodeShortcut({ t: "combo", mods: 1, keys: [0x06] }); // Ctrl+C
  eq("Ctrl+C block layout", hex(blk), "04 80 01 00 81 06 00 41 06 00 40 01 00 " + hex([P.chk(blk.slice(0, 13))]));
  eq("decode Ctrl+C", P.decodeAction([5, 0, 0], P.decodeShortcut(blk)), { t: "combo", mods: 1, keys: [6] });
}

// ── macro slot (§5.6) — "cycle releas", 6 × left click, slot 4 (macro autoclick #30681…30705) ──
{
  const ev = [];
  for (let i = 0; i < 3; i++) ev.push({ kind: "mouse", down: true, code: 1, delay: 10 }, { kind: "mouse", down: false, code: 1, delay: 10 });
  const bytes = P.encodeMacro("cycle releas", ev);
  const wire = [
    "0c 63 79 63 6c 65 20 72 65 6c",
    "65 61 73 ff ff ff ff ff ff ff",
    "ff ff ff ff ff ff ff ff ff ff",
    "ff 06 84 01 00 00 0a 44 01 00",
    "00 0a 84 01 00 00 0a 44 01 00",
    "00 0a 84 01 00 00 0a 44 01 00",
    "00 0a b5",
  ].join(" ");
  eq("macro 'cycle releas' bytes", hex(bytes), wire);
  eq("macro slot 4 base address", P.MACRO_BASE + P.MACRO_STRIDE * 4, 0x900);
  const d = P.decodeMacro(bytes);
  eq("macro decode name", d.name, "cycle releas");
  eq("macro decode events", d.events.length, 6);
  const eben = P.encodeMacro("eben", ev.slice(0, 4));
  eq("macro 'eben' tail (#43331)", hex(eben.slice(0x32)), "00 0a 95");
}

// ── battery (§8) ──
eq("4055 mV → 88 %", P.batVoltageToLevel(4055, false), 88);
eq("4051 mV → 87 %", P.batVoltageToLevel(4051, false), 87);
eq("4046 mV → 86 %", P.batVoltageToLevel(4046, false), 86);
eq("4042 mV → 85 %", P.batVoltageToLevel(4042, false), 85);
eq("≥4110 mV discharging → 100", P.batVoltageToLevel(4159, false), 100);
eq("≥4110 mV charging → 99", P.batVoltageToLevel(4200, true), 99);
eq("parse 04 reply 64 00 10 3F", P.parseBattery([0x64, 0x00, 0x10, 0x3f]), { rawLevel: 100, charging: false, mv: 4159, percent: 100 });
eq("version 02 19 → v2.19", P.formatVersion(0x02, 0x19), "v2.19");

// ── full profile read (profiles-config #3211…#3301) ──
{
  const chunks = {
    0x00: "01 54 04 51 01 54 00 55 00 55",
    0x0a: "01 54 07 07 00 47 0f 0f 00 37",
    0x14: "1f 1f 00 17 3f 3f 00 d7 3f 3f",
    0x1e: "00 d7 7f 7f 00 57 7f 7f 00 57",
    0x28: "7f 7f 00 57 ff 00 00 56 00 00",
    0x32: "ff 56 00 ff 00 56 ff 00 ff 57",
    0x3c: "ff 00 ff 57 ff 00 ff 57 ff 00",
    0x46: "ff 57 ff 00 ff 57 02 53 80 d5",
    0x50: "03 52 01 54 ff 00 ff 57 00 55",
    0x5a: "80 d5 03 52 00 55 01 01 00 53",
    0x64: "01 02 00 52 01 04 00 50 01 08",
    0x6e: "00 4c 01 10 00 44 02 01 00 52",
    0x78: "02 02 00 51 02 03 00 50 07 00",
    0x82: "00 4e 08 04 00 49 04 0a 03 44",
    0x8c: "00 00 00 55 00 00 00 55 00 00",
    0x96: "00 55 00 00 00 55 00 00 00 55",
    0xa0: "01 ff 00 ff 07 09 46 00 55 08",
    0xaa: "4d 01 54 3c 19 00 55 00 55 00",
    0xb4: "55 00 55 06 4f 00 55 0a 4b ff",
    0xbe: "ff ff",
  };
  const mem = new Array(0xc0);
  for (const [a, d] of Object.entries(chunks)) unhex(d).forEach((b, i) => (mem[+a + i] = b));
  const c = P.parseConfig((a) => mem[a]);
  eq("cfg report rate", c.reportRate, 1);
  eq("cfg maxDPI", c.maxDPI, 4);
  eq("cfg currentDPI", c.currentDPI, 1);
  eq("cfg lod", c.lod, 1);
  eq("cfg dpi stages", c.dpi.slice(0, 4), [400, 800, 1600, 3200]);
  eq("cfg colours", c.colors.slice(0, 4), ["#ff0000", "#0000ff", "#00ff00", "#ff00ff"]);
  eq("cfg dpi led", [c.ledMode, c.ledBrightness, c.ledSpeed, c.ledEnable], [2, 0x80, 3, 1]);
  eq("cfg debounce", c.debounce, 8);
  eq("cfg motionSync", c.motionSync, 1);
  eq("cfg sleep", c.sleep, 60);
  eq("cfg peak/duration/mode", [c.peak, c.peakDuration, c.mode], [0, 6, 0]);
  eq("cfg key 5 = DPI Loop", c.keys[5], [2, 1, 0]);
  eq("cfg key 4 = Forward", c.keys[4], [1, 0x10, 0]);
  eq("no invalid fields", c.invalid, []);
}

// ── DPI stage-count swap (M:29909–29939): x/y and colour move, DPIex stays ──
{
  const cfg = {
    maxDPI: 4, currentDPI: 3,
    dpiRaw: [[0x07, 0x07, 0x00, 0x47], [0x0f, 0x0f, 0x00, 0x37], [0x1f, 0x1f, 0x00, 0x17], [0x03, 0x03, 0x88, 0], ...Array(4).fill([0x7f, 0x7f, 0, 0x57])],
    colors: ["#ff0000", "#0000ff", "#00ff00", "#ff00ff", "#ffffff", "#ffffff", "#ffffff", "#ffffff"],
  };
  cfg.dpiRaw[3][3] = P.chk(cfg.dpiRaw[3].slice(0, 3)); // stage 4 = 0x203 code → 26000 with ex 0x88
  const plan = P.stageCountPlan(cfg, 3);
  eq("swap: active becomes stage 3", plan.active, 2);
  eq("swap: official write order", plan.writes.map((w) => w.addr), [0x02, 0x04, 0x14, 0x34, 0x18, 0x38]);
  eq("swap: count 3", plan.writes[0].bytes, [3, 0x52]);
  eq("swap: active 2", plan.writes[1].bytes, [2, 0x53]);
  eq("swap: slot 3 gets x/y of slot 4 but keeps its own DPIex 00", hex(plan.writes[2].bytes), "03 03 00 4f");
  eq("swap: slot 4 gets x/y of slot 3 but keeps DPIex 88", hex(plan.writes[4].bytes), hex([0x1f, 0x1f, 0x88, P.chk([0x1f, 0x1f, 0x88])]));
  eq("swap: colours exchanged", [hex(plan.writes[3].bytes), hex(plan.writes[5].bytes)], ["ff 00 ff 57", "00 ff 00 56"]);
  const plan2 = P.stageCountPlan({ ...cfg, currentDPI: 1 }, 3);
  eq("no swap when active stage stays inside", plan2.writes.map((w) => w.addr), [0x02]);
  eq("no swap: active unchanged", plan2.active, 1);
}

// ── clearing forms after Restore (profiles-config #16469, #16481…#16503) ──
{
  const clears = P.restoreClearPlan(Object.assign(Array(16).fill(false), { 5: true }), Object.assign(Array(16).fill(false), { 4: true }));
  eq("restore clears: order shortcut then macro", clears.map((c) => c.addr), [0x1a0, 0x900]);
  eq("shortcut clear bytes", hex(clears[0].bytes), "00 ff");
  const m = clears[1].bytes;
  eq("macro clear 33 bytes", m.length, 33);
  eq("macro clear chunk 1", hex(m.slice(0, 10)), "00 ff ff ff ff ff ff ff ff ff");
  eq("macro clear tail at 0x91E", hex(m.slice(30)), "ff 00 55");
}
// ── official write ranking (N:FUN_10006d40) ──
eq("debounce ranks before DPI table", P.officialRank(0xa9) < P.officialRank(0x0c), true);
eq("key record before shortcut before macro", P.officialRank(0x70) < P.officialRank(0x180) && P.officialRank(0x180) < P.officialRank(0x900), true);
eq("record i before colour i before record i+1", P.officialRank(0x10) < P.officialRank(0x30) && P.officialRank(0x30) < P.officialRank(0x14), true);

// ── official .bin exports ──
const root = path.join(__dirname, "..");
const bins = ["export.bin", "nwex.bin", "aria/aria-ii-pro-capture-2026-10-23-rev2/before/before edit.bin"].map((f) => path.join(root, f)).filter((f) => fs.existsSync(f));
for (const f of bins) {
  const b = new Uint8Array(fs.readFileSync(f));
  const p = P.parseBin(b);
  eq(`${path.basename(f)}: 6 physical keys parsed`, p.keys.length, 16);
  eq(`${path.basename(f)}: macro 'eben' on slot 5`, p.macros[5] && p.macros[5].name, "eben");
  // round trip through buildBin keeps the managed fields we model
  const dev = {
    cfg: {
      reportRate: p.mc.reportRate, maxDPI: p.mc.maxDPI, currentDPI: p.mc.currentDPI, lod: p.mc.lod, debounce: p.mc.debounce,
      motionSync: p.mc.motionSync, sleep: p.mc.sleep, angleSnap: p.mc.angleSnap, ripple: p.mc.ripple, peak: p.mc.peak,
      peakDuration: p.mc.peakDuration, mode: p.mc.mode, dpiRaw: p.dpiRaw, colors: p.colors,
      ledMode: p.led.mode, ledBrightness: p.led.brightness, ledSpeed: p.led.speed, ledEnable: p.led.enable, keys: p.keys,
    },
    spin: [p.mc.xSpindown, p.mc.ySpindown], moveOffLed: p.mc.moveOffLed, ledBar: p.ledBar,
    shortcuts: p.shortcuts, macros: p.macros,
  };
  const re = P.buildBin(dev);
  eq(`${path.basename(f)}: header+mouseConfig+dpi+led+keys identical`, hex(re.slice(0, 64 + 124)), hex(b.slice(0, 64 + 124)));
  const p2 = P.parseBin(re);
  eq(`${path.basename(f)}: macros survive round trip`, JSON.stringify(p2.macros), JSON.stringify(p.macros));
  if (p.shortcuts[5]) eq(`${path.basename(f)}: shortcut 5 → Mute wire`, hex(P.shortcutEventsToWire(p.shortcuts[5])), "02 82 e2 00 42 e2 00 cb");
}
{
  const f = bins.find((x) => x.endsWith("export.bin"));
  if (f) {
    const file = P.parseBin(new Uint8Array(fs.readFileSync(f)));
    const fac = {
      0x00: "01 54 04 51 01 54 00 55 00 55", 0x0a: "01 54 07 07 00 47 0f 0f 00 37", 0x14: "1f 1f 00 17 3f 3f 00 d7 3f 3f",
      0x1e: "00 d7 7f 7f 00 57 7f 7f 00 57", 0x28: "7f 7f 00 57 ff 00 00 56 00 00", 0x32: "ff 56 00 ff 00 56 ff 00 ff 57",
      0x3c: "ff 00 ff 57 ff 00 ff 57 ff 00", 0x46: "ff 57 ff 00 ff 57 02 53 80 d5", 0x50: "03 52 01 54 ff 00 ff 57 00 55",
      0x5a: "80 d5 03 52 00 55 01 01 00 53", 0x64: "01 02 00 52 01 04 00 50 01 08", 0x6e: "00 4c 01 10 00 44 02 01 00 52",
      0x78: "02 02 00 51 02 03 00 50 07 00", 0x82: "00 4e 08 04 00 49 04 0a 03 44", 0x8c: "00 00 00 55 00 00 00 55 00 00",
      0x96: "00 55 00 00 00 55 00 00 00 55", 0xa0: "01 ff 00 ff 07 09 46 00 55 08", 0xaa: "4d 01 54 3c 19 00 55 00 55 00",
      0xb4: "55 00 55 06 4f 00 55 0a 4b ff",
    };
    const mem = [];
    for (const [a, d] of Object.entries(fac)) unhex(d).forEach((b, i) => (mem[+a + i] = b));
    const plan = P.importPlan({ mem: (a) => mem[a], shortcutUsed: Array(16).fill(false), macroUsed: Array(16).fill(false) }, file);
    const ranks = plan.writes.map((w) => P.officialRank(w.addr));
    eq("import plan in native diff order", ranks.every((r, i) => !i || r >= ranks[i - 1]), true);
    eq("import writes 2000 Hz first", hex(plan.writes[0].bytes), "10 45");
    eq("import writes macros of the file (slots 4, 5)", plan.writes.filter((w) => w.addr >= 0x300).map((w) => w.addr), [0x900, 0xa80]);
    eq("import writes shortcut 5 (Mute)", plan.writes.filter((w) => w.addr === 0x1a0).map((w) => hex(w.bytes)), ["02 82 e2 00 42 e2 00 cb"]);
    eq("import never touches 0x54–0x5F / 0xBB", plan.writes.some((w) => (w.addr >= 0x54 && w.addr < 0x60) || w.addr === 0xbb), false);
    eq("import rejects 5 stages", P.importPlan({ mem: () => 0, shortcutUsed: [], macroUsed: [] }, { ...file, mc: { ...file.mc, maxDPI: 5 } }).error, "maxDPI");
  }
}
let threw = false;
try {
  P.parseBin(new Uint8Array(10492));
} catch {
  threw = true;
}
eq("parseBin rejects foreign header", threw, true);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
