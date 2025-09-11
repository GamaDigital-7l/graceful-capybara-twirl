"use client";

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Edit, Send, Eye } from "lucide-react";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { AppLogo } from "@/components/AppLogo"; // Importar AppLogo

const fetchApprovalData = async (token: string) => {
  const { data, error } = await supabase.functions.invoke("get-tasks-for-approval", {
    body: { token },
  });
  if (error) throw new Error(error.message);
  return data;
};

const PublicApprovalPage = () => {
  const { token } = useParams<{ token: string }>();
  const [processedTasks, setProcessedTasks] = useState<Set<string>>(new Set());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [editComment, setEditComment] = useState("");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["approvalData", token],
    queryFn: () => fetchApprovalData(token!),
    enabled: !!token,
    retry: false,
  });

  const processApprovalMutation = useMutation({
    mutationFn: async ({ taskId, action, comment }: { taskId: string, action: 'approve' | 'edit', comment?: string }) => {
      const { error } = await supabase.functions.invoke("process-public-approval", {
        body: { token, taskId, action, comment },
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      if (variables.action === 'approve') {
        showSuccess(`Tarefa aprovada!`);
      } else {
        showSuccess("Sua solicitação de edição foi enviada com sucesso! Nossa equipe fará as alterações necessárias e entraremos em contato em breve com a versão atualizada. Agradecemos a sua paciência!");
      }
      setProcessedTasks(prev => new Set(prev).add(variables.taskId));
      if (variables.action === 'edit') {
        setIsEditModalOpen(false);
        setEditComment("");
      }
    },
    onError: (e: Error) => showError(e.message),
  });

  const handleEditRequest = (task: any) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleConfirmEdit = () => {
    if (selectedTask && editComment.trim()) {
      processApprovalMutation.mutate({ taskId: selectedTask.id, action: 'edit', comment: editComment });
    } else {
      showError("Por favor, adicione um comentário de edição.");
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
    setIsPreviewModalOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen p-4"><Skeleton className="h-64 w-full max-w-md" /></div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle className="text-destructive">Erro</CardTitle></CardHeader>
          <CardContent><p>{error.message}</p></CardContent>
        </Card>
      </div>
    );
  }

  const allTasksProcessed = data?.tasks.every((task: any) => processedTasks.has(task.id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <header className="text-center mb-8">
        <div className="mb-4">
          <AppLogo className="h-12 w-auto mx-auto" /> {/* Usando AppLogo aqui */}
        </div>
        <div className="flex justify-center items-center gap-4 mb-2">
          {data.workspace.logo_url && <Avatar><AvatarImage src={data.workspace.logo_url} /><AvatarFallback>{data.workspace.name.charAt(0)}</AvatarFallback></Avatar>}
          <h1 className="text-3xl font-bold">{data.workspace.name}</h1>
        </div>
        <p className="text-muted-foreground">Revise e aprove os posts abaixo.</p>
      </header>
      <main className="max-w-4xl mx-auto space-y-6">
        {allTasksProcessed ? (
          <Card className="text-center p-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle>Tudo pronto!</CardTitle>
            <CardDescription>Todas as tarefas foram revisadas. Agradecemos a sua colaboração!</CardDescription>
          </Card>
        ) : data.tasks.map((task: any) => (
          <Card key={task.id} className={processedTasks.has(task.id) ? "opacity-50" : ""}>
            <CardHeader>
              <CardTitle>{task.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.attachments?.[0]?.url && (
                <AspectRatio ratio={1 / 1} className="bg-muted rounded-md group relative">
                  <img src={task.attachments[0].url} alt={task.title} className="rounded-md object-cover w-full h-full" />
                  <div 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => handleImageClick(task.attachments[0].url)}
                  >
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                </AspectRatio>
              )}
              {task.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>}
            </CardContent>
            <CardFooter className="flex gap-4">
              {processedTasks.has(task.id) ? (
                <p className="text-sm font-medium text-green-600">Tarefa já revisada.</p>
              ) : (
                <>
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => processApprovalMutation.mutate({ taskId: task.id, action: 'approve' })}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Aprovar
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => handleEditRequest(task)}>
                    <Edit className="h-4 w-4 mr-2" /> Solicitar Edição
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        ))}
      </main>
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Edição para: {selectedTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="edit-comment">O que precisa ser alterado?</Label>
            <Textarea id="edit-comment" value={editComment} onChange={(e) => setEditComment(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
            <Button onClick={handleConfirmEdit} disabled={!editComment.trim()}>
              <Send className="h-4 w-4 mr-2" /> Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ImagePreviewModal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)} 
        imageUrl={previewImageUrl} 
      />
    </div>
  );
};

export default PublicApprovalPage;