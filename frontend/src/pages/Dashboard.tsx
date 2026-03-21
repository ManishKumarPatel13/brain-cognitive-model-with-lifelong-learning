import { useState, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ThumbsUp,
  ThumbsDown,
  Send,
  Brain,
  Zap,
  Database,
  Activity,
  Moon,
  RefreshCw,
} from "lucide-react";

// Configure backend URL (supports both local dev and deployed backend)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const workingMemoryData = {
  system_state: "active_processing",
  current_task: "resolve_cors_policy",
  active_context: [
    {
      role: "user",
      content: "Why is my Next.js frontend getting blocked by the backend?",
    },
    {
      role: "memory_controller",
      content: "Retrieved past CORS configurations from Episodic DB.",
    },
  ],
  loaded_variables: {
    framework: "FastAPI",
    last_known_port: 8000,
    allow_origins: ["http://localhost:3000"],
  },
  attention_weights: [
    { token: "Next.js", weight: 0.85 },
    { token: "blocked", weight: 0.92 },
  ],
};

const systemPromptDefault = `You are COGNITEX-AI, an intelligent assistant monitoring a cognitive architecture system. 
You help analyze working memory, semantic relationships, and episodic memory patterns. 
Provide concise, technical responses focused on system diagnostics and optimization.`;

const healthData = [
  { episode: 0, Task_A_Accuracy: 98, Task_B_Accuracy: 10 },
  { episode: 10, Task_A_Accuracy: 85, Task_B_Accuracy: 45 },
  { episode: 20, Task_A_Accuracy: 65, Task_B_Accuracy: 75 },
  { episode: 30, Task_A_Accuracy: 82, Task_B_Accuracy: 88 },
  { episode: 40, Task_A_Accuracy: 94, Task_B_Accuracy: 95 },
  { episode: 50, Task_A_Accuracy: 96, Task_B_Accuracy: 97 },
];

const semanticData = {
  nodes: [
    { id: "FastAPI", group: "Backend" },
    { id: "CORS", group: "Security" },
    { id: "React", group: "Frontend" },
    { id: "Next.js", group: "Frontend" },
    { id: "Middleware", group: "Backend" },
  ],
  links: [
    { source: "FastAPI", target: "CORS", relation: "requires" },
    { source: "React", target: "CORS", relation: "triggers_preflight" },
    { source: "Next.js", target: "React", relation: "extends" },
    { source: "FastAPI", target: "Middleware", relation: "uses" },
  ],
};

const episodicData = [
  { x: 12.5, y: -4.2, cluster: "API_Errors", memory: "Failed to fetch on port 8080" },
  { x: 11.8, y: -3.9, cluster: "API_Errors", memory: "Network Error: CORS preflight" },
  { x: 13.1, y: -4.8, cluster: "API_Errors", memory: "502 Bad Gateway on /api/data" },
  { x: -5.2, y: 8.1, cluster: "UI_Styling", memory: "Tailwind grid not responsive" },
  { x: -4.8, y: 7.5, cluster: "UI_Styling", memory: "Flexbox overflowing screen" },
  { x: -5.5, y: 8.7, cluster: "UI_Styling", memory: "Dark mode class not applied" },
  { x: 2.1, y: 3.4, cluster: "Auth_Flow", memory: "JWT expired after 1h" },
  { x: 2.8, y: 2.9, cluster: "Auth_Flow", memory: "Refresh token not persisted" },
];

type Message = {
  id: number;
  role: "user" | "ai";
  content: string;
  source?: string;
  liked?: boolean | null;
};

const initialMessages: Message[] = [
  {
    id: 1,
    role: "user",
    content: "Why is my Next.js frontend getting blocked by the backend?",
  },
  {
    id: 2,
    role: "ai",
    content:
      "The issue is a CORS policy violation. Your FastAPI backend on port 8000 is not permitting requests from http://localhost:3000. I've retrieved your past CORS configurations from Episodic DB — you previously resolved this by adding the origin to `allow_origins`. Add `CORSMiddleware` with `allow_origins=[\"http://localhost:3000\"]`.",
    source: "Episodic DB",
    liked: null,
  },
];

