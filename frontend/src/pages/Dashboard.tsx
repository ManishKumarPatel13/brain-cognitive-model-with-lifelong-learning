import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
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
  Sun,
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

const systemPromptDefault = `You are COGNITEX-AI, an intelligent assistant powered by HuggingFace AutoRouter. 
You monitor a cognitive architecture system with episodic memory (Pinecone) and semantic knowledge graphs. 
You help analyze working memory, semantic relationships, and episodic memory patterns using adaptive model routing. 
Provide concise, technical responses focused on system diagnostics, optimization, and memory consolidation.`;

const healthDataInitial: any[] = []; // Will be populated from backend API

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

// Dynamic episodic memory data - populated on user input, not hardcoded
const episodicDataInitial: any[] = [];

type Message = {
  id: number;
  role: "user" | "ai";
  content: string;
  source?: string;
  liked?: boolean | null;
};

const initialMessages: Message[] = [];

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

const CATEGORY_COLORS: Record<string, string> = {
  API_Errors: "#06b6d4",
  UI_Design: "#8b5cf6",
  Auth_Flow: "#f59e0b",
  Performance: "#ec4899",
  Data: "#10b981",
  General: "#6b7280",
};

function CustomScatterDot(props: {
  cx?: number;
  cy?: number;
  payload?: { cluster: string; memory: string };
}) {
  const { cx = 0, cy = 0, payload } = props;
  const color = payload ? CATEGORY_COLORS[payload.cluster] ?? "#94a3b8" : "#94a3b8";
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

// Theme configuration
const THEME_CONFIG = {
  dark: {
    bg: {
      primary: "bg-neutral-950",
      secondary: "bg-neutral-900",
      tertiary: "bg-neutral-800",
      accent: "bg-neutral-900/60",
    },
    text: {
      primary: "text-white",
      secondary: "text-neutral-300",
      muted: "text-neutral-600",
      accent: "text-neutral-400",
    },
    border: "border-neutral-800",
    chart: {
      grid: "#262626",
      text: "#6b7280",
      bg: "#171717",
      border: "#404040",
    },
  },
  light: {
    bg: {
      primary: "bg-white",
      secondary: "bg-gray-50",
      tertiary: "bg-gray-100",
      accent: "bg-gray-50/80",
    },
    text: {
      primary: "text-gray-950",
      secondary: "text-gray-700",
      muted: "text-gray-400",
      accent: "text-gray-600",
    },
    border: "border-gray-200",
    chart: {
      grid: "#e5e7eb",
      text: "#6b7280",
      bg: "#f9fafb",
      border: "#e5e7eb",
    },
  },
};

export default function Dashboard() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sleeping, setSleeping] = useState(false);
  const [sleepProgress, setSleepProgress] = useState(0);
  const [consolidationStage, setConsolidationStage] = useState("");
  const [resetting, setResetting] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [lastAPICall, setLastAPICall] = useState<{ timestamp: string; status: string }>({ timestamp: "", status: "" });
  const [memoryContext, setMemoryContext] = useState("");
  const [pastInteractions, setPastInteractions] = useState<any[]>([]);
  const [memorySearchCount, setMemorySearchCount] = useState(0);
  const [healthStats, setHealthStats] = useState<any[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [episodicMemories, setEpisodicMemories] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate dynamic episodic memory clusters based on prompt keywords
  const generateEpisodicMemories = (text: string) => {
    const keywords = text.toLowerCase().split(/\s+/);
    
    // Define category keywords for classification
    const categoryKeywords: { [key: string]: string[] } = {
      "API_Errors": ["api", "error", "cors", "network", "backend", "endpoint", "request", "response", "fetch", "gateway", "timeout", "connection", "fail"],
      "UI_Design": ["ui", "styling", "layout", "responsive", "tailwind", "css", "button", "theme", "design", "grid", "flex", "component"],
      "Auth_Flow": ["auth", "login", "password", "token", "jwt", "session", "user", "credential", "refresh", "expire", "permission"],
      "Performance": ["slow", "fast", "optimize", "cache", "memory", "lag", "speed", "efficient", "bundle", "load", "render"],
      "Data": ["data", "database", "query", "table", "schema", "storage", "retrieval", "sql", "nosql", "collection", "document"]
    };

    // Count keyword matches per category
    const categoryScores: { [key: string]: number } = {};
    keywords.forEach(keyword => {
      Object.entries(categoryKeywords).forEach(([category, words]) => {
        if (words.includes(keyword)) {
          categoryScores[category] = (categoryScores[category] || 0) + 1;
        }
      });
    });

    // Get top 1-3 categories based on matches
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    // If no categories matched, pick one at random
    if (sortedCategories.length === 0) {
      sortedCategories.push(Object.keys(categoryKeywords)[Math.floor(Math.random() * Object.keys(categoryKeywords).length)]);
    }

    // Sample memories for each category
    const categoryMemories: { [key: string]: string[] } = {
      "API_Errors": [
        `Failed to fetch from ${keywords[0] || "endpoint"} - CORS policy violation`,
        `Network timeout after 30s on ${keywords[0] || "request"}`,
        `502 Bad Gateway error on /api/${keywords[0] || "data"}`,
        `Connection refused: backend unreachable on port 8000`,
        `DNS resolution failed for backend server`
      ],
      "UI_Design": [
        `Tailwind CSS grid container not responsive on mobile`,
        `Flexbox alignment issue with ${keywords[0] || "component"} - overflow on edges`,
        `Dark mode theme not applied to ${keywords[0] || "button"} element`,
        `CSS specificity conflict: inline styles override classes`,
        `SVG rendering issue in Safari - transform property failed`
      ],
      "Auth_Flow": [
        `JWT token expired during ${keywords[0] || "operation"} - refresh token not found`,
        `Login session timeout: user logged out after inactivity`,
        `OAuth callback redirect URI mismatch with config`,
        `Password reset token expired - user must request new one`,
        `Bearer token malformed in Authorization header`
      ],
      "Performance": [
        `Memory leak detected - component not cleaning up event listeners`,
        `Render lag on scroll: 45ms frame time exceeds 16.7ms target`,
        `Cache miss for ${keywords[0] || "query"} - database hit took 2.3s`,
        `Bundle size exceeded budget: ${keywords[0] || "module"} is 523KB uncompressed`,
        `Slow initial ${keywords[0] || "load"}: critical rendering path blocked by JavaScript`
      ],
      "Data": [
        `Database query returned null for ${keywords[0] || "id"}`,
        `Schema mismatch: expected array but received object`,
        `Foreign key constraint violation - cannot delete parent record`,
        `Transaction rollback: ${keywords[0] || "operation"} failed due to concurrency`,
        `Index not found for column ${keywords[0] || "field"} - full table scan initiated`
      ]
    };

    // Generate episodic memory points
    let newMemories: any[] = [];
    let xOffset = -10;

    sortedCategories.forEach((category) => {
      const memories = categoryMemories[category] || [];
      const numMemories = Math.min(3, memories.length);
      
      for (let i = 0; i < numMemories; i++) {
        // Create clustered points around each category's area
        const xVariance = (Math.random() * 4 - 2);
        const yVariance = (Math.random() * 4 - 2);
        
        newMemories.push({
          x: xOffset + xVariance,
          y: (i - 1) * 2 + yVariance, // Spread vertically
          cluster: category,
          memory: memories[i],
        });
      }
      
      xOffset += 10; // Space categories apart on x-axis
    });

    return newMemories;
  };

  // Fetch health stats from backend
  const fetchHealthStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health/stats`);
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        // Transform data for chart display - convert category breakdown to separate series
        const chartData = data.data.map((d: any, idx: number) => {
          const point: any = {
            episode: idx * 10,
            timestamp: new Date(d.timestamp).toLocaleTimeString(),
            avg_accuracy: d.avg_accuracy || d.accuracy, // fallback to old field
          };
          
          // Add per-category accuracy if available
          if (d.accuracy_by_category) {
            Object.entries(d.accuracy_by_category).forEach(([category, accuracy]) => {
              point[`${category}_Accuracy`] = accuracy;
            });
          }
          
          return point;
        });
        setHealthStats(chartData);
        // Update current episode based on the number of data points
        setCurrentEpisode((chartData.length - 1) * 10);
        console.log("📊 Health stats updated:", chartData);
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
    
    // Generate new episodic memories based on user prompt - dynamically created for each query
    console.log("🧠 Analyzing prompt to generate episodic memory clusters...");
    const newMemories = generateEpisodicMemories(trimmed);
    console.log(`📊 Generated ${newMemories.length} episodic memory points from categories`);
    setEpisodicMemories(newMemories);

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
        source: "Deployed LLM",
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

  const handleSleep = async () => {
    if (sleeping) return;
    setSleeping(true);
    setSleepProgress(0);
    setConsolidationStage("Initializing...");

    try {
      console.log("🌙 Starting memory consolidation...");
      const response = await fetch(`${BACKEND_URL}/api/memory/consolidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      console.log("✓ Consolidation response:", data);

      if (data.status === "success") {
        // Update progress through stages
        if (data.stages) {
          for (const stage of data.stages) {
            setConsolidationStage(stage.name);
            setSleepProgress(stage.progress);
            // Small delay between stages for visual effect
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
        }

        // Hold at 100% for a moment
        setSleepProgress(100);
        setConsolidationStage("Complete!");
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Reset local state after successful consolidation
        setMessages([]);
        setHealthStats([]);
        setCurrentEpisode(0);
        setEpisodicMemories([]);
        setMemorySearchCount(0);
        setPastInteractions([]);
        setMemoryContext("");

        console.log("✅ Consolidation complete:", {
          interactions_consolidated: data.total_interactions_consolidated,
          memories_reorganized: data.memories_reorganized,
        });
      } else {
        console.error("❌ Consolidation failed:", data.error);
        setConsolidationStage("Failed!");
        alert("❌ Error consolidating memory: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("❌ Error calling consolidate endpoint:", error);
      setConsolidationStage("Error!");
      alert("❌ Failed to consolidate. Check console for details.");
    } finally {
      setSleeping(false);
      setSleepProgress(0);
      setConsolidationStage("");
    }
  };

  const handleResetMemory = async () => {
    if (resetting) return;
    
    const confirmed = window.confirm(
      "🧠 This will delete ALL episodic memory from Pinecone and reset health stats.\n\nAre you sure? This cannot be undone."
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/memory/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      
      if (data.status === "success") {
        // Reset local state
        setMessages([]);
        setHealthStats([]);
        setCurrentEpisode(0);
        setEpisodicMemories([]);
        setMemorySearchCount(0);
        setPastInteractions([]);
        setMemoryContext("");
        
        alert("✅ Fresh start! All episodic memory cleared.");
        console.log("✓ Memory reset successful:", data.message);
      } else {
        alert("❌ Error resetting memory: " + (data.error || "Unknown error"));
        console.error("Reset failed:", data);
      }
    } catch (error) {
      console.error("❌ Error calling reset endpoint:", error);
      alert("❌ Failed to reset memory. Check console for details.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className={`h-screen w-full font-sans flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-neutral-950 text-white' : 'bg-white text-gray-950'}`}>
      <header className={`flex-none flex items-center justify-between px-5 py-3 ${theme === 'dark' ? 'border-neutral-800 bg-neutral-900/60' : 'border-gray-200 bg-gray-50/60'} border-b backdrop-blur-sm`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className="w-6 h-6 text-cyan-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          </div>
          <span className={`text-sm font-semibold tracking-widest uppercase ${theme === 'dark' ? 'text-neutral-200' : 'text-gray-800'} letter-spacing-widest`}>
            Cognitive Architecture Monitor
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gray-200 hover:bg-gray-300'}`}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-mono">ONLINE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>EPISODE</span>
            <span className="text-xs text-cyan-400 font-mono font-bold">{currentEpisode}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-[30%_35%_35%] overflow-hidden min-h-0">
        <div className={`flex flex-col ${theme === 'dark' ? 'border-neutral-800' : 'border-gray-200'} border-r overflow-hidden`}>
          <div className={`flex-none flex items-center gap-2 px-4 py-3 ${theme === 'dark' ? 'border-neutral-800' : 'border-gray-200'} border-b`}>
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>
              Interaction Arena
            </span>
            <span className={`ml-auto text-xs ${theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'} font-mono`}>terminal://ai</span>
          </div>

          <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 scrollbar-thin ${theme === 'dark' ? 'bg-neutral-950' : 'bg-white'}`}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div className={`max-w-[85%] border rounded-2xl rounded-tr-sm px-3.5 py-2.5 ${theme === 'dark' ? 'bg-cyan-500/10 border-cyan-500/25' : 'bg-cyan-100/50 border-cyan-400/30'}`}>
                    <div className={`text-xs font-mono ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-700'} mb-1`}>USER</div>
                    <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-neutral-200' : 'text-gray-800'}`}>{msg.content}</p>
                  </div>
                ) : (
                  <div className={`max-w-[90%] border rounded-2xl rounded-tl-sm px-3.5 py-2.5 ${theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-gray-100 border-gray-200'}`}>
                    <div className={`text-xs font-mono ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'} mb-1 flex items-center gap-1.5`}>
                      <Brain className="w-3 h-3" />
                      COGNITEX-AI
                    </div>
                    <div className={`text-sm leading-relaxed prose ${theme === 'dark' ? 'prose-invert' : 'prose'} prose-sm max-w-none`}>
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 ml-2" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 ml-2" {...props} />,
                          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-semibold text-violet-300" {...props} />,
                          em: ({ node, ...props }) => <em className="italic text-blue-300" {...props} />,
                          code: ({ node, ...props }) => <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-orange-300 font-mono text-xs" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2 text-violet-200" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2 text-violet-300" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-sm font-semibold mb-1.5 text-violet-400" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-violet-500 pl-3 italic text-neutral-400 my-2" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    <div className={`flex items-center gap-3 mt-2.5 pt-2 ${theme === 'dark' ? 'border-neutral-800' : 'border-gray-200'} border-t`}>
                      <span className={`text-[10px] ${theme === 'dark' ? 'bg-violet-500/15 text-violet-400 border-violet-500/25' : 'bg-violet-100/50 text-violet-700 border-violet-300'} border rounded-full px-2 py-0.5 font-mono`}>
                        Source: {msg.source}
                      </span>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => handleLike(msg.id, true)}
                          className={`p-1 rounded transition-colors ${msg.liked === true ? "text-emerald-400" : theme === 'dark' ? "text-neutral-600 hover:text-neutral-400" : "text-gray-400 hover:text-gray-600"}`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleLike(msg.id, false)}
                          className={`p-1 rounded transition-colors ${msg.liked === false ? "text-rose-400" : theme === 'dark' ? "text-neutral-600 hover:text-neutral-400" : "text-gray-400 hover:text-gray-600"}`}
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

          <div className={`flex-none px-4 py-3 ${theme === 'dark' ? 'border-neutral-800 bg-neutral-900/40' : 'border-gray-200 bg-gray-50/40'} border-t`}>
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'bg-neutral-900 border-neutral-700 focus-within:border-cyan-500/50' : 'bg-gray-100 border-gray-300 focus-within:border-cyan-400'} border rounded-xl px-3 py-2 transition-colors`}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Send directive to AI..."
                className={`flex-1 ${theme === 'dark' ? 'bg-transparent text-neutral-200 placeholder-neutral-600' : 'bg-transparent text-gray-900 placeholder-gray-400'} text-sm outline-none font-mono`}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' : 'bg-cyan-200 text-cyan-800 hover:bg-cyan-300'} disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className={`flex flex-col ${theme === 'dark' ? 'border-neutral-800' : 'border-gray-200'} border-r overflow-hidden`}>
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
            <div className={`flex-1 overflow-y-auto p-4 min-h-0`}>
              <div className={`${theme === 'dark' ? 'bg-neutral-950 border-neutral-800' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3 font-mono text-[11px] leading-5`}>
                <JsonToken value={{
                  system_state: "active_processing",
                  last_api_call: lastAPICall,
                  memory_system: {
                    status: "live",
                    vector_db: "Pinecone",
                    embeddings_model: "sentence-transformers/all-MiniLM-L6-v2",
                    past_interactions_retrieved: memorySearchCount,
                    context_injected: memoryContext ? true : false,
                    retrieved_memory_context: memorySearchCount > 0 ? pastInteractions.slice(0, 2) : []
                  },
                  api_model: "huggingface autorouter",
                  api_status: lastAPICall.status || "awaiting_input",
                }} />
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className={`flex-none flex items-center gap-2 px-4 py-3 ${theme === 'dark' ? 'border-neutral-800' : 'border-gray-200'} border-b`}>
              <Activity className="w-4 h-4 text-amber-400" />
              <span className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>
                Catastrophic Forgetting Monitor
              </span>
            </div>
            <div className="flex-1 p-3 min-h-0">
              {healthStats.length === 0 ? (
                <div className={`h-full flex items-center justify-center ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'} text-sm font-mono`}>
                  <span>Send a prompt to populate memory and accuracy metrics...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={healthStats} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#262626' : '#e5e7eb'} />
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
                        background: theme === 'dark' ? "#171717" : "#f9fafb",
                        border: theme === 'dark' ? "1px solid #404040" : "1px solid #e5e7eb",
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
                    
                    {/* Render category-based lines from real data */}
                    {Object.entries(CATEGORY_COLORS).map(([category, color]) => {
                      const dataKey = `${category}_Accuracy`;
                      // Check if this category exists in data
                      const hasData = healthStats.some((d: any) => d[dataKey] !== undefined);
                      if (!hasData) return null;
                      
                      return (
                        <Line
                          key={dataKey}
                          type="monotone"
                          dataKey={dataKey}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ r: 3, fill: color, strokeWidth: 0 }}
                          activeDot={{ r: 4 }}
                          name={category}
                          isAnimationActive={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden">
          <div className={`flex-none px-4 py-3 ${theme === 'dark' ? 'border-neutral-800' : 'border-gray-200'} border-b space-y-2`}>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSleep}
                disabled={sleeping}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border-cyan-500/30 text-white hover:from-cyan-500/30 hover:to-violet-500/30' : 'bg-gradient-to-r from-cyan-100 to-violet-100 border-cyan-300 text-gray-900 hover:from-cyan-200 hover:to-violet-200'}`}
              >
                {sleeping ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                ) : (
                  <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} />
                )}
                {sleeping ? consolidationStage || "Consolidating..." : "Consolidate"}
              </button>
              <button
                onClick={handleResetMemory}
                disabled={resetting}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${theme === 'dark' ? 'bg-gradient-to-r from-rose-500/20 to-orange-500/20 border-rose-500/30 text-white hover:from-rose-500/30 hover:to-orange-500/30' : 'bg-gradient-to-r from-rose-100 to-orange-100 border-rose-300 text-gray-900 hover:from-rose-200 hover:to-orange-200'}`}
              >
                {resetting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                ) : (
                  <Zap className="w-4 h-4 text-rose-400" />
                )}
                {resetting ? "Resetting..." : "Fresh Start"}
              </button>
            </div>
            <div className={`h-1.5 w-full ${theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-300'} rounded-full overflow-hidden`}>
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-100"
                style={{ width: `${sleepProgress}%` }}
              />
            </div>
            {sleepProgress === 100 && !sleeping && (
              <div className={`text-[10px] text-center ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} font-mono`}>
                ✓ Consolidation complete — episodic memories reorganized and committed to LTM
              </div>
            )}
          </div>

          <div className={`flex-1 flex flex-col ${theme === 'dark' ? 'border-neutral-800' : 'border-gray-200'} border-b overflow-hidden min-h-0`}>
            <div className={`flex-none flex items-center gap-2 px-4 py-3 ${theme === 'dark' ? 'border-neutral-800' : 'border-gray-200'} border-b`}>
              <span className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>
                Semantic Memory (Rules)
              </span>
              <span className={`ml-auto text-[10px] ${theme === 'dark' ? 'text-neutral-600' : 'text-gray-400'} font-mono`}>{semanticData.nodes.length} nodes</span>
            </div>
            <div className="flex-1 p-3 min-h-0">
              <SemanticGraph />
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className={`flex-none flex items-center gap-2 px-4 py-3 ${theme === 'dark' ? 'border-neutral-800' : 'border-gray-200'} border-b`}>
              <span className={`text-xs font-semibold uppercase tracking-widest ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>
                Episodic Memory Clusters
              </span>
              <div className="ml-auto flex items-center gap-3">
                {Object.entries(CATEGORY_COLORS).map(([k, c]) => (
                  <div key={k} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                    <span className={`text-[9px] ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'} font-mono`}>{k.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 p-3 min-h-0">
              {episodicMemories.length === 0 ? (
                <div className={`h-full flex items-center justify-center ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-400'} text-sm font-mono`}>
                  <span>Send a prompt to visualize episodic memory clusters...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#1f1f1f" : "#e5e7eb"} />
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
                      data={episodicMemories}
                      shape={<CustomScatterDot />}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
