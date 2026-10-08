import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AccountingEngine } from "./accounting-engine.service";

export interface EmployeeInput {
  employeeCode?: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  pan?: string;
  salary?: number;
  isActive?: boolean;
}

export class EmployeeService {
  static async getEmployees(params?: { search?: string; isActive?: boolean }) {
    const where: Prisma.EmployeeWhereInput = {};
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { employeeCode: { contains: params.search, mode: "insensitive" } },
        { department: { contains: params.search, mode: "insensitive" } },
      ];
    }
    return prisma.employee.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { expenses: true }
        }
      }
    });
  }

  static async getEmployeeById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        expenses: {
          orderBy: { expenseDate: "desc" },
          include: { category: true }
        }
      }
    });
  }

  static async createEmployee(data: EmployeeInput) {
    let employeeCode = data.employeeCode;
    if (!employeeCode) {
      const count = await prisma.employee.count();
      employeeCode = `EMP-${(count + 1).toString().padStart(3, "0")}`;
    }

    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        department: data.department || null,
        designation: data.designation || null,
        pan: data.pan ? data.pan.toUpperCase() : null,
        salary: Number(data.salary || 0),
        isActive: data.isActive !== undefined ? data.isActive : true,
      }
    });

    AccountingEngine.invalidateCache();
    return employee;
  }

  static async updateEmployee(id: string, data: Partial<EmployeeInput>) {
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.employeeCode && { employeeCode: data.employeeCode }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.department !== undefined && { department: data.department || null }),
        ...(data.designation !== undefined && { designation: data.designation || null }),
        ...(data.pan !== undefined && { pan: data.pan ? data.pan.toUpperCase() : null }),
        ...(data.salary !== undefined && { salary: Number(data.salary) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      }
    });

    AccountingEngine.invalidateCache();
    return employee;
  }

  static async deleteEmployee(id: string) {
    // Check if referenced in any expenses
    const count = await prisma.expense.count({ where: { employeeId: id } });
    if (count > 0) {
      throw new Error(`Cannot delete employee with ${count} linked expenses. Set to Inactive instead.`);
    }

    const res = await prisma.employee.delete({ where: { id } });
    AccountingEngine.invalidateCache();
    return res;
  }
}
