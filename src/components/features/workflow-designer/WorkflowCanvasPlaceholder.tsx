
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
    // console.log('Drag over canvas'); // Can be noisy, uncomment if needed
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    console.log('Drop event triggered on canvas.');
    const agentType = event.dataTransfer.getData('text/plain');
    console.log('Agent type received from dataTransfer:', agentType);
    
    if (!agentType || !canvasRef.current) {
      console.error('Drop aborted: agentType or canvasRef missing.', { agentType, canvasRefExists: !!canvasRef.current });
      return; 
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    console.log('Canvas Rect:', canvasRect);

    if (canvasRect.width === 0 || canvasRect.height === 0) {
      console.error("Drop aborted: Canvas has zero dimensions. Ensure it's visible and has space.");
      return;
    }
    
    const agentCardWidth = 180; 
    const agentCardHeight = 60; // Consistent height for calculation and rendering
    
    let x = event.clientX - canvasRect.left;
    let y = event.clientY - canvasRect.top;
    console.log('Initial x, y relative to canvas origin:', x, y);

    // Center the card on the drop point
    x = x - agentCardWidth / 2;
    y = y - agentCardHeight / 2;
    console.log('Centered x, y:', x, y);
    
    // Keep within canvas bounds with a small padding
    const padding = 5; // Reduced padding slightly
    const adjustedX = Math.min(Math.max(padding, x), canvasRect.width - agentCardWidth - padding);
    const adjustedY = Math.min(Math.max(padding, y), canvasRect.height - agentCardHeight - padding);
    console.log('Adjusted bounded x, y:', adjustedX, adjustedY);

    const newAgent: DroppedAgent = {
      id: `agent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: agentType,
      type: agentType, 
      x: adjustedX,
      y: adjustedY,
    };
    console.log('New agent to add:', newAgent);

    setDroppedAgents((prevAgents) => {
      const updatedAgents = [...prevAgents, newAgent];
      console.log('Updated droppedAgents state:', updatedAgents);
      return updatedAgents;
    });
  };

  const AgentIcon = ({ type }: { type: string }) => {
    const IconComponent = agentIcons[type] || BrainCircuit;
    return <IconComponent className="h-5 w-5 mr-2 text-primary" />;
  };

  return (
    <div
      ref={canvasRef}
      className="flex-grow flex flex-col relative border-2 border-dashed border-border shadow-inner bg-background/50 rounded-md overflow-hidden min-h-[400px]" // Added min-h-[400px]
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
          className="absolute w-[180px] h-[60px] shadow-lg cursor-grab bg-card border flex items-center" // Explicit height and flex for centering content
          style={{ left: `${agent.x}px`, top: `${agent.y}px` }}
        >
          <CardHeader className="p-3 flex flex-row items-center space-x-0 w-full">
            <AgentIcon type={agent.type} />
            <CardTitle className="text-sm font-medium truncate">{agent.name}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
