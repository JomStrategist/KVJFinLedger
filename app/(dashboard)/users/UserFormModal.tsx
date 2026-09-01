"use client";

import { useState, useTransition } from "react";
import { createUserAction, updateUserAction } from "./actions";
import { RolePermissions, getEffectiveUserPermissions } from "@/lib/rbac";

export function UserFormModal({
  user,
  roles,
  onClose,
  onSuccess,
}: {
  user?: any;
  roles: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(user?.id);

  // Form State
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [employeeId, setEmployeeId] = useState(user?.employeeId || "");
  const [department, setDepartment] = useState(user?.department || "Finance");
  const [roleName, setRoleName] = useState(user?.roleTitle || user?.roleDefinition?.name || "Finance");
  const [isActive, setIsActive] = useState(user ? user.isActive : true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEdit && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      let res;
      if (isEdit) {
        res = await updateUserAction(user.id, {
          name,
          username: username.trim() || undefined,
          email,
          phone: phone.trim() || undefined,
          employeeId: employeeId.trim() || undefined,
          department: department.trim() || undefined,
          roleName,
          isActive,
          password: password.trim() || undefined,
        });
      } else {
        res = await createUserAction({
          name,
          username: username.trim() || undefined,
          email,
          phone: phone.trim() || undefined,
          employeeId: employeeId.trim() || undefined,
          department: department.trim() || undefined,
          roleName,
          isActive,
          password: password.trim() || undefined,
        });
      }

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-theme-surface w-full max-w-2xl rounded-2xl shadow-xl border border-theme-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center bg-theme-surface">
          <div>
            <span className="text-[11px] font-bold text-theme-primary uppercase tracking-wider">
              {isEdit ? "User Settings" : "New User Registration"}
            </span>
            <h2 className="text-xl font-bold text-theme-text mt-0.5">
              {isEdit ? `Edit User: ${user.name}` : "Add New User"}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form id="user-modal-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. rahul.sharma"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@kvjanalytics.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. KVJ-2026-04"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                >
                  <option value="Executive / Management">Executive / Management</option>
                  <option value="Finance & Accounts">Finance & Accounts</option>
                  <option value="Operations & Delivery">Operations & Delivery</option>
                  <option value="IT & Technical">IT & Technical</option>
                  <option value="Sales & Business Dev">Sales & Business Dev</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface font-semibold"
                >
                  {roles.map((r) => (
                    <option key={r.id || r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  {isEdit ? "New Password (Leave blank to keep current)" : "Password *"}
                </label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  required={!isEdit}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  required={!isEdit || password.length > 0}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-xs bg-theme-surface"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-text mb-1">
                Account Status
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    isActive
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold shadow-xs"
                      : "text-theme-text-muted border-theme-border hover:bg-theme-surface-hover"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    !isActive
                      ? "bg-red-100 text-red-800 border-red-300 font-bold shadow-xs"
                      : "text-theme-text-muted border-theme-border hover:bg-theme-surface-hover"
                  }`}
                >
                  Inactive
                </button>
              </div>
              <p className="text-[11px] text-theme-text-muted mt-1">
                Inactive users cannot log in, but historical invoices and transactions remain intact.
              </p>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
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
            form="user-modal-form"
            disabled={isPending}
            className="px-5 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-lg text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving User..." : "Save User"}
          </button>
        </div>
      </div>
    </div>
  );
}
