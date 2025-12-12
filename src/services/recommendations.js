// Smart Item Recommendations Service
// Inspired by gw2stacks - provides cleanup suggestions

import { 
  SPECIAL_ITEMS, 
  isTradeableOnTP, 
  canSellToVendor, 
  getUnlockType,
  getEquipmentUpgrades,
  isLegendaryCraftingMaterial,
  getLegendaryMaterialCategory
} from './gw2Api';

// Recommendation types
export const RECOMMENDATION_TYPES = {
  SELL_TP: 'sell_tp',           // Sell on Trading Post
  SELL_VENDOR: 'sell_vendor',   // Sell to NPC vendor
  USE_UNLOCK: 'use_unlock',     // Use to unlock skin/dye/mini
  DESTROY: 'destroy',           // Safe to destroy (already unlocked)
  KEEP_KILLPROOF: 'keep_kp',    // Keep for killproof
  KEEP_LEGENDARY: 'keep_leg',   // Keep for legendary crafting
  EXTRACT_UPGRADE: 'extract',   // Extract rune/sigil
  SALVAGE: 'salvage',           // Salvage for materials
  STACK: 'stack',               // Merge incomplete stacks
  CONSUME: 'consume',           // Use consumable
  KEEP: 'keep',                 // No action needed
  DEPOSIT: 'deposit',           // Deposit to Material Storage
  WARNING: 'warning',           // Warning about item
};

// Known valuable salvage items - prioritize these for good salvage kits
const VALUABLE_SALVAGE_ITEMS = {
  // Exotic gear often has valuable inscriptions/insignia
  // Ascended gear gives stabilizing matrices
};

// Items that look like junk but aren't - NEVER destroy or sell to vendor
const DECEPTIVE_ITEMS = new Set([
  // Ascended crafting materials (converter/gobbler inputs)
  68646, // Dragonite Ore
  68645, // Empyreal Fragment  
  68642, // Pile of Bloodstone Dust
  
  // Mists essences (Fractal crafting)
  79230, // Glob of Coagulated Mists Essence
  79469, // Shard of Crystallized Mists Essence
  79899, // Chunk of Crystallized Mists Essence
  
  // Valuable currencies that look like items
  20796, // Fractal Relic
  75919, // Pristine Fractal Relic
  94020, // Unstable Fractal Essence
  
  // Spirit Shards (legendary crafting)
  20820, // Spirit Shard
  
  // Map currencies
  79280, // Unbound Magic
  86069, // Volatile Magic
  
  // Obsidian (legendary crafting)
  19925, // Obsidian Shard
]);

// Unidentified gear items - special handling
const UNIDENTIFIED_GEAR = new Set([
  79048, // Common Unidentified Gear (Blue)
  79049, // Piece of Unidentified Gear (Green)
  79050, // Rare Unidentified Gear (Yellow)
]);

// Valuable containers that should be opened, not sold/destroyed
const VALUABLE_CONTAINERS = new Set([
  // Fractal encryptions
  75919, // Cracked Fractal Encryption
  
  // Map reward containers
  78122, // Bag of Gear
  
  // Living World containers
  79469, // Difluorite Crystal
  86069, // Volatile Magic container
]);

// Items for converters/gobblers - don't recommend selling if under certain amounts
const CONVERTER_MATERIALS = {
  68642: { name: 'Bloodstone Dust', neededFor: 'Mawdrey II, Herta', minKeep: 250 },
  68646: { name: 'Dragonite Ore', neededFor: 'Princess, Sentient Aberration', minKeep: 250 },
  68645: { name: 'Empyreal Fragment', neededFor: 'Star of Gratitude, Sentient Anomaly', minKeep: 250 },
};

// Holiday/Event items that might be valuable later
const SEASONAL_ITEMS_KEYWORDS = [
  'wintersday', 'halloween', 'lunar new year', 'festival', 
  'dragon bash', 'super adventure', 'anniversary'
];

// Salvage kit IDs for reference
const SALVAGE_KITS = {
  COPPER_FED: 44602,
  SILVER_FED: 23040,
  RUNECRAFTER: 67027,
  MYSTIC: 23038,
  BLACK_LION: 23041,
};

