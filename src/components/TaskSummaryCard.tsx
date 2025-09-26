import React from "react"; // Importar React
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskSummaryCardProps {
  task: {
    id: string;
    title: string;
    workspace_id: string;
    workspace_name: string;
    column_title: string;
  };
}

export const TaskSummaryCard = React.memo(function TaskSummaryCard({ task }: TaskSummaryCardProps) {
  const needsEdit = task.column_title === "Editar";

  return (
    <Link to={`/workspace/${task.workspace_id}`}>
      <Card className={cn(
        "hover:shadow-md transition-shadow hover:border-primary",
        needsEdit && "border-yellow-500/50"
      )}>
        <CardContent className="p-4 flex justify-between items-center">
          <div>
            <p className="font-medium">{task.title}</p>
            <Badge variant="secondary" className="mt-2">{task.workspace_name}</Badge>
          </div>
          {needsEdit && (
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-semibold">Edição Solicitada</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});