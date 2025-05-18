
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Requirement, RequirementStatus, RequirementPriority } from '@/types';
import { requirementStatuses, requirementPriorities } from '@/types';

const requirementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description too long"),
  status: z.enum(requirementStatuses as [RequirementStatus, ...RequirementStatus[]], {
    required_error: "Status is required"
  }),
  priority: z.enum(requirementPriorities as [RequirementPriority, ...RequirementPriority[]], {
    required_error: "Priority is required"
  }),
});

type RequirementFormData = z.infer<typeof requirementSchema>;

interface AddRequirementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddRequirement: (data: Omit<Requirement, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'version'>) => void;
}

export default function AddRequirementDialog({ open, onOpenChange, onAddRequirement }: AddRequirementDialogProps) {
  const form = useForm<RequirementFormData>({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      title: "",
      description: "",
      status: 'Draft',
      priority: 'Medium',
    },
  });

  const onSubmit: SubmitHandler<RequirementFormData> = (data) => {
    onAddRequirement(data);
    form.reset();
    onOpenChange(false);
  };

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        status: 'Draft',
        priority: 'Medium',
      });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Requirement</DialogTitle>
          <DialogDescription>
            Define a new requirement for this project.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="addRequirementForm" className="space-y-4 py-2 flex-grow overflow-y-auto pr-1">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirement Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., User should be able to reset password" {...field} />
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
                      placeholder="Detailed description of the requirement..."
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {requirementStatuses.map(status => (
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
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {requirementPriorities.map(priority => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        <DialogFooter className="pt-4 mt-auto border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="addRequirementForm">Add Requirement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
