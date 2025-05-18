
'use client';

import { useEffect, useState } from 'react';
import type { Project, Task } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'; // Added CardFooter
import { BarChart3, Briefcase, ListChecks, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { PROJECTS_STORAGE_KEY, getTasksStorageKey, initialMockProjects } from '@/app/projects/page';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; 

interface AggregatedMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  blockedTasks: number;
}

export default function PortfolioDashboardPage() {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    setIsLoading(true);
    let loadedProjects: Project[] = [];
    try {
      const storedProjectsJson = localStorage.getItem(PROJECTS_STORAGE_KEY);
      loadedProjects = storedProjectsJson ? JSON.parse(storedProjectsJson) : initialMockProjects;
    } catch (e) {
      console.error("Error parsing projects from localStorage for dashboard:", e);
      loadedProjects = initialMockProjects; // Fallback
    }
    setProjects(loadedProjects);

    let totalTasks = 0;
    let todoTasks = 0;
    let inProgressTasks = 0;
    let doneTasks = 0;
    let blockedTasks = 0;

    loadedProjects.forEach(project => {
      const tasksStorageKey = getTasksStorageKey(project.id);
      let projectTasks: Task[] = [];
      try {
        const storedTasksJson = localStorage.getItem(tasksStorageKey);
        if (storedTasksJson) {
          projectTasks = JSON.parse(storedTasksJson);
        }
      } catch (e) {
        console.error(`Error parsing tasks for project ${project.id} on dashboard:`, e);
      }
      
      totalTasks += projectTasks.length;
      projectTasks.forEach(task => {
        if (task.isMilestone) return; 
        switch (task.status) {
          case 'To Do':
            todoTasks++;
            break;
          case 'In Progress':
            inProgressTasks++;
            break;
          case 'Done':
            doneTasks++;
            break;
          case 'Blocked':
            blockedTasks++;
            break;
        }
      });
    });

    setMetrics({
      totalProjects: loadedProjects.length,
      activeProjects: loadedProjects.filter(p => p.status === 'Active').length,
      completedProjects: loadedProjects.filter(p => p.status === 'Completed').length,
      onHoldProjects: loadedProjects.filter(p => p.status === 'On Hold').length,
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      blockedTasks,
    });
    setIsLoading(false);
  }, [isClient]);

  if (!isClient || isLoading) {
    return (
      <div className="container mx-auto">
        <PageHeader>
          <PageHeaderHeading>
            <BarChart3 className="mr-2 inline-block h-6 w-6" />
            Portfolio Dashboard
          </PageHeaderHeading>
          <PageHeaderDescription>
            Aggregated overview of all your projects and tasks.
          </PageHeaderDescription>
        </PageHeader>
        <div className="text-center py-10">Loading dashboard data...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container mx-auto">
        <PageHeader>
          <PageHeaderHeading>
            <BarChart3 className="mr-2 inline-block h-6 w-6" />
            Portfolio Dashboard
          </PageHeaderHeading>
           <PageHeaderDescription>
            Aggregated overview of all your projects and tasks.
          </PageHeaderDescription>
        </PageHeader>
        <div className="text-center py-10">Could not load dashboard data.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>
          <BarChart3 className="mr-2 inline-block h-6 w-6" />
          Portfolio Dashboard
        </PageHeaderHeading>
        <PageHeaderDescription>
          High-level overview of all your projects and their progress.
        </PageHeaderDescription>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeProjects} active, {metrics.completedProjects} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTasks}</div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks In Progress</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.inProgressTasks}</div>
             <p className="text-xs text-muted-foreground">
              {metrics.todoTasks} To Do, {metrics.blockedTasks} Blocked
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.doneTasks}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalTasks > 0 ? `${Math.round((metrics.doneTasks / metrics.totalTasks) * 100)}%` : '0%'} overall completion
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Projects Overview</CardTitle>
          <CardDescription>Current status of all projects.</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <ul className="space-y-3">
              {projects.map(project => (
                <li key={project.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                  <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                    {project.name}
                  </Link>
                  <Badge variant={project.status === 'Active' ? 'default' : (project.status === 'Completed' ? 'secondary' : 'outline')}>
                    {project.status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center">No projects available to display.</p>
          )}
        </CardContent>
         <CardFooter className="border-t pt-4">
            <Link href="/" passHref legacyBehavior>
                <Button variant="outline">
                    Go to Projects Management
                </Button>
            </Link>
        </CardFooter>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Resource Allocation</CardTitle>
          <CardDescription className="text-destructive">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Feature Coming Soon: View team member assignments and workload across projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Resource allocation visualization will be available here.</p>
        </CardContent>
      </Card>

    </div>
  );
}
