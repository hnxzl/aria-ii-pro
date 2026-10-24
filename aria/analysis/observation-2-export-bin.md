# Aria II Pro: supplied export and latest HID observation

Audited 2026-10-23 from the user's supplied files; originals remain in Downloads.

## `export.bin`

- Original: `C:\Users\Goolagoon\Downloads\export.bin`, 10,492 bytes, SHA-256 `4D26FD22F1916FFA2C4C1EB74C561ED914D536C49E8D1CC0C8174B7917BE8868`.
- **Confirmed from implementation:** it matches the official app's `.bin` profile export format, not a raw USB capture. `Mouse Drive Beta.exe`, `FileManager.ConfigFile.ExportConfigFile` (token `0x0600003C`, CIL dump `ExportConfigFile.il.txt`) gets `FlashDataMapToByte(map)`, allocates map length + 64, places the UTF-8 manufacturer at offset 0, UTF-8 sensor at offset 32, and map bytes from offset 64; writes the complete buffer. `FlashDataMapToByte` (token `0x06000040`, `FlashDataMapToByte.il.txt`) derives the map byte count from `Marshal.SizeOf(typeof(FlashDataMap))`, marshals the struct using `StructureToPtr`, then copies those bytes out.
- **Confirmed from implementation:** `ImportConfigFile` (token `0x0600003D`, `ImportConfigFile.il.txt`) checks manufacturer bytes at 0 and sensor bytes at 32, returns error codes 1/2 on those header mismatches, then copies bytes `[64..EOF)` to the output map buffer. `ByteToFlashDataMap` (token `0x06000041`, `ByteToFlashDataMap.il.txt`) marshals that buffer to `DriverLib.FlashDataMap` using `Marshal.SizeOf`, `Copy`, and `PtrToStructure`.
- Observed header: offset 0 is `Compx Inc`; offset 32 is `3395`; offset 64 begins the serialized map. File length `10,492 = 64 + 10,428`; therefore this export carries a 10,428-byte map. The exact field-by-field map layout is governed by the managed struct and native `CS_SetDllProtocolData`; the file alone does not imply any USB packet layout.

## `aria-ii-pro-hid-observation (2).json`

- Original: `C:\Users\Goolagoon\Downloads\aria-ii-pro-hid-observation (2).json`, 155,886 bytes, SHA-256 `6D7F64BB356005AFFE2905D77045EFE8485728BDB25CDD30E762EAC9D21F0E78`.
- Metadata reports VID `0x3554`, PID `0xF523`, 500 retained reports, sequence 274–773, all report ID `0x08`, 16 bytes; all 500 satisfy the previously observed byte-sum invariant (`sum(bytes[0..15]) mod 256 = 0x4D`).
- The recorded test request is sequence 1 at `2026-10-23T10:52:13.063Z`: `ReadFlashData`, output channel, address `0x00004C`, length 8, report ID `0x08`, bytes `08 00 00 4C 08 00 00 00 00 00 00 00 00 00 00 F1`.
- **Requires runtime verification:** that exact request predates the retained report window, which begins at sequence 274 (`10:53:53.574Z`). The bounded JSON therefore does not preserve the immediate response to the user's test; do not count later same-address reads as its response.
- Four retained address `0x00004C` / length `0x08` frames are sequences 277, 356, 435, 532. First three carry payload `02 53 80 D5 03 52 01 54`; sequence 532 carries `02 53 FF 56 05 50 00 55`. They are evidence that this area is read during the captured interval and that its data changed, but without a correlated request/event they do not establish what changed it or the payload meaning.
- Other observed first-byte counts: `08:230`, `07:63`, `03:128`, `04:37`, `12:12`, plus smaller counts for `0E`, `17`, `15`, `0F`, `0A`, `16`, `14`, `02`, `01`. These are raw opcode counts only; no uncorrelated meaning is assigned here.

## Next reverse-engineering question

The request/response transport is confirmed, but returned-byte meanings and configuration writes are not. To resolve a particular feature, correlate one deliberate official-app setting change with the adjacent write/read frames and the before/after exported `.bin` profiles. The smallest useful next capture is a single changed setting (for example one DPI stage value), with the initial and resulting `.bin` files, plus reports around that action. Do not send guessed write payloads from the web page.

