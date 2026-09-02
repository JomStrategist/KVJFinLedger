import { prisma } from "@/lib/prisma";
import { ProductType } from "@prisma/client";

export type CreateProductInput = {
  name: string;
  description?: string | null;
  type: ProductType;
  hsnSacCode: string;
  unit: string;
  sellingPrice: string | number;
  customPrice?: string | number | null;
  purchasePrice?: string | number | null;
  gstRate: string | number;
  cessRate?: string | number | null;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export class ProductService {
  /**
   * Fetch all products with optional filtering and search
   */
  static async getProducts(params?: {
    search?: string;
    type?: ProductType;
    isActive?: boolean;
  }) {
    const { search, type, isActive } = params || {};

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { hsnSacCode: { contains: search } },
      ];
    }

    return await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Fetch a single product by ID
   */
  static async getProductById(id: string) {
    return await prisma.product.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new product
   */
  static async createProduct(data: CreateProductInput) {
    return await prisma.product.create({
      data: {
        name: data.name,
        description: data.description || null,
        type: data.type,
        hsnSacCode: data.hsnSacCode,
        unit: data.unit,
        sellingPrice: Number(data.sellingPrice),
        customPrice: data.customPrice ? Number(data.customPrice) : null,
        purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : null,
        gstRate: Number(data.gstRate),
        cessRate: data.cessRate ? Number(data.cessRate) : null,
      },
    });
  }

  /**
   * Update an existing product
   */
  static async updateProduct(id: string, data: UpdateProductInput) {
    const payload: any = { ...data };
    if (data.sellingPrice !== undefined) payload.sellingPrice = Number(data.sellingPrice);
    if (data.customPrice !== undefined) payload.customPrice = data.customPrice ? Number(data.customPrice) : null;
    if (data.purchasePrice !== undefined) payload.purchasePrice = data.purchasePrice ? Number(data.purchasePrice) : null;
    if (data.gstRate !== undefined) payload.gstRate = Number(data.gstRate);
    if (data.cessRate !== undefined) payload.cessRate = data.cessRate ? Number(data.cessRate) : null;

    return await prisma.product.update({
      where: { id },
      data: payload,
    });
  }

  /**
   * Soft deactivate a product
   */
  static async deactivateProduct(id: string) {
    return await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Reactivate a product
   */
  static async reactivateProduct(id: string) {
    return await prisma.product.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
