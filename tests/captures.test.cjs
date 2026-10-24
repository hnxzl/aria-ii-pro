// Regression fixtures from the 2026-10-24 official-app captures.
// Source: docs/evidence/CAPTURE_TRANSCRIPTS_2026-10-24.txt (decoded by tools/usbpcap_decode.py).
// Every host→device frame the app builds for these features must equal the
// frame the official Fantech app sent; parsers must read the device replies.
// Run from the project root:  node tests/captures.test.cjs
"use strict";
const fs = require("fs");
const path = require("path");
const P = require("../protocol.js");

const FILE = path.join(__dirname, "..", "docs", "evidence", "CAPTURE_TRANSCRIPTS_2026-10-24.txt");
let pass = 0,
  fail = 0;
const hex = (a) => Array.from(a, (x) => x.toString(16).padStart(2, "0")).join(" ");
function eq(name, got, want) {
  const g = typeof got === "string" ? got : JSON.stringify(got);
  const w = typeof want === "string" ? want : JSON.stringify(want);
  if (g === w) pass++;
  else {
    fail++;
    console.error(`FAIL ${name}\n  got:  ${g}\n  want: ${w}`);
  }
}

// ── parse the transcript ──
const sections = {};
let cur = null;
const header = {};
for (const line of fs.readFileSync(FILE, "utf8").split("\n")) {
  const h = /^##### (.+)$/.exec(line);
  if (h) {
    cur = h[1];
    sections[cur] = sections[cur] || [];
    continue;
  }
  const d = /^# device bus \d+ dev \d+: VID (\w{4}) PID (\w{4})/.exec(line);
  if (d && cur) header[cur] = { vid: parseInt(d[1], 16), pid: parseInt(d[2], 16) };
  const m = /^\s*(\d+)\s+([\d.]+)\s+\S+\s+(OUT|IN82)\s+id=(\w\w) st=(\w\w) addr=(\w{4}) len=(\w\w) data=((?:\w\w ?){10}) ck=(\w+)/.exec(line);
  if (m && cur)
    sections[cur].push({
      n: +m[1], t: +m[2], dir: m[3], id: parseInt(m[4], 16), st: parseInt(m[5], 16), addr: parseInt(m[6], 16), len: parseInt(m[7], 16),
      data: m[8].trim().split(" ").map((x) => parseInt(x, 16)), ck: m[9],
    });
}
// WebHID body (report ID stripped) of a transcript row
const body = (r) => P.frame(r.id, r.addr, r.len, r.data);
const outs = (sec, pred = () => true) => sections[sec].filter((r) => r.dir === "OUT" && pred(r));
const ins = (sec, pred = () => true) => sections[sec].filter((r) => r.dir === "IN82" && pred(r));
const writes = (sec) => outs(sec, (r) => r.id === 0x07);
// The app's chunking of one logical write (writeVerified: ≤10-byte 0x07 frames)
const chunks = (addr, bytes) => {
  const out = [];
  for (let o = 0; o < bytes.length; o += 10) out.push(hex(P.writeFrame(addr + o, bytes.slice(o, o + 10))));
  return out;
};

eq("transcript has all 7 captures", Object.keys(sections).filter((k) => k.endsWith(".pcapng")).length >= 7, true);
for (const [sec, rows] of Object.entries(sections)) eq(`${sec}: every frame checksum ok`, rows.every((r) => r.ck === "ok"), true);

// ── restore.pcapng ──
{
  const S = "restore.pcapng";
  const o = outs(S);
  const i9 = o.findIndex((r) => r.id === 0x09);
  eq("restore: ClearSetting frame", hex(body(o[i9])), hex(P.simpleFrame(0x09)));
  eq("restore: then Long distance On", hex(body(o[i9 + 1])), hex(P.longRangeFrame(true)));
  eq("restore: then receiver LED Battery State", hex(body(o[i9 + 2])), hex(P.dongleLedFrame(2)));
  const echo9 = ins(S, (r) => r.id === 0x09)[0];
  eq("restore: 0x09 answered by an identical echo", hex(body(echo9)), hex(P.simpleFrame(0x09)));
  eq("restore: echo after ~600 ms", Math.round((echo9.t - o[i9].t) * 10) / 10, 0.6);
  const after = o.slice(i9 + 3);
  eq("restore: full re-read follows", after.filter((r) => r.id === 0x08 && r.addr < 0xc0).length >= 20, true);
  const prof = ins(S, (r) => r.id === 0x0e).map((r) => [Math.round(r.t), r.data[0]]);
  eq("restore: active profile 2 before, profile 1 after ClearSetting", [prof[0][1], prof.find((p) => p[0] > 9)[1]], [1, 0]);
  const clears = P.restoreClearPlan(Object.assign(Array(16).fill(false), { 3: true, 4: true, 5: true }), Object.assign(Array(16).fill(false), { 4: true, 5: true }));
  const want = clears.flatMap((c) => chunks(c.addr, c.bytes));
  eq("restore: slot clears byte-identical to the official app", writes(S).map((r) => hex(body(r))), want);
  // flash of profile index 1 before vs after (stage 3 record 0x14)
  const rd = ins(S, (r) => r.id === 0x08 && r.addr === 0x14);
  eq("restore: active profile's stage 3 went 14650 → 1600 DPI", [P.decodeDpi(rd[0].data.slice(0, 4)), P.decodeDpi(rd[rd.length - 1].data.slice(0, 4))], [14650, 1600]);
}

