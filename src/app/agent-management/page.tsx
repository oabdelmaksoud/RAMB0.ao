
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
import { uid } from '@/lib/utils'; // Import uid

// Exported for use by other pages like Agent Monitoring
export const initialMockAgents: Agent[] = [
  {
    id: uid('global-agent'),
    name: 'Requirements & Analysis Specialist',
    type: 'Analysis Agent',
    status: 'Idle',
    lastActivity: '2024-07-20T09:00:00Z',
    config: { focus: "System & Software Requirements", methods: ["elicitation", "analysis", "specification"] },
  },
  {
    id: uid('global-agent'),
    name: 'System Architecture Designer',
    type: 'Design Agent',
    status: 'Idle',
    lastActivity: '2024-07-20T09:05:00Z',
    config: { level: "System", outputs: ["architecture_document", "interface_specs"] },
  },
  {
    id: uid('global-agent'),
    name: 'Software Architecture & Component Designer',
    type: 'Design Agent',
    status: 'Idle',
    lastActivity: '2024-07-20T09:10:00Z',
    config: { level: "Software", detail: "Component-level design", tools: ["UML", "SysML"] },
  },
  {
    id: uid('global-agent'),
    name: 'Implementation & Unit Verification Engineer',
    type: 'Development Agent',
    status: 'Idle',
    lastActivity: '2024-07-20T09:15:00Z',
    config: { languages: ["C++", "Python"], unitTestFrameworks: ["GTest", "pytest"] },
  },
  {
    id: uid('global-agent'),
    name: 'Software Integration & Qualification Tester',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: '2024-07-20T09:20:00Z',
    config: { scope: "Software Integration & Qualification", levels: ["SWE.5", "SWE.6"] },
  },
  {
    id: uid('global-agent'),
    name: 'System Integration & Validation Engineer',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: '2024-07-20T09:25:00Z',
    config: { scope: "System Integration & Validation", levels: ["SYS.4", "SYS.5"], includesHardware: true },
  },
  {
    id: uid('global-agent'),
    name: 'Process Support Agent (PM, QA, CM)',
    type: 'Reporting Agent', // Broad type, config specifies roles
    status: 'Idle',
    lastActivity: '2024-07-20T09:30:00Z',
    config: {
      projectManagementTasks: ["status_tracking", "risk_logging"],
      qualityAssuranceTasks: ["process_audit_support", "metric_collection"],
      configurationManagementTasks: ["baseline_creation_support", "change_request_tracking"]
    },
  },
  {
    id: uid('global-agent'),
    name: 'Technical Documentation Specialist',
    type: 'Documentation Agent',
    status: 'Idle',
    lastActivity: '2024-07-20T09:35:00Z',
    config: { documentTypes: ["RequirementsSpec", "DesignDoc", "TestPlan", "UserManual"], outputFormats: ["PDF", "Markdown"] },
  }
];


export const AGENTS_STORAGE_KEY = 'ramboAgentGlobalAgents'; // Updated key for clarity

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
        const parsedAgents = JSON.parse(storedAgents);
        if (Array.isArray(parsedAgents) && parsedAgents.length > 0) {
          setAgents(parsedAgents);
        } else {
          // If stored data is empty array or not an array, initialize with mocks
          setAgents(initialMockAgents);
        }
      } catch (error) {
        console.error("Failed to parse agents from localStorage, initializing with mocks.", error);
        setAgents(initialMockAgents);
      }
    } else {
      // No agents found in localStorage, initialize with mocks
      setAgents(initialMockAgents);
    }
  }, []);

  useEffect(() => {
    // Save to localStorage whenever agents state changes, but only if it's not the initial empty array before loading.
    // This prevents overwriting localStorage with an empty array on initial load before mocks are set.
    if (agents.length > 0 || localStorage.getItem(AGENTS_STORAGE_KEY)) {
       localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
    }
  }, [agents]);


  const handleAddAgent = (newAgentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => {
    const newAgent: Agent = {
      ...newAgentData,
      id: uid('global-agent'),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setAgents(prevAgents => [newAgent, ...prevAgents]);
    toast({
      title: "Global Agent Created",
      description: `Agent "${newAgent.name}" has been added to global configurations.`,
    });
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
     toast({
      title: "Global Agent Updated",
      description: `Agent "${updatedAgent.name}" has been updated.`,
    });
  };

  const handleRunAgent = (agentId: string) => {
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Running', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = agents.find(a => a.id === agentId)?.name;
    toast({ title: "Global Agent Started", description: `Agent "${agentName || agentId}" is now Running.` });
  };

  const handleStopAgent = (agentId: string) => {
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Stopped', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = agents.find(a => a.id === agentId)?.name;
    toast({ title: "Global Agent Stopped", description: `Agent "${agentName || agentId}" has been Stopped.` });
  };

  const handleDuplicateAgent = (agentToDuplicate: Agent) => {
    const newAgent: Agent = {
      ...agentToDuplicate,
      id: uid('global-agent-copy'),
      name: `${agentToDuplicate.name} - Copy`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setAgents(prevAgents => [newAgent, ...prevAgents]);
    toast({ title: "Global Agent Duplicated", description: `Agent "${agentToDuplicate.name}" duplicated as "${newAgent.name}".` });
  };

  const handleOpenDeleteDialog = (agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAgent = () => {
    if (agentToDelete) {
      setAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentToDelete.id));
      toast({ title: "Global Agent Deleted", description: `Agent "${agentToDelete.name}" has been deleted.`, variant: 'destructive' });
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
            Manage global agent configurations and templates. These can be used as starting points for project-specific agents.
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
              <AlertDialogTitle>Are you sure you want to delete this global agent configuration?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the global agent template
                "{agentToDelete.name}". This will not affect existing project agents based on this template.
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
