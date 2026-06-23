import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GLOSSARY } from '../../lib/glossary';

interface InfoTipProps {
  /** chave no glossário (GLOSSARY) — ou use `text` para conteúdo livre */
  term?: string;
  text?: string;
  /** lado em que o balão abre (default: acima) */
  side?: 'top' | 'bottom';
  /** alinhamento horizontal do balão p/ evitar overflow nas bordas */
  align?: 'center' | 'left' | 'right';
  /** 'dark' p/ usar sobre fundos escuros (ícone claro) */
  tone?: 'light' | 'dark';
  className?: string;
}

// Tooltip "(i)" leve e acessível: sem dependência, abre no hover E no foco (teclado),
// texto só sob demanda. aria-describedby liga o botão ao balão p/ leitor de tela.
export const InfoTip = ({ term, text, side = 'top', align = 'center', tone = 'light', className }: InfoTipProps) => {
  const content = text || (term && GLOSSARY[term]) || '';
  const tipId = React.useId();
  if (!content) return null;

  const pos = align === 'left'
    ? 'left-0'
    : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';
  const iconColor = tone === 'dark'
    ? 'text-slate-300 hover:text-white focus-visible:text-white'
    : 'text-slate-500 hover:text-indigo-600 focus-visible:text-indigo-600';

  return (
    <span className={cn('relative inline-flex group/infotip align-middle', className)}>
      <button
        type="button"
        aria-label={term ? `O que é: ${term}` : 'Ajuda'}
        aria-describedby={tipId}
        className={cn(
          'rounded-full transition-colors cursor-help focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
          iconColor,
        )}
      >
        <Info size={13} strokeWidth={2.5} />
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 w-56 max-w-[14rem] px-3 py-2 rounded-xl',
          'bg-slate-900 text-white text-[11px] font-medium leading-snug shadow-xl shadow-slate-900/20',
          'opacity-0 group-hover/infotip:opacity-100 group-focus-within/infotip:opacity-100',
          'transition-opacity duration-150 normal-case tracking-normal text-left',
          pos,
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {content}
      </span>
    </span>
  );
};
