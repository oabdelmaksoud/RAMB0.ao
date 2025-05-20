import { analyzeTicketFlow, AnalyzeTicketInput, AnalyzeTicketOutput } from './analyze-ticket-flow';
import { generateRequirementDocFlow, GenerateRequirementDocInput, GenerateRequirementDocOutput } from './generate-requirement-doc-flow';
import { planProjectTaskFlow, PlanProjectTaskInput, PlanProjectTaskOutput } from './plan-project-task-flow';
import { summarizeAgentPerformanceFlow, SummarizeAgentPerformanceInput, SummarizeAgentPerformanceOutput } from './summarize-agent-performance-flow';

// Add other flow imports here

export const availableFlows: Record<string, Function> = {
  analyzeTicketFlow,
  generateRequirementDocFlow,
  planProjectTaskFlow,
  summarizeAgentPerformanceFlow,
  // Add other flows here
};

// Export types if they are meant to be used externally for configuration or understanding
export type {
  AnalyzeTicketInput, AnalyzeTicketOutput,
  GenerateRequirementDocInput, GenerateRequirementDocOutput,
  PlanProjectTaskInput, PlanProjectTaskOutput,
  SummarizeAgentPerformanceInput, SummarizeAgentPerformanceOutput
};
