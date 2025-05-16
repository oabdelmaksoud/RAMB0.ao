
'use server';
/**
 * @fileOverview An AI agent that can chat about a specific project task.
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
  taskDescription: z.string().optional().describe('The description of the task.'),
  taskStatus: z.string().describe('The current status of the task (e.g., To Do, In Progress).'),
  userMessage: z.string().describe("The user's message or query about the task."),
  // chatHistory: z.array(z.object({ sender: z.enum(['user', 'agent']), text: z.string() })).optional().describe("Previous messages in the conversation, for context."), // Future enhancement
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
  prompt: `You are a helpful and concise AI assistant assigned to a project management team. You are currently discussing a specific task.

Task Details:
- ID: {{{taskId}}}
- Title: "{{{taskTitle}}}"
- Description: {{{taskDescription}}}
- Current Status: "{{{taskStatus}}}"

The user has sent the following message:
"{{{userMessage}}}"

Please provide a helpful and contextually relevant response regarding this task. Be professional and focused on project execution. If the user asks for an action, confirm you've understood or ask for clarification if needed.
Example: If status is 'In Progress' and user asks for update, mention you're working on it and provide a brief simulated update.
Example: If status is 'To Do' and user asks to start, confirm you'll mark it as 'In Progress' (simulated).
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
    const { output } = await prompt(input);
    if (!output) {
      return { agentResponse: "I'm sorry, I wasn't able to generate a response for that. Could you try rephrasing?" };
    }
    return output;
  }
);
