
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, PlusCircle, LinkIcon, PlusSquareIcon, Edit2, Eye, SlidersHorizontal, Lightbulb, Play, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, EyeIcon, X, Diamond, Users, FolderGit2, ListTree } from 'lucide-react'; // Added ListTree
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback, DragEvent as ReactDragEvent } from 'react';
import type { Project, Task, Agent, ProjectWorkflow, WorkflowNode, WorkflowEdge } from '@/types';
import { initialMockProjects } from '@/app/projects/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { format, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import AddTaskDialog from '@/components/features/projects/AddTaskDialog';
import EditTaskDialog from '@/components/features/projects/EditTaskDialog';
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
import Link from 'next/link';

// Agent Management Imports
import AgentManagementTable from '@/components/features/agent-management/AgentManagementTable';
import AddAgentDialog from '@/components/features/agent-management/AddAgentDialog';
import EditAgentDialog from '@/components/features/agent-management/EditAgentDialog';

// Workflow Designer Imports
import WorkflowPalette from '@/components/features/workflow-designer/WorkflowPalette';
import WorkflowCanvas from '@/components/features/workflow-designer/WorkflowCanvasPlaceholder';
import AddWorkflowDialog from '@/components/features/projects/AddWorkflowDialog';

// AI Suggestions Imports
import AgentConfigForm from '@/components/features/ai-suggestions/AgentConfigForm';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ProjectGanttChartView from '@/components/features/projects/ProjectGanttChartView';


