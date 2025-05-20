import { Workflow, WorkflowNode as PrismaWorkflowNode, WorkflowEdge as PrismaWorkflowEdge, Task as PrismaTask, Agent as PrismaAgent } from '@prisma/client'; // Assuming Agent model exists
import { uid } from 'uid';

// More detailed statuses for node execution
export enum DetailedWorkflowNodeStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING', // Was IN_PROGRESS
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
}

// More detailed statuses for overall workflow execution
export enum DetailedWorkflowExecutionStatus {
  DRAFT = 'DRAFT',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PENDING_RESUMPTION = 'PENDING_RESUMPTION',
}

// Represents the runtime execution state of a node, extending Prisma's definition
export interface RuntimeExecutionNode extends PrismaWorkflowNode {
  status: DetailedWorkflowNodeStatus; // Using detailed status
  startTime?: Date;
  endTime?: Date;
  error?: any;
  logs?: string[]; // Specific logs for this node's execution (local to node)

  // Parsed from PrismaWorkflowNode.config
  agentConfig?: Record<string, any>; // Configuration for the agent itself (e.g., flowName)
  inputData?: Record<string, any>;   // Specific input data for this node's execution
  outputData?: any; // Data produced by this node
}

// Represents a single execution instance of a Workflow
export interface RuntimeWorkflowExecution {
  id: string; // Unique ID for this execution instance (e.g., uid('wfe'))
  workflowIdFromDb: string; // ID of the Workflow definition in Prisma
  workflowDefinition: PrismaWorkflow & { nodes: PrismaWorkflowNode[]; edges: PrismaWorkflowEdge[] }; // Original definition
  taskId: string; // Associated Task ID from Prisma
  task: PrismaTask; // Associated Task from Prisma
  status: DetailedWorkflowExecutionStatus; // Using detailed status
  nodes: RuntimeExecutionNode[]; // Runtime state of each node
  initialInput?: any; // Initial input provided when starting the workflow
  startTime?: Date;
  endTime?: Date;
  error?: any; // Error information if the workflow failed as a whole
  currentOutput?: any; // The final or current output of the workflow
  // Centralized logs for the entire workflow execution instance
  logs: Array<{ timestamp: Date; message: string; nodeId?: string; level: LogLevel; data?: any }>;
}

// Result of a single node's execution
export interface NodeExecutionResult {
  nodeId: string;
  status: DetailedWorkflowNodeStatus;
  output?: any;
  error?: any;
}

// Result of an overall workflow execution
export interface WorkflowExecutionResult {
  workflowExecutionId: string;
  status: DetailedWorkflowExecutionStatus;
  output?: any;
  error?: any;
  nodeResults: NodeExecutionResult[];
}

export type LogLevel = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';

// Helper to create RuntimeExecutionNode from PrismaWorkflowNode
export const createRuntimeExecutionNode = (dbNode: PrismaWorkflowNode): RuntimeExecutionNode => {
  let agentConfig: Record<string, any> | undefined = undefined;
  let inputData: Record<string, any> | undefined = undefined;

  // Safely parse config (it's Prisma.JsonValue)
  if (dbNode.config && typeof dbNode.config === 'object' && !Array.isArray(dbNode.config)) {
    const config = dbNode.config as Record<string, any>; // Cast to a more usable type

    if (config.agentConfig && typeof config.agentConfig === 'object' && !Array.isArray(config.agentConfig)) {
      agentConfig = config.agentConfig;
    }
    if (config.input && typeof config.input === 'object' && !Array.isArray(config.input)) {
      inputData = config.input;
    }
  }

  return {
    ...dbNode, // Spread all properties from PrismaWorkflowNode
    status: DetailedWorkflowNodeStatus.PENDING,
    logs: [],
    agentConfig: agentConfig || {}, // Default to empty object
    inputData: inputData || {},   // Default to empty object
  };
};

// Helper to create initial RuntimeWorkflowExecution object
export const createInitialRuntimeWorkflowExecution = (
  workflowIdFromDb: string,
  taskId: string,
  dbWorkflow: PrismaWorkflow & { nodes: PrismaWorkflowNode[]; edges: PrismaWorkflowEdge[] },
  dbTask: PrismaTask,
  initialInput?: any,
): RuntimeWorkflowExecution => ({
  id: uid(16), // Generate a unique ID for the workflow execution
  workflowIdFromDb,
  workflowDefinition: dbWorkflow,
  taskId,
  task: dbTask,
  status: DetailedWorkflowExecutionStatus.DRAFT,
  nodes: dbWorkflow.nodes.map(createRuntimeExecutionNode), // Use the new helper
  initialInput,
  logs: [], // Initialize logs array
});


// --- Original types from the file, kept for reference or if used by other parts of the system ---
// --- They might need to be deprecated or merged eventually ---

export enum OriginalWorkflowNodeStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

export enum OriginalWorkflowStatus {
  DRAFT = 'DRAFT',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface OriginalWorkflowExecutionNode {
  id: string;
  name: string;
  type: string; // This 'type' likely refers to the WorkflowNode's type, not Agent.type directly
  status: OriginalWorkflowNodeStatus;
  agent?: PrismaAgent; // Assuming Agent type from Prisma
  startTime?: Date;
  endTime?: Date;
  errorMessage?: string;
  dependencies?: string[]; // IDs of nodes that must complete before this one
  config?: Record<string, any>; // This is the original config from Prisma node
}

export interface OriginalWorkflowExecution {
  id: string;
  name: string;
  description?: string;
  status: OriginalWorkflowStatus;
  nodes: OriginalWorkflowExecutionNode[]; // Uses original node type
  startTime?: Date;
  endTime?: Date;
  createdBy: string; // User ID
  projectId?: string;
}

export interface OriginalWorkflowExecutionLog {
  workflowExecutionId: string;
  nodeId: string; // Corresponds to OriginalWorkflowExecutionNode.id
  timestamp: Date;
  level: 'INFO' | 'WARNING' | 'ERROR'; // LogLevel is compatible
  message: string;
  metadata?: Record<string, any>;
}

export interface OriginalWorkflowExecutionResult {
  success: boolean;
  completedNodes: number;
  failedNodes: number;
  totalNodes: number;
  duration: number; // in milliseconds
  logs: OriginalWorkflowExecutionLog[];
}

export interface OriginalWorkflowExecutionOptions {
  simulationMode?: boolean;
  maxRetries?: number;
  timeout?: number; // in milliseconds
  continueOnNodeFailure?: boolean;
}
