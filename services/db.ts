import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  onSnapshot, // 🔥 新增：用于实时监听
  query,      // 🔥 新增：用于构建查询
  Firestore,
  Unsubscribe // 🔥 新增：监听器的类型
} from "firebase/firestore";
import { Task, User, ShopItem } from '../types';
import { INITIAL_TASKS, INITIAL_USER, INITIAL_SHOP_ITEMS } from '../constants';

// --- 1. Firebase 配置 ---
const firebaseConfig = {
  apiKey: "AIzaSyAJQt_oKpW2XzXAq62cGhGr51UbYVAmR64",
  authDomain: "levelup-43fca.firebaseapp.com",
  projectId: "levelup-43fca",
  storageBucket: "levelup-43fca.firebasestorage.app",
  messagingSenderId: "912080606510",
  appId: "1:912080606510:web:7e6683b006503013fb16bf",
  measurementId: "G-VNE6RXS1D8"
};

// --- 2. 接口定义 ---
export interface DatabaseAdapter {
  init(): Promise<void>;
  getAuth(): Promise<boolean>;
  setAuth(isAuthenticated: boolean): Promise<void>;
  
  // 任务相关
  getTasks(): Promise<Task[]>; // (旧) 一次性获取
  subscribeTasks(callback: (tasks: Task[]) => void): Unsubscribe; // (新) 实时监听
  saveTasks(tasks: Task[]): Promise<void>; // (旧) 批量保存
  saveTask(task: Task): Promise<void>; // (新) 单个保存，更安全
  deleteTask(taskId: string): Promise<void>; 

  // 用户相关
  getUser(): Promise<User>;
  subscribeUser(callback: (user: User) => void): Unsubscribe; // (新) 实时监听用户
  saveUser(user: User): Promise<void>;

  // 商店相关
  getShopItems(): Promise<ShopItem[]>;
  saveShopItems(items: ShopItem[]): Promise<void>;
}

// --- 3. Firebase 适配器实现 ---
class FirebaseAdapter implements DatabaseAdapter {
  private db!: Firestore;
  private auth = false;

  async init(): Promise<void> {
    try {
      const app = initializeApp(firebaseConfig);
      this.db = getFirestore(app);
      console.log('✅ Firebase 链接成功');
    } catch (error) {
      console.error('❌ Firebase 初始化失败:', error);
    }
  }

  async getAuth(): Promise<boolean> {
    return this.auth;
  }

  async setAuth(isAuthenticated: boolean): Promise<void> {
    this.auth = isAuthenticated;
  }

  // --- 任务管理 (Real-time Upgrade) ---

  // 🔥 核心方法：实时监听任务变化
  // 当 iPad 修改数据时，这个 callback 会自动在电脑端被触发
  subscribeTasks(callback: (tasks: Task[]) => void): Unsubscribe {
    // 监听 'tasks' 集合
    const q = query(collection(this.db, "tasks"));
    
    // onSnapshot 会建立长连接
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Task[];
      
      // 如果数据库是空的，不返回空数组，避免冲掉初始数据
      if (tasks.length > 0) {
        callback(tasks);
      }
    }, (error) => {
      console.error("❌ 任务监听断开:", error);
    });

    return unsubscribe; // 返回这个函数用于取消监听
  }

  // (旧方法保持兼容)
  async getTasks(): Promise<Task[]> {
    try {
      const querySnapshot = await getDocs(collection(this.db, "tasks"));
      if (querySnapshot.empty) return INITIAL_TASKS;
      
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Task[];
    } catch (e) {
      console.warn("读取任务失败，使用初始数据", e);
      return INITIAL_TASKS;
    }
  }

  // 🔥 核心方法：只保存单个任务
  // 避免覆盖整个列表
  async saveTask(task: Task): Promise<void> {
    try {
      const docRef = doc(this.db, "tasks", task.id);
      await setDoc(docRef, task, { merge: true });
    } catch (e) {
      console.error(`❌ 保存单个任务 ${task.id} 失败`, e);
    }
  }

  // (旧方法保持兼容，但建议在 App.tsx 中减少调用)
  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      const promises = tasks.map(task => {
        const docRef = doc(this.db, "tasks", task.id);
        return setDoc(docRef, task, { merge: true });
      });
      await Promise.all(promises);
    } catch (e) {
      console.error("保存所有任务失败", e);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      const docRef = doc(this.db, "tasks", taskId);
      await deleteDoc(docRef);
      console.log(`🗑️ 任务 ${taskId} 已从云端删除`);
    } catch (e) {
      console.error("删除任务失败:", e);
      throw e;
    }
  }

  // --- 用户数据 (User) ---

  // (可选) 实时监听用户数据，比如金币变化
  subscribeUser(callback: (user: User) => void): Unsubscribe {
    const docRef = doc(this.db, "users", "default_player");
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as User);
      }
    });
  }

  async getUser(): Promise<User> {
    try {
      const docRef = doc(this.db, "users", "default_player");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as User;
      }
      return INITIAL_USER;
    } catch (e) {
      return INITIAL_USER;
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      const docRef = doc(this.db, "users", "default_player");
      await setDoc(docRef, user, { merge: true });
    } catch (e) {
      console.error("保存用户信息失败", e);
    }
  }

  // --- 商店管理 (Shop) ---
  
  async getShopItems(): Promise<ShopItem[]> {
    try {
      const docRef = doc(this.db, "config", "shop");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().items || INITIAL_SHOP_ITEMS;
      }
      return INITIAL_SHOP_ITEMS;
    } catch (e) {
      console.error("获取商店物品失败", e);
      return INITIAL_SHOP_ITEMS;
    }
  }

  async saveShopItems(items: ShopItem[]): Promise<void> {
    try {
      const docRef = doc(this.db, "config", "shop");
      await setDoc(docRef, { items }, { merge: true });
    } catch (e) {
      console.error("更新商店失败", e);
    }
  }
}

export const db = new FirebaseAdapter();