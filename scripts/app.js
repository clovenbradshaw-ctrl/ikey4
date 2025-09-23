(function() {
  const STORAGE_KEYS = {
    mode: 'ikey.profileMode',
    plain: 'ikey.profile',
    secure: 'ikey.secureProfile'
  };

  const state = {
    record: null,
    deferredPrompt: null,
    toastTimeout: null
  };

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) {
      alert(message);
      return;
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state.toastTimeout);
    state.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  function formatPayload(payload) {
    if (!payload) return '';
    const lines = [];
    if (payload.n) {
      lines.push(`Name: ${payload.n}`);
    }
    if (payload.e) {
      lines.push(`Email: ${payload.e}`);
    }
    if (Array.isArray(payload.c) && payload.c.length) {
      lines.push('Emergency contacts:');
      payload.c.forEach((contact, index) => {
        lines.push(`  ${index + 1}. ${contact}`);
      });
    }
    if (payload.m) {
      lines.push(`Medical notes: ${payload.m}`);
    }
    if (payload.note) {
      lines.push(`Notes: ${payload.note}`);
    }
    if (lines.length === 0) {
      lines.push('This QR stores your emergency info.');
    }
    return lines.join('\n');
  }

  function buildPayloadFromForm(form) {
    const payload = { v: 1 };
    const name = form.querySelector('#field-name');
    const email = form.querySelector('#field-email');
    const contacts = form.querySelector('#field-contacts');
    const medical = form.querySelector('#field-medical');
    const notes = form.querySelector('#field-note');

    if (name && name.value.trim()) {
      payload.n = name.value.trim();
    }
    if (email && email.value.trim()) {
      payload.e = email.value.trim();
    }
    if (contacts && contacts.value.trim()) {
      const contactList = contacts.value
        .split(/\n+/)
        .map(item => item.trim())
        .filter(Boolean);
      if (contactList.length) {
        payload.c = contactList;
      }
    }
    if (medical && medical.value.trim()) {
      payload.m = medical.value.trim();
    }
    if (notes && notes.value.trim()) {
      payload.note = notes.value.trim();
    }
    return payload;
  }

  function createRecord(payload) {
    const json = JSON.stringify(payload);
    const compressed = typeof LZString !== 'undefined'
      ? LZString.compressToEncodedURIComponent(json)
      : encodeURIComponent(json);
    const qrContent = `ikey:${compressed}`;
    return {
      payload,
      qrContent,
      qrImage: null,
      createdAt: Date.now()
    };
  }

  function makeQrImage(text) {
    return new Promise((resolve, reject) => {
      try {
        const temp = document.createElement('div');
        temp.style.position = 'fixed';
        temp.style.left = '-1000px';
        temp.style.top = '0';
        document.body.appendChild(temp);
        const qr = new QRCode(temp, {
          text,
          width: 512,
          height: 512,
          correctLevel: QRCode.CorrectLevel.H
        });
        setTimeout(() => {
          const canvas = temp.querySelector('canvas');
          const img = temp.querySelector('img');
          let dataUrl = '';
          if (canvas && canvas.toDataURL) {
            dataUrl = canvas.toDataURL('image/png');
          } else if (img && img.src) {
            dataUrl = img.src;
          }
          temp.remove();
          resolve(dataUrl);
        }, 0);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function saveRecord(record, mode, password) {
    localStorage.setItem(STORAGE_KEYS.mode, mode);
    if (mode === 'secure') {
      if (!password) {
        throw new Error('Password required for secure storage');
      }
      if (!window.secureStore || typeof window.secureStore.set !== 'function') {
        throw new Error('Secure storage unavailable');
      }
      await window.secureStore.set(STORAGE_KEYS.secure, record, password);
      localStorage.removeItem(STORAGE_KEYS.plain);
    } else {
      localStorage.setItem(STORAGE_KEYS.plain, JSON.stringify(record));
      localStorage.removeItem(STORAGE_KEYS.secure);
      if (window.secureStore && typeof window.secureStore.clear === 'function') {
        window.secureStore.clear();
      }
    }
    state.record = record;
  }

  async function loadRecord() {
    if (state.record) {
      return state.record;
    }
    const mode = localStorage.getItem(STORAGE_KEYS.mode);
    if (mode === 'secure') {
      if (!window.secureStore || typeof window.secureStore.get !== 'function') {
        return null;
      }
      try {
        const data = await window.secureStore.get(STORAGE_KEYS.secure);
        if (data) {
          state.record = data;
          return state.record;
        }
      } catch (err) {
        console.error('Failed to unlock secure profile', err);
        return null;
      }
    } else {
      const raw = localStorage.getItem(STORAGE_KEYS.plain);
      if (raw) {
        try {
          state.record = JSON.parse(raw);
          return state.record;
        } catch (err) {
          console.error('Failed to parse stored profile', err);
        }
      }
    }
    return null;
  }

  async function clearStoredRecord() {
    localStorage.removeItem(STORAGE_KEYS.plain);
    localStorage.removeItem(STORAGE_KEYS.secure);
    localStorage.removeItem(STORAGE_KEYS.mode);
    if (window.secureStore && typeof window.secureStore.clear === 'function') {
      window.secureStore.clear();
    }
    state.record = null;
  }

  async function shareLocation(options = {}) {
    const { email, name } = options;
    if (!navigator.geolocation) {
      showToast('Location not available on this device.');
      return false;
    }
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
    }).catch(error => {
      console.error('Failed to get location', error);
      showToast('Could not access your location.');
      return null;
    });
    if (!position) {
      return false;
    }
    const { latitude, longitude, accuracy } = position.coords;
    let address = '';
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
      if (resp.ok) {
        const data = await resp.json();
        address = data.display_name || '';
      }
    } catch (err) {
      console.warn('Reverse geocode failed', err);
    }
    const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    const lines = [];
    lines.push(name ? `${name}'s location:` : 'My location:');
    if (address) {
      lines.push(address);
    }
    lines.push(`Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    if (typeof accuracy === 'number' && !Number.isNaN(accuracy)) {
      lines.push(`Accuracy: ${Math.round(accuracy)} meters`);
    }
    lines.push(mapUrl);
    const payload = lines.join('\n');

    if (email) {
      const href = `mailto:${encodeURIComponent(email)}?subject=My%20Location&body=${encodeURIComponent(payload)}`;
      window.location.href = href;
      showToast('Opening your email app…');
      return true;
    }

    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: payload });
        showToast('Location ready to send.');
        return true;
      } catch (err) {
        console.warn('navigator.share failed', err);
      }
    }

    try {
      await copyToClipboard(payload);
      showToast('Location copied to clipboard.');
      return true;
    } catch (err) {
      console.warn('Clipboard copy failed', err);
      alert(payload);
      return false;
    }
  }

  function updateInstallButtons() {
    const installBtns = document.querySelectorAll('[data-install]');
    installBtns.forEach(btn => {
      btn.hidden = !state.deferredPrompt;
    });
  }

  async function promptInstall() {
    if (!state.deferredPrompt) {
      showToast('Use your browser menu to add to home screen.');
      return;
    }
    state.deferredPrompt.prompt();
    const choice = await state.deferredPrompt.userChoice;
    if (choice && choice.outcome === 'accepted') {
      showToast('Installing…');
    }
    state.deferredPrompt = null;
    updateInstallButtons();
  }

  async function renderRecord(record) {
    const qrImageEl = document.getElementById('qr-image');
    const textEl = document.getElementById('qr-text');
    const resultSection = document.getElementById('qr-result');
    if (!record || !qrImageEl || !resultSection) {
      return;
    }
    if (!record.qrImage) {
      record.qrImage = await makeQrImage(record.qrContent);
    }
    qrImageEl.src = record.qrImage;
    qrImageEl.alt = 'Emergency QR';
    qrImageEl.hidden = false;
    if (textEl) {
      textEl.textContent = formatPayload(record.payload);
    }
    resultSection.hidden = false;
    state.record = record;
  }

  function populateForm(payload) {
    if (!payload) {
      return;
    }
    const name = document.getElementById('field-name');
    const email = document.getElementById('field-email');
    const contacts = document.getElementById('field-contacts');
    const medical = document.getElementById('field-medical');
    const notes = document.getElementById('field-note');
    if (name) name.value = payload.n || '';
    if (email) email.value = payload.e || '';
    if (contacts) contacts.value = Array.isArray(payload.c) ? payload.c.join('\n') : '';
    if (medical) medical.value = payload.m || '';
    if (notes) notes.value = payload.note || '';
  }

  function initProtectToggle() {
    const toggle = document.getElementById('protect-toggle');
    const passwordRow = document.getElementById('password-fields');
    if (!toggle || !passwordRow) {
      return;
    }
    toggle.addEventListener('change', () => {
      passwordRow.hidden = !toggle.checked;
    });
  }

  async function initSetupPage() {
    const form = document.getElementById('profile-form');
    const toggle = document.getElementById('protect-toggle');
    const passwordInput = document.getElementById('field-password');
    const savePngBtn = document.getElementById('save-qr');
    const printBtn = document.getElementById('print-qr');
    const toggleTextBtn = document.getElementById('toggle-text');
    const showText = document.getElementById('qr-text');
    const openCardBtn = document.getElementById('open-card');
    const installBtn = document.querySelector('[data-install]');
    const shareBtn = document.getElementById('share-location');
    const exportBtn = document.getElementById('save-json');
    const clearBtn = document.getElementById('clear-profile');

    initProtectToggle();

    const storedMode = localStorage.getItem(STORAGE_KEYS.mode);
    if (toggle) {
      toggle.checked = storedMode === 'secure';
      const passwordRow = document.getElementById('password-fields');
      if (passwordRow) {
        passwordRow.hidden = !toggle.checked;
      }
    }

    const stored = await loadRecord();
    if (stored) {
      populateForm(stored.payload);
      await renderRecord(stored);
    }

    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = buildPayloadFromForm(form);
        const record = createRecord(payload);
        try {
          await renderRecord(record);
          const mode = toggle && toggle.checked ? 'secure' : 'plain';
          const password = mode === 'secure' && passwordInput ? passwordInput.value : '';
          if (mode === 'secure' && (!password || password.length < 4)) {
            showToast('Set a password with at least 4 characters.');
            return;
          }
          await saveRecord(record, mode, password);
          if (passwordInput) {
            passwordInput.value = '';
          }
          showToast('Your QR is ready.');
        } catch (err) {
          console.error('Failed to save profile', err);
          showToast('Could not save your QR.');
        }
      });
    }

    if (savePngBtn) {
      savePngBtn.addEventListener('click', () => {
        if (!state.record || !state.record.qrImage) {
          showToast('Generate your QR first.');
          return;
        }
        const link = document.createElement('a');
        link.href = state.record.qrImage;
        link.download = 'ikey-qr.png';
        link.click();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (!state.record) {
          showToast('Generate your QR first.');
          return;
        }
        const blob = new Blob([JSON.stringify(state.record.payload, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'ikey-profile.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 3000);
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        if (!state.record || !state.record.qrImage) {
          showToast('Generate your QR first.');
          return;
        }
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          showToast('Allow pop-ups to print.');
          return;
        }
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Print QR</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;}img{max-width:80vmin;max-height:80vmin;}</style></head><body><img src="${state.record.qrImage}" alt="Emergency QR"></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      });
    }

    if (toggleTextBtn && showText) {
      toggleTextBtn.addEventListener('click', () => {
        const expanded = showText.hidden === false;
        showText.hidden = expanded;
        toggleTextBtn.textContent = expanded ? 'Show text fallback' : 'Hide text';
      });
    }

    if (openCardBtn) {
      openCardBtn.addEventListener('click', () => {
        window.location.href = 'card.html';
      });
    }

    if (installBtn) {
      installBtn.addEventListener('click', promptInstall);
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        shareBtn.disabled = true;
        shareBtn.textContent = 'Locating…';
        const email = state.record && state.record.payload ? state.record.payload.e : (document.getElementById('field-email')?.value || '');
        const name = state.record && state.record.payload ? state.record.payload.n : (document.getElementById('field-name')?.value || '');
        await shareLocation({ email: email.trim() || undefined, name: name.trim() || undefined });
        shareBtn.disabled = false;
        shareBtn.textContent = 'Share my location';
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (!confirm('Remove your saved QR from this device?')) {
          return;
        }
        await clearStoredRecord();
        const resultSection = document.getElementById('qr-result');
        if (resultSection) {
          resultSection.hidden = true;
        }
        showToast('Saved QR removed.');
      });
    }
  }

  async function initHomePage() {
    const shareBtn = document.getElementById('home-share');
    const qrBtn = document.getElementById('home-qr');
    const summary = document.getElementById('home-summary');
    const favorites = document.getElementById('favorites');

    const record = await loadRecord();
    if (record && summary) {
      const payload = record.payload || {};
      const parts = [];
      if (payload.n) {
        parts.push(payload.n);
      }
      if (payload.m) {
        parts.push(payload.m);
      }
      summary.textContent = parts.length ? parts.join(' • ') : 'Your emergency QR is stored on this device.';
    }

    if (qrBtn) {
      qrBtn.addEventListener('click', () => {
        window.location.href = 'card.html';
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        shareBtn.disabled = true;
        shareBtn.textContent = 'Locating…';
        const payload = record ? record.payload : {};
        await shareLocation({
          email: payload && payload.e ? payload.e : undefined,
          name: payload && payload.n ? payload.n : undefined
        });
        shareBtn.disabled = false;
        shareBtn.textContent = 'Share my location';
      });
    }

    if (favorites) {
      const stored = JSON.parse(localStorage.getItem('ikey.favorites') || '[]');
      renderFavorites(favorites, stored);
      favorites.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;
        if (action === 'add') {
          const label = prompt('Label for this favorite (e.g., Mom, Shelter)');
          if (!label) return;
          const value = prompt('Phone number, URL, or text to copy');
          if (!value) return;
          stored.push({ label, value });
          localStorage.setItem('ikey.favorites', JSON.stringify(stored));
          renderFavorites(favorites, stored);
        } else if (action === 'use') {
          const index = parseInt(target.dataset.index, 10);
          const item = stored[index];
          if (!item) return;
          handleFavorite(item);
        } else if (action === 'remove') {
          const index = parseInt(target.dataset.index, 10);
          if (Number.isInteger(index)) {
            stored.splice(index, 1);
            localStorage.setItem('ikey.favorites', JSON.stringify(stored));
            renderFavorites(favorites, stored);
          }
        }
      });
    }

    if (window.location.hash === '#share' && shareBtn) {
      shareBtn.click();
    }
  }

  function renderFavorites(container, items) {
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'favorites-grid';
    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'No favorites yet. Tap + to add quick contacts.';
      container.appendChild(empty);
    }
    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'favorite-item';
      button.dataset.action = 'use';
      button.dataset.index = String(index);
      button.textContent = item.label;
      button.title = item.value;
      grid.appendChild(button);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'favorite-item add';
    add.dataset.action = 'add';
    add.textContent = '+';
    grid.appendChild(add);
    container.appendChild(grid);
    if (items.length) {
      const manage = document.createElement('div');
      manage.className = 'favorites-manage';
      items.forEach((item, index) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.dataset.action = 'remove';
        chip.dataset.index = String(index);
        chip.className = 'favorite-remove';
        chip.textContent = `Remove ${item.label}`;
        manage.appendChild(chip);
      });
      container.appendChild(manage);
    }
  }

  async function handleFavorite(item) {
    if (!item || !item.value) return;
    if (/^https?:/i.test(item.value)) {
      window.open(item.value, '_blank');
      return;
    }
    if (/^tel:/i.test(item.value)) {
      window.location.href = item.value;
      return;
    }
    if (/^\+?[\d\s()-]{5,}$/.test(item.value)) {
      window.location.href = `tel:${item.value.replace(/[^\d+]/g, '')}`;
      return;
    }
    await copyToClipboard(item.value);
    showToast('Copied to clipboard.');
  }

  async function initCardPage() {
    const qrImage = document.getElementById('card-qr');
    const textToggle = document.getElementById('card-toggle');
    const textBlock = document.getElementById('card-text');
    const installBtn = document.querySelector('[data-install]');
    const missing = document.getElementById('card-missing');

    const record = await loadRecord();
    if (!record || !record.qrContent) {
      if (missing) {
        missing.hidden = false;
      }
      return;
    }
    if (missing) {
      missing.hidden = true;
    }
    if (!record.qrImage) {
      record.qrImage = await makeQrImage(record.qrContent);
    }
    if (qrImage) {
      qrImage.src = record.qrImage;
      qrImage.alt = 'Emergency QR';
      qrImage.hidden = false;
    }
    if (textBlock) {
      textBlock.textContent = formatPayload(record.payload);
    }

    if (textToggle && textBlock) {
      textToggle.addEventListener('click', () => {
        const expanded = textBlock.hidden === false;
        textBlock.hidden = expanded;
        textToggle.textContent = expanded ? 'Show text' : 'Hide text';
      });
    }

    if (installBtn) {
      installBtn.addEventListener('click', promptInstall);
    }
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('Service worker registration failed', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    updateInstallButtons();
  });

  window.addEventListener('appinstalled', () => {
    state.deferredPrompt = null;
    updateInstallButtons();
    showToast('App installed.');
  });

  ready(() => {
    const page = document.body ? document.body.dataset.page : '';
    if (page === 'index') {
      initSetupPage();
    } else if (page === 'home') {
      initHomePage();
    } else if (page === 'card') {
      initCardPage();
    }
    updateInstallButtons();
  });

  window.ikeyApp = {
    loadRecord,
    shareLocation,
    formatPayload
  };
})();
