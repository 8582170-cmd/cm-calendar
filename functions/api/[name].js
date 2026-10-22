/* כל הכתובות /api/<שם> → הפונקציה המתאימה ב-api/<שם>.js */
import { run } from '../_adapter.js';
import admin from '../../api/admin.js';
import checkout from '../../api/checkout.js';
import cronReminders from '../../api/cron-reminders.js';
import greetings from '../../api/greetings.js';
import ical from '../../api/ical.js';
import me from '../../api/me.js';
import nedarimCallback from '../../api/nedarim-callback.js';
import order from '../../api/order.js';
import pricing from '../../api/pricing.js';
import remConfirm from '../../api/rem-confirm.js';
import remSubscribe from '../../api/rem-subscribe.js';
import ticker from '../../api/ticker.js';
import user from '../../api/user.js';
const H = { admin, checkout, 'cron-reminders': cronReminders, greetings, ical, me, 'nedarim-callback': nedarimCallback, order, pricing, 'rem-confirm': remConfirm, 'rem-subscribe': remSubscribe, ticker, user };
export async function onRequest(context) {
  const h = H[context.params.name];
  if (!h) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  return run(h, context);
}
