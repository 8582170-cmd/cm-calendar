/* תפריט צד לדפי הניהול (כמו בניהול האירועים): כל חלק (section עם h2) שייך לקבוצה, ומוצגת קבוצה אחת בכל פעם.
   הגדרה בדף: window.ADMIN_NAV = { title, sub, groups: [[id, 'תווית', /ביטוי לכותרות/], ...], links: [['/admin-events','🎉 ניהול אירועים'], ...] }
   בלי groups: כל חלק הוא פריט בתפריט. הבחירה נשמרת בכתובת (#) ובדפדפן. */
(function(){
  'use strict';
  var C=window.ADMIN_NAV||{},KEY='adm-nav:'+location.pathname,cur='',nav,built='';
  var css='.adm-side{position:fixed;inset-block:0;inset-inline-start:0;width:230px;background:var(--sheet,#fff);border-inline-end:1px solid var(--line,#dde2df);padding:16px 10px;display:flex;flex-direction:column;gap:3px;overflow:auto;z-index:30}'+
    '.adm-side .adm-b{font-weight:800;font-size:18px;padding:4px 10px 12px}.adm-side .adm-b small{display:block;color:var(--mute,#5c686c);font-weight:600;font-size:13px}'+
    '.adm-side button,.adm-side a{font:inherit;font-weight:700;font-size:15.5px;text-align:start;border:0;background:transparent;color:var(--ink,#172126);padding:9px 12px;border-radius:10px;cursor:pointer;text-decoration:none;display:flex;justify-content:space-between;gap:6px;white-space:nowrap}'+
    '.adm-side button[aria-current="true"]{background:var(--teal,#1f5c63);color:var(--teal-ink,#fff)}.adm-side button:hover:not([aria-current="true"]),.adm-side a:hover{background:var(--teal-soft,#e4eeec)}'+
    '.adm-side .adm-n{font-size:12px;opacity:.7;font-weight:600}.adm-side .adm-l{margin-top:auto;display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--line,#dde2df);padding-top:8px}'+
    '.adm-side input{margin:0 4px 8px;padding:7px 9px;border:1px solid var(--line,#dde2df);border-radius:8px;font:inherit;font-size:14px;background:var(--paper,#f6f7f4);color:inherit}'+
    'body.adm-on{padding-inline-start:246px!important}body.adm-on .fold-all{display:none!important}body.adm-on section>h2{cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px}body.adm-on section>h2::before{content:"▾"!important;display:inline-block!important;font-size:.8em;width:1em;color:var(--mute,#5c686c);transform:none!important}body.adm-on section.adm-shut>h2::before{content:"◂"!important}body.adm-on section.adm-shut>:not(h2){display:none!important}body.adm-on section.adm-shut{padding-block:10px}body.adm-on section.adm-shut>h2{margin:0}'+
    '.adm-tg{display:flex;gap:4px;margin:0 4px 8px}.adm-tg button{flex:1;justify-content:center!important;font-size:13px!important;padding:5px 6px!important;border:1px solid var(--line,#dde2df)!important;font-weight:600!important}'+
    '.adm-off{display:none!important}'+
    '@media (max-width:860px){.adm-side{position:sticky;top:0;inset-inline-start:auto;width:auto;height:auto;flex-direction:row;overflow-x:auto;padding:8px;border-inline-end:0;border-bottom:1px solid var(--line,#dde2df)}.adm-side .adm-b,.adm-side input{display:none}.adm-side .adm-l{margin:0;flex-direction:row;border:0;padding:0}body.adm-on{padding-inline-start:16px!important}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var SH={};try{SH=JSON.parse(localStorage.getItem(KEY+':shut')||'{}')}catch(e){}
  function saveSh(){try{localStorage.setItem(KEY+':shut',JSON.stringify(SH))}catch(e){}}
  function shut(s,on){var k=title(s).slice(0,40);s.classList.toggle('adm-shut',on);if(on)SH[k]=1;else delete SH[k]}
  function secs(){return [].filter.call(document.querySelectorAll('section'),function(s){return s.querySelector(':scope>h2')})}
  function title(s){return s.querySelector(':scope>h2').textContent.trim()}
  function groupOf(s){var t=title(s),G=C.groups||[];for(var i=0;i<G.length;i++)if(G[i][2].test(t))return G[i][0];return G.length?'other':'s:'+t.slice(0,40)}
  function items(){var S=secs(),out=[],seen={};
    if(C.groups){C.groups.forEach(function(g){var n=S.filter(function(s){return groupOf(s)===g[0]}).length;if(n)out.push([g[0],g[1],n])});var o=S.filter(function(s){return groupOf(s)==='other'}).length;if(o)out.push(['other','📁 עוד',o])}
    else S.forEach(function(s){var k=groupOf(s);if(!seen[k]){seen[k]=1;out.push([k,title(s),0])}});return out}
  function show(k,scroll){cur=k;try{localStorage.setItem(KEY,k);history.replaceState(null,'','#'+encodeURIComponent(k))}catch(e){}
    secs().forEach(function(s){var on=groupOf(s)===k;s.classList.toggle('adm-off',!on);if(on){s.classList.remove('shut','fold');s.classList.toggle('adm-shut',!!SH[title(s).slice(0,40)])}});
    [].forEach.call(nav.querySelectorAll('[data-k]'),function(b){b.setAttribute('aria-current',b.dataset.k===k)});
    if(scroll!==false)window.scrollTo(0,0)}
  function build(){var I=items();if(!I.length)return;var sig=I.map(function(x){return x[0]+x[2]}).join('|');
    if(!nav){nav=document.createElement('nav');nav.className='adm-side';nav.setAttribute('aria-label','תפריט הניהול');document.body.prepend(nav);document.body.classList.add('adm-on');
      nav.addEventListener('click',function(e){var b=e.target.closest('[data-k]');if(b)show(b.dataset.k);var a=e.target.closest('[data-all]');if(a){secs().forEach(function(s){if(!s.classList.contains('adm-off'))shut(s,a.dataset.all==='1')});saveSh()}});
      /* לחיצה על כותרת של נושא מכווצת או פותחת אותו (בשלב הלכידה, לפני מנגנוני הכיווץ הישנים של הדף) */
      document.addEventListener('click',function(e){var h=e.target.closest('section>h2');if(!h||!document.body.classList.contains('adm-on')||e.target.closest('a,button,input,select,label,textarea'))return;
        e.stopPropagation();var s=h.parentNode;s.classList.remove('shut','fold');shut(s,!s.classList.contains('adm-shut'));saveSh()},true);
      nav.addEventListener('input',function(e){if(!e.target.matches('input'))return;var q=e.target.value.trim();if(!q){show(cur||I[0][0],false);return}
        secs().forEach(function(s){s.classList.toggle('adm-off',s.textContent.indexOf(q)<0)});[].forEach.call(nav.querySelectorAll('[data-k]'),function(b){b.setAttribute('aria-current','false')})})}
    if(sig!==built){built=sig;
      nav.innerHTML='<div class="adm-b">'+(C.title||document.title.split('·')[0])+(C.sub?'<small>'+C.sub+'</small>':'')+'</div><input type="search" placeholder="חיפוש בהגדרות…" aria-label="חיפוש בהגדרות"><div class="adm-tg"><button type="button" data-all="1">כיווץ הכל</button><button type="button" data-all="0">פתיחת הכל</button></div>'+
        I.map(function(x){return '<button type="button" data-k="'+x[0].replace(/"/g,'&quot;')+'">'+x[1]+(x[2]>1?'<span class="adm-n">'+x[2]+'</span>':'')+'</button>'}).join('')+
        (C.links&&C.links.length?'<div class="adm-l">'+C.links.map(function(l){return '<a href="'+l[0]+'">'+l[1]+'</a>'}).join('')+'</div>':'')}
    var want=cur;if(!want){try{want=decodeURIComponent((location.hash||'').slice(1))||localStorage.getItem(KEY)||''}catch(e){}}
    if(!I.some(function(x){return x[0]===want}))want=I[0][0];show(want,false)}
  var t;new MutationObserver(function(m){if(m.every(function(r){return nav&&nav.contains(r.target)}))return;clearTimeout(t);t=setTimeout(build,60)}).observe(document.body,{childList:true,subtree:true});
  /* פתיחה של חלק מתוך הקוד: עוברים לקבוצה שלו */
  var prev=window.openSection;window.openSection=function(sec){if(sec&&nav){show(groupOf(sec),false);sec.scrollIntoView({block:'start'})}if(prev)prev(sec)};
  build();
})();
