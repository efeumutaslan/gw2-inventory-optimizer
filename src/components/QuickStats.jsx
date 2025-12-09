import { useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from '../context/I18nContext';
import { RARITY_ORDER, formatGoldValue } from '../utils/categories';

export default function QuickStats({ onOpenRecommendations }) {
  const { 
    stats, 
    itemsWithLockStatus, 
    lockedItemsStats,
    characters 
  } = useInventory();
  const { language } = useTranslation();
  
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
