
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, EyeIcon, SlidersHorizontal, Lightbulb, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, X as XIcon, Diamond, Users, FolderGit2, MessageSquare, Settings, Brain, AlertTriangle, Edit2, Files, FolderClosed, Folder as FolderIcon, File as FileIcon, UploadCloud, FolderPlus, ArrowLeftCircle, InfoIcon, ClipboardList, ChevronDown, ChevronRight, PlusSquare as PlusSquareIcon, Eye } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { Project, Task, Agent, ProjectWorkflow, WorkflowNode, WorkflowEdge, ProjectFile, Requirement, RequirementStatus, RequirementPriority } from '@/types';
import { initialMockProjects, PROJECTS_STORAGE_KEY, getTasksStorageKey, getAgentsStorageKey, getWorkflowsStorageKey, getFilesStorageKey, getRequirementsStorageKey } from '@/app/projects/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, addDays, differenceInCalendarDays, startOfDay, isValid } from 'date-fns';
import { cn, uid } from '@/lib/utils';
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
import KanbanTaskCard from '@/components/features/tasks/KanbanTaskCard';
import ProjectWorkflowCard from '@/components/features/projects/ProjectWorkflowCard';
import AgentManagementTable from '@/components/features/agent-management/AgentManagementTable';
import AddAgentDialog from '@/components/features/agent-management/AddAgentDialog';
import EditAgentDialogAgent from '@/components/features/agent-management/EditAgentDialog';
import WorkflowPalette from '@/components/features/workflow-designer/WorkflowPalette';
import WorkflowCanvas from '@/components/features/workflow-designer/WorkflowCanvasPlaceholder';
import AgentConfigForm from '@/components/features/ai-suggestions/AgentConfigForm';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ProjectGanttChartView from '@/components/features/projects/ProjectGanttChartView';
import TaskChatDialog from '@/components/features/tasks/TaskChatDialog';
import AITaskPlannerDialog from '@/components/features/projects/AITaskPlannerDialog';
import type { PlanProjectTaskOutput, WorkflowNode as AIWorkflowNode } from "@/ai/flows/plan-project-task-flow";
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadCnTableHeader, TableRow } from "@/components/ui/table";
import AddWorkflowDialog from '@/components/features/projects/AddWorkflowDialog';
import { Label } from '@/components/ui/label';


