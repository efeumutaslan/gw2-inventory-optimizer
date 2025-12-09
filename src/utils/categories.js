// Item Categories and Classification System

export const CATEGORIES = {
  all: { name: 'Tümü', icon: '📦', filter: () => true },
  equipment: {
    name: 'Ekipman', icon: '⚔️',
    filter: (item) => ['Weapon', 'Armor', 'Trinket', 'Back'].includes(item.type),
    subCategories: {
      weapons: { name: 'Silahlar', filter: (item) => item.type === 'Weapon' },
      armor: { name: 'Zırh', filter: (item) => item.type === 'Armor' },
      trinkets: { name: 'Takılar', filter: (item) => item.type === 'Trinket' },
      back: { name: 'Sırt', filter: (item) => item.type === 'Back' }
    }
  },
  consumables: {
    name: 'Tüketilebilir', icon: '🍖',
    filter: (item) => item.type === 'Consumable',
    subCategories: {
      food: { name: 'Yiyecek', filter: (item) => item.type === 'Consumable' && item.details?.type === 'Food' },
      utility: { name: 'Utility', filter: (item) => item.type === 'Consumable' && item.details?.type === 'Utility' },
      other: { name: 'Diğer', filter: (item) => item.type === 'Consumable' && !['Food', 'Utility'].includes(item.details?.type) }
    }
  },
  crafting: {
    name: 'Craft Malzemeleri', icon: '🔨',
    filter: (item) => item.type === 'CraftingMaterial',
    subCategories: {
      common: { name: 'Temel', filter: (item) => item.type === 'CraftingMaterial' && ['Basic', 'Fine'].includes(item.rarity) },
      fine: { name: 'İyi', filter: (item) => item.type === 'CraftingMaterial' && item.rarity === 'Masterwork' },
      rare: { name: 'Nadir', filter: (item) => item.type === 'CraftingMaterial' && ['Rare', 'Exotic'].includes(item.rarity) },
      ascended: { name: 'Ascended', filter: (item) => item.type === 'CraftingMaterial' && ['Ascended', 'Legendary'].includes(item.rarity) }
    }
  },
  upgrades: {
    name: 'Yükseltmeler', icon: '💎',
    filter: (item) => item.type === 'UpgradeComponent',
    subCategories: {
      runes: { name: 'Rune', filter: (item) => item.type === 'UpgradeComponent' && item.details?.type === 'Rune' },
      sigils: { name: 'Sigil', filter: (item) => item.type === 'UpgradeComponent' && item.details?.type === 'Sigil' },
      other: { name: 'Diğer', filter: (item) => item.type === 'UpgradeComponent' && !['Rune', 'Sigil'].includes(item.details?.type) }
    }
  },
  containers: {
    name: 'Konteynerler', icon: '📦',
    filter: (item) => ['Container', 'Bag'].includes(item.type),
    subCategories: {
      bags: { name: 'Çantalar', filter: (item) => item.type === 'Bag' },
      boxes: { name: 'Kutular', filter: (item) => item.type === 'Container' }
    }
  },
  collectibles: {
    name: 'Koleksiyonlar', icon: '🎭',
    filter: (item) => ['MiniPet', 'Gizmo'].includes(item.type),
    subCategories: {
      minis: { name: 'Miniler', filter: (item) => item.type === 'MiniPet' },
      gizmos: { name: 'Gizmolar', filter: (item) => item.type === 'Gizmo' }
    }
  },
  tools: { name: 'Araçlar', icon: '🛠️', filter: (item) => ['Gathering', 'Tool'].includes(item.type) },
  trophies: { name: 'Ganimetler', icon: '🏆', filter: (item) => item.type === 'Trophy' },
  other: {
    name: 'Diğer', icon: '❓',
    filter: (item) => !['Weapon', 'Armor', 'Trinket', 'Back', 'Consumable', 'CraftingMaterial', 
      'UpgradeComponent', 'Container', 'Bag', 'MiniPet', 'Gizmo', 'Gathering', 'Tool', 'Trophy'].includes(item.type)
  }
};

export const RARITY_ORDER = {
  'Junk': 0, 'Basic': 1, 'Fine': 2, 'Masterwork': 3,
  'Rare': 4, 'Exotic': 5, 'Ascended': 6, 'Legendary': 7
};

export const RARITY_COLORS = {
  'Junk': '#AAAAAA', 'Basic': '#FFFFFF', 'Fine': '#62A4DA', 'Masterwork': '#1A9306',
  'Rare': '#FCD00B', 'Exotic': '#FFA405', 'Ascended': '#FB3E8D', 'Legendary': '#4C139D'
};

export const SOURCE_LABELS = {
  'character': 'Karakter', 'bank': 'Banka', 'materials': 'Material Storage', 'shared': 'Shared Inventory'
};

export function classifyItem(item) {
  for (const [key, category] of Object.entries(CATEGORIES)) {
    if (key !== 'all' && category.filter(item)) return key;
  }
  return 'other';
}

export function sortItems(items, sortBy = 'rarity', sortOrder = 'desc') {
  return [...items].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'rarity': comparison = (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0); break;
      case 'name': comparison = (a.name || '').localeCompare(b.name || ''); break;
      case 'level': comparison = (a.level || 0) - (b.level || 0); break;
      case 'count': comparison = (a.count || 0) - (b.count || 0); break;
      case 'type': comparison = (a.type || '').localeCompare(b.type || ''); break;
      case 'value': comparison = (a.vendorValue || 0) - (b.vendorValue || 0); break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

export function filterItems(items, filters) {
  return items.filter(item => {
    if (filters.category && filters.category !== 'all') {
      const category = CATEGORIES[filters.category];
      if (category && !category.filter(item)) return false;
    }
    if (filters.subCategory && filters.category) {
      const category = CATEGORIES[filters.category];
      if (category?.subCategories?.[filters.subCategory]) {
        if (!category.subCategories[filters.subCategory].filter(item)) return false;
      }
    }
    if (filters.rarities && filters.rarities.length > 0) {
      if (!filters.rarities.includes(item.rarity)) return false;
    }
    if (filters.sources && filters.sources.length > 0) {
      if (!filters.sources.includes(item.source)) return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = item.name?.toLowerCase().includes(searchLower);
      const typeMatch = item.type?.toLowerCase().includes(searchLower);
      if (!nameMatch && !typeMatch) return false;
    }
    return true;
  });
}

export function groupItems(items, groupBy) {
  const groups = {};
  items.forEach(item => {
    let key;
    switch (groupBy) {
      case 'category': key = classifyItem(item); break;
      case 'rarity': key = item.rarity || 'Unknown'; break;
      case 'type': key = item.type || 'Unknown'; break;
      case 'source': key = item.source || 'Unknown'; break;
      case 'character': key = item.sourceName || item.source || 'Unknown'; break;
      default: key = 'all';
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

export function formatGoldValue(copperValue) {
  const gold = Math.floor(copperValue / 10000);
  const silver = Math.floor((copperValue % 10000) / 100);
  const copper = copperValue % 100;
  const parts = [];
  if (gold > 0) parts.push(`${gold}g`);
  if (silver > 0) parts.push(`${silver}s`);
  if (copper > 0 || parts.length === 0) parts.push(`${copper}c`);
  return parts.join(' ');
}
