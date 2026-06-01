import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/layout/stat-card";
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
  const adminCount = accounts.filter((account) => account.role === "admin" || account.role === "superadmin").length;

  return (
    <AppShell title="Admin Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Accounts" value={accounts.length} accent="indigo" />
        <StatCard title="Teachers" value={teacherCount} accent="violet" />
        <StatCard title="Students" value={studentCount} accent="sky" />
        <StatCard title="Subjects" value={subjectsCount} accent="emerald" />
      </div>
      <Card className="mt-6">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Admin accounts: {adminCount}</p>
          <p className="text-sm text-muted-foreground">Manage user roles and permissions from accounts management.</p>
          <Link to="/superadmin/accounts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Go to Accounts Management
          </Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}
