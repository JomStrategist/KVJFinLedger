"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  createExpenseCategoryAction,
  updateExpenseCategoryAction, 
  toggleExpenseCategoryStatusAction,
  seedCategoriesAction
} from "./category-actions";

export function CategoryClient({ initialCategories, query }: { initialCategories: any[], query: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get("q") as string;
    router.push(`/expenses?tab=categories&q=${encodeURIComponent(q)}`);
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      await toggleExpenseCategoryStatusAction(id, !currentStatus);
    });
  };

  const handleSeed = () => {
    startTransition(async () => {
      await seedCategoriesAction();
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    };

    startTransition(async () => {
      const res = editingCategory 
        ? await updateExpenseCategoryAction(editingCategory.id, data)
        : await createExpenseCategoryAction(data);

      if (res.success) {
        setShowModal(false);
        setEditingCategory(null);
      } else {
        setError(res.error);
      }
    });
  };

  const openEdit = (cat: any) => {
    setEditingCategory(cat);
    setShowModal(true);
    setError(null);
  };

  const openNew = () => {
    setEditingCategory(null);
    setShowModal(true);
    setError(null);
  };

  return (
    <>
      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        <div className="p-4 border-b border-theme-border bg-theme-surface-hover flex flex-col sm:flex-row gap-4 justify-between items-center">
          <form onSubmit={handleSearch} className="flex-1 w-full max-w-md flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search categories..."
              className="flex-1 border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
            />
            <button type="submit" className="px-4 py-2 bg-theme-bg text-white rounded-lg text-sm font-medium hover:bg-theme-surface-hover">
              Search
            </button>
          </form>

          <div className="flex gap-2">
            <button
              onClick={handleSeed}
              disabled={isPending}
              className="px-4 py-2 border border-theme-border bg-theme-surface text-theme-text rounded-lg text-sm font-medium hover:bg-theme-surface-hover disabled:opacity-50"
            >
              Seed Defaults
            </button>
            <button
              onClick={openNew}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-dark transition-colors"
            >
              Add Category
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-theme-surface-hover border-b border-theme-border text-xs uppercase text-theme-text-muted font-semibold">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Expenses</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {initialCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-theme-text-muted">
                    No categories found. Click "Seed Defaults" to populate standard categories.
                  </td>
                </tr>
              ) : (
                initialCategories.map((cat) => (
                  <tr key={cat.id} className={`hover:bg-theme-surface-hover/50 transition-colors ${!cat.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 font-medium text-theme-text">
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-theme-text-muted">
                      {cat.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(cat.id, cat.isActive)}
                        disabled={isPending}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${cat.isActive ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-800' : 'bg-theme-surface-hover text-theme-text hover:bg-green-100 hover:text-green-800'}`}
                        title="Click to toggle status"
                      >
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-theme-text-muted">
                      {cat._count.expenses}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button onClick={() => openEdit(cat)} className="text-theme-text-muted hover:text-theme-text">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-theme-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-theme-border">
              <h3 className="text-lg font-bold text-theme-text">
                {editingCategory ? "Edit Category" : "Add Category"}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingCategory?.name}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingCategory?.description}
                  rows={3}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-theme-primary focus:border-theme-primary"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-theme-border bg-theme-surface text-theme-text rounded-lg text-sm font-medium hover:bg-theme-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-theme-primary text-white rounded-lg text-sm font-medium hover:bg-theme-primary-dark disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
