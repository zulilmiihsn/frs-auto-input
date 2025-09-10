# 🚀 BPS-FRS Auto Input

Halo! Ini adalah extension Chrome yang bakal bikin hidup kamu lebih mudah saat ngisi form BPS FRS. Gak perlu lagi ribet-ribet ngisi dropdown satu-satu, tinggal klik tombol "Mulai!" dan semua dropdown langsung keisi otomatis! 

## ✨ Fitur Keren

### 🎯 **Auto Fill Dropdown**
- Isi semua dropdown form BPS FRS secara otomatis
- Pilih Kecamatan dan Kelurahan/Desa sesuai keinginan
- Smart detection - tunggu sampai halaman siap baru mulai isi
- Retry mechanism kalau internet lemot

### 🖱️ **Drag & Drop Button**
- Tombol floating yang bisa dipindah-pindah ke mana aja
- Drag handle khusus biar gak ke-klik pas mau pindah
- Posisi tombol tersimpan otomatis

### ⌨️ **Hotkey Simpan**
- Tekan `SHIFT + /` (atau hotkey lain) untuk auto-klik tombol "Simpan"
- Bisa ganti hotkey sesuai selera
- Bekerja di halaman form aja

### ⚙️ **Pengaturan Fleksibel**
- Pilih Kecamatan dan Kelurahan/Desa di popup
- Ganti hotkey simpan
- Pengaturan tersimpan otomatis

## 🎮 Cara Pakai

### 1. **Install Extension**
- Buka Chrome → Extensions → Developer mode
- Load unpacked → pilih folder ini
- Extension siap dipakai!

### 2. **Set Pengaturan**
- Klik icon extension di toolbar
- Pilih Kecamatan dan Kelurahan/Desa
- Pilih hotkey simpan (default: SHIFT + /)
- Klik "Simpan Pengaturan"

### 3. **Auto Fill**
- Buka halaman BPS FRS dengan URL: `frs.bps.go.id/area/area/ms/XXXXXX`
- Klik tombol floating "Mulai!" 
- Extension otomatis:
  - Ubah URL ke halaman form
  - Isi semua dropdown sesuai pengaturan
  - Scroll ke bawah
  - Highlight field "Nama Ketua SLS-Non-SLS"

### 4. **Auto Simpan**
- Di halaman form, tekan hotkey yang udah diatur
- Tombol "Simpan" otomatis diklik

## 🔧 Teknologi

- **Chrome Extension Manifest V3**
- **Content Script** untuk manipulasi halaman
- **Chrome Storage API** untuk simpan pengaturan
- **Select2 Library** support untuk dropdown
- **Smart Detection** untuk tunggu halaman siap

## 🎯 URL yang Didukung

Extension ini bekerja di URL pattern:
```
https://frs.bps.go.id/area/area/ms/XXXXXX
```

Dimana `XXXXXX` adalah 6 digit kode area yang dinamis.

## 🚨 Catatan Penting

- Extension cuma bekerja di website BPS FRS
- Pastikan internet stabil biar dropdown ke-load dengan baik
- Kalau ada masalah, cek console log di Developer Tools
- Extension otomatis retry kalau dropdown belum ke-load

## 🐛 Troubleshooting

**Dropdown gak ke-isi?**
- Cek internet connection
- Tunggu beberapa detik, extension punya retry mechanism
- Pastikan pengaturan Kecamatan/Kelurahan udah disimpan

**Tombol floating gak muncul?**
- Refresh halaman
- Pastikan URL sesuai pattern yang didukung
- Cek console log untuk error

**Hotkey gak bekerja?**
- Pastikan lagi di halaman form (`/sls/ubah/ubah-muatan`)
- Cek pengaturan hotkey di popup
- Coba hotkey lain

## 📝 Changelog

### v1.0
- Auto fill dropdown dengan smart detection
- Drag & drop floating button
- Hotkey simpan dengan konfigurasi
- Pengaturan Kecamatan/Kelurahan dinamis
- Retry mechanism untuk internet lemot

## 🤝 Kontribusi

Kalau ada bug atau mau request fitur baru, silakan buat issue atau pull request ya!

## 📄 License

Extension ini dibuat untuk memudahkan kerja di BPS FRS. Pakai dengan bijak! 

---

**Happy Auto-Filling! 🎉**
