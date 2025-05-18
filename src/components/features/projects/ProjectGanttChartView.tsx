
'use client';

import type { Task } from '@/types';
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, eachDayOfInterval, min, max, isToday as dateFnsIsToday } from 'date-fns';
import { useMemo, useState, useEffect, MouseEvent as ReactMouseEvent, DragEvent as ReactDragEvent } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Diamond, ChevronDown, ChevronRight, FolderGit2, ListTree, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DAY_WIDTH_PX = 35;
const ROW_HEIGHT_PX = 40;
const TIMELINE_HEADER_ROW_HEIGHT_PX = 30;

const TASK_TITLE_COL_WIDTH_PX = 200;
const START_DATE_COL_WIDTH_PX = 80;
const END_DATE_COL_WIDTH_PX = 80;
const DURATION_COL_WIDTH_PX = 70;
const TASK_DETAILS_AREA_WIDTH_PX = TASK_TITLE_COL_WIDTH_PX + START_DATE_COL_WIDTH_PX + END_DATE_COL_WIDTH_PX + DURATION_COL_WIDTH_PX;


const RESIZE_HANDLE_WIDTH_PX = 10;
const MILESTONE_SIZE_PX = 16;
const INDENT_WIDTH_PX = 20;

const statusGanttBarColors: { [key in Task['status']]: string } = {
  'To Do': 'bg-slate-400 hover:bg-slate-500',
  'In Progress': 'bg-blue-500 hover:bg-blue-600',
  'Done': 'bg-green-500 hover:bg-green-600',
  'Blocked': 'bg-red-500 hover:bg-red-600',
};
const milestoneColor = 'bg-amber-500 hover:bg-amber-600';

const getProgressFillColor = (baseColor: string): string => {
  if (baseColor.includes('slate')) return 'bg-slate-600 dark:bg-slate-500';
  if (baseColor.includes('blue')) return 'bg-blue-700 dark:bg-blue-600';
  if (baseColor.includes('green')) return 'bg-green-700 dark:bg-green-600';
  if (baseColor.includes('red')) return 'bg-red-700 dark:bg-red-600';
  return 'bg-gray-700 dark:bg-gray-600'; 
};


interface ProjectGanttChartViewProps {
  tasks: Task[];
  onUpdateTask: (updatedTask: Task) => void;
  onTasksReorder: (draggedTaskId: string, targetTaskId: string) => void;
}

