
// src/components/features/projects/AddTaskDialog.tsx
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
import { Input } from "@/components/ui/input";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task, Sprint, TaskStatus as AppTaskStatus } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea"; 
import { taskStatuses } from "@/types";

const NO_PARENT_VALUE = "__NO_PARENT_SELECTED__";
const NO_SPRINT_VALUE = "__NO_SPRINT_SELECTED__";

const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be 100 characters or less"),
  status: z.enum(taskStatuses as [AppTaskStatus, ...AppTaskStatus[]], { required_error: "Status is required" }),
  assignedTo: z.string().min(2, "Assignee must be at least 2 characters").max(50, "Assignee must be 50 characters or less"),
  startDate: z.string().optional().refine(val => !val || isValid(parseISO(val)), {
    message: "Start date must be a valid date (YYYY-MM-DD)."
  }),
  durationDays: z.coerce.number().int().min(0, "Duration must be non-negative").optional(),
  progress: z.coerce.number().int().min(0, "Progress must be between 0 and 100").max(100, "Progress must be between 0 and 100").optional(),
  isMilestone: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  dependencies: z.array(z.string()).optional(),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  sprintId: z.string().nullable().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (taskData: Omit<Task, 'id' | 'projectId' | 'isAiPlanned'>) => void;
  defaultStartDate?: string;
  projectTasks: Task[];
  projectSprints: Sprint[];
}

