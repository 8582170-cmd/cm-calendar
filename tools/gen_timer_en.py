#!/usr/bin/env python3
"""יוצר את timer-en.html (בונה הספירה לאחור באנגלית) מתוך timer.html.
מריצים אחרי כל שינוי ב-timer.html:  python3 tools/gen_timer_en.py
הקוד זהה בשני הדפים, ורק הטקסטים מתורגמים (רשימת התרגומים למטה). אם טקסט עברי חדש לא תורגם, הסקריפט מתריע."""
import json, re, html, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'timer.html'), encoding='utf-8').read()

# החלפות במבנה הדף (לפני התרגום)
STRUCT = [
    ('<html lang="he" dir="rtl">', '<html lang="en" dir="ltr">'),
    ('<link rel="canonical" href="https://www.myluach.org/timer">', '<link rel="canonical" href="https://www.myluach.org/timer-en">'),
    ('<meta property="og:url" content="https://www.myluach.org/timer">', '<meta property="og:url" content="https://www.myluach.org/timer-en">'),
    ('<meta property="og:locale" content="he_IL">', '<meta property="og:locale" content="en_US">'),
    ('<a class="logo" href="./">', '<a class="logo" href="en.html">'),
    ('<a href="countdown.html">לוח ספירה להדפסה</a><a class="lsw" href="timer-en.html" hreflang="en" lang="en">English</a>',
     '<a href="countdown-en.html">Printable countdown</a><a class="lsw" href="timer.html" hreflang="he" lang="he">עברית</a>'),
    ('<option value="he">עברית</option><option value="en">English</option>', '<option value="he">עברית</option><option value="en" selected>English</option>'),
    ('<a href="countdown.html">בונים לוח ספירה לאחור להדפסה</a>', '<a href="countdown-en.html">make a printable countdown calendar</a>'),
    ('<footer><span>© 2026 MyLuach</span><a href="./">דף הבית</a><a href="countdown.html">לוח ספירה להדפסה</a><a href="online/">הלוח המקוון</a>',
     '<footer><span>© 2026 MyLuach</span><a href="en.html">Home</a><a href="countdown-en.html">Printable countdown</a><a href="online/en/">Online Jewish calendar</a>'),
]

