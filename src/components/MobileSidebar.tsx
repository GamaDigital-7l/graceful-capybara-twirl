import { SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { AppLogo } from "./AppLogo";
import { ThemeToggle } from "./ThemeToggle";
import { LogOut, Home, Banknote, Brain, UserCog, Palette, Users, BookOpen, BarChart, FileText } from "lucide-react"; // Adicionado FileText para Briefings
import { supabase } from "@/integrations/supabase/client";

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
    { name: "Financeiro", icon: Banknote, path: "/financial", roles: ["admin"] },
    { name: "Segundo Cérebro", icon: Brain, path: "/second-brain", roles: ["admin", "equipe"] },
    { name: "Briefings", icon: FileText, path: "/briefings", roles: ["admin", "equipe"] }, // Novo item
    { name: "Admin", icon: UserCog, path: "/admin", roles: ["admin"] },
    { name: "Configurações", icon: Palette, path: "/settings", roles: ["admin"] },
    { name: "Equipe", icon: Users, path: "/employees", roles: ["admin"] },
    { name: "Playbook da Agência", icon: BookOpen, path: "/agency-playbook", roles: ["admin", "equipe"] },
  ];

  return (
    <SheetContent side="left" className="w-[250px] p-4 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <AppLogo className="h-8 w-auto" />
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
      </nav>
      <Button onClick={handleLogout} variant="destructive" className="w-full mt-auto">
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </SheetContent>
  );
}