export default function AddTaskDialog({ open, onOpenChange, onAddTask, defaultStartDate, projectTasks, projectSprints }: AddTaskDialogProps) {
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      status: "To Do",
      assignedTo: "Unassigned",
      startDate: defaultStartDate || format(new Date(), 'yyyy-MM-dd'),
      durationDays: 1,
      progress: 0,
      isMilestone: false,
      parentId: NO_PARENT_VALUE,
      dependencies: [],
      description: "",
      sprintId: NO_SPRINT_VALUE,
    },
  });

  const isMilestoneWatch = form.watch("isMilestone");
  const statusWatch = form.watch("status");

  React.useEffect(() => {
    if (isMilestoneWatch) {
      form.setValue("durationDays", 0, { shouldValidate: true });
      if (statusWatch !== 'To Do' && statusWatch !== 'Done' && statusWatch !== 'Blocked') {
        form.setValue("status", "To Do", { shouldValidate: true });
      }
      if (statusWatch === 'Done') {
        form.setValue("progress", 100, { shouldValidate: true });
      } else {
        form.setValue("progress", 0, { shouldValidate: true });
      }
    } else {
      if(form.getValues("durationDays") === 0) {
        form.setValue("durationDays", 1, { shouldValidate: true });
      }
    }
  }, [isMilestoneWatch, statusWatch, form]);

  React.useEffect(() => {
    if (!isMilestoneWatch && statusWatch === 'Done') {
        form.setValue("progress", 100, { shouldValidate: true });
    }
  }, [statusWatch, isMilestoneWatch, form]);


  const onSubmit: SubmitHandler<TaskFormData> = (data) => {
    const taskData: Omit<Task, 'id' | 'projectId' | 'isAiPlanned'> = {
      ...data,
      durationDays: data.isMilestone ? 0 : (data.durationDays === undefined || data.durationDays < 1 ? 1 : Math.max(1, data.durationDays)),
      progress: data.isMilestone ? (data.status === 'Done' ? 100 : 0) : (data.progress === undefined ? 0 : data.progress),
      status: data.isMilestone ? (data.status === 'Done' ? 'Done' : (data.status === 'Blocked' ? 'Blocked' : 'To Do')) : data.status,
      parentId: data.parentId === NO_PARENT_VALUE ? null : data.parentId,
      dependencies: data.dependencies || [],
      description: data.description || "",
      sprintId: data.sprintId === NO_SPRINT_VALUE ? null : data.sprintId,
    };
    onAddTask(taskData);
    form.reset({ 
      title: "",
      status: "To Do",
      assignedTo: "Unassigned",
      startDate: defaultStartDate || format(new Date(), 'yyyy-MM-dd'),
      durationDays: 1,
      progress: 0,
      isMilestone: false,
      parentId: NO_PARENT_VALUE,
      dependencies: [],
      description: "",
      sprintId: NO_SPRINT_VALUE,
    });
    onOpenChange(false); 
  };

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        status: "To Do",
        assignedTo: "Unassigned",
        startDate: defaultStartDate || format(new Date(), 'yyyy-MM-dd'),
        durationDays: 1,
        progress: 0,
        isMilestone: false,
        parentId: NO_PARENT_VALUE,
        dependencies: [],
        description: "",
        sprintId: NO_SPRINT_VALUE,
      });
    }
  }, [open, form, defaultStartDate]);

  const availableParentTasks = projectTasks.filter(task => !task.isMilestone);
  const availableDependencies = projectTasks.filter(task => !task.isMilestone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New {isMilestoneWatch ? 'Milestone' : 'Manual Task'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the new {isMilestoneWatch ? 'milestone' : 'task'}. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-3 -mr-3 py-2"> 
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="addTaskForm" className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Implement user authentication" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isMilestone"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 py-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Mark as Milestone</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isMilestoneWatch && field.value !== 'To Do' && field.value !== 'Done' && field.value !== 'Blocked'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {taskStatuses.map(status => (
                          <SelectItem
                            key={status}
                            value={status}
                            disabled={isMilestoneWatch && status !== 'To Do' && status !== 'Done' && status !== 'Blocked'}
                          >
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isMilestoneWatch && <FormDescription className="text-xs">Milestone status can be 'To Do', 'Done' or 'Blocked'.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="sprintId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sprint (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === NO_SPRINT_VALUE ? null : value)}
                      value={field.value ?? NO_SPRINT_VALUE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Assign to a sprint" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_SPRINT_VALUE}>No Sprint</SelectItem>
                        {projectSprints.map(sprint => (
                          <SelectItem key={sprint.id} value={sprint.id}>{sprint.name} ({sprint.status})</SelectItem>
                        ))}
                         {projectSprints.length === 0 && <p className="p-2 text-xs text-muted-foreground text-center">No sprints defined for this project.</p>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., AI Agent X or Team Member" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a brief description or details..."
                        {...field}
                        className="min-h-[80px] resize-y"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Task (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === NO_PARENT_VALUE ? null : value)}
                      value={field.value ?? NO_PARENT_VALUE}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a parent task" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_PARENT_VALUE}>No Parent</SelectItem>
                        {availableParentTasks.map(task => (
                          <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">Choose an existing task as the parent for this task.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isMilestoneWatch ? 'Milestone Date' : 'Start Date'}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''}/>
                      </FormControl>
                      <FormDescription className="text-xs">{isMilestoneWatch ? 'Date of the milestone.' : 'Optional start date.'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="durationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (Days)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 5" {...field} value={field.value ?? (isMilestoneWatch ? 0 : 1)} disabled={isMilestoneWatch} />
                      </FormControl>
                      <FormDescription className="text-xs">{isMilestoneWatch ? 'Not applicable for milestones.' : 'Optional.'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="progress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Progress (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" placeholder="e.g., 50" {...field} value={field.value ?? (isMilestoneWatch && form.getValues("status") === 'Done' ? 100 : 0)} disabled={isMilestoneWatch && !(form.getValues("status") === 'Done')} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {isMilestoneWatch
                        ? (form.getValues("status") === 'Done' ? "Set to 100% for completed milestones." : "Set to 0% for milestones not yet done.")
                        : "Optional (0-100)."
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dependencies"
                render={() => (
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel>Dependencies (Prerequisites)</FormLabel>
                      <FormDescription className="text-xs">
                        Select tasks that must be completed before this {isMilestoneWatch ? 'milestone' : 'task'} can start.
                      </FormDescription>
                    </div>
                    <ScrollArea className="h-32 w-full rounded-md border p-2 bg-muted/30">
                    {availableDependencies.length > 0 ? (
                      availableDependencies.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="dependencies"
                          render={({ field: checkboxField }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-center space-x-2 space-y-0 py-1.5"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={checkboxField.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? checkboxField.onChange([...(checkboxField.value || []), item.id])
                                        : checkboxField.onChange(
                                            (checkboxField.value || []).filter(
                                              (value) => value !== item.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs font-normal cursor-pointer">
                                  {item.title}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No other non-milestone tasks available to set as dependencies.</p>
                    )}
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter className="pt-4 mt-auto border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="addTaskForm">Add {isMilestoneWatch ? 'Milestone' : 'Task'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
