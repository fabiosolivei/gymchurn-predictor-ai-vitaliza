import { CustomerData, PredictionResult } from "../types";

// Backend FastAPI que serve o XGBoost REAL (champion_xgboost.pkl) + SHAP por instancia.
// Em producao, VITE_API_URL aponta para o servico no Render.
const API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

// Ordem/nomes EXATOS exigidos pelo modelo (feature_order do shap_meta.json).
// gender tem importancia ~0 no modelo; Male->1 / Female->0 (encoding consistente).
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
  return "High"; // Alto risco / Risco crítico
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
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Backend ${resp.status}: ${detail || "falha na predição"}`);
  }
  const r = (await resp.json()) as BackendPredict;

  // Normaliza o SHAP da instancia para [-1,1] (top driver = +-1) p/ o grafico de barras.
  const top = r.top.slice(0, 5);
  const maxAbs = Math.max(...top.map((c) => Math.abs(c.shap)), 1e-9);
  const recommendations = r.prescricao
    .replace(/^A[cç][õo]es sugeridas:\s*/i, "")
    .replace(/\.$/, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

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
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Backend ${resp.status}: ${detail || "falha no lote"}`);
  }
  return resp.json();
}

export async function getModelCard(): Promise<any> {
  const resp = await fetch(`${API}/model_card`);
  if (!resp.ok) throw new Error(`Backend ${resp.status}`);
  return resp.json();
}
