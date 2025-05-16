
'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Briefcase, CalendarDays, Bot, Workflow as WorkflowIcon, ListChecks, Activity as ActivityIcon, TrendingUp, PlusCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Project } from '@/types';
import { mockProjects } from '@/app/projects/page'; // Temporary: Import mock data
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import AddTaskDialog from '@/components/features/projects/AddTaskDialog';
import { useToast } from '@/hooks/use-toast';

// Copied from ProjectCard for consistency, ideally this would be a shared utility or part of the type
const projectStatusColors: { [key in Project['status']]: string } = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  Completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  Archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
};

// Task statuses and colors for the task list
export const taskStatusColors: { [key: string]: string } = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700',
  'Blocked': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700',
};

export interface Task {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  assignedTo: string;
}

const initialMockTasks: Task[] = [
  { id: 'task-1', title: 'Define project scope and requirements', status: 'Done', assignedTo: 'AI Agent Alpha' },
  { id: 'task-2', title: 'Develop core agent logic for data analysis', status: 'In Progress', assignedTo: 'AI Agent Beta' },
  { id: 'task-3', title: 'Set up CI/CD pipeline for automated testing', status: 'In Progress', assignedTo: 'DevOps Agent' },
  { id: 'task-4', title: 'Integrate with external data sources', status: 'To Do', assignedTo: 'Data Ingestion Agent' },
  { id: 'task-5', title: 'Design user interface for reporting dashboard', status: 'To Do', assignedTo: 'UI/UX Designer' },
  { id: 'task-6', title: 'Perform security audit on agent communication', status: 'Blocked', assignedTo: 'Security Agent Gamma' },
];


