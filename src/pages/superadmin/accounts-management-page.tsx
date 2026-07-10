import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ListItemCard } from "@/components/layout/list-item-card";
import { AppShell } from "@/layouts/app-shell";
import {
  fetchAllAccounts,
  deleteAccount,
  type AccountRecord,
} from "@/lib/api/eduverse";

export function AccountsManagementPage() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<AccountRecord | null>(
    null,
  );

  const loadAccounts = async () => {
    const rows = await fetchAllAccounts();
    setAccounts(rows);
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;

    const run = async () => {
      const rows = await fetchAllAccounts();
      if (ignore) return;
      setAccounts(rows);
      setLoading(false);
    };

    run();

    return () => {
      ignore = true;
    };
  }, []);

  const handleDelete = async (account: AccountRecord) => {
    setDeletingId(account.id);
    setStatus("");
    try {
      await deleteAccount(account.id);
      setStatus(`${account.full_name ?? "Account"} was deleted.`);
      await loadAccounts();
    } catch (caught) {
      setStatus(
        caught instanceof Error
          ? `Failed to delete account: ${caught.message}`
          : "Failed to delete account.",
      );
    } finally {
      setDeletingId(null);
      setConfirmTarget(null);
    }
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
                <ListItemCard
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {account.full_name ?? "Unnamed User"}
                      </p>
                      <Badge variant="outline" className="capitalize">
                        {account.role ?? "student"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {account.email ?? "No email"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deletingId === account.id}
                    onClick={() => setConfirmTarget(account)}
                  >
                    {deletingId === account.id
                      ? "Deleting..."
                      : "Delete account"}
                  </Button>
                </ListItemCard>
              ))}
            </div>
          )}
          {status ? (
            <p className="mt-4 rounded-xl bg-emerald-400/10 px-4 py-2 text-sm text-emerald-700">
              {status}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this account?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {confirmTarget?.full_name ?? "this account"}
              </span>
              {confirmTarget?.email ? ` (${confirmTarget.email})` : ""}. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => confirmTarget && handleDelete(confirmTarget)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
