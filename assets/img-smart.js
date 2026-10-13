/* עריכת תמונות חכמה: זיהוי פנים, מיקום מדבקה על הראש, הסרת רקע וחיתוך סביב הפנים.
   הספריות נטענות רק כשמשתמשים בהן (מ-jsdelivr), והכל רץ בדפדפן: התמונות לא נשלחות לשום שרת. */
(function(){
  'use strict';
  const FA='https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/';
  const SS='https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/';
  let faP=null,ssP=null;

  /* --- זיהוי פנים --- */
  function loadFaceApi(){
    if(faP)return faP;
    faP=(async()=>{
      const fa=await import(FA+'dist/face-api.esm.js');
      await fa.nets.tinyFaceDetector.loadFromUri(FA+'model/');
      try{await fa.nets.faceLandmark68TinyNet.loadFromUri(FA+'model/')}catch(e){}
      return fa;
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
    ssP=new Promise((res,rej)=>{
      if(window.SelfieSegmentation)return res();
      const s=document.createElement('script');s.src=SS+'selfie_segmentation.js';s.crossOrigin='anonymous';s.onload=()=>res();s.onerror=()=>rej(new Error('ss-load'));document.head.appendChild(s);
    }).then(async()=>{const ss=new window.SelfieSegmentation({locateFile:f=>SS+f});ss.setOptions({modelSelection:0});await ss.initialize();return ss});
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

  window.MyLuachSmart={detectFaces,placeOnFace,removeUniformBg,cutPerson,faceCrop,toCanvas};
})();
