/* FigureNG 2.0 public shell. Keeps public pages visually consistent without touching admin/analytics. */
(function(){
'use strict';
var p=location.pathname||'';
if(p==='/admin.html'||p==='/analytics.html')return;
document.documentElement.classList.add('fg-public');
function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
function text(el){return (el&&el.textContent||'').trim()}
function injectShell(){
 var old=document.querySelector('header.header,header.site-header,.site-header');
 if(!old){
   var h=document.createElement('header');h.className='fg-shell-header';
   h.innerHTML='<div class="fg-shell-inner"><a class="fg-shell-logo" href="/"><span>FG</span>Figure<em>NG</em></a><nav class="fg-shell-nav"><a href="/calculators.html">Calculators</a><a href="/guides.html">Guides</a><a href="/about.html">About</a><a class="fg-shell-cta" href="/calculators.html">Start calculating</a></nav><button class="fg-shell-menu" type="button" aria-label="Open menu">☰</button></div>';
   document.body.insertBefore(h,document.body.firstChild);
 } else old.classList.add('fg-legacy-header');
 var nav=document.querySelector('.fg-shell-nav');
 var menu=document.querySelector('.fg-shell-menu');
 if(menu&&nav)menu.addEventListener('click',function(){nav.classList.toggle('fg-open')});
}
function decorateCalculator(){
 var path=p.toLowerCase();
 var isCalc=path.indexOf('calculator')>-1||path.indexOf('converter')>-1||document.querySelector('.calculator,.calculator-container,.calculator-card,.calc-container');
 if(!isCalc)return;
 document.body.classList.add('fg-calculator-page');
 document.querySelectorAll('input,select,textarea').forEach(function(el){el.classList.add('fg-input')});
 document.querySelectorAll('button').forEach(function(el){if(!el.classList.contains('fg-shell-menu'))el.classList.add('fg-action')});
 document.querySelectorAll('h1').forEach(function(h){h.classList.add('fg-page-title')});
}
function addFooter(){
 if(document.querySelector('.fg-shell-footer'))return;
 var f=document.createElement('footer');f.className='fg-shell-footer';
 f.innerHTML='<div class="fg-shell-footer-inner"><div><a class="fg-shell-logo" href="/"><span>FG</span>Figure<em>NG</em></a><p>Free calculators and practical guides for everyday decisions.</p></div><div><strong>FigureNG</strong><a href="/calculators.html">All calculators</a><a href="/guides.html">Guides</a><a href="/about.html">About</a></div><div><strong>Information</strong><a href="/contact.html">Contact</a><a href="/disclaimer.html">Disclaimer</a></div></div><div class="fg-shell-copy">© '+new Date().getFullYear()+' FigureNG. Built for clear decisions.</div>';
 document.body.appendChild(f);
}
ready(function(){injectShell();decorateCalculator();addFooter();});
})();
