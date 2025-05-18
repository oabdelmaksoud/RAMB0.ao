
'use client';

import AgentManagementTable from '@/components/features/agent-management/AgentManagementTable';
import type { Agent } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { SlidersHorizontal, PlusSquareIcon } from 'lucide-react';
import AddAgentDialog from '@/components/features/agent-management/AddAgentDialog';
import EditAgentDialog from '@/components/features/agent-management/EditAgentDialog';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
import { uid } from '@/lib/utils';

// ASPICE V-Model Aligned Global Agent Templates with more detailed configs
export const initialGlobalAgentsData: Agent[] = [
  {
    id: uid('global-agent-req-analysis'),
    name: 'ASPICE Requirements Elicitation & Analysis Agent',
    type: 'Analysis Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    config: {
      focusProcessAreas: ["SYS.1", "SYS.2", "SWE.1"],
      elicitationMethods: ["Stakeholder Interviews", "Workshops", "Document Analysis"],
      analysisTechniques: ["Use Case Modeling", "Scenario Analysis", "FMEA on Requirements"],
      outputArtifacts: ["StakeholderRequirementsSpecification.docx", "SystemRequirementsSpecification.pdf", "RequirementsTraceabilityMatrix.xlsx"],
      validationCriteria: "SMART, Testable, Unambiguous",
      toolIntegration: ["Jira", "Confluence"],
      complianceLevel: "ASPICE Level 2 Target",
      keywords: ["requirements", "elicitation", "analysis", "specification", "validation", "aspice", "sys.1", "sys.2", "swe.1"]
    },
  },
  {
    id: uid('global-agent-sys-arch'),
    name: 'ASPICE System Architectural Design Agent',
    type: 'Design Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    config: {
      focusProcessAreas: ["SYS.3"],
      modelingLanguage: "SysML_with_AUTOSAR_Profile",
      viewpoints: ["Logical View", "Physical View", "Process View", "Deployment View"],
      designPrinciples: ["Modularity", "Scalability", "Security-by-Design", "Safety-in-Depth"],
      interfaceDefinition: "AUTOSAR XML (ARXML)",
      inputArtifacts: ["SystemRequirementsSpecification.pdf", "SafetyGoals.docx"],
      outputArtifacts: ["SystemArchitectureDesignDocument.vsdx", "InterfaceControlDocument.xlsx"],
      tradeOffAnalysis: ["Performance vs. Cost", "Safety vs. Complexity"],
      keywords: ["system architecture", "sysml", "autosar", "design principles", "aspice", "sys.3"]
    },
  },
  {
    id: uid('global-agent-sw-arch'),
    name: 'ASPICE Software Architectural Design Agent',
    type: 'Design Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    config: {
      focusProcessAreas: ["SWE.2"],
      designPatterns: ["Microservices", "Layered Architecture", "Event-Driven", "Service-Oriented Architecture"],
      componentSpecification: "Detailed component interfaces, responsibilities, and interactions",
      dynamicBehaviorModeling: "Sequence Diagrams, State Machines",
      resourceAllocation: "Memory budget, CPU time allocation per component",
      inputArtifacts: ["SoftwareRequirementsSpecification.docx", "SystemArchitectureDesignDocument.vsdx"],
      outputArtifacts: ["SoftwareArchitectureDesign.drawio", "ComponentInteractionMatrix.xlsx"],
      keywords: ["software architecture", "design patterns", "uml", "component design", "aspice", "swe.2"]
    },
  },
  {
    id: uid('global-agent-sw-detail'),
    name: 'ASPICE Software Detailed Design & Implementation Agent',
    type: 'Development Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    config: {
      focusProcessAreas: ["SWE.3", "SWE.4 (Unit Construction)"],
      programmingLanguages: ["C++17", "Python 3.9+", "MISRA C/C++"],
      codingStandards: "AUTOSAR C++14 Coding Guidelines, MISRA C:2012",
      unitTestFrameworks: ["GoogleTest", "pytest", "CppUnit"],
      staticAnalysisTools: ["Clang-Tidy", "PVS-Studio", "Coverity"],
      codeQualityGates: ["Min. 85% Code Coverage", "Zero Critical Static Analysis Warnings"],
      inputArtifacts: ["SoftwareArchitectureDesign.drawio", "ComponentSpecifications.md"],
      outputArtifacts: ["SourceCodeRepository (Git)", "UnitTestsCoverageReport.html", "StaticAnalysisResults.xml"],
      keywords: ["detailed design", "implementation", "coding standards", "unit testing", "static analysis", "aspice", "swe.3", "swe.4"]
    },
  },
  {
    id: uid('global-agent-unit-verif'),
    name: 'ASPICE Software Unit Verification Agent',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    config: {
      focusProcessAreas: ["SWE.4 (Unit Verification)"],
      verificationMethods: ["Static Code Analysis", "Dynamic Analysis (Unit Tests)", "Code Reviews (Automated Checklist)"],
      testCaseDesignTechniques: ["Equivalence Partitioning", "Boundary Value Analysis", "Statement Coverage", "Branch Coverage"],
      coverageGoalPercent: { "statement": 90, "branch": 80 },
      inputArtifacts: ["SourceCodeUnits", "DetailedDesignSpecifications", "Unit Test Cases"],
      outputArtifacts: ["UnitVerificationReport.xml", "CodeCoverageReport.html", "StaticAnalysisViolations.csv"],
      tooling: ["gcov/lcov", "JaCoCo", "BullseyeCoverage"],
      keywords: ["unit verification", "code coverage", "test cases", "static analysis", "dynamic analysis", "aspice", "swe.4"]
    },
  },
  {
    id: uid('global-agent-sw-int-test'),
    name: 'ASPICE Software Integration Testing Agent',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    config: {
      focusProcessAreas: ["SWE.5"],
      integrationStrategy: "Incremental (Top-down, Bottom-up, or Sandwich)",
      testEnvironmentSetup: "Simulated environment with stubs and drivers for dependencies",
      stubbingFramework: "GoogleMock, Mockito, NSubstitute",
      interfaceTesting: "Verification of data exchange and control flow between software units/components",
      inputArtifacts: ["IntegratedSoftwareModules", "SoftwareArchitectureDesign.drawio", "InterfaceSpecifications.md"],
      outputArtifacts: ["SoftwareIntegrationTestReport.pdf", "DefectLog.xlsx"],
      keywords: ["software integration testing", "interface testing", "stubs", "drivers", "aspice", "swe.5"]
    },
  },
  {
    id: uid('global-agent-sw-qual-test'),
    name: 'ASPICE Software Qualification Testing Agent',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    config: {
      focusProcessAreas: ["SWE.6"],
      testingMethods: ["BlackBoxTesting", "Requirement-Based Testing", "AlphaTesting (Simulated User Scenarios)"],
      testEnvironment: "Target-like or production-similar environment",
      acceptanceCriteriaSource: "SoftwareRequirementsSpecification.docx, UserStories.md",
      nonFunctionalTesting: ["Performance (basic load)", "Usability (heuristic evaluation)"],
      inputArtifacts: ["CompletedSoftwareProduct", "SoftwareRequirementsSpecification.docx"],
      outputArtifacts: ["SoftwareQualificationTestReport.pdf", "TraceabilityMatrix_Req_To_Test.xlsx"],
      keywords: ["software qualification testing", "black-box testing", "acceptance testing", "aspice", "swe.6"]
    },
  },
  {
    id: uid('global-agent-sys-int-test'),
    name: 'ASPICE System Integration Testing Agent',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    config: {
      focusProcessAreas: ["SYS.4"],
      testEnvironment: "Hardware-in-the-Loop (HIL) or full system bench",
      dataSeedingRequired: true,
      interfaceVerification: "Between system components (HW/SW, SW/SW)",
      inputArtifacts: ["IntegratedSystemComponents", "SystemArchitectureDesignDocument.vsd", "SystemInterfaceSpecifications.xlsx"],
      outputArtifacts: ["SystemIntegrationTestReport.xml", "SystemIntegrationDefectLog.csv"],
      keywords: ["system integration testing", "hil", "interface verification", "aspice", "sys.4"]
    },
  },
  {
    id: uid('global-agent-sys-qual-test'),
    name: 'ASPICE System Qualification Testing Agent',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    config: {
      focusProcessAreas: ["SYS.5"],
      validationMethods: ["UserScenarioTesting (End-to-End)", "PerformanceTesting (Nominal & Stress)", "SecurityScans (Basic)"],
      testEnvironment: "Production-representative environment or actual target environment",
      acceptanceCriteriaSource: "SystemRequirementsSpecification.pdf, StakeholderRequirements.docx",
      inputArtifacts: ["CompletedSystemProduct", "CustomerAcceptanceCriteria.md"],
      outputArtifacts: ["SystemQualificationTestReport.pdf", "FinalValidationReport.docx"],
      keywords: ["system qualification testing", "validation", "end-to-end testing", "user scenarios", "aspice", "sys.5"]
    },
  },
  {
    id: uid('global-agent-pm'),
    name: 'ASPICE Project Management Support Agent',
    type: 'Reporting Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
    config: {
      focusProcessAreas: ["MAN.3 (Project Management)", "MAN.5 (Risk Management)"],
      reportingFrequency: "Weekly, Bi-weekly, Monthly (configurable)",
      riskAssessmentMethod: "FMEA, Risk Matrix",
      kpiToTrack: ["ScheduleVariance", "EffortVariance", "DefectDensity", "RequirementsVolatility", "ASPICEComplianceScore"],
      tools: ["Jira_Interface", "Gantt_Generator_API", "RiskRegister_Interface"],
      outputArtifacts: ["ProjectStatusReport.pdf", "RiskManagementPlan.docx", "ProjectTimeline.mppx"],
      keywords: ["project management", "reporting", "risk management", "kpi tracking", "aspice", "man.3", "man.5"]
    },
  },
  {
    id: uid('global-agent-qa'),
    name: 'ASPICE Quality Assurance Support Agent',
    type: 'Custom Logic Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    config: {
      focusProcessAreas: ["SUP.1 (Quality Assurance)", "SUP.4 (Joint Review)"],
      auditActivities: ["ProcessComplianceChecks (automated & manual checklists)", "WorkProductReviews (document & code scans)"],
      metricsCollection: ["DefectEscapeRate", "ReviewEffectiveness", "ProcessAdherencePercentage"],
      problemResolutionTrackingSystem: "Integrated with project's ticket system",
      reporting: "QA_StatusReport.pptx, AuditFindings.xlsx",
      keywords: ["quality assurance", "process compliance", "audits", "reviews", "aspice", "sup.1", "sup.4"]
    },
  },
  {
    id: uid('global-agent-cm'),
    name: 'ASPICE Configuration Management Support Agent',
    type: 'CI/CD Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 13).toISOString(),
    config: {
      focusProcessAreas: ["SUP.8 (Configuration Management)", "SUP.9 (Problem Resolution Management)", "SUP.10 (Change Request Management)"],
      versionControlSystem: "Git (with GitFlow branching model)",
      baseliningStrategy: "ReleaseBased, SprintBased (configurable)",
      changeRequestSystemIntegration: "Jira, ServiceNow",
      buildAutomationTool: "Jenkins, GitLab CI",
      artifactRepository: "Artifactory, Nexus",
      keywords: ["configuration management", "version control", "baselining", "change management", "ci/cd", "aspice", "sup.8", "sup.9", "sup.10"]
    },
  },
  {
    id: uid('global-agent-doc'),
    name: 'ASPICE Technical Documentation Agent',
    type: 'Documentation Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    config: {
      focusProcessAreas: ["SUP.7 (Documentation)"], // Primarily SUP.7, though SUP.1 for QA aspects.
      documentTypes: ["SystemRequirementsSpecification", "SoftwareRequirementsSpecification", "ArchitectureDesignDocument", "DetailedDesignDocument", "TestPlan", "TestReport", "UserManual", "MaintenanceManual"],
      outputFormats: ["PDF/A", "Markdown", "HTML", "ConfluenceExport"],
      templateRepository: "SharedDocTemplates_GitRepo",
      reviewCycle: "AutomatedPeerReview (Grammar, Style, Link Checking) then ManualReview",
      versioning: "SemanticVersioning tied to CM baselines",
      keywords: ["technical documentation", "srs", "sdd", "test plans", "user manuals", "aspice", "sup.7"]
    },
  }
];

