
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadCnTableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, PieChart, AlertCircle, Briefcase, Filter, ExternalLink } from 'lucide-react';
import { PROJECTS_STORAGE_KEY, initialMockProjects, getTasksStorageKey } from '@/app/projects/page';
import type { Project, Task } from '@/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface MockResource {
  id: string;
  name: string;
  type: 'Human' | 'Agent Pool' | 'Bot';
  capacityPercentage: number; // Total capacity, e.g., 100 for a full-time person
  skills?: string[];
  assignedProjects: Array<{
    projectId: string;
    projectName: string;
    allocationPercentage: number; // % of this resource's capacity allocated to this project
    taskCount: number;
  }>;
}

const mockResourcesData: MockResource[] = [
  {
    id: 'user-alice',
    name: 'Alice Wonderland',
    type: 'Human',
    capacityPercentage: 100,
    skills: ['React', 'Node.js', 'Project Management'],
    assignedProjects: [
      { projectId: 'proj-001', projectName: 'AI Powered Marketing Suite', allocationPercentage: 60, taskCount: 3 },
      { projectId: 'proj-002', projectName: 'Automated Financial Reporting', allocationPercentage: 40, taskCount: 2 },
    ],
  },
  {
    id: 'user-bob',
    name: 'Bob The Builder',
    type: 'Human',
    capacityPercentage: 100,
    skills: ['Python', 'Data Analysis', 'ASPICE'],
    assignedProjects: [
      { projectId: 'proj-002', projectName: 'Automated Financial Reporting', allocationPercentage: 75, taskCount: 5 },
    ],
  },
  {
    id: 'agentpool-analysis',
    name: 'Analysis Agent Pool',
    type: 'Agent Pool',
    capacityPercentage: 300, // Simulates 3 agents at 100%
    skills: ['Data Processing', 'Pattern Recognition'],
    assignedProjects: [
      { projectId: 'proj-001', projectName: 'AI Powered Marketing Suite', allocationPercentage: 100, taskCount: 8 },
      { projectId: 'proj-002', projectName: 'Automated Financial Reporting', allocationPercentage: 50, taskCount: 4 },
    ],
  },
  {
    id: 'bot-ci',
    name: 'CI/CD Bot',
    type: 'Bot',
    capacityPercentage: 100, // A bot can be thought of as 100% available for its tasks
    skills: ['Build Automation', 'Deployment'],
    assignedProjects: [
      { projectId: 'proj-001', projectName: 'AI Powered Marketing Suite', allocationPercentage: 20, taskCount: 1 },
      { projectId: 'proj-002', projectName: 'Automated Financial Reporting', allocationPercentage: 30, taskCount: 1 },
    ],
  },
  {
    id: 'user-charlie',
    name: 'Charlie Brown',
    type: 'Human',
    capacityPercentage: 100,
    skills: ['QA', 'Testing'],
    assignedProjects: [],
  },
];


