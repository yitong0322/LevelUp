import { Task, User, ShopItem, UserRole } from '../types';
import { INITIAL_TASKS, INITIAL_USER, INITIAL_SHOP_ITEMS } from '../constants';

// Interface for our Database Adapter
export interface DatabaseAdapter {
  init(): Promise<void>;
  getAuth(): Promise<boolean>;
  setAuth(isAuthenticated: boolean): Promise<void>;
  getTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
  getUser(): Promise<User>;
  saveUser(user: User): Promise<void>;
  getShopItems(): Promise<ShopItem[]>;
  saveShopItems(items: ShopItem[]): Promise<void>;
}

// --- FIREBASE ADAPTER (Placeholder) ---
// This currently uses in-memory storage. 
// Data will reset on refresh until you implement the Firestore calls.
class FirebaseAdapter implements DatabaseAdapter {
  private auth = false;
  private tasks: Task[] = INITIAL_TASKS;
  private user: User = INITIAL_USER;
  private shopItems: ShopItem[] = INITIAL_SHOP_ITEMS;

  async init(): Promise<void> {
    // TODO: Initialize Firebase App here
    // import { initializeApp } from 'firebase/app';
    // import { getFirestore } from 'firebase/firestore';
    // const app = initializeApp(firebaseConfig);
    // const db = getFirestore(app);
    console.log('Firebase Adapter Initialized (Mock)');
    return Promise.resolve();
  }

  async getAuth(): Promise<boolean> {
    // TODO: Integration with Firebase Auth
    return this.auth;
  }

  async setAuth(isAuthenticated: boolean): Promise<void> {
    this.auth = isAuthenticated;
  }

  async getTasks(): Promise<Task[]> {
    // TODO: db.collection('tasks').get()...
    return this.tasks;
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    // TODO: Save tasks to Firestore
    this.tasks = tasks;
  }

  async getUser(): Promise<User> {
    // TODO: db.collection('users').doc(userId).get()...
    return this.user;
  }

  async saveUser(user: User): Promise<void> {
    // TODO: Save user stats to Firestore
    this.user = user;
  }

  async getShopItems(): Promise<ShopItem[]> {
    // TODO: Fetch shop config
    return this.shopItems;
  }

  async saveShopItems(items: ShopItem[]): Promise<void> {
    // TODO: Save shop config
    this.shopItems = items;
  }
}

// --- EXPORT ---
export const db = new FirebaseAdapter();