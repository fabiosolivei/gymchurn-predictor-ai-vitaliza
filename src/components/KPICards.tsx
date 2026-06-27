import React from 'react';
import { cn, formatCurrency, formatPercent } from '../lib/utils';
import { TrendingUp, TrendingDown, Users, DollarSign, Clock, Target, CreditCard, Activity } from 'lucide-react';
import { InfoTip } from './ui/InfoTip';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  icon: React.ElementType;
  className?: string;
  id?: string;
  tip?: string;
}

export const KPICard = ({ title, value, subtitle, trend, icon: Icon, className, tip }: KPICardProps) => (
  <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-indigo-100", className)}>
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">
        <Icon className="text-blue-600" size={24} />
      </div>
      {trend && (
        <span className={cn(
          "text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-full",
          trend.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {trend.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend.value}%
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">{title}{tip && <InfoTip term={tip} align="right" />}</h3>
    <div className="flex items-baseline gap-2 mt-1">
      <span className="text-2xl font-black text-slate-900">{value}</span>
      {subtitle && <span className="text-xs text-slate-400 font-medium">{subtitle}</span>}
    </div>
  </div>
);

import { GlobalFilters } from '../App';

interface DashboardGridProps {
  searchQuery?: string;
  filters: GlobalFilters;
}

export const DashboardGrid = ({ searchQuery = '', filters }: DashboardGridProps) => {
  // Simulator logic
  const multiplier = filters.plan === '1' ? 1.4 : filters.plan === '12' ? 0.4 : 1;
  const churnBase = 26.5 * multiplier;
  const activeBase = Math.floor(2938 / multiplier);
  const mrrBase = 284000 * (filters.plan === '12' ? 1.2 : 0.8);

  const cards = [
    { id: 'churn', title: "Taxa de Churn", value: formatPercent(churnBase), trend: { value: 2.1 * multiplier, isPositive: filters.plan === '12' }, icon: Target },
    { id: 'active', title: "Clientes Ativos", value: activeBase.toLocaleString(), subtitle: "/ 4.000 total", icon: Users },
    { id: 'ltv', title: "LTV Médio", value: formatCurrency(1245 / multiplier), trend: { value: 5.4, isPositive: filters.plan === '12' }, icon: DollarSign, tip: 'ltv' },
    { id: 'retention', title: "Retenção Geral", value: formatPercent(100 - churnBase), icon: Clock },
    { id: 'mrr', title: "MRR Estimado", value: formatCurrency(mrrBase), trend: { value: 1.2, isPositive: true }, icon: CreditCard },
    { id: 'cac', title: "CAC Estimado", value: formatCurrency(150 * multiplier), icon: Activity },
    { id: 'ltv_cac', title: "Rel. LTV/CAC", value: (8.3 / multiplier).toFixed(1) + "x", subtitle: "Ideal > 3x", icon: TrendingUp, tip: 'ltv_cac' },
    { id: 'revenue', title: "Receita Recorrente", value: formatCurrency(mrrBase / 1000000).replace('R$', '') + 'M', icon: DollarSign },
  ];

  const filteredCards = cards.filter(card => 
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.value.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {filteredCards.map((card) => (
        <KPICard key={card.id} {...card} />
      ))}
      {filteredCards.length === 0 && (
        <div className="col-span-full py-12 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-2xl">
          Nenhuma métrica encontrada para "{searchQuery}"
        </div>
      )}
    </div>
  );
}
