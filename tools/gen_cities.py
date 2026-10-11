"""יוצר את online/cities.js מתוך רשימת הערים של הבונה (assets/app.js), עם שמות באנגלית."""
import json, re, subprocess, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
js = (ROOT / 'assets/app.js').read_text(encoding='utf-8').split('\n')
start = next(i for i, l in enumerate(js) if l.startswith('const J='))
end = next(i for i, l in enumerate(js) if l.startswith('const CITIES=[]'))
code = '\n'.join(js[start:end])
out = subprocess.run(['node', '-e', code + ';const o=[];for(const [g,rows] of Object.entries(CITY_ROWS))for(const r of rows)o.push([r[0],r[1],g,r[2],r[3],r[4],r[5],r[6]||18]);console.log(JSON.stringify(o))'],
                     capture_output=True, text=True, check=True).stdout
rows = json.loads(out)
EN = {
 'jerusalem':'Jerusalem','bneibrak':'Bnei Brak','telaviv':'Tel Aviv','petahtikva':'Petah Tikva','ramatgan':'Ramat Gan','givatayim':'Givatayim','holon':'Holon','batyam':'Bat Yam',
 'rishon':'Rishon LeZion','rehovot':'Rehovot','yavne':'Yavne','ashdod':'Ashdod','ashkelon':'Ashkelon','kiryatgat':'Kiryat Gat','kiryatmalachi':'Kiryat Malachi','sderot':'Sderot',
 'netivot':'Netivot','ofakim':'Ofakim','beersheva':'Beersheba','dimona':'Dimona','arad':'Arad','eilat':'Eilat','modiin':'Modiin','modiinillit':'Modiin Illit','elad':'Elad',
 'roshhaayin':'Rosh HaAyin','lod':'Lod','ramla':'Ramla','kfarsaba':'Kfar Saba','raanana':"Ra'anana",'herzliya':'Herzliya','netanya':'Netanya','hadera':'Hadera','harish':'Harish',
 'zichron':"Zichron Ya'akov",'haifa':'Haifa','kiryatata':'Kiryat Ata','rechasim':'Rechasim','akko':'Akko','nahariya':'Nahariya','karmiel':'Karmiel','safed':'Safed (Tzfat)',
 'tiberias':'Tiberias','afula':'Afula','nofhagalil':'Nof HaGalil','migdalhaemek':'Migdal HaEmek','kiryatshmona':'Kiryat Shmona','katzrin':'Katzrin','beitshemesh':'Beit Shemesh',
 'beitar':'Beitar Illit','efrat':'Efrat','maaleadumim':"Ma'ale Adumim",'givatzeev':"Givat Ze'ev",'kochavyaakov':"Kochav Ya'akov",'telzstone':'Telz-Stone','kiryatarba':'Kiryat Arba',
 'ariel':'Ariel','immanuel':'Immanuel','newyork':'New York','brooklyn':'Brooklyn','monsey':'Monsey','lakewood':'Lakewood','teaneck':'Teaneck','passaic':'Passaic','baltimore':'Baltimore',
 'philadelphia':'Philadelphia','washington':'Washington DC','boston':'Boston','chicago':'Chicago','cleveland':'Cleveland','detroit':'Detroit','miami':'Miami','bocaraton':'Boca Raton',
 'atlanta':'Atlanta','dallas':'Dallas','houston':'Houston','stlouis':'St. Louis','denver':'Denver','phoenix':'Phoenix','losangeles':'Los Angeles','sanfrancisco':'San Francisco',
 'seattle':'Seattle','lasvegas':'Las Vegas','toronto':'Toronto','montreal':'Montreal','vancouver':'Vancouver','mexico':'Mexico City','buenosaires':'Buenos Aires','saopaulo':'São Paulo',
 'rio':'Rio de Janeiro','panama':'Panama City','santiago':'Santiago','montevideo':'Montevideo','london':'London','manchester':'Manchester','gateshead':'Gateshead','leeds':'Leeds',
 'dublin':'Dublin','paris':'Paris','strasbourg':'Strasbourg','lyon':'Lyon','marseille':'Marseille','nice':'Nice','antwerp':'Antwerp','brussels':'Brussels','amsterdam':'Amsterdam',
 'zurich':'Zurich','geneva':'Geneva','basel':'Basel','vienna':'Vienna','berlin':'Berlin','frankfurt':'Frankfurt','munich':'Munich','milan':'Milan','rome':'Rome','madrid':'Madrid',
 'barcelona':'Barcelona','gibraltar':'Gibraltar','prague':'Prague','budapest':'Budapest','warsaw':'Warsaw','krakow':'Krakow','lizensk':'Lizhensk','kyiv':'Kyiv','uman':'Uman',
 'odessa':'Odessa','dnipro':'Dnipro','moscow':'Moscow','stpetersburg':'St. Petersburg','minsk':'Minsk','vilnius':'Vilnius','riga':'Riga','istanbul':'Istanbul','athens':'Athens',
 'copenhagen':'Copenhagen','stockholm':'Stockholm','oslo':'Oslo','johannesburg':'Johannesburg','capetown':'Cape Town','casablanca':'Casablanca','marrakech':'Marrakech','djerba':'Djerba',
 'cairo':'Cairo','dubai':'Dubai','mumbai':'Mumbai','bangkok':'Bangkok','kathmandu':'Kathmandu','hongkong':'Hong Kong','shanghai':'Shanghai','beijing':'Beijing','tokyo':'Tokyo',
 'singapore':'Singapore','tbilisi':'Tbilisi','baku':'Baku','sydney':'Sydney','melbourne':'Melbourne','perth':'Perth','auckland':'Auckland'}
GEN = {'ישראל':'Israel','צפון אמריקה':'North America','דרום ומרכז אמריקה':'Central & South America','בריטניה ואירלנד':'UK & Ireland','אירופה':'Europe','אפריקה':'Africa','אסיה ואוקיאניה':'Asia & Oceania'}
missing = [r[0] for r in rows if r[0] not in EN]
assert not missing, missing
cities = [{'id':r[0],'he':r[1],'en':EN[r[0]],'g':r[2],'gen':GEN[r[2]],'lat':r[3],'lng':r[4],'el':r[5],'tz':r[6],'candle':r[7],'il':r[2]=='ישראל'} for r in rows]
(ROOT/'online/cities.js').write_text('/* נוצר אוטומטית מ־tools/gen_cities.py */\nwindow.LC_CITIES='+json.dumps(cities,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print(len(cities))
