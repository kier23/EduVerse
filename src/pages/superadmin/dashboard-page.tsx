import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/layouts/app-shell";
import { fetchAllAccounts, fetchStudentSubjects, type AccountRecord } from "@/lib/api/eduverse";
import { cn } from "@/lib/utils";

export function SuperadminDashboardPage() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [subjectsCount, setSubjectsCount] = useState(0);

  useEffect(() => {
    fetchAllAccounts().then(setAccounts);
    fetchStudentSubjects().then((rows) => setSubjectsCount(rows.length));
  }, []);

  const teacherCount = accounts.filter((account) => account.role === "teacher").length;
  const studentCount = accounts.filter((account) => account.role === "student").length;
  const superadminCount = accounts.filter((account) => account.role === "superadmin").length;

  return (
    <AppShell title="Superadmin Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><CardTitle>Total Accounts</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{accounts.length}</CardContent></Card>
        <Card><CardHeader><CardTitle>Teachers</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{teacherCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>Students</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{studentCount}</CardContent></Card>
        <Card><CardHeader><CardTitle>Subjects</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{subjectsCount}</CardContent></Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>System Overview</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Superadmin accounts: {superadminCount}</p>
          <p>Use Accounts Management to update user roles.</p>
          <Link to="/superadmin/accounts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Go to Accounts Management
          </Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}
