"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Trash2, MoreVertical, FileText } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PersonalNoteModal, PersonalNote } from "./PersonalNoteModal";
import { formatSaoPauloDateTime } from "@/utils/date-utils";

const fetchPersonalNotes = async (userId: string): Promise<PersonalNote[]> => {
  const { data, error } = await supabase.from("personal_notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export function PersonalNotesTab() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<PersonalNote | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      setIsUserLoading(false);
    };
    getUserId();
  }, []);

  const { data: notes, isLoading: isLoadingNotes, error } = useQuery<PersonalNote[]>({
    queryKey: ["personalNotes", currentUserId],
    queryFn: () => fetchPersonalNotes(currentUserId!),
    enabled: !!currentUserId,
  });

  const saveNoteMutation = useMutation({
    mutationFn: async (note: Partial<PersonalNote>) => {
      if (!currentUserId) throw new Error("Usuário não autenticado.");
      const { id, ...rest } = note;
      const dataToSave = { ...rest, user_id: currentUserId };

      if (id) {
        const { error } = await supabase.from("personal_notes").update(dataToSave).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("personal_notes").insert(dataToSave);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalNotes", currentUserId] });
      showSuccess("Nota pessoal salva com sucesso!");
      setIsModalOpen(false);
    },
    onError: (e: Error) => showError(e.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("personal_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalNotes", currentUserId] });
      showSuccess("Nota pessoal deletada!");
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleSaveNote = async (note: Partial<PersonalNote>) => {
    await saveNoteMutation.mutateAsync(note);
  };

  const handleAddNote = () => {
    setSelectedNote(null);
    setIsModalOpen(true);
  };

  const handleEditNote = (note: PersonalNote) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNoteMutation.mutate(noteId);
  };

  if (isUserLoading || isLoadingNotes) {
    return (
      <div className="p-8 text-center">
        <Skeleton className="h-10 w-1/2 mx-auto mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md text-center mx-auto">
        <CardHeader><CardTitle className="text-destructive">Erro ao carregar notas</CardTitle></CardHeader>
        <CardContent><p>{error.message}</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleAddNote}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Adicionar Nota Pessoal
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Minhas Anotações</CardTitle>
          <CardDescription>Seu espaço pessoal para ideias, prompts e informações importantes.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {notes && notes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map((note) => (
                <Card key={note.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-medium flex-grow pr-2">{note.title}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditNote(note)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Nota
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar Nota
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar a nota "{note.title}"? Esta ação é irreversível.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteNote(note.id!)} className="bg-destructive hover:bg-destructive/90">
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex-grow p-4 pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-5">{note.content}</p>
                    {note.updated_at && (
                      <p className="text-xs text-muted-foreground mt-2">Última atualização: {formatSaoPauloDateTime(note.updated_at)}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma nota pessoal cadastrada ainda. Clique em "Adicionar Nota Pessoal" para começar.</p>
          )}
        </CardContent>
      </Card>
      <PersonalNoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNote}
        existingNote={selectedNote}
      />
    </div>
  );
}