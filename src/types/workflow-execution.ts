import { Agent } from './index';

export enum WorkflowNodeStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface WorkflowExecutionNode {
  id: string;
  name: string;
  type: string;
  status: WorkflowNodeStatus;
  agent?: Agent;
  workflowId?: string;
  startTime?: Date;
  endTime?: Date;
  errorMessage?: string;
  dependencies?: string[]; // IDs of nodes that must complete before this one
  config?: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  nodes: WorkflowExecutionNode[];
  startTime?: Date;
  endTime?: Date;
  createdBy: string;
  projectId?: string;
}

export interface WorkflowExecutionLog {
  workflowExecutionId: string;
  nodeId: string;
  timestamp: Date;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  metadata?: Record<string, any>;
}

export interface WorkflowExecutionResult {
  success: boolean;
  completedNodes: number;
  failedNodes: number;
  totalNodes: number;
  duration: number;
  logs: WorkflowExecutionLog[];
}

export interface WorkflowExecutionOptions {
  simulationMode?: boolean;
  maxRetries?: number;
  timeout?: number;
  continueOnNodeFailure?: boolean;
}
