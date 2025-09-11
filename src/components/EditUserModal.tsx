"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { Upload, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSave: (
    userId: string,
    updates: {
      email?: string;
      password?: string;
      full_name?: string;
      avatar_url?: string;
    }
  ) => Promise<void>;
}

export function EditUserModal({ isOpen, onClose, user, onSave }: EditUserModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFullName(user.full_name || "");
      setAvatarPreviewUrl(user.avatar_url);
      setPassword(""); // Always clear password field for security
    } else {
      setEmail("");
      setFullName("");
      setPassword("");
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
    }
  }, [user, isOpen]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setAvatarFile(file);
      setAvatarPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    let finalAvatarUrl = user.avatar_url;

    try {
      if (avatarFile) {
        const filePath = `avatars/${user.id}/${Date.now()}_${avatarFile.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Erro ao enviar avatar: ${uploadError.message}`);
        }
        const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(data.path);
        finalAvatarUrl = publicUrlData.publicUrl;
      }

      const updates: {
        email?: string;
        password?: string;
        full_name?: string;
        avatar_url?: string;
      } = {};

      if (email !== user.email) updates.email = email;
      if (password) updates.password = password; // Only update if password is provided
      if (fullName !== user.full_name) updates.full_name = fullName;
      if (finalAvatarUrl !== user.avatar_url) updates.avatar_url = finalAvatarUrl;

      await onSave(user.id, updates);
      showSuccess("Usuário atualizado com sucesso!");
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      showError(`Erro ao salvar usuário: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário: {user?.full_name || user?.email}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarPreviewUrl || undefined} />
              <AvatarFallback className="text-3xl">{fullName?.charAt(0) || user?.email?.charAt(0) || <User className="h-10 w-10" />}</AvatarFallback>
            </Avatar>
            <div className="flex-grow space-y-2">
              <Label htmlFor="avatar-upload">Foto de Perfil</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="avatar-display"
                  placeholder={avatarFile ? avatarFile.name : "Nenhum arquivo selecionado"}
                  readOnly
                  className="flex-grow"
                />
                <Button asChild variant="outline">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar
                    <Input
                      id="avatar-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleAvatarChange}
                      accept="image/*"
                    />
                  </Label>
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha (deixe em branco para não alterar)</Label>
            <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={isSaving}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}