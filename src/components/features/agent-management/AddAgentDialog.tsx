'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const agentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.string().min(1, "Agent type is required"),
  config: z.string().optional().refine(val => {
    if (!val || val.trim() === "") return true; // Allow empty or whitespace only
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Configuration must be valid JSON or empty" }),
});

type AgentFormData = z.infer<typeof agentSchema>;

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

export default function AddAgentDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      type: "",
      config: "{}",
    },
  });

  const onSubmit: SubmitHandler<AgentFormData> = (data) => {
    // Placeholder for actual submission logic
    console.log("New Agent Data:", data);
    toast({
      title: "Agent Created (Simulated)",
      description: `Agent "${data.name}" of type "${data.type}" has been added.`,
    });
    setOpen(false);
    form.reset(); 
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Agent</DialogTitle>
          <DialogDescription>
            Configure a new agent to automate tasks in your projects.
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
              name="config"
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create Agent</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
