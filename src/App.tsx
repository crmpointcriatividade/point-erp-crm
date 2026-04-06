import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, Users, Settings, Plus, Search,
  Printer, Clock, CheckCircle2, AlertCircle, FileText,
  ShoppingCart, Truck, MessageSquare, Building2, X,
  ArrowRight, AlertTriangle, RefreshCw, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { generateBudgetPDF } from './lib/pdfGenerator';
import { useKanbanStatus, usePedidos, useClientes, useFornecedores, useInsumos } from './hooks/useSupabase';
import { supabase } from './lib/supabase';
import type { Pedido, Cliente, Produto } from './lib/supabase';

const STATUS_COLORS: Record<string, string> = {
  Lead:       'bg-slate-100 border-slate-200 text-slate-600',
  Orçamento:  'bg-amber-50 border-amber-200 text-amber-700',
  Aprovação:  'bg-blue-50 border-blue-200 text-blue-700',
  Produção:   'bg-rose-50 border-rose-200 text-rose-700',
  Finalizado: 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

type ModalType = 'pedido' | 'cliente' | 'fornecedor' | 'compra' | null;

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [activeTab, setActiveTab] = useState('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState<ModalType>(null);

  const headerButton = () => {
    if (activeTab === 'clientes')     return { label: 'Novo Cliente',     action: () => setModal('cliente') };
    if (activeTab === 'fornecedores') return { label: 'Novo Fornecedor',  action: () => setModal('fornecedor') };
    if (activeTab === 'compras')      return { label: 'Nova Compra',      action: () => setModal('compra') };
    return { label: 'Novo Orçamento', action: () => setModal('pedido') };
  };

  const btn = headerButton();

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-black text-indigo-600 flex items-center gap-2">
            <Printer size={28} strokeWidth={3} />POINT
          </h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.2em] font-bold">Gestão de Gráfica</p>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <NavItem active={activeTab==='kanban'}       onClick={()=>setActiveTab('kanban')}       icon={<LayoutDashboard size={20}/>} label="CRM / Kanban"/>
          <NavItem active={activeTab==='insumos'}      onClick={()=>setActiveTab('insumos')}      icon={<Package size={20}/>}         label="Insumos & Estoque"/>
          <NavItem active={activeTab==='clientes'}     onClick={()=>setActiveTab('clientes')}     icon={<Users size={20}/>}           label="Clientes"/>
          <NavItem active={activeTab==='fornecedores'} onClick={()=>setActiveTab('fornecedores')} icon={<Building2 size={20}/>}       label="Fornecedores"/>
          <NavItem active={activeTab==='vendas'}       onClick={()=>setActiveTab('vendas')}       icon={<ShoppingCart size={20}/>}    label="Vendas"/>
          <NavItem active={activeTab==='compras'}      onClick={()=>setActiveTab('compras')}      icon={<Truck size={20}/>}           label="Compras"/>
          <NavItem active={activeTab==='config'}       onClick={()=>setActiveTab('config')}       icon={<Settings size={20}/>}        label="Configurações"/>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">P</div>
            <div>
              <p className="text-sm font-bold">Point Admin</p>
              <p className="text-[10px] text-emerald-500 font-bold uppercase">Online</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input type="text" placeholder="Buscar cliente, código, produto..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-sm transition-all outline-none border"
              value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)}/>
          </div>
          <button onClick={btn.action}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95">
            <Plus size={18} strokeWidth={3}/>{btn.label}
          </button>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.18}}>
              {activeTab==='kanban'       && <KanbanView      searchQuery={searchQuery} onNovoPedido={()=>setModal('pedido')}/>}
              {activeTab==='insumos'      && <InsumosView     searchQuery={searchQuery}/>}
              {activeTab==='clientes'     && <ClientesView    searchQuery={searchQuery} onAdd={()=>setModal('cliente')}/>}
              {activeTab==='fornecedores' && <FornecedoresView searchQuery={searchQuery} onAdd={()=>setModal('fornecedor')}/>}
              {activeTab==='vendas'       && <PlaceholderView title="Vendas"        icon={<ShoppingCart size={48}/>}/>}
              {activeTab==='compras'      && <ComprasView     searchQuery={searchQuery} onAdd={()=>setModal('compra')}/>}
              {activeTab==='config'       && <PlaceholderView title="Configurações" icon={<Settings size={48}/>}/>}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {modal==='pedido'     && <ModalNovoPedido     onClose={()=>setModal(null)}/>}
        {modal==='cliente'    && <ModalNovoCliente    onClose={()=>setModal(null)}/>}
        {modal==='fornecedor' && <ModalNovoFornecedor onClose={()=>setModal(null)}/>}
        {modal==='compra'     && <ModalNovaCompra     onClose={()=>setModal(null)}/>}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// NAV ITEM
