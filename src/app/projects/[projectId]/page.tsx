
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, Eye, SlidersHorizontal, Lightbulb, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, X as XIcon, Diamond, Users, FolderGit2, MessageSquare, Settings, Brain, PlusSquare, Edit2, Files, FolderIcon, FileIcon, UploadCloud, FolderPlus, ArrowLeftCircle, InfoIcon, ClipboardList, ChevronDown, ChevronRight, Play, Paperclip, ExternalLink, Ticket as TicketIconLucide, Loader2, MoreVertical } from 'lucide-react';
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
import AITaskPlannerDialog from '@/components/features/projects/AITaskPlannerDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadCnTableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ProjectGanttChartView from '@/components/features/projects/ProjectGanttChartView';
import AddWorkflowDialog from '@/components/features/projects/AddWorkflowDialog';
import TaskChatDialog from '@/components/features/tasks/TaskChatDialog';
import AddRequirementDialog from '@/components/features/requirements/AddRequirementDialog';
import AddTicketDialog from '@/components/features/tickets/AddTicketDialog';
import EditTicketDialog from '@/components/features/tickets/EditTicketDialog';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanProjectTaskOutput } from '@/ai/flows/plan-project-task-flow';
import { projectStatuses, ticketTypes as ticketTypeEnumArray, ticketPriorities as ticketPriorityEnumArray, ticketStatuses as ticketStatusEnumArray, requirementStatuses, requirementPriorities } from '@/types';

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
  'Bug': 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-600',
  'Feature Request': 'bg-purple-100 text-purple-700 dark:bg-purple-700/30 dark:text-purple-300 border-purple-300 dark:border-purple-600',
  'Support Request': 'bg-sky-100 text-sky-700 dark:bg-sky-700/30 dark:text-sky-300 border-sky-300 dark:border-sky-600',
  'Change Request': 'bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-600',
};
const allTicketTypes: (TicketType | 'All')[] = ['All', ...ticketTypeEnumArray];

// Initial data functions moved outside the component
const createInitialProjectScopedMockAgents = (currentProjectId: string): Agent[] => {
  if (!currentProjectId) return [];
  const agentData = [
      { name: 'ASPICE Requirements Elicitation & Analysis Agent', type: 'Analysis Agent', config: { focusProcessAreas: ["SYS.1", "SYS.2", "SWE.1"], elicitationMethods: ["Stakeholder Interviews", "Workshops"], outputArtifacts: ["SRS.docx", "SysRS.pdf"], traceabilityLevel: "Full", complianceLevel: "ASPICE Level 2 Target", keywords: ["requirements", "elicitation", "analysis", "specification", "validation", "aspice", "sys.1", "sys.2", "swe.1"] } },
      { name: 'ASPICE System Architectural Design Agent', type: 'Design Agent', config: { focusProcessAreas: ["SYS.3"], modelingLanguage: "SysML_with_AUTOSAR_Profile", viewpoints: ["Logical View", "Physical View"], interfaceDefinition: "AUTOSAR XML (ARXML)", keywords: ["system architecture", "sysml", "autosar", "design principles", "aspice", "sys.3"] } },
      { name: 'ASPICE Software Architectural Design Agent', type: 'Design Agent', config: { focusProcessAreas: ["SWE.2"], designPatterns: ["Microservices", "Layered"], componentSpecification: "Detailed interfaces, responsibilities", keywords: ["software architecture", "design patterns", "uml", "component design", "aspice", "swe.2"] } },
      { name: 'ASPICE Software Detailed Design & Implementation Agent', type: 'Development Agent', config: { focusProcessAreas: ["SWE.3", "SWE.4 (Unit Construction)"], programmingLanguages: ["C++17", "Python 3.9+"], codingStandards: "AUTOSAR C++14, MISRA C:2012", staticAnalysisTools: ["Clang-Tidy", "PVS-Studio"], keywords: ["detailed design", "implementation", "coding standards", "unit testing", "static analysis", "aspice", "swe.3", "swe.4"] } },
      { name: 'ASPICE Software Unit Verification Agent', type: 'Testing Agent', config: { focusProcessAreas: ["SWE.4 (Unit Verification)"], verificationMethods: ["Static Analysis", "Unit Tests"], coverageGoalPercent: { "statement": 90, "branch": 80 }, keywords: ["unit verification", "code coverage", "test cases", "static analysis", "dynamic analysis", "aspice", "swe.4"] } },
      { name: 'ASPICE Software Integration Testing Agent', type: 'Testing Agent', config: { focusProcessAreas: ["SWE.5"], integrationStrategy: "Incremental (Top-down)", stubbingFramework: "GoogleMock", interfaceTesting: "Data exchange verification", keywords: ["software integration testing", "interface testing", "stubs", "drivers", "aspice", "swe.5"] } },
      { name: 'ASPICE Software Qualification Testing Agent', type: 'Testing Agent', config: { focusProcessAreas: ["SWE.6"], testingMethods: ["BlackBox", "Requirement-Based"], acceptanceCriteriaSource: "SoftwareRequirementsSpecification.docx", keywords: ["software qualification testing", "black-box testing", "acceptance testing", "aspice", "swe.6"] } },
      { name: 'ASPICE System Integration Testing Agent', type: 'Testing Agent', config: { focusProcessAreas: ["SYS.4"], testEnvironment: "Hardware-in-the-Loop (HIL)", interfaceVerification: "Between HW/SW components", keywords: ["system integration testing", "hil", "interface verification", "aspice", "sys.4"] } },
      { name: 'ASPICE System Qualification Testing Agent', type: 'Testing Agent', config: { focusProcessAreas: ["SYS.5"], validationMethods: ["UserScenarioTesting", "PerformanceTesting"], acceptanceCriteriaSource: "SystemRequirementsSpecification.pdf", keywords: ["system qualification testing", "validation", "end-to-end testing", "user scenarios", "aspice", "sys.5"] } },
      { name: 'ASPICE Project Management Support Agent', type: 'Reporting Agent', config: { focusProcessAreas: ["MAN.3", "MAN.5"], reportingFrequency: "Weekly", kpiToTrack: ["ScheduleVariance", "EffortVariance", "DefectDensity"], keywords: ["project management", "reporting", "risk management", "kpi tracking", "aspice", "man.3", "man.5"] } },
      { name: 'ASPICE Quality Assurance Support Agent', type: 'Custom Logic Agent', config: { focusProcessAreas: ["SUP.1", "SUP.4"], auditActivities: ["ProcessComplianceChecks", "WorkProductReviews"], metricsCollection: ["DefectEscapeRate", "ReviewEffectiveness"], keywords: ["quality assurance", "process compliance", "audits", "reviews", "aspice", "sup.1", "sup.4"] } },
      { name: 'ASPICE Configuration Management Support Agent', type: 'CI/CD Agent', config: { focusProcessAreas: ["SUP.8", "SUP.9", "SUP.10"], versionControlSystem: "Git (GitFlow)", baseliningStrategy: "ReleaseBased", buildAutomationTool: "Jenkins", keywords: ["configuration management", "version control", "baselining", "change management", "ci/cd", "aspice", "sup.8", "sup.9", "sup.10"] } },
      { name: 'ASPICE Technical Documentation Agent', type: 'Documentation Agent', config: { focusProcessAreas: ["SUP.7"], documentTypes: ["SystemRequirementsSpecification", "SoftwareRequirementsSpecification", "ArchitectureDesignDocument", "DetailedDesignDocument", "TestPlan", "TestReport", "UserManual", "MaintenanceManual"], outputFormats: ["PDF/A", "Markdown", "HTML"], templateRepository: "SharedDocTemplates_GitRepo", reviewCycle: "AutomatedPeerReview then ManualReview", versioning: "SemanticVersioning", keywords: ["documentation", "manuals", "specifications", "reports"] } },
  ];
  return agentData.map(agent => ({
    ...agent,
    id: uid(`proj-${currentProjectId.slice(-4)}-${agent.name.substring(0,10).toLowerCase().replace(/\s+/g, '-')}${Math.random().toString(36).substring(2, 5)}`),
    status: 'Idle',
    lastActivity: new Date().toISOString(),
  }));
};

const createInitialMockTasksForProject = (currentProjectId: string, currentProjectName: string): Task[] => {
  if (!currentProjectId || !currentProjectName) return [];
  const today = startOfDay(new Date());
  const todayFormatted = format(today, 'yyyy-MM-dd');

  const kickoffMilestoneId = uid(`milestone-kickoff-${currentProjectId.slice(-5)}`);
  const reqTaskId = uid(`task-req-${currentProjectId.slice(-5)}`);
  const designTaskId = uid(`task-design-${currentProjectId.slice(-5)}`);
  const devTaskId = uid(`task-dev-${currentProjectId.slice(-5)}`);
  const subTaskApiId = uid(`subtask-api-${devTaskId.slice(-5)}`);
  const testTaskId = uid(`task-test-${currentProjectId.slice(-5)}`);
  const alphaMilestoneId = uid(`milestone-alpha-${currentProjectId.slice(-5)}`);

  return [
    { id: kickoffMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Project Kick-off`, status: 'Done', assignedTo: 'ASPICE Project Management Support Agent', startDate: format(addDays(today, -15), 'yyyy-MM-dd'), durationDays: 0, progress: 100, isMilestone: true, parentId: null, dependencies: [], description: "Official project kick-off milestone achieved. (Corresponds to MAN.3)", isAiPlanned: false  },
    { id: reqTaskId, projectId: currentProjectId, title: `Define ${currentProjectName} Scope & Requirements`, status: 'Done', assignedTo: 'Requirements Engineering Process', startDate: format(addDays(today, -14), 'yyyy-MM-dd'), durationDays: 5, progress: 100, isMilestone: false, parentId: null, dependencies: [kickoffMilestoneId], description: "Initial scoping and requirements gathering for the project. (ASPICE SYS.1, SYS.2, SWE.1)", isAiPlanned: false  },
    { id: designTaskId, projectId: currentProjectId, title: `Design ${currentProjectName} Architecture`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(today, -9), 'yyyy-MM-dd'), durationDays: 7, progress: 60, isMilestone: false, parentId: null, dependencies: [reqTaskId], description: "High-level and detailed design of the software architecture. (ASPICE SWE.2, SWE.3)", isAiPlanned: false  },
    { id: devTaskId, projectId: currentProjectId, title: `Implement Core Logic for ${currentProjectName}`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(today, -2), 'yyyy-MM-dd'), durationDays: 10, progress: 40, parentId: designTaskId, dependencies: [], isMilestone: false, description: "Core development phase, implementing key functionalities. (ASPICE SWE.4)", isAiPlanned: false },
    { id: subTaskApiId, projectId: currentProjectId, parentId: devTaskId, title: `Implement API Endpoints`, status: 'To Do', assignedTo: 'ASPICE Software Detailed Design & Implementation Agent', startDate: todayFormatted, durationDays: 3, progress: 0, isMilestone: false, dependencies: [], description: "Develop and unit test the necessary API endpoints for the core logic.", isAiPlanned: false },
    { id: testTaskId, projectId: currentProjectId, title: `Test ${currentProjectName} Integration & Qualification`, status: 'To Do', assignedTo: 'Software Testing & QA Cycle', startDate: format(addDays(today, 8), 'yyyy-MM-dd'), durationDays: 5, progress: 0, parentId: null, dependencies: [devTaskId], isMilestone: false, description: "Perform integration testing of developed components and system-level qualification tests. (ASPICE SWE.5, SWE.6)", isAiPlanned: false },
    { id: alphaMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Alpha Release Milestone`, status: 'To Do', assignedTo: 'ASPICE Project Management Support Agent', startDate: format(addDays(today, 13), 'yyyy-MM-dd'), durationDays: 0, progress: 0, isMilestone: true, parentId: null, dependencies: [testTaskId], description: "Target date for the Alpha release of the project.", isAiPlanned: false },
  ];
};

