import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { GlobalFilters } from '../App';

interface ExecutiveChartsProps {
  filters: GlobalFilters;
}

const SOCIAL_IMPACT = [
  { name: 'Individual', rate: 33 },
  { name: 'Parceria Corp.', rate: 18 },
  { name: 'Promoção Amigo', rate: 13 },
  { name: 'Aulas Grupo', rate: 15.4 },
];

export const ExecutiveCharts = ({ filters }: ExecutiveChartsProps) => {
  // Simulate data adjustment based on filters
  const multiplier = filters.plan === '1' ? 1.5 : filters.plan === '12' ? 0.3 : 1;
  const genderAdj = filters.gender === 'Female' ? 0.9 : 1.1;

  const CHURN_BY_CONTRACT = [
    { name: '1 Mês', churn: 40 * multiplier * genderAdj },
    { name: '6 Meses', churn: 15 * multiplier * genderAdj },
    { name: '12 Meses', churn: 2 * multiplier * genderAdj },
  ];

  const CHURN_BY_LIFETIME = Array.from({ length: 12 }).map((_, i) => ({
    month: i + 1,
    rate: Math.max(2, (50 / (i + 1)) * multiplier * genderAdj)
  }));

  const CHURN_BY_AGE = [
    { range: '18-25', rate: 35 * multiplier, color: '#f87171' },
    { range: '26-30', rate: 28 * multiplier, color: '#f87171' },
    { range: '31-35', rate: 10 * multiplier, color: '#3b82f6' },
    { range: '36-40', rate: 5 * multiplier, color: '#3b82f6' },
    { range: '41+', rate: 1 * multiplier, color: '#10b981' },
  ];

  return (
    <div className="space-y-6 mt-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Churn por Contrato */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
          Churn por Tipo de Contrato (%)
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">Contratual</span>
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CHURN_BY_CONTRACT}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="churn" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Churn %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Curva de Sobrevivência */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
          Probabilidade de Churn vs. Lifetime
          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-widest">Barreira de Hábito</span>
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={CHURN_BY_LIFETIME}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" label={{ value: 'Meses de Assinatura', position: 'insideBottom', offset: -5, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} unit="%" />
              <Tooltip />
              <Area type="monotone" dataKey="rate" stroke="#ef4444" fillOpacity={1} fill="url(#colorRate)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Churn por Idade */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
          Churn por Faixa Etária (%)
          <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-widest">Demográfico</span>
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CHURN_BY_AGE} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="range" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {CHURN_BY_AGE.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-4 italic">
          Conclusão EDA: Alunos abaixo de 30 anos possuem rotinas mais instáveis, resultando em churn 3x superior ao público sênior.
        </p>
      </div>

      {/* Impacto Social */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
          Efeito dos Vínculos Sociais no Churn (%)
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-widest">Comportamental</span>
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SOCIAL_IMPACT} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} unit="%" />
              <Tooltip />
              <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-4 italic">
          A "cobrança social" de treinar com amigos ou em grupo é o maior fator de retenção emocional.
        </p>
      </div>
    </div>
  </div>
  );
};
