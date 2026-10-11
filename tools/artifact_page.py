"""Make an artifact-ready copy of index.html (the artifact skeleton supplies doctype/head/body)."""
import re,sys
src,dst=sys.argv[1],sys.argv[2]
t=open(src,encoding='utf-8').read()
t=re.sub(r'<!doctype html>\s*','',t,flags=re.I)
t=re.sub(r'</?html[^>]*>\s*','',t);t=re.sub(r'</?head>\s*','',t);t=re.sub(r'</?body>\s*','',t)
t=re.sub(r'<meta charset[^>]*>\s*','',t);t=re.sub(r'<meta name="viewport"[^>]*>\s*','',t)
m=re.search(r'<title>.*?</title>\s*',t);title=m.group(0);t=title+t.replace(title,'',1)
open(dst,'w',encoding='utf-8').write(t)
