import React, { useState } from 'react';
import { motion } from 'motion/react';
import { InfoTip } from './ui/InfoTip';
import { 
  Cpu, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle, 
  AlertOctagon, 
  Layers, 
  Gauge, 
  Scale, 
  HelpCircle,
  Database,
  Briefcase,
  UserCheck,
  Scroll,
  Clock,
  Hourglass,
  Activity,
  User,
  Users,
  Gift,
  MapPin,
  Sparkles,
  Sliders,
  DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ShapSimState {
  contractPeriod: 1 | 6 | 12;
  lifetime: number;
  monthToEnd: number;
  freqTotal: number;
  age: number;
  groupVisits: boolean;
  promoFriends: boolean;
  nearLocation: boolean;
}

const PRESETS = [
  {
    name: "Perfil 1: João Silva (Risco Crítico)",
    description: "Plano mensal, recém-matriculado, frequência baixíssima e sem interações sociais.",
    state: {
      contractPeriod: 1 as const,
      lifetime: 1,
      monthToEnd: 1,
      freqTotal: 0.8,
      age: 22,
      groupVisits: false,
      promoFriends: false,
      nearLocation: false
    }
  },
  {
    name: "Perfil 2: Maria Oliveira (Segurança Absoluta)",
    description: "Plano anual de longo prazo, frequência altíssima, engajada socialmente com amigos e mora perto.",
    state: {
      contractPeriod: 12 as const,
      lifetime: 14,
      monthToEnd: 9,
      freqTotal: 3.5,
      age: 38,
      groupVisits: true,
      promoFriends: true,
      nearLocation: true
    }
  },
  {
    name: "Perfil 3: Carlos Souza (Risco Moderado)",
    description: "Plano semestral, fidelidade mediana, frequenta bem embora more longe.",
    state: {
      contractPeriod: 6 as const,
      lifetime: 4,
      monthToEnd: 2,
      freqTotal: 1.8,
      age: 28,
      groupVisits: false,
      promoFriends: true,
      nearLocation: false
    }
  }
];

export const ModelSpecsView = () => {
  const [activeMetric, setActiveMetric] = useState<string>('metrics');
  
  // Interactive SHAP simulator state initialized to João's critical risk profile
  const [simState, setSimState] = useState<ShapSimState>({ ...PRESETS[0].state });

  const selectPreset = (idx: number) => {
    setSimState({ ...PRESETS[idx].state });
  };

  const computeShapValues = (state: ShapSimState) => {
    const baseValue = 26.5;

    // 1. Contract Period
    let shapContract = 22.0;
    if (state.contractPeriod === 6) shapContract = -4.0;
    if (state.contractPeriod === 12) shapContract = -15.0;

    // 2. Lifetime
    let shapLifetime = 18.0;
    if (state.lifetime >= 2 && state.lifetime <= 3) shapLifetime = 5.0;
    if (state.lifetime >= 4 && state.lifetime <= 6) shapLifetime = -6.0;
    if (state.lifetime > 6) shapLifetime = -15.0;

    // 3. Month to End Contract
    let shapMonthToEnd = 12.0;
    if (state.monthToEnd >= 2 && state.monthToEnd <= 3) shapMonthToEnd = 4.0;
    if (state.monthToEnd > 3) shapMonthToEnd = -8.0;

    // 4. Freq Total
    let shapFreqTotal = 18.0;
    if (state.freqTotal >= 1.0 && state.freqTotal < 2.0) shapFreqTotal = 2.0;
    if (state.freqTotal >= 2.0 && state.freqTotal < 3.0) shapFreqTotal = -10.0;
    if (state.freqTotal >= 3.0) shapFreqTotal = -18.0;

    // 5. Age
    let shapAge = 10.0;
    if (state.age >= 25 && state.age <= 30) shapAge = 4.0;
    if (state.age > 30) shapAge = -8.0;

    // 6. Group Visits
    const shapGroupVisits = state.groupVisits ? -6.0 : 5.0;

    // 7. Promo Friends
    const shapPromoFriends = state.promoFriends ? -6.0 : 3.0;

    // 8. Near Location
    const shapNearLocation = state.nearLocation ? -4.0 : 12.0;

    const contributions = [
      { feature: 'Contract_Period', label: `Plano de Contrato (${state.contractPeriod} meses)`, shap: shapContract, icon: Scroll },
      { feature: 'Lifetime', label: `Fidelidade (${state.lifetime} meses)`, shap: shapLifetime, icon: Clock },
      { feature: 'Month_to_end_contract', label: `Contrato Restante (${state.monthToEnd} m)`, shap: shapMonthToEnd, icon: Hourglass },
      { feature: 'Avg_class_frequency_total', label: `Frequência Total (${state.freqTotal.toFixed(1)}/sem)`, shap: shapFreqTotal, icon: Activity },
      { feature: 'Age', label: `Idade (${state.age} anos)`, shap: shapAge, icon: User },
      { feature: 'Group_visits', label: state.groupVisits ? 'Aulas de Grupo (Sim)' : 'Aulas de Grupo (Não)', shap: shapGroupVisits, icon: Users },
      { feature: 'Promo_friends', label: state.promoFriends ? 'Cupom de Amigo (Sim)' : 'Cupom de Amigo (Não)', shap: shapPromoFriends, icon: Gift },
      { feature: 'Near_Location', label: state.nearLocation ? 'Mora Perto (Sim)' : 'Mora Perto (Não)', shap: shapNearLocation, icon: MapPin },
    ];

    // Compute range segments
    let currentSum = baseValue;
    const steps = contributions.map(c => {
      const start = currentSum;
      currentSum += c.shap;
      return {
        ...c,
        start,
        end: currentSum
      };
    });

    const rawFinal = baseValue + contributions.reduce((acc, c) => acc + c.shap, 0);
    const finalPrediction = Math.max(0, Math.min(100, rawFinal));

    return {
      baseValue,
      steps,
      finalPrediction
    };
  };

  const { baseValue, steps, finalPrediction } = computeShapValues(simState);

  // Set visual scale coordinates
  const minVal = -35; 
  const maxVal = 135; 
  const range = maxVal - minVal;

  const getLeftPosition = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return ((clamped - minVal) / range) * 100;
  };

  const getWidth = (start: number, end: number) => {
    const sClamped = Math.max(minVal, Math.min(maxVal, start));
    const eClamped = Math.max(minVal, Math.min(maxVal, end));
    return Math.abs(eClamped - sClamped);
  };

  // Valores REAIS do XGBoost campeão (reports/metrics.json, holdout 800 amostras).
  const technicalMetrics = [
    { name: 'ROC-AUC (teste)', value: '98.3%', description: 'Poder de discriminação do XGBoost no holdout (PR-AUC 96.6%). Métrica-chave para classe desbalanceada.', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { name: 'Recall (Churn)', value: '89.2%', description: 'Captura de alunos que realmente vão dar churn (classe 1). Essencial para retenção.', color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { name: 'Precisão (Churn)', value: '91.3%', description: 'Dos alertas de churn, quantos eram evasões reais (classe 1).', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { name: 'F1-Score (Churn)', value: '90.2%', description: 'Média harmônica de Precisão e Recall da classe churn. Acurácia geral: 94.9%.', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  ];

  const variableSpecs = [
    { 
      name: 'Contract_Period', 
      type: 'Contratual', 
      status: 'valid', 
      desc: 'Tempo de duração do contrato em meses (1, 6 ou 12). Principal redutor estatístico de evasão pela barreira financeira contractual.',
      mitigation: 'Sem Look-ahead Bias. Representa apenas o estado contratual conhecido no tempo zero.'
    },
    { 
      name: 'Lifetime', 
      type: 'Fidelidade', 
      status: 'valid', 
      desc: 'Período total de meses ativos do aluno na academia.',
      mitigation: 'Snapshot válido de tempo zero. Crucial para capturar a barreira de hábito que se forma no 3º mês.'
    },
    { 
      name: 'Month_to_end_contract', 
      type: 'Contratual', 
      status: 'valid', 
      desc: 'Meses restantes para o encerramento do plano.',
      mitigation: 'Válido. Captura o fim iminente do ciclo contratual onde o gatilho de renegociação ocorre.'
    },
    { 
      name: 'Avg_class_frequency_total', 
      type: 'Comportamento', 
      status: 'valid', 
      desc: 'Frequência de treinos semanal histórica consolidada total do aluno.',
      mitigation: 'Excelente feature histórica de saúde geral de engajamento do cliente, sem viés comportamental.'
    },
    { 
      name: 'Avg_class_frequency_current_month',
      type: 'Comportamento',
      status: 'valid',
      desc: 'Frequência semanal no mês corrente — estado observável no momento da inferência.',
      mitigation: 'USADA pelo modelo (5.0% de importância). Auditoria de vazamento: removê-la (junto de Month_to_end_contract) derruba o ROC-AUC só de 0.983 para 0.949 — sem dependência determinística de informação futura.'
    },
  ];

  // Importância REAL do XGBoost (clf.feature_importances_ via /model_card).
  const featureImportanceList = [
    { name: 'Lifetime', score: 0.337, percentage: '33.7%', type: 'Fidelidade', desc: 'Permanência acumulada — maior preditor de retenção.', color: 'bg-indigo-600' },
    { name: 'Contract_period', score: 0.273, percentage: '27.3%', type: 'Contratual', desc: 'Duração do plano (1, 6 ou 12 meses). Planos longos vinculam o aluno.', color: 'bg-indigo-500' },
    { name: 'Month_to_end_contract', score: 0.097, percentage: '9.7%', type: 'Contratual', desc: 'Meses restantes para o plano expirar. Concentra renegociações.', color: 'bg-indigo-400' },
    { name: 'Age', score: 0.068, percentage: '6.8%', type: 'Demográfico', desc: 'Idade do aluno. Mais velhos tendem a menor abandono.', color: 'bg-sky-500' },
    { name: 'Avg_class_frequency_current_month', score: 0.050, percentage: '5.0%', type: 'Comportamento', desc: 'Frequência no mês corrente. USADA (não é vazamento — ver auditoria).', color: 'bg-sky-400' },
    { name: 'Group_visits', score: 0.043, percentage: '4.3%', type: 'Social', desc: 'Participação recorrente em aulas de grupo.', color: 'bg-emerald-500' },
    { name: 'Avg_class_frequency_total', score: 0.040, percentage: '4.0%', type: 'Comportamento', desc: 'Frequência semanal histórica consolidada.', color: 'bg-emerald-400' },
    { name: 'Promo_friends', score: 0.021, percentage: '2.1%', type: 'Social', desc: 'Indicação por amigos (ancoragem social).', color: 'bg-emerald-300' },
    { name: 'Avg_additional_charges_total', score: 0.019, percentage: '1.9%', type: 'Financeiro', desc: 'Gasto com serviços adicionais.', color: 'bg-teal-400' },
    { name: 'Near_Location', score: 0.014, percentage: '1.4%', type: 'Geográfico', desc: 'Proximidade entre residência/trabalho e a unidade.', color: 'bg-teal-300' },
    { name: 'gender', score: 0.013, percentage: '1.3%', type: 'Demográfico', desc: 'Gênero (impacto baixo).', color: 'bg-slate-300' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Header explicativo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-black uppercase tracking-widest">
            <Cpu size={12} /> Robustez de Machine Learning
          </div>
          <h3 className="text-2xl font-black tracking-tight md:text-3xl">Características & Governança da IA</h3>
          <p className="text-slate-300 text-sm leading-relaxed font-semibold">
            Confira as diretrizes, mitigações de vieses estatísticos, tratamento de desbalanceamento de classes, correções de vazamentos e métricas de desempenho sob validação cruzada.
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center flex-shrink-0">
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Algoritmo</span>
          <span className="text-lg font-black text-indigo-400">XGBoost Classifier</span>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full mt-2 inline-flex items-center gap-1">scale_pos_weight=1<InfoTip term="scale_pos_weight" align="right" tone="dark" /></span>
        </div>
      </div>

      {/* 2. Os Três Pilares de Correção Técnica requisitados */}
      <h4 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
        <Layers size={18} className="text-indigo-600" /> Diretrizes e Correções Aplicadas ao Modelo
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pilar 1: Data Leakage */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl w-12 h-12 flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <div className="space-y-2">
            <h5 className="font-extrabold text-slate-900 flex items-center justify-between">
              1. Auditoria de Data Leakage
              <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded uppercase">Auditado</span>
            </h5>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              A coluna <code className="text-emerald-600 bg-emerald-50/50 px-1 py-0.5 rounded text-[10px] font-bold">Avg_class_frequency_current_month</code> foi <span className="text-emerald-600 font-bold">auditada e MANTIDA</span> no conjunto preditivo.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Teste de sensibilidade: removê-la (junto de Month_to_end_contract) derruba o ROC-AUC só de 0.983 para 0.949 — sem dependência determinística de informação futura. É estado observável no momento da inferência, não vazamento.
            </p>
          </div>
          <div className="mt-auto pt-2 border-t border-slate-50 flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <CheckCircle size={14} /> Mantida — 5.0% de importância
          </div>
        </div>

        {/* Pilar 2: Class Imbalance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl w-12 h-12 flex items-center justify-center">
            <Scale size={24} />
          </div>
          <div className="space-y-2">
            <h5 className="font-extrabold text-slate-900 flex items-center justify-between">
              2. Desbalanceamento de Classes
              <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">Treinamento</span>
            </h5>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              A classe minoritária Churn corresponde a apenas ~26.5% da base contra ~73.5% de retenção ativa.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              O XGBoost foi tunado com <code className="text-[10px] bg-slate-50 border px-1 rounded">scale_pos_weight=1</code> (sem oversampling/SMOTE). O GridSearchCV também testou peso 2.77; o campeão, escolhido por ROC-AUC, ficou com peso 1 — e é avaliado por métricas honestas para classe desbalanceada (PR-AUC 0.966, recall-churn 89.2%).
            </p>
          </div>
          <div className="mt-auto pt-2 border-t border-slate-50 flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <CheckCircle size={14} /> Avaliado por PR-AUC e recall (não só acurácia)
          </div>
        </div>

        {/* Pilar 3: Look-ahead Bias */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl w-12 h-12 flex items-center justify-center">
            <Gauge size={24} />
          </div>
          <div className="space-y-2">
            <h5 className="font-extrabold text-slate-900 flex items-center justify-between">
              3. Snapshots e Tempo Zero
              <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded uppercase">Look-ahead</span>
            </h5>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              As variáveis <code className="text-amber-600 bg-amber-100/30 px-1 py-0.5 rounded text-[10px] font-bold">Lifetime</code> e <code className="text-amber-600 bg-amber-100/30 px-1 py-0.5 rounded text-[10px] font-bold">Month_to_end_contract</code> foram validadas no modelo.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Essas informações são corretas e legítimas no modelo, pois representam características contratuais conhecidas exatamente no "Snapshot de Tempo Zero", sem adição de features ou variáveis derivadas que utilizem dados gerados em momentos posteriores.
            </p>
          </div>
          <div className="mt-auto pt-2 border-t border-slate-50 flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <CheckCircle size={14} /> Blindado contra variáveis espúrias ou de futuro
          </div>
        </div>

      </div>

      {/* Seção Nova: Divisão Amostral e Validação Cruzada */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <RefreshCw size={18} className="text-indigo-600" /> 
              Divisão Amostral e Validação Cruzada (Cross-Validation)
            </h4>
            <p className="text-xs text-slate-500 font-semibold">
              Metodologia de partição e robustez contra Overfitting seguindo padrões rigorosos de Data Science.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
              80% Treino / 20% Teste
            </span>
            <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
              K-Fold (k=5)
            </span>
          </div>
        </div>

        {/* Barra de distribuição visual */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Conjunto de Treino (80%)</span>
            <span>Conjunto de Teste (20%)</span>
          </div>
          <div className="h-6 w-full rounded-2xl bg-slate-100 overflow-hidden flex shadow-inner p-1">
            <div className="h-full bg-indigo-600 rounded-l-xl flex items-center justify-center text-[10px] font-black text-white px-2 transition-all hover:bg-indigo-700" style={{ width: '80%' }}>
              80% dos Dados (3.200 clientes)
            </div>
            <div className="h-full bg-emerald-500 rounded-r-xl flex items-center justify-center text-[10px] font-black text-white px-2 transition-all hover:bg-emerald-600" style={{ width: '20%' }}>
              20% (800 clientes)
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>Treinamento & Calibração de Hiperparâmetros (GridSearchCV)</span>
            <span>Avaliação de Métricas Finais e Matriz de Confusão</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex gap-4">
            <div className="p-3 bg-white border rounded-xl shadow-sm self-start text-indigo-600">
              <Layers size={20} />
            </div>
            <div className="space-y-2">
              <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Metodologia Train/Test Split (80% - 20%)</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Utilizamos <strong className="text-slate-700">80% dos dados históricos (Tempo Zero)</strong> para a fase de ajuste e aprendizado supervisionado (Training Set). Os <strong className="text-slate-700">20% restantes</strong> foram rigorosamente separados como dados inéditos (Holdout Test Set) usados apenas para medir e calcular as métricas reais apresentadas de acurácia, recall e F1-score.
              </p>
              <div className="text-[11px] text-slate-500 flex gap-1 items-center bg-white px-3 py-1.5 rounded-lg border">
                <CheckCircle size={12} className="text-emerald-500" />
                <span>Garante que o modelo não tenha contato prévio com dados de teste durante o tuning.</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex gap-4">
            <div className="p-3 bg-white border rounded-xl shadow-sm self-start text-emerald-600">
              <RefreshCw size={20} />
            </div>
            <div className="space-y-2">
              <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Validação Cruzada (Stratified K-Fold)</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Para blindar o modelo contra a variabilidade amostral do split, realizamos uma <strong className="text-slate-700">Validação Cruzada Estratificada com 5 Folds</strong> no conjunto de treino. Isso significa que o conjunto de treino foi rotacionado em 5 partições diferentes para calibração, mantendo a exata proporção de labels.
              </p>
              <div className="text-[11px] text-slate-500 flex gap-1 items-center bg-white px-3 py-1.5 rounded-lg border">
                <CheckCircle size={12} className="text-emerald-500" />
                <span>ROC-AUC média na validação cruzada (5-fold): <strong className="text-emerald-600">0.982</strong> ≈ teste 0.983 (sem overfit)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Nova: Explicação e Atribuição de Impacto Local (SHAP Waterfall) */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-black uppercase tracking-widest">
              <Sparkles size={12} className="animate-pulse" /> Game Theory & Explainability
            </div>
            <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
              Análise Preditiva e SHAP (Shapley Additive exPlanations)
            </h4>
            <p className="text-xs text-slate-500 font-semibold font-sans">
              O gráfico Waterfall decompõe analiticamente qual a contribuição exata de cada variável até atingir a probabilidade final de Churn.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Carregar Presets:</span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => selectPreset(idx)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm flex items-center gap-1.5",
                  simState.contractPeriod === p.state.contractPeriod && 
                  simState.lifetime === p.state.lifetime && 
                  simState.freqTotal === p.state.freqTotal
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-100 font-black"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <UserCheck size={12} /> {p.name.split(':')[1].trim()}
              </button>
            ))}
          </div>
        </div>

        {/* Painel de Controles Flexíveis */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-slate-100 pt-6">
          
          {/* Coluna 1: Sliders e Configurações */}
          <div className="lg:col-span-5 space-y-5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
            <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wider mb-2">
              <Sliders size={14} className="text-indigo-600" /> Ajuste de Variáveis do Aluno
            </h5>
            
            {/* Contrato */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Período de Contrato (Meses)</span>
                <span className="text-indigo-600 font-extrabold">{simState.contractPeriod}m</span>
              </label>
              <div className="flex gap-2">
                {[1, 6, 12].map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      const mToEnd = Math.min(v, simState.monthToEnd);
                      setSimState({ ...simState, contractPeriod: v as any, monthToEnd: mToEnd });
                    }}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all",
                      simState.contractPeriod === v
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-black shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {v} {v === 1 ? 'Mês' : 'Meses'}
                  </button>
                ))}
              </div>
            </div>

            {/* Lifetime */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <span>Fidelidade (Lifetime)</span>
                <span className="text-indigo-600 font-extrabold">{simState.lifetime} meses</span>
              </div>
              <input
                type="range" min="1" max="24"
                value={simState.lifetime}
                onChange={(e) => setSimState({ ...simState, lifetime: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Meses Restantes */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <span>Meses Restantes de Contrato</span>
                <span className="text-indigo-600 font-extrabold">{simState.monthToEnd} m</span>
              </div>
              <input
                type="range" min="1" max={simState.contractPeriod}
                value={simState.monthToEnd}
                onChange={(e) => setSimState({ ...simState, monthToEnd: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Frequência Total */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <span>Frequência Histórica Semanal</span>
                <span className="text-indigo-600 font-extrabold">{simState.freqTotal.toFixed(1)} treinos / sem</span>
              </div>
              <input
                type="range" min="0" max="5" step="0.1"
                value={simState.freqTotal}
                onChange={(e) => setSimState({ ...simState, freqTotal: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Idade */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <span>Idade</span>
                <span className="text-indigo-600 font-extrabold">{simState.age} anos</span>
              </div>
              <input
                type="range" min="16" max="65"
                value={simState.age}
                onChange={(e) => setSimState({ ...simState, age: Number(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Toggles Rápidos */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Integração Social</label>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSimState({ ...simState, groupVisits: !simState.groupVisits })}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-[10px] font-bold border flex flex-col items-center gap-1 transition-all",
                    simState.groupVisits ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500"
                  )}
                >
                  <Users size={12} /> Grupo: {simState.groupVisits ? 'Sim' : 'Não'}
                </button>

                <button
                  onClick={() => setSimState({ ...simState, promoFriends: !simState.promoFriends })}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-[10px] font-bold border flex flex-col items-center gap-1 transition-all",
                    simState.promoFriends ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500"
                  )}
                >
                  <Gift size={12} /> Cupom: {simState.promoFriends ? 'Sim' : 'Não'}
                </button>

                <button
                  onClick={() => setSimState({ ...simState, nearLocation: !simState.nearLocation })}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-[10px] font-bold border flex flex-col items-center gap-1 transition-all",
                    simState.nearLocation ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-rose-50 border-rose-300 text-rose-700"
                  )}
                >
                  <MapPin size={12} /> Perto: {simState.nearLocation ? 'Sim' : 'Não'}
                </button>
              </div>
            </div>
          </div>

          {/* Coluna 2: Gráfico de Waterfall */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex items-center justify-between border border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Previsão Final de Churn f(x)</span>
                <p className="text-xs font-semibold text-slate-300">Soma de contribuições SHAP (log-odds) — simulação didática, não a saída do modelo servido.</p>
              </div>
              <div className="text-right">
                <span className={cn(
                  "text-3xl font-black block tracking-tight transition-colors",
                  finalPrediction > 60 ? "text-rose-400" : finalPrediction > 30 ? "text-amber-400" : "text-emerald-400"
                )}>
                  {finalPrediction.toFixed(1)}%
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full inline-block mt-1">
                  {finalPrediction > 60 ? 'Alto Risco' : finalPrediction > 30 ? 'Cuidado / Alerta' : 'Fidelizado / Estável'}
                </span>
              </div>
            </div>

            {/* Régua de Medidas (Legenda Superior) */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-4">
                <span>Risco Próximo a Zero (0%)</span>
                <span>Fator Base (26.5%)</span>
                <span>Neutro (50%)</span>
                <span>Evasão Total (100%)</span>
              </div>

              {/* Corpo da Cascata (Waterfall) */}
              <div className="space-y-2 border border-slate-100 bg-slate-50/50 p-4 rounded-2xl">
                
                {/* 1. Base Value Step */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center hover:bg-white/80 p-2 rounded-xl transition-all">
                  <div className="md:col-span-4 flex items-center gap-2">
                    <div className="p-1.5 bg-slate-200 text-slate-600 rounded">
                      <Cpu size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 block">Fator Base Esperado</span>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">E[f(x)] do Modelo</span>
                    </div>
                  </div>
                  
                  <div className="md:col-span-6 relative h-6 bg-slate-100 rounded-full border border-slate-200">
                    <div className="absolute h-full bg-slate-400 rounded-full"
                      style={{
                        left: `${getLeftPosition(Math.min(minVal, 0))}%`,
                        width: `${getWidth(0, baseValue)}%`
                      }}
                    />
                    {/* Linha vertical tracejada do Fator Base */}
                    <div className="absolute inset-y-0 w-px border-l-2 border-dashed border-indigo-400" style={{ left: `${getLeftPosition(baseValue)}%` }} />
                    <div className="absolute inset-y-0 w-px border-l border-dashed border-orange-300" style={{ left: `${getLeftPosition(50)}%` }} />
                  </div>

                  <div className="md:col-span-2 text-right">
                    <span className="text-xs font-black text-slate-800 bg-white border px-2 py-0.5 rounded shadow-sm">
                      {baseValue.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* 2. Dynamic Features Steps */}
                {steps.map((s, idx) => {
                  const IconComp = s.icon;
                  return (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center hover:bg-white p-2 rounded-xl border border-transparent hover:border-slate-100 hover:shadow-sm transition-all duration-300">
                      <div className="md:col-span-4 flex items-center gap-2">
                        <div className={cn(
                          "p-1.5 rounded",
                          s.shap > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          <IconComp size={14} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-800 block">{s.label}</span>
                          <span className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">FEATURE: {s.feature}</span>
                        </div>
                      </div>
                      
                      <div className="md:col-span-6 relative h-6 bg-slate-100 rounded-full border border-slate-250">
                        {/* Linha Fator Base */}
                        <div className="absolute inset-y-0 w-px border-l border-dashed border-indigo-300 z-10" style={{ left: `${getLeftPosition(baseValue)}%` }} />
                        <div className="absolute inset-y-0 w-px border-l border-dashed border-orange-350 z-10" style={{ left: `${getLeftPosition(50)}%` }} />
                        
                        {/* Barra SHAP */}
                        <div className={cn(
                          "absolute h-full rounded-full transition-all duration-500",
                          s.shap > 0 ? "bg-rose-500/80 hover:bg-rose-500" : "bg-emerald-500/80 hover:bg-emerald-500"
                        )}
                          style={{
                            left: `${getLeftPosition(Math.min(s.start, s.end))}%`,
                            width: `${Math.max(1.5, getWidth(s.start, s.end))}%`
                          }}
                        />
                        
                        {/* Balão Indicador de Valor Incremental */}
                        <span className={cn(
                          "absolute -top-6 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm z-20 pointer-events-none transform -translate-x-1/2",
                          s.shap > 0 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        )}
                          style={{ left: `${getLeftPosition((s.start + s.end) / 2)}%` }}
                        >
                          {s.shap > 0 ? `+${s.shap.toFixed(1)}% Churn` : `${s.shap.toFixed(1)}% Retenção`}
                        </span>
                      </div>

                      <div className="md:col-span-2 text-right">
                        <span className="text-xs font-black text-slate-500">
                          {s.end.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* 3. Final Prediction Value Step */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center bg-indigo-50/45 p-2.5 rounded-xl border border-indigo-100 mt-2">
                  <div className="md:col-span-4 flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 text-white rounded">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-indigo-950 block">Previsão Acumulada f(x)</span>
                      <span className="text-[8px] text-indigo-600 uppercase tracking-widest font-bold">Sumatório SHAP Final</span>
                    </div>
                  </div>
                  
                  <div className="md:col-span-6 relative h-6 bg-slate-100 rounded-full border border-slate-205">
                    <div className="absolute h-full bg-indigo-600 rounded-full"
                      style={{
                        left: `${getLeftPosition(Math.min(0, finalPrediction))}%`,
                        width: `${getWidth(0, finalPrediction)}%`
                      }}
                    />
                    <div className="absolute inset-y-0 w-px border-l-2 border-dashed border-indigo-400" style={{ left: `${getLeftPosition(baseValue)}%` }} />
                    <div className="absolute inset-y-0 w-px border-l border-dashed border-orange-500" style={{ left: `${getLeftPosition(50)}%` }} />
                  </div>

                  <div className="md:col-span-2 text-right">
                    <span className="text-xs font-black text-white bg-indigo-600 px-2 py-0.5 rounded shadow-md uppercase tracking-wider block text-center">
                      {finalPrediction.toFixed(1)}%
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Notas Técnicas sobre o Gráfico de Waterfall */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex gap-3 text-xs leading-relaxed text-slate-500">
              <HelpCircle size={20} className="text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-700">Entendendo as Contribuições de Aditividade SHAP:</p>
                <p>
                  As contribuições em <strong className="text-rose-600">vermelho</strong> representam fatores que justificam um <strong className="text-rose-600">aumento do risco de Churn</strong> em relação ao comportamento padrão, enquanto os fatores em <strong className="text-emerald-600">verde</strong> justificam a <strong className="text-emerald-700">fidelização do cliente no modelo</strong>. O sumatório algébrico de todas as barras mais o valor base $E[f(x)]$ resulta exatamente na probabilidade final calibrada.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* 3. Métricas Técnicas Adicionais do Modelo */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Matriz de Performance */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 md:col-span-1 space-y-6">
          <div className="space-y-1">
            <h4 className="text-lg font-black text-slate-800">Resultado da Matriz de Confusão</h4>
            <p className="text-xs text-slate-500 font-semibold">Holdout de teste (800 amostras / 20%) — saída real do XGBoost campeão (metrics.json).</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50/70 p-4 rounded-xl border border-dashed flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verdadeiro Retido</span>
              <span className="text-xl font-extrabold text-slate-800 mt-1">570</span>
              <span className="text-[9px] font-bold text-emerald-500 mt-1 bg-emerald-50 px-1.5 rounded uppercase">True Negative</span>
            </div>
            <div className="bg-rose-50/20 p-4 rounded-xl border border-dashed border-rose-100 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Falso Alarme Churn</span>
              <span className="text-xl font-extrabold text-rose-700 mt-1">18</span>
              <span className="text-[9px] font-bold text-rose-500 mt-1 bg-rose-50 px-1.5 rounded uppercase font-black">False Positive</span>
            </div>
            <div className="bg-amber-50/20 p-4 rounded-xl border border-dashed border-amber-100 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Falha de Detecção</span>
              <span className="text-xl font-extrabold text-amber-700 mt-1">23</span>
              <span className="text-[9px] font-bold text-amber-500 mt-1 bg-amber-50 px-1.5 rounded uppercase font-black">False Negative</span>
            </div>
            <div className="bg-indigo-50/30 p-4 rounded-xl border border-dashed border-indigo-100 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Verdadeiro Churn</span>
              <span className="text-xl font-extrabold text-indigo-800 mt-1">189</span>
              <span className="text-[9px] font-bold text-indigo-500 mt-1 bg-indigo-50 px-1.5 rounded uppercase font-black">True Positive</span>
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[11px] leading-relaxed text-slate-500 font-medium">
            <HelpCircle size={14} className="inline-block mr-1 text-slate-400 align-text-bottom" />
            <strong className="text-slate-700">Por que o Recall é priorizado?</strong> Em retenção de assinaturas, errar para o lado preventivo (enviar um alarme falso) é muito menos custoso do que deixar de detectar um aluno prestes a evadir estruturalmente da academia.
          </div>
        </div>

        {/* Bento Grid dos scores de teste */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 md:col-span-2 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-800">Métricas Principais de Validação</h4>
              <p className="text-xs text-slate-500 font-semibold">Métricas técnicas derivadas da validação cruzada k-fold balanceada.</p>
            </div>
            <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold border border-indigo-100">
              AUC-ROC: 0.983
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {technicalMetrics.map((met, i) => (
              <div key={i} className={cn("p-5 rounded-2xl border transition-all hover:scale-[1.01]", met.color.split(' ').slice(1).join(' '))}>
                <span className="text-xs font-black uppercase tracking-wider block opacity-70 mb-1">{met.name}</span>
                <span className="text-3xl font-black block leading-none mb-2">{met.value}</span>
                <p className="text-xs font-medium leading-relaxed opacity-80">{met.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Seção Nova: Importância Global das Features (Feature Importance) */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-widest">
              <Sparkles size={12} /> Global Impact Analysis
            </div>
            <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
              Importância Global das Features (Feature Importance)
            </h4>
            <p className="text-xs text-slate-500 font-semibold font-sans leading-normal">
              Grau de relevância de cada variável na decisão do XGBoost Classifier (importância por ganho — feature_importances_, servida via /model_card).
            </p>
          </div>
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-1 self-start md:self-center shrink-0">
            <CheckCircle size={12} /> Importância por ganho (XGBoost)
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Gráfico de Barras Horizontais */}
          <div className="lg:col-span-7 space-y-3.5">
            {featureImportanceList.map((f, i) => {
              const isRemoved = f.score === 0;
              return (
                <div 
                  key={i} 
                  className={cn(
                    "group p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all duration-300",
                    isRemoved && "opacity-60 bg-slate-50/20 border-dashed border-slate-200"
                  )}
                >
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-slate-800 flex items-center gap-1.5 font-sans font-black">
                      <code>{f.name}</code>
                      {isRemoved ? (
                        <span className="bg-rose-50 text-rose-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-sans">
                          Leakage Bloqueado
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase font-sans">
                          {f.type}
                        </span>
                      )}
                    </span>
                    <span className={cn("font-mono", isRemoved ? "text-slate-400 font-bold" : "text-indigo-600 font-black")}>
                      {f.percentage}
                    </span>
                  </div>
                  
                  {/* Container da barra */}
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex relative shadow-inner p-px">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        f.color
                      )}
                      style={{ width: `${(f.score * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-normal mt-1 block group-hover:text-slate-600 transition-colors font-semibold">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Cards explicativos e Insights de Governança */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
              <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Gauge size={14} className="text-indigo-600" /> Insights de IA & Impactos Reais
              </h5>
              
              <ul className="space-y-4 text-xs leading-relaxed text-slate-500 font-medium">
                <li className="flex gap-2.5">
                  <div className="text-indigo-600 font-black pt-0.5">•</div>
                  <div>
                    <strong className="text-slate-800 block font-bold">Fidelidade (Lifetime) é Suprema:</strong>
                    Com <strong className="text-indigo-600">33.7%</strong> de importância, a retenção é sustentada principalmente pelo tempo de permanência acumulado, apontando que os 3 primeiros meses de matrícula são a barreira de hábito crucial a ser consolidada.
                  </div>
                </li>
                <li className="flex gap-2.5">
                  <div className="text-indigo-600 font-black pt-0.5">•</div>
                  <div>
                    <strong className="text-slate-800 block font-bold">Influência Contratual Determinante:</strong>
                    A duração contratual (<strong className="text-slate-700">Contract_period</strong> com <strong className="text-indigo-600">27.3%</strong>) e os meses restantes (<strong className="text-indigo-600">9.7%</strong>) criam barreiras financeiras e psicológicas robustas contra evasões impulsivas.
                  </div>
                </li>
                <li className="flex gap-2.5">
                  <div className="text-indigo-600 font-black pt-0.5">•</div>
                  <div>
                    <strong className="text-slate-800 block font-bold">Frequência Semanal (mantida e auditada):</strong>
                    A feature <code className="text-emerald-600 text-[10px] font-bold">Avg_class_frequency_current_month</code> foi MANTIDA (5.0% de importância) após auditoria de vazamento; a histórica <strong className="text-slate-700">Avg_class_frequency_total</strong> contribui com <strong className="text-indigo-600">4.0%</strong>, refletindo o hábito semanal consolidado.
                  </div>
                </li>
                <li className="flex gap-2.5">
                  <div className="text-indigo-600 font-black pt-0.5">•</div>
                  <div>
                    <strong className="text-slate-800 block font-bold">Desbalanceamento (sem SMOTE):</strong>
                    A base é 73.5% retenção vs 26.5% churn. O XGBoost campeão usa scale_pos_weight=1 e é avaliado por PR-AUC (0.966) e recall-churn (89.2%) — métricas honestas para classe desbalanceada, sem reamostragem sintética.
                  </div>
                </li>
              </ul>
            </div>

            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-[11px] leading-relaxed text-indigo-700 font-semibold space-y-1.5 shadow-sm">
              <p className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs">
                <CheckCircle size={14} /> Nota de Governança
              </p>
              <p className="opacity-90 leading-relaxed font-semibold">
                As importâncias são as do XGBoost campeão (feature_importances_, servidas via /model_card). Nenhuma feature foi removida: a auditoria de vazamento (teste de sensibilidade) mostrou que o modelo não depende de informação futura, garantindo segurança estatística sem sacrificar features legítimas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Dicionário de Variáveis e Snapshot de Tempo Zero */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="space-y-1">
          <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Database size={18} className="text-indigo-600" /> Dicionário do Modelo preditivo & Status de Validação
          </h4>
          <p className="text-xs text-slate-500 font-semibold">Características analisadas no Tempo Zero e blindagens regulatórias de Machine Learning.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4">Macro Categoria</th>
                <th className="py-3 px-4">Status de Uso</th>
                <th className="py-3 px-4">Descrição das Variáveis</th>
                <th className="py-3 px-4">Tratamento Realizado</th>
              </tr>
            </thead>
            <tbody>
              {variableSpecs.map((v, idx) => (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-xs font-medium">
                  <td className="py-4 px-4 font-bold text-slate-700">
                    <code>{v.name}</code>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                      {v.type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {v.status === 'valid' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                        Válida (Aprovada)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                        Bloqueada (Vazamento)
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-500 leading-normal max-w-xs scale-100">{v.desc}</td>
                  <td className="py-4 px-4 text-slate-500 italic max-w-xs">{v.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
