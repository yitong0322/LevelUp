import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  Firestore 
} from "firebase/firestore";
import { Task, User, ShopItem } from '../types';
import { INITIAL_TASKS, INITIAL_USER, INITIAL_SHOP_ITEMS } from '../constants';

// --- 1. 配置信息 ---
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

  // 获取所有任务
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

  // 批量保存任务
  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      for (const task of tasks) {
        // 使用 task.id 作为文档名
        const docRef = doc(this.db, "tasks", task.id);
        await setDoc(docRef, task, { merge: true });
      }
    } catch (e) {
      console.error("保存任务失败", e);
    }
  }

  // 获取用户属性 (金币、经验、等级)
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

  // 保存用户属性
  async saveUser(user: User): Promise<void> {
    try {
      const docRef = doc(this.db, "users", "default_player");
      await setDoc(docRef, user, { merge: true });
    } catch (e) {
      console.error("保存用户信息失败", e);
    }
  }

  // 获取商店物品 (对应你截图中的 config -> shop 路径)
  async getShopItems(): Promise<ShopItem[]> {
    try {
      const docRef = doc(this.db, "config", "shop");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.items as ShopItem[];
      }
      return INITIAL_SHOP_ITEMS;
    } catch (e) {
      console.error("获取商店物品失败", e);
      return INITIAL_SHOP_ITEMS;
    }
  }

  // 保存商店配置
  async saveShopItems(items: ShopItem[]): Promise<void> {
    try {
      const docRef = doc(this.db, "config", "shop");
      await setDoc(docRef, { items }, { merge: true });
    } catch (e) {
      console.error("更新商店失败", e);
    }
  }
}

// --- 4. 导出单例 ---
export const db = new FirebaseAdapter();