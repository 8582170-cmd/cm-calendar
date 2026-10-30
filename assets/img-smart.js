/* עריכת תמונות חכמה: זיהוי פנים, מיקום מדבקה על הראש, הסרת רקע וחיתוך סביב הפנים.
   הספריות נטענות רק כשמשתמשים בהן (מ-jsdelivr), והכל רץ בדפדפן: התמונות לא נשלחות לשום שרת. */
(function(){
  'use strict';
  /* קודם ישירות מ-jsdelivr ומ-Hugging Face, ואם נכשל (למשל חסימה של מסנן כמו נטפרי) דרך השרת של האתר (/cdn) */
  const JD='https://cdn.jsdelivr.net/npm/',OWN=/(^|\.)myluach\.(org|pages\.dev)$/.test(location.hostname)?location.origin+'/cdn/':'';
  const SRC=OWN?[JD,OWN+'npm/']:[JD];
  async function tryEach(fn){let err;for(const b of SRC){try{return await fn(b)}catch(e){err=e;console.warn('smart-load',b,e)}}throw err}
  const FA_='@vladmandic/face-api@1.7.15/',SS_='@mediapipe/selfie_segmentation@0.1.1675465747/';
  /* גזירת דמות באיכות גבוהה: MODNet (רישיון Apache 2.0) דרך transformers.js. המודל (כ־25MB) נטען מ-Hugging Face בפעם הראשונה ונשמר בדפדפן */
  const TF_='@huggingface/transformers@3.5.1';
  let faP=null,ssP=null;

  /* --- זיהוי פנים --- */
  function loadFaceApi(){
    if(faP)return faP;
    faP=(async()=>{
      return tryEach(async B=>{const FA=B+FA_;
        const fa=await import(FA+'dist/face-api.esm.js');
        await fa.nets.tinyFaceDetector.loadFromUri(FA+'model/');
        try{await fa.nets.faceLandmark68TinyNet.loadFromUri(FA+'model/')}catch(e){}
        return fa});
    })();
    faP.catch(()=>{faP=null});
    return faP;
  }
  const P=(x,y)=>({x,y});
  const avg=pts=>P(pts.reduce((a,p)=>a+p.x,0)/pts.length,pts.reduce((a,p)=>a+p.y,0)/pts.length);
  /* מחזיר רשימת פנים, מהגדולה לקטנה: {box, eyeL, eyeR, chin} בפיקסלים של הקנבס */
  async function detectFaces(canvas){
    let out=[];
    try{
      const fa=await loadFaceApi();
      const opt=new fa.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:.35});
      let res;
      try{res=await fa.detectAllFaces(canvas,opt).withFaceLandmarks(true)}catch(e){res=(await fa.detectAllFaces(canvas,opt)).map(d=>({detection:d}))}
      out=res.map(r=>{const b=r.detection.box,box={x:b.x,y:b.y,w:b.width,h:b.height};
        if(r.landmarks){const p=r.landmarks.positions;return {box,eyeL:avg(p.slice(36,42)),eyeR:avg(p.slice(42,48)),chin:p[8]}}
        return fromBox(box)});
    }catch(e){
      /* גיבוי: זיהוי פנים מובנה בדפדפן, אם קיים */
      if('FaceDetector' in window){try{const fd=new window.FaceDetector({fastMode:true});out=(await fd.detect(canvas)).map(f=>fromBox({x:f.boundingBox.x,y:f.boundingBox.y,w:f.boundingBox.width,h:f.boundingBox.height}))}catch(e2){}}
      if(!out.length)throw new Error('face-detect-unavailable');
    }
    return out.sort((a,b)=>b.box.w*b.box.h-a.box.w*a.box.h);
  }
  function fromBox(b){return {box:b,eyeL:P(b.x+b.w*.3,b.y+b.h*.4),eyeR:P(b.x+b.w*.7,b.y+b.h*.4),chin:P(b.x+b.w/2,b.y+b.h*.98)}}

  /* איפה לשים מדבקה על פנים: מחזיר מרכז (בשבר מגודל התמונה), רוחב (שבר) וזווית */
  function placeOnFace(f,st,W,H,ar){
    const ex=f.eyeR.x-f.eyeL.x,ey=f.eyeR.y-f.eyeL.y,ang=Math.atan2(ey,ex);
    const mid=P((f.eyeL.x+f.eyeR.x)/2,(f.eyeL.y+f.eyeR.y)/2);
    const faceH=Math.hypot(f.chin.x-mid.x,f.chin.y-mid.y)||f.box.h*.6;
    const faceW=Math.max(f.box.w,Math.hypot(ex,ey)*2.2);
    const up=P(Math.sin(ang),-Math.cos(ang));/* כיוון "למעלה" לאורך הראש */
    const k={top:1.08,brow:.62,eyes:0,chin:-1.12}[st.line||'top'];
    const target=P(mid.x+up.x*faceH*k,mid.y+up.y*faceH*k);
    const w=faceW*(st.fw||1),h=w*ar;
    /* הנקודה ay במדבקה יושבת על היעד: מזיזים את המרכז בהתאם */
    const off=(st.ay==null?.5:st.ay)-.5;
    const c=P(target.x+up.x*h*off,target.y+up.y*h*off);
    return {x:c.x/W,y:c.y/H,w:w/W,rot:Math.round(ang*180/Math.PI)};
  }

  /* --- תמונה מ-dataURL לקנבס --- */
  function toCanvas(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);res(c)};im.onerror=rej;im.src=src})}

  /* --- הסרת רקע אחיד (לבן או צבע אחד): מילוי מהשוליים פנימה --- */
  async function removeUniformBg(src,tol){
    tol=tol||38;const c=await toCanvas(src),W=c.width,H=c.height,g=c.getContext('2d'),im=g.getImageData(0,0,W,H),d=im.data;
    /* צבע הרקע: ממוצע הפינות */
    const cs=[[0,0],[W-1,0],[0,H-1],[W-1,H-1]].map(([x,y])=>{const i=(y*W+x)*4;return [d[i],d[i+1],d[i+2]]});
    const near=(i)=>cs.some(cc=>Math.abs(d[i]-cc[0])+Math.abs(d[i+1]-cc[1])+Math.abs(d[i+2]-cc[2])<tol*1.6);
    const seen=new Uint8Array(W*H),st=[];
    for(let x=0;x<W;x++){st.push(x,(H-1)*W+x)}for(let y=0;y<H;y++){st.push(y*W,y*W+W-1)}
    let n=0;
    while(st.length){const p=st.pop();if(seen[p])continue;seen[p]=1;if(!near(p*4))continue;d[p*4+3]=0;n++;
      const x=p%W,y=(p/W)|0;if(x>0)st.push(p-1);if(x<W-1)st.push(p+1);if(y>0)st.push(p-W);if(y<H-1)st.push(p+W)}
    /* ריכוך קצוות: פיקסל שקוף למחצה ליד הרקע */
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const p=y*W+x;if(!d[p*4+3])continue;
      const z=(d[(p-1)*4+3]===0)+(d[(p+1)*4+3]===0)+(d[(p-W)*4+3]===0)+(d[(p+W)*4+3]===0);if(z)d[p*4+3]=Math.min(d[p*4+3],255-z*48)}
    g.putImageData(im,0,0);
    return {src:c.toDataURL('image/png'),removed:n/(W*H)};
  }

  /* --- חיתוך אדם מהרקע (בינה מלאכותית, MediaPipe) --- */
  function loadSS(){
    if(ssP)return ssP;
    ssP=tryEach(B=>{const SS=B+SS_;return new Promise((res,rej)=>{
      if(window.SelfieSegmentation)return res();
      const s=document.createElement('script');s.src=SS+'selfie_segmentation.js';s.crossOrigin='anonymous';s.onload=()=>res();s.onerror=()=>{s.remove();rej(new Error('ss-load'))};document.head.appendChild(s);
    }).then(async()=>{const ss=new window.SelfieSegmentation({locateFile:f=>SS+f});ss.setOptions({modelSelection:0});await ss.initialize();return ss})});
    ssP.catch(()=>{ssP=null});
    return ssP;
  }
  async function cutPerson(src){
    const c=await toCanvas(src),ss=await loadSS();
    const mask=await new Promise((res,rej)=>{ss.onResults(r=>res(r.segmentationMask));ss.send({image:c}).catch(rej)});
    const o=document.createElement('canvas');o.width=c.width;o.height=c.height;const g=o.getContext('2d');
    g.drawImage(mask,0,0,o.width,o.height);g.globalCompositeOperation='source-in';g.drawImage(c,0,0);
    /* חותכים את השוליים השקופים */
    return trim(o).toDataURL('image/png');
  }
  function trim(c){const g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=-1,y1=-1;
    for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2)if(d[(y*c.width+x)*4+3]>24){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
    if(x1<0)return c;const o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(c,-x0,-y0);return o}

  /* --- חיתוך חכם סביב הפנים: ריבוע ממורכז על הפנים (מתאים לעיגול) --- */
  async function faceCrop(src){
    const c=await toCanvas(src),fs=await detectFaces(c);if(!fs.length)throw new Error('no-face');
    const b=fs[0].box,side=Math.min(Math.max(b.w,b.h)*1.9,c.width,c.height),cx=b.x+b.w/2,cy=b.y+b.h*.42;
    const x=Math.max(0,Math.min(c.width-side,cx-side/2)),y=Math.max(0,Math.min(c.height-side,cy-side/2));
    const o=document.createElement('canvas');o.width=o.height=Math.round(side);o.getContext('2d').drawImage(c,x,y,side,side,0,0,side,side);
    return o.toDataURL('image/jpeg',.92);
  }

  /* --- גזירת דמות מהתמונה הראשית: מחזיר קנבס בגודל המקורי, הרקע שקוף --- */
  let mnP=null;
  function loadModnet(){
    if(mnP)return mnP;
    mnP=tryEach(async B=>{const own=B!==JD,T=await import(B+TF_);T.env.allowLocalModels=false;
      if(own){T.env.remoteHost=OWN+'hf/';try{T.env.backends.onnx.wasm.wasmPaths=B+TF_+'/dist/'}catch(e){}}
      let model;const gpu='gpu' in navigator;
      try{model=await T.AutoModel.from_pretrained('Xenova/modnet',{dtype:'fp32',device:gpu?'webgpu':'wasm'})}
      catch(e){if(!gpu)throw e;model=await T.AutoModel.from_pretrained('Xenova/modnet',{dtype:'fp32',device:'wasm'})}
      const proc=await T.AutoProcessor.from_pretrained('Xenova/modnet');return {T,model,proc}});
    mnP.catch(()=>{mnP=null});
    return mnP;
  }
  async function maskModnet(c){
    const {T,model,proc}=await loadModnet();
    const img=await T.RawImage.fromURL(c.toDataURL('image/png'));
    const {pixel_values}=await proc(img);const {output}=await model({input:pixel_values});
    const m=await T.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(c.width,c.height);
    const a=new Uint8ClampedArray(c.width*c.height),ch=m.channels||1;for(let i=0;i<a.length;i++)a[i]=m.data[i*ch];return a;
  }
  async function maskMediapipe(c){
    const ss=await loadSS();const mask=await new Promise((res,rej)=>{ss.onResults(r=>res(r.segmentationMask));ss.send({image:c}).catch(rej)});
    const o=document.createElement('canvas');o.width=c.width;o.height=c.height;const g=o.getContext('2d');g.drawImage(mask,0,0,o.width,o.height);
    const d=g.getImageData(0,0,o.width,o.height).data,a=new Uint8ClampedArray(o.width*o.height);let op=true;for(let i=3;i<d.length;i+=4)if(d[i]<250){op=false;break}
    /* המסכה בערוץ השקיפות; אם היא אטומה כולה, הביטחון נמצא בערוץ האדום */
    for(let i=0;i<a.length;i++)a[i]=op?d[i*4]:d[i*4+3];return a;
  }
  async function cutFigure(src){
    const c=await toCanvas(src);let a,engine='modnet';
    try{a=await maskModnet(c)}catch(e){console.warn('modnet',e);engine='mediapipe';a=await maskMediapipe(c)}
    const g=c.getContext('2d'),im=g.getImageData(0,0,c.width,c.height),d=im.data;let kept=0;
    for(let i=0;i<a.length;i++){const v=a[i]<12?0:a[i]>243?255:a[i];d[i*4+3]=Math.min(d[i*4+3],v);if(v>128)kept++}
    g.putImageData(im,0,0);
    return {canvas:c,engine,kept:kept/a.length};
  }
  /* שמירה עם שקיפות: WebP (קטן) ואם הדפדפן לא תומך, PNG */
  function encAlpha(c,q){let u='';try{u=c.toDataURL('image/webp',q||.92)}catch(e){}return /^data:image\/webp/.test(u)?u:c.toDataURL('image/png')}

  window.MyLuachSmart={detectFaces,placeOnFace,removeUniformBg,cutPerson,faceCrop,toCanvas,cutFigure,encAlpha};
})();
