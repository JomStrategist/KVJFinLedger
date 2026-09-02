"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';

interface RevenueVsExpenseTrend {
  month: string;
  revenue: number;
  expenses: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ALL_FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export const RevenueVsExpenseChart = React.memo(function RevenueVsExpenseChart({ data }: { data: RevenueVsExpenseTrend[] }) {
  const finalData = useMemo(() => {
    return ALL_FY_MONTHS.map(m => {
      const found = data?.find(d => d.month?.toLowerCase().startsWith(m.toLowerCase()));
      return {
        month: m,
        revenue: found ? Number(found.revenue || 0) : 0,
        expenses: found ? Number(found.expenses || 0) : 0,
      };
    });
  }, [data]);

  return (
    <div className="h-80 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={finalData}
          margin={{ top: 15, right: 10, left: -15, bottom: 10 }}
          barGap={4}
        >
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={1} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D97706" stopOpacity={1} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.85} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.6} />

          <XAxis 
            dataKey="month" 
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }}
            tickFormatter={(val) => val === 0 ? '0' : `₹${val >= 100000 ? (val / 100000).toFixed(1) + 'L' : (val / 1000).toFixed(0) + 'k'}`}
          />
          
          <RechartsTooltip 
            cursor={{ fill: 'rgba(15, 118, 110, 0.06)', radius: 6 }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const rev = Number(payload[0]?.value || 0);
                const exp = Number(payload[1]?.value || 0);
                return (
                  <div className="bg-[#17211B] text-white p-3 rounded-xl shadow-2xl border border-white/10 text-xs space-y-1.5 min-w-[140px]">
                    <p className="font-bold text-white/90 border-b border-white/10 pb-1">{label} FY 2026–27</p>
                    <div className="flex justify-between items-center font-medium gap-3">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Revenue:
                      </span>
                      <span className="font-bold text-white">{formatCurrency(rev)}</span>
                    </div>
                    <div className="flex justify-between items-center font-medium gap-3">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span> Expense:
                      </span>
                      <span className="font-bold text-white">{formatCurrency(exp)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          <Legend 
            verticalAlign="top" 
            align="right" 
            wrapperStyle={{ paddingBottom: '16px' }}
            formatter={(value) => <span className="text-xs font-bold text-theme-text">{value}</span>}
          />

          <Bar dataKey="revenue" name="Revenue" fill="url(#revenueGrad)" barSize={14} radius={[5, 5, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="expenses" name="Expense" fill="url(#expenseGrad)" barSize={14} radius={[5, 5, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export const OperatingResultChart = React.memo(function OperatingResultChart({ data }: { data: RevenueVsExpenseTrend[] }) {
  const resultData = useMemo(() => {
    return (data || []).map(d => ({
      month: d.month,
      result: d.revenue - d.expenses
    }));
  }, [data]);

  if (!resultData || resultData.length === 0) {
    return <div className="flex items-center justify-center h-64 text-[#68756C]">No data available for the selected period.</div>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={resultData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(val) => `₹${val / 1000}k`} />
          <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
          <Legend />
          <Bar dataKey="result" name="Operating Result" isAnimationActive={false}>
            {resultData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#3B82F6' : '#EF4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export const ExpenseCategoryChart = React.memo(function ExpenseCategoryChart({ data }: { data: ExpenseCategory[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-[#68756C]">No expense data available.</div>;
  }

  return (
    <div className="h-80 w-full flex flex-col md:flex-row items-center">
      <div className="w-full md:w-1/2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="amount"
              nameKey="category"
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full md:w-1/2 mt-4 md:mt-0">
        <ul className="space-y-2">
          {data.map((entry, index) => (
            <li key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-[#17211B] truncate max-w-[150px]">{entry.category}</span>
              </div>
              <span className="font-medium text-[#17211B]">{entry.percentage.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});
