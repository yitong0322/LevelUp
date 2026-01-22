
export enum TaskStatus {
  TODO = 'TODO',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  TRY_AGAIN = 'TRY_AGAIN',
  PENALTY = 'PENALTY'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT'
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE'
}

export interface Message {
  id: string;
  sender: UserRole;
  type: MessageType;
  content: string; // Text content or Image URL
  timestamp: number;
}

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface Task {
  id: string;
  title: string;
  description: string;
  points: number; // Points awarded
  status: TaskStatus;
  category: string;
  frequency?: DayOfWeek[]; // Days the task repeats
  messages: Message[];
}

export type TransactionType = 'PURCHASE' | 'REDEEM';

export interface Transaction {
  id: string;
  type: TransactionType;
  itemId: string;
  itemName: string;
  itemEmoji: string;
  cost: number;
  timestamp: number;
}

export interface PointLog {
  id: string;
  reason: string;
  change: number;
  timestamp: number;
}

export interface User {
  role: UserRole;
  score: number;      // Total accumulated points (Currency)
  todayScore: number; // Points earned today
  inventory: string[]; // IDs of purchased items
  history: Transaction[]; // Log of shop interactions
  pointLogs: PointLog[]; // Log of all point changes for stats
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  description: string;
}
