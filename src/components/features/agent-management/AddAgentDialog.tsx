'use client';

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
import { useState, useEffect, useCallback } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel as RHFFormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Agent } from "@/types";
import { suggestAgentConfiguration, type SuggestAgentConfigurationInput, type SuggestAgentConfigurationOutput } from '@/ai/flows/suggest-agent-configuration';
import { Sparkles, Loader2, ListChecks, Send, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const manualAgentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.string().min(1, "Agent type is required"),
  configString: z.string().optional().refine(val => {
    if (!val || val.trim() === "") return true; // Allow empty string
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Configuration must be valid JSON or empty" }),
});

type ManualAgentFormData = z.infer<typeof manualAgentSchema>;

const aiSuggestionFormSchema = z.object({
  taskDescription: z.string().min(10, { message: 'Task description must be at least 10 characters.' }).max(2000),
  historicalPerformanceData: z.string().optional(),
});
type AISuggestionFormData = z.infer<typeof aiSuggestionFormSchema>;

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAgent: (agentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => void;
  projectId?: string;
}

const agentTypes = [
  "Analysis Agent", "CI/CD Agent", "Documentation Agent", "Deployment Agent",
  "Testing Agent", "Monitoring Agent", "Reporting Agent", "Notification Agent",
  "Custom Logic Agent", "Code Review Agent",
  "ASPICE Requirements Elicitation & Analysis Agent",
  "ASPICE System Architectural Design Agent",
  "ASPICE Software Architectural Design Agent",
  "ASPICE Software Detailed Design & Implementation Agent",
  "ASPICE Software Unit Verification Agent",
  "ASPICE Software Integration Testing Agent",
  "ASPICE Software Qualification Testing Agent",
  "ASPICE System Integration Testing Agent",
  "ASPICE System Qualification Testing Agent",
  "ASPICE Project Management Support Agent",
  "ASPICE Quality Assurance Support Agent",
  "ASPICE Configuration Management Support Agent",
  "ASPICE Technical Documentation Agent",
];

const getAiSuggestedConfigStorageKey = (projectId?: string): string => {
  return projectId ? `aiSuggestedAgentConfig_project_${projectId}` : 'aiSuggestedAgentConfig_GLOBAL';
};

export default function AddAgentDialog({ open, onOpenChange, onAddAgent, projectId }: AddAgentDialogProps) {
  const [currentStep, setCurrentStep] = useState<'suggestion' | 'manual'>('suggestion');
  const [isLoadingAiSuggestion, setIsLoadingAiSuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<SuggestAgentConfigurationOutput | null>(null);
  const { toast } = useToast();

  const manualForm = useForm<ManualAgentFormData>({
    resolver: zodResolver(manualAgentSchema),
    defaultValues: { name: "", type: "", configString: "{}" },
  });

  const aiSuggestionForm = useForm<AISuggestionFormData>({
    resolver: zodResolver(aiSuggestionFormSchema),
    defaultValues: { taskDescription: "", historicalPerformanceData: "" },
  });

  const resetFormsAndState = useCallback(() => {
    manualForm.reset({ name: "", type: "", configString: "{}" });
    aiSuggestionForm.reset({ taskDescription: "", historicalPerformanceData: "" });
    setAiSuggestion(null);
    setIsLoadingAiSuggestion(false);
    setCurrentStep('suggestion');
  }, [manualForm, aiSuggestionForm]);

  useEffect(() => {
    if (open) {
      resetFormsAndState();
      const storageKey = getAiSuggestedConfigStorageKey(projectId);
      const storedConfigStr = localStorage.getItem(storageKey);
      if (storedConfigStr) {
        try {
          const storedData = JSON.parse(storedConfigStr) as { name: string; type: string; configString: string };
           // This pre-fill was for manual form, now we use it for AI form or direct suggestion
           // For now, let's just log it and the user can re-trigger AI if needed or go manual.
           // Or, better: if it's a full SuggestAgentConfigurationOutput structure, display it.
           // This part needs careful thought on how to reuse a *suggestion object* vs *form fields*.
           // For now, we'll just clear it. The user can always re-generate.
          localStorage.removeItem(storageKey);
          // console.log("Cleared pre-existing AI suggestion from localStorage for this dialog session.");
        } catch (error) {
          console.error("Error clearing AI suggested config from localStorage:", error);
        }
      }
    }
  }, [open, resetFormsAndState, projectId]);

  const handleGetAISuggestion: SubmitHandler<AISuggestionFormData> = async (data) => {
    setIsLoadingAiSuggestion(true);
    setAiSuggestion(null);
    try {
      const input: SuggestAgentConfigurationInput = {
        taskDescription: data.taskDescription,
        historicalPerformanceData: data.historicalPerformanceData || 'No historical data provided. Consider ASPICE activities if relevant to the task.',
      };
      const result = await suggestAgentConfiguration(input);
      setAiSuggestion(result);
      toast({
        title: 'AI Suggestion Ready!',
        description: 'Review the agent configuration suggestion below.',
      });
    } catch (error) {
      toast({
        title: 'Error Generating Suggestion',
        description: `Failed to get AI suggestion: ${error instanceof Error ? error.message : String(error)}. Please try again or configure manually.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAiSuggestion(false);
    }
  };

  const handleAcceptAndAddAISuggestion = () => {
    if (aiSuggestion?.suggestedAgent) {
      const { name, type, config } = aiSuggestion.suggestedAgent;
      onAddAgent({ name, type, config });
      toast({
        title: "AI-Suggested Agent Added",
        description: `Agent "${name}" has been added to the project.`,
      });
      onOpenChange(false);
    }
  };

  const onManualSubmit: SubmitHandler<ManualAgentFormData> = (data) => {
    let parsedConfig = {};
    if (data.configString && data.configString.trim() !== "") {
      try {
        parsedConfig = JSON.parse(data.configString);
      } catch (e) {
        toast({
          title: "Invalid Configuration",
          description: "The configuration JSON is invalid. Please correct it.",
          variant: "destructive",
        });
        return;
      }
    }
    onAddAgent({ name: data.name, type: data.type, config: parsedConfig });
    toast({
      title: `Agent "${data.name}" Added Manually`,
      description: projectId 
        ? `The agent has been added to project "${projectId}".`
        : `Agent "${data.name}" of type "${data.type}" has been created.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetFormsAndState();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Project Agent</DialogTitle>
          <DialogDescription>
            {currentStep === 'suggestion' 
              ? "Describe the agent's task to get an AI configuration suggestion, or configure manually."
              : "Manually configure the new agent for this project."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-1 space-y-4">
          {currentStep === 'suggestion' && (
            <>
              <Form {...aiSuggestionForm}>
                <form onSubmit={aiSuggestionForm.handleSubmit(handleGetAISuggestion)} id="aiSuggestionFormInternal" className="space-y-4">
                  <FormField
                    control={aiSuggestionForm.control}
                    name="taskDescription"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Describe Task for Agent</RHFFormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., 'Analyze code for security vulnerabilities and ASPICE compliance (SWE.3).'"
                            className="min-h-[80px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={aiSuggestionForm.control}
                    name="historicalPerformanceData"
                    render={({ field }) => (
                      <FormItem>
                        <RHFFormLabel>Context or Historical Data (Optional)</RHFFormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., 'Similar analysis agents usually run for 10 minutes on this codebase size.'"
                            className="min-h-[60px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              {isLoadingAiSuggestion && (
                <div className="flex flex-col items-center justify-center space-y-2 py-6 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p>AI is generating suggestion...</p>
                </div>
              )}

              {aiSuggestion && !isLoadingAiSuggestion && (
                <Card className="bg-accent/30 border-accent shadow-md mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-md flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                      AI Configuration Suggestion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm pt-2">
                    {/* Simplified display for brevity in dialog */}
                    <div><Label className="text-xs">Name:</Label> <p className="text-sm font-medium p-1 bg-background/70 border rounded-sm">{aiSuggestion.suggestedAgent.name}</p></div>
                    <div><Label className="text-xs">Type:</Label> <p className="text-sm p-1 bg-background/70 border rounded-sm">{aiSuggestion.suggestedAgent.type}</p></div>
                    <div><Label className="text-xs">Config (JSON):</Label> <pre className="mt-1 p-2 bg-background/70 rounded-md border text-xs overflow-x-auto max-h-28">{JSON.stringify(aiSuggestion.suggestedAgent.config, null, 2)}</pre></div>
                    <div><Label className="text-xs">Reasoning:</Label> <p className="text-xs p-1 bg-background/70 border rounded-sm italic max-h-28 overflow-y-auto">{aiSuggestion.reasoning}</p></div>
                    <div className="flex items-center gap-2"><Label className="text-xs">Confidence:</Label><Progress value={aiSuggestion.confidenceScore * 100} className="h-1.5 w-24" /><span className="text-xs">{(aiSuggestion.confidenceScore * 100).toFixed(0)}%</span></div>
                    <Button size="sm" onClick={handleAcceptAndAddAISuggestion} className="w-full mt-2">
                      <Brain className="mr-2 h-4 w-4" /> Accept Suggestion & Add Agent
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {currentStep === 'manual' && (
            <Form {...manualForm}>
              <form onSubmit={manualForm.handleSubmit(onManualSubmit)} id="manualAgentFormInternal" className="space-y-4">
                <FormField control={manualForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <RHFFormLabel>Agent Name</RHFFormLabel>
                    <FormControl><Input placeholder="e.g., Project Alpha Deployer" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={manualForm.control} name="type" render={({ field }) => (
                  <FormItem>
                    <RHFFormLabel>Agent Type</RHFFormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select an agent type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {agentTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={manualForm.control} name="configString" render={({ field }) => (
                  <FormItem>
                    <RHFFormLabel>Configuration (JSON)</RHFFormLabel>
                    <FormControl><Textarea placeholder='{ "key": "value" }' className="min-h-[100px] font-mono text-sm" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </form>
            </Form>
          )}
        </div>

        <DialogFooter className="pt-4 border-t mt-auto">
          <Button type="button" variant="outline" onClick={() => { onOpenChange(false); }}>Cancel</Button>
          {currentStep === 'suggestion' && (
            <>
              <Button type="button" variant="secondary" onClick={() => setCurrentStep('manual')}>Configure Manually</Button>
              <Button type="submit" form="aiSuggestionFormInternal" disabled={isLoadingAiSuggestion}>
                {isLoadingAiSuggestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Get Suggestion
              </Button>
            </>
          )}
          {currentStep === 'manual' && (
            <Button type="submit" form="manualAgentFormInternal">Create Agent</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}