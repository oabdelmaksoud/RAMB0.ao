'use server';
/**
 * @fileOverview An AI agent that analyzes a ticket and suggests resolutions, next steps, and potential impact.
 *
 * - analyzeTicket - A function that handles the ticket analysis process.
 * - AnalyzeTicketInput - The input type for the analyzeTicket function.
 * - AnalyzeTicketOutput - The return type for the analyzeTicket function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { TicketType, TicketPriority } from '@/types'; // Assuming these are exported from types

// Define Zod schemas for TicketType and TicketPriority if not already available globally for Zod
// For simplicity, assuming string for now, but ideally, use z.enum with values from '@/types'
const TicketTypeSchema = z.string().describe("The type of the ticket (e.g., Bug, Feature Request, Support Request, Change Request).");
const TicketPrioritySchema = z.string().describe("The priority of the ticket (e.g., High, Medium, Low).");


const AnalyzeTicketInputSchema = z.object({
  ticketTitle: z.string().describe('The title of the ticket.'),
  ticketDescription: z.string().describe('The detailed description of the ticket.'),
  currentType: TicketTypeSchema.describe('The current type of the ticket.'),
  currentPriority: TicketPrioritySchema.describe('The current priority of the ticket.'),
});
export type AnalyzeTicketInput = z.infer<typeof AnalyzeTicketInputSchema>;

const AnalyzeTicketOutputSchema = z.object({
  suggestedResolution: z.string().describe('A concise suggested resolution or primary approach to investigate the ticket (1-3 sentences).'),
  suggestedNextSteps: z.string().describe('2-3 concrete next actionable steps to take regarding the ticket (bullet points or short sentences).'),
  potentialImpact: z.string().describe('An assessment of the potential impact if this ticket is not addressed (e.g., Low, Medium, High, Critical).'),
  reasoning: z.string().describe('A brief explanation (1-2 sentences) for the suggested resolution and next steps.'),
});
export type AnalyzeTicketOutput = z.infer<typeof AnalyzeTicketOutputSchema>;

export async function analyzeTicket(input: AnalyzeTicketInput): Promise<AnalyzeTicketOutput> {
  return analyzeTicketFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTicketPrompt',
  input: { schema: AnalyzeTicketInputSchema },
  output: { schema: AnalyzeTicketOutputSchema },
  prompt: `You are an expert Senior Technical Support Analyst and Project Manager.
Your task is to analyze the following ticket and provide actionable insights.

Ticket Title: "{{ticketTitle}}"
Ticket Description:
{{{ticketDescription}}}

Current Ticket Type: {{currentType}}
Current Ticket Priority: {{currentPriority}}

Based on the information provided, please generate:
1.  suggestedResolution: A concise (1-3 sentences) suggested resolution or the primary approach to investigate this ticket.
2.  suggestedNextSteps: 2-3 concrete, actionable next steps that should be taken to address this ticket. Format as bullet points or short sentences.
3.  potentialImpact: A brief assessment of the potential impact if this ticket is not addressed (e.g., Low, Medium, High, Critical - System Down).
4.  reasoning: A brief (1-2 sentences) explanation for your suggested resolution and next steps.

Focus on providing practical and helpful advice.
Output ONLY the JSON object adhering to the AnalyzeTicketOutputSchema.
`,
});

const analyzeTicketFlow = ai.defineFlow(
  {
    name: 'analyzeTicketFlow',
    inputSchema: AnalyzeTicketInputSchema,
    outputSchema: AnalyzeTicketOutputSchema,
  },
  async (input) => {
    console.log("ANALYZE_TICKET_FLOW: Received input:", JSON.stringify(input, null, 2));
    const { output } = await prompt(input);

    if (!output) {
      console.error("ANALYZE_TICKET_FLOW: AI output was null. Input:", input);
      // Provide a default error response structured according to the output schema
      return {
        suggestedResolution: "AI analysis failed. Unable to provide a resolution.",
        suggestedNextSteps: "No next steps could be determined.",
        potentialImpact: "Unknown",
        reasoning: "The AI model did not return a valid response for this ticket.",
      };
    }
    // Ensure all fields have fallback values if AI omits them, though Zod should enforce structure
    output.suggestedResolution = output.suggestedResolution || "No specific resolution suggested by AI.";
    output.suggestedNextSteps = output.suggestedNextSteps || "No specific next steps suggested by AI.";
    output.potentialImpact = output.potentialImpact || "Impact assessment not provided by AI.";
    output.reasoning = output.reasoning || "Reasoning not provided by AI.";
    
    console.log("ANALYZE_TICKET_FLOW: Processed and returning output:", JSON.stringify(output, null, 2));
    return output!;
  }
);
