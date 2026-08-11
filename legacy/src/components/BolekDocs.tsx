import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Sparkles, 
  Download, 
  Upload, 
  Plus, 
  Check, 
  X, 
  Bold, 
  Italic, 
  Type, 
  Image as ImageIcon, 
  Table as TableIcon, 
  BookOpen,
  MessageSquare,
  FileDown,
  Maximize2,
  Pencil,
  FileSpreadsheet,
  TrendingUp,
  ClipboardList,
  GraduationCap,
  Briefcase,
  Clock,
  Settings,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  Save,
  Printer,
  Languages,
  Trash2,
  Eye,
  Edit3,
  Calendar,
  Underline,
  Strikethrough,
  User,
  Ruler,
  Scale,
  Undo,
  Redo,
  Search,
  Replace,
  ZoomIn,
  ZoomOut,
  AlertTriangle
} from 'lucide-react';

import { 
  DocFootnote, 
  DocComment, 
  DocTable, 
  DocImage, 
  DocSignature 
} from '../types';

import { 
  exportAsWord, 
  exportAsPages, 
  exportAsHtml,
  exportAsPdf,
  convertMarkdownToHtml 
} from '../lib/docUtils';

export default function BolekDocs({ showAlert }: { showAlert: (msg: string) => void }) {
  // Document Configuration & States
  const [docTitle, setDocTitle] = useState('Imore Studio Document');
  const [docSubtitle, setDocSubtitle] = useState('An AI-Powered Collaboration Framework');
  const [docAuthor, setDocAuthor] = useState('Rjelvan Baloaloa');
  const [content, setContent] = useState(() => {
    const saved = localStorage.getItem('bolek_docs_content');
    return saved || `# Project Bolek Desk Overview\n\nWelcome to the next generation of professional workspace tools. This charter establishes the core alignment goals for integrating visual diagramming suites and high-fidelity text layouts into a cohesive document editor.\n\n## 1. Executive Summary\nBolek Desk empowers students, engineers, and professionals to brainstorm, construct, and present idea workflows seamlessly. By merging an interactive visual flowchart board with an advanced document compiler, teams bridge the gap between creative wireframes and formal proposals.\n\n## 2. Technical Objectives\nOur goal is to build an extensible web application that operates locally and expands with durably hosted cloud features when needed. Speed, clean aesthetics, and contextual AI assistants form the foundation of our user interface.\n\n### Core Deliverables:\n- **Infinite Canvas**: Interactive node-dragging, orthogonal connection styling, and live presentation shows.\n- **Modern Docs Compiler**: Markdown parser, cover page generators, and absolute-placed signature sheets.\n- **Calendar Engine**: Time-aware alerts, simulated mail dispatches, and real-time Resend API integrations.\n\n## 3. Implementation Timeline\nDevelopment iterates across three focused checkpoints to ensure perfect bundle compilations, zero lint warnings, and high responsive density across viewports. All code undergoes rigorous type checks.`;
  });

  // Microsoft Word Styling & Configuration State
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'insert' | 'layout' | 'references' | 'review' | 'ai'>('home');
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  const [fontFamily, setFontFamily] = useState('font-sans'); // font-sans, font-serif, font-mono
  const [fontSize, setFontSize] = useState<number>(11); // in pt/px (align with word)
  const [lineSpacing, setLineSpacing] = useState<number>(1.5); // 1.0, 1.15, 1.5, 2.0
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [pageBg, setPageBg] = useState<'bg-white' | 'bg-[#fbfaf5]' | 'bg-[#f4f6f4]' | 'bg-[#f0f4f8]' | 'bg-[#1e293b]'>('bg-white');
  const [docTheme, setDocTheme] = useState('academic'); // academic, classic, modern, blueprint
  
  // Paper setup states
  const [paperSize, setPaperSize] = useState<'letter' | 'a4' | 'legal' | 'a5' | 'executive'>('letter');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false);
  const [marginTop, setMarginTop] = useState<number>(1.0); // inches
  const [marginBottom, setMarginBottom] = useState<number>(1.0);
  const [marginLeft, setMarginLeft] = useState<number>(1.0);
  const [marginRight, setMarginRight] = useState<number>(1.0);
  
  // Watermark, header/footer, cover page
  const [watermark, setWatermark] = useState('DRAFT');
  const [showWatermark, setShowWatermark] = useState(true);
  const [showCoverPage, setShowCoverPage] = useState(true);
  const [showHeaderFooter, setShowHeaderFooter] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [trackChanges, setTrackChanges] = useState(false);
  const [zoom, setZoom] = useState<number>(100);

  // Undo / Redo history stacks
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoing, setIsUndoing] = useState(false);

  // Find and Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // Sub-objects & Rich Elements
  const [comments, setComments] = useState<DocComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [tables, setTables] = useState<DocTable[]>([
    {
      id: 'table-1',
      headers: ['Phase', 'Deliverable', 'Status', 'Risk Level'],
      rows: [
        ['Phase 1', 'Bolek Canvas Core Engine', 'Completed', 'Minimal'],
        ['Phase 2', 'Docs & Cover Page Styles', 'Active', 'Low'],
        ['Phase 3', 'PDF Download Compilers', 'Active', 'Medium']
      ]
    }
  ]);
  const [images, setImages] = useState<DocImage[]>([
    {
      id: 'img-1',
      url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=400&q=80',
      caption: 'Figure 1: Conceptual Workspace Flowchart Design UI',
      rotate: 0,
      brightness: 100,
      contrast: 100,
      scale: 100
    }
  ]);
  const [imageToolFileName, setImageToolFileName] = useState('imore-image');
  const [imageToolUrl, setImageToolUrl] = useState('');
  const [imageToolWidth, setImageToolWidth] = useState<number>(1200);
  const [imageToolHeight, setImageToolHeight] = useState<number>(800);
  const [imageToolQuality, setImageToolQuality] = useState<number>(0.92);
  const [footnotes, setFootnotes] = useState<DocFootnote[]>([
    { id: 'fn-1', number: 1, text: 'Refer to ISO/IEC 19505 for unified modeling conventions.' },
    { id: 'fn-2', number: 2, text: 'Empirical data sourced from Bolek research analytics (2026).' }
  ]);

  // Signature states
  const [signatures, setSignatures] = useState<DocSignature[]>([]);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<'drawn' | 'typed'>('typed');
  const [typedSignName, setTypedSignName] = useState('Rjelvan Baloaloa');
  const [typedSignFont, setTypedSignFont] = useState('font-signature-1');
  const [isDrawingSign, setIsDrawingSign] = useState(false);
  const [drawCoords, setDrawCoords] = useState<{ x: number; y: number }[]>([]);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);

  // AI Assistant panel states
  const [aiPrompt, setAiPrompt] = useState('Generate professional proposal introduction');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSelectedText, setAiSelectedText] = useState('');
  const [aiTargetLang, setAiTargetLang] = useState('es');

  // Textarea selection tracker
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Undo/Redo stack manager
  useEffect(() => {
    if (isUndoing) {
      setIsUndoing(false);
      return;
    }
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(content);
    if (newHist.length > 50) newHist.shift();
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  }, [content]);

  // Save content to localStorage
  useEffect(() => {
    localStorage.setItem('bolek_docs_content', content);
  }, [content]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setIsUndoing(true);
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setContent(history[nextIdx]);
      showAlert('Undo action compiled.');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoing(true);
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setContent(history[nextIdx]);
      showAlert('Redo action compiled.');
    }
  };

  // Find & Replace
  const handleFindReplace = () => {
    if (!findText) {
      showAlert('Please enter text to search for.');
      return;
    }
    const regex = new RegExp(findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    const updated = content.replace(regex, replaceText);
    setContent(updated);
    showAlert(`Replaced all occurrences of "${findText}" with "${replaceText}".`);
  };

  // Templates loader
  const loadTemplate = (type: 'academic' | 'proposal' | 'minutes') => {
    if (type === 'academic') {
      setDocTitle('University Research: Interactive Canvas Pedagogies');
      setDocSubtitle('Fostering Engineering Visual Mind-Maps via Modern Software Suites');
      setDocTheme('academic');
      setFontFamily('font-serif');
      setPaperSize('letter');
      setLineSpacing(1.5);
      setContent(`# 🎓 University Research Framework\n\n## Abstract\nThis paper investigates the educational impacts of incorporating dynamic vector flowchart panels into computer science curriculums. Through integrated dragging toolsets and YouTube video overlays, students manifest visual design spaces rapidly.\n\n## Introduction [^1]\nVisual learning serves as a catalyst for cognitive retainment. Standard word processors isolate logical brainstorming modules from prose generation. Bolek Desk addresses this dichotomy.\n\n## Conclusion\nUnifying prose with diagram canvas components enhances student workflows. Future research will focus on real-time multiplayer cursor synchronization.`);
      showAlert('Academic document template compiled.');
    } else if (type === 'proposal') {
      setDocTitle('Business Proposal: Cloud Workspace Expansion');
      setDocSubtitle('Integrated Vector Document Management Solutions for Enterprise Teams');
      setDocTheme('modern');
      setFontFamily('font-sans');
      setPaperSize('letter');
      setLineSpacing(1.15);
      setContent(`# 💼 Business Proposal: Project Bolek Desk\n\n## 1. Executive Summary\nWe propose deploying Bolek Desk as our universal documentation system. This system consolidates whiteboard sketches, professional page layouts, and AI-driven drafting under a single high-security portal.\n\n## 2. Market Fit\nEnterprise teams lose billions switching between drawing boards and heavy text documents. Consolidating this workspace eliminates operational friction.`);
      showAlert('Business proposal template compiled.');
    } else if (type === 'minutes') {
      setDocTitle('Weekly Sync: Project Bolek Alignment');
      setDocSubtitle('Session Notes on Vector Mapping and Document Signing Tools');
      setDocTheme('classic');
      setFontFamily('font-mono');
      setPaperSize('a4');
      setLineSpacing(1.0);
      setContent(`# 📝 Project Alignment Minutes\n\n**Date**: July 17, 2026  \n**Chairperson**: Rjelvan Baloaloa  \n\n## Agenda\n- Discussion on implementing draggable signatures.\n- Testing server-side Gemini text summarizations.\n- Scheduling reminders via the Bolek Calendar cron scheduler.`);
      showAlert('Meeting minutes template compiled.');
    }
  };

  // Footnote operations
  const addFootnote = () => {
    const text = prompt('Enter reference footnote text:');
    if (!text) return;
    const num = footnotes.length + 1;
    const newFn: DocFootnote = { id: `fn-${Date.now()}`, number: num, text };
    setFootnotes([...footnotes, newFn]);
    
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const textToInsert = ` [^${num}]`;
      const updated = content.substring(0, start) + textToInsert + content.substring(end);
      setContent(updated);
    } else {
      setContent(prev => prev + ` [^${num}]`);
    }
    showAlert(`Reference Footnote #${num} added to the canvas draft.`);
  };

  // Image manipulation helper
  const updateImage = (id: string, updates: Partial<DocImage>) => {
    setImages(images.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  // Table operations
  const updateTableHeader = (tableId: string, hIdx: number, val: string) => {
    setTables(tables.map(tbl => {
      if (tbl.id !== tableId) return tbl;
      const nextHeaders = [...tbl.headers];
      nextHeaders[hIdx] = val;
      return { ...tbl, headers: nextHeaders };
    }));
  };

  const updateTableCell = (tableId: string, rIdx: number, cIdx: number, val: string) => {
    setTables(tables.map(tbl => {
      if (tbl.id !== tableId) return tbl;
      const nextRows = tbl.rows.map((row, idx) => {
        if (idx !== rIdx) return row;
        const nextRow = [...row];
        nextRow[cIdx] = val;
        return nextRow;
      });
      return { ...tbl, rows: nextRows };
    }));
  };

  const addTableRow = (tableId: string) => {
    setTables(tables.map(tbl => {
      if (tbl.id !== tableId) return tbl;
      const newRow = Array(tbl.headers.length).fill('New cell value');
      return { ...tbl, rows: [...tbl.rows, newRow] };
    }));
    showAlert('Row added to the document table object.');
  };

  const addTableColumn = (tableId: string) => {
    setTables(tables.map(tbl => {
      if (tbl.id !== tableId) return tbl;
      return {
        ...tbl,
        headers: [...tbl.headers, 'New Header'],
        rows: tbl.rows.map(row => [...row, 'Value'])
      };
    }));
    showAlert('Column added to the document table object.');
  };

  // Signature Canvaspad events
  const startSignDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawingSign(true);
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawCoords([{ x, y }]);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1e293b';
      ctx.lineCap = 'round';
    }
  };

  const drawSign = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSign) return;
    const canvas = signCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setDrawCoords(prev => [...prev, { x, y }]);
  };

  const endSignDrawing = () => {
    setIsDrawingSign(false);
  };

  const clearSignCanvas = () => {
    const canvas = signCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setDrawCoords([]);
  };

  const handlePlaceSignature = () => {
    if (signatureType === 'drawn') {
      const canvas = signCanvasRef.current;
      if (!canvas || drawCoords.length === 0) {
        showAlert('Please draw your cursive signature first!');
        return;
      }
      const dataUrl = canvas.toDataURL();
      const newSign: DocSignature = {
        id: `sign-${Date.now()}`,
        type: 'drawn',
        content: dataUrl,
        x: 100,
        y: 400
      };
      setSignatures([...signatures, newSign]);
      clearSignCanvas();
    } else {
      if (!typedSignName.trim()) {
        showAlert('Please type your name signature!');
        return;
      }
      const newSign: DocSignature = {
        id: `sign-${Date.now()}`,
        type: 'typed',
        content: typedSignName,
        font: typedSignFont,
        x: 150,
        y: 450
      };
      setSignatures([...signatures, newSign]);
    }
    setIsSignModalOpen(false);
    showAlert('Signature loaded! You can drag the signature directly on the paper canvas sheet.');
  };

  const deleteSignature = (id: string) => {
    setSignatures(signatures.filter(s => s.id !== id));
    showAlert('Signature stamp removed.');
  };

  const handleSignDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('signatureId', id);
  };

  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('signatureId');
    if (!id) return;

    const paper = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - paper.left - 60; // offset centering
    const y = e.clientY - paper.top - 20;

    setSignatures(signatures.map(s => s.id === id ? { ...s, x, y } : s));
  };

  // AI assistant integration
  const triggerAiDocService = async (mode: 'rewrite' | 'summarize' | 'expand' | 'translate' | 'proposal' | 'minutes') => {
    let finalPromptText = '';
    const activeText = aiSelectedText.trim() || content;

    if (mode === 'rewrite') {
      finalPromptText = `Please rewrite the following text to make it extremely professional, grammatically polished, and elegant:\n\n${activeText}`;
    } else if (mode === 'summarize') {
      finalPromptText = `Summarize the following document, outlining core objectives, technical items, and timeline:\n\n${activeText}`;
    } else if (mode === 'expand') {
      finalPromptText = `Expand the following draft outline into robust, cohesive professional paragraphs:\n\n${activeText}`;
    } else if (mode === 'translate') {
      finalPromptText = `Translate the following text into language code "${aiTargetLang}":\n\n${activeText}`;
    } else if (mode === 'proposal') {
      finalPromptText = `Generate a comprehensive business proposal framework based on the following notes, including an executive summary, timelines, and deliverables:\n\n${activeText}`;
    } else if (mode === 'minutes') {
      finalPromptText = `Convert the following notes into structured professional meeting minutes (agenda, details, action items):\n\n${activeText}`;
    }

    setAiLoading(true);
    showAlert('Connecting to Gemini AI compiler service...');

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPromptText,
          systemInstruction: "You are an expert AI document copywriter and editor. Output text in highly polished, beautiful professional format."
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResult = data.text || '';
        
        if (aiSelectedText.trim()) {
          const updatedContent = content.replace(aiSelectedText, aiResult);
          setContent(updatedContent);
          showAlert('Gemini replacement applied to your highlighted selection!');
        } else {
          setContent(prev => prev + '\n\n' + aiResult);
          showAlert('Gemini generated content appended to your document draft!');
        }
      } else {
        showAlert('AI Endpoint returned an error. Using smart local formatting fallback.');
      }
    } catch (e) {
      console.error(e);
      showAlert('Gemini request failed. Local fallback applied.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const newComm: DocComment = {
      id: `comm-${Date.now()}`,
      author: docAuthor || 'Collaborator',
      text: newCommentText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setComments([...comments, newComm]);
    setNewCommentText('');
    showAlert('Review feedback note pinned to the revisions panel.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extractPdfText = (arrayBuffer: ArrayBuffer) => {
      const binary = Array.from(new Uint8Array(arrayBuffer)).map((byte) => String.fromCharCode(byte)).join('');
      const textChunks = [
        ...binary.matchAll(/\(([^)]*)\)\s*Tj/g),
        ...binary.matchAll(/\[([^\]]+)\]\s*TJ/g),
      ].map((match) => match[1]);

      const cleaned = textChunks
        .map((chunk) => chunk
          .replace(/\\([\\()nrtbf])/g, (_m, escaped) => {
            if (escaped === 'n') return '\n';
            if (escaped === 'r') return '\n';
            if (escaped === 't') return '\t';
            if (escaped === 'b') return '\b';
            if (escaped === 'f') return '\f';
            return escaped;
          })
          .replace(/\s+/g, ' ')
          .trim())
        .filter(Boolean);

      return cleaned.length > 0 ? cleaned.join('\n') : '';
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      const isPdf = /\.pdf$/i.test(file.name);
      const isHtml = /\.html?$/i.test(file.name);
      const rawResult = event.target?.result;
      const text = isPdf
        ? extractPdfText(rawResult as ArrayBuffer)
        : String(rawResult || '');
      const importedText = isHtml
        ? (() => {
            if (typeof DOMParser === 'undefined') return text.replaceAll('<', '').replaceAll('>', '');
            const parsed = new DOMParser().parseFromString(text, 'text/html');
            parsed.querySelectorAll('script,style').forEach((node) => node.remove());
            return parsed.body.textContent || parsed.body.innerText || '';
          })()
        : text;

      if (!importedText.trim()) {
        showAlert(`Imported "${file.name}" but couldn't decode readable text.`);
        return;
      }

      setContent(importedText);
      showAlert(`Successfully loaded file "${file.name}" into the editor workspace.`);
    };
    if (/\.pdf$/i.test(file.name)) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Document calculations & styling
  const generateToc = () => {
    const headings: { title: string; level: number }[] = [];
    const lines = content.split('\n');
    lines.forEach(line => {
      if (line.startsWith('# ')) {
        headings.push({ title: line.replace('# ', ''), level: 1 });
      } else if (line.startsWith('## ')) {
        headings.push({ title: line.replace('## ', ''), level: 2 });
      } else if (line.startsWith('### ')) {
        headings.push({ title: line.replace('### ', ''), level: 3 });
      }
    });
    return headings;
  };

  const tocItems = generateToc();

  // Margins styling
  const marginsStyle = {
    paddingTop: `${marginTop}in`,
    paddingBottom: `${marginBottom}in`,
    paddingLeft: `${marginLeft}in`,
    paddingRight: `${marginRight}in`
  };

  const getPageDimensionsStyle = () => {
    let w = '8.5in';
    let h = '11.0in';
    switch (paperSize) {
      case 'letter': w = '8.5in'; h = '11.0in'; break;
      case 'a4': w = '8.27in'; h = '11.69in'; break;
      case 'legal': w = '8.5in'; h = '14.0in'; break;
      case 'a5': w = '5.83in'; h = '8.27in'; break;
      case 'executive': w = '7.25in'; h = '10.5in'; break;
    }
    
    if (orientation === 'landscape') {
      const temp = w;
      w = h;
      h = temp;
    }
    
    return {
      width: w,
      minHeight: h,
    };
  };

  const fontClasses: { [key: string]: string } = {
    'font-sans': 'font-sans text-stone-800',
    'font-serif': 'font-serif text-stone-900',
    'font-mono': 'font-mono text-xs text-stone-800 leading-normal',
  };

  const themeBorderColor: { [key: string]: string } = {
    academic: 'border-t-4 border-stone-800',
    classic: 'border-t-4 border-amber-900',
    modern: 'border-t-4 border-orange-500',
    blueprint: 'border-t-4 border-sky-600'
  };

  // Text Statistics
  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
  const charCount = content.length;
  const paragraphCount = content.split('\n\n').filter(p => p.trim() !== '').length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // Custom Inline Markdown Parser for JSX Output
  const renderCompiledContent = () => {
    const lines = content.split('\n');
    let renderedElements: React.ReactNode[] = [];
    let currentListItems: React.ReactNode[] = [];
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    let listKey = 0;
    
    const flushList = () => {
      if (currentListItems.length > 0) {
        renderedElements.push(
          <ul key={`list-${listKey++}`} className="list-disc pl-6 my-3 space-y-1 text-stone-700">
            {currentListItems}
          </ul>
        );
        currentListItems = [];
      }
    };
    
    const flushTable = (tKey: number) => {
      if (inTable && (tableHeaders.length > 0 || tableRows.length > 0)) {
        renderedElements.push(
          <div key={`table-wrapper-${tKey}`} className="my-4 overflow-x-auto border border-stone-200 rounded-lg">
            <table className="w-full text-xs border-collapse text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  {tableHeaders.map((th, thIdx) => (
                    <th key={thIdx} className="p-2.5 font-bold text-stone-700 border-r border-stone-200 last:border-r-0">{th}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-stone-150 last:border-b-0 hover:bg-stone-50/50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2.5 text-stone-600 border-r border-stone-200 last:border-r-0">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeaders = [];
        tableRows = [];
        inTable = false;
      }
    };
    
    let lineIdx = 0;
    while (lineIdx < lines.length) {
      let line = lines[lineIdx].trim();
      
      if (line.startsWith('|') && line.endsWith('|')) {
        inTable = true;
        flushList();
        
        if (line.includes('---') || line.includes(':::')) {
          lineIdx++;
          continue;
        }
        
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        if (tableHeaders.length === 0 && tableRows.length === 0) {
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        lineIdx++;
        continue;
      } else {
        if (inTable) {
          flushTable(lineIdx);
        }
      }
      
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const text = line.substring(2);
        currentListItems.push(<li key={`li-${lineIdx}`}>{parseInlineStyles(text)}</li>);
        lineIdx++;
        continue;
      } else {
        flushList();
      }
      
      if (line.startsWith('# ')) {
        renderedElements.push(
          <h1 key={`h1-${lineIdx}`} className="text-2xl font-extrabold text-stone-900 mt-6 mb-3 tracking-tight border-b border-stone-150 pb-1">
            {parseInlineStyles(line.substring(2))}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        renderedElements.push(
          <h2 key={`h2-${lineIdx}`} className="text-xl font-bold text-stone-800 mt-5 mb-2.5 tracking-tight">
            {parseInlineStyles(line.substring(3))}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        renderedElements.push(
          <h3 key={`h3-${lineIdx}`} className="text-lg font-bold text-stone-700 mt-4 mb-2">
            {parseInlineStyles(line.substring(4))}
          </h3>
        );
      } else if (line.startsWith('> ')) {
        renderedElements.push(
          <blockquote key={`quote-${lineIdx}`} className="border-l-4 border-orange-500 bg-stone-50/50 pl-4 py-1.5 italic text-stone-600 my-4 rounded-r-md">
            {parseInlineStyles(line.substring(2))}
          </blockquote>
        );
      } else if (line === '---') {
        renderedElements.push(<hr key={`hr-${lineIdx}`} className="my-6 border-stone-200" />);
      } else if (line !== '') {
        renderedElements.push(
          <p key={`p-${lineIdx}`} className="my-3 leading-relaxed text-stone-800">
            {parseInlineStyles(line)}
          </p>
        );
      }
      
      lineIdx++;
    }
    
    flushList();
    flushTable(9999);
    
    return renderedElements;
  };

  const parseInlineStyles = (text: string) => {
    let parts: (string | React.ReactNode)[] = [text];
    
    // Bold
    let nextParts: (string | React.ReactNode)[] = [];
    parts.forEach(part => {
      if (typeof part === 'string') {
        const regex = /\*\*(.*?)\*\*/g;
        let lastIdx = 0;
        let match;
        while ((match = regex.exec(part)) !== null) {
          if (match.index > lastIdx) {
            nextParts.push(part.substring(lastIdx, match.index));
          }
          nextParts.push(<strong key={`b-${match.index}`} className="font-bold text-stone-950">{match[1]}</strong>);
          lastIdx = regex.lastIndex;
        }
        if (lastIdx < part.length) {
          nextParts.push(part.substring(lastIdx));
        }
      } else {
        nextParts.push(part);
      }
    });
    parts = nextParts;
    
    // Italic
    nextParts = [];
    parts.forEach(part => {
      if (typeof part === 'string') {
        const regex = /\*(.*?)\*/g;
        let lastIdx = 0;
        let match;
        while ((match = regex.exec(part)) !== null) {
          if (match.index > lastIdx) {
            nextParts.push(part.substring(lastIdx, match.index));
          }
          nextParts.push(<em key={`i-${match.index}`} className="italic">{match[1]}</em>);
          lastIdx = regex.lastIndex;
        }
        if (lastIdx < part.length) {
          nextParts.push(part.substring(lastIdx));
        }
      } else {
        nextParts.push(part);
      }
    });
    parts = nextParts;
    
    // Footnote [^1]
    nextParts = [];
    parts.forEach(part => {
      if (typeof part === 'string') {
        const regex = /\[\^(\d+)\]/g;
        let lastIdx = 0;
        let match;
        while ((match = regex.exec(part)) !== null) {
          if (match.index > lastIdx) {
            nextParts.push(part.substring(lastIdx, match.index));
          }
          const num = match[1];
          nextParts.push(
            <sup key={`fn-sup-${match.index}`} className="font-bold text-orange-600 hover:underline cursor-pointer select-none px-0.5" title={`Footnote #${num}`}>
              [{num}]
            </sup>
          );
          lastIdx = regex.lastIndex;
        }
        if (lastIdx < part.length) {
          nextParts.push(part.substring(lastIdx));
        }
      } else {
        nextParts.push(part);
      }
    });
    parts = nextParts;
    
    return parts;
  };

  const handleExportWord = () => {
    exportAsWord({
      docTitle,
      docSubtitle,
      docAuthor,
      content,
      paperSize,
      orientation,
      marginTop,
      marginLeft,
      lineSpacing,
      textAlign,
      fontSize,
      fontFamily,
      showCoverPage,
      footnotes
    });
    showAlert('Document successfully compiled and exported as Microsoft Word (.docx) layout!');
  };

  const handleExportPages = () => {
    exportAsPages({
      docTitle,
      docSubtitle,
      docAuthor,
      content,
      paperSize,
      orientation,
      marginTop,
      marginLeft,
      lineSpacing,
      textAlign,
      fontSize,
      fontFamily,
      showCoverPage,
      footnotes
    });
    showAlert('Document compiled and downloaded with Apple Pages (.pages) file format wrapper! Pages will import and format automatically.');
  };

  const handleExportHtml = () => {
    exportAsHtml({
      docTitle,
      docSubtitle,
      docAuthor,
      content,
      paperSize,
      orientation,
      marginTop,
      marginLeft,
      lineSpacing,
      textAlign,
      fontSize,
      fontFamily,
      showCoverPage,
      footnotes
    });
    showAlert('Document exported as standalone HTML.');
  };

  const handleExportPdf = () => {
    exportAsPdf({
      docTitle,
      docSubtitle,
      docAuthor,
      content,
      paperSize,
      orientation,
      marginTop,
      marginLeft,
      lineSpacing,
      textAlign,
      fontSize,
      fontFamily,
      showCoverPage,
      footnotes
    });
    showAlert('Document exported as a print-ready PDF.');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setImageToolUrl(dataUrl);
      setImageToolFileName(file.name.replace(/\.[^.]+$/, ''));
      const img = new Image();
      img.onload = () => {
        setImageToolWidth(img.naturalWidth || 1200);
        setImageToolHeight(img.naturalHeight || 800);
      };
      img.src = dataUrl;
      showAlert(`Loaded ${file.name} into the image converter.`);
    };
    reader.readAsDataURL(file);
  };

  const downloadConvertedImage = async (mimeType: 'image/webp' | 'image/png', resize = false) => {
    if (!imageToolUrl) {
      showAlert('Upload a PNG, JPG, or WebP image first.');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageToolUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = resize ? Math.max(1, Math.round(imageToolWidth)) : img.naturalWidth;
    canvas.height = resize ? Math.max(1, Math.round(imageToolHeight)) : img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      showAlert('Canvas conversion is unavailable in this browser.');
      return;
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), mimeType, imageToolQuality);
    });

    if (!blob) {
      showAlert('Unable to convert the image.');
      return;
    }

    const suffix = resize ? `${canvas.width}x${canvas.height}` : 'converted';
    const extension = mimeType === 'image/webp' ? 'webp' : 'png';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${imageToolFileName}-${suffix}.${extension}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showAlert(`Image exported as ${extension.toUpperCase()}${resize ? ` at ${canvas.width}×${canvas.height}` : ''}.`);
  };

  return (
    <div className="w-full h-full flex flex-col bg-stone-150/40 overflow-hidden" id="view-docs">
      
      {/* WORD HEADER CHROME */}
      <div className="bg-stone-900 text-stone-100 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm border-b border-stone-800">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-orange-500" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 hidden md:inline">Imore</span>
            <input 
              type="text" 
              value={docTitle} 
              onChange={(e) => setDocTitle(e.target.value)}
              className="bg-transparent border-0 font-bold text-sm text-white focus:ring-0 focus:outline-none focus:bg-stone-800 px-2 py-0.5 rounded w-56 md:w-80 cursor-pointer"
              title="Click to rename document title"
            />
            <span className="text-xs text-stone-400 font-mono hidden md:inline">· Imore Office Suite</span>
          </div>
        </div>
        
        {/* Quick Access Actions */}
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={handleUndo} 
            disabled={historyIndex <= 0}
            className="p-1 hover:bg-stone-800 rounded disabled:opacity-40 transition" 
            title="Undo"
          >
            <Undo className="w-4 h-4 text-white" />
          </button>
          <button 
            type="button" 
            onClick={handleRedo} 
            disabled={historyIndex >= history.length - 1}
            className="p-1 hover:bg-stone-800 rounded disabled:opacity-40 transition" 
            title="Redo"
          >
            <Redo className="w-4 h-4 text-white" />
          </button>
          <button 
            type="button" 
            onClick={() => window.print()} 
            className="p-1 hover:bg-stone-800 rounded transition" 
            title="Print PDF Layout"
          >
            <Printer className="w-4 h-4 text-white" />
          </button>
          
          <div className="h-5 w-px bg-stone-800" />
  
          {/* Mode toggle */}
          <div className="bg-stone-950 p-1 rounded-lg flex border border-stone-850">
            <button
              type="button"
              onClick={() => setEditorMode('edit')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1.5 transition ${editorMode === 'edit' ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'}`}
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit View</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('preview')}
              className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1.5 transition ${editorMode === 'preview' ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'}`}
            >
              <Eye className="w-3 h-3" />
              <span>Print Layout</span>
            </button>
          </div>
        </div>
      </div>
  
      {/* MICROSOFT WORD RIBBON PANEL */}
      <div className="bg-white border-b border-stone-200 shadow-2xs select-none shrink-0">
        
        {/* Ribbon Tabs */}
        <div className="flex bg-stone-100 border-b border-stone-200/60 px-4 text-xs font-semibold text-stone-600">
          {[
            { id: 'home', label: 'Home' },
            { id: 'insert', label: 'Insert' },
            { id: 'layout', label: 'Page Layout' },
            { id: 'references', label: 'References' },
            { id: 'review', label: 'Review' },
            { id: 'ai', label: 'Gemini Copilot' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveRibbonTab(tab.id as any)}
              className={`px-4 py-2.5 border-b-2 transition duration-150 cursor-pointer ${activeRibbonTab === tab.id ? 'border-stone-900 text-stone-900 bg-white' : 'border-transparent hover:bg-stone-50 hover:text-stone-900'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ribbon Content Panel Shelf */}
        <div className="p-3 bg-white min-h-16 flex items-center flex-wrap gap-4 text-xs text-stone-700">
          
          {/* HOME TAB PANEL */}
          {activeRibbonTab === 'home' && (
            <div className="flex items-center flex-wrap gap-4 animate-in fade-in duration-100">
              {/* Font Family Selector */}
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Font Family</span>
                <select 
                  value={fontFamily} 
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs font-medium outline-none focus:bg-white"
                >
                  <option value="font-sans">Inter Sans-serif</option>
                  <option value="font-serif">Georgia Elegant Serif</option>
                  <option value="font-mono">JetBrains Technical Mono</option>
                </select>
              </div>

              {/* Font Size & Spacing */}
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider font-mono">Font Size & Spacing</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center border border-stone-200 rounded bg-stone-50 overflow-hidden">
                    <button 
                      type="button" 
                      onClick={() => setFontSize(Math.max(8, fontSize - 1))}
                      className="px-2 py-1 hover:bg-stone-200 font-bold"
                    >
                      A-
                    </button>
                    <span className="px-2.5 font-bold text-xs">{fontSize}pt</span>
                    <button 
                      type="button" 
                      onClick={() => setFontSize(Math.min(32, fontSize + 1))}
                      className="px-2 py-1 hover:bg-stone-200 font-bold"
                    >
                      A+
                    </button>
                  </div>
                  
                  <select
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                    className="bg-stone-50 border border-stone-200 rounded px-1.5 py-1 text-xs outline-none"
                    title="Line Spacing"
                  >
                    <option value="1.0">1.0 spacing</option>
                    <option value="1.15">1.15 spacing</option>
                    <option value="1.5">1.5 spacing</option>
                    <option value="2.0">2.0 double spacing</option>
                  </select>
                </div>
              </div>

              {/* Formatting Styles */}
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Formatting</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setContent(prev => prev + ' **bold**')}
                    className="p-1.5 border border-stone-200 rounded hover:bg-stone-100"
                    title="Insert Bold Markdown Tag"
                  >
                    <Bold className="w-4 h-4 text-stone-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent(prev => prev + ' *italic*')}
                    className="p-1.5 border border-stone-200 rounded hover:bg-stone-100"
                    title="Insert Italic Markdown Tag"
                  >
                    <Italic className="w-4 h-4 text-stone-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent(prev => prev + ' <u>underline</u>')}
                    className="p-1.5 border border-stone-200 rounded hover:bg-stone-100"
                    title="Insert Underline Tag"
                  >
                    <Underline className="w-4 h-4 text-stone-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setContent(prev => prev + ' ~~strikethrough~~')}
                    className="p-1.5 border border-stone-200 rounded hover:bg-stone-100"
                    title="Insert Strikethrough Tag"
                  >
                    <Strikethrough className="w-4 h-4 text-stone-700" />
                  </button>
                </div>
              </div>

              {/* Alignment */}
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Paragraph Align</span>
                <div className="flex border border-stone-200 rounded overflow-hidden">
                  {(['left', 'center', 'right', 'justify'] as const).map(align => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setTextAlign(align)}
                      className={`p-1.5 transition ${textAlign === align ? 'bg-stone-900 text-white' : 'bg-stone-50 hover:bg-stone-100'}`}
                    >
                      {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                      {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                      {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                      {align === 'justify' && <AlignJustify className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Background preset color picker */}
              <div className="flex flex-col gap-1 border-r border-stone-200 pr-3">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Page Background</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setPageBg('bg-white')} className={`w-5 h-5 rounded-full border border-stone-300 bg-white ${pageBg === 'bg-white' ? 'ring-2 ring-stone-900' : ''}`} title="Plain White" />
                  <button type="button" onClick={() => setPageBg('bg-[#fbfaf5]')} className={`w-5 h-5 rounded-full border border-stone-300 bg-[#fbfaf5] ${pageBg === 'bg-[#fbfaf5]' ? 'ring-2 ring-stone-900' : ''}`} title="Ivory Classic" />
                  <button type="button" onClick={() => setPageBg('bg-[#f4f6f4]')} className={`w-5 h-5 rounded-full border border-stone-300 bg-[#f4f6f4] ${pageBg === 'bg-[#f4f6f4]' ? 'ring-2 ring-stone-900' : ''}`} title="Mint Comfort" />
                  <button type="button" onClick={() => setPageBg('bg-[#f0f4f8]')} className={`w-5 h-5 rounded-full border border-stone-300 bg-[#f0f4f8] ${pageBg === 'bg-[#f0f4f8]' ? 'ring-2 ring-stone-900' : ''}`} title="Eye Protection Soft Gray-Blue" />
                  <button type="button" onClick={() => setPageBg('bg-[#1e293b]')} className={`w-5 h-5 rounded-full border border-stone-300 bg-[#1e293b] ${pageBg === 'bg-[#1e293b]' ? 'ring-2 ring-stone-900' : ''}`} title="Dark Midnight" />
                </div>
              </div>

              {/* Templates Panel shortcut */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Quick Presets</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => loadTemplate('academic')} className="px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded border border-stone-200 font-bold text-[10px] flex items-center gap-1 transition">
                    <GraduationCap className="w-3.5 h-3.5 text-stone-700" />
                    Academic
                  </button>
                  <button type="button" onClick={() => loadTemplate('proposal')} className="px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded border border-stone-200 font-bold text-[10px] flex items-center gap-1 transition">
                    <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                    Proposal
                  </button>
                  <button type="button" onClick={() => loadTemplate('minutes')} className="px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded border border-stone-200 font-bold text-[10px] flex items-center gap-1 transition">
                    <ClipboardList className="w-3.5 h-3.5 text-green-600" />
                    Minutes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INSERT TAB PANEL */}
          {activeRibbonTab === 'insert' && (
            <div className="flex items-center flex-wrap gap-4 animate-in fade-in duration-100">
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Tables & Media</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setContent(prev => prev + '\n\n| Item Code | Deliverable Target | Status | Risk Assessment |\n|---|---|---|---|\n| BOLEK-01 | Infinite Canvas Vector | Completed | Minimal |\n| BOLEK-02 | Signature Drag-Drop | Active | Low |') }
                    className="px-2.5 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-100 flex items-center gap-1.5 transition font-bold"
                  >
                    <TableIcon className="w-4 h-4 text-blue-600" />
                    Add Markdown Table
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Enter image URL:');
                      if (url) {
                        setImages([...images, {
                          id: `img-${Date.now()}`,
                          url,
                          caption: 'Custom Inserted Image caption annotation',
                          rotate: 0,
                          brightness: 100,
                          contrast: 100,
                          scale: 100
                        }]);
                      }
                    }}
                    className="px-2.5 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-100 flex items-center gap-1.5 transition font-bold"
                  >
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                    Add Image Object
                  </button>
                </div>
              </div>

              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Footnotes & Signatures</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addFootnote}
                    className="px-2.5 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-100 flex items-center gap-1.5 transition font-bold"
                  >
                    <BookOpen className="w-4 h-4 text-orange-600" />
                    Insert Footnote
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setIsSignModalOpen(true)}
                    className="px-2.5 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-850 flex items-center gap-1.5 transition font-bold cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 text-orange-400" />
                    Create Signature Stamp
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Formatting Marks</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setContent(prev => prev + '\n\n--- \n')}
                    className="px-2 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded text-[10px] font-bold"
                  >
                    Insert Page Break
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                      setContent(prev => prev + `\n\n**Date Stamp**: ${dateStr}\n`);
                    }}
                    className="px-2 py-1 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded text-[10px] font-bold flex items-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5 text-stone-500" />
                    Insert Date
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAGE LAYOUT TAB PANEL */}
          {activeRibbonTab === 'layout' && (
            <div className="flex items-center flex-wrap gap-4 animate-in fade-in duration-100">
              {/* Page Setup Launcher Dialog Button */}
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Page Setup</span>
                <button
                  type="button"
                  onClick={() => setIsPageSetupOpen(true)}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded px-2.5 py-1 text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer shadow-2xs"
                  title="Open detailed Page Setup configurations"
                >
                  <Ruler className="w-3.5 h-3.5 text-stone-300" />
                  <span>Page Setup...</span>
                </button>
              </div>

              {/* Margins */}
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Margins Presets</span>
                <select
                  onChange={(e) => {
                    const preset = e.target.value;
                    if (preset === 'normal') {
                      setMarginTop(1.0); setMarginBottom(1.0); setMarginLeft(1.0); setMarginRight(1.0);
                    } else if (preset === 'narrow') {
                      setMarginTop(0.5); setMarginBottom(0.5); setMarginLeft(0.5); setMarginRight(0.5);
                    } else if (preset === 'moderate') {
                      setMarginTop(0.75); setMarginBottom(0.75); setMarginLeft(0.75); setMarginRight(0.75);
                    } else if (preset === 'wide') {
                      setMarginTop(1.5); setMarginBottom(1.5); setMarginLeft(1.5); setMarginRight(1.5);
                    }
                  }}
                  className="bg-stone-50 border border-stone-200 rounded px-2.5 py-1 text-xs outline-none font-bold text-stone-800"
                >
                  <option value="normal">Normal (1.0" - standard)</option>
                  <option value="narrow">Narrow (0.5")</option>
                  <option value="moderate">Moderate (0.75")</option>
                  <option value="wide">Wide (1.5")</option>
                </select>
              </div>

              {/* Custom Margin sliders */}
              <div className="flex items-center gap-3 border-r border-stone-200 pr-3">
                <div className="flex flex-col gap-1 text-[10px]">
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Top Margin ({marginTop}")</span>
                  <input type="range" min="0.25" max="2.0" step="0.25" value={marginTop} onChange={(e) => { setMarginTop(parseFloat(e.target.value)); setMarginBottom(parseFloat(e.target.value)); }} className="w-24 accent-stone-900" />
                </div>
                <div className="flex flex-col gap-1 text-[10px]">
                  <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Side Margin ({marginLeft}")</span>
                  <input type="range" min="0.25" max="2.0" step="0.25" value={marginLeft} onChange={(e) => { setMarginLeft(parseFloat(e.target.value)); setMarginRight(parseFloat(e.target.value)); }} className="w-24 accent-stone-900" />
                </div>
              </div>

              {/* Watermark toggle */}
              <div className="flex flex-col gap-1 pr-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Watermark Overlay</span>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="text" 
                    value={watermark} 
                    onChange={(e) => setWatermark(e.target.value)}
                    placeholder="e.g. DRAFT"
                    className="bg-stone-50 border border-stone-200 rounded px-2 py-0.5 text-xs w-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWatermark(!showWatermark)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition ${showWatermark ? 'bg-orange-600 border-orange-600 text-white' : 'bg-stone-50 border-stone-200 text-stone-600'}`}
                  >
                    {showWatermark ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* REFERENCES TAB PANEL */}
          {activeRibbonTab === 'references' && (
            <div className="flex items-center flex-wrap gap-4 animate-in fade-in duration-100">
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Document Cover Settings</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-700">
                    <input 
                      type="checkbox" 
                      checked={showCoverPage} 
                      onChange={(e) => setShowCoverPage(e.target.checked)}
                      className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    Generate Cover Page
                  </label>
                  
                  {showCoverPage && (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={docSubtitle} 
                        onChange={(e) => setDocSubtitle(e.target.value)}
                        placeholder="Document Subtitle"
                        className="bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs w-36"
                        title="Document Subtitle"
                      />
                      <input 
                        type="text" 
                        value={docAuthor} 
                        onChange={(e) => setDocAuthor(e.target.value)}
                        placeholder="Lead Author Name"
                        className="bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs w-28"
                        title="Lead Author Name"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Header Footer settings */}
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Headers & Page Numbers</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-stone-700">
                    <input type="checkbox" checked={showHeaderFooter} onChange={(e) => setShowHeaderFooter(e.target.checked)} className="rounded" />
                    Header & Footer
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-stone-700">
                    <input type="checkbox" checked={showPageNumbers} onChange={(e) => setShowPageNumbers(e.target.checked)} className="rounded" />
                    Page Numbers
                  </label>
                </div>
              </div>

              {/* Design Presets */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Document Theme Design</span>
                <select 
                  value={docTheme} 
                  onChange={(e) => setDocTheme(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded px-2.5 py-1 text-xs font-bold outline-none"
                >
                  <option value="academic">Academic Style (Professional Standard)</option>
                  <option value="classic">Classic Editorial (Warm sepia feel)</option>
                  <option value="modern">Modern Corporate (Bright, high-contrast)</option>
                  <option value="blueprint">Architectural Blueprints (JetBrains mono accents)</option>
                </select>
              </div>
            </div>
          )}

          {/* REVIEW & COLLABORATION TAB */}
          {activeRibbonTab === 'review' && (
            <div className="flex items-center flex-wrap gap-4 animate-in fade-in duration-100">
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Revision Control</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-orange-700 animate-pulse">
                  <input type="checkbox" checked={trackChanges} onChange={(e) => setTrackChanges(e.target.checked)} className="rounded border-orange-400 text-orange-600 focus:ring-orange-500" />
                  Track Content Revisions
                </label>
              </div>

              {/* Find and Replace Toggle */}
              <div className="flex flex-col border-r border-stone-200 pr-3 gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Search Workspace</span>
                <button
                  type="button"
                  onClick={() => setShowFindReplace(!showFindReplace)}
                  className={`px-3 py-1 border rounded font-bold text-xs flex items-center gap-1.5 transition ${showFindReplace ? 'bg-orange-600 border-orange-600 text-white' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'}`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Find & Replace
                </button>
              </div>

              {/* Collaborative Comments input shortcut */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Quick Review Note</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add feedback comment..."
                    className="bg-stone-50 border border-stone-200 rounded px-2.5 py-1 text-xs w-48 outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    className="px-3 py-1 bg-stone-900 text-white rounded font-bold hover:bg-stone-850 cursor-pointer text-xs"
                  >
                    Post Note
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GEMINI COPILOT TAB PANEL */}
          {activeRibbonTab === 'ai' && (
            <div className="flex items-center flex-wrap gap-4 animate-in fade-in duration-100 w-full">
              <div className="flex flex-col gap-1 shrink-0">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                  Gemini Prompt
                </span>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask Gemini to polish or generate sections of your work..."
                  className="bg-stone-50 border border-stone-200 rounded px-2.5 py-1 text-xs w-64 md:w-96 focus:bg-white focus:border-stone-400 outline-none font-medium"
                />
              </div>

              {/* Quick AI compilers (using Lucide SVGs entirely) */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">AI Operations</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => triggerAiDocService('rewrite')}
                    disabled={aiLoading}
                    className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10.5px] rounded flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-orange-400" />
                    Rewrite Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerAiDocService('summarize')}
                    disabled={aiLoading}
                    className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10.5px] rounded flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
                    Summarize
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerAiDocService('expand')}
                    disabled={aiLoading}
                    className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10.5px] rounded flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                    Expand Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerAiDocService('minutes')}
                    disabled={aiLoading}
                    className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10.5px] rounded flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Minutes
                  </button>
                </div>
              </div>

              {/* Translation Engine options */}
              <div className="flex flex-col gap-1 shrink-0">
                <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Translate</span>
                <div className="flex gap-1.5">
                  <select 
                    value={aiTargetLang} 
                    onChange={(e) => setAiTargetLang(e.target.value)}
                    className="bg-stone-50 border border-stone-200 text-xs font-bold p-1 rounded"
                  >
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="de">German (de)</option>
                    <option value="it">Italian (it)</option>
                    <option value="ja">Japanese (ja)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => triggerAiDocService('translate')}
                    disabled={aiLoading}
                    className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10.5px] rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    Go
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* DYNAMIC FIND AND REPLACE COMPONENT BAR */}
      <AnimatePresence>
        {showFindReplace && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-stone-50 border-b border-stone-200 px-4 py-2.5 flex items-center gap-4 shrink-0 overflow-hidden text-xs text-stone-700"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-600">Find:</span>
              <input 
                type="text" 
                value={findText} 
                onChange={(e) => setFindText(e.target.value)}
                placeholder="text to find..."
                className="bg-white border border-stone-200 rounded px-2.5 py-1 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-600">Replace with:</span>
              <input 
                type="text" 
                value={replaceText} 
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="replacement text..."
                className="bg-white border border-stone-200 rounded px-2.5 py-1 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleFindReplace}
              className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded font-bold cursor-pointer transition text-xs"
            >
              Replace All
            </button>
            <button
              type="button"
              onClick={() => setShowFindReplace(false)}
              className="p-1 hover:bg-stone-200 rounded ml-auto text-stone-400 hover:text-stone-700"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN LAYOUT SPLIT: Left Sidebar Controls / Center Document Paper / Right Comments Panel */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden select-none">
        
        {/* Left mini options sidebar */}
        <div className="w-full md:w-64 bg-stone-50 border-b md:border-b-0 md:border-r border-stone-200 p-3 overflow-y-auto shrink-0 select-none flex flex-col gap-3">
          
          {/* File Exporters */}
          <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-2.5 shadow-2xs">
            <span className="text-[10px] font-extrabold text-stone-800 uppercase tracking-wider block font-sans border-b border-stone-100 pb-1">Document Converter</span>
            <p className="text-[9px] text-stone-500 leading-snug">
              Word, Pages, PDF, HTML, and image conversion tools for a premium office workflow.
            </p>
            
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={handleExportWord}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold border border-stone-200 bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-800 transition cursor-pointer"
                title="Export high-fidelity Word docx file"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Export as Word</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 rotate-270" />
              </button>

              <button
                type="button"
                onClick={handleExportPages}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold border border-stone-200 bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-800 transition cursor-pointer"
                title="Export high-fidelity Pages file wrapper"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <span>Export as Pages</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 rotate-270" />
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold border border-stone-200 bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-800 transition cursor-pointer"
                title="Export the current document as PDF"
              >
                <div className="flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-red-600" />
                  <span>Export as PDF</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 rotate-270" />
              </button>
              <button
                type="button"
                onClick={handleExportHtml}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold border border-stone-200 bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-800 transition cursor-pointer"
                title="Export the current document as HTML"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Export as HTML</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 rotate-270" />
              </button>
            </div>
          </div>

          {/* Draggable Signatures Stamp Panel */}
          <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-1">
              <span className="text-[10px] font-extrabold text-stone-800 uppercase tracking-wider block font-sans">Signatures</span>
              <button
                type="button"
                onClick={() => setIsSignModalOpen(true)}
                className="px-2 py-0.5 bg-stone-900 text-white text-[9px] font-bold rounded hover:bg-stone-850 transition"
              >
                + Stamp
              </button>
            </div>

            {signatures.length === 0 ? (
              <div className="text-center py-2 text-[9px] text-stone-400 italic">
                No signatures. Add a stamp to place on the paper!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[110px] overflow-y-auto">
                {signatures.map(sign => (
                  <div 
                    key={sign.id} 
                    draggable
                    onDragStart={(e) => handleSignDragStart(e, sign.id)}
                    className="bg-stone-50 border border-stone-200 rounded p-1.5 flex items-center justify-between text-[10px] cursor-grab active:cursor-grabbing hover:border-orange-500"
                    title="Drag onto paper sheet to place"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-stone-400 font-mono text-[9px]">⠿</span>
                      {sign.type === 'typed' ? (
                        <span className="truncate font-bold text-stone-700 italic font-serif">{sign.content}</span>
                      ) : (
                        <img src={sign.content} alt="Drawn" className="h-4 max-w-[80px] object-contain invert" />
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => deleteSignature(sign.id)}
                      className="text-stone-400 hover:text-red-600 px-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <span className="text-[8px] text-stone-400 font-bold uppercase tracking-wider font-mono block text-center mt-1">💡 Drag stamp to place</span>
              </div>
            )}
          </div>

          {/* Import File block */}
          <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-1.5 shadow-2xs">
            <span className="text-[10px] font-extrabold text-stone-800 uppercase tracking-wider block font-sans">Import Draft Text</span>
            <label className="flex items-center justify-center gap-2 border border-dashed border-stone-300 rounded-lg p-2 bg-stone-50/50 hover:bg-stone-50 cursor-pointer transition text-stone-600">
              <Upload className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[10px] font-bold text-stone-700">Choose MD, TXT, HTML, PDF</span>
              <input type="file" accept=".txt,.md,.html,.pdf" onChange={handleImportFile} className="hidden" />
            </label>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-2.5 shadow-2xs">
            <span className="text-[10px] font-extrabold text-stone-800 uppercase tracking-wider block font-sans border-b border-stone-100 pb-1">Image Converter</span>
            <label className="flex items-center justify-center gap-2 border border-dashed border-stone-300 rounded-lg p-2 bg-stone-50/50 hover:bg-stone-50 cursor-pointer transition text-stone-600">
              <ImageIcon className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[10px] font-bold text-stone-700">Upload PNG / JPG / WebP</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="hidden" />
            </label>

            {imageToolUrl && (
              <div className="space-y-2">
                <img src={imageToolUrl} alt="Image preview" className="w-full max-h-32 object-contain rounded-lg border border-stone-200 bg-stone-50" />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[9px] font-bold text-stone-500 uppercase">
                    Width
                    <input type="number" value={imageToolWidth} onChange={(e) => setImageToolWidth(parseInt(e.target.value) || 1)} className="mt-1 w-full rounded border border-stone-200 px-2 py-1 text-xs" />
                  </label>
                  <label className="text-[9px] font-bold text-stone-500 uppercase">
                    Height
                    <input type="number" value={imageToolHeight} onChange={(e) => setImageToolHeight(parseInt(e.target.value) || 1)} className="mt-1 w-full rounded border border-stone-200 px-2 py-1 text-xs" />
                  </label>
                </div>
                <label className="block text-[9px] font-bold text-stone-500 uppercase">
                  Quality
                  <input type="range" min="0.5" max="1" step="0.01" value={imageToolQuality} onChange={(e) => setImageToolQuality(parseFloat(e.target.value))} className="mt-2 w-full accent-orange-600" />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => downloadConvertedImage('image/webp')} className="flex-1 px-2 py-1.5 rounded-lg bg-stone-900 text-white text-[10px] font-bold cursor-pointer">
                    PNG → WebP
                  </button>
                  <button type="button" onClick={() => downloadConvertedImage('image/webp', true)} className="flex-1 px-2 py-1.5 rounded-lg bg-orange-600 text-white text-[10px] font-bold cursor-pointer">
                    Resize & Export
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Center Canvas: Physical Paper Sheet layout workspace */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto select-none gap-3 relative bg-stone-150/50">
          
          {/* Zoom & Quick Controls Header */}
          <div className="flex items-center justify-between px-2 text-stone-500 text-[10px] shrink-0">
            <div className="flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-bold font-sans uppercase tracking-wider">{paperSize.toUpperCase()} SHEET · {orientation.toUpperCase()}</span>
            </div>

            {/* Zoom Slider */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-0.5 hover:bg-stone-200 rounded">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold w-10 text-center">{zoom}%</span>
              <button type="button" onClick={() => setZoom(Math.min(150, zoom + 10))} className="p-0.5 hover:bg-stone-200 rounded">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <input 
                type="range" min="50" max="150" value={zoom} 
                onChange={(e) => setZoom(parseInt(e.target.value))}
                className="w-20 md:w-28 accent-stone-850"
              />
            </div>
          </div>

          {/* INTERACTIVE APPLE PAGES STYLE MARGIN RULER BAR */}
          <div className="w-full bg-white border border-stone-200/80 p-3.5 flex flex-col md:flex-row items-center justify-between gap-4 select-none rounded-2xl shadow-2xs shrink-0 mt-0.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-stone-100 rounded-lg text-stone-800">
                <Ruler className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-stone-900 uppercase tracking-tight font-sans">Interactive Margin Tuner</span>
                <span className="text-[8.5px] text-stone-400 font-bold uppercase font-mono tracking-wider leading-none">Adjust margins dynamically like Microsoft Word & Apple Pages</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-[10px] w-full md:w-auto font-bold text-stone-700">
              <div className="flex items-center gap-2 flex-1 md:flex-initial justify-between md:justify-start">
                <span className="text-[9px] text-stone-400 uppercase tracking-widest w-16 font-mono">Top ({marginTop}")</span>
                <input 
                  type="range" 
                  min="0.25" 
                  max="2.5" 
                  step="0.05" 
                  value={marginTop} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setMarginTop(val);
                    setMarginBottom(val);
                  }} 
                  className="w-24 md:w-32 accent-stone-900 h-1 bg-stone-150 rounded-lg appearance-none cursor-ew-resize"
                />
              </div>
              <div className="flex items-center gap-2 flex-1 md:flex-initial justify-between md:justify-start">
                <span className="text-[9px] text-stone-400 uppercase tracking-widest w-16 font-mono">Sides ({marginLeft}")</span>
                <input 
                  type="range" 
                  min="0.25" 
                  max="2.5" 
                  step="0.05" 
                  value={marginLeft} 
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setMarginLeft(val);
                    setMarginRight(val);
                  }} 
                  className="w-24 md:w-32 accent-stone-900 h-1 bg-stone-150 rounded-lg appearance-none cursor-ew-resize"
                />
              </div>
            </div>
          </div>

          {/* Absolute Core Paper Sheet */}
          <div className="w-full flex justify-center items-start overflow-visible min-h-[900px] py-4">
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDocDrop}
              className={`bg-white border border-stone-300 shadow-lg rounded relative transition-all duration-300 select-text ${fontClasses[fontFamily]} ${pageBg}`}
              style={{
                ...marginsStyle,
                ...getPageDimensionsStyle(),
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center'
              }}
            >
              
              {/* Diagonal Watermark */}
              {showWatermark && watermark && (
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0 opacity-[0.03]">
                  <span className="text-[100px] font-black tracking-widest font-sans uppercase rotate-45 border-4 border-stone-900 px-8 py-3">
                    {watermark}
                  </span>
                </div>
              )}

              {/* Cover page block */}
              {showCoverPage && (
                <div className={`flex flex-col justify-between p-6 mb-12 border-b border-stone-200/60 pb-12 min-h-[550px] text-center ${themeBorderColor[docTheme]} relative z-10 bg-stone-50/10`}>
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 font-mono tracking-widest uppercase block mb-8">Workspace Document Protocol</span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 leading-tight uppercase font-sans">
                      {docTitle}
                    </h1>
                    <div className="w-12 h-1 bg-orange-600 mx-auto mt-4" />
                    <p className="text-xs text-stone-500 mt-3 max-w-md mx-auto italic">
                      {docSubtitle}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block font-mono">Lead Compiler Author:</span>
                    <span className="text-xs font-bold text-stone-800 tracking-wide block uppercase font-mono">{docAuthor}</span>
                    <span className="text-[9px] text-stone-400 block font-mono">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </div>
              )}

              {/* Table of Contents Header in Preview Mode */}
              {editorMode === 'preview' && tocItems.length > 0 && (
                <div className="mb-6 p-4 bg-stone-50 rounded-lg border border-stone-200/80 text-xs z-10">
                  <h3 className="font-extrabold text-stone-800 uppercase tracking-widest text-[9px] mb-2 font-mono flex items-center gap-1.5 border-b border-stone-200 pb-1">
                    <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                    Table of Contents (Auto Header Parse)
                  </h3>
                  <ul className="space-y-1 font-mono">
                    {tocItems.map((h, i) => (
                      <li key={i} className={`flex items-center justify-between text-[10px] ${h.level === 1 ? 'font-bold pl-0 text-stone-800' : h.level === 2 ? 'pl-4 text-stone-600' : 'pl-8 text-stone-500'}`}>
                        <span className="hover:underline cursor-pointer">{h.title}</span>
                        <span className="flex-1 border-b border-dotted border-stone-200 mx-2"></span>
                        <span className="font-bold">{i + 1}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Document Header Area */}
              {showHeaderFooter && (
                <div className="flex items-center justify-between text-[9px] text-stone-400 font-mono uppercase tracking-widest border-b border-stone-200 pb-1.5 mb-6 z-10">
                  <span>{docTitle}</span>
                  <span>Bolek Office Docs Compiler</span>
                </div>
              )}

              {/* Revision tracking warning notice */}
              {trackChanges && (
                <div className="mb-4 p-2 bg-orange-50 rounded border border-orange-200 flex items-center justify-between text-[10px] text-orange-800 z-10 font-bold font-mono">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-orange-600 animate-pulse" />
                    REVISION TRACKING ENGAGED. Live content tracking is on.
                  </span>
                  <span className="bg-orange-100 text-orange-900 px-1.5 py-0.5 rounded text-[8px]">TRACKING</span>
                </div>
              )}

              {/* MAIN CONTENT AREA */}
              <div className="flex-1 flex flex-col relative z-10 min-h-[400px]">
                
                {editorMode === 'edit' ? (
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onSelect={(e) => {
                      const target = e.currentTarget;
                      const selected = target.value.substring(target.selectionStart, target.selectionEnd);
                      setAiSelectedText(selected);
                    }}
                    style={{ 
                      fontSize: `${fontSize}pt`,
                      lineHeight: lineSpacing,
                      textAlign: textAlign
                    }}
                    className={`w-full flex-1 outline-none border-0 p-0 text-stone-800 bg-transparent resize-none focus:ring-0 whitespace-pre-wrap select-text h-full`}
                    placeholder="Type or markdown your text directly in Microsoft Word style here..."
                  />
                ) : (
                  <div 
                    style={{ 
                      fontSize: `${fontSize}pt`,
                      lineHeight: lineSpacing,
                      textAlign: textAlign
                    }}
                    className="w-full flex-1 whitespace-pre-wrap select-text markdown-body"
                  >
                    {renderCompiledContent()}
                  </div>
                )}

              </div>

              {/* Embedded Table Objects (Rendered beneath main draft) */}
              {editorMode === 'edit' && tables.map((tbl, idx) => (
                <div key={tbl.id} className="my-6 z-10 border border-stone-200 rounded-lg bg-stone-50/50 p-2 text-[10px]">
                  <span className="text-[8px] font-bold text-stone-400 uppercase block mb-1">Editable Table Block #{idx+1}</span>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-stone-100/80 border-b border-stone-200 text-left font-bold text-stone-700">
                        {tbl.headers.map((h, hIdx) => (
                          <th key={hIdx} className="p-1.5">
                            <input
                              type="text"
                              value={h}
                              onChange={(e) => updateTableHeader(tbl.id, hIdx, e.target.value)}
                              className="bg-transparent border-0 p-0 w-full font-bold focus:ring-0 outline-none"
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tbl.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-stone-150 text-stone-600 hover:bg-stone-100/50">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-1.5">
                              <input
                                type="text"
                                value={cell}
                                onChange={(e) => updateTableCell(tbl.id, rIdx, cIdx, e.target.value)}
                                className="bg-transparent border-0 p-0 w-full focus:ring-0 outline-none"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => addTableRow(tbl.id)} className="px-2 py-0.5 border border-stone-200 bg-white hover:bg-stone-100 rounded text-[9px] font-bold">
                      + Add Row
                    </button>
                    <button type="button" onClick={() => addTableColumn(tbl.id)} className="px-2 py-0.5 border border-stone-200 bg-white hover:bg-stone-100 rounded text-[9px] font-bold">
                      + Add Column
                    </button>
                  </div>
                </div>
              ))}

              {/* Embedded Graphic Vectors */}
              {editorMode === 'edit' && images.map(img => (
                <div key={img.id} className="my-6 z-10 bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-2.5">
                  <span className="text-[8px] font-bold text-stone-400 uppercase block">Graphic Annotation #{img.id}</span>
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="border border-stone-200 rounded overflow-hidden bg-white max-w-[150px]">
                      <img 
                        src={img.url} 
                        alt={img.caption} 
                        className="object-cover transition-all"
                        style={{ 
                          transform: `rotate(${img.rotate}deg) scale(${img.scale / 100})`,
                          filter: `brightness(${img.brightness}%) contrast(${img.contrast}%)`
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-2 text-[10px]">
                      <div>
                        <label className="block text-stone-400">Caption:</label>
                        <input 
                          type="text" 
                          value={img.caption} 
                          onChange={(e) => updateImage(img.id, { caption: e.target.value })}
                          className="w-full bg-white border border-stone-200 rounded px-2 py-0.5"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[8px]">
                        <div>
                          <span className="text-stone-400 block">Rotate: ({img.rotate}°)</span>
                          <input type="range" min="0" max="360" step="90" value={img.rotate} onChange={(e) => updateImage(img.id, { rotate: parseInt(e.target.value) })} className="w-full" />
                        </div>
                        <div>
                          <span className="text-stone-400 block">Contrast: ({img.contrast}%)</span>
                          <input type="range" min="50" max="150" step="10" value={img.contrast} onChange={(e) => updateImage(img.id, { contrast: parseInt(e.target.value) })} className="w-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Footnotes output footer block */}
              {footnotes.length > 0 && (
                <div className="mt-auto border-t border-stone-200 pt-3 z-10 text-[9px] text-stone-500 space-y-1 font-mono">
                  <span className="font-extrabold text-[8px] text-stone-400 uppercase block mb-1">References & Footnotes</span>
                  {footnotes.map(fn => (
                    <p key={fn.id} className="leading-relaxed">
                      <span className="font-bold text-stone-800">[{fn.number}]</span> {fn.text}
                    </p>
                  ))}
                </div>
              )}

              {/* Draggable placed absolute signatures */}
              {signatures.map(sign => (
                <div
                  key={sign.id}
                  className="absolute z-30 cursor-move border border-dashed border-orange-400/50 bg-orange-50/20 px-2.5 py-1 rounded select-none shadow-3xs"
                  style={{ left: `${sign.x}px`, top: `${sign.y}px` }}
                  title="Drag me to reposition on the sheet"
                  draggable
                  onDragStart={(e) => handleSignDragStart(e, sign.id)}
                >
                  {sign.type === 'typed' ? (
                    <span className="text-[12px] font-bold text-orange-800 italic font-serif">{sign.content}</span>
                  ) : (
                    <img src={sign.content} alt="Drawn sign stamp" className="h-7 max-w-[120px] object-contain invert" />
                  )}
                  <div className="flex items-center justify-between gap-1.5 pt-0.5 border-t border-stone-200/20 mt-0.5">
                    <span className="block text-[6px] text-stone-400 uppercase font-mono tracking-wider">Stamped Sign</span>
                    <button 
                      type="button" 
                      onClick={() => deleteSignature(sign.id)}
                      className="text-stone-400 hover:text-red-600 text-[8px]"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              {/* Document Footer Area */}
              {showHeaderFooter && (
                <div className="flex items-center justify-between text-[8px] text-stone-400 font-mono border-t border-stone-150 pt-1.5 mt-6 z-10">
                  <span>Bolek Office Systems International</span>
                  {showPageNumbers && <span>Page 1 of 1</span>}
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Right Panel: AI Copilot and Comments Revision list */}
        <div className="w-full md:w-72 bg-stone-50 p-4 border-t md:border-t-0 md:border-l border-stone-200 overflow-y-auto shrink-0 select-none flex flex-col gap-4">
          
          {/* AI Selection box helper */}
          {aiSelectedText.trim() && (
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-200/60 text-xs leading-relaxed text-orange-950 animate-in slide-in-from-top-1.5 duration-150 shrink-0 shadow-2xs">
              <span className="font-extrabold uppercase font-mono block text-[9px] text-orange-600 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Active Selection Detected:
              </span>
              <p className="italic truncate text-stone-700">"{aiSelectedText}"</p>
              <p className="mt-1 text-[10px] text-orange-800 font-semibold leading-normal">Gemini operations will only rewrite or translate this specific highlight.</p>
            </div>
          )}

          {/* Collaborative Feedback Revision Notes */}
          <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center gap-1.5 border-b border-stone-100 pb-2 mb-2">
              <MessageSquare className="w-4 h-4 text-stone-500" />
              <span className="text-[10px] font-extrabold text-stone-800 uppercase tracking-widest font-sans">Comments Board</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[260px] pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-[10px] text-stone-400 italic font-mono">
                  No collaboration revisions posted yet.
                </div>
              ) : (
                comments.map(comm => (
                  <div key={comm.id} className="bg-stone-50 p-2 rounded-lg border border-stone-200 text-[10px] leading-relaxed relative font-mono">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-extrabold text-stone-800 uppercase text-[9px]">{comm.author}</span>
                      <span className="text-[8px] text-stone-400">{comm.timestamp}</span>
                    </div>
                    <p className="text-stone-600">{comm.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-1 pt-2 border-t border-stone-100 mt-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Type revision review..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded px-2 py-1 text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddComment}
                className="px-2.5 py-1 bg-stone-900 text-white font-bold rounded hover:bg-stone-800 text-xs transition cursor-pointer"
              >
                Post
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* DYNAMIC MS WORD STATUS BAR AT THE BOTTOM */}
      <div className="bg-stone-100 border-t border-stone-200 px-4 py-1.5 flex items-center justify-between text-[11px] font-medium text-stone-500 shrink-0 font-mono select-none">
        <div className="flex items-center gap-4">
          <span>Page 1 of 1</span>
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
          <span className="hidden md:inline">{paragraphCount} paragraphs</span>
          <span className="hidden sm:inline">· Approx. {readTime} min read</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden lg:inline">Margins: T {marginTop}" · S {marginLeft}"</span>
          <span>Theme: {docTheme.toUpperCase()}</span>
          <span>English (US)</span>
        </div>
      </div>

      {/* PAGE SETUP DIALOG MODAL */}
      <AnimatePresence>
        {isPageSetupOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/55 backdrop-blur-xs select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsPageSetupOpen(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-stone-800"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-stone-800" />
                  <h3 className="text-sm font-black tracking-tight uppercase font-sans text-stone-900">
                    Page Setup Configuration
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsPageSetupOpen(false)}
                  className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700 cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content Form */}
              <div className="space-y-4 text-xs">
                
                {/* Paper Size Selector Grid */}
                <div>
                  <span className="block text-[10px] text-stone-400 font-extrabold uppercase mb-2 tracking-wider">Standard Paper Size</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'letter', name: 'Letter', desc: '8.5" x 11.0"' },
                      { id: 'a4', name: 'A4 Std', desc: '8.27" x 11.69"' },
                      { id: 'legal', name: 'Legal', desc: '8.5" x 14.0"' }
                    ].map(size => (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => setPaperSize(size.id as any)}
                        className={`p-3 rounded-xl border text-left transition duration-150 cursor-pointer ${paperSize === size.id ? 'border-stone-900 bg-stone-50 text-stone-900 ring-2 ring-stone-100' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700'}`}
                      >
                        <div className="font-extrabold text-xs flex items-center justify-between">
                          <span>{size.name}</span>
                          {paperSize === size.id && <Check className="w-3.5 h-3.5 text-stone-900" />}
                        </div>
                        <div className="text-[9px] text-stone-500 mt-1 font-mono leading-none">{size.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document Orientation Grid */}
                <div>
                  <span className="block text-[10px] text-stone-400 font-extrabold uppercase mb-2 tracking-wider">Document Orientation</span>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'portrait', name: 'Portrait', desc: 'Vertical alignment' },
                      { id: 'landscape', name: 'Landscape', desc: 'Horizontal alignment' }
                    ].map(orient => (
                      <button
                        key={orient.id}
                        type="button"
                        onClick={() => setOrientation(orient.id as any)}
                        className={`p-4 rounded-xl border text-center transition duration-150 cursor-pointer flex flex-col items-center justify-center ${orientation === orient.id ? 'border-stone-900 bg-stone-50 text-stone-900 ring-2 ring-stone-100' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700'}`}
                      >
                        {/* Page Preview Thumbnail representing portrait or landscape */}
                        <div className={`border-2 border-stone-400 bg-stone-100 rounded mb-2 transition-all duration-300 flex flex-col justify-between p-1 shadow-3xs ${orient.id === 'portrait' ? 'w-6 h-8' : 'w-8 h-6'}`}>
                          <div className="w-full h-0.5 bg-stone-300"></div>
                          <div className="space-y-0.5">
                            <div className="w-2/3 h-0.5 bg-stone-200"></div>
                            <div className="w-1/2 h-0.5 bg-stone-200"></div>
                          </div>
                        </div>
                        <div className="font-extrabold text-xs">{orient.name}</div>
                        <div className="text-[9px] text-stone-500 mt-0.5 font-mono leading-none">{orient.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Margins Configurations */}
                <div>
                  <span className="block text-[10px] text-stone-400 font-extrabold uppercase mb-2 tracking-wider">Page Margins (Inches)</span>
                  <div className="grid grid-cols-2 gap-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200/60">
                    <div>
                      <label className="block text-[9px] text-stone-500 font-bold uppercase mb-1">Top & Bottom Margin</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="0.25" 
                          max="2.5" 
                          step="0.25" 
                          value={marginTop} 
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.0;
                            setMarginTop(val);
                            setMarginBottom(val);
                          }}
                          className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs outline-none focus:border-stone-400 font-mono"
                        />
                        <span className="text-stone-400 font-mono text-xs">in</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] text-stone-500 font-bold uppercase mb-1">Left & Right Margin</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="0.25" 
                          max="2.5" 
                          step="0.25" 
                          value={marginLeft} 
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1.0;
                            setMarginLeft(val);
                            setMarginRight(val);
                          }}
                          className="w-full bg-white border border-stone-200 rounded px-2.5 py-1 text-xs outline-none focus:border-stone-400 font-mono"
                        />
                        <span className="text-stone-400 font-mono text-xs">in</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer actions */}
              <div className="flex gap-2.5 pt-3.5 border-t border-stone-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPageSetupOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPageSetupOpen(false);
                    showAlert(`Applied Page Setup config: ${paperSize.toUpperCase()} page in ${orientation.toUpperCase()} orientation.`);
                  }}
                  className="flex-1 py-2 bg-stone-900 hover:bg-stone-850 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md shadow-stone-900/10"
                >
                  Apply Setup
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIGNATURE STAMP DIALOG MODAL */}
      <AnimatePresence>
        {isSignModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs select-none"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-stone-800"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5 uppercase font-sans">
                  <Pencil className="w-4 h-4 text-orange-600" />
                  Create Signature Stamp
                </h3>
                <button 
                  type="button" 
                  onClick={() => setIsSignModalOpen(false)}
                  className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stamp Toggle drawn vs typed */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSignatureType('typed')}
                  className={`py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${signatureType === 'typed' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'}`}
                >
                  Type Stamp
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureType('drawn')}
                  className={`py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${signatureType === 'drawn' ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500'}`}
                >
                  Draw Stamp
                </button>
              </div>

              {signatureType === 'typed' ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[9px] text-stone-400 font-extrabold uppercase mb-1">Cursive Signature Name</label>
                    <input 
                      type="text"
                      value={typedSignName}
                      onChange={(e) => setTypedSignName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded px-2.5 py-1.5 text-xs outline-none focus:bg-white font-bold"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] text-stone-400 font-extrabold uppercase mb-1">Cursive Signature Preview</span>
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-center">
                      <span className="text-2xl font-bold text-orange-800 italic font-serif tracking-wider block">
                        {typedSignName || 'Preview Stamp'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <span className="block text-[9px] text-stone-400 font-extrabold uppercase">Draw on pad below:</span>
                  <div className="border border-stone-200 bg-stone-50 rounded-xl overflow-hidden cursor-crosshair">
                    <canvas
                      ref={signCanvasRef}
                      width={320}
                      height={120}
                      onMouseDown={startSignDrawing}
                      onMouseMove={drawSign}
                      onMouseUp={endSignDrawing}
                      onMouseLeave={endSignDrawing}
                      className="w-full h-28 block bg-stone-50"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={clearSignCanvas}
                      className="px-2.5 py-1 text-[10px] font-bold border border-stone-200 rounded bg-white hover:bg-stone-50 transition cursor-pointer"
                    >
                      Clear Drawing
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handlePlaceSignature}
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
              >
                Insert Stamp
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
