"use client";

import { Link } from "react-router-dom";
import { Workspace } from "./Dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalendarWidget } from "@/components/CalendarWidget";

interface ClientDashboardProps {
  workspaces: Workspace[];
}

const ClientDashboard = ({ workspaces }: ClientDashboardProps) => {
  return (
    <div className="space-y-8">
      <CalendarWidget />

      <div>
        <h2 className="text-2xl font-bold mb-4">Seus Projetos</h2>
        {workspaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {workspaces.map((ws) => (
              <Card key={ws.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-medium truncate">
                    {ws.name}
                  </CardTitle>
                </CardHeader>
                <Link to={`/workspace/${ws.id}`}>
                  <CardContent className="flex flex-col items-center justify-center pt-2">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage src={ws.logo_url || undefined} alt={ws.name} />
                      <AvatarFallback>{ws.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" className="w-full">
                      Acessar Projeto
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Você ainda não foi convidado para nenhum projeto.</p>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;