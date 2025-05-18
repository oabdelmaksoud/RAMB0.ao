
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Puzzle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Agent } from '@/types';

interface PaletteAgentType {
  name: string;
  icon: LucideIcon;
  description: string;
}

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

const getDefaultIconForAgentType = (agentType: string): LucideIcon => {
  return agentIcons[agentType] || Puzzle;
};

interface WorkflowPaletteProps {
  projectAgents?: Agent[];
}

export default function WorkflowPalette({ projectAgents = [] }: WorkflowPaletteProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []); // Explicit empty dependency array

  const paletteItems = useMemo(() => {
    if (!isClient || !projectAgents || projectAgents.length === 0) {
      return [];
    }
    const uniqueTypes = Array.from(new Set(projectAgents.map(agent => agent.type).filter(type => typeof type === 'string' && type.trim() !== '')));

    const newPaletteItems: PaletteAgentType[] = uniqueTypes.map(type => {
      return { // Explicit return for clarity
        name: type,
        icon: getDefaultIconForAgentType(type),
        description: `Draggable ${type} for this project.`
      };
    });
    return newPaletteItems;
  }, [isClient, projectAgents]); // Dependencies are correct

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, agentTypeName: string): void => { // Explicit void return type
    // console.log(`PALETTE: Drag started from palette for: ${agentTypeName}. Data set to: ${agentTypeName}`);
    e.dataTransfer.setData('text/plain', agentTypeName);
    e.dataTransfer.effectAllowed = 'move';
  }; // Ensure semicolon

  // If there's an error, it must be before this line, or this line itself if `paletteItems` causes issues (unlikely for syntax).
  // console.log("PALETTE: Rendering component. isClient:", isClient, "projectAgents count:", projectAgents.length, "paletteItems count:", paletteItems.length);

  return ( // This is where line 82/83 would be
    <Card className="w-full md:w-1/4 md:min-w-[280px] md:max-w-[320px] flex flex-col shadow-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Project Agent Palette</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-3">
          {paletteItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No agents configured for this project. Add agents in the 'Project Agents' tab to populate this palette.
            </p>
          )}
          {paletteItems.map((agentTypeItem) => (
            <div
              key={agentTypeItem.name}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, agentTypeItem.name)}
              className="p-3 border rounded-lg bg-card hover:shadow-lg hover:border-primary dark:hover:border-primary-foreground/50 cursor-grab transition-all duration-150 ease-in-out flex items-start gap-3 text-left group"
              title={`Drag to add ${agentTypeItem.name}`}
            >
              <agentTypeItem.icon className="h-6 w-6 mt-0.5 text-primary group-hover:text-primary/90 shrink-0" />
              <div>
                <p className="font-semibold text-card-foreground group-hover:text-primary">{agentTypeItem.name}</p>
                <p className="text-xs text-muted-foreground">{agentTypeItem.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
// Ensuring no trailing characters after this final brace.
