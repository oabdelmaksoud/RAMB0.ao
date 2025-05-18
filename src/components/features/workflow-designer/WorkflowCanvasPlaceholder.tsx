// src/components/features/workflow-designer/WorkflowCanvasPlaceholder.tsx
'use client';

import React, { DragEvent, MouseEvent as ReactMouseEvent, useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Code2, FileText, Bell, BarChartBig, BrainCircuit, ToyBrick, SlidersHorizontal, Activity, AlertTriangle, MousePointerSquareDashed, Hand, X as XIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WorkflowNode, WorkflowEdge } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uid } from '@/lib/utils'; // Ensure uid is imported

// Moved and expanded agentIcons map here for consistency with palette
const agentIcons: { [key: string]: LucideIcon } = {
  'Analysis Agent': BrainCircuit,
  'CI/CD Agent': SlidersHorizontal, // Example, adjust as needed
  'Documentation Agent': FileText,
  'Deployment Agent': SlidersHorizontal,
  'Testing Agent': Activity,
  'Monitoring Agent': AlertTriangle,
  'Reporting Agent': BarChartBig,
  'Notification Agent': Bell,
  'Custom Logic Agent': BrainCircuit, // Keeping this for user-defined or less specific
  'Code Review Agent': Code2, // From old palette
};

const getIconForAgentType = (agentType: string): LucideIcon => {
  return agentIcons[agentType] || ToyBrick; // Default icon
};


interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
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
  const [renderCount, setRenderCount] = useState(0);

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number } | null>(null);
  const [wasDragging, setWasDragging] = useState(false); // To distinguish click from drag end

  const [sourceNodeForEdge, setSourceNodeForEdge] = useState<WorkflowNode | null>(null);

  // Effect to log re-renders, useful for debugging
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    // console.log(`CANVAS: rendered: ${renderCount + 1}. Nodes:`, nodes.map(n => ({ id: n.id, name: n.name, x: n.x, y: n.y, type: n.type })), "Edges:", edges);
  }, [nodes, edges, renderCount]);


  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    console.count('CANVAS: handleDrop invoked');
    event.preventDefault();
    const agentTypeNameFromPalette = event.dataTransfer.getData('text/plain');
    console.log(`CANVAS: Agent type received from dataTransfer: '${agentTypeNameFromPalette}'`);

    if (!agentTypeNameFromPalette || !canvasRef.current) {
      console.error('CANVAS: Drop aborted - no agentTypeNameFromPalette or canvasRef.');
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) {
      console.error("CANVAS: Drop aborted - Canvas has zero dimensions.");
      return;
    }
    // console.log('CANVAS: Canvas Rect:', canvasRect);

    const agentCardWidth = 180; 
    const agentCardHeight = 60; 

    let x = event.clientX - canvasRect.left;
    let y = event.clientY - canvasRect.top;
    // console.log(`CANVAS: Initial drop coords (relative to canvas): x=${x.toFixed(2)}, y=${y.toFixed(2)}`);

    // Center the card on the drop point
    x = x - agentCardWidth / 2;
    y = y - agentCardHeight / 2;
    // console.log(`CANVAS: Centered drop coords (for top-left of card): x=${x.toFixed(2)}, y=${y.toFixed(2)}`);

    // Ensure the node is placed within canvas bounds
    const padding = 5; // Small padding from edges
    const adjustedX = Math.min(Math.max(padding, x), canvasRect.width - agentCardWidth - padding);
    const adjustedY = Math.min(Math.max(padding, y), canvasRect.height - agentCardHeight - padding);
    // console.log(`CANVAS: Adjusted drop coords (within bounds): x=${adjustedX.toFixed(2)}, y=${adjustedY.toFixed(2)}`);

    const newAgentNode: WorkflowNode = {
      id: uid(`node-${agentTypeNameFromPalette.toLowerCase().replace(/\s+/g, '-')}`),
      name: agentTypeNameFromPalette, // Default name to type, can be edited later
      type: agentTypeNameFromPalette,
      x: adjustedX,
      y: adjustedY,
      config: {}, // Default empty config
    };
    // console.log('CANVAS: New agent node to add:', newAgentNode);

    if (onNodesChange) {
      const newNodesArray = [...nodes, newAgentNode];
      // console.log('CANVAS: Scheduling onNodesChange with newNodesArray (add):', newNodesArray.map(n => ({ id: n.id, x: n.x, y: n.y })));
      setTimeout(() => {
        // console.log('CANVAS: Executing onNodesChange callback (add) via setTimeout.');
        onNodesChange(newNodesArray);
      }, 0);
    } else {
      console.warn('CANVAS: onNodesChange is not defined in props for add.');
    }
  };

  const handleNodeMouseDown = (event: ReactMouseEvent<HTMLDivElement>, nodeId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setWasDragging(false); // Reset drag flag

    const node = nodes.find(n => n.id === nodeId);
    if (node && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setDraggingNodeId(nodeId);
      setDragStartOffset({
        x: event.clientX - canvasRect.left - node.x,
        y: event.clientY - canvasRect.top - node.y,
      });
      // console.log(`CANVAS: Start dragging node ${nodeId}. Offset:`, { x: event.clientX - canvasRect.left - node.x, y: event.clientY - canvasRect.top - node.y });
    }
  };

  const handleNodeClick = useCallback((clickedNode: WorkflowNode) => {
    if (wasDragging) {
      // console.log('CANVAS: Node click ignored due to recent drag operation.');
      setWasDragging(false); // Reset for next click
      return;
    }

    // console.log('CANVAS: Node clicked (for edge):', clickedNode.name, clickedNode.id);
    if (!sourceNodeForEdge) {
      setSourceNodeForEdge(clickedNode);
      // console.log('CANVAS: Set source node for edge:', clickedNode.name);
    } else {
      if (sourceNodeForEdge.id === clickedNode.id) {
        // console.log('CANVAS: Clicked same node, deselecting source.');
        setSourceNodeForEdge(null);
        return;
      }
      // console.log('CANVAS: Set target node for edge:', clickedNode.name, 'from source:', sourceNodeForEdge.name);
      const newEdge: WorkflowEdge = {
        id: uid(`edge-${sourceNodeForEdge.id.slice(-4)}-${clickedNode.id.slice(-4)}`),
        sourceNodeId: sourceNodeForEdge.id,
        targetNodeId: clickedNode.id,
      };
      if (onEdgesChange) {
        const newEdgesArray = [...edges, newEdge];
        // console.log('CANVAS: Scheduling onEdgesChange with newEdgesArray (add edge):', newEdgesArray);
        setTimeout(() => {
            // console.log('CANVAS: Executing onEdgesChange callback (add edge) via setTimeout.');
            onEdgesChange(newEdgesArray);
        }, 0);
      } else {
        console.warn('CANVAS: onEdgesChange is not defined in props for adding edge.');
      }
      setSourceNodeForEdge(null);
    }
  }, [sourceNodeForEdge, edges, onEdgesChange, wasDragging]);


  const handleRemoveNode = useCallback((nodeIdToRemove: string) => {
    // console.log(`CANVAS: Attempting to remove node with ID: ${nodeIdToRemove}`);
    if (!nodeIdToRemove) {
      console.error('CANVAS: handleRemoveNode called with undefined or null nodeIdToRemove.');
      return;
    }
    if (onNodesChange) {
      const newNodesArray = nodes.filter(node => node.id !== nodeIdToRemove);
      // console.log(`CANVAS: Scheduling onNodesChange with newNodesArray (remove node ${nodeIdToRemove}):`, newNodesArray.map(n => n.id));
      if (onEdgesChange) { // Also remove edges connected to this node
        const newEdgesArray = edges.filter(edge => edge.sourceNodeId !== nodeIdToRemove && edge.targetNodeId !== nodeIdToRemove);
        // console.log(`CANVAS: Scheduling onEdgesChange with newEdgesArray (remove edges for node ${nodeIdToRemove}):`, newEdgesArray.map(e => e.id));
        setTimeout(() => {
          onEdgesChange(newEdgesArray);
        }, 0);
      }
      setTimeout(() => {
        // console.log('CANVAS: Executing onNodesChange callback (remove node) via setTimeout.');
        onNodesChange(newNodesArray);
      }, 0);

    } else {
      console.warn('CANVAS: onNodesChange is not defined in props for remove.');
    }
  }, [nodes, edges, onNodesChange, onEdgesChange]);

  const handleRemoveEdge = useCallback((edgeIdToRemove: string) => {
    // console.log(`CANVAS: Attempting to remove edge with ID: ${edgeIdToRemove}`);
    if (!edgeIdToRemove) {
      console.error('CANVAS: handleRemoveEdge called with undefined or null edgeIdToRemove.');
      return;
    }
    if (onEdgesChange) {
      const newEdgesArray = edges.filter(edge => edge.id !== edgeIdToRemove);
      // console.log(`CANVAS: Scheduling onEdgesChange with newEdgesArray (remove edge ${edgeIdToRemove}):`, newEdgesArray.map(e => e.id));
      setTimeout(() => {
          // console.log('CANVAS: Executing onEdgesChange callback (remove edge) via setTimeout.');
          onEdgesChange(newEdgesArray);
      }, 0);
    } else {
      console.warn('CANVAS: onEdgesChange is not defined in props for removing edge.');
    }
  }, [edges, onEdgesChange]);


  useEffect(() => {
    const handleMouseMove = (event: globalThis.MouseEvent) => { // Use globalThis.MouseEvent
      if (!draggingNodeId || !dragStartOffset || !canvasRef.current) return;

      if (!wasDragging) setWasDragging(true); // Set drag flag on first move

      const canvasRect = canvasRef.current.getBoundingClientRect();
      let newX = event.clientX - canvasRect.left - dragStartOffset.x;
      let newY = event.clientY - canvasRect.top - dragStartOffset.y;

      const agentCardWidth = 180;
      const agentCardHeight = 60;
      const padding = 5;
      newX = Math.min(Math.max(padding, newX), canvasRect.width - agentCardWidth - padding);
      newY = Math.min(Math.max(padding, newY), canvasRect.height - agentCardHeight - padding);

      if (onNodesChange) {
        const updatedNodes = nodes.map(node =>
          node.id === draggingNodeId ? { ...node, x: newX, y: newY } : node
        );
         // No setTimeout here, let parent handle its own update timing if needed after this callback
        onNodesChange(updatedNodes);
      }
    };

    const handleMouseUp = () => {
      if (draggingNodeId) {
        // console.log(`CANVAS: MouseUp - Stopped dragging node ${draggingNodeId}`);
        setDraggingNodeId(null);
        setDragStartOffset(null);
        // Reset wasDragging after a short delay to ensure click event (if any) is processed correctly
        setTimeout(() => setWasDragging(false), 0);
      }
    };

    if (draggingNodeId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNodeId, dragStartOffset, nodes, onNodesChange, wasDragging]);


  const AgentIconDisplay = ({ type }: { type: string }) => { // Renamed to avoid conflict
    const IconComponent = getIconForAgentType(type);
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
      onClick={(e) => { 
        if (e.target === canvasRef.current) { // Clicked on canvas background
          if (sourceNodeForEdge) {
            // console.log('CANVAS: Clicked on canvas background, deselecting source node.');
            setSourceNodeForEdge(null);
          }
        }
      }}
    >
      <svg
        ref={svgRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
      >
        <defs>
            <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="7" // Adjusted for slightly larger arrowhead
                refY="3.5"
                orient="auto"
                markerUnits="strokeWidth"
            >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" opacity="0.6"/>
            </marker>
        </defs>
        {edges.map(edge => {
          const sourceNode = getNodeById(edge.sourceNodeId);
          const targetNode = getNodeById(edge.targetNodeId);

          if (sourceNode && targetNode) {
            const x1 = sourceNode.x + 180 / 2; 
            const y1 = sourceNode.y + 60 / 2;  
            const x2 = targetNode.x + 180 / 2;
            const y2 = targetNode.y + 60 / 2;

            // Calculate control points for a slight curve (optional)
            // const dx = x2 - x1;
            // const dy = y2 - y1;
            // const curveFactor = 0.2;
            // const cp1x = x1 + dx * curveFactor;
            // const cp1y = y1 + dy * curveFactor * (y1 > y2 ? -1: 1) ; // Bend outwards
            // const cp2x = x2 - dx * curveFactor;
            // const cp2y = y2 - dy * curveFactor * (y2 > y1 ? -1: 1);

            // Path for a straight line
            const pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
            // Path for a Bezier curve (example)
            // const pathData = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;


            return (
              <path
                key={edge.id}
                d={pathData}
                stroke="hsl(var(--foreground))"
                strokeOpacity={0.5}
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
                className="cursor-pointer hover:stroke-destructive hover:stroke-[3px]"
                style={{ pointerEvents: 'stroke' }} // Make only the stroke clickable
                onClick={(e) => {
                  e.stopPropagation(); // Prevent canvas click from deselecting sourceNode
                  handleRemoveEdge(edge.id);
                }}
                title="Click to remove connection"
              />
            );
          }
          return null;
        })}
      </svg>

      {nodes.map((agentNode) => (
        <Card
          key={agentNode.id}
          onMouseDown={(e) => handleNodeMouseDown(e, agentNode.id)}
          onClick={(e) => {
            e.stopPropagation(); // Prevent canvas click
            handleNodeClick(agentNode);
          }}
          className={cn(
            `absolute w-[180px] h-[60px] shadow-md cursor-grab bg-card border flex items-center group/node z-10`,
            sourceNodeForEdge?.id === agentNode.id ? 'ring-2 ring-primary ring-offset-2' : '',
            draggingNodeId === agentNode.id ? 'ring-2 ring-blue-500 opacity-75 cursor-grabbing' : ''
          )}
          style={{ left: `${agentNode.x}px`, top: `${agentNode.y}px`, userSelect: 'none' }}
        >
          <CardHeader className="p-3 flex flex-row items-center space-x-0 w-full relative">
            <AgentIconDisplay type={agentNode.type} />
            <CardTitle className="text-sm font-medium truncate flex-grow">{agentNode.name}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-6 w-6 opacity-30 group-hover/node:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-opacity"
              onMouseDown={(e) => e.stopPropagation()} // Prevent starting a drag
              onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                // console.log(`CANVAS: Remove button clicked for node ID: ${agentNode.id}`);
                e.stopPropagation(); // Important: stop propagation to prevent node click (for edge creation)
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

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none z-20">
          <div className="flex items-center justify-center gap-4 mb-6">
            <MousePointerSquareDashed className="h-12 w-12 text-muted-foreground/70" />
            <Hand className="h-12 w-12 text-muted-foreground/70" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Design Your Workflow</h3>
          <p className="text-muted-foreground max-w-xs sm:max-w-md mx-auto">
            Drag agents from the palette. Click one agent then another to connect them. Click on a connection line to remove it.
          </p>
        </div>
      )}
    </div>
  );
}