export default function ProjectGanttChartView({ tasks, onUpdateTask, onTasksReorder }: ProjectGanttChartViewProps) {
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

  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(new Set());

  const toggleTaskCollapse = (taskId: string) => {
    setCollapsedTaskIds(prevCollapsed => {
      const newCollapsed = new Set(prevCollapsed);
      if (newCollapsed.has(taskId)) {
        newCollapsed.delete(taskId);
      } else {
        newCollapsed.add(taskId);
      }
      return newCollapsed;
    });
  };

  const processedTasks = useMemo(() => {
    // console.log("[GanttChartView] Input 'tasks' prop (IDs & order):", tasks.map(t => ({id: t.id, title: t.title.substring(0,10)})));
    type TaskWithHierarchy = Task & { children: TaskWithHierarchy[]; level: number; isParent: boolean };

    const taskMap = new Map<string, TaskWithHierarchy>();
    tasks.forEach(task => taskMap.set(task.id, { ...task, children: [], level: 0, isParent: false }));

    const rootTasks: TaskWithHierarchy[] = [];
    tasks.forEach(task => {
        const currentTaskNode = taskMap.get(task.id)!;
        if (task.parentId && taskMap.has(task.parentId)) {
            const parentNode = taskMap.get(task.parentId)!;
            parentNode.children.push(currentTaskNode);
            parentNode.isParent = true; // Mark as parent
        } else {
            rootTasks.push(currentTaskNode);
        }
    });
    
    // Sort root tasks based on their order in the original `tasks` array
    const orderedRootTasks = rootTasks.sort((a,b) => tasks.findIndex(t => t.id === a.id) - tasks.findIndex(t => t.id === b.id));

    // Sort children for each parent task as well
    taskMap.forEach(node => {
        if (node.isParent) { // This check is now redundant if children were populated above, but good for clarity
            node.children.sort((a, b) => tasks.findIndex(t => t.id === a.id) - tasks.findIndex(t => t.id === b.id));
        }
    });
    
    const flattenTasks = (tasksToFlatten: TaskWithHierarchy[], currentLevel: number): (Task & { level: number; isParent: boolean })[] => {
      let result: (Task & { level: number; isParent: boolean })[] = [];
      for (const taskNode of tasksToFlatten) {
        result.push({ ...taskNode, level: currentLevel, isParent: taskNode.children.length > 0 }); // isParent is now based on children array
        if (taskNode.children.length > 0 && !collapsedTaskIds.has(taskNode.id)) { // Check if not collapsed
           result = result.concat(flattenTasks(taskNode.children, currentLevel + 1));
        }
      }
      return result;
    };

    const finalFlattenedTasks = flattenTasks(orderedRootTasks, 0);
    // console.log("[GanttChartView] Output 'processedTasks' (IDs, order, level, isParent):", finalFlattenedTasks.map(t => ({id: t.id, title: t.title.substring(0,10), level: t.level, isParent: t.isParent, collapsed: collapsedTaskIds.has(t.id) })));
    return finalFlattenedTasks;
  }, [tasks, collapsedTaskIds]);


  const { chartStartDate, chartEndDate, totalDays, daysArray } = useMemo(() => {
    if (!processedTasks.length) {
      const today = startOfDay(new Date());
      const defaultStartDate = addDays(today, -15);
      const defaultEndDate = addDays(today, 45); // Ensure at least ~60 days
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

    // Ensure a minimum visible range, e.g., 60 days
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
  }, [processedTasks]);

  const getTaskBarPositionAndStyle = (task: Task & { level: number; isParent: boolean }, taskIndex: number) => {
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
      // Fallback if date parsing fails
      return { left: 0, width: DAY_WIDTH_PX, top: taskIndex * ROW_HEIGHT_PX };
    }
  };

  const handleTaskBarMouseDown = (event: ReactMouseEvent<HTMLDivElement>, task: Task) => {
    event.preventDefault();
    event.stopPropagation(); // Important to prevent row drag start
    if (!task.startDate || resizingTaskDetails || task.isMilestone) return;

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
      onUpdateTask(updatedTask); // Update parent state directly for live feedback
    };

    const handleDocumentMouseUp = () => {
      if (!draggingTaskDetails) return;
      // Final update logic is already handled by onUpdateTask in mousemove
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
    event.stopPropagation(); // Important to prevent row drag start
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
      onUpdateTask(updatedTask); // Update parent state directly
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

  // Row Drag & Drop for reordering
  const handleRowDragStart = (event: ReactDragEvent<HTMLDivElement>, taskId: string) => {
    event.dataTransfer.setData('taskId', taskId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleRowDragOver = (event: ReactDragEvent<HTMLDivElement>, taskId: string) => {
    event.preventDefault();
    setDragOverRowId(taskId);
  };

  const handleRowDragLeave = () => {
    setDragOverRowId(null);
  };

  const handleRowDrop = (event: ReactDragEvent<HTMLDivElement>, targetTaskId: string) => {
    event.preventDefault();
    const draggedTaskId = event.dataTransfer.getData('taskId');
    setDragOverRowId(null);
    if (draggedTaskId && targetTaskId && draggedTaskId !== targetTaskId) {
      onTasksReorder(draggedTaskId, targetTaskId);
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
    if (task.isMilestone) tooltip += ` (Milestone)`;
    tooltip += `\nStatus: ${task.status}`;
    tooltip += `\nAssigned To: ${task.assignedTo}`;
    if (task.startDate) {
      tooltip += `\n${task.isMilestone ? 'Date' : 'Start'}: ${format(parseISO(task.startDate), 'MMM d, yyyy')}`;
    }
    if (!task.isMilestone && task.durationDays) {
      tooltip += `\nDuration: ${task.durationDays} day(s)`;
      if (task.startDate) {
         tooltip += `\nEnd: ${format(addDays(parseISO(task.startDate), task.durationDays -1), 'MMM d, yyyy')}`;
      }
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
      return format(addDays(startDate, duration -1 ), 'MMM d');
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
            className="p-0 border-r font-semibold flex items-stretch sticky left-0 bg-card z-20" // z-index to be above grid lines but below "Today"
          >
            <div style={{ width: `${TASK_TITLE_COL_WIDTH_PX}px` }} className="p-2 flex items-center border-r">Task Name</div>
            <div style={{ width: `${START_DATE_COL_WIDTH_PX}px` }} className="p-2 flex items-center justify-center border-r text-xs">Start</div>
            <div style={{ width: `${END_DATE_COL_WIDTH_PX}px` }} className="p-2 flex items-center justify-center border-r text-xs">End</div>
            <div style={{ width: `${DURATION_COL_WIDTH_PX}px` }} className="p-2 flex items-center justify-center text-xs">Dur.</div>
          </div>

          {/* Timeline Header - Month/Year and Day numbers */}
          <div className="flex-grow overflow-x-hidden relative z-10"> {/* Main header relative for Today label */}
            <div className="flex border-b" style={{ height: `${TIMELINE_HEADER_ROW_HEIGHT_PX}px` }}>
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
            <div className="flex" style={{ height: `${TIMELINE_HEADER_ROW_HEIGHT_PX}px` }}>
              {daysArray.map((day) => (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  style={{ width: `${DAY_WIDTH_PX}px`, minWidth: `${DAY_WIDTH_PX}px` }}
                  className={cn(
                    "p-1 text-[10px] text-center border-r last:border-r-0 text-muted-foreground",
                    (format(day, 'E') === 'Sat' || format(day, 'E') === 'Sun') && 'bg-muted/30 dark:bg-muted/20'
                  )}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
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
                (format(daysArray[dayIndex], 'E') === 'Sat' || format(daysArray[dayIndex], 'E') === 'Sun') && 'bg-muted/20 dark:bg-muted/10'
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
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 pointer-events-none"
              style={{
                left: `${TASK_DETAILS_AREA_WIDTH_PX + todayOffsetDays * DAY_WIDTH_PX + (DAY_WIDTH_PX / 2) - 1}px`,
                height: `${processedTasks.length * ROW_HEIGHT_PX}px`,
                zIndex: 40, 
              }}
              title={`Today: ${format(today, 'MMM d')}`}
            />
          )}
          {/* Dependency Lines SVG Layer */}
          <svg
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
              if (!task.dependencies || !task.startDate) return null;

              const dependentBarPos = getTaskBarPositionAndStyle(task, taskIndex);

              return task.dependencies.map(depId => {
                const prereqTask = processedTasks.find(t => t.id === depId);
                if (!prereqTask || !prereqTask.startDate) return null;

                const prereqTaskIndex = processedTasks.findIndex(t => t.id === depId);
                if (prereqTaskIndex === -1) return null;

                const prereqBarPos = getTaskBarPositionAndStyle(prereqTask, prereqTaskIndex);

                // Calculate end of prereq bar and start of dependent bar
                const x1 = prereqBarPos.left + (prereqTask.isMilestone ? MILESTONE_SIZE_PX / 2 : prereqBarPos.width);
                const y1 = prereqBarPos.top + ROW_HEIGHT_PX / 2;
                
                const x2 = dependentBarPos.left + (task.isMilestone ? MILESTONE_SIZE_PX / 2 : 0) - (task.isMilestone ? 0 : 5) ; // Small gap before task bar
                const y2 = dependentBarPos.top + ROW_HEIGHT_PX / 2;

                // Avoid drawing lines that go backwards (unless one is a milestone)
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
                  />
                );
              });
            })}
          </svg>

          {/* Task Rows */}
          {processedTasks.map((task, taskIndex) => {
            const { left: barLeftOffset, width: barWidth, top: barTopOffset } = getTaskBarPositionAndStyle(task, taskIndex);
            // console.log(`Rendering bar for ${task.title} (ID: ${task.id}) at index ${taskIndex}, calculated top: ${barTopOffset}`);
            const isDraggingThisTask = draggingTaskDetails?.task.id === task.id;
            const isResizingThisTask = resizingTaskDetails?.task.id === task.id;
            
            let barBaseClasses = "absolute my-[5px] flex items-center justify-start overflow-hidden shadow-sm transition-shadow duration-150 ease-in-out group/taskbar rounded";
            let barTextClasses = "truncate pointer-events-none relative z-[5] flex items-center text-white dark:text-gray-100 text-[11px] px-2";
            let progressFillElement = null;

            if (task.isMilestone) {
              barBaseClasses = cn(barBaseClasses, milestoneColor, "justify-center");
            } else if (task.isParent) {
              const statusColorClass = statusGanttBarColors[task.status] || 'border-gray-500';
              barBaseClasses = cn(barBaseClasses, `border-2 ${statusColorClass.replace('bg-', 'border-').replace('hover:bg-', 'hover:border-')}`, 'bg-card dark:bg-muted/30');
              barTextClasses = "truncate pointer-events-none relative z-[5] flex items-center text-card-foreground dark:text-gray-200 text-[11px] px-2";
            } else { 
              const statusColorClass = statusGanttBarColors[task.status] || 'bg-gray-500 hover:bg-gray-600';
              barBaseClasses = cn(barBaseClasses, statusColorClass.replace(/hover:bg-\S+\s*/, '')); // Remove hover from base
              
              const progressPercent = task.progress !== undefined ? Math.max(0, Math.min(100, task.progress)) : 0;
              const progressFillColor = getProgressFillColor(statusColorClass.replace(/hover:bg-\S+\s*/, ''));
              progressFillElement = (
                <div
                  className={cn("absolute top-0 left-0 h-full rounded-l", progressFillColor)}
                  style={{ width: `${progressPercent}%`, zIndex: 1 }} 
                />
              );
            }
            
            if (isDraggingThisTask || isResizingThisTask) {
                barBaseClasses = cn(barBaseClasses, 'opacity-75 ring-2 ring-primary');
            }


            return (
              <div
                key={task.id} 
                className={cn(
                  "flex items-center border-b border-border/50 last:border-b-0 group hover:bg-muted/20 dark:hover:bg-muted/10",
                  dragOverRowId === task.id && 'outline-dashed outline-1 outline-primary -outline-offset-1'
                )}
                style={{ height: `${ROW_HEIGHT_PX}px`, position: 'relative' }}
                onDragOver={(e) => handleRowDragOver(e, task.id)}
                onDragLeave={handleRowDragLeave}
                onDrop={(e) => handleRowDrop(e, task.id)}
              >
                {/* Task Details Part (Sticky Left) */}
                <div
                  draggable 
                  onDragStart={(e) => handleRowDragStart(e, task.id)}
                  style={{
                    width: `${TASK_DETAILS_AREA_WIDTH_PX}px`,
                    minWidth: `${TASK_DETAILS_AREA_WIDTH_PX}px`,
                    height: '100%',
                  }}
                  className="text-sm sticky left-0 bg-card group-hover:bg-muted/20 dark:bg-card dark:group-hover:bg-muted/10 z-20 border-r border-border/50 flex items-stretch cursor-grab"
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
                    <span className="truncate">{task.title}</span>
                  </div>
                  <div style={{ width: `${START_DATE_COL_WIDTH_PX}px` }} className="p-2 border-r border-border/30 flex items-center justify-center text-xs text-muted-foreground">
                     {getFormattedDate(task.startDate)}
                  </div>
                  <div style={{ width: `${END_DATE_COL_WIDTH_PX}px` }} className="p-2 border-r border-border/30 flex items-center justify-center text-xs text-muted-foreground">
                    {task.isMilestone ? getFormattedDate(task.startDate) : getEndDate(task.startDate, task.durationDays)}
                  </div>
                  <div style={{ width: `${DURATION_COL_WIDTH_PX}px` }} className="p-2 flex items-center justify-center text-xs text-muted-foreground">
                    {task.isMilestone ? '-' : `${task.durationDays || 0}d`}
                  </div>
                </div>

                {/* Task Bar/Milestone on Timeline Part */}
                {task.startDate && (
                  <div
                    key={`bar-${task.id}`} // Added key here
                    onMouseDown={(e) => task.isMilestone || task.isParent ? null : handleTaskBarMouseDown(e, task)}
                    title={getTaskTooltip(task)}
                    className={cn(
                      barBaseClasses,
                      task.isMilestone ? "justify-center" : "",
                      isDraggingThisTask ? 'cursor-grabbing' : ((task.isMilestone || task.isParent) ? '' : 'cursor-grab')
                    )}
                    style={{
                      left: `${TASK_DETAILS_AREA_WIDTH_PX + barLeftOffset + (task.isMilestone ? (DAY_WIDTH_PX / 2 - MILESTONE_SIZE_PX / 2) : 0)}px`,
                      width: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${barWidth}px`,
                      height: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${ROW_HEIGHT_PX - 10}px`,
                      top: `${barTopOffset + (task.isMilestone ? (ROW_HEIGHT_PX / 2 - MILESTONE_SIZE_PX / 2 -5 /* Adjusted for overall bar margin */) : 0)}px`, 
                      lineHeight: task.isMilestone ? `${MILESTONE_SIZE_PX}px` : `${ROW_HEIGHT_PX - 10}px`,
                      zIndex: isDraggingThisTask || isResizingThisTask ? 50 : 30, 
                      transform: task.isMilestone ? 'rotate(45deg)' : 'none',
                    }}
                  >
                    {progressFillElement}
                    <span className={cn(barTextClasses, 'relative z-10')}> {/* Text on top of progress */}
                        {!task.isMilestone && !task.isParent && (
                           <>
                             <span className="truncate">{task.title}</span>
                             {task.assignedTo && task.assignedTo !== "Unassigned" && (
                                 <span className="ml-1.5 text-[10px] hidden sm:inline opacity-80">({task.assignedTo})</span>
                             )}
                           </>
                        )}
                        {task.isParent && !task.isMilestone && (
                           <span className="truncate font-medium">{task.title}</span>
                        )}
                    </span>
                    {(!task.isMilestone && !task.isParent) && (
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, task)}
                        className="absolute top-0 right-0 h-full cursor-col-resize group-hover/taskbar:bg-black/10 dark:group-hover/taskbar:bg-white/10 transition-colors z-20"
                        style={{ width: `${RESIZE_HANDLE_WIDTH_PX}px` }}
                        title={`Resize ${task.title}`}
                      >
                        <span className="sr-only">Resize task</span>
                      </div>
                    )}
                    {task.isMilestone && (
                      <div className="w-full h-full flex items-center justify-center" style={{ transform: 'rotate(-45deg)' }}>
                        {/* Optional icon for milestone diamond */}
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
              No tasks in this project yet. Click "Plan Task with AI" to add one.
            </div>
          )}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
