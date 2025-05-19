
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
import type { Ticket, TicketStatus, TicketPriority, TicketType, Sprint } from '@/types';
import { ticketTypes, ticketPriorities, ticketStatuses } from '@/types'; 

const NO_SPRINT_VALUE = "__NO_SPRINT_SELECTED__";

const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be 100 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be 1000 characters or less"),
  type: z.enum(ticketTypes as [TicketType, ...TicketType[]], { required_error: "Ticket type is required" }),
  priority: z.enum(ticketPriorities as [TicketPriority, ...TicketPriority[]], { required_error: "Priority is required" }),
  status: z.enum(ticketStatuses as [TicketStatus, ...TicketStatus[]], { required_error: "Status is required" }),
  assignee: z.string().optional(),
  sprintId: z.string().nullable().optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface EditTicketDialogProps {
  ticketToEdit: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTicket: (ticketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'>) => void;
  projectSprints: Sprint[];
}

export default function EditTicketDialog({ ticketToEdit, open, onOpenChange, onUpdateTicket, projectSprints }: EditTicketDialogProps) {
  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
      type: 'Bug',
      priority: 'Medium',
      status: 'Open',
      assignee: "",
      sprintId: NO_SPRINT_VALUE,
    },
  });

  React.useEffect(() => {
    if (ticketToEdit && open) {
      form.reset({
        title: ticketToEdit.title,
        description: ticketToEdit.description,
        type: ticketToEdit.type,
        priority: ticketToEdit.priority,
        status: ticketToEdit.status,
        assignee: ticketToEdit.assignee || "",
        sprintId: ticketToEdit.sprintId ?? NO_SPRINT_VALUE,
      });
    } else if (!open && !form.formState.isSubmitSuccessful) {
      form.reset({ 
        title: "",
        description: "",
        type: 'Bug',
        priority: 'Medium',
        status: 'Open',
        assignee: "",
        sprintId: NO_SPRINT_VALUE,
      });
    }
  }, [open, ticketToEdit, form]);

  const onSubmit: SubmitHandler<TicketFormData> = (data) => {
    if (!ticketToEdit) return;
    const ticketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'> = {
      ...data,
      assignee: data.assignee || undefined,
      sprintId: data.sprintId === NO_SPRINT_VALUE ? null : data.sprintId,
    };
    onUpdateTicket(ticketData);
    onOpenChange(false); 
  };

  if (!ticketToEdit && open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Ticket: {form.watch('title') || ticketToEdit?.title}</DialogTitle>
          <DialogDescription>
            Update the details for this ticket. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="editTicketForm" className="space-y-3 py-2 flex-grow overflow-y-auto pr-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Login button not working on Safari" {...field} />
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
                      placeholder="Provide a detailed description of the issue or request."
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ticketTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ticketPriorities.map(priority => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ticketStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
              name="assignee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Developer Team or specific agent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className="pt-4 border-t mt-auto">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="editTicketForm">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
