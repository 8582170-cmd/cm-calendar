"""בונה את assets/yz.js המוצפן מתוך data-src/yz-data.js (המקור לעריכה, לא עולה לאתר).
מריצים אחרי כל שינוי במאגר:  python3 tools/build_yz.py"""
import json, subprocess, base64, pathlib, secrets
ROOT = pathlib.Path(__file__).resolve().parent.parent
code = "const fs=require('fs');const src=fs.readFileSync(process.argv[1],'utf8');const f=new Function(src+';return {YZ,SEL:YZ_DEFAULT_SEL}');process.stdout.write(JSON.stringify(f()))"
out = subprocess.run(['node', '-e', code, str(ROOT / 'data-src/yz-data.js')], capture_output=True, text=True, check=True).stdout
data = out.encode('utf-8')
key = secrets.token_bytes(29)
enc = bytes(b ^ key[i % len(key)] ^ ((i * 131) & 255) for i, b in enumerate(data))
k64, d64 = base64.b64encode(key).decode(), base64.b64encode(enc).decode()
js = ('/* © MyLuach. מאגר דברי הימים מוגן בזכויות יוצרים; אין להעתיק, לשכפל או להפיץ. */\n'
      '(function(){var k=Uint8Array.from(atob("' + k64 + '"),function(c){return c.charCodeAt(0)}),'
      'b=Uint8Array.from(atob("' + d64 + '"),function(c){return c.charCodeAt(0)});'
      'for(var i=0;i<b.length;i++)b[i]^=k[i%k.length]^((i*131)&255);'
      'var o=JSON.parse(new TextDecoder().decode(b));window.YZ=o.YZ;window.YZ_DEFAULT_SEL=o.SEL})();\n')
(ROOT / 'assets/yz.js').write_text(js, encoding='utf-8')
print('entries:', len(json.loads(out)['YZ']), 'bytes:', len(js))
