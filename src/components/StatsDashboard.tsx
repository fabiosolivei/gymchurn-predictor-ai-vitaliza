import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const CONTRACT_DATA = [
  { name: '1 Month', churn: 40, retention: 60 },
  { name: '6 Months', churn: 15, retention: 85 },
  { name: '12 Months', churn: 5, retention: 95 },
];

const AGE_DATA = [
  { range: '18-25', rate: 35 },
  { range: '26-30', rate: 25 },
  { range: '31-35', rate: 10 },
  { range: '36+', rate: 2 },
];

const COLORS = ['#ef4444', '#3b82f6'];

export default function StatsDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          Churn Rate by Contract Period (%)
        </h3>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CONTRACT_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="churn" fill="#ef4444" radius={[4, 4, 0, 0]} name="Churn %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-4 text-center">
          Insight: Customers on shorter 1-month contracts are significantly more likely to churn.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          Churn Rate by Age Group (%)
        </h3>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={AGE_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="range" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="rate" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Churn Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-4 text-center">
          Insight: Younger gym members exhibit higher churn rates than more mature age groups.
        </p>
      </div>
    </div>
  );
}
