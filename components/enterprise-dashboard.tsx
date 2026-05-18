"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getGoalMetrics } from "@/analytics/metrics";
import { cn } from "@/lib/utils";
import { AuditEvent, DemoUser, Goal, GoalStatus, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

const STATUS_COLORS: Record<GoalStatus, string> = {
  draft: "#94a3b8",
  submitted: "#f59e0b",
  approved: "#10b981",
  rejected: "#f43f5e",
};

const STATUS_LABEL: Record<GoalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

interface EnterpriseDashboardProps {
  goals: Goal[];
  visibleGoals: Goal[];
  auditEvents: AuditEvent[];
  role: UserRole;
  activeUser: DemoUser;
  roleAccent?: string;
  onGoToGoals?: () => void;
}

function useIsDark() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

function buildExecutiveSummary(goals: Goal[]) {
  const metrics = getGoalMetrics(goals);
  const salesGoals = goals.filter((g) => g.department === "Sales");
  const salesAvg = salesGoals.length
    ? Math.round(salesGoals.reduce((s, g) => s + g.progress, 0) / salesGoals.length)
    : 0;
  const orgAvg = metrics.avgProgress;

  const deptAvgs = Array.from(
    goals.reduce((map, goal) => {
      const list = map.get(goal.department) ?? [];
      list.push(goal.progress);
      map.set(goal.department, list);
      return map;
    }, new Map<string, number[]>())
  ).map(([department, values]) => ({
    department,
    avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  }));

  const topDept = deptAvgs.sort((a, b) => b.avg - a.avg)[0];

  const bullets: string[] = [
    `${metrics.avgProgress}% quarterly completion achieved organization-wide`,
    `${metrics.atRisk} goal${metrics.atRisk === 1 ? "" : "s"} at risk requiring attention`,
  ];

  if (topDept && topDept.avg >= orgAvg) {
    bullets.push(`${topDept.department} outperforming with ${topDept.avg}% average progress`);
  } else if (salesAvg >= 45) {
    bullets.push(`Sales tracking at ${salesAvg}% progress against regional targets`);
  } else {
    bullets.push(`Focus recommended on departments below ${orgAvg}% completion`);
  }

  bullets.push(
    `${metrics.pendingApprovals} pending approval${metrics.pendingApprovals === 1 ? "" : "s"} in manager queues`
  );

  return bullets.slice(0, 4);
}

function formatAuditTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function EnterpriseDashboard({
  goals,
  visibleGoals,
  auditEvents,
  role,
  activeUser,
  roleAccent = "ring-indigo-400/30",
  onGoToGoals,
}: EnterpriseDashboardProps) {
  const isDark = useIsDark();
  const metrics = useMemo(() => getGoalMetrics(goals), [goals]);
  const summary = useMemo(() => buildExecutiveSummary(goals), [goals]);

  const chartTheme = {
    grid: isDark ? "#334155" : "#e2e8f0",
    axis: isDark ? "#94a3b8" : "#64748b",
    tooltipBg: isDark ? "#1e293b" : "#ffffff",
    tooltipBorder: isDark ? "#475569" : "#e2e8f0",
    bar: isDark ? "#818cf8" : "#6366f1",
  };

  const quarterlyData = useMemo(
    () =>
      QUARTERS.map((quarter) => {
        const quarterGoals = goals.filter((g) => g.quarter === quarter);
        const progress = quarterGoals.length
          ? Math.round(quarterGoals.reduce((s, g) => s + g.progress, 0) / quarterGoals.length)
          : 0;
        return { quarter, progress, goals: quarterGoals.length };
      }),
    [goals]
  );

  const statusData = useMemo(() => {
    const statuses: GoalStatus[] = ["draft", "submitted", "approved", "rejected"];
    return statuses
      .map((status) => ({
        name: STATUS_LABEL[status],
        value: goals.filter((g) => g.status === status).length,
        status,
      }))
      .filter((item) => item.value > 0);
  }, [goals]);

  const teamData = useMemo(() => {
    const map = new Map<string, { total: number; sum: number }>();
    goals.forEach((goal) => {
      const entry = map.get(goal.department) ?? { total: 0, sum: 0 };
      entry.total += 1;
      entry.sum += goal.progress;
      map.set(goal.department, entry);
    });
    return Array.from(map.entries())
      .map(([department, { total, sum }]) => ({
        department,
        progress: Math.round(sum / total),
        goals: total,
      }))
      .sort((a, b) => b.progress - a.progress);
  }, [goals]);

  const pendingGoals = useMemo(() => {
    const pool = role === "admin" ? goals : visibleGoals;
    return pool.filter((g) => g.status === "submitted").slice(0, 5);
  }, [goals, visibleGoals, role]);

  const riskCounts = useMemo(
    () => ({
      high: goals.filter((g) => g.riskLevel === "high").length,
      medium: goals.filter((g) => g.riskLevel === "medium").length,
      low: goals.filter((g) => g.riskLevel === "low").length,
    }),
    [goals]
  );

  const timeline = useMemo(() => auditEvents.slice(0, 6), [auditEvents]);

  const scopeLabel =
    role === "admin" ? "Organization" : role === "manager" ? activeUser.department : activeUser.name;

  return (
    <div className="space-y-6">
      <Card
        className={cn(
          "overflow-hidden border-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-6 text-white shadow-lg",
          roleAccent
        )}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-indigo-100">
              <Sparkles className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">AI Executive Summary</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Leadership insights · {scopeLabel}</h2>
            <ul className="mt-4 space-y-2">
              {summary.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-indigo-50">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-300" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
            <p className="text-3xl font-bold">{metrics.avgProgress}%</p>
            <p className="text-xs text-indigo-100">Org completion</p>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Goals", value: metrics.total, icon: Target, tone: "text-indigo-500" },
          { label: "Avg Progress", value: `${metrics.avgProgress}%`, icon: TrendingUp, tone: "text-emerald-500" },
          { label: "Pending Approvals", value: metrics.pendingApprovals, icon: Clock, tone: "text-amber-500" },
          { label: "At Risk", value: metrics.atRisk, icon: AlertTriangle, tone: "text-rose-500" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className="group border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:from-slate-900 dark:to-slate-950"
            >
              <Icon className={cn("mb-3 size-5", kpi.tone)} />
              <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{kpi.value}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-200/80 p-5 dark:border-slate-800 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 className="size-4 text-indigo-500" />
                Quarterly completion
              </h3>
              <p className="text-xs text-slate-500">Average progress by fiscal quarter</p>
            </div>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={quarterlyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="quarter" tick={{ fill: chartTheme.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: chartTheme.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value ?? 0}%`, "Progress"]}
                />
                <Bar dataKey="progress" fill={chartTheme.bar} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-slate-200/80 p-5 dark:border-slate-800">
          <h3 className="mb-1 text-base font-semibold">Status distribution</h3>
          <p className="mb-4 text-xs text-slate-500">Goal pipeline health</p>
          <div className="h-52 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {statusData.map((item) => (
              <span key={item.status} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] }} />
                {item.name} ({item.value})
              </span>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-200/80 p-5 dark:border-slate-800 lg:col-span-2">
          <h3 className="mb-1 flex items-center gap-2 text-base font-semibold">
            <Users className="size-4 text-violet-500" />
            Team performance
          </h3>
          <p className="mb-4 text-xs text-slate-500">Average progress by department</p>
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={teamData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: chartTheme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="department"
                  width={88}
                  tick={{ fill: chartTheme.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartTheme.tooltipBg,
                    borderColor: chartTheme.tooltipBorder,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value, _name, item) => [
                    `${value ?? 0}% · ${(item?.payload as { goals?: number })?.goals ?? 0} goals`,
                    "Progress",
                  ]}
                />
                <Bar dataKey="progress" fill={isDark ? "#a78bfa" : "#8b5cf6"} radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-slate-200/80 p-5 dark:border-slate-800">
          <h3 className="mb-4 text-base font-semibold">Risk indicators</h3>
          <div className="space-y-3">
            {[
              { label: "High risk", count: riskCounts.high, className: "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40", dot: "bg-rose-500" },
              { label: "Medium risk", count: riskCounts.medium, className: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40", dot: "bg-amber-500" },
              { label: "Low risk", count: riskCounts.low, className: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40", dot: "bg-emerald-500" },
            ].map((risk) => (
              <div
                key={risk.label}
                className={cn("flex items-center justify-between rounded-lg border px-3 py-2.5", risk.className)}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className={cn("size-2 rounded-full", risk.dot)} />
                  {risk.label}
                </span>
                <span className="text-lg font-semibold">{risk.count}</span>
              </div>
            ))}
            {metrics.overdue > 0 && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{metrics.overdue} overdue below 50% progress</p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200/80 p-5 dark:border-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <CheckCircle2 className="size-4 text-amber-500" />
                Pending approvals
              </h3>
              <p className="text-xs text-slate-500">
                {role === "manager" ? `${activeUser.department} queue` : "Organization-wide"}
              </p>
            </div>
            {onGoToGoals && pendingGoals.length > 0 && (
              <Button size="sm" variant="outline" onClick={onGoToGoals}>
                Review all
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {pendingGoals.length === 0 && (
              <p className="text-sm text-slate-500">No goals awaiting approval.</p>
            )}
            {pendingGoals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <p className="text-sm font-medium">{goal.title}</p>
                <p className="text-xs text-slate-500">
                  {goal.employee} · {goal.quarter} · {goal.progress}%
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-slate-200/80 p-5 dark:border-slate-800">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Activity className="size-4 text-indigo-500" />
            Recent activity
          </h3>
          <div className="relative space-y-0">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-200 dark:bg-slate-700" />
            {timeline.map((event) => (
              <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                <span className="relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-white bg-indigo-500 dark:border-slate-900" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{event.details}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {event.actor} · {event.role} · {formatAuditTime(event.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