const projectStatusColors: { [key in Project['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

export const taskStatuses: Task['status'][] = ['To Do', 'In Progress', 'Done', 'Blocked'];

export const taskStatusColors: { [key in Task['status']]: string } = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'Blocked': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700',
};

const initialProjectScopedMockAgents: Agent[] = [
  { id: 'proj-agent-init-001', name: 'Project Kickstart Analyzer', type: 'Analysis Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { scope: 'initial_setup', autoRun: false } },
  { id: 'proj-agent-init-002', name: 'Basic Task Reporter', type: 'Reporting Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { frequency: 'on-demand' } },
];

const PROJECTS_STORAGE_KEY = 'agentFlowProjects';
const getAgentsStorageKey = (projectId: string) => `agentFlowAgents_project_${projectId}`;
const getTasksStorageKey = (projectId: string) => `agentFlowTasks_project_${projectId}`;
const getWorkflowsStorageKey = (projectId: string) => `agentFlowWorkflows_project_${projectId}`;


const workflowStatusColors: { [key in ProjectWorkflow['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  Inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  Draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
};

const predefinedWorkflowsData = (projectId: string): ProjectWorkflow[] => [
    {
        id: `pd-wf-${projectId}-1-${Date.now().toString().slice(-4)}`,
        name: "Software Development Lifecycle",
        description: "A standard workflow for planning, developing, testing, and deploying software features.",
        status: 'Draft',
        lastRun: undefined,
        nodes: [
            { id: `sdlc-${projectId}-node-1`, name: 'Planning Phase', type: 'Custom Logic Agent', x: 50, y: 50, config: {} },
            { id: `sdlc-${projectId}-node-2`, name: 'Development Sprint', type: 'Code Review Agent', x: 250, y: 150, config: {} },
            { id: `sdlc-${projectId}-node-3`, name: 'QA Testing', type: 'Testing Agent', x: 50, y: 250, config: {} },
        ],
        edges: [
            { id: `sdlc-${projectId}-edge-1`, sourceNodeId: `sdlc-${projectId}-node-1`, targetNodeId: `sdlc-${projectId}-node-2` },
            { id: `sdlc-${projectId}-edge-2`, sourceNodeId: `sdlc-${projectId}-node-2`, targetNodeId: `sdlc-${projectId}-node-3` },
        ],
    },
    {
        id: `pd-wf-${projectId}-2-${Date.now().toString().slice(-4)}`,
        name: "Software Testing Cycle",
        description: "A comprehensive workflow for various testing phases including unit, integration, and user acceptance testing.",
        status: 'Draft',
        lastRun: undefined,
        nodes: [
            { id: `stc-${projectId}-node-1`, name: 'Unit Tests', type: 'Testing Agent', x: 100, y: 80, config: {} },
            { id: `stc-${projectId}-node-2`, name: 'Integration Tests', type: 'Testing Agent', x: 300, y: 180, config: {} },
        ],
        edges: [
            { id: `stc-${projectId}-edge-1`, sourceNodeId: `stc-${projectId}-node-1`, targetNodeId: `stc-${projectId}-node-2` },
        ],
    },
];


export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mockProgress, setMockProgress] = useState(0);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isViewingTask, setIsViewingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);

  const [draggingOverStatus, setDraggingOverStatus] = useState<Task['status'] | null>(null);
  const [reorderTargetTaskId, setReorderTargetTaskId] = useState<string | null>(null);


  const { toast } = useToast();

  // State for Agent Management within Project
  const [projectAgents, setProjectAgents] = useState<Agent[]>([]);
  const [isEditAgentDialogOpen, setIsEditAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isDeleteAgentDialogOpen, setIsDeleteAgentDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  // State for Project Workflows
  const [projectWorkflows, setProjectWorkflows] = useState<ProjectWorkflow[]>([]);
  const [isAddWorkflowDialogOpen, setIsAddWorkflowDialogOpen] = useState(false);
  const [designingWorkflow, setDesigningWorkflow] = useState<ProjectWorkflow | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<ProjectWorkflow | null>(null);
  const [isDeleteWorkflowDialogOpen, setIsDeleteWorkflowDialogOpen] = useState(false);


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!projectId || !isClient) return;

    const storedProjectsJSON = localStorage.getItem(PROJECTS_STORAGE_KEY);
    const allProjects: Project[] = storedProjectsJSON ? JSON.parse(storedProjectsJSON) : initialMockProjects;
    const foundProject = allProjects.find(p => p.id === projectId);

    if (foundProject) {
      setProject(foundProject);
      setMockProgress((foundProject.id.charCodeAt(foundProject.id.length - 1) % 60) + 30);

      const tasksStorageKey = getTasksStorageKey(projectId);
      const storedTasks = localStorage.getItem(tasksStorageKey);
      const today = startOfDay(new Date());

      const initialMockTasksForProject: Task[] = [
        { id: `${projectId}-task-1`, title: `Define ${foundProject.name} scope`, status: 'Done', assignedTo: 'AI Agent Alpha', startDate: format(addDays(today, -5), 'yyyy-MM-dd'), durationDays: 2, progress: 100, parentId: null, dependencies: [], isMilestone: false },
        { id: `${projectId}-task-2`, title: `Develop core logic for ${foundProject.name}`, status: 'In Progress', assignedTo: 'AI Agent Beta', startDate: format(today, 'yyyy-MM-dd'), durationDays: 5, progress: 40, parentId: null, dependencies: [`${projectId}-task-1`], isMilestone: false },
        { id: `${projectId}-task-sub-1`, title: `Sub-task for core logic`, status: 'To Do', assignedTo: 'AI Agent Beta', startDate: format(addDays(today,1), 'yyyy-MM-dd'), durationDays: 2, progress: 0, parentId: `${projectId}-task-2`, dependencies: [], isMilestone: false },
        { id: `${projectId}-task-3`, title: `Test ${foundProject.name} integration`, status: 'To Do', assignedTo: 'AI Agent Gamma', startDate: format(addDays(today, 3), 'yyyy-MM-dd'), durationDays: 3, progress: 0, parentId: null, dependencies: [`${projectId}-task-2`], isMilestone: false },
        { id: `${projectId}-milestone-1`, title: `Project Kick-off Meeting`, status: 'Done', assignedTo: 'Project Lead', startDate: format(addDays(today, -10), 'yyyy-MM-dd'), durationDays: 0, progress: 100, isMilestone: true, parentId: null, dependencies: [] },
      ];

      if (storedTasks) {
        try {
          setTasks(JSON.parse(storedTasks));
        } catch (error) {
          console.error(`Failed to parse tasks for project ${projectId} from localStorage`, error);
          setTasks(initialMockTasksForProject);
        }
      } else {
        setTasks(initialMockTasksForProject);
      }

      const agentsStorageKey = getAgentsStorageKey(projectId);
      const storedAgents = localStorage.getItem(agentsStorageKey);
      if (storedAgents) {
        try {
          setProjectAgents(JSON.parse(storedAgents));
        } catch (error) {
          console.error(`Failed to parse agents for project ${projectId} from localStorage`, error);
          setProjectAgents(initialProjectScopedMockAgents.map(a => ({...a, id: `${a.id}-${projectId}`})));
        }
      } else {
        setProjectAgents(initialProjectScopedMockAgents.map(a => ({...a, id: `${a.id}-${projectId}`})));
      }

      const workflowsStorageKey = getWorkflowsStorageKey(projectId);
      const storedWorkflows = localStorage.getItem(workflowsStorageKey);
      if (storedWorkflows) {
        try {
          setProjectWorkflows(JSON.parse(storedWorkflows));
        } catch (error) {
          console.error(`Failed to parse workflows for project ${projectId} from localStorage`, error);
           const defaultWorkflowsWithIds = predefinedWorkflowsData(projectId).map(wf => ({
            ...wf,
            nodes: wf.nodes || [],
            edges: wf.edges || [],
          }));
          setProjectWorkflows(defaultWorkflowsWithIds);
        }
      } else {
        const defaultWorkflowsWithIds = predefinedWorkflowsData(projectId).map(wf => ({
            ...wf,
            nodes: wf.nodes || [],
            edges: wf.edges || [],
          }));
        setProjectWorkflows(defaultWorkflowsWithIds);
      }

    }
  }, [projectId, isClient]);

  useEffect(() => {
    if (isClient && projectId && (projectAgents.length > 0 || localStorage.getItem(getAgentsStorageKey(projectId)) !== null)) {
      localStorage.setItem(getAgentsStorageKey(projectId), JSON.stringify(projectAgents));
    }
  }, [projectAgents, projectId, isClient]);

  useEffect(() => {
    if (isClient && projectId && (tasks.length > 0 || localStorage.getItem(getTasksStorageKey(projectId)) !== null )) {
      localStorage.setItem(getTasksStorageKey(projectId), JSON.stringify(tasks));
    }
  }, [tasks, projectId, isClient]);

 useEffect(() => {
    if (isClient && projectId ) {
        const currentWorkflows = localStorage.getItem(getWorkflowsStorageKey(projectId));
        if (projectWorkflows.length > 0 || currentWorkflows !== null) {
             try {
                localStorage.setItem(getWorkflowsStorageKey(projectId), JSON.stringify(projectWorkflows.map(wf => ({...wf, nodes: wf.nodes || [], edges: wf.edges || [] }))));
                 // console.log(`PROJECT_DETAIL_PAGE: Saving projectWorkflows to localStorage for project ${projectId}`, JSON.stringify(projectWorkflows.map(wf => ({...wf, nodes: wf.nodes || [], edges: wf.edges || [] })), null, 2) );
            } catch (e) {
                console.error("Error stringifying or saving project workflows:", e);
                toast({
                    title: "Save Error",
                    description: "Could not save workflow changes due to a storage error.",
                    variant: "destructive",
                });
            }
        }
    }
  }, [projectWorkflows, projectId, isClient, toast]);

 useEffect(() => {
    if (designingWorkflow && projectWorkflows) {
      const updatedDesigningWorkflowInstance = projectWorkflows.find(wf => wf.id === designingWorkflow.id);
      if (updatedDesigningWorkflowInstance &&
          (JSON.stringify(updatedDesigningWorkflowInstance.nodes) !== JSON.stringify(designingWorkflow.nodes) ||
           JSON.stringify(updatedDesigningWorkflowInstance.edges) !== JSON.stringify(designingWorkflow.edges))) {
          setDesigningWorkflow(updatedDesigningWorkflowInstance);
      } else if (!updatedDesigningWorkflowInstance && designingWorkflow) {
          setDesigningWorkflow(null);
      }
    }
  }, [projectWorkflows, designingWorkflow?.id]);


  const formatDate = (dateString: string | undefined, options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) => {
    if (!isClient || !dateString) return 'Loading date...';
    try {
       if (!dateString.includes('-') && !dateString.includes('/') && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(dateString)) return dateString;
      return format(parseISO(dateString), options.year ? "MMMM d, yyyy 'at' hh:mm a" : "MMMM d, hh:mm a");
    } catch (error) {
      return dateString;
    }
  };

  const handleAddTask = (taskData: Omit<Task, 'id'>) => {
    let newTask: Task = {
      ...taskData,
      id: `task-proj-${projectId}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`,
      progress: taskData.isMilestone ? (taskData.status === 'Done' ? 100 : (taskData.progress === undefined ? 0 : taskData.progress)) : (taskData.progress === undefined ? 0 : taskData.progress),
      durationDays: taskData.isMilestone ? 0 : (taskData.durationDays === undefined ? 1 : taskData.durationDays),
      status: taskData.isMilestone ? (taskData.status === 'Done' ? 'Done' : 'To Do') : taskData.status,
      parentId: taskData.parentId === "" ? null : taskData.parentId,
      dependencies: taskData.dependencies || [],
      isMilestone: taskData.isMilestone || false,
    };

    let autoStarted = false;
    let targetAgentName: string | null = null;

    if (!newTask.isMilestone && taskData.assignedTo && taskData.assignedTo !== "Unassigned") {
      const assignedAgent = projectAgents.find(agent => agent.name === taskData.assignedTo);

      if (assignedAgent) {
        targetAgentName = assignedAgent.name;
        if (assignedAgent.status === 'Running') {
          newTask.status = 'In Progress';
          newTask.progress = newTask.progress === 0 ? 10 : newTask.progress;
          setProjectAgents(prevAgents =>
            prevAgents.map(agent =>
              agent.id === assignedAgent.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
            )
          );
          autoStarted = true;
        }
      }
    }

    setTasks(prevTasks => [newTask, ...prevTasks]);
    setIsAddTaskDialogOpen(false);

    if (autoStarted && targetAgentName) {
      toast({
        title: "Task In Progress",
        description: `Task "${newTask.title}" assigned to agent "${targetAgentName}" and is now being processed.`
      });
    } else if (targetAgentName) {
      toast({
        title: "Task Added",
        description: `Task "${newTask.title}" assigned to agent "${targetAgentName}". Run the agent to start processing.`
      });
    } else {
      toast({
        title: newTask.isMilestone ? "Milestone Added" : "Task Added",
        description: `${newTask.isMilestone ? "Milestone" : "Task"} "${newTask.title}" has been added to project "${project?.name}".`
      });
    }
  };

  const handleOpenEditTaskDialog = (task: Task, isViewMode: boolean = false) => {
    setEditingTask(task);
    setIsViewingTask(isViewMode);
    setIsEditTaskDialogOpen(true);
  };

  const handleUpdateTask = (updatedTaskData: Task) => {
    const taskToUpdate: Task = {
        ...updatedTaskData,
        durationDays: updatedTaskData.isMilestone ? 0 : (updatedTaskData.durationDays === undefined ? 1 : updatedTaskData.durationDays),
        progress: updatedTaskData.isMilestone ? (updatedTaskData.status === 'Done' ? 100 : (updatedTaskData.progress === undefined ? 0 : updatedTaskData.progress)) : (updatedTaskData.progress === undefined ? 0 : updatedTaskData.progress),
        status: updatedTaskData.isMilestone ? (updatedTaskData.progress === 100 ? 'Done' : 'To Do') : updatedTaskData.status,
        parentId: updatedTaskData.parentId === "" ? null : updatedTaskData.parentId,
        dependencies: updatedTaskData.dependencies || [],
    }

    setTasks(prevTasks => prevTasks.map(task => task.id === taskToUpdate.id ? taskToUpdate : task));
    setIsEditTaskDialogOpen(false);
    setEditingTask(null);
    setIsViewingTask(false);
    toast({ title: taskToUpdate.isMilestone ? "Milestone Updated" : "Task Updated", description: `${taskToUpdate.isMilestone ? "Milestone" : "Task"} "${taskToUpdate.title}" has been updated.`});
  };

  const handleOpenDeleteTaskDialog = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteTaskDialogOpen(true);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDelete.id));
      toast({ title: taskToDelete.isMilestone ? "Milestone Deleted" : "Task Deleted", description: `${taskToDelete.isMilestone ? "Milestone" : "Task"} "${taskToDelete.title}" has been deleted from project "${project?.name}".`, variant: 'destructive' });
      setTaskToDelete(null);
      setIsDeleteTaskDialogOpen(false);
    }
  };

  const handleAddProjectAgent = (newAgentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => {
    const newAgent: Agent = {
      ...newAgentData,
      id: `cfg-proj-${projectId}-${Date.now().toString().slice(-3)}-${Math.random().toString(36).substring(2, 5)}`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
     toast({
      title: "Project Agent Added",
      description: `Agent "${newAgent.name}" has been added to project "${project?.name}".`,
    });
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
     toast({ title: "Project Agent Updated", description: `Agent "${updatedAgent.name}" updated for project "${project?.name}".` });
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

  const handleAddProjectWorkflow = (workflowData: { name: string; description: string }) => {
    const newWorkflow: ProjectWorkflow = {
      id: `wf-proj-${projectId}-${Date.now().toString().slice(-3)}-${Math.random().toString(36).substring(2, 5)}`,
      name: workflowData.name,
      description: workflowData.description,
      status: 'Draft',
      lastRun: undefined,
      nodes: [],
      edges: [],
    };
    setProjectWorkflows(prevWorkflows => [newWorkflow, ...prevWorkflows]);
    setIsAddWorkflowDialogOpen(false);
    toast({ title: "Project Workflow Added", description: `Workflow "${newWorkflow.name}" created for project "${project?.name}".` });
  };

  const handleOpenWorkflowDesigner = (workflow: ProjectWorkflow) => {
    setDesigningWorkflow(workflow);
  };

  const handleCloseWorkflowDesigner = () => {
    toast({ title: "Workflow Design Closed", description: `Stopped designing workflow: "${designingWorkflow?.name}". Changes are saved automatically.`});
    setDesigningWorkflow(null);
  };

  const handleWorkflowNodesChange = useCallback((updatedNodes: WorkflowNode[]) => {
    if (!designingWorkflow) {
        // console.warn("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange called but no designingWorkflow is set.");
        return;
    }
    // console.log(`PROJECT_DETAIL_PAGE: handleWorkflowNodesChange received updatedNodes. Length: ${updatedNodes.length}, IDs: ${updatedNodes.map(n=>n.id).join(', ')}`);
    // console.log(`PROJECT_DETAIL_PAGE: Current designingWorkflow ID: ${designingWorkflow.id}, Name: ${designingWorkflow.name}`);

    setProjectWorkflows(prevWorkflows => {
        // console.log(`PROJECT_DETAIL_PAGE: Inside setProjectWorkflows. prevWorkflows length: ${prevWorkflows.length}`);
        const newWorkflowsArray = prevWorkflows.map(wf => {
            if (wf.id === designingWorkflow.id) {
                // console.log(`PROJECT_DETAIL_PAGE: Updating nodes for workflow ID: ${wf.id}. New nodes count: ${updatedNodes.length}`);
                return { ...wf, nodes: updatedNodes };
            }
            return wf;
        });
        // newWorkflowsArray.forEach(wf => {
           // console.log(`PROJECT_DETAIL_PAGE: Workflow in newWorkflows array (after map). ID: ${wf.id}, Nodes count: ${wf.nodes?.length || 0}, Nodes IDs: ${wf.nodes?.map(n=>n.id).join(', ') || 'N/A'}`);
        // });
        return newWorkflowsArray;
    });
  }, [designingWorkflow, setProjectWorkflows]);


  const handleWorkflowEdgesChange = useCallback((updatedEdges: WorkflowEdge[]) => {
     if (designingWorkflow) {
        setProjectWorkflows(prevWorkflows =>
            prevWorkflows.map(wf =>
                wf.id === designingWorkflow.id ? { ...wf, edges: updatedEdges } : wf
            )
        );
    }
  }, [designingWorkflow, setProjectWorkflows]);

  const handleOpenDeleteWorkflowDialog = (workflow: ProjectWorkflow) => {
    setWorkflowToDelete(workflow);
    setIsDeleteWorkflowDialogOpen(true);
  };

  const confirmDeleteWorkflow = () => {
    if (workflowToDelete) {
      setProjectWorkflows(prevWorkflows => prevWorkflows.filter(wf => wf.id !== workflowToDelete.id));
      toast({ title: "Workflow Deleted", description: `Workflow "${workflowToDelete.name}" has been deleted from project "${project?.name}".`, variant: 'destructive' });
      setWorkflowToDelete(null);
      setIsDeleteWorkflowDialogOpen(false);
      if (designingWorkflow && designingWorkflow.id === workflowToDelete.id) {
        setDesigningWorkflow(null);
      }
    }
  };

  // Kanban Drag and Drop Handlers
   const handleTaskCardDragStart = (event: ReactDragEvent<HTMLDivElement>, task: Task) => {
    event.dataTransfer.setData('taskId', task.id);
    event.dataTransfer.setData('taskStatus', task.status); 
  };

  const handleColumnDragOver = (event: ReactDragEvent<HTMLDivElement>, status: Task['status']) => {
    event.preventDefault();
    setDraggingOverStatus(status);
  };

  const handleColumnDragLeave = () => {
    setDraggingOverStatus(null);
  };

  const handleColumnDrop = (event: ReactDragEvent<HTMLDivElement>, newStatus: Task['status']) => {
    event.preventDefault();
    const draggedTaskId = event.dataTransfer.getData('taskId');
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status']; 
    setDraggingOverStatus(null);
    setReorderTargetTaskId(null); 

    const taskToMove = tasks.find(task => task.id === draggedTaskId);
    if (!taskToMove) return;

    if (sourceTaskStatus !== newStatus) { 
      const updatedTask: Task = {
        ...taskToMove,
        status: newStatus,
        progress: newStatus === 'Done' ? 100 : (taskToMove.isMilestone ? taskToMove.progress : (newStatus === 'To Do' || newStatus === 'Blocked' ? 0 : taskToMove.progress)),
      };
      const updatedTasks = tasks.map(task => (task.id === draggedTaskId ? updatedTask : task));
      setTasks(updatedTasks);
      toast({
        title: "Task Status Updated",
        description: `Task "${updatedTask.title}" moved to "${newStatus}".`,
      });
    } else { 
        setTasks(prevTasks => {
            const taskToReorder = prevTasks.find(t => t.id === draggedTaskId);
            if (!taskToReorder) return prevTasks;

            const otherTasks = prevTasks.filter(t => t.id !== draggedTaskId);
            const finalReorderedTasks = [...otherTasks, taskToReorder];

            if (JSON.stringify(prevTasks.map(t=>t.id)) !== JSON.stringify(finalReorderedTasks.map(t=>t.id))) {
                 toast({
                    title: "Task Reordered",
                    description: `Task "${taskToReorder.title}" moved to the end of "${sourceTaskStatus}".`,
                });
            }
            return finalReorderedTasks;
        });
    }
  };


  const handleTaskCardDragOver = (event: ReactDragEvent<HTMLDivElement>, targetTask: Task) => {
    event.preventDefault(); 
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    if (sourceTaskStatus === targetTask.status) { 
        event.dataTransfer.dropEffect = "move";
        setReorderTargetTaskId(targetTask.id);
    } else {
        event.dataTransfer.dropEffect = "none"; 
        setReorderTargetTaskId(null);
    }
  };

  const handleTaskCardDragLeave = () => {
    setReorderTargetTaskId(null);
  };

  const handleTaskCardDrop = (event: ReactDragEvent<HTMLDivElement>, targetTask: Task) => {
    event.preventDefault();
    event.stopPropagation(); 

    const draggedTaskId = event.dataTransfer.getData('taskId');
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    setReorderTargetTaskId(null); 
    setDraggingOverStatus(null); 


    if (sourceTaskStatus === targetTask.status) { 
      setTasks(prevTasks => {
        const draggedTask = prevTasks.find(t => t.id === draggedTaskId);
        if (!draggedTask) return prevTasks;

        const tasksWithoutDragged = prevTasks.filter(t => t.id !== draggedTaskId);
        const targetIndex = tasksWithoutDragged.findIndex(t => t.id === targetTask.id);

        if (targetIndex === -1) return prevTasks; 

        const newTasks = [
          ...tasksWithoutDragged.slice(0, targetIndex),
          draggedTask,
          ...tasksWithoutDragged.slice(targetIndex)
        ];
        toast({
          title: "Task Reordered",
          description: `Task "${draggedTask.title}" reordered within "${sourceTaskStatus}".`,
        });
        return newTasks;
      });
    }
  };

  const handleGanttTaskReorder = (draggedTaskId: string, targetTaskId: string) => {
    setTasks(prevTasks => {
      const draggedTaskIndex = prevTasks.findIndex(task => task.id === draggedTaskId);
      const targetTaskIndex = prevTasks.findIndex(task => task.id === targetTaskId);

      if (draggedTaskIndex === -1 || targetTaskIndex === -1) return prevTasks;

      const newTasks = [...prevTasks];
      const [draggedTask] = newTasks.splice(draggedTaskIndex, 1);
      
      const adjustedTargetIndex = draggedTaskIndex < targetTaskIndex ? targetTaskIndex -1 : targetTaskIndex;
      
      newTasks.splice(adjustedTargetIndex, 0, draggedTask);
      
      setTimeout(() => {
        toast({
          title: "Tasks Reordered",
          description: `Task "${draggedTask.title}" moved in Gantt chart.`,
        });
      }, 0);
      return newTasks;
    });
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
              <Image
                src={project.thumbnailUrl}
                alt={`${project.name} thumbnail`}
                fill
                sizes="(min-width: 640px) 96px, 80px"
                style={{ objectFit: 'cover' }}
                data-ai-hint="project abstract"
              />
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
              <div className="flex items-center"><WorkflowIcon className="h-4 w-4 mr-2 text-muted-foreground" /><span className="text-muted-foreground">Workflows:</span><span className="ml-auto font-medium">{projectWorkflows.filter(w => w.status === 'Active').length} / {projectWorkflows.length}</span></div>
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
                <div className="p-4 bg-accent/50 rounded-lg shadow-sm"><h4 className="font-semibold text-sm text-muted-foreground mb-1">Active Workflows</h4><p className="text-2xl font-bold">{projectWorkflows.filter(w => w.status === 'Active').length}</p></div>
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

      <Tabs defaultValue="gantt" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:w-auto xl:inline-flex mb-4">
          <TabsTrigger value="gantt"><GanttChartSquare className="mr-2 h-4 w-4"/>Gantt Chart</TabsTrigger>
          <TabsTrigger value="board"><ListChecks className="mr-2 h-4 w-4"/>Task Board</TabsTrigger>
          <TabsTrigger value="projectAgents"><SlidersHorizontal className="mr-2 h-4 w-4"/>Project Agents</TabsTrigger>
          <TabsTrigger value="projectWorkflows"><WorkflowIcon className="mr-2 h-4 w-4"/>Project Workflows &amp; Design</TabsTrigger>
          <TabsTrigger value="aiSuggestions"><Lightbulb className="mr-2 h-4 w-4"/>AI Agent Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="gantt">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Task Gantt Chart</CardTitle><CardDescription>Timeline view of tasks for project "{project.name}".</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => setIsAddTaskDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Add New Task</Button>
            </CardHeader>
            <CardContent>
                {tasks.length > 0 ? (
                    <ProjectGanttChartView
                        tasks={tasks}
                        onUpdateTask={handleUpdateTask}
                        onTasksReorder={handleGanttTaskReorder}
                    />
                ) : (
                    <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
                        <GanttChartSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-lg font-medium text-muted-foreground">No tasks found for this project to display in Gantt chart.</p>
                        <p className="text-sm text-muted-foreground/80 mt-1 mb-4">Add a task to get started!</p>
                        <Button variant="outline" size="sm" onClick={() => setIsAddTaskDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />Add First Task
                        </Button>
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="board">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Task Board (Kanban)</CardTitle><CardDescription>Manage tasks by status for project "{project.name}".</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => setIsAddTaskDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Add New Task</Button>
            </CardHeader>
            <CardContent>
              {tasks.length > 0 ? (
                <ScrollArea className="w-full whitespace-nowrap pb-4">
                  <div className="flex gap-4">
                    {taskStatuses.map(status => (
                      <div
                        key={status}
                        className={cn(
                          "min-w-[300px] w-[300px] rounded-lg border border-transparent transition-colors",
                          draggingOverStatus === status && "border-primary ring-2 ring-primary bg-primary/10"
                        )}
                        onDragOver={(e) => handleColumnDragOver(e, status)}
                        onDrop={(e) => handleColumnDrop(e, status)}
                        onDragLeave={handleColumnDragLeave}
                      >
                        <div className={cn("p-2 rounded-t-lg font-semibold flex items-center justify-between", taskStatusColors[status])}>
                          {status}
                          <span className="text-xs font-normal opacity-75">
                            ({tasks.filter(task => task.status === status).length})
                          </span>
                        </div>
                        <div className="p-2 space-y-3 bg-muted/30 rounded-b-lg border border-t-0 min-h-[200px]">
                          {tasks.filter(task => task.status === status).map(task => {
                            const isParent = tasks.some(t => t.parentId === task.id);
                            return (
                            <Card
                              key={task.id}
                              className={cn(
                                "shadow-sm bg-card flex flex-col hover:shadow-md transition-shadow cursor-grab",
                                reorderTargetTaskId === task.id && "ring-2 ring-green-500"
                               )}
                              draggable
                              onDragStart={(e) => handleTaskCardDragStart(e, task)}
                              onDragOver={(e) => handleTaskCardDragOver(e, task)}
                              onDragLeave={handleTaskCardDragLeave}
                              onDrop={(e) => handleTaskCardDrop(e, task)}
                            >
                              <CardHeader className="p-3 flex items-start justify-between gap-2">
                                  <div className="flex items-center">
                                    <GripVertical className="h-4 w-4 mr-1.5 text-muted-foreground/50 cursor-grab flex-shrink-0" />
                                    <CardTitle 
                                        className={cn(
                                            "text-sm font-medium leading-tight flex items-center",
                                            isParent && "font-bold"
                                        )}
                                        style={{ paddingLeft: `${(task.parentId ? 1 : 0) * 0.5}rem` }}
                                    >
                                        {task.parentId && <FolderGit2 className="mr-1.5 h-3 w-3 text-muted-foreground/70 flex-shrink-0" />}
                                        {isParent && <ListTree className="mr-1.5 h-3 w-3 text-sky-600 flex-shrink-0" />}
                                        {task.isMilestone && <Diamond className="mr-1.5 h-3 w-3 text-amber-500 flex-shrink-0" />}
                                        {task.title}
                                    </CardTitle>
                                  </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-0 text-xs flex-grow">
                                <p className="text-muted-foreground">Assigned to: {task.assignedTo}</p>
                                {task.startDate && <p className="text-muted-foreground mt-1">{task.isMilestone ? 'Date' : 'Starts'}: {format(parseISO(task.startDate), 'MMM d')}</p>}
                                {!task.isMilestone && task.durationDays !== undefined && <p className="text-muted-foreground">Duration: {task.durationDays}d</p>}
                                {!task.isMilestone && task.progress !== undefined &&
                                  <div className="mt-1.5">
                                    <div className="flex justify-between text-muted-foreground text-[11px] mb-0.5"><span>Progress</span><span>{task.progress}%</span></div>
                                    <Progress value={task.progress} className="h-1.5" />
                                  </div>
                                }
                              </CardContent>
                              <CardFooter className="p-3 border-t flex gap-2">
                                <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => handleOpenEditTaskDialog(task, true)}><EyeIcon className="mr-1 h-3 w-3" /> View</Button>
                                <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => handleOpenEditTaskDialog(task)}><Edit2 className="mr-1 h-3 w-3" /> Edit</Button>
                                <Button variant="destructive" size="sm" className="text-xs flex-1" onClick={() => handleOpenDeleteTaskDialog(task)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
                              </CardFooter>
                            </Card>
                          )})}
                          {tasks.filter(task => task.status === status).length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">No tasks in this stage.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
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
                <AddAgentDialog onAddAgent={handleAddProjectAgent} projectId={projectId} />
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
          {!designingWorkflow ? (
            <>
              <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4">
                  <div>
                      <PageHeaderHeading className="text-2xl">Project Workflow Management</PageHeaderHeading>
                      <PageHeaderDescription>Define workflows for project "{project.name}". Select a workflow to design its steps.</PageHeaderDescription>
                  </div>
                  <Button variant="outline" onClick={() => setIsAddWorkflowDialogOpen(true)}>
                      <PlusSquareIcon className="mr-2 h-4 w-4"/>Add New Project Workflow
                  </Button>
              </PageHeader>
              <Card>
                  <CardHeader>
                      <CardTitle>Existing Workflows for "{project.name}"</CardTitle>
                      <CardDescription>Manage and monitor workflows associated with this project. Click 'View/Edit' to open the designer for a specific workflow.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {projectWorkflows.length > 0 ? (
                          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                              {projectWorkflows.map(workflow => (
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
                                          <p className="text-muted-foreground text-xs mt-1">
                                              Nodes: {workflow.nodes ? workflow.nodes.length : 0}
                                          </p>
                                           <p className="text-muted-foreground text-xs mt-1">
                                              Edges: {workflow.edges ? workflow.edges.length : 0}
                                          </p>
                                      </CardContent>
                                      <CardFooter className="p-4 border-t flex gap-2">
                                          <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => handleOpenWorkflowDesigner(workflow)}><EyeIcon className="mr-1.5 h-3.5 w-3.5" /> View/Edit</Button>
                                          <Button variant="destructive" size="icon" className="shrink-0 h-8 w-8" onClick={() => handleOpenDeleteWorkflowDialog(workflow)} title="Delete Workflow">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete Workflow</span>
                                          </Button>
                                          <Button variant="default" size="sm" className="text-xs flex-1" disabled><Play className="mr-1.5 h-3.5 w-3.5" /> Run Workflow</Button>
                                      </CardFooter>
                                  </Card>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
                              <WorkflowIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                              <p className="text-lg font-medium text-muted-foreground">No workflows found for this project.</p>
                              <p className="text-sm text-muted-foreground/80 mt-1 mb-4">Add a workflow definition to get started!</p>
                              <Button variant="outline" onClick={() => setIsAddWorkflowDialogOpen(true)}>
                                  <PlusSquareIcon className="mr-2 h-4 w-4"/>Add First Workflow Definition
                              </Button>
                          </div>
                      )}
                  </CardContent>
              </Card>
            </>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-2 border-b">
                  <div>
                    <PageHeaderHeading className="text-2xl">Designing Workflow: {designingWorkflow.name}</PageHeaderHeading>
                    <PageHeaderDescription>{designingWorkflow.description}</PageHeaderDescription>
                  </div>
                  <Button variant="outline" onClick={handleCloseWorkflowDesigner}><XSquare className="mr-2 h-4 w-4"/>Close Designer</Button>
              </div>
              <div className="flex flex-grow gap-6 mt-2 overflow-hidden p-1">
                  <WorkflowPalette />
                  <WorkflowCanvas
                    nodes={designingWorkflow.nodes || []}
                    edges={designingWorkflow.edges || []}
                    onNodesChange={handleWorkflowNodesChange}
                    onEdgesChange={handleWorkflowEdgesChange}
                  />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="aiSuggestions">
            <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4">
                <div>
                    <PageHeaderHeading className="text-2xl">AI-Powered Agent Configuration</PageHeaderHeading>
                    <PageHeaderDescription>Get optimal agent configuration suggestions for tasks within project "{project.name}".</PageHeaderDescription>
                </div>
            </PageHeader>
            <div className="max-w-2xl">
                <AgentConfigForm projectId={projectId} />
            </div>
        </TabsContent>

      </Tabs>
      <AddTaskDialog
        open={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
        onAddTask={handleAddTask}
        defaultStartDate={format(new Date(), 'yyyy-MM-dd')}
        projectTasks={tasks}
      />
      {editingTask && (
        <EditTaskDialog
          open={isEditTaskDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditTaskDialogOpen(isOpen);
            if (!isOpen) {
                setEditingTask(null);
                setIsViewingTask(false);
            }
          }}
          taskToEdit={editingTask}
          onUpdateTask={handleUpdateTask}
          isReadOnly={isViewingTask}
          projectTasks={tasks}
        />
      )}

      <AddWorkflowDialog open={isAddWorkflowDialogOpen} onOpenChange={setIsAddWorkflowDialogOpen} onAddWorkflow={handleAddProjectWorkflow} />

      {editingAgent && (
        <EditAgentDialog
          agent={editingAgent}
          open={isEditAgentDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditAgentDialogOpen(isOpen);
            if(!isOpen) setEditingAgent(null);
          }}
          onUpdateAgent={handleUpdateProjectAgent}
          projectId={projectId}
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

      {taskToDelete && (
        <AlertDialog open={isDeleteTaskDialogOpen} onOpenChange={setIsDeleteTaskDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this {taskToDelete.isMilestone ? 'milestone' : 'task'}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the {taskToDelete.isMilestone ? 'milestone' : 'task'}
                "{taskToDelete.title}" from project "{project?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setTaskToDelete(null); setIsDeleteTaskDialogOpen(false); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {workflowToDelete && (
        <AlertDialog open={isDeleteWorkflowDialogOpen} onOpenChange={setIsDeleteWorkflowDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this workflow?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the workflow
                "{workflowToDelete.name}" and its design from project "{project?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setWorkflowToDelete(null); setIsDeleteWorkflowDialogOpen(false); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteWorkflow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Workflow
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    
