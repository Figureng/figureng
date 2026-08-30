(() => {
  const KEY = 'figureng_analytics_v1';
  const raw = localStorage.getItem(KEY);
  const ids = raw ? JSON.parse(raw) : { visitor: crypto.randomUUID(), session: crypto.randomUUID() };
  if (!raw) localStorage.setItem(KEY, JSON.stringify(ids));
  let started = Date.now();
  const page = location.pathname + location.search;
  const send = (event, extra = {}, keepalive = true) => {
    const payload = { event, path: page, title: document.title.slice(0, 200), referrer: document.referrer.slice(0, 500), visitor_id: ids.visitor, session_id: ids.session, duration_ms: extra.duration_ms || 0, metadata: extra.metadata || '' };
    try {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon && keepalive) navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
      else fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
    } catch {}
  };
  send('page_view', {}, false);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (a) {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('/') && !href.startsWith('//')) send('navigation', { metadata: JSON.stringify({ href }) }, false);
    }
    const tool = e.target.closest('[data-analytics-tool]');
    if (tool) send('tool_open', { metadata: JSON.stringify({ tool: tool.dataset.analyticsTool }) }, false);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send('engagement', { duration_ms: Date.now() - started });
  });
  window.addEventListener('pagehide', () => send('engagement', { duration_ms: Date.now() - started }));
  window.FigureNGAnalytics = { track: (event, metadata = {}) => send(event, { metadata: JSON.stringify(metadata) }, false) };
})();
