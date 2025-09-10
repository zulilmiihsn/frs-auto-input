// Content script untuk manipulasi halaman BPS FRS
console.log('BPS-FRS Auto Input - Content script loaded');

// Global variables untuk hotkey
let hotkeySettings = { hotkey: 'shift+/' };
let isHotkeyEnabled = false;

// Global variables untuk auto fill
let isAutoFillRunning = false;

// Fungsi untuk menampilkan notifikasi di halaman
function showNotification(message, type = 'info') {
  // Hapus notifikasi sebelumnya jika ada
  const existingNotification = document.getElementById('bps-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Buat elemen notifikasi
  const notification = document.createElement('div');
  notification.id = 'bps-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
  `;
  notification.textContent = message;
  
  // Tambahkan ke halaman
  document.body.appendChild(notification);
  
  // Hapus setelah 3 detik
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Fungsi untuk memvalidasi URL (legacy - untuk kompatibilitas)
function validateUrl(url) {
  return validateUrlFlexible(url);
}

// Fungsi sederhana untuk auto fill dengan delay minimal
async function simpleAutoFill() {
  if (isAutoFillRunning) {
    console.log('⚠️ Auto fill sudah berjalan, skip...');
    return;
  }
  
  isAutoFillRunning = true;
  console.log('🚀 Simple auto fill dimulai...');
  
  try {
    await automateDropdowns();
  } catch (error) {
    console.error('❌ Error dalam simple auto fill:', error);
  } finally {
    isAutoFillRunning = false;
  }
}

// Fungsi untuk menambahkan path ke URL
function addPathToUrl(url, path) {
  // Pastikan path dimulai dengan /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return url + path;
}

// Listen untuk pesan dari background script dan popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'validateUrl') {
    const isValid = validateUrl(request.url);
    sendResponse({ valid: isValid });
  } else if (request.action === 'showNotification') {
    showNotification(request.message, request.type);
    sendResponse({ success: true });
  } else if (request.action === 'automateDropdowns') {
    // Jalankan otomatisasi dropdown
    automateDropdowns().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Indicates async response
  }
});

// Load hotkey settings
async function loadHotkeySettings() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const result = await chrome.storage.sync.get(['hotkey']);
      if (result.hotkey) {
        hotkeySettings.hotkey = result.hotkey;
      }
    } else {
      const savedHotkey = localStorage.getItem('bps_hotkey');
      if (savedHotkey) {
        hotkeySettings.hotkey = savedHotkey;
      }
    }
    console.log('⌨️ Hotkey settings loaded:', hotkeySettings.hotkey);
  } catch (error) {
    console.log('⚠️ Error loading hotkey settings:', error);
  }
}

// Initialize hotkey settings
loadHotkeySettings();

// Fungsi untuk auto klik button simpan
function autoClickSaveButton() {
  const saveButton = document.getElementById('saveBtn');
  if (saveButton) {
    console.log('💾 Auto clicking save button...');
    saveButton.click();
    return true;
  } else {
    console.log('❌ Save button tidak ditemukan');
    return false;
  }
}

// Fungsi untuk mengecek kombinasi hotkey
function checkHotkey(event) {
  const key = event.key.toLowerCase();
  const isShift = event.shiftKey;
  const isCtrl = event.ctrlKey;
  const isAlt = event.altKey;
  
  // Build current combination
  let combination = '';
  if (isShift) combination += 'shift+';
  if (isCtrl) combination += 'ctrl+';
  if (isAlt) combination += 'alt+';
  
  // Handle special keys
  if (key === '/') {
    combination += '/';
  } else if (key === 'enter') {
    combination += 'enter';
  } else if (key === 's') {
    combination += 's';
  } else if (key === 'f9') {
    combination = 'f9';
  } else if (key === 'f10') {
    combination = 'f10';
  } else {
    return false; // Not a supported key
  }
  
  return combination === hotkeySettings.hotkey;
}

// Keyboard event listener
document.addEventListener('keydown', (event) => {
  // Hanya aktif di halaman form
  if (!window.location.href.includes('/sls/ubah/ubah-muatan')) {
    return;
  }
  
  // Cek hotkey combination
  if (checkHotkey(event)) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('⌨️ Hotkey triggered:', hotkeySettings.hotkey);
    autoClickSaveButton();
  }
});

// Listen untuk perubahan hotkey settings
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateHotkey') {
    hotkeySettings.hotkey = request.hotkey;
    console.log('⌨️ Hotkey updated:', hotkeySettings.hotkey);
    sendResponse({ success: true });
  }
});

// Fungsi untuk menunggu halaman siap
function waitForPageReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

// Fungsi untuk menunggu elemen dropdown tersedia
function waitForDropdownElements() {
  return new Promise((resolve) => {
    const checkElements = () => {
      const provinsi = document.getElementById('provinsi');
      const kabupatenKota = document.getElementById('kabupatenKota');
      const kecamatan = document.getElementById('kecamatan');
      const kelurahanDesa = document.getElementById('kelurahanDesa');
      const sls = document.getElementById('sls');
      
      if (provinsi && kabupatenKota && kecamatan && kelurahanDesa && sls) {
        console.log('✅ Semua elemen dropdown tersedia');
        resolve();
      } else {
        console.log('⏳ Menunggu elemen dropdown...');
        setTimeout(checkElements, 100);
      }
    };
    
    checkElements();
  });
}

// Auto-detect jika URL sudah dimodifikasi
if (window.location.href.includes('/sls/ubah/ubah-muatan')) {
  // Auto-execute dropdown automation setelah halaman benar-benar siap
  waitForPageReady().then(async () => {
    console.log('🚀 Halaman siap, menunggu elemen dropdown...');
    await waitForDropdownElements();
    
    console.log('🚀 Auto-executing dropdown automation...');
    await automateDropdowns();
  });
}

// Fungsi untuk memvalidasi URL dengan pattern yang lebih fleksibel
function validateUrlFlexible(url) {
  // Pattern: https://frs.bps.go.id/area/area/ms/XXXXXX (dengan atau tanpa slash di akhir)
  const pattern = /^https:\/\/frs\.bps\.go\.id\/area\/area\/ms\/\d{6}\/?$/;
  return pattern.test(url);
}

// Tambahkan floating button untuk URL yang valid
if (validateUrlFlexible(window.location.href)) {
  // Tambahkan floating button
  addFloatingButton();
} else if (window.location.href.includes('/sls/ubah/ubah-muatan')) {
  // Jika sudah di halaman form, tambahkan floating button untuk auto fill
  addFloatingButton();
}

// Tambahkan floating button untuk URL yang valid
async function addFloatingButton() {
  // Hapus floating button sebelumnya jika ada
  const existingButton = document.getElementById('bps-floating-button');
  if (existingButton) existingButton.remove();
  
  // Cek apakah sudah di halaman form atau masih di halaman utama
  const isFormPage = window.location.href.includes('/sls/ubah/ubah-muatan');
  
  // Load posisi dari storage
  let savedPosition = { top: 20, right: 20 };
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const result = await chrome.storage.sync.get(['buttonPosition']);
      if (result.buttonPosition) {
        savedPosition = result.buttonPosition;
      }
    } else {
      const saved = localStorage.getItem('bps_button_position');
      if (saved) {
        savedPosition = JSON.parse(saved);
      }
    }
  } catch (error) {
    console.log('⚠️ Error loading button position, menggunakan default');
  }
  
  // Buat floating button
  const floatingButton = document.createElement('div');
  floatingButton.id = 'bps-floating-button';
  floatingButton.innerHTML = `
    <div class="bps-floating-content">
      <div class="bps-floating-title">🚀 Mulai!</div>
      <div class="bps-floating-subtitle">${isFormPage ? 'Auto Fill' : 'Go & Fill'}</div>
    </div>
    <div class="bps-drag-handle">⋮⋮</div>
  `;
  floatingButton.style.cssText = `
    position: fixed;
    top: ${savedPosition.top}px;
    right: ${savedPosition.right}px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    border-radius: 15px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
    cursor: move;
    z-index: 10000;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
    user-select: none;
    min-width: 120px;
    text-align: center;
    border: 2px solid transparent;
  `;
  
  // Tambahkan CSS untuk drag handle
  const style = document.createElement('style');
  style.textContent = `
    #bps-floating-button {
      position: fixed !important;
      cursor: pointer;
    }
    .bps-floating-content {
      position: relative;
      z-index: 2;
      pointer-events: auto;
    }
    .bps-drag-handle {
      position: absolute;
      top: 2px;
      right: 2px;
      font-size: 10px;
      opacity: 0.7;
      cursor: move;
      line-height: 1;
      user-select: none;
      z-index: 3;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bps-drag-handle:active {
      cursor: grabbing;
    }
    #bps-floating-button.dragging {
      transition: none !important;
      transform: scale(1.1) !important;
      box-shadow: 0 15px 40px rgba(0,0,0,0.5) !important;
      border: 2px solid #fff !important;
      cursor: grabbing !important;
    }
  `;
  document.head.appendChild(style);
  
  // Hover effect
  floatingButton.onmouseenter = () => {
    if (!floatingButton.classList.contains('dragging')) {
      floatingButton.style.transform = 'translateY(-5px) scale(1.05)';
      floatingButton.style.boxShadow = '0 12px 35px rgba(0,0,0,0.4)';
    }
  };
  
  floatingButton.onmouseleave = () => {
    if (!floatingButton.classList.contains('dragging')) {
      floatingButton.style.transform = 'translateY(0) scale(1)';
      floatingButton.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
    }
  };
  
  // Drag and Drop functionality
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let dragStartTime = 0;
  let dragStartPosition = { x: 0, y: 0 };
  let hasMoved = false;
  let canDrag = false;
  
  // Mouse down event untuk mulai drag
  floatingButton.addEventListener('mousedown', (e) => {
    // Hanya drag jika klik di drag handle
    if (e.target.classList.contains('bps-drag-handle')) {
      canDrag = true;
      dragStartTime = Date.now();
      dragStartPosition = { x: e.clientX, y: e.clientY };
      hasMoved = false;
      
      // Hitung offset dari mouse ke posisi button
      const rect = floatingButton.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      
      // Prevent default untuk mencegah text selection
      e.preventDefault();
      e.stopPropagation();
    } else {
      // Jika klik di area lain, reset drag state
      canDrag = false;
      dragStartTime = 0;
    }
  });
  
  // Mouse move event untuk drag
  document.addEventListener('mousemove', (e) => {
    // Hanya proses jika canDrag true dan ada drag start time
    if (!canDrag || dragStartTime === 0) return;
    
    // Cek apakah sudah mulai drag (setelah delay dan pergerakan)
    const timeDiff = Date.now() - dragStartTime;
    const distance = Math.sqrt(
      Math.pow(e.clientX - dragStartPosition.x, 2) + 
      Math.pow(e.clientY - dragStartPosition.y, 2)
    );
    
    // Mulai drag jika sudah 100ms atau bergerak lebih dari 5px
    if (!isDragging && (timeDiff > 100 || distance > 5)) {
      isDragging = true;
      hasMoved = true;
      floatingButton.classList.add('dragging');
    }
    
    if (isDragging) {
      // Hitung posisi baru
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Batasi posisi dalam viewport
      const maxX = window.innerWidth - floatingButton.offsetWidth;
      const maxY = window.innerHeight - floatingButton.offsetHeight;
      
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      // Update posisi
      floatingButton.style.left = constrainedX + 'px';
      floatingButton.style.top = constrainedY + 'px';
      floatingButton.style.right = 'auto';
    }
  });
  
  // Mouse up event untuk selesai drag
  document.addEventListener('mouseup', async () => {
    if (isDragging) {
      isDragging = false;
      floatingButton.classList.remove('dragging');
      
      // Simpan posisi ke storage
      const rect = floatingButton.getBoundingClientRect();
      const newPosition = {
        top: rect.top,
        right: window.innerWidth - rect.right
      };
      
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          await chrome.storage.sync.set({ buttonPosition: newPosition });
        } else {
          localStorage.setItem('bps_button_position', JSON.stringify(newPosition));
        }
        console.log('📍 Posisi button disimpan:', newPosition);
      } catch (error) {
        console.log('⚠️ Error saving button position:', error);
      }
    }
    
    // Reset drag state
    isDragging = false;
    hasMoved = false;
    dragStartTime = 0;
    canDrag = false;
  });
  
  // Event listener untuk click
  floatingButton.addEventListener('click', async (e) => {
    // Jangan trigger click jika sedang drag atau baru saja drag
    if (isDragging || hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Jangan trigger click jika klik di drag handle
    if (e.target.classList.contains('bps-drag-handle')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    try {
      floatingButton.innerHTML = `
        <div class="bps-floating-content">
          <div class="bps-floating-title">⏳ Processing...</div>
        </div>
      `;
      floatingButton.style.pointerEvents = 'none';
      
      if (isFormPage) {
        // Jika di halaman form, jalankan auto fill
        console.log('🚀 Memulai auto fill dropdown...');
        await automateDropdowns();
        
        // Kembalikan button ke state normal
        floatingButton.innerHTML = `
          <div class="bps-floating-content">
            <div class="bps-floating-title">🚀 Mulai!</div>
            <div class="bps-floating-subtitle">Auto Fill</div>
          </div>
        `;
        floatingButton.style.pointerEvents = 'auto';
        
      } else {
        // Jika di halaman utama, modifikasi URL dan langsung auto fill
        const currentUrl = window.location.href;
        const newUrl = currentUrl.replace(/\/?$/, '') + '/sls/ubah/ubah-muatan';
        
        // Update button untuk menunjukkan sedang memproses
        floatingButton.innerHTML = `
          <div class="bps-floating-content">
            <div class="bps-floating-title">⏳ Loading Form...</div>
          </div>
        `;
        
        // Navigate ke URL baru
        window.location.href = newUrl;
      }
      
    } catch (error) {
      console.error('Error:', error);
      floatingButton.innerHTML = `
        <div class="bps-floating-content">
          <div class="bps-floating-title">❌ Error</div>
        </div>
      `;
      setTimeout(() => {
        floatingButton.innerHTML = `
          <div class="bps-floating-content">
            <div class="bps-floating-title">🚀 Mulai!</div>
            <div class="bps-floating-subtitle">${isFormPage ? 'Auto Fill' : 'Go & Fill'}</div>
          </div>
        `;
        floatingButton.style.pointerEvents = 'auto';
      }, 2000);
    }
  });
  
  document.body.appendChild(floatingButton);
  console.log('✅ Floating button berhasil ditambahkan');
}

// Inisialisasi otomatisasi dropdown (legacy - tidak digunakan lagi)
function initializeDropdownAutomation() {
  console.log('🚀 Menginisialisasi otomatisasi dropdown BPS FRS...');
  // Fungsi ini tidak digunakan lagi karena sudah terintegrasi dengan floating button
}

// Fungsi otomatisasi dropdown
async function automateDropdowns() {
  if (isAutoFillRunning) {
    console.log('⚠️ Auto fill sudah berjalan, skip...');
    return;
  }
  
  isAutoFillRunning = true;
  console.log('🚀 Memulai otomatisasi dropdown...');
  
  // Load pengaturan dari storage
  let kecamatanTarget = '3573010 - KEDUNGKANDANG';
  let kelurahanTarget = '3573010005 - BURING';
  
  try {
    // Cek apakah chrome.storage tersedia
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const result = await chrome.storage.sync.get(['kecamatan', 'kelurahan']);
      if (result.kecamatan) {
        kecamatanTarget = result.kecamatan;
      }
      if (result.kelurahan) {
        kelurahanTarget = result.kelurahan;
      }
    } else {
      // Fallback ke localStorage jika chrome.storage tidak tersedia
      const savedKecamatan = localStorage.getItem('bps_kecamatan');
      const savedKelurahan = localStorage.getItem('bps_kelurahan');
      
      if (savedKecamatan) {
        kecamatanTarget = savedKecamatan;
      }
      if (savedKelurahan) {
        kelurahanTarget = savedKelurahan;
      }
    }
    console.log(`📋 Menggunakan pengaturan: ${kecamatanTarget} → ${kelurahanTarget}`);
  } catch (error) {
    console.log('⚠️ Error loading settings, menggunakan default');
  }
  
  const dropdowns = [
    { id: 'provinsi', name: 'Provinsi', target: '35 - JAWA TIMUR' },
    { id: 'kabupatenKota', name: 'Kabupaten/Kota', target: '3573 - MALANG' },
    { id: 'kecamatan', name: 'Kecamatan', target: kecamatanTarget },
    { id: 'kelurahanDesa', name: 'Kelurahan/Desa', target: kelurahanTarget },
    { id: 'sls', name: 'SLS', target: null, openOnly: true }
  ];
  
  let successCount = 0;
  
  for (const dropdown of dropdowns) {
    try {
      console.log(`\n🎯 Memproses ${dropdown.name}...`);
      
      const element = document.getElementById(dropdown.id);
      if (!element) {
        console.log(`⚠️ Dropdown ${dropdown.id} tidak ditemukan`);
        continue;
      }
      
      if (element.disabled) {
        console.log(`⚠️ Dropdown ${dropdown.id} disabled, skip...`);
        continue;
      }
      
      // Cek apakah dropdown hanya dibuka saja
      if (dropdown.openOnly) {
        console.log(`🔓 Dropdown ${dropdown.name} dibuka untuk pemilihan manual`);
        
        // Method yang terbukti efektif untuk buka dropdown
        const select2Container = document.querySelector(`#select2-${dropdown.id}-container`);
        
        // Method 1: Click container
        if (select2Container) {
          select2Container.click();
        }
        
        // Method 2: Click element
        element.click();
        
        // Method 3: AJAX trigger
        if (select2Container) {
          select2Container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          select2Container.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          select2Container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        
        // Method 4: Keyboard events
        element.focus();
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        
        // Method 5: Select2 API
        if (typeof $ !== 'undefined' && $(element).data('select2')) {
          $(element).select2('open');
        }
        
        // Method 6: Trigger change event setelah dropdown dibuka untuk memastikan deteksi
        setTimeout(() => {
          if (element.value && element.value !== '') {
            console.log('🎯 Dropdown SLS sudah terisi, trigger handleSLSChange');
            handleSLSChange();
          }
        }, 200);
        
        // Listen untuk perubahan value dropdown SLS dengan multiple events
        const handleSLSChange = () => {
          if (element.value && element.value !== '') {
            console.log('🎯 Dropdown SLS terisi, memulai auto scroll dan highlight...');
            
            // Auto scroll ke bawah setelah dropdown SLS terisi (tanpa delay)
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: 'smooth'
            });
            console.log('📜 Auto scroll ke bawah setelah dropdown SLS terisi');
            
            // Highlight field "Nama Ketua SLS-Non-SLS" dan select all isinya
            setTimeout(() => {
              highlightNamaKetuaField();
            }, 100); // Delay minimal untuk memastikan scroll selesai
          }
        };
        
        // Event listener untuk berbagai event Select2
        element.addEventListener('change', handleSLSChange);
        element.addEventListener('select2:select', handleSLSChange);
        element.addEventListener('select2:selecting', handleSLSChange);
        
        // Juga listen dengan jQuery jika tersedia
        if (typeof $ !== 'undefined' && $(element).data('select2')) {
          $(element).on('change', handleSLSChange);
          $(element).on('select2:select', handleSLSChange);
          $(element).on('select2:selecting', handleSLSChange);
        }
        
        // Polling untuk memastikan perubahan terdeteksi (minimal)
        let lastSLSValue = element.value;
        const slsPollInterval = setInterval(() => {
          if (element.value && element.value !== '' && element.value !== lastSLSValue) {
            lastSLSValue = element.value;
            console.log('📊 Polling: Dropdown SLS berubah, trigger handleSLSChange');
            handleSLSChange();
          }
        }, 100);
        
        // Stop polling setelah 10 detik
        setTimeout(() => {
          clearInterval(slsPollInterval);
        }, 10000);
        
        // Event listener saja, tanpa polling untuk kecepatan maksimal
        
        successCount++;
        continue;
      }
      
      // Method super cepat: Hanya yang paling efektif
      const select2Container = document.querySelector(`#select2-${dropdown.id}-container`);
      
      // Method 1: Click container (paling efektif)
      if (select2Container) {
        select2Container.click();
      }
      
      // Method 2: Click element (paling efektif)
      element.click();
      
      // Method 3: AJAX trigger (diperlukan untuk load data)
      if (select2Container) {
        select2Container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        select2Container.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        select2Container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      
      // Method 4: Keyboard events (diperlukan untuk load data)
      element.focus();
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      
      // Tunggu opsi tersedia dengan timeout super minimal
      let options;
      try {
        options = await waitForOptionsFast(dropdown.id, 2000);
      } catch (error) {
        console.log(`⚠️ ${dropdown.name}: ${error.message}`);
        // Coba sekali lagi tanpa delay
        try {
          options = await waitForOptionsFast(dropdown.id, 1000);
        } catch (retryError) {
          console.log(`❌ ${dropdown.name}: Gagal setelah retry - ${retryError.message}`);
          continue; // Skip dropdown ini
        }
      }
                  
                  // Pilih opsi dengan method tercepat
                  const selectedOption = await selectDropdownOptionInstant(dropdown, options);
                  
                  if (selectedOption) {
                    successCount++;
                    // No delay antar dropdown untuk kecepatan maksimal
                  } else {
                    break;
                  }
      
    } catch (error) {
      console.error(`❌ Error pada ${dropdown.name}:`, error);
      break;
    }
  }
  
  const message = `Otomatisasi selesai! ${successCount}/${dropdowns.length} dropdown berhasil diproses`;
  console.log(`🎉 ${message}`);
  
  // Reset flag
  isAutoFillRunning = false;
}

