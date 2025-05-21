// src/components/features/admin-settings/mcp-servers/McpServerListTable.tsx
'use client';

import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2 } from 'lucide-react';
import { McpServer, McpServerStatus } from '@/lib/api/mcpServers';
import { McpServerStatusToggle } from './McpServerStatusToggle';

interface McpServerListTableProps {
  servers: McpServer[];
  onEdit: (server: McpServer) => void;
  onDelete: (server: McpServer) => void;
  onServersUpdate: (updatedServers: McpServer[]) => void; // Used after status toggle updates a server
}

export const McpServerListTable: React.FC<McpServerListTableProps> = ({
  servers,
  onEdit,
  onDelete,
  onServersUpdate,
}) => {
  const handleStatusChange = (updatedServer: McpServer) => {
    const newServersList = servers.map((s) =>
      s.id === updatedServer.id ? updatedServer : s
    );
    onServersUpdate(newServersList);
  };

  const getStatusBadgeVariant = (status: McpServerStatus) => {
    switch (status) {
      case McpServerStatus.ACTIVE:
        return 'success'; // Assuming you have a 'success' variant or will add one
      case McpServerStatus.INACTIVE:
        return 'secondary';
      case McpServerStatus.ERROR:
        return 'destructive';
      case McpServerStatus.CONFIG_PENDING:
        return 'warning'; // Assuming you have a 'warning' variant or will add one
      default:
        return 'default';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Base URL</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {servers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center">
              No MCP Servers found.
            </TableCell>
          </TableRow>
        ) : (
          servers.map((server) => (
            <TableRow key={server.id}>
              <TableCell className="font-medium">{server.name}</TableCell>
              <TableCell>{server.baseUrl}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(server.status)}>
                  {server.status.charAt(0).toUpperCase() + server.status.slice(1).toLowerCase().replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={server.isSystemServer ? 'info' : 'outline'}> {/* Assuming 'info' variant */}
                  {server.isSystemServer ? 'System' : 'Admin'}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <McpServerStatusToggle
                  server={server}
                  onStatusChange={handleStatusChange}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(server)}
                  disabled={server.isSystemServer}
                  aria-label={`Edit ${server.name}`}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(server)}
                  disabled={server.isSystemServer}
                  aria-label={`Delete ${server.name}`}
                  className={!server.isSystemServer ? "hover:text-destructive" : ""}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
