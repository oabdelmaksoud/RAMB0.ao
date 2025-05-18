import { DatabaseService } from '../database/database.interface';
import { PrismaClient } from '@prisma/client';

export class SimplePrismaService implements DatabaseService {
  private prisma = new PrismaClient();

  async getUsers() {
    return this.prisma.user.findMany();
  }

  async createUser(userData: any) {
    return this.prisma.user.create({
      data: userData
    });
  }

  // Add other required methods matching the DatabaseService interface
  async $connect() {
    return this.prisma.$connect();
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateUser(id: string, userData: any) {
    return this.prisma.user.update({
      where: { id },
      data: userData
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async getProjects() {
    return this.prisma.project.findMany();
  }

  async createProject(projectData: any) {
    return this.prisma.project.create({ data: projectData });
  }

  async getTasks() {
    return this.prisma.task.findMany();
  }

  async createTask(taskData: any) {
    return this.prisma.task.create({ data: taskData });
  }

  async getWorkflows() {
    return this.prisma.workflow.findMany();
  }

  async createWorkflow(workflowData: any) {
    return this.prisma.workflow.create({ data: workflowData });
  }

  async getAgents() {
    return this.prisma.agent.findMany();
  }

  async createAgent(agentData: any) {
    return this.prisma.agent.create({ data: agentData });
  }

  async connect() {
    return this.prisma.$connect();
  }

  async disconnect() {
    return this.prisma.$disconnect();
  }
}
