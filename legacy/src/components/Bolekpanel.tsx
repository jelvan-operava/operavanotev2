import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Bot, 
  BookOpen, 
  Globe, 
  Settings as SettingsIcon, 
  Terminal, 
  Play, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Plus, 
  FileCode2, 
  Search, 
  Send, 
  ArrowRight, 
  Layers, 
  Sliders, 
  Github, 
  Cloud, 
  Mail, 
  Database,
  Cpu,
  Loader2,
  Lock,
  Compass
} from 'lucide-react';

interface BolekpanelProps {
  showAlert: (msg: string) => void;
}

type PanelTab = 'dashboard' | 'projects' | 'aideveloper' | 'knowledgebase' | 'deployments' | 'settings';

export default function Bolekpanel({ showAlert }: BolekpanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<PanelTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // States for Knowledge Base
  const [kbDocs, setKbDocs] = useState([
    { id: 'kb-1', title: 'React Docs (v19)', category: 'Frameworks', url: 'https://react.dev/reference', status: 'Indexed', pages: 142, updated: '2026-07-04' },
    { id: 'kb-2', title: 'Tailwind CSS (v4)', category: 'Styling', url: 'https://tailwindcss.com/docs', status: 'Indexed', pages: 89, updated: '2026-07-03' },
    { id: 'kb-3', title: 'Cloudflare Workers & Pages', category: 'Deployment', url: 'https://developers.cloudflare.com', status: 'Indexed', pages: 210, updated: '2026-07-05' },
    { id: 'kb-4', title: 'AWS SES Integrations', category: 'Emails', url: 'https://docs.aws.amazon.com/ses', status: 'Indexed', pages: 45, updated: '2026-06-20' },
    { id: 'kb-5', title: 'Resend API Guide', category: 'Emails', url: 'https://resend.com/docs', status: 'Indexed', pages: 12, updated: '2026-07-01' }
  ]);
  const [newKbUrl, setNewKbUrl] = useState('');
  const [newKbTitle, setNewKbTitle] = useState('');
  const [newKbCategory, setNewKbCategory] = useState('General');
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);

  // States for AI Developer
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
    plan?: {
      title: string;
      steps: Array<{ id: string; desc: string; type: string; status: 'pending' | 'running' | 'success' | 'failed' }>;
      approved: boolean;
      executed: boolean;
    };
  }>>([
    {
      id: 'm1',
      sender: 'assistant',
      text: 'Hello! I am your Bolekpanel AI Software Engineer. I have read your workspace technology stack and indexed your Knowledge Base. What application should we design, modify, or deploy today?',
      timestamp: '10:35 AM'
    }
  ]);
  
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // States for Deployments & Services
  const [services, setServices] = useState([
    { name: 'GitHub Sync', status: 'Connected', details: 'repo: jelvan/bolek-desk-crm', type: 'git', icon: Github },
    { name: 'Cloudflare Workers', status: 'Active', details: 'Subdomain: bolek-crm.workers.dev', type: 'cloud', icon: Cloud },
    { name: 'AWS SES Email', status: 'Verified', details: 'Identity: mailer@bolekpad.com', type: 'mail', icon: Mail },
    { name: 'Supabase Database', status: 'Online', details: 'PostgreSQL - 4 active nodes', type: 'db', icon: Database }
  ]);

  const [deployments, setDeployments] = useState([
    { id: 'dep-1', commit: 'Update dashboard styling & mobile views', branch: 'main', status: 'Success', duration: '48s', time: '10 mins ago', author: 'AI Developer' },
    { id: 'dep-2', commit: 'Configure Resend API SMTP credentials', branch: 'main', status: 'Success', duration: '52s', time: '1 hour ago', author: 'Jelvan Ricolcol' },
    { id: 'dep-3', commit: 'Initial boilerplate setup with React 19 + Tailwind', branch: 'main', status: 'Success', duration: '1m 15s', time: '1 day ago', author: 'AI Developer' }
  ]);

  // States for Projects
  const [selectedProject, setSelectedProject] = useState('crm-saas');
  const [activeFile, setActiveFile] = useState('server.ts');
  const [fileContent, setFileContent] = useState(`import express from 'express';
import { Resend } from 'resend';
import { Cloudflare } from 'cloudflare';

const app = express();
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// Send CRM Verification Email
app.post('/api/verify-email', async (req, res) => {
  const { email, name, code } = req.body;
  try {
    const { data, error } = await resend.emails.send({
      from: 'Bolek Desk <mailer@bolekpad.com>',
      to: [email],
      subject: 'Verify Your CRM Account',
      html: \`<h1>Welcome \${name}!</h1><p>Your authorization code is: <strong>\${code}</strong></p>\`
    });
    
    if (error) return res.status(400).json({ error });
    res.json({ success: true, messageId: data?.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dispatch verified request' });
  }
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Bolek CRM Engine listening on port 3000');
});`);

  // Settings State
  const [agentsConfig, setAgentsConfig] = useState({
    systemPrompt: 'You are a Senior Full-Stack Cloud Engineer with access to Cloudflare APIs, Resend Webhooks, and GitHub repositories. Generate highly optimized, production-grade code adhering to strict security parameters. Always generate an Execution Plan before making changes.',
    approvalRequired: true,
    autoCommit: true,
    codebaseTheme: 'Aesthetic Slate',
    intelligenceLevel: 'Omni High-Response (Gemini 2.5 Flash equivalent)'
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [buildLogs]);

  // Handle URL indexing simulation
  const handleIndexUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbUrl || !newKbTitle) {
      showAlert('Please enter both Title and URL to index.');
      return;
    }
    setIsIndexing(true);
    setIndexingProgress(0);

    const interval = setInterval(() => {
      setIndexingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setKbDocs((prevDocs) => [
              ...prevDocs,
              {
                id: `kb-${Date.now()}`,
                title: newKbTitle,
                category: newKbCategory,
                url: newKbUrl,
                status: 'Indexed',
                pages: Math.floor(Math.random() * 80) + 10,
                updated: new Date().toISOString().split('T')[0]
              }
            ]);
            setIsIndexing(false);
            setNewKbUrl('');
            setNewKbTitle('');
            showAlert(`Successfully indexed: ${newKbTitle}`);
          }, 300);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Preset prompts for AI Developer
  const handlePresetPrompt = (promptText: string) => {
    setChatInput(promptText);
  };

  // Submit chat prompt
  const handleSendPrompt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');

    // Append user message
    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: userMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    setIsAiTyping(true);

    // Simulate AI response with a delay
    setTimeout(() => {
      setIsAiTyping(false);
      
      // Look for keywords to generate specific responses
      const textLower = userMsg.toLowerCase();
      let responseText = "I understand. I am analyzing the repository structure and checking matching libraries inside our workspace.";
      let planSteps: any[] = [];
      let planTitle = "SaaS CRM Stack Alignment";

      if (textLower.includes('crm') || textLower.includes('saas')) {
        responseText = "I've analyzed your requirements for the SaaS CRM Application. Here is the step-by-step Execution Plan to set up database authentication, integrate AWS SES, configure Cloudflare edge routes, and deploy the dashboard.";
        planTitle = "Build SaaS CRM Stack";
        planSteps = [
          { id: 'step-1', desc: 'Initialize Express full-stack boilerplate with Vite and Node.js', type: 'build', status: 'pending' },
          { id: 'step-2', desc: 'Set up Supabase PostgreSQL tables and secure Row Level Security (RLS) rules', type: 'db', status: 'pending' },
          { id: 'step-3', desc: 'Create AWS SES verified sender flow using Node SDK client proxies', type: 'email', status: 'pending' },
          { id: 'step-4', desc: 'Compile production bundle and deploy to Cloudflare Edge Workers', type: 'deploy', status: 'pending' }
        ];
      } else if (textLower.includes('email') || textLower.includes('verification') || textLower.includes('ses')) {
        responseText = "I have drafted an AWS SES email dispatch mechanism integrated with Resend API fallback parameters. Please review this plan before proceeding.";
        planTitle = "Configure SES & Resend Relay";
        planSteps = [
          { id: 'step-1', desc: 'Verify sender DNS settings for bolekpad.com in AWS console', type: 'dns', status: 'pending' },
          { id: 'step-2', desc: 'Build lazy-initialized Express API route utilizing Resend fallback dispatch', type: 'code', status: 'pending' },
          { id: 'step-3', desc: 'Verify SMTP credentials and execute live transport check', type: 'test', status: 'pending' }
        ];
      } else {
        responseText = `I have received your request to "${userMsg}". Here is a deployment and code change plan based on our active standards.`;
        planTitle = "Refactoring and Code Optimization Plan";
        planSteps = [
          { id: 'step-1', desc: 'Scan codebase files and dependencies list for compatibility', type: 'analyze', status: 'pending' },
          { id: 'step-2', desc: 'Apply targeted surgical refactoring changes to workspace files', type: 'code', status: 'pending' },
          { id: 'step-3', desc: 'Execute validation linter tests and compile production artifact', type: 'build', status: 'pending' }
        ];
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-resp-${Date.now()}`,
          sender: 'assistant',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          plan: {
            title: planTitle,
            steps: planSteps,
            approved: false,
            executed: false
          }
        }
      ]);
    }, 1800);
  };

  // Handle plan approval
  const handleApprovePlan = (messageId: string) => {
    setChatMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId && m.plan) {
          return {
            ...m,
            plan: { ...m.plan, approved: true }
          };
        }
        return m;
      })
    );
    showAlert('Execution plan approved successfully! You can now trigger execution.');
  };

  // Handle plan execution simulation
  const handleExecutePlan = (messageId: string) => {
    const msg = chatMessages.find(m => m.id === messageId);
    if (!msg || !msg.plan) return;

    setIsBuilding(true);
    setBuildLogs(['Initializing Bolekpanel Deployer Engine v1.4.0...', 'Acquiring lock on local codebase workspace...']);
    setActivePlanId(messageId);

    // Sequence through steps
    let currentStepIndex = 0;
    const stepsCount = msg.plan.steps.length;

    const runNextStep = () => {
      if (currentStepIndex >= stepsCount) {
        // Build completed successfully
        setTimeout(() => {
          setBuildLogs(prev => [...prev, '', '✔ Build and Compilation succeeded! Code is fully green.', 'Deploying production bundles to Cloudflare edge nodes...', '✔ Live site deployed: https://bolek-crm.workers.dev', 'GitHub repo synchronized! Commit: fe82ac9 [AI Autocommit]']);
          setIsBuilding(false);
          setActivePlanId(null);
          
          // Add new deployment to the list
          setDeployments(prev => [
            {
              id: `dep-${Date.now()}`,
              commit: msg.plan?.title || 'Triggered workspace refactor',
              branch: 'main',
              status: 'Success',
              duration: '34s',
              time: 'Just now',
              author: 'AI Developer'
            },
            ...prev
          ]);

          // Update message state
          setChatMessages(prev =>
            prev.map(m => {
              if (m.id === messageId && m.plan) {
                return {
                  ...m,
                  plan: {
                    ...m.plan,
                    executed: true,
                    steps: m.plan.steps.map(s => ({ ...s, status: 'success' }))
                  }
                };
              }
              return m;
            })
          );

          // Add simulated bot follow-up
          setChatMessages(prev => [
            ...prev,
            {
              id: `msg-success-${Date.now()}`,
              sender: 'assistant',
              text: `🚀 Success! The execution plan "${msg.plan?.title}" has been successfully completed and deployed to production. Build is verified, code compiles without warnings, and GitHub has been updated.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);

          showAlert('SaaS Stack Deployed successfully!');
        }, 1200);
        return;
      }

      const step = msg.plan?.steps[currentStepIndex];
      if (!step) return;

      // Mark step running
      setChatMessages(prev =>
        prev.map(m => {
          if (m.id === messageId && m.plan) {
            return {
              ...m,
              plan: {
                ...m.plan,
                steps: m.plan.steps.map(s => s.id === step.id ? { ...s, status: 'running' as const } : s)
              }
            };
          }
          return m;
        })
      );

      setBuildLogs(prev => [
        ...prev,
        `[Step ${currentStepIndex + 1}/${stepsCount}] Running: ${step.desc}...`,
        `[DEBUG] Fetching referenced RAG contexts matching standard instructions...`
      ]);

      // Add detailed build messages
      setTimeout(() => {
        if (step.type === 'build') {
          setBuildLogs(prev => [...prev, '  > vite v6.2.3 compiling assets', '  > tailwindcss v4.1.14 bundling styles', '  > esbuild compiling backend controller to dist/server.cjs']);
        } else if (step.type === 'db') {
          setBuildLogs(prev => [...prev, '  > connection pool established to Supabase node', '  > running migrations: /src/db/migrations/0023_crm_users.sql', '  > verified tables indexes and constraints successfully']);
        } else if (step.type === 'email' || step.type === 'dns') {
          setBuildLogs(prev => [...prev, '  > verifying DKIM record alignment on bolekpad.com DNS', '  > testing connection to AWS SES transporter', '  > generated fallback email payload configuration']);
        } else if (step.type === 'deploy') {
          setBuildLogs(prev => [...prev, '  > packaging Cloudflare Worker script bundles', '  > pushing to workers API endpoint', '  > warm routing tables refreshed on all globally distributed POP nodes']);
        } else {
          setBuildLogs(prev => [...prev, '  > parsing AST syntax mapping nodes', '  > applying non-breaking surgical file updates', '  > running lint check: tsc --noEmit (Success)']);
        }

        // Mark step success
        setChatMessages(prev =>
          prev.map(m => {
            if (m.id === messageId && m.plan) {
              return {
                ...m,
                plan: {
                  ...m.plan,
                  steps: m.plan.steps.map(s => s.id === step.id ? { ...s, status: 'success' as const } : s)
                }
              };
            }
            return m;
          })
        );

        setBuildLogs(prev => [...prev, `✔ Step ${currentStepIndex + 1} completed!`, '']);
        currentStepIndex++;
        runNextStep();

      }, 1500);
    };

    runNextStep();
  };

  const activePlanMsg = chatMessages.find(m => m.id === activePlanId);

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#fafafa] border border-stone-200 rounded-lg overflow-hidden relative font-sans">
      
      {/* Mobile Top Navbar for Bolekpanel */}
      <div className="flex md:hidden items-center justify-between p-4 bg-white border-b border-stone-200 w-full shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-stone-900 text-white">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-semibold text-xs tracking-tight text-stone-900">Bolekpanel</span>
          <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase">AI Dev Platform</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1 border border-stone-200 rounded-md text-stone-700 hover:bg-stone-50"
        >
          <span className="material-symbols-outlined !text-xl">menu</span>
        </button>
      </div>

      {/* LEFT NAVIGATION SIDEBAR */}
      <div className={`
        ${isMobileMenuOpen ? 'flex absolute inset-0 z-40' : 'hidden md:flex'} 
        w-full md:w-64 bg-white border-r border-stone-200 flex-col shrink-0 select-none
      `}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-stone-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-stone-950 text-white flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-stone-900 tracking-tight">Bolekpanel</h2>
              <p className="text-[10px] font-medium text-stone-400">AI Platform v1.4.0</p>
            </div>
          </div>
          {isMobileMenuOpen && (
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 hover:bg-stone-100 rounded-lg text-stone-500"
            >
              <span className="material-symbols-outlined !text-xl">close</span>
            </button>
          )}
        </div>

        {/* Sidebar Tabs */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & system health' },
            { id: 'aideveloper', label: 'AI Developer', icon: Bot, desc: 'Interactive software agent', highlight: true },
            { id: 'projects', label: 'Projects & Code', icon: FolderGit2, desc: 'Explore repository files' },
            { id: 'knowledgebase', label: 'Knowledge Base', icon: BookOpen, desc: 'Index platform docs' },
            { id: 'deployments', label: 'Deployments', icon: Globe, desc: 'Monitor cloud integrations' },
            { id: 'settings', label: 'Engine Settings', icon: SettingsIcon, desc: 'AI instructions & rules' }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSubTab(item.id as PanelTab);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all text-left group ${
                  isActive 
                    ? 'bg-stone-950 text-white shadow-sm' 
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-600'}`} />
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold tracking-tight">{item.label}</span>
                    {item.highlight && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                    )}
                  </div>
                  <p className={`text-[10px] leading-tight truncate ${isActive ? 'text-stone-300' : 'text-stone-400'}`}>{item.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-stone-200/60 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Dev Environment Active</span>
          </div>
          <span className="text-[10px] font-mono text-stone-400 font-semibold">PORT: 3000</span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden bg-stone-50/50">
        
        {/* SUBTAB 1: DASHBOARD OVERVIEW */}
        {activeSubTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-base font-bold text-stone-900 tracking-tight">AI-Native Workspace</h1>
                <p className="text-xs text-stone-500">Autonomous development, continuous RAG-indexing, and deployment cockpit.</p>
              </div>
              <div className="flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-xl border border-stone-200/60 shadow-sm self-start">
                <Cpu className="h-4 w-4 text-stone-500" />
                <div className="text-left">
                  <p className="text-[10px] font-bold text-stone-400 uppercase leading-none tracking-wider">ACTIVE ENGINE</p>
                  <p className="text-xs font-semibold text-stone-800 leading-tight">Gemini 2.5 Flash Platform</p>
                </div>
              </div>
            </div>

            {/* Stats Metrics row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Indexed Pages', value: '498', icon: BookOpen, change: '+24 new today', color: 'text-blue-600 bg-blue-50 border-blue-100' },
                { label: 'Active Services', value: '4 / 4', icon: Globe, change: '100% cloud uptime', color: 'text-emerald-600 bg-emerald-50 border-emerald-200/50' },
                { label: 'Production Deploys', value: '41', icon: Layers, change: 'Last deploy 10m ago', color: 'text-orange-600 bg-orange-50 border-orange-100' },
                { label: 'Autocommits Pushed', value: '184', icon: FolderGit2, change: 'repo: main branch', color: 'text-purple-600 bg-purple-50 border-purple-100' }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-stone-500">{stat.label}</span>
                      <span className={`p-1.5 rounded-lg border flex items-center justify-center ${stat.color}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-stone-900 tracking-tight">{stat.value}</h2>
                      <p className="text-[10px] text-stone-400 font-semibold mt-1">{stat.change}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Architecture diagram & Connected Integrations */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Architecture Map visualizer */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm lg:col-span-7 flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-stone-500" />
                    <span className="font-semibold text-xs text-stone-900">Bolekpanel Stack Architecture</span>
                  </div>
                  <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-bold">RAG Enabled</span>
                </div>

                <div className="flex-1 flex flex-col justify-center py-4 relative">
                  {/* Central Node */}
                  <div className="flex justify-center mb-6 z-10">
                    <div className="bg-stone-950 text-white px-4 py-2.5 rounded-xl border border-stone-800 shadow-md text-center max-w-xs flex items-center gap-2.5">
                      <Bot className="h-4 w-4 text-orange-400 animate-pulse" />
                      <div>
                        <p className="text-xs font-bold leading-none">Bolek AI Agent Core</p>
                        <p className="text-[9px] text-stone-400 mt-1">Autonomous AST Engine</p>
                      </div>
                    </div>
                  </div>

                  {/* Lines between nodes container */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <svg className="w-full h-full" viewBox="0 0 400 200" fill="none" stroke="currentColor">
                      <path d="M 200,30 L 70,120" strokeWidth="1.5" strokeDasharray="3,3" />
                      <path d="M 200,30 L 200,120" strokeWidth="1.5" strokeDasharray="3,3" />
                      <path d="M 200,30 L 330,120" strokeWidth="1.5" strokeDasharray="3,3" />
                    </svg>
                  </div>

                  {/* Leaf Nodes */}
                  <div className="grid grid-cols-3 gap-2.5 z-10 text-center">
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <BookOpen className="h-4 w-4 text-stone-500 mx-auto mb-1.5" />
                      <p className="text-[10px] font-bold text-stone-700">Knowledge Base</p>
                      <p className="text-[9px] text-stone-400">RAG Context Vector</p>
                    </div>
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <FileCode2 className="h-4 w-4 text-stone-500 mx-auto mb-1.5" />
                      <p className="text-[10px] font-bold text-stone-700">Project Files</p>
                      <p className="text-[9px] text-stone-400">GitHub AST Sync</p>
                    </div>
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <Globe className="h-4 w-4 text-stone-500 mx-auto mb-1.5" />
                      <p className="text-[10px] font-bold text-stone-700">Cloud Deploy</p>
                      <p className="text-[9px] text-stone-400">Cloudflare & SMTP</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connected Services */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm lg:col-span-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-xs text-stone-900 mb-1">Integrations & Credentials</h3>
                  <p className="text-[11px] text-stone-500 mb-4">Core technology services connected to this development terminal.</p>
                </div>

                <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                  {services.map((srv, i) => {
                    const Icon = srv.icon;
                    return (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/50">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-stone-800">{srv.name}</p>
                            <p className="text-[10px] text-stone-400 truncate max-w-[150px] font-medium">{srv.details}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {srv.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Quick Action Box */}
            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <span className="p-2 bg-stone-800 rounded-xl text-orange-400 border border-stone-700/80 flex items-center justify-center">
                  <Bot className="h-5 w-5 animate-pulse" />
                </span>
                <div>
                  <h4 className="text-xs font-bold">Trigger Autonomous AI Software Engineer</h4>
                  <p className="text-[10px] text-stone-400 font-medium">Click to boot the developer assistant and build your custom CRM SaaS flow immediately.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveSubTab('aideveloper')}
                className="bg-white text-stone-950 hover:bg-stone-100 text-xs font-bold px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                Launch Developer Console <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* SUBTAB 2: AI DEVELOPER CONSOLE */}
        {activeSubTab === 'aideveloper' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* Chat Conversation side */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-stone-200">
              
              {/* Chat Header */}
              <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-950 text-white rounded-xl">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-stone-900">Bolek Agent Console</h2>
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Fully ground in your Knowledge Base
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setChatMessages([{
                      id: 'm1',
                      sender: 'assistant',
                      text: 'Hello! I am your Bolekpanel AI Software Engineer. I have read your workspace technology stack and indexed your Knowledge Base. What application should we design, modify, or deploy today?',
                      timestamp: '10:35 AM'
                    }]);
                    setActivePlanId(null);
                  }}
                  className="p-1.5 hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-500 transition"
                  title="Clear Chat Logs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Chat Message Window */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => {
                  const isBot = msg.sender === 'assistant';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 max-w-xl ${isBot ? 'mr-auto text-left' : 'ml-auto flex-row-reverse text-right'}`}
                    >
                      {/* Avatar */}
                      <span className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] border ${
                        isBot ? 'bg-stone-950 border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-700 font-bold'
                      }`}>
                        {isBot ? 'AI' : 'JR'}
                      </span>

                      {/* Msg Body */}
                      <div className="space-y-2">
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                          isBot 
                            ? 'bg-stone-50 border-stone-100 text-stone-800' 
                            : 'bg-stone-900 border-stone-800 text-white'
                        }`}>
                          {msg.text}
                        </div>

                        {/* Interactive Execution Plan Box if present */}
                        {isBot && msg.plan && (
                          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-left max-w-md mt-2 space-y-3">
                            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                              <div className="flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-orange-500" />
                                <span className="font-bold text-xs text-stone-900">{msg.plan.title}</span>
                              </div>
                              <span className="text-[9px] font-bold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-100 uppercase tracking-wide">
                                EXECUTION PLAN
                              </span>
                            </div>

                            {/* Plan Steps list */}
                            <div className="space-y-2">
                              {msg.plan.steps.map((step, idx) => (
                                <div key={step.id} className="flex items-start justify-between gap-3 text-xs">
                                  <div className="flex gap-2 text-stone-600">
                                    <span className="font-mono text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.2 rounded mt-0.5 font-bold">{idx + 1}</span>
                                    <span className="leading-tight text-[11px] font-medium text-stone-700">{step.desc}</span>
                                  </div>

                                  <div className="shrink-0 pt-0.5">
                                    {step.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                    {step.status === 'running' && <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />}
                                    {step.status === 'pending' && <div className="w-4 h-4 rounded-full border border-stone-300" />}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Approval/Execute Controller Row */}
                            <div className="pt-2 border-t border-stone-100 flex items-center justify-end gap-2">
                              {!msg.plan.approved ? (
                                <button
                                  type="button"
                                  onClick={() => handleApprovePlan(msg.id)}
                                  className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-white" /> Approve Execution Plan
                                </button>
                              ) : !msg.plan.executed ? (
                                <button
                                  type="button"
                                  disabled={isBuilding}
                                  onClick={() => handleExecutePlan(msg.id)}
                                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                >
                                  {isBuilding ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deploying...
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3.5 w-3.5 fill-white text-white" /> Trigger Live Build & Deploy
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                  <CheckCircle2 className="h-3 w-3" /> Fully Deployed
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <span className="text-[9px] font-semibold text-stone-400 block px-1">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* AI Typing loading block */}
                {isAiTyping && (
                  <div className="flex gap-3 max-w-xl mr-auto text-left">
                    <span className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-stone-950 border border-stone-800 text-white text-[10px]">
                      AI
                    </span>
                    <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 text-stone-500 text-xs flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />
                      <span>Agent is indexing database and verifying SES credentials...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Console Box */}
              <form onSubmit={handleSendPrompt} className="p-4 border-t border-stone-200 bg-stone-50/50 space-y-2 shrink-0">
                
                {/* Preset Suggestions Row */}
                {chatMessages.length === 1 && (
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {[
                      { text: 'Build a SaaS CRM application with verified AWS SES authentication and database storage', short: 'Build CRM Stack' },
                      { text: 'Set up custom Cloudflare worker scripts to intercept SMTP emails', short: 'Add Cloudflare SMTP' },
                      { text: 'Configure local system files validation linter checks', short: 'Verify local linter' }
                    ].map((ps, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handlePresetPrompt(ps.text)}
                        className="bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 text-[10px] font-semibold px-2.5 py-1 rounded-full transition"
                      >
                        {ps.short}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={isBuilding ? "Deploy in progress, console locked..." : "Ask the AI developer to write, modify, or deploy code..."}
                    disabled={isBuilding}
                    className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-400 disabled:opacity-60"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={isBuilding || !chatInput.trim()}
                    className="bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white font-bold text-xs p-2.5 rounded-xl transition flex items-center justify-center shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>

            </div>

            {/* Build Deploy Logger Terminal side */}
            <div className="w-full md:w-80 bg-stone-950 text-stone-200 flex flex-col shrink-0 overflow-hidden relative">
              <div className="p-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between select-none">
                <div className="flex items-center gap-2 text-stone-400">
                  <Terminal className="h-3.5 w-3.5" />
                  <span className="font-mono text-[10px] font-bold tracking-wider uppercase">Live Build Logs</span>
                </div>
                {isBuilding ? (
                  <span className="text-[9px] font-mono font-bold bg-orange-950 text-orange-400 px-2 py-0.5 rounded border border-orange-900/50 animate-pulse">
                    BUILDING
                  </span>
                ) : (
                  <span className="text-[9px] font-mono font-bold bg-stone-800 text-stone-400 px-2 py-0.5 rounded border border-stone-700">
                    IDLE
                  </span>
                )}
              </div>

              {/* Logs Window */}
              <div className="flex-1 p-4 font-mono text-[10px] leading-relaxed overflow-y-auto space-y-1">
                {buildLogs.length === 0 ? (
                  <p className="text-stone-500 italic">No deployments active. Start an execution plan to monitor deployment output live.</p>
                ) : (
                  buildLogs.map((log, idx) => (
                    <div key={idx} className={
                      log.startsWith('✔') ? 'text-emerald-400 font-semibold' :
                      log.startsWith('[Step') ? 'text-orange-400 font-semibold mt-2' :
                      log.startsWith('[DEBUG]') ? 'text-stone-500 font-medium' : 'text-stone-300'
                    }>
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>

              {/* Terminal footer overlay */}
              {activePlanMsg && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between select-none backdrop-blur-xs">
                  <span className="text-[10px] text-stone-400 font-mono">Plan: <strong className="text-stone-200">{activePlanMsg.plan?.title}</strong></span>
                  <span className="text-[10px] font-bold font-mono text-orange-400 animate-pulse">Waiting Approval</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* SUBTAB 3: PROJECTS FILE EXPLORER */}
        {activeSubTab === 'projects' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* File navigator drawer column */}
            <div className="w-full md:w-56 bg-white border-r border-stone-200 flex flex-col shrink-0 select-none">
              <div className="p-4 border-b border-stone-200 bg-stone-50/50">
                <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">ACTIVE PROJECT</label>
                <select 
                  className="w-full bg-white border border-stone-200 rounded-lg p-1.5 text-xs font-semibold text-stone-800 outline-none focus:border-stone-400"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="crm-saas">bolek-desk-crm</option>
                  <option value="bolek-pad">bolek-desk-app</option>
                </select>
              </div>

              {/* Mock File list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {[
                  { name: 'server.ts', path: 'server.ts', icon: FileCode2 },
                  { name: 'package.json', path: 'package.json', icon: FileCode2 },
                  { name: 'schema.ts', path: 'src/db/schema.ts', icon: FileCode2 },
                  { name: 'App.tsx', path: 'src/App.tsx', icon: FileCode2 },
                  { name: 'index.css', path: 'src/index.css', icon: FileCode2 }
                ].map((file) => {
                  const Icon = file.icon;
                  const isActive = activeFile === file.name;
                  return (
                    <button
                      key={file.name}
                      onClick={() => {
                        setActiveFile(file.name);
                        if (file.name === 'server.ts') {
                          setFileContent(`import express from 'express';
import { Resend } from 'resend';
import { Cloudflare } from 'cloudflare';

const app = express();
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// Send CRM Verification Email
app.post('/api/verify-email', async (req, res) => {
  const { email, name, code } = req.body;
  try {
    const { data, error } = await resend.emails.send({
      from: 'Bolek Desk <mailer@bolekpad.com>',
      to: [email],
      subject: 'Verify Your CRM Account',
      html: \`<h1>Welcome \${name}!</h1><p>Your authorization code is: <strong>\${code}</strong></p>\`
    });
    
    if (error) return res.status(400).json({ error });
    res.json({ success: true, messageId: data?.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dispatch verified request' });
  }
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Bolek CRM Engine listening on port 3000');
});`);
                        } else if (file.name === 'package.json') {
                          setFileContent(`{
  "name": "bolek-desk-crm",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node"
  },
  "dependencies": {
    "express": "^4.21.2",
    "resend": "^3.0.0",
    "cloudflare": "^2.1.0"
  }
}`);
                        } else {
                          setFileContent(`// Workspace file preview: ${file.path}\n// Grounded in RAG Knowledge Base. Checked and verified code compiler clean.`);
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition ${
                        isActive 
                          ? 'bg-stone-100 text-stone-900' 
                          : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-stone-800' : 'text-stone-400'}`} />
                      <span className="truncate">{file.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Editor Window */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
              <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between select-none text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-stone-500 !text-sm">code</span>
                  <span className="font-mono text-[11px] text-stone-600 font-semibold">{selectedProject}/{activeFile}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    AI Editable Workspace
                  </span>
                  <button 
                    onClick={() => showAlert("Bolekpanel allows you to submit custom prompts in the 'AI Developer' console to automatically refactor and write into these codebase files.")}
                    className="p-1 hover:bg-stone-200 border border-stone-200 bg-white rounded-md text-stone-500 transition"
                    title="Code Assistance"
                  >
                    <Bot className="h-3.5 w-3.5 text-stone-600" />
                  </button>
                </div>
              </div>

              {/* Interactive Editor Panel container */}
              <div className="flex-1 overflow-auto p-4 bg-stone-50/30">
                <textarea 
                  className="w-full h-full bg-white border border-stone-200 rounded-xl p-4 font-mono text-[11px] text-stone-800 outline-none leading-relaxed resize-none focus:border-stone-400"
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  spellCheck="false"
                />
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB 4: KNOWLEDGE BASE INDEXER */}
        {activeSubTab === 'knowledgebase' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-base font-bold text-stone-900 tracking-tight">RAG Knowledge Base</h1>
                <p className="text-xs text-stone-500">Add external documentation URLs, SDK API parameters, and styling rules to keep the AI software developer accurate.</p>
              </div>
            </div>

            {/* Indexing status box */}
            {isIndexing && (
              <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-800 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                    Indexing URL context: <strong className="text-stone-950 font-bold">{newKbUrl}</strong>
                  </span>
                  <span className="font-mono text-[10px] font-bold text-stone-500">{indexingProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-150" style={{ width: `${indexingProgress}%` }} />
                </div>
              </div>
            )}

            {/* Quick URL Adder Form */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm space-y-4">
              <div>
                <h3 className="font-semibold text-xs text-stone-900">Index New Documentation URL</h3>
                <p className="text-[11px] text-stone-500">Provide official platform endpoints or guides to ingest context vectors.</p>
              </div>

              <form onSubmit={handleIndexUrl} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-4">
                  <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Document Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Next.js App Router API"
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white focus:border-stone-400"
                    value={newKbTitle}
                    onChange={(e) => setNewKbTitle(e.target.value)}
                  />
                </div>
                <div className="md:col-span-5">
                  <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Documentation URL (https)</label>
                  <input 
                    type="url" 
                    placeholder="https://nextjs.org/docs"
                    required
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white focus:border-stone-400"
                    value={newKbUrl}
                    onChange={(e) => setNewKbUrl(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Category</label>
                  <select 
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:bg-white focus:border-stone-400"
                    value={newKbCategory}
                    onChange={(e) => setNewKbCategory(e.target.value)}
                  >
                    <option value="General">General</option>
                    <option value="Frameworks">Frameworks</option>
                    <option value="Styling">Styling</option>
                    <option value="Emails">Emails</option>
                    <option value="Deployment">Deployment</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <button 
                    type="submit"
                    disabled={isIndexing}
                    className="w-full bg-stone-950 text-white font-bold hover:bg-stone-800 disabled:opacity-40 rounded-lg py-1.5 text-xs transition cursor-pointer flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* List of indexed materials */}
            <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
              <div className="p-4 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between">
                <span className="font-semibold text-xs text-stone-900">Ingested Documentation Indices</span>
                <span className="text-[10px] font-mono font-bold text-stone-500">{kbDocs.length} Total Sources</span>
              </div>

              <div className="divide-y divide-stone-100 overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-stone-50/30 text-stone-400 text-[9px] font-bold uppercase tracking-widest">
                      <th className="py-2.5 px-4">Documentation Title</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">URL Reference</th>
                      <th className="py-2.5 px-4 text-center">Parsed Pages</th>
                      <th className="py-2.5 px-4">Last Sync</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {kbDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-stone-50/50 transition">
                        <td className="py-3 px-4 font-semibold text-stone-900">{doc.title}</td>
                        <td className="py-3 px-4 text-[11px] text-stone-500">{doc.category}</td>
                        <td className="py-3 px-4 text-[10px] text-stone-400 truncate max-w-[150px] font-mono">{doc.url}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-stone-600">{doc.pages}</td>
                        <td className="py-3 px-4 text-[11px] text-stone-500">{doc.updated}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB 5: DEPLOYMENTS & SERVICES */}
        {activeSubTab === 'deployments' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-base font-bold text-stone-900 tracking-tight">Deployments Cockpit</h1>
                <p className="text-xs text-stone-500">Monitor live deployments, check commit logs, and supervise server integrations.</p>
              </div>
            </div>

            {/* List of Deployments */}
            <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
              <div className="p-4 bg-stone-50/50 border-b border-stone-200 flex items-center justify-between">
                <span className="font-semibold text-xs text-stone-900">Production Build Deploy Logs</span>
                <span className="text-[10px] font-mono font-bold text-stone-500">{deployments.length} Builds Active</span>
              </div>

              <div className="divide-y divide-stone-100">
                {deployments.map((dep) => (
                  <div key={dep.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 transition">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-stone-900 truncate">{dep.commit}</span>
                        <span className="inline-flex items-center text-[9px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200/40">
                          {dep.branch}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-stone-400 font-semibold font-mono">
                        <span className="flex items-center gap-1 text-stone-500"><Github className="h-3 w-3 text-stone-400" /> {dep.author}</span>
                        <span>•</span>
                        <span>Build duration: {dep.duration}</span>
                        <span>•</span>
                        <span>{dep.time}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {dep.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 6: SYSTEM ENGINE CONFIG */}
        {activeSubTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-base font-bold text-stone-900 tracking-tight">AI Developer Config</h1>
                <p className="text-xs text-stone-500">Tune AI parameters, edit the system instructions rules, and manage safety lock controls.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Settings Form column */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm lg:col-span-8 space-y-5">
                <div>
                  <h3 className="font-semibold text-xs text-stone-900">Platform Autopilot Guidelines</h3>
                  <p className="text-[11px] text-stone-500">These prompts are automatically injected into each session to enforce system conventions.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">System Prompt & Context</label>
                    <textarea 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 font-mono text-[11px] text-stone-800 outline-none leading-relaxed resize-none h-32 focus:bg-white focus:border-stone-400"
                      value={agentsConfig.systemPrompt}
                      onChange={(e) => setAgentsConfig({...agentsConfig, systemPrompt: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Active Intelligence Node</label>
                      <select 
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs font-semibold text-stone-800 outline-none focus:bg-white focus:border-stone-400"
                        value={agentsConfig.intelligenceLevel}
                        onChange={(e) => setAgentsConfig({...agentsConfig, intelligenceLevel: e.target.value})}
                      >
                        <option value="Omni High-Response (Gemini 2.5 Flash equivalent)">Gemini 2.5 Flash (Default)</option>
                        <option value="Omni Ultra Reasoning (Gemini 2.5 Pro equivalent)">Gemini 2.5 Pro (Deep Research)</option>
                        <option value="Omni Lite (Instant Feedback)">Gemini 2.5 Flash-lite</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">Workspace Code Theme</label>
                      <select 
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-xs font-semibold text-stone-800 outline-none focus:bg-white focus:border-stone-400"
                        value={agentsConfig.codebaseTheme}
                        onChange={(e) => setAgentsConfig({...agentsConfig, codebaseTheme: e.target.value})}
                      >
                        <option value="Aesthetic Slate">Aesthetic Slate (Clean Off-White)</option>
                        <option value="Cosmic Obsidian">Cosmic Obsidian (Pitch Dark)</option>
                        <option value="Retro Amber Terminal">Retro Amber Terminal</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => showAlert("Autopilot guidelines saved successfully!")}
                    className="bg-stone-950 text-white font-bold hover:bg-stone-800 text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Save Autopilot Config
                  </button>
                </div>
              </div>

              {/* Safety locks sidebar column */}
              <div className="space-y-4 lg:col-span-4">
                
                {/* Approval checklist locks */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-stone-500" />
                    <span className="font-semibold text-xs text-stone-900">Safety & Security Locks</span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-stone-800">Require Plan Approval</p>
                        <p className="text-[10px] text-stone-400">Ask user before compiling code</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setAgentsConfig({...agentsConfig, approvalRequired: !agentsConfig.approvalRequired})}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${agentsConfig.approvalRequired ? 'bg-orange-600' : 'bg-stone-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${agentsConfig.approvalRequired ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-stone-800">Auto GitHub Commit</p>
                        <p className="text-[10px] text-stone-400">Auto push files after execution</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setAgentsConfig({...agentsConfig, autoCommit: !agentsConfig.autoCommit})}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${agentsConfig.autoCommit ? 'bg-orange-600' : 'bg-stone-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${agentsConfig.autoCommit ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-orange-50 border border-orange-200/60 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-orange-800 font-bold text-xs">
                    <span className="material-symbols-outlined !text-sm">verified</span>
                    <span>Autopilot Active</span>
                  </div>
                  <p className="text-[11px] text-orange-700 leading-relaxed font-medium">
                    All generated codebase updates and API routing requests adhere strictly to indexed documentation and best-practices.
                  </p>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
