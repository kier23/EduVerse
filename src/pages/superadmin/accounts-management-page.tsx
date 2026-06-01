import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListItemCard } from "@/components/layout/list-item-card";
import { AppShell } from "@/layouts/app-shell";
import { fetchAllAccounts, updateAccountRole, type AccountRecord } from "@/lib/api/eduverse";
import type { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";

export function AccountsManagementPage() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const loadAccounts = async () => {
    const rows = await fetchAllAccounts();
    setAccounts(rows);
    setDraftRoles(
      rows.reduce<Record<string, UserRole>>((acc, row) => {
        acc[row.id] =
          row.role === "teacher" || row.role === "admin" || row.role === "superadmin" ? row.role : "student";
        return acc;
      }, {}),
    );
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setStatus("Updating role...");
    await updateAccountRole(userId, role);
    setStatus("Role updated.");
    await loadAccounts();
  };

  return (
    <AppShell title="Accounts Management">
      <Card>
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <ListItemCard key={account.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{account.full_name ?? "Unnamed User"}</p>
                      <Badge variant="outline" className="capitalize">{account.role ?? "student"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{account.email ?? "No email"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className={cn(
                        "h-10 rounded-xl border border-indigo-100 bg-white/80 px-3 text-sm shadow-sm backdrop-blur-sm",
                        "focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/30",
                      )}
                      value={draftRoles[account.id] ?? "student"}
                      onChange={(event) =>
                        setDraftRoles((previous) => ({ ...previous, [account.id]: event.target.value as UserRole }))
                      }
                    >
                      <option value="student">student</option>
                      <option value="teacher">teacher</option>
                      <option value="admin">admin</option>
                      <option value="superadmin">superadmin</option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRoleChange(account.id, draftRoles[account.id] ?? "student")}
                    >
                      Save
                    </Button>
                  </div>
                </ListItemCard>
              ))}
            </div>
          )}
          {status ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{status}</p> : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
