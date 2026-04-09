import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas.');
}

export interface KanbanStatus { id:string; nome:string; ordem:number; cor_hex:string; }
export interface Cliente { id:string; nome:string; cpf_cnpj:string|null; email:string|null; telefone:string|null; whatsapp:string|null; cidade:string|null; estado:string|null; observacoes:string|null; created_at:string; }
export interface Fornecedor { id:string; nome:string; cnpj:string|null; contato:string|null; telefone:string|null; whatsapp:string|null; email:string|null; cidade:string|null; observacoes:string|null; created_at:string; }
export interface Insumo { id:string; nome:string; tipo:string; unidade_medida:string; custo_unitario:number; estoque_atual:number; estoque_minimo:number; gramatura:number|null; cor:string|null; referencia_interna:string|null; ativo:boolean; fornecedor_id:string|null; }
export interface Maquina { id:string; nome:string; tipo:string; valor_compra:number; vida_util_meses:number; custo_manutencao_anual:number; horas_uso_dia:number; dias_uteis_mes:number; ativo:boolean; }
export interface Produto { id:string; nome:string; descricao:string|null; categoria:string; markup_sugerido:number; custo_mao_obra_hora:number; imagem_url:string|null; ativo:boolean; created_at:string; }
export interface Pedido { id:string; codigo:string; cliente_id:string|null; cliente_nome_avulso:string|null; cliente_contato_avulso:string|null; status_id:string; valor_total:number; desconto:number; data_entrega:string|null; observacoes:string|null; arte_aprovada:boolean; pagamento_confirmado:boolean; created_at:string; kanban_status?:KanbanStatus; clientes?:Cliente; }
export interface ItemPedido { id:string; pedido_id:string; produto_id:string|null; quantidade:number; preco_unitario:number; custo_unitario:number; descricao_custom:string|null; }
export interface Compra { id:string; fornecedor_id:string|null; fornecedor_nome:string; data:string; nota_fiscal:string|null; total:number; status:string; itens:any[]; observacoes:string|null; created_at:string; }
export interface ContaReceber { id:string; pedido_id:string|null; cliente_nome:string; descricao:string; valor:number; data_vencimento:string|null; data_recebimento:string|null; status:string; created_at:string; }
export interface ContaPagar { id:string; compra_id:string|null; fornecedor_nome:string; descricao:string; valor:number; data_vencimento:string|null; data_pagamento:string|null; status:string; created_at:string; }

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
