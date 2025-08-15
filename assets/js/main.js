// Global helpers (no modules needed)
(function() {
    function $(sel, root = document) { return root.querySelector(sel); }

    function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }
    const store = {
        get: (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; } },
        set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
        del: (k) => localStorage.removeItem(k),
    };

    // expose globals
    window.$ = $;
    window.$all = $all;
    window.store = store;

    // "h" to go Home (works anywhere)
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'h' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
            // best‑effort relative home
            const toRoot = location.pathname.includes('/tools/') ? '../index.html' : 'index.html';
            location.href = toRoot;
        }
    });
})();