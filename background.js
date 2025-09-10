// Background script untuk BPS-FRS Auto Input
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Cek apakah URL adalah dari BPS FRS
    if (!tab.url.includes('frs.bps.go.id')) {
      alert('Extension ini hanya bekerja di website BPS FRS!');
      return;
    }

    // Baca URL current tab
    const currentUrl = tab.url;
    console.log('URL saat ini:', currentUrl);

    // Cek apakah URL sudah memiliki pattern yang benar (6 digit di akhir)
    const urlPattern = /^https:\/\/frs\.bps\.go\.id\/area\/area\/ms\/\d{6}$/;
    
    if (!urlPattern.test(currentUrl)) {
      alert('URL tidak sesuai dengan pattern yang diharapkan!\nHarus: https://frs.bps.go.id/area/area/ms/XXXXXX');
      return;
    }

    // Tambahkan /sls/ubah/ubah-muatan ke URL
    const newUrl = currentUrl + '/sls/ubah/ubah-muatan';
    console.log('URL baru:', newUrl);

    // Update tab dengan URL baru
    await chrome.tabs.update(tab.id, { url: newUrl });
    
    // Notifikasi sukses
    console.log('URL berhasil dimodifikasi!');
    
  } catch (error) {
    console.error('Error:', error);
    alert('Terjadi kesalahan: ' + error.message);
  }
});

// Listen untuk pesan dari popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'modifyUrl') {
    modifyUrl(request.url, sendResponse);
    return true; // Indicates we will send a response asynchronously
  }
});

// Fungsi untuk memodifikasi URL
async function modifyUrl(url, sendResponse) {
  try {
    // Cek apakah URL adalah dari BPS FRS
    if (!url.includes('frs.bps.go.id')) {
      sendResponse({ success: false, error: 'Extension ini hanya bekerja di website BPS FRS!' });
      return;
    }

    // Cek apakah URL sudah memiliki pattern yang benar (6 digit di akhir)
    const urlPattern = /^https:\/\/frs\.bps\.go\.id\/area\/area\/ms\/\d{6}$/;
    
    if (!urlPattern.test(url)) {
      sendResponse({ success: false, error: 'URL tidak sesuai dengan pattern yang diharapkan! Harus: https://frs.bps.go.id/area/area/ms/XXXXXX' });
      return;
    }

    // Tambahkan /sls/ubah/ubah-muatan ke URL
    const newUrl = url + '/sls/ubah/ubah-muatan';
    console.log('URL baru:', newUrl);

    // Dapatkan tab aktif
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Update tab dengan URL baru
    await chrome.tabs.update(tab.id, { url: newUrl });
    
    sendResponse({ success: true, newUrl: newUrl });
    
  } catch (error) {
    console.error('Error:', error);
    sendResponse({ success: false, error: 'Terjadi kesalahan: ' + error.message });
  }
}

// Listener untuk tab update (opsional - untuk logging)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url.includes('frs.bps.go.id')) {
    console.log('Tab updated:', tab.url);
  }
});
