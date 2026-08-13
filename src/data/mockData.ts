import { NewsCard, GraphNode, AmmoCard } from '../types';

export const INITIAL_NEWS_CARDS: NewsCard[] = [
  {
    id: 'news-1',
    keyword: 'INTEL LUNAR LAKE',
    title: 'Kiến trúc Intel Core Ultra Series 2 với NPU 48 TOPS',
    category: 'CHIP AI',
    vietnameseSummary: 'Thiết kế x86 tối ưu điện năng vượt trội với NPU tích hợp xử lý 48 nghìn tỷ phép tính mỗi giây, vận hành mô hình AI cục bộ không tốn pin.',
    techPunchline: 'Sức mạnh NPU 48 TOPS giúp chạy AI local mượt mà như Worker Thread chạy ngầm trong ứng dụng Web.',
    audioText: 'Kiến trúc Intel Lunar Lake mang tới NPU 48 TOPS. Giúp sếp chạy các mô hình AI trực tiếp trên máy mà không tốn pin hay delay mạng.',
    source: 'Bản tin L.H.T AI Intel Corp',
    timestamp: '10 THÁNG 8, 2026',
    bookmarked: true,
    specs: [
      { label: 'Hiệu năng AI', value: '48 TOPS (NPU)' },
      { label: 'Tiết kiệm pin', value: '+40% so với thế hệ trước' },
      { label: 'Tiến trình', value: 'TSMC N3B 3nm' },
    ],
  },
  {
    id: 'news-2',
    keyword: 'GEFORCE RTX 5090',
    title: 'Quái vật Đồ họa Blackwell với 32GB GDDR7 VRAM',
    category: 'CARD ĐỒ HỌA',
    vietnameseSummary: 'Băng thông bộ nhớ lên tới 1.8 TB/s cho phép render ray-tracing thời gian thực và huấn luyện các mô hình LLM cực lớn.',
    techPunchline: 'VRAM GDDR7 siêu tốc giống như WebGL Shader Buffer trực tiếp thao tác trên GPU không qua CPU.',
    audioText: 'RTX 5090 sở hữu 32 Gigabyte GDDR7. Cho phép sếp render đồ họa 3D thời gian thực và xử lý mô hình trí tuệ nhân tạo cực nhanh.',
    source: 'Bản tin L.H.T Hardware Lab',
    timestamp: '09 THÁNG 8, 2026',
    bookmarked: false,
    specs: [
      { label: 'Băng thông VRAM', value: '1,792 GB/s' },
      { label: 'Nhân CUDA', value: '24,576 Cores' },
      { label: 'Công suất', value: '600W TGP' },
    ],
  },
  {
    id: 'news-3',
    keyword: 'REACT 19 COMPILER',
    title: 'Trình biên dịch Tự động Memoization không cần useMemo',
    category: 'LẬP TRÌNH WEB',
    vietnameseSummary: 'React Compiler tự động phân tích cây phụ thuộc và tối ưu re-render trực tiếp ở mức mã máy mà không cần khai báo thủ công.',
    techPunchline: 'React Compiler giúp code sạch và nhanh như việc L3 Cache tự động lưu lệnh thường dùng trong vi xử lý.',
    audioText: 'React 19 Compiler tự động tối ưu hóa bộ nhớ tạm. Sếp không cần viết useMemo hay useCallback thủ công nữa.',
    source: 'Bản tin L.H.T Frontend Core',
    timestamp: '08 THÁNG 8, 2026',
    bookmarked: true,
    specs: [
      { label: 'Tốc độ Re-render', value: 'Nhanh hơn 3.2x' },
      { label: 'Tương thích', value: 'React 19 Core' },
      { label: 'Trạng thái', value: 'Production Ready' },
    ],
  },
  {
    id: 'news-4',
    keyword: 'APPLE M4 NEURAL ENGINE',
    title: 'Vi xử lý 3nm Thế hệ mới với 38 TOPS AI Acceleration',
    category: 'VI XỬ LÝ',
    vietnameseSummary: 'Nhân AI chuyên dụng xử lý ma trận và tensor, giúp chuyển đổi giọng nói thành văn bản thời gian thực chỉ trong 5ms.',
    techPunchline: 'Neural Engine tăng tốc tính toán AI giống như WebAssembly xử lý logic phức tạp vượt giới hạn JS.',
    audioText: 'Apple M4 Neural Engine xử lý 38 nghìn tỷ phép tính mỗi giây. Phù hợp cho việc nhận diện giọng nói và thị giác máy tính.',
    source: 'Bản tin L.H.T Mobile Architecture',
    timestamp: '07 THÁNG 8, 2026',
    bookmarked: false,
    specs: [
      { label: 'Số nhân AI', value: '16-core Neural Engine' },
      { label: 'Độ trễ', value: '5ms Voice Matrix' },
      { label: 'Tiến trình', value: '3nm Enhanced' },
    ],
  },
  {
    id: 'news-5',
    keyword: 'RUST WEB ASSEMBLY',
    title: 'Đưa hiệu năng mã máy C/Rust lên trình duyệt Web với WASM',
    category: 'HỆ THỐNG',
    vietnameseSummary: 'Biên dịch Rust sang WebAssembly cho phép xử lý xử lý dữ liệu ma trận 3D, mã hóa video và AI trực tiếp trên Tab trình duyệt.',
    techPunchline: 'WASM kết hợp Rust giống như việc gắn thanh PCI Express tốc độ cao trực tiếp vào trình duyệt.',
    audioText: 'Rust WebAssembly cho phép chạy thuật toán nặng trên trình duyệt với tốc độ cận kề mã máy native.',
    source: 'Bản tin L.H.T WebAssembly Core',
    timestamp: '06 THÁNG 8, 2026',
    bookmarked: false,
    specs: [
      { label: 'Hiệu năng', value: '98% Native C Speed' },
      { label: 'Bảo mật', value: 'Sandboxed Memory' },
      { label: 'Ứng dụng', value: 'WebGL / AI Local / Crypto' },
    ],
  }
];

