// Test-only WebHID simulator for the browser checks (tests/browser-check.cjs).
// It is injected with Playwright's addInitScript and is never loaded by index.html.
// The flash image is the factory profile read in profiles-config.pcapng (#3211…#3301);
// replies follow EVIDENCE_LEDGER §3 (echo for 0x07, data for 0x08, getters for 0x0E/0x12/0x15/0x17).
(() => {
  const unhex = (s) => s.trim().split(/\s+/).map((x) => parseInt(x, 16));
  const chunks = {
    0x00: "01 54 04 51 01 54 00 55 00 55", 0x0a: "01 54 07 07 00 47 0f 0f 00 37", 0x14: "1f 1f 00 17 3f 3f 00 d7 3f 3f",
    0x1e: "00 d7 7f 7f 00 57 7f 7f 00 57", 0x28: "7f 7f 00 57 ff 00 00 56 00 00", 0x32: "ff 56 00 ff 00 56 ff 00 ff 57",
    0x3c: "ff 00 ff 57 ff 00 ff 57 ff 00", 0x46: "ff 57 ff 00 ff 57 02 53 80 d5", 0x50: "03 52 01 54 ff 00 ff 57 00 55",
    0x5a: "80 d5 03 52 00 55 01 01 00 53", 0x64: "01 02 00 52 01 04 00 50 01 08", 0x6e: "00 4c 01 10 00 44 02 01 00 52",
    0x78: "02 02 00 51 02 03 00 50 07 00", 0x82: "00 4e 08 04 00 49 04 0a 03 44", 0x8c: "00 00 00 55 00 00 00 55 00 00",
    0x96: "00 55 00 00 00 55 00 00 00 55", 0xa0: "01 ff 00 ff 07 09 46 00 55 08", 0xaa: "4d 01 54 3c 19 00 55 00 55 00",
    0xb4: "55 00 55 06 4f 00 55 0a 4b ff", 0xbe: "ff ff",
  };
  const factory = new Uint8Array(0x1b00).fill(0xff);
  for (const [a, d] of Object.entries(chunks)) unhex(d).forEach((b, i) => (factory[+a + i] = b));
  const profiles = [0, 1, 2, 3].map(() => factory.slice());
  const st = { profile: 0, longRange: 0, dongle: 1, online: true, mv: 4055, charging: 0, log: [],
    // failure injection: { addr, count } → that many 0x07 writes to addr get no echo (count < 0 = forever)
    drop: null, pairStates: [1, 1, 3], pairAck: true };
  window.__mock = st;
  window.__mockProfiles = profiles;

  const ck = (b) => {
    let s = 0;
    for (let i = 0; i < 15; i++) s += b[i];
    return (0x4d - s) & 0xff;
  };
  const reply = (arr) => {
    const b = new Uint8Array(16);
    b.set(arr.slice(0, 15));
    b[15] = ck(b);
    return b;
  };

  class FakeDevice extends EventTarget {
    constructor() {
      super();
      this.vendorId = 0x3554;
      this.productId = 0xf523;
      this.productName = "Fantech StrikeSpeed Pro (mock)";
      this.opened = false;
      this.collections = [{ usagePage: 0xff00, usage: 1, outputReports: [{ reportId: 8 }], inputReports: [{ reportId: 8 }], featureReports: [] }];
    }
    async open() {
      this.opened = true;
    }
    async close() {
      this.opened = false;
    }
    _emit(body, delay = 3) {
      setTimeout(() => {
        const ev = new Event("inputreport");
        ev.device = this;
        ev.reportId = 8;
        ev.data = new DataView(body.buffer);
        this.dispatchEvent(ev);
      }, delay);
    }
    async sendReport(id, data) {
      const b = Uint8Array.from(data);
      st.log.push(Array.from(b));
      if (id !== 8 || ck(b) !== b[15]) return;
      const mem = profiles[st.profile];
      const addr = (b[2] << 8) | b[3],
        len = b[4];
      switch (b[0]) {
        case 0x03:
          return this._emit(reply([3, 0, 0, 0, 1, st.online ? 1 : 0, 0xe6, 0xd3, 0xf3]));
        case 0x04:
          if (!st.online) return; // asleep mouse: receiver leaves 0x04 unanswered (sleepmode-ledidle.pcapng)
          return this._emit(reply([4, 0, 0, 0, 2, 90, st.charging, st.mv >> 8, st.mv & 255]));
        case 0x07:
          if (st.drop && st.drop.addr === addr && st.drop.count !== 0) {
            if (st.drop.count > 0) st.drop.count--;
            return; // receiver silent: transport must retry / fail
          }
          for (let i = 0; i < len; i++) mem[addr + i] = b[5 + i];
          return this._emit(b.slice());
        case 0x09: // ClearSetting: settings back to factory; slots keep their bytes (as the official follow-up writes imply)
          for (let i = 0; i < 0xc0; i++) mem[i] = factory[i];
          return this._emit(b.slice(), 600);
        case 0x05:
          st.pairing = st.pairStates.slice();
          return st.pairAck ? this._emit(b.slice()) : undefined;
        case 0x06:
          return this._emit(reply([6, 0, 0, 0, 1, (st.pairing && st.pairing.length ? st.pairing.shift() : 1)]));
        case 0x08:
          return this._emit(reply([8, 0, b[2], b[3], len, ...mem.slice(addr, addr + len)]));
        case 0x0e:
          return this._emit(reply([0x0e, 0, 0, 0, 1, st.profile]));
        case 0x0f:
          st.profile = b[5] & 3;
          this._emit(b.slice());
          return this._emit(reply([0x0a, 0, 0, 0, 0x0a, 0x04]), 8);
        case 0x12:
          return this._emit(reply([0x12, 0, 0, 0, 2, 0x02, 0x19]));
        case 0x14:
          st.dongle = b[5];
          return this._emit(b.slice());
        case 0x15:
          return this._emit(reply([0x15, 0, 0, 0, 0x0a, st.dongle]));
        case 0x16:
          st.longRange = b[5];
          return this._emit(b.slice());
        case 0x17:
          return this._emit(reply([0x17, 0, 0, 0, 0x0a, st.longRange]));
        default:
          return;
      }
    }
  }
  const dev = new FakeDevice();
  window.__mockDevice = dev;
  const hid = new EventTarget();
  hid.getDevices = async () => (window.__mockGranted ? [dev] : []);
  hid.requestDevice = async () => {
    window.__mockGranted = true;
    return [dev];
  };
  Object.defineProperty(navigator, "hid", { value: hid, configurable: true });
})();
