import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/layouts/app-shell";
import { fetchAllAccounts, updateAccountRole, type AccountRecord } from "@/lib/api/eduverse";
import type { UserRole } from "@/types/auth";

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
        acc[row.id] = row.role === "teacher" || row.role === "superadmin" ? row.role : "student";
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
        <CardHeader><CardTitle>User Accounts</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
                  <div>
                    <p className="font-medium">{account.full_name ?? "Unnamed User"}</p>
                    <p className="text-xs text-muted-foreground">{account.email ?? "No email"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="h-9 rounded-md border bg-transparent px-3 text-sm"
                      value={draftRoles[account.id] ?? "student"}
                      onChange={(event) =>
                        setDraftRoles((previous) => ({ ...previous, [account.id]: event.target.value as UserRole }))
                      }
                    >
                      <option value="student">student</option>
                      <option value="teacher">teacher</option>
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
                </div>
              ))}
            </div>
          )}
          {status ? <p className="mt-3 text-sm text-muted-foreground">{status}</p> : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
