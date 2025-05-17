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
  name: string; // Typically the agent type or a user-defined name for the node
  type: string; // Agent type from palette
  x: number;
  y: number;
  config?: Record<string, any>; // For node-specific configurations later
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string; // ID of the source WorkflowNode
  targetNodeId: string; // ID of the target WorkflowNode
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
  isMilestone?: boolean; // New field for milestones
  parentId?: string | null; // ID of the parent task
  dependencies?: string[]; // Array of task IDs this task depends on
  description?: string; // Optional detailed description for the task
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string; // e.g., "/" or "/documents/"
  size?: string; // e.g., "1.2 MB", "500 KB"
  lastModified?: string; // ISO date string or human-readable
  children?: ProjectFile[]; // For folders, to represent hierarchy
}