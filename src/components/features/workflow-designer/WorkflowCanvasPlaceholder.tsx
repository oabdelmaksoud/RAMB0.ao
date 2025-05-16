
'use client';

import { useState, DragEvent, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Code2, FileText, Bell, BarChartBig, BrainCircuit, MousePointerSquareDashed, Hand } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorkflowNode } from '@/types'; 

const agentIcons: { [key: string]: LucideIcon } = {
  'Code Review Agent': Code2,
  'Documentation Agent': FileText,
  'Notification Agent': Bell,
  'Reporting Agent': BarChartBig,
  'Custom Logic Agent': BrainCircuit,
};

interface WorkflowCanvasProps {
  initialNodes?: WorkflowNode[];
  onNodesChange?: (nodes: WorkflowNode[]) => void;
}

export default function WorkflowCanvas({ initialNodes = [], onNodesChange }: WorkflowCanvasProps) {
  const [droppedAgents, setDroppedAgents] = useState<WorkflowNode[]>(initialNodes);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("CANVAS: Initializing or initialNodes prop changed:", initialNodes);
    setDroppedAgents(initialNodes);
  }, [initialNodes]);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    console.log('CANVAS: Drop event triggered.');

    const agentType = event.dataTransfer.getData('text/plain');
    console.log(`CANVAS: Agent type received from dataTransfer: '${agentType}'`);
    
    if (!agentType) {
      console.error('CANVAS: Drop aborted - no agentType received.');
      return;
    }
    if (!canvasRef.current) {
      console.error('CANVAS: Drop aborted - canvasRef.current is null.');
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) {
      console.error("CANVAS: Drop aborted - Canvas has zero dimensions. Ensure it's visible and has size.");
      return;
    }
    console.log('CANVAS: Canvas Rect:', canvasRect);
    
    const agentCardWidth = 180;
    const agentCardHeight = 60; 
    
    let x = event.clientX - canvasRect.left;
    let y = event.clientY - canvasRect.top;
    console.log(`CANVAS: Initial drop coords (relative to canvas): x=${x.toFixed(2)}, y=${y.toFixed(2)}`);

    x = x - agentCardWidth / 2;
    y = y - agentCardHeight / 2;
    console.log(`CANVAS: Centered drop coords (for top-left of card): x=${x.toFixed(2)}, y=${y.toFixed(2)}`);
    
    const padding = 5; 
    const adjustedX = Math.min(Math.max(padding, x), canvasRect.width - agentCardWidth - padding);
    const adjustedY = Math.min(Math.max(padding, y), canvasRect.height - agentCardHeight - padding);
    console.log(`CANVAS: Adjusted drop coords (within bounds): x=${adjustedX.toFixed(2)}, y=${adjustedY.toFixed(2)}`);

    const newAgentNode: WorkflowNode = {
      id: `agent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: agentType, 
      type: agentType,
      x: adjustedX,
      y: adjustedY,
    };
    console.log('CANVAS: New agent node to add:', newAgentNode);

    setDroppedAgents((prevNodes) => {
      const newNodes = [...prevNodes, newAgentNode];
      console.log('CANVAS: Successfully updated droppedAgents state. New count:', newNodes.length, newNodes);
      if (onNodesChange) {
        console.log('CANVAS: Scheduling onNodesChange callback via setTimeout.');
        // Defer the call to onNodesChange to prevent updating parent during child's render cycle
        setTimeout(() => {
            console.log('CANVAS: Executing onNodesChange callback via setTimeout.');
            onNodesChange(newNodes);
        }, 0);
      }
      return newNodes;
    });
  };

  const AgentIcon = ({ type }: { type: string }) => {
    const IconComponent = agentIcons[type] || BrainCircuit;
    return <IconComponent className="h-5 w-5 mr-2 text-primary" />;
  };

  return (
    <div
      ref={canvasRef}
      className="flex-grow flex flex-col relative border-2 border-dashed border-border shadow-inner bg-background/50 rounded-md overflow-hidden min-h-[400px]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {droppedAgents.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none">
            <div className="flex items-center justify-center gap-4 mb-6">
              <MousePointerSquareDashed className="h-12 w-12 text-muted-foreground/70" />
              <Hand className="h-12 w-12 text-muted-foreground/70" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Design Your Workflow</h3>
            <p className="text-muted-foreground max-w-xs sm:max-w-md mx-auto">
              Drag agents from the palette on the left and drop them here. Connect agents to define the execution flow.
            </p>
        </div>
      )}
      {droppedAgents.map((agentNode) => (
        <Card
          key={agentNode.id}
          className="absolute w-[180px] h-[60px] shadow-lg cursor-grab bg-card border flex items-center"
          style={{ left: `${agentNode.x}px`, top: `${agentNode.y}px` }}
        >
          <CardHeader className="p-3 flex flex-row items-center space-x-0 w-full">
            <AgentIcon type={agentNode.type} />
            <CardTitle className="text-sm font-medium truncate">{agentNode.name}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
