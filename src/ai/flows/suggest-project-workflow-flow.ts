
'use server';
/**
 * @fileOverview An AI agent that suggests a project workflow (name, description, initial nodes)
 * based on a user's goal, project context, and available agent types.
 *
 * - suggestProjectWorkflow - A function that handles the workflow suggestion process.
 * - SuggestProjectWorkflowInput - The input type for the suggestProjectWorkflow function.
 * - SuggestProjectWorkflowOutput - The return type for the suggestProjectWorkflow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestProjectWorkflowInputSchema = z.object({
  workflowGoal: z.string().describe("The user's description of what the workflow should achieve or automate. For example: 'A process to automate daily data ingestion, transformation, and reporting.' or 'A workflow for handling new software feature requests from idea to deployment.'"),
  projectContext: z.string().describe("Brief context about the project for which this workflow is being created. E.g., 'Project Name: Customer Analytics Platform. Project Type: Data Engineering and BI.'"),
  existingAgentTypes: z.array(z.string()).describe("A list of agent types already configured or available for this project (e.g., ['Analysis Agent', 'Reporting Agent', 'Notification Agent']). This helps in suggesting relevant nodes."),
});
export type SuggestProjectWorkflowInput = z.infer<typeof SuggestProjectWorkflowInputSchema>;

const SuggestedNodeSchema = z.object({
  name: z.string().describe("A descriptive name for this workflow node/step, e.g., 'Fetch Raw Data', 'Transform Data', 'Generate Daily Report', 'Notify Stakeholders'. This is not the agent type, but the name of the step in the workflow."),
  type: z.string().describe("The type of AI agent best suited to perform this node/step, chosen from or inspired by the `existingAgentTypes` provided. E.g., 'Analysis Agent', 'Reporting Agent'."),
});

const SuggestProjectWorkflowOutputSchema = z.object({
  suggestedName: z.string().describe("A concise and descriptive name for the suggested workflow, e.g., 'Daily Sales Data Pipeline', 'Feature Request Processing Workflow'."),
  suggestedDescription: z.string().describe("A brief (1-3 sentences) description of what this workflow does."),
  suggestedNodes: z.array(SuggestedNodeSchema).min(1).max(5).describe("A list of 2-5 suggested high-level initial nodes/steps for this workflow. Each node should have a 'name' (step name) and 'type' (agent type)."),
  reasoning: z.string().describe("A concise explanation (1-3 sentences) of why this workflow structure (name, description, and initial nodes/agent types) is recommended for the given goal and context."),
});
export type SuggestProjectWorkflowOutput = z.infer<typeof SuggestProjectWorkflowOutputSchema>;

export async function suggestProjectWorkflow(input: SuggestProjectWorkflowInput): Promise<SuggestProjectWorkflowOutput> {
  return suggestProjectWorkflowFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestProjectWorkflowPrompt',
  input: { schema: SuggestProjectWorkflowInputSchema },
  output: { schema: SuggestProjectWorkflowOutputSchema },
  prompt: `You are an expert Workflow Design Assistant AI.
Your task is to suggest a new project workflow based on the user's goal, the project context, and the types of agents available.

Workflow Goal: "{{workflowGoal}}"
Project Context: "{{projectContext}}"
Existing Agent Types Available: {{#if existingAgentTypes.length}}{{join existingAgentTypes ", "}}{{else}}None specified, suggest common types like 'Analysis Agent', 'Documentation Agent', 'Notification Agent', 'CI/CD Agent'{{/if}}.

Based on this, generate:
1.  suggestedName: A concise and descriptive name for the workflow.
2.  suggestedDescription: A brief (1-3 sentences) description of what this workflow does.
3.  suggestedNodes: A list of 2 to 5 high-level initial nodes (steps) for this workflow. For each node, provide:
    *   name: A descriptive name for the node/step (e.g., "Fetch Raw Data", "Analyze User Feedback", "Deploy to Staging").
    *   type: The most appropriate agent type from the 'Existing Agent Types Available' (or a common agent type if none are listed) to perform this step.
4.  reasoning: A concise (1-3 sentences) explanation for your overall suggestion, including why the chosen nodes and their agent types are suitable for the workflow goal.

Focus on creating a logical flow of high-level steps. The user will refine the details and connections later.
Output ONLY the JSON object adhering to the SuggestProjectWorkflowOutputSchema.
`,
});

const suggestProjectWorkflowFlow = ai.defineFlow(
  {
    name: 'suggestProjectWorkflowFlow',
    inputSchema: SuggestProjectWorkflowInputSchema,
    outputSchema: SuggestProjectWorkflowOutputSchema,
  },
  async (input) => {
    console.log("SUGGEST_PROJECT_WORKFLOW_FLOW: Received input:", JSON.stringify(input, null, 2));
    const { output } = await prompt(input);

    if (!output || !output.suggestedName || !output.suggestedNodes || output.suggestedNodes.length === 0) {
      console.error("SUGGEST_PROJECT_WORKFLOW_FLOW: AI output was null or critical fields were missing. Input:", input);
      const fallbackNodeName = "Initial Step - " + (input.workflowGoal.substring(0,20) || "Process Data");
      return {
        suggestedName: input.workflowGoal.substring(0, 50) || "Unnamed AI Workflow",
        suggestedDescription: `A workflow to address: ${input.workflowGoal.substring(0, 100)}...`,
        suggestedNodes: [{ name: fallbackNodeName, type: input.existingAgentTypes?.[0] || "Generic Agent" }],
        reasoning: "AI failed to provide a detailed suggestion. This is a basic fallback structure.",
      };
    }
    output.suggestedNodes = output.suggestedNodes.map(node => ({
        name: node.name || "Unnamed Node",
        type: node.type || (input.existingAgentTypes?.[0] || "Generic Agent")
    }));
    
    console.log("SUGGEST_PROJECT_WORKFLOW_FLOW: Processed and returning output:", JSON.stringify(output, null, 2));
    return output!;
  }
);
