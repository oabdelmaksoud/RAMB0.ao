
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

// Output schema should align with Omit<Task, 'id'> and include reasoning
const PlannedTaskSchema = z.object({
  title: z.string().describe('A concise and descriptive title for the planned task.'),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Blocked']).default('To Do').describe("The initial status of the task, typically 'To Do'."),
  assignedTo: z.string().default('AI Assistant to determine').describe('The suggested "Agent Workflow" or "Agent Team" for the task. This should be an existing project workflow name or a conceptual name for a new workflow/team (e.g., "New Feature Rollout Workflow").'),
  startDate: z.string().default(format(new Date(), 'yyyy-MM-dd')).describe("The suggested start date for the task, in YYYY-MM-DD format. Defaults to today's date."),
  durationDays: z.number().int().min(1).default(1).describe('The estimated duration of the task in days. Must be at least 1.'),
  progress: z.number().int().min(0).max(100).default(0).describe('The initial progress of the task, as a percentage from 0 to 100. Defaults to 0.'),
  isMilestone: z.boolean().default(false).describe('Whether this task should be considered a project milestone. Defaults to false.'),
  parentId: z.string().nullable().default(null).describe('The ID of a parent task, if this is a subtask. Defaults to null.'),
  dependencies: z.array(z.string()).default([]).describe('An array of task IDs that this task depends on. Defaults to an empty array.'),
});

const PlanProjectTaskOutputSchema = z.object({
  plannedTask: PlannedTaskSchema.describe('The structured task details planned by the AI.'),
  reasoning: z.string().describe('A brief explanation from the AI on how it derived the task plan, including its choice for "assignedTo" (workflow/team) and consideration of project workflows.'),
});
export type PlanProjectTaskOutput = z.infer<typeof PlanProjectTaskOutputSchema>;

export async function planProjectTask(input: PlanProjectTaskInput): Promise<PlanProjectTaskOutput> {
  return planProjectTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'planProjectTaskPrompt',
  input: { schema: PlanProjectTaskInputSchema },
  output: { schema: PlanProjectTaskOutputSchema },
  prompt: `You are an expert project management assistant specializing in agentic systems. Your role is to help plan a new task for a project based on a user's stated goal. Tasks are handled by 'Agent Workflows' or 'Agent Teams'.

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

Based on the user's goal and the project context, please generate a single, well-defined task.

Task Details to Generate:
- title: A clear, action-oriented title for the task.
- status: Set to "To Do" by default.
- assignedTo: Determine the most appropriate 'Agent Workflow' or 'Agent Team' for this task.
  - If the user's goal strongly aligns with one of the 'Available Project Workflows', assign the task directly to the **name of that existing project workflow** (e.g., "Software Development Lifecycle").
  - If the user's goal does NOT clearly align with an existing workflow, suggest a **conceptual name for a new workflow or an agent team** that would be responsible for this type of task (e.g., "New Feature Rollout Workflow", "Urgent Bugfix Team", "Marketing Content Creation Workflow").
  - **IMPORTANT: Do NOT assign this task to an individual agent type (like 'Analysis Agent' or 'Developer'). Always assign to a workflow name (existing or conceptual) or a conceptual team name.** Use "AI Assistant to determine" as a last resort if no specific workflow or team concept fits.
- startDate: Suggest a start date. Default to today's date: ${format(new Date(), 'yyyy-MM-dd')}.
- durationDays: Estimate a reasonable duration in days (minimum 1).
- progress: Default to 0.
- isMilestone: Default to false, unless the user's goal clearly indicates a major milestone.
- parentId: Default to null. Do not suggest a parent task unless explicitly requested or strongly implied.
- dependencies: Default to an empty array. Do not suggest dependencies unless explicitly requested or strongly implied.

Reasoning:
Provide a brief 'reasoning' string explaining your thought process for the generated task.
- Explain your choice for 'assignedTo'. If an existing 'Available Project Workflow' was chosen, state its name and why it's a good fit for the user's goal.
- If a new conceptual workflow or team name was suggested for 'assignedTo', explain the rationale for this new grouping and why it's suitable for the task.
- Explain any choices for duration.

Example Reasoning for existing workflow: "The user's goal to 'design a new logo' aligns with the 'Brand Asset Creation' workflow. Task assigned to 'Brand Asset Creation' to initiate this process. Estimated duration is 3 days."
Example Reasoning for conceptual workflow/team: "The user's goal to 'investigate urgent server outage' does not fit existing workflows. Task assigned to a conceptual 'Urgent Server Response Team' for immediate attention. Estimated duration is 1 day."

Ensure the 'plannedTask.startDate' is in YYYY-MM-DD format.
Ensure 'plannedTask.durationDays' is an integer and at least 1.
Ensure 'plannedTask.progress' is an integer between 0 and 100.
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
    output.plannedTask.status = output.plannedTask.status || 'To Do';
    output.plannedTask.assignedTo = output.plannedTask.assignedTo || 'AI Assistant to determine';
    output.plannedTask.startDate = output.plannedTask.startDate || format(new Date(), 'yyyy-MM-dd');
    output.plannedTask.durationDays = output.plannedTask.durationDays || 1;
    if(output.plannedTask.durationDays < 1) output.plannedTask.durationDays = 1; // Ensure min 1
    output.plannedTask.progress = output.plannedTask.progress !== undefined ? Math.min(100, Math.max(0, output.plannedTask.progress)) : 0;
    output.plannedTask.isMilestone = output.plannedTask.isMilestone || false;
    output.plannedTask.parentId = output.plannedTask.parentId === undefined ? null : output.plannedTask.parentId;
    output.plannedTask.dependencies = output.plannedTask.dependencies || [];

    return output;
  }
);

