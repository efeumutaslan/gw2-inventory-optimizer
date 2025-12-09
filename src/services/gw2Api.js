// GW2 API Service
const API_BASE = 'https://api.guildwars2.com/v2';
const ITEMS_CACHE_KEY = 'gw2_items_cache';
const MATERIALS_CACHE_KEY = 'gw2_materials_categories';
const CACHE_VERSION = '1.0';

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100;

async function rateLimitedFetch(url, options = {}) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return rateLimitedFetch(url, options);
  }
  
  return response;
}

function getCachedItems() {
  try {
    const cached = localStorage.getItem(ITEMS_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.version === CACHE_VERSION) {
        return data.items || {};
      }
    }
  } catch (e) {
    console.warn('Failed to read items cache:', e);
  }
  return {};
}

function saveCachedItems(items) {
  try {
    const data = { version: CACHE_VERSION, items, timestamp: Date.now() };
    localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save items cache:', e);
  }
}

export async function validateToken(apiKey) {
  try {
    const response = await rateLimitedFetch(`${API_BASE}/tokeninfo?access_token=${apiKey}`);
    if (!response.ok) throw new Error('Invalid API key');
    
    const data = await response.json();
    const requiredPermissions = ['account', 'inventories', 'characters'];
    const hasAllPermissions = requiredPermissions.every(p => data.permissions.includes(p));
    
    if (!hasAllPermissions) {
      throw new Error(`Missing permissions. Required: ${requiredPermissions.join(', ')}`);
    }
    
    return { valid: true, name: data.name, permissions: data.permissions };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export async function getCharacters(apiKey) {
  const response = await rateLimitedFetch(`${API_BASE}/characters?access_token=${apiKey}`);
  if (!response.ok) throw new Error('Failed to fetch characters');
  return response.json();
}

export async function getCharacterInventory(apiKey, characterName) {
  const encodedName = encodeURIComponent(characterName);
  const response = await rateLimitedFetch(`${API_BASE}/characters/${encodedName}/inventory?access_token=${apiKey}`);
  if (!response.ok) throw new Error(`Failed to fetch inventory for ${characterName}`);
  return response.json();
}

export async function getBank(apiKey) {
  const response = await rateLimitedFetch(`${API_BASE}/account/bank?access_token=${apiKey}`);
  if (!response.ok) throw new Error('Failed to fetch bank');
  return response.json();
}

export async function getMaterials(apiKey) {
  const response = await rateLimitedFetch(`${API_BASE}/account/materials?access_token=${apiKey}`);
  if (!response.ok) throw new Error('Failed to fetch materials');
  return response.json();
}

export async function getSharedInventory(apiKey) {
  const response = await rateLimitedFetch(`${API_BASE}/account/inventory?access_token=${apiKey}`);
  if (!response.ok) throw new Error('Failed to fetch shared inventory');
  return response.json();
}

// Get material storage categories (which items can go to material storage)
export async function getMaterialCategories() {
  try {
    const cached = localStorage.getItem(MATERIALS_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) { // 24 hour cache
        return data.categories;
      }
    }
  } catch (e) {}
  
  const response = await rateLimitedFetch(`${API_BASE}/materials?ids=all`);
  if (!response.ok) throw new Error('Failed to fetch material categories');
  const categories = await response.json();
  
  // Cache the result
  try {
    localStorage.setItem(MATERIALS_CACHE_KEY, JSON.stringify({
      categories,
      timestamp: Date.now()
    }));
  } catch (e) {}
  
  return categories;
}

// Get all item IDs that can be stored in material storage
export async function getMaterialStorageItemIds() {
  const categories = await getMaterialCategories();
  const itemIds = new Set();
  categories.forEach(cat => {
    if (cat.items) {
      cat.items.forEach(id => itemIds.add(id));
    }
  });
  return itemIds;
}

export async function getItemDetails(itemIds) {
  if (!itemIds || itemIds.length === 0) return [];
  
  const cachedItems = getCachedItems();
  const uncachedIds = itemIds.filter(id => !cachedItems[id]);
  const cachedResults = itemIds.filter(id => cachedItems[id]).map(id => cachedItems[id]);
  
  if (uncachedIds.length === 0) return cachedResults;
  
  const batchSize = 200;
  const batches = [];
  for (let i = 0; i < uncachedIds.length; i += batchSize) {
    batches.push(uncachedIds.slice(i, i + batchSize));
  }
  
  const newItems = [];
  for (const batch of batches) {
    try {
      const response = await rateLimitedFetch(`${API_BASE}/items?ids=${batch.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        newItems.push(...data);
        data.forEach(item => { cachedItems[item.id] = item; });
      }
    } catch (e) {
      console.warn('Failed to fetch item batch:', e);
    }
  }
  
  saveCachedItems(cachedItems);
  return [...cachedResults, ...newItems];
}

export async function getAllInventoryData(apiKey, onProgress) {
  const allItems = [];
  const itemIds = new Set();
  const bagIds = new Set(); // Track bag IDs to fetch their details
  
  const progress = (step, detail) => {
    if (onProgress) onProgress({ step, detail });
  };
  
  // Known invisible/safe bag IDs (items in these bags won't be sold or deposited automatically)
  // These bags have "Invisible" in their name or have special NoSell flags
  const INVISIBLE_BAG_IDS = new Set([
    8932,  // 4-Slot Invisible Bag
    8933,  // 8-Slot Invisible Bag  
    8934,  // 15-Slot Invisible Bag
    8941,  // 8-Slot Invisible Bag (crafted)
    8942,  // 12-Slot Invisible Bag (crafted)
    32566, // 20-Slot Invisible Bag
    37364, // 18-Slot Invisible Bag
    37386, // 20-Slot Invisible Bag (different)
    78474, // 24-Slot Invisible Bag
    78661, // 24-Slot Invisible Bag (different)
    79605, // 24-Slot Invisible Bag (different)
    83079, // 28-Slot Invisible Bag
    83660, // 32-Slot Invisible Bag
    85371, // 32-Slot Invisible Bag (different)
    // Safe boxes (similar behavior)
    8936,  // 4-Slot Safe Box
    8937,  // 8-Slot Safe Box
    8938,  // 15-Slot Safe Box
    8943,  // 8-Slot Safe Box (crafted)
    8944,  // 12-Slot Safe Box (crafted)
    9603,  // 20-Slot Safe Box
    37378, // 18-Slot Safe Box
    37396, // 20-Slot Safe Box (different)
    78465, // 24-Slot Safe Box
    78597, // 24-Slot Safe Box (different)
    79632, // 24-Slot Safe Box (different)
    83076, // 28-Slot Safe Box
    83663, // 32-Slot Safe Box
    85372, // 32-Slot Safe Box (different)
  ]);
  
  // Get material storage item IDs first
  progress('materials-categories', 'Material Storage kategorileri yükleniyor...');
  let materialStorageItemIds = new Set();
  try {
    materialStorageItemIds = await getMaterialStorageItemIds();
  } catch (e) {
    console.warn('Failed to fetch material categories:', e);
  }
  
  // Get characters
  progress('characters', 'Karakterler yükleniyor...');
  const characters = await getCharacters(apiKey);
  
  // Get each character's inventory
  for (let i = 0; i < characters.length; i++) {
    const charName = characters[i];
    progress('character', `${charName} envanteri yükleniyor... (${i + 1}/${characters.length})`);
    
    try {
      const inventory = await getCharacterInventory(apiKey, charName);
      if (inventory.bags) {
        inventory.bags.forEach((bag, bagIndex) => {
          if (bag && bag.inventory) {
            const isInvisibleBag = INVISIBLE_BAG_IDS.has(bag.id);
            bagIds.add(bag.id);
            
            bag.inventory.forEach((item, slotIndex) => {
              if (item) {
                allItems.push({
                  ...item,
                  source: 'character',
                  sourceName: charName,
                  bagIndex,
                  slotIndex,
                  bagSize: bag.size,
                  bagId: bag.id,
                  isInInvisibleBag: isInvisibleBag,
                  canGoToMaterialStorage: materialStorageItemIds.has(item.id)
                });
                itemIds.add(item.id);
              }
            });
          }
        });
      }
    } catch (e) {
      console.warn(`Failed to fetch inventory for ${charName}:`, e);
    }
  }
  
  // Get bank
  progress('bank', 'Banka yükleniyor...');
  try {
    const bank = await getBank(apiKey);
    bank.forEach((item, slotIndex) => {
      if (item) {
        allItems.push({ 
          ...item, 
          source: 'bank', 
          slotIndex,
          canGoToMaterialStorage: materialStorageItemIds.has(item.id)
        });
        itemIds.add(item.id);
      }
    });
  } catch (e) {
    console.warn('Failed to fetch bank:', e);
  }
  
  // Get materials (current material storage content)
  progress('materials', 'Material Storage yükleniyor...');
  let materialStorageContent = [];
  let materialStorageUsedSlots = 0;
  try {
    const materials = await getMaterials(apiKey);
    materials.forEach((item, index) => {
      if (item && item.count > 0) {
        materialStorageUsedSlots++; // Her farklı item 1 slot kullanır
        const materialItem = {
          id: item.id,
          count: item.count,
          source: 'materials',
          binding: 'Account',
          slotIndex: index,
          canGoToMaterialStorage: true,
          isInMaterialStorage: true, // Zaten material storage'da
          materialStorageCategory: item.category
        };
        allItems.push(materialItem);
        materialStorageContent.push(materialItem);
        itemIds.add(item.id);
      }
    });
  } catch (e) {
    console.warn('Failed to fetch materials:', e);
  }
  
  // Get shared inventory
  progress('shared', 'Shared Inventory yükleniyor...');
  try {
    const shared = await getSharedInventory(apiKey);
    shared.forEach((item, slotIndex) => {
      if (item) {
        allItems.push({ 
          ...item, 
          source: 'shared', 
          slotIndex,
          canGoToMaterialStorage: materialStorageItemIds.has(item.id)
        });
        itemIds.add(item.id);
      }
    });
  } catch (e) {
    console.warn('Failed to fetch shared inventory:', e);
  }
  
  // Get item details
  progress('items', `Item detayları yükleniyor... (${itemIds.size} item)`);
  const itemDetails = await getItemDetails([...itemIds]);
  
  const itemDetailsMap = {};
  itemDetails.forEach(item => { itemDetailsMap[item.id] = item; });
  
  // Merge
  progress('merge', 'Veriler birleştiriliyor...');
  const enrichedItems = allItems.map(item => {
    const details = itemDetailsMap[item.id] || {};
    return {
      ...item,
      name: details.name || `Unknown Item (${item.id})`,
      icon: details.icon || null,
      type: details.type || 'Unknown',
      rarity: details.rarity || 'Basic',
      level: details.level || 0,
      vendorValue: details.vendor_value || 0,
      flags: details.flags || [],
      details: details.details || null,
      description: details.description || ''
    };
  });
  
  progress('done', 'Tamamlandı!');
  
  return {
    items: enrichedItems,
    characters,
    totalItems: enrichedItems.length,
    uniqueItems: itemIds.size,
    materialStorageItemIds: [...materialStorageItemIds],
    materialStorageContent,
    materialStorageUsedSlots // Kaç farklı item türü var (slot sayısı)
  };
}

export function clearItemCache() {
  localStorage.removeItem(ITEMS_CACHE_KEY);
  localStorage.removeItem(MATERIALS_CACHE_KEY);
}

// ==================== PHASE 5-6: NEW API FUNCTIONS ====================

// Account Unlocks (Wardrobe)
export async function getAccountSkins(apiKey) {
  try {
    const response = await rateLimitedFetch(`${API_BASE}/account/skins?access_token=${apiKey}`);
    if (!response.ok) return [];
    return response.json();
  } catch (e) {
    console.warn('Failed to fetch account skins:', e);
    return [];
  }
}

export async function getAccountDyes(apiKey) {
  try {
    const response = await rateLimitedFetch(`${API_BASE}/account/dyes?access_token=${apiKey}`);
    if (!response.ok) return [];
    return response.json();
  } catch (e) {
    console.warn('Failed to fetch account dyes:', e);
    return [];
  }
}

export async function getAccountMinis(apiKey) {
  try {
    const response = await rateLimitedFetch(`${API_BASE}/account/minis?access_token=${apiKey}`);
    if (!response.ok) return [];
    return response.json();
  } catch (e) {
    console.warn('Failed to fetch account minis:', e);
    return [];
  }
}

export async function getAccountFinishers(apiKey) {
  try {
    const response = await rateLimitedFetch(`${API_BASE}/account/finishers?access_token=${apiKey}`);
    if (!response.ok) return [];
    return response.json();
  } catch (e) {
    console.warn('Failed to fetch account finishers:', e);
    return [];
  }
}

export async function getAccountOutfits(apiKey) {
  try {
    const response = await rateLimitedFetch(`${API_BASE}/account/outfits?access_token=${apiKey}`);
    if (!response.ok) return [];
    return response.json();
  } catch (e) {
    console.warn('Failed to fetch account outfits:', e);
    return [];
  }
}

// Account Wallet (for UFE, etc.)
export async function getAccountWallet(apiKey) {
  try {
    const response = await rateLimitedFetch(`${API_BASE}/account/wallet?access_token=${apiKey}`);
    if (!response.ok) return [];
    return response.json();
  } catch (e) {
    console.warn('Failed to fetch account wallet:', e);
    return [];
  }
}

// Account Achievements
export async function getAccountAchievements(apiKey) {
  try {
    const response = await rateLimitedFetch(`${API_BASE}/account/achievements?access_token=${apiKey}`);
    if (!response.ok) return [];
    return response.json();
  } catch (e) {
    console.warn('Failed to fetch account achievements:', e);
    return [];
  }
}

// Legendary Armory
export async function getAccountLegendaryArmory(apiKey) {
  try {
    const response = await rateLimitedFetch(`${API_BASE}/account/legendaryarmory?access_token=${apiKey}`);
    if (!response.ok) return [];
    return response.json();
  } catch (e) {
    console.warn('Failed to fetch legendary armory:', e);
    return [];
  }
}

// Trading Post Prices
export async function getCommercePrices(itemIds) {
  if (!itemIds || itemIds.length === 0) return {};
  
  const batchSize = 200;
  const prices = {};
  
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize);
    try {
      const response = await rateLimitedFetch(`${API_BASE}/commerce/prices?ids=${batch.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        data.forEach(item => {
          prices[item.id] = {
            buys: item.buys?.unit_price || 0,
            sells: item.sells?.unit_price || 0
          };
        });
      }
    } catch (e) {
      console.warn('Failed to fetch commerce prices:', e);
    }
  }
  
  return prices;
}

// Get all account unlocks in one call
export async function getAllAccountUnlocks(apiKey, onProgress) {
  const progress = (step, detail) => {
    if (onProgress) onProgress({ step, detail });
  };
  
  progress('unlocks', 'Wardrobe verileri yükleniyor...');
  
  const [skins, dyes, minis, finishers, outfits, wallet, legendaryArmory] = await Promise.all([
    getAccountSkins(apiKey),
    getAccountDyes(apiKey),
    getAccountMinis(apiKey),
    getAccountFinishers(apiKey),
    getAccountOutfits(apiKey),
    getAccountWallet(apiKey),
    getAccountLegendaryArmory(apiKey)
  ]);
  
  return {
    skins: new Set(skins),
    dyes: new Set(dyes),
    minis: new Set(minis),
    finishers: new Set(finishers.map(f => f.id)),
    outfits: new Set(outfits),
    wallet: wallet.reduce((acc, w) => { acc[w.id] = w.value; return acc; }, {}),
    legendaryArmory: new Set(legendaryArmory.map(l => l.id))
  };
}

// Known item IDs for special handling
export const SPECIAL_ITEMS = {
  // Killproof items - DON'T consume these
  LEGENDARY_INSIGHT: 77302,
  LEGENDARY_DIVINATION: 88485,
  UNSTABLE_COSMIC_ESSENCE: 81743,
  
  // Upgrade Extractor
  UPGRADE_EXTRACTOR: 20349,
  
  // Salvage kits
  COPPER_FED_SALVAGE: 44602,
  SILVER_FED_SALVAGE: 19986,
  RUNECRAFTER_SALVAGE: 67027,
  
  // Currency IDs (wallet)
  CURRENCY_UFE: 59, // Unstable Fractal Essence
  CURRENCY_LI: 70,  // Legendary Insight (wallet version)
  
  // Raid coffers (killproof containers) - don't open
  RAID_COFFERS: [
    78989, // Vale Guardian Coffer
    79186, // Gorseval Coffer
    78993, // Sabetha Coffer
    80252, // Slothasor Coffer
    80264, // Bandit Trio Coffer
    80269, // Matthias Coffer
    80557, // Escort Coffer
    80623, // Keep Construct Coffer
    80330, // Twisted Castle Coffer
    80387, // Xera Coffer
    81490, // Cairn Coffer
    81462, // Mursaat Overseer Coffer
    81225, // Samarog Coffer
    81267, // Deimos Coffer
    88543, // Soulless Horror Coffer
    88866, // River of Souls Coffer
    88945, // Statues of Grenth Coffer
    88701, // Voice/Claw Coffer
    91270, // Conjured Amalgamate Coffer
    91246, // Twin Largos Coffer
    91175, // Qadim Coffer
    91838, // Cardinal Adina Coffer
    91764, // Cardinal Sabir Coffer
    91781, // Qadim the Peerless Coffer
  ]
};

// Check if item is tradeable on TP
export function isTradeableOnTP(item) {
  const flags = item.flags || [];
  return !flags.includes('AccountBound') && 
         !flags.includes('SoulboundOnAcquire') && 
         !flags.includes('NoSell') &&
         !flags.includes('MonsterOnly');
}

// Check if item can be sold to vendor
export function canSellToVendor(item) {
  const flags = item.flags || [];
  return !flags.includes('NoSell') && (item.vendorValue || 0) > 0;
}

// Check if item unlocks something
export function getUnlockType(item) {
  // Skins
  if (item.default_skin) return { type: 'skin', id: item.default_skin };
  
  // Minis
  if (item.type === 'MiniPet' && item.details?.minipet_id) {
    return { type: 'mini', id: item.details.minipet_id };
  }
  
  // Dyes (Unidentified Dye or specific dye items)
  if (item.type === 'Consumable' && item.details?.type === 'Unlock' && item.details?.unlock_type === 'Dye') {
    return { type: 'dye', id: item.details.color_id };
  }
  
  // Finishers
  if (item.type === 'Consumable' && item.details?.type === 'Unlock' && item.details?.unlock_type === 'Content') {
    return { type: 'finisher', id: item.id };
  }
  
  // Outfits
  if (item.type === 'Consumable' && item.details?.type === 'Unlock' && item.details?.unlock_type === 'Outfit') {
    return { type: 'outfit', id: item.details.id };
  }
  
  return null;
}

// Get equipment upgrades (runes/sigils)
export function getEquipmentUpgrades(item) {
  if (!item.details) return [];
  
  const upgrades = [];
  
  // Infusions
  if (item.details.infusion_slots) {
    item.details.infusion_slots.forEach(slot => {
      if (slot.item_id) {
        upgrades.push({ type: 'infusion', id: slot.item_id });
      }
    });
  }
  
  // Upgrade component (rune/sigil)
  if (item.upgrades) {
    item.upgrades.forEach(id => {
      upgrades.push({ type: 'upgrade', id });
    });
  }
  
  return upgrades;
}
