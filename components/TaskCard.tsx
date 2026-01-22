import React from 'react';
import { Task, MessageType, TaskStatus } from '../types';
import { MessageSquare, Paperclip, Clock, Calendar } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const lastMessage = task.messages[task.messages.length - 1];
  const hasImage = task.messages.some(m => m.type === MessageType.IMAGE);

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO: return 'border-pink-200 hover:border-pink-400 bg-pink-50/30';
      case TaskStatus.REVIEW: return 'border-purple-200 hover:border-purple-400 bg-purple-50/30';
      case TaskStatus.COMPLETED: return 'border-lime-200 hover:border-lime-400 bg-lime-50/30';
      case TaskStatus.TRY_AGAIN: return 'border-yellow-200 hover:border-yellow-400 bg-yellow-50/30';
      case TaskStatus.PENALTY: return 'border-red-200 hover:border-red-400 bg-red-50/30';
      default: return 'border-slate-200 bg-slate-50';
    }
  };

  return (
    <div 
      onClick={() => onClick(task)}
      className={`p-4 rounded-xl border-2 ${getStatusColor(task.status)} cursor-pointer transition-all duration-200 hover:-translate-y-1 group`}
    >
      {/* Header: Title Left, Points Right */}
      <div className="flex justify-between items-start mb-2 gap-3">
        <h3 className="font-bold text-slate-800 leading-tight text-lg group-hover:text-indigo-600 transition-colors pt-0.5">
            {task.title}
        </h3>
        <span className={`text-sm font-black shrink-0 ${task.points >= 0 ? 'text-lime-600' : 'text-rose-500'}`}>
          {task.points > 0 ? '+' : ''}{task.points}
        </span>
      </div>
      
      <p className="text-sm text-slate-500 line-clamp-2 mb-3 font-medium">
        {task.description}
      </p>
      
      {/* Recurrence Indicators */}
      {task.frequency && task.frequency.length > 0 && (
        <div className="flex gap-1 mb-3">
             {task.frequency.map(d => (
                 <span key={d} className="text-[9px] font-black bg-white text-indigo-400 w-5 h-5 flex items-center justify-center rounded border border-indigo-100">
                     {d.charAt(0)}
                 </span>
             ))}
        </div>
      )}

      <div className="flex items-center justify-between text-slate-400 text-xs border-t-2 border-slate-100/50 pt-3">
        <div className="flex items-center gap-3">
          {task.messages.length > 0 && (
            <div className="flex items-center gap-1 font-bold text-indigo-400">
              <MessageSquare size={14} />
              <span>{task.messages.length}</span>
            </div>
          )}
          {hasImage && <Paperclip size={14} className="text-pink-400" />}
        </div>
        
        {lastMessage && (
           <div className="flex items-center gap-1 font-medium">
             <Clock size={14} />
             <span>
               {new Date(lastMessage.timestamp).toLocaleDateString([], {month:'short', day:'numeric'})}
             </span>
           </div>
        )}
      </div>
    </div>
  );
};