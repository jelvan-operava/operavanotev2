import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette, 
  Trash2, 
  Undo2, 
  Redo2, 
  Download, 
  Grid, 
  Sparkles, 
  MousePointer, 
  Eraser, 
  PenTool, 
  Eye, 
  FileImage, 
  Info,
  Layers,
  Moon,
  Sun,
  Play,
  Tv,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Type,
  Square,
  Bookmark,
  Hexagon,
  ArrowRight,
  Check,
  X,
  RefreshCw,
  HelpCircle,
  BarChart,
  Video,
  Hand,
  Maximize2,
  FileText,
  Music,
  Globe,
  Table,
  Code,
  Sigma,
  Paperclip,
  Smile
} from 'lucide-react';

interface BolekCanvasProps {
  showAlert: (msg: string) => void;
}

type WorkspaceMode = 'freehand' | 'flowchart' | 'diagram' | 'graphing';
type Tool = 'brush' | 'eraser' | 'highlighter' | 'dashed' | 'calligraphy' | 'pencil' | 'pen' | 'marker';
type PaperStyle = 'blank' | 'dot' | 'graph' | 'ruled' | 'square' | 'isometric';

// Flowchart element types
type ShapeType = 
  | 'process' 
  | 'decision' 
  | 'terminal' 
  | 'io' 
  | 'sticky' 
  | 'text' 
  | 'youtube' 
  | 'diagram-shape' 
  | 'graph'
  | 'heading'
  | 'image'
  | 'pdf'
  | 'audio'
  | 'website'
  | 'table'
  | 'code'
  | 'math'
  | 'icon'
  | 'emoji'
  | 'file';

interface FlowElement {
  id: string;
  type: ShapeType;
  label: string;
  x: number;
  y: number;
  color: string;
  textColor: string;
  fontSize: number;
  width: number;
  height: number;
  
  // YouTube specific config
  youtubeUrl?: string;
  youtubeId?: string;
  youtubeLoop?: boolean;
  youtubeAutoplay?: boolean;
  youtubeMute?: boolean;

  // Diagram specific config
  diagramShape?: 'circle' | 'rectangle' | 'triangle' | 'star' | 'cloud' | 'hexagon' | 'venn-left' | 'venn-right' | 'venn-mid' | 'mindmap';
  diagramBorderType?: 'solid' | 'dashed' | 'double';
  diagramShadow?: boolean;

  // Graphing specific config
  graphType?: 'bar' | 'pie' | 'line';
  graphData?: { name: string; value: number }[];
  graphTitle?: string;

  // Premium Objects config
  imageUrl?: string;
  pdfPage?: number;
  pdfMaxPages?: number;
  audioPlaying?: boolean;
  audioProgress?: number;
  websiteUrl?: string;
  tableData?: string[][]; // 3x3 spreadsheet values
  codeLanguage?: string;
  codeText?: string;
  mathExpression?: string;
  iconName?: string;
  emojiText?: string;
  fileName?: string;
  fileSize?: string;
}

interface FlowConnection {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  color: string;
  style: 'straight' | 'bezier' | 'orthogonal';
}

