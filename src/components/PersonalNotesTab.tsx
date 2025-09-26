"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react"; // Adicionado useCallback
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Trash2, MoreVertical, FileText, Search } from "lucide-react"; // Adicionado Search
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PersonalNoteModal, PersonalNote } from "./PersonalNoteModal";
import { formatSaoPauloDateTime } from "@/utils/date-utils";
import { Input } from "@/components/ui/input"; // Importado Input
import { PersonalNoteViewModal } from "./PersonalNoteViewModal"; // Importar o novo modal de visualização

const fetchPersonalNotes = async (userId: string): Promise<PersonalNote[]> => {
  const { data, error } = await supabase.from("personal_notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const NoteCard = React.memo(({ note, onEdit, onDelete, onView }: {
  note: PersonalNote;
  onEdit: (note: PersonalNote) => void;
  onDelete: (noteId: string) => void;
  onView: (note: PersonalNote) => void;
}) => {
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(note);
  }, [onEdit, note]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id!);
  }, [onDelete, note.id]);

  const handleViewClick = useCallback(() => onView(note), [onView, note]);

  return (
    <Card key={note.id} className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow" onClick={handleViewClick}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium flex-grow pr-2">{note.title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Nota
            </DropdownMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
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
                  <AlertDialogAction onClick={handleDeleteClick} className="bg-destructive hover:bg-destructive/90">
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
  );
});

export function PersonalNotesTab() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<PersonalNote | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // Novo estado para o termo de pesquisa
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // Estado para o modal de visualização
  const [viewingNote, setViewingNote] = useState<PersonalNote | null>(null); // Estado para a nota sendo visualizada

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

  const handleSaveNote = useCallback(async (note: Partial<PersonalNote>) => {
    await saveNoteMutation.mutateAsync(note);
  }, [saveNoteMutation]);

  const handleAddNote = useCallback(() => {
    setSelectedNote(null);
    setIsModalOpen(true);
  }, []);

  const handleEditNote = useCallback((note: PersonalNote) => {
    setSelectedNote(note);
    setIsModalOpen(true);
  }, []);

  const handleDeleteNote = useCallback((noteId: string) => {
    deleteNoteMutation.mutate(noteId);
  }, [deleteNoteMutation]);

  const handleViewNote = useCallback((note: PersonalNote) => {
    setViewingNote(note);
    setIsViewModalOpen(true);
  }, []);

  // Filtrar notas com base no termo de pesquisa
  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    if (!searchTerm) return notes;

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return notes.filter(note =>
      note.title.toLowerCase().includes(lowerCaseSearchTerm) ||
      note.content.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [notes, searchTerm]);

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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4"> {/* Ajustado para responsividade */}
        <div className="relative w-full sm:w-auto flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Pesquisar notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <Button onClick={handleAddNote} className="w-full sm:w-auto"> {/* Ajustado para responsividade */}
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
          {filteredNotes && filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={handleEditNote}
                  onDelete={handleDeleteNote}
                  onView={handleViewNote}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma nota pessoal encontrada. {searchTerm && `Para o termo "${searchTerm}".`}</p>
          )}
        </CardContent>
      </Card>
      <PersonalNoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={saveNoteMutation.mutate}
        existingNote={selectedNote}
      />
      <PersonalNoteViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        note={viewingNote}
      />
    </div>
  );
}