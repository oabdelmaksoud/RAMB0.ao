
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
import type { Project } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockProjectTemplates } from '@/lib/project-templates'; // Import templates

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").max(100, "Name must be 100 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be 500 characters or less"),
  templateId: z.string().optional(), // To store the ID of the selected template
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProject: (projectData: Omit<Project, 'id' | 'status' | 'lastUpdated' | 'agentCount' | 'workflowCount' >, templateId?: string) => void;
}

export default function AddProjectDialog({ open, onOpenChange, onAddProject }: AddProjectDialogProps) {
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      templateId: mockProjectTemplates[0]?.id || "template-blank", // Default to blank or first template
    },
  });

  const onSubmit: SubmitHandler<ProjectFormData> = (data) => {
    const { templateId, ...projectBaseData } = data;
    onAddProject(projectBaseData, templateId);
    form.reset(); 
    onOpenChange(false);
  };

  React.useEffect(() => {
    if (open) {
      form.reset({ 
        name: "", 
        description: "",
        templateId: mockProjectTemplates[0]?.id || "template-blank",
      });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Enter the details for your new project. You can start from a template.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Template</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockProjectTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - <span className="text-xs text-muted-foreground">{template.description.substring(0,30)}...</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Create Project</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
