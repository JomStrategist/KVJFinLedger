"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

export function RevenueVsExpenseChart({ data }: { data: RevenueVsExpenseTrend[] }) {
  // If data is empty or partial, ensure standard FY months are represented
  const defaultMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const chartData = defaultMonths.map(month => {
    const existing = data?.find(d => d.month?.toLowerCase().includes(month.toLowerCase()));
    return {
      month,
      revenue: existing ? existing.revenue : 0,
      expenses: existing ? existing.expenses : 0,
    };
  });

  // If we have actual months that are not in defaultMonths, use the actual data
  const finalData = (data && data.length > 0) ? data.map(d => ({
    ...d,
    month: d.month.split(' ')[0] // e.g. "Aug" from "Aug 2026"
  })) : chartData;

  return (
    <div className="h-80 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={finalData}
          margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
          barGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5ECE7" vertical={false} />
          <XAxis 
            dataKey="month" 
            tickLine={false}
            axisLine={{ stroke: '#D9E3DC' }}
            tick={{ fill: '#68756C', fontSize: 11 }}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#68756C', fontSize: 11 }}
            tickFormatter={(val) => val === 0 ? '0' : `₹${val >= 100000 ? (val / 100000).toFixed(1) + 'L' : (val / 1000).toFixed(0) + 'k'}`}
          />
          <RechartsTooltip 
            formatter={(value: any) => formatCurrency(Number(value))} 
            contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D9E3DC', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontSize: '12px' }}
          />
          <Legend 
            verticalAlign="bottom" 
            align="left" 
            wrapperStyle={{ paddingTop: '16px', paddingLeft: '10px' }}
            formatter={(value) => <span className="text-xs font-semibold text-theme-text-muted">{value}</span>}
          />
          <Bar dataKey="revenue" name="Revenue" fill="#177B55" barSize={16} radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expense" fill="#B27A17" barSize={16} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OperatingResultChart({ data }: { data: RevenueVsExpenseTrend[] }) {
  const resultData = data.map(d => ({
    month: d.month,
    result: d.revenue - d.expenses
  }));

  if (!resultData || resultData.length === 0) {
    return <div className="flex items-center justify-center h-64 text-theme-text-muted">No data available for the selected period.</div>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={resultData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(val) => `₹${val / 1000}k`} />
          <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
          <Legend />
          <Bar dataKey="result" name="Operating Result">
            {resultData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#3B82F6' : '#EF4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExpenseCategoryChart({ data }: { data: ExpenseCategory[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-theme-text-muted">No expense data available.</div>;
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
                <span className="text-theme-text truncate max-w-[150px]">{entry.category}</span>
              </div>
              <span className="font-medium text-theme-text">{entry.percentage.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
