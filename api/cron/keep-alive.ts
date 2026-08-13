import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function (Works in both Next.js and Vite deployments on Vercel)
export default async function handler(req: Request) {
  // 1. Security Check: Ensure the request comes from Vercel Cron
  // You must set CRON_SECRET in your Vercel Environment Variables
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
    );

    // 3. Lightweight dummy query to keep the database alive
    // Fetching exactly 1 row from a small table (e.g., app_settings) is extremely lightweight
    const { error } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, message: 'Supabase kept alive' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Keep-Alive Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Config to use Edge runtime for faster execution (optional but recommended)
export const config = {
  runtime: 'edge',
};
