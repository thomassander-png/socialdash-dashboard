/**
 * Migration API für Kundenbranding-Spalten
 * 
 * Fügt logo_url, primary_color und secondary_color zur customers Tabelle hinzu
 * und setzt initiale Werte für bekannte Kunden
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Kundenfarben basierend auf Markenidentität
const CUSTOMER_COLORS: Record<string, { primary: string; secondary: string }> = {
  'vergleich.org': { primary: '#2962AE', secondary: '#4A90D9' }, // Vergleich.org Blau
  'vergleich-org': { primary: '#2962AE', secondary: '#4A90D9' },
  'famefact': { primary: '#A3E635', secondary: '#84CC16' }, // famefact Grün
  'famefact-gmbh': { primary: '#A3E635', secondary: '#84CC16' },
  'abda-apotheken': { primary: '#00A651', secondary: '#4CBB17' }, // Apotheken Grün
  'asphericon': { primary: '#0066CC', secondary: '#3399FF' }, // Tech Blau
  'autohero': { primary: '#FF6B00', secondary: '#FF8C33' }, // Autohero Orange
  'casio-g-shock': { primary: '#000000', secondary: '#333333' }, // G-SHOCK Schwarz
  'contipark': { primary: '#003366', secondary: '#0066CC' }, // CONTIPARK Blau
  'fensterart': { primary: '#8B4513', secondary: '#A0522D' }, // Holz Braun
  'grg-gebaudereiniger': { primary: '#1E90FF', secondary: '#4169E1' }, // Reinigung Blau
  'heinz-sielmann-stiftung': { primary: '#228B22', secondary: '#32CD32' }, // Natur Grün
  'herlitz': { primary: '#E31937', secondary: '#FF4D6A' }, // Herlitz Rot
  'pelikan': { primary: '#003087', secondary: '#0052CC' }, // Pelikan Blau
  'vivantes': { primary: '#00A3E0', secondary: '#33B5E5' }, // Vivantes Blau
};

export async function POST() {
  try {
    // 1. Prüfe ob Spalten bereits existieren
    const columns = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customers' 
      AND column_name IN ('logo_url', 'primary_color', 'secondary_color')
    `);
    
    const existingColumns = (columns as { column_name: string }[]).map(c => c.column_name);
    const results: string[] = [];
    
    // 2. Füge fehlende Spalten hinzu
    if (!existingColumns.includes('logo_url')) {
      await query(`ALTER TABLE customers ADD COLUMN logo_url TEXT`);
      results.push('Added column: logo_url');
    } else {
      results.push('Column logo_url already exists');
    }
    
    if (!existingColumns.includes('primary_color')) {
      await query(`ALTER TABLE customers ADD COLUMN primary_color VARCHAR(7) DEFAULT '#1E3A8A'`);
      results.push('Added column: primary_color');
    } else {
      results.push('Column primary_color already exists');
    }
    
    if (!existingColumns.includes('secondary_color')) {
      await query(`ALTER TABLE customers ADD COLUMN secondary_color VARCHAR(7) DEFAULT '#3B82F6'`);
      results.push('Added column: secondary_color');
    } else {
      results.push('Column secondary_color already exists');
    }
    
    // 3. Setze Kundenfarben für bekannte Kunden
    const customers = await query(`SELECT customer_id, slug FROM customers`);
    let updatedCount = 0;
    
    for (const customer of customers as { customer_id: string; slug: string }[]) {
      const colors = CUSTOMER_COLORS[customer.slug];
      if (colors) {
        await query(`
          UPDATE customers 
          SET primary_color = $1, secondary_color = $2 
          WHERE customer_id = $3
        `, [colors.primary, colors.secondary, customer.customer_id]);
        updatedCount++;
      }
    }
    
    results.push(`Updated colors for ${updatedCount} customers`);
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      results,
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to run the migration',
    description: 'This will add logo_url, primary_color, and secondary_color columns to the customers table',
  });
}