// Priority for sorting recommendations
const PRIORITY = {
  [RECOMMENDATION_TYPES.WARNING]: 0,
  [RECOMMENDATION_TYPES.USE_UNLOCK]: 1,
  [RECOMMENDATION_TYPES.SELL_TP]: 2,
  [RECOMMENDATION_TYPES.EXTRACT_UPGRADE]: 3,
  [RECOMMENDATION_TYPES.SALVAGE]: 4,
  [RECOMMENDATION_TYPES.SELL_VENDOR]: 5,
  [RECOMMENDATION_TYPES.DEPOSIT]: 6,
  [RECOMMENDATION_TYPES.DESTROY]: 7,
  [RECOMMENDATION_TYPES.STACK]: 8,
  [RECOMMENDATION_TYPES.CONSUME]: 9,
  [RECOMMENDATION_TYPES.KEEP_KILLPROOF]: 10,
  [RECOMMENDATION_TYPES.KEEP_LEGENDARY]: 10,
  [RECOMMENDATION_TYPES.KEEP]: 11,
};

/**
 * Generate recommendations for all items
 * @param {Array} items - All inventory items
 * @param {Object} unlocks - Account unlocks from getAllAccountUnlocks
 * @param {Object} prices - TP prices from getCommercePrices
 * @param {Object} options - Additional options
 */
export function generateRecommendations(items, unlocks = {}, prices = {}, options = {}) {
  const recommendations = [];
  const stackableItems = new Map(); // Track items for stacking
  
  // Default unlocks if not provided
  const accountUnlocks = {
    skins: unlocks.skins || new Set(),
    dyes: unlocks.dyes || new Set(),
    minis: unlocks.minis || new Set(),
    finishers: unlocks.finishers || new Set(),
    outfits: unlocks.outfits || new Set(),
    legendaryArmory: unlocks.legendaryArmory || new Set(),
    wallet: unlocks.wallet || {}
  };
  
  for (const item of items) {
    const rec = analyzeItem(item, accountUnlocks, prices, options);
    if (rec) {
      recommendations.push(rec);
    }
    
    // Track stackable items
    if (item.count && item.count < 250) {
      const key = item.id;
      if (!stackableItems.has(key)) {
        stackableItems.set(key, []);
      }
      stackableItems.get(key).push(item);
    }
  }
  
  // Add stack recommendations
  for (const [itemId, stacks] of stackableItems) {
    if (stacks.length > 1) {
      const totalCount = stacks.reduce((sum, s) => sum + (s.count || 1), 0);
      const locations = [...new Set(stacks.map(s => s.sourceName || s.source))];
      
      recommendations.push({
        type: RECOMMENDATION_TYPES.STACK,
        items: stacks,
        itemId,
        itemName: stacks[0].name,
        icon: stacks[0].icon,
        totalCount,
        stackCount: stacks.length,
        locations,
        priority: PRIORITY[RECOMMENDATION_TYPES.STACK],
        message: `${stacks.length} incomplete stacks (${totalCount} total) - merge to save ${stacks.length - Math.ceil(totalCount / 250)} slots`
      });
    }
  }
  
  // Sort by priority
  recommendations.sort((a, b) => (a.priority || 99) - (b.priority || 99));
  
  return recommendations;
}

/**
 * Analyze a single item and return recommendation
 */
