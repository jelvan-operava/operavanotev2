import React, { useState, useEffect } from 'react';
import { StickyMessage, StickyAttachment, UserAccount } from '../types';

interface BolekStickySendProps {
  currentUserEmail: string;
  currentUserName: string;
  usersList: UserAccount[];
  onImportToBoard?: (note: { title?: string; content: string; color: string }) => void;
  showToast: (msg: string) => void;
}

const STICKY_COLORS = [
  { name: 'Yellow', bg: 'bg-amber-100 border-amber-300 text-stone-900', raw: '#fef08a' },
  { name: 'Mint Green', bg: 'bg-emerald-100 border-emerald-300 text-stone-900', raw: '#a7f3d0' },
  { name: 'Rose Pink', bg: 'bg-rose-100 border-rose-300 text-stone-900', raw: '#fecdd3' },
  { name: 'Sky Blue', bg: 'bg-sky-100 border-sky-300 text-stone-900', raw: '#bae6fd' },
  { name: 'Lavender', bg: 'bg-purple-100 border-purple-300 text-stone-900', raw: '#e9d5ff' },
  { name: 'Orange', bg: 'bg-orange-100 border-orange-300 text-stone-900', raw: '#fed7aa' },
];

export const BolekStickySend: React.FC<BolekStickySendProps> = ({
  currentUserEmail,
  currentUserName,
  usersList,
  onImportToBoard,
  showToast,
}) => {
  // Local storage sticky messages
  const [messages, setMessages] = useState<StickyMessage[]>(() => {
    const saved = localStorage.getItem('bolek_sticky_messages');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'stk_1',
        senderEmail: 'jshjfhs@bolek.io',
        senderName: 'Jshjfhs Admin',
        senderUsername: 'jshjfhs',
        recipientEmail: currentUserEmail,
        recipientName: currentUserName,
        recipientUsername: currentUserEmail.split('@')[0],
        title: 'Project Roadmap Notes',
        content: 'Hey! Here are the updated API keys and roadmap sticky notes for our next release. Please check the attached document.',
        color: '#fef08a',
        pinned: true,
        isUnread: true,
        imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80',
        attachments: [
          { id: 'att-1', name: 'Roadmap_Specs_v2.pdf', size: '1.2 MB', type: 'application/pdf', url: '#' },
          { id: 'att-2', name: 'architecture_diagram.png', size: '850 KB', type: 'image/png', url: '#' }
        ],
        createdAt: '2026-08-10 18:30',
        tags: ['Roadmap', 'Important'],
      },
      {
        id: 'stk_2',
        senderEmail: 'alex_dev@bolek.io',
        senderName: 'Alex Rivers',
        senderUsername: 'alex_dev',
        recipientEmail: currentUserEmail,
        recipientName: currentUserName,
        recipientUsername: currentUserEmail.split('@')[0],
        title: 'Server Credentials & Config',
        content: 'Remember to verify the PayPal Sandbox LLM endpoint before setting up live production environment.',
        color: '#a7f3d0',
        pinned: false,
        isUnread: true,
        createdAt: '2026-08-10 16:15',
        tags: ['PayPal', 'Backend'],
      },
      {
        id: 'stk_3',
        senderEmail: currentUserEmail,
        senderName: currentUserName,
        senderUsername: currentUserEmail.split('@')[0],
        recipientEmail: 'user@bolekpad.com',
        recipientName: 'Regular User Demo',
        recipientUsername: 'user_demo',
        title: 'Welcome to Bolek Workspace',
        content: 'Welcome! You can create, organize, and send sticky notes in real time across the team.',
        color: '#bae6fd',
        pinned: true,
        isUnread: false,
        createdAt: '2026-08-10 14:00',
        tags: ['Welcome'],
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('bolek_sticky_messages', JSON.stringify(messages));
  }, [messages]);

  // Panel layout width ratio (percentage of Left / Inbox Panel)
  const [leftPanelRatio, setLeftPanelRatio] = useState<number>(50); // 50% default split
  const [filterInbox, setFilterInbox] = useState<'all' | 'unread' | 'pinned'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Compose Modal & New Sticky State
  const [showComposer, setShowComposer] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(usersList[0]?.email || 'user@bolekpad.com');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState('#fef08a');
  const [isPinned, setIsPinned] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [attachments, setAttachments] = useState<StickyAttachment[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Filter messages
  const myInbox = messages.filter(m => m.recipientEmail.toLowerCase() === currentUserEmail.toLowerCase());
  const mySent = messages.filter(m => m.senderEmail.toLowerCase() === currentUserEmail.toLowerCase());

  const filteredInbox = myInbox.filter(m => {
    if (filterInbox === 'unread' && !m.isUnread) return false;
    if (filterInbox === 'pinned' && !m.pinned) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        m.title?.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        m.senderUsername.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredSent = mySent.filter(m => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        m.title?.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        m.recipientUsername.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Toggle Read/Unread Cover
  const toggleUnreadCover = (id: string) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, isUnread: !m.isUnread } : m)
    );
  };

  // Toggle Pinned
  const togglePinned = (id: string) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, pinned: !m.pinned } : m)
    );
  };

  // Delete Sticky
  const deleteSticky = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    showToast('Sticky note deleted');
  };

  // Handle Add File Attachment
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const newAtt: StickyAttachment = {
      id: `att_${Date.now()}`,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: file.type || 'document',
      url: URL.createObjectURL(file),
    };

    setAttachments(prev => [...prev, newAtt]);
    showToast(`Attached file: ${file.name}`);
  };

  // Handle Add Tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  // Send Sticky Note Handler
  const handleSendSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const recipientObj = usersList.find(u => u.email === recipientEmail);
    const recName = recipientObj ? recipientObj.name : recipientEmail;
    const recUser = recipientObj ? recipientObj.email.split('@')[0] : recipientEmail.split('@')[0];

    const newSticky: StickyMessage = {
      id: `stk_${Date.now()}`,
      senderEmail: currentUserEmail,
      senderName: currentUserName,
      senderUsername: currentUserEmail.split('@')[0],
      recipientEmail: recipientEmail,
      recipientName: recName,
      recipientUsername: recUser,
      title: title.trim() || undefined,
      content: content.trim(),
      color: selectedColor,
      pinned: isPinned,
      isUnread: true,
      imageUrl: imageUrl.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      tags: tags.length > 0 ? tags : undefined,
    };

    setMessages([newSticky, ...messages]);
    setShowComposer(false);

    // Reset Form
    setTitle('');
    setContent('');
    setImageUrl('');
    setAttachments([]);
    setTags([]);
    showToast(`Sticky note sent to @${recUser}!`);
  };

  return (
    <div className="w-full h-full flex flex-col bg-stone-100 overflow-hidden text-stone-800">
      
      {/* Header Toolbar */}
      <div className="bg-stone-900 text-white p-4 shrink-0 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined !text-xl">send_and_archive</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-white">StickySend Workspace</h2>
              <span className="bg-amber-500 text-stone-950 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">
                LIVE INTER-USER MESSAGING
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Send sticky notes, attached files & photos directly to team members with unread pin covers
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-stone-400 !text-base">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stickies..."
              className="bg-stone-800 border border-stone-700 text-white pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 w-44 md:w-56"
            />
          </div>

          {/* Panel Layout Presets */}
          <div className="hidden sm:flex bg-stone-800 p-1 rounded-xl border border-stone-700 text-xs">
            <button
              onClick={() => setLeftPanelRatio(35)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${leftPanelRatio === 35 ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'}`}
              title="Compact Inbox, Wide Sent"
            >
              30/70
            </button>
            <button
              onClick={() => setLeftPanelRatio(50)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${leftPanelRatio === 50 ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'}`}
              title="Equal Split Panels"
            >
              50/50
            </button>
            <button
              onClick={() => setLeftPanelRatio(65)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${leftPanelRatio === 65 ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'}`}
              title="Wide Inbox, Compact Sent"
            >
              70/30
            </button>
          </div>

          {/* Compose Sticky Button */}
          <button
            onClick={() => setShowComposer(true)}
            className="px-4 py-2 text-xs font-bold text-stone-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined !text-base">add_comment</span>
            <span>Send New Sticky</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Panel Viewport */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* ================= LEFT PANEL: BOLEK INBOX ================= */}
        <div 
          style={{ width: `${leftPanelRatio}%` }}
          className="w-full md:w-auto h-full flex flex-col border-r border-stone-200 bg-stone-50 overflow-hidden shrink-0 transition-all duration-200"
        >
          {/* Inbox Header */}
          <div className="bg-white p-3.5 border-b border-stone-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 !text-xl">move_to_inbox</span>
              <h3 className="font-bold text-stone-900 text-sm">BolekInbox</h3>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {myInbox.filter(m => m.isUnread).length} Unread
              </span>
            </div>

            {/* Inbox Filter Chips */}
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <button
                onClick={() => setFilterInbox('all')}
                className={`px-2.5 py-1 rounded-lg transition ${filterInbox === 'all' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-200'}`}
              >
                All ({myInbox.length})
              </button>
              <button
                onClick={() => setFilterInbox('unread')}
                className={`px-2.5 py-1 rounded-lg transition ${filterInbox === 'unread' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-500 hover:bg-stone-200'}`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilterInbox('pinned')}
                className={`px-2.5 py-1 rounded-lg transition ${filterInbox === 'pinned' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-200'}`}
              >
                Pinned
              </button>
            </div>
          </div>

          {/* Inbox Feed / Cards List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {filteredInbox.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-stone-400 space-y-2">
                <span className="material-symbols-outlined !text-4xl text-stone-300">mark_email_unread</span>
                <p className="text-xs font-semibold">No received stickies in BolekInbox</p>
                <p className="text-[11px] text-stone-400">Notes sent to you by teammates will appear here</p>
              </div>
            ) : (
              filteredInbox.map((msg) => (
                <div key={msg.id} className="relative group transition-all duration-300">
                  
                  {/* === UNREAD COVER OVERLAY (User requested: covered in unread: received boleknote from @username) === */}
                  {msg.isUnread ? (
                    <div 
                      onClick={() => toggleUnreadCover(msg.id)}
                      className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border-2 border-amber-400 rounded-2xl p-5 shadow-lg text-white flex flex-col justify-between cursor-pointer transform hover:scale-[1.01] transition-all relative overflow-hidden"
                    >
                      <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                      <div className="flex items-center justify-between mb-3 border-b border-stone-700/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">UNREAD STICKY PIN</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono">{msg.createdAt}</span>
                      </div>

                      {/* Explicit exact text required by user */}
                      <div className="py-3 px-1 text-center">
                        <span className="material-symbols-outlined !text-3xl text-amber-400 mb-1">push_pin</span>
                        <p className="text-sm font-bold leading-snug text-amber-100">
                          received boleknote from <span className="text-amber-400 font-extrabold">@{msg.senderUsername}</span>
                        </p>
                        <p className="text-[11px] text-stone-300 mt-1 font-medium">
                          Click card to unpin & reveal message content
                        </p>
                      </div>

                      <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px]">
                        <span className="text-stone-400 flex items-center gap-1">
                          <span className="material-symbols-outlined !text-xs text-amber-400">lock</span>
                          Covered
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUnreadCover(msg.id);
                          }}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition shadow-xs"
                        >
                          Reveal Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* === REVEALED STICKY CARD === */
                    <div 
                      style={{ backgroundColor: msg.color || '#fef08a' }}
                      className="border border-black/10 rounded-2xl p-4 shadow-md text-stone-900 flex flex-col space-y-3 relative transition-all"
                    >
                      {/* Top Pin Header */}
                      <div className="flex items-center justify-between border-b border-black/10 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold text-[10px] flex items-center justify-center">
                            {msg.senderUsername.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-stone-900 block leading-tight">
                              From: @{msg.senderUsername}
                            </span>
                            <span className="text-[10px] text-stone-600 font-medium">{msg.createdAt}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => togglePinned(msg.id)}
                            className={`p-1 rounded-lg transition cursor-pointer ${msg.pinned ? 'text-amber-700 bg-black/10' : 'text-stone-500 hover:bg-black/5'}`}
                            title={msg.pinned ? 'Pinned Sticky' : 'Pin Sticky'}
                          >
                            <span className="material-symbols-outlined !text-base">push_pin</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleUnreadCover(msg.id)}
                            className="p-1 text-stone-600 hover:bg-black/10 rounded-lg transition cursor-pointer"
                            title="Cover as Unread"
                          >
                            <span className="material-symbols-outlined !text-base">visibility_off</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteSticky(msg.id)}
                            className="p-1 text-stone-600 hover:bg-rose-500 hover:text-white rounded-lg transition cursor-pointer"
                            title="Delete Sticky"
                          >
                            <span className="material-symbols-outlined !text-base">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Title & Body */}
                      <div>
                        {msg.title && (
                          <h4 className="font-extrabold text-sm text-stone-900 mb-1">{msg.title}</h4>
                        )}
                        <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap font-medium">
                          {msg.content}
                        </p>
                      </div>

                      {/* Image Preview if present */}
                      {msg.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-black/10 shadow-xs max-h-48">
                          <img src={msg.imageUrl} alt="Sticky attachment" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* File Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="bg-black/5 p-2.5 rounded-xl space-y-1.5 border border-black/10">
                          <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider block">
                            Attachments ({msg.attachments.length})
                          </span>
                          <div className="space-y-1">
                            {msg.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-1.5 bg-white/80 hover:bg-white rounded-lg text-xs transition border border-stone-200"
                              >
                                <span className="flex items-center gap-1.5 font-medium text-stone-800 truncate">
                                  <span className="material-symbols-outlined text-amber-600 !text-sm shrink-0">description</span>
                                  <span className="truncate">{att.name}</span>
                                </span>
                                <span className="text-[10px] font-mono text-stone-500 shrink-0 ml-2">{att.size}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags & Action Buttons */}
                      <div className="pt-2 border-t border-black/10 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {msg.tags?.map((t, idx) => (
                            <span key={idx} className="bg-black/10 text-stone-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                              #{t}
                            </span>
                          ))}
                        </div>

                        {onImportToBoard && (
                          <button
                            type="button"
                            onClick={() => {
                              onImportToBoard({ title: msg.title, content: msg.content, color: msg.color });
                              showToast('Imported sticky to your BolekDash!');
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-stone-900 text-white hover:bg-stone-800 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <span className="material-symbols-outlined !text-xs">post_add</span>
                            <span>Import to Board</span>
                          </button>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        </div>


        {/* ================= RIGHT PANEL: BOLEK SENT ================= */}
        <div className="flex-1 h-full flex flex-col bg-stone-100 overflow-hidden">
          
          {/* Sent Header */}
          <div className="bg-white p-3.5 border-b border-stone-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 !text-xl">outbox</span>
              <h3 className="font-bold text-stone-900 text-sm">BolekSent</h3>
              <span className="bg-blue-100 text-blue-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {mySent.length} Sent
              </span>
            </div>

            <button
              onClick={() => setShowComposer(true)}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined !text-sm">add</span>
              <span>New Message</span>
            </button>
          </div>

          {/* Sent Feed / Grid */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {filteredSent.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-stone-400 space-y-2">
                <span className="material-symbols-outlined !text-4xl text-stone-300">outbox</span>
                <p className="text-xs font-semibold">No sent stickies in BolekSent</p>
                <p className="text-[11px] text-stone-400">Notes you send to teammates will be tracked here</p>
              </div>
            ) : (
              filteredSent.map((msg) => (
                <div 
                  key={msg.id}
                  style={{ backgroundColor: msg.color || '#fef08a' }}
                  className="border border-black/10 rounded-2xl p-4 shadow-sm text-stone-900 space-y-3 relative transition-all"
                >
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                        {msg.recipientUsername.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-stone-900 block leading-tight">
                          To: @{msg.recipientUsername} ({msg.recipientName})
                        </span>
                        <span className="text-[10px] text-stone-600 font-medium">{msg.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      <span className="material-symbols-outlined !text-xs text-emerald-600">done_all</span>
                      <span>Delivered</span>
                    </div>
                  </div>

                  {/* Title & Body */}
                  <div>
                    {msg.title && (
                      <h4 className="font-extrabold text-sm text-stone-900 mb-1">{msg.title}</h4>
                    )}
                    <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap font-medium">
                      {msg.content}
                    </p>
                  </div>

                  {/* Image Preview if present */}
                  {msg.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-black/10 shadow-xs max-h-40">
                      <img src={msg.imageUrl} alt="Sticky attachment" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* File Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="bg-black/5 p-2 rounded-xl space-y-1 border border-black/10 text-xs">
                      <span className="text-[10px] font-bold text-stone-600">Attachments ({msg.attachments.length}):</span>
                      {msg.attachments.map((att) => (
                        <div key={att.id} className="text-[11px] font-medium text-stone-800 flex items-center gap-1">
                          <span className="material-symbols-outlined !text-xs text-stone-500">attachment</span>
                          <span>{att.name} ({att.size})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {msg.tags && msg.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {msg.tags.map((t, idx) => (
                        <span key={idx} className="bg-black/10 text-stone-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ================= COMPOSE NEW STICKY MODAL ================= */}
      {showComposer && (
        <div className="fixed inset-0 z-[10030] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-stone-900 p-4 text-white flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 !text-xl">send_and_archive</span>
                <h3 className="font-bold text-sm">Send Sticky Note to User</h3>
              </div>
              <button
                onClick={() => setShowComposer(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition"
              >
                <span className="material-symbols-outlined !text-xl">close</span>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSendSticky} className="p-5 overflow-y-auto space-y-4 text-xs text-stone-800">
              
              {/* Recipient Selector */}
              <div>
                <label className="block font-bold text-stone-900 mb-1">Select Recipient User</label>
                <select
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-medium text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {usersList.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name} (@{u.email.split('@')[0]}) — {u.email}
                    </option>
                  ))}
                  <option value="jshjfhs@bolek.io">Jshjfhs Admin (@jshjfhs)</option>
                  <option value="alex_dev@bolek.io">Alex Rivers (@alex_dev)</option>
                </select>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block font-bold text-stone-900 mb-1.5">Sticky Note Paper Color</label>
                <div className="flex items-center gap-2">
                  {STICKY_COLORS.map((c) => (
                    <button
                      key={c.raw}
                      type="button"
                      onClick={() => setSelectedColor(c.raw)}
                      style={{ backgroundColor: c.raw }}
                      className={`w-8 h-8 rounded-full border-2 transition cursor-pointer flex items-center justify-center ${
                        selectedColor === c.raw ? 'border-stone-900 ring-2 ring-stone-900/30 scale-110' : 'border-stone-300'
                      }`}
                      title={c.name}
                    >
                      {selectedColor === c.raw && (
                        <span className="material-symbols-outlined !text-xs text-stone-900">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block font-bold text-stone-900 mb-1">Sticky Title (Optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Server Access & API Keys"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Body Content Input */}
              <div>
                <label className="block font-bold text-stone-900 mb-1">Sticky Message Content *</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write sticky note details here..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Photo Attachment URL / Upload */}
              <div>
                <label className="block font-bold text-stone-900 mb-1">Attach Picture Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80')}
                    className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-semibold text-[11px]"
                  >
                    Sample Img
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block font-bold text-stone-900 mb-1">Attach Files / Documents</label>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl border border-stone-300 font-bold text-xs cursor-pointer flex items-center gap-1.5">
                    <span className="material-symbols-outlined !text-base">upload_file</span>
                    <span>Choose File...</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>

                  {attachments.length > 0 && (
                    <span className="text-stone-600 font-semibold">{attachments.length} file(s) attached</span>
                  )}
                </div>

                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((att) => (
                      <div key={att.id} className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between text-stone-700">
                        <span className="font-medium truncate">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}
                          className="text-rose-600 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags Input */}
              <div>
                <label className="block font-bold text-stone-900 mb-1">Tags (Press Enter to add)</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="e.g. Urgent, Deliverable"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs"
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tags.map((t, idx) => (
                      <span key={idx} className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        #{t}
                        <button type="button" onClick={() => setTags(tags.filter((_, i) => i !== idx))}>&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Pinned Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-900">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <span>Pin this Sticky Note for recipient</span>
              </label>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  className="px-4 py-2 font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 font-bold text-stone-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined !text-base">send</span>
                  <span>Send Sticky Note</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
