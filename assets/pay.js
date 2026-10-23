/* חלון תשלום משותף (לעמודים שאינם בונה הלוח, למשל ברכות והזמנות).
   אותם אמצעי תשלום כמו בבונה הלוח: נדרים פלוס (טופס מוטמע), SUMIT וכרטיס דרך PayPal. הבחירה ביניהם בדף הניהול.
   MLPay.open({ title, sub, body: {plan, ...}, email, onPaid(orderId) })
   body נשלח ל-/api/checkout כמו שהוא (למשל plan:'greet', tpl, v, state). */
(function(){
'use strict';
var CSS = '.mlp-back{position:fixed;inset:0;background:rgb(0 0 0 / .45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:20px 12px}' +
  '.mlp{background:var(--sheet,#fff);color:var(--ink,#172126);border-radius:20px;max-width:540px;width:100%;padding:24px;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 50px -10px rgb(0 0 0 / .4);font-family:inherit}' +
  '.mlp h3{margin:0;font-size:24px}.mlp .hint{margin:0;color:var(--mute,#5c686c);font-size:16px}.mlp .bad{color:#b3261e;font-weight:700}.mlp .ok{color:#1d7a3e;font-weight:700}' +
  '.mlp label{display:flex;flex-direction:column;gap:5px;font-size:15px;font-weight:700}.mlp label[hidden]{display:none}' +
  '.mlp input,.mlp select{font:inherit;font-size:18px;font-weight:400;padding:10px 12px;border:1.5px solid var(--line,#dde2df);border-radius:12px;background:var(--paper,#f6f7f4);color:inherit}' +
  '.mlp .who{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mlp .who label:first-child{grid-column:1/-1}@media (max-width:520px){.mlp .who{grid-template-columns:1fr}}' +
  '.mlp iframe{width:100%;height:320px;border:0;border-radius:12px;background:#fff}.mlp .box{min-height:60px}' +
  '.mlp .row{display:flex;gap:10px;flex-wrap:wrap}.mlp .btn{font:inherit;font-size:18px;font-weight:800;min-height:52px;padding:10px 22px;border-radius:14px;border:2px solid var(--teal,#1f5c63);background:transparent;color:var(--teal,#1f5c63);cursor:pointer}' +
  '.mlp .btn.primary{background:var(--teal,#1f5c63);color:var(--teal-ink,#fff)}.mlp .btn:disabled{opacity:.5;cursor:default}' +
  '.mlp .choose{display:flex;gap:6px;flex-wrap:wrap}.mlp .choose button{flex:1 1 140px;font:inherit;font-weight:700;padding:10px;border-radius:12px;border:1.5px solid var(--line,#dde2df);background:var(--paper,#f6f7f4);color:inherit;cursor:pointer}.mlp .choose [aria-checked="true"]{border-color:var(--teal,#1f5c63);box-shadow:0 0 0 1px var(--teal,#1f5c63)}' +
  '.mlp .cf2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mlp [id^=mlpPp]{min-height:44px}';
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function tzOk(t){ t = String(t).padStart(9, '0'); if (!/^\d{9}$/.test(t)) return false; var s = 0; for (var i = 0; i < 9; i++) { var d = +t[i] * (i % 2 + 1); s += d > 9 ? d - 9 : d; } return s % 10 === 0; }
function load(src){ return new Promise(function(ok, bad){ var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
var cfgP = null;
function cfg(){ if (!cfgP) cfgP = fetch('/api/pricing').then(function(r){ return r.ok ? r.json() : {} }).catch(function(){ return {} }); return cfgP; }

function open(opt){
  if (!document.getElementById('mlp-css')) { var st = document.createElement('style'); st.id = 'mlp-css'; st.textContent = CSS; document.head.appendChild(st); }
  var saved = {}; try { saved = JSON.parse(localStorage.getItem('myluach-buyer') || '{}') || {} } catch (e) {}
  var back = document.createElement('div'); back.className = 'mlp-back';
  back.innerHTML = '<div class="mlp" role="dialog" aria-modal="true" aria-label="תשלום"><h3></h3><p class="hint" id="mlpSub"></p>' +
    '<div class="who"><label>מייל <small style="font-weight:400">(לשם יישלח הקישור לעיצוב)</small><input type="email" id="mlpMail" dir="ltr" autocomplete="email"></label>' +
    '<label data-ned>שם מלא<input type="text" id="mlpName" autocomplete="name"></label><label data-ned>טלפון<input type="tel" id="mlpPhone" dir="ltr" autocomplete="tel"></label>' +
    '<label data-ned>תעודת זהות של בעל הכרטיס <small style="font-weight:400">(לכרטיס ישראלי)</small><input type="text" id="mlpZeout" inputmode="numeric" dir="ltr" maxlength="9" autocomplete="off"></label></div>' +
    '<div class="choose" id="mlpChoose" role="radiogroup" aria-label="דרך תשלום" hidden></div><p class="hint" id="mlpMsg"></p>' +
    '<iframe id="mlpFrame" title="טופס תשלום מאובטח" data-src="https://www.matara.pro/nedarimplus/iframe?language=he" hidden></iframe><div class="box" id="mlpBox" hidden></div>' +
    '<div class="row"><button class="btn primary" type="button" id="mlpGo">המשך לתשלום</button><button class="btn" type="button" id="mlpCancel">ביטול</button></div></div>';
  document.body.appendChild(back);
  var $ = function(id){ return back.querySelector('#' + id) }, frame = $('mlpFrame'), go = $('mlpGo');
  back.querySelector('h3').textContent = opt.title || 'תשלום';
  $('mlpSub').textContent = opt.sub || '';
  $('mlpMail').value = opt.email || saved.mail || ''; $('mlpName').value = saved.name || ''; $('mlpPhone').value = saved.phone || '';
  var ned = function(on){ back.querySelectorAll('[data-ned]').forEach(function(x){ x.hidden = !on }); };
  ned(false);
  var msg = function(h, bad){ var x = $('mlpMsg'); x.innerHTML = h || ''; x.className = 'hint' + (bad ? ' bad' : ''); };
  var order = null, orderP = null, stop = false, ready = false, PROV = '', PROVS = [], AVOID = '', WANT = '', NED_GO = null;
  var priceTxt = function(){ return order ? order.amount + ' ₪' : '' };
  var close = function(){ stop = true; window.removeEventListener('message', onMsg); back.remove(); };
  $('mlpCancel').onclick = close;
  var done = function(){ close(); if (opt.onPaid) opt.onPaid(order.id); };
  var post = function(d){ if (frame.contentWindow) frame.contentWindow.postMessage(d, '*'); };
  var UNSUP = /לא נתמך|אינו נתמך|not supported|unsupported|foreign|חו["״]?ל|כרטיס זר|אמריקן|american express|amex|diners|דיינרס/i;
  function onMsg(e){
    if (!/^https:\/\/(www\.)?matara\.pro$/.test(e.origin)) return; var d = e.data; if (!d || !d.Name) return;
    if (d.Name === 'Height') { ready = true; frame.style.height = Math.max(430, parseInt(d.Value, 10) + 30) + 'px'; go.disabled = false; msg('ממלאים את פרטי הכרטיס ולוחצים על כפתור התשלום.'); }
    else if (d.Name === 'TransactionResponse') {
      var v = d.Value || {};
      if (v.Status === 'Error' && UNSUP.test(String(v.Message || '')) && PROVS.indexOf('paypal') >= 0) { switchTo('paypal', 'הכרטיס הזה לא נתמך כאן. עוברים לתשלום בכרטיס דרך PayPal…'); return; }
      if (v.Status === 'Error') { go.disabled = false; go.textContent = 'לתשלום ' + priceTxt(); msg(esc(v.Message || 'התשלום לא עבר. בדקו את הפרטים ונסו שוב.'), 1); }
      else { go.hidden = true; frame.style.display = 'none'; msg('התשלום התקבל. מאשרים…'); waitPaid(); }
    }
  }
  window.addEventListener('message', onMsg);
  frame.addEventListener('load', function(){ post({ Name: 'GetHeight' }); });

  function mkOrder(){
    var mail = $('mlpMail').value.trim();
    var body = Object.assign({}, opt.body || {}, { email: mail, avoid: AVOID, prov: WANT });
    return fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(r){ return r.json().catch(function(){ return {} }).then(function(j){ if (!r.ok || !(j.tx || j.ppid || j.sumit)) throw Object.assign(new Error(j.error || r.status), { msg: j.message }); return j; }); })
      .then(function(j){ order = j; PROVS = j.provs || [j.provider]; setup(j.provider); return j; });
  }
  function resetPay(){ var box = $('mlpBox'); box.innerHTML = ''; box.hidden = true; frame.hidden = true; if (NED_GO) go.onclick = NED_GO; go.hidden = false; go.disabled = true; ned(false); PROV = ''; ready = false; }
  function switchTo(pv, why, avoid){ if (stop) return; if (avoid) AVOID = avoid; WANT = pv || ''; resetPay(); msg(why || 'טוען…'); orderP = mkOrder(); orderP.catch(function(e){ msg(e.msg ? esc(e.msg) : 'התשלום באתר לא זמין כרגע. נסו שוב בעוד כמה דקות.', 1); }); }
  function drawChoose(){
    var c = $('mlpChoose'), L = PROVS.slice(); if (L.length < 2) { c.hidden = true; return; }
    var N = { nedarim: '💳 כרטיס אשראי', sumit: '💳 כרטיס אשראי', paypal: 'PayPal / כרטיס מחו״ל' };
    c.hidden = false; c.innerHTML = L.map(function(k){ return '<button type="button" role="radio" aria-checked="' + (k === PROV) + '" data-pv="' + k + '">' + (L.filter(function(x){ return x !== 'paypal' }).length > 1 && k !== 'paypal' ? (k === 'sumit' ? '💳 כרטיס (SUMIT)' : '💳 כרטיס (נדרים פלוס)') : N[k]) + '</button>'; }).join('');
    c.querySelectorAll('[data-pv]').forEach(function(b){ b.onclick = function(){ if (b.dataset.pv !== PROV) switchTo(b.dataset.pv); }; });
  }
  function setup(pv){
    PROV = pv || 'nedarim'; drawChoose(); go.textContent = 'לתשלום ' + priceTxt();
    if (PROV === 'nedarim') {
      frame.hidden = false; frame.src = frame.dataset.src; ned(true); go.disabled = true; msg('טוען טופס תשלום מאובטח…');
      if (!NED_GO) NED_GO = nedGo; go.onclick = nedGo;
      setTimeout(function(){ if (!ready && !stop && PROV === 'nedarim') msg('טופס התשלום לא נטען. נסו לרענן את הדף.', 1); }, 12000);
      return;
    }
    if (PROV === 'sumit') {
      ready = true; ned(false); back.querySelector('#mlpName').closest('label').hidden = false;
      var box = $('mlpBox'); box.hidden = false;
      box.innerHTML = '<form id="mlpSm" onsubmit="return false" dir="rtl" style="display:flex;flex-direction:column;gap:10px"><label>מספר כרטיס<input type="text" data-og="cardnumber" inputmode="numeric" autocomplete="cc-number" dir="ltr" maxlength="19"></label>' +
        '<div class="cf2"><label>חודש<select data-og="expirationmonth">' + Array.from({ length: 12 }, function(_, i){ return '<option>' + String(i + 1).padStart(2, '0') + '</option>' }).join('') + '</select></label><label>שנה<select data-og="expirationyear">' + Array.from({ length: 12 }, function(_, i){ var y = new Date().getFullYear() + i; return '<option value="' + y + '">' + y + '</option>' }).join('') + '</select></label></div>' +
        '<div class="cf2"><label>3 ספרות בגב הכרטיס<input type="text" data-og="cvv" inputmode="numeric" autocomplete="cc-csc" dir="ltr" maxlength="4"></label><label>תעודת זהות<input type="text" data-og="citizenid" inputmode="numeric" dir="ltr" maxlength="9"></label></div></form>';
      msg('ממלאים את פרטי הכרטיס ולוחצים על כפתור התשלום. הקבלה תישלח למייל.');
      var fallback = function(why){ if (PROV === 'sumit') switchTo('', why || 'עוברים לדרך תשלום אחרת…', 'sumit'); };
      var libs = (window.jQuery ? Promise.resolve() : load('https://code.jquery.com/jquery-3.7.1.min.js')).then(function(){ return window.OfficeGuy ? null : load('https://app.sumit.co.il/scripts/payments.js'); });
      libs.catch(function(){ fallback('טופס התשלום לא נטען. עוברים לדרך תשלום אחרת…'); });
      go.hidden = false; go.disabled = false;
      go.onclick = function(){
        var name = $('mlpName').value.trim(), mail = $('mlpMail').value.trim();
        if (name.split(/\s+/).length < 2) { msg('נא למלא שם פרטי ושם משפחה.', 1); $('mlpName').focus(); return; }
        go.disabled = true; go.textContent = 'מעבד תשלום…'; msg('מעבד תשלום…');
        var fail = function(t){ go.disabled = false; go.textContent = 'לתשלום ' + priceTxt(); msg(esc(t), 1); };
        Promise.all([orderP, libs]).then(function(r){ var o = r[0]; return new Promise(function(res, rej){ var S = o.sumit || {};
          window.OfficeGuy.Payments.CreateToken({ CompanyID: S.cid, APIPublicKey: S.pk, FormSelector: '#mlpSm',
            ResponseCallback: function(x){ if (x && x.Status === 0 && x.Data && x.Data.SingleUseToken) res({ o: o, t: x.Data.SingleUseToken }); else rej(Object.assign(new Error((x && x.UserErrorMessage) || 'פרטי הכרטיס לא תקינים'), { sys: !x || (x.Status !== 1 && !x.UserErrorMessage) })); } }); }); })
          .then(function(r){ return fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sumitcharge', id: r.o.id, token: r.t, name: name, email: mail }) }).then(function(x){ return x.json() }); })
          .then(function(x){ if (x.fallback) { fallback(x.message); return; } if (x.status === 'paid') { done(); return; } fail(x.message || 'התשלום לא אושר.'); })
          .catch(function(e){ if (e && e.sys) { fallback(); return; } fail(e.message || 'התשלום נכשל. נסו שוב.'); });
      };
      return;
    }
    /* PayPal: כרטיס אשראי דרך פייפל */
    ready = true; ned(false); go.hidden = true; var pbox = $('mlpBox'); pbox.hidden = false; msg('טוען טופס תשלום מאובטח…');
    var createOrder = function(){ return orderP.then(function(o){ return o.ppid }) };
    var onApprove = function(){ msg('מאשרים את התשלום…'); return orderP.then(function(o){ return fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ppcapture', id: o.id }) }).then(function(r){ return r.json() }); })
      .then(function(x){ if (x.status === 'paid') { done(); return; } msg(esc(x.message || 'התשלום לא הושלם. אפשר לנסות שוב.'), 1); })
      .catch(function(){ msg('לא הצלחנו לאשר את התשלום. אם חויבתם, פנו אלינו עם מספר ההזמנה ' + (order ? order.id.slice(0, 8) : ''), 1); }); };
    cfg().then(function(d){
      if (!d || !d.ppc) { msg('התשלום בפייפל עדיין לא מוגדר.', 1); return; }
      var run = function(){ if (stop) return; var P = window.paypal, cf = null;
        try { cf = P.CardFields && P.CardFields({ createOrder: createOrder, onApprove: onApprove, onError: function(){ msg('התשלום נכשל. בדקו את פרטי הכרטיס ונסו שוב.', 1); }, style: { input: { 'font-size': '16px', 'font-family': 'Arial,sans-serif', direction: 'ltr' } } }); } catch (e) { cf = null; }
        if (cf && cf.isEligible()) {
          pbox.innerHTML = '<label>מספר כרטיס<div id="mlpPpNum"></div></label><div class="cf2"><label>תוקף<div id="mlpPpExp"></div></label><label>3 ספרות בגב הכרטיס<div id="mlpPpCvv"></div></label></div>';
          cf.NumberField({ placeholder: '0000 0000 0000 0000' }).render('#mlpPpNum'); cf.ExpiryField({ placeholder: 'MM/YY' }).render('#mlpPpExp'); cf.CVVField({ placeholder: '123' }).render('#mlpPpCvv');
          go.hidden = false; go.disabled = false; msg('ממלאים את פרטי הכרטיס ולוחצים על כפתור התשלום.');
          go.onclick = function(){ go.disabled = true; go.textContent = 'מעבד תשלום…'; cf.submit().catch(function(){ go.disabled = false; go.textContent = 'לתשלום ' + priceTxt(); msg('פרטי הכרטיס חסרים או לא תקינים.', 1); }); };
          return;
        }
        var b = P.Buttons({ fundingSource: P.FUNDING.CARD, style: { layout: 'vertical', shape: 'rect' }, createOrder: createOrder, onApprove: onApprove, onError: function(){ msg('תקלה בטופס התשלום. נסו שוב.', 1); } });
        if (b.isEligible && !b.isEligible()) { msg('התשלום בכרטיס אשראי לא זמין כרגע.', 1); return; }
        b.render(pbox); msg('לוחצים על "כרטיס אשראי" וממלאים את הפרטים.');
      };
      if (window.paypal) run(); else load('https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(d.ppc) + '&currency=ILS&intent=capture&locale=he_IL&components=buttons,card-fields&disable-funding=paylater,venmo').then(run).catch(function(){ msg('לא הצלחנו לטעון את טופס התשלום. נסו לרענן את הדף.', 1); });
    });
  }
  function nedGo(){
    var name = $('mlpName').value.trim(), mail = $('mlpMail').value.trim(), phone = $('mlpPhone').value.trim(), zeout = $('mlpZeout').value.replace(/\D/g, '');
    if (name.split(/\s+/).length < 2) { msg('נא למלא שם פרטי ושם משפחה.', 1); $('mlpName').focus(); return; }
    if (zeout && !tzOk(zeout)) { msg('מספר תעודת הזהות לא תקין. בדקו את הספרות, או השאירו ריק אם הכרטיס אינו ישראלי.', 1); $('mlpZeout').focus(); return; }
    try { localStorage.setItem('myluach-buyer', JSON.stringify({ name: name, mail: mail, phone: phone })) } catch (e) {}
    if (!ready) { msg('טופס התשלום עדיין נטען, נסו שוב בעוד רגע.', 1); return; }
    go.disabled = true; go.textContent = 'מעבד תשלום…'; msg('מעבד תשלום…');
    post({ Name: 'FinishTransaction2', Value: Object.assign({}, order.tx, { Zeout: zeout, FirstName: name, LastName: '', Phone: phone, Mail: mail }) });
  }
  function waitPaid(){
    var t0 = Date.now();
    (function poll(){ if (stop || !order) return;
      fetch('/api/order?id=' + order.id).then(function(r){ return r.json() }).then(function(o){
        if (o.status === 'paid') { done(); return; }
        if (Date.now() - t0 > 90000) { msg('התשלום התקבל, אבל האישור מתעכב. הקישור לעיצוב יישלח למייל שלכם.'); setTimeout(poll, 15000); return; }
        setTimeout(poll, 2500);
      }).catch(function(){ setTimeout(poll, 5000); });
    })();
  }
  /* שלב ראשון: מייל. רק אחריו נוצרת ההזמנה (הקישור לעיצוב נשלח לשם) */
  go.onclick = function(){
    var mail = $('mlpMail').value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { msg('נא למלא כתובת מייל תקינה. לשם יישלח הקישור לעיצוב.', 1); $('mlpMail').focus(); return; }
    try { var sv = JSON.parse(localStorage.getItem('myluach-buyer') || '{}') || {}; sv.mail = mail; localStorage.setItem('myluach-buyer', JSON.stringify(sv)); } catch (e) {}
    $('mlpMail').readOnly = true; go.disabled = true; msg('טוען טופס תשלום מאובטח…');
    orderP = mkOrder(); orderP.catch(function(e){ go.disabled = false; $('mlpMail').readOnly = false; msg(e.msg ? esc(e.msg) : 'התשלום באתר עדיין לא פעיל. נסו שוב בקרוב.', 1); });
  };
  setTimeout(function(){ $('mlpMail').focus() }, 50);
}
window.MLPay = { open: open };
})();
