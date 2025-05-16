
'use client';

import type { Task } from '@/types';
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, eachDayOfInterval, min, max } from 'date-fns';
import { useMemo, useState, useEffect, MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Diamond, GripVertical } from 'lucide-react'; 

const DAY_WIDTH_PX = 30;
const ROW_HEIGHT_PX = 40;
const HEADER_HEIGHT_PX = 60; 
const TASK_NAME_WIDTH_PX = 250; 
const RESIZE_HANDLE_WIDTH_PX = 10;
const MILESTONE_SIZE_PX = 16;
const INDENT_WIDTH_PX = 20; 

const statusGanttBarColors: { [key in Task['status']]: string } = {
  'To Do': 'bg-slate-500 hover:bg-slate-600',
  'In Progress': 'bg-blue-500 hover:bg-blue-600',
  'Done': 'bg-green-500 hover:bg-green-600',
  'Blocked': 'bg-red-500 hover:bg-red-600',
};

const milestoneColor = 'bg-amber-500 hover:bg-amber-600';

const getProgressFillColor = (baseColor: string): string => {
  if (baseColor.includes('slate')) return 'bg-slate-700';
  if (baseColor.includes('blue')) return 'bg-blue-700';
  if (baseColor.includes('green')) return 'bg-green-700';
  if (baseColor.includes('red')) return 'bg-red-700';
  if (baseColor.includes('amber')) return 'bg-amber-700';
  return 'bg-gray-700';
};

interface ProjectGanttChartViewProps {
  tasks: Task[];
  onUpdateTask: (updatedTask: Task) => void;
}

