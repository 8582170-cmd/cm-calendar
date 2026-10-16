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
const BUILDER=BASE+'../';

/* ---------- שפה ---------- */
const T={
 he:{siteName:'MyLuach',city:'עיר',menu:'תפריט',month:'לוח חודשי',week:'לוח שבועי',day:'לוח יומי',year:'לוח שנתי',holidays:'חגים ומועדים',zmanim:'זמני היום',shabbat:'זמני שבת',tools:'כלים',reminders:'תזכורות',
  today:'היום',prev:'הקודם',next:'הבא',prevYear:'שנה אחורה',nextYear:'שנה קדימה',hebMode:'עברי',gregMode:'לועזי',jump:'קפיצה לתאריך',go:'מעבר',
  print:'הדפסה ואפשרויות נוספות',printSub:'לוח מעוצב להדפסה, עם התמונות, ימי ההולדת וימי השנה (יארצייטים) שלכם',
  ctaT:'רוצים לוח כזה מודפס ומעוצב?',ctaP:'ב־MyLuach בונים לוח שנה אישי למשפחה, לבית הכנסת או למוסד: תמונות, אירועים משפחתיים, זמנים ודברי הימים.',ctaB:'לבניית לוח אישי',
  sunrise:'הנץ',sunset:'שקיעה',candles:'הדלקת נרות',havdalah:'יציאה',parasha:'פרשת השבוע',nextHoliday:'החג הבא',inDays:n=>n===0?'היום':n===1?'מחר':'בעוד '+n+' ימים',
  daysAgo:n=>n===1?'אתמול':'לפני '+n+' ימים',fromToday:'מהיום',addRem:'הוספת תזכורת',note:'הערה ליום הזה',color:'צבע ליום',save:'שמירה',del:'מחיקה',close:'סגירה',
  showOmer:'ספירת העומר',showLearn:'לימוד יומי',showDz:'זמני היום בלוח',showTimes:'הדלקה ויציאה',showParasha:'פרשת השבוע',showModern:'ימי זיכרון ועצמאות',
  convert:'המרת תאריכים',countdown:'ספירה לאחור',barmitzvah:'חישוב בר / בת מצווה',days:'חישוב ימים בין תאריכים',yahrzeit:'חישוב יום שנה (יארצייט)',
  weekdays:['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'],wdShort:['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'],
  gMonths:['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']},
 en:{siteName:'MyLuach',city:'City',menu:'Menu',month:'Month',week:'Week',day:'Day',year:'Year',holidays:'Holidays',zmanim:'Zmanim',shabbat:'Shabbat times',tools:'Tools',reminders:'Reminders',
  today:'Today',prev:'Previous',next:'Next',prevYear:'Year back',nextYear:'Year ahead',hebMode:'Hebrew',gregMode:'Gregorian',jump:'Jump to date',go:'Go',
  print:'Print & more options',printSub:'A designed calendar to print, with your photos, birthdays and yahrzeits',
  ctaT:'Want this as a printed calendar?',ctaP:'MyLuach builds a personal Jewish calendar for your family, synagogue or school: photos, family events, zmanim and more.',ctaB:'Build a personal calendar',
  sunrise:'Sunrise',sunset:'Sunset',candles:'Candle lighting',havdalah:'Havdalah',parasha:'Torah portion',nextHoliday:'Next holiday',inDays:n=>n===0?'today':n===1?'tomorrow':'in '+n+' days',
  daysAgo:n=>n===1?'yesterday':n+' days ago',fromToday:'from today',addRem:'Add reminder',note:'Note for this day',color:'Day color',save:'Save',del:'Delete',close:'Close',
  showOmer:'Omer count',showLearn:'Daily learning',showDz:'Daily times',showTimes:'Candles & havdalah',showParasha:'Torah portion',showModern:'Israeli national days',
  convert:'Date converter',countdown:'Countdown',barmitzvah:'Bar / Bat Mitzvah calculator',days:'Days between dates',yahrzeit:'Yahrzeit calculator',
  weekdays:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Shabbat'],wdShort:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  gMonths:['January','February','March','April','May','June','July','August','September','October','November','December']}
};
const LS={get(k,d){try{const v=localStorage.getItem('lc-'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('lc-'+k,JSON.stringify(v))}catch(e){}}};
const st=Object.assign({lang:'he',city:'jerusalem',mode:'heb',opts:{omer:false,times:true,parasha:true,modern:false,dz:true}},LS.get('settings',{}));
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
const ZB={alot2:'16.1',mish:'11.5',netz:'sea',shkia:'sea',gra:'',mga:'19.75',minG:'lechumra',plag:'gra',tzeit:'8.5',motz:'8.5',rt:'72f',ci:'9.28',fastEnd:'6.45'};
const ZPRE={
  ashkenaz:{he:'אשכנזים (המקובל בארץ)',en:'Ashkenazi (common in Israel)',...ZB,alot:'19.75'},
  chazon:{he:'כמו חזון שמיים',en:'As in Chazon Shamayim',...ZB,alot:'19.75',shkia:'elevHigh',gra:'sea'},
  tzikoni:{he:'הרב איתן ציקוני (לוח ממוצע)',en:'R. Eitan Tzikoni (average)',...ZB,alot:'16.1',alot2:'19.75',mga:'16.1',minG:'fixed30',tzeit:'13.5f',fastEnd:'8.5'},
  itim:{he:'אשכנזים, שקיעה לפי הגובה',en:'Ashkenazi, sunset with elevation',...ZB,alot:'19.75',shkia:'elev',gra:'sea'},
  tuk:{he:'הגרי״מ טוקצ׳ינסקי (נץ ושקיעה בגובה)',en:'R. Tukaczinsky (elevation)',...ZB,alot:'19.75',netz:'elev',shkia:'elev'},
  sefardi:{he:'ספרדים, ע״פ הגר״ע יוסף',en:'Sephardi (R. Ovadia Yosef)',...ZB,alot:'72z',alot2:'90z',mish:'66z',netz:'elev',shkia:'elev',mga:'72z',minG:'fixed30',plag:'sefardi',tzeit:'13.5z',motz:'30f',rt:'72z',fastEnd:'20f'},
  chabad:{he:'חב״ד (בעל התניא)',en:'Chabad (Baal HaTanya)',...ZB,alot:'16.9',mish:'10.2',netz:'amiti',shkia:'amiti',mga:'16.9>6',minG:'zman30',tzeit:'6',fastEnd:'6'},
  gra:{he:'גר״א פשוט',en:'Simple GRA',...ZB,alot:'16.1',alot2:'19.75',mish:'11',mga:null,minG:'fixed30',tzeit:'7.083'},
  chul:{he:'נפוץ בחו״ל (72 דק׳ שוות)',en:'Common abroad (72 fixed minutes)',...ZB,alot:'72f',mish:'11',mga:'72f',minG:'fixed30'}
};
const zcfg=()=>{const o=Object.assign({pre:'ashkenaz',netz:'',motz:'',candle:'',both:true},st.zm||{});if(!ZPRE[o.pre])o.pre='ashkenaz';return o};
const angLbl=k=>{k=String(k);if(k.includes('>')){const [a,b]=k.split('>');return angLbl(a)+' – '+angLbl(b)}return k.endsWith('z')?parseFloat(k)+(HE()?' דק׳ זמניות':' zmaniyot min'):k.endsWith('f')?parseFloat(k)+(HE()?' דק׳':' min'):k+'°'};
const ZCACHE=new Map();
function zm(d){
  const C=zcfg(),P=ZPRE[C.pre],ck=iso(d)+st.city+JSON.stringify(C)+st.lang;if(ZCACHE.has(ck))return ZCACHE.get(ck);
  const L=loc(),c=city(),z=new Zmanim(L,noon(d),false),ze=new Zmanim(L,noon(d),true),s=f=>{try{const r=f();return r instanceof Date&&!isNaN(r)?r:null}catch(e){return null}};
  const sun=(k,up)=>{if(k==='elevHigh')k=(c.el||0)>=400?'elev':'sea';return k==='elev'?s(()=>up?ze.sunrise():ze.sunset()):k==='amiti'?s(()=>z.timeAtAngle(1.583,up)):s(()=>up?z.seaLevelSunrise():z.seaLevelSunset())};
  const NK=C.netz||P.netz,SK=C.netz||P.shkia;
  const netz=sun(NK,true),shkia=sun(SK,false);
  const gN=P.gra&&!C.netz?sun(P.gra,true):netz,gS=P.gra&&!C.netz?sun(P.gra,false):shkia;
  const H=gN&&gS?(gS-gN)/12:NaN,T=(x,ms)=>x&&isFinite(ms)?new Date(x.getTime()+ms):null;
  const before=k=>{k=String(k);if(k.endsWith('f'))return T(netz,-parseFloat(k)*6e4);if(k.endsWith('z'))return T(netz,-parseFloat(k)*H/60);return s(()=>z.timeAtAngle(parseFloat(k),true))};
  const after=k=>{k=String(k);if(k.endsWith('f'))return T(shkia,parseFloat(k)*6e4);if(k.endsWith('z'))return T(shkia,parseFloat(k)*H/60);return s(()=>z.timeAtAngle(parseFloat(k),false))};
  const [ma,mb]=P.mga?String(P.mga).split('>'):[];const ms=P.mga?before(ma):null,me=P.mga?after(mb||ma):null,Hm=ms&&me?(me-ms)/12:NaN;
  const nl=k=>k==='elev'?(HE()?'לפי גובה המקום':'with elevation'):k==='elevHigh'?(HE()?'לפי הגובה במקום גבוה':'elevation in high places'):k==='amiti'?(HE()?'אמיתי (1.583°)':'true (1.583°)'):(HE()?'מישורי':'sea level');
  const mgaL=P.mga?(HE()?'מעלות השחר '+angLbl(ma)+' עד צאה״כ '+angLbl(mb||ma):'dawn '+angLbl(ma)+' to nightfall '+angLbl(mb||ma)):'';
  const chatzot=s(()=>z.chatzot()),mgF=T(chatzot,30*6e4),mgZ=T(chatzot,H/2),tz=after(P.tzeit);
  const minG=P.minG==='fixed30'?mgF:P.minG==='zman30'?mgZ:(mgF&&mgZ?new Date(Math.max(mgF,mgZ)):mgF);
  const plag=P.plag==='sefardi'?T(after('13.5z'),-1.25*H):T(gS,-1.25*H);
  const motz=C.motz||P.motz;
  const rows=[
   ['alot',HE()?'עלות השחר':'Dawn (Alot HaShachar)',before(P.alot),angLbl(P.alot),'m'],
   ['alot2',HE()?'עלות השחר ב׳':'Dawn (2nd opinion)',before(P.alot2),angLbl(P.alot2),'m'],
   ['mish',HE()?'משיכיר (טלית ותפילין)':'Misheyakir (tallit & tefillin)',before(P.mish),angLbl(P.mish),'m'],
   ['netz',HE()?'הנץ החמה':'Sunrise (Netz)',netz,nl(NK),'m'],
   P.mga&&C.both?['shmaM',HE()?'סוף זמן ק״ש (מג״א)':'Latest Shema (MGA)',T(ms,3*Hm),HE()?'3 שעות זמניות, '+mgaL:'3 halachic hours, '+mgaL,'m']:null,
   ['shmaG',HE()?'סוף זמן ק״ש (גר״א)':'Latest Shema (GRA)',T(gN,3*H),HE()?'3 שעות זמניות מהנץ עד השקיעה':'3 halachic hours, sunrise to sunset','m'],
   P.mga&&C.both?['tfilaM',HE()?'סוף זמן תפילה (מג״א)':'Latest Shacharit (MGA)',T(ms,4*Hm),HE()?'4 שעות זמניות':'4 halachic hours','m']:null,
   ['tfilaG',HE()?'סוף זמן תפילה (גר״א)':'Latest Shacharit (GRA)',T(gN,4*H),HE()?'4 שעות זמניות':'4 halachic hours','m'],
   ['chatzot',HE()?'חצות היום':'Midday (Chatzot)',chatzot,HE()?'אמצע היום האסטרונומי':'solar noon','e'],
   ['minG',HE()?'מנחה גדולה':'Mincha Gedola',minG,P.minG==='fixed30'?(HE()?'חצי שעה אחרי חצות':'30 min after midday'):P.minG==='zman30'?(HE()?'חצי שעה זמנית אחרי חצות':'½ halachic hour after midday'):(HE()?'המאוחר מחצי שעה זמנית או קבועה אחרי חצות':'later of ½ halachic or fixed hour after midday'),'e'],
   ['musaf',HE()?'סוף זמן מוסף לכתחילה':'Latest Musaf',T(gN,7*H),HE()?'7 שעות זמניות (גר״א)':'7 halachic hours (GRA)','e'],
   ['minK',HE()?'מנחה קטנה':'Mincha Ketana',T(gN,9.5*H),HE()?'9.5 שעות זמניות':'9.5 halachic hours','e'],
   ['plag',HE()?'פלג המנחה':'Plag HaMincha',plag,P.plag==='sefardi'?(HE()?'1.25 שעות זמניות לפני צאה״כ':'1.25 hours before nightfall'):(HE()?'1.25 שעות זמניות לפני השקיעה':'1.25 halachic hours before sunset'),'e'],
   ['shkia',HE()?'שקיעה':'Sunset (Shkiah)',shkia,nl(SK),'e'],
   ['tzeit',HE()?'צאת הכוכבים':'Nightfall (Tzeit)',tz,angLbl(P.tzeit),'e'],
   ['ci',HE()?'צאת הכוכבים חזו״א':'Nightfall (Chazon Ish)',after(P.ci),angLbl(P.ci),'e'],
   ['motz',HE()?'צאת שבת וחג':'Shabbat ends',after(motz),angLbl(motz),'e'],
   ['rt',HE()?'צאת הכוכבים לר״ת':'Rabbeinu Tam',after(P.rt),angLbl(P.rt),'e'],
   ['fastE',HE()?'סוף צום דרבנן':'Minor fast ends',after(P.fastEnd),angLbl(P.fastEnd),'e'],
   ['chatzotN',HE()?'חצות הלילה':'Midnight (Chatzot HaLaila)',s(()=>z.chatzotNight()),HE()?'12 שעות אחרי חצות היום':'12 hours after midday','e'],
  ].filter(Boolean);
  const out=rows.map(([k,n,v,m,p])=>({k,n,v,m,p}));ZCACHE.set(ck,out);if(ZCACHE.size>400)ZCACHE.delete(ZCACHE.keys().next().value);return out;
}
function candleMins(){const c=zcfg().candle;return c?+c:city().candle}
function havOpts(){const C=zcfg(),m=C.motz||ZPRE[C.pre].motz;return m.endsWith('f')?{havdalahMins:parseFloat(m)}:{havdalahDeg:parseFloat(m)}}
function zmSettings(){
  const C=zcfg();
  dialog('<h2 id="dlgT">'+(HE()?'הגדרות זמנים':'Zmanim settings')+'</h2><p class="small mute">'+(HE()?'ההגדרות חלות על זמני היום, זמני השבת והלוח, ונשמרות בדפדפן.':'Applies to zmanim, Shabbat times and the calendar. Saved in this browser.')+'</p>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'מנהג':'Custom')+'<select id="zP">'+Object.entries(ZPRE).map(([k,v])=>'<option value="'+k+'"'+(k===C.pre?' selected':'')+'>'+(HE()?v.he:v.en)+'</option>').join('')+'</select></div>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'נץ ושקיעה':'Sunrise & sunset')+'<select id="zN"><option value="">'+(HE()?'לפי השיטה':'Per method')+'</option><option value="sea">'+(HE()?'מישורי (גובה פני הים)':'Sea level')+'</option><option value="elev">'+(HE()?'לפי גובה המקום (הנראה)':'With elevation (visible)')+'</option></select></div>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'צאת שבת וחג':'Shabbat ends')+'<select id="zM"><option value="">'+(HE()?'לפי השיטה':'Per method')+'</option><option value="8.5">8.5° ('+(HE()?'מקובל':'common')+')</option><option value="7.083">7.083°</option><option value="6">6° ('+(HE()?'חב״ד':'Chabad')+')</option><option value="40f">40 '+(HE()?'דק׳ אחרי השקיעה':'min after sunset')+'</option><option value="50f">50 '+(HE()?'דק׳':'min')+'</option><option value="72f">72 '+(HE()?'דק׳ (רבנו תם)':'min (Rabbeinu Tam)')+'</option></select></div>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'הדלקת נרות':'Candle lighting')+'<select id="zC"><option value="">'+(HE()?'לפי העיר ('+city().candle+' דק׳)':'City default ('+city().candle+' min)')+'</option>'+[15,18,20,22,24,30,40].map(n=>'<option value="'+n+'">'+n+(HE()?' דק׳ לפני השקיעה':' min before sunset')+'</option>').join('')+'</select></div>'+
    '<div class="row" style="margin-top:8px"><label class="fld">'+(HE()?'ניטל':'Nittel')+'<select id="zNt"><option value="none">'+(HE()?'לא להציג':'Hide')+'</option><option value="dec">'+(HE()?'בליל 24 בדצמבר':'Night of Dec 24')+'</option><option value="jan">'+(HE()?'בליל 6 בינואר':'Night of Jan 6')+'</option><option value="both">'+(HE()?'בשני התאריכים':'Both')+'</option></select></label><label class="fld">'+(HE()?'מאיזו שעה':'From')+'<select id="zNf"><option value="shkia">'+(HE()?'מהשקיעה':'Sunset')+'</option><option value="tzeit">'+(HE()?'מצאת הכוכבים':'Nightfall')+'</option></select></label></div>'+
    '<label class="chk" style="margin-top:10px"><input type="checkbox" id="zB"'+(C.both?' checked':'')+'> '+(HE()?'להציג ק״ש ותפילה גם לפי המג״א':'Show MGA times too')+'</label>'+
    '<div class="row" style="margin-top:14px"><button class="btn pri" type="button" id="zS">'+t('save')+'</button></div>');
  $('#zN').value=C.netz;$('#zM').value=C.motz;$('#zC').value=C.candle;$('#zNt').value=C.nital||'none';$('#zNf').value=C.nitalFrom||'shkia';
  $('#zS').onclick=()=>{ZCACHE.clear();st.zm={pre:$('#zP').value,netz:$('#zN').value,motz:$('#zM').value,candle:$('#zC').value,both:$('#zB').checked,nital:$('#zNt').value,nitalFrom:$('#zNf').value};saveSt();evCache.clear();closeDlg();render()};
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
    else if(f&flags.ROSH_CHODESH)cls='rc';
    else if(f&flags.MINOR_FAST)cls='fast';
    else if(f&(flags.MINOR_HOLIDAY|flags.SPECIAL_SHABBAT))cls='minor';
    else if(f&flags.MODERN_HOLIDAY)cls='modern';
    if(!map.has(k))map.set(k,[]);map.get(k).push({txt,cls,chag:!!(f&flags.CHAG),f,ev});
  }
  /* ניטל, לפי ההגדרה */
  const NT=zcfg().nital||'none';
  if(NT!=='none')for(let d=noon(a);d<=b;d=addD(d,1)){const m=d.getMonth(),dd=d.getDate();
    if(!((NT!=='jan'&&m===11&&dd===24)||(NT!=='dec'&&m===0&&dd===6)))continue;
    const Z=zm(d),g=k=>(Z.find(x=>x.k===k)||{}).v,fromT=zcfg().nitalFrom==='tzeit';
    const txt=HE()?'ניטל: מ'+(fromT?'צאה״כ ':'השקיעה ')+fmtT(g(fromT?'tzeit':'shkia'))+' עד חצות הלילה '+fmtT(g('chatzotN')):'Nittel: '+fmtT(g(fromT?'tzeit':'shkia'))+' – '+fmtT(g('chatzotN'));
    const k=iso(d);if(!map.has(k))map.set(k,[]);map.get(k).push({txt,cls:'nital',chag:false,f:0,ev:{getDesc:()=>'Nittel',eventTime:null}})}
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
const VIEWS=['month','week','day','year','holidays','zmanim','shabbat','countdown','tools','reminders'];
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

