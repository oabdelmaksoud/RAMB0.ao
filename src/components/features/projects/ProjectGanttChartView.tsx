
'use client';

import type { Task } from '@/types';
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, eachDayOfInterval, min, max } from 'date-fns';
import { useMemo, useState, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
// Removed direct import of taskStatusColors, will define specific colors for Gantt bars

interface ProjectGanttChartViewProps {
  tasks: Task[];
}

const DAY_WIDTH_PX = 30; 
const ROW_HEIGHT_PX = 40; 
const HEADER_HEIGHT_PX = 60; // Combined height for month and day headers
const TASK_NAME_WIDTH_PX = 200;

const statusGanttBarColors: { [key in Task['status']]: string } = {
  'To Do': 'bg-slate-400 hover:bg-slate-500',
  'In Progress': 'bg-blue-500 hover:bg-blue-600',
  'Done': 'bg-green-500 hover:bg-green-600',
  'Blocked': 'bg-red-500 hover:bg-red-600',
};


export default function ProjectGanttChartView({ tasks }: ProjectGanttChartViewProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const { chartStartDate, chartEndDate, totalDays, daysArray } = useMemo(() => {
    if (!tasks.length) {
      const today = startOfDay(new Date());
      return {
        chartStartDate: today,
        chartEndDate: addDays(today, 29), // Default to 30 days if no tasks
        totalDays: 30,
        daysArray: eachDayOfInterval({ start: today, end: addDays(today, 29) }),
      };
    }

    const taskDates = tasks.reduce((acc, task) => {
      if (task.startDate) {
        const start = startOfDay(parseISO(task.startDate));
        acc.push(start);
        if (task.durationDays && task.durationDays > 0) {
          acc.push(addDays(start, task.durationDays -1));
        } else {
           acc.push(start); 
        }
      }
      return acc;
    }, [] as Date[]);


    if (!taskDates.length) { 
        const today = startOfDay(new Date());
        return {
            chartStartDate: addDays(today, -2), // Add padding
            chartEndDate: addDays(today, 30 + 7), // Add padding
            totalDays: 31 + 9, // Adjust total days based on padding
            daysArray: eachDayOfInterval({ start: addDays(today, -2), end: addDays(today, 30 + 7) }),
        };
    }
    
    let overallMinDate = min(taskDates);
    let overallMaxDate = max(taskDates);

    overallMinDate = addDays(overallMinDate, -3); // Padding before
    overallMaxDate = addDays(overallMaxDate, 7);  // Padding after


    const days = eachDayOfInterval({ start: overallMinDate, end: overallMaxDate });

    return {
      chartStartDate: overallMinDate,
      chartEndDate: overallMaxDate,
      totalDays: days.length > 0 ? days.length : 30, // Ensure totalDays is at least 30
      daysArray: days.length > 0 ? days : eachDayOfInterval({ start: startOfDay(new Date()), end: addDays(startOfDay(new Date()), 29) }),
    };
  }, [tasks]);

  if (!isClient) {
    return <div className="p-4 text-muted-foreground">Loading Gantt chart...</div>;
  }
  
  const getTaskPositionAndWidth = (task: Task) => {
    if (!task.startDate) return { left: 0, width: DAY_WIDTH_PX };

    const taskStart = startOfDay(parseISO(task.startDate));
    const offsetDays = differenceInCalendarDays(taskStart, chartStartDate);
    const duration = (task.durationDays && task.durationDays > 0) ? task.durationDays : 1; 

    return {
      left: Math.max(0, offsetDays * DAY_WIDTH_PX), 
      width: duration * DAY_WIDTH_PX,
    };
  };

  const totalChartWidth = totalDays * DAY_WIDTH_PX;

  return (
    <ScrollArea className="w-full">
      <div style={{ minWidth: `${TASK_NAME_WIDTH_PX + totalChartWidth}px` }} className="relative bg-card">
        {/* Header Row - Task Names & Timeline */}
        <div className="flex sticky top-0 z-20 bg-card border-b">
          <div 
            style={{ width: `${TASK_NAME_WIDTH_PX}px`, minWidth: `${TASK_NAME_WIDTH_PX}px`, height: `${HEADER_HEIGHT_PX}px` }}
            className="p-2 border-r font-semibold flex items-center justify-start sticky left-0 bg-card z-10"
          >
            Task Name
          </div>
          <div className="flex-grow overflow-x-hidden"> {/* This div will contain the scrollable timeline headers */}
            {/* Month Headers */}
            <div className="flex border-b h-[30px]">
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
            {/* Day Headers */}
            <div className="flex h-[30px]">
              {daysArray.map((day) => (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  style={{ width: `${DAY_WIDTH_PX}px`, minWidth: `${DAY_WIDTH_PX}px` }}
                  className="p-1 text-[10px] text-center border-r last:border-r-0 text-muted-foreground"
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Rows */}
        <div className="relative"> {/* Container for all task rows and grid lines */}
          {tasks.map((task, taskIndex) => {
            const { left: barLeftOffset, width: barWidth } = getTaskPositionAndWidth(task);
            return (
              <div
                key={task.id}
                className="flex items-center border-b last:border-b-0 hover:bg-muted/20"
                style={{ height: `${ROW_HEIGHT_PX}px`, position: 'relative' }}
              >
                {/* Task Name Cell (Sticky) */}
                <div 
                    style={{ width: `${TASK_NAME_WIDTH_PX}px`, minWidth: `${TASK_NAME_WIDTH_PX}px`, height: '100%' }} 
                    className="p-2 text-sm truncate sticky left-0 bg-card group-hover:bg-muted/20 z-10 border-r flex items-center"
                >
                  {task.title}
                </div>
                {/* Timeline part for this task row (where the bar is drawn relative to) */}
                {/* This empty div is not strictly needed if positioning bars absolutely w.r.t task row */}
              </div>
            );
          })}

          {/* Render task bars on top of grid and rows (absolute positioning relative to the main chart div) */}
           <div className="absolute top-0 left-0 w-full h-full pointer-events-none"> {/* Overlay for bars */}
             {daysArray.map((_, dayIndex) => ( // Vertical grid lines
                <div
                  key={`v-grid-${dayIndex}`}
                  className="absolute top-0 bottom-0 border-r border-border/50" 
                  style={{ left: `${TASK_NAME_WIDTH_PX + dayIndex * DAY_WIDTH_PX}px`, height: `${tasks.length * ROW_HEIGHT_PX}px` }}
                ></div>
              ))}
            {tasks.map((task, taskIndex) => {
              const { left: barLeftOffset, width: barWidth } = getTaskPositionAndWidth(task);
              if (!task.startDate) return null;

              return (
                <div
                  key={`bar-${task.id}`}
                  title={`${task.title}\nStatus: ${task.status}\nStarts: ${format(parseISO(task.startDate), 'MMM d, yyyy')}\nDuration: ${task.durationDays || 1} day(s)`}
                  className={cn(
                      "absolute my-[5px] h-[calc(100%-10px)] rounded text-white text-[11px] px-2 flex items-center overflow-hidden shadow-sm transition-all duration-150 ease-in-out pointer-events-auto", // Added pointer-events-auto
                      statusGanttBarColors[task.status] || 'bg-gray-500'
                  )}
                  style={{ 
                      left: `${TASK_NAME_WIDTH_PX + barLeftOffset}px`, 
                      width: `${barWidth}px`, 
                      top: `${taskIndex * ROW_HEIGHT_PX}px`,
                      height: `${ROW_HEIGHT_PX - 10}px`, // Adjusted height
                      lineHeight: `${ROW_HEIGHT_PX - 10}px`, // For vertical centering of text
                  }}
                >
                  <span className="truncate">{task.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

