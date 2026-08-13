import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Square, Cpu, Globe, Loader2 } from 'lucide-react';
import type { GraphData, GraphNodeData, SyncedNews } from '../db/indexedDB';
import { BottomSheet } from '../components/BottomSheet';
import { apiUrl } from '../config/api';

export interface XRayModeProps {
  items: SyncedNews[];
  onXRayActive?: (active: boolean) => void;
}

interface RenderNode {
  id: string;
  label: string;
  category: 'HARDWARE' | 'SOFTWARE';
  desc?: string;
  x: number;
  y: number;
  z: number;
  r: number;
  sx: number;
  sy: number;
  sr: number;
  alpha: number;
}

const NODE_RADIUS = 16;
const CAMERA_Z = 420;
const ROTATE_SPEED = 0.002;

function collectGraph(items: SyncedNews[]): GraphData {
  const nodes: GraphNodeData[] = [];
  const edges: { source: string; target: string; relation?: string }[] = [];

  for (const item of items) {
    const graph = item.graph_data ?? { nodes: [], edges: [] };
    for (const node of graph.nodes ?? []) {
      if (!nodes.some((n) => n.id === node.id)) nodes.push(node);
    }
    for (const edge of graph.edges ?? []) {
      if (!edges.some((e) => e.source === edge.source && e.target === edge.target)) {
        edges.push(edge);
      }
    }
  }

  return { nodes, edges };
}

function distributeNodes(nodes: GraphNodeData[]): RenderNode[] {
  const rendered: RenderNode[] = [];
  const angleStep = (Math.PI * 2) / Math.max(nodes.length, 1);

  nodes.forEach((node, idx) => {
    const ring = idx % 2;
    const baseAngle = angleStep * idx + ring * 0.5;
    rendered.push({
      id: node.id,
      label: node.label,
      category: node.category,
      desc: node.desc,
      x: Math.cos(baseAngle) * (160 + ring * 60),
      y: Math.sin(baseAngle * 1.3) * (120 + ring * 50) - 10,
      z: Math.sin(baseAngle) * (90 + ring * 60),
      r: NODE_RADIUS,
      sx: 0,
      sy: 0,
      sr: 0,
      alpha: 1,
    });
  });

  return rendered;
}

