
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
import type { Task } from '@/types'; // Updated import path for Task
import { format, isValid, parseISO } from 'date-fns';

const taskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be 100 characters or less"),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Blocked'], { required_error: "Status is required" }),
  assignedTo: z.string().min(2, "Assignee must be at least 2 characters").max(50, "Assignee must be 50 characters or less"),
  startDate: z.string().optional().refine(val => !val || isValid(parseISO(val)), {
    message: "Start date must be a valid date (YYYY-MM-DD)."
  }),
  durationDays: z.coerce.number().int().min(0, "Duration must be non-negative").optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (taskData: Omit<Task, 'id'>) => void;
  defaultStartDate?: string;
}

const taskStatuses: Task['status'][] = ['To Do', 'In Progress', 'Done', 'Blocked'];

export default function AddTaskDialog({ open, onOpenChange, onAddTask, defaultStartDate }: AddTaskDialogProps) {
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      status: "To Do",
      assignedTo: "Unassigned",
      startDate: defaultStartDate || format(new Date(), 'yyyy-MM-dd'),
      durationDays: 1,
    },
  });

  const onSubmit: SubmitHandler<TaskFormData> = (data) => {
    onAddTask(data);
    form.reset({ // Reset to defaults after submission
      title: "",
      status: "To Do",
      assignedTo: "Unassigned",
      startDate: defaultStartDate || format(new Date(), 'yyyy-MM-dd'),
      durationDays: 1,
    });
    // onOpenChange(false) is handled by the parent component after onAddTask
  };

  React.useEffect(() => {
    if (open) { // Reset form when dialog is opened (or re-opened)
      form.reset({
        title: "",
        status: "To Do",
        assignedTo: "Unassigned",
        startDate: defaultStartDate || format(new Date(), 'yyyy-MM-dd'),
        durationDays: 1,
      });
    }
  }, [open, form, defaultStartDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Fill in the details for the new task. Click save when you're done.
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
                    <Input placeholder="e.g., Implement user authentication" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>Optional. Format: YYYY-MM-DD</FormDescription>
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
                    <Input type="number" placeholder="e.g., 5" {...field} />
                  </FormControl>
                   <FormDescription>Optional. Number of days the task is expected to take.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Add Task</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
