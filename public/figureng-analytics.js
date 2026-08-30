(() => {
  if (location.pathname === '/admin.html' || location.pathname === '/analytics.html') return;
  const VISITOR_KEY = 'figureng_visitor_v1';
  const SESSION_KEY = 'figureng_session_v1';
  let visitor = localStorage.getItem(VISITOR_KEY);
  if (!visitor) { visitor = crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, visitor); }
  let session = sessionStorage.getItem(SESSION_KEY);
  if (!session) { session = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, session); }
  const started = Date.now();
  const page = location.pathname + location.search;
  const send = (event, extra = {}, keepalive = true) => {
    const payload = { event, path: page, title: document.title.slice(0, 200), referrer: document.referrer.slice(0, 500), visitor_id: visitor, session_id: session, duration_ms: Math.min(Date.now() - started, 86400000), metadata: extra.metadata || '' };
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
    if (document.visibilityState === 'hidden') send('engagement');
  });
  window.addEventListener('pagehide', () => send('engagement'));
  window.FigureNGAnalytics = { track: (event, metadata = {}) => send(event, { metadata: JSON.stringify(metadata) }, false) };
})();