function analyzeItem(item, unlocks, prices, options) {
  // Skip locked items
  if (item.isLocked) return null;
  
  // Skip items in Material Storage
  if (item.source === 'materials') return null;
  
  const flags = item.flags || [];
  const isAccountBound = flags.includes('AccountBound') || flags.includes('SoulboundOnAcquire');
  
  // 1. Killproof items - NEVER consume
  if (isKillproofItem(item)) {
    return {
      type: RECOMMENDATION_TYPES.KEEP_KILLPROOF,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.KEEP_KILLPROOF],
      message: 'Killproof item - do not consume or destroy',
      warning: true
    };
  }
  
  // 2. Legendary crafting materials - NEVER salvage or sell
  if (isLegendaryCraftingMaterial(item)) {
    const category = getLegendaryMaterialCategory(item);
    const categoryMessages = {
      'core': 'Core legendary material (Mystic Coin, Ecto, Clover)',
      't6_fine': 'T6 Fine Material - needed for Gift of Magic/Might',
      't5_fine': 'T5 Fine Material - can be promoted to T6',
      'lodestone': 'Lodestone - needed for legendary weapon gifts',
      'core_mat': 'Core - can be promoted to Lodestone',
      'ascended': 'Ascended crafting material (time-gated)',
      't6_common': 'T6 Common Material - needed for ascended/legendary',
      'gift': 'Gift component - needed for legendary crafting',
      'precursor': 'Precursor weapon - needed to craft legendary!'
    };
    
    return {
      type: RECOMMENDATION_TYPES.KEEP_LEGENDARY,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.KEEP_LEGENDARY],
      message: categoryMessages[category] || 'Legendary crafting material - do not sell or salvage!',
      category,
      warning: category === 'precursor', // Extra warning for precursors
      important: true
    };
  }
  
  // 3. Junk items - sell to vendor
  if (item.rarity === 'Junk') {
    return {
      type: RECOMMENDATION_TYPES.SELL_VENDOR,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.SELL_VENDOR],
      value: (item.vendorValue || 0) * (item.count || 1),
      message: 'Junk item - sell to NPC'
    };
  }
  
  // 3. Check if item unlocks something
  const unlockInfo = getUnlockType(item);
  if (unlockInfo) {
    const isUnlocked = checkIfUnlocked(unlockInfo, unlocks);
    
    if (isUnlocked && isAccountBound) {
      // Already unlocked and account bound - can destroy
      return {
        type: RECOMMENDATION_TYPES.DESTROY,
        item,
        priority: PRIORITY[RECOMMENDATION_TYPES.DESTROY],
        unlockType: unlockInfo.type,
        message: `Already unlocked ${unlockInfo.type} - safe to destroy`
      };
    } else if (isUnlocked && !isAccountBound) {
      // Already unlocked but tradeable - sell on TP
      const price = prices[item.id];
      if (price && price.sells > 0) {
        return {
          type: RECOMMENDATION_TYPES.SELL_TP,
          item,
          priority: PRIORITY[RECOMMENDATION_TYPES.SELL_TP],
          tpPrice: price.sells,
          message: `Already unlocked - sell on TP for ${formatGold(price.sells)}`
        };
      }
    } else if (!isUnlocked) {
      // Not unlocked - use it!
      return {
        type: RECOMMENDATION_TYPES.USE_UNLOCK,
        item,
        priority: PRIORITY[RECOMMENDATION_TYPES.USE_UNLOCK],
        unlockType: unlockInfo.type,
        message: `Use to unlock ${unlockInfo.type}`,
        important: true
      };
    }
  }
  
  // 4. Equipment with upgrades - check extraction value
  if (['Weapon', 'Armor', 'Trinket', 'Back'].includes(item.type)) {
    const upgrades = getEquipmentUpgrades(item);
    if (upgrades.length > 0) {
      // Check if extraction is worth it
      const extractorCost = 2500; // ~25 silver in gems converted to gold (approximate)
      let totalUpgradeValue = 0;
      
      for (const upgrade of upgrades) {
        const upgradePrice = prices[upgrade.id];
        if (upgradePrice) {
          totalUpgradeValue += upgradePrice.sells || 0;
        }
      }
      
      if (totalUpgradeValue > extractorCost) {
        return {
          type: RECOMMENDATION_TYPES.EXTRACT_UPGRADE,
          item,
          priority: PRIORITY[RECOMMENDATION_TYPES.EXTRACT_UPGRADE],
          upgrades,
          upgradeValue: totalUpgradeValue,
          message: `Extract upgrades worth ${formatGold(totalUpgradeValue)}`
        };
      }
    }
    
    // Check if player has legendary version (can salvage ascended/exotic)
    if (hasLegendaryEquivalent(item, unlocks.legendaryArmory)) {
      if (item.rarity === 'Ascended' || item.rarity === 'Exotic') {
        return {
          type: RECOMMENDATION_TYPES.SALVAGE,
          item,
          priority: PRIORITY[RECOMMENDATION_TYPES.SALVAGE],
          message: `Have legendary ${item.details?.type || item.type} - can salvage`,
          reason: 'legendary_owned'
        };
      }
    }
  }
  
  // 5. Trophies - usually sell to vendor
  if (item.type === 'Trophy') {
    // Check if it's a heart trophy or event trophy
    if (canSellToVendor(item)) {
      return {
        type: RECOMMENDATION_TYPES.SELL_VENDOR,
        item,
        priority: PRIORITY[RECOMMENDATION_TYPES.SELL_VENDOR],
        value: (item.vendorValue || 0) * (item.count || 1),
        message: 'Trophy - sell to NPC'
      };
    }
  }
  
  // 6. Non-bound items with TP value
  if (!isAccountBound && isTradeableOnTP(item)) {
    const price = prices[item.id];
    if (price && price.sells > 100) { // More than 1 silver
      // Only recommend selling if not equipment (equipment has other uses)
      if (!['Weapon', 'Armor', 'Trinket', 'Back'].includes(item.type)) {
        return {
          type: RECOMMENDATION_TYPES.SELL_TP,
          item,
          priority: PRIORITY[RECOMMENDATION_TYPES.SELL_TP] + 1, // Lower priority than unlock sells
          tpPrice: price.sells * (item.count || 1),
          message: `Can sell on TP for ${formatGold(price.sells * (item.count || 1))}`
        };
      }
    }
  }
  
  // 7. Consumables that should be used
  if (item.type === 'Consumable') {
    const consumableType = item.details?.type;
    
    // Boosters, tonics, etc.
    if (['Booze', 'Food', 'Utility', 'Generic'].includes(consumableType)) {
      // Don't recommend using food/utility in inventory panel
      return null;
    }
    
    // Containers that aren't killproof
    if (consumableType === 'Unlock' || item.type === 'Container') {
      if (!isKillproofContainer(item)) {
        return {
          type: RECOMMENDATION_TYPES.CONSUME,
          item,
          priority: PRIORITY[RECOMMENDATION_TYPES.CONSUME],
          message: 'Open/Use this item'
        };
      }
    }
  }
  
  // 8. Raid coffers - WARNING: Don't open (killproof)
  if (isKillproofContainer(item)) {
    return {
      type: RECOMMENDATION_TYPES.WARNING,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.WARNING],
      message: 'Raid coffer - keep for killproof! Don\'t open!',
      warning: true,
      important: true
    };
  }
  
  // 9. Unidentified gear - special handling
  if (UNIDENTIFIED_GEAR.has(item.id)) {
    const gearType = {
      79048: { name: 'Common (Blue)', tip: 'Open or sell on TP - chance for higher rarity' },
      79049: { name: 'Masterwork (Green)', tip: 'Open first - chance for Rare/Exotic' },
      79050: { name: 'Rare (Yellow)', tip: 'ALWAYS open first - chance for Exotic!' }
    }[item.id];
    
    return {
      type: RECOMMENDATION_TYPES.CONSUME,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.CONSUME] - 1, // Higher priority
      message: `Unidentified Gear (${gearType.name}): ${gearType.tip}`,
      important: item.id === 79050 // Yellow unid is important
    };
  }
  
  // 10. Crafting materials that can go to Material Storage
  if (item.type === 'CraftingMaterial' && item.canGoToMaterialStorage) {
    return {
      type: RECOMMENDATION_TYPES.DEPOSIT,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.DEPOSIT],
      message: 'Deposit to Material Storage'
    };
  }
  
  // 11. Converter/Gobbler input materials
  const converterMat = CONVERTER_MATERIALS[item.id];
  if (converterMat) {
    return {
      type: RECOMMENDATION_TYPES.WARNING,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.WARNING] + 1, // Slightly lower than critical warnings
      message: `${converterMat.name} - use with ${converterMat.neededFor}. Keep for daily conversions!`,
      warning: true
    };
  }
  
  // 12. Deceptive items that look like junk but aren't
  if (DECEPTIVE_ITEMS.has(item.id)) {
    const deceptiveMessages = {
      68646: 'Dragonite Ore - converter material, don\'t destroy!',
      68645: 'Empyreal Fragment - converter material, don\'t destroy!',
      68642: 'Bloodstone Dust - converter material, don\'t destroy!',
      79230: 'Mists Essence - Fractal crafting material!',
      79469: 'Mists Essence - valuable Fractal material!',
      79899: 'Mists Essence - valuable Fractal material!',
      20820: 'Spirit Shard - legendary crafting currency!',
      19925: 'Obsidian Shard - legendary crafting material!',
    };
    
    return {
      type: RECOMMENDATION_TYPES.WARNING,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.WARNING],
      message: deceptiveMessages[item.id] || 'Valuable material - don\'t sell to vendor!',
      warning: true
    };
  }
  
  return null;
}

