
'use client';

import { useState, DragEvent, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code2, FileText, Bell, BarChartBig, BrainCircuit, MousePointerSquareDashed, Hand } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DroppedAgent {
  id: string;
  name: string;
  type: string; 
  x: number;
  y: number;
}

const agentIcons: { [key: string]: LucideIcon } = {
  'Code Review Agent': Code2,
  'Documentation Agent': FileText,
  'Notification Agent': Bell,
  'Reporting Agent': BarChartBig,
  'Custom Logic Agent': BrainCircuit,
};

export default function WorkflowCanvas() {
  const [droppedAgents, setDroppedAgents] = useState<DroppedAgent[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const agentType = event.dataTransfer.getData('text/plain'); // Use 'text/plain'
    
    if (!agentType || !canvasRef.current) {
      return;
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Calculate position relative to the canvas, ensuring it's within bounds
    const agentCardWidth = 180; 
    const agentCardHeight = 60; 
    
    // Adjusted X and Y relative to the canvas element
    let x = event.clientX - canvasRect.left;
    let y = event.clientY - canvasRect.top;

    // Center the card on the drop point and keep within canvas bounds
    x = x - agentCardWidth / 2;
    y = y - agentCardHeight / 2;
    
    const adjustedX = Math.min(Math.max(10, x), canvasRect.width - agentCardWidth - 10);
    const adjustedY = Math.min(Math.max(10, y), canvasRect.height - agentCardHeight - 10);

    const newAgent: DroppedAgent = {
      id: `agent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: agentType, // This is the type from the palette, used for icon lookup
      type: agentType, // Storing it as 'type' for consistency, can be refined
      x: adjustedX,
      y: adjustedY,
    };
    setDroppedAgents((prevAgents) => [...prevAgents, newAgent]);
  };

  const AgentIcon = ({ type }: { type: string }) => {
    const IconComponent = agentIcons[type] || BrainCircuit; // Default icon
    return <IconComponent className="h-5 w-5 mr-2 text-primary" />;
  };

  return (
    <div
      ref={canvasRef}
      className="flex-grow flex flex-col relative border-2 border-dashed border-border shadow-inner bg-background/50 rounded-md overflow-hidden"
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
      {droppedAgents.map((agent) => (
        <Card 
          key={agent.id} 
          className="absolute w-[180px] shadow-lg cursor-grab bg-card border" // Added cursor-grab
          style={{ left: `${agent.x}px`, top: `${agent.y}px` }}
          // Making individual cards draggable later might require their own onDragStart and potentially stopping propagation
        >
          <CardHeader className="p-3 flex flex-row items-center space-x-0"> {/* Adjusted space-x-2 to space-x-0 if icon is part of AgentIcon's layout */}
            <AgentIcon type={agent.type} />
            <CardTitle className="text-sm font-medium truncate">{agent.name}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
