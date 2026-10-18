/* /torah: מדור דברי תורה */
import { run } from '../_adapter.js';
import pricing from '../../api/pricing.js';
export const onRequest = context => run(pricing, context, { pg: '_torah' });
