import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Task, UserRole, TaskStatus, Message, MessageType, DayOfWeek } from '../types';
import { Button } from './Button';
import { Send, Upload, CheckCircle, XCircle, RotateCcw, AlertTriangle, Save, Calendar, Gavel, Edit2, Trash2 } from 'lucide-react';

export interface TaskDetailHandle {
  isDirty: () => boolean;
  save: () => void;
}

interface TaskDetailProps {
  task: Task;
  userRole: UserRole;
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
  onPunish: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TaskDetail = forwardRef<TaskDetailHandle, TaskDetailProps>(({ task, userRole, onUpdateTask, onClose, onPunish, onDelete }, ref) => {
  const isNewTask = task.id.startsWith('new_');
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(isNewTask);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Editable Fields
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [points, setPoints] = useState(task.points);
  const [frequency, setFrequency] = useState<DayOfWeek[]>(task.frequency || []);
  const [category, setCategory] = useState(task.category);
  const [status, setStatus] = useState(task.status);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 修改 1: 移除权限守卫逻辑，管理员在任何状态下都可以修改和删除 ---
  const canModify = userRole === UserRole.ADMIN || isNewTask;

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setPoints(task.points);
    setFrequency(task.frequency || []);
    setCategory(task.category);
    setStatus(task.status);
    setIsEditing(task.id.startsWith('new_'));
    setShowDeleteConfirm(false);
  }, [task]);

  const checkDirty = () => {
    return (
      title !== task.title ||
      description !== task.description ||
      points !== task.points ||
      category !== task.category ||
      status !== task.status ||
      JSON.stringify(frequency.sort()) !== JSON.stringify((task.frequency || []).sort())
    );
  };

  const handleSaveEdit = () => {
    onUpdateTask({
        ...task,
        title,
        description,
        points,
        category,
        frequency,
        status
    });
    if (isNewTask) {
        onClose();
    }
  };

  const handleToggleEdit = () => {
      if (isEditing) {
          handleSaveEdit();
          setIsEditing(false);
      } else {
          setIsEditing(true);
      }
  };

