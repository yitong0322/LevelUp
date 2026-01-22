import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { PointLog } from '../types';
import { TrendingUp, Calendar, ChevronDown, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: PointLog[];
}

type TimeRange = '1W' | '1M' | '3M' | '6M';

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, logs }) => {
  const [range, setRange] = useState<TimeRange>('1W');

  // --- Logic ---
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  const rangeConfig = {
    '1W': oneDay * 7,
    '1M': oneDay * 30,
    '3M': oneDay * 90,
    '6M': oneDay * 180,
  };

  const filteredLogs = useMemo(() => {
    // Sort descending (Newest first) for list
    return [...logs].sort((a, b) => b.timestamp - a.timestamp);
  }, [logs]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const cutoff = now - rangeConfig[range];
    const relevantLogs = logs.filter(l => l.timestamp >= cutoff);
    
    // Group by Day
    const dailyMap = new Map<string, number>();
    
    // Initialize all days in range with 0
    for (let i = 0; i <= rangeConfig[range] / oneDay; i++) {
        const d = new Date(cutoff + (i * oneDay));
        const key = d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
        dailyMap.set(key, 0);
    }

    relevantLogs.forEach(log => {
        const d = new Date(log.timestamp);
        const key = d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
        const current = dailyMap.get(key) || 0;
        dailyMap.set(key, current + log.change);
    });

    return Array.from(dailyMap.entries()).map(([date, value]) => ({ date, value }));
  }, [logs, range]);

  // SVG Chart Calculations
  const chartHeight = 150;
  const chartWidth = 500;
  const maxVal = Math.max(...chartData.map(d => d.value), 10);
  const minVal = Math.min(...chartData.map(d => d.value), -10);
  const rangeY = maxVal - minVal;
  
  const getX = (index: number) => (index / (chartData.length - 1)) * chartWidth;
  const getY = (value: number) => chartHeight - ((value - minVal) / rangeY) * chartHeight;

  const polylinePoints = chartData
    .map((d, i) => `${getX(i)},${getY(d.value)}`)
    .join(' ');

  const isThisWeek = (timestamp: number) => {
    return timestamp >= now - (oneDay * 7);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stats Dashboard 📊">
      <div className="flex flex-col h-[600px] overflow-hidden">
        
        {/* --- Top Section: Chart --- */}
        <div className="bg-white p-4 border-b-2 border-slate-100 shrink-0">
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2">
                 <Activity className="text-indigo-500" size={20} />
                 <h3 className="font-bold text-slate-700">Daily Activity</h3>
             </div>
             
             {/* Range Selector */}
             <div className="flex bg-slate-100 rounded-lg p-1">
                {(['1W', '1M', '3M', '6M'] as TimeRange[]).map((r) => (
                    <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            range === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {r}
                    </button>
                ))}
             </div>
          </div>

          {/* Chart Area */}
          <div className="w-full overflow-x-auto">
             <div className="min-w-[500px] relative h-[180px] border-l border-b border-slate-100">
                {/* Zero Line */}
                <div 
                    className="absolute w-full border-t border-slate-200 border-dashed"
                    style={{ top: getY(0) }}
                />

                <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
                    <defs>
                         <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                        </linearGradient>
                    </defs>
                    <polyline 
                        fill="none" 
                        stroke="#6366f1" 
                        strokeWidth="3" 
                        points={polylinePoints} 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                     {/* Data Points */}
                     {chartData.map((d, i) => (
                        <circle 
                            key={i} 
                            cx={getX(i)} 
                            cy={getY(d.value)} 
                            r="3" 
                            className="fill-white stroke-indigo-500 stroke-2 hover:r-4 transition-all"
                        >
                            <title>{d.date}: {d.value > 0 ? '+' : ''}{d.value}</title>
                        </circle>
                     ))}
                </svg>
                
                {/* Labels */}
                <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold uppercase">
                    <span>{chartData[0]?.date}</span>
                    <span>{chartData[chartData.length - 1]?.date}</span>
                </div>
             </div>
          </div>
        </div>

        {/* --- Bottom Section: History List --- */}
        <div className="flex-1 bg-slate-50 overflow-y-auto p-4">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 sticky top-0 bg-slate-50 py-2 z-10 flex items-center gap-2">
                <Calendar size={12} /> Point History
             </h3>

             <div className="space-y-2">
                {filteredLogs.map((log) => {
                    const highlight = isThisWeek(log.timestamp);
                    return (
                        <div 
                            key={log.id} 
                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                highlight 
                                ? 'bg-indigo-50 border-indigo-100 shadow-sm' 
                                : 'bg-white border-slate-100'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    log.change > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                                }`}>
                                   {log.change > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700 text-sm">{log.reason}</div>
                                    <div className="text-[10px] text-slate-400 font-bold">
                                        {new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            </div>
                            <div className={`text-sm font-black ${log.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {log.change > 0 ? '+' : ''}{log.change}
                            </div>
                        </div>
                    );
                })}
             </div>
        </div>

      </div>
    </Modal>
  );
};
