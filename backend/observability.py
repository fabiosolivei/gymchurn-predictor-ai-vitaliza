"""
Observabilidade — Artefato 2
============================
Camada in-memory (janela movel) SEM dependencia obrigatoria: o GET /observability
sempre responde, mesmo no Render free. Export OTLP p/ Grafana Cloud e OPCIONAL e
so liga se OTEL_EXPORTER_OTLP_ENDPOINT estiver setado (import guardado -> nao pesa
no free tier nem arrisca o servico quando a env nao existe).

Mede: saude da API (latencia p50/p95, erros, volume), modelo (distribuicao de score,
buckets de risco, drift das features vs baseline de treino) e LLM (chamadas, fallback,
tokens/custo). app.py alimenta via record_*(); o frontend dedicado le snapshot().
"""
from __future__ import annotations

import math
import os
import threading
import time
from collections import Counter, deque

WINDOW = 500                     # ultimas N predicoes individuais (latencia/recencia)
_lock = threading.Lock()
_start = time.time()

_events = deque(maxlen=WINDOW)    # {ts, score, risk, latency_ms, fonte, source}
_counters = Counter()             # predictions, batches, batch_rows, errors, llm_calls, llm_fallback
_tokens = Counter()               # prompt, completion, total
_score_hist = [0] * 10            # cumulativo (individual + lote): bins 0.0-0.1 ... 0.9-1.0
_risk_hist = Counter()            # cumulativo
_feature_window = deque(maxlen=WINDOW)  # ultimos N dicts de features -> drift na JANELA real
_baseline: dict[str, dict] = {}   # {feature: {"mean": x, "std": y}} vindo do treino


# ----------------------------------------------------------------- baseline (drift)
def set_baseline(stats: dict) -> None:
    """stats: {feature: {'mean': float, 'std': float}} computado do dataset de treino."""
    with _lock:
        _baseline.clear()
        _baseline.update(stats)


def _bump_score_hist(score: float) -> None:
    s = float(score)
    if not math.isfinite(s):          # defesa contra NaN/inf
        return
    _score_hist[min(9, max(0, int(s * 10)))] += 1


# ----------------------------------------------------------------- gravacao
def record_prediction(score, risk, latency_ms, fonte, features=None, source="individual") -> None:
    with _lock:
        _events.append({"ts": time.time(), "score": float(score), "risk": str(risk),
                        "latency_ms": float(latency_ms), "fonte": str(fonte), "source": source})
        _counters["predictions"] += 1
        _bump_score_hist(score)
        _risk_hist[str(risk)] += 1
        if str(fonte).startswith("llm"):
            _counters["llm_calls"] += 1
        elif fonte:
            _counters["llm_fallback"] += 1
        if features:
            clean = {}
            for k, v in features.items():
                try:
                    fv = float(v)
                    if math.isfinite(fv):
                        clean[k] = fv
                except (TypeError, ValueError):
                    pass
            if clean:
                _feature_window.append(clean)
    _otel_record(score, risk, latency_ms, fonte)


def record_batch(scores, risks, latency_ms, fonte) -> None:
    """Lote (Caso A): alimenta histograma de score/risco com TODAS as linhas + 1 evento de latencia."""
    scores = list(scores)
    with _lock:
        _counters["batches"] += 1
        _counters["batch_rows"] += len(scores)
        for s in scores:
            _bump_score_hist(s)
        for r in risks:
            _risk_hist[str(r)] += 1
        if str(fonte).startswith("llm"):
            _counters["llm_calls"] += 1
        elif fonte:
            _counters["llm_fallback"] += 1
        mean = (sum(float(s) for s in scores) / len(scores)) if scores else 0.0
        _events.append({"ts": time.time(), "score": mean, "risk": "lote",
                        "latency_ms": float(latency_ms), "fonte": str(fonte), "source": "batch"})
    _otel_record(mean, "lote", latency_ms, fonte)


def record_error(path: str = "") -> None:
    with _lock:
        _counters["errors"] += 1
    if _OTLP_ON and _c_err is not None:
        try:
            _c_err.add(1, {"path": str(path)})
        except Exception:
            pass


def record_llm_tokens(usage) -> None:
    if not usage:
        return
    with _lock:
        for k in ("prompt", "completion", "total"):
            try:
                _tokens[k] += int(usage.get(k, 0) or 0)
            except (TypeError, ValueError):
                pass


# ----------------------------------------------------------------- leitura
def _pct(sorted_vals, p):
    if not sorted_vals:
        return 0.0
    i = min(len(sorted_vals) - 1, int(round((p / 100.0) * (len(sorted_vals) - 1))))
    return round(sorted_vals[i], 1)


