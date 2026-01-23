import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name, fbPageId, igAccountId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if customer already exists
    const existing = await query<{ customer_id: number }>(
      `SELECT customer_id FROM customers WHERE LOWER(name) = LOWER($1)`,
      [name]
    );

    let customerId: number;

    if (existing.length > 0) {
      customerId = existing[0].customer_id;
      console.log(`Customer "${name}" already exists with ID ${customerId}`);
    } else {
      // Insert new customer
      const result = await query<{ customer_id: number }>(
        `INSERT INTO customers (name, is_active) VALUES ($1, true) RETURNING customer_id`,
        [name]
      );
      customerId = result[0].customer_id;
      console.log(`Created customer "${name}" with ID ${customerId}`);
    }

    // Add Facebook account if provided
    if (fbPageId) {
      const existingFb = await query(
        `SELECT 1 FROM customer_accounts WHERE customer_id = $1 AND account_id = $2 AND platform = 'facebook'`,
        [customerId, fbPageId]
      );
      
      if (existingFb.length === 0) {
        await query(
          `INSERT INTO customer_accounts (customer_id, account_id, platform) VALUES ($1, $2, 'facebook')`,
          [customerId, fbPageId]
        );
        console.log(`Added Facebook account ${fbPageId} to customer ${customerId}`);
      }
    }

    // Add Instagram account if provided
    if (igAccountId) {
      const existingIg = await query(
        `SELECT 1 FROM customer_accounts WHERE customer_id = $1 AND account_id = $2 AND platform = 'instagram'`,
        [customerId, igAccountId]
      );
      
      if (existingIg.length === 0) {
        await query(
          `INSERT INTO customer_accounts (customer_id, account_id, platform) VALUES ($1, $2, 'instagram')`,
          [customerId, igAccountId]
        );
        console.log(`Added Instagram account ${igAccountId} to customer ${customerId}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      customerId,
      message: `Customer "${name}" added/updated successfully`
    });
  } catch (error) {
    console.error('Error adding customer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to add customer', details: errorMessage }, { status: 500 });
  }
}
