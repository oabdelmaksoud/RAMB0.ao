
'use client';

import type { Task } from '@/types';
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, eachDayOfInterval, min, max, isToday as dateFnsIsToday } from 'date-fns';
import { useMemo, useState, useEffect, MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Diamond } from 'lucide-react'; 

const DAY_WIDTH_PX = 35; 
const ROW_HEIGHT_PX = 40;
const HEADER_HEIGHT_PX = 60; 
const TIMELINE_HEADER_ROW_HEIGHT_PX = 30;

// Task list area configuration
const TASK_DETAILS_AREA_WIDTH_PX = 430; 
const TASK_TITLE_COL_WIDTH_PX = 200;    
const START_DATE_COL_WIDTH_PX = 80;
const END_DATE_COL_WIDTH_PX = 80;
const DURATION_COL_WIDTH_PX = 70;      

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
  return 'bg-gray-700'; // Fallback, though milestones shouldn't use this
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
          // Sort children by start date before flattening them
          const sortedChildren = [...task.children].sort((a, b) => (a.startDate && b.startDate ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0));
          result = result.concat(flattenTasks(sortedChildren, level + 1));
        }
      }
      return result;
    };
    
    rootTasks.sort((a,b) => (a.startDate && b.startDate ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0));
    return flattenTasks(rootTasks, 0);
  }, [tasks]);

  const { chartStartDate, chartEndDate, totalDays, daysArray } = useMemo(() => {
    if (!processedTasks.length) {
      const today = startOfDay(new Date());
      const defaultStartDate = addDays(today, -10); // Increased padding
      const defaultEndDate = addDays(today, 30 + 10); // Increased padding
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
      const fallbackStart = addDays(today, -10);
      const fallbackEnd = addDays(today, 40);
      return {
        chartStartDate: fallbackStart,
        chartEndDate: fallbackEnd,
        totalDays: differenceInCalendarDays(fallbackEnd, fallbackStart) + 1,
        daysArray: eachDayOfInterval({ start: fallbackStart, end: fallbackEnd }),
      };
    }

    let overallMinDate = min(taskDates);
    let overallMaxDate = max(taskDates);

    overallMinDate = addDays(overallMinDate, -10); // Padding before
    overallMaxDate = addDays(overallMaxDate, 20); // More padding after

    const days = eachDayOfInterval({ start: overallMinDate, end: overallMaxDate });

    return {
      chartStartDate: overallMinDate,
      chartEndDate: overallMaxDate,
      totalDays: days.length > 0 ? days.length : 50, 
      daysArray: days.length > 0 ? days : eachDayOfInterval({ start: addDays(startOfDay(new Date()), -10), end: addDays(startOfDay(new Date()), 39) }),
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
            top: taskIndex * ROW_HEIGHT_PX, // This is based on the task's index in the processedTasks array
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
      // Final update call could be made here if we were only updating on mouseup
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
  const today = startOfDay(new Date());
  const todayOffsetDays = differenceInCalendarDays(today, chartStartDate);
  const isTodayInView = todayOffsetDays >= 0 && todayOffsetDays < totalDays;


  const getTaskTooltip = (task: Task): string => {
    let tooltip = `Task: ${task.title}`;
    if (task.isMilestone) tooltip += ` (Milestone)`;
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
  
  const getFormattedDate = (dateString: string | undefined, dateFormat = 'MMM d') => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), dateFormat);
    } catch {
      return '-';
    }
  };

  const getEndDate = (startDateString: string | undefined, duration?: number) => {
    if (!startDateString || duration === undefined || duration < 1) return '-';
    try {
      const startDate = parseISO(startDateString);
      return format(addDays(startDate, duration -1), 'MMM d');
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
            style={{ width: `${TASK_DETAILS_AREA_WIDTH_PX}px`, minWidth: `${TASK_DETAILS_AREA_WIDTH_PX}px`, height: `${HEADER_HEIGHT_PX}px` }}
            className="p-0 border-r font-semibold flex items-stretch sticky left-0 bg-card z-10"
          >
            <div style={{width: `${TASK_TITLE_COL_WIDTH_PX}px`}} className="p-2 flex items-center border-r">Task Name</div>
            <div style={{width: `${START_DATE_COL_WIDTH_PX}px`}} className="p-2 flex items-center justify-center border-r text-xs">Start</div>
            <div style={{width: `${END_DATE_COL_WIDTH_PX}px`}} className="p-2 flex items-center justify-center border-r text-xs">End</div>
            <div style={{width: `${DURATION_COL_WIDTH_PX}px`}} className="p-2 flex items-center justify-center text-xs">Dur.</div>
          </div>
          {/* Timeline Header */}
          <div className="flex-grow overflow-x-hidden relative"> {/* Added relative for Today Line label */}
            <div className="flex border-b" style={{ height: `${TIMELINE_HEADER_ROW_HEIGHT_PX}px`}}> {/* Month/Year Headers */}
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
            <div className="flex" style={{ height: `${TIMELINE_HEADER_ROW_HEIGHT_PX}px`}}> {/* Day Headers */}
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
        <div className="relative"> {/* Main container for tasks and grid */}
          {/* Vertical Grid Lines */}
          {daysArray.map((_, dayIndex) => (
            <div
              key={`v-grid-${dayIndex}`}
              className={cn(
                "absolute top-0 bottom-0 border-r border-border/30",
                (format(daysArray[dayIndex], 'E') === 'Sat' || format(daysArray[dayIndex], 'E') === 'Sun') && 'bg-muted/20'
              )}
              style={{
                left: `${TASK_DETAILS_AREA_WIDTH_PX + dayIndex * DAY_WIDTH_PX}px`,
                width: `${DAY_WIDTH_PX}px`, 
                height: `${processedTasks.length * ROW_HEIGHT_PX}px`,
                zIndex: 0,
              }}
            ></div>
          ))}
          
          {/* Today Line Marker */}
          {isTodayInView && (
            <>
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-40"
                style={{
                  left: `${TASK_DETAILS_AREA_WIDTH_PX + todayOffsetDays * DAY_WIDTH_PX + (DAY_WIDTH_PX / 2) -1}px`,
                  height: `${processedTasks.length * ROW_HEIGHT_PX}px`,
                }}
                title={`Today: ${format(today, 'MMM d')}`}
              />
              <div 
                className="absolute text-red-500 text-xs font-semibold z-40"
                style={{
                    left: `${TASK_DETAILS_AREA_WIDTH_PX + todayOffsetDays * DAY_WIDTH_PX + (DAY_WIDTH_PX / 2) - 15}px`, // Adjust for label width
                    top: `-${TIMELINE_HEADER_ROW_HEIGHT_PX - 5}px`, // Position above day numbers
                }}
                >
                Today
               </div>
            </>
          )}


          {/* SVG Layer for Dependency Lines */}
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-20" // z-index lower than task bars
            style={{ marginLeft: `${TASK_DETAILS_AREA_WIDTH_PX}px`, width: `${totalChartWidth}px`, height: `${processedTasks.length * ROW_HEIGHT_PX}px` }}
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
              if (!task.dependencies || !task.startDate) return null;
              
              const dependentBarPos = getTaskBarPositionAndStyle(task, taskIndex);

              return task.dependencies.map(depId => {
                const prereqTask = processedTasks.find(t => t.id === depId);
                if (!prereqTask || !prereqTask.startDate) return null;

                const prereqTaskIndex = processedTasks.findIndex(t => t.id === depId);
                if(prereqTaskIndex === -1) return null;

                const prereqBarPos = getTaskBarPositionAndStyle(prereqTask, prereqTaskIndex);
                
                const x1 = prereqBarPos.left + (prereqTask.isMilestone ? MILESTONE_SIZE_PX / 2 : prereqBarPos.width);
                const y1 = prereqBarPos.top + ROW_HEIGHT_PX / 2;
                const x2 = dependentBarPos.left + (task.isMilestone ? MILESTONE_SIZE_PX / 2 : 0) - (task.isMilestone ? 0 : 5) ; 
                const y2 = dependentBarPos.top + ROW_HEIGHT_PX / 2;
                
                if (x1 >= x2) return null;

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
                  />
                );
              });
            })}
          </svg>


          {/* Task Rows */}
          {processedTasks.map((task, taskIndex) => {
            const { left: barLeftOffset, width: barWidth, top: barTopOffset } = getTaskBarPositionAndStyle(task, taskIndex);
            const isDraggingThisTask = draggingTaskDetails?.task.id === task.id;
            const isResizingThisTask = resizingTaskDetails?.task.id === task.id;
            
            const progressPercent = task.progress !== undefined ? Math.max(0, Math.min(100, task.progress)) : 0;
            const barBaseColor = task.isMilestone ? milestoneColor : (statusGanttBarColors[task.status] || 'bg-gray-500');
            const progressFillColor = getProgressFillColor(barBaseColor);


            return (
              <div
                key={task.id}
                className="flex items-center border-b last:border-b-0 group hover:bg-muted/10"
                style={{ height: `${ROW_HEIGHT_PX}px`, position: 'relative' }}
              >
                {/* Task Details Cells (Sticky) */}
                <div
                  style={{ 
                    width: `${TASK_DETAILS_AREA_WIDTH_PX}px`, 
                    minWidth: `${TASK_DETAILS_AREA_WIDTH_PX}px`, 
                    height: '100%',
                   }}
                  className="text-sm sticky left-0 bg-card group-hover:bg-muted/10 z-10 border-r flex items-stretch" 
                >
                  <div 
                    style={{width: `${TASK_TITLE_COL_WIDTH_PX}px`, paddingLeft: `${0.5 + (task.level * INDENT_WIDTH_PX / 16)}rem`}} 
                    className="p-2 border-r flex items-center truncate"
                    title={task.title}
                  >
                    {task.isMilestone && <Diamond className="mr-2 h-3 w-3 text-amber-500 flex-shrink-0" />}
                    {task.title}
                  </div>
                  <div style={{width: `${START_DATE_COL_WIDTH_PX}px`}} className="p-2 border-r flex items-center justify-center text-xs text-muted-foreground">
                    {getFormattedDate(task.startDate)}
                  </div>
                  <div style={{width: `${END_DATE_COL_WIDTH_PX}px`}} className="p-2 border-r flex items-center justify-center text-xs text-muted-foreground">
                    {task.isMilestone ? getFormattedDate(task.startDate) : getEndDate(task.startDate, task.durationDays)}
                  </div>
                  <div style={{width: `${DURATION_COL_WIDTH_PX}px`}} className="p-2 flex items-center justify-center text-xs text-muted-foreground">
                    {task.isMilestone ? '-' : `${task.durationDays || 0}d`}
                  </div>
                </div>
                
                {/* Task Bar or Milestone Marker */}
                {task.startDate && (
                  <div
                    onMouseDown={(e) => handleTaskBarMouseDown(e, task)}
                    title={getTaskTooltip(task)}
                    className={cn(
                      "absolute my-[5px] flex items-center justify-start overflow-hidden shadow-sm transition-shadow duration-150 ease-in-out group/taskbar text-white text-[11px] px-2 rounded",
                      barBaseColor,
                      task.isMilestone ? "justify-center" : "",
                      isDraggingThisTask ? 'cursor-grabbing opacity-75 ring-2 ring-primary z-50' : (task.isMilestone ? '' : 'cursor-grab'),
                      isResizingThisTask && 'z-50 ring-2 ring-primary opacity-75'
                    )}
                    style={{
                      left: `${TASK_DETAILS_AREA_WIDTH_PX + barLeftOffset + (task.isMilestone ? (DAY_WIDTH_PX / 2 - MILESTONE_SIZE_PX / 2) : 0)}px`,
                      width: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${barWidth}px`,
                      height: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${ROW_HEIGHT_PX - 10}px`,
                      top: `${barTopOffset + (task.isMilestone ? (ROW_HEIGHT_PX / 2 - MILESTONE_SIZE_PX / 2 - 5) : 0)}px`, // Adjusted top for task index
                      lineHeight: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${ROW_HEIGHT_PX - 10}px`, 
                      zIndex: isDraggingThisTask || isResizingThisTask ? 50 : 30, // Higher z-index for task bars
                      transform: task.isMilestone ? 'rotate(45deg)' : 'none',
                    }}
                  >
                    {!task.isMilestone && (
                      <>
                        <div
                          className={cn("absolute top-0 left-0 h-full rounded-l", progressFillColor)}
                          style={{ width: `${progressPercent}%`, zIndex: 1 }}
                        />
                        <span className="truncate pointer-events-none relative z-10">
                          {task.title}
                          {task.assignedTo && task.assignedTo !== "Unassigned" && (
                            <span className="text-white/80 ml-1.5 text-[10px]">({task.assignedTo})</span>
                          )}
                        </span>
                        <div
                            onMouseDown={(e) => handleResizeMouseDown(e, task)}
                            className="absolute top-0 right-0 h-full cursor-col-resize group-hover/taskbar:bg-black/20 transition-colors z-20" 
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
             <div 
                className="flex items-center justify-center text-muted-foreground p-4" 
                style={{height: `${ROW_HEIGHT_PX * 3}px`, width: `100%`}}
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

