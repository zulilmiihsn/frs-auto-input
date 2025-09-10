// Content script untuk manipulasi halaman BPS FRS
console.log('BPS-FRS Auto Input - Content script loaded');

// Global variables untuk hotkey
let hotkeySettings = { hotkey: 'shift+/' };
let isHotkeyEnabled = false;

// Global variables untuk auto fill trigger
let isAutoFillRunning = false;
let delayedTriggerTimeout = null;
let dropdownLoadListeners = new Set();
let autoFillRetryInterval = null;
let autoFillRetryCount = 0;
const maxAutoFillRetries = 10;

// Global variables untuk slow internet detection
let isSlowInternet = false;
let slowInternetDetectionCount = 0;
const slowInternetThreshold = 2; // Jika 2 dropdown timeout, anggap slow internet

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

// Fungsi untuk mendeteksi dropdown yang selesai diload dan memicu auto fill
function setupDropdownLoadTrigger() {
  console.log('🔍 Setting up dropdown load trigger...');
  
  // Daftar dropdown yang perlu dimonitor
  const dropdownIds = ['provinsi', 'kabupatenKota', 'kecamatan', 'kelurahanDesa'];
  
  dropdownIds.forEach(dropdownId => {
    const element = document.getElementById(dropdownId);
    if (!element) return;
    
    // Cek apakah sudah ada listener untuk dropdown ini
    if (dropdownLoadListeners.has(dropdownId)) return;
    
    // Event listener untuk Select2 events
    const handleDropdownLoad = () => {
      console.log(`📡 Dropdown ${dropdownId} selesai diload, memicu delayed auto fill...`);
      
      // Clear timeout sebelumnya jika ada
      if (delayedTriggerTimeout) {
        clearTimeout(delayedTriggerTimeout);
      }
      
      // Trigger auto fill setelah 1 detik (lebih cepat)
      delayedTriggerTimeout = setTimeout(async () => {
        if (!isAutoFillRunning) {
          console.log('🚀 Delayed trigger: Memulai auto fill...');
          await triggerAutoFill();
        }
      }, 1000);
    };
    
    // Multiple event listeners untuk memastikan terdeteksi
    element.addEventListener('select2:loaded', handleDropdownLoad);
    element.addEventListener('select2:opened', handleDropdownLoad);
    element.addEventListener('change', handleDropdownLoad);
    element.addEventListener('select2:select', handleDropdownLoad);
    
    // Juga dengan jQuery jika tersedia
    if (typeof $ !== 'undefined' && $(element).data('select2')) {
      $(element).on('select2:loaded', handleDropdownLoad);
      $(element).on('select2:opened', handleDropdownLoad);
      $(element).on('change', handleDropdownLoad);
      $(element).on('select2:select', handleDropdownLoad);
    }
    
    // Polling yang lebih agresif untuk mendeteksi perubahan opsi
    let lastOptionCount = 0;
    let lastValidOptionCount = 0;
    const pollInterval = setInterval(() => {
      const select2Options = document.querySelectorAll('.select2-results__option');
      const validOptions = Array.from(select2Options).filter(option => {
        const text = option.textContent || option.innerText || '';
        return text.trim() !== '' && !text.includes('Pilih') && !text.includes('Loading') && !text.includes('Searching');
      });
      
      // Trigger jika ada opsi baru yang valid
      if (validOptions.length > lastValidOptionCount && validOptions.length > 0) {
        lastValidOptionCount = validOptions.length;
        console.log(`📊 Polling: ${validOptions.length} valid options detected untuk ${dropdownId}`);
        handleDropdownLoad();
      }
      
      // Juga trigger jika total opsi bertambah
      if (select2Options.length > lastOptionCount && select2Options.length > 0) {
        lastOptionCount = select2Options.length;
        console.log(`📊 Polling: ${select2Options.length} total options detected untuk ${dropdownId}`);
        handleDropdownLoad();
      }
    }, 200); // Polling lebih sering (200ms)
    
    // Stop polling setelah 60 detik
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 60000);
    
    dropdownLoadListeners.add(dropdownId);
    console.log(`✅ Dropdown load trigger setup untuk ${dropdownId}`);
  });
  
  // Global polling untuk mendeteksi perubahan di semua dropdown
  let globalLastOptionCount = 0;
  const globalPollInterval = setInterval(() => {
    const allSelect2Options = document.querySelectorAll('.select2-results__option');
    const validOptions = Array.from(allSelect2Options).filter(option => {
      const text = option.textContent || option.innerText || '';
      return text.trim() !== '' && !text.includes('Pilih') && !text.includes('Loading') && !text.includes('Searching');
    });
    
    // Trigger jika ada opsi valid yang baru
    if (validOptions.length > globalLastOptionCount && validOptions.length > 0) {
      globalLastOptionCount = validOptions.length;
      console.log(`🌐 Global polling: ${validOptions.length} valid options detected`);
      
      // Clear timeout sebelumnya jika ada
      if (delayedTriggerTimeout) {
        clearTimeout(delayedTriggerTimeout);
      }
      
      // Trigger auto fill setelah 1 detik
      delayedTriggerTimeout = setTimeout(async () => {
        if (!isAutoFillRunning) {
          console.log('🚀 Global delayed trigger: Memulai auto fill...');
          await triggerAutoFill();
        }
      }, 1000);
    }
  }, 300);
  
  // Stop global polling setelah 60 detik
  setTimeout(() => {
    clearInterval(globalPollInterval);
  }, 60000);
}

