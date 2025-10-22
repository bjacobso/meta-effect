/**
 * ETL Data Pipeline DAG
 *
 * Demonstrates fanout/fanin nodes for parallel data processing from multiple sources.
 */

import type { DagConfigType } from '../lib/effect-dag/dag-config'

export const etlWorkflowDAG: DagConfigType = {
  name: "etl_data_pipeline",
  version: "1.0.0",
  triggers: [{ _tag: "schedule" as const, cron: "0 2 * * *" }],
  defaults: {
    retry: {
      maxAttempts: 3,
      backoff: {
        _tag: "exponential" as const,
        baseDelayMs: 1000,
        factor: 2,
        maxDelayMs: 30000,
      },
    },
  },
  nodes: [
    {
      _tag: "task" as const,
      id: "init_pipeline" as any,
      run: "python scripts/init_pipeline.py",
    },
    {
      _tag: "fanout" as const,
      id: "extract_sources" as any,
    },
    {
      _tag: "task" as const,
      id: "extract_postgres" as any,
      run: "python scripts/extract_postgres.py",
      env: { SOURCE: "postgres", TABLE: "users" },
    },
    {
      _tag: "task" as const,
      id: "extract_mongodb" as any,
      run: "python scripts/extract_mongodb.py",
      env: { SOURCE: "mongodb", COLLECTION: "events" },
    },
    {
      _tag: "task" as const,
      id: "extract_s3" as any,
      run: "python scripts/extract_s3.py",
      env: { SOURCE: "s3", BUCKET: "raw-data" },
    },
    {
      _tag: "task" as const,
      id: "extract_api" as any,
      run: "python scripts/extract_api.py",
      env: { SOURCE: "api", ENDPOINT: "/analytics" },
    },
    {
      _tag: "fanin" as const,
      id: "collect_extracts" as any,
    },
    {
      _tag: "gate" as const,
      id: "validate_data_quality" as any,
      condition: "row_count > 1000 && null_rate < 0.05",
    },
    {
      _tag: "fanout" as const,
      id: "transform_parallel" as any,
    },
    {
      _tag: "task" as const,
      id: "transform_normalize" as any,
      run: "python scripts/transform_normalize.py",
    },
    {
      _tag: "task" as const,
      id: "transform_enrich" as any,
      run: "python scripts/transform_enrich.py",
    },
    {
      _tag: "task" as const,
      id: "transform_aggregate" as any,
      run: "python scripts/transform_aggregate.py",
    },
    {
      _tag: "fanin" as const,
      id: "collect_transforms" as any,
    },
    {
      _tag: "task" as const,
      id: "load_warehouse" as any,
      run: "python scripts/load_warehouse.py",
      env: { TARGET: "snowflake", SCHEMA: "analytics" },
    },
    {
      _tag: "task" as const,
      id: "update_metrics" as any,
      run: "python scripts/update_metrics.py",
    },
  ],
  edges: [
    { from: "init_pipeline" as any, to: "extract_sources" as any, condition: "always" as const },
    { from: "extract_sources" as any, to: "extract_postgres" as any, condition: "always" as const },
    { from: "extract_sources" as any, to: "extract_mongodb" as any, condition: "always" as const },
    { from: "extract_sources" as any, to: "extract_s3" as any, condition: "always" as const },
    { from: "extract_sources" as any, to: "extract_api" as any, condition: "always" as const },
    { from: "extract_postgres" as any, to: "collect_extracts" as any, condition: "always" as const },
    { from: "extract_mongodb" as any, to: "collect_extracts" as any, condition: "always" as const },
    { from: "extract_s3" as any, to: "collect_extracts" as any, condition: "always" as const },
    { from: "extract_api" as any, to: "collect_extracts" as any, condition: "always" as const },
    { from: "collect_extracts" as any, to: "validate_data_quality" as any, condition: "always" as const },
    { from: "validate_data_quality" as any, to: "transform_parallel" as any, condition: "expr" as const },
    { from: "transform_parallel" as any, to: "transform_normalize" as any, condition: "always" as const },
    { from: "transform_parallel" as any, to: "transform_enrich" as any, condition: "always" as const },
    { from: "transform_parallel" as any, to: "transform_aggregate" as any, condition: "always" as const },
    { from: "transform_normalize" as any, to: "collect_transforms" as any, condition: "always" as const },
    { from: "transform_enrich" as any, to: "collect_transforms" as any, condition: "always" as const },
    { from: "transform_aggregate" as any, to: "collect_transforms" as any, condition: "always" as const },
    { from: "collect_transforms" as any, to: "load_warehouse" as any, condition: "always" as const },
    { from: "load_warehouse" as any, to: "update_metrics" as any, condition: "always" as const },
  ],
}
