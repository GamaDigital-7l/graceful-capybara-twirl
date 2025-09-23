import { SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { AppLogo } from "./AppLogo";
import { ThemeToggle } from "./ThemeToggle";
import { LogOut, Home, Banknote, Brain, UserCog, Palette, Users, BookOpen, BarChart, FileText, LayoutTemplate, ListTodo } from "lucide-react"; // Adicionado ListTodo para tarefas pessoais
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Importar Accordion

interface MobileSidebarProps {
  userRole: string | null;
  onClose: () => void;
}

export function MobileSidebar({ userRole, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const navItems = [
    { name: "Dashboard", icon: Home, path: "/", roles: ["admin", "equipe", "user"] },
    { name: "Todoist", icon: ListTodo, path: "/personal-tasks", roles: ["admin", "equipe"] }, // Novo item
    { name: "Financeiro", icon: Banknote, path: "/financial", roles: ["admin"] },
    { name: "Segundo Cérebro", icon: Brain, path: "/second-brain", roles: ["admin", "equipe"] },
    { name: "Briefings", icon: FileText, path: "/briefings", roles: ["admin", "equipe"] },
    { name: "Playbook da Agência", icon: BookOpen, path: "/agency-playbook", roles: ["admin", "equipe"] },
  ];

  const settingsItems = [
    { name: "Gerenciar Usuários", icon: Users, path: "/admin", roles: ["admin"] },
    { name: "Visão Geral da Equipe", icon: Users, path: "/employees", roles: ["admin"] },
    { name: "Configurações do App", icon: Palette, path: "/settings", roles: ["admin", "equipe"] },
    { name: "Templates de Onboarding", icon: LayoutTemplate, path: "/onboarding-templates", roles: ["admin", "equipe"] }, // Novo item
  ];

  return (
    <SheetContent side="left" className="w-[250px] p-4 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <AppLogo className="h-8 w-auto" /> {/* Removed loading="lazy" */}
        <ThemeToggle />
      </div>
      <nav className="flex flex-col gap-2 flex-grow">
        {navItems.map((item) =>
          item.roles.includes(userRole || "") ? (
            <Button
              key={item.path}
              variant={location.pathname.startsWith(item.path) && item.path !== "/" ? "secondary" : (location.pathname === item.path ? "secondary" : "ghost")}
              className="justify-start w-full"
              asChild
              onClick={onClose}
            >
              <Link to={item.path}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            </Button>
          ) : null
        )}
        {(userRole === 'admin' || userRole === 'equipe') && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="settings">
              <AccordionTrigger className="flex items-center justify-between px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground rounded-md">
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Configurações
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-4">
                {settingsItems.map((item) =>
                  item.roles.includes(userRole || "") ? (
                    <Button
                      key={item.path}
                      variant={location.pathname.startsWith(item.path) ? "secondary" : "ghost"}
                      className="justify-start w-full pl-8"
                      asChild
                      onClick={onClose}
                    >
                      <Link to={item.path}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </Link>
                    </Button>
                  ) : null
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </nav>
      <Button onClick={handleLogout} variant="destructive" className="w-full mt-auto">
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </SheetContent>
  );
}