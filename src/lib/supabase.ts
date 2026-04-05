import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas.\n' +
    'Copie o arquivo .env.example para .env e preencha com suas credenciais do Supabase.'
  );
}

// ============================================================
// Tipos do banco de dados
// ============================================================

export interface KanbanStatus {
  id: string;
  nome: string;
  ordem: number;
  cor_hex: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface Insumo {
  id: string;
  nome: string;
  tipo: 'papel' | 'tinta' | 'fita' | 'cola' | 'vinil' | 'embalagem' | 'outro';
  unidade_medida: 'folha' | 'ml' | 'metro' | 'unidade' | 'kg' | 'litro';
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
  gramatura: number | null;
  cor: string | null;
  referencia_interna: string | null;
  ativo: boolean;
  fornecedor_id: string | null;
}

export interface Maquina {
  id: string;
  nome: string;
  tipo: 'plotter' | 'impressora' | 'guilhotina' | 'laminadora' | 'outro';
  valor_compra: number;
  vida_util_meses: number;
  custo_manutencao_anual: number;
  horas_uso_dia: number;
  dias_uteis_mes: number;
  ativo: boolean;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  markup_sugerido: number;
  custo_mao_obra_hora: number;
  ativo: boolean;
  created_at: string;
}

export interface Pedido {
  id: string;
  codigo: string;
  cliente_id: string | null;
  cliente_nome_avulso: string | null;
  cliente_contato_avulso: string | null;
  status_id: string;
  valor_total: number;
  desconto: number;
  data_entrega: string | null;
  observacoes: string | null;
  arte_aprovada: boolean;
  pagamento_confirmado: boolean;
  created_at: string;
  // Joins
  kanban_status?: KanbanStatus;
  clientes?: Cliente;
}

export interface ItemPedido {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  custo_unitario: number;
  descricao_custom: string | null;
  produtos?: Produto;
}

// ============================================================
// Cliente Supabase
// ============================================================
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
