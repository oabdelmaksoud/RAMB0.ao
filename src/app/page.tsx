'use client';

import { useState, useEffect } from 'react';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import ProjectCard from '@/components/features/projects/ProjectCard';
import type { Project } from '@/types';
import { initialMockProjects, PROJECTS_STORAGE_KEY, getTasksStorageKey, getAgentsStorageKey, getWorkflowsStorageKey, getFilesStorageKey } from '@/app/projects/page'; // Import shared constants
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
import Link from 'next/link';


export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    console.log("HOME_PAGE (formerly Projects): Attempting to load projects from localStorage.");
    const storedProjectsJson = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (storedProjectsJson) {
      try {
        const storedProjects = JSON.parse(storedProjectsJson);
        if (Array.isArray(storedProjects) && storedProjects.length > 0) {
          console.log("HOME_PAGE (formerly Projects): Loaded from localStorage:", storedProjects);
          setProjects(storedProjects);
        } else if (Array.isArray(storedProjects) && storedProjects.length === 0 && initialMockProjects.length > 0) {
          console.log("HOME_PAGE (formerly Projects): localStorage empty, initializing with initialMockProjects and saving.");
          setProjects(initialMockProjects);
          // localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(initialMockProjects)); // Let the save effect handle this
        } else {
          console.log("HOME_PAGE (formerly Projects): Invalid or empty data in localStorage, using initialMockProjects.");
          setProjects(initialMockProjects);
          // localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(initialMockProjects)); // Let the save effect handle this
        }
      } catch (e) {
        console.error("HOME_PAGE (formerly Projects): Error parsing projects from localStorage. Initial mocks will be used.", e);
        setProjects(initialMockProjects);
        // localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(initialMockProjects)); // Let the save effect handle this
      }
    } else {
      console.log("HOME_PAGE (formerly Projects): No projects found in localStorage. Initial mocks will be used.");
      setProjects(initialMockProjects);
      // localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(initialMockProjects)); // Let the save effect handle this
    }
  }, []);

  useEffect(() => {
    if (isClient && (projects.length > 0 || localStorage.getItem(PROJECTS_STORAGE_KEY) !== null)) {
      console.log("HOME_PAGE (formerly Projects): Saving projects to localStorage. Current projects state:", projects);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      console.log("HOME_PAGE (formerly Projects): Successfully saved projects to localStorage.");
    }
  }, [projects, isClient]);

  const handleAddProject = (projectData: Omit<Project, 'id' | 'status' | 'lastUpdated' | 'agentCount' | 'workflowCount'>) => {
    const newProject: Project = {
      id: `proj-${Date.now().toString().slice(-5)}-${Math.random().toString(36).substring(2, 7)}`,
      ...projectData,
      status: 'Active',
      lastUpdated: new Date().toISOString(),
      thumbnailUrl: projectData.thumbnailUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(projectData.name.substring(0,20))}`,
      agentCount: 0,
      workflowCount: 0,
    };
    console.log("HOME_PAGE (formerly Projects): handleAddProject - Adding new project:", newProject);
    setProjects(prevProjects => {
      const updatedProjects = [newProject, ...prevProjects];
      console.log("HOME_PAGE (formerly Projects): handleAddProject - State updated. New projects list:", updatedProjects);
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
      console.log("HOME_PAGE (formerly Projects): confirmDeleteProject - Deleting project:", projectToDelete);
      // Clean up project-specific data from localStorage
      localStorage.removeItem(getTasksStorageKey(projectToDelete.id));
      localStorage.removeItem(getAgentsStorageKey(projectToDelete.id));
      localStorage.removeItem(getWorkflowsStorageKey(projectToDelete.id));
      localStorage.removeItem(getFilesStorageKey(projectToDelete.id));
      
      setProjects(prevProjects => {
        const updatedProjects = prevProjects.filter(p => p.id !== projectToDelete.id);
        console.log("HOME_PAGE (formerly Projects): confirmDeleteProject - State updated. New projects list:", updatedProjects);
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

  if (!isClient && projects.length === 0) { // Show loading state only if projects haven't been populated from localStorage yet
    return (
       <div className="container mx-auto">
        <PageHeader className="items-start justify-between sm:flex-row sm:items-center">
          <div>
            <PageHeaderHeading>
              <Briefcase className="mr-2 inline-block h-6 w-6" />
              Projects
            </PageHeaderHeading>
            <PageHeaderDescription>
              Loading your projects... Manage your ongoing and completed projects.
            </PageHeaderDescription>
          </div>
        </PageHeader>
        <div className="text-center py-10">
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PageHeader className="items-start justify-between sm:flex-row sm:items-center">
        <div>
          <PageHeaderHeading>
            <Briefcase className="mr-2 inline-block h-6 w-6" />
            Projects
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
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                and all its associated tasks, agents, workflows, and files.
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
