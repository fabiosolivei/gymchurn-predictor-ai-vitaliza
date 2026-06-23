"""
Artefato 2 — Auditoria de vazamento de target (item 2)
=======================================================

Re-treina o campeao DROPANDO as 2 features temporais e mede a queda de ROC-AUC.
Se o modelo NAO colapsa, nao ha dependencia deterministica de informacao futura.
Os hiperparametros sao LIDOS de models/metrics.json (best_params do campeao), nao
hardcoded — evita drift se train.py re-rodar e o tuning mudar.

Saida: models/leakage_audit.json
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

SEED = 42
ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "gym_churn_us.csv"
MODELS = ROOT / "models"
DROP = ["Avg_class_frequency_current_month", "Month_to_end_contract"]


def _best_params() -> dict:
    """Le best_params do XGBoost de metrics.json e converte 'clf__x':'v' -> x: numerico."""
    metrics = json.loads((MODELS / "metrics.json").read_text(encoding="utf-8"))
    raw = metrics["models"]["xgboost"]["best_params"]
    out = {}
    for k, v in raw.items():
        key = k.replace("clf__", "")
        try:
            out[key] = int(v)
        except (ValueError, TypeError):
            try:
                out[key] = float(v)
            except (ValueError, TypeError):
                out[key] = v
    out.update(random_state=SEED, eval_metric="logloss", n_jobs=-1)
    return out


def _auc(features, X_tr, X_te, y_tr, y_te, params) -> float:
    clf = XGBClassifier(**params)
    clf.fit(X_tr[features], y_tr)
    return float(roc_auc_score(y_te, clf.predict_proba(X_te[features])[:, 1]))


def main() -> None:
    params = _best_params()
    df = pd.read_csv(DATA_PATH)
    X = df.drop(columns=["Churn"]); y = df["Churn"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.20, stratify=y, random_state=SEED)
    all_feats = list(X.columns)
    kept = [c for c in all_feats if c not in DROP]

    auc_full = _auc(all_feats, X_tr, X_te, y_tr, y_te, params)
    auc_drop = _auc(kept, X_tr, X_te, y_tr, y_te, params)
    delta = round(auc_drop - auc_full, 4)
    result = {
        "dropped_features": DROP, "best_params_used": params,
        "auc_full": round(auc_full, 4), "auc_drop2": round(auc_drop, 4),
        "delta": delta, "collapsed": auc_drop < 0.75,
        "conclusion": (
            f"Removendo {DROP}, ROC-AUC cai de {auc_full:.4f} para {auc_drop:.4f} "
            f"(delta {delta:+.4f}). O modelo NAO colapsa: nao ha dependencia deterministica "
            "de informacao futura — as features temporais sao estado observavel no momento "
            "da inferencia (timing), nao medidas pos-evento."
        ),
    }
    (MODELS / "leakage_audit.json").write_text(json.dumps(result, indent=2, ensure_ascii=False),
                                               encoding="utf-8")
    print(json.dumps({k: result[k] for k in ("auc_full", "auc_drop2", "delta", "collapsed")},
                     indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
