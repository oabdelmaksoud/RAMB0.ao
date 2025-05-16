
'use client';

import type { Task } from '@/types';
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, eachDayOfInterval, min, max } from 'date-fns';
import { useMemo, useState, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { taskStatusColors } from '@/app/projects/[projectId]/page'; // Import status colors


interface ProjectGanttChartViewProps {
  tasks: Task[];
}

const DAY_WIDTH_PX = 30; // Width of each day cell in pixels
const ROW_HEIGHT_PX = 40; // Height of each task row
const HEADER_HEIGHT_PX = 60; // Height for timeline headers
const TASK_NAME_WIDTH_PX = 200; // Width for the task name column

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
        chartEndDate: addDays(today, 30), // Default to 30 days if no tasks
        totalDays: 31,
        daysArray: eachDayOfInterval({ start: today, end: addDays(today, 30) }),
      };
    }

    const taskDates = tasks.reduce((acc, task) => {
      if (task.startDate) {
        const start = startOfDay(parseISO(task.startDate));
        acc.push(start);
        if (task.durationDays && task.durationDays > 0) {
          acc.push(addDays(start, task.durationDays - 1));
        } else {
           acc.push(start); // Task with no duration, count as 1 day for range
        }
      }
      return acc;
    }, [] as Date[]);


    if (!taskDates.length) { // If tasks exist but none have dates
        const today = startOfDay(new Date());
        return {
            chartStartDate: today,
            chartEndDate: addDays(today, 30),
            totalDays: 31,
            daysArray: eachDayOfInterval({ start: today, end: addDays(today, 30) }),
        };
    }
    
    let overallMinDate = min(taskDates);
    let overallMaxDate = max(taskDates);

    // Add some padding to the chart
    overallMinDate = addDays(overallMinDate, -2);
    overallMaxDate = addDays(overallMaxDate, 7);


    const days = eachDayOfInterval({ start: overallMinDate, end: overallMaxDate });

    return {
      chartStartDate: overallMinDate,
      chartEndDate: overallMaxDate,
      totalDays: days.length,
      daysArray: days,
    };
  }, [tasks]);

  if (!isClient) {
    // Render a placeholder or loader during SSR/pre-hydration
    return <div className="p-4 text-muted-foreground">Loading Gantt chart...</div>;
  }
  
  const getTaskPositionAndWidth = (task: Task) => {
    if (!task.startDate) return { left: 0, width: DAY_WIDTH_PX }; // Default for tasks without start date

    const taskStart = startOfDay(parseISO(task.startDate));
    const offsetDays = differenceInCalendarDays(taskStart, chartStartDate);
    const duration = (task.durationDays && task.durationDays > 0) ? task.durationDays : 1; // Ensure at least 1 day width

    return {
      left: Math.max(0, offsetDays * DAY_WIDTH_PX), // Ensure left is not negative
      width: duration * DAY_WIDTH_PX,
    };
  };

  const totalChartWidth = totalDays * DAY_WIDTH_PX;

  return (
    <ScrollArea className="w-full border rounded-md shadow-sm">
      <div style={{ minWidth: `${TASK_NAME_WIDTH_PX + totalChartWidth}px` }} className="relative">
        {/* Header Row - Task Names & Timeline */}
        <div className="flex sticky top-0 z-20 bg-card border-b">
          <div 
            style={{ width: `${TASK_NAME_WIDTH_PX}px`, height: `${HEADER_HEIGHT_PX}px` }}
            className="p-2 border-r font-semibold flex items-center justify-center sticky left-0 bg-card z-10"
          >
            Task Name
          </div>
          <div className="flex-grow">
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
                      style={{ width: `${colspan * DAY_WIDTH_PX}px` }}
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
                  style={{ width: `${DAY_WIDTH_PX}px` }}
                  className="p-1 text-xs text-center border-r last:border-r-0 text-muted-foreground"
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Rows */}
        <div className="relative" style={{ height: `${tasks.length * ROW_HEIGHT_PX}px` }}>
          {/* Grid Lines - Vertical */}
           {daysArray.map((_, index) => (
            <div
              key={`v-line-${index}`}
              className="absolute top-0 bottom-0 border-r"
              style={{ left: `${index * DAY_WIDTH_PX}px`, width: `${DAY_WIDTH_PX}px` }}
            ></div>
          ))}
          
          {tasks.map((task, index) => {
            const { left, width } = getTaskPositionAndWidth(task);
            return (
              <div
                key={task.id}
                className="flex items-center border-b last:border-b-0 hover:bg-accent/50"
                style={{ height: `${ROW_HEIGHT_PX}px` }}
              >
                <div 
                    style={{ width: `${TASK_NAME_WIDTH_PX}px`}} 
                    className="p-2 text-sm truncate sticky left-0 bg-card group-hover:bg-accent/50 z-10 border-r"
                >
                  {task.title}
                </div>
                <div className="relative h-full flex-grow">
                  {task.startDate && (
                     <div
                        title={`${task.title}\nStatus: ${task.status}\nStarts: ${format(parseISO(task.startDate), 'MMM d, yyyy')}\nDuration: ${task.durationDays || 1} day(s)`}
                        className={cn(
                            "absolute my-1.5 h-[calc(100%-0.75rem)] rounded text-white text-xs px-2 flex items-center overflow-hidden shadow-sm transition-all duration-150 ease-in-out",
                            statusGanttBarColors[task.status] || 'bg-gray-500'
                        )}
                        style={{ left: `${left}px`, width: `${width}px` }}
                    >
                       <span className="truncate">{task.title}</span> {/* Show title inside bar if space */}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