export const INITIAL_GRAPH_NODES: GraphNode[] = [
  // HARDWARE NODES
  {
    id: 'node-hw-npu',
    name: 'NPU 48 TOPS',
    type: 'HARDWARE',
    shortDesc: 'Bộ xử lý thần kinh chuyên dụng cho thuật toán ma trận AI.',
    webAnalogy: 'Tương tự Worker Thread Pool trong Web App - xử lý tác vụ nặng ở luồng riêng không làm đơ giao diện chính.',
    fullDetail: 'NPU (Neural Processing Unit) được thiết kế đặc biệt để tính toán nhân ma trận và hàm kích hoạt cho mạng thần kinh nhân tạo với hiệu suất năng lượng gấp 10 lần CPU thông thường.',
    specs: [
      { label: 'Băng thông', value: '120 GB/s Direct SRAM' },
      { label: 'Tác vụ', value: 'Matrix Multiplication' },
      { label: 'Độ trễ', value: '< 2ms' }
    ],
    relatedNodeIds: ['node-sw-worker', 'node-hw-m4', 'node-sw-wasm'],
    x: 180,
    y: 220,
  },
  {
    id: 'node-hw-ram',
    name: 'LPDDR5X RAM 8533MHz',
    type: 'HARDWARE',
    shortDesc: 'Bộ nhớ truy xuất ngẫu nhiên tốc độ cao tiết kiệm điện.',
    webAnalogy: 'Tương tự Redis Cache trong Backend Web - lưu trữ dữ liệu nóng để đọc tức thì không cần ghi xuống ổ cứng.',
    fullDetail: 'LPDDR5X đạt tốc độ truyền dữ liệu 8533 Mbps với điện áp cực thấp, đảm bảo dữ liệu phục vụ cho CPU/GPU/NPU không bị nghẽn cổ chai.',
    specs: [
      { label: 'Tốc độ bus', value: '8533 MHz' },
      { label: 'Băng thông', value: '136 GB/s' },
      { label: 'Điện áp', value: '1.05V' }
    ],
    relatedNodeIds: ['node-sw-redis', 'node-hw-npu', 'node-sw-localstorage'],
    x: 320,
    y: 140,
  },
  {
    id: 'node-hw-ssd',
    name: 'PCIe 5.0 NVMe SSD',
    type: 'HARDWARE',
    shortDesc: 'Ổ cứng thể rắn tốc độ đọc ghi lên tới 14,000 MB/s.',
    webAnalogy: 'Tương tự IndexedDB / Service Worker Cache - lưu trữ tài nguyên lớn bền vững trên thiết bị người dùng.',
    fullDetail: 'Chuẩn PCIe Gen 5 cho phép truyền tải dữ liệu dung lượng gigabyte chỉ trong phân khúc vài miligiây nhờ sử dụng 4 làn lane PCI Express tốc độ cao.',
    specs: [
      { label: 'Đọc tuần tự', value: '14,500 MB/s' },
      { label: 'Ghi tuần tự', value: '12,000 MB/s' },
      { label: 'Giao thức', value: 'NVMe 2.0' }
    ],
    relatedNodeIds: ['node-sw-localstorage', 'node-hw-ram'],
    x: 460,
    y: 240,
  },
  {
    id: 'node-hw-m4',
    name: 'Apple M4 Neural Engine',
    type: 'HARDWARE',
    shortDesc: 'Chip silicon tích hợp nhân AI xử lý 38 nghìn tỷ phép tính/s.',
    webAnalogy: 'Tương tự WebGPU Pipeline - thực thi tính toán đồ họa & AI trực tiếp trên phần cứng đồ họa.',
    fullDetail: 'Kiến trúc Unified Memory của Apple M4 cho phép CPU, GPU và Neural Engine dùng chung một vùng nhớ băng thông cao không cần copy dữ liệu.',
    specs: [
      { label: 'Xử lý ma trận', value: '38 TOPS' },
      { label: 'Bộ nhớ hợp nhất', value: 'Up to 128GB' },
      { label: 'Băng thông RAM', value: '150 GB/s' }
    ],
    relatedNodeIds: ['node-sw-webgpu', 'node-hw-npu', 'node-sw-wasm'],
    x: 120,
    y: 380,
  },
  {
    id: 'node-hw-5090',
    name: 'GeForce RTX 5090 CUDA',
    type: 'HARDWARE',
    shortDesc: 'Card đồ họa flagship với 24,576 nhân CUDA và Tensor Cores.',
    webAnalogy: 'Tương tự WebGL Parallel Shader - hàng ngàn luồng tính toán điểm ảnh song song trên trình duyệt.',
    fullDetail: 'RTX 5090 cho phép tính toán song song quy mô khổng lồ, phù hợp cho Ray Tracing 8K, AI LLM Inference và render đồ họa thời gian thực.',
    specs: [
      { label: 'VRAM', value: '32GB GDDR7' },
      { label: 'Tốc độ VRAM', value: '28 Gbps' },
      { label: 'Số nhân CUDA', value: '24,576' }
    ],
    relatedNodeIds: ['node-sw-webgl', 'node-sw-webgpu'],
    x: 280,
    y: 460,
  },

  // SOFTWARE / WEB DEV NODES
  {
    id: 'node-sw-worker',
    name: 'Worker Thread Pool',
    type: 'SOFTWARE',
    shortDesc: 'Tập hợp luồng chạy ngầm trong Web Browser bằng Web Workers.',
    webAnalogy: 'Giống như gán công việc tính toán nặng cho NPU hoặc nhân phụ CPU để giữ Event Loop chính luôn 60fps.',
    fullDetail: 'Web Worker cho phép mã JavaScript chạy ở các background thread độc lập, giúp xử lý thuật toán phức tạp mà không gây hiện tượng giật lag UI.',
    specs: [
      { label: 'Kiến trúc', value: 'Multi-threaded JS' },
      { label: 'Giao tiếp', value: 'postMessage / SharedArrayBuffer' },
      { label: 'Ứng dụng', value: 'AI, Audio Processing, Crypto' }
    ],
    relatedNodeIds: ['node-hw-npu', 'node-sw-wasm'],
    x: 180,
    y: 600,
  },
  {
    id: 'node-sw-redis',
    name: 'Redis In-Memory Cache',
    type: 'SOFTWARE',
    shortDesc: 'Cơ sở dữ liệu khóa-giá trị lưu trữ trực tiếp trên RAM.',
    webAnalogy: 'Giống như bộ nhớ LPDDR5X RAM - phản hồi dữ liệu trong thời gian dưới 1 miligiây.',
    fullDetail: 'Redis hoạt động hoàn toàn trên RAM giúp bỏ qua độ trễ đọc ghi đĩa cứng, được ứng dụng rộng rãi làm Caching layer, Pub/Sub và Session Store.',
    specs: [
      { label: 'Độ trễ', value: '< 0.5ms' },
      { label: 'Cấu trúc dữ liệu', value: 'Strings, Hashes, Lists, Sets' },
      { label: 'Tính năng', value: 'Persistence & Replication' }
    ],
    relatedNodeIds: ['node-hw-ram', 'node-sw-localstorage'],
    x: 420,
    y: 520,
  },
  {
    id: 'node-sw-wasm',
    name: 'Wasm Memory Buffer',
    type: 'SOFTWARE',
    shortDesc: 'Bộ nhớ tuyến tính dùng chung giữa JavaScript và C++/Rust WASM.',
    webAnalogy: 'Giống như băng thông Unified Memory trên chip Apple M4 - truy cập dữ liệu không cần sao chép.',
    fullDetail: 'WebAssembly Memory là một ArrayBuffer có thể mở rộng, cho phép mã C/Rust thao tác trực tiếp trên bộ nhớ với hiệu năng gần bằng phần cứng gốc.',
    specs: [
      { label: 'Loại bộ nhớ', value: 'Linear ArrayBuffer' },
      { label: 'Giới hạn', value: '4GB (32-bit) / 16EB (64-bit)' },
      { label: 'Tốc độ', value: 'Gần như C Native' }
    ],
    relatedNodeIds: ['node-hw-m4', 'node-sw-worker', 'node-sw-webgpu'],
    x: 350,
    y: 360,
  },
  {
    id: 'node-sw-webgl',
    name: 'GPU WebGL Shader',
    type: 'SOFTWARE',
    shortDesc: 'Chương trình GLSL chạy trực tiếp trên card đồ họa từ Web Browser.',
    webAnalogy: 'Giống như nhân CUDA trên RTX 5090 - xử lý triệu toán tử đồ họa song song.',
    fullDetail: 'Vertex và Fragment Shaders tính toán vị trí đỉnh và màu sắc từng điểm ảnh ở tần số cao, đem lại trải nghiệm 3D mượt mà cho các Web HUD.',
    specs: [
      { label: 'Ngôn ngữ', value: 'GLSL ES 3.0' },
      { label: 'Luồng thực thi', value: 'Parallel GPU Threads' },
      { label: 'Đầu ra', value: 'HTML5 Canvas 2D/3D' }
    ],
    relatedNodeIds: ['node-hw-5090', 'node-sw-webgpu'],
    x: 520,
    y: 420,
  },
  {
    id: 'node-sw-localstorage',
    name: 'IndexedDB / Local Storage',
    type: 'SOFTWARE',
    shortDesc: 'Kho lưu trữ dữ liệu phía Client trong trình duyệt Web.',
    webAnalogy: 'Giống như ổ cứng NVMe SSD - lưu giữ cài đặt và dữ liệu bookmark ngay cả khi tắt máy.',
    fullDetail: 'IndexedDB hỗ trợ lưu trữ dữ liệu cấu trúc NoSQL dung lượng lớn client-side, kết hợp Service Worker để tạo trải nghiệm ứng dụng Offline-first.',
    specs: [
      { label: 'Dung lượng', value: 'Hàng chục GB (Tùy đĩa cứng)' },
      { label: 'Loại', value: 'Key-Value & Object Store' },
      { label: 'Truy vấn', value: 'Asynchronous Transactions' }
    ],
    relatedNodeIds: ['node-hw-ssd', 'node-sw-redis'],
    x: 500,
    y: 120,
  }
];

