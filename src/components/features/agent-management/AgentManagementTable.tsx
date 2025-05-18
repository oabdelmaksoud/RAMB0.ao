// src/components/features/agent-management/AgentManagementTable.tsx
'use client';

import type { Agent } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit3, Trash2, Copy, Play, PowerOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface AgentManagementTableProps {
  agents: Agent[];
  onEditAgent: (agent: Agent) => void;
  onRunAgent: (agentId: string) => void;
  onStopAgent: (agentId: string) => void;
  onDuplicateAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
}

const statusColors: { [key in Agent['status']]: string } = {
  Running: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  Idle: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700',
  Stopped: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

export default function AgentManagementTable({
  agents,
  onEditAgent,
  onRunAgent,
  onStopAgent,
  onDuplicateAgent,
  onDeleteAgent,
}: AgentManagementTableProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatDate = (dateString: string) => {
    if (!isClient) return 'Processing...';
    try {
      const date = parseISO(dateString);
      return format(date, "MMM d, yyyy HH:mm");
    } catch (error) {
      // console.warn(`Error parsing date string: "${dateString}"`, error);
      return dateString; // Fallback if date is not ISO or invalid
    }
  };

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No agents configured for this project.
              </TableCell>
            </TableRow>
          )}
          {agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell>{agent.type}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("capitalize", statusColors[agent.status])}>
                  {agent.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(agent.lastActivity)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Agent Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onRunAgent(agent.id)}
                      disabled={agent.status === 'Running'}
                    >
                      <Play className="mr-2 h-4 w-4" /> Run Agent
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onStopAgent(agent.id)}
                      disabled={agent.status === 'Stopped' || agent.status === 'Idle'}
                    >
                      <PowerOff className="mr-2 h-4 w-4" /> Stop Agent
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEditAgent(agent)}>
                      <Edit3 className="mr-2 h-4 w-4" /> Edit Configuration
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicateAgent(agent)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={() => onDeleteAgent(agent)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Agent
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
