
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
import { useRouter } from 'next/navigation'; // For redirection
import type { Agent } from '@/types';

const formSchema = z.object({
  taskDescription: z.string().min(10, { message: 'Task description must be at least 10 characters.' }).max(2000),
  historicalPerformanceData: z.string().optional(),
});

type AgentConfigFormData = z.infer<typeof formSchema>;

const AI_SUGGESTED_CONFIG_KEY = 'aiSuggestedAgentConfig';

export default function AgentConfigForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestAgentConfigurationOutput | null>(null);
  const { toast } = useToast();
  const router = useRouter();

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
    if (suggestion?.suggestedAgent) {
      const { name, type, config } = suggestion.suggestedAgent;
      const storedConfig = {
        name,
        type,
        configString: JSON.stringify(config, null, 2) // Store config as string for Textarea
      };
      try {
        localStorage.setItem(AI_SUGGESTED_CONFIG_KEY, JSON.stringify(storedConfig));
        toast({
          title: 'Configuration Copied!',
          description: 'Redirecting to Agent Management to create the new agent.',
        });
        router.push('/agent-management');
      } catch (e) {
        toast({
          title: 'Error',
          description: 'Could not save suggestion to use later. Your browser might be blocking localStorage.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Get Agent Configuration Suggestion</CardTitle>
          <CardDescription>Fill in the details below and let AI assist you.</CardDescription>
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

      {suggestion && (
        <Card className="mt-6 bg-accent/50 border-accent">
          <CardHeader>
            <CardTitle className="text-lg">AI Suggestion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm">Suggested Agent Name:</h4>
              <p className="text-sm p-2 bg-background rounded-md">{suggestion.suggestedAgent.name}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Suggested Agent Type:</h4>
              <p className="text-sm p-2 bg-background rounded-md">{suggestion.suggestedAgent.type}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Suggested Configuration (JSON):</h4>
              <pre className="mt-1 p-3 bg-background rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(suggestion.suggestedAgent.config, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Reasoning:</h4>
              <p className="text-sm p-2 bg-background rounded-md">{suggestion.reasoning}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Confidence Score:</h4>
              <p className="text-sm p-2 bg-background rounded-md">{(suggestion.confidenceScore * 100).toFixed(0)}%</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleUseConfiguration}>
              <Send className="mr-2 h-4 w-4" /> Use this Configuration
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
