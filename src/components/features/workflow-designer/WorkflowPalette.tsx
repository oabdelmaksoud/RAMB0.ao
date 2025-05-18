'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code2, FileText, Bell, BarChartBig, BrainCircuit, ToyBrick, SlidersHorizontal, Activity, AlertTriangle, Puzzle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Agent } from '@/types';

interface PaletteAgentType {
  name: string; // This will be the agent.type
  icon: LucideIcon;
  description: string;
}

// Moved and expanded agentIcons map here for consistency
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
  // Add more mappings as needed
};

const getDefaultIconForAgentType = (agentType: string): LucideIcon => {
  return agentIcons[agentType] || Puzzle; // Default icon if no specific match
};

interface WorkflowPaletteProps {
  projectAgents?: Agent[];
}

export default function WorkflowPalette({ projectAgents = [] }: WorkflowPaletteProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const paletteAgentTypes = useMemo(() => {
    if (!isClient || projectAgents.length === 0) {
      return [];
    }
    
    const uniqueTypes = Array.from(new Set(projectAgents.map(agent => agent.type)));
    
    const newPaletteItems: PaletteAgentType[] = uniqueTypes.map(type => ({
      name: type,
      icon: getDefaultIconForAgentType(type),
      description: `Draggable ${type} for this project.`
    }));
    
    console.log("PALETTE: Derived agent types for palette:", newPaletteItems.map(p => p.name));
    return newPaletteItems;
  }, [isClient, projectAgents]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, agentTypeName: string) => {
    e.dataTransfer.setData('text/plain', agentTypeName);
    e.dataTransfer.effectAllowed = 'move';
    console.log(`PALETTE: Drag started for: ${agentTypeName}. Data set to: ${agentTypeName}`);
  };

  if (!isClient) {
    return (
      <Card className="w-full md:w-1/4 md:min-w-[280px] md:max-w-[320px] flex flex-col shadow-lg">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg">Agent Palette</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Loading palette...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full md:w-1/4 md:min-w-[280px] md:max-w-[320px] flex flex-col shadow-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Project Agent Palette</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-3">
          {paletteAgentTypes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No agents configured for this project. Add agents in the 'Project Agents' tab to populate this palette.
            </p>
          )}
          {paletteAgentTypes.map((agentType) => (
            <div
              key={agentType.name}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, agentType.name)}
              className="p-3 border rounded-lg bg-card hover:shadow-lg hover:border-primary dark:hover:border-primary-foreground/50 cursor-grab transition-all duration-150 ease-in-out flex items-start gap-3 text-left group"
              title={`Drag to add ${agentType.name}`}
            >
              <agentType.icon className="h-6 w-6 mt-0.5 text-primary group-hover:text-primary/90 shrink-0" />
              <div>
                <p className="font-semibold text-card-foreground group-hover:text-primary">{agentType.name}</p>
                <p className="text-xs text-muted-foreground">{agentType.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </