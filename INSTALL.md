# 📦 Cara Install BPS-FRS Auto Input

## 🚀 Quick Install

### 1. Download Extension
- Download atau clone repository ini
- Extract ke folder yang diinginkan

### 2. Load di Chrome
1. Buka Chrome browser
2. Ketik `chrome://extensions/` di address bar
3. Aktifkan **Developer mode** (toggle di pojok kanan atas)
4. Klik **Load unpacked**
5. Pilih folder extension yang sudah didownload
6. Extension akan muncul di toolbar Chrome

### 3. Setup Pengaturan
1. Klik icon extension di toolbar
2. Pilih Kecamatan dan Kelurahan/Desa yang diinginkan
3. Pilih hotkey simpan (default: SHIFT + /)
4. Klik **Simpan Pengaturan**

## 🎯 Cara Penggunaan

### Auto Fill
1. Buka halaman BPS FRS dengan URL: `frs.bps.go.id/area/area/ms/XXXXXX`
2. Klik floating button **"Mulai!"**
3. Extension akan otomatis:
   - Ubah URL ke halaman form
   - Isi semua dropdown sesuai pengaturan
   - Scroll ke bawah
   - Highlight field "Nama Ketua SLS-Non-SLS"

### Auto Simpan
- Tekan hotkey yang sudah diatur (default: SHIFT + /) di halaman form
- Button "Simpan" akan otomatis diklik

## ⚙️ Pengaturan

### Dropdown Options
- **Kecamatan**: Pilih dari 5 kecamatan yang tersedia
- **Kelurahan/Desa**: Otomatis update berdasarkan kecamatan yang dipilih

### Hotkey Options
- `SHIFT + /` (default)
- `CTRL + S`
- `CTRL + ENTER`
- `F9`
- `F10`
- `ALT + S`

## 🔧 Troubleshooting

### Extension tidak muncul?
- Pastikan Developer mode aktif
- Refresh halaman setelah load extension
- Cek console log untuk error

### Auto fill tidak bekerja?
- Pastikan URL sesuai pattern: `frs.bps.go.id/area/area/ms/XXXXXX`
- Cek pengaturan Kecamatan/Kelurahan sudah disimpan
- Tunggu beberapa detik untuk slow internet

### Hotkey tidak bekerja?
- Pastikan lagi di halaman form (`/sls/ubah/ubah-muatan`)
- Cek pengaturan hotkey di popup
- Coba hotkey lain

## 📋 Requirements

- **Chrome Browser**: Versi 88+ (untuk Manifest V3)
- **Internet Connection**: Stabil untuk load dropdown options
- **BPS FRS Access**: Akses ke website BPS FRS

## 🆘 Support

Jika ada masalah atau bug, silakan buat issue di GitHub repository ini.

---

**Happy Auto-Filling! 🎉**
