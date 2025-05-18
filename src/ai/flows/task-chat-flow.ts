'use server';
/**
 * @fileOverview An AI agent that can chat about a specific project task,
 * including responding to commands to start or get status on sub-tasks
 * based on the task's description which includes AI reasoning and suggested sub-steps.
 * It will also simulate actions like file interaction.
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
  taskDescription: z.string().optional().describe('The full description of the task, which may include AI reasoning and a list of suggested sub-tasks. This is the primary context for understanding the task plan.'),
  taskStatus: z.string().describe('The current status of the task (e.g., To Do, In Progress).'),
  userMessage: z.string().describe("The user's message or query about the task."),
  // projectFiles: z.array(z.object({ name: z.string(), type: z.enum(['file', 'folder']), path: z.string() })).optional().describe('List of project files and folders for context if the AI needs to "interact" with them.'),
});
export type TaskChatInput = z.infer<typeof TaskChatInputSchema>;

const TaskChatOutputSchema = z.object({
  agentResponse: z.string().describe("The AI agent's conversational reply to the user."),
  simulatedAction: z.string().optional().describe("A brief description of a simulated action the AI is performing, e.g., 'Opening file: main.py', 'Thinking about next steps...', 'Drafting content for requirements.doc'."),
  fileContextUpdate: z.object({
    fileName: z.string().describe("Name of the file being interacted with."),
    content: z.string().describe("Simulated content of the file (for creation/editing).")
  }).optional().describe("Simulated content of a file being 'viewed' or 'edited' by the AI."),
  thinkingProcess: z.string().optional().describe("A brief (1-2 sentences) description of the AI's current thought process or plan for the next step, if different from simulatedAction.")
});
export type TaskChatOutput = z.infer<typeof TaskChatOutputSchema>;

export async function taskChatFlow(input: TaskChatInput): Promise<TaskChatOutput> {
  return performTaskChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'taskChatPrompt',
  input: { schema: TaskChatInputSchema },
  output: { schema: TaskChatOutputSchema },
  prompt: `You are a helpful, proactive, and conversational AI project assistant managing a specific task.
Your goal is to communicate naturally, simulate taking actions, and provide informative responses.

Task Details (Primary Context):
- ID: {{{taskId}}}
- Title: "{{{taskTitle}}}"
- Current Status: "{{{taskStatus}}}"
- Full Plan (this includes AI Reasoning and a list of 'Suggested Sub-Tasks / Steps by AI Agents'):
{{{taskDescription}}}

User's Message:
"{{{userMessage}}}"

Your Responsibilities & Output Structure:

1.  agentResponse (Required, String): Your main conversational reply to the user. Be helpful and engaging. Clearly hand the conversational turn back to the user (e.g., "What's next?", "Does that help?").

2.  simulatedAction (Optional, String): If your response involves a simulated action (planning, starting a sub-task, "looking up" a file), describe this action briefly here. Examples: "Planning next steps.", "Initiating sub-task: 'Draft initial document'.", "Accessing file: 'requirements.md'."

3.  fileContextUpdate (Optional, Object { fileName: String, content: String }):
    *   If the user asks to see a file mentioned in the task description or if your simulated action involves creating/editing a file (e.g., "draft the SDP", "show me the requirements spec"), populate this.
    *   fileName: The name of the (simulated) file.
    *   content: Some plausible (but SCRIPTED/MOCK) content for that file. For example, if asked to create 'sdp_document.md', content could be "# SDP Document\\n\\n## 1. Introduction\\n\\nThis is a placeholder for the SDP content..."
    *   If you provide fileContextUpdate, your agentResponse should also mention that you're showing/creating the file content.

4.  thinkingProcess (Optional, String): A very brief (1-2 sentences) internal thought or plan if it's not covered by simulatedAction.

Detailed Interaction Logic:

*   If the user issues a command (e.g., "start", "begin", "proceed", "do the first thing"):
    *   agentResponse: Acknowledge the command. Identify the *first uncompleted* sub-task from the 'Full Plan' (if sub-tasks exist). State you are initiating it. Example: "Okay, I'll get started on that. I'm now initiating: '[Sub-Task Title]' using the [Agent Type]. I'll let you know how it goes. What's next?"
    *   simulatedAction: "Initiating sub-task: '[Sub-Task Title]'."
    *   If the sub-task clearly involves document creation (e.g., "Draft SDP Document"):
        *   agentResponse: "Alright, I'm beginning to draft the '[Sub-Task Title]'. I'll generate some initial content. You'll see it update in the (simulated) file view. What's next?"
        *   simulatedAction: "Drafting document: '[Sub-Task Title]'."
        *   fileContextUpdate: { fileName: "[Sub-Task Title].md (Draft)", content: "This is a simulated draft for [Sub-Task Title]..." }

*   If the user asks for "status", "update", "what's next?":
    *   agentResponse: Provide a (simulated) update, referring to the first sub-task or the main task if no sub-tasks. Example: "We're currently focusing on '[First Sub-Task Title]' for '{{{taskTitle}}}'. Progress is steady. Would you like to discuss this step or move to the next?"
    *   simulatedAction: "Providing status update for task: {{{taskTitle}}}."

*   If the user asks to see/edit/create a specific file (e.g., "show requirements.txt", "draft the API spec"):
    *   agentResponse: "Okay, I'm (simulating) opening/creating '{{user_specified_filename_or_default}}'. Here's the content:"
    *   simulatedAction: "Accessing file: '{{user_specified_filename_or_default}}'."
    *   fileContextUpdate: { fileName: "{{user_specified_filename_or_default}}", content: "Simulated content for {{user_specified_filename_or_default}}:\\n- Point 1\\n- Point 2\\n..." }
    *   Adapt based on whether the file is mentioned in the task description or is a new request.

*   If the user asks a general question about the task:
    *   agentResponse: Answer concisely using 'Task Details' and 'Full Plan'. Then ask a follow-up like, "Does that help?"
    *   simulatedAction: "Answering question about: {{{taskTitle}}}."

*   If the user's message is ambiguous:
    *   agentResponse: Ask a clarifying question. "I'm not quite sure what you mean. Could you please rephrase or tell me more about [topic]?"
    *   simulatedAction: "Requesting clarification."

Always aim for a natural, turn-based conversation.
Output ONLY the JSON object matching the TaskChatOutputSchema.
`,
});

const performTaskChatFlow = ai.defineFlow(
  {
    name: 'performTaskChatFlow',
    inputSchema: TaskChatInputSchema,
    outputSchema: TaskChatOutputSchema,
  },
  async (input) => {
    console.log("TASK_CHAT_FLOW: Received input:", JSON.stringify(input, null, 2));

    const { output } = await prompt(input);

    if (!output || !output.agentResponse || output.agentResponse.trim() === "") {
      console.error("TASK_CHAT_FLOW: AI output was null or agentResponse was empty. Input:", input);
      return {
        agentResponse: "I'm sorry, I wasn't able to generate a response for that. Could you try rephrasing or check if the task details are complete?",
      };
    }
    
    // Ensure simulatedAction is at least an empty string if undefined, to avoid issues if UI expects it.
    output.simulatedAction = output.simulatedAction || undefined;
    output.thinkingProcess = output.thinkingProcess || undefined;
    // fileContextUpdate can remain optional

    console.log("TASK_CHAT_FLOW: Generated AI Output:", JSON.stringify(output, null, 2));
    return output;
  }
);
