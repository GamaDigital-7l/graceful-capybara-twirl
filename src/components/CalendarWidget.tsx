"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "./ui/badge";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const fetchUserTasks = async () => {
  const { data, error } = await supabase.rpc("get_user_tasks");
  if (error) throw new Error(error.message);
  return data || [];
};

export function CalendarWidget() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["user_tasks_for_calendar"],
    queryFn: fetchUserTasks,
  });

  const daysWithTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((task) => !!task.due_date)
      .map((task) => new Date(task.due_date));
  }, [tasks]);

  const tasksForSelectedDay = useMemo(() => {
    if (!date || !tasks) return [];
    return tasks.filter(
      (task) => task.due_date && isSameDay(new Date(task.due_date), date)
    );
  }, [date, tasks]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário de Entregas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col lg:flex-row gap-6">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
          locale={ptBR}
          modifiers={{
            due: daysWithTasks,
          }}
          modifiersStyles={{
            due: {
              color: "hsl(var(--primary-foreground))",
              backgroundColor: "hsl(var(--primary))",
            },
          }}
        />
        <div className="flex-1">
          <h4 className="font-semibold mb-2">
            Tarefas para {date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : "..."}
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tasksForSelectedDay.length > 0 ? (
              tasksForSelectedDay.map((task) => (
                <Link to={`/workspace/${task.workspace_id}`} key={task.id}>
                    <div className="p-2 border rounded-md hover:bg-accent">
                        <p className="font-medium text-sm">{task.title}</p>
                        <Badge variant="secondary" className="mt-1">{task.workspace_name}</Badge>
                    </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma entrega para este dia.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}