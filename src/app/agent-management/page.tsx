
'use client';

import AgentManagementTable from '@/components/features/agent-management/AgentManagementTable';
import type { Agent } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { SlidersHorizontal } from 'lucide-react';
import AddAgentDialog from '@/components/features/agent-management/AddAgentDialog';
import EditAgentDialog from '@/components/features/agent-management/EditAgentDialog'; // Added import
import { useState } from 'react';

const initialMockAgents: Agent[] = [
  { id: 'cfg-001', name: 'Default Code Analyzer', type: 'Analysis Agent', status: 'Idle', lastActivity: '2024-07-20T10:00:00Z', config: { sensitivity: 'high' } },
  { id: 'cfg-002', name: 'Staging Deployer', type: 'Deployment Agent', status: 'Running', lastActivity: '2024-07-21T14:30:00Z', config: { environment: 'staging', branch: 'develop' } },
  { id: 'cfg-003', name: 'Daily Reporter', type: 'Reporting Agent', status: 'Stopped', lastActivity: '2024-07-19T08:00:00Z', config: { frequency: 'daily', recipients: ['manager@example.com'] } },
  { id: 'cfg-004', name: 'Security Scanner', type: 'Security Agent', status: 'Error', lastActivity: '2024-07-21T15:00:00Z', config: { scan_level: 'deep' } },
  { id: 'cfg-005', name: 'User Onboarding Helper', type: 'Notification Agent', status: 'Idle', lastActivity: '2024-07-20T16:00:00Z', config: { template: 'welcome_email_v2' } },
];


export default function AgentManagementPage() {
  const [agents, setAgents] = useState<Agent[]>(initialMockAgents);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const handleAddAgent = (newAgentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => {
    const newAgent: Agent = {
      ...newAgentData,
      id: `cfg-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setAgents(prevAgents => [newAgent, ...prevAgents]);
  };

  const handleOpenEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setIsEditDialogOpen(true);
  };

  const handleUpdateAgent = (updatedAgent: Agent) => {
    setAgents(prevAgents => 
      prevAgents.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      )
    );
    setIsEditDialogOpen(false);
    setEditingAgent(null);
  };

  return (
    <div className="container mx-auto">
      <PageHeader className="items-start justify-between sm:flex-row sm:items-center">
        <div>
          <PageHeaderHeading>
            <SlidersHorizontal className="mr-2 inline-block h-6 w-6" />
            Agent Configuration Management
          </PageHeaderHeading>
          <PageHeaderDescription>
            Centrally manage agent configurations, types, and view execution logs.
          </PageHeaderDescription>
        </div>
        <AddAgentDialog onAddAgent={handleAddAgent} />
      </PageHeader>

      <AgentManagementTable agents={agents} onEditAgent={handleOpenEditDialog} />

      {editingAgent && (
        <EditAgentDialog
          agent={editingAgent}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUpdateAgent={handleUpdateAgent}
        />
      )}
    </div>
  );
}
