
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Task, ProjectWorkflow } from '@/types';
import { planProjectTask, type PlanProjectTaskInput, type PlanProjectTaskOutput } from "@/ai/flows/plan-project-task-flow";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const plannerSchema = z.object({
  userGoal: z.string().min(10, "Please describe your task goal in at least 10 characters.").max(1000, "Goal description is too long."),
});

type PlannerFormData = z.infer<typeof plannerSchema>;

interface AITaskPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectWorkflows: Pick<ProjectWorkflow, 'name' | 'description'>[];
  onTaskPlannedAndAccepted: (taskData: Omit<Task, 'id'>) => void;
}

export default function AITaskPlannerDialog({
  open,
  onOpenChange,
  projectId,
  projectWorkflows,
  onTaskPlannedAndAccepted,
}: AITaskPlannerDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [aiSuggestion, setAiSuggestion] = React.useState<PlanProjectTaskOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<PlannerFormData>({
    resolver: zodResolver(plannerSchema),
    defaultValues: {
      userGoal: "",
    },
  });

  const onSubmit: SubmitHandler<PlannerFormData> = async (data) => {
    setIsLoading(true);
    setAiSuggestion(null);
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
      // The AI flow already structures plannedTask like Omit<Task, 'id'>
      // but we need to ensure all fields Task expects are present, even if null/default
      const taskData: Omit<Task, 'id'> = {
        title: aiSuggestion.plannedTask.title,
        status: aiSuggestion.plannedTask.status || 'To Do',
        assignedTo: aiSuggestion.plannedTask.assignedTo || 'AI Assistant to determine',
        startDate: aiSuggestion.plannedTask.startDate, // AI provides this in YYYY-MM-DD
        durationDays: aiSuggestion.plannedTask.durationDays || 1,
        progress: aiSuggestion.plannedTask.progress || 0,
        isMilestone: aiSuggestion.plannedTask.isMilestone || false,
        parentId: aiSuggestion.plannedTask.parentId || null,
        dependencies: aiSuggestion.plannedTask.dependencies || [],
      };
      onTaskPlannedAndAccepted(taskData);
      onOpenChange(false); // Close dialog after adding
      form.reset();
      setAiSuggestion(null);
    }
  };
  
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setAiSuggestion(null);
      setIsLoading(false);
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>Plan New Task with AI</DialogTitle>
          <DialogDescription>
            Describe your goal, and let the AI assistant help plan the task details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="userGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What do you want to achieve?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'Implement user login with email and password', or 'Design the new homepage mockup'"
                      className="min-h-[100px] resize-y"
                      {...field}
                      disabled={isLoading || !!aiSuggestion}
                    />
                  </FormControl>
                  <FormDescription>Be as specific or general as you like.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!aiSuggestion && (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Plan with AI
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>

        {isLoading && !aiSuggestion && (
          <div className="flex flex-col items-center justify-center space-y-2 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">AI is planning your task...</p>
          </div>
        )}

        {aiSuggestion && (
          <ScrollArea className="max-h-[calc(70vh-250px)] pr-3">
            <Card className="mt-4 bg-accent/30 border-accent shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-primary" />
                  AI Task Plan Suggestion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <strong className="text-muted-foreground">Title:</strong>
                  <p className="p-2 bg-background/70 rounded-md border">{aiSuggestion.plannedTask.title}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <strong className="text-muted-foreground">Status:</strong>
                    <p><Badge variant="outline">{aiSuggestion.plannedTask.status}</Badge></p>
                  </div>
                  <div>
                    <strong className="text-muted-foreground">Assigned To:</strong>
                    <p>{aiSuggestion.plannedTask.assignedTo}</p>
                  </div>
                  <div>
                    <strong className="text-muted-foreground">Start Date:</strong>
                    <p>{aiSuggestion.plannedTask.startDate ? new Date(aiSuggestion.plannedTask.startDate + 'T00:00:00').toLocaleDateString() : 'Not set'}</p>
                  </div>
                  <div>
                    <strong className="text-muted-foreground">Duration:</strong>
                    <p>{aiSuggestion.plannedTask.durationDays} day(s)</p>
                  </div>
                   <div>
                    <strong className="text-muted-foreground">Milestone:</strong>
                    <p>{aiSuggestion.plannedTask.isMilestone ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                 {aiSuggestion.plannedTask.parentId && (
                  <div>
                    <strong className="text-muted-foreground">Parent Task ID:</strong>
                    <p className="font-mono text-xs bg-muted px-2 py-1 rounded w-fit">{aiSuggestion.plannedTask.parentId}</p>
                  </div>
                )}
                 {aiSuggestion.plannedTask.dependencies && aiSuggestion.plannedTask.dependencies.length > 0 && (
                  <div>
                    <strong className="text-muted-foreground">Dependencies:</strong>
                    <ul className="list-disc list-inside pl-1">
                      {aiSuggestion.plannedTask.dependencies.map(dep => <li key={dep} className="font-mono text-xs bg-muted px-2 py-1 rounded w-fit my-1">{dep}</li>)}
                    </ul>
                  </div>
                )}
                <div className="pt-2">
                  <strong className="text-muted-foreground">AI Reasoning:</strong>
                  <p className="mt-1 p-2 bg-background/70 rounded-md border italic text-xs">
                    {aiSuggestion.reasoning}
                  </p>
                </div>
              </CardContent>
            </Card>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => { form.reset(); setAiSuggestion(null); }}>
                Clear & Plan New
              </Button>
              <Button onClick={handleAcceptAndAddTask}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Accept & Add Task to Project
              </Button>
            </DialogFooter>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
