
'use client';

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel as RHFFormLabel, FormMessage } from "@/components/ui/form";
import type { Task, ProjectWorkflow } from '@/types';
import { planProjectTask, type PlanProjectTaskInput, type PlanProjectTaskOutput } from "@/ai/flows/plan-project-task-flow";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CheckSquare, ListChecks, CalendarDays, Users, Clock3, Milestone, Brain, AlertCircle, FolderGit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Removed ScrollArea import as we'll use native overflow
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


const plannerSchema = z.object({
  userGoal: z.string().min(10, "Please describe your task goal in at least 10 characters.").max(1000, "Goal description is too long."),
});

type PlannerFormData = z.infer<typeof plannerSchema>;

interface AITaskPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectWorkflows: Pick<ProjectWorkflow, 'name' | 'description'>[];
  onTaskPlannedAndAccepted: (
    taskData: Omit<Task, 'id'>,
    aiReasoning: string,
    aiSuggestedSubTasks?: PlanProjectTaskOutput['plannedTask']['suggestedSubTasks']
  ) => void;
}

const AI_SUGGESTION_OPTION_VALUE = "__AI_SUGGESTION_AS_IS__";

export default function AITaskPlannerDialog({
  open,
  onOpenChange,
  projectId,
  projectWorkflows,
  onTaskPlannedAndAccepted,
}: AITaskPlannerDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [aiSuggestion, setAiSuggestion] = React.useState<PlanProjectTaskOutput | null>(null);
  const [selectedWorkflowOverride, setSelectedWorkflowOverride] = React.useState<string | undefined>(undefined);
  const { toast } = useToast();

  const form = useForm<PlannerFormData>({
    resolver: zodResolver(plannerSchema),
    defaultValues: {
      userGoal: "",
    },
  });

  React.useEffect(() => {
    if (aiSuggestion) {
      console.log("AI Suggestion Data in Dialog:", JSON.stringify(aiSuggestion, null, 2));
    }
  }, [aiSuggestion]);

  const onSubmit: SubmitHandler<PlannerFormData> = async (data) => {
    setIsLoading(true);
    setAiSuggestion(null);
    setSelectedWorkflowOverride(undefined);
    try {
      const input: PlanProjectTaskInput = {
        userGoal: data.userGoal,
        projectId,
        projectWorkflows: projectWorkflows.map(wf => ({ name: wf.name, description: wf.description })),
      };
      const result = await planProjectTask(input);
      setAiSuggestion(result);
      toast({
        title: "AI Task Plan Ready!",
        description: "Review the AI's suggestion below.",
      });
    } catch (error) {
      console.error("Error planning task with AI:", error);
      toast({
        title: "AI Planning Error",
        description: `Failed to get task plan: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptAndAddTask = () => {
    if (aiSuggestion?.plannedTask) {
      const finalAssignedTo = selectedWorkflowOverride !== undefined && selectedWorkflowOverride !== AI_SUGGESTION_OPTION_VALUE
        ? selectedWorkflowOverride
        : aiSuggestion.plannedTask.assignedTo;

      const subTasksText = aiSuggestion.plannedTask.suggestedSubTasks && aiSuggestion.plannedTask.suggestedSubTasks.length > 0
        ? `\n\nSuggested Sub-Tasks / Steps:\n${aiSuggestion.plannedTask.suggestedSubTasks.map(st => `- ${st.title} (Agent Type: ${st.assignedAgentType})`).join('\n')}`
        : "\n\nSuggested Sub-Tasks / Steps: None specified by AI.";

      const taskDescription = `AI Reasoning: ${aiSuggestion.reasoning}${subTasksText}`.trim();
      
      const taskData: Omit<Task, 'id'> = {
        title: aiSuggestion.plannedTask.title,
        status: aiSuggestion.plannedTask.status || 'To Do',
        assignedTo: finalAssignedTo || 'AI Assistant to determine',
        startDate: aiSuggestion.plannedTask.startDate,
        durationDays: aiSuggestion.plannedTask.durationDays || 1,
        progress: aiSuggestion.plannedTask.progress || 0,
        isMilestone: aiSuggestion.plannedTask.isMilestone || false,
        parentId: aiSuggestion.plannedTask.parentId === "null" ? null : aiSuggestion.plannedTask.parentId,
        dependencies: aiSuggestion.plannedTask.dependencies || [],
        description: taskDescription
      };
      onTaskPlannedAndAccepted(
        taskData,
        aiSuggestion.reasoning,
        aiSuggestion.plannedTask.suggestedSubTasks
      );
      onOpenChange(false); 
    }
  };

  React.useEffect(() => {
    if (!open) {
      form.reset();
      setAiSuggestion(null);
      setSelectedWorkflowOverride(undefined);
      setIsLoading(false);
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[800px] flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Plan New Task with AI</DialogTitle>
          <DialogDescription>
            Describe your goal, and let the AI assistant help plan the task details and suggest sub-steps.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-4"> {/* Changed: This div handles scrolling */}
            <Form {...form} onSubmit={form.handleSubmit(onSubmit)} id="aiPlannerForm" className="space-y-4">
              <FormField
                control={form.control}
                name="userGoal"
                render={({ field }) => (
                  <FormItem>
                    <RHFFormLabel>What do you want to achieve?</RHFFormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 'Implement user login with email and password', or 'Design the new homepage mockup'"
                        className="min-h-[100px] resize-y"
                        {...field}
                        disabled={isLoading || !!aiSuggestion}
                      />
                    </FormControl>
                    <FormDescription>Be as specific or general as you like. The AI will consider your project's workflows.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>

            {isLoading && !aiSuggestion && (
              <div className="flex flex-col items-center justify-center space-y-2 py-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">AI is planning your task...</p>
              </div>
            )}

            {aiSuggestion && (
              <Card className="bg-accent/30 border-accent shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-primary" />
                    AI Task Plan Suggestion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm pt-4">
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal block mb-0.5">Task Title:</Label>
                    <div className="p-2 bg-background/70 rounded-md border font-medium">{aiSuggestion.plannedTask.title}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3"> {/* Increased gap-y */}
                     <div>
                        <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><ListChecks className="w-3.5 h-3.5 mr-1"/>Status:</Label>
                        <div className="p-1 bg-background/50 border rounded-sm text-xs w-fit"><Badge variant="outline">{aiSuggestion.plannedTask.status}</Badge></div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><Users className="w-3.5 h-3.5 mr-1"/>AI Suggested Assignee (Workflow/Team):</Label>
                      <div className="p-1 bg-background/50 border border-dashed rounded-sm text-xs">{aiSuggestion.plannedTask.assignedTo}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><CalendarDays className="w-3.5 h-3.5 mr-1"/>Start Date:</Label>
                      <div className="p-1 bg-background/50 border rounded-sm text-xs">{aiSuggestion.plannedTask.startDate ? new Date(aiSuggestion.plannedTask.startDate + 'T00:00:00').toLocaleDateString() : 'Not set'}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><Clock3 className="w-3.5 h-3.5 mr-1"/>Duration:</Label>
                      <div className="p-1 bg-background/50 border rounded-sm text-xs">{aiSuggestion.plannedTask.durationDays} day(s)</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><Milestone className="w-3.5 h-3.5 mr-1"/>Milestone:</Label>
                      <div className="p-1 bg-background/50 border rounded-sm text-xs">{aiSuggestion.plannedTask.isMilestone ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  
                  {aiSuggestion.plannedTask.parentId && aiSuggestion.plannedTask.parentId !== "null" && (
                    <div className="mt-2"> {/* Added mt-2 for spacing */}
                      <Label className="text-muted-foreground text-xs font-normal block mb-0.5 flex items-center"><FolderGit2 className="w-3.5 h-3.5 mr-1"/>Parent Task ID:</Label>
                      <div className="font-mono text-xs bg-muted px-2 py-1 rounded w-fit mt-0.5">{aiSuggestion.plannedTask.parentId}</div>
                    </div>
                  )}
                  {aiSuggestion.plannedTask.dependencies && aiSuggestion.plannedTask.dependencies.length > 0 && (
                    <div className="mt-2"> {/* Added mt-2 for spacing */}
                      <Label className="text-muted-foreground text-xs font-normal block mb-0.5">Dependencies:</Label>
                      <ul className="list-disc list-inside pl-1 mt-0.5">
                        {aiSuggestion.plannedTask.dependencies.map(dep => <li key={dep} className="font-mono text-xs bg-muted px-2 py-1 rounded w-fit my-1">{dep}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  <div className="space-y-1 pt-2">
                    <Label className="text-muted-foreground text-xs font-normal block mb-0.5">Optionally, assign to specific existing workflow:</Label>
                    <Select 
                      onValueChange={(value) => setSelectedWorkflowOverride(value === AI_SUGGESTION_OPTION_VALUE ? undefined : value)} 
                      value={selectedWorkflowOverride === undefined ? AI_SUGGESTION_OPTION_VALUE : selectedWorkflowOverride}
                      disabled={isLoading || !aiSuggestion}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Select a workflow..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AI_SUGGESTION_OPTION_VALUE}>Use AI Suggestion: ({aiSuggestion.plannedTask.assignedTo || "AI to determine"})</SelectItem>
                        {projectWorkflows.map(wf => (
                          <SelectItem key={wf.name} value={wf.name}>{wf.name}</SelectItem>
                        ))}
                         {projectWorkflows.length === 0 && (
                            <div className="p-2 text-center text-muted-foreground text-xs">No project workflows defined yet.</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator className="my-3"/>

                  <div>
                    <Label className="text-muted-foreground text-xs font-normal block mb-1">Detailed AI Reasoning:</Label>
                    <ShadCnCardDescription className="mt-1 p-2 bg-background/70 rounded-md border italic text-xs whitespace-pre-wrap max-h-40 overflow-y-auto"> {/* Added max-h and overflow for reasoning */}
                      {aiSuggestion.reasoning}
                    </ShadCnCardDescription>
                  </div>

                  {aiSuggestion.plannedTask.suggestedSubTasks && aiSuggestion.plannedTask.suggestedSubTasks.length > 0 && (
                    <div className="pt-2">
                      <Label className="text-muted-foreground text-xs font-normal block mb-1">Suggested Sub-Tasks / Steps:</Label>
                      <div className="space-y-2 mt-1 max-h-60 overflow-y-auto border rounded-md p-2 bg-background/50"> {/* Added max-h and overflow for sub-tasks list */}
                        {aiSuggestion.plannedTask.suggestedSubTasks.map((subTask, index) => (
                          <div key={index} className="p-2 bg-background/70 rounded-md border border-dashed">
                            <p className="font-medium text-xs">{index + 1}. {subTask.title}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">Suggested Agent Type: <span className="font-semibold">{subTask.assignedAgentType}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
        </div> {/* End of scrollable middle section */}

        <DialogFooter className="pt-4 border-t"> {/* Footer is outside scrollable section */}
          {!aiSuggestion && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" form="aiPlannerForm" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="mr-2 h-4 w-4" />
                )}
                Plan with AI
              </Button>
            </>
          )}
          {aiSuggestion && (
            <>
              <Button variant="outline" onClick={() => { form.reset(); setAiSuggestion(null); setSelectedWorkflowOverride(undefined); }} disabled={isLoading}>
                Clear & Plan New
              </Button>
              <Button onClick={handleAcceptAndAddTask} disabled={isLoading}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Accept & Add Task to Project
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
