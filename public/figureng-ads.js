(() => {
  async function init() {
    try {
      const r = await fetch('/api/site-config', { cache: 'no-store' });
      const j = await r.json();
      const a = j.settings?.ads;
      if (!a?.enabled || !a.publisher_id) return;
      if (!document.querySelector('script[data-figureng-adsense]')) {
        const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous'; s.dataset.figurengAdsense = '1';
        s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(a.publisher_id)}`; document.head.appendChild(s);
      }
      const make = (slot,label) => { if(!slot)return null; const wrap=document.createElement('div'); wrap.className=`figureng-ad figureng-ad-${label}`; wrap.setAttribute('aria-label','Advertisement'); const ins=document.createElement('ins'); ins.className='adsbygoogle'; ins.style.display='block'; ins.dataset.adClient=a.publisher_id; ins.dataset.adSlot=slot; ins.dataset.adFormat='auto'; ins.dataset.fullWidthResponsive='true'; wrap.appendChild(ins); return wrap; };
      const style=document.createElement('style'); style.textContent='.figureng-ad{width:min(100%,1100px);margin:18px auto;text-align:center}.figureng-ad-sidebar{margin:0 0 18px}.figureng-ad ins{min-height:90px}'; document.head.appendChild(style);
      const header=document.querySelector('header'), main=document.querySelector('main');
      const top=make(a.top_slot,'top'); if(top&&main)main.parentNode.insertBefore(top,main); else if(top&&header)header.insertAdjacentElement('afterend',top);
      const article=document.querySelector('article,.article,[data-article]'), content=make(a.content_slot,'content'); if(content&&article){const h2=article.querySelector('h2'); if(h2)h2.parentNode.insertBefore(content,h2); else article.appendChild(content);}
      const aside=document.querySelector('aside'), side=make(a.sidebar_slot,'sidebar'); if(side&&aside)aside.insertBefore(side,aside.firstChild);
      const bottom=make(a.bottom_slot,'bottom'), footer=document.querySelector('footer'); if(bottom&&footer)footer.parentNode.insertBefore(bottom,footer); else if(bottom&&main)main.appendChild(bottom);
      try{document.querySelectorAll('.adsbygoogle').forEach(()=> (window.adsbygoogle=window.adsbygoogle||[]).push({}))}catch{}
    } catch {}
  }
  window.FigureNGAds={init}; init();
})();