# תרגומים (הארוכים קודם, כדי שקטע קצר לא יחליף חלק ממשפט ארוך)
T = [
    ('ספירה לאחור לאירוע · שעון ספירה לאחור לחתונה ולבר מצווה, בחינם | MyLuach', 'Countdown Timer to Any Date · Free Event Countdown Clock for Websites and Email | MyLuach'),
    ('כמה ימים נשארו? יוצרים שעון ספירה לאחור לחתונה, לבר מצווה, לבת מצווה, ללידה או לכל תאריך: ימים, שעות, דקות ושניות, עם תמונה, תאריך עברי ועיצוב לבחירה. בחינם, עם קישור לשיתוף, קוד להטמעה באתר וטיימר למייל.',
     'How many days are left? Create a free countdown timer to a wedding, bar mitzvah, bat mitzvah, birth or any date: days, hours, minutes and seconds, with a photo, the Hebrew date and a choice of designs. Share a link, embed it on your website, or add an animated timer to your email.'),
    ('שעון ספירה לאחור לאירוע · MyLuach', 'Countdown Timer to Any Event · MyLuach'),
    ('שעון ספירה לאחור לכל תאריך: לשיתוף, להטמעה באתר ולמייל. בחינם.', 'A countdown clock for any date: share it, embed it on a website, or add it to an email. Free.'),
    ('שעון ספירה לאחור לכל תאריך: לחתונה, לבר מצווה וללידה. עם תמונה, תאריך עברי, קישור לשיתוף, קוד להטמעה באתר וטיימר מונפש למייל.',
     'A countdown clock for any date: weddings, bar mitzvahs and births. With a photo, the Hebrew date, a share link, website embed code and an animated email timer.'),
    ('שעון ספירה לאחור לאירוע', 'Countdown Timer to Your Event'),
    ('ספירה לאחור לאירוע', 'Countdown timer'),
    ('שעון דיגיטלי שסופר לאחור עד התאריך שלכם: חתונה, בר מצווה, לידה, חופשה או כל יעד. בחינם, בלי הרשמה. אפשר לשתף בקישור, להטמיע באתר, או להוסיף למייל.',
     'A digital clock that counts down to your date: a wedding, a bar mitzvah, a birth, a vacation or any goal. Free, no sign-up. Share it with a link, embed it on your website, or add it to an email.'),
    ('שם האירוע (הכותרת)', 'Event name (title)'),
    ('למשל: החתונה של שירה ויוסי', 'e.g. Sarah & David’s Wedding'),
    ('תמונה (לא חובה)', 'Photo (optional)'),
    ('צורת התמונה', 'Photo shape'),
    ('רחבה (באנר)', 'Wide (banner)'),
    ('עגולה', 'Round'), ('מלבן', 'Rectangle'),
    ('החלפת תמונה', 'Change photo'), ('בחירת תמונה', 'Choose photo'), ('הסרה', 'Remove'),
    ('שעה (לא חובה)', 'Time (optional)'),
    ('איך להציג', 'Show as'),
    ('ימים, שעות, דקות ושניות', 'Days, hours, minutes, seconds'),
    ('שבועות, ימים, שעות…', 'Weeks, days, hours…'),
    ('חודשים, ימים, שעות…', 'Months, days, hours…'),
    ('למעלה, מתחת לכותרת', 'Top, under the title'),
    ('למטה, מתחת לשעון', 'Bottom, under the clock'),
    ('לא להציג', 'Hide'),
    ('סוג התאריך', 'Date type'),
    ('עברי ולועזי', 'Hebrew and Gregorian'),
    ('תאריך עברי לאירוע בערב', 'Hebrew date for an evening event'),
    ('לפי השקיעה (אחרי השקיעה: היום העברי הבא)', 'By sunset (after sunset: the next Hebrew day)'),
    ('"אור ל־" (למשל: אור לי״ד בניסן)', '"Eve of" (e.g. Eve of 14 Nisan)'),
    ('לפי התאריך הלועזי, בלי שקיעה', 'By the civil date, ignoring sunset'),
    ('יום בשבוע', 'Weekday'), ('שעת היעד', 'Target time'), ('שניות בספירה', 'Seconds'),
    ('הכול בשורה אחת', 'All in one row'),
    ('ימים למעלה, שעון מתחת', 'Days on top, clock below'),
    ('לפי העיצוב', 'As in the design'),
    ('מסגרת לכל מספר', 'Frame each number'),
    ('מסגרת אחת מסביב', 'One frame around'),
    ('מסגרת', 'Frame'), ('פריסה', 'Layout'),
    ('גודל באתר', 'Size on website'),
    ('רוחב מלא', 'Full width'), ('גדול (800×300)', 'Large (800×300)'), ('בינוני (560×240)', 'Medium (560×240)'), ('קטן (360×210)', 'Small (360×210)'),
    ('אזור זמן', 'Time zone'),
    ('כתובת לאירוע (לא חובה)', 'Event address (optional)'),
    ('3–40 תווים: אותיות באנגלית קטנות, ספרות ומקף (לא בהתחלה ולא בסוף).', '3–40 characters: lowercase letters, digits and hyphens (not at the start or end).'),
    ('אותיות באנגלית, ספרות ומקף.', 'Letters, digits and hyphens.'),
    ('שמירה וקבלת כתובת', 'Save and get the address'),
    ('תצוגה מקדימה של הספירה', 'Countdown preview'),
    ('יש שינויים שעוד לא נשמרו בכתובת. לחצו "עדכון הספירה" כדי שהקישור יציג אותם.', 'Some changes are not saved to the address yet. Click "Update countdown" so the link shows them.'),
    ('קישור לשיתוף', 'Share link'),
    ('העתקת הקוד', 'Copy code'),
    ('וואטסאפ', 'WhatsApp'),
    ('להטמעה באתר', 'Embed on a website'),
    ('למייל או לניוזלטר', 'For email or newsletter'),
    ('תמונה שמתעדכנת בכל פתיחה של המייל (השניות זזות במשך דקה, ובכל פתיחה מחדש מתעדכן הזמן). לוחצים "העתקה למייל" ומדביקים (Ctrl+V) ישר בגוף המייל, בג׳ימייל, באאוטלוק או בכל תוכנת דואר.',
     'An image that updates every time the email is opened (the seconds tick for a minute, and each new open shows the current time). Click "Copy for email" and paste (Ctrl+V) straight into the body of your email, in Gmail, Outlook or any mail app.'),
    ('הועתק ✓ עכשיו מדביקים במייל', 'Copied ✓ now paste it into your email'),
    ('לא הצליח. סמנו את התצוגה למעלה והעתיקו', 'Failed. Select the preview above and copy it'),
    ('העתקה למייל', 'Copy for email'),
    ('קוד HTML (לעורך HTML או לתוכנת דיוור)', 'HTML code (for an HTML editor or mailing software)'),
    ('ספירה לאחור להדפסה', 'Printable countdown'),
    ('רוצים גם לוח ספירה לאחור על המקרר, עם תמונה ומשפט לכל יום? ', 'Want a countdown calendar for the fridge too, with a photo and a line for each day? '),
    (', לחתונה, לבר מצווה, ללידה ועוד.', ' for a wedding, a bar mitzvah, a birth and more.'),
    ('שאלות נפוצות', 'FAQ'),
    ('איך מוסיפים את הספירה לאתר?', 'How do I add the countdown to my website?'),
    ('ממלאים את הפרטים, מעתיקים את "הקוד להטמעה באתר" ומדביקים אותו בעורך האתר, במקום שבו רוצים שהשעון יופיע (בוורדפרס: בלוק "HTML מותאם אישית"; בוויקס: "הטמעת קוד"). השעון מתעדכן כל שנייה.',
     'Fill in the details, copy the "Embed on a website" code and paste it into your site editor where you want the clock to appear (WordPress: a "Custom HTML" block; Wix: "Embed code"). The clock updates every second.'),
    ('אפשר להכניס ספירה לאחור למייל?', 'Can I put a countdown in an email?'),
    ('כן. לוחצים "העתקה למייל" ומדביקים בגוף המייל. השעון במייל הוא תמונה מונפשת: השניות זזות במשך דקה, ובכל פתיחה של המייל היא נוצרת מחדש עם הזמן המעודכן. לחיצה עליה פותחת את הספירה החיה. (באאוטלוק למחשב רואים תמונה קבועה, בלי תזוזה.)',
     'Yes. Click "Copy for email" and paste it into the body of the email. The email clock is an animated image: the seconds tick for a minute, and it is created again with the current time every time the email is opened. Clicking it opens the live countdown. (Outlook for desktop shows a still image.)'),
    ('איך משנים ספירה ששמרתי?', 'How do I change a countdown I saved?'),
    ('מאותו מחשב או טלפון שבו שמרתם, נכנסים שוב לדף הזה ובוחרים את הספירה תחת "הספירות שלי", משנים ולוחצים "עדכון הספירה". הקישור והקוד באתר מתעדכנים מעצמם.',
     'On the same computer or phone where you saved it, open this page again, pick the countdown under "My countdowns", make your changes and click "Update countdown". The link and the embedded clock update automatically.'),
    ('זה בחינם?', 'Is it free?'),
    ('כן, לגמרי, בלי הרשמה ובלי הגבלה.', 'Yes, completely. No sign-up and no limits.'),
    ('מה קורה כשמגיע התאריך?', 'What happens when the date arrives?'),
    ('השעון מראה "הגיע הזמן!" במקום המספרים.', 'The clock shows "The time has come!" instead of the numbers.'),
    ('תנאי שימוש', 'Terms'), ('פרטיות', 'Privacy'),

    # דף הזמנה
    ('📨 דף הזמנה לאירוע: אישור הגעה, תזכורות וברכות', '📨 Event invitation page: RSVP, reminders and blessings'),
    ('הקישור של האירוע הופך לדף הזמנה: ההזמנה, השעון, פרטי המקום עם וייז, הוספה ליומן, אישור הגעה, הרשמה לתזכורת וקיר ברכות. עובד עם כתובת שמורה, ונשמר יחד איתה.', 'The event link becomes an invitation page: the invitation, the clock, venue details with Waze, add-to-calendar, RSVP, reminder sign-up and a blessings wall. Works with a saved address, and is saved with it.'),
    ('תמונת ההזמנה (לא חובה)', 'Invitation image (optional)'), ('העלאת הזמנה', 'Upload invitation'), ('החלפת ההזמנה', 'Change invitation'),
    ('נוסח ההזמנה (לא חובה)', 'Invitation text (optional)'), ('בשעה טובה ומוצלחת, אנו שמחים להזמינכם…', 'We are delighted to invite you…'),
    ('שם המקום', 'Venue name'), ('אולמי…', 'Hall…'), ('כתובת (לוויז ולמפות)', 'Address (for Waze and maps)'), ('רחוב, עיר', 'Street, city'),
    ('שעת קבלת פנים', 'Reception time'), ('מה קורה בשעת היעד', 'What happens at the target time'), ('placeholder="חופה"', 'placeholder="Ceremony"'),
    ('>אישור הגעה<', '>RSVP<'), ('>הרשמה לתזכורת<', '>Reminder sign-up<'), ('>קיר ברכות<', '>Blessings wall<'), ('>חלוקת תהילים<', '>Psalms division<'),
    ('לזכות מי? (יופיע מעל החלוקה)', 'In whose merit? (shown above the division)'), ('לזכות החתן והכלה, להצלחתם ולבניין בית נאמן', 'In the merit of the bride and groom'),
    ('הזמנות אישיות', 'Personal invitations'), ('נוסח אישי ({שם} יוחלף בשם של כל מוזמן)', 'Personal line ({name} is replaced by each guest’s name)'),
    ('לכבוד {שם}, נשמח מאוד לראותך בשמחתנו!', 'Dear {name}, we would be delighted to celebrate with you!'),
    ('שמות המוזמנים (שורה לכל אחד)', 'Guest names (one per line)'), ('משפחת כהן&#10;דוד ושרה לוי', 'The Cohen family&#10;David and Sarah Levi'),
    ('יצירת קישורים אישיים', 'Create personal links'), ('אישורי הגעה וברכות', 'RSVPs and blessings'), ('הצגה ורענון', 'Show / refresh'),
    ('הורדה לאקסל (CSV)', 'Download for Excel (CSV)'), ('📖 ספר ברכות להדפסה', '📖 Printable book of blessings'), ('פתיחת דף ההזמנה', 'Open the invitation page'),
    ('אפשר לבחור רק קובץ תמונה (JPG או PNG).', 'Please choose an image file (JPG or PNG).'), ('ההזמנה נוספה ✓ אל תשכחו לשמור', 'Invitation added ✓ don’t forget to save'),
    ('קודם שומרים כתובת לאירוע (למעלה), ואז יוצרים קישורים.', 'First save an event address (above), then create links.'), ('כתבו לפחות שם אחד.', 'Enter at least one name.'),
    ("'העתקת קישור'", "'Copy link'"), ('>העתקת קישור<', '>Copy link<'),
    ("'טוען…'", "'Loading…'"), ('אישורי הגעה וברכות עוד לא הופעלו באתר (חסרות טבלאות במסד הנתונים).', 'RSVPs and blessings are not enabled on the site yet.'),
    ('לא הצלחנו לטעון. אפשר לנהל רק מהדפדפן שבו נשמרה הכתובת.', 'Could not load. You can manage only from the browser where the address was saved.'), ('לא הצלחנו לטעון. בדקו את החיבור.', 'Could not load. Check your connection.'),
    ('<p class="sum">מגיעים: ', '<p class="sum">Coming: '), ('>ברכות (', '>Blessings ('), ("' אישורים · '", "' replies · '"), ("' מבוגרים, '", "' adults, '"), ("' ילדים · לא מגיעים: '", "' children · Not coming: '"), ("' · אולי: '", "' · Maybe: '"),
    ("{yes:'מגיעים',no:'לא מגיעים',maybe:'אולי'}", "{yes:'Coming',no:'Not coming',maybe:'Maybe'}"),
    ('<th>שם</th><th>תשובה</th><th>מבוגרים</th><th>ילדים</th><th>טלפון</th><th>הערה</th><th>מתי</th>', '<th>Name</th><th>Reply</th><th>Adults</th><th>Children</th><th>Phone</th><th>Note</th><th>When</th>'),
    ("['שם','תשובה','מבוגרים','ילדים','טלפון','הערה','מתי']", "['Name','Reply','Adults','Children','Phone','Note','When']"),
    ('>מחיקה<', '>Delete<'), ('עוד אין אישורי הגעה.', 'No RSVPs yet.'), ("'ברכות ('", "'Blessings ('"), ("'גלויה לכולם'", "'visible to all'"), ("'רק לכם'", "'only you'"), ("' · מוסתרת'", "' · hidden'"),
    ("'להציג'", "'Show'"), ("'להסתיר'", "'Hide'"), ('עוד אין ברכות.', 'No blessings yet.'), ("'חלוקת תהילים'", "'Psalms division'"), ("'<p><b>סבב '", "'<p><b>Round '"), ("':</b> נלקחו '", "':</b> taken '"),
    ("' מתוך 150'", "' of 150'"), ("' ✓ הושלם'", "' ✓ complete'"), ('<summary>מי לקח מה</summary>', '<summary>Who took what</summary>'),
    ('למחוק את אישור ההגעה?', 'Delete this RSVP?'), ('למחוק את הברכה?', 'Delete this blessing?'), ("'ספר ברכות'", "'Book of Blessings'"),
    ('הדפדפן חסם את החלון. אפשרו חלונות קופצים לדף הזה.', 'The browser blocked the window. Allow pop-ups for this page.'),
    # JS
    ("'קלאסי'", "'Classic'"), ("'חתונה'", "'Wedding'"), ("'בר מצווה'", "'Bar mitzvah'"), ("'בת מצווה'", "'Bat mitzvah'"),
    ("'ילדים'", "'Kids'"), ("'אלגנטי'", "'Elegant'"), ("'דיגיטלי'", "'Digital'"), ("'מינימלי'", "'Minimal'"),
    ('אפשר לבחור רק קובץ תמונה.', 'Please choose an image file.'),
    ('מכין את התמונה…', 'Preparing the photo…'), ('מעלה…', 'Uploading…'),
    ('התמונה נוספה ✓', 'Photo added ✓'),
    ('הועלו יותר מדי תמונות בשעה האחרונה. נסו שוב מאוחר יותר.', 'Too many photos were uploaded in the last hour. Please try again later.'),
    ('ההעלאה לא הצליחה. נסו תמונה אחרת.', 'Upload failed. Try another photo.'),
    ('ההעלאה לא הצליחה. בדקו את החיבור.', 'Upload failed. Check your connection.'),
    ('לא הצלחנו לקרוא את התמונה. נסו קובץ JPG או PNG.', 'Could not read the photo. Try a JPG or PNG file.'),
    ("'ישראל'", "'Israel'"), ("'ניו יורק'", "'New York'"), ("'שיקגו'", "'Chicago'"), ("'לוס אנג׳לס'", "'Los Angeles'"), ("'לונדון'", "'London'"),
    ("'פריז / אירופה'", "'Paris / Europe'"), ("'מוסקבה'", "'Moscow'"), ("'סידני'", "'Sydney'"), ("'סאו פאולו'", "'São Paulo'"), ("'יוהנסבורג'", "'Johannesburg'"),
    ("'הספירות שלי: '", "'My countdowns: '"),
    ("'עדכון הספירה'", "'Update countdown'"), ("'נשמר ✓'", "'Saved ✓'"),
    ('הכתובת הזו שלכם. אפשר לשנות ולעדכן.', 'This address is yours. You can change and update it.'),
    ('הכתובת הזו שלכם. אפשר לעדכן.', 'This address is yours. You can update it.'),
    ("'בודק…'", "'Checking…'"),
    ('הכתובת פנויה ✓', 'The address is available ✓'),
    ('הכתובת תפוסה. נסו שם אחר (למשל עם השנה).', 'That address is taken. Try another (for example, add the year).'),
    ('לא הצלחנו לבדוק כרגע. נסו שוב.', 'Could not check right now. Please try again.'),
    ("'שומר…'", "'Saving…'"),
    ("'הספירה עודכנה ✓'", "'Countdown updated ✓'"),
    ("'נשמר! הכתובת שלכם: myluach.org/t/'", "'Saved! Your address: myluach.org/t/'"),
    ('הכתובת כבר נתפסה. נסו שם אחר.', 'That address was just taken. Try another.'),
    ('השמירה לא הצליחה. נסו שוב בעוד רגע.', 'Saving failed. Please try again in a moment.'),
    ('השמירה לא הצליחה. בדקו את החיבור ונסו שוב.', 'Saving failed. Check your connection and try again.'),
    ("'ספירה לאחור'", "'Countdown'"),
    ("'הועתק ✓'", "'Copied ✓'"), ('>העתקה<', '>Copy<'),
    ('>תאריך היעד<', '>Target date<'), ('>תאריך<', '>Date<'), ('>לועזי<', '>Gregorian<'), ('>עברי<', '>Hebrew<'),
    ('>צבע<', '>Color<'), ('>רקע<', '>Background<'), ('>שפה<', '>Language<'), ('>עיצוב<', '>Design<'), ('"עיצוב"', '"Design"'),
]

