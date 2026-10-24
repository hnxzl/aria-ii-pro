/* Aria II Pro WebHID configurator.
 * Reads are verified on the user's device; one observed custom-DPI write is available for controlled testing.
 * The old XD7 packet format is deliberately not imported or transmitted.
 */
(() => {
  'use strict';

  const KNOWN_VENDOR_ID = 0x3554;
  const MAX_REPORTS = 500;
  const state = { device: null, reports: [], requests: [], pendingRead: null, pendingWrite: null, dpiStages: {}, sequence: 0, requestSequence: 0 };
  const $ = (id) => document.getElementById(id);
  const connectButton = $('connectButton');
  const disconnectButton = $('disconnectButton');
  const interfaceList = $('interfaceList');

  function setStatus(connected, title, detail) {
    $('statusDot').classList.toggle('online', connected);
    $('deviceState').classList.toggle('online', connected);
    $('deviceState').textContent = connected ? 'TERHUBUNG' : 'OFFLINE';
    $('connectionTitle').textContent = title;
    $('connectionDetail').textContent = detail;
    $('deviceName').textContent = connected ? (state.device.productName || 'HID Fantech') : 'Belum terhubung';
    $('vendorId').textContent = connected ? `0x${state.device.vendorId.toString(16).padStart(4, '0').toUpperCase()}` : '—';
    $('productId').textContent = connected ? `0x${state.device.productId.toString(16).padStart(4, '0').toUpperCase()}` : '—';
    connectButton.disabled = connected || !('hid' in navigator);
    disconnectButton.disabled = !connected;
    syncReadButton();
    syncDpiControls();
  }

  function hasFlashChannel(kind, device = state.device) {
    if (!device) return false;
    const property = kind === 'feature' ? 'featureReports' : 'outputReports';
    return device.collections.some((collection) => (collection[property] || []).some((report) => {
      const bits = (report.items || []).reduce((sum, item) => sum + ((item.reportSize || 0) * (item.reportCount || 0)), 0);
      return report.reportId === 0x08 && Math.ceil(bits / 8) >= 16;
    }));
  }

  function syncReadButton() {
    const busy = Boolean(state.pendingRead || state.pendingWrite);
    $('readOutputButton').disabled = !state.device || !hasFlashChannel('output') || busy;
    $('readFeatureButton').disabled = !state.device || !hasFlashChannel('feature') || busy;
    document.querySelectorAll('.observed-write').forEach((button) => {
      const modeUnavailable = button.dataset.setting === 'powerMode' && Number($('rateSetting').value) >= 16;
      button.disabled = !state.device || !hasFlashChannel('output') || busy || modeUnavailable;
    });
    for (const id of ['profileButton', 'writeColorButton', 'longRangeButton', 'dongleLedButton']) {
      $(id).disabled = !state.device || !hasFlashChannel('output') || busy;
    }
    if (!state.device) $('readStatus').textContent = 'Hubungkan perangkat untuk mengaktifkan permintaan baca.';
    else if (!hasFlashChannel('output') && !hasFlashChannel('feature')) $('readStatus').textContent = 'Browser tidak menemukan output atau feature report ID 0x08 sepanjang 16 byte. Halaman tidak mengirim perintah.';
    syncDpiControls();
  }

  function dpiStageAddress(stage) {
    return 0x0c + (stage * 4);
  }

  function decodeDpi(bytes) {
    if (bytes.length !== 4 || bytes[0] !== bytes[1]) return null;
    const rawDpiEx = bytes[2];
    const mode = rawDpiEx & 0x33;
    const scale = mode === 0 ? 50 : mode === 0x33 ? 200 : (mode === 0x11 || mode === 0x22) ? 100 : 0;
    const high = (rawDpiEx >>> 2) & 0x03;
    if (!scale || ((rawDpiEx >>> 6) & 0x03) !== high) return null;
    const code = (high * 0x100) + bytes[0];
    const expectedCheck = (0x55 - bytes[0] - bytes[1] - rawDpiEx) & 0xff;
    if (bytes[3] !== expectedCheck) return null;
    return { value: (code + 1) * scale, scale, mode, raw: [...bytes] };
  }

  function syncDpiControls() {
    const stage = Number($('dpiStage').value);
    const saved = state.dpiStages[stage];
    const busy = Boolean(state.pendingRead || state.pendingWrite);
    $('readDpiButton').disabled = !state.device || !hasFlashChannel('output') || busy;
    $('writeDpiButton').disabled = !state.device || !hasFlashChannel('output') || busy || !saved || saved.needsReadback || !decodeDpi(saved.raw);
    if (saved && saved.needsReadback) $('dpiStatus').textContent = 'Baca ulang stage ini untuk memastikan nilai yang tersimpan sebelum menulis lagi.';
  }

  function reportDescriptors(device) {
    const result = [];
    for (const [collectionIndex, collection] of device.collections.entries()) {
      const reportTypes = [
        ['Input', collection.inputReports || []],
        ['Output', collection.outputReports || []],
        ['Feature', collection.featureReports || []],
      ];
      for (const [kind, reports] of reportTypes) {
        for (const report of reports) {
          const bits = (report.items || []).reduce((sum, item) => sum + ((item.reportSize || 0) * (item.reportCount || 0)), 0);
          result.push({
            collectionIndex,
            usagePage: collection.usagePage,
            usage: collection.usage,
            kind,
            reportId: report.reportId,
            bytes: bits ? Math.ceil(bits / 8) : null,
          });
        }
      }
    }
    return result;
  }

  function renderInterfaces() {
    const device = state.device;
    if (!device) {
      interfaceList.className = 'empty-state';
      interfaceList.innerHTML = '<span class="empty-symbol">⌘</span><strong>Belum ada data interface</strong><p>Hubungkan mouse untuk melihat koleksi HID, report ID, dan ukurannya.</p>';
      return;
    }
    const descriptors = reportDescriptors(device);
    interfaceList.className = 'interface-list';
    if (!descriptors.length) {
      interfaceList.innerHTML = '<div class="interface-card"><strong>Browser tidak melaporkan deskriptor report untuk koleksi ini.</strong></div>';
      return;
    }
    interfaceList.innerHTML = descriptors.map((item) => {
      const id = item.reportId == null ? 'tanpa ID' : `ID 0x${item.reportId.toString(16).padStart(2, '0').toUpperCase()}`;
      const size = item.bytes == null ? 'ukuran tidak dilaporkan' : `${item.bytes} byte`;
      return `<div class="interface-card"><div class="interface-title"><strong>${item.kind} · Koleksi ${item.collectionIndex + 1}</strong><code>${id}</code></div><div class="interface-sub">usagePage 0x${item.usagePage.toString(16).padStart(4, '0')} · usage 0x${item.usage.toString(16).padStart(2, '0')} · ${size}</div></div>`;
    }).join('');
  }

  function bytesToHex(data) {
    return Array.from(new Uint8Array(data), (byte) => byte.toString(16).padStart(2, '0')).join(' ').toUpperCase();
  }

  function describeFrame(record) {
    if (record.reportId !== 0x08 || record.data.length !== 16) return 'Belum dikenali';
    const bytes = record.data;
    const opcode = bytes[0];
    const labels = {
      0x02: 'PCDriverStatus · cocok dengan log',
      0x0e: 'GetCurrentConfig · cocok dengan log',
      0x12: 'ReadVersionID · cocok dengan log',
      0x15: 'Dongle RGB · cocok dengan log',
      0x17: 'Long-range · cocok dengan log',
      0x04: 'Battery/status · kandidat',
      0x07: 'WriteFlashData · frame teramati',
      0x08: 'ReadFlashData · data cocok dengan log',
    };
    const label = labels[opcode] || `Opcode 0x${opcode.toString(16).padStart(2, '0').toUpperCase()}`;
    if (opcode === 0x07 || opcode === 0x08) {
      const address = (bytes[1] * 0x10000) + (bytes[2] * 0x100) + bytes[3];
      return `${label} · ${address.toString(16).padStart(6, '0').toUpperCase()} · ${bytes[4]} byte`;
    }
    return label;
  }

  function onInputReport(event) {
    if (event.device !== state.device) return;
    const record = {
      sequence: ++state.sequence,
      time: new Date().toISOString(),
      reportId: event.reportId,
      data: Array.from(new Uint8Array(event.data.buffer.slice(event.data.byteOffset, event.data.byteOffset + event.data.byteLength))),
    };
    state.reports.unshift(record);
    if (state.reports.length > MAX_REPORTS) state.reports.length = MAX_REPORTS;
    const bytes = record.data;
    const pending = state.pendingRead;
    if (pending && record.reportId === 0x08 && bytes.length === 16 && bytes[0] === 0x08) {
      const address = (bytes[1] * 0x10000) + (bytes[2] * 0x100) + bytes[3];
      if (address === pending.address && bytes[4] === pending.length) {
        clearTimeout(pending.timer);
        const returned = bytes.slice(5, 5 + pending.length);
        const responseTime = new Date();
        if (pending.request) {
          pending.request.status = 'response-observed';
          pending.request.responseTime = responseTime.toISOString();
          pending.request.responseSequence = record.sequence;
          pending.request.responseReportId = record.reportId;
          pending.request.responseData = returned;
          pending.request.responseDelayMs = Math.max(0, responseTime.getTime() - new Date(pending.request.time).getTime());
        }
        if (Number.isInteger(pending.dpiStage)) {
          const decoded = decodeDpi(returned);
          if (decoded) {
            state.dpiStages[pending.dpiStage] = { raw: decoded.raw, value: decoded.value, scale: decoded.scale, needsReadback: false };
            $('dpiCurrent').value = `${decoded.value} DPI`;
            $('dpiValue').value = String(decoded.value);
            $('dpiValue').step = String(decoded.scale);
            $('dpiStatus').textContent = `Stage ${pending.dpiStage + 1} terbaca: ${decoded.value} DPI, resolusi langkah ${decoded.scale} DPI. Data ${bytesToHex(returned)}.`;
            syncDpiControls();
          } else {
            $('dpiCurrent').value = 'Format stage belum dikenali';
            $('dpiStatus').textContent = `Balasan stage ${pending.dpiStage + 1} tidak lolos pemeriksaan data/checksum: ${bytesToHex(returned)}.`;
            delete state.dpiStages[pending.dpiStage];
            syncDpiControls();
          }
        }
        if (pending.verifyWrite) {
          const matches = returned.length === pending.verifyWrite.payload.length && returned.every((value, index) => value === pending.verifyWrite.payload[index]);
          const original = pending.verifyWrite.request;
          original.readbackStatus = matches ? 'readback-match' : 'readback-mismatch';
          original.readbackData = returned;
          const statusTarget = pending.verifyWrite.stage == null ? $('observedWriteStatus') : $('dpiStatus');
          statusTarget.textContent = matches
            ? `Readback flash cocok untuk ${pending.verifyWrite.label || `stage ${pending.verifyWrite.stage + 1}`}: ${bytesToHex(returned)}. Nilai tersimpan terverifikasi.`
            : `Readback flash berbeda untuk ${pending.verifyWrite.label || `stage ${pending.verifyWrite.stage + 1}`}: terbaca ${bytesToHex(returned)}, dikirim ${bytesToHex(pending.verifyWrite.payload)}.`;
        }
        $('readStatus').textContent = `Balasan baca teramati (${responseTime.toLocaleTimeString('id-ID')}); data ${bytesToHex(returned)}.`;
        state.pendingRead = null;
        syncReadButton();
      }
    }
    const write = state.pendingWrite;
    if (write && record.reportId === 0x08 && bytes.length === 16 && bytes[0] === 0x07) {
      const address = (bytes[1] * 0x10000) + (bytes[2] * 0x100) + bytes[3];
      if (address === write.address && bytes[4] === write.length && bytes.slice(5, 5 + write.length).every((value, index) => value === write.payload[index])) {
        clearTimeout(write.timer);
        write.request.status = 'matching-input-frame-observed';
        write.request.responseTime = record.time;
        write.request.responseSequence = record.sequence;
        write.request.responseReportId = record.reportId;
        write.request.responseData = bytes.slice(5, 5 + write.length);
        write.request.responseDelayMs = Math.max(0, new Date(record.time).getTime() - new Date(write.request.time).getTime());
        state.pendingWrite = null;
        const saved = Number.isInteger(write.stage) ? state.dpiStages[write.stage] : null;
        if (saved) saved.needsReadback = true;
        const statusTarget = write.stage == null ? $('observedWriteStatus') : $('dpiStatus');
        statusTarget.textContent = `Balasan cocok teramati untuk ${write.label || `stage ${write.stage + 1}`} (alamat 0x${address.toString(16).padStart(6, '0').toUpperCase()}); ini mengonfirmasi frame, bukan readback nilai tersimpan.`;
        syncDpiControls();
        syncReadButton();
        $('readAddress').value = address.toString(16).padStart(6, '0').toUpperCase();
        $('readLength').value = String(write.length);
        if (write.stage != null) {
          $('dpiCurrent').value = 'Memverifikasi readback…';
          readFlash('output', { dpiStage: write.stage, verifyWrite: write });
        } else {
          statusTarget.textContent = `Frame cocok; membaca balik ${write.label} dari flash…`;
          readFlash('output', { verifyWrite: write });
        }
      }
    }
    renderReports();
  }

  async function readFlash(channel, options = {}) {
    if (!state.device || !hasFlashChannel(channel)) return;
    const rawAddress = $('readAddress').value.trim();
    const length = Number($('readLength').value);
    if (!/^[0-9a-fA-F]{1,6}$/.test(rawAddress) || !Number.isInteger(length) || length < 1 || length > 10) {
      $('readStatus').textContent = 'Masukkan alamat 1–6 digit hex dan panjang 1–10 byte.';
      return;
    }
    const address = Number.parseInt(rawAddress, 16);
    const frame = new Uint8Array(16);
    frame[0] = 0x08;
    frame[1] = (address >>> 16) & 0xff;
    frame[2] = (address >>> 8) & 0xff;
    frame[3] = address & 0xff;
    frame[4] = length;
    let sum = 0;
    for (let i = 0; i < 15; i++) sum += frame[i];
    frame[15] = (0x4d - sum) & 0xff;
    const request = { sequence: ++state.requestSequence, time: new Date().toISOString(), operation: 'ReadFlashData', channel, address, length, reportId: 0x08, data: Array.from(frame), status: 'sent-awaiting-response' };
    state.requests.push(request);
    if (state.requests.length > MAX_REPORTS) state.requests.shift();
    const pending = { address, length, request, dpiStage: options.dpiStage, verifyWrite: options.verifyWrite, timer: null };
    state.pendingRead = pending;
    syncReadButton();
    $('readStatus').textContent = `Meminta baca 0x${address.toString(16).padStart(6, '0').toUpperCase()} (${length} byte)…`;
    try {
      if (channel === 'feature') await state.device.sendFeatureReport(0x08, frame);
      else await state.device.sendReport(0x08, frame);
      if (state.pendingRead === pending) {
        request.status = 'sent-awaiting-response';
        $('readStatus').textContent = `Permintaan baca dikirim ke 0x${address.toString(16).padStart(6, '0').toUpperCase()} (${length} byte). Menunggu frame yang cocok.`;
        pending.timer = setTimeout(() => {
          if (state.pendingRead !== pending) return;
          state.pendingRead = null;
          request.status = 'response-timeout';
          $('readStatus').textContent = 'Belum ada balasan yang cocok. Periksa alamat lalu coba baca lagi.';
          if (pending.verifyWrite) {
            pending.verifyWrite.request.readbackStatus = 'readback-timeout';
            const target = pending.verifyWrite.stage == null ? $('observedWriteStatus') : $('dpiStatus');
            target.textContent = 'Frame tulis cocok, tetapi readback flash timeout; nilai tersimpan belum terverifikasi.';
          }
          syncReadButton();
          syncDpiControls();
        }, 2000);
      }
    } catch (error) {
      clearTimeout(pending.timer);
      request.status = 'send-error';
      request.error = `${error.name || 'Error'}: ${error.message || `Browser gagal mengirim ${channel} report 0x08.`}`;
      if (pending.verifyWrite) {
        pending.verifyWrite.request.readbackStatus = 'readback-error';
        const target = pending.verifyWrite.stage == null ? $('observedWriteStatus') : $('dpiStatus');
        target.textContent = `Frame tulis cocok, tetapi readback gagal: ${request.error}`;
      }
      if (state.pendingRead && state.pendingRead.request === request) state.pendingRead = null;
      syncReadButton();
      $('readStatus').textContent = `${error.name || 'Error'}: ${error.message || `Browser gagal mengirim ${channel} report 0x08.`}`;
    }
  }

  function readDpiStage() {
    const stage = Number($('dpiStage').value);
    const address = dpiStageAddress(stage);
    $('readAddress').value = address.toString(16).padStart(6, '0').toUpperCase();
    $('readLength').value = '4';
    $('dpiCurrent').value = 'Membaca…';
    readFlash('output', { dpiStage: stage });
  }

  async function writeDpiStage() {
    if (!state.device || !hasFlashChannel('output') || state.pendingRead || state.pendingWrite) return;
    const stage = Number($('dpiStage').value);
    const saved = state.dpiStages[stage];
    const current = saved && decodeDpi(saved.raw);
    const value = Number($('dpiValue').value);
    if (!current) {
      $('dpiStatus').textContent = 'Baca stage ini lebih dulu. Penulisan memerlukan nilai dan encoding awal dari perangkat.';
      return;
    }
    if (!Number.isInteger(value) || value < 50 || value > 26000 || value % current.scale !== 0) {
      $('dpiStatus').textContent = `Nilai DPI harus bilangan bulat 50–26000 dan kelipatan ${current.scale} untuk encoding stage ini.`;
      return;
    }
    const code = (value / current.scale) - 1;
    const high = Math.floor(code / 0x100);
    if (code < 0 || high > 3) {
      $('dpiStatus').textContent = 'Nilai tidak dapat direpresentasikan oleh encoding stage ini.';
      return;
    }
    const x = code & 0xff;
    const dpiEx = current.mode | (high << 2) | (high << 6);
    const payload = [x, x, dpiEx, (0x55 - x - x - dpiEx) & 0xff];
    const address = dpiStageAddress(stage);
    const shown = `${value} DPI`;
    if (!window.confirm(`Tulis ${shown} ke stage ${stage + 1}? Nilai yang terbaca sebelumnya adalah ${current.value} DPI.`)) return;
    const frame = new Uint8Array(16);
    frame[0] = 0x07;
    frame[1] = (address >>> 16) & 0xff;
    frame[2] = (address >>> 8) & 0xff;
    frame[3] = address & 0xff;
    frame[4] = payload.length;
    frame.set(payload, 5);
    let sum = 0;
    for (let i = 0; i < 15; i++) sum += frame[i];
    frame[15] = (0x4d - sum) & 0xff;
    const request = { sequence: ++state.requestSequence, time: new Date().toISOString(), operation: 'WriteFlashData', channel: 'output', address, length: payload.length, reportId: 0x08, data: Array.from(frame), payload, stage, requestedDpi: value, status: 'sent-awaiting-matching-input' };
    state.requests.push(request);
    if (state.requests.length > MAX_REPORTS) state.requests.shift();
    const pending = { stage, address, length: payload.length, payload, request, timer: null };
    state.pendingWrite = pending;
    saved.needsReadback = true;
    syncDpiControls();
    syncReadButton();
    $('dpiStatus').textContent = `Mengirim stage ${stage + 1}: ${shown} (report 0x07, alamat 0x${address.toString(16).toUpperCase()}).`;
    try {
      await state.device.sendReport(0x08, frame);
      pending.timer = setTimeout(() => {
        if (state.pendingWrite !== pending) return;
        state.pendingWrite = null;
        request.status = 'no-matching-input-frame';
        $('dpiStatus').textContent = 'Permintaan tulis terkirim, tetapi belum terlihat frame input yang cocok. Baca ulang stage sebelum menyimpulkan hasilnya.';
        syncDpiControls();
        syncReadButton();
      }, 1500);
    } catch (error) {
      state.pendingWrite = null;
      request.status = 'send-error';
      request.error = `${error.name || 'Error'}: ${error.message || 'Browser gagal mengirim output report 0x08.'}`;
      if (saved) saved.needsReadback = false;
      $('dpiStatus').textContent = request.error;
      syncDpiControls();
      syncReadButton();
    }
  }

  const observedSettings = {
    rate: { label: 'polling rate', address: 0x00, value: () => Number($('rateSetting').value) },
    powerMode: { label: 'mode selector', address: 0xb9, value: () => Number($('powerModeSetting').value) },
    stageCount: { label: 'jumlah DPI stage', address: 0x02, value: () => Number($('stageCountSetting').value) },
    activeStage: { label: 'DPI stage aktif', address: 0x04, value: () => Number($('activeStageSetting').value) },
    lod: { label: 'LOD', address: 0x0a, value: () => Number($('lodSetting').value) },
    peak: { label: 'Peak Performance', address: 0xb5, value: () => Number($('peakSetting').value) },
    peakDuration: { label: 'durasi Peak Performance', address: 0xb7, value: () => Number($('peakDurationSetting').value) },
    ripple: { label: 'Ripple Control', address: 0xb1, value: () => Number($('rippleSetting').value) },
    angle: { label: 'Angle Snapping', address: 0xaf, value: () => Number($('angleSetting').value) },
    motion: { label: 'Motion Sync', address: 0xab, value: () => Number($('motionSetting').value) },
    dpiEffect: { label: 'mode efek DPI', address: 0x4c, value: () => Number($('dpiEffectSetting').value) },
    dpiLedEnable: { label: 'DPI light enable', address: 0x52, value: () => Number($('dpiLedEnableSetting').value) },
    brightness: { label: 'brightness efek DPI', address: 0x4e, value: () => dpiBrightnessToByte(Number($('brightnessSetting').value)) },
    effectSpeed: { label: 'speed efek DPI', address: 0x50, value: () => Number($('effectSpeedSetting').value) },
    sleep: { label: 'waktu lampu mati saat diam', address: 0xad, value: () => Number($('sleepSetting').value) },
  };

  function dpiBrightnessToByte(index) {
    return [16, 30, 60, 90, 128, 150, 180, 210, 230, 255][index - 1];
  }

  function buildWriteFlashFrame(address, payload) {
    const frame = new Uint8Array(16);
    frame[0] = 0x07;
    frame[1] = (address >>> 16) & 0xff;
    frame[2] = (address >>> 8) & 0xff;
    frame[3] = address & 0xff;
    frame[4] = payload.length;
    frame.set(payload, 5);
    let sum = 0;
    for (let i = 0; i < 15; i++) sum += frame[i];
    frame[15] = (0x4d - sum) & 0xff;
    return frame;
  }

  async function writeFlashPayload(label, address, payload, requestedValue, confirm = true) {
    const status = $('observedWriteStatus');
    if (!state.device || !hasFlashChannel('output') || state.pendingRead || state.pendingWrite) {
      status.textContent = 'Hubungkan mouse dan pastikan kanal output report 0x08 tersedia.';
      return;
    }
    if (!payload.length || payload.length > 10 || payload.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) {
      status.textContent = 'Payload harus berisi 1–10 byte yang valid.';
      return;
    }
    if (confirm && !window.confirm(`Tulis ${label} ke alamat 0x${address.toString(16).padStart(6, '0').toUpperCase()}? Nilai data: ${bytesToHex(payload)}.`)) return;
    const frame = buildWriteFlashFrame(address, payload);
    const request = { sequence: ++state.requestSequence, time: new Date().toISOString(), operation: 'WriteFlashData', channel: 'output', address, length: payload.length, reportId: 0x08, data: Array.from(frame), payload, label, requestedValue, status: 'sent-awaiting-matching-input' };
    state.requests.push(request);
    if (state.requests.length > MAX_REPORTS) state.requests.shift();
    const pending = { address, length: payload.length, payload, request, label, timer: null };
    state.pendingWrite = pending;
    syncReadButton();
    status.textContent = `Mengirim ${label} ke 0x${address.toString(16).padStart(6, '0').toUpperCase()}…`;
    try {
      await state.device.sendReport(0x08, frame);
      pending.timer = setTimeout(() => {
        if (state.pendingWrite !== pending) return;
        state.pendingWrite = null;
        request.status = 'no-matching-input-frame';
        status.textContent = `Tidak tertangkap balasan cocok untuk ${label}. Periksa perangkat sebelum mengirim ulang.`;
        syncReadButton();
      }, 1500);
    } catch (error) {
      state.pendingWrite = null;
      request.status = 'send-error';
      request.error = `${error.name || 'Error'}: ${error.message || 'Gagal mengirim output report.'}`;
      status.textContent = request.error;
      syncReadButton();
    }
  }

  async function writeObservedSetting(name) {
    const setting = observedSettings[name];
    const status = $('observedWriteStatus');
    if (!setting || !state.device || !hasFlashChannel('output') || state.pendingRead || state.pendingWrite) {
      status.textContent = 'Hubungkan mouse dan pastikan kanal output report 0x08 tersedia.';
      return;
    }
    if (name === 'brightness' && (!Number.isInteger(Number($('brightnessSetting').value)) || Number($('brightnessSetting').value) < 1 || Number($('brightnessSetting').value) > 10)) {
      status.textContent = 'Brightness DPI harus bernilai 1 sampai 10.';
      return;
    }
    const value = setting.value();
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      status.textContent = 'Nilai harus berupa satu byte (0–255).';
      return;
    }
    const payload = [value, (0x55 - value) & 0xff];
    await writeFlashPayload(setting.label, setting.address, payload, name === 'brightness' ? Number($('brightnessSetting').value) : value);
  }

  function rgbChecksum(r, g, b) { return (0x55 - ((r + g + b) & 0xff)) & 0xff; }

  async function writeDpiColor() {
    const stage = Number($('colorStage').value);
    const rgb = $('dpiColor').value.match(/[0-9a-f]{2}/gi).map((part) => Number.parseInt(part, 16));
    const payload = [...rgb, rgbChecksum(...rgb)];
    const address = 0x2c + (stage * 4);
    await writeFlashPayload(`warna RGB DPI stage ${stage + 1}`, address, payload, { stage: stage + 1, rgb });
  }

  function vendorCommandFrame(opcode, mode, profile = false) {
    const frame = new Uint8Array(16);
    frame[0] = opcode;
    if (profile) {
      frame[4] = 1;
      frame[5] = mode;
    } else {
      frame[3] = 0x0a;
      frame[4] = mode;
    }
    let sum = 0;
    for (let i = 0; i < 15; i++) sum += frame[i];
    frame[15] = (0x4d - sum) & 0xff;
    return frame;
  }

  async function sendVendorCommand(operation, opcode, mode, label, profile = false) {
    const status = $('commandStatus');
    if (!state.device || !hasFlashChannel('output') || state.pendingRead || state.pendingWrite) {
      status.textContent = 'Hubungkan mouse dan pastikan kanal output report 0x08 tersedia.';
      return;
    }
    const extra = operation === 'SetLongRangeMode' && mode === 1 ? ' Long-distance increases power use.' : '';
    if (!window.confirm(`Kirim perintah ${label}?${extra} Perintah ini tidak memiliki readback flash otomatis.`)) return;
    const frame = vendorCommandFrame(opcode, mode, profile);
    const request = { sequence: ++state.requestSequence, time: new Date().toISOString(), operation, channel: 'output', reportId: 0x08, data: Array.from(frame), requestedValue: mode, label, status: 'sent-no-readback' };
    state.requests.push(request);
    if (state.requests.length > MAX_REPORTS) state.requests.shift();
    status.textContent = `Mengirim ${label} (opcode 0x${opcode.toString(16).padStart(2, '0').toUpperCase()})…`;
    try {
      await state.device.sendReport(0x08, frame);
      status.textContent = `${label} terkirim. Periksa profil aktif atau indikator perangkat; balasan/persistensi belum dikonfirmasi browser.`;
    } catch (error) {
      request.status = 'send-error';
      request.error = `${error.name || 'Error'}: ${error.message || 'Gagal mengirim perintah.'}`;
      status.textContent = request.error;
    }
  }

  function switchProfile() {
    const profile = Number($('profileSetting').value);
    sendVendorCommand('SetCurrentConfig', 0x0f, profile, `Profile ${profile + 1}`, true);
  }

  function setLongRange() {
    const enabled = Number($('longRangeSetting').value);
    sendVendorCommand('SetLongRangeMode', 0x16, enabled, `long-distance ${enabled ? 'On' : 'Off'}`);
  }

  function setDongleLed() {
    const mode = Number($('dongleLedSetting').value);
    const names = { 1: 'low battery warning only', 2: 'connection state and polling rate', 3: 'battery state' };
    sendVendorCommand('Set4KDongleRGB', 0x14, mode, `LED receiver: ${names[mode]}`);
  }

  function renderReports() {
    $('reportCount').textContent = String(state.sequence);
    $('downloadButton').disabled = state.reports.length === 0;
    $('reportHint').textContent = state.reports.length ? `${state.reports.length} laporan terakhir disimpan di halaman ini.` : 'Belum menerima laporan input.';
    const tbody = $('reportRows');
    if (!state.reports.length) {
      tbody.innerHTML = '<tr class="placeholder-row"><td colspan="5">Laporan HID akan muncul di sini setelah perangkat mengirim data.</td></tr>';
      return;
    }
    tbody.innerHTML = state.reports.map((item) => {
      const time = new Date(item.time).toLocaleTimeString('id-ID', { hour12: false });
      const id = `0x${item.reportId.toString(16).padStart(2, '0').toUpperCase()}`;
      return `<tr><td>${time}</td><td class="report-id">${id}</td><td>${item.data.length} byte</td><td class="frame-note">${describeFrame(item)}</td><td class="report-data">${bytesToHex(item.data)}</td></tr>`;
    }).join('');
  }

  async function connect() {
    if (!navigator.hid) return;
    connectButton.disabled = true;
    try {
      const device = await navigator.hid.requestDevice({ filters: [{ vendorId: KNOWN_VENDOR_ID }] });
      if (!device.length) {
        connectButton.disabled = false;
        return;
      }
      state.device = device[0];
      state.dpiStages = {};
      await state.device.open();
      state.device.addEventListener('inputreport', onInputReport);
      state.device.addEventListener('disconnect', onDisconnect);
      document.querySelector('.live-indicator')?.classList.add('on');
      $('compatNote').textContent = hasFlashChannel('output') ? 'Mouse tersambung. Baca flash dan uji tulis DPI satu stage tersedia.' : 'Mouse tersambung untuk pemantauan input; kanal output yang diperlukan belum tersedia.';
      $('reportHint').textContent = 'Menunggu laporan input dari perangkat.';
      setStatus(true, 'Mouse berhasil terhubung', 'Interface HID terbuka untuk pembacaan laporan masuk.');
      renderInterfaces();
    } catch (error) {
      connectButton.disabled = false;
      const cancelled = error && error.name === 'NotFoundError';
      setStatus(false, cancelled ? 'Pemilihan perangkat dibatalkan' : 'Koneksi tidak berhasil', cancelled ? 'Pilih mouse untuk mencoba lagi.' : `${error.name || 'Error'}: ${error.message || 'Gagal membuka perangkat HID.'}`);
    }
  }

  function onDisconnect(event) {
    if (state.device && event.device !== state.device) return;
    state.device = null;
    if (state.pendingRead) clearTimeout(state.pendingRead.timer);
    state.pendingRead = null;
    if (state.pendingWrite) clearTimeout(state.pendingWrite.timer);
    state.pendingWrite = null;
    state.dpiStages = {};
    document.querySelector('.live-indicator')?.classList.remove('on');
    setStatus(false, 'Mouse terputus', 'Hubungkan kembali mouse untuk melanjutkan pembacaan.');
    renderInterfaces();
  }

  async function disconnect() {
    if (!state.device) return;
    const old = state.device;
    old.removeEventListener('inputreport', onInputReport);
    old.removeEventListener('disconnect', onDisconnect);
    state.device = null;
    if (state.pendingRead) clearTimeout(state.pendingRead.timer);
    state.pendingRead = null;
    if (state.pendingWrite) clearTimeout(state.pendingWrite.timer);
    state.pendingWrite = null;
    state.dpiStages = {};
    try { if (old.opened) await old.close(); } catch (_) { /* device may already be detached */ }
    document.querySelector('.live-indicator')?.classList.remove('on');
    setStatus(false, 'Koneksi diputus', 'Mouse telah ditutup dengan aman.');
    renderInterfaces();
  }

  function exportReports() {
    const contents = JSON.stringify({
      schema: 'aria-ii-pro-webhid-observation-v1',
      application: 'Fantech Aria II Pro WebHID Lab',
      capturedAt: new Date().toISOString(),
      device: state.device ? { productName: state.device.productName, vendorId: state.device.vendorId, productId: state.device.productId } : null,
      reports: [...state.reports].reverse(),
      requests: [...state.requests],
      note: 'Supports ReadFlashData, DPI value/color writes, mapped flash settings with automatic same-address readback, and observed profile/receiver commands. Profile and receiver commands do not currently have readback verification.',
    }, null, 2);
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aria-ii-pro-hid-observation.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  $('clearButton').addEventListener('click', () => {
    state.reports = [];
    state.sequence = 0;
    renderReports();
  });
  connectButton.addEventListener('click', connect);
  disconnectButton.addEventListener('click', disconnect);
  $('downloadButton').addEventListener('click', exportReports);
  $('readOutputButton').addEventListener('click', () => readFlash('output'));
  $('readFeatureButton').addEventListener('click', () => readFlash('feature'));
  $('readDpiButton').addEventListener('click', readDpiStage);
  $('writeDpiButton').addEventListener('click', writeDpiStage);
  $('profileButton').addEventListener('click', switchProfile);
  $('writeColorButton').addEventListener('click', writeDpiColor);
  $('longRangeButton').addEventListener('click', setLongRange);
  $('dongleLedButton').addEventListener('click', setDongleLed);
  document.querySelectorAll('.observed-write').forEach((button) => button.addEventListener('click', () => writeObservedSetting(button.dataset.setting)));
  $('rateSetting').addEventListener('change', syncReadButton);
  $('dpiStage').addEventListener('change', () => {
    const stage = Number($('dpiStage').value);
    const saved = state.dpiStages[stage];
    $('dpiCurrent').value = saved ? `${saved.value} DPI` : 'Belum dibaca';
    $('dpiValue').value = saved ? String(saved.value) : '1600';
    $('dpiValue').step = saved ? String(saved.scale) : '50';
    $('dpiStatus').textContent = `Stage ${stage + 1} dipilih. Baca nilainya sebelum menulis.`;
    syncDpiControls();
  });

  if (!window.isSecureContext) {
    $('secureState').textContent = 'BUTUH SECURE CONTEXT';
    setStatus(false, 'Halaman tidak berada di secure context', 'Buka melalui localhost atau HTTPS agar WebHID tersedia.');
    $('compatNote').textContent = 'Buka halaman melalui localhost di Edge/Chrome. WebHID tidak tersedia di HTTP biasa.';
  } else if (!navigator.hid) {
    $('secureState').textContent = 'WEBHID TIDAK TERSEDIA';
    setStatus(false, 'Browser ini belum menyediakan WebHID', 'Gunakan Edge atau Chrome desktop versi terbaru.');
    $('compatNote').textContent = 'WebHID memerlukan Edge/Chrome desktop dan koneksi localhost atau HTTPS.';
  } else {
    $('secureState').textContent = 'WEBHID SIAP';
    setStatus(false, 'Menunggu koneksi perangkat', 'WebHID siap. Tidak ada perangkat yang dibuka sebelum Anda memilih mouse.');
  }
  renderInterfaces();
  renderReports();
})();
