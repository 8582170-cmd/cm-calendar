/* MyLuach: גיבוי לגוגל שיטס.
   1. פותחים גיליון חדש ב-Google Sheets → תוספים (Extensions) → Apps Script, מוחקים הכל ומדביקים את הקוד הזה.
   2. בצד שמאל: הגדרות הפרויקט (⚙) → Script properties → Add: שם TOKEN, ערך: סיסמה ארוכה שתמציאו.
   3. פריסה (Deploy) → New deployment → סוג: Web app → Execute as: Me → Who has access: Anyone → Deploy, ומאשרים הרשאות.
   4. מעתיקים את כתובת ה-Web app (מסתיימת ב-/exec).
   5. ב-Vercel → Settings → Environment Variables: SHEETS_BACKUP_URL = הכתובת, SHEETS_BACKUP_TOKEN = אותה סיסמה. ואז Redeploy. */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var tok = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!tok || d.token !== tok) return out({ ok: false, error: 'token' });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    Object.keys(d.tables || {}).forEach(function (name) {
      var t = d.tables[name]; if (!t || !t.cols) return;
      var sh = ss.getSheetByName(name) || ss.insertSheet(name);
      sh.clear();
      var rows = [t.cols].concat((t.rows || []).map(function (r) { return r.map(function (v) { v = v == null ? '' : v; return typeof v === 'string' && v.length > 49000 ? v.slice(0, 49000) + '…' : v; }); }));
      sh.getRange(1, 1, rows.length, t.cols.length).setValues(rows);
      sh.setFrozenRows(1); sh.getRange(1, 1, 1, t.cols.length).setFontWeight('bold');
    });
    var log = ss.getSheetByName('גיבויים') || ss.insertSheet('גיבויים', 0);
    log.appendRow([new Date(), d.at, Object.keys(d.tables || {}).map(function (k) { var t = d.tables[k]; return k + ':' + (t.rows ? t.rows.length : t.error); }).join(' · ')]);
    return out({ ok: true });
  } catch (err) { return out({ ok: false, error: String(err) }); }
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
