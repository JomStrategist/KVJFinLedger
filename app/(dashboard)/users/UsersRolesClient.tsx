"use client";

import { useState } from "react";
import { UserFormModal } from "./UserFormModal";
import { useRouter } from "next/navigation";

export function UsersRolesClient({
  initialUsers = [],
  roles = [],
}: {
  initialUsers: any[];
  roles: any[];
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#17211B] tracking-tight">Users & Roles</h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Control access for CEO and assigned users.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#177B55] hover:bg-[#136f4e] shadow-xs transition-colors gap-1.5 shrink-0 cursor-pointer"
        >
          <span>+</span> Add User
        </button>
      </div>

      {/* Main Card Container */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="border-b border-[#D9E3DC] text-[11px] uppercase text-[#738078] font-bold tracking-wider">
                <th className="py-3 px-3">USER</th>
                <th className="py-3 px-3">ROLE</th>
                <th className="py-3 px-3">EMAIL</th>
                <th className="py-3 px-3">ACCESS</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EEE9] text-xs">
              {initialUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#68756C]">
                    No users found. Click &quot;+ Add User&quot; to create one.
                  </td>
                </tr>
              ) : (
                initialUsers.map((user) => {
                  const roleName = user.roleDefinition?.name || (user.role === "ADMIN" ? "Administrator" : "Assigned User");
                  const accessSummary =
                    roleName === "Administrator"
                      ? "Full Access"
                      : "Invoices, Expenses, Reports";

                  return (
                    <tr key={user.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-4 px-3 font-bold text-[#17211B]">
                        {user.name || "User"}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {roleName}
                      </td>
                      <td className="py-4 px-3 text-[#68756C]">
                        {user.email}
                      </td>
                      <td className="py-4 px-3 text-[#17211B] font-medium">
                        {accessSummary}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E5F3EC] text-[#0B5F46] tracking-wider">
                          ACTIVE
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          className="bg-white border border-[#D9E3DC] rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B5F46] hover:bg-[#F4F7F3] transition-colors shadow-2xs"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <UserFormModal
          user={selectedUser}
          roles={roles}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
