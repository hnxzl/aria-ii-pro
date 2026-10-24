# Aria II Pro live HID observation

## Artifact

- Source: `C:\Users\Goolagoon\Downloads\aria-ii-pro-hid-observation (1).json`
- SHA-256: `EB55DEC09D18ED3B6F1A705FD8F3A0387C518E7EB28921809BA56C40EA450B42`; length 153,248 bytes.
- Device reported by WebHID: product name `Fantech StrikeSpeed Pro`, VID `0x3554`, PID `0xF523`.
- The JSON has 500 retained reports, sequences 423–922, spanning 2026-10-23 10:26:41.007Z to 10:31:33.749Z. It is a bounded capture, not the complete 922-report stream.
- 496 events are report ID `0x08` with 16 data bytes; 4 are report ID `0x05` with 2 bytes (`E2 00` or `00 00`).
- The matching installed `Device1_log.txt` uses Jakarta local timestamps (UTC+7). Key events align to the WebHID timestamps within 0–83 ms, with several frame/data pairs matching exactly.

## Confirmed / strongly supported frame evidence

**Observed flash-read frame, likely response/echo (`opcode 0x08`):**

At local 17:31:13.564 the WebHID report is:

```text
08 00 00 4C 08 02 53 FF 56 05 50 00 55 00 00 9D
```

The installed app log at local 17:31:12.077 records `ReadFlashData (0x4C) Len(8)` with data `02 53 FF 56 05 50 00 55`. The eight bytes occur at frame offsets 5–12. This confirms the flash-read address and length placement for this observed frame: byte 0 is `08`, bytes 1–3 encode address `0x00004C`, byte 4 is length `08`, and the next eight bytes are the returned flash data. Direction is not established by this WebHID `inputreport` alone; this can be an input echo/response record.

**Observed flash-write frame (`opcode 0x07`):**

At local 17:31:27.552 both the app log and WebHID event record a write of `01 54` at address `0x00`:

```text
07 00 00 00 02 01 54 00 00 00 00 00 00 00 00 EF
```

The application log says `WriteFlashData (0x00) Len(2)` and data `01 54`. This strongly supports byte 0 as operation `07`, bytes 1–3 as the 24-bit address (big-endian in observed examples), byte 4 as declared data length, and bytes from byte 5 as payload. This report was observed in the input-report stream, so an outbound command versus device echo is not established by this artifact alone.

The last byte is not yet decoded as a general checksum. In simple settings writes whose payload bytes sum to `0x55`, it varies with address and length; macro writes contain nontrivial padding/data and do not fit the same simple relationship. Do not generate frames from a guessed checksum formula.

**Other operation families correlated to the application log:**

- `02 ... 01` at local 17:31:11.282 follows `PCDriverStatus` value `01` in the log at 17:31:11.199. At shutdown, a `02 ... 00` frame at 17:31:33.749 follows `PCDriverStatus` value `00` at 17:31:33.748. `0x02` is strongly supported as the PC-driver status operation.
- `12 00 00 00 02 02 19 ...` carries the same two bytes as the log's `ReadVersionID` result `02 19`; `0x12` is strongly supported as the version reply family.
- `0E 00 00 00 01 00 ...`, `17 00 00 00 0A 00 ...`, and `15 00 00 00 0A 01 ...` carry the values logged for `GetCurrentConfig`, `GetLongRangeMode`, and `Get4KDongleRGBValue`, respectively. These opcode-to-operation mappings are strongly supported by matching values in the same startup exchange.
- Frames beginning `04 00 00 00 02 5F 00 0F F0 ...` are a battery/status candidate. The high-level log records `BatteryLevel` bytes `5E 00 0F F0`; the middle/final bytes agree but the first differs by one. Do not yet use this frame to display an interpreted percentage or state.
- Repeated `03 00 00 00 01 01 E6 D3 F3 ...` frames, the three `reportId=0x05` pairs, and opcode families `01`, `14`, `16`, `E2` remain unidentified.

## Evidence of stored feature data (address meaning still needs correlation)

The observed `0x07` frames write several locations. Examples include:

