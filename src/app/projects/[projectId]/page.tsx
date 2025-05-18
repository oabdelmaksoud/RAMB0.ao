
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, Eye, SlidersHorizontal, Lightbulb, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, X as XIcon, Diamond, Users, FolderGit2, MessageSquare, Settings, Brain, PlusSquare, Edit2, Files, FolderClosed, Folder as FolderIcon, File as FileIcon, UploadCloud, FolderPlus, ArrowLeftCircle, InfoIcon, ClipboardList, ChevronDown, ChevronRight, Play, Paperclip, Ticket as TicketIcon, ExternalLink, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, useRef, useMemo, Fragment } from 'react';
import type { Project, Task, Agent, ProjectWorkflow, WorkflowNode, WorkflowEdge, ProjectFile, Requirement, RequirementStatus, RequirementPriority, Ticket, TicketStatus, TicketPriority, TicketType, TaskStatus } from '@/types';
import { initialMockProjects, PROJECTS_STORAGE_KEY, getTasksStorageKey, getAgentsStorageKey, getWorkflowsStorageKey, getFilesStorageKey, getRequirementsStorageKey, getTicketsStorageKey } from '@/app/projects/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO, addDays, differenceInCalendarDays, startOfDay, isValid } from 'date-fns';
import { cn, uid } from '@/lib/utils';
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
import {
  Dialog,
  DialogContent as ShadCnDialogContent,
  DialogHeader as ShadCnDialogHeader,
  DialogTitle as ShadCnDialogTitle,
  DialogDescription as ShadCnDialogDescription,
  DialogFooter as ShadCnDialogFooter,
} from "@/components/ui/dialog";
import KanbanTaskCard from '@/components/features/tasks/KanbanTaskCard';
import ProjectWorkflowCard from '@/components/features/projects/ProjectWorkflowCard';
import AgentManagementTable from '@/components/features/agent-management/AgentManagementTable';
import AddAgentDialog from '@/components/features/agent-management/AddAgentDialog';
import EditAgentDialogAgent from '@/components/features/agent-management/EditAgentDialog'; // Renamed to avoid conflict
import WorkflowPalette from '@/components/features/workflow-designer/WorkflowPalette';
import WorkflowCanvas from '@/components/features/workflow-designer/WorkflowCanvasPlaceholder';
import AgentConfigForm from '@/components/features/ai-suggestions/AgentConfigForm';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ProjectGanttChartView from '@/components/features/projects/ProjectGanttChartView';
import TaskChatDialog from '@/components/features/tasks/TaskChatDialog';
import AITaskPlannerDialog from '@/components/features/projects/AITaskPlannerDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadCnTableHeader, TableRow } from "@/components/ui/table";
import AddWorkflowDialog from '@/components/features/projects/AddWorkflowDialog';
import AddTicketDialog from '@/components/features/tickets/AddTicketDialog';
import EditTicketDialog from '@/components/features/tickets/EditTicketDialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanProjectTaskOutput } from '@/ai/flows/plan-project-task-flow';


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

