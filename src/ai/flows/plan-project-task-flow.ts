
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

// Zod schema for WorkflowNode, ensuring it's available for PlanProjectTaskInputSchema
const WorkflowNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  // other fields like x, y, config can be added if needed by the AI
});
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;


const WorkflowInfoSchema = z.object({
  name: z.string().describe('The name of an existing project workflow.'),
  description: z.string().describe('The description of the project workflow.'),
});

const SelectedWorkflowDetailSchema = z.object({
  name: z.string().describe('The name of the user-selected project workflow.'),
  description: z.string().describe('The description of the selected project workflow.'),
  nodes: z.array(WorkflowNodeSchema).optional().describe('The list of agent nodes in the selected workflow, defining its structure and agent types.'),
  // edges could be added here if the AI needs to understand connections explicitly
});

const PlanProjectTaskInputSchema = z.object({
  userGoal: z.string().describe("The user's natural language description of the task or goal to be achieved."),
  projectId: z.string().describe('The ID of the project for which the task is being planned.'),
  projectWorkflows: z.array(WorkflowInfoSchema).describe('A list of ALL existing workflows in the project, providing general context on established processes.'),
  selectedWorkflowDetail: SelectedWorkflowDetailSchema.optional().describe("Details of a specific project workflow explicitly selected by the user to guide the task planning. If provided, the AI should try to align its plan with this workflow's structure."),
});
export type PlanProjectTaskInput = z.infer<typeof PlanProjectTaskInputSchema>;

const SuggestedSubTaskSchema = z.object({
  title: z.string().describe("A concise title for this sub-task or step."),
  assignedAgentType: z.string().describe("The type of AI agent best suited to perform this sub-task (e.g., 'Analysis Agent', 'Code Generation Agent', 'Documentation Agent', 'Testing Agent')."),
  description: z.string().describe("A brief description (1-2 sentences) explaining the purpose or key activities of this sub-task.")
});

const PlannedTaskSchema = z.object({
  title: z.string().describe('A concise and descriptive title for the planned task.'),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Blocked']).default('To Do').describe("The initial status of the task, typically 'To Do'."),
  assignedTo: z.string().default('AI Assistant to determine').describe('The suggested "Agent Workflow" or "Agent Team" for the task. If a specific workflow was selected by the user and provided in `selectedWorkflowDetail`, this should be its name. Otherwise, it should be an existing project workflow name or a conceptual name for a new workflow/team (e.g., "New Feature Rollout Workflow").'),
  startDate: z.string().default(format(new Date(), 'yyyy-MM-dd')).describe("The suggested start date for the task, in YYYY-MM-DD format. Defaults to today's date."),
  durationDays: z.number().int().min(1).default(1).describe('The estimated duration of the task in days, assuming AI agents are performing the work. Must be at least 1.'),
  progress: z.number().int().min(0).max(100).default(0).describe('The initial progress of the task, as a percentage from 0 to 100. Defaults to 0.'),
  isMilestone: z.boolean().default(false).describe('Whether this task should be considered a project milestone. Defaults to false.'),
  parentId: z.string().nullable().default(null).describe('The ID of a parent task, if this is a subtask. Defaults to null.'),
  dependencies: z.array(z.string()).default([]).describe('An array of task IDs that this task depends on. Defaults to an empty array.'),
  suggestedSubTasks: z.array(SuggestedSubTaskSchema).optional().describe("A list of suggested sub-tasks or steps AI agents would perform to complete the main task. If `selectedWorkflowDetail` with nodes was provided, these sub-tasks should try to align with the agent types and sequence of those nodes.")
});

const PlanProjectTaskOutputSchema = z.object({
  plannedTask: PlannedTaskSchema.describe('The structured task details planned by the AI.'),
  reasoning: z.string().describe('A detailed explanation from the AI on how it derived the task plan. This should include its choice for "assignedTo" (workflow/team), consideration of project workflows (especially if `selectedWorkflowDetail` was provided and how its structure was used), estimation of duration based on AI agent execution, and any assumptions made.'),
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

{{#if selectedWorkflowDetail}}
User has indicated this task should align with the following specific workflow:
Selected Workflow Name: "{{selectedWorkflowDetail.name}}"
Selected Workflow Description: {{selectedWorkflowDetail.description}}
{{#if selectedWorkflowDetail.nodes.length}}
Selected Workflow Agent Node Structure (Available Agent Types for sub-tasks):
{{#each selectedWorkflowDetail.nodes}}
- Node Name: "{{name}}", Agent Type: "{{type}}"
{{/each}}
Your plan should primarily be assigned to "{{selectedWorkflowDetail.name}}".
The ` + "`suggestedSubTasks`" + ` MUST primarily use Agent Types from the 'Selected Workflow Agent Node Structure' listed above. Map each sub-task to the most relevant node's agent type from the selected workflow. Their sequence should be logical and reflect the steps in the selected workflow if possible. If a direct mapping is not possible for a sub-task, you may use a general agent type like 'Analysis Agent' or 'Documentation Agent' but clearly state this choice in the reasoning.
{{else}}
- The selected workflow does not have a detailed node structure provided. Base your sub-task agent types and plan on its name and description.
{{/if}}
{{else}}
General Available Project Workflows (These are existing, defined processes for the project; use for general context if no specific workflow was selected by the user):
{{#if projectWorkflows.length}}
{{#each projectWorkflows}}
- Workflow Name: "{{name}}"
  Description: {{description}}
{{/each}}
{{else}}
- No general project workflows provided for broader context.
{{/if}}
{{/if}}

User's Goal:
"{{{userGoal}}}"

Based on the user's goal and the provided project/workflow context, please generate a single, well-defined main task.

Main Task Details to Generate (plannedTask object):
- title: A clear, action-oriented title for the task.
- status: Set to "To Do" by default.
- assignedTo:
  {{#if selectedWorkflowDetail}}
  - **Set this to "{{selectedWorkflowDetail.name}}"** as per the user's selection.
  {{else}}
  - Determine the most appropriate 'Agent Workflow' or 'Agent Team' for this task based on the user's goal and general project workflows.
  - If the user's goal strongly aligns with one of the 'Available Project Workflows' (general list), assign the task directly to the **name of that existing project workflow**.
  - If the user's goal does NOT clearly align with an existing workflow, suggest a **conceptual name for a new workflow or an agent team** (e.g., "Urgent Bugfix Team").
  - **IMPORTANT: Do NOT assign this task to an individual agent type (like 'Analysis Agent'). Always assign to a workflow name (existing or conceptual) or a conceptual team name.** Use "AI Assistant to determine" as a last resort if no specific workflow or team concept fits.
  {{/if}}
- startDate: Suggest a start date. Default to today's date: ${format(new Date(), 'yyyy-MM-dd')}.
- durationDays: **CRITICAL: Estimate a reasonable duration in days assuming AI AGENTS are performing ALL the work. This is NOT an estimate for human engineers.** Tasks that might take humans days or weeks could be completed by AI agents in a few hours or a single day. Examples include code generation, data analysis, report drafting, initial design mockups. Be aggressive with short durations if AI can automate the core work. The minimum duration is 1 day.
- progress: Default to 0.
- isMilestone: Default to false.
- parentId: Default to null.
- dependencies: Default to an empty array.
- suggestedSubTasks: Break the main task down into a list of actionable sub-tasks or steps that AI agents would perform.
    - title: A concise title for the sub-task.
    - assignedAgentType:
      {{#if selectedWorkflowDetail.nodes.length}}
      - **Choose an Agent Type exclusively from the 'Selected Workflow Agent Node Structure'** listed above that best fits this sub-task.
      {{else}}
      - The type of AI agent best suited to perform this sub-task (e.g., 'Analysis Agent', 'Code Generation Agent', 'Documentation Agent', 'Deployment Agent').
      {{/if}}
    - description: A brief (1-2 sentences) description explaining the purpose or key activities of this sub-task.

Reasoning (reasoning string):
Provide a **concise yet detailed (2-5 sentences max) explanation** of your thought process for the ` + "`plannedTask`" + ` object. Focus on these key points:
1.  Explain your choice for 'assignedTo'.
    {{#if selectedWorkflowDetail}}
    - **Specifically explain how the user's goal was mapped to the '{{selectedWorkflowDetail.name}}' workflow AND how its nodes (if provided) influenced the ` + "`suggestedSubTasks`" + ` (agent types and sequence).**
    {{else}}
    - If an existing 'Available Project Workflow' was chosen, state its name and why it's a good fit.
    - If a new conceptual workflow/team name was suggested, explain the rationale for the name and its suitability for the user's goal.
    {{/if}}
2.  Explain your 'durationDays' estimate, **explicitly stating it's based on AI AGENT execution speed/capabilities.**
3.  If you generated 'suggestedSubTasks':
    {{#if selectedWorkflowDetail.nodes.length}}
    - Briefly confirm how the sub-tasks and their assigned agent types align with the specific nodes of the '{{selectedWorkflowDetail.name}}' workflow.
    {{else}}
    - Briefly explain why this sub-task breakdown is appropriate for AI agent execution if no specific workflow was selected.
    {{/if}}
Keep the reasoning focused and avoid generic statements.

Ensure 'plannedTask.startDate' is in YYYY-MM-DD format.
Ensure 'plannedTask.durationDays' is an integer >= 1.
Ensure 'plannedTask.progress' is an integer 0-100.
Each suggestedSubTask must have 'title', 'assignedAgentType', and 'description'.
Do not add any comments or extraneous text outside the main JSON structure.
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
    if (!output || !output.plannedTask) { // Added check for output.plannedTask
      console.error("AI output was null or plannedTask was missing. Input:", input);
      throw new Error('AI failed to generate a valid task plan. The plannedTask field was missing.');
    }

    // Ensure defaults are applied if AI misses them, especially for plannedTask
    const plannedTask = output.plannedTask; // No longer need || {} due to check above

    plannedTask.status = plannedTask.status || 'To Do';
    
    if (!plannedTask.assignedTo) {
        if (input.selectedWorkflowDetail && input.selectedWorkflowDetail.name) {
            plannedTask.assignedTo = input.selectedWorkflowDetail.name;
        } else {
            plannedTask.assignedTo = 'AI Assistant to determine';
        }
    }
    
    plannedTask.startDate = plannedTask.startDate || format(new Date(), 'yyyy-MM-dd');
    
    // Ensure durationDays is at least 1, unless it's a milestone (where it should be 0)
    if (plannedTask.isMilestone) {
        plannedTask.durationDays = 0;
    } else {
        plannedTask.durationDays = (plannedTask.durationDays === undefined || plannedTask.durationDays < 1) ? 1 : Math.max(1, plannedTask.durationDays);
    }

    // Ensure progress is valid and 100 if milestone and done, 0 if milestone and not done
    if (plannedTask.isMilestone) {
        plannedTask.progress = plannedTask.status === 'Done' ? 100 : 0;
    } else {
        plannedTask.progress = plannedTask.progress !== undefined ? Math.min(100, Math.max(0, plannedTask.progress)) : 0;
    }
    
    plannedTask.isMilestone = plannedTask.isMilestone === undefined ? false : plannedTask.isMilestone;
    
    // Handle potential "null" string for parentId
    if (plannedTask.parentId === "null" || plannedTask.parentId === "") {
        plannedTask.parentId = null;
    } else {
        plannedTask.parentId = plannedTask.parentId || null;
    }
    
    plannedTask.dependencies = plannedTask.dependencies || [];
    plannedTask.suggestedSubTasks = plannedTask.suggestedSubTasks || [];
    
    // Ensure each subtask has required fields
    plannedTask.suggestedSubTasks = plannedTask.suggestedSubTasks.map(st => ({
        title: st.title || "Untitled Sub-task",
        assignedAgentType: st.assignedAgentType || "General Agent",
        description: st.description || "No description provided."
    }));

    // Reassign the potentially modified plannedTask back to the output object
    output.plannedTask = plannedTask; 

    // Basic check for reasoning (AI sometimes returns very short or empty strings)
    if (!output.reasoning || output.reasoning.trim().length < 10) {
        output.reasoning = "AI reasoning was not sufficiently detailed. Please review the planned task carefully.";
    }

    return output;
  }
);

