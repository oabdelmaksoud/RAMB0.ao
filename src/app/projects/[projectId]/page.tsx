
// src/app/projects/[projectId]/page.tsx
'use client';

import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, Eye, SlidersHorizontal, Brain, AlertCircle, FilePlus2, Trash2, MousePointerSquareDashed, Hand, XSquare, GripVertical, GanttChartSquare, X as XIcon, Diamond, Users, FolderGit2, MessageSquare, Settings, Files, FolderIcon, FileIcon as LucideFileIcon, UploadCloud, FolderPlus, ArrowLeftCircle, InfoIcon, ClipboardList, PlusSquare, Edit2, Ticket as TicketIconLucide, MoreVertical, ChevronDown, ChevronRight, Paperclip, Package, PieChart, LayoutDashboard, Layers, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import React, { useEffect, useState, useCallback, useRef, useMemo, Fragment } from 'react';
import type { Project, Task, Agent, ProjectWorkflow, WorkflowNode, WorkflowEdge, ProjectFile, Requirement, RequirementStatus, RequirementPriority, Ticket, TicketStatus, TicketPriority, TicketType, Sprint, SprintStatus, ProjectStatus as AppProjectStatus, SuggestedSubTask } from '@/types';
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projectStatuses, ticketTypes, ticketPriorities, ticketStatuses as ticketStatusEnumArray, sprintStatuses, requirementStatuses, requirementPriorities, TaskStatus as TaskStatusType, taskStatuses } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { useRouter, useParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';


const NO_PARENT_VALUE = "__NO_PARENT_SELECTED__";
const NO_SPRINT_VALUE = "__NO_SPRINT_SELECTED__";

const projectStatusColors: { [key in AppProjectStatus]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

const taskStatusCardColors: { [key in Task['status']]: string } = {
  'To Do': 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  'Done': 'bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'Blocked': 'bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300 border-red-300 dark:border-red-700',
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

// Helper functions for file/folder management, moved outside the component
const addFileOrFolderRecursive = (
  items: ProjectFile[],
  targetPath: string,
  newItem: ProjectFile,
  allowOverwrite: boolean = false
): { updatedItems: ProjectFile[]; itemAddedOrUpdated: boolean; existingItem?: ProjectFile } => {
  const normalizedTargetPath = targetPath === '/' ? '/' : (targetPath.endsWith('/') ? targetPath : `${targetPath}/`);
  const newItemName = newItem.name; // Path is already part of newItem

  // Check if adding to the current level
  if (newItem.path === normalizedTargetPath) {
    const existingItemIndex = items.findIndex(item => item.name === newItemName && item.path === newItem.path);
    if (existingItemIndex !== -1) { // Item with same name and path exists
      const existing = items[existingItemIndex];
      if (existing.type === 'folder' && newItem.type === 'folder') {
        return { updatedItems: items, itemAddedOrUpdated: false, existingItem: existing };
      }
      if (existing.type === 'file' && newItem.type === 'file' && allowOverwrite) {
        const updatedItems = [...items];
        updatedItems[existingItemIndex] = { ...existing, content: newItem.content, lastModified: new Date().toISOString(), size: newItem.size };
        return { updatedItems: updatedItems.sort((a, b) => {
          if (a.type === 'folder' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'folder') return 1;
          return (a.name || "").localeCompare(b.name || "");
        }), itemAddedOrUpdated: true, existingItem: updatedItems[existingItemIndex] };
      }
      return { updatedItems: items, itemAddedOrUpdated: false, existingItem: existing };
    }
    // Item does not exist at this path, add it
    return { updatedItems: [...items, newItem].sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return (a.name || "").localeCompare(b.name || "");
    }), itemAddedOrUpdated: true };
  }

  // Recurse into children if targetPath is deeper
  let itemAddedOrUpdatedOverall = false;
  let overallExistingItem: ProjectFile | undefined = undefined;

  const mappedItems = items.map(item => {
    if (item.type === 'folder') {
      const itemFullPath = item.path + item.name + '/';
      if (normalizedTargetPath.startsWith(itemFullPath)) { // newItem's path is within this folder
        const result = addFileOrFolderRecursive(item.children || [], normalizedTargetPath, newItem, allowOverwrite);
        if (result.itemAddedOrUpdated) {
          itemAddedOrUpdatedOverall = true;
          return {
            ...item,
            children: result.updatedItems,
            lastModified: new Date().toISOString(),
          };
        } else if (result.existingItem) {
            overallExistingItem = result.existingItem;
        }
      }
    }
    return item;
  });

  return { updatedItems: mappedItems, itemAddedOrUpdated: itemAddedOrUpdatedOverall, existingItem: overallExistingItem };
};

const updateFileContentRecursive = (
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
};

const deleteFileOrFolderRecursive = (
  items: ProjectFile[],
  targetId: string
): { updatedItems: ProjectFile[]; itemDeleted: boolean } => {
  let itemDeletedInThisLevel = false;
  const filteredItems = items.filter(item => {
      if (item.id === targetId) {
          itemDeletedInThisLevel = true;
          return false; // Exclude the item
      }
      return true;
  });

  if (itemDeletedInThisLevel) {
      return { updatedItems: filteredItems, itemDeleted: true };
  }

  // If not deleted at this level, recurse into children
  let itemDeletedInChildren = false;
  const mappedItems = filteredItems.map(item => {
      if (item.type === 'folder' && item.children && item.children.length > 0) {
          const result = deleteFileOrFolderRecursive(item.children, targetId);
          if (result.itemDeleted) {
              itemDeletedInChildren = true;
              return { ...item, children: result.updatedItems, lastModified: new Date().toISOString() };
          }
      }
      return item;
  });

  return { updatedItems: mappedItems, itemDeleted: itemDeletedInChildren };
};


const getFilesForPathRecursive = (files: ProjectFile[], path: string): ProjectFile[] => {
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

  for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const parentPathForSegment = '/' + segments.slice(0, i).join('/') + (i > 0 ? '/' : '');
      const folder = currentLevel.find(f => f.type === 'folder' && f.name === segment && f.path === parentPathForSegment);
      if (folder && folder.children) {
          currentLevel = folder.children;
      } else {
          return []; // Path not found
      }
  }
  return currentLevel.filter(f => f.path === normalizedPath).sort((a,b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return (a.name || "").localeCompare(b.name || "");
  });
};


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
    { name: 'ASPICE System Qualification Testing Agent', id: uid(`proj-${currentProjectId.slice(-4)}-sys-qual`), type: 'Testing Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SYS.5"], validationMethods: ["UserScenarioTesting (End-to-End)", "PerformanceTesting (Nominal & Stress)", "SecurityScans (Basic)"], testEnvironment: "Production-representative environment or actual target environment", acceptanceCriteriaSource: ["SystemRequirementsSpecification.pdf", "StakeholderRequirements.docx"], inputArtifacts: ["CompletedSystemProduct", "CustomerAcceptanceCriteria.md"], outputArtifacts: ["SystemQualificationTestReport.pdf", "FinalValidationReport.docx"], keywords: ["system qualification testing", "validation", "end-to-end testing", "user scenarios", "aspice", "sys.5"] } },
    { id: uid(`proj-${currentProjectId.slice(-4)}-pm`), name: 'ASPICE Project Management Support Agent', type: 'Reporting Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["MAN.3 (Project Management)", "MAN.5 (Risk Management)"], reportingFrequency: "Weekly, Bi-weekly, Monthly (configurable)", riskAssessmentMethod: "FMEA, Risk Matrix", kpiToTrack: ["ScheduleVariance", "EffortVariance", "DefectDensity", "RequirementsVolatility", "ASPICEComplianceScore"], tools: ["Jira_Interface", "Gantt_Generator_API", "RiskRegister_Interface"], outputArtifacts: ["ProjectStatusReport.pdf", "RiskManagementPlan.docx", "ProjectTimeline.mppx"], keywords: ["project management", "reporting", "risk management", "kpi tracking", "aspice", "man.3", "man.5"] } },
    { id: uid(`proj-${currentProjectId.slice(-4)}-qa`), name: 'ASPICE Quality Assurance Support Agent', type: 'Custom Logic Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SUP.1 (Quality Assurance)", "SUP.4 (Joint Review)"], auditActivities: ["ProcessComplianceChecks (automated & manual checklists)", "WorkProductReviews (document & code scans)"], metricsCollection: ["DefectEscapeRate", "ReviewEffectiveness", "ProcessAdherencePercentage"], problemResolutionTrackingSystem: "Integrated with project's ticket system", reporting: "QA_StatusReport.pptx, AuditFindings.xlsx", keywords: ["quality assurance", "process compliance", "audits", "reviews", "aspice", "sup.1", "sup.4"] } },
    { id: uid(`proj-${currentProjectId.slice(-4)}-cm`), name: 'ASPICE Configuration Management Support Agent', type: 'CI/CD Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SUP.8 (Configuration Management)", "SUP.9 (Problem Resolution Management)", "SUP.10 (Change Request Management)"], versionControlSystem: "Git (with GitFlow branching model)", baseliningStrategy: "ReleaseBased, SprintBased (configurable)", changeRequestSystemIntegration: "Jira, ServiceNow", buildAutomationTool: "Jenkins, GitLab CI", artifactRepository: "Artifactory, Nexus", keywords: ["configuration management", "version control", "baselining", "change management", "ci/cd", "aspice", "sup.8", "sup.9", "sup.10"] } },
    { id: uid(`proj-${currentProjectId.slice(-4)}-doc`), name: 'ASPICE Technical Documentation Agent', type: 'Documentation Agent', status: 'Idle', lastActivity: new Date().toISOString(), config: { focusProcessAreas: ["SUP.7 (Documentation)"], documentTypes: ["SystemRequirementsSpecification", "SoftwareRequirementsSpecification", "ArchitectureDesignDocument", "DetailedDesignDocument", "TestPlan", "TestReport", "UserManual", "MaintenanceManual"], outputFormats: ["PDF/A", "Markdown", "HTML", "ConfluenceExport"], templateRepository: "SharedDocTemplates_GitRepo", reviewCycle: "AutomatedPeerReview (Grammar, Style, Link Checking) then ManualReview", versioning: "SemanticVersioning tied to CM baselines", keywords: ["technical documentation", "manuals", "specifications", "reports"] } },
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
    { id: kickoffMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Project Kick-off`, status: 'Done', assignedTo: 'ASPICE Project Management Support Agent', startDate: format(addDays(today, -15), 'yyyy-MM-dd'), durationDays: 0, progress: 100, isMilestone: true, parentId: null, dependencies: [], description: "Official project kick-off milestone achieved. (Corresponds to MAN.3)", isAiPlanned: false, sprintId: null, suggestedSubTasks: [] },
    { id: reqTaskId, projectId: currentProjectId, title: `Define ${currentProjectName} Scope & Requirements`, status: 'Done', assignedTo: 'Requirements Engineering Process', startDate: format(addDays(today, -14), 'yyyy-MM-dd'), durationDays: 5, progress: 100, isMilestone: false, parentId: null, dependencies: [kickoffMilestoneId], description: "Initial scoping and requirements gathering for the project. (ASPICE SYS.1, SYS.2, SWE.1)", isAiPlanned: false, sprintId: null, suggestedSubTasks: [] },
    { id: designTaskId, projectId: currentProjectId, title: `Design ${currentProjectName} Architecture`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(today, -9), 'yyyy-MM-dd'), durationDays: 7, progress: 60, isMilestone: false, parentId: reqTaskId, dependencies: [reqTaskId], description: "High-level and detailed design of the software architecture. (ASPICE SWE.2, SWE.3)", isAiPlanned: false, sprintId: null, suggestedSubTasks: [] },
    { id: devTaskId, projectId: currentProjectId, title: `Implement Core Logic for ${currentProjectName}`, status: 'In Progress', assignedTo: 'Software Design & Implementation Cycle', startDate: format(addDays(today, -2), 'yyyy-MM-dd'), durationDays: 10, progress: 40, parentId: designTaskId, dependencies: [], isMilestone: false, description: "Core development phase, implementing key functionalities. (ASPICE SWE.4)", isAiPlanned: false, sprintId: null, suggestedSubTasks: [] },
    { id: subTaskApiId, projectId: currentProjectId, parentId: devTaskId, title: `Implement API Endpoints`, status: 'To Do', assignedTo: 'ASPICE Software Detailed Design & Implementation Agent', startDate: todayFormatted, durationDays: 3, progress: 0, isMilestone: false, dependencies: [], description: "Develop and unit test the necessary API endpoints for the core logic.", isAiPlanned: false, sprintId: null, suggestedSubTasks: [] },
    { id: testTaskId, projectId: currentProjectId, title: `Test ${currentProjectName} Integration & Qualification`, status: 'To Do', assignedTo: 'Software Testing & QA Cycle', startDate: format(addDays(today, 8), 'yyyy-MM-dd'), durationDays: 5, progress: 0, parentId: null, dependencies: [devTaskId], isMilestone: false, description: "Perform integration testing of developed components and system-level qualification tests. (ASPICE SWE.5, SWE.6)", isAiPlanned: false, sprintId: null, suggestedSubTasks: [] },
    { id: alphaMilestoneId, projectId: currentProjectId, title: `${currentProjectName} Alpha Release Milestone`, status: 'To Do', assignedTo: 'ASPICE Project Management Support Agent', startDate: format(addDays(today, 13), 'yyyy-MM-dd'), durationDays: 0, progress: 0, isMilestone: true, parentId: null, dependencies: [testTaskId], description: "Target date for the Alpha release of the project.", isAiPlanned: false, sprintId: null, suggestedSubTasks: [] },
  ];
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
        {name: `Stakeholder_Requirements_Specification_v1.0.docx`, type: "file", content: `# Stakeholder Requirements Specification (SYS.1)\n\n## Project: ${projectName || 'N/A'}\n\n### 1. Introduction\nThis document outlines the stakeholder requirements...\n\n### 2. Requirements\n- REQ_STAKE_001: The system shall allow user login.\n- REQ_STAKE_002: The user interface shall be intuitive.`},
      ]},
      { name: "SYS.2 System Requirements Analysis", type: "folder", children: [
        {name: `System_Requirements_Specification_v1.0.docx`, type: "file", content: `# System Requirements Specification (SYS.2)\n\nDerived from Stakeholder Requirements for project ${projectName || 'N/A'}.\n\n- SYS_REQ_001: The system must authenticate users via username/password.\n- SYS_REQ_002: The system shall respond to user actions within 2 seconds.`},
      ]},
      { name: "SYS.3 System Architectural Design", type: "folder", children: [
        {name: `System_Architecture_Design_v1.0.vsdx`, type: "file", content: `(Mock Visio Content) System architecture diagrams for project ${projectName || 'N/A'}, showing major components and interfaces.`},
      ]},
      { name: "SYS.4 System Integration and Integration Test", type: "folder", children: [
        {name: `System_Integration_Test_Plan_v1.0.docx`, type: "file", content: `# System Integration Test Plan (SYS.4)\n\nTest plan for integrating system components of project ${projectName || 'N/A'}.`},
        {name: `System_Integration_Test_Report_v1.0.pdf`, type: "file", content: `(Mock PDF Content) Results of system integration testing.`},
      ]},
      { name: "SYS.5 System Qualification Test", type: "folder", children: [
        {name: `System_Qualification_Test_Plan_v1.0.docx`, type: "file", content: `# System Qualification Test Plan (SYS.5)\n\nPlan for overall system qualification for project ${projectName || 'N/A'}.`},
        {name: `System_Qualification_Test_Report_v1.0.pdf`, type: "file", content: `(Mock PDF Content) Results of system qualification testing.`},
      ]},
    ]},
    { name: "SWE - Software Engineering Process Group", type: "folder", children: [
      { name: "SWE.1 Software Requirements Analysis", type: "folder", children: [
        {name: `Software_Requirements_Specification_v1.0.docx`, type: "file", content: `# Software Requirements Specification (SWE.1)\n\nDetailed software requirements for project ${projectName || 'N/A'}, derived from system requirements.`},
      ]},
      { name: "SWE.2 Software Architectural Design", type: "folder", children: [
        {name: `Software_Architecture_Design_v1.0.drawio`, type: "file", content: `(Mock Draw.io Content) Software architecture diagrams (components, modules, interfaces) for project ${projectName || 'N/A'}.`},
      ]},
      { name: "SWE.3 Software Detailed Design and Unit Construction", type: "folder", children: [
        {name: `Module_X_Detailed_Design_v1.0.md`, type: "file", content: `## Module X Detailed Design (SWE.3)\n\nDetailed design specifications for Module X in project ${projectName || 'N/A'}.`},
      ]},
      { name: "SWE.4 Software Unit Verification", type: "folder", children: [
        {name: `Unit_Test_Report_Module_X_v1.0.xml`, type: "file", content: `<!-- Mock JUnit XML Report -->\n<testsuite name="ModuleXTests" tests="10" failures="0" errors="0" skipped="0" timestamp="..." time="0.5">\n  <testcase name="testFeatureA" classname="ModuleXTest" time="0.05"/>\n</testsuite>`},
      ]},
      { name: "SWE.5 Software Integration and Integration Test", type: "folder", children: [
        {name: `Software_Integration_Test_Report_v1.0.pdf`, type: "file", content: `(Mock PDF Content) Report detailing results of software integration tests for project ${projectName || 'N/A'}.`},
      ]},
      { name: "SWE.6 Software Qualification Test", type: "folder", children: [
        {name: `Software_Qualification_Test_Report_v1.0.pdf`, type: "file", content: `(Mock PDF Content) Report on software qualification tests against SWE.1 requirements for project ${projectName || 'N/A'}.`},
      ]},
    ]},
     { name: "SUP - Supporting Process Group", type: "folder", children: [
      { name: "SUP.1 Quality Assurance", type: "folder", children: [
        {name: `Quality_Assurance_Plan_v1.0.docx`, type: "file", content: `# Quality Assurance Plan (SUP.1)\n\nProject quality assurance strategy and activities for project ${projectName || 'N/A'}.`},
        {name: `Audit_Report_Q1_v1.0.pdf`, type: "file", content: `(Mock PDF Content) Q1 Audit Report.`},
        ]},
      { name: "SUP.8 Configuration Management", type: "folder", children: [
        {name: `Configuration_Management_Plan_v1.0.docx`, type: "file", content: `# Configuration Management Plan (SUP.8)\n\nPlan for configuration identification, control, status accounting, and audit for project ${projectName || 'N/A'}.`},
        {name: `Baseline_Audit_Report_v1.0.pdf`, type: "file", content: `(Mock PDF Content) Report of baseline audit.`},
        ]},
      { name: "SUP.9 Problem Resolution Management", type: "folder", children: [
        {name: `Problem_Resolution_Strategy_v1.0.md`, type: "file", content: `## Problem Resolution Strategy (SUP.9)\n\nProcess for identifying, analyzing, and resolving problems in project ${projectName || 'N/A'}.`},
      ]},
      { name: "SUP.10 Change Request Management", type: "folder", children: [
        {name: `Change_Management_Plan_v1.0.docx`, type: "file", content: `# Change Management Plan (SUP.10)\n\nProcess for managing change requests for project ${projectName || 'N/A'}.`},
      ]},
    ]},
    { name: "MAN - Management Process Group", type: "folder", children: [
      { name: "MAN.3 Project Management", type: "folder", children: [
        {name: `Project_Management_Plan_v1.0.mppx`, type: "file", content: `(Mock MS Project Content) Overall project management plan including schedule, resources, and budget for project ${projectName || 'N/A'}.`},
        {name: `Weekly_Status_Report_v1.0.pdf`, type: "file", content: `(Mock PDF Content) Weekly project status report.`},
      ]},
      { name: "MAN.5 Risk Management", type: "folder", children: [
        {name: `Risk_Management_Plan_v1.0.docx`, type: "file", content: `# Risk Management Plan (MAN.5)\n\nStrategy and process for risk identification, analysis, treatment, and monitoring for project ${projectName || 'N/A'}.`},
        {name: `Risk_Register_v1.0.xlsx`, type: "file", content: `(Mock Excel Content) Risk Register with identified risks, likelihood, impact, and mitigation plans.`},
      ]},
    ]},
  ];
  return createStructureRecursive(aspiceFolders, '/');
};

