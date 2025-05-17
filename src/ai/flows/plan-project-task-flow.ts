
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
  assignedTo: z.string().default('AI Assistant to determine').describe('The suggested assignee for the task. Can be a specific role, team, or a placeholder like "AI Assistant to determine".'),
  startDate: z.string().default(format(new Date(), 'yyyy-MM-dd')).describe("The suggested start date for the task, in YYYY-MM-DD format. Defaults to today's date."),
  durationDays: z.number().int().min(1).default(1).describe('The estimated duration of the task in days. Must be at least 1.'),
  progress: z.number().int().min(0).max(100).default(0).describe('The initial progress of the task, as a percentage from 0 to 100. Defaults to 0.'),
  isMilestone: z.boolean().default(false).describe('Whether this task should be considered a project milestone. Defaults to false.'),
  parentId: z.string().nullable().default(null).describe('The ID of a parent task, if this is a subtask. Defaults to null.'),
  dependencies: z.array(z.string()).default([]).describe('An array of task IDs that this task depends on. Defaults to an empty array.'),
});

const PlanProjectTaskOutputSchema = z.object({
  plannedTask: PlannedTaskSchema.describe('The structured task details planned by the AI.'),
  reasoning: z.string().describe('A brief explanation from the AI on how it derived the task plan, including any consideration of project workflows.'),
});
export type PlanProjectTaskOutput = z.infer<typeof PlanProjectTaskOutputSchema>;

export async function planProjectTask(input: PlanProjectTaskInput): Promise<PlanProjectTaskOutput> {
  return planProjectTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'planProjectTaskPrompt',
  input: { schema: PlanProjectTaskInputSchema },
  output: { schema: PlanProjectTaskOutputSchema },
  prompt: `You are an expert project management assistant. Your role is to help plan a new task for a project based on a user's stated goal.

Project Context:
Project ID: {{{projectId}}}

Available Project Workflows (for context on typical processes, do not assume the user wants to use them unless their goal implies it):
{{#if projectWorkflows.length}}
{{#each projectWorkflows}}
- Workflow Name: {{name}}
  Description: {{description}}
{{/each}}
{{else}}
- No specific project workflows provided.
{{/if}}

User's Goal:
"{{{userGoal}}}"

Based on the user's goal and the project context (especially considering if the goal aligns with any existing workflows), please generate a single, well-defined task.

Your output must be a JSON object adhering to the specified schema.

Task Details to Generate:
- title: A clear, action-oriented title for the task.
- status: Set to "To Do" by default.
- assignedTo: Suggest a sensible assignee. This could be a role (e.g., "Developer," "QA Tester"), a team (e.g., "Frontend Team"), or a general placeholder like "Project Lead to assign" or "AI Assistant to determine." Avoid assigning to specific individuals unless the user's goal explicitly mentions it.
- startDate: Suggest a start date. Default to today's date: ${format(new Date(), 'yyyy-MM-dd')}.
- durationDays: Estimate a reasonable duration in days (minimum 1).
- progress: Default to 0.
- isMilestone: Default to false, unless the user's goal clearly indicates a major milestone.
- parentId: Default to null. Do not suggest a parent task unless explicitly requested or strongly implied.
- dependencies: Default to an empty array. Do not suggest dependencies unless explicitly requested or strongly implied.

Reasoning:
Provide a brief 'reasoning' string explaining your thought process for the generated task. If one or more of the provided 'Available Project Workflows' significantly influenced your plan (e.g., by suggesting a task type, assignee, or a sequence of actions that aligns with a workflow step), explicitly mention the name(s) of the influential workflow(s) in your reasoning. Also explain any choices for assignee or duration.

Example Reasoning: "The user's goal to 'design a new logo' aligns with the 'Brand Asset Creation' workflow, suggesting an initial design task. Task assigned to 'Graphic Designer' with an estimated duration of 3 days." (Adjust based on actual workflows and goal).

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

