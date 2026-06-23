import React, { useState } from 'react';
import { CustomerData } from '../types';
import { User, MapPin, Users, Phone, Calendar, Dumbbell, Wallet, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface SimulatorFormProps {
  onPredict: (data: CustomerData) => void;
  isLoading: boolean;
}

const INITIAL_DATA: CustomerData = {
  gender: 'Female',
  age: 28,
  nearLocation: true,
  partner: false,
  promoFriends: false,
  phone: true,
  contractPeriod: 1,
  groupVisits: false,
  avgAdditionalCharges: 100,
  monthToEndContract: 1,
  lifetime: 2,
  avgFrequencyTotal: 1.5,
  avgFrequencyCurrentMonth: 0.8,
};

export const SimulatorForm = ({ onPredict, isLoading }: SimulatorFormProps) => {
  const [formData, setFormData] = useState<CustomerData>(INITIAL_DATA);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPredict(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-8">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="bg-indigo-600 p-3 rounded-2xl">
          <Sparkles className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Configuração de Perfil</h2>
          <p className="text-sm text-slate-500">Defina os parâmetros do usuário para simulação.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
        {/* Bio */}
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Dados Demográficos</span>
            <div className="space-y-3">
              <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200">
                {(['Male', 'Female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={cn(
                      "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                      formData.gender === g ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {g === 'Male' ? 'Homem' : 'Mulher'}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">Idade</span>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: Number(e.target.value)})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </label>
        </div>

        {/* Engagement */}
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Uso e Frequência</span>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">Freq. Semanal (Total)</span>
                <input 
                  type="number" step="0.1" 
                  value={formData.avgFrequencyTotal}
                  onChange={(e) => setFormData({...formData, avgFrequencyTotal: Number(e.target.value)})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">Freq. Semanal (Mês Atual)</span>
                <input
                  type="number" step="0.1"
                  value={formData.avgFrequencyCurrentMonth}
                  onChange={(e) => setFormData({...formData, avgFrequencyCurrentMonth: Number(e.target.value)})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 leading-normal">
                  Usada pelo modelo XGBoost real. A auditoria de vazamento mostrou que removê-la derruba o ROC-AUC só de 0.983 para 0.949 — o modelo não depende dela de forma determinística (é estado observável no momento da inferência).
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Contract */}
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Dados Contratuais</span>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">Tipo de Contrato (Meses)</span>
                <select 
                  value={formData.contractPeriod}
                  onChange={(e) => setFormData({...formData, contractPeriod: Number(e.target.value) as any})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value={1}>Mensal (1 Mês)</option>
                  <option value={6}>Semestral (6 Meses)</option>
                  <option value={12}>Anual (12 Meses)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">Meses de Assinatura (Lifetime)</span>
                <input 
                  type="number"
                  value={formData.lifetime}
                  onChange={(e) => setFormData({...formData, lifetime: Number(e.target.value)})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: 'Perto Academia', key: 'nearLocation', icon: MapPin },
          { label: 'Empresa Parceira', key: 'partner', icon: Users },
          { label: 'Indicação Amigo', key: 'promoFriends', icon: Users },
          { label: 'Aulas Grupo', key: 'groupVisits', icon: Dumbbell },
          { label: 'Telefone OK', key: 'phone', icon: Phone },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFormData({ ...formData, [item.key]: !formData[item.key as keyof CustomerData] })}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-center",
              formData[item.key as keyof CustomerData] 
                ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
            )}
          >
            <item.icon size={18} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </div>

      <button 
        type="submit"
        disabled={isLoading}
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-white transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2",
          isLoading ? "bg-slate-300 pointer-events-none" : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-indigo-200 shadow-transparent"
        )}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processando Predição...
          </>
        ) : (
          <>Prever Probabilidade de Churn</>
        )}
      </button>
    </form>
  );
}
