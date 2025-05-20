import { Injectable, NotFoundException } from '@nestjs/common';
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
      },
    });
  }

  async findAll(): Promise<McpServer[]> {
    return this.prisma.mcpServer.findMany();
  }

  async findOne(id: string): Promise<McpServer | null> {
    const mcpServer = await this.prisma.mcpServer.findUnique({
      where: { id },
    });
    if (!mcpServer) {
      // Optional: throw new NotFoundException(`McpServer with ID "${id}" not found`);
      // For now, just return null as per plan.
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
    status?: McpServerStatus; // Make status filter optional, defaulting to ACTIVE
  }): Promise<McpServer[]> {
    const whereClause: Prisma.McpServerWhereInput = {};

    // Default to ACTIVE status if no status is provided in criteria
    whereClause.status = criteria.status || McpServerStatus.ACTIVE; // Corrected to use enum member

    if (criteria.capabilities && criteria.capabilities.length > 0) {
      // Prisma's array 'containsEvery' is what we need if all capabilities must be present.
      // If any of the capabilities is enough, use 'hasSome'.
      // For this phase, let's assume all specified capabilities must be present.
      whereClause.capabilities = { hasEvery: criteria.capabilities };
    }

    if (criteria.nameRegex) {
      // Prisma uses 'contains' for substring search, 'startsWith', 'endsWith'.
      // For true regex, it depends on the DB provider (e.g., PostgreSQL supports 'matches').
      // For simplicity and DB agnosticism, let's use 'contains' with 'mode: "insensitive"'
      // if a simple substring search is acceptable.
      // If actual regex is needed, this might require a raw query or more specific Prisma features.
      // For now, using 'contains' for name matching.
      whereClause.name = {
        contains: criteria.nameRegex,
        mode: 'insensitive', // Optional: for case-insensitive search
      };
    }

    return this.prisma.mcpServer.findMany({
      where: whereClause,
      orderBy: {
        // Optional: define a default sort order, e.g., by name or lastCheckedAt
        name: 'asc',
      },
    });
  }
  
  // Stub for update - can be implemented later
  // async update(id: string, data: Prisma.McpServerUpdateInput): Promise<McpServer> {
  //   // Before updating, you might want to fetch the existing record to ensure it exists
  //   // const existingServer = await this.findOne(id);
  //   // if (!existingServer) {
  //   //   throw new NotFoundException(`McpServer with ID "${id}" not found`);
  //   // }
  //   return this.prisma.mcpServer.update({
  //     where: { id },
  //     data,
  //   });
  // }

  // Stub for delete - can be implemented later
  // async remove(id: string): Promise<McpServer> {
  //   // Before deleting, you might want to fetch the existing record to ensure it exists
  //   // const existingServer = await this.findOne(id);
  //   // if (!existingServer) {
  //   //   throw new NotFoundException(`McpServer with ID "${id}" not found`);
  //   // }
  //   return this.prisma.mcpServer.delete({
  //     where: { id },
  //   });
  // }
}
