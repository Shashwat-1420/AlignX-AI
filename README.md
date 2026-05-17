# AlignX-AI — Goal Setting & Tracking Portal

This repository currently contains a functional **MVP web portal** for employee goal planning, manager approval, quarterly tracking, and lightweight AI-driven guidance.

This README documents:
- what has been completed so far,
- how the current solution has been built,
- what is still left,
- and how the current implementation can be enhanced functionally.

---

## 1) Current Project Status (What Has Been Done Till Now)

### Repository initialization and setup
- Next.js App Router project structure is set up and running.
- TypeScript support is configured.
- Tailwind CSS is configured and applied globally.
- Basic ESLint setup is included (`next lint`).
- Build pipeline works with `next build`.

### Product scope implemented in the current MVP
The portal already supports the following major business flows:

1. **Employee goal creation**
   - Goal form includes title, description, quarter, weightage, and shared toggle.
   - New goals are inserted into in-memory UI state.

2. **Goal validation rules**
   - Maximum goals: **8**
   - Minimum weightage per goal: **10%**
   - Total allowed weightage across goals: **100%**
   - Submission is blocked until total weightage is exactly 100%.

3. **Manager approval workflow**
   - Draft goals can be submitted for manager approval.
   - Manager actions: approve or reject.
   - Status model: `draft`, `submitted`, `approved`, `rejected`.

4. **Quarterly check-ins**
   - Progress updates through slider (0–100).
   - Notes per goal for quarterly check-ins.
   - Editing lock behavior for approved/submitted workflows.

5. **Admin unlock mode**
   - Admin can temporarily unlock editing even when a goal is locked.

6. **Analytics and summaries**
   - Top dashboard cards: total goals, avg progress, shared goals, weightage completion.
   - Quarter-wise grouping and progress bars.
   - Shared goals panel.

7. **AI recommendation module (rule-based placeholder)**
   - User guidance message is generated from current goal state and weightage balance.
   - Not LLM-connected yet; currently deterministic suggestions.

8. **Supabase-ready persistence integration**
   - Supabase client is conditionally initialized from env vars.
   - Goal save flow attempts `upsert` to `goals` table.
   - If env vars are missing, app falls back to local demo mode gracefully.

9. **Theme support**
   - Light/dark mode toggle implemented via root `html.dark` class.

---

## 2) What Was Done in Previous Session (Detailed)

Based on repository history, the previous major implementation session delivered:

- Full codebase bootstrap for the Goal Portal module.
- Creation of app shell and primary portal UI.
- Addition of reusable UI primitives (`Button`, `Card`, `Badge`, `Progress`).
- Business logic modules for validation, analytics, AI suggestion, and quarter grouping.
- Supabase integration stubs and persistence service.
- Documentation file at `docs/goal-portal.md`.
- README and build compatibility finalization in commit:
  - `fix: finalize portal docs and build compatibility`

In short, the previous session established the complete MVP skeleton plus core workflows in a usable, demo-ready state.

---

## 3) How the Current Work Is Implemented (Technical Breakdown)

### Frontend architecture
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI styling**: Tailwind CSS
- **Component design**: lightweight shadcn-style primitives with utility composition
- **Icons**: `lucide-react`

### Key file map
- `app/page.tsx` → App entry, renders portal.
- `components/goal-portal.tsx` → Main product flow UI + state management.
- `lib/types.ts` → Core `Goal` type and status definitions.
- `lib/goal-validation.ts` → Validation and submit rules.
- `analytics/metrics.ts` → Dashboard metric calculations.
- `dashboards/goal-summary.ts` → Grouping goals by quarter.
- `ai/recommendations.ts` → Rule-based recommendation generation.
- `supabase/client.ts` → Supabase client initialization from env.
- `supabase/goal-service.ts` → Save/upsert goals to Supabase.

### Current data flow (high-level)
1. User creates/updates goals in the portal UI.
2. Validation is performed before goal creation/submission.
3. State updates happen in React client state.
4. Save operation calls Supabase service (if configured).
5. Dashboard metrics and recommendations are computed from current state.

### Current validation/build status
Commands verified:
- `npm run lint` ✅
- `npm run build` ✅

---

## 4) What Is Left To Do

The MVP works, but production-level completion still requires:

1. **Authentication and authorization**
   - Employee, manager, and admin role separation.
   - Route/data protection and role-based permissions.

2. **Real persistence lifecycle**
   - Proper DB schema + migrations.
   - Fetch/load goals from backend on page load.
   - Robust update/delete semantics and conflict handling.

3. **Workflow hardening**
   - Manager comments on approval/rejection.
   - Multi-step workflow states (resubmission, revision required, archived).
   - Audit trail for state transitions.

4. **Form and UX quality**
   - Inline field-level validations and error states.
   - Success/error toasts and better feedback UX.
   - Improved empty/loading/error states.

5. **Testing coverage**
   - Unit tests for validation, metrics, recommendations.
   - Component/integration tests for portal workflows.

6. **Operational readiness**
   - Environment management for staging/prod.
   - CI checks for lint/build/tests.
   - Monitoring, logging, and failure observability.

---

## 5) How Current Work Can Be Enhanced Functionally

### Functional enhancements (direct product value)
1. **AI enhancement**
   - Replace rule-based recommendations with contextual LLM suggestions.
   - Add quality scoring for goals (clarity, measurability, alignment).
   - Suggest rebalancing when weightage distribution is suboptimal.

2. **Goal intelligence**
   - SMART-goal checker and auto-improvement prompts.
   - Duplicate/overlap goal detection.
   - Auto-suggest quarterly milestones.

3. **Manager productivity**
   - Bulk approve/reject operations.
   - Team-level view with filters and bottleneck insights.
   - SLA indicators for pending approvals.

4. **Advanced analytics**
   - Trend analysis over multiple quarters.
   - Department/team comparisons.
   - Risk flags for low-progress high-weightage goals.

5. **Collaboration upgrades**
   - Goal dependency mapping.
   - Shared-goal ownership and contribution breakdown.
   - Comment threads and mention system.

### Engineering enhancements (stability/scalability)
1. Move from local state to server-backed data fetch/mutation patterns.
2. Add strict schema validation for API payloads.
3. Introduce full test strategy (unit + integration + E2E).
4. Add caching and optimistic updates where needed.
5. Improve accessibility (keyboard flows, ARIA, semantic controls).

---

## 6) Local Development

Install and run:

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

### Validation
```bash
npm run lint
npm run build
```

---

## 7) Supabase Configuration

Set environment variables to enable persistence:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

If these are not set, the app continues in local demo mode.

---

## 8) Immediate Next Recommended Milestones

1. Implement auth + role model (employee/manager/admin).
2. Finalize Supabase schema and real load/update flows.
3. Add automated tests for goal lifecycle.
4. Upgrade AI module from static recommendations to contextual assistance.
5. Ship manager/team analytics and approval productivity features.
