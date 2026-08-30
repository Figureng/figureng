/* FigureNG 2.0 global identity, navigation and content presentation layer. */
(function(){
  var css=document.createElement('link');css.rel='stylesheet';css.href='/figureng-2.css?v=2';document.head.appendChild(css);
  var overrides=document.createElement('link');overrides.rel='stylesheet';overrides.href='/figureng-2-overrides.css?v=2';document.head.appendChild(overrides);
  document.documentElement.dataset.figurengVersion='2.0';
  fetch('/api/site-config',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(data){
    if(!data||!data.settings)return;
    var s=data.settings;
    document.querySelectorAll('[data-figureng-site-name]').forEach(function(el){el.textContent=s.site_name||'FigureNG'});
    document.querySelectorAll('[data-figureng-tagline]').forEach(function(el){el.textContent=s.site_tagline||''});
    var navs=document.querySelectorAll('nav.nav, nav#nav, .nav');
    if(Array.isArray(s.nav_items)) navs.forEach(function(nav){var items=s.nav_items.filter(function(x){return x&&x.enabled!==false&&x.label&&x.url});if(items.length)nav.innerHTML=items.map(function(x){var a=document.createElement('a');a.href=x.url;a.textContent=x.label;return a.outerHTML}).join('')});
    document.querySelectorAll('.help').forEach(function(el){if((el.textContent||'').toLowerCase().includes('cloudflare r2'))el.textContent='Uploaded images are stored in FigureNG database storage. Images should be 700 KB or smaller.'});
  }).catch(function(){});
})();
