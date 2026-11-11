# שינויים בהזמנות הדיגיטליות (נובמבר 2026)

קבצים ששונו: timer.html (המקור של invite.html), t.html (דף האורחים), assets/pay.js, api/_timer.js, api/_eventpay.js,
api/_paid.js, api/_mail.js, api/_nedarim.js, api/checkout.js, api/admin.js, admin.html, admin-events.html, terms.html,
tools/gen_invite.py, vercel.json. חדש: invite-gifts.html.
אחרי העלאה: להריץ python3 tools/gen_invite.py, gen_invite_en.py, gen_timer_en.py, gen_yi.py (כבר הורצו בחבילה).

משתני סביבה: BREVO_API_KEY (חובה להזמנות), MAIL_INVITE_ORDER (ברירת מחדל brevo), MAIL_OTHER_ORDER (resend,mailjet),
MAIL_CAP_BREVO (0 = בלי מגבלה יומית), NEDARIM_BIT=off (כיבוי ביט).

## עדכון: סדר יום ודשבורד
- סדר היום: שורות של שעה ושם (שדה `ag` בהגדרות האירוע), עד 12; מספר השורות לפי מסלול נקבע בניהול האירועים (agFree, agMax). אירועים ישנים עם שעה נוספת מומרים לשורות בעריכה.
- דשבורד: לשונית ⑤ באזור האישי: סיכום, "מה כדאי לעשות עכשיו", ההודעה האוטומטית הבאה, וטבלת מוזמנים עם סינון. הקישור האישי מהמייל נפתח ישר בה.

## ניתוב מיילים (דף הניהול, "מיילים ותזכורות" > "ניתוב מיילים")
- הזמנות דיגיטליות: ברירת מחדל Brevo בלבד. לוח, ברכות ושאר האתר: Resend ← Mailjet ← Brevo (כשהמכסה היומית או החודשית מלאה).
- אפשר לשנות בדף הניהול (שמות ספקים לפי סדר + מכסות), או במשתנים MAIL_INVITE_ORDER / MAIL_OTHER_ORDER. סדר עדיפות: ניהול, משתנה, ברירת מחדל.
- ספקים: resend, brevo, mailjet, ses (Amazon SES: SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY, SES_REGION).
- מכסות: MAIL_CAP_<ספק> (יומית), MAIL_MONTH_<ספק> (חודשית), MAIL_HOURLY_<ספק> (לשעה); 0 = בלי הגבלה.

## אזור אישי עם כניסה במייל
- /invite-my: כל האירועים של החשבון. כניסה עם מייל דרך הכניסה הקיימת של האתר (app.html#login).
- api/_evowners.js: קישור אירוע ← מייל (settings.evowners). נקשר אוטומטית בהפעלה (בתשלום או חינם), ובפתיחת האירוע בדפדפן עם התחברות (act: claim).
- act mine = רשימת האירועים של החשבון.

## לשוניות
- שלושה שלבי הגדרה (① פרטי האירוע, ② עיצוב, ③ נוסח ההזמנה), ומתחתם "ניהול האירוע": דשבורד, נמענים ומאגרים, שליחה, המסלול שלי (שימוש במכסות, קניית מסלול, שדרוג, הוספת מיילים), סיכום אירועים (כל אירועי החשבון עם ספירות).
- act mine מחזיר עכשיו גם ספירות לכל אירוע (נמענים, נשלחו, מגיעים, לא מגיעים, מתלבטים).