const initialMockFilesData = (projectId: string, currentProjectName: string | undefined): ProjectFile[] => {
  if (!projectId || !currentProjectName) return [];
  return [
    { id: uid(`file-proj-${projectId.slice(-4)}-doc`), name: 'Project_Charter.docx', type: 'file', path: '/', size: '1.2MB', lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), content: "This is the project charter document for " + (currentProjectName || "this project") + ".", children: [] },
    { id: uid(`file-proj-${projectId.slice(-4)}-plan`), name: 'Project_Plan.mpp', type: 'file', path: '/', size: '850KB', lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), content: "Placeholder for MS Project Plan file for " + (currentProjectName || "this project") + ".", children: [] },
    { id: uid(`folder-proj-${projectId.slice(-4)}-src`), name: 'src', type: 'folder', path: '/', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), children: [
      { id: uid(`file-proj-${projectId.slice(-4)}-main`), name: 'main.ts', type: 'file', path: '/src/', size: '10KB', lastModified: new Date().toISOString(), content: "// Main application entry point for " + (currentProjectName || "this project") + "\nconsole.log('Hello from " + currentProjectName + "');", children: [] },
    ]},
    { id: uid(`folder-proj-${projectId.slice(-4)}-tests`), name: 'tests', type: 'folder', path: '/', lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), children: []},
    { id: uid(`folder-proj-${projectId.slice(-4)}-docs`), name: 'docs', type: 'folder', path: '/', lastModified: new Date().toISOString(), children: [
      { id: uid(`file-proj-${projectId.slice(-4)}-readme`), name: 'README.md', type: 'file', path: '/docs/', size: '2KB', lastModified: new Date().toISOString(), content: `# ${currentProjectName || "Project Readme"}\n\nThis is the main documentation for the project.`, children: [] },
    ]}
  ];
};

const initialMockTickets = (projectId: string): Ticket[] => {
  if (!projectId) return [];
  return [
    { id: uid(`ticket-${projectId.slice(-3)}-001`), projectId, title: 'Login button unresponsive on Safari', description: 'The main login button does not respond to clicks on Safari browsers. Tested on Safari 15.1.', status: 'Open', priority: 'High', type: 'Bug', createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString(), sprintId: null, assignee: "Bug Fixing Team" },
    { id: uid(`ticket-${projectId.slice(-3)}-002`), projectId, title: 'Add export to CSV feature for project reports', description: 'Users need the ability to export project summary reports to CSV format for external analysis.', status: 'Open', priority: 'Medium', type: 'Feature Request', createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), sprintId: null, assignee: "Reporting Feature Crew" },
    { id: uid(`ticket-${projectId.slice(-3)}-003`), projectId, title: 'API rate limit documentation needs update', description: 'The documentation regarding API rate limits is confusing and needs clarification on burst vs sustained rates.', status: 'In Progress', priority: 'Medium', type: 'Change Request', assignee: 'ASPICE Technical Documentation Agent', createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), updatedDate: new Date().toISOString(), sprintId: null },
  ];
};

