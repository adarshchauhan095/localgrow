/**
 * LocalGrow Multilingual Engine (i18n)
 * Supports Hinglish (Roman script) and English with instant switching,
 * localStorage persistence, and dynamic metadata updates.
 */

(function () {
  const STORAGE_KEY = 'localgrow_lang';
  const DEFAULT_LANG = 'hinglish';
  const SUPPORTED_LANGS = ['hinglish', 'en'];

  let currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  if (!SUPPORTED_LANGS.includes(currentLang)) {
    currentLang = DEFAULT_LANG;
  }

  const translations = {
    hinglish: null,
    en: null
  };

  /**
   * Helper to resolve nested key paths like 'hero.title'
   */
  function getNestedValue(obj, keyPath) {
    if (!obj || !keyPath) return null;
    const parts = keyPath.split('.');
    let cur = obj;
    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) {
        cur = cur[part];
      } else {
        return null;
      }
    }
    return cur;
  }

  /**
   * Fetch locale JSON files
   */
  async function loadLocale(lang) {
    if (translations[lang]) return translations[lang];
    try {
      // Relative path works with GitHub Pages repo root or subpaths
      const res = await fetch(`./locales/${lang}.json`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      translations[lang] = await res.json();
      return translations[lang];
    } catch (err) {
      console.warn(`[i18n] Failed to load locale "${lang}":`, err);
      // Fallback to empty
      return null;
    }
  }

  /**
   * Translate all elements in the DOM with data-i18n or data-i18n-attr
   */
  function translateDOM() {
    const dict = translations[currentLang];
    if (!dict) return;

    // 1. Text & HTML content
    const textEls = document.querySelectorAll('[data-i18n]');
    textEls.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = getNestedValue(dict, key);
      if (val !== null && val !== undefined) {
        // If content contains emoji or simple html markup, set innerHTML safely
        el.innerHTML = val;
      }
    });

    // 2. Attributes (e.g. placeholder, value, aria-label, title)
    // format: data-i18n-attr="placeholder:quote.namePlaceholder|title:quote.title"
    const attrEls = document.querySelectorAll('[data-i18n-attr]');
    attrEls.forEach(el => {
      const raw = el.getAttribute('data-i18n-attr');
      const rules = raw.split('|');
      rules.forEach(rule => {
        const [attrName, key] = rule.split(':');
        if (attrName && key) {
          const val = getNestedValue(dict, key.trim());
          if (val !== null && val !== undefined) {
            el.setAttribute(attrName.trim(), val);
          }
        }
      });
    });

    // 3. Document Title & Meta tags
    if (dict.meta) {
      if (dict.meta.title) {
        document.title = dict.meta.title;
      }
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && dict.meta.description) {
        metaDesc.setAttribute('content', dict.meta.description);
      }
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && dict.meta.title) {
        ogTitle.setAttribute('content', dict.meta.title);
      }
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && dict.meta.description) {
        ogDesc.setAttribute('content', dict.meta.description);
      }
    }

    // 4. Update <html> lang attribute
    document.documentElement.lang = currentLang === 'hinglish' ? 'hi-Latn' : 'en';

    // 5. Update language switchers buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      const btnLang = btn.getAttribute('data-lang');
      if (btnLang === currentLang) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    // Dispatch global event for custom scripts
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: currentLang } }));
  }

  /**
   * Change current language
   */
  async function setLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    await loadLocale(lang);
    translateDOM();
  }

  /**
   * Translate key directly
   */
  function t(key, fallback = '') {
    const dict = translations[currentLang];
    const val = getNestedValue(dict, key);
    return val !== null && val !== undefined ? val : fallback;
  }

  /**
   * Initialize i18n on page load
   */
  async function init() {
    await loadLocale(currentLang);
    translateDOM();

    // Bind click events on all language switchers
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetLang = btn.getAttribute('data-lang');
        if (targetLang && targetLang !== currentLang) {
          setLang(targetLang);
        }
      });
    });
  }

  // Expose API
  window.i18n = {
    init,
    setLang,
    getLang: () => currentLang,
    t,
    translateDOM
  };

  // Auto-run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
