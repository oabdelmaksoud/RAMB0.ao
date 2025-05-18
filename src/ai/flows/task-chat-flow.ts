
'use server';
/**
 * @fileOverview An AI agent that can chat about a specific project task,
 * including responding to commands to start or get status on sub-tasks
 * based on the task's description which includes AI reasoning and suggested sub-steps.
 * It will also simulate actions like file interaction, code generation, and suggest task status changes.
 *
 * - taskChatFlow - A function that handles the chat interaction for a task.
 * - TaskChatInput - The input type for the taskChatFlow function.
 * - TaskChatOutput - The return type for the taskChatFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Task } from '@/types'; // Import Task type for status enum

// Use the TaskStatus enum from types
const TaskStatusSchema = z.enum(['To Do', 'In Progress', 'Done', 'Blocked']);

const TaskChatInputSchema = z.object({
  taskId: z.string().describe('The ID of the task being discussed.'),
  taskTitle: z.string().describe('The title of the task.'),
  taskDescription: z.string().optional().describe('The full description of the task, which may include AI reasoning and a list of suggested sub-tasks/steps by AI agents. This is the primary context for understanding the task plan.'),
  taskStatus: z.string().describe('The current status of the task (e.g., To Do, In Progress).'),
  userMessage: z.string().describe("The user's message or query about the task."),
});
export type TaskChatInput = z.infer<typeof TaskChatInputSchema>;

const TaskChatOutputSchema = z.object({
  agentResponse: z.string().describe("The AI agent's conversational reply to the user."),
  simulatedAction: z.string().optional().describe("A brief description of a simulated action the AI is performing, e.g., 'Opening file: main.py', 'Generating code snippet...', 'Drafting content for requirements.doc'."),
  fileContextUpdate: z.object({
    fileName: z.string().describe("Name of the file being interacted with or generated."),
    content: z.string().describe("Simulated content or generated code snippet.")
  }).optional().describe("Simulated content of a file being 'viewed', 'edited', or 'generated' by the AI."),
  thinkingProcess: z.string().optional().describe("A brief (1-2 sentences) description of the AI's current thought process or plan for the next step, if different from simulatedAction."),
  suggestedNextStatus: TaskStatusSchema.optional().describe("If the conversation indicates a task status change (e.g., user says 'all done' or 'start this'), suggest the new status for the main task."),
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
Your goal is to communicate naturally, simulate taking actions, provide informative responses, and suggest task status updates when appropriate.

Task Details (Primary Context):
- ID: {{{taskId}}}
- Title: "{{{taskTitle}}}"
- Current Status: "{{{taskStatus}}}"
- Full Plan (this includes AI Reasoning and a list of 'Suggested Sub-Tasks / Steps by AI Agents'):
{{{taskDescription}}}

User's Message:
"{{{userMessage}}}"

Your Responsibilities & Output Structure:

1.  agentResponse (Required, String): Your main conversational reply to the user. Be helpful and engaging. Clearly hand the conversational turn back to the user (e.g., "What's next?", "Does that help?", "How should I proceed?").

2.  simulatedAction (Optional, String): If your response involves a simulated action (planning, starting a sub-task, "looking up" a file, "generating code"), describe this action briefly here. Examples: "Planning next steps.", "Initiating sub-task: 'Draft initial document'.", "Accessing file: 'requirements.md'.", "Generating Python function..."

3.  fileContextUpdate (Optional, Object { fileName: String, content: String }):
    *   If the user asks to see a file mentioned in the task description OR if your simulated action involves creating/editing/generating a file (e.g., "draft the SDP", "show me the requirements spec", "generate a Python script for X"):
        *   fileName: The name of the (simulated) file (e.g., 'requirements.txt', 'sdp_draft.md', 'generated_script.py').
        *   content: Some plausible (but SCRIPTED/MOCK) content for that file. If generating code, provide the code snippet as the content. Example for code: "def example_function():\\n  print('Hello from AI!')"
    *   If you provide fileContextUpdate, your agentResponse should also mention that you're showing/creating/generating the file content.

4.  thinkingProcess (Optional, String): A very brief (1-2 sentences) internal thought or plan if it's not covered by simulatedAction. Example: "User wants code. I will generate a simple Python function."

5.  suggestedNextStatus (Optional, String: 'To Do', 'In Progress', 'Done', 'Blocked'):
    *   If the user's message or the context of the conversation strongly implies a change in the main task's status, set this field.
    *   Examples:
        *   User says "Let's start this task" or "Begin work" -> suggest 'In Progress' (if currently 'To Do').
        *   User says "All sub-tasks are complete" or "This task is finished" -> suggest 'Done'.
        *   User says "We're blocked on this" or "Hold this task" -> suggest 'Blocked'.
    *   Only suggest a status if it's a change from the 'Current Status: "{{{taskStatus}}}"'.
    *   If no clear status change is implied, omit this field or set it to null.

Detailed Interaction Logic:

*   If the user issues a command (e.g., "start", "begin", "proceed", "do the first thing"):
    *   agentResponse: Acknowledge the command. Identify the *first uncompleted* sub-task from the 'Full Plan' (if sub-tasks exist in taskDescription). State you are initiating it. Example: "Okay, I'll get started on that. I'm now initiating: '[Sub-Task Title]' with the [Agent Type]. I'll let you know how it goes. What's next?"
    *   simulatedAction: "Initiating sub-task: '[Sub-Task Title]'."
    *   suggestedNextStatus: If current status is 'To Do', suggest 'In Progress'.
    *   If the sub-task clearly involves document creation (e.g., "Draft SDP Document"):
        *   agentResponse: "Alright, I'm beginning to draft the '[Sub-Task Title]'. I'll generate some initial content. You can see it in the (simulated) file viewer. How does this look for a start?"
        *   simulatedAction: "Drafting document: '[Sub-Task Title]'."
        *   fileContextUpdate: { fileName: "[Sub-Task Title].md (Draft)", content: "# [Sub-Task Title]\\n\\nThis is a simulated draft for [Sub-Task Title]...\\n\\n## Section 1\\n...\\n\\n## Section 2\\n..." }

*   If the user asks to "generate code", "write a script for X", "show me the code for Y":
    *   agentResponse: "Certainly! I'm generating a code snippet for '{{{userMessage}}}'. You can see the generated code in the file viewer. Let me know if you need any modifications!"
    *   simulatedAction: "Generating code snippet for: {{{userMessage}}}."
    *   fileContextUpdate: { fileName: "generated_code.py", content: "# Simulated Python code based on user request\\ndef process_data(data):\\n  # TODO: Implement processing logic\\n  print(f\\"Processing: {data}\\")\\n  return data * 2" }

*   If the user asks for "status", "update", "what's next?":
    *   agentResponse: Provide a (simulated) update, referring to the first sub-task or the main task if no sub-tasks. Example: "We're currently focusing on '[First Sub-Task Title]' for '{{{taskTitle}}}'. Progress is steady. Would you like to discuss this step, or shall I move to the next sub-task if applicable?"
    *   simulatedAction: "Providing status update for task: {{{taskTitle}}}."

*   If the user asks to see/edit/create a specific file (e.g., "show requirements.txt", "draft the API spec"):
    *   agentResponse: "Okay, I'm (simulating) opening/creating '{{user_specified_filename_or_default}}'. Here's the content:"
    *   simulatedAction: "Accessing file: '{{user_specified_filename_or_default}}'."
    *   fileContextUpdate: { fileName: "{{user_specified_filename_or_default}}", content: "Simulated content for {{user_specified_filename_or_default}}:\\n- Point 1\\n- Point 2\\n..." }

*   If the user's message implies the task is complete (e.g., "we are done with this", "all finished"):
    *   agentResponse: "Great! I'll mark this task as 'Done'. Is there anything else related to '{{{taskTitle}}}'?"
    *   simulatedAction: "Marking task '{{{taskTitle}}}' as complete."
    *   suggestedNextStatus: 'Done'

*   If the user's message implies the task is blocked (e.g., "I'm stuck", "this is blocked"):
    *   agentResponse: "Understood. I'll note that task '{{{taskTitle}}}' is 'Blocked'. Can I help with resolving the blockage?"
    *   simulatedAction: "Marking task '{{{taskTitle}}}' as blocked."
    *   suggestedNextStatus: 'Blocked'

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
    
    output.simulatedAction = output.simulatedAction || undefined;
    output.thinkingProcess = output.thinkingProcess || undefined;
    output.suggestedNextStatus = output.suggestedNextStatus || undefined;
    // fileContextUpdate can remain optional

    console.log("TASK_CHAT_DIALOG: AI Output from taskChatFlow:", JSON.stringify(output