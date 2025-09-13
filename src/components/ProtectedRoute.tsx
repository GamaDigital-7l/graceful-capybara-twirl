import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("ProtectedRoute: Error getting session:", error.message);
      }
      setSession(session);
      setLoading(false); // Garante que o loading é false após a tentativa de obter a sessão
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("ProtectedRoute: Auth state changed, event:", _event, "session:", session);
      setSession(session);
      if (_event === "SIGNED_OUT") {
        navigate("/login");
      }
      // Não definimos setLoading(false) aqui, pois getSession já faz isso na montagem inicial
      // e o redirecionamento para /login lida com o estado de não autenticado.
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!loading && !session) {
      console.log("ProtectedRoute: Not loading and no session, navigating to /login");
      navigate("/login");
    }
  }, [session, loading, navigate]);

  if (loading) {
    console.log("ProtectedRoute: Still loading...");
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (!session) {
    console.log("ProtectedRoute: No session, returning null (will be redirected by useEffect)");
    return null; // O useEffect acima já cuida do redirecionamento
  }

  console.log("ProtectedRoute: Session exists, rendering children.");
  return <>{children}</>;
};

export default ProtectedRoute;