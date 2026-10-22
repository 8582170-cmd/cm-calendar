(function(){
'use strict';
const $=s=>document.querySelector(s);
/* ---------- מסלולים ---------- */
const LP=window.MyLuachPlans;
let SAMPLE=null,LITE=false; /* הורדת חודש לדוגמה: {key} בזמן ההדפסה */
/* בלי כניסה לחשבון רואים 8 חודשים, ובהורדה מבקשים להיכנס (ההרשמה חינם) */
const AUTH={user:null,ready:false},LOGIN_MONTHS=8;
/* דף הספירה לאחור (countdown.html) משתמש באותו בונה, עם לוח נפרד ושמור בנפרד */
const SNAPVIEW=window.location.hash==='#snapview'&&!!window.opener;
const CDMODE=window.MYLUACH_MODE==='countdown',SIMPLE=window.MYLUACH_MODE==='simple',SKEY=CDMODE?'state-cd':'state';
/* גרסה באנגלית (simple-en.html, countdown-en.html): תאריכים, חגים וכיוון הדף באנגלית; טקסטי הממשק מתורגמים ב-assets/i18n-en.js */
const EN=document.documentElement.lang==='en';const PGN=n=>EN?n.replace(/^(countdown|simple)\.html/,'$1-en.html'):n;
let SNAPPLAN='';
const PLAN0=()=>SNAPVIEW&&LP?LP.byId(SNAPPLAN||'free'):LITE?{...(LP?LP.byId('free'):{}),months:99,watermark:false,lite:true,features:{}}:SAMPLE?{...(LP?LP.byId('full'):{}),months:99,watermark:'light',features:new Proxy({},{get:()=>true})}:LP?(()=>{let c=LP.current();if(AUTH.ready&&!AUTH.user)c=LP.byId('free');return c.id==='free'&&AUTH.ready&&!AUTH.user?{...c,months:Math.min(c.months,LOGIN_MONTHS),needLogin:true}:c})():{months:99,events:Infinity,downloads:99,watermark:false,features:new Proxy({},{get:()=>true})};
/* לוח ספירה לאחור קצר (עד FREE_CD ימים) פתוח בחינם: בלי סימן מים, ומדפיסים בלי לנצל הורדה */
const FREE_CD=40;
function freeCd(){try{return state.s.view==='countdown'&&cdDays().days.length<=FREE_CD}catch(e){return false}}
/* לוח ספירה לאחור: בלי סימן מים בכלל. עד FREE_CD ימים גם ההדפסה בחינם; ארוך יותר דורש מסלול להדפסה */
const PLAN=()=>{const p=PLAN0();if(SAMPLE||!p.watermark)return p;if(freeCd())return {...p,watermark:false,freeCd:true};if(state.s.view==='countdown')return {...p,watermark:false};return p};
window.addEventListener('beforeprint',()=>document.body.classList.toggle('free-cd',!!PLAN().freeCd));
/* הדפסה שלא דרך הכפתורים באתר (Ctrl+P או תפריט הדפדפן): נרשמת בדף הניהול כ"הדפסה מהדפדפן" */
let OURPRINT=false,BRPRINT_T=0;
function ourPrint(){OURPRINT=true;try{window.print()}finally{setTimeout(()=>{OURPRINT=false},1500)}}
window.addEventListener('beforeprint',()=>{if(OURPRINT||Date.now()-BRPRINT_T<5000)return;BRPRINT_T=Date.now();try{logDl('browser',{wm:PLAN().watermark?1:0})}catch(e){}});
const canF=f=>SAMPLE?true:(!LP||LP.can(f));
function monthCut(months){const n=PLAN().months;return n<months.length&&months[n]?months[n].days[0]:null}
function beforeCut(d,months){const c=monthCut(months);return !c||d<c}
const stage=$('#stage');
if(!window.hebcal){stage.insertAdjacentHTML('beforeend','<div class="err">לא הצלחתי לטעון את ספריית הלוח העברי. בדקו את החיבור לאינטרנט ורעננו את הדף.</div>');return}
const {HDate,HebrewCalendar,Location,Zmanim,flags}=window.hebcal;

/* ---------- places ---------- */
const J='Asia/Jerusalem',NY='America/New_York',CH='America/Chicago',LA='America/Los_Angeles';
const CITY_ROWS={
 'ישראל':[
  ['jerusalem','ירושלים',31.778,35.2354,754,J,40],['bneibrak','בני ברק',32.0807,34.8338,30,J,22],['telaviv','תל אביב',32.0853,34.7818,20,J,22],
  ['petahtikva','פתח תקווה',32.0871,34.8875,50,J,40],['ramatgan','רמת גן',32.0684,34.8248,50,J,22],['givatayim','גבעתיים',32.0722,34.8125,70,J,22],
  ['holon','חולון',32.0158,34.7874,30,J,22],['batyam','בת ים',32.0132,34.748,20,J,22],['rishon','ראשון לציון',31.973,34.7925,50,J,20],
  ['rehovot','רחובות',31.8928,34.8113,60,J,22],['yavne','יבנה',31.8781,34.7395,40,J,22],['ashdod','אשדוד',31.8014,34.6435,30,J,22],
  ['ashkelon','אשקלון',31.6688,34.5743,40,J,20],['kiryatgat','קרית גת',31.61,34.7642,140,J,22],['kiryatmalachi','קרית מלאכי',31.73,34.744,90,J,22],
  ['sderot','שדרות',31.525,34.596,100,J,20],['netivot','נתיבות',31.423,34.589,140,J,30],['ofakim','אופקים',31.314,34.62,160,J,30],
  ['beersheva','באר שבע',31.2518,34.7913,280,J,20],['dimona','דימונה',31.07,35.033,550,J,20],['arad','ערד',31.258,35.213,600,J,20],
  ['eilat','אילת',29.5577,34.9519,10,J,20],['modiin','מודיעין',31.898,35.01,250,J,20],['modiinillit','מודיעין עילית',31.9325,35.0436,320,J,30],
  ['elad','אלעד',32.0522,34.9512,150,J,30],['roshhaayin','ראש העין',32.0956,34.9566,80,J,20],['lod','לוד',31.951,34.888,70,J,20],
  ['ramla','רמלה',31.929,34.862,80,J,20],['kfarsaba','כפר סבא',32.175,34.907,50,J,20],['raanana','רעננה',32.184,34.871,60,J,20],
  ['herzliya','הרצליה',32.1624,34.8447,40,J,20],['netanya','נתניה',32.3215,34.8532,30,J,20],['hadera','חדרה',32.434,34.919,20,J,20],
  ['harish','חריש',32.459,35.045,150,J,20],['zichron','זכרון יעקב',32.57,34.953,170,J,30],['haifa','חיפה',32.794,34.9896,250,J,30],
  ['kiryatata','קרית אתא',32.809,35.106,60,J,30],['rechasim','רכסים',32.749,35.099,230,J,30],['akko','עכו',32.928,35.076,10,J,30],
  ['nahariya','נהריה',33.008,35.098,20,J,30],['karmiel','כרמיאל',32.919,35.29,260,J,30],['safed','צפת',32.9646,35.496,850,J,30],
  ['tiberias','טבריה',32.7959,35.531,-200,J,30],['afula','עפולה',32.607,35.289,60,J,30],['nofhagalil','נוף הגליל',32.707,35.327,450,J,30],
  ['migdalhaemek','מגדל העמק',32.676,35.24,200,J,30],['kiryatshmona','קרית שמונה',33.207,35.572,150,J,24],['katzrin','קצרין',32.993,35.693,330,J,30],
  ['beitshemesh','בית שמש',31.747,34.9881,250,J,40],['beitar','ביתר עילית',31.6969,35.1169,740,J,40],['efrat','אפרת',31.653,35.15,900,J,40],
  ['maaleadumim','מעלה אדומים',31.777,35.3,600,J,30],['givatzeev','גבעת זאב',31.86,35.17,700,J,40],['kochavyaakov','כוכב יעקב',31.881,35.247,750,J,40],
  ['telzstone','קרית יערים',31.804,35.101,720,J,30],['kiryatarba','קרית ארבע',31.533,35.11,930,J,30],['ariel','אריאל',32.104,35.171,570,J,20],
  ['immanuel','עמנואל',32.16,35.134,400,J,40]],
 'צפון אמריקה':[
  ['newyork','ניו יורק',40.7128,-74.006,10,NY],['brooklyn','ברוקלין',40.6782,-73.9442,20,NY],['monsey','מונסי',41.1112,-74.0685,150,NY],
  ['lakewood','לייקווד',40.0821,-74.2097,20,NY],['teaneck','טינק',40.8932,-74.0116,20,NY],['passaic','פסאיק',40.8568,-74.1285,30,NY],
  ['baltimore','בולטימור',39.2904,-76.6122,30,NY],['philadelphia','פילדלפיה',39.9526,-75.1652,15,NY],['washington','וושינגטון',38.9072,-77.0369,20,NY],
  ['boston','בוסטון',42.3601,-71.0589,10,NY],['chicago','שיקגו',41.8781,-87.6298,180,CH],['cleveland','קליבלנד',41.4993,-81.6944,200,NY],
  ['detroit','דטרויט',42.3314,-83.0458,190,'America/Detroit'],['miami','מיאמי',25.7617,-80.1918,2,NY],['bocaraton','בוקה רטון',26.3683,-80.1289,5,NY],
  ['atlanta','אטלנטה',33.749,-84.388,320,NY],['dallas','דאלאס',32.7767,-96.797,130,CH],['houston','יוסטון',29.7604,-95.3698,15,CH],
  ['stlouis','סנט לואיס',38.627,-90.1994,140,CH],['denver','דנבר',39.7392,-104.9903,1600,'America/Denver'],['phoenix','פיניקס',33.4484,-112.074,330,'America/Phoenix'],
  ['losangeles','לוס אנג׳לס',34.0522,-118.2437,90,LA],['sanfrancisco','סן פרנסיסקו',37.7749,-122.4194,15,LA],['seattle','סיאטל',47.6062,-122.3321,50,LA],
  ['lasvegas','לאס וגאס',36.1699,-115.1398,610,LA],['toronto','טורונטו',43.6532,-79.3832,80,'America/Toronto'],['montreal','מונטריאול',45.5019,-73.5674,30,'America/Toronto'],
  ['vancouver','ונקובר',49.2827,-123.1207,10,'America/Vancouver'],['mexico','מקסיקו סיטי',19.4326,-99.1332,2240,'America/Mexico_City']],
 'דרום ומרכז אמריקה':[
  ['buenosaires','בואנוס איירס',-34.6037,-58.3816,25,'America/Argentina/Buenos_Aires'],['saopaulo','סאו פאולו',-23.5505,-46.6333,760,'America/Sao_Paulo'],
  ['rio','ריו דה ז׳נרו',-22.9068,-43.1729,5,'America/Sao_Paulo'],['panama','פנמה',8.9824,-79.5199,10,'America/Panama'],
  ['santiago','סנטיאגו',-33.4489,-70.6693,570,'America/Santiago'],['montevideo','מונטווידאו',-34.9011,-56.1645,40,'America/Montevideo']],
 'בריטניה ואירלנד':[
  ['london','לונדון',51.5074,-0.1278,20,'Europe/London',15],['manchester','מנצ׳סטר',53.4808,-2.2426,40,'Europe/London',15],
  ['gateshead','גייטסהד',54.9527,-1.6034,50,'Europe/London',15],['leeds','לידס',53.8008,-1.5491,60,'Europe/London',15],['dublin','דבלין',53.3498,-6.2603,20,'Europe/Dublin']],
 'אירופה':[
  ['paris','פריז',48.8566,2.3522,35,'Europe/Paris'],['strasbourg','שטרסבורג',48.5734,7.7521,140,'Europe/Paris'],['lyon','ליון',45.764,4.8357,170,'Europe/Paris'],
  ['marseille','מרסיי',43.2965,5.3698,10,'Europe/Paris'],['nice','ניס',43.7102,7.262,10,'Europe/Paris'],['antwerp','אנטוורפן',51.2194,4.4025,10,'Europe/Brussels'],
  ['brussels','בריסל',50.8503,4.3517,60,'Europe/Brussels'],['amsterdam','אמסטרדם',52.3676,4.9041,0,'Europe/Amsterdam'],['zurich','ציריך',47.3769,8.5417,410,'Europe/Zurich'],
  ['geneva','ז׳נבה',46.2044,6.1432,375,'Europe/Zurich'],['basel','באזל',47.5596,7.5886,260,'Europe/Zurich'],['vienna','וינה',48.2082,16.3738,190,'Europe/Vienna'],
  ['berlin','ברלין',52.52,13.405,35,'Europe/Berlin'],['frankfurt','פרנקפורט',50.1109,8.6821,110,'Europe/Berlin'],['munich','מינכן',48.1351,11.582,520,'Europe/Berlin'],
  ['milan','מילאנו',45.4642,9.19,120,'Europe/Rome'],['rome','רומא',41.9028,12.4964,20,'Europe/Rome'],['madrid','מדריד',40.4168,-3.7038,650,'Europe/Madrid'],
  ['barcelona','ברצלונה',41.3874,2.1686,10,'Europe/Madrid'],['gibraltar','גיברלטר',36.1408,-5.3536,10,'Europe/Gibraltar'],['prague','פראג',50.0755,14.4378,240,'Europe/Prague'],
  ['budapest','בודפשט',47.4979,19.0402,100,'Europe/Budapest'],['warsaw','ורשה',52.2297,21.0122,100,'Europe/Warsaw'],['krakow','קרקוב',50.0647,19.945,220,'Europe/Warsaw'],
  ['lizensk','ליז׳נסק',50.07,22.42,230,'Europe/Warsaw'],['kyiv','קייב',50.4501,30.5234,180,'Europe/Kiev'],['uman','אומן',48.7484,30.2218,210,'Europe/Kiev'],
  ['odessa','אודסה',46.4825,30.7233,40,'Europe/Kiev'],['dnipro','דניפרו',48.4647,35.0462,150,'Europe/Kiev'],['moscow','מוסקבה',55.7558,37.6173,150,'Europe/Moscow'],
  ['stpetersburg','סנט פטרבורג',59.9311,30.3609,10,'Europe/Moscow'],['minsk','מינסק',53.9006,27.559,220,'Europe/Minsk'],['vilnius','וילנה',54.6872,25.2797,110,'Europe/Vilnius'],
  ['riga','ריגה',56.9496,24.1052,10,'Europe/Riga'],['istanbul','איסטנבול',41.0082,28.9784,40,'Europe/Istanbul'],['athens','אתונה',37.9838,23.7275,70,'Europe/Athens'],
  ['copenhagen','קופנהגן',55.6761,12.5683,10,'Europe/Copenhagen'],['stockholm','שטוקהולם',59.3293,18.0686,20,'Europe/Stockholm'],['oslo','אוסלו',59.9139,10.7522,20,'Europe/Oslo']],
 'אפריקה':[
  ['johannesburg','יוהנסבורג',-26.2041,28.0473,1750,'Africa/Johannesburg'],['capetown','קייפטאון',-33.9249,18.4241,20,'Africa/Johannesburg'],
  ['casablanca','קזבלנקה',33.5731,-7.5898,30,'Africa/Casablanca'],['marrakech','מרקש',31.6295,-7.9811,470,'Africa/Casablanca'],
  ['djerba','ג׳רבה',33.8076,10.8451,10,'Africa/Tunis'],['cairo','קהיר',30.0444,31.2357,25,'Africa/Cairo']],
 'אסיה ואוקיאניה':[
  ['dubai','דובאי',25.2048,55.2708,10,'Asia/Dubai'],['mumbai','מומבאי',19.076,72.8777,10,'Asia/Kolkata'],['bangkok','בנגקוק',13.7563,100.5018,5,'Asia/Bangkok'],
  ['kathmandu','קטמנדו',27.7172,85.324,1400,'Asia/Kathmandu'],['hongkong','הונג קונג',22.3193,114.1694,10,'Asia/Hong_Kong'],['shanghai','שנגחאי',31.2304,121.4737,5,'Asia/Shanghai'],
  ['beijing','בייג׳ינג',39.9042,116.4074,45,'Asia/Shanghai'],['tokyo','טוקיו',35.6762,139.6503,40,'Asia/Tokyo'],['singapore','סינגפור',1.3521,103.8198,15,'Asia/Singapore'],
  ['tbilisi','טביליסי',41.7151,44.8271,500,'Asia/Tbilisi'],['baku','באקו',40.4093,49.8671,-28,'Asia/Baku'],['sydney','סידני',-33.8688,151.2093,40,'Australia/Sydney'],
  ['melbourne','מלבורן',-37.8136,144.9631,30,'Australia/Melbourne'],['perth','פרת׳',-31.9505,115.8605,30,'Australia/Perth'],['auckland','אוקלנד',-36.8485,174.7633,20,'Pacific/Auckland']]
};
const CITIES=[];
const LCC=EN&&window.LC_CITIES?Object.fromEntries(window.LC_CITIES.map(c=>[c.id,c.en])):{};
for(const [group,rows] of Object.entries(CITY_ROWS))for(const r of rows)CITIES.push({id:r[0],name:LCC[r[0]]||r[1],lat:r[2],lng:r[3],el:r[4],tz:r[5],il:group==='ישראל',candle:r[6]||18,group});

const ZMANIM=[
 ['alot','עלות השחר','עלות','down'],['alot2','עלות השחר ב׳','עלות ב׳','down'],['misheyakir','משיכיר (טלית ותפילין)','טלית','up'],['sunrise','הנץ החמה','נץ','up'],
 ['shma','סוף זמן ק״ש','ק״ש','down'],['tfila','סוף זמן תפילה','תפילה','down'],['musaf','סוף זמן מוסף לכתחילה','מוסף','down'],['chatzot','חצות היום','חצות','up'],
 ['minchaG','מנחה גדולה','מ.גדולה','up'],['minchaK','מנחה קטנה','מ.קטנה','up'],['plag','פלג המנחה','פלג','up'],
 ['yereim','בין השמשות (יראים)','בה״ש','down'],['sunset','שקיעה','שקיעה','down'],['tzeit','צאת הכוכבים','צאה״כ','up'],['ci','צאה״כ חזו״א','חזו״א','up'],['rt','צאה״כ רבינו תם','ר״ת','up'],['chatzotNight','חצות הלילה','חצות ל׳','up'],['ash2','אשמורת התיכונה (שליש הלילה)','אשמורת ב׳','up'],['ash3','אשמורת הבוקר (שני שלישי הלילה)','אשמורת ג׳','up'],['hour','אורך שעה זמנית (גר״א)','שעה זמנית','near']];

if(EN){const ZE={alot:['Dawn (Alot HaShachar)','Dawn'],alot2:['Dawn (2nd opinion)','Dawn 2'],misheyakir:['Misheyakir (tallit & tefillin)','Misheyakir'],sunrise:['Sunrise','Sunrise'],shma:['Latest Shema','Shema'],tfila:['Latest Shacharit','Shacharit'],musaf:['Latest Musaf','Musaf'],chatzot:['Midday (Chatzot)','Chatzot'],minchaG:['Mincha Gedola','M. Gedola'],minchaK:['Mincha Ketana','M. Ketana'],plag:['Plag HaMincha','Plag'],yereim:['Bein HaShmashot (Yereim)','Yereim'],sunset:['Sunset','Sunset'],tzeit:['Nightfall (Tzeit)','Tzeit'],ci:['Nightfall (Chazon Ish)','Chazon Ish'],rt:['Rabbeinu Tam','R. Tam'],chatzotNight:['Midnight (Chatzot)','Midnight'],ash2:['Second watch of the night','Watch 2'],ash3:['Third watch of the night','Watch 3'],hour:['Halachic hour (GRA)','Hour']};
  for(const z of ZMANIM)if(ZE[z[0]]){z[1]=ZE[z[0]][0];z[2]=ZE[z[0]][1]}}
const GEDOLIM=[
 ['rashbi','רבי שמעון בר יוחאי',18,2],['meir','רבי מאיר בעל הנס',14,2],['rambam','הרמב״ם',20,10],
 ['rashi','רש״י',29,4],['ari','האר״י הקדוש',5,5],['beityosef','מרן הבית יוסף',13,1],['rema','הרמ״א',18,2],
 ['maharal','המהר״ל מפראג',18,6],['ramchal','הרמח״ל',26,2],['orhachaim','האור החיים הקדוש',15,4],
 ['besht','הבעל שם טוב',6,3],['maggid','המגיד ממזריטש',19,9],['elimelech','רבי אלימלך מליז׳נסק',21,12],
 ['berditchev','רבי לוי יצחק מברדיטשוב',25,7],['tanya','בעל התניא',24,10],['nachman','רבי נחמן מברסלב',18,7],
 ['gra','הגאון מווילנא',19,7],['volozhin','רבי חיים מוולוז׳ין',14,3],['akiva','רבי עקיבא איגר',13,7],
 ['chatam','החתם סופר',25,7],['salanter','רבי ישראל סלנטר',25,11],['hirsch','רבי שמשון רפאל הירש',27,10],
 ['yaakov','רבי יעקב אבוחצירא',20,10],['benishchai','הבן איש חי',13,6],['chafetz','החפץ חיים',24,6],
 ['kook','הרב קוק',3,6],['chazonish','החזון איש',15,8],['kotler','רבי אהרן קוטלר',2,9],
 ['babasali','הבבא סאלי',4,11],['feinstein','רבי משה פיינשטיין',13,13],['steipler','הסטייפלר',23,5],
 ['rebbe','האדמו״ר מליובאוויטש',3,4],['auerbach','רבי שלמה זלמן אויערבאך',20,12],['abbashaul','רבי בן ציון אבא שאול',19,4],
 ['shach','הרב שך',16,8],['eliyahu','הרב מרדכי אליהו',25,3],['elyashiv','הרב יוסף שלום אלישיב',28,4],
 ['ovadia','הרב עובדיה יוסף',3,8],['kanievsky','רבי חיים קנייבסקי',17,13],
 ['moshe','משה רבינו',7,12],['aharon','אהרן הכהן',1,5],['david','דוד המלך',6,3],['rachel','רחל אמנו',11,8],
].map(g=>({id:g[0],name:g[1],day:g[2],month:g[3]}));

const KINDS={
 birthday:{label:'יום הולדת',ask:'של מי?',ph:'למשל: שירה',rec:'heb'},
 anniversary:{label:'יום נישואין',ask:'של מי?',ph:'למשל: ההורים',rec:'heb'},
 yahrzeit:{label:'יום שנה (יארצייט)',ask:'שם הנפטר',ph:'למשל: סבא משה',rec:'heb'},
 event:{label:'אירוע',ask:'מה האירוע?',ph:'למשל: חתונה של יוסי',rec:'once'},
 reminder:{label:'תזכורת',ask:'על מה להזכיר?',ph:'למשל: תשלום ארנונה',rec:'once'},
 other:{label:'טקסט חופשי',ask:'הטקסט שיופיע ביום',ph:'למשל: טיול שנתי',rec:'once'}};

const SIZES={
 wall:{label:'לוח קיר (A3)',w:297,h:420,o:'portrait'},
 wallL:{label:'לוח קיר גדול (A2)',w:420,h:594,o:'portrait'},
 a4:{label:'רגיל (A4)',w:210,h:297,o:'portrait'},
 letter:{label:'Letter (ארה״ב)',w:216,h:279,o:'portrait'},
 desk:{label:'שולחני (21×15 ס״מ)',w:150,h:210,o:'landscape'},
 fridge:{label:'מקרר (A5)',w:148,h:210,o:'portrait'},
 pocket:{label:'כיס (A6)',w:105,h:148,o:'portrait'},
 custom:{label:'מותאם אישית'}};
if(EN)Object.entries({wall:'Wall calendar (A3)',wallL:'Large wall calendar (A2)',a4:'Standard (A4)',letter:'Letter (US)',desk:'Desk (21×15 cm)',fridge:'Fridge (A5)',pocket:'Pocket (A6)',custom:'Custom'}).forEach(([k,v])=>SIZES[k].label=v);

const HEB_MONTHS={1:'ניסן',2:'אייר',3:'סיון',4:'תמוז',5:'אב',6:'אלול',7:'תשרי',8:'חשון',9:'כסלו',10:'טבת',11:'שבט',12:'אדר',13:'אדר ב׳'};
const HEB_ORDER=[7,8,9,10,11,12,13,1,2,3,4,5,6];
const GREG_MONTHS=['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const WEEKDAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
if(EN){GREG_MONTHS.splice(0,12,'January','February','March','April','May','June','July','August','September','October','November','December');WEEKDAYS.splice(0,7,'Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Shabbat')}
const ACCENTS=['#1e5a63','#24427a','#6b2d4f','#7a4a17','#3d5a2a','#8a2c2c','#2f2f3a'];

function gem(n){
  if(EN)return String(n);
  const H=[[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק']],T=['','י','כ','ל','מ','נ','ס','ע','פ','צ'],O=['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  let s='';for(const [v,l] of H){while(n>=v){s+=l;n-=v}}
  if(n===15)s+='טו';else if(n===16)s+='טז';else s+=T[Math.floor(n/10)]+O[n%10];
  return s.length===1?s+'׳':s.slice(0,-1)+'״'+s.slice(-1);
}
const HEB_MONTHS_EN={1:'Nisan',2:'Iyar',3:'Sivan',4:'Tammuz',5:'Av',6:'Elul',7:'Tishrei',8:'Cheshvan',9:'Kislev',10:'Tevet',11:'Shevat',12:'Adar',13:'Adar II'};
const hebMonthName=(m,leap)=>EN?(m===12&&leap?'Adar I':HEB_MONTHS_EN[m]):m===12&&leap?'אדר א׳':HEB_MONTHS[m];
const hebMonthOpt=m=>EN?(m===12?'Adar / Adar I':HEB_MONTHS_EN[m]):m===12?'אדר / אדר א׳':HEB_MONTHS[m];
const hebYearStr=y=>EN?String(y):gem(y%1000);
const isLeap=y=>HDate.isLeapYear(y);
const ymd=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const stripNikud=s=>String(s||'').replace(/[֑-ֽֿ-ׇ]/g,'');
const uid=()=>Math.random().toString(36).slice(2,10);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function opt(v,t,sel){return '<option value="'+esc(v)+'"'+(sel?' selected':'')+'>'+esc(t)+'</option>'}

/* ---------- state ---------- */
const todayH=new HDate(new Date());
const DEFAULT={
  v:2,
  s:{calType:'heb',hebYear:todayH.getFullYear(),gregYear:new Date().getFullYear()+1,gregStart:1,cover:true,
     showDst:true,credit:true,showHolidays:true,showParasha:true,showRC:true,showFasts:true,showSpecial:true,showModern:true,ytsg:'faint',showIsru:true,showChametz:true,chanukah:'tzeit',showMevarchim:false,showOmer:false,
     city:'jerusalem',custom:null,candleMins:40,il:true,zmanimMode:'daily',
     zmanim:{sunrise:true,shma:true,sunset:true},
     m_shma:'gra',zmPreset:'ashkenaz',zm:null,secs:false,zsecs:{},zbold:{},zlab:{},zround:{},zmode:{},
     theme:'ink',accent:ACCENTS[0],headFont:'',size:'wall',customW:300,customH:300,orient:'portrait',layout:'full',
     imgRatio:40,textScale:100,showCaption:true,dedication:false,imgText:'auto',view:'month',rangeFrom:'',rangeTo:'',yzPanel:true,yzPanelW:26,yzMode:'all',yzMax:2,yzFmt:'short',yzHist:false,yzLines:true,yzSel:null,banner:'none',banners:[],bannerSize:15,bannerSizes:{},bannerPer:false,
     gedolim:{rambam:1,rashbi:1,ari:1,gra:1,chafetz:1,babasali:1,besht:1,ramchal:1,rachel:1,chazonish:1,ovadia:1,rashi:1}},
  slots:{},
  cover:{title:'',img:null},
  banner:{img:null,text:''},
  ads:[],
  events:[
    {id:'ex1',name:EN?'Sarah (sample)':'שירה (דוגמה)',kind:'birthday',rec:'heb',day:12,month:8,year:5778},
    {id:'ex2',name:EN?'Grandpa Moshe (sample)':'סבא משה (דוגמה)',kind:'yahrzeit',rec:'heb',day:3,month:11,year:''},
    {id:'ex3',name:EN?'Mom & Dad (sample)':'ההורים (דוגמה)',kind:'anniversary',rec:'greg',day:24,month:6,year:1998}],
  customGedolim:[]
};
let state=structuredClone(DEFAULT);

function merge(base,inc){
  const out=structuredClone(base);
  if(!inc||typeof inc!=='object')return out;
  out.s=Object.assign(out.s,inc.s||{});
  if(inc.s&&inc.s.paper&&!inc.s.size)out.s.size={A4:'a4',A3:'wall',A5:'fridge',Letter:'letter'}[inc.s.paper]||'a4';
  ['slots','cover','banner','bannersData','textStyles','yzEdit','colImgs','cdImgs','fx','dayImgs'].forEach(k=>{if(inc[k])out[k]=inc[k]});
  ['events','customGedolim','ads','yzCustom'].forEach(k=>{if(Array.isArray(inc[k]))out[k]=inc[k]});
  out.events=out.events.map(e=>e.rec?e:{...e,rec:e.cal||'heb'});
  return out;
}

let db=null;
function idbOpen(){return new Promise(res=>{try{const r=indexedDB.open('luchenu',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)}catch(e){res(null)}})}
function idbGet(k){return new Promise(res=>{if(!db)return res(null);try{const r=db.transaction('kv').objectStore('kv').get(k);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null)}catch(e){res(null)}})}
function idbSet(k,v){return new Promise(res=>{if(!db)return res(false);try{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res(true);t.onerror=()=>res(false)}catch(e){res(false)}})}
let saveT=null;
function save(){if(LITE||SNAPVIEW)return;
  $('#saveState').textContent='שומר…';clearTimeout(saveT);
  saveT=setTimeout(async()=>{const ok=await idbSet(SKEY,state);$('#saveState').textContent=ok?'נשמר בדפדפן הזה':'לא ניתן לשמור בדפדפן הזה. השתמשו ב"שמירת גיבוי".';cloudQueue()},400);
}

let framed=false;try{framed=window.self!==window.top}catch(e){framed=true}
if(framed)$('#frameNotice').hidden=false;else $('#printBtn').hidden=false;
$('#printBtn').onclick=()=>doPrint();

/* ---------- location ---------- */
let XP=null;
/* בוחרים מיקום: אם הלוח היה בלי זמנים, מוסיפים את השקיעה ואת זמני השבת */
function locChosen(){const s=state.s;if(s.noTimes){s.noTimes=false;if(!Object.values(s.zmanim||{}).some(Boolean))s.zmanim={sunset:true}}}
function place(){
  if(XP)return XP;
  const s=state.s;
  if(s.city==='custom'&&s.custom)return s.custom;
  return CITIES.find(c=>c.id===s.city)||CITIES[0];
}
function location(){const p=place();return new Location(+p.lat,+p.lng,!!state.s.il,p.tz,p.name,'',undefined,+p.el||0)}
function dist(a,b,c,d){const R=6371,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r;const h=Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function nearest(lat,lng){let best=null,bd=1e9;for(const c of CITIES){const d=dist(lat,lng,c.lat,c.lng);if(d<bd){bd=d;best=c}}return {city:best,km:bd}}
function parseLoc(text){
  text=String(text||'').trim();if(!text)return null;
  let m,name='';
  try{const pm=text.match(/\/place\/([^/@?]+)/);if(pm)name=decodeURIComponent(pm[1].replace(/\+/g,' '))}catch(e){}
  const num='(-?\\d{1,3}(?:\\.\\d+)?)';
  const tries=[new RegExp('!3d'+num+'!4d'+num),new RegExp('@'+num+','+num),new RegExp('[?&](?:q|query|ll|center|destination|daddr)=(?:loc:)?'+num+'(?:,|%2C)\\s*'+num),new RegExp('^'+num+'°?\\s*[NS]?\\s*[,\\s]\\s*'+num+'°?')];
  for(const re of tries){m=text.match(re);if(m)break}
  if(!m)return null;
  const lat=+m[1],lng=+m[2];
  if(!(Math.abs(lat)<=90&&Math.abs(lng)<=180))return null;
  return {lat,lng,name};
}

/* ---------- calendar data ---------- */
function buildMonths(){
  const s=state.s,months=[];
  if(s.calType==='heb'){
    const y0=+s.hebYear,st=+s.hebStart||7,seq=[];
    [y0,y0+1].forEach(yy=>HEB_ORDER.forEach(m=>{if(m!==13||isLeap(yy))seq.push([m,yy])}));
    let i0=seq.findIndex(x=>x[0]===st);if(i0<0)i0=0;
    let i1=seq.findIndex((x,i)=>i>i0&&x[0]===st);if(i1<0)i1=seq.length;
    seq.slice(i0,i1).forEach(([m,y])=>{
      const leap=isLeap(y);
      const first=new HDate(1,m,y).greg(),len=HDate.daysInMonth(m,y),days=[];
      for(let i=0;i<len;i++)days.push(new Date(first.getFullYear(),first.getMonth(),first.getDate()+i,12));
      const gm=[...new Set(days.map(d=>GREG_MONTHS[d.getMonth()]))],gy=[...new Set(days.map(d=>d.getFullYear()))];
      months.push({key:'heb-'+m,title:hebMonthName(m,leap),year:hebYearStr(y),other:gm.join('–')+' '+gy.join('–'),days});
    });
  }else{
    let y=+s.gregYear,m=(+s.gregStart||1)-1;
    for(let i=0;i<12;i++){
      const len=new Date(y,m+1,0).getDate(),days=[];
      for(let d=1;d<=len;d++)days.push(new Date(y,m,d,12));
      const hs=days.map(d=>new HDate(d));
      const hm=[...new Set(hs.map(h=>hebMonthName(h.getMonth(),isLeap(h.getFullYear()))))],hy=[...new Set(hs.map(h=>hebYearStr(h.getFullYear())))];
      months.push({key:'greg-'+m,title:GREG_MONTHS[m],year:String(y),other:hm.join('–')+' '+hy.join('–'),days});
      m++;if(m>11){m=0;y++}
    }
  }
  return applyStartDate(months);
}
/* התחלה מתאריך מדויק: לפני תחילת השנה (עד חודשיים, כעמודים חלקיים) או באמצע החודש הראשון */
function applyStartDate(months){
  const s=state.s;if(!s.startDate||!months.length)return months;
  const sd=dateFromIso(s.startDate);if(!sd||isNaN(sd))return months;
  const first=months[0].days[0],last=months.at(-1).days.at(-1);
  if(sd<first){
    if((first-sd)/864e5>62)return months;
    const pre=[];let cur=null;
    for(let d=new Date(sd);d<first;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12)){
      const hd=new HDate(d),heb=s.calType==='heb',key=heb?'pre-heb-'+hd.getFullYear()+'-'+hd.getMonth():'pre-greg-'+d.getFullYear()+'-'+d.getMonth();
      if(!cur||cur.key!==key){
        cur=heb?{key,title:hebMonthName(hd.getMonth(),isLeap(hd.getFullYear())),year:hebYearStr(hd.getFullYear()),other:'',days:[]}:{key,title:GREG_MONTHS[d.getMonth()],year:String(d.getFullYear()),other:'',days:[]};pre.push(cur)}
      cur.days.push(d)}
    pre.forEach(mo=>{const hs=mo.days.map(d=>new HDate(d));
      mo.other=s.calType==='heb'?[...new Set(mo.days.map(d=>GREG_MONTHS[d.getMonth()]))].join('–')+' '+[...new Set(mo.days.map(d=>d.getFullYear()))].join('–'):[...new Set(hs.map(h=>hebMonthName(h.getMonth(),isLeap(h.getFullYear()))))].join('–')+' '+[...new Set(hs.map(h=>hebYearStr(h.getFullYear())))].join('–')});
    return pre.concat(months)}
  if(sd>first&&sd<=last){
    const out=months.filter(mo=>mo.days.at(-1)>=sd);
    if(out.length)out[0]={...out[0],days:out[0].days.filter(d=>d>=sd)};
    return out}
  return months;
}
function hebText(ev){let t='';try{t=ev.render(EN?'en':'he')}catch(e){}if(!t)t=ev.getDesc();return stripNikud(t).replace(/\b(5\d{3})\b/,(m,y)=>hebYearStr(+y))}
/* שניות: לכל זמן אפשר לבחור בנפרד (עם / בלי), ואם לא נבחר, לפי ההגדרה הכללית */
function zdir(key,def){const r=(state.s.zround||{})[key];return r&&r!=='auto'?r:def}
function secsFor(key){if(key==='tfila')return false;const z=state.s.zsecs||{};return key&&z[key]!=null?!!z[key]:!!state.s.secs}
function fmtTime(dt,dir,tz,key){
  if(!(dt instanceof Date)||isNaN(dt))return '—';
  const secs=secsFor(key),u=secs?1000:60000;
  let t=dt.getTime();t=dir==='down'?Math.floor(t/u)*u:dir==='near'?Math.round(t/u)*u:Math.ceil(t/u)*u;
  if(tz&&dstMode()!=='auto'){const d=new Date(t+customOff(t,tz)*60000);return d.getUTCHours()+':'+String(d.getUTCMinutes()).padStart(2,'0')+(secs?':'+String(d.getUTCSeconds()).padStart(2,'0'):'')}
  try{return new Intl.DateTimeFormat('he-IL',{hour:'numeric',minute:'2-digit',second:secs?'2-digit':undefined,hourCycle:'h23',timeZone:tz}).format(new Date(t))}catch(e){return '—'}
}
/* ---------- שעון קיץ: אוטומטי לפי המדינה, בלי, או תאריכים משלי ---------- */
function dstCfg(){const d=state.s.dst||{};return {mode:d.mode||'auto',sm:+d.sm||3,sd:+d.sd||27,st:d.st||'02:00',em:+d.em||10,ed:+d.ed||30,et:d.et||'02:00'}}
function dstMode(){return dstCfg().mode}
function intlOff(ms,tz){try{const p={};new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date(ms)).forEach(x=>p[x.type]=x.value);return Math.round((Date.UTC(+p.year,+p.month-1,+p.day,+p.hour%24,+p.minute,+p.second)-ms)/60000)}catch(e){return 0}}
const STD_OFF={};
function stdOff(tz,y){const k=tz+y;if(STD_OFF[k]==null)STD_OFF[k]=Math.min(intlOff(Date.UTC(y,0,15,12),tz),intlOff(Date.UTC(y,6,15,12),tz));return STD_OFF[k]}
function hm(s){const m=/^(\d{1,2}):(\d{2})/.exec(s||'');return m?(+m[1])*60+(+m[2]):120}
function dstWindow(y){/* בזמן חורף מקומי: מ־ההתחלה עד הסוף (שעת הסוף נכתבת לפי שעון הקיץ) */const c=dstCfg();return [Date.UTC(y,c.sm-1,c.sd)+hm(c.st)*60000,Date.UTC(y,c.em-1,c.ed)+(hm(c.et)-60)*60000]}
function customOff(ms,tz){const y=new Date(ms).getUTCFullYear(),base=stdOff(tz,y);if(dstMode()==='none')return base;const L=ms+base*60000,[S,E]=dstWindow(y);const inS=S<=E?(L>=S&&L<E):(L>=S||L<E);return base+(inS?60:0)}
/* ---------- halachic times engine ---------- */
const ZM_BASE={ash:'shkia',gra:'netz',minchaK:'gra',musaf:'gra',ci:'9.28',fastStart:'alot',chatzotNight:'true',chatzot:'mid',yereim:'-18f'};
const ZM_PRESETS={
  ashkenaz:{...ZM_BASE,alot:'19.75',alot2:'16.1',mish:'11.5',netz:'sea',shkia:'sea',mga:'19.75',minchaG:'lechumra',plag:'gra',tzeit:'8.5',motzash:'8.5',rt:'72f',fastEnd:'6.45'},
  sefardi:{...ZM_BASE,alot:'72z',alot2:'90z',mish:'66z',netz:'elev',shkia:'elev',mga:'72z',minchaG:'fixed30',plag:'sefardi',tzeit:'13.5z',motzash:'30f',rt:'72z',fastEnd:'20f'},
  tuk:{...ZM_BASE,alot:'19.75',alot2:'16.1',mish:'11.5',netz:'elev',shkia:'elev',mga:'19.75',minchaG:'lechumra',plag:'gra',tzeit:'8.5',motzash:'8.5',rt:'72f',fastEnd:'6.45'},
  itim:{...ZM_BASE,alot:'19.75',alot2:'16.1',mish:'11.5',netz:'sea',shkia:'elev',gra:'sea',mga:'19.75',minchaG:'lechumra',plag:'gra',tzeit:'8.5',motzash:'8.5',rt:'72f',fastEnd:'6.45'},
  gra:{...ZM_BASE,alot:'16.1',alot2:'19.75',mish:'11',netz:'sea',shkia:'sea',mga:'16.1',minchaG:'fixed30',plag:'gra',tzeit:'7.083',motzash:'8.5',rt:'72f',fastEnd:'6.45'},
  tanya:{...ZM_BASE,alot:'16.9',alot2:'16.1',mish:'10.2',netz:'amiti',shkia:'amiti',gra:'amiti',mga:'16.9>6',minchaG:'zman30',plag:'gra',tzeit:'6',motzash:'8.5',rt:'72f',fastEnd:'6'},
  chul:{...ZM_BASE,alot:'72f',alot2:'16.1',mish:'11',netz:'sea',shkia:'sea',mga:'72f',minchaG:'fixed30',plag:'gra',tzeit:'8.5',motzash:'8.5',rt:'72f',fastEnd:'6.45'},
  chazon:{...ZM_BASE,alot:'19.75',alot2:'16.1',mish:'11.5',netz:'sea',shkia:'elevHigh',gra:'sea',mga:'19.75',minchaG:'lechumra',plag:'gra',tzeit:'8.5',motzash:'8.5',ci:'9.28',rt:'72f',fastStart:'alot',fastEnd:'6.45'},
  tzikoni:{...ZM_BASE,alot:'16.1',alot2:'19.75',mish:'11.5',netz:'sea',shkia:'sea',gra:'sea',mga:'16.1',minchaG:'fixed30',plag:'gra',tzeit:'13.5f',motzash:'8.5',rt:'72f',fastStart:'alot',fastEnd:'8.5'}
};
const ZM_PRESET_HINT={
  ashkenaz:'עלות השחר 90 דק׳ במעלות (19.75°) ו־72 במעלות (16.1°), טלית ותפילין 11.5°, נץ ושקיעה מישוריים, מג״א מעה״ש 90 במעלות, מנחה גדולה לחומרא, צאת שבת 8.5°, ר״ת 72 דק׳, סוף צום 6.45°.',
  sefardi:'עלות השחר 72 דק׳ זמניות, טלית ותפילין 66 זמניות, נץ ושקיעה לפי הגובה, מג״א 72 זמניות, מנחה גדולה חצי שעה קבועה, פלג לפני צאה״כ 13.5 זמניות, צאה״כ 13.5 זמניות, צאת שבת 30 דק׳, ר״ת 72 זמניות, סוף צום 20 דק׳.',
  tuk:'כשיטת האשכנזים, אבל נץ ושקיעה מחושבים לפי גובה המקום, כמו בלוחות הגרי״מ טוקצ׳ינסקי.',
  itim:'כשיטת האשכנזים, אבל השקיעה (והדלקת הנרות) לפי גובה המקום, והנץ מישורי. שעות הגר״א מנץ לשקיעה מישוריים, מג״א מעלות השחר 90 במעלות.',
  gra:'שיטת הגר״א בפשטות: עלות השחר 72 במעלות, טלית ותפילין 11°, צאה״כ 3 כוכבים בינוניים (7.08°), מנחה גדולה חצי שעה.',
  tanya:'לפי שיטת בעל התניא (נהוג בחב״ד): עלות השחר 16.9°, נץ ושקיעה אמיתיים (מרכז השמש 1.583°), שעות הגר״א מהנץ לשקיעה האמיתיים, צאה״כ 6°.',
  chul:'הנפוץ בקהילות בחו״ל: עלות השחר ומג״א 72 דק׳ שוות, טלית ותפילין 11°, צאה״כ וצאת שבת 8.5°.',
  chazon:'כמו בלוחות "חזון שמיים" (שיטת האשכנזים): עלות השחר 90 במעלות (19.75°) ו־72 במעלות, טלית ותפילין 11.5°, נץ מישורי, שעות הגר״א מנץ לשקיעה מישוריים, מג״א מעה״ש 90 עד צאה״כ 90 במעלות, מנחה גדולה לחומרא, שקיעה לפי הגובה רק במקומות גבוהים, צאת שבת 8.5°, חזו״א 9.28°, ר״ת 72 דק׳, סוף צום 6.45°.',
  tzikoni:'לפי הלוח הממוצע שהציע הרב איתן ציקוני (מאמר "זמני היום", אתר דעת): עלות השחר 72 דק׳ במעלות, טלית ותפילין 11.5°, נץ ושקיעה אסטרונומיים, ק״ש ותפילה גר״א מנץ לשקיעה ומג״א מעה״ש עד צאה״כ 72 במעלות, מנחה גדולה חצי שעה, צאה״כ 13.5 דק׳ (לחומרא), מוצאי שבת וחג 8.5°.',
  custom:'שיטה שבחרתם בעצמכם בפירוט שלמטה.'
};
const ZM_ALOT=[['19.75','90 דק׳ במעלות (19.75°)'],['16.1','72 דק׳ במעלות (16.1°)'],['16.9','16.9° (בעל התניא)'],['18','18° (חכמי התכונה)'],['19','19°'],['19.8','19.8° (90 דק׳ במעלות, חישוב אחר)'],['25.9','120 דק׳ במעלות (25.9°)'],['26','26°'],['72z','72 דק׳ זמניות'],['90z','90 דק׳ זמניות'],['96z','96 דק׳ זמניות'],['120z','120 דק׳ זמניות'],['60f','60 דק׳ שוות'],['72f','72 דק׳ שוות'],['90f','90 דק׳ שוות'],['96f','96 דק׳ שוות'],['120f','120 דק׳ שוות']];
const ZM_TZ=[['3.65','3.65° (גאונים)'],['3.7','3.7°'],['3.8','3.8°'],['4.37','4.37°'],['4.61','4.61°'],['4.8','4.8°'],['5.88','5.88°'],['5.95','5.95°'],['6','6° (בעל התניא)'],['6.45','6.45°'],['7.083','7.08° (ג׳ כוכבים בינוניים)'],['7.67','7.67°'],['8.5','8.5°'],['9.28','9.28° (חזו״א, כ־40 דק׳)'],['9.3','9.3°'],['9.75','9.75°'],['16.1','16.1° (ר״ת במעלות)'],['18','18°'],['19.8','19.8°'],['26','26°'],['13.5z','13.5 דק׳ זמניות (ספרדים)'],['18z','18 דק׳ זמניות'],['72z','72 דק׳ זמניות'],['90z','90 דק׳ זמניות'],['96z','96 דק׳ זמניות'],['120z','120 דק׳ זמניות'],['13.5f','13.5 דק׳'],['18f','18 דק׳'],['20f','20 דק׳'],['24f','24 דק׳'],['30f','30 דק׳'],['35f','35 דק׳'],['40f','40 דק׳'],['42f','42 דק׳'],['45f','45 דק׳'],['50f','50 דק׳'],['60f','60 דק׳'],['72f','72 דק׳ (ר״ת)'],['90f','90 דק׳'],['96f','96 דק׳'],['120f','120 דק׳']];
const ZM_SUN=[['sea','מישורי (גובה פני הים, 0.833°)'],['elev','לפי גובה המקום (קרוב לנראה)'],['elevHigh','לפי הגובה רק במקום גבוה (400 מ׳ ומעלה)'],['amiti','אמיתי: מרכז השמש 1.583° (בעל התניא)']];
const ZM_FIELDS=[
  ['alot','עלות השחר',ZM_ALOT],
  ['alot2','עלות השחר ב׳',ZM_ALOT],
  ['mish','זמן טלית ותפילין',[['11.5','11.5°'],['11','11°'],['10.5','10.5° (לחומרא)'],['10.2','10.2°'],['9.5','9.5°'],['8.5','8.5°'],['7.65','7.65°'],['66z','66 דק׳ זמניות (ספרדים)'],['60f','60 דק׳ לפני הנץ'],['52f','52 דק׳ לפני הנץ'],['48f','48 דק׳ לפני הנץ'],['35f','35 דק׳ לפני הנץ']]],
  ['netz','הנץ',ZM_SUN],
  ['shkia','שקיעה',ZM_SUN],
  ['gra','שעות זמניות של הגר״א (הבסיס לק״ש, תפילה, מנחה ופלג)',[['netz','מהנץ עד השקיעה שנבחרו'],['sea','מנץ מישורי עד שקיעה מישורית'],['elev','מנץ עד שקיעה לפי הגובה'],['amiti','מנץ אמיתי עד שקיעה אמיתית (בעל התניא)']]],
  ['mga','שעות זמניות של מג״א (מתחילת היום עד סופו)',[['19.75','מעה״ש 90 במעלות עד צאה״כ המקביל'],['16.1','מעה״ש 72 במעלות (16.1°) עד המקביל'],['18','מעה״ש 18° עד 18°'],['19.8','מעה״ש 19.8° עד 19.8°'],['25.9','מעה״ש 120 במעלות עד המקביל'],['26','מעה״ש 26° עד 26°'],['72z','72 דק׳ זמניות לפני הנץ עד 72 אחרי השקיעה'],['90z','90 דק׳ זמניות'],['96z','96 דק׳ זמניות'],['120z','120 דק׳ זמניות'],['72f','72 דק׳ שוות'],['90f','90 דק׳ שוות'],['96f','96 דק׳ שוות'],['120f','120 דק׳ שוות'],['19.75>6.45','לחומרא: מעה״ש 90 במע׳ עד צאה״כ 6.45°'],['16.1>6.45','לחומרא: מעה״ש 72 במע׳ עד צאה״כ 6.45°'],['16.1>7.083','מעה״ש 16.1° עד צאה״כ 7.08°'],['16.1>shkia','מעה״ש 16.1° עד השקיעה'],['16.1>13.5z','מעה״ש 16.1° עד צאה״כ 13.5 זמניות'],['72z>40f','אטרת תורה: מעה״ש 72 זמניות עד 40 דק׳ אחרי השקיעה'],['12>7.083','מעה״ש 12° עד צאה״כ 7.08°']]],
  ['chatzot','חצות היום',[['mid','אמצע היום האסטרונומי (מנץ לשקיעה מישוריים)'],['gra','אמצע היום של הגר״א שנבחר']]],
  ['minchaG','מנחה גדולה',[['lechumra','לחומרא: המאוחר מחצי שעה קבועה או זמנית'],['fixed30','חצי שעה קבועה אחרי חצות'],['zman30','חצי שעה זמנית (גר״א)'],['mga','6.5 שעות זמניות של מג״א']]],
  ['minchaK','מנחה קטנה',[['gra','9.5 שעות זמניות (גר״א)'],['mga','9.5 שעות זמניות (מג״א)']]],
  ['plag','פלג המנחה',[['gra','שעה ורבע זמנית לפני השקיעה (גר״א)'],['sefardi','שעה ורבע לפני צאה״כ 13.5 זמניות'],['mga','שעה ורבע זמנית של מג״א לפני סוף היום שלו'],['tzeit','שעה ורבע לפני צאה״כ שנבחר']]],
  ['musaf','סוף זמן מוסף',[['gra','7 שעות זמניות (גר״א)'],['mga','7 שעות זמניות (מג״א)']]],
  ['yereim','בין השמשות (יראים, לפני השקיעה)',[['-18f','18 דק׳ לפני השקיעה'],['-16.875f','16.875 דק׳ לפני השקיעה'],['-13.5f','13.5 דק׳ לפני השקיעה'],['-3.05','השמש 3.05° מעל האופק'],['-2.8','2.8° מעל האופק'],['-2.1','2.1° מעל האופק']]],
  ['tzeit','צאת הכוכבים (ימי חול)',ZM_TZ],
  ['ci','צאה״כ חזו״א',[['9.28','9.28°'],['40f','40 דק׳ שוות'],['8.5','8.5°']]],
  ['rt','רבינו תם',[['72f','72 דק׳ שוות'],['72z','72 דק׳ זמניות'],['16.1','16.1°'],['90f','90 דק׳ שוות'],['120f','120 דק׳'],['26','26°']]],
  ['ash','משמרות הלילה (שלוש אשמורות)',[['shkia','הלילה מהשקיעה עד הנץ'],['tzeit','הלילה מצאת הכוכבים עד עלות השחר']]],
  ['chatzotNight','חצות הלילה',[['true','12 שעות אחרי חצות היום'],['shkia6','6 שעות אחרי השקיעה'],['tzeit6','6 שעות אחרי צאה״כ']]],
  ['motzash','צאת שבת וחג',ZM_TZ],
  ['fastStart','תחילת צום (בבוקר)',[['alot','כמו עלות השחר'],['alot2','כמו עלות השחר ב׳']].concat(ZM_ALOT)],
  ['fastEnd','סוף צום דרבנן',ZM_TZ]
];
const ZM_CUSTOMABLE=new Set(['alot','alot2','mish','tzeit','motzash','rt','fastEnd','ci','fastStart','mga','yereim','netz','shkia']);
function zmKeyLabel(k){k=String(k);if(k==='shkia')return 'השקיעה';if(k.includes('>')){const [a,b]=k.split('>');return 'מ־'+zmKeyLabel(a)+' עד '+zmKeyLabel(b)}if(k.endsWith('z'))return parseFloat(k)+' דק׳ זמניות';if(k.endsWith('f'))return parseFloat(k)+' דק׳ שוות';return parseFloat(k)+'°'}

function zmCfg(){const s=state.s;return {...ZM_PRESETS.ashkenaz,...(ZM_PRESETS[s.zmPreset]||{}),...(s.zm||{})}}
const ZC=new Map();
function zctx(date){
  const M=zmCfg(),p=place(),key=ymd(date)+'|'+p.lat+','+p.lng+','+(p.el||0)+'|'+JSON.stringify(M);
  if(ZC.has(key))return ZC.get(key);
  if(ZC.size>2000)ZC.clear();
  const loc=location(),zs=new Zmanim(loc,date,false),ze=new Zmanim(loc,date,true);
  const safe=fn=>{try{const r=fn();return r instanceof Date&&!isNaN(r)?r:null}catch(e){return null}};
  const sunAt=(key,rising)=>(key==='elevHigh'?key=(+(p.el||0)>=400?'elev':'sea'):0,key==='elev')?(rising?ze.sunrise():ze.sunset()):key==='amiti'?zs.timeAtAngle(1.583,rising):(key==='sea'||!isFinite(parseFloat(key)))?(rising?zs.seaLevelSunrise():zs.seaLevelSunset()):zs.timeAtAngle(parseFloat(key),rising);
  const netz=safe(()=>sunAt(M.netz,true));
  const shkia=safe(()=>sunAt(M.shkia,false));
  const gN=M.gra&&M.gra!=='netz'?safe(()=>sunAt(M.gra,true)):netz;
  const gS=M.gra&&M.gra!=='netz'?safe(()=>sunAt(M.gra,false)):shkia;
  const H=gN&&gS?(gS-gN)/12:NaN;
  const T=(d,ms)=>d&&isFinite(ms)?new Date(d.getTime()+ms):null;
  const before=k=>{k=String(k);if(k.endsWith('f'))return T(netz,-parseFloat(k)*60000);if(k.endsWith('z'))return T(netz,-parseFloat(k)*H/60);return safe(()=>zs.timeAtAngle(parseFloat(k),true))};
  const after=k=>{k=String(k);if(k==='shkia')return shkia;if(k.endsWith('f'))return T(shkia,parseFloat(k)*60000);if(k.endsWith('z'))return T(shkia,parseFloat(k)*H/60);return safe(()=>zs.timeAtAngle(parseFloat(k),false))};
  const [ma,mb]=String(M.mga).split('>');const ms=before(ma),me=after(mb||ma),Hm=ms&&me?(me-ms)/12:NaN;
  const chatzot=M.chatzot==='gra'?T(gN,6*H):safe(()=>zs.chatzot());
  const mgF=T(chatzot,30*60000),mgZ=T(chatzot,H/2);
  const tzeitW=after(M.tzeit);
  const Z={
    alot:before(M.alot),alot2:before(M.alot2),misheyakir:before(M.mish),sunrise:netz,
    shmaGRA:T(gN,3*H),tfilaGRA:T(gN,4*H),shmaMGA:T(ms,3*Hm),tfilaMGA:T(ms,4*Hm),
    chatzot,minchaG:M.minchaG==='fixed30'?mgF:M.minchaG==='zman30'?mgZ:M.minchaG==='mga'?T(ms,6.5*Hm):(mgF&&mgZ?new Date(Math.max(mgF,mgZ)):mgF),yereim:after(M.yereim||'-18f'),
    minchaK:M.minchaK==='mga'?T(ms,9.5*Hm):T(gN,9.5*H),musaf:M.musaf==='mga'?T(ms,7*Hm):T(gN,7*H),
    plag:M.plag==='sefardi'?T(after('13.5z'),-1.25*H):M.plag==='mga'?T(me,-1.25*Hm):M.plag==='tzeit'?T(tzeitW,-1.25*H):T(gS,-1.25*H),
    sunset:shkia,tzeit:tzeitW,ci:after(M.ci||'9.28'),rt:after(M.rt),motzash:after(M.motzash),fastEnd:after(M.fastEnd),
    fastStart:M.fastStart==='alot2'?before(M.alot2):M.fastStart&&M.fastStart!=='alot'?before(M.fastStart):before(M.alot),
    chametzEatGRA:T(gN,4*H),chametzEatMGA:T(ms,4*Hm),chametzBurnGRA:T(gN,5*H),chametzBurnMGA:T(ms,5*Hm),hourGRA:H,
    chatzotNight:M.chatzotNight==='shkia6'?T(shkia,6*3600000):M.chatzotNight==='tzeit6'?T(tzeitW,6*3600000):safe(()=>zs.chatzotNight())
  };
  /* משמרות הלילה: הלילה שאחרי היום הזה מחולק לשלוש */
  Object.defineProperty(Z,'ash2',{get(){return nightPart(date,M,1)},enumerable:false});
  Object.defineProperty(Z,'ash3',{get(){return nightPart(date,M,2)},enumerable:false});
  ZC.set(key,Z);return Z;
}
function nightPart(date,M,i){
  const Z=zctx(date),N=zctx(new Date(date.getFullYear(),date.getMonth(),date.getDate()+1,12));
  const a=M.ash==='tzeit'?Z.tzeit:Z.sunset,b=M.ash==='tzeit'?N.alot:N.sunrise;
  return a&&b?new Date(a.getTime()+(b-a)*i/3):null}
/* שורת הסבר: לפי איזו שיטה מחושב כל זמן */
function zMethodText(k){
  const M=zmCfg(),lab=f=>{const F=ZM_FIELDS.find(x=>x[0]===f);if(!F)return '';const v=M[f];const o=(F[2]||[]).find(x=>String(x[0])===String(v));return o?o[1]:v!=null?zmKeyLabel(v):''};
  if(k==='shma'||k==='tfila'){const md=(state.s.zmode||{})[k]||state.s.m_shma,h=k==='shma'?3:4;
    const g='גר״א: '+h+' שעות זמניות, '+lab('gra'),m='מג״א: '+h+' שעות זמניות, '+lab('mga');return md==='both'?m+' · '+g:md==='mga'?m:g}
  if(k==='hour')return 'אורך שעה זמנית לפי הגר״א, '+lab('gra');
  if(k==='ash2'||k==='ash3')return (k==='ash2'?'שליש':'שני שלישי')+' '+lab('ash');
  const f=ZM_ROW_FIELD[k];return f?lab(f):''}
function zExplainHTML(keys){
  if(!state.s.zExplain)return '';const seen=new Set(),rows=[];
  for(const z of keys){if(seen.has(z.key))continue;seen.add(z.key);const t=zMethodText(z.key);if(t)rows.push('<span><b>'+esc(String(z.k).replace(/ (מג״א|גר״א)$/,''))+':</b> '+esc(t)+'</span>')}
  return rows.length?'<div class="zexp">'+rows.join('')+'</div>':''}
/* ---------- molad, kiddush levana, tekufot, daily learning ---------- */
const JMT_MS=(35.2354/15)*3600000;
function moladRD(y,m){const Y=m<7?y+1:y;const me=(m-7)+Math.floor((235*Y-234)/19);return -1373427-876/25920+me*(29.5+793/25920)}
function rdToMs(rd){return Date.UTC(2000,0,1)+(rd-730120)*86400000}
const HDAY=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
function moladText(rd){
  const frac=((rd%1)+1)%1,parts=Math.round(frac*25920),dow=new Date(rdToMs(Math.floor(rd))).getUTCDay();
  const h=Math.floor(parts/1080),mi=Math.floor((parts%1080)/18),ch=parts%18;
  if(EN)return WEEKDAYS[dow]+' '+h+':'+String(mi).padStart(2,'0')+(ch?' and '+ch+' chalakim':'');
  return 'יום '+HDAY[dow]+' '+h+':'+String(mi).padStart(2,'0')+(ch?' ו־'+ch+' חלקים':'');
}
const DAF=[['ברכות',64],['שבת',157],['עירובין',105],['פסחים',121],['שקלים',22],['יומא',88],['סוכה',56],['ביצה',40],['ראש השנה',35],['תענית',31],['מגילה',32],['מועד קטן',29],['חגיגה',27],['יבמות',122],['כתובות',112],['נדרים',91],['נזיר',66],['סוטה',49],['גיטין',90],['קידושין',82],['בבא קמא',119],['בבא מציעא',119],['בבא בתרא',176],['סנהדרין',113],['מכות',24],['שבועות',49],['עבודה זרה',76],['הוריות',14],['זבחים',120],['מנחות',110],['חולין',142],['בכורות',61],['ערכין',34],['תמורה',34],['כריתות',28],['מעילה',37],['נדה',73]];
function dafYomi(d){
  const day=Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-Date.UTC(2020,0,5))/86400000);
  let n=((day%2711)+2711)%2711;
  for(const [t,pg] of DAF){if(n<pg-1){let daf=n+2,name=t;if(t==='מעילה'){name=daf<=22?'מעילה':daf<=25?'קינים':daf<=33?'תמיד':'מדות'}return name+' '+gem(daf).replace(/[׳״]/g,'')}n-=pg-1}
  return '';
}
let LEARN=null;function learnLib(){if(LEARN!==null)return LEARN;try{LEARN=window.hebcal__learning||false}catch(e){LEARN=false}return LEARN}
function mishnaYomi(d){
  const L=learnLib();if(!L||!L.MishnaYomiIndex)return '';
  try{if(!mishnaYomi.idx)mishnaYomi.idx=new L.MishnaYomiIndex();const r=mishnaYomi.idx.lookup(new HDate(d));
    const he=k=>{try{return stripNikud(window.hebcal.Locale.gettext(k,'he'))}catch(e){return k}};
    return r.map(x=>he(x.k)+' '+x.v).join(', ');}catch(e){return ''}
}
const NACH_HE={'Joshua':'יהושע','Judges':'שופטים','I Samuel':'שמואל א','II Samuel':'שמואל ב','I Kings':'מלכים א','II Kings':'מלכים ב','Isaiah':'ישעיהו','Jeremiah':'ירמיהו','Ezekiel':'יחזקאל','Hosea':'הושע','Joel':'יואל','Amos':'עמוס','Obadiah':'עובדיה','Jonah':'יונה','Micah':'מיכה','Nachum':'נחום','Nahum':'נחום','Habakkuk':'חבקוק','Zephaniah':'צפניה','Haggai':'חגי','Zechariah':'זכריה','Malachi':'מלאכי','Psalms':'תהלים','Proverbs':'משלי','Job':'איוב','Song of Songs':'שיר השירים','Ruth':'רות','Lamentations':'איכה','Ecclesiastes':'קהלת','Esther':'אסתר','Daniel':'דניאל','Ezra':'עזרא','Nehemiah':'נחמיה','I Chronicles':'דברי הימים א','II Chronicles':'דברי הימים ב'};
function nachYomi(d){
  const L=learnLib();if(!L||!L.NachYomiIndex)return '';
  try{if(!nachYomi.idx)nachYomi.idx=new L.NachYomiIndex();const r=nachYomi.idx.lookup(new HDate(d));
    let k=r.k||r.name;const hk=NACH_HE[String(k).replace(/^1 /,'I ').replace(/^2 /,'II ')];if(hk)k=hk;else{try{k=stripNikud(window.hebcal.Locale.gettext(k,'he'))}catch(e){}}return k+' '+gem(+r.v||+r.chap||0).replace(/[׳״]/g,'')}catch(e){return ''}
}
const LEARN_TYPES=[['daf','דף יומי: ','דף'],['mishna','משנה: ','משנה'],['nach','נ״ך: ','נ״ך'],['chumash','חומש: ','חומש'],['tehillim','תהלים: ','תהלים'],['tehillimW','תהלים (שבועי): ','תהלים'],['yerushalmi','ירושלמי: ','ירושלמי'],['rambam','רמב״ם: ','רמב״ם'],['cc','חפץ חיים: ','ח״ח'],['shl','שמירת הלשון: ','שה״ל'],['avot','פרקי אבות: ','אבות'],['dafw','דף שבועי: ','דף שבועי'],['rambam3','רמב״ם (3 פרקים): ','רמב״ם ג׳'],['smitzvot','ספר המצוות: ','סהמ״צ'],['kitzur','קיצור שו״ע: ','קיצור'],['ahs','ערוך השולחן: ','ערוה״ש'],['amud','עמוד יומי: ','עמוד']];
function heT(k){try{return stripNikud(window.hebcal.Locale.gettext(k,'he'))}catch(e){return k}}
function gemNum(x){x=String(x);return x.split(':').map(v=>/^\d+$/.test(v)?gem(+v).replace(/[׳״]/g,''):v).join(':')}
function evHe(ev){try{return stripNikud(ev.render(EN?'en':'he'))}catch(e){return ''}}
const LEARN_EXTRA={
  chumash(d){const hd=new HDate(d),H=window.hebcal;try{const sat=hd.onOrAfter(6),y=sat.getFullYear(),il=!!state.s.il;const key=y+'|'+il;LEARN_EXTRA._sed=LEARN_EXTRA._sed||{};const sed=LEARN_EXTRA._sed[key]||(LEARN_EXTRA._sed[key]=H.getSedra?H.getSedra(y,il):new H.Sedra(y,il));const r=sed.lookup(sat);if(!r||r.chag||!r.parsha)return '';const al=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שביעי'][d.getDay()];return r.parsha.map(heT).join('-')+', '+al}catch(e){return ''}},
  tehillim(d){const L=learnLib();if(!L||!L.dailyPsalms)return '';try{const r=L.dailyPsalms(new HDate(d));return r?gemNum(r[0])+'–'+gemNum(r[1]):''}catch(e){return ''}},
  tehillimW(d){return ['א–כט','ל–נ','נא–עב','עג–פט','צ–קו','קז–קיט','קכ–קנ'][d.getDay()]},
  yerushalmi(d){const L=learnLib();if(!L||!L.yerushalmiYomi||!L.vilna)return '';try{const r=L.yerushalmiYomi(new HDate(d),L.vilna);return r?heT(r.name)+' '+gemNum(r.blatt):''}catch(e){return ''}},
  rambam(d){const L=learnLib();if(!L||!L.dailyRambam1)return '';try{const hd=new HDate(d),r=L.dailyRambam1(hd);if(!r)return '';let s='';if(L.DailyRambamEvent)s=evHe(new L.DailyRambamEvent(hd,r));if(!s||/[A-Za-z]/.test(s))s=heT(r.name)+' '+gemNum(r.perek);return s.replace(/^רמב"?ם:?\s*/,'')}catch(e){return ''}},
  cc(d){const L=learnLib();if(!L||!L.chofetzChaim)return '';try{const hd=new HDate(d),r=L.chofetzChaim(hd);if(!r)return '';let s='';if(L.ChofetzChaimEvent)s=evHe(new L.ChofetzChaimEvent(hd,r));if(!s||/[A-Za-z]/.test(s))s=heT(r.k)+' '+gemNum(r.b)+(r.e&&r.e!==r.b?'–'+gemNum(r.e):'');return s.replace(/^חפץ חיים:?\s*/,'')}catch(e){return ''}},
  shl(d){const L=learnLib();if(!L||!L.shemiratHaLashon)return '';try{const hd=new HDate(d),r=L.shemiratHaLashon(hd);if(!r)return '';let s='';if(L.ShemiratHaLashonEvent)s=evHe(new L.ShemiratHaLashonEvent(hd,r));if(!s||/[A-Za-z]/.test(s))s=heT(r.k)+' '+gemNum(r.b)+(r.e&&r.e!==r.b?'–'+gemNum(r.e):'');return s.replace(/^שמירת הלשון:?\s*/,'')}catch(e){return ''}},
  avot(d){const L=learnLib();if(!L||!L.pirkeiAvot||d.getDay()!==6)return '';try{const r=L.pirkeiAvot(new HDate(d),!!state.s.il);return r&&r.length?'פרק '+r.map(gemNum).join('–'):''}catch(e){return ''}},
  dafw(d){const L=learnLib();if(!L||!L.dafWeekly)return '';try{const r=L.dafWeekly(new HDate(d));if(!r)return '';const n=r.getName?r.getName():r.name,b=r.getBlatt?r.getBlatt():r.blatt;return heT(n)+' '+gemNum(b)}catch(e){return ''}}
};
/* newer learning schedules, loaded on demand */
const L6URL={learn:'https://cdn.jsdelivr.net/npm/@hebcal/learning@6.10.0/+esm',dl:'https://cdn.jsdelivr.net/npm/@hebcal/core@6.9.2/dist/esm/DailyLearning/+esm',hd:'https://cdn.jsdelivr.net/npm/@hebcal/hdate@0.22.8/+esm'};
let L6=null,L6P=null;
function learn6(){if(L6!==null)return L6;if(!L6P)L6P=(async()=>{try{const [,dl,hm]=await Promise.all([import(L6URL.learn),import(L6URL.dl),import(L6URL.hd)]);L6={DL:dl.DailyLearning,HDate:hm.HDate}}catch(e){L6=false}rerender()})();return null}
const L6NAME={rambam3:'rambam3',smitzvot:'seferHaMitzvot',kitzur:'kitzurShulchanAruch',ahs:'arukhHaShulchanYomi',amud:'dirshuAmudYomi'};
const L6STRIP=/^(רמב"?ם|ספר המצוות|קיצור שולחן ערוך|קיצור שו"ע|ערוך השולחן יומי|ערוך השולחן|עמוד יומי|דרשו)[^:]*:\s*/;
for(const k in L6NAME)LEARN_EXTRA[k]=d=>{const L=learn6();if(!L)return '';try{const ev=L.DL.lookup(L6NAME[k],new L.HDate(d),!!state.s.il);if(!ev)return '';let s=stripNikud(ev.render('he'));if(/[A-Za-z]{3}/.test(s)&&ev.renderBrief)s=stripNikud(ev.renderBrief('he'));return s.replace(L6STRIP,'')}catch(e){return ''}};
function addHebrewExtras(map,start,end){
  const s=state.s,M=s.moon||{},tz=place().tz;
  const put=(d,item)=>{const k=ymd(d);if(!map.has(k))map.set(k,[]);map.get(k).push(item)};
  const local=ms=>{const dt=new Date(ms);let y,mo,da;try{const f=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(dt).split('-');y=+f[0];mo=+f[1];da=+f[2]}catch(e){y=dt.getFullYear();mo=dt.getMonth()+1;da=dt.getDate()}return new Date(y,mo-1,da,12)};
  const inRange=d=>d>=new Date(start.getFullYear(),start.getMonth(),start.getDate())&&d<=new Date(end.getFullYear(),end.getMonth(),end.getDate(),23);
  /* מעבר לשעון קיץ / חורף לפי אזור הזמן של המקום */
  if(s.showDst!==false&&tz&&dstMode()==='custom'){
    const c=dstCfg(),fm=m=>Math.floor(m/60)+':'+String(m%60).padStart(2,'0');
    for(let y=start.getFullYear();y<=end.getFullYear();y++){
      const a=new Date(y,c.sm-1,c.sd,12),b=new Date(y,c.em-1,c.ed,12);
      if(inRange(a))put(a,{cls:'dst',text:'שעון קיץ: ב־'+fm(hm(c.st))+' מקדימים ל־'+fm(hm(c.st)+60),order:2});
      if(inRange(b))put(b,{cls:'dst',text:'שעון חורף: ב־'+fm(hm(c.et))+' מחזירים ל־'+fm(hm(c.et)-60),order:2});
    }
  }
  if(s.showDst!==false&&tz&&dstMode()==='auto'){
    const off=ms=>{try{const p={};new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date(ms)).forEach(x=>p[x.type]=x.value);return Math.round((Date.UTC(+p.year,+p.month-1,+p.day,+p.hour%24,+p.minute,+p.second)-ms)/60000)}catch(e){return 0}};
    const wall=(T,o)=>{const d=new Date(T+o*60000);return d.getUTCHours()+':'+String(d.getUTCMinutes()).padStart(2,'0')};
    let prev=Date.UTC(start.getFullYear(),start.getMonth(),start.getDate()-1,12),po=off(prev);
    for(let d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d<=end;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12)){
      const cur=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),12),co=off(cur);
      if(co!==po){
        let lo=prev,hi=cur;while(hi-lo>60000){const mid=Math.floor((lo+hi)/2);if(off(mid)===po)lo=mid;else hi=mid}
        const T=Math.round(hi/60000)*60000,from=wall(T,po),to=wall(T,co),fwd=co>po;
        const day=local(T);
        if(inRange(day))put(day,{cls:'dst',text:(fwd?'שעון קיץ: ב־'+from+' מקדימים ל־'+to:'שעון חורף: ב־'+from+' מחזירים ל־'+to),order:2});
        po=co;
      }
      prev=cur;
    }
  }
  const tm=ms=>fmtTime(new Date(ms),'near',tz);
  if(M.molad!==false||M.kl||M.klEnd){
    const y0=new HDate(start).getFullYear()-1,y1=new HDate(end).getFullYear()+1;
    for(let y=y0;y<=y1;y++){
      const months=isLeap(y)?[1,2,3,4,5,6,7,8,9,10,11,12,13]:[1,2,3,4,5,6,7,8,9,10,11,12];
      for(const m of months){
        const rd=moladRD(y,m),ms=rdToMs(rd)-JMT_MS;
        if(M.molad!==false&&m!==7){
          const prevM=m===1?(isLeap(y)?13:12):m===7?6:m-1,prevY=m===7?y-1:y;
          let f=new HDate(1,m,y).greg();f=new Date(f.getFullYear(),f.getMonth(),f.getDate(),12);
          let plen=30;try{plen=HDate.daysInMonth(prevM,prevY)}catch(e){}
          if(plen===30)f=new Date(f.getFullYear(),f.getMonth(),f.getDate()-1,12);
          const back=((f.getDay()+1)%7)||7,sat=new Date(f.getFullYear(),f.getMonth(),f.getDate()-back,12);
          if(inRange(sat))put(sat,{cls:'moon',text:'המולד: '+moladText(rd),order:3});
        }
        const add=(off,label)=>{const t=ms+off;const d=local(t);if(inRange(d))put(d,{cls:'moon',text:label+' '+tm(t),order:6})};
        const kl=M.kl||'none',ke=M.klEnd||'none';
        if(kl==='ash'||kl==='both')add(3*86400000,'מתחילים קידוש לבנה'+(kl==='both'?' (אשכנז)':''));
        if(kl==='sef'||kl==='both')add(7*86400000,'מתחילים קידוש לבנה'+(kl==='both'?' (ספרד)':''));
        if(ke==='rema'||ke==='both')add((14*24+18)*3600000+22*60000+1667,'סוף זמן קידוש לבנה'+(ke==='both'?' (רמ״א)':''));
        if(ke==='by'||ke==='both')add(15*86400000,'סוף זמן קידוש לבנה'+(ke==='both'?' (שו״ע)':''));
      }
    }
  }
  const TAL=M.tal!==false;
  if(M.tekufa||TAL){
    const anchor=Date.UTC(2009,3,7,18)-JMT_MS,step=91.3125*86400000,names=['ניסן','תמוז','תשרי','טבת'];
    const k0=Math.floor((start-anchor)/step)-1,k1=Math.ceil((end-anchor)/step)+1;
    for(let k=k0;k<=k1;k++){
      const t=anchor+k*step,d=local(t),nm=names[((k%4)+4)%4];
      if(M.tekufa&&inRange(d))put(d,{cls:'moon',text:'תקופת '+nm+' '+tm(t),order:6});
      if(TAL&&nm==='תשרי'){const jh=new Date(t+JMT_MS).getUTCHours(),jd=new Date(t+JMT_MS);const dd=new Date(jd.getUTCFullYear(),jd.getUTCMonth(),jd.getUTCDate()+58+(jh>=18?1:0),12);if(inRange(dd))put(dd,{cls:'moon',text:(s.il?'בחו״ל: ':'')+'בערבית מתחילים ״ותן טל ומטר״',order:4})}
    }
  }
  if(TAL&&s.il){
    const y0=new HDate(start).getFullYear(),y1=new HDate(end).getFullYear();
    for(let y=y0;y<=y1;y++){let d=new HDate(7,8,y).greg();d=new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);if(inRange(d))put(d,{cls:'moon',text:'מתחילים ״ותן טל ומטר״ (מערבית אמש)',order:4})}
  }
  /* תזכורות שקל לשכוח. מופיעות כברירת מחדל (חוץ מיום כיפור קטן), ואפשר לכבות כל אחת */
  {const on=k=>M[k]!==false,y0=new HDate(start).getFullYear()-1,y1=new HDate(end).getFullYear()+1;
    const at=hd=>{const d=hd.greg();return new Date(d.getFullYear(),d.getMonth(),d.getDate(),12)},add=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n,12);
    const P=(d,text,order)=>{if(inRange(d))put(d,{cls:'moon',text,order:order||4})};
    for(let y=y0;y<=y1;y++){
      if(on('geshem')){P(at(new HDate(22,7,y)),'במוסף מתחילים ״משיב הרוח ומוריד הגשם״');P(at(new HDate(15,1,y)),'במוסף מפסיקים ״משיב הרוח״'+(s.il?', ומערבית ״ותן ברכה״':''))}
      if(on('behab'))for(const m of [8,2]){const d1=at(new HDate(1,m,y)),sh=add(d1,(6-d1.getDay()+7)%7);P(sh,'מברכים את הצמים בה״ב',6);P(add(sh,2),'תענית בה״ב (שני)',3);P(add(sh,5),'תענית בה״ב (חמישי)',3);P(add(sh,9),'תענית בה״ב (שני בתרא)',3)}
      if(on('eruv'))for(const [m,dd,two] of [[7,1,1],[7,15,0],[7,22,0],[1,15,0],[1,21,0],[3,6,0]]){const st=at(new HDate(dd,m,y)),len=two||!s.il?2:1;let fri=false;for(let i=0;i<len;i++)if(add(st,i).getDay()===5)fri=true;if(fri)P(add(st,-1),'עירוב תבשילין',3)}
      if(on('ilanot'))P(at(new HDate(1,1,y)),'מתחילים ברכת האילנות (כל ניסן)',6);
      /* ערב ראש חודש; לא לפני תשרי, חשוון, טבת ואייר. שישי או שבת: מקדימים לחמישי */
      if(M.ykk)for(const m of [9,11,12,13,1,3,4,5,6]){if(m===13&&!isLeap(y))continue;let d=add(at(new HDate(1,m,y)),-1);
        if(d.getDay()===5||d.getDay()===6)d=add(d,d.getDay()===5?-1:-2);P(d,'יום כיפור קטן',6)}
    }
  }
  const Ln=s.learn||{};
  if(LEARN_TYPES.some(x=>Ln[x[0]])){
    for(let d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d<=end;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12)){
      const parts=[];
      if(Ln.daf){const x=dafYomi(d);if(x)parts.push('דף יומי: '+x)}
      if(Ln.mishna){const x=mishnaYomi(d);if(x)parts.push('משנה: '+x)}
      if(Ln.nach){const x=nachYomi(d);if(x)parts.push('נ״ך: '+x)}
      for(const [k,pre] of LEARN_TYPES.slice(3))if(Ln[k]){const x=LEARN_EXTRA[k](d);if(x)parts.push(pre+x)}
      for(const t of parts)put(d,{cls:'learn',text:t,order:7,learn:true});
    }
  }
}
function eventsFor(start,end){
  const s=state.s,loc=location(),tz=place().tz;
  const opts={start,end,location:loc,candlelighting:true,candleLightingMins:+s.candleMins,il:!!s.il,sedrot:!!s.showParasha,
    noModern:!s.showModern,noMinorFast:!s.showFasts,noRoshChodesh:!s.showRC,noSpecialShabbat:!s.showSpecial,
    shabbatMevarchim:!!s.showMevarchim,omer:!!s.showOmer,useElevation:false,locale:'he'};
  opts.havdalahDeg=8.5;
  let evs=[];try{evs=HebrewCalendar.calendar(opts)}catch(e){console.error(e)}
  const map=new Map();
  for(const ev of evs){
    const f=ev.getFlags(),desc=ev.getDesc();let item;
    /* זמני חמץ ונרות חנוכה מחושבים אצלנו לפי ההגדרות, ולכן לא לוקחים את השעה מהספרייה */
    if(/chametz/i.test(desc))continue;
    if(ev.eventTime instanceof Date&&/^Chanukah/.test(desc)){if(!s.showHolidays)continue;const k0=ymd(ev.getDate().greg());if(!map.has(k0))map.set(k0,[]);map.get(k0).push({cls:'',text:hebText(ev).replace(/[:\s]*\d{1,2}:\d{2}.*/,''),order:2});continue}
    if(ev.eventTime instanceof Date){
      const lbl=desc.startsWith('Candle')?'הדלקת נרות':desc.startsWith('Havdalah')?(ev.getDate().greg().getDay()===6?'צאת השבת':'צאת החג'):desc.startsWith('Fast begins')?'תחילת הצום':desc.startsWith('Fast ends')?'סוף הצום':hebText(ev).replace(/[:\s]*\d{1,2}:\d{2}.*/,'');
      const dir=desc.startsWith('Candle')||desc.startsWith('Fast begins')?'down':'up';
      const gd=ev.getDate().greg(),Zd=zctx(new Date(gd.getFullYear(),gd.getMonth(),gd.getDate(),12));let tt=ev.eventTime;
      if(desc.startsWith('Candle'))tt=(f&flags.LIGHT_CANDLES_TZEIS)?Zd.motzash:(Zd.sunset?new Date(Zd.sunset.getTime()-(+s.candleMins)*60000):tt);
      else if(desc.startsWith('Havdalah'))tt=Zd.motzash;
      else if(desc.startsWith('Fast ends'))tt=Zd.fastEnd;
      else if(desc.startsWith('Fast begins')){let hr=12;try{hr=+new Intl.DateTimeFormat('en-US',{hour:'numeric',hourCycle:'h23',timeZone:tz}).format(ev.eventTime)}catch(e){}tt=hr>=12?Zd.sunset:Zd.fastStart}
      tt=tt||ev.eventTime;
      const sk=desc.startsWith('Candle')?'candle':desc.startsWith('Havdalah')?'motzash':desc.startsWith('Fast begins')?'fastStart':desc.startsWith('Fast ends')?'fastEnd':'';
      const dd=zdir(sk,dir);
      if(s.noTimes||(s.noShabTimes&&(sk==='candle'||sk==='motzash')))continue;
      const xt=xTimes(gd,sk,dd,!!(f&flags.LIGHT_CANDLES_TZEIS));
      item={cls:'timed',text:lbl+' '+fmtTime(tt,dd,tz,sk)+xt,order:5,
        tkind:desc.startsWith('Candle')?'candle':desc.startsWith('Havdalah')?'havdalah':'',time:fmtTime(tt,dd,tz,sk)};
    }else if(f&flags.PARSHA_HASHAVUA){item={cls:'parasha',text:hebText(ev),order:1}}
    else{
      if(!s.showHolidays&&!(f&(flags.ROSH_CHODESH|flags.SPECIAL_SHABBAT|flags.MODERN_HOLIDAY|flags.SHABBAT_MEVARCHIM|flags.OMER_COUNT|flags.MINOR_FAST)))continue;
      const chag=!!(f&flags.CHAG);item={cls:chag?'chag':'',text:hebText(ev),order:chag?0:2,chag};
    }
    const k=ymd(ev.getDate().greg());
    if(!map.has(k))map.set(k,[]);map.get(k).push(item);
  }
  /* יום טוב שני של גלויות: בלוח לארץ ישראל, כהערה לבני חו״ל ששוהים בארץ */
  const yts=s.ytsg||'faint';
  if(s.il&&s.showHolidays&&yts!=='none'){
    const YTSG={'7-16':'סוכות ב׳','7-23':'שמחת תורה','1-16':'פסח ב׳','1-22':'אחרון של פסח','3-7':'שבועות ב׳'};
    for(let d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d<=end;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12)){
      const hd=new HDate(d),nm=YTSG[hd.getMonth()+'-'+hd.getDate()];if(!nm)continue;
      const k=ymd(d);if(!map.has(k))map.set(k,[]);
      map.get(k).push(yts==='normal'?{cls:'chag',text:'יו״ט שני של גלויות ('+nm+')',order:0}:{cls:'ytsg',text:'יו״ט שני של גלויות ('+nm+')',order:3});
    }
  }
  /* אסרו חג: היום שאחרי סוכות, פסח ושבועות (בחו״ל יום אחד מאוחר יותר) */
  if(s.showHolidays&&s.showIsru!==false){
    const ISRU=s.il?{'7-23':1,'1-22':1,'3-7':1}:{'7-24':1,'1-23':1,'3-8':1};
    for(let d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d<=end;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12)){
      const hd=new HDate(d);if(!ISRU[hd.getMonth()+'-'+hd.getDate()])continue;
      const k=ymd(d);if(!map.has(k))map.set(k,[]);map.get(k).push({cls:'',text:'אסרו חג',order:2});
    }
  }
  const putX=(d,item)=>{const k=ymd(d);if(!map.has(k))map.set(k,[]);map.get(k).push(item)};
  const eachDay=fn=>{for(let d=new Date(start.getFullYear(),start.getMonth(),start.getDate(),12);d<=end;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12))fn(d,new HDate(d))};
  /* ערב פסח: סוף זמן אכילת חמץ (4 שעות) וביעור חמץ (5 שעות), לפי השיטה שנבחרה לק״ש */
  if(s.showChametz!==false)eachDay((d,hd)=>{
    if(hd.getMonth()!==1||hd.getDate()!==14)return;
    const Z=zctx(d),md=s.m_shma||'gra',dir=zdir('chametz','down');
    const t=(g,m)=>md==='both'?'מג״א '+fmtTime(m,dir,tz,'chametz')+' · גר״א '+fmtTime(g,dir,tz,'chametz'):fmtTime(md==='mga'?m:g,dir,tz,'chametz');
    putX(d,{cls:'timed',text:'סוף אכילת חמץ '+t(Z.chametzEatGRA,Z.chametzEatMGA),order:4});
    putX(d,{cls:'timed',text:'סוף ביעור חמץ '+t(Z.chametzBurnGRA,Z.chametzBurnMGA),order:4});
  });
  /* נרות חנוכה: 8 לילות, מערב כ״ה כסלו */
  const ch=s.chanukah||'tzeit';
  if(ch!=='none'&&!s.noTimes)eachDay((d,hd)=>{
    const k0=new HDate(24,9,hd.getFullYear()).abs(),n=hd.abs()-k0+1;
    if(n<1||n>8)return;
    const nm='נר '+gem(n)+' דחנוכה',dow=d.getDay(),Z=zctx(d);
    if(dow===5){putX(d,{cls:'timed',text:'נרות חנוכה: לפני הדלקת נרות שבת',order:5});return}
    if(dow===6){putX(d,{cls:'timed',text:'נרות חנוכה: אחרי צאת השבת',order:5});return}
    const tt=ch==='sunset'?Z.sunset:Z.tzeit;
    putX(d,{cls:'timed',text:'הדלקת נרות חנוכה '+fmtTime(tt,zdir('chanukah','up'),tz,'chanukah'),order:5});
  });
  /* ניטל: מהשקיעה (או מצאת הכוכבים) עד חצות הלילה, בליל 24 בדצמבר ו/או בליל 6 בינואר */
  const nt=s.nital||'none';
  if(nt!=='none')eachDay(d=>{const m=d.getMonth(),dd=d.getDate();
    if(!((nt!=='jan'&&m===11&&dd===24)||(nt!=='dec'&&m===0&&dd===6)))return;
    const Z=zctx(d),from=s.nitalFrom==='tzeit'?Z.tzeit:Z.sunset;
    putX(d,{cls:'timed nital',text:'ניטל: מ'+(s.nitalFrom==='tzeit'?'צאה״כ ':'השקיעה ')+fmtTime(from,'down',tz,'nital')+' עד חצות הלילה '+fmtTime(Z.chatzotNight,'up',tz,'nital'),order:5});
  });
  /* זמני תפילות בבית הכנסת (מסלול מלא) */
  const TF=(s.tfilot||[]).filter(t=>t.name&&t.on!==false);
  if(TF.length&&canF('tfilot'))eachDay((d,hd)=>{
    const items=map.get(ymd(d))||[],chag=items.some(i=>i.chag);
    const out=TF.filter(t=>tfilaDay(t,d,chag)).map(t=>{const v=tfilaTime(t,d);return v?t.name+' '+v:''}).filter(Boolean);
    if(out.length)putX(d,{cls:'tfila',text:out.join(' · '),order:6});
  });
  addHebrewExtras(map,start,end);
  return map;
}
const TF_BASES=[['sunrise','הנץ'],['sunset','השקיעה'],['candle','הדלקת הנרות'],['motzash','צאת השבת'],['tzeit','צאת הכוכבים'],['plag','פלג המנחה'],['minchaK','מנחה קטנה'],['minchaG','מנחה גדולה'],['chatzot','חצות היום'],['alot','עלות השחר']];
const TF_DAYS=[['all','כל יום'],['weekday','ימי חול (א׳–ו׳)'],['sunThu','א׳–ה׳'],['friday','יום שישי'],['shabbat','שבת'],['shabbatChag','שבת וחג'],['chag','חג']];
function tfilaDay(t,d,chag){const w=d.getDay();switch(t.days||'all'){
  case 'weekday':return w<6&&!chag;case 'sunThu':return w<5&&!chag;case 'friday':return w===5&&!chag;
  case 'shabbat':return w===6;case 'shabbatChag':return w===6||chag;case 'chag':return chag;default:return true}}
function tfilaTime(t,d){
  if(t.mode!=='rel')return t.time||'';
  const Z=zctx(d),tz=place().tz;let b=t.base==='candle'?(Z.sunset?new Date(Z.sunset.getTime()-(+state.s.candleMins||0)*60000):null):Z[t.base||'sunset'];
  if(!(b instanceof Date))return '';
  const step=(+t.round||1)*60000,ms=b.getTime()+(+t.off||0)*60000*(t.dir==='before'?-1:1);
  const r=t.rdir==='up'?Math.ceil(ms/step)*step:t.rdir==='near'?Math.round(ms/step)*step:Math.floor(ms/step)*step;
  return fmtTime(new Date(r),'down',tz,'tfila');
}
/* ימים שיש בהם תפילת מוסף: שבת, ראש חודש, ראש השנה, יום כיפור, סוכות ושמיני עצרת, פסח ושבועות (כולל חול המועד ויום טוב שני בחו״ל) */
function isMusafDay(date){
  if(date.getDay()===6)return true;
  const hd=new HDate(date),m=hd.getMonth(),d=hd.getDate(),il=!!state.s.il;
  if(d===1||d===30)return true;
  if(m===7)return d===2||d===10||(d>=15&&d<=(il?22:23));
  if(m===1)return d>=15&&d<=(il?21:22);
  if(m===3)return d===6||(!il&&d===7);
  return false;
}
/* all=true: לטבלאות, מחזיר את כל העמודות ותא ריק ביום שאין בו מוסף, כדי שהעמודות לא יזוזו */
function zmanimFor(date,all){
  const s=state.s,keys=ZMANIM.filter(z=>s.zmanim[z[0]]);if(!keys.length)return [];
  const Z=zctx(date),tz=place().tz,out=[];
  for(const [k,,short0,dir0] of keys){
    const short=(s.zlab||{})[k]||short0,rd=(s.zround||{})[k],dir=rd&&rd!=='auto'?rd:dir0;
    if(k==='hour'){out.push({k:short,v:isFinite(Z.hourGRA)?Math.round(Z.hourGRA/60000)+' דק׳':'—',key:k});continue}
    if(k==='musaf'&&!isMusafDay(date)){if(all)out.push({k:short,v:'',key:k});continue}
    if(k==='shma'||k==='tfila'){
      const g=k==='shma'?Z.shmaGRA:Z.tfilaGRA,m=k==='shma'?Z.shmaMGA:Z.tfilaMGA,md=(s.zmode||{})[k]||s.m_shma;
      if(md==='both'){out.push({k:short+(EN?' MGA':' מג״א'),v:fmtTime(m,dir,tz,k),key:k});out.push({k:short+(EN?' GRA':' גר״א'),v:fmtTime(g,dir,tz,k),key:k})}
      else out.push({k:short,v:fmtTime(md==='mga'?m:g,dir,tz,k),key:k});
      continue;
    }
    out.push({k:short,v:fmtTime(Z[k],dir,tz,k),key:k});
  }
  const B=s.zbold||{};for(const o of out)if(B[o.key])o.b=true;
  return out;
}
/* זמנים לעוד ערים (למשפחה שגרה בכמה ערים): state.s.xlocs=[{id}|{custom:{name,lat,lng,el,tz,il,candle}}, short] */
const xlocsOn=()=>state.s.noTimes?[]:(state.s.xlocs||[]).filter(x=>xPlace(x));
function xPlace(x){return x&&(x.custom||CITIES.find(c=>c.id===x.id))||null}
const XABBR={'ירושלים':'י־ם','בני ברק':'ב״ב','תל אביב':'ת״א','פתח תקווה':'פ״ת','בית שמש':'ב״ש','ראשון לציון':'ראשל״צ','באר שבע':'ב״ש','קריית גת':'ק״ג','רמת גן':'ר״ג','מודיעין עילית':'מודיעין עי׳'};
function xName(x){const p=xPlace(x),n=(p&&p.name)||'';return (x.short||XABBR[n]||n).trim()}
function withPlace(p,fn){const o=XP;XP=p;try{return fn()}finally{XP=o}}
function zWithX(d,zs){const X=xlocsOn();if(!X.length)return zs.map(zTxt);
  const per=X.map(x=>withPlace(xPlace(x),()=>zmanimFor(d)));
  return zs.map(z=>{let t=zTxt(z);per.forEach((L,i)=>{const m=L.find(o=>o.key===z.key&&o.k===z.k);if(m&&m.v)t+=(i?' · ':'<br>')+'<span class="zx">'+esc(xName(X[i]))+' '+esc(m.v)+'</span>'});return t})}
function xTimes(gd,sk,dd,tzeis){const X=xlocsOn();if(!X.length||!(sk==='candle'||sk==='motzash'||sk==='fastStart'||sk==='fastEnd'))return '';
  const d=new Date(gd.getFullYear(),gd.getMonth(),gd.getDate(),12);
  return X.map(x=>{const p=xPlace(x);return withPlace(p,()=>{const Z=zctx(d);let tt=null;
    if(sk==='candle'){const cm=x.custom?(+x.custom.candle||(p.il?30:18)):(+p.candle||30);tt=tzeis?Z.motzash:(Z.sunset?new Date(Z.sunset.getTime()-cm*60000):null)}
    else if(sk==='motzash')tt=Z.motzash;else if(sk==='fastEnd')tt=Z.fastEnd;else tt=Z.fastStart;
    return tt?xName(x)+' '+fmtTime(tt,dd,p.tz,sk):''})}).filter(Boolean).join(' · ').replace(/^(.)/,'\n$1')}
const zTxt=z=>z.b?'<b class="zb">'+esc(z.k+' '+z.v)+'</b>':esc(z.k+' '+z.v);
function monthMatches(em,hm,leap){if(em===13)return leap?hm===13:hm===12;return em===hm}
function eventHits(e,date,hd){
  if(e.rec==='once')return e.date===iso(date);
  if(e.rec==='greg')return date.getDate()===+e.day&&date.getMonth()+1===+e.month;
  const len=HDate.daysInMonth(hd.getMonth(),hd.getFullYear()),day=(+e.day===30&&len===29)?29:+e.day;
  return monthMatches(+e.month,hd.getMonth(),isLeap(hd.getFullYear()))&&hd.getDate()===day;
}
/* איך נכתב יום שנה בלוח: למשפחה ולצדיקים, לפי בחירה */
const PERS_P={yaz:'יא״צ ',ys:'יום השנה ל',yosh:'יו״ש ',azk:'אזכרה ל'},YZ_P={yaz:'יא״צ ',hil:'הילולת ',yoma:'יומא דהילולא ',yod:'יו״ד ',none:''};
const persP=()=>PERS_P[state.s.persPrefix]??'יא״צ ';
const yzP=()=>YZ_P[state.s.yzPrefix]??'יא״צ ';
const stripYP=t=>{t=String(t);const p=yzP();return p&&t.startsWith(p)?t.slice(p.length):t};
function eventLabel(e,date,hd){
  if(EN)return eventLabelEn(e,date,hd);
  let n='';
  if(e.year&&e.rec!=='once'){n=e.rec==='heb'?hd.getFullYear()-e.year:date.getFullYear()-e.year;if(!(n>0&&n<200))n=''}
  const name=e.name||'';
  switch(e.kind){
    case 'birthday':if(e.bm&&n===(e.bm==='bat'?12:13))return (e.bm==='bat'?'בת מצווה ל':'בר מצווה ל')+name;return 'יום הולדת ל'+name+(n?' ('+n+')':'');
    case 'anniversary':return 'יום נישואין ל'+name+(n?' ('+n+')':'');
    case 'yahrzeit':return persP()+name;
    case 'reminder':return 'תזכורת: '+name;
    default:return name;
  }
}
function eventLabelEn(e,date,hd){
  let n='';if(e.year&&e.rec!=='once'){n=e.rec==='heb'?hd.getFullYear()-e.year:date.getFullYear()-e.year;if(!(n>0&&n<200))n=''}
  const name=e.name||'',pos=name+(/s$/i.test(name)?'’':'’s');
  switch(e.kind){case 'birthday':if(e.bm&&n===(e.bm==='bat'?12:13))return pos+(e.bm==='bat'?' Bat Mitzvah':' Bar Mitzvah');return pos+' birthday'+(n?' ('+n+')':'');
    case 'anniversary':return pos+' anniversary'+(n?' ('+n+')':'');case 'yahrzeit':return 'Yahrzeit: '+name;case 'reminder':return 'Reminder: '+name;default:return name}}
function eventsOn(date,hd){return state.events.filter(e=>eventHits(e,date,hd))}
let YZI=null,YZA=null;
function yzInvalidate(){YZI=null;YZA=null}
function yzAll(){
  if(YZA)return YZA;const ed=state.yzEdit||{};
  YZA=YZ.map((e,i)=>{const o=ed[i],src=e[5]?'db':'itim';return o?{id:String(i),m:+o.m,d:+o.d,y:o.y||'',t:o.t,p:o.p?1:0,edited:1,src}:{id:String(i),m:e[0],d:e[1],y:e[2],t:e[3],p:e[4],src}}).filter(e=>e.t)
    .concat((state.yzCustom||[]).map(c=>({...c,m:+c.m,d:+c.d,custom:1})));
  YZA.forEach(e=>e.yn=yzYearNum(e.y));
  return YZA;
}
const GVAL={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
function yzYearNum(y){
  y=String(y||'').replace(/\s*\(.\)/g,'').replace(/[\d\s]+$/,'').replace(/ליצירה/,'').replace(/["״]/g,'').trim();
  if(!y)return NaN;
  const m=y.match(/^([א-ת])['׳](.*)$/);
  const sum=t=>[...t].reduce((a,c)=>a+(GVAL[c]||0),0);
  if(m){const rest=sum(m[2].replace(/['׳]/g,''));return rest?GVAL[m[1]]*1000+rest:GVAL[m[1]]}
  const v=sum(y.replace(/['׳]/g,''));return v?5000+v:NaN;
}
const YZ_ERAS=[['all','כל התקופות'],['tanach','ימי התנ״ך (עד שנת ג׳ת״ס)',0,3460],['bayit2','בית שני וחז״ל (ג׳ת״ס–ד׳ת״ק)',3460,4500],['geonim','הגאונים (ד׳ת״ק–ד׳תש״ס)',4500,4800],['rishonim','הראשונים (ד׳תש״ס–ה׳ר״ס)',4800,5260],['acharonim','האחרונים (ה׳ר״ס–ה׳ת״ר)',5260,5600],['last','הדורות האחרונים (מה׳ת״ר)',5600,9999]];
function yzById(id){return yzAll().find(e=>e.id===String(id))}
function yzIndex(){if(YZI)return YZI;YZI=new Map();yzAll().forEach(e=>{const k=e.m*100+e.d;if(!YZI.has(k))YZI.set(k,[]);YZI.get(k).push(e)});return YZI}
function yzOn(hd){
  const I=yzIndex(),m=hd.getMonth(),d=hd.getDate(),y=hd.getFullYear(),leap=isLeap(y);
  let L=(I.get(m*100+d)||[]).slice();
  if(!leap&&m===12)L=L.concat(I.get(1300+d)||[]);
  if(d===29&&HDate.daysInMonth(m,y)===29){L=L.concat(I.get(m*100+30)||[]);if(!leap&&m===12)L=L.concat(I.get(1330)||[])}
  const seen=new Set();return L.filter(e=>{if(seen.has(e.t))return false;seen.add(e.t);return true});
}
function yzDefaultSel(){const o={};YZ_DEFAULT_SEL.forEach(i=>o[i]=1);return o}
function yzLists(){
  const s=state.s;
  if(!Array.isArray(s.yzLists)||!s.yzLists.length){s.yzLists=[{id:'l'+uid(),name:'הרשימה שלי',sel:s.yzSel||yzDefaultSel()}];s.yzListId=s.yzLists[0].id}
  if(!s.yzLists.find(l=>l.id===s.yzListId))s.yzListId=s.yzLists[0].id;
  return s.yzLists;
}
function yzActiveList(){return yzLists().find(l=>l.id===state.s.yzListId)}
function yzSel(){const l=yzActiveList();if(!l.sel)l.sel={};return l.sel}
function yzListOptions(){return yzLists().map(l=>opt(l.id,l.name+' ('+Object.values(l.sel||{}).filter(Boolean).length+')',l.id===state.s.yzListId)).join('')}
function openYzLists(after){
  const m=modal('<h3>הרשימות שלי<small>כל רשימה שומרת קבוצה משלה של אירועים מסומנים. בלוח מוצגת הרשימה הפעילה.</small></h3><div class="listbox" id="ylBox"></div>'+
    '<h4 style="margin:6px 0 0">רשימה חדשה</h4><div class="row"><label class="fld">שם<input id="ylName" placeholder="למשל: גדולי חסידות"></label>'+
    '<label class="fld">להתחיל מ<select id="ylFrom"><option value="empty">רשימה ריקה</option><option value="rec">הרשימה המומלצת</option><option value="copy">העתק של הרשימה הפעילה</option></select></label>'+
    '<button class="btn primary small" type="button" id="ylAdd">יצירה</button></div><p class="hint" id="ylMsg"></p>'+
    '<div class="row"><button class="btn" type="button" data-close>סגירה</button></div>');
  const q=x=>m.querySelector(x);
  const draw=()=>{const L=yzLists();q('#ylBox').innerHTML=L.map(l=>'<div class="ev-item"><input type="radio" name="ylAct" value="'+l.id+'"'+(l.id===state.s.yzListId?' checked':'')+' aria-label="רשימה פעילה"><input class="zs-in" style="flex:1" data-ylname="'+l.id+'" value="'+esc(l.name)+'"><span class="tag">'+Object.values(l.sel||{}).filter(Boolean).length+'</span><button class="btn small" type="button" data-yldup="'+l.id+'">שכפול</button>'+(L.length>1?'<button class="x" type="button" data-yldel="'+l.id+'" aria-label="מחיקה">×</button>':'')+'</div>').join('')};
  const done=()=>{save();syncUI();rerender();draw();if(after)after()};
  m.addEventListener('change',e=>{const t=e.target;if(t.name==='ylAct'){state.s.yzListId=t.value;done()}});
  m.addEventListener('input',e=>{const t=e.target;if(t.dataset.ylname){const l=yzLists().find(x=>x.id===t.dataset.ylname);l.name=t.value.trim()||'רשימה';save();renderYz()}});
  m.addEventListener('click',e=>{const t=e.target;
    if(t.dataset.yldup){const l=yzLists().find(x=>x.id===t.dataset.yldup);const n={id:'l'+uid(),name:l.name+' (העתק)',sel:{...l.sel}};state.s.yzLists.push(n);done()}
    if(t.dataset.yldel){const id=t.dataset.yldel,row=t.closest('.ev-item');if(!row.dataset.confirm){row.dataset.confirm=1;t.textContent='למחוק?';t.style.color='var(--danger)';return}state.s.yzLists=yzLists().filter(x=>x.id!==id);done()}
  });
  q('#ylAdd').onclick=()=>{const name=q('#ylName').value.trim();if(!name){q('#ylMsg').innerHTML='<span class="msg-bad">תנו שם לרשימה.</span>';q('#ylName').focus();return}
    const f=q('#ylFrom').value,sel=f==='rec'?yzDefaultSel():f==='copy'?{...yzSel()}:{};
    const n={id:'l'+uid(),name,sel};yzLists().push(n);state.s.yzListId=n.id;q('#ylName').value='';q('#ylMsg').innerHTML='<span class="msg-ok">הרשימה "'+esc(name)+'" נוצרה והיא עכשיו הפעילה.</span>';done()};
  draw();
}
function yzSrcOn(e){return true}
function yzVisible(e){const s=state.s,mode=s.yzMode||'selected';if(mode==='none')return false;if(mode==='all')return yzSrcOn(e)&&!(s.yzHide||{})[e.id];return !!yzSel()[e.id]}
function yzSetVisible(id,on){
  const s=state.s;id=String(id);
  if((s.yzMode||'selected')==='all'){s.yzHide=s.yzHide||{};if(on)delete s.yzHide[id];else s.yzHide[id]=1}
  else{const sel=yzSel();if(on)sel[id]=1;else delete sel[id]}
}
function yzText(e,full){
  const {y,t,p}=e;
  if(full)return (y?y+': ':'')+t;
  if(e.src==='db'){
    if(!p){const c=t.split(/,|\(|\[|\. /)[0].trim();return c.length>70?c.slice(0,68)+'…':c}
    let n=t.replace(/^(נפ'|נעקה"ש|שנה לפטי')\s*/,'').replace(/^(ה?גה?[מקצ]?"ר|ההק"ר|ההצ"ר|הגהק"ר|הגהצ"ר|הג"ר|הגאון)\s+/,"ר' ").replace(/\s*\([^)]*\)\s*/g,' ');
    n=n.split(/,| ב' | זצ"ל| זלה"ה| הי"ד/)[0].trim();
    const nick=(t.match(/,\s*(ה[א-ת"']+(?: [א-ת"']+)?)\s*(?:זצ"ל|,|$)/)||[])[1];
    return yzP()+n+(nick&&nick.length<26?', '+nick:'');
  }
  if(!p){const c=t.split(/,|\(|\[/)[0].trim();return c.length>70?c.slice(0,68)+'…':c}
  const seg=t.split(', ');let name=seg[0].replace(/\s*\(.*?\)\s*/g,' ').trim();
  const nick=(seg[1]||'').trim();
  return yzP()+name+(nick&&nick.length<=30&&!/^(ב'|וב'|ר"י|רבה|אב"ד|מרבני|תלמיד)/.test(nick)?', '+nick:'');
}
function yzItems(hd,big,noLimit){
  const s=state.s;if((s.yzMode||'selected')==='none')return [];
  const sel=yzSel();
  let L=yzOn(hd).filter(e=>(e.p||s.yzHist||e.custom)&&yzVisible(e));
  const ord=s.yzOrder||'year',yk=e=>isNaN(e.yn)?(ord==='recent'?-1:1e9):e.yn;
  L.sort((a,b)=>(((sel[b.id]||b.custom)?1:0)-((sel[a.id]||a.custom)?1:0))||(ord==='year'?yk(a)-yk(b):ord==='recent'?yk(b)-yk(a):0));
  return L.map(e=>({cls:e.p||e.custom?'gadol':'gadol hev',text:yzText(e,s.yzFmt==='full')}));
}
const YZ_MONTH_NAME=m=>EN?(m===12?'Adar / Adar I':HEB_MONTHS_EN[m]):m===12?'אדר / אדר א׳':m===13?'אדר ב׳':HEB_MONTHS[m];
function yzMatches(e,words){const t=(e.t+' '+e.y).replace(/["'״׳]/g,'');return words.every(w=>t.includes(w))}
function yzRow(e,withDate){
  return '<div class="ev-item yz-row'+(e.edited?' edited':'')+'"><label class="chk" style="flex:1"><input type="checkbox" data-yzv="'+e.id+'"'+(yzVisible(e)||((state.s.yzMode||'selected')==='none'&&yzSel()[e.id])?' checked':'')+'> <span>'+esc(e.t)+
    '<span class="sub">'+(withDate?gem(e.d)+' '+YZ_MONTH_NAME(e.m)+' · ':'')+(e.y?esc(e.y):'')+(e.custom?' · הוספתי':'')+(e.edited?' · ערוך':'')+(e.p?'':' · אירוע')+'</span></span></label>'+
    '<button class="btn small" type="button" data-yzed="'+e.id+'">עריכה</button></div>';
}
function openYzEditor(id,after,preset){
  const e=id!=null?yzById(id):null;
  const v=e?{...e}:{m:(preset&&preset.m)||7,d:(preset&&preset.d)||1,y:'',t:'',p:1};
  const m=modal('<h3>'+(e?'עריכת רשומה':'הוספת רשומה למאגר')+'</h3>'+
    '<label class="fld">הטקסט<textarea id="yeT" rows="3" style="direction:rtl;font:inherit;width:100%;border:1px solid var(--line);border-radius:7px;padding:7px 9px;background:var(--bg);color:var(--ink)"></textarea></label>'+
    '<div class="row"><label class="fld">יום<select id="yeD">'+Array.from({length:30},(_,i)=>opt(i+1,gem(i+1),i+1==v.d)).join('')+'</select></label>'+
    '<label class="fld">חודש<select id="yeM">'+HEB_ORDER.map(x=>opt(x,YZ_MONTH_NAME(x),x==v.m)).join('')+'</select></label>'+'<button class="btn small hp-btn" type="button" data-hpick="yeM,yeD" title="בחירה מלוח">📅 מלוח</button>'+
    '<label class="fld">שנה<input id="yeY" placeholder="למשל תרצג"></label></div>'+
    '<label class="fld">סוג<select id="yeP"><option value="1">פטירה (יום שנה)</option><option value="0">אירוע בדברי ימי ישראל</option></select></label>'+
    '<p class="hint">אדר / אדר א׳: בשנה מעוברת מופיע באדר א׳. אדר ב׳: בשנה מעוברת באדר ב׳. בשנה רגילה שניהם באדר.</p>'+
    '<div class="row"><button class="btn primary" type="button" id="yeSave">שמירה</button>'+(e&&e.edited?'<button class="btn" type="button" id="yeRestore">שחזור לנוסח המקורי</button>':'')+(e&&e.custom?'<button class="btn danger" type="button" id="yeDel">מחיקה</button>':'')+(e?'<button class="btn" type="button" id="yeSend">שליחה למנהל האתר</button>':'')+'<button class="btn" type="button" data-close>ביטול</button></div>');
  const q=x=>m.querySelector(x);q('#yeT').value=v.t;q('#yeY').value=v.y||'';q('#yeP').value=v.p?'1':'0';
  const done=()=>{yzInvalidate();save();m.remove();rerender();renderYz();if(after)after()};
  q('#yeSave').onclick=()=>{
    const o={m:+q('#yeM').value,d:+q('#yeD').value,y:q('#yeY').value.trim(),t:q('#yeT').value.trim(),p:q('#yeP').value==='1'?1:0};
    if(!o.t){q('#yeT').focus();return}
    if(!e){const c={...o,id:'c'+uid()};state.yzCustom=(state.yzCustom||[]).concat(c);yzSetVisible(c.id,true)}
    else if(e.custom){state.yzCustom=state.yzCustom.map(c=>c.id===e.id?{...c,...o}:c)}
    else{state.yzEdit={...(state.yzEdit||{}),[e.id]:o}}
    done();
  };
  if(q('#yeRestore'))q('#yeRestore').onclick=()=>{const ed={...(state.yzEdit||{})};delete ed[e.id];state.yzEdit=ed;done()};
  if(q('#yeSend'))q('#yeSend').onclick=()=>{q('#yeSave').click();setTimeout(()=>openReport(e.id),50)};
  if(q('#yeDel'))q('#yeDel').onclick=()=>{state.yzCustom=state.yzCustom.filter(c=>c.id!==e.id);done()};
  setTimeout(()=>q('#yeT').focus(),30);
}
function openYzManager(){
  const s=state.s;
  const m=modal('<h3>כל המאגר: אירועים בדברי ימי ישראל<small>בוחרים חודש ורואים את כל הרשומות שלו לפי ימים. ✓ = יופיע בלוח. אפשר לסמן יום שלם או את כל החודש בלחיצה, ולערוך טקסט או תאריך.</small></h3>'+
    '<p class="hint" id="ymMode"></p>'+
    '<div class="row" id="ymListRow"><label class="fld">מסמנים ברשימה<select id="ymLs"></select></label><button class="btn small" type="button" id="ymLists">הרשימות שלי</button></div>'+
    '<div class="row" style="margin:0"><button class="btn small" type="button" id="ymPick">📅 בחירת יום מלוח</button></div>'+
    '<div class="ym-tabs" role="tablist" aria-label="חודש">'+[['all','כל החודשים']].concat(HEB_ORDER.map(x=>[String(x),YZ_MONTH_NAME(x)])).map(([k,n])=>'<button type="button" role="tab" data-ymtab="'+k+'">'+esc(n)+'</button>').join('')+'</div>'+
    '<div class="row"><label class="fld" style="flex:1">חיפוש (לא חובה)<input id="ymQ" type="search" placeholder="שם, כינוי, ספר או שנה"></label>'+
    '<select id="ymM" hidden>'+opt('all','כל החודשים')+HEB_ORDER.map(x=>opt(x,YZ_MONTH_NAME(x))).join('')+'</select></div>'+
    '<div class="row"><label class="fld">להציג<select id="ymF"><option value="all">הכל</option><option value="on">רק מסומנים</option><option value="off">רק לא מסומנים</option><option value="edited">רק ערוכים</option><option value="custom">רק שהוספתי</option></select></label>'+
    '<label class="fld">מיון<select id="ymO"><option value="date">לפי התאריך בשנה</option><option value="year">לפי שנים, מהקדום לחדש</option><option value="recent">לפי שנים, מהחדש לקדום</option></select></label>'+
    '<label class="fld">תקופה<select id="ymE">'+YZ_ERAS.map(x=>opt(x[0],x[1])).join('')+'</select></label>'+
    '<label class="fld">סוג<select id="ymP"><option value="all">הכל</option><option value="1">פטירות</option><option value="0">אירועים</option></select></label>'+
    '</div>'+
    '<div class="row"><button class="btn small" type="button" id="ymAll">✓ סימון כל מה שמוצג</button><button class="btn small" type="button" id="ymNone">הסרת הסימון ממה שמוצג</button><button class="btn small" type="button" id="ymAdd">+ הוספת רשומה</button><span class="hint" id="ymCount"></span></div>'+
    '<div class="ym-list" id="ymRows"></div>'+
    '<div class="row"><button class="btn primary" type="button" data-close>סיום</button></div>');
  m.querySelector('.modal').classList.add('wide','ym-modal');
  const q=x=>m.querySelector(x);
  const startM=monthsCache[0]&&monthsCache[0].key.startsWith('heb-')?String(new HDate(new Date()).getMonth()):'7';
  q('#ymM').value=startM;
  let shown=[],ymLim=600;
  function list(){
    const qv=q('#ymQ').value.trim(),mo=q('#ymM').value,f=q('#ymF').value,pv=q('#ymP').value;const sv='all';
    const words=qv?qv.replace(/["'״׳]/g,'').split(/\s+/):null;
    const mode=state.s.yzMode||'selected';
    q('#ymLs').innerHTML=yzListOptions();q('#ymListRow').hidden=mode==='all';
    q('#ymMode').innerHTML=mode==='all'?'מצב "כל המאגר": הכל מוצג, חוץ ממה שהורדתם ממנו את הסימון.':mode==='none'?'<span class="msg-bad">יומי דהילולא (יארצייטן) כבויים כרגע. הסימונים יישמרו ויופיעו כשתבחרו "רק מסומנים".</span>':'מצב "רק מסומנים": בלוח יופיע רק מה שמסומן ברשימה הפעילה.';
    const order=HEB_ORDER;
    shown=yzAll().filter(e=>(mo==='all'||e.m==+mo)&&(pv==='all'||String(e.p?1:0)===pv)&&(sv==='all'||(sv==='custom'?e.custom:(!e.custom&&e.src===sv)))&&(!words||yzMatches(e,words)));
    shown=shown.filter(e=>{const on=mode==='all'?!(state.s.yzHide||{})[e.id]:!!yzSel()[e.id];return f==='all'||(f==='on'&&on)||(f==='off'&&!on)||(f==='edited'&&e.edited)||(f==='custom'&&e.custom)});
    const ev=q('#ymE').value,era=YZ_ERAS.find(x=>x[0]===ev);
    if(era&&era[0]!=='all')shown=shown.filter(e=>!isNaN(e.yn)&&e.yn>=era[2]&&e.yn<era[3]);
    const so=q('#ymO').value,yk=e=>isNaN(e.yn)?1e9:e.yn;
    if(so==='year')shown.sort((a,b)=>yk(a)-yk(b)||order.indexOf(a.m)-order.indexOf(b.m)||a.d-b.d);
    else if(so==='recent')shown.sort((a,b)=>(isNaN(b.yn)?-1:b.yn)-(isNaN(a.yn)?-1:a.yn)||order.indexOf(a.m)-order.indexOf(b.m)||a.d-b.d);
    else shown.sort((a,b)=>order.indexOf(a.m)-order.indexOf(b.m)||a.d-b.d||yk(a)-yk(b));
    const byYear=so!=='date';
    q('#ymM').closest('.modal').querySelectorAll('[data-ymtab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.ymtab===mo)));
    const lim=mo==='all'&&!words?ymLim:100000,part=shown.slice(0,lim);let h='',last='';
    for(const e of part){if(byYear){h+=yzRow(e,true);continue}const k=e.m+'-'+e.d;if(k!==last){last=k;h+='<div class="ym-day"><b>'+gem(e.d)+' '+YZ_MONTH_NAME(e.m)+'</b><button class="btn small" type="button" data-ymday="'+k+'">סימון כל היום</button><button class="btn small" type="button" data-ymdayoff="'+k+'">הסרה מכל היום</button></div>'}h+=yzRow(e,false)}
    q('#ymRows').innerHTML=(h||'<p class="hint">לא נמצאו רשומות.</p>')+(shown.length>lim?'<button class="btn" type="button" id="ymMore" style="margin:8px auto;display:block">הצגת עוד '+Math.min(600,shown.length-lim)+'</button>':'');
    const on=shown.filter(e=>yzVisible(e)).length;q('#ymCount').textContent=shown.length+' רשומות · '+on+' מסומנות להצגה';
  }
  const changed=()=>{if((state.s.yzMode||'selected')==='none'){state.s.yzMode='selected';syncUI()}save();rerender();renderYz()};
  ['#ymQ','#ymM','#ymF','#ymP','#ymO','#ymE'].forEach(x=>q(x).addEventListener('input',()=>{ymLim=600;list()}));
  q('#ymPick').onclick=e=>{if(!window.MyLuachHPick)return;MyLuachHPick.open(e.currentTarget,{onPick:x=>{q('#ymM').value=String(x.hm);ymLim=600;list();
    const h=q('[data-ymday="'+x.hm+'-'+x.hd+'"]');if(h){const r=h.closest('.ym-day');r.scrollIntoView({block:'start'});r.classList.add('ym-hl');setTimeout(()=>r.classList.remove('ym-hl'),1600)}}})};
  m.addEventListener('click',ev=>{const b=ev.target.closest('[data-ymtab]');if(b){q('#ymM').value=b.dataset.ymtab;ymLim=600;list();return}if(ev.target.id==='ymMore'){ymLim+=600;list()}});
  q('#ymLs').addEventListener('change',e=>{state.s.yzListId=e.target.value;save();syncUI();rerender();list()});
  q('#ymLists').onclick=()=>openYzLists(list);
  q('#ymAll').onclick=()=>{shown.forEach(e=>yzSetVisible(e.id,true));changed();list()};
  q('#ymNone').onclick=()=>{shown.forEach(e=>yzSetVisible(e.id,false));changed();list()};
  q('#ymAdd').onclick=()=>openYzEditor(null,list,{m:q('#ymM').value==='all'?7:+q('#ymM').value});
  q('#ymRows').addEventListener('change',ev=>{const id=ev.target.dataset.yzv;if(id!=null){yzSetVisible(id,ev.target.checked);changed()}});
  q('#ymRows').addEventListener('click',ev=>{
    const t=ev.target;
    if(t.dataset.yzed)return openYzEditor(t.dataset.yzed,list);
    const k=t.dataset.ymday||t.dataset.ymdayoff;if(k){const on=!!t.dataset.ymday;shown.filter(e=>e.m+'-'+e.d===k).forEach(e=>yzSetVisible(e.id,on));changed();list()}
  });
  list();
}
function placeOfLegacy(t){const s=state.s,P=s.place||{};if(t==='yz'){const v=P.yz||'none';return v==='page'&&(s.view||'month')!=='month'?'col':v}return P[t]||'cell'}
/* ---------- טורים ליד הלוח ----------
   s.cols: [{id, side:'right'|'left', w:אחוזים, types:['zmanim','personal','yz','learn']}]
   סוג מידע שנבחר להצגה ולא נמצא באף טור מופיע בתוך הימים. */
const COL_TYPES=[['zmanim','זמני היום'],['personal','אירועים אישיים'],['yz','יומי דהילולא (יארצייטן) ודברי הימים'],['learn','לימוד יומי, מולד ותקופות'],['img','תמונה'],['ad','מודעה או הקדשה']];
function zMode(){return state.s.zmanimMode||'daily'}
function zpl(k){const s=state.s,Z=s.zplace&&s.zplace[k];if(Z)return Z;const m=zMode();return m==='shabbat'?{day:1,sh:1}:m==='col'?{col:1}:m==='daily'||m==='custom'?{day:1}:{}}
function zOn(){const m=zMode();return !state.s.noTimes&&m!=='none'&&m!=='table'&&Object.values(state.s.zmanim).some(Boolean)}
function zAnyCol(){if(!zOn())return false;const s=state.s;return ZMANIM.some(z=>s.zmanim[z[0]]&&zpl(z[0]).col)}
function colsCfg(){
  const s=state.s,P=s.place||{};let cols;
  if(Array.isArray(s.cols))cols=s.cols.map(c=>({...c,types:(c.types||[]).filter(t=>COL_TYPES.some(x=>x[0]===t))}));
  else{
    cols=[];const side=s.panelSide==='right'?'right':'left';
    const t1=[(zMode()==='col')?'zmanim':null,P.personal==='col'?'personal':null,placeOfLegacy('yz')==='col'?'yz':null].filter(Boolean);
    if(t1.length)cols.push({id:'c1',side,w:+s.yzPanelW||26,types:t1});
    if(P.learn==='col')cols.push({id:'c2',side,w:+s.learnPanelW||12,types:['learn']});
  }
  if(zAnyCol()&&!cols.some(c=>c.types.includes('zmanim'))){if(cols.length)cols[0].types=['zmanim',...cols[0].types];else cols.push({id:'cz',side:s.panelSide==='right'?'right':'left',w:26,types:['zmanim']})}
  return cols}
function colOf(t){return colsCfg().find(c=>c.types.includes(t))||null}
function placeOf(t){
  const s=state.s,P=s.place||{};
  if(!Array.isArray(s.cols))return placeOfLegacy(t);
  if(t==='yz'){const v=P.yz||'none';if(v==='none')return 'none';if(v==='page'&&(s.view||'month')==='month')return 'page'}
  else if(P[t]==='none')return 'none';
  return colOf(t)?'col':'cell'}
function saveCols(cols){state.s.cols=cols.map(c=>({id:c.id,side:c.side,w:c.w,types:c.types.slice(),imgPer:!!c.imgPer}));
  /* מה שהוסר מכל הטורים חוזר לתוך הימים */
  const P={...(state.s.place||{})};for(const [t] of COL_TYPES){if(t==='zmanim'||t==='img'||t==='ad')continue;if(P[t]==='col')P[t]='cell';if(t==='yz'&&!P.yz)P.yz='none'}state.s.place=P}
function zDay(d,noCol){if(!zOn())return [];return zmanimFor(d).filter(z=>{const p=zpl(z.key);return (p.day&&(!p.sh||d.getDay()===6))||(noCol&&p.col)})}
function zCol(d,all){if(!zOn())return [];return zmanimFor(d,all).filter(z=>zpl(z.key).col)}
function yzPanelOn(){return placeOf('yz')==='col'}
function personalOnly(date,hd){
  const out=[];
  for(const e of eventsOn(date,hd))if(e.name||!e.img)out.push({cls:e.kind==='reminder'?'reminder':'personal',text:eventLabel(e,date,hd)});
  return out;
}
function gedolimFor(hd,big,noLimit){
  const out=[],leap=isLeap(hd.getFullYear());
  for(const g of GEDOLIM.concat(state.customGedolim)){
    if(state.s.gedolim[g.id]&&monthMatches(+g.month,hd.getMonth(),leap)&&hd.getDate()===+g.day)out.push({cls:'gadol',text:yzP()+g.name});
  }
  return out.concat(yzItems(hd,big,noLimit));
}
function personalFor(date,hd,big){return personalOnly(date,hd).concat(gedolimFor(hd,big))}

/* ---------- page geometry ---------- */
/* איכות התמונות לפי גודל הנייר: כמה פיקסלים לשמור לכל סוג מקום (בערך 300 נקודות לאינץ' בהדפסה).
   A4 = בסיס, A3 = פי 1.4, A2 = פי 2. לא מגדילים תמונה קטנה מהמקור, רק לא מקטינים יותר מדי. */
const JQ=0.92;
function QPX(kind){let F=1;try{const [w,h]=pageDims();F=Math.max(1,Math.min(2.6,Math.max(w,h)/297))}catch(e){}
  const base={day:1200,event:1200,box:2400,page:3600}[kind]||3600;return Math.min(7200,Math.round(base*F))}
function imgCount(){let n=0;const w=v=>{if(typeof v==='string'){if(/^data:image\//.test(v))n++}else if(Array.isArray(v))v.forEach(w);else if(v&&typeof v==='object')for(const k in v)w(v[k])};try{w(state)}catch(e){}return n}
function bigPaperNote(){const n=imgCount();if(!n)return;
  const m=modal('<h3>נייר גדול יותר, תמונות חדות יותר</h3><p>מעכשיו תמונות שתעלו יישמרו באיכות שמתאימה לגודל הזה.</p><p>ב'+(n===1?'תמונה אחת':n+' התמונות')+' שכבר בלוח נשמרו לפי הגודל הקודם. אם אחת מהן גדולה בדף (רקע, שער, עמוד שלם), כדאי להחליף אותה בקובץ המקורי כדי שתצא חדה בהדפסה.</p><div class="row"><button class="btn primary" type="button" data-close>הבנתי</button></div>')}
function pageDims(){
  const s=state.s;let w,h;
  if(s.view==='countdown'&&s.cdLayout==='scroll')return [110,cdScrollH()];
  if(s.size==='custom'){w=Math.max(50,+s.customW||200);h=Math.max(50,+s.customH||200);return [w,h]}
  const z=SIZES[s.size]||SIZES.a4;w=Math.min(z.w,z.h);h=Math.max(z.w,z.h);
  return s.orient==='landscape'?[h,w]:[w,h];
}
const unitK=()=>{const [w,h]=pageDims();return Math.pow(Math.min(w,h)/210,0.7)};
const mm2px=mm=>mm*96/25.4;
function applyPrintPageStyle(){
  let st=document.getElementById('pageRule');if(!st){st=document.createElement('style');st.id='pageRule';document.head.appendChild(st)}
  const [w,h]=pageDims();st.textContent='@page{size:'+w+'mm '+h+'mm;margin:0}';
}

/* ---------- page parts ---------- */
function makeImageBox(get,setv,heightMm){
  const box=el('div','pg-img');
  if(heightMm==null)box.classList.add('grow');else box.style.height=heightMm+'mm';
  const data=get()||{};
  if(data.img){
    const img=el('img');img.src=data.img;img.alt='';img.draggable=false;box.appendChild(img);
    let px=data.px??50,py=data.pos??50,zm=data.zoom??1;
    const paint=()=>{img.style.objectPosition=px+'% '+py+'%';img.style.transformOrigin=px+'% '+py+'%';img.style.transform=zm>1?'scale('+zm+')':''};paint();
    box.classList.add('pannable');
    box.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('.img-tools,.rsz'))return;
      e.preventDefault();box.setPointerCapture(e.pointerId);
      const r=box.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,spx=px,spy=py;let moved=false;
      const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;
        px=Math.max(0,Math.min(100,spx-dx/r.width*100*1.4/zm));py=Math.max(0,Math.min(100,spy-dy/r.height*100*1.4/zm));paint()};
      const up=()=>{box.removeEventListener('pointermove',mv);box.removeEventListener('pointerup',up);box.removeEventListener('pointercancel',up);if(moved)setv({px:Math.round(px),pos:Math.round(py)})};
      box.addEventListener('pointermove',mv);box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);
    });
    let wt;box.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();zm=Math.max(1,Math.min(4,zm*(e.deltaY<0?1.08:1/1.08)));paint();clearTimeout(wt);wt=setTimeout(()=>setv({zoom:+zm.toFixed(2)}),400)},{passive:false});
    if(data.fit==='contain')box.classList.add('contain');
    const tools=el('div','img-tools');
    const b=(t,fn)=>{const x=el('button',null,t);x.type='button';x.onclick=e=>{e.stopPropagation();fn()};tools.appendChild(x)};
    b('החלפה',()=>pickImage(setv));
    b(data.fit==='contain'?'מילוי':'התאמה',()=>setv({fit:data.fit==='contain'?'cover':'contain'}));
    b('+',()=>setv({zoom:Math.min(4,+((data.zoom??1)+0.25).toFixed(2))}));
    b('−',()=>setv({zoom:Math.max(1,+((data.zoom??1)-0.25).toFixed(2))}));
    if((data.zoom??1)!==1||(data.px??50)!==50||(data.pos??50)!==50)b('איפוס',()=>setv({zoom:1,px:50,pos:50}));
    b('עריכה',()=>openImageEditor(data,v=>setv(v)));
    b('הסרה',()=>setv({img:null,edit:null}));
    box.appendChild(tools);
  }else{
    const d=el('div','drop','לחצו להוספת תמונה<span>או גררו לכאן קובץ</span>');d.tabIndex=0;d.setAttribute('role','button');
    d.onclick=()=>pickImage(setv);d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pickImage(setv)}};
    box.appendChild(d);
  }
  box.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();box.classList.add('over')});
  box.addEventListener('dragleave',()=>box.classList.remove('over'));
  box.addEventListener('drop',async e=>{e.preventDefault();e.stopPropagation();box.classList.remove('over');document.body.classList.remove('tray-dragging');
    const tid=trayDropId(e);if(tid){const t=trayItem(tid);if(t){setv({img:t.img,edit:null,zoom:1,px:50,pos:50});trayPlaced(tid)}return}
    const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(f&&f.type.startsWith('image/'))setv({img:await compress(f),edit:null})});
  box._setv=setv;
  return box;
}
function editable(cls,text,ph,onSave,multi){
  const d=el('div',cls);d.contentEditable='true';d.dataset.ph=ph;d.textContent=text||'';d.spellcheck=false;
  const base=cls.split(' ')[0];RS.tc[base]=(RS.tc[base]||0)+1;
  const id=base+'|'+(RS.curKey||'')+'|'+RS.tc[base];d.dataset.tid=id;applyTextStyle(d);
  d.addEventListener('input',()=>onSave(multi?d.innerText.trim():d.textContent.trim()));
  if(!multi)d.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();d.blur()}});
  return d;
}
let RS={labels:{},emitted:new Set(),slots:[],count:0,tc:{},curKey:''};
function applyTextStyle(d){const st=(state.textStyles||{})[d.dataset.tid]||{};d.style.setProperty('--fs',st.fs||1);d.style.textAlign=st.al||'';d.style.color=st.co||'';if(st.ff){loadFont(st.ff);d.style.fontFamily=fontCSS(st.ff)}else d.style.fontFamily=''}
const FONTS=[
 ['קלאסי ומסורתי',[['Frank Ruhl Libre','פרנק ריהל','s','400;700;900'],['David Libre','דוד','s','400;700'],['Noto Serif Hebrew','נוטו סריף','s','400;700'],['Bona Nova','בונה נובה','s','400;700'],['Tinos','טינוס (כמו טיימס)','s','400;700'],['Noto Rashi Hebrew','כתב רש״י','s','']]],
 ['מודרני ונקי',[['Assistant','אסיסטנט','a','400;700'],['Heebo','חפצי','a','400;700;900'],['Rubik','רוביק','a','400;700;900'],['Alef','אלף','a','400;700'],['Miriam Libre','מרים','a','400;700'],['IBM Plex Sans Hebrew','IBM פלקס','a','400;700'],['Noto Sans Hebrew','נוטו סאנס','a','400;700'],['Open Sans','אופן סאנס','a','400;700'],['Arimo','ארימו (כמו אריאל)','a','400;700'],['Varela Round','וארלה עגול','a',''],['Fredoka','פרדוקה עגול','a','400;700']]],
 ['כותרות בולטות',[['Suez One','סואץ','s',''],['Secular One','סקולר','a',''],['Karantina','קרנטינה צר','a','400;700'],['Bellefair','בלפייר','s','']]],
 ['כתב יד',[['Amatic SC','אמטיק','a','400;700'],['Playpen Sans Hebrew','פלייפן (כתב ילדים)','a','400;700'],['Solitreo','סוליטריאו (כתב רהוט)','a','']]],
 ['מעוצבים ושמחים',[['Rubik Bubbles','רוביק בועות','a',''],['Rubik Wet Paint','רוביק צבע רטוב','a',''],['Rubik Puddles','רוביק שלוליות','a',''],['Rubik Moonrocks','רוביק סלעי ירח','a',''],['Rubik Gemstones','רוביק אבני חן','a',''],['Rubik Vinyl','רוביק תקליט','a',''],['Rubik Doodle Shadow','רוביק צל מצויר','a',''],['Rubik Spray Paint','רוביק תרסיס','a',''],['Rubik Glitch','רוביק גליץ׳','a',''],['Rubik Dirt','רוביק מחוספס','a','']]]
];
const FONT_MAP={};FONTS.forEach(([,l])=>l.forEach(f=>FONT_MAP[f[0]]=f));
function fontCSS(fam){const f=FONT_MAP[fam];return '"'+fam+'",'+(f&&f[2]==='s'?'"Frank Ruhl Libre",serif':'"Assistant",Arial,sans-serif')}
const loadedFonts=new Set(['Assistant','Bellefair','David Libre','Frank Ruhl Libre','Suez One']);
function loadFont(fam){
  if(!fam||loadedFonts.has(fam)||!FONT_MAP[fam])return;loadedFonts.add(fam);
  const w=FONT_MAP[fam][3],l=document.createElement('link');l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(fam).replace(/%20/g,'+')+(w?':wght@'+w:'')+'&display=swap';
  l.onload=()=>{if(document.fonts)document.fonts.ready.then(fit)};document.head.appendChild(l);
}
function fontOptions(def){return opt('',def)+FONTS.map(([g,l])=>'<optgroup label="'+g+'">'+l.map(f=>opt(f[0],f[1])).join('')+'</optgroup>').join('')}
function pageShell(label,key){
  const [w,h]=pageDims(),s=state.s;
  const p=el('div','page'+(PLAN().watermark?' wm'+(PLAN().watermark==='light'?' wm-light':freePrintOK()?' wm-free':''):'')+' t-'+s.theme+((s.learn||{}).box?' lb-on':'')+(s.yzLines?' yz-lines':''));p.style.width=w+'mm';p.style.height=h+'mm';
  p.style.setProperty('--u',unitK().toFixed(4)+'mm');p.style.setProperty('--ts',(s.textScale/100).toFixed(2));
  p.style.setProperty('--acc',s.accent);
  if(s.pageBg&&s.pageBg!=='none'&&s.view!=='countdown'&&!(key==='cover'&&IMGBG(s.pageBg))){
    p.classList.add('pbg','pbg-'+s.pageBg);
    if(IMGBG(s.pageBg)){const u=s.pageBg==='custom'?s.pageBgImg:monthArt(key,s.pageBg);
      if(u){p.classList.add('pbg-img');p.style.setProperty('--bgimg','url("'+u+'")');p.style.setProperty('--bgop',String(s.pageBgOp??0.32))}}}
  fxLines(p);
  for(const [k,v] of Object.entries(s.tcolors||{}))if(v)p.style.setProperty('--c-'+k,v);
  if(s.headFont)p.style.setProperty('--f-head',fontCSS(s.headFont));
  if(s.bodyFont)p.style.setProperty('--f-body',fontCSS(s.bodyFont));
  const wrap=el('div','sheet-wrap');wrap.appendChild(p);
  if(label)wrap.appendChild(el('div','sheet-label',esc(label)));
  if(key){const qa=el('div','sheet-add no-print');qa.innerHTML='<button type="button" data-fxquick="text" title="שדה טקסט שאפשר להזיז ולהגדיל, מעל הלוח, מתחתיו או בצדדים">＋ טקסט</button><button type="button" data-fxquick="img" title="שדה תמונה שאפשר להזיז ולהגדיל בכל מקום בדף">＋ תמונה</button>';wrap.appendChild(qa)}
  if(key){wrap.dataset.key=key;RS.labels[key]=label;RS.emitted.add(key)}
  RS.curKey=key||label||'';RS.tc={};
  stage.appendChild(wrap);RS.count++;
  return p;
}
/* רקע לעמוד: גוונים ועיטורים עדינים בצבע הלוח, שמודפסים גם הם */
/* איור לכל חודש (מהמאגר), לפי החודש העברי. בלוח לועזי: לפי החודש העברי של אמצע החודש */
const IMGBG=k=>k==='month'||k==='art'||k==='custom';
/* נוף טבעי לכל חודש (assets/library/nat-*.svg, נוצר ב-tools/gen_nature.py) */
const MONTH_NAT={7:'tishrei',8:'cheshvan',9:'kislev',10:'tevet',11:'shvat',12:'adar',13:'adar',1:'nisan',2:'iyar',3:'sivan',4:'tamuz',5:'av',6:'elul'};
const MONTH_ART={7:'rosh-hashana',8:'forest-mist',9:'chanukah',10:'starry-night',11:'tu-bishvat',12:'purim',13:'purim',1:'pesach',2:'lag-baomer',3:'shavuot',4:'sea-sunset',5:'jerusalem-walls',6:'sunrise-mountains'};
function monthArt(key,kind){key=String(key||'').replace(/^(mi-|h-)/,'');let hm=null;
  const mo=monthsCache.find(m=>m.key===key);
  if(/^heb-\d+$/.test(key))hm=+key.slice(4);else if(mo&&mo.days&&mo.days.length)hm=new HDate(mo.days[Math.floor(mo.days.length/2)]).getMonth();
  else{const d=/^(?:w|d|t)-(\d{4}-\d{2}-\d{2})$/.exec(key);if(d)hm=new HDate(dateFromIso(d[1])).getMonth()}
  if(hm==null&&monthsCache[0])hm=new HDate(monthsCache[0].days[0]).getMonth();
  return hm?new URL('assets/library/'+(kind==='art'?MONTH_ART[hm]+'.svg':'nat-'+MONTH_NAT[hm]+'.jpg'),document.baseURI).href:''}
const PAGE_BGS=[['month','נוף לכל חודש'],['art','איורי חגים'],['custom','תמונה משלכם'],['none','לבן'],['soft','הילה עדינה'],['sky','גוון עליון'],['paper','נייר חם'],['dots','נקודות'],['frame','מסגרת'],['corners','פינות מעוטרות'],['waves','גלים']];
function bgOwn(){const f=v=>{if(!v.img)return;state.s.pageBgImg=v.img;state.s.pageBg='custom';save();render()};f.maxPx=QPX('page');pickImage(f)}
document.addEventListener('input',e=>{if(e.target.matches&&e.target.matches('[data-bgop]')){state.s.pageBgOp=+e.target.value;save();clearTimeout(bgOpT);bgOpT=setTimeout(render,120)}});
let bgOpT=0;
function bgOffSync(){const b=$('#bgOffBtn');if(!b)return;const cur=state.s.pageBg||'none',img=IMGBG(cur);
  b.hidden=CDMODE||!(img||(cur==='none'&&state.s.pageBgPrev));b.textContent=img?'✕ בלי תמונות רקע':'↺ להחזיר את תמונות הרקע'}
$('#bgOffBtn').onclick=()=>{const s=state.s,cur=s.pageBg||'none';if(IMGBG(cur)){s.pageBgPrev=cur;s.pageBg='none'}else if(s.pageBgPrev){s.pageBg=s.pageBgPrev;delete s.pageBgPrev}save();render()};
function bgPickSync(){bgOffSync();const cur=state.s.pageBg||'none';document.querySelectorAll('[data-bgpick]').forEach(box=>{
  if(!box.children.length){box.innerHTML=PAGE_BGS.map(([k,n])=>'<button type="button" class="bgp" data-pbg="'+k+'" role="radio"><span class="bgp-prev pbg pbg-'+k+(IMGBG(k)?' pbg-img':'')+'"'+(k==='month'||k==='art'?' style="--bgimg:url('+new URL(k==='art'?'assets/library/rosh-hashana.svg':'assets/library/nat-elul.jpg',document.baseURI).href+');--bgop:.7"':'')+'>'+(k==='custom'?'<b class="bgp-plus">＋</b>':'<i></i><i></i><i></i>')+'</span><span class="bgp-n">'+n+'</span></button>').join('');
    box.insertAdjacentHTML('afterend','<label class="fld bg-op" hidden>חוזק הרקע<input type="range" min="0.1" max="0.8" step="0.02" data-bgop></label><button type="button" class="btn bg-own" hidden data-bgown>החלפת התמונה לרקע</button><button type="button" class="btn bg-own" hidden data-bgedit>✎ עריכת הרקע: עוד תמונות, טקסט ושכבות</button>')}
  box.style.setProperty('--acc',state.s.accent);
  {const img=IMGBG(cur),par=box.parentNode;par.querySelectorAll('.bg-op').forEach(x=>{x.hidden=!img;const r=x.querySelector('input');if(r&&document.activeElement!==r)r.value=state.s.pageBgOp??0.32});par.querySelectorAll('[data-bgown],[data-bgedit]').forEach(x=>x.hidden=cur!=='custom'||!state.s.pageBgImg);
   const cp=box.querySelector('[data-pbg="custom"] .bgp-prev');if(cp){if(state.s.pageBgImg){cp.style.setProperty('--bgimg','url("'+state.s.pageBgImg+'")');cp.style.setProperty('--bgop','.6');cp.innerHTML=''}}}
  box.querySelectorAll('[data-pbg]').forEach(b=>{const on=b.dataset.pbg===cur;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on))})})}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-pbg]');if(b){const k=b.dataset.pbg;if(k==='custom'&&!state.s.pageBgImg){bgOwn();return}state.s.pageBg=k;save();render();return}
  if(e.target.closest('[data-bgown]')){bgOwn();return}
  if(e.target.closest('[data-bgedit]')){const s=state.s;openImageEditor({img:s.pageBgImg,edit:s.pageBgEdit||null},v=>{if(v.img)s.pageBgImg=v.img;if('edit' in v)s.pageBgEdit=v.edit;save();render()});return}
  if(e.target.closest('[data-cover-on]')){state.s.cover=true;save();render();const w=stage.querySelector('.sheet-wrap');if(w)w.scrollIntoView({behavior:'smooth',block:'start'});try{syncUI()}catch(err){}return}
  if(e.target.closest('[data-cover-off]')){state.s.cover=false;save();render();try{syncUI()}catch(err){}}
});
function slotSetter(key){return v=>{state.slots[key]={...(state.slots[key]||{}),...v};save();render()}}
function innerH(){const [,h]=pageDims();return h-18*unitK()}
function screenMM(el){const pg=el.closest('.page');const k=pg.getBoundingClientRect().width/pg.offsetWidth;return 1/(k*96/25.4)}
function addResizer(target,dir,onEnd){
  const h=el('div','rsz no-print rsz-'+dir);h.title='משכו כדי לשנות גודל';
  const vertical=dir==='bottom'||dir==='top';
  h.addEventListener('pointerdown',e=>{
    e.preventDefault();e.stopPropagation();h.setPointerCapture(e.pointerId);h.classList.add('on');
    const r=target.getBoundingClientRect(),f=screenMM(target),start=vertical?r.height:r.width,sx=e.clientX,sy=e.clientY;let mm=start*f;
    const mv=ev=>{let d=vertical?ev.clientY-sy:ev.clientX-sx;if(dir==='top')d=-d;if(dir==='left')d=-d;mm=Math.max(5,(start+d)*f);target.style[vertical?'height':'width']=mm+'mm'};
    const up=()=>{h.classList.remove('on');h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);onEnd(mm)};
    h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
  });
  target.appendChild(h);
}
function addSlotImage(p,key,heightMm,what){
  const s=state.s;RS.slots.push(key);
  const box=makeImageBox(()=>state.slots[key],slotSetter(key),heightMm);
  if(heightMm!=null)addResizer(box,'bottom',mm=>set('imgRatio',Math.max(5,Math.min(75,Math.round(mm/innerH()*100)))));
  p.appendChild(box);
  if(s.showCaption)p.appendChild(editable('caption',(state.slots[key]||{}).caption,'לחצו כאן להוספת משפט או ברכה ל'+(what||'חודש'),t=>{state.slots[key]={...(state.slots[key]||{}),caption:t};save()}));
}
function moonShort(x){return String(x).replace('המולד: ','מולד ').replace(/מתחילים קידוש לבנה/,'ק״ל מ־').replace(/סוף זמן קידוש לבנה/,'סוף ק״ל').replace(/בערבית מתחילים ״ותן טל ומטר״/,'ותן טל ומטר').replace(/^תקופת /,'תק׳ ').replace(/ ?\((אשכנז|ספרד|רמ״א|שו״ע)\)/,(m,g)=>' '+({'אשכנז':'אשכ׳','ספרד':'ספ׳','רמ״א':'רמ״א','שו״ע':'שו״ע'}[g]))}
function addHistBox(p,mo,full){
  const s=state.s;
  if(full){const head=el('div','pg-head');head.appendChild(el('div','pg-month',esc(mo.title)));head.appendChild(el('div','pg-year',esc(mo.year)));head.appendChild(el('div','pg-other',esc(s.yzHist?'אירועים בדברי ימי ישראל':'יומי דהילולא (יארצייטן)')));p.appendChild(head)}
  const box=el('div','cont-body hist-body'+(full?'':' hist-under'));box.style.setProperty('--ts',((+s.histScale||100)/100).toFixed(2));
  if(!full)box.appendChild(el('div','spill-t hist-title',esc((s.yzHist?'דברי הימים':'יומי דהילולא (יארצייטן)')+' · '+mo.title)));
  const dl=d=>{const hd=new HDate(d);return dStyle().startsWith('greg')?gregShort(d):hebShort(hd)};
  let n=0;
  for(const d of mo.days){const L=gedolimFor(new HDate(d),true,true);if(!L.length)continue;const day=el('div','yzp-day');day.appendChild(el('span','yzp-d',esc(dl(d))));
    for(const it of L){const e=el('span','yzp-e'+(it.cls&&it.cls!=='gadol'?' '+it.cls:''));e.textContent=stripYP(it.text);day.appendChild(e);n++}box.appendChild(day)}
  if(!n)box.appendChild(el('div','yzp-empty','אין אירועים מסומנים לחודש זה.'));
  p.appendChild(box);
}
let HIST_ASKED=false;
function fitHist(cb){
  if(cb.dataset.fitDone)return;cb.dataset.fitDone='1';
  const READ=0.72,over=el=>el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1;
  const fitSize=el=>{el.style.setProperty('--yzf',1);if(!over(el))return 1;let lo=0.08,hi=1;for(let i=0;i<12;i++){const mid=(lo+hi)/2;el.style.setProperty('--yzf',mid.toFixed(3));if(over(el))hi=mid;else lo=mid}el.style.setProperty('--yzf',lo.toFixed(3));return lo};
  const f=fitSize(cb);
  if(f>=READ)return;
  const mode=state.s.histOverflow||'ask';
  const page=cb.closest('.page'),title=((page.querySelector('.pg-month')||{}).textContent||'').trim();
  if(mode!=='page'){
    if(mode==='ask'&&!HIST_ASKED){HIST_ASKED=true;setTimeout(()=>askHistOverflow(title,cb.querySelectorAll('.yzp-e').length,Math.round(f*100)),300)}
    return;
  }
  /* עמודים נוספים: גודל קריא, וכל מה שלא נכנס עובר לעמוד הבא */
  let cur=cb,wrap=page.parentElement,n=1;
  cur.style.setProperty('--yzf',READ);
  while(over(cur)&&n<6){
    const days=[...cur.querySelectorAll(':scope>.yzp-day')],moved=[];
    while(over(cur)&&days.length>1){const d=days.pop();moved.unshift(d);d.remove()}
    if(!moved.length)break;
    n++;
    const nw=el('div','sheet-wrap cont');nw.style.width=wrap.style.width;nw.style.height=wrap.style.height;
    const np=el('div',page.className.replace(/\blocked-page\b/,''));np.style.cssText=page.style.cssText;
    const head=el('div','pg-head');head.appendChild(el('div','pg-month',esc(title)));head.appendChild(el('div','pg-other','דברי הימים · המשך '+(n-1)));np.appendChild(head);
    const body=el('div','cont-body hist-body');body.style.setProperty('--ts',((+state.s.histScale||100)/100).toFixed(2));body.dataset.fitDone='1';body.style.setProperty('--yzf',READ);moved.forEach(d=>body.appendChild(d));np.appendChild(body);
    nw.appendChild(np);nw.appendChild(el('div','sheet-label',esc(title)+' · דברי הימים, המשך'));
    wrap.after(nw);wrap=nw;cur=body;
  }
  if(over(cur))fitSize(cur);
}
function askHistOverflow(title,count,pct){
  const m=modal('<h3>האירועים לא נכנסים בעמוד אחד</h3><p class="hint">בחודש '+esc(title)+' יש '+count+' אירועים בדברי ימי ישראל. כדי שכולם ייכנסו בעמוד אחד, צריך להקטין את הטקסט לכ־'+pct+'% מהגודל הרגיל. מה לעשות?</p><div class="choice-list"><button class="btn primary" type="button" data-ho="page">להוסיף עמוד נוסף<small>הטקסט נשאר בגודל קריא, והחודש מקבל עוד עמוד של דברי הימים</small></button><button class="btn" type="button" data-ho="shrink">להקטין את הטקסט<small>הכל נכנס בעמוד אחד, באותיות קטנות יותר</small></button></div><p class="hint">הבחירה חלה על כל החודשים. אפשר לשנות אותה בהגדרות, בחלק "אירועים בדברי ימי ישראל".</p>');
  m.addEventListener('click',e=>{const b=e.target.closest('[data-ho]');if(!b)return;state.s.histOverflow=b.dataset.ho;save();m.remove();syncUI();render()});
}
function addMonthImage(p,mo,heightMm){addSlotImage(p,mo.key,heightMm,'חודש')}
function footText(){if(EN){const s=state.s,nm={ashkenaz:'Ashkenazi custom',sefardi:'Sephardi custom',tuk:'R. Tukaczinsky',chazon:'as in Chazon Shamayim',tzikoni:'R. Tzikoni (average)',itim:'Ashkenazi, sunset with elevation',tanya:'Baal HaTanya (Chabad)',chul:'common abroad',gra:'GRA',custom:'custom method'}[s.zmPreset||'ashkenaz'];return '<span>Times for '+esc(place().name)+' · '+nm+' · Shema & Shacharit: '+({gra:'GRA',mga:'MGA',both:'MGA & GRA'}[s.m_shma])+' · candle lighting '+s.candleMins+' min before sunset</span><span>'+(s.secs?'':'rounded to the stringent side')+'</span>'}
  const s=state.s,nm={ashkenaz:'שיטת האשכנזים',sefardi:'שיטת הספרדים',tuk:'שיטת הגרי״מ טוקצ׳ינסקי',chazon:'כמו חזון שמיים',tzikoni:'לוח ממוצע (הרב ציקוני)',itim:'שיטת האשכנזים, שקיעה לפי הגובה',tanya:'שיטת בעל התניא',chul:'המקובל בחו״ל',gra:'שיטת הגר״א',custom:'שיטה מותאמת'}[s.zmPreset||'ashkenaz'];return '<span>זמני '+esc(place().name)+' · '+nm+' · ק״ש ותפילה: '+({gra:'גר״א',mga:'מג״א',both:'מג״א וגר״א'}[s.m_shma])+' · הדלקת נרות '+s.candleMins+' דק׳ לפני השקיעה</span><span>'+(s.secs?'':'מעוגל לחומרא')+'</span>'}
/* שורת תחתית: פרטי הזמנים, ומשמאל "נוצר ב־myluach.org". במסלולים בתשלום אפשר להסתיר את השורה. */
/* השורה "הופק ע"י MyLuach.org" מופיעה בכל הדפסה. רק במסלול המלא אפשר להסתיר אותה. */
const creditHideOk=()=>{const P=PLAN();return P.id==='full'&&!P.watermark&&!SAMPLE};
function creditOn(){return !(creditHideOk()&&state.s.credit===false)}
function creditHost(){const h=window.location.host;return /^(localhost|127\.|$)/.test(h)||/vercel\.app$/.test(h)?'myluach.org':h.replace(/^www\./,'')}
function addFootLine(p){
  const s=state.s,z=!s.noTimes&&s.zmanimMode!=='none'&&Object.values(s.zmanim).some(Boolean);
  if(!z&&!creditOn())return;
  const f=el('div','pg-foot',z?footText():'<span></span>');
  if(creditOn())f.insertAdjacentHTML('beforeend',EN?(LITE?'<span class="credit credit-lite">Created free with MyLuach.org · personal Jewish calendars with photos and zmanim</span>':'<span class="credit">Created with MyLuach.org</span>'):(LITE||PLAN().watermark)?'<span class="credit credit-lite"><img class="credit-logo" src="assets/logo.svg?v=2" alt="">הופק בחינם ע״י MyLuach.org · עיצוב לוח שנה אישי עם תמונות וזמנים</span>':'<span class="credit">הופק ע״י MyLuach.org</span>');
  p.appendChild(f);
}
/* ---------- לוח שנתי בעמוד אחד ---------- */
/* ---------- לוח ספירה לאחור ---------- */
const CD_STYLES={
  classic:{n:'קלאסי',goal:'🎉'},
  bride:{n:'כלה וחתונה: ורוד עתיק וזהב, פרחים',goal:'💍',acc:'#a8646f',font:'Bellefair',num:'Bellefair'},
  barmitzvah:{n:'בר מצווה: כחול וזהב, פסי טלית',goal:'✡',acc:'#1f3a5f',font:'Suez One',num:'Suez One'},
  batmitzvah:{n:'בת מצווה: ורוד וזהב, פרחים',goal:'🌸',acc:'#b8487a',font:'Secular One',num:'Secular One'},
  kids:{n:'ילדים: צבעוני ושמח',goal:'🎈',acc:'#e0663a',font:'Playpen Sans Hebrew',num:'Rubik Bubbles'},
  baby:{n:'לידה ותינוק: תכלת רך, עננים',goal:'👶',acc:'#5b8db8',font:'Playpen Sans Hebrew',num:'Playpen Sans Hebrew'},
  elegant:{n:'אלגנטי: שחור וזהב',goal:'✨',acc:'#2a2622',font:'Frank Ruhl Libre',num:'Bellefair'},
  nature:{n:'טבע: ירוק ועלים',goal:'🌿',acc:'#3f7a4f',font:'Assistant',num:'Secular One'},
  trip:{n:'טיול וחופשה: טורקיז וים',goal:'✈️',acc:'#1d8a96',font:'Varela Round',num:'Rubik Bubbles'}
};
/* תיאור קצר לכרטיסי הבחירה: שם, וצבעי רקע לדוגמה */
const CD_SW={classic:['#fff','#a3462b'],bride:['#fbf1f2','#c9a45c'],barmitzvah:['#eef3f9','#c9a45c'],batmitzvah:['#fdf0f5','#d8a94a'],kids:['#fff7e6','#e0663a'],baby:['#eef5fb','#9cc3e6'],elegant:['#f7f3ea','#b8954a'],nature:['#f0f6ee','#8db87a'],trip:['#e9f7f8','#f0b45a']};
/* קישוטים מקוריים לכל סגנון (SVG), ממוקמים בפינות העמוד */
function cdOrnaments(st){
  const flower=(c1,c2)=>'<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><path d="M8 8 C 60 20, 90 60, 100 120 S 150 180, 195 192" fill="none" stroke="'+c2+'" stroke-width="2.2"/><path d="M8 8 C 40 50, 30 90, 60 130" fill="none" stroke="'+c2+'" stroke-width="1.6"/>'+
    [[38,24,30],[70,52,-20],[92,92,40],[118,148,-30],[150,170,20],[30,62,60],[48,104,-40]].map(([x,y,r])=>'<ellipse cx="'+x+'" cy="'+y+'" rx="11" ry="4.5" transform="rotate('+r+' '+x+' '+y+')" fill="'+c2+'" opacity=".55"/>').join('')+
    [[60,30,9],[100,120,12],[170,186,8],[44,128,7]].map(([x,y,r])=>[0,72,144,216,288].map(a=>'<circle cx="'+(x+Math.cos(a*Math.PI/180)*r*.9).toFixed(1)+'" cy="'+(y+Math.sin(a*Math.PI/180)*r*.9).toFixed(1)+'" r="'+(r*.62).toFixed(1)+'" fill="'+c1+'" opacity=".85"/>').join('')+'<circle cx="'+x+'" cy="'+y+'" r="'+(r*.4).toFixed(1)+'" fill="'+c2+'"/>').join('')+'</svg>';
  const star=c=>'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="'+c+'" stroke-width="3"><polygon points="50,8 88,74 12,74"/><polygon points="50,92 12,26 88,26"/></g></svg>';
  const cloud=c=>'<svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg"><path d="M20 50 a14 14 0 0 1 4-27 a20 20 0 0 1 37-8 a16 16 0 0 1 28 6 a14 14 0 0 1 11 29 z" fill="'+c+'"/></svg>';
  switch(st){
    case 'bride':return '<div class="cd-orn tl">'+flower('#e8b7bf','#c9a45c')+'</div><div class="cd-orn br">'+flower('#e8b7bf','#c9a45c')+'</div>';
    case 'batmitzvah':return '<div class="cd-orn tl">'+flower('#f2a7c3','#d8a94a')+'</div><div class="cd-orn br">'+flower('#f2a7c3','#d8a94a')+'</div>';
    case 'barmitzvah':return '<div class="cd-stripes top"></div><div class="cd-stripes bot"></div><div class="cd-star s1">'+star('#c9a45c')+'</div><div class="cd-star s2">'+star('#c9a45c')+'</div>';
    case 'kids':return '<div class="cd-confetti"></div>';
    case 'baby':return '<div class="cd-cloud c1">'+cloud('#dbe9f6')+'</div><div class="cd-cloud c2">'+cloud('#e7f0f9')+'</div><div class="cd-cloud c3">'+cloud('#dbe9f6')+'</div>';
    case 'elegant':return '<div class="cd-frame"></div>';
    case 'nature':return '<div class="cd-orn tl">'+flower('#b9d8a8','#6a9a5b')+'</div><div class="cd-orn br">'+flower('#b9d8a8','#6a9a5b')+'</div>';
    case 'trip':return '<div class="cd-waves"></div><div class="cd-cloud c1">'+cloud('#d6eff2')+'</div><div class="cd-cloud c2">'+cloud('#e3f4f6')+'</div>';
    default:return '';
  }
}
/* פוסטר: כל הימים בדף אחד גדול, שורה לכל שבוע */
function cdPoster(ST){
  const s=state.s,{to,from,days}=cdDays(),title=s.cdTitle||'הספירה לאחור',ev=cdEvMap(from,to);
  const p=pageShell('ספירה לאחור · פוסטר','cd-poster');cdSetup(p,ST,s);p.classList.add('cd-poster');
  cdHead(p,title,dateLong(to)+' · '+cdLeft(cdN(to,from)),'cd-poster');
  const weeks=[];let w=null;for(const d of days){if(!w||d.getDay()===0){w={days:Array(7).fill(null),label:''};weeks.push(w)}w.days[d.getDay()]=d}
  let lastM='';for(const wk of weeks){const f=wk.days.find(Boolean),[k,t]=cdMonthKey(f);if(k!==lastM){wk.label=t.split(' ')[0];lastM=k}}
  const g=el('div','cdp-grid');g.style.gridTemplateRows='auto repeat('+weeks.length+',minmax(0,1fr))';
  g.innerHTML='<div></div>'+WEEKDAYS.map(x=>'<div class="wd">'+x+'</div>').join('')+weeks.map(wk=>'<div class="cdp-m">'+esc(wk.label)+'</div>'+wk.days.map(d=>{if(!d)return '<div></div>';const n=cdN(to,d),hd=new HDate(d);
    const im=n===0?cdImg('goal'):d.getTime()===from.getTime()?cdImg('first'):null,q=cdQuote(n),first=(s.calType==='heb'?hd.getDate():d.getDate())===1||d.getTime()===from.getTime();
    const all=!!s.cdMonthAll,st=dStyle(),hT=gem(hd.getDate())+(first||all?' '+hebMonthName(hd.getMonth(),isLeap(hd.getFullYear())):''),gT=d.getDate()+(first||all?' '+GREG_MONTHS[d.getMonth()]:'');
    const dt=st==='hebOnly'?hT:st==='gregOnly'?gT:st.startsWith('greg')?gT+' · '+hT:hT+' · '+gT;
    return '<div class="cdp-d'+(n===0?' goal':'')+(d.getDay()===6?' shabbat':'')+(n%7===0&&n?' wk':'')+(im?' has-im':'')+'" data-date="'+iso(d)+'">'+(im?'<img class="cd-im" alt="" src="'+im+'">':'')+'<span class="cdp-dt'+(first?' first':'')+'">'+esc(dt)+'</span><b>'+(n===0?ST.goal:n)+'</b>'+(()=>{const e=cdDayEvs(ev,d),z=cdZm(d);return (e.length?'<em class="cdp-e">'+esc(e.slice(0,2).join(' · '))+'</em>':'')+(z.length?'<em class="cdp-z">'+esc(z.join(' · '))+'</em>':'')})()+(q?'<em class="cdp-q">'+esc(q)+'</em>':'')+(s.cdCheck&&n?'<i class="cd-chk"></i>':'')+'</div>'}).join('')).join('');
  p.appendChild(g);
  p.insertAdjacentHTML('beforeend','<div class="cdp-legend">המספר הגדול: כמה ימים נשארו. צובעים או מסמנים כל יום שעבר.</div>');
  addFootLine(p);emitExtras('cd-poster');
}
/* לוח מספרים: כל הימים בטבלה אחת, למשל 100 ימים = 10×10, מהמספר הגדול לקטן */
function cdBoard(ST){
  const s=state.s,{to,from,days}=cdDays(),title=s.cdTitle||'הספירה לאחור',N=days.length;
  const [w,h]=pageDims(),cols=(N-1)%10===0&&N<=201?10:(N-1)%7===0&&N<=120?7:Math.max(5,Math.round(Math.sqrt(N*w/h)));
  const p=pageShell('ספירה לאחור · לוח מספרים','cd-board');cdSetup(p,ST,s);p.classList.add('cd-boardp');
  cdHead(p,title,(N-1)+' ימים · '+dateLong(to),'cd-board');
  const g=el('div','cdb-grid');g.style.gridTemplateColumns='repeat('+cols+',minmax(0,1fr))';g.style.gridTemplateRows='repeat('+Math.ceil(N/cols)+',minmax(0,1fr))';
  g.innerHTML=days.map(d=>{const n=cdN(to,d),hd=new HDate(d),q=cdQuote(n),im=n===0?cdImg('goal'):d.getTime()===from.getTime()?cdImg('first'):null;
    return '<div class="cdb-d'+(n===0?' goal':'')+(n%10===0&&n?' ten':'')+(im?' has-im':'')+'" data-date="'+iso(d)+'"'+(q?' title="'+esc(q)+'"':'')+'>'+(im?'<img class="cd-im" alt="" src="'+im+'">':'')+'<b>'+(n===0?ST.goal:n)+'</b><small>'+esc(dStyle().startsWith('greg')?d.getDate()+'.'+(d.getMonth()+1):gem(hd.getDate())+' '+hebMonthName(hd.getMonth(),isLeap(hd.getFullYear())))+'</small>'+(s.cdCheck&&n?'<i class="cd-chk"></i>':'')+'</div>'}).join('');
  p.appendChild(g);
  if(s.cdQuotes){const qs=days.map(d=>cdN(to,d)).filter(n=>cdQuote(n)).slice(0,6).map(n=>'<span><b>'+n+':</b> '+esc(cdQuote(n))+'</span>');if(qs.length)p.insertAdjacentHTML('beforeend','<div class="cdb-q">'+qs.join('')+'</div>')}
  addFootLine(p);emitExtras('cd-board');
}
/* דף צר וארוך לגלילה בטלפון: שורה לכל יום */
function cdScroll(ST){
  const s=state.s,{to,from,days}=cdDays(),title=s.cdTitle||'הספירה לאחור';
  const p=pageShell('ספירה לאחור · לגלילה','cd-scroll'),cev=cdEvMap(from,to);cdSetup(p,ST,s);p.classList.add('cd-scroll');
  cdHead(p,title,dateLong(to),'cd-scroll');let h='<div class="cds-list">';let lastM='';
  for(const d of days){const [k,t]=cdMonthKey(d);if(k!==lastM){h+='<div class="cds-m">'+esc(t)+'</div>';lastM=k}
    const n=cdN(to,d),hd=new HDate(d),ev=eventsOn(d,hd).map(e=>eventLabel(e,d,hd)).concat(cdDayEvs(cev,d),cdZm(d));
    const q=cdQuote(n),im=n===0?cdImg('goal'):d.getTime()===from.getTime()?cdImg('first'):null;if(im)h+='<img class="cds-im" alt="" src="'+im+'">';
    h+='<div class="cds-r'+(n===0?' goal':'')+(d.getDay()===6?' shabbat':'')+'"><b class="cds-n">'+(n===0?ST.goal:n)+'</b><span class="cds-dt">'+esc(WEEKDAYS[d.getDay()])+' '+esc(hebShort(hd))+'<small>'+esc(gregShort(d))+'</small></span><span class="cds-e">'+esc(n===0?'היום!':ev.join(' · '))+(q?'<em class="cd-q">'+esc(q)+'</em>':'')+'</span>'+(s.cdCheck&&n?'<i class="cd-chk"></i>':'')+'</div>'}
  p.insertAdjacentHTML('beforeend',h+'</div>');addFootLine(p);emitExtras('cd-scroll');
}
/* שרשרת נייר: רצועות לגזירה, אחת לכל יום. כל יום תולשים חוליה */
function cdChain(ST){
  const s=state.s,{to,days}=cdDays(),title=s.cdTitle||'';
  const per=16,pal=['var(--acc)','#e0b84a','#6f9fc9','#d77a8f','#7cb07c','#a78bd0'];
  for(let i=0;i<days.length;i+=per){
    const p=pageShell('שרשרת · '+(i/per+1),'cd-chain-'+(i/per));cdSetup(p,ST,s);p.classList.add('cd-chainp');
    const g=el('div','cdc-grid');
    g.innerHTML=days.slice(i,i+per).map((d,j)=>{const n=cdN(to,d),hd=new HDate(d),c=s.cdStyle==='kids'?pal[(i+j)%pal.length]:'var(--acc)';
      return '<div class="cdc-s" style="--sc:'+c+'"><b>'+(n===0?ST.goal:n)+'</b><span>'+esc(n===0?'היום!':cdLeft(n))+'</span><small>'+(cdQuote(n)?esc(cdQuote(n))+'<br>':'')+esc(title)+' · '+esc(hebShort(hd))+'</small></div>'}).join('');
    p.appendChild(g);p.insertAdjacentHTML('beforeend','<div class="cdp-legend">גוזרים לאורך הקווים, מחברים את הרצועות לשרשרת מהמספר הגדול לקטן, ותולשים חוליה בכל ערב.</div>');
    emitExtras('cd-chain-'+(i/per));
  }
}
function dateLong(d){const hd=new HDate(d);return WEEKDAYS[d.getDay()]+', '+hebShort(hd)+' '+hebYearStr(hd.getFullYear())+' · '+gregShort(d)+' '+d.getFullYear()}
/* משפטים לספירה לאחור: פסוקים (עם מקור) ומשפטים מקוריים */
const CD_QUOTES={
  bride:['קול ששון וקול שמחה, קול חתן וקול כלה (ירמיהו לג)','שוש אשיש בה׳, תגל נפשי באלוקי (ישעיהו סא)','אני לדודי ודודי לי (שיר השירים ו)','מים רבים לא יוכלו לכבות את האהבה (שיר השירים ח)','וארשתיך לי לעולם (הושע ב)',
    'כל יום מקרב אותנו לבית נאמן בישראל','עוד קצת ומתחילים לבנות בית','סופרים ימים, אוספים ברכות','הלב כבר מתחיל לרקוד','כל יום שעובר הוא צעד אל החופה','האהבה גדלה, הימים מתקצרים','מתכוננים לרגע הכי מרגש'],
  barmitzvah:['בן שלוש עשרה למצוות (אבות ה)','תורה ציווה לנו משה, מורשה קהילת יעקב (דברים לג)','שמע בני מוסר אביך ואל תטוש תורת אמך (משלי א)','חנוך לנער על פי דרכו (משלי כב)','עץ חיים היא למחזיקים בה (משלי ג)',
    'כל יום מקרב אותך לעלייה לתורה','עוד מעט מניחים תפילין בפעם הראשונה','מתכוננים לקרוא בתורה בקול גדול','גדלים במצוות, יום אחרי יום','כל המשפחה סופרת איתך','כל יום של לימוד הוא מתנה'],
  batmitzvah:['רבות בנות עשו חיל ואת עלית על כולנה (משלי לא)','כל כבודה בת מלך פנימה (תהלים מה)','פיה פתחה בחכמה ותורת חסד על לשונה (משלי לא)','אשה יראת ה׳ היא תתהלל (משלי לא)',
    'כל יום מקרב אותך לחגיגה הגדולה','גדלה בחסד, בחכמה ובאמונה','מתכוננות לשמחה גדולה','כל מצווה קטנה היא אבן דרך','הבית מתמלא שמחה לקראתך'],
  baby:['על הילד הזה התפללתי (שמואל א א)','הנה נחלת ה׳ בנים, שכר פרי הבטן (תהלים קכז)','בניך כשתילי זיתים סביב לשולחנך (תהלים קכח)',
    'בעוד מעט נכיר אותך','מכינים לך מקום בלב ובבית','כל יום מקרב חיבוק ראשון','מחכים לך באהבה','הכי שווה לחכות לך'],
  kids:['עוד קצת ומגיעים!','מחכים בסבלנות, קופצים משמחה','כל ערב תולשים, כל בוקר שמחים','עוד כמה לילות שינה','שמחה בדרך!','כל יום הוא צעד קדימה','מי סופר הכי יפה?','עוד מעט חוגגים!'],
  classic:['זה היום עשה ה׳, נגילה ונשמחה בו (תהלים קיח)','כל יום הוא צעד קדימה','שמחה בדרך!','סופרים יחד, שמחים יחד','עוד קצת וזה כאן','הדרך יפה לא פחות מהיעד']
};
if(EN)Object.assign(CD_QUOTES,{
  bride:['The voice of joy and the voice of gladness, the voice of the groom and the voice of the bride (Jeremiah 33)','I am my beloved’s and my beloved is mine (Song of Songs 6)','Every day brings us closer to building a home','Counting days, collecting blessings','Our hearts are already dancing','Almost there!'],
  barmitzvah:['At thirteen, ready for mitzvot (Avot 5)','The Torah Moshe commanded us is the heritage of the congregation of Jacob (Deut. 33)','Every day brings you closer to your aliyah','Soon you will put on tefillin for the first time','Growing in mitzvot, one day at a time'],
  batmitzvah:['Many daughters have done valiantly, but you surpass them all (Proverbs 31)','She opens her mouth with wisdom (Proverbs 31)','Every day brings you closer to the big celebration','Growing in kindness, wisdom and faith','Every small mitzvah is a milestone'],
  baby:['For this child I prayed (Samuel I 1)','Children are a heritage from Hashem (Psalms 127)','Soon we will meet you','Getting your place ready, in our hearts and our home','Waiting for you with love'],
  kids:['Almost there!','Waiting patiently, jumping with joy','Tear one off each night, smile each morning','Just a few more sleeps','Joy is on its way!'],
  classic:['This is the day Hashem has made; let us rejoice in it (Psalms 118)','Every day is a step forward','Joy is on its way!','Counting together, celebrating together','Almost here!']});
function cdQuote(n){const s=state.s;if(!s.cdQuotes||n<=0)return '';const every=+s.cdQEvery||10;if(n%every)return '';
  const own=String(s.cdQCustom||'').split('\n').map(x=>x.trim()).filter(Boolean);
  const L=own.length?own:CD_QUOTES[s.cdQTopic&&s.cdQTopic!=='auto'?s.cdQTopic:s.cdStyle]||CD_QUOTES.classic;return L[Math.floor(n/every)%L.length]}
const cdImg=k=>((state.cdImgs||{})[k]||{}).img||null;
function cdCfg(){const s=state.s,t=new Date(),d0=new Date(t.getFullYear(),t.getMonth(),t.getDate(),12);
  const to=s.cdDate||iso(new Date(d0.getFullYear(),d0.getMonth()+3,d0.getDate(),12)),from=s.cdFrom||iso(d0);return {to,from}}
function cdLeft(n){const s=state.s;if(n===0)return 'היום!';if(n===1)return 'מחר!';
  if(s.cdUnit==='weeks'&&n>=7){const w=Math.floor(n/7),r=n%7;return 'עוד '+(w===1?'שבוע':w===2?'שבועיים':w+' שבועות')+(r?' ו־'+(r===1?'יום':r===2?'יומיים':r+' ימים'):'')}
  return 'עוד '+(n===2?'יומיים':n+' ימים')}
function cdDays(){const c=cdCfg(),to=dateFromIso(c.to);let from=dateFromIso(c.from);if(from>to)from=to;const L=[];for(let d=new Date(from);d<=to&&L.length<1500;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12))L.push(d);return {to,from,days:L}}
/* גובה הדף הארוך לגלילה: כותרת + שורה לכל יום + כותרת לכל חודש */
function cdScrollH(){const {days}=cdDays();const months=new Set(days.map(d=>state.s.calType==='heb'?(()=>{const h=new HDate(d);return h.getFullYear()+'-'+h.getMonth()})():d.getFullYear()+'-'+d.getMonth())).size;return Math.round(70+days.length*11+months*13)}
function cdSetup(p,ST,s){p.classList.add('cd-page','cdst-'+(s.cdStyle||'classic'));if(cdImg('bg')){p.insertAdjacentHTML('beforeend','<img class="cd-bgimg" alt="" src="'+cdImg('bg')+'" style="opacity:'+(+s.cdBgOp||0.25)+'">');p.classList.add('has-bg')}if(ST.acc)p.style.setProperty('--acc',ST.acc);if(ST.font)p.style.setProperty('--cd-f',fontCSS(ST.font));if(ST.num)p.style.setProperty('--cd-nf',fontCSS(ST.num));p.insertAdjacentHTML('beforeend',cdOrnaments(s.cdStyle))}
function cdMonthKey(d){const s=state.s;if(s.calType==='heb'){const h=new HDate(d);return [h.getFullYear()+'-'+h.getMonth(),hebMonthName(h.getMonth(),isLeap(h.getFullYear()))+' '+hebYearStr(h.getFullYear())]}return [d.getFullYear()+'-'+d.getMonth(),GREG_MONTHS[d.getMonth()]+' '+d.getFullYear()]}
const cdN=(to,d)=>Math.round((to-d)/864e5);
/* מה יופיע בכל יום בלוח הספירה: פרשה, חגים, ראש חודש, ועד 5 זמנים */
const CD_ZOPTS=[['alot','עלות השחר'],['misheyakir','משיכיר'],['sunrise','הנץ'],['shma','סוף ק״ש'],['tfila','סוף תפילה'],['chatzot','חצות'],['minchaG','מנחה גדולה'],['plag','פלג המנחה'],['sunset','שקיעה'],['tzeit','צאת הכוכבים'],['candle','הדלקת נרות'],['havdalah','צאת שבת']];
function cdShow(k){const o=state.s.cdShow||{};return o[k]!==false}
function cdEvMap(from,to){const s=state.s,keep={showParasha:s.showParasha,showRC:s.showRC,showHolidays:s.showHolidays};
  s.showParasha=cdShow('parasha');s.showRC=cdShow('rc');s.showHolidays=true;try{return eventsFor(from,to)}finally{Object.assign(s,keep)}}
function cdDayEvs(ev,d){const L=ev.get(ymd(d))||[],out=[],z=state.s.cdZ||[];
  for(const x of L){if(x.cls==='parasha'){if(cdShow('parasha'))out.push(x.text);continue}
    if(x.cls==='timed'){if((x.tkind==='candle'&&z.includes('candle'))||(x.tkind==='havdalah'&&z.includes('havdalah')))out.push(x.text);continue}
    const rc=/ראש חודש/.test(x.text);if(rc?cdShow('rc'):(cdShow('chag')&&(x.chag||x.cls===''||x.cls==='chag')))out.push(x.text)}
  return out}
function cdZm(d){const s=state.s,z=(s.cdZ||[]).filter(k=>k!=='candle'&&k!=='havdalah');if(!z.length)return [];const keep=s.zmanim;
  s.zmanim=Object.fromEntries(z.map(k=>[k,true]));try{return zmanimFor(d).map(x=>x.k+' '+x.v)}catch(e){return []}finally{s.zmanim=keep}}
const cdDT=(d,hd)=>dateTop(d,hd,!!state.s.cdMonthAll);
/* כותרת עמוד בספירה: כותרת ושורת משנה שאפשר לערוך ישירות בתצוגה */
function cdHead(p,title,sub,key){const h=el('div','cd-head');
  h.appendChild(editable('cd-title',state.s.cdTitle||'','לחצו לכתיבת כותרת: למה סופרים?',t=>{state.s.cdTitle=t;save();const x=$('#cdTitle');if(x&&document.activeElement!==x)x.value=t}));
  const ov=(state.slots[key]||{}).cdSub;h.appendChild(editable('cd-sub',ov!=null&&ov!==''?ov:sub,'',t=>{state.slots[key]={...(state.slots[key]||{}),cdSub:t};save()}));
  p.appendChild(h)}
/* דף פתיחה ודף סיום: עמוד מלא עם התמונה, הכותרת והתאריך */
function cdIntroPage(ST){const s=state.s,{to,from}=cdDays(),n=cdN(to,from),im=cdImg('first');
  const p=pageShell('דף פתיחה','cd-intro');cdSetup(p,ST,s);p.classList.add('cd-introp');
  const box=el('div','cdi-in');box.innerHTML=(im?'<img class="cdi-im" alt="" src="'+im+'">':'');
  box.appendChild(editable('cdi-title',s.cdTitle||'','לחצו לכתיבת כותרת',t=>{s.cdTitle=t;save();const x=$('#cdTitle');if(x)x.value=t}));
  box.insertAdjacentHTML('beforeend','<div class="cdi-big"><b>'+n+'</b><span>'+(n===1?'יום':n===2?'יומיים':'ימים')+'</span></div><div class="cdi-sub">'+esc(dateLong(to))+'</div>');
  box.appendChild(editable('cdi-txt',s.cdIntroText||'','לחצו להוספת משפט פתיחה (לא חובה)',t=>{s.cdIntroText=t;save();const x=$('#cdIntroText');if(x)x.value=t},true));p.appendChild(box);
  addFootLine(p);emitExtras('cd-intro')}
function cdOutroPage(ST){const s=state.s,{to}=cdDays(),im=cdImg('goal');
  const p=pageShell('דף סיום','cd-outro');cdSetup(p,ST,s);p.classList.add('cd-introp','cd-outrop');
  const box=el('div','cdi-in');box.innerHTML=(im?'<img class="cdi-im" alt="" src="'+im+'">':'<div class="cdi-goal">'+ST.goal+'</div>');
  box.appendChild(editable('cdi-title',s.cdOutroText||'הגענו! מזל טוב!','לחצו לכתיבת טקסט הסיום',t=>{s.cdOutroText=t;save();const x=$('#cdOutroText');if(x)x.value=t}));
  box.insertAdjacentHTML('beforeend','<div class="cdi-sub">'+esc(s.cdTitle||'')+(s.cdTitle?' · ':'')+esc(dateLong(to))+'</div>');p.appendChild(box);
  addFootLine(p);emitExtras('cd-outro')}
function countdownPages(){
  const s=state.s,ST=CD_STYLES[s.cdStyle]||CD_STYLES.classic;
  if(ST.font)loadFont(ST.font);if(ST.num)loadFont(ST.num);
  const pg=(s.cdLayout||'months')!=='scroll';/* בדף הארוך לטלפון אין עמודים נפרדים */
  if(s.cdIntro&&pg)cdIntroPage(ST);
  cdBody(ST);
  if(s.cdOutro&&pg)cdOutroPage(ST);
}
function cdBody(ST){
  const s=state.s,lay=s.cdLayout||'months';
  if(lay==='poster')return cdPoster(ST);if(lay==='board')return cdBoard(ST);if(lay==='scroll')return cdScroll(ST);if(lay==='chain')return cdChain(ST);
  const c=cdCfg(),to=dateFromIso(c.to);let from=dateFromIso(c.from);if(from>to)from=to;
  const title=s.cdTitle||'הספירה לאחור';
  const ev=cdEvMap(from,to);
  /* חלוקה לחודשים: עבריים או לועזיים לפי סוג הלוח */
  const groups=[];let cur=null;
  for(let d=new Date(from);d<=to&&groups.length<36;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12)){
    const hd=new HDate(d),key=s.calType==='heb'?hd.getFullYear()+'-'+hd.getMonth():d.getFullYear()+'-'+d.getMonth();
    if(!cur||cur.key!==key){cur={key,days:[],t:s.calType==='heb'?hebMonthName(hd.getMonth(),isLeap(hd.getFullYear()))+' '+hebYearStr(hd.getFullYear()):GREG_MONTHS[d.getMonth()]+' '+d.getFullYear()};groups.push(cur)}
    cur.days.push(d)}
  /* חודש ראשון או אחרון קצר (פחות משבוע) מצטרף לחודש הסמוך */
  if(groups.length>1&&groups[0].days.length<7){const a=groups.shift();groups[0].days=a.days.concat(groups[0].days);groups[0].t=a.t.split(' ')[0]+' – '+groups[0].t}
  if(groups.length>1&&groups.at(-1).days.length<7){const z=groups.pop();groups.at(-1).days.push(...z.days);groups.at(-1).t=groups.at(-1).t.split(' ')[0]+' – '+z.t}
  const total=Math.round((to-from)/864e5);
  groups.forEach((g,gi)=>{
    const p=pageShell(g.t+' · ספירה לאחור','cd-'+g.key);cdSetup(p,ST,s);
    const first=Math.round((to-g.days[0])/864e5);
    cdHead(p,title,g.t+' · '+cdLeft(first),'cd-'+g.key);
    const grid=el('div','cd-grid');grid.style.gridTemplateRows='auto repeat('+Math.ceil((g.days[0].getDay()+g.days.length)/7)+',minmax(0,1fr))';
    WEEKDAYS.forEach(w=>grid.appendChild(el('div','wd',w)));
    for(let i=0;i<g.days[0].getDay();i++)grid.appendChild(el('div','cd-d pad'));
    for(const d of g.days){
      const n=Math.round((to-d)/864e5),hd=new HDate(d),its=cdDayEvs(ev,d).map(text=>({text})),pers=eventsOn(d,hd),zm=cdZm(d);
      const im=n===0?cdImg('goal'):d.getTime()===from.getTime()?cdImg('first'):((pers.find(e=>e.img)||{}).img||null),q=cdQuote(n);
      const c2=el('div','cd-d'+(d.getDay()===6?' shabbat':'')+(n===0?' goal':'')+(n%7===0&&n?' wk':'')+(im?' has-im':'')+(q?' has-q':''));c2.dataset.date=iso(d);
      c2.innerHTML='<div class="cd-dt">'+cdDT(d,hd)+'</div><div class="cd-n">'+(n===0?ST.goal:n)+'</div><div class="cd-l">'+esc(n===0?'היום!':n===1?'מחר!':s.cdUnit==='weeks'&&n>=7?cdLeft(n).replace('עוד ',''):(n===2?'יומיים':'ימים'))+'</div>'+
        pers.map(e=>({text:eventLabel(e,d,hd)})).concat(its).slice(0,3).map(x=>'<div class="cd-e">'+esc(x.text)+'</div>').join('')+(zm.length?'<div class="cd-z">'+zm.map(esc).join(' · ')+'</div>':'')+(q?'<div class="cd-q">'+esc(q)+'</div>':'')+(s.cdCheck&&n?'<i class="cd-chk" aria-hidden="true"></i>':'');
      if(im)c2.insertAdjacentHTML('afterbegin','<img class="cd-im" alt="" src="'+im+'">');
      grid.appendChild(c2)}
    const tot=g.days[0].getDay()+g.days.length;for(let i=tot;i<Math.ceil(tot/7)*7;i++)grid.appendChild(el('div','cd-d pad'));
    p.appendChild(grid);
    const done=Math.max(0,total-first);p.insertAdjacentHTML('beforeend','<div class="cd-bar"><i style="width:'+(total?Math.round(done/total*100):100)+'%"></i></div>');
    addFootLine(p);applyBanner(p,'cd-'+g.key);emitExtras('cd-'+g.key);
  });
}
function yearPage(months,evMap){
  const s=state.s,ds=s.dateStyle||'hebMain',heb=s.calType==='heb';
  const title=heb&&(+s.hebStart||7)===7?'לוח שנה '+hebYearStr(+s.hebYear):months[0].title+' '+months[0].year+' – '+months.at(-1).title+' '+months.at(-1).year;
  const p=pageShell('לוח שנתי','year');p.classList.add('year-page');
  p.appendChild(el('div','yr-title',esc(title)));
  const g=el('div','yr-grid');g.style.setProperty('--yc',s.orient==='landscape'?(months.length>12?5:4):(months.length>12?4:3));
  const num=d=>{const hd=new HDate(d),hn=gem(hd.getDate()).replace(/[׳״]/g,''),gn=d.getDate();
    if(ds==='hebOnly')return '<b>'+hn+'</b>';if(ds==='gregOnly')return '<b>'+gn+'</b>';
    if(ds==='gregMain')return '<b>'+gn+'</b><i>'+hn+'</i>';return '<b>'+hn+'</b><i>'+gn+'</i>'};
  for(const mo of months){
    const box=el('div','yr-mo');box.innerHTML='<div class="yr-mh">'+esc(mo.title)+' <small>'+esc(mo.other)+'</small></div>';
    let h='<div class="yr-days">'+['א','ב','ג','ד','ה','ו','ש'].map(x=>'<span class="yr-wd">'+x+'</span>').join('');
    for(let i=0;i<mo.days[0].getDay();i++)h+='<span></span>';
    const notes=[];
    for(const d of mo.days){
      const hd=new HDate(d),items=evMap.get(ymd(d))||[],chag=items.find(i=>i.chag),pers=eventsOn(d,hd);
      const tip=items.filter(i=>i.chag||(i.cls===''&&!i.learn)).map(i=>i.text).concat(pers.map(e=>eventLabel(e,d,hd))).join(' · ');
      h+='<span class="yr-d'+(d.getDay()===6?' sh':'')+(chag?' ch':'')+(pers.length?' pe':'')+'" data-date="'+iso(d)+'"'+(tip?' title="'+esc(tip)+'"':'')+'>'+num(d)+'</span>';
      const dn=heb?gem(hd.getDate()):String(d.getDate());
      if(chag)notes.push('<span class="yn-h">'+dn+' '+esc(chag.text)+'</span>');
      for(const e of pers)notes.push('<span class="yn-p">'+dn+' '+esc(eventLabel(e,d,hd))+'</span>');
    }
    box.insertAdjacentHTML('beforeend',h+'</div>'+(notes.length?'<div class="yr-notes">'+notes.join('')+'</div>':''));
    g.appendChild(box);
  }
  p.appendChild(g);addFootLine(p);
}
function addFoot(p){
  const s=state.s;
  addFootLine(p);
}
const hebShort=hd=>gem(hd.getDate())+' '+hebMonthName(hd.getMonth(),isLeap(hd.getFullYear()));
const gregShort=d=>EN?GREG_MONTHS[d.getMonth()]+' '+d.getDate():d.getDate()+(EN?' ':' ב')+GREG_MONTHS[d.getMonth()];
function dayItems(d,evMap,dropTimed){
  const hd=new HDate(d),dow=d.getDay();
  const items=(evMap.get(ymd(d))||[]).filter(it=>!(dropTimed&&it.tkind&&(dow===5||dow===6))&&!((it.learn||it.cls==='moon')&&placeOf('learn')==='none')).sort((a,b)=>a.order-b.order);
  const pers=placeOf('personal')==='none'?[]:personalOnly(d,hd),ged=placeOf('yz')==='none'?[]:gedolimFor(hd,true);
  return {hd,dow,items,pers,ged,all:items.concat(pers,ged),img:eventsOn(d,hd).find(e=>e.img),chag:items.some(i=>i.chag)};
}
function headRow(p,big,year,other){
  const head=el('div','pg-head');
  head.appendChild(el('div','pg-month',esc(big)));head.appendChild(el('div','pg-year',esc(year)));head.appendChild(el('div','pg-other',esc(other)));
  p.appendChild(head);
}
const DSTYLES={hebMain:'עברי מודגש, לועזי קטן',gregMain:'לועזי מודגש, עברי קטן',both:'עברי ולועזי שווים',hebOnly:'רק עברי',gregOnly:'רק לועזי'};
function dStyle(){const s=state.s;return DSTYLES[s.dateStyle]?s.dateStyle:(s.calType==='greg'?'gregMain':'hebMain')}
/* שם החודש בקטן ליד מספר היום (העברי, הלועזי או שניהם, לפי צורת הצגת התאריכים) */
const GREG_SHORT=['ינו׳','פבר׳','מרץ','אפר׳','מאי','יוני','יולי','אוג׳','ספט׳','אוק׳','נוב׳','דצמ׳'];
function dayMonthInline(top,d,hd){const st=dStyle(),hm=hebMonthName(hd.getMonth(),isLeap(hd.getFullYear())),gm=EN?GREG_MONTHS[d.getMonth()].slice(0,3):GREG_SHORT[d.getMonth()];
  const add=(n,m)=>{if(n&&!n.textContent.includes(m.replace('׳','')))n.insertAdjacentHTML('beforeend',' <span class="d-mn">'+esc(m)+'</span>')};
  const mains=top.querySelectorAll('.d-main'),sub=top.querySelector('.d-sub:not(.mk)');
  if(st==='hebOnly')add(mains[0],hm);else if(st==='gregOnly')add(mains[0],gm);
  else if(st==='gregMain'){add(mains[0],gm);add(sub,hm)}else if(st==='both'){add(mains[0],hm);add(mains[1],gm)}else{add(mains[0],hm);add(sub,gm)}}
function dayMonthTxt(d,hd){const st=dStyle(),hm=hebMonthName(hd.getMonth(),isLeap(hd.getFullYear())),gm=GREG_MONTHS[d.getMonth()];
  return st==='hebOnly'?hm:st==='gregOnly'?gm:st==='gregMain'?gm+' · '+hm:hm+' · '+gm}
function dateTop(d,hd,long){
  const s=state.s,st=dStyle(),leap=isLeap(hd.getFullYear());
  const H=gem(hd.getDate()),G=String(d.getDate());
  const hm=hebMonthName(hd.getMonth(),leap),gm=GREG_MONTHS[d.getMonth()];
  const hFirst=hd.getDate()===1,gFirst=d.getDate()===1;
  const hLab=long?H+' '+hm:(hFirst&&s.calType!=='heb'?H+' '+hm:H);
  const gLab=long?G+' '+gm:(gFirst&&s.calType!=='greg'?G+' '+gm:G);
  const mark=(t,isFirst)=>isFirst&&!long?'<b>'+esc(t)+'</b>':esc(t);
  const subH=long?esc(hLab):(hFirst?'<b>'+esc(H+' '+hm)+'</b>':esc(H));
  const subG=long?esc(gLab):(gFirst?'<b>'+esc(G+' '+gm)+'</b>':esc(G));
  switch(st){
    case 'gregMain':return '<span class="d-main">'+esc(long?G:gLab)+'</span><span class="d-sub">'+subH+'</span>';
    case 'both':return '<span class="d-main">'+esc(long?hLab:H)+'</span><span class="d-main d-main2">'+esc(long?gLab:G)+'</span>'+(!long&&(hFirst&&s.calType!=='heb'||gFirst&&s.calType!=='greg')?'<span class="d-sub mk">'+(hFirst&&s.calType!=='heb'?'<b>'+esc(hm)+'</b>':'<b>'+esc(gm)+'</b>')+'</span>':'');
    case 'hebOnly':return '<span class="d-main">'+esc(long?H:hLab)+'</span>'+(long?'<span class="d-sub">'+esc(hm)+'</span>':'');
    case 'gregOnly':return '<span class="d-main">'+esc(long?G:gLab)+'</span>'+(long?'<span class="d-sub">'+esc(gm)+'</span>':'');
    default:return '<span class="d-main">'+esc(long?H:hLab)+'</span><span class="d-sub">'+subG+'</span>';
  }
}
function yzHintOnPage(p){
  if(placeOf('yz')!=='none'||state.s.yzHintOff||RS.yzHint)return;RS.yzHint=true;
  const h=el('div','yz-hint-page no-print','<div class="yh-t"><b>אפשר להוסיף אירועים בדברי ימי ישראל</b><span>ימי פטירה של גדולי ישראל ואירועים מההיסטוריה היהודית. בכל עת אפשר להוסיף אותם בהגדרות, בשלב "מה יופיע בלוח".</span></div><div class="yh-b"><button class="btn primary" type="button" data-yh="on">להוסיף עכשיו</button><button class="btn" type="button" data-yh="off">לא עכשיו</button></div>');
  h.addEventListener('click',e=>{const b=e.target.closest('[data-yh]');if(!b)return;e.stopPropagation();if(b.dataset.yh==='on')state.s.place={...(state.s.place||{}),yz:'page'};else state.s.yzHintOff=true;save();syncUI();render()});
  p.appendChild(h);
}
function addMonthGrid(p,mo,evMap){
  yzHintOnPage(p);
  const s=state.s;
  const head=el('div','pg-head');
  head.appendChild(el('div','pg-month',esc(mo.title)));head.appendChild(el('div','pg-year',esc(mo.year)));head.appendChild(el('div','pg-other',dStyle().endsWith('Only')?'':esc(mo.other)));
  p.appendChild(head);
  const lead=mo.days[0].getDay(),total=lead+mo.days.length,rows=Math.ceil(total/7);
  const grid=el('div','grid');fxGridStyle(grid,rows);
  WEEKDAYS.forEach(w=>grid.appendChild(el('div','wd',w)));
  for(let i=0;i<lead;i++)grid.appendChild(el('div','cell pad'));
  for(const d of mo.days){
    const hd=new HDate(d),dow=d.getDay();
    const items=(evMap.get(ymd(d))||[]).filter(it=>!(s.zmanimMode==='table'&&it.tkind&&(dow===5||dow===6))&&!((it.learn||it.cls==='moon')&&placeOf('learn')!=='cell')).sort((a,b)=>a.order-b.order);
    const isChag=items.some(i=>i.chag);
    const c=el('div','cell'+(dow===6?' shabbat':'')+(isChag?' chag':''));
    c.dataset.date=iso(d);c.tabIndex=0;c.setAttribute('role','button');
    const hDay=gem(hd.getDate());
    c.setAttribute('aria-label',hDay+' '+hebMonthName(hd.getMonth(),isLeap(hd.getFullYear()))+', '+d.getDate()+(EN?' ':' ב')+GREG_MONTHS[d.getMonth()]+'. הוספת אירוע');
    c.appendChild(el('div','d-top'+(dStyle()==='both'?' both':''),dateTop(d,hd)));
    if(s.dayMonth)dayMonthInline(c.lastChild,d,hd);
    for(const it of items.concat(placeOf('personal')==='cell'?personalOnly(d,hd):[],placeOf('yz')==='cell'?gedolimFor(hd,false):[])){if(!it.text)continue;const e=el('div','e '+it.cls+(String(it.text).includes('\n')?' ml':''));e.textContent=it.text;c.appendChild(e)}
    const imgEvs=eventsOn(d,hd).filter(e=>e.img),withImg=imgEvs.length===1?imgEvs[0]:null;
    if(imgEvs.length)c.insertAdjacentHTML('beforeend','<button type="button" class="c-imgbtn no-print" data-dayimgs="'+iso(d)+'" title="סידור התמונות ביום: הזזה, גודל, והוספת עוד תמונות" aria-label="סידור התמונות ביום">🖼</button>');
    if(imgEvs.length>1){c.prepend(dayImgsEl(iso(d),imgEvs));c.classList.add('has-img','multi-img')}
    if(withImg){const im=el('img','c-img'+(withImg.imgFit==='contain'?' contain':''));im.src=withImg.img;im.alt='';{const t=((state.dayImgs||{})[iso(d)]||{}).im||{};imgXform(im,t[withImg.id],withImg)}c.prepend(im);c.classList.add('has-img');
      const tone=withImg.textTone||'auto';
      if(tone==='band'||(tone==='auto'&&s.imgText==='band')){}
      else{
        c.classList.add('img-auto');
        const L=withImg.imgLum||{top:.5,bot:.5};
        const pick=v=>tone==='light'?'light':tone==='dark'?'dark':(v<0.58?'light':'dark');
        c.classList.add('top-'+pick(withImg.imgFit==='contain'?1:L.top),'bot-'+pick(withImg.imgFit==='contain'?1:L.bot));
      }
    }
    {const zs=zDay(d);if(zs.length)c.appendChild(el('div','d-z',zWithX(d,zs).join('<br>')))}
    grid.appendChild(c);
  }
  for(let i=total;i<rows*7;i++)grid.appendChild(el('div','cell pad'));
  const cols=colsCfg().filter(c=>c.types.some(t=>t==='zmanim'?zAnyCol():t==='img'||t==='ad'?canF('banners'):placeOf(t)==='col'));
  if(cols.length){
    const row=el('div','grid-row');
    const dl=d=>{const hd=new HDate(d);return dStyle().startsWith('greg')?gregShort(d):hebShort(hd)};
    const R=[],Lf=[];
    for(const col of cols){
      const onlyLearn=col.types.length===1&&col.types[0]==='learn';
      const pan=el('div','yz-panel'+(onlyLearn?' learn-panel':''));pan.style.width=(+col.w||(onlyLearn?12:26))+'%';pan.dataset.col=col.id;
      const body=el('div','yz-panel-b');
      const section=(title,getter,empty)=>{
        const sec=el('div','yzp-sec');sec.appendChild(el('div','yz-panel-h',esc(title)));let n=0;
        for(const d of mo.days){const L=getter(d);if(!L.length)continue;const day=el('div','yzp-day');day.appendChild(el('span','yzp-d',esc(dl(d))));
          for(const it of L){const e=el('span','yzp-e'+(it.cls&&it.cls!=='gadol'?' '+it.cls:''));e.textContent=stripYP(it.text);day.appendChild(e);n++}sec.appendChild(day)}
        if(!n)sec.appendChild(el('div','yzp-empty',esc(empty)));body.appendChild(sec)};
      for(const t of col.types){
        if((t==='img'||t==='ad')&&canF('banners')){
          const id=col.id+(t==='ad'?'-ad':''),per=!!col.imgPer,get=()=>per?((state.slots[mo.key]||{}).colimg||{})[id]||{}:(state.colImgs||{})[id]||{};
          const put=v=>{if(per){const sl=state.slots[mo.key]||{};state.slots[mo.key]={...sl,colimg:{...(sl.colimg||{}),[id]:{...get(),...v}}}}else state.colImgs={...(state.colImgs||{}),[id]:{...get(),...v}}};
          const sec=el('div','yzp-sec col-img'+(t==='ad'?' col-ad':''));
          if(t==='ad')sec.appendChild(editable('ad-title',get().title,'כותרת המודעה, למשל: לעילוי נשמת…',tx=>{put({title:tx});save()}));
          sec.appendChild(makeImageBox(get,v=>{put(v);save();render()},null));
          sec.appendChild(editable('banner-text',get().text,t==='ad'?'טקסט המודעה: פרטים, טלפון, כתובת':'טקסט מתחת לתמונה (לא חובה)',tx=>{put({text:tx});save()},t==='ad'));
          body.appendChild(sec);
        }
        else if(t==='zmanim'&&zAnyCol()){
          const sec=el('div','yzp-sec');sec.appendChild(el('div','yz-panel-h','זמני היום · '+esc(place().name)));
          const keys=zCol(mo.days[0],true).map(z=>z.k);
          let h='<table class="yzp-zt"><thead><tr><th></th>'+keys.map(k=>'<th>'+esc(k)+'</th>').join('')+'</tr></thead><tbody>';
          for(const d of mo.days)h+='<tr'+(d.getDay()===6?' class="shabbat"':'')+'><td>'+esc(dl(d))+'</td>'+zCol(d,true).map(z=>'<td'+(z.b?' class="zb"':'')+'>'+esc(z.v)+'</td>').join('')+'</tr>';
          sec.insertAdjacentHTML('beforeend',h+'</tbody></table>'+zExplainHTML(zCol(mo.days[0],true)));body.appendChild(sec);
        }
        else if(t==='personal'&&placeOf('personal')==='col')section('אירועים אישיים',d=>personalOnly(d,new HDate(d)),'אין אירועים אישיים בחודש זה.');
        else if(t==='yz'&&placeOf('yz')==='col')section(s.yzHist?'יומי דהילולא (יארצייטן) ודברי הימים':'יומי דהילולא (יארצייטן)',d=>gedolimFor(new HDate(d),true,true),'אין יומי דהילולא (יארצייטן) מסומנים לחודש זה.');
        else if(t==='learn'&&placeOf('learn')==='col'){
          const L=s.learn||{},lc=LEARN_TYPES.filter(c=>L[c[0]]);
          const sec=el('div','yzp-sec');sec.appendChild(el('div','yz-panel-h','לימוד יומי'));
          if(lc.length>3){
            for(const d of mo.days){const its=(evMap.get(ymd(d))||[]).filter(it=>it.learn);if(!its.length)continue;const hd=new HDate(d);const day=el('div','yzp-day lday'+(d.getDay()===6?' shabbat':''));day.appendChild(el('span','yzp-d',dStyle().startsWith('greg')?String(d.getDate()):gem(hd.getDate())));
              for(const c of lc){const it=its.find(x=>String(x.text).startsWith(c[1]));if(!it)continue;const e=el('span','yzp-e lrn');e.innerHTML='<b>'+esc(c[2])+'</b> '+esc(String(it.text).slice(c[1].length));day.appendChild(e)}sec.appendChild(day)}
          }else if(lc.length){
            let h='<table class="learn-t"><thead><tr><th></th>'+(lc.length>1?lc.map(c=>'<th>'+c[2]+'</th>').join(''):'')+'</tr></thead><tbody>';
            for(const d of mo.days){const its=(evMap.get(ymd(d))||[]).filter(it=>it.learn);const hd=new HDate(d);
              h+='<tr'+(d.getDay()===6?' class="shabbat"':'')+'><td>'+(dStyle().startsWith('greg')?d.getDate():gem(hd.getDate()))+'</td>'+lc.map(c=>{const it=its.find(x=>String(x.text).startsWith(c[1]));return '<td>'+(it?esc(String(it.text).slice(c[1].length)):'')+'</td>'}).join('')+'</tr>'}
            sec.insertAdjacentHTML('beforeend',h+'</tbody></table>');
          }else sec.appendChild(el('div','yzp-empty','לא נבחר לימוד יומי.'));
          body.appendChild(sec);
          const ms=el('div','yzp-sec moon-sec');let n=0;ms.appendChild(el('div','yz-panel-h','מולד ותקופות'));
          for(const d of mo.days){const its=(evMap.get(ymd(d))||[]).filter(it=>it.cls==='moon');if(!its.length)continue;const day=el('div','yzp-day');day.appendChild(el('span','yzp-d',esc(dl(d))));its.forEach(it=>{const e=el('span','yzp-e');e.textContent=moonShort(it.text);day.appendChild(e);n++});ms.appendChild(day)}
          if(n)body.appendChild(ms);
        }
      }
      pan.appendChild(body);
      (col.side==='right'?R:Lf).push(pan);
      addResizer(pan,col.side==='left'?'right':'left',mm=>{const rw=row.getBoundingClientRect().width*screenMM(row);if(rw>0){const cs=colsCfg();const c=cs.find(x=>x.id===col.id);if(c){c.w=Math.max(7,Math.min(60,Math.round(mm/rw*100)));saveCols(cs);save();render()}}});
    }
    R.forEach(x=>row.appendChild(x));row.appendChild(grid);Lf.forEach(x=>row.appendChild(x));
    p.appendChild(row);
  }else p.appendChild(grid);
  if(s.zmanimMode==='table')p.appendChild(zmanimTable(mo,evMap));
  if(s.zExplain){const ks=zOn()?zmanimFor(mo.days[0]).filter(z=>zpl(z.key).day):[];const x=zExplainHTML(ks);if(x)p.insertAdjacentHTML('beforeend',x)}
  if(s.dedication)p.appendChild(editable('dedic',(state.slots[mo.key]||{}).dedic,'לחצו להוספת הקדשה או חסות לחודש זה',t=>{state.slots[mo.key]={...(state.slots[mo.key]||{}),dedic:t};save()}));
  addFootLine(p);
  applyBanner(p,mo.key);
}
const BPOS={top:'למעלה',bottom:'למטה',right:'בצד ימין',left:'בצד שמאל'};
function bannerList(){const s=state.s;if(!canF('banners'))return [];let l=Array.isArray(s.banners)?s.banners:[];if(!l.length&&s.banner&&s.banner!=='none')l=[s.banner];return l.filter(x=>BPOS[x])}
function bannerEl(key,pos){
  const s=state.s,per=!!s.bannerPer;
  const get=()=>{if(per){const sl=state.slots[key]||{};return (sl.banners||{})[pos]||(pos===firstPos()&&sl.banner)||{}}const g=state.bannersData||{};return g[pos]||(pos===firstPos()&&state.banner)||{}};
  const put=v=>{if(per){const sl=state.slots[key]||{};const bs={...(sl.banners||{})};bs[pos]={...get(),...v};state.slots[key]={...sl,banners:bs}}else{const g={...(state.bannersData||{})};g[pos]={...get(),...v};state.bannersData=g}};
  const b=el('div','banner banner-'+pos);
  b.appendChild(makeImageBox(get,v=>{put(v);save();render()},null));
  b.appendChild(editable('banner-text',get().text,'טקסט לבאנר '+BPOS[pos]+(per?' בעמוד זה':'')+' (לא חובה)',t=>{put({text:t});save()}));
  return b;
}
function firstPos(){return bannerList()[0]}
function applyBanner(p,key){
  const s=state.s,list=bannerList();if(!list.length)return;
  const [w,h]=pageDims(),k=unitK();
  const bp=pos=>((s.bannerSizes||{})[pos]||+s.bannerSize||15)/100;
  const setBS=(pos,frac)=>{const v=Math.max(4,Math.min(50,Math.round(frac*100)));set('bannerSizes',{...(s.bannerSizes||{}),[pos]:v})};
  const del=p.querySelector('.pg-del');
  const sides=list.filter(x=>x==='right'||x==='left');
  if(sides.length){
    const col=el('div','pg-col');[...p.childNodes].forEach(n=>{if(n!==del)col.appendChild(n)});
    const mid=el('div','pg-mid');
    if(list.includes('right')){const b=bannerEl(key,'right');b.style.width=((w-18*k)*bp('right'))+'mm';addResizer(b,'left',mm=>setBS('right',mm/(w-18*k)));mid.appendChild(b)}
    mid.appendChild(col);
    if(list.includes('left')){const b=bannerEl(key,'left');b.style.width=((w-18*k)*bp('left'))+'mm';addResizer(b,'right',mm=>setBS('left',mm/(w-18*k)));mid.appendChild(b)}
    p.appendChild(mid);
  }
  if(list.includes('top')){const b=bannerEl(key,'top');b.style.height=((h-18*k)*bp('top'))+'mm';addResizer(b,'bottom',mm=>setBS('top',mm/(h-18*k)));p.insertBefore(b,del?del.nextSibling:p.firstChild)}
  if(list.includes('bottom')){const b=bannerEl(key,'bottom');b.style.height=((h-18*k)*bp('bottom'))+'mm';addResizer(b,'top',mm=>setBS('bottom',mm/(h-18*k)));p.appendChild(b)}
}
function zmanimTable(mo,evMap){
  const sats=mo.days.filter(d=>d.getDay()===6);
  const t=el('table','zt');
  const timeOf=(d,kind)=>{const it=(evMap.get(ymd(d))||[]).find(x=>x.tkind===kind);return it?it.time:'—'};
  const first=sats.length?zmanimFor(sats[0],true):[];
  let h='<caption>זמני השבתות · '+esc(place().name)+'</caption><thead><tr><th style="width:24%">שבת</th><th>הדלקת נרות</th>'+first.map(z=>'<th>'+esc(z.k)+'</th>').join('')+'<th>צאת שבת</th></tr></thead><tbody>';
  for(const d of sats){
    const fri=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1,12),hd=new HDate(d);
    const par=(evMap.get(ymd(d))||[]).find(x=>x.cls==='parasha');
    const label=(par?esc(par.text.replace(/^פרשת\s*/,'')):'')+' <small>'+esc(dStyle().startsWith('greg')?gregShort(d):hebShort(hd))+'</small>';
    h+='<tr><td>'+label+'</td><td>'+timeOf(fri,'candle')+'</td>'+zmanimFor(d,true).map(z=>'<td'+(z.b?' class="zb"':'')+'>'+esc(z.v)+'</td>').join('')+'<td>'+timeOf(d,'havdalah')+'</td></tr>';
  }
  t.innerHTML=h+'</tbody>';
  if(state.s.zExplain&&first.length){const w=el('div','zt-wrap');w.appendChild(t);w.insertAdjacentHTML('beforeend',zExplainHTML(first));return w}
  return t;
}
const XTYPES={image:'תמונה וטקסט / פרסומת',text:'טקסט בלבד',notes:'דף הערות עם שורות',blank:'עמוד ריק'};
function extraPage(x){
  const n=state.ads.indexOf(x)+1,type=x.type||'image';
  const p=pageShell('עמוד נוסף '+n+' · '+XTYPES[type],'x-'+x.id);
  const set=v=>{Object.assign(x,v);save();render()};
  const del=el('button','pg-del no-print','מחיקת העמוד');del.type='button';del.onclick=()=>removeExtra(x.id);p.appendChild(del);
  if(type==='image'){
    p.appendChild(makeImageBox(()=>x,set,null));
    p.appendChild(editable('ad-text'+(x.img?'':' big'),x.text,'לחצו כאן לכתיבת טקסט (אפשר כמה שורות)',t=>{x.text=t;save()},true));
  }else if(type==='text'){
    p.appendChild(editable('ad-text big',x.text,'לחצו כאן לכתיבת הטקסט של העמוד',t=>{x.text=t;save()},true));
  }else if(type==='notes'){
    p.appendChild(editable('notes-title',x.text,'הערות',t=>{x.text=t;save()}));
    p.appendChild(el('div','lines big'));
  }
}
function removeExtra(id){
  const x=state.ads.find(a=>a.id===id);if(!x)return;
  state.ads.forEach(a=>{if(a.after==='x-'+id)a.after=x.after});
  state.ads=state.ads.filter(a=>a.id!==id);save();render();
}
function emitExtras(key){
  if(!canF('extraPages')&&!String(key).startsWith('x-'))return;
  for(const x of state.ads.filter(a=>String(a.after)===String(key))){extraPage(x);emitExtras('x-'+x.id)}
}
function tablePage(days,evMap){
  const s=state.s,sat=days[days.length-1],sun=days[0],key='t-'+iso(sun);
  const par=(evMap.get(ymd(sat))||[]).find(x=>x.cls==='parasha');
  const title=par?par.text:'שבוע';
  const hs=new HDate(sun),he=new HDate(sat);
  const hebR=hebShort(hs)+' – '+hebShort(he)+' '+hebYearStr(he.getFullYear());
  const gregR=gregShort(sun)+' – '+gregShort(sat)+' '+sat.getFullYear();
  let p;
  if(s.layout==='split'){p=pageShell(title+' · תמונה','ti-'+iso(sun));addSlotImage(p,key,null,'שבוע');emitExtras('ti-'+iso(sun))}
  p=pageShell(title+(s.layout==='split'?' · טבלה':''),key);
  if(s.layout==='same'&&+s.imgRatio>0)addSlotImage(p,key,innerH()*(+s.imgRatio/100),'שבוע');
  {const st=dStyle();if(st==='hebOnly')headRow(p,title,hebR,'');else if(st==='gregOnly')headRow(p,title,gregR,'');else if(st==='gregMain')headRow(p,title,gregR,hebR);else headRow(p,title,hebR,gregR)}
  const tc={zmanim:true,holidays:true,personal:true,yz:true,notes:false,...(s.tcols||{})};
  const zKeys=tc.zmanim&&s.zmanimMode!=='none'?zmanimFor(days[0],true).map(z=>z.k):[];
  const wrap=el('div','wt-wrap');const t=el('table','wt');
  let h='<thead><tr><th class="c-date">תאריך</th>'+zKeys.map(k=>'<th class="c-z">'+esc(k)+'</th>').join('')+
    (tc.holidays?'<th>חגים, פרשה וזמני שבת</th>':'')+(tc.personal?'<th>אירועים אישיים</th>':'')+(tc.yz?'<th>יומי דהילולא (יארצייטן)</th>':'')+(tc.notes?'<th>הערות</th>':'')+'</tr></thead><tbody>';
  const list=L=>L.map(it=>'<div class="e '+it.cls+'">'+esc(it.text)+'</div>').join('');
  for(const d of days){
    const I=dayItems(d,evMap,false);
    h+='<tr class="'+(I.dow===6?'shabbat':'')+(I.chag?' chag':'')+'" data-date="'+iso(d)+'" tabindex="0" role="button" aria-label="'+WEEKDAYS[I.dow]+' '+esc(hebShort(I.hd))+'. הוספת אירוע">'+
      '<td class="c-date"><span class="wd-name">'+WEEKDAYS[I.dow]+'</span> '+dateTop(d,I.hd,true)+'</td>'+
      (zKeys.length?zmanimFor(d,true).map(z=>'<td class="c-z'+(z.b?' zb':'')+'">'+esc(z.v)+'</td>').join(''):'')+
      (tc.holidays?'<td>'+list(I.items)+'</td>':'')+(tc.personal?'<td>'+list(I.pers)+'</td>':'')+(tc.yz?'<td class="c-yz">'+list(I.ged)+'</td>':'')+(tc.notes?'<td></td>':'')+'</tr>';
  }
  t.innerHTML=h+'</tbody>';wrap.appendChild(t);p.appendChild(wrap);
  if(s.dedication)p.appendChild(editable('dedic',(state.slots[key]||{}).dedic,'לחצו להוספת הקדשה או חסות לשבוע זה',tx=>{state.slots[key]={...(state.slots[key]||{}),dedic:tx};save()}));
  addFoot(p);
  applyBanner(p,key);
}
/* ---------- עיצובים ללוח השבועי: כל יום שורה מלאה מצד לצד ---------- */
const WK_STYLES=[
 ['classic','רגיל','השורות הרגילות, עם טורים לבחירה'],
 ['luach','לוח קיר','תאריך עברי, יום, זמני בוקר, אירועים, זמני ערב ותאריך לועזי'],
 ['soft','עתים','כמו לוח קיר, בקווים מנוקדים ועדינים'],
 ['planner','יומן','תאריך גדול בצד, מקום לכתיבה וזמנים בטור'],
 ['band','פסים','פס צבעוני לכל יום עם שם היום לאורך'],
 ['minimal','נקי','מספרים גדולים בשני הצדדים ואירועים באמצע']];
const WK_ICON={
 classic:'<rect x="5" y="6" width="30" height="28" rx="2"/><path d="M5 13h30M5 20h30M5 27h30"/>',
 luach:'<rect x="4" y="6" width="32" height="28" rx="2"/><path d="M4 15h32M4 24h32M10 6v28M15 6v28M25 6v28M30 6v28"/>',
 soft:'<path d="M4 10h32M4 18h32M4 26h32M4 34h32" stroke-dasharray="2 2"/><path d="M11 6v28M27 6v28" stroke-dasharray="2 2"/>',
 planner:'<rect x="4" y="6" width="9" height="8" rx="2"/><rect x="4" y="16" width="9" height="8" rx="2"/><rect x="4" y="26" width="9" height="8" rx="2"/><path d="M16 9h20M16 12h14M16 19h20M16 22h14M16 29h20M16 32h14"/>',
 band:'<rect x="4" y="6" width="32" height="7" rx="1.5"/><rect x="4" y="16" width="32" height="7" rx="1.5"/><rect x="4" y="26" width="32" height="7" rx="1.5"/><path d="M8 6v27"/>',
 minimal:'<path d="M4 13h32M4 23h32M4 33h32"/><text x="6" y="11" font-size="7" stroke="none" fill="currentColor">7</text><text x="30" y="11" font-size="7" stroke="none" fill="currentColor">ז</text>'};
const WK_MORN=new Set(['alot','alot2','misheyakir','sunrise','shma','tfila']);
function wkStyle(){const v=state.s.wkStyle;return WK_STYLES.some(x=>x[0]===v)?v:'classic'}
function weekStyled(p,days,evMap){
  const s=state.s,st=wkStyle(),ds=dStyle(),showH=ds!=='gregOnly',showG=ds!=='hebOnly';
  const box=el('div','wks wks-'+st);
  if(st==='luach'||st==='soft')box.appendChild(el('div','wks-sub',zOn()?'הזמנים לאופק '+esc(place().name):''));
  const zl=L=>L.map(z=>'<div class="wz'+(z.b?' zb':'')+'"><span>'+esc(z.k)+'</span><i></i><b>'+esc(z.v)+'</b></div>').join('');
  for(const d of days){
    const I=dayItems(d,evMap,false),hd=I.hd,leap=isLeap(hd.getFullYear());
    const zs=zOn()?zmanimFor(d,true).filter(z=>z.v):[],zm=zs.filter(z=>WK_MORN.has(z.key)),ze=zs.filter(z=>!WK_MORN.has(z.key));
    const timed=I.items.filter(x=>x.tkind),other=I.all.filter(x=>!x.tkind);
    const r=el('div','wks-row'+(I.dow===6?' shabbat':'')+(I.chag?' chag':''));
    r.dataset.date=iso(d);r.tabIndex=0;r.setAttribute('role','button');r.setAttribute('aria-label',WEEKDAYS[I.dow]+' '+hebShort(hd)+'. הוספת אירוע');
    const H='<div class="wks-hd">'+gem(hd.getDate())+(hd.getDate()===1||I.dow===0?'<small>'+esc(hebMonthName(hd.getMonth(),leap))+'</small>':'')+'</div>';
    const G='<div class="wks-gd">'+d.getDate()+(d.getDate()===1||I.dow===0?'<small>'+esc(GREG_MONTHS[d.getMonth()])+'</small>':'')+'</div>';
    const ev='<div class="wks-ev">'+other.map(it=>'<span class="e '+it.cls+'">'+esc(it.text)+'</span>').join('')+'</div>';
    const big=timed.length?'<div class="wks-big">'+timed.map(t=>'<span><small>'+esc(t.text.replace(t.time,'').trim())+'</small><b>'+esc(t.time)+'</b></span>').join('')+'</div>':'';
    const img=I.img?'<div class="wks-img"><img alt="" src="'+esc(I.img.img)+'" style="object-fit:'+(I.img.imgFit==='contain'?'contain':'cover')+';object-position:50% '+(I.img.imgPos??50)+'%"></div>':'';
    const dn='<div class="wks-dn">'+WEEKDAYS[I.dow]+'</div>';
    let h;
    if(st==='luach'||st==='soft')h=(showH?H:'<div></div>')+dn+'<div class="wks-z">'+zl(zm)+'</div><div class="wks-mid">'+ev+big+img+'</div><div class="wks-z">'+zl(ze)+'</div>'+(showG?G:'<div></div>');
    else if(st==='planner')h='<div class="wks-badge">'+(ds==='gregMain'||ds==='gregOnly'?G:H)+dn+(showH&&showG?'<div class="wks-o">'+(ds==='gregMain'?esc(gem(hd.getDate())+' '+hebMonthName(hd.getMonth(),leap)):esc(d.getDate()+' '+GREG_MONTHS[d.getMonth()]))+'</div>':'')+'</div><div class="wks-mid">'+ev+big+'<div class="lines"></div></div>'+(img||'')+(zs.length?'<div class="wks-z">'+zl(zs)+'</div>':'');
    else if(st==='band')h='<div class="wks-dn">'+WEEKDAYS[I.dow]+'</div><div class="wks-dates">'+(showH?H:'')+(showG?G:'')+'</div><div class="wks-mid">'+ev+big+'</div>'+img+(zs.length?'<div class="wks-z wks-z2">'+zl(zs)+'</div>':'');
    else h=(showH?H:'<div></div>')+'<div class="wks-mid"><div class="wks-dl">'+WEEKDAYS[I.dow]+'</div>'+ev+big+(zs.length?'<div class="wks-zl">'+zs.map(z=>'<span'+(z.b?' class="zb"':'')+'>'+esc(z.k)+' <b>'+esc(z.v)+'</b></span>').join('')+'</div>':'')+'</div>'+img+(showG?G:'<div></div>');
    r.innerHTML=h;box.appendChild(r);
  }
  p.appendChild(box);
}
function weekPage(days,evMap){
  const s=state.s,sat=days[6],sun=days[0],key='w-'+iso(sun);
  const par=(evMap.get(ymd(sat))||[]).find(x=>x.cls==='parasha');
  const title=par?par.text:'שבוע';
  const hs=new HDate(sun),he=new HDate(sat);
  const hebR=hebShort(hs)+' – '+hebShort(he)+' '+hebYearStr(he.getFullYear());
  const gregR=gregShort(sun)+' – '+gregShort(sat)+' '+sat.getFullYear();
  let p;
  if(s.layout==='split'){p=pageShell(title+' · תמונה','wi-'+iso(sun));addSlotImage(p,key,null,'שבוע');emitExtras('wi-'+iso(sun))}
  p=pageShell(title+(s.layout==='split'?' · לוח':''),key);
  if(s.layout==='same'&&+s.imgRatio>0)addSlotImage(p,key,innerH()*(+s.imgRatio/100),'שבוע');
  {const st=dStyle();if(st==='hebOnly')headRow(p,title,hebR,'');else if(st==='gregOnly')headRow(p,title,gregR,'');else if(st==='gregMain')headRow(p,title,gregR,hebR);else headRow(p,title,hebR,gregR)}
  if(wkStyle()!=='classic'){weekStyled(p,days,evMap);
    if(s.dedication)p.appendChild(editable('dedic',(state.slots[key]||{}).dedic,'לחצו להוספת הקדשה או חסות לשבוע זה',t=>{state.slots[key]={...(state.slots[key]||{}),dedic:t};save()}));
    addFoot(p);applyBanner(p,key);return}
  const [w,h]=pageDims(),wide=w>h;
  const colT=[zAnyCol()?'zmanim':null,placeOf('personal')==='col'?'personal':null,placeOf('yz')==='col'?'yz':null,placeOf('learn')==='col'?'learn':null].filter(Boolean);
  const COLN={zmanim:'זמני היום',personal:'אירועים אישיים',yz:'יומי דהילולא (יארצייטן)',learn:'לימוד ומולד'};
  const useCols=colT.length>0;
  const tpl=useCols?(()=>{const cw=(+s.yzPanelW||26)/colT.length;const parts=[`minmax(0,${100-(+s.yzPanelW||26)}fr)`].concat(colT.map(()=>`minmax(0,${cw}fr)`));return (s.panelSide==='right'?parts.slice(1).concat(parts[0]):parts).join(' ')})():'';
  const wk=el('div','week'+(wide?' wide':'')+(useCols?' wk-cols':''));
  if(useCols)wk.style.setProperty('--wtpl',tpl);
  if(useCols&&!wide){const hrow=el('div','wd-head');const cells=['<div></div>'].concat(colT.map(t=>'<div>'+COLN[t]+'</div>'));hrow.innerHTML=(s.panelSide==='right'?cells.slice(1).concat(cells[0]):cells).join('');wk.appendChild(hrow);wk.style.gridTemplateRows='auto repeat(7,minmax(0,1fr))'}
  for(const d of days){
    const I=dayItems(d,evMap,false);
    if(useCols){
      const b=el('div','wday wday-c'+(I.dow===6?' shabbat':'')+(I.chag?' chag':''));
      b.dataset.date=iso(d);b.tabIndex=0;b.setAttribute('role','button');b.setAttribute('aria-label',WEEKDAYS[I.dow]+' '+hebShort(I.hd)+'. הוספת אירוע');
      const main=el('div','wd-main');
      main.appendChild(el('div','wd-h','<span class="wd-name">'+WEEKDAYS[I.dow]+'</span>'+dateTop(d,I.hd,true)));
      const learnCol=colT.includes('learn');
      const inMain=I.items.filter(it=>!(learnCol&&(it.learn||it.cls==='moon'))).concat(colT.includes('personal')?[]:I.pers,colT.includes('yz')?[]:I.ged);
      if(inMain.length){const ev=el('div','wd-ev');for(const it of inMain){const e=el('span','e '+it.cls);e.textContent=it.text;ev.appendChild(e)}main.appendChild(ev)}
      {const zs=zDay(d,!colT.includes('zmanim'));if(zs.length)main.appendChild(el('div','wd-z',zWithX(d,zs).join(' · ')))}
      if(I.img){const box=el('div','wd-imgbox wd-imgbox-s');const im=el('img');im.src=I.img.img;im.alt='';im.style.objectFit=I.img.imgFit==='contain'?'contain':'cover';im.style.objectPosition='50% '+(I.img.imgPos??50)+'%';box.appendChild(im);main.appendChild(box)}
      main.appendChild(el('div','lines'));
      const colEls=colT.map(t=>{const c=el('div','wd-c wd-c-'+t);
        if(wide)c.appendChild(el('div','wd-col-h',COLN[t]));
        if(t==='zmanim'){c.innerHTML+=zCol(d).map(z=>'<div class="zr'+(z.b?' zb':'')+'"><span>'+esc(z.k)+'</span><b>'+esc(z.v)+'</b></div>').join('')}
        else{const L=t==='personal'?I.pers:t==='yz'?I.ged:I.items.filter(it=>it.learn||it.cls==='moon');for(const it of L){const e=el('div','e '+it.cls);e.textContent=t==='yz'?stripYP(it.text):String(it.text);c.appendChild(e)}}
        return c});
      (s.panelSide==='right'?colEls.concat(main):[main].concat(colEls)).forEach(x=>b.appendChild(x));
      wk.appendChild(b);continue;
    }
    const b=el('div','wday'+(I.dow===6?' shabbat':'')+(I.chag?' chag':''));
    b.dataset.date=iso(d);b.tabIndex=0;b.setAttribute('role','button');b.setAttribute('aria-label',WEEKDAYS[I.dow]+' '+hebShort(I.hd)+'. הוספת אירוע');
    const main=el('div','wd-main');
    main.appendChild(el('div','wd-h','<span class="wd-name">'+WEEKDAYS[I.dow]+'</span>'+dateTop(d,I.hd,true)));
    if(s.splitCols){
      const cols=el('div','wd-cols');
      [[I.items,'חגים וזמנים'],[I.pers,'אירועים אישיים'],[I.ged,'יומי דהילולא (יארצייטן)']].forEach(([L,lab])=>{const c=el('div','wd-col');c.appendChild(el('div','wd-col-h',lab));for(const it of L){const e=el('div','e '+it.cls);e.textContent=it.text;c.appendChild(e)}cols.appendChild(c)});
      main.appendChild(cols);
    }else if(I.all.length){const ev=el('div','wd-ev');for(const it of I.all){const e=el('span','e '+it.cls);e.textContent=it.text;ev.appendChild(e)}main.appendChild(ev)}
    {const zs=zDay(d,true);if(zs.length)main.appendChild(el('div','wd-z',zWithX(d,zs).join(' · ')))}
    main.appendChild(el('div','lines'));
    b.appendChild(main);
    if(I.img){const box=el('div','wd-imgbox');const im=el('img');im.src=I.img.img;im.alt='';im.style.objectFit=I.img.imgFit==='contain'?'contain':'cover';im.style.objectPosition='50% '+(I.img.imgPos??50)+'%';box.appendChild(im);b.appendChild(box)}
    wk.appendChild(b);
  }
  if(wide){const n=el('div','wday notes');n.appendChild(el('div','wd-main','<div class="wd-h"><span class="wd-name">הערות</span></div><div class="lines"></div>'));wk.appendChild(n)}
  p.appendChild(wk);
  if(s.dedication)p.appendChild(editable('dedic',(state.slots[key]||{}).dedic,'לחצו להוספת הקדשה או חסות לשבוע זה',t=>{state.slots[key]={...(state.slots[key]||{}),dedic:t};save()}));
  addFoot(p);
  applyBanner(p,key);
}
function dayPage(d,evMap){
  const s=state.s,key='d-'+iso(d),I=dayItems(d,evMap,false);
  const label=WEEKDAYS[I.dow]+' '+hebShort(I.hd);
  let p;
  if(s.layout==='split'){p=pageShell(label+' · תמונה','di-'+iso(d));addSlotImage(p,key,null,'יום');emitExtras('di-'+iso(d))}
  p=pageShell(label+(s.layout==='split'?' · יומן':''),key);
  if(s.layout==='same'&&+s.imgRatio>0)addSlotImage(p,key,innerH()*(+s.imgRatio/100),'יום');
  const hy=hebYearStr(I.hd.getFullYear());
  {const st=dStyle(),wd='יום '+WEEKDAYS[I.dow];
  if(st==='hebOnly')headRow(p,hebShort(I.hd),hy,wd);
  else if(st==='gregOnly')headRow(p,gregShort(d),String(d.getFullYear()),wd);
  else if(st==='gregMain')headRow(p,gregShort(d),String(d.getFullYear()),wd+' · '+hebShort(I.hd)+' '+hy);
  else if(st==='both')headRow(p,hebShort(I.hd)+' · '+gregShort(d),hy+' · '+d.getFullYear(),wd);
  else headRow(p,hebShort(I.hd),hy,wd+' · '+gregShort(d)+' '+d.getFullYear())}
  const body=el('div','day-body');body.dataset.date=iso(d);body.tabIndex=0;body.setAttribute('role','button');body.setAttribute('aria-label','הוספת אירוע ל'+label);
  const main=el('div','day-main');
  const dayList=I.all.filter(x=>!x.tkind);
  if(s.splitCols){const cols=el('div','wd-cols day-ev');[[I.items.filter(x=>!x.tkind),'חגים ופרשה'],[I.pers,'אירועים אישיים'],[I.ged,'יומי דהילולא (יארצייטן)']].forEach(([L,lab])=>{const c=el('div','wd-col');c.appendChild(el('div','wd-col-h',lab));for(const it of L){const e=el('div','e '+it.cls);e.textContent=it.text;c.appendChild(e)}cols.appendChild(c)});main.appendChild(cols)}
  else if(dayList.length){const ev=el('div','wd-ev day-ev');for(const it of dayList){const e=el('span','e '+it.cls);e.textContent=it.text;ev.appendChild(e)}main.appendChild(ev)}
  const hours=el('div','hours');
  for(let hr=7;hr<=22;hr++)hours.appendChild(el('div','hr','<span>'+String(hr).padStart(2,'0')+':00</span>'));
  main.appendChild(hours);
  body.appendChild(main);
  const side=el('div','day-side');
  const zs=s.zmanimMode==='none'?[]:zmanimFor(d);
  const timed=I.items.filter(x=>x.tkind);
  if(zs.length||timed.length){
    let h='<div class="zl-t">זמני היום</div>';
    for(const z of zs)h+='<div class="zl'+(z.b?' zb':'')+'"><span>'+esc(z.k)+(s.zExplain&&zMethodText(z.key)?'<small class="zl-m">'+esc(zMethodText(z.key))+'</small>':'')+'</span><b>'+esc(z.v)+'</b></div>';
    for(const t of timed)h+='<div class="zl"><span>'+esc(t.text.replace(t.time,'').trim())+'</span><b>'+esc(t.time)+'</b></div>';
    side.appendChild(el('div','zlist',h));
  }
  if(I.img){const im=el('img','dimg');im.src=I.img.img;im.alt='';im.style.objectFit=I.img.imgFit==='contain'?'contain':'cover';im.style.objectPosition='50% '+(I.img.imgPos??50)+'%';side.appendChild(im)}
  side.appendChild(el('div','lines'));
  body.appendChild(side);
  p.appendChild(body);
  if(s.dedication)p.appendChild(editable('dedic',(state.slots[key]||{}).dedic,'לחצו להוספת הקדשה או חסות ליום זה',t=>{state.slots[key]={...(state.slots[key]||{}),dedic:t};save()}));
  addFoot(p);
  applyBanner(p,key);
}
function viewDays(months){
  const s=state.s;let days=months.flatMap(m=>m.days);
  const f=s.rangeFrom,t=s.rangeTo;
  if(f)days=days.filter(d=>iso(d)>=f);if(t)days=days.filter(d=>iso(d)<=t);
  return days;
}

function wkSync(){const r=$('#wkStyleRow');if(!r)return;r.hidden=(state.s.view||'month')!=='week';const c=$('#wkStyleCards'),cur=wkStyle();
  if(!c.children.length)c.innerHTML=WK_STYLES.map(([k,n,d])=>'<button type="button" class="cd-card" role="radio" data-wks="'+k+'"><svg viewBox="0 0 40 40" aria-hidden="true">'+WK_ICON[k]+'</svg><span class="nm">'+n+'</span><small>'+d+'</small></button>').join('');
  c.querySelectorAll('[data-wks]').forEach(b=>{const on=b.dataset.wks===cur;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on))})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-wks]');if(!b)return;const s=state.s,v=b.dataset.wks;s.wkStyle=v;
  if(v!=='classic'){if(s.zmanimMode==='none'||s.zmanimMode==='table')s.zmanimMode='daily';const on=Object.keys(s.zmanim||{}).filter(k=>s.zmanim[k]);
    if(on.length<=3&&!LITE)s.zmanim={alot:true,misheyakir:true,sunrise:true,shma:true,tfila:true,chatzot:true,minchaG:true,plag:true,sunset:true,tzeit:true}}
  save();syncUI();render()});
/* ---------- render ---------- */
let monthsCache=[];
/* סימן המים לא מוצג על המסך, אלא רק בהדפסה (לפי המסלול), או כשהלוח עובר את מה שמותר בהורדה החינמית (אירועים, תמונות) */
/* הדפסה חינמית (מסלול ניסיון): למי שנכנס לחשבון ובתוך המגבלות של ההורדה החינמית, עם סימן מים עדין ולוגו.
   הדפסה מהדפדפן (Ctrl+P) בלי חשבון או מעבר למגבלות: מוצגת הודעה במקום הלוח. */
function freePrintOK(){try{const P=PLAN();return !!P.watermark&&P.id==='free'&&!!user&&!wmScreen()}catch(e){return false}}
function printGate(){const P=PLAN(),b=document.body;if(!P.watermark||P.id!=='free'){b.classList.add('pg-ok');return}
  const w=wmScreen(),ok=!!user&&!w;b.classList.toggle('pg-ok',ok);
  b.dataset.pmsg=!user?'כדי להדפיס את הלוח בחינם, נכנסים לחשבון באתר (ההרשמה חינם).\nאחר כך מדפיסים שוב.\n\nMyLuach.org':
    (w+'\nבהדפסה החינמית אפשר עד '+LITE_LIM.events+' אירועים ו־'+LITE_LIM.photos+' תמונות.\nלהדפסה של הכל: מסלול בתשלום באתר.\n\nMyLuach.org')}
function photoCount(){let n=(state.cover&&state.cover.img)?1:0;for(const k in state.slots||{})if(state.slots[k]&&state.slots[k].img)n++;for(const e of state.events)if(e.img)n++;return n}
function wmScreen(){const p=PLAN();if(!p.watermark||SAMPLE||LITE)return '';const L=p.id==='free'||!p.id?LITE_LIM:{events:p.events,photos:Infinity};
  const ev=state.events.length,ph=photoCount();if(ev>L.events)return 'יש בלוח '+ev+' אירועים, ובחינם אפשר עד '+L.events+'.';
  if(ph>L.photos)return 'יש בלוח '+ph+' תמונות, ובחינם אפשר עד '+L.photos+'.';return ''}
function render(){
  yzInvalidate();
  try{printGate()}catch(err){}
  {const w=wmScreen();document.body.classList.toggle('wm-screen',!!w);const n=$('#wmNote');if(n){n.hidden=!w;n.innerHTML=w?esc(w)+' <button type="button" class="linkbtn" data-upgrade="events">למסלולים</button>':''}}
  const s=state.s;
  applyPrintPageStyle();
  stage.querySelectorAll('.sheet-wrap,.err').forEach(n=>n.remove());
  let months;
  try{months=buildMonths()}catch(e){stage.insertAdjacentHTML('beforeend','<div class="err">השנה שנבחרה אינה תקינה.</div>');return}
  monthsCache=months;
  stage.querySelectorAll('.ins,.cover-add').forEach(n=>n.remove());
  RS={labels:{top:'תחילת הלוח',start:'אחרי השער',end:'סוף הלוח'},emitted:new Set(['top','start','end']),slots:[],count:0,tc:{},curKey:''};
  state.ads.forEach(a=>{if(typeof a.after==='number')a.after=(months[a.after]||{}).key||'end'});
  const ih=innerH(),view=s.view==='year'||s.view==='countdown'?s.view:canF('views')?(s.view||'month'):'month';
  const [W,H]=pageDims();
  let evMap,days=null,weeks=null;
  if(view==='month'||view==='year'){const last=months[months.length-1].days;evMap=eventsFor(months[0].days[0],last[last.length-1])}
  else{
    days=viewDays(months);
    if(!days.length){stage.insertAdjacentHTML('beforeend','<div class="err">טווח התאריכים שנבחר ריק. בדקו את "מתאריך" ו"עד תאריך".</div>');return}
    let a=days[0],b=days[days.length-1];
    if(view==='week'||view==='table'){a=new Date(a.getFullYear(),a.getMonth(),a.getDate()-a.getDay(),12);b=new Date(b.getFullYear(),b.getMonth(),b.getDate()+6-b.getDay(),12);
      weeks=[];for(let d=new Date(a);d<=b;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+7,12)){const w=[];for(let i=0;i<7;i++)w.push(new Date(d.getFullYear(),d.getMonth(),d.getDate()+i,12));weeks.push(w)}}
    evMap=eventsFor(new Date(a.getFullYear(),a.getMonth(),a.getDate()-1,12),b);
  }

  emitExtras('top');
  if(s.cover&&!SAMPLE){
    const p=pageShell('שער','cover');
    {const lb=p.parentNode.querySelector('.sheet-label');if(lb&&!LITE)lb.insertAdjacentHTML('beforeend',' · <button type="button" class="linkbtn no-print" data-cover-off>הסרת דף השער</button>')}
    p.appendChild(makeImageBox(()=>state.cover,v=>{state.cover={...state.cover,...v};save();render()},null));
    if(!(state.cover||{}).img){p.classList.add('cover-empty');const d=p.querySelector('.pg-img .drop');if(d)d.insertAdjacentHTML('afterbegin','<b class="cover-mark">עמוד שער</b>')}
    p.appendChild(editable('cover-title',state.cover.title,'לחצו כאן לכתיבת כותרת, למשל: לוח השנה של משפחת כהן',t=>{state.cover.title=t;save()}));
    p.appendChild(el('div','cover-year',esc(s.calType==='heb'&&(+s.hebStart||7)===7?'שנת '+hebYearStr(+s.hebYear):months[0].year+(months.at(-1).year!==months[0].year?'–'+months.at(-1).year:''))));
    emitExtras('cover');
  }
  emitExtras('start');
  if(view==='month'){
    const shownM=SAMPLE?months.filter(m=>m.key===SAMPLE.key):months.slice(0,PLAN().months);
    shownM.forEach(mo=>{
      if(s.layout==='split'){
        const pi=pageShell(mo.title+' · תמונה','mi-'+mo.key);
        if(placeOf('yz')==='page'){addMonthImage(pi,mo,ih*0.5);addHistBox(pi,mo,false)}else addMonthImage(pi,mo,null);
        emitExtras('mi-'+mo.key);
        const pg=pageShell(mo.title+' · לוח',mo.key);addMonthGrid(pg,mo,evMap);
      }else{
        if(placeOf('yz')==='page'){const ph=pageShell(mo.title+' · דברי הימים','h-'+mo.key);addHistBox(ph,mo,true);emitExtras('h-'+mo.key)}
        const p=pageShell(mo.title,mo.key);
        if(s.layout==='same'&&+s.imgRatio>0)addMonthImage(p,mo,ih*(+s.imgRatio/100));
        addMonthGrid(p,mo,evMap);
      }
      emitExtras(mo.key);
    });
  }else if(view==='countdown'){
    countdownPages();
  }else if(view==='year'){
    yearPage(months,evMap);emitExtras('year');
  }else if(view==='week'){
    for(const w of weeks.filter(w=>beforeCut(w[0],months))){weekPage(w,evMap);emitExtras('w-'+iso(w[0]))}
  }else if(view==='table'){
    for(const w of weeks.filter(w=>beforeCut(w[0],months))){tablePage(w,evMap);emitExtras('t-'+iso(w[0]))}
  }else{
    for(const d of days.filter(d=>beforeCut(d,months))){dayPage(d,evMap);emitExtras('d-'+iso(d))}
  }
  if(monthCut(months)&&!SAMPLE)lockedPage(months);
  emitExtras('end');
  const orphans=state.ads.filter(a=>!RS.emitted.has(String(a.after))&&!RS.emitted.has('x-'+a.id));
  for(const x of orphans){if(!RS.emitted.has('x-'+x.id)){extraPage(x);emitExtras('x-'+x.id)}}

  /* "+" buttons between pages */
  const mkIns=(key,ref,where)=>{const b=el('button','ins no-print','+ הוספת עמוד כאן');b.type='button';b.dataset.after=key;ref.insertAdjacentElement(where,b)};
  const wraps=[...stage.querySelectorAll('.sheet-wrap')];
  if(wraps.length)mkIns('top',wraps[0],'beforebegin');
  wraps.forEach(w=>{if(w.dataset.key)mkIns(w.dataset.key,w,'afterend')});
  /* בלי דף שער: כפתור גדול להוספה, במקום שבו השער היה מופיע */
  if(!s.cover&&!SAMPLE&&!LITE&&!SNAPVIEW&&view!=='countdown'&&wraps.length){const ca=el('button','cover-add no-print','<b>＋ הוספת דף שער</b><span>עמוד פתיחה עם תמונה גדולה וכותרת, למשל "לוח השנה של משפחת כהן"</span>');ca.type='button';ca.dataset.coverOn='1';(stage.querySelector('.ins')||wraps[0]).insertAdjacentElement('beforebegin',ca)}
  bgPickSync();
  try{locSync()}catch(err){}

  const viewName={month:'חודשי',week:'שבועי',day:'יומי',table:'טבלה שבועית',year:'שנתי',countdown:'ספירה לאחור'}[view];
  $('#stageTitle').textContent='לוח '+viewName+' · '+(s.calType==='heb'&&(+s.hebStart||7)===7?'שנת '+hebYearStr(+s.hebYear):months[0].title+' '+months[0].year+' – '+months.at(-1).title+' '+months.at(-1).year);
  const sz=s.size==='custom'?'מותאם':SIZES[s.size].label;
  $('#stageMeta').textContent=RS.count+' עמודים · '+sz+' · '+Math.round(W)+'×'+Math.round(H)+' מ״מ · '+place().name;
  renderAds();
  hlApply();
  fxApply();
  fxtApply();
  fxBoxRender();
  fit();
  fxDecorate();
  fxBoxDecorate();
  if(CDMODE)requestAnimationFrame(()=>cdApplyFocus());
}
stage.addEventListener('click',e=>{
  const b=e.target.closest('.ins');if(!b)return;
  const m=modal('<h3>איזה עמוד להוסיף?<small>אחרי: '+esc(RS.labels[b.dataset.after]||'')+'</small></h3><div class="kinds" style="grid-template-columns:repeat(2,minmax(0,1fr))">'+Object.entries(XTYPES).map(([k,v])=>'<label><input type="radio" name="xType" value="'+k+'"> '+v+'</label>').join('')+'</div><div class="row"><button class="btn" type="button" data-close>ביטול</button></div>');
  m.addEventListener('change',ev=>{if(ev.target.name==='xType'){state.ads.push({id:uid(),type:ev.target.value,after:b.dataset.after,img:null,text:''});save();m.remove();render()}});
});
function fit(){
  const [w,h]=pageDims(),pw=mm2px(w),ph=mm2px(h);
  const avail=Math.max(240,stage.clientWidth-4),scale=Math.min(1,avail/pw);
  stage.querySelectorAll('.sheet-wrap').forEach(wr=>{wr.style.width=pw*scale+'px';wr.style.height=ph*scale+'px';wr.firstChild.style.transform='scale('+scale+')'});
  shrinkPanels();
}
function shrinkPanels(){
  stage.querySelectorAll('.hist-body').forEach(fitHist);
  stage.querySelectorAll('.yz-panel-b').forEach(b=>{
    if(b.dataset.fitDone)return;b.dataset.fitDone='1';
    const over=()=>b.scrollHeight>b.clientHeight+1;
    let f=1;b.style.setProperty('--yzf',f);
    {const lp=b.closest('.learn-panel');if(lp){let w=parseFloat(lp.style.width)||12;while(over()&&w<22){w+=2;lp.style.width=w+'%'}}}
    while(over()&&f>0.8){f=+(f-0.05).toFixed(2);b.style.setProperty('--yzf',f)}
    if(!over())return;
    const pan=b.closest('.yz-panel');
    if(state.s.yzOverflow==='widen'&&pan&&pan.closest('.grid-row')&&!pan.classList.contains('learn-panel')){let w=parseFloat(pan.style.width)||26;while(over()&&w<62){w+=3;pan.style.width=w+'%'}if(!over())return}
    const note=el('div','yzp-more','המשך בתאים הריקים בלוח ובעמוד הבא');b.appendChild(note);
    const secs=[...b.querySelectorAll('.yzp-sec')].filter(x=>x.querySelector('.yzp-day'));
    const moved=secs.map(()=>[]);
    while(over()){
      let bi=-1,bn=0;secs.forEach((x,i)=>{const n=x.querySelectorAll(':scope>.yzp-day').length;if(n>bn){bn=n;bi=i}});
      if(bi<0)break;
      const ds=secs[bi].querySelectorAll(':scope>.yzp-day'),day=ds[ds.length-1];moved[bi].unshift(day);day.remove();
      if(bn===1)secs[bi].style.display='none';
    }
    const queue=[];secs.forEach((x,i)=>moved[i].forEach(day=>queue.push({t:x.querySelector('.yz-panel-h').textContent,day})));
    if(!queue.length){note.remove();return}
    const page=b.closest('.page'),grid=page.querySelector('.grid');
    const fill=(box,isOver)=>{let cur=null,n=0;
      while(queue.length){const it=queue[0],added=[];
        if(it.t!==cur){const h=el('div','spill-t',esc(it.t)+(n?'':' (המשך)'));box.appendChild(h);added.push(h)}
        box.appendChild(it.day);added.push(it.day);
        if(isOver()){added.forEach(x=>x.remove());break}
        cur=it.t;queue.shift();n++}
      return n};
    let usedSpill=false;
    if(grid){
      const kids=[...grid.children].filter(c=>c.classList.contains('cell')&&!c.dataset.spilled);
      const runs=[];let r=[];for(const c of kids){if(c.classList.contains('pad'))r.push(c);else break}runs.push(r);
      r=[];for(let i=kids.length-1;i>=0;i--){if(kids[i].classList.contains('pad'))r.unshift(kids[i]);else break}runs.push(r);
      for(const run of runs){
        if(run.length<2||!queue.length)continue;
        const sp=el('div','spill');sp.style.gridColumn='span '+run.length;sp.style.setProperty('--yzf',f);
        run[0].before(sp);run.forEach(c=>{c.style.display='none';c.dataset.spilled='1'});
        const n=fill(sp,()=>sp.scrollHeight>sp.clientHeight+1||sp.scrollWidth>sp.clientWidth+1);
        if(n)usedSpill=true;else{sp.remove();run.forEach(c=>{c.style.display='';delete c.dataset.spilled})}
      }
    }
    const needPage=queue.length>0;
    note.textContent=usedSpill&&needPage?'המשך בתאים הריקים בלוח ובעמוד הבא':usedSpill?'המשך בתאים הריקים בלוח':'המשך בעמוד הבא';
    if(!needPage)return;
    const wrap=page.parentElement,nw=el('div','sheet-wrap cont');
    nw.style.width=wrap.style.width;nw.style.height=wrap.style.height;
    const np=el('div',page.className);np.style.cssText=page.style.cssText;
    const title=(page.querySelector('.pg-month')||{}).textContent||'',yr=(page.querySelector('.pg-year')||{}).textContent||'';
    const head=el('div','pg-head');head.appendChild(el('div','pg-month','המשך: '+esc(title)));head.appendChild(el('div','pg-year',esc(yr)));np.appendChild(head);
    const cb=el('div','cont-body');cb.style.setProperty('--yzf',1);np.appendChild(cb);
    nw.appendChild(np);
    nw.appendChild(el('div','sheet-label','עמוד המשך שנוסף אוטומטית'));
    nw.appendChild(el('div','notice cont-notice','המידע בטור של '+esc(title)+' לא נכנס בעמוד, ולכן נוסף עמוד המשך. כדי לחסוך אותו אפשר להרחיב את הטור, להקטין את גודל הטקסט, לבחור תצוגה מקוצרת, לסמן פחות פריטים, או לבחור בהגדרות "להרחיב את הטור ולהקטין את הלוח".'));
    wrap.after(nw);
    const cOver=()=>cb.scrollHeight>cb.clientHeight+1||cb.scrollWidth>cb.clientWidth+1;
    fill(cb,()=>false);cb.style.setProperty('--yzf',1);
    if(cOver()){let lo=0.08,hi=1;for(let i=0;i<12;i++){const mid=(lo+hi)/2;cb.style.setProperty('--yzf',mid.toFixed(3));if(cOver())hi=mid;else lo=mid}cb.style.setProperty('--yzf',lo.toFixed(3))}
  });
}
let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(fit,100)});
let renderT;function rerender(){clearTimeout(renderT);renderT=setTimeout(render,120)}

/* ---------- zmanim settings dialog ---------- */
function zmSetField(k,v){const M={...zmCfg(),[k]:v};state.s.zm=M;const same=Object.entries(ZM_PRESETS).find(([pk,pv])=>Object.keys(pv).every(x=>pv[x]===M[x]));state.s.zmPreset=same?same[0]:'custom';ZC.clear()}
function zmMethodCtl(k){
  const M=zmCfg(),f=ZM_FIELDS.find(x=>x[0]===k);if(!f)return '';
  const o=f[2],cur=M[k],known=o.some(x=>x[0]===cur);
  let h='<select class="zs-in zs-msel" data-zsf="'+k+'">'+o.map(x=>opt(x[0],x[1],x[0]===cur)).join('')+(known?'':opt(cur,'אחר: '+zmKeyLabel(cur),true))+(ZM_CUSTOMABLE.has(k)?opt('__custom','ערך אחר…'):'')+'</select>';
  if(ZM_CUSTOMABLE.has(k)){
    const parts=String(known?'':cur).split('>');
    const one=(i,v)=>{v=v||'';const u=v.endsWith('z')?'z':v.endsWith('f')?'f':'d';return '<input class="zs-in zs-num" data-zscn="'+k+'" data-i="'+i+'" inputmode="decimal" value="'+(v?parseFloat(v):'')+'" placeholder="מספר"><select class="zs-in" data-zscu="'+k+'" data-i="'+i+'">'+(k==='netz'||k==='shkia'?[['d','מעלות מתחת לאופק']]:[['d','מעלות'],['z','דק׳ זמניות'],['f','דק׳ שוות']]).map(x=>opt(x[0],x[1],x[0]===u)).join('')+'</select>'};
    h+='<div class="zs-cust" data-zsc="'+k+'"'+(known?' hidden':'')+'>'+(k==='mga'?'מ־'+one(0,parts[0])+' עד '+one(1,parts[1]||parts[0]):one(0,parts[0]))+'<button class="btn small" type="button" data-zsapply="'+k+'">החלה</button></div>';
  }
  return h;
}
const ZM_ROW_FIELD={yereim:'yereim',chatzot:'chatzot',alot:'alot',alot2:'alot2',misheyakir:'mish',sunrise:'netz',musaf:'musaf',minchaG:'minchaG',minchaK:'minchaK',plag:'plag',sunset:'shkia',tzeit:'tzeit',ci:'ci',rt:'rt',chatzotNight:'chatzotNight',ash2:'ash',ash3:'ash'};
function openZmanimSettings(){
  if(!canF('advZmanim')){openUpgrade('advZmanim');return}
  const m=modal('<h3>שיטה לכל זמן<small>בוחרים שיטה כללית, ואז אפשר לשנות לכל זמן בנפרד את שיטת החישוב, השם, העיגול ואם יופיע. הזמנים לדוגמה מחושבים לתאריך ולמקום שבחרתם.</small></h3>'+
    '<div class="row"><label class="fld">שיטה כללית לכל הזמנים<select id="zsPreset">'+[['ashkenaz','אשכנזים, מנהג ארץ ישראל'],['chazon','כמו חזון שמיים'],['tzikoni','הרב איתן ציקוני (לוח ממוצע)'],['sefardi','ספרדים, ע״פ הגר״ע יוסף'],['tuk','הגרי״מ טוקצ׳ינסקי'],['itim','אשכנזים, נץ מישורי ושקיעה לפי הגובה'],['gra','גר״א פשוט'],['tanya','בעל התניא (חב״ד)'],['chul','נפוץ בחו״ל'],['custom','מותאם אישית']].map(x=>opt(x[0],x[1])).join('')+'</select></label>'+
    '<label class="fld">תאריך לדוגמה<input type="date" id="zsDate"></label></div>'+
    '<p class="hint" id="zsHint"></p>'+
    '<details class="sub-box"><summary>איך מחושבים זמני ההלכה (הסבר קצר)</summary><div class="inner hint" style="font-size:13px;line-height:1.6">'+
    '<b>אבני הבניין:</b> כל זמן נקבע באחת משלוש דרכים: <b>מעלות</b> (כמה מעלות השמש מתחת לאופק, למשל 16.1° לעלות השחר; משתנה עם עונות השנה והמיקום), <b>דקות שוות</b> (מספר קבוע של דקות לפני הנץ או אחרי השקיעה), או <b>דקות זמניות</b> (חלק יחסי מאורך היום: 72 דק׳ זמניות = 72/60 של שעה זמנית, שהיא 1/12 מהיום).<br>'+
    '<b>הנץ והשקיעה:</b> מישורי = כשהשמש עולה מעל האופק בגובה פני הים (0.833°, כולל חצי קוטר השמש ושבירת האור). לפי גובה = מתחשב בגובה המקום. אמיתי = מרכז השמש 1.583° מתחת לאופק (בעל התניא).<br>'+
    '<b>שעות זמניות:</b> מחלקים "יום" ל־12. לגר״א היום הוא מהנץ לשקיעה. למג״א הוא מעלות השחר עד צאת הכוכבים המקביל, כך שחצות יוצא באמצע. ממנו נגזרים סוף זמן ק״ש (סוף שעה 3), תפילה (4), מוסף (7), מנחה גדולה (6.5), מנחה קטנה (9.5) ופלג המנחה (10.75).<br>'+
    '<b>ערך אחר:</b> בכל זמן אפשר להקליד כל מספר. מספר שלילי בזמני ערב = לפני השקיעה (למשל בין השמשות של היראים). המעלות מחושבות תמיד ללא גובה, כמקובל.'+
    '</div></details>'+
    '<div id="zsBody" class="zs-body"></div>'+
    '<div class="row"><button class="btn primary" type="button" id="zsDone">סיום</button></div>');
  m.querySelector('.modal').classList.add('wide','zs-modal');
  const q=x=>m.querySelector(x);q('#zsDate').value=iso(new Date());
  const sample=()=>{const v=q('#zsDate').value;return v?dateFromIso(v):new Date()};
  function draw(){
    const s=state.s,Z=zctx(sample()),tz=place().tz;
    q('#zsPreset').value=s.zmPreset||'ashkenaz';q('#zsHint').textContent=ZM_PRESET_HINT[s.zmPreset||'ashkenaz']||'';
    /* תפריט אחד לעיגול ולשניות */
    const roundSel=k=>{const z=s.zsecs||{},rd=(s.zround||{})[k]||'auto',v=z[k]===true?'secs':rd;
      return '<select class="zs-in" data-zsround="'+k+'" aria-label="עיגול">'+[['auto','עיגול לחומרא'+(s.secs?' (עם שניות, לפי הכללי)':'')],['down','לדקה, תמיד למטה'],['up','לדקה, תמיד למעלה'],['near','לדקה הקרובה'],['secs','עם שניות, בלי עיגול לדקה']].map(x=>opt(x[0],x[1],x[0]===v)).join('')+'</select>'};
    let h='<div class="zs-grid zs-all"><div class="zs-h">מופיע</div><div class="zs-h">זמן</div><div class="zs-h">שיטת החישוב</div><div class="zs-h">שם בלוח ועיגול</div><div class="zs-h">לדוגמה</div>';
    for(const [k,full,short,dir] of ZMANIM){
      const on=!!s.zmanim[k],lab=(s.zlab||{})[k]||'',rd=(s.zround||{})[k]||'auto';
      let meth,ex;
      if(k==='shma'||k==='tfila'){
        meth='<div class="zs-two"><span>הצגה:</span><select class="zs-in" data-zsmode="'+k+'">'+[['','לפי הכללי ('+({gra:'גר״א',mga:'מג״א',both:'שניהם'}[s.m_shma])+')'],['gra','גר״א'],['mga','מג״א'],['both','שניהם']].map(x=>opt(x[0],x[1],x[0]===((s.zmode||{})[k]||''))).join('')+'</select></div>'+
          '<div class="zs-two"><span>מג״א:</span>'+zmMethodCtl('mga')+'</div><div class="zs-two"><span>גר״א:</span>'+zmMethodCtl('gra')+'</div>';
        ex='מג״א '+fmtTime(k==='shma'?Z.shmaMGA:Z.tfilaMGA,dir,tz,k)+'<br>גר״א '+fmtTime(k==='shma'?Z.shmaGRA:Z.tfilaGRA,dir,tz,k);
      }else{
        meth=ZM_ROW_FIELD[k]?zmMethodCtl(ZM_ROW_FIELD[k]):'';
        ex=k==='hour'?(isFinite(Z.hourGRA)?Math.round(Z.hourGRA/60000)+' דק׳':'—'):fmtTime(Z[k],rd==='auto'?dir:rd,tz,k);
      }
      h+='<label class="chk"><input type="checkbox" data-zsshow="'+k+'"'+(on?' checked':'')+' aria-label="'+full+' מופיע"></label>'+
        '<div class="zs-name">'+full+'</div><div class="zs-meth">'+meth+'</div>'+
        '<div class="zs-lab"><input class="zs-in" data-zslab="'+k+'" value="'+esc(lab)+'" placeholder="'+esc(short)+'">'+roundSel(k)+'<label class="chk zs-bold"><input type="checkbox" data-zsbold="'+k+'"'+((s.zbold||{})[k]?' checked':'')+'> מודגש בלוח</label></div>'+
        '<div class="zs-ex">'+ex+'</div>';
    }
    h+='</div><h4 class="zs-sub">זמני שבת, חג וצום</h4><div class="zs-grid zs-extra">';
    for(const [k,l,ek] of [['motzash','צאת שבת וחג','motzash'],['fastStart','תחילת צום (בבוקר)','fastStart'],['fastEnd','סוף צום דרבנן','fastEnd'],['minchaG','מנחה גדולה','minchaG']].slice(0,3)){
      h+='<div class="zs-name">'+l+'</div><div class="zs-meth">'+zmMethodCtl(k)+roundSel(k)+'</div><div class="zs-ex">'+fmtTime(Z[ek],zdir(k,k==='fastStart'?'down':'up'),tz,k)+'</div>';
    }
    h+='<div class="zs-name">הדלקת נרות</div><div class="zs-meth">'+roundSel('candle')+'</div><div class="zs-ex"></div>';
    h+='<div class="zs-name">סוף אכילת וביעור חמץ</div><div class="zs-meth">'+roundSel('chametz')+'</div><div class="zs-ex">לפי השיטה של ק״ש</div>';
    h+='<div class="zs-name">נרות חנוכה</div><div class="zs-meth"><select class="zs-in" data-zschan="1">'+[['tzeit','בצאת הכוכבים'],['sunset','בשקיעה'],['none','לא להציג']].map(x=>opt(x[0],x[1],x[0]===(s.chanukah||'tzeit'))).join('')+'</select>'+roundSel('chanukah')+'</div><div class="zs-ex"></div>';
    h+='</div><p class="hint">בכל זמן שמחושב לפי מעלות או דקות יש "ערך אחר…": מקלידים כל מספר ובוחרים מעלות, דקות זמניות (לפי אורך היום) או דקות שוות. הדלקת הנרות נקבעת לפי העיר, בחלק "מיקום וזמני היום".</p>';
    q('#zsBody').innerHTML=h;
  }
  const changed=()=>{ZC.clear();save();syncUI();rerender();draw()};
  m.addEventListener('change',e=>{
    const t=e.target,s=state.s;
    if(t.id==='zsPreset'){if(t.value!=='custom')s.zm={...ZM_PRESETS[t.value]};s.zmPreset=t.value;return changed()}
    if(t.id==='zsDate')return draw();
    if(t.dataset.zsshow){s.zmanim[t.dataset.zsshow]=t.checked;return changed()}
    if(t.dataset.zschan){s.chanukah=t.value;return changed()}
    if(t.dataset.zsbold){const z={...(s.zbold||{})};if(t.checked)z[t.dataset.zsbold]=1;else delete z[t.dataset.zsbold];s.zbold=z;return changed()}
    if(t.dataset.zsround){const k=t.dataset.zsround,v=t.value,z={...(s.zsecs||{})};
      if(v==='secs'){z[k]=true;s.zround={...(s.zround||{}),[k]:'auto'}}
      else{if(v==='auto')delete z[k];else z[k]=false;s.zround={...(s.zround||{}),[k]:v}}
      s.zsecs=z;return changed()}
    if(t.dataset.zsmode){const z={...(s.zmode||{})};if(t.value)z[t.dataset.zsmode]=t.value;else delete z[t.dataset.zsmode];s.zmode=z;return changed()}
    if(t.dataset.zsf){if(t.value==='__custom'){m.querySelectorAll('[data-zsc="'+t.dataset.zsf+'"]').forEach(c=>c.hidden=false);return}zmSetField(t.dataset.zsf,t.value);return changed()}
  });
  m.addEventListener('input',e=>{const t=e.target;if(t.dataset.zslab!=null){const z={...(state.s.zlab||{})};if(t.value.trim())z[t.dataset.zslab]=t.value.trim();else delete z[t.dataset.zslab];state.s.zlab=z;save();rerender()}});
  m.addEventListener('click',e=>{
    const k=e.target.dataset&&e.target.dataset.zsapply;if(!k)return;
    const box=e.target.closest('.zs-cust');
    const val=i=>{const n=box.querySelector('[data-zscn="'+k+'"][data-i="'+i+'"]'),u=box.querySelector('[data-zscu="'+k+'"][data-i="'+i+'"]');if(!n||n.value==='')return null;const x=parseFloat(n.value);if(!isFinite(x)||x<-30||x>300)return null;return x+(u.value==='d'?'':u.value)};
    const a=val(0);if(a==null)return;let v=a;if(k==='mga'){const b=val(1);if(b!=null&&b!==a)v=a+'>'+b}
    zmSetField(k,v);changed();
  });
  q('#zsDone').onclick=()=>m.remove();
  draw();
}

/* ---------- text toolbar ---------- */
const tt=el('div','txt-tools no-print');tt.hidden=true;
tt.innerHTML='<button type="button" data-a="dn" title="הקטנת הטקסט">A−</button><button type="button" data-a="up" title="הגדלת הטקסט">A+</button><button type="button" data-a="right" title="יישור לימין">ימין</button><button type="button" data-a="center" title="מרכוז">מרכז</button><button type="button" data-a="left" title="יישור לשמאל">שמאל</button><button type="button" data-a="reset" title="חזרה לברירת המחדל">איפוס</button><select id="ttFont" aria-label="גופן"></select><label class="tt-col" title="צבע הטקסט"><input type="color" id="ttColor" aria-label="צבע הטקסט"></label>';
document.body.appendChild(tt);
let ttEl=null;
$('#ttFont').innerHTML=fontOptions('גופן רגיל');
$('#ttFont').addEventListener('change',e=>{if(!ttEl)return;state.textStyles=state.textStyles||{};const id=ttEl.dataset.tid,st={...(state.textStyles[id]||{})};if(e.target.value)st.ff=e.target.value;else delete st.ff;state.textStyles[id]=st;applyTextStyle(ttEl);save();ttEl.focus()});
function placeTT(){if(!ttEl)return;const r=ttEl.getBoundingClientRect();tt.style.top=Math.max(4,r.top-42)+'px';tt.style.left=Math.max(4,Math.min(window.innerWidth-tt.offsetWidth-4,r.left+r.width/2-tt.offsetWidth/2))+'px'}
stage.addEventListener('focusin',e=>{const d=e.target.closest('[contenteditable][data-tid]');if(!d)return;ttEl=d;tt.hidden=false;const st=(state.textStyles||{})[d.dataset.tid]||{};$('#ttFont').value=st.ff||'';$('#ttColor').value=st.co||rgbHex(getComputedStyle(d).color);placeTT()});
function rgbHex(c){const m=String(c).match(/\d+/g);return m?'#'+m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join(''):'#000000'}
$('#ttColor').addEventListener('input',e=>{if(!ttEl)return;state.textStyles=state.textStyles||{};const id=ttEl.dataset.tid,st={...(state.textStyles[id]||{})};st.co=e.target.value;state.textStyles[id]=st;applyTextStyle(ttEl);save()});
stage.addEventListener('focusout',()=>setTimeout(()=>{const a=document.activeElement;if(!a||!(a.closest('[contenteditable][data-tid]')||a.closest('.txt-tools'))){tt.hidden=true;ttEl=null}},150));
window.addEventListener('scroll',placeTT,true);
tt.addEventListener('mousedown',e=>{if(e.target.tagName!=='SELECT'&&e.target.tagName!=='INPUT')e.preventDefault()});
tt.addEventListener('focusout',()=>setTimeout(()=>{const a=document.activeElement;if(!a||!(a.closest('[contenteditable][data-tid]')||a.closest('.txt-tools'))){tt.hidden=true;ttEl=null}},150));
tt.addEventListener('click',e=>{const a=e.target.dataset.a;if(!a||!ttEl)return;
  state.textStyles=state.textStyles||{};const id=ttEl.dataset.tid,st={...(state.textStyles[id]||{})};
  if(a==='up')st.fs=+Math.min(4,(st.fs||1)*1.15).toFixed(3);else if(a==='dn')st.fs=+Math.max(.3,(st.fs||1)/1.15).toFixed(3);
  else if(a==='reset'){delete state.textStyles[id];applyTextStyle(ttEl);save();placeTT();return}else st.al=a;
  state.textStyles[id]=st;applyTextStyle(ttEl);save();placeTT()});

/* ---------- עיצוב חופשי (שלב 7): הזזה, הגדלה ועריכה של כל טקסט, וגרירת קווי הטבלה ----------
   state.fx = {t:{key:{dx,dy,fs,t,co,b,hide}}, grid:{cols:[7], rows:{N:[...]}, head:mm}, lines:{w,st,c}} */
function FX(){if(!state.fx||typeof state.fx!=='object')state.fx={};const f=state.fx;if(!f.t||typeof f.t!=='object')f.t={};if(!f.grid||typeof f.grid!=='object')f.grid={};if(!f.grid.rows)f.grid.rows={};if(!f.lines)f.lines={};return f}
function fxOn(){return document.body.classList.contains('fx-on')}
const FX_SKIP='.fxbox,[contenteditable=true],[contenteditable=""],.pg-img,.rsz,.no-print,button,input,select,label,.img-tools,.fx-h,.notice,.sheet-label,.drop';
function fxOwnText(n){for(const c of n.childNodes)if(c.nodeType===3&&c.nodeValue.trim())return true;return false}
function fxSig(n){return n.tagName.toLowerCase()+'.'+(n.classList[0]||'')}
function fxSel(sig){const [t,c]=sig.split('.');return t+(c?'.'+CSS.escape(c):'')}
function fxKind(pk){const m=String(pk).match(/^(mi|h|w|t|d|x)-/);return m?m[1]:pk==='cover'?'cover':'m'}
function fxAnchor(n){
  const w=n.closest('.sheet-wrap'),pk=(w&&w.dataset.key)||'';
  const d=n.closest('[data-date]');if(d)return ['d:'+d.dataset.date,d,pk];
  const c=n.closest('[data-col]');if(c)return ['c:'+pk+':'+c.dataset.col,c,pk];
  return ['p:'+pk,n.closest('.page'),pk]}
function fxOk(n){return n&&n.nodeType===1&&n.closest('.page')&&!n.closest(FX_SKIP)&&!n.classList.contains('page')&&(fxOwnText(n)||n.dataset.fxo!=null)}
function fxKeys(n){
  const [ak,a,pk]=fxAnchor(n);if(!a)return null;const sig=fxSig(n);let i=0;
  for(const x of a.querySelectorAll(fxSel(sig))){if(x===n)break;if(fxSig(x)===sig&&fxOk(x))i++}
  const ty=fxType(n);return {k:ak+'|'+sig+'|'+i,g:ak.startsWith('p:')?'g:'+fxKind(pk)+'|'+sig+'|'+i:null,ct:'ct:'+ty,pt:'pt:'+fxPageKey(n)+'|'+ty}}
/* סוג הטקסט (למשל: מספרי הימים, שורת הזמנים, אירוע אישי). שינוי "בכל הלוח" או "בעמוד" חל על כל הטקסטים מאותו סוג */
const FX_NOCLS=/^(fx-|has-|sel$|over$|ml$|editing$)/;
function fxType(n){return n.tagName.toLowerCase()+'.'+[...n.classList].filter(c=>!FX_NOCLS.test(c)).sort().join('.')+'@'+((n.parentElement&&n.parentElement.classList[0])||'')}
function fxPageKey(n){const w=n.closest('.sheet-wrap');return (w&&w.dataset.key)||''}
function fxGet(K){const T=FX().t;return {...(K.ct&&T[K.ct]||{}),...(K.pt&&T[K.pt]||{}),...(K.g&&T[K.g]||{}),...(T[K.k]||{})}}
/* ברירת המחדל: אירועים אישיים ותזכורות רק באותו מקום, וכל השאר (ימים, זמנים, כותרות) בכל הלוח */
function fxDefScope(n){return n.closest('.e.personal,.e.reminder')||n.matches('.e.personal,.e.reminder')?'one':'all'}
function fxStyle(n,st){
  if(n.dataset.fxo==null)n.dataset.fxo=n.textContent;
  n.style.fontSize='';n.style.translate='';n.style.color='';n.style.fontWeight='';n.style.fontFamily='';n.classList.remove('fx-hidden');
  if(st.ff){loadFont(st.ff);n.style.fontFamily=fontCSS(st.ff)}
  if(n.dataset.fxd==null)n.dataset.fxd=getComputedStyle(n).display;
  if(st.t!=null){n.textContent=st.t;n.dataset.fxt=1}else if(n.dataset.fxt){n.textContent=n.dataset.fxo;delete n.dataset.fxt}
  if(st.fs&&st.fs!==1)n.style.fontSize=(parseFloat(getComputedStyle(n).fontSize)*st.fs).toFixed(2)+'px';
  if(st.dx||st.dy){if(n.dataset.fxd==='inline')n.style.display='inline-block';n.style.translate=(+st.dx||0).toFixed(2)+'mm '+(+st.dy||0).toFixed(2)+'mm'}
  if(st.co)n.style.color=st.co;
  if(st.b!=null)n.style.fontWeight=st.b?'700':'400';
  if(st.hide)n.classList.add('fx-hidden');
}
/* אחרי כל ציור: מחילים את השינויים השמורים */
function fxApply(){
  const T=FX().t;if(!Object.keys(T).length)return;
  const cnt=new Map();
  for(const n of stage.querySelectorAll('.page *')){
    if(!fxOk(n))continue;const [ak,,pk]=fxAnchor(n),sig=fxSig(n),ck=ak+'|'+sig,i=cnt.get(ck)||0;cnt.set(ck,i+1);
    const k=ak+'|'+sig+'|'+i,g=ak.startsWith('p:')?'g:'+fxKind(pk)+'|'+sig+'|'+i:null,ty=fxType(n),ct='ct:'+ty,pt='pt:'+fxPageKey(n)+'|'+ty;
    if(T[k]||(g&&T[g])||T[ct]||T[pt]){const st={...(T[ct]||{}),...(T[pt]||{}),...(g&&T[g]||{}),...(T[k]||{})};if(T[ct]&&T[ct].t!=null&&!(T[k]&&T[k].t!=null))delete st.t;fxStyle(n,st)}
  }
}
function fxLines(p){const L=FX().lines;if(L.w!=null)p.style.setProperty('--lw',L.w+'mm');if(L.st)p.style.setProperty('--ls',L.st);if(L.c)p.style.setProperty('--p-line',L.c)}
function fxGridStyle(grid,rows){
  const G=FX().grid;grid.dataset.rows=rows;
  if(G.hp){grid.classList.add('gh');grid.style.setProperty('--gh',G.hp+'%')}if(G.wp){grid.classList.add('gw');grid.style.setProperty('--gw',G.wp+'%')}
  if(Array.isArray(G.cols)&&G.cols.length===7)grid.style.gridTemplateColumns=G.cols.map(v=>'minmax(0,'+(+v||1)+'fr)').join(' ');
  const R=G.rows[rows];
  grid.style.gridTemplateRows=(G.head?(+G.head).toFixed(2)+'mm':'auto')+' '+(Array.isArray(R)&&R.length===rows?R.map(v=>'minmax(0,'+(+v||1)+'fr)').join(' '):'repeat('+rows+',minmax(0,1fr))');
}
/* היסטוריה לביטול */
const FXH=[];
function fxPush(){FXH.push(JSON.stringify(FX()));if(FXH.length>60)FXH.shift();fxUndoBtn()}
function fxUndo(){if(!FXH.length)return;state.fx=JSON.parse(FXH.pop());fxUnselect();save();render();fxUndoBtn()}
function fxUndoBtn(){document.querySelectorAll('[data-fx="undo"]').forEach(b=>b.disabled=!FXH.length)}

/* סרגל הכלים של טקסט נבחר */
const fxb=el('div','fx-bar no-print');fxb.hidden=true;
fxb.innerHTML='<span class="fx-grip" title="גררו כדי להזיז את סרגל העריכה">⠿</span><span class="fx-tip">✥ גררו להזזה</span><button type="button" data-fx="dn" title="הקטנה">A−</button><button type="button" data-fx="up" title="הגדלה">A+</button><button type="button" data-fx="b" title="מודגש"><b>B</b></button><label class="tt-col" title="צבע"><input type="color" data-fx="co" aria-label="צבע"></label><select class="fx-ff" data-fx="ff" title="סוג הגופן" aria-label="סוג הגופן"></select><button type="button" data-fx="edit" title="עריכת הטקסט">✎ עריכה</button><button type="button" data-fx="hide" title="הסתרה / הצגה">הסתרה</button><span class="fx-scope" role="group" aria-label="על מה השינוי חל"><button type="button" data-fx="scope" data-fxsc="one" title="השינוי רק בטקסט הזה">🔓 רק זה</button><button type="button" data-fx="scope" data-fxsc="page" title="כל הטקסטים מהסוג הזה בעמוד הזה">📄 בעמוד</button><button type="button" data-fx="scope" data-fxsc="all" title="כל הטקסטים מהסוג הזה בכל הלוח">🔒 בכל הלוח</button></span><button type="button" data-fx="reset" title="חזרה למקור">↺ איפוס</button><button type="button" data-fx="undo" title="ביטול הפעולה האחרונה">↶</button><button type="button" data-fx="x" title="סגירה">✕</button>';
document.body.appendChild(fxb);fxb.querySelector('[data-fx="ff"]').innerHTML=fontOptions('גופן רגיל');
let FXS=null; /* {n,K} */
function fxScopeKey(){if(!FXS)return null;const sc=FXS.scope||'one';return sc==='all'?FXS.K.ct:sc==='page'?FXS.K.pt:FXS.K.k}
function fxScopeUI(){fxb.querySelectorAll('[data-fxsc]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fxsc===(FXS&&FXS.scope))))}
let FXBP=null; /* מיקום שהמשתמש גרר אליו את סרגל העריכה */
function fxPlace(){if(!FXS||!FXS.n.isConnected){fxb.hidden=true;return}
  if(FXBP){fxb.style.left=Math.max(0,Math.min(innerWidth-fxb.offsetWidth,FXBP.x))+'px';fxb.style.top=Math.max(0,Math.min(innerHeight-fxb.offsetHeight,FXBP.y))+'px';return}
  /* הסרגל מעל הפריט ולא עליו; אם אין מקום למעלה, מתחתיו */
  const r=FXS.n.getBoundingClientRect(),H=fxb.offsetHeight;let top=r.top-H-10;if(top<4)top=r.bottom+10;if(top+H>innerHeight-4&&r.top-H-10>=4)top=r.top-H-10;
  fxb.style.top=Math.max(4,top)+'px';fxb.style.left=Math.max(4,Math.min(innerWidth-fxb.offsetWidth-4,r.left+r.width/2-fxb.offsetWidth/2))+'px'}
fxb.addEventListener('pointerdown',e=>{const g=e.target.closest('.fx-grip');if(!g)return;e.preventDefault();e.stopPropagation();const r=fxb.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top;
  const mv=ev=>{FXBP={x:ev.clientX-ox,y:ev.clientY-oy};fxPlace()};const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up)};
  addEventListener('pointermove',mv);addEventListener('pointerup',up)});
fxb.addEventListener('dblclick',e=>{if(e.target.closest('.fx-grip')){FXBP=null;fxPlace()}});
function fxSelect(n){
  fxUnselect();const K=fxKeys(n);if(!K)return;FXS={n,K};n.classList.add('fx-sel');
  const T=FX().t,own=T[K.k]&&Object.keys(T[K.k]).some(x=>x!=='t');FXS.scope=own?'one':T[K.pt]?'page':(T[K.ct]?'all':fxDefScope(n));fxScopeUI();
  const st=fxGet(K);fxb.querySelector('[data-fx="co"]').value=st.co||rgbHex(getComputedStyle(n).color);
  fxb.querySelector('[data-fx="hide"]').textContent=st.hide?'הצגה':'הסתרה';fxb.querySelector('[data-fx="ff"]').value=st.ff||'';
  fxb.hidden=false;fxUndoBtn();fxPlace();
}
function fxUnselect(){if(FXS&&FXS.n){FXS.n.classList.remove('fx-sel');if(FXS.n.isContentEditable){FXS.n.blur()}}FXS=null;fxb.hidden=true}
function fxSet(fn){if(!FXS)return;fxPush();const T=FX().t,k=fxScopeKey(),st={...(T[k]||{})};fn(st);
  for(const x of Object.keys(st))if(st[x]==null||st[x]===''||(x==='fs'&&st[x]===1)||((x==='dx'||x==='dy')&&!st[x]))delete st[x];
  if(Object.keys(st).length)T[k]=st;else delete T[k];
  save();
  if(k!==FXS.K.k){const sc=FXS.scope,kk=FXS.K.k;render();const again=fxFind(kk);if(again){fxSelect(again);FXS.scope=sc;fxScopeUI()}else fxUnselect()}else{fxStyle(FXS.n,fxGet(FXS.K));fxPlace()}
}
function fxFind(k){for(const n of stage.querySelectorAll('.page *')){if(!fxOk(n))continue;const K=fxKeys(n);if(K&&K.k===k)return n}return null}
fxb.addEventListener('mousedown',e=>{if(e.target.tagName!=='INPUT'&&e.target.tagName!=='SELECT'&&e.target.tagName!=='OPTION')e.preventDefault()});
fxb.addEventListener('click',e=>{const b=e.target.closest('[data-fx]');if(!b||!FXS)return;const a=b.dataset.fx;
  if(a==='x')return fxUnselect();
  if(a==='undo')return fxUndo();
  if(a==='scope'){const sc=b.dataset.fxsc,T=FX().t,K=FXS.K;FXS.scope=sc;fxScopeUI();
    /* מעבר מ"רק זה" לרמה רחבה יותר: השינויים של הטקסט הזה עוברים לכל הטקסטים מאותו סוג */
    if(sc!=='one'&&T[K.k]){const {t,...rest}=T[K.k];if(Object.keys(rest).length){fxPush();const dst=sc==='all'?K.ct:K.pt;T[dst]={...(T[dst]||{}),...rest};if(t!=null)T[K.k]={t};else delete T[K.k];save();const k=K.k;render();const n=fxFind(k);if(n){fxSelect(n);FXS.scope=sc;fxScopeUI()}}}
    return}
  if(a==='all'){const T=FX().t;if(b.checked&&T[FXS.K.k]&&FXS.K.g){fxPush();T[FXS.K.g]={...(T[FXS.K.g]||{}),...T[FXS.K.k]};delete T[FXS.K.k];save();const k=FXS.K.k;render();const n=fxFind(k);if(n){fxSelect(n);fxb.querySelector('[data-fx="all"]').checked=true}}return}
  if(a==='up')return fxSet(st=>st.fs=+Math.min(5,(st.fs||1)*1.12).toFixed(3));
  if(a==='dn')return fxSet(st=>st.fs=+Math.max(.25,(st.fs||1)/1.12).toFixed(3));
  if(a==='b')return fxSet(st=>{const cur=st.b!=null?st.b:+getComputedStyle(FXS.n).fontWeight>=600;st.b=!cur});
  if(a==='hide'){fxSet(st=>st.hide=st.hide?null:1);b.textContent=fxGet(FXS.K).hide?'הצגה':'הסתרה';return}
  if(a==='reset'){fxPush();const T=FX().t,sc=FXS.scope;delete T[FXS.K.k];if(FXS.K.g)delete T[FXS.K.g];if(sc==='all')delete T[FXS.K.ct];if(sc==='page')delete T[FXS.K.pt];save();const k=FXS.K.k;render();const n=fxFind(k);if(n)fxSelect(n);else fxUnselect();return}
  if(a==='edit'){const n=FXS.n;n.contentEditable='true';n.spellcheck=false;n.focus();const r=document.createRange();r.selectNodeContents(n);const s=getSelection();s.removeAllRanges();s.addRange(r);
    const done=()=>{n.removeEventListener('blur',done);n.removeAttribute('contenteditable');const v=n.textContent.trim();if(FXS&&FXS.n===n){const sc=FXS.scope;FXS.scope='one';fxSet(st=>st.t=v===(n.dataset.fxo||'').trim()?null:v);if(FXS)FXS.scope=sc;fxScopeUI()}};
    n.addEventListener('blur',done);n.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Enter'){ev.preventDefault();n.blur()}if(ev.key==='Escape'){n.textContent=fxGet(FXS.K).t??n.dataset.fxo;n.blur()}})}
});
fxb.querySelector('[data-fx="co"]').addEventListener('change',e=>fxSet(st=>st.co=e.target.value));
fxb.querySelector('[data-fx="ff"]').addEventListener('change',e=>{const v=e.target.value;loadFont(v);fxSet(st=>st.ff=v||null)});
window.addEventListener('scroll',fxPlace,true);window.addEventListener('resize',()=>setTimeout(fxPlace,150));
function fxPick(t){if(!t||!t.closest||t.closest(FX_SKIP))return null;let n=t;while(n&&!n.classList.contains('page')){if(fxOk(n))return n;n=n.parentElement}return null}
let fxDragged=false;
stage.addEventListener('click',e=>{
  if(!fxOn())return;
  if(fxDragged){fxDragged=false;e.preventDefault();e.stopImmediatePropagation();return}
  if(FXS&&FXS.n.isContentEditable&&FXS.n.contains(e.target)){e.stopImmediatePropagation();return}
  const n=fxPick(e.target);if(!n){if(!e.target.closest('.fx-h'))fxUnselect();return}
  e.preventDefault();e.stopImmediatePropagation();fxSelect(n);
},true);
stage.addEventListener('pointerdown',e=>{
  if(!fxOn()||e.button!==0)return;const n=fxPick(e.target);if(!n||n.isContentEditable)return;
  const sx=e.clientX,sy=e.clientY,f=screenMM(n),K=fxKeys(n);if(!K)return;const st0=fxGet(K);let moved=false,pushed=false;
  const box=n.closest('.cell,.wd,.wday,.wd-col'),br=box&&box.getBoundingClientRect(),nr=n.getBoundingClientRect();
  const clamp=(dx,dy)=>{if(!box)return [dx,dy];if(n===box)return [0,0];return [Math.max(br.left-nr.left,Math.min(br.right-nr.right,dx)),Math.max(br.top-nr.top,Math.min(br.bottom-nr.bottom,dy))]};
  const mv=ev=>{const [dx,dy]=clamp(ev.clientX-sx,ev.clientY-sy);if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<4)return;
    if(!moved){moved=true;if(!FXS||FXS.n!==n)fxSelect(n);n.classList.add('fx-drag')}
    ev.preventDefault();const st={...st0,dx:+((+st0.dx||0)+dx*f).toFixed(2),dy:+((+st0.dy||0)+dy*f).toFixed(2)};
    if(n.dataset.fxd==null)n.dataset.fxd=getComputedStyle(n).display;if(n.dataset.fxd==='inline')n.style.display='inline-block';
    n.style.translate=st.dx+'mm '+st.dy+'mm';fxPlace()};
  const up=ev=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);n.classList.remove('fx-drag');
    if(!moved)return;fxDragged=true;setTimeout(()=>fxDragged=false,400);
    const [dx,dy]=clamp(ev.clientX-sx,ev.clientY-sy);fxSet(st=>{st.dx=+((+st.dx||0)+dx*f).toFixed(2);st.dy=+((+st.dy||0)+dy*f).toFixed(2)})};
  addEventListener('pointermove',mv,{passive:false});addEventListener('pointerup',up);addEventListener('pointercancel',up);
},true);
stage.addEventListener('pointerover',e=>{if(!fxOn())return;stage.querySelectorAll('.fx-hov').forEach(x=>x.classList.remove('fx-hov'));const n=fxPick(e.target);if(n)n.classList.add('fx-hov')});
document.addEventListener('keydown',e=>{if(!fxOn()||!FXS||FXS.n.isContentEditable)return;if(e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]'))return;
  const step=e.shiftKey?3:0.5,M={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
  if(M){e.preventDefault();fxSet(st=>{st.dx=+((+st.dx||0)+M[0]).toFixed(2);st.dy=+((+st.dy||0)+M[1]).toFixed(2)})}
  else if(e.key==='Escape')fxUnselect();
  else if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();fxUndo()}});

/* ---------- עיצוב חופשי: גודל הטבלה, ותיבות כיתוב ותמונה בכל מקום בדף ----------
   state.fx.grid.hp / wp: גובה ורוחב הטבלה באחוזים מהמקום שלה (ריק = כל המקום).
   state.fx.boxes: [{id, k: מפתח העמוד או 'g:m' לכל החודשים, kind:'text'|'img', x,y,w,h (% מהעמוד), t, fs, co, b, al, img}] */
function fxBoxes(){const f=FX();if(!Array.isArray(f.boxes))f.boxes=[];return f.boxes}
function fxBoxRender(){
  stage.querySelectorAll('.fxbox').forEach(n=>n.remove());
  const B=fxBoxes();if(!B.length)return;
  stage.querySelectorAll('.sheet-wrap[data-key]').forEach(w=>{const key=w.dataset.key,p=w.querySelector('.page');if(!p)return;
    const mine=B.filter(b=>b.k===key||(b.k==='g:m'&&fxKind(key)==='m'));if(!mine.length)return;p.classList.add('has-fxbox');
    mine.forEach(b=>{const d=el('div','fxbox fxb-'+b.kind);d.dataset.bid=b.id;Object.assign(d.style,{left:b.x+'%',top:b.y+'%',width:b.w+'%',height:b.h+'%'});
      if(b.kind==='img'){if(b.img){const im=el('img');im.src=b.img;im.alt='';im.draggable=false;im.style.objectFit=b.fit==='cover'?'cover':'contain';d.appendChild(im)}else d.appendChild(el('div','fxb-empty','לחצו פעמיים לבחירת תמונה'))}
      else{const t=el('div','fxb-t');t.textContent=b.t||'';t.dataset.ph='לחצו פעמיים לכתיבה';t.style.fontSize='calc(var(--u)*'+(+b.fs||5)+')';if(b.co)t.style.color=b.co;if(b.ff){loadFont(b.ff);t.style.fontFamily=fontCSS(b.ff)}if(b.b)t.style.fontWeight='700';t.style.textAlign=b.al||'center';d.appendChild(t)}
      if(b.k==='g:m')d.classList.add('fxb-all');
      p.appendChild(d)})})
}
function fxBoxGet(id){return fxBoxes().find(b=>b.id===id)}
function fxBoxSave(){save();fxBoxRender();fxBoxDecorate()}
let FXB=null;
const fxbb=el('div','fx-bar fxb-bar no-print');fxbb.hidden=true;document.body.appendChild(fxbb);
function fxBoxBar(){const b=FXB&&fxBoxGet(FXB);if(!b){fxbb.hidden=true;return}
  const H='<span class="fx-tip">✥ גררו להזזה · הפינה לשינוי גודל</span>'+(b.kind==='text'?'<button type="button" data-fb="dn" title="הקטנה">A−</button><button type="button" data-fb="up" title="הגדלה">A+</button><button type="button" data-fb="b" title="מודגש"><b>B</b></button><label class="tt-col" title="צבע"><input type="color" data-fb="co" value="'+(b.co||'#1c242b')+'"></label><select class="fx-ff" data-fb="ff" title="סוג הגופן" aria-label="סוג הגופן">'+fontOptions('גופן הכותרות')+'</select><button type="button" data-fb="al" title="יישור">⇔ יישור</button><button type="button" data-fb="edit">✎ עריכה</button>':'<button type="button" data-fb="img">🖼 החלפה</button><button type="button" data-fb="fit">'+(b.fit==='cover'?'כל התמונה':'מילוי')+'</button>')+
    '<label class="fx-all"><input type="checkbox" data-fb="all"'+(b.k==='g:m'?' checked':'')+'> בכל החודשים</label><button type="button" data-fb="del" title="מחיקה">🗑 מחיקה</button>';
  /* בונים מחדש רק כשמשהו השתנה, כדי שרשימת הגופנים לא תיסגר בגלילה */
  if(fxbb._h!==H||fxbb._b!==b.id){fxbb.innerHTML=H;fxbb._h=H;fxbb._b=b.id}
  {const ff=fxbb.querySelector('[data-fb="ff"]');if(ff&&document.activeElement!==ff)ff.value=b.ff||''}
  const n=stage.querySelector('.fxbox[data-bid="'+b.id+'"]');if(!n){fxbb.hidden=true;return}const r=n.getBoundingClientRect();fxbb.hidden=false;
  fxbb.style.top=Math.max(4,r.top-46)+'px';fxbb.style.left=Math.max(4,Math.min(innerWidth-fxbb.offsetWidth-4,r.left))+'px'}
fxbb.addEventListener('click',e=>{const t=e.target.closest('[data-fb]');if(!t)return;const b=fxBoxGet(FXB);if(!b)return;const a=t.dataset.fb;if(a==='co'||a==='all')return;
  fxPush();
  if(a==='up')b.fs=+Math.min(40,(+b.fs||5)*1.12).toFixed(2);if(a==='dn')b.fs=+Math.max(1.5,(+b.fs||5)/1.12).toFixed(2);if(a==='b')b.b=!b.b;
  if(a==='al')b.al={center:'right',right:'left',left:'center'}[b.al||'center'];
  if(a==='fit')b.fit=b.fit==='cover'?'contain':'cover';
  if(a==='del'){FX().boxes=fxBoxes().filter(x=>x!==b);FXB=null}
  if(a==='edit'){fxBoxEdit(b.id);return}
  if(a==='img'){fxBoxImg(b);return}
  fxBoxSave();fxBoxBar()});
fxbb.addEventListener('input',e=>{const t=e.target;if(t.dataset.fb!=='co')return;const b=fxBoxGet(FXB);if(!b)return;b.co=t.value;const n=stage.querySelector('.fxbox[data-bid="'+b.id+'"] .fxb-t');if(n)n.style.color=t.value;clearTimeout(fxbb.T);fxbb.T=setTimeout(save,300)});
fxbb.addEventListener('change',e=>{const t=e.target;if(t.dataset.fb!=='ff')return;const b=fxBoxGet(FXB);if(!b)return;fxPush();b.ff=t.value||undefined;if(!b.ff)delete b.ff;loadFont(b.ff);
  const n=stage.querySelector('.fxbox[data-bid="'+b.id+'"] .fxb-t');if(n)n.style.fontFamily=b.ff?fontCSS(b.ff):'';save()});
fxbb.addEventListener('change',e=>{const t=e.target;if(t.dataset.fb!=='all')return;const b=fxBoxGet(FXB);if(!b)return;fxPush();
  if(t.checked){b.kPage=b.k;b.k='g:m'}else{b.k=b.kPage&&b.kPage!=='g:m'?b.kPage:(fxVisibleKey()||b.k)}fxBoxSave();fxBoxBar()});
function fxBoxImg(b){const f=v=>{if(!v.img)return;fxPush();b.img=v.img;fxBoxSave();fxBoxBar()};f.maxPx=QPX('box');pickImage(f)}
function fxBoxEdit(id){const n=stage.querySelector('.fxbox[data-bid="'+id+'"] .fxb-t');if(!n)return;n.contentEditable='true';n.classList.add('editing');n.focus();
  try{const r=document.createRange();r.selectNodeContents(n);r.collapse(false);const sl=getSelection();sl.removeAllRanges();sl.addRange(r)}catch(e){}
  n.onblur=()=>{n.contentEditable='false';n.classList.remove('editing');const b=fxBoxGet(id);if(b&&b.t!==n.innerText.trim()){fxPush();b.t=n.innerText.trim();save()}}}
/* העמוד שרואים עכשיו במרכז המסך */
function fxVisibleKey(){let best=null,bd=1e9;const cy=innerHeight/2;stage.querySelectorAll('.sheet-wrap[data-key]').forEach(w=>{const r=w.getBoundingClientRect();const d=r.top<=cy&&r.bottom>=cy?0:Math.min(Math.abs(r.top-cy),Math.abs(r.bottom-cy));if(d<bd){bd=d;best=w.dataset.key}});return best}
function fxBoxAdd(kind,key){const k=key||fxVisibleKey();if(!k)return;fxPush();const all=$('#fxbAll')&&$('#fxbAll').checked&&fxKind(k)==='m';
  const b={id:'b'+uid(),k:all?'g:m':k,kind,x:kind==='text'?25:35,y:kind==='text'?8:10,w:kind==='text'?50:30,h:kind==='text'?7:20,t:'',fs:6};
  fxBoxes().push(b);FXB=b.id;fxBoxSave();
  if(kind==='img')fxBoxImg(b);else setTimeout(()=>fxBoxEdit(b.id),50);fxBoxBar()}
/* גרירה ושינוי גודל של תיבה, וידיות לגודל הטבלה */
/* הטבלה הראשית של העמוד (חודש, שבוע, יום, טבלה): גודל ומיקום. בחודש נשמר ב-FX().grid, באחרים ב-FX().tbl[סוג] */
const FXT_SEL='.page .grid[data-rows],.page .week,.page .day-body,.page .wt-wrap,.page>.pg-head,.page .cd-grid,.page .cdp-grid,.page .cdb-grid,.page>.cd-head';
function fxtKind(n){return n.matches('.pg-head')?'head':n.matches('.cd-head')?'cdhead':n.matches('.cd-grid')?'cdgrid':n.matches('.cdp-grid')?'cdpgrid':n.matches('.cdb-grid')?'cdbgrid':n.matches('.grid')?'month':n.matches('.week')?'week':n.matches('.day-body')?'day':'table'}
function fxtCfg(kind){const f=FX();if(kind==='month')return f.grid;if(!f.tbl||typeof f.tbl!=='object')f.tbl={};if(!f.tbl[kind])f.tbl[kind]={};return f.tbl[kind]}
function fxtApply(){stage.querySelectorAll(FXT_SEL).forEach(n=>{const C=fxtCfg(fxtKind(n));n.classList.add('fxt');
  if(n.matches('.pg-head,.cd-head')){/* כותרת החודש: קנה מידה (גם לטקסט), גובה ורוחב במ"מ */
    if(C.sc)n.style.setProperty('--u',(unitK()*C.sc).toFixed(4)+'mm');else n.style.removeProperty('--u');n.style.height=C.hmm?C.hmm+'mm':'';n.style.width=C.wmm?C.wmm+'mm':'';n.classList.toggle('hset',!!C.hmm);
    n.style.translate=(C.tx||C.ty)?(+C.tx||0)+'mm '+(+C.ty||0)+'mm':'';return}
  n.classList.toggle('gh',!!C.hp);n.classList.toggle('gw',!!C.wp);if(C.hp)n.style.setProperty('--gh',C.hp+'%');if(C.wp)n.style.setProperty('--gw',C.wp+'%');
  n.style.translate=(C.tx||C.ty)?(+C.tx||0)+'mm '+(+C.ty||0)+'mm':''})}
function fxBoxDecorate(){
  stage.querySelectorAll('.fxb-rs,.fx-gsz').forEach(x=>x.remove());
  if(!fxOn()){FXB=null;fxbb.hidden=true;return}
  stage.querySelectorAll('.fxbox').forEach(n=>{n.appendChild(el('span','fxb-rs no-print'));n.classList.toggle('sel',n.dataset.bid===FXB)});
  stage.querySelectorAll('.fx-tmove').forEach(x=>x.remove());
  stage.querySelectorAll(FXT_SEL).forEach(g=>{if(g.closest('.fxt')!==g&&g.parentElement.closest('.fxt'))return;const add=(c,t)=>{const h=el('div','fx-h fx-gsz '+c+' no-print');h.title=t;g.appendChild(h);return h};
    [['t','גררו כדי לשנות את הגובה (מלמעלה)'],['b','גררו כדי לשנות את הגובה (מלמטה)'],['l','גררו כדי לשנות את הרוחב (משמאל)'],['r','גררו כדי לשנות את הרוחב (מימין)'],
     ['tl','גררו כדי להגדיל או להקטין את כל הטבלה'],['tr','גררו כדי להגדיל או להקטין את כל הטבלה'],['bl','גררו כדי להגדיל או להקטין את כל הטבלה'],['br','גררו כדי להגדיל או להקטין את כל הטבלה']]
      .forEach(([c,t])=>{const h=add('fx-gsz-'+c+(c.length>1?' fx-gsz-cn':''),t);h.dataset.ed=c});
    const hd=g.matches('.pg-head,.cd-head'),mv=el('div','fx-h fx-tmove no-print',hd?'✥ הזזת הכותרת':'✥ הזזת הטבלה');mv.title=hd?'גררו כדי להזיז את הכותרת':'גררו כדי להזיז את כל הטבלה';g.appendChild(mv)});
  fxBoxBar();
}
stage.addEventListener('pointerdown',e=>{
  if(!fxOn()||e.button!==0)return;
  const tm=e.target.closest('.fx-tmove');
  if(tm){e.preventDefault();e.stopPropagation();const g=tm.parentNode,C=fxtCfg(fxtKind(g)),f=screenMM(g),sx=e.clientX,sy=e.clientY,x0=+C.tx||0,y0=+C.ty||0;let moved=false;
    const mv=ev=>{if(!moved){moved=true;fxPush()}C.tx=+(x0+(ev.clientX-sx)*f).toFixed(1);C.ty=+(y0+(ev.clientY-sy)*f).toFixed(1);g.style.translate=C.tx+'mm '+C.ty+'mm'};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);if(moved){if(!C.tx&&!C.ty){delete C.tx;delete C.ty}save();render()}};
    addEventListener('pointermove',mv);addEventListener('pointerup',up);return}
  const gs=e.target.closest('.fx-gsz');
  if(gs){e.preventDefault();e.stopPropagation();const g=gs.parentNode,par=g.parentNode,pr=par.getBoundingClientRect(),gr=g.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ed=gs.dataset.ed||'b';
    const G=fxtCfg(fxtKind(g)),f=screenMM(g),T=ed.includes('t'),B=ed.includes('b'),Lf=ed.includes('l'),R=ed.includes('r'),corner=ed.length>1;
    let pw0=G.wp||Math.min(100,gr.width/pr.width*100),ph0=G.hp||Math.min(100,gr.height/pr.height*100);
    /* הצד שנשאר במקום: הצד שמול הידית */
    const HD=g.matches('.pg-head,.cd-head'),sc0=+G.sc||1,hm0=gr.height*f,wm0=gr.width*f;let sc=sc0,hm=null,wm=null;
    const ax=Lf?'right':R?'left':null,ay=T?'bottom':B?'top':null;let tx=+G.tx||0,ty=+G.ty||0,vh=null,vw=null,moved=false;
    /* כיול: קובעים את הגודל הנוכחי באחוזים כך שבדיוק יתאים למה שרואים, וכך המימד השני לא זז */
    const calib=()=>{g.classList.add('gh','gw');g.style.setProperty('--gh',ph0+'%');g.style.setProperty('--gw',pw0+'%');let r=g.getBoundingClientRect();
      if(r.height)ph0*=gr.height/r.height;if(r.width)pw0*=gr.width/r.width;g.style.setProperty('--gh',ph0+'%');g.style.setProperty('--gw',pw0+'%');vh=ph0;vw=pw0};
    const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;if(!moved){if(Math.hypot(dx,dy)<2)return;moved=true;fxPush();if(!HD)calib()}
      let sw=1,sh=1;
      if(Lf)sw=(gr.width-dx)/gr.width;else if(R)sw=(gr.width+dx)/gr.width;
      if(T)sh=(gr.height-dy)/gr.height;else if(B)sh=(gr.height+dy)/gr.height;
      /* בפינה: גודל יחסי, לפי ההטלה של הגרירה על האלכסון (כך שגם בכותרת נמוכה וארוכה זה לא קופץ) */
      if(corner){const ux=Lf?-1:1,uy=T?-1:1,W=gr.width,Hh=gr.height;const k=Math.max(.2,1+(dx*ux*W+dy*uy*Hh)/(W*W+Hh*Hh));sw=sh=k}
      if(HD){if(corner){const k=Math.max(.4/sc0,Math.min(4/sc0,sw));sc=sc0*k;g.style.setProperty('--u',(unitK()*sc).toFixed(4)+'mm');if(G.hmm){hm=hm0*k;g.style.height=hm+'mm'}if(G.wmm){wm=wm0*k;g.style.width=wm+'mm'}}
        else{if(T||B){hm=Math.max(6,hm0*sh);g.style.height=hm+'mm';g.classList.add('hset')}if(Lf||R){wm=Math.max(30,wm0*sw);g.style.width=wm+'mm'}}}
      else{
      if(T||B){vh=Math.max(20,Math.min(Math.max(100,ph0),ph0*sh));g.classList.add('gh');g.style.setProperty('--gh',vh+'%')}
      if(Lf||R){vw=Math.max(25,Math.min(Math.max(100,pw0),pw0*sw));g.classList.add('gw');g.style.setProperty('--gw',vw+'%')}}
      /* מיישרים כך שהצד שמול הידית לא זז */
      g.style.translate=tx+'mm '+ty+'mm';const r=g.getBoundingClientRect();
      if(ax)tx+=(gr[ax]-r[ax])*f;if(ay)ty+=(gr[ay]-r[ay])*f;g.style.translate=tx+'mm '+ty+'mm'};
    const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);if(!moved)return;
      if(HD){if(sc!==sc0){G.sc=+sc.toFixed(3);if(Math.abs(G.sc-1)<.01)delete G.sc}if(hm!=null)G.hmm=+hm.toFixed(1);if(wm!=null)G.wmm=+wm.toFixed(1)}
      else{G.hp=+vh.toFixed(2);G.wp=+vw.toFixed(2);if(vw>=99.5&&vw<=100.5)delete G.wp}
      G.tx=+tx.toFixed(1);G.ty=+ty.toFixed(1);if(!G.tx&&!G.ty){delete G.tx;delete G.ty}save();render()};
    addEventListener('pointermove',mv);addEventListener('pointerup',up);return}
  const n=e.target.closest('.fxbox');if(!n)return;
  e.preventDefault();e.stopPropagation();const id=n.dataset.bid,b=fxBoxGet(id);if(!b)return;
  if(FXB!==id){FXB=id;stage.querySelectorAll('.fxbox.sel').forEach(x=>x.classList.remove('sel'));n.classList.add('sel');fxUnselect();fxBoxBar()}
  if(e.target.closest('.fxb-t.editing'))return;
  const rs=e.target.closest('.fxb-rs'),pr=n.parentNode.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,b0={...b};let moved=false;
  const mv=ev=>{const dx=(ev.clientX-sx)/pr.width*100,dy=(ev.clientY-sy)/pr.height*100;if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<3)return;if(!moved){moved=true;fxPush()}
    if(rs){b.w=Math.max(4,Math.min(b0.x+b0.w+10,b0.w-dx));b.x=b0.x+b0.w-b.w;b.h=Math.max(2,b0.h+dy)}
    else{b.x=Math.max(-10,Math.min(100-b0.w*.2,b0.x+dx));b.y=Math.max(-5,Math.min(100-b0.h*.2,b0.y+dy))}
    Object.assign(n.style,{left:b.x+'%',top:b.y+'%',width:b.w+'%',height:b.h+'%'});fxBoxBar()};
  const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);if(moved){['x','y','w','h'].forEach(k=>b[k]=+(+b[k]).toFixed(2));save();if(b.k==='g:m'){fxBoxRender();fxBoxDecorate()}}};
  addEventListener('pointermove',mv);addEventListener('pointerup',up)},true);
stage.addEventListener('dblclick',e=>{if(!fxOn())return;const n=e.target.closest('.fxbox');if(!n)return;const b=fxBoxGet(n.dataset.bid);if(!b)return;if(b.kind==='img')fxBoxImg(b);else fxBoxEdit(b.id)});
document.addEventListener('pointerdown',e=>{if(FXB&&!e.target.closest('.fxbox,.fxb-bar,.modal-back')){FXB=null;fxbb.hidden=true;stage.querySelectorAll('.fxbox.sel').forEach(x=>x.classList.remove('sel'))}});
document.addEventListener('keydown',e=>{if(!FXB||!fxOn())return;if(e.target.closest&&e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();fxPush();FX().boxes=fxBoxes().filter(x=>x.id!==FXB);FXB=null;fxBoxSave()}});
window.addEventListener('scroll',()=>{if(FXB)fxBoxBar()},{passive:true});
document.addEventListener('click',e=>{const b=e.target.closest('[data-fxadd]');if(b)fxBoxAdd(b.dataset.fxadd)});

/* ידיות לגרירת קווי הטבלה */
function fxDecorate(){
  stage.querySelectorAll('.fx-hv,.fx-hh').forEach(x=>x.remove());
  if(!fxOn()){fxUnselect();stage.querySelectorAll('.fx-hov').forEach(x=>x.classList.remove('fx-hov'));return}
  if(FXS&&!FXS.n.isConnected)fxUnselect();
  stage.querySelectorAll('.page .grid[data-rows]').forEach(grid=>{
    const cs=getComputedStyle(grid),C=cs.gridTemplateColumns.split(' ').map(parseFloat),R=cs.gridTemplateRows.split(' ').map(parseFloat);
    if(C.length!==7||C.some(isNaN)||R.some(isNaN))return;
    const rtl=cs.direction==='rtl',rows=+grid.dataset.rows;
    let acc=0;for(let i=0;i<6;i++){acc+=C[i];const h=el('div','fx-h fx-hv no-print');h.title='גררו כדי לשנות את רוחב העמודות';h.style.insetInlineStart=acc+'px';h.dataset.i=i;grid.appendChild(h);fxDragLine(h,grid,'c',i,C,R,rtl,rows)}
    acc=0;for(let j=0;j<rows;j++){acc+=R[j];const h=el('div','fx-h fx-hh no-print');h.title=j?'גררו כדי לשנות את גובה השורות':'גררו כדי לשנות את גובה שורת ימי השבוע';h.style.top=acc+'px';grid.appendChild(h);fxDragLine(h,grid,'r',j,C,R,rtl,rows)}
  });
  stage.querySelectorAll('.page .yz-panel').forEach(p=>p.classList.add('fx-col'));
}
function fxDragLine(h,grid,kind,i,C0,R0,rtl,rows){
  h.addEventListener('pointerdown',e=>{
    e.preventDefault();e.stopPropagation();h.setPointerCapture(e.pointerId);h.classList.add('on');
    const sc=grid.getBoundingClientRect().width/grid.offsetWidth||1,sx=e.clientX,sy=e.clientY;let C=C0.slice(),R=R0.slice();
    const tplC=()=>C.map(v=>'minmax(0,'+v.toFixed(2)+'fr)').join(' ');
    const tplR=()=>R[0].toFixed(2)+'px '+R.slice(1).map(v=>'minmax(0,'+v.toFixed(2)+'fr)').join(' ');
    const mv=ev=>{
      if(kind==='c'){let d=(ev.clientX-sx)/sc;if(rtl)d=-d;const tot=C0[i]+C0[i+1],min=Math.max(12,tot*.12);const a=Math.max(min,Math.min(tot-min,C0[i]+d));C[i]=a;C[i+1]=tot-a;grid.style.gridTemplateColumns=tplC();
        h.style.insetInlineStart=C.slice(0,i+1).reduce((x,y)=>x+y,0)+'px'}
      else{const d=(ev.clientY-sy)/sc;
        if(i===0){R[0]=Math.max(8,R0[0]+d);const rest=R0[0]+R0.slice(1).reduce((x,y)=>x+y,0)-R[0];const k=rest/R0.slice(1).reduce((x,y)=>x+y,0);R=[R[0]].concat(R0.slice(1).map(v=>v*k))}
        else{const tot=R0[i]+R0[i+1],min=Math.max(10,tot*.12);const a=Math.max(min,Math.min(tot-min,R0[i]+d));R[i]=a;R[i+1]=tot-a}
        grid.style.gridTemplateRows=tplR();h.style.top=R.slice(0,i+1).reduce((x,y)=>x+y,0)+'px'}
    };
    const up=()=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);h.classList.remove('on');
      fxPush();const G=FX().grid,avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
      if(kind==='c'){const m=avg(C);G.cols=C.map(v=>+(v/m).toFixed(3))}
      else{const body=R.slice(1),m=avg(body);G.rows[rows]=body.map(v=>+(v/m).toFixed(3));
        if(i===0){const pg=grid.closest('.page');G.head=+(R[0]*pageDims()[0]/pg.offsetWidth).toFixed(2)}}
      save();render()};
    h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
  });
}
function fxSideInit(){
  const box=$('#fxTools');if(!box)return;const L=FX().lines;
  box.querySelector('#fxLw').value=L.w!=null?String(L.w):'';box.querySelector('#fxLs').value=L.st||'';box.querySelector('#fxLc').value=L.c||'#c6ccd2';
}
(function(){
  const box=$('#fxTools');if(!box)return;
  const setL=(k,v)=>{fxPush();const L=FX().lines;if(v===''||v==null)delete L[k];else L[k]=v;save();render()};
  box.addEventListener('change',e=>{const t=e.target;if(t.id==='fxLw')setL('w',t.value===''?null:+t.value);else if(t.id==='fxLs')setL('st',t.value);else if(t.id==='fxLc')setL('c',t.value);else if(t.id==='fxAdv'){state.s.fxOn=t.checked;save();applyMode()}});
  box.addEventListener('click',e=>{const b=e.target.closest('[data-fxs]');if(!b)return;const a=b.dataset.fxs;
    if(a==='undo')return fxUndo();
    if(a==='lc0')return setL('c',null);
    if(a==='grid'){fxPush();const f=FX();f.grid={rows:{}};f.tbl={};save();render();return}
    if(a==='texts'){if(!confirm('לבטל את כל השינויים בטקסטים (הזזה, גודל, צבע ועריכה)?'))return;fxPush();FX().t={};fxUnselect();save();render();return}
    if(a==='all'){if(!confirm('לבטל את כל העיצוב החופשי: טקסטים, קווים וגדלי עמודות ושורות?'))return;fxPush();state.fx={};fxUnselect();save();render();fxSideInit()}
  });
  fxSideInit();
})();

/* ---------- image editor ---------- */
function loadImg(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src})}
function makeBase(img,rot,flip,maxPx){
  const rw=rot%180?img.height:img.width,rh=rot%180?img.width:img.height,k=Math.min(1,maxPx/Math.max(rw,rh));
  const c=document.createElement('canvas');c.width=Math.round(rw*k);c.height=Math.round(rh*k);
  const g=c.getContext('2d');g.translate(c.width/2,c.height/2);g.rotate(rot*Math.PI/180);if(flip)g.scale(-1,1);
  g.drawImage(img,-img.width*k/2,-img.height*k/2,img.width*k,img.height*k);return c;
}
function autoLevels(c){
  const g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data,h=new Array(256).fill(0);let n=0;
  for(let i=0;i<d.length;i+=16){h[Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2])]++;n++}
  let a=0,lo=0,hi=255;for(let i=0;i<256;i++){a+=h[i];if(a>n*.01){lo=i;break}}
  a=0;for(let i=255;i>=0;i--){a+=h[i];if(a>n*.01){hi=i;break}}
  return hi-lo>20?{lo,hi}:null;
}
function adjustCanvas(src,adj){
  const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const g=c.getContext('2d');g.drawImage(src,0,0);
  const A=adj||{};if(!A.b&&!A.c&&!A.s&&!A.w&&!A.v&&!A.auto)return c;
  const im=g.getImageData(0,0,c.width,c.height),d=im.data,W=c.width,H=c.height;
  const cc=(A.c||0)*2.55,cf=(259*(cc+255))/(255*(259-cc)),bb=(A.b||0)*2.55,sf=1+(A.s||0)/100,ww=(A.w||0)*.6,vg=(A.v||0)/100;
  const lo=A.auto?A.auto.lo:0,sc=A.auto?255/(A.auto.hi-A.auto.lo):1;
  for(let y=0;y<H;y++){const dy=(y/H-.5)*2;for(let x=0;x<W;x++){const i=(y*W+x)*4;let r=d[i],gg=d[i+1],b=d[i+2];
    if(A.auto){r=(r-lo)*sc;gg=(gg-lo)*sc;b=(b-lo)*sc}
    r+=bb;gg+=bb;b+=bb;
    r=cf*(r-128)+128;gg=cf*(gg-128)+128;b=cf*(b-128)+128;
    const gr=.299*r+.587*gg+.114*b;r=gr+(r-gr)*sf;gg=gr+(gg-gr)*sf;b=gr+(b-gr)*sf;
    r+=ww;b-=ww;
    if(vg){const dx=(x/W-.5)*2,m=1-vg*Math.min(1,(dx*dx+dy*dy)/2)*1.1;r*=m;gg*=m;b*=m}
    d[i]=r<0?0:r>255?255:r;d[i+1]=gg<0?0:gg>255?255:gg;d[i+2]=b<0?0:b>255?255:b}}
  g.putImageData(im,0,0);return c;
}
const IE_PRESETS=[['ללא',{}],['חי',{c:15,s:35}],['בהיר',{b:18,c:-5}],['חם',{w:28,s:10}],['קר',{w:-28}],['שחור־לבן',{s:-100,c:10}],['וינטג׳',{s:-35,w:35,c:-12,v:35}],['דרמטי',{c:35,s:-15,v:45}],['רך',{c:-18,b:8,s:-10}]];
const ovCache=new Map();
function ovImg(src){if(ovCache.has(src))return ovCache.get(src);const i=new Image();i.src=src;ovCache.set(src,i);return i}
function layerBox(g,L,W,H){
  if(L.type==='text'){
    const fs=L.size*H;g.font=(L.bold?'700 ':'400 ')+fs+'px '+fontCSS(L.font||'Frank Ruhl Libre');
    const lines=String(L.text||' ').split('\n'),w=Math.max(...lines.map(t=>g.measureText(t).width));
    return {w:w+fs*.3,h:lines.length*fs*1.2,lines,fs};
  }
  const im=ovImg(L.src),w=L.w*W,ar=im.naturalWidth?im.naturalHeight/im.naturalWidth:1;
  return L.shape==='circle'?{w,h:w}:{w,h:w*ar};
}
function drawLayers(g,W,H,sel){
  (sel===undefined?[]:[]);
  return (layers,selIdx)=>{
    layers.forEach((L,i)=>{
      const bx=layerBox(g,L,W,H);g.save();g.globalAlpha=L.op!=null?+L.op:1;g.translate(L.x*W,L.y*H);g.rotate((L.rot||0)*Math.PI/180);
      if(L.type==='text'){
        g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
        const n=bx.lines.length;
        bx.lines.forEach((t,k)=>{const yy=(k-(n-1)/2)*bx.fs*1.2;
          if(L.shadow){g.shadowColor='rgba(0,0,0,.65)';g.shadowBlur=bx.fs*.18;g.shadowOffsetY=bx.fs*.05}
          if(L.stroke){g.lineWidth=bx.fs*.12;g.strokeStyle=L.strokeColor||'#000';g.strokeText(t,0,yy);g.shadowColor='transparent'}
          g.fillStyle=L.color||'#fff';g.fillText(t,0,yy);g.shadowColor='transparent'});
      }else{
        const im=ovImg(L.src);if(im.complete&&im.naturalWidth&&L.shape==='free'){g.save();if(L.fx)g.scale(-1,1);g.drawImage(im,-bx.w/2,-bx.h/2,bx.w,bx.h);g.restore()}
        else if(im.complete&&im.naturalWidth){
          const w=bx.w,h=bx.h;g.beginPath();
          if(L.shape==='circle')g.arc(0,0,w/2,0,Math.PI*2);else if(L.shape==='round'&&g.roundRect)g.roundRect(-w/2,-h/2,w,h,Math.min(w,h)*.12);else g.rect(-w/2,-h/2,w,h);
          if(L.shadow){g.save();g.shadowColor='rgba(0,0,0,.45)';g.shadowBlur=w*.06;g.shadowOffsetY=w*.02;g.fillStyle='#fff';g.fill();g.restore()}
          g.save();g.clip();
          if(L.shape==='circle'){const s=Math.min(im.naturalWidth,im.naturalHeight);g.drawImage(im,(im.naturalWidth-s)/2,(im.naturalHeight-s)/2,s,s,-w/2,-w/2,w,w)}
          else g.drawImage(im,-w/2,-h/2,w,h);
          g.restore();
          if(L.border){g.lineWidth=Math.max(2,W*.012);g.strokeStyle=L.borderColor||'#fff';g.stroke()}
        }
      }
      if(i===selIdx){g.setLineDash([8,6]);g.lineWidth=2;g.strokeStyle='#2a6169';g.strokeRect(-bx.w/2-6,-bx.h/2-6,bx.w+12,bx.h+12);g.setLineDash([])}
      g.restore();
    });
  };
}
async function openImageEditor(data,onSave){
  if(!canF('imageEditor')){openUpgrade('imageEditor');return}
  const ed=data.edit?JSON.parse(JSON.stringify(data.edit)):{orig:data.img,adj:{},rot:0,flip:false,layers:[]};
  const src=await loadImg(ed.orig);if(!src)return;
  ed.layers.forEach(L=>{if(L.type==='text')loadFont(L.font);if(L.src)ovImg(L.src)});
  const m=modal('<h3>עריכת תמונה<small>שיפור צבעים, טקסט על התמונה ותמונה על תמונה. גררו טקסט או תמונה כדי להזיז אותם.</small></h3>'+
    '<div class="ie"><div class="ie-stage"><canvas id="ieC"></canvas></div><div class="ie-side">'+
    '<div class="seg" role="tablist"><label><input type="radio" name="ieTab" value="fix" checked> שיפור</label><label><input type="radio" name="ieTab" value="text"> טקסט</label><label><input type="radio" name="ieTab" value="img"> תמונה על תמונה</label><label><input type="radio" name="ieTab" value="stk"> מדבקות וכובעים</label></div>'+
    '<div id="iePanel" class="ie-panel"></div></div></div>'+
    '<div class="row"><button class="btn primary" type="button" id="ieSave">שמירה</button><button class="btn" type="button" data-close>ביטול</button></div>');
  m.querySelector('.modal').classList.add('wide','ie-modal');
  const q=x=>m.querySelector(x),cv=q('#ieC'),g=cv.getContext('2d');
  let tab='fix',sel=-1,basePrev,adjPrev,faces=null,faceI=0;
  /* זיהוי פנים בתמונה הראשית (פעם אחת לכל סיבוב/היפוך) */
  async function getFaces(msgEl){if(faces)return faces;if(!window.MyLuachSmart)throw new Error('no-smart');if(msgEl)msgEl.textContent='מזהה פנים בתמונה…';faces=await MyLuachSmart.detectFaces(basePrev);return faces}
  async function fitToFace(L,msgEl,next){
    const st=(window.MYLUACH_STICKERS||[]).find(x=>x.id===L.stk)||{fw:1,ay:.9,line:'top'};
    try{const fs=await getFaces(msgEl);if(!fs.length){if(msgEl)msgEl.textContent='לא מצאנו פנים בתמונה. אפשר לגרור את המדבקה למקום ביד.';return false}
      if(next)faceI=(faceI+1)%fs.length;const f=fs[Math.min(faceI,fs.length-1)];
      const im=ovImg(L.src);if(!im.naturalWidth)await new Promise(r=>{im.onload=r;setTimeout(r,800)});
      Object.assign(L,MyLuachSmart.placeOnFace(f,st,cv.width,cv.height,im.naturalWidth?im.naturalHeight/im.naturalWidth:1));redraw();
      if(msgEl)msgEl.textContent=fs.length>1?'נמצאו '+fs.length+' פנים. "לפנים הבאות" מעביר את המדבקה.':'✓ הותאם לפנים. אפשר לגרור ולשנות גודל.';return true}
    catch(e){if(msgEl)msgEl.textContent='הזיהוי האוטומטי לא זמין כרגע (צריך חיבור לאינטרנט). אפשר לגרור את המדבקה למקום ביד.';return false}}
  function rebuild(){faces=null;faceI=0;basePrev=makeBase(src,ed.rot,ed.flip,900);adjPrev=adjustCanvas(basePrev,ed.adj);cv.width=basePrev.width;cv.height=basePrev.height;redraw()}
  function redraw(){g.clearRect(0,0,cv.width,cv.height);g.drawImage(adjPrev,0,0);drawLayers(g,cv.width,cv.height,true)(ed.layers,sel)}
  let adjT;function readjust(){clearTimeout(adjT);adjT=setTimeout(()=>{adjPrev=adjustCanvas(basePrev,ed.adj);redraw()},40)}
  const slider=(id,label,min,max,val)=>'<label class="fld">'+label+' <span id="'+id+'V">'+val+'</span><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" value="'+val+'"></label>';
  function panel(){
    const P=q('#iePanel'),L=ed.layers[sel];
    if(tab==='fix'){
      const A=ed.adj;
      P.innerHTML='<div class="row"><button class="btn small" type="button" id="ieAuto">'+(A.auto?'ביטול שיפור אוטומטי':'שיפור אוטומטי')+'</button><button class="btn small" type="button" id="ieRot">סיבוב 90°</button><button class="btn small" type="button" id="ieFlip">היפוך</button></div>'+
        '<div class="fld">מראה מוכן<div class="chips">'+IE_PRESETS.map((p,i)=>'<button type="button" class="chip" data-pr="'+i+'">'+p[0]+'</button>').join('')+'</div></div>'+
        slider('ieB','בהירות',-50,50,A.b||0)+slider('ieC2','ניגודיות',-50,50,A.c||0)+slider('ieS','צבעוניות',-100,100,A.s||0)+slider('ieW','חום / קור',-50,50,A.w||0)+slider('ieV','הכהיית שוליים',0,80,A.v||0)+
        '<button class="btn small" type="button" id="ieReset">איפוס השיפורים</button>';
      [['ieB','b'],['ieC2','c'],['ieS','s'],['ieW','w'],['ieV','v']].forEach(([id,k])=>q('#'+id).addEventListener('input',e=>{ed.adj[k]=+e.target.value;q('#'+id+'V').textContent=e.target.value;readjust()}));
      q('#ieAuto').onclick=()=>{ed.adj.auto=ed.adj.auto?null:autoLevels(basePrev);if(!ed.adj.auto&&!A.auto){}rebuildAdj();panel()};
      q('#ieRot').onclick=()=>{ed.rot=(ed.rot+90)%360;rebuild()};
      q('#ieFlip').onclick=()=>{ed.flip=!ed.flip;rebuild()};
      q('#ieReset').onclick=()=>{ed.adj={};rebuildAdj();panel()};
      P.querySelectorAll('[data-pr]').forEach(b=>b.onclick=()=>{ed.adj={...IE_PRESETS[+b.dataset.pr][1],auto:ed.adj.auto||null};rebuildAdj();panel()});
    }else if(tab==='text'){
      let h='<button class="btn small" type="button" id="ieAddT">+ הוספת טקסט</button>';
      if(L&&L.type==='text'){
        h+='<label class="fld">הטקסט<textarea id="ieTxt" rows="2" style="direction:rtl;font:inherit;min-height:0">'+esc(L.text)+'</textarea></label>'+
          '<label class="fld">גופן<select id="ieFont">'+fontOptions('פרנק ריהל')+'</select></label>'+
          slider('ieSz','גודל',2,30,Math.round(L.size*100))+slider('ieRotL','סיבוב',-45,45,L.rot||0)+
          '<div class="row"><label class="fld" style="flex:0 0 auto">צבע<input type="color" id="ieCol" value="'+(L.color||'#ffffff')+'"></label>'+
          '<label class="chk"><input type="checkbox" id="ieBold"'+(L.bold?' checked':'')+'> מודגש</label><label class="chk"><input type="checkbox" id="ieSh"'+(L.shadow?' checked':'')+'> צל</label><label class="chk"><input type="checkbox" id="ieSt"'+(L.stroke?' checked':'')+'> מסגרת לאותיות</label></div>'+
          '<button class="btn small danger" type="button" id="ieDel">מחיקת הטקסט</button>';
      }else h+='<p class="hint">הוסיפו טקסט, או לחצו על טקסט קיים בתמונה כדי לערוך אותו.</p>';
      P.innerHTML=h;
      q('#ieAddT').onclick=()=>{ed.layers.push({type:'text',text:'מזל טוב',x:.5,y:.82,size:.09,color:'#ffffff',font:'Suez One',bold:false,shadow:true,stroke:false,rot:0});loadFont('Suez One');sel=ed.layers.length-1;fontsReady();panel();redraw()};
      if(L&&L.type==='text'){
        q('#ieFont').value=L.font||'';
        q('#ieTxt').addEventListener('input',e=>{L.text=e.target.value;redraw()});
        q('#ieFont').addEventListener('change',e=>{L.font=e.target.value||'Frank Ruhl Libre';loadFont(L.font);fontsReady()});
        q('#ieSz').addEventListener('input',e=>{L.size=e.target.value/100;q('#ieSzV').textContent=e.target.value;redraw()});
        q('#ieRotL').addEventListener('input',e=>{L.rot=+e.target.value;q('#ieRotLV').textContent=e.target.value;redraw()});
        q('#ieCol').addEventListener('input',e=>{L.color=e.target.value;L.strokeColor=lum(e.target.value)>.5?'#000':'#fff';redraw()});
        q('#ieBold').onchange=e=>{L.bold=e.target.checked;redraw()};q('#ieSh').onchange=e=>{L.shadow=e.target.checked;redraw()};q('#ieSt').onchange=e=>{L.stroke=e.target.checked;redraw()};
        q('#ieDel').onclick=()=>{ed.layers.splice(sel,1);sel=-1;panel();redraw()};
      }
    }else if(tab==='stk'){
      const SL=window.MYLUACH_STICKERS||[],G={head:'על הראש',face:'על הפנים',neck:'בצוואר',deco:'קישוטים'};
      let h='<p class="hint" style="margin:0">לוחצים על מדבקה, והיא מתאימה את עצמה לראש בתמונה. אחר כך אפשר לגרור, להגדיל ולסובב.</p>'+
        Object.entries(G).map(([g,t])=>'<div class="fld">'+t+'<div class="ie-stk">'+SL.filter(x=>x.g===g).map(x=>'<button type="button" class="ie-stk-b" data-stk="'+x.id+'" title="'+esc(x.n)+'"><img alt="" src="'+x.src+'"><span>'+esc(x.n)+'</span></button>').join('')+'</div></div>').join('')+
        '<p class="hint" id="ieStkMsg" aria-live="polite"></p>';
      if(L&&L.stk){h+='<div class="ie-sel"><b>המדבקה שנבחרה</b>'+slider('ieW2','גודל',4,150,Math.round(L.w*100))+slider('ieRotI','סיבוב',-60,60,L.rot||0)+
        '<div class="row"><button class="btn small" type="button" id="ieFit">🎯 התאמה לראש</button><button class="btn small" type="button" id="ieNextF">לפנים הבאות</button><button class="btn small" type="button" id="ieFx">היפוך</button><button class="btn small" type="button" id="ieFront">לקדמה</button><button class="btn small danger" type="button" id="ieDelI">מחיקה</button></div></div>'}
      P.innerHTML=h;const msg=q('#ieStkMsg');
      P.querySelectorAll('[data-stk]').forEach(b=>b.onclick=async()=>{const st=SL.find(x=>x.id===b.dataset.stk);await loadImg(st.src);ovImg(st.src);
        const NL={type:'img',stk:st.id,src:st.src,shape:'free',x:.5,y:st.g==='deco'?.2:.3,w:st.g==='deco'?.28:.35,rot:0};ed.layers.push(NL);sel=ed.layers.length-1;panel();redraw();
        if(st.g!=='deco')await fitToFace(NL,q('#ieStkMsg'));});
      if(L&&L.stk){
        q('#ieW2').addEventListener('input',e=>{L.w=e.target.value/100;q('#ieW2V').textContent=e.target.value;redraw()});
        q('#ieRotI').addEventListener('input',e=>{L.rot=+e.target.value;q('#ieRotIV').textContent=e.target.value;redraw()});
        q('#ieFit').onclick=()=>fitToFace(L,msg).then(()=>{q('#ieW2').value=Math.round(L.w*100);q('#ieW2V').textContent=Math.round(L.w*100);q('#ieRotI').value=L.rot;q('#ieRotIV').textContent=L.rot});
        q('#ieNextF').onclick=()=>fitToFace(L,msg,true);
        q('#ieFx').onclick=()=>{L.fx=!L.fx;redraw()};
        q('#ieFront').onclick=()=>{ed.layers.push(ed.layers.splice(sel,1)[0]);sel=ed.layers.length-1;redraw()};
        q('#ieDelI').onclick=()=>{ed.layers.splice(sel,1);sel=-1;panel();redraw()};
      }
    }else{
      let h='<button class="btn small" type="button" id="ieAddI">+ הוספת תמונה</button>';
      if(L&&L.type==='img'){
        h+=slider('ieW2','גודל',8,100,Math.round(L.w*100))+slider('ieRotI','סיבוב',-45,45,L.rot||0)+
          '<label class="fld">צורה<select id="ieShape"><option value="rect">מלבן</option><option value="round">פינות מעוגלות</option><option value="circle">עיגול</option><option value="free">בלי מסגרת (חתוך)</option></select></label>'+
          '<div class="row"><label class="chk"><input type="checkbox" id="ieBor"'+(L.border?' checked':'')+'> מסגרת</label><label class="fld" style="flex:0 0 auto">צבע מסגרת<input type="color" id="ieBorC" value="'+(L.borderColor||'#ffffff')+'"></label><label class="chk"><input type="checkbox" id="ieShI"'+(L.shadow?' checked':'')+'> צל</label></div>'+
          '<div class="fld">חיתוך חכם<div class="row"><button class="btn small" type="button" id="ieCutBg">✂ הסרת רקע אחיד</button><button class="btn small" type="button" id="ieCutP">✂ חיתוך אדם מהרקע</button><button class="btn small" type="button" id="ieCutF">⭕ עיגול סביב הפנים</button>'+(L.orig?'<button class="btn small" type="button" id="ieCutU">ביטול החיתוך</button>':'')+'</div><span class="hint" id="ieCutMsg" aria-live="polite">למשל: תמונה של כובע על רקע לבן ← "הסרת רקע אחיד", ואז "התאמה לראש".</span></div>'+
          '<div class="row"><button class="btn small" type="button" id="ieFitI">🎯 התאמה לראש</button><button class="btn small" type="button" id="ieFront">הבאה לקדמה</button><button class="btn small danger" type="button" id="ieDelI">מחיקת התמונה</button></div>';
      }else h+='<p class="hint">הוסיפו תמונה קטנה מעל התמונה הראשית, למשל תמונת פספורט בעיגול, לוגו או מדבקה. לחצו על תמונה קיימת כדי לערוך אותה.</p>';
      P.innerHTML=h;
      q('#ieAddI').onclick=()=>{const fn=async v=>{if(!v.img)return;ovImg(v.img);await loadImg(v.img);ed.layers.push({type:'img',src:v.img,x:.75,y:.3,w:.3,shape:'round',border:true,borderColor:'#ffffff',shadow:true,rot:0});sel=ed.layers.length-1;panel();redraw()};fn.maxPx=1000;pickImage(fn)};
      if(L&&L.type==='img'){
        q('#ieShape').value=L.shape||'rect';
        q('#ieW2').addEventListener('input',e=>{L.w=e.target.value/100;q('#ieW2V').textContent=e.target.value;redraw()});
        q('#ieRotI').addEventListener('input',e=>{L.rot=+e.target.value;q('#ieRotIV').textContent=e.target.value;redraw()});
        q('#ieShape').onchange=e=>{L.shape=e.target.value;redraw()};
        q('#ieBor').onchange=e=>{L.border=e.target.checked;redraw()};q('#ieBorC').addEventListener('input',e=>{L.borderColor=e.target.value;redraw()});
        q('#ieShI').onchange=e=>{L.shadow=e.target.checked;redraw()};
        q('#ieFront').onclick=()=>{ed.layers.push(ed.layers.splice(sel,1)[0]);sel=ed.layers.length-1;redraw()};
        q('#ieDelI').onclick=()=>{ed.layers.splice(sel,1);sel=-1;panel();redraw()};
        const cm=q('#ieCutMsg'),busy=t=>{cm.textContent=t;P.querySelectorAll('button').forEach(b=>b.disabled=true)},done=async(nsrc,shape)=>{if(!L.orig)L.orig=L.src;L.src=nsrc;await loadImg(nsrc);ovImg(nsrc);if(shape)L.shape=shape;panel();redraw()};
        q('#ieCutBg').onclick=async()=>{busy('מסיר את הרקע…');try{const r=await MyLuachSmart.removeUniformBg(L.orig||L.src);await done(r.src,'free');q('#ieCutMsg').textContent=r.removed<.05?'כמעט לא נמצא רקע אחיד להסרה. מתאים לתמונה על רקע לבן או בצבע אחד.':'✓ הרקע הוסר.'}catch(e){panel();q('#ieCutMsg').textContent='לא הצלחנו להסיר את הרקע.'}};
        q('#ieCutP').onclick=async()=>{busy('מזהה את האדם בתמונה… (בפעם הראשונה זה לוקח כמה שניות)');try{await done(await MyLuachSmart.cutPerson(L.orig||L.src),'free');q('#ieCutMsg').textContent='✓ האדם נחתך מהרקע.'}catch(e){panel();q('#ieCutMsg').textContent='החיתוך החכם לא זמין כרגע (צריך חיבור לאינטרנט). נסו "הסרת רקע אחיד".'}};
        q('#ieCutF').onclick=async()=>{busy('מחפש פנים…');try{await done(await MyLuachSmart.faceCrop(L.orig||L.src),'circle');L.border=true;redraw();q('#ieCutMsg').textContent='✓ נחתך עיגול סביב הפנים.'}catch(e){panel();q('#ieCutMsg').textContent=e.message==='no-face'?'לא מצאנו פנים בתמונה הזו.':'הזיהוי לא זמין כרגע (צריך חיבור לאינטרנט).'}};
        if(q('#ieCutU'))q('#ieCutU').onclick=async()=>{L.src=L.orig;delete L.orig;L.shape='round';await loadImg(L.src);panel();redraw()};
        q('#ieFitI').onclick=()=>fitToFace(L,cm);
      }
    }
  }
  /* שכבות: שקיפות וסדר (מי מעל מי) לכל טקסט, תמונה או מדבקה שנבחרו */
  const panel0=panel;panel=function(){panel0();const P=q('#iePanel'),L=ed.layers[sel];if(!P||!L)return;const n=ed.layers.length;
    P.insertAdjacentHTML('beforeend','<div class="ie-layer"><b>השכבה שנבחרה</b> <span class="hint">('+(sel+1)+' מתוך '+n+', 1 = הכי מאחור)</span>'+slider('ieOp','שקיפות',10,100,Math.round((L.op!=null?L.op:1)*100))+
      '<div class="row"><button class="btn small" type="button" data-lo="top"'+(sel===n-1?' disabled':'')+'>⤒ לחזית</button><button class="btn small" type="button" data-lo="up"'+(sel===n-1?' disabled':'')+'>↑ קדימה</button><button class="btn small" type="button" data-lo="down"'+(sel===0?' disabled':'')+'>↓ אחורה</button><button class="btn small" type="button" data-lo="bottom"'+(sel===0?' disabled':'')+'>⤓ לאחור</button></div></div>');
    q('#ieOp').addEventListener('input',e=>{L.op=+e.target.value/100;q('#ieOpV').textContent=e.target.value;redraw()});
    P.querySelectorAll('[data-lo]').forEach(b=>b.onclick=()=>{const a=b.dataset.lo,it=ed.layers.splice(sel,1)[0];
      sel=a==='top'?n-1:a==='bottom'?0:a==='up'?Math.min(n-1,sel+1):Math.max(0,sel-1);ed.layers.splice(sel,0,it);panel();redraw()})};
  function rebuildAdj(){adjPrev=adjustCanvas(basePrev,ed.adj);redraw()}
  function fontsReady(){redraw();if(document.fonts)setTimeout(()=>document.fonts.ready.then(redraw),60)}
  function lum(hex){const n=parseInt(hex.slice(1),16);return(.299*(n>>16&255)+.587*(n>>8&255)+.114*(n&255))/255}
  m.addEventListener('change',e=>{if(e.target.name==='ieTab'){tab=e.target.value;panel()}});
  function hit(x,y){
    for(let i=ed.layers.length-1;i>=0;i--){const L=ed.layers[i],b=layerBox(g,L,cv.width,cv.height);
      const a=-(L.rot||0)*Math.PI/180,dx=x-L.x*cv.width,dy=y-L.y*cv.height,rx=dx*Math.cos(a)-dy*Math.sin(a),ry=dx*Math.sin(a)+dy*Math.cos(a);
      if(Math.abs(rx)<=b.w/2+6&&Math.abs(ry)<=b.h/2+6)return i}
    return -1;
  }
  cv.addEventListener('pointerdown',e=>{
    const r=cv.getBoundingClientRect(),k=cv.width/r.width,x=(e.clientX-r.left)*k,y=(e.clientY-r.top)*k;
    const i=hit(x,y);sel=i;
    if(i>=0){const L=ed.layers[i];const want=L.type==='text'?'text':L.stk?'stk':'img';if(tab!==want){tab=want;m.querySelectorAll('input[name=ieTab]').forEach(t=>t.checked=t.value===tab)}
      cv.setPointerCapture(e.pointerId);const ox=x-L.x*cv.width,oy=y-L.y*cv.height;
      const mv=ev=>{const xx=(ev.clientX-r.left)*k,yy=(ev.clientY-r.top)*k;L.x=Math.max(0,Math.min(1,(xx-ox)/cv.width));L.y=Math.max(0,Math.min(1,(yy-oy)/cv.height));redraw()};
      const up=()=>{cv.removeEventListener('pointermove',mv);cv.removeEventListener('pointerup',up)};
      cv.addEventListener('pointermove',mv);cv.addEventListener('pointerup',up);
    }
    panel();redraw();
  });
  q('#ieSave').onclick=async()=>{
    const b=q('#ieSave');b.textContent='שומר…';b.disabled=true;
    if(document.fonts)await document.fonts.ready;
    await new Promise(r=>setTimeout(r,30));
    const full=makeBase(src,ed.rot,ed.flip,QPX('page')),out=adjustCanvas(full,ed.adj),og=out.getContext('2d');
    drawLayers(og,out.width,out.height,false)(ed.layers,-1);
    let url;try{url=out.toDataURL('image/jpeg',JQ)}catch(err){url=null}
    m.remove();if(url)onSave({img:url,edit:ed});
  };
  rebuild();panel();fontsReady();
}

/* ---------- images ---------- */
let pendingSlot=null;
function pickFile(setter){pendingSlot=setter;const f=$('#fileOne');f.value='';f.click()}
/* הוספת תמונה: מהמחשב / מהטלפון, או ממאגר התמונות */
function pickImage(setter){
  const m=modal('<h2>הוספת תמונה</h2><div class="pick2"><button type="button" class="pick-b" id="pkFile"><b>📁 מהמחשב או מהטלפון</b><span>תמונה משלכם</span></button><button type="button" class="pick-b" id="pkLib"><b>🖼 ממאגר התמונות</b><span>טבע, מקומות קדושים, בית המקדש, חגים ושבת</span></button></div><div class="row"><button class="btn" type="button" data-close>ביטול</button></div>');
  m.querySelector('#pkFile').onclick=()=>{m.remove();pickFile(setter)};m.querySelector('#pkLib').onclick=()=>{m.remove();libPick(setter)};
  setTimeout(()=>m.querySelector('#pkFile').focus(),20)}
let LIB_CATS=[['all','הכל'],['nature','טבע ונופים'],['holy','מקומות קדושים'],['mikdash','בית המקדש'],['chagim','חגים ומועדים'],['shabbat','שבת'],['tzadikim','צדיקים וחכמים'],['bg','רקעים ומסגרות']];
let LIB=null;
async function libLoad(){if(LIB)return LIB;let srv={items:[],hideSeed:[]};
  try{const r=await fetch('/api/pricing?c=_lib');if(r.ok)srv=await r.json()}catch(e){}
  (srv.cats||[]).forEach(c=>{if(c&&c.id&&!LIB_CATS.some(x=>x[0]===c.id))LIB_CATS.push([c.id,String(c.name||'')])});
  const hide=new Set(srv.hideSeed||[]);LIB=[...(srv.items||[]),...(window.MYLUACH_LIB_SEED||[]).filter(x=>!hide.has(x.id))];return LIB}
function urlToData(url,max){return new Promise((res,rej)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{try{
  const w=im.naturalWidth||1600,h=im.naturalHeight||1000,k=Math.min(1,max/Math.max(w,h))||1,c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',JQ))}catch(e){rej(e)}};im.onerror=rej;im.src=url})}
async function libPick(setter){
  const m=modal('<h2>מאגר התמונות</h2><p class="hint">תמונות ואיורים צנועים לשימוש חופשי בלוח: לעמוד השער, לחודשים ולימים. לחצו על תמונה כדי לבחור אותה.</p><div class="lib-tabs" role="tablist"></div><div class="lib-grid" aria-live="polite"><p class="hint">טוען…</p></div><div class="row"><button class="btn" type="button" data-close>סגירה</button></div>');
  m.querySelector('.modal').classList.add('modal-wide');
  const L=await libLoad(),tabs=m.querySelector('.lib-tabs'),grid=m.querySelector('.lib-grid');
  const cats=LIB_CATS.filter(([k])=>k==='all'||L.some(x=>x.cat===k));let cur='all';
  const draw=()=>{tabs.innerHTML=cats.map(([k,n])=>'<button type="button" role="tab" data-lc="'+k+'" aria-selected="'+(k===cur)+'">'+n+'</button>').join('');
    const items=L.filter(x=>cur==='all'||x.cat===cur);
    grid.innerHTML=items.length?items.map((x,i)=>'<button type="button" class="lib-i" data-li="'+L.indexOf(x)+'" title="'+esc(x.title||'')+'"><img loading="lazy" alt="'+esc(x.title||'')+'" src="'+esc(x.url)+'"><span>'+esc(x.title||'')+'</span></button>').join(''):'<p class="hint">אין עדיין תמונות בקטגוריה הזו.</p>'};
  draw();
  tabs.onclick=e=>{const b=e.target.closest('[data-lc]');if(b){cur=b.dataset.lc;draw()}};
  grid.onclick=async e=>{const b=e.target.closest('[data-li]');if(!b)return;const x=L[+b.dataset.li];b.classList.add('busy');
    try{const img=await urlToData(x.url,setter.maxPx||QPX('page'));m.remove();setter({img,edit:null,credit:x.credit||''})}
    catch(err){b.classList.remove('busy');alert('לא הצלחנו לטעון את התמונה. נסו שוב או בחרו תמונה אחרת.')}}}
$('#fileOne').addEventListener('change',async e=>{const f=e.target.files[0];if(!f||!pendingSlot)return;const fn=pendingSlot;pendingSlot=null;fn({img:await compress(f,fn.maxPx),edit:null})});
function compress(file,max){max=max||QPX('page');return new Promise(res=>{
  const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{
    const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
    c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    try{res(c.toDataURL('image/jpeg',JQ))}catch(err){res(r.result)}};im.onerror=()=>res(r.result);im.src=r.result};r.readAsDataURL(file)})}
function imageLum(src){return new Promise(res=>{
  const im=new Image();im.onload=()=>{try{
    const c=document.createElement('canvas'),w=40,h=Math.max(6,Math.round(40*im.height/im.width));c.width=w;c.height=h;
    const g=c.getContext('2d');g.drawImage(im,0,0,w,h);const px=g.getImageData(0,0,w,h).data;
    const band=(y0,y1)=>{let s=0,n=0;for(let y=y0;y<y1;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;s+=(0.2126*px[i]+0.7152*px[i+1]+0.0722*px[i+2])/255;n++}return n?s/n:.5};
    res({top:band(0,Math.ceil(h*0.4)),bot:band(Math.floor(h*0.6),h)})}catch(e){res({top:.5,bot:.5})}};
  im.onerror=()=>res({top:.5,bot:.5});im.src=src})}
function slotLabel(k){
  if(k==='cover')return 'עמוד השער';
  const mo=monthsCache.find(m=>m.key===k);if(mo)return mo.title+' '+mo.year;
  if(k.startsWith('w-')){const d=dateFromIso(k.slice(2));return 'שבוע '+gregShort(d)}
  if(k.startsWith('d-')){const d=dateFromIso(k.slice(2));return WEEKDAYS[d.getDay()]+' '+hebShort(new HDate(d))}
  return k;
}
$('#bulkBtn').onclick=openImageOrganizer;
try{if(localStorage.getItem('luchenu-howto')==='0')$('#howto').hidden=true}catch(e){}
$('#howtoClose').onclick=()=>{$('#howto').hidden=true;try{localStorage.setItem('luchenu-howto','0')}catch(e){}};
function openImageOrganizer(){
  const s=state.s;
  const keys=(s.cover?['cover']:[]).concat([...new Set(RS.slots)]);
  const pick=k=>{const o=k==='cover'?state.cover:(state.slots[k]||{});return o&&o.img?{img:o.img,fit:o.fit,pos:o.pos,px:o.px,zoom:o.zoom,edit:o.edit||null}:null};
  let arr=keys.map(pick);
  const m=modal('<h3>סידור תמונות<small>כאן רואים איזו תמונה תופיע בכל עמוד, ואפשר להוסיף תמונות ולשנות את הסדר.</small></h3>'+
    '<div class="hint"><ol><li>לחצו "הוספת תמונות" ובחרו כמה תמונות ביחד. הן ייכנסו לפי הסדר למקומות הריקים.</li><li>כדי לשנות סדר: גררו תמונה על תמונה אחרת והן יתחלפו, או השתמשו בחצים.</li><li>לחצו "שמירה" כדי להחיל על הלוח.</li></ol></div>'+
    (keys.length?'':'<p class="msg-bad">בפריסה הנוכחית אין מקומות לתמונה. בחרו פריסה "תמונה ולוח" או "עמוד לתמונה", או סמנו עמוד שער.</p>')+
    '<div class="row"><button class="btn" type="button" id="oAdd">הוספת תמונות</button>'+(CFG.googleClientId?'<button class="btn gphotos-btn" type="button" id="oGP">מ־Google Photos</button>':'')+(CFG.googleClientId&&CFG.googleApiKey?'<button class="btn" type="button" id="oGD">מגוגל דרייב</button>':'')+'<button class="btn small danger" type="button" id="oClear">ריקון הכל</button></div>'+
    '<p class="hint" id="oMsg" aria-live="polite"></p><div class="org" id="oGrid"></div>'+
    '<div class="row"><button class="btn primary" type="button" id="oSave">שמירה</button><button class="btn" type="button" data-close>ביטול</button></div>');
  m.querySelector('.modal').classList.add('wide');
  const q=x=>m.querySelector(x),grid=q('#oGrid');
  let dragFrom=null;
  function draw(){
    grid.innerHTML=keys.map((k,i)=>'<div class="tile" draggable="'+(arr[i]?'true':'false')+'" data-i="'+i+'">'+
      '<div class="tile-n">'+(i+1)+'. '+esc(slotLabel(k))+'</div>'+
      (arr[i]?'<img src="'+arr[i].img+'" alt="">':'<div class="tile-empty">ריק<br><span>גררו לכאן קובץ</span></div>')+
      '<div class="tile-ctl"><button type="button" class="x" data-mv="-1" data-i="'+i+'" aria-label="להזיז קודם"'+(i===0?' disabled':'')+'>→</button>'+
      (arr[i]?'<button type="button" class="x" data-rm="'+i+'" aria-label="הסרה">×</button>':'')+
      '<button type="button" class="x" data-mv="1" data-i="'+i+'" aria-label="להזיז אחרי"'+(i===keys.length-1?' disabled':'')+'>←</button></div></div>').join('');
  }
  const swap=(a,b)=>{if(b<0||b>=arr.length)return;[arr[a],arr[b]]=[arr[b],arr[a]];draw()};
  grid.addEventListener('click',e=>{const t=e.target;if(t.dataset.mv)swap(+t.dataset.i,+t.dataset.i+ +t.dataset.mv);if(t.dataset.rm){arr[+t.dataset.rm]=null;draw()}});
  grid.addEventListener('dragstart',e=>{const t=e.target.closest('.tile');if(t){dragFrom=+t.dataset.i;e.dataTransfer.effectAllowed='move'}});
  grid.addEventListener('dragover',e=>{const t=e.target.closest('.tile');if(t){e.preventDefault();grid.querySelectorAll('.tile.over').forEach(x=>x.classList.remove('over'));t.classList.add('over')}});
  grid.addEventListener('drop',async e=>{const t=e.target.closest('.tile');if(!t)return;e.preventDefault();t.classList.remove('over');const to=+t.dataset.i;
    const f=e.dataTransfer.files&&e.dataTransfer.files[0];
    if(f&&f.type.startsWith('image/')){arr[to]={img:await compress(f)};draw()}
    else if(dragFrom!=null){swap(dragFrom,to)}dragFrom=null});
  grid.addEventListener('dragend',()=>{dragFrom=null;grid.querySelectorAll('.tile.over').forEach(x=>x.classList.remove('over'))});
  q('#oAdd').onclick=()=>{const f=$('#fileMany');f.value='';f.onchange=async()=>{
    const files=[...f.files].filter(x=>x.type.startsWith('image/')).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
    q('#oMsg').textContent='מכין '+files.length+' תמונות…';let i=0;
    for(let j=0;j<arr.length&&i<files.length;j++){if(!arr[j]){arr[j]={img:await compress(files[i++])};draw()}}
    const left=files.length-i;
    q('#oMsg').innerHTML=left>0?'<span class="msg-bad">'+left+' תמונות לא נכנסו כי אין עוד מקומות ריקים. אפשר להסיר תמונה ולהוסיף שוב.</span>':'<span class="msg-ok">נוספו '+i+' תמונות. אפשר לשנות את הסדר ואז לשמור.</span>';
  };f.click()};
  if(q('#oGP'))q('#oGP').onclick=async()=>{const b=q('#oGP');b.disabled=true;const say=t=>{q('#oMsg').textContent=t};
    try{const blobs=await pickGooglePhotos(say);let i=0;for(let j=0;j<arr.length&&i<blobs.length;j++){if(!arr[j]){arr[j]={img:await compress(blobs[i++])};draw()}}
      const left=blobs.length-i;q('#oMsg').innerHTML=!blobs.length?'<span class="msg-bad">לא נבחרו תמונות.</span>':left>0?'<span class="msg-bad">'+left+' תמונות לא נכנסו כי אין עוד מקומות ריקים.</span>':'<span class="msg-ok">נוספו '+i+' תמונות מ־Google Photos. אפשר לשנות את הסדר ואז לשמור.</span>'}
    catch(e){q('#oMsg').innerHTML='<span class="msg-bad">לא הצלחנו להביא תמונות מ־Google Photos'+(/popup|closed/i.test(e.message)?' (החלון נסגר או נחסם)':'')+'. אפשר לנסות שוב, או להוריד את התמונות למחשב ולהשתמש ב"הוספת תמונות".</span>'}
    b.disabled=false};
  if(q('#oGD'))q('#oGD').onclick=async()=>{const b=q('#oGD');b.disabled=true;const say=t=>{q('#oMsg').textContent=t};
    try{const blobs=await pickDrivePhotos(say);let i=0;for(let j=0;j<arr.length&&i<blobs.length;j++){if(!arr[j]){arr[j]={img:await compress(blobs[i++])};draw()}}
      const left=blobs.length-i;q('#oMsg').innerHTML=!blobs.length?'':left>0?'<span class="msg-bad">'+left+' תמונות לא נכנסו כי אין עוד מקומות ריקים.</span>':'<span class="msg-ok">נוספו '+i+' תמונות מגוגל דרייב. אפשר לשנות את הסדר ואז לשמור.</span>'}
    catch(e){q('#oMsg').innerHTML='<span class="msg-bad">לא הצלחנו להביא תמונות מגוגל דרייב. אפשר לנסות שוב, או להוריד את התמונות למחשב ולהשתמש ב"הוספת תמונות".</span>'}
    b.disabled=false};
  q('#oClear').onclick=()=>{arr=arr.map(()=>null);draw()};
  q('#oSave').onclick=()=>{
    keys.forEach((k,i)=>{const v=arr[i]||{img:null};const o={img:v.img,fit:v.fit,pos:v.pos,px:v.px,zoom:v.zoom,edit:v.edit||null};
      if(k==='cover')state.cover={...state.cover,...o};
      else state.slots[k]={...(state.slots[k]||{}),...o};});
    save();m.remove();render();
  };
  draw();
}

/* ---------- day clicks & drops ---------- */
stage.addEventListener('click',e=>{
  const c=e.target.closest('[data-date]');if(!c||e.target.closest('[contenteditable]'))return;
  if(PAINT){hlToggle(c.dataset.date);return}
  if(SIMPLE)quickEvent({date:c.dataset.date});else openEventEditor({date:c.dataset.date});
});
stage.addEventListener('keydown',e=>{if(e.target.isContentEditable)return;const c=e.target.closest&&e.target.closest('[data-date]');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(SIMPLE)quickEvent({date:c.dataset.date});else openEventEditor({date:c.dataset.date})}});
stage.addEventListener('dragover',e=>{const c=e.target.closest('[data-date]');if(c){e.preventDefault();stage.querySelectorAll('[data-date].over').forEach(x=>x.classList.remove('over'));c.classList.add('over')}});
stage.addEventListener('dragleave',e=>{const c=e.target.closest('[data-date]');if(c)c.classList.remove('over')});
stage.addEventListener('drop',async e=>{
  const c=e.target.closest('[data-date]');if(!c)return;e.preventDefault();c.classList.remove('over');document.body.classList.remove('tray-dragging');
  const tid=trayDropId(e);if(tid){trayToDay(c.dataset.date,tid);return}
  const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(!f||!f.type.startsWith('image/'))return;
  openEventEditor({date:c.dataset.date,img:await compress(f,QPX('day')),kind:'other'});
});

/* ---------- event editor ---------- */
function parseHebYear(v){v=String(v||'').trim();if(!v)return '';if(/^\d+$/.test(v))return +v;
  const L={'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
  let n=0;for(const ch of v)n+=L[ch]||0;return n?5000+n:''}
function dateFromIso(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)}
function modal(html){const b=el('div','modal-back');b.innerHTML='<div class="modal" role="dialog" aria-modal="true">'+html+'</div>';
  b.addEventListener('click',e=>{if(e.target===b||e.target.closest('[data-close]'))b.remove()});
  b.addEventListener('keydown',e=>{if(e.key==='Escape')b.remove()});
  document.body.appendChild(b);return b}

function openEventEditor({date,id,img,kind}){
  const editing=id?state.events.find(e=>e.id===id):null;
  const base=date?dateFromIso(date):(editing&&editing.rec==='once'?dateFromIso(editing.date):new Date());
  const hd=new HDate(base);
  const ev=editing?{...editing}:{kind:kind||'birthday',name:'',rec:KINDS[kind||'birthday'].rec,img:img||null,year:''};
  if(!editing){ev.hday=hd.getDate();ev.hmonth=hd.getMonth();ev.gday=base.getDate();ev.gmonth=base.getMonth()+1;ev.date=iso(base);if(img){ev.kind='other';ev.rec='once'}}
  else{ev.hday=ev.rec==='heb'?ev.day:hd.getDate();ev.hmonth=ev.rec==='heb'?ev.month:hd.getMonth();ev.gday=ev.rec==='greg'?ev.day:base.getDate();ev.gmonth=ev.rec==='greg'?ev.month:base.getMonth()+1;ev.date=ev.date||iso(base);
    if(ev.rec==='heb'&&ev.year)ev.yearText=ev.year;}
  const title=date?gem(hd.getDate())+' '+hebMonthName(hd.getMonth(),isLeap(hd.getFullYear()))+' '+hebYearStr(hd.getFullYear())+' · '+base.getDate()+(EN?' ':' ב')+GREG_MONTHS[base.getMonth()]+' '+base.getFullYear():'';
  const existing=date&&!editing?eventsOn(base,hd):[];

  const m=modal(
    '<h3>'+(editing?'עריכת אירוע':'הוספה ללוח')+(title?'<small>'+esc(title)+'</small>':'')+'</h3>'+
    (existing.length?'<div class="listbox">'+existing.map(e=>'<div class="ev-item">'+(e.img?'<img src="'+e.img+'" alt="">':'')+'<button type="button" class="t" data-edit="'+e.id+'">'+esc(eventLabel(e,base,hd))+'<small>לחצו לעריכה</small></button></div>').join('')+'</div>':'')+
    '<div class="kinds" role="radiogroup" aria-label="סוג">'+Object.entries(KINDS).map(([k,v])=>'<label><input type="radio" name="mKind" value="'+k+'"'+(ev.kind===k?' checked':'')+'> '+v.label+'</label>').join('')+'</div>'+
    '<label class="fld"><span id="mAsk"></span><input id="mName"></label>'+
    '<label class="fld" id="mBmRow">בר / בת מצווה<select id="mBm"><option value="">לא לסמן</option><option value="bar">בר מצווה בגיל 13</option><option value="bat">בת מצווה בגיל 12</option></select></label>'+
    '<div class="fld">מתי זה חוזר<div class="seg" role="radiogroup" aria-label="חזרה">'+
      '<label><input type="radio" name="mRec" value="heb"> כל שנה, עברי</label><label><input type="radio" name="mRec" value="greg"> כל שנה, לועזי</label><label><input type="radio" name="mRec" value="once"> רק פעם אחת</label></div></div>'+
    '<div class="row" id="mDates"></div>'+
    '<div class="fld">תמונה ביום (לא חובה)<div class="img-pick"><img id="mImg" alt="" hidden><button type="button" class="btn small" id="mImgBtn"></button><button type="button" class="btn small" id="mImgEdit" hidden>עריכת התמונה</button><button type="button" class="btn small danger" id="mImgDel" hidden>הסרת התמונה</button></div></div>'+
    '<div class="row" id="mImgOpts" hidden><label class="fld">תצוגת התמונה<select id="mFit"><option value="cover">ממלאת את כל התא</option><option value="contain">כל התמונה, בלי חיתוך</option></select></label><label class="fld">איזה חלק לראות<select id="mPos"><option value="50">מרכז</option><option value="15">חלק עליון</option><option value="85">חלק תחתון</option></select></label><label class="fld">צבע הטקסט ביום<select id="mTone"><option value="auto">לפי ההגדרה הכללית</option><option value="light">לבן</option><option value="dark">שחור</option><option value="band">על רקע לבן</option></select></label></div>'+
    '<div class="preview-line" id="mPrev"></div>'+
    '<p class="hint" id="mMsg"></p>'+
    dayImgsBtn(date||(editing&&editing.rec==='once'?editing.date:''))+
    '<div class="row"><button class="btn primary" type="button" id="mSave">שמירה</button>'+(editing?'<button class="btn danger" type="button" id="mDel">מחיקה</button>':'')+'<button class="btn" type="button" data-close>ביטול</button></div>');

  const q=s=>m.querySelector(s);
  q('#mName').value=ev.name||'';
  m.querySelectorAll('input[name=mRec]').forEach(r=>r.checked=r.value===ev.rec);
  function drawDates(){
    const r=ev.rec,box=q('#mDates');
    if(r==='heb')box.innerHTML='<div class="conv fld"><span>יודעים רק את התאריך הלועזי? בוחרים אותו והתאריך העברי יחושב לבד.</span><div class="row"><input type="date" id="mConv"><label class="chk"><input type="checkbox" id="mConvNight"> אחרי השקיעה</label></div></div><label class="fld">יום<select id="mD">'+Array.from({length:30},(_,i)=>opt(i+1,gem(i+1),i+1==ev.hday)).join('')+'</select></label><label class="fld">חודש<select id="mM">'+HEB_ORDER.map(x=>opt(x,hebMonthOpt(x),x==ev.hmonth)).join('')+'</select></label><button class="btn small hp-btn" type="button" data-hpick="mM,mD" title="בחירה מלוח">📅 מלוח</button><label class="fld">שנה (לחישוב גיל)<input id="mY" placeholder="תשע״ח" value="'+esc(ev.yearText?hebYearStr(ev.yearText):'')+'"></label>';
    else if(r==='greg')box.innerHTML='<label class="fld">יום<select id="mD">'+Array.from({length:31},(_,i)=>opt(i+1,i+1,i+1==ev.gday)).join('')+'</select></label><label class="fld">חודש<select id="mM">'+GREG_MONTHS.map((x,i)=>opt(i+1,x,i+1==ev.gmonth)).join('')+'</select></label><label class="fld">שנה (לחישוב גיל)<input id="mY" inputmode="numeric" placeholder="1998" value="'+esc(ev.rec==='greg'&&editing&&editing.rec==='greg'?ev.year||'':'')+'"></label>';
    else box.innerHTML='<label class="fld">תאריך<input type="date" id="mDate" value="'+ev.date+'"></label>';
    box.querySelectorAll('select,input:not(#mConv):not(#mConvNight)').forEach(x=>x.addEventListener('input',readDates));
    const cv=box.querySelector('#mConv');
    if(cv){const conv=()=>{if(!cv.value)return;const g=dateFromIso(cv.value);if(box.querySelector('#mConvNight').checked)g.setDate(g.getDate()+1);
      const h=new HDate(g);ev.hday=h.getDate();ev.hmonth=h.getMonth();ev.yearHeb=h.getFullYear();ev.yearText=h.getFullYear();
      const keep=cv.value,night=box.querySelector('#mConvNight').checked;drawDates();box.querySelector('#mConv').value=keep;box.querySelector('#mConvNight').checked=night;prev()};
      cv.addEventListener('change',conv);box.querySelector('#mConvNight').addEventListener('change',conv)}
  }
  function readDates(){
    if(ev.rec==='heb'){ev.hday=+q('#mD').value;ev.hmonth=+q('#mM').value;ev.yearHeb=parseHebYear(q('#mY').value)}
    else if(ev.rec==='greg'){ev.gday=+q('#mD').value;ev.gmonth=+q('#mM').value;ev.yearGreg=+q('#mY').value||''}
    else ev.date=q('#mDate').value;
    prev();
  }
  function drawKind(){const k=KINDS[ev.kind];q('#mAsk').textContent=k.ask;q('#mName').placeholder=k.ph;q('#mBmRow').hidden=ev.kind!=='birthday'}
  function drawImg(){q('#mImgOpts').hidden=!ev.img;q('#mFit').value=ev.imgFit||'cover';q('#mTone').value=ev.textTone||'auto';q('#mPos').value=String(ev.imgPos??50);q('#mImg').hidden=!ev.img;if(ev.img)q('#mImg').src=ev.img;q('#mImgDel').hidden=!ev.img;q('#mImgEdit').hidden=!ev.img;q('#mImgBtn').textContent=ev.img?'החלפת תמונה':'הוספת תמונה'}
  function prev(){
    const tmp=build();let txt=eventLabel(tmp,base,hd)||'(תמונה בלבד)';
    const when=tmp.rec==='heb'?'בכל שנה ב־'+gem(tmp.day)+' '+hebMonthOpt(tmp.month):tmp.rec==='greg'?'בכל שנה ב־'+tmp.day+(EN?' ':' ב')+GREG_MONTHS[tmp.month-1]:(tmp.date?'רק ב־'+dateFromIso(tmp.date).toLocaleDateString('he-IL'):'');
    q('#mPrev').innerHTML='יופיע ביום כך: <b>'+esc(txt)+'</b><br><span class="hint">'+esc(when)+'</span>';
  }
  function build(){
    const o={id:editing?editing.id:uid(),kind:ev.kind,name:q('#mName').value.trim(),rec:ev.rec,img:ev.img||null,imgFit:q('#mFit').value,imgPos:+q('#mPos').value,textTone:q('#mTone').value,imgLum:ev.img?ev.imgLum||null:null,edit:ev.img?ev.edit||null:null};
    if(ev.kind==='birthday'&&q('#mBm').value)o.bm=q('#mBm').value;
    if(ev.rec==='heb'){o.day=ev.hday;o.month=ev.hmonth;o.year=ev.yearHeb!==undefined?ev.yearHeb:(editing&&editing.rec==='heb'?editing.year:'')}
    else if(ev.rec==='greg'){o.day=ev.gday;o.month=ev.gmonth;o.year=ev.yearGreg!==undefined?ev.yearGreg:(editing&&editing.rec==='greg'?editing.year:'')}
    else o.date=ev.date;
    return o;
  }
  m.addEventListener('change',e=>{
    if(e.target.name==='mKind'){const old=KINDS[ev.kind].rec;ev.kind=e.target.value;drawKind();if(!editing&&!q('#mName').value&&old!==KINDS[ev.kind].rec){ev.rec=KINDS[ev.kind].rec;m.querySelectorAll('input[name=mRec]').forEach(r=>r.checked=r.value===ev.rec);drawDates()}prev()}
    if(e.target.name==='mRec'){ev.rec=e.target.value;drawDates();prev()}
  });
  q('#mName').addEventListener('input',prev);q('#mBm').value=ev.bm||'';q('#mBm').addEventListener('change',prev);
  q('#mFit').addEventListener('change',()=>ev.imgFit=q('#mFit').value);
  q('#mPos').addEventListener('change',()=>ev.imgPos=+q('#mPos').value);
  q('#mTone').addEventListener('change',()=>ev.textTone=q('#mTone').value);
  const imgSet=async v=>{ev.img=v.img;if('edit' in v)ev.edit=v.edit;ev.imgLum=null;drawImg();prev();if(ev.img)ev.imgLum=await imageLum(ev.img)};imgSet.maxPx=QPX('event');
  if(ev.img&&!ev.imgLum)imageLum(ev.img).then(l=>ev.imgLum=l);
  q('#mImgBtn').onclick=()=>pickImage(imgSet);
  q('#mImgDel').onclick=()=>{ev.img=null;ev.edit=null;drawImg();prev()};
  q('#mImgEdit').onclick=()=>openImageEditor({img:ev.img,edit:ev.edit},v=>imgSet(v));
  m.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{m.remove();openEventEditor({id:b.dataset.edit})});
  q('#mSave').onclick=()=>{
    const o=build();
    if(!o.name&&!o.img){q('#mMsg').innerHTML='<span class="msg-bad">כתבו טקסט או הוסיפו תמונה.</span>';q('#mName').focus();return}
    if(o.rec==='once'&&!o.date){q('#mMsg').innerHTML='<span class="msg-bad">בחרו תאריך.</span>';return}
    if(editing)state.events[state.events.indexOf(editing)]=o;else{if(state.events.length>=PLAN().events){m.remove();openUpgrade('events');return}state.events.push(o)}
    save();renderEvents();m.remove();render();fillLums();
  };
  if(editing)q('#mDel').onclick=()=>{state.events=state.events.filter(e=>e!==editing);save();renderEvents();m.remove();render()};
  drawKind();drawDates();drawImg();prev();
  setTimeout(()=>q('#mName').focus(),30);
}

/* ---------- sidebar ---------- */
function renderCitySelect(){
  const f=($('#cityFilter').value||'').trim();
  let h='';
  if(state.s.custom)h+='<optgroup label="מיקום שלי">'+opt('custom',state.s.custom.name||'מיקום מותאם')+'</optgroup>';
  for(const g of Object.keys(CITY_ROWS)){
    const rows=CITIES.filter(c=>c.group===g&&(!f||c.name.includes(f)||g.includes(f)||c.id.includes(f.toLowerCase())));
    if(rows.length)h+='<optgroup label="'+g+'">'+rows.map(c=>opt(c.id,c.name)).join('')+'</optgroup>';
  }
  const sel=$('#city');sel.innerHTML=h||opt('', 'לא נמצאה עיר. נסו מיקום מדויק למטה');
  if([...sel.options].some(o=>o.value===state.s.city))sel.value=state.s.city;
}
function renderLocNow(){const p=place();$('#locNow').innerHTML='מיקום נוכחי: <b>'+esc(p.name)+'</b> · '+(+p.lat).toFixed(4)+', '+(+p.lng).toFixed(4)+' · '+esc(p.tz)}
function fillStatic(){
  const hy=todayH.getFullYear();let h='';for(let y=hy-1;y<=hy+5;y++)h+=opt(y,hebYearStr(y)+' ('+(y-3761)+'–'+(y-3760)+')');$('#hebYear').innerHTML=h;
  $('#gregStart').innerHTML=GREG_MONTHS.map((m,i)=>opt(i+1,m)).join('');
  $('#hebStart').innerHTML=HEB_ORDER.filter(m=>m!==13).map(m=>opt(m,EN?hebMonthOpt(m):m===12?'אדר':HEB_MONTHS[m])).join('');
  $('#size').innerHTML=Object.entries(SIZES).map(([k,v])=>opt(k,v.label)).join('');
  $('#zmanimChecks').innerHTML=ZMANIM.map(z=>'<label class="chk"><input type="checkbox" data-z="'+z[0]+'"> '+z[1]+'</label>').join('');
  $('#swatches').innerHTML=ACCENTS.map(a=>'<button type="button" class="sw" style="background:'+a+'" data-acc="'+a+'" aria-label="צבע '+a+'"></button>').join('')+'<input type="color" id="accentCustom" aria-label="צבע אחר">';
  $('#headFont').innerHTML=fontOptions('לפי הסגנון');$('#bodyFont').innerHTML=fontOptions('אסיסטנט (ברירת מחדל)');
  FONTS.forEach(([,l])=>l.forEach(f=>{}));
  $('#gDay').innerHTML=Array.from({length:30},(_,i)=>opt(i+1,gem(i+1))).join('');
  $('#gMonth').innerHTML=HEB_ORDER.map(m=>opt(m,hebMonthOpt(m))).join('');
  let tzs=[];try{tzs=Intl.supportedValuesOf('timeZone')}catch(e){}
  if(!tzs.length)tzs=[...new Set(CITIES.map(c=>c.tz))].sort();
  if(!tzs.includes('Asia/Jerusalem'))tzs.unshift('Asia/Jerusalem');
  $('#cTz').innerHTML=tzs.map(t=>opt(t,t)).join('');
  if(!framed&&navigator.geolocation)$('#geoBtn').hidden=false;
}
function syncUI(){if(typeof renderTColors==='function'&&!document.activeElement?.dataset?.tcolC)renderTColors();if(typeof renderPlaceUI==='function')renderPlaceUI();if(typeof renderTfilot==='function'&&!document.activeElement?.closest?.('#tfList'))renderTfilot();
  yzInvalidate();
  const s=state.s;
  const radio=(n,v)=>document.querySelectorAll('input[name='+n+']').forEach(r=>r.checked=r.value===v);
  radio('calType',s.calType);radio('zmanimMode',s.zmanimMode);radio('theme',s.theme);radio('orient',s.orient);radio('layout',s.layout);radio('imgText',s.imgText||'auto');radio('view',s.view||'month');$('#dateStyle').value=dStyle();
  $('#rangeRow').hidden=['month','year','countdown'].includes(s.view||'month');$('#cdRow').hidden=s.view!=='countdown';{const c=cdCfg();if(document.activeElement!==$('#cdTitle'))$('#cdTitle').value=s.cdTitle||'';$('#cdDate').value=c.to;$('#cdFrom').value=c.from;$('#cdUnit').value=s.cdUnit||'days';$('#cdQTopic').value=s.cdQTopic||'auto';$('#cdBgOp').value=String(s.cdBgOp||0.25);if(document.activeElement!==$('#cdQCustom'))$('#cdQCustom').value=s.cdQCustom||'';$('#cdQBox').hidden=!s.cdQuotes;cdSyncCards();cdSyncDay()}spSync();if($('#startDate')){$('#startDate').value=s.startDate||'';$('#startDateClr').hidden=!s.startDate;$('#startDateRow').hidden=$('#startDateHint').hidden=['week','day','table','countdown'].includes(s.view||'month')}$('#rangeFrom').value=s.rangeFrom||'';$('#rangeTo').value=s.rangeTo||'';
  {const v=s.view||'month';$('#splitColsRow').hidden=v!=='day';wkSync();$('#splitCols').checked=!!s.splitCols;$('#tcolsRow').hidden=v!=='table';const tc={zmanim:true,holidays:true,personal:true,yz:true,notes:false,...(s.tcols||{})};document.querySelectorAll('[data-tcol]').forEach(c=>c.checked=!!tc[c.dataset.tcol])}
  $('#viewHint').textContent={table:'עמוד לכל שבוע בצורת טבלה: שורה לכל יום, טור לכל זמן, וטורים נפרדים לחגים, לאירועים האישיים וליומי דהילולא (יארצייטן).',month:'עמוד לכל חודש.',countdown:'לוח שסופר את הימים עד תאריך שבחרתם: בכל יום כתוב כמה נשאר.',year:'כל השנה בעמוד אחד, למקרר או לקיר. ימי חג צבועים, וימים עם אירוע אישי מסומנים בנקודה ומפורטים מתחת לכל חודש.',week:'עמוד לכל שבוע, עם מקום לכתיבה בכל יום. השאירו את התאריכים ריקים לשנה שלמה (כ־52 עמודים).',day:'עמוד לכל יום, עם שעות, זמני היום ומקום לכתיבה. שנה שלמה היא כ־355 עמודים, לכן כדאי לבחור טווח תאריכים.'}[s.view||'month'];
  $('#yzOverflow').value=s.yzOverflow==='widen'?'widen':'spill';$('#histOverflow').value=s.histOverflow||'ask';{const c=dstCfg();$('#dstMode').value=c.mode;$('#dstCustom').hidden=c.mode!=='custom';$('#dstSd').value=c.sd;$('#dstSm').value=c.sm;$('#dstSt').value=c.st;$('#dstEd').value=c.ed;$('#dstEm').value=c.em;$('#dstEt').value=c.et}$('#plZ').value=s.zmanimMode;$('#plZ2').value=s.zmanimMode;{const m=zMode();$('#zmanimChecks').hidden=m!=='table';$('#zmPlaceBox').hidden=m==='table'||m==='none'}
  $('#zmHint').textContent={custom:'כל זמן במקום שבחרתם ברשימה למטה: בתוך היום, בטור, או בשניהם.',col:'הזמנים מופיעים בטבלה קטנה בטור נפרד ליד הלוח החודשי: שורה לכל יום.',daily:'הזמנים מופיעים בתחתית כל יום.',shabbat:'הזמנים מופיעים רק בימי שבת.',table:'הזמנים יוצאים מהימים לטבלה מתחת ללוח, עם הדלקת נרות וצאת שבת לכל שבת. כך התמונות בימים נראות במלואן.',none:'בלי זמני היום. הדלקת נרות ויציאה עדיין מופיעים בימי שישי ושבת.'}[s.zmanimMode];
  $('#ytsg').value=s.ytsg||'faint';$('#chanukah').value=s.chanukah||'tzeit';if($('#nital')){$('#nital').value=s.nital||'none';$('#nitalFrom').value=s.nitalFrom||'shkia';$('#nitalFrom').closest('.fld').hidden=(s.nital||'none')==='none'}$('#ytsgRow').hidden=!s.il;$('#hebYearRow').hidden=s.calType!=='heb';$('#gregYearRow').hidden=s.calType!=='greg';
  if(![...$('#hebYear').options].some(o=>+o.value===+s.hebYear))$('#hebYear').insertAdjacentHTML('beforeend',opt(s.hebYear,hebYearStr(+s.hebYear)));
  $('#hebYear').value=s.hebYear;$('#gregYear').value=s.gregYear;$('#gregStart').value=s.gregStart;$('#hebStart').value=s.hebStart||7;
  $('#cover').checked=!!s.cover;$('#candleMins').value=s.candleMins;$('#il').checked=!!s.il;
  document.querySelectorAll('[data-opt]').forEach(c=>c.checked=!!s[c.dataset.opt]);
  {const c=document.querySelector('[data-opt=credit]');if(c){c.checked=creditOn();c.disabled=!creditHideOk();$('#creditHint').textContent=creditHideOk()?'':'(אפשר להסתיר רק במסלול המלא)'}}
  document.querySelectorAll('[data-z]').forEach(c=>c.checked=!!s.zmanim[c.dataset.z]);
  ['m_shma','size'].forEach(k=>$('#'+k).value=s[k]);
  {const M=s.moon||{};document.querySelectorAll('[data-moon]').forEach(c=>c.checked=['molad','tal','geshem','behab','eruv','ilanot'].includes(c.dataset.moon)?M[c.dataset.moon]!==false:!!M[c.dataset.moon]);document.querySelectorAll('[data-moonsel]').forEach(c=>c.value=M[c.dataset.moonsel]||'none');const L=s.learn||{};document.querySelectorAll('[data-learn]').forEach(c=>c.checked=!!L[c.dataset.learn])}
  {const pr=s.zmPreset||'ashkenaz',simple=['ashkenaz','sefardi','tanya','chul','chazon','tzikoni'];document.querySelectorAll('input[name=zmSimple]').forEach(r=>r.checked=r.value===pr);const n=$('#zmAdvNote');n.hidden=simple.includes(pr);if(!n.hidden)n.textContent='נבחרה שיטה מההגדרות המתקדמות: '+({tuk:'הגרי״מ טוקצ׳ינסקי',itim:'אשכנזים, נץ מישורי ושקיעה לפי הגובה',gra:'גר״א פשוט',custom:'מותאם אישית'}[pr]||pr)+'. לחזרה לשיטה רגילה, בחרו אחת מהאפשרויות למעלה.'}
  $('#zmPreset').value=s.zmPreset||'ashkenaz';$('#zmPresetHint').textContent=ZM_PRESET_HINT[s.zmPreset||'ashkenaz'];$('#secs').checked=!!s.secs;
  $('#headFont').value=s.headFont||'';$('#bodyFont').value=s.bodyFont||'';
  $('#headPrev').style.fontFamily=s.headFont?fontCSS(s.headFont):({ink:fontCSS('Frank Ruhl Libre'),block:fontCSS('Suez One'),soft:fontCSS('Bellefair')}[s.theme]);
  $('#bodyPrev').style.fontFamily=fontCSS(s.bodyFont||'Assistant');
  $('#customSizeRow').hidden=s.size!=='custom';$('#customW').value=s.customW;$('#customH').value=s.customH;
  $('#imgRatioFld').hidden=s.layout!=='same';
  const LH=' את התמונות עצמן מעלים בהמשך, בשלב "אירועים ותמונות". שם תהיה גם אפשרות להוסיף תמונה לכל תאריך בנפרד, בתוך הריבוע של היום.';
  $('#layoutHint').textContent={split:'כל עמוד לוח מקבל לפניו עמוד שלם לתמונה של החודש. מתאים ללוח קיר שנתלה פתוח, או להדפסה דו־צדדית.'+LH,same:'כאן מוסיפים תמונה גדולה לכל חודש, בראש העמוד ולצד הלוח. אפשר לכוון את גובה התמונה.'+LH,full:'הלוח ממלא את כל העמוד, בלי תמונה גדולה לחודש. תמונות אפשר לשים בתוך הימים (בשלב "אירועים ותמונות"), להוסיף עמודים באמצע עם "+", או להוסיף באנר בצד.'}[s.layout]||'';
  const bl=bannerList();document.querySelectorAll('[data-bpos]').forEach(c=>c.checked=bl.includes(c.dataset.bpos));$('#bannerOpts').hidden=!bl.length;
  $('#bannerSize').value=s.bannerSize||15;$('#bannerSizeVal').textContent=(s.bannerSize||15)+'% מהדף';$('#bannerPer').checked=!!s.bannerPer;
  $('#imgRatio').value=s.imgRatio;$('#imgRatioVal').textContent=s.imgRatio+'% מהדף';
  $('#textScale').value=s.textScale;$('#textScaleVal').textContent=s.textScale+'%';$('#histScale').value=s.histScale||100;$('#histScaleVal').textContent=(s.histScale||100)+'%';
  $('#showCaption').checked=!!s.showCaption;$('#dedication').checked=!!s.dedication;
  document.querySelectorAll('.sw').forEach(b=>b.setAttribute('aria-pressed',b.dataset.acc===s.accent));
  if(typeof applyMode==='function'&&$('#stepper').childElementCount)applyMode();
  renderHl();
  $('#accentCustom').value=s.accent;
  renderCitySelect();renderLocNow();
  const p=place();$('#cName').value=p.name;$('#cLat').value=p.lat;$('#cLng').value=p.lng;$('#cEl').value=p.el||0;$('#cTz').value=p.tz;$('#cIl').checked=!!s.il;
  renderGedolim();renderEvents();renderAds();
}
function renderGedolim(){
  const all=GEDOLIM.concat(state.customGedolim);
  $('#gedList').innerHTML=all.map(g=>{const custom=state.customGedolim.includes(g);
    return '<div class="ev-item"><label class="chk" style="flex:1"><input type="checkbox" data-g="'+g.id+'"'+(state.s.gedolim[g.id]?' checked':'')+'> <span>'+esc(g.name)+'<span class="sub">'+gem(+g.day)+' '+esc(EN?hebMonthOpt(g.month):g.month==12?'אדר':HEB_MONTHS[g.month])+'</span></span></label>'+(custom?'<button class="x" type="button" data-gdel="'+g.id+'" aria-label="מחיקה">×</button>':'')+'</div>'}).join('');
  renderYz();
}
function renderYz(){
  const s=state.s,qv=($('#yzSearch').value||'').trim(),mode=s.yzMode||'selected';
  document.querySelectorAll('input[name=yzMode]').forEach(r=>r.checked=r.value===mode);
  $('#yzListSel').innerHTML=yzListOptions();$('#yzListRow').hidden=(s.yzMode||'selected')==='all';$('#yzListHint').hidden=(s.yzMode||'selected')==='all';
  $('#yzOrder').value=s.yzOrder||'year';
  $('#yzFmt').value=s.yzFmt||'short';$('#yzPrefix').value=s.yzPrefix||'yaz';$('#persPrefix').value=s.persPrefix||'yaz';$('#yzHist').checked=!!s.yzHist;
  let L;
  if(qv){const words=qv.replace(/["'״׳]/g,'').split(/\s+/);L=yzAll().filter(e=>yzMatches(e,words)).slice(0,80)}
  else if(mode==='all'){const h=s.yzHide||{};L=yzAll().filter(e=>h[e.id]);}
  else{const sel=yzSel();L=yzAll().filter(e=>sel[e.id])}
  $('#yzList').innerHTML=L.length?L.map(e=>yzRow(e,true)).join(''):'<p class="hint">'+(qv?'לא נמצא. נסו מילה אחרת, או הוסיפו רשומה בניהול המאגר.':mode==='all'?'כל המאגר מוצג. כדי לדלג על מישהו, חפשו אותו והורידו את הסימון.':'אין סימונים. חפשו שם כדי לסמן.')+'</p>';
  $('#yzListTitle').textContent=qv?'תוצאות חיפוש':mode==='all'?'שהורדתם (לא יוצגו)':'מסומנים (יוצגו בלוח)';
  const n=Object.values(yzSel()).filter(Boolean).length+GEDOLIM.concat(state.customGedolim).filter(g=>state.s.gedolim[g.id]).length;
  $('#gedCount').textContent=(mode==='none'?'כבוי':mode==='all'?'כל המאגר':n+' מסומנים');
}
function renderEvents(){
  const list=state.events.slice().sort((a,b)=>(a.rec==='once')-(b.rec==='once'));
  $('#evList').innerHTML=list.length?list.map(e=>{
    const when=e.rec==='heb'?gem(+e.day)+' '+hebMonthOpt(+e.month)+' · כל שנה':e.rec==='greg'?e.day+(EN?' ':' ב')+GREG_MONTHS[e.month-1]+' · כל שנה':(e.date?dateFromIso(e.date).toLocaleDateString('he-IL'):'');
    return '<div class="ev-item">'+(e.img?'<img src="'+e.img+'" alt="">':'')+'<button type="button" class="t" data-edit="'+e.id+'">'+esc(e.name||'(תמונה)')+'<small>'+KINDS[e.kind].label+' · '+esc(when)+'</small></button><button class="x" type="button" data-edel="'+e.id+'" aria-label="מחיקה">×</button></div>'}).join('')
    :'<p class="hint">עדיין אין אירועים. לחצו על יום בלוח כדי להוסיף את הראשון.</p>';
  $('#evCount').textContent=state.events.length||'';
}
function renderAds(){
  if(!$('#adType').options.length)$('#adType').innerHTML=Object.entries(XTYPES).map(([k,v])=>opt(k,v)).join('');
  $('#adList').innerHTML=state.ads.length?state.ads.map((a,i)=>'<div class="ev-item"><span class="t" style="cursor:default">עמוד '+(i+1)+' · '+esc(XTYPES[a.type||'image'])+'<small>אחרי: '+esc(RS.labels[a.after]||'מיקום שלא קיים בתצוגה הזו, מופיע בסוף')+(a.text?' · '+esc(a.text.split('\n')[0]):'')+'</small></span><button class="x" type="button" data-addel="'+a.id+'" aria-label="מחיקה">×</button></div>').join(''):'<p class="hint">אין עמודים נוספים.</p>';
  $('#adCount').textContent=state.ads.length||'';
}

function set(k,v){state.s[k]=v;save();syncUI();rerender()}
document.addEventListener('change',e=>{
  const t=e.target;if(t.closest('.modal'))return;
  if(t.name==='calType'){const st=dStyle();if(st==='hebOnly'&&t.value==='greg')state.s.dateStyle='gregOnly';if(st==='gregOnly'&&t.value==='heb')state.s.dateStyle='hebOnly';return set('calType',t.value)}
  if(t.id==='dateStyle'){if(t.value==='hebOnly')state.s.calType='heb';if(t.value==='gregOnly')state.s.calType='greg';return set('dateStyle',t.value)}
  if(['zmanimMode','theme','layout','imgText','view'].includes(t.name))return set(t.name,t.value);
  if(t.name==='orient')return set('orient',t.value);
  if(t.dataset.cdshow){state.s.cdShow={...(state.s.cdShow||{}),[t.dataset.cdshow]:t.checked};cdFocus('page');return set('cdShow',state.s.cdShow)}
  if(t.dataset.opt){if(/^cd/.test(t.dataset.opt))cdFocus({cdQuotes:'quote',cdIntro:'intro',cdOutro:'outro'}[t.dataset.opt]||'page');return set(t.dataset.opt,t.checked)}
  if(t.dataset.z){state.s.zmanim[t.dataset.z]=t.checked;return set('zmanim',state.s.zmanim)}
  if(t.dataset.bpos){const cur=bannerList().filter(x=>x!==t.dataset.bpos);if(t.checked)cur.push(t.dataset.bpos);state.s.banner='none';return set('banners',['top','right','left','bottom'].filter(x=>cur.includes(x)))}
  if(t.name==='zmSimple'){state.s.zm={...ZM_PRESETS[t.value]};state.s.zmPreset=t.value;if(t.value==='chul'&&!state.s.il){}return set('zmPreset',t.value)}
  if(t.dataset.yzv&&t.closest('#yzList')){yzSetVisible(t.dataset.yzv,t.checked);save();rerender();renderYz();return}
  if(t.name==='yzMode')return set('yzMode',t.value);
  if(t.id==='yzFmt')return set('yzFmt',t.value);
  if(t.id==='yzHist'){if(t.checked&&(state.s.view||'month')==='month'&&placeOf('yz')!=='none'){state.s.place={...(state.s.place||{}),yz:'page'}}return set('yzHist',t.checked)}
  if(t.id==='yzOrder')return set('yzOrder',t.value);
  if(t.id==='yzListSel')return set('yzListId',t.value);
  if(t.dataset.yzsrc){state.s.yzSrc={...(state.s.yzSrc||{}),[t.dataset.yzsrc]:t.checked};return set('yzSrc',state.s.yzSrc)}
  if(t.id==='plZ'||t.id==='plZ2'){if(t.value!=='custom'&&t.value!=='table'&&t.value!=='none')state.s.zplace=null;return set('zmanimMode',t.value)}
  if(t.id==='panelSide')return set('panelSide',t.value);
  if(t.dataset.place){state.s.place={...(state.s.place||{}),yz:(state.s.place||{}).yz||placeOf('yz'),[t.dataset.place]:t.value};return set('place',state.s.place)}
  if(t.id==='yzPanelW')return set('yzPanelW',+t.value);
  if(t.id==='yzOverflow')return set('yzOverflow',t.value);
  if(t.id==='histOverflow'){HIST_ASKED=false;return set('histOverflow',t.value)}
  if(/^dst(Mode|Sd|Sm|St|Ed|Em|Et)$/.test(t.id)){const k={dstMode:'mode',dstSd:'sd',dstSm:'sm',dstSt:'st',dstEd:'ed',dstEm:'em',dstEt:'et'}[t.id];state.s.dst={...dstCfg(),...(state.s.dst||{}),[k]:t.value};ZC.clear&&ZC.clear();return set('dst',state.s.dst)}
  if(t.dataset.tcol){const tc={zmanim:true,holidays:true,personal:true,yz:true,notes:false,...(state.s.tcols||{})};tc[t.dataset.tcol]=t.checked;return set('tcols',tc)}
  if(t.id==='splitCols')return set('splitCols',t.checked);
  if(t.dataset.moon){state.s.moon={...(state.s.moon||{}),[t.dataset.moon]:t.checked};return set('moon',state.s.moon)}
  if(t.dataset.moonsel){state.s.moon={...(state.s.moon||{}),[t.dataset.moonsel]:t.value};return set('moon',state.s.moon)}
  if(t.dataset.learn){state.s.learn={...(state.s.learn||{}),[t.dataset.learn]:t.checked};return set('learn',state.s.learn)}
  if(t.dataset.g){state.s.gedolim[t.dataset.g]=t.checked?1:0;return set('gedolim',state.s.gedolim)}
  if(t.dataset.adpos){const a=state.ads.find(x=>x.id===t.dataset.adpos);const v=t.value;a.after=(v==='start'||v==='end')?v:+v;save();render();return}
  switch(t.id){
    case 'hebYear':return set('hebYear',+t.value);
    case 'gregYear':if(+t.value>1900&&+t.value<2200)set('gregYear',+t.value);return;
    case 'gregStart':return set('gregStart',+t.value);
    case 'hebStart':return set('hebStart',+t.value);
    case 'rangeFrom':case 'rangeTo':return set(t.id,t.value);
    case 'startDate':return set('startDate',t.value||'');
    case 'cdDate':case 'cdFrom':if(t.value)set(t.id,t.value);return;
    case 'cdUnit':case 'cdQTopic':cdFocus(t.id==='cdQTopic'?'quote':'page');return set(t.id,t.value);
    case 'cdDStyle':cdFocus('page');if(t.value==='hebOnly')state.s.calType='heb';if(t.value==='gregOnly')state.s.calType='greg';return set('dateStyle',t.value);
    case 'cdCity':{const c=CITIES.find(x=>x.id===t.value);if(!c)return;state.s.candleMins=c.candle;state.s.il=c.il;cdFocus('page');return set('city',c.id)}
    case 'cdQEvery':cdFocus('quote');return set(t.id,Math.max(1,Math.min(60,+t.value||10)));
    case 'cover':case 'showCaption':case 'dedication':case 'il':case 'bannerPer':return set(t.id,t.checked);
    case 'city':{if(!t.value)return;locChosen();if(t.value!=='custom'){const c=CITIES.find(x=>x.id===t.value);state.s.candleMins=c.candle;state.s.il=c.il}return set('city',t.value)}
    case 'candleMins':return set('candleMins',+t.value);
    case 'accentCustom':return set('accent',t.value);
    case 'size':{const z=SIZES[t.value];if(z&&z.o)state.s.orient=z.o;const q0=QPX('page');const r=set('size',t.value);if(QPX('page')>q0*1.15)setTimeout(bigPaperNote,300);return r}
    case 'customW':case 'customH':if(+t.value>=50&&+t.value<=1200)set(t.id,+t.value);return;
    case 'm_shma':case 'ytsg':case 'chanukah':case 'nital':case 'nitalFrom':case 'yzPrefix':case 'persPrefix':yzInvalidate&&yzInvalidate();return set(t.id,t.value);
    case 'secs':return set('secs',t.checked);
    case 'zmPreset':{if(t.value!=='custom')state.s.zm={...ZM_PRESETS[t.value]};return set('zmPreset',t.value)}
    case 'headFont':case 'bodyFont':loadFont(t.value);return set(t.id,t.value);
  }
});
$('#cityFilter').addEventListener('input',renderCitySelect);
$('#imgRatio').addEventListener('input',e=>{state.s.imgRatio=+e.target.value;$('#imgRatioVal').textContent=e.target.value+'% מהדף';save();rerender()});
$('#bannerSize').addEventListener('input',e=>{state.s.bannerSize=+e.target.value;state.s.bannerSizes={};$('#bannerSizeVal').textContent=e.target.value+'% מהדף';save();rerender()});
$('#histScale')&&$('#histScale').addEventListener('input',e=>{state.s.histScale=+e.target.value;$('#histScaleVal').textContent=e.target.value+'%';save();rerender()});
$('#textScale').addEventListener('input',e=>{state.s.textScale=+e.target.value;$('#textScaleVal').textContent=e.target.value+'%';save();rerender()});
$('#swatches').addEventListener('click',e=>{const b=e.target.closest('.sw');if(b)set('accent',b.dataset.acc)});
$('#yzSearch').addEventListener('input',renderYz);
$('#zmOpen').onclick=openZmanimSettings;
$('#yzManage').onclick=openYzManager;
$('#yzList').addEventListener('click',e=>{const id=e.target.dataset&&e.target.dataset.yzed;if(id)openYzEditor(id)});
$('#yzDefaults').onclick=()=>{const sel=yzSel();YZ_DEFAULT_SEL.forEach(i=>sel[i]=1);save();syncUI();rerender()};
$('#yzNone').onclick=()=>{const l=yzActiveList();l.sel={};save();syncUI();rerender()};
$('#yzListsBtn').onclick=()=>openYzLists();
$('#gedAll').onclick=()=>{GEDOLIM.concat(state.customGedolim).forEach(g=>state.s.gedolim[g.id]=1);set('gedolim',state.s.gedolim)};
$('#gedNone').onclick=()=>set('gedolim',{});
$('#gAdd').onclick=()=>{const n=$('#gName').value.trim();if(!n){$('#gName').focus();return}
  const g={id:'c'+uid(),name:n,day:+$('#gDay').value,month:+$('#gMonth').value};state.customGedolim.push(g);state.s.gedolim[g.id]=1;$('#gName').value='';set('gedolim',state.s.gedolim)};
$('#gedList').addEventListener('click',e=>{const id=e.target.dataset&&e.target.dataset.gdel;if(id){state.customGedolim=state.customGedolim.filter(g=>g.id!==id);delete state.s.gedolim[id];set('gedolim',state.s.gedolim)}});
$('#evList').addEventListener('click',e=>{
  const ed=e.target.closest('[data-edit]');if(ed)return openEventEditor({id:ed.dataset.edit});
  const id=e.target.dataset&&e.target.dataset.edel;if(id){state.events=state.events.filter(x=>x.id!==id);save();renderEvents();rerender()}});
$('#addEvSide').onclick=$('#addEvTop').onclick=()=>openEventEditor({});
$('#adAdd').onclick=()=>{if(!canF('extraPages')){openUpgrade('extraPages');return}state.ads.push({id:uid(),type:$('#adType').value,after:'end',img:null,text:''});save();render()};
$('#adList').addEventListener('click',e=>{const id=e.target.dataset&&e.target.dataset.addel;if(id)removeExtra(id)});

/* המיקום שלי / מיקוד / כתובת */
if($('#geoPick'))$('#geoPick').onclick=()=>{if(!window.MyLuachGeo)return;
  MyLuachGeo.open({en:EN,near:(lat,lng)=>{const n=nearest(lat,lng);return {tz:n.city.tz,el:n.city.el,km:n.km}}}).then(p=>{if(!p)return;
    const n=nearest(p.lat,p.lng);locChosen();state.s.custom={name:p.name,lat:p.lat,lng:p.lng,el:p.el,tz:p.tz,il:p.il};state.s.il=p.il;
    state.s.candleMins=n.km<10?n.city.candle:(p.il?30:18);$('#cityFilter').value='';set('city','custom')})};
/* custom location */
function fillFromCoords(lat,lng,name){
  const n=nearest(lat,lng);
  $('#cLat').value=lat.toFixed(5);$('#cLng').value=lng.toFixed(5);
  if(name)$('#cName').value=name;else if(!$('#cName').value||CITIES.some(c=>c.name===$('#cName').value))$('#cName').value=n.km<25?'ליד '+n.city.name:'מיקום מותאם';
  $('#cTz').value=n.city.tz;$('#cIl').checked=n.city.il&&n.km<150;
  $('#cEl').value=n.km<15?n.city.el:0;
  return n;
}
$('#gmapsApply').onclick=()=>{
  const r=parseLoc($('#gmaps').value),msg=$('#gmapsMsg');
  if(!r){msg.innerHTML='<span class="msg-bad">לא זיהיתי קואורדינטות. בקישור מקוצר (maps.app.goo.gl) פתחו אותו קודם והעתיקו את הכתובת המלאה, או השתמשו בקליק ימני כמו בהוראות.</span>';return}
  const n=fillFromCoords(r.lat,r.lng,r.name);
  msg.innerHTML='<span class="msg-ok">נמצא: '+r.lat.toFixed(5)+', '+r.lng.toFixed(5)+'.</span> אזור הזמן נלקח מ'+esc(n.city.name)+'. בדקו את הפרטים ולחצו "שימוש במיקום הזה".';
};
$('#geoBtn').onclick=()=>{const msg=$('#gmapsMsg');msg.textContent='מאתר…';
  navigator.geolocation.getCurrentPosition(p=>{fillFromCoords(p.coords.latitude,p.coords.longitude,'המיקום שלי');if(p.coords.altitude)$('#cEl').value=Math.round(p.coords.altitude);msg.innerHTML='<span class="msg-ok">המיקום נמצא.</span> לחצו "שימוש במיקום הזה".'},
  ()=>{msg.innerHTML='<span class="msg-bad">הדפדפן לא אישר גישה למיקום.</span>'},{timeout:15000})};
$('#cSave').onclick=()=>{
  const lat=parseFloat($('#cLat').value),lng=parseFloat($('#cLng').value),msg=$('#gmapsMsg');
  if(!(Math.abs(lat)<=90&&Math.abs(lng)<=180)||isNaN(lat)||isNaN(lng)){msg.innerHTML='<span class="msg-bad">קו רוחב צריך להיות בין ‎-90 ל־90, וקו אורך בין ‎-180 ל־180.</span>';return}
  const il=$('#cIl').checked;
  state.s.custom={name:$('#cName').value.trim()||'מיקום מותאם',lat,lng,el:parseFloat($('#cEl').value)||0,tz:$('#cTz').value,il};
  state.s.il=il;if(!il&&state.s.city!=='custom')state.s.candleMins=18;
  $('#cityFilter').value='';msg.innerHTML='<span class="msg-ok">המיקום עודכן.</span>';
  set('city','custom');
};

/* backup */
$('#exportBtn').onclick=()=>{
  const json=JSON.stringify(state);
  if(!framed){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.download='luchenu-backup.json';document.body.appendChild(a);a.click();a.remove();return}
  const m=modal('<h3>שמירת גיבוי</h3><p class="hint">העתיקו את הטקסט ושמרו אותו בקובץ או בהודעה לעצמכם. הוא כולל את התמונות, ולכן הוא ארוך.</p><textarea readonly id="bk"></textarea><div class="row"><button class="btn primary" type="button" id="bkCopy">העתקה</button><button class="btn" type="button" data-close>סגירה</button></div>');
  const ta=m.querySelector('#bk');ta.value=json;
  m.querySelector('#bkCopy').onclick=async ev=>{try{await navigator.clipboard.writeText(json);ev.target.textContent='הועתק'}catch(err){ta.focus();ta.select();ev.target.textContent='סמנו והעתיקו ידנית'}};
};
$('#importBtn').onclick=()=>{
  const m=modal('<h3>שחזור מגיבוי</h3><p class="hint">בחרו קובץ גיבוי או הדביקו את טקסט הגיבוי. הנתונים הנוכחיים יוחלפו.</p><div class="row"><button class="btn" type="button" id="imFile">בחירת קובץ</button></div><textarea id="imText" placeholder="הדביקו כאן"></textarea><p class="hint" id="imMsg"></p><div class="row"><button class="btn primary" type="button" id="imGo">שחזור</button><button class="btn" type="button" data-close>ביטול</button></div>');
  const apply=txt=>{try{state=merge(DEFAULT,JSON.parse(txt));save();syncUI();render();m.remove()}catch(err){m.querySelector('#imMsg').innerHTML='<span class="msg-bad">הטקסט אינו גיבוי תקין של MyLuach.</span>'}};
  m.querySelector('#imGo').onclick=()=>apply(m.querySelector('#imText').value);
  m.querySelector('#imFile').onclick=()=>{const f=$('#fileJson');f.value='';f.onchange=()=>{const r=new FileReader();r.onload=()=>apply(r.result);if(f.files[0])r.readAsText(f.files[0])};f.click()};
};
function bindReset(){
  $('#resetRow').innerHTML='<button class="btn small danger" type="button" id="resetBtn">איפוס הכל</button>';
  $('#resetBtn').onclick=()=>{
    $('#resetRow').innerHTML='<span class="hint">למחוק את כל התמונות, האירועים וההגדרות?</span><button class="btn small danger" type="button" id="resetYes">כן, למחוק</button><button class="btn small" type="button" id="resetNo">ביטול</button>';
    $('#resetYes').onclick=()=>{state=structuredClone(DEFAULT);state.events=[];if(SIMPLE){state.s.cover=false;state.s.pageBg='month'}save();bindReset();syncUI();render()};
    $('#resetNo').onclick=bindReset;
  };
}

async function fillLums(){
  let changed=false;
  for(const e of state.events){if(e.img&&!e.imgLum){e.imgLum=await imageLum(e.img);changed=true}}
  if(changed){save();render()}
}
/* reports to site admin */
let DBP=null,USERP=null;
function capDb(){if(!DBP)DBP=(async()=>{try{return window.claude&&claude.use?await claude.use('db'):null}catch(e){return null}})();return DBP}
function capUser(){if(!USERP)USERP=(async()=>{try{return window.claude&&claude.use?await claude.use('user'):null}catch(e){return null}})();return USERP}
function yzOrig(id){const e=YZ[+id];return e?{m:e[0],d:e[1],y:e[2],t:e[3]}:null}
function reportItems(only){
  const ed=state.yzEdit||{},cu=state.yzCustom||[];
  const edits=Object.keys(ed).filter(k=>only==null||String(only)===k).map(k=>({id:k,orig:yzOrig(k),now:ed[k]}));
  const custom=cu.filter(c=>only==null||c.id===only).map(c=>({m:c.m,d:c.d,y:c.y||'',t:c.t,p:c.p?1:0}));
  return {edits,custom};
}
function reportText(r){
  const dt=x=>gem(+x.d)+' '+YZ_MONTH_NAME(+x.m)+(x.y?' '+x.y:'');
  let s='סוג: '+r.kind+'\n';
  if(r.contact)s+='פרטי קשר: '+r.contact+'\n';
  if(r.note)s+='הערה: '+r.note+'\n';
  r.edits.forEach(e=>{s+='\nתיקון לרשומה '+e.id+':\nהיה: '+(e.orig?dt(e.orig)+' – '+e.orig.t:'')+'\nצריך להיות: '+dt(e.now)+' – '+e.now.t+'\n'});
  r.custom.forEach(c=>{s+='\nאירוע חדש: '+dt(c)+' – '+c.t+(c.p?' (פטירה)':'')+'\n'});
  return s;
}
function openReport(only){
  const it=reportItems(only);
  const m=modal('<h3>שליחה למנהל האתר</h3><p class="hint">מנהל האתר יבדוק את מה ששלחתם, ואם יאשר, התיקון ייכנס למאגר של כולם. עד אז השינויים שלכם נשארים רק אצלכם.</p>'+
    '<label class="fld">מה שולחים<select id="rpK"><option>תיקון לאירוע קיים</option><option>אירוע שחסר במאגר</option><option>הערה כללית או בקשה</option></select></label>'+
    (it.edits.length?'<label class="chk"><input type="checkbox" id="rpE" checked> לצרף את התיקונים שעשיתי ('+it.edits.length+')</label>':'')+
    (it.custom.length?'<label class="chk"><input type="checkbox" id="rpC" checked> לצרף את האירועים שהוספתי ('+it.custom.length+')</label>':'')+
    '<label class="fld">הערה או מקור (למשל: מאיזה ספר התאריך)<textarea id="rpN" rows="3" style="width:100%;font:inherit;border:1px solid var(--line);border-radius:7px;padding:7px 9px;background:var(--bg);color:var(--ink)"></textarea></label>'+
    '<label class="fld">שם או דרך ליצור קשר (לא חובה)<input id="rpW"></label>'+
    '<p class="hint" id="rpMsg"></p><div class="row"><button class="btn primary" type="button" id="rpGo">שליחה</button><button class="btn" type="button" data-close>ביטול</button></div>');
  const q=x=>m.querySelector(x);
  if(only!=null&&!String(only).startsWith('c'))q('#rpK').selectedIndex=0;else if(only!=null)q('#rpK').selectedIndex=1;else if(!it.edits.length&&it.custom.length)q('#rpK').selectedIndex=1;
  q('#rpGo').onclick=async()=>{
    const r={kind:q('#rpK').value,note:q('#rpN').value.trim(),contact:q('#rpW').value.trim(),edits:q('#rpE')&&q('#rpE').checked?it.edits:[],custom:q('#rpC')&&q('#rpC').checked?it.custom:[],at:Date.now()};
    if(!r.note&&!r.edits.length&&!r.custom.length){q('#rpMsg').innerHTML='<span class="msg-bad">כתבו הערה או צרפו תיקון.</span>';return}
    q('#rpGo').disabled=true;q('#rpMsg').textContent='שולח…';
    const db=await capDb(),user=await capUser();let ok=false;
    if(db&&user){try{const id=await user.id();if(id){const ref=db.doc('reports/'+id);const cur=await ref.get();const subs=((cur.exists&&cur.data().subs)||[]).slice(-40);subs.push(r);await ref.set({subs,last:r.at});ok=true}}catch(e){ok=false}}
    if(ok){m.querySelector('.modal').innerHTML='<h3>נשלח, תודה!</h3><p class="hint">מנהל האתר יעבור על זה. השינויים שלכם ממשיכים להופיע אצלכם בינתיים.</p><div class="row"><button class="btn primary" type="button" data-close>סגירה</button></div>';return}
    const txt=reportText(r);
    m.querySelector('.modal').innerHTML='<h3>אי אפשר לשלוח מכאן</h3><p class="hint">בגרסה הזו של האתר אין שליחה ישירה. העתיקו את הטקסט ושלחו אותו למנהל האתר.</p><textarea readonly id="rpT" rows="8" style="width:100%"></textarea><div class="row"><button class="btn primary" type="button" id="rpCopy">העתקה</button><button class="btn" type="button" data-close>סגירה</button></div>';
    const ta=m.querySelector('#rpT');ta.value=txt;
    m.querySelector('#rpCopy').onclick=async ev=>{try{await navigator.clipboard.writeText(txt);ev.target.textContent='הועתק'}catch(err){ta.focus();ta.select();ev.target.textContent='סמנו והעתיקו ידנית'}};
  };
}
async function openInbox(){
  const db=await capDb();if(!db)return;
  const m=modal('<h3>דיווחים שהתקבלו</h3><div id="ibL" class="hint">טוען…</div><div class="row"><button class="btn" type="button" id="ibCopy">העתקת הכל</button><button class="btn" type="button" data-close>סגירה</button></div>');
  let all='';
  try{
    const snap=await db.collection('reports').get();const subs=[];
    snap.docs.forEach(d=>{((d.data()||{}).subs||[]).forEach(s=>subs.push(s))});
    subs.sort((a,b)=>b.at-a.at);
    const L=m.querySelector('#ibL');
    if(!subs.length){L.textContent='עדיין לא התקבלו דיווחים.';return}
    L.innerHTML='';
    subs.forEach(s=>{const t=new Date(s.at).toLocaleDateString('he-IL')+'\n'+reportText(s);all+=t+'\n――――\n';const pre=el('pre','ib-item');pre.textContent=t;L.appendChild(pre)});
  }catch(e){m.querySelector('#ibL').textContent='לא הצלחתי לטעון את הדיווחים.'}
  m.querySelector('#ibCopy').onclick=async ev=>{try{await navigator.clipboard.writeText(all);ev.target.textContent='הועתק'}catch(err){}};
}
$('#yzReport').onclick=()=>openReport(null);
$('#yzInbox').onclick=openInbox;
(async()=>{const u=await capUser();try{if(u&&await u.isOwner()){$('#yzInbox').hidden=false}}catch(e){}})();
/* wizard / home */
const STEPS=[
 ['סוג הלוח','בוחרים לוח עברי או לועזי, את השנה ואת גודל הדף.'],
 ['עיצוב ופריסה','איך נראה כל עמוד: תמונה ולוח, עמודים נפרדים או לוח מלא. צבעים וגופנים.'],
 ['מיקום וזמני היום','בוחרים עיר או מיקום במפה, ואת שיטת הזמנים. הגדרות מדויקות לכל זמן נמצאות ב"הגדרות מתקדמות".'],
 ['מה יופיע בלוח','סגנון התאריך, מה מופיע בתוך הימים ומה בטור נפרד, מולד וקידוש לבנה, לימוד יומי ואירועים בדברי ימי ישראל.'],
 ['אירועים ותמונות','ימי הולדת, ימי שנה (יארצייטים) ותזכורות משפחתיות, ותמונות לכל חודש. אפשר גם ללחוץ על כל יום בלוח.'],
 ['שער, באנרים ועמודים','באנרים בצדדים, ועמודים נוספים כמו פרסומות, ברכות או דפי הערות בכל מקום בלוח.'],
 ['עיצוב חופשי','בתצוגה המקדימה אפשר לגרור, להגדיל ולעצב כל דבר ישירות.'],
 ['סיום והדפסה','הכל נשמר. מכאן מדפיסים או שומרים כ־PDF.']];
const CD_STEPS={1:['פרטי הספירה','למה סופרים, תאריך היעד, העיצוב והצורה, תמונות ומשפטים, וגודל הדף.'],2:['צבעים וגופנים','צבעי הלוח, הגופנים וגודל הטקסט.'],7:['עיצוב חופשי','בתצוגה המקדימה אפשר לגרור, להגדיל ולעצב כל דבר ישירות.'],8:['סיום והדפסה','הכל נשמר. מכאן מדפיסים או שומרים כ־PDF.']};
const SIMPLE_STEPS={7:['עיצוב חופשי','מגדילים, מקטינים ומזיזים כל טקסט בלוח, משנים את גודל הטבלה, ומוסיפים כיתוב או תמונה בכל מקום בדף.'],1:['סוג הלוח','לוח עברי או לועזי, השנה וגודל הדף.'],2:['עיצוב','איך נראה כל עמוד, צבעים וגופנים.'],5:['תמונות ואירועים','המסלול המהיר: מעלים את כל התמונות למגש שבתחתית המסך, גוררים כל תמונה לחודש או ליום (או "מילוי אוטומטי"), ולוחצים על יום כדי להוסיף יום הולדת או אירוע.'],8:['סיום והדפסה','הכל נשמר. מכאן מדפיסים או שומרים כ־PDF.']};
/* עיצובים מוכנים לבונה הפשוט: לחיצה אחת משנה סגנון, צבע, גופנים ופריסה */
const SIMPLE_PRESETS=[
 ['round','מעוגל ומרווח','round','#1e5a63','Rubik','Assistant','full'],
 ['classic','קלאסי','ink','#1e5a63','Frank Ruhl Libre','Assistant','same'],['modern','מודרני ונקי','soft','#24427a','Heebo','Heebo','same'],
 ['bold','בולט ושמח','block','#8a2c2c','Suez One','Rubik','same'],['family','משפחתי חם','soft','#7a4a17','Secular One','Assistant','same'],
 ['elegant','אלגנטי','ink','#2f2f3a','Bellefair','David Libre','same'],['nature','טבע','soft','#3d5a2a','Alef','Alef','same'],
 ['kids','ילדים','block','#e0663a','Playpen Sans Hebrew','Playpen Sans Hebrew','same'],['wine','בורדו','ink','#6b2d4f','Frank Ruhl Libre','Assistant','same'],
 ['sea','ים','soft','#1d6f8a','Rubik','Rubik','same'],['traditional','מסורתי','ink','#5a3e1b','David Libre','David Libre','same'],
 ['minimal','מינימליסטי','soft','#2b2b2b','Assistant','Assistant','full'],['hand','כתב יד','soft','#6b2d4f','Amatic SC','Assistant','same'],
 ['pink','ורוד עדין','soft','#b8487a','Secular One','Assistant','same'],['gold','זהב','ink','#9a7a2c','Bellefair','Assistant','same'],
 ['purple','סגול','block','#5b3f8c','Karantina','Heebo','same'],['torah','תורני','ink','#24427a','Noto Serif Hebrew','Frank Ruhl Libre','full'],
 ['photo','תמונה בעמוד נפרד','soft','#1e5a63','Heebo','Assistant','split'],['wall','לוח מלא בלי תמונות','block','#24427a','Rubik','Assistant','full']];
function spSync(){const box=$('#spCards');if(!box)return;const cur=state.s.preset;
  if(!box.children.length){box.innerHTML=SIMPLE_PRESETS.map(([k,n,th,ac,hf,bf,lay])=>{loadFont(hf);
    const cells=Array.from({length:14},(_,i)=>'<i'+(i===6||i===13?' class="sh"':'')+'></i>').join('');
    return '<button type="button" class="sp-card th-'+th+'" data-sp="'+k+'" role="radio" style="--a:'+ac+'"><span class="sp-prev">'+(lay==='full'?'':'<span class="sp-img"></span>')+'<b style="font-family:'+esc(fontCSS(hf))+'">תשרי</b><span class="sp-grid">'+cells+'</span></span><span class="sp-n">'+n+'</span></button>'}).join('')}
  box.querySelectorAll('[data-sp]').forEach(b=>{const on=b.dataset.sp===cur;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on))})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-sp]');if(!b)return;const P=SIMPLE_PRESETS.find(x=>x[0]===b.dataset.sp);if(!P)return;
  const s=state.s;Object.assign(s,{preset:P[0],theme:P[2],accent:P[3],headFont:P[4],bodyFont:P[5],layout:P[6],tcolors:{}});loadFont(P[4]);loadFont(P[5]);save();syncUI();render()});
const STEP_LIST=()=>CDMODE?[1,2,7,8]:SIMPLE?[1,2,5,7,8]:[1,2,3,4,5,6,7,8];
const stepInfo=n=>CDMODE?CD_STEPS[n]:SIMPLE?SIMPLE_STEPS[n]:STEPS[n-1];
function uiMode(){return state.s.uiMode||'wizard'}
function applyMode(){
  const s=state.s,mode=uiMode(),SL=STEP_LIST();let n=Math.min(8,Math.max(1,+s.step||1));if(SL.indexOf(n)<0)n=SL.find(x=>x>=n)||SL[SL.length-1];const pos=SL.indexOf(n)+1;
  document.body.classList.toggle('mode-wizard',mode==='wizard');
  document.body.classList.toggle('mode-adv',mode==='adv');
  document.body.classList.toggle('mode-home',mode==='home');
  document.body.classList.toggle('mode-welcome',mode==='welcome');
  $('#home').hidden=mode!=='home';$('#welcome').hidden=mode!=='welcome';
  $('#stepper').innerHTML=SL.map((k,i)=>'<button type="button" data-goto="'+k+'" class="'+(k===n?'cur':k<n?'done':'')+'"><b>'+(i+1)+'</b>'+stepInfo(k)[0]+'</button>').join('');
  document.querySelectorAll('.side>details.sec').forEach(d=>{const on=+d.dataset.step===n;d.classList.toggle('cur',on);if(on&&mode==='wizard')d.open=true});
  $('#stepNo').textContent='שלב '+pos+' מתוך '+SL.length;$('#stepTitle').textContent=stepInfo(n)[0];$('#stepDesc').textContent=stepInfo(n)[1];
  $('#stepCount').textContent=pos+' / '+SL.length;$('#stepPrev').disabled=pos===1;
  $('#stepNext').textContent=n===8?'סיום':'הבא';
  {const on=(mode==='wizard'&&n===7)||(mode==='adv'&&!!s.fxOn);if(document.body.classList.contains('fx-on')!==on){document.body.classList.toggle('fx-on',on);try{fxDecorate();fxBoxDecorate()}catch(e){}}const c=$('#fxAdv');if(c)c.checked=!!s.fxOn}
  $('#modeBtn').textContent=mode==='adv'?'מצב שלב אחר שלב':mode==='home'?'עריכה':'כל ההגדרות בבת אחת';
  const yr=s.calType==='heb'?'שנת '+hebYearStr(+s.hebYear):'שנת '+s.gregYear;
  $('#homeTitle').textContent=CDMODE?'לוח הספירה שלך'+(s.cdTitle?': '+s.cdTitle:''):'הלוח שלך ל'+yr;
  $('#homeSub').textContent=framed?'להדפסה: הורידו את הקובץ ופתחו אותו בדפדפן.':'אפשר להדפיס, לערוך, או ליצור את אותו לוח לשנה הבאה.';
  const nx=s.calType==='heb'?hebYearStr(+s.hebYear+1):(+s.gregYear+1);
  $('#homeNext').textContent='לוח חדש לשנה הבאה ('+nx+')';
  $('#finishPrintHint').textContent=framed?'כדי להדפיס, הורידו את הקובץ ופתחו אותו בדפדפן במחשב.':'לחצו "הדפסה". בחלון ההדפסה אפשר גם לבחור "שמירה כ־PDF".';
  $('#textScale2').value=s.textScale;$('#textScaleVal2').textContent=s.textScale+'%';
  document.querySelectorAll('#swatches2 .sw').forEach(b=>b.setAttribute('aria-pressed',b.dataset.acc===s.accent));
  setTimeout(fitSide,30);
  try{trayShow()}catch(e){}
}
/* הלוח שבצד גלול בפני עצמו: הגובה שלו הוא החלק הגלוי במסך, כך שאפשר לגלול אותו עד הסוף בלי לגלול קודם את התצוגה */
function fitSide(){const sd=document.querySelector('.side');if(!sd)return;if(innerWidth<901){sd.style.maxHeight='';return}const t=Math.max(0,sd.getBoundingClientRect().top),th=document.body.classList.contains('tray-on')?(parseFloat(getComputedStyle(document.body).getPropertyValue('--trayh'))||0):0;sd.style.maxHeight=Math.max(240,innerHeight-t-th)+'px'}
let fitSideRaf=0;window.addEventListener('scroll',()=>{if(!fitSideRaf)fitSideRaf=requestAnimationFrame(()=>{fitSideRaf=0;fitSide()})},{passive:true});window.addEventListener('resize',fitSide);setTimeout(fitSide,300);
function goMode(m,step){const s=state.s;s.uiMode=m;if(step)s.step=step;save();applyMode();window.scrollTo({top:0,behavior:'smooth'});setTimeout(fit,50)}
function goStep(n){state.s.step=Math.min(8,Math.max(1,n));state.s.uiMode='wizard';save();applyMode();const sd=$('.side');if(sd)sd.scrollTop=0;window.scrollTo({top:0,behavior:'smooth'})}
$('#stepper').addEventListener('click',e=>{const b=e.target.closest('[data-goto]');if(b)goStep(+b.dataset.goto)});
const stepMove=d=>{const SL=STEP_LIST(),n=+state.s.step||1;let i=SL.indexOf(n);if(i<0)i=0;const j=Math.min(SL.length-1,Math.max(0,i+d));return SL[j]};
$('#stepPrev').onclick=()=>goStep(stepMove(-1));
$('#stepNext').onclick=()=>{const n=+state.s.step||1;if(n>=8)$('#finishBtn').click();else goStep(stepMove(1))};
$('#modeBtn').onclick=()=>{const m=uiMode();goMode(m==='wizard'?'adv':'wizard')};
$('#startBtn').onclick=()=>goMode('wizard',1);
$('#welcomeAdv').onclick=()=>goMode('adv');
$('#welcomeRestore').onclick=()=>{goMode('adv');const d=$('#importBtn').closest('details');if(d)d.open=true;$('#importBtn').click()};
$('#finishBtn').onclick=()=>{state.s.wizardDone=true;goMode('home')};
$('#homeEdit').onclick=()=>goMode('wizard',1);
$('#homeAdv').onclick=()=>goMode('adv');
$('#homeNext').onclick=()=>{const s=state.s;if(s.calType==='heb')s.hebYear=+s.hebYear+1;else s.gregYear=+s.gregYear+1;s.rangeFrom='';s.rangeTo='';save();syncUI();render();window.scrollTo({top:0,behavior:'smooth'})};
$('#bulkBtn2').onclick=openImageOrganizer;
$('#swatches2').innerHTML=ACCENTS.map(a=>'<button type="button" class="sw" style="background:'+a+'" data-acc="'+a+'" aria-label="צבע '+a+'"></button>').join('');
$('#swatches2').addEventListener('click',e=>{const b=e.target.closest('.sw');if(b)set('accent',b.dataset.acc)});
$('#textScale2').addEventListener('input',e=>{state.s.textScale=+e.target.value;$('#textScaleVal2').textContent=e.target.value+'%';$('#textScale').value=e.target.value;$('#textScaleVal').textContent=e.target.value+'%';save();rerender()});
if(!framed){$('#printBtn2').hidden=false;$('#homePrint').hidden=false}
$('#printBtn2').onclick=$('#homePrint').onclick=()=>doPrint();
/* ---------- ימים צבועים ---------- */
const HL_COLORS=['#f6d365','#9bd3ae','#a7c7e7','#f4a6a6','#c9b6e4','#ffcf99','#b5e2e0','#e6c9a8','#d4e157','#f8bbd0'];
let PAINT=null;
function hlLists(){const s=state.s;if(!Array.isArray(s.hl))s.hl=[];return s.hl}
function hlKey(l,isoD){
  if(l.repeat==='greg')return 'g:'+isoD.slice(5);
  if(l.repeat==='heb'){const [y,m,d]=isoD.split('-').map(Number),hd=new HDate(new Date(y,m-1,d,12));return 'h:'+hd.getMonth()+'-'+hd.getDate()}
  return isoD;
}
function hlFor(isoD){return hlLists().filter(l=>l.show!==false&&l.days&&l.days[hlKey(l,isoD)])}
function hlSetRepeat(l,mode){
  const old=l.days||{},nd={};
  for(const k in old){
    let iso=k;
    if(!/^\d{4}-/.test(k)){/* מפתח חוזר: ממירים לתאריך בשנה הנוכחית של הלוח */
      const ms=monthsCache||[];let found=null;
      for(const mo of ms){for(const d of mo.days){const x=iso8(d);if(hlKey({repeat:k[0]==='g'?'greg':'heb'},x)===k){found=x;break}}if(found)break}
      if(!found)continue;iso=found;
    }
    nd[hlKey({repeat:mode},iso)]=1;
  }
  l.repeat=mode;l.days=nd;
}
function iso8(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function hlPaintCell(c){
  const ls=hlFor(c.dataset.date);c.classList.toggle('hl',ls.length>0);
  if(!ls.length){c.style.removeProperty('--hl');c.style.removeProperty('--hl2');return}
  c.style.setProperty('--hl',ls[0].color);c.style.setProperty('--hl2',(ls[1]||ls[0]).color);c.classList.toggle('hl2',ls.length>1);
  c.title=ls.map(l=>l.name).join(' · ');
}
function hlApply(){
  stage.querySelectorAll('[data-date]').forEach(hlPaintCell);
  stage.querySelectorAll('.hl-legend').forEach(n=>n.remove());
  if(state.s.hlLegend)stage.querySelectorAll('.page').forEach(p=>{
    const used=new Map();p.querySelectorAll('[data-date]').forEach(c=>hlFor(c.dataset.date).forEach(l=>used.set(l.id,l)));
    if(!used.size)return;const g=el('div','hl-legend');
    used.forEach(l=>g.insertAdjacentHTML('beforeend','<span><i style="background:'+esc(l.color)+'"></i>'+esc(l.name)+'</span>'));
    const foot=p.querySelector('.pg-foot');if(foot)foot.before(g);else p.appendChild(g);
  });
  stage.classList.toggle('painting',!!PAINT);
}
function hlToggle(isoD){
  const l=hlLists().find(x=>x.id===PAINT);if(!l)return;l.days=l.days||{};
  const k=hlKey(l,isoD);if(l.days[k])delete l.days[k];else l.days[k]=1;
  save();stage.querySelectorAll('[data-date="'+isoD+'"]').forEach(hlPaintCell);renderHl(true);
  if(state.s.hlLegend)hlApply();
}
function hlPaintBar(){
  let b=$('#hlBar');const l=hlLists().find(x=>x.id===PAINT);
  if(!l){if(b)b.remove();stage.classList.remove('painting');return}
  if(!b){b=el('div','hl-bar no-print');b.id='hlBar';document.body.appendChild(b)}
  b.innerHTML='<i style="background:'+esc(l.color)+'"></i><span>צובעים: <b>'+esc(l.name)+'</b>. לוחצים על ימים בלוח.</span><button class="btn primary small" type="button" id="hlDone">סיום</button>';
  b.querySelector('#hlDone').onclick=()=>{PAINT=null;hlPaintBar();renderHl()};
  stage.classList.add('painting');
}
function renderHl(light){
  const L=hlLists(),box=$('#hlLists');if(!box)return;
  $('#hlCount').textContent=L.length?L.length+'/10':'';$('#hlAdd').disabled=L.length>=10;
  if(light){L.forEach(l=>{const n=box.querySelector('[data-hlc="'+l.id+'"]');if(n)n.textContent=Object.keys(l.days||{}).length+' ימים'});return}
  box.innerHTML=L.length?L.map(l=>'<div class="hl-row'+(PAINT===l.id?' on':'')+'" data-hl="'+l.id+'"><input type="color" value="'+esc(l.color)+'" data-hlf="color" aria-label="צבע"><input type="text" value="'+esc(l.name)+'" data-hlf="name" aria-label="שם הרשימה"><small data-hlc="'+l.id+'">'+Object.keys(l.days||{}).length+' ימים</small><button class="btn small'+(PAINT===l.id?' primary':'')+'" type="button" data-hla="paint">'+(PAINT===l.id?'סיום':'לצבוע ימים')+'</button><button class="btn small" type="button" data-hla="vis" title="להציג או להסתיר בלוח">'+(l.show===false?'מוסתר':'מוצג')+'</button><select data-hlf="repeat" class="hl-rep" aria-label="חזרה בשנה הבאה">'+[['none','רק השנה'],['heb','כל שנה לפי התאריך העברי'],['greg','כל שנה לפי התאריך הלועזי']].map(o=>'<option value="'+o[0]+'"'+((l.repeat||'none')===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select><button class="x" type="button" data-hla="del" aria-label="מחיקת הרשימה">×</button></div>').join(''):'<p class="hint">עדיין אין רשימות.</p>';
}
$('#hlAdd').onclick=()=>{const L=hlLists();if(L.length>=10)return;const id='h'+uid();L.push({id,name:'רשימה '+(L.length+1),color:HL_COLORS[L.length%10],days:{},show:true});PAINT=id;save();renderHl();hlPaintBar();hlApply()};
$('#hlLists').addEventListener('input',e=>{const r=e.target.closest('[data-hl]'),f=e.target.dataset.hlf;if(!r||!f||f==='repeat')return;const l=hlLists().find(x=>x.id===r.dataset.hl);if(!l)return;l[f]=e.target.value;save();if(f==='color'){hlApply();hlPaintBar()}else if(PAINT===l.id)hlPaintBar()});
$('#hlLists').addEventListener('change',e=>{const f=e.target.dataset.hlf;if(!f)return;e.stopPropagation();if(f==='repeat'){const r=e.target.closest('[data-hl]'),l=hlLists().find(x=>x.id===r.dataset.hl);if(l){hlSetRepeat(l,e.target.value);save();renderHl();hlApply()}}else if(state.s.hlLegend)hlApply()},true);
$('#hlLists').addEventListener('click',e=>{const b=e.target.closest('[data-hla]'),r=e.target.closest('[data-hl]');if(!b||!r)return;const L=hlLists(),l=L.find(x=>x.id===r.dataset.hl);if(!l)return;
  const a=b.dataset.hla;
  if(a==='paint'){PAINT=PAINT===l.id?null:l.id;hlPaintBar()}
  else if(a==='vis'){l.show=l.show===false;save();hlApply()}
  else if(a==='del'){if(b.dataset.sure){state.s.hl=L.filter(x=>x!==l);if(PAINT===l.id){PAINT=null;hlPaintBar()}save();hlApply()}else{b.dataset.sure='1';b.textContent='למחוק?';b.classList.add('danger');return}}
  renderHl()});
renderHl();
/* ---------- מסלולים: עמוד נעול, שדרוג, הורדות ---------- */
const LOCK_SVG='<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 0 1 6 0v3H9Z"/></svg>';
function lockedPage(months){
  const c=monthCut(months),rest=months.filter(m=>m.days[0]>=c);
  const p=pageShell('עוד '+rest.length+' חודשים','locked');p.classList.add('locked-page');
  p.innerHTML='<div class="lock-inner"><div class="lock-ic">'+LOCK_SVG+'</div><h2>עוד '+rest.length+' חודשים מחכים לכם</h2><p>'+rest.map(m=>esc(m.title)).join(' · ')+'</p>'+(PLAN().needLogin?'<p class="lock-sub">כדי לראות את כל השנה, נכנסים או נרשמים, בחינם. כל מה שבניתם נשמר.</p><button class="btn primary no-print" type="button" data-login="months">כניסה או הרשמה חינם</button>':'<p class="lock-sub">במסלול הניסיון רואים את 8 החודשים הראשונים. כל מה שבניתם נשמר, ונפתח מיד עם בחירת מסלול.</p><button class="btn primary no-print" type="button" data-upgrade="months">לפתוח את כל השנה</button>')+'</div>';
}
function planCards(highlight){
  const cur=PLAN();
  return '<div class="plan-cards">'+LP.PLANS.filter(p=>p.id!=='free').map(p=>'<div class="plan-card'+(p.id===highlight?' hl':'')+(p.id===cur.id?' cur':'')+'"><div class="pc-name">'+esc(p.name)+'</div><div class="pc-price">'+(LP.off(p)?'<s>'+LP.price(p,'ils')+'</s> '+LP.introPrice(p,'ils')+'<small> · '+LP.introPrice(p,'usd')+'</small><div class="intro-tag">'+esc(LP.off(p).label)+'</div>':LP.price(p,'ils')+'<small> · '+LP.price(p,'usd')+'</small>')+'</div><ul>'+p.bullets.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul>'+(p.id===cur.id?'<div class="pc-cur">המסלול שלכם</div>':'<button class="btn'+(p.id===highlight?' primary':'')+'" type="button" data-pick="'+p.id+'">בחירה</button>')+'</div>').join('')+'</div>';
}
function openUpgrade(reason){
  if(!LP)return;
  const need=LP.cheapestWith(reason),what=LP.FEATURE_NAMES[reason]||'';
  const title=reason==='download'?'הורדה והדפסה של הלוח':reason==='months'?'פתיחת כל חודשי השנה':reason?what:'המסלולים של MyLuach';
  const sub=reason==='events'?'במסלול שלכם אפשר עד '+PLAN().events+' אירועים משפחתיים.':reason&&reason!=='months'&&reason!=='download'?'האפשרות הזאת כלולה במסלול '+need.name+' ומעלה.':'בוחרים מסלול, וכל מה שבניתם נשאר בדיוק כמו שהוא.';
  const m=modal('<h3>'+esc(title)+'</h3><p class="hint">'+esc(sub)+'</p>'+(PLAN().id==='free'?'<div class="sample-offer"><div><b>רוצים לראות קודם איך זה יוצא?</b><span>חודש אחד מלא להורדה בחינם.</span></div><button class="btn" type="button" data-sample>חודש לדוגמה בחינם</button></div>':'')+planCards(need.id)+'<p class="hint plan-note">כל מסלול הוא לשנה אחת, ללוח של אותה שנה. בשלב הזה התשלום עוד לא מחובר: הבחירה רק מחליפה את המסלול כדי לבדוק את האתר.</p><div class="row"><button class="btn" type="button" data-close>סגירה</button></div>');
  m.querySelector('.modal').classList.add('upgrade');
  m.addEventListener('click',e=>{if(e.target.closest('[data-sample]')){m.remove();openSample();return}const b=e.target.closest('[data-pick]');if(!b)return;m.remove();buyPlan(b.dataset.pick)});
}
/* ---------- תשלום: הזמנה בשרת, עמוד תשלום של נדרים פלוס בלשונית חדשה, ובדיקה חוזרת עד שהתשלום מאושר ---------- */
const ORDER_KEY='myluach-order';
function buyPlan(planId){
  const p=LP.byId(planId);if(!p||p.id==='free')return;
  const price=LP.introPrice(p,'ils')||LP.price(p,'ils');
  let saved={};try{saved=JSON.parse(localStorage.getItem('myluach-buyer')||'{}')}catch(e){}
  const m=modal('<h3>תשלום · מסלול '+esc(p.name)+'</h3><p class="hint">'+esc(price)+' ללוח שנתי. התשלום מאובטח ומתבצע דרך נדרים פלוס.</p>'+
    '<div class="pay-who"><label>שם מלא<input type="text" id="payName" autocomplete="name" value="'+esc(saved.name||'')+'"></label><label>מייל (לקבלה ולשחזור הלוח)<input type="email" id="payMail" autocomplete="email" dir="ltr" value="'+esc(saved.mail||'')+'"></label><label>טלפון<input type="tel" id="payPhone" autocomplete="tel" dir="ltr" value="'+esc(saved.phone||'')+'"></label><label>תעודת זהות של בעל הכרטיס <small>(לכרטיס ישראלי)</small><input type="text" id="payZeout" inputmode="numeric" dir="ltr" maxlength="9" autocomplete="off"></label><label class="pay-coupon">קוד קופון<span><input type="text" id="payCoupon" dir="ltr" autocomplete="off" spellcheck="false"><button class="btn" type="button" id="payCouponGo">החלה</button></span><small id="payCouponMsg"></small></label></div>'+
    '<p class="hint" id="payMsg">טוען טופס תשלום מאובטח…</p><iframe class="pay-frame" id="payFrame" title="טופס תשלום מאובטח" data-src="https://www.matara.pro/nedarimplus/iframe?language=he" hidden></iframe><div id="ppBox" class="pp-box" hidden></div>'+
    '<div class="row"><button class="btn primary" type="button" id="payGo" disabled>לתשלום '+esc(price)+'</button><button class="btn" type="button" id="payCancel">ביטול</button></div>');
  m.querySelector('.modal').classList.add('pay-modal');
  const $m=q=>m.querySelector(q),frame=$m('#payFrame'),go=$m('#payGo');
  const msg=(h,bad)=>{const x=$m('#payMsg');if(x){x.innerHTML=h;x.classList.toggle('msg-bad',!!bad)}};
  let order=null,stop=false,ready=false,PROV='',provName='נדרים פלוס';
  const post=d=>frame.contentWindow&&frame.contentWindow.postMessage(d,'*');
  const onMsg=e=>{if(!/^https:\/\/(www\.)?matara\.pro$/.test(e.origin))return;const d=e.data;if(!d||!d.Name)return;
    if(d.Name==='Height'){ready=true;frame.style.height=Math.max(430,parseInt(d.Value,10)+30)+'px';go.disabled=!order;msg('ממלאים את פרטי הכרטיס ולוחצים על כפתור התשלום.')}
    else if(d.Name==='TransactionResponse'){const v=d.Value||{};
      if(v.Status==='Error'){go.disabled=false;go.textContent='לתשלום '+(order?order.amount+' ₪':price);const em=String(v.Message||'');msg(/zeout/i.test(em)?'לכרטיס הזה נדרש מספר תעודת זהות של בעל הכרטיס. מי שאין לו תעודת זהות ישראלית יכול לפנות אלינו דרך <a href="terms.html#contact" target="_blank">יצירת קשר</a>.':esc(em||'התשלום לא עבר. בדקו את הפרטים ונסו שוב.'),1);if(/zeout/i.test(em))$m('#payZeout').focus()}
      else{go.remove();frame.style.display='none';msg('התשלום התקבל. מאשרים מול השרת…');waitPaid()}}};
  window.addEventListener('message',onMsg);
  const close=()=>{stop=true;window.removeEventListener('message',onMsg);m.remove()};
  $m('#payCancel').onclick=close;
  frame.addEventListener('load',()=>post({Name:'GetHeight'}));
  /* ההזמנה נוצרת מיד, כדי להציג את הסכום שהשרת באמת יחייב (במצב בדיקה: הסכום של הבדיקה) */
  const setAmt=(a,j)=>{j=j||{};const t=a+' ₪';go.textContent='לתשלום '+t;const h=m.querySelector('.hint');if(!h)return;
    const exp=j.base!=null?Math.round(j.base*(100-(j.off||0)))/100:parseFloat(price),test=Math.abs(Number(a)-exp)>0.001;
    h.innerHTML='<b>סכום החיוב: '+esc(t)+'</b>'+(j.off&&!test?' <span class="msg-ok">(במקום '+esc(j.base+' ₪')+', '+j.off+'% הנחה)</span>':'')+(test?' <span class="msg-bad">(מצב בדיקה: המחיר הרגיל הוא '+esc(exp+' ₪')+')</span>':' ללוח שנתי')+(j.why==='renew'?' <span class="msg-ok">הנחת לקוח חוזר</span>':'')+'. התשלום מאובטח ומתבצע דרך '+provName+'.'};
  /* קופון או הנחה של 100%: המסלול נפתח בלי תשלום */
  const freeDone=j=>{close();activatePlan(j.plan,j.id);try{localStorage.setItem(ORDER_KEY,JSON.stringify({id:j.id,plan:j.plan,at:Date.now()}))}catch(e){}
    modal('<h3>המסלול '+esc(LP.byId(j.plan).name)+' פעיל</h3><p class="hint">הקוד הופעל והמסלול נפתח בחינם. אפשר להוריד ולהדפיס את הלוח. מספר הזמנה: '+esc(j.id.slice(0,8))+'</p><div class="row"><button class="btn primary" type="button" data-close>מעולה</button></div>')};
  const mkOrder=coupon=>authHeaders().then(h=>fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify({plan:p.id,coupon:coupon||''})}))
    .then(r=>r.json().catch(()=>({})).then(j=>{if(j.error==='coupon')throw Object.assign(new Error('coupon'),{msg:j.message});if(!r.ok||!(j.tx||j.ppid||j.free))throw Object.assign(new Error(j.error||r.status),{msg:j.message});return j}))
    .then(j=>{if(j.free){freeDone(j);return j}order=j;if(!PROV)setupProv(j.provider);setAmt(j.amount,j);try{localStorage.setItem(ORDER_KEY,JSON.stringify({id:j.id,plan:p.id,at:Date.now()}))}catch(e){}return j});
  let orderP=mkOrder();
  $m('#payCouponGo').onclick=()=>{const code=$m('#payCoupon').value.trim(),cm=$m('#payCouponMsg');if(!code){cm.textContent='';return}
    cm.textContent='בודקים…';cm.className='';
    const np=mkOrder(code);np.then(j=>{orderP=np;cm.textContent=j.why==='coupon'?'הקוד הופעל: '+j.off+'% הנחה':'הקוד תקין, אבל ההנחה הקיימת גדולה ממנו';cm.className='msg-ok'})
      .catch(e=>{cm.textContent=e.msg||'לא הצלחנו לבדוק את הקוד, נסו שוב';cm.className='msg-bad'})};
  $m('#payCoupon').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$m('#payCouponGo').click()}};
  orderP.then(()=>{if(ready)go.disabled=false}).catch(e=>{go.disabled=true;msg(e.msg?esc(e.msg):'התשלום באתר עדיין לא פעיל. נסו שוב בקרוב, או פנו אלינו דרך <a href="terms.html#contact" target="_blank">יצירת קשר</a>.',1)});
  /* אמצעי התשלום נקבע בשרת: נדרים פלוס (טופס מוטמע) או פייפל (כפתורים של פייפל) */
  function setupProv(pv){PROV=pv||'nedarim';
    if(PROV==='nedarim'){frame.hidden=false;frame.src=frame.dataset.src;return}
    provName='PayPal';ready=true;go.hidden=true;m.querySelectorAll('.pay-who').forEach(x=>x.hidden=true);const box=$m('#ppBox');box.hidden=false;msg('בוחרים איך לשלם: חשבון פייפל או כרטיס אשראי.');
    const run=cid=>{const done=()=>{if(stop)return;window.paypal.Buttons({style:{layout:'vertical',label:'pay',shape:'rect'},
        createOrder:()=>orderP.then(o=>o.ppid),
        onApprove:()=>{msg('מאשרים את התשלום…');return orderP.then(o=>fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ppcapture',id:o.id})}).then(r=>r.json().then(x=>({r,x})))).then(({r,x})=>{
          if(x.status==='paid'){close();activatePlan(x.plan,order.id);modal('<h3>תודה! המסלול '+esc(LP.byId(x.plan).name)+' פעיל</h3><p class="hint">אפשר להוריד ולהדפיס את הלוח. אישור נשלח גם למייל. מספר הזמנה: '+order.id.slice(0,8)+'</p><div class="row"><button class="btn primary" type="button" data-close>מעולה</button></div>');return}
          msg(esc(x.message||'התשלום לא הושלם. אפשר לנסות שוב.'),1)}).catch(()=>msg('לא הצלחנו לאשר את התשלום. אם חויבתם, פנו אלינו עם מספר ההזמנה '+(order?order.id.slice(0,8):''),1))},
        onError:()=>msg('תקלה בחלון של פייפל. נסו שוב.',1)}).render(box)};
      if(window.paypal)return done();const sc=document.createElement('script');sc.src='https://www.paypal.com/sdk/js?client-id='+encodeURIComponent(cid)+'&currency=ILS&intent=capture&locale=he_IL&components=buttons';sc.onload=done;sc.onerror=()=>msg('לא הצלחנו לטעון את פייפל. נסו לרענן את הדף.',1);document.head.appendChild(sc)};
    Promise.resolve(LP&&LP.ready).then(d=>{if(d&&d.ppc)run(d.ppc);else msg('התשלום בפייפל עדיין לא מוגדר.',1)})}
  setTimeout(()=>{if(!ready&&!stop&&PROV==='nedarim')msg('טופס התשלום לא נטען. נסו לרענן את הדף, ואם זה חוזר פנו אלינו דרך <a href="terms.html#contact" target="_blank">יצירת קשר</a>.',1)},12000);
  go.onclick=()=>{
    const name=$m('#payName').value.trim(),mail=$m('#payMail').value.trim(),phone=$m('#payPhone').value.trim(),zeout=$m('#payZeout').value.replace(/\D/g,'');
    if(name.split(/\s+/).length<2){msg('נא למלא שם פרטי ושם משפחה.',1);$m('#payName').focus();return}
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){msg('נא למלא כתובת מייל תקינה.',1);$m('#payMail').focus();return}
    if(zeout&&!tzOk(zeout)){msg('מספר תעודת הזהות לא תקין. בדקו את הספרות, או השאירו ריק אם הכרטיס אינו ישראלי.',1);$m('#payZeout').focus();return}
    try{localStorage.setItem('myluach-buyer',JSON.stringify({name,mail,phone}))}catch(e){}
    go.disabled=true;go.textContent='מעבד תשלום…';msg('מעבד תשלום…');
    const send=o=>post({Name:'FinishTransaction2',Value:{...o.tx,Zeout:zeout,FirstName:name,LastName:'',Phone:phone,Mail:mail}});
    orderP.then(o=>{if(!ready){go.disabled=false;go.textContent='לתשלום '+o.amount+' ₪';msg('טופס התשלום עדיין נטען, נסו שוב בעוד רגע.',1);return}send(o)}).catch(()=>{});
  };
  function waitPaid(){const t0=Date.now();
    (function poll(){if(stop||!order)return;
      fetch('/api/order?id='+order.id).then(r=>r.json()).then(o=>{
        if(o.status==='paid'){close();activatePlan(o.plan,order.id);modal('<h3>תודה! המסלול '+esc(LP.byId(o.plan).name)+' פעיל</h3><p class="hint">אפשר להוריד ולהדפיס את הלוח. מספר הזמנה: '+order.id.slice(0,8)+'</p><div class="row"><button class="btn primary" type="button" data-close>מעולה</button></div>');return}
        if(Date.now()-t0>90000){msg('התשלום התקבל, אבל האישור מהשרת מתעכב. המסלול ייפתח לבד בכניסה הבאה. אם לא, פנו אלינו עם מספר ההזמנה '+order.id.slice(0,8)+'.');setTimeout(poll,15000);return}
        setTimeout(poll,2500)}).catch(()=>setTimeout(poll,5000))})();
  }
}

/* ---------- חשבון: כניסה עם קישור במייל, הלוחות נשמרים בחשבון, המסלול לפי הרכישות ---------- */
const CFG=window.MYLUACH_CFG||{};
let sb=null,user=null,cloudT=null,cloudBusy=false,cloudDirty=false,acctInfo=null;
const cloudPath=id=>user.id+'/'+id+'.json',INDEX=()=>user.id+'/index.json';
function authHeaders(){if(!sb)return Promise.resolve({});return sb.auth.getSession().then(r=>{const t=r.data&&r.data.session&&r.data.session.access_token;return t?{Authorization:'Bearer '+t}:{}}).catch(()=>({}))}
function calTitle(){const s=state.s;if(!s.calName&&s.view==='countdown')return 'ספירה לאחור'+(s.cdTitle?': '+s.cdTitle:'');return s.calName||((s.calType==='greg'?'לוח '+(s.gregYear||''):'לוח '+(s.hebYear?gemYear(s.hebYear):''))).trim()}
function gemYear(y){try{return new HDate(1,7,y).renderGematriya().split(' ').pop()}catch(e){return String(y)}}
async function readIndex(){try{const {data}=await sb.storage.from('calendars').download(INDEX());return data?JSON.parse(await data.text()):{}}catch(e){return {}}}
async function writeIndex(ix){await sb.storage.from('calendars').upload(INDEX(),new Blob([JSON.stringify(ix)],{type:'application/json'}),{upsert:true,contentType:'application/json'})}
/* ---------- שמירה ב-R2 (כשהוגדר בשרת): הלוח כקובץ קטן, וכל תמונה כקובץ נפרד שנשמר פעם אחת ---------- */
let R2ON=null;const R2HAVE=new Set(),R2HASH=new Map();
async function r2Api(op,body){const h=await authHeaders();const r=await fetch('/api/user?fn=r2',{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify({op,...(body||{})})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error((j&&j.error)||('r2 '+r.status));return j}
/* "פעיל" נשמר לכל הביקור; "לא פעיל" נבדק שוב אחרי 2 דקות (למשל אחרי שהוגדרו המפתחות בשרת) */
let R2AT=0;async function r2On(){if(R2ON===true||(R2ON===false&&Date.now()-R2AT<120000))return R2ON;R2AT=Date.now();try{R2ON=!!(await r2Api('status')).on}catch(e){R2ON=false}return R2ON}
async function imgHash(s){let h=R2HASH.get(s);if(h)return h;const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));h=[...new Uint8Array(b)].slice(0,16).map(x=>x.toString(16).padStart(2,'0')).join('');R2HASH.set(s,h);return h}
/* עותק של הלוח שבו כל תמונה מוחלפת ב-"r2img:<hash>", ורשימת התמונות */
async function r2Pack(st){const imgs={};
  const walk=async v=>{if(typeof v==='string'){if(/^data:image\//.test(v)){const h=await imgHash(v);imgs[h]=v;return 'r2img:'+h}return v}
    if(Array.isArray(v)){const a=[];for(const x of v)a.push(await walk(x));return a}
    if(v&&typeof v==='object'){const o={};for(const k in v)o[k]=await walk(v[k]);return o}return v};
  const packed=await walk(JSON.parse(JSON.stringify(st)));return {body:JSON.stringify(packed),imgs}}
async function poolRun(items,n,fn){let i=0;await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(i<items.length){const j=i++;await fn(items[j],j)}}))}
const blobToData=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(b)});
async function r2Save(id){
  const {body,imgs}=await r2Pack(state);const all=Object.keys(imgs),ask=all.filter(h=>!R2HAVE.has(h));
  let sv=null;const put={};
  for(let i=0;i===0||i<ask.length;i+=300){const ch=ask.slice(i,i+300);sv=await r2Api('save',{id,imgs:ch});if(!sv.on)return null;Object.assign(put,sv.put||{});ch.filter(h=>!(sv.put||{})[h]).forEach(h=>R2HAVE.add(h))}
  await poolRun(Object.keys(put),4,async h=>{const blob=await (await fetch(imgs[h])).blob();const r=await fetch(put[h],{method:'PUT',headers:{'Content-Type':blob.type||'image/jpeg'},body:blob});if(!r.ok)throw new Error('img '+r.status);R2HAVE.add(h)});
  const r=await fetch(sv.cal,{method:'PUT',headers:{'Content-Type':'application/json'},body});if(!r.ok)throw new Error('cal '+r.status);
  const bytes=body.length+all.reduce((a,h)=>a+Math.round(imgs[h].length*.75),0);return {bytes,n:all.length}}
async function r2Load(id){
  const o=await r2Api('open',{id});const r=await fetch(o.cal);if(!r.ok)throw new Error('cal '+r.status);const raw=JSON.parse(await r.text());
  const need=new Set();const scan=v=>{if(typeof v==='string'){if(v.startsWith('r2img:'))need.add(v.slice(6))}else if(Array.isArray(v))v.forEach(scan);else if(v&&typeof v==='object')for(const k in v)scan(v[k])};scan(raw);
  const H=[...need],data={};
  for(let i=0;i<H.length;i+=300){const g=(await r2Api('imgs',{imgs:H.slice(i,i+300)})).get||{};
    await poolRun(Object.keys(g),6,async h=>{try{const x=await fetch(g[h]);if(x.ok){data[h]=await blobToData(await x.blob());R2HAVE.add(h)}}catch(e){}})}
  const fill=v=>{if(typeof v==='string')return v.startsWith('r2img:')?(data[v.slice(6)]||null):v;if(Array.isArray(v))return v.map(fill);if(v&&typeof v==='object'){const o={};for(const k in v)o[k]=fill(v[k]);return o}return v};
  Object.entries(data).forEach(([h,d])=>R2HASH.set(d,h));
  return fill(raw)}
function cloudQueue(){if(!user||SNAPVIEW)return;cloudDirty=true;clearTimeout(cloudT);cloudT=setTimeout(cloudSave,6000)}
async function cloudSave(){
  if(!user||cloudBusy)return;cloudBusy=true;cloudDirty=false;
  try{
    if(!state.s.cloudId){state.s.cloudId=(crypto.randomUUID?crypto.randomUUID():'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,8));await idbSet(SKEY,state)}
    const id=state.s.cloudId;let size,store=null;
    const r2=(await r2On())?await r2Save(id):null;
    if(r2){size=r2.bytes;store='r2'}
    else{const body=JSON.stringify(state);
      const {error}=await sb.storage.from('calendars').upload(cloudPath(id),new Blob([body],{type:'application/json'}),{upsert:true,contentType:'application/json'});
      if(error)throw error;size=body.length}
    const ix=await readIndex();const was=ix[id]&&ix[id].store;ix[id]={name:calTitle(),updated:new Date().toISOString(),size,...(store?{store}:{})};await writeIndex(ix);
    /* הלוח עבר ל-R2: מוחקים את העותק הישן ב-Supabase */
    if(store==='r2'&&was!=='r2')sb.storage.from('calendars').remove([cloudPath(id)]).catch(()=>{});
    if(ix.__feed&&ix.__feed.cal===id)feedSync(false).catch(()=>{});
    const el=$('#saveState');if(el){el.textContent='נשמר בחשבון ובדפדפן הזה';el.title=store==='r2'?'R2':'S'}
  }catch(e){console.warn('cloud save',e);const el=$('#saveState');if(el)el.textContent='נשמר בדפדפן הזה (השמירה בחשבון נכשלה, ננסה שוב)';cloudDirty=true}
  cloudBusy=false;if(cloudDirty){clearTimeout(cloudT);cloudT=setTimeout(cloudSave,15000)}
}

/* ---------- יומן אישי להרשמה: האירועים המשפחתיים של הלוח הפתוח, לשלוש שנים קדימה ---------- */
function feedIcs(){
  const d8=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  const escI=t=>String(t).replace(/[\\,;]/g,x=>'\\'+x).replace(/\n/g,'\\n');
  const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MyLuach//Personal//HE','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+escI('MyLuach · '+calTitle()),'X-PUBLISHED-TTL:PT12H','REFRESH-INTERVAL;VALUE=DURATION:PT12H'];
  const t0=new Date();t0.setHours(12,0,0,0);const from=new Date(t0.getFullYear(),t0.getMonth()-1,1,12);let n=0;
  for(let d=from,i=0;i<1150;i++,d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12)){
    const hd=new HDate(d),nx=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12);
    for(const e of eventsOn(d,hd)){const t=eventLabel(e,d,hd);if(!t)continue;n++;
      L.push('BEGIN:VEVENT','UID:'+d8(d)+'-'+e.id+'@myluach.org','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+d8(d),'DTEND;VALUE=DATE:'+d8(nx),'SUMMARY:'+escI(t),'DESCRIPTION:'+escI(hebShort(hd)+' '+hebYearStr(hd.getFullYear())),'TRANSP:TRANSPARENT','END:VEVENT')}}
  L.push('END:VCALENDAR');return {text:L.join('\r\n')+'\r\n',n};
}
async function feedSync(create){
  if(!user)return null;const ix=await readIndex();let f=ix.__feed;
  if(!f&&!create)return null;
  if(!f){const a=new Uint8Array(16);crypto.getRandomValues(a);f=ix.__feed={token:[...a].map(x=>x.toString(16).padStart(2,'0')).join(''),cal:state.s.cloudId||null};await writeIndex(ix)}
  if(f.cal&&state.s.cloudId&&f.cal!==state.s.cloudId&&!create)return f; /* היומן מחובר ללוח אחר */
  if(create&&state.s.cloudId&&f.cal!==state.s.cloudId){f.cal=state.s.cloudId;ix.__feed=f;await writeIndex(ix)}
  const {text,n}=feedIcs();
  await sb.storage.from('calendars').upload(user.id+'/feed-'+f.token+'.ics',new Blob([text],{type:'text/calendar'}),{upsert:true,contentType:'text/calendar'});
  f.n=n;return f;
}
async function feedModal(){
  const m=modal('<h3>הלוח שלי ביומן בטלפון</h3><p class="hint">ימי ההולדת, ימי השנה (יארצייט) והתזכורות מהלוח הזה יופיעו ביומן גוגל או באייפון, ויתעדכנו לבד כשתוסיפו אירועים כאן.</p><div id="fdBody"><p class="hint">מכינים…</p></div><div class="row"><button class="btn" type="button" data-close>סגירה</button></div>');
  try{if(!state.s.cloudId)await cloudSave();const f=await feedSync(true);
    const u='//'+window.location.host+'/api/ical?u='+user.id+'&t='+f.token,g='https://calendar.google.com/calendar/r?cid='+encodeURIComponent('webcal:'+u);
    m.querySelector('#fdBody').innerHTML='<p>'+(f.n?'ביומן יש '+f.n+' אירועים לשלוש השנים הקרובות.':'<span class="msg-bad">אין עדיין אירועים משפחתיים בלוח. הוסיפו ימי הולדת או ימי שנה, והם יופיעו ביומן.</span>')+'</p>'+
      '<div class="row"><a class="btn primary" href="'+g+'" target="_blank" rel="noopener">הוספה ליומן גוגל</a><a class="btn" href="webcal:'+u+'">אייפון / אאוטלוק</a><button class="btn" type="button" id="fdCopy">העתקת הקישור</button></div>'+
      '<p class="hint small">הקישור אישי: מי שיש לו אותו רואה את האירועים שלכם. יומן גוגל מתעדכן בדרך כלל פעם בכמה שעות.</p>';
    m.querySelector('#fdCopy').onclick=e=>{navigator.clipboard&&navigator.clipboard.writeText('https:'+u);e.target.textContent='הועתק'};
  }catch(err){m.querySelector('#fdBody').innerHTML='<p class="msg-bad">לא הצלחנו להכין את היומן. נסו שוב בעוד רגע.</p>'}
}
async function cloudOpen(id){
  const ix=await readIndex();let raw;
  if(ix[id]&&ix[id].store==='r2')raw=await r2Load(id);
  else{const {data,error}=await sb.storage.from('calendars').download(cloudPath(id));if(error||!data)throw error||new Error('no data');raw=JSON.parse(await data.text())}
  const loaded=merge(DEFAULT,raw);loaded.s.cloudId=id;
  const isCd=loaded.s.view==='countdown';
  if(isCd!==CDMODE){await idbSet(isCd?'state-cd':'state',loaded);window.location.href=isCd?PGN('countdown.html'):'app.html';return}
  state=loaded;monthsCache=buildMonths();await idbSet(SKEY,state);syncUI();applyMode();render();
}
async function cloudDelete(id){const ix0=await readIndex();if(ix0[id]&&ix0[id].store==='r2')await r2Api('del',{id}).catch(()=>{});await sb.storage.from('calendars').remove([cloudPath(id)]);const ix=await readIndex();delete ix[id];await writeIndex(ix);if(state.s.cloudId===id){delete state.s.cloudId;save()}}
async function refreshAccount(){
  let claim=[];try{const o=JSON.parse(localStorage.getItem(ORDER_KEY)||'null');if(o&&o.id)claim=[o.id]}catch(e){}
  try{const h=await authHeaders();const r=await fetch('/api/me',{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify({claim})});if(!r.ok)return;acctInfo=await r.json();
    const rank=id=>LP.PLANS.findIndex(p=>p.id===id);
    const sp=acctInfo.plan||'free',was=LP.current().id;
    if(sp!==was)LP.setCurrent(sp);
    if(acctInfo.dl&&acctInfo.dl.used!=null){try{localStorage.setItem('luchenu-downloads',String(acctInfo.dl.used))}catch(e){}}
    if(sp!==was||acctInfo.dl){syncPlanUI();render()}
  }catch(e){}
}
function acctBtn(){const b=$('#acctBtn');if(!b)return;const ic='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1c0-2.8-3.6-5-8-5Z"/></svg>';
  b.innerHTML=ic+'<span>'+(user?'החשבון שלי':'כניסה / הרשמה')+'</span>';b.title=user?user.email:'כניסה או הרשמה חינם';b.classList.toggle('in',!!user)}
function authErr(e){const m=String(e&&e.message||e||'');
  if(/invalid login/i.test(m))return 'המייל או הסיסמה שגויים. אם נרשמתם בעבר עם קישור במייל, לחצו "שכחתי סיסמה" כדי לקבוע סיסמה.';
  if(/already registered|already exists/i.test(m))return 'המייל הזה כבר רשום. נסו להיכנס, או לחצו "שכחתי סיסמה".';
  if(/not confirmed/i.test(m))return 'צריך לאשר קודם את המייל: לחצו על הקישור ששלחנו אליכם.';
  if(/at least|password should|weak/i.test(m))return 'הסיסמה צריכה להיות באורך 8 תווים לפחות.';
  if(/rate|limit|seconds/i.test(m))return 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.';
  return 'שגיאה: '+esc(m)}
function loginModal(note){
  const here=window.location.origin+window.location.pathname;
  const m=modal('<h3>כניסה ל־MyLuach</h3>'+(note?'<p class="hint">'+esc(note)+'</p>':'')+
    '<button class="btn google-btn" type="button" id="lgGoogle"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg><span>המשך עם Google</span></button><div class="or-sep"><span>או עם מייל</span></div>'+
    '<div class="seg lg-tabs" role="tablist"><button type="button" class="on" data-tab="pw">מייל וסיסמה</button><button type="button" data-tab="link">קישור כניסה במייל</button></div>'+
    '<label class="fld">מייל<input type="email" id="lgMail" autocomplete="email" dir="ltr"></label>'+
    '<div data-pane="pw"><label class="fld">סיסמה<input type="password" id="lgPass" autocomplete="current-password" dir="ltr" minlength="8"></label>'+
      '<div class="row"><button class="btn primary" type="button" id="lgIn">כניסה</button><button class="btn" type="button" id="lgUp">הרשמה</button><button class="btn link-btn" type="button" id="lgForgot">שכחתי סיסמה</button></div></div>'+
    '<div data-pane="link" hidden><p class="hint">בלי סיסמה: מקבלים קישור למייל ולוחצים עליו. אם אין לכם חשבון, הוא נפתח אוטומטית.</p><div class="row"><button class="btn primary" type="button" id="lgGo">שלחו לי קישור כניסה</button></div></div>'+
    '<p class="hint" id="lgMsg"></p><p class="hint small">הלוח שבניתם כאן יישמר בחשבון אחרי הכניסה, ותוכלו לפתוח אותו מכל מכשיר.</p>'+
    '<div class="row"><button class="btn" type="button" data-close>סגירה</button></div>');
  const $l=q=>m.querySelector(q),msg=(t,bad)=>{const x=$l('#lgMsg');x.innerHTML=t;x.className='hint'+(bad?' msg-bad':'')};
  try{const b=JSON.parse(localStorage.getItem('myluach-buyer')||'{}');if(b.mail)$l('#lgMail').value=b.mail}catch(e){}
  m.querySelectorAll('[data-tab]').forEach(t=>t.onclick=()=>{m.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('on',x===t));m.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==t.dataset.tab);msg('')});
  const mailOk=()=>{const v=$l('#lgMail').value.trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){msg('נא למלא כתובת מייל תקינה.',1);$l('#lgMail').focus();return null}if(!sb){msg('הכניסה לא זמינה כרגע. נסו לרענן את הדף.',1);return null}return v};
  const passOk=()=>{const v=$l('#lgPass').value;if(v.length<8){msg('הסיסמה צריכה להיות באורך 8 תווים לפחות.',1);$l('#lgPass').focus();return null}return v};
  const busy=(b,on)=>{b.disabled=on};
  $l('#lgIn').onclick=async()=>{const e=mailOk();if(!e)return;const pw=passOk();if(!pw)return;const b=$l('#lgIn');busy(b,1);msg('נכנסים…');
    const {error}=await sb.auth.signInWithPassword({email:e,password:pw});busy(b,0);if(error)return msg(authErr(error),1);m.remove()};
  $l('#lgUp').onclick=async()=>{const e=mailOk();if(!e)return;const pw=passOk();if(!pw)return;const b=$l('#lgUp');busy(b,1);msg('נרשמים…');
    const {data,error}=await sb.auth.signUp({email:e,password:pw,options:{emailRedirectTo:here}});busy(b,0);if(error)return msg(authErr(error),1);
    if(data&&data.session){m.remove();return}
    if(data&&data.user&&Array.isArray(data.user.identities)&&!data.user.identities.length)return msg('המייל הזה כבר רשום. נסו להיכנס, או לחצו "שכחתי סיסמה".',1);
    msg('<b>כמעט סיימנו!</b> שלחנו מייל לאישור. לחצו על הקישור שבו, ואתם בפנים. אם לא הגיע תוך דקה, בדקו בספאם.')};
  $l('#lgForgot').onclick=async()=>{const e=mailOk();if(!e)return;const b=$l('#lgForgot');busy(b,1);msg('שולחים…');
    const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:here});busy(b,0);if(error)return msg(authErr(error),1);
    msg('שלחנו מייל עם קישור לקביעת סיסמה חדשה. לחצו עליו, ותוכלו לבחור סיסמה.')};
  const send=()=>{const e=mailOk();if(!e)return;const go=$l('#lgGo');busy(go,1);msg('שולחים…');
    sb.auth.signInWithOtp({email:e,options:{emailRedirectTo:here}}).then(({error})=>{busy(go,0);
      if(error)return msg(authErr(error),1);
      msg('<b>נשלח!</b> פתחו את המייל מ־MyLuach ולחצו על הקישור. אם הוא לא מגיע תוך דקה, בדקו בתיקיית הספאם.');go.textContent='שליחה חוזרת'})};
  $l('#lgGo').onclick=send;
  $l('#lgGoogle').onclick=async()=>{if(!sb)return msg('הכניסה לא זמינה כרגע. נסו לרענן את הדף.',1);const b=$l('#lgGoogle');b.disabled=true;msg('עוברים לגוגל…');
    const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:here,queryParams:{prompt:'select_account'}}});
    if(error){b.disabled=false;msg(/not enabled|unsupported provider/i.test(error.message)?'הכניסה עם Google עדיין לא הופעלה באתר. אפשר בינתיים להיכנס עם מייל.':authErr(error),1)}};
  $l('#lgPass').onkeydown=e=>{if(e.key==='Enter')$l('#lgIn').click()};
  setTimeout(()=>$l('#lgMail').value?$l('#lgPass').focus():$l('#lgMail').focus(),50);
}
function newPasswordModal(){
  const m=modal('<h3>סיסמה חדשה</h3><p class="hint">בחרו סיסמה חדשה לחשבון (8 תווים לפחות).</p><label class="fld">סיסמה חדשה<input type="password" id="npPass" autocomplete="new-password" dir="ltr"></label><p class="hint" id="npMsg"></p><div class="row"><button class="btn primary" type="button" id="npGo">שמירה</button><button class="btn" type="button" data-close>אחר כך</button></div>');
  const go=m.querySelector('#npGo'),msg=(t,bad)=>{const x=m.querySelector('#npMsg');x.innerHTML=t;x.className='hint'+(bad?' msg-bad':'')};
  go.onclick=async()=>{const pw=m.querySelector('#npPass').value;if(pw.length<8)return msg('הסיסמה צריכה להיות באורך 8 תווים לפחות.',1);go.disabled=true;
    const {error}=await sb.auth.updateUser({password:pw});go.disabled=false;if(error)return msg(authErr(error),1);m.remove();modal('<h3>הסיסמה נשמרה</h3><p class="hint">מעכשיו אפשר להיכנס עם המייל והסיסמה.</p><div class="row"><button class="btn primary" type="button" data-close>מעולה</button></div>')};
  setTimeout(()=>m.querySelector('#npPass').focus(),50);
}
async function accountModal(){
  const m=modal('<h3>החשבון שלי</h3><p class="hint" dir="auto">'+esc(user.email)+'</p><div id="acBody"><p class="hint">טוען…</p></div><div class="row"><button class="btn" type="button" id="acOut">יציאה מהחשבון</button><button class="btn" type="button" data-close>סגירה</button></div>');
  m.querySelector('.modal').classList.add('acct-modal');
  m.querySelector('#acOut').onclick=async()=>{if(cloudDirty)await cloudSave();await sb.auth.signOut();m.remove()};
  const ix=await readIndex(),ids=Object.keys(ix).filter(k=>!k.startsWith('__')).sort((a,b)=>(ix[b].updated||'').localeCompare(ix[a].updated||''));
  const plan=acctInfo&&acctInfo.plan?LP.byId(acctInfo.plan).name:null;
  const body=m.querySelector('#acBody');if(!body)return;
  body.innerHTML='<p><b>מסלול:</b> '+(plan?esc(plan):'ניסיון (לא נמצאה רכישה בחשבון)')+'</p>'+
    '<h4 class="ac-h">הלוחות שלי</h4>'+(ids.length?'<ul class="ac-list">'+ids.map(id=>'<li'+(id===state.s.cloudId?' class="cur"':'')+'><span><b>'+esc(ix[id].name||'לוח')+'</b><small>'+(id===state.s.cloudId?'פתוח עכשיו · ':'')+'עודכן '+new Date(ix[id].updated).toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'})+'</small></span>'+(id===state.s.cloudId?'':'<button class="btn" type="button" data-open="'+id+'">פתיחה</button>')+'<button class="btn danger-ghost" type="button" data-delc="'+id+'">מחיקה</button></li>').join('')+'</ul>':'<p class="hint">עוד אין לוחות שמורים בחשבון.</p>')+
    '<div class="row"><button class="btn" type="button" id="acSaveNew">'+(state.s.cloudId&&ix[state.s.cloudId]?'לשמור עותק כלוח נפרד':'לשמור את הלוח הנוכחי בחשבון')+'</button><button class="btn" type="button" id="acNew">לוח חדש ריק</button></div>'+
    '<div class="row"><button class="btn" type="button" id="acFeed">📅 הלוח שלי ביומן גוגל / בטלפון</button></div>'+
    '<label class="fld">שם הלוח הנוכחי<input type="text" id="acName" maxlength="60" value="'+esc(state.s.calName||'')+'" placeholder="'+esc(calTitle())+'"></label>';
  body.querySelector('#acFeed').onclick=()=>{m.remove();feedModal()};
  body.querySelector('#acName').onchange=e=>{state.s.calName=e.target.value.trim();save()};
  body.querySelector('#acSaveNew').onclick=async()=>{if(state.s.cloudId&&ix[state.s.cloudId]){delete state.s.cloudId;state.s.calName=(state.s.calName||calTitle())+' (עותק)'}await cloudSave();m.remove();accountModal()};
  body.querySelector('#acNew').onclick=async()=>{if(cloudDirty)await cloudSave();state=structuredClone(DEFAULT);state.s.uiMode='wizard';if(SIMPLE){state.s.cover=false;state.s.pageBg='month'}if(CDMODE)Object.assign(state.s,{view:'countdown',layout:'full',theme:'block',accent:'#a3462b',size:'a4',zmanimMode:'none',cover:false});monthsCache=buildMonths();save();syncUI();applyMode();render();m.remove()};
  body.addEventListener('click',async e=>{
    const o=e.target.closest('[data-open]');if(o){o.disabled=true;o.textContent='פותח…';if(cloudDirty)await cloudSave();try{await cloudOpen(o.dataset.open);m.remove()}catch(err){o.textContent='שגיאה';}return}
    const d=e.target.closest('[data-delc]');if(d){if(!d.dataset.sure){d.dataset.sure=1;d.textContent='בטוח?';return}d.disabled=true;await cloudDelete(d.dataset.delc);m.remove();accountModal()}
  });
}
async function onSignedIn(first){
  if(SNAPVIEW)return;
  acctBtn();await refreshAccount();
  if(!first)return;
  const ix=await readIndex(),ids=Object.keys(ix).filter(k=>!k.startsWith('__'));
  if(state.s.cloudId&&ix[state.s.cloudId]){cloudQueue();return}
  if(!ids.length){cloudSave();return}
  /* יש לוחות בחשבון ולוח לא שמור בדפדפן: שואלים */
  const m=modal('<h3>ברוכים השבים!</h3><p class="hint">בחשבון שלכם יש '+ids.length+' לוחות שמורים. לפתוח אחד מהם, או לשמור בחשבון גם את הלוח שפתוח עכשיו?</p><div class="row"><button class="btn primary" type="button" id="wbList">ללוחות שלי</button><button class="btn" type="button" id="wbKeep">לשמור גם את הלוח הנוכחי</button></div>');
  m.querySelector('#wbList').onclick=()=>{m.remove();accountModal()};
  m.querySelector('#wbKeep').onclick=()=>{m.remove();cloudSave()};
}
function acctInit(){
  {const b=$('#acctBtn');if(b){b.hidden=false;b.onclick=()=>user?accountModal():(sb?loginModal():modal('<h3>הכניסה לא זמינה כרגע</h3><p class="hint">לא הצלחנו לטעון את מערכת הכניסה. בדקו את החיבור לאינטרנט ורעננו את הדף.</p><div class="row"><button class="btn" type="button" data-close>סגירה</button></div>'))}}
  acctBtn();
  if(!CFG.supabaseUrl)return;
  const start=()=>{
    if(!window.supabase)return false;
    AUTH.ready=true;
    try{sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{flowType:'implicit',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'myluach-auth'}})}catch(e){AUTH.ready=false;return false}
    syncPlanUI();render();
    let had=false;
    sb.auth.onAuthStateChange((ev,session)=>{
      if(ev==='PASSWORD_RECOVERY')setTimeout(newPasswordModal,300);
      const u=session&&session.user?{id:session.user.id,email:session.user.email}:null;
      const was=user;user=u;AUTH.user=u;acctBtn();if(!!was!==!!u){syncPlanUI();render()}
      if(u&&(!was||was.id!==u.id))setTimeout(shareCheck,1500);
      if(u&&(!was||was.id!==u.id))onSignedIn((ev==='SIGNED_IN'||ev==='PASSWORD_RECOVERY')&&!had);
      if(u){had=true;let bk=null;try{bk=sessionStorage.getItem('ml-back');if(bk)sessionStorage.removeItem('ml-back')}catch(e){}if(bk)setTimeout(()=>{window.location.href=bk},400)}
      if(!u&&was){cloudDirty=false;clearTimeout(cloudT)}
    });
    window.addEventListener('beforeunload',()=>{if(user&&cloudDirty)cloudSave()});
    setTimeout(()=>{if(!user)oneTap()},4000);
    if(/^#login\b/.test(window.location.hash)){const bm=/[&?]back=([^&]+)/.exec(window.location.hash);if(bm){const bk=decodeURIComponent(bm[1]);if(/^\/[^/]/.test(bk))try{sessionStorage.setItem('ml-back',bk)}catch(e){}}
      try{history.replaceState(null,'',window.location.pathname)}catch(e){}setTimeout(()=>{if(!user)loginModal()},600)}
    return true;
  };
  if(!start())loadScript('https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js').then(start).catch(()=>{});
}

/* ---------- גוגל: כניסה בלחיצה אחת (One Tap) ובחירת תמונות מ-Google Photos ---------- */
let gisP=null;
function loadGIS(){if(window.google&&google.accounts)return Promise.resolve();if(!gisP)gisP=loadScript('https://accounts.google.com/gsi/client').catch(e=>{gisP=null;throw e});return gisP}
async function sha256hex(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function oneTap(){
  if(!CFG.googleClientId||!sb||user)return;
  try{if(sessionStorage.getItem('myluach-onetap-off'))return}catch(e){}
  try{await loadGIS()}catch(e){return}
  const raw=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2))+Date.now(),hashed=await sha256hex(raw);
  google.accounts.id.initialize({client_id:CFG.googleClientId,nonce:hashed,auto_select:false,cancel_on_tap_outside:true,use_fedcm_for_prompt:true,context:'signin',itp_support:true,
    callback:async r=>{const {error}=await sb.auth.signInWithIdToken({provider:'google',token:r.credential,nonce:raw});if(error)console.warn('one tap',error.message)}});
  google.accounts.id.prompt(n=>{try{if(n&&n.isDismissedMoment&&n.isDismissedMoment())sessionStorage.setItem('myluach-onetap-off','1')}catch(e){}});
}
/* בחירת תמונות מ-Google Photos (Photos Picker API). מחזיר רשימת Blob של תמונות. */
async function pickGooglePhotos(onMsg){
  if(!CFG.googleClientId)throw new Error('לא הוגדר חיבור לגוגל');
  await loadGIS();
  const token=await new Promise((ok,no)=>{const tc=google.accounts.oauth2.initTokenClient({client_id:CFG.googleClientId,scope:'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
    callback:r=>r&&r.access_token?ok(r.access_token):no(new Error(r&&r.error||'no token')),error_callback:e=>no(new Error(e&&e.type||'popup'))});tc.requestAccessToken()});
  const H={Authorization:'Bearer '+token};
  const ses=await fetch('https://photospicker.googleapis.com/v1/sessions',{method:'POST',headers:{...H,'Content-Type':'application/json'},body:'{}'}).then(r=>{if(!r.ok)throw new Error('session '+r.status);return r.json()});
  const w=window.open(ses.pickerUri+'/autoclose','gphotos','width=1000,height=760');
  onMsg&&onMsg('בוחרים תמונות בחלון של Google Photos ולוחצים "סיום" (Done)…');
  const iv=Math.max(2000,parseFloat((ses.pollingConfig||{}).pollInterval||'3')*1000);const t0=Date.now();
  let done=false;
  while(!done){await new Promise(r=>setTimeout(r,iv));
    const st=await fetch('https://photospicker.googleapis.com/v1/sessions/'+ses.id,{headers:H}).then(r=>r.json());
    done=!!st.mediaItemsSet;if(!done&&Date.now()-t0>15*60000)throw new Error('timeout')}
  onMsg&&onMsg('מורידים את התמונות שבחרתם…');
  let items=[],page='';
  do{const r=await fetch('https://photospicker.googleapis.com/v1/mediaItems?sessionId='+ses.id+'&pageSize=100'+(page?'&pageToken='+page:''),{headers:H}).then(r=>r.json());items=items.concat(r.mediaItems||[]);page=r.nextPageToken||''}while(page);
  const blobs=[];
  for(const it of items){const f=it.mediaFile||{};if(it.type&&it.type!=='PHOTO')continue;if(!f.baseUrl)continue;
    try{const b=await fetch(f.baseUrl+'=w2400-h2400',{headers:H}).then(r=>{if(!r.ok)throw 0;return r.blob()});blobs.push(b);onMsg&&onMsg('הורדו '+blobs.length+' מתוך '+items.length+'…')}catch(e){}}
  fetch('https://photospicker.googleapis.com/v1/sessions/'+ses.id,{method:'DELETE',headers:H}).catch(()=>{});
  try{if(w&&!w.closed)w.close()}catch(e){}
  return blobs;
}

/* בחירת תמונות מגוגל דרייב (Google Picker). דורש googleApiKey ב-config.js. */
let gapiP=null;
function loadGapiPicker(){if(window.google&&google.picker)return Promise.resolve();if(!gapiP)gapiP=loadScript('https://apis.google.com/js/api.js').then(()=>new Promise(ok=>gapi.load('picker',ok))).catch(e=>{gapiP=null;throw e});return gapiP}
async function pickDrivePhotos(onMsg){
  if(!CFG.googleClientId||!CFG.googleApiKey)throw new Error('not configured');
  await loadGIS();await loadGapiPicker();
  const token=await new Promise((ok,no)=>{const tc=google.accounts.oauth2.initTokenClient({client_id:CFG.googleClientId,scope:'https://www.googleapis.com/auth/drive.file',
    callback:r=>r&&r.access_token?ok(r.access_token):no(new Error(r&&r.error||'no token')),error_callback:e=>no(new Error(e&&e.type||'popup'))});tc.requestAccessToken()});
  const docs=await new Promise(ok=>{const view=new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES).setIncludeFolders(true).setSelectFolderEnabled(false);
    new google.picker.PickerBuilder().addView(view).addView(new google.picker.DocsUploadView()).enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(token).setDeveloperKey(CFG.googleApiKey).setAppId(String(CFG.googleClientId).split('-')[0]).setLocale('iw').setTitle('בחירת תמונות ללוח')
      .setCallback(d=>{if(d.action===google.picker.Action.PICKED)ok(d.docs||[]);else if(d.action===google.picker.Action.CANCEL)ok([])}).build().setVisible(true)});
  const blobs=[];
  for(const doc of docs){try{const b=await fetch('https://www.googleapis.com/drive/v3/files/'+doc.id+'?alt=media',{headers:{Authorization:'Bearer '+token}}).then(r=>{if(!r.ok)throw 0;return r.blob()});blobs.push(b);onMsg&&onMsg('הורדו '+blobs.length+' מתוך '+docs.length+'…')}catch(e){}}
  return blobs;
}
/* בדיקת ספרת ביקורת של תעודת זהות ישראלית */
function tzOk(t){t=String(t).padStart(9,'0');if(!/^\d{9}$/.test(t))return false;let s=0;for(let i=0;i<9;i++){let d=+t[i]*(i%2+1);s+=d>9?d-9:d}return s%10===0}
function activatePlan(planId,orderId){LP.setCurrent(planId);try{localStorage.setItem(ORDER_KEY,JSON.stringify({id:orderId,plan:planId,paid:true,at:Date.now()}))}catch(e){}syncPlanUI();render()}
/* מי שסגר את הדף לפני שהתשלום אושר: בודקים שוב בכניסה הבאה */
(function(){let o=null;try{o=JSON.parse(localStorage.getItem(ORDER_KEY)||'null')}catch(e){}
  if(!o||o.paid||!o.id||Date.now()-o.at>7*864e5)return;
  fetch('/api/order?id='+o.id).then(r=>r.json()).then(x=>{if(x.status==='paid')activatePlan(x.plan,o.id)}).catch(()=>{})})();
function doPrint(){
  const P=PLAN();
  if(AUTH.ready&&!AUTH.user){loginModal('כדי להוריד או להדפיס, נכנסים לחשבון. ההרשמה חינם, וכל מה שבניתם נשמר.');return}
  if(P.freeCd){const m=modal('<h3>להדפיס את לוח הספירה?</h3><p class="hint">לוח ספירה לאחור של עד '+FREE_CD+' ימים מורידים ומדפיסים בחינם. אפשר להדפיס או לשמור כ־PDF.</p><div class="row"><button class="btn primary" type="button" id="dlGo">להדפיס עכשיו</button><button class="btn" type="button" data-close>ביטול</button></div>');m.querySelector('#dlGo').onclick=()=>{m.remove();logDl('countdown');setTimeout(ourPrint,50)};return}
  if(!P.downloads&&P.id==='free'&&!SAMPLE){const w=wmScreen();
    if(w){const m=modal('<h3>להדפיס בחינם?</h3><p class="hint">'+esc(w)+' בהדפסה החינמית אפשר עד '+LITE_LIM.events+' אירועים ו־'+LITE_LIM.photos+' תמונות. אפשר להוריד חלק, או לבחור מסלול ולהדפיס הכל.</p><div class="row"><button class="btn primary" type="button" id="fpUp">למסלולים</button><button class="btn" type="button" data-close>חזרה</button></div>');m.querySelector('#fpUp').onclick=()=>{m.remove();openUpgrade('download')};return}
    const m=modal('<h3>להדפיס בחינם?</h3><p class="hint">בהדפסה החינמית מופיע הלוגו של MyLuach. אפשר להדפיס או לשמור כ־PDF.</p><div class="row"><button class="btn primary" type="button" id="fpGo">הדפסה בחינם</button><button class="btn" type="button" id="fpUp">למסלולים</button></div>');
    m.querySelector('#fpGo').onclick=()=>{m.remove();render();try{logDl('browser',{wm:1})}catch(e){}setTimeout(ourPrint,80)};m.querySelector('#fpUp').onclick=()=>{m.remove();openUpgrade('download')};return}
  if(!P.downloads){openUpgrade('download');return}
  const left=LP.downloadsLeft();
  if(left<=0){const m=modal('<h3>נגמרו ההורדות</h3><p class="hint">השתמשתם בכל '+P.downloads+' ההורדות של המסלול. אפשר לעבור למסלול עם יותר הורדות.</p>'+planCards('full')+'<div class="row"><button class="btn" type="button" data-close>סגירה</button></div>');m.querySelector('.modal').classList.add('upgrade');m.addEventListener('click',e=>{const b=e.target.closest('[data-pick]');if(!b)return;m.remove();buyPlan(b.dataset.pick)});return}
  const m=modal('<h3>להדפיס את הלוח?</h3><p class="hint">הדפסה או שמירה כ־PDF משתמשת באחת מההורדות. נשארו לכם '+left+' מתוך '+P.downloads+'. כדאי לבדוק בתצוגה המקדימה שהכל מוכן לפני כן.</p><div class="row"><button class="btn primary" type="button" id="dlGo">להדפיס עכשיו</button><button class="btn" type="button" data-close>עוד לא</button></div>');
  m.querySelector('#dlGo').onclick=async()=>{const b=m.querySelector('#dlGo');b.disabled=true;b.textContent='בודקים…';
    let r={status:0},j={};
    try{const snP=snapOf();const h=await authHeaders();const sn=await snP;const s=state.s;r=await fetch('/api/user?fn=dl',{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify({kind:'paid',yr:calYearKey(),snap:sn,cal:(($('#stageTitle')||{}).textContent||'').slice(0,120),view:s.view||'month',size:s.size==='custom'?'custom':s.size,pages:RS.count,page:/simple/.test(window.location.pathname)?'simple':'app'})});j=await r.json().catch(()=>({}))}catch(e){}
    if(r.status===401){m.remove();loginModal('צריך להתחבר מחדש כדי להדפיס.');return}
    if(r.status===403){m.remove();await refreshAccount();modal('<h3>לא נמצא תשלום בחשבון</h3><p class="hint">לא מצאנו מסלול ששולם בחשבון '+esc((user&&user.email)||'')+'. אם שילמתם עם כתובת מייל אחרת, התחברו איתה. אם שילמתם עכשיו, נסו שוב בעוד דקה.</p><div class="row"><button class="btn" type="button" data-close>סגירה</button></div>');return}
    if(r.status===409&&j.error==='year'){m.remove();const Y=j.year||'',yt=Y[0]==='h'?'שנת '+gemYear(+Y.slice(1)):'שנת '+Y.slice(1);
      modal('<h3>ההדפסות במסלול הן ללוח של '+esc(yt)+'</h3><p class="hint">המסלול כולל כמה הדפסות של אותו לוח, למשל אחרי תיקונים, אבל רק לשנה שכבר הודפסה ('+esc(yt)+'). כדי להדפיס לוח לשנה אחרת צריך לרכוש מסלול חדש.</p><div class="row"><button class="btn primary" type="button" id="yrBuy">לרכישת מסלול לשנה הזאת</button><button class="btn" type="button" data-close>סגירה</button></div>').querySelector('#yrBuy').onclick=e=>{e.target.closest('.modal-back').remove();openUpgrade('download')};return}
    if(r.status===409){m.remove();try{localStorage.setItem('luchenu-downloads',String(j.limit||P.downloads))}catch(e){}syncPlanUI();doPrint();return}
    if(r.ok&&j.left!=null){try{localStorage.setItem('luchenu-downloads',String(Math.max(0,(j.limit||P.downloads)-j.left)))}catch(e){}}else if(!j.reprint)LP.useDownload();
    m.remove();syncPlanUI();setTimeout(ourPrint,50)};
}
/* ---------- לוח חינמי לשנה: גרסה מוגבלת, בלי סימן מים, פעם אחת לכל משתמש ---------- */
const LITE_LIM={events:25,photos:10,zmanim:3};
function liteState(src){const st=structuredClone(src),s=st.s;
  s.view='month';s.learn={};s.tfilot=[];s.cols=null;s.place={personal:'cell',yz:'none'};s.yzPanel=false;s.banner='none';s.banners=[];s.dedication=false;s.cover=s.cover!==false;s.credit=true;
  if(!['daily','shabbat'].includes(s.zmanimMode))s.zmanimMode='daily';
  const zk=Object.keys(s.zmanim||{}).filter(k=>s.zmanim[k]).slice(0,LITE_LIM.zmanim);s.zmanim=Object.fromEntries(zk.map(k=>[k,true]));
  st.ads=[];st.events=(st.events||[]).slice(0,LITE_LIM.events);
  let n=st.cover&&st.cover.img?1:0;for(const k of Object.keys(st.slots||{})){const o=st.slots[k];if(o&&o.img){if(n<LITE_LIM.photos)n++;else st.slots[k]={...o,img:null,edit:null}}}
  return st}
function liteCounts(){const ev=(state.events||[]).length,ph=(state.cover&&state.cover.img?1:0)+Object.values(state.slots||{}).filter(o=>o&&o.img).length,z=Object.values(state.s.zmanim||{}).filter(Boolean).length;return {ev,ph,z}}
async function liteApi(method){const t=sb&&(await sb.auth.getSession()).data.session;if(!t)return {status:401};const r=await fetch('/api/user?fn=lite',{method,headers:{Authorization:'Bearer '+t.access_token}});let j={};try{j=await r.json()}catch(e){}return {status:r.status,...j}}
async function openLite(){
  if(AUTH.ready&&!AUTH.user){loginModal('הלוח החינמי לשנה זמין למשתמשים רשומים (פעם אחת לכל משתמש). ההרשמה חינם.');return}
  const c=liteCounts(),L=LITE_LIM,over=(a,b)=>a>b?' <b class="msg-bad">(יש לכם '+a+', ייכללו '+b+' הראשונים)</b>':'';
  const m=modal('<h3>לוח חינמי לכל השנה</h3><p class="hint">לוח חודשי לשנה שלמה, בגרסה פשוטה. פעם אחת לכל משתמש.</p><ul class="hint">'+
    '<li>עד '+L.zmanim+' זמני היום'+over(c.z,L.zmanim)+'</li><li>עד '+L.photos+' תמונות'+over(c.ph,L.photos)+'</li><li>עד '+L.events+' אירועים אישיים'+over(c.ev,L.events)+'</li>'+
    '<li>חגים, פרשת השבוע וראש חודש</li><li>בלי לימוד יומי, בלי דברי הימים, בלי באנרים ועמודים נוספים</li><li>בתחתית כל עמוד: "הופק בחינם ע״י MyLuach.org"</li></ul>'+
    '<p class="hint" id="ltMsg"></p><div class="row"><button class="btn primary" type="button" id="ltGo">להורדה והדפסה</button><button class="btn" type="button" data-close>ביטול</button></div><p class="hint">רוצים את כל האפשרויות? '+'<a href="#" id="ltUp">לבחירת מסלול</a></p>');
  m.querySelector('#ltUp').onclick=e=>{e.preventDefault();m.remove();openUpgrade('download')};
  const st0=await liteApi('GET').catch(()=>({status:0}));
  if(st0.status===200&&st0.used&&!st0.open){m.querySelector('#ltMsg').innerHTML='<span class="msg-bad">כבר השתמשתם בלוח החינמי ('+new Date(st0.used_at).toLocaleDateString('he-IL')+'). כדי להוריד לוח נוסף בוחרים מסלול.</span>';m.querySelector('#ltGo').disabled=true;return}
  m.querySelector('#ltGo').onclick=async()=>{const b=m.querySelector('#ltGo');b.disabled=true;m.querySelector('#ltMsg').textContent='בודקים…';
    const r=await liteApi('POST').catch(()=>({status:0}));
    if(r.status===401){m.remove();loginModal('צריך להתחבר מחדש.');return}
    if(r.status===409){m.querySelector('#ltMsg').innerHTML='<span class="msg-bad">כבר השתמשתם בלוח החינמי.</span>';return}
    if(r.status!==200){b.disabled=false;m.querySelector('#ltMsg').innerHTML='<span class="msg-bad">השירות לא זמין כרגע. נסו שוב מאוחר יותר.</span>';return}
    m.remove();const orig=state;state=liteState(orig);LITE=true;document.body.classList.add('lite-print');monthsCache=buildMonths();render();
    const done=()=>{LITE=false;state=orig;document.body.classList.remove('lite-print');window.removeEventListener('afterprint',done);monthsCache=buildMonths();render();syncPlanUI()};
    window.addEventListener('afterprint',done);logDl('lite');setTimeout(ourPrint,500)}}
/* ---------- חודש לדוגמה בחינם ---------- */
const SAMPLE_KEY='luchenu-sample';
/* שלב 1: נשמר בדפדפן. בשלב 2 הבדיקה תעבור לשרת, עם אימות כתובת המייל. */
function sampleUsedBy(){try{return localStorage.getItem(SAMPLE_KEY)||''}catch(e){return ''}}
function claimSample(email){try{localStorage.setItem(SAMPLE_KEY,email)}catch(e){}return true}
function openSample(){
  if(AUTH.ready&&!AUTH.user){loginModal('כדי להוריד חודש לדוגמה, נכנסים לחשבון. ההרשמה חינם.');return}
  const used=sampleUsedBy(),ms=monthsCache.length?monthsCache:buildMonths();
  if(used){modal('<h3>כבר הורדתם חודש לדוגמה</h3><p class="hint">החודש לדוגמה כבר נוצל עם הכתובת '+esc(used)+'. כדי להוריד את כל הלוח, בוחרים מסלול.</p>'+planCards('full')+'<div class="row"><button class="btn" type="button" data-close>סגירה</button></div>').querySelector('.modal').classList.add('upgrade');return}
  const m=modal('<h3>חודש אחד בחינם, בגרסה המלאה</h3><p class="hint">בוחרים חודש ומורידים אותו עם כל האפשרויות פתוחות. אפשר פעם אחת לכל כתובת מייל.</p><label class="fld">איזה חודש<select id="smMonth">'+ms.map(mo=>opt(mo.key,mo.title+' '+mo.year)).join('')+'</select></label><label class="fld">כתובת מייל<input id="smEmail" type="email" inputmode="email" autocomplete="email" placeholder="name@example.com" dir="ltr"></label><p class="hint" id="smMsg"></p><div class="row"><button class="btn primary" type="button" id="smGo">להוריד את החודש</button><button class="btn" type="button" data-close>ביטול</button></div>');
  m.querySelector('#smGo').onclick=()=>{
    const email=m.querySelector('#smEmail').value.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){m.querySelector('#smMsg').innerHTML='<span class="msg-bad">כתבו כתובת מייל תקינה, למשל name@example.com.</span>';m.querySelector('#smEmail').focus();return}
    if(!claimSample(email)){m.querySelector('#smMsg').innerHTML='<span class="msg-bad">הכתובת הזאת כבר השתמשה בחודש לדוגמה.</span>';return}
    SAMPLE={key:m.querySelector('#smMonth').value};document.body.classList.add('sampling');m.remove();render();
    const done=()=>{SAMPLE=null;document.body.classList.remove('sampling');window.removeEventListener('afterprint',done);render();syncPlanUI()};
    window.addEventListener('afterprint',done);logDl('sample',{email});setTimeout(ourPrint,400);
  };
}
/* רישום ההורדה בשרת, לדף הניהול (לא חוסם את ההדפסה) */
/* דוגמית לבדיקת תקינות: עותק של הלוח. התמונות מוקטנות מאוד (לבדיקת המיקום), לפי התדירות שנקבעה בניהול, ואחרת מושמטות */
function snapThumb(src,px,q){return new Promise(res=>{const im=new Image();im.onload=()=>{try{const k=Math.min(1,(px||220)/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',(q||55)/100))}catch(e){res(null)}};im.onerror=()=>res(null);im.src=src;setTimeout(()=>res(null),4000)})}
function snapOf(){let raw;try{raw=JSON.parse(JSON.stringify(state))}catch(e){return Promise.resolve(null)}
  const meta={at:new Date().toISOString(),page:window.location.pathname,plan:(LP&&LP.current().id)||''};
  return (async()=>{let rate=20,px=220,q=55;try{
    /* ההגדרות העדכניות מהשרת בזמן ההורדה (ולא מתי שהדף נפתח), כדי ששינוי בניהול יחול מיד */
    const fresh=/^https?:/.test(location.protocol)?fetch('/api/pricing',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(null);
    let d=await Promise.race([fresh,new Promise(r=>setTimeout(()=>r(null),2500))]);
    if(!d||d.snapImg==null)d=LP&&LP.ready?await Promise.race([LP.ready,new Promise(r=>setTimeout(()=>r(null),800))]):null;if(d){if(d.snapImg!=null)rate=+d.snapImg;if(d.snapPx)px=+d.snapPx;if(d.snapQ)q=+d.snapQ}}catch(e){}
    const withImg=Math.random()*100<rate,cache=new Map();let n=0;
    const walk=async v=>{if(typeof v==='string'){if(/^blob:/.test(v))return null;if(/^data:image\//.test(v)){if(!withImg||n>=80)return null;if(!cache.has(v)){n++;cache.set(v,await snapThumb(v,px,q))}return cache.get(v)}return /^data:/.test(v)?null:v}
      if(Array.isArray(v)){const a=[];for(const x of v)a.push(await walk(x));return a}
      if(v&&typeof v==='object'){const o={};for(const k in v)o[k]=await walk(v[k]);return o}return v};
    try{let o=await walk(raw);o._snap={...meta,img:withImg,px,q};
      /* העותק לבדיקה מוגבל בגודל (ההורדה של הלקוח לא). גדול מדי: בלי תמונות */
      if(withImg&&JSON.stringify(o).length>3500000){const drop=v=>typeof v==='string'?(/^data:/.test(v)?null:v):Array.isArray(v)?v.map(drop):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,drop(x)])):v;o=drop(o);o._snap={...meta,img:false,big:true}}
      return JSON.stringify(o).length>3800000?null:o}catch(e){return null}})()}
async function logDl(kind,extra){const snP=snapOf();try{const sn=await snP;const h=await Promise.race([authHeaders().catch(()=>({})),new Promise(r=>setTimeout(()=>r({}),2000))]);const s=state.s;
  const cal=($('#stageTitle')||{}).textContent||'';const sz=s.size==='custom'?'custom':s.size;
  fetch('/api/user?fn=dl',{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify({kind,snap:sn,plan:(LP&&LP.current().id)||'',cal:cal.slice(0,120),view:s.view||'month',size:sz,pages:RS.count,page:CDMODE?'countdown':document.body.classList.contains('simple')||/simple/.test(window.location.pathname)?'simple':'app',...(extra||{})})}).catch(()=>{})}catch(e){console.warn('logDl',e)}}
/* מזהה השנה של הלוח (להגבלת ההדפסות במסלול לאותה שנה) */
function calYearKey(){const s=state.s;if(CDMODE||s.view==='countdown')return '';return s.calType==='greg'?'g'+(+s.gregYear||''):'h'+(+s.hebYear||'')}
function syncPlanUI(){
  if(!LP)return;const P=PLAN();
  LP.PLANS.forEach(p=>document.body.classList.toggle('plan-'+p.id,p.id===P.id));
  const b=$('#planBadge');if(b)b.innerHTML='מסלול '+esc(P.name)+(P.downloads?' · <span>'+LP.downloadsLeft()+' הורדות</span>':'');
  const u=$('#upgradeBtn');if(u)u.hidden=P.id==='full';
  const sbt=$('#sampleBtn');if(sbt)sbt.hidden=P.id!=='free';const lb=$('#liteBtn');if(lb)lb.hidden=P.id!=='free'||CDMODE;
  const g=(sel,f)=>document.querySelectorAll(sel).forEach(x=>{const l=x.closest('label')||x;l.classList.toggle('gated',!canF(f))});
  g('input[name=view]:not([value=month]):not([value=year]):not([value=countdown])','views');g('[data-bpos]','banners');g('#adAdd','extraPages');
  const zs=$('#zmAdv>summary');if(zs)zs.classList.toggle('gated',!canF('advZmanim'));
  const co=$('#size option[value=custom]');if(co)co.textContent='מותאם אישית'+(canF('customSize')?'':' (מסלול מלא)');
  const dv=$('#devPlan');if(dv)dv.value=P.id;
  {const c=document.querySelector('[data-opt=credit]');if(c){c.checked=creditOn();c.disabled=!creditHideOk();const h=$('#creditHint');if(h)h.textContent=creditHideOk()?'':'(אפשר להסתיר רק במסלול המלא)'}}
}
document.addEventListener('change',e=>{
  const t=e.target;let f=null;
  if(t.name==='view'&&!['month','year','countdown'].includes(t.value)&&!canF('views')){f='views';const r=$('input[name=view][value=month]');if(r)r.checked=true}
  else if(t.dataset&&t.dataset.bpos&&t.checked&&!canF('banners')){f='banners';t.checked=false}
  else if(t.id==='size'&&t.value==='custom'&&!canF('customSize')){f='customSize';t.value=state.s.size==='custom'?'wall':state.s.size}
  if(f){e.stopImmediatePropagation();openUpgrade(f)}
},true);
document.addEventListener('click',e=>{
  if(e.target.closest('.ins')&&!canF('extraPages')){e.stopImmediatePropagation();e.preventDefault();openUpgrade('extraPages');return}
  const lg=e.target.closest('[data-login]');if(lg){loginModal('כדי לראות את כל השנה, נכנסים או נרשמים. ההרשמה חינם, וכל מה שבניתם נשמר.');return}
  const u=e.target.closest('[data-upgrade]');if(u){openUpgrade(u.dataset.upgrade);return}
},true);
{const z=$('#zmAdv');if(z)z.addEventListener('toggle',()=>{if(z.open&&!canF('advZmanim')){z.open=false;openUpgrade('advZmanim')}})}
if($('#upgradeBtn'))$('#upgradeBtn').onclick=()=>openUpgrade(null);
if($('#sampleBtn'))$('#sampleBtn').onclick=openSample;
if($('#liteBtn'))$('#liteBtn').onclick=openLite;
if($('#devPlan')&&!(/^(localhost|127\.)/.test(window.location.hostname)||(/[?&]dev=1/.test(window.location.search)&&(()=>{try{return !!sessionStorage.getItem('myluach-admin')}catch(e){return false}})())))$('#devPlan').closest('.dev-plan').remove();
if($('#devPlan')){$('#devPlan').innerHTML=(LP?LP.PLANS:[]).map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('');$('#devPlan').onchange=e=>{LP.setCurrent(e.target.value);syncPlanUI();render()}}
/* ---------- זמני תפילות: עורך ---------- */
function renderTfilot(){
  const box=$('#tfList');if(!box)return;const L=state.s.tfilot||[];
  box.innerHTML=L.length?L.map(t=>'<div class="tf-row" data-tf="'+t.id+'">'+
    '<div class="row"><label class="fld">תפילה<input data-tff="name" value="'+esc(t.name||'')+'" placeholder="למשל: מנחה"></label>'+
    '<label class="fld">באילו ימים<select data-tff="days">'+TF_DAYS.map(x=>opt(x[0],x[1],x[0]===(t.days||'all'))).join('')+'</select></label></div>'+
    '<div class="row"><label class="fld">איך נקבעת השעה<select data-tff="mode">'+opt('fixed','שעה קבועה',t.mode!=='rel')+opt('rel','ביחס לזמן היום',t.mode==='rel')+'</select></label>'+
    (t.mode==='rel'?
      '<label class="fld">דקות<input type="number" min="0" max="600" data-tff="off" value="'+(+t.off||0)+'"></label>'+
      '<label class="fld">&nbsp;<select data-tff="dir">'+opt('before','לפני',t.dir==='before')+opt('after','אחרי',t.dir!=='before')+'</select></label>'+
      '<label class="fld">&nbsp;<select data-tff="base">'+TF_BASES.map(x=>opt(x[0],x[1],x[0]===(t.base||'sunset'))).join('')+'</select></label>'
      :'<label class="fld">שעה<input type="time" data-tff="time" value="'+esc(t.time||'')+'"></label>')+
    '</div>'+
    (t.mode==='rel'?'<div class="row"><label class="fld">עיגול<select data-tff="round">'+[['1','לדקה'],['5','ל־5 דקות'],['10','ל־10 דקות'],['15','לרבע שעה']].map(x=>opt(x[0],x[1],x[0]===String(t.round||1))).join('')+'</select></label>'+
      '<label class="fld">כיוון<select data-tff="rdir">'+[['down','מוקדם יותר'],['up','מאוחר יותר'],['near','הקרוב']].map(x=>opt(x[0],x[1],x[0]===(t.rdir||'down'))).join('')+'</select></label></div>':'')+
    '<div class="row"><span class="hint tf-ex">'+esc(tfExample(t))+'</span><button class="btn small danger" type="button" data-tfdel="1">מחיקה</button></div></div>').join('')
    :'<p class="hint">עדיין לא הוגדרו תפילות.</p>';
}
function tfExample(t){if(!t.name)return '';try{const d=new Date();return 'היום: '+t.name+' '+(tfilaTime(t,new Date(d.getFullYear(),d.getMonth(),d.getDate(),12))||'—')}catch(e){return ''}}
function tfChanged(redraw){save();if(redraw)renderTfilot();else document.querySelectorAll('.tf-row').forEach(r=>{const t=(state.s.tfilot||[]).find(x=>x.id===r.dataset.tf);if(t)r.querySelector('.tf-ex').textContent=tfExample(t)});rerender()}
if($('#tfList')){
  const gate=()=>{if(canF('tfilot'))return false;openUpgrade('tfilot');return true};
  $('#tfAdd').onclick=()=>{if(gate())return;state.s.tfilot=[...(state.s.tfilot||[]),{id:uid(),name:'',days:'all',mode:'fixed',time:''}];tfChanged(true)};
  $('#tfSample').onclick=()=>{if(gate())return;state.s.tfilot=[...(state.s.tfilot||[]),
    {id:uid(),name:'שחרית',days:'weekday',mode:'fixed',time:'06:30'},
    {id:uid(),name:'שחרית',days:'shabbatChag',mode:'fixed',time:'08:00'},
    {id:uid(),name:'מנחה',days:'sunThu',mode:'rel',off:15,dir:'before',base:'sunset',round:5,rdir:'down'},
    {id:uid(),name:'מנחה',days:'friday',mode:'rel',off:10,dir:'after',base:'candle',round:1,rdir:'down'},
    {id:uid(),name:'ערבית',days:'sunThu',mode:'fixed',time:'20:00'}];tfChanged(true)};
  const upd=e=>{const r=e.target.closest('.tf-row'),f=e.target.dataset.tff;if(!r||!f)return;
    if(gate())return;
    const t=(state.s.tfilot||[]).find(x=>x.id===r.dataset.tf);if(!t)return;
    t[f]=e.target.type==='number'?+e.target.value:e.target.value;tfChanged(f==='mode')};
  $('#tfList').addEventListener('change',upd);
  $('#tfList').addEventListener('input',e=>{if(e.target.dataset.tff==='name')upd(e)});
  $('#tfList').addEventListener('click',e=>{if(!e.target.dataset.tfdel)return;const r=e.target.closest('.tf-row');state.s.tfilot=(state.s.tfilot||[]).filter(x=>x.id!==r.dataset.tf);tfChanged(true)});
  renderTfilot();
}
/* ---------- ייבוא אירועים מקובץ, ותזכורות ליומן ---------- */
function dlFile(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function loadScript(src){return new Promise((ok,no)=>{const x=document.createElement('script');x.src=src;x.onload=ok;x.onerror=no;document.head.appendChild(x)})}
function parseCSV(t){const rows=[];let row=[],f='',q=false;t=t.replace(/^﻿/,'');
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===','||c===';'||c==='\t'){row.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}else f+=c}
  if(f||row.length){row.push(f);rows.push(row)}return rows.filter(r=>r.some(x=>String(x).trim()))}
function parseAnyDate(v){
  if(v instanceof Date&&!isNaN(v))return new Date(v.getFullYear(),v.getMonth(),v.getDate(),12);
  v=String(v||'').trim();let m;
  if(m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))return new Date(+m[1],m[2]-1,+m[3],12);
  if(m=v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/)){let y=+m[3];if(y<100)y+=y>40?1900:2000;return new Date(y,m[2]-1,+m[1],12)}
  if(m=v.match(/^(\d{4})(\d{2})(\d{2})/))return new Date(+m[1],m[2]-1,+m[3],12);
  return null}
function kindOf(v){v=String(v||'');if(/הולד|birth/i.test(v))return 'birthday';if(/נישו|anniv/i.test(v))return 'anniversary';if(/יא.?צ|יארצ|אזכר|יום.?ה?שנה|yahr/i.test(v))return 'yahrzeit';if(/תזכ|remind/i.test(v))return 'reminder';if(/אירוע|event/i.test(v))return 'event';return v?'other':''}
function recOf(v,kind){v=String(v||'');if(/עבר|heb/i.test(v))return 'heb';if(/לוע|greg/i.test(v))return 'greg';if(/פעם|once/i.test(v))return 'once';return KINDS[kind].rec==='once'?'once':'heb'}
function rowsToEvents(rows){
  if(!rows.length)return [];
  const head=rows[0].map(x=>String(x).trim());
  const col=re=>head.findIndex(h=>re.test(h));
  let ci={name:col(/שם|name|כותרת|title/i),kind:col(/סוג|type|kind/i),date:col(/תאריך|date/i),rec:col(/חזר|repeat|לוח/i),night:col(/שקיע|night|sunset/i)};
  let body=rows.slice(1);
  if(ci.name<0||ci.date<0){ci={name:0,kind:-1,date:1,rec:-1,night:-1};body=rows}
  const out=[];
  for(const r of body){
    const name=String(r[ci.name]||'').trim(),g=parseAnyDate(r[ci.date]);if(!name||!g)continue;
    const kind=kindOf(ci.kind>=0?r[ci.kind]:'')||'birthday',rec=recOf(ci.rec>=0?r[ci.rec]:'',kind);
    const night=ci.night>=0&&/כן|yes|1|true|v|✓/i.test(String(r[ci.night]||''));
    const o={id:uid(),kind,name,rec,img:null};
    if(rec==='heb'){const gg=new Date(g);if(night)gg.setDate(gg.getDate()+1);const h=new HDate(gg);o.day=h.getDate();o.month=h.getMonth();o.year=kind==='yahrzeit'?'':h.getFullYear()}
    else if(rec==='greg'){o.day=g.getDate();o.month=g.getMonth()+1;o.year=kind==='yahrzeit'?'':g.getFullYear()}
    else o.date=iso(g);
    out.push(o);
  }
  return out}
function icsToEvents(t){
  t=t.replace(/\r?\n[ \t]/g,'');const out=[];
  for(const b of t.split('BEGIN:VEVENT').slice(1)){
    const get=k=>{const m=b.match(new RegExp('^'+k+'[^:\\n]*:(.*)$','m'));return m?m[1].trim():''};
    const name=get('SUMMARY').replace(/\\,/g,',').replace(/\\n/g,' '),g=parseAnyDate(get('DTSTART'));if(!name||!g)continue;
    const yearly=/FREQ=YEARLY/.test(get('RRULE')),kind=kindOf(name)||'event';
    const o={id:uid(),kind:kind==='other'?'other':kind,name:name.replace(/^(יום הולדת ל|יום נישואין ל|יא״צ |יום השנה ל|אזכרה ל|יו״ש )/,''),img:null};
    if(yearly){o.rec='greg';o.day=g.getDate();o.month=g.getMonth()+1;o.year=''}else{o.rec='once';o.date=iso(g)}
    if(!['birthday','anniversary','yahrzeit','reminder'].includes(o.kind)){o.kind='other';o.name=name}
    out.push(o)}
  return out}
const EV_SAMPLE='﻿שם,סוג,תאריך,חזרה,אחרי השקיעה\nשירה,יום הולדת,12/08/2018,עברי,\nההורים,יום נישואין,03/06/1990,לועזי,\nסבא משה,יום שנה (יארצייט),21/11/2010,עברי,כן\nטיול שנתי,אירוע,15/05/2027,פעם אחת,\n';
const CD_FOC={first:'intro',goal:'outro',bg:'page'};
document.addEventListener('click',e=>{const be=e.target.closest('[data-cdimged]');if(be){const k=be.dataset.cdimged,cur=(state.cdImgs||{})[k];if(cur)openImageEditor(cur,v=>{state.cdImgs={...(state.cdImgs||{}),[k]:v};save();syncUI();cdFocus(CD_FOC[k]);render()});return}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-cdimg],[data-cdimgdel]');if(!b)return;const k=b.dataset.cdimg||b.dataset.cdimgdel;
  if(b.dataset.cdimgdel){const o={...(state.cdImgs||{})};delete o[k];state.cdImgs=o;save();syncUI();cdFocus(CD_FOC[k]);render();return}
  const f=v=>{state.cdImgs={...(state.cdImgs||{}),[k]:v};
    /* תמונת פתיחה או סיום: מוסיפים אוטומטית את הדף המתאים, אם לא בחרו אחרת */
    if(k==='first'&&state.s.cdIntro===undefined)state.s.cdIntro=true;if(k==='goal'&&state.s.cdOutro===undefined)state.s.cdOutro=true;
    save();syncUI();cdFocus(CD_FOC[k]);render()};f.maxPx=k==='bg'?QPX('page'):QPX('box');pickImage(f)});
/* מה יופיע בכל יום: תאריך, פרשה, חגים, ר"ח וזמנים */
function cdSyncDay(){const s=state.s;if(!$('#cdDStyle'))return;$('#cdDStyle').value=dStyle();
  document.querySelectorAll('[data-cdshow]').forEach(c=>c.checked=cdShow(c.dataset.cdshow));
  const z=s.cdZ||[];$('#cdZChips').innerHTML=CD_ZOPTS.map(([k,n])=>'<button type="button" class="chip'+(z.includes(k)?' on':'')+'" data-cdz="'+k+'"'+(!z.includes(k)&&z.length>=5?' disabled':'')+'>'+n+'</button>').join('');
  const cs=$('#cdCity');if(!cs.options.length)cs.innerHTML=CITIES.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('');cs.value=s.city;$('#cdCityRow').hidden=!z.length}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cdz]');if(!b)return;const k=b.dataset.cdz,z=[...(state.s.cdZ||[])],i=z.indexOf(k);
  if(i>=0)z.splice(i,1);else{if(z.length>=5)return;z.push(k)}cdFocus('page');set('cdZ',z)});
/* כרטיסי עיצוב, צורה ותדירות משפטים בדף הספירה לאחור */
const CD_LAYS=[['months','עמוד לכל חודש','לוח חודשי רגיל עם מספר גדול בכל יום'],['board','לוח מספרים','כל הימים בטבלה אחת, למשל 10×10'],['poster','פוסטר','כל הימים בדף אחד, שבוע בכל שורה'],['scroll','דף ארוך לטלפון','שורה לכל יום, לגלילה ולשיתוף'],['chain','שרשרת נייר','רצועות לגזירה, תולשים חוליה כל יום']];
const CD_LAY_ICON={months:'<rect x="3" y="3" width="34" height="34" rx="3"/><path d="M3 12h34M14 12v25M25 12v25M3 20h34M3 28h34"/>',board:'<rect x="3" y="3" width="34" height="34" rx="3"/><path d="M10 3v34M17 3v34M24 3v34M31 3v34M3 10h34M3 17h34M3 24h34M3 31h34"/>',poster:'<rect x="6" y="2" width="28" height="36" rx="2"/><path d="M6 9h28M6 15h28M6 21h28M6 27h28M6 33h28"/>',scroll:'<rect x="12" y="1" width="16" height="38" rx="3"/><path d="M12 8h16M12 14h16M12 20h16M12 26h16M12 32h16"/>',chain:'<ellipse cx="10" cy="20" rx="7" ry="10"/><ellipse cx="20" cy="20" rx="7" ry="10"/><ellipse cx="30" cy="20" rx="7" ry="10"/>'};
const CD_QE=[1,2,3,5,7,10,14];
function cdSyncCards(){const s=state.s,st=s.cdStyle||'classic',lay=s.cdLayout||'months',qe=+s.cdQEvery||10;
  const sc=$('#cdStyleCards');if(sc){if(!sc.children.length)sc.innerHTML=Object.entries(CD_STYLES).map(([k,v])=>{const [bg,c2]=CD_SW[k]||['#fff','#ccc'],nm=v.n.split(':');
      return '<button type="button" class="cd-card" role="radio" data-cdstyle="'+k+'" style="--sw-bg:'+bg+';--sw-acc:'+(v.acc||'#a3462b')+';--sw-2:'+c2+'"><span class="sw"><b style="font-family:'+esc(fontCSS(v.num||'Frank Ruhl Libre'))+'">7</b><i>'+v.goal+'</i></span><span class="nm">'+esc(nm[0])+'</span>'+(nm[1]?'<small>'+esc(nm[1].trim())+'</small>':'')+'</button>'}).join('');
    Object.values(CD_STYLES).forEach(v=>v.num&&loadFont(v.num));
    sc.querySelectorAll('[data-cdstyle]').forEach(b=>{const on=b.dataset.cdstyle===st;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on))})}
  const lc=$('#cdLayCards');if(lc){if(!lc.children.length)lc.innerHTML=CD_LAYS.map(([k,n,d])=>'<button type="button" class="cd-card" role="radio" data-cdlay="'+k+'"><svg viewBox="0 0 40 40" aria-hidden="true">'+CD_LAY_ICON[k]+'</svg><span class="nm">'+n+'</span><small>'+d+'</small></button>').join('');
    lc.querySelectorAll('[data-cdlay]').forEach(b=>{const on=b.dataset.cdlay===lay;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on))})}
  const qc=$('#cdQChips');if(qc){qc.innerHTML=CD_QE.map(n=>'<button type="button" class="chip'+(n===qe?' on':'')+'" data-cdqe="'+n+'">'+(n===1?'כל יום':n===7?'כל שבוע':n)+'</button>').join('')+'<label class="chip-n">אחר <input type="number" id="cdQEvery" min="1" max="60" value="'+(CD_QE.includes(qe)?'':qe)+'" placeholder="#"></label>'}
  const sl=$('#cdSlots');if(sl){sl.innerHTML=[['first','תמונת פתיחה','בדף הפתיחה וביום הראשון'],['bg','תמונת רקע','מאחורי כל העמודים'],['goal','תמונת סיום','ביום היעד ובדף הסיום']].map(([k,n,d])=>{const im=cdImg(k);
    return '<div class="cd-slot'+(im?' has':'')+'"><button type="button" class="cd-slot-b" data-cdimg="'+k+'" aria-label="'+(im?'החלפת ':'הוספת ')+n+'">'+(im?'<img alt="" src="'+im+'">':'<span class="plus">+</span>')+'</button><span class="nm">'+n+'</span><small>'+d+'</small>'+(im?'<button type="button" class="cd-slot-x" data-cdimgdel="'+k+'" aria-label="הסרת '+n+'">×</button>':'')+(im?'<button type="button" class="cd-slot-e" data-cdimged="'+k+'" aria-label="עריכת '+n+'">✎ עריכה</button>':'')+'</div>'}).join('')}
  if($('#cdBgOpRow'))$('#cdBgOpRow').hidden=!cdImg('bg');
  if($('#cdIntroTxtRow')){$('#cdIntroTxtRow').hidden=!s.cdIntro;$('#cdOutroTxtRow').hidden=!s.cdOutro;if(document.activeElement!==$('#cdIntroText'))$('#cdIntroText').value=s.cdIntroText||'';if(document.activeElement!==$('#cdOutroText'))$('#cdOutroText').value=s.cdOutroText||''}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cdstyle],[data-cdlay],[data-cdqe]');if(!b)return;
  if(b.dataset.cdstyle){cdFocus('page');return set('cdStyle',b.dataset.cdstyle)}
  if(b.dataset.cdlay){cdFocus('page');return set('cdLayout',b.dataset.cdlay)}
  if(b.dataset.cdqe){cdFocus('quote');if(!state.s.cdQuotes)state.s.cdQuotes=true;return set('cdQEvery',+b.dataset.cdqe)}});
['cdIntroText','cdOutroText','cdTitle'].forEach(id=>{const x=$('#'+id);if(x)x.addEventListener('input',e=>{if(id==='cdTitle'&&!CDMODE)return;state.s[id]=e.target.value;cdFocus(id==='cdIntroText'?'intro':id==='cdOutroText'?'outro':'page');save();rerender()})});
if($('#cdBgOp'))$('#cdBgOp').addEventListener('input',e=>{state.s.cdBgOp=+e.target.value;cdFocus('page');save();rerender()});
/* אחרי כל בחירה: מקפיצים בתצוגה המקדימה לעמוד שהשתנה ומדגישים אותו */
let CDF=null,cdToastT;function cdFocus(k){if(CDMODE)CDF=k||'page'}
function cdApplyFocus(){if(!CDF)return;const k=CDF;CDF=null;
  const wraps=[...stage.querySelectorAll('.sheet-wrap')];if(!wraps.length)return;
  let el=null;
  if(k==='intro')el=stage.querySelector('[data-key="cd-intro"]')||wraps[0];
  else if(k==='outro')el=stage.querySelector('[data-key="cd-outro"]')||(stage.querySelector('.goal')||{}).closest?.('.sheet-wrap')||wraps.at(-1);
  else if(k==='quote'){const q=stage.querySelector('.cd-q,.cdp-q,.cdb-q');el=q?(q.closest('.cd-d,.cdp-d,.cds-r,.cdc-s,.cdb-q')||q):null;if(!el)el=wraps.find(w=>w.dataset.key!=='cd-intro')||wraps[0]}
  else el=wraps.find(w=>w.dataset.key!=='cd-intro')||wraps[0];
  const flash=el.classList.contains('sheet-wrap')?el.querySelector('.page'):el;
  flash.classList.remove('cd-flash');void flash.offsetWidth;flash.classList.add('cd-flash');setTimeout(()=>flash.classList.remove('cd-flash'),1800);
  if(matchMedia('(min-width:901px)').matches){el.scrollIntoView({behavior:'smooth',block:k==='quote'?'center':'start'})}
  else{let t=$('#cdToast');if(!t){t=document.createElement('button');t.id='cdToast';t.type='button';t.className='cd-toast';document.body.appendChild(t)}
    t.textContent='✓ עודכן · לראות בתצוגה ↓';t.onclick=()=>{el.scrollIntoView({behavior:'smooth',block:'start'});t.classList.remove('on')};t.classList.add('on');clearTimeout(cdToastT);cdToastT=setTimeout(()=>t.classList.remove('on'),4500)}}
if($('#startDateClr'))$('#startDateClr').onclick=()=>set('startDate','');
if($('#cdQCustom'))$('#cdQCustom').addEventListener('input',e=>{state.s.cdQCustom=e.target.value;save();rerender()});
if($('#nextYear'))$('#nextYear').onclick=()=>{const s=state.s;if(s.calType==='heb')s.hebYear=+s.hebYear+1;else s.gregYear=+s.gregYear+1;save();syncUI();render()};
if($('#evImport'))$('#evImport').onclick=()=>{
  const m=modal('<h3>ייבוא אירועים מקובץ</h3><p class="hint">אפשר לייבא מקובץ אקסל או CSV, או מקובץ יומן (ics) מגוגל, מאפל או מאאוטלוק. בקובץ אקסל צריכים להיות הטורים: <b>שם, סוג, תאריך, חזרה, אחרי השקיעה</b>. התאריך הוא לועזי (למשל 12/08/2018), והלוח מחשב לבד את התאריך העברי. בטור "חזרה" כותבים עברי, לועזי או פעם אחת.</p>'+
    '<div class="row"><button class="btn primary" type="button" id="ixPick">בחירת קובץ</button><button class="btn" type="button" id="ixSample">הורדת קובץ לדוגמה</button></div><input type="file" id="ixFile" accept=".csv,.xlsx,.xls,.ics,.txt" hidden><div id="ixOut"></div><p class="hint" id="ixMsg"></p>'+
    '<div class="row"><button class="btn" type="button" data-close>סגירה</button></div>');
  const q=x=>m.querySelector(x);
  q('#ixSample').onclick=()=>dlFile('luchenu-events-sample.csv',EV_SAMPLE,'text/csv;charset=utf-8');
  q('#ixPick').onclick=()=>q('#ixFile').click();
  q('#ixFile').onchange=async()=>{
    const f=q('#ixFile').files[0];if(!f)return;q('#ixMsg').textContent='קורא את הקובץ…';let evs=[];
    try{
      if(/\.ics$/i.test(f.name))evs=icsToEvents(await f.text());
      else if(/\.xlsx?$/i.test(f.name)){
        if(!window.XLSX)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});
        evs=rowsToEvents(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:''}));
      }else evs=rowsToEvents(parseCSV(await f.text()));
    }catch(e){console.error(e);q('#ixMsg').innerHTML='<span class="msg-bad">לא הצלחנו לקרוא את הקובץ. נסו לשמור אותו כ־CSV או להוריד את הקובץ לדוגמה ולמלא אותו.</span>';return}
    if(!evs.length){q('#ixMsg').innerHTML='<span class="msg-bad">לא נמצאו אירועים בקובץ. בדקו שיש טור "שם" וטור "תאריך".</span>';return}
    const room=Math.max(0,PLAN().events-state.events.length),take=evs.slice(0,room);
    const now=new Date(),hd=new HDate(now);
    q('#ixMsg').textContent='';
    q('#ixOut').innerHTML='<p><b>נמצאו '+evs.length+' אירועים.</b>'+(take.length<evs.length?' במסלול הנוכחי אפשר להוסיף עוד '+room+'.':'')+'</p><div class="listbox ix-list">'+evs.slice(0,40).map(e=>{const when=e.rec==='heb'?gem(+e.day)+' '+hebMonthOpt(+e.month):e.rec==='greg'?e.day+(EN?' ':' ב')+GREG_MONTHS[e.month-1]:dateFromIso(e.date).toLocaleDateString('he-IL');return '<div>'+esc(eventLabel(e,now,hd))+' · <small>'+esc(when)+'</small></div>'}).join('')+(evs.length>40?'<div>…</div>':'')+'</div>'+
      '<div class="row">'+(take.length?'<button class="btn primary" type="button" id="ixGo">הוספת '+take.length+' אירועים ללוח</button>':'')+(take.length<evs.length?'<button class="btn" type="button" data-upgrade="events">מסלול עם יותר אירועים</button>':'')+'</div>';
    const go=q('#ixGo');if(go)go.onclick=()=>{state.events.push(...take);save();renderEvents();render();m.remove()};
  };
};
if($('#evIcs'))$('#evIcs').onclick=()=>{
  const m=modal('<h3>תזכורות ליומן בטלפון</h3><p class="hint">יוצרים קובץ יומן עם כל האירועים האישיים של הלוח הזה: ימי הולדת, ימי נישואין, ימי שנה (יארצייטים) ותזכורות, כל אחד בתאריך הנכון לפי הלוח העברי או הלועזי. פותחים את הקובץ בטלפון או במחשב, והיומן מוסיף את האירועים עם תזכורת.</p>'+
    '<div class="fld">מתי להזכיר<label class="chk"><input type="checkbox" id="icW"> שבוע לפני</label><label class="chk"><input type="checkbox" id="icD" checked> יום לפני, ב־9:00 בבוקר</label><label class="chk"><input type="checkbox" id="icT" checked> באותו יום, ב־8:00 בבוקר</label></div>'+
    '<label class="chk"><input type="checkbox" id="icHol"> להוסיף גם את החגים</label>'+
    '<div class="row"><button class="btn primary" type="button" id="icGo">הורדת קובץ היומן</button><button class="btn" type="button" data-close>סגירה</button></div><p class="hint" id="icMsg"></p>');
  const q=x=>m.querySelector(x);
  q('#icGo').onclick=()=>{
    const ms=monthsCache.length?monthsCache:buildMonths(),days=ms.flatMap(x=>x.days);
    const al=[];if(q('#icW').checked)al.push(['-P6DT16H','בעוד שבוע']);if(q('#icD').checked)al.push(['-PT15H','מחר']);if(q('#icT').checked)al.push(['PT8H','היום']);
    const hol=q('#icHol').checked,evMap=hol?eventsFor(days[0],days[days.length-1]):null;
    const d8=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
    const escI=t=>String(t).replace(/[\\,;]/g,x=>'\\'+x).replace(/\n/g,'\\n');
    const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
    const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MyLuach//HE','CALSCALE:GREGORIAN','X-WR-CALNAME:MyLuach'];let n=0;
    for(const d of days){
      const hd=new HDate(d),nx=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,12);
      const list=eventsOn(d,hd).map(e=>({t:eventLabel(e,d,hd),id:e.id,al:true}));
      if(hol)for(const it of (evMap.get(ymd(d))||[]))if(it.chag||it.cls===''&&!it.learn)list.push({t:it.text,id:'h'+n,al:false});
      for(const it of list){if(!it.t)continue;n++;
        L.push('BEGIN:VEVENT','UID:'+d8(d)+'-'+it.id+'-'+n+'@luchenu','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+d8(d),'DTEND;VALUE=DATE:'+d8(nx),'SUMMARY:'+escI(it.t),'DESCRIPTION:'+escI(hebShort(hd)+' '+hebYearStr(hd.getFullYear())),'TRANSP:TRANSPARENT');
        if(it.al)for(const [tr,w] of al)L.push('BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:'+tr,'DESCRIPTION:'+escI(w+': '+it.t),'END:VALARM');
        L.push('END:VEVENT')}
    }
    L.push('END:VCALENDAR');
    if(!n){q('#icMsg').innerHTML='<span class="msg-bad">אין עדיין אירועים אישיים בלוח.</span>';return}
    dlFile('luchenu-reminders.ics',L.join('\r\n'),'text/calendar;charset=utf-8');
    q('#icMsg').innerHTML='<span class="msg-ok">הקובץ ירד עם '+n+' אירועים. פתחו אותו כדי להוסיף אותם ליומן.</span>';
  };
};
/* ---------- מה מופיע איפה: טורים, ומיקום לכל זמן ---------- */
const COL_W=[['12','צר מאוד (12%)'],['16','צר (16%)'],['20','בינוני-צר (20%)'],['26','בינוני (26%)'],['32','רחב (32%)'],['40','רחב מאוד (40%)']];
function colName(cs,id){const i=cs.findIndex(c=>c.id===id);return 'טור '+(i+1)+' ('+(cs[i].side==='right'?'מימין':'משמאל')+')'}
function renderPlaceUI(){
  const box=$('#placeUI');if(!box)return;const s=state.s,cs=colsCfg(),P=s.place||{};
  const typeSel=t=>{const cur=t==='yz'&&(P.yz||'none')==='page'?'page':(t==='yz'?(P.yz||'none'):P[t])==='none'?'none':(colOf(t)?'col:'+colOf(t).id:'cell');
    return '<select data-ptype="'+t+'">'+opt('cell','בתוך הימים',cur==='cell')+cs.map(c=>opt('col:'+c.id,'ב'+colName(cs,c.id),cur==='col:'+c.id)).join('')+opt('newcol','בטור חדש',false)+(t==='yz'?opt('page','בעמוד נפרד מעל הלוח',cur==='page'):'')+opt('none','לא להציג',cur==='none')+'</select>'};
  let h='<div class="pl-rows">';
  for(const [t,n] of COL_TYPES.slice(1,4))h+='<label class="fld">'+n+typeSel(t)+'</label>';
  h+='</div><h4 class="pl-sub">הטורים ליד הלוח</h4>';
  if(!cs.length)h+='<p class="hint">אין טורים. כל המידע מופיע בתוך הימים.</p>';
  cs.forEach((c,i)=>{h+='<div class="col-card" data-colid="'+c.id+'"><div class="col-card-h"><b>טור '+(i+1)+'</b><button type="button" class="btn small danger" data-coldel="1">מחיקת הטור</button></div>'+
    '<div class="row"><label class="fld">צד<select data-colside="1">'+opt('right','מימין ללוח',c.side==='right')+opt('left','משמאל ללוח',c.side!=='right')+'</select></label>'+
    '<label class="fld">רוחב<select data-colw="1">'+COL_W.map(x=>opt(x[0],x[1],+x[0]===+c.w)).join('')+(COL_W.some(x=>+x[0]===+c.w)?'':opt(String(c.w),c.w+'%',true))+'</select></label></div>'+
    '<div class="fld">מה בטור הזה<div class="checks">'+COL_TYPES.map(([t,n])=>'<label class="chk'+((t==='img'||t==='ad')&&!canF('banners')?' gated':'')+'"><input type="checkbox" data-coltype="'+t+'"'+(c.types.includes(t)?' checked':'')+'> '+n+'</label>').join('')+'</div></div>'+
    (c.types.includes('img')||c.types.includes('ad')?'<label class="chk"><input type="checkbox" data-colper="1"'+(c.imgPer?' checked':'')+'> תמונה ומודעה אחרות בכל חודש (אחרת: אותן בכל הלוח)</label><p class="hint">מעלים את התמונה בלחיצה על הטור בתצוגה המקדימה.</p>':'')+'</div>'});
  h+='<button class="btn primary" type="button" id="colAdd">+ הוספה ליד הלוח</button>';
  box.innerHTML=h;
  /* מיקום לכל זמן */
  const zb=$('#zmPlace');if(!zb)return;
  const dis=zMode()==='none'||zMode()==='table';
  zb.innerHTML='<div class="zp-head"><span></span><span>ביום</span><span>בטור</span><span>רק בשבת</span></div>'+ZMANIM.map(([k,full])=>{const on=!!s.zmanim[k],p=on?zpl(k):{};
    return '<div class="zp-row'+(on?'':' off')+'"><span>'+full+'</span><input type="checkbox" data-zpday="'+k+'"'+(p.day?' checked':'')+' aria-label="'+full+' בתוך היום"'+(dis?' disabled':'')+'><input type="checkbox" data-zpcol="'+k+'"'+(p.col?' checked':'')+' aria-label="'+full+' בטור"'+(dis?' disabled':'')+'><input type="checkbox" data-zpsh="'+k+'"'+(p.sh?' checked':'')+' aria-label="'+full+' רק בשבת"'+(dis||!p.day?' disabled':'')+'></div>'}).join('');
}
function colAddType(cs,c,ty){const s=state.s;
  if(ty!=='img'&&ty!=='ad')cs.forEach(x=>x.types=x.types.filter(y=>y!==ty));
  if(!c.types.includes(ty))c.types.push(ty);
  if(ty==='zmanim'){s.zmanimMode=s.zmanimMode==='none'||s.zmanimMode==='table'?'daily':s.zmanimMode;if(!s.zplace&&zMode()!=='custom')s.zmanimMode='col';else{const o=zplAll();for(const k in o)if(s.zmanim[k])o[k]={...o[k],col:1,day:0};s.zplace=o;s.zmanimMode='custom'}}
  else if(ty==='personal'||ty==='learn'||ty==='yz')s.place={...s.place,[ty]:'cell'}}
const ADD_ITEMS=[['zmanim','זמני היום','טבלה עם שורה לכל יום','🕐'],['personal','אירועים אישיים','ימי הולדת, נישואין, תזכורות','🎂'],['yz','יומי דהילולא (יארצייטן) ודברי הימים','אירועים מתולדות עם ישראל','📜'],['learn','לימוד יומי ומולד','דף יומי, משניות, מולד ותקופות','📖'],['img','תמונה','תמונה לאורך הלוח','🖼'],['ad','מודעה או הקדשה','כותרת, תמונה וטקסט, לפרסום או לעילוי נשמה','📣']];
function openAddMenu(){
  const m=modal('<h3>מה להוסיף ליד הלוח?</h3><div class="add-grid">'+ADD_ITEMS.map(([t,n,d,i])=>'<button type="button" class="add-card'+((t==='img'||t==='ad')&&!canF('banners')?' gated':'')+'" data-addt="'+t+'"><span class="add-ic">'+i+'</span><b>'+n+'</b><small>'+d+'</small></button>').join('')+'</div>'+
    '<div id="addWhere" hidden><h4>איפה?</h4><div class="add-where"></div></div><div class="row"><button class="btn" type="button" data-close>ביטול</button></div>');
  const q=x=>m.querySelector(x);let ty=null;
  m.addEventListener('click',e=>{
    const a=e.target.closest('[data-addt]');
    if(a){ty=a.dataset.addt;if((ty==='img'||ty==='ad')&&!canF('banners')){m.remove();openUpgrade('banners');return}
      m.querySelectorAll('.add-card').forEach(x=>x.classList.toggle('on',x===a));
      const cs=colsCfg(),wh=[['right','בטור חדש מימין ללוח'],['left','בטור חדש משמאל ללוח']].concat(cs.map(c=>['col:'+c.id,'בתוך '+colName(cs,c.id)+', מתחת למה שכבר בו'])).concat(ty==='img'||ty==='ad'?[['top','ברצועה מעל הלוח'],['bottom','ברצועה מתחת ללוח']]:[]);
      q('#addWhere').hidden=false;q('.add-where').innerHTML=wh.map(([v,l])=>'<button type="button" class="btn" data-addw="'+v+'">'+l+'</button>').join('');return}
    const w=e.target.closest('[data-addw]');if(!w||!ty)return;const v=w.dataset.addw,s=state.s;
    if(v==='top'||v==='bottom'){const cur=bannerList().filter(x=>x!==v);cur.push(v);s.banner='none';s.banners=['top','right','left','bottom'].filter(x=>cur.includes(x));m.remove();save();syncUI();render();return}
    const cs=colsCfg();let c;
    if(v.startsWith('col:'))c=cs.find(x=>x.id===v.slice(4));
    if(!c){c={id:'c'+uid(),side:v==='right'?'right':'left',w:ty==='learn'?12:ty==='zmanim'?24:18,types:[]};cs.push(c)}
    colAddType(cs,c,ty);saveCols(cs);m.remove();save();syncUI();render();
  });
}
function zplAll(){const s=state.s,o={};for(const [k] of ZMANIM){o[k]=s.zmanim[k]?{...zpl(k)}:{}}return o}
document.addEventListener('change',e=>{
  const t=e.target,s=state.s;if(!t.closest||!(t.closest('#placeUI')||t.closest('#zmPlace')))return;
  const done=()=>{save();syncUI();render()};
  if(t.dataset.ptype){const ty=t.dataset.ptype,v=t.value;let cs=colsCfg();cs.forEach(c=>c.types=c.types.filter(x=>x!==ty));
    let pv=v==='none'?'none':v==='page'?'page':'cell';
    if(v==='newcol'){const last=cs[cs.length-1];cs.push({id:'c'+uid(),side:last?last.side:(s.panelSide==='right'?'right':'left'),w:ty==='learn'?12:22,types:[ty]})}
    else if(v.startsWith('col:')){const c=cs.find(x=>x.id===v.slice(4));if(c)c.types.push(ty)}
    saveCols(cs);s.place={...s.place,[ty]:pv};return done()}
  const card=t.closest('.col-card');
  if(card){let cs=colsCfg();const c=cs.find(x=>x.id===card.dataset.colid);if(!c)return;
    if(t.dataset.colside)c.side=t.value;
    if(t.dataset.colw)c.w=+t.value;
    if(t.dataset.colper)c.imgPer=t.checked;
    if((t.dataset.coltype==='img'||t.dataset.coltype==='ad')&&t.checked&&!canF('banners')){t.checked=false;openUpgrade('banners');return}
    if(t.dataset.coltype){const ty=t.dataset.coltype;
      if(t.checked)colAddType(cs,c,ty);
      else{c.types=c.types.filter(y=>y!==ty);
        if(ty==='zmanim'){const o=zplAll();for(const k in o)if(o[k].col)o[k]={...o[k],col:0,day:1};s.zplace=o;s.zmanimMode='custom'}}
    }
    saveCols(cs);return done()}
  const k=t.dataset.zpday||t.dataset.zpcol||t.dataset.zpsh;
  if(k){const o=zplAll(),p={...(o[k]||{})};
    if(t.dataset.zpday)p.day=t.checked?1:0;if(t.dataset.zpcol)p.col=t.checked?1:0;if(t.dataset.zpsh)p.sh=t.checked?1:0;
    o[k]=p;s.zplace=o;s.zmanim={...s.zmanim,[k]:!!(p.day||p.col)};s.zmanimMode='custom';return done()}
});
document.addEventListener('click',e=>{
  const q=e.target.dataset&&e.target.dataset.zpq;if(!q)return;const s=state.s,o={},MAIN=['sunrise','shma','tfila','sunset','tzeit'];
  for(const [k] of ZMANIM){if(!s.zmanim[k])continue;o[k]=q==='day'?{day:1}:q==='col'?{col:1}:MAIN.includes(k)?{day:1}:{col:1}}
  s.zplace=o;s.zmanimMode='custom';save();syncUI();render()});
document.addEventListener('click',e=>{
  const s=state.s;
  if(e.target.id==='colAdd'){openAddMenu();return}
  if(e.target.dataset&&e.target.dataset.coldel){const card=e.target.closest('.col-card');let cs=colsCfg();const c=cs.find(x=>x.id===card.dataset.colid);if(!c)return;
    if(c.types.includes('zmanim')){const o=zplAll();for(const k in o)if(o[k].col)o[k]={...o[k],col:0,day:1};s.zplace=o;s.zmanimMode='custom'}
    saveCols(cs.filter(x=>x!==c));save();syncUI();render()}
});
/* ---------- הגנה על דברי הימים מפני העתקה ---------- */
const YZ_PROT='.hist-body,.yz-panel,.e.gadol,.yzp-e,.yz-list,.ym-list,#ymList,.yz-row,.wd-c-yz,.c-yz';
const yzProt=n=>{n=n&&(n.nodeType===1?n:n.parentElement);return !!(n&&n.closest&&n.closest(YZ_PROT))};
function selTouchesYz(){const sel=window.getSelection();if(!sel||!sel.rangeCount)return false;
  if(yzProt(sel.anchorNode)||yzProt(sel.focusNode))return true;
  const r=sel.getRangeAt(0),c=r.commonAncestorContainer;const root=c.nodeType===1?c:c.parentElement;
  return !!(root&&[...root.querySelectorAll(YZ_PROT)].some(x=>r.intersectsNode(x)))}
const YZ_NOTE='התוכן של דברי הימים מוגן בזכויות יוצרים · MyLuach';
['copy','cut'].forEach(ev=>document.addEventListener(ev,e=>{if(!selTouchesYz())return;e.preventDefault();try{e.clipboardData.setData('text/plain',YZ_NOTE)}catch(err){}},true));
document.addEventListener('contextmenu',e=>{if(yzProt(e.target))e.preventDefault()},true);
document.addEventListener('dragstart',e=>{if(yzProt(e.target))e.preventDefault()},true);
document.addEventListener('selectstart',e=>{if(yzProt(e.target)&&!e.target.closest('[contenteditable=true],input,textarea'))e.preventDefault()},true);
/* ---------- צבע לכל סוג טקסט בלוח ---------- */
const TCOLS=[['month','שם החודש'],['wd','ימי השבוע'],['date','מספר היום'],['date2','התאריך השני (הקטן)'],['chag','חגים'],['par','פרשת השבוע'],['times','הדלקה, יציאה וזמנים בתוך היום'],['pers','אירועים אישיים'],['yz','יומי דהילולא (יארצייטן)'],['hev','מאורעות בדברי הימים'],['learn','לימוד יומי'],['moon','מולד, קידוש לבנה ותקופות'],['tfila','זמני תפילות'],['foot','השורה התחתונה']];
function renderTColors(){const b=$('#tcolList');if(!b)return;const T=state.s.tcolors||{};
  b.innerHTML=TCOLS.map(([k,n])=>'<label class="tcol"><input type="color" data-tcol-c="'+k+'" value="'+(T[k]||'#000000')+'"'+(T[k]?'':' data-unset="1"')+'><span>'+n+'</span>'+(T[k]?'<button type="button" class="linkish" data-tcol-x="'+k+'">ברירת מחדל</button>':'<small class="hint">ברירת מחדל</small>')+'</label>').join('')}
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.tcolC;if(!k)return;state.s.tcolors={...(state.s.tcolors||{}),[k]:e.target.value};save();rerender()});
document.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.tcolC;if(k)renderTColors()});
document.addEventListener('click',e=>{const k=e.target.dataset&&e.target.dataset.tcolX;if(k){const o={...(state.s.tcolors||{})};delete o[k];state.s.tcolors=o;save();renderTColors();rerender();return}
  if(e.target.id==='tcolReset'){state.s.tcolors={};save();renderTColors();rerender()}});
syncPlanUI();
/* ---------- כמה תמונות ביום אחד ----------
   כל תמונה ביום שייכת לאירוע (גם "תמונה בלבד", בלי טקסט). כשיש כמה, התא מתחלק ביניהן.
   הסידור נשמר לכל יום: state.dayImgs[YYYY-MM-DD] = {dir, order:[ids], sizes:[%], gr, gc, im:{id:{x,y,z,f,c}}}
   dir: row (זו לצד זו) · col (זו מעל זו) · grid (2 למעלה ו־2 למטה) · g21 (2 למעלה, 1 למטה) · g12 (1 למעלה, 2 למטה)
   gr: גובה השורה העליונה ב־%, gc: רוחב העמודה הימנית ב־% (בחלוקות של רשת). f: היפוך, c: כל התמונה (בלי חיתוך) */
const DI_DIRS={row:'זו לצד זו',col:'זו מעל זו',grid:'2 למעלה ו־2 למטה',g21:'2 למעלה ו־1 למטה',g12:'1 למעלה ו־2 למטה'};
const diDirsFor=n=>n<2?[]:n===2?['row','col']:n===3?['row','col','g21','g12']:['row','col','grid'];
const diGrid=d=>d==='grid'||d==='g21'||d==='g12';
function dayLayout(key,evs){
  const L=(state.dayImgs||{})[key]||{},ids=evs.map(e=>e.id);
  const order=(L.order||[]).filter(id=>ids.includes(id));ids.forEach(id=>{if(!order.includes(id))order.push(id)});
  const n=order.length,sizes=Array.isArray(L.sizes)&&L.sizes.length===n?L.sizes.slice():Array(n).fill(100/n);
  let dir=L.dir||(n===4?'grid':'row');const ok=diDirsFor(n);if(n>1&&!ok.includes(dir))dir=n===3&&diGrid(dir)?'g21':n>=4&&diGrid(dir)?'grid':'row';
  return {dir,order,sizes,gr:L.gr??50,gc:L.gc??50,im:{...(L.im||{})}};
}
function imgXform(im,t,e){t=t||{};const x=t.x??50,y=t.y??(e&&e.imgPos!=null?e.imgPos:50),z=t.z??1;
  im.style.objectFit=t.c!=null?(t.c?'contain':'cover'):(e&&e.imgFit==='contain'?'contain':'cover');
  im.style.objectPosition=x+'% '+y+'%';im.style.transformOrigin=x+'% '+y+'%';im.style.transform=((z!==1?'scale('+z+') ':'')+(t.f?'scaleX(-1)':'')).trim()}
function dayImgsEl(key,evs,L){L=L||dayLayout(key,evs);const g=diGrid(L.dir),box=el('div','c-imgs dir-'+L.dir);
  if(g){const rows=Math.ceil(L.order.length/2);box.style.gridTemplateColumns=L.gc+'fr '+(100-L.gc)+'fr';box.style.gridTemplateRows=rows===2?L.gr+'fr '+(100-L.gr)+'fr':'repeat('+rows+',1fr)'}
  L.order.forEach((id,i)=>{const e=evs.find(x=>x.id===id);if(!e)return;const w=el('div','c-im');w.dataset.id=id;if(!g)w.style.flexBasis='calc('+L.sizes[i]+'% - 1px)';
    const im=el('img');im.src=e.img;im.alt='';im.draggable=false;imgXform(im,L.im[id],e);w.appendChild(im);box.appendChild(w)});
  return box}
/* כפתור בחלון של יום: עריכת התמונות שכבר ביום (כמו הכפתור הקטן 🖼 בתא) */
function dayImgsBtn(date){if(!date)return '';const n=dayImgEvents(date).length;if(!n)return '';
  return '<div class="row"><button class="btn di-open" type="button" data-di-open="'+date+'">🖼 עריכת התמונות ביום ('+n+'): סידור, גודל, היפוך</button></div>'}
document.addEventListener('click',e=>{const b=e.target.closest('[data-di-open]');if(!b)return;const mb=b.closest('.modal-back');if(mb)mb.remove();openDayImages(b.dataset.diOpen)});
function dayImgEvents(date){const d=dateFromIso(date);return eventsOn(d,new HDate(d)).filter(e=>e.img)}
function openDayImages(date){
  let evs=dayImgEvents(date);const cell=stage.querySelector('[data-date="'+date+'"]');
  const r=cell?cell.getBoundingClientRect():{width:4,height:3},ratio=Math.max(.35,Math.min(2.2,r.height/r.width));
  let L=dayLayout(date,evs);const removed=[],pending=[];
  const d0=dateFromIso(date),hd=new HDate(d0);
  const m=modal('<h3>התמונות ביום הזה<small>'+esc(gem(hd.getDate())+' '+hebMonthName(hd.getMonth(),isLeap(hd.getFullYear()))+' · '+d0.getDate()+(EN?' ':' ב')+GREG_MONTHS[d0.getMonth()])+'</small></h3>'+
    '<div class="di-dirs" id="diDirs" role="radiogroup" aria-label="חלוקה"></div>'+
    '<p class="hint">גוררים תמונה כדי להזיז אותה בתוך השטח שלה. מושכים את הפסים כדי לשנות כמה מקום כל תמונה תופסת. ליד כל תמונה: הגדלה והקטנה, היפוך, ו"כל התמונה" כדי לראות אותה בלי חיתוך.</p>'+
    '<div class="di-wrap"><div class="di-prev" id="diPrev"></div></div>'+
    '<div class="di-list" id="diList"></div>'+
    '<div class="row"><button class="btn" type="button" id="diAdd">＋ הוספת תמונה ליום</button><button class="btn" type="button" id="diEq">חלוקה שווה</button></div>'+
    '<div class="row"><button class="btn primary" type="button" id="diSave">שמירה</button><button class="btn" type="button" data-close>ביטול</button></div>');
  m.querySelector('.modal').classList.add('wide');
  const q=x=>m.querySelector(x),prev=q('#diPrev');
  const W=()=>Math.min(560,m.querySelector('.di-wrap').clientWidth||520);
  /* סמל קטן לכל חלוקה */
  const ic=d=>{const b='<svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true" fill="currentColor">',e='</svg>',R=(x,y,w,h)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2"/>';
    return b+(d==='row'?R(1,1,8,18)+R(10,1,8,18)+R(19,1,8,18):d==='col'?R(1,1,26,5)+R(1,7.5,26,5)+R(1,14,26,5):d==='grid'?R(1,1,12.5,8.5)+R(14.5,1,12.5,8.5)+R(1,10.5,12.5,8.5)+R(14.5,10.5,12.5,8.5):d==='g21'?R(1,1,12.5,8.5)+R(14.5,1,12.5,8.5)+R(1,10.5,26,8.5):R(1,1,26,8.5)+R(1,10.5,12.5,8.5)+R(14.5,10.5,12.5,8.5))+e};
  function split(cls,attrs,style){const h=el('div','di-split '+cls);Object.assign(h.dataset,attrs);Object.assign(h.style,style);h.title='משכו כדי לשנות גודל';prev.appendChild(h)}
  function draw(){
    const ok=diDirsFor(L.order.length);
    q('#diDirs').innerHTML=ok.map(d=>'<button type="button" role="radio" aria-checked="'+(d===L.dir)+'" class="di-d'+(d===L.dir?' on':'')+'" data-dir="'+d+'">'+ic(d)+'<span>'+DI_DIRS[d]+'</span></button>').join('');
    const maxH=Math.max(180,innerHeight*0.42),w=Math.min(W(),maxH/ratio);prev.style.width=Math.round(w)+'px';prev.style.height=Math.round(w*ratio)+'px';
    prev.innerHTML='';
    if(!L.order.length){prev.innerHTML='<p class="hint" style="margin:auto">אין תמונות ביום הזה.</p>';q('#diList').innerHTML='';return}
    prev.appendChild(dayImgsEl(date,evs,L));
    const n=L.order.length;
    if(!diGrid(L.dir)&&n>1){let acc=0;for(let i=0;i<n-1;i++){acc+=L.sizes[i];split('di-'+L.dir,{i},L.dir==='row'?{insetInlineStart:'calc('+acc+'% - 6px)'}:{top:'calc('+acc+'% - 6px)'})}}
    if(diGrid(L.dir)){
      if(Math.ceil(n/2)===2)split('di-col',{g:'r'},{top:'calc('+L.gr+'% - 6px)'});
      const v={insetInlineStart:'calc('+L.gc+'% - 6px)'};
      if(L.dir==='g21'){v.top='0';v.bottom=(100-L.gr)+'%'}else if(L.dir==='g12'){v.top=L.gr+'%';v.bottom='0'}
      split('di-row',{g:'c'},v);
    }
    q('#diList').innerHTML=L.order.map((id,i)=>{const e=evs.find(x=>x.id===id),t=L.im[id]||{};return '<div class="di-it" data-id="'+id+'"><img src="'+e.img+'" alt=""><span class="di-n">'+(i+1)+'. '+esc(e.name||'תמונה')+'</span>'+
      '<button type="button" class="x" data-z="1" aria-label="הגדלה">＋</button><button type="button" class="x" data-z="-1" aria-label="הקטנה">−</button>'+
      '<button type="button" class="x di-tg'+(t.f?' on':'')+'" data-flip="1" aria-pressed="'+!!t.f+'" title="היפוך התמונה (מראה)">⇋ היפוך</button>'+
      '<button type="button" class="x di-tg'+(t.c?' on':'')+'" data-fit="1" aria-pressed="'+!!t.c+'" title="לראות את כל התמונה, בלי חיתוך">▣ כל התמונה</button>'+
      (!diGrid(L.dir)?'<span class="di-pct">'+Math.round(L.sizes[i])+'%</span>':'')+
      '<button type="button" class="x" data-mv="-1"'+(i===0?' disabled':'')+' aria-label="להזיז קודם">→</button><button type="button" class="x" data-mv="1"'+(i===n-1?' disabled':'')+' aria-label="להזיז אחרי">←</button>'+
      '<button type="button" class="x di-del" data-del="1" aria-label="הסרת התמונה מהיום">✕</button></div>'}).join('');
  }
  q('#diDirs').addEventListener('click',e=>{const b=e.target.closest('[data-dir]');if(b){L.dir=b.dataset.dir;draw()}});
  q('#diEq').onclick=()=>{L.sizes=L.order.map(()=>100/L.order.length);L.gr=50;L.gc=50;draw()};
  q('#diList').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.closest('[data-id]').dataset.id,i=L.order.indexOf(id);
    const t=L.im[id]={...(L.im[id]||{})};
    if(b.dataset.z)t.z=Math.max(1,Math.min(4,+((t.z??1)+(+b.dataset.z)*0.25).toFixed(2)));
    if(b.dataset.flip)t.f=t.f?0:1;
    if(b.dataset.fit){t.c=t.c?0:1;if(t.c)t.z=1}
    if(b.dataset.mv){const j=i+ +b.dataset.mv;if(j>=0&&j<L.order.length){[L.order[i],L.order[j]]=[L.order[j],L.order[i]];[L.sizes[i],L.sizes[j]]=[L.sizes[j],L.sizes[i]]}}
    if(b.dataset.del){L.order.splice(i,1);const sz=L.sizes.splice(i,1)[0]||0;if(L.sizes.length){const k=Math.max(0,i-1);L.sizes[k]+=sz}removed.push(id);
      const ok=diDirsFor(L.order.length);if(L.order.length>1&&!ok.includes(L.dir))L.dir=L.order.length===3?'g21':'row'}
    draw()});
  /* הזזת תמונה בתוך השטח שלה, ומשיכת הפסים */
  prev.addEventListener('pointerdown',e=>{
    const sp=e.target.closest('.di-split');
    if(sp){e.preventDefault();sp.setPointerCapture(e.pointerId);const rect=prev.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;let mv;
      if(sp.dataset.g){const g=sp.dataset.g,v0=g==='r'?L.gr:L.gc;
        mv=ev=>{const v=g==='r'?v0+(ev.clientY-sy)/rect.height*100:v0-(ev.clientX-sx)/rect.width*100;const c=Math.max(15,Math.min(85,v));if(g==='r')L.gr=c;else L.gc=c;
          const box=prev.querySelector('.c-imgs');box.style.gridTemplateColumns=L.gc+'fr '+(100-L.gc)+'fr';if(Math.ceil(L.order.length/2)===2)box.style.gridTemplateRows=L.gr+'fr '+(100-L.gr)+'fr';
          if(g==='r')sp.style.top='calc('+L.gr+'% - 6px)';else sp.style.insetInlineStart='calc('+L.gc+'% - 6px)'}}
      else{const i=+sp.dataset.i,a0=L.sizes[i],b0=L.sizes[i+1];
        mv=ev=>{const dPct=L.dir==='row'?-(ev.clientX-sx)/rect.width*100:(ev.clientY-sy)/rect.height*100;const a=Math.max(10,Math.min(a0+b0-10,a0+dPct));L.sizes[i]=a;L.sizes[i+1]=a0+b0-a;
          const box=prev.querySelector('.c-imgs');box.children[i].style.flexBasis='calc('+a+'% - 1px)';box.children[i+1].style.flexBasis='calc('+(a0+b0-a)+'% - 1px)';
          let acc=0;prev.querySelectorAll('.di-split').forEach((h,k)=>{acc+=L.sizes[k];if(L.dir==='row')h.style.insetInlineStart='calc('+acc+'% - 6px)';else h.style.top='calc('+acc+'% - 6px)'})}}
      const up=()=>{sp.removeEventListener('pointermove',mv);sp.removeEventListener('pointerup',up);draw()};
      sp.addEventListener('pointermove',mv);sp.addEventListener('pointerup',up);return}
    const w=e.target.closest('.c-im');if(!w)return;e.preventDefault();w.setPointerCapture(e.pointerId);
    const id=w.dataset.id,ev0=evs.find(x=>x.id===id),t=L.im[id]={...(L.im[id]||{})},im=w.querySelector('img'),rect=w.getBoundingClientRect(),sx=e.clientX,sy=e.clientY;
    const x0=t.x??50,y0=t.y??(ev0.imgPos??50),z=t.z??1,fx=t.f?-1:1;
    const mv=ev=>{t.x=Math.max(0,Math.min(100,x0-fx*(ev.clientX-sx)/rect.width*100*1.4/z));t.y=Math.max(0,Math.min(100,y0-(ev.clientY-sy)/rect.height*100*1.4/z));imgXform(im,t,ev0)};
    const up=()=>{w.removeEventListener('pointermove',mv);w.removeEventListener('pointerup',up);t.x=Math.round(t.x??x0);t.y=Math.round(t.y??y0)};
    w.addEventListener('pointermove',mv);w.addEventListener('pointerup',up)});
  prev.addEventListener('wheel',e=>{const w=e.target.closest('.c-im');if(!w)return;e.preventDefault();const id=w.dataset.id,t=L.im[id]={...(L.im[id]||{})};
    t.z=Math.max(1,Math.min(4,+((t.z??1)*(e.deltaY<0?1.08:1/1.08)).toFixed(3)));imgXform(w.querySelector('img'),t,evs.find(x=>x.id===id))},{passive:false});
  /* תמונה נוספת ליום: אירוע "תמונה בלבד" */
  q('#diAdd').onclick=()=>{const f=async v=>{if(!v.img)return;
      const o={id:uid(),kind:'other',name:'',rec:'once',date,img:v.img,imgFit:'cover',imgPos:50,textTone:'auto',imgLum:null,edit:null};if(state.events.length+pending.length>=PLAN().events){openUpgrade('events');return}pending.push(o);
      evs=evs.concat(o);L.order.push(o.id);L.sizes=L.order.map(()=>100/L.order.length);
      const ok=diDirsFor(L.order.length);if(!ok.includes(L.dir))L.dir=L.order.length===4?'grid':L.order.length===3&&diGrid(L.dir)?'g21':'row';draw()};f.maxPx=QPX('day');pickImage(f)};
  q('#diSave').onclick=()=>{
    pending.filter(o=>L.order.includes(o.id)).forEach(o=>state.events.push(o));
    removed.forEach(id=>{const e=state.events.find(x=>x.id===id);if(!e)return;if(!e.name)state.events=state.events.filter(x=>x!==e);else{e.img=null;e.imgLum=null;e.edit=null}});
    state.dayImgs=state.dayImgs||{};
    if(L.order.length)state.dayImgs[date]={dir:L.dir,order:L.order,sizes:L.sizes.map(x=>Math.round(x*10)/10),gr:Math.round(L.gr),gc:Math.round(L.gc),im:Object.fromEntries(Object.entries(L.im).filter(([id])=>L.order.includes(id)))};else delete state.dayImgs[date];
    save();renderEvents();render();fillLums();m.remove()};
  requestAnimationFrame(draw);
}
/* כפתור קטן בתא שיש בו תמונה: פותח את סידור התמונות */
stage.addEventListener('click',e=>{const b=e.target.closest('[data-dayimgs]');if(!b)return;e.preventDefault();e.stopPropagation();openDayImages(b.dataset.dayimgs)},true);

/* ---------- המסלול המהיר: מגש תמונות, הוספה מהירה ליום, ושיתוף עם המשפחה ---------- */
/* מגש התמונות: מעלים הרבה תמונות בבת אחת, ומשם גוררים כל תמונה לחודש או ליום.
   בטלפון: נוגעים בתמונה, ואז במקום שבו היא צריכה להיות. המגש נשמר בדפדפן בנפרד מהלוח (TKEY). */
const TKEY=SKEY+'-tray';
let TRAY=[],TSEL=null;
function trayItem(id){return TRAY.find(t=>t.id===id)}
function traySave(){idbSet(TKEY,TRAY)}
async function trayLoad(){if(CDMODE||SNAPVIEW)return;const v=await idbGet(TKEY);TRAY=Array.isArray(v)?v:[];trayDraw();trayShow()}
function thumbOf(img){return new Promise(res=>{const im=new Image();im.onload=()=>{const k=Math.min(1,220/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',0.7))};im.onerror=()=>res(img);im.src=img})}
async function trayAdd(img,meta){const t={id:'t'+uid(),img,th:await thumbOf(img),used:0,...(meta||{})};TRAY.push(t);return t}
function trayShow(){const b=$('#tray');if(!b)return;const s=state.s,mode=s.uiMode,n=+s.step||1;
  const on=!CDMODE&&!SNAPVIEW&&((mode==='wizard'&&(n===5||(SIMPLE&&n<8)))||(mode==='adv'&&(TRAY.length>0||!!s.trayOn)));
  const open=on&&(s.trayMin===false||(s.trayMin==null&&(n===5||TRAY.some(t=>!t.used)))),was=document.body.classList.contains('tray-open');b.hidden=!on;document.body.classList.toggle('tray-on',on);b.classList.toggle('min',!open);document.body.classList.toggle('tray-open',open);
  if(was!==open)setTimeout(()=>{try{fit()}catch(e){}},280);trayH()}
/* גובה המגש: כפתורי "הבא" ו"הקודם" והפאנל שבצד עולים מעליו */
function trayH(){const h=0;document.body.style.setProperty('--trayh',h+'px');try{fitSide()}catch(e){}}
try{new ResizeObserver(()=>trayH()).observe($('#tray'))}catch(e){}
function trayDraw(){const L=$('#trayList');if(!L)return;
  L.innerHTML=TRAY.length?TRAY.map(t=>'<div class="tray-i'+(t.used?' used':'')+(TSEL===t.id?' sel':'')+'" draggable="true" data-ti="'+t.id+'" role="button" tabindex="0" aria-pressed="'+(TSEL===t.id)+'" title="'+(t.from?'מאת '+esc(t.from)+' · ':'')+'גררו לחודש או ליום, או לחצו ואז בחרו מקום"><img src="'+t.th+'" alt="" draggable="false">'+(t.used?'<span class="tray-ok" aria-label="בשימוש">✓</span>':'')+(t.from?'<span class="tray-from">'+esc(t.from)+'</span>':'')+'<button type="button" class="tray-x" data-tx="'+t.id+'" aria-label="הסרה מהמגש">×</button></div>').join('')
    :'<div class="tray-empty"><b>המסלול המהיר:</b> ① מעלים את כל התמונות לכאן בבת אחת ② גוררים כל תמונה לחודש או ליום, או לוחצים "מילוי אוטומטי" ③ לוחצים על יום כדי להוסיף יום הולדת או אירוע</div>';
  const n=TRAY.filter(t=>!t.used).length;$('#trayTabN').textContent=n||'';$('#trayCount').textContent=TRAY.length?(n?n+' מחכות':'כולן בלוח ✓'):'';
  $('#trayFill').hidden=!TRAY.some(t=>!t.used)}
function traySelect(id){TSEL=TSEL===id?null:id;document.body.classList.toggle('tray-picking',!!TSEL);trayDraw();
  const bar=$('#trayPickBar');if(bar)bar.hidden=!TSEL}
function trayPlaced(id){const t=trayItem(id);if(t){t.used=1;traySave()}if(TSEL)traySelect(null);trayDraw()}
/* מקומות לתמונות: עמוד השער וכל המקומות בעמודים, לפי הסדר */
function photoKeys(){return (state.s.cover?['cover']:[]).concat([...new Set(RS.slots)])}
function slotHas(k){const o=k==='cover'?state.cover:state.slots[k];return !!(o&&o.img)}
function slotPut(k,img){const o={img,edit:null,zoom:1,px:50,pos:50};if(k==='cover')state.cover={...state.cover,...o};else state.slots[k]={...(state.slots[k]||{}),...o}}
function trayFill(){const free=TRAY.filter(t=>!t.used);let i=0;
  for(const k of photoKeys()){if(i>=free.length)break;if(!slotHas(k)){slotPut(k,free[i].img);free[i].used=1;i++}}
  traySave();save();render();trayDraw();
  const left=free.length-i,few=photoKeys().length<4;
  trayNote((i?(i===1?'נכנסה תמונה אחת':'נכנסו '+i+' תמונות')+' למקומות הריקים. ':'אין מקומות ריקים לתמונות. ')+(left&&few?'כדי שתהיה תמונה לכל חודש, בחרו בשלב "עיצוב" פריסה עם תמונה. ':'')+(left?'אפשר גם לגרור תמונה ליום, או על תמונה קיימת כדי להחליף.':''))}
function trayNote(t){let n=$('#trayNote');if(!n)return;n.textContent=t;n.hidden=false;clearTimeout(trayNote.t);trayNote.t=setTimeout(()=>n.hidden=true,6000)}
function trayHelp(){modal('<h3>המסלול המהיר<small>לוח עם תמונות ותאריכים בכמה דקות</small></h3><ol class="fast-steps">'+
  '<li><b>מעלים את כל התמונות בבת אחת.</b> לוחצים "הוספת תמונות" ובוחרים כמה שרוצים. הן נכנסות למגש בתחתית המסך.</li>'+
  '<li><b>שמים כל תמונה במקום.</b> גוררים תמונה מהמגש לחודש (לראש העמוד) או ליום מסוים. בטלפון: נוגעים בתמונה ואז במקום. "מילוי אוטומטי" ממלא את כל החודשים הריקים לפי הסדר.</li>'+
  '<li><b>מוסיפים תאריכים.</b> לוחצים על יום בלוח, כותבים שם ובוחרים: יום הולדת, יום נישואין, יום שנה או אירוע. הוא יחזור כל שנה לפי התאריך העברי או הלועזי.</li>'+
  '<li><b>מזמינים את המשפחה.</b> "שיתוף עם המשפחה" שולח קישור, וכל אחד מוסיף ימי הולדת ותמונות בלי הרשמה.</li>'+
  '<li><b>מדפיסים.</b> בשלב האחרון מורידים קובץ PDF.</li></ol>'+
  '<p class="hint">הכל נשמר לבד בדפדפן. רוצים יותר אפשרויות? <a href="app.html">בבונה המלא</a> יש זמני היום לפי המנהג, לימוד יומי, דברי הימים ועיצוב חופשי.</p>'+
  '<div class="row"><button class="btn primary" type="button" data-close>הבנתי</button></div>')}
$('#trayAdd').onclick=()=>{const f=$('#fileMany');f.value='';f.onchange=async()=>{
  const files=[...f.files].filter(x=>x.type.startsWith('image/')).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
  trayNote('מכין '+files.length+' תמונות…');for(const x of files){await trayAdd(await compress(x));trayDraw()}traySave();
  trayNote(files.length?'נוספו '+files.length+' תמונות. גררו כל תמונה לחודש או ליום, או לחצו "מילוי אוטומטי".':'')};f.click()};
$('#trayFill').onclick=trayFill;$('#trayHelp').onclick=trayHelp;
$('#trayMin').onclick=()=>{state.s.trayMin=true;save();trayShow()};
$('#trayTab').onclick=()=>{state.s.trayMin=document.body.classList.contains('tray-open');save();trayShow()};
$('#trayPickX').onclick=()=>traySelect(null);
$('#trayList').addEventListener('click',e=>{const x=e.target.closest('[data-tx]');if(x){e.stopPropagation();TRAY=TRAY.filter(t=>t.id!==x.dataset.tx);if(TSEL===x.dataset.tx)traySelect(null);traySave();trayDraw();return}
  const t=e.target.closest('[data-ti]');if(t)traySelect(t.dataset.ti)});
$('#trayList').addEventListener('keydown',e=>{const t=e.target.closest('[data-ti]');if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();traySelect(t.dataset.ti)}});
$('#trayList').addEventListener('dragstart',e=>{const t=e.target.closest('[data-ti]');if(!t)return;e.dataTransfer.setData('text/x-mltray',t.dataset.ti);e.dataTransfer.effectAllowed='copy';document.body.classList.add('tray-dragging')});
$('#trayList').addEventListener('dragend',()=>document.body.classList.remove('tray-dragging'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&TSEL)traySelect(null)});
/* תמונה מהמגש שנגררה או נבחרה: למקום של תמונה (setv של התיבה) או ליום */
function trayDropId(e){try{return e.dataTransfer&&e.dataTransfer.getData('text/x-mltray')||''}catch(err){return ''}}
async function trayToDay(date,id){const t=trayItem(id);if(!t)return;const img=await compress(await (await fetch(t.img)).blob(),QPX('day'));quickEvent({date,img,trayId:id})}
stage.addEventListener('click',e=>{if(!TSEL)return;
  const box=e.target.closest('.pg-img');
  if(box&&box._setv){e.preventDefault();e.stopPropagation();const t=trayItem(TSEL);if(t){box._setv({img:t.img,edit:null,zoom:1,px:50,pos:50});trayPlaced(t.id)}return}
  const c=e.target.closest('[data-date]');if(c){e.preventDefault();e.stopPropagation();const id=TSEL;traySelect(null);trayToDay(c.dataset.date,id)}},true);

/* הוספה מהירה ליום (בבונה הפשוט, ובכל מקום שנגררת תמונה מהמגש ליום) */
const QK=[['birthday','יום הולדת'],['anniversary','יום נישואין'],['yahrzeit','יום שנה'],['event','אירוע']];
function quickEvent({date,img,trayId}){
  const base=dateFromIso(date),hd=new HDate(base),leap=isLeap(hd.getFullYear());
  const hTxt=gem(hd.getDate())+' '+hebMonthName(hd.getMonth(),leap),gTxt=base.getDate()+(EN?' ':' ב')+GREG_MONTHS[base.getMonth()];
  let kind=img?'event':'birthday',rec=KINDS[kind].rec,pic=img||null;
  const m=modal('<h3>'+esc(hTxt+' '+hebYearStr(hd.getFullYear()))+'<small>'+esc(gTxt+' '+base.getFullYear())+'</small></h3>'+
    '<div class="q-kinds" role="radiogroup" aria-label="סוג">'+QK.map(([k,n])=>'<label><input type="radio" name="qK" value="'+k+'"'+(k===kind?' checked':'')+'><span>'+n+'</span></label>').join('')+'</div>'+
    '<label class="fld"><span id="qAsk"></span><input type="text" id="qName" maxlength="60" autocomplete="off"></label>'+
    '<div class="seg q-rec" role="radiogroup" aria-label="חוזר">'+
      '<label><input type="radio" name="qR" value="heb"><span>כל שנה ב־'+esc(hTxt)+'</span></label>'+
      '<label><input type="radio" name="qR" value="greg"><span>כל שנה ב־'+esc(gTxt)+'</span></label>'+
      '<label><input type="radio" name="qR" value="once"><span>רק השנה</span></label></div>'+
    '<div class="q-img"><img id="qImg" alt=""><button type="button" class="btn" id="qPic"></button><button type="button" class="btn" id="qPicX">הסרה</button></div>'+
    '<p class="hint" id="qMsg" aria-live="polite"></p>'+
    dayImgsBtn(date)+
    '<div class="row"><button class="btn primary" type="button" id="qSave">הוספה</button><button class="btn" type="button" id="qMore">עוד אפשרויות</button><button class="btn" type="button" data-close>ביטול</button></div>');
  const q=x=>m.querySelector(x);
  const draw=()=>{const k=KINDS[kind];q('#qAsk').textContent=k.ask;q('#qName').placeholder=k.ph;
    m.querySelectorAll('input[name=qR]').forEach(r=>r.checked=r.value===rec);
    q('#qImg').hidden=q('#qPicX').hidden=!pic;if(pic)q('#qImg').src=pic;q('#qPic').textContent=pic?'החלפת תמונה':'📷 תמונה ליום (לא חובה)'};
  m.addEventListener('change',e=>{if(e.target.name==='qK'){kind=e.target.value;if(!q('#qName').value)rec=KINDS[kind].rec;draw()}if(e.target.name==='qR')rec=e.target.value});
  q('#qPic').onclick=()=>{const s=async v=>{pic=v.img;draw()};s.maxPx=QPX('day');pickImage(s)};
  q('#qPicX').onclick=()=>{pic=null;draw()};
  const build=()=>{const o={id:uid(),kind,name:q('#qName').value.trim(),rec,img:pic,imgFit:'cover',imgPos:50,textTone:'auto',imgLum:null,edit:null};
    if(rec==='heb'){o.day=hd.getDate();o.month=hd.getMonth();o.year=''}else if(rec==='greg'){o.day=base.getDate();o.month=base.getMonth()+1;o.year=''}else o.date=date;return o};
  const add=()=>{const o=build();if(!o.name&&!o.img){q('#qMsg').innerHTML='<span class="msg-bad">כתבו שם או הוסיפו תמונה.</span>';q('#qName').focus();return null}
    if(state.events.length>=PLAN().events){m.remove();openUpgrade('events');return null}
    state.events.push(o);if(trayId)trayPlaced(trayId);save();renderEvents();render();fillLums();return o};
  q('#qSave').onclick=()=>{if(add())m.remove()};
  q('#qName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();q('#qSave').click()}});
  q('#qMore').onclick=()=>{const has=q('#qName').value.trim()||pic;if(!has){m.remove();openEventEditor({date,img:pic||undefined});return}const o=add();if(o){m.remove();openEventEditor({id:o.id})}};
  draw();setTimeout(()=>q('#qName').focus(),30);
}

/* ---------- שיתוף עם המשפחה ---------- */
/* בעל הלוח (מחובר) יוצר קישור. מי שמקבל אותו מוסיף ימי הולדת ותמונות בדף share.html, בלי הרשמה.
   התוספות נכנסות ללוח כשבעל הלוח פותח אותו: אוטומטית, או אחרי אישור, לפי מה שבחר. */
let SHARE=null;
const cntEv=n=>n===1?'תאריך אחד':n+' תאריכים',cntPh=n=>n===1?'תמונה אחת':n+' תמונות';
function gotTxt(r){return (r.ev?cntEv(r.ev):'')+(r.ev&&r.ph?' ו־':'')+(r.ph?cntPh(r.ph)+' (במגש התמונות, בשלב "תמונות ואירועים")':'')}
async function shareApi(body){const h=await authHeaders();const r=await fetch('/api/user?fn=share',{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'http'),{code:j.error||r.status});return j}
const shareLink=s=>window.location.origin+'/share.html?k='+s.id;
function shareMonths(){return photoKeys().map(k=>({k,t:slotLabel(k)}))}
function shareToast(t){const d=el('button','cd-toast',esc(t));d.type='button';document.body.appendChild(d);requestAnimationFrame(()=>d.classList.add('on'));const off=()=>{d.classList.remove('on');setTimeout(()=>d.remove(),400)};d.onclick=off;setTimeout(off,8000)}
function shareBadge(){const b=$('#shareN');if(!b)return;const n=SHARE&&SHARE.items?SHARE.items.length:0;b.hidden=!n;b.textContent=n}
/* קבלת תוספות: אירועים ללוח, תמונות למגש (ואם ביקשו חודש ריק, ישר לחודש) */
async function shareAccept(items){
  const ok=[];let ev=0,ph=0,full=false;
  for(const it of items){
    try{
      if(it.kind==='event'){
        if(state.events.length>=PLAN().events){full=true;break}
        const d=it.data||{},o={id:uid(),kind:KINDS[d.kind]?d.kind:'event',name:String(d.name||''),rec:d.rec,img:null,imgFit:'cover',imgPos:50,textTone:'auto',imgLum:null,edit:null,from:it.who||''};
        if(d.rec==='once')o.date=d.date;else{o.day=d.day;o.month=d.month;o.year=d.year||''}
        if(it.url){o.img=await urlToData(it.url,QPX('day'));o.imgLum=await imageLum(o.img)}
        state.events.push(o);ev++;
      }else if(it.url){
        const img=await urlToData(it.url,QPX('page')),k=it.data&&it.data.month;const t=await trayAdd(img,{from:it.who||''});
        if(k&&photoKeys().includes(k)&&!slotHas(k)){slotPut(k,img);t.used=1}ph++;
      }
      ok.push(it.id);
    }catch(e){console.warn('share item',e)}
  }
  if(ok.length){traySave();save();renderEvents();render();trayDraw();trayShow();
    try{const j=await shareApi({action:'done',sid:state.s.shareId,ids:ok,st:'ok'});SHARE=j}catch(e){}}
  shareBadge();
  return {ev,ph,full,n:ok.length};
}
async function shareCheck(){
  if(!user||!state.s.shareId||CDMODE||SNAPVIEW)return;
  try{SHARE=await shareApi({action:'get',sid:state.s.shareId})}catch(e){return}
  if(!SHARE.share){delete state.s.shareId;save();SHARE=null;return}
  if(SHARE.items.length&&SHARE.share.auto){const r=await shareAccept(SHARE.items);if(r.n){trayNote('נוסף מהמשפחה: '+gotTxt(r));shareToast('נוסף ללוח מהמשפחה: '+gotTxt(r))}}
  shareBadge();
}
function itemHTML(it){const d=it.data||{};const K={birthday:'יום הולדת',anniversary:'יום נישואין',yahrzeit:'יום שנה',event:'אירוע',other:'אירוע'};
  let what;
  if(it.kind==='event'){const when=d.rec==='heb'?gem(d.day)+' '+hebMonthOpt(d.month)+(d.year?' '+hebYearStr(d.year):''):d.rec==='greg'?d.day+'.'+d.month+(d.year?'.'+d.year:''):(d.date||'').split('-').reverse().join('.');
    what='<b>'+esc(K[d.kind]||'אירוע')+': '+esc(d.name)+'</b><span>'+esc(when)+(d.rec==='heb'?' (עברי)':d.rec==='greg'?' (לועזי)':'')+'</span>'}
  else{const mo=(SHARE.share.months||[]).find(x=>x.k===d.month);what='<b>תמונה'+(mo?' ל'+esc(mo.t):'')+'</b>'+(d.note?'<span>'+esc(d.note)+'</span>':'')}
  return '<li class="sh-it" data-sid="'+it.id+'">'+(it.url?'<img src="'+esc(it.url)+'" alt="" loading="lazy">':'<span class="sh-ic">'+(it.kind==='event'?'🎂':'📷')+'</span>')+
    '<div class="sh-t">'+what+'<small>מאת '+esc(it.who||'')+'</small></div><button type="button" class="btn" data-acc="'+it.id+'">הוספה</button><button type="button" class="btn sh-no" data-rej="'+it.id+'" aria-label="לא להוסיף">✕</button></li>'}
async function shareModal(){
  if(CDMODE)return;
  if(!sb){modal('<h3>השיתוף לא זמין כרגע</h3><p class="hint">לא הצלחנו לטעון את מערכת הכניסה. בדקו את החיבור לאינטרנט ורעננו את הדף.</p><div class="row"><button class="btn" type="button" data-close>סגירה</button></div>');return}
  if(!user){loginModal('כדי לשתף את הלוח עם המשפחה צריך להיכנס לחשבון (בחינם). הלוח יישמר בחשבון, והתוספות של המשפחה יגיעו אליו.');return}
  const m=modal('<h3>שיתוף עם המשפחה<small>שולחים קישור, וכל אחד מוסיף ימי הולדת, אירועים ותמונות, בלי הרשמה</small></h3><div id="shBody"><p class="hint">טוען…</p></div>');
  m.querySelector('.modal').classList.add('wide');
  const body=m.querySelector('#shBody'),q=x=>m.querySelector(x);
  const fail=e=>{body.innerHTML='<p class="msg-bad">'+(e&&e.code==='setup'?'השיתוף עוד לא הופעל באתר (חסרות טבלאות במסד הנתונים).':'לא הצלחנו להתחבר. נסו שוב בעוד רגע.')+'</p><div class="row"><button class="btn" type="button" data-close>סגירה</button></div>'};
  const intro=()=>{body.innerHTML='<ol class="fast-steps"><li>יוצרים קישור ושולחים אותו בוואטסאפ או במייל.</li><li>כל מי שמקבל אותו מוסיף ימי הולדת, ימי נישואין, אירועים ותמונות, ובוחר לאיזה חודש.</li><li>התוספות מגיעות ללוח שלכם: אתם מאשרים כל אחת, או שהן נכנסות לבד.</li></ol>'+
      '<label class="fld"><span>השם שלכם, כפי שיופיע בהזמנה</span><input type="text" id="shOwner" maxlength="40" placeholder="למשל: משפחת כהן"></label>'+
      '<label class="chk"><input type="checkbox" id="shAuto"> להכניס את התוספות ללוח בלי אישור שלי</label>'+
      '<div class="row"><button class="btn primary" type="button" id="shCreate">יצירת קישור לשיתוף</button><button class="btn" type="button" data-close>ביטול</button></div>';
    q('#shCreate').onclick=async()=>{const b=q('#shCreate');b.disabled=true;b.textContent='יוצר…';
      try{if(!state.s.cloudId)await cloudSave().catch(()=>{});
        SHARE=await shareApi({action:'create',title:calTitle(),owner:q('#shOwner').value.trim(),auto:q('#shAuto').checked,months:shareMonths(),cal:state.s.calType});
        state.s.shareId=SHARE.share.id;save();draw()}catch(e){fail(e)}}};
  const draw=()=>{const s=SHARE.share,link=shareLink(s),items=SHARE.items||[],used=SHARE.used||{photos:0};
    const msg=(s.owner?s.owner+' מזמינים אתכם':'הוזמנתם')+' להוסיף ימי הולדת, אירועים ותמונות ללוח השנה שלנו: '+link;
    body.innerHTML='<div class="sh-link"><input type="text" id="shUrl" readonly value="'+esc(link)+'" aria-label="הקישור לשיתוף" dir="ltr"><button class="btn primary" type="button" id="shCopy">העתקה</button>'+
      '<a class="btn sh-wa" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(msg)+'">וואטסאפ</a><a class="btn" href="mailto:?subject='+encodeURIComponent('מוסיפים ללוח השנה המשפחתי')+'&body='+encodeURIComponent(msg)+'">מייל</a></div>'+
      '<label class="chk"><input type="checkbox" id="shAuto"'+(s.auto?' checked':'')+'> להכניס תוספות ללוח בלי אישור שלי</label>'+
      '<label class="chk"><input type="checkbox" id="shOn"'+(s.active?' checked':'')+'> הקישור פעיל (אפשר להוסיף דרכו)</label>'+
      '<p class="hint">תמונות: נשלחו '+used.photos+' מתוך '+SHARE.limit+' שאפשר לקבל ללוח הזה'+(SHARE.limit<=5?' (במסלול המשפחתי והמלא: הרבה יותר)':'')+'. התמונות שתאשרו נכנסות למגש התמונות, ואם ביקשו חודש שעדיין אין בו תמונה, ישר לחודש.</p>'+
      '<h4 class="sh-h">מחכות לאישור ('+items.length+')</h4>'+(items.length?'<div class="row"><button class="btn primary" type="button" id="shAll">הוספת הכל ללוח</button></div><ul class="sh-list">'+items.map(itemHTML).join('')+'</ul>':'<p class="hint">עוד לא הגיעו תוספות. אחרי ששולחים את הקישור, מה שהמשפחה מוסיפה יופיע כאן.</p>')+
      '<p class="hint" id="shMsg" aria-live="polite"></p><div class="row"><button class="btn" type="button" id="shRef">רענון</button><button class="btn" type="button" data-close>סגירה</button></div>';
    q('#shCopy').onclick=()=>{const i=q('#shUrl');i.select();try{navigator.clipboard.writeText(i.value)}catch(e){document.execCommand('copy')}q('#shCopy').textContent='הועתק ✓'};
    const set=async p=>{try{SHARE=await shareApi({action:'set',sid:s.id,...p});draw()}catch(e){q('#shMsg').textContent='לא נשמר. נסו שוב.'}};
    q('#shAuto').onchange=e=>set({auto:e.target.checked});q('#shOn').onchange=e=>set({active:e.target.checked});
    q('#shRef').onclick=async()=>{try{SHARE=await shareApi({action:'get',sid:s.id});shareBadge();draw()}catch(e){fail(e)}};
    const acc=async L=>{q('#shMsg').textContent='מוסיף…';const r=await shareAccept(L);draw();
      q('#shMsg').innerHTML=(r.n?'<span class="msg-ok">נוסף ללוח: '+gotTxt(r)+'.</span> ':'')+(r.full?'<span class="msg-bad">הגעתם למספר האירועים של המסלול. </span><button type="button" class="linkbtn" id="shUp">שדרוג מסלול</button>':'');
      const u=q('#shUp');if(u)u.onclick=()=>{m.remove();openUpgrade('events')}};
    if(q('#shAll'))q('#shAll').onclick=()=>acc(SHARE.items);
    m.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{b.disabled=true;acc(SHARE.items.filter(x=>String(x.id)===b.dataset.acc))});
    m.querySelectorAll('[data-rej]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{SHARE=await shareApi({action:'done',sid:s.id,ids:[+b.dataset.rej],st:'no'});shareBadge();draw()}catch(e){b.disabled=false}});
  };
  try{
    if(state.s.shareId){SHARE=await shareApi({action:'get',sid:state.s.shareId});
      if(!SHARE.share){delete state.s.shareId;save();intro();return}
      const mo=shareMonths();if(JSON.stringify(mo)!==JSON.stringify(SHARE.share.months||[])||calTitle()!==SHARE.share.title)shareApi({action:'set',sid:state.s.shareId,months:mo,title:calTitle()}).catch(()=>{});
      shareBadge();draw()}
    else intro();
  }catch(e){fail(e)}
}
$('#shareBtn').onclick=shareModal;
/* כפתור "טקסט על הדף": עובר לעיצוב החופשי ומוסיף תיבת כיתוב לעמוד שרואים */
function fxQuickAdd(kind,key){const s=state.s,on=fxOn();if(!on){if(s.uiMode==='wizard'){if(+s.step!==7)goStep(7)}else{s.fxOn=true;save();applyMode()}}
  setTimeout(()=>{try{fxBoxAdd(kind,key)}catch(e){}},on?0:350)}
$('#addTextTop').onclick=()=>fxQuickAdd('text');
document.addEventListener('click',e=>{const b=e.target.closest('[data-fxquick]');if(b){e.preventDefault();e.stopPropagation();const w=b.closest('.sheet-wrap');fxQuickAdd(b.dataset.fxquick,w&&w.dataset.key)}},true);

/* ---------- מיקום וזמנים בבונה הפשוט, וזמנים לעוד ערים ---------- */
function cityOpts(cur,withNone){let h=withNone?'<option value="">בלי מיקום (בלי זמנים)</option>':'';
  if(state.s.custom)h+='<optgroup label="מיקום שלי">'+opt('custom',state.s.custom.name||'מיקום מותאם')+'</optgroup>';
  for(const g of Object.keys(CITY_ROWS)){const rows=CITIES.filter(c=>c.group===g);if(rows.length)h+='<optgroup label="'+g+'">'+rows.map(c=>opt(c.id,c.name)).join('')+'</optgroup>'}return h}
function locSync(){const s=state.s,sc=$('#sCity');
  if(sc){if(!sc.options.length||sc.dataset.cu!==String(!!s.custom)){sc.innerHTML=cityOpts(s.city,true);sc.dataset.cu=String(!!s.custom)}sc.value=s.noTimes?'':s.city;
    $('#sLocHint').textContent=s.noTimes?'בלי מיקום הלוח בלי זמנים. בוחרים עיר, ונוספים השקיעה וזמני כניסת השבת ויציאתה.':'הזמנים לפי '+place().name+'.';
    $('#sTimes').hidden=!!s.noTimes;const zs=$('#sZsun');if(zs)zs.checked=!!(s.zmanim||{}).sunset;const zb=$('#sZshab');if(zb)zb.checked=!s.noShabTimes}
  document.querySelectorAll('[data-xlocs]').forEach(box=>{
    if(s.noTimes){box.innerHTML='';return}
    const X=s.xlocs||[];
    box.innerHTML='<div class="xl"><b>זמנים לעוד ערים</b><p class="hint">למשפחה שגרה בכמה ערים: ליד כל זמן (למשל השקיעה, הדלקת נרות ויציאת שבת) יופיע גם הזמן בערים האלה.</p>'+
      X.map((x,i)=>'<div class="xl-r"><input type="text" data-xn="'+i+'" value="'+esc(xName(x))+'" aria-label="השם שיופיע בלוח" maxlength="16"><span class="hint">'+esc((xPlace(x)||{}).name||'')+'</span><button type="button" class="x" data-xdel="'+i+'" aria-label="הסרה">✕</button></div>').join('')+
      (X.length<4?'<div class="xl-add"><select data-xadd><option value="">＋ הוספת עיר…</option>'+cityOpts('',false).replace('<optgroup label="מיקום שלי">'+opt('custom',(s.custom||{}).name||'מיקום מותאם')+'</optgroup>','')+'</select><button type="button" class="btn small" data-xgeo>📍 לפי מיקוד / כתובת</button></div>':'<p class="hint">אפשר עד 4 ערים נוספות.</p>')+'</div>'})}
document.addEventListener('change',e=>{const t=e.target,s=state.s;
  if(t.id==='sCity'){if(!t.value){s.noTimes=true;save();syncUI();render();return}locChosen();if(t.value!=='custom'){const c=CITIES.find(x=>x.id===t.value);if(c){s.candleMins=c.candle;s.il=c.il}}set('city',t.value);return}
  if(t.id==='sZsun'){s.zmanim={...(s.zmanim||{}),sunset:t.checked};save();render();return}
  if(t.id==='sZshab'){s.noShabTimes=!t.checked;save();render();return}
  if(t.matches&&t.matches('[data-xadd]')&&t.value){s.xlocs=(s.xlocs||[]).concat({id:t.value});save();render();return}
  if(t.matches&&t.matches('[data-xn]')){const x=(s.xlocs||[])[+t.dataset.xn];if(x){x.short=t.value.trim();save();render()}}});
document.addEventListener('click',e=>{const s=state.s;
  const d=e.target.closest('[data-xdel]');if(d){s.xlocs.splice(+d.dataset.xdel,1);save();render();return}
  if(e.target.closest('[data-xgeo]')&&window.MyLuachGeo){MyLuachGeo.open({en:EN,near:(lat,lng)=>{const n=nearest(lat,lng);return {tz:n.city.tz,el:n.city.el,km:n.km}}}).then(p=>{if(!p)return;const n=nearest(p.lat,p.lng);
    s.xlocs=(s.xlocs||[]).concat({custom:{name:p.name,lat:p.lat,lng:p.lng,el:p.el,tz:p.tz,il:p.il,candle:n.km<10?n.city.candle:(p.il?30:18)}});save();render()});return}
  if(e.target.closest('[data-geo]')){const g=$('#geoPick');if(g)g.click()}});

/* boot */
(async function(){
  fillStatic();bindReset();
  db=await idbOpen();
  /* הגעה לבונה הרגיל עם בקשה לספירה לאחור: עוברים לדף הספירה */
  {const h=window.location.hash||'';if(!CDMODE&&(h.startsWith('#countdown&')||h==='#preset-countdown')){window.location.replace(PGN('countdown.html')+(h==='#preset-countdown'?'':h));return}}
  const saved=SNAPVIEW?await new Promise(res=>{window.addEventListener('message',e=>{if(e.origin===window.location.origin&&e.data&&e.data.type==='snap')res(e.data.state)});window.opener.postMessage({type:'snap-ready'},window.location.origin)}):await idbGet(SKEY);
  if(saved)state=merge(DEFAULT,saved);
  else if(SIMPLE){state.s.cover=false;state.s.pageBg='month'}
  /* המסלול המהיר בלוח שכבר התחיל: שער ריק יורד (נשאר כפתור להוספה), ורקע עדין אם לא נבחר רקע */
  if(SIMPLE&&saved&&!state.s.fast1){const c=state.cover||{};if(!c.img&&!c.title)state.s.cover=false;if(!state.s.pageBg)state.s.pageBg='month';state.s.fast1=1}
  if(SIMPLE&&saved&&!state.s.fast2){if(!state.s.pageBg||state.s.pageBg==='soft')state.s.pageBg='month';state.s.fast2=1}
  if(SNAPVIEW){SNAPPLAN=(saved&&saved._snap&&saved._snap.plan)||'';state.s.uiMode='adv';document.body.classList.add('snapview');document.body.insertAdjacentHTML('afterbegin','<div class="snap-bar no-print">דוגמית של לוח שהורד · לקריאה בלבד · '+(saved&&saved._snap&&saved._snap.img?'התמונות מוקטנות':'בדוגמית הזאת לא נשמרו תמונות')+' · שינויים כאן לא נשמרים</div>')}
  if(CDMODE){const s=state.s;if(!saved||s.view!=='countdown'){Object.assign(s,{view:'countdown',layout:'full',theme:'block',accent:'#a3462b',size:'a4',orient:'portrait',zmanimMode:'none',cover:false})}s.view='countdown';document.body.classList.add('cd-app')}
  else if(state.s.view==='countdown')state.s.view='month';
  if(!state.s.uiMode)state.s.uiMode=saved?'adv':'wizard';
  if(state.s.wizardDone)state.s.uiMode='home';
  monthsCache=buildMonths();
  if(!state.s.zm){const s=state.s;s.zm={...ZM_PRESETS[s.zmPreset||'ashkenaz']};if(s.m_elev==='1'){s.zm.netz='elev';s.zm.shkia='elev';s.zmPreset='tuk'}if(s.m_havdalah==='72'){s.zm.motzash='72f';s.zmPreset='custom'}}
  if(state.s.yzVer!==2){const s2=state.s,lim=2693;const clean=o=>{if(!o)return o;const r={};for(const k in o){if(!/^\d+$/.test(k)||+k<lim)r[k]=o[k]}return r};s2.yzSel=s2.yzSel?clean(s2.yzSel):s2.yzSel;s2.yzHide=clean(s2.yzHide);state.yzEdit=clean(state.yzEdit);s2.yzVer=2}
  if(!state.s.yzInit){state.s.yzInit=true;['rambam','rashbi','gra','chafetz','babasali','besht','ramchal','rachel','chazonish','ovadia'].forEach(k=>delete state.s.gedolim[k]);yzSel();save()}
  if(!state.s.addAmnon){state.s.addAmnon=1;(state.s.yzLists||[]).forEach(l=>{if(l.sel&&!(state.s.yzHide||{})['7'])l.sel['7']=1});if(state.s.yzSel)state.s.yzSel['7']=1}
  if(!state.s.histPage2){state.s.histPage2=1;if((state.s.place||{}).yz==='col')state.s.place={...(state.s.place||{}),yz:'page'}}
  /* המסלול המהיר: עיצוב מעוגל, נוף לכל חודש, בלי עמודי דברי הימים בין החודשים, ומזמני היום רק השקיעה */
  if(SIMPLE&&!state.s.fast3){const s=state.s,fresh=!saved;
    if(fresh||(s.place||{}).yz==='page')s.place={...(s.place||{}),yz:'none'};
    const z=s.zmanim||{},dz=Object.keys(z).filter(k=>z[k]).sort().join(',');if(fresh||dz==='shma,sunrise,sunset')s.zmanim={sunset:true};
    if(fresh||!s.preset){const P=SIMPLE_PRESETS[0];Object.assign(s,{preset:P[0],theme:P[2],accent:P[3],headFont:P[4],bodyFont:P[5],layout:P[6]})}
    if(fresh||!s.pageBg||s.pageBg==='soft')s.pageBg='month';
    s.fast3=1;save()}
  if(SIMPLE&&!state.s.fast5){state.s.dayMonth=true;state.s.fast5=1;save()}
  if(SIMPLE&&!state.s.fast4){const s=state.s;if(!saved||s.city==='jerusalem')s.noTimes=true;s.fast4=1;save()}
  loadFont(state.s.headFont);loadFont(state.s.bodyFont);Object.values(state.textStyles||{}).forEach(t=>t.ff&&loadFont(t.ff));
  /* הגעה מהלוח המקוון: #countdown&d=...&t=...&st=...&l=... */
  {const h=window.location.hash||'';if(h.startsWith('#countdown&')){const q=new URLSearchParams(h.slice(11)),s=state.s;s.view='countdown';s.cover=false;s.zmanimMode='none';
    if(q.get('d'))s.cdDate=q.get('d');if(q.get('f'))s.cdFrom=q.get('f');if(q.get('t'))s.cdTitle=q.get('t');if(q.get('st'))s.cdStyle=q.get('st');if(q.get('l'))s.cdLayout=q.get('l');if(q.get('u'))s.cdUnit=q.get('u');
    save();try{history.replaceState(null,'',window.location.pathname)}catch(e){}}}
  /* הגעה מהלוח המקוון: #city-ID&hy-שנה */
  {const m=/^#city-([a-z]+)(?:&hy-(\d{4}))?$/.exec(window.location.hash||'');if(m){const c=CITIES.find(x=>x.id===m[1]);const s=state.s;if(c){s.city=c.id;s.il=c.il;s.candleMins=c.candle}if(m[2]){s.calType='heb';s.hebYear=+m[2];s.hebStart=7}save();try{history.replaceState(null,'',window.location.pathname)}catch(e){}}}
  {const m=/^#preset-([a-z]+)$/.exec(window.location.hash||'');const P={
    scholar:{layout:'full',theme:'ink',accent:'#7a1f3d',size:'wall',orient:'landscape',view:'month',yzHist:true,yzMode:'all',place:{yz:'page',learn:'col'},learn:{daf:true,nach:true,box:true},zmanimMode:'custom',
      zmanim:{alot:true,sunrise:true,shma:true,tfila:true,chatzot:true,minchaG:true,plag:true,sunset:true,tzeit:true},
      zplace:{sunrise:{day:1,col:1},shma:{day:1,col:1},chatzot:{day:1,col:1},sunset:{day:1,col:1},alot:{col:1},tfila:{col:1},minchaG:{col:1},plag:{col:1},tzeit:{col:1}}},
    tfilot:{layout:'full',theme:'block',accent:'#2f4f6f',size:'wall',orient:'portrait',view:'month',zmanimMode:'table',place:{yz:'none',learn:'cell'},
      tfilot:[{id:'t1',name:'שחרית',days:'weekday',mode:'fixed',time:'06:30'},{id:'t2',name:'שחרית',days:'shabbatChag',mode:'fixed',time:'08:00'},{id:'t3',name:'מנחה',days:'sunThu',mode:'rel',off:15,dir:'before',base:'sunset',round:5,rdir:'down'},{id:'t4',name:'מנחה',days:'friday',mode:'rel',off:10,dir:'after',base:'candle',round:5,rdir:'down'},{id:'t5',name:'מנחה',days:'shabbat',mode:'rel',off:40,dir:'before',base:'sunset',round:5,rdir:'down'},{id:'t6',name:'ערבית',days:'sunThu',mode:'fixed',time:'20:00'}]},
    countdown:{view:'countdown',layout:'full',theme:'block',accent:'#a3462b',size:'a4',orient:'portrait',zmanimMode:'none',cover:false,cdTitle:'עוד כמה ימים לבר המצווה?'},
    family:{layout:'same',imgRatio:40,theme:'ink',accent:'#1e5a63',size:'wall',view:'month',zmanimMode:'shabbat'},
    split:{layout:'split',theme:'soft',accent:'#24427a',size:'wall',view:'month'},
    shul:{layout:'full',theme:'block',accent:'#7a4a17',zmanimMode:'col',banners:['right'],view:'month'},
    yeshiva:{layout:'full',theme:'ink',accent:'#3d5a2a',zmanimMode:'daily',view:'month',place:{learn:'col'},learn:{daf:true,mishna:true,box:true}},
    school:{calType:'greg',gregStart:9,layout:'full',theme:'ink',accent:'#24427a',view:'month',hlLegend:true},
    history:{layout:'full',theme:'ink',accent:'#6b2d4f',view:'month',place:{yz:'page'}},
    sponsor:{layout:'full',theme:'ink',accent:'#8a2c2c',view:'month',banners:['right','left']},
    cover:{cover:true,layout:'same',accent:'#2f2f3a',view:'month'},
    desk:{size:'desk',layout:'same',accent:'#3d5a2a',view:'month'},
    fridge:{size:'fridge',layout:'full',accent:'#6b2d4f',view:'month'},
    all:{layout:'full',theme:'ink',accent:'#1e5a63',view:'month',size:'wall',orient:'landscape',zmanimMode:'col',banners:['right','left'],place:{yz:'page',learn:'col'},learn:{daf:true,mishna:true,box:true},moon:{molad:true,kl:'ash',klEnd:'rema',tekufa:true,tal:true}},
    week:{view:'week'},day:{view:'day'},table:{view:'table'}};
   if(m&&P[m[1]]){const p=P[m[1]],s=state.s;
     s.cols=null;s.zplace=null;
     for(const k in p){if(k==='place'||k==='learn'||k==='moon')s[k]={...(s[k]||{}),...p[k]};else s[k]=p[k]}
     if(m[1]==='school'&&!(s.hl||[]).length)s.hl=[{id:'h'+uid(),name:'חופשות',color:'#f6d365',days:{},show:true,repeat:'none'},{id:'h'+uid(),name:'ימי הורים',color:'#a7c7e7',days:{},show:true,repeat:'none'}];
     s.uiMode='wizard';s.step=1;save();try{history.replaceState(null,'',window.location.pathname)}catch(e){}}}
  syncUI();applyMode();render();fillLums();trayLoad();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
  acctInit();
})();
})();
