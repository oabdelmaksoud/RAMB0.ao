
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, Eye, SlidersHorizontal, Lightbulb, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, X as XIcon, Diamond, Users, FolderGit2, MessageSquare, Settings, Brain, PlusSquare, Edit2, Files, FolderClosed, Folder as FolderIcon, File as FileIcon, UploadCloud, FolderPlus, ArrowLeftCircle, InfoIcon, ClipboardList, ChevronDown, ChevronRight, Play, Paperclip, Ticket as TicketIcon, ExternalLink, Loader2, CheckSquare, MoreVertical } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, useRef, useMemo, Fragment } from 'react';
import type { Project, Task, Agent, ProjectWorkflow, WorkflowNode, WorkflowEdge, ProjectFile, Requirement, RequirementStatus, RequirementPriority, Ticket, TicketStatus, TicketPriority, TicketType } from '@/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddTaskDialog from '@/components/features/projects/AddTaskDialog';
import EditTaskDialog from '@/components/features/projects/EditTaskDialog';
import { useToast } from '@/hooks/use-toast';
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
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadCnTableHeader, TableRow } from "@/components/ui/table";
import AddWorkflowDialog from '@/components/features/projects/AddWorkflowDialog';
// Removed AddRequirementDialog import as we are changing the UI
import AddTicketDialog from '@/components/features/tickets/AddTicketDialog';
import EditTicketDialog from '@/components/features/tickets/EditTicketDialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlanProjectTaskOutput, WorkflowNode as AIWorkflowNode } from '@/ai/flows/plan-project-task-flow';


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
  const [isViewingTask, setIsViewingTask] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
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

  // State for Main Project Repository
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string>('/');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFile, setEditingFile] = useState<ProjectFile | null>(null);
  const [editingFileContent, setEditingFileContent] = useState<string>("");
  const [isEditFileDialogOpen, setIsEditFileDialogOpen] = useState(false);

  // State for Requirements Document Management
  const [projectRequirementDocs, setProjectRequirementDocs] = useState<ProjectFile[]>([]);
  const [currentRequirementDocPath, setCurrentRequirementDocPath] = useState<string>('/');
  const [isNewRequirementFolderDialogOpen, setIsNewRequirementFolderDialogOpen] = useState(false);
  const [newRequirementFolderName, setNewRequirementFolderName] = useState("");
  const requirementFileInputRef = useRef<HTMLInputElement>(null);
  const [editingRequirementDoc, setEditingRequirementDoc] = useState<ProjectFile | null>(null);
  const [editingRequirementDocContent, setEditingRequirementDocContent] = useState<string>("");
  const [isEditRequirementDocDialogOpen, setIsEditRequirementDocDialogOpen] = useState(false);
  
  const [isViewTraceabilityMatrixDialogOpen, setIsViewTraceabilityMatrixDialogOpen] = useState(false);

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
    const aspiceAgentsData: Omit<Agent, 'id' | 'lastActivity' | 'status'>[] = [
      { name: 'ASPICE Requirements Elicitation & Analysis Agent', type: 'Analysis Agent', config: { focus: "SYS.1, SYS.2, SWE.1", methods: ["interviews", "workshops"], outputs: ["SRS", "SystemRequirementsSpec"], keywords: ["requirement", "stakeholder", "user story", "elicit", "analyze", "specification"] } },
      { name: 'ASPICE System Architectural Design Agent', type: 'Design Agent', config: { focus: "SYS.3", inputs: ["SystemRequirementsSpecification"], outputs: ["SystemArchitectureDesignDocument"], modeling: "SysML", keywords: ["system architecture", "high-level design", "components", "interfaces"] } },
      { name: 'ASPICE Software Architectural Design Agent', type: 'Design Agent', config: { focus: "SWE.2", inputs: ["SoftwareRequirementsSpecification"], outputs: ["SoftwareArchitectureDesignDocument"], patterns: ["microservices", "layered"], keywords: ["software architecture", "module design", "api design", "patterns"] } },
      { name: 'ASPICE Software Detailed Design & Implementation Agent', type: 'Development Agent', config: { focus: "SWE.3, SWE.4 (Unit Const.)", inputs: ["SoftwareArchitectureDesignDocument"], outputs: ["SourceCode", "UnitTests"], languages: ["TypeScript", "Python"], keywords: ["coding", "implementation", "detailed design", "unit construction"] } },
      { name: 'ASPICE Software Unit Verification Agent', type: 'Testing Agent', config: { focus: "SWE.4 (Unit Verif.)", inputs: ["SourceCode", "UnitTests"], testFrameworks: ["Jest", "Pytest"], coverageGoal: "90%", keywords: ["unit testing", "verification", "test cases"] } },
      { name: 'ASPICE Software Integration Testing Agent', type: 'Testing Agent', config: { focus: "SWE.5", inputs: ["IntegratedSoftware", "SoftwareArchitectureDesignDocument"], outputs: ["IntegrationTestReport"], strategy: "Bottom-up", keywords: ["integration testing", "interface testing", "component interaction"] } },
      { name: 'ASPICE Software Qualification Testing Agent', type: 'Testing Agent', config: { focus: "SWE.6", inputs: ["SoftwareProduct", "SoftwareRequirementsSpecification"], outputs: ["QualificationTestReport"], methods: ["BlackBox", "AlphaTesting"], keywords: ["qualification testing", "acceptance testing", "system validation"] } },
      { name: 'ASPICE System Integration Testing Agent', type: 'Testing Agent', config: { focus: "SYS.4", inputs: ["IntegratedSystemComponents", "SystemArchitectureDesignDocument"], outputs: ["SystemIntegrationTestReport"], keywords: ["system integration testing", "end-to-end testing"] } },
      { name: 'ASPICE System Qualification Testing Agent', type: 'Testing Agent', config: { focus: "SYS.5", inputs: ["SystemProduct", "SystemRequirementsSpecification"], outputs: ["SystemQualificationTestReport"], validationMethods: ["UserScenarios", "PerformanceTesting"], keywords: ["system qualification", "user acceptance", "final validation"] } },
      { name: 'ASPICE Project Management Support Agent', type: 'Reporting Agent', config: { focus: "MAN.3, MAN.5", tasks: ["ProgressTracking", "RiskMonitoring", "StatusReporting"], tools: ["Jira_Interface", "Gantt_Generator"], keywords: ["project management", "reporting", "tracking", "risk"] } },
      { name: 'ASPICE Quality Assurance Support Agent', type: 'Custom Logic Agent', config: { focus: "SUP.1, SUP.4", tasks: ["ProcessAudits", "MetricCollection", "ComplianceChecks", "ProblemResolutionTracking"], standards: ["ASPICE", "ISO26262"], keywords: ["quality assurance", "audit", "compliance", "process improvement"] } },
      { name: 'ASPICE Configuration Management Support Agent', type: 'CI/CD Agent', config: { focus: "SUP.8, SUP.9, SUP.10", tools: ["Git", "BaselineManagement"], tasks: ["BaselineCreation", "ChangeRequestProcessing", "VersionControlManagement"], keywords: ["configuration management", "version control", "baselining", "change management"] } },
      { name: 'ASPICE Technical Documentation Agent', type: 'Documentation Agent', config: { focus: "SUP.9", documentTypes: ["RequirementsSpec", "ArchitectureDoc", "DesignDoc", "TestPlan", "TestReport", "UserManual"], outputFormats: ["PDF", "Markdown", "HTML"], standardCompliance: "ASPICE", keywords: ["documentation", "manuals", "specifications", "reports"] } },
    ];
    return aspiceAgentsData.map(agentData => ({
      ...agentData,
      id: uid(`proj-${currentProjectId.slice(-4)}-${agentData.name.toLowerCase().substring(0,3).replace(/\s+/g, '')}`),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    }));
  }, []);

  const initialMockTasksForProject = useCallback((currentProjectId: string, currentProjectName: string): Task[] => {
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
      { id: kickoffMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Project Kick-off`, status: 'Done', assignedTo: 'ASPICE Project Management Support Agent', startDate: format(addDays(todayFormatted, -15), 'yyyy-MM-dd'), durationDays: 0, progress: 100, isMilestone: true, parentId: null, dependencies: [], description: "Official project kick-off milestone achieved. (Corresponds to MAN.3)", isAiPlanned: false  },
      { id: reqTaskId, projectId: currentProjectId, title: `Define ${currentProjectName} Scope & Requirements`, status: 'Done', assignedTo: 'Requirements Engineering Process', startDate: format(addDays(todayFormatted, -14), 'yyyy-MM-dd'), durationDays: 5, progress: 100, isMilestone: false, parentId: null, dependencies: [kickoffMilestoneId], description: "Initial scoping and requirements gathering for the project. (ASPICE SYS.1, SYS.2, SWE.1)", isAiPlanned: false  },
      { id: designTaskId, projectId: currentProjectId, title: `Design ${currentProjectName} Architecture`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(todayFormatted, -9), 'yyyy-MM-dd'), durationDays: 7, progress: 60, isMilestone: false, parentId: null, dependencies: [reqTaskId], description: "High-level and detailed design of the software architecture. (ASPICE SWE.2, SWE.3)", isAiPlanned: false  },
      { id: devTaskId, projectId: currentProjectId, title: `Implement Core Logic for ${currentProjectName}`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(todayFormatted, -2), 'yyyy-MM-dd'), durationDays: 10, progress: 40, parentId: designTaskId, dependencies: [], isMilestone: false, description: "Core development phase, implementing key functionalities. (ASPICE SWE.4)", isAiPlanned: false },
      { id: subTaskApiId, projectId: currentProjectId, parentId: devTaskId, title: `Implement API Endpoints`, status: 'To Do', assignedTo: 'ASPICE Software Detailed Design & Implementation Agent', startDate: format(addDays(todayFormatted, 0), 'yyyy-MM-dd'), durationDays: 3, progress: 0, isMilestone: false, dependencies: [], description: "Develop and unit test the necessary API endpoints for the core logic.", isAiPlanned: false },
      { id: testTaskId, projectId: currentProjectId, title: `Test ${currentProjectName} Integration & Qualification`, status: 'To Do', assignedTo: 'Software Testing & QA Cycle', startDate: format(addDays(todayFormatted, 8), 'yyyy-MM-dd'), durationDays: 5, progress: 0, parentId: null, dependencies: [devTaskId], isMilestone: false, description: "Perform integration testing of developed components and system-level qualification tests. (ASPICE SWE.5, SWE.6)", isAiPlanned: false },
      { id: alphaMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Alpha Release Milestone`, status: 'To Do', assignedTo: 'ASPICE Project Management Support Agent', startDate: format(addDays(todayFormatted, 13), 'yyyy-MM-dd'), durationDays: 0, progress: 0, isMilestone: true, parentId: null, dependencies: [testTaskId], description: "Target date for the Alpha release of the project.", isAiPlanned: false },
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
  }, [uid]);


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
  }, [uid]);

 const initialRequirementDocsData = useCallback((currentProjectId: string): ProjectFile[] => {
    if (!currentProjectId) return [];
    const baseTime = Date.now();
    const aspiceFolders = [
      "SYS.1 Stakeholder Requirements Elicitation",
      "SYS.2 System Requirements Analysis",
      "SYS.3 System Architectural Design",
      "SYS.4 System Integration and Integration Test",
      "SYS.5 System Qualification Test",
      "SWE.1 Software Requirements Analysis",
      "SWE.2 Software Architectural Design",
      "SWE.3 Software Detailed Design and Unit Construction",
      "SWE.4 Software Unit Verification",
      "SWE.5 Software Integration and Integration Test",
      "SWE.6 Software Qualification Test",
      "SUP.1 Quality Assurance",
      "SUP.8 Configuration Management",
      "SUP.9 Problem Resolution Management",
      "SUP.10 Change Request Management",
      "MAN.3 Project Management"
    ];
    return aspiceFolders.map((folderName, index) => ({
        id: uid(`reqdoc-folder-${currentProjectId.slice(-3)}-${folderName.split('.')[0].toLowerCase()}${index}`),
        name: folderName,
        type: 'folder' as 'folder',
        path: '/',
        lastModified: new Date(baseTime - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
        children: []
    })).sort((a,b) => a.name.localeCompare(b.name));
  }, [uid]);


  const initialMockTickets = useCallback((currentProjectId: string): Ticket[] => {
    if (!currentProjectId) return [];
    return [
      { id: uid(`ticket-${currentProjectId.slice(-3)}-001`), projectId: currentProjectId, title: 'Login button unresponsive on Safari', description: 'The main login button does not respond to clicks on Safari browsers. Tested on Safari 15.1.', status: 'Open', priority: 'High', type: 'Bug', createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString() },
      { id: uid(`ticket-${currentProjectId.slice(-3)}-002`), projectId: currentProjectId, title: 'Add export to CSV feature for project reports', description: 'Users need the ability to export project summary reports to CSV format for external analysis.', status: 'Open', priority: 'Medium', type: 'Feature Request', createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { id: uid(`ticket-${currentProjectId.slice(-3)}-003`), projectId: currentProjectId, title: 'API rate limit documentation needs update', description: 'The documentation regarding API rate limits is confusing and needs clarification on burst vs sustained rates.', status: 'In Progress', priority: 'Medium', type: 'Change Request', assignee: 'ASPICE Technical Documentation Agent', createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString() },
    ];
  }, [uid]);


  useEffect(() => {
    if (!projectId || !isClient) return;
    
    console.log(`PROJECT_DETAIL_PAGE: Loading all data for project ID: ${projectId}`);

    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    let currentProjectData: Project | undefined;

    if (allProjectsStored) {
      try {
        const allProjects: Project[] = JSON.parse(allProjectsStored);
        currentProjectData = allProjects.find((p: Project) => p.id === projectId);
      } catch (e) { console.error("PROJECT_DETAIL_PAGE: Error parsing all projects from localStorage:", e); }
    }

    if (!currentProjectData) {
      // Fallback to initialMockProjects if project not found in localStorage
      // This can happen if localStorage was cleared or if the project was created
      // in a session where `PROJECTS_STORAGE_KEY` wasn't populated yet.
      const projectsFromMocks = initialMockProjects || [];
      currentProjectData = projectsFromMocks.find(p => p.id === projectId);
      if (!currentProjectData) {
        console.error(`PROJECT_DETAIL_PAGE: Project with ID ${projectId} not found in localStorage or initial mocks. Redirecting.`);
        if (isClient) router.push('/'); 
        return;
      } else {
        console.warn(`PROJECT_DETAIL_PAGE: Project with ID ${projectId} found in initial mocks, not localStorage.`);
      }
    }
    setProject(currentProjectData);

    const tasksKey = getTasksStorageKey(projectId);
    const storedTasks = localStorage.getItem(tasksKey);
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        setTasks(Array.isArray(parsedTasks) ? parsedTasks : initialMockTasksForProject(projectId, currentProjectData.name));
      } catch (e) {
        console.error(`PROJECT_DETAIL_PAGE: Error parsing tasks from localStorage for project ${projectId}. Initializing with mocks.`, e);
        setTasks(initialMockTasksForProject(projectId, currentProjectData.name));
      }
    } else {
      setTasks(initialMockTasksForProject(projectId, currentProjectData.name));
    }

    const agentsKey = getAgentsStorageKey(projectId);
    const storedProjectAgents = localStorage.getItem(agentsKey);
    if (storedProjectAgents) {
      try {
        const parsedAgents = JSON.parse(storedProjectAgents);
        setProjectAgents(Array.isArray(parsedAgents) && parsedAgents.length > 0 ? parsedAgents : initialProjectScopedMockAgents(projectId));
      } catch (e) {
        console.error(`PROJECT_DETAIL_PAGE: Error parsing project agents from localStorage for project ${projectId}. Initializing with mocks.`, e);
        setProjectAgents(initialProjectScopedMockAgents(projectId));
      }
    } else {
      setProjectAgents(initialProjectScopedMockAgents(projectId));
    }

    const workflowsKey = getWorkflowsStorageKey(projectId);
    const storedWorkflows = localStorage.getItem(workflowsKey);
    if (storedWorkflows) {
      try {
        const parsedWorkflows = JSON.parse(storedWorkflows) as ProjectWorkflow[];
         if (Array.isArray(parsedWorkflows)) {
            setProjectWorkflows(parsedWorkflows.map(wf => ({ ...wf, nodes: wf.nodes || [], edges: wf.edges || [] })));
        } else {
            setProjectWorkflows(predefinedWorkflowsData(projectId));
        }
      } catch (e) {
        console.error(`PROJECT_DETAIL_PAGE: Error parsing project workflows from localStorage for project ${projectId}. Initializing with defaults.`, e);
        setProjectWorkflows(predefinedWorkflowsData(projectId));
      }
    } else {
      setProjectWorkflows(predefinedWorkflowsData(projectId));
    }
    // console.log(`PROJECT_DETAIL_PAGE: Loaded/Initialized ${projectWorkflows.length} workflows for project ${projectId}.`);


    const filesKey = getFilesStorageKey(projectId);
    const storedProjectFiles = localStorage.getItem(filesKey);
    if (storedProjectFiles) {
      try {
        const parsedFiles = JSON.parse(storedProjectFiles);
        const validatedFiles = (files: ProjectFile[]): ProjectFile[] => {
          return files.map(file => ({
            ...file,
            children: file.type === 'folder' ? (validatedFiles(file.children || [])) : undefined, 
          }));
        };
        setProjectFiles(Array.isArray(parsedFiles) ? validatedFiles(parsedFiles) : initialMockFilesData(projectId, currentProjectData?.name));
      } catch (e) {
        console.error(`PROJECT_DETAIL_PAGE: Error parsing project files from localStorage for project ${projectId}. Initializing with mocks.`, e);
        setProjectFiles(initialMockFilesData(projectId, currentProjectData?.name));
      }
    } else {
      setProjectFiles(initialMockFilesData(projectId, currentProjectData?.name));
    }

    const reqDocsKey = getRequirementsStorageKey(projectId);
    const storedReqDocs = localStorage.getItem(reqDocsKey);
    if (storedReqDocs) {
        try {
            const parsedReqDocs = JSON.parse(storedReqDocs);
            const validatedReqDocs = (files: ProjectFile[]): ProjectFile[] => {
                return files.map(file => ({
                    ...file,
                    children: file.type === 'folder' ? (validatedReqDocs(file.children || [])) : undefined,
                }));
            };
            setProjectRequirementDocs(Array.isArray(parsedReqDocs) ? validatedReqDocs(parsedReqDocs) : initialRequirementDocsData(projectId));
        } catch (e) {
            console.error(`PROJECT_DETAIL_PAGE: Error parsing project requirement docs from localStorage for project ${projectId}. Initializing with mocks.`, e);
            setProjectRequirementDocs(initialRequirementDocsData(projectId));
        }
    } else {
        setProjectRequirementDocs(initialRequirementDocsData(projectId));
    }
    
    const ticketsKey = getTicketsStorageKey(projectId);
    const storedTickets = localStorage.getItem(ticketsKey);
    if (storedTickets) {
        try {
            const parsedTickets = JSON.parse(storedTickets);
            setProjectTickets(Array.isArray(parsedTickets) && parsedTickets.length > 0 ? parsedTickets : initialMockTickets(projectId));
        } catch (e) {
            console.error(`PROJECT_DETAIL_PAGE: Error parsing project tickets from localStorage for project ${projectId}. Initializing with mocks.`, e);
            setProjectTickets(initialMockTickets(projectId));
        }
    } else {
        setProjectTickets(initialMockTickets(projectId));
    }
  }, [projectId, isClient, router, initialMockTasksForProject, initialProjectScopedMockAgents, predefinedWorkflowsData, initialMockFilesData, initialRequirementDocsData, initialMockTickets, uid]);


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
        const anyInProgressOrToDo = tasksForThisWorkflow.some(t => t.status === 'In Progress' || t.status === 'To Do');

        if (anyInProgressOrToDo && workflow.status !== 'Active') {
          newStatus = 'Active';
        } else if (allDone && workflow.status === 'Active') {
          newStatus = 'Inactive'; 
        }
      } else if (workflow.status === 'Active') { 
          newStatus = 'Inactive';
      }

      if (newStatus !== workflow.status) {
        if (isClient && project) {
           toast({ title: `Workflow Update for "${project.name}"`, description: `Workflow "${workflow.name}" status changed to ${newStatus}.`});
        }
        wasChanged = true;
        return { ...workflow, status: newStatus, lastRun: (newStatus === 'Active' && workflow.status !== 'Active') ? new Date().toISOString() : workflow.lastRun };
      }
      return workflow;
    });
    return wasChanged ? updatedWorkflows : currentWorkflows;
  }, [isClient, project]); // Removed tasks & projectWorkflows from here, they are parameters now

  useEffect(() => {
    if (!isClient || !project) return;
    const newWorkflows = updateWorkflowStatusBasedOnTasks(tasks, projectWorkflows);
    if (JSON.stringify(newWorkflows) !== JSON.stringify(projectWorkflows)) { 
        setProjectWorkflows(newWorkflows);
    }
  }, [tasks, projectWorkflows, isClient, project, updateWorkflowStatusBasedOnTasks]);


  useEffect(() => {
    if (isClient && project && tasks.length >= 0) { 
      localStorage.setItem(getTasksStorageKey(projectId), JSON.stringify(tasks));
    }
  }, [tasks, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectAgents.length >= 0) { 
       localStorage.setItem(getAgentsStorageKey(projectId), JSON.stringify(projectAgents));
    }
  }, [projectAgents, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectWorkflows.length >= 0) { 
      // console.log(`PROJECT_DETAIL_PAGE: Saving projectWorkflows to localStorage for project ${projectId}`, JSON.stringify(projectWorkflows.map(wf => ({id: wf.id, name: wf.name, nodesCount: wf.nodes?.length || 0, edgesCount: wf.edges?.length || 0}))));
       localStorage.setItem(getWorkflowsStorageKey(projectId), JSON.stringify(projectWorkflows));
    }
  }, [projectWorkflows, projectId, isClient, project]);
  
  useEffect(() => { 
    designingWorkflowIdRef.current = designingWorkflow ? designingWorkflow.id : null;
  }, [designingWorkflow]);

  useEffect(() => {
    const currentDesigningId = designingWorkflowIdRef.current;
    if (currentDesigningId && isClient && projectWorkflows.length > 0) {
        const workflowFromList = projectWorkflows.find(wf => wf.id === currentDesigningId);
        if (workflowFromList) {
            if (JSON.stringify(workflowFromList) !== JSON.stringify(designingWorkflow)) {
                // console.log("PROJECT_DETAIL_PAGE: Syncing designingWorkflow from projectWorkflows state. ID:", currentDesigningId);
                setDesigningWorkflow(JSON.parse(JSON.stringify(workflowFromList))); 
            }
        } else if (designingWorkflow !== null) { 
            // console.log("PROJECT_DETAIL_PAGE: Designing workflow no longer in projectWorkflows list, closing designer. ID was:", currentDesigningId);
            setDesigningWorkflow(null);
        }
    } else if (currentDesigningId && isClient && projectWorkflows.length === 0 && designingWorkflow !== null) {
      setDesigningWorkflow(null);
    }
  }, [projectWorkflows, isClient, designingWorkflow?.id]); 


  useEffect(() => {
    if (isClient && project && projectFiles.length >= 0) { 
      localStorage.setItem(getFilesStorageKey(projectId), JSON.stringify(projectFiles));
    }
  }, [projectFiles, projectId, isClient, project]);
  
  useEffect(() => {
    if (isClient && project && projectRequirementDocs.length >= 0) {
      localStorage.setItem(getRequirementsStorageKey(projectId), JSON.stringify(projectRequirementDocs));
    }
  }, [projectRequirementDocs, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectTickets.length >= 0) {
        localStorage.setItem(getTicketsStorageKey(projectId), JSON.stringify(projectTickets));
    }
  }, [projectTickets, projectId, isClient, project]);

  const formatDate = useCallback((dateString: string | undefined, optionsOrFormatString?: { day?: '2-digit', month?: 'short', year?: 'numeric' } | string) => {
    if (!isClient || !dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'Invalid Date';
      
      if (typeof optionsOrFormatString === 'string') {
        return format(date, optionsOrFormatString); 
      }
      if (optionsOrFormatString && typeof optionsOrFormatString === 'object' && optionsOrFormatString.day && optionsOrFormatString.month && optionsOrFormatString.year) {
        return format(date, 'dd MMM yyyy'); 
      }
      return format(date, 'PPpp'); 
    } catch (e) {
      return dateString;
    }
  }, [isClient]);

  const handleTaskPlannedAndAccepted = useCallback((aiOutput: PlanProjectTaskOutput) => {
    console.log("PROJECT_DETAIL_PAGE: handleTaskPlannedAndAccepted received aiOutput:", JSON.stringify(aiOutput, null, 2));
    if (!project) {
        console.error("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Project not loaded!");
        toast({ title: "Error", description: "Project data not available to add task.", variant: "destructive"});
        return;
    }

    const plannedTaskDataFromAI = aiOutput?.plannedTask || {};
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): plannedTaskDataFromAI (checked):", JSON.stringify(plannedTaskDataFromAI, null, 2));
    
    const aiReasoning = aiOutput?.reasoning || "No reasoning provided by AI.";
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted aiReasoning:", aiReasoning);
    
    const suggestedSubTasksFromAI = plannedTaskDataFromAI?.suggestedSubTasks || [];
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted suggestedSubTasks:", JSON.stringify(suggestedSubTasksFromAI, null, 2));
    
    const subTasksDetailsText = (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0)
      ? `\n\nAI Suggested Sub-Tasks / Steps:\n${suggestedSubTasksFromAI.map((st: any) => `- ${st.title || 'Untitled Sub-task'} (Agent Type: ${st.assignedAgentType || 'N/A'}) - Description: ${st.description || 'No description.'}`).join('\n')}`
      : "\n\nAI Suggested Sub-Tasks / Steps: None specified by AI.";

    const combinedDescription = `AI Reasoning: ${aiReasoning || "AI did not provide specific reasoning."}${subTasksDetailsText}`;
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed combinedDescription (first 100 chars):", combinedDescription.substring(0, 100) + "...");
    
    let mainTask: Task = {
      id: uid(`task-main-${projectId.slice(-4)}`),
      projectId: projectId,
      title: plannedTaskDataFromAI.title || "Untitled AI Task",
      status: plannedTaskDataFromAI.status || 'To Do',
      assignedTo: plannedTaskDataFromAI.assignedTo || "AI Assistant to determine",
      startDate: plannedTaskDataFromAI.startDate && isValid(parseISO(plannedTaskDataFromAI.startDate)) ? plannedTaskDataFromAI.startDate : format(new Date(), 'yyyy-MM-dd'),
      durationDays: plannedTaskDataFromAI.isMilestone ? 0 : (plannedTaskDataFromAI.durationDays === undefined || plannedTaskDataFromAI.durationDays < 1 ? 1 : Math.max(1, plannedTaskDataFromAI.durationDays)),
      progress: plannedTaskDataFromAI.isMilestone ? (plannedTaskDataFromAI.status === 'Done' ? 100 : 0) : (plannedTaskDataFromAI.progress === undefined || plannedTaskDataFromAI.progress === null ? 0 : Math.min(100,Math.max(0,plannedTaskDataFromAI.progress))),
      isMilestone: plannedTaskDataFromAI.isMilestone || false,
      parentId: (plannedTaskDataFromAI.parentId === "null" || plannedTaskDataFromAI.parentId === "" || plannedTaskDataFromAI.parentId === undefined) ? null : plannedTaskDataFromAI.parentId,
      dependencies: plannedTaskDataFromAI.dependencies || [],
      description: combinedDescription,
      isAiPlanned: true,
    };
    
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Main task before agent/workflow check:", JSON.stringify(mainTask, null, 2));

    let newTasksArray: Task[] = [mainTask];
    let autoStarted = false;
    let workflowActivated = false;
    let assignedEntityNameForToast: string | null = null;
    let entityTypeForToast: 'agent' | 'workflow' | null = null;

    if (mainTask.assignedTo && mainTask.assignedTo !== "AI Assistant to determine" && mainTask.assignedTo !== "Unassigned") {
        const assignedWorkflow = projectWorkflows.find(wf => wf.name === mainTask.assignedTo);
        if (assignedWorkflow) {
            entityTypeForToast = 'workflow';
            assignedEntityNameForToast = assignedWorkflow.name;
            if ((assignedWorkflow.status === 'Draft' || assignedWorkflow.status === 'Inactive') && !mainTask.isMilestone && mainTask.status !== 'Done') {
                workflowActivated = true;
            }
        } else {
            const assignedAgent = projectAgents.find(agent => agent.name === mainTask.assignedTo);
            if (assignedAgent && assignedAgent.status === 'Running' && !mainTask.isMilestone && mainTask.status !== 'Done') {
                mainTask.status = 'In Progress';
                mainTask.progress = Math.max(mainTask.progress || 0, 10); 
                autoStarted = true;
                entityTypeForToast = 'agent';
                assignedEntityNameForToast = assignedAgent.name;
                setProjectAgents(prevAgents => prevAgents.map(agent =>
                    agent.id === assignedAgent.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
                ));
            } else if (assignedAgent) {
                entityTypeForToast = 'agent';
                assignedEntityNameForToast = assignedAgent.name;
            }
        }
    }
    
    if (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0) {
        const createdSubTasks = suggestedSubTasksFromAI.map((st: any, index: number) => {
            const subTaskId = uid(`subtask-${mainTask.id.slice(-5)}-${index}`);
            const parentStartDateString = (mainTask.startDate && isValid(parseISO(mainTask.startDate))) 
                                          ? mainTask.startDate 
                                          : format(new Date(), 'yyyy-MM-dd');
            const parentStartDate = parseISO(parentStartDateString);
            const subTaskStartDate = format(addDays(parentStartDate, mainTask.isMilestone ? 0 : (mainTask.dependencies?.length || 0) + index), 'yyyy-MM-dd');

            return {
                id: subTaskId,
                projectId: projectId,
                title: st.title || "Untitled Sub-task",
                status: 'To Do' as TaskStatus, 
                assignedTo: st.assignedAgentType || 'Unassigned', 
                startDate: subTaskStartDate,
                durationDays: 1, 
                progress: 0,
                isMilestone: false,
                parentId: mainTask.id, 
                dependencies: index > 0 && newTasksArray[index] ? [newTasksArray[index].id] : [], 
                description: st.description || "No description provided by AI.",
                isAiPlanned: true, 
            };
        });
        newTasksArray = [mainTask, ...createdSubTasks];

        if (!mainTask.isMilestone && mainTask.status !== 'Done') {
             if (entityTypeForToast === 'workflow' || autoStarted) { 
                mainTask.status = 'In Progress';
                mainTask.progress = Math.max(mainTask.progress || 0, 5); 
                newTasksArray[0] = {...mainTask}; 
            }
        }
    } else if (autoStarted && entityTypeForToast === 'agent') { 
        mainTask.status = 'In Progress';
        mainTask.progress = Math.max(mainTask.progress || 0, 10);
        newTasksArray[0] = {...mainTask};
    }
    
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed mainTask for chat:", JSON.stringify(mainTask, null, 2));
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
        toastDescription += ` ${suggestedSubTasksFromAI.length} sub-task${suggestedSubTasksFromAI.length > 1 ? 's were' : ' was'} also created.`;
    }

    toast({
      title: toastTitle,
      description: toastDescription,
    });
    
    setTimeout(() => {
        setChattingTask(mainTask); 
        setIsChatDialogOpen(true);
    }, 100); 

  }, [project, projectId, toast, projectWorkflows, projectAgents, setTasks, setProjectWorkflows, setProjectAgents, uid]);

  const handleAddTask = useCallback((taskData: Omit<Task, 'id' | 'projectId'>) => {
    if (!project) return;
    const newTask: Task = {
      id: uid(`task-${projectId.slice(-5)}`),
      projectId: projectId,
      ...taskData,
      isAiPlanned: false, 
    };

    let updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    setIsAddTaskDialogOpen(false);

    toast({
        title: "Manual Task Added",
        description: `Task "${newTask.title}" has been added to project "${project.name}".`,
    });

    if (newTask.assignedTo) {
        const assignedWorkflow = projectWorkflows.find(wf => wf.name === newTask.assignedTo);
        if (assignedWorkflow && (assignedWorkflow.status === 'Draft' || assignedWorkflow.status === 'Inactive') && !newTask.isMilestone && newTask.status !== 'Done') {
            setProjectWorkflows(prevWfs =>
                prevWfs.map(wf =>
                    wf.id === assignedWorkflow.id ? { ...wf, status: 'Active', lastRun: new Date().toISOString() } : wf
                )
            );
            toast({
                title: "Workflow Activated",
                description: `Workflow "${assignedWorkflow.name}" was activated by manual task "${newTask.title}".`,
                variant: "default",
            });
        }
    }
  }, [project, projectId, tasks, toast, projectWorkflows, setTasks, setProjectWorkflows, uid]);

  const handleOpenEditTaskDialog = (task: Task, viewMode: boolean = false) => {
    setEditingTask(task);
    setIsViewingTask(viewMode);
    setIsEditTaskDialogOpen(true);
  };

  const handleUpdateTask = (updatedTaskData: Task) => {
    if (!project) return;
    let updatedTasks = tasks.map(task => task.id === updatedTaskData.id ? updatedTaskData : task);
    
    if (updatedTaskData.status === 'Done' && !updatedTaskData.isMilestone) {
        const taskIndex = updatedTasks.findIndex(t => t.id === updatedTaskData.id);
        if (taskIndex !== -1) {
            updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], progress: 100 };
        }
    } else if (updatedTaskData.isMilestone && updatedTaskData.status === 'Done') {
         const taskIndex = updatedTasks.findIndex(t => t.id === updatedTaskData.id);
        if (taskIndex !== -1) {
            updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], progress: 100 };
        }
    } else if (updatedTaskData.isMilestone && updatedTaskData.status !== 'Done') {
         const taskIndex = updatedTasks.findIndex(t => t.id === updatedTaskData.id);
        if (taskIndex !== -1) {
            updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], progress: 0 };
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

      const updatedTasks = tasks
        .filter(task => !tasksToDelete.has(task.id)) 
                               .map(task => {
                                 const newDependencies = task.dependencies?.filter(depId => !tasksToDelete.has(depId));
                                 const newParentId = task.parentId && tasksToDelete.has(task.parentId) ? null : task.parentId;
                                 return { ...task, dependencies: newDependencies, parentId: newParentId };
                               });
      
      setTasks(updatedTasks);
      let deletionMessage = `"${taskToDelete.title}" has been deleted.`;
      const childrenOfDeletingTask = tasks.filter(t => t.parentId === taskToDelete.id && !tasksToDelete.has(t.id)); // Re-filter for accurate count after potential concurrent deletions
      if (childrenOfDeletingTask.length > 0) { // Check if there were actual children before filtering
          const originalChildrenCount = tasks.filter(t => t.parentId === taskToDelete.id).length;
          if (originalChildrenCount > 0) {
            deletionMessage = `"${taskToDelete.title}" and its ${originalChildrenCount} sub-task(s) have been deleted.`;
          }
      }

      toast({
        title: `${taskToDelete.isMilestone ? 'Milestone' : 'Task'} Deleted`,
        description: deletionMessage,
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

    let taskToUpdateIndex = tasks.findIndex(t => t.id === taskId);
    if (taskToUpdateIndex === -1) return;

    let taskToUpdate = { ...tasks[taskToUpdateIndex] };
    let updatedTasksArray = [...tasks];

    if (taskToUpdate.status !== newStatus) { 
        taskToUpdate.status = newStatus;
        taskToUpdate.progress = newStatus === 'Done' ? 100 : ((newStatus === 'To Do' || newStatus === 'Blocked') && !taskToUpdate.isMilestone ? 0 : taskToUpdate.progress);
        
        updatedTasksArray.splice(taskToUpdateIndex, 1); 
        updatedTasksArray.push(taskToUpdate); 

        toast({
            title: "Task Status Updated",
            description: `Task "${taskToUpdate.title}" moved to ${newStatus}.`,
        });
        setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasksArray, prevWorkflows));
        setTasks(updatedTasksArray);

    } else if (sourceTaskStatus === newStatus && !event.dataTransfer.getData('droppedOnCard')) { 
        updatedTasksArray.splice(taskToUpdateIndex, 1);
        updatedTasksArray.push(taskToUpdate); 
        toast({
            title: "Task Reordered",
            description: `Task "${taskToUpdate.title}" moved to the end of "${newStatus}".`,
        });
        setTasks(updatedTasksArray);
    }
    event.dataTransfer.clearData('droppedOnCard'); 
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
    event.dataTransfer.setData('droppedOnCard', 'true'); 

    if (draggedTaskId && draggedTaskId !== targetTask.id && sourceTaskStatus === targetTask.status) {
      setTasks(currentTasks => {
          let reorderedTasks = [...currentTasks];
          const draggedTaskIndex = reorderedTasks.findIndex(t => t.id === draggedTaskId);
          
          if (draggedTaskIndex !== -1) {
            const [draggedItem] = reorderedTasks.splice(draggedTaskIndex, 1);
            const newTargetIndex = reorderedTasks.findIndex(t => t.id === targetTask.id);
            
            if (newTargetIndex !== -1) {
                reorderedTasks.splice(newTargetIndex, 0, draggedItem); 
            } else {
                reorderedTasks.push(draggedItem);
            }
            
            setTimeout(() => { 
              toast({
                title: "Task Reordered",
                description: `Task "${draggedItem.title}" moved within "${targetTask.status}".`,
              });
            },0);
            return reorderedTasks;
          }
          return currentTasks; 
      });
    }
  };

  const handleAISuggestionAccepted = (agentData: Omit<Agent, 'id' | 'status' | 'lastActivity'>) => {
    if (!project) {
      toast({ title: "Error Adding Agent", description: "Project context not found.", variant: "destructive" });
      return;
    }
    console.log("PROJECT_DETAIL_PAGE: handleAISuggestionAccepted - Received agentData:", agentData);
    const newAgent: Agent = {
      ...agentData,
      id: uid(`proj-${projectId.slice(-4)}-agent-ai`),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    
    setProjectAgents(prevAgents => {
      const updatedAgents = [newAgent, ...prevAgents];
      // console.log("PROJECT_DETAIL_PAGE: handleAISuggestionAccepted - Project agents updated:", updatedAgents.map(a => ({id: a.id, name: a.name})));
      return updatedAgents;
    });

    toast({
      title: "AI-Suggested Agent Added",
      description: `Agent "${newAgent.name}" has been added to this project's agents.`,
    });
  };

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
    // console.log("PROJECT_DETAIL_PAGE: Setting designingWorkflow to:", JSON.stringify(workflow, null, 2));
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

  const handleWorkflowNodesChange = useCallback((updatedNodes: WorkflowNode[]) => {
    const currentDesigningWorkflowId = designingWorkflowIdRef.current; 
    // console.log(`PROJECT_DETAIL_PAGE: handleWorkflowNodesChange received updatedNodes. Length: ${updatedNodes.length}, For Designing WF ID (ref): ${currentDesigningWorkflowId}, IDs: ${updatedNodes.map(n=>n.id).join(', ')}`);
    if (currentDesigningWorkflowId) {
      setProjectWorkflows(prevWorkflows => {
        // console.log("PROJECT_DETAIL_PAGE: Inside setProjectWorkflows (nodes). prevWorkflows length:", prevWorkflows.length);
        const newWorkflowsArray = prevWorkflows.map(wf => {
          if (wf.id === currentDesigningWorkflowId) {
            // console.log("PROJECT_DETAIL_PAGE: Updating nodes for workflow ID:", wf.id, ". New nodes count:", updatedNodes.length);
            return { ...wf, nodes: updatedNodes };
          }
          return wf;
        });
        // const updatedWfInNewArray = newWorkflowsArray.find(wf => wf.id === currentDesigningWorkflowId);
        // console.log("PROJECT_DETAIL_PAGE: Workflow in newWorkflows array (after map - nodes). ID:", updatedWfInNewArray?.id, "Nodes count:", updatedWfInNewArray?.nodes?.length, "Nodes IDs:", updatedWfInNewArray?.nodes?.map(n=>n.id).join(', '));
        return newWorkflowsArray;
      });
    } else {
      // console.warn("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange called but no designingWorkflowIdRef.current is set.");
    }
  }, []); 

  const handleWorkflowEdgesChange = useCallback((updatedEdges: WorkflowEdge[]) => {
    const currentDesigningWorkflowId = designingWorkflowIdRef.current;
    // console.log(`PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange received updatedEdges. Length: ${updatedEdges.length}, For Designing WF ID (ref): ${currentDesigningWorkflowId}`);
    if (currentDesigningWorkflowId) {
        setProjectWorkflows(prevWorkflows => {
            // console.log("PROJECT_DETAIL_PAGE: Inside setProjectWorkflows (edges). prevWorkflows length:", prevWorkflows.length);
            const newWorkflowsArray = prevWorkflows.map(wf =>
                wf.id === currentDesigningWorkflowId ? { ...wf, edges: updatedEdges } : wf
            );
            // const updatedWfInNewArray = newWorkflowsArray.find(wf => wf.id === currentDesigningWorkflowId);
            // console.log("PROJECT_DETAIL_PAGE: Workflow in newWorkflows array (after map - edges). ID:", updatedWfInNewArray?.id, "Edges count:", updatedWfInNewArray?.edges?.length);
            return newWorkflowsArray;
        });
    } else {
        // console.warn("PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange called but no designingWorkflowIdRef.current is set.");
    }
  }, []); 

  useEffect(() => {
    const currentDesigningId = designingWorkflowIdRef.current;
    if (currentDesigningId && isClient && projectWorkflows.length > 0) {
        const workflowFromList = projectWorkflows.find(wf => wf.id === currentDesigningId);
        if (workflowFromList) {
            if (JSON.stringify(workflowFromList) !== JSON.stringify(designingWorkflow)) {
                setDesigningWorkflow(JSON.parse(JSON.stringify(workflowFromList))); 
            }
        } else if (designingWorkflow !== null) { 
            setDesigningWorkflow(null);
        }
    } else if (currentDesigningId && isClient && projectWorkflows.length === 0 && designingWorkflow !== null) {
      setDesigningWorkflow(null);
    }
  }, [projectWorkflows, isClient, designingWorkflow?.id]); 


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

  const handleToggleWorkflowStatus = (workflowToToggle: ProjectWorkflow) => {
    setProjectWorkflows(prevWorkflows =>
        prevWorkflows.map(wf => {
            if (wf.id === workflowToToggle.id) {
                const newStatus = wf.status === 'Active' ? 'Inactive' : 'Active';
                toast({
                    title: `Workflow ${newStatus}`,
                    description: `Workflow "${wf.name}" is now ${newStatus}.`
                });
                return { ...wf, status: newStatus, lastRun: newStatus === 'Active' ? new Date().toISOString() : wf.lastRun };
            }
            return wf;
        })
    );
  };

  const handleOpenChatDialog = (task: Task) => {
    // console.log("PROJECT_DETAIL_PAGE: Opening chat for task:", JSON.stringify(task, null, 2));
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
      setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWorkflows));
      return updatedTasks;
    });
  };

  const addFileOrFolderRecursive = useCallback((
    items: ProjectFile[],
    targetPath: string, 
    newItem: ProjectFile
  ): ProjectFile[] => {
    if (targetPath === '/') {
      if (items.some(item => item.name === newItem.name && item.path === '/')) {
        if(isClient) toast({ title: "Error", description: `An item named "${newItem.name}" already exists at the root.`, variant: "destructive" });
        return items;
      }
      return [...items, newItem].sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
    }
  
    return items.map(item => {
      if (item.type === 'folder' && targetPath.startsWith(item.path + item.name + '/')) {
        return {
          ...item,
          children: addFileOrFolderRecursive(item.children || [], targetPath, newItem),
        };
      } else if (item.type === 'folder' && (item.path + item.name + '/') === targetPath) {
        if ((item.children || []).some(child => child.name === newItem.name)) {
          if(isClient) toast({ title: "Error", description: `An item named "${newItem.name}" already exists in ${targetPath}.`, variant: "destructive" });
          return item; 
        }
        return {
          ...item,
          children: [...(item.children || []), newItem].sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
          }),
        };
      }
      return item;
    });
  }, [isClient, toast]);
  
  const getFilesForCurrentPath = useCallback((sourceFiles: ProjectFile[], sourceCurrentPath: string): ProjectFile[] => {
    if (sourceCurrentPath === '/') {
        return sourceFiles.filter(f => f.path === '/').sort((a, b) => {
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });
    }
    const segments = sourceCurrentPath.split('/').filter(s => s);
    let currentLevelFiles = sourceFiles;
    let currentLevelPath = '/';

    for (const segment of segments) {
        const foundFolder = currentLevelFiles.find(f => f.type === 'folder' && f.name === segment && f.path === currentLevelPath);
        if (foundFolder && foundFolder.children) { 
            currentLevelFiles = foundFolder.children;
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
  }, []);

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
      id: uid(`folder-${projectId.slice(-4)}-${newFolderName.replace(/\s+/g, '-')}`),
      name: newFolderName.trim(),
      type: 'folder',
      path: currentFilePath,
      children: [],
      lastModified: new Date().toISOString(),
    };
    
    setProjectFiles(prevFiles => addFileOrFolderRecursive(prevFiles, currentFilePath, newFolder));
    toast({ title: "Folder Created", description: `Folder "${newFolder.name}" created in ${currentFilePath === '/' ? 'root' : currentFilePath}.` });
    
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

    let updatedProjectFilesState = projectFiles; 
    let filesAddedCount = 0;

    files.forEach(file => {
      const newFile: ProjectFile = {
        id: uid(`file-${projectId.slice(-4)}-${file.name.replace(/\s+/g, '-')}`),
        name: file.name,
        type: 'file',
        path: currentFilePath, 
        size: `${(file.size / 1024).toFixed(1)}KB`,
        lastModified: new Date(file.lastModified).toISOString(),
        content: `// Mock content for ${file.name}\n// Actual file content not stored in this prototype for uploaded files.`
      };
      
      const findTargetChildren = (items: ProjectFile[], path: string): ProjectFile[] | undefined => {
          if (path === '/') return items.filter(i => i.path === '/'); 
          const segments = path.split('/').filter(s => s);
          let currentLevel = items;
          let currentPathAccumulator = '/';
          for (const segment of segments) {
              const folder = currentLevel.find(i => i.name === segment && i.path === currentPathAccumulator && i.type === 'folder');
              if (folder) {
                  currentLevel = folder.children || [];
                  currentPathAccumulator += `${segment}/`;
              } else {
                  return undefined; 
              }
          }
          return currentLevel;
      };

      const targetFolderChildren = findTargetChildren(updatedProjectFilesState, currentFilePath);

      if (targetFolderChildren && !targetFolderChildren.some(item => item.name === newFile.name && item.path === newFile.path)) {
        updatedProjectFilesState = addFileOrFolderRecursive(updatedProjectFilesState, currentFilePath, newFile);
        filesAddedCount++;
      } else if (!targetFolderChildren) {
        console.error("Could not find target folder for upload:", currentFilePath);
      } else {
        toast({ title: "Upload Skipped", description: `File "${newFile.name}" already exists in ${currentFilePath === '/' ? 'root' : currentFilePath}.`, variant: "default" });
      }
    });

    if (filesAddedCount > 0) {
      setProjectFiles(updatedProjectFilesState); 
      toast({ title: "Files Uploaded (Mock)", description: `${filesAddedCount} file(s) added to ${currentFilePath === '/' ? 'root' : currentFilePath}.` });
    }
    if(fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const updateFileContentRecursive = useCallback((
    items: ProjectFile[],
    targetFileId: string,
    newContent: string
  ): ProjectFile[] => {
    return items.map(item => {
      if (item.id === targetFileId && item.type === 'file') {
        return { ...item, content: newContent, lastModified: new Date().toISOString() };
      }
      if (item.type === 'folder' && item.children) {
        return { ...item, children: updateFileContentRecursive(item.children, targetFileId, newContent) };
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
      setProjectFiles(prevFiles => updateFileContentRecursive(prevFiles, editingFile.id, editingFileContent));
      toast({ title: "File Saved (Mock)", description: `Content of "${editingFile.name}" updated.` });
      setIsEditFileDialogOpen(false);
      setEditingFile(null);
      setEditingFileContent("");
    }
  };

  const renderProjectFilesRecursive = useCallback((): JSX.Element[] => {
    const filesToRender = getFilesForCurrentPath(projectFiles, currentFilePath);
  
    return filesToRender.map((file) => (
      <TableRow 
        key={file.id} 
        className={cn(
          file.type === 'folder' ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/50'
        )}
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
  }, [projectFiles, currentFilePath, getFilesForCurrentPath, formatDate, handleNavigateFolder, handleOpenEditFileDialog]); 
  
  const displayedFiles = useMemo(() => getFilesForCurrentPath(projectFiles, currentFilePath), [projectFiles, currentFilePath, getFilesForCurrentPath]);

  // Requirements Document Browser Functions
  const addRequirementDocRecursive = useCallback((
    items: ProjectFile[],
    targetPath: string,
    newItem: ProjectFile
  ): ProjectFile[] => {
    if (targetPath === '/') {
      if (items.some(item => item.name === newItem.name && item.path === '/')) {
        if(isClient) toast({ title: "Error", description: `A folder named "${newItem.name}" already exists at the root of requirements.`, variant: "destructive" });
        return items;
      }
      return [...items, newItem].sort((a,b) => a.name.localeCompare(b.name));
    }
    return items.map(item => {
      if (item.type === 'folder' && targetPath.startsWith(item.path + item.name + '/')) {
        return { ...item, children: addRequirementDocRecursive(item.children || [], targetPath, newItem) };
      } else if (item.type === 'folder' && (item.path + item.name + '/') === targetPath) {
        if ((item.children || []).some(child => child.name === newItem.name)) {
          if(isClient) toast({ title: "Error", description: `An item named "${newItem.name}" already exists in ${targetPath}.`, variant: "destructive" });
          return item;
        }
        return { ...item, children: [...(item.children || []), newItem].sort((a,b) => a.name.localeCompare(b.name)) };
      }
      return item;
    });
  }, [isClient, toast]);

  const getRequirementDocsForCurrentPath = useCallback((): ProjectFile[] => {
    if (currentRequirementDocPath === '/') {
      return projectRequirementDocs.filter(f => f.path === '/').sort((a, b) => a.name.localeCompare(b.name));
    }
    const segments = currentRequirementDocPath.split('/').filter(s => s);
    let currentLevelFiles = projectRequirementDocs;
    let currentLevelPath = '/';
    for (const segment of segments) {
      const foundFolder = currentLevelFiles.find(f => f.type === 'folder' && f.name === segment && f.path === currentLevelPath);
      if (foundFolder && foundFolder.children) {
        currentLevelFiles = foundFolder.children;
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
  }, [projectRequirementDocs, currentRequirementDocPath]);

  const handleNavigateRequirementFolder = (folderName: string) => {
    setCurrentRequirementDocPath(prevPath => {
      const normalizedPrevPath = prevPath.endsWith('/') ? prevPath : `${prevPath}/`;
      return `${normalizedPrevPath}${folderName}/`;
    });
  };

  const handleNavigateRequirementUp = () => {
    if (currentRequirementDocPath === '/') return;
    const pathSegments = currentRequirementDocPath.split('/').filter(p => p);
    pathSegments.pop();
    setCurrentRequirementDocPath(`/${pathSegments.join('/')}${pathSegments.length > 0 ? '/' : ''}`);
  };

  const handleCreateNewRequirementFolder = () => {
    if (!newRequirementFolderName.trim()) {
      toast({ title: "Error", description: "Folder name cannot be empty.", variant: "destructive" });
      return;
    }
     if (newRequirementFolderName.includes('/')) {
      toast({ title: "Error", description: "Folder name cannot contain slashes.", variant: "destructive" });
      return;
    }
    const newFolder: ProjectFile = {
      id: uid(`reqdoc-folder-${projectId.slice(-4)}-${newRequirementFolderName.replace(/\s+/g, '-')}`),
      name: newRequirementFolderName.trim(),
      type: 'folder',
      path: currentRequirementDocPath,
      children: [],
      lastModified: new Date().toISOString(),
    };
    setProjectRequirementDocs(prevDocs => addRequirementDocRecursive(prevDocs, currentRequirementDocPath, newFolder));
    toast({ title: "Requirement Folder Created", description: `Folder "${newFolder.name}" created in ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.` });
    setIsNewRequirementFolderDialogOpen(false);
    setNewRequirementFolderName("");
  };
  
  const handleRequirementFileUploadClick = () => {
    requirementFileInputRef.current?.click();
  };

  const handleRequirementFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    let updatedReqDocsState = projectRequirementDocs;
    let filesAddedCount = 0;

    files.forEach(file => {
      const newFile: ProjectFile = {
        id: uid(`reqdoc-file-${projectId.slice(-4)}-${file.name.replace(/\s+/g, '-')}`),
        name: file.name,
        type: 'file',
        path: currentRequirementDocPath,
        size: `${(file.size / 1024).toFixed(1)}KB`,
        lastModified: new Date(file.lastModified).toISOString(),
        content: `// Mock content for requirement document: ${file.name}`
      };
      const currentTargetChildren = getRequirementDocsForCurrentPath(); 
      if (!currentTargetChildren.some(item => item.name === newFile.name && item.path === newFile.path)) {
         updatedReqDocsState = addRequirementDocRecursive(updatedReqDocsState, currentRequirementDocPath, newFile);
         filesAddedCount++;
      } else {
         toast({ title: "Upload Skipped", description: `Document "${newFile.name}" already exists in ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.`, variant: "default" });
      }
    });
    
    if (filesAddedCount > 0) {
        setProjectRequirementDocs(updatedReqDocsState);
        toast({ title: "Requirement Documents Uploaded (Mock)", description: `${filesAddedCount} document(s) added to ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.` });
    }
    if(requirementFileInputRef.current) requirementFileInputRef.current.value = "";
  };
  
  const handleOpenEditRequirementDocDialog = (doc: ProjectFile) => {
    if (doc.type === 'file') {
      setEditingRequirementDoc(doc);
      setEditingRequirementDocContent(doc.content || `// Content for ${doc.name}`);
      setIsEditRequirementDocDialogOpen(true);
    }
  };

  const updateRequirementDocContentRecursive = useCallback((
    items: ProjectFile[],
    targetFileId: string,
    newContent: string
  ): ProjectFile[] => {
    return items.map(item => {
      if (item.id === targetFileId && item.type === 'file') {
        return { ...item, content: newContent, lastModified: new Date().toISOString() };
      }
      if (item.type === 'folder' && item.children) {
        return { ...item, children: updateRequirementDocContentRecursive(item.children, targetFileId, newContent) };
      }
      return item;
    });
  }, []);

  const handleSaveRequirementDocContent = () => {
    if (editingRequirementDoc) {
      setProjectRequirementDocs(prevDocs => updateRequirementDocContentRecursive(prevDocs, editingRequirementDoc.id, editingRequirementDocContent));
      toast({ title: "Requirement Document Saved (Mock)", description: `Content of "${editingRequirementDoc.name}" updated.` });
      setIsEditRequirementDocDialogOpen(false);
      setEditingRequirementDoc(null);
      setEditingRequirementDocContent("");
    }
  };
  
  const renderRequirementDocsRecursive = useCallback((): JSX.Element[] => {
    const docsToRender = getRequirementDocsForCurrentPath();
    return docsToRender.map((doc) => (
        <TableRow 
            key={doc.id} 
            className={doc.type === 'folder' ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/50'} 
            onClick={() => doc.type === 'folder' ? handleNavigateRequirementFolder(doc.name) : handleOpenEditRequirementDocDialog(doc)}
        >
            <TableCell>
            <div className="flex items-center">
                {doc.type === 'folder' 
                ? <FolderIcon className="h-4 w-4 mr-2 text-sky-500" /> 
                : <FileIcon className="h-4 w-4 mr-2 text-gray-500" />}
                {doc.name}
            </div>
            </TableCell>
            <TableCell className="text-muted-foreground uppercase text-xs">{doc.type}</TableCell>
            <TableCell className="text-muted-foreground">{doc.size || '-'}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(doc.lastModified, 'dd MMM yyyy')}</TableCell>
            <TableCell className="text-right">
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={(e) => {e.stopPropagation(); if(doc.type === 'file') handleOpenEditRequirementDocDialog(doc); else handleNavigateRequirementFolder(doc.name);}} >
                <Edit2 className="mr-1 h-3 w-3"/> {doc.type === 'file' ? 'Edit' : 'Open'}
            </Button>
            </TableCell>
        </TableRow>
    ));
  }, [projectRequirementDocs, currentRequirementDocPath, getRequirementDocsForCurrentPath, formatDate, handleNavigateRequirementFolder, handleOpenEditRequirementDocDialog]);

  const displayedRequirementDocs = useMemo(() => getRequirementDocsForCurrentPath(), [projectRequirementDocs, currentRequirementDocPath, getRequirementDocsForCurrentPath]);


  const handleAddNewTicket = (ticketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'>) => {
    if (!project) return;
    const newTicket: Ticket = {
      ...ticketData,
      id: uid(`ticket-${projectId.slice(-3)}`),
      projectId,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
    };
    setProjectTickets(prevTickets => [newTicket, ...prevTickets].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()));
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
                 .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
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

  const handleOpenAITaskPlannerDialog = useCallback((ticketContext?: { title: string; description: string }) => {
    if (ticketContext) {
      const goal = `Address Ticket ID (mock): ${uid('tck').slice(-4)}\nTicket Title: ${ticketContext.title}\n\nTicket Description:\n${ticketContext.description}`;
      setAiPlannerPrefillGoal(goal);
    } else {
      setAiPlannerPrefillGoal(undefined);
    }
    setIsAITaskPlannerDialogOpen(true);
  }, [uid]); // uid is a dependency

  const filteredTickets = useMemo(() => {
    const sortedTickets = [...projectTickets].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    if (selectedTicketTypeFilter === 'All') {
      return sortedTickets;
    }
    return sortedTickets.filter(ticket => ticket.type === selectedTicketTypeFilter);
  }, [projectTickets, selectedTicketTypeFilter]);

  const handleGanttTaskReorder = useCallback((draggedTaskId: string, targetTaskId: string) => {
    setTasks(currentTasks => {
      const reorderedTasks = [...currentTasks]; 
      const draggedTaskIndex = reorderedTasks.findIndex(t => t.id === draggedTaskId);
      let targetTaskIndex = reorderedTasks.findIndex(t => t.id === targetTaskId);

      if (draggedTaskIndex === -1 || targetTaskIndex === -1) {
        // console.warn("Gantt Reorder: Dragged or target task not found. Aborting.");
        return currentTasks; 
      }

      const [draggedItem] = reorderedTasks.splice(draggedTaskIndex, 1);
      
      const newTargetIndex = reorderedTasks.findIndex(t => t.id === targetTaskId);
      if (newTargetIndex !== -1) {
         reorderedTasks.splice(newTargetIndex, 0, draggedItem);
      } else {
        reorderedTasks.push(draggedItem); 
        // console.warn("Gantt Reorder: Target task index issue after splice, appended to end.");
      }
      
      setTimeout(() => { 
        toast({
          title: "Task Order Updated",
          description: "Gantt chart task order has been updated.",
        });
      }, 0);
      return reorderedTasks;
    });
  }, [toast]); // Removed tasks from dependency array as it's accessed via setState callback
  
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
                sizes="(max-width: 639px) 64px, (min-width: 640px) 80px, (min-width: 768px) 96px"
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
        <TabsList className="grid w-full grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-6 sm:mb-4">
          <TabsTrigger value="taskManagement"><ListChecks className="mr-1.5 h-4 w-4"/>Task Management</TabsTrigger>
          <TabsTrigger value="projectAssets"><FolderGit2 className="mr-1.5 h-4 w-4"/>Project Assets</TabsTrigger>
          <TabsTrigger value="aiAutomation"><Brain className="mr-1.5 h-4 w-4"/>AI & Automation</TabsTrigger>
          <TabsTrigger value="tickets"><TicketIcon className="mr-1.5 h-4 w-4"/>Tickets</TabsTrigger>
          {/* KPI Tab Placeholder - to be uncommented when ready
          <TabsTrigger value="kpis"><TrendingUp className="mr-1.5 h-4 w-4"/>KPIs</TabsTrigger>
          */}
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" className="w-full mt-2 sm:w-auto sm:mt-0">
                                <PlusSquare className="mr-2 h-4 w-4" /> Create New Task <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenAITaskPlannerDialog()}>
                                <Brain className="mr-2 h-4 w-4" /> Plan Task with AI
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsAddTaskDialogOpen(true)}>
                                <FilePlus2 className="mr-2 h-4 w-4" /> Add Manual Task
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                                <ProjectGanttChartView 
                                  tasks={tasks} 
                                  onUpdateTask={handleUpdateTask} 
                                  onTasksReorder={handleGanttTaskReorder} 
                                />
                            ) : (
                                <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md bg-muted/20">
                                    <GanttChartSquare className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                    <p className="mb-2 font-medium">No tasks defined for this project yet.</p>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="default" variant="default">
                                                <PlusSquare className="mr-2 h-4 w-4"/>Add First Task <ChevronDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center">
                                            <DropdownMenuItem onClick={() => handleOpenAITaskPlannerDialog()}>
                                                <Brain className="mr-2 h-4 w-4" /> Plan with AI
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setIsAddTaskDialogOpen(true)}>
                                                <FilePlus2 className="mr-2 h-4 w-4" /> Add Manually
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="board" className="mt-0 p-1 sm:p-2 md:p-3">
                            {tasks.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md bg-muted/20">
                                    <ListChecks className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                    <p className="mb-2 font-medium">No tasks to display on the board.</p>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="default" variant="default">
                                                <PlusSquare className="mr-2 h-4 w-4"/>Add First Task <ChevronDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center">
                                            <DropdownMenuItem onClick={() => handleOpenAITaskPlannerDialog()}>
                                                <Brain className="mr-2 h-4 w-4" /> Plan with AI
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setIsAddTaskDialogOpen(true)}>
                                                <FilePlus2 className="mr-2 h-4 w-4" /> Add Manually
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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
                                            {status} ({tasks.filter(task => task.status === status && !task.isMilestone).length})
                                        </div>
                                        <ScrollArea className="h-[calc(100vh-14rem-14rem)] min-h-[200px]"> 
                                          <div className="space-y-2 p-2">
                                            {tasks
                                                .filter(task => task.status === status)
                                                .map(task => (
                                                <KanbanTaskCard
                                                    key={task.id}
                                                    task={task}
                                                    isDragging={false} 
                                                    isDragTarget={reorderTargetTaskId === task.id}
                                                    isParentTask={tasks.some(t => t.parentId === task.id)}
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
                    <CardDescription className="text-xs sm:text-sm">Manage project requirements documentation and repository files.</CardDescription>
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
                                        <CardTitle className="text-xl">Requirements Documents (ASPICE Structure)</CardTitle>
                                        <CardDescription>Manage requirement specifications and related documents, organized by ASPICE process areas.</CardDescription>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                        <Button variant="outline" size="sm" onClick={() => setIsViewTraceabilityMatrixDialogOpen(true)}  className="w-full sm:w-auto">
                                          <ExternalLink className="mr-2 h-4 w-4" /> View Traceability Matrix
                                        </Button>
                                        <Button variant="default" size="sm" onClick={() => { if(isClient) toast({ title: "Add Requirement Document (Placeholder)", description: "This functionality is planned for future implementation."});}} className="w-full sm:w-auto">
                                            <FilePlus2 className="mr-2 h-4 w-4"/> New Requirement Document
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="mb-2 flex items-center gap-2 text-sm">
                                    {currentRequirementDocPath !== '/' && (
                                        <Button variant="ghost" size="sm" onClick={handleNavigateRequirementUp} className="text-muted-foreground hover:text-foreground">
                                        <ArrowLeftCircle className="mr-2 h-4 w-4" /> Up One Level
                                        </Button>
                                    )}
                                    <span className="text-muted-foreground">Current Path:</span> <span className="font-mono bg-muted px-1.5 py-0.5 rounded-sm">{currentRequirementDocPath}</span>
                                    </div>
                                    {displayedRequirementDocs.length > 0 ? (
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
                                        {renderRequirementDocsRecursive()}
                                        </TableBody>
                                    </Table>
                                    ) : (
                                    <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md bg-muted/20">
                                        <ClipboardList className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                        <p className="mb-2 font-medium">This requirement folder is empty.</p>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={handleRequirementFileUploadClick}>
                                                <UploadCloud className="mr-2 h-4 w-4" /> Upload Document
                                            </Button>
                                            <Button variant="default" size="sm" onClick={() => {setNewRequirementFolderName(""); setIsNewRequirementFolderDialogOpen(true);}}>
                                                <FolderPlus className="mr-2 h-4 w-4"/>Create Folder
                                            </Button>
                                        </div>
                                    </div>
                                    )}
                                    <input type="file" multiple ref={requirementFileInputRef} style={{ display: 'none' }} onChange={handleRequirementFileSelect} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="repository" className="mt-0 p-3 sm:p-4 md:p-6">
                           <Card>
                              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div>
                                  <CardTitle className="text-xl">Project Repository</CardTitle>
                                  <CardDescription>Browse and manage general project files.</CardDescription>
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
                                      {renderProjectFilesRecursive()}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md bg-muted/20">
                                    <FolderClosed className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                    <p className="mb-2 font-medium">This folder is empty.</p>
                                    <div className="flex gap-2 mt-2">
                                        <Button variant="outline" size="sm" onClick={handleFileUploadClick}>
                                            <UploadCloud className="mr-2 h-4 w-4" /> Upload Files
                                        </Button>
                                        <Button variant="default" size="sm" onClick={() => {setNewFolderName(""); setIsNewFolderDialogOpen(true);}}>
                                            <FolderPlus className="mr-2 h-4 w-4"/>Create Folder
                                        </Button>
                                    </div>
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
                                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-[200px] bg-muted/20">
                                            <WorkflowIcon className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                            <p className="mb-2 font-medium">No workflows defined for this project yet.</p>
                                            <Button size="default" variant="default" onClick={() => setIsAddWorkflowDialogOpen(true)}>
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
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenAITaskPlannerDialog({title: ticket.title, description: ticket.description})}>
                                <Brain className="mr-2 h-4 w-4" /> Plan Task from Ticket
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEditTicketDialog(ticket)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Edit Ticket
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive hover:!bg-destructive/10 hover:!text-destructive" onClick={() => handleOpenDeleteTicketDialog(ticket)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Ticket
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md bg-muted/20">
                  <TicketIcon className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                  <p className="mb-2 font-medium">
                    {selectedTicketTypeFilter === 'All' ? 'No tickets found for this project.' : `No '${selectedTicketTypeFilter}' tickets found.`}
                  </p>
                   <Button size="default" variant="default" onClick={() => setIsAddTicketDialogOpen(true)}>
                      <PlusSquare className="mr-2 h-4 w-4"/>Add First Ticket
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <Card className="bg-muted/20">
                        <CardHeader><CardTitle className="text-sm">Ticket Detail View (Placeholder)</CardTitle></CardHeader>
                        <CardContent><p className="text-xs text-muted-foreground">Selected ticket details will appear here when implemented.</p></CardContent>
                    </Card>
                     <Card className="bg-muted/20">
                        <CardHeader><CardTitle className="text-sm">Status Workflow Visualizer (Placeholder)</CardTitle></CardHeader>
                        <CardContent><p className="text-xs text-muted-foreground">A visual representation of ticket status transitions will be shown here.</p></CardContent>
                    </Card>
                     <Card className="bg-muted/20">
                        <CardHeader><CardTitle className="text-sm">AI Suggestion Panel (Placeholder)</CardTitle></CardHeader>
                        <CardContent><p className="text-xs text-muted-foreground">AI insights and suggestions for this ticket will appear here.</p></CardContent>
                    </Card>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* KPI Tab - Placeholder */}
        <TabsContent value="kpis" className="mt-8 sm:mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Key Performance Indicators</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Track project performance and key metrics.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">KPI visualizations will be displayed here.</p>
                    {/* Add mock charts or data points later */}
                </CardContent>
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
          projectWorkflows={projectWorkflows.map(wf => ({ id: wf.id, name: wf.name, description: wf.description, nodes: (wf.nodes || []).map(n => ({ id: n.id, name: n.name, type: n.type })) }))}
          onTaskPlannedAndAccepted={handleTaskPlannedAndAccepted}
          initialGoal={aiPlannerPrefillGoal}
        />
      )}
       {isAddTaskDialogOpen && (
        <AddTaskDialog
            open={isAddTaskDialogOpen}
            onOpenChange={setIsAddTaskDialogOpen}
            onAddTask={handleAddTask}
            projectTasks={tasks}
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
      {isAddAgentDialogOpen && (
          <AddAgentDialog
            open={isAddAgentDialogOpen}
            onOpenChange={setIsAddAgentDialogOpen}
            onAddAgent={handleAddProjectAgent}
            projectId={projectId}
        />
      )}
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
      {isAddWorkflowDialogOpen && (
        <AddWorkflowDialog
            open={isAddWorkflowDialogOpen}
            onOpenChange={setIsAddWorkflowDialogOpen}
            onAddWorkflow={handleAddProjectWorkflow}
        />
      )}
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
              <AlertDialogTitle>Create New Folder (Repository)</AlertDialogTitle>
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
        <Dialog open={isEditFileDialogOpen} onOpenChange={(open) => {
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
        </Dialog>
      )}
      {/* Requirements Document Management Dialogs */}
      {isNewRequirementFolderDialogOpen && (
        <AlertDialog open={isNewRequirementFolderDialogOpen} onOpenChange={setIsNewRequirementFolderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create New Requirement Folder</AlertDialogTitle>
              <AlertDialogDescription>
                Enter a name for the new folder in: <span className="font-mono bg-muted px-1 py-0.5 rounded-sm">{currentRequirementDocPath}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Input
                value={newRequirementFolderName}
                onChange={(e) => setNewRequirementFolderName(e.target.value)}
                placeholder="Folder name (e.g., SYS.4 System Integration)"
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsNewRequirementFolderDialogOpen(false); setNewRequirementFolderName(""); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCreateNewRequirementFolder}>Create Folder</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
       {editingRequirementDoc && isEditRequirementDocDialogOpen && (
        <Dialog open={isEditRequirementDocDialogOpen} onOpenChange={(open) => {
            setIsEditRequirementDocDialogOpen(open);
            if (!open) {
                setEditingRequirementDoc(null);
                setEditingRequirementDocContent("");
            }
        }}>
            <ShadCnDialogContent className="sm:max-w-2xl flex flex-col h-[70vh]">
                <ShadCnDialogHeader>
                    <ShadCnDialogTitle>Edit Requirement Document: {editingRequirementDoc.name}</ShadCnDialogTitle>
                    <ShadCnDialogDescription>Path: {editingRequirementDoc.path}{editingRequirementDoc.name}</ShadCnDialogDescription>
                </ShadCnDialogHeader>
                <Textarea
                    value={editingRequirementDocContent}
                    onChange={(e) => setEditingRequirementDocContent(e.target.value)}
                    className="flex-grow resize-none font-mono text-xs"
                    placeholder="// Start typing requirement document content..."
                />
                <ShadCnDialogFooter>
                    <Button variant="outline" onClick={() => {
                        setIsEditRequirementDocDialogOpen(false);
                        setEditingRequirementDoc(null);
                        setEditingRequirementDocContent("");
                    }}>Cancel</Button>
                    <Button onClick={handleSaveRequirementDocContent}>Save Changes</Button>
                </ShadCnDialogFooter>
            </ShadCnDialogContent>
        </Dialog>
      )}
       {isViewTraceabilityMatrixDialogOpen && (
        <AlertDialog open={isViewTraceabilityMatrixDialogOpen} onOpenChange={setIsViewTraceabilityMatrixDialogOpen}>
            <AlertDialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><ExternalLink className="mr-2 h-5 w-5"/>Traceability Matrix (Placeholder)</AlertDialogTitle>
                    <AlertDialogDescription>
                        This view will show links between requirements documents, tasks, and potentially other artifacts like test cases or tickets.
                        Below is a basic list of current requirement documents and tasks for this project.
                        Full interactive traceability and linking is a future enhancement.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-4 py-2 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Requirement Documents (Folders & Files):</h4>
                      {projectRequirementDocs.length > 0 ? (
                        <ul className="list-disc list-inside text-xs space-y-1 pl-4">
                          {projectRequirementDocs.filter(d => d.path === '/').map(doc => (
                            <li key={doc.id} className="text-muted-foreground">
                              <span className="font-medium">{doc.name}</span> ({doc.type})
                              {doc.children && doc.children.length > 0 && (
                                <ul className="list-['-_'] list-inside pl-4">
                                  {doc.children.map(child => <li key={child.id}>{child.name} ({child.type})</li>)}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-xs text-muted-foreground italic">No requirement documents defined yet.</p>}
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Tasks & Milestones:</h4>
                      {tasks.length > 0 ? (
                        <ul className="list-disc list-inside text-xs space-y-1 pl-4">
                          {tasks.map(task => <li key={task.id} className="text-muted-foreground">{task.title} <Badge variant="outline" size="sm" className={cn(taskStatusColors[task.status])}>{task.status}</Badge> {task.isMilestone ? <Badge variant="secondary" size="sm">Milestone</Badge> : ''}</li>)}
                        </ul>
                       ) : <p className="text-xs text-muted-foreground italic">No tasks defined for this project.</p>}
                    </div>
                     <Separator />
                     <div>
                      <h4 className="font-semibold mb-2">Tickets:</h4>
                      {projectTickets.length > 0 ? (
                        <ul className="list-disc list-inside text-xs space-y-1 pl-4">
                          {projectTickets.map(ticket => <li key={ticket.id} className="text-muted-foreground">{ticket.title} <Badge variant="outline" size="sm" className={cn(ticketStatusColors[ticket.status])}>{ticket.status}</Badge> <Badge variant="outline" size="sm" className={cn("capitalize", ticketTypeColors[ticket.type])}>{ticket.type}</Badge></li>)}
                        </ul>
                       ) : <p className="text-xs text-muted-foreground italic">No tickets created for this project.</p>}
                    </div>
                  </div>
                </ScrollArea>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setIsViewTraceabilityMatrixDialogOpen(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
      {/* Ticket Dialogs */}
      {isAddTicketDialogOpen && (
        <AddTicketDialog
            open={isAddTicketDialogOpen}
            onOpenChange={setIsAddTicketDialogOpen}
            onAddTicket={handleAddNewTicket}
        />
      )}
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
// End of file
}
// Ensuring no trailing characters or comments after this line
