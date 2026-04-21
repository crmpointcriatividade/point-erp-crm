import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Pedido, Cliente, Fornecedor, Insumo, KanbanStatus } from '../lib/supabase';

export function useKanbanStatus() {
  const [statuses, setStatuses] = useState<KanbanStatus[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('kanban_status').select('*').order('ordem')
      .then(({ data }) => { if (data) setStatuses(data); setLoading(false); });
  }, []);
  return { statuses, loading };
}

export function usePedidos(search = '') {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('pedidos').select('*, kanban_status(*), clientes(id,nome,whatsapp)').order('created_at', { ascending: false });
    if (search.trim()) q = q.or(`cliente_nome_avulso.ilike.%${search}%,codigo.ilike.%${search}%`);
    const { data } = await q;
    if (data) setPedidos(data as Pedido[]);
    setLoading(false);
  }, [search]);
  useEffect(() => { fetch(); }, [fetch]);

  const moverStatus = async (pedidoId: string, novoStatusId: string) => {
    await supabase.from('pedidos').update({ status_id: novoStatusId, updated_at: new Date().toISOString() }).eq('id', pedidoId);
    fetch();
  };

  const criarPedido = async (dados: { cliente_id?: string; cliente_nome_avulso?: string; cliente_contato_avulso?: string; status_id: string; data_entrega?: string; observacoes?: string; }) => {
    const { data, error } = await supabase.from('pedidos').insert(dados).select().single();
    if (!error) fetch();
    return { data, error };
  };

  const baixarEstoque = async (pedidoId: string) => supabase.rpc('baixar_estoque_pedido', { p_pedido_id: pedidoId });

  return { pedidos, loading, moverStatus, criarPedido, baixarEstoque, refetch: fetch };
}

export function useClientes(search = '') {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('clientes').select('*').order('nome');
    if (search.trim()) q = q.or(`nome.ilike.%${search}%,cpf_cnpj.ilike.%${search}%`);
    const { data } = await q;
    if (data) setClientes(data);
    setLoading(false);
  }, [search]);
  useEffect(() => { fetch(); }, [fetch]);
  const criarCliente = async (dados: Partial<Cliente>) => {
    const { data, error } = await supabase.from('clientes').insert(dados).select().single();
    if (!error) fetch();
    return { data, error };
  };
  return { clientes, loading, criarCliente, refetch: fetch };
}

export function useFornecedores(search = '') {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('fornecedores').select('*').order('nome');
    if (search.trim()) q = q.ilike('nome', `%${search}%`);
    const { data } = await q;
    if (data) setFornecedores(data);
    setLoading(false);
  }, [search]);
  useEffect(() => { fetch(); }, [fetch]);
  const criarFornecedor = async (dados: Partial<Fornecedor>) => {
    const { data, error } = await supabase.from('fornecedores').insert(dados).select().single();
    if (!error) fetch();
    return { data, error };
  };
  return { fornecedores, loading, criarFornecedor, refetch: fetch };
}

export function useInsumos(search = '') {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('insumos').select('*').eq('ativo', true).order('nome');
    if (search.trim()) q = q.ilike('nome', `%${search}%`);
    const { data } = await q;
    if (data) setInsumos(data);
    setLoading(false);
  }, [search]);
  useEffect(() => { fetch(); }, [fetch]);
  const insumosAbaixoMinimo = insumos.filter(i => i.estoque_atual <= i.estoque_minimo);
  return { insumos, insumosAbaixoMinimo, loading, refetch: fetch };
}
