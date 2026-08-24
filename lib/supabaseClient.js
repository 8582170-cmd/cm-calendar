import { createClient } from '@supabase/supabase-js';

// שני המשתנים האלה מוגדרים בקובץ .env.local (ראה .env.example)
// ומגיעים מהפרויקט שלך ב-Supabase: Settings -> API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // עוזר לגלות מהר אם שכחת להגדיר את משתני הסביבה
  console.warn(
    'חסרים משתני סביבה של Supabase - בדוק את קובץ .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
