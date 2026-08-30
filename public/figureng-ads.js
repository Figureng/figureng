(() => {
  async function init() {
    try {
      const r = await fetch('/api/site-config', { cache: 'no-store' });
      const j = await r.json();
      const a = j.settings?.ads;
      if (!a?.enabled || !a.publisher_id) return;
      if (!document.querySelector('script[data-figureng-adsense]')) {
        const s = document.createElement('script');
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.dataset.figurengAdsense = '1';
        s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(a.publisher_id)}`;
        document.head.appendChild(s);
      }
      document.querySelectorAll('[data-ad-slot]').forEach(el => {
        const slot = el.dataset.adSlot || '';
        if (!slot || el.querySelector('.adsbygoogle')) return;
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.dataset.adClient = a.publisher_id;
        ins.dataset.adSlot = slot;
        ins.dataset.adFormat = 'auto';
        ins.dataset.fullWidthResponsive = 'true';
        el.appendChild(ins);
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
      });
    } catch {}
  }
  window.FigureNGAds = { init };
  init();
})();
