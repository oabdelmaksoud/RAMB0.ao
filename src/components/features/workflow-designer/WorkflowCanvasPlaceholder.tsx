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
  X as XIcon
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorkflowNode, WorkflowEdge, Agent } from '@/types';
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
  projectAgents?: Agent[];
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void;
}

export default function WorkflowCanvas({
  nodes = [],
  edges = [],
  projectAgents = [],
  onNodesChange,
  onEdgesChange,
}: WorkflowCanvasProps) {
  // Validate agent types based on project agents
  const validAgentTypes = new Set(projectAgents.map(agent => agent.type));
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number } | null>(null);
  const [wasDragging, setWasDragging] = useState(false);
  const [sourceNodeForEdge, setSourceNodeForEdge] = useState<WorkflowNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Workflow Execution State
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>(WorkflowStatus.DRAFT);
  const [nodeStatuses, setNodeStatuses] = useState<{[nodeId: string]: WorkflowNodeStatus}>({});
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

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
  // Function to update workflow status and node statuses periodically
  const updateWorkflowStatus = useCallback(async () => {
    if (!workflowId) return;
    
    try {
      // Get latest workflow status
      const status = await WorkflowExecutionProvider.getWorkflowStatus(workflowId);
      setWorkflowStatus(status.status);
      
      // Update node statuses
      const updatedNodeStatuses = status.nodes.reduce((acc, node) => {
        acc[node.id] = node.status;
        return acc;
      }, {} as {[nodeId: string]: WorkflowNodeStatus});
      setNodeStatuses(updatedNodeStatuses);
      
      // Fetch and update logs
      const logs = await WorkflowExecutionProvider.getWorkflowLogs(workflowId);
      const logMessages = logs.map(log => `${log.timestamp.toLocaleString()}: ${log.message}`);
      setExecutionLogs(logMessages);
      
      // If workflow is still running, continue polling
      return status.status === WorkflowStatus.RUNNING;
    } catch (error) {
      console.error('Failed to update workflow status:', error);
      return false;
    }
  }, [workflowId]);
  
  const handleStartWorkflow = useCallback(async () => {
    if (!workflowId) return;
    
    try {
      setIsExecuting(true);
      
      // Start workflow execution
      await WorkflowExecutionProvider.executeWorkflow(workflowId);
      
      // Get initial status update
      await updateWorkflowStatus();
      
      // Setup polling for status updates while workflow is running
      const pollInterval = setInterval(async () => {
        const shouldContinue = await updateWorkflowStatus();
        if (!shouldContinue) {
          clearInterval(pollInterval);
          setIsExecuting(false);
          
          // When execution completes, open logs dialog
          setIsLogsDialogOpen(true);
        }
      }, 1000); // Poll every second
      
      // Clear interval if component unmounts
      return () => clearInterval(pollInterval);
    } catch (error) {
      console.error('Workflow execution failed:', error);
      setIsExecuting(false);
    }
  }, [workflowId, updateWorkflowStatus]);

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
            disabled={isExecuting}
            title="Start Workflow"
            className={isExecuting ? "animate-pulse" : ""}
          >
            <Activity className={`h-5 w-5 ${isExecuting ? "animate-spin" : ""}`} />
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
              <AlertTriangle className="h-5 w-5" />
            </Button>
            <Button 
              variant="destructive" 
              size="icon" 
              onClick={handleCancelWorkflow}
              title="Cancel Workflow"
            >
              <Code2 className="h-5 w-5" />
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
      onDragOver={(e) => {
        e.preventDefault();
        // If dragging from palette, use move effect
        if (!draggingNodeId) {
          e.dataTransfer.dropEffect = 'move';
        }
        handleDragOver(e);
      }}
      onDrop={(e) => {
        // Only handle palette drops if we're not rearranging nodes
        if (!draggingNodeId) {
          handleDrop(e);
        }
      }}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        // Clear source node when clicking on empty canvas
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
        className="absolute top-0 left-0 w-full h-full pointer-events-auto z-0"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker
            id="arrow"
            markerWidth="10"
            markerHeight="10"
            refX="10"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="#6366f1" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const source = nodes.find((n) => n.id === edge.sourceNodeId);
          const target = nodes.find((n) => n.id === edge.targetNodeId);
          if (!source || !target) return null;
          const x1 = source.x + 90;
          const y1 = source.y + 30;
          const x2 = target.x + 90;
          const y2 = target.y + 30;
          return (
            <g key={edge.id}>
              <path
                d={`M${x1},${y1} L${x2},${y2}`}
                stroke="#6366f1"
                strokeWidth="2.5"
                fill="none"
                markerEnd="url(#arrow)"
                data-edge-id={edge.id}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  if (onEdgesChange) {
                    onEdgesChange(edges.filter((e) => e.id !== edge.id));
                  }
                }}
              />
            </g>
          );
        })}
      </svg>

      {nodes.map((agentNode) => {
        const isSourceForEdge = sourceNodeForEdge?.id === agentNode.id;
        const isPotentialTarget = sourceNodeForEdge && 
          sourceNodeForEdge.id !== agentNode.id &&
          !edges.some(e => 
            e.sourceNodeId === sourceNodeForEdge.id && 
            e.targetNodeId === agentNode.id
          );

        return (
          <Card
            key={agentNode.id}
            className={cn(
              `absolute w-[180px] h-[60px] shadow-md bg-card border flex items-center group/node z-10 select-none`,
              isSourceForEdge ? 'ring-2 ring-primary ring-offset-2' : '',
              isPotentialTarget ? 'ring-2 ring-green-500 ring-offset-2' : '',
              draggingNodeId === agentNode.id ? 'ring-2 ring-blue-500 opacity-75 cursor-grabbing' : 'cursor-grab',
              // Add node status-based styling
              nodeStatuses[agentNode.id] === WorkflowNodeStatus.PENDING ? 'opacity-50' : '',
              nodeStatuses[agentNode.id] === WorkflowNodeStatus.IN_PROGRESS ? 'ring-2 ring-yellow-500' : '',
              nodeStatuses[agentNode.id] === WorkflowNodeStatus.COMPLETED ? 'ring-2 ring-green-500' : '',
              nodeStatuses[agentNode.id] === WorkflowNodeStatus.FAILED ? 'ring-2 ring-red-500' : ''
            )}
            style={{ left: `${agentNode.x}px`, top: `${agentNode.y}px` }}
            draggable="true"
            onDragStart={(e) => {
              setDraggingNodeId(agentNode.id);
              setIsDragging(true);
              // Store the mouse offset from the top-left of the node
              const rect = e.currentTarget.getBoundingClientRect();
              setDragStartOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              });
              // Use a ghost image for dragging
              const ghostElement = document.createElement('div');
              ghostElement.style.width = '1px';
              ghostElement.style.height = '1px';
              document.body.appendChild(ghostElement);
              e.dataTransfer.setDragImage(ghostElement, 0, 0);
              setTimeout(() => document.body.removeChild(ghostElement), 0);
            }}
            onDragEnd={(e) => {
              if (draggingNodeId && onNodesChange && canvasRef.current) {
                const canvasRect = canvasRef.current.getBoundingClientRect();
                const draggedNode = nodes.find(n => n.id === draggingNodeId);
                
                if (draggedNode && dragStartOffset) {
                  // Calculate the new position
                  const newX = e.clientX - canvasRect.left - dragStartOffset.x;
                  const newY = e.clientY - canvasRect.top - dragStartOffset.y;
                  
                  // Ensure the node stays within canvas boundaries
                  const cardWidth = 180;
                  const cardHeight = 60;
                  const padding = 5;
                  
                  const adjustedX = Math.min(
                    Math.max(padding, newX),
                    canvasRect.width - cardWidth - padding
                  );
                  const adjustedY = Math.min(
                    Math.max(padding, newY),
                    canvasRect.height - cardHeight - padding
                  );
                  
                  // Update the node's position
                  const updatedNodes = nodes.map(node => 
                    node.id === draggingNodeId 
                      ? { ...node, x: adjustedX, y: adjustedY }
                      : node
                  );
                  
                  onNodesChange(updatedNodes);
                }
              }
              
              setDraggingNodeId(null);
              setDragStartOffset(null);
              setIsDragging(false);
            }}
            onClick={() => {
              // Don't set source node if we just finished dragging
              if (wasDragging) {
                setWasDragging(false);
                return;
              }
              if (sourceNodeForEdge && sourceNodeForEdge.id !== agentNode.id) {
                // Create edge
                if (
                  !edges.some(
                    (e) =>
                      e.sourceNodeId === sourceNodeForEdge.id &&
                      e.targetNodeId === agentNode.id
                  )
                ) {
                  const newEdge: WorkflowEdge = {
                    id: uid(
                      `edge-${sourceNodeForEdge.id}-${agentNode.id}`
                    ),
                    sourceNodeId: sourceNodeForEdge.id,
                    targetNodeId: agentNode.id,
                  };
                  if (onEdgesChange) {
                    onEdgesChange([...edges, newEdge]);
                  }
                }
                setSourceNodeForEdge(null);
              } else {
                setSourceNodeForEdge(agentNode);
              }
            }}
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
        );
      })}

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
