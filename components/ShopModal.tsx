import React, { useState } from 'react';
import { Modal } from './Modal';
import { User, ShopItem, UserRole } from '../types';
import { Button } from './Button';
import { Trophy, ShoppingBag, Check, Edit2, Trash2, Plus, Save, X } from 'lucide-react';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  shopItems: ShopItem[];
  onPurchase: (item: ShopItem) => void;
  onUpdateShop: (items: ShopItem[]) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, user, shopItems, onPurchase, onUpdateShop }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ShopItem>>({});
  const [isAdding, setIsAdding] = useState(false);

  // For adding new item
  const [newItem, setNewItem] = useState<Partial<ShopItem>>({
      name: '', cost: 100, emoji: '🎁', description: ''
  });

  const startEditing = (item: ShopItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const saveEdit = () => {
    const updatedItems = shopItems.map(item => 
        item.id === editingId ? { ...item, ...editForm } as ShopItem : item
    );
    onUpdateShop(updatedItems);
    setEditingId(null);
  };

  const deleteItem = (id: string) => {
    // Removed confirm dialog for direct deletion
    onUpdateShop(shopItems.filter(i => i.id !== id));
  };

  const handleAddItem = () => {
      const id = Date.now().toString();
      const itemToAdd = { ...newItem, id } as ShopItem;
      onUpdateShop([...shopItems, itemToAdd]);
      setIsAdding(false);
      setNewItem({ name: '', cost: 100, emoji: '🎁', description: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Points Shop 🛍️">
      <div className="p-6 bg-white min-h-[400px]">
        
        {/* User Balance Header */}
        <div className="bg-indigo-500 rounded-xl p-6 text-white mb-6 border-2 border-indigo-600 flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider mb-1">Current Balance</p>
            <div className="flex items-center gap-2 text-3xl font-black">
              <Trophy className="text-yellow-300 fill-yellow-300" />
              <span>{user.score}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-indigo-100 text-xs font-bold uppercase">Items Owned</p>
            <p className="text-2xl font-black">{user.inventory.length}</p>
          </div>
        </div>

        {/* Admin Add Button */}
        {user.role === UserRole.ADMIN && (
            <div className="mb-4 flex justify-end">
                <Button onClick={() => setIsAdding(!isAdding)} size="sm" variant={isAdding ? 'secondary' : 'primary'}>
                    {isAdding ? 'Cancel Add' : 'Add Item'} {isAdding ? <X size={14} className="ml-1"/> : <Plus size={14} className="ml-1"/>}
                </Button>
            </div>
        )}

        {/* Add Item Form */}
        {isAdding && (
            <div className="bg-white p-4 rounded-xl border-2 border-indigo-100 mb-4 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <input 
                        placeholder="Emoji" className="border-2 border-slate-200 p-2 rounded-lg font-bold" 
                        value={newItem.emoji} onChange={e => setNewItem({...newItem, emoji: e.target.value})}
                    />
                     <input 
                        type="number" placeholder="Cost" className="border-2 border-slate-200 p-2 rounded-lg font-bold" 
                        value={newItem.cost} onChange={e => setNewItem({...newItem, cost: Number(e.target.value)})}
                    />
                </div>
                <input 
                    placeholder="Name" className="border-2 border-slate-200 p-2 rounded-lg w-full mb-2 font-bold" 
                    value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
                />
                <input 
                    placeholder="Description" className="border-2 border-slate-200 p-2 rounded-lg w-full mb-2 text-sm" 
                    value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})}
                />
                <Button onClick={handleAddItem} className="w-full">Create Item</Button>
            </div>
        )}

        {/* Shop Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {shopItems.map((item) => {
            const canAfford = user.score >= item.cost;
            const isEditingThis = editingId === item.id;

            if (isEditingThis) {
                return (
                    <div key={item.id} className="bg-white rounded-xl p-4 border-2 border-indigo-500">
                        <div className="flex gap-2 mb-2">
                            <input 
                                className="w-12 text-2xl border-2 rounded text-center"
                                value={editForm.emoji}
                                onChange={e => setEditForm({...editForm, emoji: e.target.value})}
                            />
                            <input 
                                className="flex-1 font-bold border-2 rounded px-2"
                                value={editForm.name}
                                onChange={e => setEditForm({...editForm, name: e.target.value})}
                            />
                        </div>
                        <input 
                             type="number"
                             className="w-full mb-2 border-2 rounded px-2 py-1 text-sm"
                             value={editForm.cost}
                             onChange={e => setEditForm({...editForm, cost: Number(e.target.value)})}
                        />
                        <textarea 
                             className="w-full mb-2 border-2 rounded px-2 py-1 text-xs resize-none"
                             value={editForm.description}
                             onChange={e => setEditForm({...editForm, description: e.target.value})}
                        />
                        <div className="flex gap-2">
                            <Button size="sm" variant="success" className="flex-1" onClick={saveEdit}>Save</Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                    </div>
                )
            }

            return (
              <div 
                key={item.id} 
                className="bg-white rounded-xl p-4 border-2 border-slate-200 flex flex-col hover:border-indigo-500 transition-all duration-200 group relative"
              >
                {user.role === UserRole.ADMIN && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditing(item)} className="p-1.5 bg-slate-100 hover:bg-indigo-100 rounded-md text-slate-500 hover:text-indigo-600">
                            <Edit2 size={14} />
                        </button>
                         <button onClick={() => deleteItem(item.id)} className="p-1.5 bg-slate-100 hover:bg-rose-100 rounded-md text-slate-500 hover:text-rose-600">
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <span className="text-4xl mb-2 block">{item.emoji}</span>
                  <span className={`font-black px-2 py-1 rounded text-xs ${canAfford ? 'bg-lime-100 text-lime-700' : 'bg-red-100 text-red-700'}`}>
                    {item.cost} pts
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg">{item.name}</h3>
                <p className="text-xs text-slate-500 mb-4 flex-1">{item.description}</p>
                
                <Button 
                  onClick={() => onPurchase(item)}
                  disabled={!canAfford}
                  variant={canAfford ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full"
                >
                  {canAfford ? 'Redeem' : 'Need more pts'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};