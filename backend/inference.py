"""
Artefato 2 — Inferência (metade INFERÊNCIA, sem treino, sem Streamlit/FastAPI)
==============================================================================

Carrega os dois modelos serializados por train.py e expõe:
  predict_one(row)   -> probabilidade de churn
  shap_one(row)      -> {proba, risk, base_value, shap[] por feature, top[]}
  predict_batch(df)  -> DataFrame com pred_* (probabilidade, risco, top drivers SHAP, explicação)

Correções verificadas:
  * o .pkl é Pipeline (NÃO GridSearchCV) -> model.named_steps['clf']
  * SHAP por instância via API Explanation: explainer(X).values[0] / .base_values[0]
  * reordena df[FEATURE_ORDER] + coerção numérica + rejeita NaN (nomeando a coluna)
  * batch NÃO ecoa a coluna Churn e carrega SHAP+explicação por linha (itens 4/6)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

import explain as _explain  # leaf (so os/httpx) — sem ciclo

_ROOT = Path(__file__).resolve().parent
_MODELS = _ROOT / "models"

# Threshold de decisão = 0.5 (default). O modelo é selecionado por ROC-AUC; o corte
# é decisão de negócio. metrics.json reporta a PR-curve para recalibrar se desejado.
THRESHOLD = 0.5


def load_artifacts(models_dir: Path | None = None) -> tuple[Any, Any, dict]:
    d = Path(models_dir) if models_dir else _MODELS
    model = joblib.load(d / "champion_xgboost.pkl")          # Pipeline, NÃO GridSearchCV
    explainer = joblib.load(d / "shap_explainer.pkl")
    meta = json.loads((d / "shap_meta.json").read_text(encoding="utf-8"))
    return model, explainer, meta


def get_clf(model):
    """Estimador final do Pipeline. NUNCA model.best_estimator_ (o .pkl não é GridSearchCV)."""
    return model.named_steps["clf"]


def risk_bucket(prob: float) -> tuple[str, str]:
    if prob < 0.20:
        return "Baixo risco", "#2ecc71"
    if prob < 0.50:
        return "Risco moderado", "#f39c12"
    if prob < 0.75:
        return "Alto risco", "#e67e22"
    return "Risco crítico", "#e74c3c"


def _frame(rows, feature_order: list[str]) -> pd.DataFrame:
    """DataFrame reordenado p/ FEATURE_ORDER, coercao numerica e rejeicao de NaN."""
    df = pd.DataFrame(rows)
    missing = [c for c in feature_order if c not in df.columns]
    if missing:
        raise ValueError(f"Colunas ausentes: {missing}")
    X = df[feature_order].apply(pd.to_numeric, errors="coerce")
    bad = [c for c in feature_order if X[c].isna().any()]
    if bad:
        raise ValueError(f"Valores nao-numericos/ausentes nas colunas: {bad}")
    assert list(X.columns) == feature_order, "Ordem de colunas != FEATURE_ORDER"
    return X


def _pre_clf(model, X: pd.DataFrame):
    """Todos os passos do Pipeline menos 'clf' (no XGBoost nao ha scaler -> X)."""
    Xt = X
    for _name, step in list(model.steps)[:-1]:
        Xt = step.transform(Xt)
    return Xt


def _contribs(feature_order, values, X_row) -> list[dict]:
    out = [
        {
            "feature": f,
            "value": float(X_row[f]),
            "shap": float(v),
            "direction": "churn" if v > 0 else "retencao",
        }
        for f, v in zip(feature_order, np.ravel(values).astype(float))
    ]
    out.sort(key=lambda c: abs(c["shap"]), reverse=True)
    return out


def predict_one(model, row: dict, feature_order: list[str]) -> float:
    X = _frame([row], feature_order)
    return float(model.predict_proba(X)[:, 1][0])


def shap_one(model, explainer, meta: dict, row: dict) -> dict:
    feature_order = meta["feature_order"]
    X = _frame([row], feature_order)
    proba = float(model.predict_proba(X)[:, 1][0])
    label, color = risk_bucket(proba)
    exp = explainer(_pre_clf(model, X))                  # objeto Explanation
    base = float(np.ravel(exp.base_values)[0])
    contribs = _contribs(feature_order, exp.values[0], X.iloc[0])
    return {
        "churn_probability": round(proba, 4),
        "risk": label,
        "risk_color": color,
        "base_value": round(base, 4),
        "shap": contribs,
        "top": contribs[:5],
    }


def predict_batch(model, explainer, meta: dict, df: pd.DataFrame) -> pd.DataFrame:
    """Scoring em lote COM SHAP por linha + explicacao rule-based. NAO ecoa 'Churn'."""
    feature_order = meta["feature_order"]
    X = _frame(df, feature_order)
    proba = model.predict_proba(X)[:, 1]
    exp = explainer(_pre_clf(model, X))                  # (n, 13)
    out = df.drop(columns=["Churn"], errors="ignore").copy()
    out["pred_churn_probability"] = proba.round(4)
    out["pred_churn_prediction"] = (proba >= THRESHOLD).astype(int)
    out["pred_risk_bucket"] = [risk_bucket(p)[0] for p in proba]

    top_strs, explic = [], []
    vals = np.asarray(exp.values)
    for i in range(len(X)):
        contribs = _contribs(feature_order, vals[i], X.iloc[i])
        top3 = contribs[:3]
        top_strs.append("; ".join(f"{c['feature']}({'+' if c['shap'] > 0 else '-'})" for c in top3))
        res = {"churn_probability": round(float(proba[i]), 4),
               "risk": risk_bucket(float(proba[i]))[0], "top": top3}
        explic.append(_explain.explain_rule_based(res)["explicacao"])
    out["pred_top_drivers"] = top_strs
    out["pred_explicacao"] = explic
    return out


def sum_check(model, explainer, meta: dict, row: dict) -> dict:
    feature_order = meta["feature_order"]
    X = _frame([row], feature_order)
    Xc = _pre_clf(model, X)
    exp = explainer(Xc)
    shap_sum = float(np.ravel(exp.values[0]).sum()) + float(np.ravel(exp.base_values)[0])
    margin = float(get_clf(model).predict(Xc, output_margin=True)[0])
    return {"shap_sum_plus_base": round(shap_sum, 4), "margin": round(margin, 4),
            "ok": abs(shap_sum - margin) < 1e-2}


if __name__ == "__main__":
    model, explainer, meta = load_artifacts()
    fo = meta["feature_order"]
    sample = {f: 0 for f in fo}
    sample.update({"gender": 1, "Age": 28, "Near_Location": 1, "Phone": 1,
                   "Contract_period": 1, "Month_to_end_contract": 1, "Lifetime": 2,
                   "Avg_additional_charges_total": 90.0,
                   "Avg_class_frequency_total": 1.5, "Avg_class_frequency_current_month": 0.8})
    out = shap_one(model, explainer, meta, sample)
    print("proba:", out["churn_probability"], "| risco:", out["risk"])
    print("sum_check:", sum_check(model, explainer, meta, sample))
    df = pd.DataFrame([sample, {**sample, "Contract_period": 12, "Lifetime": 20,
                                "Avg_class_frequency_total": 3.0, "Churn": 0}])
    b = predict_batch(model, explainer, meta, df)
    print("batch cols:", [c for c in b.columns if c.startswith("pred_")])
    print("Churn ecoada?", "Churn" in b.columns)