const projectStatusColors: { [key in Project['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

export const taskStatuses: Task['status'][] = ['To Do', 'In Progress', 'Done', 'Blocked'];
export const NO_PARENT_VALUE = "__NO_PARENT_SELECTED__";

export const taskStatusColors: { [key in Task['status']]: string } = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'Blocked': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700',
};

const initialProjectScopedMockAgents = (projectId: string): Agent[] => [
  { id: uid(`cfg-proj-${projectId.slice(-5)}`), name: `Default Analyzer - ${projectId.slice(0,5)}`, type: 'Analysis Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { scope: 'initial_setup', autoRun: false } },
  { id: uid(`cfg-proj-${projectId.slice(-5)}`), name: `Basic Reporter - ${projectId.slice(0,5)}`, type: 'Reporting Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { frequency: 'on-demand' } },
];

const workflowStatusColors: { [key in ProjectWorkflow['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  Inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  Draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
};

const requirementStatusColors: { [key in RequirementStatus]: string } = {
  'Draft': 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  'Under Review': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  'Approved': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'Implemented': 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 border-teal-300 dark:border-teal-700',
  'Obsolete': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700',
};

const requirementPriorityColors: { [key in RequirementPriority]: string } = {
  'High': 'text-red-600 dark:text-red-400',
  'Medium': 'text-yellow-600 dark:text-yellow-400',
  'Low': 'text-green-600 dark:text-green-400',
};

const predefinedWorkflowsData = (projectId: string): ProjectWorkflow[] => {
  const createWorkflow = (
    name: string,
    description: string,
    nodeDetails: Array<{ name: string; type: string; config?: any, x?: number, y?: number }>,
    edgeConnections?: Array<{ sourceIndex: number; targetIndex: number }>
  ): ProjectWorkflow => {
    const wfId = uid(`pd-wf-${projectId.slice(-3)}-${name.toLowerCase().replace(/\s+/g, '-').substring(0,10)}`);
    const nodes: WorkflowNode[] = nodeDetails.map((detail, index) => ({
      id: uid(`node-${wfId}-${index}`),
      name: detail.name,
      type: detail.type,
      x: detail.x !== undefined ? detail.x : 50 + (index % 3) * 250,
      y: detail.y !== undefined ? detail.y : 50 + Math.floor(index / 3) * 120,
      config: detail.config || {},
    }));

    const edges: WorkflowEdge[] = (edgeConnections || []).map((conn, index) => {
      if (conn.sourceIndex >= 0 && conn.sourceIndex < nodes.length && conn.targetIndex >= 0 && conn.targetIndex < nodes.length) {
        return {
          id: uid(`edge-${wfId}-${index}`),
          sourceNodeId: nodes[conn.sourceIndex].id,
          targetNodeId: nodes[conn.targetIndex].id,
        };
      }
      return null;
    }).filter(edge => edge !== null) as WorkflowEdge[];

    return {
      id: wfId,
      name,
      description,
      status: 'Draft',
      lastRun: undefined,
      nodes: nodes || [],
      edges: edges || [],
    };
  };

  return [
     createWorkflow(
      "Requirements Engineering Process",
      "Handles elicitation, analysis, specification, and validation of project requirements.",
      [
        { name: 'Elicit Stakeholder Needs', type: 'Analysis Agent', x: 50, y: 50 },
        { name: 'Analyze & Define Requirements', type: 'Analysis Agent', x: 300, y: 50 },
        { name: 'Document Specifications', type: 'Documentation Agent', x: 50, y: 170 },
        { name: 'Review & Validate Requirements', type: 'Custom Logic Agent', config: { reviewType: 'peer' }, x: 300, y: 170 }
      ],
      [
        { sourceIndex: 0, targetIndex: 1 },
        { sourceIndex: 1, targetIndex: 2 },
        { sourceIndex: 2, targetIndex: 3 }
      ]
    ),
    createWorkflow(
      "Software Design & Implementation Cycle",
      "Covers software architectural design, detailed design, coding, and unit testing.",
      [
        { name: 'Define Software Architecture', type: 'Custom Logic Agent', config: { diagramTool: "Lucidchart" }, x: 50, y: 50 },
        { name: 'Detailed Component Design', type: 'Custom Logic Agent', x: 300, y: 50 },
        { name: 'Implement Feature', type: 'Code Review Agent', config: { language: "TypeScript" }, x: 50, y: 170 },
        { name: 'Unit Test Feature', type: 'Testing Agent', config: { framework: "Jest" }, x: 300, y: 170 }
      ],
      [
        { sourceIndex: 0, targetIndex: 1 },
        { sourceIndex: 1, targetIndex: 2 },
        { sourceIndex: 2, targetIndex: 3 }
      ]
    ),
     createWorkflow(
      "Software Testing & QA Cycle",
      "Manages integration testing, system testing, and quality assurance activities.",
      [
        { name: 'Plan Integration Tests', type: 'Testing Agent', x: 50, y: 50 },
        { name: 'Execute Integration Tests', type: 'Testing Agent', x: 300, y: 50 },
        { name: 'Plan System Qualification Tests', type: 'Testing Agent', x: 50, y: 170 },
        { name: 'Execute System Qualification Tests', type: 'Testing Agent', x: 300, y: 170 },
        { name: 'Log Defects & Report Results', type: 'Reporting Agent', x: 175, y: 290 }
      ],
      [
        { sourceIndex: 0, targetIndex: 1 },
        { sourceIndex: 1, targetIndex: 4 },
        { sourceIndex: 2, targetIndex: 3 },
        { sourceIndex: 3, targetIndex: 4 }
      ]
    ),
    createWorkflow(
      "Project Monitoring & Reporting",
      "Collects project metrics, monitors progress, and generates status reports.",
      [
        { name: 'Gather Task Progress Data', type: 'Monitoring Agent', x: 50, y: 50 },
        { name: 'Analyze Burn-down/Burn-up', type: 'Analysis Agent', x: 300, y: 50 },
        { name: 'Generate Weekly Status Report', type: 'Reporting Agent', x: 50, y: 170 },
        { name: 'Notify Stakeholders', type: 'Notification Agent', x: 300, y: 170 }
      ],
      [
        { sourceIndex: 0, targetIndex: 1 },
        { sourceIndex: 1, targetIndex: 2 },
        { sourceIndex: 2, targetIndex: 3 }
      ]
    ),
  ];
};

const initialMockFilesData = (projectId: string): ProjectFile[] => [
    { id: uid(`file-proj-${projectId.slice(-4)}`), name: 'Project_Proposal.docx', type: 'file', path: '/', size: '1.2MB', lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: uid(`folder-proj-${projectId.slice(-4)}`), name: 'Source Code', type: 'folder', path: '/', children: [
        { id: uid(`file-proj-${projectId.slice(-4)}`), name: 'main.py', type: 'file', path: '/Source Code/', size: '50KB', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: uid(`file-proj-${projectId.slice(-4)}`), name: 'utils.py', type: 'file', path: '/Source Code/', size: '25KB', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: uid(`folder-proj-${projectId.slice(-4)}`), name: 'tests', type: 'folder', path: '/Source Code/', children: [
          { id: uid(`file-proj-${projectId.slice(-4)}`), name: 'test_main.py', type: 'file', path: '/Source Code/tests/', size: '5KB', lastModified: new Date().toISOString() },
        ]},
    ]},
    { id: uid(`folder-proj-${projectId.slice(-4)}`), name: 'Documentation', type: 'folder', path: '/', children: [
        { id: uid(`file-proj-${projectId.slice(-4)}`), name: 'UserManual.pdf', type: 'file', path: '/Documentation/', size: '2.5MB', lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    ]},
    { id: uid(`file-proj-${projectId.slice(-4)}`), name: 'MeetingNotes_2024-07-20.txt', type: 'file', path: '/', size: '5KB', lastModified: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
];


export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAITaskPlannerDialogOpen, setIsAITaskPlannerDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isViewingTask, setIsViewingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);
  const [draggingOverStatus, setDraggingOverStatus] = useState<Task['status'] | null>(null);
  const [reorderTargetTaskId, setReorderTargetTaskId] = useState<string | null>(null);

  const [projectAgents, setProjectAgents] = useState<Agent[]>([]);
  const [isEditAgentDialogOpen, setIsEditAgentDialogOpen] = useState(false);
  const [editingProjectAgent, setEditingProjectAgent] = useState<Agent | null>(null);
  const [isDeleteAgentDialogOpen, setIsDeleteAgentDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const [projectWorkflows, setProjectWorkflows] = useState<ProjectWorkflow[]>([]);
  const [isAddWorkflowDialogOpen, setIsAddWorkflowDialogOpen] = useState(false);
  const [designingWorkflow, setDesigningWorkflow] = useState<ProjectWorkflow | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<ProjectWorkflow | null>(null);
  const [isDeleteWorkflowDialogOpen, setIsDeleteWorkflowDialogOpen] = useState(false);


  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [chattingTask, setChattingTask] = useState<Task | null>(null);

  const filesStorageKey = useMemo(() => getFilesStorageKey(projectId), [projectId]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string>('/');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requirementsStorageKey = useMemo(() => getRequirementsStorageKey(projectId), [projectId]);
  const [projectRequirements, setProjectRequirements] = useState<Requirement[]>([]);
  const [isAddRequirementDialogOpen, setIsAddRequirementDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [isEditRequirementDialogOpen, setIsEditRequirementDialogOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState<Requirement | null>(null);
  const [isDeleteRequirementDialogOpen, setIsDeleteRequirementDialogOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const initialMockTasksForProject = useCallback((currentProjectId: string, currentProjectName: string): Task[] => {
    const todayFormatted = startOfDay(new Date());
    const kickoffMilestoneId = uid(`milestone-${currentProjectId.slice(-5)}`);
    const reqTaskId = uid(`task-req-${currentProjectId.slice(-5)}`);
    const designTaskId = uid(`task-des-${currentProjectId.slice(-5)}`);
    const devTaskId = uid(`task-dev-${currentProjectId.slice(-5)}`);
    const subTaskApiId = uid(`subtask-api-${devTaskId.slice(-5)}`);
    const testTaskId = uid(`task-test-${currentProjectId.slice(-5)}`);
    const alphaMilestoneId = uid(`milestone-alpha-${currentProjectId.slice(-5)}`);

    return [
      { id: kickoffMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Project Kick-off`, status: 'Done', assignedTo: 'Project Manager', startDate: format(addDays(todayFormatted, -15), 'yyyy-MM-dd'), durationDays: 0, progress: 100, isMilestone: true, parentId: null, dependencies: [], description: "Official project kick-off milestone achieved." },
      { id: reqTaskId, projectId: currentProjectId, title: `Define ${currentProjectName} Scope & Requirements`, status: 'Done', assignedTo: 'Requirements Engineering Process', startDate: format(addDays(todayFormatted, -14), 'yyyy-MM-dd'), durationDays: 5, progress: 100, isMilestone: false, parentId: null, dependencies: [kickoffMilestoneId], description: "Initial scoping and requirements gathering for the project." },
      { id: designTaskId, projectId: currentProjectId, title: `Design ${currentProjectName} Architecture`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(todayFormatted, -9), 'yyyy-MM-dd'), durationDays: 7, progress: 60, isMilestone: false, parentId: null, dependencies: [reqTaskId], description: "High-level and detailed design of the software architecture." },
      { id: devTaskId, projectId: currentProjectId, title: `Develop Core Logic for ${currentProjectName}`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(todayFormatted, -2), 'yyyy-MM-dd'), durationDays: 10, progress: 30, parentId: designTaskId, dependencies: [], isMilestone: false, description: "Core development phase, implementing key functionalities based on the architectural design." },
      { id: subTaskApiId, projectId: currentProjectId, parentId: devTaskId, title: `Implement API Endpoints`, status: 'To Do', assignedTo: 'Code Review Agent', startDate: format(addDays(todayFormatted, 0), 'yyyy-MM-dd'), durationDays: 3, progress: 0, isMilestone: false, dependencies: [], description: "Develop and unit test the necessary API endpoints for the core logic."},
      { id: testTaskId, projectId: currentProjectId, title: `Test ${currentProjectName} Integration`, status: 'To Do', assignedTo: 'Software Testing & QA Cycle', startDate: format(addDays(todayFormatted, 8), 'yyyy-MM-dd'), durationDays: 5, progress: 0, parentId: null, dependencies: [devTaskId], isMilestone: false, description: "Perform integration testing of developed components and system-level qualification tests." },
      { id: alphaMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Alpha Release`, status: 'To Do', assignedTo: 'Project Manager', startDate: format(addDays(todayFormatted, 13), 'yyyy-MM-dd'), durationDays: 0, progress: 0, isMilestone: true, parentId: null, dependencies: [testTaskId], description: "Target date for the Alpha release of the project."},
    ];
  }, []);

 useEffect(() => {
    if (!projectId || !isClient) return;

    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    let allProjects: Project[] = [];
    if (allProjectsStored) {
        try {
            allProjects = JSON.parse(allProjectsStored);
        } catch (e) {
            console.error("PROJECT_DETAIL_PAGE: Error parsing projects from localStorage.", e);
            allProjects = initialMockProjects;
        }
    } else {
        allProjects = initialMockProjects;
    }
    const foundProject = allProjects.find(p => p.id === projectId);


    if (foundProject) {
      setProject(foundProject);

      const tasksStorageKey = getTasksStorageKey(projectId);
      const storedTasks = localStorage.getItem(tasksStorageKey);
      if (storedTasks) {
        try {
          setTasks(JSON.parse(storedTasks));
        } catch (error) {
          const initialTasks = initialMockTasksForProject(projectId, foundProject.name);
          setTasks(initialTasks);
          localStorage.setItem(tasksStorageKey, JSON.stringify(initialTasks));
        }
      } else {
        const initialTasks = initialMockTasksForProject(projectId, foundProject.name);
        setTasks(initialTasks);
        localStorage.setItem(tasksStorageKey, JSON.stringify(initialTasks));
      }

      const agentsStorageKey = getAgentsStorageKey(projectId);
      const storedAgents = localStorage.getItem(agentsStorageKey);
      if (storedAgents) {
        try {
          setProjectAgents(JSON.parse(storedAgents));
        } catch (error) {
          const initialAgents = initialProjectScopedMockAgents(projectId);
          setProjectAgents(initialAgents);
          localStorage.setItem(agentsStorageKey, JSON.stringify(initialAgents));
        }
      } else {
        const initialAgents = initialProjectScopedMockAgents(projectId);
        setProjectAgents(initialAgents);
        localStorage.setItem(agentsStorageKey, JSON.stringify(initialAgents));
      }

      const workflowsStorageKey = getWorkflowsStorageKey(projectId);
      const storedWorkflows = localStorage.getItem(workflowsStorageKey);
      if (storedWorkflows) {
        try {
          const parsedWorkflows = JSON.parse(storedWorkflows) as ProjectWorkflow[];
          setProjectWorkflows(parsedWorkflows.map(wf => ({
            ...wf,
            nodes: wf.nodes || [],
            edges: wf.edges || [],
          })));
        } catch (error) {
          const predefinedWfs = predefinedWorkflowsData(projectId);
          setProjectWorkflows(predefinedWfs);
          localStorage.setItem(workflowsStorageKey, JSON.stringify(predefinedWfs));
        }
      } else {
        const predefinedWfs = predefinedWorkflowsData(projectId);
        setProjectWorkflows(predefinedWfs);
        localStorage.setItem(workflowsStorageKey, JSON.stringify(predefinedWfs));
      }

      const storedFiles = localStorage.getItem(filesStorageKey);
      if (storedFiles) {
        try {
          setProjectFiles(JSON.parse(storedFiles));
        } catch (error) {
          const initialFiles = initialMockFilesData(projectId);
          setProjectFiles(initialFiles);
          localStorage.setItem(filesStorageKey, JSON.stringify(initialFiles));
        }
      } else {
        const initialFiles = initialMockFilesData(projectId);
        setProjectFiles(initialFiles);
        localStorage.setItem(filesStorageKey, JSON.stringify(initialFiles));
      }
      setCurrentFilePath('/');

      const storedRequirements = localStorage.getItem(requirementsStorageKey);
      if (storedRequirements) {
        try {
          setProjectRequirements(JSON.parse(storedRequirements));
        } catch (error) {
          setProjectRequirements([]);
          localStorage.setItem(requirementsStorageKey, JSON.stringify([]));
        }
      } else {
        setProjectRequirements([]);
        localStorage.setItem(requirementsStorageKey, JSON.stringify([]));
      }

    } else {
      setProject(null);
      if (isClient) router.push('/');
    }
  }, [projectId, isClient, router, initialMockTasksForProject, filesStorageKey, requirementsStorageKey]);


  useEffect(() => {
    if (isClient && projectId && (tasks.length > 0 || localStorage.getItem(getTasksStorageKey(projectId)) !== null)) {
        localStorage.setItem(getTasksStorageKey(projectId), JSON.stringify(tasks));
    }
  }, [tasks, projectId, isClient]);

  useEffect(() => {
    const key = getAgentsStorageKey(projectId);
    if (isClient && projectId && (projectAgents.length > 0 || localStorage.getItem(key) !== null)) {
      localStorage.setItem(key, JSON.stringify(projectAgents));
    }
  }, [projectAgents, projectId, isClient]);

  const designingWorkflowId = useMemo(() => designingWorkflow?.id, [designingWorkflow?.id]);

  useEffect(() => {
    // Only run if designingWorkflow is set and projectWorkflows has loaded
    if (!designingWorkflowId || !projectWorkflows || projectWorkflows.length === 0) return;

    const currentDesigningWorkflowInState = projectWorkflows.find(wf => wf.id === designingWorkflowId);

    if (currentDesigningWorkflowInState) {
      // Deep comparison to avoid unnecessary updates if object references are different but content is the same
      if (JSON.stringify(currentDesigningWorkflowInState) !== JSON.stringify(designingWorkflow)) {
        // console.log("PROJECT_DETAIL_PAGE: Syncing designingWorkflow from projectWorkflows state. ID:", designingWorkflowId);
        setDesigningWorkflow(JSON.parse(JSON.stringify(currentDesigningWorkflowInState))); // Update with a new object
      }
    } else {
      // If the workflow being designed is no longer in the main list (e.g., deleted), close the designer.
      // console.log("PROJECT_DETAIL_PAGE: Designing workflow no longer in projectWorkflows list. Closing designer. ID was:", designingWorkflowId);
      setDesigningWorkflow(null);
    }
  }, [projectWorkflows, designingWorkflowId]); // Removed designingWorkflow from deps to avoid loop with its own update

  useEffect(() => {
    // This effect specifically handles saving projectWorkflows to localStorage.
    // It runs whenever projectWorkflows changes, after the state has been updated.
    const key = getWorkflowsStorageKey(projectId);
    if (isClient && projectId && (projectWorkflows.length > 0 || localStorage.getItem(key) !== null)) {
        const dataToSave = projectWorkflows.map(wf => ({ ...wf, nodes: wf.nodes || [], edges: wf.edges || [] }));
        // console.log(`PROJECT_DETAIL_PAGE: Saving projectWorkflows to localStorage for project ${projectId}`, JSON.stringify(dataToSave.map(wf => ({ id: wf.id, name: wf.name, nodesCount: (wf.nodes || []).length, edgesCount: (wf.edges || []).length }))));
        localStorage.setItem(key, JSON.stringify(dataToSave));
    }
  }, [projectWorkflows, projectId, isClient]);


  useEffect(() => {
    if (isClient && projectId && (projectFiles.length > 0 || localStorage.getItem(filesStorageKey) !== null)) {
      localStorage.setItem(filesStorageKey, JSON.stringify(projectFiles));
    }
  }, [projectFiles, projectId, isClient, filesStorageKey]);

  useEffect(() => {
    if (isClient && projectId && (projectRequirements.length > 0 || localStorage.getItem(requirementsStorageKey) !== null)) {
      localStorage.setItem(requirementsStorageKey, JSON.stringify(projectRequirements));
    }
  }, [projectRequirements, projectId, isClient, requirementsStorageKey]);

  const updateWorkflowStatusBasedOnTasks = useCallback((
    currentTasks: Task[],
    currentWorkflows: ProjectWorkflow[]
  ): ProjectWorkflow[] => {
    let workflowsChanged = false;
    const newWorkflows = currentWorkflows.map(workflow => {
      const relevantTasks = currentTasks.filter(task => task.assignedTo === workflow.name && !task.isMilestone);
      let newStatus = workflow.status;
      let newLastRun = workflow.lastRun;
      let workflowJustActivated = false;
      let workflowJustCompleted = false;

      if (workflow.status === 'Active') {
        if (relevantTasks.length > 0 && relevantTasks.every(task => task.status === 'Done')) {
          newStatus = 'Inactive';
          newLastRun = new Date().toISOString();
          workflowJustCompleted = true;
          workflowsChanged = true;
        }
      } else if (workflow.status === 'Draft' || workflow.status === 'Inactive') {
        if (relevantTasks.some(task => task.status !== 'Done' && task.status !== 'Blocked')) {
             newStatus = 'Active';
             newLastRun = new Date().toISOString();
             workflowJustActivated = true;
             workflowsChanged = true;
        }
      }
      if (workflowJustCompleted) {
        setTimeout(() => toast({
          title: "Workflow Completed",
          description: `Workflow "${workflow.name}" has completed all its tasks and is now Inactive.`,
        }),0);
      } else if (workflowJustActivated) {
        setTimeout(() => toast({
          title: "Workflow Activated",
          description: `Workflow "${workflow.name}" has pending tasks and is now Active.`,
        }),0);
      }
      return { ...workflow, status: newStatus, lastRun: newLastRun };
    });

    if (workflowsChanged) {
      return newWorkflows;
    }
    return currentWorkflows;
  }, []); // Removed toast from dependency array

  useEffect(() => {
    if (!isClient || (tasks.length === 0 && projectWorkflows.every(wf => wf.status !== 'Active'))) return;
    
    // Directly call setProjectWorkflows with the updater function
    setProjectWorkflows(prevWorkflows => {
        const updated = updateWorkflowStatusBasedOnTasks(tasks, prevWorkflows);
        // Only return new array if something actually changed to avoid infinite loop if updateWorkflowStatusBasedOnTasks is stable
        return JSON.stringify(updated) !== JSON.stringify(prevWorkflows) ? updated : prevWorkflows;
    });

  }, [tasks, isClient, updateWorkflowStatusBasedOnTasks]); // Removed projectWorkflows from here


const handleTaskPlannedAndAccepted = useCallback((aiOutput: PlanProjectTaskOutput) => {
    console.log("PROJECT_DETAIL_PAGE: handleTaskPlannedAndAccepted received aiOutput:", JSON.stringify(aiOutput, null, 2));

    const plannedTaskDataFromAI = aiOutput?.plannedTask || {};
    const aiReasoning = aiOutput?.reasoning || "No reasoning provided by AI.";
    const suggestedSubTasksFromAI = plannedTaskDataFromAI.suggestedSubTasks || [];

    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted taskTitle:", plannedTaskDataFromAI.title || "Untitled AI Task");
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted aiReasoning:", aiReasoning);
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted suggestedSubTasksFromAI:", JSON.stringify(suggestedSubTasksFromAI, null, 2));

    const subTasksDetailsText = suggestedSubTasksFromAI.length > 0
      ? suggestedSubTasksFromAI
        .map(st => `- ${st.title || 'Untitled Sub-task'} (Agent: ${st.assignedAgentType || 'N/A'}) - Desc: ${st.description || 'N/A'}`)
        .join('\n')
      : "None specified by AI.";

    const combinedDescription = `AI Reasoning: ${aiReasoning.trim()}\n\nAI Suggested Sub-Tasks / Steps:\n${subTasksDetailsText.trim()}`;
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed combinedDescription for main task:", combinedDescription);

    const mainTaskId = uid(`task-proj-${projectId.slice(-5)}`);
    let mainTask: Task = {
      id: mainTaskId,
      projectId: projectId,
      title: plannedTaskDataFromAI.title || "Untitled AI Task",
      status: plannedTaskDataFromAI.status || 'To Do',
      assignedTo: plannedTaskDataFromAI.assignedTo || "AI Assistant to determine",
      startDate: plannedTaskDataFromAI.startDate || format(new Date(), 'yyyy-MM-dd'),
      durationDays: plannedTaskDataFromAI.isMilestone ? 0 : (plannedTaskDataFromAI.durationDays === undefined || plannedTaskDataFromAI.durationDays < 1 ? 1 : Math.max(1, plannedTaskDataFromAI.durationDays)),
      progress: plannedTaskDataFromAI.isMilestone ? (plannedTaskDataFromAI.status === 'Done' ? 100 : 0) : (plannedTaskDataFromAI.progress === undefined ? 0 : Math.min(100, Math.max(0, plannedTaskDataFromAI.progress))),
      isMilestone: plannedTaskDataFromAI.isMilestone || false,
      parentId: (plannedTaskDataFromAI.parentId === "null" || plannedTaskDataFromAI.parentId === undefined || plannedTaskDataFromAI.parentId === NO_PARENT_VALUE) ? null : plannedTaskDataFromAI.parentId,
      dependencies: plannedTaskDataFromAI.dependencies || [],
      description: combinedDescription.trim() || "AI-planned task.",
    };

    let newTasksList: Task[] = [];
    let autoStarted = false;
    let assignedAgentName: string | null = null;
    let toastDescriptionText = "";

    const assignedToValue = mainTask.assignedTo;
    if (assignedToValue && assignedToValue !== "AI Assistant to determine" && !mainTask.isMilestone) {
      const matchingWorkflow = projectWorkflows.find(wf => wf.name === assignedToValue);
      if (matchingWorkflow) {
        toastDescriptionText = `Task "${mainTask.title}" assigned to workflow "${assignedToValue}".`;
        let workflowWasActivated = false;
        setProjectWorkflows(prevWorkflows => {
          let changed = false;
          const updatedWorkflows = prevWorkflows.map(wf => {
            if (wf.id === matchingWorkflow.id && (wf.status === 'Draft' || wf.status === 'Inactive')) {
              changed = true;
              workflowWasActivated = true; // Mark that this specific workflow was activated
              return { ...wf, status: 'Active', lastRun: new Date().toISOString() };
            }
            return wf;
          });
          if (workflowWasActivated) {
             setTimeout(() => toast({title: "Workflow Activated", description: `Workflow "${matchingWorkflow.name}" is now Active due to new task assignment.`}),0);
          }
          return changed ? updatedWorkflows : prevWorkflows;
        });

         if ((matchingWorkflow.status === 'Active' || workflowWasActivated) && mainTask.status !== 'Done') {
           mainTask.status = 'In Progress';
           mainTask.progress = (mainTask.progress === 0 || mainTask.progress === undefined) ? 10 : mainTask.progress;
           toastDescriptionText += ` Workflow is active. Main task set to 'In Progress'.`;
         }

      } else {
        const assignedAgentInstance = projectAgents.find(agent => agent.name === assignedToValue);
        if (assignedAgentInstance) {
            assignedAgentName = assignedAgentInstance.name;
            if (assignedAgentInstance.status === 'Running') {
                mainTask.status = 'In Progress';
                mainTask.progress = (mainTask.progress === 0 || mainTask.progress === undefined) ? 10 : mainTask.progress;
                autoStarted = true;
                setProjectAgents(prevAgents => prevAgents.map(agent =>
                  agent.id === assignedAgentInstance.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
                ));
                toastDescriptionText = `Task "${mainTask.title}" assigned to agent "${assignedAgentName}" and is now being processed.`;
            } else {
                toastDescriptionText = `Task "${mainTask.title}" added and assigned to agent "${assignedAgentName}". Run the agent to start processing.`;
            }
        } else {
            toastDescriptionText = `Task "${mainTask.title}" added. Assigned to: "${assignedToValue}". Consider creating a matching workflow or agent.`;
        }
      }
    } else if (mainTask.isMilestone) {
        toastDescriptionText = `Milestone "${mainTask.title}" added.`;
    } else {
        toastDescriptionText = `Task "${mainTask.title}" added. Assigned to: ${mainTask.assignedTo || "Unassigned"}.`;
    }

    newTasksList.push(mainTask);

    if (suggestedSubTasksFromAI.length > 0 && !mainTask.isMilestone) {
      const createdSubTasks: Task[] = suggestedSubTasksFromAI.map((st, index) => {
        const subTaskId = uid(`subtask-${mainTaskId.slice(-5)}`);
        const previousSubTask = index > 0 ? createdSubTasks[index-1] : null;
        
        return {
          id: subTaskId,
          projectId: projectId,
          title: st.title || "Untitled Sub-task",
          status: 'To Do',
          assignedTo: st.assignedAgentType || "General Agent",
          startDate: mainTask.startDate,
          durationDays: 1,
          progress: 0,
          isMilestone: false,
          parentId: mainTaskId,
          dependencies: previousSubTask ? [previousSubTask.id] : [],
          description: st.description || "No description provided by AI for this sub-task.",
        };
      });
      newTasksList = [...newTasksList, ...createdSubTasks];
      if (createdSubTasks.length > 0) {
        toastDescriptionText += ` ${createdSubTasks.length} sub-task(s) also created and linked.`;
      }
    }
    
    setTasks(prevTasks => [...newTasksList, ...prevTasks].sort((a, b) => {
        if (a.parentId === b.id) return 1; 
        if (b.parentId === a.id) return -1; 
        if (a.parentId && !b.parentId) return 1; 
        if (!a.parentId && b.parentId) return -1; 
        const dateA = a.startDate ? parseISO(a.startDate) : new Date(0);
        const dateB = b.startDate ? parseISO(b.startDate) : new Date(0);
        if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
        return a.title.localeCompare(b.title);
      }));
      
    setIsAITaskPlannerDialogOpen(false);

    let toastTitle = mainTask.isMilestone ? "Milestone Planned (AI)" : "Task Planned (AI)";
    if (autoStarted || mainTask.status === 'In Progress') {
      toastTitle = "Task In Progress (AI Planned)";
    }
    setTimeout(() => toast({ title: toastTitle, description: toastDescriptionText.trim() }), 0);
    
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed mainTask for chat:", JSON.stringify(mainTask, null, 2));
    setChattingTask(mainTask);
    setIsChatDialogOpen(true);

  }, [projectId, project?.name, projectWorkflows, projectAgents, toast, updateWorkflowStatusBasedOnTasks]);


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
        description: updatedTaskData.description || "",
    };

    const newTasks = tasks.map(task => task.id === taskToUpdate.id ? taskToUpdate : task);
    setTasks(newTasks);

    setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(newTasks, prevWorkflows));


    setIsEditTaskDialogOpen(false);
    setEditingTask(null);
    setIsViewingTask(false);
    setTimeout(() => toast({ title: taskToUpdate.isMilestone ? "Milestone Updated" : "Task Updated", description: `${taskToUpdate.isMilestone ? "Milestone" : "Task"} "${taskToUpdate.title}" has been updated.`}),0);
  };

  const handleOpenDeleteTaskDialog = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteTaskDialogOpen(true);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      const tasksToDeleteIds = new Set<string>([taskToDelete.id]);
      let currentTasksToCheck = [taskToDelete.id];
      while(currentTasksToCheck.length > 0) {
        const parentId = currentTasksToCheck.pop()!;
        tasks.forEach(t => {
          if (t.parentId === parentId) {
            tasksToDeleteIds.add(t.id);
            currentTasksToCheck.push(t.id);
          }
        });
      }

      const remainingTasks = tasks.filter(task => !tasksToDeleteIds.has(task.id));
      setTasks(remainingTasks);

      setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(remainingTasks, prevWorkflows));

      setTimeout(() => toast({ title: taskToDelete.isMilestone ? "Milestone Deleted" : "Task Deleted", description: `${taskToDelete.isMilestone ? "Milestone" : "Task"} "${taskToDelete.title}" and its sub-tasks have been deleted from project "${project?.name}".`, variant: 'destructive' }),0);
      setTaskToDelete(null);
      setIsDeleteTaskDialogOpen(false);
    }
  };

  const handleTaskCardDragStart = (event: React.DragEvent<HTMLDivElement>, task: Task) => {
    event.dataTransfer.setData('taskId', task.id);
    event.dataTransfer.setData('taskStatus', task.status);
  };


  const handleColumnDragOver = (event: React.DragEvent<HTMLDivElement>, status: Task['status']) => {
    event.preventDefault();
    setDraggingOverStatus(status);
  };

  const handleColumnDragLeave = () => {
    setDraggingOverStatus(null);
  };

  const handleColumnDrop = (event: React.DragEvent<HTMLDivElement>, newStatus: Task['status']) => {
    event.preventDefault();
    const draggedTaskId = event.dataTransfer.getData('taskId');
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    setDraggingOverStatus(null);
    setReorderTargetTaskId(null);

    let updatedTasksArray = [...tasks];
    const taskToMoveIndex = updatedTasksArray.findIndex(task => task.id === draggedTaskId);

    if (taskToMoveIndex === -1) return;
    let taskToMove = { ...updatedTasksArray[taskToMoveIndex] };

    if (sourceTaskStatus !== newStatus) { 
        taskToMove.status = newStatus;
        if (taskToMove.isMilestone) {
            taskToMove.progress = newStatus === 'Done' ? 100 : 0;
            taskToMove.status = newStatus === 'Done' ? 'Done' : (newStatus === 'Blocked' ? 'Blocked' : 'To Do');
        } else {
            taskToMove.progress = newStatus === 'Done' ? 100 : (newStatus === 'To Do' || newStatus === 'Blocked' ? 0 : (taskToMove.progress || 0));
        }
        
        updatedTasksArray.splice(taskToMoveIndex, 1); 
        
        let insertAtIndex = updatedTasksArray.length;
        // Find the first task of the new status, or the end of the list for that status
        let firstIndexOfNewStatus = -1;
        let lastIndexOfNewStatus = -1;

        for (let i = 0; i < updatedTasksArray.length; i++) {
            if (updatedTasksArray[i].status === newStatus) {
                if (firstIndexOfNewStatus === -1) {
                    firstIndexOfNewStatus = i;
                }
                lastIndexOfNewStatus = i;
            }
        }

        if (firstIndexOfNewStatus !== -1) { // If tasks with newStatus exist
            insertAtIndex = lastIndexOfNewStatus + 1;
        } else { // No tasks with newStatus, find where this status group should start or end
            const statusOrder = taskStatuses;
            const currentStatusIndex = statusOrder.indexOf(newStatus);
            let placed = false;
            for(let i = 0; i < updatedTasksArray.length; i++) {
                if(statusOrder.indexOf(updatedTasksArray[i].status) > currentStatusIndex) {
                    insertAtIndex = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) insertAtIndex = updatedTasksArray.length; // Add to end if no later statuses
        }


        updatedTasksArray.splice(insertAtIndex, 0, taskToMove);
        
        setTimeout(() => toast({
            title: "Task Status Updated",
            description: `Task "${taskToMove.title}" moved to "${newStatus}".`,
        }),0);
        setTasks(updatedTasksArray);
        setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasksArray, prevWorkflows));

    } else if (sourceTaskStatus === newStatus && draggedTaskId) {
        // This logic is for reordering within the same column by dropping onto the column itself (move to end)
        const currentTask = updatedTasksArray.splice(taskToMoveIndex, 1)[0];
        
        let insertAtIndex = updatedTasksArray.length;
        // Find the end of the current status group
        for (let i = updatedTasksArray.length - 1; i >= 0; i--) {
            if (updatedTasksArray[i].status === sourceTaskStatus) {
                insertAtIndex = i + 1;
                break;
            }
        }
        if (insertAtIndex === updatedTasksArray.length && updatedTasksArray.every(t => t.status !== sourceTaskStatus)) {
          // if no tasks of this status, find where this status group should start
            const statusOrder = taskStatuses;
            const currentStatusIndex = statusOrder.indexOf(sourceTaskStatus);
            for(let i=0; i < updatedTasksArray.length; i++) {
                if(statusOrder.indexOf(updatedTasksArray[i].status) > currentStatusIndex) {
                    insertAtIndex = i;
                    break;
                }
            }
        }
        
        updatedTasksArray.splice(insertAtIndex, 0, currentTask); 
        
        setTasks(updatedTasksArray);
        setTimeout(() => toast({
            title: "Task Reordered",
            description: `Task "${currentTask.title}" moved to the end of "${sourceTaskStatus}".`,
        }),0);
    }
  };

  const handleTaskCardDragOver = (event: React.DragEvent<HTMLDivElement>, targetTask: Task) => {
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

  const handleTaskCardDrop = (event: React.DragEvent<HTMLDivElement>, targetTask: Task) => {
    event.preventDefault();
    event.stopPropagation(); 

    const draggedTaskId = event.dataTransfer.getData('taskId');
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    setReorderTargetTaskId(null);
    setDraggingOverStatus(null);

    if (sourceTaskStatus === targetTask.status && draggedTaskId !== targetTask.id) {
      setTasks(prevTasks => {
        const draggedTaskIndex = prevTasks.findIndex(t => t.id === draggedTaskId);
        if (draggedTaskIndex === -1) return prevTasks;

        const draggedTask = prevTasks[draggedTaskIndex];
        let tasksWithoutDragged = prevTasks.filter(t => t.id !== draggedTaskId);

        const targetTaskIndexInFiltered = tasksWithoutDragged.findIndex(t => t.id === targetTask.id);
        if (targetTaskIndexInFiltered === -1) { 
            // This case should ideally not happen if targetTask is valid
            tasksWithoutDragged.push(draggedTask); 
            return tasksWithoutDragged;
        }
        
        // Insert before the target task
        tasksWithoutDragged.splice(targetTaskIndexInFiltered, 0, draggedTask);

        setTimeout(() => toast({
          title: "Task Reordered",
          description: `Task "${draggedTask.title}" reordered within "${sourceTaskStatus}".`,
        }),0);
        return tasksWithoutDragged;
      });
    }
  };

  const handleGanttTaskReorder = useCallback((draggedTaskId: string, targetTaskId: string) => {
    setTimeout(() => { 
      setTasks(prevTasks => {
        const draggedTaskIndex = prevTasks.findIndex(task => task.id === draggedTaskId);
        const targetTaskIndexInOriginal = prevTasks.findIndex(task => task.id === targetTaskId);

        if (draggedTaskIndex === -1 || targetTaskIndexInOriginal === -1) return prevTasks;

        const newTasks = [...prevTasks];
        const [draggedTask] = newTasks.splice(draggedTaskIndex, 1);
        
        // Find the new target index after the splice, as indices might have shifted
        const newTargetIndexAfterSplice = newTasks.findIndex(task => task.id === targetTaskId);
        
        newTasks.splice(newTargetIndexAfterSplice, 0, draggedTask); // Insert before the target task
        
        toast({
            title: "Tasks Reordered",
            description: `Task "${draggedTask.title}" moved in Gantt chart.`,
        });
        return newTasks;
      });
    }, 0);
  }, [toast]);


  const handleAddProjectAgent = (newAgentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => {
    const newAgent: Agent = {
      ...newAgentData,
      id: uid(`cfg-proj-${projectId.slice(-5)}`),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
     setTimeout(() => toast({
      title: "Project Agent Added",
      description: `Agent "${newAgent.name}" has been added to project "${project?.name}".`,
    }),0);
  };

  const handleOpenEditProjectAgentDialog = (agent: Agent) => {
    setEditingProjectAgent(agent);
    setIsEditAgentDialogOpen(true);
  };

  const handleUpdateProjectAgent = (updatedAgent: Agent) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === updatedAgent.id ? { ...updatedAgent, lastActivity: new Date().toISOString() } : agent
      )
    );
    setIsEditAgentDialogOpen(false);
    setEditingProjectAgent(null);
     setTimeout(() => toast({ title: "Project Agent Updated", description: `Agent "${updatedAgent.name}" updated for project "${project?.name}".` }),0);
  };

  const handleRunProjectAgent = (agentId: string) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Running', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = projectAgents.find(a => a.id === agentId)?.name;
    setTimeout(() => toast({ title: "Project Agent Started", description: `Agent "${agentName || agentId}" is now Running in project "${project?.name}".` }),0);
  };

  const handleStopProjectAgent = (agentId: string) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Stopped', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = projectAgents.find(a => a.id === agentId)?.name;
    setTimeout(() => toast({ title: "Project Agent Stopped", description: `Agent "${agentName || agentId}" has been Stopped in project "${project?.name}".` }),0);
  };

  const handleDuplicateProjectAgent = (agentToDuplicate: Agent) => {
    const newAgent: Agent = {
      ...agentToDuplicate,
      id: uid(`cfg-proj-${projectId.slice(-5)}`),
      name: `${agentToDuplicate.name} - Copy`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
    setTimeout(() => toast({ title: "Project Agent Duplicated", description: `Agent "${agentToDuplicate.name}" duplicated for project "${project?.name}".` }),0);
  };

  const handleOpenDeleteAgentDialog = (agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteAgentDialogOpen(true);
  };

  const confirmDeleteProjectAgent = () => {
    if (agentToDelete) {
      setProjectAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentToDelete.id));
      setTimeout(() => toast({ title: "Project Agent Deleted", description: `Agent "${agentToDelete.name}" has been deleted from project "${project?.name}".`, variant: 'destructive' }),0);
      setAgentToDelete(null);
      setIsDeleteAgentDialogOpen(false);
    }
  };

  const handleAddProjectWorkflow = (workflowData: { name: string; description: string }) => {
    const newWorkflow: ProjectWorkflow = {
      id: uid(`wf-proj-${projectId.slice(-3)}-${workflowData.name.toLowerCase().replace(/\s+/g, '-').substring(0,5)}`),
      name: workflowData.name,
      description: workflowData.description,
      status: 'Draft',
      lastRun: undefined,
      nodes: [],
      edges: [],
    };
    setProjectWorkflows(prevWorkflows => [newWorkflow, ...prevWorkflows]);
    setIsAddWorkflowDialogOpen(false);
    setTimeout(() => toast({ title: "Project Workflow Added", description: `Workflow "${newWorkflow.name}" created for project "${project?.name}".` }),0);
  };

  const handleOpenWorkflowDesigner = (workflow: ProjectWorkflow) => {
    setDesigningWorkflow(JSON.parse(JSON.stringify(workflow))); 
  };

  const handleCloseWorkflowDesigner = useCallback(() => {
    if (designingWorkflow) {
      setTimeout(() => toast({ title: "Workflow Design Closed", description: `Stopped designing workflow: "${designingWorkflow.name}". Changes are saved automatically.`}),0);
      setDesigningWorkflow(null);
    }
  }, [designingWorkflow, toast]);

  const handleWorkflowNodesChange = useCallback((updatedNodes: WorkflowNode[]) => {
    const currentDesigningWfId = designingWorkflowId; // Use memoized ID
    if (currentDesigningWfId) {
      setProjectWorkflows(prevWorkflows =>
        prevWorkflows.map(wf =>
          wf.id === currentDesigningWfId ? { ...wf, nodes: updatedNodes, lastRun: new Date().toISOString() } : wf
        )
      );
    }
  }, [designingWorkflowId]);

  const handleWorkflowEdgesChange = useCallback((updatedEdges: WorkflowEdge[]) => {
    const currentDesigningWfId = designingWorkflowId; // Use memoized ID
    if (currentDesigningWfId) {
      setProjectWorkflows(prevWorkflows =>
        prevWorkflows.map(wf =>
          wf.id === currentDesigningWfId ? { ...wf, edges: updatedEdges, lastRun: new Date().toISOString() } : wf
        )
    );
    }
  }, [designingWorkflowId]);


  const handleOpenDeleteWorkflowDialog = (workflow: ProjectWorkflow) => {
    setWorkflowToDelete(workflow);
    setIsDeleteWorkflowDialogOpen(true);
  };

  const confirmDeleteWorkflow = () => {
    if (workflowToDelete) {
      setProjectWorkflows(prevWorkflows => prevWorkflows.filter(wf => wf.id !== workflowToDelete.id));
      setTimeout(() => toast({ title: "Workflow Deleted", description: `Workflow "${workflowToDelete.name}" has been deleted from project "${project?.name}".`, variant: 'destructive' }),0);
      if (designingWorkflow && designingWorkflow.id === workflowToDelete.id) {
        setDesigningWorkflow(null);
      }
      setWorkflowToDelete(null);
      setIsDeleteWorkflowDialogOpen(false);
    }
  };

  const formatDate = (dateString: string | undefined, formatString: string = "MMMM d, yyyy 'at' hh:mm a") => {
    if (!isClient || !dateString) return 'Processing...';
    if (!dateString.includes('-') && !dateString.includes('/') && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3})?Z$/.test(dateString) && !/^\d{4}-\d{2}-\d{2}$/.test(dateString) ) {
      return dateString;
    }
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) { 
        return "Invalid Date"; 
      }
      return format(date, formatString);
    } catch (error) {
      return dateString; 
    }
  };

  const handleOpenChatDialog = (task: Task) => {
    setChattingTask(task);
    setIsChatDialogOpen(true);
  };

  const addFileOrFolderRecursive = useCallback((
    currentItems: ProjectFile[],
    targetPathSegments: string[],
    itemToAdd: ProjectFile,
    currentLevelPath: string = '/'
  ): ProjectFile[] => {
    if (targetPathSegments.length === 0) { 
      const itemExists = currentItems.some(item => item.name === itemToAdd.name && item.path === currentLevelPath && item.type === itemToAdd.type);
      if (itemExists) {
        setTimeout(() => toast({ title: "Duplicate Item", description: `A ${itemToAdd.type} named "${itemToAdd.name}" already exists in ${currentLevelPath}.`, variant: "destructive" }),0);
        return currentItems; 
      }
      
      return [...currentItems, { ...itemToAdd, path: currentLevelPath }].sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
    }

    const headSegment = targetPathSegments[0];
    const tailSegments = targetPathSegments.slice(1);

    return currentItems.map(item => {
      if (item.type === 'folder' && item.name === headSegment && item.path === currentLevelPath) {
        return {
          ...item,
          children: addFileOrFolderRecursive(item.children || [], tailSegments, itemToAdd, `${currentLevelPath}${item.name}/`),
          lastModified: new Date().toISOString(), 
        };
      }
      return item;
    }).sort((a, b) => { 
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
    });
  }, [toast]);

  const getFilesForPath = useCallback((path: string): ProjectFile[] => {
    if (path === '/') {
      return projectFiles.filter(item => item.path === '/').sort((a,b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
    }
    const segments = path.split('/').filter(Boolean);
    let currentLevelItems: ProjectFile[] | undefined = projectFiles;
    let accumulatedPath = '/';

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const folder = currentLevelItems?.find(item => item.type === 'folder' && item.name === segment && item.path === accumulatedPath);

        if (folder && folder.children !== undefined) {
            currentLevelItems = folder.children;
            accumulatedPath += segment + '/';
        } else if (folder && folder.children === undefined) { 
            currentLevelItems = [];
            break;
        }
         else {
            return [];
        }
    }
    
    return (currentLevelItems || []).map(item => ({...item, path: accumulatedPath})).sort((a,b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [projectFiles]);


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
                let newPath = currentFilePath + file.name;
                if (!newPath.endsWith('/')) {
                    newPath += '/';
                }
                setCurrentFilePath(newPath);
              } else {
                setTimeout(() => toast({ title: "Opening File (Mock)", description: `Simulating opening of "${file.name}". Actual file viewing not implemented.` }),0);
              }
            }}
          >
            {file.type === 'folder' ? <FolderIcon className="h-5 w-5 text-primary" /> : <FileIcon className="h-5 w-5 text-muted-foreground" />}
            <span className="truncate">{file.name}</span>
          </Button>
        </TableCell>
        <TableCell className="hidden sm:table-cell text-muted-foreground">{file.size || '-'}</TableCell>
        <TableCell className="hidden md:table-cell text-muted-foreground">{file.lastModified ? formatDate(file.lastModified, 'MMM d, yyyy') : '-'}</TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" disabled>Actions</Button>
        </TableCell>
      </TableRow>
    ));
  };

  const handleNavigateUp = () => {
    if (currentFilePath === '/') return;
    const pathSegments = currentFilePath.split('/').filter(p => p);
    pathSegments.pop(); 
    const newPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}/` : '/';
    setCurrentFilePath(newPath);
  };

  const handleOpenNewFolderDialog = () => {
    setNewFolderName("");
    setIsNewFolderDialogOpen(true);
  };

  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) {
      setTimeout(() => toast({ title: "Folder name cannot be empty", variant: "destructive" }),0);
      return;
    }

    const newFolder: ProjectFile = {
      id: uid(`folder-proj-${projectId.slice(-5)}`),
      name: newFolderName.trim(),
      type: 'folder',
      path: currentFilePath, 
      children: [],
      lastModified: new Date().toISOString(),
    };

    setProjectFiles(prevFiles => {
      if (currentFilePath === '/') {
         const itemExists = prevFiles.some(item => item.name === newFolder.name && item.path === '/' && item.type === 'folder');
         if (itemExists) {
           setTimeout(() => toast({ title: "Duplicate Item", description: `A folder named "${newFolder.name}" already exists in the root.`, variant: "destructive" }),0);
           return prevFiles;
         }
         return [...prevFiles, newFolder].sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
          });
      }
      const pathSegments = currentFilePath.split('/').filter(Boolean);
      const deepCopiedFiles = JSON.parse(JSON.stringify(prevFiles)); 
      return addFileOrFolderRecursive(deepCopiedFiles, pathSegments, newFolder);
    });

    setTimeout(() => toast({ title: "Folder Created", description: `Folder "${newFolder.name}" created in ${currentFilePath}.` }),0);
    setIsNewFolderDialogOpen(false);
    setNewFolderName("");
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFilesBatch: ProjectFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const newFileToAdd: ProjectFile = {
        id: uid(`file-proj-${projectId}-${i}`),
        name: file.name,
        type: 'file',
        path: currentFilePath, 
        size: `${(file.size / 1024).toFixed(1)}KB`,
        lastModified: new Date(file.lastModified).toISOString(),
      };
      newFilesBatch.push(newFileToAdd);
    }

    setProjectFiles(currentProjectFileState => {
        let updatedList = JSON.parse(JSON.stringify(currentProjectFileState)); 
        const pathSegments = currentFilePath === '/' ? [] : currentFilePath.split('/').filter(Boolean);

        for (const fileToAdd of newFilesBatch) {
           updatedList = addFileOrFolderRecursive(updatedList, pathSegments, fileToAdd);
        }
        return updatedList;
    });

    if (newFilesBatch.length > 0) {
        setTimeout(() => toast({ title: `${newFilesBatch.length} File(s) Processed (Mock)`, description: `Files processed for ${currentFilePath}. Duplicates are skipped if they exist.` }),0);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  if (!isClient && !project) {
    return (
      <div className="container mx-auto">
        <PageHeader><PageHeaderHeading>Loading Project...</PageHeaderHeading></PageHeader>
        <div className="text-center py-10"><p>Loading project data...</p></div>
      </div>
    );
  }

  if (isClient && !project) {
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

  if (!project) { 
    return null;
  }
  
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
                priority
                style={{ objectFit: 'cover' }}
                data-ai-hint="project abstract"
              />
            </div>
          )}
          <div className="flex-grow">
            <PageHeaderHeading><Briefcase className="mr-2 inline-block h-6 w-6 sm:h-7 sm:w-7 md:mr-3 md:h-8 md:w-8" />{project.name}</PageHeaderHeading>
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
              <div className="flex items-center justify-between mb-1"><h4 className="font-semibold text-sm text-muted-foreground flex items-center"><TrendingUp className="h-4 w-4 mr-2" /> Project Progress</h4><span className="text-sm font-medium">{tasks.filter(t=>t.status==='Done' && !t.isMilestone && t.durationDays !== 0).length > 0 && tasks.filter(t => !t.isMilestone && t.durationDays !== 0).length > 0 ? Math.round((tasks.filter(t=>t.status==='Done' && !t.isMilestone && t.durationDays !== 0).length / tasks.filter(t => !t.isMilestone && t.durationDays !== 0).length) * 100) : 0}%</span></div>
              <Progress value={tasks.filter(t=>t.status==='Done' && !t.isMilestone && t.durationDays !== 0).length > 0 && tasks.filter(t => !t.isMilestone && t.durationDays !== 0).length > 0 ? Math.round((tasks.filter(t=>t.status==='Done' && !t.isMilestone && t.durationDays !== 0).length / tasks.filter(t => !t.isMilestone && t.durationDays !== 0).length) * 100) : 0} aria-label={`${tasks.filter(t=>t.status==='Done' && !t.isMilestone && t.durationDays !== 0).length > 0 && tasks.filter(t => !t.isMilestone && t.durationDays !== 0).length > 0 ? Math.round((tasks.filter(t=>t.status==='Done' && !t.isMilestone && t.durationDays !== 0).length / tasks.filter(t => !t.isMilestone && t.durationDays !== 0).length) * 100) : 0}% project progress`} className="h-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/50 rounded-lg shadow-sm"><h4 className="font-semibold text-sm text-muted-foreground mb-1">Pending Tasks</h4><p className="text-2xl font-bold">{tasks.filter(t => (t.status === 'To Do' || t.status === 'In Progress') && !t.isMilestone).length}</p></div>
                 <div className="p-4 bg-accent/50 rounded-lg shadow-sm"><h4 className="font-semibold text-sm text-muted-foreground mb-1">Active Agents</h4><p className="text-2xl font-bold">{projectAgents.filter(a => a.status === 'Running').length}</p></div>
                <div className="p-4 bg-accent/50 rounded-lg shadow-sm"><h4 className="font-semibold text-sm text-muted-foreground mb-1">Active Workflows</h4><p className="text-2xl font-bold">{projectWorkflows.filter(w => w.status === 'Active').length}</p></div>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center"><ActivityIcon className="h-4 w-4 mr-2" /> Recent Activity (Mock)</h4>
              <ScrollArea className="h-24">
                <ul className="space-y-2 text-sm pr-2">
                  <li className="p-2 bg-background rounded-md border text-muted-foreground text-xs">Agent "Data Analyzer" completed task "Analyze Q3 Sales Data".</li>
                  <li className="p-2 bg-background rounded-md border text-muted-foreground text-xs">Workflow "Nightly Backup" initiated successfully.</li>
                  <li className="p-2 bg-background rounded-md border text-muted-foreground text-xs">User 'demo_user' updated configuration for Agent 'Basic Task Reporter'.</li>
                  {tasks.length === 0 && projectAgents.length === 0 && projectWorkflows.length === 0 && <p className="text-muted-foreground text-xs text-center py-2">No recent project activity.</p>}
                </ul>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

       <Tabs defaultValue="taskManagement" className="w-full">
       <TabsList className="grid w-full grid-cols-1 gap-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:w-auto xl:inline-grid">
            <TabsTrigger value="taskManagement"><ListChecks className="mr-2 h-4 w-4"/>Task Management</TabsTrigger>
            <TabsTrigger value="projectAssets"><Files className="mr-2 h-4 w-4"/>Project Assets</TabsTrigger>
            <TabsTrigger value="aiAutomation"><Brain className="mr-2 h-4 w-4"/>AI &amp; Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="taskManagement" className="mt-8 sm:mt-4">
            <Card>
                 <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <div>
                        <CardTitle>Task Management</CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                            View and manage tasks using Gantt or Kanban board.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setIsAITaskPlannerDialogOpen(true)} className="w-full mt-2 sm:w-auto sm:mt-0">
                        <Brain className="mr-2 h-4 w-4" />Plan Task with AI
                    </Button>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="gantt" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4 sm:w-auto sm:inline-grid">
                            <TabsTrigger value="gantt"><GanttChartSquare className="mr-2 h-4 w-4"/>Gantt</TabsTrigger>
                            <TabsTrigger value="board"><ListChecks className="mr-2 h-4 w-4"/>Board</TabsTrigger>
                        </TabsList>
                        <TabsContent value="gantt" className="mt-4">
                            {tasks.length > 0 ? (
                                <ProjectGanttChartView
                                    tasks={tasks}
                                    onUpdateTask={handleUpdateTask}
                                    onTasksReorder={handleGanttTaskReorder}
                                />
                            ) : (
                                <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
                                    <GanttChartSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                                    <p className="text-lg font-medium text-muted-foreground">No tasks found for this project.</p>
                                    <p className="text-sm text-muted-foreground/80 mt-1 mb-4">Plan a task with AI to get started!</p>
                                    <Button onClick={() => setIsAITaskPlannerDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                                        <Brain className="mr-2 h-4 w-4" />Plan First Task with AI
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="board" className="mt-4">
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
                                    {tasks.filter(task => task.status === status).sort((a, b) => {
                                        const aIndex = tasks.findIndex(t => t.id === a.id);
                                        const bIndex = tasks.findIndex(t => t.id === b.id);
                                        return aIndex - bIndex;
                                    }).map(task => {
                                        const isParentTask = tasks.some(t => t.parentId === task.id && !t.isMilestone);
                                        return (
                                        <KanbanTaskCard
                                            key={task.id}
                                            task={task}
                                            isDragging={false} 
                                            isDragTarget={reorderTargetTaskId === task.id}
                                            taskStatusColors={taskStatusColors}
                                            onDragStart={(e) => handleTaskCardDragStart(e, task)}
                                            onDragOverCard={(e) => handleTaskCardDragOver(e, task)}
                                            onDragLeaveCard={handleTaskCardDragLeave}
                                            onDropOnCard={(e) => handleTaskCardDrop(e, task)}
                                            onViewTask={(taskToView) => handleOpenEditTaskDialog(taskToView, true)}
                                            onEditTask={(taskToEdit) => handleOpenEditTaskDialog(taskToEdit, false)}
                                            onDeleteTask={handleOpenDeleteTaskDialog}
                                            onChatTask={handleOpenChatDialog}
                                            isParentTask={isParentTask}
                                        />
                                    )})}
                                    {tasks.filter(task => task.status === status).length === 0 && (
                                        <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                                          <ListChecks className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                                          <p className="text-xs text-muted-foreground">No tasks in this stage.</p>
                                        </div>
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
                                <Button onClick={() => setIsAITaskPlannerDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                                    <Brain className="mr-2 h-4 w-4" />Plan First Task with AI
                                </Button>
                            </div>
                        )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="projectAssets" className="mt-8 sm:mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Project Assets</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                        Manage project requirements and repository files.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="requirements" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4 sm:w-auto sm:inline-grid">
                           <TabsTrigger value="requirements"><ClipboardList className="mr-2 h-4 w-4"/>Requirements</TabsTrigger>
                           <TabsTrigger value="repository"><FolderClosed className="mr-2 h-4 w-4"/>Repository</TabsTrigger>
                        </TabsList>

                        <TabsContent value="requirements" className="mt-4">
                          <Card>
                            <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                              <div>
                                <CardTitle className="text-xl">Requirements</CardTitle>
                                <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                                  Define, track, and manage project requirements.
                                </CardDescription>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => {setIsAddRequirementDialogOpen(true);}} className="w-full mt-2 sm:w-auto sm:mt-0">
                                <FilePlus2 className="mr-2 h-4 w-4" /> Add New Requirement
                              </Button>
                            </CardHeader>
                            <CardContent>
                              {projectRequirements.length > 0 ? (
                                <Table>
                                  <ShadCnTableHeader>
                                    <TableRow>
                                      <TableHead className="w-[100px]">ID</TableHead>
                                      <TableHead>Title</TableHead>
                                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                                      <TableHead className="hidden md:table-cell">Priority</TableHead>
                                      <TableHead className="hidden lg:table-cell">Version</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </ShadCnTableHeader>
                                  <TableBody>
                                    {projectRequirements.map((req) => (
                                      <TableRow key={req.id}>
                                        <TableCell className="font-mono text-xs">{req.id.slice(0, 8)}...</TableCell>
                                        <TableCell className="font-medium">{req.title}</TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                          <Badge variant="outline" className={cn("capitalize", requirementStatusColors[req.status])}>
                                            {req.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className={cn("hidden md:table-cell", requirementPriorityColors[req.priority])}>
                                          {req.priority}
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">{req.version}</TableCell>
                                        <TableCell className="text-right">
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingRequirement(req); setIsEditRequirementDialogOpen(true); }}>
                                            <Edit2 className="h-4 w-4" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setRequirementToDelete(req); setIsDeleteRequirementDialogOpen(true); }}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
                                  <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                                  <p className="text-lg font-medium text-muted-foreground">No requirements defined for this project yet.</p>
                                  <p className="text-sm text-muted-foreground/80 mt-1 mb-4">Click "Add New Requirement" to get started.</p>
                                   <Button onClick={() => {setIsAddRequirementDialogOpen(true);}} className="w-full max-w-xs sm:w-auto">
                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add First Requirement
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                             <CardFooter className="border-t pt-4">
                                <Button variant="outline" size="sm" disabled>View Traceability Matrix (Coming Soon)</Button>
                            </CardFooter>
                          </Card>
                        </TabsContent>

                        <TabsContent value="repository" className="mt-4">
                          <Card>
                            <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                              <div>
                                <CardTitle className="text-xl">Repository</CardTitle>
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
                                  <FolderClosed className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                                  <p className="text-lg font-medium text-muted-foreground">
                                    {currentFilePath === '/' ? 'No files or folders in this project repository yet.' : `Folder "${currentFilePath.slice(0,-1).split('/').pop()}" is empty.`}
                                  </p>
                                  <p className="text-sm text-muted-foreground/80 mt-1 mb-4">
                                    {currentFilePath === '/' ? 'Upload files or create folders to get started.' : 'You can upload files or create new folders here.'}
                                  </p>
                                   <Button onClick={handleOpenNewFolderDialog} className="w-full max-w-xs sm:w-auto">
                                     <FolderPlus className="mr-2 h-4 w-4" /> Create Folder
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="aiAutomation" className="mt-8 sm:mt-4">
          <Card>
            <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <CardTitle>AI &amp; Automation Hub</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                    Manage project-specific AI agents, design automated workflows, and get AI-powered configuration suggestions.
                </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="projectAgents" className="w-full">
                <TabsList className="grid w-full grid-cols-1 gap-1 sm:grid-cols-3 mb-4 xl:w-auto xl:inline-grid">
                  <TabsTrigger value="projectAgents"><SlidersHorizontal className="mr-2 h-4 w-4"/>Project Agents</TabsTrigger>
                  <TabsTrigger value="projectWorkflows"><WorkflowIcon className="mr-2 h-4 w-4"/>Workflows &amp; Design</TabsTrigger>
                  <TabsTrigger value="aiSuggestions"><Lightbulb className="mr-2 h-4 w-4" />AI Suggestions</TabsTrigger>
                </TabsList>

                <TabsContent value="projectAgents" className="mt-4">
                    <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4 px-0">
                        <div>
                        <PageHeaderHeading className="text-xl">Project Agent Management</PageHeaderHeading>
                        <PageHeaderDescription className="text-xs sm:text-sm">Manage agent configurations specific to project "{project?.name}".</PageHeaderDescription>
                        </div>
                        <AddAgentDialog onAddAgent={handleAddProjectAgent} projectId={projectId} />
                    </PageHeader>
                    {projectAgents.length > 0 ? (
                      <AgentManagementTable
                          agents={projectAgents}
                          onEditAgent={handleOpenEditProjectAgentDialog}
                          onRunAgent={handleRunProjectAgent}
                          onStopAgent={handleStopProjectAgent}
                          onDuplicateAgent={handleDuplicateProjectAgent}
                          onDeleteAgent={handleOpenDeleteAgentDialog}
                      />
                    ) : (
                        <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
                          <SlidersHorizontal className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                          <p className="text-lg font-medium text-muted-foreground">No agents configured for this project yet.</p>
                          <p className="text-sm text-muted-foreground/80 mt-1 mb-4">Add an agent to get started with automation!</p>
                           <Button 
                             onClick={() => {
                                const addAgentButton = document.querySelector('button:has(svg.lucide-plus-circle)');
                                if (addAgentButton instanceof HTMLElement) {
                                  addAgentButton.click();
                                } else {
                                   const dialogTriggerButtons = Array.from(document.querySelectorAll('button'));
                                   const targetButton = dialogTriggerButtons.find(btn => {
                                     const childSvg = btn.querySelector('svg');
                                     return childSvg && childSvg.classList.contains('lucide-plus-circle');
                                   });
                                   if (targetButton) {
                                     targetButton.click();
                                   } else {
                                     setTimeout(() => toast({title: "Hint", description: "Click 'Add New Agent' in this tab to create your first agent."}),0);
                                   }
                                }
                             }}
                             className="w-full max-w-xs sm:w-auto">
                               <PlusSquareIcon className="mr-2 h-4 w-4"/> Add First Agent
                           </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="projectWorkflows" className="mt-4">
                  {!designingWorkflow ? (
                    <>
                      <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4 px-0">
                          <div>
                              <PageHeaderHeading className="text-xl">Project Workflow Management</PageHeaderHeading>
                              <PageHeaderDescription className="text-xs sm:text-sm">Define workflows for project "{project?.name}". Select a workflow's "Design" button to open its design canvas.</PageHeaderDescription>
                          </div>
                           <Button onClick={() => setIsAddWorkflowDialogOpen(true)}  className="w-full mt-4 sm:w-auto sm:mt-0">
                              <PlusSquareIcon className="mr-2 h-4 w-4"/>Add New Project Workflow
                          </Button>
                      </PageHeader>
                      <Card className="border-0 shadow-none">
                          <CardHeader className="p-0 pb-4">
                              <CardTitle className="text-lg">Existing Workflows for "{project?.name}" ({projectWorkflows.length})</CardTitle>
                              <CardDescription className="text-xs sm:text-sm text-muted-foreground">Manage and design the sequence of agent operations for this project. Click "Design" to open the workflow designer.</CardDescription>
                          </CardHeader>
                          <CardContent className="p-0">
                              {projectWorkflows.length > 0 ? (
                                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                                      {projectWorkflows.map(workflow => (
                                        <ProjectWorkflowCard
                                          key={workflow.id}
                                          workflow={workflow}
                                          workflowStatusColors={workflowStatusColors}
                                          formatDate={formatDate}
                                          onDesignWorkflow={handleOpenWorkflowDesigner}
                                          onToggleWorkflowStatus={(wf) => {
                                            setProjectWorkflows(prev => {
                                               const updatedWfs = prev.map(pWf =>
                                                    pWf.id === wf.id
                                                    ? {...pWf, status: pWf.status === 'Active' ? 'Inactive' : (pWf.status === 'Draft' ? 'Active' : 'Active'), lastRun: new Date().toISOString()}
                                                    : pWf
                                                );
                                                const activatedWorkflow = updatedWfs.find(uwf => uwf.id === wf.id);
                                                if(activatedWorkflow && activatedWorkflow.status === 'Active') {
                                                   setTasks(currentTasks => {
                                                        let tasksChanged = false;
                                                        const newTasks = currentTasks.map(t => {
                                                            if (t.assignedTo === wf.name && t.status === 'To Do' && !t.isMilestone) {
                                                                tasksChanged = true;
                                                                return {...t, status: 'In Progress', progress: (t.progress === 0 || t.progress === undefined) ? 10 : t.progress };
                                                            }
                                                            return t;
                                                        });
                                                        if (tasksChanged) {
                                                          setTimeout(() => toast({title: "Tasks Activated", description: `Tasks assigned to workflow "${wf.name}" are now In Progress.`}),0);
                                                        }
                                                        return tasksChanged ? newTasks : currentTasks;
                                                   });
                                                }
                                                return updatedWfs;
                                            });
                                            setTimeout(() => toast({title: `Workflow "${wf.name}" ${workflow.status === 'Active' ? 'Deactivated' : 'Activated'}.`}),0);
                                          }}
                                          onDeleteWorkflow={handleOpenDeleteWorkflowDialog}
                                        />
                                      ))}
                                  </div>
                              ) : (
                                  <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
                                      <WorkflowIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                                      <p className="text-lg font-medium text-muted-foreground">No workflows found for this project.</p>
                                      <p className="text-sm text-muted-foreground/80 mt-1 mb-4">Add a workflow definition to get started!</p>
                                      <Button onClick={() => setIsAddWorkflowDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                                          <PlusSquareIcon className="mr-2 h-4 w-4"/>Add First Workflow Definition
                                      </Button>
                                  </div>
                              )}
                          </CardContent>
                      </Card>
                    </>
                  ) : (
                    <div className="h-full flex flex-col mt-4 p-1 border rounded-lg shadow-sm">
                      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4 pb-2 border-b p-3">
                          <div>
                            <PageHeaderHeading className="text-xl flex items-center"><WorkflowIcon className="mr-2 h-5 w-5 text-primary"/>Designing: {designingWorkflow.name}</PageHeaderHeading>
                            <PageHeaderDescription className="text-xs sm:text-sm mt-1">{designingWorkflow.description}</PageHeaderDescription>
                          </div>
                          <Button variant="outline" onClick={handleCloseWorkflowDesigner} className="w-full mt-2 sm:w-auto sm:mt-0"><XSquare className="mr-2 h-4 w-4"/>Close Designer</Button>
                      </div>
                      <div className="flex flex-col md:flex-row flex-grow gap-4 p-3 md:p-1 min-h-[calc(100vh-400px)] sm:min-h-[500px]">
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

                <TabsContent value="aiSuggestions" className="mt-4">
                    <PageHeader className="items-start justify-between sm:flex-row sm:items-center pt-0 pb-4 px-0">
                        <div>
                            <PageHeaderHeading className="text-xl">AI Agent Configuration Suggestions</PageHeaderHeading>
                            <PageHeaderDescription className="text-xs sm:text-sm">Get AI-powered suggestions for agent configurations tailored to project "{project?.name}".</PageHeaderDescription>
                        </div>
                    </PageHeader>
                    <div className="max-w-full">
                        <AgentConfigForm projectId={projectId} />
                    </div>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isAITaskPlannerDialogOpen && project && (
        <AITaskPlannerDialog
          open={isAITaskPlannerDialogOpen}
          onOpenChange={setIsAITaskPlannerDialogOpen}
          projectId={projectId}
          projectWorkflows={(projectWorkflows || []).map(wf => ({
            id: wf.id,
            name: wf.name,
            description: wf.description,
            nodes: (wf.nodes || []).map(n => ({id: n.id, name: n.name, type: n.type}))
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

      {isAddWorkflowDialogOpen && (
        <AddWorkflowDialog open={isAddWorkflowDialogOpen} onOpenChange={setIsAddWorkflowDialogOpen} onAddWorkflow={handleAddProjectWorkflow} />
      )}


      {editingProjectAgent && (
        <EditAgentDialogAgent
          agent={editingProjectAgent}
          open={isEditAgentDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditAgentDialogOpen(isOpen);
            if(!isOpen) setEditingProjectAgent(null);
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
                "{taskToDelete.title}"{taskToDelete.isMilestone ? '' : ' and its sub-tasks'} from project "{project?.name}".
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
              <AlertDialogAction onClick={confirmDeleteWorkflow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {chattingTask && project && (
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
      {isAddRequirementDialogOpen && (
        <AlertDialog open={isAddRequirementDialogOpen} onOpenChange={setIsAddRequirementDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Add New Requirement (Placeholder)</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogDescription>This functionality is not yet implemented.</AlertDialogDescription>
            <AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {isEditRequirementDialogOpen && editingRequirement && (
         <AlertDialog open={isEditRequirementDialogOpen} onOpenChange={setIsEditRequirementDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Edit Requirement: {editingRequirement.title} (Placeholder)</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogDescription>This functionality is not yet implemented.</AlertDialogDescription>
            <AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
       {isDeleteRequirementDialogOpen && requirementToDelete && (
         <AlertDialog open={isDeleteRequirementDialogOpen} onOpenChange={setIsDeleteRequirementDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Requirement: {requirementToDelete.title} (Placeholder)</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogDescription>Are you sure? This action is a placeholder and not yet implemented.</AlertDialogDescription>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
// End of file
