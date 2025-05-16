
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
import type { Task } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
import { Checkbox } from "@/components/ui/checkbox";

const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be 100 characters or less"),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Blocked'], { required_error: "Status is required" }),
  assignedTo: z.string().min(2, "Assignee must be at least 2 characters").max(50, "Assignee must be 50 characters or less"),
  startDate: z.string().optional().refine(val => !val || isValid(parseISO(val)), {
    message: "Start date must be a valid date (YYYY-MM-DD)."
  }),
  durationDays: z.coerce.number().int().min(0, "Duration must be non-negative").optional(),
  progress: z.coerce.number().int().min(0, "Progress must be between 0 and 100").max(100, "Progress must be between 0 and 100").optional(),
  isMilestone: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskToEdit: Task | null;
  onUpdateTask: (taskData: Task) => void;
  isReadOnly?: boolean;
  projectTasks: Task[];
}

const taskStatuses: Task['status'][] = ['To Do', 'In Progress', 'Done', 'Blocked'];
const NO_PARENT_VALUE = "__NO_PARENT_SELECTED__";

export default function EditTaskDialog({ open, onOpenChange, taskToEdit, onUpdateTask, isReadOnly = false, projectTasks }: EditTaskDialogProps) {
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      status: "To Do",
      assignedTo: "Unassigned",
      startDate: format(new Date(), 'yyyy-MM-dd'),
      durationDays: 1,
      progress: 0,
      isMilestone: false,
      parentId: null,
    },
  });

  const isMilestoneWatch = form.watch("isMilestone");
  const statusWatch = form.watch("status");

  React.useEffect(() => {
    if (taskToEdit && open) {
      const initialParentId = taskToEdit.parentId === undefined ? null : taskToEdit.parentId;
      form.reset({
        title: taskToEdit.title,
        status: taskToEdit.status,
        assignedTo: taskToEdit.assignedTo,
        startDate: taskToEdit.startDate ? format(parseISO(taskToEdit.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        durationDays: taskToEdit.durationDays === undefined ? (taskToEdit.isMilestone ? 0 : 1) : taskToEdit.durationDays,
        progress: taskToEdit.progress === undefined ? (taskToEdit.isMilestone && taskToEdit.status === 'Done' ? 100 : 0) : taskToEdit.progress,
        isMilestone: taskToEdit.isMilestone || false,
        parentId: initialParentId,
      });
    } else if (!open && !form.formState.isSubmitSuccessful) {
      form.reset({ 
        title: "",
        status: "To Do",
        assignedTo: "Unassigned",
        startDate: format(new Date(), 'yyyy-MM-dd'),
        durationDays: 1,
        progress: 0,
        isMilestone: false,
        parentId: null,
      });
    }
  }, [open, taskToEdit, form]);

  React.useEffect(() => {
    if (!isReadOnly) {
      if (isMilestoneWatch) {
        form.setValue("durationDays", 0, { shouldValidate: true });
        // For milestones being edited, allow 'To Do' or 'Done'
        if (form.getValues("status") !== 'To Do' && form.getValues("status") !== 'Done') {
          form.setValue("status", "To Do", { shouldValidate: true });
        }
        if (form.getValues("status") === 'Done') {
            form.setValue("progress", 100, { shouldValidate: true });
        } else {
            form.setValue("progress", 0, { shouldValidate: true });
        }
      }
    }
  }, [isMilestoneWatch, form, isReadOnly]);
  
  React.useEffect(() => {
    if (!isReadOnly && isMilestoneWatch && statusWatch === 'Done') {
        form.setValue("progress", 100, { shouldValidate: true });
    } else if (!isReadOnly && isMilestoneWatch && statusWatch === 'To Do') {
        form.setValue("progress", 0, { shouldValidate: true });
    }
  }, [statusWatch, isMilestoneWatch, form, isReadOnly]);


  const onSubmit: SubmitHandler<TaskFormData> = (data) => {
    if (!taskToEdit || isReadOnly) return; 

    const updatedTask: Task = {
      ...taskToEdit, 
      ...data,      
      durationDays: data.isMilestone ? 0 : (data.durationDays === undefined ? 1 : data.durationDays),
      progress: data.isMilestone ? (data.status === 'Done' ? 100 : 0) : (data.progress === undefined ? 0 : data.progress),
      status: data.isMilestone ? (data.status === 'Done' ? 'Done' : 'To Do') : data.status, // Status for milestone can be To Do or Done
      parentId: data.parentId, // Already null if "No Parent" was selected
    };
    onUpdateTask(updatedTask);
  };

  if (!taskToEdit && open) return null; 

  const availableParentTasks = projectTasks.filter(pt => pt.id !== taskToEdit?.id && !pt.isMilestone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? `View ${taskToEdit?.isMilestone ? 'Milestone' : 'Task'}` : `Edit ${taskToEdit?.isMilestone ? 'Milestone' : 'Task'}`}: {taskToEdit?.title}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? `Viewing ${taskToEdit?.isMilestone ? 'milestone' : 'task'} details.` : `Update the details for this ${taskToEdit?.isMilestone ? 'milestone' : 'task'}. Click save when you're done.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Implement user authentication" {...field} disabled={isReadOnly} />
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
                      disabled={isReadOnly}
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
                    disabled={isReadOnly || (isMilestoneWatch && field.value !== 'To Do' && field.value !== 'Done')}
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
                          disabled={isMilestoneWatch && status !== 'To Do' && status !== 'Done'}
                        >
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isMilestoneWatch && <FormDescription className="text-xs">Milestone status can be 'To Do' or 'Done'.</FormDescription>}
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
                    <Input placeholder="e.g., AI Agent X or Team Member" {...field} disabled={isReadOnly} />
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
                    disabled={isReadOnly}
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
                      <Input type="date" {...field} value={field.value || ''} disabled={isReadOnly} />
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
                      <Input type="number" placeholder="e.g., 5" {...field} value={field.value ?? (isMilestoneWatch ? 0 : 1)} disabled={isReadOnly || isMilestoneWatch}/>
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
                    <Input type="number" min="0" max="100" placeholder="e.g., 50" {...field} value={field.value ?? (isMilestoneWatch ? 0 : 0)} disabled={isReadOnly || (isMilestoneWatch && !(form.getValues("status") === 'Done'))} />
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{isReadOnly ? 'Close' : 'Cancel'}</Button>
              {!isReadOnly && <Button type="submit">Save Changes</Button>}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
