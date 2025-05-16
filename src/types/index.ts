export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'Running' | 'Idle' | 'Error' | 'Stopped';
  lastActivity: string; // ISO date string or human-readable
  performance?: {
    cpuUsage?: number; // percentage
    memoryUsage?: number; // MB or percentage
  };
  config?: Record<string, any>;
  logs?: string[];
}

export interface WorkflowNodeData {
  id: string;
  type: string; // e.g., 'CodeReviewAgent', 'NotificationAgent'
  label: string;
  config?: Record<string, any>;
}

export interface WorkflowEdgeData {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
}
