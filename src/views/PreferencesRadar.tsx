import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Save, RotateCcw } from 'lucide-react';
import {
  getPreferenceSnapshot,
  savePreferenceSnapshot,
  type PreferenceSnapshot,
} from '../db/indexedDB';

export interface RadarTopic {
  name: string;
  value: number;
}

const DEFAULT_TOPICS: RadarTopic[] = [
  { name: 'Frontend', value: 82 },
  { name: 'Backend', value: 90 },
  { name: 'AI', value: 70 },
  { name: 'System Design', value: 75 },
  { name: 'DevOps', value: 60 },
  { name: 'IoT', value: 45 },
];

const TOPIC_KEYWORDS = [
  'Frontend',
  'Backend',
  'AI',
  'System Design',
  'DevOps',
  'IoT',
] as const;

export interface PreferencesRadarProps {
  onSaved?: (snapshot: PreferenceSnapshot) => void;
}

export function PreferencesRadar({ onSaved }: PreferencesRadarProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const [topics, setTopics] = useState<RadarTopic[]>(DEFAULT_TOPICS);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('KÉO CÁC ĐỈNH ĐỂ ĐIỀU CHỈNH ƯU TIÊN CHỦ ĐỀ');

  useEffect(() => {
    let mounted = true;
    void getPreferenceSnapshot().then((snapshot) => {
      if (!mounted || !snapshot) return;
      const next = DEFAULT_TOPICS.map((topic) => {
        const value = snapshot.scores[topic.name];
        return { ...topic, value: typeof value === 'number' ? value : topic.value };
      });
      setTopics(next);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      radar: {
        indicator: topics.map((topic) => ({ name: topic.name, max: 100 })),
        radius: '68%',
        splitNumber: 4,
        axisName: {
          color: '#FF5E00',
          fontSize: 11,
          fontFamily: '"JetBrains Mono", monospace',
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(255,30,30,0.04)', 'rgba(255,30,30,0.08)'],
          },
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,30,30,0.25)' },
        },
        axisLine: {
          lineStyle: { color: 'rgba(255,30,30,0.4)' },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: topics.map((t) => t.value),
              name: 'Kiến thức L.H.T',
              areaStyle: {
                color: 'rgba(255,30,30,0.35)',
                shadowColor: 'rgba(255,30,30,0.6)',
                shadowBlur: 20,
              },
              lineStyle: { color: '#FF1E1E', width: 2 },
              itemStyle: {
                color: '#FF1E1E',
                borderColor: '#FF5E00',
                borderWidth: 2,
                shadowColor: '#FF1E1E',
                shadowBlur: 12,
              },
              symbol: 'circle',
              symbolSize: 12,
            },
          ],
        },
      ],
    };
  }, [topics]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    chartInstanceRef.current = chart;
    chart.setOption(option);

    const handleClick = (params: unknown) => {
      const p = params as { dataIndex?: number; value?: number } | null;
      if (!p || typeof p.dataIndex !== 'number') return;
      // Nhấp vào đỉnh sẽ +10 điểm ưu tiên cho chủ đề đó.
      setTopics((prev) =>
        prev.map((topic, idx) =>
          idx === p.dataIndex ? { ...topic, value: Math.min(100, topic.value + 10) } : topic
        )
      );
    };
    chart.on('click', handleClick);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      chart.off('click', handleClick);
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [option]);

  const syncChartValue = (index: number, value: number) => {
    const clamped = Math.max(5, Math.min(100, Math.round(value)));
    setTopics((prev) => prev.map((t, i) => (i === index ? { ...t, value: clamped } : t)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const snapshot: PreferenceSnapshot = {
      id: 'radar-preference',
      topics: topics.map((t) => t.name),
      scores: Object.fromEntries(topics.map((t) => [t.name, t.value])),
      suggested_rss_urls: [],
      updated_at: Date.now(),
    };
    await savePreferenceSnapshot(snapshot);
    setIsSaving(false);
    setStatus('ĐÃ LƯU RADAR ƯU TIÊN — L.H.T SẼ TINH CHỈNH RSS NGÀY MAI');
    onSaved?.(snapshot);
  };

  const handleReset = () => {
    setTopics(DEFAULT_TOPICS);
    setStatus('ĐÃ KHÔI PHỤC MẶC ĐỊNH');
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-120px)] flex flex-col items-center px-4 pt-2 pb-24">
      <div className="w-full max-w-md flex items-center justify-between px-3 py-2 mb-2 rounded-2xl bg-[#0c0606]/80 backdrop-blur-md border border-[#FF1E1E]/25 shadow-[0_0_15px_rgba(255,30,30,0.15)] font-mono text-[10px]">
        <span className="text-[#FF5E00] tracking-widest">RADAR ƯU TIÊN</span>
        <span className="text-gray-500">TỰ ĐỘNG ĐIỀU CHỈNH RSS</span>
      </div>

      <div ref={chartRef} className="w-full max-w-md h-[60vh]" />

      <div className="w-full max-w-md grid grid-cols-3 gap-2 mt-3">
        {TOPIC_KEYWORDS.map((keyword, index) => {
          const topic = topics.find((t) => t.name === keyword) ?? topics[index];
          return (
            <label key={keyword} className="flex flex-col gap-1 rounded-xl bg-[#0c0606]/80 border border-[#FF1E1E]/25 p-2">
              <span className="font-mono text-[9px] text-[#FF5E00] uppercase">{keyword}</span>
              <input
                type="range"
                min={5}
                max={100}
                value={topic?.value ?? 50}
                onChange={(e) => syncChartValue(index, Number(e.target.value))}
                className="accent-[#FF1E1E] w-full"
              />
              <span className="font-mono text-[10px] text-white text-right">{topic?.value ?? 50}</span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-4 w-full max-w-md">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] font-mono text-xs hover:text-white transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          KHÔI PHỤC
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF1E1E] to-[#8B0000] text-white font-mono text-xs font-bold shadow-[0_0_15px_rgba(255,30,30,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH'}
        </button>
      </div>

      <p className="mt-3 font-mono text-[9px] text-[#FF5E00]/80 text-center max-w-sm leading-relaxed">
        {status}
      </p>
    </div>
  );
}
