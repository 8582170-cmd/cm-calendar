/* אתר חי: עיצוב ותנועה בכל הדף (לא רק בכותרת), לכל סוג משלו: רקע, אזורים וכותרות, כרטיסי מוצר וחבילות, הסיכום והכפתור, תמונה ראשית וסרטון,
   ואפקט קטן בכל הוספת כרטיס. נטען אחרי live2.js ומופעל ממנו. מכבד "הפחת תנועה" (אין אפקטים ואין רקעים נעים, נשאר עיצוב סטטי). */
(function () {
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var FLAG = 'html[data-lk]';
  var CSS = ''
    /* ===== משותף ===== */
    + '.lk-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}'
    + '.lk-fx{position:fixed;inset:0;z-index:80;pointer-events:none;overflow:hidden}.lk-fx i{position:absolute;left:var(--x);top:var(--y);display:block;font-style:normal;animation:lkpart var(--t,.9s) cubic-bezier(.15,.7,.3,1) forwards;will-change:transform,opacity}'
    + '@keyframes lkpart{0%{opacity:1;transform:translate(-50%,-50%) scale(var(--s0,1)) rotate(0)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(var(--s1,1)) rotate(var(--rot,0deg))}}'
    + FLAG + ' .lk-h{will-change:transform,opacity}'
    + FLAG + ' aside.sum .tot b.lk-pop{display:inline-block;animation:lkpop .55s cubic-bezier(.2,1.6,.4,1)}@keyframes lkpop{0%{transform:scale(1)}40%{transform:scale(1.28)}100%{transform:scale(1)}}'
    + FLAG + ' .herow{position:relative}' + FLAG + ' .herow .hero{transform-origin:50% 40%;animation:lkkb 28s ease-in-out infinite alternate}'
    + '@keyframes lkkb{from{transform:scale(1.02) translate3d(0,0,0)}to{transform:scale(1.14) translate3d(-1.5%,-2%,0)}}'
    + FLAG + ' .hbgm img,' + FLAG + ' .hbgm video{animation:lkkb 30s ease-in-out infinite alternate}'
    + FLAG + ' .vid{transition:box-shadow .4s ease;margin-inline:auto}'
    + FLAG + ' .vsnd{transition:transform .2s}' + FLAG + ' .vsnd:hover{transform:scale(1.06)}'
    /* ===== זוהר צפוני: זכוכית וערפל, גבולות צבעוניים נעים ===== */
    + 'html[data-lk=aurora]{--bg:#EEF2FF}'
    + '.lk-ab2b{position:absolute;border-radius:50%;filter:blur(80px);opacity:.5;will-change:transform}'
    + 'html[data-lk=aurora] .prod,html[data-lk=aurora] .pkg,html[data-lk=aurora] aside.sum,html[data-lk=aurora] .faq details,html[data-lk=aurora] .cdw{background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-color:rgba(109,91,255,.2)}'
    + 'html[data-lk=aurora] .sec>h2{background:none!important;background-image:linear-gradient(90deg,#0B9E7B,#5B49E8,#D63A82,#0B9E7B)!important;background-size:250% 100%!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent;color:transparent;animation:lkslide2 9s linear infinite;padding:0!important}'
    + 'html[data-lk=aurora] .sec>h2::after{content:"";display:block;height:3px;margin-top:6px;border-radius:3px;background:linear-gradient(90deg,#19E3B1,#6D5BFF,#FF5FA2);transform-origin:right;transform:scaleX(0);transition:transform 1.2s cubic-bezier(.2,.8,.2,1) .2s;width:90px}'
    + 'html[data-lk=aurora] .sec>h2.lk-in::after{transform:scaleX(1)}'
    + 'html[data-lk=aurora] .lk-h{opacity:0;filter:blur(10px);transform:translateY(16px);transition:opacity 1s ease,filter 1s ease,transform 1s ease}html[data-lk=aurora] .lk-h.lk-in{opacity:1;filter:none;transform:none}'
    + 'html[data-lk=aurora] .go{background:linear-gradient(100deg,#7CF0D2,#A99BFF,#FF9CC6,#7CF0D2);background-size:250% 100%;animation:lkslide2 7s linear infinite;color:#0B1226}'
    + 'html[data-lk=aurora] .pkg[aria-pressed=true]{border-color:transparent;background:linear-gradient(#fff,#fff) padding-box,linear-gradient(110deg,#19E3B1,#6D5BFF,#FF5FA2,#19E3B1) border-box;background-size:100% 100%,250% 100%;animation:lkslide2 6s linear infinite}'
    + 'html[data-lk=aurora] aside.sum{box-shadow:0 20px 60px rgba(109,91,255,.18)}'
    + 'html[data-lk=aurora] .vid{box-shadow:0 0 0 3px rgba(255,255,255,.7),0 0 0 6px rgba(109,91,255,.35),0 24px 70px rgba(25,227,177,.3);animation:lkvglow 7s ease-in-out infinite}@keyframes lkvglow{50%{box-shadow:0 0 0 3px rgba(255,255,255,.7),0 0 0 6px rgba(255,95,162,.4),0 24px 70px rgba(109,91,255,.4)}}'
    + 'html[data-lk=aurora] .herow::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(25,227,177,.28),transparent 40%,rgba(109,91,255,.32));mix-blend-mode:soft-light;pointer-events:none;animation:lkaurhero 12s ease-in-out infinite alternate}@keyframes lkaurhero{to{opacity:.35}}'
    + '@keyframes lkslide2{to{background-position:-250% 0}}'
    /* ===== זיקוקים: שמי לילה בכל הדף, כרטיסים זוהרים ===== */
    + 'html[data-lk=fireworks]{--bg:#070B20}'
    + 'html[data-lk=fireworks] body{color:#E9ECFF}'
    + 'html[data-lk=fireworks] .lk-bg{background:radial-gradient(120% 80% at 50% 0,#151C4A,transparent 70%)}'
    + '.lk-tw{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 6px #fff;animation:lktwk var(--t,4s) ease-in-out infinite;animation-delay:var(--d,0s)}@keyframes lktwk{0%,100%{opacity:.15;transform:scale(.6)}50%{opacity:1;transform:scale(1.3)}}'
    + 'html[data-lk=fireworks] .prod,html[data-lk=fireworks] .pkg,html[data-lk=fireworks] aside.sum,html[data-lk=fireworks] .faq details,html[data-lk=fireworks] .cdw,html[data-lk=fireworks] .done,html[data-lk=fireworks] .givebox{color:#1B2338}'
    + 'html[data-lk=fireworks] .prod,html[data-lk=fireworks] .pkg,html[data-lk=fireworks] aside.sum,html[data-lk=fireworks] .faq details{box-shadow:0 0 0 1px rgba(255,211,107,.28),0 14px 36px rgba(0,0,0,.45)}'
    + 'html[data-lk=fireworks] .sec>h2{color:#fff;text-shadow:0 0 18px rgba(255,211,107,.35);background:none!important;padding:0!important;display:flex;align-items:center;gap:10px}'
    + 'html[data-lk=fireworks] .sec>h2::before{content:"✦";color:#FFD36B;font-size:.7em;animation:lktwk 2.6s ease-in-out infinite}'
    + 'html[data-lk=fireworks] .lk-h{opacity:0;letter-spacing:.32em;filter:blur(6px);transition:opacity .9s ease,letter-spacing 1s cubic-bezier(.2,.8,.2,1),filter .9s ease}html[data-lk=fireworks] .lk-h.lk-in{opacity:1;letter-spacing:normal;filter:none}'
    + 'html[data-lk=fireworks] main>.msg,html[data-lk=fireworks] main>.fine{color:#B8C0E6}html[data-lk=fireworks] .msg a,html[data-lk=fireworks] .onav a{color:#FFD36B}html[data-lk=fireworks] .intro{color:#D8DDF5}'
    + 'html[data-lk=fireworks] .go{box-shadow:0 0 0 0 rgba(255,211,107,.7);animation:lkpulse 2.4s ease-out infinite}@keyframes lkpulse{70%{box-shadow:0 0 0 16px rgba(255,211,107,0)}100%{box-shadow:0 0 0 0 rgba(255,211,107,0)}}'
    + 'html[data-lk=fireworks] .pkg[aria-pressed=true]{box-shadow:0 0 0 2px #FFD36B,0 0 28px rgba(255,211,107,.55)}'
    + 'html[data-lk=fireworks] .vid{box-shadow:0 0 0 2px #FFD36B,0 0 40px rgba(255,111,145,.5),0 0 90px rgba(124,224,255,.3);animation:lkneon 3.4s ease-in-out infinite alternate}@keyframes lkneon{to{box-shadow:0 0 0 2px #7CE0FF,0 0 40px rgba(124,224,255,.55),0 0 90px rgba(255,211,107,.35)}}'
    + 'html[data-lk=fireworks] .herow::after{content:"";position:absolute;inset:0;background:radial-gradient(90% 90% at 50% 50%,transparent 40%,rgba(4,5,13,.75)),linear-gradient(180deg,rgba(4,5,13,.25),transparent 30%);pointer-events:none}'
    /* ===== זהב: מסגרות כפולות, קישוטים שמצטיירים, ברק ===== */
    + 'html[data-lk=gold]{--bg:#FBF6EA}'
    + 'html[data-lk=gold] .lk-bg{background:radial-gradient(60% 40% at 15% 8%,rgba(201,162,75,.16),transparent 70%),radial-gradient(50% 40% at 90% 60%,rgba(201,162,75,.12),transparent 70%)}'
    + 'html[data-lk=gold] .sec>h2{align-self:stretch!important;text-align:center;display:flex!important;align-items:center;gap:16px;background:none!important;padding:0!important;font-size:30px}'
    + 'html[data-lk=gold] .sec>h2::before,html[data-lk=gold] .sec>h2::after{content:"";flex:1 1 30px;height:2px;background:linear-gradient(90deg,transparent,#C9A24B 60%,#F1D998);transform:scaleX(0);transition:transform 1.4s cubic-bezier(.2,.8,.2,1) .15s;transform-origin:right}'
    + 'html[data-lk=gold] .sec>h2::after{transform-origin:left;background:linear-gradient(270deg,transparent,#C9A24B 60%,#F1D998)}html[data-lk=gold] .sec>h2.lk-in::before,html[data-lk=gold] .sec>h2.lk-in::after{transform:scaleX(1)}'
    + 'html[data-lk=gold] .lk-h{opacity:0;transform:scale(.9);letter-spacing:.2em;transition:opacity .8s ease,transform 1.1s cubic-bezier(.2,.8,.2,1),letter-spacing 1.2s cubic-bezier(.2,.8,.2,1)}html[data-lk=gold] .lk-h.lk-in{opacity:1;transform:none;letter-spacing:normal}'
    + 'html[data-lk=gold] .prod{border:1px solid #D9BE7A;border-radius:6px;box-shadow:0 0 0 4px #FFFDF6,0 0 0 5px #E3CC93,0 12px 28px rgba(120,90,20,.12)}'
    + 'html[data-lk=gold] .prod .nm{font-family:"Frank Ruhl Libre",serif;font-size:19px}html[data-lk=gold] .prod .pp b{color:#8A6516;font-size:18px}'
    + 'html[data-lk=gold] .tag.num{background:linear-gradient(135deg,#9C7428,#F1D998 50%,#B88A35);color:#2A1D05;font-weight:700}'
    + 'html[data-lk=gold] .pkg{border:1px solid #D9BE7A;border-radius:6px;background:#FFFDF6;box-shadow:0 0 0 3px #FFFDF6,0 0 0 4px #E3CC93}html[data-lk=gold] .pkg[aria-pressed=true]{background:linear-gradient(135deg,#FFF3C8,#F1D998);border-color:#B88A35}'
    + 'html[data-lk=gold] aside.sum{border:1px solid #D9BE7A;border-radius:6px;box-shadow:0 0 0 5px #FFFDF6,0 0 0 6px #E3CC93,0 20px 50px rgba(120,90,20,.14)}'
    + 'html[data-lk=gold] .go{background:linear-gradient(100deg,#9C7428,#F7E7B0 30%,#C9A24B 55%,#F1D998 80%,#9C7428);background-size:260% 100%;animation:lkslide2 8s linear infinite;color:#2A1D05;border-radius:6px}'
    + 'html[data-lk=gold] .vid{border-radius:4px;box-shadow:0 0 0 6px #FFFDF6,0 0 0 8px #C9A24B,0 0 0 12px #FFFDF6,0 0 0 13px #E3CC93,0 22px 50px rgba(120,90,20,.25)}'
    + 'html[data-lk=gold] .herow::before{content:"";position:absolute;inset:14px;border:2px solid rgba(247,231,176,.85);z-index:2;pointer-events:none;box-shadow:inset 0 0 0 5px rgba(0,0,0,.08)}'
    + 'html[data-lk=gold] .herow::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(110deg,transparent 40%,rgba(255,243,200,.4) 50%,transparent 60%);transform:translateX(120%);animation:lkshine 7s ease-in-out infinite}@keyframes lkshine{0%,55%{transform:translateX(120%)}100%{transform:translateX(-120%)}}'
    /* ===== בלונים: צבעוני ושובב: חוטים ודגלונים, כרטיסים מעוגלים, פופ ===== */
    + 'html[data-lk=balloons]{--bg:#E9F6FF}'
    + 'html[data-lk=balloons] .lk-bg{background:linear-gradient(180deg,#DDF1FF,#F4FBFF 60%,#FFF8E6)}'
    + '.lk-bb{position:absolute;bottom:-120px;width:var(--w,46px);height:calc(var(--w,46px)*1.25);border-radius:50% 50% 48% 52%/58% 58% 42% 42%;background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.7),transparent 26%),var(--bc);opacity:.42;animation:lkbb var(--t,26s) linear infinite;animation-delay:var(--d,0s)}'
    + '.lk-bb::after{content:"";position:absolute;left:50%;top:100%;width:1px;height:50px;background:rgba(80,100,130,.4)}'
    + '@keyframes lkbb{0%{transform:translate(0,0) rotate(-4deg)}50%{transform:translate(22px,-62vh) rotate(5deg)}100%{transform:translate(-14px,-125vh) rotate(-3deg)}}'
    + 'html[data-lk=balloons] .sec>h2{background:none!important;padding:0!important;padding-top:26px!important;position:relative}'
    + 'html[data-lk=balloons] .sec>h2::before{content:"";position:absolute;top:0;inset-inline-start:0;width:min(230px,70%);height:20px;background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'144\' height=\'20\'%3E%3Cpath d=\'M0 0H36L18 18Z\' fill=\'%23FF6F91\'/%3E%3Cpath d=\'M36 0H72L54 18Z\' fill=\'%23FFC75F\'/%3E%3Cpath d=\'M72 0H108L90 18Z\' fill=\'%234FC3F7\'/%3E%3Cpath d=\'M108 0H144L126 18Z\' fill=\'%238BE28B\'/%3E%3Cpath d=\'M0 .8H144\' stroke=\'%23809\' stroke-width=\'1\' opacity=\'.35\'/%3E%3C/svg%3E") repeat-x;background-size:72px 10px;transform-origin:top right;animation:lksway2 4.5s ease-in-out infinite alternate}'
    + '@keyframes lksway2{from{transform:rotate(-1.6deg)}to{transform:rotate(1.6deg)}}'
    + 'html[data-lk=balloons] .lk-h{opacity:0;transform:translateY(-34px) scale(.9);transition:opacity .4s ease,transform .9s cubic-bezier(.3,1.8,.5,1)}html[data-lk=balloons] .lk-h.lk-in{opacity:1;transform:none}'
    + 'html[data-lk=balloons] .prod{border-radius:24px;border:3px solid #fff;box-shadow:0 10px 26px rgba(60,120,180,.18)}html[data-lk=balloons] .prod .im{border-radius:0}'
    + 'html[data-lk=balloons] .prod .nm{font-family:"Varela Round",Heebo,sans-serif}'
    + 'html[data-lk=balloons] .tag.num{background:#FF6F91;color:#fff;font-weight:700}'
    + 'html[data-lk=balloons] .pkg{border-radius:22px;border:3px solid #fff;background:#fff;box-shadow:0 8px 20px rgba(60,120,180,.16)}html[data-lk=balloons] .pkg[aria-pressed=true]{border-color:#FFC75F;background:#FFF6DC;animation:lkwig .6s ease}@keyframes lkwig{25%{transform:rotate(-2.5deg) scale(1.03)}75%{transform:rotate(2.5deg) scale(1.03)}}'
    + 'html[data-lk=balloons] aside.sum{border:3px dashed #7CC8F5;border-radius:26px;background:#fff}'
    + 'html[data-lk=balloons] .go{border-radius:999px;background:linear-gradient(135deg,#FF8FAB,#FFC75F);color:#3B1F00;animation:lkbtn 3s ease-in-out infinite}@keyframes lkbtn{0%,86%,100%{transform:none}90%{transform:translateY(-6px) scale(1.04)}95%{transform:translateY(0) scale(.98)}}'
    + 'html[data-lk=balloons] .vid{border-radius:28px;box-shadow:0 0 0 6px #fff,0 0 0 10px #FF8FAB,0 0 0 14px #fff,0 0 0 18px #FFC75F,0 18px 40px rgba(60,120,180,.3);transform:rotate(-.6deg)}'
    + 'html[data-lk=balloons] .herow{border-radius:0 0 40px 40px}html[data-lk=balloons] .herow::after{content:"";position:absolute;left:8%;bottom:-8px;width:34px;height:42px;border-radius:50%;background:#FF6F91;box-shadow:70px -30px 0 #FFC75F,160px 6px 0 #4FC3F7,260px -22px 0 #8BE28B,380px 0 0 #C3A6FF;opacity:.9;animation:lkbal 6s ease-in-out infinite alternate;pointer-events:none}@keyframes lkbal{to{transform:translateY(-18px)}}'
    /* ===== סטודיו: אדיטוריאלי: מספרי אזורים, קווים דקים, תמונות בפרלקסה, סמן עוקב ===== */
    + 'html[data-lk=studio]{--bg:#F3F1EC}'
    + 'html[data-lk=studio] main{counter-reset:lksec}'
    + 'html[data-lk=studio] .sec>h2{border-top:2px solid #0B0B0D;padding-top:14px!important;counter-increment:lksec;position:relative}'
    + 'html[data-lk=studio] .sec>h2::before{content:"0" counter(lksec);display:block;font:600 13px Rubik,Heebo,sans-serif;letter-spacing:.22em;color:#6B6B70;margin-bottom:6px}'
    + 'html[data-lk=studio] .sec>h2::after{content:"";position:absolute;top:-2px;inset-inline-start:0;height:2px;width:0;background:var(--gold);transition:width 1.2s cubic-bezier(.7,0,.2,1)}html[data-lk=studio] .sec>h2.lk-in::after{width:90px}'
    + 'html[data-lk=studio] .lk-h{opacity:0;translate:0 38px;transition:opacity .7s ease,translate .9s cubic-bezier(.7,0,.2,1)}html[data-lk=studio] .lk-h.lk-in{opacity:1;translate:0 0}'
    + 'html[data-lk=studio] .prod{border-radius:0;border:0;border-bottom:2px solid #0B0B0D;background:transparent;box-shadow:none}'
    + 'html[data-lk=studio] .prod .im{border-radius:0}html[data-lk=studio] .prod .im img{scale:1.18}'
    + '@supports (animation-timeline:view()){html[data-lk=studio] .prod .im img{animation:lkpar linear both;animation-timeline:view();animation-range:cover}@keyframes lkpar{from{translate:0 -7%}to{translate:0 7%}}}'
    + 'html[data-lk=studio] .prod .bd{padding:14px 0 18px;background:transparent}html[data-lk=studio] .prod .nm{font-family:Rubik,Heebo,sans-serif;font-weight:800;font-size:19px;letter-spacing:-.2px}'
    + 'html[data-lk=studio] .tag.num{background:#0B0B0D;border-radius:0;font-family:Rubik,Heebo,sans-serif;letter-spacing:.08em}'
    + 'html[data-lk=studio] .qty button,html[data-lk=studio] .qty input{border-radius:0;border-color:#0B0B0D}html[data-lk=studio] .qty button.plus{background:#0B0B0D}'
    + 'html[data-lk=studio] .pkg{border-radius:0;border:1.5px solid #0B0B0D;background:transparent;transition:background .35s,color .35s}html[data-lk=studio] .pkg span,html[data-lk=studio] .pkg .pr{transition:color .35s}'
    + 'html[data-lk=studio] .pkg[aria-pressed=true]{background:#0B0B0D;color:#fff}html[data-lk=studio] .pkg[aria-pressed=true] span,html[data-lk=studio] .pkg[aria-pressed=true] .pr{color:#E6C36F}'
    + 'html[data-lk=studio] aside.sum{border-radius:0;border:2px solid #0B0B0D;background:#fff;box-shadow:8px 8px 0 #0B0B0D}'
    + 'html[data-lk=studio] .go{border-radius:0;background:#0B0B0D;color:#fff;font-family:Rubik,Heebo,sans-serif;letter-spacing:.04em;position:relative;overflow:hidden;z-index:0}html[data-lk=studio] .go::before{content:"";position:absolute;inset:0;background:var(--gold);transform:translateY(101%);transition:transform .45s cubic-bezier(.7,0,.2,1);z-index:-1}html[data-lk=studio] .go:hover:not(:disabled)::before{transform:none}html[data-lk=studio] .go:hover:not(:disabled){color:#0B0B0D}'
    + 'html[data-lk=studio] .vid{border-radius:0;max-width:none;width:100%;aspect-ratio:21/9;box-shadow:none}@media(max-width:700px){html[data-lk=studio] .vid{aspect-ratio:16/9}}'
    + '@supports (animation-timeline:view()){html[data-lk=studio] .secv .vid{animation:lkvz linear both;animation-timeline:view();animation-range:entry 0% cover 40%}@keyframes lkvz{from{clip-path:inset(12% 14% 12% 14%)}to{clip-path:inset(0)}}}'
    + 'html[data-lk=studio] .herow::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(11,11,13,.0),rgba(11,11,13,.35))}'
    + '.lk-cur{position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border:1.5px solid #fff;border-radius:50%;pointer-events:none;z-index:90;mix-blend-mode:difference;transition:width .25s,height .25s,margin .25s,background .25s;will-change:transform}'
    + '.lk-cur.big{width:68px;height:68px;margin:-34px 0 0 -34px;background:#fff}'
    /* ===== הפחת תנועה ===== */
    + '@media (prefers-reduced-motion:reduce){' + FLAG + ' .lk-h{opacity:1!important;filter:none!important;transform:none!important;clip-path:none!important;translate:none!important;letter-spacing:normal!important}' + FLAG + ' .go,' + FLAG + ' .vid,' + FLAG + ' .pkg,' + FLAG + ' .herow .hero,' + FLAG + ' .hbgm img,' + FLAG + ' .sec>h2,' + FLAG + ' .sec>h2::before,' + FLAG + ' .herow::after{animation:none!important}.lk-bg,.lk-fx,.lk-cur{display:none}html[data-lk=studio] .prod .im img{animation:none!important}html[data-lk=studio] .secv .vid{animation:none!important;clip-path:none}html[data-lk=gold] .sec>h2::before,html[data-lk=gold] .sec>h2::after{transform:none}html[data-lk=aurora] .sec>h2::after{transform:none}}'
    + '@media print{.lk-bg,.lk-fx,.lk-cur{display:none!important}}';
  var S = { kind: '', io: null, mo: null, bound: false, sy: 0, cur: null, mx: 0, my: 0, cx: 0, cy: 0, raf: 0 };
  function css() { if (!document.getElementById('lk3-css')) { var st = document.createElement('style'); st.id = 'lk3-css'; st.textContent = CSS; document.head.appendChild(st); } }
  function R(a, b) { return a + Math.random() * (b - a); }
  /* אפקט קטן במקום הלחיצה: לכל סוג אפקט משלו */
  function burst(x, y) {
    if (RM || !S.kind) return; var fx = document.querySelector('.lk-fx'); if (!fx) { fx = document.createElement('div'); fx.className = 'lk-fx'; fx.setAttribute('aria-hidden', 'true'); document.body.appendChild(fx); }
    var k = S.kind, out = [], i, n, a, d, c, C;
    if (k === 'fireworks') { C = ['#FFD36B', '#FF6F91', '#7CE0FF', '#B9FF8A', '#fff', '#C3A6FF']; c = C[Math.floor(Math.random() * C.length)];
      for (i = 0, n = 18; i < n; i++) { a = Math.PI * 2 * i / n; d = R(50, 95); out.push('<i style="--x:' + x + 'px;--y:' + y + 'px;--dx:' + Math.cos(a) * d + 'px;--dy:' + Math.sin(a) * d + 'px;--t:' + R(.7, 1.1).toFixed(2) + 's;width:6px;height:6px;border-radius:50%;background:' + c + ';box-shadow:0 0 8px ' + c + '"></i>'); } }
    else if (k === 'gold') { for (i = 0; i < 9; i++) { a = R(-Math.PI, 0); d = R(30, 90); out.push('<i style="--x:' + x + 'px;--y:' + y + 'px;--dx:' + Math.cos(a) * d + 'px;--dy:' + (Math.sin(a) * d - 20) + 'px;--s0:.4;--s1:' + R(.9, 1.7).toFixed(2) + ';--rot:' + Math.round(R(-60, 60)) + 'deg;--t:' + R(.8, 1.3).toFixed(2) + 's;color:' + (i % 2 ? '#F1D998' : '#C9A24B') + ';font-size:' + Math.round(R(14, 24)) + 'px;text-shadow:0 0 8px rgba(201,162,75,.8)">✦</i>'); } }
    else if (k === 'balloons') { C = ['#FF6F91', '#FFC75F', '#4FC3F7', '#8BE28B', '#C3A6FF'];
      for (i = 0; i < 5; i++) out.push('<i style="--x:' + (x + R(-30, 30)) + 'px;--y:' + y + 'px;--dx:' + R(-40, 40) + 'px;--dy:' + R(-190, -120) + 'px;--rot:' + Math.round(R(-25, 25)) + 'deg;--t:' + R(1.1, 1.7).toFixed(2) + 's;width:20px;height:25px;border-radius:50% 50% 48% 52%/58% 58% 42% 42%;background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.7),transparent 28%),' + C[i % 5] + '"></i>');
      for (i = 0; i < 10; i++) out.push('<i style="--x:' + x + 'px;--y:' + y + 'px;--dx:' + R(-90, 90) + 'px;--dy:' + R(-90, 60) + 'px;--rot:' + Math.round(R(-300, 300)) + 'deg;--t:' + R(.8, 1.2).toFixed(2) + 's;width:7px;height:11px;background:' + C[i % 5] + '"></i>'); }
    else if (k === 'aurora') { C = ['rgba(25,227,177,.55)', 'rgba(109,91,255,.5)', 'rgba(255,95,162,.45)']; for (i = 0; i < 3; i++) out.push('<i style="--x:' + x + 'px;--y:' + y + 'px;--dx:0px;--dy:0px;--s0:.2;--s1:' + (2.2 + i * .9) + ';--t:' + (.9 + i * .25).toFixed(2) + 's;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle,' + C[i] + ',transparent 70%);filter:blur(4px)"></i>'); }
    else if (k === 'studio') { for (i = 0; i < 2; i++) out.push('<i style="--x:' + x + 'px;--y:' + y + 'px;--dx:0px;--dy:0px;--s0:.2;--s1:' + (2.6 + i * 1.4) + ';--t:' + (.7 + i * .25).toFixed(2) + 's;width:40px;height:40px;border-radius:50%;border:1.5px solid #0B0B0D"></i>'); }
    var box = document.createElement('div'); box.innerHTML = out.join(''); var nodes = [].slice.call(box.children);
    nodes.forEach(function (n) { fx.appendChild(n); n.addEventListener('animationend', function () { n.remove(); }); });
  }
  function bg(kind) {
    var old = document.querySelector('.lk-bg'); if (old) old.remove(); if (RM) return; var b = document.createElement('div'), h = '', i;
    b.className = 'lk-bg'; b.setAttribute('aria-hidden', 'true');
    if (kind === 'aurora') h = '<i class="lk-ab2b" style="width:46vw;height:46vw;left:-12vw;top:10vh;background:#19E3B1;animation:lkdrift 20s ease-in-out infinite alternate"></i><i class="lk-ab2b" style="width:42vw;height:42vw;right:-10vw;top:40vh;background:#8E7CFF;animation:lkdrift 26s ease-in-out infinite alternate-reverse"></i><i class="lk-ab2b" style="width:38vw;height:38vw;left:30vw;bottom:-14vw;background:#FF8FC0;opacity:.35;animation:lkdrift 30s ease-in-out infinite alternate"></i>';
    else if (kind === 'fireworks') { for (i = 0; i < 46; i++) h += '<i class="lk-tw" style="left:' + R(0, 100).toFixed(1) + '%;top:' + R(0, 100).toFixed(1) + '%;--t:' + R(2.5, 6).toFixed(1) + 's;--d:-' + R(0, 6).toFixed(1) + 's;transform:scale(' + R(.5, 1.2).toFixed(2) + ')"></i>'; }
    else if (kind === 'balloons') { var C = ['#FF6F91', '#FFC75F', '#4FC3F7', '#8BE28B', '#C3A6FF', '#FF9671']; for (i = 0; i < 8; i++) h += '<i class="lk-bb" style="left:' + (4 + i * 12 + Math.round(R(0, 5))) + '%;--w:' + (34 + (i % 4) * 9) + 'px;--bc:' + C[i % 6] + ';--t:' + (24 + (i % 4) * 5) + 's;--d:-' + (i * 3.3).toFixed(1) + 's"></i>'; }
    b.innerHTML = h; document.body.insertBefore(b, document.body.firstChild);
  }
  /* כותרות האזורים: הופעה לפי גלילה, כל סוג בדרך אחרת (ה-CSS למעלה) */
  function heads() {
    [].forEach.call(document.querySelectorAll('.sec>h2:not(.lk-h)'), function (h) { h.classList.add('lk-h'); if (S.io) S.io.observe(h); else h.classList.add('lk-in'); });
  }
  function sumPop() {
    var el = document.getElementById('sum'); if (!el || RM) return; var last = '';
    if (S.mo) S.mo.disconnect();
    S.mo = new MutationObserver(function () { var b = el.querySelector('.tot b'); if (!b) { last = ''; return; } var t = b.textContent; if (last && t !== last) { b.classList.remove('lk-pop'); void b.offsetWidth; b.classList.add('lk-pop'); } last = t; });
    S.mo.observe(el, { childList: true, subtree: true, characterData: true });
  }
  function bind() {
    if (S.bound) return; S.bound = true;
    document.addEventListener('click', function (e) {
      if (!S.kind) return; var b = e.target.closest && e.target.closest('.qty .plus,.pkg,.go'); if (!b || b.disabled) return;
      var r = b.getBoundingClientRect(), x = e.clientX || r.left + r.width / 2, y = e.clientY || r.top + r.height / 2; burst(x, y);
    }, true);
    window.addEventListener('scroll', function () { S.sy = window.pageYOffset || 0; var bgs = document.querySelector('.lk-bg'); if (bgs && !RM) bgs.style.transform = 'translateY(' + (-S.sy * .06).toFixed(1) + 'px)'; }, { passive: true });
    if (!RM && window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches) {
      document.addEventListener('pointermove', function (e) {
        if (S.kind !== 'studio') return; S.mx = e.clientX; S.my = e.clientY;
        if (!S.cur) { S.cur = document.createElement('i'); S.cur.className = 'lk-cur'; S.cur.setAttribute('aria-hidden', 'true'); document.body.appendChild(S.cur); S.cx = S.mx; S.cy = S.my; loop(); }
        S.cur.classList.toggle('big', !!(e.target.closest && e.target.closest('.prod,.pkg,.go,button,a,summary')));
      }, { passive: true });
    }
  }
  function loop() { if (!S.cur || S.kind !== 'studio') { if (S.cur) { S.cur.remove(); S.cur = null; } return; } S.cx += (S.mx - S.cx) * .2; S.cy += (S.my - S.cy) * .2; S.cur.style.transform = 'translate(' + S.cx.toFixed(1) + 'px,' + S.cy.toFixed(1) + 'px)'; requestAnimationFrame(loop); }
  function start(kind) {
    css(); stop(); S.kind = kind; bind(); bg(kind);
    if ('IntersectionObserver' in window) S.io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('lk-in'); S.io.unobserve(e.target); } }); }, { threshold: .2 });
    heads(); sumPop();
  }
  function stop() {
    S.kind = ''; if (S.io) { S.io.disconnect(); S.io = null; } if (S.mo) { S.mo.disconnect(); S.mo = null; }
    ['.lk-bg', '.lk-fx', '.lk-cur'].forEach(function (q) { var e = document.querySelector(q); if (e) e.remove(); }); S.cur = null;
  }
  window.MLLive3 = { start: start, stop: stop, heads: heads };
})();
