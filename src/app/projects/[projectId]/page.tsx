
// src/app/projects/[projectId]/page.tsx
'use client';

import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, Eye, SlidersHorizontal, Lightbulb, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, X as XIcon, Diamond, Users, FolderGit2, MessageSquare, Settings, Brain, PlusSquare, Edit2, Files, FolderIcon, FileIcon, UploadCloud, FolderPlus, ArrowLeftCircle, InfoIcon, ClipboardList, ChevronDown, ChevronRight, Play, Paperclip, Ticket as TicketIconLucide, MoreVertical, Sparkles, Loader2, Layers } from 'lucide-react';
import React, { useEffect, useState, useCallback, useRef, useMemo, Fragment } from 'react';
import type { Project, Task, Agent, ProjectWorkflow, WorkflowNode, WorkflowEdge, ProjectFile, Requirement, RequirementStatus, RequirementPriority, Ticket, TicketStatus, TicketPriority, TicketType, Sprint, SprintStatus, ProjectStatus as AppProjectStatus } from '@/types';
import { initialMockProjects, PROJECTS_STORAGE_KEY, getTasksStorageKey, getAgentsStorageKey, getWorkflowsStorageKey, getFilesStorageKey, getRequirementsStorageKey, getTicketsStorageKey, getSprintsStorageKey } from '@/app/projects/page';
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
import AddTicketDialog from '@/components/features/tickets/AddTicketDialog';
import EditTicketDialog from '@/components/features/tickets/EditTicketDialog';
import { analyzeTicket, type AnalyzeTicketInput, type AnalyzeTicketOutput } from '@/ai/flows/analyze-ticket-flow';
import { generateRequirementDoc, type GenerateRequirementDocInput, type GenerateRequirementDocOutput } from '@/ai/flows/generate-requirement-doc-flow';
import AddRequirementDialog from '@/components/features/requirements/AddRequirementDialog';
import GenerateRequirementDocDialog from '@/components/features/requirements/GenerateRequirementDocDialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanProjectTaskOutput } from '@/ai/flows/plan-project-task-flow';
import { projectStatuses, ticketTypes, ticketPriorities, ticketStatuses as ticketStatusEnumArray, sprintStatuses, requirementStatuses, requirementPriorities, taskStatuses } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { useRouter, useParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';

const NO_PARENT_VALUE = "__NO_PARENT_SELECTED__";
const NO_SPRINT_VALUE = "__NO_SPRINT_SELECTED__";


// Color mappings
const projectStatusColors: { [key in AppProjectStatus]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

const taskStatusColors: { [key in TaskStatus]: string } = {
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

const requirementStatusColors: { [key in RequirementStatus]: string } = {
  'Draft': 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  'Under Review': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600',
  'Approved': 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700',
  'Implemented': 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  'Obsolete': 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700',
  'Rejected': 'bg-pink-100 text-pink-700 dark:bg-pink-700/30 dark:text-pink-300 border-pink-300 dark:border-pink-600',
};

const requirementPriorityColors: { [key in RequirementPriority]: string } = {
  'High': 'text-red-600 dark:text-red-400',
  'Medium': 'text-yellow-600 dark:text-yellow-400',
  'Low': 'text-green-600 dark:text-green-400',
};

const sprintStatusColors: { [key in SprintStatus]: string } = {
  'Planned': 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
};

const allTicketTypes = ['All' as const, ...ticketTypes];

// Define these functions outside the component if they don't depend on component state/props
const initialProjectScopedMockAgents = (currentProjectId: string): Agent[] => {
    if (!currentProjectId) return [];
    return [
      { id: uid(`proj-${currentProjectId.slice(-4)}-req-elicit`), name: 'ASPICE Requirements Elicitation & Analysis Agent', type: 'Analysis Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SYS.1", "SYS.2", "SWE.1"], elicitationMethods: ["Stakeholder Interviews", "Workshops", "Document Analysis"], outputArtifacts: ["StakeholderRequirementsSpecification.docx", "SystemRequirementsSpecification.pdf", "RequirementsTraceabilityMatrix.xlsx"], validationCriteria: "SMART, Testable, Unambiguous", toolIntegration: ["Jira", "Confluence"], complianceLevel: "ASPICE Level 2 Target", keywords: ["requirements", "elicitation", "analysis", "specification", "validation", "aspice", "sys.1", "sys.2", "swe.1"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-sys-arch`), name: 'ASPICE System Architectural Design Agent', type: 'Design Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SYS.3"], modelingLanguage: "SysML_with_AUTOSAR_Profile", viewpoints: ["Logical View", "Physical View", "Process View", "Deployment View"], designPrinciples: ["Modularity", "Scalability", "Security-by-Design", "Safety-in-Depth"], interfaceDefinition: "AUTOSAR XML (ARXML)", inputArtifacts: ["SystemRequirementsSpecification.pdf", "SafetyGoals.docx"], outputArtifacts: ["SystemArchitectureDesignDocument.vsdx", "InterfaceControlDocument.xlsx"], tradeOffAnalysis: ["Performance vs. Cost", "Safety vs. Complexity"], keywords: ["system architecture", "sysml", "autosar", "design principles", "aspice", "sys.3"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-sw-arch`), name: 'ASPICE Software Architectural Design Agent', type: 'Design Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SWE.2"], designPatterns: ["Microservices", "Layered Architecture", "Event-Driven", "Service-Oriented Architecture"], componentSpecification: "Detailed component interfaces, responsibilities, and interactions", dynamicBehaviorModeling: "Sequence Diagrams, State Machines", resourceAllocation: "Memory budget, CPU time allocation per component", inputArtifacts: ["SoftwareRequirementsSpecification.docx", "SystemArchitectureDesignDocument.vsdx"], outputArtifacts: ["SoftwareArchitectureDesign.drawio", "ComponentInteractionMatrix.xlsx"], keywords: ["software architecture", "design patterns", "uml", "component design", "aspice", "swe.2"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-sw-detail`), name: 'ASPICE Software Detailed Design & Implementation Agent', type: 'Development Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SWE.3", "SWE.4 (Unit Construction)"], programmingLanguages: ["C++17", "Python 3.9+", "MISRA C/C++"], codingStandards: "AUTOSAR C++14 Coding Guidelines, MISRA C:2012", unitTestFrameworks: ["GoogleTest", "pytest", "CppUnit"], staticAnalysisTools: ["Clang-Tidy", "PVS-Studio", "Coverity"], codeQualityGates: ["Min. 85% Code Coverage", "Zero Critical Static Analysis Warnings"], inputArtifacts: ["SoftwareArchitectureDesign.drawio", "ComponentSpecifications.md"], outputArtifacts: ["SourceCodeRepository (Git)", "UnitTestsCoverageReport.html", "StaticAnalysisResults.xml"], keywords: ["detailed design", "implementation", "coding standards", "unit testing", "static analysis", "aspice", "swe.3", "swe.4"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-unit-verif`), name: 'ASPICE Software Unit Verification Agent', type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SWE.4 (Unit Verification)"], verificationMethods: ["Static Code Analysis", "Dynamic Analysis (Unit Tests)", "Code Reviews (Automated Checklist)"], testCaseDesignTechniques: ["Equivalence Partitioning", "Boundary Value Analysis", "Statement Coverage", "Branch Coverage"], coverageGoalPercent: { "statement": 90, "branch": 80 }, inputArtifacts: ["SourceCodeUnits", "DetailedDesignSpecifications", "Unit Test Cases"], outputArtifacts: ["UnitVerificationReport.xml", "CodeCoverageReport.html", "StaticAnalysisViolations.csv"], tooling: ["gcov/lcov", "JaCoCo", "BullseyeCoverage"], keywords: ["unit verification", "code coverage", "test cases", "static analysis", "dynamic analysis", "aspice", "swe.4"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-sw-int`), name: 'ASPICE Software Integration Testing Agent', type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SWE.5"], integrationStrategy: "Incremental (Top-down, Bottom-up, or Sandwich)", testEnvironmentSetup: "Simulated environment with stubs and drivers for dependencies", stubbingFramework: "GoogleMock, Mockito, NSubstitute", interfaceTesting: "Verification of data exchange and control flow between software units/components", inputArtifacts: ["IntegratedSoftwareModules", "SoftwareArchitectureDesign.drawio", "InterfaceSpecifications.md"], outputArtifacts: ["SoftwareIntegrationTestReport.pdf", "DefectLog.xlsx"], keywords: ["software integration testing", "interface testing", "stubs", "drivers", "aspice", "swe.5"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-sw-qual`), name: 'ASPICE Software Qualification Testing Agent', type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SWE.6"], testingMethods: ["BlackBoxTesting", "Requirement-Based Testing", "AlphaTesting (Simulated User Scenarios)"], testEnvironment: "Target-like or production-similar environment", acceptanceCriteriaSource: ["SoftwareRequirementsSpecification.docx", "UserStories.md"], nonFunctionalTesting: ["Performance (basic load)", "Usability (heuristic evaluation)"], inputArtifacts: ["CompletedSoftwareProduct", "SoftwareRequirementsSpecification.docx"], outputArtifacts: ["SoftwareQualificationTestReport.pdf", "TraceabilityMatrix_Req_To_Test.xlsx"], keywords: ["software qualification testing", "black-box testing", "acceptance testing", "aspice", "swe.6"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-sys-int`), name: 'ASPICE System Integration Testing Agent', type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SYS.4"], testEnvironment: "Hardware-in-the-Loop (HIL) or full system bench", dataSeedingRequired: true, interfaceVerification: "Between system components (HW/SW, SW/SW)", inputArtifacts: ["IntegratedSystemComponents", "SystemArchitectureDesignDocument.vsd", "SystemInterfaceSpecifications.xlsx"], outputArtifacts: ["SystemIntegrationTestReport.xml", "SystemIntegrationDefectLog.csv"], keywords: ["system integration testing", "hil", "interface verification", "aspice", "sys.4"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-sys-qual`), name: 'ASPICE System Qualification Testing Agent', type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SYS.5"], validationMethods: ["UserScenarioTesting (End-to-End)", "PerformanceTesting (Nominal & Stress)", "SecurityScans (Basic)"], testEnvironment: "Production-representative environment or actual target environment", acceptanceCriteriaSource: ["SystemRequirementsSpecification.pdf", "StakeholderRequirements.docx"], inputArtifacts: ["CompletedSystemProduct", "CustomerAcceptanceCriteria.md"], outputArtifacts: ["SystemQualificationTestReport.pdf", "FinalValidationReport.docx"], keywords: ["system qualification testing", "validation", "end-to-end testing", "user scenarios", "aspice", "sys.5"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-pm`), name: 'ASPICE Project Management Support Agent', type: 'Reporting Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["MAN.3 (Project Management)", "MAN.5 (Risk Management)"], reportingFrequency: "Weekly, Bi-weekly, Monthly (configurable)", riskAssessmentMethod: "FMEA, Risk Matrix", kpiToTrack: ["ScheduleVariance", "EffortVariance", "DefectDensity", "RequirementsVolatility", "ASPICEComplianceScore"], tools: ["Jira_Interface", "Gantt_Generator_API", "RiskRegister_Interface"], outputArtifacts: ["ProjectStatusReport.pdf", "RiskManagementPlan.docx", "ProjectTimeline.mppx"], keywords: ["project management", "reporting", "risk management", "kpi tracking", "aspice", "man.3", "man.5"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-qa`), name: 'ASPICE Quality Assurance Support Agent', type: 'Custom Logic Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SUP.1 (Quality Assurance)", "SUP.4 (Joint Review)"], auditActivities: ["ProcessComplianceChecks (automated & manual checklists)", "WorkProductReviews (document & code scans)"], metricsCollection: ["DefectEscapeRate", "ReviewEffectiveness", "ProcessAdherencePercentage"], problemResolutionTrackingSystem: "Integrated with project's ticket system", reporting: "QA_StatusReport.pptx, AuditFindings.xlsx", keywords: ["quality assurance", "process compliance", "audits", "reviews", "aspice", "sup.1", "sup.4"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-cm`), name: 'ASPICE Configuration Management Support Agent', type: 'CI/CD Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SUP.8 (Configuration Management)", "SUP.9 (Problem Resolution Management)", "SUP.10 (Change Request Management)"], versionControlSystem: "Git (with GitFlow branching model)", baseliningStrategy: "ReleaseBased, SprintBased (configurable)", changeRequestSystemIntegration: "Jira, ServiceNow", buildAutomationTool: "Jenkins, GitLab CI", artifactRepository: "Artifactory, Nexus", keywords: ["configuration management", "version control", "baselining", "change management", "ci/cd", "aspice", "sup.8", "sup.9", "sup.10"] } },
      { id: uid(`proj-${currentProjectId.slice(-4)}-doc`), name: 'ASPICE Technical Documentation Agent', type: 'Documentation Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SUP.7 (Documentation)"], documentTypes: ["SystemRequirementsSpecification", "SoftwareRequirementsSpecification", "ArchitectureDesignDocument", "DetailedDesignDocument", "TestPlan", "TestReport", "UserManual", "MaintenanceManual"], outputFormats: ["PDF/A", "Markdown", "HTML", "ConfluenceExport"], templateRepository: "SharedDocTemplates_GitRepo", reviewCycle: "AutomatedPeerReview (Grammar, Style, Link Checking) then ManualReview", versioning: "SemanticVersioning tied to CM baselines", keywords: ["documentation", "manuals", "specifications", "reports"] } },
    ];
};

const initialMockTasksForProject = (currentProjectId: string, currentProjectName: string | undefined): Task[] => {
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
    { id: kickoffMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Project Kick-off`, status: 'Done', assignedTo: 'ASPICE Project Management Support Agent', startDate: format(addDays(today, -15), 'yyyy-MM-dd'), durationDays: 0, progress: 100, isMilestone: true, parentId: null, dependencies: [], description: "Official project kick-off milestone achieved. (Corresponds to MAN.3)", isAiPlanned: false, sprintId: null },
    { id: reqTaskId, projectId: currentProjectId, title: `Define ${currentProjectName} Scope & Requirements`, status: 'Done', assignedTo: 'Requirements Engineering Process', startDate: format(addDays(today, -14), 'yyyy-MM-dd'), durationDays: 5, progress: 100, isMilestone: false, parentId: null, dependencies: [kickoffMilestoneId], description: "Initial scoping and requirements gathering for the project. (ASPICE SYS.1, SYS.2, SWE.1)", isAiPlanned: false, sprintId: null },
    { id: designTaskId, projectId: currentProjectId, title: `Design ${currentProjectName} Architecture`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(today, -9), 'yyyy-MM-dd'), durationDays: 7, progress: 60, isMilestone: false, parentId: reqTaskId, dependencies: [reqTaskId], description: "High-level and detailed design of the software architecture. (ASPICE SWE.2, SWE.3)", isAiPlanned: false, sprintId: null },
    { id: devTaskId, projectId: currentProjectId, title: `Implement Core Logic for ${currentProjectName}`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(today, -2), 'yyyy-MM-dd'), durationDays: 10, progress: 40, parentId: designTaskId, dependencies: [], isMilestone: false, description: "Core development phase, implementing key functionalities. (ASPICE SWE.4)", isAiPlanned: false, sprintId: null },
    { id: subTaskApiId, projectId: currentProjectId, parentId: devTaskId, title: `Implement API Endpoints`, status: 'To Do', assignedTo: 'ASPICE Software Detailed Design & Implementation Agent', startDate: todayFormatted, durationDays: 3, progress: 0, isMilestone: false, dependencies: [], description: "Develop and unit test the necessary API endpoints for the core logic.", isAiPlanned: false, sprintId: null },
    { id: testTaskId, projectId: currentProjectId, title: `Test ${currentProjectName} Integration & Qualification`, status: 'To Do', assignedTo: 'Software Testing & QA Cycle', startDate: format(addDays(today, 8), 'yyyy-MM-dd'), durationDays: 5, progress: 0, parentId: null, dependencies: [devTaskId], isMilestone: false, description: "Perform integration testing of developed components and system-level qualification tests. (ASPICE SWE.5, SWE.6)", isAiPlanned: false, sprintId: null },
    { id: alphaMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Alpha Release Milestone`, status: 'To Do', assignedTo: 'ASPICE Project Management Support Agent', startDate: format(addDays(today, 13), 'yyyy-MM-dd'), durationDays: 0, progress: 0, isMilestone: true, parentId: null, dependencies: [testTaskId], description: "Target date for the Alpha release of the project.", isAiPlanned: false, sprintId: null },
  ];
};

