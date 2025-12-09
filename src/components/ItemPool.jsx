import { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { filterItems, sortItems, groupItems, CATEGORIES } from '../utils/categories';
import ItemCard from './ItemCard';

export default function ItemPool() {
  const { items, filters, sortBy, sortOrder } = useInventory();
  const [viewMode, setViewMode] = useState('grid');
  const [groupBy, setGroupBy] = useState('category');
  
  const processedItems = useMemo(() => {
    const filtered = filterItems(items, filters);
    return sortItems(filtered, sortBy, sortOrder);
  }, [items, filters, sortBy, sortOrder]);
  
  const groupedItems = useMemo(() => {
    if (viewMode !== 'grouped') return null;
    return groupItems(processedItems, groupBy);
  }, [processedItems, viewMode, groupBy]);
  
  const getGroupLabel = (key) => {
    switch (groupBy) {
      case 'category': return CATEGORIES[key]?.name || key;
      case 'source': return { 'character': 'Karakter', 'bank': 'Banka', 'materials': 'Material Storage', 'shared': 'Shared Inventory' }[key] || key;
      default: return key;
    }
  };
  
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-lg">Envanter yükleniyor...</p>
          <p className="text-sm">Lütfen bekleyin</p>
        </div>
      </div>
    );
  }
  
  if (processedItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-lg">Eşleşen item bulunamadı</p>
          <p className="text-sm">Filtrelerinizi değiştirmeyi deneyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gw2-dark/30">
        <span className="text-sm text-gray-400">{processedItems.length.toLocaleString()} item gösteriliyor</span>
        
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-600">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1 text-sm ${viewMode === 'grid' ? 'bg-gw2-accent text-gw2-darker' : 'bg-gw2-darker text-gray-400'}`}>Grid</button>
            <button onClick={() => setViewMode('grouped')} className={`px-3 py-1 text-sm ${viewMode === 'grouped' ? 'bg-gw2-accent text-gw2-darker' : 'bg-gw2-darker text-gray-400'}`}>Gruplu</button>
          </div>
          
          {viewMode === 'grouped' && (
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="input-field text-sm w-32">
              <option value="category">Kategori</option>
              <option value="rarity">Nadirlik</option>
              <option value="source">Kaynak</option>
              <option value="character">Karakter</option>
              <option value="type">Tür</option>
            </select>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-1">
            {processedItems.map((item, index) => (
              <ItemCard key={`${item.id}-${item.source}-${item.slotIndex || index}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems || {}).map(([groupKey, groupItems]) => (
              <div key={groupKey}>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  {CATEGORIES[groupKey]?.icon}
                  <span>{getGroupLabel(groupKey)}</span>
                  <span className="text-sm font-normal text-gray-500">({groupItems.length})</span>
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-1 p-3 bg-gw2-darker/30 rounded-lg">
                  {groupItems.map((item, index) => (
                    <ItemCard key={`${item.id}-${item.source}-${item.slotIndex || index}`} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