- `0x000C`, length 4: pairs such as `20 20 00 15`, `2C 2C 00 FD`, and `3F 3F 00 D7`.
- `0x0002`, length 2; `0x0004`, length 2; and `0x0000`, length 2.
- `0x00AB`, `0x00AF`, `0x00B1`, and `0x00B5`, length 2, with payloads such as `00 55` and `01 54`.
- `0x0060`–`0x0074`, generally length 4.
- `0x0900` onward, length-10 chunks holding macro name/action data (e.g. `eben`, later `klik`).

The application has UI controls for DPI, stage count, active stage, polling, sensor toggles, buttons, macros, and profiles. The frame addresses above are observed, but assigning every address and byte to a UI setting still requires the corresponding control action and managed/native call-path evidence. In particular, the `0x000C` payload values are not yet converted into user-visible DPI values.

There is one unresolved correlation: at 17:31:23.317 the app log records `WriteFlashData (0x80)` with `00 55`; four milliseconds later the WebHID input stream contains `07 00 00 B1 02 00 55 ... 3E`. Similar `0x80` log entries precede frames addressed to `0xAF` and `0xAB`. The timestamp and payload match, but the logged argument `0x80` differs from the frame's observed address. Keep the transformation unresolved pending native function analysis or a targeted trace.

## Implementation implications

1. Keep the WebHID page read-only until report direction and response semantics are verified.
2. Add a display-only decoder for the evidenced header fields, retaining the raw bytes beside every interpretation.
3. Use a marked, one-control-at-a-time capture to map UI settings to flash fields and to determine battery/version reply parsing.
4. Do not reuse `ariaxd7` packet code. This capture and the installed Aria II Pro app are the evidence sources for this device.

## Static analysis update: installed application and managed DPI path

Verified target identity from `C:\Program Files (x86)\Fantech Aria II Pro\Mouse Drive Beta.exe`:

- File size: 5,352,960 bytes; SHA-256 `F59265CD11E6C816627007B8151A038E8851AEF559E96BD9D98DCBECBA3E5832`.
- File version and product version: `1.0.0.4`; PE x86; complete CLI metadata targets .NET Framework CLR v4 (`v4.0.30319`); module MVID `1855a552-fdfc-498c-acd4-083fe61b9845`.
- REA `inspect_managed_members` successfully returned decoded CIL instruction anchors and method bodies. No application code was loaded or executed for that analysis.
- Installed directory has `Config.ini`, `Description.xml`, `driver_sensor.h`, UI image trees, and no ordinary `HIDUsb32.dll` file. A previously extracted DLL copy is at `%LOCALAPPDATA%\Temp\fantech-hidusb32.dll` (114,688 bytes), SHA-256 `09BB39AC086DDBA379FCB9CAF4BAE88AFB3033117075AF9C8FBBA4A6EE6720FC`.
- `Config.ini` declares VID `0x3554`, mouse PID `0xF523`, receiver PID `0xF5A5`, `Interfaceid=1`, `Deviceid=5`, sensor `3395` (Base64 value `MzM5NQ==`), DPI range `50,26000,50`, eight `DPIGrade` entries, `DefaultDPI=2`, `DPIMaxGrade=4`, `KeyDebounceTime=8`, 16 `KeyParam` mappings, and the `BatteryParam` thresholds. This is configuration evidence, not proof that every INI field maps directly to device memory.
- `Description.xml` identifies copyright 2024 Fantech Gaming World. File version and INI Version (`1.0.0.43`) are different version fields; neither should be conflated.

### Managed CIL evidence for custom DPI

