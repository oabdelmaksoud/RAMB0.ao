
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
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox

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
});

type TaskFormData = z.infer<typeof taskSchema>;

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskToEdit: Task | null;
  onUpdateTask: (taskData: Task) => void;
  isReadOnly?: boolean;
}

const taskStatuses: Task['status'][] = ['To Do', 'In Progress', 'Done', 'Blocked'];

export default function EditTaskDialog({ open, onOpenChange, taskToEdit, onUpdateTask, isReadOnly = false }: EditTaskDialogProps) {
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
    },
  });

  const isMilestoneWatch = form.watch("isMilestone");

  React.useEffect(() => {
    if (isMilestoneWatch && !isReadOnly) {
      form.setValue("durationDays", 0, { shouldValidate: true });
      form.setValue("progress", 0, { shouldValidate: true });
    }
  }, [isMilestoneWatch, form, isReadOnly]);

  React.useEffect(() => {
    if (taskToEdit && open) {
      form.reset({
        title: taskToEdit.title,
        status: taskToEdit.status,
        assignedTo: taskToEdit.assignedTo,
        startDate: taskToEdit.startDate || format(new Date(), 'yyyy-MM-dd'),
        durationDays: taskToEdit.durationDays === undefined ? 1 : taskToEdit.durationDays,
        progress: taskToEdit.progress === undefined ? 0 : taskToEdit.progress,
        isMilestone: taskToEdit.isMilestone || false,
      });
    } else if (!open) {
      form.reset({ 
        title: "",
        status: "To Do",
        assignedTo: "Unassigned",
        startDate: format(new Date(), 'yyyy-MM-dd'),
        durationDays: 1,
        progress: 0,
        isMilestone: false,
      });
    }
  }, [open, taskToEdit, form]);

  const onSubmit: SubmitHandler<TaskFormData> = (data) => {
    if (!taskToEdit || isReadOnly) return; 

    const updatedTask: Task = {
      ...taskToEdit, 
      ...data,      
      durationDays: data.isMilestone ? 0 : (data.durationDays === undefined ? 1 : data.durationDays),
      progress: data.isMilestone ? 0 : (data.progress === undefined ? 0 : data.progress),
    };
    onUpdateTask(updatedTask);
    // onOpenChange(false); // Parent will handle closing
  };


  if (!taskToEdit && open) return null; 

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? 'View Task' : 'Edit Task'}: {taskToEdit?.title}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? 'Viewing task details.' : "Update the details for this task. Click save when you're done."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly || isMilestoneWatch}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {taskStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isMilestoneWatch && <FormDescription className="text-xs">Status set to 'To Do' for milestones.</FormDescription>}
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormDescription className="text-xs">{isMilestoneWatch ? 'Milestone Date.' : 'Optional Start Date.'}</FormDescription>
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
                      <Input type="number" placeholder="e.g., 5" {...field} disabled={isReadOnly || isMilestoneWatch}/>
                    </FormControl>
                     <FormDescription className="text-xs">{isMilestoneWatch ? 'Set to 0 for milestones.' : 'Optional.'}</FormDescription>
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
                    <Input type="number" min="0" max="100" placeholder="e.g., 50" {...field} disabled={isReadOnly || isMilestoneWatch} />
                  </FormControl>
                  <FormDescription className="text-xs">{isMilestoneWatch ? 'Set to 0 for milestones.' : 'Optional (0-100).'}</FormDescription>
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
