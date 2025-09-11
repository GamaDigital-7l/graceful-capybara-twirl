"use client";

import { Link } from "react-router-dom";
import { Workspace } from "./Dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CalendarWidget } from "@/components/CalendarWidget";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"; // Importar DropdownMenu
import { MoreVertical, LayoutDashboard, BookOpen } from "lucide-react"; // Importar ícones

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
              <Card key={ws.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium truncate pr-2">
                    {ws.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/workspace/${ws.id}`} className="flex items-center">
                          <LayoutDashboard className="h-4 w-4 mr-2" /> Ver Quadro
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/workspace/${ws.id}/playbook`} className="flex items-center">
                          <BookOpen className="h-4 w-4 mr-2" /> Ver Playbook
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pt-2 flex-grow">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={ws.logo_url || undefined} alt={ws.name} />
                    <AvatarFallback>{ws.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Link to={`/workspace/${ws.id}`} className="w-full mt-auto">
                    <Button variant="outline" className="w-full">
                      Acessar Projeto
                    </Button>
                  </Link>
                </CardContent>
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