// Fungsi untuk memicu auto fill dengan delay
async function triggerAutoFill() {
  if (isAutoFillRunning) {
    console.log('⚠️ Auto fill sudah berjalan, skip trigger...');
    return;
  }
  
  isAutoFillRunning = true;
  console.log('🚀 Triggered auto fill dimulai...');
  
  try {
    await automateDropdowns();
  } catch (error) {
    console.error('❌ Error dalam triggered auto fill:', error);
  } finally {
    isAutoFillRunning = false;
  }
}

// Fungsi untuk setup MutationObserver untuk mendeteksi perubahan DOM
function setupMutationObserver() {
  console.log('🔍 Setting up MutationObserver...');
  
  // Buat observer untuk mendeteksi perubahan di DOM
  const observer = new MutationObserver((mutations) => {
    let shouldTrigger = false;
    
    mutations.forEach((mutation) => {
      // Cek jika ada node baru yang ditambahkan
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Cek jika ada elemen dengan class select2-results__option
            if (node.classList && node.classList.contains('select2-results__option')) {
              const text = node.textContent || node.innerText || '';
              if (text.trim() !== '' && !text.includes('Pilih') && !text.includes('Loading') && !text.includes('Searching')) {
                console.log('🔍 MutationObserver: Opsi baru ditambahkan:', text.trim());
                shouldTrigger = true;
              }
            }
            
            // Cek juga di child nodes
            const select2Options = node.querySelectorAll && node.querySelectorAll('.select2-results__option');
            if (select2Options && select2Options.length > 0) {
              select2Options.forEach(option => {
                const text = option.textContent || option.innerText || '';
                if (text.trim() !== '' && !text.includes('Pilih') && !text.includes('Loading') && !text.includes('Searching')) {
                  console.log('🔍 MutationObserver: Opsi baru ditemukan di child:', text.trim());
                  shouldTrigger = true;
                }
              });
            }
          }
        });
      }
    });
    
    if (shouldTrigger) {
      console.log('📡 MutationObserver: Perubahan DOM terdeteksi, memicu auto fill...');
      
      // Clear timeout sebelumnya jika ada
      if (delayedTriggerTimeout) {
        clearTimeout(delayedTriggerTimeout);
      }
      
      // Trigger auto fill setelah 500ms
      delayedTriggerTimeout = setTimeout(async () => {
        if (!isAutoFillRunning) {
          console.log('🚀 MutationObserver delayed trigger: Memulai auto fill...');
          await triggerAutoFill();
        }
      }, 500);
    }
  });
  
  // Mulai observe perubahan di document body
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
  
  // Stop observer setelah 60 detik
  setTimeout(() => {
    observer.disconnect();
    console.log('🔍 MutationObserver stopped');
  }, 60000);
  
  console.log('✅ MutationObserver setup completed');
}

