export interface DatabaseService {
  // User operations
  getUsers(): Promise<any[]>;
  createUser(userData: any): Promise<any>;
  getUserById(id: string): Promise<any>;
  updateUser(id: string, userData: any): Promise<any>;
  deleteUser(id: string): Promise<void>;

  // Project operations  
  getProjects(): Promise<any[]>;
  createProject(projectData: any): Promise<any>;
  
  // Task operations
  getTasks(): Promise<any[]>;
  createTask(taskData: any): Promise<any>;

  // Workflow operations
  getWorkflows(): Promise<any[]>;
  createWorkflow(workflowData: any): Promise<any>;

  // Agent operations
  getAgents(): Promise<any[]>;
  createAgent(agentData: any): Promise<any>;

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
