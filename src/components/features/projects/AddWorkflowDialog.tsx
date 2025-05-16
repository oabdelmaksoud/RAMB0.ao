
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
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const workflowSchema = z.object({
  name: z.string().min(3, "Workflow name must be at least 3 characters").max(100, "Name must be 100 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be 500 characters or less"),
});

type WorkflowFormData = z.infer<typeof workflowSchema>;

interface AddWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWorkflow: (workflowData: { name: string; description: string }) => void;
}

export default function AddWorkflowDialog({ open, onOpenChange, onAddWorkflow }: AddWorkflowDialogProps) {
  const form = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit: SubmitHandler<WorkflowFormData> = (data) => {
    onAddWorkflow(data);
    form.reset(); 
    // onOpenChange(false) will be handled by the parent after onAddWorkflow
  };

  React.useEffect(() => {
    if (open) {
      form.reset({ name: "", description: "" }); // Reset form when dialog is opened
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Project Workflow</DialogTitle>
          <DialogDescription>
            Define a new workflow for this project. You can design its steps later.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workflow Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Nightly Data Processing" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the purpose of this workflow."
                      className="min-h-[80px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Add Workflow</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

