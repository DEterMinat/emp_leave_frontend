/**
 * i18n Engine for Employee Leave System
 */

const I18N = {
    currentLang: localStorage.getItem('appLang') || 'th',
    
    // Get translation by key
    t: function(key) {
        if (!window.TRANSLATIONS) return key;
        const keys = key.split('.');
        let result = window.TRANSLATIONS[this.currentLang];
        
        // Simple fallback
        if (!result) return key;
        result = result[key] || key;
        
        return result;
    },

    // Change language and update DOM
    setLanguage: function(lang) {
        if (lang !== 'th' && lang !== 'zh') return;
        this.currentLang = lang;
        localStorage.setItem('appLang', lang);
        document.documentElement.lang = lang;
        
        this.updateDOM();
        this.updateSwitcherUI();
        
        // Trigger a custom event in case plugins/components need to re-render
        window.dispatchEvent(new Event('languageChanged'));
    },

    // Scan DOM for data-i18n attributes and replace it
    updateDOM: function() {
        if (!window.TRANSLATIONS) return;

        // Text content replacement
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation !== key) {
                // Keep inner contents (like lucide icons) if applicable, 
                // but for simple text nodes, just replace textContent.
                // For safety, if there are child elements, only replace the text nodes.
                if (el.children.length === 0) {
                    el.textContent = translation;
                } else {
                    // It has children (like icons), replace the first text node or find the span
                    const span = el.querySelector('span');
                    if (span) {
                        span.textContent = translation;
                    } else {
                        // Just replace child text nodes
                        for (let node of el.childNodes) {
                            if (node.nodeType === 3 && node.nodeValue.trim().length > 0) {
                                node.nodeValue = " " + translation + " ";
                                break;
                            }
                        }
                    }
                }
            }
        });

        // Placeholder replacement
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation !== key) {
                el.placeholder = translation;
            }
        });
    },

    // Render / Update visual Language Switcher Dropdown
    initSwitcher: function() {
        const containers = document.querySelectorAll('.lang-switcher-container');
        if (containers.length === 0) return;

        containers.forEach(container => {
            container.innerHTML = `
                <div class="relative inline-block text-left group">
                    <button type="button" class="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none" id="lang-menu-button">
                        <span id="current-lang-flag" class="mr-2">${this.currentLang === 'th' ? '🇹🇭' : '🇨🇳'}</span>
                        <span id="current-lang-text">${this.currentLang === 'th' ? 'TH' : 'ZH'}</span>
                        <svg class="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>

                    <!-- Dropdown menu wrapper with transparent padding gap to maintain hover -->
                    <div class="origin-top-right absolute right-0 pt-2 w-32 hidden group-hover:block z-50">
                        <div class="rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 transition-all duration-200">
                            <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="lang-menu-button">
                                <button onclick="I18N.setLanguage('th')" class="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                                    <span class="mr-3">🇹🇭</span> ภาษาไทย
                                </button>
                                <button onclick="I18N.setLanguage('zh')" class="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                                    <span class="mr-3">🇨🇳</span> 中文
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    },

    updateSwitcherUI: function() {
        const flag = document.getElementById('current-lang-flag');
        const text = document.getElementById('current-lang-text');
        if (flag) flag.textContent = this.currentLang === 'th' ? '🇹🇭' : '🇨🇳';
        if (text) text.textContent = this.currentLang === 'th' ? 'TH' : 'ZH';
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    I18N.initSwitcher();
    I18N.updateDOM();
});
