"""
Artefato 2 — Serviço web (FastAPI) que serve o MODELO REAL (item 7)
====================================================================

POST /predict        -> 1 cliente: probabilidade + SHAP por instancia + explicacao
POST /predict_batch  -> CSV (lote): linhas scored COM SHAP/explicacao + resumo
GET  /model_card     -> metricas reais + overfit (item 3) + importancia (item 5)
GET  /health         -> status

Hardening (security review): rate-limit por IP, cap de linhas no lote, parse so das
colunas necessarias, /health enxuto, exception handler sem traceback, CORS por lista.
Rodar (Render): uvicorn app:app --host 0.0.0.0 --port $PORT
"""

from __future__ import annotations

import io
import json
import logging
import os
import time
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

import explain as explain_mod
import inference as inf
import observability as obs

log = logging.getLogger("vitaliza-api")
ROOT = Path(__file__).resolve().parent
MAX_CSV_BYTES = 2_000_000      # 2MB
MAX_ROWS = 2000                # cap antes do SHAP (evita OOM/DoS no free tier)

app = FastAPI(title="Vitaliza Churn API", version="1.2",
              description="Serve o XGBoost serializado (NAO LLM) + SHAP por instancia.")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Origens liberadas por padrao (Pages do grupo + dev local). Pode sobrescrever via
# FRONTEND_ORIGIN (lista separada por virgula) — mas ja funciona sem setar nada.
_DEFAULT_ORIGINS = "https://fabiosolivei.github.io,http://localhost:5173,http://localhost:3000"
_origins = [o.strip() for o in os.environ.get("FRONTEND_ORIGIN", _DEFAULT_ORIGINS).split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=_origins,
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

MODEL, EXPLAINER, META = inf.load_artifacts()
FEATURE_ORDER = META["feature_order"]
_USECOLS = set(FEATURE_ORDER) | {"Churn"}

# baseline de treino (media/desvio das features) p/ o drift — computado 1x no startup
try:
    _train = pd.read_csv(ROOT / "data" / "gym_churn_us.csv", usecols=lambda c: c in set(FEATURE_ORDER))
    obs.set_baseline({f: {"mean": float(_train[f].mean()), "std": float(_train[f].std())}
                      for f in FEATURE_ORDER if f in _train.columns})
except Exception:
    log.warning("baseline de drift indisponivel (dataset de treino ausente)")
obs.init_otlp()   # liga export OTLP -> Grafana Cloud SE OTEL_EXPORTER_OTLP_ENDPOINT existir


class CustomerFeatures(BaseModel):
    """13 features na escala do dataset (binarias 0/1)."""
    gender: int = Field(ge=0, le=1)
    Near_Location: int = Field(ge=0, le=1)
    Partner: int = Field(ge=0, le=1)
    Promo_friends: int = Field(ge=0, le=1)
    Phone: int = Field(ge=0, le=1)
    Contract_period: float = Field(ge=0)
    Group_visits: int = Field(ge=0, le=1)
    Age: float = Field(ge=0, le=120)
    Avg_additional_charges_total: float = Field(ge=0)
    Month_to_end_contract: float = Field(ge=0)
    Lifetime: float = Field(ge=0)
    Avg_class_frequency_total: float = Field(ge=0)
    Avg_class_frequency_current_month: float = Field(ge=0)


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception):
    obs.record_error(request.url.path)
    log.exception("erro interno em %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Erro interno no servico."})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/observability")
@limiter.limit("30/minute")
def observability(request: Request):
    """Agregados in-memory p/ o dashboard dedicado (sem segredos): saude da API,
    distribuicao de score/risco, drift das features e uso do LLM."""
    return obs.snapshot()


@app.get("/model_card")
def model_card():
    metrics = json.loads((ROOT / "models" / "metrics.json").read_text(encoding="utf-8"))
    xgb = metrics.get("models", {}).get("xgboost", {})
    cv = float(xgb.get("best_cv_roc_auc", 0))
    test = float(xgb.get("roc_auc", 0))
    gap = round(test - cv, 4)
    overfit = {"cv_roc_auc": round(cv, 4), "test_roc_auc": round(test, 4), "gap": gap,
               "overfit_flag": abs(gap) > 0.03,
               "conclusao": f"CV {cv:.4f} ~ teste {test:.4f} (gap {gap:+.4f}) -> sem sobreajuste"}
    clf = inf.get_clf(MODEL)
    imp = sorted(
        ({"feature": f, "importance": round(float(v), 4)}
         for f, v in zip(FEATURE_ORDER, np.ravel(getattr(clf, "feature_importances_", [])))),
        key=lambda d: d["importance"], reverse=True)
    leak_path = ROOT / "models" / "leakage_audit.json"
    leakage = json.loads(leak_path.read_text(encoding="utf-8")) if leak_path.exists() else None
    return {"meta": META, "metrics": metrics, "overfit": overfit,
            "feature_importance": imp, "leakage_audit": leakage,
            "llm_enabled": bool(os.environ.get("OPENROUTER_API_KEY"))}