// Fungsi-fungsi lama dihapus untuk performa yang lebih baik

// Fungsi tunggu opsi dengan delay super minimal
function waitForOptionsFast(elementId, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkOptions = () => {
      const element = document.getElementById(elementId);
      if (!element) {
        reject(new Error(`Element ${elementId} tidak ditemukan`));
        return;
      }
      
      // Cari opsi dengan method yang paling cepat
      const allSelect2Options = document.querySelectorAll('.select2-results__option');
      
      // Cek opsi valid
      const validOptions = Array.from(allSelect2Options).filter(option => {
        const text = option.textContent || option.innerText || '';
        return text.trim() !== '' && !text.includes('Pilih') && !text.includes('Loading') && !text.includes('Searching');
      });
      
      // Resolve segera jika ada opsi valid
      if (validOptions.length > 0) {
        console.log(`✅ ${elementId}: ${validOptions.length} opsi ditemukan`);
        resolve(validOptions);
      } else if (Date.now() - startTime > timeout) {
        // Timeout dengan opsi yang ada
        if (allSelect2Options.length > 0) {
          console.log(`⚠️ ${elementId}: Timeout, menggunakan ${allSelect2Options.length} opsi yang tersedia`);
          resolve(Array.from(allSelect2Options));
        } else {
          reject(new Error(`Options untuk ${elementId} tidak dimuat dalam ${timeout}ms`));
        }
      } else {
        setTimeout(checkOptions, 50); // Check setiap 50ms untuk kecepatan maksimal
      }
    };
    
    checkOptions();
  });
}