// ── wired.pcapng ──
{
  const S = "wired.pcapng";
  eq("wired: VID 3554 PID F5A5", header[S], { vid: 0x3554, pid: P.PID_WIRED });
  eq("wired: no receiver getters/setters", outs(S, (r) => [0x14, 0x15, 0x16, 0x17, 0x05, 0x06].includes(r.id)).length, 0);
  eq("wired: same 0x07 echo rule", writes(S).every((w) => ins(S, (r) => r.n > w.n && hex(body(r)) === hex(body(w))).length > 0), true);
  eq("wired: colour write = encodeColor", hex(body(writes(S).find((r) => r.addr === 0x2c))), hex(P.writeFrame(0x2c, P.encodeColor(0x26, 0x20, 0xa6))));
  const b = P.parseBattery(ins("wired.pcapng (all 0x03/0x04 polls)", (r) => r.id === 0x04)[0].data);
  eq("wired: battery reports charging over the cable", [b.charging, b.mv, b.rawLevel], [true, 0x1048, 0x5f]);
  const r10 = ins(S, (r) => r.id === 0x08 && r.addr === 0x0a)[0].data;
  eq("wired: stored DPI 12800 / 16550 / 22550 read back", [P.decodeDpi(r10.slice(6, 10)), P.decodeDpi(ins(S, (r) => r.id === 0x08 && r.addr === 0x14)[0].data.slice(0, 4)), P.decodeDpi(ins(S, (r) => r.id === 0x08 && r.addr === 0x14)[0].data.slice(4, 8))], [12800, 16550, 22550]);
  eq("wired: sleep register 0xAD holds 1 (10 s)", (() => { const r = ins(S, (x) => x.id === 0x08 && x.addr === 0xaa)[0].data; return P.dec2(r[3], r[4]); })(), 1);
}

// ── dpi12800.pcapng ──
{
  const S = "dpi12800.pcapng";
  const w = Object.fromEntries(writes(S).map((r) => [r.addr, hex(body(r))]));
  eq("dpi: 12800 on stage 2", w[0x10], hex(P.writeFrame(0x10, P.encodeDpi(12800))));
  eq("dpi: 16550 on stage 3 (DPIex 0x44)", w[0x14], hex(P.writeFrame(0x14, P.encodeDpi(16550))));
  eq("dpi: 22550 on stage 4 (DPIex 0x44)", w[0x18], hex(P.writeFrame(0x18, P.encodeDpi(22550))));
  eq("dpi: stage count 4", w[0x02], hex(P.writeFrame(0x02, P.enc2(4))));
}

// ── macro captures ──
const macroCase = (S, name, mode, delays) => {
  const ev = [
    { kind: "mod", down: true, code: 1, delay: delays[0] },
    { kind: "key", down: true, code: 0x06, delay: delays[1] },
    { kind: "key", down: false, code: 0x06, delay: delays[2] },
    { kind: "mod", down: false, code: 1, delay: delays[3] },
  ];
  const got = writes(S).slice(0, 7).map((r) => hex(body(r)));
  const want = [hex(P.writeFrame(0x70, P.buttonRecord(P.encodeAction({ t: "macro", mode }, 4)))), ...chunks(0x900, P.encodeMacro(name, ev))];
  eq(`${S}: binding then macro chunks byte-identical`, got, want);
  const back = P.decodeMacro(P.encodeMacro(name, ev));
  eq(`${S}: decode Ctrl+C events`, back.events.map((e) => [e.kind, e.down, e.code, e.delay]), ev.map((e) => [e.kind, e.down, e.code, e.delay]));
};
macroCase("Cycle Until Key Pressed macro.pcapng", "ctrlc", "pressed", [0x178, 0x76, 0x34, 0]);
macroCase("Cycle Until This Key Pressed macro.pcapng", "ctrl", "thisKey", [0x13e, 0x75, 0x25, 0]);

