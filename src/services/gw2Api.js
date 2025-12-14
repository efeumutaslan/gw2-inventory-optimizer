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

// Get account storage information (bank tabs, shared slots)
export async function getAccountStorageInfo(apiKey) {
  const [bankData, sharedData] = await Promise.all([
    getBank(apiKey),
    getSharedInventory(apiKey)
  ]);
  
  // Bank: array length / 30 = number of tabs (each tab has 30 slots)
  const bankSlots = bankData.length;
  const bankTabs = Math.ceil(bankSlots / 30);
  
  // Shared inventory: array length = number of shared slots
  const sharedSlots = sharedData.length;
  
  return {
    bankSlots,
    bankTabs,
    sharedSlots
  };
}

// Get character bag slot information
export async function getCharacterBagInfo(apiKey, characterName) {
  const inventory = await getCharacterInventory(apiKey, characterName);
  
  if (!inventory.bags) {
    return { totalSlots: 0, bags: [] };
  }
  
  const bags = inventory.bags.map((bag, index) => {
    if (!bag) {
      return { slot: index, empty: true, size: 0 };
    }
    return {
      slot: index,
      empty: false,
      id: bag.id,
      size: bag.size
    };
  });
  
  const totalSlots = bags.reduce((sum, bag) => sum + (bag.size || 0), 0);
  const bagSlotCount = inventory.bags.length; // Number of bag slots character has
  
  return {
    totalSlots,
    bagSlotCount,
    bags
  };
}

