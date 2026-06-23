import React from 'react';
import { PredictionResult } from '../types';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle, Info, ArrowRightCircle, Target } from 'lucide-react';
import { cn } from '../lib/utils';

interface PredictionDisplayProps {
  result: PredictionResult;
}

export const PredictionDisplay = ({ result }: PredictionDisplayProps) => {
  const percentage = Math.round(result.churnProbability * 100);
  
  const getStatusColor = () => {
    if (result.riskCategory === 'High') return 'text-rose-600 bg-rose-50 border-rose-100';
    if (result.riskCategory === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  };

  const Icon = result.riskCategory === 'High' ? AlertTriangle : result.riskCategory === 'Medium' ? Info : CheckCircle;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className={cn("p-8 rounded-3xl border-2 shadow-sm", getStatusColor().split(' ').slice(1).join(' '))}>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="opacity-10" />
              <circle 
                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={364} strokeDashoffset={364 - (364 * percentage) / 100}
                strokeLinecap="round" className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black">{percentage}%</span>
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Risco</span>
            </div>
          </div>

          <div className="flex-1 space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <Icon size={24} />
              <h3 className="text-xl font-black">Risco {result.riskCategory === 'High' ? 'Crítico' : result.riskCategory === 'Medium' ? 'Moderado' : 'Controlado'}</h3>
            </div>
            <p className="text-sm font-medium leading-relaxed opacity-80">
              {result.interpretation}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
          <ArrowRightCircle size={14} className="text-indigo-600" /> Ações Recomendadas
        </h4>
        <div className="grid grid-cols-1 gap-3">
          {result.recommendations.map((rec, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold text-slate-700">
              <div className="w-2 h-2 bg-indigo-500 rounded-full" />
              {rec}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
          <Target size={14} className="text-indigo-600" /> Fatores deste cliente (SHAP normalizado)
        </h4>
        <div className="space-y-3">
          {result.featureImportance.slice(0, 4).map((fi, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                <span>{fi.feature}</span>
                <span className={fi.impact > 0 ? 'text-rose-500' : 'text-emerald-500'}>
                  {fi.impact > 0 ? '↑ aumenta risco' : '↓ reduz risco'} · peso {(Math.abs(fi.impact) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-1000", fi.impact > 0 ? 'bg-rose-500' : 'bg-emerald-500')}
                  style={{ width: `${Math.abs(fi.impact) * 100}%`, marginLeft: fi.impact < 0 ? '0' : '0' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
