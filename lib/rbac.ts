export type AccessLevel = 'Full' | 'View' | 'Limited' | 'Assigned' | 'No Access';

export interface ModulePermission {
  level: AccessLevel;
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  export?: boolean;
}

export interface RolePermissions {
  invoices: ModulePermission;
  expenses: ModulePermission;
  bank: ModulePermission;
  masters: ModulePermission;
  reports: ModulePermission;
  users: ModulePermission;
  opening: ModulePermission;
  dashboard: ModulePermission;
}

export const DEFAULT_ROLE_DEFINITIONS: Array<{
  name: string;
  description: string;
  isSystem: boolean;
  status: string;
  permissions: RolePermissions;
}> = [
  {
    name: 'Administrator',
    description: 'Full administrative access to all modules, finance settings, and user management.',
    isSystem: true,
    status: 'ACTIVE',
    permissions: {
      dashboard: { level: 'Full', view: true },
      invoices: { level: 'Full', view: true, create: true, edit: true, delete: true },
      expenses: { level: 'Full', view: true, create: true, edit: true, delete: true },
      bank: { level: 'Full', view: true, create: true, edit: true, delete: true },
      masters: { level: 'Full', view: true, create: true, edit: true, delete: true },
      reports: { level: 'Full', view: true, export: true },
      users: { level: 'Full', view: true, create: true, edit: true, delete: true },
      opening: { level: 'Full', view: true, create: true }
    }
  },
  {
    name: 'Finance',
    description: 'Full access to invoices, expenses, bank transfers, and reports with view-only on masters.',
    isSystem: true,
    status: 'ACTIVE',
    permissions: {
      dashboard: { level: 'Full', view: true },
      invoices: { level: 'Full', view: true, create: true, edit: true, delete: true },
      expenses: { level: 'Full', view: true, create: true, edit: true, delete: true },
      bank: { level: 'Full', view: true, create: true, edit: true, delete: true },
      masters: { level: 'Limited', view: true, create: true, edit: false, delete: false },
      reports: { level: 'Full', view: true, export: true },
      users: { level: 'No Access', view: false, create: false, edit: false, delete: false },
      opening: { level: 'View', view: true, create: false }
    }
  },
  {
    name: 'Operator',
    description: 'Assigned creation & viewing of proformas/invoices and basic operating expense tracking.',
    isSystem: true,
    status: 'ACTIVE',
    permissions: {
      dashboard: { level: 'View', view: true },
      invoices: { level: 'Assigned', view: true, create: true, edit: true, delete: false },
      expenses: { level: 'Assigned', view: true, create: true, edit: true, delete: false },
      bank: { level: 'No Access', view: false, create: false, edit: false, delete: false },
      masters: { level: 'Limited', view: true, create: true, edit: false, delete: false },
      reports: { level: 'View', view: true, export: false },
      users: { level: 'No Access', view: false, create: false, edit: false, delete: false },
      opening: { level: 'No Access', view: false, create: false }
    }
  },
  {
    name: 'Viewer',
    description: 'Read-only access to invoices, expenses, reports, and masters without edit privileges.',
    isSystem: true,
    status: 'ACTIVE',
    permissions: {
      dashboard: { level: 'View', view: true },
      invoices: { level: 'View', view: true, create: false, edit: false, delete: false },
      expenses: { level: 'View', view: true, create: false, edit: false, delete: false },
      bank: { level: 'View', view: true, create: false, edit: false, delete: false },
      masters: { level: 'View', view: true, create: false, edit: false, delete: false },
      reports: { level: 'View', view: true, export: false },
      users: { level: 'No Access', view: false, create: false, edit: false, delete: false },
      opening: { level: 'View', view: true, create: false }
    }
  }
];

export function getEffectiveUserPermissions(user: any): RolePermissions {
  if (!user) {
    return DEFAULT_ROLE_DEFINITIONS[3].permissions; // Viewer fallback
  }

  // If user has custom explicit permissions, use them
  if (user.permissions && typeof user.permissions === 'object' && Object.keys(user.permissions).length > 0) {
    return user.permissions as RolePermissions;
  }

  // If user has a linked RoleDefinition
  if (user.roleDefinition?.permissions) {
    return user.roleDefinition.permissions as RolePermissions;
  }

  // Fallback match by role name or legacy Role enum
  const roleName = user.roleTitle || (user.role === 'ADMIN' ? 'Administrator' : 'Finance');
  const matched = DEFAULT_ROLE_DEFINITIONS.find(r => r.name.toLowerCase() === roleName.toLowerCase());
  if (matched) {
    return matched.permissions;
  }

  return user.role === 'ADMIN' ? DEFAULT_ROLE_DEFINITIONS[0].permissions : DEFAULT_ROLE_DEFINITIONS[1].permissions;
}
