import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const portfolios = [
  {
    name: 'page 1',
    services: [
      { name: 'Alongamento em Gel', duration_minutes: 120, price_cents: 15000 },
      { name: 'Nail Art', duration_minutes: 30, price_cents: 4000 },
      { name: 'Blindagem', duration_minutes: 60, price_cents: 8000 }
    ]
  },
  {
    name: 'page 2',
    services: [
      { name: 'Lash Lifting', duration_minutes: 50, price_cents: 18000 },
      { name: 'Brow Lamination', duration_minutes: 45, price_cents: 16000 },
      { name: 'Combo Lash + Brow', duration_minutes: 90, price_cents: 29000 },
      { name: 'Design de Sobrancelhas', duration_minutes: 30, price_cents: 8000 },
      { name: 'Tintura de Cílios', duration_minutes: 20, price_cents: 6000 },
      { name: 'Manutenção', duration_minutes: 30, price_cents: 10000 }
    ]
  },
  {
    name: 'page 3',
    services: [
      { name: 'Design de Sobrancelhas', duration_minutes: 30, price_cents: 8000 },
      { name: 'Brow Lamination', duration_minutes: 45, price_cents: 16000 },
      { name: 'Combo Lash + Brow', duration_minutes: 90, price_cents: 29000 },
      { name: 'Lash Lifting', duration_minutes: 50, price_cents: 18000 },
      { name: 'Extensão de Cílios', duration_minutes: 120, price_cents: 25000 }
    ]
  },
  {
    name: 'page 4',
    services: [
      { name: 'Corte', duration_minutes: 60, price_cents: 12000 },
      { name: 'Coloração', duration_minutes: 120, price_cents: 25000 },
      { name: 'Mechas', duration_minutes: 180, price_cents: 35000 },
      { name: 'Tratamento', duration_minutes: 60, price_cents: 15000 },
      { name: 'Penteado', duration_minutes: 60, price_cents: 18000 }
    ]
  },
  {
    name: 'page 5',
    services: [
      { name: 'Limpeza de Pele', duration_minutes: 60, price_cents: 18000 },
      { name: 'Peeling', duration_minutes: 45, price_cents: 22000 },
      { name: 'Microagulhamento', duration_minutes: 60, price_cents: 35000 },
      { name: 'Drenagem Linfática', duration_minutes: 60, price_cents: 15000 },
      { name: 'Massagem Relaxante', duration_minutes: 60, price_cents: 12000 }
    ]
  }
];

async function main() {
  for (const port of portfolios) {
    const slug = port.name.replace(' ', '-');
    console.log(`Creating professional: ${port.name} (${slug})`);
    
    const { data: prof, error: profError } = await supabase
      .from('professionals')
      .upsert({ 
        name: port.name, 
        brand_name: port.name, 
        slug: slug,
        email: `${slug}@example.com`,
        whatsapp: '5511999999999',
        primary_color: '#000000',
        secondary_color: '#ffffff',
        status: 'active'
      }, { onConflict: 'slug' })
      .select('*')
      .single();
      
    if (profError) {
      console.error(`Error creating ${port.name}:`, profError);
      continue;
    }
    
    // Delete old services to avoid duplicates
    await supabase.from('services').delete().eq('professional_id', prof.id);
    
    // Create new services
    const servicesToInsert = port.services.map(srv => ({
      professional_id: prof.id,
      name: srv.name,
      duration_minutes: srv.duration_minutes,
      price_cents: srv.price_cents,
      is_active: true
    }));
    
    const { error: srvError } = await supabase.from('services').insert(servicesToInsert);
    if (srvError) {
      console.error(`Error creating services for ${port.name}:`, srvError);
    } else {
      console.log(`Services created for ${port.name}`);
    }
  }
}

main().catch(console.error);
