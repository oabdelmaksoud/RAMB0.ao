
'use client';

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
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Agent } from "@/types";

const agentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.string().min(1, "Agent type is required"),
  configString: z.string().optional().refine(val => {
    if (!val || val.trim() === "") return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Configuration must be valid JSON or empty" }),
});

type AgentFormData = z.infer<typeof agentSchema>;

interface EditAgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateAgent: (agent: Agent) => void;
}

const agentTypes = [
  "Analysis Agent",
  "CI/CD Agent",
  "Documentation Agent",
  "Deployment Agent",
  "Testing Agent",
  "Monitoring Agent",
  "Reporting Agent",
  "Notification Agent",
  "Custom Logic Agent",
];

export default function EditAgentDialog({ agent, open, onOpenChange, onUpdateAgent }: EditAgentDialogProps) {
  const { toast } = useToast();
  
  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      type: "",
      configString: "{}",
    },
  });

  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name,
        type: agent.type,
        configString: agent.config ? JSON.stringify(agent.config, null, 2) : "{}",
      });
    } else {
      form.reset({ name: "", type: "", configString: "{}" });
    }
  }, [agent, form, open]); // Added open to dependency array to reset form if agent changes while dialog is open (e.g. quick edit another)

  const onSubmit: SubmitHandler<AgentFormData> = (data) => {
    if (!agent) return;

    let parsedConfig = {};
    if (data.configString && data.configString.trim() !== "") {
      try {
        parsedConfig = JSON.parse(data.configString);
      } catch (e) {
        toast({
          title: "Invalid Configuration",
          description: "The configuration JSON is invalid. Please correct it.",
          variant: "destructive",
        });
        return;
      }
    }

    const updatedAgent: Agent = {
      ...agent, // Preserve id, status, lastActivity
      name: data.name,
      type: data.type,
      config: parsedConfig,
    };
    
    onUpdateAgent(updatedAgent);
    
    toast({
      title: "Agent Updated",
      description: `Agent "${data.name}" has been updated.`,
    });
    onOpenChange(false); // Close dialog on successful update
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        form.reset({ name: "", type: "", configString: "{}"}); // Reset form when dialog is closed by clicking outside or X
      }
    }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Agent: {agent.name}</DialogTitle>
          <DialogDescription>
            Update the configuration for this agent.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Production Deployer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {agentTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="configString" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Configuration (JSON)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder='{ "key": "value" }' 
                      className="min-h-[100px] font-mono text-sm"
                      {...field} 
                    />
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                onOpenChange(false);
                // form.reset(); // useEffect handles reset better based on 'agent' and 'open'
              }}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
