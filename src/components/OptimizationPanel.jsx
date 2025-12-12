import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from '../context/I18nContext';
import { 
  optimizeDistribution, 
  generateDistributionReport, 
  suggestSlotDistribution,
  groupItemsByCategory,
  selectItemsForMaterialStorage
} from '../utils/optimization';
import { RARITY_COLORS } from '../utils/categories';
import TransferPlanView from './TransferPlanView';
import MaterialItemLimitsEditor from './MaterialItemLimitsEditor';

// Material Storage Stack Limit Input with Fill Limit
function MaterialStorageLimitInput({ stackLimit, fillLimit, usedSlots, totalEligibleTypes, lockedCount, onStackLimitChange, onFillLimitChange, onOpenItemLimits, t }) {
  const stackPresets = [250, 500, 1000, 1500, 2000, 2500, 3000];
  const [useFillLimit, setUseFillLimit] = useState(fillLimit !== null);
  
  const handleFillLimitToggle = (enabled) => {
    setUseFillLimit(enabled);
    if (!enabled) {
      onFillLimitChange(null);
    } else {
      onFillLimitChange(Math.min(stackLimit - 250, stackLimit));
    }
  };
  
  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">🗄️</span>
        <h4 className="font-medium text-orange-400">{t('ms_title')}</h4>
      </div>
      
      {/* Stack Limit */}
      <div className="bg-gw2-dark/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-300">{t('ms_stack_limit')}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="250"
              max="3000"
              step="250"
              value={stackLimit}
              onChange={(e) => onStackLimitChange(Math.max(250, Math.min(3000, parseInt(e.target.value) || 250)))}
              className="input-field w-20 text-center text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {stackPresets.map(preset => (
            <button
              key={preset}
              onClick={() => onStackLimitChange(preset)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                stackLimit === preset 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gw2-darker text-gray-400 hover:text-orange-400'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">{t('ms_stack_limit_desc')}</p>
      </div>
      
      {/* Fill Limit - Optional */}
      <div className="bg-gw2-dark/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="use-fill-limit"
              checked={useFillLimit}
              onChange={(e) => handleFillLimitToggle(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gw2-darker text-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="use-fill-limit" className="text-sm text-gray-300">
              Fill Limiti (Doldurma Sınırı)
            </label>
          </div>
          {useFillLimit && (
            <input
              type="number"
              min="0"
              max={stackLimit}
              step="50"
              value={fillLimit || 0}
              onChange={(e) => onFillLimitChange(Math.max(0, Math.min(stackLimit, parseInt(e.target.value) || 0)))}
              className="input-field w-20 text-center text-sm"
            />
          )}
        </div>
        {useFillLimit && (
          <>
            <input
              type="range"
              min="0"
              max={stackLimit}
              step="50"
              value={fillLimit || 0}
              onChange={(e) => onFillLimitChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gw2-darker rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span className="text-orange-400">{fillLimit}/{stackLimit}</span>
              <span>{stackLimit}</span>
            </div>
          </>
        )}
        <p className="text-xs text-gray-500 mt-2">
          {useFillLimit 
            ? `Material Storage ${fillLimit}'e kadar doldurulacak. Oyunda "Deposit All" yapınca boş alan kalır.`
            : 'Açık değil. Material Storage tamamen doldurulacak.'}
        </p>
      </div>
      
      {/* Current usage info */}
      <div className="bg-gw2-dark/50 rounded p-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{t('ms_used_slots')}:</span>
          <span className="text-white font-medium">{usedSlots} tür</span>
        </div>
        {totalEligibleTypes > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{t('ms_eligible')}:</span>
            <span className="text-orange-400 font-medium">{totalEligibleTypes} stack</span>
          </div>
        )}
        {lockedCount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">🔒 {t('lock_locked')}:</span>
            <span className="text-yellow-400 font-medium">{lockedCount} item</span>
          </div>
        )}
        <p className="text-xs text-gray-600">{t('ms_determined_by_gw2')}</p>
      </div>
      
      {/* Per-item limits button */}
      {onOpenItemLimits && (
        <button
          onClick={onOpenItemLimits}
          className="w-full py-2 px-3 bg-gw2-darker/50 hover:bg-gw2-darker text-sm text-gray-300 hover:text-orange-400 rounded-lg border border-gray-700 hover:border-orange-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <span>🎛️</span>
          {t('ms_per_item_limits') || 'Per-Item Limits'}
        </button>
      )}
    </div>
  );
}

// Character slot input
function CharacterSlotInput({ character, index, onChange, onRemove, canRemove }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gw2-darker/50 rounded-lg border border-gray-700">
      <div className="flex-1">
        <input
          type="text"
          value={character.name}
          onChange={(e) => onChange(index, { ...character, name: e.target.value })}
          placeholder={`Karakter ${index + 1}`}
          className="input-field text-sm mb-2"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Slot:</label>
          <input
            type="number"
            min="8"
            max="200"
            value={character.slots}
            onChange={(e) => onChange(index, { ...character, slots: parseInt(e.target.value) || 20 })}
            className="input-field text-sm w-20"
          />
          <div className="flex gap-1">
            {[20, 32, 64, 100, 148].map(preset => (
              <button
                key={preset}
                onClick={() => onChange(index, { ...character, slots: preset })}
                className={`px-2 py-1 text-xs rounded ${
                  character.slots === preset 
                    ? 'bg-gw2-accent text-gw2-darker' 
                    : 'bg-gw2-dark text-gray-400 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
      {canRemove && (
        <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-300 p-2">✕</button>
      )}
    </div>
  );
}

// Character distribution result
function CharacterDistribution({ character, isExpanded, onToggle }) {
  const fillColor = character.fillPercentage > 90 
    ? 'text-red-400' 
    : character.fillPercentage > 70 
      ? 'text-yellow-400' 
      : 'text-green-400';

  return (
    <div className="bg-gw2-darker/50 rounded-lg border border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gw2-dark/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">👤</span>
          <div className="text-left">
            <h4 className="font-semibold text-white">{character.name}</h4>
            <p className="text-sm text-gray-400">
              {character.categories.length} kategori, {character.usedSlots} item
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`font-bold ${fillColor}`}>{character.usedSlots}/{character.totalSlots}</div>
            <div className="text-xs text-gray-500">%{character.fillPercentage} dolu</div>
          </div>
          <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t border-gray-700 space-y-4">
          <div className="h-2 bg-gw2-dark rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                character.fillPercentage > 90 ? 'bg-red-500' :
                character.fillPercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${character.fillPercentage}%` }}
            />
          </div>
          
          {character.categories.map((cat, catIndex) => (
            <div key={catIndex} className="bg-gw2-dark/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span>{cat.icon}</span>
                <span className="font-medium text-white">{cat.name}</span>
                <span className="text-sm text-gray-500">({cat.count} item)</span>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {cat.items.map((item, itemIndex) => (
                  <div 
                    key={itemIndex}
                    className="relative"
                    title={`${item.name} (x${item.count}) - Şu an: ${item.currentLocation || '?'}`}
                  >
                    <div 
                      className="w-10 h-10 rounded border-2 overflow-hidden"
                      style={{ borderColor: RARITY_COLORS[item.rarity] || '#fff' }}
                    >
                      {item.icon ? (
                        <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs">?</div>
                      )}
                    </div>
                    {item.count > 1 && (
                      <span className="absolute bottom-0 right-0 bg-black/80 text-white text-xs px-1 rounded-tl">
                        {item.count > 99 ? '99+' : item.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {character.categories.length === 0 && (
            <p className="text-gray-500 text-center py-4">Bu karaktere item atanmadı</p>
          )}
        </div>
      )}
    </div>
  );
}

// Material Storage section with detailed stats
function MaterialStorageSection({ materialStorage, stackLimitExceeded = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!materialStorage || materialStorage.itemCount === 0) return null;
  
  const stats = materialStorage.stats || {};
  const byLocation = {};
  materialStorage.items.forEach(item => {
    const loc = item.currentLocation || '?';
    if (!byLocation[loc]) byLocation[loc] = [];
    byLocation[loc].push(item);
  });

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-orange-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗄️</span>
          <div className="text-left">
            <h4 className="font-semibold text-orange-400">Material Storage'a Gönderilecek</h4>
            <p className="text-sm text-gray-400">
              {materialStorage.itemCount} stack ({materialStorage.totalCount} adet)
            </p>
          </div>
        </div>
        <span className={`transform transition-transform text-gray-500 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t border-orange-500/30 space-y-3">
          {/* Slot Usage Stats */}
          <div className="bg-gw2-dark/50 rounded-lg p-3">
            <h5 className="text-sm font-medium text-white mb-2">📊 Durum</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Kullanılan slot:</span>
                <span className="text-white">{stats.currentUsedSlots || 0} tür</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Stack limiti:</span>
                <span className="text-orange-400">{stats.stackLimit || 250}/item</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Yeni tür:</span>
                <span className="text-orange-400">{stats.willUseNewSlots || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mevcut'a eklenen:</span>
                <span className="text-green-400">{stats.addingToExistingStacks || 0}</span>
              </div>
            </div>
          </div>
          
          {/* Transfer breakdown */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
              <div className="text-green-400 font-medium">{stats.addingToExistingStacks || 0} stack</div>
              <div className="text-gray-500">Mevcut slot'a eklenir</div>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2">
              <div className="text-orange-400 font-medium">{stats.willUseNewSlots || 0} yeni tür</div>
              <div className="text-gray-500">Yeni slot kullanır</div>
            </div>
          </div>
          
          {/* Stack limit exceeded - DETAYLI */}
          {stats.couldNotFitDueToStackLimit > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-xs space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-medium">
                <span>🚫</span>
                <span>{stats.couldNotFitDueToStackLimit} stack karakterde kalacak</span>
              </div>
              <p className="text-gray-400">
                Bu itemlerin Material Storage'daki stack'i dolu ({stats.stackLimit}/item). 
                Önce Material Storage'dan craft/sat.
              </p>
            </div>
          )}
          
          <p className="text-xs text-gray-400 bg-gw2-dark/30 rounded p-2">
            💡 <strong>Oyunda:</strong> Sağ tık → "Deposit Material" veya çanta → "Deposit All Materials"
          </p>
          
          {Object.entries(byLocation).map(([location, items]) => (
            <div key={location} className="bg-gw2-dark/50 rounded-lg p-3">
              <div className="text-sm text-gray-400 mb-2">📍 {location} ({items.length} stack):</div>
              <div className="flex flex-wrap gap-1">
                {items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="relative group"
                    title={`${item.name} (x${item.count})${item.willAddToExistingStack ? ' - Mevcut slot\'a eklenecek' : ' - Yeni slot kullanacak'}`}
                  >
                    <div 
                      className={`w-10 h-10 rounded border-2 overflow-hidden ${
                        item.willAddToExistingStack 
                          ? 'ring-2 ring-green-500/50' 
                          : 'ring-2 ring-orange-500/50'
                      }`}
                      style={{ borderColor: RARITY_COLORS[item.rarity] || '#fff' }}
                    >
                      {item.icon ? (
                        <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs">?</div>
                      )}
                    </div>
                    {item.count > 1 && (
                      <span className="absolute bottom-0 right-0 bg-black/80 text-white text-xs px-1 rounded-tl">
                        {item.count > 999 ? '999+' : item.count}
                      </span>
                    )}
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full text-xs flex items-center justify-center ${
                      item.willAddToExistingStack ? 'bg-green-500' : 'bg-orange-500'
                    }`}>
                      {item.willAddToExistingStack ? '✓' : '+'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Mevcut slot'a</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span>Yeni slot</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Category breakdown
function CategoryBreakdown({ categories, materialStorageStats }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-400 mb-2">Kategori Dağılımı</h4>
      
      {materialStorageStats && materialStorageStats.totalToMaterialStorage > 0 && (
        <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/30 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span>🗄️</span>
            <span className="text-orange-400 flex-1">Material Storage'a</span>
            <span className="text-orange-400 font-medium">{materialStorageStats.totalToMaterialStorage} stack</span>
          </div>
          <div className="text-xs text-gray-500 pl-6 space-y-0.5">
            <div className="flex justify-between">
              <span>• Mevcut slot'a eklenecek:</span>
              <span className="text-green-400">{materialStorageStats.addingToExistingStacks || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>• Yeni slot açacak:</span>
              <span className="text-orange-400">{materialStorageStats.willUseNewSlots || 0} tür</span>
            </div>
            {materialStorageStats.couldNotFitDueToStackLimit > 0 && (
              <div className="flex justify-between text-red-400">
                <span>• Stack limiti dolu:</span>
                <span>{materialStorageStats.couldNotFitDueToStackLimit} stack</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {categories.map((cat, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span>{cat.icon}</span>
          <span className="text-white flex-1">{cat.name}</span>
          <span className="text-gray-400">{cat.slots} slot</span>
          <div className="w-24 h-2 bg-gw2-dark rounded-full overflow-hidden">
            <div 
              className="h-full bg-gw2-accent"
              style={{ width: `${Math.min(100, (cat.slots / (categories[0]?.slots || 1)) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Stack limit yüzünden Material Storage'a gidemeyen itemler
function StackLimitExceededSection({ items, stackLimit }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!items || items.length === 0) return null;
  
  // Group by item ID
  const byItemId = {};
  items.forEach(item => {
    if (!byItemId[item.id]) {
      byItemId[item.id] = {
        id: item.id,
        name: item.name,
        icon: item.icon,
        rarity: item.rarity,
        currentInStorage: item.currentInStorage || 0,
        stackLimit: item.stackLimit || stackLimit,
        items: [],
        totalCount: 0
      };
    }
    byItemId[item.id].items.push(item);
    byItemId[item.id].totalCount += item.count || 1;
  });
  
  const groups = Object.values(byItemId).sort((a, b) => b.totalCount - a.totalCount);
  
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-red-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚫</span>
          <div className="text-left">
            <h4 className="font-semibold text-red-400">Stack Limiti Dolu - Karakterde Kalacak</h4>
            <p className="text-sm text-gray-400">
              {items.length} stack ({groups.length} tür) - Material Storage'da yer yok
            </p>
          </div>
        </div>
        <span className={`transform transition-transform text-gray-500 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t border-red-500/30 space-y-3">
          <p className="text-xs text-gray-400 bg-gw2-dark/30 rounded p-2">
            💡 Bu itemlerin Material Storage'daki slotu zaten {stackLimit} ile dolu. 
            Göndermek için önce Material Storage'daki miktarı azalt (craft, sat, veya at).
          </p>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {groups.map(group => (
              <div key={group.id} className="flex items-center gap-2 bg-gw2-dark/50 rounded p-2">
                <div 
                  className="w-8 h-8 rounded border overflow-hidden flex-shrink-0"
                  style={{ borderColor: RARITY_COLORS[group.rarity] || '#fff' }}
                >
                  {group.icon ? (
                    <img src={group.icon} alt={group.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs">?</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{group.name}</div>
                  <div className="text-xs text-gray-500">
                    MS: {group.currentInStorage}/{group.stackLimit} (DOLU)
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-red-400 font-medium">{group.totalCount}</div>
                  <div className="text-xs text-gray-500">karakterde</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export default function OptimizationPanel() {
  const { items, itemsWithLockStatus, lockedItemsStats, characters: gameCharacters } = useInventory();
  const { t } = useTranslation();
  
  // Material Storage stack limit per item (saved to localStorage)
  const [stackLimit, setStackLimit] = useState(() => {
    const saved = localStorage.getItem('gw2_material_stack_limit');
    return saved ? parseInt(saved) : 250;
  });
  
  // Material Storage fill limit (how much to fill, not max capacity)
  const [fillLimit, setFillLimit] = useState(() => {
    const saved = localStorage.getItem('gw2_material_fill_limit');
    return saved ? parseInt(saved) : null; // null means use stackLimit
  });
  
  // Save limits to localStorage
  useEffect(() => {
    localStorage.setItem('gw2_material_stack_limit', stackLimit.toString());
  }, [stackLimit]);
  
  useEffect(() => {
    if (fillLimit !== null) {
      localStorage.setItem('gw2_material_fill_limit', fillLimit.toString());
    } else {
      localStorage.removeItem('gw2_material_fill_limit');
    }
  }, [fillLimit]);
  
  // Character slots
  const [characterSlots, setCharacterSlots] = useState(() => {
    if (gameCharacters && gameCharacters.length > 0) {
      return gameCharacters.map((name) => ({ name, slots: 100 }));
    }
    return [
      { name: 'Karakter 1', slots: 28 },
      { name: 'Karakter 2', slots: 16 },
      { name: 'Karakter 3', slots: 32 }
    ];
  });
  
  const [useSubCategories, setUseSubCategories] = useState(false);
  const [distributionResult, setDistributionResult] = useState(null);
  const [expandedChars, setExpandedChars] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showTransferPlan, setShowTransferPlan] = useState(false);
  const [showItemLimitsEditor, setShowItemLimitsEditor] = useState(false);
  
  // Filter out locked items for optimization
  const unlockedItems = useMemo(() => {
    return itemsWithLockStatus.filter(item => !item.isLocked);
  }, [itemsWithLockStatus]);
  
  // Use effective fill limit (fillLimit or stackLimit)
  const effectiveFillLimit = fillLimit !== null ? Math.min(fillLimit, stackLimit) : stackLimit;
  
  // Material analysis with stack limit only (no slot limit needed), excluding locked items
  const materialAnalysis = useMemo(() => {
    if (unlockedItems.length === 0) return null;
    return selectItemsForMaterialStorage(unlockedItems, effectiveFillLimit);
  }, [unlockedItems, effectiveFillLimit]);
  
  // Get current used slots from analysis
  const materialStorageUsedSlots = materialAnalysis?.stats?.currentUsedSlots || 0;
  
  // Count eligible items for material storage
  const totalEligibleItems = materialAnalysis?.toMaterialStorage?.length || 0;
  
  // Suggestions
  const suggestions = useMemo(() => {
    if (unlockedItems.length === 0) return null;
    return suggestSlotDistribution(unlockedItems, characterSlots.length, effectiveFillLimit);
  }, [unlockedItems, characterSlots.length, effectiveFillLimit]);
  
  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    if (!materialAnalysis) return [];
    return groupItemsByCategory(materialAnalysis.toCharacters);
  }, [materialAnalysis]);
  
  const updateCharacter = (index, data) => {
    const updated = [...characterSlots];
    updated[index] = data;
    setCharacterSlots(updated);
  };
  
  const addCharacter = () => {
    if (characterSlots.length < 10) {
      setCharacterSlots([...characterSlots, { name: `Karakter ${characterSlots.length + 1}`, slots: 32 }]);
    }
  };
  
  const removeCharacter = (index) => {
    if (characterSlots.length > 1) {
      setCharacterSlots(characterSlots.filter((_, i) => i !== index));
    }
  };
  
  const runOptimization = () => {
    const distribution = optimizeDistribution(unlockedItems, characterSlots, { 
      useSubCategories,
      stackLimit
    });
    const report = generateDistributionReport(distribution, items);
    setDistributionResult(report);
    setShowSuggestions(false);
    setExpandedChars({ 0: true });
  };
  
  const toggleCharExpand = (index) => {
    setExpandedChars(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  const expandAll = () => {
    const all = {};
    distributionResult?.characters.forEach((_, i) => { all[i] = true; });
    setExpandedChars(all);
  };
  
  const collapseAll = () => setExpandedChars({});
  
  const totalSlots = characterSlots.reduce((sum, c) => sum + c.slots, 0);
  const itemsForCharacters = materialAnalysis?.toCharacters.length || 0;
  const itemsToMaterialStorage = materialAnalysis?.toMaterialStorage.length || 0;
  const hasEnoughSpace = totalSlots >= itemsForCharacters;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gw2-dark/30">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-1">🎯 Envanter Optimizasyonu</h2>
        <p className="text-sm text-gray-400">Kategorileri karakterlere ve Material Storage'a dağıt</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gw2-darker/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{items.length}</div>
            <div className="text-xs text-gray-400">Toplam Stack</div>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-3 text-center border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-400">{itemsToMaterialStorage}</div>
            <div className="text-xs text-orange-400">Material Storage'a</div>
            {materialAnalysis?.stats?.couldNotFitDueToStackLimit > 0 && (
              <div className="text-xs text-red-400">
                ({materialAnalysis.stats.couldNotFitDueToStackLimit} sığmadı)
              </div>
            )}
          </div>
          <div className="bg-gw2-darker/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{itemsForCharacters}</div>
            <div className="text-xs text-gray-400">Karakterlere</div>
          </div>
          <div className={`bg-gw2-darker/50 rounded-lg p-3 text-center ${hasEnoughSpace ? '' : 'border border-red-500/50'}`}>
            <div className={`text-2xl font-bold ${hasEnoughSpace ? 'text-green-400' : 'text-red-400'}`}>
              {totalSlots}
            </div>
            <div className="text-xs text-gray-400">Toplam Slot</div>
          </div>
        </div>
        
        {/* Material Storage Limits */}
        <MaterialStorageLimitInput 
          stackLimit={stackLimit}
          fillLimit={fillLimit}
          usedSlots={materialStorageUsedSlots}
          totalEligibleTypes={totalEligibleItems}
          lockedCount={lockedItemsStats.total}
          onStackLimitChange={setStackLimit}
          onFillLimitChange={setFillLimit}
          onOpenItemLimits={() => setShowItemLimitsEditor(true)}
          t={t}
        />
        
        {/* Locked Items Info */}
        {lockedItemsStats.total > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-yellow-400">
              <span>🔒</span>
              <span>{lockedItemsStats.total} item {t('lock_locked')}</span>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              {t('lock_description')}
            </p>
            {Object.keys(lockedItemsStats.byCharacter).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(lockedItemsStats.byCharacter).map(([char, count]) => (
                  <span key={char} className="text-xs bg-yellow-500/20 px-2 py-0.5 rounded text-yellow-400">
                    {char}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Material Storage Warnings - only stack limit now */}
        {materialAnalysis?.stats?.couldNotFitDueToStackLimit > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
            <span className="text-red-400">🚫 {materialAnalysis.stats.couldNotFitDueToStackLimit} stack {t('ms_cannot_fit')}</span>
            <p className="text-gray-400 text-xs mt-1">
              {t('ms_stack_limit_full')}. {effectiveFillLimit < stackLimit && `(Fill limit: ${effectiveFillLimit})`}
            </p>
          </div>
        )}
        
        {/* Category breakdown */}
        {showSuggestions && suggestions && (
          <div className="bg-gw2-darker/30 rounded-lg p-4">
            <CategoryBreakdown 
              categories={suggestions.categoryBreakdown} 
              materialStorageStats={materialAnalysis?.stats}
            />
          </div>
        )}
        
        {/* Character slot inputs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">Karakter Slotları</h3>
            <button
              onClick={addCharacter}
              disabled={characterSlots.length >= 10}
              className="text-sm text-gw2-accent hover:underline disabled:opacity-50"
            >
              + Karakter Ekle
            </button>
          </div>
          
          <div className="space-y-2">
            {characterSlots.map((char, index) => (
              <CharacterSlotInput
                key={index}
                character={char}
                index={index}
                onChange={updateCharacter}
                onRemove={removeCharacter}
                canRemove={characterSlots.length > 1}
              />
            ))}
          </div>
        </div>
        
        {/* Options */}
        <div className="bg-gw2-darker/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-3">Seçenekler</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useSubCategories}
              onChange={(e) => setUseSubCategories(e.target.checked)}
              className="rounded border-gray-600 bg-gw2-darker text-gw2-accent"
            />
            <span className="text-sm text-gray-300">Alt kategorileri kullan</span>
          </label>
        </div>
        
        {/* Run optimization */}
        <button
          onClick={runOptimization}
          disabled={items.length === 0}
          className="btn-primary w-full disabled:opacity-50"
        >
          🚀 Optimizasyonu Çalıştır
        </button>
        
        {/* Results */}
        {distributionResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">📊 Dağıtım Sonuçları</h3>
              <div className="flex gap-2">
                <button onClick={expandAll} className="text-xs text-gw2-accent hover:underline">Tümünü Aç</button>
                <span className="text-gray-600">|</span>
                <button onClick={collapseAll} className="text-xs text-gw2-accent hover:underline">Tümünü Kapat</button>
              </div>
            </div>
            
            {/* Efficiency */}
            <div className="bg-gw2-darker/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Verimlilik</span>
                <span className="text-lg font-bold text-gw2-accent">%{distributionResult.summary.efficiency}</span>
              </div>
              <div className="h-3 bg-gw2-dark rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gw2-accent to-yellow-500 transition-all"
                  style={{ width: `${distributionResult.summary.efficiency}%` }}
                />
              </div>
            </div>
            
            {/* Transfer Plan Button */}
            <button
              onClick={() => setShowTransferPlan(true)}
              className="w-full p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-left hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">📋</span>
                <div>
                  <h4 className="font-semibold text-green-400">Transfer Planını Görüntüle</h4>
                  <p className="text-sm text-gray-400">
                    Adım adım hangi itemin nereye gideceğini göster
                  </p>
                </div>
                <span className="ml-auto text-green-400">→</span>
              </div>
            </button>
            
            {/* Material Storage */}
            <MaterialStorageSection materialStorage={distributionResult.materialStorage} />
            
            {/* Stack Limit Yüzünden Karakterde Kalacaklar */}
            {materialAnalysis?.stackLimitExceeded?.length > 0 && (
              <StackLimitExceededSection 
                items={materialAnalysis.stackLimitExceeded} 
                stackLimit={stackLimit} 
              />
            )}
            
            {/* Character distributions */}
            <div className="space-y-2">
              {distributionResult.characters.map((char, index) => (
                <CharacterDistribution
                  key={index}
                  character={char}
                  isExpanded={expandedChars[index]}
                  onToggle={() => toggleCharExpand(index)}
                />
              ))}
            </div>
            
            {/* Unassigned */}
            {distributionResult.unassigned.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <h4 className="font-medium text-red-400 mb-2">
                  ⚠️ Yerleştirilemeyen ({distributionResult.unassigned.length})
                </h4>
                <p className="text-sm text-gray-400 mb-3">Slot sayısını artırın.</p>
                <div className="flex flex-wrap gap-1">
                  {distributionResult.unassigned.slice(0, 20).map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-gw2-darker rounded text-xs text-gray-300">
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Transfer Plan Modal */}
      {showTransferPlan && distributionResult && (
        <TransferPlanView 
          report={distributionResult} 
          onClose={() => setShowTransferPlan(false)} 
        />
      )}
      
      {/* Per-Item Limits Editor Modal */}
      {showItemLimitsEditor && (
        <MaterialItemLimitsEditor
          stackLimit={stackLimit}
          onClose={() => setShowItemLimitsEditor(false)}
        />
      )}
    </div>
  );
}
