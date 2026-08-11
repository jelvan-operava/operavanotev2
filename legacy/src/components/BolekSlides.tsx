import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Share2, 
  Plus, 
  Trash2, 
  Type, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Copy, 
  Sparkles, 
  Move, 
  RotateCcw, 
  Grid, 
  FileText, 
  Download, 
  ExternalLink,
  X,
  Palette,
  FileImage,
  Bold,
  Italic,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces for our presentation systems
export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string; // text, image URL, or video/YouTube URL
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
  fontSize?: number; // px
  color?: string; // hex
  fontStyle?: 'normal' | 'italic' | 'bold';
}

export interface SlidePage {
  id: string;
  backgroundType: 'color' | 'image';
  backgroundColor: string;
  backgroundImage: string;
  elements: SlideElement[];
}

export interface PresentationProject {
  id: string;
  title: string;
  slides: SlidePage[];
}

interface BolekSlidesProps {
  onShowToast: (message: string) => void;
  watchModeOnlyData?: string | null; // Passed if the app is loaded in watch-only mode
}

// Built-in Background Images Presets
const PRESET_BACKGROUNDS = [
  { name: 'Warm Sunset', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Minimalist Office', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Clean Desk', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Cosmic Sky', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Nordic Mountain', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Abstract Pastel', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80' }
];

const PRESET_BG_COLORS = [
  { name: 'Snow White', value: '#ffffff' },
  { name: 'Slate Gray', value: '#f1f5f9' },
  { name: 'Charcoal Noir', value: '#1c1917' },
  { name: 'Amber Glow', value: '#fef3c7' },
  { name: 'Sage Green', value: '#f0fdf4' },
  { name: 'Ocean Mist', value: '#ecfeff' },
  { name: 'Lavender Haze', value: '#faf5ff' },
  { name: 'Coral Cream', value: '#fff5f5' }
];

// Helper to safely encode presentation object to safe Base64 URL component
const encodePresentation = (data: any) => {
  try {
    const str = JSON.stringify(data);
    const base64 = btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    return base64;
  } catch (e) {
    console.error('Encoding error:', e);
    return '';
  }
};

