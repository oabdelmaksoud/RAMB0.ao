
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, PlusSquareIcon, EyeIcon, SlidersHorizontal, Lightbulb, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, X, Diamond, Users, FolderGit2, ListTree, MessageSquare, Settings, Brain, AlertTriangle, Edit, Folder as FolderIcon, File as FileIcon, UploadCloud, FolderPlus, ArrowLeftCircle, InfoIcon, Play } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, useRef } from 'react';
import type { Project, Task, Agent, ProjectWorkflow, WorkflowNode, WorkflowEdge, ProjectFile } from '@/types';
import { initialMockProjects, PROJECTS_STORAGE_KEY, getTasksStorageKey, getAgentsStorageKey, getWorkflowsStorageKey, getFilesStorageKey } from '@/app/projects/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
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
import { Label } from '@/components/ui/label';


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

const initialProjectScopedMockAgents = (projectId: string): Agent[] => [
  { id: `proj-agent-init-${projectId}-001`, name: 'Project Kickstart Analyzer', type: 'Analysis Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { scope: 'initial_setup', autoRun: false } },
  { id: `proj-agent-init-${projectId}-002`, name: 'Basic Task Reporter', type: 'Reporting Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { frequency: 'on-demand' } },
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
  const reqNode1: WorkflowNode = { id: uid('req-n1'), name: 'Elicit Stakeholder Needs', type: 'Analysis Agent', x: 50, y: 50, config: {} };
  const reqNode2: WorkflowNode = { id: uid('req-n2'), name: 'Analyze & Refine Requirements', type: 'Analysis Agent', x: 250, y: 150, config: {} };
  const reqNode3: WorkflowNode = { id: uid('req-n3'), name: 'Document Requirements Spec', type: 'Documentation Agent', x: 50, y: 250, config: {} };
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
  const swDevNode1: WorkflowNode = { id: uid('swd-n1'), name: 'Software Architecture Design', type: 'Custom Logic Agent', x: 50, y: 50, config: { designTool: "Lucidchart" } };
  const swDevNode2: WorkflowNode = { id: uid('swd-n2'), name: 'Detailed Component Design', type: 'Custom Logic Agent', x: 250, y: 120, config: { language: "TypeScript" } };
  const swDevNode3: WorkflowNode = { id: uid('swd-n3'), name: 'Code Implementation', type: 'Code Review Agent', x: 50, y: 190, config: { styleGuide: "Google" } };
  const swDevNode4: WorkflowNode = { id: uid('swd-n4'), name: 'Unit Testing', type: 'Testing Agent', x: 250, y: 260, config: { framework: "Jest" } };
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
  const swTestNode1: WorkflowNode = { id: uid('swt-n1'), name: 'Integration Testing', type: 'Testing Agent', x: 50, y: 50, config: { strategy: "bottom-up" } };
  const swTestNode2: WorkflowNode = { id: uid('swt-n2'), name: 'System Qualification Testing', type: 'Testing Agent', x: 250, y: 150, config: { environment: "staging" } };
  const swTestNode3: WorkflowNode = { id: uid('swt-n3'), name: 'Log & Track Defects', type: 'Reporting Agent', x: 50, y: 250, config: { tool: "JIRA" } };
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
  const projMonNode1: WorkflowNode = { id: uid('mon-n1'), name: 'Collect Task Progress', type: 'Monitoring Agent', x: 50, y: 50, config: { source: "Kanban Board" } };
  const projMonNode2: WorkflowNode = { id: uid('mon-n2'), name: 'Generate Weekly Report', type: 'Reporting Agent', x: 250, y: 120, config: { template: "weekly_status_v1" } };
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
    { id: `folder-${projectId}-src`, name: 'Source Code', type: 'folder', path: '/', children: [
        { id: `file-${projectId}-2`, name: 'main.py', type: 'file', path: '/Source Code/', size: '50KB', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: `file-${projectId}-3`, name: 'utils.py', type: 'file', path: '/Source Code/', size: '25KB', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: `folder-${projectId}-tests`, name: 'tests', type: 'folder', path: '/Source Code/', children: [
          { id: `file-${projectId}-s1`, name: 'test_main.py', type: 'file', path: '/Source Code/tests/', size: '5KB', lastModified: new Date().toISOString(), dependencies: [] },
        ], dependencies: []},
    ], dependencies: []},
    { id: `folder-${projectId}-docs`, name: 'Documentation', type: 'folder', path: '/', children: [
        { id: `file-${projectId}-4`, name: 'UserManual.pdf', type: 'file', path: '/Documentation/', size: '2.5MB', lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), dependencies: [] },
    ], dependencies: []},
    { id: `file-${projectId}-6`, name: 'MeetingNotes_2024-07-20.txt', type: 'file', path: '/', size: '5KB', lastModified: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), dependencies: [] },
];

