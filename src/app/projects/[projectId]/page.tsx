
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, PlusCircle, LinkIcon, PlusSquareIcon, Edit2, Eye, SlidersHorizontal, Lightbulb, Play, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, EyeIcon, X, Diamond, Users, FolderGit2, ListTree, MessageSquare, Settings, Brain, AlertTriangle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react';
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
// import AddTaskDialog from '@/components/features/projects/AddTaskDialog'; // Replaced by AITaskPlannerDialog
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
import EditAgentDialogAgent from '@/components/features/agent-management/EditAgentDialog'; // Renamed import to avoid conflict

// Workflow Designer Imports
import WorkflowPalette from '@/components/features/workflow-designer/WorkflowPalette';
import WorkflowCanvas from '@/components/features/workflow-designer/WorkflowCanvasPlaceholder';
import AddWorkflowDialog from '@/components/features/projects/AddWorkflowDialog';

// AI Suggestions Imports
import AgentConfigForm from '@/components/features/ai-suggestions/AgentConfigForm';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ProjectGanttChartView from '@/components/features/projects/ProjectGanttChartView';
import TaskChatDialog from '@/components/features/tasks/TaskChatDialog';
import AITaskPlannerDialog from '@/components/features/projects/AITaskPlannerDialog';
import type { PlanProjectTaskOutput } from "@/ai/flows/plan-project-task-flow";


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

