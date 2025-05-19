
'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Project, ProjectTemplate, Task, ProjectFile } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import ProjectCard from '@/components/features/projects/ProjectCard';
import { Button } from '@/components/ui/button';
import { FilePlus2, Briefcase } from 'lucide-react';
import AddProjectDialog from '@/components/features/projects/AddProjectDialog';
import { useToast } from '@/hooks/use-toast';
import { mockProjectTemplates } from '@/lib/project-templates';
import { format } from 'date-fns';
import { uid } from '@/lib/utils';
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

// These are EXPORTED so they can be used by other pages like project detail page
export const initialMockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'AI Powered Marketing Suite',
    description: 'Develop an integrated suite of marketing tools powered by generative AI to automate content creation and campaign management.',
    status: 'Active',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    thumbnailUrl: 'https://placehold.co/600x400.png?text=AI+Marketing',
    agentCount: 5,
    workflowCount: 3,
  },
  {
    id: 'proj-002',
    name: 'Automated Financial Reporting',
    description: 'A system to automatically pull financial data from various sources, generate reports, and identify anomalies using intelligent agents.',
    status: 'Active',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), // 1 day ago
    thumbnailUrl: 'https://placehold.co/600x400.png?text=Fin+Reporting',
    agentCount: 3,
    workflowCount: 2,
  },
  {
    id: 'proj-003',
    name: 'E-commerce Platform Revamp',
    description: 'Complete overhaul of the existing e-commerce platform with a focus on UX, performance, and AI-driven personalization.',
    status: 'On Hold',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
    thumbnailUrl: 'https://placehold.co/600x400.png?text=E-commerce',
    agentCount: 8,
    workflowCount: 5,
  },
];

export const PROJECTS_STORAGE_KEY = 'ramboAgentProjects';
export const getTasksStorageKey = (projectId: string) => `ramboAgentTasks_project_${projectId}`;
export const getAgentsStorageKey = (projectId: string) => `ramboAgentAgents_project_${projectId}`;
export const getWorkflowsStorageKey = (projectId: string) => `ramboAgentWorkflows_project_${projectId}`;
export const getFilesStorageKey = (projectId: string) => `ramboAgentFiles_project_${projectId}`;
export const getRequirementsStorageKey = (projectId: string) => `ramboAgentRequirementDocs_project_${projectId}`;
export const getTicketsStorageKey = (projectId: string) => `ramboAgentTickets_project_${projectId}`;
export const getSprintsStorageKey = (projectId: string) => `ramboAgentSprints_project_${projectId}`;


