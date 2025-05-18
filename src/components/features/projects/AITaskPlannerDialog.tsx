
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
import type { ProjectWorkflow, WorkflowNode as AppWorkflowNode } from '@/types';
import { planProjectTask, type PlanProjectTaskInput, type PlanProjectTaskOutput, type WorkflowNode as AIWorkflowNode } from "@/ai/flows/plan-project-task-flow";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CheckSquare, ListChecks, CalendarDays, Users, Clock3, Milestone, Brain, FolderGit2, AlertCircle, Settings, InfoIcon, BadgeCheck, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area"; // Keep if needed for specific inner sections

const plannerSchema = z.object({
  userGoal: z.string().min(10, "Please describe your task goal in at least 10 characters.").max(1000, "Goal description is too long."),
  selectedWorkflowId: z.string().optional(),
});

type PlannerFormData = z.infer<typeof plannerSchema>;

interface AITaskPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectWorkflows: Array<{ id: string; name: string; description: string; nodes?: AppWorkflowNode[] }>; // Use AppWorkflowNode
  onTaskPlannedAndAccepted: (aiOutput: PlanProjectTaskOutput) => void;
  initialGoal?: string;
  sourceTicketAssignee?: string;
}

const AI_SUGGESTION_OPTION_VALUE = "__AI_SUGGESTION_AS_IS__";
const NO_WORKFLOW_SELECTED_VALUE = "__NO_WORKFLOW_SELECTED__";

