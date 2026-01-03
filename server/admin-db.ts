/**
 * Admin Database Helpers for Customer, Account, and Report Management
 */

import pg from "pg";

const { Pool } = pg;

// Use the same pool as facebook-db
let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.FACEBOOK_DATABASE_URL;
    if (!connectionString) {
      throw new Error("FACEBOOK_DATABASE_URL is not set");
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

// ==================== Customers ====================

export interface Customer {
  customer_id: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  fb_account_count?: number;
  ig_account_count?: number;
  total_account_count?: number;
}

export async function getCustomers(activeOnly = false): Promise<Customer[]> {
  const p = getPool();
  let query = "SELECT * FROM view_customer_summary";
  if (activeOnly) {
    query += " WHERE is_active = true";
  }
  query += " ORDER BY name";

  const result = await p.query(query);
  return result.rows;
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const p = getPool();
  const result = await p.query(
    "SELECT * FROM view_customer_summary WHERE customer_id = $1",
    [customerId]
  );
  return result.rows[0] || null;
}

export async function createCustomer(name: string): Promise<Customer> {
  const p = getPool();
  const result = await p.query(
    "INSERT INTO customers (name) VALUES ($1) RETURNING *",
    [name]
  );
  return result.rows[0];
}

export async function updateCustomer(
  customerId: string,
  updates: { name?: string; is_active?: boolean }
): Promise<Customer | null> {
  const p = getPool();
  const setClauses: string[] = ["updated_at = NOW()"];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (updates.is_active !== undefined) {
    setClauses.push(`is_active = $${paramIndex++}`);
    values.push(updates.is_active);
  }

  values.push(customerId);

  const result = await p.query(
    `UPDATE customers SET ${setClauses.join(", ")} WHERE customer_id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function deleteCustomer(customerId: string): Promise<boolean> {
  const p = getPool();

  // Check if customer has assigned accounts
  const accountCheck = await p.query(
    "SELECT COUNT(*) as count FROM customer_accounts WHERE customer_id = $1",
    [customerId]
  );

  if (parseInt(accountCheck.rows[0].count) > 0) {
    throw new Error("Cannot delete customer with assigned accounts");
  }

  const result = await p.query(
    "DELETE FROM customers WHERE customer_id = $1 RETURNING customer_id",
    [customerId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ==================== Customer Accounts ====================

export interface CustomerAccount {
  id: number;
  customer_id: string | null;
  platform: "facebook" | "instagram";
  account_id: string;
  account_name: string | null;
  is_active: boolean;
  created_at: Date;
  customer_name?: string;
}

export async function getCustomerAccounts(filters?: {
  customerId?: string;
  platform?: "facebook" | "instagram";
  unassignedOnly?: boolean;
}): Promise<CustomerAccount[]> {
  const p = getPool();
  let query = `
    SELECT ca.*, c.name as customer_name
    FROM customer_accounts ca
    LEFT JOIN customers c ON ca.customer_id = c.customer_id
    WHERE 1=1
  `;
  const values: any[] = [];
  let paramIndex = 1;

  if (filters?.customerId) {
    query += ` AND ca.customer_id = $${paramIndex++}`;
    values.push(filters.customerId);
  }

  if (filters?.platform) {
    query += ` AND ca.platform = $${paramIndex++}`;
    values.push(filters.platform);
  }

  if (filters?.unassignedOnly) {
    query += " AND ca.customer_id IS NULL";
  }

  query += " ORDER BY ca.platform, ca.account_name";

  const result = await p.query(query, values);
  return result.rows;
}

export async function assignAccountToCustomer(
  accountId: string,
  platform: "facebook" | "instagram",
  customerId: string | null
): Promise<boolean> {
  const p = getPool();
  const result = await p.query(
    `UPDATE customer_accounts 
     SET customer_id = $1, updated_at = NOW() 
     WHERE account_id = $2 AND platform = $3 
     RETURNING id`,
    [customerId, accountId, platform]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function toggleAccountActive(
  accountId: string,
  platform: "facebook" | "instagram",
  isActive: boolean
): Promise<boolean> {
  const p = getPool();
  const result = await p.query(
    `UPDATE customer_accounts 
     SET is_active = $1, updated_at = NOW() 
     WHERE account_id = $2 AND platform = $3 
     RETURNING id`,
    [isActive, accountId, platform]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ==================== Reports ====================

export interface Report {
  report_id: string;
  customer_id: string;
  customer_name?: string;
  month: Date;
  status: "pending" | "generating" | "generated" | "failed";
  pptx_url: string | null;
  pdf_url: string | null;
  generated_at: Date | null;
  error_message: string | null;
  meta: Record<string, any>;
  created_at: Date;
}

export async function getReports(filters?: {
  customerId?: string;
  month?: string;
  status?: string;
}): Promise<Report[]> {
  const p = getPool();
  let query = "SELECT * FROM view_customer_reports WHERE 1=1";
  const values: any[] = [];
  let paramIndex = 1;

  if (filters?.customerId) {
    query += ` AND customer_id = $${paramIndex++}`;
    values.push(filters.customerId);
  }

  if (filters?.month) {
    query += ` AND month = $${paramIndex++}`;
    values.push(filters.month);
  }

  if (filters?.status) {
    query += ` AND status = $${paramIndex++}`;
    values.push(filters.status);
  }

  query += " ORDER BY month DESC, customer_name";

  const result = await p.query(query, values);
  return result.rows;
}

export async function getReport(reportId: string): Promise<Report | null> {
  const p = getPool();
  const result = await p.query(
    "SELECT * FROM view_customer_reports WHERE report_id = $1",
    [reportId]
  );
  return result.rows[0] || null;
}

export async function createReport(
  customerId: string,
  month: string
): Promise<Report> {
  const p = getPool();
  const result = await p.query(
    `INSERT INTO reports (customer_id, month, status) 
     VALUES ($1, $2, 'pending') 
     ON CONFLICT (customer_id, month) DO UPDATE SET status = 'pending', updated_at = NOW()
     RETURNING *`,
    [customerId, month]
  );
  return result.rows[0];
}

export async function updateReport(
  reportId: string,
  updates: {
    status?: string;
    pptx_url?: string;
    pdf_url?: string;
    error_message?: string;
    meta?: Record<string, any>;
  }
): Promise<Report | null> {
  const p = getPool();
  const setClauses: string[] = ["updated_at = NOW()"];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);
    if (updates.status === "generated") {
      setClauses.push("generated_at = NOW()");
    }
  }

  if (updates.pptx_url !== undefined) {
    setClauses.push(`pptx_url = $${paramIndex++}`);
    values.push(updates.pptx_url);
  }

  if (updates.pdf_url !== undefined) {
    setClauses.push(`pdf_url = $${paramIndex++}`);
    values.push(updates.pdf_url);
  }

  if (updates.error_message !== undefined) {
    setClauses.push(`error_message = $${paramIndex++}`);
    values.push(updates.error_message);
  }

  if (updates.meta !== undefined) {
    setClauses.push(`meta = $${paramIndex++}`);
    values.push(JSON.stringify(updates.meta));
  }

  values.push(reportId);

  const result = await p.query(
    `UPDATE reports SET ${setClauses.join(", ")} WHERE report_id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

// ==================== Customer Seeding ====================

export interface SeedCustomer {
  name: string;
  slug: string;
}

export async function seedCustomers(customers: SeedCustomer[]): Promise<{
  inserted: number;
  updated: number;
  errors: string[];
}> {
  const p = getPool();
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const customer of customers) {
    try {
      // Check if customer exists by name or slug
      const existing = await p.query(
        `SELECT customer_id FROM customers WHERE LOWER(name) = LOWER($1)`,
        [customer.name]
      );

      if (existing.rows.length > 0) {
        // Update existing customer
        await p.query(
          `UPDATE customers SET updated_at = NOW() WHERE customer_id = $1`,
          [existing.rows[0].customer_id]
        );
        updated++;
      } else {
        // Insert new customer
        await p.query(
          `INSERT INTO customers (name) VALUES ($1)`,
          [customer.name]
        );
        inserted++;
      }
    } catch (error: any) {
      errors.push(`Failed to seed customer "${customer.name}": ${error.message}`);
    }
  }

  return { inserted, updated, errors };
}

// ==================== Admin Check ====================

export async function isUserAdmin(userId: string): Promise<boolean> {
  // For now, check if user is the owner
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  return userId === ownerOpenId;
}
