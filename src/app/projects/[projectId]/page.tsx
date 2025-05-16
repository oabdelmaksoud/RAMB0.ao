
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Project } from '@/types';
import { mockProjects } from '@/app/projects/page'; // Temporary: Import mock data
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Copied from ProjectCard for consistency, ideally this would be a shared utility or part of the type
const statusColors: { [key in Project['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // In a real app, you would fetch project details using this projectId
    // For now, we find it in the mock data
    const foundProject = mockProjects.find(p => p.id === projectId);
    if (foundProject) {
      setProject(foundProject);
    }
  }, [projectId]);

  const formatDate = (dateString: string | undefined) => {
    if (!isClient || !dateString) {
      return 'Loading date...';
    }
    try {
       if (!dateString.includes('-') && !dateString.includes('/') && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(dateString)) {
        return dateString; // If it's already human-readable, return as is
      }
      return format(parseISO(dateString), "MMMM d, yyyy 'at' hh:mm a");
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString; // Fallback if date is not ISO or invalid
    }
  };

  if (!project) {
    return (
      <div className="container mx-auto">
        <PageHeader>
          <PageHeaderHeading>
            <Briefcase className="mr-2 inline-block h-6 w-6" />
            Loading Project...
          </PageHeaderHeading>
          <PageHeaderDescription>
            Fetching project details.
          </PageHeaderDescription>
        </PageHeader>
        <div className="text-center py-10">
          <p>Loading project data or project not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PageHeader>
        <div className="flex items-center space-x-4">
           {project.thumbnailUrl && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border hidden sm:block">
              <Image
                src={project.thumbnailUrl}
                alt={`${project.name} thumbnail`}
                fill
                style={{ objectFit: 'cover' }}
                data-ai-hint="project icon"
              />
            </div>
          )}
          <div>
            <PageHeaderHeading>
              <Briefcase className="mr-3 inline-block h-8 w-8" />
              {project.name}
            </PageHeaderHeading>
            <PageHeaderDescription className="mt-1">
              {project.description}
            </PageHeaderDescription>
          </div>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className={cn("capitalize", statusColors[project.status])}>
                {project.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project ID:</span>
              <span className="font-mono">{project.id}</span>
            </div>
            <div className="flex items-center">
              <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">Last Updated:</span>
            </div>
            <p className="ml-6">{formatDate(project.lastUpdated)}</p>
             {project.agentCount !== undefined && (
              <div className="flex items-center">
                <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">Agents:</span>
                <span className="ml-auto font-medium">{project.agentCount}</span>
              </div>
            )}
            {project.workflowCount !== undefined && (
              <div className="flex items-center">
                <WorkflowIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">Workflows:</span>
                <span className="ml-auto font-medium">{project.workflowCount}</span>
              </div>
            )}
          </CardContent>
        </Card>
         <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Quick Overview</CardTitle>
            <CardDescription>A brief summary of the project's current state and key metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Placeholder for overview charts or key metrics */}
            <p className="text-muted-foreground">Further implementation will show activity feeds, progress charts, or key performance indicators here.</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-4 bg-accent/50 rounded-lg">
                    <h4 className="font-semibold text-sm">Pending Tasks</h4>
                    <p className="text-2xl font-bold">12</p> {/* Mock Data */}
                </div>
                 <div className="p-4 bg-accent/50 rounded-lg">
                    <h4 className="font-semibold text-sm">Active Agents</h4>
                    <p className="text-2xl font-bold">{project.agentCount || 0}</p>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Separator className="my-6" />

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex mb-4">
          <TabsTrigger value="tasks"><ListChecks className="mr-2 h-4 w-4"/>Tasks</TabsTrigger>
          <TabsTrigger value="agents"><Bot className="mr-2 h-4 w-4"/>Associated Agents</TabsTrigger>
          <TabsTrigger value="workflows"><WorkflowIcon className="mr-2 h-4 w-4"/>Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Task Management</CardTitle>
              <CardDescription>
                Track and manage all tasks related to project "{project.name}".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">Task list and management features will be implemented here. This could include assigning tasks to agents, tracking progress, and setting deadlines.</p>
              {/* Placeholder for task list component */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Associated Agents</CardTitle>
              <CardDescription>
                View and manage agents specifically configured for project "{project.name}".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">A list of agents associated with this project will be displayed here. You'll be able to configure project-specific agent instances or link existing global agents.</p>
              {/* Placeholder for agent list component filtered by project */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle>Project Workflows</CardTitle>
              <CardDescription>
                Design and monitor automated workflows for project "{project.name}".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">Workflows relevant to this project will be listed here. You can create new workflows using project-specific agents or view the status of ongoing automated processes.</p>
              {/* Placeholder for workflow list/designer component scoped to project */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

