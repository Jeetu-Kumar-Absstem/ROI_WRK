import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from './calculator';

interface ComparisonChartsProps {
    yearlyData: any[];
    absstemPower: number;
    competitionPower: number;
    absstemAnnualCost: number;
    competitionAnnualCost: number;
}

const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ yearlyData, absstemPower, competitionPower, absstemAnnualCost, competitionAnnualCost }) => {
    const powerData = [
        { name: 'Absstem', value: absstemPower },
        { name: 'Competition', value: competitionPower },
    ];

    const costData = [
        { name: 'Absstem', value: absstemAnnualCost },
        { name: 'Competition', value: competitionAnnualCost },
    ];

    return (
        <div className="space-y-12">
            <div>
                <h4 className="text-xl font-semibold text-gray-800 mb-4">10-Year Cumulative Cost Projection</h4>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={yearlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} isAnimationActive={false}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                        <YAxis tickFormatter={(tick) => formatCurrency(tick)} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="absstemCost" name="Absstem" stroke="#10B981" strokeWidth={2} />
                        <Line type="monotone" dataKey="competitionCost" name="Competition" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-4">Total Input Power Comparison (kW)</h4>
                    <div className="w-full h-[300px]">
                        <BarChart width={500} height={300} data={powerData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" name="Power (kW)" isAnimationActive={false}>
                                <Cell fill="#10B981" /><Cell fill="#3B82F6" />
                            </Bar>
                        </BarChart>
                    </div>
                </div>
                <div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-4">Annual Power Cost Comparison</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={costData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                <Cell fill="#10B981" /><Cell fill="#3B82F6" />
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ComparisonCharts;