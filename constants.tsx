import { Task, TaskStatus, UserRole, MessageType, User, ShopItem } from './types';

export const PASSWORDS = {
  [UserRole.ADMIN]: '142857',
  [UserRole.CLIENT]: '123456'
};

export const INITIAL_USER: User = {
  role: UserRole.CLIENT,
  score: 0,
  todayScore: 0,
  inventory: [],
  history: [],
  pointLogs: [],
  lastCleanupDate: ''
};

export const INITIAL_SHOP_ITEMS: ShopItem[] = [

];

export const INITIAL_TASKS: Task[] = [];

// Clean Dopamine Block Style: Solid pastel backgrounds with matching strong borders.
export const COLUMN_CONFIG = [
  { id: TaskStatus.TODO, label: '待做 (To Do)', color: 'bg-pink-100 border-pink-300' },
  { id: TaskStatus.REVIEW, label: '待检查 (Review)', color: 'bg-purple-100 border-purple-300' },
  { id: TaskStatus.COMPLETED, label: '完成 (COMPLETED)', color: 'bg-lime-100 border-lime-300' },
  { id: TaskStatus.TRY_AGAIN, label: '下次努力 (Try Again)', color: 'bg-yellow-100 border-yellow-300' },
  { id: TaskStatus.PENALTY, label: '惩罚 (Penalty)', color: 'bg-red-100 border-red-300' },
];