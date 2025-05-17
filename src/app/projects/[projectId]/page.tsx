
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, PlusSquareIcon, Eye, SlidersHorizontal, Lightbulb, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, EyeIcon, X, Diamond, Users, FolderGit2, ListTree, MessageSquare, Settings, Brain, AlertTriangle, Edit, Folder as FolderIcon, File as FileIcon, UploadCloud, FolderPlus, ArrowLeftCircle, InfoIcon, Play } from 'lucide-react';
import { useParams } from 'next/navigation';
import React, { useEffect, useState, useCallback, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { Project, Task, Agent, ProjectWorkflow, WorkflowNode, WorkflowEdge, ProjectFile } from '@/types';
import { initialMockProjects, PROJECTS_STORAGE_KEY, getTasksStorageKey, getAgentsStorageKey, getWorkflowsStorageKey, getFilesStorageKey } from '@/app/projects/page'; // Import shared constants
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { format, parseISO, addDays, differenceInDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
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

// Agent Management Imports
import AgentManagementTable from '@/components/features/agent-management/AgentManagementTable';
import AddAgentDialog from '@/components/features/agent-management/AddAgentDialog';
import EditAgentDialogAgent from '@/components/features/agent-management/EditAgentDialog'; // Renamed import to avoid conflict

// Workflow Designer Imports
import WorkflowPalette from '@/components/features/workflow-designer/WorkflowPalette';
import WorkflowCanvas from '@/components/features/workflow-designer/WorkflowCanvasPlaceholder'; // Actual canvas component
import AddWorkflowDialog from '@/components/features/projects/AddWorkflowDialog';

// AI Suggestions Imports
import AgentConfigForm from '@/components/features/ai-suggestions/AgentConfigForm';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ProjectGanttChartView from '@/components/features/projects/ProjectGanttChartView';
import TaskChatDialog from '@/components/features/tasks/TaskChatDialog';
import AITaskPlannerDialog from '@/components/features/projects/AITaskPlannerDialog';
import type { PlanProjectTaskInput, PlanProjectTaskOutput } from "@/ai/flows/plan-project-task-flow";
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadCnTableHeader, TableRow } from "@/components/ui/table";


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


const workflowStatusColors: { [key in ProjectWorkflow['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  Inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  Draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
};

const uniqueIdGen = (base: string): string => `${base}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`;

const predefinedWorkflowsData = (projectId: string): ProjectWorkflow[] => {
  const uid = (prefix: string) => `pd-wf-${projectId.slice(-5)}-${uniqueIdGen(prefix.substring(0,3))}`;
  const workflows: ProjectWorkflow[] = [];

  const reqEngId = uid('req-eng');
  const reqNode1 = { id: uid('req-n1'), name: 'Elicit Stakeholder Needs', type: 'Analysis Agent', x: 50, y: 50, config: {} };
  const reqNode2 = { id: uid('req-n2'), name: 'Analyze & Refine Requirements', type: 'Analysis Agent', x: 250, y: 150, config: {} };
  const reqNode3 = { id: uid('req-n3'), name: 'Document Requirements Spec', type: 'Documentation Agent', x: 50, y: 250, config: {} };
  workflows.push({
    id: reqEngId,
    name: "Requirements Engineering Process",
    description: "Handles elicitation, analysis, and specification of project requirements. Uses analysis and documentation agents.",
    status: 'Draft',
    nodes: [reqNode1, reqNode2, reqNode3],
    edges: [
      { id: `${reqEngId}-e1`, sourceNodeId: reqNode1.id, targetNodeId: reqNode2.id },
      { id: `${reqEngId}-e2`, sourceNodeId: reqNode2.id, targetNodeId: reqNode3.id },
    ],
  });

  const swDevId = uid('sw-dev');
  const swDevNode1 = { id: uid('swd-n1'), name: 'Software Architecture Design', type: 'Custom Logic Agent', x: 50, y: 50, config: { designTool: "Lucidchart" } };
  const swDevNode2 = { id: uid('swd-n2'), name: 'Detailed Component Design', type: 'Custom Logic Agent', x: 250, y: 120, config: { language: "TypeScript" } };
  const swDevNode3 = { id: uid('swd-n3'), name: 'Code Implementation', type: 'Code Review Agent', x: 50, y: 190, config: { styleGuide: "Google" } };
  const swDevNode4 = { id: uid('swd-n4'), name: 'Unit Testing', type: 'Testing Agent', x: 250, y: 260, config: { framework: "Jest" } };
  workflows.push({
    id: swDevId,
    name: "Software Design & Implementation Cycle",
    description: "Covers software architectural design, detailed design, coding, and unit testing. Utilizes design, coding, and testing agents.",
    status: 'Draft',
    nodes: [swDevNode1, swDevNode2, swDevNode3, swDevNode4],
    edges: [
      { id: `${swDevId}-e1`, sourceNodeId: swDevNode1.id, targetNodeId: swDevNode2.id },
      { id: `${swDevId}-e2`, sourceNodeId: swDevNode2.id, targetNodeId: swDevNode3.id },
      { id: `${swDevId}-e3`, sourceNodeId: swDevNode3.id, targetNodeId: swDevNode4.id },
    ],
  });

  const swTestId = uid('sw-test');
  const swTestNode1 = { id: uid('swt-n1'), name: 'Integration Testing', type: 'Testing Agent', x: 50, y: 50, config: { strategy: "bottom-up" } };
  const swTestNode2 = { id: uid('swt-n2'), name: 'System Qualification Testing', type: 'Testing Agent', x: 250, y: 150, config: { environment: "staging" } };
  const swTestNode3 = { id: uid('swt-n3'), name: 'Log & Track Defects', type: 'Reporting Agent', x: 50, y: 250, config: { tool: "JIRA" } };
  workflows.push({
    id: swTestId,
    name: "Software Testing & QA Cycle",
    description: "Manages integration testing, system testing, and quality assurance activities. Employs testing and reporting agents.",
    status: 'Draft',
    nodes: [swTestNode1, swTestNode2, swTestNode3],
    edges: [
      { id: `${swTestId}-e1`, sourceNodeId: swTestNode1.id, targetNodeId: swTestNode2.id },
      { id: `${swTestId}-e2`, sourceNodeId: swTestNode2.id, targetNodeId: swTestNode3.id },
    ],
  });

  const projMonId = uid('proj-mon');
  const projMonNode1 = { id: uid('mon-n1'), name: 'Collect Task Progress', type: 'Monitoring Agent', x: 50, y: 50, config: { source: "Kanban Board" } };
  const projMonNode2 = { id: uid('mon-n2'), name: 'Generate Weekly Report', type: 'Reporting Agent', x: 250, y: 120, config: { template: "weekly_status_v1" } };
  workflows.push({
    id: projMonId,
    name: "Project Monitoring & Reporting",
    description: "Collects project metrics, monitors progress, and generates status reports using monitoring and reporting agents.",
    status: 'Draft',
    nodes: [projMonNode1, projMonNode2],
    edges: [
      { id: `${projMonId}-e1`, sourceNodeId: projMonNode1.id, targetNodeId: projMonNode2.id },
    ],
  });

  return workflows;
};


const initialMockFilesData = (projectId: string): ProjectFile[] => [
    { id: `file-${projectId}-1`, name: 'ProjectProposal.docx', type: 'file', path: '/', size: '1.2MB', lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: `folder-${projectId}-1`, name: 'Source Code', type: 'folder', path: '/', children: [
        { id: `file-${projectId}-2`, name: 'main.py', type: 'file', path: '/Source Code/', size: '50KB', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: `file-${projectId}-3`, name: 'utils.py', type: 'file', path: '/Source Code/', size: '25KB', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: `folder-${projectId}-sub-1`, name: 'tests', type: 'folder', path: '/Source Code/', children: [
          { id: `file-${projectId}-s1`, name: 'test_main.py', type: 'file', path: '/Source Code/tests/', size: '5KB', lastModified: new Date().toISOString() },
        ]},
    ]},
    { id: `folder-${projectId}-2`, name: 'Documentation', type: 'folder', path: '/', children: [
        { id: `file-${projectId}-4`, name: 'UserManual.pdf', type: 'file', path: '/Documentation/', size: '2.5MB', lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    ]},
    { id: `file-${projectId}-6`, name: 'MeetingNotes_2024-07-20.txt', type: 'file', path: '/', size: '5KB', lastModified: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
];


export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mockProgress, setMockProgress] = useState(0);

  const [tasks, setTasks] = useState<Task[]>([]);
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
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null); // This is for project-specific agent editing
  const [isDeleteAgentDialogOpen, setIsDeleteAgentDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  // State for Project Workflows
  const [projectWorkflows, setProjectWorkflows] = useState<ProjectWorkflow[]>([]);
  const [isAddWorkflowDialogOpen, setIsAddWorkflowDialogOpen] = useState(false);
  const [designingWorkflow, setDesigningWorkflow] = useState<ProjectWorkflow | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<ProjectWorkflow | null>(null);
  const [isDeleteWorkflowDialogOpen, setIsDeleteWorkflowDialogOpen] = useState(false);
  const [isViewEditWorkflowPlaceholderDialogOpen, setIsViewEditWorkflowPlaceholderDialogOpen] = useState(false);
  const [selectedWorkflowForPlaceholderDialog, setSelectedWorkflowForPlaceholderDialog] = useState<ProjectWorkflow | null>(null);


  // State for Task Chat Dialog
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [chattingTask, setChattingTask] = useState<Task | null>(null);

  // State for Project Files (Repository Tab)
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string>('/');


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!projectId || !isClient) return;

    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    const allProjects: Project[] = allProjectsStored ? JSON.parse(allProjectsStored) : initialMockProjects;
    const foundProject = allProjects.find(p => p.id === projectId);

    if (foundProject) {
      setProject(foundProject);
      setMockProgress((foundProject.id.charCodeAt(foundProject.id.length - 1) % 60) + 30);

      const tasksStorageKey = getTasksStorageKey(projectId);
      const storedTasks = localStorage.getItem(tasksStorageKey);
      const today = startOfDay(new Date());

      const initialMockTasksForProject: Task[] = [
        { id: `${projectId}-task-1`, title: `Define ${foundProject.name} scope`, status: 'Done', assignedTo: 'Requirements Engineering Process', startDate: format(addDays(today, -10), 'yyyy-MM-dd'), durationDays: 2, progress: 100, parentId: null, dependencies: [], isMilestone: false, description: "Initial scoping task for the project. AI Reasoning: Based on project type, this task should be assigned to Requirements Engineering. Duration is 2 days for initial AI-assisted analysis." },
        { id: `${projectId}-task-2`, title: `Develop core logic for ${foundProject.name}`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(today, -5), 'yyyy-MM-dd'), durationDays: 5, progress: 40, parentId: null, dependencies: [`${projectId}-task-1`], isMilestone: false, description: "Core development phase for the main features. AI Reasoning: This task is a primary development activity. Assigned to Software Design & Implementation. AI agents can accelerate coding, so 5 days is estimated." },
        { id: `${projectId}-task-sub-1`, title: `Sub-task for API integration`, status: 'To Do', assignedTo: 'Code Implementation Agent', startDate: format(addDays(today,-4), 'yyyy-MM-dd'), durationDays: 2, progress: 0, parentId: `${projectId}-task-2`, dependencies: [], isMilestone: false, description: "A specific sub-component for API layer. AI Reasoning: Detailed sub-task for API work, assigned to a specialized Code agent." },
        { id: `${projectId}-task-3`, title: `Test ${foundProject.name} integration`, status: 'To Do', assignedTo: 'Software Testing & QA Cycle', startDate: format(today, 'yyyy-MM-dd'), durationDays: 3, progress: 0, parentId: null, dependencies: [`${projectId}-task-2`], isMilestone: false, description: "Integration testing of all developed modules. AI Reasoning: Post-development, testing is crucial. Assigned to Software Testing & QA Cycle. Duration assumes AI-driven test case generation and execution." },
        { id: `${projectId}-milestone-1`, title: `Project Kick-off Meeting`, status: 'Done', assignedTo: 'Project Lead', startDate: format(addDays(today, -15), 'yyyy-MM-dd'), durationDays: 0, progress: 100, isMilestone: true, parentId: null, dependencies: [], description: "Official project start and alignment meeting. AI Reasoning: Standard project milestone." },
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
          setProjectAgents(initialProjectScopedMockAgents.map(a => ({...a, id: `${a.id}-${projectId.slice(-3)}`})));
        }
      } else {
        setProjectAgents(initialProjectScopedMockAgents.map(a => ({...a, id: `${a.id}-${projectId.slice(-3)}`})));
      }

      const workflowsStorageKey = getWorkflowsStorageKey(projectId);
      const storedWorkflows = localStorage.getItem(workflowsStorageKey);
      if (storedWorkflows) {
        try {
          const parsedWorkflows = JSON.parse(storedWorkflows) as ProjectWorkflow[];
          // console.log(`PROJECT_DETAIL_PAGE: Loaded ${parsedWorkflows.length} workflows from localStorage for project ${projectId}.`);
          setProjectWorkflows(parsedWorkflows.map(wf => ({
            ...wf,
            nodes: wf.nodes || [],
            edges: wf.edges || [],
          })));
        } catch (error) {
          console.error(`Failed to parse workflows for project ${projectId} from localStorage`, error);
           const defaultWorkflowsWithIds = predefinedWorkflowsData(projectId).map(wf => ({
            ...wf,
            nodes: wf.nodes || [],
            edges: wf.edges || [],
          }));
          setProjectWorkflows(defaultWorkflowsWithIds);
          // console.log(`PROJECT_DETAIL_PAGE: Initialized with ${defaultWorkflowsWithIds.length} predefined workflows for project ${projectId}.`);
        }
      } else {
        const defaultWorkflowsWithIds = predefinedWorkflowsData(projectId).map(wf => ({
            ...wf,
            nodes: wf.nodes || [],
            edges: wf.edges || [],
          }));
        setProjectWorkflows(defaultWorkflowsWithIds);
        // console.log(`PROJECT_DETAIL_PAGE: Initialized with ${defaultWorkflowsWithIds.length} predefined workflows for project ${projectId} (no localStorage data).`);
      }

      const filesStorageKey = getFilesStorageKey(projectId);
      const storedFiles = localStorage.getItem(filesStorageKey);
      if (storedFiles) {
        try {
          setProjectFiles(JSON.parse(storedFiles));
        } catch (error) {
          console.error(`Failed to parse files for project ${projectId} from localStorage`, error);
          setProjectFiles(initialMockFilesData(projectId));
        }
      } else {
        setProjectFiles(initialMockFilesData(projectId));
      }
      setCurrentFilePath('/'); // Reset path on project load

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
        // console.log("PROJECT_DETAIL_PAGE: projectWorkflows useEffect triggered. Current designingWorkflow:", designingWorkflow?.id);
        const currentWorkflowsInStorage = localStorage.getItem(getWorkflowsStorageKey(projectId));
        if (projectWorkflows.length > 0 || currentWorkflowsInStorage !== null) {
             try {
                // console.log(`PROJECT_DETAIL_PAGE: Saving ${projectWorkflows.length} workflows to localStorage for project ${projectId}. Designing WF Nodes: ${(designingWorkflow?.nodes || []).length}`);
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
  }, [projectWorkflows, projectId, isClient]);

  useEffect(() => {
    if (designingWorkflow && projectWorkflows) {
      const updatedDesigningWorkflowInstance = projectWorkflows.find(wf => wf.id === designingWorkflow.id);
      if (updatedDesigningWorkflowInstance) {
        if (JSON.stringify(updatedDesigningWorkflowInstance) !== JSON.stringify(designingWorkflow)) {
            // console.log("PROJECT_DETAIL_PAGE: Syncing designingWorkflow with updated instance from projectWorkflows list. ID:", updatedDesigningWorkflowInstance.id, "New nodes count:", (updatedDesigningWorkflowInstance.nodes || []).length);
            setDesigningWorkflow(updatedDesigningWorkflowInstance);
        }
      } else if (designingWorkflow) {
          // console.log("PROJECT_DETAIL_PAGE: Designing workflow no longer found in projectWorkflows list. Clearing designingWorkflow. ID:", designingWorkflow?.id);
          setDesigningWorkflow(null); // Clear if workflow was deleted
      }
    }
  }, [projectWorkflows, designingWorkflow?.id]);


  useEffect(() => {
    if (isClient && projectId && (projectFiles.length > 0 || localStorage.getItem(getFilesStorageKey(projectId)) !== null )) {
      localStorage.setItem(getFilesStorageKey(projectId), JSON.stringify(projectFiles));
    }
  }, [projectFiles, projectId, isClient]);

  const formatDate = (dateString: string | undefined, formatString: string = "MMMM d, yyyy 'at' hh:mm a") => {
    if (!isClient || !dateString) return 'Loading date...';
    try {
       if (!dateString.includes('-') && !dateString.includes('/') && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(dateString) && !/^\d{4}-\d{2}-\d{2}$/.test(dateString) ) {
          return dateString;
       }
      return format(parseISO(dateString), formatString);
    } catch (error) {
      return dateString;
    }
  };

  const updateWorkflowStatusBasedOnTasks = useCallback((
    currentTasks: Task[],
    currentWorkflows: ProjectWorkflow[]
  ): ProjectWorkflow[] => {
    let workflowsChanged = false;
    const newWorkflows = currentWorkflows.map(workflow => {
      if (workflow.status === 'Active') {
        const relevantTasks = currentTasks.filter(task => task.assignedTo === workflow.name && !task.isMilestone);
        if (relevantTasks.length > 0 && relevantTasks.every(task => task.status === 'Done')) {
          if (workflow.status !== 'Inactive') {
            workflowsChanged = true;
            toast({
              title: "Workflow Completed",
              description: `Workflow "${workflow.name}" has completed all its tasks and is now Inactive.`,
            });
            return { ...workflow, status: 'Inactive', lastRun: new Date().toISOString() };
          }
        }
      }
      return workflow;
    });

    if (workflowsChanged) {
      return newWorkflows;
    }
    return currentWorkflows;
  }, [toast]);


  const handleTaskPlannedAndAccepted = (
    aiOutput: PlanProjectTaskOutput
  ) => {
    console.log("PROJECT_DETAIL_PAGE: handleTaskPlannedAndAccepted received aiOutput:", JSON.stringify(aiOutput, null, 2));

    const plannedTaskDataFromAI = aiOutput.plannedTask || {};
    const aiReasoning = aiOutput.reasoning || "No reasoning provided by AI.";

    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted taskTitle:", plannedTaskDataFromAI.title);
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted aiReasoning:", aiReasoning);
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted suggestedSubTasks:", JSON.stringify(plannedTaskDataFromAI.suggestedSubTasks, null, 2));


    const subTasksDetailsText = (plannedTaskDataFromAI.suggestedSubTasks && plannedTaskDataFromAI.suggestedSubTasks.length > 0)
        ? (plannedTaskDataFromAI.suggestedSubTasks || [])
            .map(st => `- ${st.title || 'Untitled Sub-task'} (Agent Type: ${st.assignedAgentType || 'N/A'}) - Desc: ${st.description || 'N/A'}`)
            .join('\n')
        : "None specified by AI.";
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed subTasksDetailsText:", subTasksDetailsText);

    let combinedDescription = `AI Reasoning: ${aiReasoning.trim()}`;
    if (subTasksDetailsText !== "None specified by AI.") {
      combinedDescription += `\n\nAI Suggested Sub-Tasks / Steps:\n${subTasksDetailsText.trim()}`;
    }
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed combinedDescription:", combinedDescription);


    const mainTask: Task = {
      id: `task-proj-${projectId}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`,
      title: plannedTaskDataFromAI.title || "Untitled AI Task",
      status: plannedTaskDataFromAI.status || (plannedTaskDataFromAI.isMilestone ? 'To Do' : 'To Do'),
      assignedTo: plannedTaskDataFromAI.assignedTo || 'AI Assistant to determine',
      startDate: plannedTaskDataFromAI.startDate || format(new Date(), 'yyyy-MM-dd'),
      durationDays: plannedTaskDataFromAI.isMilestone ? 0 : (plannedTaskDataFromAI.durationDays === undefined || plannedTaskDataFromAI.durationDays < 1 ? 1 : plannedTaskDataFromAI.durationDays),
      progress: plannedTaskDataFromAI.isMilestone ? (plannedTaskDataFromAI.status === 'Done' ? 100 : 0) : (plannedTaskDataFromAI.progress === undefined ? 0 : Math.min(100, Math.max(0, plannedTaskDataFromAI.progress))),
      isMilestone: plannedTaskDataFromAI.isMilestone || false,
      parentId: (plannedTaskDataFromAI.parentId === "null" || plannedTaskDataFromAI.parentId === "" || plannedTaskDataFromAI.parentId === undefined) ? null : plannedTaskDataFromAI.parentId,
      dependencies: plannedTaskDataFromAI.dependencies || [],
      description: combinedDescription.trim() || "AI-planned task.",
    };
    
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed mainTask object:", JSON.stringify(mainTask, null, 2));


    let newTasksToAdd: Task[] = [mainTask];
    let workflowAutoActivated = false;
    let autoStartedByAgent = false; // For direct agent assignment (legacy, less likely now)
    const assignedWorkflowName = mainTask.assignedTo;


    // Check if the task is assigned to a workflow and if that workflow should be activated
    if (assignedWorkflowName && assignedWorkflowName !== "AI Assistant to determine" && !mainTask.isMilestone) {
      setProjectWorkflows(prevWorkflows => {
        let activated = false;
        const updatedWorkflows = prevWorkflows.map(wf => {
          if (wf.name === assignedWorkflowName && (wf.status === 'Draft' || wf.status === 'Inactive')) {
            activated = true;
            workflowAutoActivated = true; // Set flag for toast message
            return { ...wf, status: 'Active', lastRun: new Date().toISOString() };
          }
          return wf;
        });
        if (activated) return updatedWorkflows;
        return prevWorkflows;
      });
    }

    // If sub-tasks are suggested by AI, create them
    if (plannedTaskDataFromAI.suggestedSubTasks && plannedTaskDataFromAI.suggestedSubTasks.length > 0 && !mainTask.isMilestone) {
        const subTasks: Task[] = (plannedTaskDataFromAI.suggestedSubTasks || []).map((st, index) => {
            const subTaskId = `subtask-${mainTask.id.slice(-5)}-${index}-${Math.random().toString(36).substring(2,5)}`;
            return {
                id: subTaskId,
                title: st.title || "Untitled Sub-task",
                status: 'To Do',
                assignedTo: st.assignedAgentType || "General Agent", // Sub-tasks are assigned to Agent Types
                startDate: mainTask.startDate, // Or could be offset based on main task
                durationDays: 1, // Default, AI could suggest this too
                progress: 0,
                isMilestone: false,
                parentId: mainTask.id,
                dependencies: index === 0 ? [] : [newTasksToAdd[index]?.id].filter(Boolean) as string[], // Depends on previous sub-task in the list
                description: st.description || "No description provided.",
            };
        });
        newTasksToAdd = [mainTask, ...subTasks];

        // If the main task was assigned to a workflow that is now active,
        // and the main task itself isn't done, set it to In Progress.
        const isAssignedWorkflowNowActive = projectWorkflows.find(wf => wf.name === mainTask.assignedTo)?.status === 'Active' || workflowAutoActivated;
        if (isAssignedWorkflowNowActive && mainTask.status !== 'Done') {
            newTasksToAdd[0] = { ...mainTask, status: 'In Progress', progress: mainTask.progress || 10 }; // Start with some progress
            autoStartedByAgent = true; // Using this flag to indicate workflow-driven start
        }

    } else if (!mainTask.isMilestone && mainTask.assignedTo) {
        // Legacy: Check if assigned directly to a running agent (less likely now)
        const assignedAgent = projectAgents.find(agent => agent.name === mainTask.assignedTo);
        if (assignedAgent && assignedAgent.status === 'Running' && mainTask.status !== 'Done') {
            newTasksToAdd[0] = { ...mainTask, status: 'In Progress', progress: mainTask.progress || 10 };
            autoStartedByAgent = true;
            setProjectAgents(prevAgents => prevAgents.map(agent =>
                agent.id === assignedAgent.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
            ));
        }
    }

    setTasks(prevTasks => [...newTasksToAdd, ...prevTasks]);
    setIsAITaskPlannerDialogOpen(false);

    let toastTitle = mainTask.isMilestone ? "Milestone Planned (AI)" : "Task Planned (AI)";
    let toastDescriptionText = `${mainTask.isMilestone ? "Milestone" : "Task"} "${mainTask.title}" has been added.`;

    if (workflowAutoActivated) {
        toastDescriptionText += ` Workflow "${assignedWorkflowName}" has been activated.`;
    } else if (assignedWorkflowName && assignedWorkflowName !== "AI Assistant to determine" && !mainTask.isMilestone) {
      const workflowExists = projectWorkflows.find(wf => wf.name === assignedWorkflowName);
      if (workflowExists && workflowExists.status === 'Active') {
          toastDescriptionText += ` Assigned to active workflow "${assignedWorkflowName}".`;
      } else if (workflowExists) {
          toastDescriptionText += ` Assigned to workflow "${assignedWorkflowName}".`;
      } else {
          toastDescriptionText += ` Assigned to conceptual team/workflow "${assignedWorkflowName}".`;
      }
    }

    if (autoStartedByAgent && !mainTask.isMilestone && newTasksToAdd.length > 1) { // If subtasks created, main task starts
        toastDescriptionText += ` Main task set to 'In Progress'.`;
    } else if (autoStartedByAgent && !mainTask.isMilestone) { // If no subtasks but direct agent assignment
        toastDescriptionText += ` Task set to 'In Progress'.`;
    }


    if (newTasksToAdd.length -1 > 0 && !mainTask.isMilestone) {
      toastDescriptionText += ` ${newTasksToAdd.length -1} sub-task(s) also created.`;
    }

    toast({ title: toastTitle, description: toastDescriptionText.trim() });

    const taskForChat = newTasksToAdd[0]; // The main task
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Attempting to open chat for main task:", JSON.stringify(taskForChat, null, 2));
    setChattingTask(taskForChat);
    setIsChatDialogOpen(true);
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
        progress: updatedTaskData.isMilestone
          ? (updatedTaskData.status === 'Done' ? 100 : (updatedTaskData.progress === undefined ? 0 : updatedTaskData.progress))
          : (updatedTaskData.progress === undefined ? 0 : updatedTaskData.progress),
        status: updatedTaskData.isMilestone
          ? (updatedTaskData.status === 'Done' ? 'Done' : 'To Do')
          : updatedTaskData.status,
        parentId: updatedTaskData.parentId === "" || updatedTaskData.parentId === undefined ? null : updatedTaskData.parentId,
        dependencies: updatedTaskData.dependencies || [],
    }

    const newTasks = tasks.map(task => task.id === taskToUpdate.id ? taskToUpdate : task);
    setTasks(newTasks);

    if (taskToUpdate.assignedTo) {
       setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(newTasks, prevWorkflows));
    }

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
      const remainingTasks = tasks.filter(task => task.id !== taskToDelete.id);
      setTasks(remainingTasks);
      if (taskToDelete.assignedTo) {
         setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(remainingTasks, prevWorkflows));
      }
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
      id: uid('wf-proj'),
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
    // console.log("PROJECT_DETAIL_PAGE: Opening designer for workflow:", workflow.id, workflow.name);
    setDesigningWorkflow(workflow);
  };

  const handleCloseWorkflowDesigner = () => {
    toast({ title: "Workflow Design Closed", description: `Stopped designing workflow: "${designingWorkflow?.name}". Changes are saved automatically.`});
    setDesigningWorkflow(null);
  };

  const handleWorkflowNodesChange = useCallback((updatedNodes: WorkflowNode[]) => {
    console.log(`PROJECT_DETAIL_PAGE: handleWorkflowNodesChange called. Designing WF ID: ${designingWorkflow?.id}. Updated nodes length: ${updatedNodes.length}`);
    if (!designingWorkflow) {
      console.warn("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange called without designingWorkflow set.");
      return;
    }
    console.log(`PROJECT_DETAIL_PAGE: handleWorkflowNodesChange received updatedNodes. Length: ${updatedNodes.length}, IDs: ${updatedNodes.map(n=>n.id).join(', ')}`);
    console.log(`PROJECT_DETAIL_PAGE: Current designingWorkflow ID: ${designingWorkflow.id}, Name: ${designingWorkflow.name}`);

    setProjectWorkflows(prevWorkflows => {
        console.log("PROJECT_DETAIL_PAGE: Inside setProjectWorkflows for nodes. prevWorkflows length:", prevWorkflows.length);
        const newWorkflowsArray = prevWorkflows.map(wf => {
            if (wf.id === designingWorkflow.id) {
                console.log("PROJECT_DETAIL_PAGE: Updating nodes for workflow ID:", wf.id, ". New nodes count:", updatedNodes.length);
                return { ...wf, nodes: updatedNodes };
            }
            return wf;
        });
        newWorkflowsArray.forEach(wf => {
             console.log("PROJECT_DETAIL_PAGE: Workflow in newWorkflowsArray (after node map). ID:", wf.id, "Nodes count:", (wf.nodes || []).length, "Nodes IDs:", (wf.nodes || []).map(n => n.id).join(', '));
        });
        return newWorkflowsArray;
    });
  }, [designingWorkflow?.id]); // Only re-create if designingWorkflow.id changes


  const handleWorkflowEdgesChange = useCallback((updatedEdges: WorkflowEdge[]) => {
    console.log(`PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange called. Designing WF ID: ${designingWorkflow?.id}. Updated edges length: ${updatedEdges.length}`);
     if (!designingWorkflow) {
        console.warn("PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange called without designingWorkflow set.");
        return;
    }
    setProjectWorkflows(prevWorkflows => {
        console.log("PROJECT_DETAIL_PAGE: Inside setProjectWorkflows for edges. prevWorkflows length:", prevWorkflows.length);
        const newWorkflowsArray = prevWorkflows.map(wf => {
            if (wf.id === designingWorkflow.id) {
                 console.log("PROJECT_DETAIL_PAGE: Updating edges for workflow ID:", wf.id, ". New edges count:", updatedEdges.length);
                return { ...wf, edges: updatedEdges };
            }
            return wf;
        });
        newWorkflowsArray.forEach(wf => {
             console.log("PROJECT_DETAIL_PAGE: Workflow in newWorkflowsArray (after edge map). ID:", wf.id, "Edges count:", (wf.edges || []).length);
        });
        return newWorkflowsArray;
    });
  }, [designingWorkflow?.id]); // Only re-create if designingWorkflow.id changes

  const handleOpenDeleteWorkflowDialog = (workflow: ProjectWorkflow) => {
    setWorkflowToDelete(workflow);
    setIsDeleteWorkflowDialogOpen(true);
  };

  const confirmDeleteWorkflow = () => {
    if (workflowToDelete) {
      setProjectWorkflows(prevWorkflows => prevWorkflows.filter(wf => wf.id !== workflowToDelete.id));
      toast({ title: "Workflow Deleted", description: `Workflow "${workflowToDelete.name}" has been deleted from project "${project?.name}".`, variant: 'destructive' });
      if (designingWorkflow && designingWorkflow.id === workflowToDelete.id) {
        setDesigningWorkflow(null);
      }
      setWorkflowToDelete(null);
      setIsDeleteWorkflowDialogOpen(false);
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

    let updatedTasksArray = [...tasks];

    if (sourceTaskStatus !== newStatus) { // Task status is changing
      let updatedTask: Task = {
        ...taskToMove,
        status: newStatus,
        progress: newStatus === 'Done' ? 100 : (newStatus === 'To Do' || newStatus === 'Blocked' ? (taskToMove.isMilestone ? taskToMove.progress : 0) : taskToMove.progress),
      };
       if (updatedTask.isMilestone) {
         updatedTask.progress = newStatus === 'Done' ? 100 : 0;
       }


      updatedTasksArray = tasks.map(task => (task.id === draggedTaskId ? updatedTask : task));

      const taskToReorder = updatedTasksArray.find(t => t.id === draggedTaskId)!;
      updatedTasksArray = updatedTasksArray.filter(t => t.id !== draggedTaskId);

      const tasksInNewStatusCol = updatedTasksArray.filter(t => t.status === newStatus);
      const otherTasks = updatedTasksArray.filter(t => t.status !== newStatus);

      updatedTasksArray = [...otherTasks, ...tasksInNewStatusCol, taskToReorder];

      toast({
        title: "Task Status Updated",
        description: `Task "${updatedTask.title}" moved to "${newStatus}".`,
      });
    } else { // Dropped in the same column
        const taskToReorder = updatedTasksArray.find(t => t.id === draggedTaskId);
        if (!taskToReorder) return updatedTasksArray; // Should not happen

        // Check if it was dropped on the column itself (not a specific task card)
        // For simplicity, if it's dropped on the same column, move to end
        if (event.target === event.currentTarget) { // Dropped on the column div
            updatedTasksArray = updatedTasksArray.filter(t => t.id !== draggedTaskId); // Remove from current position
            
            const tasksInSameStatusCol = updatedTasksArray.filter(t => t.status === sourceTaskStatus);
            const otherStatusTasks = updatedTasksArray.filter(t => t.status !== sourceTaskStatus);
            
            updatedTasksArray = [...otherStatusTasks, ...tasksInSameStatusCol, taskToReorder]; // Add to the end of its status group

            toast({
                title: "Task Reordered",
                description: `Task "${taskToReorder.title}" moved to the end of "${sourceTaskStatus}".`,
            });
        }
        // If dropped on another task card, handleTaskCardDrop will handle it and stop propagation
    }
    setTasks(updatedTasksArray);
    setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasksArray, prevWorkflows));
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
    event.stopPropagation(); // Important: Prevent column's onDrop from firing

    const draggedTaskId = event.dataTransfer.getData('taskId');
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    setReorderTargetTaskId(null);
    setDraggingOverStatus(null);


    if (sourceTaskStatus === targetTask.status) { // Only allow reorder within the same column
      setTasks(prevTasks => {
        const draggedTaskIndex = prevTasks.findIndex(t => t.id === draggedTaskId);
        if (draggedTaskIndex === -1) return prevTasks;

        const draggedTask = prevTasks[draggedTaskIndex];
        let tasksWithoutDragged = prevTasks.filter(t => t.id !== draggedTaskId);
        
        // Find the target task's new index in the array without the dragged task
        const targetTaskIndexInFiltered = tasksWithoutDragged.findIndex(t => t.id === targetTask.id);

        if (targetTaskIndexInFiltered === -1) {
             // Should not happen if targetTask is valid, but as a fallback, add to end of its status group
             const tasksInStatus = tasksWithoutDragged.filter(t => t.status === sourceTaskStatus);
             const otherStatusTasks = tasksWithoutDragged.filter(t => t.status !== sourceTaskStatus);
             tasksWithoutDragged = [...otherStatusTasks, ...tasksInStatus, draggedTask]; // Add to end of its status group
             return tasksWithoutDragged;
        }

        // Insert draggedTask before targetTask
        const newTasks = [
          ...tasksWithoutDragged.slice(0, targetTaskIndexInFiltered),
          draggedTask,
          ...tasksWithoutDragged.slice(targetTaskIndexInFiltered)
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
      // Adjust target index because we removed an element
      const adjustedTargetIndex = newTasks.findIndex(task => task.id === targetTaskId);
      newTasks.splice(adjustedTargetIndex, 0, draggedTask); // Insert before the target

      setTimeout(() => { // Defer toast to avoid issues with React state updates
        toast({
          title: "Tasks Reordered",
          description: `Task "${draggedTask.title}" moved in Gantt chart.`,
        });
      }, 0);
      return newTasks;
    });
  };

  const handleOpenChatDialog = (task: Task) => {
    console.log("PROJECT_DETAIL_PAGE: Opening chat for task:", JSON.stringify(task, null, 2));
    setChattingTask(task);
    setIsChatDialogOpen(true);
  };

  const getFilesForPath = (path: string): ProjectFile[] => {
    if (path === '/') {
      return projectFiles.filter(item => (!item.path || item.path === '/'));
    }
    const segments = path.split('/').filter(Boolean);
    let currentLevelItems = projectFiles;
    let found = true;
    for (const segment of segments) {
        const folder = currentLevelItems.find(item => item.type === 'folder' && item.name === segment);
        if (folder && folder.children) {
            currentLevelItems = folder.children;
        } else {
            found = false;
            break;
        }
    }
    return found ? currentLevelItems.filter(item => item.path === `/${segments.join('/')}/` || (segments.length === 0 && item.path === '/')) : [];
  };


  const renderProjectFiles = () => {
    const itemsToRender = getFilesForPath(currentFilePath);

    return itemsToRender.map(file => (
      <TableRow key={file.id} className="hover:bg-muted/50">
        <TableCell>
          <Button
            variant="link"
            className="p-0 h-auto font-medium text-foreground hover:underline"
            onClick={() => {
              if (file.type === 'folder') {
                let newPath = currentFilePath;
                if (newPath.slice(-1) !== '/') newPath += '/';
                newPath += file.name;
                if (newPath.slice(-1) !== '/') newPath += '/'; // Ensure trailing slash for folder paths
                setCurrentFilePath(newPath);
              } else {
                toast({ title: "Opening File (Mock)", description: `Simulating opening of "${file.name}".` });
              }
            }}
          >
            <div className="flex items-center gap-2">
              {file.type === 'folder' ? <FolderIcon className="h-5 w-5 text-primary" /> : <FileIcon className="h-5 w-5 text-muted-foreground" />}
              <span className="truncate">{file.name}</span>
            </div>
          </Button>
        </TableCell>
        <TableCell className="hidden sm:table-cell text-muted-foreground">{file.size || '-'}</TableCell>
        <TableCell className="hidden md:table-cell text-muted-foreground">{file.lastModified ? formatDate(file.lastModified, 'MMM d, yyyy') : '-'}</TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" disabled>Actions</Button> {/* Placeholder */}
        </TableCell>
      </TableRow>
    ));
  };

  const handleNavigateUp = () => {
    if (currentFilePath === '/') return;
    const pathSegments = currentFilePath.split('/').filter(p => p);
    pathSegments.pop();
    setCurrentFilePath(pathSegments.length > 0 ? `/${pathSegments.join('/')}/` : '/');
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
  // Start of the main return statement for ProjectDetailPage
  return (
    <div className="container mx-auto">
      <PageHeader className="items-start justify-between sm:flex-row sm:items-center">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
           {project.thumbnailUrl && (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex-shrink-0 rounded-lg overflow-hidden border shadow-md">
              <Image
                src={project.thumbnailUrl}
                alt={`${project.name} thumbnail`}
                fill
                sizes="(max-width: 639px) 64px, (max-width: 767px) 80px, 96px"
                style={{ objectFit: 'cover' }}
                data-ai-hint="project abstract"
                priority
              />
            </div>
          )}
          <div className="flex-grow">
            <PageHeaderHeading><Briefcase className="mr-2 inline-block h-7 w-7 sm:mr-3 sm:h-8 sm:w-8" />{project.name}</PageHeaderHeading>
            <PageHeaderDescription className="mt-1 text-xs sm:text-sm">
              {project.description}
            </PageHeaderDescription>
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
            <p className="ml-6">{isClient ? formatDate(project.lastUpdated, "MMMM d, yyyy 'at' hh:mm a") : 'Processing...'}</p>
             {(project.agentCount !== undefined || projectAgents.length > 0) && (
              <div className="flex items-center"><Bot className="h-4 w-4 mr-2 text-muted-foreground" /><span className="text-muted-foreground">Agents:</span><span className="ml-auto font-medium">{projectAgents.length}</span></div>
            )}
            {(project.workflowCount !== undefined || projectWorkflows.length > 0) && (
              <div className="flex items-center"><WorkflowIcon className="h-4 w-4 mr-2 text-muted-foreground" /><span className="text-muted-foreground">Workflows:</span><span className="ml-auto font-medium">{projectWorkflows.filter(w => w.status === 'Active').length} Active / {projectWorkflows.length} Total</span></div>
            )}
          </CardContent>
        </Card>
         <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Quick Overview</CardTitle><CardDescription className="text-xs sm:text-sm text-muted-foreground">A brief summary of the project's current state.</CardDescription></CardHeader>
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
         <TabsList className="grid w-full grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
            <TabsTrigger value="gantt"><GanttChartSquare className="mr-2 h-4 w-4"/>Gantt Chart</TabsTrigger>
            <TabsTrigger value="board"><ListChecks className="mr-2 h-4 w-4"/>Task Board</TabsTrigger>
            <TabsTrigger value="repository"><FolderIcon className="mr-2 h-4 w-4"/>Repository</TabsTrigger>
            <TabsTrigger value="projectAgents"><SlidersHorizontal className="mr-2 h-4 w-4"/>Project Agents</TabsTrigger>
            <TabsTrigger value="projectWorkflows"><WorkflowIcon className="mr-2 h-4 w-4"/>Project Workflows &amp; Design</TabsTrigger>
        </TabsList>

        <TabsContent value="gantt" className="mt-8 sm:mt-4">
          <Card>
            <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Gantt Chart</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                  Timeline view of tasks for project "{project.name}".
                </CardDescription>
              </div>
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
                        <p className="text-sm text-muted-foreground/80 mt-1 mb-4">Plan a task with AI to get started!</p>
                        <Button variant="outline" size="sm" onClick={() => setIsAITaskPlannerDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                            <Brain className="mr-2 h-4 w-4" />Plan First Task with AI
                        </Button>
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="board" className="mt-8 sm:mt-4">
          <Card>
             <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Task Board (Kanban)</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground">Manage tasks by status for project "{project.name}".</CardDescription>
              </div>
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
                              data-task-id={task.id}
                              className={cn(
                                "shadow-sm bg-card flex flex-col hover:shadow-md transition-shadow cursor-grab group",
                                reorderTargetTaskId === task.id && "ring-2 ring-green-500"
                               )}
                              draggable
                              onDragStart={(e) => handleTaskCardDragStart(e, task)}
                              onDragOver={(e) => handleTaskCardDragOver(e, task)}
                              onDragLeave={handleTaskCardDragLeave}
                              onDrop={(e) => handleTaskCardDrop(e, task)}
                            >
                              <CardHeader className="p-3 flex items-start justify-between gap-2">
                                  <div className={cn("flex items-center flex-grow", task.parentId ? "pl-2" : "")}>
                                    <GripVertical className="h-4 w-4 mr-1.5 text-muted-foreground/50 cursor-grab flex-shrink-0 opacity-50 group-hover:opacity-100" />
                                    <CardTitle
                                        className={cn(
                                            "text-sm font-medium leading-tight flex items-center truncate",
                                            isParent && "font-bold"
                                        )}
                                    >
                                        {task.parentId && <FolderGit2 className="mr-1.5 h-3 w-3 text-muted-foreground/70 flex-shrink-0" />}
                                        {isParent && <ListTree className="mr-1.5 h-3 w-3 text-sky-600 flex-shrink-0" />}
                                        {task.isMilestone && <Diamond className="mr-1.5 h-3 w-3 text-amber-500 flex-shrink-0" />}
                                        <span className="truncate">{task.title}</span>
                                    </CardTitle>
                                  </div>
                              </CardHeader>
                              <CardContent className={cn("p-3 pt-0 text-xs flex-grow", task.parentId ? "pl-5" : "")}>
                                <p className="text-muted-foreground truncate">Assigned to: {task.assignedTo}</p>
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
                                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleOpenEditTaskDialog(task, true)}><EyeIcon className="mr-1 h-3 w-3" /> View</Button>
                                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleOpenEditTaskDialog(task)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleOpenChatDialog(task)}><MessageSquare className="mr-1 h-3 w-3" /> Chat</Button>
                                <Button variant="destructive" size="sm" className="text-xs" onClick={() => handleOpenDeleteTaskDialog(task)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
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
                  <p className="text-sm text-muted-foreground/80 mt-1 mb-4">Plan a task with AI to get started!</p>
                  <Button variant="outline" size="sm" onClick={() => setIsAITaskPlannerDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                     <Brain className="mr-2 h-4 w-4" />Plan First Task with AI
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repository" className="mt-8 sm:mt-4">
          <Card>
            <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Project Repository</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                  Current path: <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{currentFilePath}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
                {currentFilePath !== '/' && (
                  <Button variant="outline" size="sm" onClick={handleNavigateUp} className="w-full sm:w-auto">
                    <ArrowLeftCircle className="mr-2 h-4 w-4" /> Up One Level
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled>
                  <UploadCloud className="mr-2 h-4 w-4" /> Upload Files
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled>
                  <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {getFilesForPath(currentFilePath).length > 0 || (currentFilePath === '/' && projectFiles.length > 0) ? (
                <Table>
                  <ShadCnTableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Size</TableHead>
                      <TableHead className="hidden md:table-cell">Last Modified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </ShadCnTableHeader>
                  <TableBody>
                    {renderProjectFiles()}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
                  <FolderIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-lg font-medium text-muted-foreground">
                    {currentFilePath === '/' ? 'No files or folders in this project repository yet.' : `Folder "${currentFilePath.slice(0,-1).split('/').pop()}" is empty.`}
                  </p>
                  <p className="text-sm text-muted-foreground/80 mt-1 mb-4">
                    {currentFilePath === '/' ? 'Upload files or create folders to get started.' : 'You can upload files or create new folders here.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projectAgents" className="mt-8 sm:mt-4">
            <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4">
                <div>
                <PageHeaderHeading className="text-2xl">Project Agent Management</PageHeaderHeading>
                <PageHeaderDescription className="text-xs sm:text-sm">Manage agent configurations specific to project "{project?.name}".</PageHeaderDescription>
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

        <TabsContent value="projectWorkflows" className="mt-8 sm:mt-4">
          {!designingWorkflow ? (
            <>
              <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4">
                  <div>
                      <PageHeaderHeading className="text-2xl">Project Workflow Management</PageHeaderHeading>
                      <PageHeaderDescription className="text-xs sm:text-sm">Define workflows for project "{project?.name}". Select a workflow to open its design canvas.</PageHeaderDescription>
                  </div>
                  <Button variant="outline" onClick={() => setIsAddWorkflowDialogOpen(true)}  className="w-full mt-4 sm:w-auto sm:mt-0">
                      <PlusSquareIcon className="mr-2 h-4 w-4"/>Add New Project Workflow
                  </Button>
              </PageHeader>
              <Card>
                  <CardHeader>
                      <CardTitle>Existing Workflows for "{project?.name}"</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Manage and monitor workflows associated with this project. Click a workflow's 'Design' button to open its design canvas.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {projectWorkflows.length > 0 ? (
                          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                              {projectWorkflows.map(workflow => (
                                  <Card key={workflow.id} className="shadow-sm bg-card flex flex-col">
                                      <CardHeader className="p-4">
                                          <div className="flex items-center justify-between gap-2">
                                              <CardTitle className="text-base font-medium leading-tight truncate">{workflow.name}</CardTitle>
                                              <Badge variant="outline" className={cn("text-xs capitalize whitespace-nowrap shrink-0", workflowStatusColors[workflow.status])}>
                                                  {workflow.status}
                                              </Badge>
                                          </div>
                                          <CardDescription className="text-xs line-clamp-2 h-[2.2em]">{workflow.description}</CardDescription>
                                      </CardHeader>
                                      <CardContent className="p-4 pt-0 text-sm flex-grow">
                                          <p className="text-muted-foreground text-xs">
                                              Last Run: {workflow.lastRun ? formatDate(workflow.lastRun, "MMM d, hh:mm a") : 'Never'}
                                          </p>
                                          <p className="text-muted-foreground text-xs mt-1">
                                              Nodes: {workflow.nodes ? workflow.nodes.length : 0}
                                          </p>
                                           <p className="text-muted-foreground text-xs mt-1">
                                              Edges: {workflow.edges ? workflow.edges.length : 0}
                                          </p>
                                      </CardContent>
                                      <CardFooter className="p-4 border-t flex gap-2">
                                          <Button variant="default" size="sm" className="text-xs flex-1" onClick={() => handleOpenWorkflowDesigner(workflow)}><Settings className="mr-1.5 h-3.5 w-3.5" /> Design</Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs flex-1"
                                            onClick={() => {
                                                setProjectWorkflows(prev =>
                                                    prev.map(wf =>
                                                        wf.id === workflow.id
                                                        ? {...wf, status: wf.status === 'Active' ? 'Inactive' : 'Active', lastRun: new Date().toISOString()}
                                                        : wf
                                                    )
                                                );
                                                toast({title: `Workflow "${workflow.name}" ${workflow.status === 'Active' ? 'Deactivated' : 'Activated'}.`});
                                            }}
                                            disabled={workflow.status === 'Draft'}
                                          >
                                            {workflow.status === 'Active' ? <X className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                                            {workflow.status === 'Active' ? 'Deactivate' : 'Activate'}
                                          </Button>
                                          <Button variant="destructive" size="icon" className="shrink-0 h-8 w-8" onClick={() => handleOpenDeleteWorkflowDialog(workflow)} title="Delete Workflow">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete Workflow</span>
                                          </Button>
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
                    <PageHeaderDescription className="text-xs sm:text-sm">{designingWorkflow.description}</PageHeaderDescription>
                  </div>
                  <Button variant="outline" onClick={handleCloseWorkflowDesigner} className="w-full mt-2 sm:w-auto sm:mt-0"><XSquare className="mr-2 h-4 w-4"/>Close Designer</Button>
              </div>
              <div className="flex flex-col md:flex-row flex-grow gap-6 mt-2 overflow-hidden p-1"> {/* Added p-1 to parent */}
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

        <TabsContent value="aiSuggestions" className="mt-8 sm:mt-4">
            <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4">
                <div>
                    <PageHeaderHeading className="text-2xl">AI Agent Suggestions</PageHeaderHeading>
                    <PageHeaderDescription className="text-xs sm:text-sm">Get optimal agent configuration suggestions for tasks within project "{project?.name}".</PageHeaderDescription>
                </div>
            </PageHeader>
            <div className="max-w-full">
                <AgentConfigForm projectId={projectId} />
            </div>
        </TabsContent>

      </Tabs>

      {isAITaskPlannerDialogOpen && (
        <AITaskPlannerDialog
          open={isAITaskPlannerDialogOpen}
          onOpenChange={setIsAITaskPlannerDialogOpen}
          projectId={projectId}
          projectWorkflows={projectWorkflows.map(wf => ({
            id: wf.id,
            name: wf.name,
            description: wf.description,
            nodes: (wf.nodes || []).map(n => ({id: n.id, name: n.name, type: n.type})) // Ensure nodes are passed correctly
          }))}
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
      {chattingTask && (
        <TaskChatDialog
          open={isChatDialogOpen}
          onOpenChange={(isOpen) => {
            setIsChatDialogOpen(isOpen);
            if (!isOpen) {
              // console.log("PROJECT_DETAIL_PAGE: Closing chat dialog. Chatting task was:", chattingTask?.id);
              setChattingTask(null);
            }
          }}
          task={chattingTask}
        />
      )}
    </div>
  );
}
// End of file
