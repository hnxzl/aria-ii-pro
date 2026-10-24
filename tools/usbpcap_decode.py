#!/usr/bin/env python3
"""Decode Aria II Pro vendor traffic from a USBPcap .pcapng (no tshark needed).

usage: python3 tools/usbpcap_decode.py FILE.pcapng [--all] [--raw]

Prints, per USB device address, the device descriptor (VID/PID) when the capture
contains it, then every 17-byte vendor frame (report ID 0x08):
  OUT  = host → device (SET_REPORT on EP0 or interrupt OUT)
  INxx = device → host on interrupt IN endpoint xx
Frame layout (EVIDENCE_LEDGER §2.2): [0]=0x08 [1]=id [2]=status [3..4]=addr BE
[5]=len [6..15]=data [16]=chk, Σ17 bytes ≡ 0x55. In WebHID the report ID is
stripped, so the browser body is bytes 1..16 and sums to 0x4D.
Polling frames id 0x03/0x04 are summarised unless --all is given.
Other interrupt-IN reports (mouse/keyboard/consumer/0x0B macro playback) are
printed as RAW only with --raw.
"""
import struct, sys
from collections import Counter, defaultdict


def blocks(buf):
    off = 0
    endian = "<"
    while off + 12 <= len(buf):
        btype, blen = struct.unpack_from(endian + "II", buf, off)
        if btype == 0x0A0D0D0A:  # SHB: determine endianness
            bom = struct.unpack_from("<I", buf, off + 8)[0]
            endian = "<" if bom == 0x1A2B3C4D else ">"
            btype, blen = struct.unpack_from(endian + "II", buf, off)
        if blen < 12:
            break
        yield btype, buf[off + 8 : off + blen - 4], endian
        off += blen


def packets(path):
    buf = open(path, "rb").read()
    tsres = {}
    ifaces = []
    for btype, body, e in blocks(buf):
        if btype == 1:  # IDB
            link = struct.unpack_from(e + "H", body, 0)[0]
            ifaces.append(link)
        elif btype == 6:  # EPB
            iid, th, tl, cap, orig = struct.unpack_from(e + "IIIII", body, 0)
            yield ifaces[iid] if iid < len(ifaces) else None, ((th << 32) | tl) / 1e6, body[20 : 20 + cap]
        elif btype == 3:  # SPB
            orig = struct.unpack_from(e + "I", body, 0)[0]
            yield ifaces[0] if ifaces else None, 0.0, body[4 : 4 + orig]


def usbpcap(pkt):
    """Return dict with USBPcap pseudo-header fields and payload."""
    hlen = struct.unpack_from("<H", pkt, 0)[0]
    irp, status, func, info, bus, dev, ep, xfer, dlen = struct.unpack_from("<QIHBHHBBI", pkt, 2)
    r = dict(hlen=hlen, irp=irp, status=status, func=func, info=info, bus=bus, dev=dev, ep=ep, xfer=xfer, data=pkt[hlen : hlen + dlen])
    if xfer == 2 and hlen >= 28:
        r["stage"] = pkt[27]
    return r


def chk_ok(f):
    return len(f) >= 17 and (sum(f[:17]) & 0xFF) == 0x55


def fmt(f):
    return "id=%02X st=%02X addr=%04X len=%02X data=%s ck=%s" % (
        f[1], f[2], (f[3] << 8) | f[4], f[5], " ".join("%02x" % x for x in f[6:16]), "ok" if chk_ok(f) else "BAD")


def main():
    path = sys.argv[1]
    show_all = "--all" in sys.argv
    show_raw = "--raw" in sys.argv
    t0 = None
    polls = Counter()
    descr = {}
    pending_setup = {}
    rows = []
    for n, (link, ts, pkt) in enumerate(packets(path), 1):
        if link != 249 or len(pkt) < 27:
            continue
        u = usbpcap(pkt)
        if t0 is None:
            t0 = ts
        t = ts - t0
        d = u["data"]
        key = (u["bus"], u["dev"])
        if u["xfer"] == 2:  # control
            info_in = u["info"] & 1
            if u.get("stage") == 0 and len(d) >= 8:  # SETUP
                bm, breq, wval, widx, wlen = struct.unpack_from("<BBHHH", d, 0)
                pending_setup[(key, u["irp"])] = (bm, breq, wval, widx)
                if bm == 0x21 and breq == 0x09 and len(d) > 8:  # SET_REPORT with data in the same URB
                    rows.append((n, t, key, "OUT", bytes(d[8:]), "SET_REPORT if=%d" % widx))
                continue
            if info_in and d:
                s = pending_setup.get((key, u["irp"]))
                if s and s[1] == 6 and (s[2] >> 8) == 1 and len(d) >= 18:  # device descriptor
                    vid, pid = struct.unpack_from("<HH", d, 8)
                    descr[key] = (vid, pid)
                if s and s[1] == 6 and (s[2] >> 8) == 2 and len(d) > 9:  # configuration descriptor
                    descr.setdefault(("cfg",) + key, bytes(d))
            elif d and not info_in:  # control OUT data stage
                s = pending_setup.get((key, u["irp"]))
                if s and s[0] == 0x21 and s[1] == 0x09:
                    rows.append((n, t, key, "OUT", bytes(d), "SET_REPORT if=%d" % s[3]))
            continue
        if u["xfer"] == 1 and d:  # interrupt
            direction = "IN%02X" % u["ep"] if u["ep"] & 0x80 else "OUT%02X" % u["ep"]
            if (u["info"] & 1) == 0 and (u["ep"] & 0x80):
                continue  # IN request without data
            rows.append((n, t, key, direction, bytes(d), ""))

    for k, v in descr.items():
        if k[0] == "cfg":
            cfg = v
            # walk interface + endpoint descriptors
            i = 0
            out = []
            while i + 2 <= len(cfg):
                ln, ty = cfg[i], cfg[i + 1]
                if ln == 0:
                    break
                if ty == 4:
                    out.append("if%d class=%02x sub=%02x proto=%02x" % (cfg[i + 2], cfg[i + 5], cfg[i + 6], cfg[i + 7]))
                if ty == 5:
                    out.append("  ep %02x attr=%02x maxpkt=%d interval=%d" % (cfg[i + 2], cfg[i + 3], cfg[i + 4] | cfg[i + 5] << 8, cfg[i + 6]))
                i += ln
            print("# config descriptor bus %d dev %d: %s" % (k[1], k[2], " | ".join(out)))
        else:
            print("# device bus %d dev %d: VID %04X PID %04X" % (k[0], k[1], v[0], v[1]))

    for n, t, key, direction, d, note in rows:
        dev = "d%d" % key[1]
        if len(d) >= 17 and d[0] == 0x08:
            f = d[:17]
            if f[1] in (0x03, 0x04) and not show_all:
                polls[(dev, direction[:2], f[1])] += 1
                continue
            print("%7d %9.3f %-4s %-6s %s %s" % (n, t, dev, direction, fmt(f), note))
        elif show_raw:
            print("%7d %9.3f %-4s %-6s RAW %s" % (n, t, dev, direction, d.hex()))
    if polls:
        print("# polls summarised: " + ", ".join("%s %s id=%02X ×%d" % (k[0], k[1], k[2], c) for k, c in sorted(polls.items())))


if __name__ == "__main__":
    main()
