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
  bankAccountNo?: string;
  bankIfsc?: string;
  bankName?: string;
  uan?: string;
  pfNumber?: string;
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
          select: { expenses: true, advances: true }
        },
        advances: {
          where: { status: "ACTIVE" }
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
        },
        advances: {
          orderBy: { advanceDate: "desc" }
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
        bankAccountNo: data.bankAccountNo || null,
        bankIfsc: data.bankIfsc ? data.bankIfsc.toUpperCase() : null,
        bankName: data.bankName || null,
        uan: data.uan || null,
        pfNumber: data.pfNumber || null,
      },
      include: {
        _count: {
          select: { expenses: true, advances: true }
        },
        advances: true,
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
        ...(data.bankAccountNo !== undefined && { bankAccountNo: data.bankAccountNo || null }),
        ...(data.bankIfsc !== undefined && { bankIfsc: data.bankIfsc ? data.bankIfsc.toUpperCase() : null }),
        ...(data.bankName !== undefined && { bankName: data.bankName || null }),
        ...(data.uan !== undefined && { uan: data.uan || null }),
        ...(data.pfNumber !== undefined && { pfNumber: data.pfNumber || null }),
      },
      include: {
        _count: {
          select: { expenses: true, advances: true }
        },
        advances: true,
      }
    });

    AccountingEngine.invalidateCache();
    return employee;
  }

  static async deleteEmployee(id: string) {
    // Check if referenced in any expenses or advances
    const [expCount, advCount] = await Promise.all([
      prisma.expense.count({ where: { employeeId: id } }),
      prisma.employeeAdvance.count({ where: { employeeId: id } })
    ]);
    if (expCount > 0 || advCount > 0) {
      throw new Error(`Cannot delete employee with linked records (${expCount} expenses, ${advCount} advances). Set to Inactive instead.`);
    }

    const res = await prisma.employee.delete({ where: { id } });
    AccountingEngine.invalidateCache();
    return res;
  }
}
