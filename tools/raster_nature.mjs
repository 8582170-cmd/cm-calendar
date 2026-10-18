// ממיר את הנופים (assets/library/nat-*.svg) לתמונות JPG: הדפסה מהדפדפן נתקעת על SVG עם טשטוש (filter) בעמודים רבים.
// הרצה: node tools/raster_nature.mjs   (דורש playwright; אחר כך python3 להמרה ל-JPG)
import {chromium} from 'playwright';
import fs from 'node:fs';import path from 'node:path';import {execSync} from 'node:child_process';
const dir=path.resolve('assets/library');const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:1400}});
for(const f of fs.readdirSync(dir).filter(f=>/^nat-.*\.svg$/.test(f))){
  await p.setContent('<body style="margin:0"><img style="display:block;width:1000px;height:1400px" src="data:image/svg+xml;base64,'+fs.readFileSync(path.join(dir,f)).toString('base64')+'">');
  await p.waitForTimeout(300);const png=path.join(dir,f.replace('.svg','.png'));await p.screenshot({path:png});
  execSync(`python3 -c "from PIL import Image;Image.open('${png}').convert('RGB').save('${png.replace('.png','.jpg')}',quality=80,optimize=True,progressive=True)"`);fs.unlinkSync(png);console.log(f)}
await b.close();
