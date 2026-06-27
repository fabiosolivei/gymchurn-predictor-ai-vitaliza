"""
Artefato 2 — Treino (metade TREINO; a inferência vive em inference.py)
=======================================================================

Reproduz o classificador de churn do grupo (S1) e emite os DOIS modelos
serializados exigidos pelo checklist:

  models/champion_xgboost.pkl   -> Pipeline sklearn (XGBoost), o modelo oficial
  models/shap_explainer.pkl     -> shap.TreeExplainer (SHAP por inferência, item 4)
  models/shap_meta.json         -> FEATURE_ORDER + base_value (contrato de inferência)
  models/metrics.json           -> precision/recall/F1/AUC/PR-AUC/CM + CV (itens 1/3)
  reports/figures/*.png         -> ROC, PR, matriz de confusão, feature importance,
                                   SHAP summary (itens 1/5)

Dataset: data/gym_churn_us.csv (4000 x 14, churn ~26.5%). SEED=42, split
estratificado 80/20, GridSearchCV 5-fold (roc_auc). Rodar uma vez:

    python train.py
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path
from typing import Any

import matplotlib
matplotlib.use("Agg")

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

SEED = 42
TEST_SIZE = 0.20
CV_FOLDS = 5
ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "gym_churn_us.csv"
REPORTS = ROOT / "reports"
FIGURES = REPORTS / "figures"
MODELS = ROOT / "models"
for d in (REPORTS, FIGURES, MODELS):
    d.mkdir(parents=True, exist_ok=True)


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    assert df.shape == (4000, 14), f"Shape inesperado: {df.shape}"
    assert df.isna().sum().sum() == 0, "Dataset com valores nulos"
    assert "Churn" in df.columns, "Coluna-alvo 'Churn' ausente"
    return df


def split_data(df: pd.DataFrame):
    X = df.drop(columns=["Churn"])
    y = df["Churn"]
    return train_test_split(X, y, test_size=TEST_SIZE, stratify=y, random_state=SEED)


def build_candidate_models() -> dict[str, tuple[Pipeline, dict]]:
    return {
        "logistic_regression": (
            Pipeline([
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(max_iter=2000, random_state=SEED)),
            ]),
            {
                "clf__C": [0.01, 0.1, 1.0, 10.0],
                "clf__penalty": ["l2"],
                "clf__class_weight": [None, "balanced"],
            },
        ),
        "random_forest": (
            Pipeline([("clf", RandomForestClassifier(random_state=SEED, n_jobs=-1))]),
            {
                "clf__n_estimators": [200, 400],
                "clf__max_depth": [6, 10, None],
                "clf__min_samples_leaf": [1, 5],
                "clf__class_weight": [None, "balanced"],
            },
        ),
        "xgboost": (
            # XGBoost 2.x/3.x: sem `use_label_encoder` (removido).
            Pipeline([("clf", XGBClassifier(random_state=SEED, eval_metric="logloss", n_jobs=-1))]),
            {
                "clf__n_estimators": [200, 400],
                "clf__max_depth": [3, 5, 7],
                "clf__learning_rate": [0.05, 0.1],
                "clf__subsample": [0.8, 1.0],
                "clf__scale_pos_weight": [1, 2.77],
            },
        ),
    }


def tune_and_fit(pipe: Pipeline, grid: dict, X, y) -> GridSearchCV:
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=SEED)
    search = GridSearchCV(pipe, grid, scoring="roc_auc", cv=cv, n_jobs=-1, refit=True)
    search.fit(X, y)
    return search


def evaluate(name: str, model, X_test, y_test) -> dict[str, Any]:
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    metrics = {
        "roc_auc": float(roc_auc_score(y_test, y_proba)),
        "pr_auc": float(average_precision_score(y_test, y_proba)),
        "classification_report": classification_report(y_test, y_pred, output_dict=True),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
    }
    fpr, tpr, _ = roc_curve(y_test, y_proba)
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot(fpr, tpr, label=f"AUC = {metrics['roc_auc']:.3f}", linewidth=2)
    ax.plot([0, 1], [0, 1], "--", color="gray", linewidth=0.8)
    ax.set_xlabel("FPR"); ax.set_ylabel("TPR"); ax.set_title(f"ROC — {name}"); ax.legend()
    fig.tight_layout(); fig.savefig(FIGURES / f"06_roc_{name}.png"); plt.close(fig)

    prec, rec, _ = precision_recall_curve(y_test, y_proba)
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot(rec, prec, linewidth=2, color="#8e44ad", label=f"PR-AUC = {metrics['pr_auc']:.3f}")
    ax.axhline(y_test.mean(), color="gray", linestyle="--", linewidth=0.8)
    ax.set_xlabel("Recall"); ax.set_ylabel("Precision"); ax.set_title(f"PR — {name}"); ax.legend()
    fig.tight_layout(); fig.savefig(FIGURES / f"07_pr_{name}.png"); plt.close(fig)

    import seaborn as sns
    cm = np.array(metrics["confusion_matrix"])
    fig, ax = plt.subplots(figsize=(4, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["Retido", "Churn"], yticklabels=["Retido", "Churn"], ax=ax)
    ax.set_xlabel("Previsto"); ax.set_ylabel("Real"); ax.set_title(f"Confusion — {name}")
    fig.tight_layout(); fig.savefig(FIGURES / f"08_cm_{name}.png"); plt.close(fig)
    return metrics


def feature_importance_plot(model, feature_names: list[str], name: str) -> None:
    clf = model.best_estimator_.named_steps["clf"]
    if hasattr(clf, "feature_importances_"):
        imp = pd.Series(clf.feature_importances_, index=feature_names).sort_values()
    elif hasattr(clf, "coef_"):
        imp = pd.Series(np.abs(clf.coef_[0]), index=feature_names).sort_values()
    else:
        return
    fig, ax = plt.subplots(figsize=(7, 5))
    imp.plot(kind="barh", ax=ax, color="#16a085")
    ax.set_title(f"Feature importance — {name}")
    fig.tight_layout(); fig.savefig(FIGURES / f"09_feature_importance_{name}.png"); plt.close(fig)


def main() -> None:
    print("=" * 64)
    print("Artefato 2 — train.py (treino + serialização do explainer SHAP)")
    print("=" * 64)

    df = load_data()
    feature_order = list(df.drop(columns=["Churn"]).columns)
    print(f"[1] dados: {df.shape}, features={len(feature_order)}")

    corr = df.corr(numeric_only=True)["Churn"].drop("Churn").round(3).to_dict()
    X_train, X_test, y_train, y_test = split_data(df)
    print(f"[2] split: treino={len(X_train)} teste={len(X_test)}")

    print("[3] GridSearchCV (3 modelos, 5-fold, roc_auc)...")
    tuned, all_metrics = {}, {}
    for name, (pipe, grid) in build_candidate_models().items():
        s = tune_and_fit(pipe, grid, X_train, y_train)
        tuned[name] = s
        print(f"    - {name:20s} best CV ROC-AUC = {s.best_score_:.4f}")

    print("[4] avaliação em teste...")
    for name, s in tuned.items():
        m = evaluate(name, s, X_test, y_test)
        m["best_cv_roc_auc"] = float(s.best_score_)
        m["best_params"] = {k: str(v) for k, v in s.best_params_.items()}
        all_metrics[name] = m
        print(f"    - {name:20s} ROC-AUC={m['roc_auc']:.4f} PR-AUC={m['pr_auc']:.4f} "
              f"F1churn={m['classification_report']['1']['f1-score']:.4f}")

    champion_name = max(all_metrics, key=lambda n: all_metrics[n]["roc_auc"])
    champion = tuned[champion_name]
    print(f"[5] CHAMPION: {champion_name} (ROC-AUC teste={all_metrics[champion_name]['roc_auc']:.4f})")
    # Contrato de inferencia: inference.py/shap usam TreeExplainer e assumem Pipeline
    # XGBoost SEM scaler. Se o campeao mudar, ajustar inference/explainer ANTES.
    assert champion_name == "xgboost", (
        f"Campeao={champion_name}: inference assume XGBoost (TreeExplainer, sem scaler). "
        "Troque o explainer por shap.Explainer generico e revise _pre_clf antes de serializar.")

    for name, s in tuned.items():
        feature_importance_plot(s, feature_order, name)

    # ---- Item 4: serializar o 2o modelo (SHAP) ----------------------------
    clf = champion.best_estimator_.named_steps["clf"]   # Pipeline -> estimador
    explainer = shap.TreeExplainer(clf)
    # SHAP summary global (figura 10) usando a API Explanation
    expl_test = explainer(X_test)
    fig = plt.figure(figsize=(8, 6))
    shap.summary_plot(expl_test.values, X_test, show=False, plot_size=None)
    plt.title(f"SHAP summary — {champion_name}")
    plt.tight_layout(); plt.savefig(FIGURES / f"10_shap_summary_{champion_name}.png", bbox_inches="tight")
    plt.close(fig)

    base_value = float(np.ravel(explainer.expected_value)[0])

    joblib.dump(champion.best_estimator_, MODELS / "champion_xgboost.pkl")
    joblib.dump(explainer, MODELS / "shap_explainer.pkl")
    with open(MODELS / "shap_meta.json", "w", encoding="utf-8") as f:
        json.dump({"feature_order": feature_order, "base_value": base_value,
                   "champion": champion_name, "seed": SEED}, f, indent=2)
    with open(MODELS / "metrics.json", "w", encoding="utf-8") as f:
        json.dump({"seed": SEED, "test_size": TEST_SIZE, "cv_folds": CV_FOLDS,
                   "champion": champion_name, "feature_order": feature_order,
                   "target_balance": df["Churn"].value_counts(normalize=True).round(4).to_dict(),
                   "correlation_with_churn": corr, "models": all_metrics}, f, indent=2, default=str)
    # importancia por GANHO do XGBoost (reprodutibilidade offline do relatorio; != SHAP)
    fi = sorted(({"feature": f, "importance_gain": round(float(v), 4)}
                 for f, v in zip(feature_order, clf.feature_importances_)),
                key=lambda d: -d["importance_gain"])
    with open(MODELS / "feature_importance.json", "w", encoding="utf-8") as f:
        json.dump({"method": "xgboost_gain (clf.feature_importances_)", "feature_importance": fi}, f, indent=2)

    # ---- Verificação anti-bug: sum(shap)+base ~= margin (logit) -----------
    row0 = X_test.iloc[[0]]
    e0 = explainer(row0)
    shap_sum = float(np.ravel(e0.values).sum()) + float(np.ravel(e0.base_values)[0])
    margin = float(clf.predict(row0, output_margin=True)[0])
    proba = float(champion.best_estimator_.predict_proba(row0)[:, 1][0])
    logit = float(np.log(proba / (1 - proba)))
    print(f"[6] checagem SHAP  sum+base={shap_sum:.4f}  margin={margin:.4f}  logit(proba)={logit:.4f}")
    assert abs(shap_sum - margin) < 1e-2, "SHAP nao soma ao margin — explainer/indexacao errados!"
    print("    OK: SHAP por instancia consistente.")
    print("=" * 64)
    print("Artefatos: champion_xgboost.pkl, shap_explainer.pkl, shap_meta.json, metrics.json")
    print("=" * 64)


if __name__ == "__main__":
    main()
