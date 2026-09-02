"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getBankAccountsAction,
  createBankAccountAction,
  updateBankAccountAction,
  setPrimaryBankAccountAction,
} from "./bank-actions";

export function BankAccountsMasterTab() {
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const fetchAccounts = async () => {
    setLoading(true);
    const res = await getBankAccountsAction();
    if (res.success && res.data) {
      setBankAccounts(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openAddModal = () => {
    setEditingAccount(null);
    setAccountName("KVJ Analytics");
    setBankName("");
    setBranch("");
    setAccountNumber("");
    setIfsc("");
    setIsPrimary(bankAccounts.length === 0);
    setIsActive(true);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (acc: any) => {
    setEditingAccount(acc);
    setAccountName(acc.accountName || "");
    setBankName(acc.bankName || "");
    setBranch(acc.branch || "");
    setAccountNumber(acc.accountNumber || "");
    setIfsc(acc.ifsc || "");
    setIsPrimary(Boolean(acc.isPrimary));
    setIsActive(Boolean(acc.isActive));
    setError(null);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      let res: any;
      const payload = {
        accountName,
        bankName,
        branch,
        accountNumber,
        ifsc,
        isPrimary,
        isActive,
      };

      if (editingAccount?.id) {
        res = await updateBankAccountAction(editingAccount.id, payload);
      } else {
        res = await createBankAccountAction(payload);
      }

      if (res?.success) {
        setShowModal(false);
        fetchAccounts();
      } else {
        setError(res?.error || "Failed to save bank account.");
      }
    });
  };

  const handleSetPrimary = (id: string) => {
    startTransition(async () => {
      const res = await setPrimaryBankAccountAction(id);
      if (res?.success) {
        fetchAccounts();
      }
    });
  };

  const handleToggleActive = (acc: any) => {
    startTransition(async () => {
      const res = await updateBankAccountAction(acc.id, { isActive: !acc.isActive });
      if (res?.success) {
        fetchAccounts();
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#17211B]">Bank Details Master</h3>
          <p className="text-xs text-[#68756C] mt-0.5">
            Manage company bank accounts. Exactly one bank account must be designated as Primary.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="h-[38px] px-4 bg-[#0F766E] hover:bg-[#0D655D] text-white text-xs font-medium rounded-xl transition-all shadow-xs inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >

          Add Bank Account
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-[#68756C]">Loading bank accounts...</div>
      ) : bankAccounts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#D9E3DC] p-6 text-[#68756C] text-xs">
          No bank accounts configured yet. Click "Add Bank Account" to create your primary settlement account.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#D9E3DC] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F7F5] border-b border-[#D9E3DC] text-[#68756C] font-semibold">
                <tr>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Bank Name</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Account Number</th>
                  <th className="py-3 px-4">IFSC Code</th>
                  <th className="py-3 px-4">Primary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF0EC]">
                {bankAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[#F9FAF9] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#17211B]">{acc.accountName}</td>
                    <td className="py-3 px-4 text-[#434E45]">{acc.bankName}</td>
                    <td className="py-3 px-4 text-[#68756C]">{acc.branch || "—"}</td>
                    <td className="py-3 px-4 font-mono text-[#17211B]">{acc.accountNumber}</td>
                    <td className="py-3 px-4 font-mono text-[#17211B]">{acc.ifsc}</td>
                    <td className="py-3 px-4">
                      {acc.isPrimary ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F4F1] text-[#0F766E] border border-[#BBE3DA]">
                          Primary
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(acc.id)}
                          disabled={isPending}
                          className="text-[11px] text-[#0F766E] hover:underline font-medium cursor-pointer"
                        >
                          Make Primary
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(acc)}
                        disabled={isPending}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer ${
                          acc.isActive
                            ? "bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]"
                            : "bg-[#F1F3F4] text-[#5F6368] border-[#DADCE0]"
                        }`}
                      >
                        {acc.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(acc)}
                        className="text-[#0F766E] hover:text-[#0D655D] font-medium text-xs cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBF0EC] pb-3">
              <h3 className="text-base font-bold text-[#17211B]">
                {editingAccount ? "Edit Bank Account" : "Add Bank Account"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#68756C] hover:text-[#17211B] text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1">
                  Account Name (Beneficiary) *
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Federal Bank"
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Kakkanad Branch"
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#68756C] mb-1">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-[#17211B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  Set as Primary Bank Account
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-[#17211B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-[#0F766E] focus:ring-[#0F766E]"
                  />
                  Active Account
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EBF0EC]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-[38px] px-4 border border-[#D9E3DC] hover:bg-[#F4F7F5] text-[#434E45] text-xs font-medium rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-[38px] px-5 bg-[#0F766E] hover:bg-[#0D655D] text-white text-xs font-medium rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {isPending ? "Saving..." : "Save Bank Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
