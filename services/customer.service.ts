import { prisma } from "@/lib/prisma";
import { PrismaClient, CustomerType } from "@prisma/client";


export type CreateCustomerInput = {
  customerType: CustomerType;
  legalName: string;
  tradeName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pinCode?: string | null;
  country?: string | null;
};

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export class CustomerService {
  /**
   * Fetch all customers with optional filtering and search
   */
  static async getCustomers(params?: {
    search?: string;
    customerType?: CustomerType;
    isActive?: boolean;
  }) {
    const { search, customerType, isActive } = params || {};

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (customerType) {
      where.customerType = customerType;
    }

    if (search) {
      where.OR = [
        { legalName: { contains: search } },
        { tradeName: { contains: search } },
        { gstin: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    try {
      return await prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("CustomerService.getCustomers error:", error);
      return [];
    }
  }

  /**
   * Fetch a single customer by ID
   */
  static async getCustomerById(id: string) {
    try {
      return await prisma.customer.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error("CustomerService.getCustomerById error:", error);
      return null;
    }
  }

  /**
   * Validate GSTIN uniqueness
   */
  static async checkGstinExists(gstin: string, excludeId?: string) {
    if (!gstin) return false;
    
    const existing = await prisma.customer.findFirst({
      where: {
        gstin,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });

    return !!existing;
  }

  /**
   * Create a new customer
   */
  static async createCustomer(data: CreateCustomerInput) {
    if (data.customerType === "B2B" && data.gstin) {
      const exists = await this.checkGstinExists(data.gstin);
      if (exists) {
        throw new Error("A customer with this GSTIN already exists.");
      }
    }

    return await prisma.customer.create({
      data,
    });
  }

  /**
   * Update an existing customer
   */
  static async updateCustomer(id: string, data: UpdateCustomerInput) {
    if (data.gstin) {
      const exists = await this.checkGstinExists(data.gstin, id);
      if (exists) {
        throw new Error("Another customer is already using this GSTIN.");
      }
    }

    return await prisma.customer.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft deactivate a customer
   */
  static async deactivateCustomer(id: string) {
    return await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Reactivate a customer
   */
  static async reactivateCustomer(id: string) {
    return await prisma.customer.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