// This page is now the dedicated Projects Management Page
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteConfirmationDialogOpen, setIsDeleteConfirmationDialogOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      console.log("PROJECTS_MANAGEMENT_PAGE: Attempting to load projects from localStorage.");
      const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (storedProjects) {
        try {
          const parsedProjects = JSON.parse(storedProjects);
          if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
            setProjects(parsedProjects);
            console.log("PROJECTS_MANAGEMENT_PAGE: Loaded projects from localStorage:", parsedProjects.length);
          } else {
            setProjects(initialMockProjects); // Initialize with detailed mocks if localStorage is empty/invalid
            console.log("PROJECTS_MANAGEMENT_PAGE: localStorage empty or invalid, initialized with mocks:", initialMockProjects.length);
          }
        } catch (error) {
          console.error("PROJECTS_MANAGEMENT_PAGE: Error parsing projects from localStorage, using initial mocks.", error);
          setProjects(initialMockProjects);
        }
      } else {
        console.log("PROJECTS_MANAGEMENT_PAGE: No projects in localStorage, using initial mocks.");
        setProjects(initialMockProjects);
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient && projects.length > 0) {
      console.log("PROJECTS_MANAGEMENT_PAGE: Attempting to save projects to localStorage. Current projects count:", projects.length);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      console.log("PROJECTS_MANAGEMENT_PAGE: Successfully saved projects to localStorage.");
    } else if (isClient && projects.length === 0 && localStorage.getItem(PROJECTS_STORAGE_KEY)) {
        // If all projects are deleted, clear the projects key or save an empty array
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([]));
        console.log("PROJECTS_MANAGEMENT_PAGE: All projects deleted, saved empty array to localStorage.");
    }
  }, [projects, isClient]);


  const createInitialFilesRecursive = useCallback((files: ProjectTemplate['initialFiles'], currentPath: string, projectId: string): ProjectFile[] => {
    if (!files || !Array.isArray(files)) return [];
    return files.map((fileTemplate, index) => {
      const fileId = uid(`projfile-${projectId.slice(-4)}-${fileTemplate.name.replace(/\s+/g, '-').toLowerCase()}-${index}`);
      const newFile: ProjectFile = {
        id: fileId,
        name: fileTemplate.name,
        type: fileTemplate.type,
        path: currentPath,
        lastModified: new Date().toISOString(),
        content: fileTemplate.type === 'file' ? (fileTemplate.content || `// Placeholder for ${fileTemplate.name}`) : undefined,
        children: fileTemplate.type === 'folder' ? createInitialFilesRecursive(fileTemplate.children || [], `${currentPath}${fileTemplate.name}/`, projectId) : [],
        size: fileTemplate.type === 'file' ? `${Math.floor(Math.random() * 100) + 1}KB` : undefined,
      };
      return newFile;
    });
  }, []);

  const handleAddProject = useCallback((projectData: Omit<Project, 'id' | 'status' | 'lastUpdated' | 'agentCount' | 'workflowCount'>, templateId?: string) => {
    console.log("PROJECTS_MANAGEMENT_PAGE: handleAddProject called with data:", projectData, "and templateId:", templateId);
    const newProject: Project = {
      ...projectData,
      id: uid('proj'),
      status: 'Active',
      lastUpdated: new Date().toISOString(),
      thumbnailUrl: `https://placehold.co/600x400.png?text=${encodeURIComponent(projectData.name.substring(0,20))}`,
      agentCount: 0, 
      workflowCount: 0, 
    };

    const selectedTemplate = mockProjectTemplates.find(t => t.id === templateId);
    let templateMessage = "Project created from Blank template.";
    
    const initialTasksForProject: Task[] = [];
    let initialFilesForProject: ProjectFile[] = [];

    if (selectedTemplate && selectedTemplate.id !== 'template-blank') {
      templateMessage = `Project created using the "${selectedTemplate.name}" template.`;
      if (selectedTemplate.initialTasks && selectedTemplate.initialTasks.length > 0) {
        selectedTemplate.initialTasks.forEach((taskTemplate, index) => {
          initialTasksForProject.push({
            id: uid(`task-${newProject.id.slice(-5)}-${index}`),
            projectId: newProject.id,
            title: taskTemplate.title || 'Untitled Template Task',
            status: taskTemplate.status || 'To Do',
            assignedTo: taskTemplate.assignedTo || 'Unassigned',
            startDate: taskTemplate.startDate || format(new Date(), 'yyyy-MM-dd'),
            durationDays: taskTemplate.isMilestone ? 0 : (taskTemplate.durationDays === undefined || taskTemplate.durationDays < 1 ? 1 : Math.max(1, taskTemplate.durationDays)),
            progress: taskTemplate.isMilestone ? (taskTemplate.status === 'Done' ? 100 : 0) : (taskTemplate.progress || 0),
            isMilestone: taskTemplate.isMilestone || false,
            parentId: taskTemplate.parentId || null,
            dependencies: taskTemplate.dependencies || [],
            description: taskTemplate.description || `Initial task from ${selectedTemplate.name} template.`,
            isAiPlanned: false, 
            sprintId: null,
          });
        });
      }
      if (selectedTemplate.initialFiles && selectedTemplate.initialFiles.length > 0) {
        initialFilesForProject = createInitialFilesRecursive(selectedTemplate.initialFiles, '/', newProject.id);
      }
      // Placeholder for initial agents/workflows from template if added to ProjectTemplate type
      newProject.agentCount = 0; // Or count from template.initialAgents
      newProject.workflowCount = 0; // Or count from template.initialWorkflows
    }
    
    localStorage.setItem(getTasksStorageKey(newProject.id), JSON.stringify(initialTasksForProject));
    localStorage.setItem(getAgentsStorageKey(newProject.id), JSON.stringify([])); 
    localStorage.setItem(getWorkflowsStorageKey(newProject.id), JSON.stringify([])); 
    localStorage.setItem(getFilesStorageKey(newProject.id), JSON.stringify(initialFilesForProject));
    localStorage.setItem(getRequirementsStorageKey(newProject.id), JSON.stringify([])); 
    localStorage.setItem(getTicketsStorageKey(newProject.id), JSON.stringify([])); 
    localStorage.setItem(getSprintsStorageKey(newProject.id), JSON.stringify([]));


    setProjects(prevProjects => [newProject, ...prevProjects]);
    setIsAddProjectDialogOpen(false);
    toast({
      title: "Project Created",
      description: `"${newProject.name}" has been successfully created. ${templateMessage}`,
    });
  }, [toast, createInitialFilesRecursive]);

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteConfirmationDialogOpen(true);
  };

  const confirmDeleteProject = () => {
    if (projectToDelete) {
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectToDelete.id));
      
      localStorage.removeItem(getTasksStorageKey(projectToDelete.id));
      localStorage.removeItem(getAgentsStorageKey(projectToDelete.id));
      localStorage.removeItem(getWorkflowsStorageKey(projectToDelete.id));
      localStorage.removeItem(getFilesStorageKey(projectToDelete.id));
      localStorage.removeItem(getRequirementsStorageKey(projectToDelete.id));
      localStorage.removeItem(getTicketsStorageKey(projectToDelete.id));
      localStorage.removeItem(getSprintsStorageKey(projectToDelete.id));


      toast({
        title: "Project Deleted",
        description: `Project "${projectToDelete.name}" and its associated data have been deleted.`,
        variant: "destructive",
      });
      setProjectToDelete(null);
      setIsDeleteConfirmationDialogOpen(false);
    }
  };

  if (!isClient) {
    return (
        <div className="container mx-auto">
            <PageHeader>
                <PageHeaderHeading>Manage Projects</PageHeaderHeading>
                <PageHeaderDescription>Create new projects or manage existing ones.</PageHeaderDescription>
            </PageHeader>
            <div className="text-center py-10">Loading projects...</div>
        </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PageHeader className="items-start justify-between sm:flex-row sm:items-center">
        <div>
          <PageHeaderHeading>Manage Projects</PageHeaderHeading>
          <PageHeaderDescription>
            Create new projects or view, edit, and manage existing ones.
          </PageHeaderDescription>
        </div>
        <Button onClick={() => setIsAddProjectDialogOpen(true)} className="w-full mt-4 sm:w-auto sm:mt-0">
          <FilePlus2 className="mr-2 h-4 w-4" /> Add New Project
        </Button>
      </PageHeader>

      {projects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDeleteProject={handleDeleteProject} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center min-h-[300px] bg-muted/20">
            <Briefcase className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
            <p className="mb-4">Get started by creating your first project.</p>
            <Button onClick={() => setIsAddProjectDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                <FilePlus2 className="mr-2 h-4 w-4"/>Add First Project
            </Button>
        </div>
      )}

      <AddProjectDialog
        open={isAddProjectDialogOpen}
        onOpenChange={setIsAddProjectDialogOpen}
        onAddProject={handleAddProject}
      />

      {projectToDelete && (
        <AlertDialog open={isDeleteConfirmationDialogOpen} onOpenChange={setIsDeleteConfirmationDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete "{projectToDelete.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the project and all its associated data (tasks, agents, workflows, files, requirements, tickets, sprints).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setProjectToDelete(null); setIsDeleteConfirmationDialogOpen(false);}}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Project</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