const createPredefinedWorkflowsData = (currentProjectId: string): ProjectWorkflow[] => {
  if (!currentProjectId) return [];
  const createWorkflow = (
    name: string,
    description: string,
    nodeDetails: Array<{ name: string; type: string; config?: any, x?: number, y?: number }>,
    edgeConnections?: Array<{ sourceIndex: number; targetIndex: number }>
  ): ProjectWorkflow => {
    const wfId = uid(`pd-wf-${currentProjectId.slice(-3)}-${name.toLowerCase().replace(/\s+/g, '-').substring(0, 10)}`);
    const nodes: WorkflowNode[] = nodeDetails.map((detail, index) => ({
      id: uid(`node-${wfId}-${detail.name.toLowerCase().replace(/\s+/g, '-')}-${index}`),
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
      "Handles elicitation, analysis, specification, and validation of project requirements. Aligns with ASPICE SYS.1, SYS.2, SWE.1.",
      [
        { name: 'Elicit Stakeholder Needs', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SYS.1", output: "StakeholderRequirements.docx" }, x: 50, y: 50 },
        { name: 'Analyze System Requirements', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SYS.2", input: "StakeholderRequirements.docx", output: "SystemRequirements.spec" }, x: 300, y: 50 },
        { name: 'Specify Software Requirements', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SWE.1", input: "SystemRequirements.spec", output: "SoftwareRequirements.spec" }, x: 50, y: 170 },
        { name: 'Validate Requirements', type: 'ASPICE Quality Assurance Support Agent', config: { reviewType: 'Formal Review', against: ["StakeholderRequirements.docx", "SystemRequirements.spec"], output: "ValidationReport.pdf" }, x: 300, y: 170 }
      ],
      [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 2 }, { sourceIndex: 2, targetIndex: 3 }]
    ),
    createWorkflow(
      "Software Design & Implementation Cycle",
      "Covers software architectural design, detailed design, coding, and unit testing. Aligns with ASPICE SWE.2, SWE.3, SWE.4.",
      [
        { name: 'Define Software Architecture', type: 'ASPICE Software Architectural Design Agent', config: { activity: "SWE.2", input: "SoftwareRequirements.spec", output: "SoftwareArchitecture.diagram" }, x: 50, y: 50 },
        { name: 'Detailed Software Design', type: 'ASPICE Software Detailed Design & Implementation Agent', config: { activity: "SWE.3", input: "SoftwareArchitecture.diagram", output: "DetailedDesignDoc.md" }, x: 300, y: 50 },
        { name: 'Implement Software Units', type: 'ASPICE Software Detailed Design & Implementation Agent', config: { activity: "SWE.4 Construction", input: "DetailedDesignDoc.md", output: "SourceCode.zip" }, x: 50, y: 170 },
        { name: 'Verify Software Units', type: 'ASPICE Software Unit Verification Agent', config: { activity: "SWE.4 Verification", input: "SourceCode.zip", criteria: "Unit Test Coverage 90%" }, x: 300, y: 170 }
      ],
      [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 1, targetIndex: 2 }, { sourceIndex: 2, targetIndex: 3 }]
    ),
    createWorkflow(
      "Software Testing & QA Cycle",
      "Manages integration testing, system testing, and quality assurance activities. Aligns with ASPICE SWE.5, SWE.6, SUP.1.",
      [
        { name: 'Plan Integration & Qualification Tests', type: 'Testing Agent', config: { testPhase: "Integration & Qualification", input: ["SoftwareRequirements.spec", "SoftwareArchitecture.diagram"] }, x: 50, y: 50 },
        { name: 'Execute Software Integration Tests', type: 'ASPICE Software Integration Testing Agent', config: { activity: "SWE.5", input: "IntegratedSoftware.bin", output: "IntegrationTestReport.xml" }, x: 300, y: 50 },
        { name: 'Execute Software Qualification Tests', type: 'ASPICE Software Qualification Testing Agent', config: { activity: "SWE.6", input: "IntegratedSoftware.bin", output: "QualificationTestReport.xml" }, x: 50, y: 170 },
        { name: 'Quality Assurance Review', type: 'ASPICE Quality Assurance Support Agent', config: { activity: "SUP.1", artifacts: ["IntegrationTestReport.xml", "QualificationTestReport.xml"] }, x: 300, y: 170 }
      ],
      [{ sourceIndex: 0, targetIndex: 1 }, { sourceIndex: 0, targetIndex: 2 }, { sourceIndex: 1, targetIndex: 3 }, {sourceIndex: 2, targetIndex: 3}]
    ),
    createWorkflow(
      "Project Monitoring & Reporting",
      "Collects project metrics, monitors progress, manages risks, and generates status reports. Aligns with ASPICE MAN.3, MAN.5.",
      [
        { name: 'Gather Task Progress Data', type: 'ASPICE Project Management Support Agent', config: { source: "Task List", metrics: ["Status", "Progress"] }, x: 50, y: 50 },
        { name: 'Analyze Risk & Issues', type: 'ASPICE Project Management Support Agent', config: { source: "Tickets, Risk Register", activity: "MAN.5" }, x: 300, y: 50 },
        { name: 'Generate Weekly Status Report', type: 'ASPICE Project Management Support Agent', config: { frequency: "Weekly", output: "StatusReport.pdf" }, x: 50, y: 170 },
        { name: 'Update Project KPIs', type: 'ASPICE Project Management Support Agent', config: { kpis: ["OnTimeDelivery", "BudgetAdherence"] }, x: 300, y: 170 }
      ],
      [{ sourceIndex: 0, targetIndex: 2 }, { sourceIndex: 1, targetIndex: 2 }, { sourceIndex: 2, targetIndex: 3 }]
    ),
  ];
};

const createInitialRequirementDocsData = (currentProjectId: string): ProjectFile[] => {
    if (!currentProjectId) return [];
    const baseTime = Date.now();
    const aspiceFolders = [
      { name: "MAN - Management Process Group", children: [
        { name: "MAN.3 Project Management", children: [] },
        { name: "MAN.5 Risk Management", children: [] },
        { name: "MAN.6 Measurement", children: [] },
      ]},
      { name: "SYS - System Engineering Process Group", children: [
        { name: "SYS.1 Requirements Elicitation", children: [] },
        { name: "SYS.2 System Requirements Analysis", children: [] },
        { name: "SYS.3 System Architectural Design", children: [] },
        { name: "SYS.4 System Integration and Integration Test", children: [] },
        { name: "SYS.5 System Qualification Test", children: [] },
      ]},
      { name: "SWE - Software Engineering Process Group", children: [
        { name: "SWE.1 Software Requirements Analysis", children: [] },
        { name: "SWE.2 Software Architectural Design", children: [] },
        { name: "SWE.3 Software Detailed Design and Unit Construction", children: [] },
        { name: "SWE.4 Software Unit Verification", children: [] },
        { name: "SWE.5 Software Integration and Integration Test", children: [] },
        { name: "SWE.6 Software Qualification Test", children: [] },
      ]},
      { name: "SUP - Supporting Process Group", children: [
        { name: "SUP.1 Quality Assurance", children: [] },
        { name: "SUP.2 Verification", children: [] },
        { name: "SUP.3 Validation", children: [] },
        { name: "SUP.4 Joint Review", children: [] },
        { name: "SUP.7 Documentation", children: [] },
        { name: "SUP.8 Configuration Management", children: [] },
        { name: "SUP.9 Problem Resolution Management", children: [] },
        { name: "SUP.10 Change Request Management", children: [] },
      ]},
      { name: "ACQ - Acquisition Process Group", children: [
        { name: "ACQ.4 Supplier Monitoring", children: [] },
      ]}
    ];

    let folderIndex = 0;
    function createFolderStructure(folders: any[], parentPath: string): ProjectFile[] {
      return folders.map(folder => {
        folderIndex++;
        const newFolder: ProjectFile = {
          id: uid(`reqdoc-folder-${currentProjectId.slice(-3)}-${folder.name.split(' ')[0].toLowerCase()}${folderIndex}`),
          name: folder.name,
          type: 'folder' as 'folder',
          path: parentPath,
          lastModified: new Date(baseTime - (folderIndex) * 24 * 60 * 60 * 1000).toISOString(),
          children: folder.children ? createFolderStructure(folder.children, `${parentPath}${folder.name}/`) : [],
        };
        return newFolder;
      });
    }
    return createFolderStructure(aspiceFolders, '/');
  };

const createInitialMockFilesData = (projectId: string, currentProjectName: string | undefined): ProjectFile[] => {
  if (!projectId || !currentProjectName) return [];
  return [
    { id: uid(`file-proj-${projectId.slice(-4)}-doc`), name: 'Project_Charter.docx', type: 'file', path: '/', size: '1.2MB', lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), content: "This is the project charter document for " + (currentProjectName || "this project") + "." },
    {
      id: uid(`folder-proj-${projectId.slice(-4)}-req`), name: 'Requirements', type: 'folder', path: '/', lastModified: new Date().toISOString(), children: [
        { id: uid(`file-proj-${projectId.slice(-4)}-srs`), name: 'SRS_v1.0.docx', type: 'file', path: '/Requirements/', size: '850KB', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), content: "System Requirements Specification v1.0 for " + (currentProjectName || "this project") + "." },
      ]
    },
    {
      id: uid(`folder-proj-${projectId.slice(-4)}-design`), name: 'Design', type: 'folder', path: '/', lastModified: new Date().toISOString(), children: [
        { id: uid(`file-proj-${projectId.slice(-4)}-sad`), name: 'SAD_v1.0.pdf', type: 'file', path: '/Design/', size: '2.5MB', lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), content: "Software Architecture Document v1.0 - PDF Content Placeholder for " + (currentProjectName || "this project") + "." },
        {
          id: uid(`folder-proj-${projectId.slice(-4)}-sdd`), name: 'SDD', type: 'folder', path: '/Design/', lastModified: new Date().toISOString(), children: [
            { id: uid(`file-proj-${projectId.slice(-4)}-sdd-compA`), name: 'ComponentA_Design.docx', type: 'file', path: '/Design/SDD/', size: '400KB', lastModified: new Date().toISOString(), content: "Detailed design for Component A of " + (currentProjectName || "this project") + "." },
          ]
        },
      ]
    },
    { id: uid(`folder-proj-${projectId.slice(-4)}-src`), name: 'SourceCode', type: 'folder', path: '/', lastModified: new Date().toISOString(), children: [] },
    {
      id: uid(`folder-proj-${projectId.slice(-4)}-test`), name: 'Test', type: 'folder', path: '/', lastModified: new Date().toISOString(), children: [
        { id: uid(`file-proj-${projectId.slice(-4)}-testplan`), name: 'MasterTestPlan.docx', type: 'file', path: '/Test/', size: '300KB', lastModified: new Date().toISOString(), content: "Master Test Plan document for " + (currentProjectName || "this project") + "." },
      ]
    },
    { id: uid(`file-proj-${projectId.slice(-4)}-notes`), name: 'MeetingNotes_ProjectKickoff.txt', type: 'file', path: '/', size: '5KB', lastModified: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), content: "Notes from the project kickoff meeting for " + (currentProjectName || "this project") + "." },
  ];
};