- `Mouse_Drive_Beta.ComboControlLibrary.DPIControl.customTrackBar1_ValueChanged`, token `0x060007B3`, method-body file offset `0x3EC2C` (257,068), IL size 204: clamps/updates the value then calls `SetValue` (token `0x060007BA`).
- `DPIControl.UpdateDPI`, token `0x060007BB`, file offset 258,101, IL size 38: calls `ValueToDPI` (`0x060007BC`), then `SetValue`, and enables the update timer.
- `DPIControl.ValueToDPI`, token `0x060007BC`, file offset 258,140 (`0x3F05C`), IL size 532: reads `gFlashDataMap.dpiConfig[SelectIndex].DPIex`; uses `Sensor.DPIex`, `Sensor.Type`, and sensor `Min`, `Max`, `Step`, `DPIList`, and `DPIValueList`; branches on sensor type strings `3395` and `3950`; and writes the computed byte fields to `DPIConfig[SelectIndex].xDPI`, `.yDPI`, and `.DPIex` (field tokens `0x040000E4`, `0x040000E5`, `0x040000E6`). It then calls `UpdateValue`. Thus active-stage selection is distinct from setting that stage's actual DPI value.
- Decoded arithmetic in the method: initial raw code is based on the requested value divided by a sensor-selected unit (50 or 100); sensor `DPIex==0x33` chooses additional step scales from sensor range lists; `Discord` sensors map through `DPIList` to `DPIValueList`; for types `3395`/`3950`, high code bits are folded into `DPIex` using shifts by 2 and 6. Exact runtime results still need comparison to the matching device's values before WebHID writes are enabled.
- `DPIControl.UpdateCurrentDPI`, token `0x060007AE`, file offset 254,884, IL size 261, copies the selected grade into `deviceParam.currentDPI`, and finishes by calling `FormMain.UpdateDllFlashMap` (`0x0600040F`).
- `FormMain.UpdateFlashData`, token `0x06000410`, file offset 89,108, IL size 92, invokes `customKeyFunction1.UpdateFlash(gFlashDataMap)`, `dpiControl1.UpdateFlash(gFlashDataMap)`, then selects either `_3In1.UpdateFlash` or `_2In1.UpdateFlash` based on `deviceParam.XIn1`.
- `FormMain.UpdateDllFlashMap`, token `0x0600040F`, file offset 89,094, IL size 11, passes the address of static `gFlashDataMap` to `DriverLib.DataParser.SetDllProtocolData` (`0x060000A2`). `DataParser.SetDllProtocolData` chooses x86 `DataParser32.CS_SetDllProtocolData` (`0x060000B3`) or x64 variant based on `isX64System`. This proves UI value -> managed flash-map mutation -> native-library boundary, but the exact native transaction scheduler is not yet decompiled.
- `UsbServer.ReadAllFlashData`, token `0x0600016E`, body offset 20,379, calls architecture-specific `CS_UsbServer_ReadAllFlashData`; `FormMain.USBReadAllFlashData` (`0x06000409`, offset 86,284) calls that method. The app log records a 6,912-byte read beginning at address 0. The log and the WebHID observation are runtime records from the installed official program.

### Native library evidence

- The extracted DLL is a native PE32 i386 image (`Machine=0x014C`, optional header `0x010B`) with sections `.text`, `.rdata`, `.data`, `.rsrc`, `.reloc`; 207 named exports.
- The export names include `CS_UsbFinder_FindHidDevices` (RVA `0x89A0`), `CS_UsbFinder_GetBatteryLevel` (`0xAB00`), `CS_UsbServer_ReadFalshData` (`0xCA70`), `CS_UsbServer_ReadAllFlashData` (`0xCBD0`), `CS_UsbServer_ReadBatteryLevel` (`0xCDC0`), `CS_UsbServer_SetCurrentConfig` (`0xD540`), `CS_ProtocolDataParser` (`0x6AF0`), `CS_ProtocolDataUpdate` (`0x6D00`), `CS_SetDllProtocolData` (`0x6D20`), `UsbServer_WriteCommand` (`0xC9E0`), and `UsbReaderWriterServer` (`0xE320`). Those names and addresses are export-table facts, not recovered function bodies.
- Import table has 11 descriptors. Relevant imports: `HID.DLL` (`HidD_SetFeature`, `HidD_GetAttributes`, `HidD_GetHidGuid`), `SETUPAPI.dll` device enumeration, and `KERNEL32.dll` `CreateFileW`, `ReadFile`, `WriteFile`, `CancelIo`, `CreateEventW`, `WaitForSingleObject`, `CreateThread`, `Sleep`. This establishes that the native library contains HID discovery/transport alongside higher-level protocol entry points; it is not only a passive transport shim.
- Ghidra 12.2 headless successfully opened and analyzed the extracted DLL into `analysis/ghidra/AriaIIPro-HIDUsb32.gpr`. Custom Java script export failed with Ghidra 12.2 `JavaScriptProvider` error `Failed to get OSGi bundle containing script`; Python script execution reports `Ghidra was not started with PyGhidra`, and this system has no installed Python 3 runtime. REA's Ghidra provider also reports `GHIDRA_INSTALL_DIR` absent in its service environment; Hopper is unsupported on Windows and IDA/Kuna are not configured. Ghidra GUI exists but an automated UI session is unavailable here. Consequently no native pseudocode or call graph is claimed yet. The original DLL was not modified.

