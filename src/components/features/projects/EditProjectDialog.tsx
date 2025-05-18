
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
import type { Project, ProjectStatus } from '@/types';
import { projectStatuses } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const projectEditSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").max(100, "Name must be 100 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be 500 characters or less"),
  status: z.enum(projectStatuses as [ProjectStatus, ...ProjectStatus[]]),
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
    defaultValues: {
      name: "",
      description: "",
      status: "Active",
      thumbnailUrl: "",
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
    } else if (!open) {
      form.reset({ name: "", description: "", status: "Active", thumbnailUrl: "" });
    }
  }, [project, open, form]);

  const onSubmit: SubmitHandler<ProjectEditFormData> = (data) => {
    if (!project) return;
    onUpdateProject({
      name: data.name,
      description: data.description,
      status: data.status,
      thumbnailUrl: data.thumbnailUrl || undefined, // Ensure empty string becomes undefined
    });
    onOpenChange(false);
  };

  if (!project && open) return null; // Should not happen if project is set before opening

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Project: {project?.name}</DialogTitle>
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
                      {projectStatuses.map(status => (
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