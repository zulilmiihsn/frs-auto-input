# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-12-19

### Added
- 🚀 **Auto Fill Dropdown**: Otomatisasi pengisian dropdown form BPS FRS
- 🖱️ **Drag & Drop Button**: Floating button yang bisa dipindah-pindah
- ⌨️ **Hotkey Simpan**: Keyboard shortcut untuk auto-klik tombol simpan
- ⚙️ **Dynamic Settings**: Pengaturan Kecamatan/Kelurahan yang dapat disesuaikan
- 🔍 **Smart Detection**: Deteksi halaman siap dan elemen dropdown
- 🐌 **Slow Internet Support**: Penanganan khusus untuk internet lemot
- 🔄 **Multiple Triggers**: 6 trigger berbeda untuk memastikan auto fill berhasil
- 📱 **Responsive UI**: Popup interface yang user-friendly

### Features
- **URL Modification**: Otomatis ubah URL ke halaman form
- **Select2 Support**: Kompatibel dengan library Select2
- **Chrome Storage**: Simpan pengaturan secara persistent
- **Error Handling**: Retry mechanism dan fallback
- **Performance Optimized**: Cleanup otomatis dan memory management

### Technical Details
- **Manifest V3**: Menggunakan Chrome Extension Manifest V3
- **Content Scripts**: Manipulasi DOM halaman web
- **Background Scripts**: Handle URL modification
- **Storage API**: Chrome storage untuk pengaturan
- **Event Listeners**: Multiple event detection methods
- **MutationObserver**: Real-time DOM change detection
- **Polling Mechanism**: Periodic checking untuk dropdown load
