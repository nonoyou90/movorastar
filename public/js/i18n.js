const I18N = {
  currentLang: localStorage.getItem('movorastar_lang') || 'en',
  translations: {},

  async init() {
    this.currentLang = localStorage.getItem('movorastar_lang') || 'en';
    await this.load(this.currentLang);
    this.apply();
  },

  async load(lang) {
    try {
      const res = await fetch(`/lang/${lang}.json`);
      if (!res.ok) throw new Error('Not found');
      this.translations = await res.json();
    } catch {
      const res = await fetch('/lang/en.json');
      this.translations = await res.json();
      this.currentLang = 'en';
      localStorage.setItem('movorastar_lang', 'en');
    }
  },

  t(key) {
    return this.translations[key] !== undefined ? this.translations[key] : key;
  },

  apply() {
    document.documentElement.lang = this.currentLang;
    document.documentElement.dir = this.currentLang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', this.currentLang === 'ar');
    document.body.style.fontFamily = this.currentLang === 'ar' ? "'Cairo',sans-serif" : "'Inter',sans-serif";

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.innerHTML = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });

    if (this.translations.siteTitle) {
      document.title = this.t('siteTitle');
    }

    const toggle = document.getElementById('langToggle');
    if (toggle) {
      toggle.querySelectorAll('.lang-opt').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
      });
    }

    const label = document.getElementById('langLabel');
    if (label) label.textContent = this.currentLang.toUpperCase();

    document.querySelectorAll('#langDropdown .nav-lang-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
    });
  },

  async toggle(lang) {
    if (lang === this.currentLang) return;
    this.currentLang = lang;
    localStorage.setItem('movorastar_lang', this.currentLang);
    await this.load(this.currentLang);
    this.apply();
  }
};
