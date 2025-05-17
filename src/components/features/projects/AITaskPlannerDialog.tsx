
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
import type { ProjectWorkflow, Task, WorkflowNode } from '@/types';
import { planProjectTask, type PlanProjectTaskInput, type PlanProjectTaskOutput } from "@/ai/flows/plan-project-task-flow";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CheckSquare, ListChecks, CalendarDays, Users, Clock3, Milestone, Brain, FolderGit2, AlertCircle, Settings, InfoIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const plannerSchema = z.object({
  userGoal: z.string().min(10, "Please describe your task goal in at least 10 characters.").max(1000, "Goal description is too long."),
  selectedWorkflowName: z.string().optional(),
});

type PlannerFormData = z.infer<typeof plannerSchema>;

interface AITaskPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectWorkflows: ProjectWorkflow[];
  onTaskPlannedAndAccepted: (aiOutput: PlanProjectTaskOutput) => void;
}

const AI_SUGGESTION_OPTION_VALUE = "__AI_SUGGESTION_AS_IS__";
const NO_WORKFLOW_SELECTED_VALUE = "__NO_WORKFLOW_SELECTED__";

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
      selectedWorkflowName: NO_WORKFLOW_SELECTED_VALUE,
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

    let selectedWorkflowDetailForAI: PlanProjectTaskInput['selectedWorkflowDetail'] = undefined;
    if (data.selectedWorkflowName && data.selectedWorkflowName !== NO_WORKFLOW_SELECTED_VALUE) {
      const selectedWfObject = projectWorkflows.find(wf => wf.name === data.selectedWorkflowName);
      if (selectedWfObject) {
        selectedWorkflowDetailForAI = {
          name: selectedWfObject.name,
          description: selectedWfObject.description,
          nodes: selectedWfObject.nodes?.map(n => ({ id: n.id, name: n.name, type: n.type })) || [],
        };
      }
    }

    try {
      const input: PlanProjectTaskInput = {
        userGoal: data.userGoal,
        projectId,
        projectWorkflows: projectWorkflows.map(wf => ({ name: wf.name, description: wf.description })),
        selectedWorkflowDetail: selectedWorkflowDetailForAI,
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
      let finalAssignedTo = aiSuggestion.plannedTask.assignedTo;
      if (selectedWorkflowOverride && selectedWorkflowOverride !== AI_SUGGESTION_OPTION_VALUE) {
        finalAssignedTo = selectedWorkflowOverride;
      }
      
      const taskOutputWithOverride: PlanProjectTaskOutput = {
        ...aiSuggestion,
        plannedTask: {
          ...aiSuggestion.plannedTask,
          assignedTo: finalAssignedTo || "AI Assistant to determine",
        }
      };
      onTaskPlannedAndAccepted(taskOutputWithOverride);
      onOpenChange(false); 
    }
  };

  React.useEffect(() => {
    if (!open) {
      form.reset({ userGoal: "", selectedWorkflowName: NO_WORKFLOW_SELECTED_VALUE });
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
            Describe your goal. Optionally, select an existing workflow to guide the AI's planning.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4"> {/* This div will scroll */}
          {!aiSuggestion && !isLoading && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} id="aiPlannerFormInternal" className="space-y-4">
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
                        />
                      </FormControl>
                      <FormDescription>Be as specific or general as you like. The AI will consider your project's workflows.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="selectedWorkflowName"
                  render={({ field }) => (
                    <FormItem>
                      <RHFFormLabel>Target Workflow (Optional)</RHFFormLabel>
                       <Select
                          onValueChange={field.onChange}
                          value={field.value || NO_WORKFLOW_SELECTED_VALUE}
                       >
                        <FormControl>
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder="Let AI decide / No specific workflow" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_WORKFLOW_SELECTED_VALUE}>Let AI decide / No specific workflow</SelectItem>
                          {projectWorkflows.map(wf => (
                            <SelectItem key={wf.id} value={wf.name}>
                              {wf.name}
                              <span className="text-muted-foreground/70 text-xs ml-2">
                                ({wf.nodes?.length || 0} nodes)
                              </span>
                            </SelectItem>
                          ))}
                          {projectWorkflows.length === 0 && (
                            <div className="p-2 text-center text-muted-foreground text-xs">No project workflows defined yet.</div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>Selecting a workflow helps the AI align its plan with existing processes and its defined agent nodes.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-2 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">AI is planning your task...</p>
              <p className="text-xs text-muted-foreground mt-2">This may take a moment. Please wait.</p>
            </div>
          )}

          {aiSuggestion && aiSuggestion.plannedTask && !isLoading && (
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
                  <p className="p-2 bg-background/70 rounded-md border font-medium">{aiSuggestion.plannedTask.title || "N/A"}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                   <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><ListChecks className="w-3.5 h-3.5 mr-1" />Status:</Label>
                    <div className="mt-0.5">
                      <Badge variant="outline">{aiSuggestion.plannedTask.status || "N/A"}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><Users className="w-3.5 h-3.5 mr-1" />AI Suggested Assignee (Workflow/Team):</Label>
                    <p className="p-1 bg-background/50 border border-dashed rounded-sm text-xs">{aiSuggestion.plannedTask.assignedTo || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><CalendarDays className="w-3.5 h-3.5 mr-1" />Start Date:</Label>
                    <p className="p-1 bg-background/50 border rounded-sm text-xs">{(aiSuggestion.plannedTask.startDate && aiSuggestion.plannedTask.startDate !== "N/A") ? new Date(aiSuggestion.plannedTask.startDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><Clock3 className="w-3.5 h-3.5 mr-1" />Duration:</Label>
                    <p className="p-1 bg-background/50 border rounded-sm text-xs">{aiSuggestion.plannedTask.durationDays === undefined ? 'N/A' : `${aiSuggestion.plannedTask.durationDays} day(s)`}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><Milestone className="w-3.5 h-3.5 mr-1" />Milestone:</Label>
                    <p className="p-1 bg-background/50 border rounded-sm text-xs">{aiSuggestion.plannedTask.isMilestone ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><FolderGit2 className="w-3.5 h-3.5 mr-1" />Parent Task ID:</Label>
                    <div className="font-mono text-xs bg-muted px-2 py-1 rounded w-fit mt-0.5">{aiSuggestion.plannedTask.parentId || "None"}</div>
                  </div>
                </div>
                 {(aiSuggestion.plannedTask.dependencies && aiSuggestion.plannedTask.dependencies.length > 0) && (
                  <div className="mt-2">
                    <Label className="text-muted-foreground text-xs font-normal block mb-0.5">Dependencies:</Label>
                    <ul className="list-disc list-inside pl-1 mt-0.5">
                      {aiSuggestion.plannedTask.dependencies.map(dep => <li key={dep} className="font-mono text-xs bg-muted px-2 py-1 rounded w-fit my-1">{dep}</li>)}
                    </ul>
                  </div>
                )}

                <Separator className="my-3"/>
                 <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs font-normal block mb-0.5">Override Assignee with Existing Workflow (Optional):</Label>
                  <Select
                    onValueChange={(value) => setSelectedWorkflowOverride(value === AI_SUGGESTION_OPTION_VALUE ? undefined : value)}
                    value={selectedWorkflowOverride === undefined ? AI_SUGGESTION_OPTION_VALUE : selectedWorkflowOverride}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Use AI's suggestion / No override" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AI_SUGGESTION_OPTION_VALUE}>Use AI's default assignee suggestion</SelectItem>
                      {projectWorkflows.map(wf => (
                        <SelectItem key={wf.id} value={wf.name}>
                            {wf.name}
                            <span className="text-muted-foreground/70 text-xs ml-2">({wf.nodes?.length || 0} nodes)</span>
                        </SelectItem>
                      ))}
                      {projectWorkflows.length === 0 && (
                        <div className="p-2 text-center text-muted-foreground text-xs">No project workflows defined yet to override with.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-3"/>
                <div className="pt-1">
                  <Label className="text-muted-foreground text-xs font-normal block mb-1 flex items-center"><InfoIcon className="w-3.5 h-3.5 mr-1"/>Detailed AI Reasoning:</Label>
                  <ShadCnCardDescription className="mt-1 p-2 bg-background/70 rounded-md border italic text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {aiSuggestion.reasoning || "No reasoning provided."}
                  </ShadCnCardDescription>
                </div>

                {aiSuggestion.plannedTask.suggestedSubTasks && aiSuggestion.plannedTask.suggestedSubTasks.length > 0 && (
                  <div className="pt-2">
                    <Label className="text-muted-foreground text-xs font-normal block mb-1">Suggested Sub-Tasks / Steps by AI Agents:</Label>
                    <div className="space-y-2 mt-1 max-h-60 overflow-y-auto border rounded-md p-2 bg-background/50">
                      {aiSuggestion.plannedTask.suggestedSubTasks.map((subTask, index) => (
                        <div key={`${subTask.title}-${index}`} className="p-2 bg-background/70 rounded-md border border-dashed">
                          <p className="font-medium text-xs">{index + 1}. {subTask.title || "Untitled Sub-task"}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">Suggested Agent Type: <span className="font-semibold">{subTask.assignedAgentType || "N/A"}</span></p>
                          <p className="text-muted-foreground text-xs mt-0.5 whitespace-pre-wrap">Description: <span className="italic">{subTask.description || "N/A"}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          {!aiSuggestion && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isLoading || !form.formState.isValid || form.formState.isSubmitting}
              >
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
              <Button variant="outline" onClick={() => { form.reset({ userGoal: "", selectedWorkflowName: NO_WORKFLOW_SELECTED_VALUE }); setAiSuggestion(null); setSelectedWorkflowOverride(undefined); setIsLoading(false); }} disabled={isLoading}>
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

