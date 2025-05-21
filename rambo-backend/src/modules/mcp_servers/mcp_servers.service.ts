import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Adjusted path
import { McpServer, McpServerStatus, Prisma } from '@prisma/client'; // Prisma client auto-generated types

// Define DTO for McpServer creation (subset of McpServer model)
export interface CreateMcpServerDto {
  name: string;
  description?: string;
  baseUrl: string;
  protocolDetails?: Prisma.InputJsonValue;
  capabilities?: string[];
  status?: McpServerStatus; // Using the imported McpServerStatus enum
  isSystemServer?: boolean;
}

// Define DTO for McpServer update
export interface UpdateMcpServerDto {
  name?: string;
  description?: string;
  baseUrl?: string;
  protocolDetails?: Prisma.InputJsonValue;
  capabilities?: string[];
  status?: McpServerStatus;
  isSystemServer?: boolean;
}

@Injectable()
export class McpServersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateMcpServerDto): Promise<McpServer> {
    return this.prisma.mcpServer.create({
      data: {
        name: data.name,
        description: data.description,
        baseUrl: data.baseUrl,
        protocolDetails: data.protocolDetails === undefined ? Prisma.JsonNull : data.protocolDetails,
        capabilities: data.capabilities === undefined ? [] : data.capabilities,
        status: data.status === undefined ? McpServerStatus.ACTIVE : data.status,
        isSystemServer: data.isSystemServer === undefined ? false : data.isSystemServer,
      },
    });
  }

  async findAll(filters?: { isSystemServer?: boolean }): Promise<McpServer[]> {
    const where: Prisma.McpServerWhereInput = {};
    if (filters?.isSystemServer !== undefined) {
      where.isSystemServer = filters.isSystemServer;
    }
    return this.prisma.mcpServer.findMany({ where });
  }

  async findOne(id: string): Promise<McpServer | null> {
    const mcpServer = await this.prisma.mcpServer.findUnique({
      where: { id },
    });
    if (!mcpServer) {
      // As per previous implementation, this service method returns null if not found.
      // The controller will handle throwing NotFoundException.
      return null;
    }
    return mcpServer;
  }

  async findOneByName(name: string): Promise<McpServer | null> {
    const mcpServer = await this.prisma.mcpServer.findUnique({
      where: { name },
    });
    return mcpServer;
  }

  async findCompatibleServers(criteria: {
    capabilities?: string[];
    nameRegex?: string;
    status?: McpServerStatus; 
  }): Promise<McpServer[]> {
    const whereClause: Prisma.McpServerWhereInput = {};

    whereClause.status = criteria.status || McpServerStatus.ACTIVE; 

    if (criteria.capabilities && criteria.capabilities.length > 0) {
      whereClause.capabilities = { hasEvery: criteria.capabilities };
    }

    if (criteria.nameRegex) {
      whereClause.name = {
        contains: criteria.nameRegex,
        mode: 'insensitive', 
      };
    }

    return this.prisma.mcpServer.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc',
      },
    });
  }
  
  async update(id: string, data: UpdateMcpServerDto): Promise<McpServer> {
    const existingServer = await this.prisma.mcpServer.findUnique({
      where: { id },
    });

    if (!existingServer) {
      throw new NotFoundException(`McpServer with ID "${id}" not found`);
    }

    if (existingServer.isSystemServer) {
      if (data.isSystemServer !== undefined && data.isSystemServer === false) {
        delete data.isSystemServer; // Prevent changing isSystemServer from true to false
      } else {
        data.isSystemServer = true; // Ensure it remains true if already a system server
      }
    }
    
    const updateData: Prisma.McpServerUpdateInput = { ...data };
    if (data.protocolDetails === undefined) {
      delete updateData.protocolDetails;
    } else if (data.protocolDetails === null) {
        updateData.protocolDetails = Prisma.JsonNull;
    }


    return this.prisma.mcpServer.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string): Promise<McpServer> {
    const existingServer = await this.prisma.mcpServer.findUnique({
      where: { id },
    });

    if (!existingServer) {
      throw new NotFoundException(`McpServer with ID "${id}" not found`);
    }

    if (existingServer.isSystemServer) {
      throw new ForbiddenException('System MCP servers cannot be deleted.');
    }

    return this.prisma.mcpServer.delete({
      where: { id },
    });
  }
}
