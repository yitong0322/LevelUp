import React, { useState, useRef, useEffect } from 'react';
import { db } from './services/db'; 
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

// 辅助函数：获取当前星期名称
const getDayName = (date: Date): DayOfWeek => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()] as DayOfWeek;
};

const App: React.FC = () => {
  // --- 状态管理 ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [shopItems, setShopItems] = useState<ShopItem[]>(INITIAL_SHOP_ITEMS);
  const [user, setUser] = useState<User>(INITIAL_USER);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  
  const [currentDay, setCurrentDay] = useState<DayOfWeek>(getDayName(new Date()));
  const taskDetailRef = useRef<TaskDetailHandle>(null);

  // --- 1. 初始加载与实时监听 ---
  useEffect(() => {
    const initApp = async () => {
      await db.init();
      
      // 1. 获取不需要实时监听的基础数据 (User, Shop)
      // 注意：这里不再获取 tasks，因为下面会通过 subscribeTasks 获取
      const [auth, loadedUser, loadedShop] = await Promise.all([
        db.getAuth(),
        db.getUser(),
        db.getShopItems()
      ]);

      setIsAuthenticated(auth);
      setUser(loadedUser);
      setShopItems(loadedShop);

      // 2. 🔥 开启任务实时监听 (Real-time Listener)
      // 只要数据库有变化（无论是iPad改的还是午夜清理改的），这里都会立刻收到
      const unsubscribeTasks = db.subscribeTasks((updatedTasks) => {
        setTasks(updatedTasks);
      });

      setIsLoaded(true);

      // 组件卸载时关闭监听
      return () => {
        unsubscribeTasks();
      };
    };

    initApp();
  }, []);

  // --- 2. 数据持久化 (User & Shop) ---
  // 注意：删除了 saveTasks 的自动保存 Effect，防止全量覆盖
  
  useEffect(() => {
    if (isLoaded) db.setAuth(isAuthenticated);
  }, [isAuthenticated, isLoaded]);

  useEffect(() => {
    if (isLoaded) db.saveUser(user);
  }, [user, isLoaded]);

  useEffect(() => {
    if (isLoaded) db.saveShopItems(shopItems);
  }, [shopItems, isLoaded]);

  // --- 3. 强化后的午夜清理与启动检查逻辑 ---
  useEffect(() => {
    if (!isLoaded) return;

    const performCleanup = async () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // 获取 YYYY-MM-DD
      const todayName = getDayName(now);
      
      // 检查今天是否已经清理过
      if (user.lastCleanupDate === todayStr) {
        console.log("今日已清理过任务，跳过...");
        return;
      }

      console.log("正在执行跨日/午夜清理逻辑...");
      const tasksToDelete: string[] = [];
      
      // 计算更新后的任务状态
      const updatedTasks = tasks.reduce((acc: Task[], t) => {
        const isRecurring = t.frequency && t.frequency.length > 0;
        
        // 逻辑 A: 已完成的一次性任务 -> 标记彻底删除
        if (!isRecurring && t.status === TaskStatus.COMPLETED) {
          tasksToDelete.push(t.id);
          return acc; 
        }

        // 逻辑 B: 处理重置
        let newStatus = t.status;
        let shouldClearMessages = false;

        // 如果是循环任务，或者该任务属于今天
        if (!isRecurring || (t.frequency && t.frequency.includes(todayName))) {
          // 非 Penalty 状态的，全部回滚到 TODO
          if (t.status !== TaskStatus.PENALTY) { 
             newStatus = TaskStatus.TODO;
             shouldClearMessages = true;
          }
        }

        acc.push({ 
          ...t, 
          status: newStatus, 
          messages: shouldClearMessages ? [] : t.messages 
        });
        return acc;
      }, []);

      try {
        // 1. 执行云端物理删除
        for (const id of tasksToDelete) {
          await db.deleteTask(id);
        }
        
        // 2. 🔥 显式保存更新后的任务状态 (因为移除了自动保存 Effect)
        // 这里使用批量保存是安全的，因为这是基于最新状态计算出来的
        await db.saveTasks(updatedTasks);
        
        // 3. 更新本地状态 (其实 subscribeTasks 也会推回来，但为了 UI 立即响应可以先 set)
        setTasks(updatedTasks);
        setCurrentDay(todayName);
        
        // 4. 更新用户信息
        setUser(prev => ({ 
          ...prev, 
          lastCleanupDate: todayStr, 
          todayScore: 0 
        }));
        
        console.log(`🌙 清理/补救完成 [${todayStr}]`);
      } catch (e) {
        console.error("清理同步失败:", e);
      }
    };

    // A. 启动时立即检查一次日期
    performCleanup();

    // B. 设置定时器监控下一个午夜 00:00:01
    const getMsToMidnight = () => {
      const now = new Date();
      const night = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      return night.getTime() - now.getTime();
    };

    const timerId = setTimeout(() => {
      performCleanup();
    }, getMsToMidnight());

    return () => clearTimeout(timerId);
  }, [isLoaded, user.lastCleanupDate, tasks]); // 依赖 tasks 确保清理时基于最新数据


  // --- 业务处理器 ---

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

    // 1. 本地乐观更新 (让 UI 反应快)
    setTasks(prev => {
        const exists = prev.find(t => t.id === updatedTask.id);
        if (exists) {
            return prev.map(t => t.id === updatedTask.id ? finalTask : t);
        } else {
            return [...prev, finalTask];
        }
    });
    
    // 2. 🔥 立即同步单条数据到云端 (更安全，不会覆盖其他任务)
    db.saveTask(finalTask);
    
    // 处理积分逻辑
    const oldTask = tasks.find(t => t.id === updatedTask.id);
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

  const handleDeleteTask = async (taskId: string) => {
    // 本地更新
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
    
    // 云端同步
    if (!taskId.startsWith('new_')) {
      try {
        await db.deleteTask(taskId);
      } catch (error) {
        console.error("删除云端数据失败");
      }
    }
  };

  const handlePunishTask = (task: Task) => {
      const penaltyValue = Math.abs(task.points);

      const pointLog: PointLog = {
          id: `pl_${Date.now()}`,
          reason: `Penalty: ${task.title}`,
          change: -penaltyValue, 
          timestamp: Date.now()
      };
      setUser(prev => ({
        ...prev,
        score: prev.score - penaltyValue,    
        todayScore: prev.todayScore - penaltyValue,
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
          messages: [],
          frequency: [] 
      };
      setSelectedTask(newTask);
  };

  const handleCloseTaskModal = () => {
      setSelectedTask(null);
  };

  // --- 渲染界面 ---

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
      <header className="bg-white border-b-2 border-slate-100 sticky top-0 z-10">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-lg rotate-3">
                <LayoutDashboard className="text-indigo-600" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1">
                  LevelUp <Sparkles size={16} className="text-yellow-400" />
                </h1>
                <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-500 font-bold tracking-wider uppercase">{user.role}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 md:hidden">
                 <button onClick={handleLogout} className="text-slate-400">
                    <LogOut size={20} />
                </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-4 md:gap-8 w-full md:w-auto">
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