def snapshot() -> dict:
    with _lock:
        ev = list(_events)
        counters = dict(_counters)
        tokens = dict(_tokens)
        hist = list(_score_hist)
        risk = dict(_risk_hist)
        feat_win = list(_feature_window)
        baseline = {k: dict(v) for k, v in _baseline.items()}

    # latencia = SO predicoes individuais (lote esta em outra escala e poluiria p50/p95)
    lat = sorted(e["latency_ms"] for e in ev if e.get("source") == "individual")
    all_scores_n = sum(hist)
    ind_scores = [e["score"] for e in ev if e["source"] == "individual"]
    # score medio: eventos individuais reais; fallback = ponto medio do bin (largura 0.1) ponderado
    score_mean = (sum(c * (0.1 * idx + 0.05) for idx, c in enumerate(hist)) / all_scores_n) if all_scores_n else 0.0

    drift = []
    if feat_win:
        fn = len(feat_win)
        means: dict[str, float] = {}
        for d in feat_win:
            for k, v in d.items():
                means[k] = means.get(k, 0.0) + v
        for k, base in baseline.items():
            cur = means.get(k, 0.0) / fn
            b_mean = float(base.get("mean", 0.0))
            b_std = float(base.get("std", 0.0)) or 1.0
            z = (cur - b_mean) / b_std
            drift.append({"feature": k, "baseline_mean": round(b_mean, 3),
                          "window_mean": round(cur, 3), "z": round(z, 2), "drift": abs(z) > 1.0})
        drift.sort(key=lambda d: -abs(d["z"]))

    llm_calls = counters.get("llm_calls", 0)
    llm_fb = counters.get("llm_fallback", 0)
    return {
        "uptime_s": round(time.time() - _start, 1),
        "window_size": len(ev),
        "totals": {
            "predictions": counters.get("predictions", 0),
            "batches": counters.get("batches", 0),
            "batch_rows": counters.get("batch_rows", 0),
            "errors": counters.get("errors", 0),
            "scored_total": all_scores_n,
        },
        "latency_ms": {"p50": _pct(lat, 50), "p95": _pct(lat, 95),
                       "max": round(lat[-1], 1) if lat else 0.0},
        "score": {
            "hist": hist,                       # 10 bins 0.0-1.0
            "mean": round(sum(ind_scores) / len(ind_scores), 3) if ind_scores else round(score_mean, 3),
        },
        "risk_distribution": risk,
        "llm": {
            "calls": llm_calls,
            "fallback": llm_fb,
            "fallback_rate": round(100.0 * llm_fb / (llm_calls + llm_fb), 1) if (llm_calls + llm_fb) else 0.0,
            "tokens": tokens,
        },
        "drift": drift[:10],
        "otlp_enabled": _OTLP_ON,
    }


# ----------------------------------------------------------------- OTLP (Grafana Cloud) — opcional
_OTLP_ON = False
_h_score = _h_lat = _c_pred = _c_err = None


def init_otlp(app_name: str = "vitaliza-churn-api") -> bool:
    """Liga o export OTLP SE OTEL_EXPORTER_OTLP_ENDPOINT existir. Import guardado: sem a
    env, nada do opentelemetry e carregado (protege memoria/estabilidade no free tier)."""
    global _OTLP_ON, _h_score, _h_lat, _c_pred, _c_err
    if not os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"):
        return False
    try:
        from opentelemetry import metrics
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.resources import Resource

        reader = PeriodicExportingMetricReader(OTLPMetricExporter())  # endpoint/headers vem do env
        metrics.set_meter_provider(
            MeterProvider(resource=Resource.create({"service.name": app_name}), metric_readers=[reader]))
        meter = metrics.get_meter(app_name)
        _h_score = meter.create_histogram("churn_score", description="probabilidade de churn prevista")
        _h_lat = meter.create_histogram("predict_latency_ms", unit="ms", description="latencia de inferencia")
        _c_pred = meter.create_counter("predictions_total", description="predicoes por risco/fonte")
        _c_err = meter.create_counter("errors_total", description="erros do servico")
        _OTLP_ON = True
        return True
    except Exception:
        return False


def _otel_record(score, risk, latency_ms, fonte) -> None:
    if not _OTLP_ON:
        return
    try:
        attrs = {"risk": str(risk), "fonte": "llm" if str(fonte).startswith("llm") else "rule-based"}
        _h_score.record(float(score), attrs)
        _h_lat.record(float(latency_ms))
        _c_pred.add(1, attrs)
    except Exception:
        pass
