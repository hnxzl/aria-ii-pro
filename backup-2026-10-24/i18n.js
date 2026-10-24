// i18n.js - Bilingual dictionary for Aria II Pro Configurator
window.I18n = {
  current: localStorage.getItem('aria2pro-lang') || 'en',
  dict: {
    en: {
      // Top bar & connect
      customize: "Customize",
      performance: "Performance",
      web_configurator: "Web Configurator",
      connect_device: "Connect Device",
      not_connected: "Not connected",
      device_diagnostics: "Device diagnostics",
      candidates_list: "Every candidate the browser offered, best match first:",
      list_all_hid: "Device not showing up? List all HID devices",
      rescan: "Re-scan",
      copy_report: "Copy report",
      memory_dump_desc: "Onboard memory dump (includes DPI, buttons, macros). Takes a minute over Bluetooth.",
      dump_memory: "Dump memory",
      not_dumped: "Not dumped yet.",

      // DPI
      dpi_stages: "DPI Stages",
      fewer: "Fewer",
      more: "More",

      // Polling rate
      polling_rate: "Polling Rate",

      // Peak Performance
      peak_perf: "Peak Performance",
      enable: "Enable",

      // Mode Select
      mode_select: "Mode Select",
      low_power: "Low Power",
      high_perf: "High Performance",
      corded_mode: "Corded",

      // Debounce
      debounce: "Debounce Time",
      enable_debounce: "Enable",

      // Sensor toggles
      motion_sync: "Motion Sync",
      ripple_ctrl: "Ripple Control",
      angle_snap: "Angle Snapping",

      // LOD
      lift_off: "Lift-Off Distance",

      // LED idle-off
      led_idle_off: "LED Idle-Off Timeout",

      // Receiver
      receiver_settings: "Receiver Settings",
      long_distance: "Long Distance",
      receiver_led: "Receiver LED Mode",

      // Profile FAB
      profile: "Profile",
      import_profile: "Import profile…",
      export_profile: "Export profile",
      apply_profile: "Apply profile to mouse",
      restore_defaults: "Restore defaults",
      support_me: "Support me ↗",
      made_by: "Made by",

      // Diagnostics
      diagnostics: "Diagnostics",

      // Battery / connection
      connected_over: "Connected over {transport}",
    },
    id: {
      customize: "Kustomisasi",
      performance: "Performa",
      web_configurator: "Konfigurator Web",
      connect_device: "Hubungkan Perangkat",
      not_connected: "Tidak Terhubung",
      device_diagnostics: "Diagnostik Perangkat",
      candidates_list: "Setiap kandidat yang ditawarkan browser, kecocokan terbaik duluan:",
      list_all_hid: "Perangkat tidak muncul? Daftar semua HID",
      rescan: "Pindai Ulang",
      copy_report: "Salin Laporan",
      memory_dump_desc: "Dump memori onboard (termasuk DPI, tombol, makro). Butuh waktu satu menit lewat Bluetooth.",
      dump_memory: "Dump Memori",
      not_dumped: "Belum di-dump.",

      dpi_stages: "Tahap DPI",
      fewer: "Kurangi",
      more: "Tambah",

      polling_rate: "Polling Rate",

      peak_perf: "Performa Puncak",
      enable: "Aktifkan",

      mode_select: "Mode Select",
      low_power: "Hemat Daya",
      high_perf: "Performa Tinggi",
      corded_mode: "Corded",

      debounce: "Waktu Debounce",
      enable_debounce: "Aktifkan",

      motion_sync: "Motion Sync",
      ripple_ctrl: "Ripple Control",
      angle_snap: "Angle Snapping",

      lift_off: "Lift-Off Distance",

      led_idle_off: "LED Idle-Off Timeout",

      receiver_settings: "Pengaturan Receiver",
      long_distance: "Jarak Jauh",
      receiver_led: "Mode LED Receiver",

      profile: "Profil",
      import_profile: "Impor profil…",
      export_profile: "Ekspor profil",
      apply_profile: "Terapkan profil ke mouse",
      restore_defaults: "Pulihkan default",
      support_me: "Dukung saya ↗",
      made_by: "Dibuat oleh",

      diagnostics: "Diagnostik",

      connected_over: "Terhubung via {transport}",
    }
  },

  t(key, vars) {
    const dict = this.dict[this.current] || this.dict.en;
    let out = dict[key] || key;
    if (vars) {
      out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    }
    return out;
  },

  setLang(lang) {
    if (this.dict[lang]) {
      this.current = lang;
      localStorage.setItem('aria2pro-lang', lang);
      this.apply();
    }
  },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = this.t(key);
      if (val) el.innerHTML = val;
    });
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this.current);
    });
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.I18n.apply();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => window.I18n.setLang(btn.dataset.lang));
  });
});