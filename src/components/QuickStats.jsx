import { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from '../context/I18nContext';
import { RARITY_ORDER, formatGoldValue } from '../utils/categories';

export default function QuickStats({ onOpenRecommendations }) {
  const { 
    stats, 
    itemsWithLockStatus, 
    lockedItemsStats,
    characters,
    accountSettings,
    setMaterialStorageLimit
  } = useInventory();
  const { language } = useTranslation();
  const [showStorageSettings, setShowStorageSettings] = useState(false);
  
  // Calculate additional stats
  const extendedStats = useMemo(() => {
    let totalVendorValue = 0;
    let junkCount = 0;
    let materialStorageEligible = 0;
    let stackMergeOpportunities = 0;
    const rarityCount = {};
    const stackMap = new Map();
    
    itemsWithLockStatus.forEach(item => {
      // Vendor value
      totalVendorValue += (item.vendorValue || 0) * (item.count || 1);
      
      // Junk count
      if (item.rarity === 'Junk') {
        junkCount += item.count || 1;
      }
      
      // Material storage eligible
      if (item.canGoToMaterialStorage && item.source !== 'materials') {
        materialStorageEligible++;
      }
      
      // Stack merge opportunities
      if (item.count && item.count < 250 && item.source !== 'materials') {
        const key = item.id;
        if (stackMap.has(key)) {
          stackMap.get(key).count++;
        } else {
          stackMap.set(key, { count: 1 });
        }
      }
      
      // Rarity breakdown
      rarityCount[item.rarity] = (rarityCount[item.rarity] || 0) + 1;
    });
    
    // Count items with multiple stacks
    stackMap.forEach(({ count }) => {
      if (count > 1) stackMergeOpportunities++;
    });
    
    return {
      totalVendorValue,
      junkCount,
      materialStorageEligible,
      stackMergeOpportunities,
      rarityCount
    };
  }, [itemsWithLockStatus]);
  
  // Calculate total bag slots across all characters
  const totalBagSlots = useMemo(() => {
    if (!accountSettings?.characterBagInfo) return 0;
    return Object.values(accountSettings.characterBagInfo)
      .reduce((sum, info) => sum + (info.totalSlots || 0), 0);
  }, [accountSettings?.characterBagInfo]);
  
  const quickActions = [
    {
      icon: '🗑️',
      label: language === 'tr' ? 'Çöp Sat' : 'Sell Junk',
      value: extendedStats.junkCount,
      color: 'text-gray-400',
      show: extendedStats.junkCount > 0
    },
    {
      icon: '📥',
      label: language === 'tr' ? 'Depola' : 'Deposit',
      value: extendedStats.materialStorageEligible,
      color: 'text-blue-400',
      show: extendedStats.materialStorageEligible > 0
    },
    {
      icon: '📦',
      label: language === 'tr' ? 'Birleştir' : 'Merge',
      value: extendedStats.stackMergeOpportunities,
      color: 'text-purple-400',
      show: extendedStats.stackMergeOpportunities > 0
    },
    {
      icon: '🔒',
      label: language === 'tr' ? 'Kilitli' : 'Locked',
      value: lockedItemsStats.total,
      color: 'text-yellow-400',
      show: lockedItemsStats.total > 0
    }
  ];
  
  return (
    <div className="bg-gw2-dark/30 border-b border-gray-700">
      <div className="p-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Main stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {stats.totalItems?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-500">
                {language === 'tr' ? 'Toplam' : 'Total'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gw2-accent">
                {stats.uniqueItems?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-500">
                {language === 'tr' ? 'Benzersiz' : 'Unique'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {characters?.length || 0}
              </div>
              <div className="text-xs text-gray-500">
                {language === 'tr' ? 'Karakter' : 'Characters'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">
                {formatGoldValue(extendedStats.totalVendorValue)}
              </div>
              <div className="text-xs text-gray-500">
                {language === 'tr' ? 'Vendor Değeri' : 'Vendor Value'}
              </div>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-10 w-px bg-gray-700"></div>
          
          {/* Account Storage Info - Auto-detected */}
          <div className="flex items-center gap-3">
            {accountSettings?.bankTabs > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-gw2-darker/50 border border-gray-700">
                <span className="text-amber-400">🏦</span>
                <span className="text-sm font-medium text-amber-400">{accountSettings.bankTabs}</span>
                <span className="text-xs text-gray-500">{language === 'tr' ? 'Tab' : 'Tabs'}</span>
                <span className="text-xs text-gray-600">({accountSettings.bankSlots} slot)</span>
              </div>
            )}
            
            {accountSettings?.sharedSlots > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-gw2-darker/50 border border-gray-700">
                <span className="text-cyan-400">🎒</span>
                <span className="text-sm font-medium text-cyan-400">{accountSettings.sharedSlots}</span>
                <span className="text-xs text-gray-500">{language === 'tr' ? 'Paylaşılan' : 'Shared'}</span>
              </div>
            )}
            
            {totalBagSlots > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-gw2-darker/50 border border-gray-700">
                <span className="text-emerald-400">👜</span>
                <span className="text-sm font-medium text-emerald-400">{totalBagSlots}</span>
                <span className="text-xs text-gray-500">{language === 'tr' ? 'Çanta' : 'Bag Slots'}</span>
              </div>
            )}
            
            {/* Material Storage Limit - Manual Input */}
            <div className="relative">
              <button
                onClick={() => setShowStorageSettings(!showStorageSettings)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-gw2-darker/50 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <span className="text-violet-400">📦</span>
                <span className="text-sm font-medium text-violet-400">{accountSettings?.materialStorageLimit || 3000}</span>
                <span className="text-xs text-gray-500">{language === 'tr' ? 'Mat. Limit' : 'Mat. Limit'}</span>
                <span className="text-xs text-gray-600">▼</span>
              </button>
              
              {showStorageSettings && (
                <div className="absolute top-full left-0 mt-1 bg-gw2-dark border border-gray-700 rounded-lg shadow-xl p-3 z-50 min-w-[200px]">
                  <div className="text-xs text-gray-400 mb-2">
                    {language === 'tr' ? 'Material Storage Limiti' : 'Material Storage Limit'}
                  </div>
                  <select
                    value={accountSettings?.materialStorageLimit || 3000}
                    onChange={(e) => {
                      setMaterialStorageLimit(parseInt(e.target.value));
                      setShowStorageSettings(false);
                    }}
                    className="w-full px-2 py-1 bg-gw2-darker border border-gray-600 rounded text-sm text-white"
                  >
                    <option value={250}>250 (Default)</option>
                    <option value={500}>500</option>
                    <option value={1000}>1,000</option>
                    <option value={1500}>1,500</option>
                    <option value={2000}>2,000</option>
                    <option value={2500}>2,500</option>
                    <option value={3000}>3,000 (Max)</option>
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    {language === 'tr' ? 'API\'den alınamaz' : 'Not available from API'}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-10 w-px bg-gray-700"></div>
          
          {/* Quick action badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {quickActions.filter(a => a.show).map((action, i) => (
              <button
                key={i}
                onClick={onOpenRecommendations}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-gw2-darker/50 hover:bg-gw2-darker border border-gray-700 hover:border-gray-600 transition-colors ${action.color}`}
              >
                <span>{action.icon}</span>
                <span className="text-sm font-medium">{action.value}</span>
                <span className="text-xs text-gray-500">{action.label}</span>
              </button>
            ))}
          </div>
          
          {/* Rarity breakdown - compact */}
          <div className="ml-auto flex items-center gap-1">
            {Object.entries(extendedStats.rarityCount)
              .sort((a, b) => (RARITY_ORDER[b[0]] || 0) - (RARITY_ORDER[a[0]] || 0))
              .slice(0, 5)
              .map(([rarity, count]) => (
                <div 
                  key={rarity}
                  className="px-2 py-0.5 rounded text-xs bg-gw2-darker/50"
                  style={{ 
                    color: getRarityColor(rarity),
                    borderLeft: `2px solid ${getRarityColor(rarity)}`
                  }}
                  title={rarity}
                >
                  {count}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function getRarityColor(rarity) {
  const colors = {
    'Junk': '#AAAAAA',
    'Basic': '#FFFFFF',
    'Fine': '#62A4DA',
    'Masterwork': '#1A9306',
    'Rare': '#FCD00B',
    'Exotic': '#FFA405',
    'Ascended': '#FB3E8D',
    'Legendary': '#4C139D'
  };
  return colors[rarity] || '#FFFFFF';
}