// Fungsi pemilihan dropdown yang sangat cepat (instan)
async function selectDropdownOptionInstant(dropdown, options) {
  let selectedOption = null;
  
  if (dropdown.target) {
    // Cari opsi berdasarkan target dengan method tercepat
    for (let i = 0; i < options.length; i++) {
      const text = options[i].textContent || options[i].innerText || '';
      if (text.includes(dropdown.target)) {
        selectedOption = options[i];
        break;
      }
    }
  }
  
  if (!selectedOption && options.length > 0) {
    // Pilih opsi pertama yang valid dengan method tercepat
    for (let i = 0; i < options.length; i++) {
      const text = options[i].textContent || options[i].innerText || '';
      const value = options[i].value || options[i].getAttribute('data-value') || '';
      if (value && value !== '' && !text.includes('Pilih') && !text.includes('Loading') && text.trim() !== '') {
        selectedOption = options[i];
        break;
      }
    }
  }
  
  if (selectedOption) {
    const element = document.getElementById(dropdown.id);
    const optionText = selectedOption.textContent || selectedOption.innerText || '';
    
    // Ekstrak value dari text jika perlu
    let optionValue = selectedOption.value || selectedOption.getAttribute('data-value') || '';
    if (!optionValue && optionText.includes(' - ')) {
      optionValue = optionText.split(' - ')[0].trim();
    }
    
    // Method super cepat: Langsung click tanpa delay
    try {
      selectedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      selectedOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      selectedOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      const currentValue = element.value;
      if (currentValue && currentValue !== '') {
        return selectedOption;
      }
    } catch (error) {
      // Silent fail untuk performa
    }
  }
  
  return null;
}