const createInitialMockTickets = (currentProjectId: string): Ticket[] => {
  if (!currentProjectId) return [];
  return [
    { id: uid(`ticket-${currentProjectId.slice(-3)}-001`), projectId: currentProjectId, title: 'Login button unresponsive on Safari', description: 'The main login button does not respond to clicks on Safari browsers. Tested on Safari 15.1.', status: 'Open', priority: 'High', type: 'Bug', createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString() },
    { id: uid(`ticket-${currentProjectId.slice(-3)}-002`), projectId: currentProjectId, title: 'Add export to CSV feature for project reports', description: 'Users need the ability to export project summary reports to CSV format for external analysis.', status: 'Open', priority: 'Medium', type: 'Feature Request', createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    { id: uid(`ticket-${currentProjectId.slice(-3)}-003`), projectId: currentProjectId, title: 'API rate limit documentation needs update', description: 'The documentation regarding API rate limits is confusing and needs clarification on burst vs sustained rates.', status: 'In Progress', priority: 'Medium', type: 'Change Request', assignee: 'ASPICE Technical Documentation Agent', createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString() },
  ];
};

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

  // For Project Assets -> Requirements
  const [projectRequirementDocs, setProjectRequirementDocs] = useState<ProjectFile[]>([]);
  const [currentRequirementDocPath, setCurrentRequirementDocPath] = useState<string>('/');
  const [isNewRequirementFolderDialogOpen, setIsNewRequirementFolderDialogOpen] = useState(false);
  const [newRequirementFolderName, setNewRequirementFolderName] = useState("");
  const requirementFileInputRef = useRef<HTMLInputElement>(null);
  const [editingRequirementDoc, setEditingRequirementDoc] = useState<ProjectFile | null>(null);
  const [editingRequirementDocContent, setEditingRequirementDocContent] = useState<string>("");
  const [isEditRequirementDocDialogOpen, setIsEditRequirementDocDialogOpen] = useState(false);
  const [isViewTraceabilityMatrixDialogOpen, setIsViewTraceabilityMatrixDialogOpen] = useState(false);
  const [requirementDocToDelete, setRequirementDocToDelete] = useState<ProjectFile | null>(null);
  const [isDeleteRequirementDocConfirmationOpen, setIsDeleteRequirementDocConfirmationOpen] = useState(false);

  // For Project Assets -> Repository
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string>('/');
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFile, setEditingFile] = useState<ProjectFile | null>(null);
  const [editingFileContent, setEditingFileContent] = useState<string>("");
  const [isEditFileDialogOpen, setIsEditFileDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const [isDeleteFileConfirmationOpen, setIsDeleteFileConfirmationOpen] = useState(false);

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

  // Main data loading effect
  useEffect(() => {
    if (!projectId || !isClient) return;
    console.log(`PROJECT_DETAIL_PAGE: Loading data for project ID: ${projectId}`);

    // Load Project Details
    let currentProjectData: Project | null = null;
    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (allProjectsStored) {
      try {
        const allProjects: Project[] = JSON.parse(allProjectsStored);
        currentProjectData = allProjects.find((p: Project) => p.id === projectId) || null;
      } catch (e) {
        console.error("PROJECT_DETAIL_PAGE: Error parsing all projects from localStorage", e);
      }
    }
    if (!currentProjectData) {
      const foundInMocks = initialMockProjects.find(p => p.id === projectId) || null;
      if (!foundInMocks) {
        console.warn(`PROJECT_DETAIL_PAGE: Project with ID ${projectId} not found. Redirecting.`);
        router.push('/');
        return;
      }
      currentProjectData = foundInMocks;
    }
    setProject(currentProjectData);
    console.log("PROJECT_DETAIL_PAGE: Loaded project data:", currentProjectData);

    // Load Tasks
    const tasksKey = getTasksStorageKey(projectId);
    const storedTasks = localStorage.getItem(tasksKey);
    if (storedTasks) {
      try { setTasks(JSON.parse(storedTasks)); }
      catch (e) { setTasks(createInitialMockTasksForProject(projectId, currentProjectData!.name)); }
    } else {
      setTasks(createInitialMockTasksForProject(projectId, currentProjectData!.name));
    }
    console.log(`PROJECT_DETAIL_PAGE: Loaded ${tasks.length} tasks for project ${projectId}`);


    // Load Project Agents
    const agentsKey = getAgentsStorageKey(projectId);
    const storedProjectAgents = localStorage.getItem(agentsKey);
    if (storedProjectAgents) {
      try { setProjectAgents(JSON.parse(storedProjectAgents)); }
      catch (e) { setProjectAgents(createInitialProjectScopedMockAgents(projectId)); }
    } else {
      setProjectAgents(createInitialProjectScopedMockAgents(projectId));
    }
    console.log(`PROJECT_DETAIL_PAGE: Loaded ${projectAgents.length} agents for project ${projectId}`);

    // Load Project Workflows
    const workflowsKey = getWorkflowsStorageKey(projectId);
    const storedWorkflows = localStorage.getItem(workflowsKey);
    if (storedWorkflows) {
      try {
        const parsedWorkflows = JSON.parse(storedWorkflows) as ProjectWorkflow[];
        setProjectWorkflows(parsedWorkflows.map(wf => ({ ...wf, nodes: wf.nodes || [], edges: wf.edges || [] })));
      }
      catch (e) { setProjectWorkflows(createPredefinedWorkflowsData(projectId)); }
    } else {
      setProjectWorkflows(createPredefinedWorkflowsData(projectId));
    }
     console.log(`PROJECT_DETAIL_PAGE: Loaded ${projectWorkflows.length} workflows for project ${projectId}`);

    // Load Project Files (Repository)
    const filesKey = getFilesStorageKey(projectId);
    const storedProjectFiles = localStorage.getItem(filesKey);
    if (storedProjectFiles) {
      try {
        const parsedFiles = JSON.parse(storedProjectFiles);
        setProjectFiles(Array.isArray(parsedFiles) ? parsedFiles.map(f => ({...f, children: f.type === 'folder' ? (f.children || []) : undefined})) : createInitialMockFilesData(projectId, currentProjectData?.name));
      } catch (e) { setProjectFiles(createInitialMockFilesData(projectId, currentProjectData?.name)); }
    } else {
      setProjectFiles(createInitialMockFilesData(projectId, currentProjectData?.name));
    }
    console.log(`PROJECT_DETAIL_PAGE: Loaded ${projectFiles.length} root files/folders for project ${projectId}`);

    // Load Project Requirement Documents
    const reqDocsKey = getRequirementsStorageKey(projectId);
    const storedReqDocs = localStorage.getItem(reqDocsKey);
    if (storedReqDocs) {
        try {
            const parsedReqDocs = JSON.parse(storedReqDocs);
            setProjectRequirementDocs(Array.isArray(parsedReqDocs) ? parsedReqDocs.map(f => ({...f, children: f.type === 'folder' ? (f.children || []) : undefined})) : createInitialRequirementDocsData(projectId));
        } catch (e) { setProjectRequirementDocs(createInitialRequirementDocsData(projectId)); }
    } else {
        setProjectRequirementDocs(createInitialRequirementDocsData(projectId));
    }
    console.log(`PROJECT_DETAIL_PAGE: Loaded ${projectRequirementDocs.length} root requirement docs/folders for project ${projectId}`);

    // Load Project Tickets
    const ticketsKey = getTicketsStorageKey(projectId);
    const storedTickets = localStorage.getItem(ticketsKey);
    if (storedTickets) {
        try {
            const parsedTickets = JSON.parse(storedTickets);
            setProjectTickets(Array.isArray(parsedTickets) && parsedTickets.length > 0 ? parsedTickets : createInitialMockTickets(projectId));
        } catch (e) { setProjectTickets(createInitialMockTickets(projectId)); }
    } else {
        setProjectTickets(createInitialMockTickets(projectId));
    }
    console.log(`PROJECT_DETAIL_PAGE: Loaded ${projectTickets.length} tickets for project ${projectId}`);

  // IMPORTANT: Add `toast` here if any of the initialization functions or their side effects use it.
  // For now, assuming only projectId and isClient are primary triggers for this initial load.
  // If `createInitial...` functions are not memoized and created on each render, they can cause loops if included directly.
  // However, they are called conditionally (if localStorage is empty), so this setup should be generally stable.
  }, [projectId, isClient, router]);


  // Effect to synchronize designingWorkflow with the one from projectWorkflows list
  // This ensures that if projectWorkflows changes (e.g., from localStorage update or other means),
  // the designingWorkflow state, if active, reflects the latest version.
  const designingWorkflowCurrentId = designingWorkflow ? designingWorkflow.id : null;

  useEffect(() => {
    if (!designingWorkflowCurrentId || !projectWorkflows || projectWorkflows.length === 0 || !isClient) {
        return;
    }
    const workflowFromList = projectWorkflows.find(wf => wf.id === designingWorkflowCurrentId);

    if (workflowFromList) {
      // Only update if the object reference or content is different to avoid potential loops
      // A deep comparison (e.g., JSON.stringify) is more robust here
      if (JSON.stringify(workflowFromList) !== JSON.stringify(designingWorkflow)) {
        // console.log("PROJECT_DETAIL_PAGE: Syncing designingWorkflow from projectWorkflows state. ID:", designingWorkflowCurrentId);
        setDesigningWorkflow(JSON.parse(JSON.stringify(workflowFromList))); // Deep clone
      }
    } else {
      // If the designingWorkflow is no longer in the projectWorkflows list (e.g., it was deleted),
      // then close the designer.
      // console.log("PROJECT_DETAIL_PAGE: Designing workflow no longer in projectWorkflows list. Closing designer. ID was:", designingWorkflowCurrentId);
      setDesigningWorkflow(null);
    }
  }, [projectWorkflows, designingWorkflowCurrentId, isClient]); // designingWorkflow removed from deps


  // Persisting states to localStorage
  useEffect(() => {
    if (isClient && project && tasks !== undefined) {
      // console.log(`PROJECT_DETAIL_PAGE: Saving tasks to localStorage for project ${projectId}`, tasks);
      localStorage.setItem(getTasksStorageKey(projectId), JSON.stringify(tasks));
    }
  }, [tasks, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectAgents !== undefined) {
      // console.log(`PROJECT_DETAIL_PAGE: Saving projectAgents to localStorage for project ${projectId}`, projectAgents);
      localStorage.setItem(getAgentsStorageKey(projectId), JSON.stringify(projectAgents));
    }
  }, [projectAgents, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectWorkflows !== undefined) {
      console.log(`PROJECT_DETAIL_PAGE: Saving projectWorkflows to localStorage for project ${projectId}`, projectWorkflows);
      localStorage.setItem(getWorkflowsStorageKey(projectId), JSON.stringify(projectWorkflows));
    }
  }, [projectWorkflows, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectFiles !== undefined) {
      // console.log(`PROJECT_DETAIL_PAGE: Saving projectFiles to localStorage for project ${projectId}`);
      localStorage.setItem(getFilesStorageKey(projectId), JSON.stringify(projectFiles));
    }
  }, [projectFiles, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectRequirementDocs !== undefined) {
      // console.log(`PROJECT_DETAIL_PAGE: Saving projectRequirementDocs to localStorage for project ${projectId}`);
      localStorage.setItem(getRequirementsStorageKey(projectId), JSON.stringify(projectRequirementDocs));
    }
  }, [projectRequirementDocs, projectId, isClient, project]);

   useEffect(() => {
    if (isClient && project && projectTickets !== undefined) {
        // console.log(`PROJECT_DETAIL_PAGE: Saving projectTickets to localStorage for project ${projectId}`);
        localStorage.setItem(getTicketsStorageKey(projectId), JSON.stringify(projectTickets));
    }
  }, [projectTickets, projectId, isClient, project]);


  const formatDate = useCallback((dateString: string | undefined, optionsOrFormatString?: { day?: '2-digit', month?: 'short', year?: 'numeric' } | string) => {
    if (!isClient || !dateString) return 'N/A';
    try {
      let date;
      if (typeof dateString === 'string' && (dateString.includes('-') || dateString.includes('/'))) {
         date = parseISO(dateString);
      } else if (typeof dateString === 'string' && !isNaN(Number(dateString))) {
         date = new Date(Number(dateString));
      } else {
         date = new Date(dateString);
      }
      if (!isValid(date)) return 'Invalid Date';
      if (typeof optionsOrFormatString === 'string') {
        return format(date, optionsOrFormatString);
      }
      if (optionsOrFormatString && typeof optionsOrFormatString === 'object' && optionsOrFormatString.day && optionsOrFormatString.month && optionsOrFormatString.year) {
        return format(date, 'dd MMM yyyy');
      }
      return format(date, 'PPpp'); // Default full format
    } catch (e) {
      // console.error("Error formatting date:", dateString, e);
      return String(dateString); // Fallback to original string if formatting fails
    }
  }, [isClient]);

  const updateWorkflowStatusBasedOnTasks = useCallback((
    currentTasks: Task[],
    currentWorkflows: ProjectWorkflow[]
  ): ProjectWorkflow[] => {
    if (!isClient || !project || currentWorkflows === undefined) return currentWorkflows ?? [];
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
          // If all tasks for this workflow are done, AND the workflow was active, make it inactive.
          // This prevents a draft workflow with no tasks from becoming inactive.
          newStatus = 'Inactive';
        }
      } else if (workflow.status === 'Active') {
          // If an active workflow has no tasks assigned to it anymore, make it inactive.
          newStatus = 'Inactive';
      }


      if (newStatus !== workflow.status) {
        wasChanged = true;
        // Toast notification moved to the calling context if needed
        return { ...workflow, status: newStatus, lastRun: (newStatus === 'Active' && workflow.status !== 'Active') ? new Date().toISOString() : workflow.lastRun };
      }
      return workflow;
    });

    if (wasChanged) {
      updatedWorkflows.forEach(wf => {
            const oldWf = currentWorkflows.find(old => old.id === wf.id);
            if (oldWf && oldWf.status !== wf.status && isClient) {
                toast({ title: `Workflow Update for "${project?.name || 'this project'}"`, description: `Workflow "${wf.name}" status changed to ${wf.status}.`});
            }
        });
      return updatedWorkflows;
    }
    return currentWorkflows;
  }, [isClient, project, toast]); // Removed `toast` if it's not essential for memoization logic itself.


  useEffect(() => {
    if (isClient && project && tasks !== undefined && projectWorkflows !== undefined) {
      const newWorkflows = updateWorkflowStatusBasedOnTasks(tasks, projectWorkflows);
      if (JSON.stringify(newWorkflows) !== JSON.stringify(projectWorkflows)) {
          setProjectWorkflows(newWorkflows);
      }
    }
  }, [tasks, projectWorkflows, isClient, project, updateWorkflowStatusBasedOnTasks]);


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
        try { allProjects = JSON.parse(allProjectsStored); }
        catch (e) { allProjects = initialMockProjects; }
    } else {
        allProjects = initialMockProjects;
    }

    const projectIndex = allProjects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
        allProjects[projectIndex] = updatedProject;
    } else {
        allProjects.push(updatedProject); // Should not happen in edit context, but good fallback
    }
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(allProjects));

    toast({
        title: "Project Settings Updated",
        description: `Project "${updatedProject.name}" has been successfully updated.`,
    });
  }, [project, projectId, toast]);


