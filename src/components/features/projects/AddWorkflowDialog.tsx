
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
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel as RHFFormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { suggestProjectWorkflow, type SuggestProjectWorkflowInput, type SuggestProjectWorkflowOutput } from '@/ai/flows/suggest-project-workflow-flow';
import { Loader2, Sparkles, Brain, FileText, CheckSquare, Edit3 } from 'lucide-react';
import type { Agent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const aiGoalSchema = z.object({
  workflowGoal: z.string().min(10, "Please describe the workflow goal in at least 10 characters.").max(500, "Goal description is too long."),
});
type AIGoalFormData = z.infer<typeof aiGoalSchema>;

const manualWorkflowSchema = z.object({
  name: z.string().min(3, "Workflow name must be at least 3 characters").max(100, "Name must be 100 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be 500 characters or less"),
});
type ManualWorkflowFormData = z.infer<typeof manualWorkflowSchema>;

interface SuggestedNodeData { name: string; type: string; }

interface AddWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWorkflow: (workflowData: { name: string; description: string }, initialNodesData?: SuggestedNodeData[]) => void;
  projectContext: string;
  projectAgents: Agent[];
}

export default function AddWorkflowDialog({
  open,
  onOpenChange,
  onAddWorkflow,
  projectContext,
  projectAgents
}: AddWorkflowDialogProps) {
  const [currentStep, setCurrentStep] = React.useState<'aiSuggestion' | 'manualConfiguration'>('aiSuggestion');
  const [isLoadingAISuggestion, setIsLoadingAISuggestion] = React.useState(false);
  const [aiSuggestedWorkflow, setAiSuggestedWorkflow] = React.useState<SuggestProjectWorkflowOutput | null>(null);
  const { toast } = useToast();

  const aiGoalForm = useForm<AIGoalFormData>({
    resolver: zodResolver(aiGoalSchema),
    defaultValues: { workflowGoal: "" },
  });

  const manualForm = useForm<ManualWorkflowFormData>({
    resolver: zodResolver(manualWorkflowSchema),
    defaultValues: { name: "", description: "" },
  });

  const resetDialogState = React.useCallback(() => {
    aiGoalForm.reset({ workflowGoal: "" });
    manualForm.reset({ name: "", description: "" });
    setAiSuggestedWorkflow(null);
    setIsLoadingAISuggestion(false);
    setCurrentStep('aiSuggestion');
  }, [aiGoalForm, manualForm]);

  React.useEffect(() => {
    if (open) {
      resetDialogState();
    }
  }, [open, resetDialogState]);

  const handleGetAISuggestion: SubmitHandler<AIGoalFormData> = async (data) => {
    setIsLoadingAISuggestion(true);
    setAiSuggestedWorkflow(null);
    try {
      const existingAgentTypes = Array.from(new Set(projectAgents.map(agent => agent.type).filter(type => typeof type === 'string' && type.trim() !== '')));
      const input: SuggestProjectWorkflowInput = {
        workflowGoal: data.workflowGoal,
        projectContext,
        existingAgentTypes: existingAgentTypes.length > 0 ? existingAgentTypes : ['Analysis Agent', 'Documentation Agent', 'Notification Agent'], // Provide defaults if none configured
      };
      const result = await suggestProjectWorkflow(input);
      setAiSuggestedWorkflow(result);
      manualForm.reset({ // Pre-fill manual form if user wants to edit
        name: result.suggestedName,
        description: result.suggestedDescription,
      });
      toast({
        title: 'AI Workflow Suggestion Ready!',
        description: 'Review the suggested workflow details below.',
      });
    } catch (error) {
      toast({
        title: 'Error Generating Suggestion',
        description: `Failed to get AI suggestion: ${error instanceof Error ? error.message : String(error)}. You can configure manually.`,
        variant: 'destructive',
      });
      setCurrentStep('manualConfiguration'); // Fallback to manual
    } finally {
      setIsLoadingAISuggestion(false);
    }
  };

  const handleUseAISuggestion = () => {
    if (aiSuggestedWorkflow) {
      onAddWorkflow(
        { name: aiSuggestedWorkflow.suggestedName, description: aiSuggestedWorkflow.suggestedDescription },
        aiSuggestedWorkflow.suggestedNodes
      );
      onOpenChange(false);
    }
  };

  const handleManualSubmit: SubmitHandler<ManualWorkflowFormData> = (data) => {
    onAddWorkflow(data); // initialNodesData will be undefined, so no nodes created by default
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetDialogState();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg md:max-w-xl flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add New Project Workflow</DialogTitle>
          <DialogDescription>
            {currentStep === 'aiSuggestion'
              ? "Describe your workflow goal to get an AI suggestion, or switch to manual setup."
              : "Manually define the workflow name and description. You can design its steps later."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-1 space-y-4"> {/* Main content area */}
          {currentStep === 'aiSuggestion' && (
            <div className="p-3">
              <Form {...aiGoalForm}>
                <form onSubmit={aiGoalForm.handleSubmit(handleGetAISuggestion)} id="aiWorkflowGoalForm" className="space-y-4">
                  <FormField
                    control={aiGoalForm.control}
                    name="workflowGoal"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Describe Workflow Goal</RHFFormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., 'Automate daily customer feedback analysis and reporting', or 'Standard process for new feature development from idea to staging deployment.'"
                            className="min-h-[100px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoadingAISuggestion} className="w-full sm:w-auto">
                    {isLoadingAISuggestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Get AI Suggestion
                  </Button>
                </form>
              </Form>

              {isLoadingAISuggestion && !aiSuggestedWorkflow && (
                <div className="flex flex-col items-center justify-center space-y-2 py-6 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p>AI is drafting your workflow...</p>
                </div>
              )}

              {aiSuggestedWorkflow && (
                <Card className="mt-4 bg-muted/30 border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center">
                      <Brain className="w-4 h-4 mr-2 text-primary" />
                      AI Workflow Suggestion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm pt-2">
                    <ScrollArea className="max-h-[250px] pr-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Suggested Name:</Label>
                        <p className="font-medium p-1 bg-background/70 border rounded-sm">{aiSuggestedWorkflow.suggestedName}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Suggested Description:</Label>
                        <p className="p-1 bg-background/70 border rounded-sm text-xs">{aiSuggestedWorkflow.suggestedDescription}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Suggested Initial Nodes ({aiSuggestedWorkflow.suggestedNodes.length}):</Label>
                        <div className="mt-1 space-y-1 p-1 bg-background/70 border rounded-sm max-h-32 overflow-y-auto">
                          {aiSuggestedWorkflow.suggestedNodes.map((node, index) => (
                            <div key={index} className="text-xs border-b border-dashed pb-0.5 mb-0.5 last:border-b-0 last:pb-0 last:mb-0">
                                <span className="font-semibold">{node.name}</span> (<span className="italic text-muted-foreground">Type: {node.type}</span>)
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-1">
                        <Label className="text-xs text-muted-foreground">AI Reasoning:</Label>
                        <p className="text-xs p-1 bg-background/70 border rounded-sm italic max-h-20 overflow-y-auto">{aiSuggestedWorkflow.reasoning}</p>
                      </div>
                    </ScrollArea>
                     <Separator className="my-3" />
                     <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        <Button onClick={handleUseAISuggestion} disabled={isLoadingAISuggestion} className="bg-green-600 hover:bg-green-700 flex-1">
                            <CheckSquare className="mr-2 h-4 w-4" /> Use Suggestion & Create
                        </Button>
                        <Button variant="outline" onClick={() => setCurrentStep('manualConfiguration')} disabled={isLoadingAISuggestion} className="flex-1">
                            <Edit3 className="mr-2 h-4 w-4" /> Edit/Configure Manually
                        </Button>
                     </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentStep === 'manualConfiguration' && (
            <div className="p-3">
              <Form {...manualForm}>
                <form onSubmit={manualForm.handleSubmit(handleManualSubmit)} id="manualWorkflowForm" className="space-y-4">
                  <FormField control={manualForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <RHFFormLabel>Workflow Name</RHFFormLabel>
                      <FormControl><Input placeholder="e.g., Nightly Data Processing" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={manualForm.control} name="description" render={({ field }) => (
                    <FormItem>
                      <RHFFormLabel>Description</RHFFormLabel>
                      <FormControl><Textarea placeholder="Describe the purpose of this workflow." className="min-h-[100px] resize-y" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </form>
              </Form>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t mt-auto flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => { onOpenChange(false); }}>Cancel</Button>
          {currentStep === 'aiSuggestion' && !aiSuggestedWorkflow && (
             <Button type="button" variant="secondary" onClick={() => setCurrentStep('manualConfiguration')} disabled={isLoadingAISuggestion}>
              Configure Manually
            </Button>
          )}
          {currentStep === 'manualConfiguration' && (
            <Button type="submit" form="manualWorkflowForm">Create Workflow</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
