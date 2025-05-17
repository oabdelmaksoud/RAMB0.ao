'use server';
/**
 * @fileOverview An AI agent that can chat about a specific project task,
 * including responding to commands to start or get status on sub-tasks.
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
  taskDescription: z.string().optional().describe('The description of the task, which may include AI reasoning and a list of suggested sub-tasks. Each sub-task might have a title, assignedAgentType, and description.'),
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
- Full Plan (including AI Reasoning and Suggested Sub-Tasks/Steps by AI Agents):
{{{taskDescription}}}

User's Message:
"{{{userMessage}}}"

Your Responsibilities:
1.  Understand the User's Message: Determine if the user is asking for status, giving an instruction (like "start", "proceed"), or asking a general question.
2.  Refer to Sub-Tasks: If the 'Full Plan' above contains 'Suggested Sub-Tasks / Steps', use these to inform your response.
3.  Simulate Action:
    *   If the user says "start", "begin", "proceed", or similar:
        *   Acknowledge the command.
        *   Identify the *first* sub-task listed in the 'Full Plan' (if available).
        *   Respond by stating you are initiating that first sub-task. For example: "Okay, I'm starting with the first step: '[Sub-Task Title]' using the [Agent Type]. I'll keep you posted."
        *   If a sub-task involves document creation (e.g., "Draft SDP Document"), your response should reflect this, e.g., "Alright, I'm starting to draft the 'SDP Document'. It will be (simulated) made available in the project repository."
        *   If no sub-tasks are listed, respond with: "Okay, I'm starting work on '[Main Task Title]'."
    *   If the user asks for "status", "update", "what's next?", or similar:
        *   If sub-tasks are listed, you can say something like: "Currently processing sub-task: '[First Sub-task Title]'. Things are looking good." or "We are focusing on completing '[First Sub-task Title]' for the task '{{{taskTitle}}}'." (For this simulation, always refer to the first sub-task or provide a general update).
        *   If no sub-tasks, provide a general update: "I am currently working on '{{{taskTitle}}}'. Progress is being made."
    *   If the user asks a general question about the task, answer it based on the 'Task Details' and 'Full Plan'.
4.  Be Concise and Professional: Keep your responses focused and helpful. Avoid unnecessary chatter.

Your response should be just the agent's reply text.
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

    const { output } = await prompt(input);
    if (!output || !output.agentResponse) {
      console.error("TASK_CHAT_FLOW: AI output was null or agentResponse was missing. Input:", input);
      return { agentResponse: "I'm sorry, I wasn't able to generate a response for that. Could you try rephrasing?" };
    }
    
    console.log("TASK_CHAT_FLOW: Generated agentResponse:", output.agentResponse);
    return output;
  }
);

