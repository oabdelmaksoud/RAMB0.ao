
'use client';

import type { Agent } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { summarizeAgentPerformance, type SummarizeAgentPerformanceInput, type SummarizeAgentPerformanceOutput } from '@/ai/flows/summarize-agent-performance';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ViewLogsDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewLogsDialog({ agent, open, onOpenChange }: ViewLogsDialogProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Reset summary when dialog is closed or agent changes
    if (!open) {
      setAiSummary(null);
      setIsSummaryLoading(false);
    }
  }, [open]);

  const handleGetAiSummary = async () => {
    if (!agent) return;

    setIsSummaryLoading(true);
    setAiSummary(null);

    try {
      const input: SummarizeAgentPerformanceInput = {
        metrics: JSON.stringify(agent.performance || {}),
        logs: (agent.logs || []).join('\n') || 'No logs provided.',
      };
      const result: SummarizeAgentPerformanceOutput = await summarizeAgentPerformance(input);
      setAiSummary(result.summary);
    } catch (error) {
      console.error('Error getting AI summary:', error);
      toast({
        title: 'Error Generating Summary',
        description: `Failed to get AI summary: ${error instanceof Error ? error.message : 'Unknown error'}.`,
        variant: 'destructive',
      });
    } finally {
      setIsSummaryLoading(false);
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) { // Reset state when dialog closes
        setAiSummary(null);
        setIsSummaryLoading(false);
      }
    }}>
      <DialogContent className="sm:max-w-[625px] md:max-w-[750px] lg:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Logs & Summary for: {agent.name}</DialogTitle>
          <DialogDescription>
            Recent execution logs and AI-powered performance summary for agent <span className="font-semibold">{agent.type}</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6"> {/* Removed max-h from here */}
          <div className="flex flex-col">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Execution Logs</h4>
            {/* Apply fixed height to ScrollArea for logs */}
            <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/20 dark:bg-muted/10">
              {agent.logs && agent.logs.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {agent.logs.map((log, index) => (
                    <li key={index} className="font-mono break-words text-xs">
                      <span className="text-muted-foreground mr-1">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'})}]</span>{log}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-10">No logs available for this agent.</p>
              )}
            </ScrollArea>
          </div>

          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">AI Performance Summary</h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGetAiSummary} 
                disabled={isSummaryLoading}
                className="gap-1.5"
              >
                {isSummaryLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {aiSummary ? 'Regenerate' : 'Get Summary'}
              </Button>
            </div>
            {/* Apply fixed height to ScrollArea for summary */}
            <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/20 dark:bg-muted/10">
              {isSummaryLoading && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Generating summary...</p>
                </div>
              )}
              {!isSummaryLoading && aiSummary && (
                <div className="text-sm whitespace-pre-wrap">{aiSummary}</div>
              )}
              {!isSummaryLoading && !aiSummary && (
                <p className="text-muted-foreground text-center py-10">
                  Click "Get Summary" to generate an AI-powered performance analysis.
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
