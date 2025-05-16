
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
import { PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
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

interface AddAgentDialogProps {
  onAddAgent: (agentData: Omit<Agent, 'id' | 'lastActivity' | 'status'>) => void;
  projectId?: string; // Optional projectId for project-specific suggestions and UI text
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

const getAiSuggestedConfigStorageKey = (projectId?: string): string => {
  if (projectId) {
    return `aiSuggestedAgentConfig_project_${projectId}`;
  }
  return 'aiSuggestedAgentConfig';
};

export default function AddAgentDialog({ onAddAgent, projectId }: AddAgentDialogProps) {
  const [open, setOpen] = useState(false);
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
    if (open) { 
      const storageKey = getAiSuggestedConfigStorageKey(projectId);
      try {
        const storedConfigStr = localStorage.getItem(storageKey);
        if (storedConfigStr) {
          const storedConfig = JSON.parse(storedConfigStr) as { name: string; type: string; configString: string };
          form.reset({
            name: storedConfig.name || "",
            type: storedConfig.type || "",
            configString: storedConfig.configString || "{}",
          });
          localStorage.removeItem(storageKey); 
           toast({
            title: "AI Suggestion Applied",
            description: "Agent details pre-filled from AI suggestion.",
          });
        } else {
           form.reset({ name: "", type: "", configString: "{}" }); 
        }
      } catch (error) {
        console.error("Error reading AI suggested config from localStorage:", error);
        toast({
          title: "Error Applying Suggestion",
          description: "Could not load AI suggested configuration.",
          variant: "destructive",
        });
        form.reset({ name: "", type: "", configString: "{}" }); 
      }
    } else {
       if(!form.formState.isSubmitSuccessful) {
         form.reset({ name: "", type: "", configString: "{}" });
       }
    }
  }, [open, form, toast, projectId]); 

  const onSubmit: SubmitHandler<AgentFormData> = (data) => {
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

    const newAgentData: Omit<Agent, 'id' | 'lastActivity' | 'status'> = {
      name: data.name,
      type: data.type,
      config: parsedConfig,
    };
    
    onAddAgent(newAgentData); // This call is handled by the parent (AgentManagementPage or ProjectDetailPage)
                            // The parent component is responsible for its own toast messages if it wants to override or add project context
    
    // General toast from the dialog itself
    toast({
      title: `Agent "${data.name}" Added`,
      description: projectId 
        ? `The agent has been added to the current project.`
        : `Agent "${data.name}" of type "${data.type}" has been successfully created.`,
    });
    setOpen(false);
    form.reset({ name: "", type: "", configString: "{}" }); 
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Agent{projectId ? ` to Project` : ''}</DialogTitle>
          <DialogDescription>
            Configure a new agent. {projectId ? 'This agent will be specific to the current project.' : ''}
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
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
                setOpen(false);
              }}>Cancel</Button>
              <Button type="submit">Create Agent</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
