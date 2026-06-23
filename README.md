# Vitaliza Churn Hub — Artefato 2 (MBA Módulo 2 · Grupo G12)

App web que **serve um classificador XGBoost real** de churn de academia, com **SHAP por instância** e **explicação em linguagem natural** — não usa LLM para prever (a predição vem do `champion_xgboost.pkl` serializado).

- **Frontend:** React + Vite + Tailwind (esta raiz). Modo individual (simulador) e governança do modelo.
- **Backend:** FastAPI em [`backend/`](backend/) servindo o XGBoost + SHAP. Treino e inferência **separados**.

## Métricas reais (XGBoost campeão, holdout 800 amostras)

| Métrica | Valor |
|---|---|
| ROC-AUC (teste) | **0.983** |
| PR-AUC | 0.966 |
| F1 (churn) | 0.902 |
| Recall (churn) | 0.892 |
| Precisão (churn) | 0.913 |
| Acurácia | 0.949 |
| Matriz de confusão | `[[570, 18], [23, 189]]` |
| CV ROC-AUC (5-fold) | 0.982 → **sem sobreajuste** (gap vs teste +0.001) |
| Auditoria de vazamento | drop das 2 features temporais: 0.983 → 0.949 (**não colapsa**) |

## Cobertura do checklist (7 itens)

| # | Item | Onde |
|---|------|------|
| 1 | Modelo validado (prec/recall/F1/AUC + CM) | `GET /model_card`, `backend/models/metrics.json` |
| 2 | Sem vazamento de target | `backend/leakage_audit.py` → `models/leakage_audit.json` |
| 3 | Sem sobreajuste (CV) | bloco `overfit` em `/model_card` (CV 0.982 ~ teste 0.983) |
| 4 | SHAP por instância | `backend/shap_explainer.pkl` + `POST /predict` (`shap[]`) |
| 5 | Feature importance | `feature_importance` em `/model_card` |
| 6 | Explicação **+ recomendação** em linguagem natural (LLM) | `backend/explain.py` via **OpenRouter/DeepSeek** (SDK OpenAI), individual + lote. Requer `OPENROUTER_API_KEY`; rule-based é só fallback anti-crash. `/model_card` expõe `llm_enabled` |
| 7 | Serviço web lote+individual, treino÷inferência, joblib | `backend/train.py` ÷ `backend/inference.py` + `app.py` |

## Rodar localmente

**Backend**
```bash
cd backend
pip install -r requirements.txt
python train.py            # gera models/*.pkl (uma vez)
uvicorn app:app --reload --port 8000
```

**Frontend**
```bash
npm install
echo 'VITE_API_URL="http://localhost:8000"' > .env.local
npm run dev
```

## Deploy

- **Backend → Render** (web service): `render.yaml` na raiz (`rootDir: backend`, start `uvicorn app:app --host 0.0.0.0 --port $PORT`).
- **Frontend → GitHub Pages**: `npm run build` com `VITE_BASE=/<repo>/` e `VITE_API_URL=<url-do-render>`; publicar `dist/`.

**⚠️ Ressalvas (senão 100% das predições falham em produção):**
- `VITE_API_URL` **deve ser https** (a página do Pages é https; chamar http é bloqueado por *mixed-content*). Use a URL https do Render, sem barra final.
- No Render, setar `FRONTEND_ORIGIN = https://<user>.github.io` (**só scheme+host**, sem o path do repo e sem barra final) — senão o backend bloqueia por CORS.

## Arquitetura

```
[React/Vite] --POST /predict, /predict_batch--> [FastAPI]
  simulador / model specs                         ├─ champion_xgboost.pkl (Pipeline XGBoost, sem scaler)
                                                   ├─ shap_explainer.pkl (TreeExplainer, SHAP por instância)
                                                   ├─ explain.py (LLM via OpenRouter; rule-based = fallback)
                                                   └─ observability.py (agregados in-memory + OTLP opcional)
   <-- {churn_probability, risk, shap[], explicacao, recomendacao, fonte} --
```

## Observabilidade

`GET /observability` expõe agregados in-memory (sem segredos): saúde da API (latência p50/p95, erros, volume), modelo (distribuição de score, buckets de risco, **drift** das features vs baseline de treino) e LLM (chamadas, fallback, tokens). O frontend tem uma aba dedicada **Observabilidade** que faz polling desse endpoint.

Camada **gerenciada (opcional)**: setando `OTEL_EXPORTER_OTLP_ENDPOINT` + `OTEL_EXPORTER_OTLP_HEADERS` (Grafana Cloud OTLP), o backend exporta métricas via OpenTelemetry. O import é **guardado** atrás dessas envs — sem elas, nada de OTel é carregado (não pesa no free tier).

### Ligar o Grafana Cloud (opcional)

1. Conta free em [grafana.com](https://grafana.com) → seu stack → **Connections / OpenTelemetry (OTLP)**.
2. Copie o **OTLP endpoint** (ex.: `https://otlp-gateway-<region>.grafana.net/otlp`) e gere o token (instance ID + API token).
3. No Render → serviço → **Environment**, adicione:
   - `OTEL_EXPORTER_OTLP_ENDPOINT` = o endpoint OTLP
   - `OTEL_EXPORTER_OTLP_HEADERS` = `Authorization=Basic <base64(instanceID:token)>`
4. Salve (redeploy). Confirme em `…/observability` → `otlp_enabled: true` (a badge do dashboard vira "configurado"). As métricas (`churn_score`, `predict_latency_ms`, `predictions_total` por risco/fonte) passam a aparecer no Grafana.
