import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('FinLedger UI/UX Reorganization — Phase 1 Navigation Verification', () => {
  it('Pillar Navigation: Exactly 7 core operational pillars are defined', async () => {
    // Read Sidebar.tsx source to verify clean 7-pillar model
    const fs = await import('fs');
    const path = await import('path');
    const sidebarContent = fs.readFileSync(path.join(process.cwd(), 'components/Sidebar.tsx'), 'utf-8');

    const expectedPillars = [
      'Dashboard',
      'Sales & Invoicing',
      'Purchases & Expenses',
      'Banking & Treasury',
      'General Ledger',
      'Reports & Analytics',
      'Administration & Settings',
    ];

    for (const pillar of expectedPillars) {
      assert.ok(
        sidebarContent.includes(`name: "${pillar}"`),
        `Sidebar must contain navigation pillar: ${pillar}`
      );
    }

    // Ensure removed legacy standalone items are not in navItems
    const legacyStandalones = [
      'name: "Masters"',
      'name: "Employees"',
      'name: "Users"',
      'name: "Opening / Closing"',
    ];

    for (const legacy of legacyStandalones) {
      assert.ok(
        !sidebarContent.includes(legacy),
        `Sidebar must NOT contain top-level legacy item: ${legacy}`
      );
    }
  });

  it('Legacy Redirection: /home redirects to /dashboard', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const homePage = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/home/page.tsx'), 'utf-8');
    assert.ok(homePage.includes("redirect('/dashboard')"), 'home/page.tsx must redirect to /dashboard');
  });

  it('Legacy Redirection: /proforma-invoices redirects to /invoices?tab=proforma', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/proforma-invoices/page.tsx'), 'utf-8');
    assert.ok(file.includes("query.set('tab', 'proforma')"), 'Must set tab=proforma');
    assert.ok(file.includes("redirect(`/invoices?${query.toString()}`)"), 'Must redirect to /invoices');
  });

  it('Legacy Redirection: /customers redirects to /invoices?tab=customers', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/customers/page.tsx'), 'utf-8');
    assert.ok(file.includes('query.set("tab", "customers")'), 'Must set tab=customers');
    assert.ok(file.includes('redirect(`/invoices?${query.toString()}`)'), 'Must redirect to /invoices');
  });

  it('Legacy Redirection: /vendors redirects to /expenses?tab=vendors', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/vendors/page.tsx'), 'utf-8');
    assert.ok(file.includes('query.set("tab", "vendors")'), 'Must set tab=vendors');
    assert.ok(file.includes('redirect(`/expenses?${query.toString()}`)'), 'Must redirect to /expenses');
  });

  it('Legacy Redirection: /products redirects to /invoices?tab=products', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/products/page.tsx'), 'utf-8');
    assert.ok(file.includes('query.set("tab", "products")'), 'Must set tab=products');
    assert.ok(file.includes('redirect(`/invoices?${query.toString()}`)'), 'Must redirect to /invoices');
  });

  it('Legacy Redirection: /bank-transfers/reconciliation redirects to /bank-transfers?tab=reconciliation', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const file = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/bank-transfers/reconciliation/page.tsx'), 'utf-8');
    assert.ok(file.includes("query.set('tab', 'reconciliation')"), 'Must set tab=reconciliation');
    assert.ok(file.includes("redirect(`/bank-transfers?${query.toString()}`)"), 'Must redirect to /bank-transfers');
  });

  it('General Ledger Subnavigation: All 3 sub-pages render GeneralLedgerNav', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const ledgersPage = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/ledgers/page.tsx'), 'utf-8');
    assert.ok(ledgersPage.includes('<GeneralLedgerNav />'), 'ledgers/page.tsx must render GeneralLedgerNav');

    const journalsPage = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/journals/page.tsx'), 'utf-8');
    assert.ok(journalsPage.includes('<GeneralLedgerNav />'), 'journals/page.tsx must render GeneralLedgerNav');

    const opclPage = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/opening-closing/page.tsx'), 'utf-8');
    assert.ok(opclPage.includes('<GeneralLedgerNav />'), 'opening-closing/page.tsx must render GeneralLedgerNav');
  });

  it('Sales & Invoicing Hub: Contains Products & Services tab alongside Confirmed, Proforma, Customers', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const invoicesPage = fs.readFileSync(path.join(process.cwd(), 'app/(dashboard)/invoices/page.tsx'), 'utf-8');

    assert.ok(invoicesPage.includes('{ id: "confirmed", label: "Confirmed Invoices" }'), 'Must have confirmed tab');
    assert.ok(invoicesPage.includes('{ id: "proforma", label: "Proforma Invoices" }'), 'Must have proforma tab');
    assert.ok(invoicesPage.includes('{ id: "customers", label: "Customers" }'), 'Must have customers tab');
    assert.ok(invoicesPage.includes('{ id: "products", label: "Products & Services" }'), 'Must have products tab');
  });
});
