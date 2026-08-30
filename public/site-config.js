/* FigureNG 2.0 public bootstrap. Admin and analytics remain isolated. */
(function(){
  'use strict';
  var path=location.pathname||'';
  if(path==='/admin.html'||path==='/analytics.html')return;
  function add(type,attrs){var e=document.createElement(type);Object.keys(attrs).forEach(function(k){e.setAttribute(k,attrs[k])});document.head.appendChild(e);return e;}
  add('link',{rel:'stylesheet',href:'/figureng-2.css?v=2'});
  add('link',{rel:'stylesheet',href:'/figureng-2-overrides.css?v=2'});
  add('link',{rel:'stylesheet',href:'/figureng-shell.css?v=1'});
  add('script',{src:'/figureng-growth.js?v=1',defer:'true'});
  add('script',{src:'/figureng-shell.js?v=1',defer:'true'});
  document.documentElement.dataset.figurengVersion='2.0';
  fetch('/api/site-config',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(data){
    if(!data||!data.settings)return;
    var s=data.settings;
    document.querySelectorAll('[data-figureng-site-name]').forEach(function(el){el.textContent=s.site_name||'FigureNG'});
    document.querySelectorAll('[data-figureng-tagline]').forEach(function(el){el.textContent=s.site_tagline||''});
  }).catch(function(){});
})();
