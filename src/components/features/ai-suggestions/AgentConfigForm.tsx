'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { suggestAgentConfiguration, type SuggestAgentConfigurationInput, type SuggestAgentConfigurationOutput } from '@/ai/flows/suggest-agent-configuration';
import type { Agent } from '@/types';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  taskDescription: z.string().min(10, { message: 'Task description must be at least 10 characters.' }).max(2000),
  historicalPerformanceData: z.string().optional(),
});

type AgentConfigFormData = z.infer<typeof formSchema>;

interface AgentConfigFormProps {
  projectId?: string; // Optional: if provided, suggestions are for this project
  onSuggestionAccepted?: (agentData: Omit<Agent, 'id' | 'status' | 'lastActivity'>) => void;
}

export default function AgentConfigForm({ projectId, onSuggestionAccepted }: AgentConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestAgentConfigurationOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<AgentConfigFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taskDescription: '',
      historicalPerformanceData: '',
    },
  });

  async function onSubmit(data: AgentConfigFormData) {
    setIsLoading(true);
    setSuggestion(null);
    try {
      const input: SuggestAgentConfigurationInput = {
        taskDescription: data.taskDescription,
        historicalPerformanceData: data.historicalPerformanceData || 'No historical data provided.',
      };
      const result = await suggestAgentConfiguration(input);
      setSuggestion(result);
      toast({
        title: 'Suggestion Ready!',
        description: 'AI has generated an agent configuration suggestion.',
      });
    } catch (error) {
      console.error('Error getting suggestion:', error);
      toast({
        title: 'Error',
        description: `Failed to get AI suggestion: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleUseConfiguration = () => {
    if (suggestion?.suggestedAgent && onSuggestionAccepted) {
      const { name, type, config } = suggestion.suggestedAgent;
      onSuggestionAccepted({ name, type, config });
      toast({
        title: 'AI Suggestion Applied!',
        description: `Agent "${name}" has been added to your project agents.`,
      });
      setSuggestion(null); // Clear suggestion after use
    } else if (suggestion?.suggestedAgent) {
      // Fallback for global context (if onSuggestionAccepted is not provided)
      const { name, type, config } = suggestion.suggestedAgent;
      const storedConfig = {
        name,
        type,
        configString: JSON.stringify(config, null, 2)
      };
      const storageKey = 'aiSuggestedAgentConfig'; // Global key
      localStorage.setItem(storageKey, JSON.stringify(storedConfig));
      toast({
        title: 'Configuration Copied!',
        description: "Go to 'Agent Management' and click 'Add New Agent' to use this configuration.",
      });
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Get Agent Configuration Suggestion</CardTitle>
          <CardDescription>Fill in the details below and let AI assist you{projectId ? ` for this project` : ''}.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="taskDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 'Analyze daily sales data and generate a summary report.'"
                        className="min-h-[100px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Clearly describe the task the agent needs to perform.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="historicalPerformanceData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Historical Performance Data (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide context or past data, e.g., 'Similar tasks completed in 2 hours with Agent Type B using 2 CPU cores.'"
                        className="min-h-[100px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Relevant historical data or context can improve suggestion quality.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Suggest Configuration
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {isLoading && (
        <Card className="mt-6 bg-muted/30 border-dashed border-muted-foreground/50 animate-pulse">
          <CardContent className="p-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground">AI is generating your configuration suggestion...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a moment.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && suggestion && (
        <Card className="mt-6 bg-accent/50 border-accent shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-primary" />
              AI Configuration Suggestion
            </CardTitle>
            <CardDescription>Review the AI-generated suggestion below. {onSuggestionAccepted && "You can add this directly to your project agents."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Suggested Agent Name</Label>
              <p className="text-sm p-2 bg-background/70 rounded-md border font-medium">{suggestion.suggestedAgent.name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Suggested Agent Type</Label>
              <p className="text-sm p-2 bg-background/70 rounded-md border">{suggestion.suggestedAgent.type}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Suggested Configuration (JSON)</Label>
              <pre className="mt-1 p-3 bg-background/70 rounded-md border text-xs sm:text-sm overflow-x-auto whitespace-pre-wrap font-mono max-h-40">
                {JSON.stringify(suggestion.suggestedAgent.config, null, 2)}
              </pre>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Reasoning</Label>
              <p className="text-sm p-2 bg-background/70 rounded-md border italic whitespace-pre-wrap max-h-40 overflow-y-auto">{suggestion.reasoning}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Confidence Score</Label>
              <div className="flex items-center gap-2 pt-1">
                <Progress value={suggestion.confidenceScore * 100} className="h-2 w-full sm:w-1/2" aria-label={`Confidence: ${(suggestion.confidenceScore * 100).toFixed(0)}%`} />
                <span className="text-sm font-medium">{(suggestion.confidenceScore * 100).toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6">
            <Button onClick={handleUseConfiguration} disabled={!onSuggestionAccepted}>
              <Send className="mr-2 h-4 w-4" /> Use this Configuration
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  );
}