
'use client';

import { useState, useEffect } from 'react';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import ProjectCard from '@/components/features/projects/ProjectCard';
import type { Project } from '@/types';
import { Briefcase, PlusCircle } from 'lucide-react';
import AddProjectDialog from '@/components/features/projects/AddProjectDialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

export const initialMockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'AI Powered Marketing Suite',
    description: 'Develop an integrated suite of marketing tools powered by generative AI to automate content creation and campaign management.',
    status: 'Active',
    lastUpdated: '2024-07-20T10:00:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png',
    agentCount: 5,
    workflowCount: 3,
  },
  {
    id: 'proj-002',
    name: 'Automated Financial Reporting',
    description: 'A system to automatically pull financial data from various sources, generate reports, and identify anomalies using intelligent agents.',
    status: 'Active',
    lastUpdated: '2024-07-21T14:30:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png',
    agentCount: 3,
    workflowCount: 2,
  },
  {
    id: 'proj-003',
    name: 'E-commerce Platform Revamp',
    description: 'Complete overhaul of the existing e-commerce platform with a focus on UX, performance, and AI-driven personalization.',
    status: 'On Hold',
    lastUpdated: '2024-06-15T09:00:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png',
    agentCount: 8,
    workflowCount: 5,
  },
];

const PROJECTS_STORAGE_KEY = 'agentFlowProjects';
const getTasksStorageKey = (projectId: string) => `agentFlowTasks_project_${projectId}`;
const getAgentsStorageKey = (projectId: string) => `agentFlowAgents_project_${projectId}`;
const getWorkflowsStorageKey = (projectId: string) => `agentFlowWorkflows_project_${projectId}`;

export default function ProjectsPage() {
  // Initialize with mock projects. Loading useEffect will override if localStorage has data.
  const [projects, setProjects] = useState<Project[]>(initialMockProjects);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const { toast } = useToast();

  // Load projects from localStorage on component mount (client-side only)
  useEffect(() => {
    console.log("PROJECTS_PAGE: Attempting to load projects from localStorage.");
    const storedProjectsJson = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (storedProjectsJson) {
      try {
        const storedProjects = JSON.parse(storedProjectsJson);
        console.log("PROJECTS_PAGE: Loaded from localStorage:", storedProjects);
        setProjects(storedProjects);
      } catch (e) {
        console.error("PROJECTS_PAGE: Error parsing projects from localStorage. Initial mocks will be used and saved.", e);
        // If parsing fails, `projects` state remains `initialMockProjects`.
        // The save effect below will then save these initial mocks.
      }
    } else {
      console.log("PROJECTS_PAGE: No projects found in localStorage. Initial mocks will be used and saved.");
      // `projects` state is already `initialMockProjects`, so no need to set it again.
      // The save effect below will save the initialMockProjects.
    }
  }, []); // Empty dependency array ensures this runs once on mount

  // Save projects to localStorage whenever the projects state changes
  useEffect(() => {
    console.log("PROJECTS_PAGE: Attempting to save projects to localStorage. Current projects state:", projects);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    console.log("PROJECTS_PAGE: Successfully saved projects to localStorage.");
  }, [projects]);

  const handleAddProject = (projectData: Omit<Project, 'id' | 'status' | 'lastUpdated' | 'agentCount' | 'workflowCount'>) => {
    const newProject: Project = {
      id: `proj-${Date.now().toString().slice(-5)}-${Math.random().toString(36).substring(2, 7)}`,
      ...projectData,
      status: 'Active',
      lastUpdated: new Date().toISOString(),
      thumbnailUrl: projectData.thumbnailUrl || 'https://placehold.co/600x400.png',
      agentCount: 0,
      workflowCount: 0,
    };
    console.log("PROJECTS_PAGE: handleAddProject - Adding new project:", newProject);
    setProjects(prevProjects => {
      const updatedProjects = [newProject, ...prevProjects];
      console.log("PROJECTS_PAGE: handleAddProject - State updated. New projects list:", updatedProjects);
      return updatedProjects;
    });
    toast({
      title: 'Project Created',
      description: `Project "${newProject.name}" has been successfully created.`,
    });
  };

  const handleOpenDeleteProjectDialog = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteProjectDialogOpen(true);
  };

  const confirmDeleteProject = () => {
    if (projectToDelete) {
      console.log("PROJECTS_PAGE: confirmDeleteProject - Deleting project:", projectToDelete);
      // Remove project-specific data
      localStorage.removeItem(getTasksStorageKey(projectToDelete.id));
      localStorage.removeItem(getAgentsStorageKey(projectToDelete.id));
      localStorage.removeItem(getWorkflowsStorageKey(projectToDelete.id));

      setProjects(prevProjects => {
        const updatedProjects = prevProjects.filter(p => p.id !== projectToDelete.id);
        console.log("PROJECTS_PAGE: confirmDeleteProject - State updated. New projects list:", updatedProjects);
        return updatedProjects;
      });
      toast({
        title: 'Project Deleted',
        description: `Project "${projectToDelete.name}" and its associated data have been deleted.`,
        variant: 'destructive',
      });
      setProjectToDelete(null);
      setIsDeleteProjectDialogOpen(false);
    }
  };


  return (
    <div className="container mx-auto">
      <PageHeader className="items-start justify-between sm:flex-row sm:items-center">
        <div>
          <PageHeaderHeading>
            <Briefcase className="mr-2 inline-block h-6 w-6" />
            Projects Overview
          </PageHeaderHeading>
          <PageHeaderDescription>
            Manage your ongoing and completed projects. Track progress and access project-specific resources and agents.
          </PageHeaderDescription>
        </div>
        <Button onClick={() => setIsAddProjectDialogOpen(true)} className="w-full mt-4 sm:w-auto sm:mt-0">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Project
        </Button>
      </PageHeader>

      {projects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDeleteProject={handleOpenDeleteProjectDialog} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-lg font-medium text-muted-foreground">No projects found.</p>
          <p className="text-sm text-muted-foreground/80 mt-1 mb-4">Create your first project to get started!</p>
          <Button onClick={() => setIsAddProjectDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Add First Project
          </Button>
        </div>
      )}

      <AddProjectDialog
        open={isAddProjectDialogOpen}
        onOpenChange={setIsAddProjectDialogOpen}
        onAddProject={handleAddProject}
      />

      {projectToDelete && (
         <AlertDialog open={isDeleteProjectDialogOpen} onOpenChange={setIsDeleteProjectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this project?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the project "{projectToDelete.name}" 
                and all its associated tasks, agents, and workflows.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setProjectToDelete(null);
                setIsDeleteProjectDialogOpen(false);
              }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