  useImperativeHandle(ref, () => ({
    isDirty: checkDirty,
    save: handleSaveEdit
  }));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task.messages]);

  const handleSendMessage = (overrideStatus?: TaskStatus) => {
    if (!inputText.trim() && !selectedImage && !overrideStatus) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: userRole,
      type: selectedImage ? MessageType.IMAGE : MessageType.TEXT,
      content: selectedImage || inputText,
      timestamp: Date.now()
    };

    let newStatus = task.status;
    
    if (userRole === UserRole.CLIENT) {
      if (task.status === TaskStatus.TODO || task.status === TaskStatus.TRY_AGAIN) {
        newStatus = TaskStatus.REVIEW;
      }
    } else if (userRole === UserRole.ADMIN && overrideStatus) {
      newStatus = overrideStatus;
    }

    const updatedTask = {
      ...task,
      status: newStatus,
      messages: (inputText || selectedImage) ? [...task.messages, newMessage] : task.messages
    };

    onUpdateTask(updatedTask);
    setInputText('');
    setSelectedImage(null);
    
    if (overrideStatus === TaskStatus.COMPLETED || overrideStatus === TaskStatus.PENALTY) {
      onClose();
    }
  };

  const handlePunishClick = () => {
      if (inputText || selectedImage) {
          const newMessage: Message = {
            id: Date.now().toString(),
            sender: userRole,
            type: selectedImage ? MessageType.IMAGE : MessageType.TEXT,
            content: selectedImage || inputText,
            timestamp: Date.now()
          };
           onUpdateTask({
              ...task,
              messages: [...task.messages, newMessage]
          });
      }
      onPunish(task);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (showDeleteConfirm) {
          onDelete(task.id);
      } else {
          setShowDeleteConfirm(true);
          setTimeout(() => setShowDeleteConfirm(false), 3000);
      }
  };

  const toggleDay = (day: DayOfWeek) => {
    if (!isEditing) return;
    if (frequency.includes(day)) {
        setFrequency(prev => prev.filter(d => d !== day));
    } else {
        setFrequency(prev => [...prev, day]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderStatusBadge = (status: TaskStatus) => {
    const colors = {
      [TaskStatus.TODO]: 'bg-slate-100 text-slate-700',
      [TaskStatus.REVIEW]: 'bg-amber-100 text-amber-700',
      [TaskStatus.COMPLETED]: 'bg-emerald-100 text-emerald-700',
      [TaskStatus.TRY_AGAIN]: 'bg-blue-100 text-blue-700',
      [TaskStatus.PENALTY]: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${colors[status]}`}>{status.replace('_', ' ')}</span>;
  };

  // --- 修改 2: 开放所有状态供管理员编辑时选择 ---
  const allStatuses = Object.values(TaskStatus);

  return (
    <div className="flex flex-col h-[650px]">
      <div className={`p-6 bg-white relative ${!isNewTask ? 'border-b-2 border-slate-100' : 'flex-1 overflow-y-auto'}`}>
        {(userRole === UserRole.ADMIN && isEditing) ? (
            <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Title</label>
                   <input 
                      value={title}
                      disabled={!isEditing}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-xl font-black p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
                      placeholder="Task Title"
                      autoFocus={isNewTask}
                  />
                </div>
                
                <div className="flex gap-4 items-start flex-wrap">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Points</label>
                        <input 
                            type="number"
                            value={points}
                            disabled={!isEditing}
                            onChange={(e) => setPoints(Number(e.target.value))}
                            className="w-24 font-bold p-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
                        />
                    </div>
                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                        <select 
                            value={status}
                            disabled={!isEditing}
                            onChange={(e) => setStatus(e.target.value as TaskStatus)}
                            className="font-bold p-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
                        >
                            {allStatuses.map(s => (
                                <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category</label>
                        <input 
                            value={category}
                            disabled={!isEditing}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full font-bold p-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
                            placeholder="e.g. Daily, Work"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Description</label>
                    <textarea 
                        value={description}
                        disabled={!isEditing}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none text-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100 ${isNewTask ? 'min-h-[150px]' : 'min-h-[80px]'}`}
                        placeholder="Task Description..."
                    />
                </div>
                
                <div>
                     <label className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        <Calendar size={12} /> Frequency
                     </label>
                     <div className="flex gap-2">
                        {DAYS.map(day => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                disabled={!isEditing}
                                className={`w-10 h-10 rounded-xl text-xs font-bold transition-all border-2 disabled:cursor-not-allowed disabled:opacity-70 ${
                                    frequency.includes(day)
                                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-200 disabled:hover:border-slate-200'
                                }`}
                            >
                                {day.charAt(0)}
                            </button>
                        ))}
                     </div>
                </div>
            </div>
        ) : (
            <>
                <div className="flex justify-between items-start mb-2 pr-8">
                    <div className="flex items-center gap-2">
                        {renderStatusBadge(task.status)}
                    </div>
                    <span className={`font-bold text-lg ${task.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {task.points > 0 ? '+' : ''}{task.points} pts
                    </span>
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-2">{task.title}</h2>
                <p className="text-slate-600 leading-relaxed mb-4 font-medium">{task.description}</p>
                {task.frequency && task.frequency.length > 0 && (
                    <div className="flex gap-1 mt-2">
                        {DAYS.map(day => (
                            <div key={day} className={`text-[10px] w-6 h-6 flex items-center justify-center rounded-lg font-bold border-2 ${
                                task.frequency?.includes(day) ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'text-slate-300 border-transparent bg-slate-50'
                            }`}>
                                {day.charAt(0)}
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}
      </div>

      {!isNewTask && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
            {task.messages.length === 0 && (
              <div className="text-center text-slate-300 italic py-10">
                No history yet. {userRole === UserRole.CLIENT ? 'Submit your work below.' : 'Waiting for submission.'}
              </div>
            )}
            {task.messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender === userRole ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl p-3 border-2 ${
                  msg.sender === userRole 
                    ? 'bg-indigo-50 border-indigo-100 text-indigo-900 rounded-tr-none' 
                    : 'bg-slate-50 border-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  <div className="text-xs opacity-70 mb-1 font-bold flex justify-between gap-4">
                    <span>{msg.sender}</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  
                  {msg.type === MessageType.IMAGE ? (
                    <img src={msg.content} alt="Upload" className="rounded-xl max-h-48 object-cover border-2 border-white" />
                  ) : (
                    <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
      )}

      <div className="p-4 bg-white border-t-2 border-slate-100">
        {isNewTask ? (
             <Button 
                onClick={handleSaveEdit} 
                className="w-full h-12 text-lg shadow-lg shadow-indigo-200"
            >
                <Save size={20} className="mr-2" /> Save Task
            </Button>
        ) : (
            <>
                <div className="mb-4">
                  {selectedImage && (
                    <div className="relative inline-block mb-2">
                      <img src={selectedImage} alt="Selected" className="h-20 w-20 object-cover rounded-xl border-2 border-slate-200" />
                      <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 shadow-sm"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors border-2 border-transparent hover:border-slate-100"
                      title="Upload Image"
                    >
                      <Upload size={20} />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                    />
                    <textarea
                      className="flex-1 p-2 border-2 border-slate-200 rounded-xl resize-none focus:border-indigo-500 focus:outline-none transition-colors font-medium"
                      rows={2}
                      placeholder={userRole === UserRole.CLIENT ? "Describe your work or add comments..." : "Provide feedback..."}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    {/* --- 修改 3: 管理员始终显示删除和编辑按钮 --- */}
                    {userRole === UserRole.ADMIN && (
                      <div className="flex gap-2">
                        <Button 
                            type="button"
                            variant="danger" 
                            onClick={handleDeleteClick}
                            className={`relative z-10 transition-all duration-200 ${showDeleteConfirm ? 'w-auto px-4' : 'px-3'}`}
                            title="Delete Task"
                          >
                            {showDeleteConfirm ? (
                                <span className="text-xs font-bold whitespace-nowrap">Confirm?</span>
                            ) : (
                                <Trash2 size={16} />
                            )}
                          </Button>
                        
                        <Button 
                          type="button"
                          variant={isEditing ? 'success' : 'secondary'} 
                          onClick={handleToggleEdit}
                          className="min-w-[100px]"
                        >
                          {isEditing ? <Save size={16} className="mr-2"/> : <Edit2 size={16} className="mr-2"/>}
                          {isEditing ? 'Save' : 'Edit'}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    {userRole === UserRole.CLIENT && (
                      <Button 
                        onClick={() => handleSendMessage()}
                        disabled={(!inputText && !selectedImage) || task.status === TaskStatus.COMPLETED || task.status === TaskStatus.REVIEW}
                        className="w-full sm:w-auto"
                      >
                        {task.status === TaskStatus.REVIEW ? 'Under Review' : 'Submit Work'} <Send size={16} className="ml-2" />
                      </Button>
                    )}

                    {userRole === UserRole.ADMIN && (
                      <>
                        {task.status === TaskStatus.REVIEW ? (
                          <div className="flex gap-2">
                             <Button 
                              variant="secondary" 
                              size="md"
                              onClick={() => handleSendMessage(TaskStatus.TODO)}
                              title="Revert to Todo"
                            >
                              <RotateCcw size={18} />
                            </Button>
                            <Button 
                              size="md" 
                              className="bg-amber-400 text-amber-950 border-amber-500 hover:bg-amber-500 hover:border-amber-600 font-black"
                              onClick={() => handleSendMessage(TaskStatus.TRY_AGAIN)}
                              title="Try Again"
                            >
                              <AlertTriangle size={18} />
                            </Button>
                             <Button 
                              variant="success" 
                              size="md"
                              onClick={() => handleSendMessage(TaskStatus.COMPLETED)}
                              title="Approve"
                            >
                              <CheckCircle size={18} />
                            </Button>
                          </div>
                        ) : task.status === TaskStatus.PENALTY ? (
                           <Button 
                            onClick={handlePunishClick} 
                            variant="danger"
                            className="w-full sm:w-auto"
                          >
                            Punish <Gavel size={16} className="ml-2" />
                          </Button>
                        ) : (
                           <Button 
                            onClick={() => handleSendMessage()} 
                            disabled={!inputText && !selectedImage}
                          >
                            Send Note <Send size={16} className="ml-2" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
});

TaskDetail.displayName = "TaskDetail";