export function XRayMode({ items, onXRayActive }: XRayModeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<RenderNode[]>([]);
  const edgesRef = useRef<{ source: string; target: string; relation?: string }[]>([]);
  const selectedNodeRef = useRef<RenderNode | null>(null);

  const [selected, setSelected] = useState<{ node: RenderNode; analogy?: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('CHẠM VÀO NODE ĐỂ XEM ẨN DỤ WEB DEV');

  const graphRef = useRef<GraphData>(collectGraph(items));
  const meetingRecognitionRef = useRef<SpeechRecognition | null>(null);
  const meetingTranscriptRef = useRef('');
  const activeRef = useRef(false);

  useEffect(() => {
    graphRef.current = collectGraph(items);
    nodesRef.current = distributeNodes(graphRef.current.nodes);
    edgesRef.current = graphRef.current.edges;
  }, [items]);

  useEffect(() => {
    activeRef.current = true;
    onXRayActive?.(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let rotation = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const drawEdges = (nodes: RenderNode[]) => {
      ctx.strokeStyle = 'rgba(255,30,30,0.35)';
      ctx.lineWidth = 1;
      for (const edge of edgesRef.current) {
        const a = nodes.find((n) => n.id === edge.source);
        const b = nodes.find((n) => n.id === edge.target);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
    };

    const drawNode = (node: RenderNode) => {
      const isHardware = node.category === 'HARDWARE';
      const glowColor = isHardware ? 'rgba(255,30,30,' : 'rgba(255,80,140,';
      const coreColor = isHardware ? '#FF1E1E' : '#FF4D8F';

      const gradient = ctx.createRadialGradient(
        node.sx,
        node.sy,
        0,
        node.sx,
        node.sy,
        node.sr * 3.2
      );
      gradient.addColorStop(0, `${glowColor}${0.35 * node.alpha})`);
      gradient.addColorStop(1, `${glowColor}0)`);

      ctx.beginPath();
      ctx.arc(node.sx, node.sy, node.sr * 3.2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.sx, node.sy, node.sr, 0, Math.PI * 2);
      const sphere = ctx.createRadialGradient(
        node.sx - node.sr * 0.35,
        node.sy - node.sr * 0.35,
        node.sr * 0.1,
        node.sx,
        node.sy,
        node.sr
      );
      sphere.addColorStop(0, isHardware ? '#FF6B6B' : '#FF8FB3');
      sphere.addColorStop(0.5, coreColor);
      sphere.addColorStop(1, '#4a0000');
      ctx.fillStyle = sphere;
      ctx.fill();

      ctx.strokeStyle = `rgba(255,30,30,${0.7 * node.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,255,255,${0.85 * node.alpha})`;
      ctx.fillText(node.label.slice(0, 18), node.sx, node.sy - node.sr - 6);
    };

    const frame = () => {
      if (!activeRef.current) return;
      rotation += ROTATE_SPEED;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ctx.clearRect(0, 0, width, height);

      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);

      const projected: RenderNode[] = nodesRef.current
        .map((node) => {
          const rx = node.x * cos - node.z * sin;
          const rz = node.x * sin + node.z * cos;
          const scale = CAMERA_Z / (CAMERA_Z - rz);
          const sx = width / 2 + rx * scale;
          const sy = height / 2 + node.y * scale;
          const sr = node.r * scale;
          const alpha = Math.max(0.25, Math.min(1, scale / 1.4));
          return { ...node, x: rx, y: node.y, z: rz, sx, sy, sr, alpha };
        })
        .sort((a, b) => a.z - b.z);

      nodesRef.current = projected;
      drawEdges(projected);
      for (const node of projected) drawNode(node);

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      activeRef.current = false;
      window.cancelAnimationFrame(rafId);
      onXRayActive?.(false);
    };
  }, [onXRayActive]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    const hit = [...nodesRef.current]
      .reverse()
      .find((node) => Math.hypot(node.sx - px, node.sy - py) <= Math.max(node.sr + 4, 12));

    if (hit) {
      selectedNodeRef.current = hit;
      const analogy =
        graphRef.current.nodes.find((n) => n.id === hit.id)?.desc ??
        graphRef.current.edges
          .filter((e) => e.source === hit.id || e.target === hit.id)
          .map((e) => e.relation)
          .filter(Boolean)
          .join(' → ');
      setSelected({ node: hit, analogy });
    }
  }, []);

  const stopMeetingRecording = useCallback(() => {
    const recognition = meetingRecognitionRef.current;
    if (recognition) {
      recognition.stop();
    }
  }, []);

  const handleMeetingToggle = useCallback(() => {
    if (isRecording) {
      stopMeetingRecording();
      return;
    }

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setStatusText('TRÌNH DUYỆT KHÔNG HỖ TRỢ NHẬN DẠNG GIỌNG NÓI');
      return;
    }

    meetingTranscriptRef.current = '';
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'vi-VN';

    recognition.onstart = () => {
      setIsRecording(true);
      setStatusText('ĐANG GHI ÂM CUỘC HỌP... NHẤN LẦN NỮA ĐỂ DỪNG');
    };

    recognition.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? '';
        if (result.isFinal) text += chunk;
      }
      meetingTranscriptRef.current += ' ' + text;
    };

    recognition.onend = async () => {
      setIsRecording(false);
      const transcript = meetingTranscriptRef.current.trim();
      if (!transcript) {
        setStatusText('CHẠM VÀO NODE ĐỂ XEM ẨN DỤ WEB DEV');
        return;
      }

      setIsProcessing(true);
      setStatusText('L.H.T ĐANG XỬ LÝ BIÊN BẢN CUỘC HỌP...');
      try {
        const response = await fetch(apiUrl('/api/ai/meeting-note'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const note = (await response.json()) as {
          tasks_for_lam_huet_trung: string[];
          new_technologies: string[];
          speakers: { name: string; said: string }[];
          summary: string;
        };

        const newNodes: GraphNodeData[] = (note.new_technologies ?? []).map((tech, idx) => ({
          id: `meeting-tech-${idx}`,
          label: tech,
          category: 'SOFTWARE',
          desc: 'Công nghệ mới xuất hiện trong cuộc họp.',
        }));

        if (newNodes.length > 0) {
          graphRef.current = {
            ...graphRef.current,
            nodes: [...graphRef.current.nodes, ...newNodes],
            edges: [
              ...graphRef.current.edges,
              ...newNodes.map((n, idx) => ({
                source: graphRef.current.nodes[0]?.id ?? 'root',
                target: n.id,
                relation: 'thảo luận trong họp',
              })),
            ],
          };
          nodesRef.current = distributeNodes(graphRef.current.nodes);
          edgesRef.current = graphRef.current.edges;
        }

        setStatusText(`XONG: ${(note.new_technologies ?? []).length} CÔNG NGHỆ MỚI THÊM VÀO GRAPH • ${(note.tasks_for_lam_huet_trung ?? []).length} VIỆC CẦN LÀM`);
      } catch (err) {
        setStatusText('LỖI XỬ LÝ CUỘC HỌP — KIỂM TRA KẾT NỐI MÁY CHỦ');
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatusText('QUYỀN TRUY CẬP MICRO BỊ TỪ CHỐI');
      }
      setIsRecording(false);
    };

    meetingRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setStatusText('LỖI KHỞI ĐỘNG GHI ÂM');
    }
  }, [isRecording, stopMeetingRecording]);

  return (
    <div className="relative w-full min-h-[calc(100vh-120px)] flex flex-col items-center px-2 pt-2 pb-24 overflow-hidden">
      <div className="w-full max-w-md flex items-center justify-between px-3 py-2 mb-2 rounded-2xl bg-[#0c0606]/80 backdrop-blur-md border border-[#FF1E1E]/25 shadow-[0_0_15px_rgba(255,30,30,0.15)] font-mono text-[10px]">
        <span className="flex items-center gap-1.5 text-[#FF5E00] tracking-wider">
          <Cpu className="w-3.5 h-3.5 text-[#FF1E1E]" />
          <span>X-RAY GRAPH 3D</span>
        </span>
        <span className="text-gray-500">{graphRef.current.nodes.length} NODE</span>
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleMeetingToggle();
          }}
          onClick={handleMeetingToggle}
          disabled={isProcessing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold transition-all ${
            isRecording
              ? 'bg-[#FF1E1E] text-white animate-pulse shadow-[0_0_15px_#FF1E1E]'
              : 'bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] hover:text-white'
          }`}
          title="Chế độ cuộc họp — giữ để ghi âm"
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isRecording ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}
          <span>{isRecording ? 'DỪNG HỌP' : 'CHẾ ĐỘ HỌP'}</span>
        </button>
      </div>

      <div className="relative w-full max-w-md h-[65vh]">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-pointer"
        />
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-[#120808]/80 border border-[#FF1E1E]/30 font-mono text-[9px] text-[#FF5E00]/90 whitespace-nowrap">
          {statusText}
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 font-mono text-[9px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF1E1E] shadow-[0_0_6px_#FF1E1E]" />
            PHẦN CỨNG
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D8F] shadow-[0_0_6px_#FF4D8F]" />
            WEB DEV
          </span>
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            ĐANG XOAY
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-2 w-full max-w-md px-3 py-2 rounded-xl bg-[#0c0606]/80 border border-[#FF1E1E]/25 font-mono text-[9px] text-gray-500 leading-relaxed"
      >
        CHẠM NODE: XEM ẨN DỤ WEB DEV • GIỮ NÚT "CHẾ ĐỘ HỌP": GHI ÂM CUỘC HỌP → L.H.T THÊM NODE CÔNG NGHỆ MỚI
      </motion.div>

      <BottomSheet
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title="ẨN DỤ WEB DEV L.H.T"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={`w-4 h-4 rounded-full shadow-[0_0_10px_currentColor] ${
                  selected.node.category === 'HARDWARE'
                    ? 'bg-[#FF1E1E] text-[#FF1E1E]'
                    : 'bg-[#FF4D8F] text-[#FF4D8F]'
                }`}
              />
              <h3 className="font-mono font-bold text-white uppercase tracking-wider">
                {selected.node.label}
              </h3>
              <span className="ml-auto font-mono text-[10px] text-gray-500">
                {selected.node.category === 'HARDWARE' ? 'PHẦN CỨNG' : 'WEB DEV'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FF1E1E]/15 to-[#8B0000]/15 border border-[#FF1E1E]/40 shadow-[0_0_25px_rgba(255,30,30,0.15)]">
              <p className="text-sm text-gray-100 leading-relaxed">
                {selected.analogy ?? 'Chưa có phân tích ẩn dụ cho node này.'}
              </p>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Trong L.H.T, mọi khái niệm phần cứng đều được chiếu lên hệ sinh thái Web
              Backend/Node.js để sếp hình dung trực quan và ứng dụng vào công việc hằng ngày.
            </p>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