// ============================================================
function NavItem({active,icon,label,onClick}:{active:boolean;icon:React.ReactNode;label:string;onClick:()=>void}) {
  return (
    <button onClick={onClick} className={cn(
      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all',
      active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
    )}>{icon}{label}</button>
  );
}

// ============================================================
// TOAST — notificação de sucesso
// ============================================================
function Toast({message,onClose}:{message:string;onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[onClose]);
  return (
    <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}}
      className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm">
      <CheckCircle2 size={20}/>{message}
    </motion.div>
  );
}

// ============================================================
// KANBAN VIEW
// ============================================================
function KanbanView({searchQuery,onNovoPedido}:{searchQuery:string;onNovoPedido:()=>void}) {
  const {statuses,loading:ls} = useKanbanStatus();
  const {pedidos,loading:lp,moverStatus,baixarEstoque,refetch} = usePedidos(searchQuery);
  const [movendo,setMovendo] = useState<string|null>(null);

  const handleGeneratePDF = (pedido:Pedido) => generateBudgetPDF(pedido,[]);

  const handleMoverStatus = async (pedido:Pedido, statusNome:string) => {
    const novoStatus = statuses.find(s=>s.nome===statusNome);
    if(!novoStatus||pedido.status_id===novoStatus.id) return;
    setMovendo(pedido.id);
    if(statusNome==='Produção') {
      const {data:res} = await baixarEstoque(pedido.id);
      if(res&&!res.sucesso) {
        const faltando = res.erros.map((e:any)=>`${e.insumo} (falta ${(e.necessario-e.disponivel).toFixed(2)})`).join('\n');
        alert(`⚠️ Estoque insuficiente:\n${faltando}`);
        setMovendo(null);return;
      }
    }
    await moverStatus(pedido.id,novoStatus.id);
    setMovendo(null);
  };

  const handleWhatsApp = (pedido:Pedido) => {
    const contato = pedido.clientes?.whatsapp||pedido.cliente_contato_avulso||'';
    const numero = contato.replace(/\D/g,'');
    const msg = encodeURIComponent(`Olá! Seu orçamento *#${pedido.codigo}* está pronto. Total: R$ ${Number(pedido.valor_total).toFixed(2)}. Podemos confirmar?`);
    if(numero) window.open(`https://wa.me/55${numero}?text=${msg}`,'_blank');
  };

  if(ls||lp) return <LoadingSpinner label="Carregando Kanban..."/>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900">CRM / Kanban</h2>
          <p className="text-slate-500 font-medium">{pedidos.length} pedido{pedidos.length!==1?'s':''} no pipeline</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refetch} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Atualizar"><RefreshCw size={18}/></button>
          <button onClick={onNovoPedido} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"><Plus size={18} strokeWidth={3}/>Novo Orçamento</button>
        </div>
      </div>
      <div className="flex gap-5 h-[calc(100vh-220px)] overflow-x-auto pb-4">
        {statuses.map(status=>{
          const colPedidos = pedidos.filter(p=>p.status_id===status.id);
          const colorClass = STATUS_COLORS[status.nome]||'bg-slate-100 border-slate-200 text-slate-600';
          const nextStatus = statuses.find(s=>s.ordem===status.ordem+1);
          return (
            <div key={status.id} className="w-80 flex-shrink-0 flex flex-col">
              <div className={cn('flex items-center justify-between p-4 rounded-t-2xl border-b-2',colorClass)}>
                <h3 className="font-black text-xs uppercase tracking-widest">{status.nome}</h3>
                <span className="text-[10px] font-black bg-white/60 px-2 py-0.5 rounded-full">{colPedidos.length}</span>
              </div>
              <div className="flex-1 bg-slate-100/40 p-3 space-y-3 rounded-b-2xl border border-slate-200 border-t-0 overflow-y-auto">
                {colPedidos.length===0&&<p className="text-center text-slate-300 text-xs py-8 font-medium">Nenhum pedido aqui</p>}
                {colPedidos.map(pedido=>{
                  const clienteNome = pedido.clientes?.nome||pedido.cliente_nome_avulso||'Cliente';
                  const isMovendo = movendo===pedido.id;
                  return (
                    <motion.div key={pedido.id} layout className={cn('bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 transition-all group',isMovendo&&'opacity-50 pointer-events-none')}>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-black text-slate-300 uppercase">#{pedido.codigo}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={()=>handleGeneratePDF(pedido)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Gerar PDF"><FileText size={14}/></button>
                          <button onClick={()=>handleWhatsApp(pedido)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="WhatsApp"><MessageSquare size={14}/></button>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-800 leading-tight mb-1">{clienteNome}</h4>
                      {pedido.data_entrega&&<p className="text-xs text-slate-400 flex items-center gap-1 mb-3"><Clock size={11}/>Entrega: {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}</p>}
                      <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                        <span className="text-sm font-black text-indigo-600">R$ {Number(pedido.valor_total).toFixed(2)}</span>
                        {nextStatus&&<button onClick={()=>handleMoverStatus(pedido,nextStatus.nome)} disabled={isMovendo} className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all uppercase tracking-wide">{nextStatus.nome}<ArrowRight size={10}/></button>}
                        {status.nome==='Finalizado'&&<CheckCircle2 size={16} className="text-emerald-500"/>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// INSUMOS VIEW
// ============================================================
function InsumosView({searchQuery}:{searchQuery:string}) {
  const {insumos,insumosAbaixoMinimo,loading} = useInsumos(searchQuery);
  if(loading) return <LoadingSpinner label="Carregando insumos..."/>;
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Insumos & Estoque</h2>
          <p className="text-slate-500 font-medium">{insumos.length} insumos cadastrados{insumosAbaixoMinimo.length>0&&<span className="ml-2 text-rose-600 font-bold">• {insumosAbaixoMinimo.length} abaixo do mínimo!</span>}</p>
        </div>
      </div>
      {insumosAbaixoMinimo.length>0&&(
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-rose-500 mt-0.5 shrink-0"/>
          <div><p className="font-bold text-rose-700 text-sm">Alerta de Estoque Baixo</p><p className="text-rose-600 text-sm mt-1">{insumosAbaixoMinimo.map(i=>i.nome).join(', ')}</p></div>
        </div>
      )}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Insumo','Tipo','Unidade','Custo Unit.','Estoque Atual','Mínimo','Status'].map(h=>(
                <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {insumos.length===0&&<tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">Nenhum insumo cadastrado. Execute o script SQL para adicionar os exemplos.</td></tr>}
            {insumos.map(insumo=>{
              const baixo = insumo.estoque_atual<=insumo.estoque_minimo;
              return (
                <tr key={insumo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{insumo.nome}</td>
                  <td className="px-6 py-4"><span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{insumo.tipo}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-500">{insumo.unidade_medida}</td>
                  <td className="px-6 py-4 font-bold text-slate-700">R$ {Number(insumo.custo_unitario).toFixed(4)}</td>
                  <td className={cn('px-6 py-4 font-black',baixo?'text-rose-600':'text-slate-700')}>{Number(insumo.estoque_atual).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{Number(insumo.estoque_minimo).toFixed(2)}</td>
                  <td className="px-6 py-4">{baixo?<span className="flex items-center gap-1 text-rose-600 text-xs font-bold"><AlertCircle size={14}/>Repor</span>:<span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 size={14}/>OK</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// CLIENTES VIEW
// ============================================================
function ClientesView({searchQuery,onAdd}:{searchQuery:string;onAdd:()=>void}) {
  const {clientes,loading} = useClientes(searchQuery);
  if(loading) return <LoadingSpinner label="Carregando clientes..."/>;
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Clientes</h2>
          <p className="text-slate-500 font-medium">{clientes.length} clientes cadastrados</p>
        </div>
        <button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"><Plus size={18} strokeWidth={3}/>Novo Cliente</button>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Cliente','CPF/CNPJ','Cidade','WhatsApp','Ações'].map(h=>(
                <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.length===0&&<tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium">Nenhum cliente cadastrado ainda. Clique em "Novo Cliente".</td></tr>}
            {clientes.map(c=>(
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">{c.nome.charAt(0).toUpperCase()}</div>
                    {c.nome}
                  </div>
                </td>
                <td className="px-8 py-5 text-sm text-slate-500">{c.cpf_cnpj||'—'}</td>
                <td className="px-8 py-5 text-sm text-slate-500">{c.cidade||'—'}</td>
                <td className="px-8 py-5">
                  {c.whatsapp?<a href={`https://wa.me/55${c.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline"><MessageSquare size={14}/>{c.whatsapp}</a>:<span className="text-slate-300 text-sm">—</span>}
                </td>
                <td className="px-8 py-5"><button className="text-indigo-600 font-bold text-sm hover:underline">Ver Perfil</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// FORNECEDORES VIEW
// ============================================================
function FornecedoresView({searchQuery,onAdd}:{searchQuery:string;onAdd:()=>void}) {
  const {fornecedores,loading} = useFornecedores(searchQuery);
  if(loading) return <LoadingSpinner label="Carregando fornecedores..."/>;
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Fornecedores</h2>
          <p className="text-slate-500 font-medium">{fornecedores.length} fornecedores cadastrados</p>
        </div>
        <button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"><Plus size={18} strokeWidth={3}/>Novo Fornecedor</button>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Fornecedor','CNPJ','Contato','WhatsApp','Ações'].map(h=>(
                <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fornecedores.length===0&&<tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium">Nenhum fornecedor cadastrado ainda.</td></tr>}
            {fornecedores.map(f=>(
              <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-800">{f.nome}</td>
                <td className="px-8 py-5 text-sm text-slate-500">{f.cnpj||'—'}</td>
                <td className="px-8 py-5 text-sm text-slate-500">{f.contato||'—'}</td>
                <td className="px-8 py-5">
                  {f.whatsapp?<a href={`https://wa.me/55${f.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline"><MessageSquare size={14}/>{f.whatsapp}</a>:<span className="text-slate-300 text-sm">—</span>}
                </td>
                <td className="px-8 py-5"><button className="text-indigo-600 font-bold text-sm hover:underline">Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// COMPRAS VIEW — própria, separada de orçamentos
// ============================================================
interface ItemCompra { id: string; descricao: string; quantidade: number; valor_unitario: number; }
interface Compra { id: string; fornecedor_nome: string; data: string; status: string; total: number; itens: ItemCompra[]; }

function ComprasView({searchQuery,onAdd}:{searchQuery:string;onAdd:()=>void}) {
  const [compras,setCompras] = useState<Compra[]>([]);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    // Busca da tabela compras — se não existir ainda, mostra vazio sem erro
    supabase.from('compras').select('*').order('created_at',{ascending:false})
      .then(({data})=>{ setCompras(data||[]); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  const filtradas = compras.filter(c=>c.fornecedor_nome?.toLowerCase().includes(searchQuery.toLowerCase()));
  if(loading) return <LoadingSpinner label="Carregando compras..."/>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Compras</h2>
          <p className="text-slate-500 font-medium">Registro de compras de insumos e materiais</p>
        </div>
        <button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"><Plus size={18} strokeWidth={3}/>Nova Compra</button>
      </div>

      {filtradas.length===0?(
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center gap-4 text-slate-300">
          <Truck size={56}/>
          <p className="font-black text-slate-400 text-xl uppercase tracking-widest">Nenhuma compra registrada</p>
          <p className="text-slate-400 text-sm font-medium">Clique em "Nova Compra" para registrar a entrada de insumos.</p>
        </div>
      ):(
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Fornecedor','Data','Itens','Total','Status'].map(h=>(
                  <th key={h} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.map(c=>(
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-800">{c.fornecedor_nome}</td>
                  <td className="px-8 py-5 text-sm text-slate-500">{c.data?new Date(c.data).toLocaleDateString('pt-BR'):'—'}</td>
                  <td className="px-8 py-5 text-sm text-slate-500">{c.itens?.length||0} item(ns)</td>
                  <td className="px-8 py-5 font-black text-indigo-600">R$ {Number(c.total||0).toFixed(2)}</td>
                  <td className="px-8 py-5"><span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">{c.status||'Recebido'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODAL: NOVO ORÇAMENTO — com busca de cliente e itens
// ============================================================
interface ItemOrcamento { id: string; produto_id: string; produto_nome: string; descricao: string; quantidade: number; valor_unitario: number; }

function ModalNovoPedido({onClose}:{onClose:()=>void}) {
  const {statuses} = useKanbanStatus();
  const {criarPedido} = usePedidos();
  const {clientes} = useClientes();

  const [buscaCliente,setBuscaCliente] = useState('');
  const [clienteSelecionado,setClienteSelecionado] = useState<Cliente|null>(null);
  const [mostrarListaClientes,setMostrarListaClientes] = useState(false);

  const [produtos,setProdutos] = useState<Produto[]>([]);
  const [buscaProduto,setBuscaProduto] = useState('');
  const [mostrarListaProdutos,setMostrarListaProdutos] = useState(false);
  const [itens,setItens] = useState<ItemOrcamento[]>([]);

  const [form,setForm] = useState({data_entrega:'',observacoes:''});
  const [salvando,setSalvando] = useState(false);
  const [erro,setErro] = useState('');
  const [toast,setToast] = useState('');

  const statusInicial = statuses.find(s=>s.ordem===1);

  // Buscar produtos
  useEffect(()=>{
    supabase.from('produtos').select('*').eq('ativo',true).order('nome')
      .then(({data})=>setProdutos(data||[]));
  },[]);

  const clientesFiltrados = clientes.filter(c=>
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) && buscaCliente.length>0
  ).slice(0,6);

  const produtosFiltrados = produtos.filter(p=>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) && buscaProduto.length>0
  ).slice(0,6);

  const adicionarItem = (produto:Produto) => {
    setItens(prev=>[...prev,{id:crypto.randomUUID(),produto_id:produto.id,produto_nome:produto.nome,descricao:produto.descricao||produto.nome,quantidade:1,valor_unitario:0}]);
    setBuscaProduto('');
    setMostrarListaProdutos(false);
  };

  const atualizarItem = (id:string,campo:string,valor:any) => {
    setItens(prev=>prev.map(i=>i.id===id?{...i,[campo]:valor}:i));
  };

  const removerItem = (id:string) => setItens(prev=>prev.filter(i=>i.id!==id));

  const totalOrcamento = itens.reduce((acc,i)=>acc+(i.quantidade*i.valor_unitario),0);

  const handleSalvar = async () => {
    const nomeCliente = clienteSelecionado?.nome||buscaCliente.trim();
    if(!nomeCliente){setErro('Informe o nome do cliente.');return;}
    if(!statusInicial){setErro('Status do Kanban não carregado.');return;}
    setSalvando(true);

    const {data:pedido,error} = await criarPedido({
      cliente_id: clienteSelecionado?.id||undefined,
      cliente_nome_avulso: clienteSelecionado?undefined:nomeCliente,
      cliente_contato_avulso: clienteSelecionado?.whatsapp||undefined,
      status_id: statusInicial.id,
      data_entrega: form.data_entrega||undefined,
      observacoes: form.observacoes||undefined,
    });

    if(error||!pedido){setErro('Erro ao salvar: '+(error?.message||'tente novamente'));setSalvando(false);return;}

    // Salvar itens se houver
    if(itens.length>0) {
      const itensParaSalvar = itens.map(i=>({
        pedido_id:(pedido as any).id,
        produto_id:i.produto_id,
        quantidade:i.quantidade,
        preco_unitario:i.valor_unitario,
        descricao_custom:i.descricao,
      }));
      await supabase.from('itens_pedido').insert(itensParaSalvar);
    }

    setToast('Orçamento criado com sucesso!');
    setTimeout(onClose,1800);
  };

  return (
    <>
    <ModalWrapper title="Novo Orçamento" onClose={onClose}>
      {erro&&<div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-medium">{erro}</div>}

      {/* CLIENTE */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Cliente</p>
        <div className="relative">
          <input type="text" placeholder="Buscar cliente cadastrado ou digitar nome..."
            className={inputClass}
            value={clienteSelecionado?clienteSelecionado.nome:buscaCliente}
            onChange={e=>{setBuscaCliente(e.target.value);setClienteSelecionado(null);setMostrarListaClientes(true);}}
            onFocus={()=>setMostrarListaClientes(true)}/>
          {clienteSelecionado&&(
            <button onClick={()=>{setClienteSelecionado(null);setBuscaCliente('');}} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X size={16}/></button>
          )}
          {mostrarListaClientes&&clientesFiltrados.length>0&&(
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              {clientesFiltrados.map(c=>(
                <button key={c.id} onClick={()=>{setClienteSelecionado(c);setBuscaCliente('');setMostrarListaClientes(false);}}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">{c.nome.charAt(0)}</div>
                  <div><p className="font-bold text-sm text-slate-800">{c.nome}</p><p className="text-xs text-slate-400">{c.whatsapp||c.cidade||'—'}</p></div>
                </button>
              ))}
            </div>
          )}
        </div>
        {clienteSelecionado&&(
          <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
            <CheckCircle2 size={14}/> Cliente selecionado: {clienteSelecionado.nome} {clienteSelecionado.whatsapp&&`• ${clienteSelecionado.whatsapp}`}
          </div>
        )}
        {!clienteSelecionado&&buscaCliente&&clientesFiltrados.length===0&&(
          <p className="text-xs text-slate-400 font-medium">Nenhum cliente encontrado — o nome digitado será usado como cliente avulso.</p>
        )}
      </div>

      {/* DATA E OBSERVAÇÕES */}
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Data de Entrega">
          <input type="date" value={form.data_entrega} onChange={e=>setForm({...form,data_entrega:e.target.value})} className={inputClass}/>
        </Campo>
        <Campo label="Observações">
          <input type="text" placeholder="Arte, cores, acabamento..." value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} className={inputClass}/>
        </Campo>
      </div>

      {/* ITENS DO ORÇAMENTO */}
      <div className="space-y-3">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Itens do Orçamento</p>

        {/* Busca de produto */}
        <div className="relative">
          <input type="text" placeholder="Buscar produto para adicionar..."
            className={inputClass}
            value={buscaProduto}
            onChange={e=>{setBuscaProduto(e.target.value);setMostrarListaProdutos(true);}}
            onFocus={()=>setMostrarListaProdutos(true)}/>
          {mostrarListaProdutos&&produtosFiltrados.length>0&&(
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              {produtosFiltrados.map(p=>(
                <button key={p.id} onClick={()=>adicionarItem(p)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-center justify-between">
                  <div><p className="font-bold text-sm text-slate-800">{p.nome}</p><p className="text-xs text-slate-400">{p.categoria}</p></div>
                  <Plus size={16} className="text-indigo-400"/>
                </button>
              ))}
            </div>
          )}
          {mostrarListaProdutos&&buscaProduto&&produtosFiltrados.length===0&&(
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-md p-4 text-sm text-slate-400 font-medium">
              Nenhum produto encontrado. Cadastre produtos no Supabase.
            </div>
          )}
        </div>

        {/* Tabela de itens */}
        {itens.length>0&&(
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição</th>
                  <th className="px-3 py-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider w-16">Qtd</th>
                  <th className="px-3 py-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider w-28">Vlr Unit. (R$)</th>
                  <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider w-24">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itens.map(item=>(
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <input type="text" value={item.descricao}
                        onChange={e=>atualizarItem(item.id,'descricao',e.target.value)}
                        className="w-full text-sm font-medium text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="1" value={item.quantidade}
                        onChange={e=>atualizarItem(item.id,'quantidade',Number(e.target.value))}
                        className="w-full text-center text-sm font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" step="0.01" value={item.valor_unitario}
                        onChange={e=>atualizarItem(item.id,'valor_unitario',Number(e.target.value))}
                        className="w-full text-center text-sm font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/>
                    </td>
                    <td className="px-3 py-2 text-right font-black text-indigo-600 text-sm">
                      R$ {(item.quantidade*item.valor_unitario).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={()=>removerItem(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50 border-t-2 border-indigo-100">
                  <td colSpan={3} className="px-3 py-3 text-right font-black text-slate-600 text-sm uppercase tracking-wider">Total do Orçamento:</td>
                  <td className="px-3 py-3 text-right font-black text-indigo-700 text-base">R$ {totalOrcamento.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {itens.length===0&&(
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm font-medium">
            Busque e adicione produtos acima para compor o orçamento
          </div>
        )}
      </div>

      <BotaoSalvar onClick={handleSalvar} loading={salvando} label={`Criar Orçamento${totalOrcamento>0?' — R$ '+totalOrcamento.toFixed(2):''}`}/>
    </ModalWrapper>
    <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence>
    </>
  );
}

// ============================================================
// MODAL: NOVO CLIENTE — com toast de sucesso
// ============================================================
function ModalNovoCliente({onClose}:{onClose:()=>void}) {
  const {criarCliente} = useClientes();
  const [form,setForm] = useState({nome:'',cpf_cnpj:'',email:'',telefone:'',whatsapp:'',cidade:'',estado:''});
  const [salvando,setSalvando] = useState(false);
  const [erro,setErro] = useState('');
  const [toast,setToast] = useState('');

  const handleSalvar = async () => {
    if(!form.nome.trim()){setErro('Nome é obrigatório.');return;}
    setSalvando(true);
    const {error} = await criarCliente(form);
    if(error){setErro('Erro: '+error.message);setSalvando(false);}
    else{setToast('Cliente salvo com sucesso! ✅');setTimeout(onClose,1800);}
  };

  return (
    <>
    <ModalWrapper title="Novo Cliente" onClose={onClose}>
      {erro&&<div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-medium">{erro}</div>}
      <Campo label="Nome Completo *"><input type="text" placeholder="Ex: João Pereira" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="CPF / CNPJ"><input type="text" placeholder="000.000.000-00" value={form.cpf_cnpj} onChange={e=>setForm({...form,cpf_cnpj:e.target.value})} className={inputClass}/></Campo>
        <Campo label="WhatsApp"><input type="text" placeholder="(11) 99999-0000" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} className={inputClass}/></Campo>
      </div>
      <Campo label="E-mail"><input type="email" placeholder="cliente@email.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inputClass}/></Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Cidade"><input type="text" placeholder="São Paulo" value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})} className={inputClass}/></Campo>
        <Campo label="Estado"><input type="text" placeholder="SP" maxLength={2} value={form.estado} onChange={e=>setForm({...form,estado:e.target.value.toUpperCase()})} className={inputClass}/></Campo>
      </div>
      <BotaoSalvar onClick={handleSalvar} loading={salvando} label="Salvar Cliente"/>
    </ModalWrapper>
    <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence>
    </>
  );
}

// ============================================================
// MODAL: NOVO FORNECEDOR
// ============================================================
function ModalNovoFornecedor({onClose}:{onClose:()=>void}) {
  const {criarFornecedor} = useFornecedores();
  const [form,setForm] = useState({nome:'',cnpj:'',contato:'',telefone:'',whatsapp:'',email:'',cidade:''});
  const [salvando,setSalvando] = useState(false);
  const [erro,setErro] = useState('');
  const [toast,setToast] = useState('');

  const handleSalvar = async () => {
    if(!form.nome.trim()){setErro('Nome é obrigatório.');return;}
    setSalvando(true);
    const {error} = await criarFornecedor(form);
    if(error){setErro('Erro: '+error.message);setSalvando(false);}
    else{setToast('Fornecedor salvo com sucesso! ✅');setTimeout(onClose,1800);}
  };

  return (
    <>
    <ModalWrapper title="Novo Fornecedor" onClose={onClose}>
      {erro&&<div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-medium">{erro}</div>}
      <Campo label="Nome da Empresa *"><input type="text" placeholder="Ex: Papéis & Cia" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="CNPJ"><input type="text" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})} className={inputClass}/></Campo>
        <Campo label="Nome do Contato"><input type="text" placeholder="Ricardo" value={form.contato} onChange={e=>setForm({...form,contato:e.target.value})} className={inputClass}/></Campo>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="WhatsApp"><input type="text" placeholder="(11) 99999-0000" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} className={inputClass}/></Campo>
        <Campo label="E-mail"><input type="email" placeholder="fornecedor@email.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inputClass}/></Campo>
      </div>
      <Campo label="Cidade"><input type="text" placeholder="São Paulo" value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})} className={inputClass}/></Campo>
      <BotaoSalvar onClick={handleSalvar} loading={salvando} label="Salvar Fornecedor"/>
    </ModalWrapper>
    <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence>
    </>
  );
}

// ============================================================
// MODAL: NOVA COMPRA — formulário próprio de compras
// ============================================================
interface ItemCompraForm { id: string; descricao: string; quantidade: number; valor_unitario: number; }

function ModalNovaCompra({onClose}:{onClose:()=>void}) {
  const {fornecedores} = useFornecedores();
  const [buscaFornecedor,setBuscaFornecedor] = useState('');
  const [fornecedorSelecionado,setFornecedorSelecionado] = useState<any|null>(null);
  const [mostrarLista,setMostrarLista] = useState(false);
  const [itens,setItens] = useState<ItemCompraForm[]>([{id:crypto.randomUUID(),descricao:'',quantidade:1,valor_unitario:0}]);
  const [form,setForm] = useState({data:new Date().toISOString().split('T')[0],observacoes:'',nota_fiscal:''});
  const [salvando,setSalvando] = useState(false);
  const [erro,setErro] = useState('');
  const [toast,setToast] = useState('');

  const fornecedoresFiltrados = fornecedores.filter(f=>f.nome.toLowerCase().includes(buscaFornecedor.toLowerCase())&&buscaFornecedor.length>0).slice(0,6);
  const total = itens.reduce((acc,i)=>acc+(i.quantidade*i.valor_unitario),0);

  const adicionarLinha = () => setItens(prev=>[...prev,{id:crypto.randomUUID(),descricao:'',quantidade:1,valor_unitario:0}]);
  const atualizarItem = (id:string,campo:string,valor:any) => setItens(prev=>prev.map(i=>i.id===id?{...i,[campo]:valor}:i));
  const removerItem = (id:string) => setItens(prev=>prev.filter(i=>i.id!==id));

  const handleSalvar = async () => {
    const nomeFornecedor = fornecedorSelecionado?.nome||buscaFornecedor.trim();
    if(!nomeFornecedor){setErro('Informe o fornecedor.');return;}
    if(itens.every(i=>!i.descricao.trim())){setErro('Adicione ao menos um item.');return;}
    setSalvando(true);

    const {error} = await supabase.from('compras').insert({
      fornecedor_id: fornecedorSelecionado?.id||null,
      fornecedor_nome: nomeFornecedor,
      data: form.data,
      nota_fiscal: form.nota_fiscal||null,
      observacoes: form.observacoes||null,
      total,
      status:'Recebido',
      itens: itens.filter(i=>i.descricao.trim()),
    });

    if(error){setErro('Erro: '+error.message);setSalvando(false);}
    else{setToast('Compra registrada com sucesso! ✅');setTimeout(onClose,1800);}
  };

  return (
    <>
    <ModalWrapper title="Nova Compra" onClose={onClose}>
      {erro&&<div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-medium">{erro}</div>}

      {/* FORNECEDOR */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Fornecedor</p>
        <div className="relative">
          <input type="text" placeholder="Buscar fornecedor cadastrado..."
            className={inputClass}
            value={fornecedorSelecionado?fornecedorSelecionado.nome:buscaFornecedor}
            onChange={e=>{setBuscaFornecedor(e.target.value);setFornecedorSelecionado(null);setMostrarLista(true);}}
            onFocus={()=>setMostrarLista(true)}/>
          {fornecedorSelecionado&&<button onClick={()=>{setFornecedorSelecionado(null);setBuscaFornecedor('');}} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X size={16}/></button>}
          {mostrarLista&&fornecedoresFiltrados.length>0&&(
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              {fornecedoresFiltrados.map(f=>(
                <button key={f.id} onClick={()=>{setFornecedorSelecionado(f);setBuscaFornecedor('');setMostrarLista(false);}}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors">
                  <p className="font-bold text-sm text-slate-800">{f.nome}</p>
                  <p className="text-xs text-slate-400">{f.cnpj||f.cidade||'—'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DATA E NF */}
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Data da Compra"><input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} className={inputClass}/></Campo>
        <Campo label="Nota Fiscal (opcional)"><input type="text" placeholder="NF-e 000123" value={form.nota_fiscal} onChange={e=>setForm({...form,nota_fiscal:e.target.value})} className={inputClass}/></Campo>
      </div>

      {/* ITENS */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Itens Comprados</p>
          <button onClick={adicionarLinha} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><Plus size={12}/>Adicionar linha</button>
        </div>
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-2 text-left text-[10px] font-black text-slate-400 uppercase">Descrição / Insumo</th>
                <th className="px-3 py-2 text-center text-[10px] font-black text-slate-400 uppercase w-16">Qtd</th>
                <th className="px-3 py-2 text-center text-[10px] font-black text-slate-400 uppercase w-28">Vlr Unit. (R$)</th>
                <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400 uppercase w-24">Total</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map(item=>(
                <tr key={item.id}>
                  <td className="px-3 py-2"><input type="text" placeholder="Ex: Papel Offset 90g A4" value={item.descricao} onChange={e=>atualizarItem(item.id,'descricao',e.target.value)} className="w-full text-sm bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                  <td className="px-3 py-2"><input type="number" min="1" value={item.quantidade} onChange={e=>atualizarItem(item.id,'quantidade',Number(e.target.value))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                  <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={item.valor_unitario} onChange={e=>atualizarItem(item.id,'valor_unitario',Number(e.target.value))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                  <td className="px-3 py-2 text-right font-black text-indigo-600 text-sm">R$ {(item.quantidade*item.valor_unitario).toFixed(2)}</td>
                  <td className="px-3 py-2"><button onClick={()=>removerItem(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50 border-t-2 border-indigo-100">
                <td colSpan={3} className="px-3 py-3 text-right font-black text-slate-600 text-sm uppercase tracking-wider">Total da Compra:</td>
                <td className="px-3 py-3 text-right font-black text-indigo-700 text-base">R$ {total.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Campo label="Observações (opcional)"><input type="text" placeholder="Ex: Material para estoque de fevereiro" value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} className={inputClass}/></Campo>
      <BotaoSalvar onClick={handleSalvar} loading={salvando} label={`Registrar Compra — R$ ${total.toFixed(2)}`}/>
    </ModalWrapper>
    <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence>
    </>
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================
function ModalWrapper({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}} transition={{duration:0.15}}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-all"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
}

function Campo({label,children}:{label:string;children:React.ReactNode}) {
  return (
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function BotaoSalvar({onClick,loading,label}:{onClick:()=>void;loading:boolean;label:string}) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all mt-2">
      {loading?'Salvando...':label}
    </button>
  );
}

function LoadingSpinner({label}:{label:string}) {
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function PlaceholderView({title,icon}:{title:string;icon:React.ReactNode}) {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-slate-300 space-y-4">
      <div className="p-8 bg-slate-100 rounded-full text-slate-200">{icon}</div>
      <h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest">{title}</h2>
      <p className="text-slate-400 font-medium">Em desenvolvimento — integração Supabase pronta.</p>
    </div>
  );
}

const inputClass = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm outline-none transition-all';
