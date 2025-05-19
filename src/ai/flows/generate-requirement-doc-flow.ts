'use server';
/**
 * @fileOverview An AI agent that generates initial content for a requirements document.
 *
 * - generateRequirementDoc - A function that handles the document generation process.
 * - GenerateRequirementDocInput - The input type for the generateRequirementDoc function.
 * - GenerateRequirementDocOutput - The return type for the generateRequirementDoc function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateRequirementDocInputSchema = z.object({
  documentTitle: z.string().describe("The main title or topic of the requirements document, e.g., 'User Authentication Security Requirements'."),
  projectContext: z.string().describe("Brief context about the project for which this document is being created, e.g., 'Project: E-commerce Platform Revamp. Goal: Enhance security features.'"),
  aspiceProcessArea: z.string().optional().describe("Optional ASPICE process area this document relates to, e.g., 'SYS.2' or 'SWE.1'. This helps tailor the content if provided."),
});
export type GenerateRequirementDocInput = z.infer<typeof GenerateRequirementDocInputSchema>;

const GenerateRequirementDocOutputSchema = z.object({
  suggestedFileName: z.string().describe("A suggested filename for the document, including an extension like .md or .txt."),
  documentContent: z.string().describe("The AI-generated content for the requirements document. Should be structured and include common sections like Introduction, Functional Requirements, Non-Functional Requirements, etc., as appropriate for the title and context. Markdown format is preferred."),
  aiReasoning: z.string().describe("A concise (1-3 sentences) explanation of the structure and key sections included in the generated document content."),
});
export type GenerateRequirementDocOutput = z.infer<typeof GenerateRequirementDocOutputSchema>;

export async function generateRequirementDoc(input: GenerateRequirementDocInput): Promise<GenerateRequirementDocOutput> {
  return generateRequirementDocFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRequirementDocPrompt',
  input: { schema: GenerateRequirementDocInputSchema },
  output: { schema: GenerateRequirementDocOutputSchema },
  prompt: `You are an expert Requirements Engineer and Technical Writer AI.
Your task is to generate a well-structured initial draft for a requirements document based on the provided title, project context, and optional ASPICE process area.

Document Title/Topic: "{{documentTitle}}"
Project Context: "{{projectContext}}"
{{#if aspiceProcessArea}}
ASPICE Process Area Focus: "{{aspiceProcessArea}}"
{{/if}}

Instructions:
1.  Generate a suggestedFileName: Create a suitable filename for this document (e.g., "User_Authentication_Requirements.md", "{{aspiceProcessArea}}_System_Requirements.md"). Use underscores for spaces.
2.  Generate documentContent:
    *   Create a comprehensive, well-organized draft of the requirements document. Use Markdown format.
    *   Include standard sections like:
        *   Introduction / Purpose
        *   Scope
        *   Definitions, Acronyms, and Abbreviations (if applicable)
        *   Functional Requirements (use a numbered or bulleted list, be specific, aim for 3-5 example requirements)
        *   Non-Functional Requirements (e.g., Performance, Security, Usability, Reliability, Maintainability; aim for 2-3 example requirements)
        *   Interface Requirements (if applicable)
        *   Data Requirements (if applicable)
    *   If an aspiceProcessArea is provided, ensure the content and structure reflect the typical work products and information items associated with that process area. For example, for SYS.2 (System Requirements Analysis), focus on system-level functional and non-functional requirements. For SWE.1 (Software Requirements Analysis), focus on software-specific requirements derived from system requirements.
    *   The content should be a solid starting point for human engineers to review and elaborate upon.
3.  Generate aiReasoning: Provide a very concise (1-3 sentences) explanation of the document structure you chose and why.

Output ONLY the JSON object adhering to the GenerateRequirementDocOutputSchema.
`,
});

const generateRequirementDocFlow = ai.defineFlow(
  {
    name: 'generateRequirementDocFlow',
    inputSchema: GenerateRequirementDocInputSchema,
    outputSchema: GenerateRequirementDocOutputSchema,
  },
  async (input) => {
    console.log("GENERATE_REQ_DOC_FLOW: Received input:", JSON.stringify(input, null, 2));
    const { output } = await prompt(input);

    if (!output || !output.documentContent || !output.suggestedFileName) {
      console.error("GENERATE_REQ_DOC_FLOW: AI output was null or critical fields were missing. Input:", input);
      return {
        suggestedFileName: "error_generating_doc.txt",
        documentContent: `Error: AI failed to generate document content for title: "${input.documentTitle}". Please try again or refine your input.`,
        aiReasoning: "AI failed to produce a valid response.",
      };
    }
    output.documentContent = output.documentContent || `Placeholder content for ${output.suggestedFileName || input.documentTitle}`;
    output.aiReasoning = output.aiReasoning || "AI generated a standard requirements document structure.";
    
    console.log("GENERATE_REQ_DOC_FLOW: Processed and returning output:", JSON.stringify(output, null, 2));
    return output!;
  }
);