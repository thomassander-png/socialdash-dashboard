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
      // Check if customer already exists by name
      const existing = await query(
        'SELECT customer_id FROM customers WHERE name = $1',
        [customer.name]
      );
      
      if (existing.rows.length > 0) {
        // Update existing customer
        await query(
          'UPDATE customers SET slug = $1 WHERE name = $2',
          [customer.slug, customer.name]
        );
      } else {
        // Insert new customer
        await query(
          'INSERT INTO customers (name, slug, is_active) VALUES ($1, $2, true)',
          [customer.name, customer.slug]
        );
      }
      count++;
    }
    
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Failed to seed customers:', error);
    return NextResponse.json({ error: 'Failed to seed customers' }, { status: 500 });
  }
}