@app.post("/predict")
@limiter.limit("60/minute")
def predict(request: Request, payload: CustomerFeatures):
    """Validacao Pydantic -> 422 automatico em tipo/faixa invalidos."""
    t0 = time.perf_counter()
    try:
        feats = payload.model_dump()
        result = inf.shap_one(MODEL, EXPLAINER, META, feats)
        expl = explain_mod.explain(result)
        usage = expl.pop("_usage", None)
        obs.record_prediction(result["churn_probability"], result["risk"],
                              (time.perf_counter() - t0) * 1000.0, expl["fonte"],
                              features=feats, source="individual")
        obs.record_llm_tokens(usage)
        return {**result, **expl}
    except (ValueError, AssertionError) as e:
        raise HTTPException(status_code=422, detail=str(e))


@app.post("/predict_batch")
@limiter.limit("10/minute")
async def predict_batch(request: Request, file: UploadFile = File(...)):
    raw = await file.read()
    t0 = time.perf_counter()
    if len(raw) > MAX_CSV_BYTES:
        raise HTTPException(status_code=413, detail=f"CSV maior que {MAX_CSV_BYTES} bytes.")
    try:
        # parse so as colunas uteis + 1 linha alem do cap p/ detectar overflow
        def _read(enc=None):
            return pd.read_csv(io.BytesIO(raw), encoding=enc,
                               usecols=lambda c: c in _USECOLS, nrows=MAX_ROWS + 1)
        try:
            df = _read()
        except UnicodeDecodeError:
            df = _read("latin-1")
        if df.empty:
            raise HTTPException(status_code=422, detail="CSV sem linhas de dados.")
        if len(df) > MAX_ROWS:
            raise HTTPException(status_code=413, detail=f"CSV com mais de {MAX_ROWS} linhas.")
        scored = inf.predict_batch(MODEL, EXPLAINER, META, df)
    except HTTPException:
        raise
    except (ValueError, AssertionError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    except pd.errors.ParserError as e:
        raise HTTPException(status_code=422, detail=f"CSV invalido: {e}")

    from collections import Counter
    counts = scored["pred_risk_bucket"].value_counts().to_dict()
    n = int(len(scored))
    em_risco = int((scored["pred_churn_probability"] >= inf.THRESHOLD).sum())
    resumo = (f"{n} clientes avaliados; {em_risco} em risco (prob >= {inf.THRESHOLD}). "
              "Distribuicao: " + ", ".join(f"{k}: {v}" for k, v in counts.items()) + ".")
    # Caso A: recomendacao AGREGADA via LLM a partir do perfil de risco do lote
    drv = Counter()
    em_risco_rows = scored[scored["pred_churn_probability"] >= inf.THRESHOLD]   # so os em risco
    for s in em_risco_rows["pred_top_drivers"]:
        for part in str(s).split(";"):
            part = part.strip()
            if part.endswith("(+)"):
                drv[part[:-3].strip()] += 1
    personas_risco = em_risco_rows["pred_persona"].value_counts().head(5).to_dict() if "pred_persona" in em_risco_rows else {}
    profile = {"n": n, "em_risco": em_risco, "distribuicao": counts,
               "pct_risco": (100.0 * em_risco / n) if n else 0.0,
               "top_drivers": drv.most_common(5), "personas": personas_risco}
    agg = explain_mod.explain_batch_aggregate(profile)
    obs.record_batch(scored["pred_churn_probability"].tolist(),
                     scored["pred_risk_bucket"].tolist(),
                     (time.perf_counter() - t0) * 1000.0, agg["fonte"])
    obs.record_llm_tokens(agg.pop("_usage", None))
    return {"n": n, "em_risco": em_risco, "distribuicao": counts, "resumo": resumo,
            "recomendacao_agregada": agg["recomendacao_agregada"], "fonte": agg["fonte"],
            "rows": json.loads(scored.to_json(orient="records"))}
