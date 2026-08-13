import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraphNode, NewsCard } from '../types';
import { 
  Mic, Cpu, Code2, Bookmark, X, ZoomIn, ZoomOut, RefreshCw, 
  Sparkles, CheckCircle2, ArrowRight, Activity, Layers, Share2
} from 'lucide-react';
import { playHudSound, speakVietnamese } from '../utils/audioSynth';

interface XRayModeViewProps {
  nodes: GraphNode[];
  onBookmarkNode: (node: GraphNode) => void;
  onOpenVoiceModal: () => void;
  audioMuted: boolean;
}

export const XRayModeView: React.FC<XRayModeViewProps> = ({
  nodes,
  onBookmarkNode,
  onOpenVoiceModal,
  audioMuted,
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'HARDWARE' | 'SOFTWARE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [savedNodeIds, setSavedNodeIds] = useState<Set<string>>(new Set());
  const [savedToast, setSavedToast] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingCanvasRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedNodeIdRef = useRef<string | null>(null);

  // Filter nodes
  const filteredNodes = nodes.filter((n) => {
    if (filterType !== 'ALL' && n.type !== filterType) return false;
    if (searchQuery.trim()) {
      return (
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.shortDesc.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  // Interactive Canvas Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angleOffset = 0;

    // Node Positions with Force Dynamics
    const nodePositions: { [id: string]: { x: number; y: number; vx: number; vy: number; radius: number } } = {};

    nodes.forEach((node, index) => {
      const radius = 28;
      const total = nodes.length;
      const angle = (index / total) * Math.PI * 2;
      const dist = node.type === 'HARDWARE' ? 140 : 230;
      nodePositions[node.id] = {
        x: (node.x || 250) + Math.cos(angle) * dist,
        y: (node.y || 250) + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius,
      };
    });

    const render = () => {
      angleOffset += 0.008;

      // Handle Canvas Sizing
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || 550;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2 + panOffsetRef.current.x;
      const centerY = height / 2 + panOffsetRef.current.y;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(zoomLevel, zoomLevel);

      // Draw Orbit Rings Background
      ctx.strokeStyle = 'rgba(255, 30, 30, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 140, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 240, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Connecting Glowing Edges
      nodes.forEach((sourceNode) => {
        const sourcePos = nodePositions[sourceNode.id];
        if (!sourcePos) return;

        sourceNode.relatedNodeIds.forEach((targetId) => {
          const targetPos = nodePositions[targetId];
          if (!targetPos) return;

          const isSelected =
            selectedNode && (selectedNode.id === sourceNode.id || selectedNode.id === targetId);

          // Edge Glow Gradient
          const grad = ctx.createLinearGradient(
            sourcePos.x - centerX,
            sourcePos.y - centerY,
            targetPos.x - centerX,
            targetPos.y - centerY
          );

          if (isSelected) {
            grad.addColorStop(0, '#FF1E1E');
            grad.addColorStop(0.5, '#FF0055');
            grad.addColorStop(1, '#FF5E00');
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = grad;
          } else {
            grad.addColorStop(0, 'rgba(255, 30, 30, 0.25)');
            grad.addColorStop(1, 'rgba(255, 94, 0, 0.15)');
            ctx.lineWidth = 1;
            ctx.strokeStyle = grad;
          }

          ctx.beginPath();
          ctx.moveTo(sourcePos.x - centerX, sourcePos.y - centerY);
          ctx.lineTo(targetPos.x - centerX, targetPos.y - centerY);
          ctx.stroke();

          // Animated Energy Particles along edges
          const time = Date.now() * 0.0015;
          const progress = (time + (sourceNode.id.length % 5) * 0.2) % 1;
          const px = (sourcePos.x - centerX) + ((targetPos.x - centerX) - (sourcePos.x - centerX)) * progress;
          const py = (sourcePos.y - centerY) + ((targetPos.y - centerY) - (sourcePos.y - centerY)) * progress;

          ctx.fillStyle = '#FF0055';
          ctx.shadowColor = '#FF1E1E';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      });

      // Draw Nodes (Crimson Spheres with Pulse Rings)
      nodes.forEach((node) => {
        const pos = nodePositions[node.id];
        if (!pos) return;

        // Micro drift physics if not being dragged
        if (draggedNodeIdRef.current !== node.id) {
          pos.x += pos.vx;
          pos.y += pos.vy;

          // Boundary bounce
          const dx = pos.x - centerX;
          const dy = pos.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 280) {
            pos.vx = -pos.vx;
            pos.vy = -pos.vy;
          }
        }

        const nx = pos.x - centerX;
        const ny = pos.y - centerY;

        const isSelected = selectedNode?.id === node.id;
        const isHardware = node.type === 'HARDWARE';

        // Outer Pulsing Ring
        const pulse = (Math.sin(Date.now() * 0.004 + (isHardware ? 0 : 2)) + 1) * 6;
        ctx.strokeStyle = isHardware ? 'rgba(255, 30, 30, 0.4)' : 'rgba(255, 94, 0, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(nx, ny, pos.radius + pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Node Glow Shadow
        ctx.shadowColor = isHardware ? '#FF1E1E' : '#FF5E00';
        ctx.shadowBlur = isSelected ? 25 : 12;

        // Radial Crimson Sphere Gradient
        const sphereGrad = ctx.createRadialGradient(
          nx - 6,
          ny - 6,
          2,
          nx,
          ny,
          pos.radius
        );

        if (isHardware) {
          sphereGrad.addColorStop(0, '#FF5E00');
          sphereGrad.addColorStop(0.5, '#FF1E1E');
          sphereGrad.addColorStop(1, '#660000');
        } else {
          sphereGrad.addColorStop(0, '#FF0055');
          sphereGrad.addColorStop(0.5, '#D32F2F');
          sphereGrad.addColorStop(1, '#4A0000');
        }

        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, isSelected ? pos.radius + 4 : pos.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0; // reset shadow

        // Inner Border
        ctx.strokeStyle = isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Icon Indicator inside Node
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isHardware ? 'HW' : 'SW', nx, ny);

        // Label Text below Node
        ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.fillStyle = isSelected ? '#FFFFFF' : '#FFD7D7';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(node.name, nx, ny + pos.radius + 14);
        ctx.shadowBlur = 0;
      });

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, selectedNode, zoomLevel]);

  // Touch canvas interaction handlers for panning & node dragging
  const handleTouchStartCanvas = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingCanvasRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - panOffsetRef.current.x,
        y: e.touches[0].clientY - panOffsetRef.current.y,
      };
    }
  };

  const handleTouchMoveCanvas = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDraggingCanvasRef.current && e.touches.length === 1) {
      panOffsetRef.current = {
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      };
    }
  };

  const handleTouchEndCanvas = () => {
    isDraggingCanvasRef.current = false;
  };

  // Handle Canvas Click to select node
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2 + panOffsetRef.current.x;
    const centerY = height / 2 + panOffsetRef.current.y;

    // Find clicked node
    let clicked: GraphNode | null = null;

    nodes.forEach((node) => {
      const radius = 28 * zoomLevel;
      // Reverse transform click coords
      const nx = (node.x || width / 2) + panOffsetRef.current.x;
      const ny = (node.y || height / 2) + panOffsetRef.current.y;

      const dx = clickX - nx;
      const dy = clickY - ny;
      if (Math.sqrt(dx * dx + dy * dy) < radius + 15) {
        clicked = node;
      }
    });

    if (clicked) {
      playHudSound('click');
      setSelectedNode(clicked);
      if (!audioMuted) {
        speakVietnamese(`Đã chọn nút ${clicked.name}. ${clicked.shortDesc}`);
      }
    }
  };

  const handleSaveNode = (node: GraphNode) => {
    playHudSound('bookmark');
    onBookmarkNode(node);
    setSavedNodeIds((prev) => new Set(prev).add(node.id));

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-120px)] flex flex-col justify-between items-center px-3 pt-2 pb-24 overflow-hidden select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {savedToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 z-50 px-4 py-2 rounded-xl bg-[#180808] border border-[#FF1E1E] text-[#FF5E00] font-mono text-xs font-bold shadow-[0_0_20px_#FF1E1E] flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#FF1E1E]" />
            <span>ĐÃ THÊM MỐI LIÊN KẾT VÀO KHO ĐẠN DƯỢC!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP FILTER & SEARCH TOOLBAR */}
      <div className="w-full max-w-md z-10 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-[#0c0606]/85 backdrop-blur-md border border-[#FF1E1E]/25 shadow-[0_0_15px_rgba(255,30,30,0.15)] font-mono text-xs">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#150a0a] p-1 rounded-xl">
            {(['ALL', 'HARDWARE', 'SOFTWARE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  playHudSound('click');
                  setFilterType(type);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  filterType === type
                    ? 'bg-gradient-to-r from-[#FF1E1E] to-[#FF0055] text-white shadow-[0_0_10px_#FF1E1E]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {type === 'ALL' ? 'TẤT CẢ' : type === 'HARDWARE' ? 'PHẦN CỨNG' : 'WEB DEV'}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                playHudSound('click');
                setZoomLevel((z) => Math.min(1.8, z + 0.15));
              }}
              className="p-1.5 rounded-lg bg-[#180808] text-[#FF5E00] hover:text-white border border-[#FF1E1E]/30"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                playHudSound('click');
                setZoomLevel((z) => Math.max(0.6, z - 0.15));
              }}
              className="p-1.5 rounded-lg bg-[#180808] text-[#FF5E00] hover:text-white border border-[#FF1E1E]/30"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* GRAPH CANVAS STAGE */}
      <div className="relative w-full max-w-md my-auto h-[480px] rounded-3xl bg-[#070303]/90 border border-[#FF1E1E]/20 shadow-[0_0_30px_rgba(255,30,30,0.15)] overflow-hidden flex items-center justify-center">
        {/* HUD Target Overlay Reticles */}
        <div className="absolute top-3 left-3 font-mono text-[9px] text-[#FF5E00]/60 flex items-center gap-1">
          <Activity className="w-3 h-3 text-[#FF1E1E] animate-pulse" />
          <span>X-RAY GRAPH COGNITIVE LINK // ACTIVE</span>
        </div>

        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStartCanvas}
          onTouchMove={handleTouchMoveCanvas}
          onTouchEnd={handleTouchEndCanvas}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        />

        {/* Quick Node Selector Pills at bottom of canvas */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {filteredNodes.slice(0, 5).map((node) => (
            <button
              key={node.id}
              onClick={() => {
                playHudSound('click');
                setSelectedNode(node);
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono whitespace-nowrap border transition-all ${
                selectedNode?.id === node.id
                  ? 'bg-[#FF1E1E] text-white border-white font-bold shadow-[0_0_10px_#FF1E1E]'
                  : 'bg-[#120808]/80 text-gray-300 border-[#FF1E1E]/30 hover:border-[#FF1E1E]'
              }`}
            >
              {node.type === 'HARDWARE' ? 'HW: ' : 'SW: '}{node.name}
            </button>
          ))}
        </div>
      </div>

      {/* PROMINENT MULTI-RED GRADIENT MIC FAB FOR VIETNAMESE VOICE COMMANDS */}
      <button
        onClick={() => {
          playHudSound('voice');
          onOpenVoiceModal();
        }}
        className="fixed bottom-20 right-6 z-40 p-4 rounded-full bg-gradient-to-tr from-[#FF1E1E] via-[#FF5E00] to-[#FF0055] text-white shadow-[0_0_25px_rgba(255,30,30,0.8)] border-2 border-white/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
        title="Bật Lệnh Giọng Nói Tiếng Việt"
      >
        <Mic className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-8 bg-[#121212] text-[#FF5E00] border border-[#FF1E1E]/40 text-[9px] font-mono font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          GIỌNG NÓI VIỆT
        </span>
      </button>

      {/* GLASSMORPHIC BOTTOM SHEET SLIDING UP WITH SPRING PHYSICS */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) {
                playHudSound('click');
                setSelectedNode(null);
              }
            }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-50 w-full max-w-md mx-auto p-5 rounded-t-3xl bg-[#0f0707]/95 border-t-2 border-[#FF1E1E] backdrop-blur-2xl shadow-[0_-10px_40px_rgba(255,30,30,0.35)] font-sans cursor-grab active:cursor-grabbing touch-pan-y"
          >
            {/* Slide Bar Header with Gesture Hint */}
            <div className="flex flex-col items-center justify-center mb-3">
              <div className="w-12 h-1.5 bg-[#FF1E1E]/80 rounded-full mb-1 animate-pulse" />
              <span className="font-mono text-[9px] text-gray-400 uppercase tracking-widest">VUỐT XUỐNG ĐỂ ĐÓNG</span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase mb-1 ${
                  selectedNode.type === 'HARDWARE' 
                    ? 'bg-red-950/80 border border-red-700 text-red-400' 
                    : 'bg-orange-950/80 border border-orange-700 text-orange-400'
                }`}>
                  {selectedNode.type === 'HARDWARE' ? 'NÚT PHẦN CỨNG (HARDWARE)' : 'NÚT LẬP TRÌNH WEB (SOFTWARE)'}
                </span>
                <h3 className="text-xl font-black text-white tracking-wide">
                  {selectedNode.name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded-full bg-[#1e0a0a] text-gray-400 hover:text-white border border-[#FF1E1E]/30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Vietnamese Summary */}
            <p className="mt-3 text-xs text-gray-300 leading-relaxed font-sans">
              {selectedNode.fullDetail}
            </p>

            {/* Web Dev Analogy Section (REQUIRED) */}
            <div className="mt-4 p-3 rounded-2xl bg-[#180909] border border-[#FF1E1E]/30 text-left">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#FF5E00] uppercase mb-1">
                <Sparkles className="w-4 h-4 text-[#FF1E1E]" />
                <span>PHÉP SO SÁNH GIẢI PHẪU WEB DEV</span>
              </div>
              <p className="text-xs text-red-200/90 font-medium leading-relaxed italic">
                "{selectedNode.webAnalogy}"
              </p>
            </div>

            {/* Technical Specs Breakdown */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {selectedNode.specs.map((spec, i) => (
                <div key={i} className="p-2 rounded-xl bg-[#120606] border border-[#FF1E1E]/20 text-center">
                  <div className="text-[9px] font-mono text-gray-400 uppercase">{spec.label}</div>
                  <div className="text-xs font-bold text-[#FF5E00] font-mono mt-0.5">{spec.value}</div>
                </div>
              ))}
            </div>

            {/* Action Icon: Save to Ammo Vault */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={() => handleSaveNode(selectedNode)}
                className={`flex-1 py-3 px-4 rounded-2xl font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  savedNodeIds.has(selectedNode.id)
                    ? 'bg-emerald-950 border border-emerald-600 text-emerald-400'
                    : 'bg-gradient-to-r from-[#FF1E1E] via-[#FF5E00] to-[#FF0055] text-white shadow-[0_0_20px_rgba(255,30,30,0.5)] hover:scale-102'
                }`}
              >
                <Bookmark className="w-4 h-4 fill-current" />
                <span>
                  {savedNodeIds.has(selectedNode.id) ? 'ĐÃ LƯU KHO ĐẠN DƯỢC' : 'LƯU VÀO KHO ĐẠN DƯỢC'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
