// src/components/features/requirements/GenerateRequirementDocDialog.tsx
'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { generateRequirementDoc, type GenerateRequirementDocInput, type GenerateRequirementDocOutput } from '@/ai/flows/generate-requirement-doc-flow';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, FileText, CheckSquare, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label as ShadCnLabel } from "@/components/ui/label";
import { Separator } from '@/components/ui/separator';

const generateDocSchema = z.object({
  documentTitle: z.string().min(5, "Document title must be at least 5 characters.").max(150, "Title too long."),
  projectContext: z.string().min(10, "Project context must be at least 10 characters.").max(500, "Context too long."),
  aspiceProcessArea: z.string().optional(),
});

type GenerateDocFormData = z.infer<typeof generateDocSchema>;

interface GenerateRequirementDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveDocument: (fileName: string, content: string, path: string) => void;
  currentProjectPath: string;
  initialProjectContext: string;
}

export default function GenerateRequirementDocDialog({
  open,
  onOpenChange,
  onSaveDocument,
  currentProjectPath,
  initialProjectContext,
}: GenerateRequirementDocDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [aiSuggestion, setAiSuggestion] = React.useState<GenerateRequirementDocOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<GenerateDocFormData>({
    resolver: zodResolver(generateDocSchema),
    defaultValues: {
      documentTitle: "",
      projectContext: initialProjectContext || "No project context provided.",
      aspiceProcessArea: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        documentTitle: "",
        projectContext: initialProjectContext || "No project context provided.",
        aspiceProcessArea: "",
      });
      setAiSuggestion(null);
      setIsLoading(false);
    }
  }, [open, initialProjectContext, form]);

  const handleGenerateWithAI: SubmitHandler<GenerateDocFormData> = async (data) => {
    setIsLoading(true);
    setAiSuggestion(null);
    try {
      const input: GenerateRequirementDocInput = {
        documentTitle: data.documentTitle,
        projectContext: data.projectContext,
        aspiceProcessArea: data.aspiceProcessArea || undefined,
      };
      console.log("GEN_REQ_DOC_DIALOG: Calling AI with input:", JSON.stringify(input, null, 2));
      const result = await generateRequirementDoc(input);
      console.log("GEN_REQ_DOC_DIALOG: AI responded with:", JSON.stringify(result, null, 2));

      if (!result || !result.suggestedFileName || !result.documentContent) {
          toast({
            title: "AI Suggestion Incomplete",
            description: "The AI did not return all required fields for the document. Please ensure the Genkit flow is providing 'suggestedFileName' and 'documentContent'.",
            variant: "destructive",
          });
          setAiSuggestion(null); 
      } else {
        setAiSuggestion(result);
        toast({
          title: "AI Document Draft Ready!",
          description: "Review the suggested document content below.",
        });
      }
    } catch (error) {
      console.error("Error generating requirement document:", error);
      toast({
        title: "AI Generation Error",
        description: `Failed to generate document: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      setAiSuggestion(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToProject = () => {
    if (aiSuggestion && aiSuggestion.suggestedFileName && aiSuggestion.documentContent) {
      onSaveDocument(aiSuggestion.suggestedFileName, aiSuggestion.documentContent, currentProjectPath);
      onOpenChange(false); 
    } else {
      toast({
        title: "Cannot Save Document",
        description: "No AI-generated document content available to save, or critical fields like filename or content are missing.",
        variant: "destructive",
      });
    }
  };
  
  const dialogContentRef = React.useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogContentRef} className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex flex-col h-[90vh] max-h-[800px] overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Generate Requirement Document with AI</DialogTitle>
          <DialogDescription>
            Provide a title and context. The AI will draft an initial requirements document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-1 space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateWithAI)} id="generateReqDocForm" className="space-y-4 p-3">
              <FormField
                control={form.control}
                name="documentTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Title / Main Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., User Authentication Security Requirements" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectContext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Context</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide brief context about the project."
                        className="min-h-[80px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Helps AI tailor the document.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aspiceProcessArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ASPICE Process Area (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SYS.1, SWE.2" {...field} />
                    </FormControl>
                    <FormDescription>If applicable, helps align with ASPICE work products.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-2 py-8 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p>AI is drafting your document...</p>
            </div>
          )}

          {aiSuggestion && aiSuggestion.suggestedFileName && aiSuggestion.documentContent && !isLoading && (
            <Card className="bg-muted/20 border-muted-foreground/30 shadow-sm mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary" />
                  AI Generated Document Draft
                </CardTitle>
                <ShadCnCardDescription className="text-xs">Review the suggested content. You can save it to the project repository.</ShadCnCardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pt-2">
                <div>
                  <ShadCnLabel className="text-xs font-normal block mb-0.5">Suggested File Name:</ShadCnLabel>
                  <p className="p-2 bg-background/70 rounded-md border font-medium">{aiSuggestion.suggestedFileName}</p>
                </div>
                {aiSuggestion.aiReasoning && (
                  <div>
                    <ShadCnLabel className="text-xs font-normal block mb-0.5">AI Reasoning:</ShadCnLabel>
                    <ScrollArea className="h-auto max-h-20">
                        <p className="p-2 bg-background/70 rounded-md border text-xs italic whitespace-pre-wrap">{aiSuggestion.aiReasoning}</p>
                    </ScrollArea>
                  </div>
                )}
                <div>
                  <ShadCnLabel className="text-xs font-normal block mb-0.5">Document Content (Markdown):</ShadCnLabel>
                  <ScrollArea className="h-[200px] sm:h-[250px] rounded-md border bg-background p-3">
                    <pre className="whitespace-pre-wrap text-xs">{aiSuggestion.documentContent}</pre>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="pt-4 border-t mt-auto flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!aiSuggestion && (
            <Button
              type="submit"
              form="generateReqDocForm"
              disabled={isLoading || !form.formState.isValid || form.formState.isSubmitting}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </Button>
          )}
          {aiSuggestion && aiSuggestion.suggestedFileName && aiSuggestion.documentContent && !isLoading && (
            <>
              <Button
                variant="secondary"
                onClick={() => form.handleSubmit(handleGenerateWithAI)()} 
                disabled={isLoading || !form.formState.isValid}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Regenerate
              </Button>
              <Button onClick={handleSaveToProject} disabled={isLoading}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Save Document to Project
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
