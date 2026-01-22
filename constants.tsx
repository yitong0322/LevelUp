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
  pointLogs: []
};

export const INITIAL_SHOP_ITEMS: ShopItem[] = [
  { id: '1', name: '游戏时间 1小时', cost: 150, emoji: '🎮', description: 'Exchange for 1 hour of uninterrupted gaming.' },
  { id: '2', name: '免做家务卡', cost: 500, emoji: '🧹', description: 'Skip one assigned chore for the day.' },
  { id: '3', name: '看电影券', cost: 400, emoji: '🎬', description: 'Pick the movie for movie night.' },
  { id: '4', name: '奶茶一杯', cost: 200, emoji: '🧋', description: 'Get a bubble tea of your choice.' },
  { id: '5', name: '现金奖励 $10', cost: 1000, emoji: '💵', description: 'Real money reward.' },
  { id: '6', name: '神秘大奖', cost: 2000, emoji: '🎁', description: 'A surprise gift from the Admin.' },
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