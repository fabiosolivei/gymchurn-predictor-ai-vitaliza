import React from 'react';
import { InfoTip } from './InfoTip';

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  /** uma frase: o que esta tela responde / o que dá pra fazer aqui */
  purpose: string;
  /** termo do glossário p/ um (i) opcional ao lado do propósito */
  tipTerm?: string;
  /** conteúdo à direita (badge, botão) */
  action?: React.ReactNode;
}

// Cabeçalho padronizado das seções: ícone + título + 1 frase de propósito (+ (i) opcional).
// Mesma linguagem visual em todas as abas -> coesão e auto-explicação sem poluir.
export const SectionHeader = ({ icon: Icon, title, purpose, tipTerm, action }: SectionHeaderProps) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex items-start gap-3">
      <div className="bg-indigo-50 p-2.5 rounded-2xl mt-1 shrink-0">
        <Icon size={20} className="text-indigo-600" />
      </div>
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">{title}</h2>
        <p className="text-slate-500 font-medium text-sm mt-0.5 flex items-center gap-1.5">
          <span>{purpose}</span>
          {tipTerm && <InfoTip term={tipTerm} />}
        </p>
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
