
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

interface ViewLogsDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ViewLogsDialog({ agent, open, onOpenChange }: ViewLogsDialogProps) {
  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Logs for: {agent.name}</DialogTitle>
          <DialogDescription>
            Showing recent execution logs for agent <span className="font-semibold">{agent.type}</span>.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] w-full rounded-md border p-4 my-4 bg-muted/20 dark:bg-muted/10">
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
