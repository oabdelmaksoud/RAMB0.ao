
'use client';

import AgentManagementTable from '@/components/features/agent-management/AgentManagementTable';
import type { Agent } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { SlidersHorizontal } from 'lucide-react';
import AddAgentDialog from '@/components/features/agent-management/AddAgentDialog';
import EditAgentDialog from '@/components/features/agent-management/EditAgentDialog';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const initialMockAgents: Agent[] = [
  { id: 'cfg-001', name: 'Default Code Analyzer', type: 'Analysis Agent', status: 'Idle', lastActivity: '2024-07-20T10:00:00Z', config: { sensitivity: 'high' } },
  { id: 'cfg-002', name: 'Staging Deployer', type: 'Deployment Agent', status: 'Running', lastActivity: '2024-07-21T14:30:00Z', config: { environment: 'staging', branch: 'develop' } },
  { id: 'cfg-003', name: 'Daily Reporter', type: 'Reporting Agent', status: 'Stopped', lastActivity: '2024-07-19T08:00:00Z', config: { frequency: 'daily', recipients: ['manager@example.com'] } },
  { id: 'cfg-004', name: 'Security Scanner', type: 'Security Agent', status: 'Error', lastActivity: '2024-07-21T15:00:00Z', config: { scan_level: 'deep' } },
  { id: 'cfg-005', name: 'User Onboarding Helper', type: 'Notification Agent', status: 'Idle', lastActivity: '2024-07-20T16:00:00Z', config: { template: 'welcome_email_v2' } },
];

const AGENTS_STORAGE_KEY = 'agentFlowAgents'; // Global key for this page

export default function AgentManagementPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedAgents = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (storedAgents) {
      try {
        setAgents(JSON.parse(storedAgents));
      } catch (error) {
        console.error("Failed to parse agents from localStorage", error);
        setAgents(initialMockAgents); 
      }
    } else {
      setAgents(initialMockAgents);
    }
  }, []);

  useEffect(() => {
    if (agents.length > 0 || localStorage.getItem(AGENTS_STORAGE_KEY)) {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
    }
  }, [agents]);


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
        agent.id === updatedAgent.id ? { ...updatedAgent, lastActivity: new Date().toISOString() } : agent
      )
    );
    setIsEditDialogOpen(false);
    setEditingAgent(null);
  };

  const handleRunAgent = (agentId: string) => {
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Running', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = agents.find(a => a.id === agentId)?.name;
    toast({ title: "Agent Started", description: `Agent "${agentName || agentId}" is now Running.` });
  };

  const handleStopAgent = (agentId: string) => {
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Stopped', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = agents.find(a => a.id === agentId)?.name;
    toast({ title: "Agent Stopped", description: `Agent "${agentName || agentId}" has been Stopped.` });
  };

  const handleDuplicateAgent = (agentToDuplicate: Agent) => {
    const newAgent: Agent = {
      ...agentToDuplicate,
      id: `cfg-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${agentToDuplicate.name} - Copy`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setAgents(prevAgents => [newAgent, ...prevAgents]);
    toast({ title: "Agent Duplicated", description: `Agent "${agentToDuplicate.name}" has been duplicated as "${newAgent.name}".` });
  };

  const handleOpenDeleteDialog = (agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAgent = () => {
    if (agentToDelete) {
      setAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentToDelete.id));
      toast({ title: "Agent Deleted", description: `Agent "${agentToDelete.name}" has been deleted.`, variant: 'destructive' });
      setAgentToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };


  return (
    <div className="container mx-auto">
      <PageHeader className="items-start justify-between sm:flex-row sm:items-center">
        <div>
          <PageHeaderHeading>
            <SlidersHorizontal className="mr-2 inline-block h-6 w-6" />
            Agent Configuration Management (Global)
          </PageHeaderHeading>
          <PageHeaderDescription>
            Manage global agent configurations. Project-specific agents are managed within each project.
          </PageHeaderDescription>
        </div>
        <AddAgentDialog onAddAgent={handleAddAgent} />
      </PageHeader>

      <AgentManagementTable
        agents={agents}
        onEditAgent={handleOpenEditDialog}
        onRunAgent={handleRunAgent}
        onStopAgent={handleStopAgent}
        onDuplicateAgent={handleDuplicateAgent}
        onDeleteAgent={handleOpenDeleteDialog}
      />

      {editingAgent && (
        <EditAgentDialog
          agent={editingAgent}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUpdateAgent={handleUpdateAgent}
        />
      )}

      {agentToDelete && (
         <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this agent?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the agent
                "{agentToDelete.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setAgentToDelete(null);
                setIsDeleteDialogOpen(false);
              }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteAgent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