// Fungsi untuk setup retry mechanism yang lebih agresif
function setupAutoFillRetry() {
  console.log('🔄 Setting up auto fill retry mechanism...');
  
  // Clear interval sebelumnya jika ada
  if (autoFillRetryInterval) {
    clearInterval(autoFillRetryInterval);
  }
  
  autoFillRetryCount = 0;
  
  // Retry setiap 2 detik (lebih sering untuk slow internet)
  autoFillRetryInterval = setInterval(async () => {
    if (isAutoFillRunning) {
      console.log('⚠️ Auto fill sedang berjalan, skip retry...');
      return;
    }
    
    autoFillRetryCount++;
    console.log(`🔄 Auto fill retry ${autoFillRetryCount}/${maxAutoFillRetries}...`);
    
    // Cek apakah ada dropdown yang belum terisi
    const dropdowns = ['provinsi', 'kabupatenKota', 'kecamatan', 'kelurahanDesa'];
    let hasEmptyDropdown = false;
    let emptyDropdowns = [];
    
    for (const dropdownId of dropdowns) {
      const element = document.getElementById(dropdownId);
      if (element && (!element.value || element.value === '')) {
        hasEmptyDropdown = true;
        emptyDropdowns.push(dropdownId);
        console.log(`📋 Dropdown ${dropdownId} masih kosong`);
      }
    }
    
    if (hasEmptyDropdown) {
      console.log(`🚀 Retry: Memulai auto fill untuk dropdown kosong: ${emptyDropdowns.join(', ')}`);
      
      // Coba buka dropdown yang kosong untuk trigger load data
      for (const dropdownId of emptyDropdowns) {
        const element = document.getElementById(dropdownId);
        if (element) {
          console.log(`🔓 Membuka dropdown ${dropdownId} untuk trigger load data...`);
          
          // Method yang terbukti efektif untuk buka dropdown
          const select2Container = document.querySelector(`#select2-${dropdownId}-container`);
          if (select2Container) {
            select2Container.click();
          }
          element.click();
          
          // AJAX trigger
          if (select2Container) {
            select2Container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            select2Container.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            select2Container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
          
          // Keyboard events
          element.focus();
          element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
          
          // Select2 API
          if (typeof $ !== 'undefined' && $(element).data('select2')) {
            $(element).select2('open');
          }
        }
      }
      
      // Tunggu 1 detik untuk load data, lalu coba auto fill
      setTimeout(async () => {
        try {
          await triggerAutoFill();
        } catch (error) {
          console.error('❌ Error dalam retry auto fill:', error);
        }
      }, 1000);
      
    } else {
      console.log('✅ Semua dropdown sudah terisi, stop retry');
      clearInterval(autoFillRetryInterval);
      autoFillRetryInterval = null;
    }
    
    // Stop retry setelah max attempts
    if (autoFillRetryCount >= maxAutoFillRetries) {
      console.log('⏰ Max retry attempts reached, stopping...');
      clearInterval(autoFillRetryInterval);
      autoFillRetryInterval = null;
    }
  }, 2000); // Retry setiap 2 detik
  
  console.log('✅ Auto fill retry mechanism setup completed');
}

// Fungsi untuk mendeteksi slow internet dan menyesuaikan timeout
function detectSlowInternet(dropdownName, timeoutOccurred) {
  if (timeoutOccurred) {
    slowInternetDetectionCount++;
    console.log(`🐌 Slow internet detection: ${slowInternetDetectionCount}/${slowInternetThreshold} (${dropdownName})`);
    
    if (slowInternetDetectionCount >= slowInternetThreshold && !isSlowInternet) {
      isSlowInternet = true;
      console.log('🐌 Slow internet terdeteksi! Menggunakan timeout yang lebih panjang...');
      
      // Update retry interval menjadi lebih sering untuk slow internet
      if (autoFillRetryInterval) {
        clearInterval(autoFillRetryInterval);
        autoFillRetryInterval = setInterval(async () => {
          // Retry logic yang sama tapi dengan interval lebih sering
          if (isAutoFillRunning) {
            console.log('⚠️ Auto fill sedang berjalan, skip retry...');
            return;
          }
          
          autoFillRetryCount++;
          console.log(`🔄 Slow Internet Retry: ${autoFillRetryCount}/${maxAutoFillRetries}...`);
          
          // Cek dropdown kosong dan trigger auto fill
          const dropdowns = ['provinsi', 'kabupatenKota', 'kecamatan', 'kelurahanDesa'];
          let hasEmptyDropdown = false;
          let emptyDropdowns = [];
          
          for (const dropdownId of dropdowns) {
            const element = document.getElementById(dropdownId);
            if (element && (!element.value || element.value === '')) {
              hasEmptyDropdown = true;
              emptyDropdowns.push(dropdownId);
            }
          }
          
          if (hasEmptyDropdown) {
            console.log(`🚀 Slow Internet Retry: Memulai auto fill untuk dropdown kosong: ${emptyDropdowns.join(', ')}`);
            
            // Buka dropdown yang kosong untuk trigger load data
            for (const dropdownId of emptyDropdowns) {
              const element = document.getElementById(dropdownId);
              if (element) {
                const select2Container = document.querySelector(`#select2-${dropdownId}-container`);
                if (select2Container) {
                  select2Container.click();
                }
                element.click();
                
                if (select2Container) {
                  select2Container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                  select2Container.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                  select2Container.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }
                
                element.focus();
                element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
                
                if (typeof $ !== 'undefined' && $(element).data('select2')) {
                  $(element).select2('open');
                }
              }
            }
            
            // Tunggu 2 detik untuk load data, lalu coba auto fill
            setTimeout(async () => {
              try {
                await triggerAutoFill();
              } catch (error) {
                console.error('❌ Error dalam slow internet retry auto fill:', error);
              }
            }, 2000);
            
          } else {
            console.log('✅ Semua dropdown sudah terisi, stop slow internet retry');
            clearInterval(autoFillRetryInterval);
            autoFillRetryInterval = null;
          }
          
          if (autoFillRetryCount >= maxAutoFillRetries) {
            console.log('⏰ Max slow internet retry attempts reached, stopping...');
            clearInterval(autoFillRetryInterval);
            autoFillRetryInterval = null;
          }
        }, 1500); // Retry setiap 1.5 detik untuk slow internet
      }
    }
  }
}

// Fungsi untuk mendapatkan timeout berdasarkan kondisi internet
function getTimeoutForDropdown() {
  if (isSlowInternet) {
    return 30000; // 30 detik untuk slow internet
  } else {
    return 15000; // 15 detik untuk internet normal
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
    
    // Setup dropdown load trigger untuk mendeteksi dropdown yang terlambat diload
    setupDropdownLoadTrigger();
    
    // Setup MutationObserver untuk mendeteksi perubahan DOM
    setupMutationObserver();
    
    // Setup retry mechanism
    setupAutoFillRetry();
    
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
        // Jika di halaman form, setup trigger dan jalankan auto fill
        console.log('🚀 Memulai auto fill dropdown...');
        setupDropdownLoadTrigger();
        setupMutationObserver();
        setupAutoFillRetry();
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
        
        // Setup trigger sebelum navigate
        setupDropdownLoadTrigger();
        setupMutationObserver();
        setupAutoFillRetry();
        
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
        
        // Listen untuk perubahan value dropdown SLS dengan multiple events
        const handleSLSChange = () => {
          if (element.value && element.value !== '') {
            // Auto scroll ke bawah setelah dropdown SLS terisi
            setTimeout(() => {
              window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
              });
              console.log('📜 Auto scroll ke bawah setelah dropdown SLS terisi');
              
              // Highlight field "Nama Ketua SLS-Non-SLS" setelah scroll
              setTimeout(() => {
                highlightNamaKetuaField();
              }, 500);
            }, 200);
          }
        };
        
        // Event listener untuk berbagai event Select2
        element.addEventListener('change', handleSLSChange);
        element.addEventListener('select2:select', handleSLSChange);
        
        // Juga listen dengan jQuery jika tersedia
        if (typeof $ !== 'undefined' && $(element).data('select2')) {
          $(element).on('change', handleSLSChange);
          $(element).on('select2:select', handleSLSChange);
        }
        
        // Polling untuk memastikan event terdeteksi
        let lastValue = element.value;
        const checkValueChange = () => {
          if (element.value && element.value !== '' && element.value !== lastValue) {
            lastValue = element.value;
            handleSLSChange();
          }
        };
        
        // Check setiap 100ms selama 10 detik
        const pollInterval = setInterval(checkValueChange, 100);
        setTimeout(() => {
          clearInterval(pollInterval);
        }, 10000);
        
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
      
      // Delay 100ms untuk load data
      await delay(100);
      
                  // Tunggu opsi tersedia dengan timeout yang lebih panjang
                  let options;
                  let retryCount = 0;
                  const maxRetries = 3;
                  
                  while (retryCount < maxRetries) {
                    try {
                      // Coba dengan timeout berdasarkan kondisi internet
                      const timeout = getTimeoutForDropdown();
                      options = await waitForOptionsFast(dropdown.id, timeout);
                      break; // Berhasil, keluar dari loop
                    } catch (error) {
                      retryCount++;
                      console.log(`⚠️ ${dropdown.name}: Retry ${retryCount}/${maxRetries} - ${error.message}`);
                      
                      // Deteksi slow internet jika timeout
                      detectSlowInternet(dropdown.name, true);
                      
                      if (retryCount < maxRetries) {
                        // Coba buka dropdown lagi
                        const select2Container = document.querySelector(`#select2-${dropdown.id}-container`);
                        if (select2Container) {
                          select2Container.click();
                        }
                        element.click();
                        await delay(500); // Tunggu lebih lama untuk retry
                      } else {
                        // Jika gagal dengan timeout normal, coba dengan slow internet mode
                        console.log(`🐌 ${dropdown.name}: Mencoba slow internet mode...`);
                        try {
                          options = await waitForOptionsSlowInternet(dropdown.id, 30000);
                          console.log(`✅ ${dropdown.name}: Slow internet mode berhasil!`);
                          break;
                        } catch (slowError) {
                          console.log(`❌ ${dropdown.name}: Slow internet mode juga gagal - ${slowError.message}`);
                          throw error; // Gagal setelah semua metode
                        }
                      }
                    }
                  }
                  
                  // Pilih opsi dengan method tercepat
                  const selectedOption = await selectDropdownOptionInstant(dropdown, options);
                  
                  if (selectedOption) {
                    successCount++;
                    // Tunggu dropdown berikutnya enabled (50ms)
                    await delay(50);
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

// Fungsi tunggu opsi dengan timeout yang lebih panjang dan stability check
function waitForOptionsFast(elementId, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let lastOptionCount = 0;
    let stableCount = 0;
    
    const checkOptions = () => {
      const element = document.getElementById(elementId);
      if (!element) {
        reject(new Error(`Element ${elementId} tidak ditemukan`));
        return;
      }
      
      // Cari opsi di tempat yang terbukti efektif berdasarkan log berhasil
      let select2Options = [];
      let select2Results = [];
      let allSelect2Options = [];
      
      // 1. Cari di Select2 dropdown yang terbuka
      const select2Dropdown = document.querySelector('.select2-dropdown');
      if (select2Dropdown) {
        select2Options = select2Dropdown.querySelectorAll('.select2-results__option');
      }
      
      // 2. Cari di Select2 results container
      const select2ResultsContainer = document.querySelector('.select2-results__options');
      if (select2ResultsContainer) {
        select2Results = select2ResultsContainer.querySelectorAll('.select2-results__option');
      }
      
      // 3. Cari di semua elemen dengan class select2-results__option (terbukti efektif)
      allSelect2Options = document.querySelectorAll('.select2-results__option');
      
      // Gabungkan opsi yang efektif
      const allOptions = [...select2Options, ...select2Results, ...allSelect2Options];
      
      // Cek opsi valid (lebih fleksibel)
      const validOptions = allOptions.filter(option => {
        const text = option.textContent || option.innerText || '';
        const value = option.value || option.getAttribute('data-value') || '';
        return text.trim() !== '' && !text.includes('Pilih') && !text.includes('Loading') && !text.includes('Searching');
      });
      
      // Log minimal untuk performa
      if (allOptions.length > 0) {
        console.log(`🔍 ${elementId}: ${allOptions.length} opsi, ${validOptions.length} valid`);
      }
      
      // Cek apakah opsi sudah stabil (tidak bertambah lagi)
      if (allOptions.length === lastOptionCount && allOptions.length > 0) {
        stableCount++;
      } else {
        stableCount = 0;
        lastOptionCount = allOptions.length;
      }
      
      // Resolve jika ada opsi valid dan sudah stabil selama 3 check (150ms)
      if (validOptions.length > 0 && stableCount >= 3) {
        console.log(`✅ ${elementId}: Opsi stabil, ${validOptions.length} valid options`);
        resolve(validOptions);
      } else if (allOptions.length > 0 && stableCount >= 3) {
        // Gunakan opsi yang ada meskipun tidak valid
        console.log(`✅ ${elementId}: Opsi stabil, ${allOptions.length} total options`);
        resolve(allOptions);
      } else if (Date.now() - startTime > timeout) {
        // Jika timeout, coba resolve dengan opsi yang ada
        if (allOptions.length > 0) {
          console.log(`⚠️ ${elementId}: Timeout, menggunakan ${allOptions.length} opsi yang tersedia`);
          resolve(allOptions);
        } else {
          reject(new Error(`Options untuk ${elementId} tidak dimuat dalam ${timeout}ms`));
        }
      } else {
        setTimeout(checkOptions, 50); // Check setiap 50ms
      }
    };
    
    checkOptions();
  });
}