/**
 * Check if unlock is already owned
 */
function checkIfUnlocked(unlockInfo, unlocks) {
  switch (unlockInfo.type) {
    case 'skin':
      return unlocks.skins.has(unlockInfo.id);
    case 'dye':
      return unlocks.dyes.has(unlockInfo.id);
    case 'mini':
      return unlocks.minis.has(unlockInfo.id);
    case 'finisher':
      return unlocks.finishers.has(unlockInfo.id);
    case 'outfit':
      return unlocks.outfits.has(unlockInfo.id);
    default:
      return false;
  }
}

/**
 * Check if item is a killproof item
 */
function isKillproofItem(item) {
  return item.id === SPECIAL_ITEMS.LEGENDARY_INSIGHT ||
         item.id === SPECIAL_ITEMS.LEGENDARY_DIVINATION ||
         item.id === SPECIAL_ITEMS.UNSTABLE_COSMIC_ESSENCE;
}

/**
 * Check if item is a killproof container (raid coffer)
 */
function isKillproofContainer(item) {
  return SPECIAL_ITEMS.RAID_COFFERS.includes(item.id);
}

/**
 * Check if player has legendary equivalent for equipment piece
 */
function hasLegendaryEquivalent(item, legendaryArmory) {
  // Simplified check - in reality would need to match slot type
  if (!item.details) return false;
  
  // Check if any legendary in armory matches the slot
  // This is a simplified version - actual implementation would be more complex
  return legendaryArmory && legendaryArmory.size > 0;
}

