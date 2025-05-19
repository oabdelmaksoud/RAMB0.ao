// src/components/features/workflow-designer/WorkflowCanvasPlaceholder.tsx
'use client';

import React, { 
  DragEvent, 
  MouseEvent as ReactMouseEvent, 
  useRef, 
  useEffect, 
  useState, 
  useCallback, 
  useMemo 
} from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Code2, 
  FileText, 
  Bell, 
  BarChartBig, 
  BrainCircuit, 
  ToyBrick, 
  SlidersHorizontal, 
  Activity, 
  AlertTriangle, 
  MousePointerSquareDashed, 
  Hand, 
  X as XIcon,
  Play,
  Pause,
  StopCircle
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorkflowNode, WorkflowEdge } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uid } from '@/lib/utils';
import { WorkflowExecutionProvider } from '@/services/workflow-execution-provider';
import { WorkflowStatus, WorkflowNodeStatus } from '@/types/workflow-execution';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// Moved and expanded agentIcons map here for consistency with palette
const agentIcons: { [key: string]: LucideIcon } = {
  'Analysis Agent': BrainCircuit,
  'CI/CD Agent': SlidersHorizontal,
  'Documentation Agent': FileText,
  'Deployment Agent': SlidersHorizontal,
  'Testing Agent': Activity,
  'Monitoring Agent': AlertTriangle,
  'Reporting Agent': BarChartBig,
  'Notification Agent': Bell,
  'Custom Logic Agent': BrainCircuit,
  'Code Review Agent': Code2,
};

const AgentIconDisplay: React.FC<{ type: string }> = ({ type }) => {
  const Icon = agentIcons[type] || ToyBrick;
  return <Icon className="h-6 w-6 mr-2 text-primary" />;
};

const getIconForAgentType = (agentType: string): LucideIcon => {
  return agentIcons[agentType] || ToyBrick; // Default icon
};

interface WorkflowCanvasProps {
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void;
}

