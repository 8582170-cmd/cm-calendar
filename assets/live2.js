/* סוגים נוספים של אתר "חי" (cfg.look): aurora זוהר צפוני | fireworks זיקוקים בשמי לילה | gold זהב נוצץ | balloons בלונים.
   נטען יחד עם live.js: הפס הנע, ההופעה בגלילה, תג הרכישה והמשפטים במוצרים משותפים לכל הסוגים, וכאן רק הכותרת והאווירה.
   מכבד "הפחת תנועה": אין קנבס ואין תנועה, נשאר עיצוב סטטי יפה. */
(function () {
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var CSS = ''
    + '.live header.top>.lk-layer{position:absolute!important;inset:0;z-index:0!important;pointer-events:none;overflow:hidden}'
    + '.lk-l{display:inline-block;white-space:pre}'
    /* זוהר צפוני */
    + 'html[data-lk=aurora] header.top{background:#060B1A!important;animation:none!important}'
    + '.lk-ab{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55;mix-blend-mode:screen}'
    + '.lk-ab1{width:60%;height:140%;left:-10%;top:-60%;background:#19E3B1;animation:lkdrift 14s ease-in-out infinite alternate}'
    + '.lk-ab2{width:55%;height:130%;left:30%;top:-40%;background:#6D5BFF;animation:lkdrift 18s ease-in-out infinite alternate-reverse}'
    + '.lk-ab3{width:45%;height:120%;right:-8%;top:-30%;background:#FF5FA2;opacity:.4;animation:lkdrift 22s ease-in-out infinite alternate}'
    + 'html[data-lk=aurora] header.top h1{color:#DFFCF4}'
    + 'html[data-lk=aurora] body::before{content:"";position:fixed;inset:-20% -10% auto;height:70vh;z-index:-1;pointer-events:none;background:radial-gradient(50% 60% at 30% 40%,rgba(25,227,177,.16),transparent 70%),radial-gradient(50% 60% at 70% 30%,rgba(109,91,255,.14),transparent 70%);animation:lkdrift 20s ease-in-out infinite alternate}'
    + 'html[data-lk=aurora] .lv-strip{background:linear-gradient(90deg,#19E3B1,#6D5BFF,#FF5FA2);color:#fff}'
    + 'html[data-lk=aurora].live .prod:hover{box-shadow:0 0 0 2px #19E3B1,0 16px 40px rgba(109,91,255,.35)}'
    /* זיקוקים */
    + 'html[data-lk=fireworks] header.top{background:radial-gradient(120% 140% at 50% 120%,color-mix(in srgb,var(--navy) 70%,#1a1446),#04050D 70%)!important;animation:none!important}'
    + '.lk-stars{position:absolute;inset:0;background-image:radial-gradient(1.2px 1.2px at 12% 22%,#fff,transparent),radial-gradient(1px 1px at 28% 68%,#fff,transparent),radial-gradient(1.4px 1.4px at 46% 14%,#fff,transparent),radial-gradient(1px 1px at 63% 52%,#fff,transparent),radial-gradient(1.3px 1.3px at 78% 26%,#fff,transparent),radial-gradient(1px 1px at 91% 74%,#fff,transparent),radial-gradient(1px 1px at 6% 82%,#fff,transparent),radial-gradient(1.2px 1.2px at 55% 88%,#fff,transparent);animation:lktw 3.5s ease-in-out infinite alternate}'
    + '.lk-cv{position:absolute;inset:0;width:100%;height:100%}'
    + 'html[data-lk=fireworks] header.top h1{color:#fff;text-shadow:0 0 18px rgba(255,255,255,.35)}'
    + 'html[data-lk=fireworks] .lk-l{opacity:0;filter:blur(8px);transform:translateY(8px);animation:lkin .7s ease forwards;animation-delay:calc(var(--i)*55ms + .2s)}'
    + 'html[data-lk=fireworks] .lv-strip{background:#0B0E22;color:#FFE08A}'
    + 'html[data-lk=fireworks].live .prod:hover{box-shadow:0 14px 34px rgba(30,30,90,.35),0 0 0 2px #FFD36B}'
    /* זהב */
    + 'html[data-lk=gold] header.top{background:linear-gradient(135deg,#0E0B05,color-mix(in srgb,var(--navy) 35%,#17120A))!important;animation:none!important;border-bottom:2px solid #C9A24B}'
    + 'html[data-lk=gold] header.top h1{background:linear-gradient(100deg,#9C7428 0%,#F7E7B0 18%,#C9A24B 32%,#FFF3C8 46%,#B88A35 62%,#F1D998 80%,#9C7428 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:lkwipe 1.6s cubic-bezier(.6,0,.2,1) both,lkslide 6s linear infinite 1.6s;filter:drop-shadow(0 2px 10px rgba(201,162,75,.35))}'
    + 'html[data-lk=gold] .lv-strip{background:linear-gradient(90deg,#9C7428,#F1D998,#C9A24B,#F7E7B0,#9C7428);background-size:200% 100%;animation:lkslide 10s linear infinite;color:#1A1205}'
    + '@property --lkg{syntax:"<angle>";inherits:false;initial-value:0deg}'
    + 'html[data-lk=gold].live .prod{position:relative}'
    + 'html[data-lk=gold].live .prod::before{content:"";position:absolute;inset:-2px;border-radius:inherit;padding:2px;background:conic-gradient(from var(--lkg),transparent 0 70%,#F7E7B0 80%,#C9A24B 88%,transparent 96%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .3s;z-index:4;pointer-events:none;animation:lkspin 2.4s linear infinite}'
    + 'html[data-lk=gold].live .prod:hover::before{opacity:1}'
    /* בלונים */
    + 'html[data-lk=balloons] header.top{background:linear-gradient(180deg,color-mix(in srgb,var(--navy) 70%,#3AA0FF),color-mix(in srgb,var(--navy) 30%,#8FD3FF))!important;animation:none!important}'
    + '.lk-bl{position:absolute;bottom:-80px;width:46px;height:58px;border-radius:50% 50% 48% 52%/58% 58% 42% 42%;background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.7),transparent 26%),var(--bc);animation:lkrise var(--t) linear infinite;animation-delay:var(--dl);opacity:.92}'
    + '.lk-bl::after{content:"";position:absolute;left:50%;top:100%;width:1px;height:60px;background:rgba(255,255,255,.55)}'
    + '.lk-bl::before{content:"";position:absolute;left:calc(50% - 4px);top:calc(100% - 2px);border:4px solid transparent;border-bottom-color:var(--bc)}'
    + 'html[data-lk=balloons] .lk-l{animation:lkbounce .9s cubic-bezier(.3,1.6,.5,1) both,lkhop 3.2s ease-in-out infinite;animation-delay:calc(var(--i)*60ms),calc(var(--i)*90ms + 1.2s)}'
    + 'html[data-lk=balloons] .lv-strip{background:repeating-linear-gradient(90deg,#FF6F91 0 80px,#FFC75F 80px 160px,#4FC3F7 160px 240px,#8BE28B 240px 320px);color:#1B1B1B}'
    + 'html[data-lk=balloons].live .prod:hover{box-shadow:6px 8px 0 #FFC75F}'
    /* סטודיו: בהשראת אתרי פרסים (Awwwards, Framer): כהה ונקי, כותרת שנחשפת מתוך מסכה, גלילה עם עומק */
    + 'html[data-lk=studio] header.top{background:#0B0B0D!important;animation:none!important;min-height:52vh;align-items:flex-end}'
    + 'html[data-lk=studio] header.top h1{font-family:Rubik,Heebo,Arial,sans-serif;font-weight:800;letter-spacing:-1px;font-size:clamp(44px,9vw,104px)!important;line-height:.98;color:#fff}'
    + 'html[data-lk=studio] .lk-w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em;margin-inline-end:.24em}html[data-lk=studio] .lk-w>span{display:inline-block;transform:translateY(105%);animation:lkup .9s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:calc(var(--i)*90ms + .15s)}'
    + '.lk-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:radial-gradient(70% 80% at 50% 0,#000,transparent);mask-image:radial-gradient(70% 80% at 50% 0,#000,transparent)}'
    + '.lk-spot{position:absolute;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--gold) 38%,transparent),transparent 65%);left:var(--mx,60%);top:var(--my,30%);transform:translate(-50%,-50%);transition:left .25s ease-out,top .25s ease-out}'
    + 'html[data-lk=studio] .lv-strip{background:#0B0B0D;color:#fff;border-top:1px solid #222;border-bottom:1px solid #222;font-size:22px}'
    + 'html[data-lk=studio] .sec>h2{font-family:Rubik,Heebo,Arial,sans-serif;font-weight:800;font-size:clamp(28px,4vw,44px)!important;background:none!important;padding:0!important}'
    /* ליטוש משותף לכל הסוגים החדשים: פס התקדמות גלילה, כרטיסים שנוטים לכיוון העכבר, כפתור "מגנטי" */
    + '.lk-prog{position:fixed;top:0;inset-inline-start:0;height:4px;width:100%;transform-origin:right;transform:scaleX(var(--p,0));background:linear-gradient(90deg,var(--gold2),var(--gold));z-index:60;pointer-events:none}'
    + '@supports (animation-timeline:scroll()){.lk-prog{animation:lkp linear both;animation-timeline:scroll(root)}}@keyframes lkp{from{transform:scaleX(0)}to{transform:scaleX(1)}}'
    + 'html[data-lk].live .prod.lk-t{transition:transform .18s ease-out,box-shadow .3s ease;transform:perspective(900px) rotateX(var(--rx,0)) rotateY(var(--ry,0)) translateY(-6px);animation:none}'
    + 'html[data-lk] .go{transition:transform .2s ease-out}'
    + '@keyframes lkup{to{transform:none}}'
    /* ===== לכל סוג תנועה משלו: איך המילים זזות, איך המוצרים נכנסים, איך הם זזים בזמן מנוחה, ואיך הפס זז ===== */
    /* זוהר צפוני: האותיות עולות מתוך ערפל בגל, ואחר כך גלי צבע ואור עוברים עליהן כמו זוהר בשמיים; המוצרים מופיעים מתוך ערפל ו"נושמים" באור */
    + 'html[data-lk=aurora] .lk-l{opacity:0;filter:blur(10px);transform:translateY(18px);animation:lkin 1.1s ease forwards,lkaur 7s ease-in-out infinite,lkwav 4.5s ease-in-out infinite;animation-delay:calc(var(--i)*70ms),calc(var(--i)*-.35s),calc(var(--i)*-.18s + 1.2s)}'
    + '@keyframes lkaur{0%,100%{color:#B8FFF0;text-shadow:0 0 14px rgba(25,227,177,.55)}33%{color:#B9AEFF;text-shadow:0 0 14px rgba(109,91,255,.55)}66%{color:#FFB3D4;text-shadow:0 0 14px rgba(255,95,162,.5)}}'
    + '@keyframes lkwav{0%,100%{translate:0 0}50%{translate:0 -6px}}'
    + 'html[data-lk=aurora] .lv-rv{opacity:0;filter:blur(14px);transform:scale(.94)}html[data-lk=aurora] .lv-rv.lv-in{opacity:1;filter:none;transform:none;transition:opacity 1.1s ease,filter 1.1s ease,transform 1.1s ease}'
    + 'html[data-lk=aurora].live .prod{animation:lkglow 6s ease-in-out infinite;animation-delay:calc(var(--d,0)*-1.2s)}'
    + '@keyframes lkglow{0%,100%{box-shadow:0 0 0 rgba(25,227,177,0)}50%{box-shadow:0 0 26px rgba(25,227,177,.28),0 0 46px rgba(109,91,255,.18)}}'
    + 'html[data-lk=aurora] .lv-strip .lv-tr{animation-duration:60s}'
    /* זיקוקים: כל אות "מתפוצצת" לתוך מקומה מכיוון אקראי, ואחר כך אותיות מהבהבות כמו ניצוצות; המוצרים "נפתחים" בקפיצה */
    + 'html[data-lk=fireworks] .lk-l{opacity:0;filter:blur(6px);transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(.3);animation:lkin .8s cubic-bezier(.2,1.3,.4,1) forwards,lkflash 4s ease-in-out infinite;animation-delay:calc(var(--i)*40ms + .3s),var(--fd)}'
    + '@keyframes lkflash{0%,86%,100%{text-shadow:0 0 18px rgba(255,255,255,.35)}92%{text-shadow:0 0 6px #fff,0 0 22px #FFD36B,0 0 44px #FF6F91;color:#FFF6D8}}'
    + 'html[data-lk=fireworks] .lv-rv{opacity:0;transform:scale(.55)}html[data-lk=fireworks] .lv-rv.lv-in{opacity:1;transform:none;transition:opacity .4s ease,transform .7s cubic-bezier(.2,1.6,.4,1)}'
    + 'html[data-lk=fireworks].live .prod{animation:none}'
    + 'html[data-lk=fireworks] .lv-strip .lv-tr{animation-duration:22s}'
    /* זהב: הכותרת נחשפת במשיכת מכחול מימין לשמאל ואחר כך ברק זהב עובר עליה; המוצרים מחליקים פנימה מהצדדים לסירוגין ועומדים במקום (יוקרה שקטה) */
    + '@keyframes lkwipe{from{clip-path:inset(0 0 0 100%);letter-spacing:.12em}to{clip-path:inset(0 0 0 0);letter-spacing:normal}}'
    + 'html[data-lk=gold] .lv-rv{opacity:0;transform:translateX(60px)}html[data-lk=gold] .grid>.lv-rv:nth-child(even),html[data-lk=gold] .pkgs>.lv-rv:nth-child(even){transform:translateX(-60px)}'
    + 'html[data-lk=gold] .lv-rv.lv-in,html[data-lk=gold] .grid>.lv-rv.lv-in:nth-child(even),html[data-lk=gold] .pkgs>.lv-rv.lv-in:nth-child(even){opacity:1;transform:none;transition:opacity .9s ease,transform .9s cubic-bezier(.2,.8,.2,1)}'
    + 'html[data-lk=gold].live .prod{animation:none}'
    + 'html[data-lk=gold] .lv-strip .lv-tr{animation-duration:48s}'
    /* בלונים: האותיות נופלות וקופצות ואחר כך מקפצות כל הזמן; המוצרים עולים מלמטה עם קפיצה ומתנדנדים כמו בלון על חוט */
    + 'html[data-lk=balloons] .lv-rv{opacity:0;transform:translateY(80px)}html[data-lk=balloons] .lv-rv.lv-in{opacity:1;transform:none;transition:opacity .5s ease,transform .9s cubic-bezier(.3,1.7,.5,1)}'
    + 'html[data-lk=balloons].live .prod{transform-origin:50% -40px;animation:lkswing 5s ease-in-out infinite;animation-delay:calc(var(--d,0)*-.8s)}'
    + '@keyframes lkswing{0%,100%{rotate:-1.2deg}50%{rotate:1.2deg}}'
    + 'html[data-lk=balloons] .lv-strip .lv-tr{animation-duration:26s}'
    /* סטודיו: המילים עולות מתוך מסכה, ואחר כך הכול שקט; המוצרים נחשפים כמו וילון מלמטה למעלה והתמונה מתקרבת לאט; הפס זז בכיוון ההפוך */
    + 'html[data-lk=studio] .lv-rv{opacity:1;transform:none}html[data-lk=studio] .lv-rv>*{clip-path:inset(100% 0 0 0)}html[data-lk=studio] .lv-rv.lv-in>*{clip-path:inset(0 0 0 0);transition:clip-path 1s cubic-bezier(.7,0,.2,1);transition-delay:calc(var(--d,0)*90ms)}'
    + 'html[data-lk=studio] .lv-rv .im img{transform:scale(1.25);transition:transform 1.6s cubic-bezier(.2,.8,.2,1)}html[data-lk=studio] .lv-rv.lv-in .im img{transform:none}'
    + 'html[data-lk=studio].live .prod{animation:none}'
    + 'html[data-lk=studio] .lv-strip .lv-tr{animation-direction:reverse;animation-duration:30s}'
    + 'html[data-lk=studio] .sec>h2{clip-path:inset(0 0 0 0)}'
    + '@keyframes lkdrift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(8%,10%) scale(1.15)}100%{transform:translate(-6%,4%) scale(.95)}}'
    + '@keyframes lkslide{to{background-position:-300% 0}}@keyframes lktw{to{opacity:.45}}@keyframes lkspin{to{--lkg:360deg}}'
    + '@keyframes lkin{to{opacity:1;filter:none;transform:none}}'
    + '@keyframes lkrise{0%{transform:translate(0,0) rotate(-4deg)}50%{transform:translate(18px,-230px) rotate(5deg)}100%{transform:translate(-10px,-470px) rotate(-3deg)}}'
    + '@keyframes lkbounce{0%{opacity:0;transform:translateY(-60px) scale(.6)}100%{opacity:1;transform:none}}@keyframes lkhop{0%,100%{transform:none}50%{transform:translateY(-5px)}}'
    + '@media (prefers-reduced-motion:reduce){html[data-lk] .lv-rv{opacity:1!important;filter:none!important;transform:none!important;clip-path:none!important}html[data-lk] .lv-rv>*{clip-path:none!important}html[data-lk].live .prod{animation:none!important}.lk-prog,.lk-spot{display:none}html[data-lk=studio] .lk-w>span{transform:none;animation:none}.lk-ab,.lk-stars,.lk-bl,.lk-l,html[data-lk] header.top h1,html[data-lk] .lv-strip,html[data-lk] body::before,html[data-lk].live .prod::before{animation:none!important}.lk-l{opacity:1!important;filter:none!important;transform:none!important}.lk-cv,.lk-bl{display:none}}'
    + '@media print{.lk-layer{display:none!important}}';
  function css() { if (!document.getElementById('lk-css')) { var st = document.createElement('style'); st.id = 'lk-css'; st.textContent = CSS; document.head.appendChild(st); } }
  /* פירוק הכותרת לאותיות (עם ניקוד צמוד לאות), לסוגים שהאותיות בהם זזות */
  function letters(h1) {
    if (!h1 || h1.getAttribute('data-lk')) return; var t = h1.textContent.trim(); h1.setAttribute('data-lk', '1'); h1.setAttribute('aria-label', t);
    var L = t.match(/[^֑-ׇ][֑-ׇ]*/g) || [t], i = 0;
    h1.innerHTML = L.map(function (ch) { return '<span class="lk-l" aria-hidden="true" style="--i:' + (i++) + ';--x:' + Math.round((Math.random() - .5) * 360) + 'px;--y:' + Math.round((Math.random() - .5) * 220) + 'px;--r:' + Math.round((Math.random() - .5) * 220) + 'deg;--fd:' + (1.5 + Math.random() * 4).toFixed(2) + 's">' + ch.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</span>'; }).join('');
  }
  function layer(hd, html) { var d = document.createElement('div'); d.className = 'lk-layer'; d.setAttribute('aria-hidden', 'true'); d.innerHTML = html || ''; hd.insertBefore(d, hd.firstChild); return d; }
  /* קנבס שרץ רק כשהכותרת על המסך ורק כשהלשונית פעילה */
  function canvas(hd, box, draw) {
    if (RM) return; var cv = document.createElement('canvas'); cv.className = 'lk-cv'; box.appendChild(cv);
    var ctx = cv.getContext('2d'), on = true, W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), last = 0;
    function size() { W = hd.clientWidth; H = hd.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { on = e[0].isIntersecting; }).observe(hd);
    (function loop(t) { if (!hd.isConnected) { window.removeEventListener('resize', size); return; } requestAnimationFrame(loop); if (!on || document.hidden) return; var dt = Math.min(50, t - (last || t)); last = t; draw(ctx, W, H, dt); })(0);
  }
  function fireworks(hd, box) {
    var P = [], C = ['#FFD36B', '#FF6F91', '#7CE0FF', '#B9FF8A', '#FFFFFF', '#C3A6FF'], next = 300;
    canvas(hd, box, function (x, W, H, dt) {
      x.clearRect(0, 0, W, H); next -= dt;
      if (next <= 0) { next = 700 + Math.random() * 900; var cx = W * (.1 + Math.random() * .8), cy = H * (.15 + Math.random() * .45), c = C[Math.floor(Math.random() * C.length)], n = 46;
        for (var i = 0; i < n; i++) { var a = Math.PI * 2 * i / n, s = 1.2 + Math.random() * 1.8; P.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 1, c: c }); } }
      for (var j = P.length - 1; j >= 0; j--) { var p = P[j]; p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.vy += .025 * dt / 16; p.vx *= .985; p.l -= .011 * dt / 16;
        if (p.l <= 0) { P.splice(j, 1); continue; } x.globalAlpha = p.l; x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, 1.8, 0, 6.29); x.fill(); }
      x.globalAlpha = 1;
    });
  }
  function dust(hd, box) {
    var P = [];
    canvas(hd, box, function (x, W, H, dt) {
      x.clearRect(0, 0, W, H); while (P.length < Math.max(30, W / 18)) P.push({ x: Math.random() * W, y: Math.random() * -H, r: .6 + Math.random() * 1.8, v: .2 + Math.random() * .5, ph: Math.random() * 6 });
      P.forEach(function (p) { p.y += p.v * dt / 16; p.ph += .05; if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; }
        var a = .45 + .55 * Math.abs(Math.sin(p.ph)); x.globalAlpha = a; x.fillStyle = a > .9 ? '#FFF6D2' : '#E6C36F'; x.beginPath(); x.arc(p.x + Math.sin(p.ph * .4) * 3, p.y, p.r, 0, 6.29); x.fill(); });
      x.globalAlpha = 1;
    });
  }
  /* כותרת שנחשפת מילה אחרי מילה מתוך מסכה (סטודיו) */
  function maskWords(h1) {
    if (!h1 || h1.getAttribute('data-lk')) return; var t = h1.textContent.trim(); h1.setAttribute('data-lk', '1'); h1.setAttribute('aria-label', t);
    h1.innerHTML = t.split(/\s+/).map(function (w, i) { return '<span class="lk-w" aria-hidden="true"><span style="--i:' + i + '">' + w.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</span></span>'; }).join('');
  }
  /* ליטוש בהשראת Framer/Webflow: פס התקדמות גלילה, הטיה תלת ממדית של כרטיס מוצר לכיוון העכבר, כפתור תשלום שנמשך קלות לעכבר,
     ועומק (פרלקסה) לשכבת הרקע של הכותרת בזמן גלילה. רק במכשירים עם עכבר, ולא כשמבקשים להפחית תנועה */
  var PL = { box: null, bound: false };
  function polish(hd, box) {
    PL.box = box;
    if (!document.querySelector('.lk-prog')) { var pg = document.createElement('i'); pg.className = 'lk-prog'; pg.setAttribute('aria-hidden', 'true'); document.body.appendChild(pg);
      if (!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()'))) window.addEventListener('scroll', function () { var h = document.documentElement, m = h.scrollHeight - h.clientHeight; pg.style.setProperty('--p', m > 0 ? (h.scrollTop / m).toFixed(4) : 0); }, { passive: true }); }
    if (RM || PL.bound) return; PL.bound = true;
    window.addEventListener('scroll', function () { var y = window.pageYOffset || 0; if (y < 900 && PL.box && PL.box.isConnected) PL.box.style.transform = 'translateY(' + (y * .35).toFixed(1) + 'px)'; }, { passive: true });
    if (!(window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches)) return;
    document.addEventListener('pointermove', function (e) {
      if (!document.documentElement.getAttribute('data-lk')) return;
      var c = e.target.closest && e.target.closest('.prod'); document.querySelectorAll('.prod.lk-t').forEach(function (x) { if (x !== c) { x.classList.remove('lk-t'); x.style.removeProperty('--rx'); x.style.removeProperty('--ry'); } });
      if (c) { var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; c.classList.add('lk-t'); c.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg'); c.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg'); }
      var g = e.target.closest && e.target.closest('.go'); document.querySelectorAll('.go[data-mg]').forEach(function (x) { if (x !== g) { x.removeAttribute('data-mg'); x.style.transform = ''; } });
      if (g && !g.disabled) { var q = g.getBoundingClientRect(); g.setAttribute('data-mg', '1'); g.style.transform = 'translate(' + ((e.clientX - q.left - q.width / 2) * .12).toFixed(1) + 'px,' + ((e.clientY - q.top - q.height / 2) * .25).toFixed(1) + 'px)'; }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { document.querySelectorAll('.prod.lk-t').forEach(function (x) { x.classList.remove('lk-t'); }); });
  }
  function stop() {
    document.documentElement.removeAttribute('data-lk'); PL.box = null;
    var p = document.querySelector('.lk-prog'); if (p) p.remove(); if (window.MLLive3) MLLive3.stop();
  }
  function start(kind) {
    var hd = document.querySelector('header.top'); if (!hd || hd.getAttribute('data-lkk')) return; css(); hd.setAttribute('data-lkk', kind);
    document.documentElement.setAttribute('data-lk', kind); var h1 = hd.querySelector('h1');
    if (kind === 'aurora') { letters(h1); } if (kind === 'aurora') layer(hd, '<i class="lk-ab lk-ab1"></i><i class="lk-ab lk-ab2"></i><i class="lk-ab lk-ab3"></i>');
    else if (kind === 'fireworks') { var b = layer(hd, '<i class="lk-stars"></i>'); letters(h1); fireworks(hd, b); }
    else if (kind === 'gold') { var g = layer(hd); dust(hd, g); }
    else if (kind === 'studio') { var sb = layer(hd, '<i class="lk-grid"></i><i class="lk-spot"></i>'); maskWords(h1);
      if (!RM) hd.addEventListener('pointermove', function (e) { var r = hd.getBoundingClientRect(); sb.style.setProperty('--mx', (e.clientX - r.left) + 'px'); sb.style.setProperty('--my', (e.clientY - r.top) + 'px'); }); }
    else if (kind === 'balloons') {
      var cs = ['#FF6F91', '#FFC75F', '#4FC3F7', '#8BE28B', '#C3A6FF', '#FF9671'], h = '';
      for (var i = 0; i < 9; i++) h += '<i class="lk-bl" style="left:' + (4 + i * 11 + Math.round(Math.random() * 4)) + '%;--bc:' + cs[i % cs.length] + ';--t:' + (8 + (i % 4) * 2) + 's;--dl:-' + (i * 1.3).toFixed(1) + 's;width:' + (36 + (i % 3) * 8) + 'px;height:' + (46 + (i % 3) * 10) + 'px"></i>';
      layer(hd, h); letters(h1);
    }
    polish(hd, hd.querySelector('.lk-layer'));
    if (window.MLLive3) MLLive3.start(kind);
  }
  window.MLLive2 = { start: start, stop: stop, kinds: ['aurora', 'fireworks', 'gold', 'balloons', 'studio'] };
})();
