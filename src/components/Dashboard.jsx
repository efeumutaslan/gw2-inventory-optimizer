import { useEffect, useState } from 'react';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { useInventory } from '../context/InventoryContext';
import FilterSidebar from './FilterSidebar';
import ItemPool from './ItemPool';
import BagPlanner from './BagPlanner';
import OptimizationPanel from './OptimizationPanel';
import ItemCard from './ItemCard';

export default function Dashboard() {
  const { loadInventory, isLoading, loadingMessage, error, logout, filters, setFilters, bagPlan, updateBagPlan } = useInventory();
  const [rightPanel, setRightPanel] = useState(null); // null, 'planner', 'optimizer'
  const [activeItem, setActiveItem] = useState(null);
  
  useEffect(() => { loadInventory(); }, [loadInventory]);
  
  const handleDragStart = (event) => {
    if (event.active.data.current) setActiveItem(event.active.data.current);
  };
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveItem(null);
    
    if (!over || !active.data.current) return;
    
    const overId = over.id.toString();
    if (overId.startsWith('bag-') && overId.includes('-slot-')) {
      const parts = overId.split('-');
      const bagId = `${parts[0]}-${parts[1]}`;
      const slotIndex = parseInt(parts[3]);
      const item = active.data.current;
      
      updateBagPlan(bagPlan.map(bag => {
        if (bag.id === bagId) {
          const newSlots = [...bag.slots];
          if (!newSlots[slotIndex]) newSlots[slotIndex] = item;
          return { ...bag, slots: newSlots };
        }
        return bag;
      }));
    }
  };

  const togglePanel = (panel) => {
    setRightPanel(prev => prev === panel ? null : panel);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-gw2-dark/80 backdrop-blur border-b border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gw2-accent">GW2 Inventory Manager</h1>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Item ara..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ search: e.target.value })}
                  className="input-field w-64 pl-9 text-sm"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => togglePanel('optimizer')} 
                className={`btn-secondary text-sm ${rightPanel === 'optimizer' ? 'bg-gw2-accent text-gw2-darker' : ''}`}
              >
                🎯 Optimizasyon
              </button>
              <button 
                onClick={() => togglePanel('planner')} 
                className={`btn-secondary text-sm ${rightPanel === 'planner' ? 'bg-gw2-accent text-gw2-darker' : ''}`}
              >
                📦 Planlayıcı
              </button>
              <button onClick={loadInventory} disabled={isLoading} className="btn-secondary text-sm disabled:opacity-50">🔄 Yenile</button>
              <button onClick={logout} className="text-sm text-gray-400 hover:text-red-400">Çıkış</button>
            </div>
          </div>
        </header>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gw2-dark rounded-xl p-6 text-center">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p className="text-white">{loadingMessage || 'Yükleniyor...'}</p>
            </div>
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-2 text-red-400 text-sm">
            Hata: {error}
            <button onClick={loadInventory} className="ml-4 text-red-300 hover:underline">Tekrar dene</button>
          </div>
        )}
        
        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          <FilterSidebar />
          <div className="flex-1 flex">
            <div className="flex-1 flex flex-col overflow-hidden"><ItemPool /></div>
            {rightPanel === 'planner' && (
              <div className="w-96 border-l border-gray-700 bg-gw2-dark/30">
                <BagPlanner />
              </div>
            )}
            {rightPanel === 'optimizer' && (
              <div className="w-[450px] border-l border-gray-700">
                <OptimizationPanel />
              </div>
            )}
          </div>
        </div>
        
        {/* Drag overlay */}
        <DragOverlay>
          {activeItem && <div className="opacity-80"><ItemCard item={activeItem} isDraggable={false} showSource={false} /></div>}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
