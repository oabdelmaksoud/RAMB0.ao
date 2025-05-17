
'use server';
/**
 * @fileOverview An AI agent that plans a project task based on user goals and project context.
 *
 * - planProjectTask - A function that handles the task planning process.
 * - PlanProjectTaskInput - The input type for the planProjectTask function.
 * - PlanProjectTaskOutput - The return type for the planProjectTask function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { format } from 'date-fns';
import type { Task } from '@/types'; // Ensure Task type is available if needed for direct matching

const WorkflowInfoSchema = z.object({
  name: z.string().describe('The name of an existing project workflow.'),
  description: z.string().describe('The description of the project workflow.'),
});

const PlanProjectTaskInputSchema = z.object({
  userGoal: z.string().describe("The user's natural language description of the task or goal to be achieved."),
  projectId: z.string().describe('The ID of the project for which the task is being planned.'),
  projectWorkflows: z.array(WorkflowInfoSchema).describe('A list of existing workflows in the project, providing context on established processes.'),
});
export type PlanProjectTaskInput = z.infer<typeof PlanProjectTaskInputSchema>;

const SuggestedSubTaskSchema = z.object({
  title: z.string().describe("A concise title for this sub-task or step."),
  assignedAgentType: z.string().describe("The type of AI agent best suited to perform this sub-task (e.g., 'Analysis Agent', 'Code Generation Agent', 'Documentation Agent', 'Testing Agent')."),
  description: z.string().describe("A brief description (1-2 sentences) explaining the purpose or key activities of this sub-task.")
});

// Output schema should align with Omit<Task, 'id'> and include reasoning
const PlannedTaskSchema = z.object({
  title: z.string().describe('A concise and descriptive title for the planned task.'),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Blocked']).default('To Do').describe("The initial status of the task, typically 'To Do'."),
  assignedTo: z.string().default('AI Assistant to determine').describe('The suggested "Agent Workflow" or "Agent Team" for the task. This should be an existing project workflow name or a conceptual name for a new workflow/team (e.g., "New Feature Rollout Workflow").'),
  startDate: z.string().default(format(new Date(), 'yyyy-MM-dd')).describe("The suggested start date for the task, in YYYY-MM-DD format. Defaults to today's date."),
  durationDays: z.number().int().min(1).default(1).describe('The estimated duration of the task in days, assuming AI agents are performing the work. Must be at least 1.'),
  progress: z.number().int().min(0).max(100).default(0).describe('The initial progress of the task, as a percentage from 0 to 100. Defaults to 0.'),
  isMilestone: z.boolean().default(false).describe('Whether this task should be considered a project milestone. Defaults to false.'),
  parentId: z.string().nullable().default(null).describe('The ID of a parent task, if this is a subtask. Defaults to null.'),
  dependencies: z.array(z.string()).default([]).describe('An array of task IDs that this task depends on. Defaults to an empty array.'),
  suggestedSubTasks: z.array(SuggestedSubTaskSchema).optional().describe("A list of suggested sub-tasks or steps AI agents would perform to complete the main task. This should be generated if the main task is complex enough to warrant a breakdown.")
});

const PlanProjectTaskOutputSchema = z.object({
  plannedTask: PlannedTaskSchema.describe('The structured task details planned by the AI.'),
  reasoning: z.string().describe('A detailed explanation from the AI on how it derived the task plan, including its choice for "assignedTo" (workflow/team), consideration of project workflows, estimation of duration based on AI agent execution, and any assumptions made.'),
});
export type PlanProjectTaskOutput = z.infer<typeof PlanProjectTaskOutputSchema>;

export async function planProjectTask(input: PlanProjectTaskInput): Promise<PlanProjectTaskOutput> {
  return planProjectTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'planProjectTaskPrompt',
  input: { schema: PlanProjectTaskInputSchema },
  output: { schema: PlanProjectTaskOutputSchema },
  prompt: `You are an expert project management assistant specializing in planning tasks for systems where tasks are **primarily executed by AI Agents**. Your role is to help plan a new main task for a project based on a user's stated goal.

Project Context:
Project ID: {{{projectId}}}

Available Project Workflows (These are existing, defined processes for the project):
{{#if projectWorkflows.length}}
{{#each projectWorkflows}}
- Workflow Name: "{{name}}"
  Description: {{description}}
{{/each}}
{{else}}
- No specific project workflows provided.
{{/if}}

User's Goal:
"{{{userGoal}}}"

Based on the user's goal and the project context, please generate a single, well-defined main task.

Main Task Details to Generate (plannedTask object):
- title: A clear, action-oriented title for the task.
- status: Set to "To Do" by default.
- assignedTo: Determine the most appropriate 'Agent Workflow' or 'Agent Team' for this task.
  - If the user's goal strongly aligns with one of the 'Available Project Workflows', assign the task directly to the **name of that existing project workflow** (e.g., "Software Development Lifecycle").
  - If the user's goal does NOT clearly align with an existing workflow, suggest a **conceptual name for a new workflow or an agent team** that would be responsible for this type of task (e.g., "New Feature Rollout Workflow", "Urgent Bugfix Team", "Marketing Content Creation Workflow").
  - **IMPORTANT: Do NOT assign this task to an individual agent type (like 'Analysis Agent' or 'Developer'). Always assign to a workflow name (existing or conceptual) or a conceptual team name.** Use "AI Assistant to determine" as a last resort if no specific workflow or team concept fits.
- startDate: Suggest a start date. Default to today's date: ${format(new Date(), 'yyyy-MM-dd')}.
- durationDays: **CRITICAL: Estimate a reasonable duration in days assuming AI AGENTS are performing ALL the work. This is NOT an estimate for human engineers.** Tasks that might take humans days or weeks could be completed by AI agents in a few hours or a single day. Examples include code generation, data analysis, report drafting, initial design mockups. Be aggressive with short durations if AI can automate the core work. The minimum duration is 1 day.
- progress: Default to 0.
- isMilestone: Default to false, unless the user's goal clearly indicates a major milestone.
- parentId: Default to null. Do not suggest a parent task unless explicitly requested or strongly implied.
- dependencies: Default to an empty array. Do not suggest dependencies unless explicitly requested or strongly implied.
- suggestedSubTasks: If the main task is complex enough, break it down into a list of actionable sub-tasks or steps that AI agents would perform. For each sub-task:
    - title: A concise title for the sub-task.
    - assignedAgentType: The type of AI agent best suited to perform this sub-task (e.g., 'Analysis Agent', 'Code Generation Agent', 'Documentation Agent', 'Testing Agent', 'Deployment Agent', 'Monitoring Agent').
    - description: A brief (1-2 sentences) description explaining the purpose or key activities of this sub-task.

Reasoning (reasoning string):
Provide a **highly detailed** 'reasoning' string explaining your thought process for the generated task plan.
- Explain your choice for 'assignedTo' in detail. If an existing 'Available Project Workflow' was chosen, state its name and why it's a good fit for the user's goal.
- If a new conceptual workflow or team name was suggested for 'assignedTo', explain the rationale for this new grouping and why it's suitable for the task.
- Explain your choices for 'durationDays', **explicitly stating that your estimate is based on AI AGENT execution speed and capabilities, not human effort.** Mention why the task might be shorter (or longer) due to AI involvement.
- If you generated 'suggestedSubTasks', briefly explain why this breakdown is appropriate for AI agent execution and how the sub-tasks contribute to the main task.

Example Reasoning for existing workflow: "The user's goal to 'design a new logo' strongly aligns with the existing 'Brand Asset Creation' project workflow. Task assigned to 'Brand AssetCreation' to initiate this established process. A 1-day duration is estimated for initial AI-driven concept generation and automated revisions based on standard parameters, reflecting AI's speed in such creative tasks. The task has been broken down into conceptual design, feedback collection (simulated), and finalization sub-tasks, each handled by appropriate agent types and with clear purposes."
Example Reasoning for conceptual workflow/team: "The user's goal to 'investigate urgent server outage' does not fit existing workflows. This requires immediate, specialized attention, so the task has been assigned to a conceptual 'Urgent Server Response Team'. The estimated duration is 1 day, assuming AI agents can rapidly perform automated log analysis and system diagnostics far quicker than manual investigation. Sub-tasks include log analysis to identify error patterns, system diagnostics to check resource utilization, and reporting findings to summarize the issue, handled by Analysis and Monitoring agent types."

Ensure the 'plannedTask.startDate' is in YYYY-MM-DD format.
Ensure 'plannedTask.durationDays' is an integer and at least 1.
Ensure 'plannedTask.progress' is an integer between 0 and 100.
If 'suggestedSubTasks' are provided, each sub-task must have a 'title', an 'assignedAgentType', and a 'description'.
`,
});

const planProjectTaskFlow = ai.defineFlow(
  {
    name: 'planProjectTaskFlow',
    inputSchema: PlanProjectTaskInputSchema,
    outputSchema: PlanProjectTaskOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate a task plan.');
    }
    // Ensure defaults are applied if AI misses them, especially for non-string types.
    // Zod defaults should ideally handle this, but explicit checks can be a safeguard.
    output.plannedTask.status = output.plannedTask.status || 'To Do';
    output.plannedTask.assignedTo = output.plannedTask.assignedTo || 'AI Assistant to determine';
    output.plannedTask.startDate = output.plannedTask.startDate || format(new Date(), 'yyyy-MM-dd');
    output.plannedTask.durationDays = output.plannedTask.durationDays === undefined ? 1 : Math.max(1, output.plannedTask.durationDays); // Ensure min 1
    output.plannedTask.progress = output.plannedTask.progress !== undefined ? Math.min(100, Math.max(0, output.plannedTask.progress)) : 0;
    output.plannedTask.isMilestone = output.plannedTask.isMilestone === undefined ? false : output.plannedTask.isMilestone;
    output.plannedTask.parentId = output.plannedTask.parentId === undefined ? null : output.plannedTask.parentId;
    output.plannedTask.dependencies = output.plannedTask.dependencies || [];
    output.plannedTask.suggestedSubTasks = output.plannedTask.suggestedSubTasks || [];


    return output;
  }
);