export const INITIAL_AMMO_CARDS: AmmoCard[] = [
  {
    id: 'ammo-1',
    title: 'NPU 48 TOPS vs Web Workers',
    category: 'CHIP AI & WEB DEV',
    punchline: 'NPU xử lý AI ma trận ở phần cứng giống như Web Workers xử lý logic nặng ngầm trên Browser mà không làm khựng UI.',
    webAnalogy: 'Luồng phụ độc lập (Background Thread) tối ưu năng lượng và loại bỏ nghẽn Event Loop.',
    timestamp: '10/08/2026 22:45',
    tags: ['NPU', 'Worker', 'Concurrency', 'AI Local'],
    codeSnippet: `// Web Worker Async Offload
const worker = new Worker('/lht-ai-worker.js');
worker.postMessage({ command: 'INFER_TENSOR', matrix: inputBuffer });
worker.onmessage = (e) => updateHUD(e.data);`,
  },
  {
    id: 'ammo-2',
    title: 'GDDR7 VRAM 1.8TB/s vs WebGL Shaders',
    category: 'ĐỒ HỌA & VRAM',
    punchline: 'Băng thông VRAM khủng cho phép bơm triệu ma trận điểm ảnh vào GPU Shader mà không gặp nút thắt cổ chai PCI.',
    webAnalogy: 'Direct ArrayBuffer Streaming tới GPU Canvas 60 FPS.',
    timestamp: '09/08/2026 18:30',
    tags: ['RTX5090', 'WebGL', 'GPU', 'VRAM'],
    codeSnippet: `// GLSL Fragment Shader High-Performance Loop
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  gl_FragColor = vec2(st.x, sin(u_time * 2.0));
}`,
  },
  {
    id: 'ammo-3',
    title: 'React 19 Compiler vs CPU L3 Cache',
    category: 'LẬP TRÌNH FRONTEND',
    punchline: 'React 19 Compiler tự động Memoize cây component giống như bộ nhớ L3 Cache giữ sẵn lệnh tính toán thường dùng.',
    webAnalogy: 'Không cần ghi useMemo thủ công - Trình biên dịch tự phân tích nhánh phụ thuộc.',
    timestamp: '08/08/2026 14:15',
    tags: ['React19', 'Compiler', 'Optimization', 'Cache'],
    codeSnippet: `// React 19 Auto-Memoization Output
function HUDMetricCard({ speed, gforce }) {
  // Compiler auto-memoizes render output if inputs didn't change
  return <div className="hud-card">{speed} km/h | {gforce}G</div>;
}`,
  },
  {
    id: 'ammo-4',
    title: 'Unified Memory Apple M4 vs WASM Shared Memory',
    category: 'KIẾN TRÚC SILICON',
    punchline: 'Bộ nhớ hợp nhất cho phép CPU, GPU và NPU đọc chung 1 con trỏ bộ nhớ mà không mất công sao chép (Zero-Copy).',
    webAnalogy: 'SharedArrayBuffer giữa JS V8 Engine và C++ WASM.',
    timestamp: '07/08/2026 09:20',
    tags: ['AppleM4', 'WASM', 'ZeroCopy', 'Memory'],
    codeSnippet: `// SharedArrayBuffer Zero-Copy Sync
const sharedBuffer = new SharedArrayBuffer(1024 * 1024);
const wasmInstance = await WebAssembly.instantiate(wasmBytes, {
  env: { memory: new WebAssembly.Memory({ shared: true, buffer: sharedBuffer }) }
});`,
  }
];