export default function ResourceAllocationPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<MockResource[]>(mockResourcesData); // Using mock data for now
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (storedProjects) {
      try {
        setProjects(JSON.parse(storedProjects));
      } catch (e) {
        console.error("Failed to parse projects from localStorage", e);
        setProjects(initialMockProjects);
      }
    } else {
      setProjects(initialMockProjects);
    }
    setIsLoading(false);
  }, [isClient]);

  const calculateTotalAllocation = (resource: MockResource): number => {
    return resource.assignedProjects.reduce((sum, p) => sum + p.allocationPercentage, 0);
  };

  const getOverallocationClass = (totalAllocation: number, capacity: number) => {
    if (totalAllocation > capacity) return 'text-destructive font-semibold';
    if (totalAllocation > capacity * 0.85) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };
  
  const getProgressColorClass = (totalAllocation: number, capacity: number) => {
    if (totalAllocation > capacity) return 'bg-destructive';
    if (totalAllocation > capacity * 0.85) return 'bg-yellow-500';
    return 'bg-primary';
  }

  if (!isClient || isLoading) {
    return (
      <div className="container mx-auto p-4">
        <PageHeader>
          <PageHeaderHeading><Users className="mr-2 inline-block h-6 w-6" /> Resource Allocation Overview</PageHeaderHeading>
          <PageHeaderDescription>Loading resource data...</PageHeaderDescription>
        </PageHeader>
        <div className="text-center py-10">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <PageHeader>
        <PageHeaderHeading><Users className="mr-2 inline-block h-7 w-7" /> Resource Allocation Overview</PageHeaderHeading>
        <PageHeaderDescription>
          Monitor resource capacity, allocations, and utilization across projects. (Mock Data)
        </PageHeaderDescription>
      </PageHeader>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center"><PieChart className="mr-2 h-5 w-5" /> Resource Utilization Summary</CardTitle>
          <CardDescription>High-level overview of resource capacity and allocation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <h3 className="text-sm font-medium text-muted-foreground">Total Resources</h3>
              <p className="text-2xl font-bold">{resources.length}</p>
            </div>
            <div className="p-4 border rounded-lg bg-muted/30">
              <h3 className="text-sm font-medium text-muted-foreground">Overall Capacity</h3>
              <p className="text-2xl font-bold">{resources.reduce((sum, r) => sum + r.capacityPercentage, 0)}%</p>
            </div>
            <div className="p-4 border rounded-lg bg-muted/30">
              <h3 className="text-sm font-medium text-muted-foreground">Total Allocated</h3>
              <p className="text-2xl font-bold">{resources.reduce((sum, r) => sum + calculateTotalAllocation(r), 0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Resource Details</CardTitle>
              <CardDescription>Individual resource allocation and capacity.</CardDescription>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Filter className="mr-2 h-4 w-4" /> Filter Resources (Placeholder)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <ShadCnTableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Resource Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[150px] text-center">Total Allocation</TableHead>
                <TableHead className="w-[200px] text-center">Capacity Utilization</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </ShadCnTableHeader>
            <TableBody>
              {resources.map((resource) => {
                const totalAllocation = calculateTotalAllocation(resource);
                const utilizationPercentage = resource.capacityPercentage > 0 ? Math.min(100, (totalAllocation / resource.capacityPercentage) * 100) : 0;
                return (
                  <TableRow key={resource.id}>
                    <TableCell className="font-medium">{resource.name}</TableCell>
                    <TableCell><Badge variant="secondary">{resource.type}</Badge></TableCell>
                    <TableCell className={cn("text-center font-semibold", getOverallocationClass(totalAllocation, resource.capacityPercentage))}>
                      {totalAllocation}% / {resource.capacityPercentage}%
                      {totalAllocation > resource.capacityPercentage && (
                        <AlertCircle className="inline-block ml-1 h-4 w-4 text-destructive" title="Overallocated" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Progress 
                          value={utilizationPercentage} 
                          className={cn("h-3 w-full max-w-[150px]", getProgressColorClass(totalAllocation, resource.capacityPercentage))} 
                          title={`${utilizationPercentage.toFixed(0)}% utilized`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled className="text-xs">View Assignments</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {resources.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No resources to display.</TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Card className="mt-6">
        <CardHeader>
            <CardTitle className="flex items-center"><Briefcase className="mr-2 h-5 w-5"/> Project Allocation Overview (Placeholder)</CardTitle>
            <CardDescription>View resource allocation per project. This section is a placeholder for future development.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground text-center py-8">
                A view listing projects and their allocated resources will be available here.
            </p>
             <div className="mt-4 space-y-2">
                {projects.slice(0, 2).map(p => (
                    <div key={p.id} className="p-3 border rounded-md bg-muted/20">
                        <h4 className="font-semibold">{p.name}</h4>
                        <p className="text-xs text-muted-foreground">
                            {mockResourcesData.filter(r => r.assignedProjects.some(ap => ap.projectId === p.id))
                                .map(r => `${r.name} (${r.assignedProjects.find(ap=>ap.projectId === p.id)?.allocationPercentage}%)`)
                                .join(', ') || "No resources specifically assigned in mock data."}
                        </p>
                         <Link href={`/projects/${p.id}`} passHref legacyBehavior>
                            <Button variant="link" size="xs" className="mt-1 p-0 h-auto">View Project Details <ExternalLink className="ml-1 h-3 w-3"/></Button>
                         </Link>
                    </div>
                ))}
             </div>
        </CardContent>
      </Card>

    </div>
  );
}
