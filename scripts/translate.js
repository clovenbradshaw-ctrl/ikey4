const translations = {};
function loadTranslations() {
  return fetch('TRANSLATION_TERMS.md')
    .then(resp => resp.text())
    .then(text => {
      try {
        Object.assign(translations, JSON.parse(text));
      } catch (e) {
        console.error('Failed to parse translations:', e);
      }
    })
    .catch(err => {
      console.error('Failed to load translations:', err);
    })
    .finally(() => {
      let saved = 'en';
      try {
        saved = localStorage.getItem('language') || 'en';
      } catch (e) {
        console.warn('Storage unavailable, defaulting to English', e);
      }
      setLanguage(saved);
    });
}

function t(key, fallback = '') {
  const lang = document.documentElement.lang || 'en';
  const dict = translations[lang] || {};
  let text = dict;
  key.split('.').forEach(k => { if (text) text = text[k]; });
  return text || fallback;
}

function translateFragment(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n, el.textContent);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria, el.getAttribute('aria-label') || ''));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder, el.getAttribute('placeholder') || ''));
  });
}

function setLanguage(lang) {
  document.documentElement.lang = lang;
  try {
    localStorage.setItem('language', lang);
  } catch (e) {
    console.warn('Failed to save language preference', e);
  }
  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  translateFragment(document);
}

const languageBtn = document.getElementById('language-btn');
const languageMenu = document.getElementById('language-menu');
if (languageBtn && languageMenu) {
  languageBtn.addEventListener('click', () => {
    languageMenu.classList.toggle('show');
  });
  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
      languageMenu.classList.remove('show');
    });
  });
}

window.translateFragment = translateFragment;

document.addEventListener('DOMContentLoaded', loadTranslations);
