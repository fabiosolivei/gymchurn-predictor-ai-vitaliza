import React, { useState } from 'react';
import { predictBatch } from '../services/mlModelService';
import { UploadCloud, Sparkles, AlertTriangle, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface BatchResult {
  n: number;
  em_risco: number;
  distribuicao: Record<string, number>;
  resumo: string;
  recomendacao_agregada: string;
  fonte: string;
  rows: any[];
}

export const BulkUploadForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setError(null);
    try {
      const r = await predictBatch(file);
      setResult(r as BatchResult);
    } catch (err: any) {
      setError(err?.message || 'Falha ao processar o lote.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!result) return;
    const rows = result.rows;
    const cols = Object.keys(rows[0] || {});
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'predicoes_lote.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="bg-indigo-600 p-3 rounded-2xl"><UploadCloud className="text-white" size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Predição em Lote (Caso A)</h2>
            <p className="text-sm text-slate-500">Suba um CSV com as 13 features → score + SHAP por linha + recomendação estratégica da base.</p>
          </div>
        </div>
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl p-8 cursor-pointer hover:border-indigo-300 transition-all">
          <UploadCloud size={28} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600">{file ? file.name : 'Escolher arquivo CSV'}</span>
          <input type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <button type="submit" disabled={!file || loading}
          className={cn("w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2",
            (!file || loading) ? "bg-slate-300 pointer-events-none" : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-indigo-200 shadow-lg")}>
          {loading ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processando lote...</>) : 'Analisar Lote'}
        </button>
      </form>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} />{error}</div>}

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[['Clientes', result.n], ['Em risco', result.em_risco], ['% em risco', `${result.n ? Math.round(100 * result.em_risco / result.n) : 0}%`]].map(([k, v]) => (
              <div key={k as string} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
                <div className="text-2xl font-black text-slate-900">{v as any}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{k as string}</div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-6 rounded-3xl border border-indigo-100">
            <h4 className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">
              <Sparkles size={14} /> Recomendação estratégica da base ({result.fonte.startsWith('llm') ? 'IA / LLM' : 'regras'})
            </h4>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">{result.recomendacao_agregada}</p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Predições ({result.rows.length} linhas)</h4>
              <button onClick={downloadCsv} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"><Download size={14} /> Baixar CSV</button>
            </div>
            <div className="overflow-auto max-h-96 text-sm">
              <table className="w-full">
                <thead className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                  <tr><th className="text-left p-2">Prob.</th><th className="text-left p-2">Risco</th><th className="text-left p-2">Top fatores (SHAP)</th></tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="p-2 font-mono font-bold">{(r.pred_churn_probability * 100).toFixed(0)}%</td>
                      <td className="p-2"><span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                        r.pred_churn_probability >= 0.5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600')}>{r.pred_risk_bucket}</span></td>
                      <td className="p-2 text-[11px] text-slate-500 font-mono">{r.pred_top_drivers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
