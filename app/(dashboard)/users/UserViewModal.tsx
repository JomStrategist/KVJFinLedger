"use client";

import { getEffectiveUserPermissions } from "@/lib/rbac";

export function UserViewModal({
  user,
  onClose,
  onEdit,
}: {
  user: any;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const permissions = getEffectiveUserPermissions(user);

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "Full":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">FULL</span>;
      case "Limited":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">LIMITED</span>;
      case "Assigned":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">ASSIGNED</span>;
      case "View":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">VIEW</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-theme-surface-hover text-theme-text-muted border border-theme-border">NO ACCESS</span>;
    }
  };

  const modulesList = [
    { key: "invoices", label: "Invoices & Proformas", perm: permissions.invoices },
    { key: "expenses", label: "Expenses & Vendor Bills", perm: permissions.expenses },
    { key: "bank", label: "Bank Transfers", perm: permissions.bank },
    { key: "masters", label: "Masters (Customers, Vendors, Products)", perm: permissions.masters },
    { key: "reports", label: "Financial Reports", perm: permissions.reports },
    { key: "users", label: "Users & Roles Management", perm: permissions.users },
    { key: "opening", label: "Opening / Closing Balances", perm: permissions.opening },
    { key: "dashboard", label: "Executive Dashboard", perm: permissions.dashboard },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-theme-surface w-full max-w-2xl rounded-2xl shadow-xl border border-theme-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center bg-theme-surface">
          <div>
            <span className="text-[11px] font-bold text-theme-primary uppercase tracking-wider">
              User Profile & Access
            </span>
            <h2 className="text-xl font-bold text-theme-text mt-0.5">{user.name}</h2>
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
          {/* User Information Grid */}
          <div className="bg-theme-surface-hover/50 p-4 rounded-xl border border-theme-border space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">User Information</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-theme-text-muted block text-[11px]">Full Name</span>
                <span className="font-semibold text-theme-text">{user.name}</span>
              </div>
              <div>
                <span className="text-theme-text-muted block text-[11px]">Username</span>
                <span className="font-semibold text-theme-text">{user.username || "—"}</span>
              </div>
              <div>
                <span className="text-theme-text-muted block text-[11px]">Email Address</span>
                <span className="font-semibold text-theme-text">{user.email}</span>
              </div>
              <div>
                <span className="text-theme-text-muted block text-[11px]">Mobile Number</span>
                <span className="font-semibold text-theme-text">{user.phone || "—"}</span>
              </div>
              <div>
                <span className="text-theme-text-muted block text-[11px]">Employee ID</span>
                <span className="font-semibold text-theme-text">{user.employeeId || "—"}</span>
              </div>
              <div>
                <span className="text-theme-text-muted block text-[11px]">Department</span>
                <span className="font-semibold text-theme-text">{user.department || "Finance"}</span>
              </div>
              <div>
                <span className="text-theme-text-muted block text-[11px]">Assigned Role</span>
                <span className="font-bold text-theme-primary">{user.roleTitle || user.roleDefinition?.name || user.role}</span>
              </div>
              <div>
                <span className="text-theme-text-muted block text-[11px]">Account Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                  user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}>
                  {user.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <div>
                <span className="text-theme-text-muted block text-[11px]">Created Date</span>
                <span className="font-medium text-theme-text">
                  {new Date(user.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Access & Permissions Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text">
              Access & Permissions
            </h3>
            
            <div className="border border-theme-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-theme-surface-hover text-theme-text-muted font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Module</th>
                    <th className="px-4 py-2.5">Access Level</th>
                    <th className="px-4 py-2.5 text-right">Capabilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {modulesList.map((m) => (
                    <tr key={m.key} className="hover:bg-theme-surface-hover/40">
                      <td className="px-4 py-2.5 font-semibold text-theme-text">{m.label}</td>
                      <td className="px-4 py-2.5">{getLevelBadge(m.perm?.level || "No Access")}</td>
                      <td className="px-4 py-2.5 text-right text-theme-text-muted">
                        {[
                          m.perm?.view ? "View" : null,
                          m.perm?.create ? "Create" : null,
                          m.perm?.edit ? "Edit" : null,
                          m.perm?.delete ? "Delete" : null,
                          m.perm?.export ? "Export" : null,
                        ].filter(Boolean).join(" • ") || "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-theme-border flex justify-between items-center bg-theme-surface">
          {onEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg text-xs font-medium hover:bg-theme-primary-dark transition-colors"
            >
              Edit User Details
            </button>
          ) : <div />}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-theme-border rounded-lg text-xs font-medium hover:bg-theme-surface-hover text-theme-text"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
