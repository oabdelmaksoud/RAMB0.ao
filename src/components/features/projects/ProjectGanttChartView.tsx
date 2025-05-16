
'use client';

import type { Task } from '@/types';
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, eachDayOfInterval, min, max } from 'date-fns';
import { useMemo, useState, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Diamond } from 'lucide-react'; // Import Diamond for milestone

interface ProjectGanttChartViewProps {
  tasks: Task[];
  onUpdateTask: (updatedTask: Task) => void;
}

const DAY_WIDTH_PX = 30;
const ROW_HEIGHT_PX = 40;
const HEADER_HEIGHT_PX = 60; 
const TASK_NAME_WIDTH_PX = 200;
const RESIZE_HANDLE_WIDTH_PX = 10;
const MILESTONE_SIZE_PX = 20; // Size of the diamond milestone marker

const statusGanttBarColors: { [key in Task['status']]: string } = {
  'To Do': 'bg-slate-400 hover:bg-slate-500',
  'In Progress': 'bg-blue-500 hover:bg-blue-600',
  'Done': 'bg-green-500 hover:bg-green-600',
  'Blocked': 'bg-red-500 hover:bg-red-600',
};

const milestoneColor = 'bg-amber-500 hover:bg-amber-600'; // Distinct color for milestones

// Helper to get a darker shade for progress fill
const getProgressFillColor = (baseColor: string): string => {
  if (baseColor.includes('slate')) return 'bg-slate-600';
  if (baseColor.includes('blue')) return 'bg-blue-700';
  if (baseColor.includes('green')) return 'bg-green-700';
  if (baseColor.includes('red')) return 'bg-red-700';
  return 'bg-gray-700'; // Fallback
};


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

  const { chartStartDate, chartEndDate, totalDays, daysArray } = useMemo(() => {
    if (!tasks.length) {
      const today = startOfDay(new Date());
      const defaultStartDate = addDays(today, -15); // Increased padding
      const defaultEndDate = addDays(today, 45); // Increased padding
      return {
        chartStartDate: defaultStartDate,
        chartEndDate: defaultEndDate,
        totalDays: differenceInCalendarDays(defaultEndDate, defaultStartDate) + 1,
        daysArray: eachDayOfInterval({ start: defaultStartDate, end: defaultEndDate }),
      };
    }

    const taskDates = tasks.reduce((acc, task) => {
      if (task.startDate) {
        try {
            const start = startOfDay(parseISO(task.startDate));
            acc.push(start);
            if (!task.isMilestone && task.durationDays && task.durationDays > 0) { // Milestones have duration 0
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

    overallMinDate = addDays(overallMinDate, -15); // Increased padding
    overallMaxDate = addDays(overallMaxDate, 30);  // Increased padding

    const days = eachDayOfInterval({ start: overallMinDate, end: overallMaxDate });

    return {
      chartStartDate: overallMinDate,
      chartEndDate: overallMaxDate,
      totalDays: days.length > 0 ? days.length : 60, // Default to a 60-day view if no tasks
      daysArray: days.length > 0 ? days : eachDayOfInterval({ start: addDays(startOfDay(new Date()), -15), end: addDays(startOfDay(new Date()), 44) }),
    };
  }, [tasks]);

  const getTaskPositionAndWidth = (task: Task) => {
    if (!task.startDate) return { left: 0, width: DAY_WIDTH_PX };
    try {
        const taskStart = startOfDay(parseISO(task.startDate));
        const offsetDays = differenceInCalendarDays(taskStart, chartStartDate);
        const duration = task.isMilestone ? 1 : ((task.durationDays && task.durationDays > 0) ? task.durationDays : 1);
        return {
            left: Math.max(0, offsetDays * DAY_WIDTH_PX),
            width: duration * DAY_WIDTH_PX,
        };
    } catch (e) {
        return { left: 0, width: DAY_WIDTH_PX };
    }
  };

  const handleTaskBarMouseDown = (event: ReactMouseEvent<HTMLDivElement>, task: Task) => {
    event.preventDefault();
    event.stopPropagation();
    if (!task.startDate || resizingTaskDetails) return; // Don't drag if resize is active

    try {
        setDraggingTaskDetails({
            task,
            initialMouseX: event.clientX,
            originalStartDate: startOfDay(parseISO(task.startDate)),
        });
    } catch (e) {
        console.error("Error parsing start date on mouse down:", task.startDate, e);
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
    if (task.isMilestone || draggingTaskDetails) return; // Don't resize milestones or if drag is active

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
    let tooltip = `${task.title}`;
    if (task.isMilestone) {
        tooltip += ` (Milestone)`;
    }
    tooltip += `\nStatus: ${task.status}`;
    if (task.startDate) {
      tooltip += `\nDate: ${format(parseISO(task.startDate), 'MMM d, yyyy')}`;
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
        <div className="flex sticky top-0 z-20 bg-card border-b">
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

        {/* Task Rows & Grid Lines */}
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
                height: `${tasks.length * ROW_HEIGHT_PX}px`, 
                zIndex: 0, 
              }}
            ></div>
          ))}

          {tasks.map((task, taskIndex) => {
            const { left: barLeftOffset, width: barWidth } = getTaskPositionAndWidth(task);
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
                {/* Task Name Cell (Sticky) */}
                <div
                  style={{ width: `${TASK_NAME_WIDTH_PX}px`, minWidth: `${TASK_NAME_WIDTH_PX}px`, height: '100%' }}
                  className="p-2 text-sm truncate sticky left-0 bg-card group-hover:bg-muted/10 z-10 border-r flex items-center"
                >
                  {task.title}
                </div>
                
                {/* Task Bar or Milestone Marker */}
                {task.startDate && (
                  <div
                    onMouseDown={(e) => handleTaskBarMouseDown(e, task)}
                    title={getTaskTooltip(task)}
                    className={cn(
                      "absolute my-[5px] flex items-center justify-center overflow-hidden shadow-sm transition-shadow duration-150 ease-in-out group",
                      isDraggingThisTask ? 'cursor-grabbing opacity-75 ring-2 ring-primary z-20' : 'cursor-grab',
                      isResizingThisTask && 'z-20 ring-2 ring-primary opacity-75',
                      task.isMilestone ? barBaseColor : cn(barBaseColor, "rounded text-white text-[11px] px-2")
                    )}
                    style={{
                      left: `${TASK_NAME_WIDTH_PX + barLeftOffset + (task.isMilestone ? (DAY_WIDTH_PX / 2 - MILESTONE_SIZE_PX / 2) : 0)}px`, // Center milestone in its day cell
                      width: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${barWidth}px`,
                      height: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${ROW_HEIGHT_PX - 10}px`,
                      top: `${taskIndex * ROW_HEIGHT_PX + (task.isMilestone ? (ROW_HEIGHT_PX / 2 - MILESTONE_SIZE_PX / 2) : 0)}px`,
                      lineHeight: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${ROW_HEIGHT_PX - 10}px`, 
                      zIndex: isDraggingThisTask || isResizingThisTask ? 20 : 10,
                      transform: task.isMilestone ? 'rotate(45deg)' : 'none',
                    }}
                  >
                    {!task.isMilestone && (
                      <>
                        {/* Progress Fill */}
                        <div
                          className={cn("absolute top-0 left-0 h-full rounded", progressFillColor)}
                          style={{ width: `${progressPercent}%` }}
                        />
                        {/* Task Title (on top of progress) */}
                        <span className="truncate pointer-events-none relative z-10">{task.title}</span>
                        {!task.isMilestone && (
                          <div
                              onMouseDown={(e) => handleResizeMouseDown(e, task)}
                              className="absolute top-0 right-0 h-full cursor-col-resize group-hover:bg-black/20 transition-colors"
                              style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px` }}
                              title={`Resize ${task.title}`}
                          >
                              <span className="sr-only">Resize task</span>
                          </div>
                        )}
                      </>
                    )}
                     {task.isMilestone && (
                        <div className="w-full h-full flex items-center justify-center text-white" style={{transform: 'rotate(-45deg)'}}>
                           {/* Optionally, an icon could go here instead of text if the diamond itself is enough */}
                        </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
           {tasks.length === 0 && (
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
