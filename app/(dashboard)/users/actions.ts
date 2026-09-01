"use server";

import { revalidatePath } from "next/cache";
import { UserService } from "@/services/user.service";
import { requireAdmin } from "@/lib/auth-utils";
import { RolePermissions } from "@/lib/rbac";

export async function createUserAction(payload: {
  name: string;
  username?: string;
  email: string;
  phone?: string;
  employeeId?: string;
  department?: string;
  roleName: string;
  password?: string;
  isActive?: boolean;
  permissions?: RolePermissions;
}) {
  await requireAdmin();
  try {
    const user = await UserService.createUser(payload);
    revalidatePath("/users");
    return { success: true, data: user };
  } catch (e: any) {
    console.error("Failed to create user:", e);
    if (e.code === "P2002") {
      return { success: false, error: "A user with this email or username already exists." };
    }
    return { success: false, error: e.message || "Failed to create user." };
  }
}

export async function updateUserAction(id: string, payload: {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  department?: string;
  roleName?: string;
  isActive?: boolean;
  permissions?: RolePermissions;
  password?: string;
}) {
  await requireAdmin();
  try {
    const user = await UserService.updateUser(id, payload);
    revalidatePath("/users");
    return { success: true, data: user };
  } catch (e: any) {
    console.error("Failed to update user:", e);
    if (e.code === "P2002") {
      return { success: false, error: "A user with this email or username already exists." };
    }
    return { success: false, error: e.message || "Failed to update user." };
  }
}

export async function toggleUserStatusAction(id: string, isActive: boolean) {
  await requireAdmin();
  try {
    const user = await UserService.toggleStatus(id, isActive);
    revalidatePath("/users");
    return { success: true, data: user };
  } catch (e: any) {
    console.error("Failed to update user status:", e);
    return { success: false, error: e.message || "Failed to toggle user status." };
  }
}

export async function saveRoleAction(payload: {
  id?: string;
  name: string;
  description?: string;
  status?: string;
  permissions: RolePermissions;
}) {
  await requireAdmin();
  try {
    const role = await UserService.saveRole(payload);
    revalidatePath("/users");
    return { success: true, data: role };
  } catch (e: any) {
    console.error("Failed to save role:", e);
    if (e.code === "P2002") {
      return { success: false, error: "A role with this name already exists." };
    }
    return { success: false, error: e.message || "Failed to save role." };
  }
}
