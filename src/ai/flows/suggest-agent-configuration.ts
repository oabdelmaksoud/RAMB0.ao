
'use server';

/**
 * @fileOverview An AI agent that suggests optimal agent configurations for specific tasks,
 * allowing for iterative refinement based on user feedback.
 *
 * - suggestAgentConfiguration - A function that suggests agent configurations.
 * - SuggestAgentConfigurationInput - The input type for the suggestAgentConfiguration function.
 * - SuggestAgentConfigurationOutput - The return type for the suggestAgentConfiguration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// This schema defines what the AI is expected to return directly from the prompt
const AIPromptOutputSuggestedAgentDetailsSchema = z.object({
  name: z.string().describe("A descriptive and unique name for the suggested agent configuration, e.g., 'High-Performance Data Analyzer'."),
  type: z.string().describe("The type of agent suggested, matching one of the predefined agent types (e.g., 'Analysis Agent', 'Deployment Agent'). Consider types like: Analysis Agent, CI/CD Agent, Documentation Agent, Deployment Agent, Testing Agent, Monitoring Agent, Reporting Agent, Notification Agent, Custom Logic Agent."),
  configString: z.string().describe("A JSON string representing the agent's configuration parameters. This should be detailed and tailored to the agent type and task. Example: '{ \"priority\": \"high\", \"timeout\": 3600, \"analysisDepth\": \"full\", \"reportFormat\": \"detailed_pdf\" }'. Ensure it's a valid JSON string."),
});

const AIPromptOutputSchema = z.object({
  suggestedAgent: AIPromptOutputSuggestedAgentDetailsSchema,
  reasoning: z.string().describe("A brief explanation of why this configuration is recommended for the given task and data, or how it addresses modification feedback. Explain how the advanced config parameters contribute to better performance or suitability."),
  confidenceScore: z.number().min(0).max(1).describe('A confidence score indicating the reliability of the suggestion (0-1).'),
});
export type AIPromptOutput = z.infer<typeof AIPromptOutputSchema>;


const SuggestAgentConfigurationInputSchema = z.object({
  taskDescription: z.string().describe('The description of the task to be performed.'),
  historicalPerformanceData: z.string().describe('Historical performance data of agents on similar tasks, or other contextual information like project type or specific requirements (e.g., ASPICE compliance needs).'),
  modificationRequest: z.string().optional().describe("User's feedback or request to modify a previous suggestion."),
  previousSuggestion: AIPromptOutputSchema.optional().describe("The previous suggestion (name, type, configString, reasoning, confidence) that the user wants to modify."),
});
export type SuggestAgentConfigurationInput = z.infer<typeof SuggestAgentConfigurationInputSchema>;


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
  prompt: `You are an expert in agent configuration and task management, specializing in optimizing agents for performance and specific project needs like ASPICE compliance.

{{#if modificationRequest}}
You are refining a PREVIOUS SUGGESTION based on user feedback.
Original Task Description: "{{{taskDescription}}}"
{{#if historicalPerformanceData}}
Original Context/Historical Performance Data: "{{{historicalPerformanceData}}}"
{{/if}}

Previous AI Suggestion was:
Agent Name: "{{{previousSuggestion.suggestedAgent.name}}}"
Agent Type: "{{{previousSuggestion.suggestedAgent.type}}}"
Agent Config (JSON String): {{{previousSuggestion.suggestedAgent.configString}}}
Previous Reasoning: "{{{previousSuggestion.reasoning}}}"
Previous Confidence: {{{previousSuggestion.confidenceScore}}}

User's Modification Request: "{{{modificationRequest}}}"

Please carefully review the PREVIOUS SUGGESTION and the user's MODIFICATION REQUEST.
Generate a NEW, complete 'suggestedAgent' object (with name, type, and a detailed 'configString') that incorporates the user's feedback while still addressing the ORIGINAL TASK DESCRIPTION and relevant context (like ASPICE).
Your NEW 'reasoning' MUST explain the changes made to the suggestion based on the feedback and how it still fulfills the original task.
Provide a NEW 'confidenceScore'.

{{else}}
{{! This is the original suggestion logic when no modificationRequest is present }}
Based on the task description and any provided context or historical performance data, suggest an optimal AND ADVANCED agent configuration.
Task Description: {{{taskDescription}}}
{{#if historicalPerformanceData}}
Context / Historical Performance Data: {{{historicalPerformanceData}}}
{{/if}}
{{/if}}

Output fields required:
- suggestedAgent:
  - name: A descriptive and unique name for the suggested agent.
  - type: The type of agent (e.g., 'Analysis Agent', 'Deployment Agent', 'ASPICE Requirements Elicitation & Analysis Agent', 'ASPICE System Architectural Design Agent', 'ASPICE Software Architectural Design Agent', 'ASPICE Software Detailed Design & Implementation Agent', 'ASPICE Software Unit Verification Agent', 'ASPICE Software Integration Testing Agent', 'ASPICE Software Qualification Testing Agent', 'ASPICE System Integration Testing Agent', 'ASPICE System Qualification Testing Agent', 'ASPICE Project Management Support Agent', 'ASPICE Quality Assurance Support Agent', 'ASPICE Configuration Management Support Agent', 'ASPICE Technical Documentation Agent'). If the task description or context mentions ASPICE or specific process areas like SYS.1, SWE.3, MAN.5, prioritize suggesting relevant ASPICE agent types.
  - configString: **A DETAILED JSON string** representing the agent's configuration parameters, aimed at optimal performance and suitability for the task.
    Examples of advanced configurations:
    - For 'Analysis Agent': "{ \"mode\": \"deep_static_analysis\", \"timeout_seconds\": 7200, \"ruleset\": \"project_specific_rules.json\", \"output_format\": \"sarif\" }"
    - For 'Deployment Agent': "{ \"target_environment\": \"production\", \"strategy\": \"blue_green\", \"health_check_timeout\": 300, \"canary_percentage\": 10, \"auto_rollback\": true }"
    - For 'Testing Agent': "{ \"suite\": \"regression_critical\", \"parallel_workers\": 4, \"coverage_target\": 95, \"retry_attempts\": 2 }"
    - For 'ASPICE Documentation Agent' (if task is 'Generate SWE.3 Design Document'): "{ \"aspice_process_area\": \"SWE.3\", \"template_id\": \"swe3_design_v1.2\", \"output_format\": \"pdf_a\", \"include_traceability_to\": [\"SWE.1\", \"SWE.2\"] }"
    Think about what specific parameters would make this agent truly effective for the described task. Ensure this is a valid JSON string.
- reasoning: A brief (2-4 sentences) explanation for your suggestion. Clearly state why this specific agent type and its ADVANCED configuration parameters are suitable for the given task and historical data. If ASPICE context was used, detail how the configuration supports specific ASPICE activities or work products.
- confidenceScore: A numerical score between 0.0 and 1.0 indicating the reliability of the suggestion.

Consider factors such as agent type, resources required, advanced operational parameters, and past performance on similar tasks.
If the task relates to ASPICE compliance, ensure the suggested agent type and especially its 'configString' reflect that by including relevant ASPICE process area identifiers, specific artifact names, or compliance parameters.
Ensure the 'configString' field within 'suggestedAgent' is a valid JSON string.
Output ONLY the JSON.
`,
});

const suggestAgentConfigurationFlow = ai.defineFlow(
  {
    name: 'suggestAgentConfigurationFlow',
    inputSchema: SuggestAgentConfigurationInputSchema,
    outputSchema: FlowOutputSchema, // Flow uses schema with parsed config object
  },
  async input => {
    console.log("SUGGEST_AGENT_CONFIG_FLOW: Received input:", JSON.stringify(input, null, 2));
    const {output: aiOutput} = await prompt(input);

    if (!aiOutput || !aiOutput.suggestedAgent) {
      console.error("SUGGEST_AGENT_CONFIG_FLOW: AI output was null or suggestedAgent was missing. Input:", input);
      // Construct a fallback error response
      return {
        suggestedAgent: {
          name: "Error: AI Suggestion Failed",
          type: "Error",
          config: { error: "AI failed to generate a valid configuration." },
        },
        reasoning: "The AI failed to generate a valid agent configuration suggestion. Please check the AI logs or try rephrasing your task description.",
        confidenceScore: 0,
      };
    }
    
    let parsedConfig: Record<string, any> = {};
    try {
      if (aiOutput.suggestedAgent.configString && aiOutput.suggestedAgent.configString.trim() !== "") {
        parsedConfig = JSON.parse(aiOutput.suggestedAgent.configString);
      } else {
        // If AI returns an empty config string, default to an empty object.
        parsedConfig = {};
      }
    } catch (e) {
      console.warn(
        "SUGGEST_AGENT_CONFIG_FLOW: AI returned invalid JSON for configString. Defaulting to error config. Input:",
        aiOutput.suggestedAgent.configString,
        "Error:",
        e
      );
      // Provide a more informative error in the config if parsing fails
      parsedConfig = { 
        error: "AI returned invalid JSON configuration string. Please check the format or try modifying the request.", 
        originalString: aiOutput.suggestedAgent.configString 
      };
    }
    
    const result: SuggestAgentConfigurationOutput = {
      suggestedAgent: {
        name: aiOutput.suggestedAgent.name || "Unnamed AI Agent",
        type: aiOutput.suggestedAgent.type || "Generic Agent",
        config: parsedConfig,
      },
      reasoning: aiOutput.reasoning || "No reasoning provided by AI.",
      confidenceScore: Math.max(0, Math.min(1, aiOutput.confidenceScore === undefined ? 0.5 : aiOutput.confidenceScore)),
    };
    console.log("SUGGEST_AGENT_CONFIG_FLOW: Processed and returning output:", JSON.stringify(result, null, 2));
    return result;
  }
);

