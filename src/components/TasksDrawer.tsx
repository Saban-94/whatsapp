import React, { useState, useEffect } from 'react';
import { 
  X, 
  ListTodo, 
  Plus, 
  Trash2, 
  Calendar, 
  Loader2, 
  LogOut, 
  CheckCircle2, 
  Circle, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider, loginAndGetAccessToken } from '../lib/firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// Module-level in-memory cache for the OAuth access token (Strict compliance with workspace-integration SKILL.md)
let cachedOAuthToken: string | null = null;

interface TasksDrawerProps {
  onClose: () => void;
  dir?: 'rtl' | 'ltr';
}

interface TaskList {
  id: string;
  title: string;
  updated: string;
}

interface Task {
  id: string;
  title: string;
  status: 'completed' | 'needsAction';
  notes?: string;
  due?: string;
}

export default function TasksDrawer({ onClose, dir = 'rtl' }: TasksDrawerProps) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [token, setToken] = useState<string | null>(cachedOAuthToken);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Lists & Tasks States
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskListTitle, setNewTaskListTitle] = useState('');
  const [showAddListForm, setShowAddListForm] = useState(false);

  // New Task Creator States
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('pending');

  // Collapse sections
  const [showCompletedSection, setShowCompletedSection] = useState(true);

  // Synchronize Auth State on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        cachedOAuthToken = null;
        setToken(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Task lists if token is available
  useEffect(() => {
    if (token) {
      fetchTaskLists();
    }
  }, [token]);

  // Fetch tasks when selected list changes
  useEffect(() => {
    if (token && selectedListId) {
      fetchTasks(selectedListId);
    }
  }, [token, selectedListId]);

  // Google OAuth Sign In handler
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await loginAndGetAccessToken();
      if (result.user && result.accessToken) {
        cachedOAuthToken = result.accessToken;
        setToken(result.accessToken);
        setUser(result.user);
      } else {
        // Fallback popup if custom routine misses accessToken
        const res = await signInWithPopup(auth, googleProvider);
        const cred = GoogleAuthProvider.credentialFromResult(res);
        if (cred?.accessToken) {
          cachedOAuthToken = cred.accessToken;
          setToken(cred.accessToken);
          setUser(res.user);
        } else {
          alert('לא התקבל מפתח אבטחה מגווגל. אנא ודא שנתת הרשאה מתאימה.');
        }
      }
    } catch (err: any) {
      console.error('Task sign-in error:', err);
      alert('ההתחברות נכשלה: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    if (window.confirm('האם ברצונך להתנתק מחשבון Google Tasks שלך?')) {
      await auth.signOut();
      cachedOAuthToken = null;
      setToken(null);
      setUser(null);
      setTaskLists([]);
      setTasks([]);
    }
  };

  // Fetch Task Lists from API
  const fetchTaskLists = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tasks/users/@me/lists', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        // Token might have expired
        cachedOAuthToken = null;
        setToken(null);
        return;
      }
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setTaskLists(data.items);
        setSelectedListId(data.items[0].id);
      }
    } catch (err) {
      console.error('Failed to load lists:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Tasks for list id
  const fetchTasks = async (listId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/lists/${listId}/tasks?showCompleted=true&showHidden=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTasks(data.items || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new Task list
  const handleCreateTaskList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTaskListTitle.trim()) return;

    // Explicit confirmation dialog for creating data
    const confirmed = window.confirm(`האם ברצונך ליצור קבוצת משימות חדשה בשם "${newTaskListTitle}"?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch('/api/tasks/users/@me/lists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTaskListTitle })
      });
      const data = await res.json();
      if (data.id) {
        setTaskLists(prev => [data, ...prev]);
        setSelectedListId(data.id);
        setNewTaskListTitle('');
        setShowAddListForm(false);
      }
    } catch (err) {
      console.error('Failed to create task list:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new Task inside selected list
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedListId || !newTaskTitle.trim()) return;

    setCreatingTask(true);
    try {
      const payload: any = {
        title: newTaskTitle,
        status: 'needsAction'
      };
      if (newTaskNotes.trim()) payload.notes = newTaskNotes;
      if (newTaskDue) {
        // Formulate correct date-time string RFC 3339
        payload.due = new Date(newTaskDue).toISOString();
      }

      const res = await fetch(`/api/tasks/lists/${selectedListId}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.id) {
        setTasks(prev => [data, ...prev]);
        setNewTaskTitle('');
        setNewTaskNotes('');
        setNewTaskDue('');
      }
    } catch (err) {
      console.error('Create task failed:', err);
    } finally {
      setCreatingTask(false);
    }
  };

  // Delete a specific Task
  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!token || !selectedListId) return;

    // MANDATORY confirmation dialog for destructive operation (workspace-integration SKILL.md)
    const confirmed = window.confirm(`האם אתה בטוח שברצונך למחוק לצמיתות את המשימה "${taskTitle}"?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      await fetch(`/api/tasks/lists/${selectedListId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Delete task failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle/Update task status complete <-> needsAction
  const handleToggleTaskStatus = async (task: Task) => {
    if (!token || !selectedListId) return;

    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    const statusTextLabel = newStatus === 'completed' ? 'השלמת' : 'פתיחת מחדש';

    // Show explicit user confirmation for update operation (MANDATORY per skill guidelines)
    const confirmed = window.confirm(`האם ברצונך לאשר את ${statusTextLabel} המשימה "${task.title}"?`);
    if (!confirmed) return;

    // Optimistically update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      const res = await fetch(`/api/tasks/lists/${selectedListId}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: task.id,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.id) {
        // Ensure state matches the absolute response
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: data.status } : t));
      }
    } catch (err) {
      console.error('Update task failed:', err);
      // Revert optimism
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  // Format date display nicely
  const formatDateDisplay = (isoStr: string | undefined) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('he-IL', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'needsAction');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="h-full bg-[#f8f9fa] flex flex-col relative w-full border-r border-gray-200 text-right select-none" dir="rtl">
      
      {/* Header Banner */}
      <div className="h-[60px] bg-[#f0f2f5] px-4 border-b border-[#e9edef] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-[#4285F4] p-1.5 rounded-lg text-white">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-[16px] text-[#111b21] leading-tight">משימות JONI Tasks</h2>
            <p className="text-[10px] text-gray-500 font-mono">סנכרון מלא מול Google Tasks</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="text-[#667781] hover:bg-gray-200/60 p-1.5 rounded-full cursor-pointer bg-transparent border-0 transition-colors"
          title="סגור תפריט"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {authChecking ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white">
          <Loader2 className="w-8 h-8 text-[#4285F4] animate-spin" />
          <span className="text-xs text-gray-500 mt-2">בודק חיבור מול גוגל...</span>
        </div>
      ) : !token ? (
        /* Sign-in required interface */
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-[#4285F4]">
            <ListTodo className="w-8 h-8 stroke-1" />
          </div>
          <h3 className="font-bold text-base text-gray-900 mb-1">נהל את המשימות שלך ישירות מוואטסאפ</h3>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs mb-6">
            חבר את האפליקציה לחשבון ה-Google Tasks שלך כדי לסנכרן משימות, רשימות תיוג ועדכונים בזמן אמת.
          </p>

          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="gsi-material-button w-full max-w-xs h-10 select-none shadow-sm hover:shadow-md active:scale-98 transition-all flex items-center justify-center bg-white border border-gray-300 rounded-lg cursor-pointer font-semibold text-gray-700 hover:bg-gray-50"
          >
            <div className="gsi-material-button-content-wrapper flex items-center gap-3">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              ) : (
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '18px', height: '18px' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
              )}
              <span className="text-sm">התחבר עם Google</span>
            </div>
          </button>
        </div>
      ) : (
        /* Logged in tasks view */
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Linked account card */}
          <div className="bg-white p-3.5 border-b border-gray-150 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 bg-blue-100 text-blue-600 font-bold rounded-full flex items-center justify-center shrink-0 text-xs">
                  {user?.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="text-right">
                <span className="text-xs font-semibold text-gray-800 block line-clamp-1">{user?.displayName || 'משתמש מחובר'}</span>
                <span className="text-[10px] text-gray-500 block truncate font-mono max-w-[160px]">{user?.email}</span>
              </div>
            </div>

            <button 
              onClick={handleSignOut} 
              className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors border-0 bg-transparent flex items-center justify-center cursor-pointer" 
              title="התנתק"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* List Selector Box */}
          <div className="bg-white p-3 border-b border-gray-150 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-gray-600 select-none">בחר רשימת משימות:</span>
              <button 
                onClick={() => setShowAddListForm(!showAddListForm)} 
                className="text-[11px] text-[#4285F4] hover:underline font-semibold bg-transparent border-0 cursor-pointer flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> רשימה חדשה
              </button>
            </div>

            {showAddListForm ? (
              <form onSubmit={handleCreateTaskList} className="flex gap-2.5 mt-1 select-text">
                <input 
                  type="text" 
                  placeholder="שם רובריקה..." 
                  value={newTaskListTitle} 
                  onChange={(e) => setNewTaskListTitle(e.target.value)} 
                  className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-right outline-hidden focus:border-blue-500 bg-white"
                  required
                />
                <button type="submit" className="px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer border-0 active:scale-95 transition-all">
                  צור
                </button>
                <button type="button" onClick={() => { setShowAddListForm(false); setNewTaskListTitle(''); }} className="px-2 text-gray-500 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs cursor-pointer">
                  בטל
                </button>
              </form>
            ) : (
              <div className="relative">
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="w-full text-xs py-2 pr-3 pl-8 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 font-semibold cursor-pointer outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  {taskLists.map(list => (
                    <option key={list.id} value={list.id}>{list.title}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3.5 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Interactive Task Creator Grid */}
          <div className="bg-white px-4 py-3.5 border-b border-gray-150 shrink-0">
            <form onSubmit={handleAddTask} className="space-y-2.5 select-text">
              <div>
                <input 
                  type="text"
                  placeholder="+ הוסף משימה חדשה..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 text-right outline-hidden focus:border-blue-500 placeholder-teal-600/70"
                  required
                />
              </div>

              {newTaskTitle.trim() && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <textarea 
                    placeholder="תיאור / הערות למשימה..."
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    className="w-full text-[11px] border border-gray-200 rounded-lg px-2.5 py-1.5 text-right outline-hidden focus:border-blue-500 min-h-[50px] resize-none"
                  />
                  
                  <div className="flex gap-2.5">
                    {/* Date Picker */}
                    <div className="flex-1 flex items-center pr-2 bg-gray-50 border border-gray-200 rounded-lg relative">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1.5" />
                      <input 
                        type="date"
                        value={newTaskDue}
                        onChange={(e) => setNewTaskDue(e.target.value)}
                        className="w-full bg-transparent border-0 text-[10px] text-gray-600 p-1.5 outline-hidden text-right"
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={creatingTask}
                      className="px-4 py-1.5 bg-[#4285F4] hover:bg-[#357ae8] text-white rounded-lg text-xs font-semibold cursor-pointer border-0 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                    >
                      {creatingTask ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>שמור</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </form>
          </div>

          {/* List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="text-[11px] text-gray-400 mt-2">טוען משימות משרד...</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-16 text-xs text-gray-400 flex flex-col items-center justify-center gap-2 select-none">
                <div className="bg-gray-100 p-3 rounded-full text-gray-400">
                  <Sparkles className="w-6 h-6 stroke-1" />
                </div>
                <span>רשימה ריקה! הוסף משימה לשמירה ענן.</span>
              </div>
            ) : (
              <>
                {/* Active pending tasks segment */}
                <div className="space-y-2">
                  <div className="text-[11px] text-[#4285F4] font-semibold flex items-center justify-between border-b border-gray-150 pb-1 pr-1 select-none">
                    <span>לטפל בהקדם נותר ({pendingTasks.length})</span>
                    <span className="text-[9px] font-mono text-gray-400">JONI CONTROL</span>
                  </div>

                  {pendingTasks.length === 0 ? (
                    <div className="p-4 text-center rounded-xl bg-green-50/50 border border-dashed border-green-200/60 text-xs text-green-700 font-medium select-none flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span>הכל הושלם בהצלחה! העבודה נקייה לחלוטין. ✨</span>
                    </div>
                  ) : (
                    pendingTasks.map((task) => (
                      <div 
                        key={task.id}
                        className="p-3 bg-white border border-gray-150 hover:border-blue-200 rounded-xl transition-all shadow-2xs group flex items-start gap-2.5"
                      >
                        {/* Status Checkbox Button with dynamic confirmation */}
                        <button 
                          onClick={() => handleToggleTaskStatus(task)}
                          className="p-0.5 mt-0.5 text-gray-400 hover:text-blue-500 bg-transparent border-0 cursor-pointer shrink-0 transition-colors"
                          title="סמן כהושלם"
                        >
                          <Circle className="w-4.5 h-4.5" />
                        </button>

                        {/* Task body text */}
                        <div className="flex-1 min-w-0 pr-0.5">
                          <p className="text-xs font-semibold text-gray-800 leading-snug break-all placeholder-violet-400" title="לחץ לשינוי">
                            {task.title}
                          </p>
                          {task.notes && (
                            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed break-all select-text whitespace-pre-wrap flex items-start gap-1">
                              <FileText className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                              <span>{task.notes}</span>
                            </p>
                          )}
                          {task.due && (
                            <div className="flex items-center gap-1 text-[9px] font-mono text-red-500 mt-1.5 select-none bg-red-50 w-fit px-1.5 py-0.5 rounded-sm border border-red-100">
                              <Calendar className="w-3 h-3" />
                              <span>תאריך יעד: {formatDateDisplay(task.due)}</span>
                            </div>
                          )}
                        </div>

                        {/* Delete action with premium validation popup */}
                        <button 
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded transition-all shrink-0 border-0 bg-transparent cursor-pointer self-center md:opacity-0 group-hover:opacity-100"
                          title="מחק משימה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Collapsible Completed Tasks Section */}
                {completedTasks.length > 0 && (
                  <div className="space-y-2 mt-4 select-none">
                    <button 
                      onClick={() => setShowCompletedSection(!showCompletedSection)}
                      className="w-full text-right text-[11px] text-[#667781] font-semibold flex items-center justify-between border-b border-gray-150 pb-1 bg-transparent border-0 cursor-pointer hover:text-gray-900"
                    >
                      <span>משימות שהושלמו ({completedTasks.length})</span>
                      {showCompletedSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <AnimatePresence>
                      {showCompletedSection && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5 overflow-hidden"
                        >
                          {completedTasks.map((task) => (
                            <div 
                              key={task.id}
                              className="p-2.5 bg-gray-50/70 border border-gray-150 rounded-lg flex items-center justify-between gap-2.5 opacity-70 group hover:opacity-100 transition-opacity"
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <button 
                                  onClick={() => handleToggleTaskStatus(task)}
                                  className="p-0.5 text-blue-500 hover:text-gray-400 bg-transparent border-0 cursor-pointer shrink-0 transition-colors"
                                  title="שחזר משימה"
                                >
                                  <CheckCircle2 className="w-4.5 h-4.5" />
                                </button>
                                <div className="min-w-0 shrink-1">
                                  <p className="text-xs font-medium text-gray-500 line-through leading-none truncate select-text">
                                    {task.title}
                                  </p>
                                </div>
                              </div>

                              <button 
                                onClick={() => handleDeleteTask(task.id, task.title)}
                                className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded transition-all shrink-0 border-0 bg-transparent cursor-pointer opacity-0 group-hover:opacity-100"
                                title="מחק סופית"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick Notice Banner */}
          <div className="p-3 bg-blue-50/50 text-[10px] text-[#2b7de9] leading-relaxed border-t border-blue-100 shrink-0 select-none text-center flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>המשימות נשמרות בחשבון גוגל ומסונכרנות ישירות לאפליקציית Google Tasks.</span>
          </div>

        </div>
      )}

    </div>
  );
}
