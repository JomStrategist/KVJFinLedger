import { requireAdmin } from "@/lib/auth-utils";
import { UserService } from "@/services/user.service";
import { UsersRolesClient } from "./UsersRolesClient";

export const metadata = {
  title: "Users & Roles - KVJ Analytics",
  description: "Control access for CEO and assigned users.",
};

export default async function UsersPage() {
  await requireAdmin();

  const [users, roles] = await Promise.all([
    UserService.getUsers(),
    UserService.getRoles(),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <UsersRolesClient
        initialUsers={JSON.parse(JSON.stringify(users))}
        roles={JSON.parse(JSON.stringify(roles))}
      />
    </div>
  );
}