// Fungsi khusus untuk slow internet dengan timeout yang lebih panjang
function waitForOptionsSlowInternet(elementId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let lastOptionCount = 0;
    let stableCount = 0;
    let retryCount = 0;
    const maxRetries = 3;
    
    const checkOptions = () => {
      const element = document.getElementById(elementId);
      if (!element) {
        reject(new Error(`Element ${elementId} tidak ditemukan`));
        return;
      }
      
      // Cari opsi di tempat yang terbukti efektif
      let select2Options = [];
      let select2Results = [];
      let allSelect2Options = [];
      
      // 1. Cari di Select2 dropdown yang terbuka
      const select2Dropdown = document.querySelector('.select2-dropdown');
      if (select2Dropdown) {
        select2Options = select2Dropdown.querySelectorAll('.select2-results__option');
      }
      
      // 2. Cari di Select2 results container
      const select2ResultsContainer = document.querySelector('.select2-results__options');
      if (select2ResultsContainer) {
        select2Results = select2ResultsContainer.querySelectorAll('.select2-results__option');
      }
      
      // 3. Cari di semua elemen dengan class select2-results__option
      allSelect2Options = document.querySelectorAll('.select2-results__option');
      
      // Gabungkan opsi yang efektif
      const allOptions = [...select2Options, ...select2Results, ...allSelect2Options];
      
      // Cek opsi valid
      const validOptions = allOptions.filter(option => {
        const text = option.textContent || option.innerText || '';
        const value = option.value || option.getAttribute('data-value') || '';
        return text.trim() !== '' && !text.includes('Pilih') && !text.includes('Loading') && !text.includes('Searching');
      });
      
      // Log untuk slow internet
      if (allOptions.length > 0) {
        console.log(`🐌 Slow Internet ${elementId}: ${allOptions.length} opsi, ${validOptions.length} valid (${Math.round((Date.now() - startTime)/1000)}s)`);
      }
      
      // Cek apakah opsi sudah stabil
      if (allOptions.length === lastOptionCount && allOptions.length > 0) {
        stableCount++;
      } else {
        stableCount = 0;
        lastOptionCount = allOptions.length;
      }
      
      // Resolve jika ada opsi valid dan sudah stabil
      if (validOptions.length > 0 && stableCount >= 2) { // Lebih toleran untuk slow internet
        console.log(`✅ Slow Internet ${elementId}: Opsi stabil, ${validOptions.length} valid options`);
        resolve(validOptions);
      } else if (allOptions.length > 0 && stableCount >= 2) {
        console.log(`✅ Slow Internet ${elementId}: Opsi stabil, ${allOptions.length} total options`);
        resolve(allOptions);
      } else if (Date.now() - startTime > timeout) {
        // Jika timeout, coba retry dengan membuka dropdown lagi
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 Slow Internet ${elementId}: Timeout, retry ${retryCount}/${maxRetries}...`);
          
          // Buka dropdown lagi untuk trigger load data
          const select2Container = document.querySelector(`#select2-${elementId}-container`);
          if (select2Container) {
            select2Container.click();
          }
          element.click();
          
          // Reset counter dan coba lagi
          lastOptionCount = 0;
          stableCount = 0;
          setTimeout(checkOptions, 1000); // Tunggu 1 detik untuk retry
        } else {
          // Jika masih timeout setelah retry, coba resolve dengan opsi yang ada
          if (allOptions.length > 0) {
            console.log(`⚠️ Slow Internet ${elementId}: Max retry reached, menggunakan ${allOptions.length} opsi yang tersedia`);
            resolve(allOptions);
          } else {
            reject(new Error(`Options untuk ${elementId} tidak dimuat dalam ${timeout}ms setelah ${maxRetries} retry`));
          }
        }
      } else {
        setTimeout(checkOptions, 100); // Check setiap 100ms untuk slow internet
      }
    };
    
    checkOptions();
  });
}

