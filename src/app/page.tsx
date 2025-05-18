
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Briefcase, CheckCircle, Activity, ListChecks, TrendingUp, ExternalLink, PieChart } from 'lucide-react';
import type { Project, Task, TaskStatus } from '@/types';
import { PROJECTS_STORAGE_KEY, initialMockProjects, getTasksStorageKey } from '@/app/projects/page'; // Import from new location
import ProjectCard from '@/components/features/projects/ProjectCard';
import { cn } from '@/lib/utils';

const projectStatusColors: { [key in Project['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

// This is now the Portfolio Dashboard Page
export default function PortfolioDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
    const loadedProjects = storedProjects ? JSON.parse(storedProjects) : initialMockProjects;
    setProjects(loadedProjects);

    let allTasks: Task[] = [];
    loadedProjects.forEach((project: Project) => {
      const tasksKey = getTasksStorageKey(project.id);
      const storedTasks = localStorage.getItem(tasksKey);
      if (storedTasks) {
        try {
          allTasks = allTasks.concat(JSON.parse(storedTasks));
        } catch (e) {
          console.error(`Error parsing tasks for project ${project.id}`, e);
        }
      }
    });
    setTasks(allTasks);
    setIsLoading(false);
  }, [isClient]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'Done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
  const toDoTasks = tasks.filter(task => task.status === 'To Do').length;
  const blockedTasks = tasks.filter(task => task.status === 'Blocked').length;

  const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const activeProjects = projects.filter(p => p.status === 'Active').length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;

  const getProjectHealth = (project: Project): { status: 'Healthy' | 'Warning' | 'Critical' | 'Unknown', message: string } => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    if (projectTasks.length === 0 && project.status === 'Active') return { status: 'Unknown', message: 'No tasks yet' };
    if (project.status === 'Completed') return { status: 'Healthy', message: 'Completed' };
    if (project.status === 'On Hold' || project.status === 'Archived') return { status: 'Unknown', message: project.status };

    const overdueTasks = projectTasks.filter(t => t.startDate && new Date(t.startDate) < new Date() && t.status !== 'Done').length;
    const highPriorityBlocked = projectTasks.filter(t => (t.priority === 'High' || t.priority === 'Medium') && t.status === 'Blocked').length;

    if (highPriorityBlocked > 0 || overdueTasks > 3) return { status: 'Critical', message: `${highPriorityBlocked} critical blockage(s), ${overdueTasks} overdue` };
    if (overdueTasks > 0 || projectTasks.some(t => t.status === 'Blocked')) return { status: 'Warning', message: `${overdueTasks} overdue, some blocked` };
    return { status: 'Healthy', message: 'On track' };
  };


  if (!isClient || isLoading) {
    return (
      <div className="container mx-auto p-4">
        <PageHeader>
          <PageHeaderHeading><PieChart className="mr-2 inline-block h-7 w-7" /> Portfolio Dashboard</PageHeaderHeading>
          <PageHeaderDescription>Aggregated view of all your projects and tasks. Loading data...</PageHeaderDescription>
        </PageHeader>
        <div className="text-center py-10">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading><PieChart className="mr-2 inline-block h-7 w-7" /> Portfolio Dashboard</PageHeaderHeading>
        <PageHeaderDescription>Aggregated view of all your projects and tasks.</PageHeaderDescription>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeProjects} Active, {completedProjects} Completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress.toFixed(0)}%</div>
            <Progress value={overallProgress} className="h-2 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks In Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">{toDoTasks} To Do, {blockedTasks} Blocked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">out of {totalTasks} total tasks</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projects Overview</CardTitle>
            <ShadCnCardDescription>Current status of all projects.</ShadCnCardDescription>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <ul className="space-y-3">
                {projects.map((project) => {
                  const health = getProjectHealth(project);
                  return (
                    <li key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "h-3 w-3 rounded-full",
                          health.status === 'Healthy' && "bg-green-500",
                          health.status === 'Warning' && "bg-yellow-500",
                          health.status === 'Critical' && "bg-red-500",
                          health.status === 'Unknown' && "bg-gray-400"
                        )} title={health.message}></span>
                        <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                          {project.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs", projectStatusColors[project.status])}>
                          {project.status}
                        </Badge>
                         <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                            <Link href={`/projects/${project.id}`}><ExternalLink className="h-3.5 w-3.5"/> </Link>
                         </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="mx-auto h-10 w-10 mb-2 opacity-50" />
                No projects found. <Link href="/projects" className="text-primary hover:underline">Manage projects here.</Link>
              </div>
            )}
          </CardContent>
           <CardFooter className="border-t pt-4">
             <Link href="/projects" passHref legacyBehavior>
                <Button variant="outline" className="w-full sm:w-auto">
                    Go to Projects Management
                    <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
             </Link>
            </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Allocation (Placeholder)</CardTitle>
            <ShadCnCardDescription>Overview of team and agent workload.</ShadCnCardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-10">
              Resource allocation charts and details will be displayed here.
            </p>
             <Link href="/resource-allocation" passHref legacyBehavior>
                <Button variant="secondary" className="w-full mt-2">
                    View Resource Details
                    <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
