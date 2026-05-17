"use client";

import { useMemo, useState } from "react";
import { getGoalMetrics } from "@/analytics/metrics";
import { getGoalRecommendations } from "@/ai/recommendations";
import { groupGoalsByQuarter } from "@/dashboards/goal-summary";
import { cloneDemoAudit, cloneDemoGoals, DEFAULT_DEMO_USER } from "@/lib/demo-data";
import { GOAL_RULES, canSubmitForApproval, validateGoal } from "@/lib/goal-validation";
import { AuditEvent, Goal } from "@/lib/types";
import { saveGoals } from "@/supabase/goal-service";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartNoAxesColumn, LockOpen, RotateCcw, Share2, Target } from "lucide-react";

const ACTIVE_EMPLOYEE = DEFAULT_DEMO_USER.name;

const statusClass: Record<Goal["status"], string> = {
  draft: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

export function GoalPortal() {
  const [goals, setGoals] = useState<Goal[]>(() => cloneDemoGoals());
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => cloneDemoAudit());
  const [activeTab, setActiveTab] = useState<"goals" | "checkins" | "analytics">("goals");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", quarter: "Q1" as Goal["quarter"], weightage: 10, shared: false });

  const activeEmployeeGoals = useMemo(
    () => goals.filter((goal) => goal.employee === ACTIVE_EMPLOYEE),
    [goals]
  );

  const employeeTotalWeightage = useMemo(
    () => activeEmployeeGoals.reduce((sum, goal) => sum + goal.weightage, 0),
    [activeEmployeeGoals]
  );

  const metrics = useMemo(() => getGoalMetrics(goals), [goals]);
  const orgTotalWeightage = useMemo(() => goals.reduce((sum, goal) => sum + goal.weightage, 0), [goals]);
  const grouped = useMemo(() => groupGoalsByQuarter(goals), [goals]);
  const recommendation = useMemo(
    () => getGoalRecommendations(goals.length, orgTotalWeightage === GOAL_RULES.totalWeightage),
    [goals.length, orgTotalWeightage]
  );

  function resetDemo() {
    if (!window.confirm("Reset all goals and activity to the demo seed?")) {
      return;
    }
    setGoals(cloneDemoGoals());
    setAuditEvents(cloneDemoAudit());
    setAdminUnlocked(false);
    setFeedback("Demo data restored.");
  }

  async function onCreateGoal() {
    const validation = validateGoal({ weightage: form.weightage }, activeEmployeeGoals);
    if (validation) {
      setFeedback(validation);
      return;
    }

    const next: Goal = {
      id: crypto.randomUUID(),
      employee: ACTIVE_EMPLOYEE,
      title: form.title.trim(),
      description: form.description.trim(),
      quarter: form.quarter,
      weightage: form.weightage,
      progress: 0,
      shared: form.shared,
      status: "draft",
      checkInNotes: "",
      locked: false,
      department: DEFAULT_DEMO_USER.department,
      riskLevel: "medium",
      dueDate: "2026-06-30",
      managerComments: [],
    };

    if (!next.title || !next.description) {
      setFeedback("Title and description are required.");
      return;
    }

    const nextGoals = [...goals, next];
    setGoals(nextGoals);
    setForm({ title: "", description: "", quarter: "Q1", weightage: 10, shared: false });
    setFeedback((await saveGoals(nextGoals)).message);
  }

  function submitForApproval() {
    const message = canSubmitForApproval(activeEmployeeGoals);
    if (message) {
      setFeedback(message);
      return;
    }

    setGoals((prev) =>
      prev.map((goal) =>
        goal.employee === ACTIVE_EMPLOYEE && goal.status === "draft"
          ? { ...goal, status: "submitted" as const, locked: true }
          : goal
      )
    );
    setFeedback("Goals submitted to manager for approval.");
  }

  function managerAction(id: string, action: "approved" | "rejected") {
    setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, status: action, locked: action === "approved" } : goal)));
  }

  function updateProgress(id: string, progress: number, checkInNotes: string) {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, progress, checkInNotes } : goal))
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-lg md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">AlignX Goal Setting & Tracking</h1>
          <p className="text-sm text-indigo-100">Enterprise quarterly planning, approvals, and analytics in one portal.</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="secondary" size="sm" onClick={resetDemo}>
            <RotateCcw className="mr-2 size-4" />
            Reset demo
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAdminUnlocked((prev) => !prev)}>
            <LockOpen className="mr-2 size-4" />
            {adminUnlocked ? "Lock" : "Admin unlock"}
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="transition-transform duration-300 hover:-translate-y-1">
          <Target className="mb-2 size-4 text-indigo-500" />
          <p className="text-sm text-slate-500">Total Goals</p>
          <p className="text-2xl font-semibold">{metrics.total}</p>
        </Card>
        <Card className="transition-transform duration-300 hover:-translate-y-1">
          <ChartNoAxesColumn className="mb-2 size-4 text-emerald-500" />
          <p className="text-sm text-slate-500">Avg Progress</p>
          <p className="text-2xl font-semibold">{metrics.avgProgress}%</p>
        </Card>
        <Card className="transition-transform duration-300 hover:-translate-y-1">
          <Share2 className="mb-2 size-4 text-violet-500" />
          <p className="text-sm text-slate-500">Shared Goals</p>
          <p className="text-2xl font-semibold">{metrics.shared}</p>
        </Card>
        <Card className="transition-transform duration-300 hover:-translate-y-1">
          <p className="text-sm text-slate-500">Org weightage</p>
          <p className="text-2xl font-semibold">{orgTotalWeightage}% / {GOAL_RULES.totalWeightage}%</p>
          <Progress value={Math.min(100, (orgTotalWeightage / GOAL_RULES.totalWeightage) * 100)} />
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        {(["goals", "checkins", "analytics"] as const).map((tab) => (
          <Button key={tab} variant={activeTab === tab ? "default" : "outline"} size="sm" onClick={() => setActiveTab(tab)}>
            {tab}
          </Button>
        ))}
      </div>

      {feedback && <p className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">{feedback}</p>}

      {activeTab === "goals" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Create Employee Goal</h2>
            <div className="space-y-3">
              <input className="w-full rounded-md border border-slate-300 bg-transparent p-2" placeholder="Goal title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              <textarea className="w-full rounded-md border border-slate-300 bg-transparent p-2" placeholder="Goal description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-3">
                <select className="rounded-md border border-slate-300 bg-transparent p-2" value={form.quarter} onChange={(event) => setForm((prev) => ({ ...prev, quarter: event.target.value as Goal["quarter"] }))}>
                  <option>Q1</option>
                  <option>Q2</option>
                  <option>Q3</option>
                  <option>Q4</option>
                </select>
                <input type="number" className="rounded-md border border-slate-300 bg-transparent p-2" min={GOAL_RULES.minWeightage} max={100} value={form.weightage} onChange={(event) => setForm((prev) => ({ ...prev, weightage: Number(event.target.value) }))} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.shared} onChange={(event) => setForm((prev) => ({ ...prev, shared: event.target.checked }))} />
                  Shared goal
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onCreateGoal}>Create goal</Button>
                <Button variant="secondary" onClick={submitForApproval}>Submit for manager approval</Button>
              </div>
              <p className="text-xs text-slate-500">
                Your plan: {employeeTotalWeightage}% / {GOAL_RULES.totalWeightage}% · Rules: min {GOAL_RULES.minWeightage}% per goal, max {GOAL_RULES.maxGoals} goals per employee.
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Manager Approval Workflow</h2>
            <div className="space-y-3">
              {goals.map((goal) => (
                <div key={goal.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{goal.title}</p>
                    <Badge className={statusClass[goal.status]}>{goal.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{goal.description}</p>
                  <p className="mt-1 text-xs text-slate-400">{goal.employee} · {goal.department}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">{goal.quarter}</Badge>
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">{goal.weightage}%</Badge>
                    {goal.shared && <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Shared</Badge>}
                    <Button size="sm" variant="outline" disabled={goal.status !== "submitted"} onClick={() => managerAction(goal.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="destructive" disabled={goal.status !== "submitted"} onClick={() => managerAction(goal.id, "rejected")}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {activeTab === "checkins" && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Quarterly Check-ins</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{goal.title}</p>
                  <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">{goal.quarter}</Badge>
                </div>
                <Progress value={goal.progress} />
                <input type="range" min={0} max={100} value={goal.progress} disabled={goal.locked && !adminUnlocked} onChange={(event) => updateProgress(goal.id, Number(event.target.value), goal.checkInNotes)} className="mt-3 w-full" />
                <textarea className="mt-2 w-full rounded-md border border-slate-300 bg-transparent p-2 text-sm" placeholder="Quarterly notes" value={goal.checkInNotes} disabled={goal.locked && !adminUnlocked} onChange={(event) => updateProgress(goal.id, goal.progress, event.target.value)} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "analytics" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Analytics Dashboard</h2>
            <p className="mb-2 text-sm text-slate-500">AI insight: {recommendation}</p>
            <p className="mb-4 text-xs text-slate-400">{auditEvents.length} demo activity events seeded (timeline in upcoming sprint).</p>
            <div className="space-y-3">
              {Object.entries(grouped).map(([quarter, quarterGoals]) => {
                const quarterProgress = Math.round(quarterGoals.reduce((sum, item) => sum + item.progress, 0) / quarterGoals.length);
                return (
                  <div key={quarter}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{quarter}</span>
                      <span>{quarterProgress}%</span>
                    </div>
                    <Progress value={quarterProgress} />
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Shared Goals</h2>
            <div className="space-y-3">
              {goals.filter((goal) => goal.shared).map((goal) => (
                <div key={goal.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="font-medium">{goal.title}</p>
                  <p className="text-sm text-slate-500">{goal.description}</p>
                </div>
              ))}
              {!goals.some((goal) => goal.shared) && <p className="text-sm text-slate-500">No shared goals created yet.</p>}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
