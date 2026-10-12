/* יוצר קובצי יומן (‎.ics) לכל עיר: חגים, צומות, ראשי חודשים, פרשת השבוע, הדלקת נרות והבדלה.
   הקבצים נמצאים ב-online/ics/<עיר>.ics, ואפשר להירשם אליהם מיומן גוגל או מהאייפון.
   מריצים פעם בשנה (לטווח של כשנתיים קדימה):
     node --harmony-temporal tools/gen_ics.mjs            (עם @hebcal/core מותקן)
     HEBCAL=/path/to/core/index.js node --harmony-temporal tools/gen_ics.mjs */
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const H=await import(process.env.HEBCAL||'@hebcal/core');
const {HebrewCalendar,Location,HDate,flags}=H;
const CITIES=JSON.parse(fs.readFileSync(path.join(ROOT,'online/cities.js'),'utf8').match(/window\.LC_CITIES=(\[.*\]);/)[1]);
const now=new Date();const start=new Date(now.getFullYear(),now.getMonth()-1,1),end=new Date(now.getFullYear()+2,now.getMonth()+1,1);
const noNik=s=>s.replace(/\u05BE/g,'-').replace(/[\u0591-\u05BD\u05BF-\u05C7]/g,'');
const escI=t=>String(t).replace(/[\\,;]/g,x=>'\\'+x).replace(/\n/g,'\\n');
const d8=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
const utc=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
const fold=l=>{const out=[];let s=l;while(Buffer.byteLength(s)>73){let i=60;while(Buffer.byteLength(s.slice(0,i))>73)i--;out.push(s.slice(0,i));s=' '+s.slice(i)}out.push(s);return out.join('\r\n')};
const stamp=utc(new Date());
let n=0;
for(const c of CITIES){
  const loc=new Location(+c.lat,+c.lng,!!c.il,c.tz,c.en,'',undefined,+c.el||0);
  const evs=HebrewCalendar.calendar({start,end,location:loc,candlelighting:true,sedrot:true,il:!!c.il,candleLightingMins:+c.candle||18,locale:'he',noModern:true,noSpecialShabbat:false});
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MyLuach//Online//HE','CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'X-WR-CALNAME:'+escI('MyLuach · חגים וזמני שבת · '+c.he),'X-WR-TIMEZONE:'+c.tz,'X-PUBLISHED-TTL:PT24H','REFRESH-INTERVAL;VALUE=DURATION:PT24H',
    'X-WR-CALDESC:'+escI('חגים, צומות, ראשי חודשים, פרשת השבוע וזמני הדלקת נרות והבדלה ב'+c.he+'. מתוך myluach.org')];
  let i=0;
  for(const e of evs){
    const f=e.getFlags();if(f&(flags.MODERN_HOLIDAY||8192))continue;
    const g=e.getDate().greg(),title=noNik(e.render('he')).replace(/:\s*/,': ');
    i++;const uid=d8(g)+'-'+i+'-'+c.id+'@myluach.org';
    if(e.eventTime){const t0=e.eventTime;L.push('BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+stamp,'DTSTART:'+utc(t0),'DTEND:'+utc(new Date(+t0+15*60000)),fold('SUMMARY:'+escI(title)),'TRANSP:TRANSPARENT','END:VEVENT')}
    else{const nx=new Date(g.getFullYear(),g.getMonth(),g.getDate()+1);L.push('BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+d8(g),'DTEND;VALUE=DATE:'+d8(nx),fold('SUMMARY:'+escI(title)),'TRANSP:TRANSPARENT','END:VEVENT')}
  }
  L.push('END:VCALENDAR');
  fs.writeFileSync(path.join(ROOT,'online/ics',c.id+'.ics'),L.join('\r\n')+'\r\n');n++;
}
console.log(n,'cities');
