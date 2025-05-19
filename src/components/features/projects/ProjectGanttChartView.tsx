// src/components/features/projects/ProjectGanttChartView.tsx
'use client';

import type { Task, Sprint } from '@/types';
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, eachDayOfInterval, min, max, isValid as isValidDate } from 'date-fns';
import { useMemo, useState, useEffect, MouseEvent as ReactMouseEvent, DragEvent as ReactDragEvent, useCallback, useRef } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Diamond, ChevronDown, ChevronRight, GripVertical, Brain, Hand, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAY_WIDTH_PX = 35;
const ROW_HEIGHT_PX = 40;
const TIMELINE_HEADER_ROW_HEIGHT_PX = 30; 

const TASK_TITLE_COL_WIDTH_PX = 250;
const SPRINT_COL_WIDTH_PX = 120;
const START_DATE_COL_WIDTH_PX = 80;
const END_DATE_COL_WIDTH_PX = 80;
const DURATION_COL_WIDTH_PX = 70;
const TASK_DETAILS_AREA_WIDTH_PX = TASK_TITLE_COL_WIDTH_PX + SPRINT_COL_WIDTH_PX + START_DATE_COL_WIDTH_PX + END_DATE_COL_WIDTH_PX + DURATION_COL_WIDTH_PX;


const RESIZE_HANDLE_WIDTH_PX = 10;
const MILESTONE_SIZE_PX = 16;
const INDENT_WIDTH_PX = 20;

const statusGanttBarColors: { [key in Task['status']]: string } = {
  'To Do': 'bg-slate-400 hover:bg-slate-500 text-slate-50',
  'In Progress': 'bg-blue-500 hover:bg-blue-600 text-blue-50',
  'Done': 'bg-green-500 hover:bg-green-600 text-green-50',
  'Blocked': 'bg-red-500 hover:bg-red-600 text-red-50',
};
const milestoneColor = 'bg-amber-500 hover:bg-amber-600';
const parentTaskBorderColors: { [key in Task['status']]: string } = {
  'To Do': 'border-slate-500',
  'In Progress': 'border-blue-600',
  'Done': 'border-green-600',
  'Blocked': 'border-red-600',
};

const getProgressFillColor = (baseColor: string): string => {
  if (baseColor.includes('slate')) return 'bg-slate-600 dark:bg-slate-500';
  if (baseColor.includes('blue')) return 'bg-blue-700 dark:bg-blue-600';
  if (baseColor.includes('green')) return 'bg-green-700 dark:bg-green-600';
  if (baseColor.includes('red')) return 'bg-red-700 dark:bg-red-600';
  return 'bg-gray-700 dark:bg-gray-600';
};


interface ProjectGanttChartViewProps {
  tasks: Task[];
  projectSprints: Sprint[];
  onUpdateTask: (updatedTask: Task) => void;
  onTasksReorder: (draggedTaskId: string, targetTaskId: string | null) => void;
  onViewTask: (task: Task) => void;
}