/* שורת זמנים קצרה בכל יום: עלות השחר, חצות, שקיעה */
const DZ_SHORT={alot:['עה״ש','Alot'],mish:['משיכיר','Mishey.'],netz:['הנץ','Netz'],shmaM:['ק״ש מג״א','Shema MGA'],shmaG:['ק״ש','Shema'],tfilaM:['תפילה מג״א','Tfila MGA'],tfilaG:['תפילה','Tfila'],chatzot:['חצות','Chatzot'],minG:['מ. גדולה','M. Gedola'],minK:['מ. קטנה','M. Ketana'],plag:['פלג','Plag'],shkia:['שקיעה','Shkiah'],tzeit:['צאה״כ','Tzeit'],rt:['ר״ת','R. Tam'],chatzotN:['חצות לילה','Chatzot (night)']};
const DZ_MAX=5,DZ_DEF=['alot','chatzot','shkia'];
const dzSel=()=>(Array.isArray(st.dzSel)?st.dzSel:DZ_DEF).slice(0,DZ_MAX);
function dzLine(d){try{const sel=dzSel();if(!sel.length)return '';const Z=zm(d);
  const parts=sel.map(k=>{const z=Z.find(x=>x.k===k);return z&&z.v?'<span>'+esc(DZ_SHORT[k]?DZ_SHORT[k][HE()?0:1]:z.n)+' '+fmtT(z.v)+'</span>':''}).join('');
  return parts?'<span class="dz">'+parts+'</span>':''}catch(e){return ''}}
