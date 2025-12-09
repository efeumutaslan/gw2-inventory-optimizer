import { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useInventory } from '../context/InventoryContext';
import ItemCard from './ItemCard';

function BagSlot({ bagId, slotIndex, item, onRemove }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `bag-${bagId}-slot-${slotIndex}`,
    data: { bagId, slotIndex }
  });
  
  return (
    <div ref={setNodeRef} className={`bag-slot ${!item ? 'empty' : ''} ${isOver ? 'drop-target' : ''}`}>
      {item ? (
        <div className="relative w-full h-full">
          <ItemCard item={item} isDraggable={false} showSource={false} size="small" />
          <button
            onClick={() => onRemove(bagId, slotIndex)}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600 z-10"
          >×</button>
        </div>
      ) : (
        <span className="text-gray-600 text-xs">{slotIndex + 1}</span>
      )}
    </div>
  );
}

function Bag({ bag, onRemoveItem, onRemoveBag, onRenameBag }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(bag.name);
  const filledSlots = bag.slots.filter(Boolean).length;
  
  const handleSaveName = () => { onRenameBag(bag.id, editName); setIsEditing(false); };
  
  return (
    <div className="bg-gw2-darker/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        {isEditing ? (
          <input
            type="text" value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            className="input-field text-sm w-32" autoFocus
          />
        ) : (
          <h4 className="font-medium text-white cursor-pointer hover:text-gw2-accent" onClick={() => setIsEditing(true)}>{bag.name}</h4>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{filledSlots}/{bag.size}</span>
          <button onClick={() => onRemoveBag(bag.id)} className="text-red-400 hover:text-red-300 text-sm">Sil</button>
        </div>
      </div>
      
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: bag.size }).map((_, slotIndex) => (
          <BagSlot key={slotIndex} bagId={bag.id} slotIndex={slotIndex} item={bag.slots[slotIndex]} onRemove={onRemoveItem} />
        ))}
      </div>
    </div>
  );
}

export default function BagPlanner() {
  const { bagPlan, updateBagPlan, clearBagPlan } = useInventory();
  const [newBagSize, setNewBagSize] = useState(20);
  
  const stats = useMemo(() => {
    const totalSlots = bagPlan.reduce((sum, bag) => sum + bag.size, 0);
    const usedSlots = bagPlan.reduce((sum, bag) => sum + bag.slots.filter(Boolean).length, 0);
    return { totalSlots, usedSlots, freeSlots: totalSlots - usedSlots };
  }, [bagPlan]);
  
  const addBag = () => {
    const newBag = { id: `bag-${Date.now()}`, name: `Çanta ${bagPlan.length + 1}`, size: newBagSize, slots: Array(newBagSize).fill(null) };
    updateBagPlan([...bagPlan, newBag]);
  };
  
  const removeBag = (bagId) => updateBagPlan(bagPlan.filter(bag => bag.id !== bagId));
  
  const renameBag = (bagId, newName) => updateBagPlan(bagPlan.map(bag => bag.id === bagId ? { ...bag, name: newName } : bag));
  
  const removeItem = (bagId, slotIndex) => {
    updateBagPlan(bagPlan.map(bag => {
      if (bag.id === bagId) {
        const newSlots = [...bag.slots];
        newSlots[slotIndex] = null;
        return { ...bag, slots: newSlots };
      }
      return bag;
    }));
  };
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-700 bg-gw2-dark/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Çanta Planlayıcı</h2>
          {bagPlan.length > 0 && <button onClick={clearBagPlan} className="text-sm text-red-400 hover:text-red-300">Planı Temizle</button>}
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-gray-400">Toplam: <span className="text-white">{stats.totalSlots}</span></span>
          <span className="text-gray-400">Dolu: <span className="text-white">{stats.usedSlots}</span></span>
          <span className="text-gray-400">Boş: <span className="text-green-400">{stats.freeSlots}</span></span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {bagPlan.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="mb-2">Henüz çanta eklenmemiş</p>
            <p className="text-sm">Aşağıdan yeni çanta ekleyin ve item'ları sürükleyin</p>
          </div>
        ) : (
          bagPlan.map(bag => <Bag key={bag.id} bag={bag} onRemoveItem={removeItem} onRemoveBag={removeBag} onRenameBag={renameBag} />)
        )}
      </div>
      
      <div className="p-4 border-t border-gray-700 bg-gw2-dark/30">
        <div className="flex gap-2">
          <select value={newBagSize} onChange={(e) => setNewBagSize(Number(e.target.value))} className="input-field text-sm flex-1">
            {[8, 10, 12, 15, 18, 20, 24, 28, 32].map(size => <option key={size} value={size}>{size} Slot</option>)}
          </select>
          <button onClick={addBag} className="btn-primary text-sm">+ Çanta Ekle</button>
        </div>
        
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500">Hızlı:</span>
          <button
            onClick={() => {
              const bags = Array.from({ length: 5 }).map((_, i) => ({
                id: `bag-${Date.now()}-${i}`, name: `Çanta ${bagPlan.length + i + 1}`, size: 32, slots: Array(32).fill(null)
              }));
              updateBagPlan([...bagPlan, ...bags]);
            }}
            className="text-xs text-gw2-accent hover:underline"
          >5×32 Slot</button>
          <button
            onClick={() => {
              const bags = [
                { id: `bag-${Date.now()}-0`, name: 'Ana Çanta', size: 20, slots: Array(20).fill(null) },
                ...Array.from({ length: 4 }).map((_, i) => ({
                  id: `bag-${Date.now()}-${i + 1}`, name: `Çanta ${i + 2}`, size: 32, slots: Array(32).fill(null)
                }))
              ];
              updateBagPlan([...bagPlan, ...bags]);
            }}
            className="text-xs text-gw2-accent hover:underline"
          >Standart (1×20 + 4×32)</button>
        </div>
      </div>
    </div>
  );
}
