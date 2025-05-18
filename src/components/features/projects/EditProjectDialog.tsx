
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
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Project, ProjectStatus } from '@/types';
import { projectStatuses } from '@/types'; // Ensure this exports `projectStatuses` as a const array
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Explicitly type for Zod enum if projectStatuses is just ProjectStatus[]
const statusEnumValues: [ProjectStatus, ...ProjectStatus[]] = [...projectStatuses] as [ProjectStatus, ...ProjectStatus[]];

const projectEditSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").max(100, "Name must be 100 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be 500 characters or less"),
  status: z.enum(statusEnumValues, { required_error: "Status is required" }),
  thumbnailUrl: z.string().url({ message: "Please enter a valid URL for the thumbnail." }).optional().or(z.literal("")),
});

type ProjectEditFormData = z.infer<typeof projectEditSchema>;

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateProject: (updatedProjectData: Pick<Project, 'name' | 'description' | 'status' | 'thumbnailUrl'>) => void;
}

export default function EditProjectDialog({ project, open, onOpenChange, onUpdateProject }: EditProjectDialogProps) {
  const form = useForm<ProjectEditFormData>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: { // Initial defaults, will be overridden by useEffect if project exists
      name: project?.name || "",
      description: project?.description || "",
      status: project?.status || projectStatuses[0], // Default to first status if project is null initially
      thumbnailUrl: project?.thumbnailUrl || "",
    },
  });

  React.useEffect(() => {
    if (project && open) {
      form.reset({
        name: project.name,
        description: project.description,
        status: project.status,
        thumbnailUrl: project.thumbnailUrl || "",
      });
    }
    // No need to reset if !open and not submitted, as the form re-initializes on next open
  }, [project, open, form]);

  const onSubmit: SubmitHandler<ProjectEditFormData> = (data) => {
    if (!project) {
      return;
    }
    onUpdateProject({
      name: data.name,
      description: data.description,
      status: data.status,
      thumbnailUrl: data.thumbnailUrl || undefined,
    });
    onOpenChange(false);
  }; // End of onSubmit function

  if (!open || !project) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Project: {project?.name || 'Project'}</DialogTitle>
          <DialogDescription>
            Update the details for your project.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="editProjectForm" className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Q4 Marketing Campaign" {...field} />
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
                      placeholder="Briefly describe this project."
                      className="min-h-[80px] resize-y"
                      {...field}
                    />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectStatuses.map(statusValue => (
                        <SelectItem key={statusValue} value={statusValue}>{statusValue}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thumbnail URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
