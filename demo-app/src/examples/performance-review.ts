/**
 * Performance Review DAG
 *
 * Demonstrates gate nodes for conditional workflow execution based on review scores.
 */

import type { DagConfigType } from '../lib/effect-dag/dag-config'

export const performanceReviewDAG: DagConfigType = {
  name: "performance_review",
  version: "1.0.0",
  triggers: [{ _tag: "schedule" as const, cron: "0 9 1 */3 *" }],
  nodes: [
    {
      _tag: "task" as const,
      id: "gather_feedback" as any,
      run: "node scripts/collect-360-feedback.js",
    },
    {
      _tag: "task" as const,
      id: "calculate_score" as any,
      run: "node scripts/calculate-review-score.js",
    },
    {
      _tag: "gate" as const,
      id: "check_meets_expectations" as any,
      condition: "score >= 3.0",
    },
    {
      _tag: "task" as const,
      id: "standard_raise" as any,
      run: "node scripts/apply-standard-raise.js",
    },
    {
      _tag: "gate" as const,
      id: "check_exceeds_expectations" as any,
      condition: "score >= 4.5",
    },
    {
      _tag: "task" as const,
      id: "exceptional_bonus" as any,
      run: "node scripts/apply-exceptional-bonus.js",
    },
    {
      _tag: "task" as const,
      id: "performance_improvement_plan" as any,
      run: "node scripts/create-pip.js",
    },
    {
      _tag: "task" as const,
      id: "notify_employee" as any,
      run: "node scripts/send-review-notification.js",
    },
  ],
  edges: [
    { from: "gather_feedback" as any, to: "calculate_score" as any, condition: "always" as const },
    { from: "calculate_score" as any, to: "check_meets_expectations" as any, condition: "always" as const },
    { from: "check_meets_expectations" as any, to: "standard_raise" as any, condition: "expr" as const },
    { from: "check_meets_expectations" as any, to: "performance_improvement_plan" as any, condition: "never" as const },
    { from: "standard_raise" as any, to: "check_exceeds_expectations" as any, condition: "always" as const },
    { from: "check_exceeds_expectations" as any, to: "exceptional_bonus" as any, condition: "expr" as const },
    { from: "check_exceeds_expectations" as any, to: "notify_employee" as any, condition: "never" as const },
    { from: "exceptional_bonus" as any, to: "notify_employee" as any, condition: "always" as const },
    { from: "performance_improvement_plan" as any, to: "notify_employee" as any, condition: "always" as const },
  ],
}
