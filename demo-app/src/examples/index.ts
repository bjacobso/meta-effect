/**
 * DAG Examples Registry
 *
 * Central registry of all DAG examples with metadata.
 */

import type { DagConfigType } from '../lib/effect-dag/dag-config'
import { helloWorldDAG } from './simple/hello-world'
import { onboardingDAG } from './hr/onboarding'
import { performanceReviewDAG } from './hr/performance-review'
import { buildAndDeployDAG } from './ci-cd/build-and-deploy'
import { etlWorkflowDAG } from './data-pipeline/etl-workflow'

export interface DagExample {
  id: string
  name: string
  category: string
  description: string
  dag: DagConfigType
  tags: string[]
}

export const dagExamples: DagExample[] = [
  {
    id: 'hello-world',
    name: 'Hello World',
    category: 'Simple',
    description: 'A basic linear workflow demonstrating task nodes in sequence.',
    dag: helloWorldDAG,
    tags: ['beginner', 'task'],
  },
  {
    id: 'onboarding',
    name: 'Employee Onboarding',
    category: 'HR',
    description: 'Employee onboarding workflow with collect nodes for gathering information.',
    dag: onboardingDAG,
    tags: ['collect', 'task', 'forms'],
  },
  {
    id: 'performance-review',
    name: 'Performance Review',
    category: 'HR',
    description: 'Performance review workflow with conditional gates based on scores.',
    dag: performanceReviewDAG,
    tags: ['gate', 'task', 'conditional'],
  },
  {
    id: 'build-and-deploy',
    name: 'Build and Deploy',
    category: 'CI/CD',
    description: 'Complete CI/CD pipeline with parallel builds and deployments.',
    dag: buildAndDeployDAG,
    tags: ['fanout', 'fanin', 'gate', 'task', 'parallel'],
  },
  {
    id: 'etl-workflow',
    name: 'ETL Data Pipeline',
    category: 'Data Pipeline',
    description: 'ETL workflow with parallel data extraction and transformation.',
    dag: etlWorkflowDAG,
    tags: ['fanout', 'fanin', 'gate', 'task', 'parallel', 'data'],
  },
]

export const getExampleById = (id: string): DagExample | undefined => {
  return dagExamples.find(example => example.id === id)
}

export const getExamplesByCategory = (category: string): DagExample[] => {
  return dagExamples.filter(example => example.category === category)
}

export const getAllCategories = (): string[] => {
  return Array.from(new Set(dagExamples.map(example => example.category)))
}
