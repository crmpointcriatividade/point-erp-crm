import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import {
  LayoutDashboard, Package, Users, Settings, Plus, Search, Printer,
  Clock, CheckCircle2, AlertCircle, FileText, ShoppingCart, Truck,
  MessageSquare, Building2, X, ArrowRight, AlertTriangle, RefreshCw,
  Trash2, Menu, ChevronLeft, LogOut, Shield, UserCheck, Eye, EyeOff,
  ChevronDown, DollarSign, TrendingUp, TrendingDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { generateBudgetPDF } from './lib/pdfGenerator';
import { useKanbanStatus, usePedidos, useClientes, useFornecedores, useInsumos } from './hooks/useSupabase';
import { supabase } from './lib/supabase';
import type { Pedido, Cliente, Produto, Compra } from './lib/supabase';

/* ── TIPOS ─────────────────────────────────────────────────── */
type ModalType = 'pedido'|'cliente'|'fornecedor'|'compra'|'novoProduto'|'novoClienteRapido'|'detalheOrc'|'detalheCompra'|null;
type UserRole = 'admin'|'colaborador';
interface AppUser { nome:string; role:UserRole; }

const STATUS_PEDIDO_CORES:Record<string,string> = {
  Lead:'bg-slate-100 border-slate-200 text-slate-600',
  Orçamento:'bg-amber-50 border-amber-200 text-amber-700',
  Aprovação:'bg-blue-50 border-blue-200 text-blue-700',
  Produção:'bg-rose-50 border-rose-200 text-rose-700',
  Finalizado:'bg-emerald-50 border-emerald-200 text-emerald-700',
};
const STATUS_COMPRA = ['Pendente','Recebido','Cancelado'];
const STATUS_CR = ['Aguardando','Recebido','Atrasado','Cancelado'];
const STATUS_CP = ['Aguardando','Pago','Atrasado','Cancelado'];

const inputClass = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm outline-none transition-all';

/* ── AUTH ──────────────────────────────────────────────────── */
const AuthCtx = createContext<{user:AppUser|null}>({user:null});
const useAuth = ()=>useContext(AuthCtx);
const USUARIOS = [
  {nome:'Admin Point', role:'admin' as UserRole, senha:'admin123'},
  {nome:'Colaborador',  role:'colaborador' as UserRole, senha:'colab123'},
];

/* ── LOGIN ─────────────────────────────────────────────────── */
function TelaLogin({onLogin}:{onLogin:(u:AppUser)=>void}) {
  const[nome,setNome]=useState('');
  const[senha,setSenha]=useState('');
  const[erro,setErro]=useState('');
  const[ver,setVer]=useState(false);
  const login=()=>{
    const u=USUARIOS.find(u=>u.nome.toLowerCase()===nome.toLowerCase().trim()&&u.senha===senha);
    if(!u){setErro('Usuário ou senha incorretos.');return;}
    onLogin({nome:u.nome,role:u.role});
  };
  return(
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900 flex items-center justify-center p-4">
      <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-indigo-600 mb-2"><Printer size={36} strokeWidth={3}/><span className="text-3xl font-black">POINT</span></div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Gestão de Gráfica</p>
        </div>
        {erro&&<div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-medium mb-4">{erro}</div>}
        <div className="space-y-4">
          <Campo label="Usuário"><input type="text" placeholder="Seu nome" value={nome} onChange={e=>setNome(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} className={inputClass}/></Campo>
          <Campo label="Senha">
            <div className="relative">
              <input type={ver?'text':'password'} placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} className={inputClass+' pr-10'}/>
              <button onClick={()=>setVer(!ver)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">{ver?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
          </Campo>
          <button onClick={login} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 mt-2">Entrar</button>
        </div>
        <div className="mt-6 p-4 bg-slate-50 rounded-2xl space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acessos de teste</p>
          <p className="text-xs text-slate-500 flex items-center gap-2"><Shield size={12} className="text-indigo-500"/><b>Admin Point</b> / admin123</p>
          <p className="text-xs text-slate-500 flex items-center gap-2"><UserCheck size={12} className="text-emerald-500"/><b>Colaborador</b> / colab123</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ── APP ROOT ──────────────────────────────────────────────── */
export default function App() {
  // Persiste sessão no sessionStorage para não deslogar ao navegar
  const[user,setUser]=useState<AppUser|null>(()=>{
    try{const s=sessionStorage.getItem('point_user');return s?JSON.parse(s):null;}catch{return null;}
  });
  const[activeTab,setActiveTab]=useState('kanban');
  const[searchQuery,setSearchQuery]=useState('');
  const[modal,setModal]=useState<ModalType>(null);
  const[sidebarOpen,setSidebarOpen]=useState(false);
  const[pedidoSelecionado,setPedidoSelecionado]=useState<Pedido|null>(null);
  const[compraSelecionada,setCompraSelecionada]=useState<Compra|null>(null);

  const login=(u:AppUser)=>{sessionStorage.setItem('point_user',JSON.stringify(u));setUser(u);};
  const logout=()=>{sessionStorage.removeItem('point_user');setUser(null);};

  if(!user) return <TelaLogin onLogin={login}/>;

  const isAdmin=user.role==='admin';
  const tabs=[
    {id:'kanban',     label:'CRM / Kanban',     icon:<LayoutDashboard size={20}/>, roles:['admin','colaborador']},
    {id:'insumos',    label:'Insumos & Estoque', icon:<Package size={20}/>,         roles:['admin']},
    {id:'clientes',   label:'Clientes',          icon:<Users size={20}/>,           roles:['admin','colaborador']},
    {id:'fornecedores',label:'Fornecedores',     icon:<Building2 size={20}/>,       roles:['admin']},
    {id:'vendas',     label:'Contas a Receber',  icon:<TrendingUp size={20}/>,      roles:['admin']},
    {id:'compras',    label:'Compras',           icon:<Truck size={20}/>,           roles:['admin','colaborador']},
    {id:'contaspagar',label:'Contas a Pagar',    icon:<TrendingDown size={20}/>,    roles:['admin']},
    {id:'config',     label:'Configurações',     icon:<Settings size={20}/>,        roles:['admin']},
  ].filter(t=>t.roles.includes(user.role));

  const headerBtn=()=>{
    if(activeTab==='clientes'&&isAdmin) return{label:'Novo Cliente',   action:()=>setModal('cliente')};
    if(activeTab==='fornecedores')      return{label:'Novo Fornecedor', action:()=>setModal('fornecedor')};
    if(activeTab==='compras')           return{label:'Nova Compra',     action:()=>setModal('compra')};
    return{label:'Novo Orçamento', action:()=>setModal('pedido')};
  };
  const btn=headerBtn();
  const navigate=(tab:string)=>{setActiveTab(tab);setSidebarOpen(false);setSearchQuery('');};

  const abrirDetalheOrc=(p:Pedido)=>{setPedidoSelecionado(p);setModal('detalheOrc');};
  const abrirDetalheCompra=(c:Compra)=>{setCompraSelecionada(c);setModal('detalheCompra');};

  return(
    <AuthCtx.Provider value={{user}}>
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

        <AnimatePresence>
          {sidebarOpen&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden" onClick={()=>setSidebarOpen(false)}/>}
        </AnimatePresence>

        {/* SIDEBAR */}
        <aside className={cn('fixed lg:relative inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 transition-transform duration-300 shrink-0 w-64',sidebarOpen?'translate-x-0':'-translate-x-full lg:translate-x-0')}>
          <div className="p-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-indigo-600 flex items-center gap-2"><Printer size={26} strokeWidth={3}/>POINT</h1>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-[0.2em] font-bold">Gestão de Gráfica</p>
            </div>
            <button onClick={()=>setSidebarOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"><ChevronLeft size={20}/></button>
          </div>
          <div className="mx-4 mb-3">
            <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold',isAdmin?'bg-indigo-50 text-indigo-600':'bg-emerald-50 text-emerald-600')}>
              {isAdmin?<Shield size={13}/>:<UserCheck size={13}/>}{isAdmin?'Administrador':'Colaborador'}
            </div>
          </div>
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {tabs.map(t=><NavItem key={t.id} active={activeTab===t.id} onClick={()=>navigate(t.id)} icon={t.icon} label={t.label}/>)}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 p-2 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">{user.nome.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{user.nome}</p><p className="text-[10px] text-emerald-500 font-bold uppercase">Online</p></div>
              <button onClick={logout} title="Sair" className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"><LogOut size={16}/></button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button onClick={()=>setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shrink-0"><Menu size={20}/></button>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-sm transition-all outline-none border" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
              </div>
            </div>
            <button onClick={btn.action} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 active:scale-95 shrink-0">
              <Plus size={16} strokeWidth={3}/><span className="hidden sm:inline">{btn.label}</span><span className="sm:hidden">Novo</span>
            </button>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.15}}>
                {activeTab==='kanban'      && <KanbanView      searchQuery={searchQuery} onNovoPedido={()=>setModal('pedido')} onAbrirDetalhe={abrirDetalheOrc}/>}
                {activeTab==='insumos'     && <InsumosView     searchQuery={searchQuery}/>}
                {activeTab==='clientes'    && <ClientesView    searchQuery={searchQuery} onAdd={()=>setModal('cliente')}/>}
                {activeTab==='fornecedores'&& <FornecedoresView searchQuery={searchQuery} onAdd={()=>setModal('fornecedor')}/>}
                {activeTab==='vendas'      && <ContasReceberView/>}
                {activeTab==='compras'     && <ComprasView     searchQuery={searchQuery} onAdd={()=>setModal('compra')} onAbrirDetalhe={abrirDetalheCompra}/>}
                {activeTab==='contaspagar' && <ContasPagarView/>}
                {activeTab==='config'      && <ConfigView/>}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <AnimatePresence>
          {modal==='pedido'           && <ModalNovoPedido     onClose={()=>setModal(null)} onAbrirNovoProduto={()=>setModal('novoProduto')} onAbrirNovoCliente={()=>setModal('novoClienteRapido')}/>}
          {modal==='cliente'          && <ModalNovoCliente    onClose={()=>setModal(null)}/>}
          {modal==='novoClienteRapido'&& <ModalNovoCliente    onClose={()=>setModal(null)}/>}
          {modal==='fornecedor'       && <ModalNovoFornecedor onClose={()=>setModal(null)}/>}
          {modal==='compra'           && <ModalNovaCompra     onClose={()=>setModal(null)}/>}
          {modal==='novoProduto'      && <ModalNovoProduto    onClose={()=>setModal(null)}/>}
          {modal==='detalheOrc'    && pedidoSelecionado  && <ModalDetalheOrcamento pedido={pedidoSelecionado}  onClose={()=>{setModal(null);setPedidoSelecionado(null);}}/>}
          {modal==='detalheCompra' && compraSelecionada  && <ModalDetalheCompra    compra={compraSelecionada}  onClose={()=>{setModal(null);setCompraSelecionada(null);}}/>}
        </AnimatePresence>
      </div>
    </AuthCtx.Provider>
  );
}

/* ── NAV ───────────────────────────────────────────────────── */
function NavItem({active,icon,label,onClick}:{active:boolean;icon:React.ReactNode;label:string;onClick:()=>void}) {
  return <button onClick={onClick} className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left',active?'bg-indigo-600 text-white shadow-md shadow-indigo-100':'text-slate-500 hover:bg-slate-50 hover:text-indigo-600')}>{icon}{label}</button>;
}

/* ── TOAST ─────────────────────────────────────────────────── */
function Toast({message,color='emerald',onClose}:{message:string;color?:'emerald'|'indigo'|'rose';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[onClose]);
  const bg={emerald:'bg-emerald-600',indigo:'bg-indigo-600',rose:'bg-rose-600'}[color];
  return <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}} className={cn('fixed bottom-6 right-6 z-[100] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm',bg)}><CheckCircle2 size={20}/>{message}</motion.div>;
}

/* ── BADGE STATUS ──────────────────────────────────────────── */
function BadgeStatus({status,options,onChange}:{status:string;options:string[];onChange:(s:string)=>void}) {
  const[open,setOpen]=useState(false);
  const cores:Record<string,string>={
    Lead:'bg-slate-100 text-slate-600',Orçamento:'bg-amber-100 text-amber-700',
    Aprovação:'bg-blue-100 text-blue-700',Produção:'bg-rose-100 text-rose-700',
    Finalizado:'bg-emerald-100 text-emerald-700',Recebido:'bg-emerald-100 text-emerald-700',
    Pendente:'bg-amber-100 text-amber-700',Pago:'bg-emerald-100 text-emerald-700',
    Aguardando:'bg-amber-100 text-amber-700',Atrasado:'bg-rose-100 text-rose-700',
    Cancelado:'bg-slate-100 text-slate-500',
  };
  const cor=cores[status]||'bg-slate-100 text-slate-600';
  return(
    <div className="relative inline-block">
      <button onClick={()=>setOpen(o=>!o)} className={cn('flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1 rounded-full transition-all hover:opacity-80',cor)}>
        {status}<ChevronDown size={10}/>
      </button>
      <AnimatePresence>
        {open&&(
          <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}}
            className="absolute left-0 top-8 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
            {options.map(o=>(
              <button key={o} onClick={()=>{onChange(o);setOpen(false);}}
                className={cn('w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors',o===status&&'bg-indigo-50 text-indigo-600')}>
                {o}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── KANBAN ────────────────────────────────────────────────── */
function KanbanView({searchQuery,onNovoPedido,onAbrirDetalhe}:{searchQuery:string;onNovoPedido:()=>void;onAbrirDetalhe:(p:Pedido)=>void}) {
  const{statuses,loading:ls}=useKanbanStatus();
  const{pedidos,loading:lp,moverStatus,baixarEstoque,refetch}=usePedidos(searchQuery);
  const[movendo,setMovendo]=useState<string|null>(null);

  const mover=async(pedido:Pedido,statusNome:string)=>{
    const ns=statuses.find(s=>s.nome===statusNome);if(!ns||pedido.status_id===ns.id)return;
    setMovendo(pedido.id);
    if(statusNome==='Produção'){const{data:r}=await baixarEstoque(pedido.id);if(r&&!r.sucesso){alert(`⚠️ Estoque insuficiente:\n${r.erros.map((e:any)=>e.insumo).join('\n')}`);setMovendo(null);return;}}
    await moverStatus(pedido.id,ns.id);setMovendo(null);
  };
  const zap=(p:Pedido)=>{const n=(p.clientes?.whatsapp||p.cliente_contato_avulso||'').replace(/\D/g,'');const m=encodeURIComponent(`Olá! Orçamento *#${p.codigo}*. Total: R$ ${Number(p.valor_total).toFixed(2)}. Confirma?`);if(n)window.open(`https://wa.me/55${n}?text=${m}`,'_blank');};

  if(ls||lp)return<LoadingSpinner label="Carregando Kanban..."/>;
  return(
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">CRM / Kanban</h2><p className="text-slate-500 text-sm">{pedidos.length} pedido{pedidos.length!==1?'s':''}</p></div>
        <div className="flex gap-2">
          <button onClick={refetch} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><RefreshCw size={17}/></button>
          <button onClick={onNovoPedido} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all"><Plus size={15} strokeWidth={3}/>Novo Orçamento</button>
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{minHeight:'calc(100vh - 240px)'}}>
        {statuses.map(status=>{
          const col=pedidos.filter(p=>p.status_id===status.id);
          const cc=STATUS_PEDIDO_CORES[status.nome]||'bg-slate-100 border-slate-200 text-slate-600';
          const next=statuses.find(s=>s.ordem===status.ordem+1);
          return(
            <div key={status.id} className="w-72 md:w-80 flex-shrink-0 flex flex-col">
              <div className={cn('flex items-center justify-between p-4 rounded-t-2xl border-b-2',cc)}>
                <h3 className="font-black text-xs uppercase tracking-widest">{status.nome}</h3>
                <span className="text-[10px] font-black bg-white/60 px-2 py-0.5 rounded-full">{col.length}</span>
              </div>
              <div className="flex-1 bg-slate-100/40 p-3 space-y-3 rounded-b-2xl border border-slate-200 border-t-0 overflow-y-auto">
                {col.length===0&&<p className="text-center text-slate-300 text-xs py-8">Vazio</p>}
                {col.map(p=>{
                  const nome=p.clientes?.nome||p.cliente_nome_avulso||'Cliente';
                  return(
                    <motion.div key={p.id} layout className={cn('bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 transition-all group',movendo===p.id&&'opacity-50 pointer-events-none')}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-slate-300 uppercase">#{p.codigo}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={()=>onAbrirDetalhe(p)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Ver detalhes"><FileText size={13}/></button>
                          <button onClick={()=>zap(p)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="WhatsApp"><MessageSquare size={13}/></button>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight mb-2">{nome}</h4>
                      {p.data_entrega&&<p className="text-xs text-slate-400 flex items-center gap-1 mb-2"><Clock size={10}/>Entrega: {new Date(p.data_entrega).toLocaleDateString('pt-BR')}</p>}
                      <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                        <span className="text-sm font-black text-indigo-600">R$ {Number(p.valor_total).toFixed(2)}</span>
                        {next&&<button onClick={()=>mover(p,next.nome)} disabled={movendo===p.id} className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg uppercase">{next.nome}<ArrowRight size={9}/></button>}
                        {status.nome==='Finalizado'&&<CheckCircle2 size={14} className="text-emerald-500"/>}
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

/* ── DETALHE ORÇAMENTO (status + itens + transformar em venda) ── */
function ModalDetalheOrcamento({pedido,onClose}:{pedido:Pedido;onClose:()=>void}) {
  const{statuses}=useKanbanStatus();
  const{refetch}=usePedidos();
  const[statusId,setStatusId]=useState(pedido.status_id);
  const[itens,setItens]=useState<any[]>([]);
  const[produtos,setProdutos]=useState<Produto[]>([]);
  const[buscaProd,setBuscaProd]=useState('');
  const[showProd,setShowProd]=useState(false);
  const prodRef=useRef<HTMLDivElement>(null);
  const[salvando,setSalvando]=useState(false);
  const[toast,setToast]=useState('');
  const[toastColor,setToastColor]=useState<'emerald'|'indigo'|'rose'>('emerald');

  const statusAtual=statuses.find(s=>s.id===statusId);

  // Carrega itens e produtos
  useEffect(()=>{
    supabase.from('itens_pedido').select('*').eq('pedido_id',pedido.id).then(({data})=>setItens(data||[]));
    supabase.from('produtos').select('*').eq('ativo',true).order('nome').then(({data})=>setProdutos(data||[]));
  },[pedido.id]);

  // Fecha dropdown ao clicar fora
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(prodRef.current&&!prodRef.current.contains(e.target as Node))setShowProd(false);};
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);
  },[]);

  const prodsFiltrados=produtos.filter(p=>p.nome.toLowerCase().includes(buscaProd.toLowerCase())&&buscaProd.length>0).slice(0,6);

  const addItem=(prod:Produto)=>{
    setItens(prev=>[...prev,{id:'new-'+crypto.randomUUID(),pedido_id:pedido.id,produto_id:prod.id,descricao_custom:prod.nome,quantidade:1,preco_unitario:0,custo_unitario:0,_novo:true}]);
    setBuscaProd('');setShowProd(false);
  };
  const addManual=()=>{
    setItens(prev=>[...prev,{id:'new-'+crypto.randomUUID(),pedido_id:pedido.id,produto_id:null,descricao_custom:buscaProd||'',quantidade:1,preco_unitario:0,custo_unitario:0,_novo:true}]);
    setBuscaProd('');setShowProd(false);
  };
  const upd=(id:string,k:string,v:any)=>setItens(prev=>prev.map(i=>i.id===id?{...i,[k]:v,_dirty:true}:i));
  const del=(id:string)=>setItens(prev=>prev.filter(i=>i.id!==id));
  const total=itens.reduce((a,i)=>a+i.quantidade*i.preco_unitario,0);

  const salvarAlteracoes=async()=>{
    setSalvando(true);
    // Atualiza status
    await supabase.from('pedidos').update({status_id:statusId,updated_at:new Date().toISOString()}).eq('id',pedido.id);
    // Itens novos
    const novos=itens.filter(i=>i._novo);
    if(novos.length>0)await supabase.from('itens_pedido').insert(novos.map(({id,_novo,_dirty,...rest})=>rest));
    // Itens editados (não novos, mas sujos)
    const editados=itens.filter(i=>i._dirty&&!i._novo);
    for(const it of editados){const{_dirty,...rest}=it;await supabase.from('itens_pedido').update(rest).eq('id',it.id);}
    refetch();setSalvando(false);showToast('Orçamento salvo!','emerald');
  };

  const transformarEmVenda=async()=>{
    if(!confirm('Transformar este orçamento em venda e enviar para Contas a Receber?'))return;
    setSalvando(true);
    await supabase.from('contas_receber').insert({
      pedido_id:pedido.id,
      cliente_nome:pedido.clientes?.nome||pedido.cliente_nome_avulso||'Cliente',
      descricao:`Venda referente ao Orçamento #${pedido.codigo}`,
      valor:total||pedido.valor_total,
      data_vencimento:pedido.data_entrega||null,
      status:'Aguardando',
    });
    // Marca pedido como Finalizado
    const finalizado=statuses.find(s=>s.nome==='Finalizado');
    if(finalizado)await supabase.from('pedidos').update({status_id:finalizado.id,pagamento_confirmado:true,updated_at:new Date().toISOString()}).eq('id',pedido.id);
    refetch();setSalvando(false);showToast('Venda lançada em Contas a Receber! ✅','indigo');setTimeout(onClose,1800);
  };

  const showToast=(msg:string,cor:'emerald'|'indigo'|'rose')=>{setToast(msg);setToastColor(cor);};

  return(
    <>
    <ModalWrapper title={`Orçamento #${pedido.codigo}`} onClose={onClose} size="lg">
      {/* Cabeçalho info */}
      <div className="bg-slate-50 rounded-2xl p-4 flex flex-wrap gap-4 justify-between items-start">
        <div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Cliente</p>
          <p className="font-black text-slate-800">{pedido.clientes?.nome||pedido.cliente_nome_avulso||'—'}</p>
          {(pedido.clientes?.whatsapp||pedido.cliente_contato_avulso)&&<p className="text-xs text-emerald-600 font-bold mt-0.5">{pedido.clientes?.whatsapp||pedido.cliente_contato_avulso}</p>}
        </div>
        <div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Status</p>
          <BadgeStatus
            status={statusAtual?.nome||'Lead'}
            options={statuses.map(s=>s.nome)}
            onChange={nome=>{const ns=statuses.find(s=>s.nome===nome);if(ns)setStatusId(ns.id);}}
          />
        </div>
        <div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Entrega</p>
          <p className="font-bold text-slate-700 text-sm">{pedido.data_entrega?new Date(pedido.data_entrega).toLocaleDateString('pt-BR'):'—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total</p>
          <p className="font-black text-indigo-600 text-lg">R$ {total>0?total.toFixed(2):Number(pedido.valor_total).toFixed(2)}</p>
        </div>
      </div>

      {/* Itens */}
      <div className="space-y-3">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Itens do Orçamento</p>
        {/* Busca produto */}
        <div className="relative" ref={prodRef}>
          <input type="text" placeholder="Buscar produto para adicionar..." className={inputClass} value={buscaProd}
            onChange={e=>{setBuscaProd(e.target.value);setShowProd(true);}} onFocus={()=>setShowProd(true)}/>
          {showProd&&buscaProd.length>0&&(
            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
              {prodsFiltrados.length>0
                ?<>{prodsFiltrados.map(p=><button key={p.id} onClick={()=>addItem(p)} className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-center justify-between"><div><p className="font-bold text-sm">{p.nome}</p><p className="text-xs text-slate-400">{p.categoria}</p></div><Plus size={14} className="text-indigo-400"/></button>)}
                  <button onClick={addManual} className="w-full text-left px-4 py-3 border-t border-slate-100 hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-500"><Plus size={13}/>Adicionar "{buscaProd}" manualmente</button></>
                :<div className="p-4"><p className="text-sm text-slate-500 mb-2">Não encontrado.</p><button onClick={addManual} className="flex items-center gap-2 text-sm text-indigo-600 font-bold hover:underline"><Plus size={13}/>Adicionar "{buscaProd}" manualmente</button></div>
              }
            </div>
          )}
        </div>

        {itens.length>0?(
          <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[460px]">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase">Descrição</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400 uppercase w-16">Qtd</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400 uppercase w-28">Vlr Unit (R$)</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-black text-slate-400 uppercase w-24">Total</th>
                <th className="w-8"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {itens.map(item=>(
                  <tr key={item.id}>
                    <td className="px-3 py-2"><input type="text" value={item.descricao_custom||''} onChange={e=>upd(item.id,'descricao_custom',e.target.value)} className="w-full text-sm bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                    <td className="px-3 py-2"><input type="number" min="1" value={item.quantidade} onChange={e=>upd(item.id,'quantidade',Math.max(1,Number(e.target.value)))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                    <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={item.preco_unitario} onChange={e=>upd(item.id,'preco_unitario',Number(e.target.value))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                    <td className="px-3 py-2 text-right font-black text-indigo-600 text-sm">R$ {(item.quantidade*item.preco_unitario).toFixed(2)}</td>
                    <td className="px-3 py-2"><button onClick={()=>del(item.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={13}/></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-indigo-50 border-t-2 border-indigo-100">
                <td colSpan={3} className="px-3 py-3 text-right font-black text-slate-600 text-sm uppercase">Total:</td>
                <td className="px-3 py-3 text-right font-black text-indigo-700 text-base">R$ {total.toFixed(2)}</td>
                <td></td>
              </tr></tfoot>
            </table>
          </div>
        ):(
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">Busque ou adicione itens acima</div>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={salvarAlteracoes} disabled={salvando} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all">
          {salvando?'Salvando...':'💾 Salvar Alterações'}
        </button>
        <button onClick={()=>generateBudgetPDF(pedido,itens.map(i=>({descricao:i.descricao_custom||'',quantidade:i.quantidade,valor_unitario:i.preco_unitario,valor_total:i.quantidade*i.preco_unitario})))}
          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
          <FileText size={16}/>PDF
        </button>
      </div>
      <button onClick={transformarEmVenda} disabled={salvando}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2">
        <DollarSign size={16}/>Transformar em Venda → Contas a Receber
      </button>
    </ModalWrapper>
    <AnimatePresence>{toast&&<Toast message={toast} color={toastColor} onClose={()=>setToast('')}/>}</AnimatePresence>
    </>
  );
}

/* ── INSUMOS ───────────────────────────────────────────────── */
function InsumosView({searchQuery}:{searchQuery:string}) {
  const{insumos,insumosAbaixoMinimo,loading}=useInsumos(searchQuery);
  if(loading)return<LoadingSpinner label="Carregando insumos..."/>;
  return(
    <div className="space-y-5">
      <div><h2 className="text-2xl md:text-3xl font-black">Insumos & Estoque</h2><p className="text-slate-500 text-sm">{insumos.length} insumos{insumosAbaixoMinimo.length>0&&<span className="text-rose-600 font-bold ml-2">• {insumosAbaixoMinimo.length} abaixo do mínimo!</span>}</p></div>
      {insumosAbaixoMinimo.length>0&&<div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3"><AlertTriangle size={17} className="text-rose-500 mt-0.5 shrink-0"/><div><p className="font-bold text-rose-700 text-sm">Estoque Baixo</p><p className="text-rose-600 text-sm">{insumosAbaixoMinimo.map(i=>i.nome).join(', ')}</p></div></div>}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left min-w-[650px]">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{['Insumo','Tipo','Unidade','Custo Unit.','Estoque','Mínimo','Status'].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {insumos.length===0&&<tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Nenhum insumo.</td></tr>}
            {insumos.map(i=>{const b=i.estoque_atual<=i.estoque_minimo;return(
              <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4 font-bold text-slate-800 text-sm">{i.nome}</td>
                <td className="px-5 py-4"><span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{i.tipo}</span></td>
                <td className="px-5 py-4 text-sm text-slate-500">{i.unidade_medida}</td>
                <td className="px-5 py-4 font-bold text-slate-700 text-sm">R$ {Number(i.custo_unitario).toFixed(4)}</td>
                <td className={cn('px-5 py-4 font-black text-sm',b?'text-rose-600':'text-slate-700')}>{Number(i.estoque_atual).toFixed(2)}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{Number(i.estoque_minimo).toFixed(2)}</td>
                <td className="px-5 py-4">{b?<span className="flex items-center gap-1 text-rose-600 text-xs font-bold"><AlertCircle size={13}/>Repor</span>:<span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 size={13}/>OK</span>}</td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── CLIENTES ──────────────────────────────────────────────── */
function ClientesView({searchQuery,onAdd}:{searchQuery:string;onAdd:()=>void}) {
  const{clientes,loading}=useClientes(searchQuery);
  const{user}=useAuth();
  if(loading)return<LoadingSpinner label="Carregando clientes..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Clientes</h2><p className="text-slate-500 text-sm">{clientes.length} clientes</p></div>
        {user?.role==='admin'&&<button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"><Plus size={15} strokeWidth={3}/>Novo Cliente</button>}
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left min-w-[560px]">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{['Cliente','CPF/CNPJ','Cidade','WhatsApp','Ações'].map(h=><th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.length===0&&<tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Nenhum cliente.</td></tr>}
            {clientes.map(c=>(
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-800 text-sm"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">{c.nome.charAt(0).toUpperCase()}</div>{c.nome}</div></td>
                <td className="px-6 py-4 text-sm text-slate-500">{c.cpf_cnpj||'—'}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{c.cidade||'—'}</td>
                <td className="px-6 py-4">{c.whatsapp?<a href={`https://wa.me/55${c.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline"><MessageSquare size={13}/>{c.whatsapp}</a>:<span className="text-slate-300 text-sm">—</span>}</td>
                <td className="px-6 py-4"><button className="text-indigo-600 font-bold text-sm hover:underline">Ver Perfil</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── FORNECEDORES ──────────────────────────────────────────── */
function FornecedoresView({searchQuery,onAdd}:{searchQuery:string;onAdd:()=>void}) {
  const{fornecedores,loading}=useFornecedores(searchQuery);
  if(loading)return<LoadingSpinner label="Carregando fornecedores..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Fornecedores</h2><p className="text-slate-500 text-sm">{fornecedores.length} fornecedores</p></div>
        <button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><Plus size={15} strokeWidth={3}/>Novo Fornecedor</button>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left min-w-[560px]">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{['Fornecedor','CNPJ','Contato','WhatsApp','Ações'].map(h=><th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {fornecedores.length===0&&<tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Nenhum fornecedor.</td></tr>}
            {fornecedores.map(f=>(
              <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-800 text-sm">{f.nome}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{f.cnpj||'—'}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{f.contato||'—'}</td>
                <td className="px-6 py-4">{f.whatsapp?<a href={`https://wa.me/55${f.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline"><MessageSquare size={13}/>{f.whatsapp}</a>:<span className="text-slate-300 text-sm">—</span>}</td>
                <td className="px-6 py-4"><button className="text-indigo-600 font-bold text-sm hover:underline">Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── COMPRAS ───────────────────────────────────────────────── */
function ComprasView({searchQuery,onAdd,onAbrirDetalhe}:{searchQuery:string;onAdd:()=>void;onAbrirDetalhe:(c:Compra)=>void}) {
  const[compras,setCompras]=useState<Compra[]>([]);
  const[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);const{data}=await supabase.from('compras').select('*').order('created_at',{ascending:false});setCompras(data||[]);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);
  const f=compras.filter(c=>c.fornecedor_nome?.toLowerCase().includes(searchQuery.toLowerCase()));
  if(loading)return<LoadingSpinner label="Carregando compras..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Compras</h2><p className="text-slate-500 text-sm">{f.length} registros</p></div>
        <button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><Plus size={15} strokeWidth={3}/>Nova Compra</button>
      </div>
      {f.length===0?(
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center gap-4 text-slate-300"><Truck size={48}/><p className="font-black text-slate-400 text-lg uppercase tracking-widest">Nenhuma compra</p><p className="text-slate-400 text-sm">Clique em "Nova Compra" para registrar.</p></div>
      ):(
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">{['Fornecedor','Data','Nota Fiscal','Total','Status','Ações'].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {f.map(c=>(
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-800 text-sm">{c.fornecedor_nome}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{c.data?new Date(c.data).toLocaleDateString('pt-BR'):'—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{c.nota_fiscal||'—'}</td>
                  <td className="px-5 py-4 font-black text-indigo-600 text-sm">R$ {Number(c.total||0).toFixed(2)}</td>
                  <td className="px-5 py-4">
                    <BadgeStatus status={c.status||'Pendente'} options={STATUS_COMPRA} onChange={async s=>{await supabase.from('compras').update({status:s}).eq('id',c.id);load();}}/>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={()=>onAbrirDetalhe(c)} className="text-indigo-600 font-bold text-sm hover:underline">Detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── DETALHE COMPRA (status + itens + enviar p/ contas a pagar) ── */
function ModalDetalheCompra({compra,onClose}:{compra:Compra;onClose:()=>void}) {
  const[status,setStatus]=useState(compra.status||'Pendente');
  const[itens,setItens]=useState<any[]>(compra.itens||[]);
  const[salvando,setSalvando]=useState(false);
  const[toast,setToast]=useState('');
  const[toastColor,setToastColor]=useState<'emerald'|'indigo'|'rose'>('emerald');
  const total=itens.reduce((a,i)=>a+i.quantidade*i.valor_unitario,0);

  const addLinha=()=>setItens(p=>[...p,{id:crypto.randomUUID(),descricao:'',quantidade:1,valor_unitario:0}]);
  const upd=(id:string,k:string,v:any)=>setItens(p=>p.map(i=>i.id===id?{...i,[k]:v}:i));
  const del=(id:string)=>setItens(p=>p.filter(i=>i.id!==id));

  const salvar=async()=>{
    setSalvando(true);
    await supabase.from('compras').update({status,itens,total,updated_at:new Date().toISOString()}).eq('id',compra.id);
    setSalvando(false);setToast('Compra salva!');setToastColor('emerald');
  };

  const enviarContasPagar=async()=>{
    if(!confirm('Lançar esta compra em Contas a Pagar?'))return;
    setSalvando(true);
    await supabase.from('contas_pagar').insert({
      compra_id:compra.id,
      fornecedor_nome:compra.fornecedor_nome,
      descricao:`Compra de ${compra.fornecedor_nome}${compra.nota_fiscal?' — NF '+compra.nota_fiscal:''}`,
      valor:total||compra.total,
      data_vencimento:compra.data||null,
      status:'Aguardando',
    });
    await supabase.from('compras').update({status:'Recebido'}).eq('id',compra.id);
    setSalvando(false);setToast('Lançado em Contas a Pagar! ✅');setToastColor('indigo');setTimeout(onClose,1800);
  };

  return(
    <>
    <ModalWrapper title={`Compra — ${compra.fornecedor_nome}`} onClose={onClose} size="lg">
      <div className="bg-slate-50 rounded-2xl p-4 flex flex-wrap gap-4 justify-between items-start">
        <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">Fornecedor</p><p className="font-black text-slate-800">{compra.fornecedor_nome}</p></div>
        <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">Status</p><BadgeStatus status={status} options={STATUS_COMPRA} onChange={setStatus}/></div>
        <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">Data</p><p className="font-bold text-sm text-slate-700">{compra.data?new Date(compra.data).toLocaleDateString('pt-BR'):'—'}</p></div>
        <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">Total</p><p className="font-black text-indigo-600 text-lg">R$ {total.toFixed(2)}</p></div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-xs font-black text-slate-500 uppercase">Itens Comprados</p>
          <button onClick={addLinha} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><Plus size={11}/>Adicionar linha</button>
        </div>
        <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[440px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase">Descrição</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400 uppercase w-16">Qtd</th>
              <th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400 uppercase w-28">Vlr Unit (R$)</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-black text-slate-400 uppercase w-24">Total</th>
              <th className="w-8"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map((item,idx)=>(
                <tr key={item.id||idx}>
                  <td className="px-3 py-2"><input type="text" value={item.descricao||''} onChange={e=>upd(item.id||idx,'descricao',e.target.value)} className="w-full text-sm bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                  <td className="px-3 py-2"><input type="number" min="1" value={item.quantidade} onChange={e=>upd(item.id||idx,'quantidade',Number(e.target.value))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                  <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={item.valor_unitario} onChange={e=>upd(item.id||idx,'valor_unitario',Number(e.target.value))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                  <td className="px-3 py-2 text-right font-black text-indigo-600 text-sm">R$ {(item.quantidade*item.valor_unitario).toFixed(2)}</td>
                  <td className="px-3 py-2"><button onClick={()=>del(item.id||idx)} className="text-slate-300 hover:text-rose-500"><Trash2 size={13}/></button></td>
                </tr>
              ))}
              {itens.length===0&&<tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Nenhum item. Clique em "Adicionar linha".</td></tr>}
            </tbody>
            <tfoot><tr className="bg-indigo-50 border-t-2 border-indigo-100">
              <td colSpan={3} className="px-3 py-3 text-right font-black text-slate-600 text-sm uppercase">Total:</td>
              <td className="px-3 py-3 text-right font-black text-indigo-700 text-base">R$ {total.toFixed(2)}</td>
              <td></td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={salvar} disabled={salvando} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all">
          {salvando?'Salvando...':'💾 Salvar Alterações'}
        </button>
      </div>
      <button onClick={enviarContasPagar} disabled={salvando}
        className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2">
        <TrendingDown size={16}/>Enviar para Contas a Pagar
      </button>
    </ModalWrapper>
    <AnimatePresence>{toast&&<Toast message={toast} color={toastColor} onClose={()=>setToast('')}/>}</AnimatePresence>
    </>
  );
}

/* ── CONTAS A RECEBER ──────────────────────────────────────── */
function ContasReceberView() {
  const[contas,setContas]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);const{data}=await supabase.from('contas_receber').select('*').order('created_at',{ascending:false});setContas(data||[]);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);
  const total=contas.filter(c=>c.status==='Aguardando').reduce((a,c)=>a+Number(c.valor),0);
  const recebido=contas.filter(c=>c.status==='Recebido').reduce((a,c)=>a+Number(c.valor),0);
  if(loading)return<LoadingSpinner label="Carregando contas a receber..."/>;
  return(
    <div className="space-y-5">
      <div><h2 className="text-2xl md:text-3xl font-black">Contas a Receber</h2><p className="text-slate-500 text-sm">Gerado automaticamente ao transformar orçamentos em vendas</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">A Receber</p><p className="text-2xl font-black text-amber-600">R$ {total.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Recebido</p><p className="text-2xl font-black text-emerald-600">R$ {recebido.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Total de Registros</p><p className="text-2xl font-black text-slate-700">{contas.length}</p></div>
      </div>
      {contas.length===0?(
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center gap-4 text-slate-300"><TrendingUp size={48}/><p className="font-black text-slate-400 text-lg uppercase tracking-widest">Nenhuma conta</p><p className="text-slate-400 text-sm">Transforme um orçamento em venda no CRM/Kanban.</p></div>
      ):(
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">{['Cliente','Descrição','Valor','Vencimento','Status'].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {contas.map(c=>(
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-800 text-sm">{c.cliente_nome}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{c.descricao}</td>
                  <td className="px-5 py-4 font-black text-emerald-600 text-sm">R$ {Number(c.valor).toFixed(2)}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{c.data_vencimento?new Date(c.data_vencimento).toLocaleDateString('pt-BR'):'—'}</td>
                  <td className="px-5 py-4"><BadgeStatus status={c.status||'Aguardando'} options={STATUS_CR} onChange={async s=>{await supabase.from('contas_receber').update({status:s,data_recebimento:s==='Recebido'?new Date().toISOString():null}).eq('id',c.id);load();}}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── CONTAS A PAGAR ────────────────────────────────────────── */
function ContasPagarView() {
  const[contas,setContas]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const load=useCallback(async()=>{setLoading(true);const{data}=await supabase.from('contas_pagar').select('*').order('created_at',{ascending:false});setContas(data||[]);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);
  const total=contas.filter(c=>c.status==='Aguardando').reduce((a,c)=>a+Number(c.valor),0);
  const pago=contas.filter(c=>c.status==='Pago').reduce((a,c)=>a+Number(c.valor),0);
  if(loading)return<LoadingSpinner label="Carregando contas a pagar..."/>;
  return(
    <div className="space-y-5">
      <div><h2 className="text-2xl md:text-3xl font-black">Contas a Pagar</h2><p className="text-slate-500 text-sm">Gerado automaticamente ao registrar compras</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">A Pagar</p><p className="text-2xl font-black text-rose-600">R$ {total.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Pago</p><p className="text-2xl font-black text-emerald-600">R$ {pago.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Total de Registros</p><p className="text-2xl font-black text-slate-700">{contas.length}</p></div>
      </div>
      {contas.length===0?(
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center gap-4 text-slate-300"><TrendingDown size={48}/><p className="font-black text-slate-400 text-lg uppercase tracking-widest">Nenhuma conta</p><p className="text-slate-400 text-sm">Envie uma compra para Contas a Pagar nos Detalhes da compra.</p></div>
      ):(
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">{['Fornecedor','Descrição','Valor','Vencimento','Status'].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {contas.map(c=>(
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-800 text-sm">{c.fornecedor_nome}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{c.descricao}</td>
                  <td className="px-5 py-4 font-black text-rose-600 text-sm">R$ {Number(c.valor).toFixed(2)}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{c.data_vencimento?new Date(c.data_vencimento).toLocaleDateString('pt-BR'):'—'}</td>
                  <td className="px-5 py-4"><BadgeStatus status={c.status||'Aguardando'} options={STATUS_CP} onChange={async s=>{await supabase.from('contas_pagar').update({status:s,data_pagamento:s==='Pago'?new Date().toISOString():null}).eq('id',c.id);load();}}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── MODAIS DE CADASTRO ────────────────────────────────────── */
function ModalNovoPedido({onClose,onAbrirNovoProduto,onAbrirNovoCliente}:{onClose:()=>void;onAbrirNovoProduto:()=>void;onAbrirNovoCliente:()=>void}) {
  const{statuses}=useKanbanStatus();const{criarPedido}=usePedidos();const{clientes}=useClientes();
  const[produtos,setProdutos]=useState<Produto[]>([]);
  const[buscaCli,setBuscaCli]=useState('');const[cli,setCli]=useState<Cliente|null>(null);const[showCli,setShowCli]=useState(false);const cliRef=useRef<HTMLDivElement>(null);
  const[buscaProd,setBuscaProd]=useState('');const[showProd,setShowProd]=useState(false);const prodRef=useRef<HTMLDivElement>(null);
  const[itens,setItens]=useState<any[]>([]);
  const[form,setForm]=useState({data_entrega:'',observacoes:''});
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  const si=statuses.find(s=>s.ordem===1);
  useEffect(()=>{supabase.from('produtos').select('*').eq('ativo',true).order('nome').then(({data})=>setProdutos(data||[]));},[]);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(cliRef.current&&!cliRef.current.contains(e.target as Node))setShowCli(false);if(prodRef.current&&!prodRef.current.contains(e.target as Node))setShowProd(false);};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);
  const clisFilt=clientes.filter(c=>c.nome.toLowerCase().includes(buscaCli.toLowerCase())&&buscaCli.length>0).slice(0,6);
  const prodsFilt=produtos.filter(p=>p.nome.toLowerCase().includes(buscaProd.toLowerCase())&&buscaProd.length>0).slice(0,6);
  const total=itens.reduce((a,i)=>a+i.quantidade*i.preco_unitario,0);
  const addItem=(p:Produto)=>{setItens(prev=>[...prev,{id:crypto.randomUUID(),produto_id:p.id,descricao_custom:p.descricao||p.nome,quantidade:1,preco_unitario:0,custo_unitario:0}]);setBuscaProd('');setShowProd(false);};
  const addManual=()=>{setItens(prev=>[...prev,{id:crypto.randomUUID(),produto_id:null,descricao_custom:buscaProd||'',quantidade:1,preco_unitario:0,custo_unitario:0}]);setBuscaProd('');setShowProd(false);};
  const upd=(id:string,k:string,v:any)=>setItens(prev=>prev.map(i=>i.id===id?{...i,[k]:v}:i));
  const del=(id:string)=>setItens(prev=>prev.filter(i=>i.id!==id));
  const salvar=async()=>{
    const nome=cli?.nome||buscaCli.trim();if(!nome){setErro('Informe o cliente.');return;}if(!si){setErro('Aguarde...');return;}
    setSalvando(true);
    const{data:pedido,error}=await criarPedido({cliente_id:cli?.id,cliente_nome_avulso:cli?undefined:nome,cliente_contato_avulso:cli?.whatsapp||undefined,status_id:si.id,data_entrega:form.data_entrega||undefined,observacoes:form.observacoes||undefined});
    if(error||!pedido){setErro('Erro: '+(error?.message||''));setSalvando(false);return;}
    const linhas=itens.filter(i=>i.descricao_custom?.trim()||i.produto_id);
    if(linhas.length>0)await supabase.from('itens_pedido').insert(linhas.map(({id,...rest})=>({pedido_id:(pedido as any).id,...rest})));
    setToast('Orçamento criado!');setTimeout(onClose,1800);
  };
  return(
    <>
    <ModalWrapper title="Novo Orçamento" onClose={onClose} size="lg">
      {erro&&<MsgErro msg={erro}/>}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between"><p className="text-xs font-black text-slate-500 uppercase">Cliente</p><button onClick={onAbrirNovoCliente} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"><Plus size={11}/>Cadastrar novo</button></div>
        <div className="relative" ref={cliRef}>
          <input type="text" placeholder="Buscar cliente ou digitar nome avulso..." className={inputClass} value={cli?cli.nome:buscaCli} onChange={e=>{setBuscaCli(e.target.value);setCli(null);setShowCli(true);}} onFocus={()=>setShowCli(true)}/>
          {cli&&<button onClick={()=>{setCli(null);setBuscaCli('');}} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X size={15}/></button>}
          {showCli&&clisFilt.length>0&&<div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">{clisFilt.map(c=><button key={c.id} onClick={()=>{setCli(c);setBuscaCli('');setShowCli(false);}} className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-center gap-3"><div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">{c.nome.charAt(0)}</div><div><p className="font-bold text-sm">{c.nome}</p><p className="text-xs text-slate-400">{c.whatsapp||'—'}</p></div></button>)}</div>}
        </div>
        {cli&&<p className="flex items-center gap-2 text-xs text-emerald-600 font-bold"><CheckCircle2 size={13}/>Cliente: {cli.nome}{cli.whatsapp&&` • ${cli.whatsapp}`}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo label="Data de Entrega"><input type="date" value={form.data_entrega} onChange={e=>setForm({...form,data_entrega:e.target.value})} className={inputClass}/></Campo>
        <Campo label="Observações"><input type="text" placeholder="Arte, cores..." value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} className={inputClass}/></Campo>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><p className="text-xs font-black text-slate-500 uppercase">Itens do Orçamento</p><button onClick={onAbrirNovoProduto} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"><Plus size={11}/>Cadastrar novo produto</button></div>
        <div className="relative" ref={prodRef}>
          <input type="text" placeholder="Buscar produto ou digitar item manualmente..." className={inputClass} value={buscaProd} onChange={e=>{setBuscaProd(e.target.value);setShowProd(true);}} onFocus={()=>setShowProd(true)}/>
          {showProd&&buscaProd.length>0&&(
            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
              {prodsFilt.length>0
                ?<>{prodsFilt.map(p=><button key={p.id} onClick={()=>addItem(p)} className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center justify-between"><div><p className="font-bold text-sm">{p.nome}</p><p className="text-xs text-slate-400">{p.categoria}</p></div><Plus size={14} className="text-indigo-400"/></button>)}
                  <button onClick={addManual} className="w-full text-left px-4 py-3 border-t border-slate-100 hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-500"><Plus size={13}/>Adicionar "{buscaProd}" manualmente</button></>
                :<div className="p-4"><p className="text-sm text-slate-500 mb-2">Produto não encontrado.</p><button onClick={addManual} className="flex items-center gap-2 text-sm text-indigo-600 font-bold hover:underline"><Plus size={13}/>Adicionar "{buscaProd}" manualmente</button></div>
              }
            </div>
          )}
        </div>
        {itens.length>0?(
          <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[460px]">
              <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase">Descrição</th><th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400 uppercase w-16">Qtd</th><th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400 uppercase w-28">Vlr Unit (R$)</th><th className="px-3 py-2.5 text-right text-[10px] font-black text-slate-400 uppercase w-24">Total</th><th className="w-8"></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {itens.map(item=>(
                  <tr key={item.id}>
                    <td className="px-3 py-2"><input type="text" value={item.descricao_custom||''} onChange={e=>upd(item.id,'descricao_custom',e.target.value)} placeholder="Descrição" className="w-full text-sm bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                    <td className="px-3 py-2"><input type="number" min="1" value={item.quantidade} onChange={e=>upd(item.id,'quantidade',Math.max(1,Number(e.target.value)))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                    <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={item.preco_unitario} onChange={e=>upd(item.id,'preco_unitario',Number(e.target.value))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                    <td className="px-3 py-2 text-right font-black text-indigo-600 text-sm">R$ {(item.quantidade*item.preco_unitario).toFixed(2)}</td>
                    <td className="px-3 py-2"><button onClick={()=>del(item.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={13}/></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-indigo-50 border-t-2 border-indigo-100"><td colSpan={3} className="px-3 py-3 text-right font-black text-slate-600 text-sm uppercase">Total:</td><td className="px-3 py-3 text-right font-black text-indigo-700">R$ {total.toFixed(2)}</td><td></td></tr></tfoot>
            </table>
          </div>
        ):(
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">Busque um produto acima ou adicione manualmente</div>
        )}
      </div>
      <BotaoSalvar onClick={salvar} loading={salvando} label={`Criar Orçamento${total>0?' — R$ '+total.toFixed(2):''}`}/>
    </ModalWrapper>
    <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence>
    </>
  );
}

function ModalNovoProduto({onClose}:{onClose:()=>void}) {
  const[form,setForm]=useState({nome:'',descricao:'',categoria:'kit',markup:'2.5',mao:'25'});
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  const salvar=async()=>{if(!form.nome.trim()){setErro('Nome obrigatório.');return;}setSalvando(true);const{error}=await supabase.from('produtos').insert({nome:form.nome,descricao:form.descricao||null,categoria:form.categoria,markup_sugerido:Number(form.markup)||2.5,custo_mao_obra_hora:Number(form.mao)||25,ativo:true});if(error){setErro('Erro: '+error.message);setSalvando(false);}else{setToast('Produto cadastrado! Busque no orçamento.');setTimeout(onClose,2000);}};
  return(<><ModalWrapper title="Cadastrar Produto" onClose={onClose}>{erro&&<MsgErro msg={erro}/>}<div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-sm text-indigo-700">💡 Após cadastrar, feche e busque no orçamento.</div><Campo label="Nome *"><input type="text" placeholder="Ex: Kit Festa Safari" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo><Campo label="Descrição"><input type="text" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} className={inputClass}/></Campo><div className="grid grid-cols-3 gap-3"><Campo label="Categoria"><select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} className={inputClass}><option value="kit">Kit</option><option value="adesivo">Adesivo</option><option value="impresso">Impresso</option><option value="personalizado">Personalizado</option></select></Campo><Campo label="Markup (×)"><input type="number" step="0.1" min="1" value={form.markup} onChange={e=>setForm({...form,markup:e.target.value})} className={inputClass}/></Campo><Campo label="MO/hora (R$)"><input type="number" step="0.5" min="0" value={form.mao} onChange={e=>setForm({...form,mao:e.target.value})} className={inputClass}/></Campo></div><BotaoSalvar onClick={salvar} loading={salvando} label="Cadastrar Produto"/></ModalWrapper><AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

function ModalNovoCliente({onClose}:{onClose:()=>void}) {
  const{criarCliente}=useClientes();
  const[form,setForm]=useState({nome:'',cpf_cnpj:'',email:'',telefone:'',whatsapp:'',cidade:'',estado:''});
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  const salvar=async()=>{if(!form.nome.trim()){setErro('Nome obrigatório.');return;}setSalvando(true);const{error}=await criarCliente(form);if(error){setErro('Erro: '+error.message);setSalvando(false);}else{setToast('Cliente salvo! ✅');setTimeout(onClose,1800);}};
  return(<><ModalWrapper title="Novo Cliente" onClose={onClose}>{erro&&<MsgErro msg={erro}/>}<Campo label="Nome *"><input type="text" placeholder="Ex: Maria Silva" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo><div className="grid grid-cols-2 gap-4"><Campo label="CPF / CNPJ"><input type="text" value={form.cpf_cnpj} onChange={e=>setForm({...form,cpf_cnpj:e.target.value})} className={inputClass}/></Campo><Campo label="WhatsApp"><input type="text" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} className={inputClass}/></Campo></div><Campo label="E-mail"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inputClass}/></Campo><div className="grid grid-cols-2 gap-4"><Campo label="Cidade"><input type="text" value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})} className={inputClass}/></Campo><Campo label="Estado"><input type="text" maxLength={2} value={form.estado} onChange={e=>setForm({...form,estado:e.target.value.toUpperCase()})} className={inputClass}/></Campo></div><BotaoSalvar onClick={salvar} loading={salvando} label="Salvar Cliente"/></ModalWrapper><AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

function ModalNovoFornecedor({onClose}:{onClose:()=>void}) {
  const{criarFornecedor}=useFornecedores();
  const[form,setForm]=useState({nome:'',cnpj:'',contato:'',telefone:'',whatsapp:'',email:'',cidade:''});
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  const salvar=async()=>{if(!form.nome.trim()){setErro('Nome obrigatório.');return;}setSalvando(true);const{error}=await criarFornecedor(form);if(error){setErro('Erro: '+error.message);setSalvando(false);}else{setToast('Fornecedor salvo! ✅');setTimeout(onClose,1800);}};
  return(<><ModalWrapper title="Novo Fornecedor" onClose={onClose}>{erro&&<MsgErro msg={erro}/>}<Campo label="Nome *"><input type="text" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo><div className="grid grid-cols-2 gap-4"><Campo label="CNPJ"><input type="text" value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})} className={inputClass}/></Campo><Campo label="Contato"><input type="text" value={form.contato} onChange={e=>setForm({...form,contato:e.target.value})} className={inputClass}/></Campo></div><div className="grid grid-cols-2 gap-4"><Campo label="WhatsApp"><input type="text" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} className={inputClass}/></Campo><Campo label="E-mail"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inputClass}/></Campo></div><Campo label="Cidade"><input type="text" value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})} className={inputClass}/></Campo><BotaoSalvar onClick={salvar} loading={salvando} label="Salvar Fornecedor"/></ModalWrapper><AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

function ModalNovaCompra({onClose}:{onClose:()=>void}) {
  const{fornecedores}=useFornecedores();
  const[buscaF,setBuscaF]=useState('');const[forn,setForn]=useState<any|null>(null);const[showF,setShowF]=useState(false);const fRef=useRef<HTMLDivElement>(null);
  const[itens,setItens]=useState([{id:crypto.randomUUID(),descricao:'',quantidade:1,valor_unitario:0}]);
  const[form,setForm]=useState({data:new Date().toISOString().split('T')[0],nota_fiscal:'',observacoes:''});
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  useEffect(()=>{const h=(e:MouseEvent)=>{if(fRef.current&&!fRef.current.contains(e.target as Node))setShowF(false);};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);
  const fornFilt=fornecedores.filter(f=>f.nome.toLowerCase().includes(buscaF.toLowerCase())&&buscaF.length>0).slice(0,6);
  const total=itens.reduce((a,i)=>a+i.quantidade*i.valor_unitario,0);
  const addL=()=>setItens(p=>[...p,{id:crypto.randomUUID(),descricao:'',quantidade:1,valor_unitario:0}]);
  const upd=(id:string,k:string,v:any)=>setItens(p=>p.map(i=>i.id===id?{...i,[k]:v}:i));
  const del=(id:string)=>setItens(p=>p.filter(i=>i.id!==id));
  const salvar=async()=>{const nome=forn?.nome||buscaF.trim();if(!nome){setErro('Informe o fornecedor.');return;}if(itens.every(i=>!i.descricao.trim())){setErro('Adicione ao menos um item.');return;}setSalvando(true);const{error}=await supabase.from('compras').insert({fornecedor_id:forn?.id||null,fornecedor_nome:nome,data:form.data,nota_fiscal:form.nota_fiscal||null,observacoes:form.observacoes||null,total,status:'Pendente',itens:itens.filter(i=>i.descricao.trim())});if(error){setErro('Erro: '+error.message);setSalvando(false);}else{setToast('Compra registrada! ✅');setTimeout(onClose,1800);}};
  return(
    <>
    <ModalWrapper title="Nova Compra" onClose={onClose} size="lg">
      {erro&&<MsgErro msg={erro}/>}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-black text-slate-500 uppercase">Fornecedor</p>
        <div className="relative" ref={fRef}>
          <input type="text" placeholder="Buscar fornecedor ou digitar nome..." className={inputClass} value={forn?forn.nome:buscaF} onChange={e=>{setBuscaF(e.target.value);setForn(null);setShowF(true);}} onFocus={()=>setShowF(true)}/>
          {forn&&<button onClick={()=>{setForn(null);setBuscaF('');}} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X size={15}/></button>}
          {showF&&fornFilt.length>0&&<div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">{fornFilt.map(f=><button key={f.id} onClick={()=>{setForn(f);setBuscaF('');setShowF(false);}} className="w-full text-left px-4 py-3 hover:bg-indigo-50"><p className="font-bold text-sm">{f.nome}</p><p className="text-xs text-slate-400">{f.cnpj||'—'}</p></button>)}</div>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Data"><input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} className={inputClass}/></Campo>
        <Campo label="Nota Fiscal"><input type="text" placeholder="NF-e 000123" value={form.nota_fiscal} onChange={e=>setForm({...form,nota_fiscal:e.target.value})} className={inputClass}/></Campo>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center"><p className="text-xs font-black text-slate-500 uppercase">Itens</p><button onClick={addL} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><Plus size={11}/>Adicionar linha</button></div>
        <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[440px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase">Descrição</th><th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400 uppercase w-16">Qtd</th><th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400 uppercase w-28">Vlr Unit (R$)</th><th className="px-3 py-2.5 text-right text-[10px] font-black text-slate-400 uppercase w-24">Total</th><th className="w-8"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map(item=>(
                <tr key={item.id}>
                  <td className="px-3 py-2"><input type="text" placeholder="Ex: Papel Offset 90g" value={item.descricao} onChange={e=>upd(item.id,'descricao',e.target.value)} className="w-full text-sm bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                  <td className="px-3 py-2"><input type="number" min="1" value={item.quantidade} onChange={e=>upd(item.id,'quantidade',Number(e.target.value))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                  <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={item.valor_unitario} onChange={e=>upd(item.id,'valor_unitario',Number(e.target.value))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none py-0.5"/></td>
                  <td className="px-3 py-2 text-right font-black text-indigo-600 text-sm">R$ {(item.quantidade*item.valor_unitario).toFixed(2)}</td>
                  <td className="px-3 py-2"><button onClick={()=>del(item.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={13}/></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-indigo-50 border-t-2 border-indigo-100"><td colSpan={3} className="px-3 py-3 text-right font-black text-slate-600 text-sm uppercase">Total:</td><td className="px-3 py-3 text-right font-black text-indigo-700">R$ {total.toFixed(2)}</td><td></td></tr></tfoot>
          </table>
        </div>
      </div>
      <Campo label="Observações"><input type="text" value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} className={inputClass}/></Campo>
      <BotaoSalvar onClick={salvar} loading={salvando} label={`Registrar Compra — R$ ${total.toFixed(2)}`}/>
    </ModalWrapper>
    <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence>
    </>
  );
}

/* ── CONFIG ────────────────────────────────────────────────── */
function ConfigView() {
  return(
    <div className="space-y-5 max-w-2xl">
      <div><h2 className="text-2xl md:text-3xl font-black">Configurações</h2><p className="text-slate-500 text-sm">Acesso e permissões</p></div>
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100"><h3 className="font-black text-slate-800">Controle de Acesso</h3></div>
        {[{r:'Administrador',t:'admin',ic:<Shield size={20} className="text-indigo-600"/>,bg:'bg-indigo-50',tbg:'bg-indigo-100 text-indigo-600',p:['CRM/Kanban','Insumos','Clientes','Fornecedores','C. Receber','Compras','C. Pagar','Config'],u:'Admin Point',s:'admin123'},{r:'Colaborador',t:'colaborador',ic:<UserCheck size={20} className="text-emerald-600"/>,bg:'bg-emerald-50',tbg:'bg-emerald-100 text-emerald-600',p:['CRM/Kanban','Clientes','Compras'],u:'Colaborador',s:'colab123'}].map(r=>(
          <div key={r.t} className="p-5 border-b border-slate-100 flex items-start gap-4">
            <div className={cn('p-3 rounded-2xl shrink-0',r.bg)}>{r.ic}</div>
            <div className="flex-1"><div className="flex items-center gap-2 mb-2"><p className="font-black text-slate-800">{r.r}</p><span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full',r.tbg)}>{r.t}</span></div><div className="flex flex-wrap gap-1.5 mb-2">{r.p.map(p=><span key={p} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{p}</span>)}</div><p className="text-xs text-slate-400 font-mono">Login: <b>{r.u}</b> / Senha: <b>{r.s}</b></p></div>
          </div>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5"/>
        <p className="text-sm text-amber-700">Para usuários com e-mail/senha próprios, ative o <b>Supabase Auth</b>.</p>
      </div>
    </div>
  );
}

/* ── AUXILIARES ────────────────────────────────────────────── */
function ModalWrapper({title,onClose,children,size='md'}:{title:string;onClose:()=>void;children:React.ReactNode;size?:'md'|'lg'}) {
  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}} transition={{duration:0.15}} className={cn('bg-white rounded-3xl shadow-2xl overflow-hidden w-full',size==='lg'?'max-w-2xl':'max-w-lg')}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white"><h3 className="text-lg font-bold">{title}</h3><button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-all"><X size={20}/></button></div>
        <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
}
function Campo({label,children}:{label:string;children:React.ReactNode}) {
  return <div><label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>{children}</div>;
}
function BotaoSalvar({onClick,loading,label}:{onClick:()=>void;loading:boolean;label:string}) {
  return <button onClick={onClick} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all mt-2 text-sm">{loading?'Salvando...':label}</button>;
}
function LoadingSpinner({label}:{label:string}) {
  return <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/><p className="text-sm font-medium">{label}</p></div>;
}
function MsgErro({msg}:{msg:string}) {
  return <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-medium">{msg}</div>;
}
function PlaceholderView({title,icon}:{title:string;icon:React.ReactNode}) {
  return <div className="h-[60vh] flex flex-col items-center justify-center text-slate-300 space-y-4"><div className="p-8 bg-slate-100 rounded-full text-slate-200">{icon}</div><h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest">{title}</h2></div>;
}