const predefinedWorkflowsData = (currentProjectId: string): ProjectWorkflow[] => {
  if (!currentProjectId) return [];
  const baseWorkflows: Array<Omit<ProjectWorkflow, 'id' | 'status' | 'lastRun'>> = [
    {
      name: "Requirements Engineering Process",
      description: "Handles elicitation, analysis, specification, and validation of project requirements. Aligns with ASPICE SYS.1, SYS.2, SWE.1.",
      nodes: [
        { id: 'node-req-elicit', name: 'Elicit Stakeholder Needs', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SYS.1", output: "StakeholderRequirements.docx" }, x: 50, y: 50 },
        { id: 'node-req-sysana', name: 'Analyze System Requirements', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SYS.2", input: "StakeholderRequirements.docx", output: "SystemRequirements.spec" }, x: 300, y: 50 },
        { id: 'node-req-swspec', name: 'Specify Software Requirements', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SWE.1", input: "SystemRequirements.spec", output: "SoftwareRequirements.spec" }, x: 50, y: 200 },
        { id: 'node-req-valid', name: 'Validate Requirements', type: 'ASPICE Quality Assurance Support Agent', config: { reviewType: 'Formal Review', against: ["StakeholderRequirements.docx", "SystemRequirements.spec"], output: "ValidationReport.pdf" }, x: 300, y: 200 }
      ],
      edges: [
        { id: 'edge-req-1-2', sourceNodeId: 'node-req-elicit', targetNodeId: 'node-req-sysana' },
        { id: 'edge-req-2-3', sourceNodeId: 'node-req-sysana', targetNodeId: 'node-req-swspec' },
        { id: 'edge-req-3-4', sourceNodeId: 'node-req-swspec', targetNodeId: 'node-req-valid' }
      ]
    },
    {
      name: "Software Design & Implementation Cycle",
      description: "Covers software architectural design, detailed design, coding, and unit testing. Aligns with ASPICE SWE.2, SWE.3, SWE.4.",
      nodes: [
        { id: 'node-des-arch', name: 'Define Software Architecture', type: 'ASPICE Software Architectural Design Agent', config: { activity: "SWE.2", input: "SoftwareRequirements.spec", output: "SoftwareArchitecture.diagram" }, x: 50, y: 50 },
        { id: 'node-des-detail', name: 'Detailed Software Design', type: 'ASPICE Software Detailed Design & Implementation Agent', config: { activity: "SWE.3", input: "SoftwareArchitecture.diagram", output: "DetailedDesignDoc.md" }, x: 300, y: 50 },
        { id: 'node-des-impl', name: 'Implement Software Units', type: 'ASPICE Software Detailed Design & Implementation Agent', config: { activity: "SWE.4 Construction", input: "DetailedDesignDoc.md", output: "SourceCode.zip" }, x: 50, y: 200 },
        { id: 'node-des-unitver', name: 'Verify Software Units', type: 'ASPICE Software Unit Verification Agent', config: { activity: "SWE.4 Verification", input: "SourceCode.zip", criteria: "Unit Test Coverage 90%" }, x: 300, y: 200 }
      ],
      edges: [
        { id: 'edge-des-1-2', sourceNodeId: 'node-des-arch', targetNodeId: 'node-des-detail' },
        { id: 'edge-des-2-3', sourceNodeId: 'node-des-detail', targetNodeId: 'node-des-impl' },
        { id: 'edge-des-3-4', sourceNodeId: 'node-des-impl', targetNodeId: 'node-des-unitver' }
      ]
    },
    {
      name: "Software Testing & QA Cycle",
      description: "Manages integration testing, system testing, and quality assurance activities. Aligns with ASPICE SWE.5, SWE.6, SUP.1.",
      nodes: [
        { id: 'node-test-plan', name: 'Plan Integration & Qualification Tests', type: 'ASPICE Software Qualification Testing Agent', config: { testPhase: "Integration & Qualification", input: ["SoftwareRequirements.spec", "SoftwareArchitecture.diagram"] }, x: 50, y: 50 },
        { id: 'node-test-int', name: 'Execute Software Integration Tests', type: 'ASPICE Software Integration Testing Agent', config: { activity: "SWE.5", input: "IntegratedSoftware.bin", output: "IntegrationTestReport.xml" }, x: 300, y: 50 },
        { id: 'node-test-qual', name: 'Execute Software Qualification Tests', type: 'ASPICE Software Qualification Testing Agent', config: { activity: "SWE.6", input: "IntegratedSoftware.bin", output: "QualificationTestReport.xml" }, x: 50, y: 200 },
        { id: 'node-test-qa', name: 'Quality Assurance Review', type: 'ASPICE Quality Assurance Support Agent', config: { activity: "SUP.1", artifacts: ["IntegrationTestReport.xml", "QualificationTestReport.xml"] }, x: 300, y: 200 }
      ],
      edges: [
        { id: 'edge-test-1-2', sourceNodeId: 'node-test-plan', targetNodeId: 'node-test-int' },
        { id: 'edge-test-1-3', sourceNodeId: 'node-test-plan', targetNodeId: 'node-test-qual' },
        { id: 'edge-test-2-4', sourceNodeId: 'node-test-int', targetNodeId: 'node-test-qa' },
        { id: 'edge-test-3-4', sourceNodeId: 'node-test-qual', targetNodeId: 'node-test-qa' }
      ]
    },
    {
      name: "Project Monitoring & Reporting",
      description: "Collects project metrics, monitors progress, manages risks, and generates status reports. Aligns with ASPICE MAN.3, MAN.5.",
      nodes: [
        { id: 'node-mon-gather', name: 'Gather Task Progress Data', type: 'ASPICE Project Management Support Agent', config: { source: "Task List", metrics: ["Status", "Progress"] }, x: 50, y: 50 },
        { id: 'node-mon-risk', name: 'Analyze Risk & Issues', type: 'ASPICE Project Management Support Agent', config: { source: "Tickets, Risk Register", activity: "MAN.5" }, x: 300, y: 50 },
        { id: 'node-mon-report', name: 'Generate Weekly Status Report', type: 'ASPICE Project Management Support Agent', config: { frequency: "Weekly", output: "StatusReport.pdf" }, x: 50, y: 200 },
        { id: 'node-mon-kpi', name: 'Update Project KPIs', type: 'ASPICE Project Management Support Agent', config: { kpis: ["OnTimeDelivery", "BudgetAdherence"] }, x: 300, y: 200 }
      ],
      edges: [
        { id: 'edge-mon-1-3', sourceNodeId: 'node-mon-gather', targetNodeId: 'node-mon-report' },
        { id: 'edge-mon-2-3', sourceNodeId: 'node-mon-risk', targetNodeId: 'node-mon-report' },
        { id: 'edge-mon-3-4', sourceNodeId: 'node-mon-report', targetNodeId: 'node-mon-kpi' }
      ]
    },
  ];

  // Make node and edge IDs unique for this project instance
  return baseWorkflows.map((wf, wfIndex) => {
    const wfIdPrefix = `pd-wf-${currentProjectId.slice(-4)}-${wfIndex}`;
    const nodeMap = new Map<string, string>();

    const newNodes = (wf.nodes || []).map((n, nodeIndex) => {
        const originalNodeId = n.id;
        const newNodeId = uid(`${wfIdPrefix}-node-${nodeIndex}`);
        nodeMap.set(originalNodeId, newNodeId);
        return { ...n, id: newNodeId };
    });

    const newEdges = (wf.edges || []).map((e, edgeIndex) => ({
        id: uid(`${wfIdPrefix}-edge-${edgeIndex}`),
        sourceNodeId: nodeMap.get(e.sourceNodeId) || 'unknown-source-' + e.sourceNodeId,
        targetNodeId: nodeMap.get(e.targetNodeId) || 'unknown-target-' + e.targetNodeId,
    }));

    return {
        ...wf,
        id: uid(wfIdPrefix),
        status: 'Draft' as ProjectWorkflow['status'],
        lastRun: undefined,
        nodes: newNodes,
        edges: newEdges,
    };
  });
};


const initialMockFilesData = (projectId: string, currentProjectName: string | undefined): ProjectFile[] => {
  if (!projectId || !currentProjectName) return [];
  let fileEntryIndex = 0;
  const createStructureRecursive = (entries: any[], parentPath: string): ProjectFile[] => {
    return entries.map(entry => {
      fileEntryIndex++;
      const entryId = uid(`file-${entry.type}-${projectId.slice(-3)}-${entry.name.split(/[\\s.]+/)[0].toLowerCase().substring(0,5)}${fileEntryIndex}`);
      const newEntry: ProjectFile = {
        id: entryId,
        name: entry.name,
        type: entry.type as "file" | "folder",
        path: parentPath,
        lastModified: new Date(Date.now() - (fileEntryIndex * 1000 * 60 * 60 * 24 * (fileEntryIndex % 7 + 1))).toISOString(),
        content: entry.type === 'file' ? (entry.content || `// Mock content for ${entry.name} in project ${currentProjectName || 'N/A'}`) : undefined,
        size: entry.type === 'file' ? `${Math.floor(Math.random() * 1500) + 20}KB` : undefined,
        children: entry.children ? createStructureRecursive(entry.children, `${parentPath}${entry.name}/`) : [],
      };
      return newEntry;
    });
  };
  const generalFileStructure = [
    { name: 'Project_Charter.docx', type: 'file', content: "This is the project charter document for " + (currentProjectName || "this project") + "." },
    { name: 'General_Documentation', type: 'folder', children: [
        { name: 'User_Stories_v1.0.docx', type: 'file', content: "User stories v1.0 for " + (currentProjectName || "this project") + "." },
      ]
    },
    { name: 'Design_Artifacts', type: 'folder', children: [
        { name: 'UI_Mockups_v1.0.pdf', type: 'file', content: "UI Mockups v1.0 - PDF Content Placeholder for " + (currentProjectName || "this project") + "." },
        { name: 'Detailed_Specs', type: 'folder', children: [
            { name: 'ComponentA_Spec.docx', type: 'file', content: "Detailed specification for Component A of " + (currentProjectName || "this project") + "." },
          ]
        },
      ]
    },
    { name: 'Source_Code', type: 'folder', children: [
      {name: 'main.py', type: 'file', content: 'print("Hello from Source Code!")' }
    ]},
    { name: 'Test_Cases', type: 'folder', children: [
        { name: 'MasterTestPlan.docx', type: 'file', content: "Master Test Plan document for " + (currentProjectName || "this project") + "." },
      ]
    },
    { name: 'MeetingNotes_Kickoff.txt', type: 'file', content: "Notes from the project kickoff meeting for " + (currentProjectName || "this project") + "." },
  ];
  return createStructureRecursive(generalFileStructure, '/');
};

const initialMockRequirementDocs = (projectId: string, projectName: string | undefined): ProjectFile[] => {
  if (!projectId) return [];
  let fileEntryIndex = 0;
  const createStructureRecursive = (entries: any[], parentPath: string): ProjectFile[] => {
    return entries.map(entry => {
      fileEntryIndex++;
      const entryId = uid(`reqdoc-${entry.type}-${projectId.slice(-3)}-${entry.name.split(/[\\s.]+/)[0].toLowerCase().substring(0,5)}${fileEntryIndex}`);
      const newEntry: ProjectFile = {
        id: entryId,
        name: entry.name,
        type: entry.type as "file" | "folder",
        path: parentPath,
        lastModified: new Date(Date.now() - (fileEntryIndex * 1000 * 60 * 60 * 24 * (fileEntryIndex % 5 + 1))).toISOString(),
        content: entry.type === 'file' ? (entry.content || `Placeholder content for ${entry.name} related to ASPICE ${entry.name.split('_')[1] || 'process'}. Project: ${projectName || 'Current Project'}.`) : undefined,
        size: entry.type === 'file' ? `${Math.floor(Math.random() * 150) + 20}KB` : undefined,
        children: entry.children ? createStructureRecursive(entry.children, `${parentPath}${entry.name}/`) : [],
      };
      return newEntry;
    });
  };

  const aspiceFolders = [
    { name: "SYS - System Engineering Process Group", type: "folder", children: [
      { name: "SYS.1 Stakeholder Requirements Elicitation", type: "folder", children: [
        {name: `Stakeholder_Requirements_Specification.docx`, type: "file", content: `# Stakeholder Requirements Specification (SYS.1)\n\n## Project: ${projectName || 'N/A'}\n\n### 1. Introduction\nThis document outlines the stakeholder requirements...\n\n### 2. Requirements\n- REQ_STAKE_001: The system shall allow user login.\n- REQ_STAKE_002: The user interface shall be intuitive.`},
      ]},
      { name: "SYS.2 System Requirements Analysis", type: "folder", children: [
        {name: `System_Requirements_Specification.docx`, type: "file", content: `# System Requirements Specification (SYS.2)\n\nDerived from Stakeholder Requirements for project ${projectName || 'N/A'}.\n\n- SYS_REQ_001: The system must authenticate users via username/password.\n- SYS_REQ_002: The system shall respond to user actions within 2 seconds.`},
      ]},
      { name: "SYS.3 System Architectural Design", type: "folder", children: [
        {name: `System_Architecture_Design.vsdx`, type: "file", content: `(Mock Visio Content) System architecture diagrams for project ${projectName || 'N/A'}, showing major components and interfaces.`},
      ]},
      { name: "SYS.4 System Integration and Integration Test", type: "folder", children: [
        {name: `System_Integration_Test_Plan.docx`, type: "file", content: `# System Integration Test Plan (SYS.4)\n\nTest plan for integrating system components of project ${projectName || 'N/A'}.`},
        {name: `System_Integration_Test_Report.pdf`, type: "file", content: `(Mock PDF Content) Results of system integration testing.`},
      ]},
      { name: "SYS.5 System Qualification Test", type: "folder", children: [
        {name: `System_Qualification_Test_Plan.docx`, type: "file", content: `# System Qualification Test Plan (SYS.5)\n\nPlan for overall system qualification for project ${projectName || 'N/A'}.`},
        {name: `System_Qualification_Test_Report.pdf`, type: "file", content: `(Mock PDF Content) Results of system qualification testing.`},
      ]},
    ]},
    { name: "SWE - Software Engineering Process Group", type: "folder", children: [
      { name: "SWE.1 Software Requirements Analysis", type: "folder", children: [
        {name: `Software_Requirements_Specification.docx`, type: "file", content: `# Software Requirements Specification (SWE.1)\n\nDetailed software requirements for project ${projectName || 'N/A'}, derived from system requirements.`},
      ]},
      { name: "SWE.2 Software Architectural Design", type: "folder", children: [
        {name: `Software_Architecture_Design.drawio`, type: "file", content: `(Mock Draw.io Content) Software architecture diagrams (components, modules, interfaces) for project ${projectName || 'N/A'}.`},
      ]},
      { name: "SWE.3 Software Detailed Design and Unit Construction", type: "folder", children: [
        {name: `Module_X_Detailed_Design.md`, type: "file", content: `## Module X Detailed Design (SWE.3)\n\nDetailed design specifications for Module X in project ${projectName || 'N/A'}.`},
      ]},
      { name: "SWE.4 Software Unit Verification", type: "folder", children: [
        {name: `Unit_Test_Report_Module_X.xml`, type: "file", content: `<!-- Mock JUnit XML Report -->\n<testsuite name="ModuleXTests" tests="10" failures="0" errors="0" skipped="0" timestamp="..." time="0.5">\n  <testcase name="testFeatureA" classname="ModuleXTest" time="0.05"/>\n</testsuite>`},
      ]},
      { name: "SWE.5 Software Integration and Integration Test", type: "folder", children: [
        {name: `Software_Integration_Test_Report.pdf`, type: "file", content: `(Mock PDF Content) Report detailing results of software integration tests for project ${projectName || 'N/A'}.`},
      ]},
      { name: "SWE.6 Software Qualification Test", type: "folder", children: [
        {name: `Software_Qualification_Test_Report.pdf`, type: "file", content: `(Mock PDF Content) Report on software qualification tests against SWE.1 requirements for project ${projectName || 'N/A'}.`},
      ]},
    ]},
     { name: "SUP - Supporting Process Group", type: "folder", children: [
      { name: "SUP.1 Quality Assurance", type: "folder", children: [
        {name: `Quality_Assurance_Plan.docx`, type: "file", content: `# Quality Assurance Plan (SUP.1)\n\nProject quality assurance strategy and activities for project ${projectName || 'N/A'}.`},
        {name: `Audit_Report_Q1.pdf`, type: "file", content: `(Mock PDF Content) Q1 Audit Report.`},
        ]},
      { name: "SUP.8 Configuration Management", type: "folder", children: [
        {name: `Configuration_Management_Plan.docx`, type: "file", content: `# Configuration Management Plan (SUP.8)\n\nPlan for configuration identification, control, status accounting, and audit for project ${projectName || 'N/A'}.`},
        {name: `Baseline_Audit_Report.pdf`, type: "file", content: `(Mock PDF Content) Report of baseline audit.`},
        ]},
      { name: "SUP.9 Problem Resolution Management", type: "folder", children: [
        {name: `Problem_Resolution_Strategy.md`, type: "file", content: `## Problem Resolution Strategy (SUP.9)\n\nProcess for identifying, analyzing, and resolving problems in project ${projectName || 'N/A'}.`},
      ]},
      { name: "SUP.10 Change Request Management", type: "folder", children: [
        {name: `Change_Management_Plan.docx`, type: "file", content: `# Change Management Plan (SUP.10)\n\nProcess for managing change requests for project ${projectName || 'N/A'}.`},
      ]},
    ]},
    { name: "MAN - Management Process Group", type: "folder", children: [
      { name: "MAN.3 Project Management", type: "folder", children: [
        {name: `Project_Management_Plan.mppx`, type: "file", content: `(Mock MS Project Content) Overall project management plan including schedule, resources, and budget for project ${projectName || 'N/A'}.`},
        {name: `Weekly_Status_Report.pdf`, type: "file", content: `(Mock PDF Content) Weekly project status report.`},
      ]},
      { name: "MAN.5 Risk Management", type: "folder", children: [
        {name: `Risk_Management_Plan.docx`, type: "file", content: `# Risk Management Plan (MAN.5)\n\nStrategy and process for risk identification, analysis, treatment, and monitoring for project ${projectName || 'N/A'}.`},
        {name: `Risk_Register.xlsx`, type: "file", content: `(Mock Excel Content) Risk Register with identified risks, likelihood, impact, and mitigation plans.`},
      ]},
    ]},
  ];
  return createStructureRecursive(aspiceFolders, '/');
};

const initialMockTickets = (projectId: string): Ticket[] => {
  if (!projectId) return [];
  return [
    { id: uid(`ticket-${projectId.slice(-3)}-001`), projectId, title: 'Login button unresponsive on Safari', description: 'The main login button does not respond to clicks on Safari browsers. Tested on Safari 15.1.', status: 'Open', priority: 'High', type: 'Bug', createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString(), sprintId: null, assignee: "Bug Fixing Team" },
    { id: uid(`ticket-${projectId.slice(-3)}-002`), projectId, title: 'Add export to CSV feature for project reports', description: 'Users need the ability to export project summary reports to CSV format for external analysis.', status: 'Open', priority: 'Medium', type: 'Feature Request', createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), sprintId: null, assignee: "Reporting Feature Crew" },
    { id: uid(`ticket-${projectId.slice(-3)}-003`), projectId, title: 'API rate limit documentation needs update', description: 'The documentation regarding API rate limits is confusing and needs clarification on burst vs sustained rates.', status: 'In Progress', priority: 'Medium', type: 'Change Request', assignee: 'ASPICE Technical Documentation Agent', createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString(), sprintId: null },
  ];
};

const initialMockSprintsForProject = (projectId: string): Sprint[] => {
  if (!projectId) return [];
  const today = new Date();
  return [
    { id: uid(`sprint-${projectId.slice(-4)}-1`), projectId, name: "Sprint 1: Foundations", goal: "Setup project basics and core requirements.", startDate: format(addDays(today, -14), 'yyyy-MM-dd'), endDate: format(addDays(today, -1), 'yyyy-MM-dd'), status: 'Completed' },
    { id: uid(`sprint-${projectId.slice(-4)}-2`), projectId, name: "Sprint 2: Core Development", goal: "Implement key features.", startDate: format(today, 'yyyy-MM-dd'), endDate: format(addDays(today, 13), 'yyyy-MM-dd'), status: 'Active' },
    { id: uid(`sprint-${projectId.slice(-4)}-3`), projectId, name: "Sprint 3: Testing & Refinement", goal: "Stabilize and test implemented features.", startDate: format(addDays(today, 14), 'yyyy-MM-dd'), endDate: format(addDays(today, 27), 'yyyy-MM-dd'), status: 'Planned' },
  ];
};


function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAITaskPlannerDialogOpen, setIsAITaskPlannerDialogOpen] = useState(false);
  const [aiPlannerPrefillGoal, setAiPlannerPrefillGoal] = useState<string | undefined>(undefined);
  const [aiPlannerSourceTicketAssignee, setAiPlannerSourceTicketAssignee] = useState<string | undefined>(undefined);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isViewingTask, setIsViewingTask] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);
  const [draggingOverStatus, setDraggingOverStatus] = useState<Task['status'] | null>(null);
  const [reorderTargetTaskId, setReorderTargetTaskId] = useState<string | null>(null);

  // Project Agents State
  const [projectAgents, setProjectAgents] = useState<Agent[]>([]);
  const [isAddProjectAgentDialogOpen, setIsAddProjectAgentDialogOpen] = useState(false);
  const [editingProjectAgent, setEditingProjectAgent] = useState<Agent | null>(null);
  const [isEditProjectAgentDialogOpen, setIsEditProjectAgentDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleteAgentDialogOpen, setIsDeleteAgentDialogOpen] = useState(false);

  // Project Workflows State
  const [projectWorkflows, setProjectWorkflows] = useState<ProjectWorkflow[]>([]);
  const [isAddWorkflowDialogOpen, setIsAddWorkflowDialogOpen] = useState(false);
  const [designingWorkflow, setDesigningWorkflow] = useState<ProjectWorkflow | null>(null);
  const designingWorkflowIdRef = useRef<string | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<ProjectWorkflow | null>(null);
  const [isDeleteWorkflowDialogOpen, setIsDeleteWorkflowDialogOpen] = useState(false);


  // Task Chat Dialog State
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [chattingTask, setChattingTask] = useState<Task | null>(null);

  // Requirement Documents State
  const [projectRequirementDocs, setProjectRequirementDocs] = useState<ProjectFile[]>([]);
  const [currentRequirementDocPath, setCurrentRequirementDocPath] = useState<string>('/');
  const [isNewRequirementFolderDialogOpen, setIsNewRequirementFolderDialogOpen] = useState(false);
  const [newRequirementFolderName, setNewRequirementFolderName] = useState("");
  const requirementFileInputRef = useRef<HTMLInputElement>(null);
  const [editingRequirementDoc, setEditingRequirementDoc] = useState<ProjectFile | null>(null);
  const [editingRequirementDocContent, setEditingRequirementDocContent] = useState<string>("");
  const [isEditRequirementDocDialogOpen, setIsEditRequirementDocDialogOpen] = useState(false);
  const [requirementDocToDelete, setRequirementDocToDelete] = useState<ProjectFile | null>(null);
  const [isDeleteRequirementDocConfirmationOpen, setIsDeleteRequirementDocConfirmationOpen] = useState(false);
  const [isViewTraceabilityMatrixDialogOpen, setIsViewTraceabilityMatrixDialogOpen] = useState(false);
  const [isGenerateReqDocDialogOpen, setIsGenerateReqDocDialogOpen] = useState(false);
  const [isAddRequirementDialogOpen, setIsAddRequirementDialogOpen] = useState(false);


  // Repository Files State
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string>('/');
  const [isNewRepoFolderDialogOpen, setIsNewRepoFolderDialogOpen] = useState(false);
  const [newRepoFolderName, setNewRepoFolderName] = useState("");
  const repoFileInputRef = useRef<HTMLInputElement>(null);
  const [editingRepoFile, setEditingRepoFile] = useState<ProjectFile | null>(null);
  const [editingRepoFileContent, setEditingRepoFileContent] = useState<string>("");
  const [isEditRepoFileDialogOpen, setIsEditRepoFileDialogOpen] = useState(false);
  const [repoFileToDelete, setRepoFileToDelete] = useState<ProjectFile | null>(null);
  const [isDeleteRepoFileConfirmationOpen, setIsDeleteRepoFileConfirmationOpen] = useState(false);

  // Tickets State
  const [projectTickets, setProjectTickets] = useState<Ticket[]>([]);
  const [isAddTicketDialogOpen, setIsAddTicketDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [isEditTicketDialogOpen, setIsEditTicketDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [isDeleteTicketDialogOpen, setIsDeleteTicketDialogOpen] = useState(false);
  const [selectedTicketTypeFilter, setSelectedTicketTypeFilter] = useState<typeof allTicketTypes[number]>('All');
  const [isAnalyzeTicketResultDialogOpen, setIsAnalyzeTicketResultDialogOpen] = useState(false);
  const [analyzingTicketDetails, setAnalyzingTicketDetails] = useState<Ticket | null>(null);
  const [ticketAnalysisResult, setTicketAnalysisResult] = useState<AnalyzeTicketOutput | null>(null);
  const [isAnalyzingTicketWithAI, setIsAnalyzingTicketWithAI] = useState(false);


  // Project Edit State
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);

  // Sprints State
  const [projectSprints, setProjectSprints] = useState<Sprint[]>([]);
  const [isManageSprintsDialogOpen, setIsManageSprintsDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  
  // Original task indices for stable sort in Kanban
  const originalIndices = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((task, index) => map.set(task.id, index));
    return map;
  }, [tasks]);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatDate = useCallback((dateString: string | undefined, optionsOrFormatString?: { day?: '2-digit', month?: 'short', year?: 'numeric' } | string) => {
    if (!isClient || !dateString) return 'N/A';
    try {
      let date;
      if (typeof dateString === 'string' && (dateString.includes('T') || dateString.length === 10 && dateString.includes('-'))) {
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
      return format(date, 'PPpp'); // Default format if no specific options given
    } catch (e) {
      // console.error("Error formatting date:", dateString, e);
      return String(dateString); // Fallback to original string if parsing/formatting fails
    }
  }, [isClient]);

  // Main data loading effect
  useEffect(() => {
    if (!projectId || !isClient) return;
    console.log(`PROJECT_DETAIL_PAGE: Loading data for project ID: ${projectId}`);

    let allProjects: Project[] = [];
    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (allProjectsStored) {
        try { allProjects = JSON.parse(allProjectsStored); }
        catch (e) { 
            console.error("PROJECT_DETAIL_PAGE: Error parsing projects from localStorage, using initial mocks.", e);
            allProjects = initialMockProjects; 
        }
    } else {
        console.log("PROJECT_DETAIL_PAGE: No projects in localStorage, using initial mocks.");
        allProjects = initialMockProjects;
    }
    const currentProjectData = allProjects.find((p: Project) => p.id === projectId) || null;


    if (!currentProjectData) {
        console.warn(`PROJECT_DETAIL_PAGE: Project with ID ${projectId} not found. Redirecting.`);
        if (isClient) router.push('/'); // Redirect to main projects page if current project not found
        return;
    }
    setProject(currentProjectData);
    console.log(`PROJECT_DETAIL_PAGE: Loaded project: ${currentProjectData.name}`);

    // Load Tasks
    const tasksStorageKey = getTasksStorageKey(projectId);
    const storedTasks = localStorage.getItem(tasksStorageKey);
    try {
      const loadedTasks = storedTasks ? JSON.parse(storedTasks) : initialMockTasksForProject(projectId, currentProjectData.name);
      setTasks(Array.isArray(loadedTasks) ? loadedTasks : initialMockTasksForProject(projectId, currentProjectData.name));
    } catch (e) {
      console.error(`Error parsing tasks for project ${projectId} from localStorage. Initializing with mocks.`, e);
      setTasks(initialMockTasksForProject(projectId, currentProjectData.name));
    }

    // Load Project Agents
    const agentsStorageKey = getAgentsStorageKey(projectId);
    const storedProjectAgents = localStorage.getItem(agentsStorageKey);
    try {
      const loadedProjectAgents = storedProjectAgents ? JSON.parse(storedProjectAgents) : initialProjectScopedMockAgents(projectId);
      setProjectAgents(Array.isArray(loadedProjectAgents) ? loadedProjectAgents : initialProjectScopedMockAgents(projectId));
    } catch (e) {
      console.error(`Error parsing agents for project ${projectId} from localStorage. Initializing with mocks.`, e);
      setProjectAgents(initialProjectScopedMockAgents(projectId));
    }

    // Load Project Workflows
    const workflowsStorageKey = getWorkflowsStorageKey(projectId);
    const storedWorkflows = localStorage.getItem(workflowsStorageKey);
    try {
      let parsedWorkflows = storedWorkflows ? JSON.parse(storedWorkflows) as ProjectWorkflow[] : null;
      if (!parsedWorkflows || !Array.isArray(parsedWorkflows) || parsedWorkflows.length === 0) {
        console.log(`PROJECT_DETAIL_PAGE: No workflows found in localStorage for project ${projectId}. Initializing with predefined ASPICE V-Model template.`);
        parsedWorkflows = predefinedWorkflowsData(projectId);
      } else {
        console.log(`PROJECT_DETAIL_PAGE: Loaded ${parsedWorkflows.length} workflows from localStorage for project ${projectId}.`);
      }
      setProjectWorkflows(parsedWorkflows.map(wf => ({ ...wf, nodes: wf.nodes || [], edges: wf.edges || [] })));
    } catch (e) {
      console.error(`Error parsing/loading workflows for project ${projectId} from localStorage. Initializing with predefined.`, e);
      const defaultWfs = predefinedWorkflowsData(projectId);
      setProjectWorkflows(defaultWfs.map(wf => ({ ...wf, nodes: wf.nodes || [], edges: wf.edges || [] })));
    }

    // Load Repository Files
    const filesStorageKey = getFilesStorageKey(projectId);
    const storedProjectFiles = localStorage.getItem(filesStorageKey);
    try {
      const parsedFiles = storedProjectFiles ? JSON.parse(storedProjectFiles) : initialMockFilesData(projectId, currentProjectData?.name);
      setProjectFiles(Array.isArray(parsedFiles) ? parsedFiles.map(f => ({...f, children: f.type === 'folder' ? (f.children || []) : undefined})) : initialMockFilesData(projectId, currentProjectData?.name));
    } catch (e) {
      console.error(`Error parsing repository files for project ${projectId} from localStorage. Initializing with mocks.`, e);
      setProjectFiles(initialMockFilesData(projectId, currentProjectData?.name));
    }

    // Load Requirement Documents
    const reqDocsStorageKey = getRequirementsStorageKey(projectId);
    const storedReqDocs = localStorage.getItem(reqDocsStorageKey);
    try {
        const parsedReqDocs = storedReqDocs ? JSON.parse(storedReqDocs) : initialMockRequirementDocs(projectId, currentProjectData.name);
        setProjectRequirementDocs(Array.isArray(parsedReqDocs) ? parsedReqDocs.map(f => ({...f, children: f.type === 'folder' ? (f.children || []) : undefined})) : initialMockRequirementDocs(projectId, currentProjectData.name));
    } catch (e) {
        console.error(`Error parsing requirement docs for project ${projectId} from localStorage. Initializing with defaults.`, e);
        setProjectRequirementDocs(initialMockRequirementDocs(projectId, currentProjectData.name));
    }

    // Load Tickets
    const ticketsStorageKey = getTicketsStorageKey(projectId);
    const storedTickets = localStorage.getItem(ticketsStorageKey);
    try {
        const parsedTickets = storedTickets ? JSON.parse(storedTickets) : initialMockTickets(projectId);
        setProjectTickets(Array.isArray(parsedTickets) && parsedTickets.length > 0 ? parsedTickets : initialMockTickets(projectId));
    } catch (e) {
        console.error(`Error parsing tickets for project ${projectId} from localStorage. Initializing with mocks.`, e);
        setProjectTickets(initialMockTickets(projectId));
    }

    // Load Sprints
    const sprintsStorageKey = getSprintsStorageKey(projectId);
    const storedSprints = localStorage.getItem(sprintsStorageKey);
    try {
        const parsedSprints = storedSprints ? JSON.parse(storedSprints) : initialMockSprintsForProject(projectId);
        setProjectSprints(Array.isArray(parsedSprints) && parsedSprints.length > 0 ? parsedSprints : initialMockSprintsForProject(projectId));
    } catch (e) {
        console.error(`Error parsing sprints for project ${projectId} from localStorage. Initializing with mocks.`, e);
        setProjectSprints(initialMockSprintsForProject(projectId));
    }

  }, [projectId, isClient, router]);


  // Persistence Effects
  useEffect(() => {
    if (isClient && project && tasks !== undefined) {
      localStorage.setItem(getTasksStorageKey(projectId), JSON.stringify(tasks));
    }
  }, [tasks, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectAgents !== undefined) {
      localStorage.setItem(getAgentsStorageKey(projectId), JSON.stringify(projectAgents));
    }
  }, [projectAgents, projectId, isClient, project]);

  const updateWorkflowStatusBasedOnTasks = useCallback((
    currentTasks: Task[],
    currentWorkflows: ProjectWorkflow[]
  ): ProjectWorkflow[] => {
    if (!project || !currentWorkflows || currentWorkflows.length === 0) {
        return currentWorkflows ?? [];
    }

    let wasChanged = false;
    const updatedWorkflows = currentWorkflows.map(workflow => {
      let newStatus = workflow.status;
      const tasksForThisWorkflow = currentTasks.filter(
        task => task.assignedTo === workflow.name && !task.isMilestone
      );

      if (tasksForThisWorkflow.length > 0) {
        const allDone = tasksForThisWorkflow.every(t => t.status === 'Done');
        const anyInProgressOrToDo = tasksForThisWorkflow.some(t => t.status === 'In Progress' || t.status === 'To Do');

        if (anyInProgressOrToDo && (workflow.status === 'Draft' || workflow.status === 'Inactive')) {
          newStatus = 'Active';
          wasChanged = true;
        } else if (allDone && workflow.status === 'Active') {
          newStatus = 'Inactive'; 
          wasChanged = true;
        }
      } else if (workflow.status === 'Active') { 
        newStatus = 'Inactive';
        wasChanged = true;
      }


      if (newStatus !== workflow.status && isClient) {
        // Defer toast to avoid issues during render
        setTimeout(() => {
          toast({
            title: `Workflow Status Change`,
            description: `Workflow "${workflow.name}" is now ${newStatus}. ${newStatus === 'Active' ? ' (Activated by task assignment/progress)' : (newStatus === 'Inactive' ? ' (All assigned tasks completed or no tasks assigned)' : '')}`
          });
        }, 0);
        return { ...workflow, status: newStatus, lastRun: (newStatus === 'Active' && workflow.status !== 'Active') ? new Date().toISOString() : workflow.lastRun };
      }
      return workflow;
    });
    return wasChanged ? updatedWorkflows : currentWorkflows;
  }, [project, isClient, toast]);

  useEffect(() => {
    if (isClient && project && projectWorkflows !== undefined) {
      // console.log(`PROJECT_DETAIL_PAGE: Saving projectWorkflows to localStorage for project ${projectId}. Count: ${projectWorkflows.length}.`);
      // console.log(JSON.stringify(projectWorkflows.map(wf => ({ id: wf.id, name: wf.name, nodesCount: wf.nodes?.length, edgesCount: wf.edges?.length, status: wf.status }))));
      const workflowsToSave = projectWorkflows.map(wf => ({
          ...wf,
          nodes: wf.nodes || [],
          edges: wf.edges || []
      }));
      localStorage.setItem(getWorkflowsStorageKey(projectId), JSON.stringify(workflowsToSave));
    }
  }, [projectWorkflows, projectId, isClient, project]);

  useEffect(() => {
    if (!isClient || !project || tasks.length === 0) return; // Only run if there are tasks to process
    const updatedWfs = updateWorkflowStatusBasedOnTasks(tasks, projectWorkflows);
    // Only update state if there's an actual change in workflow objects to prevent infinite loops
    if (JSON.stringify(updatedWfs) !== JSON.stringify(projectWorkflows)) { 
        setProjectWorkflows(updatedWfs);
    }
  }, [tasks, projectWorkflows, isClient, project, updateWorkflowStatusBasedOnTasks]);


  useEffect(() => {
    if (isClient && project && projectFiles !== undefined) {
      localStorage.setItem(getFilesStorageKey(projectId), JSON.stringify(projectFiles));
    }
  }, [projectFiles, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectRequirementDocs !== undefined) {
      localStorage.setItem(getRequirementsStorageKey(projectId), JSON.stringify(projectRequirementDocs));
    }
  }, [projectRequirementDocs, projectId, isClient, project]);

   useEffect(() => {
    if (isClient && project && projectTickets !== undefined) {
        localStorage.setItem(getTicketsStorageKey(projectId), JSON.stringify(projectTickets));
    }
  }, [projectTickets, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectSprints !== undefined) {
        localStorage.setItem(getSprintsStorageKey(projectId), JSON.stringify(projectSprints));
    }
  }, [projectSprints, projectId, isClient, project]);

  const handleUpdateProject = useCallback((updatedProjectData: Pick<Project, 'name' | 'description' | 'status' | 'thumbnailUrl'>) => {
    if (!project) return;
    const updatedProjectObject: Project = {
        ...project,
        ...updatedProjectData,
        thumbnailUrl: updatedProjectData.thumbnailUrl || project.thumbnailUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(updatedProjectData.name.substring(0,20))}`,
        lastUpdated: new Date().toISOString(),
    };
    setProject(updatedProjectObject);

    let allProjects: Project[] = [];
    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (allProjectsStored) {
        try { allProjects = JSON.parse(allProjectsStored); }
        catch (e) { allProjects = initialMockProjects; }
    } else {
        allProjects = initialMockProjects;
    }

    const projectIndex = allProjects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
        allProjects[projectIndex] = updatedProjectObject;
    } else {
        allProjects.push(updatedProjectObject);
    }
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(allProjects));

    if (isClient) {
        setTimeout(() => toast({
            title: "Project Settings Updated",
            description: `Project "${updatedProjectObject.name}" has been successfully updated.`,
        }), 0);
    }
    setIsEditProjectDialogOpen(false);
  }, [project, projectId, isClient, toast]);


  const handleTaskPlannedAndAccepted = useCallback(
    (aiOutput: PlanProjectTaskOutput) => {
      console.log("PROJECT_DETAIL_PAGE: handleTaskPlannedAndAccepted received aiOutput:", JSON.stringify(aiOutput, null, 2));
      if (!project) {
        if (isClient) {
          setTimeout(() => toast({ title: "Error", description: "Project data not available to add task.", variant: "destructive" }), 0);
        }
        return;
      }
      
      const { plannedTask: plannedTaskDataFromAI = {}, reasoning: aiReasoningFromAI } = aiOutput || {};
      
      if (!plannedTaskDataFromAI || Object.keys(plannedTaskDataFromAI).length === 0 || !plannedTaskDataFromAI.title) {
        console.error("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): plannedTaskDataFromAI from AI output is empty, undefined, or missing title.");
         if (isClient) {
            setTimeout(() => toast({ title: "AI Planning Error", description: "AI did not return a valid task plan. Please try again.", variant: "destructive" }), 0);
        }
        setIsAITaskPlannerDialogOpen(false);
        return;
      }
      
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): plannedTaskDataFromAI from aiOutput:", JSON.stringify(plannedTaskDataFromAI, null, 2));

      const taskTitle = plannedTaskDataFromAI.title || "Untitled AI Task";
      const aiReasoning = aiReasoningFromAI || "AI reasoning not provided.";
      const suggestedSubTasksFromAI = plannedTaskDataFromAI.suggestedSubTasks || [];
      
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted taskTitle:", taskTitle);
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted aiReasoning:", aiReasoning);
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted suggestedSubTasksFromAI:", JSON.stringify(suggestedSubTasksFromAI, null, 2));

      const subTasksDetailsText = (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0)
        ? `\n\nAI Suggested Sub-Tasks / Steps:\n${suggestedSubTasksFromAI.map(st => `- ${st.title || 'Untitled Sub-task'} (Agent Type: ${st.assignedAgentType || 'N/A'}) - Desc: ${st.description || 'No description.'}`).join('\n')}`
        : "\n\nAI Suggested Sub-Tasks / Steps: None specified by AI.";

      const combinedDescription = `AI Reasoning: ${aiReasoning}${subTasksDetailsText}`;
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed combinedDescription:", combinedDescription);
      
      let newTasksToAdd: Task[] = [];
      const mainTaskId = uid(`task-main-${projectId.slice(-4)}`);
      const dependencies = Array.isArray(plannedTaskDataFromAI.dependencies) ? plannedTaskDataFromAI.dependencies : [];
      const parentId = (plannedTaskDataFromAI.parentId === "null" || plannedTaskDataFromAI.parentId === "" || plannedTaskDataFromAI.parentId === undefined || plannedTaskDataFromAI.parentId === NO_PARENT_VALUE) ? null : plannedTaskDataFromAI.parentId;
      
      let mainTaskStatus: TaskStatus = (plannedTaskDataFromAI.status as Task['status']) || 'To Do';
      let mainTaskProgress = plannedTaskDataFromAI.isMilestone
                          ? (mainTaskStatus === 'Done' ? 100 : 0)
                          : (plannedTaskDataFromAI.progress === undefined || plannedTaskDataFromAI.progress === null ? 0 : Math.min(100,Math.max(0,Number(plannedTaskDataFromAI.progress) || 0 )));

      let assignedToValue = plannedTaskDataFromAI.assignedTo || "AI Assistant to determine";
      
      let autoStarted = false;
      let workflowAutoActivated = false;
      let toastDescription = "";
      let firstSubTaskInitiated = false;
      let targetWorkflowForMainTask: ProjectWorkflow | undefined = projectWorkflows.find(wf => wf.name === assignedToValue);


      let mainTask: Task = {
        id: mainTaskId,
        projectId: projectId,
        title: taskTitle,
        status: mainTaskStatus,
        assignedTo: assignedToValue,
        startDate: (plannedTaskDataFromAI.startDate && isValid(parseISO(plannedTaskDataFromAI.startDate)))
                      ? plannedTaskDataFromAI.startDate
                      : format(new Date(), 'yyyy-MM-dd'),
        durationDays: plannedTaskDataFromAI.isMilestone
                      ? 0
                      : (plannedTaskDataFromAI.durationDays === undefined || plannedTaskDataFromAI.durationDays < 1 ? 1 : Math.max(1, plannedTaskDataFromAI.durationDays)),
        progress: mainTaskProgress,
        isMilestone: plannedTaskDataFromAI.isMilestone || false,
        parentId: parentId,
        dependencies: dependencies,
        description: combinedDescription,
        isAiPlanned: true,
        sprintId: null, 
      };
      
      if (targetWorkflowForMainTask && !mainTask.isMilestone && mainTask.status !== 'Done') {
          mainTask.status = 'In Progress'; 
          mainTask.progress = Math.max(mainTask.progress || 0, 10);
          autoStarted = true;

          if (targetWorkflowForMainTask.status === 'Draft' || targetWorkflowForMainTask.status === 'Inactive') {
              workflowAutoActivated = true;
          }
      }

      newTasksToAdd.unshift(mainTask);

      if (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0) {
          let lastCreatedSubTaskId: string | null = null;
          let cumulativeSubTaskStartDate = (mainTask.startDate && isValid(parseISO(mainTask.startDate))) ? parseISO(mainTask.startDate) : new Date();

          suggestedSubTasksFromAI.forEach((st, index) => {
              const subTaskId = uid(`subtask-${mainTaskId.slice(-5)}-${index}`);
              const subTaskDuration = st.title?.toLowerCase().includes("review") || st.title?.toLowerCase().includes("validate") || st.title?.toLowerCase().includes("stakeholder alignment") ? 2 : 1; 
              let subTaskStatus: TaskStatus = 'To Do';

              if (index === 0 && mainTask.status === 'In Progress') {
                  subTaskStatus = 'In Progress';
                  firstSubTaskInitiated = true;
              }

              const newSubTask: Task = {
                  id: subTaskId,
                  projectId: projectId,
                  title: st.title || "Untitled Sub-task",
                  status: subTaskStatus,
                  assignedTo: st.assignedAgentType || 'Unassigned Agent Type', 
                  startDate: format(cumulativeSubTaskStartDate, 'yyyy-MM-dd'),
                  durationDays: subTaskDuration,
                  progress: subTaskStatus === 'In Progress' ? 10 : 0,
                  isMilestone: false,
                  parentId: mainTaskId, 
                  dependencies: lastCreatedSubTaskId ? [lastCreatedSubTaskId] : [],
                  description: st.description || "No description provided by AI.",
                  isAiPlanned: true,
                  sprintId: mainTask.sprintId,
              };
              newTasksToAdd.push(newSubTask);
              lastCreatedSubTaskId = newSubTask.id;
              cumulativeSubTaskStartDate = addDays(cumulativeSubTaskStartDate, subTaskDuration);
          });
      }
      
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Final newTasksToAdd (main + subs):", JSON.stringify(newTasksToAdd.map(t=>({id:t.id, title:t.title, parentId: t.parentId, status: t.status, assignedTo: t.assignedTo, description: t.description?.substring(0,50)})), null, 2));
      
      setTasks(prevTasks => {
        const updatedTasks = [...newTasksToAdd, ...prevTasks].sort((a, b) => {
            if (a.isMilestone && !b.isMilestone) return -1;
            if (!a.isMilestone && b.isMilestone) return 1;
            const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
            const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
            return (a.title || "Untitled").localeCompare(b.title || "Untitled");
        });
        return updatedTasks;
      });

      if (workflowAutoActivated && targetWorkflowForMainTask) {
        setProjectWorkflows(prevWfs => prevWfs.map(wf => 
            wf.id === targetWorkflowForMainTask!.id 
            ? { ...wf, status: 'Active', lastRun: new Date().toISOString() } 
            : wf
        ));
        toastDescription = `Task "${mainTask.title}" assigned to workflow "${targetWorkflowForMainTask.name}". Workflow activated.`;
        if (firstSubTaskInitiated && newTasksToAdd.length > 1) {
            const firstSub = newTasksToAdd.find(t => t.parentId === mainTask.id && t.status === 'In Progress');
            toastDescription += ` The first sub-task "${firstSub?.title}" has also been initiated.`;
        }
      } else if (mainTask.status === 'In Progress' && !targetWorkflowForMainTask) { // Auto-started but not by a workflow
         toastDescription = `Task "${mainTask.title}" planned by AI and set to 'In Progress'.`;
      } else if (mainTask.isMilestone) {
         toastDescription = `Milestone "${mainTask.title}" added to project "${project?.name || 'this project'}".`;
      } else {
         toastDescription = `Task "${mainTask.title}" added to project "${project?.name || 'this project'}".`;
         if (mainTask.assignedTo && mainTask.assignedTo !== "AI Assistant to determine") {
             toastDescription += ` Assigned to "${mainTask.assignedTo}".`;
         }
      }

      const numSubTasksCreated = newTasksToAdd.filter(t => t.parentId === mainTask.id).length;
      if (numSubTasksCreated > 0) {
          toastDescription += ` ${numSubTasksCreated} sub-task${numSubTasksCreated > 1 ? 's were' : ' was'} also created.`;
      }

      setIsAITaskPlannerDialogOpen(false);
      setAiPlannerPrefillGoal(undefined);
      setAiPlannerSourceTicketAssignee(undefined);
      
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed mainTask for chat:", JSON.stringify(mainTask, null, 2));
      // Find the task object from the *updated state* to pass to chat, as mainTask variable might be stale
      // This relies on tasks state having been updated synchronously or this callback being wrapped
      const taskForChat = tasks.find(t => t.id === mainTaskId) || newTasksToAdd.find(t => t.id === mainTaskId) || mainTask; 

      if (isClient) {
          setTimeout(() => {
              toast({ title: mainTask.isMilestone ? "Milestone Planned by AI" : (mainTask.status === 'In Progress' ? "Task In Progress (AI Planned)" : "Task Planned by AI"), description: toastDescription });
              
              console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Setting task for chat dialog (after timeout):", JSON.stringify(taskForChat, null, 2));
              setChattingTask(taskForChat);
              setIsChatDialogOpen(true);
          }, 150); 
      }
    },
    [project, projectId, toast, projectWorkflows, projectAgents, isClient, tasks, setProjectWorkflows, setTasks] 
);

  const handleAddTask = useCallback((taskData: Omit<Task, 'id' | 'projectId' | 'isAiPlanned'>) => {
    if (!project) return;
    console.log("PROJECT_DETAIL_PAGE: handleAddTask (manual) called with data:", JSON.stringify(taskData, null, 2));

    let newTaskBase: Omit<Task, 'id' | 'projectId'> = {
      ...taskData,
      isAiPlanned: false,
      sprintId: taskData.sprintId === NO_SPRINT_VALUE ? null : taskData.sprintId,
    };

    let newTask: Task = {
      id: uid(`task-${projectId.slice(-5)}`),
      projectId: projectId,
      ...newTaskBase,
    };

    let workflowActivated = false;
    let agentActivityUpdated = false;
    let autoStarted = false;
    const assignedEntityName = newTask.assignedTo;

    if (assignedEntityName && assignedEntityName !== "Unassigned" && !newTask.isMilestone && newTask.status === 'To Do') {
      const targetWorkflow = projectWorkflows.find(wf => wf.name === assignedEntityName);
      if (targetWorkflow) {
        if (targetWorkflow.status === 'Draft' || targetWorkflow.status === 'Inactive') {
          newTask = { ...newTask, status: 'In Progress', progress: Math.max(newTask.progress || 0, 10) };
          workflowActivated = true;
          autoStarted = true;
        } else if (targetWorkflow.status === 'Active') {
           newTask = { ...newTask, status: 'In Progress', progress: Math.max(newTask.progress || 0, 10) };
           autoStarted = true;
        }
      } else {
        const targetAgent = projectAgents.find(agent => agent.name === assignedEntityName);
        if (targetAgent && targetAgent.status === 'Running') {
          newTask = { ...newTask, status: 'In Progress', progress: Math.max(newTask.progress || 0, 10) };
          setProjectAgents(prevAgents =>
            prevAgents.map(agent =>
              agent.id === targetAgent.id ? { ...agent, lastActivity: new Date().toISOString() } : agent
            )
          );
          agentActivityUpdated = true;
          autoStarted = true;
        }
      }
    }

    setTasks(prevTasks => {
        const updatedTasks = [newTask, ...prevTasks].sort((a, b) => {
            if (a.isMilestone && !b.isMilestone) return -1;
            if (!a.isMilestone && b.isMilestone) return 1;
            const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
            const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
            return (a.title || "Untitled").localeCompare(b.title || "Untitled");
        });
        return updatedTasks;
    });

    if (workflowActivated && assignedEntityName && projectWorkflows.find(wf => wf.name === assignedEntityName)) {
        const wfToActivate = projectWorkflows.find(wf => wf.name === assignedEntityName);
        if(wfToActivate) {
            setProjectWorkflows(prevWfs => {
                const newWfs = prevWfs.map(wf =>
                    wf.id === wfToActivate.id ? { ...wf, status: 'Active' as ProjectWorkflow['status'], lastRun: new Date().toISOString() } : wf
                );
                return newWfs;
            });
        }
    }

    setIsAddTaskDialogOpen(false);

    let toastTitle = newTask.isMilestone ? "Milestone Added" : "Task Added";
    let toastDescription = `${newTask.isMilestone ? 'Milestone' : 'Task'} "${newTask.title}" has been added to project "${project.name}".`;

    if (autoStarted) {
        toastTitle = "Task In Progress";
        if (workflowActivated && assignedEntityName) {
            toastDescription = `Task "${newTask.title}" assigned to workflow "${assignedEntityName}". Workflow activated, task processing.`;
        } else if (agentActivityUpdated && assignedEntityName) {
            toastDescription = `Task "${newTask.title}" assigned to agent "${assignedEntityName}" and is now being processed.`;
        } else if (assignedEntityName && assignedEntityName !== "Unassigned"){ 
            toastDescription = `Task "${newTask.title}" assigned to active workflow "${assignedEntityName}" and is now being processed.`;
        }
    } else if (assignedEntityName && assignedEntityName !== "Unassigned" && !newTask.isMilestone) {
        if (projectWorkflows.find(wf => wf.name === assignedEntityName)) {
          toastDescription += ` Assigned to workflow "${assignedEntityName}".`;
        } else {
          toastDescription += ` Assigned to "${assignedEntityName}". Run the agent to start.`;
        }
    }

    if (isClient) {
        setTimeout(() => toast({ title: toastTitle, description: toastDescription }), 0);
    }
  }, [project, projectId, isClient, projectWorkflows, projectAgents, toast, setProjectWorkflows, setTasks]);


  const handleOpenEditTaskDialog = useCallback((task: Task, viewMode: boolean = false) => {
    setEditingTask(task);
    setIsViewingTask(viewMode);
    setIsEditTaskDialogOpen(true);
  }, []);

  const handleUpdateTask = useCallback((updatedTaskData: Task) => {
    if (!project || !updatedTaskData) return;

    setTasks(prevTasks => {
        let tasksArrayAfterUpdate = prevTasks.map(task =>
            task.id === updatedTaskData.id ? updatedTaskData : task
        );

        const currentTask = tasksArrayAfterUpdate.find(t => t.id === updatedTaskData.id);
        if (!currentTask) return prevTasks; 

        if (currentTask.isMilestone) {
            currentTask.progress = currentTask.status === 'Done' ? 100 : 0;
        } else {
            if (currentTask.status === 'Done') {
                currentTask.progress = 100;
            } else if (currentTask.status === 'In Progress' && (currentTask.progress === undefined || currentTask.progress === 0)) {
                currentTask.progress = 10; 
            } else if (currentTask.status === 'In Progress' && currentTask.progress === 100) {
                currentTask.progress = 90; 
            } else if (currentTask.status === 'To Do' || currentTask.status === 'Blocked') {
                currentTask.progress = 0;
            }
        }
        
        const assignedEntityName = currentTask.assignedTo;
        let workflowToUpdate: ProjectWorkflow | undefined = undefined;
        let newWorkflowStatus: ProjectWorkflow['status'] | undefined = undefined;
        let agentActivityUpdated = false;

        if(assignedEntityName && !currentTask.isMilestone) {
            workflowToUpdate = projectWorkflows.find(wf => wf.name === assignedEntityName);
            if (workflowToUpdate) {
                if (currentTask.status === 'In Progress' && (workflowToUpdate.status === 'Draft' || workflowToUpdate.status === 'Inactive')) {
                    newWorkflowStatus = 'Active';
                }
            } else { 
                const assignedAgent = projectAgents.find(agent => agent.name === assignedEntityName);
                if (assignedAgent && assignedAgent.status === 'Running' && currentTask.status === 'In Progress') {
                     setProjectAgents(prevAgents =>
                        prevAgents.map(ag =>
                            ag.id === assignedAgent.id ? { ...ag, lastActivity: new Date().toISOString() } : ag
                        )
                    );
                    agentActivityUpdated = true;
                }
            }
        }
        
        tasksArrayAfterUpdate.sort((a, b) => {
          if (a.isMilestone && !b.isMilestone) return -1;
          if (!a.isMilestone && b.isMilestone) return 1;
          const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
          const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
          if (dateA !== dateB) return dateA - dateB;
          return (a.title || "Untitled").localeCompare(b.title || "Untitled");
        });

        if (workflowToUpdate && newWorkflowStatus) {
            const wfName = workflowToUpdate.name;
            setProjectWorkflows(prevWfs => prevWfs.map(wf =>
                wf.id === workflowToUpdate!.id ? { ...wf, status: newWorkflowStatus!, lastRun: new Date().toISOString() } : wf
            ));
            if (isClient) {
              setTimeout(() => toast({ title: "Workflow Activated", description: `Workflow "${wfName}" has been activated due to task status change.` }), 0);
            }
        }
        if (isClient) {
            let toastMsg = `"${currentTask.title}" has been updated.`;
            if(agentActivityUpdated && assignedEntityName) toastMsg += ` Agent ${assignedEntityName} activity logged.`;
            setTimeout(() => toast({
              title: `${currentTask.isMilestone ? 'Milestone' : 'Task'} Updated`,
              description: toastMsg,
            }),0);
        }
        return tasksArrayAfterUpdate;
    });


    setIsEditTaskDialogOpen(false);
    setEditingTask(null);

  }, [project, isClient, projectWorkflows, projectAgents, toast, setProjectWorkflows, setTasks]);

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
      if (tasksToDelete.size > 1) {
          deletionMessage = `"${taskToDelete.title}" and its ${tasksToDelete.size -1} sub-task(s) have been deleted.`;
      }
      if (isClient) {
        setTimeout(() => toast({
          title: `${taskToDelete.isMilestone ? 'Milestone' : 'Task'} Deleted`,
          description: deletionMessage,
          variant: 'destructive',
        }), 0);
      }
      setTaskToDelete(null);
      setIsDeleteTaskDialogOpen(false);
    }
  }, [taskToDelete, tasks, isClient, toast, setTasks]);

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

    let tasksArrayAfterUpdate = [...tasks];
    const taskToUpdateIndex = tasksArrayAfterUpdate.findIndex(t => t.id === taskId);

    if (taskToUpdateIndex === -1) return;

    let taskToUpdate = { ...tasksArrayAfterUpdate[taskToUpdateIndex] };
    let reorderedOrStatusChanged = false;
    let toastTitle = "";
    let toastDescription = "";

    if (sourceTaskStatus !== newStatus) {
        taskToUpdate.status = newStatus;
        if (newStatus === 'Done' && !taskToUpdate.isMilestone) taskToUpdate.progress = 100;
        else if ((newStatus === 'To Do' || newStatus === 'Blocked') && !taskToUpdate.isMilestone) taskToUpdate.progress = 0;
        else if (taskToUpdate.isMilestone) taskToUpdate.progress = newStatus === 'Done' ? 100 : 0;
        else if (newStatus === 'In Progress' && (taskToUpdate.progress === undefined || taskToUpdate.progress === 0) && !taskToUpdate.isMilestone) taskToUpdate.progress = 10;
        else if (newStatus === 'In Progress' && taskToUpdate.progress === 100 && !taskToUpdate.isMilestone) taskToUpdate.progress = 90;

        tasksArrayAfterUpdate[taskToUpdateIndex] = taskToUpdate;
        reorderedOrStatusChanged = true;
        toastTitle = "Task Status Updated";
        toastDescription = `Task "${taskToUpdate.title}" moved to ${newStatus}.`;

    } else if (sourceTaskStatus === newStatus && !event.dataTransfer.getData('droppedOnCard')) {
        const [taskToMove] = tasksArrayAfterUpdate.splice(taskToUpdateIndex, 1);
        tasksArrayAfterUpdate.push(taskToMove);
        reorderedOrStatusChanged = true;
        toastTitle = "Task Reordered";
        toastDescription = `Task "${taskToMove.title}" moved to end of list in "${newStatus}".`;
    }

    if(reorderedOrStatusChanged){
      tasksArrayAfterUpdate.sort((a, b) => {
        const statusOrder = taskStatuses.indexOf(a.status) - taskStatuses.indexOf(b.status);
        if (statusOrder !== 0) return statusOrder;
        if (a.isMilestone && !b.isMilestone) return -1;
        if (!a.isMilestone && b.isMilestone) return 1;
        const originalIndexA = originalIndices.get(a.id) ?? Infinity;
        const originalIndexB = originalIndices.get(b.id) ?? Infinity;
        if (originalIndexA !== originalIndexB) return originalIndexA - originalIndexB;
        const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
        const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
        if (dateA !== dateB) return dateA - dateB;
        return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      });
      setTasks(tasksArrayAfterUpdate);
      if (isClient && toastTitle) {
         setTimeout(() => toast({ title: toastTitle, description: toastDescription}), 0);
      }
    }
    event.dataTransfer.clearData('droppedOnCard'); 
  }, [tasks, isClient, toast, originalIndices, setTasks]); 

  const handleTaskCardDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, task: Task) => {
    event.dataTransfer.setData('taskId', task.id);
    event.dataTransfer.setData('taskStatus', task.status);
    event.dataTransfer.effectAllowed = 'move';
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
            let newTargetIndex = reorderedTasks.findIndex(t => t.id === targetTask.id);
            reorderedTasks.splice(newTargetIndex, 0, draggedItem);

            if (isClient) {
                setTimeout(() => {
                  toast({
                    title: "Task Reordered",
                    description: `Task "${draggedItem.title}" moved within "${targetTask.status}".`,
                  });
                },0);
            }
            return reorderedTasks;
          }
          return currentTasks; 
      });
    }
  }, [isClient, toast, setTasks]);


  const handleGanttTaskReorder = useCallback((draggedTaskId: string, targetTaskId: string | null) => {
    setTasks(currentTasks => {
      const reorderedTasks = [...currentTasks];
      const draggedTaskIndex = reorderedTasks.findIndex(t => t.id === draggedTaskId);

      if (draggedTaskIndex === -1) {
        console.warn("GANTT_REORDER: Dragged task not found in state.");
        return currentTasks;
      }
      const [draggedItem] = reorderedTasks.splice(draggedTaskIndex, 1);

      if (targetTaskId === null) { 
        reorderedTasks.push(draggedItem);
      } else {
        let targetTaskIndex = reorderedTasks.findIndex(t => t.id === targetTaskId);
        if (targetTaskIndex === -1) {
          console.warn("GANTT_REORDER: Target task not found in state. Appending to end.");
          reorderedTasks.push(draggedItem);
        } else {
           reorderedTasks.splice(targetTaskIndex, 0, draggedItem);
        }
      }
      
      if (isClient) {
        setTimeout(() => {
          toast({
            title: "Task Order Updated",
            description: "Gantt chart task order has been updated.",
          });
        }, 0); 
      }
      return reorderedTasks;
    });
  }, [isClient, toast, setTasks]);


  const handleAddProjectAgent = useCallback((agentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => {
    if (!project) return;
    const newAgent: Agent = {
      ...agentData,
      id: uid(`proj-${projectId.slice(-4)}-agent`),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => {
      const updatedAgents = [newAgent, ...prevAgents];
      return updatedAgents;
    });
    setTimeout(() => {
        toast({
        title: "Project Agent Added",
        description: `Agent "${newAgent.name}" has been added to project "${project.name}".`,
        });
    }, 0);
  }, [project, projectId, toast, setProjectAgents]);

  const handleOpenEditProjectAgentDialog = useCallback((agent: Agent) => {
    setEditingProjectAgent(agent);
    setIsEditProjectAgentDialogOpen(true);
  }, []);

  const handleUpdateProjectAgent = useCallback((updatedAgent: Agent) => {
    setProjectAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === updatedAgent.id ? { ...updatedAgent, lastActivity: new Date().toISOString() } : agent
      )
    );
    setIsEditProjectAgentDialogOpen(false);
    setEditingProjectAgent(null);
    if (isClient) {
        setTimeout(() => toast({
          title: "Project Agent Updated",
          description: `Agent "${updatedAgent.name}" has been updated for project "${project?.name}".`,
        }), 0);
    }
  }, [project?.name, isClient, toast, setProjectAgents]);

  const handleRunProjectAgent = useCallback((agentIdToRun: string) => {
    let agentThatRan: Agent | undefined;
    let processedTaskTitles: string[] = [];

    setProjectAgents(prevAgents =>
      prevAgents.map(agent => {
        if (agent.id === agentIdToRun) {
          agentThatRan = { ...agent, status: 'Running', lastActivity: new Date().toISOString() };
          return agentThatRan;
        }
        return agent;
      })
    );

    if (agentThatRan) {
      const agentName = agentThatRan.name;
      setTasks(prevTasks => {
        let tasksUpdated = false;
        const updatedTasksResult = prevTasks.map(task => {
          if (task.assignedTo === agentName && task.status === 'To Do' && !task.isMilestone) {
            processedTaskTitles.push(task.title);
            tasksUpdated = true;
            return {...task, status: 'In Progress' as TaskStatus, progress: Math.max(task.progress || 0, 10) };
          }
          return task;
        });

        if(tasksUpdated) {
            updatedTasksResult.sort((a, b) => {
              if (a.isMilestone && !b.isMilestone) return -1;
              if (!a.isMilestone && b.isMilestone) return 1;
              const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
              const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
              if (dateA !== dateB) return dateA - dateB;
              return (a.title || "Untitled").localeCompare(b.title || "Untitled");
            });
            if (isClient) {
                setTimeout(() => {
                  if (project) { 
                    toast({ title: "Project Agent Started", description: `Agent "${agentName}" is now Running for project "${project.name}".` });
                    if (processedTaskTitles.length > 0) {
                      toast({ title: "Tasks Initiated by Agent", description: `Agent "${agentName}" has started processing ${processedTaskTitles.length} task(s): ${processedTaskTitles.join(', ')}.` });
                    } else {
                       toast({ title: "Agent Running", description: `Agent "${agentName}" is running. No 'To Do' tasks were found for it.` });
                    }
                  }
                }, 0);
            }
            return updatedTasksResult;
        }
        if (isClient && project) { 
            setTimeout(() => {
                toast({ title: "Project Agent Started", description: `Agent "${agentName}" is now Running for project "${project.name}".` });
                 if (processedTaskTitles.length === 0) {
                    toast({ title: "Agent Running", description: `Agent "${agentName}" is running. No 'To Do' tasks were found for it.` });
                }
            },0);
        }
        return prevTasks;
      });
    }
  }, [project, isClient, toast, setTasks, setProjectAgents]);

  const handleStopProjectAgent = useCallback((agentId: string) => {
    let agentNameFound = "";
    setProjectAgents(prevAgents =>
      prevAgents.map(agent => {
        if (agent.id === agentId) {
            agentNameFound = agent.name;
            return { ...agent, status: 'Stopped', lastActivity: new Date().toISOString() }
        }
        return agent;
      })
    );
    if (isClient) {
        setTimeout(() => toast({ title: "Project Agent Stopped", description: `Agent "${agentNameFound || agentId}" has been Stopped.` }), 0);
    }
  }, [isClient, setProjectAgents, toast]);

  const handleDuplicateProjectAgent = useCallback((agentToDuplicate: Agent) => {
    const newAgent: Agent = {
      ...agentToDuplicate,
      id: uid(`proj-${projectId.slice(-4)}-agent-copy`),
      name: `${agentToDuplicate.name} - Copy`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setProjectAgents(prevAgents => [newAgent, ...prevAgents]);
    if (isClient) {
        setTimeout(() => toast({ title: "Project Agent Duplicated", description: `Agent "${agentToDuplicate.name}" duplicated as "${newAgent.name}".` }),0);
    }
  }, [projectId, isClient, setProjectAgents, toast]);

  const handleOpenDeleteAgentDialog = useCallback((agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteAgentDialogOpen(true);
  }, []);

  const confirmDeleteProjectAgent = useCallback(() => {
    if (agentToDelete) {
      setProjectAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentToDelete.id));
      if(isClient) {
        setTimeout(() => toast({ title: "Project Agent Deleted", description: `Agent "${agentToDelete.name}" has been deleted from this project.`, variant: 'destructive' }), 0);
      }
      setAgentToDelete(null);
      setIsDeleteAgentDialogOpen(false);
    }
  }, [agentToDelete, isClient, setProjectAgents, toast]);

  const handleAddProjectWorkflow = useCallback((workflowData: { name: string; description: string }) => {
    if (!project) return;
    const newWorkflow: ProjectWorkflow = {
      id: uid(`proj-wf-${projectId.slice(-4)}`),
      name: workflowData.name,
      description: workflowData.description,
      status: 'Draft',
      nodes: [], 
      edges: [],
      lastRun: undefined,
    };
    setProjectWorkflows(prevWorkflows => [newWorkflow, ...prevWorkflows]);
    setIsAddWorkflowDialogOpen(false);
    if(isClient) {
        setTimeout(() => toast({
          title: "Project Workflow Created",
          description: `Workflow "${newWorkflow.name}" has been added to project "${project.name}". You can now design its steps.`,
        }), 0);
    }
  }, [project, projectId, isClient, setProjectWorkflows, toast]);

  const handleDesignWorkflow = useCallback((workflow: ProjectWorkflow) => {
    // console.log("PROJECT_DETAIL_PAGE: Setting designingWorkflow:", JSON.stringify(workflow, (key, value) => key === 'config' ? '[omitted]' : value, 2));
    setDesigningWorkflow(JSON.parse(JSON.stringify(workflow))); 
  }, []);
  

  const handleCloseWorkflowDesigner = useCallback(() => {
    const currentDesigningWorkflowId = designingWorkflowIdRef.current; 
    if(currentDesigningWorkflowId && isClient){
       const designingWorkflowName = (projectWorkflows.find(wf => wf.id === currentDesigningWorkflowId) || designingWorkflow)?.name || 'workflow';
       setTimeout(() => toast({
        title: "Workflow Designer Closed",
        description: `Changes to "${designingWorkflowName}" are saved automatically.`,
      }),0);
    }
    setDesigningWorkflow(null);
  }, [projectWorkflows, isClient, designingWorkflow, toast]); 


  const handleWorkflowNodesChange = useCallback((updatedNodes: WorkflowNode[]) => {
    const currentDesigningWfId = designingWorkflowIdRef.current;
    // console.log(`PROJECT_DETAIL_PAGE: handleWorkflowNodesChange for workflow ID: ${currentDesigningWfId}. Received updatedNodes. Length: ${updatedNodes.length}, IDs: ${updatedNodes.map(n=>n.id).join(', ')}`);

    if (currentDesigningWfId) {
      setProjectWorkflows(prevWorkflows => {
        // console.log(`PROJECT_DETAIL_PAGE: Inside setProjectWorkflows (nodes). prevWorkflows length: ${prevWorkflows.length}`);
        const newWorkflowsArray = prevWorkflows.map(wf => {
          if (wf.id === currentDesigningWfId) {
            // console.log(`PROJECT_DETAIL_PAGE: Updating nodes for workflow ID: ${wf.id}. Old nodes count: ${wf.nodes?.length || 0}, New nodes count: ${updatedNodes.length}`);
            return { ...wf, nodes: updatedNodes };
          }
          return wf;
        });
        // const updatedWfForLog = newWorkflowsArray.find(wf => wf.id === currentDesigningWfId);
        // console.log(`PROJECT_DETAIL_PAGE: Workflow in newWorkflows array (after map for nodes). ID: ${updatedWfForLog?.id} Nodes count: ${updatedWfForLog?.nodes?.length} Nodes IDs: ${updatedWfForLog?.nodes?.map(n => n.id).join(', ')}`);
        return newWorkflowsArray;
      });
    }
  }, [setProjectWorkflows]);

  const handleWorkflowEdgesChange = useCallback((updatedEdges: WorkflowEdge[]) => {
    const currentDesigningWfId = designingWorkflowIdRef.current;
    // console.log(`PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange for workflow ID: ${currentDesigningWfId}. Received updatedEdges length: ${updatedEdges.length}`);
    if (currentDesigningWfId) {
      setProjectWorkflows(prevWorkflows => {
        // console.log(`PROJECT_DETAIL_PAGE: Inside setProjectWorkflows (edges). prevWorkflows length: ${prevWorkflows.length}`);
        const newWorkflowsArray = prevWorkflows.map(wf => {
          if (wf.id === currentDesigningWfId) {
            // console.log(`PROJECT_DETAIL_PAGE: Updating edges for workflow ID: ${wf.id}. Old edges count: ${wf.edges?.length || 0}, New edges count: ${updatedEdges.length}`);
            return { ...wf, edges: updatedEdges };
          }
          return wf;
        });
        //  const updatedWfForLog = newWorkflowsArray.find(wf => wf.id === currentDesigningWfId);
        // console.log(`PROJECT_DETAIL_PAGE: Workflow in newWorkflows array (after map for edges). ID: ${updatedWfForLog?.id} Edges count: ${updatedWfForLog?.edges?.length}`);
        return newWorkflowsArray;
      });
    }
  }, [setProjectWorkflows]);


  const handleOpenDeleteWorkflowDialog = useCallback((workflow: ProjectWorkflow) => {
    setWorkflowToDelete(workflow);
    setIsDeleteWorkflowDialogOpen(true);
  }, []);

  const confirmDeleteWorkflow = useCallback(() => {
    if (workflowToDelete) {
      setProjectWorkflows(prev => {
        const updatedWfs = prev.filter(wf => wf.id !== workflowToDelete.id);
        if (designingWorkflowIdRef.current === workflowToDelete.id) {
          setDesigningWorkflow(null); 
        }
        return updatedWfs;
      });
      if(isClient) {
        setTimeout(() => toast({
          title: "Workflow Deleted",
          description: `Workflow "${workflowToDelete.name}" has been deleted.`,
          variant: "destructive"
        }), 0);
      }
      setWorkflowToDelete(null);
      setIsDeleteWorkflowDialogOpen(false);
    }
  }, [workflowToDelete, isClient, setProjectWorkflows, toast]);

  const handleToggleWorkflowStatus = useCallback((workflowToToggle: ProjectWorkflow) => {
    setProjectWorkflows(prevWorkflows => {
      const newStatus = workflowToToggle.status === 'Active' ? 'Inactive' : 'Active';
      const updatedWorkflows = prevWorkflows.map(wf =>
        wf.id === workflowToToggle.id
          ? { ...wf, status: newStatus, lastRun: newStatus === 'Active' ? new Date().toISOString() : wf.lastRun }
          : wf
      );
      if (isClient) {
        setTimeout(() => toast({
          title: "Workflow Status Updated",
          description: `Workflow "${workflowToToggle.name}" is now ${newStatus}.`,
        }), 0);
      }
      return updatedWorkflows;
    });
  }, [isClient, toast, setProjectWorkflows]);


  const handleOpenChatDialog = useCallback((task: Task) => {
    console.log("PROJECT_DETAIL_PAGE: Opening chat for task:", JSON.stringify(task, null, 2));
    setChattingTask(task);
    setIsChatDialogOpen(true);
  }, []);

  const handleTaskStatusChangeByAI = useCallback((taskId: string, newStatus: TaskStatus) => {
    console.log(`PROJECT_DETAIL_PAGE: AI suggests status change for task ${taskId} to ${newStatus}`);
    setTasks(prevTasks => {
      const tasksArrayAfterUpdate = prevTasks.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              progress: newStatus === 'Done' ? 100 : ( (newStatus === 'To Do' || newStatus === 'Blocked') && !t.isMilestone ? 0 : (t.progress === undefined ? (newStatus === 'In Progress' ? 10 : 0) : t.progress) )
            }
          : t
      );
      tasksArrayAfterUpdate.sort((a, b) => {
          if (a.isMilestone && !b.isMilestone) return -1;
          if (!a.isMilestone && b.isMilestone) return 1;
          const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
          const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
          if (dateA !== dateB) return dateA - dateB;
          return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      });
      return tasksArrayAfterUpdate;
    });

    if (chattingTask && chattingTask.id === taskId) {
      setChattingTask(prev => prev ? {...prev, status: newStatus, progress: newStatus === 'Done' ? 100 : (newStatus === 'In Progress' && (prev.progress === undefined || prev.progress === 0) ? 10 : prev.progress) } : null);
    }
  }, [chattingTask, setTasks]); 


  const addFileOrFolderRecursive = useCallback((
    items: ProjectFile[],
    targetPath: string,
    newItem: ProjectFile,
    allowOverwrite: boolean = false
  ): { updatedItems: ProjectFile[]; itemAddedOrUpdated: boolean } => {
    const normalizedTargetPath = targetPath === '/' ? '/' : (targetPath.endsWith('/') ? targetPath : `${targetPath}/`);
    const newItemPath = newItem.path === '/' ? '/' : (newItem.path.endsWith('/') ? newItem.path : `${newItem.path}/`);
    let itemAddedOrUpdated = false;

    if (newItemPath === normalizedTargetPath) {
      const existingItemIndex = items.findIndex(item => item.name === newItem.name && item.path === newItem.path);
      if (existingItemIndex !== -1) {
        if (items[existingItemIndex].type === 'folder' && newItem.type === 'folder') {
          if(isClient) setTimeout(() => toast({ title: "Error", description: `A folder named "${newItem.name}" already exists in ${normalizedTargetPath}.`, variant: "destructive" }), 0);
          return { updatedItems: items, itemAddedOrUpdated: false };
        }
        if (allowOverwrite && items[existingItemIndex].type === 'file' && newItem.type === 'file') {
          const updatedItems = [...items];
          updatedItems[existingItemIndex] = { ...items[existingItemIndex], content: newItem.content, lastModified: new Date().toISOString(), size: newItem.size };
          itemAddedOrUpdated = true;
          return { updatedItems: updatedItems.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return (a.name || "Untitled").localeCompare(b.name || "Untitled");
          }), itemAddedOrUpdated };
        } else if (!allowOverwrite) {
          if(isClient) setTimeout(() => toast({ title: "Error", description: `An item named "${newItem.name}" already exists in ${normalizedTargetPath}.`, variant: "destructive" }), 0);
          return { updatedItems: items, itemAddedOrUpdated: false };
        }
      }
      itemAddedOrUpdated = true;
      return { updatedItems: [...items, newItem].sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return (a.name || "Untitled").localeCompare(b.name || "Untitled");
      }), itemAddedOrUpdated };
    }

    const mappedItems = items.map(item => {
      if (item.type === 'folder') {
        const itemFullPath = item.path + item.name + '/';
        if (normalizedTargetPath.startsWith(itemFullPath)) {
          const result = addFileOrFolderRecursive(item.children || [], normalizedTargetPath, newItem, allowOverwrite);
          if (result.itemAddedOrUpdated) {
            itemAddedOrUpdated = true; 
            return {
              ...item,
              children: result.updatedItems,
              lastModified: new Date().toISOString(), 
            };
          }
        }
      }
      return item;
    });
    return { updatedItems: mappedItems, itemAddedOrUpdated };
  }, [isClient, toast]);

  const handleSimulateFileCreationInRepo = useCallback(
    (fileDetails: { fileName: string; content: string; path?: string }) => {
      if (!project) return;
      const targetPath = fileDetails.path || currentFilePath || '/'; 
      const newFile: ProjectFile = {
        id: uid(`repo-file-${projectId.slice(-4)}-${fileDetails.fileName.replace(/\s+/g, '-')}`),
        name: fileDetails.fileName,
        type: 'file',
        path: targetPath.endsWith('/') ? targetPath : `${targetPath}/`, 
        content: fileDetails.content,
        size: `${(fileDetails.content.length / 1024).toFixed(1)}KB (AI Gen)`,
        lastModified: new Date().toISOString(),
        children: [] 
      };

      console.log("PROJECT_DETAIL_PAGE: Simulating file creation in repo:", newFile);

      setProjectFiles(prevFiles => {
        const { updatedItems, itemAddedOrUpdated } = addFileOrFolderRecursive(prevFiles, newFile.path, newFile, true); 
        if (itemAddedOrUpdated && isClient) {
          setTimeout(() => toast({
            title: "AI Simulated File Creation",
            description: `File "${newFile.name}" added/updated in repository at ${newFile.path}.`,
          }), 0);
        }
        return updatedItems;
      });
    },
    [project, projectId, currentFilePath, addFileOrFolderRecursive, isClient, setProjectFiles, toast]
  );


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
      if(isClient) setTimeout(() => toast({ title: "Error", description: "Folder name cannot be empty.", variant: "destructive" }), 0);
      return;
    }
     if (newRequirementFolderName.includes('/')) {
      if(isClient) setTimeout(() => toast({ title: "Error", description: "Folder name cannot contain slashes.", variant: "destructive" }), 0);
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

    setProjectRequirementDocs(prevDocs => {
       const { updatedItems, itemAddedOrUpdated } = addFileOrFolderRecursive(prevDocs, currentRequirementDocPath, newFolder, false);
        if (itemAddedOrUpdated && isClient) {
            setTimeout(() => toast({ title: "Requirement Folder Created", description: `Folder "${newFolder.name}" created in ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.` }), 0);
        }
        return updatedItems;
    });

    setIsNewRequirementFolderDialogOpen(false);
    setNewRequirementFolderName("");
  }, [newRequirementFolderName, projectId, currentRequirementDocPath, addFileOrFolderRecursive, isClient, setProjectRequirementDocs, toast]);

  const handleRequirementFileUploadClick = useCallback(() => {
    requirementFileInputRef.current?.click();
  }, []);

  const handleRequirementFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
        content: `// Mock content for requirement document: ${file.name}\nUploaded on ${new Date().toLocaleDateString()}`,
        children: []
      };
      const result = addFileOrFolderRecursive(updatedReqDocsState, currentRequirementDocPath, newFile, false);
      if (result.itemAddedOrUpdated) {
          updatedReqDocsState = result.updatedItems;
          filesAddedCount++;
      }
    });

    if (filesAddedCount > 0) {
        setProjectRequirementDocs(updatedReqDocsState);
        if(isClient) setTimeout(() => toast({ title: "Requirement Documents Uploaded (Mock)", description: `${filesAddedCount} document(s) added to ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.` }), 0);
    }
    if(requirementFileInputRef.current) requirementFileInputRef.current.value = "";
  }, [projectRequirementDocs, projectId, currentRequirementDocPath, addFileOrFolderRecursive, isClient, setProjectRequirementDocs, toast]);

  const updateFileContentRecursive = useCallback((
    items: ProjectFile[],
    targetFileId: string,
    newContent: string
  ): { updatedItems: ProjectFile[]; itemUpdated: boolean } => {
    let itemUpdated = false;
    const updatedItems = items.map(item => {
      if (item.id === targetFileId && item.type === 'file') {
        itemUpdated = true;
        return { ...item, content: newContent, lastModified: new Date().toISOString(), size: `${(newContent.length / 1024).toFixed(1)}KB` };
      }
      if (item.type === 'folder' && item.children && item.children.length > 0) {
        const result = updateFileContentRecursive(item.children, targetFileId, newContent);
        if (result.itemUpdated) {
            itemUpdated = true; 
            return { ...item, children: result.updatedItems, lastModified: new Date().toISOString() };
        }
      }
      return item;
    });
    return { updatedItems, itemUpdated };
  }, []);


  const handleOpenEditRequirementDocDialog = useCallback((doc: ProjectFile) => {
    if (doc.type === 'file') {
      setEditingRequirementDoc(doc);
      setEditingRequirementDocContent(doc.content || `// Content for ${doc.name}`);
      setIsEditRequirementDocDialogOpen(true);
    }
  }, []);

  const handleSaveGeneratedRequirementDoc = useCallback((fileName: string, content: string, path: string) => {
    const newFile: ProjectFile = {
        id: uid(`reqdoc-file-${projectId.slice(-4)}-${fileName.replace(/\\s+/g, '-')}`),
        name: fileName,
        type: 'file',
        path: path.endsWith('/') ? path : `${path}/`,
        content: content,
        size: `${(content.length / 1024).toFixed(1)}KB (AI Gen)`,
        lastModified: new Date().toISOString(),
        children: []
    };
    setProjectRequirementDocs(prevDocs => {
        const {updatedItems, itemAddedOrUpdated} = addFileOrFolderRecursive(prevDocs, newFile.path, newFile, true); 
        if (itemAddedOrUpdated && isClient) {
            setTimeout(() => toast({
                title: "AI Document Saved",
                description: `Document "${fileName}" saved to requirements at ${newFile.path}.`,
            }), 0);
        }
        return updatedItems;
    });
    setIsGenerateReqDocDialogOpen(false);
  }, [projectId, isClient, addFileOrFolderRecursive, setProjectRequirementDocs, toast]);

  const handleSaveRequirementDocContent = useCallback(() => {
    if (editingRequirementDoc) {
      setProjectRequirementDocs(prevDocs => {
        const result = updateFileContentRecursive(prevDocs, editingRequirementDoc.id, editingRequirementDocContent);
        if (result.itemUpdated && isClient) {
          setTimeout(() => toast({ title: "Requirement Document Saved (Mock)", description: `Content of "${editingRequirementDoc.name}" updated.` }), 0);
        }
        return result.updatedItems;
      });
      setIsEditRequirementDocDialogOpen(false);
      setEditingRequirementDoc(null);
      setEditingRequirementDocContent("");
    }
  }, [editingRequirementDoc, editingRequirementDocContent, updateFileContentRecursive, isClient, setProjectRequirementDocs, toast]);

  const deleteFileOrFolderRecursive = useCallback((
    items: ProjectFile[],
    targetId: string
  ): { updatedItems: ProjectFile[]; itemDeleted: boolean } => {
    let itemDeleted = false;
    const updatedItems = items.filter(item => {
        if (item.id === targetId) {
            itemDeleted = true;
            return false; 
        }
        return true;
    }).map(item => {
        if (item.type === 'folder' && item.children && item.children.length > 0) {
            const result = deleteFileOrFolderRecursive(item.children, targetId);
            if (result.itemDeleted && !itemDeleted) itemDeleted = true; 
            return { ...item, children: result.updatedItems, lastModified: new Date().toISOString() };
        }
        return item;
    });

    if (!itemDeleted && items.some(item => item.id === targetId)) {
        itemDeleted = true;
    }
    return { updatedItems, itemDeleted };
  }, []);


  const handleOpenDeleteRequirementDocConfirmation = useCallback((doc: ProjectFile) => {
    setRequirementDocToDelete(doc);
    setIsDeleteRequirementDocConfirmationOpen(true);
  }, []);

  const confirmDeleteRequirementDocOrFolder = useCallback(() => {
    if (requirementDocToDelete) {
        setProjectRequirementDocs(prevDocs => {
            const { updatedItems, itemDeleted } = deleteFileOrFolderRecursive(prevDocs, requirementDocToDelete.id);
            if (itemDeleted && isClient) {
                 setTimeout(() => toast({ title: `${requirementDocToDelete.type === 'folder' ? 'Folder' : 'Document'} Deleted`, description: `"${requirementDocToDelete.name}" has been removed from requirements.`, variant: "destructive" }), 0);
            } else if (!itemDeleted && isClient) {
                setTimeout(() => toast({ title: "Error", description: "Could not find item to delete.", variant: "destructive" }), 0);
            }
            return updatedItems;
        });
        setRequirementDocToDelete(null);
        setIsDeleteRequirementDocConfirmationOpen(false);
    }
  }, [requirementDocToDelete, isClient, deleteFileOrFolderRecursive, setProjectRequirementDocs, toast]);

  const getFilesForPathRecursive = useCallback((files: ProjectFile[], path: string): ProjectFile[] => {
    const normalizedPath = path.endsWith('/') ? path : `${path}/`; 

    if (normalizedPath === '/') {
      return files.filter(f => f.path === '/').sort((a,b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    let currentLevel = files;
    const segments = path.split('/').filter(s => s.length > 0); 

    for (const segment of segments) {
      const parentPathForSegment = '/' + segments.slice(0, segments.indexOf(segment)).join('/') + (segments.indexOf(segment) > 0 ? '/' : '');
      const folder = currentLevel.find(f => f.type === 'folder' && f.name === segment && f.path === parentPathForSegment);
      if (folder && folder.children) {
        currentLevel = folder.children;
      } else {
        return [];
      }
    }
    return currentLevel.filter(f => f.path === normalizedPath).sort((a,b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return (a.name || "").localeCompare(b.name || "");
    });
  }, []);


  const displayedRequirementDocs = useMemo(() => {
    return getFilesForPathRecursive(projectRequirementDocs, currentRequirementDocPath);
  }, [projectRequirementDocs, currentRequirementDocPath, getFilesForPathRecursive]);

  const handleNavigateRepoFolder = useCallback((folderName: string) => {
    setCurrentFilePath(prevPath => {
      const normalizedPrevPath = prevPath === '/' ? prevPath : (prevPath.endsWith('/') ? prevPath : `${prevPath}/`);
      return `${normalizedPrevPath}${folderName}/`;
    });
  }, []);

  const handleNavigateRepoUp = useCallback(() => {
    if (currentFilePath === '/') return;
    const pathSegments = currentFilePath.split('/').filter(p => p);
    pathSegments.pop();
    setCurrentFilePath(`/${pathSegments.join('/')}${pathSegments.length > 0 ? '/' : ''}`);
  }, [currentFilePath]);

  const handleCreateNewRepoFolder = useCallback(() => {
    if (!newRepoFolderName.trim()) {
      if (isClient) setTimeout(() => toast({ title: "Error", description: "Folder name cannot be empty.", variant: "destructive" }), 0);
      return;
    }
    if (newRepoFolderName.includes('/')) {
      if (isClient) setTimeout(() => toast({ title: "Error", description: "Folder name cannot contain slashes.", variant: "destructive" }), 0);
      return;
    }
    const newFolderItem: ProjectFile = {
      id: uid(`folder-${projectId.slice(-4)}-${newRepoFolderName.replace(/\s+/g, '-')}`),
      name: newRepoFolderName.trim(),
      type: 'folder',
      path: currentFilePath,
      children: [],
      lastModified: new Date().toISOString(),
    };

    setProjectFiles(prevFiles => {
      const { updatedItems, itemAddedOrUpdated } = addFileOrFolderRecursive(prevFiles, currentFilePath, newFolderItem, false);
      if (itemAddedOrUpdated && isClient) {
          setTimeout(() => toast({ title: "Folder Created", description: `Folder "${newFolderItem.name}" created in ${currentFilePath === '/' ? 'Repository root' : currentFilePath}.` }), 0);
      }
      return updatedItems;
    });

    setIsNewRepoFolderDialogOpen(false);
    setNewRepoFolderName("");
  }, [newRepoFolderName, projectId, currentFilePath, isClient, addFileOrFolderRecursive, setProjectFiles, toast]);


  const handleRepoFileUploadClick = useCallback(() => {
    repoFileInputRef.current?.click();
  }, []);

  const handleRepoFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    let updatedProjectFilesState = projectFiles;
    let filesAddedCount = 0;

    files.forEach(file => {
      const newFileItem: ProjectFile = {
        id: uid(`file-${projectId.slice(-4)}-${file.name.replace(/\s+/g, '-')}`),
        name: file.name,
        type: 'file',
        path: currentFilePath,
        size: `${(file.size / 1024).toFixed(1)}KB`,
        lastModified: new Date(file.lastModified).toISOString(),
        content: `// Mock content for ${file.name}\n// Actual file content not stored in this prototype for uploaded files.`,
        children: []
      };
      const result = addFileOrFolderRecursive(updatedProjectFilesState, currentFilePath, newFileItem, false);
      if(result.itemAddedOrUpdated) {
        updatedProjectFilesState = result.updatedItems;
        filesAddedCount++;
      }
    });

    if (filesAddedCount > 0) {
      setProjectFiles(updatedProjectFilesState);
      if(isClient) setTimeout(() => toast({ title: "Files Uploaded (Mock)", description: `${filesAddedCount} file(s) added to ${currentFilePath === '/' ? 'Repository root' : currentFilePath}.` }), 0);
    }
    if(repoFileInputRef.current) repoFileInputRef.current.value = "";
  }, [projectFiles, projectId, currentFilePath, isClient, addFileOrFolderRecursive, setProjectFiles, toast]);


  const handleOpenEditRepoFileDialog = useCallback((file: ProjectFile) => {
    if (file.type === 'file') {
      setEditingRepoFile(file);
      setEditingRepoFileContent(file.content || `// Content for ${file.name}`);
      setIsEditRepoFileDialogOpen(true);
    }
  }, []);

  const handleSaveRepoFileContent = useCallback(() => {
    if (editingRepoFile) {
      setProjectFiles(prevFiles => {
        const result = updateFileContentRecursive(prevFiles, editingRepoFile.id, editingRepoFileContent);
        if (result.itemUpdated && isClient) {
          setTimeout(() => toast({ title: "File Saved (Mock)", description: `Content of "${editingRepoFile.name}" updated.` }), 0);
        }
        return result.updatedItems;
      });
      setIsEditRepoFileDialogOpen(false);
      setEditingRepoFile(null);
      setEditingRepoFileContent("");
    }
  }, [editingRepoFile, editingRepoFileContent, isClient, updateFileContentRecursive, setProjectFiles, toast]);

  const handleOpenDeleteRepoFileConfirmation = useCallback((file: ProjectFile) => {
    setRepoFileToDelete(file);
    setIsDeleteRepoFileConfirmationOpen(true);
  }, []);

  const confirmDeleteRepoFileOrFolder = useCallback(() => {
      if (repoFileToDelete) {
          setProjectFiles(prevFiles => {
              const { updatedItems, itemDeleted } = deleteFileOrFolderRecursive(prevFiles, repoFileToDelete.id);
              if (itemDeleted && isClient) {
                  setTimeout(() => toast({ title: `${repoFileToDelete.type === 'folder' ? 'Folder' : 'File'} Deleted`, description: `"${repoFileToDelete.name}" has been removed from the repository.`, variant: "destructive" }), 0);
              } else if (!itemDeleted && isClient) {
                  setTimeout(() => toast({ title: "Error", description: "Could not find item to delete.", variant: "destructive" }), 0);
              }
              return updatedItems;
          });
          setRepoFileToDelete(null);
          setIsDeleteRepoFileConfirmationOpen(false);
      }
  }, [repoFileToDelete, isClient, deleteFileOrFolderRecursive, setProjectFiles, toast]);


  const displayedRepoFiles = useMemo(() => {
    return getFilesForPathRecursive(projectFiles, currentFilePath);
  }, [projectFiles, currentFilePath, getFilesForPathRecursive]);

  const handleAddNewTicket = useCallback((ticketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'>) => {
    if (!project) return;
    const newTicket: Ticket = {
      ...ticketData,
      id: uid(`ticket-${projectId.slice(-3)}`),
      projectId,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      sprintId: ticketData.sprintId === NO_SPRINT_VALUE ? null : ticketData.sprintId,
    };
    setProjectTickets(prevTickets => [newTicket, ...prevTickets].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()));
    setIsAddTicketDialogOpen(false);
    if(isClient) {
        setTimeout(() => toast({
          title: "Ticket Created",
          description: `Ticket "${newTicket.title}" has been successfully created.`,
        }),0);
    }
  }, [project, projectId, isClient, setProjectTickets, toast]);

  const handleOpenEditTicketDialog = useCallback((ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsEditTicketDialogOpen(true);
  }, []);

  const handleUpdateTicket = useCallback((updatedTicketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'>) => {
    if (!editingTicket) return;
    const updatedTicket: Ticket = {
      ...editingTicket,
      ...updatedTicketData,
      sprintId: updatedTicketData.sprintId === NO_SPRINT_VALUE ? null : updatedTicketData.sprintId,
      updatedDate: new Date().toISOString(),
    };
    setProjectTickets(prevTickets =>
      prevTickets.map(t => t.id === editingTicket.id ? updatedTicket : t)
                 .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
    );
    setIsEditTicketDialogOpen(false);
    setEditingTicket(null);
    if (isClient) {
        setTimeout(() => toast({
          title: "Ticket Updated",
          description: `Ticket "${updatedTicket.title}" has been updated.`,
        }), 0);
    }
  }, [editingTicket, isClient, setProjectTickets, toast]);

  const handleOpenDeleteTicketDialog = useCallback((ticket: Ticket) => {
    setTicketToDelete(ticket);
    setIsDeleteTicketDialogOpen(true);
  }, []);

  const confirmDeleteTicket = useCallback(() => {
    if (ticketToDelete) {
      setProjectTickets(prev => prev.filter(t => t.id !== ticketToDelete.id));
      if(isClient) {
        setTimeout(() => toast({
          title: "Ticket Deleted",
          description: `Ticket "${ticketToDelete.title}" has been deleted.`,
          variant: "destructive",
        }),0);
      }
      setTicketToDelete(null);
      setIsDeleteTicketDialogOpen(false);
    }
  }, [ticketToDelete, isClient, setProjectTickets, toast]);

  const handleOpenAITaskPlannerWithTicketContext = useCallback((ticket: Ticket) => {
    let goal = `Address Ticket:\nID: ${ticket.id.slice(-6)}\nTitle: ${ticket.title}\nType: ${ticket.type}\nPriority: ${ticket.priority}\nStatus: ${ticket.status}\nDescription:\n${ticket.description}\n\nPlease plan the necessary tasks to resolve this.`;
    setAiPlannerPrefillGoal(goal);
    setAiPlannerSourceTicketAssignee(ticket.assignee); 
    setIsAITaskPlannerDialogOpen(true);
  }, [setAiPlannerPrefillGoal, setAiPlannerSourceTicketAssignee, setIsAITaskPlannerDialogOpen]);

  const handleOpenAITaskPlannerDialog = useCallback(() => {
    setAiPlannerPrefillGoal(undefined); 
    setAiPlannerSourceTicketAssignee(undefined);
    setIsAITaskPlannerDialogOpen(true);
  }, [setAiPlannerPrefillGoal, setAiPlannerSourceTicketAssignee, setIsAITaskPlannerDialogOpen]);

  const filteredTickets = useMemo(() => {
    const sortedTickets = [...projectTickets].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    if (selectedTicketTypeFilter === 'All') {
      return sortedTickets;
    }
    return sortedTickets.filter(ticket => ticket.type === selectedTicketTypeFilter);
  }, [projectTickets, selectedTicketTypeFilter]);

  const projectProgress = useMemo(() => {
    const nonMilestoneTasks = tasks.filter(t => !t.isMilestone);
    if (nonMilestoneTasks.length === 0) return 0;
    const totalProgress = nonMilestoneTasks.reduce((sum, task) => sum + (task.progress || 0), 0);
    return Math.round(totalProgress / nonMilestoneTasks.length);
  }, [tasks]);

  const activeWorkflowCount = useMemo(() => projectWorkflows.filter(wf => wf.status === 'Active').length, [projectWorkflows]);

  const handleOpenManageSprintsDialog = () => {
    setEditingSprint(null); 
    setIsManageSprintsDialogOpen(true);
  };

  const handleAddOrUpdateSprint = (sprintData: Omit<Sprint, 'id' | 'projectId'> | Sprint) => {
    setProjectSprints(prevSprints => {
      const sprintsCopy = [...prevSprints];
      if ('id' in sprintData && sprintData.id) { 
        const index = sprintsCopy.findIndex(s => s.id === sprintData.id);
        if (index !== -1) {
          sprintsCopy[index] = {...sprintsCopy[index], ...sprintData, projectId };
        }
      } else { 
        const newSprint: Sprint = {
          ...sprintData,
          id: uid(`sprint-${projectId.slice(-4)}`),
          projectId,
        };
        sprintsCopy.push(newSprint);
      }
      return sprintsCopy.sort((a,b) => (a.startDate && b.startDate && isValid(parseISO(a.startDate)) && isValid(parseISO(b.startDate))) ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0);
    });
    if (isClient) {
      setTimeout(() => toast({ title: 'Sprint Saved', description: `Sprint "${sprintData.name}" has been saved.` }), 0);
    }
  };

  const handleDeleteSprint = (sprintId: string) => {
    setTasks(prevTasks => prevTasks.map(t => t.sprintId === sprintId ? { ...t, sprintId: null } : t));
    setProjectTickets(prevTickets => prevTickets.map(t => t.sprintId === sprintId ? { ...t, sprintId: null } : t));
    setProjectSprints(prevSprints => prevSprints.filter(s => s.id !== sprintId));
    if (isClient) {
      setTimeout(() => toast({ title: 'Sprint Deleted', description: 'Sprint has been deleted and tasks/tickets unassigned.', variant: 'destructive' }), 0);
    }
  };

  useEffect(() => {
    designingWorkflowIdRef.current = designingWorkflow ? designingWorkflow.id : null;
  }, [designingWorkflow]);


  useEffect(() => {
    if (!isClient || !designingWorkflowIdRef.current || !projectWorkflows?.length) {
      if (designingWorkflow !== null && projectWorkflows && !projectWorkflows.some(wf => wf.id === designingWorkflowIdRef.current)) {
         console.log(`PROJECT_DETAIL_PAGE: Workflow ${designingWorkflowIdRef.current} no longer exists. Closing designer.`);
         setDesigningWorkflow(null);
      }
      return;
    }
    
    const currentWorkflowInState = projectWorkflows.find(wf => wf.id === designingWorkflowIdRef.current);

    if (currentWorkflowInState && designingWorkflow) { 
        if (JSON.stringify(currentWorkflowInState.nodes) !== JSON.stringify(designingWorkflow.nodes) || 
            JSON.stringify(currentWorkflowInState.edges) !== JSON.stringify(designingWorkflow.edges)) {
            console.log("PROJECT_DETAIL_PAGE: Syncing designingWorkflow (nodes/edges) from projectWorkflows state. ID:", designingWorkflow.id);
            setDesigningWorkflow(JSON.parse(JSON.stringify(currentWorkflowInState))); 
        }
    } else if (designingWorkflow !== null && !currentWorkflowInState) { 
        console.log(`PROJECT_DETAIL_PAGE: Workflow ${designingWorkflowIdRef.current} not found in current projectWorkflows. Closing designer.`);
        setDesigningWorkflow(null);
    }
  }, [projectWorkflows, isClient, designingWorkflow]); 


  const handleAnalyzeTicketWithAI = useCallback(async (ticket: Ticket) => {
    setIsAnalyzingTicketWithAI(true);
    setAnalyzingTicketDetails(ticket);
    setTicketAnalysisResult(null); 

    try {
      const input: AnalyzeTicketInput = {
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        currentType: ticket.type,
        currentPriority: ticket.priority,
      };
      console.log("PROJECT_DETAIL_PAGE: Calling analyzeTicket with input:", JSON.stringify(input, null, 2));
      const result = await analyzeTicket(input);
      console.log("PROJECT_DETAIL_PAGE: Received analysis from AI:", JSON.stringify(result, null, 2));
      setTicketAnalysisResult(result);
      setIsAnalyzeTicketResultDialogOpen(true);
    } catch (error) {
      console.error("Error analyzing ticket with AI:", error);
      if (isClient) {
        setTimeout(() => toast({
          title: "AI Analysis Failed",
          description: `Could not get analysis for ticket "${ticket.title}". ${error instanceof Error ? error.message : ''}`,
          variant: "destructive",
        }), 0);
      }
    } finally {
      setIsAnalyzingTicketWithAI(false);
    }
  }, [isClient, toast]); 

  const handleAddNewRequirementAsDoc = useCallback((data: Omit<Requirement, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'version'>) => {
      if (!project) return;
      const newRequirement: Requirement = {
        ...data,
        id: uid('req-item-'),
        projectId: project.id,
        version: '1.0',
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
      };

      const fileName = `${newRequirement.id}_${newRequirement.title.replace(/\s+/g, '_').substring(0,30)}.md`;
      const fileContent = `
# Requirement: ${newRequirement.title} (${newRequirement.id})

**Project:** ${project.name}
**Priority:** ${newRequirement.priority}
**Status:** ${newRequirement.status}
**Version:** ${newRequirement.version}
**Created:** ${formatDate(newRequirement.createdDate)}
**Last Updated:** ${formatDate(newRequirement.updatedDate)}

## Description
${newRequirement.description}
      `.trim();

      const newFile: ProjectFile = {
        id: uid(`reqdoc-file-${projectId.slice(-4)}-${fileName.replace(/\s+/g, '-')}`),
        name: fileName,
        type: 'file',
        path: currentRequirementDocPath, 
        content: fileContent,
        size: `${(fileContent.length / 1024).toFixed(1)}KB`,
        lastModified: new Date().toISOString(),
        children: []
      };

      setProjectRequirementDocs(prevDocs => {
        const { updatedItems, itemAddedOrUpdated } = addFileOrFolderRecursive(prevDocs, newFile.path, newFile, false); 
        if (itemAddedOrUpdated && isClient) {
            setTimeout(() => toast({ title: "Requirement Document Created", description: `Document "${newFile.name}" created for requirement "${newRequirement.title}" in ${newFile.path}.` }), 0);
        }
        return updatedItems;
      });
      setIsAddRequirementDialogOpen(false);
  }, [project, projectId, isClient, currentRequirementDocPath, addFileOrFolderRecursive, formatDate, toast, setProjectRequirementDocs]);


  // Loading State
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
                sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
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
            <PageHeaderDescription className="text-xs sm:text-sm md:text-base mt-1 max-w-2xl">
              {project.description}
            </PageHeaderDescription>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
              <Badge variant="outline" className={cn(projectStatusColors[project.status])}>
                Status: {project.status}
              </Badge>
              <span className="text-muted-foreground">ID: {project.id.slice(-6)}...</span>
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
                  {activeWorkflowCount} Active Workflow{activeWorkflowCount === 1 ? '' : 's'}
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
                    if (isClient) setTimeout(() => toast({ title: "Error", description: "Project data not loaded yet.", variant: "destructive" }),0);
                }
             }}
             className="w-full sm:w-auto"
           >
            <Settings className="mr-2 h-4 w-4" /> Project Settings
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="taskManagement" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:w-auto xl:inline-grid rounded-md mb-6 sm:mb-4">
          <TabsTrigger value="taskManagement" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><ListChecks className="mr-1.5 h-4 w-4"/>Task Management</TabsTrigger>
          <TabsTrigger value="projectAssets" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><FolderGit2 className="mr-1.5 h-4 w-4"/>Project Assets</TabsTrigger>
          <TabsTrigger value="aiAutomation" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><Brain className="mr-1.5 h-4 w-4"/>AI & Automation</TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><TicketIconLucide className="mr-1.5 h-4 w-4"/>Tickets</TabsTrigger>
          <TabsTrigger value="kpis" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><TrendingUp className="mr-1.5 h-4 w-4"/>KPIs</TabsTrigger>
        </TabsList>

        <TabsContent value="taskManagement" className="mt-8 sm:mt-4 md:mt-4">
            <Card>
                <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:gap-2">
                    <div>
                        <CardTitle className="text-lg">Task Management Central</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Organize, track, and plan project tasks. Manage sprints for better focus.
                        </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                         <Button onClick={handleOpenManageSprintsDialog} variant="outline" size="sm" className="w-full sm:w-auto">
                            <Layers className="mr-2 h-4 w-4" /> Manage Sprints
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="w-full sm:w-auto">
                                    <PlusSquare className="mr-2 h-4 w-4" /> Create Task <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleOpenAITaskPlannerDialog}>
                                    <Brain className="mr-2 h-4 w-4" /> Plan Task with AI
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsAddTaskDialogOpen(true)}>
                                    <FilePlus2 className="mr-2 h-4 w-4" /> Add Manual Task
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {projectSprints.length > 0 && (
                        <div className="p-3 sm:p-4 md:p-6 border-b">
                            <h4 className="text-sm font-medium mb-2">Active & Planned Sprints:</h4>
                            <div className="flex flex-wrap gap-2">
                                {projectSprints.filter(s => s.status === 'Active' || s.status === 'Planned')
                                .sort((a,b) => (a.startDate && b.startDate && isValid(parseISO(a.startDate)) && isValid(parseISO(b.startDate))) ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0)
                                .map(sprint => (
                                    <Badge key={sprint.id} variant="secondary" className={cn("text-xs", sprintStatusColors[sprint.status])}>
                                        {sprint.name} ({sprint.startDate ? formatDate(sprint.startDate, 'MMM d') : 'N/A'} - {sprint.endDate ? formatDate(sprint.endDate, 'MMM d') : 'N/A'})
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                    <Tabs defaultValue="gantt" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid sm:grid-cols-2 rounded-none border-b">
                            <TabsTrigger value="gantt" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <GanttChartSquare className="mr-2 h-4 w-4" />Gantt Chart
                            </TabsTrigger>
                            <TabsTrigger value="taskBoard" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <ListChecks className="mr-2 h-4 w-4" />Task Board
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="gantt" className="mt-0 p-1 sm:p-2 md:p-3">
                             {tasks.length > 0 ? (
                                <ProjectGanttChartView
                                  tasks={tasks}
                                  projectSprints={projectSprints}
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
                                                <PlusSquare className="mr-2 h-4 w-4"/>Plan/Add First Task <ChevronDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center">
                                            <DropdownMenuItem onClick={handleOpenAITaskPlannerDialog}>
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
                        <TabsContent value="taskBoard" className="mt-0 p-1 sm:p-2 md:p-3">
                            {tasks.length === 0 && (
                                <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md bg-muted/20">
                                    <ListChecks className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                    <p className="mb-2 font-medium">No tasks to display on the board.</p>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="default" variant="default" className="w-full max-w-xs sm:w-auto">
                                                <PlusSquare className="mr-2 h-4 w-4"/>Plan/Add First Task <ChevronDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center">
                                            <DropdownMenuItem onClick={handleOpenAITaskPlannerDialog}>
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
                                                .sort((a,b) => { 
                                                    if (a.isMilestone && !b.isMilestone) return -1;
                                                    if (!a.isMilestone && b.isMilestone) return 1;
                                                    const originalIndexA = originalIndices.get(a.id) ?? Infinity;
                                                    const originalIndexB = originalIndices.get(b.id) ?? Infinity;
                                                    if (originalIndexA !== originalIndexB) return originalIndexA - originalIndexB;
                                                    const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
                                                    const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
                                                    if(dateA !== dateB) return dateA - dateB;
                                                    return (a.title || "Untitled").localeCompare(b.title || "Untitled");
                                                })
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
                                                    sprintName={task.sprintId ? projectSprints.find(s => s.id === task.sprintId)?.name : undefined}
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

        <TabsContent value="projectAssets" className="mt-8 sm:mt-4 md:mt-4">
             <Card>
                <CardHeader className="p-0">
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
                                        <PageHeaderHeading as="h3" className="text-xl font-semibold">Requirements Documents (ASPICE Structure)</PageHeaderHeading>
                                        <PageHeaderDescription className="text-xs">Manage requirement documents, organized by ASPICE process areas.</PageHeaderDescription>
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
                                                <TableCell className="text-muted-foreground hidden sm:table-cell">{doc.size || '-'}</TableCell>
                                                <TableCell className="text-muted-foreground hidden md:table-cell">{doc.lastModified ? formatDate(doc.lastModified, 'dd MMM yyyy') : '-'}</TableCell>
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
                                                         <DropdownMenuItem
                                                            disabled={doc.type === 'folder'}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (doc.type === 'file') {
                                                                    toast({ title: "Download (Placeholder)", description: `Downloading ${doc.name}... Not implemented.`});
                                                                }
                                                            }}
                                                            >
                                                            <UploadCloud className="mr-2 h-4 w-4 transform rotate-180"/> Download
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
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
                                        <p className="mb-2 font-medium">This requirements folder is empty.</p>
                                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                                            <Button variant="default" size="sm" onClick={() => setIsGenerateReqDocDialogOpen(true)} className="w-full sm:w-auto">
                                                <Sparkles className="mr-2 h-4 w-4"/>Generate Document with AI
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={handleRequirementFileUploadClick} className="w-full sm:w-auto">
                                                <UploadCloud className="mr-2 h-4 w-4" /> Upload Document (Mock)
                                            </Button>
                                            <input type="file" multiple ref={requirementFileInputRef} style={{ display: 'none' }} onChange={handleRequirementFileSelect} />
                                            <Button variant="default" size="sm" onClick={() => {setNewRequirementFolderName(""); setIsNewRequirementFolderDialogOpen(true);}} className="w-full sm:w-auto">
                                                <FolderPlus className="mr-2 h-4 w-4"/>New Folder
                                            </Button>
                                        </div>
                                    </div>
                                    )}
                                     <div className="mt-6 flex flex-wrap justify-start gap-2">
                                        <Button variant="default" size="sm" onClick={() => setIsGenerateReqDocDialogOpen(true)} className="w-full sm:w-auto">
                                            <Sparkles className="mr-2 h-4 w-4"/>Generate Document with AI
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleRequirementFileUploadClick} className="w-full sm:w-auto">
                                            <UploadCloud className="mr-2 h-4 w-4" /> Upload Document (Mock)
                                        </Button>
                                        <Button variant="default" size="sm" onClick={() => {setNewRequirementFolderName(""); setIsNewRequirementFolderDialogOpen(true);}} className="w-full sm:w-auto">
                                            <FolderPlus className="mr-2 h-4 w-4"/>New Folder
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={() => {
                                            setIsViewTraceabilityMatrixDialogOpen(true);
                                        }}  className="w-full sm:w-auto">
                                          <ExternalLink className="mr-2 h-4 w-4" /> View Traceability Matrix
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="repository" className="mt-0 p-3 sm:p-4 md:p-6">
                           <Card>
                              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div>
                                  <PageHeaderHeading as="h3" className="text-xl font-semibold">Project Repository</PageHeaderHeading>
                                  <PageHeaderDescription className="text-xs">Browse and manage general project files. Edits are saved locally.</PageHeaderDescription>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                                  <Button variant="outline" size="sm" onClick={handleRepoFileUploadClick} className="w-full sm:w-auto">
                                    <UploadCloud className="mr-2 h-4 w-4" /> Upload Files (Mock)
                                  </Button>
                                  <input type="file" multiple ref={repoFileInputRef} style={{ display: 'none' }} onChange={handleRepoFileSelect} />
                                  <Button variant="default" size="sm" onClick={() => {setNewRepoFolderName(""); setIsNewRepoFolderDialogOpen(true);}} className="w-full sm:w-auto">
                                    <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="mb-2 flex items-center gap-2 text-sm flex-wrap">
                                  {currentFilePath !== '/' && (
                                    <Button variant="ghost" size="sm" onClick={handleNavigateRepoUp} className="text-muted-foreground hover:text-foreground whitespace-nowrap">
                                      <ArrowLeftCircle className="mr-2 h-4 w-4" /> Up One Level
                                    </Button>
                                  )}
                                  <span className="text-muted-foreground whitespace-nowrap">Current Path:</span>
                                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded-sm text-xs break-all">{currentFilePath}</span>
                                </div>
                                {displayedRepoFiles.length > 0 ? (
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
                                      {displayedRepoFiles.map((file) => (
                                        <TableRow
                                            key={file.id}
                                            className={cn(
                                            file.type === 'folder' ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/50'
                                            )}
                                            onClick={() => file.type === 'folder' ? handleNavigateRepoFolder(file.name) : handleOpenEditRepoFileDialog(file) }
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
                                            <TableCell className="text-muted-foreground hidden sm:table-cell">{file.size || '-'}</TableCell>
                                            <TableCell className="text-muted-foreground hidden md:table-cell">{file.lastModified ? formatDate(file.lastModified, 'dd MMM yyyy') : '-'}</TableCell>
                                            <TableCell className="text-right">
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                                    <MoreVertical className="h-4 w-4" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onClick={(e) => {e.stopPropagation(); if(file.type === 'file') handleOpenEditRepoFileDialog(file); else handleNavigateRepoFolder(file.name);}}>
                                                    <Edit2 className="mr-2 h-4 w-4"/> {file.type === 'file' ? 'Edit/View Content' : 'Open Folder'}
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    disabled={file.type === 'folder'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (file.type === 'file') {
                                                            toast({ title: "Download (Placeholder)", description: `Downloading ${file.name}... Not implemented.`});
                                                        }
                                                    }}
                                                    >
                                                    <UploadCloud className="mr-2 h-4 w-4 transform rotate-180"/> Download
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem className="text-destructive focus:!bg-destructive/10 hover:!text-destructive" onClick={(e) => {e.stopPropagation(); handleOpenDeleteRepoFileConfirmation(file);}}>
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
                                    <p className="mb-2 font-medium">This repository folder is empty.</p>
                                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                                        <Button variant="outline" size="default" onClick={handleRepoFileUploadClick} className="w-full max-w-xs sm:w-auto">
                                            <UploadCloud className="mr-2 h-4 w-4" /> Upload Files (Mock)
                                        </Button>
                                        <Button variant="default" size="default" onClick={() => {setNewRepoFolderName(""); setIsNewRepoFolderDialogOpen(true);}} className="w-full max-w-xs sm:w-auto">
                                            <FolderPlus className="mr-2 h-4 w-4"/>Create First Folder
                                        </Button>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardHeader>
            </Card>
        </TabsContent>

        <TabsContent value="aiAutomation" className="mt-8 sm:mt-4 md:mt-4">
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
                            <Card>
                                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div>
                                        <PageHeaderHeading as="h3" className="text-xl font-semibold">Project Agents</PageHeaderHeading>
                                        <PageHeaderDescription className="text-xs">Manage agents specific to this project. These agents are available in the workflow designer palette.</PageHeaderDescription>
                                    </div>
                                    <Button onClick={() => setIsAddProjectAgentDialogOpen(true)} size="sm" className="w-full sm:w-auto">
                                        <PlusSquare className="mr-2 h-4 w-4" /> Add New Project Agent
                                    </Button>
                                </CardHeader>
                                <CardContent>
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
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="projectWorkflows" className="mt-0 p-3 sm:p-4 md:p-6">
                            {!designingWorkflow ? (
                                <Card>
                                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div>
                                            <PageHeaderHeading as="h3" className="text-xl font-semibold">Project Workflows</PageHeaderHeading>
                                            <PageHeaderDescription className="text-xs">
                                                Define automated processes for this project. Select a workflow to view/edit its design.
                                            </PageHeaderDescription>
                                        </div>
                                        <Button onClick={() => setIsAddWorkflowDialogOpen(true)} size="sm" className="w-full sm:w-auto">
                                            <PlusSquare className="mr-2 h-4 w-4"/> Add New Project Workflow
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        {projectWorkflows.length > 0 ? (
                                            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="mt-0">
                                    <CardHeader className="border-b p-4">
                                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                                            <div>
                                                <PageHeaderHeading as="h3" className="text-lg font-semibold flex items-center">
                                                    <Settings className="mr-2 h-5 w-5 text-primary"/>
                                                    Designing Workflow: {designingWorkflow.name}
                                                </PageHeaderHeading>
                                                <PageHeaderDescription className="text-xs text-muted-foreground mt-1">
                                                    {designingWorkflow.description || "Drag agents to the canvas and connect them."}
                                                </PageHeaderDescription>
                                            </div>
                                            <Button onClick={handleCloseWorkflowDesigner} variant="outline" size="sm" className="w-full sm:w-auto mt-2 sm:mt-0">
                                                <XSquare className="mr-2 h-4 w-4" /> Close Designer
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-1 md:p-2">
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

        <TabsContent value="tickets" className="mt-8 sm:mt-4 md:mt-4">
          <Card>
            <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <div>
                <PageHeaderHeading as="h3" className="text-xl font-semibold">Ticket Management</PageHeaderHeading>
                <PageHeaderDescription className="text-xs sm:text-sm">Track issues, bugs, and change requests related to this project.</PageHeaderDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                 <Select value={selectedTicketTypeFilter} onValueChange={(value) => setSelectedTicketTypeFilter(value as typeof selectedTicketTypeFilter)}>
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
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Priority</TableHead>
                      <TableHead className="hidden lg:table-cell">Assignee</TableHead>
                      <TableHead className="hidden lg:table-cell">Sprint</TableHead>
                      <TableHead className="text-right w-[150px]">Actions</TableHead>
                    </TableRow>
                  </ShadCnTableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => {
                      const sprintName = ticket.sprintId ? projectSprints.find(s => s.id === ticket.sprintId)?.name : 'N/A';
                      return (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-mono text-xs">{ticket.id.slice(-6)}</TableCell>
                          <TableCell className="font-medium">{ticket.title}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className={cn("capitalize text-xs", ticketTypeColors[ticket.type])}>{ticket.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cn("capitalize text-xs", ticketStatusColors[ticket.status])}>{ticket.status}</Badge>
                          </TableCell>
                          <TableCell className={cn("font-medium hidden md:table-cell",ticketPriorityColors[ticket.priority])}>{ticket.priority}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{ticket.assignee || 'Unassigned'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{sprintName}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenAITaskPlannerWithTicketContext(ticket)}>
                                  <Brain className="mr-2 h-4 w-4" /> Plan Task from Ticket
                                </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleAnalyzeTicketWithAI(ticket)} disabled={isAnalyzingTicketWithAI}>
                                  {isAnalyzingTicketWithAI && analyzingTicketDetails?.id === ticket.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                  Analyze with AI
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
                      );
                    })}
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
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="mt-8 sm:mt-4 md:mt-4">
          <Card>
            <CardHeader>
              <PageHeaderHeading as="h3" className="text-xl font-semibold flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-primary"/> Project KPIs & Performance
              </PageHeaderHeading>
              <PageHeaderDescription className="text-xs sm:text-sm">
                Key Performance Indicators and metrics for this project. (Placeholder)
              </PageHeaderDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                <Card className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Overall Progress</h4>
                  <p className="text-3xl font-bold">{projectProgress}%</p>
                  <Progress value={projectProgress} className="mt-2 h-2.5" />
                </Card>
                <Card className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Tasks Completed</h4>
                  <p className="text-3xl font-bold">{tasks.filter(t => t.status === 'Done').length} <span className="text-lg text-muted-foreground">/ {tasks.length}</span></p>
                </Card>
                <Card className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Active Tickets</h4>
                  <p className="text-3xl font-bold">{projectTickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length}</p>
                </Card>
                <Card className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Budget Utilization (Mock)</h4>
                  <p className="text-3xl font-bold">65%</p>
                  <Progress value={65} className="mt-2 h-2.5" />
                </Card>
              </div>
              <p className="text-center text-muted-foreground mt-6">More detailed charts and KPI tracking will be available here.</p>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Dialogs */}
      {project && (
        <AITaskPlannerDialog
          open={isAITaskPlannerDialogOpen}
          onOpenChange={(open) => {
            setIsAITaskPlannerDialogOpen(open);
            if (!open) {
              setAiPlannerPrefillGoal(undefined);
              setAiPlannerSourceTicketAssignee(undefined);
            }
          }}
          projectId={projectId}
          projectWorkflows={projectWorkflows.map(wf => ({ id: wf.id, name: wf.name, description: wf.description, nodes: (wf.nodes || []).map(n => ({ id: n.id, name: n.name, type: n.type })) }))}
          onTaskPlannedAndAccepted={handleTaskPlannedAndAccepted}
          initialGoal={aiPlannerPrefillGoal}
          sourceTicketAssignee={aiPlannerSourceTicketAssignee}
        />
      )}
       {isAddTaskDialogOpen && project && (
        <AddTaskDialog
            open={isAddTaskDialogOpen}
            onOpenChange={setIsAddTaskDialogOpen}
            onAddTask={handleAddTask}
            defaultStartDate={format(new Date(), 'yyyy-MM-dd')}
            projectTasks={tasks}
            projectSprints={projectSprints}
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
          projectSprints={projectSprints}
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
            projectId={projectId}
        />
      )}
      {editingProjectAgent && project && (
        <EditAgentDialogAgent
          agent={editingProjectAgent}
          open={isEditProjectAgentDialogOpen}
          onOpenChange={(open) => {
            setIsEditProjectAgentDialogOpen(open);
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
                This action cannot be undone. This will permanently delete the workflow definition and its design. Tasks currently assigned to this workflow will need to be reassigned.
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
          onSimulateFileCreation={handleSimulateFileCreationInRepo}
        />
      )}

      {/* Repository File/Folder Dialogs */}
      {isNewRepoFolderDialogOpen && (
        <AlertDialog open={isNewRepoFolderDialogOpen} onOpenChange={setIsNewRepoFolderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create New Folder (Repository)</AlertDialogTitle>
              <ShadCnDialogDescription>
                Enter a name for the new folder to be created in: <span className="font-mono bg-muted px-1 py-0.5 rounded-sm text-xs">{currentFilePath}</span>
              </ShadCnDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Input
                value={newRepoFolderName}
                onChange={(e) => setNewRepoFolderName(e.target.value)}
                placeholder="Folder name"
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsNewRepoFolderDialogOpen(false); setNewRepoFolderName(""); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCreateNewRepoFolder}>Create Folder</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
       {editingRepoFile && isEditRepoFileDialogOpen && (
        <Dialog open={isEditRepoFileDialogOpen} onOpenChange={(open) => {
            setIsEditRepoFileDialogOpen(open);
            if (!open) {
                setEditingRepoFile(null);
                setEditingRepoFileContent("");
            }
        }}>
            <ShadCnDialogContent className="sm:max-w-2xl flex flex-col h-[70vh]">
                <ShadCnDialogHeader>
                    <ShadCnDialogTitle>Edit File: {editingRepoFile.name}</ShadCnDialogTitle>
                    <ShadCnDialogDescription>Path: {editingRepoFile.path}{editingRepoFile.name}</ShadCnDialogDescription>
                </ShadCnDialogHeader>
                <Textarea
                    value={editingRepoFileContent}
                    onChange={(e) => setEditingRepoFileContent(e.target.value)}
                    className="flex-grow resize-none font-mono text-xs"
                    placeholder="// Start typing file content..."
                />
                <ShadCnDialogFooter>
                    <Button variant="outline" onClick={() => {
                        setIsEditRepoFileDialogOpen(false);
                        setEditingRepoFile(null);
                        setEditingRepoFileContent("");
                    }}>Cancel</Button>
                    <Button onClick={handleSaveRepoFileContent}>Save Changes</Button>
                </ShadCnDialogFooter>
            </ShadCnDialogContent>
        </Dialog>
      )}
      {repoFileToDelete && (
        <AlertDialog open={isDeleteRepoFileConfirmationOpen} onOpenChange={setIsDeleteRepoFileConfirmationOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete {repoFileToDelete.type === 'folder' ? 'Folder' : 'File'}: "{repoFileToDelete.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone.
                        {repoFileToDelete.type === 'folder' && (repoFileToDelete.children && repoFileToDelete.children.length > 0) && " This will permanently delete the folder and all its contents."}
                        {repoFileToDelete.type === 'folder' && (!repoFileToDelete.children || repoFileToDelete.children.length === 0) && " This will permanently delete the empty folder."}
                        {repoFileToDelete.type === 'file' && " This will permanently delete the file."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setRepoFileToDelete(null); setIsDeleteRepoFileConfirmationOpen(false); }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteRepoFileOrFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete {repoFileToDelete.type === 'folder' ? 'Folder' : 'File'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Requirement Documents Dialogs */}
      {isNewRequirementFolderDialogOpen && (
        <AlertDialog open={isNewRequirementFolderDialogOpen} onOpenChange={setIsNewRequirementFolderDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create New Requirement Folder</AlertDialogTitle>
              <ShadCnDialogDescription>
                Enter a name for the new folder in: <span className="font-mono bg-muted px-1 py-0.5 rounded-sm text-xs">{currentRequirementDocPath}</span>
              </ShadCnDialogDescription>
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
       {isGenerateReqDocDialogOpen && project && (
        <GenerateRequirementDocDialog
          open={isGenerateReqDocDialogOpen}
          onOpenChange={setIsGenerateReqDocDialogOpen}
          onSaveDocument={handleSaveGeneratedRequirementDoc}
          currentProjectPath={currentRequirementDocPath}
          initialProjectContext={`Project Name: ${project.name}\nProject Description: ${project.description}`}
        />
      )}
      {isAddRequirementDialogOpen && (
        <AddRequirementDialog
            open={isAddRequirementDialogOpen}
            onOpenChange={setIsAddRequirementDialogOpen}
            onAddRequirement={handleAddNewRequirementAsDoc} 
        />
      )}
      {isViewTraceabilityMatrixDialogOpen && (
        <AlertDialog open={isViewTraceabilityMatrixDialogOpen} onOpenChange={setIsViewTraceabilityMatrixDialogOpen}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center"><InfoIcon className="mr-2 h-5 w-5 text-blue-500" />Traceability Matrix (Placeholder)</AlertDialogTitle>
              <ShadCnDialogDescription>
                This feature will provide a matrix to visualize relationships between requirement documents/items, tasks, test cases, and other project artifacts.
                It's crucial for impact analysis and ensuring complete coverage (e.g., for ASPICE compliance).
                <br /><br />
                <strong>Example of what might be shown:</strong>
                A table where rows are requirement documents and columns are tasks, with cells indicating links or coverage status.
              </ShadCnDialogDescription>
            </AlertDialogHeader>
            <div className="text-sm text-muted-foreground mt-2">
                <h4 className="font-semibold mb-1">Current Requirement Documents for {project?.name || 'this project'} (Illustrative):</h4>
                {projectRequirementDocs.length > 0 ? (
                  <ScrollArea className="h-40 border rounded-md p-2">
                  <ul className="list-disc pl-5 text-xs">
                    {projectRequirementDocs.filter(doc => doc.type === 'file' && (doc.path.includes("SYS") || doc.path.includes("SWE") || doc.path.includes("Requirements"))).slice(0,10).map(doc => <li key={doc.id}>{doc.name} (in {doc.path})</li>)}
                    {projectRequirementDocs.filter(doc => doc.type === 'file' && (doc.path.includes("SYS") || doc.path.includes("SWE") || doc.path.includes("Requirements"))).length > 10 && <li>... and more</li>}
                     {projectRequirementDocs.filter(doc => doc.type === 'file' && (doc.path.includes("SYS") || doc.path.includes("SWE") || doc.path.includes("Requirements"))).length === 0 && <li>No specific requirement documents found yet.</li>}
                  </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">No requirement documents or folders found for this project yet.</p>
                )}
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsViewTraceabilityMatrixDialogOpen(false)}>Got it</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Ticket Dialogs */}
      {isAddTicketDialogOpen && project && (
        <AddTicketDialog
            open={isAddTicketDialogOpen}
            onOpenChange={setIsAddTicketDialogOpen}
            onAddTicket={handleAddNewTicket}
            projectSprints={projectSprints}
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
          projectSprints={projectSprints}
        />
      )}
       {ticketToDelete && (
         <AlertDialog open={isDeleteTicketDialogOpen} onOpenChange={setIsDeleteTicketDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this ticket?</AlertDialogTitle>
              <ShadCnDialogDescription>
                This action cannot be undone. This will permanently delete the ticket "{ticketToDelete.title}".
              </ShadCnDialogDescription>
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
      {isAnalyzeTicketResultDialogOpen && analyzingTicketDetails && ticketAnalysisResult && (
        <AlertDialog open={isAnalyzeTicketResultDialogOpen} onOpenChange={setIsAnalyzeTicketResultDialogOpen}>
          <AlertDialogContent className="sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-primary" />
                AI Analysis for Ticket: "{analyzingTicketDetails.title}"
              </AlertDialogTitle>
              <ShadCnDialogDescription>
                AI-powered insights and suggestions for ticket ID: {analyzingTicketDetails.id.slice(-6)}.
              </ShadCnDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4 -mr-4">
                <div className="space-y-3 text-sm py-2">
                <div>
                    <Label className="text-xs text-muted-foreground">Suggested Resolution:</Label>
                    <p className="p-2 bg-muted/50 rounded-md border text-sm">{ticketAnalysisResult.suggestedResolution}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Suggested Next Steps:</Label>
                    <div className="p-2 bg-muted/50 rounded-md border text-sm">
                        <ul className="list-disc list-inside space-y-1">
                        {ticketAnalysisResult.suggestedNextSteps.split('\n').map((step, index) => step.trim() && <li key={index}>{step.replace(/^- /, '')}</li>)}
                        </ul>
                    </div>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Potential Impact:</Label>
                    <p className="p-2 bg-muted/50 rounded-md border text-sm">{ticketAnalysisResult.potentialImpact}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">AI Reasoning:</Label>
                    <p className="p-2 bg-muted/50 rounded-md border text-sm italic">{ticketAnalysisResult.reasoning}</p>
                </div>
                </div>
            </ScrollArea>
            <AlertDialogFooter className="mt-2">
              <AlertDialogAction onClick={() => setIsAnalyzeTicketResultDialogOpen(false)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}


      {/* Sprint Management Dialog */}
      {isManageSprintsDialogOpen && project && (
        <Dialog open={isManageSprintsDialogOpen} onOpenChange={setIsManageSprintsDialogOpen}>
          <ShadCnDialogContent className="sm:max-w-md">
            <ShadCnDialogHeader>
              <ShadCnDialogTitle>{editingSprint ? "Edit Sprint" : "Manage Sprints"}</ShadCnDialogTitle>
              <ShadCnDialogDescription>
                {editingSprint ? "Update sprint details." : "Add new sprints or edit existing ones."}
              </ShadCnDialogDescription>
            </ShadCnDialogHeader>
            <div className="space-y-4 py-4">
              <h3 className="text-sm font-medium">Existing Sprints:</h3>
              {projectSprints.length > 0 ? (
                <ScrollArea className="h-40">
                <ul className="space-y-2 pr-3">
                  {projectSprints.sort((a,b) => (a.startDate && b.startDate && isValid(parseISO(a.startDate)) && isValid(parseISO(b.startDate))) ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0).map(sprint => (
                    <li key={sprint.id} className="flex justify-between items-center text-xs p-2 border rounded-md hover:bg-muted/50">
                      <div>
                        <span className="font-semibold">{sprint.name}</span> <Badge variant="outline" className={cn("ml-1", sprintStatusColors[sprint.status])}>{sprint.status}</Badge>
                        <p className="text-muted-foreground text-[11px]">
                          {sprint.startDate ? formatDate(sprint.startDate, 'MMM d') : 'N/A'} - {sprint.endDate ? formatDate(sprint.endDate, 'MMM d') : 'N/A'}
                        </p>
                        {sprint.goal && <p className="text-muted-foreground text-[11px] italic truncate" title={sprint.goal}>Goal: {sprint.goal}</p>}
                      </div>
                      <div className="flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSprint(sprint)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteSprint(sprint.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                </ScrollArea>
              ) : <p className="text-xs text-muted-foreground text-center py-2">No sprints defined yet.</p>}

              <Separator />
              <h3 className="text-sm font-medium">{editingSprint ? `Editing: ${editingSprint.name}` : "Add New Sprint"}</h3>
              <form
                id="sprintForm"
                onSubmit={(e) => {
                e.preventDefault();
                const target = e.target as typeof e.target & {
                  sprintName: { value: string };
                  sprintGoal: { value: string };
                  sprintStartDate: { value: string };
                  sprintEndDate: { value: string };
                  sprintStatus: { value: SprintStatus };
                };
                const sprintData = {
                  id: editingSprint?.id || undefined,
                  name: target.sprintName.value,
                  goal: target.sprintGoal.value,
                  startDate: target.sprintStartDate.value,
                  endDate: target.sprintEndDate.value,
                  status: target.sprintStatus.value,
                };
                handleAddOrUpdateSprint(sprintData as any); // Type assertion to fit Omit
                if (!editingSprint) { 
                  (e.target as HTMLFormElement).reset();
                  const nameInput = (e.target as HTMLFormElement).elements.namedItem("sprintName") as HTMLInputElement;
                  nameInput?.focus();
                } else {
                  setEditingSprint(null); 
                }
              }}>
                <div className="grid gap-3 text-sm">
                  <Input name="sprintName" placeholder="Sprint Name" defaultValue={editingSprint?.name} required />
                  <Textarea name="sprintGoal" placeholder="Sprint Goal (Optional)" defaultValue={editingSprint?.goal} rows={2} className="text-xs"/>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="sprintStartDate" className="text-xs mb-1 block">Start Date</Label>
                      <Input id="sprintStartDate" name="sprintStartDate" type="date" defaultValue={editingSprint?.startDate ? format(parseISO(editingSprint.startDate), 'yyyy-MM-dd') : ""} required />
                    </div>
                    <div>
                       <Label htmlFor="sprintEndDate" className="text-xs mb-1 block">End Date</Label>
                      <Input id="sprintEndDate" name="sprintEndDate" type="date" defaultValue={editingSprint?.endDate ? format(parseISO(editingSprint.endDate), 'yyyy-MM-dd') : ""} required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="sprintStatus" className="text-xs mb-1 block">Status</Label>
                    <Select name="sprintStatus" defaultValue={editingSprint?.status || 'Planned'}>
                      <SelectTrigger id="sprintStatus"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        {sprintStatuses.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    {editingSprint && <Button type="button" variant="outline" size="sm" onClick={() => setEditingSprint(null)} className="flex-1">Cancel Edit</Button>}
                    <Button type="submit" size="sm" className="flex-1">{editingSprint ? "Update Sprint" : "Add Sprint"}</Button>
                  </div>
                </div>
              </form>
            </div>
            <ShadCnDialogFooter className="mt-2">
              <Button variant="outline" onClick={() => {
                  setIsManageSprintsDialogOpen(false);
                  setEditingSprint(null); 
              }}>Done</Button>
            </ShadCnDialogFooter>
          </ShadCnDialogContent>
        </Dialog>
      )}

    </div>
  );
  // End of file, ensuring no trailing characters or comments after this line
}
export default ProjectDetailPage;
// Ensuring only one export default statement exists
// Ensure all callback functions are properly defined using useCallback where appropriate.
// Ensure all useEffect dependency arrays are correct to prevent infinite loops.
// No extraneous characters after the final closing brace of the component.
