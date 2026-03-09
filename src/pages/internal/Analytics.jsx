import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Clock, Users, ArrowUp, ArrowDown, CheckCircle } from 'lucide-react';

const Analytics = () => {
  const [timeframe, setTimeframe] = useState('month');

  const metrics = {
    revenue: { current: 125000, previous: 118000, change: 5.9 },
    customers: { current: 42, previous: 39, change: 7.7 },
    avgResponseTime: { current: 2.8, previous: 3.2, change: -12.5 },
    completionRate: { current: 98.5, previous: 96.2, change: 2.4 },
  };

  const revenueData = [
    { month: 'Jan', revenue: 98000 },
    { month: 'Feb', revenue: 102000 },
    { month: 'Mar', revenue: 108000 },
    { month: 'Apr', revenue: 115000 },
    { month: 'May', revenue: 118000 },
    { month: 'Jun', revenue: 125000 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/internal/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back</Link>
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
            <p className="text-gray-400">Performance metrics and insights</p>
          </div>
          <div className="flex gap-2">
            {['week', 'month', 'quarter', 'year'].map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-lg font-medium capitalize ${
                  timeframe === period ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}>
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-400" />
              <div className="flex items-center gap-1 text-sm text-green-400">
                <ArrowUp className="w-4 h-4" />
                {metrics.revenue.change}%
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-white">${(metrics.revenue.current / 1000).toFixed(0)}K</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <div className="flex items-center gap-1 text-sm text-green-400">
                <ArrowUp className="w-4 h-4" />
                {metrics.customers.change}%
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Active Customers</p>
            <p className="text-3xl font-bold text-white">{metrics.customers.current}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-amber-400" />
              <div className="flex items-center gap-1 text-sm text-green-400">
                <ArrowDown className="w-4 h-4" />
                {Math.abs(metrics.avgResponseTime.change)}%
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Avg Response Time</p>
            <p className="text-3xl font-bold text-white">{metrics.avgResponseTime.current}h</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div className="flex items-center gap-1 text-sm text-green-400">
                <ArrowUp className="w-4 h-4" />
                {metrics.completionRate.change}%
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Completion Rate</p>
            <p className="text-3xl font-bold text-white">{metrics.completionRate.current}%</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-6">Revenue Trend</h3>
          <div className="space-y-4">
            {revenueData.map((data, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">{data.month}</span>
                  <span className="text-white font-semibold">${(data.revenue / 1000).toFixed(0)}K</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full"
                    style={{ width: `${(data.revenue / 125000) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
