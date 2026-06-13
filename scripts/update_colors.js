// Credenciais via ambiente — NUNCA hardcode chaves no repositório.
// Ex.: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/update_colors.js
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const colors = {
  'page-1': '#500B18',
  'page-2': '#B8956A',
  'page-3': '#3b2e2a',
  'page-4': '#718a7a',
  'page-5': '#8C7853'
};

async function main() {
  for (const [slug, color] of Object.entries(colors)) {
    console.log("Updating", slug, color);
    const res = await fetch(`${url}/rest/v1/professionals?slug=eq.${slug}`, {
      method: 'PATCH',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ primary_color: color })
    });
    if (!res.ok) {
      console.error(await res.text());
    } else {
      console.log("Updated", slug);
    }
  }
}

main();
