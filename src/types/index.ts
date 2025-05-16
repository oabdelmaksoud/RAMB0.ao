
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

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'On Hold' | 'Completed' | 'Archived';
  lastUpdated: string; // ISO date string or human-readable
  thumbnailUrl?: string; 
  agentCount?: number;
  workflowCount?: number;
}

// Moved Task interface here to be globally accessible if needed,
// or it can stay within [projectId]/page.tsx if only used there.
// For now, keeping it in [projectId]/page.tsx to avoid potential circular dependencies
// if other types might reference it later. If it needs to be shared, move it here.
// export interface Task {
//   id: string;
//   title: string;
//   status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
//   assignedTo: string;
// }

