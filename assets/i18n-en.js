/* English pages: translates the Hebrew UI texts of the builder on the fly (exact phrases + patterns).
   The dictionary is in assets/i18n-en-dict.js (window.MYLUACH_EN). */
(function(){
  'use strict';
  if(document.documentElement.lang!=='en')return;
  var D=window.MYLUACH_EN||{exact:{},re:[]},X=new Map(),R=[],HEB=/[\u0590-\u05FF]/;
  Object.keys(D.exact||{}).forEach(function(k){X.set(k.replace(/\s+/g,' ').trim(),D.exact[k])});
  (D.re||[]).forEach(function(p){try{R.push([new RegExp(p[0]),p[1]])}catch(e){}});
  var MISS=window.__i18nMiss=new Map();
  function tr(s){if(!s||!HEB.test(s))return null;var t=s.replace(/\s+/g,' ').trim();if(!t)return null;var v=X.get(t);
    if(v==null)for(var i=0;i<R.length;i++){if(R[i][0].test(t)){v=t.replace(R[i][0],R[i][1]);break}}
    if(v==null){MISS.set(t,(MISS.get(t)||0)+1);return null}
    var lead=s.match(/^\s*/)[0],tail=s.match(/\s*$/)[0];return lead+v+tail}
  var ATTR=['placeholder','title','aria-label','data-ph','alt'];
  function skip(n){var e=n.nodeType===1?n:n.parentElement;if(!e||e.closest('[data-noi18n],script,style,textarea'))return true;var ce=e.closest('[contenteditable="true"]');return !!(ce&&ce.contains(document.activeElement))}
  function doEl(e){for(var i=0;i<ATTR.length;i++){var a=e.getAttribute&&e.getAttribute(ATTR[i]);if(a){var v=tr(a);if(v!=null)e.setAttribute(ATTR[i],v)}}
    if(e.tagName==='INPUT'&&(e.type==='button'||e.type==='submit')&&e.value){var w=tr(e.value);if(w!=null)e.value=w}}
  function walk(root){if(!root)return;if(root.nodeType===3){if(!skip(root)){var v=tr(root.nodeValue);if(v!=null)root.nodeValue=v}return}
    if(root.nodeType!==1&&root.nodeType!==11)return;if(root.nodeType===1){if(skip(root))return;doEl(root)}
    var w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,null),n;
    while((n=w.nextNode())){if(n.nodeType===3){if(n.nodeValue&&HEB.test(n.nodeValue)&&!skip(n)){var v2=tr(n.nodeValue);if(v2!=null)n.nodeValue=v2}}else if(!skip(n))doEl(n)}}
  var Q=[],sch=false;
  function flush(){sch=false;var L=Q;Q=[];for(var i=0;i<L.length;i++)walk(L[i]);var t=tr(document.title);if(t!=null)document.title=t}
  function push(n){Q.push(n);if(!sch){sch=true;(window.queueMicrotask||setTimeout)(flush)}}
  new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='characterData')push(m.target);else if(m.type==='attributes')push(m.target);else m.addedNodes.forEach(push)})})
    .observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTR});
  window.MyLuachT=function(s){var v=tr(s);return v==null?s:v};
  if(document.readyState!=='loading')walk(document.body);else document.addEventListener('DOMContentLoaded',function(){walk(document.body)});
  /* alert/confirm/prompt texts */
  var A=window.alert,C=window.confirm,P=window.prompt;
  window.alert=function(m){return A.call(window,window.MyLuachT(String(m)))};window.confirm=function(m){return C.call(window,window.MyLuachT(String(m)))};window.prompt=function(m,d){return P.call(window,window.MyLuachT(String(m)),d)};
})();