const predefinedWorkflowsData = (currentProjectId: string): ProjectWorkflow[] => {
  if (!currentProjectId) return [];
  const wfPrefix = `pd-wf-${currentProjectId.slice(-4)}`;
  const workflows: ProjectWorkflow[] = [];

  const createWorkflowNodesAndEdges = (
    wfNamePrefix: string,
    nodeTemplates: Array<{ name: string; type: string; config?: any }>,
    edgeTemplates: Array<{ sourceName: string; targetName: string }>
  ): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } => {
    const nodes: WorkflowNode[] = [];
    const nodeNameMap = new Map<string, string>();

    nodeTemplates.forEach((template, index) => {
      const nodeId = uid(`${wfNamePrefix}-node-${index}-${template.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 5)}`);
      nodes.push({
        id: nodeId,
        name: template.name,
        type: template.type,
        config: template.config || {},
        x: 50 + (index % 3) * 220,
        y: 50 + Math.floor(index / 3) * 120,
      });
      nodeNameMap.set(template.name, nodeId);
    });

    const edges: WorkflowEdge[] = edgeTemplates.map((template, index) => {
      const sourceNodeId = nodeNameMap.get(template.sourceName);
      const targetNodeId = nodeNameMap.get(template.targetName);
      if (!sourceNodeId || !targetNodeId) {
        return null;
      }
      return {
        id: uid(`${wfNamePrefix}-edge-${index}`),
        sourceNodeId: sourceNodeId,
        targetNodeId: targetNodeId,
      };
    }).filter(edge => edge !== null) as WorkflowEdge[];

    return { nodes, edges };
  };

  // 1. Requirements Engineering Process
  const reqEngNodesTemplates: Array<{ name: string; type: string; config?: any }> = [
    { name: 'Elicit Stakeholder Needs', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SYS.1", output: "StakeholderRequirements.docx" } },
    { name: 'Analyze System Requirements', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SYS.2", input: "StakeholderRequirements.docx", output: "SystemRequirements.spec" } },
    { name: 'Specify Software Requirements', type: 'ASPICE Requirements Elicitation & Analysis Agent', config: { activity: "SWE.1", input: "SystemRequirements.spec", output: "SoftwareRequirements.spec" } },
    { name: 'Validate Requirements', type: 'ASPICE Quality Assurance Support Agent', config: { reviewType: 'Formal Review', against: ["StakeholderRequirements.docx", "SystemRequirements.spec"], output: "ValidationReport.pdf" } }
  ];
  const reqEngEdgesTemplates: Array<{ sourceName: string; targetName: string }> = [
    { sourceName: 'Elicit Stakeholder Needs', targetName: 'Analyze System Requirements' },
    { sourceName: 'Analyze System Requirements', targetName: 'Specify Software Requirements' },
    { sourceName: 'Specify Software Requirements', targetName: 'Validate Requirements' }
  ];
  const reqEngWf = createWorkflowNodesAndEdges(`${wfPrefix}-req`, reqEngNodesTemplates, reqEngEdgesTemplates);
  workflows.push({
    id: uid(`${wfPrefix}-req-eng`),
    name: "Requirements Engineering Process",
    description: "Handles elicitation, analysis, specification, and validation of project requirements. Aligns with ASPICE SYS.1, SYS.2, SWE.1.",
    status: 'Draft',
    nodes: reqEngWf.nodes,
    edges: reqEngWf.edges,
  });

  // 2. Software Design & Implementation Cycle
  const swDesignNodesTemplates: Array<{ name: string; type: string; config?: any }> = [
    { name: 'Define Software Architecture', type: 'ASPICE Software Architectural Design Agent', config: { activity: "SWE.2", input: "SoftwareRequirements.spec", output: "SoftwareArchitecture.diagram" } },
    { name: 'Detailed Software Design', type: 'ASPICE Software Detailed Design & Implementation Agent', config: { activity: "SWE.3", input: "SoftwareArchitecture.diagram", output: "DetailedDesignDoc.md" } },
    { name: 'Implement Software Units', type: 'ASPICE Software Detailed Design & Implementation Agent', config: { activity: "SWE.4 Construction", input: "DetailedDesignDoc.md", output: "SourceCode.zip" } },
    { name: 'Verify Software Units', type: 'ASPICE Software Unit Verification Agent', config: { activity: "SWE.4 Verification", input: "SourceCode.zip", criteria: "Unit Test Coverage 90%" } }
  ];
  const swDesignEdgesTemplates: Array<{ sourceName: string; targetName: string }> = [
    { sourceName: 'Define Software Architecture', targetName: 'Detailed Software Design' },
    { sourceName: 'Detailed Software Design', targetName: 'Implement Software Units' },
    { sourceName: 'Implement Software Units', targetName: 'Verify Software Units' }
  ];
  const swDesignWf = createWorkflowNodesAndEdges(`${wfPrefix}-swdes`, swDesignNodesTemplates, swDesignEdgesTemplates);
  workflows.push({
    id: uid(`${wfPrefix}-sw-design`),
    name: "Software Design & Implementation Cycle",
    description: "Covers software architectural design, detailed design, coding, and unit testing. Aligns with ASPICE SWE.2, SWE.3, SWE.4.",
    status: 'Draft',
    nodes: swDesignWf.nodes,
    edges: swDesignWf.edges,
  });

  // 3. Software Testing & QA Cycle
  const swTestNodesTemplates: Array<{ name: string; type: string; config?: any }> = [
    { name: 'Plan Integration & Qualification Tests', type: 'ASPICE Software Qualification Testing Agent', config: { testPhase: "Integration & Qualification", input: ["SoftwareRequirements.spec", "SoftwareArchitecture.diagram"] } },
    { name: 'Execute Software Integration Tests', type: 'ASPICE Software Integration Testing Agent', config: { activity: "SWE.5", input: "IntegratedSoftware.bin", output: "IntegrationTestReport.xml" } },
    { name: 'Execute Software Qualification Tests', type: 'ASPICE Software Qualification Testing Agent', config: { activity: "SWE.6", input: "IntegratedSoftware.bin", output: "QualificationTestReport.xml" } },
    { name: 'Quality Assurance Review', type: 'ASPICE Quality Assurance Support Agent', config: { activity: "SUP.1", artifacts: ["IntegrationTestReport.xml", "QualificationTestReport.xml"] } }
  ];
  const swTestEdgesTemplates: Array<{ sourceName: string; targetName: string }> = [
    { sourceName: 'Plan Integration & Qualification Tests', targetName: 'Execute Software Integration Tests' },
    { sourceName: 'Plan Integration & Qualification Tests', targetName: 'Execute Software Qualification Tests' },
    { sourceName: 'Execute Software Integration Tests', targetName: 'Quality Assurance Review' },
    { sourceName: 'Execute Software Qualification Tests', targetName: 'Quality Assurance Review' }
  ];
  const swTestWf = createWorkflowNodesAndEdges(`${wfPrefix}-swtest`, swTestNodesTemplates, swTestEdgesTemplates);
  workflows.push({
    id: uid(`${wfPrefix}-sw-test`),
    name: "Software Testing & QA Cycle",
    description: "Manages integration testing, system testing, and quality assurance activities. Aligns with ASPICE SWE.5, SWE.6, SUP.1.",
    status: 'Draft',
    nodes: swTestWf.nodes,
    edges: swTestWf.edges,
  });

  // 4. Project Monitoring & Reporting
  const projMonNodesTemplates: Array<{ name: string; type: string; config?: any }> = [
    { name: 'Gather Task Progress Data', type: 'ASPICE Project Management Support Agent', config: { source: "Task List", metrics: ["Status", "Progress"] } },
    { name: 'Analyze Risk & Issues', type: 'ASPICE Project Management Support Agent', config: { source: "Tickets, Risk Register", activity: "MAN.5" } },
    { name: 'Generate Weekly Status Report', type: 'ASPICE Project Management Support Agent', config: { frequency: "Weekly", output: "StatusReport.pdf" } },
    { name: 'Update Project KPIs', type: 'ASPICE Project Management Support Agent', config: { kpis: ["OnTimeDelivery", "BudgetAdherence"] } }
  ];
  const projMonEdgesTemplates: Array<{ sourceName: string; targetName: string }> = [
    { sourceName: 'Gather Task Progress Data', targetName: 'Generate Weekly Status Report' },
    { sourceName: 'Analyze Risk & Issues', targetName: 'Generate Weekly Status Report' },
    { sourceName: 'Generate Weekly Status Report', targetName: 'Update Project KPIs' }
  ];
  const projMonWf = createWorkflowNodesAndEdges(`${wfPrefix}-mon`, projMonNodesTemplates, projMonEdgesTemplates);
  workflows.push({
    id: uid(`${wfPrefix}-proj-mon`),
    name: "Project Monitoring & Reporting",
    description: "Collects project metrics, monitors progress, manages risks, and generates status reports. Aligns with ASPICE MAN.3, MAN.5.",
    status: 'Draft',
    nodes: projMonWf.nodes,
    edges: projMonWf.edges,
  });

  return workflows;
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

// Default function for Project Detail Page
function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Tasks State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAITaskPlannerDialogOpen, setIsAITaskPlannerDialogOpen] = useState(false);
  const [aiPlannerPrefillGoal, setAiPlannerPrefillGoal] = useState<string | undefined>(undefined);
  const [aiPlannerSourceTicketAssignee, setAiPlannerSourceTicketAssignee] = useState<string | undefined>(undefined);

  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isViewingTask, setIsViewingTask] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);
  const [draggingOverStatus, setDraggingOverStatus] = useState<TaskStatusType | null>(null);
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
  const [selectedTicketTypeFilter, setSelectedTicketTypeFilter] = useState<(TicketType | 'All')>('All');
  const [isAnalyzeTicketResultDialogOpen, setIsAnalyzeTicketResultDialogOpen] = useState(false);
  const [analyzingTicketDetails, setAnalyzingTicketDetails] = useState<Ticket | null>(null);
  const [ticketAnalysisResult, setTicketAnalysisResult] = useState<AnalyzeTicketOutput | null>(null);
  const [isAnalyzingTicketWithAI, setIsAnalyzingTicketWithAI] = useState(false);


  // Project Edit State
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);

  // Sprints State
  const [projectSprints, setProjectSprints] = useState<Sprint[]>([]);
  const [isManageSprintsDialogOpen, setIsManageSprintsDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Partial<Sprint> & { name: string; status: SprintStatus } | null>(null);

  // Original indices for Kanban reordering
   const originalIndices = useMemo(() => {
    const map = new Map<string, number>();
    // Ensure tasks is always an array before calling forEach
    (tasks || []).forEach((task, index) => map.set(task.id, index));
    return map;
  }, [tasks]);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatDate = useCallback((dateString: string | undefined, optionsOrFormatString?: { day?: '2-digit', month?: 'short', year?: 'numeric' } | string) => {
    if (!isClient || !dateString) return 'N/A';
    try {
      let date;
      if (typeof dateString === 'string' && (dateString.includes('T') || (dateString.length === 10 && dateString.includes('-')))) {
         date = parseISO(dateString);
      } else if (typeof dateString === 'string' && !isNaN(Number(dateString))) {
         date = new Date(Number(dateString));
      } else {
         date = new Date(dateString);
      }

      if (!isValid(date)) {
        return String(dateString);
      }

      if (typeof optionsOrFormatString === 'string') {
        return format(date, optionsOrFormatString);
      }
      if (optionsOrFormatString && typeof optionsOrFormatString === 'object' && optionsOrFormatString.day && optionsOrFormatString.month && optionsOrFormatString.year) {
        return format(date, 'dd MMM yyyy');
      }
      return format(date, 'PPpp');
    } catch (e) {
      return String(dateString);
    }
  }, [isClient]);

  // Main data loading effect
  useEffect(() => {
    if (!projectId || !isClient) return;

    let allProjects: Project[] = [];
    const allProjectsStored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (allProjectsStored) {
        try { allProjects = JSON.parse(allProjectsStored); }
        catch (e) {
            console.error("PROJECT_DETAIL_PAGE: Error parsing projects from localStorage, using initial mocks.", e);
            allProjects = initialMockProjects;
        }
    } else {
        allProjects = initialMockProjects;
    }
    const currentProjectData = allProjects.find((p: Project) => p.id === projectId) || null;


    if (!currentProjectData) {
        if (isClient) router.push('/');
        return;
    }
    setProject(currentProjectData);

    const tasksStorageKey = getTasksStorageKey(projectId);
    const storedTasks = localStorage.getItem(tasksStorageKey);
    try {
      const loadedTasks = storedTasks ? JSON.parse(storedTasks) : initialMockTasksForProject(projectId, currentProjectData.name);
      setTasks(Array.isArray(loadedTasks) ? loadedTasks : initialMockTasksForProject(projectId, currentProjectData.name));
    } catch (e) {
      console.error(`Error parsing tasks for project ${projectId} from localStorage. Initializing with mocks.`, e);
      setTasks(initialMockTasksForProject(projectId, currentProjectData.name));
    }

    const agentsStorageKey = getAgentsStorageKey(projectId);
    const storedProjectAgents = localStorage.getItem(agentsStorageKey);
    try {
      const loadedProjectAgents = storedProjectAgents ? JSON.parse(storedProjectAgents) : initialProjectScopedMockAgents(projectId);
      setProjectAgents(Array.isArray(loadedProjectAgents) ? loadedProjectAgents : initialProjectScopedMockAgents(projectId));
    } catch (e) {
      console.error(`Error parsing agents for project ${projectId} from localStorage. Initializing with mocks.`, e);
      setProjectAgents(initialProjectScopedMockAgents(projectId));
    }

    const workflowsStorageKey = getWorkflowsStorageKey(projectId);
    const storedWorkflows = localStorage.getItem(workflowsStorageKey);
    try {
      let parsedWorkflows = storedWorkflows ? JSON.parse(storedWorkflows) as ProjectWorkflow[] : null;
      if (!parsedWorkflows || !Array.isArray(parsedWorkflows) || parsedWorkflows.length === 0) {
        parsedWorkflows = predefinedWorkflowsData(projectId);
      }
      setProjectWorkflows(parsedWorkflows.map(wf => ({ ...wf, nodes: wf.nodes || [], edges: wf.edges || [] })));
    } catch (e) {
      console.error(`Error parsing/loading workflows for project ${projectId}. Initializing with predefined.`, e);
      const defaultWfs = predefinedWorkflowsData(projectId);
      setProjectWorkflows(defaultWfs.map(wf => ({ ...wf, nodes: wf.nodes || [], edges: wf.edges || [] })));
    }

    const filesStorageKey = getFilesStorageKey(projectId);
    const storedProjectFiles = localStorage.getItem(filesStorageKey);
    try {
      const parsedFiles = storedProjectFiles ? JSON.parse(storedProjectFiles) : initialMockFilesData(projectId, currentProjectData.name);
      setProjectFiles(Array.isArray(parsedFiles) ? parsedFiles.map(f => ({...f, children: f.type === 'folder' ? (f.children || []) : undefined})) : initialMockFilesData(projectId, currentProjectData.name));
    } catch (e) {
      console.error(`Error parsing repository files for project ${projectId} from localStorage. Initializing with mocks.`, e);
      setProjectFiles(initialMockFilesData(projectId, currentProjectData.name));
    }

    const reqDocsStorageKey = getRequirementsStorageKey(projectId);
    const storedReqDocs = localStorage.getItem(reqDocsStorageKey);
    try {
        const parsedReqDocs = storedReqDocs ? JSON.parse(storedReqDocs) : initialMockRequirementDocs(projectId, currentProjectData.name);
        setProjectRequirementDocs(Array.isArray(parsedReqDocs) ? parsedReqDocs.map(f => ({...f, children: f.type === 'folder' ? (f.children || []) : undefined})) : initialMockRequirementDocs(projectId, currentProjectData.name));
    } catch (e) {
        console.error(`Error parsing requirement docs for project ${projectId} from localStorage. Initializing with defaults.`, e);
        setProjectRequirementDocs(initialMockRequirementDocs(projectId, currentProjectData.name));
    }

    const ticketsStorageKey = getTicketsStorageKey(projectId);
    const storedTickets = localStorage.getItem(ticketsStorageKey);
    try {
        const parsedTickets = storedTickets ? JSON.parse(storedTickets) : initialMockTickets(projectId);
        setProjectTickets(Array.isArray(parsedTickets) && parsedTickets.length > 0 ? parsedTickets : initialMockTickets(projectId));
    } catch (e) {
        console.error(`Error parsing tickets for project ${projectId} from localStorage. Initializing with mocks.`, e);
        setProjectTickets(initialMockTickets(projectId));
    }

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


  const updateWorkflowStatusBasedOnTasks = useCallback((
    currentTasks: Task[],
    currentWorkflows: ProjectWorkflow[]
  ): ProjectWorkflow[] => {
    if (!project || !currentWorkflows || currentWorkflows.length === 0) {
        return currentWorkflows ?? [];
    }

    let wasChangedOverall = false;
    const updatedWorkflows = currentWorkflows.map(workflow => {
      let newStatus = workflow.status;
      const tasksForThisWorkflow = currentTasks.filter(
        task => task.assignedTo === workflow.name && !task.isMilestone
      );

      if (tasksForThisWorkflow.length > 0) {
        const allDone = tasksForThisWorkflow.every(t => t.status === 'Done');
        const anyInProgressOrToDo = tasksForThisWorkflow.some(t => t.status === 'In Progress' || t.status === 'To Do');

        if ((anyInProgressOrToDo) && (workflow.status === 'Draft' || workflow.status === 'Inactive')) {
          newStatus = 'Active';
        } else if (allDone && workflow.status === 'Active') {
          newStatus = 'Inactive';
        }
      } else if (workflow.status === 'Active') {
        newStatus = 'Inactive';
      }
      
      if (newStatus !== workflow.status) {
        wasChangedOverall = true;
        if(isClient) {
          setTimeout(() => {
              toast({
                  title: `Workflow ${newStatus === 'Active' ? 'Activated' : (newStatus === 'Inactive' ? 'Deactivated' : 'Status Changed')}`,
                  description: `Workflow "${workflow.name}" is now ${newStatus}.`
              });
          }, 0);
        }
        return { ...workflow, status: newStatus, lastRun: (newStatus === 'Active' && workflow.status !== 'Active') ? new Date().toISOString() : workflow.lastRun };
      }
      return workflow;
    });

    if (wasChangedOverall) return updatedWorkflows;
    return currentWorkflows; // Return original array if no changes
  }, [project, isClient]); // toast removed
  
  useEffect(() => {
    if (isClient && project && tasks !== undefined) {
      localStorage.setItem(getTasksStorageKey(projectId), JSON.stringify(tasks));
      const timer = setTimeout(() => {
        setProjectWorkflows(prevWfs => updateWorkflowStatusBasedOnTasks(tasks, prevWfs));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [tasks, projectId, isClient, project, updateWorkflowStatusBasedOnTasks]);


  useEffect(() => {
    if (isClient && project && projectAgents !== undefined) {
      localStorage.setItem(getAgentsStorageKey(projectId), JSON.stringify(projectAgents));
    }
  }, [projectAgents, projectId, isClient, project]);

  useEffect(() => {
    if (isClient && project && projectWorkflows !== undefined) {
      const workflowsToSave = projectWorkflows.map(wf => ({
          ...wf,
          nodes: wf.nodes || [],
          edges: wf.edges || []
      }));
      localStorage.setItem(getWorkflowsStorageKey(projectId), JSON.stringify(workflowsToSave));
    }
  }, [projectWorkflows, projectId, isClient, project]);

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

  useEffect(() => {
    designingWorkflowIdRef.current = designingWorkflow ? designingWorkflow.id : null;
  }, [designingWorkflow]);


  useEffect(() => {
    if (!isClient || !designingWorkflowIdRef.current || !projectWorkflows?.length) {
      return;
    }
    const currentId = designingWorkflowIdRef.current;
    const workflowFromState = projectWorkflows.find(wf => wf.id === currentId);

    if (workflowFromState) {
      if (JSON.stringify(workflowFromState) !== JSON.stringify(designingWorkflow)) {
          setDesigningWorkflow(JSON.parse(JSON.stringify(workflowFromState)));
      }
    } else {
      if (designingWorkflow) {
        setDesigningWorkflow(null);
      }
    }
  }, [projectWorkflows, isClient]); // designingWorkflow removed from deps to prevent loop

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

      const plannedTaskDataFromAI = aiOutput?.plannedTask || {};
      const aiReasoning = aiOutput?.reasoning || "No reasoning provided by AI.";
      
      const taskTitle = plannedTaskDataFromAI.title || "Untitled AI Task";
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted taskTitle:", taskTitle);
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted aiReasoning:", aiReasoning);

      const suggestedSubTasksFromAI = plannedTaskDataFromAI.suggestedSubTasks || [];
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Extracted suggestedSubTasksFromAI:", JSON.stringify(suggestedSubTasksFromAI, null, 2));
      
      const subTasksDetailsText = (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0)
        ? `\n\nAI Suggested Sub-Tasks / Steps:\n${suggestedSubTasksFromAI.map(st => `- ${st.title || 'Untitled Sub-task'} (Agent Type: ${st.assignedAgentType || 'N/A'}) - Description: ${st.description || 'No description.'}`).join('\n')}`
        : "\n\nAI Suggested Sub-Tasks / Steps: None specified by AI.";
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed subTasksDetailsText:", subTasksDetailsText);
          
      const combinedDescription = `AI Reasoning: ${aiReasoning}${subTasksDetailsText}`;
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed combinedDescription:", combinedDescription);


      const mainTaskId = uid(`task-main-${projectId.slice(-4)}`);
      const newTasksToAdd: Task[] = [];

      const dependencies = Array.isArray(plannedTaskDataFromAI.dependencies) ? plannedTaskDataFromAI.dependencies : [];
      const parentId = (plannedTaskDataFromAI.parentId === "null" || plannedTaskDataFromAI.parentId === "" || plannedTaskDataFromAI.parentId === undefined || plannedTaskDataFromAI.parentId === NO_PARENT_VALUE) ? null : plannedTaskDataFromAI.parentId;
      
      let mainTaskStatus: TaskStatusType = (plannedTaskDataFromAI.status as TaskStatusType) || 'To Do';
      let mainTaskProgress = plannedTaskDataFromAI.isMilestone
                            ? (mainTaskStatus === 'Done' ? 100 : 0)
                            : (plannedTaskDataFromAI.progress === undefined || plannedTaskDataFromAI.progress === null ? 0 : Math.min(100,Math.max(0,Number(plannedTaskDataFromAI.progress) || 0 )));

      let assignedToValue = plannedTaskDataFromAI.assignedTo || "AI Assistant to determine";
      let toastDescription = "";
      let workflowAutoActivated = false;
      let firstSubTaskAutoStarted = false;
      
      const targetWorkflowForMainTask = projectWorkflows.find(wf => wf.name === assignedToValue);

      if (targetWorkflowForMainTask && !plannedTaskDataFromAI.isMilestone && mainTaskStatus !== 'Done' && suggestedSubTasksFromAI.length > 0) {
          mainTaskStatus = 'In Progress';
          mainTaskProgress = Math.max(mainTaskProgress || 0, 10); 
          if (targetWorkflowForMainTask.status === 'Draft' || targetWorkflowForMainTask.status === 'Inactive') {
              workflowAutoActivated = true;
          }
      } else if (targetWorkflowForMainTask && !plannedTaskDataFromAI.isMilestone && mainTaskStatus !== 'Done' && suggestedSubTasksFromAI.length === 0) {
          // Main task assigned to workflow, but no sub-tasks. Auto-start main task.
          mainTaskStatus = 'In Progress';
          mainTaskProgress = Math.max(mainTaskProgress || 0, 10);
          if (targetWorkflowForMainTask.status === 'Draft' || targetWorkflowForMainTask.status === 'Inactive') {
              workflowAutoActivated = true;
          }
      }


      const mainTask: Task = {
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
          suggestedSubTasks: suggestedSubTasksFromAI,
      };
      newTasksToAdd.unshift(mainTask);
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Constructed mainTask for persistence:", JSON.stringify(mainTask, null, 2));

      if (suggestedSubTasksFromAI && suggestedSubTasksFromAI.length > 0) {
          let lastCreatedSubTaskId: string | null = null;
          let cumulativeSubTaskStartDate = (mainTask.startDate && isValid(parseISO(mainTask.startDate))) ? parseISO(mainTask.startDate) : new Date();

          suggestedSubTasksFromAI.forEach((st, index) => {
              const subTaskId = uid(`subtask-${mainTaskId.slice(-5)}-${index}`);
              // For this iteration, sub-tasks get a default duration of 1 day.
              // AI could be prompted for sub-task durations in a more advanced version.
              const subTaskDuration = st.assignedAgentType.toLowerCase().includes("review") || st.assignedAgentType.toLowerCase().includes("validate") ? 2 : 1; // Example: Review tasks take longer
              
              let subTaskStatus: TaskStatusType = 'To Do';
              if (index === 0 && mainTaskStatus === 'In Progress') { // If main task auto-started due to workflow, start first sub-task
                subTaskStatus = 'In Progress';
                firstSubTaskAutoStarted = true;
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
                  description: st.description || "No description provided by AI for this sub-task.",
                  isAiPlanned: true,
                  sprintId: mainTask.sprintId,
                  suggestedSubTasks: [],
              };
              newTasksToAdd.push(newSubTask);
              lastCreatedSubTaskId = newSubTask.id;
              if (!(index === 0 && subTaskStatus === 'In Progress')) {
                cumulativeSubTaskStartDate = addDays(cumulativeSubTaskStartDate, subTaskDuration);
              }
          });
      }
      
      setTasks(prevTasks => {
          const allTasks = [...newTasksToAdd, ...prevTasks].sort((a, b) => {
              if (a.isMilestone && !b.isMilestone) return -1;
              if (!a.isMilestone && b.isMilestone) return 1;
              const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
              const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
              if (dateA !== dateB) return dateA - dateB;
              return (a.title || "Untitled").localeCompare(b.title || "Untitled");
          });
          return allTasks;
      });

      if (workflowAutoActivated && targetWorkflowForMainTask) {
          setProjectWorkflows(prevWfs => {
              const newWfs = prevWfs.map(wf =>
                  wf.id === targetWorkflowForMainTask!.id
                  ? { ...wf, status: 'Active' as ProjectWorkflow['status'], lastRun: new Date().toISOString() }
                  : wf
              );
              return newWfs;
          });
          toastDescription = `Task "${mainTask.title}" assigned to workflow "${targetWorkflowForMainTask.name}". Workflow activated.`;
          if (firstSubTaskAutoStarted && suggestedSubTasksFromAI.length > 0) {
              toastDescription += ` First sub-task "${suggestedSubTasksFromAI[0].title}" initiated.`;
          } else if (suggestedSubTasksFromAI.length === 0) {
             toastDescription += ` Task initiated.`;
          }
      } else if (mainTask.isMilestone) {
         toastDescription = `Milestone "${mainTask.title}" added to project "${project?.name || 'this project'}".`;
      } else {
         toastDescription = `Task "${mainTask.title}" added to project "${project?.name || 'this project'}".`;
         if (mainTask.assignedTo && mainTask.assignedTo !== "AI Assistant to determine") {
             const matchingWf = projectWorkflows.find(wf => wf.name === mainTask.assignedTo);
             if(matchingWf) {
                toastDescription += ` Assigned to workflow "${mainTask.assignedTo}".`;
             } else {
                toastDescription += ` Assigned to conceptual team/workflow: "${mainTask.assignedTo}".`;
             }
         }
      }

      const numSubTasksCreated = newTasksToAdd.filter(t => t.parentId === mainTask.id).length;
      if (numSubTasksCreated > 0 && !firstSubTaskAutoStarted) { // Avoid double mentioning if first subtask already mentioned
          toastDescription += ` ${numSubTasksCreated} sub-task${numSubTasksCreated > 1 ? 's were' : ' was'} also created.`;
      }

      setIsAITaskPlannerDialogOpen(false);
      setAiPlannerPrefillGoal(undefined);
      setAiPlannerSourceTicketAssignee(undefined);

      const taskForChat = newTasksToAdd.find(t => t.id === mainTask.id);
      console.log("PROJECT_DETAIL_PAGE (handleTaskPlannedAndAccepted): Main task object being passed to chat:", JSON.stringify(taskForChat, null, 2));


      if (isClient && taskForChat) {
          setTimeout(() => {
              toast({ title: mainTask.isMilestone ? "Milestone Planned by AI" : (mainTask.status === 'In Progress' ? "Task In Progress (AI Planned)" : "Task Planned by AI"), description: toastDescription });
              setChattingTask(taskForChat);
              setIsChatDialogOpen(true);
          }, 150);
      }
    },
    [project, projectId, isClient, toast, projectWorkflows, projectAgents, updateWorkflowStatusBasedOnTasks] 
);

  const handleAddTask = useCallback((taskData: Omit<Task, 'id' | 'projectId' | 'isAiPlanned' | 'suggestedSubTasks'>) => {
    if (!project) return;

    const newTask: Task = {
      id: uid(`task-${projectId.slice(-5)}`),
      projectId: projectId,
      ...taskData,
      isAiPlanned: false, 
      suggestedSubTasks: [],
      sprintId: taskData.sprintId === NO_SPRINT_VALUE ? null : taskData.sprintId,
    };

    let toastDescription = "";
    let toastTitle = newTask.isMilestone ? "Milestone Added" : "Task Added";

    setTasks(prevTasks => {
        const tasksWithNewOne = [newTask, ...prevTasks].sort((a, b) => {
            if (a.isMilestone && !b.isMilestone) return -1;
            if (!a.isMilestone && b.isMilestone) return 1;
            const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
            const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
            return (a.title || "Untitled").localeCompare(b.title || "Untitled");
        });
        return tasksWithNewOne;
    });

    // Check if task assignment activates a workflow or is picked up by a running agent
    const assignedEntityName = newTask.assignedTo;
    let workflowActivated = false;
    let taskAutoStartedByAgent = false;

    if (assignedEntityName && assignedEntityName !== "Unassigned" && !newTask.isMilestone) {
        const targetWorkflow = projectWorkflows.find(wf => wf.name === assignedEntityName);
        const targetAgent = projectAgents.find(ag => ag.name === assignedEntityName);

        if (targetWorkflow) {
            if (targetWorkflow.status === 'Draft' || targetWorkflow.status === 'Inactive') {
                setProjectWorkflows(prevWfs => prevWfs.map(wf =>
                    wf.id === targetWorkflow.id ? { ...wf, status: 'Active', lastRun: new Date().toISOString() } : wf
                ));
                workflowActivated = true;
                toastDescription = `Task "${newTask.title}" assigned to workflow "${targetWorkflow.name}". Workflow activated, task initiated.`;
            } else if (targetWorkflow.status === 'Active') {
                 toastDescription = `Task "${newTask.title}" assigned to active workflow "${targetWorkflow.name}". Task initiated.`;
            }
             if(targetWorkflow.status === 'Active' || workflowActivated) {
                newTask.status = 'In Progress'; // Mutating newTask here, but setTasks below will use this.
                newTask.progress = Math.max(newTask.progress || 0, 10);
                toastTitle = "Task In Progress";
            }

        } else if (targetAgent) {
            if (targetAgent.status === 'Running') {
                newTask.status = 'In Progress'; // Mutating newTask here
                newTask.progress = Math.max(newTask.progress || 0, 10);
                setProjectAgents(prevAgts => prevAgts.map(ag => ag.id === targetAgent.id ? {...ag, lastActivity: new Date().toISOString()} : ag));
                taskAutoStartedByAgent = true;
                toastTitle = "Task In Progress";
                toastDescription = `Task "${newTask.title}" assigned to running agent "${targetAgent.name}" and is now being processed.`;
            } else {
                toastDescription = `Task "${newTask.title}" assigned to agent "${targetAgent.name}". Start the agent to process.`;
            }
        } else {
             toastDescription = `Task "${newTask.title}" assigned to "${assignedEntityName}".`;
        }
    }

    if (!toastDescription) {
        toastDescription = `${newTask.isMilestone ? 'Milestone' : 'Task'} "${newTask.title}" has been added to project "${project.name}".`;
    } else if (!workflowActivated && !taskAutoStartedByAgent) {
        toastDescription = `${newTask.isMilestone ? 'Milestone' : 'Task'} "${newTask.title}" added to project "${project.name}". ` + toastDescription;
    }
    
    setIsAddTaskDialogOpen(false);

    if (isClient) {
        setTimeout(() => toast({ title: toastTitle, description: toastDescription }), 0);
    }
  }, [project, projectId, isClient, projectWorkflows, projectAgents, toast, updateWorkflowStatusBasedOnTasks]);

  const handleOpenEditTaskDialog = useCallback((task: Task, viewMode: boolean = false) => {
    setEditingTask(task);
    setIsViewingTask(viewMode);
    setIsEditTaskDialogOpen(true);
  }, []);

  const handleUpdateTask = useCallback((updatedTaskData: Task) => {
    if (!project || !updatedTaskData) return;

    let tasksArrayAfterUpdate: Task[] = [];
    let workflowStatusChangedInfo: { changed: boolean; workflowName: string; newStatus: ProjectWorkflow['status'] } = { changed: false, workflowName: "", newStatus: 'Draft' };


    setTasks(prevTasks => {
        tasksArrayAfterUpdate = prevTasks.map(task =>
            task.id === updatedTaskData.id ? updatedTaskData : task
        );

        const currentTask = tasksArrayAfterUpdate.find(t => t.id === updatedTaskData.id);
        if (!currentTask) return prevTasks; 

        if (currentTask.parentId) {
            const children = tasksArrayAfterUpdate.filter(t => t.parentId === currentTask.parentId);
            if (children.length > 0 && children.every(c => c.status === 'Done')) {
                const parentIndex = tasksArrayAfterUpdate.findIndex(t => t.id === currentTask.parentId);
                if (parentIndex !== -1 && tasksArrayAfterUpdate[parentIndex].status !== 'Done') {
                    tasksArrayAfterUpdate[parentIndex] = { ...tasksArrayAfterUpdate[parentIndex], status: 'Done', progress: 100 };
                }
            }
        }
        if (currentTask.isParent && currentTask.status === 'Done') {
            tasksArrayAfterUpdate = tasksArrayAfterUpdate.map(t => {
                if (t.parentId === currentTask.id && t.status !== 'Done') {
                    return { ...t, status: 'Done', progress: 100 };
                }
                return t;
            });
        }

        if (currentTask.isMilestone) {
            currentTask.progress = currentTask.status === 'Done' ? 100 : 0;
            currentTask.durationDays = 0; 
        } else { 
            if (currentTask.status === 'Done') {
                currentTask.progress = 100;
            } else if (currentTask.status === 'In Progress' && (currentTask.progress === undefined || currentTask.progress === 0)) {
                currentTask.progress = 10;
            } else if (currentTask.status === 'In Progress' && currentTask.progress === 100) {
                currentTask.progress = 90; 
            } else if ((currentTask.status === 'To Do' || currentTask.status === 'Blocked') && currentTask.progress !== 0) {
                currentTask.progress = 0;
            }
            currentTask.progress = Math.min(100, Math.max(0, currentTask.progress || 0));
            currentTask.durationDays = (currentTask.durationDays === undefined || currentTask.durationDays < 1) ? 1 : currentTask.durationDays;
        }
        
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

    // Separately update workflow statuses after tasks state has been set
    setProjectWorkflows(prevWfs => updateWorkflowStatusBasedOnTasks(tasksArrayAfterUpdate, prevWfs));


    setIsEditTaskDialogOpen(false);
    setEditingTask(null);
    if (isClient) {
      setTimeout(() => toast({
        title: `${updatedTaskData.isMilestone ? 'Milestone' : 'Task'} Updated`,
        description: `"${updatedTaskData.title}" has been updated.`,
      }),0);
    }
  }, [project, isClient, toast, projectWorkflows, updateWorkflowStatusBasedOnTasks]);


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

      let updatedTasksAfterDeletion: Task[] = [];
      setTasks(prevTasks => {
        updatedTasksAfterDeletion = prevTasks
          .filter(task => !tasksToDelete.has(task.id))
          .map(task => { 
               const newDependencies = task.dependencies?.filter(depId => !tasksToDelete.has(depId));
               const newParentId = task.parentId && tasksToDelete.has(task.parentId) ? null : task.parentId;
               return { ...task, dependencies: newDependencies, parentId: newParentId };
            });
        return updatedTasksAfterDeletion;
      });

      // Update workflow status after task deletion
      setProjectWorkflows(prevWfs => updateWorkflowStatusBasedOnTasks(updatedTasksAfterDeletion, prevWfs));

      let deletionMessage = `"${taskToDelete.title}" has been deleted.`;
      if (tasksToDelete.size > 1) { 
          deletionMessage = `"${taskToDelete.title}" and its ${tasksToDelete.size -1} sub-task(s) have been deleted.`;
      }
      if (isClient) {
        setTimeout(() => {
            toast({
              title: `${taskToDelete.isMilestone ? 'Milestone' : 'Task'} Deleted`,
              description: deletionMessage,
              variant: 'destructive',
            });
        }, 0);
      }
      setTaskToDelete(null);
      setIsDeleteTaskDialogOpen(false);
    }
  }, [taskToDelete, tasks, isClient, toast, updateWorkflowStatusBasedOnTasks]);


  // Kanban Board Drag and Drop Handlers
  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, task: Task) => {
    event.dataTransfer.setData('taskId', task.id);
    event.dataTransfer.setData('taskStatus', task.status);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleColumnDragOver = useCallback((event: React.DragEvent<HTMLDivElement>, status: TaskStatusType) => {
    event.preventDefault();
    setDraggingOverStatus(status);
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleColumnDragLeave = useCallback(() => {
    setDraggingOverStatus(null);
  }, []);

  const handleColumnDrop = useCallback((event: React.DragEvent<HTMLDivElement>, newStatus: TaskStatusType) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('taskId');
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as TaskStatusType;
    setDraggingOverStatus(null);
    setReorderTargetTaskId(null); 

    if (!taskId) return;

    let taskToUpdate: Task | undefined;
    let statusChanged = false;
    let movedToEndOfSameColumn = false;
    let updatedTasksList: Task[] = [];

    setTasks(currentTasks => {
        let reorderedTasks = [...currentTasks];
        const originalTaskIndex = reorderedTasks.findIndex(t => t.id === taskId);
        if (originalTaskIndex === -1) return currentTasks;

        taskToUpdate = { ...reorderedTasks[originalTaskIndex] };

        if (sourceTaskStatus !== newStatus) { // Status Change
            taskToUpdate.status = newStatus;
            statusChanged = true;
            if (newStatus === 'Done' && !taskToUpdate.isMilestone) taskToUpdate.progress = 100;
            else if ((newStatus === 'To Do' || newStatus === 'Blocked') && !taskToUpdate.isMilestone) taskToUpdate.progress = 0;
            else if (taskToUpdate.isMilestone) taskToUpdate.progress = newStatus === 'Done' ? 100 : 0;
            else if (newStatus === 'In Progress' && (taskToUpdate.progress === undefined || taskToUpdate.progress === 0) && !taskToUpdate.isMilestone) taskToUpdate.progress = 10;
            else if (newStatus === 'In Progress' && taskToUpdate.progress === 100 && !taskToUpdate.isMilestone) taskToUpdate.progress = 90;
            
            reorderedTasks[originalTaskIndex] = taskToUpdate;
            
            const [taskToMove] = reorderedTasks.splice(originalTaskIndex, 1);
            reorderedTasks.push(taskToMove);

        } else if (sourceTaskStatus === newStatus && !event.dataTransfer.getData('droppedOnCard')) { 
            const [taskToMove] = reorderedTasks.splice(originalTaskIndex, 1);
            reorderedTasks.push(taskToMove); 
            movedToEndOfSameColumn = true;
        }

        reorderedTasks.sort((a, b) => {
            const statusOrderA = taskStatuses.indexOf(a.status);
            const statusOrderB = taskStatuses.indexOf(b.status);
            if (statusOrderA !== statusOrderB) return statusOrderA - statusOrderB;
            
            const originalIdxA = originalIndices.get(a.id) ?? currentTasks.findIndex(t => t.id === a.id);
            const originalIdxB = originalIndices.get(b.id) ?? currentTasks.findIndex(t => t.id === b.id);
            
            if (a.id === taskId && (statusChanged || movedToEndOfSameColumn)) return 1; 
            if (b.id === taskId && (statusChanged || movedToEndOfSameColumn)) return -1;

            if (a.isMilestone && !b.isMilestone) return -1;
            if (!a.isMilestone && b.isMilestone) return 1;
            const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
            const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
            if (dateA !== dateB) return dateA - dateB;
            if (originalIdxA !== originalIdxB) return originalIdxA - originalIdxB;
            return (a.title || "Untitled").localeCompare(b.title || "Untitled");
          });
        updatedTasksList = reorderedTasks;
        return reorderedTasks;
    });

    if (taskToUpdate) {
        let toastTitle = "";
        let toastDescription = "";
        if (statusChanged) {
            toastTitle = "Task Status Updated";
            toastDescription = `Task "${taskToUpdate.title}" moved to ${newStatus}.`;
            // Update workflow status after task status change
            setProjectWorkflows(prevWfs => updateWorkflowStatusBasedOnTasks(updatedTasksList, prevWfs));
        } else if (movedToEndOfSameColumn) {
            toastTitle = "Task Moved to End";
            toastDescription = `Task "${taskToUpdate.title}" moved to end of list in "${newStatus}".`;
        }

        if (isClient && toastTitle) {
            setTimeout(() => toast({ title: toastTitle, description: toastDescription }), 0);
        }
    }
    event.dataTransfer.clearData('droppedOnCard');
  }, [isClient, toast, originalIndices, updateWorkflowStatusBasedOnTasks]);

  const handleTaskCardDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, task: Task) => {
    event.dataTransfer.setData('taskId', task.id);
    event.dataTransfer.setData('taskStatus', task.status);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleTaskCardDragOver = useCallback((event: React.DragEvent<HTMLDivElement>, targetTask: Task) => {
    event.preventDefault();
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as TaskStatusType;
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
    const sourceTaskStatus = event.dataTransfer.getData('taskStatus') as TaskStatusType;

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
  }, [isClient, toast]);


  // Gantt Chart Reorder
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
  }, [isClient, toast]);


  // Project Agents Functions
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
    if (isClient) {
      setTimeout(() => toast({
        title: "Project Agent Added",
        description: `Agent "${newAgent.name}" has been added to project "${project.name}".`,
      }), 0);
    }
    setIsAddProjectAgentDialogOpen(false);
  }, [project, projectId, isClient, toast]);

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
  }, [project?.name, isClient, toast]);

  const handleRunProjectAgent = useCallback((agentIdToRun: string) => {
    let agentThatRan: Agent | undefined;
    let processedTaskTitles: string[] = [];
    let tasksUpdatedInCurrentBatch: Task[] = [...tasks]; // Start with current tasks
    let agentUpdated = false;

    setProjectAgents(prevAgents =>
        prevAgents.map(agent => {
            if (agent.id === agentIdToRun) {
                agentThatRan = { ...agent, status: 'Running', lastActivity: new Date().toISOString() };
                agentUpdated = true;
                return agentThatRan;
            }
            return agent;
        })
    );

    if (agentThatRan) {
        const agentName = agentThatRan.name;
        tasksUpdatedInCurrentBatch = tasks.map(task => {
            if (task.assignedTo === agentName && task.status === 'To Do' && !task.isMilestone) {
                processedTaskTitles.push(task.title);
                return { ...task, status: 'In Progress' as TaskStatusType, progress: Math.max(task.progress || 0, 10) };
            }
            return task;
        });
        setTasks(tasksUpdatedInCurrentBatch); // This will trigger the useEffect to save and update workflows

        if (isClient) {
            setTimeout(() => {
                if (project) {
                    if (processedTaskTitles.length > 0) {
                        toast({ title: "Tasks Initiated by Agent", description: `Agent "${agentName}" started and is now processing ${processedTaskTitles.length} task(s): ${processedTaskTitles.join(', ')} for project "${project.name}".` });
                    } else {
                        toast({ title: "Agent Running", description: `Agent "${agentName}" is running for project "${project.name}". No 'To Do' tasks were found for it to pick up immediately.` });
                    }
                }
            }, 0);
        }
    } else if (agentUpdated) { // Agent status changed but was not found (should not happen but defensive)
        // If for some reason agentThatRan is undefined but we know an agent was updated (e.g. by ID)
        const updatedAgentName = projectAgents.find(a => a.id === agentIdToRun)?.name || agentIdToRun;
         if (isClient && project) {
            setTimeout(() => toast({ title: "Agent Status Updated", description: `Agent "${updatedAgentName}" status changed for project "${project.name}".` }), 0);
        }
    }
  }, [project, tasks, isClient, toast, projectAgents, setTasks, setProjectAgents, updateWorkflowStatusBasedOnTasks]);


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
  }, [isClient, toast]);

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
  }, [projectId, isClient, toast]);

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
  }, [agentToDelete, isClient, toast]);

  // Project Workflows Functions
  const handleAddProjectWorkflow = useCallback((
    workflowData: { name: string; description: string },
    initialNodesData?: Array<{ name: string; type: string; }>
  ) => {
    if (!project) return;

    let initialNodes: WorkflowNode[] = [];
    if (initialNodesData && initialNodesData.length > 0) {
        initialNodes = initialNodesData.map((nodeData, index) => ({
            id: uid(`wf-node-${workflowData.name.replace(/\s+/g, '-').slice(0,5)}-${index}`),
            name: nodeData.name,
            type: nodeData.type,
            x: 50 + (index % 4) * 200, // Simple initial layout
            y: 50 + Math.floor(index / 4) * 100,
            config: {},
        }));
    }

    const newWorkflow: ProjectWorkflow = {
      id: uid(`proj-wf-${projectId.slice(-4)}`),
      name: workflowData.name,
      description: workflowData.description,
      status: 'Draft',
      nodes: initialNodes,
      edges: [],
      lastRun: undefined,
    };
    setProjectWorkflows(prevWorkflows => [newWorkflow, ...prevWorkflows]);
    setIsAddWorkflowDialogOpen(false);
    if(isClient) {
        let toastMessage = `Workflow "${newWorkflow.name}" has been added to project "${project.name}".`;
        if (initialNodes.length > 0) {
            toastMessage += ` ${initialNodes.length} initial agent node(s) suggested.`;
        }
        setTimeout(() => toast({
          title: "Project Workflow Created",
          description: toastMessage,
        }), 0);
    }
  }, [project, projectId, isClient, toast]);

  const handleDesignWorkflow = useCallback((workflow: ProjectWorkflow) => {
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
    console.log(`PROJECT_DETAIL_PAGE: handleWorkflowNodesChange (for ID: ${currentDesigningWfId}) received updatedNodes. Length: ${updatedNodes.length}, IDs: ${updatedNodes.map(n=>n.id).join(', ')}`);

    if (currentDesigningWfId) {
      setProjectWorkflows(prevWorkflows => {
        console.log(`PROJECT_DETAIL_PAGE: Inside setProjectWorkflows for nodes. prevWorkflows length: ${prevWorkflows.length}`);
        const newWorkflowsArray = prevWorkflows.map(wf => {
          if (wf.id === currentDesigningWfId) {
            console.log(`PROJECT_DETAIL_PAGE: Updating nodes for workflow ID: ${wf.id}. New nodes count: ${updatedNodes.length}`);
            return { ...wf, nodes: updatedNodes };
          }
          return wf;
        });
        const updatedWfForLog = newWorkflowsArray.find(wf => wf.id === currentDesigningWfId);
        console.log(`PROJECT_DETAIL_PAGE: Workflow in newWorkflows array (after node map). ID: ${updatedWfForLog?.id} Nodes count: ${updatedWfForLog?.nodes?.length} Nodes IDs: ${updatedWfForLog?.nodes?.map(n => n.id).join(', ')}`);
        return newWorkflowsArray;
      });
    } else {
        console.warn("PROJECT_DETAIL_PAGE: handleWorkflowNodesChange called but no designingWorkflow ID is current.");
    }
  }, []);

  const handleWorkflowEdgesChange = useCallback((updatedEdges: WorkflowEdge[]) => {
    const currentDesigningWfId = designingWorkflowIdRef.current;
    console.log(`PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange (for ID: ${currentDesigningWfId}) received updatedEdges length: ${updatedEdges.length}`);
    if (currentDesigningWfId) {
      setProjectWorkflows(prevWorkflows => {
         console.log(`PROJECT_DETAIL_PAGE: Inside setProjectWorkflows for edges. prevWorkflows length: ${prevWorkflows.length}`);
        const newWorkflowsArray = prevWorkflows.map(wf => {
          if (wf.id === currentDesigningWfId) {
             console.log(`PROJECT_DETAIL_PAGE: Updating edges for workflow ID: ${wf.id}. New edges count: ${updatedEdges.length}`);
            return { ...wf, edges: updatedEdges };
          }
          return wf;
        });
        const updatedWfForLog = newWorkflowsArray.find(wf => wf.id === currentDesigningWfId);
        console.log(`PROJECT_DETAIL_PAGE: Workflow in newWorkflows array (after edge map). ID: ${updatedWfForLog?.id} Edges count: ${updatedWfForLog?.edges?.length}`);
        return newWorkflowsArray;
      });
    } else {
        console.warn("PROJECT_DETAIL_PAGE: handleWorkflowEdgesChange called but no designingWorkflow ID is current.");
    }
  }, []);

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
  }, [workflowToDelete, isClient, toast]); 

  // Task Chat Functions
  const handleOpenChatDialog = useCallback((task: Task) => {
    console.log("PROJECT_DETAIL_PAGE: Opening chat for task:", JSON.stringify(task, null, 2));
    setChattingTask(task);
    setIsChatDialogOpen(true);
  }, []);

  const handleTaskStatusChangeByAI = useCallback((taskId: string, newStatus: TaskStatusType) => {
    console.log(`PROJECT_DETAIL_PAGE: AI suggests status change for task ${taskId} to ${newStatus}`);
    let updatedTasksList : Task[] = [];
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              progress: newStatus === 'Done' ? 100 : ( (newStatus === 'To Do' || newStatus === 'Blocked') && !t.isMilestone ? 0 : (t.progress === undefined ? (newStatus === 'In Progress' ? 10 : 0) : t.progress) )
            }
          : t
      );
      updatedTasks.sort((a, b) => { 
          if (a.isMilestone && !b.isMilestone) return -1;
          if (!a.isMilestone && b.isMilestone) return 1;
          const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
          const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
          if (dateA !== dateB) return dateA - dateB;
          return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      });
      updatedTasksList = updatedTasks;
      return updatedTasks;
    });

    setProjectWorkflows(prevWfs => updateWorkflowStatusBasedOnTasks(updatedTasksList, prevWfs));

    if (chattingTask && chattingTask.id === taskId) {
      setChattingTask(prev => prev ? {...prev, status: newStatus, progress: newStatus === 'Done' ? 100 : (newStatus === 'In Progress' && (prev.progress === undefined || prev.progress === 0) ? 10 : prev.progress) } : null);
    }
  }, [chattingTask, updateWorkflowStatusBasedOnTasks]); 

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

      console.log("PROJECT_DETAIL_PAGE: Simulating file creation in repo:", JSON.stringify(newFile, null, 2));

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
    [project, projectId, currentFilePath, isClient, toast] 
  );

  // Requirement Documents Functions
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
       const { updatedItems, itemAddedOrUpdated, existingItem } = addFileOrFolderRecursive(prevDocs, currentRequirementDocPath, newFolder, false);
        if (itemAddedOrUpdated) {
            if (isClient) setTimeout(() => toast({ title: "Requirement Folder Created", description: `Folder "${newFolder.name}" created in ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.` }), 0);
        } else if (existingItem && existingItem.type === 'folder'){
             if (isClient) setTimeout(() => toast({ title: "Error Creating Folder", description: `A folder named "${newFolder.name}" already exists in ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.`, variant: "destructive" }), 0);
        }
        return updatedItems;
    });

    setIsNewRequirementFolderDialogOpen(false);
    setNewRequirementFolderName("");
  }, [newRequirementFolderName, projectId, currentRequirementDocPath, isClient, toast]);

  const handleRequirementFileUploadClick = useCallback(() => {
    requirementFileInputRef.current?.click();
  }, []);

  const handleRequirementFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    let updatedReqDocsState = [...projectRequirementDocs]; 
    let filesAddedCount = 0;
    let filesSkippedCount = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        const newFile: ProjectFile = {
          id: uid(`reqdoc-file-${projectId.slice(-4)}-${file.name.replace(/\s+/g, '-')}`),
          name: file.name,
          type: 'file',
          path: currentRequirementDocPath,
          size: `${(file.size / 1024).toFixed(1)}KB`,
          lastModified: new Date(file.lastModified).toISOString(),
          content: fileContent,
          children: []
        };
        const result = addFileOrFolderRecursive(updatedReqDocsState, currentRequirementDocPath, newFile, false);
        if (result.itemAddedOrUpdated) {
            updatedReqDocsState = result.updatedItems;
            filesAddedCount++;
        } else if (result.existingItem && result.existingItem.type === 'file') {
            filesSkippedCount++;
             if(isClient) setTimeout(() => toast({ title: "File Skipped", description: `File "${newFile.name}" already exists and was not overwritten.`, variant: "default" }), 0);
        }

        if (filesAddedCount + filesSkippedCount === files.length) { 
            setProjectRequirementDocs(updatedReqDocsState);
            if(filesAddedCount > 0 && isClient) setTimeout(() => toast({ title: "Requirement Documents Uploaded", description: `${filesAddedCount} document(s) added to ${currentRequirementDocPath === '/' ? 'Requirements root' : currentRequirementDocPath}.` }), 0);
        }
      };
      reader.readAsText(file);
    });

    if(requirementFileInputRef.current) requirementFileInputRef.current.value = "";
  }, [projectRequirementDocs, projectId, currentRequirementDocPath, isClient, toast]);


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
  }, [projectId, isClient, toast]);

  const handleSaveRequirementDocContent = useCallback(() => {
    if (editingRequirementDoc) {
      setProjectRequirementDocs(prevDocs => {
        const result = updateFileContentRecursive(prevDocs, editingRequirementDoc.id, editingRequirementDocContent);
        if (result.itemUpdated && isClient) {
          setTimeout(() => toast({ title: "Requirement Document Saved", description: `Content of "${editingRequirementDoc.name}" updated.` }), 0);
        }
        return result.updatedItems;
      });
      setIsEditRequirementDocDialogOpen(false);
      setEditingRequirementDoc(null);
      setEditingRequirementDocContent("");
    }
  }, [editingRequirementDoc, editingRequirementDocContent, isClient, toast]);


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
  }, [requirementDocToDelete, isClient, toast]);

  const displayedRequirementDocs = useMemo(() => {
    return getFilesForPathRecursive(projectRequirementDocs, currentRequirementDocPath);
  }, [projectRequirementDocs, currentRequirementDocPath]);

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
# Requirement: ${newRequirement.title} (ID: ${newRequirement.id})

