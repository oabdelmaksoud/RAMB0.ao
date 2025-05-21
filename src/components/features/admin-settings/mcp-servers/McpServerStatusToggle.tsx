// src/components/features/admin-settings/mcp-servers/McpServerStatusToggle.tsx
'use client';

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { McpServer, McpServerStatus, updateMcpServer } from '@/lib/api/mcpServers';

interface McpServerStatusToggleProps {
  server: McpServer;
  onStatusChange: (updatedServer: McpServer) => void;
}

export const McpServerStatusToggle: React.FC<McpServerStatusToggleProps> = ({
  server,
  onStatusChange,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const currentStatusIsActive = server.status === McpServerStatus.ACTIVE;

  const handleStatusToggle = async (isActive: boolean) => {
    if (server.isSystemServer) {
      toast({
        title: 'System Server',
        description: 'Status of system servers cannot be changed.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const newStatus = isActive ? McpServerStatus.ACTIVE : McpServerStatus.INACTIVE;

    try {
      const updatedServer = await updateMcpServer(server.id, { status: newStatus });
      onStatusChange(updatedServer);
      toast({
        title: 'Status Updated',
        description: `${server.name} is now ${newStatus.toLowerCase()}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error Updating Status',
        description: error.message || 'Could not update server status.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Switch
      checked={currentStatusIsActive}
      onCheckedChange={handleStatusToggle}
      disabled={isLoading || server.isSystemServer}
      aria-label={`Toggle status for ${server.name}`}
    />
  );
};
