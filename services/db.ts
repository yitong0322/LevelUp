import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  Firestore 
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
  getTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
  deleteTask(taskId: string): Promise<void>; // 新增删除接口
  getUser(): Promise<User>;
  saveUser(user: User): Promise<void>;
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

  // --- 任务管理 ---
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

  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      // 遍历保存每一个任务
      const promises = tasks.map(task => {
        const docRef = doc(this.db, "tasks", task.id);
        return setDoc(docRef, task, { merge: true });
      });
      await Promise.all(promises);
    } catch (e) {
      console.error("保存任务失败", e);
    }
  }

  // 🔥 解决删除同步问题的关键方法
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

  // --- 用户数据 ---
  async getUser(): Promise<User> {
    try {
      // 使用固定 ID 存储玩家数据
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

  // --- 商店管理 (匹配你截图中的 config/shop 结构) ---
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
      // 注意：这里必须以对象形式保存，因为 items 是文档里的一个字段
      await setDoc(docRef, { items }, { merge: true });
    } catch (e) {
      console.error("更新商店失败", e);
    }
  }
}

export const db = new FirebaseAdapter();