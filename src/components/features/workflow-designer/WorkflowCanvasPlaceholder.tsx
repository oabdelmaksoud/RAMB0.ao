
'use client';

import { DragEvent, MouseEvent, useRef, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Code2, FileText, Bell, BarChartBig, BrainCircuit, MousePointerSquareDashed, Hand, X as XIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorkflowNode, WorkflowEdge } from '@/types';
import { Button } from '@/components/ui/button';

const agentIcons: { [key: string]: LucideIcon } = {
  'Code Review Agent': Code2,
  'Documentation Agent': FileText,
  'Notification Agent': Bell,
  'Reporting Agent': BarChartBig,
  'Custom Logic Agent': BrainCircuit,
  // Add other agent types from palette if needed
};

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void; // New prop
}

export default function WorkflowCanvas({ nodes = [], edges = [], onNodesChange, onEdgesChange }: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [sourceNodeForEdge, setSourceNodeForEdge] = useState<WorkflowNode | null>(null);

  useEffect(() => {
    setRenderCount(prev => prev + 1);
    // console.log(`CANVAS: component rendered/re-rendered: ${renderCount + 1}. Nodes:`, nodes, "Edges:", edges);
  }, [nodes, edges]);


  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    console.count('CANVAS: handleDrop invoked');
    event.preventDefault();
    console.log('CANVAS: Drop event triggered.');

    const agentType = event.dataTransfer.getData('text/plain');
    console.log(`CANVAS: Agent type received from dataTransfer: '${agentType}'`);

    if (!agentType || !canvasRef.current) {
      console.error('CANVAS: Drop aborted - no agentType or canvasRef.');
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) {
      console.error("CANVAS: Drop aborted - Canvas has zero dimensions.");
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

    if (onNodesChange) {
      const newNodesArray = [...nodes, newAgentNode];
      console.log('CANVAS: Scheduling onNodesChange with newNodesArray (add):', newNodesArray);
      setTimeout(() => {
        console.log('CANVAS: Executing onNodesChange callback (add) via setTimeout.');
        onNodesChange(newNodesArray);
      }, 0);
    } else {
      console.warn('CANVAS: onNodesChange is not defined in props for add.');
    }
  };

  const handleRemoveNode = (nodeIdToRemove: string) => {
    console.log(`CANVAS: Attempting to remove node with ID: ${nodeIdToRemove}`);
    if (!nodeIdToRemove) {
      console.error('CANVAS: handleRemoveNode called with undefined or null nodeIdToRemove.');
      return;
    }
    if (onNodesChange) {
      const newNodesArray = nodes.filter(node => node.id !== nodeIdToRemove);
      console.log(`CANVAS: Scheduling onNodesChange with newNodesArray (remove):`, newNodesArray);
      setTimeout(() => {
        console.log('CANVAS: Executing onNodesChange callback (remove) via setTimeout.');
        onNodesChange(newNodesArray);
      }, 0);
    } else {
      console.warn('CANVAS: onNodesChange is not defined in props for remove.');
    }
  };

  const handleNodeClick = (clickedNode: WorkflowNode) => {
    console.log('CANVAS: Node clicked:', clickedNode.name, clickedNode.id);
    if (!sourceNodeForEdge) {
      setSourceNodeForEdge(clickedNode);
      console.log('CANVAS: Set source node for edge:', clickedNode.name);
      // Add visual indication later if needed (e.g., border change)
    } else {
      // This is the second click, forming the edge
      if (sourceNodeForEdge.id === clickedNode.id) {
        console.log('CANVAS: Clicked same node, deselecting source.');
        setSourceNodeForEdge(null); // Deselect if clicked on self
        return;
      }
      console.log('CANVAS: Set target node for edge:', clickedNode.name, 'from source:', sourceNodeForEdge.name);
      const newEdge: WorkflowEdge = {
        id: `edge-${sourceNodeForEdge.id}-to-${clickedNode.id}-${Date.now()}`,
        sourceNodeId: sourceNodeForEdge.id,
        targetNodeId: clickedNode.id,
      };
      if (onEdgesChange) {
        const newEdgesArray = [...edges, newEdge];
        console.log('CANVAS: Scheduling onEdgesChange with newEdgesArray (add):', newEdgesArray);
        setTimeout(() => {
            console.log('CANVAS: Executing onEdgesChange callback (add edge) via setTimeout.');
            onEdgesChange(newEdgesArray);
        }, 0);
      } else {
        console.warn('CANVAS: onEdgesChange is not defined in props for adding edge.');
      }
      setSourceNodeForEdge(null); // Reset after creating edge
    }
  };

  const AgentIcon = ({ type }: { type: string }) => {
    const IconComponent = agentIcons[type] || BrainCircuit;
    return <IconComponent className="h-5 w-5 mr-2 text-primary" />;
  };

  const getNodeById = (nodeId: string): WorkflowNode | undefined => {
    return nodes.find(node => node.id === nodeId);
  };

  return (
    <div
      ref={canvasRef}
      className="flex-grow flex flex-col relative border-2 border-dashed border-border shadow-inner bg-background/50 rounded-md overflow-hidden min-h-[400px]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={(e) => { // Click on canvas itself deselects source node
        if (e.target === canvasRef.current) {
          if (sourceNodeForEdge) {
            console.log('CANVAS: Clicked on canvas background, deselecting source node.');
            setSourceNodeForEdge(null);
          }
        }
      }}
    >
      <svg
        ref={svgRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
      >
        {edges.map(edge => {
          const sourceNode = getNodeById(edge.sourceNodeId);
          const targetNode = getNodeById(edge.targetNodeId);

          if (sourceNode && targetNode) {
            const x1 = sourceNode.x + 180 / 2; 
            const y1 = sourceNode.y + 60 / 2;  
            const x2 = targetNode.x + 180 / 2;
            const y2 = targetNode.y + 60 / 2;

            return (
              <line
                key={edge.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--foreground))"
                strokeOpacity={0.7}
                strokeWidth="2"
                // markerEnd="url(#arrowhead)" 
              />
            );
          }
          return null;
        })}
        {/* 
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
          </marker>
        </defs>
        */}
      </svg>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none z-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            <MousePointerSquareDashed className="h-12 w-12 text-muted-foreground/70" />
            <Hand className="h-12 w-12 text-muted-foreground/70" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Design Your Workflow</h3>
          <p className="text-muted-foreground max-w-xs sm:max-w-md mx-auto">
            Drag agents from the palette. Click one agent then another to connect them.
          </p>
        </div>
      )}
      {nodes.map((agentNode) => (
        <Card
          key={agentNode.id}
          className={`absolute w-[180px] h-[60px] shadow-lg cursor-pointer bg-card border flex items-center group/node z-10
                      ${sourceNodeForEdge?.id === agentNode.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
          style={{ left: `${agentNode.x}px`, top: `${agentNode.y}px` }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent canvas click from deselecting if clicking on node
            handleNodeClick(agentNode);
          }}
        >
          <CardHeader className="p-3 flex flex-row items-center space-x-0 w-full relative">
            <AgentIcon type={agentNode.type} />
            <CardTitle className="text-sm font-medium truncate">{agentNode.name}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-6 w-6 opacity-50 group-hover/node:opacity-100 transition-opacity"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                console.log(`CANVAS: Remove button clicked for node ID: ${agentNode.id}`);
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
    </div>
  );
}
