"""
Artefato 2 — Camada de explicação + recomendação (item 6, via LLM)
===================================================================

O professor exige (Encontros 17/20): a partir do SHAP, o LLM devolve uma
EXPLICAÇÃO em linguagem natural E uma RECOMENDAÇÃO/prescrição de ação — nos dois
modos (individual / lote). O rule-based fica só como FALLBACK quando a chave
OpenRouter não está setada (ou a chamada falha), pra nada quebrar.

explain(result)                 -> {explicacao, recomendacao, fonte}  (1 cliente, Caso B)
explain_batch_aggregate(profile)-> {recomendacao_agregada, fonte}     (lote/dump, Caso A)

A chamada LLM usa o SDK OpenAI apontado pro OpenRouter -> o OpenLIT instrumenta
tokens/custo/latência automaticamente (observabilidade).
"""

from __future__ import annotations

import json
import os
from typing import Any

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
LLM_MODEL = os.environ.get("OPENROUTER_MODEL", "deepseek/deepseek-chat")

# ---- bancos rule-based (fallback determinístico) --------------------------
_DRIVER_CHURN = {
    "Lifetime": "pouco tempo de casa (ainda nao formou habito)",
    "Contract_period": "contrato curto (baixo compromisso)",
    "Month_to_end_contract": "contrato perto de vencer",
    "Avg_class_frequency_total": "frequencia historica baixa",
    "Avg_class_frequency_current_month": "frequencia recente em queda",
    "Group_visits": "nao participa de aulas em grupo",
    "Partner": "sem vinculo corporativo/parceiro",
    "Promo_friends": "sem amigos trazidos para a academia",
    "Near_Location": "mora/trabalha longe da unidade",
    "Age": "perfil etario de maior risco",
    "Avg_additional_charges_total": "baixo gasto com servicos adicionais",
    "Phone": "sem telefone de contato cadastrado",
    "gender": "perfil demografico associado a maior risco",
}
_DRIVER_KEEP = {
    "Lifetime": "tempo de casa consolidado",
    "Contract_period": "contrato longo (ancoragem)",
    "Month_to_end_contract": "contrato longe de vencer",
    "Avg_class_frequency_total": "boa frequencia historica",
    "Avg_class_frequency_current_month": "frequencia recente saudavel",
    "Group_visits": "participa de aulas em grupo",
    "Partner": "vinculo corporativo/parceiro",
    "Promo_friends": "trouxe amigos (ancoragem social)",
    "Near_Location": "mora/trabalha perto da unidade",
    "Age": "faixa etaria de menor risco",
    "Avg_additional_charges_total": "bom gasto com servicos adicionais",
    "Phone": "telefone de contato cadastrado",
    "gender": "perfil demografico de menor risco",
}
_ACTION = {
    "Lifetime": "onboarding intensivo nos primeiros 30 dias (check-in + buddy)",
    "Contract_period": "oferta de upgrade para plano semestral/anual com desconto",
    "Month_to_end_contract": "contato proativo de renovacao antecipada",
    "Avg_class_frequency_total": "plano de treino guiado para criar constancia",
    "Avg_class_frequency_current_month": "alerta de reengajamento (frequencia caiu)",
    "Group_visits": "convite para 2 aulas coletivas gratuitas",
    "Partner": "ativar beneficio corporativo / programa de parcerias",
    "Promo_friends": 'campanha "traga um amigo"',
    "Near_Location": "incentivar horarios flexiveis / aulas on-demand",
    "Age": "comunicacao e plano adequados ao perfil",
    "Avg_additional_charges_total": "oferta de avaliacao fisica / servicos premium",
    "Phone": "completar cadastro para permitir contato ativo",
    "gender": "acompanhamento individualizado",
}


# ---- LLM (OpenRouter via SDK OpenAI; OpenLIT instrumenta) ------------------
def _llm_json(system: str, user: str, max_tokens: int = 400) -> tuple[dict | None, dict]:
    """Chama o OpenRouter pedindo JSON. Retorna (obj|None, usage_tokens). O usage e LOCAL
    (sem estado de modulo) -> sem race de tokens entre requests concorrentes no threadpool."""
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        return None, {}
    try:
        from openai import OpenAI
        client = OpenAI(base_url=OPENROUTER_BASE, api_key=key)
        resp = client.chat.completions.create(
            model=LLM_MODEL, max_tokens=max_tokens, temperature=0.3,
            messages=[{"role": "system", "content": system},
                      {"role": "user", "content": user}],
        )
        usage = {}
        u = getattr(resp, "usage", None)
        if u is not None:
            usage = {"prompt": getattr(u, "prompt_tokens", 0) or 0,
                     "completion": getattr(u, "completion_tokens", 0) or 0,
                     "total": getattr(u, "total_tokens", 0) or 0}
        txt = (resp.choices[0].message.content or "").strip()
        if txt.startswith("```"):
            txt = txt.strip("`").split("\n", 1)[-1].rsplit("```", 1)[0]
        obj = json.loads(txt)
        return (obj if isinstance(obj, dict) else None), usage   # nao-dict -> fallback (evita 500)
    except Exception:
        return None, {}


