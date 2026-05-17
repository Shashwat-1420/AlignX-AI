"use client";

import { useEffect, useMemo, useState } from "react";
import { getGoalMetrics } from "@/analytics/metrics";
import { getGoalRecommendations } from "@/ai/recommendations";
import { groupGoalsByQuarter } from "@/dashboards/goal-summary";
import { cloneDemoAudit, cloneDemoGoals, DEFAULT_DEMO_USER, DEMO_USERS } from "@/lib/demo-data";
import { GOAL_RULES, canSubmitForApproval, validateGoal } from "@/lib/goal-validation";
import { cn } from "@/lib/utils";
import { AuditEvent, DemoUser, Goal, UserRole } from "@/lib/types";
import { saveGoals } from "@/supabase/goal-service";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartNoAxesColumn, LockOpen, MessageSquare, RotateCcw, Share2, Target } from "lucide-react";

const ROLE_STORAGE_KEY = "alignx-role";

const ROLE_LABEL: Record<UserRole, string> = {
  employee: "Employee",
  manager: "Manager",
  admin: "Admin",
};

const ROLE_STYLES: Record<
  UserRole,
  { badge: string; pill: string; segment: string; glow: string; ring: string }
> = {
  employee: {
    badge: "bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/40",
    pill: "bg-blue-500 text-white shadow-sm shadow-blue-500/30",
    segment: "bg-blue-500/90 text-white shadow-sm",
    glow: "shadow-[0_0_24px_rgba(59,130,246,0.25)]",
    ring: "ring-blue-400/30",
  },
  manager: {
    badge: "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40",
    pill: "bg-amber-500 text-white shadow-sm shadow-amber-500/30",
    segment: "bg-amber-500/90 text-white shadow-sm",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.25)]",
    ring: "ring-amber-400/30",
  },
  admin: {
    badge: "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/40",
    pill: "bg-violet-500 text-white shadow-sm shadow-violet-500/30",
    segment: "bg-violet-500/90 text-white shadow-sm",
    glow: "shadow-[0_0_24px_rgba(139,92,246,0.25)]",
    ring: "ring-violet-400/30",
  },
};

function defaultUserForRole(role: UserRole): DemoUser {
  const preferredId: Record<UserRole, string> = {
    employee: "u1",
    manager: "u6",
    admin: "u8",
  };
  return DEMO_USERS.find((user) => user.id === preferredId[role]) ?? DEMO_USERS.find((user) => user.role === role)!;
}

function filterGoalsForRole(goals: Goal[], role: UserRole, user: DemoUser) {
  if (role === "admin") return goals;
  if (role === "manager") return goals.filter((goal) => goal.department === user.department);
  return goals.filter((goal) => goal.employee === user.name);
}

