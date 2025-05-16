
'use server';

/**
 * @fileOverview An AI agent that suggests optimal agent configurations for specific tasks.
 *
 * - suggestAgentConfiguration - A function that suggests agent configurations.
 * - SuggestAgentConfigurationInput - The input type for the suggestAgentConfiguration function.
 * - SuggestAgentConfigurationOutput - The return type for the suggestAgentConfiguration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAgentConfigurationInputSchema = z.object({
  taskDescription: z.string().describe('The description of the task to be performed.'),
  historicalPerformanceData: z.string().describe('Historical performance data of agents on similar tasks.'),
});
export type SuggestAgentConfigurationInput = z.infer<typeof SuggestAgentConfigurationInputSchema>;

const SuggestedAgentDetailsSchema = z.object({
  name: z.string().describe("A descriptive and unique name for the suggested agent configuration, e.g., 'High-Performance Data Analyzer'."),
  type: z.string().describe("The type of agent suggested, matching one of the predefined agent types (e.g., 'Analysis Agent', 'Deployment Agent'). Consider types like: Analysis Agent, CI/CD Agent, Documentation Agent, Deployment Agent, Testing Agent, Monitoring Agent, Reporting Agent, Notification Agent, Custom Logic Agent."),
  config: z.record(z.any()).describe("The JSON configuration object for the agent. This should be a valid JSON structure. Example: { \"priority\": \"high\", \"timeout\": 3600 }."),
});

const SuggestAgentConfigurationOutputSchema = z.object({
  suggestedAgent: SuggestedAgentDetailsSchema,
  reasoning: z.string().describe("A brief explanation of why this configuration is recommended for the given task and data."),
  confidenceScore: z.number().min(0).max(1).describe('A confidence score indicating the reliability of the suggestion (0-1).'),
});
export type SuggestAgentConfigurationOutput = z.infer<typeof SuggestAgentConfigurationOutputSchema>;

export async function suggestAgentConfiguration(input: SuggestAgentConfigurationInput): Promise<SuggestAgentConfigurationOutput> {
  return suggestAgentConfigurationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAgentConfigurationPrompt',
  input: {schema: SuggestAgentConfigurationInputSchema},
  output: {schema: SuggestAgentConfigurationOutputSchema},
  prompt: `You are an expert in agent configuration and task management. Based on the task description and historical performance data provided, suggest an optimal agent configuration.

Task Description: {{{taskDescription}}}
Historical Performance Data: {{{historicalPerformanceData}}}

Your goal is to provide a structured agent configuration suggestion.
Output fields required:
- suggestedAgent:
  - name: A descriptive and unique name for the suggested agent.
  - type: The type of agent (e.g., 'Analysis Agent', 'Deployment Agent'). Choose from common agent types such as: Analysis Agent, CI/CD Agent, Documentation Agent, Deployment Agent, Testing Agent, Monitoring Agent, Reporting Agent, Notification Agent, Custom Logic Agent.
  - config: A JSON object representing the agent's configuration parameters.
- reasoning: A brief explanation for your suggestion.
- confidenceScore: A numerical score between 0.0 and 1.0.

Consider factors such as agent type, resources required, and past performance on similar tasks.
Ensure the 'config' field within 'suggestedAgent' is a valid JSON object.
`,
});

const suggestAgentConfigurationFlow = ai.defineFlow(
  {
    name: 'suggestAgentConfigurationFlow',
    inputSchema: SuggestAgentConfigurationInputSchema,
    outputSchema: SuggestAgentConfigurationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate a suggestion.");
    }
    // Ensure confidence score is within 0-1, sometimes LLMs might return slightly outside.
    output.confidenceScore = Math.max(0, Math.min(1, output.confidenceScore));
    return output;
  }
);