const predefinedWorkflowsData = (projectId: string): ProjectWorkflow[] => {
  const uniqueId = (base: string) => `${base}-${projectId}-${Date.now().toString().slice(-3)}-${Math.random().toString(36).substring(2, 5)}`;
  
  return [
    {
      id: uniqueId('aspice-vmodel'),
      name: "ASPICE V-Model Project Lifecycle",
      description: "A comprehensive workflow template based on the ASPICE V-Model, covering system and software engineering processes.",
      status: 'Draft',
      lastRun: undefined,
      nodes: [
        // Left side of V
        { id: uniqueId('node-acq'), name: 'Stakeholder Req. Elicitation', type: 'Analysis Agent', x: 350, y: 20, config: {} },
        { id: uniqueId('node-sys-req'), name: 'System Requirements Analysis', type: 'Analysis Agent', x: 150, y: 100, config: {} },
        { id: uniqueId('node-sys-arch'), name: 'System Architectural Design', type: 'Custom Logic Agent', x: 50, y: 180, config: {} },
        { id: uniqueId('node-swe-req'), name: 'Software Requirements Analysis', type: 'Analysis Agent', x: 150, y: 260, config: {} },
        { id: uniqueId('node-swe-arch'), name: 'Software Architectural Design', type: 'Custom Logic Agent', x: 50, y: 340, config: {} },
        { id: uniqueId('node-swe-ddi'), name: 'Software Detailed Design & Impl.', type: 'Code Review Agent', x: 350, y: 420, config: {} },
        // Right side of V
        { id: uniqueId('node-swe-uv'), name: 'Software Unit Verification', type: 'Testing Agent', x: 650, y: 340, config: {} },
        { id: uniqueId('node-swe-it'), name: 'Software Integration Testing', type: 'Testing Agent', x: 550, y: 260, config: {} },
        { id: uniqueId('node-swe-qt'), name: 'Software Qualification Testing', type: 'Testing Agent', x: 650, y: 180, config: {} },
        { id: uniqueId('node-sys-it'), name: 'System Integration Testing', type: 'Testing Agent', x: 550, y: 100, config: {} },
        { id: uniqueId('node-sys-qt'), name: 'System Qualification Testing', type: 'Testing Agent', x: 350, y: 20, config: {} }, // This node is actually the acceptance/final system test, placed back at the top right
        // Supporting Processes (placed below)
        { id: uniqueId('node-man'), name: 'Project Management', type: 'Reporting Agent', x: 50, y: 500, config: {} },
        { id: uniqueId('node-qa'), name: 'Quality Assurance', type: 'Monitoring Agent', x: 250, y: 500, config: {} },
        { id: uniqueId('node-cm'), name: 'Configuration Management', type: 'Custom Logic Agent', x: 450, y: 500, config: {} },
      ],
      edges: [
        // Left arm (downwards)
        { id: uniqueId('edge-1'), sourceNodeId: uniqueId('node-acq'), targetNodeId: uniqueId('node-sys-req') },
        { id: uniqueId('edge-2'), sourceNodeId: uniqueId('node-sys-req'), targetNodeId: uniqueId('node-sys-arch') },
        { id: uniqueId('edge-3'), sourceNodeId: uniqueId('node-sys-arch'), targetNodeId: uniqueId('node-swe-req') },
        { id: uniqueId('edge-4'), sourceNodeId: uniqueId('node-swe-req'), targetNodeId: uniqueId('node-swe-arch') },
        { id: uniqueId('edge-5'), sourceNodeId: uniqueId('node-swe-arch'), targetNodeId: uniqueId('node-swe-ddi') },
        // Bottom "coding/implementation" to "unit verification"
        { id: uniqueId('edge-6'), sourceNodeId: uniqueId('node-swe-ddi'), targetNodeId: uniqueId('node-swe-uv') },
        // Right arm (upwards)
        { id: uniqueId('edge-7'), sourceNodeId: uniqueId('node-swe-uv'), targetNodeId: uniqueId('node-swe-it') },
        { id: uniqueId('edge-8'), sourceNodeId: uniqueId('node-swe-it'), targetNodeId: uniqueId('node-swe-qt') },
        { id: uniqueId('edge-9'), sourceNodeId: uniqueId('node-swe-qt'), targetNodeId: uniqueId('node-sys-it') },
        { id: uniqueId('edge-10'), sourceNodeId: uniqueId('node-sys-it'), targetNodeId: uniqueId('node-sys-qt') },
        // Test relationships (horizontal across V)
        { id: uniqueId('edge-t1'), sourceNodeId: uniqueId('node-swe-ddi'), targetNodeId: uniqueId('node-swe-uv') }, // Redundant with edge-6 but conceptually ok
        { id: uniqueId('edge-t2'), sourceNodeId: uniqueId('node-swe-arch'), targetNodeId: uniqueId('node-swe-it') },
        { id: uniqueId('edge-t3'), sourceNodeId: uniqueId('node-swe-req'), targetNodeId: uniqueId('node-swe-qt') },
        { id: uniqueId('edge-t4'), sourceNodeId: uniqueId('node-sys-arch'), targetNodeId: uniqueId('node-sys-it') },
        { id: uniqueId('edge-t5'), sourceNodeId: uniqueId('node-sys-req'), targetNodeId: uniqueId('node-sys-qt') },
         // Connect supporting processes to initial elicitation or project management node
        { id: uniqueId('edge-s1'), sourceNodeId: uniqueId('node-acq'), targetNodeId: uniqueId('node-man') },
        { id: uniqueId('edge-s2'), sourceNodeId: uniqueId('node-man'), targetNodeId: uniqueId('node-qa') },
        { id: uniqueId('edge-s3'), sourceNodeId: uniqueId('node-man'), targetNodeId: uniqueId('node-cm') },
      ].map(edge => ({ // Ensure node IDs in edges match the dynamically generated ones
        ...edge,
        sourceNodeId: edge.sourceNodeId.startsWith('node-') ? nodes.find(n => n.id.includes(edge.sourceNodeId.split('-').slice(1,-3).join('-')))!.id : edge.sourceNodeId,
        targetNodeId: edge.targetNodeId.startsWith('node-') ? nodes.find(n => n.id.includes(edge.targetNodeId.split('-').slice(1,-3).join('-')))!.id : edge.targetNodeId,
      }))
    }.nodes // This trick is to use the nodes array defined above to correctly map edge source/target IDs
  ].map(wf => { // This outer map is for the workflow itself.
      const nodes = wf.nodes; // Get the nodes array
      return {
        ...wf,
        edges: wf.edges!.map(edge => ({
          ...edge,
          // Remap sourceNodeId if it's one of the dynamic ones
          sourceNodeId: nodes.find(n => n.id.startsWith(edge.sourceNodeId.substring(0, edge.sourceNodeId.lastIndexOf('-proj-'))))?.id || edge.sourceNodeId,
          // Remap targetNodeId
          targetNodeId: nodes.find(n => n.id.startsWith(edge.targetNodeId.substring(0, edge.targetNodeId.lastIndexOf('-proj-'))))?.id || edge.targetNodeId,
        }))
      };
  })
  // This is a bit complex. The issue is that uniqueId() generates a fully unique ID each time.
  // We need to ensure the edges reference the IDs of the nodes created *in the same scope*.
  // A better approach might be to define base IDs and then make them unique within the workflow object construction.

  // Let's simplify: define node IDs first, then use them in edges.
  const nodeIds = {
    acq: uniqueId('node-acq'),
    sysReq: uniqueId('node-sys-req'),
    sysArch: uniqueId('node-sys-arch'),
    sweReq: uniqueId('node-swe-req'),
    sweArch: uniqueId('node-swe-arch'),
    sweDdi: uniqueId('node-swe-ddi'),
    sweUv: uniqueId('node-swe-uv'),
    sweIt: uniqueId('node-swe-it'),
    sweQt: uniqueId('node-swe-qt'),
    sysIt: uniqueId('node-sys-it'),
    sysQt: uniqueId('node-sys-qt'),
    man: uniqueId('node-man'),
    qa: uniqueId('node-qa'),
    cm: uniqueId('node-cm'),
  };

  return [
    {
      id: uniqueId('aspice-vmodel-wf'),
      name: "ASPICE V-Model Project Lifecycle",
      description: "A comprehensive workflow template based on the ASPICE V-Model, covering system and software engineering processes.",
      status: 'Draft',
      lastRun: undefined,
      nodes: [
        { id: nodeIds.acq, name: 'Stakeholder Req. Elicitation', type: 'Analysis Agent', x: 350, y: 20, config: {} },
        { id: nodeIds.sysReq, name: 'System Requirements Analysis', type: 'Analysis Agent', x: 150, y: 100, config: {} },
        { id: nodeIds.sysArch, name: 'System Architectural Design', type: 'Custom Logic Agent', x: 50, y: 180, config: {} },
        { id: nodeIds.sweReq, name: 'Software Requirements Analysis', type: 'Analysis Agent', x: 150, y: 260, config: {} },
        { id: nodeIds.sweArch, name: 'Software Architectural Design', type: 'Custom Logic Agent', x: 50, y: 340, config: {} },
        { id: nodeIds.sweDdi, name: 'Software Detailed Design & Impl.', type: 'Code Review Agent', x: 350, y: 420, config: {} },
        { id: nodeIds.sweUv, name: 'Software Unit Verification', type: 'Testing Agent', x: 650, y: 340, config: {} },
        { id: nodeIds.sweIt, name: 'Software Integration Testing', type: 'Testing Agent', x: 550, y: 260, config: {} },
        { id: nodeIds.sweQt, name: 'Software Qualification Testing', type: 'Testing Agent', x: 650, y: 180, config: {} },
        { id: nodeIds.sysIt, name: 'System Integration Testing', type: 'Testing Agent', x: 550, y: 100, config: {} },
        { id: nodeIds.sysQt, name: 'System Qualification Testing', type: 'Testing Agent', x: 350, y: 20, config: {} }, // Re-adjusting for V-shape. Top-right.
        { id: nodeIds.man, name: 'Project Management', type: 'Reporting Agent', x: 50, y: 500, config: {} },
        { id: nodeIds.qa, name: 'Quality Assurance', type: 'Monitoring Agent', x: 250, y: 500, config: {} },
        { id: nodeIds.cm, name: 'Configuration Management', type: 'Custom Logic Agent', x: 450, y: 500, config: {} },
      ],
      edges: [
        { id: uniqueId('edge-1'), sourceNodeId: nodeIds.acq, targetNodeId: nodeIds.sysReq },
        { id: uniqueId('edge-2'), sourceNodeId: nodeIds.sysReq, targetNodeId: nodeIds.sysArch },
        { id: uniqueId('edge-3'), sourceNodeId: nodeIds.sysArch, targetNodeId: nodeIds.sweReq },
        { id: uniqueId('edge-4'), sourceNodeId: nodeIds.sweReq, targetNodeId: nodeIds.sweArch },
        { id: uniqueId('edge-5'), sourceNodeId: nodeIds.sweArch, targetNodeId: nodeIds.sweDdi },
        { id: uniqueId('edge-6'), sourceNodeId: nodeIds.sweDdi, targetNodeId: nodeIds.sweUv },
        { id: uniqueId('edge-7'), sourceNodeId: nodeIds.sweUv, targetNodeId: nodeIds.sweIt },
        { id: uniqueId('edge-8'), sourceNodeId: nodeIds.sweIt, targetNodeId: nodeIds.sweQt },
        { id: uniqueId('edge-9'), sourceNodeId: nodeIds.sweQt, targetNodeId: nodeIds.sysIt },
        { id: uniqueId('edge-10'), sourceNodeId: nodeIds.sysIt, targetNodeId: nodeIds.sysQt },
        // Test relationships (horizontal across V)
        // { id: uniqueId('edge-t1'), sourceNodeId: nodeIds.sweDdi, targetNodeId: nodeIds.sweUv }, // This is same as edge-6
        { id: uniqueId('edge-t2'), sourceNodeId: nodeIds.sweArch, targetNodeId: nodeIds.sweIt },
        { id: uniqueId('edge-t3'), sourceNodeId: nodeIds.sweReq, targetNodeId: nodeIds.sweQt },
        { id: uniqueId('edge-t4'), sourceNodeId: nodeIds.sysArch, targetNodeId: nodeIds.sysIt },
        { id: uniqueId('edge-t5'), sourceNodeId: nodeIds.sysReq, targetNodeId: nodeIds.sysQt },
        // Supporting processes link to Project Management
        { id: uniqueId('edge-s1'), sourceNodeId: nodeIds.acq, targetNodeId: nodeIds.man }, // PM starts early
        { id: uniqueId('edge-s2'), sourceNodeId: nodeIds.man, targetNodeId: nodeIds.qa },
        { id: uniqueId('edge-s3'), sourceNodeId: nodeIds.man, targetNodeId: nodeIds.cm },
      ],
    },
  ];
};


