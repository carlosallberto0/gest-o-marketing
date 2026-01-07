"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { format, startOfDay } from "date-fns";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCalendarEvents, getEventsForDate, getDatesWithEvents, CalendarEventSeverity } from "@/hooks/useCalendarEvents";
import { CalendarEventsList } from "./CalendarEventsList";
import { CalendarLegend } from "./CalendarLegend";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminCalendarWidget() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  
  const { data: events = [], isLoading } = useCalendarEvents(currentMonth);
  
  const selectedDayEvents = React.useMemo(() => {
    return getEventsForDate(events, selectedDate);
  }, [events, selectedDate]);

  const datesWithEvents = React.useMemo(() => {
    return getDatesWithEvents(events);
  }, [events]);

  const getSeverityColor = (severity: CalendarEventSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-destructive';
      case 'warning': return 'bg-orange-500';
      case 'info': return 'bg-primary';
    }
  };

  // Modifiers for days with events
  const modifiers = React.useMemo(() => {
    const critical: Date[] = [];
    const warning: Date[] = [];
    const info: Date[] = [];
    
    datesWithEvents.forEach((severity, dateKey) => {
      const date = new Date(dateKey);
      switch (severity) {
        case 'critical': critical.push(date); break;
        case 'warning': warning.push(date); break;
        case 'info': info.push(date); break;
      }
    });
    
    return { eventCritical: critical, eventWarning: warning, eventInfo: info };
  }, [datesWithEvents]);

  const modifiersStyles = {
    eventCritical: { 
      position: 'relative' as const,
    },
    eventWarning: { 
      position: 'relative' as const,
    },
    eventInfo: { 
      position: 'relative' as const,
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="shadow-nazox border-border/50 h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Calendário de Demandas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[280px] w-full" />
              <Skeleton className="h-[100px] w-full" />
            </div>
          ) : (
            <>
              <style>{`
                .rdp-day_eventCritical::after,
                .rdp-day_eventWarning::after,
                .rdp-day_eventInfo::after {
                  content: '';
                  position: absolute;
                  bottom: 2px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                }
                .rdp-day_eventCritical::after {
                  background-color: hsl(var(--destructive));
                }
                .rdp-day_eventWarning::after {
                  background-color: rgb(249, 115, 22);
                }
                .rdp-day_eventInfo::after {
                  background-color: hsl(var(--primary));
                }
              `}</style>
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                onMonthChange={setCurrentMonth}
                locale={ptBR}
                showOutsideDays={false}
                className="w-full flex justify-center"
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                classNames={{
                  months: "flex flex-col",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "relative h-9 w-9 text-center text-sm p-0 focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 inline-flex items-center justify-center rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_hidden: "invisible",
                }}
              />
              
              <CalendarLegend />
              
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm text-foreground">
                    {format(selectedDate, "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </h4>
                  {selectedDayEvents.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedDayEvents.length} evento{selectedDayEvents.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                <ScrollArea className="h-[180px]">
                  <CalendarEventsList events={selectedDayEvents} />
                </ScrollArea>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}