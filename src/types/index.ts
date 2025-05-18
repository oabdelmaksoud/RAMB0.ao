
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

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  config?: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface ProjectWorkflow {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive' | 'Draft';
  lastRun?: string; // ISO Date string
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
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

export interface Task {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  assignedTo: string;
  startDate?: string; // ISO date string e.g., "2024-07-01"
  durationDays?: number; // Duration in days
  progress?: number; // Percentage 0-100
  isMilestone?: boolean;
  parentId?: string | null;
  dependencies?: string[];
  description?: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string; // e.g., "/" or "/documents/"
  size?: string; // e.g., "1.2 MB", "500 KB"
  lastModified?: string; // ISO date string or human-readable
  children?: ProjectFile[];
}

// New type for Project Templates
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  // For simplicity, initialTasks will be partial Task objects excluding id, projectId
  initialTasks?: Array<Partial<Omit<Task, 'id'>>>;
  // For simplicity, initialFiles won't have full path or ID, structure defined by nesting
  initialFiles?: Array<Omit<ProjectFile, 'id' | 'path' | 'lastModified' | 'size'>>;
  // We can extend this to include initialWorkflows, initialAgents later
}
