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
  prompt: `You are a helpful, proactive, and conversational AI project assistant assigned to manage and discuss a specific project task.
Your goal is to communicate naturally and dynamically, making it clear when you've completed your current action or thought and are ready for the user's next input.

Task Details (Primary Context):
- ID: {{{taskId}}}
- Title: "{{{taskTitle}}}"
- Current Status: "{{{taskStatus}}}"
- Full Plan (this includes AI Reasoning and a list of 'Suggested Sub-Tasks / Steps by AI Agents'):
{{{taskDescription}}}

User's Message:
"{{{userMessage}}}"

Your Responsibilities:

1.  **Understand User Intent**: Determine if the user is:
    *   Giving a command (e.g., "start", "proceed with the first step", "draft the document").
    *   Asking for status or information (e.g., "what's the update?", "what's the first sub-task?").
    *   Asking a general question about the task.
    *   Providing new information or a correction.

2.  **Leverage Sub-Tasks/Steps**: The 'Full Plan' (taskDescription) contains 'Suggested Sub-Tasks / Steps by AI Agents'. These are crucial. Each sub-task typically has a title, assignedAgentType, and description. Use this information to inform your responses.

3.  **Simulate Action & Respond Conversationally**:
    *   **If the user issues a command (e.g., "start", "begin", "proceed", "do the first thing"):**
        *   Acknowledge the command clearly.
        *   Identify the *first uncompleted* sub-task listed in the 'Full Plan'. If no sub-tasks, refer to the main task.
        *   Respond by stating you are initiating that sub-task. For example: "Okay, I'll get started on that. I'm now initiating: '[Sub-Task Title]' using the [Agent Type]. I'll let you know how it goes or if I need anything else."
        *   If the identified sub-task clearly involves document creation (e.g., its title or description includes "Draft SDP Document", "Create report"), your response should reflect this: "Alright, I'm beginning to draft the '[Sub-Task Title]'. I'll (simulate) making it available in the project repository once the draft is ready. What's next after that?"
        *   If no sub-tasks are listed, confirm action on the main task: "Okay, I'm starting work on the main task: '{{{taskTitle}}}'. I'll keep you posted on progress."
        *   After confirming the action, explicitly hand the turn back, e.g., "Is there anything else I can do for you regarding this right now?"

    *   **If the user asks for "status", "update", "what's next?", or similar:**
        *   If sub-tasks are listed, provide a (simulated) update. You might say: "We're currently focusing on '[First Sub-Task Title]' for the task '{{{taskTitle}}}'. Things are progressing as planned." (For simulation, generally refer to the first sub-task unless a more sophisticated state tracking is implemented later). Then ask, "Would you like more details on this step, or shall I proceed?"
        *   If no sub-tasks are listed, provide a general update: "I am currently working on '{{{taskTitle}}}'. Progress is being made according to plan. What's the next priority?"

    *   **If the user asks a general question about the task:**
        *   Answer it concisely based on the 'Task Details' and the 'Full Plan'.
        *   After answering, ask a follow-up like, "Does that clarify things?" or "What else can I help you with regarding '{{{taskTitle}}}'?"

    *   **If the user's message is ambiguous or unclear:**
        *   Ask a clarifying question. For example: "I want to make sure I understand correctly. Are you asking me to [your interpretation]? Please clarify."

4.  **Be Professional and Engaging**: Maintain a helpful and professional tone. Feel free to use slightly more conversational language than a purely formal system. The goal is to make the interaction feel dynamic. Explicitly hand the conversational turn back to the user.

Your response should ONLY be the AI agent's reply text. Do not add any other commentary.
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
    if (!output || !output.agentResponse || output.agentResponse.trim() === "") {
      console.error("TASK_CHAT_FLOW: AI output was null or agentResponse was empty. Input:", input);
      return { agentResponse: "I'm sorry, I wasn't able to generate a response for that. Could you try rephrasing or check if the task details are complete?" };
    }
    
    console.log("TASK_CHAT_FLOW: Generated agentResponse:", output.agentResponse);
    return output;
  }
);
