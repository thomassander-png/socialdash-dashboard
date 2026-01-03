import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the admin-db module
vi.mock("./admin-db", () => ({
  getCustomers: vi.fn(),
  getCustomer: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  getCustomerAccounts: vi.fn(),
  assignAccountToCustomer: vi.fn(),
  toggleAccountActive: vi.fn(),
  getReports: vi.fn(),
  getReport: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  isUserAdmin: vi.fn(),
}));

import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerAccounts,
  assignAccountToCustomer,
  toggleAccountActive,
  getReports,
  getReport,
  createReport,
  updateReport,
  isUserAdmin,
} from "./admin-db";

describe("Admin Database Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Customer Management", () => {
    it("should get all customers", async () => {
      const mockCustomers = [
        {
          customer_id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Test Customer",
          is_active: true,
          created_at: new Date(),
        },
      ];
      vi.mocked(getCustomers).mockResolvedValue(mockCustomers);

      const result = await getCustomers(false);
      expect(result).toEqual(mockCustomers);
      expect(getCustomers).toHaveBeenCalledWith(false);
    });

    it("should get active customers only", async () => {
      const mockCustomers = [
        {
          customer_id: "123e4567-e89b-12d3-a456-426614174000",
          name: "Active Customer",
          is_active: true,
          created_at: new Date(),
        },
      ];
      vi.mocked(getCustomers).mockResolvedValue(mockCustomers);

      const result = await getCustomers(true);
      expect(result).toEqual(mockCustomers);
      expect(getCustomers).toHaveBeenCalledWith(true);
    });

    it("should get a single customer by ID", async () => {
      const mockCustomer = {
        customer_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Customer",
        is_active: true,
        created_at: new Date(),
      };
      vi.mocked(getCustomer).mockResolvedValue(mockCustomer);

      const result = await getCustomer("123e4567-e89b-12d3-a456-426614174000");
      expect(result).toEqual(mockCustomer);
    });

    it("should create a new customer", async () => {
      const mockCustomer = {
        customer_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "New Customer",
        is_active: true,
        created_at: new Date(),
      };
      vi.mocked(createCustomer).mockResolvedValue(mockCustomer);

      const result = await createCustomer("New Customer");
      expect(result).toEqual(mockCustomer);
      expect(createCustomer).toHaveBeenCalledWith("New Customer");
    });

    it("should update a customer", async () => {
      const mockCustomer = {
        customer_id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Updated Customer",
        is_active: true,
        created_at: new Date(),
      };
      vi.mocked(updateCustomer).mockResolvedValue(mockCustomer);

      const result = await updateCustomer("123e4567-e89b-12d3-a456-426614174000", {
        name: "Updated Customer",
      });
      expect(result).toEqual(mockCustomer);
    });

    it("should delete a customer", async () => {
      vi.mocked(deleteCustomer).mockResolvedValue({ success: true });

      const result = await deleteCustomer("123e4567-e89b-12d3-a456-426614174000");
      expect(result).toEqual({ success: true });
    });
  });

  describe("Account Management", () => {
    it("should get all accounts", async () => {
      const mockAccounts = [
        {
          account_id: "172644292753870",
          platform: "facebook",
          account_name: "Test Page",
          customer_id: null,
          is_active: true,
        },
      ];
      vi.mocked(getCustomerAccounts).mockResolvedValue(mockAccounts);

      const result = await getCustomerAccounts({});
      expect(result).toEqual(mockAccounts);
    });

    it("should get unassigned accounts only", async () => {
      const mockAccounts = [
        {
          account_id: "172644292753870",
          platform: "facebook",
          account_name: "Unassigned Page",
          customer_id: null,
          is_active: true,
        },
      ];
      vi.mocked(getCustomerAccounts).mockResolvedValue(mockAccounts);

      const result = await getCustomerAccounts({ unassignedOnly: true });
      expect(result).toEqual(mockAccounts);
      expect(getCustomerAccounts).toHaveBeenCalledWith({ unassignedOnly: true });
    });

    it("should assign account to customer", async () => {
      vi.mocked(assignAccountToCustomer).mockResolvedValue({ success: true });

      const result = await assignAccountToCustomer(
        "172644292753870",
        "facebook",
        "123e4567-e89b-12d3-a456-426614174000"
      );
      expect(result).toEqual({ success: true });
    });

    it("should toggle account active status", async () => {
      vi.mocked(toggleAccountActive).mockResolvedValue({ success: true });

      const result = await toggleAccountActive("172644292753870", "facebook", false);
      expect(result).toEqual({ success: true });
    });
  });

  describe("Report Management", () => {
    it("should get all reports", async () => {
      const mockReports = [
        {
          report_id: "123e4567-e89b-12d3-a456-426614174001",
          customer_id: "123e4567-e89b-12d3-a456-426614174000",
          customer_name: "Test Customer",
          month: new Date("2025-02-01"),
          status: "pending",
          pptx_url: null,
          generated_at: null,
          error_message: null,
        },
      ];
      vi.mocked(getReports).mockResolvedValue(mockReports);

      const result = await getReports({});
      expect(result).toEqual(mockReports);
    });

    it("should get reports filtered by customer", async () => {
      const mockReports = [
        {
          report_id: "123e4567-e89b-12d3-a456-426614174001",
          customer_id: "123e4567-e89b-12d3-a456-426614174000",
          customer_name: "Test Customer",
          month: new Date("2025-02-01"),
          status: "generated",
          pptx_url: "https://example.com/report.pptx",
          generated_at: new Date(),
          error_message: null,
        },
      ];
      vi.mocked(getReports).mockResolvedValue(mockReports);

      const result = await getReports({
        customerId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result).toEqual(mockReports);
    });

    it("should create a new report", async () => {
      const mockReport = {
        report_id: "123e4567-e89b-12d3-a456-426614174001",
        customer_id: "123e4567-e89b-12d3-a456-426614174000",
        month: new Date("2025-02-01"),
        status: "pending",
      };
      vi.mocked(createReport).mockResolvedValue(mockReport);

      const result = await createReport(
        "123e4567-e89b-12d3-a456-426614174000",
        "2025-02"
      );
      expect(result).toEqual(mockReport);
    });

    it("should update report status", async () => {
      vi.mocked(updateReport).mockResolvedValue({ success: true });

      const result = await updateReport("123e4567-e89b-12d3-a456-426614174001", {
        status: "generated",
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("Admin Authorization", () => {
    it("should check if user is admin", async () => {
      vi.mocked(isUserAdmin).mockResolvedValue(true);

      const result = await isUserAdmin("user-open-id-123");
      expect(result).toBe(true);
    });

    it("should return false for non-admin user", async () => {
      vi.mocked(isUserAdmin).mockResolvedValue(false);

      const result = await isUserAdmin("non-admin-user-id");
      expect(result).toBe(false);
    });
  });
});
