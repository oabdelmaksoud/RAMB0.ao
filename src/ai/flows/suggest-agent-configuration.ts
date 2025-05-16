// Implemented Genkit flow to suggest optimal agent configurations based on historical data.

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

const SuggestAgentConfigurationOutputSchema = z.object({
  suggestedConfiguration: z.string().describe('The suggested optimal agent configuration for the task.'),
  confidenceScore: z.number().describe('A confidence score indicating the reliability of the suggestion (0-1).'),
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

Consider factors such as agent type, resources required, and past performance on similar tasks. Provide a confidence score (0-1) indicating the reliability of your suggestion.

Ensure that the suggestedConfiguration is a string that can be directly used to configure the agent.
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
    return output!;
  }
);