// Fungsi untuk highlight field "Nama Ketua SLS-Non-SLS"
function highlightNamaKetuaField() {
  console.log('🔍 Mencari field "Nama Ketua SLS-Non-SLS"...');
  
  // Cari field dengan berbagai cara
  let field = null;
  
  // Method 1: Cari berdasarkan label text
  const labels = document.querySelectorAll('label');
  for (const label of labels) {
    if (label.textContent && label.textContent.includes('Nama Ketua SLS-Non-SLS')) {
      // Cari input field yang terkait dengan label ini
      const labelFor = label.getAttribute('for');
      if (labelFor) {
        field = document.getElementById(labelFor);
      } else {
        // Cari input di dalam label atau setelah label
        field = label.querySelector('input[type="text"]') || 
                label.nextElementSibling?.querySelector('input[type="text"]');
      }
      break;
    }
  }
  
  // Method 2: Cari berdasarkan name attribute
  if (!field) {
    field = document.querySelector('input[name*="ketua" i]') || 
            document.querySelector('input[name*="nama" i]') ||
            document.querySelector('input[name*="sls" i]');
  }
  
  // Method 3: Cari berdasarkan placeholder
  if (!field) {
    field = document.querySelector('input[placeholder*="ketua" i]') ||
            document.querySelector('input[placeholder*="nama" i]') ||
            document.querySelector('input[placeholder*="sls" i]');
  }
  
  // Method 4: Cari semua input text dan cari yang paling relevan
  if (!field) {
    const textInputs = document.querySelectorAll('input[type="text"]');
    for (const input of textInputs) {
      const parentText = input.closest('div, td, tr')?.textContent || '';
      if (parentText.includes('ketua') || parentText.includes('nama') || parentText.includes('sls')) {
        field = input;
        break;
      }
    }
  }
  
  if (field) {
    console.log('✅ Field "Nama Ketua SLS-Non-SLS" ditemukan');
    
    // Focus ke field
    field.focus();
    
    // Select all text jika ada
    if (field.value) {
      field.select();
      console.log('📝 Text di-select all');
    } else {
      console.log('📝 Field difocus (kosong)');
    }
    
    // Tambahkan highlight visual
    field.style.backgroundColor = '#ffffcc';
    field.style.border = '2px solid #ff6b6b';
    
    // Hapus highlight setelah 3 detik
    setTimeout(() => {
      field.style.backgroundColor = '';
      field.style.border = '';
    }, 3000);
    
  } else {
    console.log('❌ Field "Nama Ketua SLS-Non-SLS" tidak ditemukan');
    
    // Fallback: highlight field input text pertama yang ditemukan
    const firstTextInput = document.querySelector('input[type="text"]');
    if (firstTextInput) {
      firstTextInput.focus();
      if (firstTextInput.value) {
        firstTextInput.select();
      }
      console.log('📝 Fallback: Field input text pertama difocus');
    }
  }
}