function JsonToken({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null) return <span className="text-rose-400">null</span>;
  if (typeof value === "boolean")
    return <span className="text-amber-400">{String(value)}</span>;
  if (typeof value === "number")
    return <span className="text-cyan-300">{value}</span>;
  if (typeof value === "string")
    return <span className="text-emerald-400">"{value}"</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-neutral-400">[]</span>;
    return (
      <span>
        <span className="text-neutral-400">[</span>
        <div className="ml-4">
          {value.map((item, i) => (
            <div key={i}>
              <JsonToken value={item} depth={depth + 1} />
              {i < value.length - 1 && <span className="text-neutral-500">,</span>}
            </div>
          ))}
        </div>
        <span className="text-neutral-400">]</span>
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-neutral-400">{"{}"}</span>;
    return (
      <span>
        <span className="text-neutral-400">{"{"}</span>
        <div className="ml-4">
          {entries.map(([k, v], i) => (
            <div key={k}>
              <span className="text-violet-400">"{k}"</span>
              <span className="text-neutral-400">: </span>
              <JsonToken value={v} depth={depth + 1} />
              {i < entries.length - 1 && <span className="text-neutral-500">,</span>}
            </div>
          ))}
        </div>
        <span className="text-neutral-400">{"}"}</span>
      </span>
    );
  }

  return <span className="text-neutral-300">{String(value)}</span>;
}

const CLUSTER_COLORS: Record<string, string> = {
  API_Errors: "#06b6d4",
  UI_Styling: "#8b5cf6",
  Auth_Flow: "#f59e0b",
};

function CustomScatterDot(props: {
  cx?: number;
  cy?: number;
  payload?: { cluster: string; memory: string };
}) {
  const { cx = 0, cy = 0, payload } = props;
  const color = payload ? CLUSTER_COLORS[payload.cluster] ?? "#94a3b8" : "#94a3b8";
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={color}
      fillOpacity={0.85}
      stroke={color}
      strokeWidth={1.5}
      strokeOpacity={0.4}
    />
  );
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: { payload?: { memory: string; cluster: string } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs shadow-xl max-w-[200px]">
      <div className="text-neutral-400 mb-1 font-mono">{d.cluster}</div>
      <div className="text-white leading-tight">{d.memory}</div>
    </div>
  );
}

type NodePos = { id: string; group: string; x: number; y: number };

const nodePositions: NodePos[] = [
  { id: "CORS", group: "Security", x: 50, y: 42 },
  { id: "FastAPI", group: "Backend", x: 20, y: 20 },
  { id: "Middleware", group: "Backend", x: 20, y: 65 },
  { id: "React", group: "Frontend", x: 78, y: 20 },
  { id: "Next.js", group: "Frontend", x: 78, y: 65 },
];

const GROUP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Backend: { bg: "rgba(6,182,212,0.12)", border: "#06b6d4", text: "#06b6d4" },
  Security: { bg: "rgba(139,92,246,0.18)", border: "#8b5cf6", text: "#8b5cf6" },
  Frontend: { bg: "rgba(251,146,60,0.12)", border: "#fb923c", text: "#fb923c" },
};

function SemanticGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 300, h: 200 });

  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    obs.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  const toX = (pct: number) => (pct / 100) * dims.w;
  const toY = (pct: number) => (pct / 100) * dims.h;

  const getNode = (id: string) => nodePositions.find((n) => n.id === id)!;

  return (
    <svg ref={svgRef} className="w-full h-full" viewBox={`0 0 ${dims.w} ${dims.h}`}>
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#4b5563" />
        </marker>
        {Object.entries(GROUP_COLORS).map(([group, c]) => (
          <radialGradient key={group} id={`grad-${group}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={c.border} stopOpacity="0.3" />
            <stop offset="100%" stopColor={c.border} stopOpacity="0.08" />
          </radialGradient>
        ))}
      </defs>

      {semanticData.links.map((link, i) => {
        const src = getNode(link.source);
        const tgt = getNode(link.target);
        const x1 = toX(src.x);
        const y1 = toY(src.y);
        const x2 = toX(tgt.x);
        const y2 = toY(tgt.y);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#374151"
              strokeWidth={1.5}
              markerEnd="url(#arrow)"
              strokeDasharray="4 3"
            />
            <text
              x={mx}
              y={my - 5}
              textAnchor="middle"
              fontSize={9}
              fill="#6b7280"
              fontFamily="monospace"
            >
              {link.relation}
            </text>
          </g>
        );
      })}

      {nodePositions.map((node) => {
        const cx = toX(node.x);
        const cy = toY(node.y);
        const col = GROUP_COLORS[node.group] ?? GROUP_COLORS.Backend;
        return (
          <g key={node.id}>
            <circle
              cx={cx}
              cy={cy}
              r={28}
              fill={`url(#grad-${node.group})`}
              stroke={col.border}
              strokeWidth={1.5}
            />
            <text
              x={cx}
              y={cy - 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight="600"
              fill={col.text}
              fontFamily="monospace"
            >
              {node.id}
            </text>
            <text
              x={cx}
              y={cy + 12}
              textAnchor="middle"
              fontSize={8}
              fill="#6b7280"
              fontFamily="sans-serif"
            >
              {node.group}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sleeping, setSleeping] = useState(false);
  const [sleepProgress, setSleepProgress] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [lastAPICall, setLastAPICall] = useState<{ timestamp: string; status: string }>({ timestamp: "", status: "" });
  const [memoryContext, setMemoryContext] = useState("");
  const [pastInteractions, setPastInteractions] = useState<any[]>([]);
  const [memorySearchCount, setMemorySearchCount] = useState(0);
  const [healthStats, setHealthStats] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch health stats from backend
  const fetchHealthStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health/stats`);
      const data = await response.json();
      if (data.data) {
        // Transform data for chart display
        const chartData = data.data.map((d: any, idx: number) => ({
          episode: idx * 10,
          accuracy: d.accuracy,
          memory_retrieved: d.memory_retrieved,
          timestamp: new Date(d.timestamp).toLocaleTimeString()
        }));
        setHealthStats(chartData);
      }
    } catch (error) {
      console.error("❌ Error fetching health stats:", error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch health stats when component mounts and periodically
  useEffect(() => {
    fetchHealthStats();
    const interval = setInterval(fetchHealthStats, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: Date.now(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setCurrentPrompt(trimmed);

    try {
      console.log("🔄 Sending message to API:", trimmed);
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✓ Received from API:", data);
      
      // Update working memory with prompt details
      if (data.system_prompt) {
        setSystemPrompt(data.system_prompt);
      }
      
      // Update memory context
      if (data.context) {
        setMemoryContext(data.context);
      }
      
      // Update past interactions
      if (data.past_interactions) {
        setPastInteractions(data.past_interactions);
      }
      
      // Update memory search count
      if (data.memory_search_results !== undefined) {
        setMemorySearchCount(data.memory_search_results);
      }
      
      setLastAPICall({
        timestamp: new Date().toLocaleTimeString(),
        status: data.status,
      });

      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "ai",
        content: data.response,
        source: "Gemini API",
        liked: null,
      };
      console.log("Adding AI message:", aiMsg);
      setMessages((prev) => [...prev, aiMsg]);
      
      // Fetch updated health stats immediately after chat response
      await fetchHealthStats();
    } catch (error) {
      console.error("❌ Error:", error);
      setLastAPICall({
        timestamp: new Date().toLocaleTimeString(),
        status: "error",
      });
      const errorMsg: Message = {
        id: Date.now() + 1,
        role: "ai",
        content: `Error communicating with backend: ${error instanceof Error ? error.message : "Unknown error"}`,
        source: "Error Handler",
        liked: null,
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleLike = (id: number, val: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, liked: m.liked === val ? null : val } : m))
    );
  };

  const handleSleep = () => {
    if (sleeping) return;
    setSleeping(true);
    setSleepProgress(0);
    const interval = setInterval(() => {
      setSleepProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setSleeping(false);
          return 100;
        }
        return p + 2;
      });
    }, 60);
  };

  return (
    <div className="h-screen w-full bg-neutral-950 text-white font-sans flex flex-col overflow-hidden">
      <header className="flex-none flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className="w-6 h-6 text-cyan-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase text-neutral-200 letter-spacing-widest">
            Cognitive Architecture Monitor
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-mono">ONLINE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-mono">EPISODE</span>
            <span className="text-xs text-cyan-400 font-mono font-bold">50</span>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[30%_35%_35%] overflow-hidden min-h-0">
        <div className="flex flex-col border-r border-neutral-800 overflow-hidden">
          <div className="flex-none flex items-center gap-2 px-4 py-3 border-b border-neutral-800">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-neutral-300">
              Interaction Arena
            </span>
            <span className="ml-auto text-xs text-neutral-600 font-mono">terminal://ai</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 scrollbar-thin">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div className="max-w-[85%] bg-cyan-500/10 border border-cyan-500/25 rounded-2xl rounded-tr-sm px-3.5 py-2.5">
                    <div className="text-xs font-mono text-cyan-400 mb-1">USER</div>
                    <p className="text-sm text-neutral-200 leading-relaxed">{msg.content}</p>
                  </div>
                ) : (
                  <div className="max-w-[90%] bg-neutral-900 border border-neutral-800 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                    <div className="text-xs font-mono text-violet-400 mb-1 flex items-center gap-1.5">
                      <Brain className="w-3 h-3" />
                      COGNITEX-AI
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed">{msg.content}</p>
                    <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-neutral-800">
                      <span className="text-[10px] bg-violet-500/15 text-violet-400 border border-violet-500/25 rounded-full px-2 py-0.5 font-mono">
                        Source: {msg.source}
                      </span>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => handleLike(msg.id, true)}
                          className={`p-1 rounded transition-colors ${msg.liked === true ? "text-emerald-400" : "text-neutral-600 hover:text-neutral-400"}`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleLike(msg.id, false)}
                          className={`p-1 rounded transition-colors ${msg.liked === false ? "text-rose-400" : "text-neutral-600 hover:text-neutral-400"}`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex-none px-4 py-3 border-t border-neutral-800 bg-neutral-900/40">
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 focus-within:border-cyan-500/50 transition-colors">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Send directive to AI..."
                className="flex-1 bg-transparent text-sm text-neutral-200 placeholder-neutral-600 outline-none font-mono"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col border-r border-neutral-800 overflow-hidden">
          <div className="flex-1 flex flex-col border-b border-neutral-800 overflow-hidden min-h-0">
            <div className="flex-none flex items-center gap-2 px-4 py-3 border-b border-neutral-800">
              <Database className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-300">
                Working Memory
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[10px] text-violet-400 font-mono">active_processing</span>
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 font-mono text-[11px] leading-5">
                <JsonToken value={{
                  system_state: "active_processing",
                  last_api_call: lastAPICall,
                  memory_system: {
                    status: "live",
                    vector_db: "Pinecone",
                    embeddings_model: "sentence-transformers/all-MiniLM-L6-v2",
                    past_interactions_retrieved: memorySearchCount,
                    context_injected: memoryContext ? true : false
                  },
                  current_task: currentPrompt || "idle",
                  system_prompt: systemPrompt || systemPromptDefault,
                  active_context: [
                    {
                      role: "user",
                      content: currentPrompt || "No prompt sent yet",
                    },
                  ],
                  retrieved_memory_context: memorySearchCount > 0 ? pastInteractions.slice(0, 2) : [],
                  api_model: "gemini-3-flash-preview",
                  api_status: lastAPICall.status || "awaiting_input",
                }} />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-none flex items-center gap-2 px-4 py-3 border-b border-neutral-800">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-300">
                Catastrophic Forgetting Monitor
              </span>
            </div>
            <div className="flex-1 p-3 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={healthStats.length > 0 ? healthStats : healthData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    dataKey="episode"
                    tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                    label={{ value: "Training Episodes", position: "insideBottom", offset: -2, fill: "#6b7280", fontSize: 9 }}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#171717",
                      border: "1px solid #404040",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    cursor={{ stroke: "#374151", strokeWidth: 1 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{ fontSize: "10px", fontFamily: "monospace", paddingTop: "4px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey={healthStats.length > 0 ? "accuracy" : "Task_A_Accuracy"}
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#06b6d4", strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                    name={healthStats.length > 0 ? "System Accuracy (with Memory)" : "Task A"}
                  />
                  {healthStats.length === 0 && (
                    <Line
                      type="monotone"
                      dataKey="Task_B_Accuracy"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                      name="Task B"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden">
          <div className="flex-none px-4 py-3 border-b border-neutral-800 space-y-2">
            <button
              onClick={handleSleep}
              disabled={sleeping}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-sm font-semibold text-white hover:from-cyan-500/30 hover:to-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            >
              {sleeping ? (
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <Moon className="w-4 h-4 text-cyan-400" />
              )}
              {sleeping ? "Consolidating..." : "Initiate Sleep Cycle (Consolidate)"}
            </button>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-100"
                style={{ width: `${sleepProgress}%` }}
              />
            </div>
            {sleepProgress === 100 && !sleeping && (
              <div className="text-[10px] text-center text-emerald-400 font-mono">
                ✓ Consolidation complete — memories written to LTM
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col border-b border-neutral-800 overflow-hidden min-h-0">
            <div className="flex-none flex items-center gap-2 px-4 py-3 border-b border-neutral-800">
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-300">
                Semantic Memory (Rules)
              </span>
              <span className="ml-auto text-[10px] text-neutral-600 font-mono">{semanticData.nodes.length} nodes</span>
            </div>
            <div className="flex-1 p-3 min-h-0">
              <SemanticGraph />
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-none flex items-center gap-2 px-4 py-3 border-b border-neutral-800">
              <span className="text-xs font-semibold uppercase tracking-widest text-neutral-300">
                Episodic Memory Clusters
              </span>
              <div className="ml-auto flex items-center gap-3">
                {Object.entries(CLUSTER_COLORS).map(([k, c]) => (
                  <div key={k} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                    <span className="text-[9px] text-neutral-500 font-mono">{k.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 p-3 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    tick={{ fill: "#6b7280", fontSize: 9, fontFamily: "monospace" }}
                    domain={["dataMin - 2", "dataMax + 2"]}
                    label={{ value: "Dim-1", position: "insideBottom", offset: -2, fill: "#4b5563", fontSize: 9 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    tick={{ fill: "#6b7280", fontSize: 9, fontFamily: "monospace" }}
                    domain={["dataMin - 2", "dataMax + 2"]}
                    label={{ value: "Dim-2", angle: -90, position: "insideLeft", fill: "#4b5563", fontSize: 9 }}
                  />
                  <ReferenceLine x={0} stroke="#262626" strokeDasharray="2 2" />
                  <ReferenceLine y={0} stroke="#262626" strokeDasharray="2 2" />
                  <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#374151" }} />
                  <Scatter
                    data={episodicData}
                    shape={<CustomScatterDot />}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
