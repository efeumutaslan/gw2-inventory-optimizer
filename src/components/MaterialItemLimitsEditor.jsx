import { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from '../context/I18nContext';
import { RARITY_COLORS } from '../utils/categories';

export default function MaterialItemLimitsEditor({ stackLimit, onClose }) {
  const { 
    items, 
    materialItemLimits, 
    setMaterialItemLimit, 
    removeMaterialItemLimit 
  } = useInventory();
  const { t, language } = useTranslation();
  
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Get unique material storage items from inventory
  const materialItems = useMemo(() => {
    const seen = new Map();
    
    items
      .filter(item => item.canGoToMaterialStorage && item.type === 'CraftingMaterial')
      .forEach(item => {
        if (!seen.has(item.id)) {
          seen.set(item.id, {
            id: item.id,
            name: item.name,
            icon: item.icon,
            rarity: item.rarity,
            totalCount: item.count || 1,
            customLimit: materialItemLimits[item.id] || null
          });
        } else {
          const existing = seen.get(item.id);
          existing.totalCount += (item.count || 1);
        }
      });
    
    return Array.from(seen.values())
      .sort((a, b) => {
        // Items with custom limits first
        if (a.customLimit && !b.customLimit) return -1;
        if (!a.customLimit && b.customLimit) return 1;
        // Then by name
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [items, materialItemLimits]);
  
  // Filter by search
  const filteredItems = useMemo(() => {
    if (!search) return materialItems;
    const searchLower = search.toLowerCase();
    return materialItems.filter(item => 
      item.name?.toLowerCase().includes(searchLower)
    );
  }, [materialItems, search]);
  
  // Items with custom limits
  const customLimitCount = useMemo(() => {
    return Object.keys(materialItemLimits).length;
  }, [materialItemLimits]);
  
  const startEditing = (item) => {
    setEditingItem(item.id);
    setEditValue(item.customLimit?.toString() || stackLimit.toString());
  };
  
  const saveLimit = (itemId) => {
    const value = parseInt(editValue);
    if (value && value > 0 && value <= 2750) {
      if (value === stackLimit) {
        // If same as default, remove custom limit
        removeMaterialItemLimit(itemId);
      } else {
        setMaterialItemLimit(itemId, value);
      }
    }
    setEditingItem(null);
    setEditValue('');
  };
  
  const removeLimit = (itemId) => {
    removeMaterialItemLimit(itemId);
    setEditingItem(null);
  };
  
  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gw2-dark rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎛️</span>
              {language === 'tr' ? 'Item Başına Limit' : 'Per-Item Limits'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {language === 'tr' 
                ? `Varsayılan: ${stackLimit} • ${customLimitCount} özel limit`
                : `Default: ${stackLimit} • ${customLimitCount} custom limits`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'tr' ? 'Item ara...' : 'Search items...'}
            className="input-field w-full"
          />
        </div>
        
        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {language === 'tr' 
                ? 'Material Storage\'a gidebilecek item bulunamadı.'
                : 'No items found that can go to Material Storage.'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map(item => (
                <div 
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gw2-darker/50 ${
                    item.customLimit ? 'bg-orange-500/10 border border-orange-500/30' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className="relative flex-shrink-0">
                    {item.icon ? (
                      <img 
                        src={item.icon} 
                        alt={item.name}
                        className="w-10 h-10 rounded"
                        style={{ border: `2px solid ${RARITY_COLORS[item.rarity] || '#888'}` }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">?</div>
                    )}
                  </div>
                  
                  {/* Name and count */}
                  <div className="flex-1 min-w-0">
                    <div 
                      className="text-sm font-medium truncate"
                      style={{ color: RARITY_COLORS[item.rarity] || '#FFF' }}
                    >
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {language === 'tr' ? 'Envanterde' : 'In inventory'}: {item.totalCount}
                    </div>
                  </div>
                  
                  {/* Limit editor */}
                  <div className="flex items-center gap-2">
                    {editingItem === item.id ? (
                      <>
                        <input
                          type="number"
                          min="1"
                          max="2750"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="input-field w-20 text-center text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveLimit(item.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <button
                          onClick={() => saveLimit(item.id)}
                          className="text-green-400 hover:text-green-300 p-1"
                          title={language === 'tr' ? 'Kaydet' : 'Save'}
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-red-400 hover:text-red-300 p-1"
                          title={language === 'tr' ? 'İptal' : 'Cancel'}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <div 
                          className={`px-3 py-1 rounded text-sm cursor-pointer hover:bg-gw2-darker ${
                            item.customLimit 
                              ? 'bg-orange-500/20 text-orange-400 font-medium' 
                              : 'bg-gw2-darker/50 text-gray-400'
                          }`}
                          onClick={() => startEditing(item)}
                          title={language === 'tr' ? 'Düzenlemek için tıkla' : 'Click to edit'}
                        >
                          {item.customLimit || stackLimit}
                        </div>
                        {item.customLimit && (
                          <button
                            onClick={() => removeLimit(item.id)}
                            className="text-gray-500 hover:text-red-400 p-1"
                            title={language === 'tr' ? 'Varsayılana döndür' : 'Reset to default'}
                          >
                            🗑️
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="p-4 border-t border-gray-700 bg-gw2-darker/30">
          <div className="text-xs text-gray-500 flex items-start gap-2">
            <span>💡</span>
            <span>
              {language === 'tr' 
                ? 'Her item için farklı limit belirleyebilirsiniz. Örneğin Candy Corn için 500, Iron Ore için 1000. Varsayılan limit: ' + stackLimit
                : 'Set different limits per item. For example, 500 for Candy Corn, 1000 for Iron Ore. Default limit: ' + stackLimit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