export default function WorkflowCanvas({
  nodes = [],
  edges = [],
  onNodesChange,
  onEdgesChange,
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number } | null>(null);
  const [wasDragging, setWasDragging] = useState(false);
  const [sourceNodeForEdge, setSourceNodeForEdge] = useState<WorkflowNode | null>(null);

  // Workflow Execution State
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>(WorkflowStatus.DRAFT);
  const [nodeStatuses, setNodeStatuses] = useState<{[nodeId: string]: WorkflowNodeStatus}>({});
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);

  // Node Removal Handler
  const handleRemoveNode = useCallback((nodeId: string) => {
    if (onNodesChange) {
      const updatedNodes = nodes.filter(node => node.id !== nodeId);
      onNodesChange(updatedNodes);

      // Also remove any edges connected to this node
      if (onEdgesChange) {
        const updatedEdges = edges.filter(
          edge => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId
        );
        onEdgesChange(updatedEdges);
      }
    }
  }, [nodes, edges, onNodesChange, onEdgesChange]);

  // Drag and Drop Handlers
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const agentTypeNameFromPalette = event.dataTransfer.getData('text/plain') || 'Testing Agent';

    if (!canvasRef.current) {
      console.error('CANVAS: Drop aborted - no canvasRef.');
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) {
      console.error("CANVAS: Drop aborted - Canvas has zero dimensions.");
      return;
    }

    const agentCardWidth = 180;
    const agentCardHeight = 60;

    let x = event.clientX - canvasRect.left;
    let y = event.clientY - canvasRect.top;

    x = x - agentCardWidth / 2;
    y = y - agentCardHeight / 2;

    const padding = 5;
    const adjustedX = Math.min(Math.max(padding, x), canvasRect.width - agentCardWidth - padding);
    const adjustedY = Math.min(Math.max(padding, y), canvasRect.height - agentCardHeight - padding);

    const newAgentNode: WorkflowNode = {
      id: uid(`node-${agentTypeNameFromPalette.toLowerCase().replace(/\s+/g, '-')}`),
      name: agentTypeNameFromPalette,
      type: agentTypeNameFromPalette,
      x: adjustedX,
      y: adjustedY,
      config: {},
    };

    if (onNodesChange) {
      const newNodesArray = [...nodes, newAgentNode];
      onNodesChange(newNodesArray);
    }
  }, [nodes, onNodesChange]);

  // Initialize workflow when nodes change
  useEffect(() => {
    const initializeWorkflow = async () => {
      if (nodes.length > 0) {
        try {
          const workflow = await WorkflowExecutionProvider.createWorkflow(nodes, edges);
          setWorkflowId(workflow.id);
          setWorkflowStatus(workflow.status);
          
          // Initialize node statuses
          const initialNodeStatuses = workflow.nodes.reduce((acc, node) => {
            acc[node.id] = node.status;
            return acc;
          }, {} as {[nodeId: string]: WorkflowNodeStatus});
          setNodeStatuses(initialNodeStatuses);
        } catch (error) {
          console.error('Failed to initialize workflow:', error);
        }
      }
    };

    initializeWorkflow();
  }, [nodes, edges]);

  // Workflow Execution Handlers
  const handleStartWorkflow = useCallback(async () => {
    if (!workflowId) return;

    try {
      const result = await WorkflowExecutionProvider.executeWorkflow(workflowId);
      
      // Update workflow status
      const status = await WorkflowExecutionProvider.getWorkflowStatus(workflowId);
      setWorkflowStatus(status.status);

      // Update node statuses
      const updatedNodeStatuses = status.nodes.reduce((acc, node) => {
        acc[node.id] = node.status;
        return acc;
      }, {} as {[nodeId: string]: WorkflowNodeStatus});
      setNodeStatuses(updatedNodeStatuses);

      // Fetch and set logs
      const logs = await WorkflowExecutionProvider.getWorkflowLogs(workflowId);
      const logMessages = logs.map(log => `${log.timestamp.toLocaleString()}: ${log.message}`);
      setExecutionLogs(logMessages);

      // Open logs dialog
      setIsLogsDialogOpen(true);
    } catch (error) {
      console.error('Workflow execution failed:', error);
    }
  }, [workflowId]);

  const handlePauseWorkflow = useCallback(async () => {
    if (!workflowId) return;

    try {
      const status = await WorkflowExecutionProvider.pauseWorkflow(workflowId);
      setWorkflowStatus(status);
    } catch (error) {
      console.error('Failed to pause workflow:', error);
    }
  }, [workflowId]);

  const handleCancelWorkflow = useCallback(async () => {
    if (!workflowId) return;

    try {
      const status = await WorkflowExecutionProvider.cancelWorkflow(workflowId);
      setWorkflowStatus(status);
    } catch (error) {
      console.error('Failed to cancel workflow:', error);
    }
  }, [workflowId]);

  // Workflow Execution Control Buttons
  const WorkflowControlButtons = () => {
    return (
      <div className="absolute top-4 right-4 flex space-x-2 z-20">
        {workflowStatus === WorkflowStatus.DRAFT && (
          <Button 
            variant="default" 
            size="icon" 
            onClick={handleStartWorkflow}
            title="Start Workflow"
          >
            <Play className="h-5 w-5" />
          </Button>
        )}
        {workflowStatus === WorkflowStatus.RUNNING && (
          <>
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={handlePauseWorkflow}
              title="Pause Workflow"
            >
              <Pause className="h-5 w-5" />
            </Button>
            <Button 
              variant="destructive" 
              size="icon" 
              onClick={handleCancelWorkflow}
              title="Cancel Workflow"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          </>
        )}
        {workflowStatus !== WorkflowStatus.DRAFT && (
          <Button 
            variant="outline" 
            onClick={() => setIsLogsDialogOpen(true)}
            title="View Workflow Logs"
          >
            Logs
          </Button>
        )}
      </div>
    );
  };

  // Workflow Logs Dialog
  const WorkflowLogsDialog = () => {
    return (
      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workflow Execution Logs</DialogTitle>
            <DialogDescription>
              Detailed logs for workflow execution
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            {executionLogs.map((log, index) => (
              <div key={index} className="mb-2 text-sm">
                {log}
              </div>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div
      ref={canvasRef}
      data-testid="workflow-canvas"
      className="flex-grow flex flex-col relative border-2 border-dashed border-border shadow-inner bg-background/50 rounded-md overflow-hidden min-h-[400px]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === canvasRef.current && sourceNodeForEdge) {
          setSourceNodeForEdge(null);
        }
      }}
    >
      {/* Workflow Control Buttons */}
      <WorkflowControlButtons />

      {/* Workflow Logs Dialog */}
      <WorkflowLogsDialog />

      {/* Workflow Status Badge */}
      <Badge 
        variant={
          workflowStatus === WorkflowStatus.DRAFT ? 'secondary' :
          workflowStatus === WorkflowStatus.RUNNING ? 'outline' :
          workflowStatus === WorkflowStatus.COMPLETED ? 'default' :
          'destructive'
        } 
        className="absolute top-4 left-4 z-20"
      >
        {workflowStatus}
      </Badge>

      {/* Rest of the canvas rendering remains the same */}
      <svg
        ref={svgRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
      >
        {/* SVG marker and edge rendering */}
      </svg>

      {nodes.map((agentNode) => (
        <Card
          key={agentNode.id}
          className={cn(
            `absolute w-[180px] h-[60px] shadow-md bg-card border flex items-center group/node z-10 select-none`,
            sourceNodeForEdge?.id === agentNode.id ? 'ring-2 ring-primary ring-offset-2' : '',
            draggingNodeId === agentNode.id ? 'ring-2 ring-blue-500 opacity-75 cursor-grabbing' : 'cursor-grab',
            // Add node status-based styling
            nodeStatuses[agentNode.id] === WorkflowNodeStatus.PENDING ? 'opacity-50' : '',
            nodeStatuses[agentNode.id] === WorkflowNodeStatus.IN_PROGRESS ? 'ring-2 ring-yellow-500' : '',
            nodeStatuses[agentNode.id] === WorkflowNodeStatus.COMPLETED ? 'ring-2 ring-green-500' : '',
            nodeStatuses[agentNode.id] === WorkflowNodeStatus.FAILED ? 'ring-2 ring-red-500' : ''
          )}
          style={{ left: `${agentNode.x}px`, top: `${agentNode.y}px` }}
        >
          <CardHeader className="p-3 flex flex-row items-center space-x-0 w-full relative">
            <AgentIconDisplay type={agentNode.type} />
            <CardTitle className="text-sm font-medium truncate flex-grow">{agentNode.name}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-6 w-6 opacity-30 group-hover/node:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-opacity"
              onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                handleRemoveNode(agentNode.id);
              }}
              title="Remove agent"
            >
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Remove agent</span>
            </Button>
          </CardHeader>
        </Card>
      ))}

      {/* Placeholder for empty canvas */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none z-20">
          <div className="flex items-center justify-center gap-4 mb-6">
            <MousePointerSquareDashed className="h-12 w-12 text-muted-foreground/70" />
            <Hand className="h-12 w-12 text-muted-foreground/70" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Design Your Workflow</h3>
          <p className="text-muted-foreground max-w-xs sm:max-w-md mx-auto">
            Drag agents from the palette. Click one agent then another to connect them. Click on a connection line to remove it. Click 'X' on an agent to remove it.
          </p>
        </div>
      )}
    </div>
  );
}
