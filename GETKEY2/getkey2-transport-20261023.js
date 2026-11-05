(function () {
    'use strict';
    if (window.__OT6_GETKEY2_TRANSPORT_V1__) return;
    window.__OT6_GETKEY2_TRANSPORT_V1__ = true;
    var script = document.currentScript;
    var csrf = script ? script.getAttribute('data-v6-csrf') || '' : '';
    function owned(input) {
        try {
            var value = typeof input === 'string' ? input : input instanceof URL ? input.href : input && input.url;
            if (!value) return false;
            var url = new URL(value, location.href);
            return url.origin === location.origin && url.pathname.indexOf('/GETKEY2/') === 0;
        } catch (_) { return false; }
    }
    function inspectClient() {
        var timeZone = '';
        try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) {}
        var languages = [];
        try {
            var raw = Array.prototype.slice.call(navigator.languages || []);
            if (navigator.language && raw.indexOf(navigator.language) === -1) raw.unshift(navigator.language);
            languages = raw.slice(0, 8).filter(function (x) { return typeof x === 'string'; }).map(function (x) { return x.slice(0, 35); });
        } catch (_) {}
        var locales = [];
        try {
            [Intl.DateTimeFormat, Intl.NumberFormat, Intl.Collator].forEach(function (Ctor) {
                if (typeof Ctor === 'function') {
                    var loc = Ctor().resolvedOptions().locale;
                    if (typeof loc === 'string' && loc && locales.indexOf(loc) === -1) locales.push(loc.slice(0, 35));
                }
            });
        } catch (_) {}
        var dateCjk = false;
        try {
            dateCjk = /[\u4e00-\u9fff]/.test(new Date().toString()) || /[\u4e00-\u9fff]/.test(new Date().toLocaleTimeString());
        } catch (_) {}
        return {
            v: 1,
            timeZone: timeZone.slice(0, 80),
            languages: languages,
            locales: locales.slice(0, 6),
            dateCjk: Boolean(dateCjk)
        };
    }
    function isRestrictedClient(info) {
        var primaryLang = info.languages[0] || '';
        var primaryLoc = info.locales[0] || '';
        if (/^zh(?:$|-(?:CN|Hans|SG)(?:-|$))/i.test(primaryLang)) return true;
        if (/^zh(?:$|-(?:CN|Hans|SG)(?:-|$))/i.test(primaryLoc)) return true;
        if (info.dateCjk) return true;
        return false;
    }
    function environment() {
        var info = inspectClient();
        return JSON.stringify(info).replace(/[\u007f-\uffff]/g, function (c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); });
    }
    try {
        if (isRestrictedClient(inspectClient())) {
            try { window.stop(); } catch (_) {}
            document.documentElement.innerHTML = '<head><meta charset="UTF-8"><style>html,body{margin:0;background:#0a0a0a}</style></head><body></body>';
            return;
        }
    } catch (_) {}
    var originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        var result = originalOpen.apply(this, arguments);
        if (owned(url)) { this.setRequestHeader('X-V6-Getkey2-CSRF', csrf); this.setRequestHeader('X-V6-Getkey2-Env', environment()); }
        return result;
    };
    var originalFetch = window.fetch;
    if (typeof originalFetch === 'function') window.fetch = function (input, init) {
        if (owned(input)) {
            init = Object.assign({}, init || {});
            init.headers = new Headers(init.headers || (typeof input === 'object' ? input.headers : undefined));
            init.headers.set('X-V6-Getkey2-CSRF', csrf);
            init.headers.set('X-V6-Getkey2-Env', environment());
        }
        return originalFetch.call(this, input, init);
    };
    function prepare(form) {
        if (!form || form.id !== 'verifyForm') return;
        // <input name="action"> shadows HTMLFormElement.action on the real page.
        if (!owned(form.getAttribute('action') || location.href)) {
            form.querySelectorAll('input[data-ot6-region-field]').forEach(function (input) { input.remove(); });
            return;
        }
        var fields = { v6_getkey2_csrf: csrf, v6_getkey2_env: environment() };
        Object.keys(fields).forEach(function (name) {
            var input = form.querySelector('input[name="' + name + '"]');
            if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.setAttribute('data-ot6-region-field', '1'); form.appendChild(input); }
            input.value = fields[name];
        });
    }
    function ready() { prepare(document.getElementById('verifyForm')); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
    document.addEventListener('submit', function (event) { prepare(event.target); }, true);
}());
