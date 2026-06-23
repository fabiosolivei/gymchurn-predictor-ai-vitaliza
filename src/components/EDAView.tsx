import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, Cell, BarChart, Bar, ComposedChart, Line } from 'recharts';
import { cn } from '../lib/utils';
import { GlobalFilters } from '../App';

interface EDAViewProps {
  filters: GlobalFilters;
}

export const EDAView = ({ filters }: EDAViewProps) => {
  // Simulator factors
  const multiplier = filters.plan === '1' ? 1.5 : filters.plan === '12' ? 0.3 : 1;
  const locMult = filters.location === 'Away' ? 1.3 : 1;

  const SCATTER_DATA = Array.from({ length: 40 }).map((_, i) => ({
    total: Math.random() * 4,
    current: Math.random() * 4 * (i < 15 ? 0.4 : 1.1),
    churn: i < 15 ? 1 : 0
  }));

  const CORRELATION_DATA = [
    { feature: 'Contract_Period', correlation: -0.45 * multiplier, desc: 'Forte retenção por contrato longo.' },
    { feature: 'Lifetime', correlation: -0.42 * multiplier, desc: 'Retenção aumenta após o 4º mês.' },
    { feature: 'Age', correlation: -0.40, desc: 'Alunos mais velhos churnam menos.' },
    { feature: 'Avg_Freq_Month', correlation: -0.38, desc: 'Engajamento recente é preditivo.' },
    { feature: 'Group_Visits', correlation: -0.28, desc: 'Efeito social positivo.' },
    { feature: 'Near_Location', correlation: -0.15 * locMult, desc: 'Conveniência ajuda.' },
    { feature: 'Gender', correlation: 0.05, desc: 'Impacto irrelevante.' },
  ];

  const AGE_DIST = [
    { age: '18-22', count: 450, churn: 180 * multiplier },
    { age: '23-27', count: 1200, churn: 420 * multiplier },
    { age: '28-32', count: 1500, churn: 45 * multiplier },
    { age: '33-37', count: 600, churn: 10 * multiplier },
    { age: '38+', count: 250, churn: 2 * multiplier },
  ];

  const CONTRACT_DIST = [
    { name: '1 Mês', value: 45, churn: 40.4 * multiplier },
    { name: '6 Meses', value: 25, churn: 15.2 * multiplier },
    { name: '12 Meses', value: 30, churn: 2.3 * multiplier },
  ];

  const GENDER_IMPACT = [
    { gender: 'Male', churn: 27 * multiplier },
    { gender: 'Female', churn: 26 * multiplier },
  ];

  const SOCIAL_VIBE = [
    { group: 'Visitas em Grupo', churn: 15.4 * multiplier },
    { group: 'Aulas Individuais', churn: 33.2 * multiplier },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Pillar 1: Distribuições Univariadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Análise Univariada: Idade</h3>
          <p className="text-sm text-slate-500 mb-8">Distribuição de alunos por faixa etária e churn absoluto.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={AGE_DIST}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="age" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Total Alunos" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="churn" name="Cancelamentos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-4 italic">
            Insight: O churn é mais acentuado em alunos mais jovens, estabilizando após os 30 anos.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Pilar: Composição da Base por Plano</h3>
          <p className="text-sm text-slate-500 mb-8">Participação de cada plano e sua respectiva taxa de churn.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CONTRACT_DIST}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="churn" name="Taxa de Churn %" radius={[4, 4, 0, 0]}>
                  {CONTRACT_DIST.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.churn > 20 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pillar 2: Análise Relacional e Correlação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scatter Analysis */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Análise Bivariada: Engajamento</h3>
          <p className="text-sm text-slate-500 mb-8">Padrão visual de desengajamento (Freq. Mês vs Total).</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="number" dataKey="total" name="Freq Total" unit=" v/s" />
                <YAxis type="number" dataKey="current" name="Freq Mês" unit=" v/s" />
                <ZAxis type="number" range={[100, 100]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Clientes" data={SCATTER_DATA}>
                  {SCATTER_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.churn ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Correlation analysis */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Resumo de Correlações (Target: Churn)</h3>
          <p className="text-sm text-slate-500 mb-8">Identificação das variáveis mais relacionadas à evasão.</p>
          <div className="space-y-4">
            {CORRELATION_DATA.map((item, i) => (
              <div key={i} className="group">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">
                  <span>{item.feature}</span>
                  <span className={item.correlation < 0 ? 'text-emerald-500' : 'text-slate-400'}>{item.correlation.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      item.correlation < 0 ? 'bg-emerald-400' : 'bg-slate-300'
                    )}
                    style={{ width: `${Math.abs(item.correlation) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 hidden group-hover:block transition-all italic">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pillar 3: Análise de Segmento Adicional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Impacto de Gênero no Churn</h3>
          <p className="text-sm text-slate-500 mb-8">Verificando se há viés demográfico significativo.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={GENDER_IMPACT}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="gender" />
                <YAxis unit="%" />
                <Tooltip />
                <Bar dataKey="churn" name="Churn %" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-4 italic">
            Nota: Conforme verificado no EDA, o gênero não é um fator determinante para a retenção na Vitaliza.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Pilar: Engajamento Social</h3>
          <p className="text-sm text-slate-500 mb-8">Efeito das visitas em grupo vs aulas individuais.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SOCIAL_VIBE}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="group" />
                <YAxis unit="%" />
                <Tooltip />
                <Bar dataKey="churn" name="Taxa de Churn %" radius={[4, 4, 0, 0]}>
                  {SOCIAL_VIBE.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.churn > 20 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <h4 className="text-indigo-900 font-bold mb-2">Conclusão dos Pilares EDA</h4>
              <ul className="text-xs text-indigo-700 space-y-3 font-medium">
                <li className="flex gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1 flex-shrink-0" />
                   Segmento Crítico: Planos de 1 mês + Alunos abaixo de 27 anos.
                </li>
                <li className="flex gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1 flex-shrink-0" />
                   Fator Protetivo: Frequência semanal &gt; 3 vezes e matrícula em aulas de grupo.
                </li>
                <li className="flex gap-2">
                   <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1 flex-shrink-0" />
                   Alerta de Churn: Queda brusca na frequência mensal em relação à média histórica (Lifetime).
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
  );
}
