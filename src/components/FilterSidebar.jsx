import { useInventory } from '../context/InventoryContext';
import { useTranslation } from '../context/I18nContext';
import { CATEGORIES, RARITY_COLORS } from '../utils/categories';
import { filterItems } from '../utils/categories';

export default function FilterSidebar() {
  const { 
    filters, 
    setFilters, 
    stats, 
    sortBy, 
    sortOrder, 
    setSort,
    itemsWithLockStatus,
    lockedItemsStats,
    lockAllFiltered,
    unlockAllFiltered,
    clearAllManualLocks
  } = useInventory();
  const { t, language } = useTranslation();
  
  const rarities = ['Legendary', 'Ascended', 'Exotic', 'Rare', 'Masterwork', 'Fine', 'Basic', 'Junk'];
  const sources = ['character', 'bank', 'materials', 'shared'];
  
  // i18n labels
  const rarityLabels = {
    'Legendary': language === 'tr' ? 'Efsanevi' : 'Legendary',
    'Ascended': 'Ascended',
    'Exotic': language === 'tr' ? 'Egzotik' : 'Exotic',
    'Rare': language === 'tr' ? 'Nadir' : 'Rare',
    'Masterwork': language === 'tr' ? 'Usta' : 'Masterwork',
    'Fine': language === 'tr' ? 'İyi' : 'Fine',
    'Basic': language === 'tr' ? 'Temel' : 'Basic',
    'Junk': language === 'tr' ? 'Çöp' : 'Junk'
  };
  
  const sourceLabels = {
    'character': language === 'tr' ? 'Karakter' : 'Character',
    'bank': language === 'tr' ? 'Banka' : 'Bank',
    'materials': 'Material Storage',
    'shared': 'Shared Inventory'
  };
  
  // Category labels for i18n
  const getCategoryName = (key, category) => {
    const categoryNames = {
      'all': language === 'tr' ? 'Tümü' : 'All',
      'equipment': language === 'tr' ? 'Ekipman' : 'Equipment',
      'consumables': language === 'tr' ? 'Tüketilebilir' : 'Consumables',
      'crafting': language === 'tr' ? 'Craft Malzemeleri' : 'Crafting Materials',
      'upgrades': language === 'tr' ? 'Yükseltmeler' : 'Upgrades',
      'containers': language === 'tr' ? 'Konteynerler' : 'Containers',
      'collectibles': language === 'tr' ? 'Koleksiyonlar' : 'Collectibles',
      'tools': language === 'tr' ? 'Araçlar' : 'Tools',
      'trophies': language === 'tr' ? 'Ganimetler' : 'Trophies',
      'other': language === 'tr' ? 'Diğer' : 'Other'
    };
    return categoryNames[key] || category.name;
  };
  
  const getSubCategoryName = (key) => {
    const subCategoryNames = {
      'weapons': language === 'tr' ? 'Silahlar' : 'Weapons',
      'armor': language === 'tr' ? 'Zırh' : 'Armor',
      'trinkets': language === 'tr' ? 'Takılar' : 'Trinkets',
      'back': language === 'tr' ? 'Sırt' : 'Back',
      'food': language === 'tr' ? 'Yiyecek' : 'Food',
      'utility': 'Utility',
      'other': language === 'tr' ? 'Diğer' : 'Other',
      'common': language === 'tr' ? 'Temel' : 'Common',
      'fine': language === 'tr' ? 'İyi' : 'Fine',
      'rare': language === 'tr' ? 'Nadir' : 'Rare',
      'ascended': 'Ascended',
      'runes': 'Rune',
      'sigils': 'Sigil',
      'bags': language === 'tr' ? 'Çantalar' : 'Bags',
      'boxes': language === 'tr' ? 'Kutular' : 'Boxes',
      'minis': 'Mini',
      'gizmos': 'Gizmo'
    };
    return subCategoryNames[key] || key;
  };
  
  const toggleRarity = (rarity) => {
    const current = filters.rarities || [];
    setFilters({ rarities: current.includes(rarity) ? current.filter(r => r !== rarity) : [...current, rarity] });
  };
  
  const toggleSource = (source) => {
    const current = filters.sources || [];
    setFilters({ sources: current.includes(source) ? current.filter(s => s !== source) : [...current, source] });
  };
  
  const clearFilters = () => setFilters({ category: 'all', subCategory: null, rarities: [], sources: [], search: '' });
  
  const hasActiveFilters = filters.category !== 'all' || filters.subCategory || filters.rarities?.length > 0 || filters.sources?.length > 0 || filters.search;

  return (
    <div className="w-64 bg-gw2-dark/50 backdrop-blur border-r border-gray-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold text-white">{language === 'tr' ? 'Filtreler' : 'Filters'}</h2>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-gw2-accent hover:underline">
            {language === 'tr' ? 'Temizle' : 'Clear'}
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Categories */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            {language === 'tr' ? 'Kategoriler' : 'Categories'}
          </h3>
          <div className="space-y-1">
            {Object.entries(CATEGORIES).map(([key, category]) => (
              <div key={key}>
                <button
                  onClick={() => setFilters({ category: key, subCategory: null })}
                  className={`category-tab w-full text-left flex items-center gap-2 ${filters.category === key ? 'active' : ''}`}
                >
                  <span>{category.icon}</span>
                  <span>{getCategoryName(key, category)}</span>
                </button>
                
                {filters.category === key && category.subCategories && (
                  <div className="ml-6 mt-1 space-y-1">
                    {Object.entries(category.subCategories).map(([subKey, subCat]) => (
                      <button
                        key={subKey}
                        onClick={() => setFilters({ subCategory: subKey })}
                        className={`text-sm px-2 py-1 rounded w-full text-left ${
                          filters.subCategory === subKey ? 'bg-gw2-accent/20 text-gw2-accent' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {getSubCategoryName(subKey)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Rarity */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            {language === 'tr' ? 'Nadirlik' : 'Rarity'}
          </h3>
          <div className="flex flex-wrap gap-1">
            {rarities.map(rarity => (
              <button
                key={rarity}
                onClick={() => toggleRarity(rarity)}
                className={`filter-chip ${filters.rarities?.includes(rarity) ? 'active' : ''}`}
                style={{
                  borderColor: RARITY_COLORS[rarity],
                  ...(filters.rarities?.includes(rarity) && {
                    backgroundColor: RARITY_COLORS[rarity],
                    color: rarity === 'Basic' ? '#000' : '#fff'
                  })
                }}
              >
                {rarityLabels[rarity]}
              </button>
            ))}
          </div>
        </div>
        
        {/* Source */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            {language === 'tr' ? 'Kaynak' : 'Source'}
          </h3>
          <div className="space-y-1">
            {sources.map(source => (
              <label key={source} className="flex items-center gap-2 cursor-pointer hover:bg-gw2-darker p-2 rounded">
                <input
                  type="checkbox"
                  checked={filters.sources?.includes(source) || false}
                  onChange={() => toggleSource(source)}
                  className="rounded border-gray-600 bg-gw2-darker text-gw2-accent"
                />
                <span className="text-sm text-gray-300">{sourceLabels[source]}</span>
                <span className="ml-auto text-xs text-gray-500">{stats.bySource?.[source] || 0}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Sort */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            {language === 'tr' ? 'Sıralama' : 'Sorting'}
          </h3>
          <select value={sortBy} onChange={(e) => setSort(e.target.value, sortOrder)} className="input-field text-sm mb-2">
            <option value="rarity">{language === 'tr' ? 'Nadirlik' : 'Rarity'}</option>
            <option value="name">{language === 'tr' ? 'İsim' : 'Name'}</option>
            <option value="level">Level</option>
            <option value="count">{language === 'tr' ? 'Miktar' : 'Count'}</option>
            <option value="type">{language === 'tr' ? 'Tür' : 'Type'}</option>
            <option value="value">{language === 'tr' ? 'Değer' : 'Value'}</option>
          </select>
          <div className="flex gap-2">
            <button 
              onClick={() => setSort(sortBy, 'desc')} 
              className={`flex-1 py-1 px-2 rounded text-sm ${sortOrder === 'desc' ? 'bg-gw2-accent text-gw2-darker' : 'bg-gw2-darker text-gray-400'}`}
            >
              ↓ {language === 'tr' ? 'Azalan' : 'Desc'}
            </button>
            <button 
              onClick={() => setSort(sortBy, 'asc')} 
              className={`flex-1 py-1 px-2 rounded text-sm ${sortOrder === 'asc' ? 'bg-gw2-accent text-gw2-darker' : 'bg-gw2-darker text-gray-400'}`}
            >
              ↑ {language === 'tr' ? 'Artan' : 'Asc'}
            </button>
          </div>
        </div>
        
        {/* Bulk Lock Actions */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            🔒 {language === 'tr' ? 'Toplu Kilitleme' : 'Bulk Lock'}
          </h3>
          <div className="space-y-2">
            {/* Current status */}
            <div className="text-xs text-gray-500 bg-gw2-darker/50 rounded p-2">
              {lockedItemsStats.total > 0 ? (
                <span className="text-yellow-400">
                  {lockedItemsStats.total} {language === 'tr' ? 'item kilitli' : 'items locked'}
                </span>
              ) : (
                <span>{language === 'tr' ? 'Kilitli item yok' : 'No items locked'}</span>
              )}
            </div>
            
            {/* Lock filtered items */}
            <button
              onClick={() => {
                const filtered = filterItems(itemsWithLockStatus, filters);
                lockAllFiltered(filtered);
              }}
              className="w-full py-1.5 px-2 rounded text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30"
            >
              🔒 {language === 'tr' ? 'Filtrelenenleri Kilitle' : 'Lock Filtered'}
            </button>
            
            {/* Unlock filtered items */}
            <button
              onClick={() => {
                const filtered = filterItems(itemsWithLockStatus, filters);
                unlockAllFiltered(filtered);
              }}
              className="w-full py-1.5 px-2 rounded text-xs bg-gw2-darker text-gray-400 hover:text-white border border-gray-700"
            >
              🔓 {language === 'tr' ? 'Filtrelenenlerin Kilidini Aç' : 'Unlock Filtered'}
            </button>
            
            {/* Clear all locks */}
            {lockedItemsStats.total > 0 && (
              <button
                onClick={clearAllManualLocks}
                className="w-full py-1.5 px-2 rounded text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
              >
                ✕ {language === 'tr' ? 'Tüm Kilitleri Kaldır' : 'Clear All Locks'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-700 bg-gw2-darker/50">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>{language === 'tr' ? 'Toplam Item:' : 'Total Items:'}</span>
            <span className="text-white">{stats.totalItems?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>{language === 'tr' ? 'Benzersiz Item:' : 'Unique Items:'}</span>
            <span className="text-white">{stats.uniqueItems?.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
