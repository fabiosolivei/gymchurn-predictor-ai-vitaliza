/**
 * DEPRECATED — esta versão "simulava" o churn via Gemini.
 * O Artefato 2 passou a servir o modelo REAL (XGBoost serializado) pelo backend FastAPI.
 * Use predictChurn() de ./mlModelService. Mantido apenas como referência histórica.
 */
import { CustomerData, PredictionResult } from "../types";
import { predictChurn } from "./mlModelService";

export async function predictChurnVitaliza(data: CustomerData): Promise<PredictionResult> {
  // Redireciona para o modelo real (não usa mais LLM para prever).
  return predictChurn(data);
}