### Checksum evidence and browser test

A validation script checked all 496 retained 16-byte input reports (report ID `0x08`) in the supplied JSON. For every record, the sum of all 16 bytes modulo 256 is exactly `0x4D` (zero non-matches), including examples for flash read (`0x08`), flash write (`0x07`), status (`0x02`), version (`0x12`), dongle RGB (`0x15`), and long-range (`0x17`). This strongly supports a final-byte checksum of `0x4D - sum(bytes[0..14])` modulo 256 for these observed 16-byte frames. It does not alone prove an input frame and an output frame have identical semantics.

The browser page now exposes a read-only test: if the device descriptor provides either a 16-byte output or feature report ID `0x08`, it can send one read request (default address `0x00004C`, length 8) on the selected channel and watches for a same-address/length input frame. The requested frame is built from observed opcode/address/length layout and the checksum invariant; zero-padded read-request payload is a runtime hypothesis. It does not expose raw writes or any settings writes. A matching incoming frame is labeled as observed echo/response, not asserted to be a device reply.

## Remaining genuine unknowns / exact runtime tests

1. Confirm whether output report ID `0x08` with opcode `0x08`, address `0x00004C`, length 8, zero payload, and computed checksum yields a device response or is rejected; compare received bytes to app log `ReadFlashData (0x4C) Len(8)` data `02 53 FF 56 05 50 00 55`.
2. Native decompile/call-graph inspection is still needed at exports `CS_ProtocolDataUpdate` (`0x6D00`), `CS_SetDllProtocolData` (`0x6D20`), `UsbServer_WriteCommand` (`0xC9E0`), `UsbServer_ReadFalshData` (`0xCA70`), `UsbServer_ReadAllFlashData` (`0xCBD0`), and `CS_UsbServer_ReadBatteryLevel` (`0xCDC0`) to prove output report ID, payload chunking, native checksum generation, queue/response direction, and the `0x80` log-address translation.
3. Custom DPI runtime check: set one known grade (record its UI value first), compare the in-memory stage bytes in official `Device1_log.txt` / WebHID reports, confirm which four-byte flash slot corresponds to `0x0C + 4*grade`, and verify read-back after applying. The captured startup dump shows the first bytes at `0x0C` and `0x10`, but slot/profile semantics still need a direct one-grade correlation.
4. Map the other flash bytes in the existing 6,912-byte baseline against one-at-a-time official UI changes: button mapping, polling, debounce, Angle Snap (`linearCorrectionEnable`), Ripple Control, Motion Sync, sleep/power saving, LOD/calibration, LED settings, and profile selection. Managed type fields and UI handler names are not by themselves sufficient for payload semantics.
5. Battery parser: correlate `BatteryHandle`/native battery exports to exact response bytes and `BatteryParam` voltage thresholds; the captured first battery byte differs by one from the app log, so no percentage is decoded.
6. Macro serialization: macro slot frames at `0x0900+` are observed in the capture, and managed `MacroKeyDriver.GetMacroKeyData` / `FileManager.MacroFile` types exist, but action IDs, timing/end sentinels, capacity, and profile-to-slot mapping remain unverified.

## Additional managed boundary findings

