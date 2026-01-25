'use client';

import React, { useRef, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

interface Props {
  label?: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  colorTheme: 'blue' | 'red';
  size?: 'sm' | 'md';
}

export default function NumberInput({ label, value, min, max, onChange, colorTheme, size = 'sm' }: Props) {
  const isBlue = colorTheme === 'blue';
  
  // 롱프레스(꾹 누르기)를 위한 Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // 연속 실행용
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);  // 딜레이 감지용
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // 렌더링 될 때마다 최신 값 갱신 (클로저 문제 해결)
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  // 스타일 설정
  const containerBorder = isBlue 
    ? "border-blue-500/30 bg-blue-950/30 hover:border-blue-500/60" 
    : "border-red-500/30 bg-red-950/30 hover:border-red-500/60";
  
  const iconColor = isBlue ? "text-blue-400 hover:text-blue-200" : "text-red-400 hover:text-red-200";
  const textColor = isBlue ? "text-blue-300" : "text-red-300";

  const containerPadding = size === 'md' ? "p-1" : "p-0.5";
  const inputWidth = size === 'md' ? "w-9" : "w-7";
  const textSize = size === 'md' ? "text-sm" : "text-xs";
  const iconSize = size === 'md' ? 14 : 12;

  // 값 변경 실행 함수
  const executeChange = (delta: number) => {
    const current = valueRef.current;
    const next = current + delta;
    if (next >= min && next <= max) {
      onChangeRef.current(next);
    }
  };

  // [수정] 연속 조절 시작 (안전 딜레이 추가)
  const startChange = (delta: number) => {
    // 1. 즉시 1회 실행 (클릭감)
    executeChange(delta);

    // 2. 0.5초(500ms) 대기 후 연속 실행 시작 (롱프레스 판정)
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        executeChange(delta);
      }, 100); // 연속 실행 속도 (0.1초)
    }, 500); // 롱프레스 대기 시간 (여기서 짧게 누르면 취소됨)
  };

  // [수정] 조절 중단 (타이머 모두 해제)
  const stopChange = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      {label && (
        <span className={`text-[9px] font-black uppercase tracking-widest ${isBlue ? 'text-slate-400' : 'text-slate-400'}`}>
          {label}
        </span>
      )}
      
      <div className={`flex items-center justify-between rounded-lg border ${containerBorder} ${containerPadding} transition-all shadow-sm`}>
        {/* 감소 버튼 */}
        <button 
          onMouseDown={() => startChange(-1)}
          onMouseUp={stopChange}
          onMouseLeave={stopChange}
          onTouchStart={() => startChange(-1)} // 모바일 대응
          onTouchEnd={stopChange}
          disabled={value <= min}
          className={`p-1 rounded hover:bg-white/10 active:scale-95 transition-all ${value <= min ? 'opacity-30 cursor-not-allowed' : iconColor}`}
        >
          <Minus size={iconSize} strokeWidth={3} />
        </button>

        {/* 숫자 입력창 */}
        <input 
          type="number" 
          value={value} 
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val)) {
              // 입력 시에도 Max값 못 넘기게 강제 고정
              onChange(Math.min(max, Math.max(min, val)));
            }
          }}
          className={`${inputWidth} bg-transparent text-center font-black ${textColor} ${textSize} outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]`}
        />

        {/* 증가 버튼 */}
        <button 
          onMouseDown={() => startChange(1)}
          onMouseUp={stopChange}
          onMouseLeave={stopChange}
          onTouchStart={() => startChange(1)} // 모바일 대응
          onTouchEnd={stopChange}
          disabled={value >= max}
          className={`p-1 rounded hover:bg-white/10 active:scale-95 transition-all ${value >= max ? 'opacity-30 cursor-not-allowed' : iconColor}`}
        >
          <Plus size={iconSize} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}