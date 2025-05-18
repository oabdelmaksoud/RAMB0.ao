
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import ProjectCard from '@/components/features/projects/ProjectCard';
import type { Project, Task, ProjectFile } from '@/types'; // Added ProjectFile
import { 
  initialMockProjects, 
  PROJECTS_STORAGE_KEY, 
  getTasksStorageKey, 
  getAgentsStorageKey, 
  getWorkflowsStorageKey,
  getFilesStorageKey // Added
} from '@/app/projects/page'; 
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
import { mockProjectTemplates } from '@/lib/project-templates'; // Import templates
import { format } from 'date-fns';

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>(initialMockProjects);
  const [isClient, setIsClient] = useState(false);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    console.log("PROJECTS_PAGE: Attempting to load projects from localStorage.");
    const storedProjectsJson = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (storedProjectsJson) {
      try {
        const storedProjects = JSON.parse(storedProjectsJson);
        setProjects(storedProjects);
        console.log("PROJECTS_PAGE: Loaded from localStorage:", storedProjects);
      } catch (e) {
        console.error("PROJECTS_PAGE: Error parsing projects from localStorage. Initial mocks will be used.", e);
        setProjects(initialMockProjects); // Fallback to initial mocks
      }
    } else {
      console.log("PROJECTS_PAGE: No projects found in localStorage. Initial mocks will be used and saved.");
      // No need to setProjects(initialMockProjects) as it's the default state
      // The save effect below will save the initialMockProjects if localStorage was empty
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      console.log("PROJECTS_PAGE: Attempting to save projects to localStorage. Current projects state:", projects);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      console.log("PROJECTS_PAGE: Successfully saved projects to localStorage.");
    }
  }, [projects, isClient]);

  const createInitialFiles = (projectId: string, templateFiles: Array<Omit<ProjectFile, 'id' | 'path' | 'lastModified' | 'size'>>, currentPath: string = '/'): ProjectFile[] => {
    return templateFiles.map((fileTemplate, index) => {
      const fileId = `file-${projectId}-${currentPath.replace(/\//g, '-')}${fileTemplate.name.replace(/\s+/g, '-')}-${Date.now()}-${index}`;
      const newFile: ProjectFile = {
        id: fileId,
        name: fileTemplate.name,
        type: fileTemplate.type,
        path: currentPath,
        lastModified: new Date().toISOString(),
        size: fileTemplate.type === 'file' ? `${Math.floor(Math.random() * 500) + 10}KB` : undefined, // Mock size for files
        children: fileTemplate.type === 'folder' ? createInitialFiles(projectId, fileTemplate.children || [], `${currentPath}${fileTemplate.name}/`) : undefined,
      };
      return newFile;
    });
  };


  const handleAddProject = (
    projectData: Omit<Project, 'id' | 'status' | 'lastUpdated' | 'agentCount' | 'workflowCount'>,
    templateId?: string
  ) => {
    const newProjectId = `proj-${Date.now().toString().slice(-5)}-${Math.random().toString(36).substring(2, 7)}`;
    const newProject: Project = {
      id: newProjectId,
      ...projectData,
      status: 'Active',
      lastUpdated: new Date().toISOString(),
      thumbnailUrl: projectData.thumbnailUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(projectData.name.substring(0,20))}`,
      agentCount: 0, // Will be based on template or default
      workflowCount: 0, // Will be based on template or default
    };

    let initialTasksForProject: Task[] = [];
    let initialFilesForProject: ProjectFile[] = [];
    // For now, initial agents and workflows from templates are not implemented to keep this step focused.
    // They would be handled similarly to tasks and files.

    if (templateId) {
      const selectedTemplate = mockProjectTemplates.find(t => t.id === templateId);
      if (selectedTemplate) {
        console.log(`PROJECTS_PAGE: Using template "${selectedTemplate.name}" for new project "${newProject.name}"`);
        // Initialize tasks from template
        if (selectedTemplate.initialTasks) {
          initialTasksForProject = selectedTemplate.initialTasks.map((taskTemplate, index) => ({
            id: `task-${newProjectId}-${index}-${Date.now().toString().slice(-3)}`,
            projectId: newProjectId, // Associate with the new project
            title: taskTemplate.title || "Untitled Task",
            status: taskTemplate.status || 'To Do',
            assignedTo: taskTemplate.assignedTo || 'Unassigned',
            startDate: taskTemplate.startDate || format(new Date(), 'yyyy-MM-dd'),
            durationDays: taskTemplate.durationDays === undefined ? 1 : taskTemplate.durationDays,
            progress: taskTemplate.progress === undefined ? 0 : taskTemplate.progress,
            isMilestone: taskTemplate.isMilestone || false,
            parentId: taskTemplate.parentId || null,
            dependencies: taskTemplate.dependencies || [],
            description: taskTemplate.description || "",
          }));
          localStorage.setItem(getTasksStorageKey(newProjectId), JSON.stringify(initialTasksForProject));
          console.log(`PROJECTS_PAGE: Initialized ${initialTasksForProject.length} tasks for project ${newProjectId} from template.`);
        }

        // Initialize files from template
        if (selectedTemplate.initialFiles) {
          initialFilesForProject = createInitialFiles(newProjectId, selectedTemplate.initialFiles);
          localStorage.setItem(getFilesStorageKey(newProjectId), JSON.stringify(initialFilesForProject));
           console.log(`PROJECTS_PAGE: Initialized file structure for project ${newProjectId} from template.`);
        }
        
        // Placeholder for initializing agents and workflows if templates define them
        // newProject.agentCount = selectedTemplate.initialAgents?.length || 0;
        // newProject.workflowCount = selectedTemplate.initialWorkflows?.length || 0;
      }
    }
    
    console.log("PROJECTS_PAGE: handleAddProject - Adding new project:", newProject);
    setProjects(prevProjects => {
      const updatedProjects = [newProject, ...prevProjects];
      console.log("PROJECTS_PAGE: handleAddProject - State updated. New projects list:", updatedProjects);
      return updatedProjects;
    });

    toast({
      title: 'Project Created',
      description: `Project "${newProject.name}" has been successfully created ${templateId && templateId !== 'template-blank' ? 'using the "' + mockProjectTemplates.find(t => t.id === templateId)?.name + '" template' : ''}.`,
    });
  };

  const handleOpenDeleteProjectDialog = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteProjectDialogOpen(true);
  };

  const confirmDeleteProject = () => {
    if (projectToDelete) {
      console.log("PROJECTS_PAGE: confirmDeleteProject - Deleting project:", projectToDelete);
      // Clean up project-specific data from localStorage
      localStorage.removeItem(getTasksStorageKey(projectToDelete.id));
      localStorage.removeItem(getAgentsStorageKey(projectToDelete.id));
      localStorage.removeItem(getWorkflowsStorageKey(projectToDelete.id));
      localStorage.removeItem(getFilesStorageKey(projectToDelete.id));
      
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

  if (!isClient && projects.length === 0) {
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