out = src
for a, b in STRUCT:
    if a not in out: sys.exit('struct not found: ' + a[:60])
    out = out.replace(a, b)
for a, b in sorted(T, key=lambda x: -len(x[0])):
    out = out.replace(a, b)

# נתונים מובנים: בונים מחדש מהטקסט המתורגם
def strip(x): return html.unescape(re.sub('<[^>]+>', '', x))
qa = re.findall(r'<details><summary>(.*?)</summary><p>(.*?)</p></details>', out)
faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": strip(q), "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in qa]}
app = {"@context": "https://schema.org", "@type": "WebApplication", "name": "Countdown Timer · MyLuach", "url": "https://www.myluach.org/timer-en",
       "description": "A free countdown clock for any date, with a photo, the Hebrew date, a share link, website embed code and an animated email timer.",
       "applicationCategory": "UtilitiesApplication", "operatingSystem": "Any", "inLanguage": "en", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}
crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "MyLuach", "item": "https://www.myluach.org/en"},
    {"@type": "ListItem", "position": 2, "name": "Countdown timer", "item": "https://www.myluach.org/timer-en"}]}
lds = re.findall(r'<script type="application/ld\+json">.*?</script>\n', out, flags=re.S)
if len(lds) != 3: sys.exit('expected 3 ld+json blocks, got %d' % len(lds))
new_ld = ''.join('<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False) + '</script>\n' for o in (app, faq, crumbs))
out = out.replace(''.join(lds), new_ld) if ''.join(lds) in out else sys.exit('ld blocks not contiguous')

# בדיקה: טקסט עברי שנשאר מחוץ להערות ולפונקציות התאריך העברי
left = []
for i, line in enumerate(out.split('\n'), 1):
    l = re.sub(r'/\*.*?\*/', '', line)
    if re.search(r'[א-ת]', l) and not re.search(r'function gem|gem\(\+p|אור ל|בשעה|עברית|lab=en|wh = |o "אור', l):
        left.append('%d: %s' % (i, l.strip()[:120]))
open(os.path.join(ROOT, 'timer-en.html'), 'w', encoding='utf-8').write(out)
print('timer-en.html written' + ('' if not left else '\nUntranslated Hebrew:\n' + '\n'.join(left)))
