export type Perfil = "admin_ti" | "diretoria" | "controladoria" | "setor";

export type StatusNC =
  | "rascunho"
  | "enviado_controladoria"
  | "aguardando_triagem"
  | "devolvido_complementacao"
  | "em_analise"
  | "aguardando_plano_acao"
  | "plano_acao_execucao"
  | "aguardando_verificacao_eficacia"
  | "encerrado"
  | "reaberto";

export type Criticidade = "baixa" | "media" | "alta";

export type StatusAcao =
  | "pendente"
  | "em_andamento"
  | "concluida"
  | "atrasada"
  | "cancelada";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  setor_id: string | null;
  cargo: string | null;
  perfil: Perfil;
  ativo: boolean;
}

export interface Setor {
  id: string;
  nome: string;
  ativo: boolean;
}

// Acesso total: pode criar NC de qualquer setor, editar em qualquer status
// permitido, e preencher as etapas E-I (Controladoria).
export function temAcessoTotal(perfil: Perfil) {
  return perfil === "admin_ti" || perfil === "diretoria" || perfil === "controladoria";
}

export function podeEditarEtapasControladoria(perfil: Perfil) {
  return perfil === "admin_ti" || perfil === "diretoria" || perfil === "controladoria";
}

export const STATUS_LABEL: Record<StatusNC, string> = {
  rascunho: "Rascunho",
  enviado_controladoria: "Enviado para a Controladoria",
  aguardando_triagem: "Aguardando triagem",
  devolvido_complementacao: "Devolvido para complementação",
  em_analise: "Em análise",
  aguardando_plano_acao: "Aguardando plano de ação",
  plano_acao_execucao: "Plano de ação em execução",
  aguardando_verificacao_eficacia: "Aguardando verificação de eficácia",
  encerrado: "Encerrado",
  reaberto: "Reaberto",
};

export const CRITICIDADE_LABEL: Record<Criticidade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};