- `DriverLib.DataParser.Update` (`0x0600009F`, method file offset 12,756; IL 57 bytes) computes `Marshal.SizeOf(FlashDataMap)`, allocates unmanaged memory, copies the complete struct with `StructureToPtr`, calls `CS_ProtocolDataUpdate(IntPtr)` (`0x060000B0` in the x86 branch; `0x06000095` in the x64 branch), then frees the buffer. `ProtocolParser` performs the inverse: native `CS_ProtocolDataParser(byte[], IntPtr)` then `PtrToStructure` back into `FlashDataMap`.
- `FormMain.UpdateFlashDataMap_ValueChange` (`0x06000411`) and online-gated `FlashDataMap_ValueChange` (`0x06000412`) replace the global map and call `UpdataUSBData` (`0x0600040E`). `UpdataUSBData` calls `DataParser.Update(gFlashDataMap)` and then `FormMain.UpdateFlashData`. This is the concrete managed-to-native full-config update chain; actual native per-field write scheduling still requires native body analysis.
- `FlashDataMap` contains `mouseConfig`, `dpiConfig[]`, `dpiLed`, `ledBar`, `keys[]`, `shortCutKey[]`, and `macroKey[]` (fields `0x04000101`–`0x04000107`). `MouseConfig` managed fields include `reportRate`, `maxDPI`, `currentDPI`, `keyDebounceTime`, `motionSyncEnable`, `linearCorrectionEnable`, `rippleControlEnable`, `moveOffLedEnable`, `sensorCustomSleepTimeEnable`, `sensorSleepTime`, and `sensorPowerSavingModeEnable` (field tokens `0x040000D5`–`0x040000E3`). These names confirm the data model fields exist; individual byte encodings and memory offsets still require correlation.
- Profile export `FormMain.customButton_Export_Click` (`0x06000445`) calls `ExportConfigFile(sensor, gFlashDataMap)`. Import (`0x06000443`) requires an online device, calls `ImportConfigFile(sensor, out bytes)`, converts via `ByteToFlashDataMap`, and starts an import timer. Exact on-disk header and map offset are documented in `observation-2-export-bin.md`.
- `DataParser.GetDeviceBatteryStatus` marshals a native `BatteryStatus` structure out of a byte buffer. `UsbServer.ReadBatteryLevel` delegates to `CS_UsbServer_ReadBatteryLevel`. This proves the app has a native status parser and read operation, but not the meaning of each returned byte or the voltage-to-percent calculation.
- Macro UI save `FormMain.customButton_Save_Click` updates `MacroKeyAndCycleList`, then invokes `customKeyFunction1.UpdateMacro(languageFile, selectedIndex)` and `SaveLocalMacroKey`. This action saves the local macro model; it is not itself evidence of a mouse write. The on-device macro data is part of `FlashDataMap.macroKey[]`, with capture records observed at `0x0900+`.

### Clarified browser read test

The HID library imports both `WriteFile` and `HidD_SetFeature`; device descriptors may expose either an output report or a feature report. The browser test enables separate **Baca via Output** and **Baca via Feature** buttons only when the selected device advertises a 16-byte report ID `0x08` in that channel. User captures (3) and (4) confirm an output-channel report `0x08`, address `0x00004C`, length 8 was followed by a same-address/length input frame 2–3 ms later. The received data is recorded with the request. Feature-channel behavior remains untested.

### Managed map layout from marshaling metadata

Using `Marshal.SizeOf(Type)` and `Marshal.OffsetOf(Type, field)` on the installed assembly types (without invoking application methods) confirms `DriverLib.FlashDataMap` is 10,428 bytes, matching the user's profile export's map region. For the x86 installed build:

| FlashDataMap field | Offset | Element layout |
|---|---:|---|
| `mouseConfig` | 0 | `MouseConfig`, 15 bytes |
| `dpiConfig` | 15 | 8 × `DPIConfig`, 6 bytes each |
| `dpiLed` | 63 | 4 bytes |
| `ledBar` | 67 | 7 bytes |
| `keys` | 74 | 16 × `KeyFunMap`, 3 bytes each |
| `shortCutKey` | 124 | 16 × `ShortCutKey`, 52 bytes each (alignment gap at 122–123) |
| `macroKey` | 956 | 16 × `MacroKey`, 592 bytes each |