function dzPicker(){
  const Z=zm(TODAY),sel=new Set(dzSel());
  dialog('<h2 id="dlgT">'+(HE()?'אילו זמנים יופיעו בכל יום':'Which times to show each day')+'</h2><p class="mute small">'+(HE()?'אפשר לבחור עד '+DZ_MAX+' זמנים. הזמנים מחושבים לפי העיר והשיטה שבחרתם.':'Choose up to '+DZ_MAX+'. Times follow your city and method.')+'</p>'+
    '<div class="dzp">'+Z.map(z=>'<label class="chk"><input type="checkbox" value="'+z.k+'"'+(sel.has(z.k)?' checked':'')+'> '+esc(z.n)+' <span class="mute small">'+fmtT(z.v)+'</span></label>').join('')+'</div>'+
    '<p class="small" id="dzMsg"></p><div class="row" style="margin-top:10px"><button class="btn pri" type="button" id="dzOk">'+t('save')+'</button><button class="btn" type="button" id="dzDef">'+(HE()?'ברירת מחדל':'Default')+'</button></div>');
  const box=$('.dzp'),msg=$('#dzMsg');
  const upd=()=>{const ch=[...box.querySelectorAll('input:checked')];box.querySelectorAll('input:not(:checked)').forEach(i=>i.disabled=ch.length>=DZ_MAX);msg.textContent=(HE()?'נבחרו ':'Selected ')+ch.length+' / '+DZ_MAX};
  box.onchange=upd;upd();
  $('#dzOk').onclick=()=>{st.dzSel=[...box.querySelectorAll('input:checked')].map(i=>i.value);st.opts.dz=st.dzSel.length>0;saveSt();closeDlg();render()};
  $('#dzDef').onclick=()=>{st.dzSel=DZ_DEF.slice();st.opts.dz=true;saveSt();closeDlg();render()};
}
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
      apptOn(d).map(a=>'<span class="ev appt"'+(a.color?' style="--ac:'+esc(a.color)+'"':'')+'>'+(a.start_t?esc(a.start_t)+' ':'')+esc(a.title)+'</span>').join('')+
      (note.text?'<span class="ev note">'+esc(note.text)+'</span>':'')+
      (st.opts.learn?'<span class="lrm">'+lrnFor(d).map(x=>esc(x.v)).join(' · ')+'</span>':'')+(st.opts.dz?dzLine(d):'')+'</button>';
  }
  const tot=lead+M.days.length;for(let i=tot;i<Math.ceil(tot/7)*7;i++)g+='<div class="day pad"></div>';
  g+='</div>';
  const hdA=new HDate(anchor);
  const jumpH='<span class="jump"><select id="jD">'+Array.from({length:30},(_,i)=>'<option value="'+(i+1)+'">'+hDay(i+1)+'</option>').join('')+'</select><select id="jM">'+HEB_ORDER.map(m=>'<option value="'+m+'"'+(m===hdA.getMonth()?' selected':'')+'>'+(m===12?(HE()?'אדר / אדר א׳':'Adar / Adar I'):m===13?(HE()?'אדר ב׳':'Adar II'):hMonthName(m,5785))+'</option>').join('')+'</select><input id="jY" size="6" value="'+hYear(hdA.getFullYear())+'" aria-label="year"><button class="btn" type="button" id="jGoH">'+t('go')+'</button></span>';
  const jumpG='<span class="jump"><input type="date" id="jG" value="'+iso(anchor)+'"><button class="btn" type="button" id="jGoG">'+t('go')+'</button></span>';
  $('#main').innerHTML=vTabs()+'<div class="bar no-print"><span class="seg" role="group"><button type="button" data-mode="heb" aria-pressed="'+(st.mode==='heb')+'">'+t('hebMode')+'</button><button type="button" data-mode="greg" aria-pressed="'+(st.mode==='greg')+'">'+t('gregMode')+'</button></span>'+
    '<span class="nav-arrows"><button class="btn" type="button" data-sh="-12" title="'+t('prevYear')+'">«</button><button class="btn" type="button" data-sh="-1" title="'+t('prev')+'">'+(HE()?'→':'←')+'</button><button class="btn" type="button" id="tdy">'+t('today')+'</button><button class="btn" type="button" data-sh="1" title="'+t('next')+'">'+(HE()?'←':'→')+'</button><button class="btn" type="button" data-sh="12" title="'+t('nextYear')+'">»</button></span>'+
    '<details class="jump-d"><summary class="btn">'+t('jump')+'</summary><div class="jump" style="margin-top:6px">'+jumpH+jumpG+'</div></details>'+
    '<a class="btn pri" href="'+builderLink()+'">🖨 '+t('print')+'</a></div>'+
    '<div class="opts no-print">'+[['dz','showDz'],['learn','showLearn'],['times','showTimes'],['parasha','showParasha'],['omer','showOmer'],['modern','showModern']].map(([k,l])=>'<label class="chk"><input type="checkbox" data-opt="'+k+'"'+(st.opts[k]?' checked':'')+'> '+t(l)+'</label>').join('')+'<button type="button" class="linkbtn2" id="dzPick">⚙ '+(HE()?'בחירת זמנים':'Choose times')+'</button>'+(st.opts.learn?'<button type="button" class="linkbtn2" id="lrPick">⚙ '+(HE()?'בחירת לימוד':'Choose learning')+'</button>':'')+'</div>'+
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
  const M=monthDays();const keys=['alot','netz','shmaM','shmaG','tfilaG','chatzot','minG','plag','shkia','tzeit'].filter(k=>Z.some(z=>z.k===k));
  $('#main').innerHTML='<div class="bar"><h1>'+(HE()?'זמני היום ב'+cityName(city()):'Zmanim for '+cityName(city()))+'</h1><span class="jump"><button class="btn" type="button" data-zd="-1">'+(HE()?'→':'←')+'</button><input type="date" id="zDate" value="'+iso(d)+'"><button class="btn" type="button" data-zd="1">'+(HE()?'←':'→')+'</button></span><button class="btn" type="button" data-zset="1">⚙ '+(HE()?'הגדרות זמנים':'Zmanim settings')+'</button><a class="btn pri" href="'+builderLink()+'">🖨 '+t('print')+'</a></div>'+
    '<div class="card"><h2>'+t('weekdays')[d.getDay()]+', '+esc(hStr(hd))+' · '+esc(gStr(d))+'</h2><div class="zl" style="margin-top:10px">'+Z.map(z=>'<span>'+esc(z.n)+'</span><b>'+fmtT(z.v)+'</b>'+(z.m?'<span class="sub">'+esc(z.m)+'</span>':'')).join('')+'</div>'+
    '<p class="mute small">'+(HE()?'הזמנים מחושבים אסטרונומית לפי מיקום העיר ואינם תחליף ללוח של רב הקהילה.':'Times are calculated astronomically for the city location.')+'</p></div>'+
    '<h2 style="margin:18px 0 8px">'+esc(M.title)+'</h2><div class="tbl-wrap"><table class="t"><thead><tr><th></th>'+keys.map(k=>'<th>'+esc(Z.find(z=>z.k===k).n.replace(/ \(.*\)/,'').replace('סוף זמן ',''))+(k==='shmaM'?' מג״א':k==='shmaG'?' גר״א':'')+'</th>').join('')+'</tr></thead><tbody>'+
    M.days.map(x=>{const zz=zm(x);return '<tr><td>'+esc(t('wdShort')[x.getDay()]+' '+(st.mode==='heb'?hDay(new HDate(x).getDate()):x.getDate()))+'</td>'+keys.map(k=>'<td>'+fmtT((zz.find(z=>z.k===k)||{}).v)+'</td>').join('')+'</tr>'}).join('')+'</tbody></table></div>'+seoBlock();
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
    '<p class="mute small">'+(HE()?'הדלקת נרות '+candleMins()+' דקות לפני השקיעה, יציאה '+angLbl(zcfg().motz||ZPRE[zcfg().pre].motz)+(String(zcfg().motz||ZPRE[zcfg().pre].motz).endsWith('f')?' אחרי השקיעה':' מתחת לאופק')+'.':'Candle lighting '+candleMins()+' minutes before sunset; havdalah '+angLbl(zcfg().motz||ZPRE[zcfg().pre].motz)+'.')+'</p>'+seoBlock();
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
const CD_ST=[['classic','קלאסי','Classic','#1e5a63','#fff','🎉'],['bride','כלה וחתונה','Wedding','#a8646f','#fdf8f5','💍'],['barmitzvah','בר מצווה','Bar Mitzvah','#1f3a5f','#fbfaf5','✡'],['batmitzvah','בת מצווה','Bat Mitzvah','#b8487a','#fff7fa','🌸'],['kids','ילדים','Kids','#e0663a','#fffaf0','🎈'],['baby','לידה ותינוק','Baby','#5b8db8','#f7fbff','👶'],['elegant','אלגנטי: שחור וזהב','Elegant','#2a2622','#fbf8f1','✨'],['nature','טבע','Nature','#3f7a4f','#f6faf3','🌿'],['trip','טיול וחופשה','Trip','#1d8a96','#f7fcfc','✈️']];
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
    const print=BASE+'../countdown.html#countdown&'+new URLSearchParams({d:o.d,t:o.t||(HE()?'הספירה לאחור':'Countdown'),st:o.st,l:o.l}).toString();
    let mini='';const start=TODAY,end=to<start?start:to;let cnt=0;
    for(let d=new Date(start.getFullYear(),start.getMonth(),1,12);d<=end&&cnt<3;d=new Date(d.getFullYear(),d.getMonth()+1,1,12),cnt++){
      const len=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();let g='<div class="kmo"><b>'+t('gMonths')[d.getMonth()]+'</b><div class="kgrid">'+'<span></span>'.repeat(d.getDay());
      for(let i=1;i<=len;i++){const x=new Date(d.getFullYear(),d.getMonth(),i,12),k=dayDiff(x,to);g+='<span class="'+(k===0?'goal':k<0||x<TODAY?'past':'')+'">'+(k===0?S[5]:k>0&&x>=TODAY?k:'')+'</span>'}
      mini+=g+'</div></div>'}
    $('#kOut').innerHTML='<div class="kcard" style="--k:'+S[3]+';--kb:'+S[4]+'"><div class="ktitle">'+esc(o.t||(HE()?'הספירה לאחור':'Countdown'))+'</div><div class="kbig">'+(n===0?S[5]:Math.abs(n))+'</div><div class="ksub">'+(n===0?(HE()?'היום!':'Today!'):n>0?(HE()?'ימים נשארו':'days to go')+(w?' · '+(HE()?w+' שבועות ו־'+r+' ימים':w+' weeks, '+r+' days'):''):(HE()?'ימים עברו':'days ago'))+'</div><div class="kdate">'+t('weekdays')[to.getDay()]+', '+esc(hStr(hd))+' · '+esc(gStr(to))+'</div><div class="kmini">'+mini+'</div></div>'+
      '<div class="row" style="margin-top:12px"><a class="btn pri big" href="'+print+'">🖨 '+(HE()?'הדפסה והורדה בעיצוב מלא':'Print & download the full design')+'</a><button class="btn" type="button" id="kShare">🔗 '+(HE()?'העתקת קישור לשיתוף':'Copy share link')+'</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent((o.t||'')+' · '+(HE()?'עוד '+n+' ימים! ':n+' days to go! ')+share)+'">WhatsApp</a></div>'+
      '<div class="card cta" style="margin-top:12px"><h3>'+(HE()?'בלוח המעוצב להדפסה יש עוד הרבה':'Much more in the printable design')+'</h3><ul class="small" style="margin:6px 0 10px;padding-inline-start:18px">'+(HE()?['דף פתיחה ודף סיום עם תמונות, ותמונת רקע','משפטים יפים כל כמה ימים, או משפטים משלכם','פרשת השבוע, חגים, ראש חודש ועד 5 זמני היום בכל יום','מדבקות וכובעים על התמונות (כיפה, כתר, הינומה) והתאמה אוטומטית לפנים','9 עיצובים ו־5 צורות: עמוד לכל חודש, לוח מספרים, פוסטר, דף לטלפון ושרשרת נייר']:['Opening and closing pages with photos, and a background photo','Nice quotes every few days, or your own','Parasha, holidays, Rosh Chodesh and up to 5 zmanim each day','Stickers and hats on photos with automatic face fitting','9 styles and 5 layouts']).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><a class="btn pri" href="'+print+'">'+(HE()?'לבניית הלוח המעוצב':'Design it')+'</a> <span class="small mute">'+(HE()?'עד 40 ימים: בחינם':'Up to 40 days: free')+'</span></div>'+
      '<p class="small mute">'+(HE()?'הקישור מראה לכל מי שמקבל אותו כמה ימים נשארו, ומתעדכן לבד כל יום. הלוח המעוצב להדפסה (פוסטר, עמוד לכל חודש, דף ארוך לגלילה או שרשרת נייר) נבנה ב־MyLuach.':'The link shows how many days are left and updates daily. The printable design is built in MyLuach.')+'</p>';
    $('#kShare').onclick=async e=>{try{await navigator.clipboard.writeText(share);e.target.textContent=HE()?'הקישור הועתק':'Copied'}catch(err){prompt('',share)}};
  };
  ['kT','kD','kS','kL'].forEach(i=>$('#'+i).addEventListener('input',draw));draw();
}
function relDays(d){const n=dayDiff(TODAY,d);return n>=0?t('inDays')(n):t('daysAgo')(-n)}

/* ---------- תזכורות ---------- */
function viewReminders(){
  $('#main').innerHTML='<div class="bar"><h1>'+t('reminders')+'</h1><span class="row"><button class="btn pri" type="button" id="remNew">+ '+t('addRem')+'</button>'+(HE()?'<button class="btn" type="button" id="remYz">📜 מדברי הימים</button>':'')+'</span></div>'+
    '<div class="card"><p class="small mute" style="margin-top:0">'+(HE()?'ימי הולדת, ימי נישואין, ימי שנה (יארצייטים) ותזכורות. הם מופיעים בלוח, ואפשר להוסיף אותם ליומן בטלפון עם התראה. התזכורות נשמרות בדפדפן הזה.':'Birthdays, anniversaries, yahrzeits and reminders. They show on the calendar and can be added to your phone calendar with alerts. Saved in this browser.')+'</p>'+
    (REM.length?'<div class="tbl-wrap"><table class="t"><tbody>'+REM.map(r=>{const nx=nextOcc(r);return '<tr><td><b>'+esc(r.name)+'</b></td><td>'+esc(remWhen(r))+'</td><td class="mute">'+(nx?esc(gStr(nx))+' · '+esc(relDays(nx)):'')+'</td><td><a class="btn" target="_blank" rel="noopener" href="'+gcalLink(r,nx)+'">Google</a> <button class="btn" type="button" data-redit="'+r.id+'">✎</button></td></tr>'}).join('')+'</tbody></table></div>'+
      '<div class="row" style="margin-top:12px"><button class="btn" type="button" id="remIcs">📅 '+(HE()?'הוספת הכל ליומן בטלפון (קובץ)':'Add all to phone calendar (.ics)')+'</button></div>':'<p>'+(HE()?'עדיין אין תזכורות.':'No reminders yet.')+'</p>')+
    '<p class="small mute">'+(HE()?'📧 רוצים תזכורת גם במייל? פותחים תזכורת (✎) ומסמנים "לשלוח לי גם תזכורת במייל".':'📧 Want an email too? Open a reminder (✎) and tick "Also email me a reminder".')+'</p></div>'+
    apptSection()+
    '<div class="card cta" style="margin-top:12px"><h3>'+t('ctaT')+'</h3><p>'+(HE()?'כל התזכורות שלכם יכולות להופיע בלוח שנה מודפס ומעוצב לבית.':'All your dates can appear in a printed, designed calendar for your home.')+'</p><a class="btn pri" href="'+builderLink()+'">'+t('ctaB')+'</a></div>';
}
function remWhen(r){if(r.rec==='once')return gStr(fromIso(r.date));if(r.rec==='greg')return (HE()?'כל שנה, ':'Every year, ')+r.d+' '+t('gMonths')[r.m-1];if(r.rec==='monthly')return (HE()?'כל חודש עברי ב־':'Every Hebrew month on the ')+hDay(+r.d);
  return (HE()?'כל שנה, ':'Every year, ')+hDay(+r.d)+' '+(+r.m===12?(HE()?'אדר':'Adar'):+r.m===13?(HE()?'אדר ב׳':'Adar II'):hMonthName(+r.m,5785))}