// Placeholder for AddTaskDialog to satisfy props, will be replaced by AITaskPlannerDialog
// This avoids errors if AddTaskDialog is not fully removed or refactored yet.
const AddTaskDialogPlaceholder = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
  if (!open) return null;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Task (Placeholder)</AlertDialogTitle>
          <AlertDialogDescription>
            Task addition is now handled by "Plan Task with AI".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Task Management State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAITaskPlannerDialogOpen, setIsAITaskPlannerDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isViewingTask, setIsViewingTask] = useState(false); // For read-only mode of EditTaskDialog
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);
  const [draggingOverStatus, setDraggingOverStatus] = useState<Task['status'] | null>(null);
  const [reorderTargetTaskId, setReorderTargetTaskId] = useState<string | null>(null);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false); // Kept for potential future manual add

  // Agent Management State (Project-Specific)
  const [projectAgents, setProjectAgents] = useState<Agent[]>([]);
  const [isEditAgentDialogOpen, setIsEditAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isDeleteAgentDialogOpen, setIsDeleteAgentDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  // Workflow Management State
  const [projectWorkflows, setProjectWorkflows] = useState<ProjectWorkflow[]>([]);
  const [isAddWorkflowDialogOpen, setIsAddWorkflowDialogOpen] = useState(false);
  const [designingWorkflow, setDesigningWorkflow] = useState<ProjectWorkflow | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<ProjectWorkflow | null>(null);
  const [isDeleteWorkflowDialogOpen, setIsDeleteWorkflowDialogOpen] = useState(false);
  const [isViewEditWorkflowDialogOpen, setIsViewEditWorkflowDialogOpen] = useState(false); // For placeholder dialog
  const [selectedWorkflowForDialog, setSelectedWorkflowForDialog] = useState<ProjectWorkflow | null>(null); // For placeholder dialog


  // Task Chat Dialog State
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [chattingTask, setChattingTask] = useState<Task | null>(null);

  // Project Files (Repository Tab) State
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string>('/');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initial data loading (Project, Tasks, Agents, Workflows, Files) from localStorage
  useEffect(() => {
    if (!projectId || !isClient) return;
    console.log("PROJECT_DETAIL_PAGE: useEffect for initial data load triggered. ProjectID:", projectId);

    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    const allProjects: Project[] = allProjectsStored ? JSON.parse(allProjectsStored) : initialMockProjects;
    const foundProject = allProjects.find(p => p.id === projectId);

    if (foundProject) {
      console.log("PROJECT_DETAIL_PAGE: Project found:", foundProject.name);
      setProject(foundProject);

      const tasksStorageKey = getTasksStorageKey(projectId);
      const storedTasks = localStorage.getItem(tasksStorageKey);
      if (storedTasks) {
        try {
          console.log(`PROJECT_DETAIL_PAGE: Loading tasks for ${projectId} from localStorage.`);
          setTasks(JSON.parse(storedTasks));
        } catch (error) {
          console.error(`PROJECT_DETAIL_PAGE: Failed to parse tasks for project ${projectId}. Initializing.`, error);
          setTasks(initialMockTasksForProject(projectId, foundProject.name));
        }
      } else {
        console.log(`PROJECT_DETAIL_PAGE: No tasks in localStorage for ${projectId}. Initializing.`);
        setTasks(initialMockTasksForProject(projectId, foundProject.name));
      }

      const agentsStorageKey = getAgentsStorageKey(projectId);
      const storedAgents = localStorage.getItem(agentsStorageKey);
      if (storedAgents) {
        try {
          console.log(`PROJECT_DETAIL_PAGE: Loading agents for ${projectId} from localStorage.`);
          setProjectAgents(JSON.parse(storedAgents));
        } catch (error) {
          console.error(`PROJECT_DETAIL_PAGE: Failed to parse agents for project ${projectId}. Initializing.`, error);
          setProjectAgents(initialProjectScopedMockAgents(projectId));
        }
      } else {
        console.log(`PROJECT_DETAIL_PAGE: No agents in localStorage for ${projectId}. Initializing.`);
        setProjectAgents(initialProjectScopedMockAgents(projectId));
      }

      const workflowsStorageKey = getWorkflowsStorageKey(projectId);
      const storedWorkflows = localStorage.getItem(workflowsStorageKey);
      if (storedWorkflows) {
        try {
          console.log(`PROJECT_DETAIL_PAGE: Loading workflows for ${projectId} from localStorage.`);
          const parsedWorkflows = JSON.parse(storedWorkflows) as ProjectWorkflow[];
          setProjectWorkflows(parsedWorkflows.map(wf => ({
            ...wf,
            nodes: wf.nodes || [],
            edges: wf.edges || [],
          })));
        } catch (error) {
          console.error(`PROJECT_DETAIL_PAGE: Failed to parse workflows for project ${projectId}. Initializing with predefined.`, error);
          const defaultWorkflowsWithIds = predefinedWorkflowsData(projectId).map(wf => ({
            ...wf,
            nodes: wf.nodes || [],
            edges: wf.edges || [],
          }));
          setProjectWorkflows(defaultWorkflowsWithIds);
        }
      } else {
        console.log(`PROJECT_DETAIL_PAGE: No workflows in localStorage for ${projectId}. Initializing with predefined.`);
        const defaultWorkflowsWithIds = predefinedWorkflowsData(projectId).map(wf => ({
            ...wf,
            nodes: wf.nodes || [],
            edges: wf.edges || [],
          }));
        setProjectWorkflows(defaultWorkflowsWithIds);
      }

      const filesStorageKey = getFilesStorageKey(projectId);
      const storedFiles = localStorage.getItem(filesStorageKey);
      if (storedFiles) {
        try {
          console.log(`PROJECT_DETAIL_PAGE: Loading files for ${projectId} from localStorage.`);
          setProjectFiles(JSON.parse(storedFiles));
        } catch (error) {
          console.error(`PROJECT_DETAIL_PAGE: Failed to parse files for project ${projectId}. Initializing.`, error);
          setProjectFiles(initialMockFilesData(projectId));
        }
      } else {
        console.log(`PROJECT_DETAIL_PAGE: No files in localStorage for ${projectId}. Initializing.`);
        setProjectFiles(initialMockFilesData(projectId));
      }
      setCurrentFilePath('/');

    } else {
      console.error(`PROJECT_DETAIL_PAGE: Project with ID ${projectId} not found in localStorage or initial mocks.`);
      // Consider redirecting or showing a "Project not found" message
      // For now, setting project to null will show the loading/not found state.
      setProject(null);
      // router.push('/'); // Example redirect
    }
  }, [projectId, isClient, router]); // Removed initialMockTasksForProject from deps as it's stable

  const initialMockTasksForProject = useCallback((currentProjectId: string, currentProjectName: string): Task[] => {
    const today = startOfDay(new Date());
    const mainTaskId = `${currentProjectId}-task-2`;
    return [
      { id: `${currentProjectId}-milestone-1`, title: `${currentProjectName} Kick-off Complete`, status: 'Done', assignedTo: 'Project Manager', startDate: format(addDays(today, -15), 'yyyy-MM-dd'), durationDays: 0, progress: 100, isMilestone: true, parentId: null, dependencies: [], description: "Official project kick-off milestone achieved."},
      { id: `${currentProjectId}-task-1`, title: `Define ${currentProjectName} scope`, status: 'Done', assignedTo: 'Requirements Engineering Process', startDate: format(addDays(today, -10), 'yyyy-MM-dd'), durationDays: 2, progress: 100, parentId: null, dependencies: [], isMilestone: false, description: "Initial scoping task for the project. Document stakeholder needs and define clear project boundaries." },
      { id: mainTaskId, title: `Develop core logic for ${currentProjectName}`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(today, -5), 'yyyy-MM-dd'), durationDays: 5, progress: 40, parentId: null, dependencies: [`${currentProjectId}-task-1`], isMilestone: false, description: "Core development phase including API implementation and business logic."},
      { id: `${currentProjectId}-task-sub-1`, parentId: mainTaskId, title: `Implement API endpoints`, status: 'To Do', assignedTo: 'Code Review Agent', startDate: format(addDays(today, -3), 'yyyy-MM-dd'), durationDays: 2, progress: 0, isMilestone: false, dependencies: [], description: "Develop and unit test all required API endpoints."},
      { id: `${currentProjectId}-task-3`, title: `Test ${currentProjectName} integration`, status: 'To Do', assignedTo: 'Software Testing & QA Cycle', startDate: format(addDays(today, 0), 'yyyy-MM-dd'), durationDays: 3, progress: 0, parentId: null, dependencies: [mainTaskId], isMilestone: false, description: "Perform integration and system testing of the developed features." },
    ];
  }, []);


  // Save tasks to localStorage
  useEffect(() => {
    if (isClient && projectId && (tasks.length > 0 || localStorage.getItem(getTasksStorageKey(projectId)) !== null)) {
      // console.log(`PROJECT_DETAIL_PAGE: Saving tasks to localStorage for project ${projectId}`, tasks);
      localStorage.setItem(getTasksStorageKey(projectId), JSON.stringify(tasks));
    }
  }, [tasks, projectId, isClient]);

  // Save project agents to localStorage
  useEffect(() => {
    if (isClient && projectId && (projectAgents.length > 0 || localStorage.getItem(getAgentsStorageKey(projectId)) !== null)) {
      // console.log(`PROJECT_DETAIL_PAGE: Saving projectAgents to localStorage for project ${projectId}`);
      localStorage.setItem(getAgentsStorageKey(projectId), JSON.stringify(projectAgents));
    }
  }, [projectAgents, projectId, isClient]);

  // Save project workflows to localStorage
  useEffect(() => {
    if (isClient && projectId && (projectWorkflows.length > 0 || localStorage.getItem(getWorkflowsStorageKey(projectId)) !== null)) {
      console.log(`PROJECT_DETAIL_PAGE: Saving projectWorkflows to localStorage for project ${projectId}`, projectWorkflows.map(wf=> ({id: wf.id, name: wf.name, nodesCount: (wf.nodes || []).length, edgesCount: (wf.edges || []).length})));
      localStorage.setItem(getWorkflowsStorageKey(projectId), JSON.stringify(projectWorkflows.map(wf => ({...wf, nodes: wf.nodes || [], edges: wf.edges || [] }))));
    }
  }, [projectWorkflows, projectId, isClient]);

  // Save project files to localStorage
  useEffect(() => {
    if (isClient && projectId && (projectFiles.length > 0 || localStorage.getItem(getFilesStorageKey(projectId)) !== null)) {
      // console.log(`PROJECT_DETAIL_PAGE: Saving projectFiles to localStorage for project ${projectId}`);
      localStorage.setItem(getFilesStorageKey(projectId), JSON.stringify(projectFiles));
    }
  }, [projectFiles, projectId, isClient]);


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

  const handleTaskPlannedAndAccepted = (aiOutput: PlanProjectTaskOutput) => {
    console.log("PROJECT_DETAIL_PAGE: handleTaskPlannedAndAccepted received aiOutput:", JSON.stringify(aiOutput, null, 2));

    const plannedTaskDataFromAI = aiOutput?.plannedTask || {};
    const aiReasoning = aiOutput?.reasoning || "No reasoning provided by AI.";
    const suggestedSubTasksFromAI = plannedTaskDataFromAI.suggestedSubTasks || [];

    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted taskTitle:", plannedTaskDataFromAI.title);
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted aiReasoning:", aiReasoning);
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted suggestedSubTasksFromAI:", JSON.stringify(suggestedSubTasksFromAI, null, 2));

    const subTasksDetailsForDescription = (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0)
      ? suggestedSubTasksFromAI
        .map(st => `- ${st.title || 'Untitled Sub-task'} (Agent: ${st.assignedAgentType || 'N/A'}) - Desc: ${st.description || 'N/A'}`)
        .join('\n')
      : "None specified by AI.";

    const combinedDescription = `AI Reasoning: ${aiReasoning.trim()}\n\nAI Suggested Sub-Tasks / Steps:\n${subTasksDetailsForDescription.trim()}`;
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed combinedDescription for main task:", combinedDescription);


    let mainTask: Task = {
      id: `task-proj-${projectId}-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6)}`,
      title: plannedTaskDataFromAI.title || "Untitled AI Task",
      status: plannedTaskDataFromAI.status || (plannedTaskDataFromAI.isMilestone ? 'To Do' : 'To Do'),
      assignedTo: plannedTaskDataFromAI.assignedTo || 'AI Assistant to determine',
      startDate: plannedTaskDataFromAI.startDate || format(new Date(), 'yyyy-MM-dd'),
      durationDays: plannedTaskDataFromAI.isMilestone ? 0 : (plannedTaskDataFromAI.durationDays === undefined || plannedTaskDataFromAI.durationDays < 1 ? 1 : Math.max(1, plannedTaskDataFromAI.durationDays)),
      progress: plannedTaskDataFromAI.isMilestone ? (plannedTaskDataFromAI.status === 'Done' ? 100 : 0) : (plannedTaskDataFromAI.progress === undefined ? 0 : Math.min(100, Math.max(0, plannedTaskDataFromAI.progress))),
      isMilestone: plannedTaskDataFromAI.isMilestone || false,
      parentId: (plannedTaskDataFromAI.parentId === "null" || plannedTaskDataFromAI.parentId === "" || plannedTaskDataFromAI.parentId === undefined) ? null : plannedTaskDataFromAI.parentId,
      dependencies: plannedTaskDataFromAI.dependencies || [],
      description: combinedDescription.trim() || "AI-planned task.",
    };

    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Initial mainTask before agent/workflow logic:", JSON.stringify(mainTask, null, 2));

    let newTasksList: Task[] = [mainTask];
    let workflowAutoActivated = false;
    let mainTaskAutoStarted = false;

    const assignedToValue = mainTask.assignedTo;

    if (assignedToValue && assignedToValue !== "AI Assistant to determine" && !mainTask.isMilestone) {
      const matchingWorkflow = projectWorkflows.find(wf => wf.name === assignedToValue);
      if (matchingWorkflow && (matchingWorkflow.status === 'Draft' || matchingWorkflow.status === 'Inactive')) {
        setProjectWorkflows(prevWorkflows =>
          prevWorkflows.map(wf =>
            wf.id === matchingWorkflow.id ? { ...wf, status: 'Active', lastRun: new Date().toISOString() } : wf
          )
        );
        workflowAutoActivated = true;
        console.log("PROJECT_DETAIL_PAGE: Workflow auto-activated:", assignedToValue);
      }

      // Check if the main task should be auto-started by the workflow activation OR if it's assigned to a running agent
      const isWorkflowNowActive = workflowAutoActivated || projectWorkflows.find(wf => wf.name === assignedToValue)?.status === 'Active';
      const assignedAgentInstance = projectAgents.find(agent => agent.name === assignedToValue && agent.status === 'Running');

      if ((isWorkflowNowActive || assignedAgentInstance) && mainTask.status !== 'Done') {
        mainTask = { ...mainTask, status: 'In Progress', progress: mainTask.progress === 0 || mainTask.progress === undefined ? 10 : mainTask.progress };
        mainTaskAutoStarted = true;
        if (assignedAgentInstance) {
          setProjectAgents(prevAgents => prevAgents.map(agent =>
            agent.id === assignedAgentInstance.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
          ));
          console.log("PROJECT_DETAIL_PAGE: Main task auto-started by running agent:", assignedAgentInstance.name);
        } else {
          console.log("PROJECT_DETAIL_PAGE: Main task auto-started due to active workflow:", assignedToValue);
        }
      }
    }
    
    newTasksList[0] = mainTask; // Ensure mainTask reflects any status changes

    if (suggestedSubTasksFromAI.length > 0 && !mainTask.isMilestone) {
        const subTasksFromAI: Task[] = suggestedSubTasksFromAI.map((st, index) => {
            const subTaskId = `subtask-${mainTask.id.slice(-5)}-${index}-${Math.random().toString(36).substring(2,5)}`;
            const previousSubTaskOrMain = newTasksList[index]; // Main task is at index 0, first subtask at index 1 etc.
            
            return {
                id: subTaskId,
                title: st.title || "Untitled Sub-task",
                status: 'To Do', // Sub-tasks always start as 'To Do'
                assignedTo: st.assignedAgentType || "General Agent", // Sub-tasks assigned to agent types
                startDate: mainTask.startDate,
                durationDays: 1,
                progress: 0,
                isMilestone: false,
                parentId: mainTask.id,
                dependencies: index > 0 && previousSubTaskOrMain ? [previousSubTaskOrMain.id] : [],
                description: st.description || "No description provided.",
            };
        });
        newTasksList = [...newTasksList, ...subTasksFromAI]; // Add sub-tasks after the (potentially updated) main task
    }
    
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Final newTasksList to add:", JSON.stringify(newTasksList, null, 2));
    
    setTasks(prevTasks => [...newTasksList, ...prevTasks]); // Add new tasks to the beginning
    setIsAITaskPlannerDialogOpen(false);

    let toastTitle = mainTask.isMilestone ? "Milestone Planned (AI)" : "Task Planned (AI)";
    let toastDescriptionText = `${mainTask.isMilestone ? "Milestone" : "Task"} "${mainTask.title}" has been added.`;

    if (workflowAutoActivated) {
        toastDescriptionText += ` Workflow "${assignedToValue}" has been activated.`;
    } else if (assignedToValue && assignedToValue !== "AI Assistant to determine" && !mainTask.isMilestone) {
        const workflowExists = projectWorkflows.find(wf => wf.name === assignedToValue);
        if (workflowExists && workflowExists.status === 'Active') {
            toastDescriptionText += ` Assigned to active workflow "${assignedToValue}".`;
        } else if (workflowExists) {
            toastDescriptionText += ` Assigned to workflow "${assignedToValue}".`;
        } else {
             const agentExists = projectAgents.find(agent => agent.name === assignedToValue);
             if(agentExists) {
                toastDescriptionText += ` Assigned to agent "${assignedToValue}".`;
             } else {
                toastDescriptionText += ` Assigned to conceptual team/workflow "${assignedToValue}".`;
             }
        }
    }

    if (mainTaskAutoStarted && !mainTask.isMilestone) {
      toastDescriptionText += ` Main task status set to 'In Progress'.`;
    }

    const createdSubTasksCount = newTasksList.filter(t => t.parentId === mainTask.id).length;
    if (createdSubTasksCount > 0 && !mainTask.isMilestone) {
      toastDescriptionText += ` ${createdSubTasksCount} sub-task(s) also created and linked.`;
    }

    toast({ title: toastTitle, description: toastDescriptionText.trim() });

    // Automatically open chat for the newly created main task
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Setting main task for chat:", JSON.stringify(mainTask, null, 2));
    setChattingTask(mainTask);
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
        durationDays: updatedTaskData.isMilestone ? 0 : (updatedTaskData.durationDays === undefined || updatedTaskData.durationDays < 1 ? 1 : Math.max(1, updatedTaskData.durationDays)),
        progress: updatedTaskData.isMilestone
          ? (updatedTaskData.status === 'Done' ? 100 : (updatedTaskData.progress === undefined ? 0 : updatedTaskData.progress))
          : (updatedTaskData.progress === undefined ? 0 : Math.min(100, Math.max(0, updatedTaskData.progress))),
        status: updatedTaskData.isMilestone
          ? (updatedTaskData.status === 'Done' ? 'Done' : (updatedTaskData.status === 'Blocked' ? 'Blocked' : 'To Do'))
          : updatedTaskData.status,
        parentId: (updatedTaskData.parentId === "" || updatedTaskData.parentId === undefined || updatedTaskData.parentId === NO_PARENT_VALUE) ? null : updatedTaskData.parentId,
        dependencies: updatedTaskData.dependencies || [],
    };

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
      const remainingTasks = tasks.filter(task => task.id !== taskToDelete.id && task.parentId !== taskToDelete.id);
      setTasks(remainingTasks);
      if (taskToDelete.assignedTo) {
         setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(remainingTasks, prevWorkflows));
      }
      toast({ title: taskToDelete.isMilestone ? "Milestone Deleted" : "Task Deleted", description: `${taskToDelete.isMilestone ? "Milestone" : "Task"} "${taskToDelete.title}" and its sub-tasks have been deleted from project "${project?.name}".`, variant: 'destructive' });
      setTaskToDelete(null);
      setIsDeleteTaskDialogOpen(false);
    }
  };

  // Kanban Drag and Drop Handlers
  const handleTaskCardDragStart = (event: ReactDragEvent<HTMLDivElement>, task: Task) => {
    event.dataTransfer.setData('taskId', task.id);
    event.dataTransfer.setData('taskStatus', task.status);
    // console.log(`Kanban Drag Start: ${task.title} (Status: ${task.status})`);
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

    let updatedTasksArray = [...tasks];
    let taskToMoveIndex = updatedTasksArray.findIndex(task => task.id === draggedTaskId);

    if (taskToMoveIndex === -1) return;
    let taskToMove = { ...updatedTasksArray[taskToMoveIndex] };

    if (sourceTaskStatus !== newStatus) {
        // Status Change
        taskToMove.status = newStatus;
        if (taskToMove.isMilestone) {
            taskToMove.progress = newStatus === 'Done' ? 100 : 0;
            taskToMove.status = newStatus === 'Done' ? 'Done' : (newStatus === 'Blocked' ? 'Blocked' : 'To Do');
        } else {
            taskToMove.progress = newStatus === 'Done' ? 100 : (newStatus === 'To Do' || newStatus === 'Blocked' ? 0 : (taskToMove.progress || 0));
        }

        updatedTasksArray.splice(taskToMoveIndex, 1); // Remove from old position

        // Add to the end of the new column's tasks conceptually
        // The actual visual reordering within the column is handled by just adding it back to the main list.
        // Sorting/filtering in the render function will place it in the correct column.
        // For simplicity, add to the end of the main list, then it will be sorted by status.
        // Or, find the last task of the target status and insert after it.
        // For now, a simple add to end, and then rely on filtering for display.
        // A more sophisticated approach would involve finding the correct insertion point.
        updatedTasksArray.push(taskToMove);


        toast({
            title: "Task Status Updated",
            description: `Task "${taskToMove.title}" moved to "${newStatus}".`,
        });
    } else if (sourceTaskStatus === newStatus) {
        // Move to end of current column if not dropped on another task
        const isDroppedOnCard = event.currentTarget.querySelector(`[data-task-id="${draggedTaskId}"]`) !== event.target && (event.target as HTMLElement).closest('[data-task-id]');
        if (!isDroppedOnCard) {
            updatedTasksArray.splice(taskToMoveIndex, 1);
            updatedTasksArray.push(taskToMove); // Move to the end of the tasks array
            toast({
                title: "Task Reordered",
                description: `Task "${taskToMove.title}" moved to the end of "${sourceTaskStatus}".`,
            });
        }
    }

    setTasks(updatedTasksArray);
    setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasksArray, prevWorkflows));
  };

  const handleTaskCardDragOver = (event: ReactDragEvent<HTMLDivElement>, targetTask: Task) => {
    event.preventDefault();
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    if (sourceTaskStatus === targetTask.status) { // Allow reorder within the same column
        event.dataTransfer.dropEffect = "move";
        setReorderTargetTaskId(targetTask.id);
    } else {
        event.dataTransfer.dropEffect = "none"; // Disallow drop on card if from different column
        setReorderTargetTaskId(null);
    }
  };

  const handleTaskCardDragLeave = () => {
    setReorderTargetTaskId(null);
  };

  const handleTaskCardDrop = (event: ReactDragEvent<HTMLDivElement>, targetTask: Task) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent column's onDrop

    const draggedTaskId = event.dataTransfer.getData('taskId');
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    setReorderTargetTaskId(null);
    setDraggingOverStatus(null);

    if (sourceTaskStatus === targetTask.status) { // Reordering within the same column
      setTasks(prevTasks => {
        const draggedTaskIndex = prevTasks.findIndex(t => t.id === draggedTaskId);
        if (draggedTaskIndex === -1) return prevTasks;

        const draggedTask = prevTasks[draggedTaskIndex];
        let tasksWithoutDragged = prevTasks.filter(t => t.id !== draggedTaskId);
        const targetTaskIndexInFiltered = tasksWithoutDragged.findIndex(t => t.id === targetTask.id);

        if (targetTaskIndexInFiltered === -1) return prevTasks; // Should not happen

        tasksWithoutDragged.splice(targetTaskIndexInFiltered, 0, draggedTask); // Insert before target

        toast({
          title: "Task Reordered",
          description: `Task "${draggedTask.title}" reordered within "${sourceTaskStatus}".`,
        });
        return tasksWithoutDragged;
      });
    }
  };


  // Agent Management Handlers (Project-Specific)
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


  // Workflow Management Handlers
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
    console.log("PROJECT_DETAIL_PAGE: Opening designer for workflow:", workflow.name, "ID:", workflow.id);
    // Deep clone the workflow to avoid direct state mutation issues if canvas modifies it directly
    // before onNodesChange/onEdgesChange propogates
    setDesigningWorkflow(JSON.parse(JSON.stringify(workflow)));
  };

  const handleCloseWorkflowDesigner = () => {
    if (designingWorkflow) {
      toast({ title: "Workflow Design Closed", description: `Stopped designing workflow: "${designingWorkflow.name}". Changes are saved automatically.`});
      setDesigningWorkflow(null); // This will trigger the useEffect to save projectWorkflows
    }
  };

  const handleWorkflowNodesChange = useCallback((updatedNodes: WorkflowNode[]) => {
    console.log(`PROJECT_DETAIL_PAGE: handleWorkflowNodesChange received updatedNodes. Length: ${updatedNodes.length}, IDs: ${updatedNodes.map(n=>n.id).join(', ')}`);
    if (!designingWorkflow) {
      console.warn("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange called without designingWorkflow set.");
      return;
    }
    console.log(`PROJECT_DETAIL_PAGE: Current designingWorkflow ID: ${designingWorkflow.id}, Name: ${designingWorkflow.name}`);

    setProjectWorkflows(prevWorkflows => {
        console.log("PROJECT_DETAIL_PAGE: Inside setProjectWorkflows for nodes. prevWorkflows length:", prevWorkflows.length);
        const newWorkflowsArray = prevWorkflows.map(wf => {
            if (wf.id === designingWorkflow.id) {
                 console.log("PROJECT_DETAIL_PAGE: Updating nodes for workflow ID:", wf.id, ". New nodes count:", updatedNodes.length);
                return { ...wf, nodes: updatedNodes, lastRun: new Date().toISOString() };
            }
            return wf;
        });
        newWorkflowsArray.forEach(wf => {
             console.log("PROJECT_DETAIL_PAGE: Workflow in newWorkflowsArray (after node map). ID:", wf.id, "Nodes count:", (wf.nodes || []).length, "Nodes IDs:", (wf.nodes || []).map(n => n.id).join(', '));
        });
        return newWorkflowsArray;
    });
  }, [designingWorkflow?.id]); // Ensure designingWorkflow.id is stable or this callback might get stale closure


  const handleWorkflowEdgesChange = useCallback((updatedEdges: WorkflowEdge[]) => {
    console.log(`PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange received updatedEdges. Length: ${updatedEdges.length}`);
     if (!designingWorkflow) {
        console.warn("PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange called without designingWorkflow set.");
        return;
    }
    setProjectWorkflows(prevWorkflows => {
        console.log("PROJECT_DETAIL_PAGE: Inside setProjectWorkflows for edges. prevWorkflows length:", prevWorkflows.length);
        const newWorkflowsArray = prevWorkflows.map(wf => {
            if (wf.id === designingWorkflow.id) {
                 console.log("PROJECT_DETAIL_PAGE: Updating edges for workflow ID:", wf.id, ". New edges count:", updatedEdges.length);
                return { ...wf, edges: updatedEdges, lastRun: new Date().toISOString() };
            }
            return wf;
        });
        newWorkflowsArray.forEach(wf => {
             console.log("PROJECT_DETAIL_PAGE: Workflow in newWorkflowsArray (after edge map). ID:", wf.id, "Edges count:", (wf.edges || []).length);
        });
        return newWorkflowsArray;
    });
  }, [designingWorkflow?.id]); // Ensure designingWorkflow.id is stable


  // This useEffect ensures that if the designingWorkflow instance itself is updated in the projectWorkflows array
  // (e.g., by another process or if the array is re-fetched), the local designingWorkflow state is synced.
  useEffect(() => {
    if (designingWorkflow && projectWorkflows) {
      const currentDesigningWorkflowInList = projectWorkflows.find(wf => wf.id === designingWorkflow.id);
      if (currentDesigningWorkflowInList) {
        // Compare to prevent infinite loops if the objects are structurally identical but different references
        if (JSON.stringify(currentDesigningWorkflowInList) !== JSON.stringify(designingWorkflow)) {
            console.log("PROJECT_DETAIL_PAGE: Syncing designingWorkflow state with updated instance from projectWorkflows list. ID:", designingWorkflow.id);
            setDesigningWorkflow(currentDesigningWorkflowInList);
        }
      } else if (designingWorkflow) { // If it's set but not in list, it might have been deleted
          console.log("PROJECT_DETAIL_PAGE: Designing workflow no longer found in projectWorkflows list (likely deleted). Closing designer. ID was:", designingWorkflow.id);
          setDesigningWorkflow(null); // Close designer if workflow was deleted
      }
    }
  }, [projectWorkflows, designingWorkflow?.id]); // Only re-run if projectWorkflows or the ID of the designingWorkflow changes


  const handleOpenDeleteWorkflowDialog = (workflow: ProjectWorkflow) => {
    setWorkflowToDelete(workflow);
    setIsDeleteWorkflowDialogOpen(true);
  };

  const confirmDeleteWorkflow = () => {
    if (workflowToDelete) {
      setProjectWorkflows(prevWorkflows => prevWorkflows.filter(wf => wf.id !== workflowToDelete.id));
      toast({ title: "Workflow Deleted", description: `Workflow "${workflowToDelete.name}" has been deleted from project "${project?.name}".`, variant: 'destructive' });
      if (designingWorkflow && designingWorkflow.id === workflowToDelete.id) {
        setDesigningWorkflow(null); // Close designer if the deleted workflow was being designed
      }
      setWorkflowToDelete(null);
      setIsDeleteWorkflowDialogOpen(false);
    }
  };

  const formatDate = (dateString: string | undefined, formatString: string = "MMMM d, yyyy 'at' hh:mm a") => {
    if (!isClient || !dateString) return 'Loading date...'; // Or some placeholder
    try {
       // Attempt to handle multiple date string formats that might come from localStorage or new Date().toISOString()
       if (!dateString.includes('-') && !dateString.includes('/') && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(dateString) && !/^\d{4}-\d{2}-\d{2}$/.test(dateString) ) {
          // If it's not a common machine-readable format, it might be already formatted or invalid
          return dateString; // Return as is or handle as invalid
       }
      return format(parseISO(dateString), formatString);
    } catch (error) {
      // console.warn(`Error formatting date: "${dateString}"`, error);
      return dateString; // Fallback to original string if parsing/formatting fails
    }
  };

  const handleGanttTaskReorder = (draggedTaskId: string, targetTaskId: string) => {
    setTasks(prevTasks => {
      const draggedTaskIndex = prevTasks.findIndex(task => task.id === draggedTaskId);
      const targetTaskIndex = prevTasks.findIndex(task => task.id === targetTaskId);

      if (draggedTaskIndex === -1 || targetTaskIndex === -1) return prevTasks;

      const newTasks = [...prevTasks];
      const [draggedTask] = newTasks.splice(draggedTaskIndex, 1); // Remove dragged task

      // Find the new index of the target task after removal
      const newTargetIndex = newTasks.findIndex(task => task.id === targetTaskId);
      newTasks.splice(newTargetIndex, 0, draggedTask); // Insert before target task

      setTimeout(() => { // Defer toast to avoid state update during render issues
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


  // File Repository Functions
  const addFileOrFolderRecursive = (
    currentItems: ProjectFile[],
    targetPathSegments: string[],
    itemToAdd: ProjectFile,
    currentLevelPath: string = '/'
  ): ProjectFile[] => {
    // Base case: if targetPathSegments is empty, we are at the correct directory level
    if (targetPathSegments.length === 0) {
      // Check if item already exists at this level
      const itemExists = currentItems.some(item => item.name === itemToAdd.name && item.path === itemToAdd.path);
      if (itemExists) {
        if (itemToAdd.type === 'folder') {
          toast({ title: "Duplicate Item", description: `A ${itemToAdd.type} named "${itemToAdd.name}" already exists in ${itemToAdd.path}.`, variant: "destructive" });
        }
        // For files, allow overwrite or handle differently (e.g., versioning - not implemented)
        // For this mock, we'll just not add if a folder exists, or overwrite if a file exists (implicitly by not filtering it out)
        // If it's a file and a file with the same name exists, this logic effectively overwrites.
        // If it's a folder and a folder with the same name exists, we don't add.
        if (itemToAdd.type === 'folder' && itemExists) {
            return currentItems;
        }
        return [...currentItems.filter(item => !(item.name === itemToAdd.name && item.type === 'file')), itemToAdd];
      }
      return [...currentItems, itemToAdd];
    }

    const headSegment = targetPathSegments[0];
    const tailSegments = targetPathSegments.slice(1);

    return currentItems.map(item => {
      if (item.type === 'folder' && item.name === headSegment && item.path === currentLevelPath) {
        return {
          ...item,
          children: addFileOrFolderRecursive(item.children || [], tailSegments, itemToAdd, `${currentLevelPath}${item.name}/`),
          lastModified: new Date().toISOString(), // Update folder's lastModified time
        };
      }
      return item;
    });
  };


  const getFilesForPath = (currentPath: string): ProjectFile[] => {
    if (currentPath === '/') {
      return projectFiles.filter(item => item.path === '/');
    }
    const segments = currentPath.split('/').filter(Boolean);
    let currentLevelItems: ProjectFile[] | undefined = projectFiles;
    let accumulatedPath = '/';

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const folder = currentLevelItems?.find(item => item.type === 'folder' && item.name === segment && item.path === accumulatedPath);
        if (folder && folder.children) {
            currentLevelItems = folder.children;
            accumulatedPath += segment + '/';
        } else {
            return [];
        }
    }
    return currentLevelItems || [];
  };


  const renderProjectFiles = () => {
    const itemsToRender = getFilesForPath(currentFilePath);

    return itemsToRender.map(file => (
      <TableRow key={file.id} className="hover:bg-muted/50">
        <TableCell>
          <Button
            variant="link"
            className="p-0 h-auto font-medium text-foreground hover:underline flex items-center gap-2"
            onClick={() => {
              if (file.type === 'folder') {
                let newPath = file.path + file.name + '/';
                setCurrentFilePath(newPath);
              } else {
                toast({ title: "Opening File (Mock)", description: `Simulating opening of "${file.name}".` });
              }
            }}
          >
            {file.type === 'folder' ? <FolderIcon className="h-5 w-5 text-primary" /> : <FileIcon className="h-5 w-5 text-muted-foreground" />}
            <span className="truncate">{file.name}</span>
          </Button>
        </TableCell>
        <TableCell className="hidden sm:table-cell text-muted-foreground">{file.size || '-'}</TableCell>
        <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(file.lastModified, 'MMM d, yyyy')}</TableCell>
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

  const handleOpenNewFolderDialog = () => {
    setNewFolderName("");
    setIsNewFolderDialogOpen(true);
  };

  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) {
      toast({ title: "Folder name cannot be empty", variant: "destructive" });
      return;
    }

    const newFolder: ProjectFile = {
      id: `folder-proj-${projectId}-${Date.now().toString().slice(-5)}-${Math.random().toString(36).substring(2, 7)}`,
      name: newFolderName.trim(),
      type: 'folder',
      path: currentFilePath,
      children: [],
      lastModified: new Date().toISOString(),
    };

    setProjectFiles(prevFiles => {
      const pathSegments = currentFilePath === '/' ? [] : currentFilePath.split('/').filter(Boolean);
      const deepCopiedFiles = JSON.parse(JSON.stringify(prevFiles));
      return addFileOrFolderRecursive(deepCopiedFiles, pathSegments, newFolder);
    });

    toast({ title: "Folder Created", description: `Folder "${newFolder.name}" created in ${currentFilePath}.` });
    setIsNewFolderDialogOpen(false);
    setNewFolderName("");
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    let filesAddedCount = 0;
    const newFilesBatch: ProjectFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const newFileToAdd: ProjectFile = {
        id: `file-proj-${projectId}-${Date.now()}-${i}-${Math.random().toString(36).substring(2,7)}`,
        name: file.name,
        type: 'file',
        path: currentFilePath,
        size: `${(file.size / 1024).toFixed(1)}KB`,
        lastModified: new Date(file.lastModified).toISOString(),
      };
      newFilesBatch.push(newFileToAdd);
    }

    setProjectFiles(currentProjectFileState => {
        let updatedList = JSON.parse(JSON.stringify(currentProjectFileState)); // Deep copy
        const pathSegments = currentFilePath === '/' ? [] : currentFilePath.split('/').filter(Boolean);

        let targetLevel = updatedList;
        let currentLevelPathForSearch = '/';

        if (currentFilePath !== '/') {
            let parentFound = true;
            for (const segment of pathSegments) {
                const folder = targetLevel.find((item: ProjectFile) => item.type === 'folder' && item.name === segment && item.path === currentLevelPathForSearch);
                if (folder) {
                    folder.children = folder.children || [];
                    targetLevel = folder.children;
                    currentLevelPathForSearch += segment + '/';
                } else {
                    parentFound = false;
                    console.error(`Error: Could not find parent folder for path ${currentFilePath}`);
                    break;
                }
            }
             if (!parentFound) {
                // Fallback or error handling
                toast({ title: "Error", description: `Could not find path ${currentFilePath} to add files.`, variant: "destructive"});
                return currentProjectFileState; // Return original state if path not found
            }
        }
        // Now targetLevel is the children array of the correct directory

        for (const fileToAdd of newFilesBatch) {
            if (!targetLevel.some((item: ProjectFile) => item.name === fileToAdd.name)) {
                targetLevel.push(fileToAdd);
                filesAddedCount++;
            }
        }
        // If path was root, targetLevel is updatedList directly
        return updatedList;
    });


    if (filesAddedCount > 0) {
        toast({ title: `${filesAddedCount} File(s) Uploaded (Mock)`, description: `Files added to ${currentFilePath}.` });
    }
    if (filesAddedCount < selectedFiles.length) {
        toast({ title: "Some files skipped", description: `Some files were not uploaded as items with the same name already exist in ${currentFilePath}.`, variant: "default" });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset file input
    }
  };

   // Close workflow designer if Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && designingWorkflow) {
        handleCloseWorkflowDesigner();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [designingWorkflow, handleCloseWorkflowDesigner]);


  // Loading and Not Found States
  if (!isClient) {
    return (
      <div className="container mx-auto">
        <PageHeader><PageHeaderHeading>Loading Project...</PageHeaderHeading></PageHeader>
        <div className="text-center py-10"><p>Loading project data...</p></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto">
        <PageHeader><PageHeaderHeading>Project Not Found</PageHeaderHeading></PageHeader>
        <div className="text-center py-10">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-semibold text-destructive">The project with ID "{projectId}" could not be found.</p>
            <p className="text-muted-foreground mt-2">It might have been deleted or the ID is incorrect.</p>
            <Button onClick={() => router.push('/')} className="mt-6">
                <ArrowLeftCircle className="mr-2 h-4 w-4" /> Go to Projects List
            </Button>
        </div>
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
            <PageHeaderDescription className="mt-1 text-xs sm:text-sm text-muted-foreground">
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
             {(projectAgents.length > 0) && (
              <div className="flex items-center"><Bot className="h-4 w-4 mr-2 text-muted-foreground" /><span className="text-muted-foreground">Agents:</span><span className="ml-auto font-medium">{projectAgents.length}</span></div>
            )}
            {(projectWorkflows.length > 0) && (
              <div className="flex items-center"><WorkflowIcon className="h-4 w-4 mr-2 text-muted-foreground" /><span className="text-muted-foreground">Workflows:</span><span className="ml-auto font-medium">{projectWorkflows.filter(w => w.status === 'Active').length} Active / {projectWorkflows.length} Total</span></div>
            )}
          </CardContent>
        </Card>
         <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Quick Overview</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">A brief summary of the project's current state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1"><h4 className="font-semibold text-sm text-muted-foreground flex items-center"><TrendingUp className="h-4 w-4 mr-2" /> Project Progress</h4><span className="text-sm font-medium">{tasks.filter(t=>t.status==='Done' && !t.isMilestone).length > 0 && tasks.filter(t => !t.isMilestone).length > 0 ? Math.round((tasks.filter(t=>t.status==='Done' && !t.isMilestone).length / tasks.filter(t => !t.isMilestone).length) * 100) : 0}%</span></div>
              <Progress value={tasks.filter(t=>t.status==='Done' && !t.isMilestone).length > 0 && tasks.filter(t => !t.isMilestone).length > 0 ? Math.round((tasks.filter(t=>t.status==='Done' && !t.isMilestone).length / tasks.filter(t => !t.isMilestone).length) * 100) : 0} aria-label={`${tasks.filter(t=>t.status==='Done' && !t.isMilestone).length > 0 && tasks.filter(t => !t.isMilestone).length > 0 ? Math.round((tasks.filter(t=>t.status==='Done' && !t.isMilestone).length / tasks.filter(t => !t.isMilestone).length) * 100) : 0}% project progress`} className="h-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/50 rounded-lg shadow-sm"><h4 className="font-semibold text-sm text-muted-foreground mb-1">Pending Tasks</h4><p className="text-2xl font-bold">{tasks.filter(t => (t.status === 'To Do' || t.status === 'In Progress') && !t.isMilestone).length}</p></div>
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
         <TabsList className="grid w-full grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6 xl:w-auto xl:inline-grid">
            <TabsTrigger value="gantt"><GanttChartSquare className="mr-2 h-4 w-4"/>Gantt Chart</TabsTrigger>
            <TabsTrigger value="repository"><FolderIcon className="mr-2 h-4 w-4"/>Repository</TabsTrigger>
            <TabsTrigger value="projectAgents"><SlidersHorizontal className="mr-2 h-4 w-4"/>Project Agents</TabsTrigger>
            <TabsTrigger value="board"><ListChecks className="mr-2 h-4 w-4"/>Task Board</TabsTrigger>
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
                                <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => handleOpenEditTaskDialog(task, true)}><EyeIcon className="mr-1 h-3 w-3" /> View</Button>
                                <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => handleOpenEditTaskDialog(task)}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                                <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => handleOpenChatDialog(task)}><MessageSquare className="mr-1 h-3 w-3" /> Chat</Button>
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
                 <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    multiple
                  />
                {currentFilePath !== '/' && (
                  <Button variant="outline" size="sm" onClick={handleNavigateUp} className="w-full sm:w-auto">
                    <ArrowLeftCircle className="mr-2 h-4 w-4" /> Up One Level
                  </Button>
                )}
                <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleFileUploadClick}>
                  <UploadCloud className="mr-2 h-4 w-4" /> Upload Files
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleOpenNewFolderDialog}>
                  <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {getFilesForPath(currentFilePath).length > 0 || (currentFilePath === '/' && projectFiles.filter(f => f.path === '/').length > 0) ? (
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
                   <Button variant="outline" size="sm" onClick={handleOpenNewFolderDialog} className="w-full max-w-xs sm:w-auto">
                     <FolderPlus className="mr-2 h-4 w-4" /> Create Folder
                  </Button>
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
                                            variant={workflow.status === 'Active' ? 'destructive' : 'outline'}
                                            size="sm"
                                            className="text-xs flex-1"
                                            onClick={() => {
                                                setProjectWorkflows(prev =>
                                                    prev.map(wf =>
                                                        wf.id === workflow.id
                                                        ? {...wf, status: wf.status === 'Active' ? 'Inactive' : (wf.status === 'Draft' ? 'Active' : 'Active'), lastRun: new Date().toISOString()}
                                                        : wf
                                                    )
                                                );
                                                toast({title: `Workflow "${workflow.name}" ${workflow.status === 'Active' ? 'Deactivated' : 'Activated'}.`});
                                            }}
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

        <TabsContent value="aiSuggestions" className="mt-8 sm:mt-4">
            <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4">
                <div>
                    <PageHeaderHeading className="text-2xl">AI Agent Suggestions</PageHeaderHeading>
                    <PageHeaderDescription className="text-xs sm:text-sm">Get optimal agent configuration suggestions for tasks within project "{project?.name}".</PageHeaderDescription>
                </div>
            </PageHeader>
            <div className="max-w-full"> {/* Changed from max-w-2xl */}
                <AgentConfigForm projectId={projectId} />
            </div>
        </TabsContent>

      </Tabs>

      {/* Commenting out AddTaskDialog as AI Task Planner is primary */}
      {/* {isAddTaskDialogOpen && (
        <AddTaskDialog
          open={isAddTaskDialogOpen}
          onOpenChange={setIsAddTaskDialogOpen}
          onAddTask={handleAddTaskManually} // You would need a separate handler if re-enabled
          defaultStartDate={format(new Date(), 'yyyy-MM-dd')}
          projectTasks={tasks}
        />
      )} */}

      {isAITaskPlannerDialogOpen && (
        <AITaskPlannerDialog
          open={isAITaskPlannerDialogOpen}
          onOpenChange={setIsAITaskPlannerDialogOpen}
          projectId={projectId}
          projectWorkflows={projectWorkflows.map(wf => ({
            id: wf.id,
            name: wf.name,
            description: wf.description,
            nodes: (wf.nodes || []).map(n => ({id: n.id, name: n.name, type: n.type, config: n.config}))
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
                "{taskToDelete.title}" from project "{project?.name}". If it's a parent task, its sub-tasks will also be removed.
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
              setChattingTask(null);
            }
          }}
          task={chattingTask}
        />
      )}

      {isNewFolderDialogOpen && (
        <AlertDialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create New Folder</AlertDialogTitle>
              <AlertDialogDescription>
                Enter a name for the new folder in the current path: <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{currentFilePath}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateNewFolder();
                }
              }}
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCreateNewFolder}>Create Folder</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
// End of file
