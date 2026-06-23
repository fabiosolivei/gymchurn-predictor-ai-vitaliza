import React, { useState } from 'react';
import { CustomerData, PredictionResult } from './types';
import { predictChurn } from './services/mlModelService';
import { DashboardGrid } from './components/KPICards';
import { ExecutiveCharts } from './components/ExecutiveCharts';
import { SimulatorForm } from './components/SimulatorForm';
import { PredictionDisplay } from './components/PredictionDisplay';
import { EDAView } from './components/EDAView';
import { ModelSpecsView } from './components/ModelSpecsView';
import { BulkUploadForm } from './components/BulkUploadForm';
import { 
  Building2, 
  LayoutDashboard, 
  LineChart, 
  BrainCircuit, 
  UserRound, 
  Zap, 
  ChevronRight,
  ShieldCheck,
  Search,
  Settings,
  Layers
} from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export type Tab = 'dashboard' | 'eda' | 'simulator' | 'batch' | 'model';

export interface GlobalFilters {
  gender: 'All' | 'Male' | 'Female';
  plan: 'All' | '1' | '6' | '12';
  location: 'All' | 'Near' | 'Away';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filters, setFilters] = useState<GlobalFilters>({
    gender: 'All',
    plan: 'All',
    location: 'All'
  });

  const [pendingFilters, setPendingFilters] = useState<GlobalFilters>({...filters});

  const applyFilters = () => {
    setFilters({...pendingFilters});
  };

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
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-indigo-100 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 p-8 flex flex-col hidden lg:flex sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Building2 className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Vitaliza <span className="text-indigo-600">Hub</span></h1>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard Executivo', icon: LayoutDashboard },
            { id: 'eda', label: 'Análise Avançada EDA', icon: LineChart },
            { id: 'simulator', label: 'Simulador Preditivo', icon: BrainCircuit },
            { id: 'batch', label: 'Análise em Lote', icon: Layers },
            { id: 'model', label: 'Fronteira & Governança da IA', icon: ShieldCheck },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all group",
                activeTab === item.id 
                  ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={18} className={cn(activeTab === item.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
              {item.label}
              {activeTab === item.id && <motion.div layoutId="nav-pill" className="ml-auto w-1.5 h-6 bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4 pt-8">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl text-white">
            <div className="bg-indigo-500/20 w-8 h-8 rounded-lg flex items-center justify-center mb-4">
              <Zap size={16} className="text-indigo-400" />
            </div>
            <h4 className="text-sm font-bold mb-1">IA Operacional</h4>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Otimize sua retenção com insights gerados automaticamente do Relatório Vitaliza v5.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-10 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
            <LayoutDashboard size={14} />
            <ChevronRight size={14} />
            <span className="text-slate-900">{activeTab.toUpperCase()}</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar métricas..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
              />
            </div>
          </div>
        </header>

        {/* Global Filter Bar */}
        <div className="bg-white border-b border-slate-200 px-10 py-4 flex flex-wrap items-center gap-6 sticky top-20 z-10 shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gênero</label>
              <select 
                value={pendingFilters.gender}
                onChange={(e) => setPendingFilters({...pendingFilters, gender: e.target.value as any})}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">Todos</option>
                <option value="Male">Masculino</option>
                <option value="Female">Feminino</option>
              </select>
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-2" />
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contrato</label>
              <select 
                value={pendingFilters.plan}
                onChange={(e) => setPendingFilters({...pendingFilters, plan: e.target.value as any})}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">Todos</option>
                <option value="1">1 Mês</option>
                <option value="6">6 Meses</option>
                <option value="12">12 Meses</option>
              </select>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-2" />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Localização</label>
              <select 
                value={pendingFilters.location}
                onChange={(e) => setPendingFilters({...pendingFilters, location: e.target.value as any})}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">Todos</option>
                <option value="Near">Perto</option>
                <option value="Away">Longe</option>
              </select>
            </div>
          </div>

          <button 
            onClick={applyFilters}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 flex items-center gap-2"
          >
            <ShieldCheck size={14} /> Aplicar Filtros
          </button>
        </div>

        <div className="p-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.section 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Executive Overview</h2>
                    <p className="text-slate-500 font-medium">Consolidado Vitaliza Wellness • {filters.plan !== 'All' ? `Plano ${filters.plan} Meses` : 'Todos os Planos'}</p>
                  </div>
                </div>
                
                <DashboardGrid searchQuery={searchQuery} filters={filters} />
                
                <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
                  <ExecutiveCharts filters={filters} />
                </div>
              </motion.section>
            )}

            {activeTab === 'eda' && (
              <motion.section 
                key="eda"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Análise Exploratória Avançada</h2>
                  <p className="text-slate-500 font-medium">Interpretação detalhada com filtros ativos</p>
                </div>
                <EDAView filters={filters} />
              </motion.section>
            )}

            {activeTab === 'simulator' && (
              <motion.section 
                key="simulator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Simulador de Probabilidade</h2>
                  <p className="text-slate-500 font-medium">Motor de IA para predição individual de risco</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                  <div className="xl:col-span-12">
                    <SimulatorForm onPredict={handlePredict} isLoading={isLoading} />
                  </div>
                  {error && (
                    <div className="xl:col-span-12 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-bold">
                      {error}
                    </div>
                  )}
                  {prediction && (
                    <div className="xl:col-span-12">
                      <PredictionDisplay result={prediction} />
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {activeTab === 'batch' && (
              <motion.section
                key="batch"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Análise em Lote</h2>
                  <p className="text-slate-500 font-medium">Caso A — dump de dados → score + recomendação estratégica da base</p>
                </div>
                <BulkUploadForm />
              </motion.section>
            )}

            {activeTab === 'model' && (
              <motion.section 
                key="model"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Fronteira & Governança da IA</h2>
                  <p className="text-slate-500 font-medium font-semibold">Auditoria de vazamento por teste de sensibilidade (sem remover features), desbalanceamento via scale_pos_weight e validação cruzada</p>
                </div>
                <ModelSpecsView />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
