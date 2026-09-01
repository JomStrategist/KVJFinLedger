"use client";

import { useState, useTransition } from "react";
import { saveRoleAction } from "./actions";
import { AccessLevel, RolePermissions } from "@/lib/rbac";

export function RoleFormModal({
  role,
  onClose,
  onSuccess,
}: {
  role?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(role?.id);

  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [status, setStatus] = useState(role?.status || "ACTIVE");

  const initialPermissions: RolePermissions = role?.permissions || {
    dashboard: { level: "View", view: true },
    invoices: { level: "Full", view: true, create: true, edit: true, delete: true },
    expenses: { level: "Full", view: true, create: true, edit: true, delete: true },
    bank: { level: "Full", view: true, create: true, edit: true, delete: true },
    masters: { level: "Limited", view: true, create: true, edit: false, delete: false },
    reports: { level: "Full", view: true, export: true },
    users: { level: "No Access", view: false, create: false, edit: false, delete: false },
    opening: { level: "View", view: true, create: false },
  };

  const [permissions, setPermissions] = useState<RolePermissions>(initialPermissions);

  const updateModuleLevel = (mod: keyof RolePermissions, level: AccessLevel) => {
    setPermissions(prev => {
      const current = { ...prev[mod], level };
      if (level === "Full") {
        current.view = true;
        current.create = true;
        current.edit = true;
        current.delete = true;
        current.export = true;
      } else if (level === "View") {
        current.view = true;
        current.create = false;
        current.edit = false;
        current.delete = false;
        current.export = false;
      } else if (level === "No Access") {
        current.view = false;
        current.create = false;
        current.edit = false;
        current.delete = false;
        current.export = false;
      } else if (level === "Limited" || level === "Assigned") {
        current.view = true;
        current.create = true;
        current.edit = true;
        current.delete = false;
      }
      return { ...prev, [mod]: current };
    });
  };

  const updateCapability = (mod: keyof RolePermissions, cap: "view" | "create" | "edit" | "delete" | "export", val: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [cap]: val
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Role Name is required.");
      return;
    }

    startTransition(async () => {
      const res = await saveRoleAction({
        id: role?.id,
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        permissions,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  const moduleRows: Array<{ key: keyof RolePermissions; label: string; hasDelete?: boolean; hasExport?: boolean }> = [
    { key: "dashboard", label: "Dashboard" },
    { key: "invoices", label: "Invoices & Proformas", hasDelete: true },
    { key: "expenses", label: "Expenses & Vendor Bills", hasDelete: true },
    { key: "bank", label: "Bank Transfers", hasDelete: true },
    { key: "masters", label: "Masters (Customers, Vendors, Products)", hasDelete: true },
    { key: "reports", label: "Financial Reports", hasExport: true },
    { key: "users", label: "Users & Roles", hasDelete: true },
    { key: "opening", label: "Opening / Closing Balances" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-theme-surface w-full max-w-3xl rounded-2xl shadow-xl border border-theme-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center bg-theme-surface">
          <div>
            <span className="text-[11px] font-bold text-theme-primary uppercase tracking-wider">
              Access Control & Permissions
            </span>
            <h2 className="text-xl font-bold text-theme-text mt-0.5">
              {isEdit ? `Edit Role: ${role.name}` : "Create New Role"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-theme-text-muted hover:text-theme-text p-2 rounded-lg hover:bg-theme-surface-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form id="role-modal-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accounts Executive"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface font-semibold"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Role Description
                </label>
                <input
                  type="text"
                  placeholder="Briefly describe the operational responsibilities of this role"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                />
              </div>
            </div>

            {/* Granular Module Permissions */}
            <div className="space-y-3 pt-2 border-t border-theme-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
                Module Permissions Matrix
              </h3>
              
              <div className="border border-theme-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-theme-surface-hover text-theme-text-muted font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Module</th>
                      <th className="px-4 py-2.5">Access Level</th>
                      <th className="px-4 py-2.5 text-center">View</th>
                      <th className="px-4 py-2.5 text-center">Create</th>
                      <th className="px-4 py-2.5 text-center">Edit</th>
                      <th className="px-4 py-2.5 text-center">Delete / Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border">
                    {moduleRows.map((r) => {
                      const perm = permissions[r.key];
                      return (
                        <tr key={r.key} className="hover:bg-theme-surface-hover/30">
                          <td className="px-4 py-2.5 font-semibold text-theme-text">{r.label}</td>
                          <td className="px-4 py-2.5">
                            <select
                              value={perm?.level || "No Access"}
                              onChange={(e) => updateModuleLevel(r.key, e.target.value as AccessLevel)}
                              className="border border-theme-border rounded-md px-2 py-1 text-xs bg-theme-surface"
                            >
                              <option value="Full">Full</option>
                              <option value="View">View</option>
                              <option value="Limited">Limited</option>
                              <option value="Assigned">Assigned</option>
                              <option value="No Access">No Access</option>
                            </select>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm?.view)}
                              onChange={(e) => updateCapability(r.key, "view", e.target.checked)}
                              className="rounded border-theme-border text-theme-primary focus:ring-theme-primary h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm?.create)}
                              onChange={(e) => updateCapability(r.key, "create", e.target.checked)}
                              className="rounded border-theme-border text-theme-primary focus:ring-theme-primary h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm?.edit)}
                              onChange={(e) => updateCapability(r.key, "edit", e.target.checked)}
                              className="rounded border-theme-border text-theme-primary focus:ring-theme-primary h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {r.hasExport ? (
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(perm?.export)}
                                  onChange={(e) => updateCapability(r.key, "export", e.target.checked)}
                                  className="rounded border-theme-border text-theme-primary focus:ring-theme-primary h-4 w-4"
                                />
                                <span className="text-[10px] text-theme-text-muted">Export</span>
                              </label>
                            ) : r.hasDelete ? (
                              <input
                                type="checkbox"
                                checked={Boolean(perm?.delete)}
                                onChange={(e) => updateCapability(r.key, "delete", e.target.checked)}
                                className="rounded border-theme-border text-theme-primary focus:ring-theme-primary h-4 w-4"
                              />
                            ) : (
                              <span className="text-theme-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-theme-border flex justify-end items-center gap-3 bg-theme-surface">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-theme-border rounded-lg text-xs font-medium hover:bg-theme-surface-hover text-theme-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="role-modal-form"
            disabled={isPending}
            className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving Role..." : "Save Role & Permissions"}
          </button>
        </div>
      </div>
    </div>
  );
}