`MouseConfig` fields are single bytes in declaration order: `reportRate`, `maxDPI`, `currentDPI`, `xSpindown`, `ySpindown`, `silenceHeight`, `keyDebounceTime`, `motionSyncEnable`, `allLedOffTime`, `linearCorrectionEnable`, `rippleControlEnable`, `moveOffLedEnable`, `sensorCustomSleepTimeEnable`, `sensorSleepTime`, `sensorPowerSavingModeEnable`. `DPIConfig` is `xDPI`, `yDPI`, `DPIex`, and three color bytes. `KeyFunMap` is `type`, `param1`, `param2`. `MacroKey` has 30 name bytes, context count, and 70 eight-byte contexts. These are profile/map serialization offsets, not proven physical flash addresses or direct WebHID packet offsets.

### Custom DPI write evidence from application log and HID capture

- The local official-app log `C:\Users\Goolagoon\AppData\Local\FANTECH\Fantech Aria II Pro\Device1_log.txt` (SHA-256 `C3AA85E1F6F01030D16EAF75E4B955B95A294C121103A1A9F30E45383CBCE283`) covers the user's observation (2) interval. Its `WriteFlashData` records can be matched by payload, length, and near-identical timestamps to all 63 retained input report `0x07` frames in that JSON. This links the HID frames to the official application's writes rather than only naming them by opcode.
- **Confirmed wire frame for observed small writes:** report `0x08`, 16 bytes: `[0]=0x07`, `[1..3]=24-bit big-endian address`, `[4]=length`, `[5..]=payload`, zero padding, `[15]` chosen so sum of all 16 bytes is `0x4D mod 256`. Example sequence 588 at `10:55:02.188Z`: `07 00 00 0C 04 20 20 00 15 00 00 00 00 00 00 E1` matches official log `17:55:02.187 WriteFlashData (0x0C) Len(4): 20 20 00 15`.
- **Confirmed DPI record for the observed sensor/profile:** address `0x00000C`, length 4, payload `xDPI, yDPI, DPIex, innerCheck`. For the 1650-DPI example, `xDPI=yDPI=0x20`, `DPIex=0`, and inner check `0x15`; `0x20+0x20+0x00+0x15 = 0x55`. The outer frame checksum is separate (`0xE1`). Sequence 590 similarly has `21 21 00 13`, and sequence 616 has `1F 1F 00 17`.
- **Confirmed stage address pattern from the official full-flash read dump:** the first eight four-byte DPI records are at `0x0C, 0x10, 0x14, 0x18, 0x1C, 0x20, 0x24, 0x28`. The first records include `1F 1F 00 17` (1600 DPI), `07 07 00 47` (400 DPI), `1F 1F 00 17`, `1F 1F 00 17`, `3F 3F 00 D7` (3200 DPI), and `7F 7F 00 57` (6400 DPI). This aligns the per-stage `DPIConfig` map fields with the physical logical read/write records for the observed 3395 profile.
- The managed method `DPIControl.ValueToDPI` (token `0x060007BC`, CIL file offset `0x3F05C`, size 532) calculates and writes `xDPI`, `yDPI`, and `DPIex` from the requested DPI, using a sensor-selected scale and high-code bits. The WebHID UI now reads a stage first, decodes its existing scale/mode, and only permits values exactly representable with that mode; its write requires explicit confirmation and records the matching input frame. **Requires runtime verification:** the browser's `sendReport` path for this write, and read-after-write persistence on the user's mouse. No other write feature is enabled.
- Observation (5) now provides that runtime verification for stage index 2 (Stage 3), address `0x14`: read `1F 1F 00 17` (1600 DPI), write `07 07 00 47` (400 DPI), then read back `07 07 00 47` twice. A restore write to the original 1600-DPI bytes also received a matching frame, though the capture did not include a final readback. The WebHID output write and persistence are therefore **confirmed on the user's device for custom DPI stage value**. Other write features remain unverified.

### Ghidra execution status

Ghidra 12.2 headless successfully imported/analyzed the extracted `HIDUsb32.dll` into a separate `analysis/ghidra/AriaIIPro-HIDUsb32-verified` project. Scripted pseudocode export is still blocked: the Java script compiler cannot resolve install JARs outside the writable workspace (`AccessDeniedException` on Ghidra's `Base.jar`), and the REA native provider reports its `GHIDRA_INSTALL_DIR` unset and expects a supported 12.1.x install. The native pseudocode has therefore not been used to claim packet construction details.
