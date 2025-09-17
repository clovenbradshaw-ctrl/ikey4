const translations = {};

function getTranslationsUrl() {
  try {
    const currentScript = document.currentScript || document.querySelector('script[src*="translate.js"]');
    if (currentScript && currentScript.src) {
      return new URL('../TRANSLATION_TERMS.md', currentScript.src).toString();
    }
  } catch (err) {
    console.warn('Unable to resolve translation URL from script tag, falling back to relative path.', err);
  }
  return 'TRANSLATION_TERMS.md';
}

function loadTranslations() {
  return fetch(getTranslationsUrl())
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
      const saved = localStorage.getItem('language') || 'en';
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
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.dataset.i18nTitle, el.getAttribute('title') || ''));
  });
  root.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
    el.setAttribute('data-tooltip', t(el.dataset.i18nTooltip, el.getAttribute('data-tooltip') || ''));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder, el.getAttribute('placeholder') || ''));
  });
  applyDynamicPlaceholders(root);
}

function applyDynamicPlaceholders(root = document) {
  const currentYear = new Date().getFullYear();
  root.querySelectorAll('[data-year-placeholder]').forEach(el => {
    const template = el.getAttribute('data-year-template') || el.textContent;
    el.setAttribute('data-year-template', template);
    el.textContent = template.replace(/\{\{\s*year\s*\}\}/gi, currentYear);
  });
}

function setLanguage(lang) {
  document.documentElement.lang = lang;
  localStorage.setItem('language', lang);
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
window.t = t;
window.setLanguage = setLanguage;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadTranslations, { once: true });
} else {
  loadTranslations();
}
