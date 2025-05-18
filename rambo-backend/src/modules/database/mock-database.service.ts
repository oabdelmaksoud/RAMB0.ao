interface User {
  id?: string;
  email: string;
  password: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}

interface MockUser extends User {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

import { DatabaseService } from './database.interface';

export class MockDatabaseService implements DatabaseService {
  private data = {
    users: [] as MockUser[],
    projects: [] as Array<{id: string, name: string, description?: string, createdAt: Date}>,
    tasks: [] as Array<{id: string, title: string, description?: string, status: string, createdAt: Date}>,
    workflows: [] as Array<{id: string, name: string, nodes: any[], edges: any[], createdAt: Date}>,
    agents: [] as Array<{id: string, name: string, type: string, config: any, createdAt: Date}>
  };

  constructor() {}

  async getUsers(): Promise<MockUser[]> {
    return this.data.users;
  }

  async createUser(userData: Omit<User, 'id'>): Promise<MockUser> {
    const user = { 
      id: Date.now().toString(), 
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false
    };
    this.data.users.push(user);
    return user;
  }

  async getUserById(id: string): Promise<MockUser | undefined> {
    return this.data.users.find(u => u.id === id);
  }

  async updateUser(id: string, userData: Partial<User>): Promise<MockUser> {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('User not found');
    this.data.users[index] = {...this.data.users[index], ...userData, updatedAt: new Date()};
    return this.data.users[index];
  }

  async deleteUser(id: string): Promise<void> {
    this.data.users = this.data.users.filter(u => u.id !== id);
  }

  // Project methods
  async getProjects(): Promise<any[]> {
    return this.data.projects;
  }

  async createProject(projectData: any): Promise<any> {
    const project = { id: Date.now().toString(), ...projectData };
    this.data.projects.push(project);
    return project;
  }

  // Task methods
  async getTasks(): Promise<any[]> {
    return this.data.tasks;
  }

  async createTask(taskData: any): Promise<any> {
    const task = { id: Date.now().toString(), ...taskData };
    this.data.tasks.push(task);
    return task;
  }

  // Workflow methods
  async getWorkflows(): Promise<any[]> {
    return this.data.workflows;
  }

  async createWorkflow(workflowData: any): Promise<any> {
    const workflow = { id: Date.now().toString(), ...workflowData };
    this.data.workflows.push(workflow);
    return workflow;
  }

  // Agent methods
  async getAgents(): Promise<any[]> {
    return this.data.agents;
  }

  async createAgent(agentData: any): Promise<any> {
    const agent = { id: Date.now().toString(), ...agentData };
    this.data.agents.push(agent);
    return agent;
  }

  // Connection methods
  async connect(): Promise<void> {
    console.log('Mock database connected');
  }

  async disconnect(): Promise<void> {
    console.log('Mock database disconnected');
  }
}
