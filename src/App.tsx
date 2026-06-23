import React, { useState, useEffect } from 'react';
import { CustomerData, PredictionResult } from './types';
import { predictChurn } from './services/mlModelService';
import { DashboardGrid } from './components/KPICards';
import { ExecutiveCharts } from './components/ExecutiveCharts';
import { SimulatorForm } from './components/SimulatorForm';
import { PredictionDisplay } from './components/PredictionDisplay';
import { EDAView } from './components/EDAView';
import { ModelSpecsView } from './components/ModelSpecsView';
import { BulkUploadForm } from './components/BulkUploadForm';
import { ObservabilityDashboard } from './components/ObservabilityDashboard';
import { SectionHeader } from './components/ui/SectionHeader';
import {
  Building2, LayoutDashboard, LineChart, BrainCircuit, ChevronRight,
  ShieldCheck, Search, Layers, Activity, Menu, X, Info,
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export type Tab = 'dashboard' | 'eda' | 'simulator' | 'batch' | 'model' | 'observability';

export interface GlobalFilters {
  gender: 'All' | 'Male' | 'Female';
  plan: 'All' | '1' | '6' | '12';
  location: 'All' | 'Near' | 'Away';
}

// Metadados das seções: dirigem nav, cabeçalhos (SectionHeader) e a dica contextual.
const NAV: { id: Tab; label: string; icon: React.ElementType; purpose: string }[] = [
  { id: 'dashboard', label: 'Dashboard Executivo', icon: LayoutDashboard, purpose: 'Visão geral da base: churn, clientes ativos e receita — filtre por perfil.' },
  { id: 'eda', label: 'Padrões da Base (EDA)', icon: LineChart, purpose: 'Explore o que mais separa quem fica de quem sai: idade, plano, frequência.' },
  { id: 'simulator', label: 'Simulador Preditivo', icon: BrainCircuit, purpose: 'Teste o risco de um aluno e veja quais fatores mais pesam na previsão.' },
  { id: 'batch', label: 'Análise em Lote', icon: Layers, purpose: 'Suba um CSV e receba o score de cada cliente + uma ação estratégica da base.' },
  { id: 'model', label: 'Governança & Robustez do Modelo', icon: ShieldCheck, purpose: 'Como o modelo foi validado e por que dá pra confiar nas previsões.' },
  { id: 'observability', label: 'Observabilidade', icon: Activity, purpose: 'Saúde da API e do modelo em tempo real: latência, score, drift e uso do LLM.' },
];
const FILTERS_TABS: Tab[] = ['dashboard', 'eda'];   // únicas telas que de fato usam os filtros globais

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState<GlobalFilters>({ gender: 'All', plan: 'All', location: 'All' });
  const [pendingFilters, setPendingFilters] = useState<GlobalFilters>({ ...filters });
  const applyFilters = () => setFilters({ ...pendingFilters });

  const active = NAV.find((n) => n.id === activeTab)!;
  const showFilters = FILTERS_TABS.includes(activeTab);
  const go = (id: Tab) => { setActiveTab(id); setNavOpen(false); };

  // nav mobile: fecha no Esc
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const handlePredict = async (data: CustomerData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await predictChurn(data);
      setPrediction(result);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Falha ao chamar o modelo. O backend está no ar (VITE_API_URL)?');
      setPrediction(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-indigo-100 flex overflow-x-clip">
      {/* Backdrop (mobile) */}
      {navOpen && <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" aria-hidden="true" onClick={() => setNavOpen(false)} />}

      {/* Sidebar (slide-over no mobile, fixa no desktop) */}
      <aside id="main-nav" aria-label="Navegação principal" className={cn(
        "w-72 bg-white border-r border-slate-200 p-8 flex flex-col fixed lg:sticky top-0 h-screen z-40 transition-transform duration-300",
        navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}>
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Building2 className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Vitaliza <span className="text-indigo-600">Hub</span></h1>
          </div>
          <button onClick={() => setNavOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-900" aria-label="Fechar menu" aria-expanded={navOpen} aria-controls="main-nav">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all group text-left",
                activeTab === item.id
                  ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <item.icon size={18} className={cn("shrink-0", activeTab === item.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
              <span className="flex-1">{item.label}</span>
              {activeTab === item.id && <motion.div layoutId="nav-pill" className="w-1.5 h-6 bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </nav>

        {/* Dica de uso estática (substitui o promo morto; ensina o affordance dos ⓘ sem duplicar o header) */}
        <div className="mt-auto pt-8">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-5 rounded-2xl text-white">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-indigo-500/20 w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                <Info size={14} className="text-indigo-300" />
              </div>
              <h4 className="text-[11px] font-black tracking-wide">Dica de uso</h4>
            </div>
            <p className="text-[11px] text-slate-300 font-medium leading-relaxed">Passe o mouse nos <span className="font-black text-indigo-300">ⓘ</span> para uma explicação rápida de cada termo técnico.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 md:px-10 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setNavOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-900 shrink-0" aria-label="Abrir menu" aria-expanded={navOpen} aria-controls="main-nav">
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 text-xs font-black text-slate-400 min-w-0">
              <active.icon size={14} className="shrink-0" />
              <ChevronRight size={14} className="shrink-0" />
              <span className="text-slate-900 truncate">{active.label}</span>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="relative hidden md:block shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                aria-label="Pesquisar métricas"
                placeholder="Pesquisar métricas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
              />
            </div>
          )}
        </header>

        {/* Filtros globais — só nas telas que de fato filtram (Dashboard, EDA) */}
        {showFilters && (
          <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-4 flex flex-wrap items-center gap-6 sticky top-20 z-10 shadow-sm">
            <div className="flex items-center gap-4 flex-1 flex-wrap">
              <div className="flex flex-col gap-1">
                <label htmlFor="f-gender" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gênero</label>
                <select id="f-gender" value={pendingFilters.gender} onChange={(e) => setPendingFilters({ ...pendingFilters, gender: e.target.value as any })}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="All">Todos</option>
                  <option value="Male">Masculino</option>
                  <option value="Female">Feminino</option>
                </select>
              </div>
              <div className="h-8 w-px bg-slate-200 mx-2" />
              <div className="flex flex-col gap-1">
                <label htmlFor="f-plan" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contrato</label>
                <select id="f-plan" value={pendingFilters.plan} onChange={(e) => setPendingFilters({ ...pendingFilters, plan: e.target.value as any })}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="All">Todos</option>
                  <option value="1">1 Mês</option>
                  <option value="6">6 Meses</option>
                  <option value="12">12 Meses</option>
                </select>
              </div>
              <div className="h-8 w-px bg-slate-200 mx-2" />
              <div className="flex flex-col gap-1">
                <label htmlFor="f-location" className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Localização</label>
                <select id="f-location" value={pendingFilters.location} onChange={(e) => setPendingFilters({ ...pendingFilters, location: e.target.value as any })}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="All">Todos</option>
                  <option value="Near">Perto</option>
                  <option value="Away">Longe</option>
                </select>
              </div>
            </div>
            <button onClick={applyFilters}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 flex items-center gap-2">
              <ShieldCheck size={14} /> Aplicar Filtros
            </button>
          </div>
        )}

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.section key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <SectionHeader icon={active.icon} title={active.label} purpose={active.purpose} tipTerm="churn" />
                <DashboardGrid searchQuery={searchQuery} filters={filters} />
                <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
                  <ExecutiveCharts filters={filters} />
                </div>
              </motion.section>
            )}

            {activeTab === 'eda' && (
              <motion.section key="eda" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <SectionHeader icon={active.icon} title={active.label} purpose={active.purpose} tipTerm="correlacao" />
                <EDAView filters={filters} />
              </motion.section>
            )}

            {activeTab === 'simulator' && (
              <motion.section key="simulator" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <SectionHeader icon={active.icon} title={active.label} purpose={active.purpose} tipTerm="shap" />
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                  <div className="xl:col-span-12">
                    <SimulatorForm onPredict={handlePredict} isLoading={isLoading} />
                  </div>
                  {error && (
                    <div className="xl:col-span-12 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-bold">{error}</div>
                  )}
                  {prediction && (
                    <div className="xl:col-span-12"><PredictionDisplay result={prediction} /></div>
                  )}
                </div>
              </motion.section>
            )}

            {activeTab === 'batch' && (
              <motion.section key="batch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <BulkUploadForm />
              </motion.section>
            )}

            {activeTab === 'model' && (
              <motion.section key="model" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <ModelSpecsView />
              </motion.section>
            )}

            {activeTab === 'observability' && (
              <motion.section key="observability" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <SectionHeader icon={active.icon} title={active.label} purpose={active.purpose} />
                <ObservabilityDashboard />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
