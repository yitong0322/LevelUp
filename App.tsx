import React, { useState, useRef, useEffect } from 'react';
import { db } from './services/db'; // Import the DB service
import { INITIAL_TASKS, INITIAL_USER, INITIAL_SHOP_ITEMS, COLUMN_CONFIG } from './constants';
import { Task, UserRole, User, TaskStatus, ShopItem, Transaction, PointLog, DayOfWeek } from './types';
import { TaskCard } from './components/TaskCard';
import { Modal } from './components/Modal';
import { TaskDetail, TaskDetailHandle } from './components/TaskDetail';
import { LoginPage } from './components/LoginPage';
import { ShopModal } from './components/ShopModal';
import { InventoryModal } from './components/InventoryModal';
import { StatsModal } from './components/StatsModal';
import { LayoutDashboard, LogOut, Zap, Trophy, Sparkles, Store, Plus, Package, BarChart2, Loader2 } from 'lucide-react';

// Helper to get current day name matching DayOfWeek type
const getDayName = (date: Date): DayOfWeek => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()] as DayOfWeek;
};

const App: React.FC = () => {
  // Loading State
  const [isLoaded, setIsLoaded] = useState(false);

  // App State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [shopItems, setShopItems] = useState<ShopItem[]>(INITIAL_SHOP_ITEMS);
  const [user, setUser] = useState<User>(INITIAL_USER);

  // UI State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  
  const [currentDay, setCurrentDay] = useState<DayOfWeek>(getDayName(new Date()));
  const taskDetailRef = useRef<TaskDetailHandle>(null);

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    const loadData = async () => {
      await db.init();
      const [auth, loadedTasks, loadedUser, loadedShop] = await Promise.all([
        db.getAuth(),
        db.getTasks(),
        db.getUser(),
        db.getShopItems()
      ]);

      setIsAuthenticated(auth);
      setTasks(loadedTasks);
      setUser(loadedUser);
      setShopItems(loadedShop);
      setIsLoaded(true);
    };
    loadData();
  }, []);

  // --- 2. PERSISTENCE EFFECTS ---
  // Only save if initial load is complete to avoid overwriting DB with empty states
  useEffect(() => {
    if (isLoaded) db.setAuth(isAuthenticated);
  }, [isAuthenticated, isLoaded]);

  useEffect(() => {
    if (isLoaded) db.saveTasks(tasks);
  }, [tasks, isLoaded]);

  useEffect(() => {
    if (isLoaded) db.saveUser(user);
  }, [user, isLoaded]);

  useEffect(() => {
    if (isLoaded) db.saveShopItems(shopItems);
  }, [shopItems, isLoaded]);

  // --- 3. MIDNIGHT CLEANUP ---
  useEffect(() => {
    if (!isLoaded) return;

    const getMsToMidnight = () => {
      const now = new Date();
      const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0
      );
      return night.getTime() - now.getTime();
    };

    const timeoutId = setTimeout(() => {
      const nextDayDate = new Date();
      setCurrentDay(getDayName(nextDayDate));

      setTasks(prevTasks => {
        return prevTasks.reduce((acc, t) => {
            const isRecurring = t.frequency && t.frequency.length > 0;
            if (!isRecurring && t.status === TaskStatus.COMPLETED) {
                return acc;
            }
            if (isRecurring) {
                acc.push({ ...t, status: TaskStatus.TODO, messages: [] });
            } else {
                acc.push(t);
            }
            return acc;
        }, [] as Task[]);
      });
      setSelectedTask(null);
    }, getMsToMidnight());

    return () => clearTimeout(timeoutId);
  }, [isLoaded]);


  // --- HANDLERS ---

  const handleLogin = (role: UserRole) => {
    setUser(prev => ({ ...prev, role }));
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    let finalTask = updatedTask;

    if (finalTask.id.startsWith('new_')) {
        finalTask = { ...finalTask, id: finalTask.id.replace('new_', 'task_') };
    }

    setTasks(prev => {
        const exists = prev.find(t => t.id === updatedTask.id);
        if (exists) {
            return prev.map(t => t.id === updatedTask.id ? finalTask : t);
        } else {
            return [...prev, finalTask];
        }
    });
    
    const oldTask = tasks.find(t => t.id === updatedTask.id);
    
    // Check completion points
    if (oldTask && oldTask.status !== TaskStatus.COMPLETED && finalTask.status === TaskStatus.COMPLETED) {
      const pointLog: PointLog = {
          id: `pl_${Date.now()}`,
          reason: `Completed: ${finalTask.title}`,
          change: finalTask.points,
          timestamp: Date.now()
      };
      setUser(prev => ({ 
        ...prev, 
        score: prev.score + finalTask.points,
        todayScore: prev.todayScore + finalTask.points,
        pointLogs: [...prev.pointLogs, pointLog]
      }));
    }
    
    setSelectedTask(finalTask);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
  };

  const handlePunishTask = (task: Task) => {
      const pointLog: PointLog = {
          id: `pl_${Date.now()}`,
          reason: `Penalty: ${task.title}`,
          change: task.points,
          timestamp: Date.now()
      };
      setUser(prev => ({
        ...prev,
        score: prev.score + task.points,
        todayScore: prev.todayScore + task.points,
        pointLogs: [...prev.pointLogs, pointLog]
      }));
      setSelectedTask(null);
  };

  const handlePurchase = (item: ShopItem) => {
    if (user.score >= item.cost) {
      const transaction: Transaction = {
          id: `tx_${Date.now()}`,
          type: 'PURCHASE',
          itemId: item.id,
          itemName: item.name,
          itemEmoji: item.emoji,
          cost: item.cost,
          timestamp: Date.now()
      };
      const pointLog: PointLog = {
          id: `pl_${Date.now()}`,
          reason: `Bought: ${item.name}`,
          change: -item.cost,
          timestamp: Date.now()
      };
      setUser(prev => ({
        ...prev,
        score: prev.score - item.cost,
        inventory: [...prev.inventory, item.id],
        history: [transaction, ...prev.history],
        pointLogs: [...prev.pointLogs, pointLog]
      }));
    }
  };

  const handleRedeemItem = (item: ShopItem) => {
      const transaction: Transaction = {
          id: `tx_${Date.now()}`,
          type: 'REDEEM',
          itemId: item.id,
          itemName: item.name,
          itemEmoji: item.emoji,
          cost: item.cost,
          timestamp: Date.now()
      };
      setUser(prev => {
          const index = prev.inventory.indexOf(item.id);
          if (index > -1) {
              const newInventory = [...prev.inventory];
              newInventory.splice(index, 1);
              return {
                  ...prev,
                  inventory: newInventory,
                  history: [transaction, ...prev.history]
              };
          }
          return prev;
      });
  };

  const handleUpdateShop = (items: ShopItem[]) => {
      setShopItems(items);
  };

  const handleAddTask = () => {
      const newTask: Task = {
          id: `new_${Date.now()}`,
          title: '',
          description: '',
          points: 50,
          status: TaskStatus.TODO,
          category: '',
          messages: []
      };
      setSelectedTask(newTask);
  };

  const handleCloseTaskModal = () => {
      setSelectedTask(null);
  };

  // --- RENDER ---

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b-2 border-slate-100 sticky top-0 z-10">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Brand & Logout */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-lg rotate-3">
                <LayoutDashboard className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1">
                  LevelUp <Sparkles size={16} className="text-yellow-400" />
                </h1>
                <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 font-bold tracking-wider uppercase">{user.role}</span>
              </div>
            </div>
            
            {/* Mobile Actions */}
            <div className="flex items-center gap-2 md:hidden">
                 <button onClick={handleLogout} className="text-slate-400">
                    <LogOut size={20} />
                </button>
            </div>
          </div>

          {/* Gamification Stats */}
          <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-4 md:gap-8 w-full md:w-auto">
            
            {/* My Items & Stats */}
            <div className="flex gap-2">
                <button 
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-slate-100 hover:border-indigo-400 transition-colors group"
                    onClick={() => setIsInventoryOpen(true)}
                >
                    <div className="bg-indigo-50 text-indigo-500 p-1.5 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <Package size={20} />
                    </div>
                    <div className="text-left">
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide">My Items</div>
                         <div className="font-black text-slate-700 text-lg leading-none">{user.inventory.length}</div>
                    </div>
                </button>

                 <button 
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-slate-100 hover:border-indigo-400 transition-colors group"
                    onClick={() => setIsStatsOpen(true)}
                >
                    <div className="bg-indigo-50 text-indigo-500 p-1.5 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <BarChart2 size={20} />
                    </div>
                    <div className="text-left">
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Stats</div>
                         <div className="font-black text-slate-700 text-lg leading-none">View</div>
                    </div>
                </button>
            </div>

            {/* Score Stats */}
            <div className="flex gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Today</span>
                <div className="flex items-center gap-1 text-emerald-500 font-black text-lg">
                  <Zap size={18} className="fill-current" />
                  <span>+{user.todayScore}</span>
                </div>
              </div>
              
              <div className="w-0.5 h-8 bg-slate-100"></div>

              <div 
                className="flex flex-col items-end cursor-pointer group"
                onClick={() => setIsShopOpen(true)}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide group-hover:text-indigo-500 transition-colors">Shop</span>
                  <Store size={10} className="text-slate-400 group-hover:text-indigo-500" />
                </div>
                <div className="flex items-center gap-1 text-indigo-600 font-black text-lg group-hover:scale-110 transition-transform origin-right">
                  <Trophy size={18} className="fill-current" />
                  <span>{user.score}</span>
                </div>
              </div>

              <div className="hidden md:block w-0.5 h-8 bg-slate-100"></div>
              
              <button 
                onClick={handleLogout}
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="flex-1 overflow-x-auto px-6 py-6">
        <div className="flex gap-6 min-w-[1200px] h-full">
          {COLUMN_CONFIG.map(col => {
            const columnTasks = tasks.filter(t => {
                if (t.status !== col.id) return false;
                if (t.frequency && t.frequency.length > 0) {
                    if (!t.frequency.includes(currentDay)) return false;
                }
                return true;
            });
            
            const groupedTasks: Record<string, Task[]> = {};
            columnTasks.forEach(t => {
                const cat = t.category || 'General';
                if(!groupedTasks[cat]) groupedTasks[cat] = [];
                groupedTasks[cat].push(t);
            });

            return (
              <div key={col.id} className={`flex-1 min-w-[280px] rounded-2xl flex flex-col max-h-[calc(100vh-140px)] ${col.color.split(' ')[0]} ${col.color.split(' ')[1]} border-2`}>
                <div className="p-4 flex justify-between items-center border-b-2 border-slate-900/5">
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-wider flex items-center gap-2">
                    {col.label}
                  </h3>
                  <span className="bg-white/50 text-slate-700 text-xs font-black px-2.5 py-1 rounded-lg">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                  {Object.keys(groupedTasks).map(cat => (
                     <div key={cat} className="space-y-2">
                        {groupedTasks[cat].map(task => (
                            <TaskCard key={task.id} task={task} onClick={setSelectedTask} />
                        ))}
                     </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center text-slate-400 opacity-40 border-2 border-dashed border-slate-300/50 rounded-xl m-2">
                      <div className="text-2xl mb-1">👻</div>
                      <div className="text-xs font-bold uppercase tracking-wider">Empty</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modals */}
      <Modal 
        isOpen={!!selectedTask} 
        onClose={handleCloseTaskModal}
        title={selectedTask?.title || 'New Task'}
      >
        {selectedTask && (
          <TaskDetail 
            ref={taskDetailRef}
            task={selectedTask}
            userRole={user.role}
            onUpdateTask={handleTaskUpdate}
            onClose={handleCloseTaskModal}
            onPunish={handlePunishTask}
            onDelete={handleDeleteTask}
          />
        )}
      </Modal>

      <ShopModal 
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        user={user}
        shopItems={shopItems}
        onPurchase={handlePurchase}
        onUpdateShop={handleUpdateShop}
      />

       <InventoryModal 
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        inventoryIds={user.inventory}
        shopItems={shopItems}
        userRole={user.role}
        onRedeem={handleRedeemItem}
        history={user.history}
      />

      <StatsModal 
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        logs={user.pointLogs}
      />

      {/* Admin FAB */}
      {user.role === UserRole.ADMIN && (
        <button
          onClick={handleAddTask}
          className="fixed bottom-8 right-8 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all duration-200 z-50 border-4 border-white ring-4 ring-indigo-100 group"
          title="Add New Task"
        >
          <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      )}
    </div>
  );
};

export default App;