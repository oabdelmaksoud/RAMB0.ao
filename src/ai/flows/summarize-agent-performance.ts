// Summarize agent performance metrics and logs into actionable insights.

'use server';

/**
 * @fileOverview Summarizes agent performance metrics and logs into actionable insights.
 *
 * - summarizeAgentPerformance - A function that summarizes agent performance.
 * - SummarizeAgentPerformanceInput - The input type for the summarizeAgentPerformance function.
 * - SummarizeAgentPerformanceOutput - The return type for the summarizeAgentPerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAgentPerformanceInputSchema = z.object({
  metrics: z.string().describe('Agent performance metrics in JSON format.'),
  logs: z.string().describe('Agent execution logs.'),
});
export type SummarizeAgentPerformanceInput = z.infer<typeof SummarizeAgentPerformanceInputSchema>;

const SummarizeAgentPerformanceOutputSchema = z.object({
  summary: z.string().describe('A summary of the agent performance, including identified bottlenecks and suggestions for improvement.'),
});
export type SummarizeAgentPerformanceOutput = z.infer<typeof SummarizeAgentPerformanceOutputSchema>;

export async function summarizeAgentPerformance(input: SummarizeAgentPerformanceInput): Promise<SummarizeAgentPerformanceOutput> {
  return summarizeAgentPerformanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeAgentPerformancePrompt',
  input: {
    schema: SummarizeAgentPerformanceInputSchema,
  },
  output: {
    schema: SummarizeAgentPerformanceOutputSchema,
  },
  prompt: `You are an AI expert in analyzing agent performance.

  Given the following metrics and logs, provide a summary of the agent's performance, identify any bottlenecks, and suggest improvements.

  Metrics:
  {{metrics}}

  Logs:
  {{logs}}`,
});

const summarizeAgentPerformanceFlow = ai.defineFlow(
  {
    name: 'summarizeAgentPerformanceFlow',
    inputSchema: SummarizeAgentPerformanceInputSchema,
    outputSchema: SummarizeAgentPerformanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
