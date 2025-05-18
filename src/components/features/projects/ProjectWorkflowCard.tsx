
'use client';

import React from 'react';
import type { ProjectWorkflow } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Play, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface ProjectWorkflowCardProps {
  workflow: ProjectWorkflow;
  workflowStatusColors: { [key in ProjectWorkflow['status']]: string };
  formatDate: (dateString: string | undefined, formatString?: string) => string;
  onDesignWorkflow: (workflow: ProjectWorkflow) => void;
  onToggleWorkflowStatus: (workflow: ProjectWorkflow) => void;
  onDeleteWorkflow: (workflow: ProjectWorkflow) => void;
}

const ProjectWorkflowCard = React.memo(function ProjectWorkflowCard({
  workflow,
  workflowStatusColors,
  formatDate,
  onDesignWorkflow,
  onToggleWorkflowStatus,
  onDeleteWorkflow
}: ProjectWorkflowCardProps) {
  return (
    <Card key={workflow.id} className="shadow-sm bg-card flex flex-col">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-medium leading-tight truncate">{workflow.name}</CardTitle>
          <Badge variant="outline" className={cn("text-xs capitalize whitespace-nowrap shrink-0", workflowStatusColors[workflow.status])}>
            {workflow.status}
          </Badge>
        </div>
        <CardDescription className="text-xs line-clamp-2 h-[2.2em]">{workflow.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm flex-grow">
        <p className="text-muted-foreground text-xs">
          Last Run: {workflow.lastRun ? formatDate(workflow.lastRun, "MMM d, hh:mm a") : 'Never'}
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Nodes: {workflow.nodes ? workflow.nodes.length : 0}
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Edges: {workflow.edges ? workflow.edges.length : 0}
        </p>
      </CardContent>
      <CardFooter className="p-4 border-t flex gap-2">
        <Button variant="default" size="sm" className="text-xs flex-1" onClick={() => onDesignWorkflow(workflow)}><Settings className="mr-1.5 h-3.5 w-3.5" /> Design</Button>
        <Button
          variant={workflow.status === 'Active' ? 'destructive' : 'outline'}
          size="sm"
          className="text-xs flex-1"
          onClick={() => onToggleWorkflowStatus(workflow)}
        >
          {workflow.status === 'Active' ? <X className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
          {workflow.status === 'Active' ? 'Deactivate' : 'Activate'}
        </Button>
        <Button variant="destructive" size="icon" className="shrink-0 h-8 w-8" onClick={() => onDeleteWorkflow(workflow)} title="Delete Workflow">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete Workflow</span>
        </Button>
      </CardFooter>
    </Card>
  );
});

export default ProjectWorkflowCard;
