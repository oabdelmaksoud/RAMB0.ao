
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

// This schema defines what the AI is expected to return directly from the prompt
const AIPromptOutputSuggestedAgentDetailsSchema = z.object({
  name: z.string().describe("A descriptive and unique name for the suggested agent configuration, e.g., 'High-Performance Data Analyzer'."),
  type: z.string().describe("The type of agent suggested, matching one of the predefined agent types (e.g., 'Analysis Agent', 'Deployment Agent'). Consider types like: Analysis Agent, CI/CD Agent, Documentation Agent, Deployment Agent, Testing Agent, Monitoring Agent, Reporting Agent, Notification Agent, Custom Logic Agent."),
  configString: z.string().describe("A JSON string representing the agent's configuration parameters. Example: '{ \"priority\": \"high\", \"timeout\": 3600 }'. Ensure it's a valid JSON string."),
});

const AIPromptOutputSchema = z.object({
  suggestedAgent: AIPromptOutputSuggestedAgentDetailsSchema,
  reasoning: z.string().describe("A brief explanation of why this configuration is recommended for the given task and data."),
  confidenceScore: z.number().min(0).max(1).describe('A confidence score indicating the reliability of the suggestion (0-1).'),
});

// This schema defines what the suggestAgentConfigurationFlow function will return (after parsing configString)
const FlowOutputSuggestedAgentDetailsSchema = z.object({
  name: z.string().describe("A descriptive and unique name for the suggested agent configuration."),
  type: z.string().describe("The type of agent suggested."),
  config: z.record(z.any()).describe("The JSON configuration object for the agent, parsed from the AI's string output."),
});

const FlowOutputSchema = z.object({
  suggestedAgent: FlowOutputSuggestedAgentDetailsSchema,
  reasoning: z.string().describe("A brief explanation of why this configuration is recommended."),
  confidenceScore: z.number().min(0).max(1).describe('A confidence score.'),
});
export type SuggestAgentConfigurationOutput = z.infer<typeof FlowOutputSchema>;


export async function suggestAgentConfiguration(input: SuggestAgentConfigurationInput): Promise<SuggestAgentConfigurationOutput> {
  return suggestAgentConfigurationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAgentConfigurationPrompt',
  input: {schema: SuggestAgentConfigurationInputSchema},
  output: {schema: AIPromptOutputSchema}, // Prompt uses schema with configString
  prompt: `You are an expert in agent configuration and task management. Based on the task description and historical performance data provided, suggest an optimal agent configuration.

Task Description: {{{taskDescription}}}
Historical Performance Data: {{{historicalPerformanceData}}}

Your goal is to provide a structured agent configuration suggestion.
Output fields required:
- suggestedAgent:
  - name: A descriptive and unique name for the suggested agent.
  - type: The type of agent (e.g., 'Analysis Agent', 'Deployment Agent'). Choose from common agent types such as: Analysis Agent, CI/CD Agent, Documentation Agent, Deployment Agent, Testing Agent, Monitoring Agent, Reporting Agent, Notification Agent, Custom Logic Agent.
  - configString: A JSON string representing the agent's configuration parameters. Example: "{ \\"priority\\": \\"high\\", \\"timeout\\": 3600 }". Ensure this is a valid JSON string.
- reasoning: A brief explanation for your suggestion.
- confidenceScore: A numerical score between 0.0 and 1.0.

Consider factors such as agent type, resources required, and past performance on similar tasks.
Ensure the 'configString' field within 'suggestedAgent' is a valid JSON string.
`,
});

const suggestAgentConfigurationFlow = ai.defineFlow(
  {
    name: 'suggestAgentConfigurationFlow',
    inputSchema: SuggestAgentConfigurationInputSchema,
    outputSchema: FlowOutputSchema, // Flow uses schema with parsed config object
  },
  async input => {
    const {output: aiOutput} = await prompt(input);
    if (!aiOutput) {
      throw new Error("AI failed to generate a suggestion.");
    }

    let parsedConfig: Record<string, any> = {};
    try {
      if (aiOutput.suggestedAgent.configString && aiOutput.suggestedAgent.configString.trim() !== "") {
        parsedConfig = JSON.parse(aiOutput.suggestedAgent.configString);
      }
    } catch (e) {
      console.warn(
        "AI returned invalid JSON for configString. Defaulting to empty config. Input:",
        aiOutput.suggestedAgent.configString,
        "Error:",
        e
      );
      // Optionally, you could throw an error here or return a specific error state
      // For now, we'll default to an empty config object.
    }
    
    const result: SuggestAgentConfigurationOutput = {
      suggestedAgent: {
        name: aiOutput.suggestedAgent.name,
        type: aiOutput.suggestedAgent.type,
        config: parsedConfig, // parsedConfig is an object
      },
      reasoning: aiOutput.reasoning,
      confidenceScore: Math.max(0, Math.min(1, aiOutput.confidenceScore)),
    };
    return result;
  }
);

