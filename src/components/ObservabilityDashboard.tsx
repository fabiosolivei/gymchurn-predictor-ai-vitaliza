import React, { useEffect, useState } from 'react';
import { getObservability } from '../services/mlModelService';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  Activity, Gauge, AlertTriangle, Cpu, Database, RefreshCw, Cloud, CloudOff,
  TrendingUp, Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { InfoTip } from './ui/InfoTip';

interface Snapshot {
  uptime_s: number;
  window_size: number;
  totals: { predictions: number; batches: number; batch_rows: number; errors: number; scored_total: number };
  latency_ms: { p50: number; p95: number; max: number };
  score: { hist: number[]; mean: number };
  risk_distribution: Record<string, number>;
  llm: { calls: number; fallback: number; fallback_rate: number; tokens: Record<string, number> };
  drift: { feature: string; baseline_mean: number; window_mean: number; z: number; drift: boolean }[];
  otlp_enabled: boolean;
}

const POLL_MS = 5000;
const HIST_LABELS = ['0–10', '10–20', '20–30', '30–40', '40–50', '50–60', '60–70', '70–80', '80–90', '90–100'];
const RISK_COLORS: Record<string, string> = {       // alinhado aos buckets do inference.py
  'Risco crítico': '#e74c3c', 'Alto risco': '#e67e22', 'Risco moderado': '#f39c12',
  'Baixo risco': '#2ecc71', 'lote': '#6366f1',
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white p-6 rounded-3xl shadow-sm border border-slate-100', className)}>{children}</div>
);

// classes LITERAIS (Tailwind nao gera classes interpoladas dinamicamente)
const TONES: Record<string, { bg: string; text: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

const Stat = ({ icon: Icon, label, value, sub, tone = 'indigo', tip }: any) => {
  const t = TONES[tone] || TONES.indigo;
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            {label}{tip && <InfoTip term={tip} />}
          </p>
          <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs font-bold text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={cn('p-2 rounded-xl', t.bg)}>
          <Icon size={18} className={t.text} />
        </div>
      </div>
    </Card>
  );
};

const SectionTitle = ({ icon: Icon, children, tip }: any) => (
  <h3 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
    <Icon size={14} className="text-indigo-600" /> {children}{tip && <InfoTip term={tip} />}
  </h3>
);