function nextOcc(r,from=TODAY,max=400){for(let i=0;i<max;i++){const d=addD(from,i);if(remHits(r,d))return d}return null}
/* gcalLink מוגדר למטה (מקבל שם או תזכורת) */
function remIcs(){
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MyLuach Online//HE','X-WR-CALNAME:'+t('siteName')],stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const e=s=>String(s).replace(/[\\,;]/g,x=>'\\'+x);let n=0;
  for(const r of REM){let d=TODAY;for(let k=0;k<(r.rec==='once'?1:r.rec==='monthly'?24:5);k++){const x=nextOcc(r,d,r.rec==='once'?3650:420);if(!x)break;n++;
    L.push('BEGIN:VEVENT','UID:'+r.id+'-'+iso(x)+'@luchenu','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+iso(x).replace(/-/g,''),'DTEND;VALUE=DATE:'+iso(addD(x,1)).replace(/-/g,''),'SUMMARY:'+e(r.name),'DESCRIPTION:'+e(hStr(new HDate(x))));
    for(const a of (r.notice||[1]))L.push('BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:'+(a===0?'PT8H':'-P'+(a-1)+'DT15H'),'DESCRIPTION:'+e(r.name),'END:VALARM');
    L.push('END:VEVENT');d=addD(x,1)}}
  L.push('END:VCALENDAR');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([L.join('\r\n')],{type:'text/calendar'}));a.download='reminders.ics';document.body.appendChild(a);a.click();a.remove();
}
/* התאריך הלועזי הקרוב של חודש ויום עבריים (לתזכורת מאירוע בדברי הימים) */
function nextHeb(m,d){const y=new HDate(TODAY).getFullYear();for(const yy of [y,y+1]){try{const leap=HDate.isLeapYear(yy),mm=m===13&&!leap?12:m;const g=noon(new HDate(Math.min(d,HDate.daysInMonth(mm,yy)),mm,yy).greg());if(g>=TODAY)return g}catch(e){}}return TODAY}
/* חיפוש באירועי דברי הימים והוספת תזכורת */
function yzPick(){dialog('<h2 id="dlgT">'+(HE()?'תזכורת מדברי הימים':'Reminder from Jewish history')+'</h2><p class="small mute">'+(HE()?'חפשו שם של צדיק, קהילה או מאורע, ובחרו כדי ליצור תזכורת שנתית לפי התאריך העברי.':'Search and pick an event to create a yearly Hebrew-date reminder.')+'</p><div class="row"><input id="yzQ" style="flex:1" placeholder="'+(HE()?'למשל: החפץ חיים':'e.g. Chafetz Chaim')+'"><button class="btn pri" type="button" id="yzGo">'+(HE()?'חיפוש':'Search')+'</button></div><div id="yzR" class="yz-res"></div>');
  const go=async()=>{const q=$('#yzQ').value.trim();if(q.length<2)return;$('#yzR').textContent='…';
    try{const j=await (await fetch(BASE+'../api/ticker?q='+encodeURIComponent(q))).json();const L=j.items||[];
      $('#yzR').innerHTML=L.length?L.map((e,i)=>'<button type="button" class="yz-i" data-i="'+i+'"><b>'+esc(hDay(e.d))+' '+esc(hebMonthNameNum(e.m))+'</b> '+(e.y?'· '+esc(e.y)+' ':'')+'· '+esc(e.t)+'</button>').join(''):'<p>'+(HE()?'לא נמצא. נסו מילה אחרת.':'Nothing found.')+'</p>';
      $('#yzR').querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const e=L[+b.dataset.i];closeDlg();remEditor(null,null,{m:e.m,d:e.d,name:e.t.split(',')[0].slice(0,80)})})}
    catch(e){$('#yzR').textContent=HE()?'החיפוש לא זמין כרגע.':'Search unavailable.'}};
  $('#yzGo').onclick=go;$('#yzQ').addEventListener('keydown',e=>{if(e.key==='Enter')go()});setTimeout(()=>$('#yzQ').focus(),30)}
function hebMonthNameNum(m){const L=['','ניסן','אייר','סיון','תמוז','אב','אלול','תשרי','חשון','כסלו','טבת','שבט','אדר','אדר ב׳'];return L[m]||''}
/* תזכורות קוליות: מוצגות רק כשהשירות פעיל בדף הניהול */
let VOICE_ON=false;fetch(BASE+'../api/pricing').then(r=>r.json()).then(j=>{VOICE_ON=!!(j&&j.voice)}).catch(()=>{});
/* חשבון המשתמש מהבונה (אותו אתר): אסימון הכניסה שנשמר בדפדפן */
function authTok(){try{const o=JSON.parse(localStorage.getItem('myluach-auth')||'null');if(o&&o.access_token&&(o.expires_at||0)*1000>Date.now()+60000)return {tok:o.access_token,email:(o.user&&o.user.email)||''}}catch(e){}return null}
const loginUrl=h=>BASE+'../app.html#login&back='+encodeURIComponent(location.pathname+location.search+'#'+(h||'reminders'));
function remEditor(id,date,pre){
  const r=id?REM.find(x=>x.id===id):null,d0=date||(pre&&pre.m?nextHeb(pre.m,pre.d):TODAY),h0=new HDate(d0);
  const v=r?{...r}:{name:pre?pre.name:'',rec:'heb',d:h0.getDate(),m:h0.getMonth(),date:iso(d0),notice:[1]};
  if(!r&&v.rec==='greg'){v.d=d0.getDate();v.m=d0.getMonth()+1}
  dialog('<h2 id="dlgT">'+(r?esc(r.name):t('addRem'))+'</h2><div class="row" style="margin-top:10px"><label class="fld" style="flex:1">'+(HE()?'מה להזכיר':'What')+'<input id="rN" value="'+esc(v.name)+'" placeholder="'+(HE()?'למשל: יום הולדת לשירה':'e.g. Sarah\'s birthday')+'"></label></div>'+
    '<div class="row" style="margin-top:8px"><label class="fld">'+(HE()?'חוזר':'Repeats')+'<select id="rR"><option value="heb">'+(HE()?'כל שנה, לפי התאריך העברי':'Yearly, Hebrew date')+'</option><option value="greg">'+(HE()?'כל שנה, לפי התאריך הלועזי':'Yearly, Gregorian date')+'</option><option value="monthly">'+(HE()?'כל חודש עברי':'Every Hebrew month')+'</option><option value="once">'+(HE()?'פעם אחת':'Once')+'</option></select></label><label class="fld">'+(HE()?'תאריך':'Date')+'<input type="date" id="rD" value="'+esc(v.date||iso(d0))+'"></label></div>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'מתי להזכיר':'Remind me')+'<span class="opts">'+[[7,HE()?'שבוע לפני':'a week before'],[2,HE()?'יומיים לפני':'2 days before'],[1,HE()?'יום לפני':'a day before'],[0,HE()?'באותו יום':'same day']].map(([n,l])=>'<label class="chk"><input type="checkbox" data-nt="'+n+'"'+((v.notice||[]).includes(n)?' checked':'')+'> '+l+'</label>').join('')+'</span></div>'+
    '<div class="fld rem-mail" style="margin-top:10px"><label class="chk"><input type="checkbox" id="rM"'+(v.mail&&v.mail.status!=='off'?' checked':'')+'> 📧 '+(HE()?'לשלוח לי גם תזכורת במייל':'Also email me a reminder')+'</label>'+
      (authTok()?'<input type="email" id="rE" dir="ltr" readonly value="'+esc(authTok().email)+'">':'<input type="hidden" id="rE" value=""><span class="small" id="rLogin">'+(HE()?'תזכורות במייל זמינות למשתמשים רשומים. ':'Email reminders need a free account. ')+'<a href="'+loginUrl()+'">'+(HE()?'כניסה / הרשמה בחינם':'Sign in / sign up')+'</a></span>')+'<span class="small mute">'+(HE()?'המייל יישלח בבוקר, לפי מה שסימנתם למעלה (שבוע, יומיים, יום לפני או באותו יום). בפעם הראשונה תקבלו מייל לאישור.':'Sent in the morning, per the alert options above. First time, you will get a confirmation email.')+'</span></div>'+
    (HE()&&(VOICE_ON||v.voice)?'<div class="fld rem-mail" style="margin-top:10px"><label class="chk"><input type="checkbox" id="rV"'+(v.voice?' checked':'')+'> 📞 גם שיחה קולית לטלפון <span class="small mute">(במסלול המלא, עד 50 תזכורות)</span></label>'+
      '<div id="rVBox" class="small" hidden><p style="margin:4px 0">כדי לקבל שיחות, מאמתים פעם אחת את מספר הטלפון:</p><div class="row"><input type="tel" id="rPh" dir="ltr" placeholder="05X-XXXXXXX" style="flex:1"><button class="btn" type="button" id="rPhS">קוד ב־SMS</button><button class="btn" type="button" id="rPhC">קוד בשיחה</button></div>'+
      '<div class="row" style="margin-top:6px"><input id="rCode" inputmode="numeric" dir="ltr" maxlength="6" placeholder="הקוד שקיבלתם" style="flex:1"><button class="btn pri" type="button" id="rCodeOk">אישור</button></div><p class="small" id="rVMsg"></p></div></div>':'')+
    '<p class="small mute" id="rP"></p><div class="row"><button class="btn pri" type="button" id="rS">'+t('save')+'</button>'+(r?'<button class="btn" type="button" id="rX">'+t('del')+'</button>':'')+'</div>');
  $('#rR').value=v.rec;
  const build=()=>{const dd=fromIso($('#rD').value||iso(d0)),hh=new HDate(dd),rec=$('#rR').value;const o={id:r?r.id:'r'+Math.random().toString(36).slice(2,9),name:$('#rN').value.trim(),rec,date:iso(dd),notice:[...document.querySelectorAll('[data-nt]:checked')].map(x=>+x.dataset.nt)};
    if(rec==='heb'){o.d=hh.getDate();o.m=hh.getMonth()}else if(rec==='greg'){o.d=dd.getDate();o.m=dd.getMonth()+1}else if(rec==='monthly')o.d=hh.getDate();return o};
  const prev=()=>{const o=build();$('#rP').textContent=remWhen(o)};['rR','rD'].forEach(i=>$('#'+i).addEventListener('input',prev));prev();
  const tE=()=>{$('#rE').style.display=$('#rM').checked?'':'none'};$('#rM').onchange=tE;tE();
  const A0=()=>authTok(),vApi=async(method,body)=>{const A=A0();if(!A)return {status:401};const r=await fetch(BASE+'../api/user?fn='+(body&&body.phoneApi?'phone':'voice'),{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+A.tok},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch(e){}return {status:r.status,...j}};
  if($('#rPhS')){const vm=t=>{$('#rVMsg').innerHTML=t};
    const send=via=>async()=>{const r=await vApi('POST',{phoneApi:1,action:'send',phone:$('#rPh').value,via});vm(r.status===200?'✓ שלחנו קוד ל־'+esc(r.phone)+'. הקלידו אותו כאן.':r.error==='phone'?'מספר הטלפון לא תקין.':r.status===429?'יותר מדי ניסיונות. נסו שוב בעוד שעה.':r.status===401?'צריך להתחבר. <a href="'+loginUrl()+'">כניסה</a>':'השירות עוד לא זמין. נסו שוב מאוחר יותר.')};
    $('#rPhS').onclick=send('sms');$('#rPhC').onclick=send('call');
    $('#rCodeOk').onclick=async()=>{const r=await vApi('POST',{phoneApi:1,action:'check',code:$('#rCode').value});if(r.status===200){vm('✓ הטלפון אומת: '+esc(r.phone)+'. עכשיו לוחצים "שמירה".');$('#rVBox').dataset.ok='1'}else vm(r.error==='code'?'הקוד לא נכון.':r.error==='expired'?'הקוד פג. שלחו קוד חדש.':'לא הצלחנו לאמת. נסו שוב.')}}
  $('#rS').onclick=async()=>{const o=build();if(!o.name){$('#rN').focus();return}
    const wantMail=$('#rM').checked,email=$('#rE').value.trim();o.mail=v.mail||null;
    if(wantMail){const A=authTok();if(!A){$('#rP').innerHTML=(HE()?'כדי לקבל תזכורות במייל צריך להתחבר. ':'Please sign in for email reminders. ')+'<a href="'+loginUrl()+'">'+(HE()?'כניסה / הרשמה':'Sign in')+'</a>';return}
      LS.set('mail',email);$('#rS').disabled=true;$('#rP').textContent=HE()?'שומרים…':'Saving…';
      try{const rr=await fetch(BASE+'../api/rem-subscribe',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+A.tok},body:JSON.stringify({email,name:o.name,rule:{rec:o.rec,d:o.d,m:o.m,date:o.date},notice:o.notice.length?o.notice:[0],lang:st.lang,token:o.mail&&o.mail.email===email?o.mail.token:''})});
        const j=await rr.json();if(rr.status===401){$('#rS').disabled=false;$('#rP').innerHTML=(HE()?'צריך להתחבר מחדש. ':'Please sign in again. ')+'<a href="'+loginUrl()+'">'+(HE()?'כניסה':'Sign in')+'</a>';return}if(!rr.ok||!j.token)throw new Error(j.error||rr.status);o.mail={email:A.email,token:j.token,status:j.status}}
      catch(e){$('#rS').disabled=false;$('#rP').textContent=HE()?'לא הצלחנו לשמור את התזכורת במייל. נסו שוב בעוד רגע.':'Could not save the email reminder. Please try again.';return}}
    else if(o.mail&&o.mail.token){fetch(BASE+'../api/rem-confirm?t='+o.mail.token+'&off=1').catch(()=>{});o.mail=null}
    o.voice=v.voice||null;
    if($('#rV')&&$('#rV').checked){const A=authTok();if(!A){$('#rS').disabled=false;$('#rP').innerHTML='לתזכורת קולית צריך להתחבר. <a href="'+loginUrl()+'">כניסה / הרשמה</a>';return}
      $('#rS').disabled=true;$('#rP').textContent='שומרים את התזכורת הקולית…';
      const rv=await vApi('POST',{id:o.voice&&o.voice.id,name:o.name,rule:{rec:o.rec,d:o.d,m:o.m,date:o.date},notice:o.notice.length?o.notice.filter(n=>n<=7):[0]});$('#rS').disabled=false;
      if(rv.status===403){$('#rP').innerHTML='תזכורת קולית זמינה במסלול המלא. <a href="'+BASE+'../#plans">למסלולים</a>';return}
      if(rv.status===409){$('#rVBox').hidden=false;$('#rP').textContent='מאמתים את מספר הטלפון (פעם אחת), ואז לוחצים שוב "שמירה".';return}
      if(rv.status===429){$('#rP').textContent='הגעתם למקסימום של '+(rv.max||50)+' תזכורות קוליות.';return}
      if(rv.status!==200){$('#rP').textContent='לא הצלחנו לשמור את התזכורת הקולית. נסו שוב.';return}
      o.voice={id:rv.id||(o.voice&&o.voice.id)}}
    else if(o.voice&&o.voice.id){vApi('POST',{action:'delete',id:o.voice.id});o.voice=null}
    if(r)REM[REM.indexOf(r)]=o;else REM.push(o);saveRem();closeDlg();render();
    if(o.mail&&o.mail.status==='pending')dialog('<h2 id="dlgT">📧 '+(HE()?'כמעט סיימנו':'Almost done')+'</h2><p>'+(HE()?'שלחנו מייל אישור ל־<b dir="ltr">'+esc(o.mail.email)+'</b>. לחצו על הקישור שבו, והתזכורות במייל יופעלו. אם לא הגיע תוך כמה דקות, בדקו בספאם.':'We sent a confirmation email to <b>'+esc(o.mail.email)+'</b>. Click the link in it to turn on email reminders.')+'</p><div class="row"><button class="btn pri" type="button" data-close>'+(HE()?'הבנתי':'OK')+'</button></div>')};
  if(r)$('#rX').onclick=()=>{if(r.voice&&r.voice.id)vApi('POST',{action:'delete',id:r.voice.id});if(r.mail&&r.mail.token)fetch(BASE+'../api/rem-confirm?t='+r.mail.token+'&off=1').catch(()=>{});REM=REM.filter(x=>x!==r);saveRem();closeDlg();render()};
  setTimeout(()=>$('#rN').focus(),30);
}


