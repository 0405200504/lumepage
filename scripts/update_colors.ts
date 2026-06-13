import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const colors = {
  'page-1': '#500B18',
  'page-2': '#B8956A',
  'page-3': '#3b2e2a',
  'page-4': '#718a7a',
  'page-5': '#8C7853'
};

async function main() {
  for (const [slug, color] of Object.entries(colors)) {
    console.log(`Updating ${slug} with color ${color}`);
    const { error } = await supabase
      .from('professionals')
      .update({ primary_color: color })
      .eq('slug', slug);
      
    if (error) {
      console.error(`Error updating ${slug}:`, error);
    } else {
      console.log(`Successfully updated ${slug}`);
    }
  }
}

main().catch(console.error);
