
'use client';

import { useEffect, useState } from 'react';
import type { Project, Task } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { BarChart3, Briefcase, ListChecks, AlertCircle, CheckCircle2, RotateCcw, TrendingUp } from 'lucide-react';
import { PROJECTS_STORAGE_KEY, getTasksStorageKey, initialMockProjects } from '@/app/projects/page'; // Assuming these are still exported from /projects/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress'; // Added Progress
import { cn } from '@/lib/utils'; // Added cn

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
  overallProgress: number; // New metric
}

interface ProjectWithHealth extends Project {
  healthStatus: 'Healthy' | 'Warning' | 'Critical';
  healthReason?: string;
  taskCounts?: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    blocked: number;
  };
}

export default function PortfolioDashboardPage() {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [projectsWithHealth, setProjectsWithHealth] = useState<ProjectWithHealth[]>([]);
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

    let allTasksAcrossProjects: Task[] = [];
    const projectsDataWithHealth: ProjectWithHealth[] = loadedProjects.map(project => {
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
      allTasksAcrossProjects.push(...projectTasks);

      const taskCounts = {
        total: projectTasks.filter(t => !t.isMilestone).length,
        todo: projectTasks.filter(t => !t.isMilestone && t.status === 'To Do').length,
        inProgress: projectTasks.filter(t => !t.isMilestone && t.status === 'In Progress').length,
        done: projectTasks.filter(t => !t.isMilestone && t.status === 'Done').length,
        blocked: projectTasks.filter(t => !t.isMilestone && t.status === 'Blocked').length,
      };
      
      let healthStatus: ProjectWithHealth['healthStatus'] = 'Healthy';
      let healthReason = "";
      if (taskCounts.blocked > 2 || (taskCounts.total > 0 && (taskCounts.blocked / taskCounts.total) > 0.25) ) {
        healthStatus = 'Critical';
        healthReason = `${taskCounts.blocked} tasks blocked`;
      } else if (taskCounts.blocked > 0 || (taskCounts.total > 0 && (taskCounts.inProgress / taskCounts.total) > 0.75 && taskCounts.done === 0) ) {
        healthStatus = 'Warning';
        healthReason = taskCounts.blocked > 0 ? `${taskCounts.blocked} tasks blocked` : "High WIP, low completion";
      }


      return { ...project, healthStatus, healthReason, taskCounts };
    });

    setProjectsWithHealth(projectsDataWithHealth);

    const nonMilestoneTasks = allTasksAcrossProjects.filter(t => !t.isMilestone);
    const totalTasksCount = nonMilestoneTasks.length;
    const doneTasksCount = nonMilestoneTasks.filter(t => t.status === 'Done').length;
    const overallProgress = totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

    setMetrics({
      totalProjects: loadedProjects.length,
      activeProjects: loadedProjects.filter(p => p.status === 'Active').length,
      completedProjects: loadedProjects.filter(p => p.status === 'Completed').length,
      onHoldProjects: loadedProjects.filter(p => p.status === 'On Hold').length,
      totalTasks: totalTasksCount,
      todoTasks: nonMilestoneTasks.filter(t => t.status === 'To Do').length,
      inProgressTasks: nonMilestoneTasks.filter(t => t.status === 'In Progress').length,
      doneTasks: doneTasksCount,
      blockedTasks: nonMilestoneTasks.filter(t => t.status === 'Blocked').length,
      overallProgress,
    });
    setIsLoading(false);
  }, [isClient]);

  const getHealthIndicator = (status: ProjectWithHealth['healthStatus']) => {
    switch (status) {
      case 'Healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'Warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'Critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

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

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-md">Overall Portfolio Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={metrics.overallProgress} className="w-full h-3" />
            <p className="text-sm text-muted-foreground mt-2">{metrics.overallProgress}% of tasks completed across all projects.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeProjects} active, {metrics.completedProjects} completed, {metrics.onHoldProjects} on hold
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
            <p className="text-xs text-muted-foreground">Across all non-milestone tasks</p>
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
          <CardDescription>Current status and health of all projects.</CardDescription>
        </CardHeader>
        <CardContent>
          {projectsWithHealth.length > 0 ? (
            <div className="space-y-3">
              {projectsWithHealth.map(project => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <Link href={`/projects/${project.id}`} className="font-semibold text-primary hover:underline text-lg">
                        {project.name}
                      </Link>
                      <Badge variant="outline" className={cn(project.status === 'Active' ? 'border-green-500 text-green-700' : (project.status === 'Completed' ? 'border-blue-500 text-blue-700' : 'border-yellow-500 text-yellow-700'))}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                    <p className="line-clamp-2 mb-2">{project.description}</p>
                    <div className="flex items-center gap-2 text-xs">
                      {getHealthIndicator(project.healthStatus)}
                      <span>Health: {project.healthStatus}</span>
                      {project.healthReason && <span className="italic">({project.healthReason})</span>}
                    </div>
                    {project.taskCounts && (
                      <div className="mt-1 text-xs">
                        Tasks: {project.taskCounts.done} Done / {project.taskCounts.total} Total ({project.taskCounts.blocked} Blocked)
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="p-4 border-t">
                     <Link href={`/projects/${project.id}`} passHref legacyBehavior>
                        <Button variant="ghost" size="sm" className="text-xs">
                            View Details
                        </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">No projects available to display. Create your first project!</p>
          )}
        </CardContent>
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