export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mockProgress, setMockProgress] = useState(0);

  const [tasks, setTasks] = useState<Task[]>([]);
  // const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false); // Replaced by AI Planner
  const [isAITaskPlannerDialogOpen, setIsAITaskPlannerDialogOpen] = useState(false);
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
  
  // State for Task Chat Dialog
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [chattingTask, setChattingTask] = useState<Task | null>(null);


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
        { id: `${projectId}-task-1`, title: `Define ${foundProject.name} scope`, status: 'Done', assignedTo: 'AI Agent Alpha', startDate: format(addDays(today, -5), 'yyyy-MM-dd'), durationDays: 2, progress: 100, parentId: null, dependencies: [], isMilestone: false, description: "Initial scoping task." },
        { id: `${projectId}-task-2`, title: `Develop core logic for ${foundProject.name}`, status: 'In Progress', assignedTo: 'AI Agent Beta', startDate: format(today, 'yyyy-MM-dd'), durationDays: 5, progress: 40, parentId: null, dependencies: [`${projectId}-task-1`], isMilestone: false, description: "Core development phase." },
        { id: `${projectId}-task-sub-1`, title: `Sub-task for core logic`, status: 'To Do', assignedTo: 'AI Agent Beta', startDate: format(addDays(today,1), 'yyyy-MM-dd'), durationDays: 2, progress: 0, parentId: `${projectId}-task-2`, dependencies: [], isMilestone: false, description: "A specific sub-component." },
        { id: `${projectId}-task-3`, title: `Test ${foundProject.name} integration`, status: 'To Do', assignedTo: 'AI Agent Gamma', startDate: format(addDays(today, 3), 'yyyy-MM-dd'), durationDays: 3, progress: 0, parentId: null, dependencies: [`${projectId}-task-2`], isMilestone: false, description: "Integration testing phase." },
        { id: `${projectId}-milestone-1`, title: `Project Kick-off Meeting`, status: 'Done', assignedTo: 'Project Lead', startDate: format(addDays(today, -10), 'yyyy-MM-dd'), durationDays: 0, progress: 100, isMilestone: true, parentId: null, dependencies: [], description: "Official project start." },
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
          const parsedWorkflows = JSON.parse(storedWorkflows);
          setProjectWorkflows(parsedWorkflows.map((wf: ProjectWorkflow) => ({...wf, nodes: wf.nodes || [], edges: wf.edges || []})));
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
                // console.log(`PROJECT_DETAIL_PAGE: Saving projectWorkflows to localStorage for project ${projectId}`, JSON.stringify(projectWorkflows.map(wf => ({...wf, id: wf.id, nodesCount: wf.nodes?.length, edgesCount: wf.edges?.length }))));
                localStorage.setItem(getWorkflowsStorageKey(projectId), JSON.stringify(projectWorkflows.map(wf => ({...wf, nodes: wf.nodes || [], edges: wf.edges || [] }))));
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
      if (updatedDesigningWorkflowInstance) {
        // console.log("PROJECT_DETAIL_PAGE: Found designingWorkflow instance in projectWorkflows.");
        if (
            JSON.stringify(updatedDesigningWorkflowInstance.nodes) !== JSON.stringify(designingWorkflow.nodes) ||
            JSON.stringify(updatedDesigningWorkflowInstance.edges) !== JSON.stringify(designingWorkflow.edges)
        ) {
            // console.log("PROJECT_DETAIL_PAGE: Updating designingWorkflow state from projectWorkflows due to node/edge change.");
            setDesigningWorkflow(updatedDesigningWorkflowInstance);
        }
      } else if (designingWorkflow) { 
          // console.log("PROJECT_DETAIL_PAGE: designingWorkflow no longer found in projectWorkflows, resetting.");
          setDesigningWorkflow(null); 
      }
    }
  }, [projectWorkflows, designingWorkflow?.id]); // Removed designingWorkflow from dependencies, only ID


  const formatDate = (dateString: string | undefined, options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) => {
    if (!isClient || !dateString) return 'Loading date...';
    try {
       if (!dateString.includes('-') && !dateString.includes('/') && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(dateString)) return dateString;
      return format(parseISO(dateString), options.year ? "MMMM d, yyyy 'at' hh:mm a" : "MMMM d, hh:mm a");
    } catch (error) {
      return dateString;
    }
  };

  const handleTaskPlannedAndAccepted = (
    plannedTaskData: Omit<Task, 'id'>,
    aiReasoning: string,
    aiSuggestedSubTasks?: PlanProjectTaskOutput['plannedTask']['suggestedSubTasks']
  ) => {
    const subTasksText = aiSuggestedSubTasks && aiSuggestedSubTasks.length > 0
      ? `\n\nSuggested Sub-Tasks / Steps:\n${aiSuggestedSubTasks.map(st => `- ${st.title} (Agent Type: ${st.assignedAgentType})`).join('\n')}`
      : ""; 

    const taskDescription = `AI Reasoning: ${aiReasoning}${subTasksText}`.trim();

    let newTask: Task = {
      ...plannedTaskData,
      id: `task-proj-${projectId}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`,
      progress: plannedTaskData.isMilestone ? (plannedTaskData.status === 'Done' ? 100 : 0) : (plannedTaskData.progress ?? 0),
      durationDays: plannedTaskData.isMilestone ? 0 : (plannedTaskData.durationDays ?? 1),
      status: plannedTaskData.status || (plannedTaskData.isMilestone ? 'To Do' : 'To Do'),
      description: taskDescription,
      parentId: plannedTaskData.parentId || null,
      dependencies: plannedTaskData.dependencies || [],
      isMilestone: plannedTaskData.isMilestone || false,
    };

    let autoStarted = false;
    let targetNameForToast: string | null = null; 

    if (!newTask.isMilestone &&
        newTask.assignedTo &&
        newTask.assignedTo !== "Unassigned" &&
        newTask.assignedTo !== "AI Assistant to determine" &&
        newTask.status !== 'Done'
    ) {
      const assignedAgent = projectAgents.find(agent => agent.name === newTask.assignedTo);

      if (assignedAgent) { 
        targetNameForToast = assignedAgent.name;
        if (assignedAgent.status === 'Running') {
          newTask.status = 'In Progress';
          newTask.progress = (newTask.progress === 0 || newTask.progress === undefined) ? 10 : newTask.progress;
          setProjectAgents(prevAgents =>
            prevAgents.map(agent =>
              agent.id === assignedAgent.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
            )
          );
          autoStarted = true;
        }
      } else {
        targetNameForToast = newTask.assignedTo;
      }
    }

    setTasks(prevTasks => [newTask, ...prevTasks]);
    setIsAITaskPlannerDialogOpen(false);

    if (autoStarted && targetNameForToast) {
      toast({
        title: "Task In Progress (AI Planned)",
        description: `Task "${newTask.title}" assigned to agent "${targetNameForToast}" and is now being processed.`
      });
    } else if (targetNameForToast && !newTask.isMilestone && newTask.assignedTo !== "AI Assistant to determine") {
        toast({
            title: "Task Added (AI Planned)",
            description: `Task "${newTask.title}" assigned to workflow/team "${targetNameForToast}". Further agent actions may be required.`,
        });
    } else {
      toast({
        title: newTask.isMilestone ? "Milestone Added (AI Planned)" : "Task Added (AI Planned)",
        description: `${newTask.isMilestone ? "Milestone" : "Task"} "${newTask.title}" has been added to project "${project?.name}". ${newTask.assignedTo && newTask.assignedTo !== "AI Assistant to determine" && !newTask.isMilestone ? `Assigned to ${newTask.assignedTo}.` : ''}`.trim()
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
    // console.log("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange received updatedNodes. Length:", updatedNodes.length, "IDs:", updatedNodes.map(n => n.id).join(', '));
    if (!designingWorkflow) {
      // console.warn("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange called without designingWorkflow set.");
      return;
    }
    // console.log("PROJECT_DETAIL_PAGE: Current designingWorkflow ID:", designingWorkflow.id, "Name:", designingWorkflow.name);

    setProjectWorkflows(prevWorkflows => {
        // console.log("PROJECT_DETAIL_PAGE: Inside setProjectWorkflows. prevWorkflows length:", prevWorkflows.length);
        const newWorkflowsArray = prevWorkflows.map(wf => {
            if (wf.id === designingWorkflow.id) {
                // console.log("PROJECT_DETAIL_PAGE: Updating nodes for workflow ID:", wf.id, ". New nodes count:", updatedNodes.length);
                return { ...wf, nodes: updatedNodes };
            }
            return wf;
        });
        // newWorkflowsArray.forEach(wf => {
        //     console.log("PROJECT_DETAIL_PAGE: Workflow in newWorkflows array (after map). ID:", wf.id, "Nodes count:", wf.nodes?.length, "Nodes IDs:", wf.nodes?.map(n => n.id).join(', '));
        // });
        return newWorkflowsArray;
    });
  }, [designingWorkflow, setProjectWorkflows]); 


  const handleWorkflowEdgesChange = useCallback((updatedEdges: WorkflowEdge[]) => {
    // console.log("PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange received updatedEdges. Length:", updatedEdges.length);
     if (!designingWorkflow) {
        // console.warn("PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange called without designingWorkflow set.");
        return;
    }
    setProjectWorkflows(prevWorkflows =>
        prevWorkflows.map(wf =>
            wf.id === designingWorkflow.id ? { ...wf, edges: updatedEdges } : wf
        )
    );
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
        progress: newStatus === 'Done' ? 100 : (taskToMove.isMilestone ? taskToMove.progress : (newStatus === 'To Do' || newStatus === 'Blocked' ? 0 : (taskToMove.progress || 0))),
      };
      let updatedTasks = tasks.map(task => (task.id === draggedTaskId ? updatedTask : task));
      
      const taskToReorder = updatedTasks.find(t => t.id === draggedTaskId)!;
      updatedTasks = updatedTasks.filter(t => t.id !== draggedTaskId);
      updatedTasks.push(taskToReorder); 

      setTasks(updatedTasks);
      toast({
        title: "Task Status Updated",
        description: `Task "${updatedTask.title}" moved to "${newStatus}".`,
      });
    } else { 
         setTasks(prevTasks => {
            const taskToReorder = prevTasks.find(t => t.id === draggedTaskId);
            if (!taskToReorder) return prevTasks;

            let newTasksArray = prevTasks.filter(t => t.id !== draggedTaskId);
            newTasksArray.push(taskToReorder); 

            if (JSON.stringify(prevTasks.map(t=>t.id)) !== JSON.stringify(newTasksArray.map(t=>t.id))) {
                 toast({
                    title: "Task Reordered",
                    description: `Task "${taskToReorder.title}" moved to the end of "${sourceTaskStatus}".`,
                });
            }
            return newTasksArray;
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

  const handleOpenChatDialog = (task: Task) => {
    setChattingTask(task);
    setIsChatDialogOpen(true);
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
  // Ensure this is the correct start of the return statement for ProjectDetailPage component
  return ( 
    <div className="container mx-auto">
      <PageHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
           {project.thumbnailUrl && (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex-shrink-0 rounded-lg overflow-hidden border shadow-md">
              <Image
                src={project.thumbnailUrl}
                alt={`${project.name} thumbnail`}
                fill
                sizes="(max-width: 639px) 64px, (max-width: 767px) 80px, (max-width: 1023px) 96px, 96px"
                style={{ objectFit: 'cover' }}
                data-ai-hint="project abstract"
              />
            </div>
          )}
          <div className="flex-grow">
            <PageHeaderHeading><Briefcase className="mr-2 inline-block h-7 w-7 sm:mr-3 sm:h-8 sm:w-8" />{project.name}</PageHeaderHeading>
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
        <TabsList className="grid w-full grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:w-auto xl:inline-grid mb-4">
          <TabsTrigger value="gantt"><GanttChartSquare className="mr-2 h-4 w-4"/>Gantt Chart</TabsTrigger>
          <TabsTrigger value="board"><ListChecks className="mr-2 h-4 w-4"/>Task Board</TabsTrigger>
          <TabsTrigger value="projectAgents"><SlidersHorizontal className="mr-2 h-4 w-4"/>Project Agents</TabsTrigger>
          <TabsTrigger value="projectWorkflows"><WorkflowIcon className="mr-2 h-4 w-4"/>Project Workflows &amp; Design</TabsTrigger>
          <TabsTrigger value="aiSuggestions"><Lightbulb className="mr-2 h-4 w-4"/>AI Agent Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="gantt">
          <Card>
            <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div><CardTitle>Task Gantt Chart</CardTitle><CardDescription>Timeline view of tasks for project "{project.name}".</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => setIsAITaskPlannerDialogOpen(true)} className="w-full mt-2 sm:w-auto sm:mt-0"><Brain className="mr-2 h-4 w-4" />Plan Task with AI</Button>
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
                        <Button variant="outline" size="sm" onClick={() => setIsAITaskPlannerDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                            <Brain className="mr-2 h-4 w-4" />Plan First Task with AI
                        </Button>
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="board">
          <Card>
            <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div><CardTitle>Task Board (Kanban)</CardTitle><CardDescription>Manage tasks by status for project "{project.name}".</CardDescription></div>
              <Button variant="outline" size="sm" onClick={() => setIsAITaskPlannerDialogOpen(true)} className="w-full mt-2 sm:w-auto sm:mt-0"><Brain className="mr-2 h-4 w-4" />Plan Task with AI</Button>
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
                                            isParent && "font-bold",
                                            task.parentId ? "pl-2" : "" // Indent subtask titles
                                        )}
                                       
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
                               <CardFooter className="p-3 border-t grid grid-cols-4 gap-2">
                                <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => handleOpenEditTaskDialog(task, true)}><EyeIcon className="mr-1 h-3 w-3" /> View</Button>
                                <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => handleOpenEditTaskDialog(task)}><Edit2 className="mr-1 h-3 w-3" /> Edit</Button>
                                <Button variant="ghost" size="sm" className="text-xs flex-1" onClick={() => handleOpenChatDialog(task)}><MessageSquare className="mr-1 h-3 w-3" /> Chat</Button>
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
                  <Button variant="outline" size="sm" onClick={() => setIsAITaskPlannerDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                     <Brain className="mr-2 h-4 w-4" />Plan First Task with AI
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
                <PageHeaderDescription>Manage agent configurations specific to project "{project?.name}".</PageHeaderDescription>
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
                      <PageHeaderDescription>Define workflows for project "{project?.name}". Select a workflow to design its steps.</PageHeaderDescription>
                  </div>
                  <Button variant="outline" onClick={() => setIsAddWorkflowDialogOpen(true)}  className="w-full mt-4 sm:w-auto sm:mt-0">
                      <PlusSquareIcon className="mr-2 h-4 w-4"/>Add New Project Workflow
                  </Button>
              </PageHeader>
              <Card>
                  <CardHeader>
                      <CardTitle>Existing Workflows for "{project?.name}"</CardTitle>
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
                              <Button variant="outline" onClick={() => setIsAddWorkflowDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                                  <PlusSquareIcon className="mr-2 h-4 w-4"/>Add First Workflow Definition
                              </Button>
                          </div>
                      )}
                  </CardContent>
              </Card>
            </>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4 pb-2 border-b">
                  <div>
                    <PageHeaderHeading className="text-2xl">Designing Workflow: {designingWorkflow.name}</PageHeaderHeading>
                    <PageHeaderDescription>{designingWorkflow.description}</PageHeaderDescription>
                  </div>
                  <Button variant="outline" onClick={handleCloseWorkflowDesigner} className="w-full mt-2 sm:w-auto sm:mt-0"><XSquare className="mr-2 h-4 w-4"/>Close Designer</Button>
              </div>
              <div className="flex flex-col md:flex-row flex-grow gap-6 mt-2 overflow-hidden p-1">
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
                    <PageHeaderDescription>Get optimal agent configuration suggestions for tasks within project "{project?.name}".</PageHeaderDescription>
                </div>
            </PageHeader>
            <div className="max-w-full"> 
                <AgentConfigForm projectId={projectId} />
            </div>
        </TabsContent>

      </Tabs>
      {/* <AddTaskDialog
        open={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
        onAddTask={handleAddTask}
        defaultStartDate={format(new Date(), 'yyyy-MM-dd')}
        projectTasks={tasks}
      /> */}
      {isAITaskPlannerDialogOpen && (
        <AITaskPlannerDialog
          open={isAITaskPlannerDialogOpen}
          onOpenChange={setIsAITaskPlannerDialogOpen}
          projectId={projectId}
          projectWorkflows={projectWorkflows.map(wf => ({name: wf.name, description: wf.description}))}
          onTaskPlannedAndAccepted={handleTaskPlannedAndAccepted}
        />
      )}

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
        <EditAgentDialogAgent 
          agent={editingAgent}
          open={isEditAgentDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditAgentDialogOpen(isOpen);
            if(!isOpen) setEditingAgent(null);
          }}
          onUpdateAgent={handleUpdateProjectAgent}
          projectId={projectId} // Pass projectId for context
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
      {chattingTask && (
        <TaskChatDialog
          open={isChatDialogOpen}
          onOpenChange={(isOpen) => {
            setIsChatDialogOpen(isOpen);
            if (!isOpen) setChattingTask(null);
          }}
          task={chattingTask}
        />
      )}
    </div>
  );
}
