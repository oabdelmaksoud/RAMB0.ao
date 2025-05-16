
'use client';

import type { Project } from '@/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, Workflow, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface ProjectCardProps {
  project: Project;
}

const statusColors: { [key in Project['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatDate = (dateString: string) => {
    if (!isClient) {
      return 'Loading date...'; // Or some placeholder
    }
    try {
      // Check if it's already human-readable (e.g., "3 days ago")
      if (!dateString.includes('-') && !dateString.includes('/') && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(dateString)) {
        return dateString;
      }
      return format(parseISO(dateString), "MMM d, yyyy");
    } catch (error) {
      return dateString; // Fallback
    }
  };

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3">
        {project.thumbnailUrl && (
          <div className="relative w-full h-40 rounded-t-lg overflow-hidden mb-3">
            <Image
              src={project.thumbnailUrl}
              alt={`${project.name} thumbnail`}
              fill
              style={{ objectFit: 'cover' }}
              data-ai-hint="project abstract" // Added AI hint
            />
          </div>
        )}
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold">{project.name}</CardTitle>
          <Badge variant="outline" className={cn("capitalize text-xs", statusColors[project.status])}>
            {project.status}
          </Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground line-clamp-2 h-[2.5em]">
          {project.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 pt-0">
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 mr-2" />
          Last Updated: {formatDate(project.lastUpdated)}
        </div>
        <div className="flex gap-4">
          {project.agentCount !== undefined && (
            <div className="flex items-center text-sm">
              <Bot className="h-4 w-4 mr-1.5 text-primary" />
              <span>{project.agentCount} Agent{project.agentCount === 1 ? '' : 's'}</span>
            </div>
          )}
          {project.workflowCount !== undefined && (
            <div className="flex items-center text-sm">
              <Workflow className="h-4 w-4 mr-1.5 text-primary" />
              <span>{project.workflowCount} Workflow{project.workflowCount === 1 ? '' : 's'}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a href="#"> {/* Placeholder link for now */}
            View Project
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
