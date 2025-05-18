'use server';
/**
 * @fileOverview An AI agent that can chat about a specific project task,
 * including responding to commands to start or get status on sub-tasks
 * based on the task's description which includes AI reasoning and suggested sub-steps.
 *
 * - taskChatFlow - A function that handles the chat interaction for a task.
 * - TaskChatInput - The input type for the taskChatFlow function.
 * - TaskChatOutput - The return type for the taskChatFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TaskChatInputSchema = z.object({
  taskId: z.string().describe('The ID of the task being discussed.'),
  taskTitle: z.string().describe('The title of the task.'),
  taskDescription: z.string().optional().describe('The full description of the task, which may include AI reasoning and a list of suggested sub-tasks. Each sub-task might have a title, assignedAgentType, and description. This is the primary context for understanding the task plan.'),
  taskStatus: z.string().describe('The current status of the task (e.g., To Do, In Progress).'),
  userMessage: z.string().describe("The user's message or query about the task."),
});
export type TaskChatInput = z.infer<typeof TaskChatInputSchema>;

const TaskChatOutputSchema = z.object({
  agentResponse: z.string().describe("The AI agent's response to the user's message."),
});
export type TaskChatOutput = z.infer<typeof TaskChatOutputSchema>;

export async function taskChatFlow(input: TaskChatInput): Promise<TaskChatOutput> {
  return performTaskChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'taskChatPrompt',
  input: { schema: TaskChatInputSchema },
  output: { schema: TaskChatOutputSchema },
  prompt: `You are a helpful and concise AI project assistant assigned to manage and discuss a specific task.
The user is interacting with you about this task.

Task Details:
- ID: {{{taskId}}}
- Title: "{{{taskTitle}}}"
- Current Status: "{{{taskStatus}}}"
- Full Plan (this includes AI Reasoning and a list of 'Suggested Sub-Tasks / Steps by AI Agents'):
{{{taskDescription}}}

User's Message:
"{{{userMessage}}}"

Your Responsibilities:
1.  Understand the User's Message: Determine if the user is asking for status, giving an instruction (like "start", "proceed", "create the document"), or asking a general question.
2.  Refer to Sub-Tasks/Steps: The 'Full Plan' (taskDescription) contains 'Suggested Sub-Tasks / Steps by AI Agents'. Use these to inform your response. The sub-tasks usually have a title, assignedAgentType, and description.
3.  Simulate Action and Respond Concisely:
    *   If the user says "start", "begin", "proceed", or similar for the overall task:
        *   Acknowledge the command.
        *   Identify the *first* sub-task listed in the 'Full Plan'.
        *   Respond by stating you are initiating that first sub-task. For example: "Okay, I'm starting with the first step: '[Sub-Task Title]' using the [Agent Type]. I'll keep you posted."
        *   If the first sub-task clearly involves document creation (e.g., its title or description includes "Draft SDP Document", "Create report"), your response should reflect this, e.g., "Alright, I'm starting to draft the '[Sub-Task Title]'. It will be (simulated) made available in the project repository."
        *   If no sub-tasks are listed in the 'Full Plan', respond with: "Okay, I'm starting work on the main task: '{{{taskTitle}}}'."
    *   If the user asks for "status", "update", "what's next?", or similar:
        *   If sub-tasks are listed, you can say something like: "We are currently focused on sub-task: '[First Sub-task Title]' for the task '{{{taskTitle}}}'. Things are progressing as planned." (For this simulation, always refer to the first sub-task generally, or provide a general update on the main task).
        *   If no sub-tasks are listed, provide a general update: "I am currently working on '{{{taskTitle}}}'. Progress is being made according to plan."
    *   If the user asks a general question about the task, answer it concisely based on the 'Task Details' and the 'Full Plan'.
    *   If the user's message specifically refers to a sub-task that involves creating a document (e.g., "start drafting the SDP document" when "Draft SDP Document" is a sub-task), confirm that you are initiating that action: "Understood. I am now (simulating) drafting the 'SDP Document'. It will be notionally saved to the project repository."
4.  Be Professional and to the Point: Keep your responses focused, helpful, and not overly conversational. Avoid filler.

Your response should ONLY be the agent's reply text. Do not add any other commentary.
`,
});

const performTaskChatFlow = ai.defineFlow(
  {
    name: 'performTaskChatFlow',
    inputSchema: TaskChatInputSchema,
    outputSchema: TaskChatOutputSchema,
  },
  async (input) => {
    // Log the input for debugging
    console.log("TASK_CHAT_FLOW: Received input:", JSON.stringify(input, null, 2));

    const {output} = await prompt(input);
    if (!output || !output.agentResponse) {
      console.error("TASK_CHAT_FLOW: AI output was null or agentResponse was missing. Input:", input);
      return { agentResponse: "I'm sorry, I wasn't able to generate a response for that. Could you try rephrasing?" };
    }
    
    console.log("TASK_CHAT_FLOW: Generated agentResponse:", output.agentResponse);
    return output;
  }
);
