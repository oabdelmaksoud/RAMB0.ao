
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, Eye, SlidersHorizontal, Lightbulb, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, X as XIcon, Diamond, Users, FolderGit2, MessageSquare, Settings, Brain, PlusSquare, Edit2, Files, FolderClosed, Folder as FolderIcon, File as FileIcon, UploadCloud, FolderPlus, ArrowLeftCircle, InfoIcon, ClipboardList, ChevronDown, ChevronRight, Play, Paperclip, TicketIcon, ExternalLink, Loader2, CheckSquare, MoreVertical } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback, useRef, useMemo, Fragment } from 'react';
import type { Project, Task, Agent, ProjectWorkflow, WorkflowNode, WorkflowEdge, ProjectFile, Requirement, RequirementStatus, RequirementPriority, Ticket, TicketStatus, TicketPriority, TicketType, TaskStatus, ProjectStatus } from '@/types';
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
} from "@/components/ui/dialog"; // Standard Dialog import
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import AddTaskDialog from '@/components/features/projects/AddTaskDialog';
import EditTaskDialog from '@/components/features/projects/EditTaskDialog';
import EditProjectDialog from '@/components/features/projects/EditProjectDialog';
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
// import AddRequirementDialog from '@/components/features/requirements/AddRequirementDialog'; // No longer used
import AddTicketDialog from '@/components/features/tickets/AddTicketDialog';
import EditTicketDialog from '@/components/features/tickets/EditTicketDialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlanProjectTaskOutput, WorkflowNode as AIWorkflowNode } from '@/ai/flows/plan-project-task-flow';
import { projectStatuses as projectStatusEnumArray } from '@/types';


