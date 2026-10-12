/* לוח עברי אונליין: לוח שנה מקוון פשוט, שמפנה ל־MyLuach להדפסה ולאפשרויות מתקדמות */
(function(){
'use strict';
const H=window.hebcal;
const {HDate,HebrewCalendar,Location,Zmanim,flags}=H;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const strip=s=>String(s||'').replace(/[֑-ׇ]/g,'');
const evName=e=>{let x=strip(e.render(st.lang==='he'?'he':'en'));if(st.lang==='he')x=x.replace(/\b(5\d{3})\b/,(m,y)=>gem(+y%1000));return x};
const PAGE=window.LC_PAGE||{};
const BASE=PAGE.base||'';
const BUILDER=BASE+'../app.html';

/* ---------- שפה ---------- */
const T={
 he:{siteName:'MyLuach',city:'עיר',menu:'תפריט',month:'לוח חודשי',year:'לוח שנתי',holidays:'חגים ומועדים',zmanim:'זמני היום',shabbat:'זמני שבת',tools:'כלים',reminders:'תזכורות',
  today:'היום',prev:'הקודם',next:'הבא',prevYear:'שנה אחורה',nextYear:'שנה קדימה',hebMode:'עברי',gregMode:'לועזי',jump:'קפיצה לתאריך',go:'מעבר',
  print:'הדפסה ואפשרויות נוספות',printSub:'לוח מעוצב להדפסה, עם התמונות, ימי ההולדת וימי השנה (יארצייטים) שלכם',
  ctaT:'רוצים לוח כזה מודפס ומעוצב?',ctaP:'ב־MyLuach בונים לוח שנה אישי למשפחה, לבית הכנסת או למוסד: תמונות, אירועים משפחתיים, זמנים ודברי הימים.',ctaB:'לבניית לוח אישי',
  sunrise:'הנץ',sunset:'שקיעה',candles:'הדלקת נרות',havdalah:'יציאה',parasha:'פרשת השבוע',nextHoliday:'החג הבא',inDays:n=>n===0?'היום':n===1?'מחר':'בעוד '+n+' ימים',
  daysAgo:n=>n===1?'אתמול':'לפני '+n+' ימים',fromToday:'מהיום',addRem:'הוספת תזכורת',note:'הערה ליום הזה',color:'צבע ליום',save:'שמירה',del:'מחיקה',close:'סגירה',
  showOmer:'ספירת העומר',showTimes:'הדלקה ויציאה',showParasha:'פרשת השבוע',showModern:'ימי זיכרון ועצמאות',
  convert:'המרת תאריכים',countdown:'ספירה לאחור',barmitzvah:'חישוב בר / בת מצווה',days:'חישוב ימים בין תאריכים',yahrzeit:'חישוב יום שנה (יארצייט)',
  weekdays:['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'],wdShort:['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'],
  gMonths:['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']},
 en:{siteName:'MyLuach',city:'City',menu:'Menu',month:'Month',year:'Year',holidays:'Holidays',zmanim:'Zmanim',shabbat:'Shabbat times',tools:'Tools',reminders:'Reminders',
  today:'Today',prev:'Previous',next:'Next',prevYear:'Year back',nextYear:'Year ahead',hebMode:'Hebrew',gregMode:'Gregorian',jump:'Jump to date',go:'Go',
  print:'Print & more options',printSub:'A designed calendar to print, with your photos, birthdays and yahrzeits',
  ctaT:'Want this as a printed calendar?',ctaP:'MyLuach builds a personal Jewish calendar for your family, synagogue or school: photos, family events, zmanim and more.',ctaB:'Build a personal calendar',
  sunrise:'Sunrise',sunset:'Sunset',candles:'Candle lighting',havdalah:'Havdalah',parasha:'Torah portion',nextHoliday:'Next holiday',inDays:n=>n===0?'today':n===1?'tomorrow':'in '+n+' days',
  daysAgo:n=>n===1?'yesterday':n+' days ago',fromToday:'from today',addRem:'Add reminder',note:'Note for this day',color:'Day color',save:'Save',del:'Delete',close:'Close',
  showOmer:'Omer count',showTimes:'Candles & havdalah',showParasha:'Torah portion',showModern:'Israeli national days',
  convert:'Date converter',countdown:'Countdown',barmitzvah:'Bar / Bat Mitzvah calculator',days:'Days between dates',yahrzeit:'Yahrzeit calculator',
  weekdays:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Shabbat'],wdShort:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  gMonths:['January','February','March','April','May','June','July','August','September','October','November','December']}
};
const LS={get(k,d){try{const v=localStorage.getItem('lc-'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('lc-'+k,JSON.stringify(v))}catch(e){}}};
const st=Object.assign({lang:'he',city:'jerusalem',mode:'heb',opts:{omer:true,times:true,parasha:true,modern:true}},LS.get('settings',{}));
if(PAGE.lang)st.lang=PAGE.lang;if(PAGE.city)st.city=PAGE.city;
const t=k=>(T[st.lang]||T.he)[k];
const HE=()=>st.lang==='he';

/* ---------- עזרי תאריך ---------- */
const HEB_MONTHS={1:'ניסן',2:'אייר',3:'סיון',4:'תמוז',5:'אב',6:'אלול',7:'תשרי',8:'חשון',9:'כסלו',10:'טבת',11:'שבט',12:'אדר',13:'אדר ב׳'};
const HEB_ORDER=[7,8,9,10,11,12,13,1,2,3,4,5,6];
function gem(n){const H2=[[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק']],TT=['','י','כ','ל','מ','נ','ס','ע','פ','צ'],O=['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  let s='';for(const [v,l] of H2){while(n>=v){s+=l;n-=v}}if(n===15)s+='טו';else if(n===16)s+='טז';else s+=TT[Math.floor(n/10)]+O[n%10];
  return s.length===1?s+'׳':s.slice(0,-1)+'״'+s.slice(-1)}
const leap=y=>HDate.isLeapYear(y);
const hMonthName=(m,y)=>HE()?(m===12&&leap(y)?'אדר א׳':HEB_MONTHS[m]):new HDate(1,m,y).getMonthName();
const hYear=y=>HE()?gem(y%1000):String(y);
const hDay=d=>HE()?gem(d):String(d);
const hStr=(hd,withYear=true)=>HE()?hDay(hd.getDate())+' '+hMonthName(hd.getMonth(),hd.getFullYear())+(withYear?' '+hYear(hd.getFullYear()):''):hd.getDate()+' '+hMonthName(hd.getMonth(),hd.getFullYear())+(withYear?' '+hd.getFullYear():'');
const gStr=(d,withYear=true)=>HE()?d.getDate()+' ב'+t('gMonths')[d.getMonth()]+(withYear?' '+d.getFullYear():''):t('gMonths')[d.getMonth()]+' '+d.getDate()+(withYear?', '+d.getFullYear():'');
const noon=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);
const addD=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n,12);
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fromIso=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d,12)};
const TODAY=noon(new Date());
const dayDiff=(a,b)=>Math.round((noon(b)-noon(a))/864e5);
function parseHebYear(v){v=String(v||'').trim();if(/^\d{4}$/.test(v))return +v;const s=v.replace(/[״"׳']/g,'');if(!s)return NaN;
  const val={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
  let n=0;for(const c of s)n+=val[c]||0;if(n<1000)n+=5000;return n}

/* ---------- מקום וזמנים ---------- */
const CITIES=window.LC_CITIES||[];
const city=()=>CITIES.find(c=>c.id===st.city)||CITIES[0];
const cityName=c=>HE()?c.he:c.en;
function loc(){const c=city();return new Location(c.lat,c.lng,c.il,c.tz,c.en,'',undefined,c.el||0)}
const fmtT=d=>{if(!(d instanceof Date)||isNaN(d))return '—';try{return new Intl.DateTimeFormat(HE()?'he-IL':'en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:city().tz}).format(d)}catch(e){return '—'}};
/* הגדרות זמנים: מנהג, נץ ושקיעה, צאת שבת והדלקת נרות */
const ZPRE={
  ashkenaz:{he:'אשכנזים (המקובל בארץ)',en:'Ashkenazi (common in Israel)',alot:'16.1',mish:'11.5',mga:['16.1','16.1'],tzeit:'8.5'},
  sefardi:{he:'ספרדים, ע״פ הגר״ע יוסף',en:'Sephardi (R. Ovadia Yosef)',alot:'72z',mish:'66z',mga:['72z','72z'],tzeit:'13.5z'},
  chabad:{he:'חב״ד (בעל התניא)',en:'Chabad (Baal HaTanya)',alot:'16.9',mish:'10.2',mga:['16.9','16.9'],tzeit:'6'},
  chul:{he:'נפוץ בחו״ל (72 דק׳ שוות)',en:'Common abroad (72 fixed minutes)',alot:'72f',mish:'11',mga:['72f','72f'],tzeit:'8.5'},
  gra:{he:'גר״א בלבד, בלי מג״א',en:'GRA only',alot:'16.1',mish:'11',mga:null,tzeit:'8.5'}
};
const zcfg=()=>Object.assign({pre:'ashkenaz',netz:'sea',motz:'8.5',candle:'',both:true},st.zm||{});
const angLbl=k=>{k=String(k);return k.endsWith('z')?parseFloat(k)+(HE()?' דק׳ זמניות':' zmaniyot min'):k.endsWith('f')?parseFloat(k)+(HE()?' דק׳':' min'):k+'°'};
function zm(d){
  const C=zcfg(),P=ZPRE[C.pre]||ZPRE.ashkenaz,L=loc(),z=new Zmanim(L,noon(d),false),ze=new Zmanim(L,noon(d),true),s=f=>{try{const r=f();return r instanceof Date&&!isNaN(r)?r:null}catch(e){return null}};
  const netz=C.netz==='elev'?s(()=>ze.sunrise()):s(()=>z.seaLevelSunrise()),shkia=C.netz==='elev'?s(()=>ze.sunset()):s(()=>z.seaLevelSunset());
  const H=netz&&shkia?(shkia-netz)/12:NaN,T=(x,ms)=>x&&isFinite(ms)?new Date(x.getTime()+ms):null;
  const before=k=>{k=String(k);if(k.endsWith('f'))return T(netz,-parseFloat(k)*6e4);if(k.endsWith('z'))return T(netz,-parseFloat(k)*H/60);return s(()=>z.timeAtAngle(parseFloat(k),true))};
  const after=k=>{k=String(k);if(k.endsWith('f'))return T(shkia,parseFloat(k)*6e4);if(k.endsWith('z'))return T(shkia,parseFloat(k)*H/60);return s(()=>z.timeAtAngle(parseFloat(k),false))};
  const ms=P.mga?before(P.mga[0]):null,me=P.mga?after(P.mga[1]):null,Hm=ms&&me?(me-ms)/12:NaN;
  const nl=C.netz==='elev'?(HE()?'לפי גובה המקום':'with elevation'):(HE()?'מישורי':'sea level');
  const mgaL=P.mga?(HE()?'מעלות השחר '+angLbl(P.mga[0])+' עד צאה״כ '+angLbl(P.mga[1]):'dawn '+angLbl(P.mga[0])+' to nightfall '+angLbl(P.mga[1])):'';
  const rows=[
   ['alot',HE()?'עלות השחר':'Dawn (Alot HaShachar)',before(P.alot),angLbl(P.alot)],
   ['mish',HE()?'משיכיר (טלית ותפילין)':'Misheyakir (tallit & tefillin)',before(P.mish),angLbl(P.mish)],
   ['netz',HE()?'הנץ החמה':'Sunrise',netz,nl],
   P.mga&&C.both?['shmaM',HE()?'סוף זמן ק״ש (מג״א)':'Latest Shema (MGA)',T(ms,3*Hm),HE()?'3 שעות זמניות, '+mgaL:'3 halachic hours, '+mgaL]:null,
   ['shmaG',HE()?'סוף זמן ק״ש (גר״א)':'Latest Shema (GRA)',T(netz,3*H),HE()?'3 שעות זמניות מהנץ עד השקיעה':'3 halachic hours, sunrise to sunset'],
   P.mga&&C.both?['tfilaM',HE()?'סוף זמן תפילה (מג״א)':'Latest Shacharit (MGA)',T(ms,4*Hm),HE()?'4 שעות זמניות':'4 halachic hours']:null,
   ['tfilaG',HE()?'סוף זמן תפילה (גר״א)':'Latest Shacharit (GRA)',T(netz,4*H),HE()?'4 שעות זמניות':'4 halachic hours'],
   ['chatzot',HE()?'חצות היום':'Midday (Chatzot)',T(netz,6*H),''],
   ['minG',HE()?'מנחה גדולה':'Mincha Gedola',(()=>{const a=T(netz,6.5*H),b=T(netz,6*H+30*6e4);return a&&b?new Date(Math.max(a,b)):a})(),HE()?'המאוחר מחצי שעה זמנית או קבועה אחרי חצות':'later of ½ halachic or fixed hour after midday'],
   ['minK',HE()?'מנחה קטנה':'Mincha Ketana',T(netz,9.5*H),HE()?'9.5 שעות זמניות':'9.5 halachic hours'],
   ['plag',HE()?'פלג המנחה':'Plag HaMincha',T(netz,10.75*H),HE()?'10.75 שעות זמניות':'10.75 halachic hours'],
   ['shkia',HE()?'שקיעה':'Sunset',shkia,nl],
   ['tzeit',HE()?'צאת הכוכבים':'Nightfall (Tzeit)',after(P.tzeit),angLbl(P.tzeit)],
   ['rt',HE()?'צאת הכוכבים לר״ת':'Rabbeinu Tam',T(shkia,72*6e4),HE()?'72 דק׳ אחרי השקיעה':'72 min after sunset'],
   ['chatzotN',HE()?'חצות הלילה':'Midnight',T(netz,18*H),HE()?'12 שעות אחרי חצות היום':'12 hours after midday'],
  ].filter(Boolean);
  return rows.map(([k,n,v,m])=>({k,n,v,m}));
}
function candleMins(){const c=zcfg().candle;return c?+c:city().candle}
function havOpts(){const m=zcfg().motz;return m.endsWith('f')?{havdalahMins:parseFloat(m)}:{havdalahDeg:parseFloat(m)}}
function zmSettings(){
  const C=zcfg();
  dialog('<h2 id="dlgT">'+(HE()?'הגדרות זמנים':'Zmanim settings')+'</h2><p class="small mute">'+(HE()?'ההגדרות חלות על זמני היום, זמני השבת והלוח, ונשמרות בדפדפן.':'Applies to zmanim, Shabbat times and the calendar. Saved in this browser.')+'</p>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'מנהג':'Custom')+'<select id="zP">'+Object.entries(ZPRE).map(([k,v])=>'<option value="'+k+'"'+(k===C.pre?' selected':'')+'>'+(HE()?v.he:v.en)+'</option>').join('')+'</select></div>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'נץ ושקיעה':'Sunrise & sunset')+'<select id="zN"><option value="sea">'+(HE()?'מישורי (גובה פני הים)':'Sea level')+'</option><option value="elev">'+(HE()?'לפי גובה המקום (הנראה)':'With elevation (visible)')+'</option></select></div>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'צאת שבת וחג':'Shabbat ends')+'<select id="zM"><option value="8.5">8.5° ('+(HE()?'מקובל':'common')+')</option><option value="7.083">7.083°</option><option value="6">6° ('+(HE()?'חב״ד':'Chabad')+')</option><option value="40f">40 '+(HE()?'דק׳ אחרי השקיעה':'min after sunset')+'</option><option value="50f">50 '+(HE()?'דק׳':'min')+'</option><option value="72f">72 '+(HE()?'דק׳ (רבנו תם)':'min (Rabbeinu Tam)')+'</option></select></div>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'הדלקת נרות':'Candle lighting')+'<select id="zC"><option value="">'+(HE()?'לפי העיר ('+city().candle+' דק׳)':'City default ('+city().candle+' min)')+'</option>'+[15,18,20,22,24,30,40].map(n=>'<option value="'+n+'">'+n+(HE()?' דק׳ לפני השקיעה':' min before sunset')+'</option>').join('')+'</select></div>'+
    '<label class="chk" style="margin-top:10px"><input type="checkbox" id="zB"'+(C.both?' checked':'')+'> '+(HE()?'להציג ק״ש ותפילה גם לפי המג״א':'Show MGA times too')+'</label>'+
    '<div class="row" style="margin-top:14px"><button class="btn pri" type="button" id="zS">'+t('save')+'</button></div>');
  $('#zN').value=C.netz;$('#zM').value=C.motz;$('#zC').value=C.candle;
  $('#zS').onclick=()=>{st.zm={pre:$('#zP').value,netz:$('#zN').value,motz:$('#zM').value,candle:$('#zC').value,both:$('#zB').checked};saveSt();evCache.clear();closeDlg();render()};
}

/* ---------- אירועים ---------- */
const evCache=new Map();
function events(a,b){
  const key=iso(a)+iso(b)+st.city+st.lang+JSON.stringify(st.opts)+JSON.stringify(st.zm||{});if(evCache.has(key))return evCache.get(key);
  const map=new Map();let evs=[];
  try{evs=HebrewCalendar.calendar({start:a,end:b,location:loc(),candlelighting:!!st.opts.times,candleLightingMins:candleMins(),il:city().il,sedrot:!!st.opts.parasha,omer:!!st.opts.omer,noModern:!st.opts.modern,...havOpts()})}catch(e){console.error(e)}
  for(const ev of evs){
    const f=ev.getFlags(),d=ev.getDate().greg(),k=iso(d),desc=ev.getDesc();let txt=strip(ev.render(st.lang==='he'?'he':'en')),cls='';
    if(HE())txt=txt.replace(/\b(5\d{3})\b/,(m,y)=>hYear(+y));
    if(ev.eventTime instanceof Date){txt=(desc.startsWith('Candle')?t('candles'):desc.startsWith('Havdalah')?t('havdalah'):txt.replace(/[:\s]*\d{1,2}:\d{2}.*/,''))+' '+fmtT(ev.eventTime);cls='time'}
    else if(f&flags.PARSHA_HASHAVUA)cls='par';
    else if(f&flags.OMER_COUNT){cls='omer';txt=txt.replace(/^היום /,'')}
    else if(f&(flags.CHAG|flags.MAJOR_FAST))cls='chag';
    if(!map.has(k))map.set(k,[]);map.get(k).push({txt,cls,chag:!!(f&flags.CHAG),f,ev});
  }
  evCache.set(key,map);if(evCache.size>40)evCache.delete(evCache.keys().next().value);return map;
}

/* ---------- תזכורות והערות (נשמרות בדפדפן) ---------- */
let REM=LS.get('rem',[]),NOTES=LS.get('notes',{});
const saveRem=()=>LS.set('rem',REM),saveNotes=()=>LS.set('notes',NOTES);
function remHits(r,d){const hd=new HDate(d);
  if(r.rec==='once')return r.date===iso(d);
  if(r.rec==='greg')return d.getDate()===+r.d&&d.getMonth()+1===+r.m;
  if(r.rec==='monthly')return hd.getDate()===+r.d;
  const len=HDate.daysInMonth(hd.getMonth(),hd.getFullYear()),day=(+r.d===30&&len===29)?29:+r.d,m=+r.m;
  const mm=m===13?(leap(hd.getFullYear())?13:12):(m===12&&leap(hd.getFullYear())?12:m);
  return hd.getMonth()===mm&&hd.getDate()===day}
const remsOn=d=>REM.filter(r=>remHits(r,d));

/* ---------- ניווט ---------- */
const VIEWS=['month','year','holidays','zmanim','shabbat','countdown','tools','reminders'];
let view=PAGE.view||'month',anchor=TODAY,sub=PAGE.tool||'',CDQ=null;
function readHash(){const h=decodeURIComponent(location.hash.slice(1));if(!h)return;const [v,a]=h.split('/');
  if(v==='countdown'){view='tools';sub='countdown';return}
  if(VIEWS.includes(v)){view=v;if(v==='tools'){const [sb,qs]=(a||'').split('?');sub=sb||'';if(qs)CDQ=Object.fromEntries(new URLSearchParams(qs))}else if(a&&/^\d{4}-\d{2}-\d{2}$/.test(a))anchor=fromIso(a)}}
function go(v,a,s){if(v==='countdown'){v='tools';s='countdown'}view=v;if(a)anchor=a;if(s!==undefined)sub=s;const h=v+(v==='tools'?(sub?'/'+sub:''):a?'/'+iso(anchor):'');
  if(!PAGE.static||(v===PAGE.view&&v!=='tools'))history.replaceState(null,'',PAGE.static?location.pathname+'#'+h:'#'+h);else{location.href=(PAGE.root||'./')+'#'+h;return}
  render();window.scrollTo({top:0})}

/* ---------- תצוגות ---------- */
function monthDays(){
  if(st.mode==='heb'){const hd=new HDate(anchor),m=hd.getMonth(),y=hd.getFullYear(),len=HDate.daysInMonth(m,y),first=new HDate(1,m,y).greg();
    return {title:hMonthName(m,y)+' '+hYear(y),other:(()=>{const a=noon(first),b=addD(a,len-1);return gStr(a,false)+' – '+gStr(b)})(),days:Array.from({length:len},(_,i)=>addD(noon(first),i))}}
  const y=anchor.getFullYear(),m=anchor.getMonth(),len=new Date(y,m+1,0).getDate(),days=Array.from({length:len},(_,i)=>new Date(y,m,i+1,12));
  const a=new HDate(days[0]),b=new HDate(days[len-1]);
  return {title:t('gMonths')[m]+' '+y,other:hStr(a,a.getFullYear()!==b.getFullYear())+' – '+hStr(b),days};
}
function shiftMonth(n){
  if(st.mode==='heb'){const hd=new HDate(anchor);let m=hd.getMonth(),y=hd.getFullYear();const seq=[];[y-1,y,y+1].forEach(yy=>HEB_ORDER.forEach(mm=>{if(mm!==13||leap(yy))seq.push([mm,yy])}));
    const i=seq.findIndex(x=>x[0]===m&&x[1]===y),[nm,ny]=seq[i+n];anchor=noon(new HDate(1,nm,ny).greg())}
  else anchor=new Date(anchor.getFullYear(),anchor.getMonth()+n,1,12)}
function shiftYear(n){if(st.mode==='heb'){const hd=new HDate(anchor);let m=hd.getMonth();const y=hd.getFullYear()+n;if(m===13&&!leap(y))m=12;anchor=noon(new HDate(1,m,y).greg())}else anchor=new Date(anchor.getFullYear()+n,anchor.getMonth(),1,12)}

function viewMonth(){
  const M=monthDays(),ev=events(addD(M.days[0],-1),M.days[M.days.length-1]);
  const lead=M.days[0].getDay();
  let g='<div class="grid">'+t('weekdays').map((w,i)=>'<div class="wd"><span class="wl">'+w+'</span><span class="ws">'+t('wdShort')[i]+'</span></div>').join('');
  for(let i=0;i<lead;i++)g+='<div class="day pad"></div>';
  for(const d of M.days){
    const hd=new HDate(d),items=ev.get(iso(d))||[],chag=items.some(x=>x.chag),note=NOTES[iso(d)]||{};
    const main=st.mode==='heb'?hDay(hd.getDate()):d.getDate(),sec=st.mode==='heb'?d.getDate():hDay(hd.getDate());
    g+='<button type="button" class="day'+(d.getDay()===6?' sh':'')+(chag?' chag':'')+(iso(d)===iso(TODAY)?' today':'')+'" data-day="'+iso(d)+'"'+(note.color?' style="background:'+esc(note.color)+'"':'')+' aria-label="'+esc(hStr(hd)+', '+gStr(d))+'">'+
      '<span class="dn"><b>'+main+'</b><i>'+sec+'</i></span>'+
      items.map(x=>'<span class="ev '+x.cls+'">'+esc(x.txt)+'</span>').join('')+
      remsOn(d).map(r=>'<span class="ev rem">'+esc(r.name)+'</span>').join('')+
      (note.text?'<span class="ev note">'+esc(note.text)+'</span>':'')+'</button>';
  }
  const tot=lead+M.days.length;for(let i=tot;i<Math.ceil(tot/7)*7;i++)g+='<div class="day pad"></div>';
  g+='</div>';
  const hdA=new HDate(anchor);
  const jumpH='<span class="jump"><select id="jD">'+Array.from({length:30},(_,i)=>'<option value="'+(i+1)+'">'+hDay(i+1)+'</option>').join('')+'</select><select id="jM">'+HEB_ORDER.map(m=>'<option value="'+m+'"'+(m===hdA.getMonth()?' selected':'')+'>'+(m===12?(HE()?'אדר / אדר א׳':'Adar / Adar I'):m===13?(HE()?'אדר ב׳':'Adar II'):hMonthName(m,5785))+'</option>').join('')+'</select><input id="jY" size="6" value="'+hYear(hdA.getFullYear())+'" aria-label="year"><button class="btn" type="button" id="jGoH">'+t('go')+'</button></span>';
  const jumpG='<span class="jump"><input type="date" id="jG" value="'+iso(anchor)+'"><button class="btn" type="button" id="jGoG">'+t('go')+'</button></span>';
  $('#main').innerHTML='<div class="bar no-print"><span class="seg" role="group"><button type="button" data-mode="heb" aria-pressed="'+(st.mode==='heb')+'">'+t('hebMode')+'</button><button type="button" data-mode="greg" aria-pressed="'+(st.mode==='greg')+'">'+t('gregMode')+'</button></span>'+
    '<span class="nav-arrows"><button class="btn" type="button" data-sh="-12" title="'+t('prevYear')+'">«</button><button class="btn" type="button" data-sh="-1" title="'+t('prev')+'">'+(HE()?'→':'←')+'</button><button class="btn" type="button" id="tdy">'+t('today')+'</button><button class="btn" type="button" data-sh="1" title="'+t('next')+'">'+(HE()?'←':'→')+'</button><button class="btn" type="button" data-sh="12" title="'+t('nextYear')+'">»</button></span>'+
    '<details class="jump-d"><summary class="btn">'+t('jump')+'</summary><div class="jump" style="margin-top:6px">'+jumpH+jumpG+'</div></details>'+
    '<a class="btn pri" href="'+builderLink()+'">🖨 '+t('print')+'</a></div>'+
    '<div class="opts no-print">'+[['times','showTimes'],['parasha','showParasha'],['omer','showOmer'],['modern','showModern']].map(([k,l])=>'<label class="chk"><input type="checkbox" data-opt="'+k+'"'+(st.opts[k]?' checked':'')+'> '+t(l)+'</label>').join('')+'</div>'+
    '<section class="month"><div class="mhead"><h1 class="sr">'+esc(pageH1())+'</h1><h2>'+esc(M.title)+'</h2><span class="mute">'+esc(M.other)+'</span></div>'+g+'</section>'+seoBlock();
  const jd=$('#jD');if(jd)jd.value=String(hdA.getDate());
}
function viewYear(){
  const hd=new HDate(anchor),hy=hd.getFullYear(),gy=anchor.getFullYear();
  let months=[];
  if(st.mode==='heb'){HEB_ORDER.forEach(m=>{if(m===13&&!leap(hy))return;const yy=m>=7?hy:hy;const first=noon(new HDate(1,m,yy).greg()),len=HDate.daysInMonth(m,yy);months.push({t:hMonthName(m,yy),days:Array.from({length:len},(_,i)=>addD(first,i))})})}
  else for(let m=0;m<12;m++){const len=new Date(gy,m+1,0).getDate();months.push({t:t('gMonths')[m],days:Array.from({length:len},(_,i)=>new Date(gy,m,i+1,12))})}
  const all=months.flatMap(x=>x.days),ev=events(all[0],all[all.length-1]);
  const title=st.mode==='heb'?(HE()?'לוח שנה '+hYear(hy):'Hebrew year '+hy):(HE()?'לוח שנה '+gy:'Calendar '+gy);
  $('#main').innerHTML='<div class="bar no-print"><h1>'+esc(title)+'</h1><span class="seg"><button type="button" data-mode="heb" aria-pressed="'+(st.mode==='heb')+'">'+t('hebMode')+'</button><button type="button" data-mode="greg" aria-pressed="'+(st.mode==='greg')+'">'+t('gregMode')+'</button></span><span class="nav-arrows"><button class="btn" type="button" data-shy="-1">'+(HE()?'→':'←')+'</button><button class="btn" type="button" data-shy="1">'+(HE()?'←':'→')+'</button></span><a class="btn pri" href="'+builderLink()+'">🖨 '+t('print')+'</a></div>'+
    '<div class="ygrid">'+months.map(mo=>'<div class="ym" role="button" tabindex="0" data-goto="'+iso(mo.days[0])+'"><h3>'+esc(mo.t)+'</h3><div class="g">'+t('wdShort').map(w=>'<span class="h">'+w.replace('׳','')+'</span>').join('')+'<span></span>'.repeat(mo.days[0].getDay())+
      mo.days.map(d=>{const its=ev.get(iso(d))||[],c=its.some(x=>x.chag);const hdd=new HDate(d);return '<span class="'+(d.getDay()===6?'s ':'')+(c?'c ':'')+(iso(d)===iso(TODAY)?'t':'')+'" title="'+esc(its.filter(x=>x.cls!=='time'&&x.cls!=='omer').map(x=>x.txt).join(' · '))+'">'+(st.mode==='heb'?hDay(hdd.getDate()).replace(/[׳״]/g,''):d.getDate())+'</span>'}).join('')+'</div></div>').join('')+'</div>'+seoBlock();
}
function viewHolidays(){
  const hy=new HDate(anchor).getFullYear();
  let evs=[];try{evs=HebrewCalendar.calendar({year:hy,isHebrewYear:true,il:city().il,noModern:!st.opts.modern})}catch(e){}
  const rows=evs.filter(e=>!(e.getFlags()&(flags.ROSH_CHODESH|flags.SHABBAT_MEVARCHIM|flags.DAF_YOMI|flags.OMER_COUNT)));
  $('#main').innerHTML='<div class="bar"><h1>'+(HE()?'חגים ומועדים '+hYear(hy):'Jewish holidays '+hy)+'</h1><span class="nav-arrows"><button class="btn" type="button" data-hy="-1">'+(HE()?'→':'←')+'</button><button class="btn" type="button" data-hy="1">'+(HE()?'←':'→')+'</button></span><a class="btn pri" href="'+builderLink()+'">🖨 '+t('print')+'</a></div>'+
    '<div class="tbl-wrap"><table class="t"><thead><tr><th>'+(HE()?'מועד':'Holiday')+'</th><th>'+(HE()?'תאריך עברי':'Hebrew date')+'</th><th>'+(HE()?'תאריך לועזי':'Date')+'</th><th>'+(HE()?'יום':'Day')+'</th><th></th></tr></thead><tbody>'+
    rows.map(e=>{const d=noon(e.getDate().greg()),n=dayDiff(TODAY,d),major=!!(e.getFlags()&(flags.CHAG|flags.MAJOR_FAST));
      return '<tr class="'+(n<0?'past ':'')+(major?'major':'')+'"><td>'+esc(evName(e))+'</td><td>'+esc(hStr(e.getDate()))+'</td><td>'+esc(gStr(d))+'</td><td>'+t('weekdays')[d.getDay()]+'</td><td class="mute">'+(n>=0?t('inDays')(n):'')+'</td></tr>'}).join('')+'</tbody></table></div>'+seoBlock();
}
function viewZmanim(){
  const d=anchor,Z=zm(d),hd=new HDate(d);
  const M=monthDays();const keys=['alot','netz','shmaM','shmaG','tfilaG','chatzot','minG','plag','shkia','tzeit'];
  $('#main').innerHTML='<div class="bar"><h1>'+(HE()?'זמני היום ב'+cityName(city()):'Zmanim for '+cityName(city()))+'</h1><span class="jump"><button class="btn" type="button" data-zd="-1">'+(HE()?'→':'←')+'</button><input type="date" id="zDate" value="'+iso(d)+'"><button class="btn" type="button" data-zd="1">'+(HE()?'←':'→')+'</button></span><button class="btn" type="button" data-zset="1">⚙ '+(HE()?'הגדרות זמנים':'Zmanim settings')+'</button><a class="btn pri" href="'+builderLink()+'">🖨 '+t('print')+'</a></div>'+
    '<div class="card"><h2>'+t('weekdays')[d.getDay()]+', '+esc(hStr(hd))+' · '+esc(gStr(d))+'</h2><div class="zl" style="margin-top:10px">'+Z.map(z=>'<span>'+esc(z.n)+'</span><b>'+fmtT(z.v)+'</b>'+(z.m?'<span class="sub">'+esc(z.m)+'</span>':'')).join('')+'</div>'+
    '<p class="mute small">'+(HE()?'הזמנים מחושבים אסטרונומית לפי מיקום העיר ואינם תחליף ללוח של רב הקהילה.':'Times are calculated astronomically for the city location.')+'</p></div>'+
    '<h2 style="margin:18px 0 8px">'+esc(M.title)+'</h2><div class="tbl-wrap"><table class="t"><thead><tr><th></th>'+keys.map(k=>'<th>'+esc(Z.find(z=>z.k===k).n.replace(/ \(.*\)/,'').replace('סוף זמן ',''))+(k==='shmaM'?' מג״א':k==='shmaG'?' גר״א':'')+'</th>').join('')+'</tr></thead><tbody>'+
    M.days.map(x=>{const zz=zm(x);return '<tr><td>'+esc(t('wdShort')[x.getDay()]+' '+(st.mode==='heb'?hDay(new HDate(x).getDate()):x.getDate()))+'</td>'+keys.map(k=>'<td>'+fmtT(zz.find(z=>z.k===k).v)+'</td>').join('')+'</tr>'}).join('')+'</tbody></table></div>'+seoBlock();
}
function viewShabbat(){
  const a=TODAY,b=addD(TODAY,7*16),ev=events(a,b),rows=[];
  for(let d=a;d<=b;d=addD(d,1)){const its=ev.get(iso(d))||[];const c=its.find(x=>x.ev.getDesc().startsWith('Candle'));if(!c)continue;
    let e=d;const hv=[];for(let k=1;k<4;k++){const x=addD(d,k),xi=ev.get(iso(x))||[];const h=xi.find(y=>y.ev.getDesc().startsWith('Havdalah'));if(h){e=x;hv.push(h);break}}
    const names=[];for(let x=d;x<=e;x=addD(x,1))for(const y of ev.get(iso(x))||[])if(y.cls==='par'||y.chag)names.push(y.txt);
    rows.push({d,c:fmtT(c.ev.eventTime),h:hv[0]?fmtT(hv[0].ev.eventTime):'—',n:[...new Set(names)].join(' · ')})}
  $('#main').innerHTML='<div class="bar"><h1>'+(HE()?'זמני כניסת ויציאת שבת ב'+cityName(city()):'Shabbat times in '+cityName(city()))+'</h1><button class="btn" type="button" data-zset="1">⚙ '+(HE()?'הגדרות זמנים':'Zmanim settings')+'</button><a class="btn pri" href="'+builderLink()+'">🖨 '+t('print')+'</a></div>'+
    '<div class="tbl-wrap"><table class="t"><thead><tr><th>'+(HE()?'שבת / חג':'Shabbat / Holiday')+'</th><th>'+(HE()?'תאריך':'Date')+'</th><th>'+t('candles')+'</th><th>'+t('havdalah')+'</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><td>'+esc(r.n)+'</td><td>'+t('weekdays')[r.d.getDay()]+' '+esc(gStr(r.d,false))+' · '+esc(hStr(new HDate(r.d),false))+'</td><td>'+r.c+'</td><td>'+r.h+'</td></tr>').join('')+'</tbody></table></div>'+
    '<p class="mute small">'+(HE()?'הדלקת נרות '+candleMins()+' דקות לפני השקיעה, יציאה '+angLbl(zcfg().motz)+(zcfg().motz.endsWith('f')?' אחרי השקיעה':' מתחת לאופק')+'.':'Candle lighting '+candleMins()+' minutes before sunset; havdalah '+angLbl(zcfg().motz)+'.')+'</p>'+seoBlock();
}

/* ---------- כלים ---------- */
const TOOLS=[['convert','convert',HE()?'מתאריך לועזי לעברי ולהפך, כולל אחרי השקיעה':''],['barmitzvah','barmitzvah',''],['yahrzeit','yahrzeit',''],['days','days','']];
function viewTools(){
  if(!sub){$('#main').innerHTML='<div class="bar"><h1>'+t('tools')+'</h1></div><div class="tools">'+
    [['countdown',HE()?'כמה ימים נשארו לחתונה, לבר המצווה או ללידה. עם קישור לשיתוף ולוח מעוצב להדפסה.':'Days left until the wedding, Bar Mitzvah or birth, with a share link and a printable design.'],
     ['convert',HE()?'מתאריך לועזי לעברי ומעברי ללועזי, כולל לידה אחרי השקיעה.':'Gregorian ↔ Hebrew, including after-sunset births.'],
     ['barmitzvah',HE()?'תאריך בר / בת המצווה, יום השבת ופרשת השבוע.':'Bar/Bat Mitzvah date, Shabbat and Torah portion.'],
     ['yahrzeit',HE()?'תאריכי יום השנה (יארצייט) בשנים הקרובות לפי תאריך הפטירה.':'Upcoming yahrzeit dates from the date of passing.'],
     ['days',HE()?'כמה ימים בין שני תאריכים, ומה התאריך בעוד X ימים.':'Days between two dates, or the date X days from now.']].map(([k,d])=>'<a class="card tool" href="#tools/'+k+'" data-tool="'+k+'"><h3>'+t(k)+'</h3><p class="mute small">'+d+'</p></a>').join('')+'</div>'+seoBlock();return}
  const back='<a href="#tools" data-tool="" class="small">'+(HE()?'→ כל הכלים':'← All tools')+'</a>';
  if(sub==='countdown')return viewCountdown(back);
  if(sub==='convert'){
    $('#main').innerHTML=back+'<div class="bar"><h1>'+t('convert')+'</h1></div><div class="card"><h2>'+(HE()?'מלועזי לעברי':'Gregorian → Hebrew')+'</h2><div class="row" style="margin-top:8px"><label class="fld">'+(HE()?'תאריך לועזי':'Date')+'<input type="date" id="cG" value="'+iso(TODAY)+'"></label><label class="chk"><input type="checkbox" id="cN"> '+(HE()?'אחרי השקיעה':'After sunset')+'</label></div><div class="res" id="cGR"></div></div>'+
      '<div class="card" style="margin-top:12px"><h2>'+(HE()?'מעברי ללועזי':'Hebrew → Gregorian')+'</h2><div class="row" style="margin-top:8px"><label class="fld">'+(HE()?'יום':'Day')+'<select id="cHD">'+Array.from({length:30},(_,i)=>'<option value="'+(i+1)+'">'+hDay(i+1)+'</option>').join('')+'</select></label><label class="fld">'+(HE()?'חודש':'Month')+'<select id="cHM">'+HEB_ORDER.map(m=>'<option value="'+m+'">'+(m===12?(HE()?'אדר / אדר א׳':'Adar / Adar I'):m===13?(HE()?'אדר ב׳':'Adar II'):hMonthName(m,5785))+'</option>').join('')+'</select></label><label class="fld">'+(HE()?'שנה':'Year')+'<input id="cHY" size="8" value="'+hYear(new HDate(TODAY).getFullYear())+'"></label></div><div class="res" id="cHR"></div></div>'+seoBlock();
    const hd=new HDate(TODAY);$('#cHD').value=hd.getDate();$('#cHM').value=hd.getMonth();
    const g=()=>{const v=$('#cG').value;if(!v)return;let d=fromIso(v);if($('#cN').checked)d=addD(d,1);const h=new HDate(d);$('#cGR').innerHTML='<div class="big">'+esc(hStr(h))+'</div><div class="mute">'+t('weekdays')[fromIso(v).getDay()]+($('#cN').checked?(HE()?' בלילה (אור ל'+t('weekdays')[d.getDay()]+')':' evening'):'')+'</div>'};
    const h=()=>{const y=parseHebYear($('#cHY').value);if(!(y>3000&&y<7000)){$('#cHR').textContent=HE()?'כתבו שנה, למשל תשפ״ז או 5787':'Enter a year, e.g. 5787';return}
      let m=+$('#cHM').value;if(m===13&&!leap(y))m=12;const len=HDate.daysInMonth(m,y),dd=Math.min(+$('#cHD').value,len);const d=noon(new HDate(dd,m,y).greg());
      $('#cHR').innerHTML='<div class="big">'+t('weekdays')[d.getDay()]+', '+esc(gStr(d))+'</div>'+(dd!==+$('#cHD').value?'<div class="mute">'+(HE()?'בחודש הזה יש '+len+' ימים':'This month has '+len+' days')+'</div>':'')+'<div class="mute">'+esc(relDays(d))+'</div>'};
    ['cG','cN'].forEach(i=>$('#'+i).addEventListener('input',g));['cHD','cHM','cHY'].forEach(i=>$('#'+i).addEventListener('input',h));g();h();return}
  if(sub==='barmitzvah'){
    $('#main').innerHTML=back+'<div class="bar"><h1>'+t('barmitzvah')+'</h1></div><div class="card"><div class="row"><label class="fld">'+(HE()?'תאריך לידה (לועזי)':'Date of birth')+'<input type="date" id="bD" value="2014-01-01"></label><label class="chk"><input type="checkbox" id="bN"> '+(HE()?'נולד/ה אחרי השקיעה':'Born after sunset')+'</label><span class="seg"><button type="button" data-bg="bar" aria-pressed="true">'+(HE()?'בר מצווה (13)':'Bar Mitzvah (13)')+'</button><button type="button" data-bg="bat" aria-pressed="false">'+(HE()?'בת מצווה (12)':'Bat Mitzvah (12)')+'</button></span></div><div class="res" id="bR"></div></div>'+seoBlock();
    let gender='bar';
    const calc=()=>{const v=$('#bD').value;if(!v)return;let d=fromIso(v);if($('#bN').checked)d=addD(d,1);const h=new HDate(d),age=gender==='bar'?13:12;
      let bm;try{bm=HebrewCalendar.getBirthdayOrAnniversary(h.getFullYear()+age,h)}catch(e){bm=null}
      if(!bm){$('#bR').textContent='—';return}
      const gd=noon(bm.greg()),sat=addD(gd,(6-gd.getDay()+7)%7);let par='';
      try{const e=HebrewCalendar.calendar({start:sat,end:sat,sedrot:true,il:city().il,noHolidays:true}).find(x=>x.getFlags()&flags.PARSHA_HASHAVUA);if(e)par=evName(e)}catch(e){}
      $('#bR').innerHTML='<div class="mute">'+(HE()?'תאריך לידה עברי: ':'Hebrew birth date: ')+esc(hStr(h))+'</div><div class="big">'+esc(hStr(bm))+'</div><div>'+t('weekdays')[gd.getDay()]+', '+esc(gStr(gd))+' · '+esc(relDays(gd))+'</div>'+
        (gender==='bar'?'<div style="margin-top:6px">'+(HE()?'עלייה לתורה בשבת ':'Aliyah on Shabbat ')+esc(gStr(sat))+(par?' · <b>'+esc(par)+'</b>':'')+'</div>':'')+
        '<div style="margin-top:10px"><a class="btn pri" href="'+builderLink()+'">'+(HE()?'להזמנה ולוח מעוצב':'Design a calendar')+'</a></div>'};
    $('#bD').addEventListener('input',calc);$('#bN').addEventListener('input',calc);
    document.querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{gender=b.dataset.bg;document.querySelectorAll('[data-bg]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));calc()});calc();return}
  if(sub==='yahrzeit'){
    $('#main').innerHTML=back+'<div class="bar"><h1>'+t('yahrzeit')+'</h1></div><div class="card"><div class="row"><label class="fld">'+(HE()?'תאריך הפטירה (לועזי)':'Date of passing')+'<input type="date" id="yD" value="'+iso(addD(TODAY,-400))+'"></label><label class="chk"><input type="checkbox" id="yN"> '+(HE()?'אחרי השקיעה':'After sunset')+'</label></div><div class="res" id="yR"></div></div>'+seoBlock();
    const calc=()=>{const v=$('#yD').value;if(!v)return;let d=fromIso(v);if($('#yN').checked)d=addD(d,1);const h=new HDate(d),y0=new HDate(TODAY).getFullYear();let rows='';
      for(let y=Math.max(h.getFullYear()+1,y0);y<y0+8;y++){let x;try{x=HebrewCalendar.getYahrzeit(y,h)}catch(e){x=null}if(!x)continue;const gd=noon(x.greg());if(gd<addD(TODAY,-1))continue;rows+='<tr><td>'+esc(hStr(x))+'</td><td>'+t('weekdays')[gd.getDay()]+', '+esc(gStr(gd))+'</td><td class="mute">'+esc(relDays(gd))+'</td></tr>'}
      $('#yR').innerHTML='<div class="mute">'+(HE()?'תאריך הפטירה העברי: ':'Hebrew date of passing: ')+esc(hStr(h))+'</div><div class="tbl-wrap" style="margin-top:8px"><table class="t"><tbody>'+rows+'</tbody></table></div><p class="small mute">'+(HE()?'יום השנה (יארצייט) מתחיל בערב שלפני התאריך הלועזי.':'The yahrzeit begins the evening before.')+'</p>'};
    $('#yD').addEventListener('input',calc);$('#yN').addEventListener('input',calc);calc();return}
  if(sub==='days'){
    $('#main').innerHTML=back+'<div class="bar"><h1>'+t('days')+'</h1></div><div class="card"><div class="row"><label class="fld">'+(HE()?'מתאריך':'From')+'<input type="date" id="dA" value="'+iso(TODAY)+'"></label><label class="fld">'+(HE()?'עד תאריך':'To')+'<input type="date" id="dB" value="'+iso(addD(TODAY,100))+'"></label></div><div class="res" id="dR1"></div></div>'+
      '<div class="card" style="margin-top:12px"><div class="row"><label class="fld">'+(HE()?'מתאריך':'From')+'<input type="date" id="dC" value="'+iso(TODAY)+'"></label><label class="fld">'+(HE()?'עוד כמה ימים (אפשר גם מינוס)':'Add days (can be negative)')+'<input type="number" id="dN" value="40"></label></div><div class="res" id="dR2"></div></div>'+seoBlock();
    const c1=()=>{const a=$('#dA').value,b=$('#dB').value;if(!a||!b)return;const n=dayDiff(fromIso(a),fromIso(b)),w=Math.floor(Math.abs(n)/7),r=Math.abs(n)%7;$('#dR1').innerHTML='<div class="big">'+Math.abs(n)+(HE()?' ימים':' days')+'</div><div class="mute">'+(HE()?w+' שבועות ו־'+r+' ימים':w+' weeks and '+r+' days')+'</div>'};
    const c2=()=>{const a=$('#dC').value;if(!a)return;const d=addD(fromIso(a),+$('#dN').value||0);$('#dR2').innerHTML='<div class="big">'+t('weekdays')[d.getDay()]+', '+esc(gStr(d))+'</div><div>'+esc(hStr(new HDate(d)))+'</div>'};
    ['dA','dB'].forEach(i=>$('#'+i).addEventListener('input',c1));['dC','dN'].forEach(i=>$('#'+i).addEventListener('input',c2));c1();c2();return}
}
/* ---------- ספירה לאחור ---------- */
const CD_ST=[['classic','קלאסי','Classic','#1e5a63','#fff','🎉'],['bride','כלה וחתונה','Wedding','#a8646f','#fdf8f5','💍'],['barmitzvah','בר מצווה','Bar Mitzvah','#1f3a5f','#fbfaf5','✡'],['batmitzvah','בת מצווה','Bat Mitzvah','#b8487a','#fff7fa','🌸'],['kids','ילדים','Kids','#e0663a','#fffaf0','🎈'],['baby','לידה ותינוק','Baby','#5b8db8','#f7fbff','👶']];
const CD_LAY=[['board',HE()?'לוח מספרים: כל הימים בטבלה אחת':'Number board: all days in one table'],['months',HE()?'עמוד לכל חודש':'A page per month'],['poster',HE()?'פוסטר: כל הימים בדף אחד':'Poster: all days on one page'],['scroll',HE()?'דף צר וארוך לגלילה':'Long narrow page to scroll'],['chain',HE()?'שרשרת נייר לגזירה':'Paper chain to cut out']];
function viewCountdown(back){
  const q=CDQ||LS.get('cd',{});const v={t:q.t||'',d:q.d||iso(addD(TODAY,60)),st:q.st||'bride',l:q.l||'months'};
  $('#main').innerHTML=back+'<div class="bar"><h1>'+t('countdown')+'</h1></div><div class="card"><div class="row"><label class="fld" style="flex:2 1 220px">'+(HE()?'למה סופרים':'Counting down to')+'<input id="kT" value="'+esc(v.t)+'" placeholder="'+(HE()?'למשל: החתונה של רחלי ודוד':'e.g. Sarah &amp; David&#39;s wedding')+'"></label><label class="fld">'+(HE()?'תאריך':'Date')+'<input type="date" id="kD" value="'+esc(v.d)+'"></label></div>'+
    '<div class="row" style="margin-top:8px"><label class="fld">'+(HE()?'עיצוב':'Style')+'<select id="kS">'+CD_ST.map(x=>'<option value="'+x[0]+'">'+(HE()?x[1]:x[2])+'</option>').join('')+'</select></label><label class="fld">'+(HE()?'צורה להדפסה':'Print layout')+'<select id="kL">'+CD_LAY.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('')+'</select></label></div></div>'+
    '<div id="kOut" style="margin-top:12px"></div>'+seoBlock();
  $('#kS').value=v.st;$('#kL').value=v.l;
  const draw=()=>{
    const o={t:$('#kT').value.trim(),d:$('#kD').value,st:$('#kS').value,l:$('#kL').value};LS.set('cd',o);if(!o.d)return;
    const to=fromIso(o.d),n=dayDiff(TODAY,to),S=CD_ST.find(x=>x[0]===o.st)||CD_ST[0],hd=new HDate(to);
    const w=Math.floor(Math.abs(n)/7),r=Math.abs(n)%7;
    const share=location.origin+location.pathname.replace(/[^/]*$/,'')+(PAGE.root&&PAGE.static?PAGE.root:'')+'#tools/countdown?'+new URLSearchParams(o).toString();
    const print=BUILDER+'#countdown&'+new URLSearchParams({d:o.d,t:o.t||(HE()?'הספירה לאחור':'Countdown'),st:o.st,l:o.l}).toString();
    let mini='';const start=TODAY,end=to<start?start:to;let cnt=0;
    for(let d=new Date(start.getFullYear(),start.getMonth(),1,12);d<=end&&cnt<3;d=new Date(d.getFullYear(),d.getMonth()+1,1,12),cnt++){
      const len=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();let g='<div class="kmo"><b>'+t('gMonths')[d.getMonth()]+'</b><div class="kgrid">'+'<span></span>'.repeat(d.getDay());
      for(let i=1;i<=len;i++){const x=new Date(d.getFullYear(),d.getMonth(),i,12),k=dayDiff(x,to);g+='<span class="'+(k===0?'goal':k<0||x<TODAY?'past':'')+'">'+(k===0?S[5]:k>0&&x>=TODAY?k:'')+'</span>'}
      mini+=g+'</div></div>'}
    $('#kOut').innerHTML='<div class="kcard" style="--k:'+S[3]+';--kb:'+S[4]+'"><div class="ktitle">'+esc(o.t||(HE()?'הספירה לאחור':'Countdown'))+'</div><div class="kbig">'+(n===0?S[5]:Math.abs(n))+'</div><div class="ksub">'+(n===0?(HE()?'היום!':'Today!'):n>0?(HE()?'ימים נשארו':'days to go')+(w?' · '+(HE()?w+' שבועות ו־'+r+' ימים':w+' weeks, '+r+' days'):''):(HE()?'ימים עברו':'days ago'))+'</div><div class="kdate">'+t('weekdays')[to.getDay()]+', '+esc(hStr(hd))+' · '+esc(gStr(to))+'</div><div class="kmini">'+mini+'</div></div>'+
      '<div class="row" style="margin-top:12px"><a class="btn pri big" href="'+print+'">🖨 '+(HE()?'הדפסה והורדה בעיצוב מלא':'Print & download the full design')+'</a><button class="btn" type="button" id="kShare">🔗 '+(HE()?'העתקת קישור לשיתוף':'Copy share link')+'</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent((o.t||'')+' · '+(HE()?'עוד '+n+' ימים! ':n+' days to go! ')+share)+'">WhatsApp</a></div>'+
      '<p class="small mute">'+(HE()?'הקישור מראה לכל מי שמקבל אותו כמה ימים נשארו, ומתעדכן לבד כל יום. הלוח המעוצב להדפסה (פוסטר, עמוד לכל חודש, דף ארוך לגלילה או שרשרת נייר) נבנה ב־MyLuach.':'The link shows how many days are left and updates daily. The printable design is built in MyLuach.')+'</p>';
    $('#kShare').onclick=async e=>{try{await navigator.clipboard.writeText(share);e.target.textContent=HE()?'הקישור הועתק':'Copied'}catch(err){prompt('',share)}};
  };
  ['kT','kD','kS','kL'].forEach(i=>$('#'+i).addEventListener('input',draw));draw();
}
function relDays(d){const n=dayDiff(TODAY,d);return n>=0?t('inDays')(n):t('daysAgo')(-n)}

/* ---------- תזכורות ---------- */
function viewReminders(){
  $('#main').innerHTML='<div class="bar"><h1>'+t('reminders')+'</h1><button class="btn pri" type="button" id="remNew">+ '+t('addRem')+'</button></div>'+
    '<div class="card"><p class="small mute" style="margin-top:0">'+(HE()?'ימי הולדת, ימי נישואין, ימי שנה (יארצייטים) ותזכורות. הם מופיעים בלוח, ואפשר להוסיף אותם ליומן בטלפון עם התראה. התזכורות נשמרות בדפדפן הזה.':'Birthdays, anniversaries, yahrzeits and reminders. They show on the calendar and can be added to your phone calendar with alerts. Saved in this browser.')+'</p>'+
    (REM.length?'<div class="tbl-wrap"><table class="t"><tbody>'+REM.map(r=>{const nx=nextOcc(r);return '<tr><td><b>'+esc(r.name)+'</b></td><td>'+esc(remWhen(r))+'</td><td class="mute">'+(nx?esc(gStr(nx))+' · '+esc(relDays(nx)):'')+'</td><td><a class="btn" target="_blank" rel="noopener" href="'+gcalLink(r,nx)+'">Google</a> <button class="btn" type="button" data-redit="'+r.id+'">✎</button></td></tr>'}).join('')+'</tbody></table></div>'+
      '<div class="row" style="margin-top:12px"><button class="btn" type="button" id="remIcs">📅 '+(HE()?'הוספת הכל ליומן בטלפון (קובץ)':'Add all to phone calendar (.ics)')+'</button></div>':'<p>'+(HE()?'עדיין אין תזכורות.':'No reminders yet.')+'</p>')+
    '<p class="small mute">'+(HE()?'בקרוב: תזכורות במייל ובהודעה לטלפון, עם חשבון אישי.':'Coming soon: email and SMS reminders with an account.')+'</p></div>'+
    '<div class="card cta" style="margin-top:12px"><h3>'+t('ctaT')+'</h3><p>'+(HE()?'כל התזכורות שלכם יכולות להופיע בלוח שנה מודפס ומעוצב לבית.':'All your dates can appear in a printed, designed calendar for your home.')+'</p><a class="btn pri" href="'+builderLink()+'">'+t('ctaB')+'</a></div>';
}
function remWhen(r){if(r.rec==='once')return gStr(fromIso(r.date));if(r.rec==='greg')return (HE()?'כל שנה, ':'Every year, ')+r.d+' '+t('gMonths')[r.m-1];if(r.rec==='monthly')return (HE()?'כל חודש עברי ב־':'Every Hebrew month on the ')+hDay(+r.d);
  return (HE()?'כל שנה, ':'Every year, ')+hDay(+r.d)+' '+(+r.m===12?(HE()?'אדר':'Adar'):+r.m===13?(HE()?'אדר ב׳':'Adar II'):hMonthName(+r.m,5785))}
function nextOcc(r,from=TODAY,max=400){for(let i=0;i<max;i++){const d=addD(from,i);if(remHits(r,d))return d}return null}
function gcalLink(r,d){if(!d)return '#';const a=iso(d).replace(/-/g,''),b=iso(addD(d,1)).replace(/-/g,'');return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(r.name)+'&dates='+a+'/'+b+'&details='+encodeURIComponent(hStr(new HDate(d)))}
function remIcs(){
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MyLuach Online//HE','X-WR-CALNAME:'+t('siteName')],stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const e=s=>String(s).replace(/[\\,;]/g,x=>'\\'+x);let n=0;
  for(const r of REM){let d=TODAY;for(let k=0;k<(r.rec==='once'?1:r.rec==='monthly'?24:5);k++){const x=nextOcc(r,d,r.rec==='once'?3650:420);if(!x)break;n++;
    L.push('BEGIN:VEVENT','UID:'+r.id+'-'+iso(x)+'@luchenu','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+iso(x).replace(/-/g,''),'DTEND;VALUE=DATE:'+iso(addD(x,1)).replace(/-/g,''),'SUMMARY:'+e(r.name),'DESCRIPTION:'+e(hStr(new HDate(x))));
    for(const a of (r.notice||[1]))L.push('BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:'+(a===0?'PT8H':'-P'+(a-1)+'DT15H'),'DESCRIPTION:'+e(r.name),'END:VALARM');
    L.push('END:VEVENT');d=addD(x,1)}}
  L.push('END:VCALENDAR');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([L.join('\r\n')],{type:'text/calendar'}));a.download='reminders.ics';document.body.appendChild(a);a.click();a.remove();
}
function remEditor(id,date){
  const r=id?REM.find(x=>x.id===id):null,d0=date||TODAY,h0=new HDate(d0);
  const v=r?{...r}:{name:'',rec:'heb',d:h0.getDate(),m:h0.getMonth(),date:iso(d0),notice:[1]};
  if(!r&&v.rec==='greg'){v.d=d0.getDate();v.m=d0.getMonth()+1}
  dialog('<h2 id="dlgT">'+(r?esc(r.name):t('addRem'))+'</h2><div class="row" style="margin-top:10px"><label class="fld" style="flex:1">'+(HE()?'מה להזכיר':'What')+'<input id="rN" value="'+esc(v.name)+'" placeholder="'+(HE()?'למשל: יום הולדת לשירה':'e.g. Sarah\'s birthday')+'"></label></div>'+
    '<div class="row" style="margin-top:8px"><label class="fld">'+(HE()?'חוזר':'Repeats')+'<select id="rR"><option value="heb">'+(HE()?'כל שנה, לפי התאריך העברי':'Yearly, Hebrew date')+'</option><option value="greg">'+(HE()?'כל שנה, לפי התאריך הלועזי':'Yearly, Gregorian date')+'</option><option value="monthly">'+(HE()?'כל חודש עברי':'Every Hebrew month')+'</option><option value="once">'+(HE()?'פעם אחת':'Once')+'</option></select></label><label class="fld">'+(HE()?'תאריך':'Date')+'<input type="date" id="rD" value="'+esc(v.date||iso(d0))+'"></label></div>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'התראה ביומן':'Calendar alert')+'<span class="opts">'+[[7,HE()?'שבוע לפני':'a week before'],[2,HE()?'יומיים לפני':'2 days before'],[1,HE()?'יום לפני':'a day before'],[0,HE()?'באותו יום':'same day']].map(([n,l])=>'<label class="chk"><input type="checkbox" data-nt="'+n+'"'+((v.notice||[]).includes(n)?' checked':'')+'> '+l+'</label>').join('')+'</span></div>'+
    '<p class="small mute" id="rP"></p><div class="row"><button class="btn pri" type="button" id="rS">'+t('save')+'</button>'+(r?'<button class="btn" type="button" id="rX">'+t('del')+'</button>':'')+'</div>');
  $('#rR').value=v.rec;
  const build=()=>{const dd=fromIso($('#rD').value||iso(d0)),hh=new HDate(dd),rec=$('#rR').value;const o={id:r?r.id:'r'+Math.random().toString(36).slice(2,9),name:$('#rN').value.trim(),rec,date:iso(dd),notice:[...document.querySelectorAll('[data-nt]:checked')].map(x=>+x.dataset.nt)};
    if(rec==='heb'){o.d=hh.getDate();o.m=hh.getMonth()}else if(rec==='greg'){o.d=dd.getDate();o.m=dd.getMonth()+1}else if(rec==='monthly')o.d=hh.getDate();return o};
  const prev=()=>{const o=build();$('#rP').textContent=remWhen(o)};['rR','rD'].forEach(i=>$('#'+i).addEventListener('input',prev));prev();
  $('#rS').onclick=()=>{const o=build();if(!o.name){$('#rN').focus();return}if(r)REM[REM.indexOf(r)]=o;else REM.push(o);saveRem();closeDlg();render()};
  if(r)$('#rX').onclick=()=>{REM=REM.filter(x=>x!==r);saveRem();closeDlg();render()};
  setTimeout(()=>$('#rN').focus(),30);
}

/* ---------- חלון יום ---------- */
function dayDialog(d){
  const hd=new HDate(d),items=(events(addD(d,-1),d).get(iso(d))||[]),Z=zm(d),note=NOTES[iso(d)]||{},rs=remsOn(d);
  const COLORS=['','#fde7a9','#cfe8d5','#d6e4f5','#f3d3df','#e4dcf3'];
  dialog('<h2 id="dlgT">'+t('weekdays')[d.getDay()]+', '+esc(hStr(hd))+'</h2><p class="mute" style="margin:2px 0 10px">'+esc(gStr(d))+' · '+esc(relDays(d))+'</p>'+
    (items.length?'<div style="margin-bottom:10px">'+items.map(x=>'<div class="ev '+x.cls+'" style="font-size:15px">'+esc(x.txt)+(x.ev&&!x.ev.eventTime?' <a class="gcal-add" href="'+gcalLink(x.txt,d)+'" target="_blank" rel="noopener" title="'+(HE()?'הוספה ליומן גוגל':'Add to Google Calendar')+'">+ '+(HE()?'ליומן':'calendar')+'</a>':'')+'</div>').join('')+'</div>':'')+
    (rs.length?'<div style="margin-bottom:10px">'+rs.map(r=>'<div><a href="#" data-redit="'+r.id+'" class="ev rem" style="font-size:15px">'+esc(r.name)+'</a> <a class="gcal-add" href="'+gcalLink(r.name,d)+'" target="_blank" rel="noopener">+ '+(HE()?'ליומן גוגל':'Google Calendar')+'</a></div>').join('')+'</div>':'')+
    '<details><summary><b>'+t('zmanim')+' · '+esc(cityName(city()))+'</b></summary><div class="zl" style="margin-top:8px">'+Z.map(z=>'<span>'+esc(z.n)+'</span><b>'+fmtT(z.v)+'</b>').join('')+'</div></details>'+
    '<div class="fld" style="margin-top:12px">'+t('note')+'<textarea id="nT" rows="2">'+esc(note.text||'')+'</textarea></div>'+
    '<div class="row" style="margin-top:8px;align-items:center"><span class="small">'+t('color')+'</span><span class="colors">'+COLORS.map(c=>'<button type="button" data-col="'+c+'" aria-pressed="'+((note.color||'')===c)+'" style="background:'+(c||'#fff')+'" aria-label="'+(c||'none')+'"></button>').join('')+'</span></div>'+
    '<div class="row" style="margin-top:12px"><button class="btn pri" type="button" id="nS">'+t('save')+'</button><button class="btn" type="button" id="dRem">+ '+t('addRem')+'</button><a class="btn" href="#zmanim/'+iso(d)+'" id="dZ">'+t('zmanim')+'</a></div>');
  let col=note.color||'';
  document.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>{col=b.dataset.col;document.querySelectorAll('[data-col]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
  $('#nS').onclick=()=>{const txt=$('#nT').value.trim();if(txt||col)NOTES[iso(d)]={text:txt,color:col};else delete NOTES[iso(d)];saveNotes();closeDlg();render()};
  $('#dRem').onclick=()=>remEditor(null,d);
  $('#dZ').onclick=e=>{e.preventDefault();closeDlg();go('zmanim',d)};
}
function dialog(html){$('#dlgBody').innerHTML=html;$('#dlg').hidden=false;document.body.style.overflow='hidden'}
function closeDlg(){$('#dlg').hidden=true;document.body.style.overflow=''}

/* ---------- צד, תחתית, קישורים ---------- */
function builderLink(){const hy=new HDate(anchor).getFullYear();return BUILDER+'#city-'+st.city+'&hy-'+(new HDate(anchor).getMonth()>=7?hy:hy)}

/* יומן חגים וזמני שבת לעיר, להרשמה מיומן גוגל / אייפון (קבצים ב-online/ics/, נוצרים ב-tools/gen_ics.mjs) */
function icsUrl(){const c=city();return c&&c.id&&!String(c.id).startsWith('custom')?'//'+(window.location.host||'www.myluach.org')+'/online/ics/'+c.id+'.ics':null}
function calCard(){const u=icsUrl();if(!u)return '';
  const g='https://calendar.google.com/calendar/r?cid='+encodeURIComponent('webcal:'+u),w='webcal:'+u;
  return '<div class="card cal-card"><b>'+(HE()?'חגים וזמני שבת ביומן שלכם':'Holidays & Shabbat times in your calendar')+'</b><p class="small mute" style="margin:4px 0 8px">'+(HE()?'חגים, צומות, פרשת השבוע והדלקת נרות ב'+esc(cityName(city()))+', מתעדכן לבד.':'Holidays, fasts, Torah portion and candle lighting for '+esc(cityName(city()))+'. Updates automatically.')+'</p>'+
    '<div class="row" style="gap:6px;flex-wrap:wrap"><a class="btn" href="'+g+'" target="_blank" rel="noopener">'+(HE()?'ליומן גוגל':'Google Calendar')+'</a><a class="btn" href="'+w+'">'+(HE()?'לאייפון / אאוטלוק':'iPhone / Outlook')+'</a></div></div>'}
function gcalLink(title,d){const d8=x=>x.getFullYear()+String(x.getMonth()+1).padStart(2,'0')+String(x.getDate()).padStart(2,'0');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(title)+'&dates='+d8(d)+'/'+d8(addD(d,1))+'&details='+encodeURIComponent(hStr(new HDate(d))+' · myluach.org')}
function renderSide(){
  const hd=new HDate(TODAY),Z=zm(TODAY),z=k=>fmtT((Z.find(x=>x.k===k)||{}).v);
  let next=null;try{const evs=HebrewCalendar.calendar({start:TODAY,end:addD(TODAY,120),il:city().il,noMinorFast:true,noModern:true,noRoshChodesh:true,noSpecialShabbat:true});next=evs.find(e=>e.getFlags()&flags.CHAG)||evs.find(e=>!(e.getFlags()&flags.PARSHA_HASHAVUA))}catch(e){}
  const evW=events(TODAY,addD(TODAY,8));let par='',cand='',hav='';
  for(let i=0;i<8;i++){const its=evW.get(iso(addD(TODAY,i)))||[];for(const x of its){if(x.cls==='par'&&!par)par=x.txt;if(x.ev.getDesc().startsWith('Candle')&&!cand)cand=fmtT(x.ev.eventTime);if(x.ev.getDesc().startsWith('Havdalah')&&!hav&&cand)hav=fmtT(x.ev.eventTime)}}
  $('#side').innerHTML='<div class="card today-card"><div class="mute small">'+t('today')+', '+t('weekdays')[TODAY.getDay()]+'</div><div class="big">'+esc(hStr(hd))+'</div><div>'+esc(gStr(TODAY))+'</div>'+
    '<div class="kv" style="margin-top:10px"><span>'+t('sunrise')+'</span><b>'+z('netz')+'</b><span>'+t('sunset')+'</span><b>'+z('shkia')+'</b>'+(cand?'<span>'+t('candles')+'</span><b>'+cand+'</b>':'')+(hav?'<span>'+t('havdalah')+'</span><b>'+hav+'</b>':'')+'</div>'+(par?'<div style="margin-top:8px">'+t('parasha')+': <b>'+esc(par.replace(/^פרשת /,''))+'</b></div>':'')+'<button type="button" class="linkbtn" data-zset="1">⚙ '+esc((HE()?ZPRE[zcfg().pre].he:ZPRE[zcfg().pre].en))+'</button></div>'+
    (next?'<div class="card"><div class="mute small">'+t('nextHoliday')+'</div><div style="font-weight:700;font-size:18px">'+esc(evName(next))+'</div><div class="small">'+esc(gStr(noon(next.getDate().greg())))+' · '+esc(relDays(noon(next.getDate().greg())))+'</div></div>':'')+
    '<div class="card cta"><h3>'+t('ctaT')+'</h3><p>'+t('ctaP')+'</p><a class="btn pri big" href="'+builderLink()+'">'+t('ctaB')+'</a></div>'+
    calCard()+
    '<div class="card"><b>'+t('tools')+'</b><ul style="margin-top:6px">'+['countdown','convert','barmitzvah','yahrzeit','days'].map(k=>'<li><a href="#tools/'+k+'" data-tool="'+k+'">'+t(k)+'</a></li>').join('')+'</ul></div>';
}
function pageH1(){const c=cityName(city());return HE()?'לוח שנה עברי '+c+' · '+monthDays().title:'Hebrew calendar '+c+' · '+monthDays().title}
function seoBlock(){
  const c=city(),cn=cityName(c),hy=new HDate(TODAY).getFullYear();
  const root=PAGE.root||'./';
  const top=CITIES.filter(x=>x.il).slice(0,14).concat(CITIES.filter(x=>['newyork','brooklyn','lakewood','london','paris','antwerp','losangeles','toronto','montreal'].includes(x.id)));
  return '<section class="card seo"><h2>'+(HE()?'לוח שנה עברי ל'+cn:'Jewish calendar for '+cn)+'</h2>'+
    (HE()?'<p>לוח השנה העברי-לועזי המקוון מציג את כל החגים והמועדים, ראשי החודשים, פרשות השבוע וזמני כניסת השבת ויציאתה ב'+cn+'. בלחיצה על כל יום רואים את זמני היום המלאים: עלות השחר, הנץ החמה, סוף זמן קריאת שמע ותפילה לפי המג״א והגר״א, מנחה גדולה, פלג המנחה, שקיעה וצאת הכוכבים.</p><p>אפשר להוסיף תזכורות לימי הולדת, ימי נישואין וימי שנה (יארצייטים) לפי התאריך העברי, להמיר תאריכים, לחשב תאריך בר מצווה ובת מצווה, ולהוריד את הכל ליומן בטלפון. רוצים לוח מודפס? ב־MyLuach בונים לוח שנה אישי ל'+hYear(hy)+' עם התמונות והאירועים שלכם.</p>'
      :'<p>This online Hebrew-Gregorian calendar shows all Jewish holidays, Rosh Chodesh, weekly Torah portions and Shabbat candle-lighting and havdalah times for '+cn+'. Click any day for full zmanim: dawn, sunrise, latest Shema and Shacharit (MGA and GRA), mincha, plag, sunset and nightfall.</p><p>Add reminders for Hebrew birthdays, anniversaries and yahrzeits, convert dates, calculate a Bar or Bat Mitzvah date, and export everything to your phone calendar.</p>')+
    '<div class="links">'+top.map(x=>'<a href="'+root+'zmanim/'+x.id+'.html">'+esc(HE()?'זמני היום '+x.he:'Zmanim '+x.en)+'</a>').join('')+'</div></section>';
}
function renderFoot(){$('#foot').innerHTML='<span>© '+TODAY.getFullYear()+' '+t('siteName')+'</span><a href="'+BUILDER+'">'+(HE()?'MyLuach · בניית לוח שנה אישי להדפסה':'MyLuach · personal printed calendars')+'</a><a href="'+BASE+'../index.html">'+(HE()?'מסלולים ומחירים':'Plans & pricing')+'</a><span>'+(HE()?'הזמנים מחושבים אסטרונומית ואינם תחליף ללוח של רב הקהילה.':'Times are astronomical calculations.')+'</span>'}
function renderNav(){
  $('#nav').innerHTML=VIEWS.map(v=>{const cur=v==='countdown'?view==='tools'&&sub==='countdown':v==='tools'?view==='tools'&&sub!=='countdown':v===view;return '<a href="#'+v+'" data-nav="'+v+'"'+(cur?' aria-current="page"':'')+'>'+t(v)+'</a>'}).join('');
  const sel=$('#city');const groups=[...new Set(CITIES.map(c=>c.g))];
  sel.innerHTML=groups.map(g=>'<optgroup label="'+esc(HE()?g:CITIES.find(c=>c.g===g).gen)+'">'+CITIES.filter(c=>c.g===g).map(c=>'<option value="'+c.id+'">'+esc(cityName(c))+'</option>').join('')+'</optgroup>').join('');sel.value=st.city;
  $('#lang').textContent=HE()?'English':'עברית';
  document.documentElement.lang=st.lang;document.documentElement.dir=HE()?'rtl':'ltr';
  document.querySelectorAll('[data-t]').forEach(x=>x.textContent=t(x.dataset.t));
}
function render(){
  renderNav();
  ({month:viewMonth,year:viewYear,holidays:viewHolidays,zmanim:viewZmanim,shabbat:viewShabbat,tools:viewTools,reminders:viewReminders}[view]||viewMonth)();
  renderSide();renderFoot();
  if(!PAGE.static)document.title=(view==='month'?monthDays().title+' · ':t(view)+' · ')+t('siteName');
}
function saveSt(){LS.set('settings',{lang:st.lang,city:st.city,mode:st.mode,opts:st.opts,zm:st.zm})}

/* ---------- אירועים בממשק ---------- */
document.addEventListener('click',e=>{
  const T2=e.target;
  const nv=T2.closest('[data-nav]');if(nv){e.preventDefault();$('#nav').classList.remove('open');go(nv.dataset.nav,nv.dataset.nav==='month'?TODAY:null,nv.dataset.nav==='tools'?'':undefined);return}
  const tl=T2.closest('[data-tool]');if(tl){e.preventDefault();go('tools',null,tl.dataset.tool);return}
  const dy=T2.closest('[data-day]');if(dy){dayDialog(fromIso(dy.dataset.day));return}
  const md=T2.closest('[data-mode]');if(md){st.mode=md.dataset.mode;saveSt();render();return}
  const sh=T2.closest('[data-sh]');if(sh){const n=+sh.dataset.sh;if(Math.abs(n)===12)shiftYear(n/12);else shiftMonth(n);render();return}
  const sy=T2.closest('[data-shy]');if(sy){shiftYear(+sy.dataset.shy);render();return}
  const hy=T2.closest('[data-hy]');if(hy){shiftYear(+hy.dataset.hy);render();return}
  const zs2=T2.closest('[data-zset]');if(zs2){zmSettings();return}
  const zd=T2.closest('[data-zd]');if(zd){anchor=addD(anchor,+zd.dataset.zd);render();return}
  const gt=T2.closest('[data-goto]');if(gt){anchor=fromIso(gt.dataset.goto);go('month',anchor);return}
  const re=T2.closest('[data-redit]');if(re){e.preventDefault();remEditor(re.dataset.redit);return}
  if(T2.id==='tdy'){anchor=TODAY;render();return}
  if(T2.id==='remNew'){remEditor(null);return}
  if(T2.id==='remIcs'){remIcs();return}
  if(T2.id==='jGoG'){const v=$('#jG').value;if(v){anchor=fromIso(v);render();dayDialog(anchor)}return}
  if(T2.id==='jGoH'){const y=parseHebYear($('#jY').value);if(!(y>3000&&y<7000))return;let m=+$('#jM').value;if(m===13&&!leap(y))m=12;const d=Math.min(+$('#jD').value,HDate.daysInMonth(m,y));anchor=noon(new HDate(d,m,y).greg());st.mode='heb';render();dayDialog(anchor);return}
  if(T2.closest('[data-close]')||T2.id==='dlg'){closeDlg();return}
  if(T2.id==='menuBtn'||T2.closest('#menuBtn')){const n=$('#nav');n.classList.toggle('open');$('#menuBtn').setAttribute('aria-expanded',String(n.classList.contains('open')));return}
  if(T2.id==='lang'){st.lang=HE()?'en':'he';saveSt();evCache.clear();if(PAGE.static&&PAGE.alt){location.href=PAGE.alt;return}render();return}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#dlg').hidden)closeDlg();const ym=e.target.closest&&e.target.closest('[data-goto]');if(ym&&(e.key==='Enter'||e.key===' ')){e.preventDefault();ym.click()}});
document.addEventListener('change',e=>{
  const T2=e.target;
  if(T2.id==='city'){st.city=T2.value;saveSt();evCache.clear();if(PAGE.static&&PAGE.city){location.href=(PAGE.root||'./')+PAGE.view+'/'+st.city+'.html';return}render();return}
  if(T2.dataset.opt){st.opts[T2.dataset.opt]=T2.checked;saveSt();evCache.clear();render();return}
  if(T2.id==='zDate'&&T2.value){anchor=fromIso(T2.value);render();return}
});
window.addEventListener('hashchange',()=>{readHash();render()});

/* ---------- התחלה ---------- */
if(new URLSearchParams(location.search).get('lang')==='en')st.lang='en';
if(PAGE.year){const y=+PAGE.year;anchor=y>4000?noon(new HDate(1,7,y).greg()):new Date(y,0,1,12);if(y>4000)st.mode='heb';else st.mode='greg';if(y>4000&&new HDate(TODAY).getFullYear()===y)anchor=TODAY;if(y<4000&&TODAY.getFullYear()===y)anchor=TODAY}
readHash();render();
})();