## Follow-up observation (3)

This follow-up resolves the immediate-response question above:

- `C:\Users\Goolagoon\Downloads\aria-ii-pro-hid-observation (3).json`, 1,117 bytes, SHA-256 `1B3B0B8B188683DD3E8EA711F5C742EA4956E003968F604055EC3CFF1135755F`.
- One request at `2026-10-23T11:03:11.606Z`: output `ReadFlashData`, report ID `0x08`, address `0x00004C`, length 8, payload frame `08 00 00 4C 08 00 00 00 00 00 00 00 00 00 00 F1`.
- One input report arrived at `2026-10-23T11:03:11.608Z` (2 ms later): report ID `0x08`, frame `08 00 00 4C 08 02 53 10 45 05 50 00 55 00 00 9D`. It has the same opcode/address/length and carries eight data bytes `02 53 10 45 05 50 00 55`; its own byte sum is also `0x4D` modulo 256.
- **Confirmed from controlled observation:** the output-channel read request at this address/length elicited a matching input report on the user's device. This is a request/response pair, not just the stale-window ambiguity from observation (2). This still does not prove the semantics of the returned eight bytes or the Feature channel behavior.
- The app now associates a matching input response with its originating request in JSON exports, records response sequence/data/timing, and labels it as an observed response. The Feature path remains visibly unverified. No configuration write has been enabled.

## Follow-up observation (4)

- `C:\Users\Goolagoon\Downloads\aria-ii-pro-hid-observation (4).json`, 1,415 bytes, SHA-256 `10D816313B9D98D77621E1C871D12DC4D8C91A05A1DD6A1C5EF9ED5B94552520`.
- This is a second independent repeat of the same controlled Output read. Request `0x00004C` / 8 bytes at `11:06:20.302Z` is followed at `11:06:20.305Z` by report `08 00 00 4C 08 02 53 10 45 05 50 00 55 00 00 9D`; captured payload is again `02 53 10 45 05 50 00 55`. It contains one report and no writes.
- **Confirmed from controlled observations (3) and (4):** the read response is repeatable on this device. Observation (4) adds a repeatability sample but no new configuration, battery, or feature-channel semantics.

## Correlation of observation (2) with the installed app log

The installed `Device1_log.txt` is a direct, local artifact and spans the same Jakarta time interval as observation (2). Of 74 official log `WriteFlashData` entries, all 63 retained `0x07` input frames in observation (2) matched a log entry by payload and length, at the same or near-identical timestamp. This is strong correlation to official app writes; report direction is still an observed input frame, not direct capture of the outbound OS write call.

One exact sample: report sequence 588 at `10:55:02.188Z` is `07 00 00 0C 04 20 20 00 15 00 00 00 00 00 00 E1`; the official log at Jakarta time `17:55:02.187` says `WriteFlashData (0x0C) Len(4): 20 20 00 15`. The first four payload bytes sum to `0x55`; all 16 report bytes sum to `0x4D mod 256`. That sample represents the DPI record write described in `aria-ii-pro-hid-observation.md`.

## Observation (5): WebHID DPI write and readback on device

- `C:\Users\Goolagoon\Downloads\aria-ii-pro-hid-observation (5).json`, 8,628 bytes, SHA-256 `A5742CB1E7F6112D6855977DE2EACD33B5816C64FBF6C798BF33CAF1546EF438`.
- Stage index 2 (Stage 3), address `0x14`, was read as `1F 1F 00 17` (1600 DPI). WebHID wrote `07 07 00 47` (400 DPI), received a matching input frame, then read back `07 07 00 47` twice. This verifies the stage write persisted on the user's device.
- It then wrote the original `1F 1F 00 17` back and received a matching input frame, but did not capture a readback after that restore. So the 400-DPI change is readback-verified; the final restore is frame-observed only.
- **Confirmed on device:** custom DPI write through the WebHID output channel, corresponding input frame, and persisted readback work for Stage 3. This verifies one feature and its address/data/checksums, not other settings.
