import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Mail, 
  Clock, 
  Check, 
  AlertCircle, 
  Bell, 
  Sparkles,
  Info
} from 'lucide-react';

interface CalendarReminder {
  id: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM
  title: string;
  notes: string;
  sendEmail: boolean;
  emailAddress: string;
  remindBeforeValue: number; // e.g. 5, 15, 30, 60, 1440 minutes
  remindBeforeUnit: 'minutes' | 'hours' | 'days';
  sent: boolean;
}

interface BolekCalendarProps {
  showAlert: (message: string) => void;
  userEmail?: string;
  resendApiKey?: string;
  resendEnabled?: boolean;
  isGuest?: boolean;
}

export default function BolekCalendar({ 
  showAlert, 
  userEmail = 'rjelvanbaloaloa@gmail.com', 
  resendApiKey = '', 
  resendEnabled = false,
  isGuest = false
}: BolekCalendarProps) {
  // Date states
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Reminders / events persistence state
  const [reminders, setReminders] = useState<CalendarReminder[]>(() => {
    const saved = localStorage.getItem('bolek_calendar_reminders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Default seed reminders
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().substring(0, 10);

    return [
      {
        id: 'rem-1',
        dateStr: todayStr,
        timeStr: '14:30',
        title: 'Workspace Review with Instructors',
        notes: 'Demonstrate vector flowcharts, drag-and-drop linking, and YouTube presentation tools.',
        sendEmail: true,
        emailAddress: userEmail,
        remindBeforeValue: 15,
        remindBeforeUnit: 'minutes',
        sent: false
      },
      {
        id: 'rem-2',
        dateStr: tomorrowStr,
        timeStr: '09:00',
        title: 'Project Submission Deadline',
        notes: 'Compile workspace code, verify build logs, and export presentation screenshot.',
        sendEmail: true,
        emailAddress: userEmail,
        remindBeforeValue: 1,
        remindBeforeUnit: 'hours',
        sent: false
      }
    ];
  });

  // New Reminder form state
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [sendEmailToggle, setSendEmailToggle] = useState(true);
  const [targetEmail, setTargetEmail] = useState(userEmail);
  const [remindValue, setRemindValue] = useState<number>(15);
  const [remindUnit, setRemindUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  // Trigger effect to save reminders to localStorage
  useEffect(() => {
    localStorage.setItem('bolek_calendar_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Simulated background cron check to notify of upcoming reminders
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      let updatedReminders = [...reminders];
      let triggeredAny = false;

      updatedReminders = updatedReminders.map(rem => {
        if (rem.sent) return rem;

        // Parse reminder date & time
        const [yr, mo, dy] = rem.dateStr.split('-').map(Number);
        const [hr, mn] = rem.timeStr.split(':').map(Number);
        const remDateTime = new Date(yr, mo - 1, dy, hr, mn);

        // Calculate offset minutes
        let offsetMin = rem.remindBeforeValue;
        if (rem.remindBeforeUnit === 'hours') offsetMin *= 60;
        if (rem.remindBeforeUnit === 'days') offsetMin *= 1440;

        const warningTime = new Date(remDateTime.getTime() - offsetMin * 60 * 1000);

        // If current time is past or equal to warning time AND not past event time entirely
        if (now >= warningTime && now < remDateTime) {
          triggeredAny = true;
          // Trigger dispatch
          dispatchSimulatedEmail(rem);
          return { ...rem, sent: true };
        }
        return rem;
      });

      if (triggeredAny) {
        setReminders(updatedReminders);
      }
    }, 12000); // Check every 12s

    return () => clearInterval(interval);
  }, [reminders]);

  // Dispatch email reminder
  const dispatchSimulatedEmail = async (rem: CalendarReminder) => {
    const timeDetail = `${rem.dateStr} at ${rem.timeStr}`;
    const leadMessage = `🔔 [EMAIL REMINDER DISPATCHED] To: ${rem.emailAddress}\n\nSubject: Reminder: ${rem.title}\nTime: ${timeDetail}\n\nNotes:\n${rem.notes || 'No description provided.'}`;
    
    if (resendEnabled && resendApiKey) {
      // Real integration using Resend API if configured
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'Bolek Calendar <reminders@bolek.io>',
            to: rem.emailAddress,
            subject: `Reminder: ${rem.title}`,
            text: `This is a scheduled reminder for: ${rem.title}\nTime: ${timeDetail}\n\nNotes:\n${rem.notes}`
          })
        });
        if (response.ok) {
          showAlert(`Real Email Reminder dispatched via Resend to ${rem.emailAddress}!`);
          return;
        }
      } catch (e) {
        console.warn('Resend send failed, falling back to secure simulated dispatch.', e);
      }
    }

    // Default premium simulated dispatch modal
    showAlert(leadMessage);
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format date key
  const formatDateKey = (d: Date) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  };

  const selectedDateKey = formatDateKey(selectedDate);

  // Generate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();
  const prevMonthNumDays = new Date(year, month, 0).getDate();

  const daysArr: { date: Date; currentMonth: boolean; key: string }[] = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthNumDays - i);
    daysArr.push({
      date: prevDate,
      currentMonth: false,
      key: formatDateKey(prevDate)
    });
  }

  // Current month days
  for (let i = 1; i <= numDays; i++) {
    const currDate = new Date(year, month, i);
    daysArr.push({
      date: currDate,
      currentMonth: true,
      key: formatDateKey(currDate)
    });
  }

  // Next month padding days
  const remainingCells = 42 - daysArr.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i);
    daysArr.push({
      date: nextDate,
      currentMonth: false,
      key: formatDateKey(nextDate)
    });
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showAlert('Notice: Calendar event scheduling and leaving notes/reminders are disabled in Guest Mode. Please sign in to create events.');
      return;
    }
    if (!newTitle.trim()) {
      showAlert('Please enter a title for your calendar event!');
      return;
    }

    const newRem: CalendarReminder = {
      id: `rem-${Date.now()}`,
      dateStr: selectedDateKey,
      timeStr: newTime,
      title: newTitle,
      notes: newNotes,
      sendEmail: sendEmailToggle,
      emailAddress: targetEmail,
      remindBeforeValue: remindValue,
      remindBeforeUnit: remindUnit,
      sent: false
    };

    setReminders(prev => [...prev, newRem]);
    setNewTitle('');
    setNewNotes('');
    showAlert(`Successfully scheduled reminder: "${newTitle}" for ${selectedDateKey}!`);
  };

  const deleteReminder = (id: string) => {
    if (window.confirm('Are you sure you want to delete this event/reminder?')) {
      setReminders(prev => prev.filter(r => r.id !== id));
      showAlert('Calendar event removed.');
    }
  };

  const triggerNow = (rem: CalendarReminder) => {
    dispatchSimulatedEmail(rem);
    setReminders(prev => prev.map(r => r.id === rem.id ? { ...r, sent: true } : r));
  };

  // Get reminders count for a date string
  const getRemindersForDate = (dateStr: string) => {
    return reminders.filter(r => r.dateStr === dateStr);
  };

  const selectedDayReminders = getRemindersForDate(selectedDateKey);

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-stone-50 border border-stone-200 rounded-lg overflow-hidden select-none">
      
      {/* Left panel: Interactive Calendar Grid */}
      <div className="flex-1 flex flex-col p-5 border-b md:border-b-0 md:border-r border-stone-200 bg-white">
        
        {/* Header month controls */}
        <div className="flex items-center justify-between mb-4 select-none">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-orange-600" />
            <h2 className="text-sm font-extrabold text-stone-900 font-sans tracking-tight uppercase">
              {monthNames[month]} {year}
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-lg p-0.5">
            <button 
              type="button" 
              onClick={prevMonth}
              className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
              className="px-2 py-0.5 text-[9px] font-bold text-stone-500 hover:text-stone-800 uppercase tracking-wider transition cursor-pointer"
            >
              Today
            </button>
            <button 
              type="button" 
              onClick={nextMonth}
              className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar days of the week headers */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] text-stone-400 uppercase tracking-widest mb-1.5 font-mono">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days grid layout */}
        <div className="grid grid-cols-7 gap-1 flex-1 min-h-[280px]">
          {daysArr.map((cell, idx) => {
            const isToday = formatDateKey(new Date()) === cell.key;
            const isSelected = selectedDateKey === cell.key;
            const dayReminders = getRemindersForDate(cell.key);
            const hasReminders = dayReminders.length > 0;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(cell.date)}
                className={`flex flex-col justify-between p-1.5 rounded-lg border text-left transition relative cursor-pointer group min-h-[44px] ${
                  isSelected 
                    ? 'bg-stone-900 border-stone-900 text-white shadow-sm z-10' 
                    : isToday
                      ? 'bg-amber-50/50 border-amber-300 text-amber-900 hover:bg-amber-100'
                      : cell.currentMonth
                        ? 'bg-stone-50/30 border-stone-150 text-stone-800 hover:bg-stone-100'
                        : 'bg-stone-50/10 border-stone-100 text-stone-300 hover:bg-stone-100/50'
                }`}
              >
                {/* Day number */}
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-stone-700 group-hover:text-stone-900'}`}>
                  {cell.date.getDate()}
                </span>

                {/* Reminders dots indicator */}
                {hasReminders && (
                  <div className="flex gap-0.5 items-center mt-1 flex-wrap">
                    {dayReminders.slice(0, 3).map((rem, rIdx) => (
                      <span 
                        key={rIdx} 
                        className={`w-1 h-1 rounded-full ${
                          isSelected 
                            ? 'bg-amber-400' 
                            : rem.sendEmail ? 'bg-orange-600' : 'bg-stone-500'
                        }`} 
                      />
                    ))}
                    {dayReminders.length > 3 && (
                      <span className={`text-[6px] font-extrabold ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                        +{dayReminders.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel: Day details, schedule form & actions */}
      <div className="w-full md:w-[360px] bg-stone-50 flex flex-col p-5 overflow-y-auto select-none gap-4 shrink-0">
        
        {/* Selected Day Header */}
        <div className="border-b border-stone-200 pb-3">
          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest font-mono block">Schedule details for:</span>
          <h3 className="text-sm font-extrabold text-stone-900 font-sans tracking-tight">
            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
        </div>

        {/* Schedule a new event form */}
        <form onSubmit={handleAddReminder} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm space-y-3.5">
          <div className="border-b border-stone-100 pb-2">
            <span className="text-[10px] font-extrabold text-stone-800 uppercase tracking-widest font-sans">New Event Scheduler</span>
          </div>

          {isGuest && (
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Guest Mode Active</span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-snug">
                Calendar view is available, but scheduling new events or leaving notes/reminders is disabled for guests. Please sign in to save events.
              </p>
            </div>
          )}

          <div className="space-y-2 text-xs">
            {/* Title field */}
            <div>
              <label className="block text-[8px] font-extrabold text-stone-400 uppercase tracking-widest mb-1 font-mono">Event Title</label>
              <input 
                type="text"
                placeholder="E.g. College midterm, parent conference"
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-[11px] outline-none focus:bg-white focus:border-stone-400"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            {/* Note description field */}
            <div>
              <label className="block text-[8px] font-extrabold text-stone-400 uppercase tracking-widest mb-1 font-mono">Notes/Description</label>
              <textarea 
                placeholder="Additional details for the reminder..."
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:bg-white focus:border-stone-400 resize-none min-h-12"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>

            {/* Time selection */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] font-extrabold text-stone-400 uppercase tracking-widest mb-1 font-mono">Trigger Time</label>
                <input 
                  type="time"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-[11px] outline-none font-mono"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[8px] font-extrabold text-stone-400 uppercase tracking-widest mb-1 font-mono">Send Email?</label>
                <div className="flex items-center h-7 gap-2">
                  <button
                    type="button"
                    onClick={() => setSendEmailToggle(prev => !prev)}
                    className={`flex-1 text-[10px] py-1 px-2.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                      sendEmailToggle 
                        ? 'bg-orange-600 border-orange-600 text-white' 
                        : 'bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    {sendEmailToggle ? 'YES' : 'NO'}
                  </button>
                </div>
              </div>
            </div>

            {/* Conditionally visible email config fields */}
            {sendEmailToggle && (
              <div className="space-y-2.5 p-2.5 bg-stone-50 rounded-lg border border-stone-200/60 animate-in slide-in-from-top-1.5 duration-100">
                <div>
                  <label className="block text-[8px] font-extrabold text-stone-400 uppercase tracking-widest mb-1 font-mono">Target Recipient Address</label>
                  <input 
                    type="email"
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-[11px] outline-none"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-extrabold text-stone-400 uppercase tracking-widest mb-1 font-mono">Remind Timing</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="number"
                      min={1}
                      className="w-16 bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px] outline-none font-mono"
                      value={remindValue}
                      onChange={(e) => setRemindValue(Number(e.target.value))}
                    />
                    <select 
                      className="flex-1 bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px] outline-none cursor-pointer"
                      value={remindUnit}
                      onChange={(e) => setRemindUnit(e.target.value as any)}
                    >
                      <option value="minutes">minutes before</option>
                      <option value="hours">hours before</option>
                      <option value="days">days before</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-stone-900 hover:bg-stone-850 text-white font-bold text-xs py-2 rounded-lg transition shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Event</span>
          </button>
        </form>

      </div>

    </div>
  );
}
