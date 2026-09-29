'use client';

import { Upload, Settings2, HelpCircle, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

// Mock data matching the screenshot
const MOCK_HOLDINGS = [
  {
    ticker: 'VOO',
    name: 'Vanguard 500 Ind...',
    quantity: 9.3169,
    price: 710.78,
    pricePrev: 711.41,
    changePct: 0.54,
    changePctPrev: 0.09,
    dailyPnL: 35.31,
    avgPrice: 668.09,
    costBasis: 6224.53,
    marketValue: 6622.27,
    marketValuePrev: 6628.14,
    unrealizedPnL: 397.74,
    unrealizedPnLPct: 6.39,
    allocation: 34.51,
    color: 'bg-red-500',
  },
  {
    ticker: 'QQQM',
    name: 'Invesco NASDAQ ...',
    quantity: 20.4821,
    price: 306.54,
    pricePrev: 306.8,
    changePct: 0.46,
    changePctPrev: 0.08,
    dailyPnL: 28.67,
    avgPrice: 253.26,
    costBasis: 5187.23,
    marketValue: 6278.58,
    marketValuePrev: 6283.91,
    unrealizedPnL: 1091.35,
    unrealizedPnLPct: 21.04,
    allocation: 32.72,
    color: 'bg-blue-600',
  },
  {
    ticker: 'NFLX',
    name: 'Netflix, Inc.',
    quantity: 32.5441,
    price: 71.15,
    pricePrev: 71.17,
    changePct: -0.80,
    changePctPrev: 0.04,
    dailyPnL: -18.71,
    avgPrice: 73.68,
    costBasis: 2397.96,
    marketValue: 2315.35,
    marketValuePrev: 2316.16,
    unrealizedPnL: -82.61,
    unrealizedPnLPct: -3.44,
    allocation: 12.06,
    color: 'bg-red-600',
  },
  {
    ticker: 'META',
    name: 'Meta Platforms, I...',
    quantity: 2.8,
    price: 751.66,
    pricePrev: 747.85,
    changePct: -3.33,
    changePctPrev: -0.45,
    dailyPnL: -72.6,
    avgPrice: 591.92,
    costBasis: 1657.38,
    marketValue: 2104.65,
    marketValuePrev: 2093.98,
    unrealizedPnL: 447.27,
    unrealizedPnLPct: 26.99,
    allocation: 10.97,
    color: 'bg-blue-500',
  },
  {
    ticker: 'DUOL',
    name: 'Duolingo, Inc.',
    quantity: 13.1862,
    price: 143.51,
    pricePrev: 143.98,
    changePct: -2.87,
    changePctPrev: 0.29,
    dailyPnL: -55.91,
    avgPrice: 154.97,
    costBasis: 2043.45,
    marketValue: 1892.35,
    marketValuePrev: 1898.55,
    unrealizedPnL: -151.1,
    unrealizedPnLPct: -7.39,
    allocation: 9.86,
    color: 'bg-green-500',
  },
  {
    ticker: 'SPGI',
    name: 'S&P Global Inc.',
    quantity: 3.7319,
    price: 403.21,
    pricePrev: 403.5,
    changePct: -0.01,
    changePctPrev: 0.07,
    dailyPnL: -0.1493,
    avgPrice: 441.48,
    costBasis: 1647.54,
    marketValue: 1504.74,
    marketValuePrev: 1505.82,
    unrealizedPnL: -142.81,
    unrealizedPnLPct: -8.67,
    allocation: 7.84,
    color: 'bg-red-700',
  },
  {
    ticker: 'CRM',
    name: 'Salesforce, Inc.',
    quantity: 3.9306,
    price: 234.08,
    pricePrev: 234.3,
    changePct: -1.74,
    changePctPrev: 0.10,
    dailyPnL: -16.29,
    avgPrice: 210.19,
    costBasis: 826.17,
    marketValue: 920.06,
    marketValuePrev: 920.94,
    unrealizedPnL: 93.88,
    unrealizedPnLPct: 11.36,
    allocation: 4.79,
    color: 'bg-blue-400',
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporati...',
    quantity: 2.0104,
    price: 225.07,
    pricePrev: 225,
    changePct: 0.22,
    changePctPrev: -0.03,
    dailyPnL: 0.9851,
    avgPrice: 202.15,
    costBasis: 406.4,
    marketValue: 452.48,
    marketValuePrev: 452.34,
    unrealizedPnL: 46.08,
    unrealizedPnLPct: 11.34,
    allocation: 2.36,
    color: 'bg-green-600',
  },
  {
    ticker: 'QQQ',
    name: 'Invesco QQQ Trust',
    quantity: -3.8954,
    price: 744.42,
    pricePrev: 745.4,
    changePct: 0.45,
    changePctPrev: 0.13,
    dailyPnL: -12.93,
    avgPrice: 0,
    costBasis: 0,
    marketValue: -2899.81,
    marketValuePrev: -2899.81,
    unrealizedPnL: -2899.81,
    unrealizedPnLPct: 0.00,
    allocation: -15.11,
    color: 'bg-blue-600',
  }
];

export default function InvestmentsPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-20 w-full animate-in fade-in duration-500">
      
      {/* Header & Chart Area Mock */}
      <div className="flex justify-between items-start mt-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">$20,464.45</h1>
          <div className="flex items-center gap-2 mt-1 text-sm">
            <span className="text-red-400 flex items-center font-medium">
              <TrendingDown className="w-4 h-4 mr-1" />
              $16.01 <span className="text-stone-500 ml-1">-1T</span>
            </span>
            <span className="text-stone-500 mx-2">•</span>
            <span className="text-stone-400">
              $18,177.33 <span className="text-green-400 ml-1">+0.03%</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="cursor-pointer bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium">
            <Upload className="w-4 h-4 text-stone-400" />
            <span>Upload IBKR CSV</span>
            <input type="file" multiple accept=".csv" className="hidden" />
          </label>
        </div>
      </div>

      {/* Mock Chart Area */}
      <div className="h-[250px] w-full border-b border-white/5 relative">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
          <path d="M0,150 C50,100 100,20 150,20 C200,20 220,120 250,120 C280,120 300,90 350,90 C400,90 420,130 450,130 C500,130 520,70 550,70 C580,70 600,160 650,160 C700,160 720,40 750,40 C800,40 820,140 850,140 C900,140 950,160 1000,160" fill="none" stroke="#6366f1" strokeWidth="2" />
        </svg>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <h2 className="text-xl font-semibold">Holdings</h2>
      </div>

      {/* Holdings Table */}
      <div className="w-full overflow-x-auto bg-[#1A1A1E]/50 border border-white/5 rounded-2xl">
        <table className="w-full text-[13px] text-left whitespace-nowrap">
          <thead className="text-[11px] uppercase tracking-wider text-stone-400 border-b border-white/10 bg-white/[0.02]">
            <tr>
              <th className="px-3 py-3 font-medium rounded-tl-2xl">Name</th>
              <th className="px-2 py-3 font-medium text-right">Qty</th>
              <th className="px-2 py-3 font-medium text-right">Price</th>
              <th className="px-2 py-3 font-medium text-right">% Change</th>
              <th className="px-2 py-3 font-medium text-right">Daily P&L</th>
              <th className="px-2 py-3 font-medium text-right">Avg Price</th>
              <th className="px-2 py-3 font-medium text-right">Cost Basis</th>
              <th className="px-2 py-3 font-medium text-right flex items-center justify-end gap-1">Mkt Value <Settings2 className="w-3 h-3"/></th>
              <th className="px-2 py-3 font-medium text-right">Unrlzd P&L</th>
              <th className="px-2 py-3 font-medium text-right flex items-center justify-end gap-1"><HelpCircle className="w-3 h-3"/> Unrlzd %</th>
              <th className="px-3 py-3 font-medium text-right rounded-tr-2xl">Alloc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {MOCK_HOLDINGS.map((pos, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full ${pos.color} flex items-center justify-center text-[10px] font-bold shadow-sm`}>
                      {pos.ticker.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-stone-200 flex items-center gap-1.5">
                        {pos.ticker}
                        <Building2 className="w-3 h-3 text-stone-500" />
                      </div>
                      <div className="text-[11px] text-stone-500 truncate max-w-[120px]">{pos.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2 text-right text-stone-300 font-medium">
                  {pos.quantity}
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="text-stone-200">${pos.price.toFixed(2)}</div>
                  <div className="text-[11px] text-stone-500">☾ ${pos.pricePrev.toFixed(2)}</div>
                </td>
                <td className="px-2 py-2 text-right">
                  <div className={`${pos.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pos.changePct >= 0 ? '+' : ''}{pos.changePct.toFixed(2)}%
                  </div>
                  <div className={`text-[11px] ${pos.changePctPrev >= 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>
                    ☾ {pos.changePctPrev >= 0 ? '+' : ''}{pos.changePctPrev.toFixed(2)}%
                  </div>
                </td>
                <td className="px-2 py-2 text-right">
                  <div className={`${pos.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pos.dailyPnL >= 0 ? '+' : ''}${Math.abs(pos.dailyPnL).toFixed(2)}
                  </div>
                </td>
                <td className="px-2 py-2 text-right text-stone-300">
                  ${pos.avgPrice.toFixed(2)}
                </td>
                <td className="px-2 py-2 text-right text-stone-300">
                  ${pos.costBasis.toFixed(2)}
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="text-stone-200">${pos.marketValue.toFixed(2)}</div>
                  <div className="text-[11px] text-stone-500">☾ ${pos.marketValuePrev.toFixed(2)}</div>
                </td>
                <td className="px-2 py-2 text-right">
                  <div className={`${pos.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pos.unrealizedPnL >= 0 ? '+' : ''}${Math.abs(pos.unrealizedPnL).toFixed(2)}
                  </div>
                </td>
                <td className="px-2 py-2 text-right">
                  <div className={`${pos.unrealizedPnLPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pos.unrealizedPnLPct >= 0 ? '+' : ''}{pos.unrealizedPnLPct.toFixed(2)}%
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-stone-300">
                  {pos.allocation.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-white/10 bg-white/[0.01]">
            <tr>
              <td className="px-3 py-3 text-stone-400 font-medium rounded-bl-2xl">Total</td>
              <td colSpan={3}></td>
              <td className="px-2 py-3 text-right text-red-400 font-medium">-$111.63</td>
              <td colSpan={1}></td>
              <td className="px-2 py-3 text-right text-stone-300 font-medium">$20,390.67</td>
              <td className="px-2 py-3 text-right text-stone-300 font-medium">$19,190.66</td>
              <td className="px-2 py-3 text-right text-red-400 font-medium">-$1,200.00</td>
              <td className="px-2 py-3 text-right text-red-400 font-medium">-5.89%</td>
              <td className="px-3 py-3 text-right text-stone-300 font-medium rounded-br-2xl flex items-center justify-end gap-1">100.00% <HelpCircle className="w-3 h-3 text-stone-500"/></td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