const handleTaskPlannedAndAccepted = useCallback(
    (aiOutput: PlanProjectTaskOutput) => {
      console.log("PROJECT_DETAIL_PAGE: handleTaskPlannedAndAccepted received aiOutput:", JSON.stringify(aiOutput, null, 2));

      if (!project) {
        toast({ title: "Error", description: "Project data not available to add task.", variant: "destructive" });
        return;
      }
      if (!aiOutput || !aiOutput.plannedTask) {
         toast({ title: "AI Planning Error", description: "Received no valid plan from AI.", variant: "destructive" });
         console.error("PROJECT_DETAIL_PAGE: AI output was null or plannedTask was missing in handleTaskPlannedAndAccepted. AI Output:", aiOutput);
         return;
      }

      const { plannedTask: plannedTaskDataFromAI, reasoning: aiReasoning } = aiOutput;
      // Ensure plannedTaskDataFromAI is an object, even if AI returns malformed data
      const safePlannedTaskData = typeof plannedTaskDataFromAI === 'object' && plannedTaskDataFromAI !== null ? plannedTaskDataFromAI : {};

      const taskTitle = safePlannedTaskData.title || "Untitled AI Task";
      const currentAiReasoning = aiReasoning || "No reasoning provided by AI.";
      const suggestedSubTasksFromAI = safePlannedTaskData.suggestedSubTasks || [];

      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted taskTitle:", taskTitle);
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted aiReasoning:", currentAiReasoning);
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted suggestedSubTasksFromAI:", suggestedSubTasksFromAI);


      const subTasksDetailsText = (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0)
        ? `\n\nAI Suggested Sub-Tasks / Steps:\n${suggestedSubTasksFromAI.map(st => `- ${st.title || 'Untitled Sub-task'} (Agent Type: ${st.assignedAgentType || 'N/A'}) - Description: ${st.description || 'No description.'}`).join('\n')}`
        : "\n\nAI Suggested Sub-Tasks / Steps: None specified by AI.";

      const combinedDescription = `AI Reasoning: ${currentAiReasoning}${subTasksDetailsText}`;
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed combinedDescription:", combinedDescription);

      const mainTaskId = uid(`task-main-${projectId.slice(-4)}`);

      let mainTask: Task = {
        id: mainTaskId,
        projectId: projectId,
        title: taskTitle,
        status: (safePlannedTaskData.status as Task['status']) || 'To Do',
        assignedTo: safePlannedTaskData.assignedTo || "AI Assistant to determine",
        startDate: (safePlannedTaskData.startDate && isValid(parseISO(safePlannedTaskData.startDate)))
                      ? safePlannedTaskData.startDate
                      : format(new Date(), 'yyyy-MM-dd'),
        durationDays: safePlannedTaskData.isMilestone
                      ? 0
                      : (safePlannedTaskData.durationDays === undefined || safePlannedTaskData.durationDays < 1 ? 1 : Math.max(1, safePlannedTaskData.durationDays)),
        progress: safePlannedTaskData.isMilestone
                      ? (safePlannedTaskData.status === 'Done' ? 100 : 0)
                      : (safePlannedTaskData.progress === undefined || safePlannedTaskData.progress === null ? 0 : Math.min(100,Math.max(0,Number(safePlannedTaskData.progress) || 0 ))),
        isMilestone: safePlannedTaskData.isMilestone || false,
        parentId: (safePlannedTaskData.parentId === "null" || safePlannedTaskData.parentId === "" || safePlannedTaskData.parentId === undefined || safePlannedTaskData.parentId === NO_PARENT_VALUE) ? null : safePlannedTaskData.parentId,
        dependencies: safePlannedTaskData.dependencies || [],
        description: combinedDescription,
        isAiPlanned: true,
      };
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed mainTask for chat:", JSON.stringify(mainTask, null, 2));

      let newTasksArray: Task[] = [mainTask];
      let workflowActivated = false;
      let assignedEntityNameForToast: string | null = mainTask.assignedTo;
      let agentAutoStarted = false; // Track if agent auto-started

      if (mainTask.assignedTo && mainTask.assignedTo !== "AI Assistant to determine" && mainTask.assignedTo !== "Unassigned" && !mainTask.isMilestone && mainTask.status !== 'Done') {
        const assignedWorkflow = projectWorkflows.find(wf => wf.name === mainTask.assignedTo);
        if (assignedWorkflow) {
          assignedEntityNameForToast = assignedWorkflow.name;
          if ((assignedWorkflow.status === 'Draft' || assignedWorkflow.status === 'Inactive')) {
            mainTask = { ...mainTask, status: 'In Progress', progress: Math.max(mainTask.progress || 0, 10) };
            workflowActivated = true;
          } else if (assignedWorkflow.status === 'Active') {
            mainTask = { ...mainTask, status: 'In Progress', progress: Math.max(mainTask.progress || 0, 10) };
          }
        } else {
          const assignedAgent = projectAgents.find(agent => agent.name === mainTask.assignedTo);
          if (assignedAgent && assignedAgent.status === 'Running') {
            mainTask = { ...mainTask, status: 'In Progress', progress: Math.max(mainTask.progress || 0, 10) };
            agentAutoStarted = true;
            setProjectAgents(prevAgents =>
              prevAgents.map(agent =>
                agent.id === assignedAgent.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
              )
            );
          }
        }
        newTasksArray[0] = {...mainTask}; // Update mainTask in the array if it was changed
      }

      if (suggestedSubTasksFromAI.length > 0) {
        const createdSubTasks = suggestedSubTasksFromAI.map((st, index) => {
            const subTaskId = uid(`subtask-${mainTaskId.slice(-5)}-${index}`);
            const parentStartDate = parseISO((mainTask.startDate && isValid(parseISO(mainTask.startDate))) ? mainTask.startDate : format(new Date(), 'yyyy-MM-dd'));
            const subTaskStartDate = format(parentStartDate, 'yyyy-MM-dd'); // Sub-tasks start with parent by default
            const subTaskDuration = (st as any).durationDays || 1; // Assuming AI might provide this, else 1

            let subTaskStatus: Task['status'] = 'To Do';
            let subTaskProgress = 0;

            // Auto-start first sub-task if main task is assigned to an active/activated workflow
            if (index === 0 && (projectWorkflows.find(wf => wf.name === mainTask.assignedTo && wf.status === 'Active') || workflowActivated) && mainTask.status === 'In Progress') {
              subTaskStatus = 'In Progress';
              subTaskProgress = 10;
            }

            return {
                id: subTaskId,
                projectId: projectId,
                title: st.title || "Untitled Sub-task",
                status: subTaskStatus,
                assignedTo: st.assignedAgentType || 'Unassigned', // Sub-tasks assigned to agent types
                startDate: subTaskStartDate,
                durationDays: subTaskDuration,
                progress: subTaskProgress,
                isMilestone: false,
                parentId: mainTaskId, // Link to the main AI-planned task
                dependencies: index > 0 && newTasksArray[index] ? [newTasksArray[index].id] : [], // Simple sequential dependency
                description: st.description || "No description provided by AI.",
                isAiPlanned: true, // These are also AI planned
            };
        });
        newTasksArray.push(...createdSubTasks);

        // If main task was assigned to a workflow AND has sub-tasks, and wasn't already set to In Progress
        if (mainTask.assignedTo && projectWorkflows.find(wf => wf.name === mainTask.assignedTo) && !mainTask.isMilestone && mainTask.status !== 'Done' && mainTask.status !== 'In Progress') {
          mainTask = { ...mainTask, status: 'In Progress', progress: Math.max(mainTask.progress || 0, 5) };
          newTasksArray[0] = {...mainTask}; // Update the main task in the array
          const assignedWorkflow = projectWorkflows.find(wf => wf.name === mainTask.assignedTo);
          if (assignedWorkflow && (assignedWorkflow.status === 'Draft' || assignedWorkflow.status === 'Inactive')) {
            workflowActivated = true;
          }
        }
      }
      
      setTasks(prevTasks => {
        const updatedTasks = [...newTasksArray, ...prevTasks].sort((a, b) => {
            if (a.isMilestone && !b.isMilestone) return -1;
            if (!a.isMilestone && b.isMilestone) return 1;
            const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
            const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
            if (dateA !== dateB) return dateA - dateB;
            // Fallback to original index if dates are same or not present to maintain stability
            // This part may need more robust sorting if parent/child relationships affect visual order strictly
            return 0;
        });
         if (workflowActivated && assignedEntityNameForToast && projectWorkflows.find(wf => wf.name === assignedEntityNameForToast)) {
            setProjectWorkflows(prevWfs => {
              const newWfs = prevWfs.map(wf =>
                  wf.name === assignedEntityNameForToast ? { ...wf, status: 'Active' as ProjectWorkflow['status'], lastRun: new Date().toISOString() } : wf
              );
              // Call updateWorkflowStatusBasedOnTasks to ensure overall consistency
              return updateWorkflowStatusBasedOnTasks(updatedTasks, newWfs);
            });
          } else {
             setProjectWorkflows(prevWfs => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWfs));
          }
        return updatedTasks;
      });

      setIsAITaskPlannerDialogOpen(false);

      let toastTitle = mainTask.isMilestone ? "Milestone Added (AI Planned)" : "Task Added (AI Planned)";
      let toastDescription = `${mainTask.isMilestone ? 'Milestone' : 'Task'} "${mainTask.title || 'Untitled AI Task'}" has been added to project "${project?.name || 'this project'}".`;

      if (agentAutoStarted && assignedEntityNameForToast && !projectWorkflows.find(wf => wf.name === assignedEntityNameForToast)) {
        toastTitle = "Task In Progress (AI Planned)";
        toastDescription = `Task "${mainTask.title || 'Untitled AI Task'}" assigned to agent "${assignedEntityNameForToast}" and is now being processed.`;
      } else if (workflowActivated && assignedEntityNameForToast) {
          toastTitle = "Task Added & Workflow Activated";
          toastDescription = `Task "${mainTask.title || 'Untitled AI Task'}" assigned to workflow "${assignedEntityNameForToast}". Workflow is now active.`;
          if (newTasksArray.find(t => t.parentId === mainTask.id && t.status === 'In Progress')) {
              toastDescription += " The first sub-task has been initiated.";
          }
      } else if (mainTask.assignedTo && mainTask.assignedTo !== "AI Assistant to determine" && mainTask.assignedTo !== "Unassigned" && !mainTask.isMilestone) {
           toastDescription += ` Assigned to "${assignedEntityNameForToast}".`;
           if (newTasksArray.find(t => t.parentId === mainTask.id && t.status === 'In Progress')) {
               toastDescription += " The first sub-task has been initiated.";
           }
      }

      if (suggestedSubTasksFromAI.length > 0) {
          toastDescription += ` ${suggestedSubTasksFromAI.length} sub-task${suggestedSubTasksFromAI.length > 1 ? 's were' : ' was'} also created and linked.`;
      }

      toast({ title: toastTitle, description: toastDescription });

      const finalMainTaskForChat = newTasksArray.find(t => t.id === mainTask.id) || mainTask;
      console.log("PROJECT_DETAIL_PAGE: finalMainTaskForChat for dialog:", JSON.stringify(finalMainTaskForChat, null, 2));

      setTimeout(() => {
          setChattingTask(finalMainTaskForChat);
          setIsChatDialogOpen(true);
      }, 150);

    }, [project, projectId, toast, projectWorkflows, projectAgents, updateWorkflowStatusBasedOnTasks, tasks] // Added tasks here
  );

  const handleAddTask = useCallback((taskData: Omit<Task, 'id' | 'projectId' | 'isAiPlanned'>) => {
    if (!project) return;
    let newTask: Task = {
      id: uid(`task-${projectId.slice(-5)}`),
      projectId: projectId,
      ...taskData,
      isAiPlanned: false,
    };

    let workflowActivated = false;
    let assignedEntityName: string | null = newTask.assignedTo;
    let agentAutoStarted = false;

    if (newTask.assignedTo && newTask.assignedTo !== "Unassigned" && !newTask.isMilestone && newTask.status !== 'Done') {
      const targetWorkflow = projectWorkflows.find(wf => wf.name === newTask.assignedTo);
      if (targetWorkflow) {
         if (targetWorkflow.status === 'Draft' || targetWorkflow.status === 'Inactive') {
            newTask = { ...newTask, status: 'In Progress', progress: Math.max(newTask.progress || 0, 10) };
            workflowActivated = true;
        } else if (targetWorkflow.status === 'Active'){
             newTask = { ...newTask, status: 'In Progress', progress: Math.max(newTask.progress || 0, 10) };
        }
      } else {
        const targetAgent = projectAgents.find(agent => agent.name === newTask.assignedTo);
        if (targetAgent && targetAgent.status === 'Running') {
          newTask = { ...newTask, status: 'In Progress', progress: Math.max(newTask.progress || 0, 10) };
          agentAutoStarted = true;
           setProjectAgents(prevAgents =>
            prevAgents.map(agent =>
              agent.id === targetAgent.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
            )
          );
        }
      }
    }

    setTasks(prevTasks => {
        const updatedTasks = [newTask, ...prevTasks].sort((a, b) => {
            if (a.isMilestone && !b.isMilestone) return -1;
            if (!a.isMilestone && b.isMilestone) return 1;
            const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
            const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
            if (dateA !== dateB) return dateA - dateB;
            return 0;
        });
        if (workflowActivated && assignedEntityName && projectWorkflows.find(wf => wf.name === assignedEntityName)) {
          setProjectWorkflows(prevWfs => {
            const newWfs = prevWfs.map(wf =>
                wf.name === assignedEntityName ? { ...wf, status: 'Active' as ProjectWorkflow['status'], lastRun: new Date().toISOString() } : wf
            );
            return updateWorkflowStatusBasedOnTasks(updatedTasks, newWfs);
          });
        } else {
          setProjectWorkflows(prevWfs => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWfs));
        }
        return updatedTasks;
    });

    setIsAddTaskDialogOpen(false);

    let toastTitle = newTask.isMilestone ? "Milestone Added" : "Task Added";
    let toastDescription = `${newTask.isMilestone ? 'Milestone' : 'Task'} "${newTask.title}" has been added to project "${project.name}".`;
    if (workflowActivated && assignedEntityName) {
        toastTitle = "Task Added & Workflow Activated";
        toastDescription = `Task "${newTask.title}" assigned to workflow "${assignedEntityName}". Workflow is now active.`;
    } else if (agentAutoStarted && assignedEntityName) {
        toastTitle = "Task In Progress";
        toastDescription = `Task "${newTask.title}" assigned to agent "${assignedEntityName}" and is now being processed.`;
    } else if (assignedEntityName && assignedEntityName !== "Unassigned" && !newTask.isMilestone) {
        toastDescription += ` Assigned to "${assignedEntityName}".`;
    }
    toast({
      title: toastTitle,
      description: toastDescription,
    });

  }, [project, projectId, toast, projectWorkflows, projectAgents, updateWorkflowStatusBasedOnTasks]);

  const handleOpenEditTaskDialog = useCallback((task: Task, viewMode: boolean = false) => {
    setEditingTask(task);
    setIsViewingTask(viewMode);
    setIsEditTaskDialogOpen(true);
  }, []);

  const handleUpdateTask = useCallback((updatedTaskData: Task) => {
    if (!project) return;
    let updatedTasksArray = tasks.map(task => task.id === updatedTaskData.id ? updatedTaskData : task);

    if (updatedTaskData.status === 'Done' && !updatedTaskData.isMilestone) {
        const taskIndex = updatedTasksArray.findIndex(t => t.id === updatedTaskData.id);
        if (taskIndex !== -1) {
            updatedTasksArray[taskIndex] = { ...updatedTasksArray[taskIndex], progress: 100 };
        }
    } else if (updatedTaskData.isMilestone && updatedTaskData.status === 'Done') {
         const taskIndex = updatedTasksArray.findIndex(t => t.id === updatedTaskData.id);
        if (taskIndex !== -1) {
            updatedTasksArray[taskIndex] = { ...updatedTasksArray[taskIndex], progress: 100 };
        }
    } else if (updatedTaskData.isMilestone && updatedTaskData.status !== 'Done') {
         const taskIndex = updatedTasksArray.findIndex(t => t.id === updatedTaskData.id);
        if (taskIndex !== -1) {
            updatedTasksArray[taskIndex] = { ...updatedTasksArray[taskIndex], progress: 0 };
        }
    } else if (!updatedTaskData.isMilestone && updatedTaskData.status === 'In Progress' && (updatedTaskData.progress === undefined || updatedTaskData.progress === 0) ) {
        const taskIndex = updatedTasksArray.findIndex(t => t.id === updatedTaskData.id);
        if (taskIndex !== -1) {
            updatedTasksArray[taskIndex] = { ...updatedTasksArray[taskIndex], progress: 10 };
        }
    } else if (!updatedTaskData.isMilestone && updatedTaskData.status !== 'Done' && updatedTaskData.progress === 100) {
      const taskIndex = updatedTasksArray.findIndex(t => t.id === updatedTaskData.id);
        if (taskIndex !== -1) {
           updatedTasksArray[taskIndex] = { ...updatedTasksArray[taskIndex], progress: 90 };
        }
    }


    updatedTasksArray.sort((a, b) => {
      if (a.isMilestone && !b.isMilestone) return -1;
      if (!a.isMilestone && b.isMilestone) return 1;
      const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
      const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return 0;
    });

    setTasks(updatedTasksArray);

    setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasksArray, prevWorkflows));

    setIsEditTaskDialogOpen(false);
    setEditingTask(null);
    toast({
      title: `${updatedTaskData.isMilestone ? 'Milestone' : 'Task'} Updated`,
      description: `"${updatedTaskData.title}" has been updated.`,
    });

  }, [project, tasks, toast, updateWorkflowStatusBasedOnTasks]);

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
      setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasks, prevWorkflows));

      let deletionMessage = `"${taskToDelete.title}" has been deleted.`;
      if (tasksToDelete.size > 1) {
          deletionMessage = `"${taskToDelete.title}" and its ${tasksToDelete.size -1} sub-task(s) have been deleted.`;
      }

      toast({
        title: `${taskToDelete.isMilestone ? 'Milestone' : 'Task'} Deleted`,
        description: deletionMessage,
        variant: 'destructive',
      });
      setTaskToDelete(null);
      setIsDeleteTaskDialogOpen(false);
    }
  }, [taskToDelete, tasks, toast, updateWorkflowStatusBasedOnTasks]);

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

    let reorderedOrStatusChanged = false;
    let tasksArrayAfterUpdate = [...tasks];
    const taskToUpdateIndex = tasksArrayAfterUpdate.findIndex(t => t.id === taskId);

    if (taskToUpdateIndex === -1) return;
    let taskToUpdate = { ...tasksArrayAfterUpdate[taskToUpdateIndex] };

    if (sourceTaskStatus !== newStatus) {
        reorderedOrStatusChanged = true;
        taskToUpdate.status = newStatus;
        if (newStatus === 'Done' && !taskToUpdate.isMilestone) taskToUpdate.progress = 100;
        else if ((newStatus === 'To Do' || newStatus === 'Blocked') && !taskToUpdate.isMilestone) taskToUpdate.progress = 0;
        else if (taskToUpdate.isMilestone) taskToUpdate.progress = newStatus === 'Done' ? 100 : 0;
        else if (newStatus === 'In Progress' && taskToUpdate.progress === 100 && !taskToUpdate.isMilestone) taskToUpdate.progress = 10;
        else if (newStatus === 'In Progress' && (taskToUpdate.progress === undefined || taskToUpdate.progress === 0) && !taskToUpdate.isMilestone) taskToUpdate.progress = 10;
        
        tasksArrayAfterUpdate[taskToUpdateIndex] = taskToUpdate;
        toast({ title: "Task Status Updated", description: `Task "${taskToUpdate.title}" moved to ${newStatus}.`});

    } else if (sourceTaskStatus === newStatus && !event.dataTransfer.getData('droppedOnCard')) {
        // Move to the end of the current status column
        const taskToMove = tasksArrayAfterUpdate.splice(taskToUpdateIndex, 1)[0];
        tasksArrayAfterUpdate.push(taskToMove);
        reorderedOrStatusChanged = true;
        toast({
            title: "Task Reordered",
            description: `Task "${taskToMove.title}" moved to the end of "${newStatus}".`,
        });
    }

    if(reorderedOrStatusChanged){
      tasksArrayAfterUpdate.sort((a, b) => {
        if (a.isMilestone && !b.isMilestone) return -1;
        if (!a.isMilestone && b.isMilestone) return 1;
        const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
        const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        return 0;
      });
      setTasks(tasksArrayAfterUpdate);
      setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(tasksArrayAfterUpdate, prevWorkflows));
    }
    event.dataTransfer.clearData('droppedOnCard');
  }, [tasks, toast, updateWorkflowStatusBasedOnTasks]);


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
            let newTargetIndex = reorderedTasks.findIndex(t => t.id === targetTask.id);

            if (newTargetIndex !== -1) {
                // Insert before the target task
                 if (draggedTaskIndex < newTargetIndex) {
                    reorderedTasks.splice(newTargetIndex, 0, draggedItem);
                } else {
                    reorderedTasks.splice(newTargetIndex, 0, draggedItem);
                }
            } else {
                reorderedTasks.push(draggedItem); // Fallback, should not happen if targetTask is valid
            }
            
            // Re-sort tasks within the same parent and status group based on original task order
            // This is a simplified sort; a more complex one might be needed for deep hierarchies
            const parentId = draggedItem.parentId;
            const status = draggedItem.status;
            const groupToSort = reorderedTasks.filter(t => t.parentId === parentId && t.status === status);
            const otherTasks = reorderedTasks.filter(t => !(t.parentId === parentId && t.status === status));
            
            const originalOrderMap = new Map<string, number>();
            currentTasks.forEach((t, index) => originalOrderMap.set(t.id, index));

            groupToSort.sort((a,b) => (originalOrderMap.get(a.id) ?? Infinity) - (originalOrderMap.get(b.id) ?? Infinity) );

            const finalTasks = [...otherTasks, ...groupToSort].sort((a, b) => {
              if (a.isMilestone && !b.isMilestone) return -1;
              if (!a.isMilestone && b.isMilestone) return 1;
              const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
              const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
              if (dateA !== dateB) return dateA - dateB;
              return (originalOrderMap.get(a.id) ?? Infinity) - (originalOrderMap.get(b.id) ?? Infinity);
            });

            setTimeout(() => {
              toast({
                title: "Task Reordered",
                description: `Task "${draggedItem.title}" moved within "${targetTask.status}".`,
              });
            },0);
            return finalTasks;
          }
          return currentTasks;
      });
    }
  }, [toast]);

  const handleGanttTaskReorder = useCallback((draggedTaskId: string, targetTaskId: string | null) => {
    setTasks(currentTasks => {
      const reorderedTasks = [...currentTasks];
      const draggedTaskIndex = reorderedTasks.findIndex(t => t.id === draggedTaskId);

      if (draggedTaskIndex === -1) {
        return currentTasks;
      }
      const [draggedItem] = reorderedTasks.splice(draggedTaskIndex, 1);

      if (targetTaskId === null) { 
        reorderedTasks.push(draggedItem);
      } else {
        let targetTaskIndex = reorderedTasks.findIndex(t => t.id === targetTaskId);
        if (targetTaskIndex === -1) { 
          reorderedTasks.push(draggedItem);
        } else {
           reorderedTasks.splice(targetTaskIndex, 0, draggedItem);
        }
      }
       reorderedTasks.sort((a, b) => {
          if (a.isMilestone && !b.isMilestone) return -1;
          if (!a.isMilestone && b.isMilestone) return 1;
          const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
          const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
          if (dateA !== dateB) return dateA - dateB;
          return currentTasks.findIndex(t => t.id === a.id) - currentTasks.findIndex(t => t.id === b.id);
      });

      setTimeout(() => {
        toast({
          title: "Task Order Updated",
          description: "Gantt chart task order has been updated.",
        });
      }, 0);
      return reorderedTasks;
    });
  }, [toast, tasks]); 

  const handleAddProjectAgent = useCallback((agentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => {
    if (!project) return;
    const newAgent: Agent = {
      ...agentData,
      id: uid(`proj-${projectId.slice(-4)}-agent`),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
    toast({
      title: "Project Agent Added",
      description: `Agent "${newAgent.name}" has been added to project "${project.name}".`,
    });
    setIsAddProjectAgentDialogOpen(false);
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
    setDesigningWorkflow(JSON.parse(JSON.stringify(workflow))); // Deep clone to avoid direct state mutation issues
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
    const currentDesigningWfId = designingWorkflowRef.current?.id;
    console.log("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange called. Designing WF ID:", currentDesigningWfId, "Updated nodes count:", updatedNodes.length);
    if (currentDesigningWfId) {
        setProjectWorkflows(prevWorkflows => {
            console.log("PROJECT_DETAIL_PAGE: Inside setProjectWorkflows for nodes. prevWorkflows length:", prevWorkflows.length);
            const newWorkflowsArray = prevWorkflows.map(wf => {
                if (wf.id === currentDesigningWfId) {
                    console.log("PROJECT_DETAIL_PAGE: Updating nodes for workflow ID:", wf.id, "New nodes count:", updatedNodes.length, "Node IDs:", updatedNodes.map(n => n.id));
                    return { ...wf, nodes: updatedNodes };
                }
                return wf;
            });
            const updatedWf = newWorkflowsArray.find(wf => wf.id === currentDesigningWfId);
            console.log("PROJECT_DETAIL_PAGE: Workflow in newWorkflowsArray (nodes). ID:", updatedWf?.id, "Nodes count:", updatedWf?.nodes?.length, "Nodes IDs:", updatedWf?.nodes?.map(n => n.id));
            return newWorkflowsArray;
        });
    } else {
      console.warn("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange called but no designingWorkflow.id");
    }
  }, []); // designingWorkflowRef is stable

  const handleWorkflowEdgesChange = useCallback((updatedEdges: WorkflowEdge[]) => {
    const currentDesigningWfId = designingWorkflowRef.current?.id;
    console.log("PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange called. Designing WF ID:", currentDesigningWfId, "Updated edges count:", updatedEdges.length);
    if (currentDesigningWfId) {
        setProjectWorkflows(prevWorkflows => {
            console.log("PROJECT_DETAIL_PAGE: Inside setProjectWorkflows for edges. prevWorkflows length:", prevWorkflows.length);
            const newWorkflowsArray = prevWorkflows.map(wf => {
                if (wf.id === currentDesigningWfId) {
                    console.log("PROJECT_DETAIL_PAGE: Updating edges for workflow ID:", wf.id, "New edges count:", updatedEdges.length);
                    return { ...wf, edges: updatedEdges };
                }
                return wf;
            });
            const updatedWf = newWorkflowsArray.find(wf => wf.id === currentDesigningWfId);
            console.log("PROJECT_DETAIL_PAGE: Workflow in newWorkflowsArray (edges). ID:", updatedWf?.id, "Edges count:", updatedWf?.edges?.length);
            return newWorkflowsArray;
        });
    } else {
      console.warn("PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange called but no designingWorkflow.id");
    }
  }, []); // designingWorkflowRef is stable

  const designingWorkflowRef = useRef<ProjectWorkflow | null>(null);
  useEffect(() => {
    designingWorkflowRef.current = designingWorkflow;
  }, [designingWorkflow]);

  const handleToggleWorkflowStatus = useCallback((workflowToToggle: ProjectWorkflow) => {
    setProjectWorkflows(prevWorkflows => {
        const updatedWfs = prevWorkflows.map(wf => {
            if (wf.id === workflowToToggle.id) {
                let newStatus: ProjectWorkflow['status'] = wf.status;
                const tasksForThisWorkflow = tasks.filter(task => task.assignedTo === wf.name && !task.isMilestone);
                const hasPendingTasks = tasksForThisWorkflow.some(t => t.status !== 'Done');

                if (wf.status === 'Active') {
                    newStatus = 'Inactive';
                } else if (wf.status === 'Inactive' || wf.status === 'Draft') {
                    if (hasPendingTasks) {
                        newStatus = 'Active';
                    } else if (tasksForThisWorkflow.length === 0 && wf.status === 'Draft') {
                         newStatus = 'Active'; // Allow activating a draft workflow even with no tasks yet.
                    } else {
                        // If no pending tasks and it's not a draft being activated, it stays Inactive or becomes Inactive.
                        // This case (Inactive/Draft with no pending tasks) typically shouldn't auto-activate unless explicitly run.
                        // For now, allow manual toggle to Active.
                        newStatus = 'Active';
                        if (isClient) toast({ title: "Workflow Status", description: `Workflow "${wf.name}" manually activated. Assign tasks to it.`, variant: "default"});
                    }
                }

                if (isClient && newStatus !== wf.status && !(newStatus === 'Active' && hasPendingTasks === false && wf.status !== 'Draft' )) { // Avoid toast if just becoming active due to tasks
                  toast({
                      title: `Workflow "${wf.name}" now ${newStatus}`,
                  });
                }
                return { ...wf, status: newStatus, lastRun: newStatus === 'Active' ? new Date().toISOString() : wf.lastRun };
            }
            return wf;
        });
        return updateWorkflowStatusBasedOnTasks(tasks, updatedWfs); // Re-evaluate all after one toggle
    });
  }, [isClient, toast, tasks, updateWorkflowStatusBasedOnTasks]);

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
    let updatedTasksList = tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            status: newStatus,
            progress: newStatus === 'Done' ? 100 : ( (newStatus === 'To Do' || newStatus === 'Blocked') && !t.isMilestone ? 0 : (t.progress === undefined ? (newStatus === 'In Progress' ? 10 : 0) : t.progress) )
          }
        : t
    );
    updatedTasksList.sort((a, b) => {
        if (a.isMilestone && !b.isMilestone) return -1;
        if (!a.isMilestone && b.isMilestone) return 1;
        const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
        const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        return 0;
    });

    setTasks(updatedTasksList);
    setProjectWorkflows(prevWorkflows => updateWorkflowStatusBasedOnTasks(updatedTasksList, prevWorkflows));
  }, [tasks, updateWorkflowStatusBasedOnTasks]);

  // File System Recursive Helpers (Common for Repository and Requirements Docs)
  const addFileOrFolderRecursive = useCallback((
    items: ProjectFile[],
    targetPath: string, // Path to the directory where the new item should be added
    newItem: ProjectFile
  ): ProjectFile[] => {
    // If targetPath is root, add to current items list
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

    // Otherwise, find the target folder and add to its children
    return items.map(item => {
      if (item.type === 'folder') {
        const itemFullPath = item.path + item.name + '/';
        if (itemFullPath === targetPath) { // Exact match for parent folder
          if ((item.children || []).some(child => child.name === newItem.name)) {
            if(isClient) toast({ title: "Error", description: `An item named "${newItem.name}" already exists in ${targetPath}.`, variant: "destructive" });
            return item; // Return item unchanged
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
        } else if (targetPath.startsWith(itemFullPath)) { // Target is a subfolder
          return {
            ...item,
            children: addFileOrFolderRecursive(item.children || [], targetPath, newItem),
          };
        }
      }
      return item;
    });
  }, [isClient, toast]);

  const deleteFileOrFolderRecursive = useCallback((
    items: ProjectFile[],
    targetId: string
  ): { updatedItems: ProjectFile[]; itemDeleted: boolean } => {
    let itemDeleted = false;
    const updatedItems = items.filter(item => {
        if (item.id === targetId) {
            itemDeleted = true;
            return false; // Remove the item
        }
        return true;
    }).map(item => {
        if (item.type === 'folder' && item.children) {
            const result = deleteFileOrFolderRecursive(item.children, targetId);
            if (result.itemDeleted) {
                itemDeleted = true; // Propagate deletion status
                return { ...item, children: result.updatedItems, lastModified: new Date().toISOString() };
            }
        }
        return item;
    });
    return { updatedItems, itemDeleted };
  }, []);

  const updateFileContentRecursive = useCallback((
    items: ProjectFile[],
    targetFileId: string,
    newContent: string
  ): { updatedItems: ProjectFile[]; itemUpdated: boolean } => {
    let itemUpdated = false;
    const updatedItems = items.map(item => {
      if (item.id === targetFileId && item.type === 'file') {
        itemUpdated = true;
        return { ...item, content: newContent, lastModified: new Date().toISOString() };
      }
      if (item.type === 'folder' && item.children) {
        const result = updateFileContentRecursive(item.children, targetFileId, newContent);
        if (result.itemUpdated) {
            itemUpdated = true; // Propagate update status
            // No need to update parent's lastModified here, only the file itself changes
            return { ...item, children: result.updatedItems };
        }
      }
      return item;
    });
    return { updatedItems, itemUpdated };
  }, []);

  const getFilesForCurrentPath = useCallback((sourceFiles: ProjectFile[], sourceCurrentPath: string): ProjectFile[] => {
    if (sourceCurrentPath === '/') {
        return sourceFiles.filter(f => f.path === '/').sort((a, b) => {
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });
    }
    // Normalize sourceCurrentPath to always end with a slash if it's not root
    const normalizedSourceCurrentPath = sourceCurrentPath.endsWith('/') ? sourceCurrentPath : `${sourceCurrentPath}/`;

    let currentLevelFiles = sourceFiles;
    const segments = normalizedSourceCurrentPath.split('/').filter(s => s); // "a/b/c/" -> ["a", "b", "c"]

    for (const segment of segments) {
        const foundFolder = currentLevelFiles.find(f => f.type === 'folder' && f.name === segment);
        if (foundFolder && foundFolder.children) {
            currentLevelFiles = foundFolder.children;
        } else {
             // If any segment of the path is not found, return empty
            if (segments.indexOf(segment) < segments.length -1 || !foundFolder) {
                 return [];
            }
            // If it's the last segment and it's a folder, currentLevelFiles is already its children
        }
    }
    return currentLevelFiles.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
  }, []);


  // Requirements Document Browser Functions
  const handleNavigateRequirementFolder = useCallback((folderName: string) => {
    setCurrentRequirementDocPath(prevPath => {
      const normalizedPrevPath = prevPath === '/' ? prevPath : (prevPath.endsWith('/') ? prevPath : `${prevPath}/`);
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
      path: currentRequirementDocPath, // Path where this folder resides
      children: [],
      lastModified: new Date().toISOString(),
    };
    setProjectRequirementDocs(prevDocs => addFileOrFolderRecursive(prevDocs, currentRequirementDocPath, newFolder));
    toast({ title: "Requirement Folder Created", description: `Folder "${newFolder.name}" created in ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.` });
    setIsNewRequirementFolderDialogOpen(false);
    setNewRequirementFolderName("");
  }, [newRequirementFolderName, projectId, currentRequirementDocPath, toast, addFileOrFolderRecursive]);

  const handleRequirementFileUploadClick = useCallback(() => {
    requirementFileInputRef.current?.click();
  }, []);

  const handleRequirementFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    let updatedReqDocsState = projectRequirementDocs; // Operate on current state
    let filesAddedCount = 0;

    files.forEach(file => {
      const newFile: ProjectFile = {
        id: uid(`reqdoc-file-${projectId.slice(-4)}-${file.name.replace(/\s+/g, '-')}`),
        name: file.name,
        type: 'file',
        path: currentRequirementDocPath, // Path where this file resides
        size: `${(file.size / 1024).toFixed(1)}KB`,
        lastModified: new Date(file.lastModified).toISOString(),
        content: `// Mock content for requirement document: ${file.name}\nUploaded on ${new Date().toLocaleDateString()}`
      };
      // Use the addFileOrFolderRecursive which returns a new array
      updatedReqDocsState = addFileOrFolderRecursive(updatedReqDocsState, currentRequirementDocPath, newFile);
      filesAddedCount++;
    });

    if (filesAddedCount > 0) {
        setProjectRequirementDocs(updatedReqDocsState); // Set the new state
        toast({ title: "Requirement Documents Uploaded (Mock)", description: `${filesAddedCount} document(s) added to ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.` });
    }
    if(requirementFileInputRef.current) requirementFileInputRef.current.value = ""; // Reset file input
  }, [projectRequirementDocs, projectId, currentRequirementDocPath, toast, addFileOrFolderRecursive]);

  const handleOpenEditRequirementDocDialog = useCallback((doc: ProjectFile) => {
    if (doc.type === 'file') {
      setEditingRequirementDoc(doc);
      setEditingRequirementDocContent(doc.content || `// Content for ${doc.name}`);
      setIsEditRequirementDocDialogOpen(true);
    }
  }, []);

  const handleSaveRequirementDocContent = useCallback(() => {
    if (editingRequirementDoc) {
      setProjectRequirementDocs(prevDocs => {
        const result = updateFileContentRecursive(prevDocs, editingRequirementDoc.id, editingRequirementDocContent);
        return result.itemUpdated ? result.updatedItems : prevDocs;
      });
      toast({ title: "Requirement Document Saved (Mock)", description: `Content of "${editingRequirementDoc.name}" updated.` });
      setIsEditRequirementDocDialogOpen(false);
      setEditingRequirementDoc(null);
      setEditingRequirementDocContent("");
    }
  }, [editingRequirementDoc, editingRequirementDocContent, toast, updateFileContentRecursive]);

  const handleOpenDeleteRequirementDocConfirmation = useCallback((doc: ProjectFile) => {
    setRequirementDocToDelete(doc);
    setIsDeleteRequirementDocConfirmationOpen(true);
  }, []);

  const confirmDeleteRequirementDocOrFolder = useCallback(() => {
    if (requirementDocToDelete) {
        setProjectRequirementDocs(prevDocs => {
            const { updatedItems, itemDeleted } = deleteFileOrFolderRecursive(prevDocs, requirementDocToDelete.id);
            if (itemDeleted) {
                 toast({ title: `${requirementDocToDelete.type === 'folder' ? 'Folder' : 'Document'} Deleted`, description: `"${requirementDocToDelete.name}" has been removed from requirements.`, variant: "destructive" });
            } else {
                toast({ title: "Error", description: "Could not find item to delete.", variant: "destructive" });
            }
            return updatedItems;
        });
        setRequirementDocToDelete(null);
        setIsDeleteRequirementDocConfirmationOpen(false);
    }
  }, [requirementDocToDelete, toast, deleteFileOrFolderRecursive]);

  const displayedRequirementDocs = useMemo(() => {
    return getFilesForCurrentPath(projectRequirementDocs, currentRequirementDocPath);
  }, [projectRequirementDocs, currentRequirementDocPath, getFilesForCurrentPath]);


  // Repository File Browser Functions
  const handleNavigateFolder = useCallback((folderName: string) => {
    setCurrentFilePath(prevPath => {
      const normalizedPrevPath = prevPath === '/' ? prevPath : (prevPath.endsWith('/') ? prevPath : `${prevPath}/`);
      return `${normalizedPrevPath}${folderName}/`;
    });
  }, []);

  const handleNavigateUp = useCallback(() => {
    if (currentFilePath === '/') return;
    const pathSegments = currentFilePath.split('/').filter(p => p);
    pathSegments.pop(); // Remove last segment
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
    toast({ title: "Folder Created", description: `Folder "${newFolderItem.name}" created in ${currentFilePath === '/' ? 'Repository root' : currentFilePath}.` });

    setIsNewFolderDialogOpen(false);
    setNewFolderName("");
  }, [newFolderName, projectId, currentFilePath, toast, addFileOrFolderRecursive]);

  const handleFileUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    let updatedProjectFilesState = projectFiles; // Start with current state
    let filesAddedCount = 0;

    files.forEach(file => {
      const newFileItem: ProjectFile = {
        id: uid(`file-${projectId.slice(-4)}-${file.name.replace(/\s+/g, '-')}`),
        name: file.name,
        type: 'file',
        path: currentFilePath,
        size: `${(file.size / 1024).toFixed(1)}KB`,
        lastModified: new Date(file.lastModified).toISOString(),
        content: `// Mock content for ${file.name}\n// Actual file content not stored in this prototype for uploaded files.`
      };
      // Use the recursive adder which returns the new array
      updatedProjectFilesState = addFileOrFolderRecursive(updatedProjectFilesState, currentFilePath, newFileItem);
      filesAddedCount++;
    });

    if (filesAddedCount > 0) {
      setProjectFiles(updatedProjectFilesState); // Set the new state
      toast({ title: "Files Uploaded (Mock)", description: `${filesAddedCount} file(s) added to ${currentFilePath === '/' ? 'Repository root' : currentFilePath}.` });
    }
    if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
  }, [projectFiles, projectId, currentFilePath, toast, addFileOrFolderRecursive]);


  const handleOpenEditFileDialog = useCallback((file: ProjectFile) => {
    if (file.type === 'file') {
      setEditingFile(file);
      setEditingFileContent(file.content || `// Content for ${file.name}`);
      setIsEditFileDialogOpen(true);
    }
  }, []);

  const handleSaveFileContent = useCallback(() => {
    if (editingFile) {
      setProjectFiles(prevFiles => {
        const result = updateFileContentRecursive(prevFiles, editingFile.id, editingFileContent);
        return result.itemUpdated ? result.updatedItems : prevFiles;
      });
      toast({ title: "File Saved (Mock)", description: `Content of "${editingFile.name}" updated.` });
      setIsEditFileDialogOpen(false);
      setEditingFile(null);
      setEditingFileContent("");
    }
  }, [editingFile, editingFileContent, toast, updateFileContentRecursive]);

  const handleOpenDeleteFileConfirmation = useCallback((file: ProjectFile) => {
    setFileToDelete(file);
    setIsDeleteFileConfirmationOpen(true);
  }, []);

  const confirmDeleteFileOrFolder = useCallback(() => {
      if (fileToDelete) {
          setProjectFiles(prevFiles => {
              const { updatedItems, itemDeleted } = deleteFileOrFolderRecursive(prevFiles, fileToDelete.id);
              if (itemDeleted) {
                  toast({ title: `${fileToDelete.type === 'folder' ? 'Folder' : 'File'} Deleted`, description: `"${fileToDelete.name}" has been removed from the repository.`, variant: "destructive" });
              } else {
                  toast({ title: "Error", description: "Could not find item to delete.", variant: "destructive" });
              }
              return updatedItems;
          });
          setFileToDelete(null);
          setIsDeleteFileConfirmationOpen(false);
      }
  }, [fileToDelete, toast, deleteFileOrFolderRecursive]);


  const displayedFiles = useMemo(() => {
    return getFilesForCurrentPath(projectFiles, currentFilePath);
  }, [projectFiles, currentFilePath, getFilesForCurrentPath]);

  // Ticket Management Functions
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

  const handleOpenAITaskPlannerWithTicketContext = useCallback((ticketContext?: { title: string; description: string }) => {
    if (ticketContext) {
      const goal = `Address Ticket (ID: mock-${uid('tck').slice(-4)}):\nTitle: ${ticketContext.title}\n\nDescription:\n${ticketContext.description}\n\nPlease plan the necessary tasks.`;
      setAiPlannerPrefillGoal(goal);
    } else {
      setAiPlannerPrefillGoal(undefined); // Ensure it's cleared if no context
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
        <TabsList className="grid w-full grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:w-auto xl:inline-grid rounded-md">
          <TabsTrigger value="taskManagement" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><ListChecks className="mr-1.5 h-4 w-4"/>Task Management</TabsTrigger>
          <TabsTrigger value="projectAssets" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><FolderGit2 className="mr-1.5 h-4 w-4"/>Project Assets</TabsTrigger>
          <TabsTrigger value="aiAutomation" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><Brain className="mr-1.5 h-4 w-4"/>AI & Automation</TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><TicketIconLucide className="mr-1.5 h-4 w-4"/>Tickets</TabsTrigger>
          <TabsTrigger value="kpis" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><TrendingUp className="mr-1.5 h-4 w-4"/>KPIs</TabsTrigger>
        </TabsList>

        <TabsContent value="taskManagement" className="mt-8 sm:mt-4">
            <Card>
                <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
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
                            <DropdownMenuItem onClick={() => handleOpenAITaskPlannerWithTicketContext()}>
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
                                  onViewTask={(task) => handleOpenEditTaskDialog(task, true)}
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
                                            <DropdownMenuItem onClick={() => handleOpenAITaskPlannerWithTicketContext()}>
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
                                            <DropdownMenuItem onClick={() => handleOpenAITaskPlannerWithTicketContext()}>
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
                                                    isDragging={false} // This would need more complex state if we implement visual drag indication
                                                    isDragTarget={reorderTargetTaskId === task.id}
                                                    taskStatusColors={taskStatusColors}
                                                    onDragStart={(e) => handleDragStart(e, task)}
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
                <CardHeader className="p-0">
                    <Tabs defaultValue="requirements" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid sm:grid-cols-2 rounded-none border-b">
                            <TabsTrigger value="requirements" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <ClipboardList className="mr-2 h-4 w-4" />Requirements Docs
                            </TabsTrigger>
                            <TabsTrigger value="repository" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <FolderIcon className="mr-2 h-4 w-4" />Repository
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="requirements" className="mt-0 p-3 sm:p-4 md:p-6">
                            <Card>
                                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-xl">Requirements Documents (ASPICE Folder Structure)</CardTitle>
                                        <CardDescription className="text-xs">Manage requirement specifications and related documents.</CardDescription>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                        <Button variant="outline" size="sm" onClick={() => {
                                            if (isClient) setIsViewTraceabilityMatrixDialogOpen(true);
                                            else toast({ title: "Info", description: "Feature available after page hydration." });
                                        }}  className="w-full sm:w-auto">
                                          <ExternalLink className="mr-2 h-4 w-4" /> View Traceability Matrix
                                        </Button>
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
                                            <UploadCloud className="mr-2 h-4 w-4" /> Upload Document
                                        </Button>
                                        <input type="file" multiple ref={requirementFileInputRef} style={{ display: 'none' }} onChange={handleRequirementFileSelect} accept=".txt,.md,.docx,.pdf"/>
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
                                        {displayedRequirementDocs.map((doc) => (
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
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={(e) => {e.stopPropagation(); if(doc.type === 'file') handleOpenEditRequirementDocDialog(doc); else handleNavigateRequirementFolder(doc.name);}}>
                                                            <Edit2 className="mr-2 h-4 w-4"/> {doc.type === 'file' ? 'Edit/View Content' : 'Open Folder'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive focus:!bg-destructive/10 hover:!text-destructive" onClick={(e) => { e.stopPropagation(); handleOpenDeleteRequirementDocConfirmation(doc); }}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete {doc.type === 'folder' ? 'Folder' : 'Document'}
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
                                        <ClipboardList className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                        <p className="mb-2 font-medium">This folder is empty.</p>
                                        <div className="flex gap-2 mt-2">
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
                                      {displayedFiles.map((file) => (
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
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                                    <MoreVertical className="h-4 w-4" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onClick={(e) => {e.stopPropagation(); if(file.type === 'file') handleOpenEditFileDialog(file); else handleNavigateFolder(file.name);}}>
                                                    <Edit2 className="mr-2 h-4 w-4"/> {file.type === 'file' ? 'Edit/View Content' : 'Open Folder'}
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem className="text-destructive focus:!bg-destructive/10 hover:!text-destructive" onClick={(e) => {e.stopPropagation(); handleOpenDeleteFileConfirmation(file);}}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete {file.type === 'folder' ? 'Folder' : 'File'}
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
                                    <FolderIcon className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
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
                <CardHeader className="p-0">
                    <Tabs defaultValue="projectAgents" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid sm:grid-cols-2 rounded-none border-b">
                            <TabsTrigger value="projectAgents" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <Bot className="mr-1.5 h-4 w-4"/>Project Agents
                            </TabsTrigger>
                            <TabsTrigger value="projectWorkflows" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <WorkflowIcon className="mr-1.5 h-4 w-4"/>Workflows & Design
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
                                     {(projectWorkflows).length > 0 ? (
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
                                            <Button onClick={handleCloseWorkflowDesigner} variant="outline" size="sm" className="w-full sm:w-auto mt-2 sm:mt-0">
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
                    </Tabs>
                </CardHeader>
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
                      <TableHead className="text-right w-[150px]">Actions</TableHead>
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
                               <DropdownMenuItem onClick={() => handleOpenAITaskPlannerWithTicketContext({title: ticket.title, description: ticket.description})}>
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
                  <TicketIconLucide className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
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
                    <p className="text-muted-foreground text-center py-8">KPI visualizations and details will be displayed here.</p>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>

      {isAITaskPlannerDialogOpen && project && (
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
       {isAddTaskDialogOpen && project && (
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
                This action cannot be undone. This will permanently delete the {taskToDelete.isMilestone ? 'milestone' : 'task'} "{taskToDelete.title}"{tasks.some(t => t.parentId === taskToDelete.id) ? ' and all its sub-task(s)' : ''}.
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
      {project && (
          <AddAgentDialog
            open={isAddProjectAgentDialogOpen}
            onOpenChange={setIsAddProjectAgentDialogOpen}
            onAddAgent={handleAddProjectAgent}
            projectId={projectId} // Pass projectId here
        />
      )}
      {editingProjectAgent && project && (
        <EditAgentDialogAgent
          agent={editingProjectAgent}
          open={isEditAgentDialogOpen}
          onOpenChange={(open) => {
            setIsEditAgentDialogOpen(open);
            if (!open) setEditingProjectAgent(null);
          }}
          onUpdateAgent={handleUpdateProjectAgent}
          projectId={projectId} // Pass projectId here
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
      {isAddWorkflowDialogOpen && project && (
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
       {isChatDialogOpen && chattingTask && project && (
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
      {fileToDelete && (
        <AlertDialog open={isDeleteFileConfirmationOpen} onOpenChange={setIsDeleteFileConfirmationOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete {fileToDelete.type === 'folder' ? 'Folder' : 'File'}: "{fileToDelete.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone.
                        {fileToDelete.type === 'folder' && (fileToDelete.children && fileToDelete.children.length > 0) && " This will permanently delete the folder and all its contents."}
                        {fileToDelete.type === 'folder' && (!fileToDelete.children || fileToDelete.children.length === 0) && " This will permanently delete the empty folder."}
                        {fileToDelete.type === 'file' && " This will permanently delete the file."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setFileToDelete(null); setIsDeleteFileConfirmationOpen(false); }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteFileOrFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete {fileToDelete.type === 'folder' ? 'Folder' : 'File'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

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
      {requirementDocToDelete && (
        <AlertDialog open={isDeleteRequirementDocConfirmationOpen} onOpenChange={setIsDeleteRequirementDocConfirmationOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete {requirementDocToDelete.type === 'folder' ? 'Folder' : 'Document'}: "{requirementDocToDelete.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone.
                        {requirementDocToDelete.type === 'folder' && (requirementDocToDelete.children && requirementDocToDelete.children.length > 0) && " This will permanently delete the folder and all its contents."}
                        {requirementDocToDelete.type === 'folder' && (!requirementDocToDelete.children || requirementDocToDelete.children.length === 0) && " This will permanently delete the empty folder."}
                        {requirementDocToDelete.type === 'file' && " This will permanently delete the document."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setRequirementDocToDelete(null); setIsDeleteRequirementDocConfirmationOpen(false); }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteRequirementDocOrFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete {requirementDocToDelete.type === 'folder' ? 'Folder' : 'Document'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

       {isViewTraceabilityMatrixDialogOpen && project && (
        <AlertDialog open={isViewTraceabilityMatrixDialogOpen} onOpenChange={setIsViewTraceabilityMatrixDialogOpen}>
            <AlertDialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center"><ExternalLink className="mr-2 h-5 w-5"/>Traceability Matrix (Placeholder)</AlertDialogTitle>
                    <AlertDialogDescription>
                        This view will show links between requirement documents, tasks, and other artifacts for project: {project.name}.
                        Full interactive traceability is a future enhancement. For now, it lists root requirement folders, tasks, and tickets.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-4 py-2 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Requirement Documents (ASPICE Structure):</h4>
                      {(projectRequirementDocs).filter(d => d.path === '/').length > 0 ? (
                        <ul className="list-disc list-inside text-xs space-y-1 pl-4">
                          {(projectRequirementDocs).filter(d => d.path === '/').map(doc => (
                            <li key={doc.id} className="text-muted-foreground">
                              <FolderIcon className="inline-block h-4 w-4 mr-1 text-sky-500"/>
                              <span className="font-medium">{doc.name}</span> ({doc.children?.length || 0} sub-item(s))
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
      {isAddTicketDialogOpen && project && (
        <AddTicketDialog
            open={isAddTicketDialogOpen}
            onOpenChange={setIsAddTicketDialogOpen}
            onAddTicket={handleAddNewTicket}
        />
      )}
      {editingTicket && project && (
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
```