export default function ProjectGanttChartView({ tasks, projectSprints, onUpdateTask, onTasksReorder, onViewTask }: ProjectGanttChartViewProps) {
  const [isClient, setIsClient] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const [draggingTaskDetails, setDraggingTaskDetails] = useState<{
    task: Task;
    initialMouseX: number;
    originalStartDate: Date;
  } | null>(null);

  const [resizingTaskDetails, setResizingTaskDetails] = useState<{
    task: Task;
    initialMouseX: number;
    originalDurationDays: number;
  } | null>(null);

  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [dependencySourceTaskId, setDependencySourceTaskId] = useState<string | null>(null);
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsClient(true);
  }, []);


  const toggleTaskCollapse = useCallback((taskId: string) => {
    setCollapsedTaskIds(prevCollapsed => {
      const newCollapsed = new Set(prevCollapsed);
      if (newCollapsed.has(taskId)) {
        newCollapsed.delete(taskId);
      } else {
        newCollapsed.add(taskId);
      }
      return newCollapsed;
    });
  }, []);

  const processedTasks = useMemo(() => {
    // console.log("GANTT_CHART: Input tasks for processing:", tasks.map(t => ({id: t.id, title: t.title, parentId: t.parentId, order: tasks.findIndex(p=>p.id === t.id)})));
    type TaskWithHierarchy = Task & { children: TaskWithHierarchy[]; level: number; isParent: boolean };

    const taskMap = new Map<string, TaskWithHierarchy>();
    tasks.forEach(task => taskMap.set(task.id, { ...task, children: [], level: 0, isParent: false }));

    const rootTasks: TaskWithHierarchy[] = [];
    tasks.forEach(task => {
      const currentTaskNode = taskMap.get(task.id)!;
      if (task.parentId && taskMap.has(task.parentId)) {
        const parentNode = taskMap.get(task.parentId)!;
        parentNode.children.push(currentTaskNode);
        parentNode.isParent = true; 
      } else {
        rootTasks.push(currentTaskNode);
      }
    });
    
    const originalOrderMap = new Map(tasks.map((task, index) => [task.id, index]));

    const sortTasks = (taskArray: TaskWithHierarchy[]) => {
        taskArray.sort((a, b) => (originalOrderMap.get(a.id) ?? Infinity) - (originalOrderMap.get(b.id) ?? Infinity));
    };

    sortTasks(rootTasks);
    taskMap.forEach(node => {
        if (node.children.length > 0) {
            node.isParent = true; // Ensure isParent is set if children exist
            sortTasks(node.children);
        } else {
            node.isParent = false;
        }
    });

    const flattenTasks = (tasksToFlatten: TaskWithHierarchy[], currentLevel: number): (Task & { level: number; isParent: boolean })[] => {
      let result: (Task & { level: number; isParent: boolean })[] = [];
      for (const taskNode of tasksToFlatten) {
        result.push({ ...taskNode, level: currentLevel, isParent: taskNode.isParent });
        if (taskNode.isParent && !collapsedTaskIds.has(taskNode.id)) {
           result = result.concat(flattenTasks(taskNode.children, currentLevel + 1));
        }
      }
      return result;
    };

    const finalFlattenedTasks = flattenTasks(rootTasks, 0);
    // console.log("GANTT_CHART: Output finalFlattenedTasks:", finalFlattenedTasks.map(t => ({id: t.id, title: t.title, level: t.level, isParent: t.isParent })));
    return finalFlattenedTasks;
  }, [tasks, collapsedTaskIds]);


  const { chartStartDate, chartEndDate, totalDays, daysArray } = useMemo(() => {
    if (!tasks.length) {
      const today = startOfDay(new Date());
      const defaultStartDate = addDays(today, -15);
      const defaultEndDate = addDays(today, 45); 
      return {
        chartStartDate: defaultStartDate,
        chartEndDate: defaultEndDate,
        totalDays: differenceInCalendarDays(defaultEndDate, defaultStartDate) + 1,
        daysArray: eachDayOfInterval({ start: defaultStartDate, end: defaultEndDate }),
      };
    }

    const taskDates = tasks.reduce((acc, task) => {
      if (task.startDate && isValidDate(parseISO(task.startDate))) {
        const start = startOfDay(parseISO(task.startDate));
        acc.push(start);
        if (!task.isMilestone && task.durationDays && task.durationDays > 0) {
          acc.push(addDays(start, Math.max(0, task.durationDays - 1)));
        } else if (task.isMilestone || (task.durationDays !== undefined && task.durationDays === 0) ) {
           acc.push(start);
        }
      }
      return acc;
    }, [] as Date[]);

    if (!taskDates.length) { 
      const today = startOfDay(new Date());
      const fallbackStart = addDays(today, -15);
      const fallbackEnd = addDays(today, 45);
      return {
        chartStartDate: fallbackStart,
        chartEndDate: fallbackEnd,
        totalDays: differenceInCalendarDays(fallbackEnd, fallbackStart) + 1,
        daysArray: eachDayOfInterval({ start: fallbackStart, end: fallbackEnd }),
      };
    }

    let overallMinDate = min(taskDates);
    let overallMaxDate = max(taskDates);

    const paddingDaysStart = 10; 
    const paddingDaysEnd = 30; 

    overallMinDate = addDays(overallMinDate, -paddingDaysStart);
    overallMaxDate = addDays(overallMaxDate, paddingDaysEnd);

    if (differenceInCalendarDays(overallMaxDate, overallMinDate) < 60) {
       overallMaxDate = addDays(overallMinDate, Math.max(59, differenceInCalendarDays(overallMaxDate, overallMinDate)));
    }

    const days = eachDayOfInterval({ start: overallMinDate, end: overallMaxDate });

    return {
      chartStartDate: overallMinDate,
      chartEndDate: overallMaxDate,
      totalDays: days.length > 0 ? days.length : 60, 
      daysArray: days.length > 0 ? days : eachDayOfInterval({start: addDays(startOfDay(new Date()), -15), end: addDays(startOfDay(new Date()), 44)}),
    };
  }, [tasks]);


  const getTaskBarPositionAndStyle = (task: Task & { level: number; isParent: boolean }, taskIndex: number) => {
    if (!task.startDate || !isValidDate(parseISO(task.startDate))) return { left: 0, width: DAY_WIDTH_PX, top: taskIndex * ROW_HEIGHT_PX };

    const taskStart = startOfDay(parseISO(task.startDate));
    const offsetDays = differenceInCalendarDays(taskStart, chartStartDate);
    const duration = task.isMilestone ? 1 : ((task.durationDays && task.durationDays > 0) ? task.durationDays : 1);
    
    // console.log(`Rendering bar for ${task.title} (ID: ${task.id}) at index ${taskIndex}, calculated top: ${taskIndex * ROW_HEIGHT_PX}`);
    return {
      left: Math.max(0, offsetDays * DAY_WIDTH_PX),
      width: duration * DAY_WIDTH_PX,
      top: taskIndex * ROW_HEIGHT_PX,
    };
  };

  const handleTaskBarMouseDown = (event: ReactMouseEvent<HTMLDivElement>, task: Task & {isParent: boolean}) => {
    event.preventDefault();
    event.stopPropagation();
    if (!task.startDate || resizingTaskDetails || task.isMilestone || task.isParent) return;

    try {
      setDraggingTaskDetails({
        task,
        initialMouseX: event.clientX,
        originalStartDate: startOfDay(parseISO(task.startDate)),
      });
    } catch(e) {
      console.error("Error parsing start date on mouse down:", task.startDate, e);
    }
  };

  useEffect(() => {
    const handleDocumentMouseMove = (event: globalThis.MouseEvent) => {
      if (!draggingTaskDetails || !draggingTaskDetails.task.startDate) return;

      const deltaX = event.clientX - draggingTaskDetails.initialMouseX;
      const movedDays = Math.round(deltaX / DAY_WIDTH_PX);
      const newStartDate = addDays(draggingTaskDetails.originalStartDate, movedDays);

      const updatedTask: Task = {
        ...draggingTaskDetails.task,
        startDate: format(newStartDate, 'yyyy-MM-dd'),
      };
      onUpdateTask(updatedTask); 
    };

    const handleDocumentMouseUp = () => {
      if (!draggingTaskDetails) return;
      setDraggingTaskDetails(null);
    };

    if (draggingTaskDetails) {
      document.addEventListener('mousemove', handleDocumentMouseMove);
      document.addEventListener('mouseup', handleDocumentMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [draggingTaskDetails, onUpdateTask]);


  const handleResizeMouseDown = (event: ReactMouseEvent<HTMLDivElement>, task: Task & { isParent: boolean }) => {
    event.preventDefault();
    event.stopPropagation();
    if (task.isMilestone || draggingTaskDetails || task.isParent) return;

    setResizingTaskDetails({
      task,
      initialMouseX: event.clientX,
      originalDurationDays: task.durationDays || 1,
    });
  };

  useEffect(() => {
    const handleDocumentMouseMoveForResize = (event: globalThis.MouseEvent) => {
      if (!resizingTaskDetails) return;

      const deltaX = event.clientX - resizingTaskDetails.initialMouseX;
      const changedDays = Math.round(deltaX / DAY_WIDTH_PX);
      const newDurationDays = Math.max(1, resizingTaskDetails.originalDurationDays + changedDays);

      const updatedTask: Task = {
        ...resizingTaskDetails.task,
        durationDays: newDurationDays,
      };
      onUpdateTask(updatedTask);
    };

    const handleDocumentMouseUpForResize = () => {
      if (!resizingTaskDetails) return;
      setResizingTaskDetails(null);
    };

    if (resizingTaskDetails) {
      document.addEventListener('mousemove', handleDocumentMouseMoveForResize);
      document.addEventListener('mouseup', handleDocumentMouseUpForResize);
    }

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMoveForResize);
      document.removeEventListener('mouseup', handleDocumentMouseUpForResize);
    };
  }, [resizingTaskDetails, onUpdateTask]);


  const handleRowDragStart = (event: ReactDragEvent<HTMLDivElement>, taskId: string) => {
    event.dataTransfer.setData('taskId', taskId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleRowDragOver = (event: ReactDragEvent<HTMLDivElement>, taskId: string | null) => { // Allow null for dropping at the end
    event.preventDefault();
    setDragOverRowId(taskId);
  };

  const handleRowDragLeave = () => {
    setDragOverRowId(null);
  };

  const handleRowDrop = (event: ReactDragEvent<HTMLDivElement>, targetTaskId: string | null) => {
    event.preventDefault();
    const draggedTaskId = event.dataTransfer.getData('taskId');
    setDragOverRowId(null);
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      onTasksReorder(draggedTaskId, targetTaskId);
    }
  };

  const handleDeleteDependency = (dependentTaskId: string, prerequisiteTaskId: string) => {
    const dependentTask = tasks.find(t => t.id === dependentTaskId);
    if (dependentTask && dependentTask.dependencies) {
      const updatedDependencies = dependentTask.dependencies.filter(depId => depId !== prerequisiteTaskId);
      onUpdateTask({ ...dependentTask, dependencies: updatedDependencies });
    }
  };

  const handleTaskBarClickForDependency = (event: ReactMouseEvent<HTMLDivElement>, task: Task & {isParent: boolean}) => {
    event.stopPropagation(); 
    if (task.isMilestone || task.isParent) return; 

    if (!dependencySourceTaskId) {
      setDependencySourceTaskId(task.id);
    } else {
      if (dependencySourceTaskId === task.id) { 
        setDependencySourceTaskId(null);
        return;
      }
      
      const sourceTask = tasks.find(t => t.id === dependencySourceTaskId);
      if (!sourceTask) {
        setDependencySourceTaskId(null);
        return;
      }

      // Prevent cyclical dependencies (simple check: target doesn't depend on source)
      // Also prevent adding if dependency already exists
      const targetDependencies = task.dependencies || [];
      const sourceDependencies = sourceTask.dependencies || [];

      if (targetDependencies.includes(dependencySourceTaskId) || sourceDependencies.includes(task.id)) {
        console.warn("Cannot create cyclical or duplicate dependency.");
        setDependencySourceTaskId(null);
        return;
      }

      const updatedTask: Task = {
        ...task,
        dependencies: [...targetDependencies, dependencySourceTaskId],
      };
      onUpdateTask(updatedTask);
      setDependencySourceTaskId(null);
    }
  };

  if (!isClient) {
    return <div className="p-4 text-muted-foreground">Loading Gantt chart...</div>;
  }

  const totalChartWidth = totalDays * DAY_WIDTH_PX;
  const today = startOfDay(new Date());
  const todayOffsetDays = differenceInCalendarDays(today, chartStartDate);
  const isTodayInView = todayOffsetDays >= 0 && todayOffsetDays < totalDays;

  const getTaskTooltip = (task: Task): string => {
    let tooltip = `Task: ${task.title}`;
    if (task.isParent && !task.isMilestone) tooltip += ` (Summary Task)`;
    if (task.isMilestone) tooltip += ` (Milestone)`;
    tooltip += `\nStatus: ${task.status}`;
    if (task.assignedTo) tooltip += `\nAssigned To: ${task.assignedTo}`;
     if (task.sprintId) {
      const sprint = projectSprints.find(s => s.id === task.sprintId);
      if (sprint) tooltip += `\nSprint: ${sprint.name}`;
    }
    if (task.startDate && isValidDate(parseISO(task.startDate))) {
      tooltip += `\n${task.isMilestone ? 'Date' : 'Start'}: ${format(parseISO(task.startDate), 'MMM d, yyyy')}`;
    }
    if (!task.isMilestone && task.durationDays && task.durationDays > 0) {
      tooltip += `\nDuration: ${task.durationDays} day(s)`;
      if (task.startDate && isValidDate(parseISO(task.startDate))) {
         tooltip += `\nEnd: ${format(addDays(parseISO(task.startDate), Math.max(0, task.durationDays -1)), 'MMM d, yyyy')}`;
      }
    }
    if (!task.isMilestone && !task.isParent && task.progress !== undefined) {
      tooltip += `\nProgress: ${task.progress}%`;
    }
    return tooltip;
  };

  const getFormattedDate = (dateString: string | undefined, dateFormat = 'MMM d') => {
    if (!dateString || !isValidDate(parseISO(dateString))) return '-';
    try {
      return format(parseISO(dateString), dateFormat);
    } catch {
      return '-';
    }
  };

  const getEndDate = (startDateString: string | undefined, duration?: number) => {
    if (!startDateString || duration === undefined || duration < 1 || !isValidDate(parseISO(startDateString))) return '-';
    try {
      const startDate = parseISO(startDateString);
      return format(addDays(startDate, Math.max(0, duration - 1)), 'MMM d');
    } catch {
      return '-';
    }
  };

  return (
    <ScrollArea className="w-full border rounded-lg shadow-sm bg-card">
      <div style={{ minWidth: `${TASK_DETAILS_AREA_WIDTH_PX + totalChartWidth}px` }} className="relative select-none">
        {/* Header Row - Task Names & Timeline */}
        <div className="flex sticky top-0 z-30 bg-card border-b">
          {/* Task Details Header */}
          <div
            style={{ width: `${TASK_DETAILS_AREA_WIDTH_PX}px`, minWidth: `${TASK_DETAILS_AREA_WIDTH_PX}px`, height: `${2 * TIMELINE_HEADER_ROW_HEIGHT_PX}px` }}
            className="p-0 border-r border-border/50 font-semibold flex items-stretch sticky left-0 bg-card z-40"
          >
            <div style={{ width: `${TASK_TITLE_COL_WIDTH_PX}px` }} className="p-2 flex items-center border-r border-border/30 text-xs">Task Name</div>
            <div style={{ width: `${SPRINT_COL_WIDTH_PX}px` }} className="p-2 flex items-center justify-center border-r border-border/30 text-xs">Sprint</div>
            <div style={{ width: `${START_DATE_COL_WIDTH_PX}px` }} className="p-2 flex items-center justify-center border-r border-border/30 text-xs">Start</div>
            <div style={{ width: `${END_DATE_COL_WIDTH_PX}px` }} className="p-2 flex items-center justify-center border-r border-border/30 text-xs">End</div>
            <div style={{ width: `${DURATION_COL_WIDTH_PX}px` }} className="p-2 flex items-center justify-center text-xs">Dur.</div>
          </div>

          {/* Timeline Header - Month/Year and Day numbers */}
          <div className="flex-grow overflow-x-hidden relative z-10">
            {isTodayInView && (
               <div
                className="absolute text-red-500 text-xs font-semibold pointer-events-none"
                style={{
                  left: `${todayOffsetDays * DAY_WIDTH_PX + (DAY_WIDTH_PX / 2) - 15}px`, 
                  top: '4px', 
                  zIndex: 40, 
                }}
              >
                Today
              </div>
            )}
            <div className="flex border-b border-border/30" style={{ height: `${TIMELINE_HEADER_ROW_HEIGHT_PX}px` }}>
              {daysArray.reduce((acc, day, index) => {
                const monthYear = format(day, 'MMM yyyy');
                if (index === 0 || format(daysArray[index - 1], 'MMM yyyy') !== monthYear) {
                  let colspan = 0;
                  for (let i = index; i < daysArray.length; i++) {
                    if (format(daysArray[i], 'MMM yyyy') === monthYear) colspan++;
                    else break;
                  }
                  acc.push(
                    <div
                      key={monthYear}
                      style={{ width: `${colspan * DAY_WIDTH_PX}px`, minWidth: `${colspan * DAY_WIDTH_PX}px` }}
                      className="p-1 text-xs font-medium text-center border-r border-border/30 last:border-r-0 whitespace-nowrap"
                    >
                      {monthYear}
                    </div>
                  );
                }
                return acc;
              }, [] as JSX.Element[])}
            </div>
            <div className="flex" style={{ height: `${TIMELINE_HEADER_ROW_HEIGHT_PX}px` }}>
              {daysArray.map((day) => (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  style={{ width: `${DAY_WIDTH_PX}px`, minWidth: `${DAY_WIDTH_PX}px` }}
                  className={cn(
                    "p-1 text-[10px] text-center border-r border-border/30 last:border-r-0 text-muted-foreground",
                    (format(day, 'E') === 'Sat' || format(day, 'E') === 'Sun') && 'bg-muted/30 dark:bg-muted/20'
                  )}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Rows & Grid Lines Container */}
        <div className="relative" onDragOver={(e) => handleRowDragOver(e, null)} /* Allow dropping at the end of the list */>
          {daysArray.map((_, dayIndex) => (
            <div
              key={`v-grid-${dayIndex}`}
              className={cn(
                "absolute top-0 bottom-0 border-r border-border/20",
                (format(daysArray[dayIndex], 'E') === 'Sat' || format(daysArray[dayIndex], 'E') === 'Sun') && 'bg-muted/10 dark:bg-muted/5'
              )}
              style={{
                left: `${TASK_DETAILS_AREA_WIDTH_PX + dayIndex * DAY_WIDTH_PX}px`,
                width: `${DAY_WIDTH_PX}px`,
                height: `${processedTasks.length * ROW_HEIGHT_PX}px`,
                zIndex: 0,
              }}
            ></div>
          ))}
          {isTodayInView && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
              style={{
                left: `${TASK_DETAILS_AREA_WIDTH_PX + todayOffsetDays * DAY_WIDTH_PX + (DAY_WIDTH_PX / 2) - 0.5}px`,
                height: `${processedTasks.length * ROW_HEIGHT_PX}px`,
                zIndex: 40, 
              }}
              title={`Today: ${format(today, 'MMM d')}`}
            />
          )}
          <svg
            ref={svgRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ marginLeft: `${TASK_DETAILS_AREA_WIDTH_PX}px`, width: `${totalChartWidth}px`, height: `${processedTasks.length * ROW_HEIGHT_PX}px`, zIndex: 20 }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="8" 
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--foreground))" opacity="0.6" />
              </marker>
            </defs>
            {processedTasks.map((task, taskIndex) => {
              if (!task.dependencies || !task.startDate || !isValidDate(parseISO(task.startDate))) return null;

              const dependentBarPos = getTaskBarPositionAndStyle(task, taskIndex);

              return task.dependencies.map(depId => {
                const prereqTask = processedTasks.find(t => t.id === depId);
                if (!prereqTask || !prereqTask.startDate || !isValidDate(parseISO(prereqTask.startDate))) return null;

                const prereqTaskIndex = processedTasks.findIndex(t => t.id === depId);
                if (prereqTaskIndex === -1) return null;

                const prereqBarPos = getTaskBarPositionAndStyle(prereqTask, prereqTaskIndex);

                const x1 = prereqBarPos.left + (prereqTask.isMilestone ? MILESTONE_SIZE_PX / 2 : prereqBarPos.width);
                const y1 = prereqBarPos.top + ROW_HEIGHT_PX / 2;

                const x2 = dependentBarPos.left + (task.isMilestone ? MILESTONE_SIZE_PX / 2 : 0) - (task.isMilestone ? 0 : 5) ; 
                const y2 = dependentBarPos.top + ROW_HEIGHT_PX / 2;
                
                if (x1 >= x2 && !prereqTask.isMilestone && !task.isMilestone) return null;

                return (
                  <line
                    key={`${depId}-${task.id}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="hsl(var(--foreground))"
                    strokeOpacity="0.6"
                    strokeWidth="1.5"
                    markerEnd="url(#arrowhead)"
                    className="cursor-pointer hover:stroke-destructive hover:stroke-[2.5px] transition-all"
                    onClick={(e: React.MouseEvent<SVGLineElement>) => { e.stopPropagation(); handleDeleteDependency(task.id, depId); }}
                    style={{ pointerEvents: 'stroke' }}
                    title={`Dependency: ${prereqTask.title} -> ${task.title}. Click to remove.`}
                  />
                );
              });
            })}
          </svg>

          {processedTasks.map((task, taskIndex) => {
            const { left: barLeftOffset, width: barWidth, top: barTopOffset } = getTaskBarPositionAndStyle(task, taskIndex);
            // console.log(`Rendering bar for ${task.title} (ID: ${task.id}) at index ${taskIndex}, calculated top: ${barTopOffset}`);
            const isDraggingThisTask = draggingTaskDetails?.task.id === task.id;
            const isResizingThisTask = resizingTaskDetails?.task.id === task.id;

            let barBaseClasses = "absolute my-[5px] flex items-center justify-start overflow-hidden shadow-sm transition-shadow duration-150 ease-in-out group/taskbar rounded text-white dark:text-gray-100 text-[11px] px-2";
            let progressFillElement = null;

            if (task.isMilestone) {
              barBaseClasses = cn(barBaseClasses, milestoneColor, "justify-center");
            } else if (task.isParent) {
              const statusBorderClass = parentTaskBorderColors[task.status] || 'border-gray-500';
              barBaseClasses = cn(barBaseClasses, `border-2 ${statusBorderClass}`, 'bg-background text-foreground dark:text-foreground');
            } else {
              const statusColorClass = statusGanttBarColors[task.status] || 'bg-gray-500';
              barBaseClasses = cn(barBaseClasses, statusColorClass.replace(/hover:bg-\S+\s*/, ''));

              const progressPercent = task.progress !== undefined ? Math.max(0, Math.min(100, task.progress)) : 0;
              if (progressPercent > 0) {
                  const progressFillColor = getProgressFillColor(statusColorClass.replace(/hover:bg-\S+\s*/, ''));
                  progressFillElement = (
                    <div
                      className={cn("absolute top-0 left-0 h-full rounded-l", progressFillColor)}
                      style={{ width: `${progressPercent}%`, zIndex: 1 }}
                    />
                  );
              }
            }

            if (isDraggingThisTask || isResizingThisTask) {
                barBaseClasses = cn(barBaseClasses, 'opacity-75 ring-2 ring-primary');
            }

            const sprintName = task.sprintId ? projectSprints.find(s => s.id === task.sprintId)?.name : '-';


            return (
              <div
                key={task.id} 
                className={cn(
                  "flex items-center border-b border-border/30 last:border-b-0 group hover:bg-muted/10 dark:hover:bg-muted/5",
                  dragOverRowId === task.id && 'outline-dashed outline-1 outline-primary -outline-offset-1 bg-primary/5'
                )}
                style={{ height: `${ROW_HEIGHT_PX}px`, position: 'relative' }}
                onDragOver={(e) => handleRowDragOver(e, task.id)}
                onDragLeave={handleRowDragLeave}
                onDrop={(e) => handleRowDrop(e, task.id)}
                onDoubleClick={() => onViewTask(task)}
              >
                <div
                  draggable
                  onDragStart={(e) => handleRowDragStart(e, task.id)}
                  style={{
                    width: `${TASK_DETAILS_AREA_WIDTH_PX}px`,
                    minWidth: `${TASK_DETAILS_AREA_WIDTH_PX}px`,
                    height: '100%',
                  }}
                  className="text-sm sticky left-0 bg-card group-hover:bg-muted/10 dark:bg-card dark:group-hover:bg-muted/5 z-20 border-r border-border/50 flex items-stretch cursor-grab"
                >
                  <div
                    style={{
                        width: `${TASK_TITLE_COL_WIDTH_PX}px`,
                        paddingLeft: `${0.5 + (task.level * INDENT_WIDTH_PX / 16)}rem` 
                    }}
                    className={cn(
                        "p-2 border-r border-border/30 flex items-center truncate",
                        task.isParent && !task.isMilestone && "font-semibold"
                    )}
                    title={task.title}
                  >
                    <GripVertical className="h-4 w-4 mr-1 text-muted-foreground/30 group-hover:text-muted-foreground/60 cursor-grab flex-shrink-0 opacity-50 group-hover:opacity-100" />
                     {task.isParent && !task.isMilestone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 mr-1 data-[state=open]:text-primary data-[state=closed]:text-muted-foreground"
                        onClick={(e) => { e.stopPropagation(); toggleTaskCollapse(task.id); }}
                        title={collapsedTaskIds.has(task.id) ? "Expand" : "Collapse"}
                        data-state={collapsedTaskIds.has(task.id) ? "closed" : "open"}
                      >
                        {collapsedTaskIds.has(task.id) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    )}
                    {task.isMilestone && <Diamond className="mr-1.5 h-3 w-3 text-amber-500 flex-shrink-0" />}
                    {task.isAiPlanned ?
                      <Brain className="mr-1.5 h-3 w-3 text-purple-500 flex-shrink-0" title="AI Planned"/> :
                      <Hand className="mr-1.5 h-3 w-3 text-blue-500 flex-shrink-0" title="Manually Created"/>
                    }
                    <span className="truncate">{task.title}</span>
                  </div>
                  <div style={{ width: `${SPRINT_COL_WIDTH_PX}px` }} className="p-2 border-r border-border/30 flex items-center justify-start text-xs text-muted-foreground truncate" title={sprintName}>
                     <Layers className="h-3.5 w-3.5 mr-1.5 text-indigo-500 flex-shrink-0"/> {sprintName}
                  </div>
                  <div style={{ width: `${START_DATE_COL_WIDTH_PX}px` }} className="p-2 border-r border-border/30 flex items-center justify-center text-xs text-muted-foreground">
                     {getFormattedDate(task.startDate)}
                  </div>
                  <div style={{ width: `${END_DATE_COL_WIDTH_PX}px` }} className="p-2 border-r border-border/30 flex items-center justify-center text-xs text-muted-foreground">
                    {task.isMilestone ? getFormattedDate(task.startDate) : getEndDate(task.startDate, task.durationDays)}
                  </div>
                  <div style={{ width: `${DURATION_COL_WIDTH_PX}px` }} className="p-2 flex items-center justify-center text-xs text-muted-foreground">
                    {task.isMilestone || task.isParent ? '-' : `${task.durationDays || 0}d`}
                  </div>
                </div>

                {task.startDate && isValidDate(parseISO(task.startDate)) && (
                  <div
                    key={`bar-${task.id}`} 
                    onMouseDown={(e) => task.isMilestone || task.isParent ? null : handleTaskBarMouseDown(e, task)}
                    onClick={(e) => task.isMilestone || task.isParent ? null : handleTaskBarClickForDependency(e, task)}
                    title={getTaskTooltip(task)}
                    className={cn(
                      barBaseClasses,
                      task.isMilestone ? "justify-center" : "",
                      isDraggingThisTask ? 'cursor-grabbing' : ((task.isMilestone || task.isParent) ? '' : 'cursor-grab'),
                      dependencySourceTaskId === task.id && !task.isMilestone && !task.isParent && "ring-2 ring-offset-2 ring-green-500"
                    )}
                    style={{
                      left: `${TASK_DETAILS_AREA_WIDTH_PX + barLeftOffset + (task.isMilestone ? (DAY_WIDTH_PX / 2 - MILESTONE_SIZE_PX / 2) : 0)}px`,
                      width: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${barWidth}px`,
                      height: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${ROW_HEIGHT_PX - 10}px`,
                      top: `${barTopOffset + (task.isMilestone ? (ROW_HEIGHT_PX / 2 - MILESTONE_SIZE_PX / 2 -5 ) : 0)}px`,
                      lineHeight: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${ROW_HEIGHT_PX - 10}px`,
                      zIndex: isDraggingThisTask || isResizingThisTask ? 50 : (task.isParent ? 29 : 30),
                      transform: task.isMilestone ? 'rotate(45deg)' : 'none',
                    }}
                  >
                    {progressFillElement}
                    <span className={cn(
                      'relative z-10 flex items-center truncate',
                      task.isParent && "w-full justify-start pl-1"
                    )}>
                        {!task.isMilestone && (
                           <>
                             <span className="truncate">{task.title}</span>
                             {task.assignedTo && task.assignedTo !== "Unassigned" && !task.isParent && (
                                 <span className="ml-1.5 text-[10px] hidden sm:inline opacity-80">({task.assignedTo})</span>
                             )}
                           </>
                        )}
                    </span>
                    {(!task.isMilestone && !task.isParent) && (
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, task)}
                        className="absolute top-0 right-0 h-full cursor-col-resize group-hover/taskbar:bg-black/20 dark:group-hover/taskbar:bg-white/20 transition-colors z-20"
                        style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px` }}
                        title={`Resize ${task.title}`}
                      >
                        <span className="sr-only">Resize task</span>
                      </div>
                    )}
                    {task.isMilestone && (
                      <div className="w-full h-full flex items-center justify-center" style={{ transform: 'rotate(-45deg)' }}>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {processedTasks.length === 0 && (
             <div
              className="flex items-center justify-center text-muted-foreground p-4"
              style={{ height: `${ROW_HEIGHT_PX * 3}px`, width: `calc(100% - ${TASK_DETAILS_AREA_WIDTH_PX}px)`, marginLeft: `${TASK_DETAILS_AREA_WIDTH_PX}px` }}
            >
              No tasks in this project yet.
            </div>
          )}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
