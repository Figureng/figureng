/* FigureNG 2.0 Growth Layer
   Privacy-first analytics + AdSense readiness.
   No provider is activated until its ID is supplied below.
*/
(function(){
  'use strict';
  var CONFIG={
    analytics:{
      cloudflareWebAnalyticsToken:'',
      clarityProjectId:'',
      enabled:true
    },
    adsense:{
      enabled:false,
      publisherId:'',
      autoAds:true
    }
  };
  window.FigureNGGrowth={config:CONFIG};

  function loadScript(src,attrs){
    if(document.querySelector('script[src="'+src+'"]')) return;
    var s=document.createElement('script');s.src=src;s.async=true;
    Object.keys(attrs||{}).forEach(function(k){s.setAttribute(k,attrs[k])});
    document.head.appendChild(s);
  }

  function device(){
    var w=window.innerWidth||0;
    return w<600?'mobile':w<1024?'tablet':'desktop';
  }

  function sessionId(){
    try{
      var k='fg_session_id',v=localStorage.getItem(k);
      if(v)return v;
      v=(crypto&&crypto.randomUUID)?crypto.randomUUID():'fg-'+Date.now()+'-'+Math.random().toString(36).slice(2);
      localStorage.setItem(k,v);return v;
    }catch(e){return 'anonymous'}
  }

  function context(){
    return {
      path:location.pathname,
      title:document.title,
      referrer:document.referrer||'',
      device:device(),
      language:navigator.language||'',
      session_id:sessionId()
    };
  }

  function clarityTag(name,value){
    if(typeof window.clarity==='function'){
      try{window.clarity('set',name,String(value).slice(0,100))}catch(e){}
    }
  }

  window.FigureNGTrack=function(event,data){
    var payload=Object.assign({event:event,timestamp:new Date().toISOString()},context(),data||{});
    try{sessionStorage.setItem('fg_last_event',JSON.stringify(payload))}catch(e){}
    clarityTag('fg_event',event);
    if(payload.tool)clarityTag('fg_tool',payload.tool);
    window.dispatchEvent(new CustomEvent('figureng:analytics',{detail:payload}));
    return payload;
  };

  function loadAnalytics(){
    if(!CONFIG.analytics.enabled)return;
    if(CONFIG.analytics.clarityProjectId){
      (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,'clarity','script',CONFIG.analytics.clarityProjectId);
    }
    if(CONFIG.analytics.cloudflareWebAnalyticsToken){
      var beacon=document.createElement('script');beacon.defer=true;beacon.src='https://static.cloudflareinsights.com/beacon.min.js';beacon.setAttribute('data-cf-beacon',JSON.stringify({token:CONFIG.analytics.cloudflareWebAnalyticsToken}));document.head.appendChild(beacon);
    }
  }

  function loadAds(){
    var a=CONFIG.adsense;
    if(!a.enabled||!a.publisherId)return;
    var s=document.createElement('script');s.async=true;s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(a.publisherId);s.crossOrigin='anonymous';document.head.appendChild(s);
    document.documentElement.dataset.figurengAds='ready';
    window.adsbygoogle=window.adsbygoogle||[];
  }

  function wirePageSignals(){
    FigureNGTrack('page_view');
    document.addEventListener('click',function(e){
      var a=e.target.closest&&e.target.closest('a');
      if(a){FigureNGTrack('navigation_click',{target:a.getAttribute('href')||'',label:(a.textContent||'').trim().slice(0,100)})}
      var b=e.target.closest&&e.target.closest('button');
      if(b){FigureNGTrack('button_click',{label:(b.textContent||'').trim().slice(0,100)})}
    },{passive:true});
    var start=Date.now(),maxScroll=0;
    window.addEventListener('scroll',function(){
      var h=document.documentElement.scrollHeight-window.innerHeight;
      if(h>0)maxScroll=Math.max(maxScroll,Math.round((window.scrollY/h)*100));
    },{passive:true});
    window.addEventListener('pagehide',function(){FigureNGTrack('page_exit',{duration_seconds:Math.round((Date.now()-start)/1000),max_scroll_percent:maxScroll})},{once:true});
  }

  function init(){loadAnalytics();loadAds();wirePageSignals();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
