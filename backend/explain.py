"""
Artefato 2 — Camada de explicação (item 6)
============================================

explain_rule_based()  -> CAMINHO PRIMÁRIO: explicação + prescrição PT-BR determinística
                         a partir do SHAP REAL do cliente. Sem chave/serviço externo.
explain_llm()          -> UPGRADE opcional (OpenRouter/DeepSeek). Pede JSON
                         {diagnostico, prescricao} e SEMPRE preenche os dois campos;
                         qualquer falha/ausencia de chave -> cai no rule-based.
explain()              -> fachada: LLM se houver chave, senao rule-based.

A predicao em si e SEMPRE o modelo real (XGBoost serializado); esta camada so
traduz o SHAP em linguagem de negocio.
"""

from __future__ import annotations

import json
import os
from typing import Any

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


def explain_rule_based(result: dict) -> dict[str, Any]:
    """result = saida de inference.shap_one (ou {churn_probability, risk, top})."""
    proba = result["churn_probability"]
    risk = result["risk"]
    top = result.get("top", [])
    churn_drivers = [c for c in top if c["shap"] > 0][:3]
    keep_drivers = [c for c in top if c["shap"] < 0][:2]
    causas = [_DRIVER_CHURN.get(c["feature"], c["feature"]) for c in churn_drivers]
    apoios = [_DRIVER_KEEP.get(c["feature"], c["feature"]) for c in keep_drivers]

    pct = f"{proba * 100:.0f}%"
    if causas:
        explic = (f"Risco de churn {risk.lower()} ({pct}). Principais fatores de evasao: "
                  + "; ".join(causas) + ".")
    else:
        explic = f"Risco de churn {risk.lower()} ({pct}). Sem fator dominante de evasao."
    if apoios:
        explic += " Fatores que ajudam a reter: " + "; ".join(apoios) + "."

    acoes = []
    for c in churn_drivers:
        a = _ACTION.get(c["feature"])
        if a and a not in acoes:
            acoes.append(a)
    if not acoes:
        acoes = ["manter acompanhamento padrao de retencao"]
    prescric = "Acoes sugeridas: " + "; ".join(acoes) + "."
    return {"explicacao": explic, "prescricao": prescric, "fonte": "rule-based"}


def explain_llm(result: dict, model: str = "deepseek/deepseek-chat", timeout: float = 8.0) -> dict[str, Any]:
    """Upgrade via OpenRouter. Sem chave/erro/JSON invalido -> cai no rule-based,
    garantindo que explicacao E prescricao nunca voltem vazias."""
    key = os.environ.get("OPENROUTER_API_KEY")
    base = explain_rule_based(result)            # fallback deterministico
    if not key:
        return base
    try:
        import httpx
        fatores = "\n".join(
            f"- {c['feature']}: shap={c['shap']:+.3f} ({'aumenta' if c['shap'] > 0 else 'reduz'} risco)"
            for c in result.get("top", [])
        )
        prompt = (
            "Voce e analista de retencao de uma academia. Probabilidade de churn "
            f"{result['churn_probability']*100:.0f}% ({result['risk']}). Fatores SHAP:\n{fatores}\n\n"
            'Responda ESTRITAMENTE em JSON: {"diagnostico": "2-3 frases", "prescricao": "1-2 acoes concretas"}. '
            "Em portugues, sem inventar dados alem dos fatores."
        )
        resp = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "max_tokens": 350,
                  "messages": [{"role": "user", "content": prompt}]},
            timeout=timeout,
        )
        resp.raise_for_status()
        txt = resp.json()["choices"][0]["message"]["content"].strip()
        if txt.startswith("```"):
            txt = txt.strip("`").split("\n", 1)[-1]
        data = json.loads(txt)
        diag = str(data.get("diagnostico", "")).strip()
        presc = str(data.get("prescricao", "")).strip()
        if not diag or not presc:           # JSON incompleto -> nao degrada o contrato
            return base
        return {"explicacao": diag, "prescricao": presc, "fonte": f"llm:{model}"}
    except Exception:
        return base                          # rede/timeout/401/JSON invalido


def explain(result: dict, use_llm: bool = True) -> dict[str, Any]:
    if use_llm and os.environ.get("OPENROUTER_API_KEY"):
        return explain_llm(result)
    return explain_rule_based(result)


if __name__ == "__main__":
    demo = {"churn_probability": 0.82, "risk": "Alto risco", "top": [
        {"feature": "Month_to_end_contract", "shap": 0.31, "direction": "churn"},
        {"feature": "Lifetime", "shap": -0.20, "direction": "retencao"},
        {"feature": "Contract_period", "shap": 0.18, "direction": "churn"},
    ]}
    print(explain_rule_based(demo))
