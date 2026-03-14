'use client';

import React, { useState } from 'react';
import { ShipConfig } from '@/types';
import { Ship, Minus, Plus } from 'lucide-react';

interface Props {
  fleetConfig: ShipConfig[];
  setFleetConfig: (config: ShipConfig[]) => void;
}

interface NumberInputProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  colorTheme: 'blue' | 'red';
}

function NumberInput({ label, value, min, max, onChange, colorTheme }: NumberInputProps) {
  const isBlue = colorTheme === 'blue';
  const active = isBlue
    ? 'bg-blue-500 text-white border-blue-500'
    : 'bg-red-500 text-white border-red-500';
  const base = isBlue
    ? 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
    : 'bg-white text-red-600 border-red-200 hover:bg-red-50';
  const badge = isBlue
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-red-50 text-red-700 border-red-200';

  return (
    <div className="flex items-center gap-1">
      {label && <span className={`text-[10px] font-black uppercase tracking-wider mr-1 ${isBlue ? 'text-blue-600' : 'text-red-600'}`}>{label}</span>}
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={`w-6 h-6 rounded border text-xs font-black flex items-center justify-center transition-all
          ${value <= min ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : `${base} border`}`}
      >
        <Minus size={10} strokeWidth={3} />
      </button>
      <span className={`w-8 h-6 rounded border text-center text-[12px] font-black flex items-center justify-center ${badge}`}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={`w-6 h-6 rounded border text-xs font-black flex items-center justify-center transition-all
          ${value >= max ? `${active} opacity-70 cursor-not-allowed border-transparent` : `${base} border`}`}
      >
        <Plus size={10} strokeWidth={3} />
      </button>
    </div>
  );
}

export default function ShipConfiguration({ fleetConfig, setFleetConfig }: Props) {
  const [batchTotal, setBatchTotal] = useState(10);
  const [batchCombat, setBatchCombat] = useState(3);

  const handleRowChange = (updatedShip: ShipConfig) => {
    setFleetConfig(fleetConfig.map(s => s.id === updatedShip.id ? updatedShip : s));
  };

  const handleBatchTotalChange = (val: number) => {
    const v = Math.min(11, Math.max(8, val));
    setBatchTotal(v);
    setFleetConfig(fleetConfig.map(ship => ({ ...ship, 총선실: v })));
  };

  const handleBatchCombatChange = (val: number) => {
    const v = Math.min(5, Math.max(0, val));
    setBatchCombat(v);
    setFleetConfig(fleetConfig.map(ship => ({ ...ship, 전투선실: v })));
  };

  return (
    <div className="relative z-0 mt-2">
      {/* 헤더 */}
      <div className="bg-indigo-600 px-4 py-2.5 rounded-t-xl border-b-2 border-indigo-500 shadow-sm">
        <h2 className="text-[13px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Ship size={16} strokeWidth={2.5} />
          함대 설정 (Fleet Config)
        </h2>
      </div>

      <div className="bg-slate-50 rounded-b-xl p-3 border border-slate-200">

        {/* 일괄 설정 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 mb-3 rounded-xl border border-slate-200 shadow-sm gap-3 sm:gap-0">
          <span className="text-[13px] font-black text-indigo-600 border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0 pr-3 pl-1 whitespace-nowrap">
            전체 함대 일괄설정
          </span>
          <div className="flex items-center gap-4 sm:pr-2">
            <NumberInput label="TOTAL" value={batchTotal} min={8} max={11} onChange={handleBatchTotalChange} colorTheme="blue" />
            <NumberInput label="COMBAT" value={batchCombat} min={0} max={5} onChange={handleBatchCombatChange} colorTheme="red" />
          </div>
        </div>

        {/* 개별 함선 */}
        <div className="space-y-1.5">
          {fleetConfig.map((ship) => (
            <div key={ship.id} className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-indigo-400 rounded-full" />
                <span className="font-black text-[14px] italic text-indigo-600 whitespace-nowrap">
                  {ship.id}번 함선
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
                <div className="flex justify-between sm:justify-end items-center gap-3">
                  <span className="text-sm font-bold text-slate-500 sm:hidden">총 선실:</span>
                  <NumberInput value={ship.총선실} min={8} max={11} onChange={(val) => handleRowChange({ ...ship, 총선실: val })} colorTheme="blue" />
                </div>
                <div className="flex justify-between sm:justify-end items-center gap-3">
                  <span className="text-sm font-bold text-slate-500 sm:hidden">전투 선실:</span>
                  <NumberInput value={ship.전투선실} min={0} max={5} onChange={(val) => handleRowChange({ ...ship, 전투선실: val })} colorTheme="red" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}