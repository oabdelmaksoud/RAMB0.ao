
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
import type { Ticket, TicketStatus, TicketPriority, TicketType } from '@/types';
import { ticketTypes, ticketPriorities, ticketStatuses } from '@/types'; // Import enums

const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be 100 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be 1000 characters or less"),
  type: z.enum(ticketTypes as [TicketType, ...TicketType[]], { required_error: "Ticket type is required" }),
  priority: z.enum(ticketPriorities as [TicketPriority, ...TicketPriority[]], { required_error: "Priority is required" }),
  status: z.enum(ticketStatuses as [TicketStatus, ...TicketStatus[]], { required_error: "Status is required" }),
  assignee: z.string().optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface AddTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTicket: (ticketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'>) => void;
}

export default function AddTicketDialog({ open, onOpenChange, onAddTicket }: AddTicketDialogProps) {
  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
      type: 'Bug',
      priority: 'Medium',
      status: 'Open',
      assignee: "",
    },
  });

  const onSubmit: SubmitHandler<TicketFormData> = (data) => {
    const ticketData: Omit<Ticket, 'id' | 'projectId' | 'createdDate' | 'updatedDate' | 'aiMetadata'> = {
      ...data,
      assignee: data.assignee || undefined, 
    };
    onAddTicket(ticketData);
    form.reset(); 
    onOpenChange(false); // Close dialog after successful submission
  };

  React.useEffect(() => {
    if (open) {
      form.reset({ 
        title: "",
        description: "",
        type: 'Bug',
        priority: 'Medium',
        status: 'Open',
        assignee: "",
      });
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Ticket</DialogTitle>
          <DialogDescription>
            Fill in the details for the new ticket. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} id="addTicketForm" className="space-y-3 py-2 flex-grow overflow-y-auto pr-3">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        <DialogFooter className="pt-4 mt-auto border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="addTicketForm">Add Ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