export const ObservabilityDashboard = () => {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    try {
      const d = await getObservability();
      setData(d);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e: any) {
      setError(e?.message || 'Falha ao buscar /observability');
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  if (error && !data) {
    return (
      <Card className="text-rose-700 bg-rose-50 border-rose-200">
        <p className="font-bold text-sm">Não consegui ler a observabilidade: {error}</p>
        <p className="text-xs mt-1">O backend está no ar (VITE_API_URL)?</p>
      </Card>
    );
  }
  if (!data) return <Card><p className="text-slate-400 font-bold text-sm">Carregando observabilidade…</p></Card>;

  const noTraffic = data.totals.scored_total === 0;
  const histData = data.score.hist.map((c, i) => ({ faixa: HIST_LABELS[i], n: c }));
  const riskData = Object.entries(data.risk_distribution).map(([name, value]) => ({ name, value }));
  const uptimeMin = Math.floor(data.uptime_s / 60);

  return (
    <div className="space-y-8">
      {/* status bar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn('flex items-center gap-2 text-xs font-black px-3 py-1.5 rounded-full',
          data.otlp_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
          {data.otlp_enabled ? <Cloud size={13} /> : <CloudOff size={13} />}
          {data.otlp_enabled ? 'Grafana Cloud (OTLP) configurado' : 'OTLP desligado — métricas in-memory'}
          <InfoTip term="otlp" />
        </span>
        <span className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <RefreshCw size={12} /> atualiza a cada {POLL_MS / 1000}s
          {updatedAt && ` · ${updatedAt.toLocaleTimeString()}`}
        </span>
        <span className="text-xs font-bold text-slate-400">uptime {uptimeMin}min · janela {data.window_size}</span>
      </div>

      {noTraffic && (
        <Card className="bg-indigo-50 border-indigo-100">
          <p className="text-sm font-bold text-indigo-700">Sem tráfego ainda.</p>
          <p className="text-xs text-indigo-600 mt-1">
            Use o <b>Simulador Preditivo</b> ou a <b>Análise em Lote</b> e os gráficos populam aqui em tempo real.
          </p>
        </Card>
      )}

      {/* SAUDE DA API */}
      <div>
        <SectionTitle icon={Activity}>Saúde da API</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Cpu} label="Predições" value={data.totals.predictions}
            sub={`${data.totals.batches} lote(s) · ${data.totals.batch_rows} linhas`} tone="indigo" />
          <Stat icon={Database} label="Total avaliado" value={data.totals.scored_total} sub="individual + lote" tone="violet" />
          <Stat icon={Gauge} label="Latência p50 / p95" value={`${data.latency_ms.p50}ms`}
            sub={`p95 ${data.latency_ms.p95}ms · max ${data.latency_ms.max}ms`} tone="sky" tip="p50_p95" />
          <Stat icon={AlertTriangle} label="Erros" value={data.totals.errors}
            sub={data.totals.errors === 0 ? 'nenhum' : 'verificar logs'} tone={data.totals.errors ? 'rose' : 'emerald'} />
        </div>
      </div>

      {/* MODELO */}
      <div>
        <SectionTitle icon={TrendingUp}>Modelo — distribuição de score e risco</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-black text-slate-700">Distribuição de probabilidade de churn</p>
              <p className="text-xs font-bold text-slate-400">score médio (individual): {data.score.mean}</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="faixa" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 12, fontSize: 12, fontWeight: 700 }} />
                  <Bar dataKey="n" radius={[6, 6, 0, 0]}>
                    {histData.map((_, i) => (
                      <Cell key={i} fill={i >= 5 ? '#e11d48' : i >= 3 ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">faixa de risco (%) · histórico acumulado — verde baixo, âmbar médio, vermelho alto</p>
          </Card>
          <Card>
            <p className="text-sm font-black text-slate-700 mb-2">Buckets de risco</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={42}>
                    {riskData.map((d, i) => <Cell key={i} fill={RISK_COLORS[d.name] || '#64748b'} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* DRIFT */}
      <div>
        <SectionTitle icon={TrendingUp} tip="drift">Drift das features (janela vs baseline de treino)</SectionTitle>
        <Card>
          {data.drift.length === 0 ? (
            <p className="text-xs font-bold text-slate-400">Sem dados de feature ainda (use o Simulador).</p>
          ) : (
            <div className="space-y-2">
              {data.drift.map((d) => {
                const mag = Math.min(100, Math.abs(d.z) * 40);
                return (
                  <div key={d.feature} className="grid grid-cols-12 items-center gap-2 text-xs">
                    <span className="col-span-4 font-bold text-slate-600 truncate">{d.feature}</span>
                    <span className="col-span-2 text-slate-400 font-medium">base {d.baseline_mean}</span>
                    <span className="col-span-2 text-slate-700 font-bold">atual {d.window_mean}</span>
                    <div className="col-span-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', d.drift ? 'bg-rose-500' : 'bg-indigo-400')}
                        style={{ width: `${mag}%` }} />
                    </div>
                    <span className={cn('col-span-1 font-black text-right', d.drift ? 'text-rose-600' : 'text-slate-400')}>
                      z={d.z}
                    </span>
                  </div>
                );
              })}
              <p className="text-[10px] text-slate-400 font-medium pt-1">|z| &gt; 1 (vermelho) sinaliza desvio relevante da média de treino.</p>
            </div>
          )}
        </Card>
      </div>

      {/* LLM */}
      <div>
        <SectionTitle icon={Sparkles}>LLM (explicação + recomendação)</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Sparkles} label="Chamadas LLM" value={data.llm.calls} tone="indigo" />
          <Stat icon={CloudOff} label="Fallback (regras)" value={data.llm.fallback}
            sub={`${data.llm.fallback_rate}% das gerações`} tone={data.llm.fallback_rate > 50 ? 'amber' : 'emerald'} tip="fallback" />
          <Stat icon={Cpu} label="Tokens (total)" value={data.llm.tokens?.total ?? 0}
            sub={`in ${data.llm.tokens?.prompt ?? 0} · out ${data.llm.tokens?.completion ?? 0}`} tone="violet" />
          <Stat icon={Cloud} label="Export gerenciado" value={data.otlp_enabled ? 'ON' : 'OFF'}
            sub="Grafana Cloud (OTLP)" tone={data.otlp_enabled ? 'emerald' : 'slate'} />
        </div>
        {data.llm.fallback_rate === 100 && data.llm.fallback > 0 && (
          <p className="text-xs font-bold text-amber-600 mt-3">
            ⚠️ 100% em fallback rule-based — confirme <code>OPENROUTER_API_KEY</code> no Render (item 6 exige LLM).
          </p>
        )}
      </div>
    </div>
  );
};
