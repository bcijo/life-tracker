import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging
console.log('Supabase Config Debug:', {
    urlExists: !!supabaseUrl,
    urlLength: supabaseUrl?.length,
    urlStart: supabaseUrl?.substring(0, 8),
    keyExists: !!supabaseAnonKey
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Clean up the URL - remove quotes and whitespace
const cleanUrl = supabaseUrl ? supabaseUrl.replace(/["']/g, '').trim() : '';
const cleanKey = supabaseAnonKey ? supabaseAnonKey.replace(/["']/g, '').trim() : '';

if (cleanUrl && !cleanUrl.startsWith('https://')) {
    console.error(`Invalid Supabase URL: "${cleanUrl}". It should start with https://`);
}

export const supabase = createClient(cleanUrl || '', cleanKey || '');