// ── pairing.pcapng ──
{
  const S = "pairing.pcapng";
  const o5 = outs(S, (r) => r.id === 0x05);
  eq("pairing: one start frame, byte-identical", o5.map((r) => "08 " + hex(body(r))), ["08 " + hex(P.pairFrame(13))]);
  eq("pairing: receiver echoes the start frame", hex(body(ins(S, (r) => r.id === 0x05)[0])), hex(P.pairFrame(13)));
  eq("pairing: status poll frame", hex(body(outs(S, (r) => r.id === 0x06)[0])), hex(P.simpleFrame(0x06)));
  const st = ins(S, (r) => r.id === 0x06).map((r) => P.parsePairState(r.data));
  eq("pairing: first poll reports success (3), extra byte 0x13", st[0], { state: 3, extra: 0x13 });
  eq("pairing: start ~1 s before the poll", Math.round(outs(S, (r) => r.id === 0x06)[0].t - o5[0].t), 1);
  const online = ins("pairing.pcapng (all 0x03/0x04 polls)", (r) => r.id === 0x03).map((r) => r.data[0]);
  eq("pairing: link drops during pairing and returns after", online.includes(0) && online[online.length - 1] === 1, true);
}

// ── sleepmode-ledidle.pcapng ──
{
  const S = "sleepmode-ledidle.pcapng (all 0x03/0x04 polls)";
  eq("sleep capture: no configuration write at all", writes("sleepmode-ledidle.pcapng").length, 0);
  const on = ins(S, (r) => r.id === 0x03).map((r) => r.data[0]);
  eq("sleep capture: online flag 1,1 → 0,0,0 while idle → 1 after movement", on, [1, 1, 0, 0, 0, 1]);
  eq("sleep capture: battery unanswered while offline", outs(S, (r) => r.id === 0x04).length > ins(S, (r) => r.id === 0x04).length, true);
}

// ── restore-profile3-4.pcapng: all four profiles back to one factory image ──
{
  const S = "restore-profile3-4.pcapng";
  const rows = sections[S];
  const i9 = rows.findIndex((r) => r.dir === "OUT" && r.id === 0x09);
  eq("restore 3-4: ClearSetting, Long distance, LED in official order", rows.filter((r) => r.dir === "OUT" && [9, 0x16, 0x14].includes(r.id)).map((r) => hex(body(r))), [hex(P.simpleFrame(9)), hex(P.longRangeFrame(true)), hex(P.dongleLedFrame(2))]);
  // split 0x00–0xBF reads into images, tagged with the profile selected before them
  const images = [];
  let prof = null, img = null;
  for (const r of rows) {
    if (r.dir === "OUT" && r.id === 0x0f) prof = r.data[0];
    if (r.dir === "IN82" && r.id === 0x0e) prof = r.data[0];
    if (r.dir === "IN82" && r.id === 0x08 && r.addr < 0xc0) {
      if (r.addr === 0) images.push((img = { prof, after: r.n > rows[i9].n, bytes: [] }));
      if (img) r.data.slice(0, r.len).forEach((b, k) => (img.bytes[r.addr + k] = b));
    }
  }
  const before = images.filter((x) => !x.after),
    after = images.filter((x) => x.after);
  const dpis = (x) => [0, 1, 2, 3].map((i) => P.decodeDpi(x.bytes.slice(0x0c + 4 * i, 0x10 + 4 * i)));
  eq("restore 3-4: custom DPIs read back before reset (profiles 2–4)", before.map(dpis), [[400, 6700, 12150, 3200], [400, 4450, 10400, 2200], [1450, 4450, 8050, 13650]]);
  eq("restore 3-4: after reset profiles 1,2,3,4,1 were read", after.map((x) => x.prof === null ? 0 : x.prof).slice(-4), [1, 2, 3, 0]);
  eq("restore 3-4: all post-reset images byte-identical", new Set(after.map((x) => hex(x.bytes))).size, 1);
  eq("restore 3-4: factory DPIs", dpis(after[0]), [400, 800, 1600, 3200]);
}

// ── sleepmode-write-30s.pcapng ──
{
  const S = "sleepmode-write-30s.pcapng";
  const w = writes(S).find((r) => r.addr === 0xad);
  eq("sleep 30 s: write 0xAD = 3 byte-identical", hex(body(w)), hex(P.writeFrame(0xad, P.enc2(3))));
  eq("sleep 30 s: echoed", ins(S, (r) => r.id === 7 && r.addr === 0xad).map((r) => hex(body(r))), [hex(body(w))]);
  eq("sleep 30 s: value 3 is in the official list as 30 s", P.SLEEP_VALUES.indexOf(3), 1);
  const on = ins("sleepmode-write-30s.pcapng (all 0x03/0x04 polls)", (r) => r.id === 0x03).map((r) => [Math.round(r.t), r.data[0]]);
  eq("sleep 30 s: link offline from ~35 s although 30 s was stored", on.filter((x) => x[0] >= 30 && x[0] <= 36).map((x) => x[1]), [1, 0]);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