# ---- individual (Caso B) --------------------------------------------------
def explain_rule_based(result: dict) -> dict[str, Any]:
    proba = result["churn_probability"]
    risk = result["risk"]
    top = result.get("top", [])
    churn_drivers = [c for c in top if c["shap"] > 0][:3]
    keep_drivers = [c for c in top if c["shap"] < 0][:2]
    causas = [_DRIVER_CHURN.get(c["feature"], c["feature"]) for c in churn_drivers]
    apoios = [_DRIVER_KEEP.get(c["feature"], c["feature"]) for c in keep_drivers]
    pct = f"{proba * 100:.0f}%"
    explic = (f"Risco de churn {risk.lower()} ({pct}). Principais fatores de evasao: "
              + "; ".join(causas) + "." if causas
              else f"Risco de churn {risk.lower()} ({pct}). Sem fator dominante de evasao.")
    if apoios:
        explic += " Fatores que ajudam a reter: " + "; ".join(apoios) + "."
    acoes = []
    for c in churn_drivers:
        a = _ACTION.get(c["feature"])
        if a and a not in acoes:
            acoes.append(a)
    if not acoes:
        acoes = ["manter acompanhamento padrao de retencao"]
    return {"explicacao": explic, "recomendacao": "Acoes sugeridas: " + "; ".join(acoes) + ".",
            "fonte": "rule-based"}


def explain_llm(result: dict) -> dict[str, Any]:
    base = explain_rule_based(result)
    fatores = "\n".join(
        f"- {c['feature']} = {c.get('value')}: shap={c['shap']:+.3f} ({'aumenta' if c['shap'] > 0 else 'reduz'} risco)"
        for c in result.get("top", []))
    p = result.get("persona") or {}
    seg = (f"Segmento (persona) deste aluno: {p['nome']} (churn-base ~{p['churn_base']}%; "
           f"estrategia de retencao do negocio: {p['pilar']}). ") if p else ""
    data, usage = _llm_json(
        "Voce e analista de retencao de uma academia. Seja conciso e pratico.",
        (seg + "Probabilidade de churn deste aluno: "
         f"{result['churn_probability']*100:.0f}% ({result['risk']}). Fatores SHAP:\n{fatores}\n\n"
         'Responda ESTRITAMENTE em JSON: {"explicacao": "2-3 frases sobre POR QUE o risco e esse", '
         '"recomendacao": "1-2 acoes concretas de retencao alinhadas a estrategia da persona"}. '
         "Em portugues, sem inventar dados alem dos fatores."))
    if not data:
        return base
    explic = str(data.get("explicacao", "")).strip()
    rec = str(data.get("recomendacao", "")).strip()
    if not explic or not rec:
        return base
    return {"explicacao": explic, "recomendacao": rec, "fonte": f"llm:{LLM_MODEL}",
            "_usage": usage}


def explain(result: dict, use_llm: bool = True) -> dict[str, Any]:
    if use_llm and os.environ.get("OPENROUTER_API_KEY"):
        return explain_llm(result)
    return explain_rule_based(result)


# ---- lote / dump (Caso A): recomendacao AGREGADA --------------------------
def _aggregate_rule_based(profile: dict) -> str:
    drivers = profile.get("top_drivers", [])[:3]
    nomes = [_DRIVER_CHURN.get(f, f) for f, _ in drivers]
    acoes = []
    for f, _ in drivers:
        a = _ACTION.get(f)
        if a and a not in acoes:
            acoes.append(a)
    base = (f"{profile['em_risco']} de {profile['n']} clientes em risco "
            f"({profile['pct_risco']:.0f}%).")
    if nomes:
        base += " Principais motores de evasao na base: " + "; ".join(nomes) + "."
    if acoes:
        base += " Ações prioritárias: " + "; ".join(acoes) + "."
    return base


def explain_batch_aggregate(profile: dict) -> dict[str, Any]:
    """profile = {n, em_risco, pct_risco, distribuicao, top_drivers:[(feat,count)]}."""
    fallback = {"recomendacao_agregada": _aggregate_rule_based(profile), "fonte": "rule-based"}
    if not profile.get("top_drivers"):           # sem fator dominante -> nao arrisca alucinacao do LLM
        return fallback
    drivers = ", ".join(f"{f} ({c}x)" for f, c in profile.get("top_drivers", [])[:5])
    personas = profile.get("personas") or {}
    seg = ("Personas (segmentos) dominantes entre os em-risco: "
           + ", ".join(f"{k} ({v})" for k, v in personas.items()) + ". ") if personas else ""
    data, usage = _llm_json(
        "Voce e analista de retencao de uma academia. Recomendacoes acionaveis para a GESTAO.",
        (f"Lote de {profile['n']} clientes; {profile['em_risco']} em risco "
         f"({profile['pct_risco']:.0f}%). Distribuicao de risco: {profile.get('distribuicao')}. "
         + seg
         + f"Fatores SHAP mais frequentes entre os em risco: {drivers}.\n\n"
         'Responda ESTRITAMENTE em JSON: {"recomendacao_agregada": "3-4 acoes estrategicas '
         'priorizadas por PERSONA para reduzir o churn DESTA base"}. Em portugues, baseado so nos fatores.'),
        max_tokens=450)
    if not data:
        return fallback
    rec = data.get("recomendacao_agregada", "")
    if isinstance(rec, list):                       # o LLM as vezes devolve uma lista
        rec = " ".join(f"{i}) {str(x).strip()}." for i, x in enumerate(rec, 1) if str(x).strip())
    rec = str(rec).strip()
    if not rec:
        return fallback
    return {"recomendacao_agregada": rec, "fonte": f"llm:{LLM_MODEL}", "_usage": usage}


if __name__ == "__main__":
    demo = {"churn_probability": 0.82, "risk": "Alto risco", "top": [
        {"feature": "Month_to_end_contract", "shap": 0.31}, {"feature": "Lifetime", "shap": -0.2},
        {"feature": "Contract_period", "shap": 0.18}]}
    print("individual:", explain_rule_based(demo))
    print("lote:", explain_batch_aggregate(
        {"n": 100, "em_risco": 27, "pct_risco": 27.0, "distribuicao": {"Alto risco": 27},
         "top_drivers": [("Contract_period", 18), ("Lifetime", 12)]}))
