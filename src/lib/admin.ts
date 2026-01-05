import { query, queryOne } from './db';

// Customer types
export interface Customer {
  customer_id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface CustomerAccount {
  id: number;
  customer_id: number | null;
  platform: 'facebook' | 'instagram';
  account_id: string;
  account_name: string | null;
  is_active: boolean;
  created_at: string;
  customer_name?: string;
}

// Get all customers
export async function getCustomers(): Promise<Customer[]> {
  return query<Customer>(`
    SELECT customer_id, name, slug, is_active, created_at
    FROM customers
    ORDER BY name ASC
  `);
}

// Create a new customer
export async function createCustomer(name: string, slug: string): Promise<Customer | null> {
  return queryOne<Customer>(`
    INSERT INTO customers (name, slug, is_active)
    VALUES ($1, $2, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING *
  `, [name, slug]);
}

// Update customer status
export async function updateCustomerStatus(customerId: number, isActive: boolean): Promise<void> {
  await query(`
    UPDATE customers SET is_active = $1 WHERE customer_id = $2
  `, [isActive, customerId]);
}

// Delete customer
export async function deleteCustomer(customerId: number): Promise<void> {
  await query(`DELETE FROM customers WHERE customer_id = $1`, [customerId]);
}

// Get all accounts with customer info
export async function getAccounts(): Promise<CustomerAccount[]> {
  return query<CustomerAccount>(`
    SELECT 
      ca.id, ca.customer_id, ca.platform, ca.account_id, ca.account_name, ca.is_active, ca.created_at,
      c.name as customer_name
    FROM customer_accounts ca
    LEFT JOIN customers c ON ca.customer_id = c.customer_id
    ORDER BY ca.platform, ca.account_name
  `);
}

// Assign account to customer
export async function assignAccountToCustomer(accountId: number, customerId: number | null): Promise<void> {
  await query(`
    UPDATE customer_accounts SET customer_id = $1 WHERE id = $2
  `, [customerId, accountId]);
}

// Seed customers from JSON data
export async function seedCustomers(customers: { name: string; slug: string }[]): Promise<number> {
  let count = 0;
  for (const customer of customers) {
    await query(`
      INSERT INTO customers (name, slug, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    `, [customer.name, customer.slug]);
    count++;
  }
  return count;
}

// Default seed data
export const defaultCustomers = [
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
