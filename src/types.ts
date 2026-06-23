export interface CustomerData {
  gender: 'Male' | 'Female';
  age: number;
  nearLocation: boolean;
  partner: boolean;
  promoFriends: boolean;
  phone: boolean;
  contractPeriod: 1 | 6 | 12;
  groupVisits: boolean;
  avgAdditionalCharges: number;
  monthToEndContract: number;
  lifetime: number;
  avgFrequencyTotal: number;
  avgFrequencyCurrentMonth: number;
}

export interface PredictionResult {
  churnProbability: number;
  riskCategory: 'Low' | 'Medium' | 'High';
  interpretation: string;
  recommendations: string[];
  featureImportance: { feature: string; impact: number }[];
  fonte?: string;
}

export interface KPIData {
  churnRate: number;
  activeCustomers: number;
  cancelledCustomers: number;
  avgTicket: number;
  ltv: number;
  cac: number;
  mrr: number;
  retentionRate: number;
}
