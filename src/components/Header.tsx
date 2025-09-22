import { Link, useLocation } from "react-router-dom";
import { AppLogo } from "./AppLogo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Banknote, Brain, UserCog, Palette, Users, BookOpen, Menu, BarChart, FileText } from "lucide-react"; // Adicionado FileText para Briefings
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { showError } from "@/utils/toast";
import { MobileSidebar } from "./MobileSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "./ui/skeleton";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

interface HeaderProps {
  pageTitle?: string; // Optional prop for specific page titles
}

export function Header({ pageTitle }: HeaderProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      setProfileLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (profileError) throw profileError;
          setUserRole(profile?.role || null);
        } else {
          setUserRole(null);
        }
      } catch (error: any) {
        console.error("Error fetching user role:", error.message);
        showError(`Erro ao carregar perfil: ${error.message}`);
        setUserRole(null);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getPageTitle = () => {
    if (pageTitle) return pageTitle;
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/workspace/") && !path.includes("/playbook") && !path.includes("/instagram-insights")) return "Workspace"; // Atualizado
    if (path.includes("/playbook")) return "Playbook";
    if (path.includes("/instagram-insights")) return "Insights do Instagram"; // Novo
    if (path.startsWith("/admin")) return "Admin";
    if (path.startsWith("/settings")) return "Configurações";
    if (path.startsWith("/financial")) return "Financeiro";
    if (path.startsWith("/second-brain") && !path.includes("/second-brain/")) return "Segundo Cérebro";
    if (path.startsWith("/second-brain/")) return "Prompts do Cliente";
    if (path.startsWith("/employees") && !path.includes("/employees/")) return "Equipe";
    if (path.startsWith("/employees/")) return "Detalhes do Funcionário";
    if (path.startsWith("/agency-playbook")) return "Playbook da Agência";
    if (path.startsWith("/briefings/new")) return "Novo Formulário de Briefing";
    if (path.startsWith("/briefings/") && path.includes("/edit")) return "Editar Formulário de Briefing";
    if (path.startsWith("/briefings/") && path.includes("/responses")) return "Respostas do Briefing"; // Novo
    if (path.startsWith("/briefings")) return "Gerenciar Briefings";
    return "Gama Creative Flow";
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

  if (isProfileLoading) {
    return (
      <header className="p-4 bg-white dark:bg-gray-800 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-20" />
        </div>
      </header>
    );
  }

  return (
    <header className="p-4 bg-white dark:bg-gray-800 shadow-sm flex justify-between items-center">
      <div className="flex items-center gap-4">
        {isMobile && (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <MobileSidebar userRole={userRole} onClose={() => setIsMobileMenuOpen(false)} />
          </Sheet>
        )}
        <AppLogo className="h-8 w-auto" />
        <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">{getPageTitle()}</h1>
      </div>
      {!isMobile && (
        <nav className="flex items-center gap-2">
          {navItems.map((item) =>
            item.roles.includes(userRole || "") ? (
              <Button
                key={item.path}
                variant={location.pathname.startsWith(item.path) && item.path !== "/" ? "secondary" : (location.pathname === item.path ? "secondary" : "ghost")}
                asChild
              >
                <Link to={item.path}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            ) : null
          )}
          <ThemeToggle />
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </nav>
      )}
    </header>
  );
}