export const AGENTS_STORAGE_KEY = 'ramboAgentGlobalAgents';

export default function AgentManagementPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const { toast } = useToast();
  const [isAddAgentDialogOpen, setIsAddAgentDialogOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const storedAgents = localStorage.getItem(AGENTS_STORAGE_KEY);
      if (storedAgents) {
        try {
          const parsedAgents = JSON.parse(storedAgents);
          if (Array.isArray(parsedAgents) && parsedAgents.length > 0) {
            setAgents(parsedAgents);
          } else {
            setAgents(initialGlobalAgentsData); // Initialize with detailed mocks if localStorage is empty/invalid
          }
        } catch (error) {
          console.error("Failed to parse agents from localStorage, initializing with mocks.", error);
          setAgents(initialGlobalAgentsData);
        }
      } else {
        setAgents(initialGlobalAgentsData); // Initialize if no data in localStorage
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient && agents.length > 0) {
       localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
    } else if (isClient && agents.length === 0 && localStorage.getItem(AGENTS_STORAGE_KEY)) {
      // If all agents are deleted, clear from localStorage
      localStorage.removeItem(AGENTS_STORAGE_KEY);
    }
  }, [agents, isClient]);


  const handleAddAgent = (agentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => {
    const newAgent: Agent = {
      ...agentData,
      id: uid('global-agent'),
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setAgents(prevAgents => [newAgent, ...prevAgents]);
    toast({
      title: "Global Agent Template Created",
      description: `Agent "${newAgent.name}" has been added.`,
    });
    setIsAddAgentDialogOpen(false);
  };

  const handleOpenEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setIsEditDialogOpen(true);
  };

  const handleUpdateAgent = (updatedAgent: Agent) => {
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === updatedAgent.id ? { ...updatedAgent, lastActivity: new Date().toISOString() } : agent
      )
    );
    setIsEditDialogOpen(false);
    setEditingAgent(null);
     toast({
      title: "Global Agent Template Updated",
      description: `Agent "${updatedAgent.name}" has been updated.`,
    });
  };

  const handleRunAgent = (agentId: string) => {
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Running', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = agents.find(a => a.id === agentId)?.name;
    toast({ title: "Global Agent Started (Simulation)", description: `Agent "${agentName || agentId}" is now "Running".` });
  };

  const handleStopAgent = (agentId: string) => {
    setAgents(prevAgents =>
      prevAgents.map(agent =>
        agent.id === agentId ? { ...agent, status: 'Stopped', lastActivity: new Date().toISOString() } : agent
      )
    );
    const agentName = agents.find(a => a.id === agentId)?.name;
    toast({ title: "Global Agent Stopped (Simulation)", description: `Agent "${agentName || agentId}" has been "Stopped".` });
  };

  const handleDuplicateAgent = (agentToDuplicate: Agent) => {
    const newAgent: Agent = {
      ...agentToDuplicate,
      id: uid('global-agent-copy'),
      name: `${agentToDuplicate.name} - Copy`,
      status: 'Idle',
      lastActivity: new Date().toISOString(),
    };
    setAgents(prevAgents => [newAgent, ...prevAgents]);
    toast({ title: "Global Agent Template Duplicated", description: `Agent "${agentToDuplicate.name}" duplicated as "${newAgent.name}".` });
  };

  const handleOpenDeleteDialog = (agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAgent = () => {
    if (agentToDelete) {
      setAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentToDelete.id));
      toast({ title: "Global Agent Template Deleted", description: `Agent "${agentToDelete.name}" has been deleted.`, variant: 'destructive' });
      setAgentToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="container mx-auto">
      <PageHeader className="items-start justify-between sm:flex-row sm:items-center">
        <div>
          <PageHeaderHeading>
            <SlidersHorizontal className="mr-2 inline-block h-6 w-6" />
            Global Agent Configuration Templates
          </PageHeaderHeading>
          <PageHeaderDescription>
            Manage global agent configurations. These serve as templates or base configurations for project-specific agents.
          </PageHeaderDescription>
        </div>
        <Button onClick={() => setIsAddAgentDialogOpen(true)} className="w-full mt-4 sm:w-auto sm:mt-0">
          <PlusSquareIcon className="mr-2 h-4 w-4" /> Add New Global Agent
        </Button>
      </PageHeader>

      <AgentManagementTable
        agents={agents}
        onEditAgent={handleOpenEditDialog}
        onRunAgent={handleRunAgent}
        onStopAgent={handleStopAgent}
        onDuplicateAgent={handleDuplicateAgent}
        onDeleteAgent={handleOpenDeleteDialog}
      />
      
      <AddAgentDialog 
        open={isAddAgentDialogOpen}
        onOpenChange={setIsAddAgentDialogOpen}
        onAddAgent={handleAddAgent}
      />

      {editingAgent && (
        <EditAgentDialog
          agent={editingAgent}
          open={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditDialogOpen(isOpen);
            if (!isOpen) setEditingAgent(null);
          }}
          onUpdateAgent={handleUpdateAgent}
        />
      )}

      {agentToDelete && (
         <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this global agent template?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the global agent template
                "{agentToDelete.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setAgentToDelete(null);
                setIsDeleteDialogOpen(false);
              }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteAgent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