export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [mockProgress, setMockProgress] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const foundProject = mockProjects.find(p => p.id === projectId);
    if (foundProject) {
      setProject(foundProject);
      setMockProgress((foundProject.id.charCodeAt(foundProject.id.length - 1) % 60) + 30); // Generate mock progress based on ID
      // Simulate loading tasks for this project (in a real app, this would be an API call)
      const projectSpecificTasks = initialMockTasks.map(task => ({
        ...task,
        id: `${projectId}-${task.id}` // Make task IDs unique per project for mock
      })).slice(0, Math.floor(Math.random() * initialMockTasks.length) +1); // Random number of tasks for variety
      setTasks(projectSpecificTasks);
    }
  }, [projectId]);

  const formatDate = (dateString: string | undefined) => {
    if (!isClient || !dateString) {
      return 'Loading date...';
    }
    try {
       // Check if it's already a human-readable string (e.g., "2 minutes ago")
       if (!dateString.includes('-') && !dateString.includes('/') && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(dateString)) {
        return dateString; 
      }
      return format(parseISO(dateString), "MMMM d, yyyy 'at' hh:mm a");
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString; // Fallback to original string on error
    }
  };

  const handleAddTask = (newTaskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now().toString().slice(-5)}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
    setIsAddTaskDialogOpen(false);
    toast({
      title: "Task Added",
      description: `Task "${newTask.title}" has been added to the project.`,
    });
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

  const mockRecentActivities = [
    `Agent "Data Analyzer" completed task "Analyze Q3 Sales Data" for project ${project.name}.`,
    `Workflow "Nightly Backup for ${project.name}" initiated successfully.`,
    `New comment by "Project Manager" on "Feature X" task.`,
    `Agent "Code Reviewer" flagged 2 critical issues in 'main' branch of ${project.name}.`,
  ];

  return (
    <div className="container mx-auto">
      <PageHeader>
        <div className="flex items-start sm:items-center space-x-4">
           {project.thumbnailUrl && (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border shadow-md hidden sm:block">
              <Image
                src={project.thumbnailUrl}
                alt={`${project.name} thumbnail`}
                fill
                style={{ objectFit: 'cover' }}
                data-ai-hint="project abstract"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className={cn("capitalize", projectStatusColors[project.status])}>
                {project.status}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Project ID:</span>
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{project.id}</span>
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
         <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Quick Overview</CardTitle>
            <CardDescription>A brief summary of the project's current state and key metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm text-muted-foreground flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" /> Project Progress
                </h4>
                <span className="text-sm font-medium">{mockProgress}%</span>
              </div>
              <Progress value={mockProgress} aria-label={`${mockProgress}% project progress`} className="h-2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/50 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">Pending Tasks</h4>
                    <p className="text-2xl font-bold">{tasks.filter(t => t.status === 'To Do' || t.status === 'In Progress').length}</p>
                </div>
                 <div className="p-4 bg-accent/50 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">Active Agents</h4>
                    <p className="text-2xl font-bold">{project.agentCount || 0}</p>
                </div>
                <div className="p-4 bg-accent/50 rounded-lg shadow-sm">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">Active Workflows</h4>
                    <p className="text-2xl font-bold">{project.workflowCount || 0}</p>
                </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center">
                <ActivityIcon className="h-4 w-4 mr-2" /> Recent Activity
              </h4>
              <ul className="space-y-2 text-sm max-h-40 overflow-y-auto pr-2">
                {mockRecentActivities.map((activity, index) => (
                  <li key={index} className="p-2 bg-background rounded-md border text-muted-foreground text-xs">
                    {activity}
                  </li>
                ))}
                 {mockRecentActivities.length === 0 && <p className="text-muted-foreground text-xs text-center py-2">No recent activity.</p>}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Separator className="my-6" />

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 md:w-auto md:inline-flex mb-4">
          <TabsTrigger value="tasks"><ListChecks className="mr-2 h-4 w-4"/>Tasks</TabsTrigger>
          <TabsTrigger value="agents"><Bot className="mr-2 h-4 w-4"/>Associated Agents</TabsTrigger>
          <TabsTrigger value="workflows"><WorkflowIcon className="mr-2 h-4 w-4"/>Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Task Management</CardTitle>
                <CardDescription>
                  Track and manage all tasks related to project "{project.name}".
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsAddTaskDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Task
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length > 0 ? (
                <ul className="space-y-3">
                  {tasks.map(task => (
                    <li key={task.id} className="p-3 border rounded-md bg-background hover:bg-accent/50 transition-colors shadow-sm">
                      <div className="flex items-start justify-between">
                        <h5 className="font-medium text-sm mb-1">{task.title}</h5>
                        <Badge variant="outline" className={cn("text-xs capitalize whitespace-nowrap", taskStatusColors[task.status])}>{task.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Assigned to: {task.assignedTo}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">No tasks found for this project. Add a task to get started!</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Associated Agents</CardTitle>
              <CardDescription>
                View, manage, and configure agents specifically assigned or relevant to project "{project.name}".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">
                This section will display a list of agents associated with this project. You'll be able to link existing global agents,
                create new project-specific agent instances, and manage their configurations within the context of "{project.name}".
                Think of it as your project's dedicated AI team, ready to automate tasks.
              </p>
               <div className="text-center py-6">
                <Bot className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Agent association functionality coming soon.</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  (e.g., Link agents from Agent Management or view project-specific instances)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <Card>
            <CardHeader>
              <CardTitle>Project Workflows</CardTitle>
              <CardDescription>
                Design, monitor, and manage automated workflows tailored for project "{project.name}".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">
                Here, you'll find all automated workflows relevant to this project. You will be able to design new workflows using project-specific agents,
                trigger existing workflows, and monitor the status and logs of ongoing automated processes. This is where you orchestrate your agents to achieve project goals.
              </p>
               <div className="text-center py-6">
                <WorkflowIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Workflow design and management features for projects are under development.</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  (e.g., View workflows utilizing this project's agents or resources)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AddTaskDialog
        open={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
        onAddTask={handleAddTask}
      />
    </div>
  );
}