export default function ProjectGanttChartView({ tasks, onUpdateTask }: ProjectGanttChartViewProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

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
  
  const processedTasks = useMemo(() => {
    const taskMap = new Map<string, Task & { children: Task[], level: number }>();
    tasks.forEach(task => taskMap.set(task.id, { ...task, children: [], level: 0 }));

    const rootTasks: (Task & { children: Task[], level: number })[] = [];

    tasks.forEach(task => {
      const currentTask = taskMap.get(task.id)!;
      if (task.parentId && taskMap.has(task.parentId)) {
        const parent = taskMap.get(task.parentId)!;
        parent.children.push(currentTask);
      } else {
        rootTasks.push(currentTask);
      }
    });

    const flattenTasks = (tasksToFlatten: (Task & { children: Task[], level: number })[], level: number): (Task & { level: number })[] => {
      let result: (Task & { level: number })[] = [];
      for (const task of tasksToFlatten) {
        result.push({ ...task, level });
        if (task.children && task.children.length > 0) {
          result = result.concat(flattenTasks(task.children, level + 1));
        }
      }
      return result;
    };
    
    rootTasks.sort((a,b) => (a.startDate && b.startDate ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0));
    return flattenTasks(rootTasks, 0);
  }, [tasks]);

  const tasksMap = useMemo(() => {
    const map = new Map<string, Task>();
    tasks.forEach(task => map.set(task.id, task));
    return map;
  }, [tasks]);


  const { chartStartDate, chartEndDate, totalDays, daysArray } = useMemo(() => {
    if (!processedTasks.length) {
      const today = startOfDay(new Date());
      const defaultStartDate = addDays(today, -15); 
      const defaultEndDate = addDays(today, 30);
      return {
        chartStartDate: defaultStartDate,
        chartEndDate: defaultEndDate,
        totalDays: differenceInCalendarDays(defaultEndDate, defaultStartDate) + 1,
        daysArray: eachDayOfInterval({ start: defaultStartDate, end: defaultEndDate }),
      };
    }

    const taskDates = processedTasks.reduce((acc, task) => {
      if (task.startDate) {
        try {
            const start = startOfDay(parseISO(task.startDate));
            acc.push(start);
            if (!task.isMilestone && task.durationDays && task.durationDays > 0) {
              acc.push(addDays(start, task.durationDays -1));
            } else { 
              acc.push(start);
            }
        } catch (e) {
            // console.warn(`Invalid start date for task "${task.title}": ${task.startDate}`);
        }
      }
      return acc;
    }, [] as Date[]);

    if (!taskDates.length) {
      const today = startOfDay(new Date());
      const fallbackStart = addDays(today, -15);
      const fallbackEnd = addDays(today, 30);
      return {
        chartStartDate: fallbackStart,
        chartEndDate: fallbackEnd,
        totalDays: differenceInCalendarDays(fallbackEnd, fallbackStart) + 1,
        daysArray: eachDayOfInterval({ start: fallbackStart, end: fallbackEnd }),
      };
    }

    let overallMinDate = min(taskDates);
    let overallMaxDate = max(taskDates);

    overallMinDate = addDays(overallMinDate, -20); 
    overallMaxDate = addDays(overallMaxDate, 25); 

    const days = eachDayOfInterval({ start: overallMinDate, end: overallMaxDate });

    return {
      chartStartDate: overallMinDate,
      chartEndDate: overallMaxDate,
      totalDays: days.length > 0 ? days.length : 45,
      daysArray: days.length > 0 ? days : eachDayOfInterval({ start: addDays(startOfDay(new Date()), -15), end: addDays(startOfDay(new Date()), 29) }),
    };
  }, [processedTasks]);

  const getTaskBarPositionAndStyle = (task: Task, taskIndex: number) => {
    if (!task.startDate) return { left: 0, width: DAY_WIDTH_PX, top: taskIndex * ROW_HEIGHT_PX };
    try {
        const taskStart = startOfDay(parseISO(task.startDate));
        const offsetDays = differenceInCalendarDays(taskStart, chartStartDate);
        const duration = task.isMilestone ? 1 : ((task.durationDays && task.durationDays > 0) ? task.durationDays : 1);
        return {
            left: Math.max(0, offsetDays * DAY_WIDTH_PX),
            width: duration * DAY_WIDTH_PX,
            top: taskIndex * ROW_HEIGHT_PX,
        };
    } catch (e) {
        return { left: 0, width: DAY_WIDTH_PX, top: taskIndex * ROW_HEIGHT_PX };
    }
  };

  const handleTaskBarMouseDown = (event: ReactMouseEvent<HTMLDivElement>, task: Task) => {
    event.preventDefault();
    event.stopPropagation();
    if (!task.startDate || resizingTaskDetails || task.isMilestone ) return;

    try {
        setDraggingTaskDetails({
            task,
            initialMouseX: event.clientX,
            originalStartDate: startOfDay(parseISO(task.startDate)),
        });
    } catch (e) {
        // console.error("Error parsing start date on mouse down:", task.startDate, e);
    }
  };

  useEffect(() => {
    const handleDocumentMouseMove = (event: MouseEvent) => {
      if (!draggingTaskDetails) return;

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

  const handleResizeMouseDown = (event: ReactMouseEvent<HTMLDivElement>, task: Task) => {
    event.preventDefault();
    event.stopPropagation();
    if (task.isMilestone || draggingTaskDetails) return;

    setResizingTaskDetails({
        task,
        initialMouseX: event.clientX,
        originalDurationDays: task.durationDays || 1,
    });
  };

  useEffect(() => {
    const handleDocumentMouseMoveForResize = (event: MouseEvent) => {
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

  if (!isClient) {
    return <div className="p-4 text-muted-foreground">Loading Gantt chart...</div>;
  }

  const totalChartWidth = totalDays * DAY_WIDTH_PX;

  const getTaskTooltip = (task: Task): string => {
    let tooltip = `Task: ${task.title}`;
    if (task.isMilestone) {
        tooltip += ` (Milestone)`;
    }
    tooltip += `\nStatus: ${task.status}`;
    tooltip += `\nAssigned To: ${task.assignedTo}`;
    if (task.startDate) {
      tooltip += `\n${task.isMilestone ? 'Date' : 'Start'}: ${format(parseISO(task.startDate), 'MMM d, yyyy')}`;
    }
    if (!task.isMilestone && task.durationDays) {
      tooltip += `\nDuration: ${task.durationDays} day(s)`;
    }
    if (!task.isMilestone && task.progress !== undefined) {
      tooltip += `\nProgress: ${task.progress}%`;
    }
    return tooltip;
  };

  return (
    <ScrollArea className="w-full border rounded-lg shadow-sm bg-card">
      <div style={{ minWidth: `${TASK_NAME_WIDTH_PX + totalChartWidth}px` }} className="relative select-none">
        {/* Header Row - Task Names & Timeline */}
        <div className="flex sticky top-0 z-30 bg-card border-b">
          <div
            style={{ width: `${TASK_NAME_WIDTH_PX}px`, minWidth: `${TASK_NAME_WIDTH_PX}px`, height: `${HEADER_HEIGHT_PX}px` }}
            className="p-2 border-r font-semibold flex items-center justify-start sticky left-0 bg-card z-10"
          >
            Task Name
          </div>
          <div className="flex-grow overflow-x-hidden">
            <div className="flex border-b h-[30px]"> {/* Month/Year Headers */}
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
                      className="p-1 text-xs font-medium text-center border-r last:border-r-0 whitespace-nowrap"
                    >
                      {monthYear}
                    </div>
                  );
                }
                return acc;
              }, [] as JSX.Element[])}
            </div>
            <div className="flex h-[30px]"> {/* Day Headers */}
              {daysArray.map((day) => (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  style={{ width: `${DAY_WIDTH_PX}px`, minWidth: `${DAY_WIDTH_PX}px` }}
                  className={cn(
                    "p-1 text-[10px] text-center border-r last:border-r-0 text-muted-foreground",
                    (format(day, 'E') === 'Sat' || format(day, 'E') === 'Sun') && 'bg-muted/30'
                  )}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Rows & Grid Lines Container */}
        <div className="relative">
          {/* Vertical Grid Lines */}
          {daysArray.map((_, dayIndex) => (
            <div
              key={`v-grid-${dayIndex}`}
              className={cn(
                "absolute top-0 bottom-0 border-r border-border/30",
                (format(daysArray[dayIndex], 'E') === 'Sat' || format(daysArray[dayIndex], 'E') === 'Sun') && 'bg-muted/20'
              )}
              style={{
                left: `${TASK_NAME_WIDTH_PX + dayIndex * DAY_WIDTH_PX}px`,
                width: `${DAY_WIDTH_PX}px`, // Ensure grid line covers full day width
                height: `${processedTasks.length * ROW_HEIGHT_PX}px`,
                zIndex: 0,
              }}
            ></div>
          ))}
          
          {/* SVG Layer for Dependency Lines */}
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" // z-10 to be above grid, below tasks
            style={{ marginLeft: `${TASK_NAME_WIDTH_PX}px`, width: `${totalChartWidth}px`, height: `${processedTasks.length * ROW_HEIGHT_PX}px` }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="0"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" opacity="0.7" />
              </marker>
            </defs>
            {processedTasks.map((task, taskIndex) => {
              if (!task.dependencies || !task.startDate) return null;
              
              const dependentBarPos = getTaskBarPositionAndStyle(task, taskIndex);

              return task.dependencies.map(depId => {
                const prereqTask = processedTasks.find(t => t.id === depId);
                if (!prereqTask || !prereqTask.startDate) return null;

                const prereqTaskIndex = processedTasks.findIndex(t => t.id === depId);
                if(prereqTaskIndex === -1) return null;

                const prereqBarPos = getTaskBarPositionAndStyle(prereqTask, prereqTaskIndex);

                const x1 = prereqBarPos.left + prereqBarPos.width;
                const y1 = prereqBarPos.top + ROW_HEIGHT_PX / 2;
                const x2 = dependentBarPos.left - 5; // -5 for arrowhead spacing
                const y2 = dependentBarPos.top + ROW_HEIGHT_PX / 2;
                
                // Draw simple straight line for now
                return (
                  <line
                    key={`${depId}-${task.id}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="hsl(var(--foreground))"
                    strokeOpacity="0.7"
                    strokeWidth="1.5"
                    markerEnd="url(#arrowhead)"
                  />
                );
              });
            })}
          </svg>


          {/* Task Bars */}
          {processedTasks.map((task, taskIndex) => {
            const { left: barLeftOffset, width: barWidth, top: barTopOffset } = getTaskBarPositionAndStyle(task, taskIndex);
            const isDraggingThisTask = draggingTaskDetails?.task.id === task.id;
            const isResizingThisTask = resizingTaskDetails?.task.id === task.id;
            
            const progressPercent = task.progress !== undefined ? Math.max(0, Math.min(100, task.progress)) : 0;
            const barBaseColor = task.isMilestone ? milestoneColor : (statusGanttBarColors[task.status] || 'bg-gray-500');
            const progressFillColor = getProgressFillColor(barBaseColor);
            const indentLevel = task.level || 0;


            return (
              <div
                key={task.id}
                className="flex items-center border-b last:border-b-0 group hover:bg-muted/10"
                style={{ height: `${ROW_HEIGHT_PX}px`, position: 'relative' }}
              >
                {/* Task Name Cell (Sticky) */}
                <div
                  style={{ 
                    width: `${TASK_NAME_WIDTH_PX}px`, 
                    minWidth: `${TASK_NAME_WIDTH_PX}px`, 
                    height: '100%',
                    paddingLeft: `${0.5 + (task.level * INDENT_WIDTH_PX / 16)}rem` 
                   }}
                  className="text-sm truncate sticky left-0 bg-card group-hover:bg-muted/10 z-20 border-r flex items-center"
                >
                  {task.isMilestone && <Diamond className="mr-2 h-3 w-3 text-amber-500 flex-shrink-0" />}
                  {task.title}
                </div>
                
                {/* Task Bar or Milestone Marker */}
                {task.startDate && (
                  <div
                    onMouseDown={(e) => handleTaskBarMouseDown(e, task)}
                    title={getTaskTooltip(task)}
                    className={cn(
                      "absolute my-[5px] flex items-center justify-start overflow-hidden shadow-sm transition-shadow duration-150 ease-in-out group/taskbar text-white text-[11px] px-2 rounded",
                      task.isMilestone ? cn(barBaseColor, "justify-center") : barBaseColor,
                      isDraggingThisTask ? 'cursor-grabbing opacity-75 ring-2 ring-primary z-30' : (task.isMilestone ? '' : 'cursor-grab'),
                      isResizingThisTask && 'z-30 ring-2 ring-primary opacity-75'
                    )}
                    style={{
                      left: `${TASK_NAME_WIDTH_PX + barLeftOffset + (task.isMilestone ? (DAY_WIDTH_PX / 2 - MILESTONE_SIZE_PX / 2) : 0)}px`,
                      width: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${barWidth}px`,
                      height: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${ROW_HEIGHT_PX - 10}px`,
                      top: `${barTopOffset + (task.isMilestone ? (ROW_HEIGHT_PX / 2 - MILESTONE_SIZE_PX / 2 - 5 /* Adjust for my-[5px] */) : 0)}px`,
                      lineHeight: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${ROW_HEIGHT_PX - 10}px`, 
                      zIndex: isDraggingThisTask || isResizingThisTask ? 30 : 20, // Ensure task bars are above SVG lines
                      transform: task.isMilestone ? 'rotate(45deg)' : 'none',
                    }}
                  >
                    {!task.isMilestone && (
                      <>
                        {/* Progress Fill */}
                        <div
                          className={cn("absolute top-0 left-0 h-full rounded-l", progressFillColor)} // rounded-l only
                          style={{ width: `${progressPercent}%`, zIndex: 1 }}
                        />
                        {/* Task Title & Assignee (on top of progress) */}
                        <span className="truncate pointer-events-none relative z-10">
                          {task.title}
                          {task.assignedTo && task.assignedTo !== "Unassigned" && (
                            <span className="text-white/80 ml-1.5 text-[10px]">({task.assignedTo})</span>
                          )}
                        </span>
                        <div
                            onMouseDown={(e) => handleResizeMouseDown(e, task)}
                            className="absolute top-0 right-0 h-full cursor-col-resize group-hover/taskbar:bg-black/20 transition-colors z-20" // Ensure resize handle is on top
                            style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px` }}
                            title={`Resize ${task.title}`}
                        >
                            <span className="sr-only">Resize task</span>
                        </div>
                      </>
                    )}
                     {task.isMilestone && (
                        <div className="w-full h-full flex items-center justify-center text-white" style={{transform: 'rotate(-45deg)'}}>
                           {/* Optional: Icon inside diamond if needed */}
                        </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
           {processedTasks.length === 0 && (
             <div className="flex items-center justify-center" style={{height: `${ROW_HEIGHT_PX * 3}px`, width: `${TASK_NAME_WIDTH_PX + totalChartWidth}px`}}> 
                <p className="text-muted-foreground p-4">No tasks in this project yet.</p>
             </div>
           )}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

