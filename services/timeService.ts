
import { AppState, CalendarEvent, Task, RecurrenceType } from '../types';

// Helper to get ISO Week Number (Gregorian Standard)
export const getISOWeek = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Helper to get the start and end of an ISO week
export const getISOWeekRange = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay() || 7; // Monday is 1
    if (day !== 1) start.setHours(-24 * (day - 1));
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
};

export const parseCourseSchedule = (scheduleStr: string, courseName: string, courseColor: string, courseId: string): CalendarEvent[] => {
    if (!scheduleStr || scheduleStr === 'TBA') return [];

    const events: CalendarEvent[] = [];
    const now = new Date();
    // Get start of current week (Sunday)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    const daysMap: { [key: string]: number } = {
        'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6,
        'm': 1, 't': 2, 'w': 3, 'th': 4, 'f': 5
    };

    const lower = scheduleStr.toLowerCase();
    const timeMatch = lower.match(/(\d{1,2})(:(\d{2}))?\s*(am|pm)?/);
    if (!timeMatch) return [];

    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
    const isPM = lower.includes('pm');
    
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0; 

    const activeDays: number[] = [];
    Object.keys(daysMap).forEach(key => {
        if (lower.includes(key)) {
            if (key.length === 3) {
                if (!activeDays.includes(daysMap[key])) activeDays.push(daysMap[key]);
            }
        }
    });
    if (activeDays.length === 0) {
         Object.keys(daysMap).forEach(key => {
            if (key.length < 3 && lower.includes(key)) {
                 if (!activeDays.includes(daysMap[key])) activeDays.push(daysMap[key]);
            }
         });
    }

    activeDays.forEach(dayIndex => {
        const eventDate = new Date(startOfWeek);
        eventDate.setDate(startOfWeek.getDate() + dayIndex);
        eventDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(eventDate);
        endDate.setHours(hours + 1, minutes + 30);

        events.push({
            id: `course_${courseId}_${dayIndex}`,
            title: courseName,
            start: eventDate,
            end: endDate,
            type: 'Course',
            color: courseColor,
            meta: { courseId }
        });
    });

    return events;
};

export const generateTaskEvents = (tasks: Task[], startRange: Date, endRange: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const dayMilliseconds = 24 * 60 * 60 * 1000;

    tasks.forEach(task => {
        if (task.status === 'archived') return;

        const taskStart = new Date(task.startDate);
        const iterator = new Date(Math.max(startRange.getTime(), taskStart.getTime()));
        iterator.setHours(0,0,0,0);

        let h = 9, m = 0;
        if (task.time) {
            [h, m] = task.time.split(':').map(Number);
        }

        while (iterator <= endRange) {
            let shouldRender = false;
            
            switch(task.recurrence) {
                case 'daily': shouldRender = true; break;
                case 'weekly': shouldRender = iterator.getDay() === taskStart.getDay(); break;
                case 'monthly': shouldRender = iterator.getDate() === taskStart.getDate(); break;
                case 'yearly': shouldRender = iterator.getDate() === taskStart.getDate() && iterator.getMonth() === taskStart.getMonth(); break;
                case 'custom': if (task.customDays && task.customDays.includes(iterator.getDay())) shouldRender = true; break;
                case 'once': shouldRender = iterator.toDateString() === taskStart.toDateString(); break;
            }

            if (shouldRender) {
                const eventStart = new Date(iterator);
                eventStart.setHours(h, m);
                const eventEnd = new Date(eventStart);
                eventEnd.setMinutes(m + (task.durationMinutes || 30));

                const dateStr = iterator.toISOString().split('T')[0];
                const isCompleted = task.completionHistory.includes(dateStr);

                events.push({
                    id: `task_${task.id}_${dateStr}`,
                    title: task.title,
                    start: eventStart,
                    end: eventEnd,
                    type: 'Task',
                    color: task.color || '#64748b',
                    isCompleted: isCompleted,
                    meta: { taskId: task.id, dateKey: dateStr }
                });
            }
            iterator.setTime(iterator.getTime() + dayMilliseconds);
        }
    });

    return events;
};

export const getUnifiedEvents = (data: AppState, startRange: Date, endRange: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    data.assignments.forEach(a => {
        if (a.status === 'completed') return; 
        const dueDate = new Date(a.dueDate);
        
        if (dueDate >= startRange && dueDate <= endRange) {
            const startDate = new Date(dueDate);
            startDate.setHours(dueDate.getHours() - 1);

            const course = data.courses.find(c => c.id === a.courseId);

            events.push({
                id: `assign_${a.id}`,
                title: `DUE: ${a.title}`,
                start: startDate,
                end: dueDate,
                type: 'Assignment',
                color: a.type === 'Exam' ? '#f43f5e' : (course?.color || '#a855f7'),
                meta: { assignmentId: a.id, weight: a.weight }
            });
        }
    });

    data.courses.forEach(c => {
        if (c.schedule) {
            const courseEvents = parseCourseSchedule(c.schedule, c.name, c.color, c.id);
            events.push(...courseEvents);
        }
    });

    data.wellbeing.forEach(log => {
        const logDate = new Date(log.date);
        if (logDate >= startRange && logDate <= endRange) {
            log.activities.forEach((act, idx) => {
                if (act.time) {
                    const [h, m] = act.time.split(':').map(Number);
                    const date = new Date(log.date);
                    date.setHours(h, m);
                    const end = new Date(date);
                    end.setMinutes(m + (act.durationMinutes || 30));

                    events.push({
                        id: `wb_${log.id}_${idx}`,
                        title: act.name,
                        start: date,
                        end: end,
                        type: 'Wellbeing',
                        color: '#10b981', 
                        meta: { type: act.type }
                    });
                }
            });
        }
    });

    if (data.tasks) {
        const taskEvents = generateTaskEvents(data.tasks, startRange, endRange);
        events.push(...taskEvents);
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
};