/* ---------- לימוד יומי ---------- */
const DAF_T=[['ברכות',64],['שבת',157],['עירובין',105],['פסחים',121],['שקלים',22],['יומא',88],['סוכה',56],['ביצה',40],['ראש השנה',35],['תענית',31],['מגילה',32],['מועד קטן',29],['חגיגה',27],['יבמות',122],['כתובות',112],['נדרים',91],['נזיר',66],['סוטה',49],['גיטין',90],['קידושין',82],['בבא קמא',119],['בבא מציעא',119],['בבא בתרא',176],['סנהדרין',113],['מכות',24],['שבועות',49],['עבודה זרה',76],['הוריות',14],['זבחים',120],['מנחות',110],['חולין',142],['בכורות',61],['ערכין',34],['תמורה',34],['כריתות',28],['מעילה',37],['נדה',73]];
const DAF_EN=['Berakhot','Shabbat','Eruvin','Pesachim','Shekalim','Yoma','Sukkah','Beitzah','Rosh Hashana','Taanit','Megillah','Moed Katan','Chagigah','Yevamot','Ketubot','Nedarim','Nazir','Sotah','Gittin','Kiddushin','Bava Kamma','Bava Metzia','Bava Batra','Sanhedrin','Makkot','Shevuot','Avodah Zarah','Horayot','Zevachim','Menachot','Chullin','Bekhorot','Arakhin','Temurah','Keritot','Meilah','Niddah'];
const NACH_HE2={'Joshua':'יהושע','Judges':'שופטים','I Samuel':'שמואל א','II Samuel':'שמואל ב','I Kings':'מלכים א','II Kings':'מלכים ב','Isaiah':'ישעיהו','Jeremiah':'ירמיהו','Ezekiel':'יחזקאל','Hosea':'הושע','Joel':'יואל','Amos':'עמוס','Obadiah':'עובדיה','Jonah':'יונה','Micah':'מיכה','Nachum':'נחום','Nahum':'נחום','Habakkuk':'חבקוק','Zephaniah':'צפניה','Haggai':'חגי','Zechariah':'זכריה','Malachi':'מלאכי','Psalms':'תהלים','Proverbs':'משלי','Job':'איוב','Song of Songs':'שיר השירים','Ruth':'רות','Lamentations':'איכה','Ecclesiastes':'קהלת','Esther':'אסתר','Daniel':'דניאל','Ezra':'עזרא','Nehemiah':'נחמיה','I Chronicles':'דברי הימים א','II Chronicles':'דברי הימים ב'};
const numH=n=>HE()?gem(+n).replace(/[׳״]/g,''):String(n);
const numX=x=>String(x).split(':').map(v=>/^\d+$/.test(v)?numH(+v):v).join(':');
let LRN=null,LRNP=false;
function lrnLib(){if(LRN)return LRN;if(window.hebcal__learning){LRN=window.hebcal__learning;return LRN}
  if(!LRNP){LRNP=true;const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@hebcal/learning@5.1.2/dist/bundle.min.js';s.onload=()=>{LRN=window.hebcal__learning||null;evCache.clear();render()};document.head.appendChild(s)}return null}
const hk=k=>{if(!HE())return k;try{return strip(H.Locale.gettext(k,'he'))}catch(e){return k}};
const LRN_T={
  daf:[['דף יומי','Daf Yomi'],d=>{const day=Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(2020,0,5))/864e5);let n=((day%2711)+2711)%2711;
    for(let i=0;i<DAF_T.length;i++){const [t,pg]=DAF_T[i];if(n<pg-1){const daf=n+2;let name=HE()?t:DAF_EN[i];if(t==='מעילה'){name=daf<=22?(HE()?'מעילה':'Meilah'):daf<=25?(HE()?'קינים':'Kinnim'):daf<=33?(HE()?'תמיד':'Tamid'):(HE()?'מדות':'Middot')}return name+' '+numH(daf)}n-=pg-1}return ''}],
  mishna:[['משנה יומית','Mishna Yomit'],d=>{const L=lrnLib();if(!L||!L.MishnaYomiIndex)return '';try{LRN_T._mi=LRN_T._mi||new L.MishnaYomiIndex();return LRN_T._mi.lookup(new HDate(d)).map(x=>hk(x.k)+' '+numX(x.v)).join(', ')}catch(e){return ''}}],
  nach:[['נ״ך יומי','Nach Yomi'],d=>{const L=lrnLib();if(!L||!L.NachYomiIndex)return '';try{LRN_T._ni=LRN_T._ni||new L.NachYomiIndex();const r=LRN_T._ni.lookup(new HDate(d));let k=String(r.k||r.name);
    if(HE()){const h=NACH_HE2[k.replace(/^1 /,'I ').replace(/^2 /,'II ')];k=h||hk(k)}return k+' '+numH(+r.v||+r.chap||0)}catch(e){return ''}}],
  yerushalmi:[['ירושלמי יומי','Yerushalmi Yomi'],d=>{const L=lrnLib();if(!L||!L.yerushalmiYomi||!L.vilna)return '';try{const r=L.yerushalmiYomi(new HDate(d),L.vilna);return r?hk(r.name)+' '+numX(r.blatt):''}catch(e){return ''}}],
  rambam:[['רמב״ם (פרק ליום)','Rambam (1 chapter)'],d=>{const L=lrnLib();if(!L||!L.dailyRambam1)return '';try{const r=L.dailyRambam1(new HDate(d));return r?hk(r.name)+' '+numX(r.perek):''}catch(e){return ''}}],
  tehillim:[['תהלים לפי החודש','Tehillim (monthly)'],d=>{const L=lrnLib();if(!L||!L.dailyPsalms)return '';try{const r=L.dailyPsalms(new HDate(d));return r?numX(r[0])+'–'+numX(r[1]):''}catch(e){return ''}}],
  cc:[['חפץ חיים','Chafetz Chaim'],d=>{const L=lrnLib();if(!L||!L.chofetzChaim)return '';try{const r=L.chofetzChaim(new HDate(d));return r?hk(r.k)+' '+numX(r.b)+(r.e&&r.e!==r.b?'–'+numX(r.e):''):''}catch(e){return ''}}],
  shl:[['שמירת הלשון','Shmirat HaLashon'],d=>{const L=lrnLib();if(!L||!L.shemiratHaLashon)return '';try{const r=L.shemiratHaLashon(new HDate(d));return r?hk(r.k)+' '+numX(r.b)+(r.e&&r.e!==r.b?'–'+numX(r.e):''):''}catch(e){return ''}}],
  dafw:[['דף שבועי','Daf Weekly'],d=>{const L=lrnLib();if(!L||!L.dafWeekly)return '';try{const r=L.dafWeekly(new HDate(d));if(!r)return '';return hk(r.getName?r.getName():r.name)+' '+numX(r.getBlatt?r.getBlatt():r.blatt)}catch(e){return ''}}]
};
const LRN_DEF=['daf','mishna','rambam'];
const lrnSel=()=>(Array.isArray(st.lrnSel)?st.lrnSel:LRN_DEF).filter(k=>LRN_T[k]);
function lrnFor(d){return lrnSel().map(k=>{const v=LRN_T[k][1](d);return v?{k,n:LRN_T[k][0][HE()?0:1],v}:null}).filter(Boolean)}
const lrnHTML=d=>lrnFor(d).map(x=>'<div class="lr"><span>'+esc(x.n)+'</span> <b>'+esc(x.v)+'</b></div>').join('');
function lrnPicker(){const sel=new Set(lrnSel());
  dialog('<h2 id="dlgT">'+(HE()?'לימוד יומי בלוח':'Daily learning')+'</h2><p class="small mute">'+(HE()?'מה יופיע בטור הלימוד היומי.':'What appears in the daily learning column.')+'</p><div class="dzp">'+
    Object.entries(LRN_T).map(([k,v])=>'<label class="chk"><input type="checkbox" value="'+k+'"'+(sel.has(k)?' checked':'')+'> '+esc(v[0][HE()?0:1])+'</label>').join('')+'</div>'+
    '<div class="row" style="margin-top:12px"><button class="btn pri" type="button" id="lrOk">'+t('save')+'</button></div>');
  $('#lrOk').onclick=()=>{st.lrnSel=[...document.querySelectorAll('.dzp input:checked')].map(i=>i.value);st.opts.learn=st.lrnSel.length>0;saveSt();closeDlg();render()}}

