// src/lib/api/mcpServers.ts

// 1. Define Frontend Types/Enums

export enum McpServerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  CONFIG_PENDING = 'CONFIG_PENDING',
}

export interface McpServer {
  id: string;
  name: string;
  description: string | null;
  baseUrl: string;
  protocolDetails: any | null; // Using 'any' for Prisma.JsonValue for simplicity on frontend
  capabilities: string[];
  status: McpServerStatus;
  adminRegisteredAt: Date;
  updatedAt: Date;
  lastCheckedAt: Date | null;
  isSystemServer: boolean;
}

export interface CreateMcpServerDto {
  name: string;
  description?: string;
  baseUrl: string;
  protocolDetails?: any; // Prisma.InputJsonValue represented as 'any'
  capabilities?: string[];
  status?: McpServerStatus;
  isSystemServer?: boolean;
}

export interface UpdateMcpServerDto {
  name?: string;
  description?: string;
  baseUrl?: string;
  protocolDetails?: any; // Prisma.InputJsonValue represented as 'any'
  capabilities?: string[];
  status?: McpServerStatus;
  isSystemServer?: boolean;
}

// 2. Implement API Client Functions

const BASE_URL = '/api/mcp-servers'; // Assuming Next.js proxy or same-domain serving

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // Ignore if response is not JSON
    }
    const errorMessage = errorData?.message || `HTTP error ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }
  if (response.status === 204) { // No Content
    return undefined as T; // Or handle appropriately if T can't be undefined
  }
  return response.json() as Promise<T>;
}

export async function addMcpServer(serverData: CreateMcpServerDto): Promise<McpServer> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(serverData),
  });
  return handleResponse<McpServer>(response);
}

export async function getMcpServers(filters?: { isSystemServer?: boolean }): Promise<McpServer[]> {
  let url = BASE_URL;
  if (filters?.isSystemServer !== undefined) {
    const params = new URLSearchParams();
    params.append('isSystemServer', String(filters.isSystemServer));
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  return handleResponse<McpServer[]>(response);
}

export async function getMcpServerById(id: string): Promise<McpServer> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  return handleResponse<McpServer>(response);
}

export async function updateMcpServer(id: string, updateData: UpdateMcpServerDto): Promise<McpServer> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  return handleResponse<McpServer>(response);
}

export async function deleteMcpServer(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<void>(response); // handleResponse will correctly handle 204
}
