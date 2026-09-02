import Link from "next/link";
import { VendorService } from "@/services/vendor.service";

export const dynamic = "force-dynamic";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: "ACTIVE" | "INACTIVE" };
}) {
  const query = searchParams.q || "";
  const isActiveFilter = searchParams.status === "ACTIVE" ? true : searchParams.status === "INACTIVE" ? false : undefined;

  const vendors = await VendorService.getVendors({ search: query, isActive: isActiveFilter });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Vendors</h1>
          <p className="text-theme-text-muted text-sm mt-1">Manage your suppliers and service providers.</p>
        </div>
        <Link 
          href="/vendors/new" 
          className="inline-flex items-center justify-center px-4 py-2 bg-theme-primary hover:bg-theme-primary-dark text-white text-sm font-medium rounded-lg transition-colors shadow-sm gap-2"
        >
          Add Vendor
        </Link>
      </div>

      <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-theme-border bg-theme-surface-hover flex flex-col sm:flex-row gap-4 justify-between items-center">
          <form className="flex-1 w-full max-w-md flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search vendors..."
              className="flex-1 border border-theme-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
            />
            {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
            <button type="submit" className="px-4 py-2 bg-theme-bg text-white rounded-lg text-sm font-medium hover:bg-theme-surface-hover">
              Search
            </button>
          </form>

          <div className="flex gap-2 text-sm">
            <Link href={`/vendors?q=${query}`} className={`px-3 py-1.5 rounded-lg border ${!searchParams.status ? 'bg-theme-bg text-white' : 'bg-theme-surface text-theme-text-muted hover:bg-theme-surface-hover'}`}>
              All
            </Link>
            <Link href={`/vendors?status=ACTIVE&q=${query}`} className={`px-3 py-1.5 rounded-lg border ${searchParams.status === 'ACTIVE' ? 'bg-theme-bg text-white' : 'bg-theme-surface text-theme-text-muted hover:bg-theme-surface-hover'}`}>
              Active
            </Link>
            <Link href={`/vendors?status=INACTIVE&q=${query}`} className={`px-3 py-1.5 rounded-lg border ${searchParams.status === 'INACTIVE' ? 'bg-theme-bg text-white' : 'bg-theme-surface text-theme-text-muted hover:bg-theme-surface-hover'}`}>
              Inactive
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-theme-surface-hover border-b border-theme-border text-xs uppercase text-theme-text-muted font-semibold">
                <th className="px-6 py-3">Vendor</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">GSTIN</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Expenses</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-theme-text-muted">
                    No vendors found. Add your first supplier to get started.
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className={`hover:bg-theme-surface-hover/50 transition-colors ${!vendor.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-theme-text">{vendor.name}</div>
                      {vendor.businessName && (
                        <div className="text-xs text-theme-text-muted">{vendor.businessName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-theme-text">{vendor.phone || '-'}</div>
                      <div className="text-xs text-theme-text-muted">{vendor.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-theme-text-muted">
                      {vendor.gstin || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-theme-surface-hover text-theme-text'}`}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-theme-text-muted">
                      {(vendor as any)._count?.expenses || 0}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <Link href={`/vendors/${vendor.id}`} className="text-theme-primary hover:text-blue-900 mr-4">
                        View
                      </Link>
                      <Link href={`/vendors/${vendor.id}/edit`} className="text-theme-text-muted hover:text-theme-text">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
