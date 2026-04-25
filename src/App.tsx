import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import {
  LayoutDashboard, Package, Users, Settings, Plus, Search, Printer,
  Clock, CheckCircle2, AlertCircle, FileText, ShoppingCart, Truck,
  MessageSquare, Building2, X, ArrowRight, AlertTriangle, RefreshCw,
  Trash2, Menu, ChevronLeft, LogOut, Shield, UserCheck, Eye, EyeOff,
  ChevronDown, DollarSign, TrendingUp, TrendingDown, Download, Upload, Filter,
  Landmark, CreditCard, Wallet, ArrowLeftRight, PiggyBank,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// XLSX é carregado via CDN no index.html como window.XLSX
// Isso garante compatibilidade com GitHub browser, StackBlitz e Codespaces
declare const XLSX: any;
import { cn } from './lib/utils';
import { generateBudgetPDF } from './lib/pdfGenerator';
import { useKanbanStatus, usePedidos, useClientes, useFornecedores, useInsumos } from './hooks/useSupabase';
import { supabase } from './lib/supabase';
import type { Pedido, Cliente, Produto, Compra } from './lib/supabase';

/* ── TIPOS ─────────────────────────────────────────────────── */
type ModalType = 'pedido'|'cliente'|'fornecedor'|'compra'|'novoProduto'|'novoClienteRapido'|'detalheOrc'|'detalheCompra'|'editarCliente'|'novoInsumo'|'editarInsumo'|'editarProduto'|'perfilCliente'|'editarFornecedor'|'editarCR'|'editarCP'|'novoLancamentoCaixa'|'novaContaReceber'|'novaContaPagar'|'novoUsuario'|'editarUsuario'|'novaContaBancaria'|'editarContaBancaria'|'transferenciaContas'|null;
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
  const[email,setEmail]=useState('');
  const[senha,setSenha]=useState('');
  const[erro,setErro]=useState('');
  const[ver,setVer]=useState(false);
  const[loading,setLoading]=useState(false);

  const login=async()=>{
    if(!email.trim()||!senha.trim()){setErro('Preencha e-mail e senha.');return;}
    setLoading(true);setErro('');
    // Try database users first
    const{data,error}=await supabase.from('usuarios_sistema')
      .select('*').eq('email',email.toLowerCase().trim()).eq('ativo',true).single();
    if(!error&&data&&data.senha_hash===senha){
      setLoading(false);
      onLogin({nome:data.nome,role:data.role as UserRole});
      return;
    }
    // Fallback to local list (while table doesn't exist)
    const u=USUARIOS.find(u=>u.nome.toLowerCase()===email.toLowerCase().trim()&&u.senha===senha);
    if(u){setLoading(false);onLogin({nome:u.nome,role:u.role});return;}
    setLoading(false);setErro('E-mail ou senha incorretos.');
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
          <Campo label="E-mail">
            <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} className={inputClass}/>
          </Campo>
          <Campo label="Senha">
            <div className="relative">
              <input type={ver?'text':'password'} placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} className={inputClass+' pr-10'}/>
              <button onClick={()=>setVer(!ver)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">{ver?<EyeOff size={16}/>:<Eye size={16}/>}</button>
            </div>
          </Campo>
          <button onClick={login} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 mt-2">
            {loading?'Verificando...':'Entrar'}
          </button>
        </div>
        <div className="mt-6 p-4 bg-slate-50 rounded-2xl space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acesso inicial</p>
          <p className="text-xs text-slate-500 flex items-center gap-2"><Shield size={12} className="text-indigo-500"/>E-mail: <b>admin@point.com</b> / Senha: <b>admin123</b></p>
          <p className="text-xs text-slate-400 mt-1">Após executar o SQL, cadastre novos usuários em Configurações.</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ── APP ROOT ──────────────────────────────────────────────── */
export default function App() {
  // ── TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER RETURN CONDICIONAL ──
  const[user,setUser]=useState<AppUser|null>(()=>{
    try{const s=sessionStorage.getItem('point_user');return s?JSON.parse(s):null;}catch{return null;}
  });
  const[activeTab,setActiveTab]=useState('kanban');
  const[searchQuery,setSearchQuery]=useState('');
  const[modal,setModal]=useState<ModalType>(null);
  const[sidebarOpen,setSidebarOpen]=useState(false);
  const[pedidoSelecionado,setPedidoSelecionado]=useState<Pedido|null>(null);
  const[compraSelecionada,setCompraSelecionada]=useState<Compra|null>(null);
  const[clienteSelecionadoEdit,setClienteSelecionadoEdit]=useState<any|null>(null);
  const[fornecedorSelecionadoEdit,setFornecedorSelecionadoEdit]=useState<any|null>(null);
  const[insumoSelecionadoEdit,setInsumoSelecionadoEdit]=useState<any|null>(null);
  const[produtoSelecionadoEdit,setProdutoSelecionadoEdit]=useState<any|null>(null);
  const[crSelecionado,setCrSelecionado]=useState<any|null>(null);
  const[cpSelecionado,setCpSelecionado]=useState<any|null>(null);
  const[usuarioSelecionado,setUsuarioSelecionado]=useState<any|null>(null);
  const[contasKey,setContasKey]=useState(0);
  const[caixaKey,setCaixaKey]=useState(0);
  const[bancarioKey,setBancarioKey]=useState(0);
  const[contaBancariaSelecionada,setContaBancariaSelecionada]=useState<any|null>(null);
  // Estas chaves PRECISAM estar antes do early return — estavam depois e causavam o bug de tela branca
  const[globalKey,setGlobalKey]=useState(0);
  const[comprasKey,setComprasKey]=useState(0);
  const[kanbanKey,setKanbanKey]=useState(0);

  // Reload data when tab becomes visible
  useEffect(()=>{
    const handler=()=>{
      if(document.visibilityState==='visible'){
        setContasKey(k=>k+1);setKanbanKey(k=>k+1);setCaixaKey(k=>k+1);
        setComprasKey(k=>k+1);setBancarioKey(k=>k+1);setGlobalKey(k=>k+1);
      }
    };
    document.addEventListener('visibilitychange',handler);
    return()=>document.removeEventListener('visibilitychange',handler);
  },[]);

  const login=(u:AppUser)=>{
    sessionStorage.setItem('point_user',JSON.stringify(u));
    window.history.replaceState(null,'',window.location.pathname);
    setActiveTab('kanban');
    setModal(null);
    setSidebarOpen(false);
    setSearchQuery('');
    setGlobalKey(k=>k+1);
    setKanbanKey(k=>k+1);
    setContasKey(k=>k+1);
    setCaixaKey(k=>k+1);
    setBancarioKey(k=>k+1);
    setComprasKey(k=>k+1);
    setUser({...u});
  };

  const logout=()=>{
    sessionStorage.removeItem('point_user');
    window.history.replaceState(null,'',window.location.pathname);
    setActiveTab('kanban');
    setModal(null);
    setSidebarOpen(false);
    setSearchQuery('');
    setPedidoSelecionado(null);
    setCompraSelecionada(null);
    setClienteSelecionadoEdit(null);
    setFornecedorSelecionadoEdit(null);
    setInsumoSelecionadoEdit(null);
    setProdutoSelecionadoEdit(null);
    setCrSelecionado(null);
    setCpSelecionado(null);
    setContaBancariaSelecionada(null);
    setGlobalKey(0);setKanbanKey(0);setContasKey(0);setCaixaKey(0);setBancarioKey(0);setComprasKey(0);
    setUser(null);
  };

  // Early return DEPOIS de todos os hooks
  if(!user) return <TelaLogin onLogin={login}/>;

  const isAdmin=user.role==='admin';
  const tabs=[
    {id:'kanban',       label:'CRM / Kanban',      icon:<LayoutDashboard size={20}/>, roles:['admin','colaborador']},
    {id:'insumos',      label:'Insumos & Estoque',  icon:<Package size={20}/>,         roles:['admin']},
    {id:'produtos',     label:'Produtos & Kits',    icon:<ShoppingCart size={20}/>,    roles:['admin']},
    {id:'clientes',     label:'Clientes',           icon:<Users size={20}/>,           roles:['admin','colaborador']},
    {id:'fornecedores', label:'Fornecedores',       icon:<Building2 size={20}/>,       roles:['admin']},
    {id:'vendas',       label:'Vendas',             icon:<TrendingUp size={20}/>,      roles:['admin']},
    {id:'contasreceber',label:'Contas a Receber',   icon:<DollarSign size={20}/>,      roles:['admin']},
    {id:'compras',      label:'Compras',            icon:<Truck size={20}/>,           roles:['admin','colaborador']},
    {id:'contaspagar',  label:'Contas a Pagar',     icon:<TrendingDown size={20}/>,    roles:['admin']},
    {id:'bancario',      label:'Controle Bancário',  icon:<Landmark size={20}/>,        roles:['admin']},
    {id:'caixa',         label:'Controle de Caixa',  icon:<DollarSign size={20}/>,      roles:['admin']},
    {id:'lucratividade', label:'Lucratividade',       icon:<TrendingUp size={20}/>,       roles:['admin']},
    {id:'config',        label:'Configurações',       icon:<Settings size={20}/>,         roles:['admin']},
  ].filter(t=>t.roles.includes(user.role));

  const headerBtn=()=>{
    if(activeTab==='bancario')            return{label:'Nova Conta Bancária', action:()=>setModal('novaContaBancaria')};
    if(activeTab==='insumos')             return{label:'Novo Insumo',     action:()=>setModal('novoInsumo')};
    if(activeTab==='clientes'&&isAdmin) return{label:'Novo Cliente',    action:()=>setModal('cliente')};
    if(activeTab==='fornecedores')      return{label:'Novo Fornecedor', action:()=>setModal('fornecedor')};
    if(activeTab==='compras')           return{label:'Nova Compra',     action:()=>setModal('compra')};
    if(activeTab==='produtos')          return{label:'Novo Produto',    action:()=>setModal('novoProduto')};
    if(activeTab==='caixa')       return{label:'Novo Lançamento', action:()=>setModal('novoLancamentoCaixa')};
    if(activeTab==='contasreceber') return{label:'Nova Conta',    action:()=>setModal('novaContaReceber')};
    if(activeTab==='contaspagar')   return{label:'Nova Conta',    action:()=>setModal('novaContaPagar')};
    if(activeTab==='vendas'||activeTab==='lucratividade') return{label:'Novo Orçamento', action:()=>setModal('pedido')};
    return{label:'Novo Orçamento', action:()=>setModal('pedido')};
  };
  const btn=headerBtn();

  const navigate=(tab:string)=>{
    setActiveTab(tab);setSidebarOpen(false);setSearchQuery('');
    setGlobalKey(k=>k+1);
    setContasKey(k=>k+1);setKanbanKey(k=>k+1);setCaixaKey(k=>k+1);setComprasKey(k=>k+1);setBancarioKey(k=>k+1);
    window.history.replaceState(null,'','#'+tab);
  };

  const abrirDetalheOrc=(p:Pedido)=>{setPedidoSelecionado(p);setModal('detalheOrc');};
  const abrirEditarCliente=(c:any)=>{setClienteSelecionadoEdit(c);setModal('editarCliente');};
  const abrirEditarCR=(c:any)=>{setCrSelecionado(c);setModal('editarCR');};
  const abrirEditarCP=(c:any)=>{setCpSelecionado(c);setModal('editarCP');};
  const abrirEditarContaBancaria=(c:any)=>{setContaBancariaSelecionada(c);setModal('editarContaBancaria');};
  const abrirEditarUsuario=(u:any)=>{setUsuarioSelecionado(u);setModal('editarUsuario');};
  const abrirEditarFornecedor=(f:any)=>{setFornecedorSelecionadoEdit(f);setModal('editarFornecedor');};
  const abrirEditarInsumo=(i:any)=>{setInsumoSelecionadoEdit(i);setModal('editarInsumo');};
  const abrirEditarProduto=(p:any)=>{setProdutoSelecionadoEdit(p);setModal('editarProduto');};
  const abrirPerfilCliente=(c:any)=>{setClienteSelecionadoEdit(c);setModal('perfilCliente');};
  const abrirDetalheCompra=(c:Compra)=>{setCompraSelecionada(c);setModal('detalheCompra');};
  // Key to force ComprasView reload after modal close
  const closeDetalheCompra=()=>{setModal(null);setCompraSelecionada(null);setComprasKey(k=>k+1);};
  const closeDetalheOrc=()=>{setModal(null);setPedidoSelecionado(null);setKanbanKey(k=>k+1);};

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
            <button onClick={logout} title="Sair do sistema" className="hidden md:flex items-center gap-1.5 px-3 py-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm font-bold shrink-0">
              <LogOut size={16}/>
            </button>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.15}}>
                {activeTab==='kanban'       && <KanbanView       key={kanbanKey+globalKey} searchQuery={searchQuery} onNovoPedido={()=>setModal('pedido')} onAbrirDetalhe={abrirDetalheOrc}/>}
                {activeTab==='insumos'      && <InsumosView      key={globalKey} searchQuery={searchQuery} onAdd={()=>setModal('novoInsumo')} onEditar={abrirEditarInsumo}/>}
                {activeTab==='produtos'     && <ProdutosView     key={globalKey} searchQuery={searchQuery} onAdd={()=>setModal('novoProduto')} onEditar={abrirEditarProduto}/>}
                {activeTab==='clientes'     && <ClientesView     key={globalKey} searchQuery={searchQuery} onAdd={()=>setModal('cliente')} onVerPerfil={abrirPerfilCliente}/>}
                {activeTab==='fornecedores' && <FornecedoresView key={globalKey} searchQuery={searchQuery} onAdd={()=>setModal('fornecedor')} onEditar={abrirEditarFornecedor}/>}
                {activeTab==='vendas'       && <VendasView key={globalKey} onAbrirDetalhe={abrirDetalheOrc}/>}
                {activeTab==='contasreceber'&& <ContasReceberView key={contasKey} onEditar={abrirEditarCR}/>}
                {activeTab==='compras'      && <ComprasView      key={comprasKey+globalKey} searchQuery={searchQuery} onAdd={()=>setModal('compra')} onAbrirDetalhe={abrirDetalheCompra}/>}
                {activeTab==='contaspagar'  && <ContasPagarView  key={contasKey} onEditar={abrirEditarCP}/>}
                {activeTab==='bancario'     && <BancarioView     key={bancarioKey} onNovaConta={()=>setModal('novaContaBancaria')} onEditar={abrirEditarContaBancaria} onTransferir={()=>setModal('transferenciaContas')}/>}
                {activeTab==='caixa'        && <CaixaView       key={caixaKey} onNovo={()=>setModal('novoLancamentoCaixa')} onLancado={()=>setCaixaKey(k=>k+1)}/>}
                {activeTab==='lucratividade'&& <LucratividadeView/>}
                {activeTab==='config'       && <ConfigView      onNovoUsuario={()=>setModal('novoUsuario')} onEditarUsuario={abrirEditarUsuario}/>}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <AnimatePresence>
          {modal==='pedido'           && <ModalNovoPedido     onClose={()=>setModal(null)} onAbrirNovoProduto={()=>setModal('novoProduto')} onAbrirNovoCliente={()=>setModal('novoClienteRapido')}/>}
          {modal==='cliente'          && <ModalNovoCliente    onClose={()=>setModal(null)}/>}
          {modal==='novoClienteRapido'&& <ModalNovoCliente    onClose={()=>setModal(null)}/>}
          {modal==='fornecedor'       && <ModalNovoFornecedor onClose={()=>setModal(null)}/>}
          {modal==='compra'           && <ModalNovaCompra     onClose={()=>{setModal(null);setComprasKey(k=>k+1);}}/>}
          {modal==='novoProduto'      && <ModalNovoProduto    onClose={()=>setModal(null)}/>}
          {modal==='detalheOrc'      && pedidoSelecionado     && <ModalDetalheOrcamento pedido={pedidoSelecionado}   onClose={closeDetalheOrc}/>}
          {modal==='detalheCompra'   && compraSelecionada     && <ModalDetalheCompra    compra={compraSelecionada}   onClose={closeDetalheCompra}/>}
          {modal==='editarCliente'   && clienteSelecionadoEdit && <ModalEditarCliente   cliente={clienteSelecionadoEdit} onClose={()=>{setModal(null);setClienteSelecionadoEdit(null);setKanbanKey(k=>k+1);}}/>}
          {modal==='perfilCliente'   && clienteSelecionadoEdit && <ModalPerfilCliente   cliente={clienteSelecionadoEdit} onClose={()=>{setModal(null);setClienteSelecionadoEdit(null);}} onEditar={(c)=>{setModal(null);setTimeout(()=>abrirEditarCliente(c),100);}}/>}
          {modal==='novoInsumo'        &&                              <ModalNovoInsumo       onClose={()=>{setModal(null);setGlobalKey(k=>k+1);}}/>}
          {modal==='editarInsumo'    && insumoSelecionadoEdit  && <ModalEditarInsumo    insumo={insumoSelecionadoEdit}   onClose={()=>{setModal(null);setInsumoSelecionadoEdit(null);setKanbanKey(k=>k+1);}}/>}
          {modal==='editarProduto'   && produtoSelecionadoEdit   && <ModalEditarProduto   produto={produtoSelecionadoEdit}   onClose={()=>{setModal(null);setProdutoSelecionadoEdit(null);setKanbanKey(k=>k+1);}}/>}
          {modal==='editarFornecedor'  && fornecedorSelecionadoEdit && <ModalEditarFornecedor  fornecedor={fornecedorSelecionadoEdit} onClose={()=>{setModal(null);setFornecedorSelecionadoEdit(null);setKanbanKey(k=>k+1);}}/>}
          {modal==='editarCR'          && crSelecionado             && <ModalEditarCR           conta={crSelecionado}              onClose={()=>{setModal(null);setCrSelecionado(null);setContasKey(k=>k+1);}}/>}
          {modal==='novaContaReceber' &&                             <ModalNovaContaReceber                                     onClose={()=>{setModal(null);setContasKey(k=>k+1);}}/>}
          {modal==='novaContaPagar'   &&                             <ModalNovaContaPagar                                       onClose={()=>{setModal(null);setContasKey(k=>k+1);}}/>}
          {modal==='editarCP'          && cpSelecionado             && <ModalEditarCP           conta={cpSelecionado}              onClose={()=>{setModal(null);setCpSelecionado(null);setContasKey(k=>k+1);}}/>}
          {modal==='novoLancamentoCaixa'&&                             <ModalNovoLancamentoCaixa                                   onClose={()=>{setModal(null);setCaixaKey(k=>k+1);}}/>}
          {modal==='novaContaBancaria' &&                             <ModalNovaContaBancaria                                     onClose={()=>{setModal(null);setBancarioKey(k=>k+1);}}/>}
          {modal==='editarContaBancaria' && contaBancariaSelecionada  && <ModalEditarContaBancaria conta={contaBancariaSelecionada} onClose={()=>{setModal(null);setContaBancariaSelecionada(null);setBancarioKey(k=>k+1);}}/>}
          {modal==='transferenciaContas'&&                             <ModalTransferenciaContas                                   onClose={()=>{setModal(null);setBancarioKey(k=>k+1);}}/>}
          {modal==='novoUsuario'       &&                             <ModalNovoUsuario                                            onClose={()=>setModal(null)}/>}
          {modal==='editarUsuario'     && usuarioSelecionado         && <ModalEditarUsuario      usuario={usuarioSelecionado}       onClose={()=>{setModal(null);setUsuarioSelecionado(null);}}/>}
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
  const[filtroStatus,setFiltroStatus]=useState<string|null>(null);
  const[filtroPeriodo,setFiltroPeriodo]=useState('');
  const[mostrarFiltros,setMostrarFiltros]=useState(false);
  const kanbanRef=useRef<HTMLDivElement>(null);

  // Scroll automático para a coluna filtrada
  const aplicarFiltroStatus=(status:string|null)=>{
    setFiltroStatus(status);
    if(status&&kanbanRef.current){
      // Aguarda o re-render antes de scrollar
      setTimeout(()=>{
        const col=kanbanRef.current?.querySelector(`[data-status="${status}"]`);
        if(col)col.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
      },80);
    }
  };

  const pedidosFiltrados=pedidos.filter(p=>{
    if(filtroStatus){
      const st=statuses.find(s=>s.nome===filtroStatus);
      if(st&&p.status_id!==st.id)return false;
    }
    if(filtroPeriodo){
      const criado=(p.created_at||'').slice(0,7);
      if(criado!==filtroPeriodo)return false;
    }
    return true;
  });

  const mover=async(pedido:Pedido,statusNome:string)=>{
    const ns=statuses.find(s=>s.nome===statusNome);if(!ns||pedido.status_id===ns.id)return;
    setMovendo(pedido.id);
    if(statusNome==='Produção'){const{data:r}=await baixarEstoque(pedido.id);if(r&&!r.sucesso){alert(`⚠️ Estoque insuficiente:\n${r.erros.map((e:any)=>e.insumo).join('\n')}`);setMovendo(null);return;}}
    await moverStatus(pedido.id,ns.id);setMovendo(null);
  };
  const excluirPedido=async(pedido:Pedido,e:React.MouseEvent)=>{
    e.stopPropagation();
    if(!confirm(`Excluir o orçamento #${pedido.codigo}? Esta ação não pode ser desfeita.`))return;
    await supabase.from('itens_pedido').delete().eq('pedido_id',pedido.id);
    await supabase.from('pedidos').delete().eq('id',pedido.id);
    refetch();
  };
  const zap=(p:Pedido)=>{const n=(p.clientes?.whatsapp||p.cliente_contato_avulso||'').replace(/\D/g,'');const m=encodeURIComponent(`Olá! Orçamento *#${p.codigo}*. Total: R$ ${Number(p.valor_total).toFixed(2)}. Confirma?`);if(n)window.open(`https://wa.me/55${n}?text=${m}`,'_blank');};

  const temFiltroAtivo=filtroStatus||filtroPeriodo;
  const limparFiltros=()=>{setFiltroStatus(null);setFiltroPeriodo('');};

  if(ls||lp)return<LoadingSpinner label="Carregando Kanban..."/>;
  return(
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-black">CRM / Kanban</h2>
          <p className="text-slate-500 text-sm">{pedidosFiltrados.length} pedido{pedidosFiltrados.length!==1?'s':''}{temFiltroAtivo&&<span className="text-indigo-600 font-bold"> (filtrado{temFiltroAtivo?'s':''})</span>}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>setMostrarFiltros(f=>!f)} className={cn('flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold border transition-all',mostrarFiltros||temFiltroAtivo?'bg-indigo-600 text-white border-indigo-600':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
            <Filter size={14}/>{temFiltroAtivo?'Filtros ativos':'Filtrar'}
          </button>
          <button onClick={refetch} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 bg-white"><RefreshCw size={17}/></button>
          <button onClick={onNovoPedido} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all"><Plus size={15} strokeWidth={3}/>Novo Orçamento</button>
        </div>
      </div>

      {/* Painel de filtros */}
      <AnimatePresence>
        {mostrarFiltros&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden mb-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Filter size={12}/>Filtros do Kanban</p>
                {temFiltroAtivo&&<button onClick={limparFiltros} className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg">Limpar filtros</button>}
              </div>
              <div className="flex gap-3 flex-wrap">
                {/* Filtro por coluna/status */}
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1.5">Coluna / Status</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={()=>aplicarFiltroStatus(null)} className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-all',!filtroStatus?'bg-indigo-600 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200')}>Todas</button>
                    {statuses.map(s=>{
                      const cc=STATUS_PEDIDO_CORES[s.nome]||'bg-slate-100 border-slate-200 text-slate-600';
                      const cnt=pedidos.filter(p=>p.status_id===s.id).length;
                      return(
                        <button key={s.id} onClick={()=>aplicarFiltroStatus(filtroStatus===s.nome?null:s.nome)}
                          className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',filtroStatus===s.nome?'bg-indigo-600 text-white border-indigo-600':cc)}>
                          {s.nome} <span className="opacity-70">({cnt})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Filtro por mês/ano */}
                <div className="min-w-[180px]">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1.5">Mês de Criação</p>
                  <input type="month" value={filtroPeriodo} onChange={e=>setFiltroPeriodo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400"/>
                </div>
              </div>
              {temFiltroAtivo&&<p className="text-xs text-indigo-600 font-bold">{pedidosFiltrados.length} pedido{pedidosFiltrados.length!==1?'s':''} exibido{pedidosFiltrados.length!==1?'s':''}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={kanbanRef} className="flex gap-4 overflow-x-auto pb-4" style={{minHeight:'calc(100vh - 300px)'}}>
        {statuses.map(status=>{
          const col=pedidosFiltrados.filter(p=>p.status_id===status.id);
          const colTotal=pedidos.filter(p=>p.status_id===status.id).length;
          const cc=STATUS_PEDIDO_CORES[status.nome]||'bg-slate-100 border-slate-200 text-slate-600';
          const next=statuses.find(s=>s.ordem===status.ordem+1);
          return(
            <div key={status.id} data-status={status.nome} className="w-72 md:w-80 flex-shrink-0 flex flex-col">
              <div className={cn('flex items-center justify-between p-4 rounded-t-2xl border-b-2',cc)}>
                <h3 className="font-black text-xs uppercase tracking-widest">{status.nome}</h3>
                <span className="text-[10px] font-black bg-white/60 px-2 py-0.5 rounded-full">
                  {temFiltroAtivo&&col.length!==colTotal?`${col.length}/${colTotal}`:colTotal}
                </span>
              </div>
              <div className="flex-1 bg-slate-100/40 p-3 space-y-3 rounded-b-2xl border border-slate-200 border-t-0 overflow-y-auto">
                {col.length===0&&<p className="text-center text-slate-300 text-xs py-8">{temFiltroAtivo?'Nenhum resultado':'Vazio'}</p>}
                {col.map(p=>{
                  const nome=p.clientes?.nome||p.cliente_nome_avulso||'Cliente';
                  return(
                    <motion.div key={p.id} layout className={cn('bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 transition-all group',movendo===p.id&&'opacity-50 pointer-events-none')}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-slate-300 uppercase">#{p.codigo}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={()=>onAbrirDetalhe(p)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Ver detalhes"><FileText size={13}/></button>
                          <button onClick={()=>zap(p)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="WhatsApp"><MessageSquare size={13}/></button>
                          <button onClick={(e)=>excluirPedido(p,e)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Excluir orçamento"><Trash2 size={13}/></button>
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
  const{clientes}=useClientes();
  const[statusId,setStatusId]=useState(pedido.status_id);
  const[itens,setItens]=useState<any[]>([]);
  const[produtos,setProdutos]=useState<Produto[]>([]);
  const[buscaProd,setBuscaProd]=useState('');
  const[showProd,setShowProd]=useState(false);
  const prodRef=useRef<HTMLDivElement>(null);
  const[salvando,setSalvando]=useState(false);
  const[toast,setToast]=useState('');
  const[toastColor,setToastColor]=useState<'emerald'|'indigo'|'rose'>('emerald');
  // Edição de cliente e entrega
  const[editandoCliente,setEditandoCliente]=useState(false);
  const[buscaCli,setBuscaCli]=useState(pedido.clientes?.nome||pedido.cliente_nome_avulso||'');
  const[cliSelecionado,setCli]=useState<any|null>(pedido.clientes||null);
  const[showCli,setShowCli]=useState(false);
  const cliRef=useRef<HTMLDivElement>(null);
  // Normaliza data para YYYY-MM-DD (input[type=date] exige esse formato)
  const normDate=(d:string|null|undefined)=>{
    if(!d)return'';
    // Se já está no formato YYYY-MM-DD, retorna direto
    if(/^\d{4}-\d{2}-\d{2}$/.test(d))return d;
    // Se é ISO com T, pega só os 10 primeiros caracteres
    return d.slice(0,10);
  };
  const[dataEntrega,setDataEntrega]=useState(()=>normDate(pedido.data_entrega));

  const statusAtual=statuses.find(s=>s.id===statusId);

  // Carrega itens e produtos
  useEffect(()=>{
    supabase.from('itens_pedido').select('*').eq('pedido_id',pedido.id).then(({data})=>setItens(data||[]));
    supabase.from('produtos').select('*').eq('ativo',true).order('nome').then(({data})=>setProdutos(data||[]));
  },[pedido.id]);

  // Fecha dropdown ao clicar fora
  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      if(prodRef.current&&!prodRef.current.contains(e.target as Node))setShowProd(false);
      if(cliRef.current&&!cliRef.current.contains(e.target as Node))setShowCli(false);
    };
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);
  },[]);

  const prodsFiltrados=produtos.filter(p=>p.nome.toLowerCase().includes(buscaProd.toLowerCase())&&buscaProd.length>0).slice(0,6);
  const clisFiltrados=clientes.filter(c=>c.nome.toLowerCase().includes(buscaCli.toLowerCase())&&buscaCli.length>0&&!cliSelecionado).slice(0,6);

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
    // Monta update com cliente e entrega
    const updData:any={status_id:statusId,updated_at:new Date().toISOString(),data_entrega:dataEntrega||null};
    if(cliSelecionado?.id){updData.cliente_id=cliSelecionado.id;updData.cliente_nome_avulso=null;}
    else if(buscaCli.trim()){updData.cliente_nome_avulso=buscaCli.trim();updData.cliente_id=null;}
    await supabase.from('pedidos').update(updData).eq('id',pedido.id);
    // Atualiza valor_total
    if(total>0)await supabase.from('pedidos').update({valor_total:total}).eq('id',pedido.id);
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

    // Calcula custo de insumos via BOM no momento da venda (snapshot imutável)
    let custoInsumoSnapshot=0;
    const itensSalvar=itens.length>0?itens:[];
    if(itensSalvar.length>0){
      const prodIds=[...new Set(itensSalvar.map((i:any)=>i.produto_id).filter(Boolean))];
      if(prodIds.length>0){
        const{data:composicoes}=await supabase.from('composicao_produtos').select('produto_id,quantidade_insumo,percentual_desperdicio,insumos(custo_unitario)').in('produto_id',prodIds);
        itensSalvar.forEach((item:any)=>{
          if(!item.produto_id)return;
          const comps=(composicoes||[]).filter((c:any)=>c.produto_id===item.produto_id);
          comps.forEach((comp:any)=>{
            custoInsumoSnapshot+=(Number(comp.insumos?.custo_unitario||0)*Number(comp.quantidade_insumo||0)*(1+Number(comp.percentual_desperdicio||0)/100)*Number(item.quantidade||1));
          });
        });
      }
    }

    const nomeCliente=cliSelecionado?.nome||pedido.clientes?.nome||pedido.cliente_nome_avulso||'Cliente';
    await supabase.from('contas_receber').insert({
      pedido_id:pedido.id,
      cliente_nome:nomeCliente,
      descricao:`Venda referente ao Orçamento #${pedido.codigo}`,
      valor:total||pedido.valor_total,
      data_vencimento:dataEntrega||pedido.data_entrega||null,
      status:'Aguardando',
    });
    // Grava snapshot de custo no pedido para que Lucratividade não mude ao longo do tempo
    // IMPORTANTE: sempre grava o snapshot, mesmo que seja 0 (sem BOM configurado)
    // Isso garante que mudanças futuras no preço de compra não afetam o histórico
    const finalizado=statuses.find(s=>s.nome==='Finalizado');
    if(finalizado)await supabase.from('pedidos').update({
      status_id:finalizado.id,
      pagamento_confirmado:true,
      updated_at:new Date().toISOString(),
      custo_insumos_snapshot:custoInsumoSnapshot, // sempre grava, nunca null
    }).eq('id',pedido.id);
    refetch();setSalvando(false);showToast('Venda lançada em Contas a Receber! ✅','indigo');setTimeout(onClose,1800);
  };

  const showToast=(msg:string,cor:'emerald'|'indigo'|'rose')=>{setToast(msg);setToastColor(cor);};

  return(
    <>
    <ModalWrapper title={`Orçamento #${pedido.codigo}`} onClose={onClose} size="lg">
      {/* Cabeçalho info */}
      <div className="bg-slate-50 rounded-2xl p-4 flex flex-wrap gap-4 justify-between items-start">
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cliente</p>
            <button onClick={()=>setEditandoCliente(e=>!e)} className="text-[10px] font-bold text-indigo-500 hover:underline">{editandoCliente?'Fechar':'Alterar'}</button>
          </div>
          {!editandoCliente?(
            <p className="font-black text-slate-800">{cliSelecionado?.nome||pedido.clientes?.nome||buscaCli||pedido.cliente_nome_avulso||'—'}</p>
          ):(
            <div className="relative" ref={cliRef}>
              <input type="text" placeholder="Buscar cliente ou nome avulso..." className={inputClass+' text-sm py-1.5'} value={cliSelecionado?cliSelecionado.nome:buscaCli}
                onChange={e=>{setBuscaCli(e.target.value);setCli(null);setShowCli(true);}} onFocus={()=>setShowCli(true)}/>
              {cliSelecionado&&<button onClick={()=>{setCli(null);setBuscaCli('');}} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X size={13}/></button>}
              {showCli&&clisFiltrados.length>0&&<div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                {clisFiltrados.map(c=><button key={c.id} onClick={()=>{setCli(c);setBuscaCli('');setShowCli(false);}} className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm font-bold">{c.nome}</button>)}
              </div>}
            </div>
          )}
          {(cliSelecionado?.whatsapp||pedido.clientes?.whatsapp||pedido.cliente_contato_avulso)&&!editandoCliente&&(
          <a href={`https://wa.me/55${(cliSelecionado?.whatsapp||pedido.clientes?.whatsapp||pedido.cliente_contato_avulso||'').replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold mt-1 hover:underline">
            <MessageSquare size={12}/>{cliSelecionado?.whatsapp||pedido.clientes?.whatsapp||pedido.cliente_contato_avulso}
          </a>
        )}
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
          <input type="date" value={dataEntrega} onChange={e=>setDataEntrega(e.target.value)}
            className="text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400"/>
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
function InsumosView({searchQuery,onAdd,onEditar}:{searchQuery:string;onAdd:()=>void;onEditar:(i:any)=>void}) {
  const{insumos,insumosAbaixoMinimo,loading,refetch}=useInsumos(searchQuery);
  const[filtroAbaixoMin,setFiltroAbaixoMin]=useState(false);
  const[exportando,setExportando]=useState(false);
  const[importando,setImportando]=useState(false);
  const fileInputRef=useRef<HTMLInputElement>(null);

  const excluir=async(id:string)=>{if(!confirm('Excluir este insumo? Esta ação não pode ser desfeita.'))return;await supabase.from('insumos').update({ativo:false}).eq('id',id);refetch();};

  const insumosFiltrados=filtroAbaixoMin?insumosAbaixoMinimo:insumos;

  // Exportar XLS
  const exportarXLS=()=>{
    setExportando(true);
    const wsData=[
      ['Nome','Tipo','Unidade','Custo Unitário','Estoque Atual','Estoque Mínimo','Gramatura'],
      ...insumos.map(i=>[i.nome,i.tipo,i.unidade_medida,Number(i.custo_unitario),Number(i.estoque_atual),Number(i.estoque_minimo),i.gramatura||''])
    ];
    const ws=XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols']=[{wch:30},{wch:12},{wch:12},{wch:14},{wch:14},{wch:14},{wch:12}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Insumos');
    XLSX.writeFile(wb,'insumos_estoque.xlsx');
    setExportando(false);
  };

  // Importar XLS
  const importarXLS=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return;
    setImportando(true);
    try{
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:'buffer'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows:any[][]=XLSX.utils.sheet_to_json(ws,{header:1});
      const dataRows=rows.slice(1).filter((r:any[])=>r[0]);
      let ok=0,erros=0;
      for(const cols of dataRows){
        const nome=String(cols[0]||'').trim();
        if(!nome)continue;
        // Busca pelo nome exato para decidir insert ou update
        const{data:exist}=await supabase.from('insumos').select('id').eq('nome',nome).eq('ativo',true).maybeSingle();
        const payload={
          nome,
          tipo:String(cols[1]||'outro'),
          unidade_medida:String(cols[2]||'unidade'),
          custo_unitario:Number(cols[3])||0,
          estoque_atual:Number(cols[4])||0,
          estoque_minimo:Number(cols[5])||0,
          gramatura:cols[6]?Number(cols[6]):null,
          ativo:true,
          updated_at:new Date().toISOString(),
        };
        let error;
        if(exist?.id){
          ({error}=await supabase.from('insumos').update(payload).eq('id',exist.id));
        } else {
          ({error}=await supabase.from('insumos').insert(payload));
        }
        if(error){console.error('Erro importação:',nome,error.message);erros++;}else ok++;
      }
      setImportando(false);refetch();
      alert(`Importação concluída! ✅\n${ok} insumos importados/atualizados.\n${erros>0?erros+' erros.':''}`);
    }catch(err:any){
      setImportando(false);
      alert(`Erro ao ler o arquivo XLS: ${err?.message||err}\n\nVerifique se o arquivo é um .xlsx válido e não está corrompido.`);
    }
    if(fileInputRef.current)fileInputRef.current.value='';
  };

  if(loading)return<LoadingSpinner label="Carregando insumos..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Insumos & Estoque</h2><p className="text-slate-500 text-sm">{insumos.length} insumos{insumosAbaixoMinimo.length>0&&<span className="text-rose-600 font-bold ml-2">• {insumosAbaixoMinimo.length} abaixo do mínimo!</span>}</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>setFiltroAbaixoMin(f=>!f)} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all',filtroAbaixoMin?'bg-rose-600 text-white border-rose-600':'bg-white text-rose-600 border-rose-200 hover:bg-rose-50')}><AlertTriangle size={14}/>Abaixo do Mínimo {filtroAbaixoMin&&`(${insumosAbaixoMinimo.length})`}</button>
          {/* Exportar XLS */}
          <button onClick={exportarXLS} disabled={exportando} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-all">
            <Download size={14}/>Exportar XLS
          </button>
          {/* Importar XLS */}
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer">
            <Upload size={14}/>
            {importando?'Importando...':'Importar XLS'}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importarXLS}/>
          </label>
          <button onClick={refetch} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 bg-white"><RefreshCw size={17}/></button>
          <button onClick={onAdd} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all"><Plus size={15} strokeWidth={3}/>Novo Insumo</button>
        </div>
      </div>
      {insumosAbaixoMinimo.length>0&&<div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3"><AlertTriangle size={17} className="text-rose-500 mt-0.5 shrink-0"/><div><p className="font-bold text-rose-700 text-sm">Estoque Baixo</p><p className="text-rose-600 text-sm">{insumosAbaixoMinimo.map(i=>i.nome).join(', ')}</p></div></div>}
      {filtroAbaixoMin&&<div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-amber-700 text-sm font-bold flex items-center gap-2"><AlertTriangle size={14}/>Exibindo apenas insumos abaixo do estoque mínimo ({insumosAbaixoMinimo.length}). <button onClick={()=>setFiltroAbaixoMin(false)} className="text-amber-500 hover:text-amber-700 ml-auto text-xs underline">Ver todos</button></div>}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left min-w-[750px]">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{['Insumo','Tipo','Unidade','Custo Unit.','Estoque','Mínimo','Status','Ações'].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {insumosFiltrados.length===0&&<tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">{filtroAbaixoMin?'Nenhum insumo abaixo do mínimo! 🎉':'Nenhum insumo.'}</td></tr>}
            {insumosFiltrados.map(i=>{const b=i.estoque_atual<=i.estoque_minimo;return(
              <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4 font-bold text-slate-800 text-sm">{i.nome}</td>
                <td className="px-5 py-4"><span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{i.tipo}</span></td>
                <td className="px-5 py-4 text-sm text-slate-500">{i.unidade_medida}</td>
                <td className="px-5 py-4 font-bold text-slate-700 text-sm">R$ {Number(i.custo_unitario).toFixed(4)}</td>
                <td className={cn('px-5 py-4 font-black text-sm',b?'text-rose-600':'text-slate-700')}>{Number(i.estoque_atual).toFixed(2)}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{Number(i.estoque_minimo).toFixed(2)}</td>
                <td className="px-5 py-4">{b?<span className="flex items-center gap-1 text-rose-600 text-xs font-bold"><AlertCircle size={13}/>Repor</span>:<span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 size={13}/>OK</span>}</td>
                <td className="px-5 py-4"><div className="flex gap-2"><button onClick={()=>onEditar(i)} className="text-indigo-600 font-bold text-sm hover:underline">Editar</button><span className="text-slate-200">|</span><button onClick={()=>excluir(i.id)} className="text-rose-400 font-bold text-sm hover:text-rose-600 hover:underline">Excluir</button></div></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── PRODUTOS & KITS ──────────────────────────────────────── */
function ProdutosView({searchQuery,onAdd,onEditar}:{searchQuery:string;onAdd:()=>void;onEditar:(p:any)=>void}) {
  const[produtos,setProdutos]=useState<Produto[]>([]);
  const[loading,setLoading]=useState(true);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const[importando,setImportando]=useState(false);
  const load=useCallback(async()=>{setLoading(true);let q=supabase.from('produtos').select('*').eq('ativo',true).order('nome');if(searchQuery.trim())q=q.ilike('nome',`%${searchQuery}%`);const{data}=await q;setProdutos(data||[]);setLoading(false);},[searchQuery]);
  useEffect(()=>{load();},[load]);
  const excluir=async(id:string)=>{if(!confirm('Excluir este produto?'))return;await supabase.from('produtos').update({ativo:false}).eq('id',id);load();};

  const exportarXLS=()=>{
    const wsData=[
      ['Nome','Descrição','Categoria','Markup','MO/hora'],
      ...produtos.map(p=>[p.nome,p.descricao||'',p.categoria,Number(p.markup_sugerido),Number(p.custo_mao_obra_hora)])
    ];
    const ws=XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols']=[{wch:30},{wch:30},{wch:14},{wch:10},{wch:12}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Produtos');
    XLSX.writeFile(wb,'produtos.xlsx');
  };

  const importarXLS=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return;setImportando(true);
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'buffer'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows:any[][]=XLSX.utils.sheet_to_json(ws,{header:1});
    const dataRows=rows.slice(1).filter((r:any[])=>r[0]);
    let ok=0,erros=0;
    for(const cols of dataRows){
      const{error}=await supabase.from('produtos').insert({nome:String(cols[0]),descricao:cols[1]||null,categoria:String(cols[2]||'kit'),markup_sugerido:Number(cols[3])||2.5,custo_mao_obra_hora:Number(cols[4])||25,ativo:true});
      if(error)erros++;else ok++;
    }
    setImportando(false);load();alert(`Importação concluída! ✅\n${ok} produtos importados.\n${erros>0?erros+' erros.':''}`);
    if(fileInputRef.current)fileInputRef.current.value='';
  };

  if(loading)return<LoadingSpinner label="Carregando produtos..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Produtos & Kits</h2><p className="text-slate-500 text-sm">{produtos.length} produtos — o que você <b>vende</b> ao cliente</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportarXLS} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-all">
            <Download size={14}/>Exportar XLS
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer">
            <Upload size={14}/>
            {importando?'Importando...':'Importar XLS'}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importarXLS}/>
          </label>
          <button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><Plus size={15} strokeWidth={3}/>Novo Produto</button>
        </div>
      </div>
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 flex gap-2 text-sm text-indigo-700"><AlertTriangle size={15} className="text-indigo-400 shrink-0 mt-0.5"/><span><b>Dica:</b> Produtos = o que você vende. Insumos = o que você compra (matéria-prima).</span></div>
      {produtos.length===0?(
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center gap-4 text-slate-300"><ShoppingCart size={48}/><p className="font-black text-slate-400 text-lg uppercase tracking-widest">Nenhum produto</p><button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 mt-2"><Plus size={15} strokeWidth={3}/>Cadastrar Primeiro Produto</button></div>
      ):(
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left min-w-[650px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">{['Produto','Categoria','Markup','MO/hora','Ações'].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {produtos.map(p=>(
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-800 text-sm"><div><p>{p.nome}</p>{p.descricao&&<p className="text-xs text-slate-400 font-normal">{p.descricao}</p>}</div></td>
                  <td className="px-5 py-4"><span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">{p.categoria}</span></td>
                  <td className="px-5 py-4 font-bold text-slate-700 text-sm">{p.markup_sugerido}×</td>
                  <td className="px-5 py-4 font-bold text-slate-700 text-sm">R$ {Number(p.custo_mao_obra_hora).toFixed(2)}/h</td>
                  <td className="px-5 py-4"><div className="flex gap-2"><button onClick={()=>onEditar(p)} className="text-indigo-600 font-bold text-sm hover:underline">Editar / BOM</button><span className="text-slate-200">|</span><button onClick={()=>excluir(p.id)} className="text-rose-400 font-bold text-sm hover:text-rose-600 hover:underline">Excluir</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── VENDAS (resumo de orçamentos finalizados) ─────────────── */
function VendasView({key:_k,onAbrirDetalhe}:{key?:number;onAbrirDetalhe?:(p:any)=>void}={}) {
  const hoje=new Date();
  const[pedidos,setPedidos]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[busca,setBusca]=useState('');
  const[de,setDe]=useState('');
  const[ate,setAte]=useState('');
  const[valorMin,setValorMin]=useState('');
  const[valorMax,setValorMax]=useState('');
  const load=useCallback(async()=>{setLoading(true);const{data}=await supabase.from('pedidos').select('*, kanban_status(*), clientes(nome)').order('updated_at',{ascending:false});const fin=(data||[]).filter((p:any)=>p.kanban_status?.nome==='Finalizado');setPedidos(fin);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);
  const excluir=async(id:string)=>{if(!confirm('Excluir esta venda do histórico?'))return;await supabase.from('pedidos').delete().eq('id',id);load();};
  const filtrados=pedidos.filter(p=>{
    const nome=(p.clientes?.nome||p.cliente_nome_avulso||'').toLowerCase();
    if(busca&&!nome.includes(busca.toLowerCase())&&!p.codigo?.includes(busca))return false;
    const dataP=(p.updated_at||p.created_at||'').slice(0,10);
    if(de&&dataP<de)return false;
    if(ate&&dataP>ate)return false;
    const val=Number(p.valor_total);
    if(valorMin&&val<Number(valorMin))return false;
    if(valorMax&&val>Number(valorMax))return false;
    return true;
  });
  const total=filtrados.reduce((a,p)=>a+Number(p.valor_total),0);
  const limparFiltros=()=>{setBusca('');setDe('');setAte('');setValorMin('');setValorMax('');};
  const temFiltro=busca||de||ate||valorMin||valorMax;

  const exportarXLS=()=>{
    const wsData=[
      ['Código','Cliente','Valor Total','Data'],
      ...filtrados.map(p=>[`#${p.codigo}`,p.clientes?.nome||p.cliente_nome_avulso||'—',Number(p.valor_total),new Date(p.updated_at||p.created_at).toLocaleDateString('pt-BR')])
    ];
    const ws=XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols']=[{wch:10},{wch:30},{wch:14},{wch:12}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Vendas');
    XLSX.writeFile(wb,'vendas.xlsx');
  };

  if(loading)return<LoadingSpinner label="Carregando vendas..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Vendas</h2><p className="text-slate-500 text-sm">Orçamentos com status <b>Finalizado</b></p></div>
        <button onClick={exportarXLS} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-all">
          <Download size={14}/>Exportar XLS
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Total de Vendas</p><p className="text-2xl font-black text-indigo-600">R$ {total.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Nº de Pedidos</p><p className="text-2xl font-black text-slate-700">{filtrados.length}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Ticket Médio</p><p className="text-2xl font-black text-emerald-600">R$ {filtrados.length>0?(total/filtrados.length).toFixed(2):'0.00'}</p></div>
      </div>
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between"><p className="text-xs font-black text-slate-400 uppercase tracking-wider">Filtros</p>{temFiltro&&<button onClick={limparFiltros} className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg">Limpar filtros</button>}</div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Cliente ou código..." value={busca} onChange={e=>setBusca(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400"/></div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-[130px]"><span className="text-xs font-bold text-slate-400 uppercase shrink-0">De</span><input type="date" value={de} onChange={e=>setDe(e.target.value)} className="text-sm outline-none bg-transparent w-full"/></div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-[130px]"><span className="text-xs font-bold text-slate-400 uppercase shrink-0">Até</span><input type="date" value={ate} onChange={e=>setAte(e.target.value)} className="text-sm outline-none bg-transparent w-full"/></div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-[110px]"><span className="text-xs font-bold text-slate-400 uppercase shrink-0">R$≥</span><input type="number" placeholder="Min" value={valorMin} onChange={e=>setValorMin(e.target.value)} className="text-sm outline-none bg-transparent w-full"/></div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-[110px]"><span className="text-xs font-bold text-slate-400 uppercase shrink-0">R$≤</span><input type="number" placeholder="Max" value={valorMax} onChange={e=>setValorMax(e.target.value)} className="text-sm outline-none bg-transparent w-full"/></div>
          <button onClick={load} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl" title="Atualizar"><RefreshCw size={16}/></button>
        </div>
        {temFiltro&&<p className="text-xs text-indigo-600 font-bold">{filtrados.length} resultado{filtrados.length!==1?'s':''} encontrado{filtrados.length!==1?'s':''}</p>}
      </div>
      {filtrados.length===0?<div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center gap-3 text-slate-300"><TrendingUp size={44}/><p className="font-black text-slate-400 text-lg uppercase">Nenhuma venda</p><p className="text-slate-400 text-sm">{temFiltro?'Tente ajustar os filtros.':'Mova um orçamento para Finalizado no CRM.'}</p></div>:(
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left min-w-[650px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">{['Código','Cliente','Valor Total','Data','Ações'].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map(p=>(
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-black text-indigo-600 text-sm">#{p.codigo}</td>
                  <td className="px-5 py-4 font-bold text-slate-800 text-sm">{p.clientes?.nome||p.cliente_nome_avulso||'—'}</td>
                  <td className="px-5 py-4 font-black text-emerald-600 text-sm">R$ {Number(p.valor_total).toFixed(2)}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{new Date(p.updated_at||p.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2 items-center">
                      {onAbrirDetalhe&&<button onClick={()=>onAbrirDetalhe(p)} className="text-indigo-600 font-bold text-sm hover:underline">Editar</button>}
                      {onAbrirDetalhe&&<span className="text-slate-200">|</span>}
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 size={12}/>Finalizado</span>
                      <span className="text-slate-200">|</span>
                      <button onClick={()=>excluir(p.id)} className="text-rose-400 font-bold text-sm hover:text-rose-600 hover:underline">Excluir</button>
                    </div>
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

/* ── CLIENTES ──────────────────────────────────────────────── */
function ClientesView({searchQuery,onAdd,onVerPerfil}:{searchQuery:string;onAdd:()=>void;onVerPerfil:(c:any)=>void}) {
  const{clientes,loading,refetch}=useClientes(searchQuery);
  const{user}=useAuth();
  const fileInputRef=useRef<HTMLInputElement>(null);
  const[importando,setImportando]=useState(false);

  const excluir=async(id:string)=>{if(!confirm('Excluir este cliente?'))return;await supabase.from('clientes').delete().eq('id',id);refetch();};

  const exportarXLS=()=>{
    const wsData=[
      ['Nome','CPF/CNPJ','E-mail','WhatsApp','Cidade','Estado'],
      ...clientes.map(c=>[c.nome,c.cpf_cnpj||'',c.email||'',c.whatsapp||'',c.cidade||'',c.estado||''])
    ];
    const ws=XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols']=[{wch:30},{wch:18},{wch:28},{wch:16},{wch:16},{wch:8}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Clientes');
    XLSX.writeFile(wb,'clientes.xlsx');
  };

  const importarXLS=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return;
    setImportando(true);
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'buffer'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows:any[][]=XLSX.utils.sheet_to_json(ws,{header:1});
    const dataRows=rows.slice(1).filter((r:any[])=>r[0]);
    let ok=0,erros=0;
    for(const cols of dataRows){
      const{error}=await supabase.from('clientes').insert({nome:String(cols[0]),cpf_cnpj:cols[1]||null,email:cols[2]||null,whatsapp:cols[3]||null,cidade:cols[4]||null,estado:cols[5]||null});
      if(error)erros++;else ok++;
    }
    setImportando(false);refetch();
    alert(`Importação concluída! ✅\n${ok} clientes importados.\n${erros>0?erros+' erros (duplicados?).':''}`);
    if(fileInputRef.current)fileInputRef.current.value='';
  };

  if(loading)return<LoadingSpinner label="Carregando clientes..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Clientes</h2><p className="text-slate-500 text-sm">{clientes.length} clientes cadastrados</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportarXLS} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-all">
            <Download size={14}/>Exportar XLS
          </button>
          {user?.role==='admin'&&<label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer">
            <Upload size={14}/>
            {importando?'Importando...':'Importar XLS'}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importarXLS}/>
          </label>}
          {user?.role==='admin'&&<button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"><Plus size={15} strokeWidth={3}/>Novo Cliente</button>}
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{['Cliente','CPF/CNPJ','Cidade','WhatsApp','Ações'].map(h=><th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.length===0&&<tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Nenhum cliente cadastrado.</td></tr>}
            {clientes.map(c=>(
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-800 text-sm"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">{c.nome.charAt(0).toUpperCase()}</div>{c.nome}</div></td>
                <td className="px-6 py-4 text-sm text-slate-500">{c.cpf_cnpj||'—'}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{c.cidade||'—'}</td>
                <td className="px-6 py-4">{c.whatsapp?<a href={`https://wa.me/55${c.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline"><MessageSquare size={13}/>{c.whatsapp}</a>:<span className="text-slate-300 text-sm">—</span>}</td>
                <td className="px-6 py-4"><div className="flex gap-2"><button onClick={()=>onVerPerfil(c)} className="text-indigo-600 font-bold text-sm hover:underline">Perfil</button><span className="text-slate-200">|</span><button onClick={()=>excluir(c.id)} className="text-rose-400 font-bold text-sm hover:text-rose-600 hover:underline">Excluir</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── FORNECEDORES ──────────────────────────────────────────── */
function FornecedoresView({searchQuery,onAdd,onEditar}:{searchQuery:string;onAdd:()=>void;onEditar:(f:any)=>void}) {
  const{fornecedores,loading,refetch}=useFornecedores(searchQuery);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const[importando,setImportando]=useState(false);
  const excluir=async(id:string)=>{if(!confirm('Excluir este fornecedor?'))return;await supabase.from('fornecedores').delete().eq('id',id);refetch();};

  const exportarXLS=()=>{
    const wsData=[
      ['Nome','CNPJ','Contato','WhatsApp','E-mail','Cidade'],
      ...fornecedores.map(f=>[f.nome,f.cnpj||'',f.contato||'',f.whatsapp||'',f.email||'',f.cidade||''])
    ];
    const ws=XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols']=[{wch:30},{wch:18},{wch:20},{wch:16},{wch:28},{wch:16}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Fornecedores');
    XLSX.writeFile(wb,'fornecedores.xlsx');
  };

  const importarXLS=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];if(!file)return;setImportando(true);
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'buffer'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows:any[][]=XLSX.utils.sheet_to_json(ws,{header:1});
    const dataRows=rows.slice(1).filter((r:any[])=>r[0]);
    let ok=0,erros=0;
    for(const cols of dataRows){
      const{error}=await supabase.from('fornecedores').insert({nome:String(cols[0]),cnpj:cols[1]||null,contato:cols[2]||null,whatsapp:cols[3]||null,email:cols[4]||null,cidade:cols[5]||null});
      if(error)erros++;else ok++;
    }
    setImportando(false);refetch();alert(`Importação concluída! ✅\n${ok} fornecedores importados.\n${erros>0?erros+' erros.':''}`);
    if(fileInputRef.current)fileInputRef.current.value='';
  };

  if(loading)return<LoadingSpinner label="Carregando fornecedores..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Fornecedores</h2><p className="text-slate-500 text-sm">{fornecedores.length} fornecedores</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportarXLS} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-all">
            <Download size={14}/>Exportar XLS
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer">
            <Upload size={14}/>
            {importando?'Importando...':'Importar XLS'}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importarXLS}/>
          </label>
          <button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><Plus size={15} strokeWidth={3}/>Novo Fornecedor</button>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{['Fornecedor','CNPJ','Contato','WhatsApp','Ações'].map(h=><th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {fornecedores.length===0&&<tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Nenhum fornecedor.</td></tr>}
            {fornecedores.map(f=>(
              <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-800 text-sm">{f.nome}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{f.cnpj||'—'}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{f.contato||'—'}</td>
                <td className="px-6 py-4">{f.whatsapp?<a href={`https://wa.me/55${f.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline"><MessageSquare size={13}/>{f.whatsapp}</a>:<span className="text-slate-300 text-sm">—</span>}</td>
                <td className="px-6 py-4"><div className="flex gap-2"><button onClick={()=>onEditar(f)} className="text-indigo-600 font-bold text-sm hover:underline">Editar</button><span className="text-slate-200">|</span><button onClick={()=>excluir(f.id)} className="text-rose-400 font-bold text-sm hover:text-rose-600 hover:underline">Excluir</button></div></td>
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
  const[filtroStatus,setFiltroStatus]=useState('Todos');
  const[busca,setBusca]=useState(searchQuery||'');
  const[de,setDe]=useState('');
  const[ate,setAte]=useState('');
  const load=useCallback(async()=>{setLoading(true);const{data}=await supabase.from('compras').select('*').order('created_at',{ascending:false});setCompras(data||[]);setLoading(false);},[]);
  useEffect(()=>{load();},[load]);
  // sync external searchQuery
  useEffect(()=>{setBusca(searchQuery||'');},[searchQuery]);
  const excluir=async(id:string)=>{if(!confirm('Excluir esta compra?'))return;await supabase.from('compras').delete().eq('id',id);load();};
  const filtradas=compras.filter(c=>{
    if(filtroStatus!=='Todos'&&c.status!==filtroStatus)return false;
    if(busca&&!c.fornecedor_nome?.toLowerCase().includes(busca.toLowerCase())&&!(c.nota_fiscal||'').toLowerCase().includes(busca.toLowerCase()))return false;
    const dataC=(c.data||'').slice(0,10);
    if(de&&dataC&&dataC<de)return false;
    if(ate&&dataC&&dataC>ate)return false;
    return true;
  });
  const temFiltro=busca||filtroStatus!=='Todos'||de||ate;
  const limparFiltros=()=>{setBusca('');setFiltroStatus('Todos');setDe('');setAte('');};
  const totalFiltrado=filtradas.reduce((a,c)=>a+Number(c.total||0),0);
  if(loading)return<LoadingSpinner label="Carregando compras..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Compras</h2><p className="text-slate-500 text-sm">{filtradas.length} de {compras.length} registros{temFiltro&&` • Total: R$ ${totalFiltrado.toFixed(2)}`}</p></div>
        <button onClick={onAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><Plus size={15} strokeWidth={3}/>Nova Compra</button>
      </div>
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between"><p className="text-xs font-black text-slate-400 uppercase tracking-wider">Filtros</p>{temFiltro&&<button onClick={limparFiltros} className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg">Limpar</button>}</div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Fornecedor ou nota fiscal..." value={busca} onChange={e=>setBusca(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400"/></div>
          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400">
            <option value="Todos">Todos os status</option>
            {STATUS_COMPRA.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-slate-400 uppercase shrink-0">De</span>
            <input type="date" value={de} onChange={e=>setDe(e.target.value)} className="text-sm outline-none bg-transparent"/>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Até</span>
            <input type="date" value={ate} onChange={e=>setAte(e.target.value)} className="text-sm outline-none bg-transparent"/>
          </div>
          <button onClick={load} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl ml-auto" title="Atualizar"><RefreshCw size={16}/></button>
        </div>
        {temFiltro&&<p className="text-xs text-indigo-600 font-bold">{filtradas.length} resultado{filtradas.length!==1?'s':''} encontrado{filtradas.length!==1?'s':''}</p>}
      </div>
      {filtradas.length===0?(
        <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center gap-3 text-slate-300"><Truck size={44}/><p className="font-black text-slate-400 text-lg uppercase">Nenhuma compra</p><p className="text-slate-400 text-sm">{temFiltro?'Tente ajustar os filtros.':''}</p></div>
      ):(
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left min-w-[650px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">{['Fornecedor','Data','Nota Fiscal','Total','Status','Ações'].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.map(c=>(
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-800 text-sm">{c.fornecedor_nome}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{c.data?new Date(c.data).toLocaleDateString('pt-BR'):'—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{c.nota_fiscal||'—'}</td>
                  <td className="px-5 py-4 font-black text-indigo-600 text-sm">R$ {Number(c.total||0).toFixed(2)}</td>
                  <td className="px-5 py-4"><BadgeStatus status={c.status||'Pendente'} options={STATUS_COMPRA} onChange={async s=>{await supabase.from('compras').update({status:s}).eq('id',c.id);load();}}/></td>
                  <td className="px-5 py-4"><div className="flex gap-2"><button onClick={()=>onAbrirDetalhe(c)} className="text-indigo-600 font-bold text-sm hover:underline">Detalhes</button><span className="text-slate-200">|</span><button onClick={()=>excluir(c.id)} className="text-rose-400 font-bold text-sm hover:text-rose-600 hover:underline">Excluir</button></div></td>
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
  const{fornecedores}=useFornecedores();
  const[status,setStatus]=useState(compra.status||'Pendente');
  const[itens,setItens]=useState<any[]>(compra.itens||[]);
  const[salvando,setSalvando]=useState(false);
  const[toast,setToast]=useState('');
  const[toastColor,setToastColor]=useState<'emerald'|'indigo'|'rose'>('emerald');
  // Campos editáveis de cabeçalho
  const[fornNome,setFornNome]=useState(compra.fornecedor_nome||'');
  const[data,setData]=useState(compra.data?compra.data.slice(0,10):'');
  const[notaFiscal,setNotaFiscal]=useState(compra.nota_fiscal||'');
  const[observacoes,setObservacoes]=useState(compra.observacoes||'');
  const[buscaForn,setBuscaForn]=useState('');
  const[showForn,setShowForn]=useState(false);
  const fornRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(fornRef.current&&!fornRef.current.contains(e.target as Node))setShowForn(false);};
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);
  },[]);

  const fornFilt=fornecedores.filter(f=>f.nome.toLowerCase().includes(buscaForn.toLowerCase())&&buscaForn.length>0).slice(0,6);
  const total=itens.reduce((a,i)=>a+Number(i.quantidade)*Number(i.valor_unitario),0);

  const addLinha=()=>setItens(p=>[...p,{id:crypto.randomUUID(),descricao:'',quantidade:1,valor_unitario:0}]);
  const upd=(id:string,k:string,v:any)=>setItens(p=>p.map(i=>i.id===id?{...i,[k]:v}:i));
  const del=(id:string)=>setItens(p=>p.filter(i=>i.id!==id));

  const salvar=async()=>{
    if(!fornNome.trim()){alert('Informe o fornecedor.');return;}
    setSalvando(true);
    await supabase.from('compras').update({
      status,
      itens,
      total,
      fornecedor_nome:fornNome,
      data:data||null,
      nota_fiscal:notaFiscal||null,
      observacoes:observacoes||null,
    }).eq('id',compra.id);

    // Se status mudou para Recebido → atualiza estoque com custo médio ponderado
    if(status==='Recebido'&&compra.status!=='Recebido'){
      await atualizarEstoqueCompra(itens);
      setToast('Compra salva e estoque atualizado! ✅');setToastColor('emerald');
    } else {
      setToast('Compra salva!');setToastColor('emerald');
    }
    setSalvando(false);
  };

  // Atualiza estoque com custo médio ponderado ao receber uma compra
  const atualizarEstoqueCompra=async(itensCompra:any[])=>{
    const errosNaoEncontrados:string[]=[];
    for(const item of itensCompra){
      const qtdComprada=Number(item.quantidade)||0;
      const custoCompra=Number(item.valor_unitario)||0;
      if(!qtdComprada||!item.descricao?.trim())continue;

      let insumo:any=null;

      // 1. Tenta por insumo_id (quando item foi adicionado via busca de insumo)
      if(item.insumo_id){
        const{data}=await supabase.from('insumos').select('id,nome,estoque_atual,custo_unitario').eq('id',item.insumo_id).eq('ativo',true).maybeSingle();
        insumo=data;
      }

      // 2. Tenta por nome exato (case-insensitive)
      if(!insumo){
        const{data}=await supabase.from('insumos').select('id,nome,estoque_atual,custo_unitario')
          .ilike('nome',item.descricao.trim()).eq('ativo',true).maybeSingle();
        insumo=data;
      }

      // 3. Tenta busca parcial (contém o texto)
      if(!insumo){
        const{data}=await supabase.from('insumos').select('id,nome,estoque_atual,custo_unitario')
          .ilike('nome',`%${item.descricao.trim()}%`).eq('ativo',true).limit(1);
        insumo=data?.[0]||null;
      }

      if(!insumo){
        errosNaoEncontrados.push(item.descricao);
        continue;
      }

      const qtdAtual=Number(insumo.estoque_atual)||0;
      const custoAtual=Number(insumo.custo_unitario)||0;
      const novaQtd=qtdAtual+qtdComprada;
      // Custo médio ponderado
      const novoCusto=novaQtd>0?((qtdAtual*custoAtual)+(qtdComprada*custoCompra))/novaQtd:custoCompra;

      await supabase.from('insumos').update({
        estoque_atual:Number(novaQtd.toFixed(4)),
        custo_unitario:Number(novoCusto.toFixed(6)),
        updated_at:new Date().toISOString(),
      }).eq('id',insumo.id);
    }
    if(errosNaoEncontrados.length>0){
      console.warn('Insumos não encontrados no estoque (atualize manualmente):', errosNaoEncontrados);
    }
  };

  const enviarContasPagar=async()=>{
    if(!confirm('Lançar esta compra em Contas a Pagar?'))return;
    setSalvando(true);
    await supabase.from('contas_pagar').insert({
      compra_id:compra.id,
      fornecedor_nome:fornNome,
      descricao:`Compra de ${fornNome}${notaFiscal?' — NF '+notaFiscal:''}`,
      valor:total||compra.total,
      data_vencimento:data||null,
      status:'Aguardando',
    });
    await supabase.from('compras').update({status:'Recebido'}).eq('id',compra.id);
    // Atualiza estoque com custo médio ponderado ao receber a compra
    if(compra.status!=='Recebido'){
      await atualizarEstoqueCompra(itens);
    }
    setSalvando(false);setToast('Lançado em Contas a Pagar e estoque atualizado! ✅');setToastColor('indigo');setTimeout(onClose,1800);
  };

  return(
    <>
    <ModalWrapper title={`Editar Compra — ${compra.fornecedor_nome}`} onClose={onClose} size="lg">
      {/* Cabeçalho editável */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Dados da Compra</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Fornecedor */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Fornecedor *</label>
            <div className="relative" ref={fornRef}>
              <input type="text" placeholder="Nome do fornecedor..." value={buscaForn||fornNome}
                onChange={e=>{setBuscaForn(e.target.value);setFornNome(e.target.value);setShowForn(true);}}
                onFocus={()=>{setBuscaForn(fornNome);setShowForn(true);}}
                onBlur={()=>setTimeout(()=>setShowForn(false),150)}
                className={inputClass}/>
              {showForn&&fornFilt.length>0&&(
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-40 overflow-y-auto">
                  {fornFilt.map(f=><button key={f.id} onClick={()=>{setFornNome(f.nome);setBuscaForn('');setShowForn(false);}} className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm font-bold">{f.nome}<span className="text-xs text-slate-400 ml-2 font-normal">{f.cnpj||''}</span></button>)}
                </div>
              )}
            </div>
          </div>
          {/* Status */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
            <BadgeStatus status={status} options={STATUS_COMPRA} onChange={setStatus}/>
          </div>
          {/* Data */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Data da Compra</label>
            <input type="date" value={data} onChange={e=>setData(e.target.value)} className={inputClass}/>
          </div>
          {/* Nota Fiscal */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Nota Fiscal</label>
            <input type="text" placeholder="NF-e 000123" value={notaFiscal} onChange={e=>setNotaFiscal(e.target.value)} className={inputClass}/>
          </div>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Observações</label>
          <input type="text" value={observacoes} onChange={e=>setObservacoes(e.target.value)} className={inputClass}/>
        </div>
      </div>

      {/* Itens */}
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
                  <td className="px-3 py-2 text-right font-black text-indigo-600 text-sm">R$ {(Number(item.quantidade)*Number(item.valor_unitario)).toFixed(2)}</td>
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
      {status==='Recebido'&&compra.status!=='Recebido'&&(
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={13}/>Ao salvar com status Recebido, o estoque dos insumos será atualizado automaticamente com custo médio ponderado.
        </div>
      )}
      <button onClick={enviarContasPagar} disabled={salvando}
        className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2">
        <TrendingDown size={16}/>Enviar para Contas a Pagar {compra.status!=='Recebido'?'(+ atualiza estoque)':''}
      </button>
    </ModalWrapper>
    <AnimatePresence>{toast&&<Toast message={toast} color={toastColor} onClose={()=>setToast('')}/>}</AnimatePresence>
    </>
  );
}

/* ── VENDAS (resumo de orçamentos finalizados) ─────────────── */
function ContasReceberView({onEditar}:{onEditar:(c:any)=>void}) {
  const[contas,setContas]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[erroTabela,setErroTabela]=useState(false);
  const[busca,setBusca]=useState('');
  const[filtroStatus,setFiltroStatus]=useState('Todos');
  const[de,setDe]=useState('');
  const[ate,setAte]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setErroTabela(false);
    const{data,error}=await supabase.from('contas_receber').select('*').order('data_vencimento',{ascending:true});
    if(error){console.error('contas_receber:',error.message);setErroTabela(true);}
    else setContas(data||[]);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const filtradas=contas.filter(c=>{
    if(busca&&!(c.cliente_nome||'').toLowerCase().includes(busca.toLowerCase())&&!(c.descricao||'').toLowerCase().includes(busca.toLowerCase()))return false;
    if(filtroStatus!=='Todos'&&c.status!==filtroStatus)return false;
    const venc=(c.data_vencimento||'').slice(0,10);
    if(de&&venc&&venc<de)return false;
    if(ate&&venc&&venc>ate)return false;
    return true;
  });

  const aReceber=filtradas.filter(c=>c.status==='Aguardando').reduce((a,c)=>a+Number(c.valor),0);
  const recebido=filtradas.filter(c=>c.status==='Recebido').reduce((a,c)=>a+Number(c.valor),0);
  const atrasado=filtradas.filter(c=>c.status==='Atrasado').reduce((a,c)=>a+Number(c.valor),0);
  const temFiltro=busca||filtroStatus!=='Todos'||de||ate;
  const limparFiltros=()=>{setBusca('');setFiltroStatus('Todos');setDe('');setAte('');};

  if(loading)return<LoadingSpinner label="Carregando contas a receber..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Contas a Receber</h2><p className="text-slate-500 text-sm">Clique em Editar para alterar valor, vencimento, conta ou status</p></div>
        <button onClick={load} className="flex items-center gap-2 p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Atualizar"><RefreshCw size={17}/></button>
      </div>
      {erroTabela&&<ErroTabela tabela="contas_receber"/>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs font-black text-slate-400 uppercase mb-1">A Receber</p><p className="text-xl font-black text-amber-600">R$ {aReceber.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs font-black text-slate-400 uppercase mb-1">Recebido</p><p className="text-xl font-black text-emerald-600">R$ {recebido.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs font-black text-slate-400 uppercase mb-1">Atrasado</p><p className="text-xl font-black text-rose-600">R$ {atrasado.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs font-black text-slate-400 uppercase mb-1">Registros</p><p className="text-xl font-black text-slate-700">{filtradas.length}</p></div>
      </div>
      {!erroTabela&&(
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between"><p className="text-xs font-black text-slate-400 uppercase tracking-wider">Filtros</p>{temFiltro&&<button onClick={limparFiltros} className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg">Limpar</button>}</div>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Cliente ou descrição..." value={busca} onChange={e=>setBusca(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400"/></div>
            <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400">
              <option value="Todos">Todos os status</option>
              {STATUS_CR.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-slate-400 uppercase shrink-0">De</span>
              <input type="date" value={de} onChange={e=>setDe(e.target.value)} className="text-sm outline-none bg-transparent"/>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Até</span>
              <input type="date" value={ate} onChange={e=>setAte(e.target.value)} className="text-sm outline-none bg-transparent"/>
            </div>
          </div>
          {temFiltro&&<p className="text-xs text-indigo-600 font-bold">{filtradas.length} resultado{filtradas.length!==1?'s':''} encontrado{filtradas.length!==1?'s':''}</p>}
        </div>
      )}
      {!erroTabela&&filtradas.length===0&&<div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center gap-4 text-slate-300"><TrendingUp size={48}/><p className="font-black text-slate-400 text-lg uppercase tracking-widest">Nenhuma conta</p><p className="text-slate-400 text-sm">{temFiltro?'Tente ajustar os filtros.':'Transforme um orçamento em venda no CRM/Kanban.'}</p></div>}
      {filtradas.length>0&&(
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">{['Cliente','Descrição','Valor','Vencimento','Conta Bancária','Status','Ação'].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.map(c=>{
                const venc=c.data_vencimento?new Date(c.data_vencimento+'T12:00:00'):null;
                const atras=venc&&venc<new Date()&&c.status==='Aguardando';
                return(
                  <tr key={c.id} className={cn('hover:bg-slate-50 transition-colors',atras&&'bg-rose-50/30')}>
                    <td className="px-5 py-4 font-bold text-slate-800 text-sm">{c.cliente_nome}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 max-w-[160px] truncate">{c.descricao||'—'}</td>
                    <td className="px-5 py-4 font-black text-emerald-600 text-sm">R$ {Number(c.valor).toFixed(2)}</td>
                    <td className={cn('px-5 py-4 text-sm font-bold',atras?'text-rose-600':'text-slate-500')}>{venc?venc.toLocaleDateString('pt-BR'):'—'}{atras&&' ⚠️'}</td>
                    <td className="px-5 py-4">
                      {c.conta_bancaria_nome
                        ?<span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full"><Landmark size={11}/>{c.conta_bancaria_nome}</span>
                        :<span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-4"><BadgeStatus status={c.status||'Aguardando'} options={STATUS_CR} onChange={async s=>{await supabase.from('contas_receber').update({status:s,data_recebimento:s==='Recebido'?new Date().toISOString():null}).eq('id',c.id);load();}}/></td>
                    <td className="px-5 py-4 flex gap-2">
                      <button onClick={()=>onEditar(c)} className="text-indigo-600 font-bold text-sm hover:underline">Editar</button>
                      <span className="text-slate-200">|</span>
                      <button onClick={async()=>{if(!confirm('Excluir esta conta a receber?'))return;await supabase.from('contas_receber').delete().eq('id',c.id);load();}} className="text-rose-400 font-bold text-sm hover:text-rose-600 hover:underline">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── CONTAS A PAGAR ────────────────────────────────────────── */
function ContasPagarView({onEditar}:{onEditar:(c:any)=>void}) {
  const[contas,setContas]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[erroTabela,setErroTabela]=useState(false);
  const[busca,setBusca]=useState('');
  const[filtroStatus,setFiltroStatus]=useState('Todos');
  const[de,setDe]=useState('');
  const[ate,setAte]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setErroTabela(false);
    const{data,error}=await supabase.from('contas_pagar').select('*').order('data_vencimento',{ascending:true});
    if(error){console.error('contas_pagar:',error.message);setErroTabela(true);}
    else setContas(data||[]);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const filtradas=contas.filter(c=>{
    if(busca&&!(c.fornecedor_nome||'').toLowerCase().includes(busca.toLowerCase())&&!(c.descricao||'').toLowerCase().includes(busca.toLowerCase()))return false;
    if(filtroStatus!=='Todos'&&c.status!==filtroStatus)return false;
    const venc=(c.data_vencimento||'').slice(0,10);
    if(de&&venc&&venc<de)return false;
    if(ate&&venc&&venc>ate)return false;
    return true;
  });

  const aPagar=filtradas.filter(c=>c.status==='Aguardando').reduce((a,c)=>a+Number(c.valor),0);
  const pago=filtradas.filter(c=>c.status==='Pago').reduce((a,c)=>a+Number(c.valor),0);
  const atrasado=filtradas.filter(c=>c.status==='Atrasado').reduce((a,c)=>a+Number(c.valor),0);
  const temFiltro=busca||filtroStatus!=='Todos'||de||ate;
  const limparFiltros=()=>{setBusca('');setFiltroStatus('Todos');setDe('');setAte('');};

  if(loading)return<LoadingSpinner label="Carregando contas a pagar..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Contas a Pagar</h2><p className="text-slate-500 text-sm">Clique em Editar para alterar valor, vencimento ou status</p></div>
        <button onClick={load} className="flex items-center gap-2 p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Atualizar"><RefreshCw size={17}/></button>
      </div>
      {erroTabela&&<ErroTabela tabela="contas_pagar"/>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs font-black text-slate-400 uppercase mb-1">A Pagar</p><p className="text-xl font-black text-rose-600">R$ {aPagar.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs font-black text-slate-400 uppercase mb-1">Pago</p><p className="text-xl font-black text-emerald-600">R$ {pago.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs font-black text-slate-400 uppercase mb-1">Atrasado</p><p className="text-xl font-black text-amber-600">R$ {atrasado.toFixed(2)}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4"><p className="text-xs font-black text-slate-400 uppercase mb-1">Registros</p><p className="text-xl font-black text-slate-700">{filtradas.length}</p></div>
      </div>
      {/* Filtros */}
      {!erroTabela&&(
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between"><p className="text-xs font-black text-slate-400 uppercase tracking-wider">Filtros</p>{temFiltro&&<button onClick={limparFiltros} className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg">Limpar</button>}</div>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Fornecedor ou descrição..." value={busca} onChange={e=>setBusca(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400"/></div>
            <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400">
              <option value="Todos">Todos os status</option>
              {STATUS_CP.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-slate-400 uppercase shrink-0">De</span>
              <input type="date" value={de} onChange={e=>setDe(e.target.value)} className="text-sm outline-none bg-transparent"/>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Até</span>
              <input type="date" value={ate} onChange={e=>setAte(e.target.value)} className="text-sm outline-none bg-transparent"/>
            </div>
          </div>
          {temFiltro&&<p className="text-xs text-indigo-600 font-bold">{filtradas.length} resultado{filtradas.length!==1?'s':''} encontrado{filtradas.length!==1?'s':''}</p>}
        </div>
      )}
      {!erroTabela&&filtradas.length===0&&<div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center gap-4 text-slate-300"><TrendingDown size={48}/><p className="font-black text-slate-400 text-lg uppercase tracking-widest">Nenhuma conta</p><p className="text-slate-400 text-sm">{temFiltro?'Tente ajustar os filtros.':'Envie compras para Contas a Pagar nos detalhes de uma compra.'}</p></div>}
      {filtradas.length>0&&(
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">{['Fornecedor','Descrição','Valor','Vencimento','Conta Bancária','Status','Ação'].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.map(c=>{
                const venc=c.data_vencimento?new Date(c.data_vencimento+'T12:00:00'):null;
                const atras=venc&&venc<new Date()&&c.status==='Aguardando';
                return(
                  <tr key={c.id} className={cn('hover:bg-slate-50 transition-colors',atras&&'bg-rose-50/30')}>
                    <td className="px-5 py-4 font-bold text-slate-800 text-sm">{c.fornecedor_nome}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 max-w-[160px] truncate">{c.descricao||'—'}</td>
                    <td className="px-5 py-4 font-black text-rose-600 text-sm">R$ {Number(c.valor).toFixed(2)}</td>
                    <td className={cn('px-5 py-4 text-sm font-bold',atras?'text-rose-600':'text-slate-500')}>{venc?venc.toLocaleDateString('pt-BR'):'—'}{atras&&' ⚠️'}</td>
                    <td className="px-5 py-4">
                      {c.conta_bancaria_nome
                        ?<span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full"><Landmark size={11}/>{c.conta_bancaria_nome}</span>
                        :<span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-4"><BadgeStatus status={c.status||'Aguardando'} options={STATUS_CP} onChange={async s=>{await supabase.from('contas_pagar').update({status:s,data_pagamento:s==='Pago'?new Date().toISOString():null}).eq('id',c.id);load();}}/></td>
                    <td className="px-5 py-4 flex gap-2">
                      <button onClick={()=>onEditar(c)} className="text-indigo-600 font-bold text-sm hover:underline">Editar</button>
                      <span className="text-slate-200">|</span>
                      <button onClick={async()=>{if(!confirm('Excluir esta conta a pagar?'))return;await supabase.from('contas_pagar').delete().eq('id',c.id);load();}} className="text-rose-400 font-bold text-sm hover:text-rose-600 hover:underline">Excluir</button>
                    </td>
                  </tr>
                );
              })}
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
  const[insumosList,setInsumosList]=useState<any[]>([]);
  const[buscaInsumo,setBuscaInsumo]=useState('');const[showInsumo,setShowInsumo]=useState(false);const insumoRef=useRef<HTMLDivElement>(null);
  const[itens,setItens]=useState([{id:crypto.randomUUID(),descricao:'',quantidade:1,valor_unitario:0}]);
  const[form,setForm]=useState({data:new Date().toISOString().split('T')[0],nota_fiscal:'',observacoes:''});
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  useEffect(()=>{const h=(e:MouseEvent)=>{if(fRef.current&&!fRef.current.contains(e.target as Node))setShowF(false);if(insumoRef.current&&!insumoRef.current.contains(e.target as Node))setShowInsumo(false);};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);
  useEffect(()=>{supabase.from('insumos').select('*').eq('ativo',true).order('nome').then(({data})=>setInsumosList(data||[]));},[]);
  const fornFilt=fornecedores.filter(f=>f.nome.toLowerCase().includes(buscaF.toLowerCase())&&buscaF.length>0).slice(0,6);
  const insumosFilt=insumosList.filter(i=>i.nome.toLowerCase().includes(buscaInsumo.toLowerCase())&&buscaInsumo.length>0).slice(0,6);
  const addInsumo=(ins:any)=>{setItens(p=>[...p,{id:crypto.randomUUID(),insumo_id:ins.id,descricao:ins.nome,quantidade:1,valor_unitario:Number(ins.custo_unitario)||0}]);setBuscaInsumo('');setShowInsumo(false);};
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
        <div className="flex justify-between items-center"><p className="text-xs font-black text-slate-500 uppercase">Itens Comprados</p><button onClick={addL} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><Plus size={11}/>Adicionar linha manual</button></div>
        {/* Busca de insumos */}
        <div className="relative" ref={insumoRef}>
          <input type="text" placeholder="Buscar insumo do estoque (Papel, Tinta, Vinil...)..." className={inputClass} value={buscaInsumo} onChange={e=>{setBuscaInsumo(e.target.value);setShowInsumo(true);}} onFocus={()=>setShowInsumo(true)}/>
          {showInsumo&&buscaInsumo.length>0&&(
            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
              {insumosFilt.length>0
                ?insumosFilt.map(ins=><button key={ins.id} onClick={()=>addInsumo(ins)} className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center justify-between"><div><p className="font-bold text-sm">{ins.nome}</p><p className="text-xs text-slate-400">{ins.tipo} • R$ {Number(ins.custo_unitario).toFixed(4)}/{ins.unidade_medida}</p></div><Plus size={14} className="text-indigo-400"/></button>)
                :<div className="p-4 text-sm text-slate-500">Insumo não encontrado. Use "Adicionar linha manual".</div>
              }
            </div>
          )}
        </div>
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

/* ── ERRO TABELA (helper component) ───────────────────────── */
function ErroTabela({tabela}:{tabela:string}) {
  return(
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4">
      <AlertTriangle size={22} className="text-rose-500 shrink-0 mt-0.5"/>
      <div>
        <p className="font-black text-rose-700 mb-1">Tabela não encontrada no Supabase</p>
        <p className="text-rose-600 text-sm mb-2">A tabela <code className="bg-rose-100 px-1.5 py-0.5 rounded font-mono">{tabela}</code> ainda não existe.</p>
        <p className="text-rose-600 text-sm">Execute o arquivo <code className="bg-rose-100 px-1 rounded font-mono">supabase_novas_tabelas.sql</code> no SQL Editor do Supabase.</p>
      </div>
    </div>
  );
}

/* ── MODAL EDITAR CONTA A RECEBER ──────────────────────────── */
function ModalEditarCR({conta,onClose}:{conta:any;onClose:()=>void}) {
  const[form,setForm]=useState({
    cliente_nome:conta.cliente_nome||'',
    descricao:conta.descricao||'',
    valor:String(conta.valor||0),
    data_vencimento:conta.data_vencimento||'',
    status:conta.status||'Aguardando',
    conta_bancaria_id:conta.conta_bancaria_id||'',
    conta_bancaria_nome:conta.conta_bancaria_nome||'',
  });
  const[contas,setContas]=useState<any[]>([]);
  const[salvando,setSalvando]=useState(false);const[toast,setToast]=useState('');
  useEffect(()=>{supabase.from('contas_bancarias').select('id,nome,banco').eq('ativa',true).order('nome').then(({data})=>setContas(data||[]));},[]);
  const salvar=async()=>{
    setSalvando(true);
    const cb=contas.find(c=>c.id===form.conta_bancaria_id);
    await supabase.from('contas_receber').update({
      cliente_nome:form.cliente_nome,
      descricao:form.descricao||null,
      valor:Number(form.valor),
      data_vencimento:form.data_vencimento||null,
      status:form.status,
      conta_bancaria_id:form.conta_bancaria_id||null,
      conta_bancaria_nome:cb?.nome||null,
      data_recebimento:form.status==='Recebido'?(conta.data_recebimento||new Date().toISOString()):null,
    }).eq('id',conta.id);
    setSalvando(false);setToast('Conta atualizada! ✅');setTimeout(onClose,1400);
  };
  return(<><ModalWrapper title="Editar Conta a Receber" onClose={onClose}>
    <Campo label="Cliente"><input type="text" value={form.cliente_nome} onChange={e=>setForm({...form,cliente_nome:e.target.value})} className={inputClass}/></Campo>
    <Campo label="Descrição"><input type="text" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} className={inputClass}/></Campo>
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Valor (R$)"><input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className={inputClass}/></Campo>
      <Campo label="Data de Vencimento"><input type="date" value={form.data_vencimento} onChange={e=>setForm({...form,data_vencimento:e.target.value})} className={inputClass}/></Campo>
    </div>
    <Campo label="Conta Bancária (onde será recebido)">
      <select value={form.conta_bancaria_id} onChange={e=>setForm({...form,conta_bancaria_id:e.target.value})} className={inputClass}>
        <option value="">— Sem conta vinculada —</option>
        {contas.map(c=><option key={c.id} value={c.id}>{c.nome}{c.banco?` — ${c.banco}`:''}</option>)}
      </select>
    </Campo>
    <Campo label="Status">
      <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={inputClass}>
        {STATUS_CR.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
    </Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Salvar Alterações"/>
  </ModalWrapper>
  <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── MODAL EDITAR CONTA A PAGAR ────────────────────────────── */
function ModalEditarCP({conta,onClose}:{conta:any;onClose:()=>void}) {
  const[form,setForm]=useState({
    fornecedor_nome:conta.fornecedor_nome||'',
    descricao:conta.descricao||'',
    valor:String(conta.valor||0),
    data_vencimento:conta.data_vencimento||'',
    status:conta.status||'Aguardando',
    conta_bancaria_id:conta.conta_bancaria_id||'',
    conta_bancaria_nome:conta.conta_bancaria_nome||'',
  });
  const[contas,setContas]=useState<any[]>([]);
  const[salvando,setSalvando]=useState(false);const[toast,setToast]=useState('');
  useEffect(()=>{supabase.from('contas_bancarias').select('id,nome,banco').eq('ativa',true).order('nome').then(({data})=>setContas(data||[]));},[]);
  const salvar=async()=>{
    setSalvando(true);
    const cb=contas.find(c=>c.id===form.conta_bancaria_id);
    await supabase.from('contas_pagar').update({
      fornecedor_nome:form.fornecedor_nome,
      descricao:form.descricao||null,
      valor:Number(form.valor),
      data_vencimento:form.data_vencimento||null,
      status:form.status,
      conta_bancaria_id:form.conta_bancaria_id||null,
      conta_bancaria_nome:cb?.nome||null,
      data_pagamento:form.status==='Pago'?(conta.data_pagamento||new Date().toISOString()):null,
    }).eq('id',conta.id);
    setSalvando(false);setToast('Conta atualizada! ✅');setTimeout(onClose,1400);
  };
  return(<><ModalWrapper title="Editar Conta a Pagar" onClose={onClose}>
    <Campo label="Fornecedor"><input type="text" value={form.fornecedor_nome} onChange={e=>setForm({...form,fornecedor_nome:e.target.value})} className={inputClass}/></Campo>
    <Campo label="Descrição"><input type="text" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} className={inputClass}/></Campo>
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Valor (R$)"><input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className={inputClass}/></Campo>
      <Campo label="Data de Vencimento"><input type="date" value={form.data_vencimento} onChange={e=>setForm({...form,data_vencimento:e.target.value})} className={inputClass}/></Campo>
    </div>
    <Campo label="Conta Bancária (de onde sairá o pagamento)">
      <select value={form.conta_bancaria_id} onChange={e=>setForm({...form,conta_bancaria_id:e.target.value})} className={inputClass}>
        <option value="">— Sem conta vinculada —</option>
        {contas.map(c=><option key={c.id} value={c.id}>{c.nome}{c.banco?` — ${c.banco}`:''}</option>)}
      </select>
    </Campo>
    <Campo label="Status">
      <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={inputClass}>
        {STATUS_CP.map(s=><option key={s} value={s}>{s}</option>)}
      </select>
    </Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Salvar Alterações"/>
  </ModalWrapper>
  <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── CONTROLE DE CAIXA ─────────────────────────────────────── */
const CAT_CREDITO=['Venda','Recebimento','Aporte','Outros'];
const CAT_DEBITO=['Aluguel','Salário','Material','Energia','Internet','Manutenção','Impostos','Outros'];

function CaixaView({onNovo}:{onNovo:()=>void}) {
  const hoje=new Date();
  const[de,setDe]=useState(hoje.toISOString().slice(0,7)+'-01');
  const[ate,setAte]=useState(hoje.toISOString().slice(0,10));
  const[lancamentos,setLancamentos]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[erroTabela,setErroTabela]=useState(false);
  const[filtroTipo,setFiltroTipo]=useState('Todos');

  const load=useCallback(async()=>{
    setLoading(true);setErroTabela(false);
    const{data,error}=await supabase.from('caixa').select('*').order('data',{ascending:false});
    if(error)setErroTabela(true);else setLancamentos(data||[]);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const excluir=async(id:string)=>{if(!confirm('Excluir este lançamento?'))return;await supabase.from('caixa').delete().eq('id',id);load();};

  const filtrados=lancamentos.filter(l=>{
    if(l.data<de||l.data>ate)return false;
    if(filtroTipo!=='Todos'&&l.tipo!==filtroTipo)return false;
    return true;
  });

  const totalCredito=filtrados.filter(l=>l.tipo==='credito').reduce((a,l)=>a+Number(l.valor),0);
  const totalDebito=filtrados.filter(l=>l.tipo==='debito').reduce((a,l)=>a+Number(l.valor),0);
  const saldo=totalCredito-totalDebito;

  if(loading)return<LoadingSpinner label="Carregando caixa..."/>;
  return(
    <div className="space-y-5">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Controle de Caixa</h2><p className="text-slate-500 text-sm">{filtrados.length} lançamentos no período</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-slate-400 uppercase">De</span>
            <input type="date" value={de} onChange={e=>setDe(e.target.value)} className="text-sm outline-none bg-transparent"/>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Até</span>
            <input type="date" value={ate} onChange={e=>setAte(e.target.value)} className="text-sm outline-none bg-transparent"/>
          </div>
          <button onClick={load} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl" title="Atualizar"><RefreshCw size={17}/></button>
          <button onClick={onNovo} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all"><Plus size={15} strokeWidth={3}/>Novo Lançamento</button>
        </div>
      </div>
      {erroTabela&&<ErroTabela tabela="caixa"/>}

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase mb-1">Entradas</p><p className="text-2xl font-black text-emerald-600">R$ {totalCredito.toFixed(2)}</p></div>
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5"><p className="text-xs font-black text-slate-400 uppercase mb-1">Saídas</p><p className="text-2xl font-black text-rose-600">R$ {totalDebito.toFixed(2)}</p></div>
        <div className={cn('border rounded-2xl p-5',saldo>=0?'bg-indigo-50 border-indigo-100':'bg-rose-50 border-rose-100')}>
          <p className="text-xs font-black text-slate-400 uppercase mb-1">Saldo do Período</p>
          <p className={cn('text-2xl font-black',saldo>=0?'text-indigo-600':'text-rose-600')}>{saldo>=0?'+':''}R$ {saldo.toFixed(2)}</p>
        </div>
      </div>

      {/* Filtro tipo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3">
        {['Todos','credito','debito'].map(t=>(
          <button key={t} onClick={()=>setFiltroTipo(t)} className={cn('px-4 py-2 rounded-xl text-sm font-bold transition-all',filtroTipo===t?'bg-indigo-600 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
            {t==='Todos'?'Todos':t==='credito'?'Créditos':'Débitos'}
          </button>
        ))}
      </div>

      {!erroTabela&&filtrados.length===0&&<div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center gap-3 text-slate-300"><DollarSign size={44}/><p className="font-black text-slate-400 text-lg uppercase">Nenhum lançamento</p><p className="text-slate-400 text-sm">Ajuste o período ou clique em "Novo Lançamento".</p></div>}
      {filtrados.length>0&&(
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">{['Data','Tipo','Categoria','Descrição','Valor',''].map(h=><th key={h} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map(l=>(
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 text-sm text-slate-500">{l.data?new Date(l.data+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</td>
                  <td className="px-5 py-4"><span className={cn('text-[10px] font-black uppercase px-2.5 py-1 rounded-full',l.tipo==='credito'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700')}>{l.tipo==='credito'?'Crédito':'Débito'}</span></td>
                  <td className="px-5 py-4 text-sm text-slate-500">{l.categoria}</td>
                  <td className="px-5 py-4 text-sm text-slate-700 font-medium max-w-[200px] truncate">{l.descricao}</td>
                  <td className={cn('px-5 py-4 font-black text-sm',l.tipo==='credito'?'text-emerald-600':'text-rose-600')}>{l.tipo==='credito'?'+':'−'} R$ {Number(l.valor).toFixed(2)}</td>
                  <td className="px-5 py-4"><button onClick={()=>excluir(l.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── MODAL NOVO LANÇAMENTO DE CAIXA ────────────────────────── */
function ModalNovoLancamentoCaixa({onClose}:{onClose:()=>void}) {
  const[form,setForm]=useState({tipo:'credito',categoria:'Outros',descricao:'',valor:'',data:new Date().toISOString().split('T')[0],observacoes:''});
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  const categorias=form.tipo==='credito'?CAT_CREDITO:CAT_DEBITO;
  const salvar=async()=>{
    if(!form.descricao.trim()){setErro('Descrição obrigatória.');return;}
    if(!form.valor||Number(form.valor)<=0){setErro('Valor deve ser maior que zero.');return;}
    setSalvando(true);
    const{error}=await supabase.from('caixa').insert({tipo:form.tipo,categoria:form.categoria,descricao:form.descricao,valor:Number(form.valor),data:form.data,observacoes:form.observacoes||null});
    if(error){setErro('Erro: '+error.message);setSalvando(false);}
    else{setToast(form.tipo==='credito'?'Crédito lançado! ✅':'Débito lançado! ✅');setTimeout(onClose,1400);}
  };
  return(<><ModalWrapper title="Novo Lançamento de Caixa" onClose={onClose}>
    {erro&&<MsgErro msg={erro}/>}
    <div className="grid grid-cols-2 gap-3">
      <button onClick={()=>setForm({...form,tipo:'credito',categoria:'Outros'})} className={cn('py-4 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-1',form.tipo==='credito'?'bg-emerald-600 text-white shadow-lg':'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600')}>
        <TrendingUp size={22}/> CRÉDITO (Entrada)
      </button>
      <button onClick={()=>setForm({...form,tipo:'debito',categoria:'Outros'})} className={cn('py-4 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-1',form.tipo==='debito'?'bg-rose-600 text-white shadow-lg':'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600')}>
        <TrendingDown size={22}/> DÉBITO (Saída)
      </button>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Categoria">
        <select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} className={inputClass}>
          {categorias.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </Campo>
      <Campo label="Data"><input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} className={inputClass}/></Campo>
    </div>
    <Campo label="Descrição *"><input type="text" placeholder="Ex: Pagamento de aluguel, Recebimento cliente..." value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} className={inputClass}/></Campo>
    <Campo label="Valor (R$) *"><input type="number" step="0.01" min="0.01" placeholder="0,00" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className={inputClass}/></Campo>
    <Campo label="Observações"><textarea rows={2} value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} className={inputClass+' resize-none'}/></Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label={form.tipo==='credito'?'Lançar Crédito':'Lançar Débito'}/>
  </ModalWrapper>
  <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── CONFIG ────────────────────────────────────────────────── */
function ConfigView({onNovoUsuario,onEditarUsuario}:{onNovoUsuario:()=>void;onEditarUsuario:(u:any)=>void}) {
  const[usuarios,setUsuarios]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[erroTabela,setErroTabela]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);setErroTabela(false);
    const{data,error}=await supabase.from('usuarios_sistema').select('*').order('nome');
    if(error){setErroTabela(true);}else setUsuarios(data||[]);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const toggleAtivo=async(u:any)=>{
    await supabase.from('usuarios_sistema').update({ativo:!u.ativo}).eq('id',u.id);
    load();
  };

  return(
    <div className="space-y-6 max-w-3xl">
      <div><h2 className="text-2xl md:text-3xl font-black">Configurações</h2><p className="text-slate-500 text-sm">Gerenciamento de usuários e acessos</p></div>

      {/* Usuários */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div><h3 className="font-black text-slate-800">Usuários do Sistema</h3><p className="text-xs text-slate-400 mt-0.5">Login por e-mail e senha</p></div>
          <button onClick={onNovoUsuario} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all"><Plus size={14} strokeWidth={3}/>Novo Usuário</button>
        </div>
        {erroTabela&&<div className="p-4"><ErroTabela tabela="usuarios_sistema"/></div>}
        {loading?<div className="p-8"><LoadingSpinner label="Carregando..."/></div>:(
          <div className="divide-y divide-slate-100">
            {usuarios.length===0&&<p className="text-center text-slate-400 text-sm py-8">Nenhum usuário. Execute o SQL para criar a tabela.</p>}
            {usuarios.map(u=>(
              <div key={u.id} className="p-5 flex items-center gap-4">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0',u.role==='admin'?'bg-indigo-100 text-indigo-600':'bg-emerald-100 text-emerald-600')}>{u.nome.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-slate-800">{u.nome}</p>
                    <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full',u.role==='admin'?'bg-indigo-100 text-indigo-600':'bg-emerald-100 text-emerald-600')}>{u.role}</span>
                    {!u.ativo&&<span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Inativo</span>}
                  </div>
                  <p className="text-sm text-slate-400 font-medium">{u.email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={()=>onEditarUsuario(u)} className="text-indigo-600 font-bold text-sm hover:underline px-2">Editar</button>
                  <button onClick={()=>toggleAtivo(u)} className={cn('text-sm font-bold px-2',u.ativo?'text-slate-400 hover:text-rose-500':'text-emerald-600 hover:text-emerald-700')}>{u.ativo?'Desativar':'Ativar'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Níveis de acesso */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100"><h3 className="font-black text-slate-800">Níveis de Acesso</h3></div>
        {[{r:'Administrador',t:'admin',ic:<Shield size={18} className="text-indigo-600"/>,bg:'bg-indigo-50',p:['CRM/Kanban','Insumos','Produtos','Clientes','Fornecedores','Vendas','C.Receber','Compras','C.Pagar','Caixa','Config']},{r:'Colaborador',t:'colaborador',ic:<UserCheck size={18} className="text-emerald-600"/>,bg:'bg-emerald-50',p:['CRM/Kanban','Clientes','Compras']}].map(r=>(
          <div key={r.t} className="p-5 border-b border-slate-100 flex items-start gap-4 last:border-0">
            <div className={cn('p-2.5 rounded-xl shrink-0',r.bg)}>{r.ic}</div>
            <div><div className="flex items-center gap-2 mb-2"><p className="font-black text-slate-800 text-sm">{r.r}</p><span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{r.t}</span></div><div className="flex flex-wrap gap-1.5">{r.p.map(p=><span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">{p}</span>)}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── MODAL NOVO USUÁRIO ────────────────────────────────────── */
function ModalNovoUsuario({onClose}:{onClose:()=>void}) {
  const[form,setForm]=useState({nome:'',email:'',senha:'',role:'colaborador'});
  const[ver,setVer]=useState(false);
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  const salvar=async()=>{
    if(!form.nome.trim()||!form.email.trim()||!form.senha.trim()){setErro('Todos os campos são obrigatórios.');return;}
    if(!form.email.includes('@')){setErro('E-mail inválido.');return;}
    if(form.senha.length<6){setErro('Senha deve ter ao menos 6 caracteres.');return;}
    setSalvando(true);
    const{error}=await supabase.from('usuarios_sistema').insert({nome:form.nome,email:form.email.toLowerCase(),senha_hash:form.senha,role:form.role,ativo:true});
    if(error){setErro(error.message.includes('unique')?'E-mail já cadastrado.':'Erro: '+error.message);setSalvando(false);}
    else{setToast('Usuário criado! ✅');setTimeout(onClose,1400);}
  };
  return(<><ModalWrapper title="Novo Usuário" onClose={onClose}>
    {erro&&<MsgErro msg={erro}/>}
    <Campo label="Nome completo *"><input type="text" placeholder="Ex: João Silva" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo>
    <Campo label="E-mail *"><input type="email" placeholder="joao@empresa.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inputClass}/></Campo>
    <Campo label="Senha *">
      <div className="relative">
        <input type={ver?'text':'password'} placeholder="Mínimo 6 caracteres" value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})} className={inputClass+' pr-10'}/>
        <button onClick={()=>setVer(!ver)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">{ver?<EyeOff size={16}/>:<Eye size={16}/>}</button>
      </div>
    </Campo>
    <Campo label="Nível de Acesso">
      <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className={inputClass}>
        <option value="colaborador">Colaborador — Orçamentos e Compras</option>
        <option value="admin">Administrador — Acesso total</option>
      </select>
    </Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Criar Usuário"/>
  </ModalWrapper>
  <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── MODAL EDITAR USUÁRIO ──────────────────────────────────── */
function ModalEditarUsuario({usuario,onClose}:{usuario:any;onClose:()=>void}) {
  const[form,setForm]=useState({nome:usuario.nome||'',email:usuario.email||'',senha:'',role:usuario.role||'colaborador'});
  const[ver,setVer]=useState(false);
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  const salvar=async()=>{
    if(!form.nome.trim()||!form.email.trim()){setErro('Nome e e-mail são obrigatórios.');return;}
    if(form.senha&&form.senha.length<6){setErro('Nova senha deve ter ao menos 6 caracteres.');return;}
    setSalvando(true);
    const upd:any={nome:form.nome,email:form.email.toLowerCase(),role:form.role};
    if(form.senha)upd.senha_hash=form.senha;
    const{error}=await supabase.from('usuarios_sistema').update(upd).eq('id',usuario.id);
    if(error){setErro('Erro: '+error.message);setSalvando(false);}
    else{setToast('Usuário atualizado! ✅');setTimeout(onClose,1400);}
  };
  return(<><ModalWrapper title={`Editar — ${usuario.nome}`} onClose={onClose}>
    {erro&&<MsgErro msg={erro}/>}
    <Campo label="Nome completo *"><input type="text" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo>
    <Campo label="E-mail *"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inputClass}/></Campo>
    <Campo label="Nova senha (deixe em branco para manter)">
      <div className="relative">
        <input type={ver?'text':'password'} placeholder="Nova senha (opcional)" value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})} className={inputClass+' pr-10'}/>
        <button onClick={()=>setVer(!ver)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">{ver?<EyeOff size={16}/>:<Eye size={16}/>}</button>
      </div>
    </Campo>
    <Campo label="Nível de Acesso">
      <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className={inputClass}>
        <option value="colaborador">Colaborador — Orçamentos e Compras</option>
        <option value="admin">Administrador — Acesso total</option>
      </select>
    </Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Salvar Alterações"/>
  </ModalWrapper>
  <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── MODAL NOVA CONTA A RECEBER ───────────────────────────── */
function ModalNovaContaReceber({onClose}:{onClose:()=>void}) {
  const[form,setForm]=useState({cliente_nome:'',descricao:'',valor:'',data_vencimento:'',status:'Aguardando',conta_bancaria_id:''});
  const[contas,setContas]=useState<any[]>([]);
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  useEffect(()=>{supabase.from('contas_bancarias').select('id,nome,banco').eq('ativa',true).order('nome').then(({data})=>setContas(data||[]));},[]);
  const salvar=async()=>{
    if(!form.cliente_nome.trim()||!form.valor||Number(form.valor)<=0){setErro('Cliente e valor são obrigatórios.');return;}
    setSalvando(true);
    const cb=contas.find(c=>c.id===form.conta_bancaria_id);
    const{error}=await supabase.from('contas_receber').insert({
      cliente_nome:form.cliente_nome,descricao:form.descricao||null,
      valor:Number(form.valor),data_vencimento:form.data_vencimento||null,
      status:form.status,
      conta_bancaria_id:form.conta_bancaria_id||null,
      conta_bancaria_nome:cb?.nome||null,
    });
    if(error){setErro('Erro: '+error.message);setSalvando(false);}
    else{setToast('Conta criada! ✅');setTimeout(onClose,1400);}
  };
  return(<><ModalWrapper title="Nova Conta a Receber" onClose={onClose}>
    {erro&&<MsgErro msg={erro}/>}
    <Campo label="Cliente *"><input type="text" placeholder="Nome do cliente" value={form.cliente_nome} onChange={e=>setForm({...form,cliente_nome:e.target.value})} className={inputClass}/></Campo>
    <Campo label="Descrição"><input type="text" placeholder="Ex: Pagamento parcela 1" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} className={inputClass}/></Campo>
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Valor (R$) *"><input type="number" step="0.01" min="0.01" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className={inputClass}/></Campo>
      <Campo label="Vencimento"><input type="date" value={form.data_vencimento} onChange={e=>setForm({...form,data_vencimento:e.target.value})} className={inputClass}/></Campo>
    </div>
    <Campo label="Conta Bancária (onde será recebido)">
      <select value={form.conta_bancaria_id} onChange={e=>setForm({...form,conta_bancaria_id:e.target.value})} className={inputClass}>
        <option value="">— Sem conta vinculada —</option>
        {contas.map(c=><option key={c.id} value={c.id}>{c.nome}{c.banco?` — ${c.banco}`:''}</option>)}
      </select>
    </Campo>
    <Campo label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={inputClass}>{STATUS_CR.map(s=><option key={s} value={s}>{s}</option>)}</select></Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Criar Conta a Receber"/>
  </ModalWrapper>
  <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── MODAL NOVA CONTA A PAGAR ──────────────────────────────── */
function ModalNovaContaPagar({onClose}:{onClose:()=>void}) {
  const[form,setForm]=useState({fornecedor_nome:'',descricao:'',valor:'',data_vencimento:'',status:'Aguardando',conta_bancaria_id:''});
  const[contas,setContas]=useState<any[]>([]);
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  useEffect(()=>{supabase.from('contas_bancarias').select('id,nome,banco').eq('ativa',true).order('nome').then(({data})=>setContas(data||[]));},[]);
  const salvar=async()=>{
    if(!form.fornecedor_nome.trim()||!form.valor||Number(form.valor)<=0){setErro('Fornecedor e valor são obrigatórios.');return;}
    setSalvando(true);
    const cb=contas.find(c=>c.id===form.conta_bancaria_id);
    const{error}=await supabase.from('contas_pagar').insert({
      fornecedor_nome:form.fornecedor_nome,descricao:form.descricao||null,
      valor:Number(form.valor),data_vencimento:form.data_vencimento||null,
      status:form.status,
      conta_bancaria_id:form.conta_bancaria_id||null,
      conta_bancaria_nome:cb?.nome||null,
    });
    if(error){setErro('Erro: '+error.message);setSalvando(false);}
    else{setToast('Conta criada! ✅');setTimeout(onClose,1400);}
  };
  return(<><ModalWrapper title="Nova Conta a Pagar" onClose={onClose}>
    {erro&&<MsgErro msg={erro}/>}
    <Campo label="Fornecedor *"><input type="text" placeholder="Nome do fornecedor" value={form.fornecedor_nome} onChange={e=>setForm({...form,fornecedor_nome:e.target.value})} className={inputClass}/></Campo>
    <Campo label="Descrição"><input type="text" placeholder="Ex: Aluguel março" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} className={inputClass}/></Campo>
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Valor (R$) *"><input type="number" step="0.01" min="0.01" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className={inputClass}/></Campo>
      <Campo label="Vencimento"><input type="date" value={form.data_vencimento} onChange={e=>setForm({...form,data_vencimento:e.target.value})} className={inputClass}/></Campo>
    </div>
    <Campo label="Conta Bancária (de onde sairá o pagamento)">
      <select value={form.conta_bancaria_id} onChange={e=>setForm({...form,conta_bancaria_id:e.target.value})} className={inputClass}>
        <option value="">— Sem conta vinculada —</option>
        {contas.map(c=><option key={c.id} value={c.id}>{c.nome}{c.banco?` — ${c.banco}`:''}</option>)}
      </select>
    </Campo>
    <Campo label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={inputClass}>{STATUS_CP.map(s=><option key={s} value={s}>{s}</option>)}</select></Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Criar Conta a Pagar"/>
  </ModalWrapper>
  <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── CONTROLE BANCÁRIO ─────────────────────────────────────── */
// Hook interno para buscar contas bancárias
function useContasBancarias() {
  const[contas,setContas]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[erro,setErro]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);setErro(false);
    const{data,error}=await supabase.from('contas_bancarias').select('*').order('nome');
    if(error)setErro(true);else setContas(data||[]);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);
  return{contas,loading,erro,refetch:load};
}

function BancarioView({onNovaConta,onEditar,onTransferir}:{onNovaConta:()=>void;onEditar:(c:any)=>void;onTransferir:()=>void}) {
  const{contas,loading,erro,refetch}=useContasBancarias();
  const[extrato,setExtrato]=useState<any[]>([]);
  const[contaSelecionadaId,setContaSelecionadaId]=useState<string|null>(null);
  const[loadingExtrato,setLoadingExtrato]=useState(false);

  const saldoTotal=contas.filter(c=>c.ativa).reduce((a,c)=>a+Number(c.saldo_atual||0),0);

  const verExtrato=async(contaId:string)=>{
    setContaSelecionadaId(contaId);
    setLoadingExtrato(true);
    // Busca movimentos: entradas (CR recebidas) + saídas (CP pagas) + transferências
    const[{data:entradas},{data:saidas},{data:transf}]=await Promise.all([
      supabase.from('contas_receber').select('id,cliente_nome,descricao,valor,data_recebimento,status').eq('conta_bancaria_id',contaId).eq('status','Recebido').order('data_recebimento',{ascending:false}).limit(50),
      supabase.from('contas_pagar').select('id,fornecedor_nome,descricao,valor,data_pagamento,status').eq('conta_bancaria_id',contaId).eq('status','Pago').order('data_pagamento',{ascending:false}).limit(50),
      supabase.from('transferencias_bancarias').select('*').or(`conta_origem_id.eq.${contaId},conta_destino_id.eq.${contaId}`).order('created_at',{ascending:false}).limit(50),
    ]);
    const movs:any[]=[];
    (entradas||[]).forEach(e=>movs.push({tipo:'credito',descricao:e.descricao||`Recebimento: ${e.cliente_nome}`,valor:Number(e.valor),data:e.data_recebimento,origem:'Contas a Receber'}));
    (saidas||[]).forEach(s=>movs.push({tipo:'debito',descricao:s.descricao||`Pagamento: ${s.fornecedor_nome}`,valor:Number(s.valor),data:s.data_pagamento,origem:'Contas a Pagar'}));
    (transf||[]).forEach(t=>{
      if(t.conta_origem_id===contaId)movs.push({tipo:'debito',descricao:`Transferência → ${t.conta_destino_nome}`,valor:Number(t.valor),data:t.created_at,origem:'Transferência'});
      else movs.push({tipo:'credito',descricao:`Transferência ← ${t.conta_origem_nome}`,valor:Number(t.valor),data:t.created_at,origem:'Transferência'});
    });
    movs.sort((a,b)=>new Date(b.data||0).getTime()-new Date(a.data||0).getTime());
    setExtrato(movs);
    setLoadingExtrato(false);
  };

  const excluir=async(id:string)=>{
    if(!confirm('Excluir esta conta bancária? Esta ação não pode ser desfeita.'))return;
    await supabase.from('contas_bancarias').delete().eq('id',id);refetch();
  };

  const contaSelecionada=contas.find(c=>c.id===contaSelecionadaId);

  const TIPO_ICON:Record<string,React.ReactNode>={
    'Conta Corrente':<CreditCard size={16} className="text-indigo-500"/>,
    'Conta Poupança':<PiggyBank size={16} className="text-emerald-500"/>,
    'Conta Investimento':<TrendingUp size={16} className="text-amber-500"/>,
    'Carteira':<Wallet size={16} className="text-rose-500"/>,
    'Outro':<Landmark size={16} className="text-slate-400"/>,
  };

  if(loading)return<LoadingSpinner label="Carregando contas bancárias..."/>;
  return(
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-black">Controle Bancário</h2>
          <p className="text-slate-500 text-sm">Gerencie suas contas bancárias e visualize movimentações</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onTransferir} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            <ArrowLeftRight size={15}/>Transferir entre Contas
          </button>
          <button onClick={refetch} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 bg-white"><RefreshCw size={17}/></button>
          <button onClick={onNovaConta} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all"><Plus size={15} strokeWidth={3}/>Nova Conta</button>
        </div>
      </div>

      {erro&&<ErroTabela tabela="contas_bancarias"/>}

      {/* Card saldo total */}
      {!erro&&(
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white">
          <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-1">Saldo Total Consolidado</p>
          <p className="text-4xl font-black">R$ {saldoTotal.toFixed(2)}</p>
          <p className="text-white/60 text-sm mt-2">{contas.filter(c=>c.ativa).length} conta{contas.filter(c=>c.ativa).length!==1?'s':''} ativa{contas.filter(c=>c.ativa).length!==1?'s':''}</p>
        </div>
      )}

      {/* Grid de contas */}
      {!erro&&contas.length===0&&(
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center gap-4 text-slate-300">
          <Landmark size={48}/>
          <p className="font-black text-slate-400 text-lg uppercase">Nenhuma conta cadastrada</p>
          <button onClick={onNovaConta} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 mt-2"><Plus size={15} strokeWidth={3}/>Cadastrar Primeira Conta</button>
        </div>
      )}

      {!erro&&contas.length>0&&(
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.map(c=>(
            <div key={c.id} className={cn('bg-white rounded-2xl border p-5 space-y-3 transition-all',c.ativa?'border-slate-200 hover:border-indigo-300':'border-dashed border-slate-200 opacity-60',contaSelecionadaId===c.id&&'border-indigo-400 ring-2 ring-indigo-100')}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('p-2 rounded-xl',c.ativa?'bg-indigo-50':'bg-slate-100')}>
                    {TIPO_ICON[c.tipo]||<Landmark size={16} className="text-slate-400"/>}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm leading-tight">{c.nome}</p>
                    {c.banco&&<p className="text-xs text-slate-400 font-medium">{c.banco}</p>}
                  </div>
                </div>
                {!c.ativa&&<span className="text-[10px] font-black uppercase bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Inativa</span>}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Saldo Atual</p>
                <p className={cn('text-2xl font-black',Number(c.saldo_atual)>=0?'text-emerald-600':'text-rose-600')}>
                  R$ {Number(c.saldo_atual||0).toFixed(2)}
                </p>
              </div>
              {c.agencia&&<p className="text-xs text-slate-400">Ag: {c.agencia}{c.conta_numero?` • Cc: ${c.conta_numero}`:''}</p>}
              {c.observacoes&&<p className="text-xs text-slate-400 italic">{c.observacoes}</p>}
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button onClick={()=>verExtrato(c.id)} className={cn('flex-1 text-xs font-bold py-2 rounded-xl transition-all',contaSelecionadaId===c.id?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600')}>
                  {contaSelecionadaId===c.id?'📋 Extrato ativo':'Ver Extrato'}
                </button>
                <button onClick={()=>onEditar(c)} className="px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">Editar</button>
                <button onClick={()=>excluir(c.id)} className="px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extrato da conta selecionada */}
      {contaSelecionadaId&&(
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-black text-slate-800">Extrato — {contaSelecionada?.nome}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Últimas movimentações registradas (recebimentos, pagamentos e transferências)</p>
            </div>
            <button onClick={()=>{setContaSelecionadaId(null);setExtrato([]);}} className="text-xs font-bold text-slate-400 hover:text-rose-500 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-all">✕ Fechar</button>
          </div>
          {loadingExtrato?<div className="p-8"><LoadingSpinner label="Carregando extrato..."/></div>:(
            extrato.length===0
              ?<div className="p-12 text-center text-slate-400"><p className="font-black">Nenhuma movimentação encontrada</p><p className="text-sm mt-1">Vincule contas a receber e a pagar a esta conta bancária.</p></div>
              :<div className="overflow-x-auto">
                <table className="w-full text-left min-w-[560px]">
                  <thead><tr className="bg-slate-50 border-b border-slate-100">
                    {['Data','Tipo','Origem','Descrição','Valor'].map(h=><th key={h} className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {extrato.map((m,i)=>(
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-sm text-slate-500 whitespace-nowrap">{m.data?new Date(m.data).toLocaleDateString('pt-BR'):'—'}</td>
                        <td className="px-5 py-3">
                          <span className={cn('text-[10px] font-black uppercase px-2 py-1 rounded-full',m.tipo==='credito'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700')}>
                            {m.tipo==='credito'?'Entrada':'Saída'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400 font-medium">{m.origem}</td>
                        <td className="px-5 py-3 text-sm text-slate-700 max-w-[200px] truncate">{m.descricao}</td>
                        <td className={cn('px-5 py-3 font-black text-sm',m.tipo==='credito'?'text-emerald-600':'text-rose-600')}>
                          {m.tipo==='credito'?'+':'−'} R$ {m.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── MODAL NOVA CONTA BANCÁRIA ─────────────────────────────── */
function ModalNovaContaBancaria({onClose}:{onClose:()=>void}) {
  const[form,setForm]=useState({nome:'',banco:'',tipo:'Conta Corrente',agencia:'',conta_numero:'',saldo_inicial:'0',observacoes:'',ativa:true});
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  const salvar=async()=>{
    if(!form.nome.trim()){setErro('Nome da conta é obrigatório.');return;}
    setSalvando(true);
    const saldo=Number(form.saldo_inicial)||0;
    const{error}=await supabase.from('contas_bancarias').insert({
      nome:form.nome.trim(),banco:form.banco||null,tipo:form.tipo,
      agencia:form.agencia||null,conta_numero:form.conta_numero||null,
      saldo_inicial:saldo,saldo_atual:saldo,
      observacoes:form.observacoes||null,ativa:true,
    });
    if(error){setErro('Erro: '+error.message);setSalvando(false);}
    else{setToast('Conta bancária cadastrada! ✅');setTimeout(onClose,1400);}
  };
  return(<><ModalWrapper title="Nova Conta Bancária" onClose={onClose}>
    {erro&&<MsgErro msg={erro}/>}
    <Campo label="Nome da Conta *"><input type="text" placeholder="Ex: Banco do Brasil PJ, Caixa, Carteira..." value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass} autoFocus/></Campo>
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Banco / Instituição"><input type="text" placeholder="Ex: Banco do Brasil" value={form.banco} onChange={e=>setForm({...form,banco:e.target.value})} className={inputClass}/></Campo>
      <Campo label="Tipo de Conta">
        <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className={inputClass}>
          {['Conta Corrente','Conta Poupança','Conta Investimento','Carteira','Outro'].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </Campo>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Agência"><input type="text" placeholder="Ex: 1234-5" value={form.agencia} onChange={e=>setForm({...form,agencia:e.target.value})} className={inputClass}/></Campo>
      <Campo label="Número da Conta"><input type="text" placeholder="Ex: 12345-6" value={form.conta_numero} onChange={e=>setForm({...form,conta_numero:e.target.value})} className={inputClass}/></Campo>
    </div>
    <Campo label="Saldo Inicial (R$)">
      <input type="number" step="0.01" placeholder="0.00" value={form.saldo_inicial} onChange={e=>setForm({...form,saldo_inicial:e.target.value})} className={inputClass}/>
      <p className="text-[11px] text-slate-400 mt-1">Informe o saldo atual real da conta para começar com o valor correto.</p>
    </Campo>
    <Campo label="Observações"><input type="text" placeholder="Anotações opcionais..." value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} className={inputClass}/></Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Cadastrar Conta Bancária"/>
  </ModalWrapper><AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── MODAL EDITAR CONTA BANCÁRIA ───────────────────────────── */
function ModalEditarContaBancaria({conta,onClose}:{conta:any;onClose:()=>void}) {
  const[form,setForm]=useState({
    nome:conta.nome||'',banco:conta.banco||'',tipo:conta.tipo||'Conta Corrente',
    agencia:conta.agencia||'',conta_numero:conta.conta_numero||'',
    saldo_atual:String(conta.saldo_atual||0),
    observacoes:conta.observacoes||'',ativa:conta.ativa!==false,
  });
  const[salvando,setSalvando]=useState(false);const[toast,setToast]=useState('');
  const salvar=async()=>{
    setSalvando(true);
    await supabase.from('contas_bancarias').update({
      nome:form.nome,banco:form.banco||null,tipo:form.tipo,
      agencia:form.agencia||null,conta_numero:form.conta_numero||null,
      saldo_atual:Number(form.saldo_atual),
      observacoes:form.observacoes||null,ativa:form.ativa,
      updated_at:new Date().toISOString(),
    }).eq('id',conta.id);
    setSalvando(false);setToast('Conta atualizada! ✅');setTimeout(onClose,1400);
  };
  return(<><ModalWrapper title={`Editar — ${conta.nome}`} onClose={onClose}>
    <Campo label="Nome da Conta *"><input type="text" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo>
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Banco"><input type="text" value={form.banco} onChange={e=>setForm({...form,banco:e.target.value})} className={inputClass}/></Campo>
      <Campo label="Tipo">
        <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className={inputClass}>
          {['Conta Corrente','Conta Poupança','Conta Investimento','Carteira','Outro'].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </Campo>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Agência"><input type="text" value={form.agencia} onChange={e=>setForm({...form,agencia:e.target.value})} className={inputClass}/></Campo>
      <Campo label="Número da Conta"><input type="text" value={form.conta_numero} onChange={e=>setForm({...form,conta_numero:e.target.value})} className={inputClass}/></Campo>
    </div>
    <Campo label="Saldo Atual (R$)">
      <input type="number" step="0.01" value={form.saldo_atual} onChange={e=>setForm({...form,saldo_atual:e.target.value})} className={inputClass}/>
      <p className="text-[11px] text-slate-400 mt-1">Ajuste manualmente se necessário para corrigir o saldo.</p>
    </Campo>
    <Campo label="Observações"><input type="text" value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} className={inputClass}/></Campo>
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
      <input type="checkbox" id="ativa" checked={form.ativa} onChange={e=>setForm({...form,ativa:e.target.checked})} className="w-4 h-4 accent-indigo-600 cursor-pointer"/>
      <label htmlFor="ativa" className="text-sm font-bold text-slate-700 cursor-pointer">Conta ativa</label>
    </div>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Salvar Alterações"/>
  </ModalWrapper><AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── MODAL TRANSFERÊNCIA ENTRE CONTAS ──────────────────────── */
function ModalTransferenciaContas({onClose}:{onClose:()=>void}) {
  const[contas,setContas]=useState<any[]>([]);
  const[form,setForm]=useState({conta_origem_id:'',conta_destino_id:'',valor:'',descricao:'',data:new Date().toISOString().split('T')[0]});
  const[salvando,setSalvando]=useState(false);const[erro,setErro]=useState('');const[toast,setToast]=useState('');
  useEffect(()=>{supabase.from('contas_bancarias').select('id,nome,banco,saldo_atual').eq('ativa',true).order('nome').then(({data})=>setContas(data||[]));},[]);

  const salvar=async()=>{
    if(!form.conta_origem_id||!form.conta_destino_id){setErro('Selecione a conta de origem e destino.');return;}
    if(form.conta_origem_id===form.conta_destino_id){setErro('Origem e destino devem ser contas diferentes.');return;}
    const valor=Number(form.valor);
    if(!valor||valor<=0){setErro('Informe um valor válido.');return;}
    const origem=contas.find(c=>c.id===form.conta_origem_id);
    const destino=contas.find(c=>c.id===form.conta_destino_id);
    if(!origem||!destino){setErro('Conta não encontrada.');return;}
    if(Number(origem.saldo_atual)<valor){setErro(`Saldo insuficiente na conta "${origem.nome}". Saldo: R$ ${Number(origem.saldo_atual).toFixed(2)}`);return;}
    setSalvando(true);
    // Grava a transferência
    const{error}=await supabase.from('transferencias_bancarias').insert({
      conta_origem_id:form.conta_origem_id,conta_origem_nome:origem.nome,
      conta_destino_id:form.conta_destino_id,conta_destino_nome:destino.nome,
      valor,descricao:form.descricao||null,data:form.data,
    });
    if(error){setErro('Erro: '+error.message);setSalvando(false);return;}
    // Atualiza saldos
    await Promise.all([
      supabase.from('contas_bancarias').update({saldo_atual:Number(origem.saldo_atual)-valor,updated_at:new Date().toISOString()}).eq('id',origem.id),
      supabase.from('contas_bancarias').update({saldo_atual:Number(destino.saldo_atual)+valor,updated_at:new Date().toISOString()}).eq('id',destino.id),
    ]);
    setSalvando(false);setToast('Transferência realizada! ✅');setTimeout(onClose,1600);
  };

  const origem=contas.find(c=>c.id===form.conta_origem_id);
  const destino=contas.find(c=>c.id===form.conta_destino_id);

  return(<><ModalWrapper title="Transferência entre Contas" onClose={onClose}>
    {erro&&<MsgErro msg={erro}/>}
    <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
      <Campo label="Conta de Origem (débito)">
        <select value={form.conta_origem_id} onChange={e=>setForm({...form,conta_origem_id:e.target.value})} className={inputClass}>
          <option value="">— Selecione a conta de origem —</option>
          {contas.map(c=><option key={c.id} value={c.id}>{c.nome}{c.banco?` — ${c.banco}`:''} • Saldo: R$ {Number(c.saldo_atual||0).toFixed(2)}</option>)}
        </select>
      </Campo>
      {/* Seta visual */}
      <div className="flex items-center justify-center"><div className="flex items-center gap-2 text-slate-400"><div className="h-px w-16 bg-slate-200"/><ArrowLeftRight size={18} className="text-indigo-500 shrink-0"/><div className="h-px w-16 bg-slate-200"/></div></div>
      <Campo label="Conta de Destino (crédito)">
        <select value={form.conta_destino_id} onChange={e=>setForm({...form,conta_destino_id:e.target.value})} className={inputClass}>
          <option value="">— Selecione a conta de destino —</option>
          {contas.filter(c=>c.id!==form.conta_origem_id).map(c=><option key={c.id} value={c.id}>{c.nome}{c.banco?` — ${c.banco}`:''} • Saldo: R$ {Number(c.saldo_atual||0).toFixed(2)}</option>)}
        </select>
      </Campo>
    </div>
    {/* Preview */}
    {origem&&destino&&(
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between gap-2 text-sm">
        <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase">De</p><p className="font-black text-slate-700">{origem.nome}</p><p className="text-rose-600 font-bold text-xs">− R$ {Number(form.valor||0).toFixed(2)}</p></div>
        <ArrowLeftRight size={20} className="text-indigo-400 shrink-0"/>
        <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase">Para</p><p className="font-black text-slate-700">{destino.nome}</p><p className="text-emerald-600 font-bold text-xs">+ R$ {Number(form.valor||0).toFixed(2)}</p></div>
      </div>
    )}
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Valor (R$) *"><input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className={inputClass}/></Campo>
      <Campo label="Data"><input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} className={inputClass}/></Campo>
    </div>
    <Campo label="Descrição"><input type="text" placeholder="Ex: Transferência para reserva..." value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} className={inputClass}/></Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Confirmar Transferência"/>
  </ModalWrapper><AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── PAINEL DE LUCRATIVIDADE ───────────────────────────────── */
function LucratividadeView() {
  const hoje=new Date();
  const[de,setDe]=useState(hoje.toISOString().slice(0,7)+'-01');
  const[ate,setAte]=useState(hoje.toISOString().slice(0,10));
  const[dados,setDados]=useState<any>(null);
  const[loading,setLoading]=useState(false);

  const calcular=useCallback(async()=>{
    setLoading(true);
    // 1. Vendas finalizadas no período
    const{data:pedidosData}=await supabase
      .from('pedidos')
      .select('id,codigo,valor_total,custo_insumos_snapshot,created_at,updated_at,kanban_status(nome),clientes(nome),cliente_nome_avulso')
      .gte('updated_at',de+'T00:00:00')
      .lte('updated_at',ate+'T23:59:59');
    const vendas=(pedidosData||[]).filter((p:any)=>p.kanban_status?.nome==='Finalizado');
    const pedidosIds=vendas.map((p:any)=>p.id);

    // 2. Para cada venda, calcular o custo de insumos via BOM
    const custosPorPedido:Record<string,number>={};
    let detalhesCustoGlobal:any[]=[];

    if(pedidosIds.length>0){
      const{data:itens}=await supabase
        .from('itens_pedido')
        .select('produto_id,quantidade,pedido_id')
        .in('pedido_id',pedidosIds);

      if(itens&&itens.length>0){
        const prodIds=[...new Set(itens.map((i:any)=>i.produto_id).filter(Boolean))];
        const{data:composicoes}=await supabase
          .from('composicao_produtos')
          .select('produto_id,quantidade_insumo,percentual_desperdicio,insumos(nome,custo_unitario,unidade_medida)')
          .in('produto_id',prodIds);

        // Custo por pedido
        (itens||[]).forEach((item:any)=>{
          if(!item.produto_id)return;
          const comps=(composicoes||[]).filter((c:any)=>c.produto_id===item.produto_id);
          comps.forEach((comp:any)=>{
            const custo=Number(comp.insumos?.custo_unitario||0)*Number(comp.quantidade_insumo||0)*(1+Number(comp.percentual_desperdicio||0)/100)*Number(item.quantidade||1);
            custosPorPedido[item.pedido_id]=(custosPorPedido[item.pedido_id]||0)+custo;
            if(custo>0)detalhesCustoGlobal.push({nome:comp.insumos?.nome||'—',custo});
          });
        });
      }
    }

    // 3. Montar lista de vendas com receita e custo
    // Se custo_insumos_snapshot não é null → usa o valor histórico gravado no momento da venda
    // Se é null → venda antiga sem snapshot, recalcula pelo BOM atual (transitório)
    const vendasDetalhadas=vendas.map((p:any)=>{
      const temSnapshot=p.custo_insumos_snapshot!==null&&p.custo_insumos_snapshot!==undefined;
      const custoFinal=temSnapshot?Number(p.custo_insumos_snapshot):(custosPorPedido[p.id]||0);
      return{
        ...p,
        receita:Number(p.valor_total),
        custo:custoFinal,
        usandoSnapshot:temSnapshot,
        lucro:(Number(p.valor_total))-custoFinal,
        margem:Number(p.valor_total)>0?((Number(p.valor_total)-custoFinal)/Number(p.valor_total))*100:0,
      };
    });

    // 4. Totais
    const receitaVendas=vendasDetalhadas.reduce((a:number,p:any)=>a+p.receita,0);
    const custoInsumos=vendasDetalhadas.reduce((a:number,p:any)=>a+p.custo,0);
    const lucroBruto=receitaVendas-custoInsumos;
    const margemBruta=receitaVendas>0?(lucroBruto/receitaVendas)*100:0;

    // 5. Consolidar custo por insumo
    const insMap:Record<string,number>={};
    detalhesCustoGlobal.forEach((d:any)=>{insMap[d.nome]=(insMap[d.nome]||0)+d.custo;});
    const detalhesCusto=Object.entries(insMap).map(([nome,custo])=>({nome,custo}));

    // 6. Top clientes
    const clienteMap:Record<string,number>={};
    vendasDetalhadas.forEach((p:any)=>{const n=p.clientes?.nome||p.cliente_nome_avulso||'Avulso';clienteMap[n]=(clienteMap[n]||0)+p.receita;});
    const topClientes=Object.entries(clienteMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

    setDados({receitaVendas,custoInsumos,lucroBruto,margemBruta,nVendas:vendas.length,detalhesCusto,topClientes,vendasDetalhadas});
    setLoading(false);
  },[de,ate]);

  useEffect(()=>{calcular();},[calcular]);

  return(
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div><h2 className="text-2xl md:text-3xl font-black">Lucratividade</h2><p className="text-slate-500 text-sm">Receita de vendas vs custo de insumos (BOM) por período</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-slate-400 uppercase">De</span>
            <input type="date" value={de} onChange={e=>setDe(e.target.value)} className="text-sm outline-none bg-transparent"/>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Até</span>
            <input type="date" value={ate} onChange={e=>setAte(e.target.value)} className="text-sm outline-none bg-transparent"/>
          </div>
          {dados&&dados.vendasDetalhadas.length>0&&<button onClick={()=>{
            const wsData=[
              ['Código','Cliente','Data','Receita','Custo Insumos','Lucro','Margem%'],
              ...dados.vendasDetalhadas.map((p:any)=>[`#${p.codigo}`,p.clientes?.nome||p.cliente_nome_avulso||'—',new Date(p.updated_at||p.created_at).toLocaleDateString('pt-BR'),p.receita,p.custo,p.lucro,p.margem.toFixed(1)])
            ];
            const ws=XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols']=[{wch:10},{wch:28},{wch:12},{wch:12},{wch:14},{wch:12},{wch:10}];
            const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Lucratividade');
            XLSX.writeFile(wb,'lucratividade.xlsx');
          }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-all">
            <Download size={14}/>Exportar XLS
          </button>}
          <button onClick={calcular} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all">
            <RefreshCw size={14}/>Calcular
          </button>
        </div>
      </div>

      {loading?<LoadingSpinner label="Calculando lucratividade..."/>:!dados?null:(
        <>
        {/* Banner principal */}
        <div className={cn('rounded-3xl p-6',dados.lucroBruto>=0?'bg-emerald-600':'bg-rose-600')}>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <p className="text-white/80 font-black text-sm uppercase tracking-widest mb-1">Lucro Bruto do Período</p>
              <p className="text-5xl font-black text-white">{dados.lucroBruto<0?'-':''}R$ {Math.abs(dados.lucroBruto).toFixed(2)}</p>
              <p className="text-white/70 text-sm mt-2">{dados.lucroBruto>=0?'▲ Resultado positivo':'▼ Resultado negativo'}</p>
            </div>
            <div className="bg-white/20 rounded-2xl px-5 py-4 text-white text-center">
              <p className="text-xs font-black uppercase tracking-wider opacity-80 mb-1">Margem Bruta</p>
              <p className="text-3xl font-black">{dados.margemBruta.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Receita de Vendas</p>
            <p className="text-2xl font-black text-emerald-600">R$ {dados.receitaVendas.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">{dados.nVendas} venda(s)</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Custo de Insumos</p>
            <p className="text-2xl font-black text-rose-600">R$ {dados.custoInsumos.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Via BOM dos produtos</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Ticket Médio</p>
            <p className="text-2xl font-black text-indigo-600">R$ {dados.nVendas>0?(dados.receitaVendas/dados.nVendas).toFixed(2):'0.00'}</p>
            <p className="text-xs text-slate-400 mt-1">Por pedido</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Lucro Médio/Venda</p>
            <p className={cn('text-2xl font-black',dados.nVendas>0&&dados.lucroBruto/dados.nVendas>=0?'text-emerald-600':'text-rose-600')}>R$ {dados.nVendas>0?(dados.lucroBruto/dados.nVendas).toFixed(2):'0.00'}</p>
            <p className="text-xs text-slate-400 mt-1">Receita − Insumos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Custo por insumo */}
          {dados.detalhesCusto.length>0&&(
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Package size={18} className="text-rose-500"/>Custo por Insumo</h3>
              <div className="space-y-3">
                {dados.detalhesCusto.sort((a:any,b:any)=>b.custo-a.custo).slice(0,8).map((d:any,i:number)=>{
                  const pct=dados.custoInsumos>0?d.custo/dados.custoInsumos*100:0;
                  return(
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[180px]">{d.nome}</span>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-xs text-slate-400">{pct.toFixed(1)}%</span>
                          <span className="text-sm font-black text-rose-600">R$ {d.custo.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full transition-all" style={{width:`${pct}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Top clientes */}
          {dados.topClientes.length>0&&(
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Users size={18} className="text-indigo-500"/>Top Clientes</h3>
              <div className="space-y-3">
                {dados.topClientes.map(([nome,val]:any,i:number)=>{
                  const pct=dados.receitaVendas>0?val/dados.receitaVendas*100:0;
                  return(
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[180px]">{nome}</span>
                        <span className="text-sm font-black text-emerald-600 ml-2">R$ {Number(val).toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full transition-all" style={{width:`${pct}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tabela por venda: receita vs custo de insumo */}
        {dados.vendasDetalhadas.length>0&&(
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800">Receita vs Custo por Venda</h3>
              <span className="text-xs text-slate-400 font-bold">{dados.vendasDetalhadas.length} vendas no período</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {['Código','Cliente','Data','Receita (Venda)','Custo Insumos','Lucro Bruto','Margem'].map(h=><th key={h} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {dados.vendasDetalhadas.map((p:any)=>(
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-black text-indigo-600 text-sm">#{p.codigo}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 text-sm max-w-[140px] truncate">{p.clientes?.nome||p.cliente_nome_avulso||'—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{new Date(p.updated_at||p.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 font-black text-emerald-600 text-sm">R$ {p.receita.toFixed(2)}</td>
                      <td className="px-4 py-3 font-black text-rose-500 text-sm">
                        {p.custo>0?(
                          <span title={p.usandoSnapshot?'Valor fixo gravado no momento da venda (não muda com atualizações de preço)':'Calculado via BOM atual'}>
                            R$ {p.custo.toFixed(2)}
                            {p.usandoSnapshot&&<span className="ml-1 text-[9px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full align-middle">🔒 fixo</span>}
                          </span>
                        ):<span className="text-slate-300 text-xs font-normal">Sem BOM</span>}
                      </td>
                      <td className={cn('px-4 py-3 font-black text-sm',p.lucro>=0?'text-emerald-700':'text-rose-600')}>
                        {p.lucro>=0?'+':''}R$ {p.lucro.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-black px-2 py-1 rounded-full',p.margem>=50?'bg-emerald-100 text-emerald-700':p.margem>=20?'bg-amber-100 text-amber-700':'bg-rose-100 text-rose-700')}>
                          {p.margem.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={3} className="px-4 py-3 text-right font-black text-slate-500 text-sm uppercase">Totais</td>
                    <td className="px-4 py-3 font-black text-emerald-600">R$ {dados.receitaVendas.toFixed(2)}</td>
                    <td className="px-4 py-3 font-black text-rose-500">R$ {dados.custoInsumos.toFixed(2)}</td>
                    <td className={cn('px-4 py-3 font-black',dados.lucroBruto>=0?'text-emerald-700':'text-rose-600')}>
                      {dados.lucroBruto>=0?'+':''}R$ {dados.lucroBruto.toFixed(2)}
                    </td>
                    <td className="px-4 py-3"><span className={cn('text-xs font-black px-2 py-1 rounded-full',dados.margemBruta>=50?'bg-emerald-100 text-emerald-700':dados.margemBruta>=20?'bg-amber-100 text-amber-700':'bg-rose-100 text-rose-700')}>{dados.margemBruta.toFixed(1)}%</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {dados.vendasDetalhadas.length===0&&(
          <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center gap-4 text-slate-300">
            <TrendingUp size={48}/><p className="font-black text-slate-400 text-lg uppercase tracking-widest">Nenhuma venda no período</p>
            <p className="text-slate-400 text-sm">Ajuste o período ou finalize orçamentos no CRM.</p>
          </div>
        )}
        </>
      )}
    </div>
  );
}

/* ── MODAL EDITAR CLIENTE ──────────────────────────────────── */
function ModalEditarCliente({cliente,onClose}:{cliente:any;onClose:()=>void}) {
  const[form,setForm]=useState({nome:cliente.nome||'',cpf_cnpj:cliente.cpf_cnpj||'',email:cliente.email||'',telefone:cliente.telefone||'',whatsapp:cliente.whatsapp||'',cidade:cliente.cidade||'',estado:cliente.estado||'',observacoes:cliente.observacoes||''});
  const[salvando,setSalvando]=useState(false);const[toast,setToast]=useState('');
  const salvar=async()=>{setSalvando(true);await supabase.from('clientes').update(form).eq('id',cliente.id);setSalvando(false);setToast('Cliente atualizado! ✅');setTimeout(onClose,1400);};
  return(<><ModalWrapper title={`Editar — ${cliente.nome}`} onClose={onClose}>
    <Campo label="Nome *"><input type="text" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo>
    <div className="grid grid-cols-2 gap-4"><Campo label="CPF/CNPJ"><input type="text" value={form.cpf_cnpj} onChange={e=>setForm({...form,cpf_cnpj:e.target.value})} className={inputClass}/></Campo><Campo label="WhatsApp"><input type="text" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} className={inputClass}/></Campo></div>
    <div className="grid grid-cols-2 gap-4"><Campo label="E-mail"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inputClass}/></Campo><Campo label="Telefone"><input type="text" value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} className={inputClass}/></Campo></div>
    <div className="grid grid-cols-2 gap-4"><Campo label="Cidade"><input type="text" value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})} className={inputClass}/></Campo><Campo label="Estado"><input type="text" maxLength={2} value={form.estado} onChange={e=>setForm({...form,estado:e.target.value.toUpperCase()})} className={inputClass}/></Campo></div>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Salvar Alterações"/>
  </ModalWrapper><AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── MODAL PERFIL CLIENTE ──────────────────────────────────── */
function ModalPerfilCliente({cliente,onClose,onEditar}:{cliente:any;onClose:()=>void;onEditar:(c:any)=>void}) {
  const[pedidos,setPedidos]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{supabase.from('pedidos').select('*,kanban_status(nome)').eq('cliente_id',cliente.id).order('created_at',{ascending:false}).then(({data})=>{setPedidos(data||[]);setLoading(false);});},[cliente.id]);
  const total=pedidos.reduce((a,p)=>a+Number(p.valor_total),0);
  return(
    <ModalWrapper title={`Perfil — ${cliente.nome}`} onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4">
        <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">WhatsApp</p>{cliente.whatsapp?<a href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm hover:underline"><MessageSquare size={13}/>{cliente.whatsapp}</a>:<p className="text-sm text-slate-500">—</p>}</div>
        <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">E-mail</p><p className="font-bold text-slate-800 text-sm">{cliente.email||'—'}</p></div>
        <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">CPF/CNPJ</p><p className="font-bold text-slate-800 text-sm">{cliente.cpf_cnpj||'—'}</p></div>
        <div><p className="text-xs text-slate-400 font-bold uppercase mb-1">Cidade</p><p className="font-bold text-slate-800 text-sm">{cliente.cidade?`${cliente.cidade}/${cliente.estado||''}`:'—'}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-indigo-50 rounded-2xl p-4"><p className="text-xs text-slate-400 font-bold uppercase mb-1">Pedidos</p><p className="text-xl font-black text-indigo-600">{pedidos.length}</p></div>
        <div className="bg-emerald-50 rounded-2xl p-4"><p className="text-xs text-slate-400 font-bold uppercase mb-1">Total Gasto</p><p className="text-xl font-black text-emerald-600">R$ {total.toFixed(2)}</p></div>
        <div className="bg-amber-50 rounded-2xl p-4"><p className="text-xs text-slate-400 font-bold uppercase mb-1">Ticket Médio</p><p className="text-xl font-black text-amber-600">R$ {pedidos.length>0?(total/pedidos.length).toFixed(2):'0.00'}</p></div>
      </div>
      {loading?<LoadingSpinner label="Carregando..."/>:(
        pedidos.length>0&&<div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm"><thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase">Código</th><th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase">Status</th><th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase">Valor</th><th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase">Data</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{pedidos.map(p=><tr key={p.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold text-indigo-600">#{p.codigo}</td><td className="px-4 py-3"><span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{p.kanban_status?.nome||'—'}</span></td><td className="px-4 py-3 text-right font-black text-slate-700">R$ {Number(p.valor_total).toFixed(2)}</td><td className="px-4 py-3 text-right text-slate-400">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table>
        </div>
      )}
      <button onClick={()=>{onClose();setTimeout(()=>onEditar(cliente),100);}} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all">✏️ Editar Dados do Cliente</button>
    </ModalWrapper>
  );
}

/* ── MODAL NOVO INSUMO ─────────────────────────────────────── */
function ModalNovoInsumo({onClose}:{onClose:()=>void}) {
  const[form,setForm]=useState({
    nome:'',tipo:'papel',unidade_medida:'folha',
    custo_unitario:'0',estoque_atual:'0',estoque_minimo:'0',
    gramatura:'',observacoes:''
  });
  const[salvando,setSalvando]=useState(false);
  const[erro,setErro]=useState('');
  const[toast,setToast]=useState('');

  const salvar=async()=>{
    if(!form.nome.trim()){setErro('Nome do insumo é obrigatório.');return;}
    setSalvando(true);
    const{error}=await supabase.from('insumos').insert({
      nome:form.nome.trim(),
      tipo:form.tipo,
      unidade_medida:form.unidade_medida,
      custo_unitario:Number(form.custo_unitario)||0,
      estoque_atual:Number(form.estoque_atual)||0,
      estoque_minimo:Number(form.estoque_minimo)||0,
      gramatura:form.gramatura?Number(form.gramatura):null,
      observacoes:form.observacoes||null,
      ativo:true,
    });
    if(error){setErro('Erro ao salvar: '+error.message);setSalvando(false);}
    else{setToast('Insumo cadastrado! ✅');setTimeout(onClose,1400);}
  };

  return(
    <><ModalWrapper title="Novo Insumo" onClose={onClose}>
      {erro&&<MsgErro msg={erro}/>}
      <Campo label="Nome *">
        <input type="text" placeholder="Ex: Papel Offset 90g" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass} autoFocus/>
      </Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Tipo">
          <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className={inputClass}>
            {['papel','tinta','fita','cola','vinil','embalagem','outro'].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </Campo>
        <Campo label="Unidade de Medida">
          <select value={form.unidade_medida} onChange={e=>setForm({...form,unidade_medida:e.target.value})} className={inputClass}>
            {['folha','ml','metro','unidade','kg','litro'].map(u=><option key={u} value={u}>{u}</option>)}
          </select>
        </Campo>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Campo label="Custo Unit. (R$)">
          <input type="number" step="0.0001" min="0" placeholder="0.0000" value={form.custo_unitario} onChange={e=>setForm({...form,custo_unitario:e.target.value})} className={inputClass}/>
        </Campo>
        <Campo label="Estoque Atual">
          <input type="number" step="0.01" min="0" placeholder="0" value={form.estoque_atual} onChange={e=>setForm({...form,estoque_atual:e.target.value})} className={inputClass}/>
        </Campo>
        <Campo label="Estoque Mínimo">
          <input type="number" step="0.01" min="0" placeholder="0" value={form.estoque_minimo} onChange={e=>setForm({...form,estoque_minimo:e.target.value})} className={inputClass}/>
        </Campo>
      </div>
      <Campo label="Gramatura g/m² (apenas para papéis)">
        <input type="number" step="0.1" min="0" placeholder="Ex: 90" value={form.gramatura} onChange={e=>setForm({...form,gramatura:e.target.value})} className={inputClass}/>
      </Campo>
      <Campo label="Observações">
        <input type="text" placeholder="Observações opcionais..." value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} className={inputClass}/>
      </Campo>
      <BotaoSalvar onClick={salvar} loading={salvando} label="Cadastrar Insumo"/>
    </ModalWrapper>
    <AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence>
    </>
  );
}

/* ── MODAL EDITAR INSUMO ───────────────────────────────────── */
function ModalEditarInsumo({insumo,onClose}:{insumo:any;onClose:()=>void}) {
  const[form,setForm]=useState({nome:insumo.nome||'',tipo:insumo.tipo||'papel',unidade_medida:insumo.unidade_medida||'unidade',custo_unitario:String(insumo.custo_unitario||0),estoque_atual:String(insumo.estoque_atual||0),estoque_minimo:String(insumo.estoque_minimo||0),gramatura:String(insumo.gramatura||''),observacoes:insumo.observacoes||''});
  const[salvando,setSalvando]=useState(false);const[toast,setToast]=useState('');
  const salvar=async()=>{setSalvando(true);await supabase.from('insumos').update({nome:form.nome,tipo:form.tipo,unidade_medida:form.unidade_medida,custo_unitario:Number(form.custo_unitario),estoque_atual:Number(form.estoque_atual),estoque_minimo:Number(form.estoque_minimo),gramatura:form.gramatura?Number(form.gramatura):null,observacoes:form.observacoes||null,updated_at:new Date().toISOString()}).eq('id',insumo.id);setSalvando(false);setToast('Insumo atualizado! ✅');setTimeout(onClose,1400);};
  return(<><ModalWrapper title={`Editar Insumo — ${insumo.nome}`} onClose={onClose}>
    <Campo label="Nome *"><input type="text" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo>
    <div className="grid grid-cols-2 gap-4"><Campo label="Tipo"><select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className={inputClass}>{['papel','tinta','fita','cola','vinil','embalagem','outro'].map(t=><option key={t} value={t}>{t}</option>)}</select></Campo><Campo label="Unidade"><select value={form.unidade_medida} onChange={e=>setForm({...form,unidade_medida:e.target.value})} className={inputClass}>{['folha','ml','metro','unidade','kg','litro'].map(u=><option key={u} value={u}>{u}</option>)}</select></Campo></div>
    <div className="grid grid-cols-3 gap-3"><Campo label="Custo Unit. (R$)"><input type="number" step="0.0001" min="0" value={form.custo_unitario} onChange={e=>setForm({...form,custo_unitario:e.target.value})} className={inputClass}/></Campo><Campo label="Estoque Atual"><input type="number" step="0.01" min="0" value={form.estoque_atual} onChange={e=>setForm({...form,estoque_atual:e.target.value})} className={inputClass}/></Campo><Campo label="Estoque Mínimo"><input type="number" step="0.01" min="0" value={form.estoque_minimo} onChange={e=>setForm({...form,estoque_minimo:e.target.value})} className={inputClass}/></Campo></div>
    <Campo label="Gramatura g/m² (papéis)"><input type="number" step="0.1" value={form.gramatura} onChange={e=>setForm({...form,gramatura:e.target.value})} className={inputClass}/></Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Salvar Alterações"/>
  </ModalWrapper><AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── MODAL EDITAR PRODUTO + COMPOSIÇÃO (BOM) ───────────────── */
function ModalEditarProduto({produto,onClose}:{produto:any;onClose:()=>void}) {
  const[form,setForm]=useState({nome:produto.nome||'',descricao:produto.descricao||'',categoria:produto.categoria||'kit',markup_sugerido:String(produto.markup_sugerido||2.5),custo_mao_obra_hora:String(produto.custo_mao_obra_hora||25)});
  const[bom,setBom]=useState<any[]>([]);
  const[insumosList,setInsumosList]=useState<any[]>([]);
  const[buscaIns,setBuscaIns]=useState('');const[showIns,setShowIns]=useState(false);const insRef=useRef<HTMLDivElement>(null);
  const[salvando,setSalvando]=useState(false);const[toast,setToast]=useState('');
  useEffect(()=>{
    supabase.from('composicao_produtos').select('*,insumos(nome,unidade_medida,custo_unitario)').eq('produto_id',produto.id).then(({data})=>setBom(data||[]));
    supabase.from('insumos').select('*').eq('ativo',true).order('nome').then(({data})=>setInsumosList(data||[]));
  },[produto.id]);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(insRef.current&&!insRef.current.contains(e.target as Node))setShowIns(false);};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);
  const insFilt=insumosList.filter(i=>i.nome.toLowerCase().includes(buscaIns.toLowerCase())&&buscaIns.length>0).slice(0,6);
  const addBomItem=(ins:any)=>{setBom(prev=>[...prev,{id:'new-'+crypto.randomUUID(),produto_id:produto.id,insumo_id:ins.id,maquina_id:null,quantidade_insumo:1,percentual_desperdicio:5,insumos:{nome:ins.nome,unidade_medida:ins.unidade_medida,custo_unitario:ins.custo_unitario},_novo:true}]);setBuscaIns('');setShowIns(false);};
  const updBom=(id:string,k:string,v:any)=>setBom(prev=>prev.map(b=>b.id===id?{...b,[k]:v,_dirty:true}:b));
  const delBom=async(item:any)=>{if(!item._novo)await supabase.from('composicao_produtos').delete().eq('id',item.id);setBom(prev=>prev.filter(b=>b.id!==item.id));};
  const custoTotal=bom.reduce((a,b)=>{const ins=insumosList.find(i=>i.id===b.insumo_id)||b.insumos;return a+(Number(ins?.custo_unitario||0)*Number(b.quantidade_insumo||0)*(1+Number(b.percentual_desperdicio||0)/100));},0);
  const salvar=async()=>{
    setSalvando(true);
    await supabase.from('produtos').update({nome:form.nome,descricao:form.descricao||null,categoria:form.categoria,markup_sugerido:Number(form.markup_sugerido),custo_mao_obra_hora:Number(form.custo_mao_obra_hora),updated_at:new Date().toISOString()}).eq('id',produto.id);
    const novos=bom.filter(b=>b._novo);
    if(novos.length>0)await supabase.from('composicao_produtos').insert(novos.map(({id,_novo,_dirty,insumos:ins,...rest})=>rest));
    const editados=bom.filter(b=>b._dirty&&!b._novo);
    for(const b of editados){const{_dirty,insumos:ins,...rest}=b;await supabase.from('composicao_produtos').update({quantidade_insumo:rest.quantidade_insumo,percentual_desperdicio:rest.percentual_desperdicio}).eq('id',rest.id);}
    setSalvando(false);setToast('Produto salvo! ✅');setTimeout(onClose,1400);
  };
  return(<><ModalWrapper title={`Editar Produto — ${produto.nome}`} onClose={onClose} size="lg">
    <Campo label="Nome *"><input type="text" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo>
    <Campo label="Descrição"><input type="text" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} className={inputClass}/></Campo>
    <div className="grid grid-cols-3 gap-3"><Campo label="Categoria"><select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} className={inputClass}>{['kit','adesivo','impresso','personalizado'].map(c=><option key={c} value={c}>{c}</option>)}</select></Campo><Campo label="Markup (×)"><input type="number" step="0.1" min="1" value={form.markup_sugerido} onChange={e=>setForm({...form,markup_sugerido:e.target.value})} className={inputClass}/></Campo><Campo label="MO/hora (R$)"><input type="number" step="0.5" min="0" value={form.custo_mao_obra_hora} onChange={e=>setForm({...form,custo_mao_obra_hora:e.target.value})} className={inputClass}/></Campo></div>
    <div className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-xs font-black text-slate-500 uppercase tracking-wider">Composição de Insumos (BOM)</p>{custoTotal>0&&<span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Custo: R$ {custoTotal.toFixed(4)} → Venda: R$ {(custoTotal*Number(form.markup_sugerido)).toFixed(2)}</span>}</div>
      <div className="relative" ref={insRef}>
        <input type="text" placeholder="Adicionar insumo..." className={inputClass} value={buscaIns} onChange={e=>{setBuscaIns(e.target.value);setShowIns(true);}} onFocus={()=>setShowIns(true)}/>
        {showIns&&buscaIns.length>0&&<div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">{insFilt.length>0?insFilt.map(i=><button key={i.id} onClick={()=>addBomItem(i)} className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex justify-between"><div><p className="font-bold text-sm">{i.nome}</p><p className="text-xs text-slate-400">{i.tipo} • R$ {Number(i.custo_unitario).toFixed(4)}/{i.unidade_medida}</p></div><Plus size={14} className="text-indigo-400"/></button>):<div className="p-4 text-sm text-slate-400">Não encontrado.</div>}</div>}
      </div>
      {bom.length>0?(
        <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-3 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase">Insumo</th><th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400 uppercase w-24">Quantidade</th><th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400 uppercase w-24">Desperdício %</th><th className="px-3 py-2.5 text-right text-[10px] font-black text-slate-400 uppercase w-28">Custo</th><th className="w-8"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {bom.map(b=>{const ins=insumosList.find(i=>i.id===b.insumo_id)||b.insumos;const custo=(Number(ins?.custo_unitario||0)*Number(b.quantidade_insumo||0)*(1+Number(b.percentual_desperdicio||0)/100));return(
                <tr key={b.id}>
                  <td className="px-3 py-2 font-bold text-sm">{b.insumos?.nome||ins?.nome||'—'}<span className="text-xs text-slate-400 font-normal ml-1">/{b.insumos?.unidade_medida||ins?.unidade_medida}</span></td>
                  <td className="px-3 py-2"><input type="number" min="0" step="0.001" value={b.quantidade_insumo} onChange={e=>updBom(b.id,'quantidade_insumo',Number(e.target.value))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none"/></td>
                  <td className="px-3 py-2"><input type="number" min="0" max="100" step="0.5" value={b.percentual_desperdicio} onChange={e=>updBom(b.id,'percentual_desperdicio',Number(e.target.value))} className="w-full text-center text-sm font-bold bg-transparent border-b border-transparent focus:border-indigo-400 outline-none"/></td>
                  <td className="px-3 py-2 text-right font-black text-indigo-600 text-sm">R$ {custo.toFixed(4)}</td>
                  <td className="px-3 py-2"><button onClick={()=>delBom(b)} className="text-slate-300 hover:text-rose-500"><Trash2 size={13}/></button></td>
                </tr>
              );})}
            </tbody>
            <tfoot><tr className="bg-indigo-50 border-t-2 border-indigo-100"><td colSpan={3} className="px-3 py-3 text-right font-black text-slate-600 text-sm uppercase">Custo Total:</td><td className="px-3 py-3 text-right font-black text-indigo-700">R$ {custoTotal.toFixed(4)}</td><td></td></tr></tfoot>
          </table>
        </div>
      ):<div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center text-slate-400 text-sm">Busque insumos acima para montar a composição</div>}
    </div>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Salvar Produto e Composição"/>
  </ModalWrapper><AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
}

/* ── MODAL EDITAR FORNECEDOR ──────────────────────────────── */
function ModalEditarFornecedor({fornecedor,onClose}:{fornecedor:any;onClose:()=>void}) {
  const[form,setForm]=useState({nome:fornecedor.nome||'',cnpj:fornecedor.cnpj||'',contato:fornecedor.contato||'',telefone:fornecedor.telefone||'',whatsapp:fornecedor.whatsapp||'',email:fornecedor.email||'',cidade:fornecedor.cidade||'',observacoes:fornecedor.observacoes||''});
  const[salvando,setSalvando]=useState(false);const[toast,setToast]=useState('');
  const salvar=async()=>{setSalvando(true);await supabase.from('fornecedores').update(form).eq('id',fornecedor.id);setSalvando(false);setToast('Fornecedor atualizado! ✅');setTimeout(onClose,1400);};
  return(<><ModalWrapper title={`Editar — ${fornecedor.nome}`} onClose={onClose}>
    <Campo label="Nome *"><input type="text" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inputClass}/></Campo>
    <div className="grid grid-cols-2 gap-4"><Campo label="CNPJ"><input type="text" value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})} className={inputClass}/></Campo><Campo label="Contato"><input type="text" value={form.contato} onChange={e=>setForm({...form,contato:e.target.value})} className={inputClass}/></Campo></div>
    <div className="grid grid-cols-2 gap-4"><Campo label="WhatsApp"><input type="text" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} className={inputClass}/></Campo><Campo label="E-mail"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inputClass}/></Campo></div>
    <Campo label="Cidade"><input type="text" value={form.cidade} onChange={e=>setForm({...form,cidade:e.target.value})} className={inputClass}/></Campo>
    <BotaoSalvar onClick={salvar} loading={salvando} label="Salvar Alterações"/>
  </ModalWrapper><AnimatePresence>{toast&&<Toast message={toast} onClose={()=>setToast('')}/>}</AnimatePresence></>);
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