export default function AITaskPlannerDialog({
  open,
  onOpenChange,
  projectId,
  projectWorkflows,
  onTaskPlannedAndAccepted,
  initialGoal,
  sourceTicketAssignee,
}: AITaskPlannerDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [aiSuggestion, setAiSuggestion] = React.useState<PlanProjectTaskOutput | null>(null);
  const [selectedWorkflowOverrideId, setSelectedWorkflowOverrideId] = React.useState<string | undefined>(undefined);
  const [feedbackText, setFeedbackText] = React.useState("");
  const { toast } = useToast();

  const form = useForm<PlannerFormData>({
    resolver: zodResolver(plannerSchema),
    defaultValues: {
      userGoal: initialGoal || "",
      selectedWorkflowId: NO_WORKFLOW_SELECTED_VALUE,
    },
  });

  const resetDialog = React.useCallback(() => {
    form.reset({
      userGoal: initialGoal || "",
      selectedWorkflowId: NO_WORKFLOW_SELECTED_VALUE,
    });
    setAiSuggestion(null);
    setSelectedWorkflowOverrideId(undefined);
    setFeedbackText("");
    setIsLoading(false);
  }, [form, initialGoal]);

  React.useEffect(() => {
    if (open) {
      resetDialog();
    }
  }, [open, resetDialog]);

  const prepareAndRunPlanner = async (currentGoal: string, modificationDetails?: { request: string; previousPlan: PlanProjectTaskOutput }) => {
    setIsLoading(true);
    if (!modificationDetails) {
      setAiSuggestion(null); // Clear previous suggestion only if it's a new plan request
    }
    
    const formValues = form.getValues();
    let selectedWorkflowDetailForAI: PlanProjectTaskInput['selectedWorkflowDetail'] = undefined;
    
    const effectiveSelectedWorkflowId = modificationDetails 
                                        ? (selectedWorkflowOverrideId && selectedWorkflowOverrideId !== AI_SUGGESTION_OPTION_VALUE && selectedWorkflowOverrideId !== NO_WORKFLOW_SELECTED_VALUE ? selectedWorkflowOverrideId : (modificationDetails.previousPlan.plannedTask.assignedTo && projectWorkflows.find(wf => wf.name === modificationDetails.previousPlan.plannedTask.assignedTo)?.id))
                                        : (selectedWorkflowOverrideId && selectedWorkflowOverrideId !== AI_SUGGESTION_OPTION_VALUE && selectedWorkflowOverrideId !== NO_WORKFLOW_SELECTED_VALUE ? selectedWorkflowOverrideId : (formValues.selectedWorkflowId && formValues.selectedWorkflowId !== NO_WORKFLOW_SELECTED_VALUE ? formValues.selectedWorkflowId : undefined));


    if (effectiveSelectedWorkflowId && effectiveSelectedWorkflowId !== NO_WORKFLOW_SELECTED_VALUE) {
      const selectedWfObject = projectWorkflows.find(wf => wf.id === effectiveSelectedWorkflowId);
      if (selectedWfObject) {
        selectedWorkflowDetailForAI = {
          name: selectedWfObject.name,
          description: selectedWfObject.description,
          nodes: (selectedWfObject.nodes || []).map(n => ({ id: n.id, name: n.name, type: n.type })),
        };
      }
    }

    try {
      const input: PlanProjectTaskInput = {
        userGoal: currentGoal,
        projectId,
        projectWorkflows: projectWorkflows.map(wf => ({ name: wf.name, description: wf.description })),
        selectedWorkflowDetail: selectedWorkflowDetailForAI,
        sourceTicketAssignee: sourceTicketAssignee,
        modificationRequest: modificationDetails?.request,
        previousPlan: modificationDetails?.previousPlan,
      };
      console.log("AITaskPlannerDialog: Calling planProjectTask with input:", JSON.stringify(input, null, 2));
      const result = await planProjectTask(input);
      
      if (!result || !result.plannedTask) {
        throw new Error("AI returned an invalid plan. The 'plannedTask' field is missing or malformed.");
      }
      if (typeof result.reasoning !== 'string') {
        result.reasoning = "AI reasoning was not in the expected format.";
      }
       if (!Array.isArray(result.plannedTask.suggestedSubTasks)) {
        result.plannedTask.suggestedSubTasks = [];
      }
      result.plannedTask.suggestedSubTasks = (result.plannedTask.suggestedSubTasks || []).map(st => ({
        title: st.title || "Untitled Sub-task",
        assignedAgentType: st.assignedAgentType || "N/A",
        description: st.description || "No description."
      }));

      setAiSuggestion(result);
      console.log("AI Suggestion Data in Dialog:", JSON.stringify(result, null, 2));
      toast({
        title: modificationDetails ? "AI Plan Modified!" : "AI Task Plan Ready!",
        description: modificationDetails ? "The plan has been updated based on your feedback." : "Review the AI's suggestion below.",
      });
    } catch (error) {
      console.error("Error planning task with AI:", error);
      toast({
        title: "AI Planning Error",
        description: `Failed to get task plan: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      if (!modificationDetails) setAiSuggestion(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmit: SubmitHandler<PlannerFormData> = (data) => {
    prepareAndRunPlanner(data.userGoal);
  };

  const handleRequestModification = () => {
    if (!aiSuggestion || !feedbackText.trim() || !form.getValues("userGoal")) return;
    const previousSuggestionForFlow: PlanProjectTaskOutput = {
        plannedTask: {
            ...aiSuggestion.plannedTask,
             suggestedSubTasks: (aiSuggestion.plannedTask.suggestedSubTasks || []).map(st => ({
                title: st.title || "Untitled Sub-task",
                assignedAgentType: st.assignedAgentType || "N/A",
                description: st.description || "No description."
            }))
        },
        reasoning: aiSuggestion.reasoning,
    };
    prepareAndRunPlanner(form.getValues("userGoal"), { request: feedbackText, previousPlan: previousSuggestionForFlow });
    setFeedbackText("");
  };

  const handleAcceptAndAddTask = () => {
    if (aiSuggestion?.plannedTask) {
      let finalAssignedTo = aiSuggestion.plannedTask.assignedTo;
      
      if (selectedWorkflowOverrideId && selectedWorkflowOverrideId !== AI_SUGGESTION_OPTION_VALUE && selectedWorkflowOverrideId !== NO_WORKFLOW_SELECTED_VALUE) {
        const chosenWorkflow = projectWorkflows.find(wf => wf.id === selectedWorkflowOverrideId);
        if (chosenWorkflow) {
          finalAssignedTo = chosenWorkflow.name;
        }
      } else if (selectedWorkflowOverrideId === NO_WORKFLOW_SELECTED_VALUE) {
        finalAssignedTo = "AI Assistant to determine"; 
      }

      const taskOutputWithOverride: PlanProjectTaskOutput = {
        ...aiSuggestion,
        plannedTask: {
          ...aiSuggestion.plannedTask,
          assignedTo: finalAssignedTo || "AI Assistant to determine",
          parentId: (aiSuggestion.plannedTask.parentId === "null" || aiSuggestion.plannedTask.parentId === "") ? null : aiSuggestion.plannedTask.parentId,
          suggestedSubTasks: (aiSuggestion.plannedTask.suggestedSubTasks || []).map(st => ({
            title: st.title || "Untitled Sub-task",
            assignedAgentType: st.assignedAgentType || "N/A",
            description: st.description || "No description."
          }))
        }
      };
      onTaskPlannedAndAccepted(taskOutputWithOverride);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetDialog();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[800px] flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Plan New Task with AI</DialogTitle>
          <DialogDescription>
            Describe your goal. The AI will consider project workflows and suggest a plan.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {!aiSuggestion && !isLoading && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} id="aiPlannerFormInternal" className="space-y-6">
                <FormField
                  control={form.control}
                  name="userGoal"
                  render={({ field }) => (
                    <FormItem>
                      <RHFFormLabel>What task or goal do you want to achieve?</RHFFormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., 'Implement user login with email and password', or 'Design the new homepage mockup and include ASPICE SYS.1 considerations'"
                          className="min-h-[100px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Be as specific or general as you like.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="selectedWorkflowId"
                  render={({ field }) => (
                    <FormItem>
                      <RHFFormLabel>Guide AI with Existing Workflow (Optional)</RHFFormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === NO_WORKFLOW_SELECTED_VALUE ? undefined : value)}
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
                            <SelectItem key={wf.id} value={wf.id} >
                              {wf.name}
                              <span className="text-muted-foreground/70 text-xs ml-2">({(wf.nodes || []).length} nodes)</span>
                            </SelectItem>
                          ))}
                          {projectWorkflows.length === 0 && (
                            <div className="p-2 text-center text-muted-foreground text-xs">No project workflows defined yet.</div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>Selecting a workflow helps AI align its plan with that workflow's structure and agent types.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-2 py-8 h-full">
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
              <CardContent className="space-y-3 text-sm pt-4 max-h-[calc(90vh-300px)] overflow-y-auto p-2"> {/* Added max-h and overflow for card content */}
                <div>
                  <Label className="text-muted-foreground text-xs font-normal block mb-0.5">Task Title:</Label>
                  <p className="p-2 bg-background/70 rounded-md border font-medium break-words">{aiSuggestion.plannedTask.title || "N/A"}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><ListChecks className="w-3.5 h-3.5 mr-1" />Status:</Label>
                    <div className="mt-0.5">
                       <Badge variant="outline" className="font-normal">{aiSuggestion.plannedTask.status || "N/A"}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><Users className="w-3.5 h-3.5 mr-1" />AI Suggested Assignee:</Label>
                    <p className="p-1 bg-background/50 border border-dashed rounded-sm text-xs">{aiSuggestion.plannedTask.assignedTo || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><CalendarDays className="w-3.5 h-3.5 mr-1" />Start Date:</Label>
                    <p className="p-1 bg-background/50 border rounded-sm text-xs">{(aiSuggestion.plannedTask.startDate && aiSuggestion.plannedTask.startDate !== "N/A") ? new Date(aiSuggestion.plannedTask.startDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><Clock3 className="w-3.5 h-3.5 mr-1" />Duration (AI Est.):</Label>
                    <p className="p-1 bg-background/50 border rounded-sm text-xs">{aiSuggestion.plannedTask.durationDays === undefined ? 'N/A' : `${aiSuggestion.plannedTask.durationDays} day(s)`}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><Milestone className="w-3.5 h-3.5 mr-1" />Milestone:</Label>
                    <p className="p-1 bg-background/50 border rounded-sm text-xs">{aiSuggestion.plannedTask.isMilestone ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs font-normal flex items-center mb-0.5"><FolderGit2 className="w-3.5 h-3.5 mr-1" />Parent Task ID:</Label>
                    <p className="p-1 bg-background/50 border rounded-sm text-xs font-mono">{(aiSuggestion.plannedTask.parentId && aiSuggestion.plannedTask.parentId !== "null") ? aiSuggestion.plannedTask.parentId : "None"}</p>
                  </div>
                  {(aiSuggestion.plannedTask.dependencies && aiSuggestion.plannedTask.dependencies.length > 0) && (
                    <div className="sm:col-span-2">
                      <Label className="text-muted-foreground text-xs font-normal block mb-0.5">Dependencies:</Label>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {aiSuggestion.plannedTask.dependencies.map((dep, index) =>
                          <Badge key={`${dep}-${index}`} variant="secondary" className="font-mono text-xs">{dep.slice(0, 8)}...</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <Separator className="my-3" />

                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs font-normal block mb-0.5">Override Assignee with Existing Workflow (Optional):</Label>
                  <Select
                    onValueChange={(value) => setSelectedWorkflowOverrideId(value === AI_SUGGESTION_OPTION_VALUE ? undefined : (value === NO_WORKFLOW_SELECTED_VALUE ? NO_WORKFLOW_SELECTED_VALUE : value))}
                    value={selectedWorkflowOverrideId === undefined ? AI_SUGGESTION_OPTION_VALUE : (selectedWorkflowOverrideId === NO_WORKFLOW_SELECTED_VALUE ? NO_WORKFLOW_SELECTED_VALUE : selectedWorkflowOverrideId)}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Use AI's suggestion / No override" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AI_SUGGESTION_OPTION_VALUE}>Use AI's default assignee suggestion</SelectItem>
                      <SelectItem value={NO_WORKFLOW_SELECTED_VALUE}>No specific workflow (AI to determine team)</SelectItem>
                      {projectWorkflows.map(wf => (
                        <SelectItem key={wf.id} value={wf.id} >
                          {wf.name}
                          <span className="text-muted-foreground/70 text-xs ml-2">({(wf.nodes || []).length} nodes)</span>
                        </SelectItem>
                      ))}
                      {projectWorkflows.length === 0 && (
                        <div className="p-2 text-center text-muted-foreground text-xs">No project workflows defined yet to override with.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-3" />
                <div className="pt-1">
                  <Label className="text-muted-foreground text-xs font-normal block mb-1 flex items-center"><InfoIcon className="w-3.5 h-3.5 mr-1" />Detailed AI Reasoning:</Label>
                  <ShadCnCardDescription className="mt-1 p-2 bg-background/70 rounded-md border italic text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {aiSuggestion.reasoning || "No reasoning provided."}
                  </ShadCnCardDescription>
                </div>

                {aiSuggestion.plannedTask.suggestedSubTasks && aiSuggestion.plannedTask.suggestedSubTasks.length > 0 && (
                  <div className="pt-2">
                    <Label className="text-muted-foreground text-xs font-normal block mb-1">Suggested Sub-Tasks / Steps by AI Agents:</Label>
                    <div className="space-y-2 mt-1 max-h-60 overflow-y-auto border rounded-md p-2 bg-background/50">
                      {aiSuggestion.plannedTask.suggestedSubTasks.map((subTask, index) => (
                        <div key={`${subTask.title?.replace(/\s+/g, '-') || 'subtask'}-${index}`} className="p-2 bg-background/70 rounded-md border border-dashed">
                          <p className="font-medium text-xs">{index + 1}. {subTask.title || "Untitled Sub-task"}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">Suggested Agent Type: <span className="font-semibold">{subTask.assignedAgentType || "N/A"}</span></p>
                          <p className="text-muted-foreground text-xs mt-0.5 whitespace-pre-wrap">Description: <span className="italic">{subTask.description || "N/A"}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Separator className="my-3" />
                  <div className="space-y-2">
                  <Label htmlFor="feedbackText" className="text-muted-foreground text-xs font-normal block mb-0.5">Feedback for Modification:</Label>
                  <Textarea
                    id="feedbackText"
                    placeholder="e.g., 'Change duration to 5 days', 'Assign to a different workflow', 'Add a sub-task for QA review'"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="min-h-[60px] resize-y text-sm"
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => { onOpenChange(false); }} disabled={isLoading}>
            Cancel
          </Button>
          {!aiSuggestion && !isLoading && (
            <Button
              type="submit"
              form="aiPlannerFormInternal" 
              disabled={isLoading || !form.formState.isValid || form.formState.isSubmitting}
            >
              <Brain className="mr-2 h-4 w-4" />
              Plan with AI
            </Button>
          )}
          {aiSuggestion && !isLoading && (
            <>
              <Button 
                onClick={handleRequestModification} 
                disabled={isLoading || !feedbackText.trim()}
                variant="secondary"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Request Modification
              </Button>
              <Button onClick={handleAcceptAndAddTask} disabled={isLoading}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Accept & Add Task
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
