import { VendorForm } from "../VendorForm";

export default function NewVendorPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Add New Party</h1>
          <p className="text-theme-text-muted mt-1 text-sm">Register a new supplier or service provider.</p>
        </div>
      </div>

      <VendorForm />
    </div>
  );
}
