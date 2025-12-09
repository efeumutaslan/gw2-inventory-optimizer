import { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from '../context/I18nContext';
import { 
  getAllAccountUnlocks, 
  getCommercePrices 
} from '../services/gw2Api';
import {
  generateRecommendations,
  groupRecommendationsByType,
  getRecommendationStats,
  getRecommendationLabel,
  getRecommendationColor,
  RECOMMENDATION_TYPES
} from '../services/recommendations';
import { RARITY_COLORS, formatGoldValue } from '../utils/categories';

// Recommendation type icons
const TYPE_ICONS = {
  [RECOMMENDATION_TYPES.SELL_TP]: '💰',
  [RECOMMENDATION_TYPES.SELL_VENDOR]: '🪙',
  [RECOMMENDATION_TYPES.USE_UNLOCK]: '🔓',
  [RECOMMENDATION_TYPES.DESTROY]: '🗑️',
  [RECOMMENDATION_TYPES.KEEP_KILLPROOF]: '⚔️',
  [RECOMMENDATION_TYPES.EXTRACT_UPGRADE]: '🔧',
  [RECOMMENDATION_TYPES.SALVAGE]: '🔨',
  [RECOMMENDATION_TYPES.STACK]: '📦',
  [RECOMMENDATION_TYPES.CONSUME]: '✨',
  [RECOMMENDATION_TYPES.KEEP]: '✓',
  [RECOMMENDATION_TYPES.DEPOSIT]: '📥',
  [RECOMMENDATION_TYPES.WARNING]: '⚠️',
};

export default function RecommendationsPanel() {
  const { apiKey, itemsWithLockStatus } = useInventory();
  const { t, language } = useTranslation();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [accountUnlocks, setAccountUnlocks] = useState(null);
  const [prices, setPrices] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [expandedTypes, setExpandedTypes] = useState({});
  const [filter, setFilter] = useState('all');
  
  // Load account data
  const loadAccountData = async () => {
    if (!apiKey || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Load unlocks
      setLoadingMessage(language === 'tr' ? 'Hesap verileri yükleniyor...' : 'Loading account data...');
      const unlocks = await getAllAccountUnlocks(apiKey);
      setAccountUnlocks(unlocks);
      
      // Get unique item IDs for price check
      const itemIds = [...new Set(itemsWithLockStatus.map(i => i.id))];
      
      // Also get upgrade IDs from equipment
      const upgradeIds = new Set();
      itemsWithLockStatus.forEach(item => {
        if (item.upgrades) {
          item.upgrades.forEach(id => upgradeIds.add(id));
        }
      });
      
      const allIds = [...itemIds, ...upgradeIds];
      
      // Load prices (only for tradeable items)
      setLoadingMessage(language === 'tr' ? 'TP fiyatları alınıyor...' : 'Fetching TP prices...');
      const priceData = await getCommercePrices(allIds);
      setPrices(priceData);
      
      // Generate recommendations
      setLoadingMessage(language === 'tr' ? 'Öneriler oluşturuluyor...' : 'Generating recommendations...');
      const recs = generateRecommendations(itemsWithLockStatus, unlocks, priceData);
      setRecommendations(recs);
      
      // Expand first few types by default
      const groups = groupRecommendationsByType(recs);
      const initialExpanded = {};
      Object.keys(groups).slice(0, 3).forEach(type => {
        initialExpanded[type] = true;
      });
      setExpandedTypes(initialExpanded);
      
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  // Auto-load on mount
  useEffect(() => {
    if (itemsWithLockStatus.length > 0 && !recommendations.length && !isLoading) {
      loadAccountData();
    }
  }, [itemsWithLockStatus]);
  
  // Compute grouped recommendations
  const groupedRecommendations = useMemo(() => {
    if (filter === 'all') {
      return groupRecommendationsByType(recommendations);
    }
    return groupRecommendationsByType(recommendations.filter(r => r.type === filter));
  }, [recommendations, filter]);
  
  // Compute stats
  const stats = useMemo(() => {
    return getRecommendationStats(recommendations);
  }, [recommendations]);
  
  const toggleType = (type) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  return (
    <div className="h-full flex flex-col bg-gw2-dark/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>💡</span>
            {language === 'tr' ? 'Öneriler' : 'Recommendations'}
          </h2>
          <button
            onClick={loadAccountData}
            disabled={isLoading}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {isLoading ? '...' : '🔄'}
          </button>
        </div>
        
        {/* Stats summary */}
        {stats.totalItems > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gw2-darker/50 rounded p-2 text-center">
              <div className="text-lg font-bold text-white">{stats.totalItems}</div>
              <div className="text-xs text-gray-400">
                {language === 'tr' ? 'Öneri' : 'Items'}
              </div>
            </div>
            <div className="bg-gw2-darker/50 rounded p-2 text-center">
              <div className="text-lg font-bold text-yellow-400">
                {formatGoldValue(stats.potentialGold)}
              </div>
              <div className="text-xs text-gray-400">
                {language === 'tr' ? 'Potansiyel' : 'Potential'}
              </div>
            </div>
            <div className="bg-gw2-darker/50 rounded p-2 text-center">
              <div className="text-lg font-bold text-green-400">{stats.slotsToFree}</div>
              <div className="text-xs text-gray-400">
                {language === 'tr' ? 'Slot kazanımı' : 'Slots saved'}
              </div>
            </div>
          </div>
        )}
        
        {/* Filter */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-xs rounded ${
              filter === 'all' ? 'bg-gw2-accent text-white' : 'bg-gw2-darker text-gray-400 hover:text-white'
            }`}
          >
            {language === 'tr' ? 'Tümü' : 'All'} ({recommendations.length})
          </button>
          {Object.entries(stats.byType).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                filter === type ? 'bg-gw2-accent text-white' : 'bg-gw2-darker text-gray-400 hover:text-white'
              }`}
            >
              <span>{TYPE_ICONS[type]}</span>
              <span>{count}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">{loadingMessage}</p>
          </div>
        </div>
      )}
      
      {/* No data state */}
      {!isLoading && recommendations.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-gray-400 mb-4">
              {language === 'tr' 
                ? 'Öneri yok veya veriler yüklenmedi.' 
                : 'No recommendations or data not loaded.'}
            </p>
            <button onClick={loadAccountData} className="btn-primary">
              {language === 'tr' ? 'Verileri Yükle' : 'Load Data'}
            </button>
          </div>
        </div>
      )}
      
      {/* Recommendations list */}
      {!isLoading && recommendations.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {Object.entries(groupedRecommendations).map(([type, items]) => (
            <div key={type} className="bg-gw2-darker/30 rounded-lg overflow-hidden">
              {/* Type header */}
              <button
                onClick={() => toggleType(type)}
                className="w-full p-3 flex items-center justify-between hover:bg-gw2-darker/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{TYPE_ICONS[type]}</span>
                  <span className="font-medium text-white">
                    {getRecommendationLabel(type, language)}
                  </span>
                  <span className="text-sm text-gray-400">({items.length})</span>
                </div>
                <span className="text-gray-400">
                  {expandedTypes[type] ? '▼' : '▶'}
                </span>
              </button>
              
              {/* Items */}
              {expandedTypes[type] && (
                <div className="border-t border-gray-700">
                  {items.slice(0, 20).map((rec, idx) => (
                    <RecommendationItem key={idx} recommendation={rec} language={language} />
                  ))}
                  {items.length > 20 && (
                    <div className="p-2 text-center text-sm text-gray-500">
                      +{items.length - 20} {language === 'tr' ? 'daha fazla' : 'more'}...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Account unlocks info */}
      {accountUnlocks && (
        <div className="p-3 border-t border-gray-700 bg-gw2-darker/30">
          <div className="text-xs text-gray-500 flex flex-wrap gap-3">
            <span>🎨 {accountUnlocks.skins.size} skins</span>
            <span>🖌️ {accountUnlocks.dyes.size} dyes</span>
            <span>🐾 {accountUnlocks.minis.size} minis</span>
            {accountUnlocks.wallet[59] && (
              <span>⚔️ {accountUnlocks.wallet[59]} UFE</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Individual recommendation item
function RecommendationItem({ recommendation, language }) {
  const rec = recommendation;
  
  // Stack recommendation has multiple items
  if (rec.type === RECOMMENDATION_TYPES.STACK) {
    return (
      <div className="p-2 hover:bg-gw2-dark/30 flex items-center gap-2">
        {rec.icon && (
          <img src={rec.icon} alt="" className="w-8 h-8 rounded" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate">{rec.itemName}</div>
          <div className="text-xs text-gray-400">
            {rec.stackCount} stacks • {rec.locations.join(', ')}
          </div>
        </div>
        <div className="text-xs text-purple-400">
          -{rec.stackCount - Math.ceil(rec.totalCount / 250)} slot
        </div>
      </div>
    );
  }
  
  const item = rec.item;
  if (!item) return null;
  
  const rarityColor = RARITY_COLORS[item.rarity] || '#FFFFFF';
  
  return (
    <div className="p-2 hover:bg-gw2-dark/30 flex items-center gap-2">
      {/* Item icon */}
      <div className="relative">
        {item.icon ? (
          <img 
            src={item.icon} 
            alt={item.name} 
            className="w-8 h-8 rounded"
            style={{ border: `1px solid ${rarityColor}` }}
          />
        ) : (
          <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-xs">?</div>
        )}
        {item.count > 1 && (
          <span className="absolute -bottom-1 -right-1 bg-black/80 text-white text-[10px] px-1 rounded">
            {item.count > 99 ? '99+' : item.count}
          </span>
        )}
      </div>
      
      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate" style={{ color: rarityColor }}>{item.name}</div>
        <div className="text-xs text-gray-500 truncate">
          {item.sourceName || item.source}
          {rec.unlockType && ` • ${rec.unlockType}`}
        </div>
      </div>
      
      {/* Action info */}
      <div className="text-right">
        {rec.tpPrice && (
          <div className="text-xs text-yellow-400">{formatGoldValue(rec.tpPrice)}</div>
        )}
        {rec.value && !rec.tpPrice && (
          <div className="text-xs text-gray-400">{formatGoldValue(rec.value)}</div>
        )}
        {rec.warning && (
          <div className="text-xs text-red-400">⚠️</div>
        )}
        {rec.important && (
          <div className="text-xs text-green-400">!</div>
        )}
      </div>
    </div>
  );
}
