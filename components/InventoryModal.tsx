import React from 'react';
import { Modal } from './Modal';
import { ShopItem, UserRole, Transaction } from '../types';
import { PackageOpen, Clock, CheckCircle2, ShoppingBag } from 'lucide-react';
import { Button } from './Button';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryIds: string[];
  shopItems: ShopItem[];
  userRole: UserRole;
  onRedeem: (item: ShopItem) => void;
  history: Transaction[];
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose, inventoryIds, shopItems, userRole, onRedeem, history }) => {
  // Map IDs to Items
  const inventoryItems = inventoryIds
    .map(id => shopItems.find(item => item.id === id))
    .filter((item): item is ShopItem => !!item);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={userRole === UserRole.ADMIN ? "User Inventory & History" : "My Inventory 🎒"}>
      <div className="flex flex-col h-[600px]">
        {/* Inventory Section */}
        <div className="flex-1 overflow-y-auto p-6 bg-white border-b-2 border-slate-100">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Active Items</h3>
           
           {inventoryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <PackageOpen size={48} className="mb-4 opacity-50" />
                <p className="font-bold">Inventory is empty.</p>
                {userRole === UserRole.CLIENT && <p className="text-sm">Visit the shop to redeem points!</p>}
              </div>
           ) : (
             <div className="grid grid-cols-1 gap-3">
               {inventoryItems.map((item, index) => (
                  <div 
                   key={`${item.id}-${index}`} 
                   className="bg-white rounded-xl p-3 border-2 border-indigo-100 flex items-center gap-4 justify-between"
                 >
                   <div className="flex items-center gap-4">
                       <div className="text-2xl bg-indigo-50 w-12 h-12 flex items-center justify-center rounded-lg border border-indigo-100">
                           {item.emoji}
                       </div>
                       <div>
                           <h3 className="font-bold text-slate-800">{item.name}</h3>
                           <p className="text-xs text-slate-500">{item.description}</p>
                       </div>
                   </div>
                   
                   {userRole === UserRole.ADMIN && (
                       <Button 
                           size="sm" 
                           onClick={() => onRedeem(item)}
                           className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-sm"
                       >
                           Redeem
                       </Button>
                   )}
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* History Section */}
        <div className="h-1/2 overflow-y-auto p-6 bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={12} /> Transaction Log
            </h3>
            
            {history.length === 0 ? (
                 <div className="text-center text-slate-300 text-sm italic py-4">No history yet.</div>
            ) : (
                <div className="space-y-3">
                    {history.map(log => (
                        <div key={log.id} className="flex items-center justify-between text-sm bg-white p-3 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-full ${
                                    log.type === 'PURCHASE' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                    {log.type === 'PURCHASE' ? <ShoppingBag size={14} /> : <CheckCircle2 size={14} />}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700 flex items-center gap-1">
                                        <span>{log.itemEmoji}</span>
                                        <span>{log.itemName}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <div className={`font-black ${
                                log.type === 'PURCHASE' ? 'text-red-400' : 'text-slate-400'
                            }`}>
                                {log.type === 'PURCHASE' ? `-${log.cost}` : 'USED'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </Modal>
  );
};