export default function BolekCanvas({ showAlert }: BolekCanvasProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Workspace Mode State
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('flowchart');
  
  // Freehand Canvas State variables
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<Tool>('brush');
  const [brushColor, setBrushColor] = useState('#0c0a09'); // Default Ink Black
  const [brushSize, setBrushSize] = useState(6);
  const [paperStyle, setPaperStyle] = useState<PaperStyle>('dot');
  const [isChalkboard, setIsChalkboard] = useState(false);

  // Infinite Visual Workspace States
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeBoardTool, setActiveBoardTool] = useState<'pointer' | 'hand'>('pointer');
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Custom Grid Customization States
  const [gridColor, setGridColor] = useState<string>('#e5e7eb');
  const [gridOpacity, setGridOpacity] = useState<number>(40);
  const [gridSize, setGridSize] = useState<number>(12);
  const [gridSpacing, setGridSpacing] = useState<number>(24);
  
  // Tracking mouse coordinates
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hasDrawn, setHasDrawn] = useState(false);

  // Undo / Redo Stacks for Freehand
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastCoordsRef = useRef({ x: 0, y: 0 });

  // Flowchart State variables
  const [elements, setElements] = useState<FlowElement[]>([]);
  const [connections, setConnections] = useState<FlowConnection[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [connectionStyle, setConnectionStyle] = useState<'straight' | 'bezier' | 'orthogonal'>('bezier');
  
  // Click-and-drag connection state
  const [dragConnectionStartId, setDragConnectionStartId] = useState<string | null>(null);
  const [dragConnectionCurrentPos, setDragConnectionCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [isArrowDrawMode, setIsArrowDrawMode] = useState<boolean>(false);

  const [defaultNodeStyle, setDefaultNodeStyle] = useState({
    color: '#1e40af',
    textColor: '#ffffff',
    fontSize: 11,
    width: 160,
    height: 52
  });

  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Text inline edit state
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Dragging states
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });

  // Presentation State
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState<number>(0);

  // Preset Colors for Drawing
  const lightPresetColors = [
    { name: 'Ink Black', value: '#0c0a09' },
    { name: 'Slate Blue', value: '#1e40af' },
    { name: 'Emerald Green', value: '#065f46' },
    { name: 'Sunset Orange', value: '#c2410c' },
    { name: 'Rose Red', value: '#be123c' },
    { name: 'Sunflower Yellow', value: '#ca8a04' },
    { name: 'Grape Purple', value: '#6b21a8' },
  ];

  const darkPresetColors = [
    { name: 'Chalk White', value: '#fcfcfc' },
    { name: 'Neon Blue', value: '#60a5fa' },
    { name: 'Neon Green', value: '#34d399' },
    { name: 'Neon Orange', value: '#fb923c' },
    { name: 'Neon Pink', value: '#f472b6' },
    { name: 'Chalk Yellow', value: '#fde047' },
    { name: 'Pastel Purple', value: '#c084fc' },
  ];

  const currentPresetColors = isChalkboard ? darkPresetColors : lightPresetColors;

  // Seeding initial Miro college demonstration template if empty
  useEffect(() => {
    const savedElements = localStorage.getItem('bolek_flow_elements');
    const savedConnections = localStorage.getItem('bolek_flow_connections');

    if (savedElements && savedConnections) {
      try {
        setElements(JSON.parse(savedElements));
        setConnections(JSON.parse(savedConnections));
      } catch (e) {
        seedDefaultFlowchart();
      }
    } else {
      seedDefaultFlowchart();
    }
  }, []);

  const seedDefaultFlowchart = () => {
    const defaultElements: FlowElement[] = [
      {
        id: 'node-1',
        type: 'terminal',
        label: '🚀 START LESSON',
        x: 100,
        y: 80,
        color: '#065f46',
        textColor: '#ffffff',
        fontSize: 12,
        width: 140,
        height: 48,
      },
      {
        id: 'node-2',
        type: 'decision',
        label: 'Interactive Presentation?',
        x: 300,
        y: 60,
        color: '#ca8a04',
        textColor: '#0f172a',
        fontSize: 11,
        width: 150,
        height: 90,
      },
      {
        id: 'node-3',
        type: 'process',
        label: '💡 Use Miro Flowchart Maker',
        x: 520,
        y: 40,
        color: '#1e40af',
        textColor: '#ffffff',
        fontSize: 11,
        width: 180,
        height: 52,
      },
      {
        id: 'node-4',
        type: 'process',
        label: '✍️ Sketch with Freehand Canvas',
        x: 520,
        y: 160,
        color: '#be123c',
        textColor: '#ffffff',
        fontSize: 11,
        width: 180,
        height: 52,
      },
      {
        id: 'node-5',
        type: 'sticky',
        label: '🔥 PRO-TIP:\nDouble click any card to rename. Use "Start Presentation" to show off!',
        x: 200,
        y: 220,
        color: '#fef08a',
        textColor: '#1c1917',
        fontSize: 10,
        width: 170,
        height: 110,
      }
    ];

    const defaultConnections: FlowConnection[] = [
      {
        id: 'conn-1',
        fromId: 'node-1',
        toId: 'node-2',
        label: 'Launch App',
        color: '#78716c',
        style: 'bezier'
      },
      {
        id: 'conn-2',
        fromId: 'node-2',
        toId: 'node-3',
        label: 'Yes (Diagrams)',
        color: '#78716c',
        style: 'bezier'
      },
      {
        id: 'conn-3',
        fromId: 'node-2',
        toId: 'node-4',
        label: 'No (Drawings)',
        color: '#78716c',
        style: 'bezier'
      }
    ];

    setElements(defaultElements);
    setConnections(defaultConnections);
    localStorage.setItem('bolek_flow_elements', JSON.stringify(defaultElements));
    localStorage.setItem('bolek_flow_connections', JSON.stringify(defaultConnections));
  };

  // Sync flowchart elements to local storage on changes
  const updateElementsAndPersist = (newElements: FlowElement[]) => {
    setElements(newElements);
    localStorage.setItem('bolek_flow_elements', JSON.stringify(newElements));
  };

  const updateConnectionsAndPersist = (newConns: FlowConnection[]) => {
    setConnections(newConns);
    localStorage.setItem('bolek_flow_connections', JSON.stringify(newConns));
  };

  // Freehand Canvas initialization & sync
  useEffect(() => {
    if (workspaceMode === 'freehand') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      handleResize();
      window.addEventListener('resize', handleResize);

      const savedImage = localStorage.getItem('bolek_canvas_saved_image');
      if (savedImage) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            setHasDrawn(true);
            saveSnapshot();
          }
        };
        img.src = savedImage;
      } else {
        clearCanvas(true);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [workspaceMode]);

  // Sync brush and grid colors on theme changes
  useEffect(() => {
    if (isChalkboard) {
      if (brushColor === '#0c0a09') setBrushColor('#fcfcfc');
      setGridColor('#374151');
    } else {
      if (brushColor === '#fcfcfc') setBrushColor('#0c0a09');
      setGridColor('#e5e7eb');
    }
  }, [isChalkboard]);

  const handleResize = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    const rect = container.getBoundingClientRect();
    canvas.width = Math.max(rect.width, 800);
    canvas.height = Math.max(rect.height, 500);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.drawImage(tempCanvas, 0, 0);
    }
  };

  // Freehand Snapshot Undo/Redo Engine
  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();

    undoStackRef.current.push(dataUrl);
    if (undoStackRef.current.length > 25) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    localStorage.setItem('bolek_canvas_saved_image', dataUrl);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentState = undoStackRef.current.pop();
    if (currentState) {
      redoStackRef.current.push(currentState);
    }

    if (undoStackRef.current.length > 0) {
      const prevState = undoStackRef.current[undoStackRef.current.length - 1];
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        localStorage.setItem('bolek_canvas_saved_image', prevState);
      };
      img.src = prevState;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      localStorage.removeItem('bolek_canvas_saved_image');
      setHasDrawn(false);
    }
    showToast('Undo action applied');
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nextState = redoStackRef.current.pop();
    if (nextState) {
      undoStackRef.current.push(nextState);
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        localStorage.setItem('bolek_canvas_saved_image', nextState);
        setHasDrawn(true);
      };
      img.src = nextState;
      showToast('Redo action applied');
    }
  };

  const clearCanvas = (bypassConfirm = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!bypassConfirm && hasDrawn) {
      const confirmClear = window.confirm('Are you sure you want to discard your current canvas drawing? This cannot be undone.');
      if (!confirmClear) return;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
    undoStackRef.current = [];
    redoStackRef.current = [];
    localStorage.removeItem('bolek_canvas_saved_image');
    if (!bypassConfirm) {
      showToast('Canvas cleared successfully');
    }
  };

  // Drawing Brush Action Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    setIsDrawing(true);
    setHasDrawn(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    lastCoordsRef.current = { x, y };

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'eraser') {
      ctx.strokeStyle = isChalkboard ? '#1c1917' : '#ffffff';
      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);
      ctx.lineWidth = brushSize * 2.5;
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = brushColor;
      ctx.globalAlpha = 0.35;
      ctx.setLineDash([]);
      ctx.lineWidth = brushSize * 2.2;
    } else if (tool === 'dashed') {
      ctx.strokeStyle = brushColor;
      ctx.globalAlpha = 1.0;
      ctx.setLineDash([brushSize * 1.5, brushSize * 1.5]);
      ctx.lineWidth = brushSize;
    } else if (tool === 'calligraphy') {
      ctx.strokeStyle = brushColor;
      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);
      ctx.lineWidth = brushSize;
    } else {
      ctx.strokeStyle = brushColor;
      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);
      ctx.lineWidth = brushSize;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setCoords({ x: Math.round(x), y: Math.round(y) });

    if (!isDrawing) return;

    if (tool === 'calligraphy') {
      const steps = 10;
      const dx = x - lastCoordsRef.current.x;
      const dy = y - lastCoordsRef.current.y;
      for (let i = 0; i < steps; i++) {
        const stepX = lastCoordsRef.current.x + (dx * i) / steps;
        const stepY = lastCoordsRef.current.y + (dy * i) / steps;
        ctx.beginPath();
        ctx.moveTo(stepX - brushSize / 2, stepY - brushSize / 2);
        ctx.lineTo(stepX + brushSize / 2, stepY + brushSize / 2);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(lastCoordsRef.current.x, lastCoordsRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastCoordsRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveSnapshot();
  };

  // Flowchart Elements Creators
  const addFlowElement = (type: ShapeType, extraParams?: { diagramShape?: 'circle' | 'rectangle' | 'triangle' | 'star' | 'cloud' | 'hexagon' | 'venn-left' | 'venn-right' | 'venn-mid' | 'mindmap', graphType?: 'bar' | 'pie' | 'line' }) => {
    // Generate a random-ish center position with slight offset
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect() || { width: 600, height: 400 };
    const x = Math.max(100, Math.floor(rect.width / 2) - 100 + (elements.length % 5) * 20);
    const y = Math.max(80, Math.floor(rect.height / 2) - 50 + (elements.length % 5) * 15);

    let defaultColor = defaultNodeStyle.color;
    let defaultTextColor = defaultNodeStyle.textColor;
    let labelText = 'Activity Process';
    let defaultWidth = defaultNodeStyle.width;
    let defaultHeight = defaultNodeStyle.height;
    let fontSize = defaultNodeStyle.fontSize;

    let youtubeUrl: string | undefined;
    let youtubeId: string | undefined;
    let youtubeLoop: boolean | undefined;
    let youtubeAutoplay: boolean | undefined;
    let youtubeMute: boolean | undefined;

    let diagramShape: any;
    let diagramBorderType: 'solid' | 'dashed' | 'double' | undefined;
    let diagramShadow: boolean | undefined;

    let graphType: 'bar' | 'pie' | 'line' | undefined;
    let graphData: { name: string; value: number }[] | undefined;
    let graphTitle: string | undefined;

    switch (type) {
      case 'decision':
        defaultColor = '#ca8a04'; // Sunflower yellow
        defaultTextColor = '#0f172a';
        labelText = 'Condition Test?';
        defaultWidth = 140;
        defaultHeight = 84;
        break;
      case 'terminal':
        defaultColor = '#065f46'; // Emerald
        labelText = '🟢 START / END';
        defaultWidth = 130;
        defaultHeight = 44;
        break;
      case 'io':
        defaultColor = '#c2410c'; // Sunset Orange
        labelText = 'Data Input/Output';
        defaultWidth = 160;
        defaultHeight = 50;
        break;
      case 'sticky':
        defaultColor = '#fef08a'; // Yellow Sticky Post-it
        defaultTextColor = '#1c1917';
        labelText = '📌 College Lecture Note\n- Important concept to share';
        defaultWidth = 160;
        defaultHeight = 110;
        break;
      case 'text':
        defaultColor = 'transparent';
        defaultTextColor = isChalkboard ? '#f5f5f4' : '#1c1917';
        labelText = 'Annotation Title Text';
        defaultWidth = 180;
        defaultHeight = 36;
        fontSize = 14;
        break;
      case 'youtube':
        defaultColor = '#1c1917';
        defaultTextColor = '#ffffff';
        labelText = 'Watch Presentation Support Video';
        defaultWidth = 320;
        defaultHeight = 240;
        youtubeUrl = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
        youtubeId = 'jfKfPfyJRdk';
        youtubeLoop = true;
        youtubeAutoplay = false;
        youtubeMute = false;
        break;
      case 'diagram-shape':
        diagramShape = extraParams?.diagramShape || 'circle';
        diagramBorderType = 'solid';
        diagramShadow = true;
        if (diagramShape === 'circle') {
          defaultColor = '#0284c7';
          labelText = 'Central Concept';
          defaultWidth = 110;
          defaultHeight = 110;
        } else if (diagramShape === 'rectangle') {
          defaultColor = '#4f46e5';
          labelText = 'Diagram Block';
          defaultWidth = 140;
          defaultHeight = 70;
        } else if (diagramShape === 'triangle') {
          defaultColor = '#0891b2';
          labelText = 'Hierarchical Stage';
          defaultWidth = 120;
          defaultHeight = 110;
        } else if (diagramShape === 'star') {
          defaultColor = '#ca8a04';
          labelText = 'Key Highlight';
          defaultWidth = 120;
          defaultHeight = 120;
        } else if (diagramShape === 'cloud') {
          defaultColor = '#0d9488';
          labelText = 'Cloud Platform';
          defaultWidth = 150;
          defaultHeight = 90;
        } else if (diagramShape === 'hexagon') {
          defaultColor = '#2563eb';
          labelText = 'Hexagonal Factor';
          defaultWidth = 120;
          defaultHeight = 110;
        } else if (diagramShape === 'venn-left') {
          defaultColor = 'rgba(239, 68, 68, 0.4)';
          labelText = 'Venn Set A\n(Unique Triggers)';
          defaultWidth = 160;
          defaultHeight = 160;
        } else if (diagramShape === 'venn-right') {
          defaultColor = 'rgba(59, 130, 246, 0.4)';
          labelText = 'Venn Set B\n(Unique Results)';
          defaultWidth = 160;
          defaultHeight = 160;
        } else if (diagramShape === 'venn-mid') {
          defaultColor = 'rgba(139, 92, 246, 0.4)';
          labelText = 'Intersection\n(Shared Traits)';
          defaultWidth = 110;
          defaultHeight = 160;
        } else if (diagramShape === 'mindmap') {
          defaultColor = '#db2777';
          labelText = 'Core Thought Node';
          defaultWidth = 150;
          defaultHeight = 62;
        }
        break;
      case 'graph':
        graphType = extraParams?.graphType || 'bar';
        defaultColor = '#fcfcfc';
        defaultTextColor = '#1c1917';
        labelText = 'Lesson Stats Presentation';
        defaultWidth = 340;
        defaultHeight = 250;
        graphTitle = 'Interactive Live Dataset';
        graphData = [
          { name: 'Category A', value: 75 },
          { name: 'Category B', value: 92 },
          { name: 'Category C', value: 58 },
          { name: 'Category D', value: 83 }
        ];
        break;
      case 'heading':
        defaultColor = 'transparent';
        defaultTextColor = isChalkboard ? '#f5f5f4' : '#111111';
        labelText = 'Bolek Premium Canvas';
        defaultWidth = 320;
        defaultHeight = 50;
        fontSize = 24;
        break;
      case 'image':
        defaultColor = '#f5f5f4';
        defaultTextColor = '#111111';
        labelText = 'Visual Asset Image';
        defaultWidth = 240;
        defaultHeight = 180;
        break;
      case 'pdf':
        defaultColor = '#ffffff';
        defaultTextColor = '#1c1917';
        labelText = 'Research_Report.pdf';
        defaultWidth = 220;
        defaultHeight = 140;
        break;
      case 'audio':
        defaultColor = '#fafaf9';
        defaultTextColor = '#292524';
        labelText = 'Lecture Audio Record';
        defaultWidth = 240;
        defaultHeight = 100;
        break;
      case 'website':
        defaultColor = '#fcfcfc';
        defaultTextColor = '#1c1917';
        labelText = 'Bolek Iframe Search';
        defaultWidth = 380;
        defaultHeight = 260;
        break;
      case 'table':
        defaultColor = '#ffffff';
        defaultTextColor = '#1c1917';
        labelText = 'Editable Table';
        defaultWidth = 320;
        defaultHeight = 160;
        break;
      case 'code':
        defaultColor = '#1e1e24';
        defaultTextColor = '#ffffff';
        labelText = 'Code Snippet';
        defaultWidth = 340;
        defaultHeight = 185;
        break;
      case 'math':
        defaultColor = '#fef08a';
        defaultTextColor = '#1c1917';
        labelText = 'Math Formula';
        defaultWidth = 220;
        defaultHeight = 90;
        break;
      case 'icon':
        defaultColor = '#f97316';
        defaultTextColor = '#ffffff';
        labelText = 'Spark';
        defaultWidth = 80;
        defaultHeight = 80;
        break;
      case 'emoji':
        defaultColor = 'transparent';
        defaultTextColor = '#111111';
        labelText = 'Emoji Face';
        defaultWidth = 70;
        defaultHeight = 70;
        break;
      case 'file':
        defaultColor = '#f3f4f6';
        defaultTextColor = '#1f2937';
        labelText = 'Brief_Doc.pdf';
        defaultWidth = 220;
        defaultHeight = 64;
        break;
    }

    // Default premium initial values for stateful items
    const imageUrl = type === 'image' ? 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80' : undefined;
    const pdfPage = type === 'pdf' ? 1 : undefined;
    const pdfMaxPages = type === 'pdf' ? 12 : undefined;
    const audioPlaying = type === 'audio' ? false : undefined;
    const audioProgress = type === 'audio' ? 42 : undefined;
    const websiteUrl = type === 'website' ? 'https://wikipedia.org' : undefined;
    const tableData = type === 'table' ? [
      ['Topic', 'Status', 'Score'],
      ['Introduction', 'Done', '95'],
      ['Deep Learning', 'Pending', '88']
    ] : undefined;
    const codeLanguage = type === 'code' ? 'typescript' : undefined;
    const codeText = type === 'code' ? 'const greet = () => {\n  console.log("Welcome to Bolek!");\n};' : undefined;
    const mathExpression = type === 'math' ? 'e^{i\\pi} + 1 = 0' : undefined;
    const iconName = type === 'icon' ? 'Sparkles' : undefined;
    const emojiText = type === 'emoji' ? '🔥' : undefined;
    const fileName = type === 'file' ? 'Brief_Doc.pdf' : undefined;
    const fileSize = type === 'file' ? '1.8 MB' : undefined;

    const newElement: FlowElement = {
      id: `node-${Date.now()}`,
      type,
      label: labelText,
      x,
      y,
      color: defaultColor,
      textColor: defaultTextColor,
      fontSize,
      width: defaultWidth,
      height: defaultHeight,
      youtubeUrl,
      youtubeId,
      youtubeLoop,
      youtubeAutoplay,
      youtubeMute,
      diagramShape,
      diagramBorderType,
      diagramShadow,
      graphType,
      graphData,
      graphTitle,
      imageUrl,
      pdfPage,
      pdfMaxPages,
      audioPlaying,
      audioProgress,
      websiteUrl,
      tableData,
      codeLanguage,
      codeText,
      mathExpression,
      iconName,
      emojiText,
      fileName,
      fileSize
    };

    const nextElements = [...elements, newElement];
    updateElementsAndPersist(nextElements);
    setSelectedElementId(newElement.id);
    showToast(`Added ${type === 'diagram-shape' ? diagramShape : type} element successfully`);
  };

  // Node Drag & Drop and Drag Connection Logic
  const handleNodeMouseDown = (id: string, e: React.MouseEvent) => {
    if (editingElementId || isPreviewMode) return;
    e.stopPropagation();

    const selected = elements.find(el => el.id === id);
    if (!selected) return;

    setSelectedElementId(id);

    // If Draw Arrow mode is active, click-and-drag directly on any shape
    if (isArrowDrawMode) {
      setDragConnectionStartId(id);
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setDragConnectionCurrentPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      return;
    }

    // If Connecting mode is active, complete connection
    if (connectingFromId && connectingFromId !== id) {
      // Check if connection already exists
      const exists = connections.some(c => c.fromId === connectingFromId && c.toId === id);
      if (!exists) {
        const newConnection: FlowConnection = {
          id: `conn-${Date.now()}`,
          fromId: connectingFromId,
          toId: id,
          label: 'Flow Connection',
          color: isChalkboard ? '#78716c' : '#78716c',
          style: connectionStyle
        };
        const nextConns = [...connections, newConnection];
        updateConnectionsAndPersist(nextConns);
        showToast('Connected flowchart elements successfully!');
      }
      setConnectingFromId(null);
      return;
    }

    setIsDraggingNode(true);
    dragStartOffset.current = {
      x: e.clientX / zoom - selected.x,
      y: e.clientY / zoom - selected.y
    };
  };

  const handleNodeTouchStart = (id: string, e: React.TouchEvent) => {
    if (editingElementId || isPreviewMode) return;
    e.stopPropagation();

    const selected = elements.find(el => el.id === id);
    if (!selected) return;

    setSelectedElementId(id);

    if (isArrowDrawMode) {
      setDragConnectionStartId(id);
      const container = containerRef.current;
      if (container && e.touches.length > 0) {
        const rect = container.getBoundingClientRect();
        setDragConnectionCurrentPos({
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        });
      }
      return;
    }

    if (connectingFromId && connectingFromId !== id) {
      const exists = connections.some(c => c.fromId === connectingFromId && c.toId === id);
      if (!exists) {
        const newConnection: FlowConnection = {
          id: `conn-${Date.now()}`,
          fromId: connectingFromId,
          toId: id,
          label: 'Flow Connection',
          color: isChalkboard ? '#78716c' : '#78716c',
          style: connectionStyle
        };
        const nextConns = [...connections, newConnection];
        updateConnectionsAndPersist(nextConns);
        showToast('Connected flowchart elements successfully!');
      }
      setConnectingFromId(null);
      return;
    }

    setIsDraggingNode(true);
    if (e.touches.length > 0) {
      dragStartOffset.current = {
        x: e.touches[0].clientX / zoom - selected.x,
        y: e.touches[0].clientY / zoom - selected.y
      };
    }
  };

  const handleNodeMouseUp = (id: string, e: React.MouseEvent) => {
    if (dragConnectionStartId) {
      if (dragConnectionStartId !== id) {
        const exists = connections.some(c => c.fromId === dragConnectionStartId && c.toId === id);
        if (!exists) {
          const newConnection: FlowConnection = {
            id: `conn-${Date.now()}`,
            fromId: dragConnectionStartId,
            toId: id,
            label: 'Flow Connection',
            color: isChalkboard ? '#78716c' : '#78716c',
            style: connectionStyle
          };
          const nextConns = [...connections, newConnection];
          updateConnectionsAndPersist(nextConns);
          showToast('Connected flowchart elements successfully!');
        }
      }
      setDragConnectionStartId(null);
      setDragConnectionCurrentPos(null);
    }
  };

  const handleStageMouseDown = (e: React.MouseEvent) => {
    if (editingElementId || isPreviewMode) return;
    
    // Middle click, hand tool, or left-click on empty background/canvas container
    const isBgClick = e.target === e.currentTarget || (e.target as HTMLElement).id === 'diagram-stage-container' || (e.target as HTMLElement).classList.contains('canvas-background');
    if (e.button === 1 || activeBoardTool === 'hand' || isBgClick) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y
      };
      e.preventDefault();
    }
  };

  const handleStageMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    // Scale and pan corrected coordinate mapping:
    const stageX = Math.round((e.clientX - rect.left - panOffset.x) / zoom);
    const stageY = Math.round((e.clientY - rect.top - panOffset.y) / zoom);

    setCoords({ x: stageX, y: stageY });

    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    if (isDraggingNode && selectedElementId) {
      const updatedElements = elements.map(el => {
        if (el.id === selectedElementId) {
          return {
            ...el,
            x: Math.round(e.clientX / zoom - dragStartOffset.current.x),
            y: Math.round(e.clientY / zoom - dragStartOffset.current.y)
          };
        }
        return el;
      });
      setElements(updatedElements);
    }

    if (dragConnectionStartId) {
      setDragConnectionCurrentPos({ x: stageX, y: stageY });
    }
  };

  const handleStageTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];
    
    const stageX = Math.round((touch.clientX - rect.left - panOffset.x) / zoom);
    const stageY = Math.round((touch.clientY - rect.top - panOffset.y) / zoom);

    setCoords({ x: stageX, y: stageY });

    if (isPanning) {
      setPanOffset({
        x: touch.clientX - panStartRef.current.x,
        y: touch.clientY - panStartRef.current.y
      });
      return;
    }

    if (isDraggingNode && selectedElementId) {
      const updatedElements = elements.map(el => {
        if (el.id === selectedElementId) {
          return {
            ...el,
            x: Math.round(touch.clientX / zoom - dragStartOffset.current.x),
            y: Math.round(touch.clientY / zoom - dragStartOffset.current.y)
          };
        }
        return el;
      });
      setElements(updatedElements);
    }

    if (dragConnectionStartId) {
      setDragConnectionCurrentPos({ x: stageX, y: stageY });
    }
  };

  const handleStageMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDraggingNode) {
      setIsDraggingNode(false);
      updateElementsAndPersist(elements);
    }
    if (dragConnectionStartId) {
      setDragConnectionStartId(null);
      setDragConnectionCurrentPos(null);
    }
  };

  const handleStageWheel = (e: React.WheelEvent) => {
    // Zoom with scroll wheel
    const zoomFactor = 1.05;
    let nextZoom = zoom;
    if (e.deltaY < 0) {
      nextZoom = Math.min(3.0, zoom * zoomFactor);
    } else {
      nextZoom = Math.max(0.2, zoom / zoomFactor);
    }
    
    const container = containerRef.current;
    if (!container) {
      setZoom(nextZoom);
      return;
    }
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newPanX = mouseX - (mouseX - panOffset.x) * (nextZoom / zoom);
    const newPanY = mouseY - (mouseY - panOffset.y) * (nextZoom / zoom);
    
    setZoom(nextZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  const updateElementAttribute = (key: string, value: any) => {
    if (!selectedElementId) return;
    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, [key]: value };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
  };

  const handleStageTouchEnd = (e: React.TouchEvent) => {
    if (isDraggingNode) {
      setIsDraggingNode(false);
      updateElementsAndPersist(elements);
    }
    if (dragConnectionStartId && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
      const cardElement = targetElement?.closest('[data-node-id]');
      const targetNodeId = cardElement?.getAttribute('data-node-id');

      if (targetNodeId && dragConnectionStartId !== targetNodeId) {
        const exists = connections.some(c => c.fromId === dragConnectionStartId && c.toId === targetNodeId);
        if (!exists) {
          const newConnection: FlowConnection = {
            id: `conn-${Date.now()}`,
            fromId: dragConnectionStartId,
            toId: targetNodeId,
            label: 'Flow Connection',
            color: isChalkboard ? '#78716c' : '#78716c',
            style: connectionStyle
          };
          const nextConns = [...connections, newConnection];
          updateConnectionsAndPersist(nextConns);
          showToast('Connected flowchart elements successfully!');
        }
      }
      setDragConnectionStartId(null);
      setDragConnectionCurrentPos(null);
    }
  };

  // Inline edit text inside shape
  const startEditingText = (el: FlowElement) => {
    if (isPreviewMode) return;
    setEditingElementId(el.id);
    setEditingText(el.label);
  };

  const saveEditingText = () => {
    if (!editingElementId) return;
    const nextElements = elements.map(el => {
      if (el.id === editingElementId) {
        return { ...el, label: editingText };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
    setEditingElementId(null);
    showToast('Saved text change');
  };

  // Delete Node and its associated connections
  const deleteSelectedElement = () => {
    if (!selectedElementId) return;

    const nextElements = elements.filter(el => el.id !== selectedElementId);
    const nextConns = connections.filter(c => c.fromId !== selectedElementId && c.toId !== selectedElementId);

    updateElementsAndPersist(nextElements);
    updateConnectionsAndPersist(nextConns);
    setSelectedElementId(null);
    setConnectingFromId(null);
    showToast('Removed element and its connector arrows');
  };

  const deleteConnection = (connId: string) => {
    const nextConns = connections.filter(c => c.id !== connId);
    updateConnectionsAndPersist(nextConns);
    showToast('Removed arrow connection');
  };

  // Scale or Modify shape font sizes
  const changeFontSize = (increase: boolean) => {
    if (!selectedElementId) {
      setDefaultNodeStyle(prev => ({
        ...prev,
        fontSize: increase ? Math.min(24, prev.fontSize + 1) : Math.max(8, prev.fontSize - 1)
      }));
      return;
    }
    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        const currentSize = el.fontSize || 11;
        const newSize = increase ? Math.min(24, currentSize + 1) : Math.max(8, currentSize - 1);
        return { ...el, fontSize: newSize };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
  };

  const changeShapeSize = (widthDiff: number, heightDiff: number) => {
    if (!selectedElementId) {
      setDefaultNodeStyle(prev => ({
        ...prev,
        width: Math.max(60, prev.width + widthDiff),
        height: Math.max(30, prev.height + heightDiff)
      }));
      return;
    }
    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        const nextW = Math.max(60, el.width + widthDiff);
        const nextH = Math.max(30, el.height + heightDiff);
        return { ...el, width: nextW, height: nextH };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
  };

  // Toggle node color
  const changeNodeColor = (colorHex: string, textColorHex: string = '#ffffff') => {
    if (!selectedElementId) {
      setDefaultNodeStyle(prev => ({
        ...prev,
        color: colorHex,
        textColor: textColorHex
      }));
      showToast('Updated default shape color');
      return;
    }
    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, color: colorHex, textColor: textColorHex };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
    showToast('Updated element presentation color');
  };

  // YouTube Update handlers
  const updateYoutubeConfig = (url: string, loop: boolean, autoplay: boolean, mute: boolean) => {
    if (!selectedElementId) return;
    
    let videoId = 'jfKfPfyJRdk';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else if (url.trim().length === 11) {
      videoId = url.trim();
    }

    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        return {
          ...el,
          youtubeUrl: url,
          youtubeId: videoId,
          youtubeLoop: loop,
          youtubeAutoplay: autoplay,
          youtubeMute: mute
        };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
  };

  // Graphing Update handlers
  const updateGraphType = (type: 'bar' | 'pie' | 'line') => {
    if (!selectedElementId) return;
    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, graphType: type };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
  };

  const updateGraphTitle = (title: string) => {
    if (!selectedElementId) return;
    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, graphTitle: title };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
  };

  const updateGraphDataItem = (index: number, name: string, value: number) => {
    if (!selectedElementId) return;
    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        const nextData = [...(el.graphData || [])];
        if (nextData[index]) {
          nextData[index] = { name, value: isNaN(value) ? 0 : value };
        }
        return { ...el, graphData: nextData };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
  };

  const addGraphDataItem = (name: string, value: number) => {
    if (!selectedElementId) return;
    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        const nextData = [...(el.graphData || []), { name, value }];
        return { ...el, graphData: nextData };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
  };

  const deleteGraphDataItem = (index: number) => {
    if (!selectedElementId) return;
    const nextElements = elements.map(el => {
      if (el.id === selectedElementId) {
        const nextData = (el.graphData || []).filter((_, i) => i !== index);
        return { ...el, graphData: nextData };
      }
      return el;
    });
    updateElementsAndPersist(nextElements);
  };

  // Reset entire flowchart diagram
  const resetFlowchartDiagram = () => {
    const confirmReset = window.confirm('Are you sure you want to completely clear this flowchart workspace? This will delete all shapes, arrows, and custom notes.');
    if (!confirmReset) return;

    setElements([]);
    setConnections([]);
    setSelectedElementId(null);
    setConnectingFromId(null);
    localStorage.removeItem('bolek_flow_elements');
    localStorage.removeItem('bolek_flow_connections');
    showToast('Flowchart workspace discarded');
  };

  // PPT Presenter mode logic: college students and teachers love slide presentation order
  const startPresenterShow = () => {
    if (elements.length === 0) {
      showAlert('Add some flowchart shapes before starting presentation mode!');
      return;
    }
    setIsPreviewMode(true);
    setPresentationIndex(0);
    setSelectedElementId(elements[0].id);
    showToast('Starting Presentation Mode. Click "Next" or use Arrow keys to navigate!');
  };

  // Listen to keyboard arrow keys during Presentation Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPreviewMode || elements.length === 0) return;
      
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setPresentationIndex(prev => {
          const nextIdx = (prev + 1) % elements.length;
          setSelectedElementId(elements[nextIdx].id);
          return nextIdx;
        });
      } else if (e.key === 'ArrowLeft') {
        setPresentationIndex(prev => {
          const prevIdx = prev === 0 ? elements.length - 1 : prev - 1;
          setSelectedElementId(elements[prevIdx].id);
          return prevIdx;
        });
      } else if (e.key === 'Escape') {
        setIsPreviewMode(false);
        showToast('Presentation presentation ended.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewMode, elements]);

  // Export Freehand Draw Image helper
  const downloadCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `bolek-canvas-${new Date().toISOString().substring(0, 10)}.png`;
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    
    if (exportCtx) {
      exportCtx.fillStyle = isChalkboard ? '#1c1917' : '#ffffff';
      exportCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw background pattern if selected
      if (paperStyle === 'dot') {
        const spacing = 20;
        exportCtx.fillStyle = isChalkboard ? '#374151' : '#e5e7eb';
        for (let x = 0; x < canvas.width; x += spacing) {
          for (let y = 0; y < canvas.height; y += spacing) {
            exportCtx.beginPath();
            exportCtx.arc(x, y, 1.2, 0, Math.PI * 2);
            exportCtx.fill();
          }
        }
      } else if (paperStyle === 'graph') {
        const spacing = 20;
        exportCtx.strokeStyle = isChalkboard ? '#292524' : '#f5f5f4';
        exportCtx.lineWidth = 0.8;
        for (let x = 0; x < canvas.width; x += spacing) {
          exportCtx.beginPath();
          exportCtx.moveTo(x, 0);
          exportCtx.lineTo(x, canvas.height);
          exportCtx.stroke();
        }
        for (let y = 0; y < canvas.height; y += spacing) {
          exportCtx.beginPath();
          exportCtx.moveTo(0, y);
          exportCtx.lineTo(canvas.width, y);
          exportCtx.stroke();
        }
      } else if (paperStyle === 'ruled') {
        const spacing = 24;
        exportCtx.strokeStyle = isChalkboard ? '#292524' : '#f5f5f4';
        exportCtx.lineWidth = 0.8;
        for (let y = 0; y < canvas.height; y += spacing) {
          exportCtx.beginPath();
          exportCtx.moveTo(0, y);
          exportCtx.lineTo(canvas.width, y);
          exportCtx.stroke();
        }
      }

      // Draw vector elements if in flowchart mode
      if (workspaceMode === 'flowchart') {
        // Render simple proxy shapes onto export canvas so downloaded PNG has diagrams too!
        connections.forEach(conn => {
          const fromNode = elements.find(n => n.id === conn.fromId);
          const toNode = elements.find(n => n.id === conn.toId);
          if (fromNode && toNode) {
            const startX = fromNode.x + fromNode.width / 2;
            const startY = fromNode.y + fromNode.height / 2;
            const endX = toNode.x + toNode.width / 2;
            const endY = toNode.y + toNode.height / 2;

            exportCtx.beginPath();
            exportCtx.strokeStyle = isChalkboard ? '#a8a29e' : '#78716c';
            exportCtx.lineWidth = 2;
            exportCtx.moveTo(startX, startY);
            exportCtx.lineTo(endX, endY);
            exportCtx.stroke();
          }
        });

        elements.forEach(node => {
          exportCtx.fillStyle = node.color === 'transparent' ? (isChalkboard ? '#1c1917' : '#ffffff') : node.color;
          exportCtx.strokeStyle = isChalkboard ? '#374151' : '#e2e8f0';
          exportCtx.lineWidth = 1;

          if (node.type === 'terminal') {
            // Pill capsule rounded rect
            exportCtx.beginPath();
            exportCtx.roundRect(node.x, node.y, node.width, node.height, 20);
            exportCtx.fill();
            exportCtx.stroke();
          } else if (node.type === 'decision') {
            // Diamond
            exportCtx.beginPath();
            exportCtx.moveTo(node.x + node.width / 2, node.y);
            exportCtx.lineTo(node.x + node.width, node.y + node.height / 2);
            exportCtx.lineTo(node.x + node.width / 2, node.y + node.height);
            exportCtx.lineTo(node.x, node.y + node.height / 2);
            exportCtx.closePath();
            exportCtx.fill();
            exportCtx.stroke();
          } else {
            // Process or general rect
            exportCtx.beginPath();
            exportCtx.roundRect(node.x, node.y, node.width, node.height, 6);
            exportCtx.fill();
            exportCtx.stroke();
          }

          // Text labels
          exportCtx.fillStyle = node.color === 'transparent' && !isChalkboard ? '#1c1917' : (node.textColor || '#1c1917');
          exportCtx.font = `bold ${node.fontSize || 10}px sans-serif`;
          exportCtx.textAlign = 'center';
          exportCtx.textBaseline = 'middle';
          exportCtx.fillText(node.label.split('\n')[0], node.x + node.width / 2, node.y + node.height / 2, node.width - 10);
        });
      } else {
        // Freehand drawings draw
        exportCtx.drawImage(canvas, 0, 0);
      }
    }

    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Presentation workspace snapshot exported to local storage PNG');
  };

  const getBackgroundStyle = () => {
    const isDark = isChalkboard;
    const baseColor = isDark ? '#1c1917' : '#ffffff';
    
    if (paperStyle === 'blank') {
      return { backgroundColor: baseColor, backgroundImage: 'none' };
    }

    const strokeColor = gridColor || (isDark ? '#374151' : '#e5e7eb');
    
    let backgroundImage = '';
    let backgroundSize = `${gridSpacing}px ${gridSpacing}px`;

    if (paperStyle === 'dot') {
      backgroundImage = `radial-gradient(circle, ${strokeColor} ${gridSize / 8}px, transparent ${gridSize / 8}px)`;
    } else if (paperStyle === 'square') {
      backgroundImage = `linear-gradient(to right, ${strokeColor} 1px, transparent 1px), linear-gradient(to bottom, ${strokeColor} 1px, transparent 1px)`;
      backgroundSize = `${gridSpacing * 1.5}px ${gridSpacing * 1.5}px`;
    } else if (paperStyle === 'graph') {
      backgroundImage = `linear-gradient(to right, ${strokeColor} 1px, transparent 1px), linear-gradient(to bottom, ${strokeColor} 1px, transparent 1px)`;
      backgroundSize = `${gridSpacing / 1.5}px ${gridSpacing / 1.5}px`;
    } else if (paperStyle === 'ruled') {
      backgroundImage = `linear-gradient(to bottom, ${strokeColor} 1px, transparent 1px)`;
      backgroundSize = `100% ${gridSpacing}px`;
    } else if (paperStyle === 'isometric') {
      backgroundImage = `
        linear-gradient(30deg, ${strokeColor} 0.5px, transparent 0.5px),
        linear-gradient(150deg, ${strokeColor} 0.5px, transparent 0.5px),
        linear-gradient(270deg, ${strokeColor} 0.5px, transparent 0.5px)
      `;
      backgroundSize = `${gridSpacing * 1.732}px ${gridSpacing}px`;
    }

    return {
      backgroundColor: baseColor,
      backgroundImage,
      backgroundSize,
      opacity: gridOpacity / 100
    };
  };

  // Helper to find the intersection of a line from center to another point with the box's edges
  const getIntersectionPoint = (box: FlowElement, otherCenter: { x: number; y: number }) => {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const dx = otherCenter.x - cx;
    const dy = otherCenter.y - cy;

    if (dx === 0 && dy === 0) return { x: cx, y: cy };

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const halfW = box.width / 2;
    const halfH = box.height / 2;

    const scaleX = halfW / absDx;
    const scaleY = halfH / absDy;

    const scale = Math.min(scaleX, scaleY);

    return {
      x: cx + dx * scale,
      y: cy + dy * scale
    };
  };

  // Calculate starting and ending points on the edges of the boxes
  const calculatePathPoints = (from: FlowElement, to: FlowElement) => {
    const cx1 = from.x + from.width / 2;
    const cy1 = from.y + from.height / 2;
    const cx2 = to.x + to.width / 2;
    const cy2 = to.y + to.height / 2;

    const p1 = getIntersectionPoint(from, { x: cx2, y: cy2 });
    const p2 = getIntersectionPoint(to, { x: cx1, y: cy1 });

    return { p1, p2 };
  };

  // Helper connection path calculator (connects edge-to-edge)
  const calculatePath = (from: FlowElement, to: FlowElement, style: 'straight' | 'bezier' | 'orthogonal') => {
    const { p1, p2 } = calculatePathPoints(from, to);

    if (style === 'straight') {
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }

    if (style === 'orthogonal') {
      const midX = p1.x + (p2.x - p1.x) / 2;
      return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
    }

    // Bezier control offset based on distance
    const dx = Math.abs(p2.x - p1.x) * 0.5;
    return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
  };

  // Get the precise midpoint of a connection line to draw the disconnect trigger
  const getPathMidpoint = (from: FlowElement, to: FlowElement, style: 'straight' | 'bezier' | 'orthogonal') => {
    const { p1, p2 } = calculatePathPoints(from, to);
    if (style === 'straight') {
      return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }
    if (style === 'orthogonal') {
      const midX = p1.x + (p2.x - p1.x) / 2;
      return { x: midX, y: (p1.y + p2.y) / 2 };
    }
    const dx = Math.abs(p2.x - p1.x) * 0.5;
    const p0 = p1;
    const cp1 = { x: p1.x + dx, y: p1.y };
    const cp2 = { x: p2.x - dx, y: p2.y };
    const p3 = p2;

    const x = 0.125 * p0.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * p3.x;
    const y = 0.125 * p0.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * p3.y;
    return { x, y };
  };

  // Preset palette list for nodes customization
  const nodeThemeColors = [
    { name: 'Miro Yellow', bg: '#fef08a', text: '#1c1917' },
    { name: 'Lecture Blue', bg: '#1e40af', text: '#ffffff' },
    { name: 'Lecture Red', bg: '#be123c', text: '#ffffff' },
    { name: 'Lecture Green', bg: '#065f46', text: '#ffffff' },
    { name: 'Lecture Orange', bg: '#c2410c', text: '#ffffff' },
    { name: 'Pastel Purple', bg: '#c084fc', text: '#1c1917' },
    { name: 'Lecture White/Black', bg: isChalkboard ? '#ffffff' : '#1c1917', text: isChalkboard ? '#1c1917' : '#ffffff' },
    { name: 'Transparent Annotation', bg: 'transparent', text: isChalkboard ? '#f5f5f4' : '#1c1917' }
  ];

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-stone-50 border border-stone-200 rounded-lg overflow-hidden flex-1 relative">
      
      {/* Dynamic Slide Presentation Mode Overlay (Full Cover) */}
      <AnimatePresence>
        {isPreviewMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-50 flex flex-col justify-between p-6 ${isChalkboard ? 'bg-stone-950 text-white' : 'bg-stone-50 text-stone-900'}`}
          >
            {/* Header presentation remote */}
            <div className="flex items-center justify-between border-b border-stone-200/50 pb-4">
              <div className="flex items-center gap-2">
                <span className="bg-orange-500 text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">Live Presentation Mode</span>
                <h3 className="text-sm font-bold tracking-tight">
                  Slide {presentationIndex + 1} of {elements.length}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer transition shadow-2xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>Exit Show</span>
              </button>
            </div>

            {/* Presentation Stage area */}
            <div className="flex-1 flex items-center justify-center relative p-8">
              <AnimatePresence mode="wait">
                {elements[presentationIndex] && (
                  <motion.div
                    key={elements[presentationIndex].id}
                    initial={{ scale: 0.85, opacity: 0, y: 15 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: -15 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    className="flex flex-col items-center justify-center text-center p-8 max-w-xl shadow-xl border border-stone-200/30 rounded-2xl w-full"
                    style={{ 
                      backgroundColor: elements[presentationIndex].color === 'transparent' ? 'rgba(120, 113, 108, 0.05)' : elements[presentationIndex].color,
                      color: elements[presentationIndex].color === 'transparent' ? (isChalkboard ? '#f5f5f4' : '#1c1917') : elements[presentationIndex].textColor,
                      borderRadius: elements[presentationIndex].type === 'terminal' ? '9999px' : elements[presentationIndex].type === 'sticky' ? '0' : '16px',
                      transform: elements[presentationIndex].type === 'decision' ? 'rotate(0deg)' : 'none',
                      minHeight: '180px'
                    }}
                  >
                    {/* Decorative node shape layout icon */}
                    <div className="mb-4 opacity-30">
                      {elements[presentationIndex].type === 'decision' && <Hexagon className="w-12 h-12 stroke-[1.5]" />}
                      {elements[presentationIndex].type === 'sticky' && <Bookmark className="w-12 h-12 stroke-[1.5]" />}
                      {elements[presentationIndex].type === 'process' && <Square className="w-12 h-12 stroke-[1.5]" />}
                      {elements[presentationIndex].type === 'terminal' && <Sparkles className="w-12 h-12 stroke-[1.5]" />}
                      {elements[presentationIndex].type === 'text' && <Type className="w-12 h-12 stroke-[1.5]" />}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight whitespace-pre-wrap leading-snug">
                      {elements[presentationIndex].label}
                    </h2>
                    
                    {elements[presentationIndex].type === 'sticky' && (
                      <span className="text-[10px] mt-4 uppercase font-bold tracking-wider text-stone-400 font-mono">Lecture Memo Pin</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Presentation Navigation Footer Remote panel */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-200/40 pt-4">
              <span className="text-stone-400 text-[10px] font-mono tracking-wider uppercase hidden sm:inline-block">
                💡 Tip: Use Left & Right Arrow keys on your keyboard
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const prevIdx = presentationIndex === 0 ? elements.length - 1 : presentationIndex - 1;
                    setPresentationIndex(prevIdx);
                    setSelectedElementId(elements[prevIdx].id);
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border cursor-pointer hover:scale-105 active:scale-95 transition ${isChalkboard ? 'border-stone-800 bg-stone-900 hover:bg-stone-850' : 'border-stone-200 bg-white hover:bg-stone-100'}`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="text-xs font-mono font-bold tracking-widest bg-orange-500/10 text-orange-600 px-3 py-1 rounded-full">
                  {presentationIndex + 1} / {elements.length}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (presentationIndex + 1) % elements.length;
                    setPresentationIndex(nextIdx);
                    setSelectedElementId(elements[nextIdx].id);
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border cursor-pointer hover:scale-105 active:scale-95 transition ${isChalkboard ? 'border-stone-800 bg-stone-900 hover:bg-stone-850' : 'border-stone-200 bg-white hover:bg-stone-100'}`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-stone-400">Speaker Auto-Focus:</span>
                <span className="text-[11px] font-extrabold text-orange-500">Enabled</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Sidebar Control Panel - tailored contextually based on mode selected */}
      <div className="w-full md:w-60 bg-stone-100/40 border-b md:border-b-0 md:border-r border-stone-200 p-4 flex flex-col gap-4 shrink-0 select-none">
        
        {/* Header Title */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-orange-600 font-semibold !text-lg">palette</span>
            <h2 className="text-xs font-bold text-stone-900 tracking-wide uppercase">Bolek Canvas</h2>
          </div>
          <p className="text-[10px] text-stone-400 font-medium leading-tight">Miro interactive flowcharting & sketching tool</p>
        </div>

        {/* Workspace Mode Toggler (Freehand Canvas vs Miro Flowchart/Diagram/Graphing Suites) */}
        <div className="bg-stone-900 text-white rounded-xl p-1 shadow-sm grid grid-cols-2 gap-1 shrink-0 select-none">
          <button
            type="button"
            onClick={() => setWorkspaceMode('freehand')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition ${workspaceMode === 'freehand' ? 'bg-orange-500 text-white shadow-xs' : 'text-stone-400 hover:text-white'}`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>✏️ Sketching</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceMode('flowchart')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition ${workspaceMode === 'flowchart' ? 'bg-orange-500 text-white shadow-xs' : 'text-stone-400 hover:text-white'}`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>📊 Flowchart</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceMode('diagram')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition ${workspaceMode === 'diagram' ? 'bg-orange-500 text-white shadow-xs' : 'text-stone-400 hover:text-white'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>📐 Diagram</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceMode('graphing')}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition ${workspaceMode === 'graphing' ? 'bg-orange-500 text-white shadow-xs' : 'text-stone-400 hover:text-white'}`}
          >
            <BarChart className="w-3.5 h-3.5" />
            <span>📈 Graphing</span>
          </button>
        </div>

        {/* Board Mode Switcher (Whiteboard vs Chalkboard) */}
        <div className="bg-white/80 border border-stone-200/60 rounded-lg p-2.5 shadow-2xs">
          <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block mb-2">Workspace Theme</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setIsChalkboard(false)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[10px] font-semibold border cursor-pointer transition ${!isChalkboard ? 'bg-stone-900 border-stone-900 text-white shadow-xs' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Whiteboard</span>
            </button>
            <button
              type="button"
              onClick={() => setIsChalkboard(true)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[10px] font-semibold border cursor-pointer transition ${isChalkboard ? 'bg-stone-900 border-stone-900 text-white shadow-xs' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Chalkboard</span>
            </button>
          </div>
        </div>

        {/* Vector Boards Layouts Panel (Flowchart, Diagram, Graphing) */}
        {(workspaceMode === 'flowchart' || workspaceMode === 'diagram' || workspaceMode === 'graphing') && (
          <div className="bg-white/80 border border-stone-200/60 rounded-lg p-2.5 shadow-2xs space-y-3 flex-1 flex flex-col overflow-y-auto">
            
            {/* 1. FLOWCHART SUB-TOOLBAR */}
            {workspaceMode === 'flowchart' && (
              <div className="space-y-2">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Add Flowchart Shapes</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => addFlowElement('terminal')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center"
                  >
                    <div className="w-7 h-4 rounded-full border border-stone-400 bg-emerald-50" />
                    <span className="text-[8px] font-bold">Terminal / Pill</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('process')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center"
                  >
                    <div className="w-7 h-4 rounded-xs border border-stone-400 bg-blue-50" />
                    <span className="text-[8px] font-bold">Process / Rect</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('decision')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center"
                  >
                    <div className="w-5 h-5 border border-stone-400 bg-yellow-50 rotate-45" />
                    <span className="text-[8px] font-bold">Decision / Diam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('io')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center"
                  >
                    <div className="w-7 h-4 border border-stone-400 bg-orange-50 skew-x-12" />
                    <span className="text-[8px] font-bold">I/O / Parallelo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('sticky')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center col-span-2"
                  >
                    <div className="w-6 h-6 border-b-2 border border-stone-400 bg-yellow-200/60 flex items-center justify-center text-[8px] font-bold font-mono">🗒️</div>
                    <span className="text-[8px] font-bold">Interactive Sticky Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('text')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center col-span-2"
                  >
                    <Type className="w-4 h-4 text-stone-500" />
                    <span className="text-[8px] font-bold">Text Label Annotation</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-stone-100 space-y-1">
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Arrow styling</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'bezier', label: 'Curve' },
                      { id: 'straight', label: 'Direct' },
                      { id: 'orthogonal', label: 'Orthog' }
                    ].map(styleOpt => (
                      <button
                        key={styleOpt.id}
                        type="button"
                        onClick={() => setConnectionStyle(styleOpt.id as any)}
                        className={`px-1.5 py-1 border rounded text-[8px] font-bold cursor-pointer transition ${connectionStyle === styleOpt.id ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                      >
                        {styleOpt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 space-y-1.5">
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">🖱️ Connector Tool</span>
                  <button
                    type="button"
                    onClick={() => setIsArrowDrawMode(!isArrowDrawMode)}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[9px] font-extrabold border cursor-pointer transition ${isArrowDrawMode ? 'bg-orange-600 border-orange-600 text-white shadow-sm' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'}`}
                  >
                    <ArrowRight className={`w-3.5 h-3.5 ${isArrowDrawMode ? 'text-white' : 'text-orange-500'}`} />
                    <span>{isArrowDrawMode ? 'Draw Mode ACTIVE' : 'Draw Connector Arrow'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. DIAGRAM SUB-TOOLBAR */}
            {workspaceMode === 'diagram' && (
              <div className="space-y-2">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Add Diagram Elements</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => addFlowElement('diagram-shape', { diagramShape: 'circle' })}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center"
                  >
                    <div className="w-5 h-5 rounded-full border border-stone-400 bg-sky-50" />
                    <span className="text-[8px] font-bold">Circle Node</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('diagram-shape', { diagramShape: 'rectangle' })}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center"
                  >
                    <div className="w-6 h-4 border border-stone-400 bg-indigo-50" />
                    <span className="text-[8px] font-bold">Diagram Block</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('diagram-shape', { diagramShape: 'triangle' })}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center"
                  >
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[18px] border-b-cyan-500" />
                    <span className="text-[8px] font-bold">Triangle Shape</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('diagram-shape', { diagramShape: 'star' })}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center"
                  >
                    <span className="text-yellow-500 font-bold text-xs">⭐</span>
                    <span className="text-[8px] font-bold">Premium Star</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('diagram-shape', { diagramShape: 'cloud' })}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center"
                  >
                    <span className="text-teal-500 font-bold text-xs">☁️</span>
                    <span className="text-[8px] font-bold">Cloud Cluster</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('diagram-shape', { diagramShape: 'hexagon' })}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center"
                  >
                    <span className="text-blue-600 font-bold text-xs">⬡</span>
                    <span className="text-[8px] font-bold">Hexagonal Cell</span>
                  </button>

                  <div className="col-span-2 pt-1 border-t border-stone-100">
                    <span className="text-[7.5px] font-bold text-stone-400 block mb-1">Venn Diagrams & Mindmap Setups</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => addFlowElement('diagram-shape', { diagramShape: 'venn-left' })}
                        className="p-1 rounded border border-stone-200 bg-stone-50 hover:bg-white text-[7.5px] font-bold text-stone-700 hover:border-stone-500 transition text-center truncate"
                      >
                        Venn Set A
                      </button>
                      <button
                        type="button"
                        onClick={() => addFlowElement('diagram-shape', { diagramShape: 'venn-mid' })}
                        className="p-1 rounded border border-stone-200 bg-stone-50 hover:bg-white text-[7.5px] font-bold text-stone-700 hover:border-stone-500 transition text-center truncate"
                      >
                        Venn Intersect
                      </button>
                      <button
                        type="button"
                        onClick={() => addFlowElement('diagram-shape', { diagramShape: 'venn-right' })}
                        className="p-1 rounded border border-stone-200 bg-stone-50 hover:bg-white text-[7.5px] font-bold text-stone-700 hover:border-stone-500 transition text-center truncate"
                      >
                        Venn Set B
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => addFlowElement('diagram-shape', { diagramShape: 'mindmap' })}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer text-center col-span-2"
                  >
                    <div className="w-7 h-4 rounded-full border-2 border-dashed border-pink-400 bg-pink-50" />
                    <span className="text-[8px] font-bold">Central Mindmap Bubble</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('youtube')}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-red-200 bg-red-50/50 text-red-700 hover:border-red-900 hover:bg-white transition cursor-pointer text-center col-span-2"
                  >
                    <Video className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                    <span className="text-[8px] font-bold">Embed YouTube Presentation Video</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. GRAPHING SUB-TOOLBAR */}
            {workspaceMode === 'graphing' && (
              <div className="space-y-2">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">Add Presentation Charts</span>
                <p className="text-[7.5px] text-stone-400 leading-snug">Generate real live interactive graphs to present stats, reports, or research data!</p>
                
                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => addFlowElement('graph', { graphType: 'bar' })}
                    className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer"
                  >
                    <BarChart className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[8.5px] font-extrabold text-stone-800">Add Bar Graph Widget</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('graph', { graphType: 'pie' })}
                    className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[8.5px] font-extrabold text-stone-800">Add Pie Graph Widget</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => addFlowElement('graph', { graphType: 'line' })}
                    className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-900 hover:bg-white transition cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-[8.5px] font-extrabold text-stone-800">Add Line Graph Widget</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3.5 UNIFIED PREMIUMS & EMBEDS SECTION */}
            <div className="pt-2.5 border-t border-stone-100 space-y-2">
              <span className="text-[9px] text-orange-600 font-extrabold uppercase tracking-wider block flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px] animate-pulse">workspace_premium</span>
                Bolek Premium Objects
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => addFlowElement('heading')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">format_size</span>
                  <span className="text-[8px] font-bold">Big Heading</span>
                </button>

                <button
                  type="button"
                  onClick={() => addFlowElement('image')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">image</span>
                  <span className="text-[8px] font-bold">Image Asset</span>
                </button>

                <button
                  type="button"
                  onClick={() => addFlowElement('pdf')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">picture_as_pdf</span>
                  <span className="text-[8px] font-bold">PDF Reader</span>
                </button>

                <button
                  type="button"
                  onClick={() => addFlowElement('audio')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">record_voice_over</span>
                  <span className="text-[8px] font-bold">Lecture Audio</span>
                </button>

                <button
                  type="button"
                  onClick={() => addFlowElement('website')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">language</span>
                  <span className="text-[8px] font-bold">Website Embed</span>
                </button>

                <button
                  type="button"
                  onClick={() => addFlowElement('table')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">table_chart</span>
                  <span className="text-[8px] font-bold">Spreadsheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => addFlowElement('code')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">code</span>
                  <span className="text-[8px] font-bold">Code Block</span>
                </button>

                <button
                  type="button"
                  onClick={() => addFlowElement('math')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">functions</span>
                  <span className="text-[8px] font-bold">Math Equation</span>
                </button>

                <button
                  type="button"
                  onClick={() => addFlowElement('icon')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">grade</span>
                  <span className="text-[8px] font-bold">Vector Icon</span>
                </button>

                <button
                  type="button"
                  onClick={() => addFlowElement('emoji')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">sentiment_satisfied</span>
                  <span className="text-[8px] font-bold">Emoji Face</span>
                </button>

                <button
                  type="button"
                  onClick={() => addFlowElement('file')}
                  className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-500 hover:bg-white transition cursor-pointer text-center col-span-2"
                >
                  <span className="material-symbols-outlined text-stone-500 text-xs">cloud_download</span>
                  <span className="text-[8px] font-bold">Downloadable Asset Link</span>
                </button>
              </div>
            </div>

            {/* 4. PERMANENTLY INTACT SHAPE & COLOR CUSTOMIZER */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">🎨 Style Settings</span>
              
              {/* If YouTube element is selected, show custom YouTube config */}
              {selectedElement && selectedElement.type === 'youtube' ? (
                <div className="p-2 rounded bg-stone-900 text-stone-200 space-y-2 text-[8px]">
                  <span className="font-bold text-red-400 block uppercase tracking-wider">YouTube Settings</span>
                  <div className="space-y-1">
                    <label className="block text-stone-400 font-medium">Video URL / ID:</label>
                    <input
                      type="text"
                      value={selectedElement.youtubeUrl || ''}
                      onChange={(e) => updateYoutubeConfig(e.target.value, selectedElement.youtubeLoop || false, selectedElement.youtubeAutoplay || false, selectedElement.youtubeMute || false)}
                      placeholder="e.g., https://youtu.be/jfKfPfyJRdk"
                      className="w-full p-1 bg-stone-800 border border-stone-700 rounded text-stone-100 text-[8px] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedElement.youtubeLoop || false}
                        onChange={(e) => updateYoutubeConfig(selectedElement.youtubeUrl || '', e.target.checked, selectedElement.youtubeAutoplay || false, selectedElement.youtubeMute || false)}
                        className="rounded bg-stone-800 border-stone-700"
                      />
                      <span>Loop Video Player</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedElement.youtubeAutoplay || false}
                        onChange={(e) => updateYoutubeConfig(selectedElement.youtubeUrl || '', selectedElement.youtubeLoop || false, e.target.checked, selectedElement.youtubeMute || false)}
                        className="rounded bg-stone-800 border-stone-700"
                      />
                      <span>Autoplay Video</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedElement.youtubeMute || false}
                        onChange={(e) => updateYoutubeConfig(selectedElement.youtubeUrl || '', selectedElement.youtubeLoop || false, selectedElement.youtubeAutoplay || false, e.target.checked)}
                        className="rounded bg-stone-800 border-stone-700"
                      />
                      <span>Mute Audio Track</span>
                    </label>
                  </div>
                </div>
              ) : selectedElement && selectedElement.type === 'graph' ? (
                /* Graphing data customizer */
                <div className="p-2 rounded bg-stone-50 border border-stone-200/60 space-y-2.5 text-[8.5px]">
                  <span className="font-bold text-stone-800 block uppercase tracking-wider">Graph Customizer</span>
                  
                  <div className="space-y-1">
                    <label className="block text-stone-500 font-medium">Chart Title:</label>
                    <input
                      type="text"
                      value={selectedElement.graphTitle || ''}
                      onChange={(e) => updateGraphTitle(e.target.value)}
                      className="w-full p-1 border border-stone-200 rounded font-bold text-[8.5px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-stone-500 font-medium">Chart Layout Type:</label>
                    <div className="grid grid-cols-3 gap-1 font-sans">
                      {['bar', 'pie', 'line'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updateGraphType(t as any)}
                          className={`py-0.5 border rounded capitalize text-[8px] font-bold ${selectedElement.graphType === t ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dataset values editor */}
                  <div className="space-y-1.5 pt-1.5 border-t border-stone-150">
                    <span className="font-bold text-stone-600 block text-[7.5px] uppercase font-mono">Dataset Values:</span>
                    <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                      {(selectedElement.graphData || []).map((item, idx) => (
                        <div key={idx} className="flex gap-1 items-center">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateGraphDataItem(idx, e.target.value, item.value)}
                            className="w-1/2 p-0.5 border border-stone-200 rounded font-mono text-[8px]"
                            placeholder="Category"
                          />
                          <input
                            type="number"
                            value={item.value}
                            onChange={(e) => updateGraphDataItem(idx, item.name, parseFloat(e.target.value))}
                            className="w-1/4 p-0.5 border border-stone-200 rounded font-mono text-[8px]"
                          />
                          <button
                            type="button"
                            onClick={() => deleteGraphDataItem(idx)}
                            className="text-red-500 hover:text-red-700 text-[10px] px-1 font-bold"
                            title="Delete category row"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addGraphDataItem('New Category', 50)}
                      className="w-full py-0.5 bg-stone-100 border border-stone-200 text-stone-700 rounded text-[7.5px] font-bold hover:bg-stone-200 cursor-pointer"
                    >
                      + Add New Category Row
                    </button>
                  </div>
                </div>
              ) : (
                /* General Shape Stylings (Always intact, falls back to defaultNodeStyle if nothing is selected) */
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <span className="text-[8px] text-stone-400 font-semibold block">
                      {selectedElement ? 'Fill Color:' : 'Default Shape Fill Color:'}
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {nodeThemeColors.map((theme, i) => {
                        const targetColor = selectedElement ? selectedElement.color : defaultNodeStyle.color;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => changeNodeColor(theme.bg, theme.text)}
                            className={`h-4.5 rounded border hover:scale-105 cursor-pointer transition flex items-center justify-center ${targetColor === theme.bg ? 'ring-2 ring-orange-500' : 'border-stone-200'}`}
                            style={{ backgroundColor: theme.bg === 'transparent' ? 'rgba(120, 113, 108, 0.1)' : theme.bg }}
                            title={theme.name}
                          >
                            {targetColor === theme.bg && <Check className="w-2.5 h-2.5 text-orange-600 mix-blend-difference" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] text-stone-400 font-semibold block">Size Dimensions:</span>
                    <div className="grid grid-cols-2 gap-1 bg-stone-50 p-1 rounded border border-stone-150 font-sans">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[7px] text-stone-400 uppercase font-bold">Width</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => changeShapeSize(-20, 0)}
                            className="w-4 h-4 bg-white border border-stone-200 rounded flex items-center justify-center text-[9px] font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                          >-</button>
                          <button
                            type="button"
                            onClick={() => changeShapeSize(20, 0)}
                            className="w-4 h-4 bg-white border border-stone-200 rounded flex items-center justify-center text-[9px] font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                          >+</button>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[7px] text-stone-400 uppercase font-bold">Height</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => changeShapeSize(0, -10)}
                            className="w-4 h-4 bg-white border border-stone-200 rounded flex items-center justify-center text-[9px] font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                          >-</button>
                          <button
                            type="button"
                            onClick={() => changeShapeSize(0, 10)}
                            className="w-4 h-4 bg-white border border-stone-200 rounded flex items-center justify-center text-[9px] font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                          >+</button>
                        </div>
                      </div>
                    </div>

                    {/* Font size adjustments */}
                    <div className="flex items-center justify-between border border-stone-150 rounded p-1 bg-stone-50 mt-1">
                      <span className="text-[8px] font-semibold text-stone-500">
                        Text Size ({selectedElement ? (selectedElement.fontSize || 11) : defaultNodeStyle.fontSize}px)
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => changeFontSize(false)}
                          className="w-4 h-4 bg-white border border-stone-200 rounded flex items-center justify-center text-[9px] font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                        >-</button>
                        <button
                          type="button"
                          onClick={() => changeFontSize(true)}
                          className="w-4 h-4 bg-white border border-stone-200 rounded flex items-center justify-center text-[9px] font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                        >+</button>
                      </div>
                    </div>
                  </div>

                  {selectedElement && (
                    <div className="pt-1.5 border-t border-stone-100 flex gap-1 justify-between">
                      <button
                        type="button"
                        onClick={() => setConnectingFromId(selectedElement.id)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 px-1 rounded text-[8px] font-extrabold text-white transition cursor-pointer ${connectingFromId === selectedElement.id ? 'bg-amber-600' : 'bg-orange-600 hover:bg-orange-500'}`}
                      >
                        <ArrowRight className="w-2.5 h-2.5" />
                        <span>{connectingFromId === selectedElement.id ? 'LINKING...' : 'LINK SHAPE'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={deleteSelectedElement}
                        className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition cursor-pointer flex items-center justify-center"
                        title="Delete Selected Shape"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions Suite */}
            <div className="pt-2 border-t border-stone-100 flex flex-col gap-1.5 shrink-0 select-none">
              <button
                type="button"
                onClick={startPresenterShow}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 bg-orange-600 text-white text-[10px] font-extrabold rounded-lg hover:bg-orange-500 cursor-pointer shadow-sm active:scale-95 transition"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Start Presentation</span>
              </button>
              <button
                type="button"
                onClick={seedDefaultFlowchart}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-stone-200/70 hover:bg-stone-200 text-stone-700 text-[9px] font-bold rounded-lg cursor-pointer transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Demo Layout</span>
              </button>
            </div>
          </div>
        )}

        {/* Freehand Canvas Elements Toolbar */}
        {workspaceMode === 'freehand' && (
          <>
            {/* Draw Tools selector */}
            <div className="bg-white/80 border border-stone-200/60 rounded-lg p-2.5 shadow-2xs">
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block mb-2">Drawing Tool</span>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'brush', label: 'Classic Brush', icon: PenTool, desc: 'Sharp ink drawing' },
                  { id: 'highlighter', label: 'Marker Highlight', icon: Palette, desc: 'Semi-transparent overlay' },
                  { id: 'dashed', label: 'Dashed Stroke', icon: Grid, desc: 'Precise dotted outline' },
                  { id: 'calligraphy', label: 'Flat Calligraphy', icon: Sparkles, desc: 'Angled stroke ribbon' },
                  { id: 'eraser', label: 'Friction Eraser', icon: Eraser, desc: 'Clear specific segments' }
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = tool === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTool(t.id as Tool)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${isSelected ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100/70'}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-orange-500' : 'text-stone-400'}`} />
                      <div>
                        <div className="text-[10px] font-bold leading-normal">{t.label}</div>
                        <div className={`text-[8px] leading-normal ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thickness Slider */}
            <div className="bg-white/80 border border-stone-200/60 rounded-lg p-2.5 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Brush Diameter</span>
                <span className="text-[9px] font-mono font-bold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded">{brushSize}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="40"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full accent-stone-900 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[8px] text-stone-400 font-mono mt-1">
                <span>2px</span>
                <span>20px</span>
                <span>40px</span>
              </div>
            </div>
          </>
        )}

        {/* Paper Background options */}
        <div className="bg-white/80 border border-stone-200/60 rounded-lg p-2.5 shadow-2xs mt-auto">
          <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block mb-2">Paper Style Grid</span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'blank', label: 'Plain Solid' },
              { id: 'dot', label: 'Dot Matrix' },
              { id: 'graph', label: 'Graph Grid' },
              { id: 'ruled', label: 'Ruled Lines' },
            ].map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setPaperStyle(style.id as PaperStyle)}
                className={`flex flex-col items-center justify-center p-2 rounded-md border text-[9px] font-bold cursor-pointer transition ${paperStyle === style.id ? 'bg-stone-50 border-stone-900 text-stone-950 shadow-2xs font-extrabold' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}
              >
                <span className="truncate max-w-full text-center leading-none">{style.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Main interactive stage area */}
      <div className="flex-1 flex flex-col min-w-0 bg-stone-50 relative">
        
        {/* Top Control Bar for action buttons */}
        <div className="h-12 border-b border-stone-200 px-4 bg-white/75 flex items-center justify-between gap-3 shrink-0 select-none z-10">
          
          {/* Quick Snapshot Actions (Undo/Redo/Discard) */}
          <div className="flex items-center gap-1.5">
            {workspaceMode === 'freehand' ? (
              <>
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStackRef.current.length === 0}
                  className="w-8 h-8 rounded-lg border border-stone-200/80 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 disabled:hover:bg-white transition shadow-2xs cursor-pointer active:scale-95"
                  title="Undo Drawing Stroke"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStackRef.current.length === 0}
                  className="w-8 h-8 rounded-lg border border-stone-200/80 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 disabled:hover:bg-white transition shadow-2xs cursor-pointer active:scale-95"
                  title="Redo Drawing Stroke"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                <div className="h-4 w-[1px] bg-stone-200 mx-1"></div>
                <button
                  type="button"
                  onClick={() => clearCanvas(false)}
                  disabled={!hasDrawn}
                  className="flex items-center gap-1 px-2.5 h-8 rounded-lg border border-red-100 bg-red-50/40 text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-45 disabled:hover:bg-red-50/40 transition shadow-2xs cursor-pointer text-[10px] font-bold active:scale-95"
                  title="Discard freehand drawing"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Brush</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={resetFlowchartDiagram}
                  className="flex items-center gap-1 px-2.5 h-8 rounded-lg border border-red-100 bg-red-50/40 text-red-600 hover:bg-red-50 hover:border-red-200 transition shadow-2xs cursor-pointer text-[10px] font-bold active:scale-95"
                  title="Delete all shapes"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Discard Diagram</span>
                </button>
                
                {connectingFromId && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    <span>Select target shape to attach arrow connector...</span>
                    <button
                      type="button"
                      onClick={() => setConnectingFromId(null)}
                      className="text-amber-500 hover:text-amber-800 font-bold ml-1"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick Shape Customizer Overlay Options (Displayed when shape is selected in Flowchart) */}
          {workspaceMode === 'flowchart' && selectedElementId && (
            <div className="flex items-center gap-2 bg-stone-900 text-white rounded-lg px-2.5 py-1 z-20">
              <span className="text-[8px] font-bold text-stone-400 font-mono tracking-wider uppercase mr-1">Shape Customizer:</span>
              
              {/* Scale Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => changeShapeSize(20, 0)}
                  className="w-5 h-5 rounded hover:bg-stone-800 flex items-center justify-center text-[9px] font-bold"
                  title="Wider"
                >
                  W+
                </button>
                <button
                  type="button"
                  onClick={() => changeShapeSize(-20, 0)}
                  className="w-5 h-5 rounded hover:bg-stone-800 flex items-center justify-center text-[9px] font-bold"
                  title="Narrower"
                >
                  W-
                </button>
                <button
                  type="button"
                  onClick={() => changeShapeSize(0, 10)}
                  className="w-5 h-5 rounded hover:bg-stone-800 flex items-center justify-center text-[9px] font-bold"
                  title="Taller"
                >
                  H+
                </button>
                <button
                  type="button"
                  onClick={() => changeShapeSize(0, -10)}
                  className="w-5 h-5 rounded hover:bg-stone-800 flex items-center justify-center text-[9px] font-bold"
                  title="Shorter"
                >
                  H-
                </button>
              </div>

              <div className="w-[1px] h-3.5 bg-stone-800" />

              {/* Font Size controls */}
              <button
                type="button"
                onClick={() => changeFontSize(true)}
                className="p-1 rounded hover:bg-stone-800"
                title="Larger Text Font"
              >
                <Plus className="w-3 h-3 text-stone-300" />
              </button>
              <button
                type="button"
                onClick={() => changeFontSize(false)}
                className="p-1 rounded hover:bg-stone-800"
                title="Smaller Text Font"
              >
                <Minus className="w-3 h-3 text-stone-300" />
              </button>

              <div className="w-[1px] h-3.5 bg-stone-800" />

              {/* Node Color Swapper */}
              <div className="flex items-center gap-1">
                {nodeThemeColors.map((theme, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => changeNodeColor(theme.bg, theme.text)}
                    className="w-3.5 h-3.5 rounded-full border border-stone-800 hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: theme.bg === 'transparent' ? 'rgba(255,255,255,0.2)' : theme.bg }}
                    title={theme.name}
                  />
                ))}
              </div>

              <div className="w-[1px] h-3.5 bg-stone-800" />

              {/* Connector Pin */}
              <button
                type="button"
                onClick={() => setConnectingFromId(selectedElementId)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-600 text-[8px] font-extrabold hover:bg-orange-500 transition"
                title="Connect this shape with another"
              >
                <ArrowRight className="w-2.5 h-2.5" />
                <span>CONNECT</span>
              </button>

              {/* Delete Node */}
              <button
                type="button"
                onClick={deleteSelectedElement}
                className="p-1 rounded bg-red-950 text-red-400 hover:bg-red-900 transition"
                title="Delete Selected Shape"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Color Palettes Swatch for Drawing Brush */}
          {workspaceMode === 'freehand' && tool !== 'eraser' && (
            <div className="flex items-center gap-1 bg-stone-50 border border-stone-200/60 p-1 rounded-lg z-10">
              <div className="flex items-center gap-1.5 px-1 sm:px-2">
                {currentPresetColors.map((color) => {
                  const isActive = brushColor.toLowerCase() === color.value.toLowerCase();
                  return (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setBrushColor(color.value)}
                      className="w-5 h-5 rounded-full relative transition cursor-pointer hover:scale-110 active:scale-90 shadow-2xs"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {isActive && (
                        <span className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-stone-50 mix-blend-difference"></span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="h-4 w-[1px] bg-stone-200"></div>
              {/* Custom Color Selector Picker */}
              <div className="relative flex items-center ml-1" title="Pick Custom Color">
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-6 h-6 rounded-md cursor-pointer border border-stone-200/80 p-0.5 bg-white shrink-0 outline-none"
                />
              </div>
            </div>
          )}

          {/* Export Action */}
          <div className="flex items-center z-10">
            <button
              type="button"
              onClick={downloadCanvasImage}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-stone-900 bg-stone-900 text-white hover:bg-stone-850 transition shadow-xs cursor-pointer text-[10px] font-bold active:scale-95 animate-in fade-in"
              title="Save work as local PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Image</span>
            </button>
          </div>

        </div>

        {/* Dynamic Drawing stage & vector cards canvas wrapper */}
        <div 
          ref={containerRef} 
          className="flex-1 p-4 relative overflow-hidden flex items-center justify-center min-h-[450px]"
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onTouchMove={handleStageTouchMove}
          onTouchEnd={handleStageTouchEnd}
          onClick={() => {
            if (!isDraggingNode) {
              setSelectedElementId(null);
            }
          }}
        >
          {/* Dynamic Infinite Workspace Background Grid */}
          <div 
            id="diagram-stage-container"
            className="absolute inset-0 z-0 transition-all duration-300 canvas-background cursor-grab active:cursor-grabbing" 
            style={getBackgroundStyle()}
            onMouseDown={handleStageMouseDown}
            onWheel={handleStageWheel}
          />

          {/* Mode 1: Freehand Drawing Canvas */}
          {workspaceMode === 'freehand' && (
            <canvas
              ref={canvasRef}
              className="shadow-xs rounded-xl transition-all duration-300 border border-stone-200/60 cursor-crosshair z-10 max-w-full max-h-full"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          )}

          {/* Mode 2: Interactive Miro Vector Flowchart/Diagram/Graphing Board Overlay */}
          {(workspaceMode === 'flowchart' || workspaceMode === 'diagram' || workspaceMode === 'graphing') && (
            <div className="absolute inset-0 z-10 w-full h-full overflow-hidden select-none">
              
              {/* Scale and Pan Transformed Sub-Container wrapper */}
              <div 
                style={{ 
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, 
                  transformOrigin: '0 0',
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              >
                {/* Interactive Vector SVG Connectors Overlay */}
              <svg className="w-full h-full absolute inset-0 pointer-events-none z-10">
                <defs>
                  {/* Arrowhead markers for flow lines */}
                  <marker
                    id="arrowhead"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill={isChalkboard ? '#a8a29e' : '#78716c'} />
                  </marker>
                  <marker
                    id="arrowhead-selected"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f97316" />
                  </marker>
                </defs>

                {/* Draw flow lines connecting nodes */}
                {connections.map(conn => {
                  const fromNode = elements.find(n => n.id === conn.fromId);
                  const toNode = elements.find(n => n.id === conn.toId);
                  if (!fromNode || !toNode) return null;

                  const isConnActive = selectedElementId === conn.fromId || selectedElementId === conn.toId;
                  const dPath = calculatePath(fromNode, toNode, conn.style || connectionStyle);
                  const mid = getPathMidpoint(fromNode, toNode, conn.style || connectionStyle);

                  return (
                    <g key={conn.id} className="pointer-events-auto cursor-pointer">
                      {/* Interactive click helper path */}
                      <path
                        d={dPath}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="15"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Do you want to delete this connector arrow?')) {
                            deleteConnection(conn.id);
                          }
                        }}
                        title="Click to remove connection arrow"
                      />
                      {/* Actual rendered path */}
                      <path
                        d={dPath}
                        fill="none"
                        stroke={isConnActive ? '#f97316' : (isChalkboard ? '#a8a29e' : '#78716c')}
                        strokeWidth={isConnActive ? '2.5' : '1.8'}
                        markerEnd={`url(#${isConnActive ? 'arrowhead-selected' : 'arrowhead'})`}
                        strokeDasharray={conn.style === 'orthogonal' ? 'none' : 'none'}
                        className="transition-all duration-150"
                      />
                      {/* Small circular disconnect trigger handle button */}
                      <circle
                        cx={mid.x}
                        cy={mid.y}
                        r="7"
                        className="fill-white stroke-red-500 hover:fill-red-50 transition cursor-pointer"
                        strokeWidth="1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to disconnect these two elements?')) {
                            deleteConnection(conn.id);
                          }
                        }}
                        title="Click to disconnect"
                      />
                      <line x1={mid.x - 2.5} y1={mid.y - 2.5} x2={mid.x + 2.5} y2={mid.y + 2.5} stroke="#ef4444" strokeWidth="1.2" className="pointer-events-none" />
                      <line x1={mid.x + 2.5} y1={mid.y - 2.5} x2={mid.x - 2.5} y2={mid.y + 2.5} stroke="#ef4444" strokeWidth="1.2" className="pointer-events-none" />
                    </g>
                  );
                })}

                {/* Temporary dynamic drag-and-drop ghost line */}
                {dragConnectionStartId && dragConnectionCurrentPos && (() => {
                  const startNode = elements.find(el => el.id === dragConnectionStartId);
                  if (!startNode) return null;
                  const startX = startNode.x + startNode.width / 2;
                  const startY = startNode.y + startNode.height / 2;
                  
                  // Calculate dynamic path based on chosen styling
                  const styleToUse = connectionStyle || 'bezier';
                  let dPath = `M ${startX} ${startY} L ${dragConnectionCurrentPos.x} ${dragConnectionCurrentPos.y}`;
                  if (styleToUse === 'bezier') {
                    const dx = dragConnectionCurrentPos.x - startX;
                    const dy = dragConnectionCurrentPos.y - startY;
                    const cp1x = startX + dx * 0.5;
                    const cp1y = startY;
                    const cp2x = startX + dx * 0.5;
                    const cp2y = dragConnectionCurrentPos.y;
                    dPath = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${dragConnectionCurrentPos.x} ${dragConnectionCurrentPos.y}`;
                  }
                  
                  return (
                    <path
                      d={dPath}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                      markerEnd="url(#arrowhead-selected)"
                    />
                  );
                })()}
              </svg>

              {/* Flowchart/Diagram/Graphing shape nodes cards */}
              {elements.map(el => {
                const isSelected = selectedElementId === el.id;
                const isEditing = editingElementId === el.id;

                // Configure CSS shapes representing college & Miro tools
                let shapeStyle = '';
                if (el.type === 'terminal') {
                  shapeStyle = 'rounded-full border border-stone-850/15';
                } else if (el.type === 'decision') {
                  shapeStyle = 'rotate-0 border-none relative';
                } else if (el.type === 'sticky') {
                  shapeStyle = 'shadow-md border-b-[6px] border-b-stone-800/40 rounded-xs';
                } else if (el.type === 'text') {
                  shapeStyle = 'border-none shadow-none bg-transparent';
                } else if (el.type === 'io') {
                  shapeStyle = 'skew-x-12 border border-stone-850/15';
                } else if (el.type === 'diagram-shape') {
                  const ds = el.diagramShape || 'rectangle';
                  if (ds === 'circle') {
                    shapeStyle = 'rounded-full border border-stone-850/15 shadow-sm';
                  } else if (ds === 'rectangle') {
                    shapeStyle = 'rounded-lg border border-stone-850/15 shadow-sm';
                  } else if (ds === 'venn-left' || ds === 'venn-mid' || ds === 'venn-right') {
                    shapeStyle = 'rounded-full border-2 border-dashed border-stone-400/85 shadow-2xs bg-stone-100/10 hover:bg-stone-100/25 transition-colors';
                  } else if (ds === 'mindmap') {
                    shapeStyle = 'rounded-3xl border-2 border-dashed border-rose-400/80 shadow-md font-semibold bg-rose-50/10';
                  } else {
                    // triangle, star, cloud, hexagon -> SVGs drawn inside
                    shapeStyle = 'border-none shadow-none bg-transparent overflow-visible';
                  }
                } else if (el.type === 'youtube') {
                  shapeStyle = 'rounded-2xl border border-stone-850/30 shadow-xl overflow-hidden bg-stone-950 p-0';
                } else if (el.type === 'graph') {
                  shapeStyle = 'rounded-2xl border border-stone-200 shadow-lg bg-white p-0 overflow-hidden';
                } else {
                  // process
                  shapeStyle = 'rounded-xl border border-stone-850/15 shadow-sm';
                }

                const baseStyleBg = el.color === 'transparent' ? 'bg-transparent' : '';

                return (
                  <div
                    key={el.id}
                    data-node-id={el.id}
                    onMouseDown={(e) => handleNodeMouseDown(el.id, e)}
                    onMouseUp={(e) => handleNodeMouseUp(el.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => handleNodeTouchStart(el.id, e)}
                    onDoubleClick={() => startEditingText(el)}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                    }}
                    className={`absolute z-20 flex items-center justify-center p-3 select-none transition-shadow ${shapeStyle} ${baseStyleBg} ${
                      isSelected ? 'ring-2 ring-orange-500 ring-offset-2 scale-[1.02] shadow-lg z-30' : 'hover:shadow-md'
                    }`}
                    title="Drag to reposition. Double click to modify text labels"
                  >
                    {/* Inner styling if decision diamond node (draw rotating background to avoid skewing text) */}
                    {el.type === 'decision' && (
                      <div 
                        style={{ backgroundColor: el.color }}
                        className="absolute inset-0 -z-10 rotate-45 border border-stone-800/25 rounded-md" 
                      />
                    )}

                    {/* SVG Vector Draw for special diagram shapes */}
                    {el.type === 'diagram-shape' && (() => {
                      const ds = el.diagramShape || '';
                      if (ds === 'triangle') {
                        return (
                          <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polygon points="50,2 98,95 2,95" fill={el.color || '#ecfeff'} stroke="#57534e" strokeWidth="1.5" />
                          </svg>
                        );
                      }
                      if (ds === 'star') {
                        return (
                          <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polygon points="50,2 64,35 98,35 70,57 81,91 50,70 19,91 30,57 2,35 36,35" fill={el.color || '#fef9c3'} stroke="#57534e" strokeWidth="1.5" />
                          </svg>
                        );
                      }
                      if (ds === 'cloud') {
                        return (
                          <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M 25,60 C 15,60 10,50 15,40 C 10,25 25,15 40,25 C 50,10 70,10 80,25 C 90,25 95,35 90,50 C 95,60 85,75 75,70 C 65,80 35,80 25,60 Z" fill={el.color || '#f0fdfa'} stroke="#57534e" strokeWidth="1.5" />
                          </svg>
                        );
                      }
                      if (ds === 'hexagon') {
                        return (
                          <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <polygon points="50,3 96,25 96,75 50,97 4,75 4,25" fill={el.color || '#eff6ff'} stroke="#57534e" strokeWidth="1.5" />
                          </svg>
                        );
                      }
                      return null;
                    })()}

                    {/* Shape Background colors if not transparent */}
                    {el.type !== 'decision' && el.type !== 'youtube' && el.type !== 'graph' && !['triangle', 'star', 'cloud', 'hexagon'].includes(el.diagramShape || '') && el.color !== 'transparent' && (
                      <div 
                        style={{ backgroundColor: el.color }}
                        className="absolute inset-0 -z-10 rounded-[inherit]" 
                      />
                    )}

                    {/* Selected Active Highlight rings */}
                    {isSelected && (
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[8px] font-mono px-1 rounded-sm shadow z-40 whitespace-nowrap uppercase tracking-widest font-extrabold animate-bounce">
                        Active Selection
                      </span>
                    )}

                    {/* Element Inner Content Text Label */}
                    <div className="w-full h-full flex items-center justify-center text-center">
                      {isEditing && !['youtube', 'graph', 'website', 'pdf', 'table', 'code', 'audio', 'file', 'icon', 'emoji'].includes(el.type) ? (
                        <textarea
                          autoFocus
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={saveEditingText}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEditingText();
                            }
                          }}
                          className="w-full h-full text-[10px] bg-white text-stone-900 border border-stone-300 rounded p-1 resize-none font-sans z-50 text-center focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : el.type === 'heading' ? (
                        <div className="w-full text-center">
                          <h1 style={{ color: el.textColor || '#111111', fontSize: `${el.fontSize || 24}px` }} className="font-extrabold tracking-tight select-none leading-none drop-shadow-2xs">
                            {el.label}
                          </h1>
                        </div>
                      ) : el.type === 'image' ? (
                        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-stone-200 shadow-xs flex flex-col bg-stone-50">
                          <img src={el.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'} alt={el.label} className="flex-1 w-full object-cover select-none pointer-events-none" referrerPolicy="no-referrer" />
                          <div className="h-5 bg-white/95 backdrop-blur-xs border-t border-stone-100 px-2 flex items-center justify-between text-[7px] font-bold text-stone-500 select-none">
                            <span className="truncate">{el.label}</span>
                          </div>
                        </div>
                      ) : el.type === 'pdf' ? (
                        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs bg-stone-50 flex flex-col text-left">
                          <div className="h-5 bg-stone-900 text-white px-2 flex items-center justify-between text-[7px] font-mono select-none shrink-0">
                            <span className="truncate flex items-center gap-1">📄 {el.label}</span>
                            <span>Pg {el.pdfPage || 1}/{el.pdfMaxPages || 12}</span>
                          </div>
                          <div className="flex-1 flex flex-col items-center justify-center p-2 relative bg-white border-b border-stone-100 select-none pointer-events-none">
                            <div className="w-full h-full border border-stone-200 rounded p-1.5 space-y-1 flex flex-col">
                              <div className="h-1.5 w-3/4 bg-stone-200 rounded" />
                              <div className="h-1 bg-stone-100 rounded" />
                              <div className="h-1 bg-stone-100 rounded" />
                              <div className="h-1 bg-stone-100 rounded" />
                              <div className="h-1.5 w-1/2 bg-stone-150 rounded" />
                              <div className="flex-1" />
                            </div>
                          </div>
                          <div className="h-5 bg-stone-100 flex items-center justify-center gap-2 select-none shrink-0 border-t border-stone-200 pointer-events-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const curr = el.pdfPage || 1;
                                if (curr > 1) {
                                  const nextEl = elements.map(item => item.id === el.id ? { ...item, pdfPage: curr - 1 } : item);
                                  updateElementsAndPersist(nextEl);
                                }
                              }}
                              className="text-[7px] font-bold text-stone-600 bg-white hover:bg-stone-200 border border-stone-200 rounded px-1 cursor-pointer active:scale-95"
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const curr = el.pdfPage || 1;
                                const maxP = el.pdfMaxPages || 12;
                                if (curr < maxP) {
                                  const nextEl = elements.map(item => item.id === el.id ? { ...item, pdfPage: curr + 1 } : item);
                                  updateElementsAndPersist(nextEl);
                                }
                              }}
                              className="text-[7px] font-bold text-stone-600 bg-white hover:bg-stone-200 border border-stone-200 rounded px-1 cursor-pointer active:scale-95"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      ) : el.type === 'audio' ? (
                        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs bg-stone-50 p-2 flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 select-none pointer-events-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const playing = !el.audioPlaying;
                                const nextEl = elements.map(item => item.id === el.id ? { ...item, audioPlaying: playing } : item);
                                updateElementsAndPersist(nextEl);
                                showToast(playing ? 'Playing recorded audio lecture clip' : 'Paused audio playback');
                              }}
                              className="w-6 h-6 rounded-full bg-orange-600 hover:bg-orange-500 flex items-center justify-center text-white cursor-pointer transition shadow active:scale-95 shrink-0"
                            >
                              {el.audioPlaying ? (
                                <span className="material-symbols-outlined text-[12px]">pause</span>
                              ) : (
                                <span className="material-symbols-outlined text-[12px]">play_arrow</span>
                              )}
                            </button>
                            <div className="flex-1 min-w-0 text-left">
                              <span className="text-[7px] font-extrabold uppercase text-stone-400 block tracking-wide">Class Voice</span>
                              <span className="text-[8px] font-bold text-stone-700 truncate block">{el.label || 'Lecture.mp3'}</span>
                            </div>
                          </div>
                          <div className="flex items-end gap-0.5 h-4 px-1 py-0.5 select-none pointer-events-none">
                            {[20, 60, 45, 90, 30, 80, 65, 40, 70, 50, 85, 30, 55, 75, 45, 95, 20].map((hVal, idx) => (
                              <div
                                key={idx}
                                style={{
                                  height: `${hVal}%`,
                                }}
                                className={`flex-1 bg-stone-300 rounded-full transition-all ${el.audioPlaying ? 'animate-pulse bg-orange-500' : ''}`}
                              />
                            ))}
                          </div>
                        </div>
                      ) : el.type === 'website' ? (
                        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs bg-stone-50 flex flex-col text-left">
                          <div className="h-5 bg-stone-900 text-white px-2 flex items-center justify-between text-[7px] font-mono select-none shrink-0">
                            <span className="truncate flex items-center gap-1">🌐 {el.websiteUrl || 'wikipedia.org'}</span>
                            <span className="text-emerald-400 font-bold uppercase tracking-wider">● Online</span>
                          </div>
                          <div className="flex-1 bg-white relative">
                            <iframe
                              className="w-full h-full absolute inset-0 border-0 pointer-events-auto"
                              src={el.websiteUrl || 'https://wikipedia.org'}
                              title={el.label}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      ) : el.type === 'table' ? (
                        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs bg-white p-2 flex flex-col text-left">
                          <div className="h-4 flex items-center justify-between pb-1 border-b border-stone-100 mb-1 shrink-0 select-none">
                            <span className="text-[7px] font-extrabold uppercase tracking-wider text-stone-600 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[9px] text-orange-500 font-bold">grid_on</span>
                              {el.label || 'Table Spreadsheet'}
                            </span>
                          </div>
                          <div className="flex-1 overflow-auto pointer-events-auto">
                            <table className="w-full text-[7px] border-collapse">
                              <tbody>
                                {(el.tableData || [['', '', ''], ['', '', ''], ['', '', '']]).map((row, rIdx) => (
                                  <tr key={rIdx} className="border-b border-stone-100">
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="p-0.5 border-r border-stone-100">
                                        <input
                                          type="text"
                                          value={cell}
                                          onChange={(e) => {
                                            const nextTable = (el.tableData || [['', '', '']]).map((r, ri) =>
                                              ri === rIdx ? r.map((c, ci) => (ci === cIdx ? e.target.value : c)) : r
                                            );
                                            const nextElements = elements.map(item => item.id === el.id ? { ...item, tableData: nextTable } : item);
                                            updateElementsAndPersist(nextElements);
                                          }}
                                          className="w-full h-full bg-transparent font-sans text-stone-800 text-center font-bold border-0 outline-none p-0 focus:bg-stone-50"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : el.type === 'code' ? (
                        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-stone-800 shadow bg-[#1e1e24] p-2 flex flex-col text-left text-white">
                          <div className="h-4 flex items-center justify-between pb-1 border-b border-stone-800 mb-1 shrink-0 select-none">
                            <span className="text-[7px] font-mono text-stone-400 flex items-center gap-1">
                              <span className="text-[8px] text-orange-500 font-bold">&lt;/&gt;</span>
                              {el.label || 'Code Snippet'}
                            </span>
                            <span className="text-[6px] font-mono bg-stone-800 text-stone-300 px-1 rounded uppercase">
                              {el.codeLanguage || 'typescript'}
                            </span>
                          </div>
                          <div className="flex-1 pointer-events-auto">
                            <textarea
                              value={el.codeText || ''}
                              onChange={(e) => {
                                const nextElements = elements.map(item => item.id === el.id ? { ...item, codeText: e.target.value } : item);
                                updateElementsAndPersist(nextElements);
                              }}
                              className="w-full h-full bg-transparent font-mono text-[7.5px] text-stone-100 resize-none border-0 p-0 outline-none leading-relaxed"
                              spellCheck="false"
                            />
                          </div>
                        </div>
                      ) : el.type === 'math' ? (
                        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden border border-stone-200/80 shadow-2xs bg-yellow-50/70 p-2 flex flex-col justify-between text-stone-900 text-center">
                          <span className="text-[6px] text-stone-400 font-mono block select-none uppercase tracking-wider text-left">📐 Euler Equation</span>
                          <div className="flex-1 flex items-center justify-center font-serif text-[12px] font-extrabold italic select-none">
                            {el.mathExpression || 'e^{i\\pi} + 1 = 0'}
                          </div>
                          <div className="h-3 flex items-center justify-between shrink-0 border-t border-yellow-200/60 pt-0.5 pointer-events-auto select-none">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const val = prompt('Edit math formula:', el.mathExpression || 'e^{i\\pi} + 1 = 0');
                                if (val !== null) {
                                  const nextElements = elements.map(item => item.id === el.id ? { ...item, mathExpression: val } : item);
                                  updateElementsAndPersist(nextElements);
                                  showToast('Formula updated');
                                }
                              }}
                              className="text-[6px] font-extrabold text-orange-700 hover:text-orange-950 font-mono cursor-pointer underline"
                            >
                              [Edit Expression]
                            </button>
                          </div>
                        </div>
                      ) : el.type === 'icon' ? (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none select-none">
                          <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white shadow animate-pulse">
                            <span className="material-symbols-outlined !text-xl">star</span>
                          </div>
                        </div>
                      ) : el.type === 'emoji' ? (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center select-none pointer-events-none">
                          <span className="text-3xl filter drop-shadow">{el.emojiText || '🔥'}</span>
                        </div>
                      ) : el.type === 'file' ? (
                        <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border border-stone-200 bg-stone-50 shadow-xs flex items-center gap-2 p-2 select-none text-left">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                            <span className="material-symbols-outlined !text-base">download</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[7px] font-extrabold text-indigo-700 block uppercase tracking-wider">Download File</span>
                            <span className="text-[8px] font-bold text-stone-800 truncate block">{el.label || 'Brief_Doc.pdf'}</span>
                            <span className="text-[6px] text-stone-400 font-mono block">{el.fileSize || '1.8 MB'}</span>
                          </div>
                        </div>
                      ) : el.type === 'youtube' ? (
                        /* Embedded YouTube Player Video */
                        <div className="absolute inset-0 w-full h-full flex flex-col bg-stone-950 p-1 rounded-2xl border border-stone-800 overflow-hidden">
                          {/* Bezel frame of player */}
                          <div className="h-5 flex items-center justify-between px-1.5 shrink-0 select-none bg-stone-900 border-b border-stone-800 text-stone-400">
                            <span className="text-[7px] font-bold tracking-wider uppercase truncate max-w-[120px] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                              YT: {el.label || 'Watch Stream'}
                            </span>
                            <div className="flex gap-1">
                              {el.youtubeLoop && <span className="text-[6px] bg-stone-800 text-stone-300 px-1 rounded font-mono">LOOP</span>}
                              {el.youtubeAutoplay && <span className="text-[6px] bg-orange-950 text-orange-400 px-1 rounded font-mono">AUTO</span>}
                            </div>
                          </div>
                          
                          {/* Player stage */}
                          <div className="flex-1 relative bg-black rounded overflow-hidden">
                            <iframe
                              className="w-full h-full absolute inset-0 border-0 pointer-events-auto"
                              src={`https://www.youtube.com/embed/${el.youtubeId || 'jfKfPfyJRdk'}?autoplay=${el.youtubeAutoplay ? 1 : 0}&loop=${el.youtubeLoop ? 1 : 0}&playlist=${el.youtubeId || 'jfKfPfyJRdk'}&mute=${el.youtubeMute ? 1 : 0}`}
                              title={el.label || 'Presentation Stream'}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      ) : el.type === 'graph' ? (
                        /* Dynamic Presentation Vector Graphs */
                        <div className="absolute inset-0 w-full h-full flex flex-col bg-white p-2 rounded-2xl border border-stone-200/80 shadow-inner overflow-hidden text-stone-900">
                          <div className="h-5 flex items-center justify-between border-b border-stone-100 pb-1 mb-1 shrink-0 select-none">
                            <span className="text-[8px] font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px] text-orange-500">bar_chart</span>
                              {el.graphTitle || 'Dataset'}
                            </span>
                            <span className="text-[6px] font-bold font-mono bg-stone-100 text-stone-500 px-1 rounded uppercase">
                              {el.graphType || 'bar'}
                            </span>
                          </div>

                          {/* SVG Chart display */}
                          <div className="flex-1 min-h-0 flex items-center justify-center p-0.5 relative bg-stone-50/50 rounded-lg border border-stone-100 select-none pointer-events-none">
                            {(() => {
                              const data = el.graphData || [];
                              if (data.length === 0) return <span className="text-[7px] text-stone-400">No data values</span>;
                              
                              const maxVal = Math.max(...data.map(d => d.value), 1);
                              const type = el.graphType || 'bar';

                              if (type === 'bar') {
                                return (
                                  <div className="w-full h-full flex items-end justify-around pt-3 px-1 gap-1">
                                    {data.map((item, idx) => {
                                      const pct = (item.value / maxVal) * 100;
                                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                                      const color = colors[idx % colors.length];
                                      return (
                                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative">
                                          <span className="absolute -top-3.5 text-[6px] font-bold font-mono text-stone-850 bg-white border border-stone-150 rounded px-0.5 scale-90 shadow-2xs">
                                            {item.value}
                                          </span>
                                          <div 
                                            style={{ height: `${pct * 0.65}%`, backgroundColor: color }}
                                            className="w-full rounded-t-xs"
                                          />
                                          <span className="text-[6px] font-bold text-stone-400 truncate w-full text-center mt-0.5 font-mono">
                                            {item.name}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              } else if (type === 'line') {
                                const w = el.width - 25;
                                const h = el.height - 45;
                                const stepX = w / Math.max(1, data.length - 1);
                                
                                let points = '';
                                const dots: {x: number, y: number, val: number, name: string}[] = [];
                                data.forEach((item, idx) => {
                                  const cx = idx * stepX + 10;
                                  const cy = h - (item.value / maxVal) * (h - 12) + 4;
                                  points += `${cx},${cy} `;
                                  dots.push({ x: cx, y: cy, val: item.value, name: item.name });
                                });

                                return (
                                  <svg className="w-full h-full" viewBox={`0 0 ${w + 5} ${h + 10}`}>
                                    <polyline
                                      fill="none"
                                      stroke="#ea580c"
                                      strokeWidth="2"
                                      points={points}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    {dots.map((dot, idx) => (
                                      <g key={idx}>
                                        <circle cx={dot.x} cy={dot.y} r="2.5" fill="#ffffff" stroke="#ea580c" strokeWidth="1.5" />
                                        <text x={dot.x} y={dot.y - 4} textAnchor="middle" className="text-[5px] font-bold fill-stone-700 font-mono">{dot.val}</text>
                                        <text x={dot.x} y={h + 8} textAnchor="middle" className="text-[5px] font-bold fill-stone-400 font-mono">{dot.name}</text>
                                      </g>
                                    ))}
                                  </svg>
                                );
                              } else {
                                // PIE Chart rings
                                let accPercent = 0;
                                return (
                                  <div className="w-full h-full flex items-center justify-between px-1 gap-1">
                                    <svg className="w-10 h-10 shrink-0 rotate-[-90deg]" viewBox="0 0 36 36">
                                      {data.map((item, idx) => {
                                        const total = data.reduce((sum, d) => sum + d.value, 0);
                                        const pct = total > 0 ? (item.value / total) * 100 : 0;
                                        const dashArray = `${pct} ${100 - pct}`;
                                        const dashOffset = 100 - accPercent;
                                        accPercent += pct;
                                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                                        const color = colors[idx % colors.length];
                                        return (
                                          <circle
                                            key={idx}
                                            cx="18"
                                            cy="18"
                                            r="15.915"
                                            fill="transparent"
                                            stroke={color}
                                            strokeWidth="3.2"
                                            strokeDasharray={dashArray}
                                            strokeDashoffset={dashOffset}
                                          />
                                        );
                                      })}
                                    </svg>
                                    <div className="flex-1 flex flex-col gap-0.5 max-h-[80px] overflow-y-auto pl-1">
                                      {data.map((item, idx) => {
                                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                                        const color = colors[idx % colors.length];
                                        return (
                                          <div key={idx} className="flex items-center gap-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                            <span className="text-[5.5px] font-mono font-bold text-stone-600 truncate max-w-[60px]">{item.name}:{item.value}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      ) : (
                        <span 
                          style={{ 
                            color: el.textColor || '#1c1917',
                            fontSize: `${el.fontSize || 11}px`
                          }}
                          className={`font-semibold tracking-tight whitespace-pre-wrap leading-tight break-words pointer-events-none drop-shadow-2xs ${
                            el.type === 'sticky' ? 'font-mono' : 'font-sans'
                          }`}
                        >
                          {el.label}
                        </span>
                      )}
                    </div>

                    {/* Connection Node Attachment Indicator circles */}
                    {isSelected && !connectingFromId && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectingFromId(el.id);
                        }}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-orange-600 hover:bg-orange-500 flex items-center justify-center text-white cursor-pointer z-50 shadow hover:scale-110 transition active:scale-90"
                        title="Click to draw a flowchart arrow from this card"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>
                );
              })}
              </div> {/* Close Scale and Pan Transformed Sub-Container wrapper */}

              {/* Blank Diagram Help Screen Overlay (Shows if there are no elements left) */}
              {elements.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-white/40 select-none z-10">
                  <span className="material-symbols-outlined text-stone-300 font-normal !text-5xl animate-pulse mb-3">auto_awesome_motion</span>
                  <h4 className="text-sm font-extrabold text-stone-800">Your Bolek Flowchart Canvas is Empty</h4>
                  <p className="text-[10px] text-stone-400 max-w-sm mt-1 leading-normal">
                    Click any shape in the left panel to populate cards. You can connect them to create beautiful Miro-like diagrams for lessons, presentations, or assignments!
                  </p>
                  <button
                    type="button"
                    onClick={seedDefaultFlowchart}
                    className="mt-4 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-bold rounded-lg cursor-pointer transition shadow-2xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-orange-500" />
                    <span>Seed Demo Presentation Template</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Bottom Status Bar */}
        <div className="h-7 border-t border-stone-200 px-4 bg-stone-50 flex items-center justify-between text-[9px] text-stone-400 font-mono select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-stone-400" />
              <span>X: <strong className="text-stone-600">{coords.x}px</strong>, Y: <strong className="text-stone-600">{coords.y}px</strong></span>
            </span>
            <span>•</span>
            <span>Workspace: <strong className="text-stone-600 capitalize">{workspaceMode}</strong></span>
            
            {workspaceMode === 'freehand' ? (
              <>
                <span>•</span>
                <span>Brush: <strong className="text-stone-600 capitalize">{tool}</strong></span>
                <span>•</span>
                <span>Diameter: <strong className="text-stone-600">{brushSize}px</strong></span>
              </>
            ) : (
              <>
                <span>•</span>
                <span>Total Shapes: <strong className="text-stone-600">{elements.length}</strong></span>
                <span>•</span>
                <span>Arrows: <strong className="text-stone-600">{connections.length}</strong></span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-[8px] tracking-wider uppercase">
            <span>Paper Grid: <strong className="text-stone-500 capitalize">{paperStyle}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1 font-bold text-stone-500">
              <Info className="w-3 h-3 text-stone-400" />
              <span>Interactive Presentations Ready</span>
            </span>
          </div>
        </div>

      </div>

      {/* Styled inline helper grids for whiteboard */}
      <style>{`
        .bg-grid-dot {
          background-image: radial-gradient(${isChalkboard ? '#374151 1.2px' : '#e5e7eb 1.2px'}, transparent 1.2px);
          background-size: 20px 20px;
        }
        .bg-grid-graph {
          background-image: 
            linear-gradient(to right, ${isChalkboard ? '#27272a 1px' : '#f4f4f5 1px'}, transparent 1px),
            linear-gradient(to bottom, ${isChalkboard ? '#27272a 1px' : '#f4f4f5 1px'}, transparent 1px);
          background-size: 20px 20px;
        }
        .bg-grid-ruled {
          background-image: linear-gradient(to bottom, transparent 95%, ${isChalkboard ? '#27272a 95%' : '#f4f4f5 95%'} 5%);
          background-size: 100% 24px;
        }
      `}</style>

      {/* Internal beautiful feedback Toast overlay */}
      {toastMessage && (
        <div className="absolute bottom-12 right-6 bg-stone-900 text-white text-[10px] font-semibold font-sans px-3 py-1.5 rounded-lg shadow-md animate-in fade-in slide-in-from-bottom-2 duration-150 z-50 flex items-center gap-1.5 border border-stone-800">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
