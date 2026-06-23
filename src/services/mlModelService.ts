import { CustomerData, PredictionResult } from "../types";

// Backend FastAPI que serve o XGBoost REAL (champion_xgboost.pkl) + SHAP por instancia.
// Em producao, VITE_API_URL aponta para o servico no Render (DEVE ser https).
const API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

// Guarda anti mixed-content: pagina https chamando backend http -> o browser bloqueia.
if (typeof location !== "undefined" && location.protocol === "https:" && API.startsWith("http:")) {
  // eslint-disable-next-line no-console
  console.error(
    "[config] VITE_API_URL precisa ser https em produção — chamadas http serão bloqueadas por mixed-content:",
    API
  );
}

function toFeatures(d: CustomerData): Record<string, number> {
  return {
    gender: d.gender === "Male" ? 1 : 0,
    Near_Location: d.nearLocation ? 1 : 0,
    Partner: d.partner ? 1 : 0,
    Promo_friends: d.promoFriends ? 1 : 0,
    Phone: d.phone ? 1 : 0,
    Contract_period: d.contractPeriod,
    Group_visits: d.groupVisits ? 1 : 0,
    Age: d.age,
    Avg_additional_charges_total: d.avgAdditionalCharges,
    Month_to_end_contract: d.monthToEndContract,
    Lifetime: d.lifetime,
    Avg_class_frequency_total: d.avgFrequencyTotal,
    Avg_class_frequency_current_month: d.avgFrequencyCurrentMonth,
  };
}

const FRIENDLY: Record<string, string> = {
  Lifetime: "Tempo de casa",
  Contract_period: "Tipo de contrato",
  Month_to_end_contract: "Meses p/ fim do contrato",
  Avg_class_frequency_total: "Frequência histórica",
  Avg_class_frequency_current_month: "Frequência mês atual",
  Group_visits: "Aulas em grupo",
  Partner: "Empresa parceira",
  Promo_friends: "Indicação de amigo",
  Near_Location: "Proximidade",
  Age: "Idade",
  Avg_additional_charges_total: "Gastos adicionais",
  Phone: "Telefone",
  gender: "Gênero",
};

function mapRisk(risk: string): "Low" | "Medium" | "High" {
  if (risk.includes("Baixo")) return "Low";
  if (risk.includes("moderado")) return "Medium";
  return "High";
}

// Extrai mensagem legível de um erro do FastAPI (detail pode ser string OU array Pydantic).
async function errMsg(resp: Response): Promise<string> {
  const body = await resp.json().catch(() => null as any);
  const d = body?.detail;
  if (Array.isArray(d)) return d.map((x) => `${x.loc?.at?.(-1) ?? "campo"}: ${x.msg}`).join("; ");
  if (typeof d === "string") return d;
  return `falha ${resp.status}`;
}

interface BackendPredict {
  churn_probability: number;
  risk: string;
  base_value: number;
  top: { feature: string; value: number; shap: number; direction: string }[];
  explicacao: string;
  prescricao: string;
  fonte: string;
}

export async function predictChurn(data: CustomerData): Promise<PredictionResult> {
  const resp = await fetch(`${API}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toFeatures(data)),
  });
  if (!resp.ok) throw new Error(await errMsg(resp));
  const r = (await resp.json()) as BackendPredict;

  // Normaliza o SHAP da instancia (log-odds) para [-1,1] APENAS para o tamanho da barra.
  // O texto NAO afirma "% de churn" — e peso relativo do fator (ver PredictionDisplay).
  const top = r.top.slice(0, 5);
  const maxAbs = Math.max(...top.map((c) => Math.abs(c.shap)), 1e-9);

  // Rule-based vem como "Acoes sugeridas: a; b; c"; LLM vem como texto livre (sem ';').
  const cleaned = r.prescricao.replace(/^A[cç][õo]es sugeridas:\s*/i, "").replace(/\.$/, "");
  const parts = r.fonte?.startsWith("llm")
    ? cleaned.split(/(?<=[.!?])\s+/)
    : cleaned.split(";");
  const recommendations = parts.map((s) => s.trim()).filter(Boolean);

  return {
    churnProbability: r.churn_probability,
    riskCategory: mapRisk(r.risk),
    interpretation: r.explicacao,
    recommendations: recommendations.length ? recommendations : [r.prescricao],
    featureImportance: top.map((c) => ({
      feature: FRIENDLY[c.feature] || c.feature,
      impact: c.shap / maxAbs,
    })),
  };
}

export async function predictBatch(file: File): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  const resp = await fetch(`${API}/predict_batch`, { method: "POST", body: fd });
  if (!resp.ok) throw new Error(await errMsg(resp));
  return resp.json();
}

export async function getModelCard(): Promise<any> {
  const resp = await fetch(`${API}/model_card`);
  if (!resp.ok) throw new Error(`Backend ${resp.status}`);
  return resp.json();
}
