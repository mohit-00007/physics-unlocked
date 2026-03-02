/* ============================================================
   PHYSICS UNLOCKED — Analytics v2.0
   Lightweight, privacy-respecting conversion tracking
   Stored locally — no external services
   ============================================================ */

(function () {
  'use strict';

  const STORE_KEY = 'pu-analytics-v2';
  const SESSION_KEY = 'pu-session';

  /* ── Load or initialise data store ──────────────────────── */
  let data;
  try {
    data = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch (_) {
    data = {};
  }

  if (!data.sessions)     data.sessions = 0;
  if (!data.events)       data.events   = {};
  if (!data.pageViews)    data.pageViews = {};
  if (!data.firstVisit)   data.firstVisit = new Date().toISOString();
  data.lastVisit = new Date().toISOString();

  /* ── Session detection ───────────────────────────────────── */
  const sessionExists = sessionStorage.getItem(SESSION_KEY);
  if (!sessionExists) {
    sessionStorage.setItem(SESSION_KEY, '1');
    data.sessions = (data.sessions || 0) + 1;
  }

  /* ── Page view tracking ──────────────────────────────────── */
  const page = location.pathname.split('/').pop() || 'index.html';
  data.pageViews[page] = (data.pageViews[page] || 0) + 1;

  /* ── Save helper ─────────────────────────────────────────── */
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  save();

  /* ── Log event ───────────────────────────────────────────── */
  function log(event, meta) {
    data.events[event] = (data.events[event] || 0) + 1;
    if (meta) {
      if (!data.meta) data.meta = {};
      data.meta[event] = meta;
    }
    save();
    // Debug in dev
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      console.info('[Analytics]', event, meta || '');
    }
  }

  /* ── Click tracking ──────────────────────────────────────── */
  document.addEventListener('click', e => {
    const target = e.target.closest('a, button');
    if (!target) return;

    // WhatsApp button
    if (target.id === 'wa-btn' || (target.href && target.href.includes('wa.me'))) {
      log('whatsapp_click', { page });
      return;
    }

    // Apply / Google Form buttons
    if (target.href && (target.href.includes('forms.gle') || target.href.includes('docs.google.com/forms'))) {
      log('apply_click', { page });
      return;
    }

    // Nav links
    if (target.classList.contains('nav-link')) {
      log('nav_click', { to: target.getAttribute('href'), from: page });
    }
  });

  /* ── Scroll depth ────────────────────────────────────────── */
  const scrollMilestones = { 25: false, 50: false, 75: false, 90: false };

  window.addEventListener('scroll', () => {
    const pct = Math.round(
      ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
    );
    Object.keys(scrollMilestones).forEach(milestone => {
      if (!scrollMilestones[milestone] && pct >= parseInt(milestone)) {
        scrollMilestones[milestone] = true;
        log(`scroll_${milestone}`, { page });
      }
    });
  }, { passive: true });

  /* ── Time on page ────────────────────────────────────────── */
  const pageStart = Date.now();
  window.addEventListener('beforeunload', () => {
    const seconds = Math.round((Date.now() - pageStart) / 1000);
    log('time_on_page', { page, seconds });
  });

  /* ── Expose for debugging ────────────────────────────────── */
  window.__puAnalytics = {
    getData:  ()  => ({ ...data }),
    reset:    ()  => { localStorage.removeItem(STORE_KEY); },
    logEvent: log,
  };

})();