// Helper to safely decode presentation from Base64 URL component
const decodePresentation = (base64: string): any => {
  try {
    const str = decodeURIComponent(Array.prototype.map.call(atob(base64), (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(str);
  } catch (e) {
    console.error('Decoding error:', e);
    return null;
  }
};

// Convert standard YouTube links to safe iframe embed players
const getYoutubeEmbedUrl = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return url;
};

export const BolekSlides: React.FC<BolekSlidesProps> = ({ onShowToast, watchModeOnlyData }) => {
  // Watch Only Flag
  const isWatchOnly = !!watchModeOnlyData;

  // Active Presentation State
  const [project, setProject] = useState<PresentationProject>(() => {
    // If watch mode, load encoded URL slides
    if (watchModeOnlyData) {
      const decoded = decodePresentation(watchModeOnlyData);
      if (decoded) return decoded;
    }

    // Try loading saved presentation project from local storage
    const saved = localStorage.getItem('bolek_slides_project');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }

    // Default Canva layout presentation project template
    return {
      id: 'proj-default',
      title: 'Bolek Slides Deck',
      slides: [
        {
          id: 'slide-1',
          backgroundType: 'color',
          backgroundColor: '#1c1917',
          backgroundImage: '',
          elements: [
            {
              id: 'el-1',
              type: 'text',
              content: '🚀 BOLEK SLIDES DECK',
              x: 10,
              y: 25,
              width: 80,
              height: 15,
              fontSize: 38,
              color: '#f97316',
              fontStyle: 'bold'
            },
            {
              id: 'el-2',
              type: 'text',
              content: 'The fully custom slides and interactive presentation builder. Customize text styling, backdrop images, and embedded videos directly on the canvas! Click on this box to drag, resize, or edit its content.',
              x: 10,
              y: 45,
              width: 80,
              height: 25,
              fontSize: 14,
              color: '#e7e5e4',
              fontStyle: 'normal'
            },
            {
              id: 'el-3',
              type: 'text',
              content: '👉 PRESS PLAY AT THE TOP RIGHT TO PRESENT THIS LIVE',
              x: 10,
              y: 75,
              width: 80,
              height: 10,
              fontSize: 12,
              color: '#fbbf24',
              fontStyle: 'bold'
            }
          ]
        },
        {
          id: 'slide-2',
          backgroundType: 'color',
          backgroundColor: '#f1f5f9',
          backgroundImage: '',
          elements: [
            {
              id: 'el-4',
              type: 'text',
              content: 'Interactive Multimedia Canvas',
              x: 10,
              y: 10,
              width: 80,
              height: 12,
              fontSize: 28,
              color: '#1c1917',
              fontStyle: 'bold'
            },
            {
              id: 'el-5',
              type: 'text',
              content: 'Check out the stock photography or embed YouTube video below:',
              x: 10,
              y: 22,
              width: 80,
              height: 10,
              fontSize: 13,
              color: '#44403c',
              fontStyle: 'normal'
            },
            {
              id: 'el-6',
              type: 'video',
              content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              x: 15,
              y: 35,
              width: 70,
              height: 50
            }
          ]
        }
      ]
    };
  });

  // Editor and Navigation States
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [isCopying, setIsCopying] = useState(false);

  // Background Customizer Tabs
  const [bgTab, setBgTab] = useState<'color' | 'image' | 'url'>('color');
  const [customBgUrlInput, setCustomBgUrlInput] = useState('');

  // Drag and Resize Refs & State
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    elementId: string;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    mode: 'drag' | 'resize';
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Auto save presentation to local storage on edits
  useEffect(() => {
    if (!isWatchOnly) {
      localStorage.setItem('bolek_slides_project', JSON.stringify(project));
    }
  }, [project, isWatchOnly]);

  // Current Slide Shortcut helper
  const currentSlide = project.slides[activeSlideIndex] || project.slides[0] || {
    id: 'temp',
    backgroundType: 'color',
    backgroundColor: '#ffffff',
    backgroundImage: '',
    elements: []
  };

  // Safe navigation index sync
  useEffect(() => {
    if (activeSlideIndex >= project.slides.length) {
      setActiveSlideIndex(Math.max(0, project.slides.length - 1));
    }
  }, [project.slides, activeSlideIndex]);

  // Keyboard Navigation in Playback / Presentation mode
  useEffect(() => {
    if (!isPlaying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setPlayIndex(prev => (prev < project.slides.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlayIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Escape') {
        setIsPlaying(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, project.slides.length]);

  // Handle adding a new empty slide
  const handleAddSlide = () => {
    const newSlide: SlidePage = {
      id: `slide-${Date.now()}`,
      backgroundType: 'color',
      backgroundColor: '#ffffff',
      backgroundImage: '',
      elements: [
        {
          id: `el-${Date.now()}-title`,
          type: 'text',
          content: 'New Presentation Slide',
          x: 15,
          y: 40,
          width: 70,
          height: 15,
          fontSize: 26,
          color: '#1c1917',
          fontStyle: 'bold'
        }
      ]
    };
    const updatedSlides = [...project.slides];
    updatedSlides.splice(activeSlideIndex + 1, 0, newSlide);
    setProject({ ...project, slides: updatedSlides });
    setActiveSlideIndex(activeSlideIndex + 1);
    onShowToast('New slide added successfully!');
  };

  // Handle duplicating current slide
  const handleDuplicateSlide = () => {
    const slideToCopy = project.slides[activeSlideIndex];
    if (!slideToCopy) return;

    const duplicatedSlide: SlidePage = {
      ...slideToCopy,
      id: `slide-${Date.now()}`,
      elements: slideToCopy.elements.map(el => ({
        ...el,
        id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      }))
    };

    const updatedSlides = [...project.slides];
    updatedSlides.splice(activeSlideIndex + 1, 0, duplicatedSlide);
    setProject({ ...project, slides: updatedSlides });
    setActiveSlideIndex(activeSlideIndex + 1);
    onShowToast('Slide duplicated!');
  };

  // Handle slide removal
  const handleDeleteSlide = () => {
    if (project.slides.length <= 1) {
      onShowToast('You must have at least 1 slide in your deck!');
      return;
    }
    const updatedSlides = project.slides.filter((_, i) => i !== activeSlideIndex);
    setProject({ ...project, slides: updatedSlides });
    setActiveSlideIndex(Math.max(0, activeSlideIndex - 1));
    onShowToast('Slide deleted successfully');
  };

  // Slide reordering helper
  const handleMoveSlide = (direction: 'up' | 'down') => {
    if (direction === 'up' && activeSlideIndex === 0) return;
    if (direction === 'down' && activeSlideIndex === project.slides.length - 1) return;

    const targetIdx = direction === 'up' ? activeSlideIndex - 1 : activeSlideIndex + 1;
    const nextSlides = [...project.slides];
    const temp = nextSlides[activeSlideIndex];
    nextSlides[activeSlideIndex] = nextSlides[targetIdx];
    nextSlides[targetIdx] = temp;

    setProject({ ...project, slides: nextSlides });
    setActiveSlideIndex(targetIdx);
    onShowToast('Slide order updated');
  };

  // Create customized Slide Element (Text, Image or Video)
  const handleAddElement = (type: 'text' | 'image' | 'video') => {
    let content = '';
    let fontSize = undefined;
    let color = undefined;

    if (type === 'text') {
      content = 'Double click to edit message text';
      fontSize = 16;
      color = currentSlide.backgroundColor === '#1c1917' ? '#ffffff' : '#1c1917';
    } else if (type === 'image') {
      content = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=400&q=80';
    } else if (type === 'video') {
      content = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Default demo video
    }

    const newElement: SlideElement = {
      id: `el-${Date.now()}`,
      type,
      content,
      x: 30,
      y: 30,
      width: 40,
      height: type === 'text' ? 12 : 35,
      fontSize,
      color,
      fontStyle: 'normal'
    };

    const updatedSlides = project.slides.map((s, idx) => {
      if (idx === activeSlideIndex) {
        return { ...s, elements: [...s.elements, newElement] };
      }
      return s;
    });

    setProject({ ...project, slides: updatedSlides });
    setSelectedElementId(newElement.id);
    onShowToast(`Added custom ${type} element to slide!`);
  };

  // Element removal helper
  const handleDeleteElement = (elId: string) => {
    const updatedSlides = project.slides.map((s, idx) => {
      if (idx === activeSlideIndex) {
        return { ...s, elements: s.elements.filter(el => el.id !== elId) };
      }
      return s;
    });
    setProject({ ...project, slides: updatedSlides });
    if (selectedElementId === elId) {
      setSelectedElementId(null);
    }
    onShowToast('Element deleted');
  };

  // Update specific selected element attributes inline
  const handleUpdateElement = (elId: string, updates: Partial<SlideElement>) => {
    const updatedSlides = project.slides.map((s, idx) => {
      if (idx === activeSlideIndex) {
        return {
          ...s,
          elements: s.elements.map(el => (el.id === elId ? { ...el, ...updates } : el))
        };
      }
      return s;
    });
    setProject({ ...project, slides: updatedSlides });
  };

  // Custom Background setter
  const handleSetBackground = (type: 'color' | 'image', value: string) => {
    const updatedSlides = project.slides.map((s, idx) => {
      if (idx === activeSlideIndex) {
        if (type === 'color') {
          return { ...s, backgroundType: 'color', backgroundColor: value, backgroundImage: '' };
        } else {
          return { ...s, backgroundType: 'image', backgroundImage: value, backgroundColor: '#ffffff' };
        }
      }
      return s;
    });
    setProject({ ...project, slides: updatedSlides });
    onShowToast('Slide background changed!');
  };

  // Slide element mouse down dragging / resizing listener
  const handleElementMouseDown = (e: React.MouseEvent, el: SlideElement, mode: 'drag' | 'resize') => {
    if (isWatchOnly) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementId(el.id);

    setDragState({
      elementId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: el.x,
      startTop: el.y,
      startWidth: el.width,
      startHeight: el.height,
      mode
    });
  };

  // Dynamic canvas mouse listener for moving elements in percentage scale
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragState || !canvasRef.current) return;
    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
    const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;

    if (dragState.mode === 'drag') {
      const newX = Math.max(0, Math.min(100 - dragState.startWidth, dragState.startLeft + deltaX));
      const newY = Math.max(0, Math.min(100 - dragState.startHeight, dragState.startTop + deltaY));
      
      handleUpdateElement(dragState.elementId, {
        x: Math.round(newX),
        y: Math.round(newY)
      });
    } else if (dragState.mode === 'resize') {
      const newWidth = Math.max(5, Math.min(100 - dragState.startLeft, dragState.startWidth + deltaX));
      const newHeight = Math.max(5, Math.min(100 - dragState.startTop, dragState.startHeight + deltaY));

      handleUpdateElement(dragState.elementId, {
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    }
  };

  // Clear dragging trigger
  const handleCanvasMouseUp = () => {
    setDragState(null);
  };

  // Generate public Watch link encoded payload
  const handleCopyShareLink = () => {
    setIsCopying(true);
    try {
      const payload = encodePresentation(project);
      const sharableUrl = `${window.location.origin}${window.location.pathname}?watch=${payload}`;
      
      navigator.clipboard.writeText(sharableUrl).then(() => {
        onShowToast('Sharable watcher URL copied to clipboard! Anyone with access can view this slideshow.');
      }).catch(() => {
        onShowToast('Could not copy automatically. URL: ' + sharableUrl);
      });
    } catch (err) {
      onShowToast('Error building sharable deck link');
    }
    setTimeout(() => setIsCopying(false), 2000);
  };

  // Return background style depending on slide background customization options
  const getSlideBgStyle = (slide: SlidePage) => {
    if (slide.backgroundType === 'image' && slide.backgroundImage) {
      return {
        backgroundImage: `url('${slide.backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    return {
      backgroundColor: slide.backgroundColor || '#ffffff'
    };
  };

  const selectedElement = currentSlide.elements.find(el => el.id === selectedElementId);

  // Play Mode Render Overlay Cover
  if (isPlaying) {
    const playSlide = project.slides[playIndex] || project.slides[0];
    return (
      <div className="fixed inset-0 bg-stone-950 z-[99999] flex flex-col justify-between p-6 select-none font-sans overflow-hidden">
        {/* Top Floating Control Row */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-black tracking-wider uppercase font-mono text-stone-200">
              {project.title} — Presenting Live
            </span>
          </div>
          
          <div className="text-[11px] font-bold font-mono text-orange-400 bg-orange-950/40 px-3 py-1 rounded-full border border-orange-500/20">
            Slide {playIndex + 1} of {project.slides.length}
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying(false)}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg cursor-pointer transition active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            <span>End Show</span>
          </button>
        </div>

        {/* Central Presentation Canvas Frame */}
        <div className="flex-1 flex items-center justify-center py-6 px-10 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={playSlide.id}
              initial={{ opacity: 0, scale: 0.96, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 1.04, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              style={getSlideBgStyle(playSlide)}
              className="w-full max-w-[1000px] aspect-[16/9] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/5 relative overflow-hidden shrink-0 flex items-center justify-center p-6"
            >
              {playSlide.elements.map(el => {
                const isDark = playSlide.backgroundColor === '#1c1917' || playSlide.backgroundType === 'image';
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width}%`,
                      height: `${el.height}%`,
                    }}
                    className="absolute flex items-center justify-center p-2 text-center"
                  >
                    {el.type === 'text' ? (
                      <p
                        style={{
                          fontSize: el.fontSize ? `${el.fontSize * 1.2}px` : '18px',
                          color: el.color || (isDark ? '#ffffff' : '#1c1917'),
                          fontWeight: el.fontStyle === 'bold' ? 'bold' : 'normal',
                          fontStyle: el.fontStyle === 'italic' ? 'italic' : 'normal'
                        }}
                        className="leading-relaxed whitespace-pre-wrap select-none tracking-tight font-sans"
                      >
                        {el.content}
                      </p>
                    ) : el.type === 'image' ? (
                      <img
                        src={el.content}
                        alt="Slide graphic"
                        className="w-full h-full object-contain rounded-xl shadow-md select-none pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <iframe
                        src={getYoutubeEmbedUrl(el.content)}
                        className="w-full h-full rounded-xl shadow-lg border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Embedded Slide Video"
                      />
                    )}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation Dock */}
        <div className="flex items-center justify-center gap-4 py-2 shrink-0">
          <button
            type="button"
            disabled={playIndex === 0}
            onClick={() => setPlayIndex(p => p - 1)}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 text-white flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white/10 cursor-pointer transition active:scale-90"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex gap-2">
            {project.slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPlayIndex(i)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${i === playIndex ? 'bg-orange-500 scale-125' : 'bg-white/20 hover:bg-white/45'}`}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={playIndex === project.slides.length - 1}
            onClick={() => setPlayIndex(p => p + 1)}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 text-white flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white/10 cursor-pointer transition active:scale-90"
            title="Next Slide (Right Arrow / Space)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Watch Mode Cover Render
  if (isWatchOnly) {
    const playSlide = project.slides[playIndex] || project.slides[0];
    return (
      <div className="fixed inset-0 bg-stone-950 z-[99999] flex flex-col justify-between p-6 md:p-8 select-none font-sans overflow-hidden">
        {/* Watching Banner - Premium Redesign */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 text-stone-200 shadow-2xl mx-auto w-full max-w-[1000px]">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-widest uppercase font-mono text-white">
                {project.title || 'Shared Presentation'}
              </span>
              <span className="text-[10px] text-stone-400 font-medium tracking-wide">
                Live Public View
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold tracking-wider bg-white/10 text-white px-4 py-1.5 rounded-full border border-white/10 font-mono shadow-inner">
              Slide {playIndex + 1} <span className="text-stone-400 mx-1">/</span> {project.slides.length}
            </span>
          </div>
        </div>

        {/* Watch Only Slide Player Frame */}
        <div className="flex-1 flex items-center justify-center py-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={playSlide.id}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={getSlideBgStyle(playSlide)}
              className="w-full max-w-[1000px] aspect-[16/9] rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] border border-white/10 relative overflow-hidden shrink-0 flex items-center justify-center p-4 ring-1 ring-white/5"
            >
              {playSlide.elements.map(el => {
                const isDark = playSlide.backgroundColor === '#1c1917' || playSlide.backgroundType === 'image';
                return (
                  <div
                    key={el.id}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width}%`,
                      height: `${el.height}%`,
                    }}
                    className="absolute flex items-center justify-center p-2 text-center"
                  >
                    {el.type === 'text' ? (
                      <p
                        style={{
                          fontSize: el.fontSize ? `${el.fontSize * 1.2}px` : '18px',
                          color: el.color || (isDark ? '#ffffff' : '#1c1917'),
                          fontWeight: el.fontStyle === 'bold' ? 'bold' : 'normal',
                          fontStyle: el.fontStyle === 'italic' ? 'italic' : 'normal'
                        }}
                        className="leading-relaxed whitespace-pre-wrap select-none tracking-tight font-sans drop-shadow-sm"
                      >
                        {el.content}
                      </p>
                    ) : el.type === 'image' ? (
                      <img
                        src={el.content}
                        alt="Slide asset"
                        className="w-full h-full object-contain rounded-xl shadow-md select-none pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <iframe
                        src={getYoutubeEmbedUrl(el.content)}
                        className="w-full h-full rounded-xl shadow-xl border-0 ring-1 ring-black/5"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Shared YouTube element"
                      />
                    )}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Interactive Play Controls */}
        <div className="flex items-center justify-center gap-6 py-4 shrink-0 mx-auto w-full max-w-[1000px] border-t border-white/10 mt-2">
          <button
            type="button"
            disabled={playIndex === 0}
            onClick={() => setPlayIndex(p => p - 1)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white/10 cursor-pointer transition-all active:scale-90 shadow-lg backdrop-blur-sm"
            title="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex gap-2.5 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner">
            {project.slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPlayIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 shadow-sm ${i === playIndex ? 'bg-emerald-400 scale-125 ring-2 ring-emerald-400/30' : 'bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={playIndex === project.slides.length - 1}
            onClick={() => setPlayIndex(p => p + 1)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white/10 cursor-pointer transition-all active:scale-90 shadow-lg backdrop-blur-sm"
            title="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-stone-50 border border-stone-200 rounded-lg overflow-hidden flex-1 relative font-sans">
      
      {/* 1. LEFT SIDEBAR: Slide Thumbnails Deck List */}
      <div className="w-full md:w-52 shrink-0 bg-white border-b md:border-b-0 md:border-r border-stone-200/80 p-3.5 flex flex-col justify-between overflow-y-auto select-none">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 font-mono">
              Thumbnails List
            </span>
            <span className="text-[9px] font-mono font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
              {project.slides.length} {project.slides.length === 1 ? 'Slide' : 'Slides'}
            </span>
          </div>

          {/* Draggable & Sortable Slides Grid List */}
          <div className="space-y-2.5 max-h-[320px] md:max-h-[500px] overflow-y-auto pr-0.5">
            {project.slides.map((slide, i) => {
              const active = i === activeSlideIndex;
              return (
                <div
                  key={slide.id}
                  onClick={() => {
                    setActiveSlideIndex(i);
                    setSelectedElementId(null);
                  }}
                  className={`group relative p-2 rounded-xl border transition-all cursor-pointer select-none text-left flex items-start gap-2.5 active:scale-[0.98] ${
                    active 
                      ? 'border-orange-500 bg-orange-50/20 shadow-2xs ring-1 ring-orange-500/25' 
                      : 'border-stone-200/80 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {/* Thumbnail Number Index */}
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5 ${active ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
                    {i + 1}
                  </span>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[11px] font-bold text-stone-700 truncate group-hover:text-stone-900">
                      {slide.elements.find(el => el.type === 'text')?.content?.substr(0, 20) || 'Blank Slide'}
                    </span>
                    <span className="text-[8px] text-stone-400 font-mono mt-1">
                      {slide.elements.length} components
                    </span>
                  </div>

                  {/* Thumbnail Controls */}
                  {active && (
                    <div className="absolute right-1.5 top-1.5 hidden group-hover:flex items-center gap-0.5 bg-white border border-stone-200 p-0.5 rounded-md shadow-xs">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMoveSlide('up'); }}
                        disabled={i === 0}
                        className="p-0.5 hover:bg-stone-100 text-stone-500 disabled:opacity-30 rounded transition"
                        title="Move Up"
                      >
                        <ChevronLeft className="w-3 h-3 rotate-90" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMoveSlide('down'); }}
                        disabled={i === project.slides.length - 1}
                        className="p-0.5 hover:bg-stone-100 text-stone-500 disabled:opacity-30 rounded transition"
                        title="Move Down"
                      >
                        <ChevronRight className="w-3 h-3 rotate-90" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddSlide}
            className="w-full py-2.5 border border-dashed border-stone-300 hover:border-stone-500 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Slide</span>
          </button>
        </div>

        {/* Left Sidebar Footer Options */}
        <div className="pt-3 border-t border-stone-100 space-y-1.5">
          <button
            type="button"
            onClick={handleDuplicateSlide}
            className="w-full py-1.5 rounded-lg text-[10px] font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            <span>Clone Current Slide</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteSlide}
            disabled={project.slides.length <= 1}
            className="w-full py-1.5 rounded-lg text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center gap-1 transition cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Discard This Slide</span>
          </button>
        </div>
      </div>

      {/* 2. CENTRAL WORKSPACE: Presentation Editor & Action Dock */}
      <div className="flex-1 flex flex-col min-w-0 bg-stone-50/50">
        
        {/* Top bar for presentation configurations */}
        <div className="h-14 border-b border-stone-200 bg-white px-4 flex items-center justify-between gap-3 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600 flex items-center justify-center">
              <span className="material-symbols-outlined !text-base font-bold">presentation</span>
            </div>
            <input
              type="text"
              value={project.title}
              onChange={(e) => setProject({ ...project, title: e.target.value })}
              className="font-black text-xs text-stone-800 tracking-tight uppercase border-0 p-0 hover:bg-stone-100/50 focus:bg-stone-100 rounded focus:ring-0 outline-none w-48 font-sans"
              title="Click to rename presentation project"
              placeholder="Presentation Name"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Play Presentation Slideshow */}
            <button
              type="button"
              onClick={() => {
                setPlayIndex(activeSlideIndex);
                setIsPlaying(true);
              }}
              className="h-8.5 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Present Deck</span>
            </button>

            {/* Public Watch Link Copier */}
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="h-8.5 px-3 rounded-lg border border-stone-200 hover:border-stone-400 bg-white text-stone-700 hover:text-stone-900 text-[10px] font-black uppercase flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isCopying ? 'Link Copied!' : 'Copy Share Link'}</span>
            </button>
          </div>
        </div>

        {/* Central visual workspace container */}
        <div 
          className="flex-1 p-6 flex flex-col md:flex-row items-center justify-center overflow-auto"
          onClick={() => setSelectedElementId(null)}
        >
          {/* Visual Presentation slide canvas viewport */}
          <div 
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={getSlideBgStyle(currentSlide)}
            className="w-full max-w-[700px] aspect-[16/9] bg-white border border-stone-200 rounded-2xl shadow-[0_15px_40px_rgba(28,25,23,0.08)] relative overflow-hidden flex items-center justify-center p-4 transition-all duration-300"
          >
            {currentSlide.elements.map(el => {
              const isSelected = selectedElementId === el.id;
              const isDark = currentSlide.backgroundColor === '#1c1917' || currentSlide.backgroundType === 'image';
              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(e, el, 'drag')}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    height: `${el.height}%`,
                  }}
                  className={`absolute flex items-center justify-center p-2 text-center group cursor-grab active:cursor-grabbing transition-shadow ${
                    isSelected ? 'ring-2 ring-orange-500/80 rounded-xl bg-orange-500/5 z-50' : 'hover:bg-stone-500/5'
                  }`}
                >
                  {/* Visual Render details depending on components type */}
                  {el.type === 'text' ? (
                    <p
                      style={{
                        fontSize: el.fontSize ? `${el.fontSize}px` : '14px',
                        color: el.color || (isDark ? '#ffffff' : '#1c1917'),
                        fontWeight: el.fontStyle === 'bold' ? 'bold' : 'normal',
                        fontStyle: el.fontStyle === 'italic' ? 'italic' : 'normal'
                      }}
                      className="leading-relaxed whitespace-pre-wrap select-none tracking-tight font-sans w-full h-full overflow-hidden"
                    >
                      {el.content}
                    </p>
                  ) : el.type === 'image' ? (
                    <img
                      src={el.content}
                      alt="Slide asset element"
                      className="w-full h-full object-contain rounded-xl shadow-md select-none pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    /* Embed player of youtube */
                    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-md select-none pointer-events-none">
                      <div className="absolute inset-0 bg-stone-900/60 z-10 flex flex-col items-center justify-center gap-1 text-white">
                        <span className="material-symbols-outlined font-black text-red-500">play_circle</span>
                        <span className="text-[8px] font-bold font-mono tracking-wider uppercase text-stone-200">YouTube Embed Frame</span>
                      </div>
                      <iframe
                        src={getYoutubeEmbedUrl(el.content)}
                        className="w-full h-full border-0"
                        title="Draft player preview"
                      />
                    </div>
                  )}

                  {/* Corner resizing handle anchor */}
                  {isSelected && (
                    <div
                      onMouseDown={(e) => handleElementMouseDown(e, el, 'resize')}
                      className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-orange-500 hover:bg-orange-600 border border-white rounded-md cursor-se-resize flex items-center justify-center shadow z-50 transition active:scale-110"
                      title="Drag to resize element"
                    >
                      <Maximize2 className="w-1.5 h-1.5 text-white" />
                    </div>
                  )}

                  {/* Quick drag indicator sign */}
                  {isSelected && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[7px] font-mono font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow whitespace-nowrap">
                      Selected Item
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom toolbar for adding elements onto slide */}
        <div className="h-14 border-t border-stone-200 bg-white/70 px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-stone-400 font-mono tracking-widest mr-2">
              Add Elements:
            </span>
            <button
              type="button"
              onClick={() => handleAddElement('text')}
              className="h-8.5 px-3.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-950 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text Box</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddElement('image')}
              className="h-8.5 px-3.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-950 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Slide Graphic</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddElement('video')}
              className="h-8.5 px-3.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-950 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>YouTube Video</span>
            </button>
          </div>

          <p className="text-[10px] text-stone-400 font-medium">
            💡 Click on an item to customize, drag, or resize it.
          </p>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR: Slide & Selected Elements Customizer Options Panel */}
      <div className="w-full md:w-64 shrink-0 bg-white border-t md:border-t-0 md:border-l border-stone-200/80 p-4 space-y-5 overflow-y-auto select-none">
        {selectedElement ? (
          /* ACTIVE ELEMENT PARAMETERS PANEL */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 font-mono">
                Component Config
              </span>
              <button
                type="button"
                onClick={() => setSelectedElementId(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 1. Element Type tag */}
            <div className="flex items-center gap-2">
              <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase tracking-wide">
                Type: {selectedElement.type}
              </span>
              <span className="text-[9px] font-mono text-stone-400 font-bold">
                X:{selectedElement.x}% Y:{selectedElement.y}%
              </span>
            </div>

            {/* 2. Content Input box */}
            <div className="space-y-1">
              <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wider font-mono">
                {selectedElement.type === 'text' ? 'Text Message Content' : selectedElement.type === 'image' ? 'Image File URL' : 'YouTube Link URL'}
              </label>
              {selectedElement.type === 'text' ? (
                <textarea
                  value={selectedElement.content}
                  onChange={(e) => handleUpdateElement(selectedElement.id, { content: e.target.value })}
                  rows={4}
                  className="w-full text-xs font-semibold p-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={selectedElement.content}
                  onChange={(e) => handleUpdateElement(selectedElement.id, { content: e.target.value })}
                  className="w-full text-xs font-semibold p-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              )}
            </div>

            {/* 3. Styling Option controllers (Text only) */}
            {selectedElement.type === 'text' && (
              <div className="space-y-3 pt-1">
                {/* Font Size slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-black text-stone-400 uppercase tracking-wider font-mono">
                    <span>Font Size</span>
                    <span className="text-stone-600 font-bold">{selectedElement.fontSize || 14}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={selectedElement.fontSize || 14}
                    onChange={(e) => handleUpdateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                    className="w-full accent-orange-500"
                  />
                </div>

                {/* Font Color picker */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wider font-mono">
                    Text Color Hex
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selectedElement.color || '#1c1917'}
                      onChange={(e) => handleUpdateElement(selectedElement.id, { color: e.target.value })}
                      className="w-8 h-8 rounded border border-stone-200 cursor-pointer overflow-hidden p-0"
                    />
                    <input
                      type="text"
                      value={selectedElement.color || '#1c1917'}
                      onChange={(e) => handleUpdateElement(selectedElement.id, { color: e.target.value })}
                      className="flex-1 text-xs font-mono font-bold px-2 bg-stone-50 border border-stone-200 rounded-lg uppercase"
                    />
                  </div>
                </div>

                {/* Font decoration styles */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wider font-mono">
                    Font Decoration
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'bold' ? 'normal' : 'bold' })}
                      className={`flex-1 py-1.5 border rounded-lg flex items-center justify-center transition cursor-pointer ${selectedElement.fontStyle === 'bold' ? 'bg-orange-500 border-orange-500 text-white' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                      title="Bold Font"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                      className={`flex-1 py-1.5 border rounded-lg flex items-center justify-center transition cursor-pointer ${selectedElement.fontStyle === 'italic' ? 'bg-orange-500 border-orange-500 text-white' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                      title="Italic Font"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Component Button */}
            <button
              type="button"
              onClick={() => handleDeleteElement(selectedElement.id)}
              className="w-full py-2.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Element</span>
            </button>
          </div>
        ) : (
          /* GENERAL SLIDE SETTINGS & BACKGROUND OPTIONS */
          <div className="space-y-4">
            <div className="pb-2 border-b border-stone-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 font-mono">
                Slide Backdrop
              </span>
            </div>

            {/* Tab selection for background type config */}
            <div className="bg-stone-100 p-1 rounded-xl grid grid-cols-3 gap-0.5">
              {[
                { id: 'color', label: 'Solid Color' },
                { id: 'image', label: 'Preset stock' },
                { id: 'url', label: 'Custom URL' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBgTab(tab.id as any)}
                  className={`py-1.5 rounded-lg text-[9px] font-bold transition cursor-pointer ${bgTab === tab.id ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-850'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: 1. SOLID BG COLOR SWATCHES */}
            {bgTab === 'color' && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_BG_COLORS.map((bg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSetBackground('color', bg.value)}
                      className={`w-full aspect-square rounded-lg border hover:scale-105 transition cursor-pointer shadow-2xs ${currentSlide.backgroundColor === bg.value ? 'ring-2 ring-orange-500 border-orange-500' : 'border-stone-200'}`}
                      style={{ backgroundColor: bg.value }}
                      title={bg.name}
                    />
                  ))}
                </div>

                {/* Custom Color Selector Picker */}
                <div className="space-y-1">
                  <span className="block text-[8px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                    Or select custom color
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentSlide.backgroundColor || '#ffffff'}
                      onChange={(e) => handleSetBackground('color', e.target.value)}
                      className="w-7 h-7 rounded border border-stone-200 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={currentSlide.backgroundColor || '#ffffff'}
                      onChange={(e) => handleSetBackground('color', e.target.value)}
                      className="flex-1 text-xs font-mono font-bold px-2 bg-stone-50 border border-stone-200 rounded-lg uppercase"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. STOCK PRESETS BACKGROUNDS */}
            {bgTab === 'image' && (
              <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {PRESET_BACKGROUNDS.map((bg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSetBackground('image', bg.url)}
                    className={`w-full aspect-video rounded-lg border overflow-hidden relative group hover:scale-102 hover:border-stone-400 transition cursor-pointer shadow-3xs ${currentSlide.backgroundImage === bg.url ? 'ring-2 ring-orange-500 border-orange-500' : 'border-stone-200'}`}
                  >
                    <img src={bg.url} alt={bg.name} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-x-0 bottom-0 bg-stone-900/60 p-1 text-[7px] text-white font-bold text-center truncate">
                      {bg.name}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* TAB CONTENT: 3. CUSTOM URL IMAGE BACKDROP */}
            {bgTab === 'url' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wider font-mono">
                    Backdrop Image Address URL
                  </label>
                  <input
                    type="text"
                    value={customBgUrlInput}
                    onChange={(e) => setCustomBgUrlInput(e.target.value)}
                    placeholder="https://example.com/slide-bg.jpg"
                    className="w-full text-xs font-semibold p-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (customBgUrlInput.trim().startsWith('http')) {
                      handleSetBackground('image', customBgUrlInput.trim());
                      onShowToast('Applied custom image backdrop successfully');
                    } else {
                      onShowToast('Please enter a valid Image URL beginning with http:// or https://');
                    }
                  }}
                  className="w-full py-2 bg-stone-900 text-white hover:bg-stone-850 rounded-xl text-[10px] font-extrabold cursor-pointer transition active:scale-95 flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-orange-400" />
                  <span>Apply Backdrop Image</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
