/**
 * Employee Onboarding DAG
 *
 * Demonstrates collect nodes for gathering employee information during onboarding.
 */

import type { DagConfigType } from '../lib/effect-dag/dag-config'

export const onboardingDAG: DagConfigType = {
  name: "employee_onboarding",
  version: "1.0.0",
  triggers: [{ _tag: "schedule" as const, cron: "0 9 * * 1" }],
  nodes: [
    {
      _tag: "task" as const,
      id: "create_accounts" as any,
      run: "node scripts/create-accounts.js",
    },
    {
      _tag: "collect" as const,
      id: "collect_employee_info" as any,
      formId: "employee_details_form",
      timeout: 86400000, // 24 hours
    },
    {
      _tag: "task" as const,
      id: "provision_equipment" as any,
      run: "node scripts/order-equipment.js",
    },
    {
      _tag: "task" as const,
      id: "setup_workspace" as any,
      run: "node scripts/setup-desk.js",
    },
    {
      _tag: "collect" as const,
      id: "collect_preferences" as any,
      formId: "workspace_preferences_form",
      timeout: 43200000, // 12 hours
    },
    {
      _tag: "task" as const,
      id: "send_welcome_email" as any,
      run: "node scripts/send-welcome.js",
      env: { TEMPLATE: "onboarding_welcome" },
    },
  ],
  edges: [
    { from: "create_accounts" as any, to: "collect_employee_info" as any, condition: "always" as const },
    { from: "collect_employee_info" as any, to: "provision_equipment" as any, condition: "always" as const },
    { from: "collect_employee_info" as any, to: "setup_workspace" as any, condition: "always" as const },
    { from: "setup_workspace" as any, to: "collect_preferences" as any, condition: "always" as const },
    { from: "collect_preferences" as any, to: "send_welcome_email" as any, condition: "always" as const },
  ],
}
