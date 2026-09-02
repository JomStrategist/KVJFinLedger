import { prisma } from "@/lib/prisma";

export type CreateVendorInput = {
  name: string;
  businessName?: string | null;
  vendorType?: string | null;
  gstRegistrationStatus?: string | null;
  gstin?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  country?: string | null;
  isActive?: boolean;
};

export class VendorService {
  static async getVendors(params?: { search?: string; isActive?: boolean }) {
    const { search, isActive } = params || {};
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { businessName: { contains: search, mode: "insensitive" } },
        { gstin: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    try {
      return await prisma.vendor.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { expenses: true }
          }
        }
      });
    } catch (error) {
      console.warn("VendorService.getVendors error:", error);
      return [];
    }
  }

  static async getVendorById(id: string) {
    try {
      return await prisma.vendor.findUnique({
        where: { id },
      });
    } catch (error) {
      console.warn("VendorService.getVendorById error:", error);
      return null;
    }
  }

  static async createVendor(data: CreateVendorInput) {
    if (!data.name || data.name.trim() === "") {
      throw new Error("Vendor name is required.");
    }

    if (data.gstin && data.gstin.trim() !== "") {
      const existing = await prisma.vendor.findFirst({
        where: { gstin: data.gstin.trim() }
      });
      if (existing) {
        throw new Error("A vendor with this GSTIN already exists.");
      }
    }

    return await prisma.vendor.create({
      data: {
        ...data,
        name: data.name.trim(),
        country: data.country || "India",
        vendorType: data.vendorType || "B2B",
        gstRegistrationStatus: data.gstRegistrationStatus || (data.gstin ? "REGISTERED" : "UNREGISTERED"),
        isActive: data.isActive ?? true,
      }
    });
  }

  static async updateVendor(id: string, data: Partial<CreateVendorInput>) {
    if (data.name !== undefined && data.name.trim() === "") {
      throw new Error("Vendor name cannot be empty.");
    }

    if (data.gstin && data.gstin.trim() !== "") {
      const existing = await prisma.vendor.findFirst({
        where: { gstin: data.gstin.trim(), id: { not: id } }
      });
      if (existing) {
        throw new Error("Another vendor with this GSTIN already exists.");
      }
    }

    return await prisma.vendor.update({
      where: { id },
      data,
    });
  }

  static async toggleVendorStatus(id: string, isActive: boolean) {
    return await prisma.vendor.update({
      where: { id },
      data: { isActive },
    });
  }
}