/* ---------- תצוגה שבועית ויומית ---------- */
function vTabs(){return '<div class="vtabs no-print" role="tablist">'+[['day',HE()?'יומי':'Day'],['week',HE()?'שבועי':'Week'],['month',HE()?'חודשי':'Month']].map(([k,l])=>'<button type="button" role="tab" data-vw="'+k+'" aria-selected="'+(view===k)+'">'+l+'</button>').join('')+'</div>'}
const WK_LBL={alot:'עלות השחר',alot2:'עלות השחר ב׳',mish:'משיכיר',netz:'הנץ החמה',shmaM:'סוזק״ש מג״א',shmaG:'סוזק״ש גר״א',tfilaM:'סוז״ת מג״א',tfilaG:'סוז״ת גר״א',musaf:'סוף זמן מוסף',chatzot:'חצות היום',minG:'מנחה גדולה',minK:'מנחה קטנה',plag:'פלג המנחה',shkia:'שקיעה',tzeit:'צאת הכוכבים',ci:'צאה״כ חזו״א',motz:'צאת שבת',rt:'ר״ת',fastE:'סוף צום',chatzotN:'חצות הלילה'};
const WK_DEF={m:['alot','mish','netz','shmaM','shmaG','tfilaG'],e:['chatzot','minG','plag','shkia','tzeit','rt']},WK_MAX=7;
function wkSel(){const w=st.wkZ&&Array.isArray(st.wkZ.m)?st.wkZ:WK_DEF;return {m:w.m.slice(0,WK_MAX),e:(w.e||[]).slice(0,WK_MAX)}}
const zLbl=z=>HE()?(WK_LBL[z.k]||z.n):(DZ_SHORT[z.k]?DZ_SHORT[z.k][1]:z.n);
function zList(Z,keys){return keys.map(k=>Z.find(z=>z.k===k)).filter(z=>z&&z.v).map(z=>'<div class="wz" title="'+esc(z.n+(z.m?' · '+z.m:''))+'"><span>'+esc(zLbl(z))+'</span><i></i><b>'+fmtT(z.v)+'</b></div>').join('')}
function dayCellItems(d,ev){const items=ev.get(iso(d))||[],note=NOTES[iso(d)]||{};
  return items.map(x=>'<span class="ev '+x.cls+'">'+esc(x.txt)+'</span>').join('')+
    remsOn(d).map(r=>'<span class="ev rem">'+esc(r.name)+'</span>').join('')+
    apptOn(d).map(a=>'<a href="#" class="ev appt" data-aedit="'+a.id+'"'+(a.color?' style="--ac:'+esc(a.color)+'"':'')+'>'+(a.start_t?esc(a.start_t)+(a.end_t?'–'+esc(a.end_t):'')+' ':'')+esc(a.title)+(a.place?' · '+esc(a.place):'')+'</a>').join('')+
    (note.text?'<span class="ev note">'+esc(note.text)+'</span>':'')}
function dateNav(unit){
  const b=(n,lbl,attr,sym)=>'<button class="btn nb" type="button" '+attr+'="'+n+'" title="'+lbl+'"><span aria-hidden="true" dir="ltr">'+sym+'</span><small>'+lbl+'</small></button>';
  const R=HE()?['›','‹','»','«']:['‹','›','«','»'];const step=unit==='day'?1:7,ul=unit==='day'?(HE()?'יום':'Day'):(HE()?'שבוע':'Week');
  return '<span class="dnav">'+b(-1,HE()?'שנה':'Year','data-ysh',R[2])+b(-1,HE()?'חודש':'Month','data-msh',R[0])+b(-step,ul,'data-wsh',R[0])+
    '<button class="btn today-b" type="button" id="tdy">'+t('today')+'</button>'+
    b(step,ul,'data-wsh',R[1])+b(1,HE()?'חודש':'Month','data-msh',R[1])+b(1,HE()?'שנה':'Year','data-ysh',R[3])+'</span>'}
function viewWeek(){
  const a=addD(anchor,-anchor.getDay()),days=Array.from({length:7},(_,i)=>addD(a,i)),ev=events(addD(a,-1),days[6]),W=wkSel(),LON=st.opts.learn!==false&&lrnSel().length>0;
  const sat=(ev.get(iso(days[6]))||[]).find(x=>x.cls==='par'),hA=new HDate(days[0]),hB=new HDate(days[6]);
  const range=hDay(hA.getDate())+' '+hMonthName(hA.getMonth(),hA.getFullYear())+' – '+hStr(hB)+' · '+gStr(days[0],false)+' – '+gStr(days[6]);
  const head='<div class="wk-top"><div class="wk-city"><small>'+(HE()?'לוח':'Calendar')+'</small><b>'+esc(cityName(city()))+'</b></div>'+
    '<div class="wk-mid"><div class="wk-title">'+esc(sat?sat.txt:(HE()?'שבוע':'Week'))+'</div><div class="mute small">'+esc(range)+'</div></div>'+dateNav('week')+'</div>';
  const rows=days.map(d=>{const hd=new HDate(d),Z=zm(d),items=ev.get(iso(d))||[],chag=items.some(x=>x.chag),note=NOTES[iso(d)]||{};
    const hFirst=hd.getDate()===1,gFirst=d.getDate()===1;
    return '<div class="wk-row'+(d.getDay()===6?' sh':'')+(chag?' chag':'')+(iso(d)===iso(TODAY)?' today':'')+'" data-day="'+iso(d)+'" role="button" tabindex="0"'+(note.color?' style="--nc:'+esc(note.color)+'"':'')+' aria-label="'+esc(t('weekdays')[d.getDay()]+', '+hStr(hd)+', '+gStr(d))+'">'+
      '<div class="wk-hd">'+hDay(hd.getDate())+(hFirst?'<small>'+esc(hMonthName(hd.getMonth(),hd.getFullYear()))+'</small>':'')+'</div>'+
      '<div class="wk-dn">'+t('weekdays')[d.getDay()]+'</div>'+
      '<div class="wk-z wk-zm">'+zList(Z,W.m)+'</div>'+
      '<div class="wk-ev">'+dayCellItems(d,ev)+'<button type="button" class="wk-add no-print" data-anew="'+iso(d)+'" title="'+(HE()?'הוספת פגישה':'Add appointment')+'">+</button></div>'+
      (LON?'<div class="wk-lr">'+lrnHTML(d)+'</div>':'')+
      '<div class="wk-z wk-ze">'+zList(Z,W.e)+'</div>'+
      '<div class="wk-gd">'+d.getDate()+(gFirst||d.getDay()===0?'<small>'+esc(t('gMonths')[d.getMonth()].slice(0,HE()?10:3))+'</small>':'')+'</div></div>'}).join('');
  $('#main').innerHTML=vTabs()+'<div class="bar no-print"><button class="btn" type="button" id="wkPick">⚙ '+(HE()?'אילו זמנים בשבועי':'Choose times')+'</button><button class="btn" type="button" id="lrPick">📖 '+(HE()?'לימוד יומי':'Daily learning')+'</button><button class="btn" type="button" data-zset="1">⚙ '+(HE()?'שיטת הזמנים':'Method')+'</button><button class="btn" type="button" data-printv="week">🖨 '+(HE()?'הדפסת השבוע':'Print week')+'</button><a class="btn pri" href="'+builderLink()+'">'+t('print')+'</a></div>'+
    '<section class="wk card'+(LON?' wk-l':'')+'"><h1 class="sr">'+esc((HE()?'לוח שבועי ':'Weekly calendar ')+cityName(city()))+'</h1>'+head+'<div class="wk-rows">'+rows+'</div>'+
    '<div class="wk-foot mute small">'+(HE()?'הזמנים לאופק '+esc(cityName(city()))+' לפי '+esc(ZPRE[zcfg().pre].he)+'.<span class="no-print"> מעבר עם העכבר על זמן מראה איך הוא מחושב.</span>':'Times for '+esc(cityName(city()))+', '+esc(ZPRE[zcfg().pre].en)+'.')+'</div></section>'+seoBlock();
}
function wkPicker(){
  const Z=zm(anchor),W=wkSel(),col=(p,sel)=>Z.filter(z=>z.p===p).map(z=>'<label class="chk"><input type="checkbox" data-wp="'+p+'" value="'+z.k+'"'+(sel.includes(z.k)?' checked':'')+'> '+esc(zLbl(z))+' <span class="mute small">'+fmtT(z.v)+'</span></label>').join('');
  dialog('<h2 id="dlgT">'+(HE()?'אילו זמנים יופיעו בתצוגה השבועית':'Times in the weekly view')+'</h2><p class="small mute">'+(HE()?'עד '+WK_MAX+' זמנים בכל צד. שיטת החישוב נקבעת ב"שיטת הזמנים".':'Up to '+WK_MAX+' on each side.')+'</p>'+
    '<div class="wkp"><div><h3>'+(HE()?'זמני בוקר':'Morning')+'</h3>'+col('m',W.m)+'</div><div><h3>'+(HE()?'זמני אחה״צ וערב':'Afternoon & evening')+'</h3>'+col('e',W.e)+'</div></div>'+
    '<div class="row" style="margin-top:12px"><button class="btn pri" type="button" id="wpOk">'+t('save')+'</button><button class="btn" type="button" id="wpDef">'+(HE()?'ברירת מחדל':'Default')+'</button></div>');
  const box=$('.wkp'),upd=()=>['m','e'].forEach(p=>{const L=[...box.querySelectorAll('[data-wp="'+p+'"]')],n=L.filter(i=>i.checked).length;L.forEach(i=>{if(!i.checked)i.disabled=n>=WK_MAX})});box.onchange=upd;upd();
  $('#wpOk').onclick=()=>{const g=p=>[...box.querySelectorAll('[data-wp="'+p+'"]:checked')].map(i=>i.value);st.wkZ={m:g('m'),e:g('e')};saveSt();closeDlg();render()};
  $('#wpDef').onclick=()=>{st.wkZ=null;saveSt();closeDlg();render()};
}
function viewDay(){
  const d=anchor,hd=new HDate(d),ev=events(addD(d,-1),d),Z=zm(d),A=apptOn(d),login=!!authTok();
  const byH={};for(const a of A){const h=a.start_t?+a.start_t.slice(0,2):-1;(byH[h]=byH[h]||[]).push(a)}
  const aLink=a=>'<a href="#" class="ev appt" data-aedit="'+a.id+'"'+(a.color?' style="--ac:'+esc(a.color)+'"':'')+'>'+(a.start_t?'<b>'+esc(a.start_t)+(a.end_t?'–'+esc(a.end_t):'')+'</b> ':'')+esc(a.title)+(a.place?' · '+esc(a.place):'')+(a.note?'<small> · '+esc(a.note)+'</small>':'')+'</a>';
  let hours='';for(let h=6;h<=23;h++)hours+='<div class="hr"><span>'+String(h).padStart(2,'0')+':00</span><div>'+(byH[h]||[]).map(aLink).join('')+'<button type="button" class="hr-add no-print" data-anew="'+iso(d)+'" data-ah="'+String(h).padStart(2,'0')+':00" aria-label="'+(HE()?'פגישה ב־':'Appointment at ')+h+':00">+</button></div></div>';
  const allDay=(byH[-1]||[]).map(aLink).join('');
  $('#main').innerHTML=vTabs()+'<div class="bar no-print"><button class="btn" type="button" data-anew="'+iso(d)+'">+ '+(HE()?'פגישה':'Appointment')+'</button><button class="btn" type="button" data-zset="1">⚙ '+(HE()?'שיטת הזמנים':'Method')+'</button><button class="btn" type="button" data-printv="day">🖨 '+(HE()?'הדפסת היום':'Print day')+'</button></div>'+
    '<section class="card dv"><div class="wk-top"><div class="wk-mid"><h1 class="dv-t">'+t('weekdays')[d.getDay()]+', '+esc(hStr(hd))+'</h1><div class="mute">'+esc(gStr(d))+' · '+esc(relDays(d))+'</div></div>'+dateNav('day')+'</div>'+
    '<div class="dv-g"><div><div class="dv-ev">'+(ev.get(iso(d))||[]).map(x=>'<span class="ev '+x.cls+'">'+esc(x.txt)+'</span>').join('')+remsOn(d).map(r=>'<span class="ev rem">'+esc(r.name)+'</span>').join('')+((NOTES[iso(d)]||{}).text?'<span class="ev note">'+esc(NOTES[iso(d)].text)+'</span>':'')+allDay+'</div>'+
      (login?'':'<p class="small no-print">'+(HE()?'כדי לרשום פגישות ביומן צריך להתחבר. ':'Sign in to add appointments. ')+'<a href="'+loginUrl('day/'+iso(d))+'">'+(HE()?'כניסה / הרשמה בחינם':'Sign in')+'</a></p>')+
      '<div class="hours">'+hours+'</div></div>'+
      '<aside class="dv-z">'+(lrnSel().length?'<h2>'+(HE()?'לימוד יומי':'Daily learning')+'</h2><div class="dv-lr">'+lrnHTML(d)+'</div>':'')+'<h2>'+t('zmanim')+'</h2><div class="zl">'+Z.filter(z=>z.v).map(z=>'<span title="'+esc(z.m||'')+'">'+esc(z.n)+'</span><b>'+fmtT(z.v)+'</b>').join('')+'</div><p class="mute small">'+esc(cityName(city()))+' · '+esc(HE()?ZPRE[zcfg().pre].he:ZPRE[zcfg().pre].en)+'</p></aside></div></section>';
}
function printView(v){if(view!==v)go(v,anchor);setTimeout(()=>window.print(),350)}