const ticketStatusColors: { [key in TicketStatus]: string } = {
  'Open': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  'Resolved': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'Closed': 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

const ticketPriorityColors: { [key in TicketPriority]: string } = {
  'High': 'text-red-600 dark:text-red-400',
  'Medium': 'text-yellow-600 dark:text-yellow-400',
  'Low': 'text-green-600 dark:text-green-400',
};

const ticketTypeColors: { [key in TicketType]: string } = {
  'Bug': 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300',
  'Feature Request': 'bg-purple-100 text-purple-700 dark:bg-purple-700/30 dark:text-purple-300 border-purple-300',
  'Support Request': 'bg-sky-100 text-sky-700 dark:bg-sky-700/30 dark:text-sky-300 border-sky-300',
  'Change Request': 'bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300',
};
const allTicketTypes: (TicketType | 'All')[] = ['All', 'Bug', 'Feature Request', 'Support Request', 'Change Request'];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAITaskPlannerDialogOpen, setIsAITaskPlannerDialogOpen] = useState(false);
  const [aiPlannerPrefillGoal, setAiPlannerPrefillGoal] = useState<string | undefined>(undefined);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isViewingTask, setIsViewingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);
  const [draggingOverStatus, setDraggingOverStatus] = useState<Task['status'] | null>(null);
  const [reorderTargetTaskId, setReorderTargetTaskId] = useState<string | null>(null);

  const [projectAgents, setProjectAgents] = useState<Agent[]>([]);
  const [isAddAgentDialogOpen, setIsAddAgentDialogOpen] = useState(false);
  const [isEditAgentDialogOpen, setIsEditAgentDialogOpen] = useState(false);
  const [editingProjectAgent, setEditingProjectAgent] = useState<Agent | null>(null);
  const [isDeleteAgentDialogOpen, setIsDeleteAgentDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const [projectWorkflows, setProjectWorkflows] = useState<ProjectWorkflow[]>([]);
  const [isAddWorkflowDialogOpen, setIsAddWorkflowDialogOpen] = useState(false);
  const [designingWorkflow, setDesigningWorkflow] = useState<ProjectWorkflow | null>(null);
  const designingWorkflowIdRef = useRef<string | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<ProjectWorkflow | null>(null);
  const [isDeleteWorkflowDialogOpen, setIsDeleteWorkflowDialogOpen] = useState(false);

  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [chattingTask, setChattingTask] = useState<Task | null>(null);

  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string>('/');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFile, setEditingFile] = useState<ProjectFile | null>(null);
  const [editingFileContent, setEditingFileContent] = useState<string>("");
  const [isEditFileDialogOpen, setIsEditFileDialogOpen] = useState(false);

  const [projectRequirements, setProjectRequirements] = useState<Requirement[]>([]);
  const [isAddRequirementDialogOpen, setIsAddRequirementDialogOpen] = useState(false);
  const [isViewTraceabilityMatrixDialogOpen, setIsViewTraceabilityMatrixDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [isEditRequirementDialogOpen, setIsEditRequirementDialogOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState<Requirement | null>(null);
  const [isDeleteRequirementDialogOpen, setIsDeleteRequirementDialogOpen] = useState(false);

  const [projectTickets, setProjectTickets] = useState<Ticket[]>([]);
  const [isAddTicketDialogOpen, setIsAddTicketDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isEditTicketDialogOpen, setIsEditTicketDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [isDeleteTicketDialogOpen, setIsDeleteTicketDialogOpen] = useState(false);
  const [selectedTicketTypeFilter, setSelectedTicketTypeFilter] = useState<TicketType | 'All'>('All');


  useEffect(() => {
    setIsClient(true);
  }, []);

  const initialProjectScopedMockAgents = useCallback((currentProjectId: string): Agent[] => {
    if (!currentProjectId) return [];
    const idPrefix = `proj-${currentProjectId.slice(-4)}-aspice`;
    return [
      { id: uid(`${idPrefix}-req-analysis`), name: 'ASPICE Requirements Elicitation & Analysis Agent', type: 'Analysis Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SYS.1, SYS.2, SWE.1", methods: ["interviews", "workshops"], outputs: ["SRS", "SystemRequirementsSpec"], keywords: ["requirement", "stakeholder", "user story", "elicit", "analyze", "specification"] } },
      { id: uid(`${idPrefix}-sys-arch`), name: 'ASPICE System Architectural Design Agent', type: 'Design Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SYS.3", inputs: ["SystemRequirementsSpecification"], outputs: ["SystemArchitectureDesignDocument"], modeling: "SysML", keywords: ["system architecture", "high-level design", "components", "interfaces"] } },
      { id: uid(`${idPrefix}-sw-arch`), name: 'ASPICE Software Architectural Design Agent', type: 'Design Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SWE.2", inputs: ["SoftwareRequirementsSpecification"], outputs: ["SoftwareArchitectureDesignDocument"], patterns: ["microservices", "layered"], keywords: ["software architecture", "module design", "api design", "patterns"] } },
      { id: uid(`${idPrefix}-sw-detail`), name: 'ASPICE Software Detailed Design & Implementation Agent', type: 'Development Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SWE.3, SWE.4 (Unit Const.)", inputs: ["SoftwareArchitectureDesignDocument"], outputs: ["SourceCode", "UnitTests"], languages: ["TypeScript", "Python"], keywords: ["coding", "implementation", "detailed design", "unit construction"] } },
      { id: uid(`${idPrefix}-unit-verif`), name: 'ASPICE Software Unit Verification Agent', type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SWE.4 (Unit Verif.)", inputs: ["SourceCode", "UnitTests"], testFrameworks: ["Jest", "Pytest"], coverageGoal: "90%", keywords: ["unit testing", "verification", "test cases"] } },
      { id: uid(`${idPrefix}-sw-int-test`), name: 'ASPICE Software Integration Testing Agent', type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SWE.5", inputs: ["IntegratedSoftware", "SoftwareArchitectureDesignDocument"], outputs: ["IntegrationTestReport"], strategy: "Bottom-up", keywords: ["integration testing", "interface testing", "component interaction"] } },
      { id: uid(`${idPrefix}-sw-qual-test`), name: 'ASPICE Software Qualification Testing Agent', type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SWE.6", inputs: ["SoftwareProduct", "SoftwareRequirementsSpecification"], outputs: ["QualificationTestReport"], methods: ["BlackBox", "AlphaTesting"], keywords: ["qualification testing", "acceptance testing", "system validation"] } },
      { id: uid(`${idPrefix}-sys-int-test`), name: 'ASPICE System Integration Testing Agent', type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SYS.4", inputs: ["IntegratedSystemComponents", "SystemArchitectureDesignDocument"], outputs: ["SystemIntegrationTestReport"], keywords: ["system integration testing", "end-to-end testing"] } },
      { id: uid(`${idPrefix}-sys-qual-test`), name: 'ASPICE System Qualification Testing Agent', type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SYS.5", inputs: ["SystemProduct", "SystemRequirementsSpecification"], outputs: ["SystemQualificationTestReport"], validationMethods: ["UserScenarios", "PerformanceTesting"], keywords: ["system qualification", "user acceptance", "final validation"] } },
      { id: uid(`${idPrefix}-pm`), name: 'ASPICE Project Management Support Agent', type: 'Reporting Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "MAN.3, MAN.5", tasks: ["ProgressTracking", "RiskMonitoring", "StatusReporting"], tools: ["Jira_Interface", "Gantt_Generator"], keywords: ["project management", "reporting", "tracking", "risk"] } },
      { id: uid(`${idPrefix}-qa`), name: 'ASPICE Quality Assurance Support Agent', type: 'Custom Logic Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SUP.1, SUP.4", tasks: ["ProcessAudits", "MetricCollection", "ComplianceChecks", "ProblemResolutionTracking"], standards: ["ASPICE", "ISO26262"], keywords: ["quality assurance", "audit", "compliance", "process improvement"] } },
      { id: uid(`${idPrefix}-cm`), name: 'ASPICE Configuration Management Support Agent', type: 'CI/CD Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SUP.8, SUP.9, SUP.10", tools: ["Git", "BaselineManagement"], tasks: ["BaselineCreation", "ChangeRequestProcessing", "VersionControlManagement"], keywords: ["configuration management", "version control", "baselining", "change management"] } },
      { id: uid(`${idPrefix}-doc`), name: 'ASPICE Technical Documentation Agent', type: 'Documentation Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focus: "SUP.9", documentTypes: ["RequirementsSpec", "ArchitectureDoc", "DesignDoc", "TestPlan", "TestReport", "UserManual"], outputFormats: ["PDF", "Markdown", "HTML"], standardCompliance: "ASPICE", keywords: ["documentation", "manuals", "specifications", "reports"] } },
    ];
  }, []);

  const initialMockTasksForProject = useCallback((currentProjectId: string, currentProjectName: string | undefined): Task[] => {
    if (!currentProjectId || !currentProjectName) return [];
    const todayFormatted = startOfDay(new Date());

    const kickoffMilestoneId = uid(`milestone-kickoff-${currentProjectId.slice(-5)}`);
    const reqTaskId = uid(`task-req-${currentProjectId.slice(-5)}`);
    const designTaskId = uid(`task-design-${currentProjectId.slice(-5)}`);
    const devTaskId = uid(`task-dev-${currentProjectId.slice(-5)}`);
    const subTaskApiId = uid(`subtask-api-${devTaskId.slice(-5)}`);
    const testTaskId = uid(`task-test-${currentProjectId.slice(-5)}`);
    const alphaMilestoneId = uid(`milestone-alpha-${currentProjectId.slice(-5)}`);

    return [
      { id: kickoffMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Project Kick-off`, status: 'Done', assignedTo: 'ASPICE Project Management Support Agent', startDate: format(addDays(todayFormatted, -15), 'yyyy-MM-dd'), durationDays: 0, progress: 100, isMilestone: true, parentId: null, dependencies: [], description: "Official project kick-off milestone achieved. (Corresponds to MAN.3)" },
      { id: reqTaskId, projectId: currentProjectId, title: `Define ${currentProjectName} Scope & Requirements`, status: 'Done', assignedTo: 'Requirements Engineering Process', startDate: format(addDays(todayFormatted, -14), 'yyyy-MM-dd'), durationDays: 5, progress: 100, isMilestone: false, parentId: null, dependencies: [kickoffMilestoneId], description: "Initial scoping and requirements gathering for the project. (ASPICE SYS.1, SYS.2, SWE.1)" },
      { id: designTaskId, projectId: currentProjectId, title: `Design ${currentProjectName} Architecture`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(todayFormatted, -9), 'yyyy-MM-dd'), durationDays: 7, progress: 60, isMilestone: false, parentId: null, dependencies: [reqTaskId], description: "High-level and detailed design of the software architecture. (ASPICE SWE.2, SWE.3)" },
      { id: devTaskId, projectId: currentProjectId, title: `Implement Core Logic for ${currentProjectName}`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(todayFormatted, -2), 'yyyy-MM-dd'), durationDays: 10, progress: 40, parentId: designTaskId, dependencies: [], isMilestone: false, description: "Core development phase, implementing key functionalities. (ASPICE SWE.4)" },
      { id: subTaskApiId, projectId: currentProjectId, parentId: devTaskId, title: `Implement API Endpoints`, status: 'To Do', assignedTo: 'ASPICE Software Detailed Design & Implementation Agent', startDate: format(addDays(todayFormatted, 0), 'yyyy-MM-dd'), durationDays: 3, progress: 0, isMilestone: false, dependencies: [], description: "Develop and unit test the necessary API endpoints for the core logic." },
      { id: testTaskId, projectId: currentProjectId, title: `Test ${currentProjectName} Integration & Qualification`, status: 'To Do', assignedTo: 'Software Testing & QA Cycle', startDate: format(addDays(todayFormatted, 8), 'yyyy-MM-dd'), durationDays: 5, progress: 0, parentId: null, dependencies: [devTaskId], isMilestone: false, description: "Perform integration testing of developed components and system-level qualification tests. (ASPICE SWE.5, SWE.6)" },
      { id: alphaMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Alpha Release Milestone`, status: 'To Do', assignedTo: 'ASPICE Project Management Support Agent', startDate: format(addDays(todayFormatted, 13), 'yyyy-MM-dd'), durationDays: 0, progress: 0, isMilestone: true, parentId: null, dependencies: [testTaskId], description: "Target date for the Alpha release of the project." },
    ];
  }, []);

  const initialMockFilesData = useCallback((currentProjectId: string, currentProjectName: string | undefined): ProjectFile[] => {
    if (!currentProjectId || !currentProjectName) return [];
    return [
      { id: uid(`file-proj-${currentProjectId.slice(-4)}-doc`), name: 'Project_Charter.docx', type: 'file', path: '/', size: '1.2MB', lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), content: "This is the project charter document for " + (currentProjectName) + "." },
      {
        id: uid(`folder-proj-${currentProjectId.slice(-4)}-req`), name: 'Requirements', type: 'folder', path: '/', children: [
          { id: uid(`file-proj-${currentProjectId.slice(-4)}-srs`), name: 'SRS_v1.0.docx', type: 'file', path: '/Requirements/', size: '850KB', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), content: "System Requirements Specification v1.0 for " + (currentProjectName) + "." },
        ]
      },
      {
        id: uid(`folder-proj-${currentProjectId.slice(-4)}-design`), name: 'Design', type: 'folder', path: '/', children: [
          { id: uid(`file-proj-${currentProjectId.slice(-4)}-sad`), name: 'SAD_v1.0.pdf', type: 'file', path: '/Design/', size: '2.5MB', lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), content: "Software Architecture Document v1.0 - PDF Content Placeholder for " + (currentProjectName) + "." },
          {
            id: uid(`folder-proj-${currentProjectId.slice(-4)}-sdd`), name: 'SDD', type: 'folder', path: '/Design/', children: [
              { id: uid(`file-proj-${currentProjectId.slice(-4)}-sdd-compA`), name: 'ComponentA_Design.docx', type: 'file', path: '/Design/SDD/', size: '400KB', lastModified: new Date().toISOString(), content: "Detailed design for Component A of " + (currentProjectName) + "." },
            ]
          },
        ]
      },
      { id: uid(`folder-proj-${currentProjectId.slice(-4)}-src`), name: 'SourceCode', type: 'folder', path: '/', children: [] },
      {
        id: uid(`folder-proj-${currentProjectId.slice(-4)}-test`), name: 'Test', type: 'folder', path: '/', children: [
          { id: uid(`file-proj-${currentProjectId.slice(-4)}-testplan`), name: 'MasterTestPlan.docx', type: 'file', path: '/Test/', size: '300KB', lastModified: new Date().toISOString(), content: "Master Test Plan document for " + (currentProjectName) + "." },
        ]
      },
      { id: uid(`file-proj-${currentProjectId.slice(-4)}-notes`), name: 'MeetingNotes_ProjectKickoff.txt', type: 'file', path: '/', size: '5KB', lastModified: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), content: "Notes from the project kickoff meeting for " + (currentProjectName) + "." },
    ];
  }, []);

  const predefinedWorkflowsData = useCallback((currentProjectId: string): ProjectWorkflow[] => {
    if (!currentProjectId) return [];
    const createWorkflow = (
      name: string,
      description: string,
      nodeDetails: Array<{ name: string; type: string; config?: any, x?: number, y?: number }>,
      edgeConnections?: Array<{ sourceIndex: number; targetIndex: number }>
    ): ProjectWorkflow => {
      const wfId = uid(`pd-wf-${currentProjectId.slice(-3)}-${name.toLowerCase().replace(/\s+/g, '-').substring(0, 10)}`);
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
        "ASPICE V-Model Project Lifecycle",
        "A comprehensive workflow template representing the ASPICE V-Model for a typical software project, covering system and software levels.",
        [
          { name: 'SYS.1: Stakeholder Requirements Elicitation', type: 'Analysis Agent', config: { focus: "SYS.1" }, x: 50, y: 50 },
          { name: 'SYS.2: System Requirements Analysis', type: 'Analysis Agent', config: { focus: "SYS.2" }, x: 50, y: 150 },
          { name: 'SYS.3: System Architectural Design', type: 'Design Agent', config: { focus: "SYS.3" }, x: 50, y: 250 },
          { name: 'SWE.1: Software Requirements Analysis', type: 'Analysis Agent', config: { focus: "SWE.1" }, x: 250, y: 350 },
          { name: 'SWE.2: Software Architectural Design', type: 'Design Agent', config: { focus: "SWE.2" }, x: 250, y: 450 },
          { name: 'SWE.3: Software Detailed Design & Implementation', type: 'Development Agent', config: { focus: "SWE.3" }, x: 250, y: 550 },
          { name: 'SWE.4: Software Unit Verification', type: 'Testing Agent', config: { focus: "SWE.4" }, x: 450, y: 650 },
          { name: 'SWE.5: Software Integration & Testing', type: 'Testing Agent', config: { focus: "SWE.5" }, x: 650, y: 550 },
          { name: 'SWE.6: Software Qualification Testing', type: 'Testing Agent', config: { focus: "SWE.6" }, x: 650, y: 450 },
          { name: 'SYS.4: System Integration & Testing', type: 'Testing Agent', config: { focus: "SYS.4" }, x: 850, y: 250 },
          { name: 'SYS.5: System Qualification Testing', type: 'Testing Agent', config: { focus: "SYS.5" }, x: 850, y: 150 },
          { name: 'MAN.3: Project Management', type: 'Reporting Agent', config: { focus: "MAN.3" }, x: 450, y: 20 },
          { name: 'SUP.1: Quality Assurance', type: 'Custom Logic Agent', config: { focus: "SUP.1" }, x: 450, y: 750 },
          { name: 'SUP.8: Configuration Management', type: 'CI/CD Agent', config: { focus: "SUP.8" }, x: 50, y: 650 },
          { name: 'SUP.9: Documentation Management', type: 'Documentation Agent', config: { focus: "SUP.9"}, x: 850, y: 650 }
        ],
        [
          { sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 2 }, { sourceIndex: 2, targetIndex: 3 },
          { sourceIndex: 3, targetIndex: 4 }, { sourceIndex: 4, targetIndex: 5 }, { sourceIndex: 5, targetIndex: 6 },
          { sourceIndex: 6, targetIndex: 7 }, { sourceIndex: 7, targetIndex: 8 }, { sourceIndex: 8, targetIndex: 9 },
          { sourceIndex: 9, targetIndex: 10 },
          { sourceIndex: 6, targetIndex: 5 },  { sourceIndex: 7, targetIndex: 4 },  { sourceIndex: 8, targetIndex: 3 },
          { sourceIndex: 9, targetIndex: 2 },  { sourceIndex: 10, targetIndex: 1 },
          { sourceIndex: 11, targetIndex: 0 }, { sourceIndex: 11, targetIndex: 10},
          { sourceIndex: 12, targetIndex: 6 }, { sourceIndex: 12, targetIndex: 8 },
          { sourceIndex: 13, targetIndex: 5 }, { sourceIndex: 14, targetIndex: 2 }, { sourceIndex: 14, targetIndex: 4 },
        ]
      ),
      createWorkflow(
        "Requirements Engineering Process",
        "Handles elicitation, analysis, specification, and validation of project requirements. (ASPICE SYS.1, SYS.2, SWE.1)",
        [
          { name: 'Elicit Stakeholder Needs', type: 'Analysis Agent', config: { activity: "SYS.1" }, x: 50, y: 50 },
          { name: 'Analyze System Requirements', type: 'Analysis Agent', config: { activity: "SYS.2" }, x: 300, y: 50 },
          { name: 'Specify Software Requirements', type: 'Analysis Agent', config: { activity: "SWE.1" }, x: 50, y: 170 },
          { name: 'Validate Requirements', type: 'Testing Agent', config: { reviewType: 'peer', against: "StakeholderNeeds" }, x: 300, y: 170 }
        ],
        [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 2 }, { sourceIndex: 2, targetIndex: 3 }]
      ),
      createWorkflow(
        "Software Design & Implementation Cycle",
        "Covers software architectural design, detailed design, coding, and unit testing. (ASPICE SWE.2, SWE.3, SWE.4)",
        [
          { name: 'Define Software Architecture', type: 'Design Agent', config: { activity: "SWE.2", diagramTool: "PlantUML" }, x: 50, y: 50 },
          { name: 'Detailed Software Design', type: 'Development Agent', config: { activity: "SWE.3" }, x: 300, y: 50 },
          { name: 'Implement Software Units', type: 'Development Agent', config: { activity: "SWE.4", language: "TypeScript" }, x: 50, y: 170 },
          { name: 'Verify Software Units', type: 'Testing Agent', config: { activity: "SWE.4", framework: "Jest" }, x: 300, y: 170 }
        ],
        [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 2 }, { sourceIndex: 2, targetIndex: 3 }]
      ),
      createWorkflow(
        "Software Testing & QA Cycle",
        "Manages integration testing, system testing, and quality assurance activities. (ASPICE SWE.5, SWE.6, SUP.1)",
        [
          { name: 'Plan Software Integration Tests', type: 'Testing Agent', config: { activity: "SWE.5 Test Planning" }, x: 50, y: 50 },
          { name: 'Execute Software Integration Tests', type: 'Testing Agent', config: { activity: "SWE.5 Execution" }, x: 300, y: 50 },
          { name: 'Plan Software Qualification Tests', type: 'Testing Agent', config: { activity: "SWE.6 Test Planning" }, x: 50, y: 170 },
          { name: 'Execute Software Qualification Tests', type: 'Testing Agent', config: { activity: "SWE.6 Execution" }, x: 300, y: 170 },
          { name: 'Log Defects & Report (QA)', type: 'Custom Logic Agent', config: { activity: "SUP.1 Quality Assurance" }, x: 175, y: 290 }
        ],
        [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 4 }, { sourceIndex: 2, targetIndex: 3 }, { sourceIndex: 3, targetIndex: 4 }]
      ),
      createWorkflow(
        "Project Monitoring & Reporting",
        "Collects project metrics, monitors progress, and generates status reports. (ASPICE MAN.3, MAN.5)",
        [
          { name: 'Gather Progress Data', type: 'Reporting Agent', config: { activity: "MAN.3 Progress Monitoring" }, x: 50, y: 50 },
          { name: 'Analyze Project Metrics', type: 'Analysis Agent', config: { activity: "MAN.3 Metric Analysis" }, x: 300, y: 50 },
          { name: 'Generate Status Report', type: 'Reporting Agent', config: { activity: "MAN.3 Reporting" }, x: 50, y: 170 },
          { name: 'Identify & Log Risks', type: 'Reporting Agent', config: { activity: "MAN.5 Risk Identification" }, x: 300, y: 170 }
        ],
        [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 2 }, { sourceIndex: 1, targetIndex: 3 }]
      ),
    ];
  }, []);


  const initialMockRequirements = useCallback((currentProjectId: string): Requirement[] => {
    if (!currentProjectId) return [];
    return [
      { id: uid(`req-${currentProjectId.slice(-4)}-001`), projectId: currentProjectId, title: 'User Authentication System', description: 'System must allow users to register, login, and logout securely.', status: 'Approved', priority: 'High', version: '1.0', createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { id: uid(`req-${currentProjectId.slice(-4)}-002`), projectId: currentProjectId, title: 'Project Creation Module', description: 'Users should be able to create new projects with a name and description.', status: 'Implemented', priority: 'High', version: '1.1', createdDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: uid(`req-${currentProjectId.slice(-4)}-003`), projectId: currentProjectId, title: 'Task Management Interface', description: 'Provide UI for creating, viewing, updating, and deleting tasks within a project.', status: 'Under Review', priority: 'Medium', version: '0.9', createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString() },
    ];
  }, []);

  const initialMockTickets = useCallback((currentProjectId: string): Ticket[] => {
    if (!currentProjectId) return [];
    return [
      { id: uid(`ticket-${currentProjectId.slice(-3)}-001`), projectId: currentProjectId, title: 'Login button unresponsive on Safari', description: 'The main login button does not respond to clicks on Safari browsers. Tested on Safari 15.1.', status: 'Open', priority: 'High', type: 'Bug', createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString() },
      { id: uid(`ticket-${currentProjectId.slice(-3)}-002`), projectId: currentProjectId, title: 'Add export to CSV feature for project reports', description: 'Users need the ability to export project summary reports to CSV format for external analysis.', status: 'Open', priority: 'Medium', type: 'Feature Request', createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { id: uid(`ticket-${currentProjectId.slice(-3)}-003`), projectId: currentProjectId, title: 'API rate limit documentation needs update', description: 'The documentation regarding API rate limits is confusing and needs clarification on burst vs sustained rates.', status: 'In Progress', priority: 'Medium', type: 'Change Request', assignee: 'ASPICE Technical Documentation Agent', createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString() },
    ];
  }, []);


  useEffect(() => {
    if (!projectId || !isClient) return;
    console.log(`PROJECT_DETAIL_PAGE: Loading all data for project ID: ${projectId}`);

    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    let currentProjectData: Project | undefined;

    if (allProjectsStored) {
      try {
        const allProjects = JSON.parse(allProjectsStored);
        currentProjectData = allProjects.find((p: Project) => p.id === projectId);
      } catch (e) { console.error("PROJECT_DETAIL_PAGE: Error parsing all projects from localStorage:", e); }
    }

    if (!currentProjectData) {
      const projFromInitial = initialMockProjects.find(p => p.id === projectId);
      if (projFromInitial) {
        currentProjectData = projFromInitial;
      } else {
        console.error(`PROJECT_DETAIL_PAGE: Project ${projectId} not found. Redirecting.`);
        if (isClient) router.push('/');
        return;
      }
    }
    setProject(currentProjectData);
    console.log("PROJECT_DETAIL_PAGE: Set currentProject:", currentProjectData);

    const tasksKey = getTasksStorageKey(projectId);
    const storedTasks = localStorage.getItem(tasksKey);
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        setTasks(Array.isArray(parsedTasks) ? parsedTasks : initialMockTasksForProject(projectId, currentProjectData.name));
      } catch (e) {
        console.error(`PROJECT_DETAIL_PAGE: Error parsing tasks for project ${projectId}, using mocks:`, e);
        setTasks(initialMockTasksForProject(projectId, currentProjectData.name));
      }
    } else {
      console.log(`PROJECT_DETAIL_PAGE: No tasks found in localStorage for project ${projectId}. Initializing with mocks.`);
      setTasks(initialMockTasksForProject(projectId, currentProjectData.name));
    }

    const agentsKey = getAgentsStorageKey(projectId);
    const storedProjectAgents = localStorage.getItem(agentsKey);
    if (storedProjectAgents) {
      try {
        const parsedAgents = JSON.parse(storedProjectAgents);
        setProjectAgents(Array.isArray(parsedAgents) && parsedAgents.length > 0 ? parsedAgents : initialProjectScopedMockAgents(projectId));
      } catch (e) {
        console.error(`PROJECT_DETAIL_PAGE: Error parsing project agents for project ${projectId}, using defaults.`, e);
        setProjectAgents(initialProjectScopedMockAgents(projectId));
      }
    } else {
      console.log(`PROJECT_DETAIL_PAGE: No project agents found in localStorage for project ${projectId}. Initializing with defaults.`);
      setProjectAgents(initialProjectScopedMockAgents(projectId));
    }

    const workflowsKey = getWorkflowsStorageKey(projectId);
    const storedWorkflows = localStorage.getItem(workflowsKey);
    if (storedWorkflows) {
      try {
        const parsedWorkflows = JSON.parse(storedWorkflows) as ProjectWorkflow[];
        setProjectWorkflows(
          (Array.isArray(parsedWorkflows) && parsedWorkflows.length > 0)
            ? parsedWorkflows.map(wf => ({ ...wf, nodes: wf.nodes || [], edges: wf.edges || [] }))
            : predefinedWorkflowsData(projectId)
        );
      } catch (e) {
        console.error(`PROJECT_DETAIL_PAGE: Error parsing workflows for project ${projectId}, loading predefined:`, e);
        setProjectWorkflows(predefinedWorkflowsData(projectId));
      }
    } else {
      console.log(`PROJECT_DETAIL_PAGE: No workflows found for project ${projectId}. Initializing with predefined data.`);
      setProjectWorkflows(predefinedWorkflowsData(projectId));
    }

    const filesKey = getFilesStorageKey(projectId);
    const storedProjectFiles = localStorage.getItem(filesKey);
    if (storedProjectFiles) {
      try {
        const parsedFiles = JSON.parse(storedProjectFiles);
        const validatedFiles = (files: ProjectFile[]): ProjectFile[] => {
          return files.map(file => ({
            ...file,
            children: file.type === 'folder' ? (file.children || []) : undefined,
          }));
        };
        setProjectFiles(Array.isArray(parsedFiles) ? validatedFiles(parsedFiles) : initialMockFilesData(projectId, currentProjectData?.name));
      } catch (e) {
        console.error(`PROJECT_DETAIL_PAGE: Error parsing project files from localStorage for project ${projectId}:`, e);
        setProjectFiles(initialMockFilesData(projectId, currentProjectData?.name));
      }
    } else {
      console.log(`PROJECT_DETAIL_PAGE: No files found in localStorage for project ${projectId}. Initializing with mocks.`);
      setProjectFiles(initialMockFilesData(projectId, currentProjectData?.name));
    }

    const reqsKey = getRequirementsStorageKey(projectId);
    const storedReqs = localStorage.getItem(reqsKey);
    if (storedReqs) {
      try {
        const parsedReqs = JSON.parse(storedReqs);
        setProjectRequirements(Array.isArray(parsedReqs) ? parsedReqs : initialMockRequirements(projectId));
      } catch (e) {
        console.error(`PROJECT_DETAIL_PAGE: Error parsing requirements for project ${projectId}, using mocks:`, e);
        setProjectRequirements(initialMockRequirements(projectId));
      }
    } else {
      setProjectRequirements(initialMockRequirements(projectId));
    }

    const ticketsKey = getTicketsStorageKey(projectId);
    const storedTickets = localStorage.getItem(ticketsKey);
    if (storedTickets) {
        try {
            const parsedTickets = JSON.parse(storedTickets);
            setProjectTickets(Array.isArray(parsedTickets) ? parsedTickets : initialMockTickets(projectId));
        } catch (e) {
            console.error(`PROJECT_DETAIL_PAGE: Error parsing tickets for project ${projectId}, using mocks:`, e);
            setProjectTickets(initialMockTickets(projectId));
        }
    } else {
        setProjectTickets(initialMockTickets(projectId));
    }
  }, [projectId, isClient, router, initialMockTasksForProject, initialProjectScopedMockAgents, predefinedWorkflowsData, initialMockFilesData, initialMockRequirements, initialMockTickets]);


  const updateWorkflowStatusBasedOnTasks = useCallback((
    currentTasks: Task[],
    currentWorkflows: ProjectWorkflow[]
  ): ProjectWorkflow[] => {
    let wasChanged = false;
    const updatedWorkflows = currentWorkflows.map(workflow => {
      let newStatus = workflow.status;
      const tasksForThisWorkflow = currentTasks.filter(
        task => task.assignedTo === workflow.name && !task.isMilestone
      );

      if (tasksForThisWorkflow.length > 0) {
        const allDone = tasksForThisWorkflow.every(t => t.status === 'Done');
        const anyInProgress = tasksForThisWorkflow.some(t => t.status === 'In Progress' || t.status === 'Blocked');

        if ((workflow.status === 'Draft' || workflow.status === 'Inactive') && anyInProgress) {
          newStatus = 'Active';
        } else if (workflow.status === 'Active' && allDone) {
          newStatus = 'Inactive'; // Deactivate if all tasks are done
        } else if (workflow.status === 'Inactive' && anyInProgress && !allDone) {
          newStatus = 'Active'; // Reactivate if a task becomes active again
        }
      } else if (workflow.status === 'Active') {
          // If an active workflow has no more tasks assigned to it, it becomes inactive
          newStatus = 'Inactive';
      }


      if (newStatus !== workflow.status) {
        if (isClient) { 
            toast({
                title: 'Workflow Status Updated',
                description: `Workflow "${workflow.name}" changed to ${newStatus}.`,
            });
        }
        wasChanged = true;
        return { ...workflow, status: newStatus, lastRun: (newStatus === 'Active' && workflow.status !== 'Active') ? new Date().toISOString() : workflow.lastRun };
      }
      return workflow;
    });
    return wasChanged ? updatedWorkflows : currentWorkflows;
  }, [isClient, toast]);

  useEffect(() => {
    if (!isClient) return;
    const newWorkflows = updateWorkflowStatusBasedOnTasks(tasks, projectWorkflows);
    if (JSON.stringify(newWorkflows) !== JSON.stringify(projectWorkflows)) {
        setProjectWorkflows(newWorkflows);
    }
  }, [tasks, projectWorkflows, isClient, updateWorkflowStatusBasedOnTasks]);


  useEffect(() => {
    if (isClient && project) {
      localStorage.setItem(getTasksStorageKey(projectId), JSON.stringify(tasks));
      // console.log(`PROJECT_DETAIL_PAGE: Tasks saved to localStorage for project ${projectId}`, tasks);
    }
  }, [tasks, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project) {
      localStorage.setItem(getAgentsStorageKey(projectId), JSON.stringify(projectAgents));
      // console.log(`PROJECT_DETAIL_PAGE: Project agents saved to localStorage for project ${projectId}`, projectAgents);
    }
  }, [projectAgents, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project) {
      console.log(`PROJECT_DETAIL_PAGE: Saving projectWorkflows to localStorage for project ${projectId}. Current designingWorkflow ID: ${designingWorkflowIdRef.current}`, projectWorkflows.map(wf => ({id: wf.id, name: wf.name, nodes: wf.nodes?.length, edges: wf.edges?.length})));
      localStorage.setItem(getWorkflowsStorageKey(projectId), JSON.stringify(projectWorkflows));
    }
  }, [projectWorkflows, projectId, isClient, project]);
  
  useEffect(() => {
    if (isClient && project) {
      localStorage.setItem(getFilesStorageKey(projectId), JSON.stringify(projectFiles));
    }
  }, [projectFiles, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project) {
      localStorage.setItem(getRequirementsStorageKey(projectId), JSON.stringify(projectRequirements));
    }
  }, [projectRequirements, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project) {
        localStorage.setItem(getTicketsStorageKey(projectId), JSON.stringify(projectTickets));
    }
  }, [projectTickets, projectId, isClient, project]);

  const designingWorkflowId = designingWorkflow ? designingWorkflow.id : null;
  useEffect(() => {
    designingWorkflowIdRef.current = designingWorkflowId;
  }, [designingWorkflowId]);

  useEffect(() => {
    if (!isClient || !designingWorkflowIdRef.current || !projectWorkflows?.length) return;
    
    const currentDesigningWorkflowInState = projectWorkflows.find(wf => wf.id === designingWorkflowIdRef.current);

    if (currentDesigningWorkflowInState) {
      if (JSON.stringify(currentDesigningWorkflowInState) !== JSON.stringify(designingWorkflow)) {
        console.log("PROJECT_DETAIL_PAGE: Syncing designingWorkflow from projectWorkflows state. ID:", designingWorkflowIdRef.current);
        setDesigningWorkflow(JSON.parse(JSON.stringify(currentDesigningWorkflowInState))); 
      }
    } else if (designingWorkflow !== null) {
      console.log("PROJECT_DETAIL_PAGE: Designing workflow no longer in projectWorkflows list. Closing designer. ID was:", designingWorkflowIdRef.current);
      setDesigningWorkflow(null);
    }
  }, [projectWorkflows, isClient, designingWorkflow]);


  const formatDate = useCallback((dateString: string | undefined, options?: { day?: '2-digit', month?: 'short', year?: 'numeric' } | string) => {
    if (!isClient || !dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'Invalid Date';
      if (typeof options === 'string') {
        return format(date, options); // Allow passing full format string
      }
      if (options) {
        return format(date, 'dd MMM yyyy'); // Example: 17 Jul 2024
      }
      return format(date, 'PPpp'); // Example: Jul 17, 2024, 10:00:00 AM
    } catch (e) {
      return dateString; // Fallback
    }
  }, [isClient]);


  const handleTaskPlannedAndAccepted = useCallback((
    aiOutput: PlanProjectTaskOutput
  ) => {
    console.log("PROJECT_DETAIL_PAGE: handleTaskPlannedAndAccepted received aiOutput:", JSON.stringify(aiOutput, null, 2));
    if (!project) {
        console.error("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Project not loaded!");
        toast({ title: "Error", description: "Project data not available to add task.", variant: "destructive"});
        return;
    }

    const plannedTaskDataFromAI = aiOutput?.plannedTask || {};
    const aiReasoning = aiOutput?.reasoning || "No reasoning provided by AI.";
    const suggestedSubTasksFromAI = plannedTaskDataFromAI?.suggestedSubTasks || [];

    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted taskTitle:", plannedTaskDataFromAI?.title);
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted aiReasoning:", aiReasoning);
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted suggestedSubTasks:", JSON.stringify(suggestedSubTasksFromAI, null, 2));

    const { suggestedSubTasks, ...mainTaskDataAI } = plannedTaskDataFromAI;

    const subTasksDetailsText = (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0)
        ? `\n\nAI Suggested Sub-Tasks / Steps:\n${suggestedSubTasksFromAI.map((st: any) => `- ${st.title || 'Untitled Sub-task'} (Agent Type: ${st.assignedAgentType || 'N/A'}) - Description: ${st.description || 'No description.'}`).join('\n')}`
        : "\n\nAI Suggested Sub-Tasks / Steps: None specified by AI.";

    const combinedDescription = `AI Reasoning: ${aiReasoning}${subTasksDetailsText}`;
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed combinedDescription (first 100 chars):", combinedDescription.substring(0, 100) + "...");

    let mainTask: Task = {
      id: uid(`task-main-${projectId.slice(-4)}`),
      projectId: projectId,
      title: mainTaskDataAI.title || "Untitled AI Task",
      status: mainTaskDataAI.status || 'To Do',
      assignedTo: mainTaskDataAI.assignedTo || "AI Assistant to determine",
      startDate: mainTaskDataAI.startDate && isValid(parseISO(mainTaskDataAI.startDate)) ? mainTaskDataAI.startDate : format(new Date(), 'yyyy-MM-dd'),
      durationDays: mainTaskDataAI.isMilestone ? 0 : (mainTaskDataAI.durationDays === undefined || mainTaskDataAI.durationDays < 1 ? 1 : mainTaskDataAI.durationDays),
      progress: mainTaskDataAI.isMilestone ? (mainTaskDataAI.status === 'Done' ? 100 : 0) : (mainTaskDataAI.progress === undefined ? 0 : mainTaskDataAI.progress),
      isMilestone: mainTaskDataAI.isMilestone || false,
      parentId: (mainTaskDataAI.parentId === "null" || mainTaskDataAI.parentId === "") ? null : (mainTaskDataAI.parentId || null),
      dependencies: mainTaskDataAI.dependencies || [],
      description: combinedDescription,
    };
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed mainTask before assignment check:", JSON.stringify(mainTask, null, 2));


    let newTasksArray = [mainTask];
    let autoStarted = false;
    let assignedEntityNameForToast: string | null = null;
    let entityTypeForToast: 'agent' | 'workflow' | null = null;
    let workflowActivated = false;

    if (mainTask.assignedTo && mainTask.assignedTo !== "AI Assistant to determine" && mainTask.assignedTo !== "Unassigned") {
      const assignedWorkflow = projectWorkflows.find(wf => wf.name === mainTask.assignedTo);
      if (assignedWorkflow) {
        entityTypeForToast = 'workflow';
        assignedEntityNameForToast = assignedWorkflow.name;
        if (assignedWorkflow.status === 'Draft' || assignedWorkflow.status === 'Inactive') {
          workflowActivated = true;
          if (mainTask.status === 'To Do' && !mainTask.isMilestone) {
              mainTask.status = 'In Progress';
              mainTask.progress = Math.max(mainTask.progress || 0, 5);
          }
        }
      } else {
        const assignedAgent = projectAgents.find(agent => agent.name === mainTask.assignedTo);
        if (assignedAgent && assignedAgent.status === 'Running' && !mainTask.isMilestone && mainTask.status !== 'Done') {
          mainTask.status = 'In Progress';
          mainTask.progress = Math.max(mainTask.progress || 0, 10);
          autoStarted = true;
          assignedEntityNameForToast = assignedAgent.name;
          entityTypeForToast = 'agent';
          setProjectAgents(prevAgents => prevAgents.map(agent =>
            agent.id === assignedAgent.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
          ));
        } else if (assignedAgent) {
          assignedEntityNameForToast = assignedAgent.name;
          entityTypeForToast = 'agent';
        }
      }
    }

    if (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0) {
      const createdSubTasks = suggestedSubTasksFromAI.map((st: any, index: number) => {
        const subTaskId = uid(`subtask-${mainTask.id.slice(-5)}-${index}`);
        return {
            id: subTaskId,
            projectId: projectId,
            title: st.title || "Untitled Sub-task",
            status: 'To Do' as TaskStatus,
            assignedTo: st.assignedAgentType || 'Unassigned',
            startDate: mainTask.startDate,
            durationDays: 1, // Default, could be improved
            progress: 0,
            isMilestone: false,
            parentId: mainTask.id,
            dependencies: index > 0 && newTasksArray[index] ? [newTasksArray[index].id] : [],
            description: st.description || "No description provided by AI.",
        };
      });
      newTasksArray = [mainTask, ...createdSubTasks];

      if (mainTask.status !== 'Done' && !mainTask.isMilestone && (workflowActivated || autoStarted || entityTypeForToast === 'workflow')) {
         mainTask.status = 'In Progress';
         mainTask.progress = Math.max(mainTask.progress || 0, 5);
         // Ensure mainTask in newTasksArray is updated if status changed due to subtasks
         newTasksArray[0] = {...mainTask};
      }
    }

    setTasks(prevTasks => [...newTasksArray, ...prevTasks]);

    if (workflowActivated && assignedEntityNameForToast) {
        setProjectWorkflows(prevWfs => prevWfs.map(wf =>
            wf.name === assignedEntityNameForToast ? { ...wf, status: 'Active', lastRun: new Date().toISOString() } : wf
        ));
    }


    setIsAITaskPlannerDialogOpen(false);

    let toastTitle = mainTask.isMilestone ? "Milestone Added (AI Planned)" : "Task Added (AI Planned)";
    let toastDescription = `${mainTask.isMilestone ? 'Milestone' : 'Task'} "${mainTask.title}" has been added to project "${project.name}".`;

    if (workflowActivated && entityTypeForToast === 'workflow' && assignedEntityNameForToast) {
        toastTitle = "Task Added & Workflow Activated";
        toastDescription = `Task "${mainTask.title}" assigned to workflow "${assignedEntityNameForToast}". Workflow is now active.`;
    } else if (entityTypeForToast === 'workflow' && assignedEntityNameForToast) {
        toastDescription += ` Assigned to workflow "${assignedEntityNameForToast}".`;
    } else if (autoStarted && entityTypeForToast === 'agent' && assignedEntityNameForToast) {
        toastTitle = "Task In Progress (AI Planned)";
        toastDescription = `Task "${mainTask.title}" assigned to agent "${assignedEntityNameForToast}" and is now being processed.`;
    } else if (entityTypeForToast === 'agent' && assignedEntityNameForToast) {
        toastDescription += ` Assigned to agent "${assignedEntityNameForToast}". Run agent to process.`;
    } else if (mainTask.assignedTo && mainTask.assignedTo !== "AI Assistant to determine" && mainTask.assignedTo !== "Unassigned") {
        toastDescription += ` Assigned to "${mainTask.assignedTo}".`;
    }

    if (suggestedSubTasksFromAI.length > 0) {
        toastDescription += ` ${suggestedSubTasksFromAI.length} sub-task${suggestedSubTasksFromAI.length > 1 ? 's' : ''} also created.`;
    }

    toast({
      title: toastTitle,
      description: toastDescription,
    });

    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Main task to open in chat:", JSON.stringify(mainTask, null, 2));
    setTimeout(() => { // Defer chat opening slightly to ensure dialogs transition smoothly
        setChattingTask(mainTask);
        setIsChatDialogOpen(true);
    }, 100);

  }, [project, projectId, toast, projectWorkflows, projectAgents, setProjectWorkflows]);


  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'projectId'>) => {
    if (!project) return;
    const newTask: Task = {
      id: uid(`task-${projectId.slice(-4)}`),
      projectId: projectId,
      ...newTaskData,
    };

    let tasksToUpdate = [newTask];
    let autoStarted = false;
    let workflowActivated = false;
    let assignedEntityNameForToast: string | null = null;
    let entityTypeForToast: 'agent' | 'workflow' | null = null;

    if (newTask.assignedTo && newTask.assignedTo !== "Unassigned" && newTask.assignedTo !== "AI Assistant to determine") {
      const assignedWorkflow = projectWorkflows.find(wf => wf.name === newTask.assignedTo);
      if (assignedWorkflow) {
        entityTypeForToast = 'workflow';
        assignedEntityNameForToast = assignedWorkflow.name;
        if (assignedWorkflow.status === 'Draft' || assignedWorkflow.status === 'Inactive') {
          workflowActivated = true;
          if (newTask.status === 'To Do' && !newTask.isMilestone) {
            newTask.status = 'In Progress';
            newTask.progress = Math.max(newTask.progress || 0, 5);
            tasksToUpdate[0] = {...newTask};
          }
        }
      } else {
        const assignedAgent = projectAgents.find(agent => agent.name === newTask.assignedTo);
        if (assignedAgent && assignedAgent.status === 'Running' && !newTask.isMilestone && newTask.status !== 'Done') {
          newTask.status = 'In Progress';
          newTask.progress = Math.max(newTask.progress || 0, 10);
          tasksToUpdate[0] = {...newTask};
          autoStarted = true;
          assignedEntityNameForToast = assignedAgent.name;
          entityTypeForToast = 'agent';
          setProjectAgents(prevAgents => prevAgents.map(agent =>
            agent.id === assignedAgent.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
          ));
        } else if (assignedAgent) {
          assignedEntityNameForToast = assignedAgent.name;
          entityTypeForToast = 'agent';
        }
      }
    }
    
    setTasks(prevTasks => [...tasksToUpdate, ...prevTasks]);

    if (workflowActivated && assignedEntityNameForToast) {
        setProjectWorkflows(prevWfs => prevWfs.map(wf =>
            wf.name === assignedEntityNameForToast ? { ...wf, status: 'Active', lastRun: new Date().toISOString() } : wf
        ));
    }
    
    setIsAddTaskDialogOpen(false);

    let toastTitle = newTask.isMilestone ? "Milestone Added" : "Task Added";
    let toastDescription = `${newTask.isMilestone ? 'Milestone' : 'Task'} "${newTask.title}" has been added to project "${project.name}".`;

    if (workflowActivated && entityTypeForToast === 'workflow' && assignedEntityNameForToast) {
        toastTitle = "Task Added & Workflow Activated";
        toastDescription = `Task "${newTask.title}" assigned to workflow "${assignedEntityNameForToast}". Workflow is now active.`;
    } else if (entityTypeForToast === 'workflow' && assignedEntityNameForToast) {
        toastDescription += ` Assigned to workflow "${assignedEntityNameForToast}".`;
    } else if (autoStarted && entityTypeForToast === 'agent' && assignedEntityNameForToast) {
        toastTitle = "Task In Progress";
        toastDescription = `Task "${newTask.title}" assigned to agent "${assignedEntityNameForToast}" and is now being processed.`;
    } else if (entityTypeForToast === 'agent' && assignedEntityNameForToast) {
        toastDescription += ` Assigned to agent "${assignedEntityNameForToast}". Run agent to process.`;
    }

    toast({
      title: toastTitle,
      description: toastDescription,
    });
  };


  const handleOpenEditTaskDialog = (task: Task, viewMode: boolean = false) => {
    setEditingTask(task);
    setIsViewingTask(viewMode);
    setIsEditTaskDialogOpen(true);
  };

  const handleUpdateTask = (updatedTaskData: Task) => {
    if (!project) return;
    let updatedTasks = tasks.map(task => task.id === updatedTaskData.id ? updatedTaskData : task);
    
    // Ensure progress is 100 if status is Done and not a milestone
    if (updatedTaskData.status === 'Done' && !updatedTaskData.isMilestone) {
        const taskIndex = updatedTasks.findIndex(t => t.id === updatedTaskData.id);
        if (taskIndex !== -1) {
            updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], progress: 100 };
        }
    }
    
    setTasks(updatedTasks);
    setIsEditTaskDialogOpen(false);
    setEditingTask(null);
    toast({
      title: `${updatedTaskData.isMilestone ? 'Milestone' : 'Task'} Updated`,
      description: `"${updatedTaskData.title}" has been updated.`,
    });

    setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWorkflows));
  };

  const handleOpenDeleteTaskDialog = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteTaskDialogOpen(true);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      const tasksToDelete = new Set<string>();
      tasksToDelete.add(taskToDelete.id);

      const findDescendants = (parentId: string) => {
        tasks.forEach(task => {
          if (task.parentId === parentId) {
            tasksToDelete.add(task.id);
            findDescendants(task.id);
          }
        });
      };
      findDescendants(taskToDelete.id);

      const updatedTasks = tasks.filter(task => !tasksToDelete.has(task.id))
                               .map(task => {
                                 const newDependencies = task.dependencies?.filter(depId => !tasksToDelete.has(depId));
                                 return { ...task, dependencies: newDependencies };
                               });
      
      setTasks(updatedTasks);
      toast({
        title: `${taskToDelete.isMilestone ? 'Milestone' : 'Task'} Deleted`,
        description: `"${taskToDelete.title}" ${tasksToDelete.size > 1 ? 'and its sub-tasks have' : 'has'} been deleted.`,
        variant: 'destructive',
      });
      setTaskToDelete(null);
      setIsDeleteTaskDialogOpen(false);
      setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWorkflows));
    }
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, task: Task) => {
    event.dataTransfer.setData('taskId', task.id);
    event.dataTransfer.setData('taskStatus', task.status);
    event.dataTransfer.effectAllowed = "move";
  };
  
  const handleColumnDragOver = (event: React.DragEvent<HTMLDivElement>, status: Task['status']) => {
    event.preventDefault();
    setDraggingOverStatus(status);
    event.dataTransfer.dropEffect = "move";
  };
  
  const handleColumnDragLeave = () => {
    setDraggingOverStatus(null);
  };

  const handleColumnDrop = (event: React.DragEvent<HTMLDivElement>, newStatus: Task['status']) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('taskId');
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    setDraggingOverStatus(null);
    setReorderTargetTaskId(null); 

    if (!taskId) return;

    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    let updatedTasks = [...tasks];
    const taskIndex = updatedTasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) return;

    if (taskToUpdate.status !== newStatus) { // Status change
        const updatedTaskItem = { 
            ...taskToUpdate, 
            status: newStatus,
            progress: newStatus === 'Done' ? 100 : ( (newStatus === 'To Do' || newStatus === 'Blocked') && !taskToUpdate.isMilestone ? 0 : taskToUpdate.progress )
        };
        updatedTasks[taskIndex] = updatedTaskItem;

        // If dropped in the same column but on the column itself, reorder to end
        const [draggedTaskItem] = updatedTasks.splice(taskIndex, 1);
        const tasksInNewStatus = updatedTasks.filter(t => t.status === newStatus);
        const otherTasks = updatedTasks.filter(t => t.status !== newStatus);
        updatedTasks = [...otherTasks, ...tasksInNewStatus, draggedTaskItem];
        
        setTasks(updatedTasks);
        toast({
            title: "Task Status Updated",
            description: `Task "${taskToUpdate.title}" moved to ${newStatus}.`,
        });
        setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWorkflows));

    } else if (sourceTaskStatus === newStatus) { // Dropped in the same column's empty space - move to end
        const [draggedTaskItem] = updatedTasks.splice(taskIndex, 1);
        // To correctly move to the end of its status group
        const tasksInSameStatus = updatedTasks.filter(t => t.status === newStatus);
        const otherTasks = updatedTasks.filter(t => t.status !== newStatus);
        
        setTasks([...otherTasks, ...tasksInSameStatus, draggedTaskItem]);
        toast({
            title: "Task Reordered",
            description: `Task "${draggedTaskItem.title}" moved to the end of "${newStatus}".`,
        });
    }
  };

  const handleTaskCardDragStart = (event: React.DragEvent<HTMLDivElement>, task: Task) => {
    event.dataTransfer.setData('taskId', task.id);
    event.dataTransfer.setData('taskStatus', task.status); 
    event.dataTransfer.effectAllowed = "move";
  };
  
  const handleTaskCardDragOver = (event: React.DragEvent<HTMLDivElement>, targetTask: Task) => {
    event.preventDefault();
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    if (sourceTaskStatus === targetTask.status) { 
      setReorderTargetTaskId(targetTask.id);
      event.dataTransfer.dropEffect = "move";
    } else {
      event.dataTransfer.dropEffect = "none";
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

    if (draggedTaskId && draggedTaskId !== targetTask.id && sourceTaskStatus === targetTask.status) {
      setTasks(currentTasks => {
          let reorderedTasks = [...currentTasks];
          const draggedTaskIndex = reorderedTasks.findIndex(t => t.id === draggedTaskId);
          let targetTaskIndex = reorderedTasks.findIndex(t => t.id === targetTask.id);

          if (draggedTaskIndex !== -1 && targetTaskIndex !== -1) {
            const [draggedItem] = reorderedTasks.splice(draggedTaskIndex, 1);
            
            // Adjust target index if dragged item was before target
            const newTargetIndex = reorderedTasks.findIndex(t => t.id === targetTask.id);
            reorderedTasks.splice(newTargetIndex, 0, draggedItem); // Insert before target
            
            setTimeout(() => {
              toast({
                title: "Task Reordered",
                description: `Task "${draggedItem.title}" moved.`,
              });
            },0);
            return reorderedTasks;
          }
          return currentTasks;
      });
    }
  };

  // Project Agents Functions
  const handleAddProjectAgent = (newAgentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => {
    if (!project) return;
    const newAgent: Agent = {
      ...newAgentData,
      id: uid(`proj-${projectId.slice(-4)}-agent`),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
    setIsAddAgentDialogOpen(false);
    toast({
      title: "Project Agent Created",
      description: `Agent "${newAgent.name}" has been added to project "${project.name}".`,
    });
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
    toast({
      title: "Project Agent Updated",
      description: `Agent "${updatedAgent.name}" has been updated.`,
    });
  };
  const handleRunProjectAgent = (agentId: string) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Running', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = projectAgents.find(a => a.id === agentId)?.name;
    toast({ title: "Project Agent Started", description: `Agent "${agentName || agentId}" is now Running.` });
  };
  const handleStopProjectAgent = (agentId: string) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Stopped', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = projectAgents.find(a => a.id === agentId)?.name;
    toast({ title: "Project Agent Stopped", description: `Agent "${agentName || agentId}" has been Stopped.` });
  };
  const handleDuplicateProjectAgent = (agentToDuplicate: Agent) => {
    const newAgent: Agent = {
      ...agentToDuplicate,
      id: uid(`proj-${projectId.slice(-4)}-agent-copy`),
      name: `${agentToDuplicate.name} - Copy`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
    toast({ title: "Project Agent Duplicated", description: `Agent "${agentToDuplicate.name}" duplicated as "${newAgent.name}".` });
  };
  const handleOpenDeleteAgentDialog = (agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteAgentDialogOpen(true);
  };
  const confirmDeleteProjectAgent = () => {
    if (agentToDelete) {
      setProjectAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentToDelete.id));
      toast({ title: "Project Agent Deleted", description: `Agent "${agentToDelete.name}" has been deleted from this project.`, variant: 'destructive' });
      setAgentToDelete(null);
      setIsDeleteAgentDialogOpen(false);
    }
  };

  // Project Workflow Functions
  const handleAddProjectWorkflow = (workflowData: { name: string; description: string }) => {
    if (!project) return;
    const newWorkflow: ProjectWorkflow = {
      id: uid(`proj-wf-${projectId.slice(-4)}`),
      name: workflowData.name,
      description: workflowData.description,
      status: 'Draft',
      nodes: [],
      edges: [],
    };
    setProjectWorkflows(prevWorkflows => [newWorkflow, ...prevWorkflows]);
    setIsAddWorkflowDialogOpen(false);
    toast({
      title: "Project Workflow Created",
      description: `Workflow "${newWorkflow.name}" has been added to project "${project.name}". You can now design its steps.`,
    });
  };

  const handleDesignWorkflow = (workflow: ProjectWorkflow) => {
    console.log("PROJECT_DETAIL_PAGE: Setting designingWorkflow to:", workflow);
    setDesigningWorkflow(JSON.parse(JSON.stringify(workflow))); 
  };
  
  const handleCloseWorkflowDesigner = () => {
    if(designingWorkflow){
       toast({
        title: "Workflow Designer Closed",
        description: `Changes to "${designingWorkflow.name}" are saved automatically when nodes or edges are modified.`,
      });
    }
    setDesigningWorkflow(null);
  };

  const handleWorkflowNodesChange = (updatedNodes: WorkflowNode[]) => {
    console.log("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange received updatedNodes. Length:", updatedNodes.length, "IDs:", updatedNodes.map(n => n.id.slice(-5)));
    if (designingWorkflow) {
      console.log("PROJECT_DETAIL_PAGE: Current designingWorkflow ID:", designingWorkflow.id, "Name:", designingWorkflow.name);
      setProjectWorkflows(prevWorkflows => {
        console.log("PROJECT_DETAIL_PAGE: Inside setProjectWorkflows. prevWorkflows length:", prevWorkflows.length);
        const newWorkflowsArray = prevWorkflows.map(wf => {
          if (wf.id === designingWorkflow.id) {
            console.log("PROJECT_DETAIL_PAGE: Updating nodes for workflow ID:", wf.id, ". New nodes count:", updatedNodes.length);
            return { ...wf, nodes: updatedNodes };
          }
          return wf;
        });
        const updatedWfInNewArray = newWorkflowsArray.find(wf => wf.id === designingWorkflow.id);
        console.log("PROJECT_DETAIL_PAGE: Workflow in newWorkflows array (after map). ID:", updatedWfInNewArray?.id, "Nodes count:", updatedWfInNewArray?.nodes?.length, "Nodes IDs:", updatedWfInNewArray?.nodes?.map(n => n.id.slice(-5)));
        return newWorkflowsArray;
      });
    } else {
      console.warn("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange called but no designingWorkflow is set.");
    }
  };

  const handleWorkflowEdgesChange = (updatedEdges: WorkflowEdge[]) => {
    console.log("PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange received updatedEdges. Length:", updatedEdges.length);
    if (designingWorkflow) {
      setProjectWorkflows(prevWorkflows =>
        prevWorkflows.map(wf =>
          wf.id === designingWorkflow.id ? { ...wf, edges: updatedEdges } : wf
        )
      );
    } else {
        console.warn("PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange called but no designingWorkflow is set.");
    }
  };

  const handleToggleWorkflowStatus = (workflowToToggle: ProjectWorkflow) => {
    setProjectWorkflows(prevWorkflows =>
      prevWorkflows.map(wf => {
        if (wf.id === workflowToToggle.id) {
          const newStatus = wf.status === 'Active' ? 'Inactive' : (wf.status === 'Draft' ? 'Active' : 'Active');
          toast({
            title: `Workflow ${newStatus}`,
            description: `Workflow "${wf.name}" is now ${newStatus}.`
          });
          return { ...wf, status: newStatus, lastRun: (newStatus === 'Active' && wf.status !== 'Active') ? new Date().toISOString() : wf.lastRun };
        }
        return wf;
      })
    );
  };

  const handleOpenDeleteWorkflowDialog = (workflow: ProjectWorkflow) => {
    setWorkflowToDelete(workflow);
    setIsDeleteWorkflowDialogOpen(true);
  };

  const confirmDeleteWorkflow = () => {
    if (workflowToDelete) {
      setProjectWorkflows(prev => prev.filter(wf => wf.id !== workflowToDelete.id));
      toast({
        title: "Workflow Deleted",
        description: `Workflow "${workflowToDelete.name}" has been deleted.`,
        variant: "destructive",
      });
      setWorkflowToDelete(null);
      setIsDeleteWorkflowDialogOpen(false);
    }
  };

  // AI Suggestion Handler for Project Agents
  const handleAISuggestionAccepted = (agentData: Omit<Agent, 'id' | 'status' | 'lastActivity'>) => {
    if (!project) {
      toast({
        title: "Error Adding Agent",
        description: "Project context not found.",
        variant: "destructive",
      });
      return;
    }
    const newAgent: Agent = {
      ...agentData,
      id: uid(`proj-${projectId.slice(-4)}-agent-ai`),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => {
      const updatedAgents = [newAgent, ...prevAgents];
      console.log("PROJECT_DETAIL_PAGE: handleAISuggestionAccepted - Project agents updated:", updatedAgents);
      return updatedAgents;
    });
    toast({
      title: "AI-Suggested Agent Added",
      description: `Agent "${newAgent.name}" has been added to this project's agents. You can find it in the 'Project Agents' tab.`,
    });
  };
  
  // Task Chat Dialog
  const handleOpenChatDialog = (task: Task) => {
    console.log("PROJECT_DETAIL_PAGE: Opening chat for task:", JSON.stringify(task, null, 2));
    setChattingTask(task);
    setIsChatDialogOpen(true);
  };

  const handleTaskStatusChangeByAI = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              status: newStatus, 
              progress: newStatus === 'Done' ? 100 : ( (newStatus === 'To Do' || newStatus === 'Blocked') && !t.isMilestone ? 0 : t.progress ) 
            } 
          : t
      );
      // Update workflow statuses if any task moved to Done or became active
      setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWorkflows));
      return updatedTasks;
    });
  };

  // File Repository Functions
  const addFileOrFolderRecursive = useCallback((
    items: ProjectFile[],
    targetPath: string,
    newItem: ProjectFile
  ): ProjectFile[] => {
    const pathSegments = targetPath.split('/').filter(p => p.length > 0);
  
    const updateRecursively = (currentItems: ProjectFile[], segments: string[], currentParentPath: string): ProjectFile[] => {
      if (segments.length === 0) { // Target path is the current level
        return [...currentItems, newItem].sort((a, b) => {
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });
      }
  
      const currentSegment = segments[0];
      const remainingSegments = segments.slice(1);
  
      return currentItems.map(item => {
        if (item.type === 'folder' && item.name === currentSegment && item.path === currentParentPath) {
          return {
            ...item,
            children: updateRecursively(item.children || [], remainingSegments, `${currentParentPath}${item.name}/`),
          };
        }
        return item;
      });
    };
  
    if (targetPath === '/') {
      return updateRecursively(items, [], '/');
    }
    return updateRecursively(items, pathSegments, '/');
  }, []);
  
  const getFilesForCurrentPath = useCallback((): ProjectFile[] => {
    if (currentFilePath === '/') {
        return projectFiles.filter(f => f.path === '/').sort((a, b) => {
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });
    }
    const segments = currentFilePath.split('/').filter(s => s);
    let currentLevelFiles = projectFiles;
    let currentLevelPath = '/';

    for (const segment of segments) {
        const foundFolder = currentLevelFiles.find(f => f.type === 'folder' && f.name === segment && f.path === currentLevelPath);
        if (foundFolder) {
            currentLevelFiles = foundFolder.children || [];
            currentLevelPath += `${segment}/`;
        } else {
            return []; 
        }
    }
    return currentLevelFiles.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
  }, [projectFiles, currentFilePath]);

  const handleNavigateFolder = (folderName: string) => {
    setCurrentFilePath(prevPath => {
      const normalizedPrevPath = prevPath.endsWith('/') ? prevPath : `${prevPath}/`;
      return `${normalizedPrevPath}${folderName}/`;
    });
  };

  const handleNavigateUp = () => {
    if (currentFilePath === '/') return;
    const pathSegments = currentFilePath.split('/').filter(p => p);
    pathSegments.pop(); 
    setCurrentFilePath(`/${pathSegments.join('/')}${pathSegments.length > 0 ? '/' : ''}`);
  };
  
  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) {
      toast({ title: "Error", description: "Folder name cannot be empty.", variant: "destructive" });
      return;
    }
    if (newFolderName.includes('/')) {
      toast({ title: "Error", description: "Folder name cannot contain slashes.", variant: "destructive" });
      return;
    }
    const newFolder: ProjectFile = {
      id: uid(`folder-${projectId.slice(-4)}`),
      name: newFolderName.trim(),
      type: 'folder',
      path: currentFilePath,
      children: [],
      lastModified: new Date().toISOString(),
    };
    
    setProjectFiles(prevFiles => addFileOrFolderRecursive(prevFiles, currentFilePath, newFolder));
    toast({ title: "Folder Created", description: `Folder "${newFolder.name}" created in ${currentFilePath}.` });
    setIsNewFolderDialogOpen(false);
    setNewFolderName("");
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    let updatedProjectFilesState = [...projectFiles]; 

    files.forEach(file => {
      const newFile: ProjectFile = {
        id: uid(`file-${projectId.slice(-4)}`),
        name: file.name,
        type: 'file',
        path: currentFilePath,
        size: `${(file.size / 1024).toFixed(1)}KB`,
        lastModified: new Date(file.lastModified).toISOString(),
        content: `// Mock content for ${file.name}\n// Actual file content not stored in this prototype.`
      };
      updatedProjectFilesState = addFileOrFolderRecursive(updatedProjectFilesState, currentFilePath, newFile);
    });

    setProjectFiles(updatedProjectFilesState);
    toast({ title: "Files Uploaded (Mock)", description: `${files.length} file(s) added to the repository.` });
    if(fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const updateFileContentRecursive = useCallback((
    items: ProjectFile[],
    fileToUpdate: ProjectFile,
    newContent: string
  ): ProjectFile[] => {
    return items.map(item => {
      if (item.id === fileToUpdate.id && item.path === fileToUpdate.path && item.type === 'file') {
        return { ...item, content: newContent, lastModified: new Date().toISOString() };
      }
      if (item.type === 'folder' && fileToUpdate.path.startsWith(item.path + item.name + '/')) {
        return { ...item, children: updateFileContentRecursive(item.children || [], fileToUpdate, newContent) };
      }
      return item;
    });
  }, []);


  const handleOpenEditFileDialog = (file: ProjectFile) => {
    if (file.type === 'file') {
      setEditingFile(file);
      setEditingFileContent(file.content || `// Content for ${file.name}`);
      setIsEditFileDialogOpen(true);
    }
  };
  
  const handleSaveFileContent = () => {
    if (editingFile) {
      setProjectFiles(prevFiles => updateFileContentRecursive(prevFiles, editingFile, editingFileContent));
      toast({ title: "File Saved (Mock)", description: `Content of "${editingFile.name}" updated.` });
      setIsEditFileDialogOpen(false);
      setEditingFile(null);
      setEditingFileContent("");
    }
  };

  const renderProjectFiles = useCallback((): JSX.Element[] => {
    const filesToRender = getFilesForCurrentPath();
  
    return filesToRender.map((file) => (
      <TableRow 
        key={file.id} 
        className={file.type === 'folder' ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/50'} 
        onClick={() => file.type === 'folder' ? handleNavigateFolder(file.name) : handleOpenEditFileDialog(file) }
      >
        <TableCell>
          <div className="flex items-center">
            {file.type === 'folder' 
              ? <FolderIcon className="h-4 w-4 mr-2 text-sky-500" /> 
              : <FileIcon className="h-4 w-4 mr-2 text-gray-500" />}
            {file.name}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground uppercase text-xs">{file.type}</TableCell>
        <TableCell className="text-muted-foreground">{file.size || '-'}</TableCell>
        <TableCell className="text-muted-foreground">{formatDate(file.lastModified, 'dd MMM yyyy')}</TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={(e) => {e.stopPropagation(); if(file.type === 'file') handleOpenEditFileDialog(file); else handleNavigateFolder(file.name);}} >
            <Edit2 className="mr-1 h-3 w-3"/> {file.type === 'file' ? 'Edit' : 'Open'}
          </Button>
        </TableCell>
      </TableRow>
    ));
  }, [getFilesForCurrentPath, formatDate, handleNavigateFolder, handleOpenEditFileDialog]);
  
  const displayedFiles = useMemo(() => getFilesForCurrentPath(), [getFilesForCurrentPath]);

  // Requirements Management
  const handleAddNewRequirement = (reqData: Omit<Requirement, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'version'>) => {
    if (!project) return;
    const newRequirement: Requirement = {
      ...reqData,
      id: uid(`req-${projectId.slice(-4)}`),
      projectId,
      version: '1.0',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
    };
    setProjectRequirements(prev => [newRequirement, ...prev]);
    setIsAddRequirementDialogOpen(false); 
    toast({ title: "Requirement Added", description: `Requirement "${newRequirement.title}" has been added.` });
  };

  const handleOpenEditRequirementDialog = (req: Requirement) => {
    setEditingRequirement(req);
    setIsEditRequirementDialogOpen(true);
  };

  const handleUpdateRequirement = (updatedReqData: Omit<Requirement, 'id' | 'projectId' | 'createdDate' | 'updatedDate'>) => {
     if (!editingRequirement) return;
    const updatedReq: Requirement = {
      ...editingRequirement,
      ...updatedReqData,
      updatedDate: new Date().toISOString(),
    };
     setProjectRequirements(prevReqs => 
      prevReqs.map(r => r.id === editingRequirement.id ? updatedReq : r)
    );
    setIsEditRequirementDialogOpen(false);
    setEditingRequirement(null);
    toast({
      title: "Requirement Updated",
      description: `Requirement "${updatedReq.title}" has been updated.`,
    });
  };

  const handleOpenDeleteRequirementDialog = (req: Requirement) => {
    setRequirementToDelete(req);
    setIsDeleteRequirementDialogOpen(true);
  };

  const confirmDeleteRequirement = () => {
    if (requirementToDelete) {
      setProjectRequirements(prev => prev.filter(r => r.id !== requirementToDelete.id));
      toast({
        title: "Requirement Deleted",
        description: `Requirement "${requirementToDelete.title}" has been deleted.`,
        variant: "destructive",
      });
      setRequirementToDelete(null);
      setIsDeleteRequirementDialogOpen(false);
    }
  };


  // Ticket Management
  const handleAddNewTicket = (ticketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'>) => {
    if (!project) return;
    const newTicket: Ticket = {
      ...ticketData,
      id: uid(`ticket-${projectId.slice(-3)}`),
      projectId,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
    };
    setProjectTickets(prevTickets => [newTicket, ...prevTickets]);
    setIsAddTicketDialogOpen(false);
    toast({
      title: "Ticket Created",
      description: `Ticket "${newTicket.title}" has been successfully created.`,
    });
  };

  const handleOpenEditTicketDialog = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsEditTicketDialogOpen(true);
  };

  const handleUpdateTicket = (updatedTicketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'>) => {
    if (!editingTicket) return;
    const updatedTicket: Ticket = {
      ...editingTicket,
      ...updatedTicketData,
      updatedDate: new Date().toISOString(),
    };
    setProjectTickets(prevTickets => 
      prevTickets.map(t => t.id === editingTicket.id ? updatedTicket : t)
    );
    setIsEditTicketDialogOpen(false);
    setEditingTicket(null);
    toast({
      title: "Ticket Updated",
      description: `Ticket "${updatedTicket.title}" has been updated.`,
    });
  };

  const handleOpenDeleteTicketDialog = (ticket: Ticket) => {
    setTicketToDelete(ticket);
    setIsDeleteTicketDialogOpen(true);
  };

  const confirmDeleteTicket = () => {
    if (ticketToDelete) {
      setProjectTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));
      toast({
        title: "Ticket Deleted",
        description: `Ticket "${ticketToDelete.title}" has been deleted.`,
        variant: "destructive",
      });
      setTicketToDelete(null);
      setIsDeleteTicketDialogOpen(false);
    }
  };

  const handleOpenAITaskPlannerDialogFromTicket = (ticket: Ticket) => {
    const goal = `Address Ticket ID: ${ticket.id.slice(-6)}\nTicket Title: ${ticket.title}\n\nTicket Description:\n${ticket.description}\n\nTicket Type: ${ticket.type}\nTicket Priority: ${ticket.priority}`;
    setAiPlannerPrefillGoal(goal);
    setIsAITaskPlannerDialogOpen(true);
  };

  const filteredTickets = useMemo(() => {
    if (selectedTicketTypeFilter === 'All') {
      return projectTickets;
    }
    return projectTickets.filter(ticket => ticket.type === selectedTicketTypeFilter);
  }, [projectTickets, selectedTicketTypeFilter]);

  const handleGanttTaskReorder = useCallback((draggedTaskId: string, targetTaskId: string) => {
    setTasks(currentTasks => {
      const reorderedTasks = [...currentTasks]; 
      const draggedTaskIndex = reorderedTasks.findIndex(t => t.id === draggedTaskId);
      let targetTaskIndex = reorderedTasks.findIndex(t => t.id === targetTaskId);

      if (draggedTaskIndex === -1 || targetTaskIndex === -1) {
        return currentTasks; 
      }

      const [draggedItem] = reorderedTasks.splice(draggedTaskIndex, 1);
      
      // Adjust target index if dragged item was before target
      const newTargetIndex = reorderedTasks.findIndex(t => t.id === targetTaskId);
      reorderedTasks.splice(newTargetIndex, 0, draggedItem);
      
      setTimeout(() => { 
        toast({
          title: "Task Order Updated",
          description: "Gantt chart task order has been updated.",
        });
      }, 0);
      return reorderedTasks;
    });
  }, [toast]);
  
  if (!isClient || !project) {
    return (
      <div className="container mx-auto flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  // Start of the main return statement for ProjectDetailPage
  return (
    <div className="container mx-auto">
      <PageHeader className="items-start justify-between sm:flex-row sm:items-center">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
           {project.thumbnailUrl && (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg overflow-hidden flex-shrink-0 border-2 border-border shadow-md">
              <Image
                src={project.thumbnailUrl}
                alt={`${project.name} thumbnail`}
                fill
                sizes="(min-width: 768px) 96px, (min-width: 640px) 80px, 64px"
                className="object-cover"
                data-ai-hint="project abstract"
                priority
              />
            </div>
          )}
          <div className="flex-grow">
            <PageHeaderHeading className="text-2xl sm:text-3xl md:text-4xl">
              <Briefcase className="mr-2 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:h-8" />
              {project.name}
            </PageHeaderHeading>
            <PageHeaderDescription className="text-xs sm:text-sm md:text-base mt-1">
              {project.description}
            </PageHeaderDescription>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
              <Badge variant="outline" className={cn(projectStatusColors[project.status])}>
                Status: {project.status}
              </Badge>
              <span className="text-muted-foreground">ID: {project.id}</span>
              <span className="text-muted-foreground hidden sm:inline">|</span>
              <span className="text-muted-foreground">
                <CalendarDays className="inline h-3.5 w-3.5 mr-1 relative -top-px" />
                Last Updated: {formatDate(project.lastUpdated, 'PPpp')}
              </span>
               <span className="text-muted-foreground hidden md:inline">|</span>
                <span className="text-muted-foreground flex items-center">
                  <Bot className="inline h-3.5 w-3.5 mr-1 relative -top-px" />
                  {projectAgents.length} Agent{projectAgents.length === 1 ? '' : 's'}
                </span>
                <span className="text-muted-foreground flex items-center">
                  <WorkflowIcon className="inline h-3.5 w-3.5 mr-1 relative -top-px" />
                  {projectWorkflows.filter(wf => wf.status === 'Active').length} Active Workflow{projectWorkflows.filter(wf => wf.status === 'Active').length === 1 ? '' : 's'}
                </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
           <Button variant="outline" size="sm" disabled  className="w-full sm:w-auto">
            <Settings className="mr-2 h-4 w-4" /> Project Settings
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="taskManagement" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:w-auto xl:inline-grid mb-6 sm:mb-4">
          <TabsTrigger value="taskManagement"><ListChecks className="mr-1.5 h-4 w-4"/>Task Management</TabsTrigger>
          <TabsTrigger value="projectAssets"><FolderGit2 className="mr-1.5 h-4 w-4"/>Project Assets</TabsTrigger>
          <TabsTrigger value="aiAutomation"><Brain className="mr-1.5 h-4 w-4"/>AI & Automation</TabsTrigger>
          <TabsTrigger value="tickets"><TicketIcon className="mr-1.5 h-4 w-4"/>Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="taskManagement" className="mt-8 sm:mt-4">
            <Card>
                <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <div>
                        <CardTitle>Task Management Central</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Organize, track, and plan project tasks using Gantt or Board views.
                        </CardDescription>
                    </div>
                     <Button onClick={() => { setAiPlannerPrefillGoal(undefined); setIsAITaskPlannerDialogOpen(true); }} className="w-full mt-2 sm:w-auto sm:mt-0">
                        <Brain className="mr-2 h-4 w-4" /> Plan Task with AI
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs defaultValue="gantt" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid sm:grid-cols-2 rounded-none border-b">
                            <TabsTrigger value="gantt" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <GanttChartSquare className="mr-2 h-4 w-4" />Gantt Chart
                            </TabsTrigger>
                            <TabsTrigger value="board" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <ListChecks className="mr-2 h-4 w-4" />Task Board
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="gantt" className="mt-0 p-1 sm:p-2 md:p-3">
                             {tasks.length > 0 ? (
                                <ProjectGanttChartView tasks={tasks} onUpdateTask={handleUpdateTask} onTasksReorder={handleGanttTaskReorder} />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md">
                                    <GanttChartSquare className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                    <p className="mb-2 font-medium">No tasks defined for this project yet.</p>
                                    <Button size="sm" variant="default" onClick={() => { setAiPlannerPrefillGoal(undefined); setIsAITaskPlannerDialogOpen(true); }}>
                                        <Brain className="mr-2 h-4 w-4"/>Plan First Task with AI
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="board" className="mt-0 p-1 sm:p-2 md:p-3">
                            {tasks.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md">
                                    <ListChecks className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                    <p className="mb-2 font-medium">No tasks to display on the board.</p>
                                     <Button size="sm" variant="default" onClick={() => { setAiPlannerPrefillGoal(undefined); setIsAITaskPlannerDialogOpen(true); }}>
                                        <Brain className="mr-2 h-4 w-4"/>Plan First Task with AI
                                    </Button>
                                </div>
                            )}
                            {tasks.length > 0 && (
                                <ScrollArea className="w-full">
                                    <div className="flex gap-4 pb-4">
                                    {taskStatuses.map(status => (
                                        <div
                                        key={status}
                                        className={cn(
                                            "w-[300px] min-w-[300px] flex-shrink-0 rounded-lg border bg-muted/30 p-1",
                                            draggingOverStatus === status && "ring-2 ring-primary bg-primary/10"
                                        )}
                                        onDragOver={(e) => handleColumnDragOver(e, status)}
                                        onDragLeave={handleColumnDragLeave}
                                        onDrop={(e) => handleColumnDrop(e, status)}
                                        >
                                        <div className={cn("p-2 rounded-md font-semibold text-sm mb-2 text-center", taskStatusColors[status])}>
                                            {status} ({tasks.filter(task => task.status === status).length}) 
                                        </div>
                                        <ScrollArea className="h-[calc(100vh-12rem-12rem)] min-h-[200px]"> 
                                          <div className="space-y-2 p-2">
                                            {tasks
                                                .filter(task => task.status === status)
                                                .map(task => (
                                                <KanbanTaskCard
                                                    key={task.id}
                                                    task={task}
                                                    isParentTask={tasks.some(t => t.parentId === task.id)}
                                                    isDragging={false} 
                                                    isDragTarget={reorderTargetTaskId === task.id}
                                                    taskStatusColors={taskStatusColors}
                                                    onDragStart={(e) => handleTaskCardDragStart(e, task)}
                                                    onDragOverCard={(e) => handleTaskCardDragOver(e, task)}
                                                    onDragLeaveCard={handleTaskCardDragLeave}
                                                    onDropOnCard={(e) => handleTaskCardDrop(e, task)}
                                                    onViewTask={() => handleOpenEditTaskDialog(task, true)}
                                                    onEditTask={() => handleOpenEditTaskDialog(task, false)}
                                                    onDeleteTask={() => handleOpenDeleteTaskDialog(task)}
                                                    onChatTask={() => handleOpenChatDialog(task)}
                                                />
                                                ))}
                                            {tasks.filter(task => task.status === status).length === 0 && (
                                                <p className="text-xs text-muted-foreground text-center py-4">No tasks in this stage.</p>
                                            )}
                                          </div>
                                        </ScrollArea>
                                        </div>
                                    ))}
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
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
                    <CardDescription className="text-xs sm:text-sm">Manage project requirements and repository files.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                     <Tabs defaultValue="requirements" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid sm:grid-cols-2 rounded-none border-b">
                            <TabsTrigger value="requirements" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <ClipboardList className="mr-2 h-4 w-4" />Requirements
                            </TabsTrigger>
                            <TabsTrigger value="repository" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <FolderIcon className="mr-2 h-4 w-4" />Repository
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="requirements" className="mt-0 p-3 sm:p-4 md:p-6">
                            <Card>
                                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-xl">Requirements Management</CardTitle>
                                        <CardDescription>Define, track, and manage project requirements.</CardDescription>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                        <Button variant="outline" size="sm" onClick={() => {
                                            setIsViewTraceabilityMatrixDialogOpen(true)
                                        }}  className="w-full sm:w-auto">
                                          <ExternalLink className="mr-2 h-4 w-4" /> View Traceability Matrix
                                        </Button>
                                        <Button variant="default" size="sm" onClick={() => {
                                            if (isClient) toast({ title: "Add Requirement (Placeholder)", description: "This functionality is planned for future implementation." });
                                            // setIsAddRequirementDialogOpen(true); // Uncomment when dialog is ready
                                        }} className="w-full sm:w-auto">
                                            <PlusSquare className="mr-2 h-4 w-4" /> Add New Requirement
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {projectRequirements.length > 0 ? (
                                    <Table>
                                        <ShadCnTableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">ID</TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Version</TableHead>
                                            <TableHead className="text-right w-[200px]">Actions</TableHead>
                                        </TableRow>
                                        </ShadCnTableHeader>
                                        <TableBody>
                                        {projectRequirements.map((req) => (
                                            <TableRow key={req.id}>
                                            <TableCell className="font-mono text-xs">{req.id.slice(-8)}</TableCell>
                                            <TableCell className="font-medium">{req.title}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("capitalize", requirementStatusColors[req.status])}>
                                                {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={cn("font-medium", requirementPriorityColors[req.priority])}>{req.priority}</TableCell>
                                            <TableCell>{req.version}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="mr-1 text-xs h-7 px-2" disabled><Eye className="mr-1 h-3 w-3"/>View</Button>
                                                <Button variant="ghost" size="sm" className="mr-1 text-xs h-7 px-2" disabled><Edit2 className="mr-1 h-3 w-3"/>Edit</Button>
                                                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" disabled><Trash2 className="mr-1 h-3 w-3 text-destructive"/>Delete</Button>
                                            </TableCell>
                                            </TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                    ) : (
                                    <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md">
                                        <ClipboardList className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                        <p className="mb-2 font-medium">No requirements defined for this project.</p>
                                        <Button size="sm" variant="default" onClick={() => {
                                            if (isClient) toast({ title: "Add Requirement (Placeholder)", description: "This functionality is planned for future implementation." });
                                            // setIsAddRequirementDialogOpen(true);
                                        }}>
                                            <PlusSquare className="mr-2 h-4 w-4"/>Add First Requirement
                                        </Button>
                                    </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="repository" className="mt-0 p-3 sm:p-4 md:p-6">
                           <Card>
                              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div>
                                  <CardTitle className="text-xl">Project Repository</CardTitle>
                                  <CardDescription>Browse and manage project files.</CardDescription>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                  <Button variant="outline" size="sm" onClick={handleFileUploadClick} className="w-full sm:w-auto">
                                    <UploadCloud className="mr-2 h-4 w-4" /> Upload Files
                                  </Button>
                                  <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
                                  <Button variant="default" size="sm" onClick={() => {setNewFolderName(""); setIsNewFolderDialogOpen(true);}} className="w-full sm:w-auto">
                                    <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="mb-2 flex items-center gap-2 text-sm">
                                  {currentFilePath !== '/' && (
                                    <Button variant="ghost" size="sm" onClick={handleNavigateUp} className="text-muted-foreground hover:text-foreground">
                                      <ArrowLeftCircle className="mr-2 h-4 w-4" /> Up One Level
                                    </Button>
                                  )}
                                  <span className="text-muted-foreground">Current Path:</span> <span className="font-mono bg-muted px-1.5 py-0.5 rounded-sm">{currentFilePath}</span>
                                </div>
                                {displayedFiles.length > 0 ? (
                                  <Table>
                                    <ShadCnTableHeader>
                                      <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="w-[100px]">Type</TableHead>
                                        <TableHead className="w-[100px]">Size</TableHead>
                                        <TableHead className="w-[180px]">Last Modified</TableHead>
                                        <TableHead className="text-right w-[120px]">Actions</TableHead>
                                      </TableRow>
                                    </ShadCnTableHeader>
                                    <TableBody>
                                      {renderProjectFiles()}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md">
                                    <FolderClosed className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                    <p>This folder is empty.</p>
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
                <CardHeader>
                    <CardTitle>AI & Automation Hub</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Manage project-specific agents, workflows, and AI-driven suggestions.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs defaultValue="projectAgents" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid sm:grid-cols-3 rounded-none border-b">
                            <TabsTrigger value="projectAgents" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <Bot className="mr-1.5 h-4 w-4"/>Project Agents
                            </TabsTrigger>
                            <TabsTrigger value="projectWorkflows" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <WorkflowIcon className="mr-1.5 h-4 w-4"/>Workflows & Design
                            </TabsTrigger>
                            <TabsTrigger value="aiSuggestions" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <Lightbulb className="mr-1.5 h-4 w-4"/>AI Suggestions
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="projectAgents" className="mt-0 p-3 sm:p-4 md:p-6">
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                                <div className="mb-2 sm:mb-0">
                                  <PageHeaderHeading className="text-xl font-semibold">Project Agents</PageHeaderHeading>
                                  <PageHeaderDescription className="text-xs text-muted-foreground">Manage agents specifically configured for this project.</PageHeaderDescription>
                                </div>
                                <Button onClick={() => setIsAddAgentDialogOpen(true)} size="sm" className="w-full sm:w-auto">
                                    <PlusSquare className="mr-2 h-4 w-4" /> Add New Project Agent
                                </Button>
                            </div>
                            <AgentManagementTable
                                agents={projectAgents}
                                onEditAgent={handleOpenEditProjectAgentDialog}
                                onRunAgent={handleRunProjectAgent}
                                onStopAgent={handleStopProjectAgent}
                                onDuplicateAgent={handleDuplicateProjectAgent}
                                onDeleteAgent={handleOpenDeleteAgentDialog}
                            />
                        </TabsContent>

                        <TabsContent value="projectWorkflows" className="mt-0 p-3 sm:p-4 md:p-6">
                            {!designingWorkflow ? (
                                <>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                                        <div className="mb-2 sm:mb-0">
                                            <PageHeaderHeading className="text-xl font-semibold">Project Workflows</PageHeaderHeading>
                                            <PageHeaderDescription className="text-xs text-muted-foreground">
                                                Define and manage automated workflows using project agents.
                                            </PageHeaderDescription>
                                        </div>
                                        <Button onClick={() => setIsAddWorkflowDialogOpen(true)} size="sm" className="w-full sm:w-auto">
                                            <PlusSquare className="mr-2 h-4 w-4"/> Add New Project Workflow
                                        </Button>
                                    </div>
                                     {projectWorkflows.length > 0 ? (
                                        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                            {projectWorkflows.map(wf => (
                                            <ProjectWorkflowCard
                                                key={wf.id}
                                                workflow={wf}
                                                workflowStatusColors={workflowStatusColors}
                                                formatDate={(dateStr, fmtStr) => formatDate(dateStr, fmtStr || "MMM d, hh:mm a")}
                                                onDesignWorkflow={handleDesignWorkflow}
                                                onToggleWorkflowStatus={handleToggleWorkflowStatus}
                                                onDeleteWorkflow={handleOpenDeleteWorkflowDialog}
                                            />
                                            ))}
                                        </div>
                                        ) : (
                                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-[200px]">
                                            <WorkflowIcon className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                            <p className="mb-2 font-medium">No workflows defined for this project yet.</p>
                                            <Button size="sm" variant="default" onClick={() => setIsAddWorkflowDialogOpen(true)}>
                                                <PlusSquare className="mr-2 h-4 w-4"/>Add First Workflow Definition
                                            </Button>
                                        </div>
                                        )}
                                </>
                            ) : (
                                <Card className="mt-0">
                                    <CardHeader className="border-b p-4">
                                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                                            <div>
                                                <CardTitle className="text-lg font-semibold flex items-center">
                                                    <Settings className="mr-2 h-5 w-5 text-primary"/>
                                                    Designing Workflow: {designingWorkflow.name}
                                                </CardTitle>
                                                <CardDescription className="text-xs text-muted-foreground mt-1">
                                                    {designingWorkflow.description || "Drag agents from the palette to the canvas and connect them."}
                                                </CardDescription>
                                            </div>
                                            <Button onClick={handleCloseWorkflowDesigner} variant="outline" size="sm" className="w-full sm:w-auto sm:mt-0">
                                                <XSquare className="mr-2 h-4 w-4" /> Close Designer
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-2 md:p-4">
                                        <div className="flex flex-col md:flex-row gap-4 mt-2" style={{ minHeight: '60vh' }}>
                                            <WorkflowPalette projectAgents={projectAgents} />
                                            <WorkflowCanvas
                                                nodes={designingWorkflow.nodes || []}
                                                edges={designingWorkflow.edges || []}
                                                onNodesChange={handleWorkflowNodesChange}
                                                onEdgesChange={handleWorkflowEdgesChange}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="aiSuggestions" className="mt-0 p-3 sm:p-4 md:p-6">
                            <div className="mb-4">
                              <PageHeaderHeading className="text-xl font-semibold">AI Agent Configuration Suggestions</PageHeaderHeading>
                              <PageHeaderDescription className="text-xs text-muted-foreground">Get AI-powered suggestions for agent configurations based on your task needs for this project.</PageHeaderDescription>
                            </div>
                            <AgentConfigForm projectId={projectId} onSuggestionAccepted={handleAISuggestionAccepted} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="tickets" className="mt-8 sm:mt-4">
          <Card>
            <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <div>
                <CardTitle>Ticket Management</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Track issues, bugs, and feature requests related to this project.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                 <Select value={selectedTicketTypeFilter} onValueChange={(value) => setSelectedTicketTypeFilter(value as TicketType | 'All')}>
                  <SelectTrigger className="w-full sm:w-[180px] text-xs h-9">
                    <SelectValue placeholder="Filter by type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allTicketTypes.map(type => (
                      <SelectItem key={type} value={type} className="text-xs">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setIsAddTicketDialogOpen(true)} size="sm" className="w-full sm:w-auto h-9">
                  <PlusSquare className="mr-2 h-4 w-4" /> Add New Ticket
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTickets.length > 0 ? (
                <Table>
                  <ShadCnTableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead className="text-right w-[200px]">Actions</TableHead>
                    </TableRow>
                  </ShadCnTableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">{ticket.id.slice(-6)}</TableCell>
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize text-xs", ticketTypeColors[ticket.type])}>{ticket.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("capitalize text-xs", ticketStatusColors[ticket.status])}>{ticket.status}</Badge>
                        </TableCell>
                        <TableCell className={cn("font-medium",ticketPriorityColors[ticket.priority])}>{ticket.priority}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ticket.assignee || 'Unassigned'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="mr-1 text-xs h-7 px-2" onClick={() => handleOpenAITaskPlannerDialogFromTicket(ticket)}><Brain className="mr-1 h-3 w-3"/>Plan Task</Button>
                          <Button variant="ghost" size="sm" className="mr-1 text-xs h-7 px-2" onClick={() => handleOpenEditTicketDialog(ticket)}><Edit2 className="mr-1 h-3 w-3"/>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => handleOpenDeleteTicketDialog(ticket)}><Trash2 className="mr-1 h-3 w-3 text-destructive"/>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md">
                  <TicketIcon className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                  <p className="mb-2 font-medium">
                    {selectedTicketTypeFilter === 'All' ? 'No tickets found for this project.' : `No '${selectedTicketTypeFilter}' tickets found.`}
                  </p>
                   <Button size="sm" variant="default" onClick={() => setIsAddTicketDialogOpen(true)}>
                      <PlusSquare className="mr-2 h-4 w-4"/>Add First Ticket
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <Card className="bg-muted/20">
                        <CardHeader><CardTitle className="text-sm">Ticket Detail View (Placeholder)</CardTitle></CardHeader>
                        <CardContent><p className="text-xs text-muted-foreground">Selected ticket details will appear here.</p></CardContent>
                    </Card>
                     <Card className="bg-muted/20">
                        <CardHeader><CardTitle className="text-sm">Status Workflow Visualizer (Placeholder)</CardTitle></CardHeader>
                        <CardContent><p className="text-xs text-muted-foreground">A visual representation of ticket status transitions.</p></CardContent>
                    </Card>
                     <Card className="bg-muted/20">
                        <CardHeader><CardTitle className="text-sm">AI Suggestion Panel (Placeholder)</CardTitle></CardHeader>
                        <CardContent><p className="text-xs text-muted-foreground">AI insights and suggestions for this ticket.</p></CardContent>
                    </Card>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Dialogs */}
      {isAITaskPlannerDialogOpen && (
        <AITaskPlannerDialog
          open={isAITaskPlannerDialogOpen}
          onOpenChange={(open) => {
            setIsAITaskPlannerDialogOpen(open);
            if (!open) setAiPlannerPrefillGoal(undefined); 
          }}
          projectId={projectId}
          projectWorkflows={projectWorkflows.map(wf => ({ id: wf.id, name: wf.name, description: wf.description, nodes: wf.nodes }))}
          onTaskPlannedAndAccepted={handleTaskPlannedAndAccepted}
          initialGoal={aiPlannerPrefillGoal}
        />
      )}
      {editingTask && (
        <EditTaskDialog
          open={isEditTaskDialogOpen}
          onOpenChange={(open) => {
            setIsEditTaskDialogOpen(open);
            if (!open) {
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
      {taskToDelete && (
        <AlertDialog open={isDeleteTaskDialogOpen} onOpenChange={setIsDeleteTaskDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this {taskToDelete.isMilestone ? 'milestone' : 'task'}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the {taskToDelete.isMilestone ? 'milestone' : 'task'} "{taskToDelete.title}"{tasks.some(t => t.parentId === taskToDelete.id) ? ' and all its sub-tasks' : ''}.
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
      {editingProjectAgent && (
        <EditAgentDialogAgent
          agent={editingProjectAgent}
          open={isEditAgentDialogOpen}
          onOpenChange={setIsEditAgentDialogOpen}
          onUpdateAgent={handleUpdateProjectAgent}
          projectId={projectId}
        />
      )}
      <AddAgentDialog
        open={isAddAgentDialogOpen}
        onOpenChange={setIsAddAgentDialogOpen}
        onAddAgent={handleAddProjectAgent}
        projectId={projectId}
      />
      {agentToDelete && (
        <AlertDialog open={isDeleteAgentDialogOpen} onOpenChange={setIsDeleteAgentDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project Agent: {agentToDelete.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the agent configuration for this project.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setAgentToDelete(null); setIsDeleteAgentDialogOpen(false); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteProjectAgent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Agent
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <AddWorkflowDialog
        open={isAddWorkflowDialogOpen}
        onOpenChange={setIsAddWorkflowDialogOpen}
        onAddWorkflow={handleAddProjectWorkflow}
      />
      {workflowToDelete && (
         <AlertDialog open={isDeleteWorkflowDialogOpen} onOpenChange={setIsDeleteWorkflowDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workflow: {workflowToDelete.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the workflow definition and its design.
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
       {isChatDialogOpen && chattingTask && (
        <TaskChatDialog
          open={isChatDialogOpen}
          onOpenChange={setIsChatDialogOpen}
          task={chattingTask}
          onTaskStatusChangeByAI={handleTaskStatusChangeByAI}
        />
      )}
      {isNewFolderDialogOpen && (
        <AlertDialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create New Folder</AlertDialogTitle>
              <AlertDialogDescription>
                Enter a name for the new folder to be created in: <span className="font-mono bg-muted px-1 py-0.5 rounded-sm">{currentFilePath}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsNewFolderDialogOpen(false); setNewFolderName(""); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCreateNewFolder}>Create Folder</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
       {editingFile && isEditFileDialogOpen && (
        <ShadCnDialog open={isEditFileDialogOpen} onOpenChange={(open) => {
            setIsEditFileDialogOpen(open);
            if (!open) {
                setEditingFile(null);
                setEditingFileContent("");
            }
        }}>
            <ShadCnDialogContent className="sm:max-w-2xl flex flex-col h-[70vh]">
                <ShadCnDialogHeader>
                    <ShadCnDialogTitle>Edit File: {editingFile.name}</ShadCnDialogTitle>
                    <ShadCnDialogDescription>Path: {editingFile.path}{editingFile.name}</ShadCnDialogDescription>
                </ShadCnDialogHeader>
                <Textarea
                    value={editingFileContent}
                    onChange={(e) => setEditingFileContent(e.target.value)}
                    className="flex-grow resize-none font-mono text-xs"
                    placeholder="// Start typing file content..."
                />
                <ShadCnDialogFooter>
                    <Button variant="outline" onClick={() => {
                        setIsEditFileDialogOpen(false);
                        setEditingFile(null);
                        setEditingFileContent("");
                    }}>Cancel</Button>
                    <Button onClick={handleSaveFileContent}>Save Changes</Button>
                </ShadCnDialogFooter>
            </ShadCnDialogContent>
        </ShadCnDialog>
      )}
      {isViewTraceabilityMatrixDialogOpen && (
        <AlertDialog open={isViewTraceabilityMatrixDialogOpen} onOpenChange={setIsViewTraceabilityMatrixDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>View Traceability Matrix (Placeholder)</AlertDialogTitle>
                    <AlertDialogDescription>
                        This feature will display a matrix showing relationships between requirements, tasks, tests, and other project artifacts.
                        <br/><br/>It's planned for future implementation.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setIsViewTraceabilityMatrixDialogOpen(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
      {/* Ticket Dialogs */}
      <AddTicketDialog
        open={isAddTicketDialogOpen}
        onOpenChange={setIsAddTicketDialogOpen}
        onAddTicket={handleAddNewTicket}
      />
      {editingTicket && (
        <EditTicketDialog
          ticketToEdit={editingTicket}
          open={isEditTicketDialogOpen}
          onOpenChange={(open) => {
            setIsEditTicketDialogOpen(open);
            if (!open) setEditingTicket(null);
          }}
          onUpdateTicket={handleUpdateTicket}
        />
      )}
       {ticketToDelete && (
         <AlertDialog open={isDeleteTicketDialogOpen} onOpenChange={setIsDeleteTicketDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this ticket?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the ticket "{ticketToDelete.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setTicketToDelete(null); setIsDeleteTicketDialogOpen(false); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteTicket} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Ticket
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
// End of file