/**
 * Format copper value to gold string
 */
function formatGold(copper) {
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor((copper % 10000) / 100);
  const copperRem = copper % 100;
  
  const parts = [];
  if (gold > 0) parts.push(`${gold}g`);
  if (silver > 0) parts.push(`${silver}s`);
  if (copperRem > 0 || parts.length === 0) parts.push(`${copperRem}c`);
  
  return parts.join(' ');
}

/**
 * Group recommendations by type
 */
export function groupRecommendationsByType(recommendations) {
  const groups = {};
  
  for (const rec of recommendations) {
    if (!groups[rec.type]) {
      groups[rec.type] = [];
    }
    groups[rec.type].push(rec);
  }
  
  return groups;
}

/**
 * Get summary statistics for recommendations
 */
export function getRecommendationStats(recommendations) {
  const stats = {
    totalItems: recommendations.length,
    potentialGold: 0,
    slotsToFree: 0,
    byType: {}
  };
  
  for (const rec of recommendations) {
    // Count by type
    stats.byType[rec.type] = (stats.byType[rec.type] || 0) + 1;
    
    // Calculate potential gold
    if (rec.tpPrice) {
      stats.potentialGold += rec.tpPrice;
    } else if (rec.value) {
      stats.potentialGold += rec.value;
    }
    
    // Calculate slots to free
    if (rec.type === RECOMMENDATION_TYPES.STACK) {
      stats.slotsToFree += rec.stackCount - Math.ceil(rec.totalCount / 250);
    } else if ([
      RECOMMENDATION_TYPES.SELL_TP,
      RECOMMENDATION_TYPES.SELL_VENDOR,
      RECOMMENDATION_TYPES.DESTROY,
      RECOMMENDATION_TYPES.CONSUME
    ].includes(rec.type)) {
      stats.slotsToFree += 1;
    }
  }
  
  return stats;
}