// Helper functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForOptions(elementId, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkOptions = () => {
      const element = document.getElementById(elementId);
      if (!element) {
        reject(new Error(`Element ${elementId} tidak ditemukan`));
        return;
      }
      
      // Method 1: Cari opsi di Select2 dropdown yang terbuka
      let select2Options = [];
      const select2Dropdown = document.querySelector('.select2-dropdown');
      if (select2Dropdown) {
        select2Options = select2Dropdown.querySelectorAll('.select2-results__option');
        console.log(`🔍 Select2 dropdown options: ${select2Options.length}`);
      }
      
      // Method 2: Cari opsi di original select element
      const originalOptions = element.querySelectorAll('option');
      console.log(`🔍 Original select options: ${originalOptions.length}`);
      
      // Method 3: Cari opsi di Select2 results container
      let select2Results = [];
      const select2ResultsContainer = document.querySelector('.select2-results__options');
      if (select2ResultsContainer) {
        select2Results = select2ResultsContainer.querySelectorAll('.select2-results__option');
        console.log(`🔍 Select2 results options: ${select2Results.length}`);
      }
      
      // Gabungkan semua opsi yang ditemukan
      const allOptions = [...select2Options, ...originalOptions, ...select2Results];
      console.log(`🔍 Total options untuk ${elementId}: ${allOptions.length}`);
      
      // Cek apakah ada opsi yang valid
      const validOptions = allOptions.filter(option => {
        const text = option.textContent || option.innerText || '';
        const value = option.value || option.getAttribute('data-value') || '';
        return value && value !== '' && !text.includes('Pilih') && !text.includes('Loading') && text.trim() !== '';
      });
      
      if (validOptions.length > 0) {
        console.log(`✅ Valid options ditemukan untuk ${elementId}: ${validOptions.length}`);
        console.log(`📋 Options:`, validOptions.map(opt => opt.textContent || opt.innerText));
        resolve(validOptions);
      } else if (allOptions.length > 0) {
        // Jika ada opsi tapi tidak valid, tetap lanjut
        console.log(`⚠️ Options ditemukan tapi tidak valid untuk ${elementId}: ${allOptions.length}`);
        resolve(allOptions);
      } else if (Date.now() - startTime > timeout) {
        console.log(`❌ Timeout untuk ${elementId} setelah ${timeout}ms`);
        reject(new Error(`Options untuk ${elementId} tidak dimuat dalam ${timeout}ms`));
      } else {
        setTimeout(checkOptions, 500);
      }
    };
    
    checkOptions();
  });
}
