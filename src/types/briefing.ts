export type BriefingFieldType = "text" | "textarea" | "select" | "radio" | "checkbox";

export interface BriefingFieldOption {
  value: string;
  label: string;
}

export interface BriefingFormField {
  id: string;
  type: BriefingFieldType;
  label: string;
  placeholder?: string;
  options?: BriefingFieldOption[];
  required: boolean;
}

export interface BriefingForm {
  id: string;
  workspace_id: string | null; // Nullable for agency-wide forms
  title: string;
  description: string | null;
  form_structure?: BriefingFormField[]; // Tornando opcional
  created_by: string;
  created_at: string;
  is_active: boolean;
  response_count?: number; // Novo campo para a contagem de respostas
  workspace_name?: string; // Adicionado para exibir o nome do workspace
  display_mode?: 'all_questions' | 'typeform'; // Novo campo para o modo de exibição
}

export interface BriefingResponse {
  id: string;
  form_id: string;
  response_data: { [fieldId: string]: any }; // Stores answers as key-value pairs
  submitted_by_user_id: string | null; // Nullable for public submissions
  submitted_at: string;
  workspace_id: string | null; // Copied from form for easier filtering
  client_name: string | null; // If submitted publicly
}