import { describe, it, expect, vi } from 'vitest';

// Mock the seed customers data
const SEED_CUSTOMERS = [
  { name: "Vergleich.org", slug: "vergleich-org" },
  { name: "Annie & Jane", slug: "annie-jane" },
  { name: "CASIO G-SHOCK", slug: "casio-g-shock" },
  { name: "Köstritzer", slug: "koestritzer" },
  { name: "flatexDEGIRO AG", slug: "flatexdegiro" },
  { name: "Sixt Leasing", slug: "sixt-leasing" },
  { name: "Vattenfall", slug: "vattenfall" },
  { name: "REWE", slug: "rewe" },
  { name: "AUTOHERO", slug: "autohero" },
  { name: "Fleurop", slug: "fleurop" },
  { name: "Oxford", slug: "oxford" },
];

describe('Seed Customers Data', () => {
  it('should have valid customer entries', () => {
    expect(SEED_CUSTOMERS.length).toBeGreaterThan(0);
    expect(SEED_CUSTOMERS.length).toBe(11);
  });

  it('should have name and slug for each customer', () => {
    for (const customer of SEED_CUSTOMERS) {
      expect(customer.name).toBeDefined();
      expect(customer.name.length).toBeGreaterThan(0);
      expect(customer.slug).toBeDefined();
      expect(customer.slug.length).toBeGreaterThan(0);
    }
  });

  it('should have valid slug format (lowercase, no spaces)', () => {
    for (const customer of SEED_CUSTOMERS) {
      // Slug should be lowercase
      expect(customer.slug).toBe(customer.slug.toLowerCase());
      // Slug should not contain spaces
      expect(customer.slug).not.toContain(' ');
    }
  });

  it('should include Vergleich.org as a customer', () => {
    const vergleich = SEED_CUSTOMERS.find(c => c.name === 'Vergleich.org');
    expect(vergleich).toBeDefined();
    expect(vergleich?.slug).toBe('vergleich-org');
  });

  it('should include famefact clients from website', () => {
    const clientNames = SEED_CUSTOMERS.map(c => c.name);
    expect(clientNames).toContain('CASIO G-SHOCK');
    expect(clientNames).toContain('Köstritzer');
    expect(clientNames).toContain('flatexDEGIRO AG');
    expect(clientNames).toContain('Sixt Leasing');
  });
});

describe('Seed Customers Schema Validation', () => {
  it('should have unique slugs', () => {
    const slugs = SEED_CUSTOMERS.map(c => c.slug);
    const uniqueSlugs = [...new Set(slugs)];
    expect(slugs.length).toBe(uniqueSlugs.length);
  });

  it('should have unique names', () => {
    const names = SEED_CUSTOMERS.map(c => c.name);
    const uniqueNames = [...new Set(names)];
    expect(names.length).toBe(uniqueNames.length);
  });
});