// Get all characters' bag information
export async function getAllCharactersBagInfo(apiKey) {
  const characters = await getCharacters(apiKey);
  const results = {};
  
  for (const charName of characters) {
    try {
      results[charName] = await getCharacterBagInfo(apiKey, charName);
    } catch (e) {
      console.warn(`Failed to get bag info for ${charName}:`, e);
      results[charName] = { totalSlots: 0, bagSlotCount: 0, bags: [] };
    }
  }
  
  return results;
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
  
  // ===== LEGENDARY CRAFTING MATERIALS =====
  // These should NEVER be recommended to salvage or sell
  
  // Core Legendary Materials
  LEGENDARY_CRAFTING_CORE: [
    19976,  // Mystic Coin
    19721,  // Glob of Ectoplasm
    19675,  // Mystic Clover
    19925,  // Obsidian Shard
    19952,  // Bloodstone Shard
    68063,  // Amalgamated Gemstone
  ],
  
  // T6 Fine Materials (Gift of Magic & Gift of Might - need 250 each)
  T6_FINE_MATERIALS: [
    24295,  // Vial of Powerful Blood
    24351,  // Vicious Claw
    24358,  // Ancient Bone
    24277,  // Pile of Crystalline Dust
    24357,  // Vicious Fang
    24289,  // Armored Scale
    24300,  // Elaborate Totem
    24283,  // Powerful Venom Sac
  ],
  
  // T5 Fine Materials (can be promoted to T6)
  T5_FINE_MATERIALS: [
    24294,  // Vial of Potent Blood
    24350,  // Large Claw
    24341,  // Large Bone
    24276,  // Pile of Incandescent Dust
    24356,  // Large Fang
    24288,  // Large Scale
    24299,  // Intricate Totem
    24282,  // Potent Venom Sac
  ],
  
  // Lodestones (need 100 for most legendaries)
  LODESTONES: [
    24305,  // Charged Lodestone
    24310,  // Onyx Lodestone
    24304,  // Glacial Lodestone
    24303,  // Molten Lodestone
    24306,  // Destroyer Lodestone
    24302,  // Corrupted Lodestone
    24309,  // Crystal Lodestone
    24307,  // Evergreen Lodestone
    46738,  // Mordrem Lodestone
  ],
  
  // Cores (can be promoted to Lodestones)
  CORES: [
    24298,  // Charged Core
    24314,  // Onyx Core
    24327,  // Glacial Core
    24326,  // Molten Core
    24329,  // Destroyer Core
    24325,  // Corrupted Core
    24328,  // Crystal Core
    24330,  // Evergreen Core
    46736,  // Mordrem Core
  ],
  
  // Ascended Materials (T7) - time-gated
  ASCENDED_MATERIALS: [
    46742,  // Deldrimor Steel Ingot
    46745,  // Elonian Leather Square
    46740,  // Bolt of Damask
    46744,  // Spiritwood Plank
    46747,  // Lump of Mithrillium (daily)
    46748,  // Glob of Elder Spirit Residue (daily)
    46749,  // Spool of Thick Elonian Cord (daily)
    46746,  // Spool of Silk Weaving Thread (daily)
  ],
  
  // T6 Common Materials (for Ascended crafting)
  T6_COMMON_MATERIALS: [
    19721,  // Glob of Ectoplasm (also core)
    19737,  // Orichalcum Ore
    19701,  // Orichalcum Ingot
    19745,  // Ancient Wood Log
    19712,  // Ancient Wood Plank
    19748,  // Hardened Leather Section
    19729,  // Cured Hardened Leather Square
    19746,  // Gossamer Scrap
    19745,  // Bolt of Gossamer
  ],
  
  // Gift Components & Special Items
  GIFT_COMPONENTS: [
    19678,  // Gift of Exploration (actually currency)
    19677,  // Gift of Battle
    71581,  // Gift of Maguuma Mastery
    80332,  // Gift of Desert Mastery
    97509,  // Gift of Jade Mastery
  ],
  
  // Precursor Weapons (Gen 1 - tradeable exotics worth 100s of gold)
  PRECURSOR_WEAPONS: [
    29169,  // Dawn (Sunrise)
    29185,  // Dusk (Twilight)
    29180,  // Zap (Bolt)
    29181,  // The Legend (The Bifrost)
    29167,  // Storm (Meteorlogicus)
    29168,  // The Chosen (The Minstrel)
    29166,  // Rage (The Moot)
    29184,  // The Hunter (The Predator)
    29183,  // Spark (Incinerator)
    29175,  // The Lover (The Dreamer)
    29182,  // Rodgort's Flame (Rodgort)
    29177,  // Leaf of Kudzu (Kudzu)
    29170,  // Tooth of Frostfang (Frostfang)
    29176,  // Howl (Howler)
    29178,  // The Bard (The Minstrel variant?)
    29179,  // Chaos Gun (Quip)
    29171,  // Colossus (The Juggernaut)
    30699,  // Venom (Kamohoali'i Kotaki - underwater)
    30698,  // Kraitkin precursor
    30697,  // Shark precursor (Frenzy)
  ],
  
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

// Build a Set of all legendary crafting material IDs for fast lookup
const LEGENDARY_MATERIAL_IDS = new Set([
  ...SPECIAL_ITEMS.LEGENDARY_CRAFTING_CORE,
  ...SPECIAL_ITEMS.T6_FINE_MATERIALS,
  ...SPECIAL_ITEMS.T5_FINE_MATERIALS,
  ...SPECIAL_ITEMS.LODESTONES,
  ...SPECIAL_ITEMS.CORES,
  ...SPECIAL_ITEMS.ASCENDED_MATERIALS,
  ...SPECIAL_ITEMS.T6_COMMON_MATERIALS,
  ...SPECIAL_ITEMS.GIFT_COMPONENTS,
  ...SPECIAL_ITEMS.PRECURSOR_WEAPONS,
]);

// Check if item is a legendary crafting material
export function isLegendaryCraftingMaterial(item) {
  if (!item) return false;
  const itemId = typeof item === 'number' ? item : item.id;
  return LEGENDARY_MATERIAL_IDS.has(itemId);
}

// Get legendary material category
export function getLegendaryMaterialCategory(item) {
  if (!item) return null;
  const itemId = typeof item === 'number' ? item : item.id;
  
  if (SPECIAL_ITEMS.LEGENDARY_CRAFTING_CORE.includes(itemId)) return 'core';
  if (SPECIAL_ITEMS.T6_FINE_MATERIALS.includes(itemId)) return 't6_fine';
  if (SPECIAL_ITEMS.T5_FINE_MATERIALS.includes(itemId)) return 't5_fine';
  if (SPECIAL_ITEMS.LODESTONES.includes(itemId)) return 'lodestone';
  if (SPECIAL_ITEMS.CORES.includes(itemId)) return 'core_mat';
  if (SPECIAL_ITEMS.ASCENDED_MATERIALS.includes(itemId)) return 'ascended';
  if (SPECIAL_ITEMS.T6_COMMON_MATERIALS.includes(itemId)) return 't6_common';
  if (SPECIAL_ITEMS.GIFT_COMPONENTS.includes(itemId)) return 'gift';
  if (SPECIAL_ITEMS.PRECURSOR_WEAPONS.includes(itemId)) return 'precursor';
  
  return null;
}

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
