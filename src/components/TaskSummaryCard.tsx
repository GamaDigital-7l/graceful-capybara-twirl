import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, User, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface TaskSummaryCardProps {
  task: {
    id: string;
    title: string;
    workspace_id: string;
    workspace_name: string;
    workspace_logo_url: string | null;
    column_title: string;
    assigned_to_name: string | null;
    assigned_to_avatar: string | null;
  };
}

export function TaskSummaryCard({ task }: TaskSummaryCardProps) {
  const needsEdit = task.column_title === "Editar";
  const isForApproval = task.column_title === "Para aprovação";
  const isProduction = task.column_title === "Em Produção";
  const isRequests = task.column_title === "Solicitações";

  let statusBadgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let statusBadgeText = task.column_title;

  if (needsEdit) {
    statusBadgeVariant = "destructive"; // Usando destructive para "Editar"
    statusBadgeText = "Edição Solicitada";
  } else if (isForApproval) {
    statusBadgeVariant = "default"; // Usando default para "Para aprovação"
    statusBadgeText = "Para Aprovação";
  } else if (isProduction) {
    statusBadgeVariant = "outline"; // Usando outline para "Em Produção"
    statusBadgeText = "Em Produção";
  } else if (isRequests) {
    statusBadgeVariant = "outline"; // Usando outline para "Solicitações"
    statusBadgeText = "Solicitações";
  }


  return (
    <Link to={`/workspace/${task.workspace_id}`}>
      <Card className={cn(
        "hover:shadow-md transition-shadow hover:border-primary",
        needsEdit && "border-yellow-500/50" // Mantém a borda amarela para edição
      )}>
        <CardContent className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-medium text-lg">{task.title}</p>
            <Badge variant={statusBadgeVariant}>{statusBadgeText}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {task.workspace_logo_url ? (
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.workspace_logo_url} alt={task.workspace_name} loading="lazy" />
                <AvatarFallback className="text-xs">{task.workspace_name.charAt(0)}</AvatarFallback>
              </Avatar>
            ) : (
              <Briefcase className="h-4 w-4" />
            )}
            <span>{task.workspace_name}</span>
          </div>
          {task.assigned_to_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {task.assigned_to_avatar ? (
                <Avatar className="h-5 w-5">
                  <AvatarImage src={task.assigned_to_avatar} alt={task.assigned_to_name} loading="lazy" />
                  <AvatarFallback className="text-xs">{task.assigned_to_name.charAt(0)}</AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-4 w-4" />
              )}
              <span>{task.assigned_to_name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}