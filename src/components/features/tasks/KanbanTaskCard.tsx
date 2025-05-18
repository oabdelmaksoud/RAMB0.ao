
// src/components/features/tasks/KanbanTaskCard.tsx
'use client';

import React from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, FolderGit2, ListTree, Diamond, Eye, Edit2, MessageSquare, Trash2, Brain, Hand, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface KanbanTaskCardProps {
  task: Task;
  isDragging: boolean;
  isDragTarget: boolean;
  taskStatusColors: { [key in Task['status']]: string };
  onDragStart: (event: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragOverCard: (event: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragLeaveCard: (event: React.DragEvent<HTMLDivElement>) => void;
  onDropOnCard: (event: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onChatTask: (task: Task) => void;
  isParentTask: boolean;
  sprintName?: string; // Added sprintName
}

const KanbanTaskCard = React.memo(function KanbanTaskCard({
  task,
  isDragging,
  isDragTarget,
  taskStatusColors,
  onDragStart,
  onDragOverCard,
  onDragLeaveCard,
  onDropOnCard,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onChatTask,
  isParentTask,
  sprintName, // Added sprintName
}: KanbanTaskCardProps) {
  return (
    <Card
      key={task.id}
      data-task-id={task.id}
      className={cn(
        "shadow-sm bg-card flex flex-col hover:shadow-md transition-shadow group",
        isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab",
        isDragTarget && "ring-2 ring-green-500"
      )}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragOver={(e) => onDragOverCard(e, task)}
      onDragLeave={onDragLeaveCard}
      onDrop={(e) => onDropOnCard(e, task)}
    >
      <CardHeader className="p-3 flex items-start justify-between gap-2">
        <div className={cn("flex items-center flex-grow min-w-0", task.parentId ? "pl-2" : "")}>
          <GripVertical className="h-4 w-4 mr-1.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 cursor-grab flex-shrink-0 opacity-50 group-hover:opacity-100" />
          <CardTitle
            className={cn(
              "text-sm font-medium leading-tight flex items-center min-w-0",
              isParentTask && "font-bold"
            )}
            title={task.title}
          >
            {task.parentId && <FolderGit2 className="mr-1.5 h-3 w-3 text-muted-foreground/70 flex-shrink-0" />}
            {isParentTask && !task.isMilestone && <ListTree className="mr-1.5 h-3 w-3 text-sky-600 flex-shrink-0" />}
            {task.isMilestone && <Diamond className="mr-1.5 h-3 w-3 text-amber-500 flex-shrink-0" />}
            {task.isAiPlanned ? 
              <Brain className="mr-1.5 h-3 w-3 text-purple-500 flex-shrink-0" title="AI Planned Task"/> : 
              <Hand className="mr-1.5 h-3 w-3 text-blue-500 flex-shrink-0" title="Manually Created Task"/>
            }
            <span className="whitespace-normal break-words">{task.title}</span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className={cn("p-3 pt-0 text-xs flex-grow", task.parentId ? "pl-5" : "")}>
        <Badge variant="outline" className={cn("capitalize text-xs mb-1.5", taskStatusColors[task.status])}>
          {task.status}
        </Badge>
        <p className="text-muted-foreground truncate">Assigned to: {task.assignedTo}</p>
        {task.startDate && <p className="text-muted-foreground mt-1">{task.isMilestone ? 'Date' : 'Starts'}: {format(parseISO(task.startDate), 'MMM d')}</p>}
        {!task.isMilestone && task.durationDays !== undefined && <p className="text-muted-foreground">Duration: {task.durationDays}d</p>}
        {sprintName && (
          <p className="text-muted-foreground mt-1 flex items-center">
            <Layers className="h-3 w-3 mr-1 text-indigo-500" /> Sprint: {sprintName}
          </p>
        )}
        {!task.isMilestone && task.progress !== undefined &&
          <div className="mt-1.5">
            <div className="flex justify-between text-muted-foreground text-[11px] mb-0.5"><span>Progress</span><span>{task.progress}%</span></div>
            <Progress value={task.progress} className="h-1.5" />
          </div>
        }
      </CardContent>
      <CardFooter className="p-3 border-t grid grid-cols-4 gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={() => onViewTask(task)}><Eye className="mr-1 h-3 w-3" /> View</Button>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => onEditTask(task)}><Edit2 className="mr-1 h-3 w-3" /> Edit</Button>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => onChatTask(task)}><MessageSquare className="mr-1 h-3 w-3" /> Chat</Button>
        <Button variant="destructive" size="sm" className="text-xs" onClick={() => onDeleteTask(task)}><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
      </CardFooter>
    </Card>
  );
});

export default KanbanTaskCard;
