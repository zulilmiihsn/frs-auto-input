// Popup script untuk UI extension
document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const kecamatanSelect = document.getElementById('kecamatanSelect');
  const kelurahanSelect = document.getElementById('kelurahanSelect');
  const saveSettingsButton = document.getElementById('saveSettings');
  const resetSettingsButton = document.getElementById('resetSettings');
  const hotkeySelect = document.getElementById('hotkeySelect');

  // Data kelurahan berdasarkan kecamatan
  const kelurahanData = {
    '3573010 - KEDUNGKANDANG': [
      '3573010001 - ARJOWINANGUN',
      '3573010002 - TLOGOWARU',
      '3573010003 - WONOKOYO',
      '3573010004 - BUMIAYU',
      '3573010005 - BURING',
      '3573010006 - MERGOSONO',
      '3573010007 - KOTALAMA',
      '3573010008 - KEDUNGKANDANG',
      '3573010009 - SAWOJAJAR',
      '3573010010 - MADYOPURO',
      '3573010011 - LESANPURO',
      '3573010012 - CEMOROKANDANG'
    ],
    '3573020 - SUKUN': [
      '3573020001 - KEBONSARI',
      '3573020002 - GADANG',
      '3573020003 - CIPTOMULYO',
      '3573020004 - SUKUN',
      '3573020005 - BANDUNGREJOSARI',
      '3573020006 - BAKALANKRAJAN',
      '3573020007 - MULYOREJO',
      '3573020008 - BANDULAN',
      '3573020009 - TANJUNGREJO',
      '3573020010 - PISANGCANDI',
      '3573020011 - KARANGBESUKI'
    ],
    '3573030 - KLOJEN': [
      '3573030001 - KASIN',
      '3573030002 - SUKOHARJO',
      '3573030003 - KIDULDALEM',
      '3573030004 - KAUMAN',
      '3573030005 - BARENG',
      '3573030006 - GADING KASRI',
      '3573030007 - ORO-ORO DOWO',
      '3573030008 - KLOJEN',
      '3573030009 - RAMPALCELAKET',
      '3573030010 - SAMAAN',
      '3573030011 - PENANGGUNGAN'
    ],
    '3573040 - BLIMBING': [
      '3573040001 - JODIPAN',
      '3573040002 - POLEHAN',
      '3573040003 - KESATRIAN',
      '3573040004 - BUNULREJO',
      '3573040005 - PURWANTORO',
      '3573040006 - PANDANWANGI',
      '3573040007 - BLIMBING',
      '3573040008 - PURWODADI',
      '3573040009 - POLOWIJEN',
      '3573040010 - ARJOSARI',
      '3573040011 - BALEARJOSARI'
    ],
    '3573050 - LOWOKWARU': [
      '3573050001 - MERJOSARI',
      '3573050002 - DINOYO',
      '3573050003 - SUMBERSARI',
      '3573050004 - KETAWANGGEDE',
      '3573050005 - JATIMULYO',
      '3573050006 - LOWOKWARU',
      '3573050007 - TULUSREJO',
      '3573050008 - MOJOLANGU',
      '3573050009 - TUNJUNGSEKAR',
      '3573050010 - TASIK MADU',
      '3573050011 - TUNGGULWULUNG',
      '3573050012 - TLOGOMAS'
    ]
  };

  // Fungsi untuk menampilkan status
  function showStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
  }

  // Fungsi untuk menyembunyikan status
  function hideStatus() {
    statusElement.style.display = 'none';
  }

  // Fungsi untuk update kelurahan berdasarkan kecamatan
  function updateKelurahan() {
    const selectedKecamatan = kecamatanSelect.value;
    kelurahanSelect.innerHTML = '';
    
    if (kelurahanData[selectedKecamatan]) {
      kelurahanData[selectedKecamatan].forEach(kelurahan => {
        const option = document.createElement('option');
        option.value = kelurahan;
        option.textContent = kelurahan;
        kelurahanSelect.appendChild(option);
      });
    }
  }

  // Fungsi untuk load pengaturan dari storage
  async function loadSettings() {
    try {
      // Cek apakah chrome.storage tersedia
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        const result = await chrome.storage.sync.get(['kecamatan', 'kelurahan', 'hotkey']);
        if (result.kecamatan) {
          kecamatanSelect.value = result.kecamatan;
          updateKelurahan();
          if (result.kelurahan) {
            kelurahanSelect.value = result.kelurahan;
          }
        } else {
          // Set default
          kecamatanSelect.value = '3573010 - KEDUNGKANDANG';
          updateKelurahan();
          kelurahanSelect.value = '3573010005 - BURING';
        }
        
        if (result.hotkey) {
          hotkeySelect.value = result.hotkey;
        } else {
          hotkeySelect.value = 'shift+/';
        }
      } else {
        // Fallback ke localStorage jika chrome.storage tidak tersedia
        const savedKecamatan = localStorage.getItem('bps_kecamatan');
        const savedKelurahan = localStorage.getItem('bps_kelurahan');
        const savedHotkey = localStorage.getItem('bps_hotkey');
        
        if (savedKecamatan) {
          kecamatanSelect.value = savedKecamatan;
          updateKelurahan();
          if (savedKelurahan) {
            kelurahanSelect.value = savedKelurahan;
          }
        } else {
          // Set default
          kecamatanSelect.value = '3573010 - KEDUNGKANDANG';
          updateKelurahan();
          kelurahanSelect.value = '3573010005 - BURING';
        }
        
        if (savedHotkey) {
          hotkeySelect.value = savedHotkey;
        } else {
          hotkeySelect.value = 'shift+/';
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Set default jika error
      kecamatanSelect.value = '3573010 - KEDUNGKANDANG';
      updateKelurahan();
      kelurahanSelect.value = '3573010005 - BURING';
      hotkeySelect.value = 'shift+/';
    }
  }

  // Fungsi untuk save pengaturan ke storage
  async function saveSettings() {
    try {
      // Cek apakah chrome.storage tersedia
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set({
          kecamatan: kecamatanSelect.value,
          kelurahan: kelurahanSelect.value,
          hotkey: hotkeySelect.value
        });
      } else {
        // Fallback ke localStorage jika chrome.storage tidak tersedia
        localStorage.setItem('bps_kecamatan', kecamatanSelect.value);
        localStorage.setItem('bps_kelurahan', kelurahanSelect.value);
        localStorage.setItem('bps_hotkey', hotkeySelect.value);
      }
      showStatus('Pengaturan berhasil disimpan!', 'success');
      setTimeout(hideStatus, 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('Error menyimpan pengaturan!', 'error');
      setTimeout(hideStatus, 2000);
    }
  }

  // Fungsi untuk reset pengaturan
  async function resetSettings() {
    try {
      // Cek apakah chrome.storage tersedia
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.clear();
      } else {
        // Fallback ke localStorage jika chrome.storage tidak tersedia
        localStorage.removeItem('bps_kecamatan');
        localStorage.removeItem('bps_kelurahan');
        localStorage.removeItem('bps_hotkey');
      }
      kecamatanSelect.value = '3573010 - KEDUNGKANDANG';
      updateKelurahan();
      kelurahanSelect.value = '3573010005 - BURING';
      hotkeySelect.value = 'shift+/';
      showStatus('Pengaturan direset ke default!', 'success');
      setTimeout(hideStatus, 2000);
    } catch (error) {
      console.error('Error resetting settings:', error);
      showStatus('Error reset pengaturan!', 'error');
      setTimeout(hideStatus, 2000);
    }
  }

  // Event listeners untuk pengaturan
  kecamatanSelect.addEventListener('change', updateKelurahan);
  saveSettingsButton.addEventListener('click', saveSettings);
  resetSettingsButton.addEventListener('click', resetSettings);
  hotkeySelect.addEventListener('change', async () => {
    // Update hotkey langsung ke content script
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url.includes('/sls/ubah/ubah-muatan')) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'updateHotkey',
          hotkey: hotkeySelect.value
        });
        console.log('⌨️ Hotkey updated to:', hotkeySelect.value);
      }
    } catch (error) {
      console.log('⚠️ Error updating hotkey:', error);
    }
  });

  // Load pengaturan saat popup dibuka
  await loadSettings();
});