/**
 * Get human-readable label for recommendation type
 */
export function getRecommendationLabel(type, language = 'en') {
  const labels = {
    en: {
      [RECOMMENDATION_TYPES.SELL_TP]: 'Sell on TP',
      [RECOMMENDATION_TYPES.SELL_VENDOR]: 'Sell to NPC',
      [RECOMMENDATION_TYPES.USE_UNLOCK]: 'Unlock',
      [RECOMMENDATION_TYPES.DESTROY]: 'Destroy',
      [RECOMMENDATION_TYPES.KEEP_KILLPROOF]: 'Killproof',
      [RECOMMENDATION_TYPES.EXTRACT_UPGRADE]: 'Extract',
      [RECOMMENDATION_TYPES.SALVAGE]: 'Salvage',
      [RECOMMENDATION_TYPES.STACK]: 'Stack',
      [RECOMMENDATION_TYPES.CONSUME]: 'Use',
      [RECOMMENDATION_TYPES.KEEP]: 'Keep',
      [RECOMMENDATION_TYPES.DEPOSIT]: 'Deposit',
      [RECOMMENDATION_TYPES.WARNING]: 'Warning',
      [RECOMMENDATION_TYPES.KEEP_LEGENDARY]: 'Legendary Mat',
    },
    tr: {
      [RECOMMENDATION_TYPES.SELL_TP]: 'TP\'de Sat',
      [RECOMMENDATION_TYPES.SELL_VENDOR]: 'NPC\'ye Sat',
      [RECOMMENDATION_TYPES.USE_UNLOCK]: 'Aç',
      [RECOMMENDATION_TYPES.DESTROY]: 'Yok Et',
      [RECOMMENDATION_TYPES.KEEP_KILLPROOF]: 'Killproof',
      [RECOMMENDATION_TYPES.KEEP_LEGENDARY]: 'Legendary Malz.',
      [RECOMMENDATION_TYPES.EXTRACT_UPGRADE]: 'Çıkar',
      [RECOMMENDATION_TYPES.SALVAGE]: 'Salvage',
      [RECOMMENDATION_TYPES.STACK]: 'Birleştir',
      [RECOMMENDATION_TYPES.CONSUME]: 'Kullan',
      [RECOMMENDATION_TYPES.KEEP]: 'Tut',
      [RECOMMENDATION_TYPES.DEPOSIT]: 'Depola',
      [RECOMMENDATION_TYPES.WARNING]: 'Uyarı',
    }
  };
  
  return labels[language]?.[type] || labels.en[type] || type;
}

/**
 * Get color for recommendation type
 */
export function getRecommendationColor(type) {
  const colors = {
    [RECOMMENDATION_TYPES.SELL_TP]: '#FFD700',      // Gold
    [RECOMMENDATION_TYPES.SELL_VENDOR]: '#C0C0C0',  // Silver
    [RECOMMENDATION_TYPES.USE_UNLOCK]: '#00FF00',   // Green
    [RECOMMENDATION_TYPES.DESTROY]: '#FF4444',      // Red
    [RECOMMENDATION_TYPES.KEEP_KILLPROOF]: '#FF00FF', // Magenta
    [RECOMMENDATION_TYPES.KEEP_LEGENDARY]: '#FFA500', // Orange (legendary)
    [RECOMMENDATION_TYPES.EXTRACT_UPGRADE]: '#00BFFF', // Blue
    [RECOMMENDATION_TYPES.SALVAGE]: '#FFA500',      // Orange
    [RECOMMENDATION_TYPES.STACK]: '#9370DB',        // Purple
    [RECOMMENDATION_TYPES.CONSUME]: '#32CD32',      // Lime
    [RECOMMENDATION_TYPES.KEEP]: '#808080',         // Gray
    [RECOMMENDATION_TYPES.DEPOSIT]: '#4169E1',      // Royal Blue
    [RECOMMENDATION_TYPES.WARNING]: '#FF6347',      // Tomato Red
  };
  
  return colors[type] || '#FFFFFF';
}
