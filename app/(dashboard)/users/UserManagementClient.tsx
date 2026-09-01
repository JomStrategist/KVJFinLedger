"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserFormModal } from "./UserFormModal";
import { UserViewModal } from "./UserViewModal";
import { RoleFormModal } from "./RoleFormModal";
import { toggleUserStatusAction } from "./actions";
import { getEffectiveUserPermissions, AccessLevel } from "@/lib/rbac";

export function UserManagementClient({
  initialUsers,
  initialRoles,
  metrics,
}: {
  initialUsers: any[];
  initialRoles: any[];
  metrics: { activeUsers: number; totalRoles: number; accessModel: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tab, setTab] = useState<"users" | "roles">("users");

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [fy, setFy] = useState("FY 2026–27");

  // Modals state
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any | null>(null);
  const [selectedUserForView, setSelectedUserForView] = useState<any | null>(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<any | null>(null);

  // Active action dropdown
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Filtered Users
  const filteredUsers = initialUsers.filter((u) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.employeeId?.toLowerCase().includes(q);

    const userRole = u.roleTitle || u.roleDefinition?.name || u.role;
    const matchesRole = roleFilter === "ALL" || userRole === roleFilter;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && u.isActive) ||
      (statusFilter === "INACTIVE" && !u.isActive);

    const matchesDept = departmentFilter === "ALL" || u.department === departmentFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesDept;
  });

  // Unique Departments for filter
  const departments = Array.from(
    new Set(initialUsers.map((u) => u.department).filter(Boolean))
  ) as string[];

  const handleToggleStatus = (user: any) => {
    const nextStatus = !user.isActive;
    const actionWord = nextStatus ? "activate" : "deactivate";
    if (confirm(`Are you sure you want to ${actionWord} ${user.name}?`)) {
      startTransition(async () => {
        const res = await toggleUserStatusAction(user.id, nextStatus);
        if (res.success) {
          router.refresh();
        } else {
          alert(res.error);
        }
      });
    }
  };

  const getPermissionBadge = (level?: AccessLevel) => {
    switch (level) {
      case "Full":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">FULL</span>;
      case "Limited":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">LIMITED</span>;
      case "Assigned":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">ASSIGNED</span>;
      case "View":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">VIEW</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-theme-surface-hover text-theme-text-muted border border-theme-border">NO ACCESS</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-surface p-6 rounded-xl border border-theme-border shadow-sm">
        <div>
          <span className="text-xs font-bold text-theme-primary uppercase tracking-wider">
            ACCESS CONTROL & SECURITY
          </span>
          <h1 className="text-2xl font-bold text-theme-text mt-0.5">Users & Roles</h1>
          <p className="text-theme-text-muted text-xs mt-1">
            Login users and role-based access control.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* FY selector */}
          <select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            className="border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface font-semibold text-theme-text focus:outline-none"
          >
            <option value="FY 2026–27">FY 2026–27</option>
            <option value="FY 2025–26">FY 2025–26</option>
          </select>

          {/* Quick Options Menu */}
          <button
            type="button"
            onClick={() => setTab(tab === "users" ? "roles" : "users")}
            className="border border-theme-border bg-theme-surface text-theme-text p-2 rounded-lg hover:bg-theme-surface-hover transition-colors text-xs font-bold"
            title="Toggle between Users and Roles view"
          >
            ☰ {tab === "users" ? "View Roles" : "View Users"}
          </button>

          {tab === "users" ? (
            <button
              type="button"
              onClick={() => {
                setSelectedUserForEdit(null);
                setShowUserModal(true);
              }}
              className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>+</span> Add User
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedRoleForEdit(null);
                setShowRoleModal(true);
              }}
              className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>+</span> Create Role
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-theme-border">
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
            tab === "users"
              ? "border-theme-primary text-theme-primary"
              : "border-transparent text-theme-text-muted hover:text-theme-text"
          }`}
        >
          Users List ({initialUsers.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("roles")}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
            tab === "roles"
              ? "border-theme-primary text-theme-primary"
              : "border-transparent text-theme-text-muted hover:text-theme-text"
          }`}
        >
          Roles & Permissions Matrix ({initialRoles.length})
        </button>
      </div>

      {/* USERS TAB */}
      {tab === "users" && (
        <div className="space-y-6">
          {/* Filters Toolbar */}
          <div className="bg-theme-surface border border-theme-border rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by user name, username, email, or employee ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-theme-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface"
              />
              <svg className="w-4 h-4 text-theme-text-muted absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border border-theme-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface min-w-[130px]"
            >
              <option value="ALL">All Roles</option>
              {initialRoles.map((r) => (
                <option key={r.id || r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-theme-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface min-w-[120px]"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {/* Department Filter */}
            {departments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="border border-theme-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-theme-primary bg-theme-surface min-w-[140px]"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-theme-surface-hover border-b border-theme-border text-[11px] uppercase text-theme-text-muted font-semibold tracking-wider">
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Invoices</th>
                    <th className="px-5 py-3.5">Expenses</th>
                    <th className="px-5 py-3.5">Masters</th>
                    <th className="px-5 py-3.5">Reports</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-theme-text-muted">
                        No users found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const perms = getEffectiveUserPermissions(user);
                      const userRole = user.roleTitle || user.roleDefinition?.name || user.role;
                      const isOpen = actionMenuOpenId === user.id;

                      return (
                        <tr key={user.id} className={`hover:bg-theme-surface-hover/50 transition-colors ${!user.isActive ? "opacity-75 bg-theme-surface-hover/20" : ""}`}>
                          {/* User */}
                          <td className="px-5 py-3.5">
                            <button
                              type="button"
                              onClick={() => setSelectedUserForView(user)}
                              className="font-bold text-theme-text hover:text-theme-primary text-left block"
                            >
                              {user.name}
                            </button>
                            <span className="text-[11px] text-theme-text-muted">
                              {user.email} {user.username ? `• @${user.username}` : ""}
                            </span>
                          </td>

                          {/* Role */}
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-theme-surface-hover text-theme-text border border-theme-border">
                              {userRole}
                            </span>
                          </td>

                          {/* Invoices */}
                          <td className="px-5 py-3.5">
                            {getPermissionBadge(perms.invoices?.level)}
                          </td>

                          {/* Expenses */}
                          <td className="px-5 py-3.5">
                            {getPermissionBadge(perms.expenses?.level)}
                          </td>

                          {/* Masters */}
                          <td className="px-5 py-3.5">
                            {getPermissionBadge(perms.masters?.level)}
                          </td>

                          {/* Reports */}
                          <td className="px-5 py-3.5">
                            {getPermissionBadge(perms.reports?.level)}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}>
                              {user.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right relative">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedUserForView(user)}
                                className="px-2.5 py-1 text-[11px] font-medium border border-theme-border rounded-md hover:bg-theme-surface-hover text-theme-text transition-colors"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForEdit(user);
                                  setShowUserModal(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-medium border border-theme-border rounded-md hover:bg-theme-surface-hover text-theme-text transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionMenuOpenId(isOpen ? null : user.id)}
                                className="px-2 py-1 text-[11px] font-bold border border-theme-border rounded-md hover:bg-theme-surface-hover text-theme-text"
                              >
                                ⋮
                              </button>
                            </div>

                            {/* Dropdown Menu */}
                            {isOpen && (
                              <div
                                className="absolute right-5 top-12 w-44 bg-theme-surface border border-theme-border rounded-xl shadow-lg z-30 py-1.5 text-left text-xs"
                                onMouseLeave={() => setActionMenuOpenId(null)}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    setSelectedUserForView(user);
                                  }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-theme-surface-hover text-theme-text flex items-center gap-2"
                                >
                                  <span>👁</span> View User Profile
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    setSelectedUserForEdit(user);
                                    setShowUserModal(true);
                                  }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-theme-surface-hover text-theme-text flex items-center gap-2"
                                >
                                  <span>✏️</span> Edit User & Role
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    handleToggleStatus(user);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left hover:bg-theme-surface-hover flex items-center gap-2 font-medium ${
                                    user.isActive ? "text-red-600" : "text-emerald-600"
                                  }`}
                                >
                                  <span>{user.isActive ? "🚫" : "✓"}</span>
                                  {user.isActive ? "Deactivate User" : "Activate User"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ROLES TAB */}
      {tab === "roles" && (
        <div className="space-y-6">
          <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-theme-surface-hover border-b border-theme-border text-[11px] uppercase text-theme-text-muted font-semibold tracking-wider">
                    <th className="px-5 py-3.5">Role Name</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5 text-center">Assigned Users</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border text-xs">
                  {initialRoles.map((role) => (
                    <tr key={role.id || role.name} className="hover:bg-theme-surface-hover/50">
                      <td className="px-5 py-3.5 font-bold text-theme-text">
                        {role.name}
                        {role.isSystem && (
                          <span className="ml-2 text-[10px] text-theme-primary uppercase font-bold">
                            (System)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-theme-text-muted max-w-sm">
                        {role.description || "Custom enterprise role"}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-theme-text">
                        {role._count?.users ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          role.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-theme-surface-hover text-theme-text-muted"
                        }`}>
                          {role.status || "ACTIVE"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoleForEdit(role);
                            setShowRoleModal(true);
                          }}
                          className="px-3 py-1 text-xs font-medium border border-theme-border rounded-md hover:bg-theme-surface-hover text-theme-text"
                        >
                          Manage Permissions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3 Summary Cards at Bottom */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="bg-theme-surface rounded-xl shadow-sm p-5 border border-theme-border">
          <span className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider">
            Active Users
          </span>
          <p className="mt-2 text-2xl font-bold text-theme-text">
            {metrics.activeUsers}
          </p>
          <p className="text-[11px] text-theme-text-muted mt-1">
            Accounts authorized to log in
          </p>
        </div>

        <div className="bg-theme-surface rounded-xl shadow-sm p-5 border border-theme-border">
          <span className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider">
            Roles
          </span>
          <p className="mt-2 text-2xl font-bold text-theme-primary">
            {metrics.totalRoles}
          </p>
          <p className="text-[11px] text-theme-text-muted mt-1">
            Configured permission profiles
          </p>
        </div>

        <div className="bg-theme-surface rounded-xl shadow-sm p-5 border border-theme-border">
          <span className="text-[11px] font-bold text-[#B27A17] uppercase tracking-wider">
            Access Model
          </span>
          <p className="mt-2 text-2xl font-bold text-theme-text">
            {metrics.accessModel}
          </p>
          <p className="text-[11px] text-theme-text-muted mt-1">
            Granular module level authorization
          </p>
        </div>
      </div>

      {/* Modals */}
      {showUserModal && (
        <UserFormModal
          user={selectedUserForEdit}
          roles={initialRoles}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUserForEdit(null);
          }}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {selectedUserForView && (
        <UserViewModal
          user={selectedUserForView}
          onClose={() => setSelectedUserForView(null)}
          onEdit={() => {
            setSelectedUserForEdit(selectedUserForView);
            setShowUserModal(true);
          }}
        />
      )}

      {showRoleModal && (
        <RoleFormModal
          role={selectedRoleForEdit}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedRoleForEdit(null);
          }}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
