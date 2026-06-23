// Glossário central (PT-BR, 1 linha) consumido pelo InfoTip — mantém as explicações
// consistentes e fáceis de reusar. Termos exibidos ao usuário no app.
export const GLOSSARY: Record<string, string> = {
  churn:
    "Percentual de clientes que cancelaram a assinatura no período — quanto menor, melhor.",
  shap:
    "Mostra quanto cada característica do cliente aumenta ou reduz o risco de churn previsto.",
  roc_auc:
    "Mede a capacidade do modelo de separar quem vai sair de quem fica (0–100%; ~98% = excelente).",
  pr_auc:
    "Como o ROC-AUC, mas focado na qualidade dos alertas de churn — melhor para dados desbalanceados.",
  f1:
    "Equilíbrio entre precisão e recall (acertar churn sem dar alarme falso) num único número.",
  recall:
    "Dos clientes que realmente saem, quantos % o modelo consegue identificar.",
  precisao:
    "De cada alerta de churn que o modelo dá, quantos % são evasões verdadeiras.",
  matriz_confusao:
    "Tabela de acertos e erros do modelo: verdadeiros/falsos positivos e negativos.",
  scale_pos_weight:
    "Peso da classe minoritária (churn) no XGBoost: acima de 1 reforça; aqui ficou =1 (neutro), com o desbalanceamento tratado por PR-AUC e recall.",
  cv:
    "Validação cruzada: treina em vários subconjuntos dos dados para confirmar que o modelo é robusto, não sorte.",
  drift:
    "Mudança na distribuição de uma característica vs. os dados de treino — z-score acima de 1 sinaliza desvio relevante.",
  vazamento:
    "Usar informação do futuro no treino, o que inflaria a performance. Auditamos para garantir que não acontece.",
  overfit:
    "Quando o modelo decora o treino em vez de generalizar; comparar validação vs. teste descarta esse risco.",
  base_rate:
    "Taxa média de churn na base (≈26,5%) — o ponto de partida antes de olhar o cliente específico.",
  latencia:
    "Tempo entre pedir uma predição e receber o resultado.",
  p50_p95:
    "p50 = tempo mediano de resposta; p95 = o tempo que 95% das predições não ultrapassam.",
  fallback:
    "Plano B baseado em regras, usado quando a IA (LLM) não consegue gerar a explicação.",
  otlp:
    "Protocolo aberto que envia as métricas para um serviço gerenciado de monitoramento (Grafana Cloud).",
  threshold:
    "Probabilidade de corte (≈50%) acima da qual o cliente é marcado como em risco.",
  correlacao:
    "Quanto uma característica anda junto com o churn; valores negativos protegem contra a evasão.",
  feature_importance:
    "Ranking de quais características mais pesam nas decisões do modelo.",
  lifetime:
    "Quantos meses o aluno é cliente desde o cadastro — o maior preditor de retenção.",
  ltv:
    "Receita média que um cliente gera ao longo de toda a relação com a academia.",
  mrr:
    "Receita mensal recorrente previsível vinda da base ativa.",
  cac:
    "Custo médio para conquistar um novo cliente.",
  ltv_cac:
    "Quantas vezes o valor do cliente (LTV) cobre o custo de aquisição (CAC); ideal acima de 3x.",
  retencao:
    "Inverso do churn: percentual de clientes que continuam ativos no período.",
};

export type GlossaryTerm = keyof typeof GLOSSARY;
