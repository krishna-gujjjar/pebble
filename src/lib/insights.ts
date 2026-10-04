import { addBudgetInsights } from "./insights-budgets";
import { addCardInsights } from "./insights-card";
import { addHabitInsights } from "./insights-habits";
import { addPlannerInsights } from "./insights-planner";
import { addPromiseInsights } from "./insights-promises";
import { addSalaryInsights } from "./insights-salary";
import { addSpendingInsights } from "./insights-spending";
import type { Insight, InsightCtx } from "./types";

export const computeInsights = (ctx: InsightCtx): Insight[] =>
  [
    ...addSalaryInsights(ctx),
    ...addSpendingInsights(ctx),
    ...addCardInsights(ctx),
    ...addBudgetInsights(ctx),
    ...addPlannerInsights(ctx),
    ...addHabitInsights(ctx),
    ...addPromiseInsights(ctx),
  ].toSorted((a, b) => b.priority - a.priority);
