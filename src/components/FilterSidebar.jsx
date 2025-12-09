import { useInventory } from '../context/InventoryContext';
import { CATEGORIES, RARITY_COLORS, SOURCE_LABELS } from '../utils/categories';

export default function FilterSidebar() {
  const { filters, setFilters, stats, sortBy, sortOrder, setSort } = useInventory();
  
  const rarities = ['Legendary', 'Ascended', 'Exotic', 'Rare', 'Masterwork', 'Fine', 'Basic', 'Junk'];
  const sources = ['character', 'bank', 'materials', 'shared'];
  
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
        <h2 className="font-semibold text-white">Filtreler</h2>
        {hasActiveFilters && <button onClick={clearFilters} className="text-xs text-gw2-accent hover:underline">Temizle</button>}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Categories */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Kategoriler</h3>
          <div className="space-y-1">
            {Object.entries(CATEGORIES).map(([key, category]) => (
              <div key={key}>
                <button
                  onClick={() => setFilters({ category: key, subCategory: null })}
                  className={`category-tab w-full text-left flex items-center gap-2 ${filters.category === key ? 'active' : ''}`}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
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
                        {subCat.name}
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
          <h3 className="text-sm font-medium text-gray-400 mb-2">Nadirlik</h3>
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
                {rarity}
              </button>
            ))}
          </div>
        </div>
        
        {/* Source */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Kaynak</h3>
          <div className="space-y-1">
            {sources.map(source => (
              <label key={source} className="flex items-center gap-2 cursor-pointer hover:bg-gw2-darker p-2 rounded">
                <input
                  type="checkbox"
                  checked={filters.sources?.includes(source) || false}
                  onChange={() => toggleSource(source)}
                  className="rounded border-gray-600 bg-gw2-darker text-gw2-accent"
                />
                <span className="text-sm text-gray-300">{SOURCE_LABELS[source]}</span>
                <span className="ml-auto text-xs text-gray-500">{stats.bySource?.[source] || 0}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Sort */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Sıralama</h3>
          <select value={sortBy} onChange={(e) => setSort(e.target.value, sortOrder)} className="input-field text-sm mb-2">
            <option value="rarity">Nadirlik</option>
            <option value="name">İsim</option>
            <option value="level">Level</option>
            <option value="count">Miktar</option>
            <option value="type">Tür</option>
            <option value="value">Değer</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => setSort(sortBy, 'desc')} className={`flex-1 py-1 px-2 rounded text-sm ${sortOrder === 'desc' ? 'bg-gw2-accent text-gw2-darker' : 'bg-gw2-darker text-gray-400'}`}>↓ Azalan</button>
            <button onClick={() => setSort(sortBy, 'asc')} className={`flex-1 py-1 px-2 rounded text-sm ${sortOrder === 'asc' ? 'bg-gw2-accent text-gw2-darker' : 'bg-gw2-darker text-gray-400'}`}>↑ Artan</button>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-700 bg-gw2-darker/50">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between"><span>Toplam Item:</span><span className="text-white">{stats.totalItems?.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Benzersiz Item:</span><span className="text-white">{stats.uniqueItems?.toLocaleString()}</span></div>
        </div>
      </div>
    </div>
  );
}