const projectStatusColors: { [key in ProjectStatus]: string } = {
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
  const [isAddProjectAgentDialogOpen, setIsAddProjectAgentDialogOpen] = useState(false);
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

  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);


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
          { name: 'Elicit Stakeholder Needs', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SYS.1" }, x: 50, y: 50 },
          { name: 'Analyze System Requirements', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SYS.2" }, x: 300, y: 50 },
          { name: 'Specify Software Requirements', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SWE.1" }, x: 50, y: 170 },
          { name: 'Validate Requirements', type: 'ASPICE Quality Assurance Support Agent', config: { reviewType: 'peer', against: "StakeholderNeeds" }, x: 300, y: 170 }
        ],
        [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 2 }, { sourceIndex: 2, targetIndex: 3 }]
      ),
      createWorkflow(
        "Software Design & Implementation Cycle",
        "Covers software architectural design, detailed design, coding, and unit testing. (ASPICE SWE.2, SWE.3, SWE.4)",
        [
          { name: 'Define Software Architecture', type: 'ASPICE Software Architectural Design Agent', config: { activity: "SWE.2", diagramTool: "PlantUML" }, x: 50, y: 50 },
          { name: 'Detailed Software Design', type: 'ASPICE Software Detailed Design & Implementation Agent', config: { activity: "SWE.3" }, x: 300, y: 50 },
          { name: 'Implement Software Units', type: 'ASPICE Software Detailed Design & Implementation Agent', config: { activity: "SWE.4", language: "TypeScript" }, x: 50, y: 170 },
          { name: 'Verify Software Units', type: 'ASPICE Software Unit Verification Agent', config: { activity: "SWE.4", framework: "Jest" }, x: 300, y: 170 }
        ],
        [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 2 }, { sourceIndex: 2, targetIndex: 3 }]
      ),
      createWorkflow(
        "Software Testing & QA Cycle",
        "Manages integration testing, system testing, and quality assurance activities. (ASPICE SWE.5, SWE.6, SUP.1)",
        [
          { name: 'Plan Software Integration Tests', type: 'ASPICE Software Integration Testing Agent', config: { activity: "SWE.5 Test Planning" }, x: 50, y: 50 },
          { name: 'Execute Software Integration Tests', type: 'ASPICE Software Integration Testing Agent', config: { activity: "SWE.5 Execution" }, x: 300, y: 50 },
          { name: 'Plan Software Qualification Tests', type: 'ASPICE Software Qualification Testing Agent', config: { activity: "SWE.6 Test Planning" }, x: 50, y: 170 },
          { name: 'Execute Software Qualification Tests', type: 'ASPICE Software Qualification Testing Agent', config: { activity: "SWE.6 Execution" }, x: 300, y: 170 },
          { name: 'Log Defects & Report (QA)', type: 'ASPICE Quality Assurance Support Agent', config: { activity: "SUP.1 Quality Assurance" }, x: 175, y: 290 }
        ],
        [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 4 }, { sourceIndex: 2, targetIndex: 3 }, { sourceIndex: 3, targetIndex: 4 }]
      ),
      createWorkflow(
        "Project Monitoring & Reporting",
        "Collects project metrics, monitors progress, and generates status reports. (ASPICE MAN.3, MAN.5)",
        [
          { name: 'Gather Progress Data', type: 'ASPICE Project Management Support Agent', config: { activity: "MAN.3 Progress Monitoring" }, x: 50, y: 50 },
          { name: 'Analyze Project Metrics', type: 'ASPICE Project Management Support Agent', config: { activity: "MAN.3 Metric Analysis" }, x: 300, y: 50 },
          { name: 'Generate Status Report', type: 'ASPICE Project Management Support Agent', config: { activity: "MAN.3 Reporting" }, x: 50, y: 170 },
          { name: 'Identify & Log Risks', type: 'ASPICE Project Management Support Agent', config: { activity: "MAN.5 Risk Identification" }, x: 300, y: 170 }
        ],
        [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 2 }, { sourceIndex: 1, targetIndex: 3 }]
      ),
    ];
  }, []);

  const initialMockFilesData = useCallback((currentProjectId: string, currentProjectName: string | undefined): ProjectFile[] => {
    if (!currentProjectId || !currentProjectName) return [];
    return [
      { id: uid(`file-proj-${currentProjectId.slice(-4)}-doc`), name: 'Project_Charter.docx', type: 'file', path: '/', size: '1.2MB', lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), content: "This is the project charter document for " + (currentProjectName) + "." },
      {
        id: uid(`folder-proj-${currentProjectId.slice(-4)}-req`), name: 'Requirements', type: 'folder', path: '/', lastModified: new Date().toISOString(), children: [
          { id: uid(`file-proj-${currentProjectId.slice(-4)}-srs`), name: 'SRS_v1.0.docx', type: 'file', path: '/Requirements/', size: '850KB', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), content: "System Requirements Specification v1.0 for " + (currentProjectName) + "." },
        ]
      },
      {
        id: uid(`folder-proj-${currentProjectId.slice(-4)}-design`), name: 'Design', type: 'folder', path: '/', lastModified: new Date().toISOString(), children: [
          { id: uid(`file-proj-${currentProjectId.slice(-4)}-sad`), name: 'SAD_v1.0.pdf', type: 'file', path: '/Design/', size: '2.5MB', lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), content: "Software Architecture Document v1.0 - PDF Content Placeholder for " + (currentProjectName) + "." },
          {
            id: uid(`folder-proj-${currentProjectId.slice(-4)}-sdd`), name: 'SDD', type: 'folder', path: '/Design/', lastModified: new Date().toISOString(), children: [
              { id: uid(`file-proj-${currentProjectId.slice(-4)}-sdd-compA`), name: 'ComponentA_Design.docx', type: 'file', path: '/Design/SDD/', size: '400KB', lastModified: new Date().toISOString(), content: "Detailed design for Component A of " + (currentProjectName) + "." },
            ]
          },
        ]
      },
      { id: uid(`folder-proj-${currentProjectId.slice(-4)}-src`), name: 'SourceCode', type: 'folder', path: '/', lastModified: new Date().toISOString(), children: [] },
      {
        id: uid(`folder-proj-${currentProjectId.slice(-4)}-test`), name: 'Test', type: 'folder', path: '/', lastModified: new Date().toISOString(), children: [
          { id: uid(`file-proj-${currentProjectId.slice(-4)}-testplan`), name: 'MasterTestPlan.docx', type: 'file', path: '/Test/', size: '300KB', lastModified: new Date().toISOString(), content: "Master Test Plan document for " + (currentProjectName) + "." },
        ]
      },
      { id: uid(`file-proj-${currentProjectId.slice(-4)}-notes`), name: 'MeetingNotes_ProjectKickoff.txt', type: 'file', path: '/', size: '5KB', lastModified: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), content: "Notes from the project kickoff meeting for " + (currentProjectName) + "." },
    ];
  }, [project?.name]); // Depend on project.name for re-memoization if project changes

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
  }, []);

  const initialMockTickets = useCallback((currentProjectId: string): Ticket[] => {
    if (!currentProjectId) return [];
    return [
      { id: uid(`ticket-${currentProjectId.slice(-3)}-001`), projectId: currentProjectId, title: 'Login button unresponsive on Safari', description: 'The main login button does not respond to clicks on Safari browsers. Tested on Safari 15.1.', status: 'Open', priority: 'High', type: 'Bug', createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString() },
      { id: uid(`ticket-${currentProjectId.slice(-3)}-002`), projectId: currentProjectId, title: 'Add export to CSV feature for project reports', description: 'Users need the ability to export project summary reports to CSV format for external analysis.', status: 'Open', priority: 'Medium', type: 'Feature Request', createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { id: uid(`ticket-${currentProjectId.slice(-3)}-003`), projectId: currentProjectId, title: 'API rate limit documentation needs update', description: 'The documentation regarding API rate limits is confusing and needs clarification on burst vs sustained rates.', status: 'In Progress', priority: 'Medium', type: 'Change Request', assignee: 'ASPICE Technical Documentation Agent', createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString() },
    ];
  }, []);

  // Main data loading effect
  useEffect(() => {
    if (!projectId || !isClient) return;
    console.log(`PROJECT_DETAIL_PAGE: Loading data for projectId: ${projectId}`);

    let currentProjectData: Project | null = null;
    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);

    if (allProjectsStored) {
      try {
        const allProjects: Project[] = JSON.parse(allProjectsStored);
        currentProjectData = allProjects.find((p: Project) => p.id === projectId) || null;
      } catch (e) { console.error("PROJECT_DETAIL_PAGE: Error parsing all projects from localStorage:", e); }
    }

    if (!currentProjectData) {
      console.log(`PROJECT_DETAIL_PAGE: Project with ID ${projectId} not found in localStorage, attempting to find in initialMockProjects.`);
      currentProjectData = initialMockProjects.find(p => p.id === projectId) || null;
      if (!currentProjectData) {
        console.error(`PROJECT_DETAIL_PAGE: Project with ID ${projectId} not found in initial mocks either. Redirecting...`);
        if (isClient) router.push('/'); 
        return;
      }
    }
    console.log(`PROJECT_DETAIL_PAGE: Successfully found/loaded project:`, { id: currentProjectData.id, name: currentProjectData.name });
    setProject(currentProjectData);

    // Load Tasks
    const tasksKey = getTasksStorageKey(projectId);
    const storedTasks = localStorage.getItem(tasksKey);
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        console.log(`PROJECT_DETAIL_PAGE: Loaded tasks for project ${projectId} from localStorage (count: ${parsedTasks.length})`);
        setTasks(parsedTasks);
      }
      catch (e) {
        console.warn(`PROJECT_DETAIL_PAGE: Error parsing tasks for project ${projectId}, initializing. Error:`, e);
        const initTasks = initialMockTasksForProject(projectId, currentProjectData!.name);
        setTasks(initTasks);
        localStorage.setItem(tasksKey, JSON.stringify(initTasks));
      }
    } else {
      console.log(`PROJECT_DETAIL_PAGE: No tasks found for project ${projectId} in localStorage, initializing.`);
      const initTasks = initialMockTasksForProject(projectId, currentProjectData!.name);
      setTasks(initTasks);
      localStorage.setItem(tasksKey, JSON.stringify(initTasks));
    }

    // Load Project Agents
    const agentsKey = getAgentsStorageKey(projectId);
    const storedProjectAgents = localStorage.getItem(agentsKey);
    if (storedProjectAgents) {
      try {
        const parsedAgents = JSON.parse(storedProjectAgents);
        console.log(`PROJECT_DETAIL_PAGE: Loaded agents for project ${projectId} from localStorage (count: ${parsedAgents.length})`);
        setProjectAgents(parsedAgents);
      }
      catch (e) {
        console.warn(`PROJECT_DETAIL_PAGE: Error parsing agents for project ${projectId}, initializing with defaults. Error:`, e);
        const initAgents = initialProjectScopedMockAgents(projectId);
        setProjectAgents(initAgents);
        localStorage.setItem(agentsKey, JSON.stringify(initAgents));
      }
    } else {
      console.log(`PROJECT_DETAIL_PAGE: No agents found for project ${projectId} in localStorage, initializing with defaults.`);
      const initAgents = initialProjectScopedMockAgents(projectId);
      setProjectAgents(initAgents);
      localStorage.setItem(agentsKey, JSON.stringify(initAgents));
    }

    // Load Project Workflows
    const workflowsKey = getWorkflowsStorageKey(projectId);
    const storedWorkflows = localStorage.getItem(workflowsKey);
    if (storedWorkflows) {
      try {
        const parsedWorkflows = JSON.parse(storedWorkflows) as ProjectWorkflow[];
        const validatedWorkflows = parsedWorkflows.map(wf => ({ ...wf, nodes: wf.nodes || [], edges: wf.edges || [] }));
        console.log(`PROJECT_DETAIL_PAGE: Loaded workflows for project ${projectId} from localStorage (count: ${validatedWorkflows.length})`);
        setProjectWorkflows(validatedWorkflows);
      }
      catch (e) {
        console.warn(`PROJECT_DETAIL_PAGE: Error parsing workflows for project ${projectId}, initializing with defaults. Error:`, e);
        const initWorkflows = predefinedWorkflowsData(projectId);
        setProjectWorkflows(initWorkflows);
        localStorage.setItem(workflowsKey, JSON.stringify(initWorkflows));
      }
    } else {
      console.log(`PROJECT_DETAIL_PAGE: No workflows found for project ${projectId} in localStorage, initializing with defaults.`);
      const initWorkflows = predefinedWorkflowsData(projectId);
      setProjectWorkflows(initWorkflows);
      localStorage.setItem(workflowsKey, JSON.stringify(initWorkflows));
    }

    // Load Project Files (Repository)
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
        const finalFiles = Array.isArray(parsedFiles) ? validatedFiles(parsedFiles) : initialMockFilesData(projectId, currentProjectData?.name);
        console.log(`PROJECT_DETAIL_PAGE: Loaded repository files for project ${projectId} from localStorage (root count: ${finalFiles.length})`);
        setProjectFiles(finalFiles);
      } catch (e) {
        console.warn(`PROJECT_DETAIL_PAGE: Error parsing repository files for project ${projectId}, initializing with defaults. Error:`, e);
        const initFiles = initialMockFilesData(projectId, currentProjectData?.name);
        setProjectFiles(initFiles);
        localStorage.setItem(filesKey, JSON.stringify(initFiles));
      }
    } else {
      console.log(`PROJECT_DETAIL_PAGE: No repository files found for project ${projectId} in localStorage, initializing with defaults.`);
      const initFiles = initialMockFilesData(projectId, currentProjectData?.name);
      setProjectFiles(initFiles);
      localStorage.setItem(filesKey, JSON.stringify(initFiles));
    }

    // Load Project Requirement Documents
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
            const finalReqDocs = Array.isArray(parsedReqDocs) ? validatedReqDocs(parsedReqDocs) : initialRequirementDocsData(projectId);
             console.log(`PROJECT_DETAIL_PAGE: Loaded requirement docs for project ${projectId} from localStorage (root count: ${finalReqDocs.length})`);
            setProjectRequirementDocs(finalReqDocs);
        } catch (e) {
            console.warn(`PROJECT_DETAIL_PAGE: Error parsing requirement docs for project ${projectId}, initializing with defaults. Error:`, e);
            const initReqDocs = initialRequirementDocsData(projectId);
            setProjectRequirementDocs(initReqDocs);
            localStorage.setItem(reqDocsKey, JSON.stringify(initReqDocs));
        }
    } else {
        console.log(`PROJECT_DETAIL_PAGE: No requirement docs found for project ${projectId} in localStorage, initializing with defaults.`);
        const initReqDocs = initialRequirementDocsData(projectId);
        setProjectRequirementDocs(initReqDocs);
        localStorage.setItem(reqDocsKey, JSON.stringify(initReqDocs));
    }

    // Load Project Tickets
    const ticketsKey = getTicketsStorageKey(projectId);
    const storedTickets = localStorage.getItem(ticketsKey);
    if (storedTickets) {
        try {
            const parsedTickets = JSON.parse(storedTickets);
            const finalTickets = Array.isArray(parsedTickets) && parsedTickets.length > 0 ? parsedTickets : initialMockTickets(projectId);
            console.log(`PROJECT_DETAIL_PAGE: Loaded tickets for project ${projectId} from localStorage (count: ${finalTickets.length})`);
            setProjectTickets(finalTickets);
        } catch (e) {
            console.warn(`PROJECT_DETAIL_PAGE: Error parsing tickets for project ${projectId}, initializing with defaults. Error:`, e);
            const initTickets = initialMockTickets(projectId);
            setProjectTickets(initTickets);
            localStorage.setItem(ticketsKey, JSON.stringify(initTickets));
        }
    } else {
        console.log(`PROJECT_DETAIL_PAGE: No tickets found for project ${projectId} in localStorage, initializing with defaults.`);
        const initTickets = initialMockTickets(projectId);
        setProjectTickets(initTickets);
        localStorage.setItem(ticketsKey, JSON.stringify(initTickets));
    }

  }, [projectId, isClient, router, initialMockTasksForProject, initialProjectScopedMockAgents, predefinedWorkflowsData, initialMockFilesData, initialRequirementDocsData, initialMockTickets]);

  const designingWorkflowId = designingWorkflow ? designingWorkflow.id : null;

  useEffect(() => {
    designingWorkflowIdRef.current = designingWorkflow ? designingWorkflow.id : null;
  }, [designingWorkflow]);

  useEffect(() => {
    const currentDesigningWorkflowId = designingWorkflowIdRef.current;
    if (currentDesigningWorkflowId && isClient && projectWorkflows) {
      const workflowFromList = projectWorkflows.find(wf => wf.id === currentDesigningWorkflowId);
      if (workflowFromList) {
        if (designingWorkflow && JSON.stringify(workflowFromList) !== JSON.stringify(designingWorkflow)) {
           console.log("PROJECT_DETAIL_PAGE: Syncing designingWorkflow from projectWorkflows state. ID:", currentDesigningWorkflowId);
           setDesigningWorkflow(JSON.parse(JSON.stringify(workflowFromList))); 
        }
      } else if (designingWorkflow !== null) { 
        console.log("PROJECT_DETAIL_PAGE: Designing workflow no longer in projectWorkflows list. Closing designer. ID was:", designingWorkflow?.id);
        setDesigningWorkflow(null);
      }
    }
  }, [projectWorkflows, designingWorkflow, isClient]);


  const updateWorkflowStatusBasedOnTasks = useCallback((
    currentTasks: Task[],
    currentWorkflows: ProjectWorkflow[]
  ): ProjectWorkflow[] => {
    if (!isClient || !project) return currentWorkflows;
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
        toast({ title: `Workflow Update for "${project.name}"`, description: `Workflow "${workflow.name}" status changed to ${newStatus}.`});
        wasChanged = true;
        return { ...workflow, status: newStatus, lastRun: (newStatus === 'Active' && workflow.status !== 'Active') ? new Date().toISOString() : workflow.lastRun };
      }
      return workflow;
    });

    if (wasChanged) {
      console.log("PROJECT_DETAIL_PAGE: Workflow statuses updated based on tasks:", updatedWorkflows.map(wf => ({name: wf.name, status: wf.status})));
      return updatedWorkflows;
    }
    return currentWorkflows;
  }, [isClient, project, toast]);


  useEffect(() => {
    if (!isClient || !project || (tasks.length === 0 && projectWorkflows.every(wf => wf.status === 'Draft'))) return;

    const newWorkflows = updateWorkflowStatusBasedOnTasks(tasks, projectWorkflows);
    if (newWorkflows !== projectWorkflows) { // Check if array reference changed
        setProjectWorkflows(newWorkflows);
    }
  }, [tasks, projectWorkflows, isClient, project, updateWorkflowStatusBasedOnTasks]);


  useEffect(() => {
    if (isClient && project && tasks.length >= 0) { 
      localStorage.setItem(getTasksStorageKey(projectId), JSON.stringify(tasks));
      console.log(`PROJECT_DETAIL_PAGE: Saved tasks to localStorage for project ${projectId} (count: ${tasks.length})`);
    }
  }, [tasks, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectAgents.length >= 0) {
       localStorage.setItem(getAgentsStorageKey(projectId), JSON.stringify(projectAgents));
       console.log(`PROJECT_DETAIL_PAGE: Saved projectAgents to localStorage for project ${projectId} (count: ${projectAgents.length})`);
    }
  }, [projectAgents, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectWorkflows) { // Ensure projectWorkflows is not undefined
      console.log(`PROJECT_DETAIL_PAGE: Saving projectWorkflows to localStorage for project ${projectId}. Count: ${projectWorkflows.length}`);
      localStorage.setItem(getWorkflowsStorageKey(projectId), JSON.stringify(projectWorkflows));
    }
  }, [projectWorkflows, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectFiles.length >= 0) {
      localStorage.setItem(getFilesStorageKey(projectId), JSON.stringify(projectFiles));
      console.log(`PROJECT_DETAIL_PAGE: Saved projectFiles to localStorage for project ${projectId} (root count: ${projectFiles.length})`);
    }
  }, [projectFiles, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectRequirementDocs.length >= 0) {
      localStorage.setItem(getRequirementsStorageKey(projectId), JSON.stringify(projectRequirementDocs));
      console.log(`PROJECT_DETAIL_PAGE: Saved projectRequirementDocs to localStorage for project ${projectId} (root count: ${projectRequirementDocs.length})`);
    }
  }, [projectRequirementDocs, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectTickets.length >= 0) {
        localStorage.setItem(getTicketsStorageKey(projectId), JSON.stringify(projectTickets));
        console.log(`PROJECT_DETAIL_PAGE: Saved projectTickets to localStorage for project ${projectId} (count: ${projectTickets.length})`);
    }
  }, [projectTickets, projectId, isClient, project]);

  const handleUpdateProject = useCallback((updatedProjectData: Pick<Project, 'name' | 'description' | 'status' | 'thumbnailUrl'>) => {
    if (!project) return;

    const updatedProject = {
        ...project,
        ...updatedProjectData,
        thumbnailUrl: updatedProjectData.thumbnailUrl || project.thumbnailUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(updatedProjectData.name.substring(0,20))}`,
        lastUpdated: new Date().toISOString(),
    };
    setProject(updatedProject);

    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    let allProjects: Project[] = [];
    if (allProjectsStored) {
        try {
            allProjects = JSON.parse(allProjectsStored);
        } catch (e) {
            console.error("Error parsing projects from localStorage for update:", e);
            allProjects = initialMockProjects;
        }
    } else {
        allProjects = initialMockProjects;
    }

    const projectIndex = allProjects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
        allProjects[projectIndex] = updatedProject;
    } else {
        // This case should ideally not happen if the project was loaded correctly
        allProjects.push(updatedProject); 
    }
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(allProjects));

    toast({
        title: "Project Settings Updated",
        description: `Project "${updatedProject.name}" has been successfully updated.`,
    });
  }, [project, projectId, toast]);


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
      console.warn("Error formatting date:", dateString, e);
      return dateString;
    }
  }, [isClient]);

  const handleTaskPlannedAndAccepted = useCallback((aiOutput: PlanProjectTaskOutput) => {
    if (!project) {
        toast({ title: "Error", description: "Project data not available to add task.", variant: "destructive"});
        return;
    }
    console.log("PROJECT_DETAIL_PAGE: handleTaskPlannedAndAccepted received aiOutput:", JSON.stringify(aiOutput, null, 2));

    const plannedTaskDataFromAI = aiOutput?.plannedTask || {};
    const aiReasoning = aiOutput?.reasoning || "No reasoning provided by AI.";
    const suggestedSubTasksFromAI = plannedTaskDataFromAI?.suggestedSubTasks || [];

    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted taskTitle:", plannedTaskDataFromAI.title);
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted aiReasoning:", aiReasoning);
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted suggestedSubTasks:", JSON.stringify(suggestedSubTasksFromAI, null, 2));

    const subTasksDetailsText = (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0)
      ? `\n\nAI Suggested Sub-Tasks / Steps:\n${suggestedSubTasksFromAI.map((st: any) => `- ${st.title || 'Untitled Sub-task'} (Agent Type: ${st.assignedAgentType || 'N/A'}) - Description: ${st.description || 'No description.'}`).join('\n')}`
      : "\n\nAI Suggested Sub-Tasks / Steps: None specified by AI.";

    const combinedDescription = `AI Reasoning: ${aiReasoning}${subTasksDetailsText}`;
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed combinedDescription (first 100 chars):", combinedDescription.substring(0, 100) + "...");

    const mainTaskId = uid(`task-main-${projectId.slice(-4)}`);
    let mainTask: Task = {
      id: mainTaskId,
      projectId: projectId,
      title: plannedTaskDataFromAI.title || "Untitled AI Task",
      status: (plannedTaskDataFromAI.status as TaskStatus) || 'To Do',
      assignedTo: plannedTaskDataFromAI.assignedTo || "AI Assistant to determine",
      startDate: (plannedTaskDataFromAI.startDate && isValid(parseISO(plannedTaskDataFromAI.startDate))) ? plannedTaskDataFromAI.startDate : format(new Date(), 'yyyy-MM-dd'),
      durationDays: plannedTaskDataFromAI.isMilestone ? 0 : (plannedTaskDataFromAI.durationDays === undefined || plannedTaskDataFromAI.durationDays < 1 ? 1 : Math.max(1, plannedTaskDataFromAI.durationDays)),
      progress: plannedTaskDataFromAI.isMilestone ? (plannedTaskDataFromAI.status === 'Done' ? 100 : 0) : (plannedTaskDataFromAI.progress === undefined || plannedTaskDataFromAI.progress === null ? 0 : Math.min(100,Math.max(0,plannedTaskDataFromAI.progress))),
      isMilestone: plannedTaskDataFromAI.isMilestone || false,
      parentId: (plannedTaskDataFromAI.parentId === "null" || plannedTaskDataFromAI.parentId === "" || plannedTaskDataFromAI.parentId === undefined) ? null : plannedTaskDataFromAI.parentId,
      dependencies: plannedTaskDataFromAI.dependencies || [],
      description: combinedDescription,
      isAiPlanned: true,
    };
    
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Initial mainTask object:", JSON.stringify(mainTask, null, 2));

    let newTasksArray: Task[] = [mainTask];
    let workflowActivated = false;
    let agentAutoStarted = false; // This flag is no longer used for primary assignment toast
    let assignedEntityNameForToast: string | null = mainTask.assignedTo;
    let wasMainTaskAssignedToWorkflow = false;

    // Logic for main task assignment and potential auto-start
    if (mainTask.assignedTo && mainTask.assignedTo !== "Unassigned" && mainTask.assignedTo !== "AI Assistant to determine" && !mainTask.isMilestone && mainTask.status !== 'Done') {
        const assignedWorkflow = projectWorkflows.find(wf => wf.name === mainTask.assignedTo);
        if (assignedWorkflow) {
            wasMainTaskAssignedToWorkflow = true;
            assignedEntityNameForToast = assignedWorkflow.name;
            if ((assignedWorkflow.status === 'Draft' || assignedWorkflow.status === 'Inactive')) {
                mainTask.status = 'In Progress'; // If assigned to a workflow, it means work starts.
                mainTask.progress = Math.max(mainTask.progress || 0, 5);
                workflowActivated = true;
                 console.log(`PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Main task "${mainTask.title}" assigned to workflow "${assignedWorkflow.name}". Workflow will be activated. Task status set to In Progress.`);
            }
        } else {
            // Check if assigned to a specific agent (legacy or direct agent assignment)
            const assignedAgent = projectAgents.find(agent => agent.name === mainTask.assignedTo && agent.status === 'Running');
            if (assignedAgent) {
                mainTask.status = 'In Progress';
                mainTask.progress = Math.max(mainTask.progress || 0, 10);
                // agentAutoStarted = true; // Keep this for potential specific agent handling if needed
                assignedEntityNameForToast = assignedAgent.name;
                setProjectAgents(prevAgents => prevAgents.map(agent =>
                    agent.id === assignedAgent.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
                ));
                console.log(`PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Main task "${mainTask.title}" auto-started by agent "${assignedAgent.name}".`);
            }
        }
    }
    newTasksArray[0] = {...mainTask}; // Reflect changes to mainTask in the array

    // Create sub-tasks if suggested
    if (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0) {
        console.log(`PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Creating ${suggestedSubTasksFromAI.length} sub-tasks.`);
        const createdSubTasks = suggestedSubTasksFromAI.map((st: any, index: number) => {
            const subTaskId = uid(`subtask-${mainTaskId.slice(-5)}-${index}`);
            const parentStartDateString = (mainTask.startDate && isValid(parseISO(mainTask.startDate)))
                                          ? mainTask.startDate
                                          : format(new Date(), 'yyyy-MM-dd');
            const parentStartDate = parseISO(parentStartDateString);
            
            // Stagger subtasks slightly, or make them dependent on previous for better Gantt
            // For simplicity, let's just use main task start date for now, or slightly offset
            const subTaskStartDate = format(addDays(parentStartDate, index * 1), 'yyyy-MM-dd'); 

            return {
                id: subTaskId,
                projectId: projectId,
                title: st.title || "Untitled Sub-task",
                status: 'To Do' as TaskStatus,
                assignedTo: st.assignedAgentType || 'Unassigned', // Sub-tasks assigned to agent types
                startDate: subTaskStartDate,
                durationDays: st.durationDays || 1, // AI could suggest this too later
                progress: 0,
                isMilestone: false,
                parentId: mainTaskId,
                dependencies: index > 0 && newTasksArray[index] ? [newTasksArray[index].id] : [], // Simple sequential dependency on previously added subtask in this batch
                description: st.description || "No description provided by AI.",
                isAiPlanned: true, // Mark sub-tasks as AI planned
            };
        });
        newTasksArray.push(...createdSubTasks);
        console.log(`PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Sub-tasks created:`, createdSubTasks.map(t => t.title));

        // If the main task was assigned to a workflow and has sub-tasks, it should be 'In Progress'
        if (wasMainTaskAssignedToWorkflow && !mainTask.isMilestone && mainTask.status !== 'Done') {
            if(mainTask.status !== 'In Progress') { 
              mainTask.status = 'In Progress';
              mainTask.progress = Math.max(mainTask.progress || 0, 5); // Indicate it has started due to sub-task creation
              newTasksArray[0] = {...mainTask}; 
              console.log(`PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Main task "${mainTask.title}" status set to In Progress due to sub-task creation under workflow.`);
            }
        }
    }

    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Final mainTask object for chat:", JSON.stringify(mainTask, null, 2));
    console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): newTasksArray to be added:", JSON.stringify(newTasksArray.map(t => ({id: t.id, title: t.title, parentId: t.parentId})), null, 2));

    setTasks(prevTasks => [...newTasksArray, ...prevTasks].sort((a, b) => (a.isMilestone === b.isMilestone) ? 0 : a.isMilestone ? -1 : 1));

    if (workflowActivated && assignedEntityNameForToast && projectWorkflows.some(wf => wf.name === assignedEntityNameForToast)) {
        setProjectWorkflows(prevWfs => prevWfs.map(wf =>
            wf.name === assignedEntityNameForToast ? { ...wf, status: 'Active', lastRun: new Date().toISOString() } : wf
        ));
    }

    setIsAITaskPlannerDialogOpen(false);

    let toastTitle = mainTask.isMilestone ? "Milestone Added (AI Planned)" : "Task Added (AI Planned)";
    let toastDescription = `${mainTask.isMilestone ? 'Milestone' : 'Task'} "${mainTask.title}" has been added to project "${project.name}".`;

    if (wasMainTaskAssignedToWorkflow && assignedEntityNameForToast) {
        toastTitle = workflowActivated ? "Task Added & Workflow Activated" : "Task Added to Workflow";
        toastDescription = `Task "${mainTask.title}" assigned to workflow "${assignedEntityNameForToast}".`;
        if (workflowActivated) toastDescription += " Workflow is now active.";
    } else if (assignedEntityNameForToast && assignedEntityNameForToast !== "AI Assistant to determine" && assignedEntityNameForToast !== "Unassigned") {
        // This case covers direct agent assignment if that logic is ever re-enabled, or other non-workflow assignments
        toastDescription += ` Assigned to "${assignedEntityNameForToast}".`;
    }

    if (suggestedSubTasksFromAI.length > 0) {
        toastDescription += ` ${suggestedSubTasksFromAI.length} sub-task${suggestedSubTasksFromAI.length > 1 ? 's were' : ' was'} also created.`;
    }

    toast({
      title: toastTitle,
      description: toastDescription,
    });

    setTimeout(() => {
        console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Setting task for chat dialog:", mainTask.id, mainTask.title);
        setChattingTask(mainTask);
        setIsChatDialogOpen(true);
    }, 100); // Small delay to allow state updates to propagate before opening chat

  }, [project, projectId, toast, projectWorkflows, projectAgents, setTasks, setProjectWorkflows, setProjectAgents, setIsAITaskPlannerDialogOpen, setChattingTask, setIsChatDialogOpen, updateWorkflowStatusBasedOnTasks]); // Added updateWorkflowStatusBasedOnTasks


  const handleAddTask = useCallback((taskData: Omit<Task, 'id' | 'projectId'>) => {
    if (!project) return;
    const newTask: Task = {
      id: uid(`task-${projectId.slice(-5)}`),
      projectId: projectId,
      ...taskData,
      isAiPlanned: false, // Manually added tasks are not AI planned
    };

    let assignedToWorkflow = false;
    let assignedEntityName: string | null = null;

    if (newTask.assignedTo && newTask.assignedTo !== "Unassigned" && !newTask.isMilestone && newTask.status !== 'Done') {
      const targetWorkflow = projectWorkflows.find(wf => wf.name === newTask.assignedTo);
      if (targetWorkflow) {
        assignedToWorkflow = true;
        assignedEntityName = targetWorkflow.name;
        if(targetWorkflow.status !== 'Active'){
            toast({ title: `Workflow "${targetWorkflow.name}" Activated`, description: `Task "${newTask.title}" assigned to workflow.`,});
        }
      } else {
          const targetAgent = projectAgents.find(ag => ag.name === newTask.assignedTo);
          if (targetAgent) {
              assignedEntityName = targetAgent.name;
              if(targetAgent.status === 'Running' && newTask.status !== 'In Progress') {
                newTask.status = 'In Progress';
                newTask.progress = Math.max(newTask.progress || 0, 5);
                toast({ title: `Task "${newTask.title}" Started`, description: `Agent "${targetAgent.name}" picked up the task.`});
              } else if (targetAgent.status !== 'Running') {
                toast({ title: `Task "${newTask.title}" Assigned`, description: `Agent "${targetAgent.name}" is not running. Please start the agent.`});
              }
          }
      }
    }

    setTasks(prevTasks => {
        const updatedTasks = [newTask, ...prevTasks];
        updatedTasks.sort((a, b) => (a.isMilestone === b.isMilestone) ? 0 : a.isMilestone ? -1 : 1);
        if (assignedToWorkflow && assignedEntityName) {
            setProjectWorkflows(prevWfs => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWfs));
        }
        return updatedTasks;
    });

    setIsAddTaskDialogOpen(false);

    let toastTitle = newTask.isMilestone ? "Milestone Added" : "Task Added";
    let toastDescription = `${newTask.isMilestone ? 'Milestone' : 'Task'} "${newTask.title}" has been added to project "${project.name}".`;
    if (assignedEntityName) {
        toastDescription += ` Assigned to "${assignedEntityName}".`;
    }
    toast({
      title: toastTitle,
      description: toastDescription,
    });

  }, [project, projectId, toast, projectAgents, projectWorkflows, setTasks, setProjectWorkflows, setIsAddTaskDialogOpen, updateWorkflowStatusBasedOnTasks]);

  const handleOpenEditTaskDialog = useCallback((task: Task, viewMode: boolean = false) => {
    setEditingTask(task);
    setIsViewingTask(viewMode);
    setIsEditTaskDialogOpen(true);
  }, []);

  const handleUpdateTask = useCallback((updatedTaskData: Task) => {
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

    updatedTasks.sort((a, b) => (a.isMilestone === b.isMilestone) ? 0 : a.isMilestone ? -1 : 1);
    setTasks(updatedTasks);
    setIsEditTaskDialogOpen(false);
    setEditingTask(null);
    toast({
      title: `${updatedTaskData.isMilestone ? 'Milestone' : 'Task'} Updated`,
      description: `"${updatedTaskData.title}" has been updated.`,
    });

    setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWorkflows));
  }, [project, tasks, toast, setTasks, setProjectWorkflows, updateWorkflowStatusBasedOnTasks]);

  const handleOpenDeleteTaskDialog = useCallback((task: Task) => {
    setTaskToDelete(task);
    setIsDeleteTaskDialogOpen(true);
  }, []);

  const confirmDeleteTask = useCallback(() => {
    if (taskToDelete) {
      const tasksToDelete = new Set<string>();
      tasksToDelete.add(taskToDelete.id);

      const findDescendants = (parentId: string, currentTasks: Task[]) => {
        currentTasks.forEach(task => {
          if (task.parentId === parentId) {
            tasksToDelete.add(task.id);
            findDescendants(task.id, currentTasks);
          }
        });
      };
      findDescendants(taskToDelete.id, tasks);

      const updatedTasks = tasks
        .filter(task => !tasksToDelete.has(task.id))
                               .map(task => {
                                 const newDependencies = task.dependencies?.filter(depId => !tasksToDelete.has(depId));
                                 const newParentId = task.parentId && tasksToDelete.has(task.parentId) ? null : task.parentId;
                                 return { ...task, dependencies: newDependencies, parentId: newParentId };
                               });

      setTasks(updatedTasks);
      let deletionMessage = `"${taskToDelete.title}" has been deleted.`;

      const originalChildrenCount = tasks.filter(t => t.parentId === taskToDelete.id && tasksToDelete.has(t.id)).length;
      if (originalChildrenCount > 0) {
          deletionMessage = `"${taskToDelete.title}" and its ${originalChildrenCount} sub-task(s) have been deleted.`;
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
  }, [taskToDelete, tasks, toast, setTasks, setProjectWorkflows, updateWorkflowStatusBasedOnTasks]);

  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, task: Task) => {
    event.dataTransfer.setData('taskId', task.id);
    event.dataTransfer.setData('taskStatus', task.status);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleColumnDragOver = useCallback((event: React.DragEvent<HTMLDivElement>, status: Task['status']) => {
    event.preventDefault();
    setDraggingOverStatus(status);
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleColumnDragLeave = useCallback(() => {
    setDraggingOverStatus(null);
  }, []);

  const handleColumnDrop = useCallback((event: React.DragEvent<HTMLDivElement>, newStatus: Task['status']) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('taskId');
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    setDraggingOverStatus(null);
    setReorderTargetTaskId(null);

    if (!taskId) return;

    let updatedTasksArray = [...tasks];
    const taskToUpdateIndex = updatedTasksArray.findIndex(t => t.id === taskId);
    if (taskToUpdateIndex === -1) return;

    let taskToUpdate = { ...updatedTasksArray[taskToUpdateIndex] };

    if (taskToUpdate.status !== newStatus) {
        taskToUpdate.status = newStatus;
        taskToUpdate.progress = newStatus === 'Done' ? 100 : ((newStatus === 'To Do' || newStatus === 'Blocked') && !taskToUpdate.isMilestone ? 0 : taskToUpdate.progress);

        updatedTasksArray.splice(taskToUpdateIndex, 1); 

        let insertAtIndex = updatedTasksArray.length;
        for(let i = 0; i < updatedTasksArray.length; i++) {
            if(updatedTasksArray[i].status === newStatus && (i === updatedTasksArray.length - 1 || updatedTasksArray[i+1].status !== newStatus)) {
                insertAtIndex = i + 1;
                break;
            } else if (updatedTasksArray[i].status !== newStatus && updatedTasksArray.findIndex(t => t.status === newStatus) === -1) {
                const statusOrder = ['To Do', 'In Progress', 'Blocked', 'Done'];
                const newStatusOrderIndex = statusOrder.indexOf(newStatus);
                let placed = false;
                for(let j=0; j<updatedTasksArray.length; j++){
                    if(statusOrder.indexOf(updatedTasksArray[j].status) > newStatusOrderIndex){
                        insertAtIndex = j;
                        placed = true;
                        break;
                    }
                }
                if(placed) break;
            }
        }
        updatedTasksArray.splice(insertAtIndex, 0, taskToUpdate);

        toast({
            title: "Task Status Updated",
            description: `Task "${taskToUpdate.title}" moved to ${newStatus}.`,
        });
        setTasks(updatedTasksArray);
        setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasksArray, prevWorkflows));

    } else if (sourceTaskStatus === newStatus && !event.dataTransfer.getData('droppedOnCard')) {
        updatedTasksArray.splice(taskToUpdateIndex, 1); 
        
        let endOfGroupIndex = updatedTasksArray.length;
        const tasksInSameStatus = updatedTasksArray.filter(t => t.status === newStatus);
        if(tasksInSameStatus.length > 0) {
            endOfGroupIndex = updatedTasksArray.lastIndexOf(tasksInSameStatus[tasksInSameStatus.length - 1]) + 1;
        } else {
            // If no tasks with this status, find the logical place based on status order
            const statusOrder = ['To Do', 'In Progress', 'Blocked', 'Done'];
            const currentStatusOrderIndex = statusOrder.indexOf(newStatus);
            for(let i=0; i<updatedTasksArray.length; i++){
                if(statusOrder.indexOf(updatedTasksArray[i].status) > currentStatusOrderIndex){
                    endOfGroupIndex = i;
                    break;
                }
            }
        }
        updatedTasksArray.splice(endOfGroupIndex, 0, taskToUpdate);

        toast({
            title: "Task Reordered",
            description: `Task "${taskToUpdate.title}" moved to the end of "${newStatus}".`,
        });
        setTasks(updatedTasksArray);
    }
    event.dataTransfer.clearData('droppedOnCard');
  }, [tasks, toast, setTasks, setProjectWorkflows, updateWorkflowStatusBasedOnTasks]);

  const handleTaskCardDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, task: Task) => {
    event.dataTransfer.setData('taskId', task.id);
    event.dataTransfer.setData('taskStatus', task.status);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleTaskCardDragOver = useCallback((event: React.DragEvent<HTMLDivElement>, targetTask: Task) => {
    event.preventDefault();
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as Task['status'];
    if (sourceTaskStatus === targetTask.status) {
      setReorderTargetTaskId(targetTask.id);
      event.dataTransfer.dropEffect = "move";
    } else {
      event.dataTransfer.dropEffect = "none";
      setReorderTargetTaskId(null);
    }
  }, []);

  const handleTaskCardDragLeave = useCallback(() => {
    setReorderTargetTaskId(null);
  }, []);

  const handleTaskCardDrop = useCallback((event: React.DragEvent<HTMLDivElement>, targetTask: Task) => {
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
                // Insert before the target task
                reorderedTasks.splice(newTargetIndex, 0, draggedItem);
            } else {
                // Should not happen if targetTask.id is valid, but as a fallback
                reorderedTasks.push(draggedItem);
            }

            setTimeout(() => {
              toast({
                title: "Task Reordered",
                description: `Task "${draggedItem.title}" moved within "${targetTask.status}".`,
              });
            }, 0);
            return reorderedTasks;
          }
          return currentTasks;
      });
    }
  }, [toast, setTasks]);

  const handleGanttTaskReorder = useCallback((draggedTaskId: string, targetTaskId: string) => {
    setTasks(currentTasks => {
      const reorderedTasks = [...currentTasks];
      const draggedTaskIndex = reorderedTasks.findIndex(t => t.id === draggedTaskId);
      let targetTaskIndex = reorderedTasks.findIndex(t => t.id === targetTaskId);

      if (draggedTaskIndex === -1 || targetTaskIndex === -1) {
        return currentTasks;
      }
      const [draggedItem] = reorderedTasks.splice(draggedTaskIndex, 1);

      targetTaskIndex = reorderedTasks.findIndex(t => t.id === targetTaskId); 
      if (targetTaskIndex !== -1) {
         reorderedTasks.splice(targetTaskIndex, 0, draggedItem);
      } else {
        reorderedTasks.push(draggedItem);
      }

      setTimeout(() => {
        toast({
          title: "Task Order Updated",
          description: "Gantt chart task order has been updated.",
        });
      }, 0);
      return reorderedTasks;
    });
  }, [toast, setTasks]);

  const handleAISuggestionAccepted = useCallback((agentData: Omit<Agent, 'id' | 'status' | 'lastActivity'>) => {
    if (!project) {
      toast({ title: "Error Adding Agent", description: "Project context not found.", variant: "destructive" });
      return;
    }
    const newAgent: Agent = {
      ...agentData,
      id: uid(`proj-${projectId.slice(-4)}-agent-ai`),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };

    console.log("PROJECT_DETAIL_PAGE: Adding AI Suggested Agent:", newAgent);
    setProjectAgents(prevAgents => {
      const updatedAgents = [newAgent, ...prevAgents];
      console.log("PROJECT_DETAIL_PAGE: projectAgents state after AI suggestion:", updatedAgents);
      return updatedAgents;
    });

    toast({
      title: "AI-Suggested Agent Added",
      description: `Agent "${newAgent.name}" has been added to project "${project.name}". You can find it in the 'Project Agents' tab.`,
    });
  }, [project, projectId, toast, setProjectAgents]);


  const handleAddProjectAgent = useCallback((newAgentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => {
    if (!project) return;
    const newAgent: Agent = {
      ...newAgentData,
      id: uid(`proj-${projectId.slice(-4)}-agent`),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
    setIsAddProjectAgentDialogOpen(false);
    toast({
      title: "Project Agent Created",
      description: `Agent "${newAgent.name}" has been added to project "${project.name}".`,
    });
  }, [project, projectId, toast]);

  const handleOpenEditProjectAgentDialog = useCallback((agent: Agent) => {
    setEditingProjectAgent(agent);
    setIsEditAgentDialogOpen(true);
  }, []);

  const handleUpdateProjectAgent = useCallback((updatedAgent: Agent) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === updatedAgent.id ? { ...updatedAgent, lastActivity: new Date().toISOString() } : agent
      )
    );
    setIsEditAgentDialogOpen(false);
    setEditingProjectAgent(null);
    toast({
      title: "Project Agent Updated",
      description: `Agent "${updatedAgent.name}" has been updated for this project.`,
    });
  }, [toast]);

  const handleRunProjectAgent = useCallback((agentId: string) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Running', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = projectAgents.find(a => a.id === agentId)?.name;
    toast({ title: "Project Agent Started", description: `Agent "${agentName || agentId}" is now Running.` });
  }, [projectAgents, toast]);

  const handleStopProjectAgent = useCallback((agentId: string) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Stopped', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = projectAgents.find(a => a.id === agentId)?.name;
    toast({ title: "Project Agent Stopped", description: `Agent "${agentName || agentId}" has been Stopped.` });
  }, [projectAgents, toast]);

  const handleDuplicateProjectAgent = useCallback((agentToDuplicate: Agent) => {
    const newAgent: Agent = {
      ...agentToDuplicate,
      id: uid(`proj-${projectId.slice(-4)}-agent-copy`),
      name: `${agentToDuplicate.name} - Copy`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
    toast({ title: "Project Agent Duplicated", description: `Agent "${agentToDuplicate.name}" duplicated as "${newAgent.name}".` });
  }, [projectId, toast]);

  const handleOpenDeleteAgentDialog = useCallback((agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteAgentDialogOpen(true);
  }, []);

  const confirmDeleteProjectAgent = useCallback(() => {
    if (agentToDelete) {
      setProjectAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentToDelete.id));
      toast({ title: "Project Agent Deleted", description: `Agent "${agentToDelete.name}" has been deleted from this project.`, variant: 'destructive' });
      setAgentToDelete(null);
      setIsDeleteAgentDialogOpen(false);
    }
  }, [agentToDelete, toast]);

  const handleAddProjectWorkflow = useCallback((workflowData: { name: string; description: string }) => {
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
  }, [project, projectId, toast]);

  const handleDesignWorkflow = useCallback((workflow: ProjectWorkflow) => {
    console.log("PROJECT_DETAIL_PAGE: handleDesignWorkflow called with:", { id: workflow.id, name: workflow.name, nodesCount: workflow.nodes?.length, edgesCount: workflow.edges?.length });
    setDesigningWorkflow(JSON.parse(JSON.stringify(workflow)));
  }, []);

  const handleCloseWorkflowDesigner = useCallback(() => {
    if(designingWorkflow){
       toast({
        title: "Workflow Designer Closed",
        description: `Changes to "${designingWorkflow.name}" are saved automatically.`,
      });
    }
    setDesigningWorkflow(null);
  }, [designingWorkflow, toast]);

  const handleWorkflowNodesChange = useCallback((updatedNodes: WorkflowNode[]) => {
    const currentDesigningWorkflowId = designingWorkflowIdRef.current;
    console.log(`PROJECT_DETAIL_PAGE: handleWorkflowNodesChange received updatedNodes. Length: ${updatedNodes.length}`);
    console.log(`PROJECT_DETAIL_PAGE: Current designingWorkflow ID: ${currentDesigningWorkflowId}, Name: ${designingWorkflow?.name}`);

    if (currentDesigningWorkflowId) {
      setProjectWorkflows(prevWorkflows => {
        console.log(`PROJECT_DETAIL_PAGE: Inside setProjectWorkflows for NODES. prevWorkflows length: ${prevWorkflows.length}`);
        const newWorkflowsArray = prevWorkflows.map(wf => {
          if (wf.id === currentDesigningWorkflowId) {
            console.log(`PROJECT_DETAIL_PAGE: Updating NODES for workflow ID: ${wf.id}. New nodes count: ${updatedNodes.length}`);
            return { ...wf, nodes: updatedNodes };
          }
          return wf;
        });
        newWorkflowsArray.forEach(wf => {
            if(wf.id === currentDesigningWorkflowId) {
                 console.log(`PROJECT_DETAIL_PAGE: Workflow in newWorkflows array (after node map). ID: ${wf.id}, Nodes count: ${wf.nodes?.length}, Nodes IDs: ${wf.nodes?.map(n=>n.id).join(', ')}`);
            }
        });
        return newWorkflowsArray;
      });
    }
  }, [designingWorkflow?.id]);

  const handleWorkflowEdgesChange = useCallback((updatedEdges: WorkflowEdge[]) => {
    const currentDesigningWorkflowId = designingWorkflowIdRef.current;
    console.log(`PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange received updatedEdges. Length: ${updatedEdges.length}`);
    if (currentDesigningWorkflowId) {
        setProjectWorkflows(prevWorkflows => {
            console.log(`PROJECT_DETAIL_PAGE: Inside setProjectWorkflows for EDGES. prevWorkflows length: ${prevWorkflows.length}`);
            const newWorkflowsArray = prevWorkflows.map(wf => {
                if (wf.id === currentDesigningWorkflowId) {
                  console.log(`PROJECT_DETAIL_PAGE: Updating EDGES for workflow ID: ${wf.id}. New edges count: ${updatedEdges.length}`);
                    return { ...wf, edges: updatedEdges };
                }
                return wf;
            });
            return newWorkflowsArray;
        });
    }
  }, [designingWorkflow?.id]);


  const handleToggleWorkflowStatus = useCallback((workflowToToggle: ProjectWorkflow) => {
    setProjectWorkflows(prevWorkflows =>
        prevWorkflows.map(wf => {
            if (wf.id === workflowToToggle.id) {
                const newStatus = wf.status === 'Active' ? 'Inactive' : (wf.status === 'Draft' ? 'Active' : 'Active'); 
                toast({
                    title: `Workflow "${wf.name}" ${newStatus === 'Active' ? 'Activated' : 'Deactivated'}`,
                });
                return { ...wf, status: newStatus, lastRun: newStatus === 'Active' ? new Date().toISOString() : wf.lastRun };
            }
            return wf;
        })
    );
  }, [toast]);

  const handleOpenDeleteWorkflowDialog = useCallback((workflow: ProjectWorkflow) => {
    setWorkflowToDelete(workflow);
    setIsDeleteWorkflowDialogOpen(true);
  }, []);

  const confirmDeleteWorkflow = useCallback(() => {
    if (workflowToDelete) {
      setProjectWorkflows(prev => prev.filter(wf => wf.id !== workflowToDelete.id));
      if (designingWorkflow?.id === workflowToDelete.id) {
        setDesigningWorkflow(null);
      }
      toast({
        title: "Workflow Deleted",
        description: `Workflow "${workflowToDelete.name}" has been deleted.`,
        variant: "destructive"
      });
      setWorkflowToDelete(null);
      setIsDeleteWorkflowDialogOpen(false);
    }
  }, [workflowToDelete, designingWorkflow, toast]);


  const handleOpenChatDialog = useCallback((task: Task) => {
    console.log("PROJECT_DETAIL_PAGE: Opening chat for task:", JSON.stringify(task, null, 2));
    setChattingTask(task);
    setIsChatDialogOpen(true);
  }, []);

  const handleTaskStatusChangeByAI = useCallback((taskId: string, newStatus: TaskStatus) => {
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
      updatedTasks.sort((a, b) => (a.isMilestone === b.isMilestone) ? 0 : a.isMilestone ? -1 : 1);
      setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWorkflows));
      return updatedTasks;
    });
  }, [setTasks, setProjectWorkflows, updateWorkflowStatusBasedOnTasks]);

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
          lastModified: new Date().toISOString(), 
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

  const handleNavigateFolder = useCallback((folderName: string) => {
    setCurrentFilePath(prevPath => {
      const normalizedPrevPath = prevPath.endsWith('/') ? prevPath : `${prevPath}/`;
      return `${normalizedPrevPath}${folderName}/`;
    });
  }, []);

  const handleNavigateUp = useCallback(() => {
    if (currentFilePath === '/') return;
    const pathSegments = currentFilePath.split('/').filter(p => p);
    pathSegments.pop();
    setCurrentFilePath(`/${pathSegments.join('/')}${pathSegments.length > 0 ? '/' : ''}`);
  }, [currentFilePath]);

  const handleCreateNewFolder = useCallback(() => {
    if (!newFolderName.trim()) {
      toast({ title: "Error", description: "Folder name cannot be empty.", variant: "destructive" });
      return;
    }
    if (newFolderName.includes('/')) {
      toast({ title: "Error", description: "Folder name cannot contain slashes.", variant: "destructive" });
      return;
    }
    const newFolderItem: ProjectFile = {
      id: uid(`folder-${projectId.slice(-4)}-${newFolderName.replace(/\s+/g, '-')}`),
      name: newFolderName.trim(),
      type: 'folder',
      path: currentFilePath,
      children: [],
      lastModified: new Date().toISOString(),
    };

    setProjectFiles(prevFiles => addFileOrFolderRecursive(prevFiles, currentFilePath, newFolderItem));
    toast({ title: "Folder Created", description: `Folder "${newFolderItem.name}" created in ${currentFilePath === '/' ? 'root' : currentFilePath}.` });

    setIsNewFolderDialogOpen(false);
    setNewFolderName("");
  }, [newFolderName, projectId, currentFilePath, toast, setProjectFiles, addFileOrFolderRecursive]);

  const handleFileUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    let updatedProjectFilesState = [...projectFiles];
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

      updatedProjectFilesState = addFileOrFolderRecursive(updatedProjectFilesState, currentFilePath, newFile);
      filesAddedCount++;
    });

    if (filesAddedCount > 0) {
      setProjectFiles(updatedProjectFilesState);
      toast({ title: "Files Uploaded (Mock)", description: `${filesAddedCount} file(s) added to ${currentFilePath === '/' ? 'root' : currentFilePath}.` });
    }
    if(fileInputRef.current) fileInputRef.current.value = "";
  }, [projectFiles, projectId, currentFilePath, toast, setProjectFiles, addFileOrFolderRecursive]);

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
        return { ...item, children: updateFileContentRecursive(item.children, targetFileId, newContent), lastModified: new Date().toISOString() };
      }
      return item;
    });
  }, []);


  const handleOpenEditFileDialog = useCallback((file: ProjectFile) => {
    if (file.type === 'file') {
      setEditingFile(file);
      setEditingFileContent(file.content || `// Content for ${file.name}`);
      setIsEditFileDialogOpen(true);
    }
  }, []);

  const handleSaveFileContent = useCallback(() => {
    if (editingFile) {
      setProjectFiles(prevFiles => updateFileContentRecursive(prevFiles, editingFile.id, editingFileContent));
      toast({ title: "File Saved (Mock)", description: `Content of "${editingFile.name}" updated.` });
      setIsEditFileDialogOpen(false);
      setEditingFile(null);
      setEditingFileContent("");
    }
  }, [editingFile, editingFileContent, toast, setProjectFiles, updateFileContentRecursive]);

  const renderProjectFiles = useCallback((): JSX.Element[] => {
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
        return { ...item, children: [...(item.children || []), newItem].sort((a,b) => a.name.localeCompare(b.name)), lastModified: new Date().toISOString() };
      }
      return item;
    });
  }, [isClient, toast]);

  const getRequirementDocsForCurrentPath = useCallback((): ProjectFile[] => {
    if (currentRequirementDocPath === '/') {
      return projectRequirementDocs.filter(f => f.path === '/').sort((a, b) => {
         if (a.type === 'folder' && b.type === 'file') return -1;
         if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
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

  const handleNavigateRequirementFolder = useCallback((folderName: string) => {
    setCurrentRequirementDocPath(prevPath => {
      const normalizedPrevPath = prevPath.endsWith('/') ? prevPath : `${prevPath}/`;
      return `${normalizedPrevPath}${folderName}/`;
    });
  }, []);

  const handleNavigateRequirementUp = useCallback(() => {
    if (currentRequirementDocPath === '/') return;
    const pathSegments = currentRequirementDocPath.split('/').filter(p => p);
    pathSegments.pop();
    setCurrentRequirementDocPath(`/${pathSegments.join('/')}${pathSegments.length > 0 ? '/' : ''}`);
  }, [currentRequirementDocPath]);

  const handleCreateNewRequirementFolder = useCallback(() => {
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
  }, [newRequirementFolderName, projectId, currentRequirementDocPath, toast, setProjectRequirementDocs, addRequirementDocRecursive]);

  const handleRequirementFileUploadClick = useCallback(() => {
    requirementFileInputRef.current?.click();
  }, []);

  const handleRequirementFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    let updatedReqDocsState = [...projectRequirementDocs];
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
      updatedReqDocsState = addRequirementDocRecursive(updatedReqDocsState, currentRequirementDocPath, newFile);
      filesAddedCount++;
    });

    if (filesAddedCount > 0) {
        setProjectRequirementDocs(updatedReqDocsState);
        toast({ title: "Requirement Documents Uploaded (Mock)", description: `${filesAddedCount} document(s) added to ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.` });
    }
    if(requirementFileInputRef.current) requirementFileInputRef.current.value = "";
  }, [projectRequirementDocs, projectId, currentRequirementDocPath, toast, setProjectRequirementDocs, addRequirementDocRecursive]);

  const handleOpenEditRequirementDocDialog = useCallback((doc: ProjectFile) => {
    if (doc.type === 'file') {
      setEditingRequirementDoc(doc);
      setEditingRequirementDocContent(doc.content || `// Content for ${doc.name}`);
      setIsEditRequirementDocDialogOpen(true);
    }
  }, []);

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
        return { ...item, children: updateRequirementDocContentRecursive(item.children, targetFileId, newContent), lastModified: new Date().toISOString() };
      }
      return item;
    });
  }, []);

  const handleSaveRequirementDocContent = useCallback(() => {
    if (editingRequirementDoc) {
      setProjectRequirementDocs(prevDocs => updateRequirementDocContentRecursive(prevDocs, editingRequirementDoc.id, editingRequirementDocContent));
      toast({ title: "Requirement Document Saved (Mock)", description: `Content of "${editingRequirementDoc.name}" updated.` });
      setIsEditRequirementDocDialogOpen(false);
      setEditingRequirementDoc(null);
      setEditingRequirementDocContent("");
    }
  }, [editingRequirementDoc, editingRequirementDocContent, toast, setProjectRequirementDocs, updateRequirementDocContentRecursive]);

  const renderRequirementDocs = useCallback((): JSX.Element[] => {
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


  const handleAddNewTicket = useCallback((ticketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'>) => {
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
  }, [project, projectId, toast]);

  const handleOpenEditTicketDialog = useCallback((ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsEditTicketDialogOpen(true);
  }, []);

  const handleUpdateTicket = useCallback((updatedTicketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'>) => {
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
  }, [editingTicket, toast]);

  const handleOpenDeleteTicketDialog = useCallback((ticket: Ticket) => {
    setTicketToDelete(ticket);
    setIsDeleteTicketDialogOpen(true);
  }, []);

  const confirmDeleteTicket = useCallback(() => {
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
  }, [ticketToDelete, toast]);

  const handleOpenAITaskPlannerDialog = useCallback((ticketContext?: { title: string; description: string }) => {
    if (ticketContext) {
      const goal = `Based on Ticket (ID: mock-${uid('tck').slice(-4)}):\nTitle: ${ticketContext.title}\n\nDescription:\n${ticketContext.description}\n\nPlease plan the necessary tasks to address this ticket.`;
      setAiPlannerPrefillGoal(goal);
    } else {
      setAiPlannerPrefillGoal(undefined);
    }
    setIsAITaskPlannerDialogOpen(true);
  }, []);

  const filteredTickets = useMemo(() => {
    const sortedTickets = [...projectTickets].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    if (selectedTicketTypeFilter === 'All') {
      return sortedTickets;
    }
    return sortedTickets.filter(ticket => ticket.type === selectedTicketTypeFilter);
  }, [projectTickets, selectedTicketTypeFilter]);


  useEffect(() => {
    const currentDesigningWorkflowId = designingWorkflowIdRef.current;
    // Sync designingWorkflow with the main projectWorkflows list if it changes
    if (currentDesigningWorkflowId && isClient && projectWorkflows) { 
      const workflowFromList = projectWorkflows.find(wf => wf.id === currentDesigningWorkflowId);
      if (workflowFromList) {
        if (designingWorkflow && JSON.stringify(workflowFromList) !== JSON.stringify(designingWorkflow)) {
          console.log("PROJECT_DETAIL_PAGE: Syncing designingWorkflow from projectWorkflows state due to projectWorkflows change. ID:", currentDesigningWorkflowId);
          setDesigningWorkflow(JSON.parse(JSON.stringify(workflowFromList)));
        }
      } else if (designingWorkflow !== null) {
        console.log("PROJECT_DETAIL_PAGE: Designing workflow no longer in projectWorkflows list (e.g., deleted). Closing designer. ID was:", currentDesigningWorkflowId);
        setDesigningWorkflow(null);
      }
    }
  }, [projectWorkflows, isClient, designingWorkflow]);


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
                sizes="(max-width: 639px) 64px, (max-width: 767px) 80px, 96px"
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
           <Button
             variant="outline"
             size="sm"
             onClick={() => {
                if (project) {
                    setIsEditProjectDialogOpen(true);
                } else {
                    toast({ title: "Error", description: "Project data not loaded yet.", variant: "destructive" });
                }
             }}
             className="w-full sm:w-auto"
           >
            <Settings className="mr-2 h-4 w-4" /> Project Settings
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="taskManagement" className="w-full">
        <TabsList className="grid w-full grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 rounded-md mb-6 sm:mb-4 xl:w-auto xl:inline-grid">
          <TabsTrigger value="taskManagement"><ListChecks className="mr-1.5 h-4 w-4"/>Task Management</TabsTrigger>
          <TabsTrigger value="projectAssets"><FolderGit2 className="mr-1.5 h-4 w-4"/>Project Assets</TabsTrigger>
          <TabsTrigger value="aiAutomation"><Brain className="mr-1.5 h-4 w-4"/>AI & Automation</TabsTrigger>
          <TabsTrigger value="tickets"><TicketIcon className="mr-1.5 h-4 w-4"/>Tickets</TabsTrigger>
          <TabsTrigger value="kpis"><TrendingUp className="mr-1.5 h-4 w-4"/>KPIs</TabsTrigger>
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
                                            <Button size="default" variant="default" className="w-full max-w-xs sm:w-auto">
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
                                            <Button size="default" variant="default" className="w-full max-w-xs sm:w-auto">
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
                                                    taskStatusColors={taskStatusColors}
                                                    onDragStart={(e) => handleTaskCardDragStart(e, task)}
                                                    onDragOverCard={(e) => handleTaskCardDragOver(e, task)}
                                                    onDragLeaveCard={handleTaskCardDragLeave}
                                                    onDropOnCard={(e) => handleTaskCardDrop(e, task)}
                                                    onViewTask={() => handleOpenEditTaskDialog(task, true)}
                                                    onEditTask={() => handleOpenEditTaskDialog(task, false)}
                                                    onDeleteTask={() => handleOpenDeleteTaskDialog(task)}
                                                    onChatTask={() => handleOpenChatDialog(task)}
                                                    isParentTask={tasks.some(t => t.parentId === task.id && t.id !== task.id)}
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
                                        {/* "Add New Requirement" button is now part of the folder management context */}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                      <div className="flex items-center gap-2 text-sm flex-wrap">
                                        {currentRequirementDocPath !== '/' && (
                                            <Button variant="ghost" size="sm" onClick={handleNavigateRequirementUp} className="text-muted-foreground hover:text-foreground whitespace-nowrap">
                                            <ArrowLeftCircle className="mr-2 h-4 w-4" /> Up One Level
                                            </Button>
                                        )}
                                        <span className="text-muted-foreground whitespace-nowrap">Current Path:</span> 
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded-sm text-xs break-all">{currentRequirementDocPath}</span>
                                      </div>
                                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                        <Button variant="outline" size="sm" onClick={handleRequirementFileUploadClick} className="w-full sm:w-auto">
                                            <UploadCloud className="mr-2 h-4 w-4" /> Upload Document (Mock)
                                        </Button>
                                        <input type="file" multiple ref={requirementFileInputRef} style={{ display: 'none' }} onChange={handleRequirementFileSelect} />
                                        <Button variant="default" size="sm" onClick={() => {setNewRequirementFolderName(""); setIsNewRequirementFolderDialogOpen(true);}} className="w-full sm:w-auto">
                                            <FolderPlus className="mr-2 h-4 w-4"/>Create Folder
                                        </Button>
                                      </div>
                                    </div>

                                    {displayedRequirementDocs.length > 0 ? (
                                    <Table>
                                        <ShadCnTableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead className="w-[100px]">Type</TableHead>
                                            <TableHead className="w-[100px] hidden sm:table-cell">Size</TableHead>
                                            <TableHead className="w-[180px] hidden md:table-cell">Last Modified</TableHead>
                                            <TableHead className="text-right w-[120px]">Actions</TableHead>
                                        </TableRow>
                                        </ShadCnTableHeader>
                                        <TableBody>
                                        {renderRequirementDocs()}
                                        </TableBody>
                                    </Table>
                                    ) : (
                                    <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md bg-muted/20">
                                        <ClipboardList className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                        <p className="mb-2 font-medium">This requirement folder is empty.</p>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="default" onClick={handleRequirementFileUploadClick}>
                                                <UploadCloud className="mr-2 h-4 w-4" /> Upload Document
                                            </Button>
                                            <Button variant="default" size="default" onClick={() => {setNewRequirementFolderName(""); setIsNewRequirementFolderDialogOpen(true);}}>
                                                <FolderPlus className="mr-2 h-4 w-4"/>Create First Folder
                                            </Button>
                                        </div>
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
                                <div className="mb-2 flex items-center gap-2 text-sm flex-wrap">
                                  {currentFilePath !== '/' && (
                                    <Button variant="ghost" size="sm" onClick={handleNavigateUp} className="text-muted-foreground hover:text-foreground whitespace-nowrap">
                                      <ArrowLeftCircle className="mr-2 h-4 w-4" /> Up One Level
                                    </Button>
                                  )}
                                  <span className="text-muted-foreground whitespace-nowrap">Current Path:</span> 
                                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded-sm text-xs break-all">{currentFilePath}</span>
                                </div>
                                {displayedFiles.length > 0 ? (
                                  <Table>
                                    <ShadCnTableHeader>
                                      <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="w-[100px]">Type</TableHead>
                                        <TableHead className="w-[100px] hidden sm:table-cell">Size</TableHead>
                                        <TableHead className="w-[180px] hidden md:table-cell">Last Modified</TableHead>
                                        <TableHead className="text-right w-[120px]">Actions</TableHead>
                                      </TableRow>
                                    </ShadCnTableHeader>
                                    <TableBody>
                                      {renderProjectFiles()}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md bg-muted/20">
                                    <FolderClosed className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                    <p className="mb-2 font-medium">This folder is empty.</p>
                                    <div className="flex gap-2 mt-2">
                                        <Button variant="outline" size="default" onClick={handleFileUploadClick}>
                                            <UploadCloud className="mr-2 h-4 w-4" /> Upload Files
                                        </Button>
                                        <Button variant="default" size="default" onClick={() => {setNewFolderName(""); setIsNewFolderDialogOpen(true);}}>
                                            <FolderPlus className="mr-2 h-4 w-4"/>Create First Folder
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
                                <Button onClick={() => setIsAddProjectAgentDialogOpen(true)} size="sm" className="w-full sm:w-auto">
                                    <PlusSquare className="mr-2 h-4 w-4" /> Add New Project Agent
                                </Button>
                            </div>
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
                                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-[200px] bg-muted/20">
                                    <Bot className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                    <p className="mb-2 font-medium">No agents configured for this project yet.</p>
                                    <Button size="default" variant="default" onClick={() => setIsAddProjectAgentDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                                        <PlusSquare className="mr-2 h-4 w-4"/>Add First Project Agent
                                    </Button>
                                </div>
                            )}
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
                                            <Button size="default" variant="default" onClick={() => setIsAddWorkflowDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
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
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                               <DropdownMenuItem onClick={() => handleOpenAITaskPlannerDialog({title: ticket.title, description: ticket.description})}>
                                <Brain className="mr-2 h-4 w-4" /> Plan Task from Ticket
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleOpenEditTicketDialog(ticket)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Edit Ticket
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:!bg-destructive/10 hover:!text-destructive" onClick={() => handleOpenDeleteTicketDialog(ticket)}>
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
                   <Button size="default" variant="default" onClick={() => setIsAddTicketDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                      <PlusSquare className="mr-2 h-4 w-4"/>Add First Ticket
                  </Button>
                </div>
              )}
            </CardContent>
             <CardFooter className="border-t pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <Card className="bg-muted/20">
                        <CardHeader className="p-3"><CardTitle className="text-sm">Ticket Detail View (Placeholder)</CardTitle></CardHeader>
                        <CardContent className="p-3"><p className="text-xs text-muted-foreground">Selected ticket details will appear here when implemented.</p></CardContent>
                    </Card>
                     <Card className="bg-muted/20">
                        <CardHeader className="p-3"><CardTitle className="text-sm">Status Workflow Visualizer (Placeholder)</CardTitle></CardHeader>
                        <CardContent className="p-3"><p className="text-xs text-muted-foreground">A visual representation of ticket status transitions will be shown here.</p></CardContent>
                    </Card>
                     <Card className="bg-muted/20">
                        <CardHeader className="p-3"><CardTitle className="text-sm">AI Suggestion Panel (Placeholder)</CardTitle></CardHeader>
                        <CardContent className="p-3"><p className="text-xs text-muted-foreground">AI insights and suggestions for this ticket will appear here.</p></CardContent>
                    </Card>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="mt-8 sm:mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Key Performance Indicators</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        Track project performance and key metrics. (Placeholder)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">KPI visualizations will be displayed here.</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOGS SECTION */}
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
            defaultStartDate={format(new Date(), 'yyyy-MM-dd')}
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
      {project && isEditProjectDialogOpen && (
        <EditProjectDialog
          project={project}
          open={isEditProjectDialogOpen}
          onOpenChange={setIsEditProjectDialogOpen}
          onUpdateProject={handleUpdateProject}
        />
      )}
      {isAddProjectAgentDialogOpen && (
          <AddAgentDialog
            open={isAddProjectAgentDialogOpen}
            onOpenChange={setIsAddProjectAgentDialogOpen}
            onAddAgent={handleAddProjectAgent}
            projectId={projectId}
        />
      )}
      {editingProjectAgent && (
        <EditAgentDialogAgent
          agent={editingProjectAgent}
          open={isEditAgentDialogOpen}
          onOpenChange={(open) => {
            setIsEditAgentDialogOpen(open);
            if (!open) setEditingProjectAgent(null);
          }}
          onUpdateAgent={handleUpdateProjectAgent}
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
          onOpenChange={(isOpen) => {
             setIsChatDialogOpen(isOpen);
             if (!isOpen) setChattingTask(null);
          }}
          task={chattingTask}
          onTaskStatusChangeByAI={handleTaskStatusChangeByAI}
        />
      )}
      {isNewFolderDialogOpen && (
        <AlertDialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create New Folder ({currentFilePath === '/' ? 'Repository Root' : 'Repository'})</AlertDialogTitle>
              <AlertDialogDescription>
                Enter a name for the new folder to be created in: <span className="font-mono bg-muted px-1 py-0.5 rounded-sm text-xs">{currentFilePath}</span>
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
                Enter a name for the new folder in: <span className="font-mono bg-muted px-1 py-0.5 rounded-sm text-xs">{currentRequirementDocPath}</span>
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
       {isViewTraceabilityMatrixDialogOpen && project && (
        <AlertDialog open={isViewTraceabilityMatrixDialogOpen} onOpenChange={setIsViewTraceabilityMatrixDialogOpen}>
            <AlertDialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><ExternalLink className="mr-2 h-5 w-5"/>Traceability Matrix (Placeholder)</AlertDialogTitle>
                    <AlertDialogDescription>
                        This view will show links between requirement documents, tasks, and other artifacts for project: {project.name}.
                        Full interactive traceability is a future enhancement. For now, it lists root requirement folders and tasks.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-4 py-2 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Requirement Documents (Root Folders):</h4>
                      {projectRequirementDocs.filter(d => d.path === '/').length > 0 ? (
                        <ul className="list-disc list-inside text-xs space-y-1 pl-4">
                          {projectRequirementDocs.filter(d => d.path === '/').map(doc => (
                            <li key={doc.id} className="text-muted-foreground">
                              <FolderIcon className="inline-block h-4 w-4 mr-1 text-sky-500"/>
                              <span className="font-medium">{doc.name}</span> ({doc.children?.length || 0} item(s))
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-xs text-muted-foreground italic">No requirement document folders defined at the root.</p>}
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
                    <AlertDialogAction onClick={() => setIsViewTraceabilityMatrixDialogOpen(false)}>Close</AlertDialogAction>
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
// End of file, ensuring no trailing characters or comments after this line
}
