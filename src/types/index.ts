
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
  type: string; // This should match an Agent['type']
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

export type ProjectStatus = 'Active' | 'On Hold' | 'Completed' | 'Archived';
export const projectStatuses: ProjectStatus[] = ['Active', 'On Hold', 'Completed', 'Archived'];

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  lastUpdated: string; // ISO date string or human-readable
  thumbnailUrl?: string;
  agentCount?: number;
  workflowCount?: number;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Done' | 'Blocked';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assignedTo: string;
  startDate?: string; // ISO date string e.g., "2024-07-01"
  durationDays?: number; // Duration in days
  progress?: number; // Percentage 0-100
  isMilestone?: boolean;
  parentId?: string | null;
  dependencies?: string[];
  description?: string;
  isAiPlanned?: boolean;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string; // e.g., "/" or "/documents/"
  content?: string; // For file content
  size?: string; // e.g., "1.2 MB", "500 KB"
  lastModified?: string; // ISO date string or human-readable
  children?: ProjectFile[];
}

export type RequirementStatus = 'Draft' | 'Under Review' | 'Approved' | 'Implemented' | 'Obsolete' | 'Rejected';
export const requirementStatuses: RequirementStatus[] = ['Draft', 'Under Review', 'Approved', 'Implemented', 'Obsolete', 'Rejected'];

export type RequirementPriority = 'High' | 'Medium' | 'Low';
export const requirementPriorities: RequirementPriority[] = ['High', 'Medium', 'Low'];

export interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: RequirementStatus;
  priority: RequirementPriority;
  version: string;
  createdDate: string; // ISO date string
  updatedDate: string; // ISO date string
}

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export const ticketStatuses: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

export type TicketPriority = 'High' | 'Medium' | 'Low';
export const ticketPriorities: TicketPriority[] = ['High', 'Medium', 'Low'];

export type TicketType = 'Bug' | 'Feature Request' | 'Support Request' | 'Change Request';
export const ticketTypes: TicketType[] = ['Bug', 'Feature Request', 'Support Request', 'Change Request'];


export interface Ticket {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  assignee?: string;
  createdDate: string; // ISO date string
  updatedDate: string; // ISO date string
  aiMetadata?: Record<string, any>;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  initialTasks?: Array<Partial<Omit<Task, 'id' | 'projectId'>>>;
  initialFiles?: Array<Omit<ProjectFile, 'id' | 'path' | 'lastModified' | 'size' | 'children' | 'content'> & { children?: Array<Omit<ProjectFile, 'id' | 'path