**Project:** ${project.name}
**Priority:** ${newRequirement.priority}
**Status:** ${newRequirement.status}
**Version:** ${newRequirement.version}
**Created:** ${formatDate(newRequirement.createdDate, 'PPpp')}
**Last Updated:** ${formatDate(newRequirement.updatedDate, 'PPpp')}

## Description
${newRequirement.description}

---
*This document was created from a structured requirement entry.*
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
        const { updatedItems, itemAddedOrUpdated, existingItem } = addFileOrFolderRecursive(prevDocs, newFile.path, newFile, false);
        if (itemAddedOrUpdated && isClient) {
            setTimeout(() => toast({ title: "Requirement Document Created", description: `Document "${newFile.name}" created for requirement "${newRequirement.title}" in ${newFile.path}.` }), 0);
        } else if (existingItem && existingItem.type === 'file') {
             if (isClient) setTimeout(() => toast({ title: "File Skipped", description: `File "${newFile.name}" already exists and was not overwritten.`, variant: "default" }), 0);
        }
        return updatedItems;
      });
      setIsAddRequirementDialogOpen(false);
  }, [project, projectId, isClient, currentRequirementDocPath, formatDate, toast]);

  // Repository Files Functions
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
      const { updatedItems, itemAddedOrUpdated, existingItem } = addFileOrFolderRecursive(prevFiles, currentFilePath, newFolderItem, false);
      if (itemAddedOrUpdated && isClient) {
          setTimeout(() => toast({ title: "Folder Created", description: `Folder "${newFolderItem.name}" created in ${currentFilePath === '/' ? 'Repository root' : currentFilePath}.` }), 0);
      } else if (existingItem && existingItem.type === 'folder') {
           if (isClient) setTimeout(() => toast({ title: "Error Creating Folder", description: `A folder named "${newFolderItem.name}" already exists in ${currentFilePath === '/' ? 'Repository root' : currentFilePath}.`, variant: "destructive" }), 0);
      }
      return updatedItems;
    });

    setIsNewRepoFolderDialogOpen(false);
    setNewRepoFolderName("");
  }, [newRepoFolderName, projectId, currentFilePath, isClient, toast]);


  const handleRepoFileUploadClick = useCallback(() => {
    repoFileInputRef.current?.click();
  }, []);

  const handleRepoFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    let updatedProjectFilesState = [...projectFiles]; 
    let filesAddedCount = 0;
    let filesSkippedCount = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        const newFileItem: ProjectFile = {
            id: uid(`file-${projectId.slice(-4)}-${file.name.replace(/\s+/g, '-')}`),
            name: file.name,
            type: 'file',
            path: currentFilePath,
            size: `${(file.size / 1024).toFixed(1)}KB`,
            lastModified: new Date(file.lastModified).toISOString(),
            content: fileContent,
            children: []
        };
        const result = addFileOrFolderRecursive(updatedProjectFilesState, currentFilePath, newFileItem, false); 
        if(result.itemAddedOrUpdated) {
            updatedProjectFilesState = result.updatedItems;
            filesAddedCount++;
        } else if (result.existingItem && result.existingItem.type === 'file') {
            filesSkippedCount++;
             if (isClient) setTimeout(() => toast({ title: "File Skipped", description: `File "${newFileItem.name}" already exists and was not overwritten.`, variant: "default" }), 0);
        }

        if (filesAddedCount + filesSkippedCount === files.length) {
            setProjectFiles(updatedProjectFilesState);
            if(filesAddedCount > 0 && isClient) setTimeout(() => toast({ title: "Files Uploaded", description: `${filesAddedCount} file(s) added to ${currentFilePath === '/' ? 'Repository root' : currentFilePath}. Content stored in localStorage.` }), 0);
        }
      };
      reader.readAsText(file); 
    });

    if(repoFileInputRef.current) repoFileInputRef.current.value = "";
  }, [projectFiles, projectId, currentFilePath, isClient, toast]);


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
          setTimeout(() => toast({ title: "File Saved", description: `Content of "${editingRepoFile.name}" updated.` }), 0);
        }
        return result.updatedItems;
      });
      setIsEditRepoFileDialogOpen(false);
      setEditingRepoFile(null);
      setEditingRepoFileContent("");
    }
  }, [editingRepoFile, editingRepoFileContent, isClient, toast]);

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
  }, [repoFileToDelete, isClient, toast]);


  const displayedRepoFiles = useMemo(() => {
    return getFilesForPathRecursive(projectFiles, currentFilePath);
  }, [projectFiles, currentFilePath]);

  // Tickets Functions
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
  }, [project, projectId, isClient, toast]);

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
  }, [editingTicket, isClient, toast]);

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
  }, [ticketToDelete, isClient, toast]);

  const handleOpenAITaskPlannerWithTicketContext = useCallback((ticket: Ticket) => {
    let goal = `Address Ticket:\nID: ${ticket.id.slice(-6)}\nTitle: ${ticket.title}\nType: ${ticket.type}\nPriority: ${ticket.priority}\nStatus: ${ticket.status}\nDescription:\n${ticket.description}\n\nPlease plan the necessary tasks to resolve this.`;
    setAiPlannerPrefillGoal(goal);
    setAiPlannerSourceTicketAssignee(ticket.assignee);
    setIsAITaskPlannerDialogOpen(true);
  }, []);

  const handleOpenAITaskPlannerDialog = useCallback(() => {
    setAiPlannerPrefillGoal(undefined);
    setAiPlannerSourceTicketAssignee(undefined);
    setIsAITaskPlannerDialogOpen(true);
  }, []);


  const filteredTickets = useMemo(() => {
    const sortedTickets = [...projectTickets].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    if (selectedTicketTypeFilter === 'All') {
      return sortedTickets;
    }
    return sortedTickets.filter(ticket => ticket.type === selectedTicketTypeFilter);
  }, [projectTickets, selectedTicketTypeFilter]);

  const projectProgress = useMemo(() => {
    const nonMilestoneTasks = tasks.filter(t => !t.isMilestone && !t.isParent); 
    const parentTasks = tasks.filter(t => t.isParent && !t.isMilestone);
    
    let totalProgress = 0;
    let contributingTaskCount = 0;

    nonMilestoneTasks.forEach(task => {
        totalProgress += (task.progress || 0);
        contributingTaskCount++;
    });

    parentTasks.forEach(parent => {
        const children = tasks.filter(t => t.parentId === parent.id && !t.isMilestone);
        if (children.length > 0) {
            const childrenProgress = children.reduce((sum, child) => sum + (child.progress || 0), 0);
            totalProgress += Math.round(childrenProgress / children.length); 
            contributingTaskCount++;
        } else if (parent.progress !== undefined) { 
            totalProgress += parent.progress;
            contributingTaskCount++;
        }
    });

    if (contributingTaskCount === 0) return 0;
    return Math.round(totalProgress / contributingTaskCount);
  }, [tasks]);


  const activeWorkflowCount = useMemo(() => projectWorkflows.filter(wf => wf.status === 'Active').length, [projectWorkflows]);

  // Sprints Management Functions
  const handleOpenManageSprintsDialog = () => {
    setEditingSprint(null); 
    setIsManageSprintsDialogOpen(true);
  };

  const handleAddOrUpdateSprint = useCallback((sprintData: Partial<Sprint> & { name: string; status: SprintStatus }) => {
    setProjectSprints(prevSprints => {
      let updatedSprints;
      if (sprintData.id) { 
        updatedSprints = prevSprints.map(s => 
          s.id === sprintData.id ? { ...s, ...sprintData, projectId } : s
        );
      } else { 
        const newSprint: Sprint = {
          id: uid(`sprint-${projectId.slice(-4)}`),
          projectId,
          name: sprintData.name,
          goal: sprintData.goal || "",
          startDate: sprintData.startDate || format(new Date(), 'yyyy-MM-dd'),
          endDate: sprintData.endDate || format(addDays(parseISO(sprintData.startDate || format(new Date(), 'yyyy-MM-dd')), 13), 'yyyy-MM-dd'), 
          status: sprintData.status || 'Planned',
        };
        updatedSprints = [newSprint, ...prevSprints];
      }
      return updatedSprints.sort((a,b) => (a.startDate && b.startDate && isValid(parseISO(a.startDate)) && isValid(parseISO(b.startDate))) ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0);
    });
    if (isClient) {
      setTimeout(() => toast({ title: 'Sprint Saved', description: `Sprint "${sprintData.name}" has been ${sprintData.id ? 'updated' : 'added'}.` }), 0);
    }
    setEditingSprint(null); 
    
  }, [isClient, projectId, toast]);

  const handleDeleteSprint = useCallback((sprintId: string) => {
    
    setTasks(prevTasks => prevTasks.map(t => t.sprintId === sprintId ? { ...t, sprintId: null } : t));
    setProjectTickets(prevTickets => prevTickets.map(t => t.sprintId === sprintId ? { ...t, sprintId: null } : t));

    setProjectSprints(prevSprints => prevSprints.filter(s => s.id !== sprintId));
    if (isClient) {
      setTimeout(() => toast({ title: 'Sprint Deleted', description: 'Sprint has been deleted and items unassigned.', variant: 'destructive' }), 0);
    }
    if (editingSprint?.id === sprintId) {
        setEditingSprint(null); 
    }
  }, [isClient, toast, editingSprint?.id, setTasks, setProjectTickets]);

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
      const result = await analyzeTicket(input);
      setTicketAnalysisResult(result);
      setIsAnalyzeTicketResultDialogOpen(true);
    } catch (error) {
      console.error("Error analyzing ticket with AI:", error);
      if (isClient) {
        setTimeout(() => toast({
          title: "AI Analysis Failed",
          description: `Could not get analysis for ticket "${ticket.title}". ${error instanceof Error ? error.message : String(error)}`,
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
# Requirement: ${newRequirement.title} (ID: ${newRequirement.id})

**Project:** ${project.name}
**Priority:** ${newRequirement.priority}
**Status:** ${newRequirement.status}
**Version:** ${newRequirement.version}
**Created:** ${formatDate(newRequirement.createdDate, 'PPpp')}
**Last Updated:** ${formatDate(newRequirement.updatedDate, 'PPpp')}

## Description
${newRequirement.description}

---
*This document was created from a structured requirement entry.*
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
        const { updatedItems, itemAddedOrUpdated, existingItem } = addFileOrFolderRecursive(prevDocs, newFile.path, newFile, false);
        if (itemAddedOrUpdated && isClient) {
            setTimeout(() => toast({ title: "Requirement Document Created", description: `Document "${newFile.name}" created for requirement "${newRequirement.title}" in ${newFile.path}.` }), 0);
        } else if (existingItem && existingItem.type === 'file') {
             if (isClient) setTimeout(() => toast({ title: "File Skipped", description: `File "${newFile.name}" already exists and was not overwritten.`, variant: "default" }), 0);
        }
        return updatedItems;
      });
      setIsAddRequirementDialogOpen(false);
  }, [project, projectId, isClient, currentRequirementDocPath, formatDate, toast]);


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
        <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 rounded-md mb-6 sm:mb-4">
          <TabsTrigger value="taskManagement" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><ListChecks className="mr-1.5 h-4 w-4"/>Task Management</TabsTrigger>
          <TabsTrigger value="projectAssets" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><FolderGit2 className="mr-1.5 h-4 w-4"/>Documents & Files</TabsTrigger>
          <TabsTrigger value="aiAutomation" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><Brain className="mr-1.5 h-4 w-4"/>AI & Automation</TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><TicketIconLucide className="mr-1.5 h-4 w-4"/>Tickets</TabsTrigger>
          <TabsTrigger value="kpis" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3 sm:py-2"><TrendingUp className="mr-1.5 h-4 w-4"/>KPIs</TabsTrigger>
        </TabsList>

        {/* Task Management Tab */}
        <TabsContent value="taskManagement" className="mt-8 sm:mt-4 md:mt-4">
            <Card>
                <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <div>
                        <PageHeaderHeading as="h3" className="text-xl font-semibold">Task Management Central</PageHeaderHeading>
                        <CardDescription className="text-xs sm:text-sm mt-0">
                            Organize, track, and plan project tasks. Manage sprints for better focus.
                        </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                         <Button onClick={handleOpenManageSprintsDialog} variant="outline" size="sm" className="w-full sm:w-auto">
                            <Layers className="mr-2 h-4 w-4" /> Manage Sprints
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" className="w-full sm:w-auto h-9">
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
                    {projectSprints.filter(s => s.status === 'Active' || s.status === 'Planned').length > 0 && (
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
                                            <Button size="sm" variant="default" className="w-full max-w-xs sm:w-auto">
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
                                            <Button size="sm" variant="default" className="w-full max-w-xs sm:w-auto">
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
                                        <div className={cn("p-2 rounded-md font-semibold text-sm mb-2 text-center", taskStatusCardColors[status])}>
                                            {status} ({tasks.filter(task => task.status === status && !task.isMilestone).length})
                                        </div>
                                        <ScrollArea className="h-[calc(100vh-14rem-14rem)] min-h-[200px]">
                                          <div className="space-y-2 p-2">
                                            {tasks
                                                .filter(task => task.status === status)
                                                .sort((a,b) => {
                                                    const originalIndexA = originalIndices.get(a.id) ?? Infinity;
                                                    const originalIndexB = originalIndices.get(b.id) ?? Infinity;
                                                    if (originalIndexA !== originalIndexB) return originalIndexA - originalIndexB;
                                                    
                                                    if (a.isMilestone && !b.isMilestone) return -1;
                                                    if (!a.isMilestone && b.isMilestone) return 1;
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
                                                    taskStatusColors={taskStatusCardColors}
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

        {/* Documents & Files Tab (formerly Project Assets) */}
        <TabsContent value="projectAssets" className="mt-8 sm:mt-4 md:mt-4">
             <Card>
                <CardHeader className="p-0">
                    <Tabs defaultValue="requirements" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid sm:grid-cols-2 rounded-none border-b"> 
                            <TabsTrigger value="requirements" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <ClipboardList className="mr-2 h-4 w-4" />Requirements Docs
                            </TabsTrigger>
                            <TabsTrigger value="repository" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                                <FolderIcon className="mr-2 h-4 w-4" />Repository Files
                            </TabsTrigger>
                        </TabsList>

                        {/* Requirements Sub-Tab */}
                        <TabsContent value="requirements" className="mt-0 p-3 sm:p-4 md:p-6">
                            <Card>
                                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div>
                                        <PageHeaderHeading as="h3" className="text-xl font-semibold">Requirements Documents (ASPICE Structure)</PageHeaderHeading>
                                        <CardDescription className="text-xs mt-0">Manage requirement documents, organized by ASPICE process areas. Edits are saved locally.</CardDescription>
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

                                    {displayedRequirementDocs.length === 0 && currentRequirementDocPath === '/' && projectRequirementDocs.length === 0 && (
                                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-[200px] bg-muted/20">
                                            <ClipboardList className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                            <p className="mb-2 font-medium">No requirement documents or folders found. ASPICE structure not initialized.</p>
                                            <p className="text-xs mb-3">Initialize with default ASPICE folders or create your own.</p>
                                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                                                 <Button variant="default" size="sm" onClick={() => {
                                                    if (project) {
                                                        setProjectRequirementDocs(initialMockRequirementDocs(project.id, project.name));
                                                        if (isClient) toast({ title: "ASPICE Structure Initialized", description: "Default ASPICE folder structure added to Requirements."});
                                                    }
                                                }} className="w-full sm:w-auto">
                                                    <FolderPlus className="mr-2 h-4 w-4"/>Initialize ASPICE Folders
                                                </Button>
                                                 <Button variant="outline" size="sm" onClick={() => setIsGenerateReqDocDialogOpen(true)} className="w-full sm:w-auto">
                                                      <Sparkles className="mr-2 h-4 w-4"/>Generate Document with AI
                                                  </Button>
                                                 <Button variant="outline" size="sm" onClick={handleRequirementFileUploadClick} className="w-full sm:w-auto">
                                                    <UploadCloud className="mr-2 h-4 w-4" /> Upload Document (Mock)
                                                </Button>
                                                <input type="file" multiple ref={requirementFileInputRef} style={{ display: 'none' }} onChange={handleRequirementFileSelect} />
                                                <Button variant="outline" size="sm" onClick={() => {setNewRequirementFolderName(""); setIsNewRequirementFolderDialogOpen(true);}} className="w-full sm:w-auto">
                                                    <FolderPlus className="mr-2 h-4 w-4"/>New Folder
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                     {displayedRequirementDocs.length === 0 && (currentRequirementDocPath !== '/' || projectRequirementDocs.length > 0) && (
                                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-[200px] bg-muted/20">
                                            <ClipboardList className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                            <p className="mb-2 font-medium">No requirement documents or folders found in '{currentRequirementDocPath}'.</p>
                                             <div className="flex flex-wrap justify-center gap-2 mt-2">
                                                <Button variant="default" size="sm" onClick={() => setIsGenerateReqDocDialogOpen(true)} className="w-full sm:w-auto">
                                                    <Sparkles className="mr-2 h-4 w-4"/>Generate Document with AI
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={handleRequirementFileUploadClick} className="w-full sm:w-auto">
                                                    <UploadCloud className="mr-2 h-4 w-4" /> Upload Document (Mock)
                                                </Button>
                                                <input type="file" multiple ref={requirementFileInputRef} style={{ display: 'none' }} onChange={handleRequirementFileSelect} />
                                                <Button variant="outline" size="sm" onClick={() => {setNewRequirementFolderName(""); setIsNewRequirementFolderDialogOpen(true);}} className="w-full sm:w-auto">
                                                    <FolderPlus className="mr-2 h-4 w-4"/>New Folder
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {displayedRequirementDocs.length > 0 && (
                                    <>
                                        <div className="mb-4 flex flex-wrap justify-start gap-2">
                                            <Button variant="default" size="sm" onClick={() => setIsGenerateReqDocDialogOpen(true)} className="w-full sm:w-auto">
                                                <Sparkles className="mr-2 h-4 w-4"/>Generate Document with AI
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={handleRequirementFileUploadClick} className="w-full sm:w-auto">
                                                <UploadCloud className="mr-2 h-4 w-4" /> Upload Document (Mock)
                                            </Button>
                                            <input type="file" multiple ref={requirementFileInputRef} style={{ display: 'none' }} onChange={handleRequirementFileSelect} />
                                            <Button variant="outline" size="sm" onClick={() => {setNewRequirementFolderName(""); setIsNewRequirementFolderDialogOpen(true);}} className="w-full sm:w-auto">
                                                <FolderPlus className="mr-2 h-4 w-4"/>New Folder
                                            </Button>
                                        </div>
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
                                                        : <LucideFileIcon className="h-4 w-4 mr-2 text-gray-500" />}
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
                                                                        if (isClient) toast({ title: "Download (Placeholder)", description: `Downloading ${doc.name}... Not implemented.`});
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
                                    </>
                                    )}
                                </CardContent>
                                <CardFooter className="border-t pt-4">
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setIsViewTraceabilityMatrixDialogOpen(true);
                                    }}  className="w-full sm:w-auto">
                                      <ExternalLink className="mr-2 h-4 w-4" /> View Traceability Matrix (Placeholder)
                                    </Button>
                                     <Button variant="outline" size="sm" onClick={() => setIsAddRequirementDialogOpen(true)} className="w-full sm:w-auto ml-2">
                                        <FilePlus2 className="mr-2 h-4 w-4" /> Add Requirement Item (as Doc)
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* Repository Sub-Tab */}
                        <TabsContent value="repository" className="mt-0 p-3 sm:p-4 md:p-6">
                           <Card>
                              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div>
                                  <PageHeaderHeading as="h3" className="text-xl font-semibold">Project Repository Files</PageHeaderHeading>
                                  <CardDescription className="text-xs mt-0">Browse and manage general project files. Edits are saved locally.</CardDescription>
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
                                  <>
                                    <div className="mb-4 flex flex-wrap justify-start gap-2">
                                        <Button variant="outline" size="sm" onClick={handleRepoFileUploadClick} className="w-full sm:w-auto">
                                            <UploadCloud className="mr-2 h-4 w-4" /> Upload Files (Mock)
                                        </Button>
                                        <input type="file" multiple ref={repoFileInputRef} style={{ display: 'none' }} onChange={handleRepoFileSelect} />
                                        <Button variant="default" size="sm" onClick={() => {setNewRepoFolderName(""); setIsNewRepoFolderDialogOpen(true);}} className="w-full sm:w-auto">
                                            <FolderPlus className="mr-2 h-4 w-4"/>New Folder
                                        </Button>
                                    </div>
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
                                                    : <LucideFileIcon className="h-4 w-4 mr-2 text-gray-500" />}
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
                                                                if(isClient) toast({ title: "Download (Placeholder)", description: `Downloading ${file.name}... Not implemented.`});
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
                                  </>
                                ) : (
                                  <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-[200px] border-2 border-dashed rounded-md bg-muted/20">
                                    <FolderIcon className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                    <p className="mb-2 font-medium">This repository folder '{currentFilePath}' is empty.</p>
                                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                                        <Button variant="outline" size="sm" onClick={handleRepoFileUploadClick} className="w-full sm:w-auto">
                                            <UploadCloud className="mr-2 h-4 w-4" /> Upload Files (Mock)
                                        </Button>
                                        <input type="file" multiple ref={repoFileInputRef} style={{ display: 'none' }} onChange={handleRepoFileSelect} />
                                        <Button variant="default" size="sm" onClick={() => {setNewRepoFolderName(""); setIsNewRepoFolderDialogOpen(true);}} className="w-full sm:w-auto">
                                            <FolderPlus className="mr-2 h-4 w-4"/>New Folder
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

        {/* AI & Automation Tab */}
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

                        {/* Project Agents Sub-Tab */}
                        <TabsContent value="projectAgents" className="mt-0 p-3 sm:p-4 md:p-6">
                            <Card>
                                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div>
                                        <PageHeaderHeading as="h3" className="text-xl font-semibold">Project Agents</PageHeaderHeading>
                                        <CardDescription className="text-xs mt-0">Manage agents specific to this project. These are used in workflows.</CardDescription>
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
                                            <Button size="sm" variant="default" onClick={() => setIsAddProjectAgentDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                                                <PlusSquare className="mr-2 h-4 w-4"/>Add First Project Agent
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Project Workflows & Design Sub-Tab */}
                        <TabsContent value="projectWorkflows" className="mt-0 p-3 sm:p-4 md:p-6">
                            {!designingWorkflow ? (
                                <Card>
                                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div>
                                            <PageHeaderHeading as="h3" className="text-xl font-semibold">Project Workflows</PageHeaderHeading>
                                            <CardDescription className="text-xs mt-0">
                                                Define automated processes. Select a workflow to design its steps.
                                            </CardDescription>
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
                                                    onDeleteWorkflow={handleOpenDeleteWorkflowDialog}
                                                />
                                                ))}
                                            </div>
                                            ) : (
                                            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-[200px] bg-muted/20">
                                                <WorkflowIcon className="mx-auto h-10 w-10 mb-2 text-muted-foreground/50" />
                                                <p className="mb-2 font-medium">No workflows defined for this project yet.</p>
                                                <Button size="sm" variant="default" onClick={() => setIsAddWorkflowDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
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
                                                <CardDescription className="text-xs text-muted-foreground mt-1">
                                                    {designingWorkflow.description || "Drag agents to the canvas and connect them."}
                                                    (Nodes: {designingWorkflow.nodes?.length || 0}, Edges: {designingWorkflow.edges?.length || 0})
                                                </CardDescription>
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

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="mt-8 sm:mt-4 md:mt-4">
          <Card>
            <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <div>
                <PageHeaderHeading as="h3" className="text-xl font-semibold">Ticket Management</PageHeaderHeading>
                <CardDescription className="text-xs mt-0 sm:text-sm">Track issues, bugs, and change requests related to this project.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                 <Select value={selectedTicketTypeFilter} onValueChange={(value) => setSelectedTicketTypeFilter(value as TicketType | 'All')}>
                  <SelectTrigger className="w-full sm:w-[180px] text-xs h-9">
                    <SelectValue placeholder="Filter by type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All" className="text-xs">All Types</SelectItem>
                    {ticketTypes.map(type => (
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
                   <Button size="sm" variant="default" onClick={() => setIsAddTicketDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                      <PlusSquare className="mr-2 h-4 w-4"/>Add First Ticket
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* KPIs Tab */}
        <TabsContent value="kpis" className="mt-8 sm:mt-4 md:mt-4">
          <Card>
            <CardHeader>
              <PageHeaderHeading as="h3" className="text-xl font-semibold flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-primary"/> Project KPIs & Performance
              </PageHeaderHeading>
              <CardDescription className="text-xs mt-0 sm:text-sm">
                Key Performance Indicators and metrics for this project. (Placeholder)
              </CardDescription>
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
            projectContext={`Project Name: ${project.name}\nDescription: ${project.description}`}
            projectAgents={projectAgents}
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
                        {requirementDocToDelete.type === 'folder' && (!requirementDocToDelete.children || requirementDocToDelete.children.length === 0) && " This will permanently delete the document folder."}
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
                        {ticketAnalysisResult.suggestedNextSteps.split('\\n').map((step, index) => step.trim() && <li key={index}>{step.replace(/^- /, '')}</li>)}
                        </ul>
                    </div>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Potential Impact:</Label>
                    <p className="p-2 bg-muted/50 rounded-md border text-sm">{ticketAnalysisResult.potentialImpact}</p>
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">AI Reasoning:</Label>
                    <p className="p-2 bg-muted/50 rounded-md border text-sm italic whitespace-pre-wrap max-h-28 overflow-y-auto">{ticketAnalysisResult.reasoning}</p>
                </div>
                </div>
            </ScrollArea>
            <AlertDialogFooter className="mt-2">
              <AlertDialogAction onClick={() => setIsAnalyzeTicketResultDialogOpen(false)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}


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
                handleAddOrUpdateSprint(sprintData as any);
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
  // End of file
}
export default ProjectDetailPage;
