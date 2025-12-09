import { useMemo, useState, useRef, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from '../context/I18nContext';
import { filterItems, sortItems, groupItems, CATEGORIES, RARITY_ORDER } from '../utils/categories';
import ItemCard from './ItemCard';

export default function ItemPool() {
  const { itemsWithLockStatus, filters, sortBy, sortOrder } = useInventory();
  const { t, language } = useTranslation();
  const [viewMode, setViewMode] = useState('grid');
  const [groupBy, setGroupBy] = useState('category');
  const [itemSize, setItemSize] = useState('normal'); // small, normal, large
  const scrollContainerRef = useRef(null);
  
  // Reset scroll position when view mode changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [viewMode, groupBy]);
  
  const processedItems = useMemo(() => {
    const filtered = filterItems(itemsWithLockStatus, filters);
    return sortItems(filtered, sortBy, sortOrder);
  }, [itemsWithLockStatus, filters, sortBy, sortOrder]);
  
  const groupedItems = useMemo(() => {
    if (viewMode !== 'grouped') return null;
    const groups = groupItems(processedItems, groupBy);
    
    // Sort groups by priority
    const sortedEntries = Object.entries(groups).sort((a, b) => {
      if (groupBy === 'rarity') {
        return (RARITY_ORDER[b[0]] || 0) - (RARITY_ORDER[a[0]] || 0);
      }
      return a[0].localeCompare(b[0]);
    });
    
    return Object.fromEntries(sortedEntries);
  }, [processedItems, viewMode, groupBy]);
  
  const getGroupLabel = (key) => {
    if (groupBy === 'category') {
      return CATEGORIES[key]?.name || key;
    }
    if (groupBy === 'source') {
      const sourceLabels = {
        'character': language === 'tr' ? 'Karakter' : 'Character',
        'bank': language === 'tr' ? 'Banka' : 'Bank',
        'materials': 'Material Storage',
        'shared': 'Shared Inventory'
      };
      return sourceLabels[key] || key;
    }
    if (groupBy === 'rarity') {
      const rarityLabels = {
        'Legendary': language === 'tr' ? 'Efsanevi' : 'Legendary',
        'Ascended': 'Ascended',
        'Exotic': language === 'tr' ? 'Egzotik' : 'Exotic',
        'Rare': language === 'tr' ? 'Nadir' : 'Rare',
        'Masterwork': language === 'tr' ? 'Usta İşi' : 'Masterwork',
        'Fine': language === 'tr' ? 'İyi' : 'Fine',
        'Basic': language === 'tr' ? 'Temel' : 'Basic',
        'Junk': language === 'tr' ? 'Çöp' : 'Junk'
      };
      return rarityLabels[key] || key;
    }
    if (groupBy === 'type') {
      const typeLabels = {
        'Weapon': language === 'tr' ? 'Silah' : 'Weapon',
        'Armor': language === 'tr' ? 'Zırh' : 'Armor',
        'Trinket': language === 'tr' ? 'Takı' : 'Trinket',
        'Back': language === 'tr' ? 'Sırt' : 'Back',
        'Consumable': language === 'tr' ? 'Tüketilebilir' : 'Consumable',
        'CraftingMaterial': language === 'tr' ? 'Craft Malzemesi' : 'Crafting Material',
        'UpgradeComponent': language === 'tr' ? 'Yükseltme' : 'Upgrade',
        'Container': language === 'tr' ? 'Konteyner' : 'Container',
        'Bag': language === 'tr' ? 'Çanta' : 'Bag',
        'MiniPet': 'Mini',
        'Gizmo': 'Gizmo',
        'Trophy': language === 'tr' ? 'Ganimet' : 'Trophy',
        'Gathering': language === 'tr' ? 'Toplama Aracı' : 'Gathering Tool',
        'Tool': language === 'tr' ? 'Alet' : 'Tool'
      };
      return typeLabels[key] || key;
    }
    // For character grouping, just return the key (character name)
    return key;
  };
  
  const getGroupIcon = (key) => {
    if (groupBy === 'category') return CATEGORIES[key]?.icon || '📦';
    if (groupBy === 'source') {
      return { 'character': '👤', 'bank': '🏦', 'materials': '🗄️', 'shared': '🔗' }[key] || '📦';
    }
    if (groupBy === 'rarity') {
      return { 'Legendary': '⭐', 'Ascended': '💎', 'Exotic': '🔶', 'Rare': '💛', 'Masterwork': '💚', 'Fine': '💙', 'Basic': '⚪', 'Junk': '⚫' }[key] || '📦';
    }
    if (groupBy === 'type') {
      return {
        'Weapon': '⚔️', 'Armor': '🛡️', 'Trinket': '💍', 'Back': '🎒',
        'Consumable': '🍖', 'CraftingMaterial': '🔨', 'UpgradeComponent': '💎',
        'Container': '📦', 'Bag': '👜', 'MiniPet': '🐾', 'Gizmo': '⚙️',
        'Trophy': '🏆', 'Gathering': '⛏️', 'Tool': '🔧'
      }[key] || '📦';
    }
    if (groupBy === 'character') {
      return '👤';
    }
    return '📦';
  };
  
  // Grid size classes based on item size
  const gridClasses = {
    small: 'grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1',
    normal: 'grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5',
    large: 'grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2'
  };
  
  const itemSizeMap = {
    small: 'small',
    normal: 'normal', 
    large: 'large'
  };
  
  // Empty states
  if (itemsWithLockStatus.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400 p-8">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-lg font-medium">{language === 'tr' ? 'Envanter yükleniyor...' : 'Loading inventory...'}</p>
          <p className="text-sm text-gray-500 mt-2">{language === 'tr' ? 'Lütfen bekleyin' : 'Please wait'}</p>
        </div>
      </div>
    );
  }
  
  if (processedItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400 p-8">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-lg font-medium">{language === 'tr' ? 'Eşleşen item bulunamadı' : 'No matching items found'}</p>
          <p className="text-sm text-gray-500 mt-2">{language === 'tr' ? 'Filtrelerinizi değiştirmeyi deneyin' : 'Try adjusting your filters'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-gray-700/50 flex items-center justify-between bg-gw2-dark/20">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            <span className="text-white font-medium">{processedItems.length.toLocaleString()}</span>
            {' '}{language === 'tr' ? 'item' : 'items'}
          </span>
          
          {/* Locked indicator */}
          {processedItems.filter(i => i.isLocked).length > 0 && (
            <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
              🔒 {processedItems.filter(i => i.isLocked).length}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Item Size */}
          <div className="flex items-center gap-1 bg-gw2-darker/50 rounded-lg p-0.5">
            {['small', 'normal', 'large'].map(size => (
              <button
                key={size}
                onClick={() => setItemSize(size)}
                className={`w-7 h-7 rounded flex items-center justify-center text-xs transition-all ${
                  itemSize === size ? 'bg-gw2-accent text-gw2-darker' : 'text-gray-400 hover:text-white'
                }`}
                title={size === 'small' ? 'S' : size === 'normal' ? 'M' : 'L'}
              >
                {size === 'small' ? '▫️' : size === 'normal' ? '◽' : '⬜'}
              </button>
            ))}
          </div>
          
          {/* View Mode */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`px-3 py-1.5 text-sm transition-all ${
                viewMode === 'grid' ? 'bg-gw2-accent text-gw2-darker' : 'bg-gw2-darker text-gray-400 hover:text-white'
              }`}
            >
              {language === 'tr' ? 'Grid' : 'Grid'}
            </button>
            <button 
              onClick={() => setViewMode('grouped')} 
              className={`px-3 py-1.5 text-sm transition-all ${
                viewMode === 'grouped' ? 'bg-gw2-accent text-gw2-darker' : 'bg-gw2-darker text-gray-400 hover:text-white'
              }`}
            >
              {language === 'tr' ? 'Gruplu' : 'Grouped'}
            </button>
          </div>
          
          {/* Group By (only when grouped) */}
          {viewMode === 'grouped' && (
            <select 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value)} 
              className="input-field text-sm w-32 h-8 py-0"
            >
              <option value="category">{language === 'tr' ? 'Kategori' : 'Category'}</option>
              <option value="rarity">{language === 'tr' ? 'Nadirlik' : 'Rarity'}</option>
              <option value="source">{language === 'tr' ? 'Kaynak' : 'Source'}</option>
              <option value="character">{language === 'tr' ? 'Karakter' : 'Character'}</option>
              <option value="type">{language === 'tr' ? 'Tür' : 'Type'}</option>
            </select>
          )}
        </div>
      </div>
      
      {/* Items */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        {viewMode === 'grid' ? (
          <div className={`grid ${gridClasses[itemSize]}`}>
            {processedItems.map((item, index) => (
              <ItemCard 
                key={`grid-${item.id}-${item.source}-${item.sourceName || 'none'}-${item.bagIndex ?? 'x'}-${item.slotIndex ?? index}`} 
                item={item}
                size={itemSizeMap[itemSize]}
                showLockToggle={true}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems || {}).map(([groupKey, groupItemsList]) => (
              <div key={`group-${groupKey}`} className="bg-gw2-darker/20 rounded-xl overflow-hidden">
                {/* Group Header */}
                <div className="px-4 py-3 bg-gw2-dark/30 border-b border-gray-700/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getGroupIcon(groupKey)}</span>
                    <h3 className="font-semibold text-white">{getGroupLabel(groupKey)}</h3>
                    <span className="text-sm text-gray-500">({groupItemsList.length})</span>
                  </div>
                  
                  {/* Group stats */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {groupItemsList.filter(i => i.isLocked).length > 0 && (
                      <span className="text-yellow-500">
                        🔒 {groupItemsList.filter(i => i.isLocked).length}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Group Items */}
                <div className={`grid ${gridClasses[itemSize]} p-3`}>
                  {groupItemsList.map((item, index) => (
                    <ItemCard 
                      key={`grouped-${groupKey}-${item.id}-${item.source}-${item.sourceName || 'none'}-${item.bagIndex ?? 'x'}-${item.slotIndex ?? index}`} 
                      item={item}
                      size={itemSizeMap[itemSize]}
                      showLockToggle={true}
                    />
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
