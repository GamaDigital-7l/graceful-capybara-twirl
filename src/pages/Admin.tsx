"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const AdminPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateUser = async () => {
    if (!username || !password) {
      showError("Nome de usuário e senha são obrigatórios.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("create-user", {
        body: { username, password },
      });
      if (error) throw error;
      showSuccess(`Usuário "${username}" criado com sucesso!`);
      setUsername("");
      setPassword("");
    } catch (e: any) {
      showError(`Erro ao criar usuário: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
       <header className="mb-8">
        <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Link>
          </Button>
       </header>
      <main className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Administração</CardTitle>
            <CardDescription>Crie novas contas de usuário para sua equipe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de Usuário</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: joao.silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button onClick={handleCreateUser} disabled={isLoading} className="w-full">
              {isLoading ? "Criando..." : "Criar Usuário"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminPage;