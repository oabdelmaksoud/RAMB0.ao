
'use client';

import AgentManagementTable from '@/components/features/agent-management/AgentManagementTable';
import type { Agent } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { SlidersHorizontal, PlusSquareIcon } from 'lucide-react';
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
import { uid } from '@/lib/utils';

// ASPICE V-Model Aligned Global Agent Templates
export const initialMockAgents: Agent[] = [
  {
    id: uid('global-agent-req'),
    name: 'ASPICE Requirements Elicitation & Analysis Agent',
    type: 'Analysis Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    config: { focus: "SYS.1, SYS.2, SWE.1", methods: ["interviews", "surveys", "workshops"], outputs: ["StakeholderRequirementsSpecification", "SystemRequirementsSpecification", "SoftwareRequirementsSpecification"] },
  },
  {
    id: uid('global-agent-sys-arch'),
    name: 'ASPICE System Architectural Design Agent',
    type: 'Design Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    config: { focus: "SYS.3", inputs: ["SystemRequirementsSpecification"], outputs: ["SystemArchitectureDesignDocument"], modelingLanguage: "SysML/UML" },
  },
  {
    id: uid('global-agent-sw-arch'),
    name: 'ASPICE Software Architectural Design Agent',
    type: 'Design Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    config: { focus: "SWE.2", inputs: ["SoftwareRequirementsSpecification"], outputs: ["SoftwareArchitectureDesignDocument"], designPatterns: ["Microservices", "Layered"] },
  },
  {
    id: uid('global-agent-sw-detail'),
    name: 'ASPICE Software Detailed Design & Implementation Agent',
    type: 'Development Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    config: { focus: "SWE.3, SWE.4 (Unit Const.)", inputs: ["SoftwareArchitectureDesignDocument"], outputs: ["SourceCode", "UnitTests"], languages: ["TypeScript", "Python"] },
  },
  {
    id: uid('global-agent-unit-verif'),
    name: 'ASPICE Software Unit Verification Agent',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    config: { focus: "SWE.4 (Unit Verif.)", inputs: ["SourceCode", "UnitTests"], testFrameworks: ["Jest", "Pytest"], coverageGoal: "90%" },
  },
  {
    id: uid('global-agent-sw-int-test'),
    name: 'ASPICE Software Integration Testing Agent',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    config: { focus: "SWE.5", inputs: ["IntegratedSoftware", "SoftwareArchitectureDesignDocument"], outputs: ["IntegrationTestReport"], strategy: "Bottom-up" },
  },
  {
    id: uid('global-agent-sw-qual-test'),
    name: 'ASPICE Software Qualification Testing Agent',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    config: { focus: "SWE.6", inputs: ["SoftwareProduct", "SoftwareRequirementsSpecification"], outputs: ["QualificationTestReport"], methods: ["BlackBox", "AlphaTesting"] },
  },
  {
    id: uid('global-agent-sys-int-test'),
    name: 'ASPICE System Integration Testing Agent',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    config: { focus: "SYS.4", inputs: ["IntegratedSystemComponents", "SystemArchitectureDesignDocument"], outputs: ["SystemIntegrationTestReport"] },
  },
  {
    id: uid('global-agent-sys-qual-test'),
    name: 'ASPICE System Qualification Testing Agent',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    config: { focus: "SYS.5", inputs: ["SystemProduct", "SystemRequirementsSpecification"], outputs: ["SystemQualificationTestReport"], validationMethods: ["UserScenarios", "PerformanceTesting"] },
  },
  {
    id: uid('global-agent-pm'),
    name: 'ASPICE Project Management Support Agent',
    type: 'Reporting Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
    config: { focus: "MAN.3, MAN.5", tasks: ["ProgressTracking", "RiskMonitoring", "StatusReporting"], tools: ["Jira_Interface", "Gantt_Generator"] },
  },
  {
    id: uid('global-agent-qa'),
    name: 'ASPICE Quality Assurance Support Agent',
    type: 'Custom Logic Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    config: { focus: "SUP.1, SUP.4", tasks: ["ProcessAudits", "MetricCollection", "ComplianceChecks", "ProblemResolutionTracking"], standards: ["ASPICE", "ISO26262"] },
  },
  {
    id: uid('global-agent-cm'),
    name: 'ASPICE Configuration Management Support Agent',
    type: 'CI/CD Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 13).toISOString(),
    config: { focus: "SUP.8, SUP.9, SUP.10", tools: ["Git", "BaselineManagement"], tasks: ["BaselineCreation", "ChangeRequestProcessing", "VersionControlManagement"] },
  },
  {
    id: uid('global-agent-doc'),
    name: 'ASPICE Technical Documentation Agent',
    type: 'Documentation Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    config: { focus: "SUP.9", documentTypes: ["RequirementsSpec", "ArchitectureDoc", "DesignDoc", "TestPlan", "TestReport", "UserManual"], outputFormats: ["PDF", "Markdown", "HTML"], standardCompliance: "ASPICE" },
  }
];

export const initialGlobalAgentsData = initialMockAgents;
export const AGENTS_STORAGE_KEY = 'ramboAgentGlobalAgents';

export default function AgentManagementPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const { toast } = useToast();
  const [isAddAgentDialogOpen, setIsAddAgentDialogOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const storedAgents = localStorage.getItem(AGENTS_STORAGE_KEY);
      if (storedAgents) {
        try {
          const parsedAgents = JSON.parse(storedAgents);
          if (Array.isArray(parsedAgents)) { // Basic validation
            setAgents(parsedAgents);
          } else {
            setAgents(initialGlobalAgentsData);
          }
        } catch (error) {
          console.error("Failed to parse agents from localStorage, initializing with mocks.", error);
          setAgents(initialGlobalAgentsData);
        }
      } else {
        setAgents(initialGlobalAgentsData);
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient && (agents.length > 0 || localStorage.getItem(AGENTS_STORAGE_KEY) !== null)) {
       localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
    }
  }, [agents, isClient]);


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
    setIsAddAgentDialogOpen(false);
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
            Agent Configuration Management (Global Templates)
          </PageHeaderHeading>
          <PageHeaderDescription>
            Manage global agent configurations and templates. These can be used as starting points for project-specific agents.
          </PageHeaderDescription>
        </div>
        <Button onClick={() => setIsAddAgentDialogOpen(true)} className="w-full mt-4 sm:w-auto sm:mt-0">
          <PlusSquareIcon className="mr-2 h-4 w-4" /> Add New Global Agent
        </Button>
      </PageHeader>

      <AgentManagementTable
        agents={agents}
        onEditAgent={handleOpenEditDialog}
        onRunAgent={handleRunAgent}
        onStopAgent={handleStopAgent}
        onDuplicateAgent={handleDuplicateAgent}
        onDeleteAgent={handleOpenDeleteDialog}
      />
      
      <AddAgentDialog 
        open={isAddAgentDialogOpen}
        onOpenChange={setIsAddAgentDialogOpen}
        onAddAgent={handleAddAgent}
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