/* ---------- פגישות (משתמשים רשומים, נשמר בשרת) ---------- */
let APPT=[];
const apptOn=d=>{const k=iso(d);return APPT.filter(a=>a.date===k).sort((x,y)=>(x.start_t||'').localeCompare(y.start_t||''))};
async function apptApi(method,body,qs){const A=authTok();if(!A)return {status:401};try{const r=await fetch(BASE+'../api/user?fn=appt'+(qs||''),{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+A.tok},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch(e){}return {status:r.status,...j}}catch(e){return {status:0}}}
async function apptLoad(){if(!authTok())return;const r=await apptApi('GET');if(r.status===200){APPT=r.items||[];render()}}
const A_COLORS=['','#2a7d86','#2f5f9e','#5a4fb0','#b4501f','#c0392b','#1f8a5b','#a8650a'];
function apptEditor(id,date,hour){
  if(!authTok()){dialog('<h2 id="dlgT">'+(HE()?'פגישות ביומן':'Appointments')+'</h2><p>'+(HE()?'רישום פגישות זמין למשתמשים רשומים (בחינם). הפגישות נשמרות בחשבון ומופיעות בכל מכשיר, בלוח החודשי, השבועי והיומי, ואפשר להדפיס אותן ולקבל תזכורת במייל.':'Appointments are available with a free account. They sync across devices, appear in all views, can be printed and can email you a reminder.')+'</p><div class="row"><a class="btn pri" href="'+loginUrl(date?'day/'+iso(date):'reminders')+'">'+(HE()?'כניסה / הרשמה בחינם':'Sign in / sign up')+'</a></div>');return}
  const a=id?APPT.find(x=>x.id===id):null,v=a?{...a}:{date:iso(date||anchor),start_t:hour||'',end_t:hour?String(Math.min(23,+hour.slice(0,2)+1)).padStart(2,'0')+':00':'',title:'',place:'',note:'',color:'',notify:'none'};
  dialog('<h2 id="dlgT">'+(a?(HE()?'עריכת פגישה':'Edit appointment'):(HE()?'פגישה חדשה':'New appointment'))+'</h2>'+
    '<div class="row" style="margin-top:8px"><label class="fld" style="flex:1">'+(HE()?'מה':'What')+'<input id="aT" maxlength="160" value="'+esc(v.title)+'" placeholder="'+(HE()?'למשל: פגישה עם רואה החשבון':'e.g. Meeting with accountant')+'"></label></div>'+
    '<div class="row" style="margin-top:8px"><label class="fld">'+(HE()?'תאריך':'Date')+'<input type="date" id="aD" value="'+esc(v.date)+'"></label><label class="fld">'+(HE()?'משעה':'From')+'<input type="time" id="aS" value="'+esc(v.start_t||'')+'"></label><label class="fld">'+(HE()?'עד':'To')+'<input type="time" id="aE" value="'+esc(v.end_t||'')+'"></label></div>'+
    '<div class="row" style="margin-top:8px"><label class="fld" style="flex:1">'+(HE()?'מקום (לא חובה)':'Where (optional)')+'<input id="aP" maxlength="160" value="'+esc(v.place||'')+'"></label></div>'+
    '<div class="fld" style="margin-top:8px">'+(HE()?'הערה (לא חובה)':'Note (optional)')+'<textarea id="aN" rows="2" maxlength="1000">'+esc(v.note||'')+'</textarea></div>'+
    '<div class="row" style="margin-top:8px;align-items:center"><span class="small">'+(HE()?'צבע':'Color')+'</span><span class="colors">'+A_COLORS.map(c=>'<button type="button" data-acol="'+c+'" aria-pressed="'+((v.color||'')===c)+'" style="background:'+(c||'#fff')+'" aria-label="'+(c||'none')+'"></button>').join('')+'</span></div>'+
    '<label class="fld" style="margin-top:8px">📧 '+(HE()?'תזכורת במייל':'Email reminder')+'<select id="aR"><option value="none">'+(HE()?'בלי תזכורת':'None')+'</option><option value="morning">'+(HE()?'בבוקר של יום הפגישה':'Morning of the day')+'</option><option value="daybefore">'+(HE()?'יום לפני':'A day before')+'</option><option value="both">'+(HE()?'יום לפני וגם בבוקר':'Both')+'</option></select></label>'+
    '<p class="small mute" id="aMsg"></p><div class="row"><button class="btn pri" type="button" id="aSave">'+t('save')+'</button>'+(a?'<button class="btn" type="button" id="aDel">'+t('del')+'</button>':'')+'</div>');
  $('#aR').value=v.notify||'none';let col=v.color||'';
  document.querySelectorAll('[data-acol]').forEach(b=>b.onclick=()=>{col=b.dataset.acol;document.querySelectorAll('[data-acol]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
  $('#aSave').onclick=async()=>{const o={id:a&&a.id,title:$('#aT').value.trim(),date:$('#aD').value,start_t:$('#aS').value,end_t:$('#aE').value,place:$('#aP').value.trim(),note:$('#aN').value.trim(),color:col,notify:$('#aR').value};
    if(!o.title){$('#aT').focus();return}if(!o.date){$('#aD').focus();return}
    $('#aSave').disabled=true;$('#aMsg').textContent=HE()?'שומרים…':'Saving…';const r=await apptApi('POST',o);$('#aSave').disabled=false;
    if(r.status===401){$('#aMsg').innerHTML=(HE()?'צריך להתחבר מחדש. ':'Please sign in again. ')+'<a href="'+loginUrl('reminders')+'">'+(HE()?'כניסה':'Sign in')+'</a>';return}
    if(r.status!==200){$('#aMsg').textContent=r.status===429?(HE()?'הגעתם למספר הפגישות המרבי.':'Too many appointments.'):(HE()?'לא הצלחנו לשמור. נסו שוב בעוד רגע.':'Could not save. Try again.');return}
    const row={...o,id:r.id||o.id,start_t:o.start_t||null,end_t:o.end_t||null};if(a)APPT[APPT.indexOf(a)]=row;else APPT.push(row);closeDlg();render()};
  if(a)$('#aDel').onclick=async()=>{await apptApi('POST',{action:'delete',id:a.id});APPT=APPT.filter(x=>x!==a);closeDlg();render()};
  setTimeout(()=>$('#aT').focus(),30);
}
function apptSection(){
  const login=!!authTok(),up=APPT.filter(a=>a.date>=iso(TODAY)).sort((x,y)=>(x.date+(x.start_t||'')).localeCompare(y.date+(y.start_t||''))).slice(0,30);
  return '<div class="card" style="margin-top:12px"><div class="bar" style="margin-bottom:6px"><h2>'+(HE()?'📅 הפגישות שלי':'📅 My appointments')+'</h2><button class="btn pri" type="button" data-anew="">+ '+(HE()?'פגישה חדשה':'New appointment')+'</button></div>'+
    (!login?'<p class="small">'+(HE()?'פגישות זמינות למשתמשים רשומים (בחינם): נשמרות בחשבון, מופיעות בכל מכשיר ובכל תצוגות הלוח, אפשר להדפיס יומן יומי, שבועי או חודשי ולקבל תזכורת במייל. ':'Free account required. ')+'<a href="'+loginUrl('reminders')+'">'+(HE()?'כניסה / הרשמה':'Sign in')+'</a></p>':
     (up.length?'<div class="tbl-wrap"><table class="t"><tbody>'+up.map(a=>{const d=fromIso(a.date);return '<tr><td>'+t('weekdays')[d.getDay()]+' '+esc(gStr(d,false))+' · '+esc(hStr(new HDate(d),false))+'</td><td>'+(a.start_t?esc(a.start_t)+(a.end_t?'–'+esc(a.end_t):''):'')+'</td><td><b>'+esc(a.title)+'</b>'+(a.place?' · '+esc(a.place):'')+'</td><td><button class="btn" type="button" data-aedit="'+a.id+'">✎</button></td></tr>'}).join('')+'</tbody></table></div>':'<p class="mute">'+(HE()?'אין פגישות קרובות.':'No upcoming appointments.')+'</p>'))+
    '<div class="row" style="margin-top:10px"><span class="small">🖨 '+(HE()?'הדפסת יומן:':'Print:')+'</span><button class="btn" type="button" data-printv="day">'+(HE()?'יומי':'Day')+'</button><button class="btn" type="button" data-printv="week">'+(HE()?'שבועי':'Week')+'</button><button class="btn" type="button" data-printv="month">'+(HE()?'חודשי':'Month')+'</button></div></div>'}

/* ---------- חלון יום ---------- */
function dayDialog(d){
  const hd=new HDate(d),items=(events(addD(d,-1),d).get(iso(d))||[]),Z=zm(d),note=NOTES[iso(d)]||{},rs=remsOn(d);
  const COLORS=['','#fde7a9','#cfe8d5','#d6e4f5','#f3d3df','#e4dcf3'];
  dialog('<h2 id="dlgT">'+t('weekdays')[d.getDay()]+', '+esc(hStr(hd))+'</h2><p class="mute" style="margin:2px 0 10px">'+esc(gStr(d))+' · '+esc(relDays(d))+'</p>'+
    (items.length?'<div style="margin-bottom:10px">'+items.map(x=>'<div class="ev '+x.cls+'" style="font-size:15px">'+esc(x.txt)+(x.ev&&!x.ev.eventTime?' <a class="gcal-add" href="'+gcalLink(x.txt,d)+'" target="_blank" rel="noopener" title="'+(HE()?'הוספה ליומן גוגל':'Add to Google Calendar')+'">+ '+(HE()?'ליומן':'calendar')+'</a>':'')+'</div>').join('')+'</div>':'')+
    (rs.length?'<div style="margin-bottom:10px">'+rs.map(r=>'<div><a href="#" data-redit="'+r.id+'" class="ev rem" style="font-size:15px">'+esc(r.name)+'</a> <a class="gcal-add" href="'+gcalLink(r.name,d)+'" target="_blank" rel="noopener">+ '+(HE()?'ליומן גוגל':'Google Calendar')+'</a></div>').join('')+'</div>':'')+
    (apptOn(d).length?'<div style="margin-bottom:10px">'+apptOn(d).map(a=>'<div><a href="#" data-aedit="'+a.id+'" class="ev appt" style="font-size:15px'+(a.color?';--ac:'+esc(a.color):'')+'">'+(a.start_t?esc(a.start_t)+(a.end_t?'–'+esc(a.end_t):'')+' ':'')+esc(a.title)+'</a></div>').join('')+'</div>':'')+
    '<details><summary><b>'+t('zmanim')+' · '+esc(cityName(city()))+'</b></summary><div class="zl" style="margin-top:8px">'+Z.map(z=>'<span>'+esc(z.n)+'</span><b>'+fmtT(z.v)+'</b>').join('')+'</div></details>'+
    '<div class="fld" style="margin-top:12px">'+t('note')+'<textarea id="nT" rows="2">'+esc(note.text||'')+'</textarea></div>'+
    '<div class="row" style="margin-top:8px;align-items:center"><span class="small">'+t('color')+'</span><span class="colors">'+COLORS.map(c=>'<button type="button" data-col="'+c+'" aria-pressed="'+((note.color||'')===c)+'" style="background:'+(c||'#fff')+'" aria-label="'+(c||'none')+'"></button>').join('')+'</span></div>'+
    '<div class="row" style="margin-top:12px"><button class="btn pri" type="button" id="nS">'+t('save')+'</button><button class="btn" type="button" id="dRem">+ '+t('addRem')+'</button><button class="btn" type="button" id="dAppt">+ '+(HE()?'פגישה':'Appointment')+'</button><button class="btn" type="button" id="dDay">'+t('day')+'</button><a class="btn" href="#zmanim/'+iso(d)+'" id="dZ">'+t('zmanim')+'</a></div>');
  let col=note.color||'';
  document.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>{col=b.dataset.col;document.querySelectorAll('[data-col]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
  $('#nS').onclick=()=>{const txt=$('#nT').value.trim();if(txt||col)NOTES[iso(d)]={text:txt,color:col};else delete NOTES[iso(d)];saveNotes();closeDlg();render()};
  $('#dRem').onclick=()=>remEditor(null,d);$('#dAppt').onclick=()=>apptEditor(null,d);$('#dDay').onclick=()=>{closeDlg();go('day',d)};
  $('#dZ').onclick=e=>{e.preventDefault();closeDlg();go('zmanim',d)};
}
function dialog(html){$('#dlgBody').innerHTML=html;$('#dlg').hidden=false;document.body.style.overflow='hidden'}
function closeDlg(){$('#dlg').hidden=true;document.body.style.overflow=''}

/* ---------- צד, תחתית, קישורים ---------- */
function builderLink(){const hy=new HDate(anchor).getFullYear();return BUILDER+(HE()?'':'en.html')+'#city-'+st.city+'&hy-'+(new HDate(anchor).getMonth()>=7?hy:hy)}

/* יומן חגים וזמני שבת לעיר, להרשמה מיומן גוגל / אייפון (קבצים ב-online/ics/, נוצרים ב-tools/gen_ics.mjs) */
function icsUrl(){const c=city();return c&&c.id&&!String(c.id).startsWith('custom')?'//'+(window.location.host||'www.myluach.org')+'/online/ics/'+c.id+'.ics':null}
function calCard(){const u=icsUrl();if(!u)return '';
  const g='https://calendar.google.com/calendar/r?cid='+encodeURIComponent('webcal:'+u),w='webcal:'+u;
  return '<div class="card cal-card"><b>'+(HE()?'חגים וזמני שבת ביומן שלכם':'Holidays & Shabbat times in your calendar')+'</b><p class="small mute" style="margin:4px 0 8px">'+(HE()?'חגים, צומות, פרשת השבוע והדלקת נרות ב'+esc(cityName(city()))+', מתעדכן לבד.':'Holidays, fasts, Torah portion and candle lighting for '+esc(cityName(city()))+'. Updates automatically.')+'</p>'+
    '<div class="row" style="gap:6px;flex-wrap:wrap"><a class="btn" href="'+g+'" target="_blank" rel="noopener">'+(HE()?'ליומן גוגל':'Google Calendar')+'</a><a class="btn" href="'+w+'">'+(HE()?'לאייפון / אאוטלוק':'iPhone / Outlook')+'</a></div></div>'}
function gcalLink(title,d){if(title&&typeof title==='object')title=title.name;if(!d)return '#';const d8=x=>x.getFullYear()+String(x.getMonth()+1).padStart(2,'0')+String(x.getDate()).padStart(2,'0');
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
function renderFoot(){$('#foot').innerHTML='<span>© '+TODAY.getFullYear()+' '+t('siteName')+'</span><a href="'+BUILDER+'">'+(HE()?'MyLuach · בניית לוח שנה אישי להדפסה':'MyLuach · personal printed calendars')+'</a><a href="'+BASE+'../index.html">'+(HE()?'מסלולים ומחירים':'Plans & pricing')+'</a>'+(HE()?'<a href="'+BASE+'../articles/">מאמרים: זמני היום ומנהגים</a>':'')+'<span>'+(HE()?'הזמנים מחושבים אסטרונומית ואינם תחליף ללוח של רב הקהילה.':'Times are astronomical calculations.')+'</span>'}
function renderNav(){
  $('#nav').innerHTML=VIEWS.filter(v=>v!=='day').map(v=>{const cur=v==='week'?view==='week'||view==='day':v==='countdown'?view==='tools'&&sub==='countdown':v==='tools'?view==='tools'&&sub!=='countdown':v===view;return '<a href="#'+v+'" data-nav="'+v+'"'+(cur?' aria-current="page"':'')+'>'+t(v)+'</a>'}).join('');
  const sel=$('#city');const groups=[...new Set(CITIES.map(c=>c.g))];
  sel.innerHTML=groups.map(g=>'<optgroup label="'+esc(HE()?g:CITIES.find(c=>c.g===g).gen)+'">'+CITIES.filter(c=>c.g===g).map(c=>'<option value="'+c.id+'">'+esc(cityName(c))+'</option>').join('')+'</optgroup>').join('');sel.value=st.city;
  $('#lang').textContent=HE()?'English':'עברית';
  document.documentElement.lang=st.lang;document.documentElement.dir=HE()?'rtl':'ltr';
  document.querySelectorAll('[data-t]').forEach(x=>x.textContent=t(x.dataset.t));
}
function render(){
  renderNav();
  ({month:viewMonth,week:viewWeek,day:viewDay,year:viewYear,holidays:viewHolidays,zmanim:viewZmanim,shabbat:viewShabbat,tools:viewTools,reminders:viewReminders}[view]||viewMonth)();
  renderSide();renderFoot();
  document.body.classList.toggle('wide-view',view==='week');{let ps=document.getElementById('pgsz');if(!ps){ps=document.createElement('style');ps.id='pgsz';document.head.appendChild(ps)}ps.textContent=view==='week'?'@page{size:A4 landscape;margin:7mm}':'';}
  if(!PAGE.static)document.title=(view==='month'?monthDays().title+' · ':t(view)+' · ')+t('siteName');
}
function saveSt(){LS.set('settings',{lang:st.lang,city:st.city,mode:st.mode,opts:st.opts,zm:st.zm,dzSel:st.dzSel,wkZ:st.wkZ,lrnSel:st.lrnSel})}

/* ---------- אירועים בממשק ---------- */
document.addEventListener('click',e=>{
  const T2=e.target;
  const nv=T2.closest('[data-nav]');if(nv){e.preventDefault();$('#nav').classList.remove('open');go(nv.dataset.nav,nv.dataset.nav==='month'?TODAY:null,nv.dataset.nav==='tools'?'':undefined);return}
  const tl=T2.closest('[data-tool]');if(tl){e.preventDefault();go('tools',null,tl.dataset.tool);return}
  const ae=T2.closest('[data-aedit]');if(ae){e.preventDefault();apptEditor(+ae.dataset.aedit);return}
  const an=T2.closest('[data-anew]');if(an){e.preventDefault();apptEditor(null,an.dataset.anew?fromIso(an.dataset.anew):anchor,an.dataset.ah||'');return}
  const re0=T2.closest('[data-redit]');if(re0){e.preventDefault();remEditor(re0.dataset.redit);return}
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
  const vw=T2.closest('[data-vw]');if(vw){go(vw.dataset.vw,anchor);return}
  const wsh=T2.closest('[data-wsh]');if(wsh){anchor=addD(anchor,+wsh.dataset.wsh);render();return}
  const msh=T2.closest('[data-msh]');if(msh){anchor=new Date(anchor.getFullYear(),anchor.getMonth()+(+msh.dataset.msh),Math.min(anchor.getDate(),28),12);render();return}
  const ysh=T2.closest('[data-ysh]');if(ysh){anchor=new Date(anchor.getFullYear()+(+ysh.dataset.ysh),anchor.getMonth(),Math.min(anchor.getDate(),28),12);render();return}
  const pv=T2.closest('[data-printv]');if(pv){printView(pv.dataset.printv);return}
  if(T2.id==='wkPick'){wkPicker();return}
  if(T2.id==='lrPick'){lrnPicker();return}
  if(T2.id==='dzPick'){dzPicker();return}
  if(T2.id==='remNew'){remEditor(null);return}
  if(T2.id==='remYz'){yzPick();return}
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
readHash();render();apptLoad();
/* מבזקי "היום בתולדות ישראל": פס מתחלף בראש הדף. הטקסט מוצג דרך CSS כדי שלא יהיה נוח להעתיק */
(function ticker(){if(!HE())return;fetch(BASE+'../api/ticker?d='+iso(TODAY)).then(r=>r.json()).then(o=>{const L=(o&&o.items)||[];if(!L.length)return;
  const top=document.querySelector('header.top');if(!top||document.getElementById('tick'))return;
  const w=document.createElement('div');w.id='tick';w.className='tick no-print';w.setAttribute('role','region');w.setAttribute('aria-label','היום בתולדות ישראל');
  const items=L.map((e,i)=>'<span class="tick-i" data-k="'+i+'" title="לחצו להוספת תזכורת שנתית" data-t="'+esc((e.y?e.y+' · ':'')+e.t)+'"></span>').join('<span class="tick-sep" aria-hidden="true">◆</span>');
  const one=items+'<span class="tick-sep" aria-hidden="true">◆</span>';
  w.innerHTML='<span class="tick-lab" data-t="היום בתולדות ישראל · '+esc(o.date||'')+'"></span><div class="tick-win"><div class="tick-run">'+one+'</div></div>';
  top.after(w);const run=w.querySelector('.tick-run'),win=w.querySelector('.tick-win');
  /* חוזרים על הרשימה מספיק פעמים כדי שהפס תמיד יהיה מלא, ומהירות קבועה (כ־55 פיקסלים בשנייה) */
  const fit=()=>{run.innerHTML=one;const w1=run.scrollWidth||1,k=Math.max(1,Math.ceil(win.clientWidth/w1)+1),half=one.repeat(k);run.innerHTML=half+half;run.style.animationDuration=Math.max(20,(w1*k)/55)+'s'};
  fit();let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(fit,300)});
  w.addEventListener('click',e=>{const x=e.target.closest('[data-k]');if(!x)return;const it=L[+x.dataset.k];remEditor(null,null,{m:it.m,d:it.d,name:it.t.split(',')[0].slice(0,80)})});
  ['copy','cut','contextmenu','selectstart','dragstart'].forEach(ev=>w.addEventListener(ev,e=>e.preventDefault()))}).catch(()=>{})})();
})();
