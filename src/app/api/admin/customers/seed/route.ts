import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const defaultCustomers = [
  { name: "Vergleich.org", slug: "vergleich-org" },
  { name: "CASIO G-SHOCK", slug: "casio-g-shock" },
  { name: "Pelikan", slug: "pelikan" },
  { name: "Autohero", slug: "autohero" },
  { name: "Herlitz", slug: "herlitz" },
  { name: "CONTIPARK", slug: "contipark" },
  { name: "Heinz Sielmann Stiftung", slug: "sielmann-stiftung" },
  { name: "ABDA Apotheken", slug: "abda-apotheken" },
  { name: "famefact", slug: "famefact" },
  { name: "Vivantes", slug: "vivantes" },
  { name: "GRG Gebäudereiniger", slug: "grg" },
];

export async function POST() {
  try {
    let count = 0;
    
    for (const customer of defaultCustomers) {
      await query(`
        INSERT INTO customers (name, slug, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      `, [customer.name, customer.slug]);
      count++;
    }
    
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Failed to seed customers:', error);
    return NextResponse.json({ error: 'Failed to seed customers' }, { status: 500 });
  }
}
