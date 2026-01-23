import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name, fbPageId, igAccountId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if customer already exists
    const existing = await query<{ customer_id: string }>(
      `SELECT customer_id FROM customers WHERE LOWER(name) = LOWER($1)`,
      [name]
    );

    let customerId: string;

    if (existing.length > 0) {
      customerId = existing[0].customer_id;
      console.log(`Customer "${name}" already exists with ID ${customerId}`);
    } else {
      // Insert new customer
      const result = await query<{ customer_id: string }>(
        `INSERT INTO customers (name, is_active) VALUES ($1, true) RETURNING customer_id`,
        [name]
      );
      customerId = result[0].customer_id;
      console.log(`Created customer "${name}" with ID ${customerId}`);
    }

    // Add or update Facebook account if provided
    if (fbPageId) {
      // Check if account already exists (possibly without customer)
      const existingAccount = await query<{ customer_id: string | null }>(
        `SELECT customer_id FROM customer_accounts WHERE account_id = $1 AND platform = 'facebook'`,
        [fbPageId]
      );
      
      if (existingAccount.length > 0) {
        // Account exists - update to link to this customer
        if (existingAccount[0].customer_id !== customerId) {
          await query(
            `UPDATE customer_accounts SET customer_id = $1 WHERE account_id = $2 AND platform = 'facebook'`,
            [customerId, fbPageId]
          );
          console.log(`Updated Facebook account ${fbPageId} to customer ${customerId}`);
        }
      } else {
        // Account doesn't exist - create new
        await query(
          `INSERT INTO customer_accounts (customer_id, account_id, platform) VALUES ($1, $2, 'facebook')`,
          [customerId, fbPageId]
        );
        console.log(`Added Facebook account ${fbPageId} to customer ${customerId}`);
      }
    }

    // Add or update Instagram account if provided
    if (igAccountId) {
      const existingAccount = await query<{ customer_id: string | null }>(
        `SELECT customer_id FROM customer_accounts WHERE account_id = $1 AND platform = 'instagram'`,
        [igAccountId]
      );
      
      if (existingAccount.length > 0) {
        if (existingAccount[0].customer_id !== customerId) {
          await query(
            `UPDATE customer_accounts SET customer_id = $1 WHERE account_id = $2 AND platform = 'instagram'`,
            [customerId, igAccountId]
          );
          console.log(`Updated Instagram account ${igAccountId} to customer ${customerId}`);
        }
      } else {
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