// Fungsi pemilihan dropdown yang sangat cepat (instan)
async function selectDropdownOptionInstant(dropdown, options) {
  let selectedOption = null;
  
  if (dropdown.target) {
    // Cari opsi berdasarkan target
    selectedOption = Array.from(options).find(option => {
      const text = option.textContent || option.innerText || '';
      return text.includes(dropdown.target);
    });
  }
  
  if (!selectedOption && options.length > 0) {
    // Pilih opsi pertama yang valid
    selectedOption = Array.from(options).find(option => {
      const text = option.textContent || option.innerText || '';
      const value = option.value || option.getAttribute('data-value') || '';
      return value && value !== '' && !text.includes('Pilih') && !text.includes('Loading') && text.trim() !== '';
    });
  }
  
  if (selectedOption) {
    const element = document.getElementById(dropdown.id);
    const optionText = selectedOption.textContent || selectedOption.innerText || '';
    
    // Ekstrak value dari text jika perlu
    let optionValue = selectedOption.value || selectedOption.getAttribute('data-value') || '';
    if (!optionValue && optionText.includes(' - ')) {
      optionValue = optionText.split(' - ')[0].trim();
    }
    
    // Method yang terbukti efektif: Mouse events (minimal delay)
    try {
      selectedOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      selectedOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      selectedOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      await delay(50);
      
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
