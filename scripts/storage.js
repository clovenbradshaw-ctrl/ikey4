(function() {
  const memoryStore = {};
  let warned = false;

  function getMessage() {
    const fallback = 'Browser storage is unavailable. Settings will not be saved.';
    return (typeof t === 'function') ? t('errors.storage', fallback) : fallback;
  }

  function showWarning(e) {
    console.error('Storage access failed:', e);
    if (warned) return;
    warned = true;
    const banner = document.createElement('div');
    banner.textContent = getMessage();
    banner.style.background = '#f44336';
    banner.style.color = '#fff';
    banner.style.padding = '8px';
    banner.style.textAlign = 'center';
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.zIndex = '1000';
    const append = () => document.body.prepend(banner);
    if (document.body) append();
    else document.addEventListener('DOMContentLoaded', append, { once: true });
  }

  const origGet = Storage.prototype.getItem;
  const origSet = Storage.prototype.setItem;
  const origRemove = Storage.prototype.removeItem;

  Storage.prototype.getItem = function(key) {
    try {
      return origGet.call(this, key);
    } catch (e) {
      showWarning(e);
      return memoryStore[key] || null;
    }
  };

  Storage.prototype.setItem = function(key, value) {
    try {
      return origSet.call(this, key, value);
    } catch (e) {
      showWarning(e);
      memoryStore[key] = String(value);
    }
  };

  Storage.prototype.removeItem = function(key) {
    try {
      return origRemove.call(this, key);
    } catch (e) {
      showWarning(e);
      delete memoryStore[key];
    }
  };
})();