export function GoalPortal() {
  const [goals, setGoals] = useState<Goal[]>(() => cloneDemoGoals());
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => cloneDemoAudit());
  const [role, setRole] = useState<UserRole>("employee");
  const [activeUser, setActiveUser] = useState<DemoUser>(DEFAULT_DEMO_USER);
  const [roleReady, setRoleReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"goals" | "checkins" | "analytics">("goals");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: "", description: "", quarter: "Q1" as Goal["quarter"], weightage: 10, shared: false });

  useEffect(() => {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY);
    if (stored === "employee" || stored === "manager" || stored === "admin") {
      setRole(stored);
      setActiveUser(defaultUserForRole(stored));
    }
    setRoleReady(true);
  }, []);

  function changeRole(nextRole: UserRole) {
    setRole(nextRole);
    setActiveUser(defaultUserForRole(nextRole));
    localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    if (nextRole !== "admin") {
      setAdminUnlocked(false);
    }
  }

  const visibleGoals = useMemo(() => filterGoalsForRole(goals, role, activeUser), [goals, role, activeUser]);

  const validationGoals = useMemo(
    () => goals.filter((goal) => goal.employee === activeUser.name),
    [goals, activeUser.name]
  );

  const employeeTotalWeightage = useMemo(
    () => validationGoals.reduce((sum, goal) => sum + goal.weightage, 0),
    [validationGoals]
  );

  const metrics = useMemo(() => getGoalMetrics(goals), [goals]);
  const orgTotalWeightage = useMemo(() => goals.reduce((sum, goal) => sum + goal.weightage, 0), [goals]);
  const grouped = useMemo(() => groupGoalsByQuarter(goals), [goals]);
  const recommendation = useMemo(
    () => getGoalRecommendations(goals.length, orgTotalWeightage === GOAL_RULES.totalWeightage),
    [goals.length, orgTotalWeightage]
  );

  const roleStyle = ROLE_STYLES[role];
  const canCreate = role === "employee";
  const canSubmit = role === "employee";
  const canApprove = role === "manager";
  const canUnlock = role === "admin";

  function resetDemo() {
    if (!window.confirm("Reset all goals and activity to the demo seed?")) {
      return;
    }
    setGoals(cloneDemoGoals());
    setAuditEvents(cloneDemoAudit());
    setAdminUnlocked(false);
    setCommentDraft({});
    setFeedback("Demo data restored.");
  }

  async function onCreateGoal() {
    const validation = validateGoal({ weightage: form.weightage }, validationGoals);
    if (validation) {
      setFeedback(validation);
      return;
    }

    const next: Goal = {
      id: crypto.randomUUID(),
      employee: activeUser.name,
      title: form.title.trim(),
      description: form.description.trim(),
      quarter: form.quarter,
      weightage: form.weightage,
      progress: 0,
      shared: form.shared,
      status: "draft",
      checkInNotes: "",
      locked: false,
      department: activeUser.department,
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
    const message = canSubmitForApproval(validationGoals);
    if (message) {
      setFeedback(message);
      return;
    }

    setGoals((prev) =>
      prev.map((goal) =>
        goal.employee === activeUser.name && goal.status === "draft"
          ? { ...goal, status: "submitted" as const, locked: true }
          : goal
      )
    );
    setFeedback("Goals submitted to manager for approval.");
  }

  function managerAction(id: string, action: "approved" | "rejected") {
    setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, status: action, locked: action === "approved" } : goal)));
    setFeedback(`Goal ${action}.`);
  }

  function addManagerComment(goalId: string) {
    const text = commentDraft[goalId]?.trim();
    if (!text) return;

    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              managerComments: [
                ...goal.managerComments,
                { id: crypto.randomUUID(), author: activeUser.name, text, createdAt: new Date().toISOString() },
              ],
            }
          : goal
      )
    );
    setCommentDraft((prev) => ({ ...prev, [goalId]: "" }));
    setFeedback("Comment added.");
  }

  function updateProgress(id: string, progress: number, checkInNotes: string) {
    setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, progress, checkInNotes } : goal)));
  }

  const statusClass: Record<Goal["status"], string> = {
    draft: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    submitted: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  };

  return (
    <div
      className={cn(
        "mx-auto max-w-7xl space-y-6 p-4 md:p-8",
        roleReady && cn("rounded-2xl ring-1 transition-shadow duration-500", roleStyle.ring, roleStyle.glow)
      )}
    >
      <header
        className={cn(
          "flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-lg md:flex-row md:items-start md:justify-between",
          roleReady && "ring-1 ring-inset",
          roleReady && roleStyle.ring
        )}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                roleStyle.badge
              )}
            >
              {ROLE_LABEL[role]} · {activeUser.name} · {activeUser.department}
            </span>
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">AlignX Goal Setting & Tracking</h1>
          <p className="text-sm text-indigo-100">Enterprise quarterly planning, approvals, and analytics in one portal.</p>

          <div
            className="inline-flex rounded-lg bg-black/20 p-1 ring-1 ring-white/20"
            role="group"
            aria-label="Role switcher"
          >
            {(["employee", "manager", "admin"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeRole(option)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-all duration-200",
                  role === option ? roleStyle.segment : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <Button variant="secondary" size="sm" onClick={resetDemo}>
            <RotateCcw className="mr-2 size-4" />
            Reset demo
          </Button>
          {canUnlock && (
            <Button variant="secondary" size="sm" onClick={() => setAdminUnlocked((prev) => !prev)}>
              <LockOpen className="mr-2 size-4" />
              {adminUnlocked ? "Lock goals" : "Admin unlock"}
            </Button>
          )}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="transition-transform duration-300 hover:-translate-y-1">
          <Target className="mb-2 size-4 text-indigo-500" />
          <p className="text-sm text-slate-500">Total Goals (org)</p>
          <p className="text-2xl font-semibold">{metrics.total}</p>
        </Card>
        <Card className="transition-transform duration-300 hover:-translate-y-1">
          <ChartNoAxesColumn className="mb-2 size-4 text-emerald-500" />
          <p className="text-sm text-slate-500">Avg Progress (org)</p>
          <p className="text-2xl font-semibold">{metrics.avgProgress}%</p>
        </Card>
        <Card className="transition-transform duration-300 hover:-translate-y-1">
          <Share2 className="mb-2 size-4 text-violet-500" />
          <p className="text-sm text-slate-500">Shared Goals (org)</p>
          <p className="text-2xl font-semibold">{metrics.shared}</p>
        </Card>
        <Card className={cn("transition-transform duration-300 hover:-translate-y-1", roleReady && "ring-1", roleReady && roleStyle.ring)}>
          <p className="text-sm text-slate-500">Org weightage</p>
          <p className="text-2xl font-semibold">
            {orgTotalWeightage}% / {GOAL_RULES.totalWeightage}%
          </p>
          <Progress value={Math.min(100, (orgTotalWeightage / GOAL_RULES.totalWeightage) * 100)} />
          {role === "employee" && (
            <p className="mt-2 text-xs text-slate-400">
              Your plan: {employeeTotalWeightage}% / {GOAL_RULES.totalWeightage}%
            </p>
          )}
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        {(["goals", "checkins", "analytics"] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className={cn(activeTab === tab && roleReady && roleStyle.pill)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {feedback && (
        <p className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
          {feedback}
        </p>
      )}

      {activeTab === "goals" && (
        <section className={cn("grid gap-4", canCreate && canApprove ? "lg:grid-cols-2" : "")}>
          {canCreate && (
            <Card className={cn(roleReady && "ring-1", roleReady && roleStyle.ring)}>
              <h2 className="mb-4 text-lg font-semibold">Create Employee Goal</h2>
              <div className="space-y-3">
                <input
                  className="w-full rounded-md border border-slate-300 bg-transparent p-2 dark:border-slate-700"
                  placeholder="Goal title"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                />
                <textarea
                  className="w-full rounded-md border border-slate-300 bg-transparent p-2 dark:border-slate-700"
                  placeholder="Goal description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <select
                    className="rounded-md border border-slate-300 bg-transparent p-2 dark:border-slate-700"
                    value={form.quarter}
                    onChange={(event) => setForm((prev) => ({ ...prev, quarter: event.target.value as Goal["quarter"] }))}
                  >
                    <option>Q1</option>
                    <option>Q2</option>
                    <option>Q3</option>
                    <option>Q4</option>
                  </select>
                  <input
                    type="number"
                    className="rounded-md border border-slate-300 bg-transparent p-2 dark:border-slate-700"
                    min={GOAL_RULES.minWeightage}
                    max={100}
                    value={form.weightage}
                    onChange={(event) => setForm((prev) => ({ ...prev, weightage: Number(event.target.value) }))}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.shared}
                      onChange={(event) => setForm((prev) => ({ ...prev, shared: event.target.checked }))}
                    />
                    Shared goal
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={onCreateGoal} className={cn(roleReady && roleStyle.pill)}>
                    Create goal
                  </Button>
                  {canSubmit && (
                    <Button variant="secondary" onClick={submitForApproval}>
                      Submit for manager approval
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Your plan: {employeeTotalWeightage}% / {GOAL_RULES.totalWeightage}% · Rules: min {GOAL_RULES.minWeightage}% per
                  goal, max {GOAL_RULES.maxGoals} goals per employee.
                </p>
              </div>
            </Card>
          )}

          {canApprove && (
            <Card className={cn(roleReady && "ring-1", roleReady && roleStyle.ring)}>
              <h2 className="mb-4 text-lg font-semibold">Manager Approval · {activeUser.department}</h2>
              <div className="space-y-3">
                {visibleGoals.length === 0 && (
                  <p className="text-sm text-slate-500">No goals in your department queue.</p>
                )}
                {visibleGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className={cn(
                      "rounded-lg border border-slate-200 p-3 dark:border-slate-800",
                      roleReady && "border-l-4",
                      roleReady && (role === "manager" ? "border-l-amber-500" : "")
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-medium">{goal.title}</p>
                      <Badge className={statusClass[goal.status]}>{goal.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{goal.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {goal.employee} · {goal.department}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">{goal.quarter}</Badge>
                      <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">{goal.weightage}%</Badge>
                      {goal.shared && (
                        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Shared</Badge>
                      )}
                      <Button size="sm" variant="outline" disabled={goal.status !== "submitted"} onClick={() => managerAction(goal.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" disabled={goal.status !== "submitted"} onClick={() => managerAction(goal.id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                    {goal.managerComments.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800">
                        {goal.managerComments.map((comment) => (
                          <li key={comment.id}>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{comment.author}:</span> {comment.text}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex gap-2">
                      <input
                        className="flex-1 rounded-md border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-700"
                        placeholder="Add manager comment"
                        value={commentDraft[goal.id] ?? ""}
                        onChange={(event) => setCommentDraft((prev) => ({ ...prev, [goal.id]: event.target.value }))}
                      />
                      <Button size="sm" variant="outline" onClick={() => addManagerComment(goal.id)}>
                        <MessageSquare className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {role === "admin" && (
            <Card className={cn("lg:col-span-2", roleReady && "ring-1", roleReady && roleStyle.ring)}>
              <h2 className="mb-4 text-lg font-semibold">Organization Goals</h2>
              <p className="mb-3 text-sm text-slate-500">
                Viewing all {visibleGoals.length} goals across departments. Use Admin unlock to edit locked check-ins.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {visibleGoals.slice(0, 8).map((goal) => (
                  <div key={goal.id} className="rounded-lg border border-slate-200 p-3 border-l-4 border-l-violet-500 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{goal.title}</p>
                      <Badge className={statusClass[goal.status]}>{goal.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {goal.employee} · {goal.department} · {goal.quarter}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {role === "employee" && (
            <Card className={cn(canCreate ? "" : "lg:col-span-2", roleReady && "ring-1", roleReady && roleStyle.ring)}>
              <h2 className="mb-4 text-lg font-semibold">My Goals</h2>
              <div className="space-y-3">
                {visibleGoals.length === 0 && <p className="text-sm text-slate-500">No goals yet. Create your first goal above.</p>}
                {visibleGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className={cn(
                      "rounded-lg border border-slate-200 p-3 dark:border-slate-800",
                      roleReady && "border-l-4 border-l-blue-500"
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-medium">{goal.title}</p>
                      <Badge className={statusClass[goal.status]}>{goal.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{goal.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">{goal.quarter}</Badge>
                      <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">{goal.progress}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      )}

      {activeTab === "checkins" && (
        <Card className={cn(roleReady && "ring-1", roleReady && roleStyle.ring)}>
          <h2 className="mb-4 text-lg font-semibold">
            Quarterly Check-ins
            {role === "manager" && <span className="ml-2 text-sm font-normal text-slate-500">(read-only)</span>}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {visibleGoals.length === 0 && <p className="text-sm text-slate-500 col-span-2">No goals in this view.</p>}
            {visibleGoals.map((goal) => {
              const locked = goal.locked && !(canUnlock && adminUnlocked);
              const readOnly = role === "manager" || (role === "admin" && !adminUnlocked);
              const disabled = locked || readOnly;

              return (
                <div
                  key={goal.id}
                  className={cn(
                    "rounded-lg border border-slate-200 p-4 dark:border-slate-800",
                    roleReady && "border-l-4",
                    role === "employee" && "border-l-blue-500",
                    role === "manager" && "border-l-amber-500",
                    role === "admin" && "border-l-violet-500"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">{goal.title}</p>
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">{goal.quarter}</Badge>
                  </div>
                  <p className="mb-2 text-xs text-slate-400">{goal.employee}</p>
                  <Progress value={goal.progress} />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={goal.progress}
                    disabled={disabled}
                    onChange={(event) => updateProgress(goal.id, Number(event.target.value), goal.checkInNotes)}
                    className="mt-3 w-full disabled:opacity-50"
                  />
                  <textarea
                    className="mt-2 w-full rounded-md border border-slate-300 bg-transparent p-2 text-sm disabled:opacity-50 dark:border-slate-700"
                    placeholder="Quarterly notes"
                    value={goal.checkInNotes}
                    disabled={disabled}
                    onChange={(event) => updateProgress(goal.id, goal.progress, event.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activeTab === "analytics" && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Analytics Dashboard (organization)</h2>
            <p className="mb-2 text-sm text-slate-500">AI insight: {recommendation}</p>
            <p className="mb-4 text-xs text-slate-400">{auditEvents.length} demo activity events seeded (timeline in upcoming sprint).</p>
            <p className="mb-4 text-xs text-slate-400">
              Showing {visibleGoals.length} goal{visibleGoals.length === 1 ? "" : "s"} in your {role} view · {metrics.total} org-wide.
            </p>
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
              {visibleGoals
                .filter((goal) => goal.shared)
                .map((goal) => (
                  <div key={goal.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium">{goal.title}</p>
                    <p className="text-sm text-slate-500">{goal.description}</p>
                    <p className="mt-1 text-xs text-slate-400">{goal.employee} · {goal.department}</p>
                  </div>
                ))}
              {!visibleGoals.some((goal) => goal.shared) && (
                <p className="text-sm text-slate-500">No shared goals in this view.</p>
              )}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
