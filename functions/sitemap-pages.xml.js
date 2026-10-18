/* מפת האתר של הדפים והמאמרים שנוצרו בניהול */
import { run } from './_adapter.js';
import pricing from '../api/pricing.js';
export const onRequest = context => run(pricing, context, { pg: '_sitemap' });
