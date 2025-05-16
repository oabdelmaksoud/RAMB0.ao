
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, PlusCircle, LinkIcon, PlusSquareIcon, Edit2, Eye, SlidersHorizontal, Lightbulb, Play } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Project, Agent } from '@/types'; 
import { mockProjects } from '@/app/projects/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import AddTaskDialog from '@/components/features/projects/AddTaskDialog';
import { useToast } from '@/hooks/use-toast';
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

// Agent Management Imports (now integrated into this page)
import AgentManagementTable from '@/components/features/agent-management/AgentManagementTable';
import AddAgentDialog from '@/components/features/agent-management/AddAgentDialog';
import EditAgentDialog from '@/components/features/agent-management/EditAgentDialog';

// Workflow Designer Imports (now integrated into this page)
import WorkflowPalette from '@/components/features/workflow-designer/WorkflowPalette';
import WorkflowCanvas from '@/components/features/workflow-designer/WorkflowCanvasPlaceholder'; 

// AI Suggestions Imports (now integrated into this page)
import AgentConfigForm from '@/components/features/ai-suggestions/AgentConfigForm';


const projectStatusColors: { [key in Project['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

export const taskStatusColors: { [key: string]: string } = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'Blocked': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700',
};

export interface Task {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  assignedTo: string;
}

interface ProjectWorkflow {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive' | 'Draft';
  lastRun?: string; // ISO Date string
}

// Initial mock agents for a *new* project if no localStorage data is found for it.
const initialProjectScopedMockAgents: Agent[] = [ 
  { id: 'proj-agent-init-001', name: 'Project Kickstart Analyzer', type: 'Analysis Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { scope: 'initial_setup', autoRun: false } },
  { id: 'proj-agent-init-002', name: 'Basic Task Reporter', type: 'Reporting Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { frequency: 'on-demand' } },
];

const getAgentsStorageKey = (projectId: string) => `agentFlowAgents_project_${projectId}`;

const mockProjectWorkflows: ProjectWorkflow[] = [
    { id: 'wf-proj-001', name: 'Nightly Data Sync for Project', description: 'Synchronizes project data with the central repository.', status: 'Active', lastRun: new Date(Date.now() - 86400000).toISOString() },
    { id: 'wf-proj-002', name: 'Feature Release Workflow', description: 'Automates testing and deployment for new features specific to this project.', status: 'Draft', lastRun: new Date(Date.now() - 3*86400000).toISOString() },
];

const workflowStatusColors: { [key in ProjectWorkflow['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  Inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  Draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
};


export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mockProgress, setMockProgress] = useState(0);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const { toast } = useToast();

  // State for Agent Management within Project
  const [projectAgents, setProjectAgents] = useState<Agent[]>([]);
  const [isEditAgentDialogOpen, setIsEditAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isDeleteAgentDialogOpen, setIsDeleteAgentDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  
  // Load project details and project-specific agents
  useEffect(() => {
    setIsClient(true);
    const foundProject = mockProjects.find(p => p.id === projectId);
    if (foundProject) {
      setProject(foundProject);
      setMockProgress((foundProject.id.charCodeAt(foundProject.id.length - 1) % 60) + 30); 
      
      const initialMockTasks: Task[] = [
        { id: `${projectId}-task-1`, title: `Define ${foundProject.name} scope`, status: 'Done', assignedTo: 'AI Agent Alpha' },
        { id: `${projectId}-task-2`, title: `Develop core logic for ${foundProject.name}`, status: 'In Progress', assignedTo: 'AI Agent Beta' },
        { id: `${projectId}-task-3`, title: `Test ${foundProject.name} integration`, status: 'To Do', assignedTo: 'AI Agent Gamma' },
        { id: `${projectId}-task-4`, title: `Deploy ${foundProject.name} to staging`, status: 'Blocked', assignedTo: 'DevOps Team' },
      ];
      setTasks(initialMockTasks.slice(0, Math.floor(Math.random() * initialMockTasks.length) + 1));

      const storageKey = getAgentsStorageKey(projectId);
      const storedAgents = localStorage.getItem(storageKey);
      if (storedAgents) {
        try {
          setProjectAgents(JSON.parse(storedAgents));
        } catch (error) {
          console.error(`Failed to parse agents for project ${projectId} from localStorage`, error);
          setProjectAgents(initialProjectScopedMockAgents); 
        }
      } else {
        setProjectAgents(initialProjectScopedMockAgents); 
      }
    }
  }, [projectId]);

  // Save project-specific agents to localStorage whenever they change
  useEffect(() => {
    if (projectId && (projectAgents.length > 0 || localStorage.getItem(getAgentsStorageKey(projectId)))) {
      localStorage.setItem(getAgentsStorageKey(projectId), JSON.stringify(projectAgents));
    }
  }, [projectAgents, projectId]);

  const formatDate = (dateString: string | undefined, options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) => {
    if (!isClient || !dateString) return 'Loading date...';
    try {
       if (!dateString.includes('-') && !dateString.includes('/') && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(dateString)) return dateString;
      return format(parseISO(dateString), options.year ? "MMMM d, yyyy 'at' hh:mm a" : "MMMM d, hh:mm a");
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  const handleAddTask = (newTaskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now().toString().slice(-5)}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
    setIsAddTaskDialogOpen(false);
    toast({ title: "Task Added", description: `Task "${newTask.title}" has been added to project "${project?.name}".` });
  };

  // Agent Management Handlers (scoped to projectAgents)
  const handleAddProjectAgent = (newAgentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => {
    const newAgent: Agent = {
      ...newAgentData,
      id: `cfg-proj-${projectId}-${Date.now().toString().slice(-3)}-${Math.random().toString(36).substring(2, 5)}`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
     toast({ title: "Project Agent Added", description: `Agent "${newAgent.name}" created for project "${project?.name}".` });
  };

  const handleOpenEditAgentDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setIsEditAgentDialogOpen(true);
  };

  const handleUpdateProjectAgent = (updatedAgent: Agent) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === updatedAgent.id ? { ...updatedAgent, lastActivity: new Date().toISOString() } : agent
      )
    );
    setIsEditAgentDialogOpen(false);
    setEditingAgent(null);
    toast({ title: "Project Agent Updated", description: `Agent "${updatedAgent.name}" configuration saved for project "${project?.name}".` });
  };
  
  const handleRunProjectAgent = (agentId: string) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Running', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = projectAgents.find(a => a.id === agentId)?.name;
    toast({ title: "Project Agent Started", description: `Agent "${agentName || agentId}" is now Running in project "${project?.name}".` });
  };

  const handleStopProjectAgent = (agentId: string) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Stopped', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = projectAgents.find(a => a.id === agentId)?.name;
    toast({ title: "Project Agent Stopped", description: `Agent "${agentName || agentId}" has been Stopped in project "${project?.name}".` });
  };

  const handleDuplicateProjectAgent = (agentToDuplicate: Agent) => {
    const newAgent: Agent = {
      ...agentToDuplicate,
      id: `cfg-proj-${projectId}-${Date.now().toString().slice(-3)}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${agentToDuplicate.name} - Copy`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
    toast({ title: "Project Agent Duplicated", description: `Agent "${agentToDuplicate.name}" duplicated for project "${project?.name}".` });
  };

  const handleOpenDeleteAgentDialog = (agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteAgentDialogOpen(true);
  };

  const confirmDeleteProjectAgent = () => {
    if (agentToDelete) {
      setProjectAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentToDelete.id));
      toast({ title: "Project Agent Deleted", description: `Agent "${agentToDelete.name}" has been deleted from project "${project?.name}".`, variant: 'destructive' });
      setAgentToDelete(null);
      setIsDeleteAgentDialogOpen(false);
    }
  };


  if (!project) {
    return (
      <div className="container mx-auto">
        <PageHeader><PageHeaderHeading>Loading Project...</PageHeaderHeading></PageHeader>
        <div className="text-center py-10"><p>Loading project data or project not found.</p></div>
      </div>
    );
  }

  const mockRecentActivities = [
    `Agent "Data Analyzer" completed task "Analyze Q3 Sales Data" for project ${project.name}.`,
    `Workflow "Nightly Backup for ${project.name}" initiated successfully.`,
    `User 'demo_user' updated configuration for Agent 'Basic Task Reporter' in project ${project.name}.`
  ];

  return (
    <div className="container mx-auto">
      <PageHeader>
        <div className="flex items-start sm:items-center space-x-4">
           {project.thumbnailUrl && (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border shadow-md hidden sm:block">
              <Image src={project.thumbnailUrl} alt={`${project.name} thumbnail`} fill style={{ objectFit: 'cover' }} data-ai-hint="project abstract" />
            </div>
          )}
          <div>
            <PageHeaderHeading><Briefcase className="mr-3 inline-block h-8 w-8" />{project.name}</PageHeaderHeading>
            <PageHeaderDescription className="mt-1">{project.description}</PageHeaderDescription>
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-lg">Project Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className={cn("capitalize", projectStatusColors[project.status])}>{project.status}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Project ID:</span>
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{project.id}</span>
            </div>
            <div className="flex items-center"><CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" /><span className="text-muted-foreground">Last Updated:</span></div>
            <p className="ml-6">{isClient ? formatDate(project.lastUpdated) : 'Processing...'}</p>
             {project.agentCount !== undefined && (
              <div className="flex items-center"><Bot className="h-4 w-4 mr-2 text-muted-foreground" /><span className="text-muted-foreground">Agents:</span><span className="ml-auto font-medium">{projectAgents.length}</span></div>
            )}
            {project.workflowCount !== undefined && (
              <div className="flex items-center"><WorkflowIcon className="h-4 w-4 mr-2 text-muted-foreground" /><span className="text-muted-foreground">Workflows:</span><span className="ml-auto font-medium">{mockProjectWorkflows.length}</span></div>
            )}
          </CardContent>
        </Card>
         <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Quick Overview</CardTitle><CardDescription>A brief summary of the project's current state.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1"><h4 className="font-semibold text-sm text-muted-foreground flex items-center"><TrendingUp className="h-4 w-4 mr-2" /> Project Progress</h4><span className="text-sm font-medium">{mockProgress}%</span></div>
              <Progress value={mockProgress} aria-label={`${mockProgress}% project progress`} className="h-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/50 rounded-lg shadow-sm"><h4 className="font-semibold text-sm text-muted-foreground mb-1">Pending Tasks</h4><p className="text-2xl font-bold">{tasks.filter(t => t.status === 'To Do' || t.status === 'In Progress').length}</p></div>
                 <div className="p-4 bg-accent/50 rounded-lg shadow-sm"><h4 className="font-semibold text-sm text-muted-foreground mb-1">Active Agents</h4><p className="text-2xl font-bold">{projectAgents.filter(a => a.status === 'Running').length}</p></div>
                <div className="p-4 bg-accent/50 rounded-lg shadow-sm"><h4 className="font-semibold text-sm text-muted-foreground mb-1">Active Workflows</h4><p className="text-2xl font-bold">{mockProjectWorkflows.filter(w => w.status === 'Active').length}</p></div>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center"><ActivityIcon className="h-4 w-4 mr-2" /> Recent Activity</h4>
              <ul className="space-y-2 text-sm max-h-40 overflow-y-auto pr-2">
                {mockRecentActivities.map((activity, index) => (<li key={index} className="p-2 bg-background rounded-md border text-muted-foreground text-xs">{activity}</li>))}
                 {mockRecentActivities.length === 0 && <p className="text-muted-foreground text-xs text-center py-2">No recent activity.</p>}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Separator className="my-6" />

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:w-auto xl:inline-flex mb-4">
          <TabsTrigger value="tasks"><ListChecks className="mr-2 h-4 w-4"/>Tasks</TabsTrigger>
          <TabsTrigger value="projectAgents"><SlidersHorizontal className="mr-2 h-4 w-4"/>Project Agents</TabsTrigger>
          <TabsTrigger value="projectWorkflows"><WorkflowIcon className="mr-2 h-4 w-4"/>Project Workflows & Design</TabsTrigger>
          <TabsTrigger value="aiSuggestions"><Lightbulb className="mr-2 h-4 w-4"/>AI Agent Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Task Management</CardTitle><CardDescription>Track and manage all tasks for project "{project.name}".</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => setIsAddTaskDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Add New Task</Button>
            </CardHeader>
            <CardContent>
              {tasks.length > 0 ? (
                 <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {tasks.map(task => (
                    <Card key={task.id} className="shadow-sm bg-card flex flex-col">
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between gap-2"><CardTitle className="text-base font-medium leading-tight">{task.title}</CardTitle><Badge variant="outline" className={cn("text-xs capitalize whitespace-nowrap shrink-0", taskStatusColors[task.status])}>{task.status}</Badge></div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-sm flex-grow"><p className="text-muted-foreground">Assigned to: {task.assignedTo}</p></CardContent>
                      <CardFooter className="p-4 border-t flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs flex-1" disabled><Eye className="mr-1.5 h-3.5 w-3.5" /> View</Button>
                        <Button variant="outline" size="sm" className="text-xs flex-1" disabled><Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                 <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
                  <ListChecks className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-lg font-medium text-muted-foreground">No tasks found for this project.</p>
                  <p className="text-sm text-muted-foreground/80 mt-1 mb-4">Add a task to get started!</p>
                  <Button variant="outline" size="sm" onClick={() => setIsAddTaskDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />Add First Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projectAgents">
            <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4">
                <div>
                <PageHeaderHeading className="text-2xl">Project Agent Management</PageHeaderHeading>
                <PageHeaderDescription>Manage agent configurations specific to project "{project.name}".</PageHeaderDescription>
                </div>
                <AddAgentDialog onAddAgent={handleAddProjectAgent} />
            </PageHeader>
            <AgentManagementTable
                agents={projectAgents}
                onEditAgent={handleOpenEditAgentDialog}
                onRunAgent={handleRunProjectAgent}
                onStopAgent={handleStopProjectAgent}
                onDuplicateAgent={handleDuplicateProjectAgent}
                onDeleteAgent={handleOpenDeleteAgentDialog}
            />
        </TabsContent>

        <TabsContent value="projectWorkflows">
            <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4">
                 <div>
                    <PageHeaderHeading className="text-2xl">Project Workflow Designer</PageHeaderHeading>
                    <PageHeaderDescription>Visually design and manage workflows for project "{project.name}".</PageHeaderDescription>
                </div>
                 {/* Placeholder for "Create New Project Workflow" button or similar */}
            </PageHeader>
            <div className="flex flex-col lg:flex-row gap-6 mt-2">
                <div className="lg:w-1/4 min-w-[280px] max-w-full lg:max-w-[320px]">
                    <WorkflowPalette />
                </div>
                <div className="flex-grow h-[600px] lg:h-auto min-h-[400px] border rounded-lg p-1"> {/* Added p-1 to canvas parent */}
                    <WorkflowCanvas />
                </div>
            </div>
            <Separator className="my-6"/>
            <Card>
                <CardHeader>
                    <CardTitle>Existing Workflows for "{project.name}"</CardTitle>
                    <CardDescription>Manage and monitor workflows associated with this project.</CardDescription>
                </CardHeader>
                <CardContent>
                    {mockProjectWorkflows.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {mockProjectWorkflows.map(workflow => (
                                <Card key={workflow.id} className="shadow-sm bg-card flex flex-col">
                                    <CardHeader className="p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <CardTitle className="text-base font-medium leading-tight">{workflow.name}</CardTitle>
                                            <Badge variant="outline" className={cn("text-xs capitalize whitespace-nowrap shrink-0", workflowStatusColors[workflow.status])}>
                                                {workflow.status}
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-xs line-clamp-2 h-[2.2em]">{workflow.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 text-sm flex-grow">
                                        <p className="text-muted-foreground text-xs">
                                            Last Run: {workflow.lastRun ? formatDate(workflow.lastRun, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'Never'}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="p-4 border-t flex gap-2">
                                        <Button variant="outline" size="sm" className="text-xs flex-1" disabled><Eye className="mr-1.5 h-3.5 w-3.5" /> View/Edit</Button>
                                        <Button variant="default" size="sm" className="text-xs flex-1" disabled><Play className="mr-1.5 h-3.5 w-3.5" /> Run Workflow</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
                            <WorkflowIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                            <p className="text-lg font-medium text-muted-foreground">No workflows found for this project.</p>
                            <p className="text-sm text-muted-foreground/80 mt-1">Design a workflow using the canvas above to get started!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="aiSuggestions">
            <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4">
                <div>
                    <PageHeaderHeading className="text-2xl">AI-Powered Agent Configuration</PageHeaderHeading>
                    <PageHeaderDescription>Get optimal agent configuration suggestions for tasks within project "{project.name}".</PageHeaderDescription>
                </div>
            </PageHeader>
            <div className="max-w-2xl">
                <AgentConfigForm />
            </div>
        </TabsContent>

      </Tabs>
      <AddTaskDialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen} onAddTask={handleAddTask} />
      
      {editingAgent && (
        <EditAgentDialog
          agent={editingAgent}
          open={isEditAgentDialogOpen}
          onOpenChange={setIsEditAgentDialogOpen}
          onUpdateAgent={handleUpdateProjectAgent}
        />
      )}

      {agentToDelete && (
         <AlertDialog open={isDeleteAgentDialogOpen} onOpenChange={setIsDeleteAgentDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this project agent?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. This will permanently delete the agent "{agentToDelete.name}" from project "{project?.name}".</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setAgentToDelete(null); setIsDeleteAgentDialogOpen(false); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteProjectAgent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}

    

    