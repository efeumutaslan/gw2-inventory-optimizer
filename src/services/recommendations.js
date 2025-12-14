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

// Recommendation types - matches gw2stacks categories
export const RECOMMENDATION_TYPES = {
  // === gw2stacks: Restack ===
  STACK: 'stack',               // Merge incomplete stacks
  
  // === gw2stacks: Gobble ===
  GOBBLE: 'gobble',             // Use with converter/gobbler
  
  // === gw2stacks: Sell to vendor ===
  SELL_VENDOR: 'sell_vendor',   // Sell to NPC vendor
  SELL_TP: 'sell_tp',           // Sell on Trading Post
  
  // === gw2stacks: Rare salvage ===
  SALVAGE: 'salvage',           // Salvage for materials
  SALVAGE_RARE: 'salvage_rare', // Salvage rare for ecto
  EXTRACT_UPGRADE: 'extract',   // Extract rune/sigil
  
  // === gw2stacks: Craft luck ===
  CRAFT_LUCK: 'craft_luck',     // Craft into luck
  
  // === gw2stacks: Play (consume) ===
  CONSUME: 'consume',           // Use consumable
  USE_BOOSTER: 'use_booster',   // Use booster
  USE_FOOD: 'use_food',         // Use food/utility
  
  // === gw2stacks: Delete ===
  DESTROY: 'destroy',           // Safe to destroy
  DELETE_JUNK: 'delete_junk',   // Delete junk/worthless items
  
  // === gw2stacks: Misc ===
  WARNING: 'warning',           // Warning about item
  MISC_TIP: 'misc_tip',         // Miscellaneous tip
  
  // === gw2stacks: Craft away ===
  CRAFT_AWAY: 'craft_away',     // Craft to reduce stacks
  
  // === Keep categories ===
  USE_UNLOCK: 'use_unlock',     // Use to unlock skin/dye/mini
  KEEP_KILLPROOF: 'keep_kp',    // Keep for killproof
  KEEP_LEGENDARY: 'keep_leg',   // Keep for legendary crafting
  KEEP: 'keep',                 // No action needed
  DEPOSIT: 'deposit',           // Deposit to Material Storage
  OPEN_CONTAINER: 'open',       // Open container/bag
};

// Known valuable salvage items - prioritize these for good salvage kits
const VALUABLE_SALVAGE_ITEMS = {
  // Exotic gear often has valuable inscriptions/insignia
  // Ascended gear gives stabilizing matrices
};

// ============================================================
// GW2STACKS ITEM LISTS - Comprehensive cleanup recommendations
// ============================================================

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
  78122, // Bag of Gear
]);

// ============================================================
// gw2stacks: GOBBLER MATERIALS
// Items that can be consumed by converters/gobblers
// ============================================================
const GOBBLER_MATERIALS = {
  // Bloodstone Dust consumers
  68642: { 
    name: 'Pile of Bloodstone Dust', 
    gobblers: ['Mawdrey II (250/day)', 'Herta (250/day)', 'Sentient Aberration (25+25 Dragonite)'],
    minKeep: 250,
    advice: 'Use with Mawdrey II or Herta daily'
  },
  // Dragonite Ore consumers  
  68646: { 
    name: 'Dragonite Ore', 
    gobblers: ['Princess (50/day)', 'Sentient Aberration (25+25 Bloodstone)'],
    minKeep: 250,
    advice: 'Use with Princess daily'
  },
  // Empyreal Fragment consumers
  68645: { 
    name: 'Empyreal Fragment', 
    gobblers: ['Star of Gratitude (50/day)', 'Sentient Anomaly (25+25 Dragonite)'],
    minKeep: 250,
    advice: 'Use with Star of Gratitude daily'
  },
  // Candy Corn (festival gobbler)
  36041: {
    name: 'Candy Corn',
    gobblers: ['Candy Corn Gobbler (boosters)'],
    minKeep: 100,
    advice: 'Use Candy Corn Gobbler for boosters'
  },
  // Zhaitaffy (festival gobbler)
  43319: {
    name: 'Zhaitaffy',
    gobblers: ['Zhaitaffy Gobbler (boosters)'],
    minKeep: 100,
    advice: 'Use Zhaitaffy Gobbler for boosters'
  },
  // Snowflake (festival gobbler)
  38131: {
    name: 'Snowflake',
    gobblers: ['Snowflake Gobbler (boosters)'],
    minKeep: 100,
    advice: 'Use Snowflake Gobbler for boosters'
  },
};

// ============================================================
// gw2stacks: VENDOR SELL ITEMS
// Items that should be sold to vendor (not TP)
// ============================================================
const VENDOR_SELL_ITEMS = new Set([
  // Trophy items (grey junk)
  // These are identified by rarity='Junk' in API
  
  // Sigils worth less than salvage value
  24545, // Minor Sigil of Bloodlust (vendor)
  24546, // Minor Sigil of Perception
  24547, // Minor Sigil of Life
  
  // Low-value runes
  24687, // Minor Rune of the Adventurer
  24688, // Minor Rune of the Air
  
  // Fractal junk
  75241, // Fractal Research Page (excess)
]);

// ============================================================
// gw2stacks: SAFE TO DELETE ITEMS
// Items that can be safely deleted
// ============================================================
const SAFE_TO_DELETE = new Set([
  // Soulbound items with no value
  // Level-up rewards already used
  // Karma items (no sell value)
  
  // Birthday items (soulbound, can't do anything)
  36059, // Birthday Blaster (if duplicates)
  
  // Promotional items
  67375, // Mini Llama (soulbound duplicate)
  
  // Tonics (excessive)
  // Note: Only suggest delete if count > 1
]);

// ============================================================
// gw2stacks: LUCK CRAFTABLE ITEMS
// Items that can be crafted into Essence of Luck
// ============================================================
const LUCK_CRAFTABLE = {
  // Essence of Luck tiers (combine up)
  45175: { name: 'Essence of Luck (fine)', combineInto: 45176, count: 5, result: 'Essence of Luck (masterwork)' },
  45176: { name: 'Essence of Luck (masterwork)', combineInto: 45177, count: 5, result: 'Essence of Luck (rare)' },
  45177: { name: 'Essence of Luck (rare)', combineInto: 45178, count: 5, result: 'Essence of Luck (exotic)' },
  45178: { name: 'Essence of Luck (exotic)', combineInto: 45179, count: 5, result: 'Essence of Luck (legendary)' },
};

// ============================================================
// gw2stacks: CONSUMABLES TO USE
// Items that should be consumed/used while playing
// ============================================================
const CONSUMABLES_TO_USE = {
  // Boosters
  50016: { name: 'Experience Booster', advice: 'Use while doing events/story', category: 'booster' },
  50018: { name: 'Item Booster', advice: 'Use while farming/opening bags', category: 'booster' },
  44177: { name: 'Heroic Booster', advice: 'Use while leveling', category: 'booster' },
  50007: { name: 'Celebration Booster', advice: 'Great all-around booster', category: 'booster' },
  50010: { name: 'Birthday Booster', advice: 'Use while playing - 24h duration', category: 'booster' },
  68440: { name: 'Magic Find Booster', advice: 'Use while farming', category: 'booster' },
  68441: { name: 'Gold Find Booster', advice: 'Use while farming', category: 'booster' },
  68442: { name: 'WXP Booster', advice: 'Use in WvW', category: 'booster' },
  68443: { name: 'Reward Track Booster', advice: 'Use in PvP/WvW', category: 'booster' },
  
  // Tomes
  43766: { name: 'Tome of Knowledge', advice: 'Use on alt character to level', category: 'tome' },
  44609: { name: 'Tome of Mentorship', advice: 'Use while in party with lower level', category: 'tome' },
  
  // Writs of Experience
  44622: { name: 'Writ of Experience', advice: 'Use on character below 80', category: 'tome' },
  
  // Spirit Shards (from excess Tomes at 80)
  20820: { name: 'Spirit Shard', advice: 'Keep for legendary crafting or Mystic Forge', category: 'currency' },
  
  // Transmutation Charges (can accumulate)
  // Handled separately as currency
  
  // Revive Orbs (use in Fractals/Raids)
  23000: { name: 'Revive Orb', advice: 'Use in difficult content', category: 'utility' },
};

// ============================================================
// gw2stacks: FOOD & UTILITY ITEMS
// Food and utility consumables taking inventory space
// ============================================================
const FOOD_UTILITIES = {
  // Common food that clutters inventory
  // Low-level food should be consumed or sold
  // High-level food should be used while playing
  
  // Level 80 Food (keep and use)
  91805: { name: 'Bowl of Curry Butternut Squash Soup', tier: 'meta', advice: 'Meta food - use in endgame' },
  91878: { name: 'Cilantro Lime Sous-Vide Steak', tier: 'meta', advice: 'Meta food - use in endgame' },
  
  // Lower level food (consume or sell)
  // Suggested if player has level 80 character
};

// ============================================================
// gw2stacks: CRAFT AWAY ITEMS
// Items where crafting reduces stack count
// ============================================================
const CRAFT_AWAY_RECIPES = {
  // Mithril Ore -> Ingot (2 ore = 1 ingot, saves 1 slot per 500)
  19700: { 
    name: 'Mithril Ore', 
    craftInto: 'Mithril Ingot',
    recipe: '2 Ore = 1 Ingot',
    saves: 'Reduces 2 stacks to 1',
    threshold: 500 // Only suggest if over 500
  },
  // Elder Wood -> Plank
  19722: {
    name: 'Elder Wood Log',
    craftInto: 'Elder Wood Plank', 
    recipe: '3 Logs = 1 Plank',
    saves: 'Reduces 3 stacks to 1',
    threshold: 750
  },
  // Thick Leather -> Cured
  19732: {
    name: 'Thick Leather Section',
    craftInto: 'Cured Thick Leather Square',
    recipe: '2 Sections = 1 Square',
    saves: 'Reduces 2 stacks to 1',
    threshold: 500
  },
  // Gossamer -> Bolt
  19746: {
    name: 'Gossamer Scrap',
    craftInto: 'Bolt of Gossamer',
    recipe: '2 Scraps = 1 Bolt',
    saves: 'Reduces 2 stacks to 1', 
    threshold: 500
  },
  // T5 to T6 promotion (Mystic Forge)
  24294: {
    name: 'Vial of Potent Blood',
    craftInto: 'Vial of Powerful Blood (T6)',
    recipe: 'Mystic Forge promotion',
    saves: 'Convert excess T5 to T6',
    threshold: 500
  },
};

// ============================================================
// gw2stacks: MISC ADVICE ITEMS
// Various tips for specific items
// ============================================================
const MISC_ADVICE_ITEMS = {
  // Ectoplasm - check salvage vs sell
  19721: {
    name: 'Glob of Ectoplasm',
    advice: 'Check gw2efficiency for salvage vs sell profit',
    tip: 'Salvaging gives Dust + Luck, selling is stable income'
  },
  // Black Lion Claim Tickets
  43992: {
    name: 'Black Lion Claim Ticket',
    advice: 'Save for weapon skins you want',
    tip: 'Can get exclusive skins from BL vendor'
  },
  // Stabilizing Matrix
  73248: {
    name: 'Stabilizing Matrix',
    advice: 'Needed for Fractal infusions',
    tip: 'From salvaging ascended gear'
  },
  // Keys
  36719: {
    name: 'Zephyrite Lockpick',
    advice: 'Use in Dry Top for buried chests',
    tip: 'Map specific, use or sell'
  },
  78455: {
    name: 'Machete',
    advice: 'Use in Tangled Depths/AB',
    tip: 'Heart of Thorns maps'
  },
  // Provisioner Tokens
  79899: {
    name: 'Provisioner Token',
    advice: 'Use for legendary armor',
    tip: 'Needed for Envoy/Perfected armor'
  },
};

// ============================================================
// gw2stacks: CONTAINER ITEMS TO OPEN
// Bags and containers that should be opened
// ============================================================
const CONTAINERS_TO_OPEN = new Set([
  // Champion bags
  44215, // Heavy Moldy Bag
  44218, // Large Moldy Bag
  44221, // Moldy Bag
  44201, // Embroidered Coin Purse
  44204, // Fallen Adventurer's Backpack
  
  // WvW bags
  68316, // WvW Reward Track bags
  70047, // Bag of Loot (WvW)
  
  // Map reward containers
  67996, // Bag of Gear (HoT)
  78122, // Bag of Gear
  87557, // Bag of Gear (PoF)
  
  // PvP/WvW reward track final chests
  68314, // Various track rewards
  
  // Trick-or-Treat Bags
  36038, // Trick-or-Treat Bag
  
  // Festival bags
  66603, // Lucky Envelope
  47909, // Giant Wintersday Gift
  78474, // Dragon Coffer
  
  // Living World bags
  79186, // Bag of Provisioner Goods (LS3)
  87269, // Bag of Desert Goods (LS4)
  
  // Fractal containers
  75919, // Cracked Fractal Encryption
  
  // Meta event chests
  79264, // Ley-Infused Sand
  87645, // Piece of Volatile Magic
]);

// ============================================================
// VALUABLE SUPERIOR SIGILS (Don't vendor!)
// Sigils worth keeping or selling on TP
// ============================================================
const VALUABLE_SIGILS = new Set([
  24615, // Superior Sigil of Force
  24618, // Superior Sigil of Accuracy
  24560, // Superior Sigil of Impact
  24868, // Superior Sigil of the Night
  24575, // Superior Sigil of Bloodlust
  24609, // Superior Sigil of Strength
  24612, // Superior Sigil of Fire
  48911, // Superior Sigil of Bursting
  44944, // Superior Sigil of Malice
  24639, // Superior Sigil of Air
  24624, // Superior Sigil of Energy
  44950, // Superior Sigil of Concentration
  72339, // Superior Sigil of Paralyzation
]);

// ============================================================
// VALUABLE SUPERIOR RUNES (Don't vendor!)
// ============================================================
const VALUABLE_RUNES = new Set([
  24836, // Superior Rune of the Scholar
  24762, // Superior Rune of Strength
  67339, // Superior Rune of the Firebrand
  83338, // Superior Rune of the Dragonhunter
  24765, // Superior Rune of the Eagle
  24800, // Superior Rune of Divinity
  71425, // Superior Rune of Surging
  24714, // Superior Rune of the Berserker
  83502, // Superior Rune of the Reaper
  68436, // Superior Rune of Leadership
  24732, // Superior Rune of the Traveler
  24842, // Superior Rune of the Pack
]);

// ============================================================
// FESTIVAL ITEMS - Seasonal value
// ============================================================
const FESTIVAL_ITEMS = {
  // Halloween
  36041: { name: 'Candy Corn', festival: 'Halloween', advice: 'Use gobbler or save for recipes' },
  36038: { name: 'Trick-or-Treat Bag', festival: 'Halloween', advice: 'Open for loot/sell on TP' },
  36059: { name: 'Nougat Center', festival: 'Halloween', advice: 'Craft recipes or sell' },
  36061: { name: 'Chattering Skull', festival: 'Halloween', advice: 'Craft recipes or sell' },
  
  // Wintersday
  38131: { name: 'Snowflake', festival: 'Wintersday', advice: 'Use gobbler or craft' },
  38130: { name: 'Piece of Candy Cane', festival: 'Wintersday', advice: 'Craft into tonics/gifts' },
  78016: { name: 'Wintersday Gift', festival: 'Wintersday', advice: 'Open for loot' },
  
  // Lunar New Year
  68646: { name: 'Lucky Envelope', festival: 'Lunar New Year', advice: 'Open for Divine Lucky Envelopes' },
  
  // Dragon Bash
  43319: { name: 'Zhaitaffy', festival: 'Dragon Bash', advice: 'Use gobbler or craft' },
  43320: { name: 'Jorbreaker', festival: 'Dragon Bash', advice: 'Craft holographic weapons' },
  
  // Super Adventure Box
  39752: { name: 'Bauble', festival: 'SAB', advice: 'Use in SAB for upgrades' },
  39753: { name: 'Bauble Bubble', festival: 'SAB', advice: 'Worth 250 baubles' },
};

// ============================================================
// MAP CURRENCIES - Don't delete!
// ============================================================
const MAP_CURRENCIES = {
  // Heart of Thorns
  79280: { name: 'Unbound Magic', maps: 'LS3', advice: 'Spend at LS3 vendors' },
  79469: { name: 'Difluorite Crystal', maps: 'Draconis Mons', advice: 'Buy unique items' },
  79899: { name: 'Fire Orchid Blossom', maps: 'Ember Bay', advice: 'Buy unique items' },
  80681: { name: 'Jade Shard', maps: 'Lake Doric', advice: 'White Mantle recipes' },
  
  // Path of Fire
  86069: { name: 'Volatile Magic', maps: 'LS4', advice: 'Spend at LS4 vendors or convert' },
  86977: { name: 'Kralkatite Ore', maps: 'Sandswept Isles', advice: 'Craft or sell' },
  87645: { name: 'Mistonium', maps: 'Jahai Bluffs', advice: 'Craft Mist Shard weapons' },
  
  // End of Dragons
  96978: { name: 'Imperial Favor', maps: 'Cantha', advice: 'Buy Jade Bot modules' },
  97901: { name: 'Writs of Seitung Province', maps: 'EoD', advice: 'Buy unique items' },
  
  // Secrets of the Obscure
  100485: { name: 'Rift Essence', maps: 'SotO', advice: 'Convert or craft' },
};

// ============================================================
// WVW SPECIFIC ITEMS
// ============================================================
const WVW_ITEMS = {
  71581: { name: 'Badge of Honor', advice: 'Buy siege/armor/legendary gifts' },
  93146: { name: 'Skirmish Claim Ticket', advice: 'Buy legendary armor components' },
  81296: { name: 'Testimony of Heroics', advice: 'Buy Hero Points or vendor items' },
  19678: { name: 'Gift of Battle', advice: 'Need for legendary weapons!' },
};

// ============================================================
// PVP SPECIFIC ITEMS
// ============================================================
const PVP_ITEMS = {
  68110: { name: 'Ascended Shard of Glory', advice: 'Buy legendary backpack components' },
  81807: { name: 'League Ticket', advice: 'Buy armor/weapon skins' },
};

// ============================================================
// FRACTAL SPECIFIC ITEMS
// ============================================================
const FRACTAL_ITEMS = {
  75919: { name: 'Cracked Fractal Encryption', advice: 'Open with Fractal Encryption Keys' },
  20796: { name: 'Fractal Relic', advice: 'Buy infusions/accessories' },
  81743: { name: 'Pristine Fractal Relic', advice: 'Buy ascended rings/infusions' },
  94020: { name: 'Unstable Fractal Essence', advice: 'Craft Mist Attunements' },
  73248: { name: 'Stabilizing Matrix', advice: 'Craft infusions or sell' },
  49424: { name: '+1 Agony Infusion', advice: 'Combine to higher tiers' },
};

// ============================================================
// RAID ITEMS - Legendary Insights/Divinations
// ============================================================
const RAID_ITEMS = {
  77302: { name: 'Legendary Insight', advice: 'Keep for legendary armor!' },
  91138: { name: 'Legendary Divination', advice: 'Keep for legendary armor!' },
  81743: { name: 'Magnetite Shard', advice: 'Buy ascended gear' },
  91203: { name: 'Gaeting Crystal', advice: 'Buy ascended/legendary items' },
};

// ============================================================
// VALUABLE INFUSIONS - Don't salvage!
// ============================================================
const VALUABLE_INFUSIONS = new Set([
  // Attribute infusions
  49424, // +1 Agony Infusion
  49425, // +2 Agony Infusion
  49426, // +3 Agony Infusion
  49427, // +4 Agony Infusion
  49428, // +5 Agony Infusion
  49429, // +6 Agony Infusion
  49430, // +7 Agony Infusion
  49431, // +8 Agony Infusion
  49432, // +9 Agony Infusion
  
  // Cosmetic infusions (VERY valuable)
  81811, // Chak Egg Sac
  67375, // Ghostly Infusion
  79639, // Phospholuminescent Infusion
  78090, // Winter's Heart Infusion
  91234, // Khan-Ur's Coat
]);

// ============================================================
// TONICS - Use or delete duplicates
// ============================================================
const TONICS = {
  // Endless Tonics (keep one, can delete extras)
  50017: { name: 'Endless Mystery Tonic', advice: 'Keep one, fun item' },
  36238: { name: 'Endless Quaggan Tonic', advice: 'Keep one for transformation fun' },
  36243: { name: 'Endless Skritt Tonic', advice: 'Keep one for transformation fun' },
  // Regular tonics - use or delete
  50013: { name: 'Mystery Tonic', advice: 'Use for random transformation' },
};

// ============================================================
// GATHERING TOOLS - Equipment check
// ============================================================
const GATHERING_TOOLS = {
  // Unlimited tools (valuable, don't destroy)
  44791: { name: 'Unbreakable Gathering Tools', advice: 'Premium tool - never destroy!' },
  // Basic tools - keep stocked
  23027: { name: 'Orichalcum Mining Pick', advice: 'Keep 3+ for gathering' },
  23030: { name: 'Orichalcum Logging Axe', advice: 'Keep 3+ for gathering' },
  23033: { name: 'Orichalcum Harvesting Sickle', advice: 'Keep 3+ for gathering' },
};

// ============================================================
// KEYS AND LOCKPICKS
// ============================================================
const KEYS_AND_LOCKPICKS = {
  36719: { name: 'Zephyrite Lockpick', map: 'Dry Top', advice: 'Use for buried sand treasures' },
  78455: { name: 'Machete', map: 'HoT', advice: 'Use for Tangled Depths/AB chests' },
  70093: { name: 'Exalted Key', map: 'Auric Basin', advice: 'Use for Exalted chests' },
  74356: { name: 'Vial of Chak Acid', map: 'Tangled Depths', advice: 'Use for Chak walls' },
  79186: { name: 'Trader\'s Key', map: 'LS3', advice: 'Use for LS3 map chests' },
  86057: { name: 'Mistborn Key', map: 'Jahai Bluffs', advice: 'Use for Mistborn chests' },
};

// ============================================================
// RECIPES - Check if learned
// ============================================================
const RECIPE_ITEMS = {
  advice: 'Right-click to learn recipe. Can delete after learning.',
  warning: 'Check if already learned before using!'
};

// ============================================================
// DYES - Check if unlocked
// ============================================================
const DYE_INFO = {
  advice: 'Use to unlock dye color. Can destroy/sell after unlocking.',
  checkUnlock: true
};

// ============================================================
// MINI PETS - Check if unlocked
// ============================================================
const MINI_INFO = {
  advice: 'Use to unlock mini pet. Can destroy/sell after unlocking.',
  checkUnlock: true
};

// ============================================================
// SKINS (Weapon/Armor) - Check wardrobe
// ============================================================
const SKIN_ITEMS = {
  advice: 'Check if skin is already in wardrobe. Unlock first, then sell/destroy.',
  checkUnlock: true
};

// ============================================================
// BLACK LION ITEMS
// ============================================================
const BLACK_LION_ITEMS = {
  43992: { name: 'Black Lion Claim Ticket', advice: 'Save for exclusive weapon skins' },
  43998: { name: 'Black Lion Claim Ticket Scrap', advice: 'Collect 10 to make full ticket' },
  67050: { name: 'Black Lion Chest Key', advice: 'Use on Black Lion Chests' },
  20329: { name: 'Black Lion Chest', advice: 'Open with Black Lion Key' },
  20331: { name: 'Black Lion Salvage Kit', advice: 'Use on exotics for 100% upgrade recovery' },
};

// ============================================================
// BANDIT CRESTS & GEODES
// ============================================================
const CORE_MAP_CURRENCIES = {
  // Dry Top
  19925: { name: 'Geode', map: 'Dry Top', advice: 'Buy recipes, ambrite weapons' },
  // Silverwastes  
  26997: { name: 'Bandit Crest', map: 'Silverwastes', advice: 'Buy recipes, carapace armor' },
};

// ============================================================
// KARMA ITEMS
// ============================================================
const KARMA_ITEMS = {
  advice: 'Purchased with Karma - cannot sell, salvage value only',
  note: 'Karma items are soulbound on acquire'
};

// ============================================================
// SPIRIT SHARD USES
// ============================================================
const SPIRIT_SHARD_INFO = {
  20820: { 
    name: 'Spirit Shard', 
    uses: [
      'Mystic Forge promotions (T5→T6)',
      'Legendary crafting',
      'Mystic Coins (Miyani)',
      'Obsidian Shards (Miyani)'
    ],
    advice: 'Very valuable currency - don\'t delete!'
  }
};

// ============================================================
// MYSTIC COIN USES
// ============================================================
const MYSTIC_COIN_INFO = {
  19976: {
    name: 'Mystic Coin',
    uses: [
      'Legendary weapons',
      'Mystic Forge recipes',
      'Envoy armor',
      'Sell on TP (high value)'
    ],
    advice: 'Extremely valuable - keep or sell on TP'
  }
};

// ============================================================
// ASCENDED MATERIAL INFO
// ============================================================
const ASCENDED_MATERIALS = {
  46742: { name: 'Glob of Elder Spirit Residue', timegated: true, advice: 'Time-gated, keep for ascended crafting' },
  46744: { name: 'Lump of Mithrillium', timegated: true, advice: 'Time-gated, keep for ascended crafting' },
  46745: { name: 'Spool of Silk Weaving Thread', timegated: true, advice: 'Time-gated, keep for ascended crafting' },
  46740: { name: 'Spool of Thick Elonian Cord', timegated: true, advice: 'Time-gated, keep for ascended crafting' },
};

// ============================================================
// CHAMPION BAGS BY TYPE
// ============================================================
const CHAMPION_BAGS = {
  44215: { name: 'Heavy Moldy Bag', level: 80, advice: 'Open on level 53 for Linen' },
  44218: { name: 'Large Moldy Bag', level: 80, advice: 'Open on level 53 for Linen' },
  44221: { name: 'Moldy Bag', level: 80, advice: 'Open on level 53 for Linen' },
  44204: { name: 'Fallen Adventurer\'s Backpack', level: 80, advice: 'Open on level 53 for Linen' },
  // World boss bags
  20808: { name: 'Elaborate Ritualist Bag', level: 80, advice: 'Can open on lower level for mats' },
  // Meta bags
  78457: { name: 'Grand Chest of Resilience', level: 80, advice: 'Open for gear/mats' },
};

// ============================================================
// EXOTIC GEAR HANDLING
// ============================================================
const EXOTIC_GEAR_INFO = {
  rarity: 'Exotic',
  salvageAdvice: 'Use Mystic/Black Lion kit for inscriptions',
  sellAdvice: 'Check TP price vs salvage value',
  upgradeCheck: 'Check for valuable runes/sigils first'
};

// ============================================================
// MYSTIC FORGE FODDER
// Items to throw into Mystic Forge
// ============================================================
const MYSTIC_FORGE_FODDER = {
  // Green gear at level 80 - forge for rare chance
  rarity: 'Masterwork',
  minLevel: 68,
  advice: '4 greens in Mystic Forge = chance for Rare (Ecto source)'
};

// ============================================================
// REFINEMENT RECIPES - Reduce stack count
// ============================================================
const REFINEMENT_RECIPES = {
  // Ores to Ingots
  19697: { name: 'Iron Ore', into: 'Iron Ingot', ratio: '3:1', craft: 'Weaponsmith/Armorsmith' },
  19699: { name: 'Gold Ore', into: 'Gold Ingot', ratio: '2:1', craft: 'Jeweler' },
  19700: { name: 'Mithril Ore', into: 'Mithril Ingot', ratio: '2:1', craft: 'Any metal' },
  19701: { name: 'Orichalcum Ore', into: 'Orichalcum Ingot', ratio: '2:1', craft: 'Any metal' },
  
  // Logs to Planks
  19723: { name: 'Soft Wood Log', into: 'Soft Wood Plank', ratio: '3:1', craft: 'Any wood' },
  19726: { name: 'Seasoned Wood Log', into: 'Seasoned Wood Plank', ratio: '3:1', craft: 'Any wood' },
  19727: { name: 'Hard Wood Log', into: 'Hard Wood Plank', ratio: '3:1', craft: 'Any wood' },
  19722: { name: 'Elder Wood Log', into: 'Elder Wood Plank', ratio: '3:1', craft: 'Any wood' },
  19725: { name: 'Ancient Wood Log', into: 'Ancient Wood Plank', ratio: '3:1', craft: 'Any wood' },
  
  // Cloth
  19718: { name: 'Jute Scrap', into: 'Bolt of Jute', ratio: '2:1', craft: 'Tailor' },
  19739: { name: 'Wool Scrap', into: 'Bolt of Wool', ratio: '2:1', craft: 'Tailor' },
  19741: { name: 'Cotton Scrap', into: 'Bolt of Cotton', ratio: '2:1', craft: 'Tailor' },
  19743: { name: 'Linen Scrap', into: 'Bolt of Linen', ratio: '2:1', craft: 'Tailor' },
  19748: { name: 'Silk Scrap', into: 'Bolt of Silk', ratio: '3:1', craft: 'Tailor' },
  19746: { name: 'Gossamer Scrap', into: 'Bolt of Gossamer', ratio: '2:1', craft: 'Tailor' },
  
  // Leather
  19719: { name: 'Rawhide Leather Section', into: 'Cured Rawhide Square', ratio: '2:1', craft: 'Leatherworker' },
  19728: { name: 'Thin Leather Section', into: 'Cured Thin Leather Square', ratio: '2:1', craft: 'Leatherworker' },
  19730: { name: 'Coarse Leather Section', into: 'Cured Coarse Leather Square', ratio: '2:1', craft: 'Leatherworker' },
  19731: { name: 'Rugged Leather Section', into: 'Cured Rugged Leather Square', ratio: '2:1', craft: 'Leatherworker' },
  19729: { name: 'Thick Leather Section', into: 'Cured Thick Leather Square', ratio: '2:1', craft: 'Leatherworker' },
  19735: { name: 'Hardened Leather Section', into: 'Cured Hardened Leather Square', ratio: '2:1', craft: 'Leatherworker' },
};

// ============================================================
// ASCENDED SALVAGE ITEMS
// Ascended gear gives special materials
// ============================================================
const ASCENDED_SALVAGE_INFO = {
  advice: 'Salvage with Ascended Salvage Kit',
  yields: ['Stabilizing Matrix', 'Dark Matter', 'Inscriptions/Insignias'],
  note: 'Salvaging also extracts infusions!'
};

// ============================================================
// ADDITIONAL BOOSTERS
// ============================================================
const ADDITIONAL_BOOSTERS = {
  50016: { name: 'Experience Booster', duration: '1h', advice: 'Use while leveling or doing events' },
  50018: { name: 'Item Booster', duration: '1h', advice: 'Use while farming/opening bags' },
  50007: { name: 'Celebration Booster', duration: '2h', advice: 'All-in-one booster, use anytime' },
  50010: { name: 'Birthday Booster', duration: '24h', advice: 'Long duration, use while playing actively' },
  68440: { name: 'Magic Find Booster', duration: '1h', advice: 'Use before opening bags' },
  68441: { name: 'Gold Find Booster', duration: '1h', advice: 'Use while doing events' },
  68442: { name: 'WXP Booster', duration: '1h', advice: 'Use exclusively in WvW' },
  68443: { name: 'Reward Track Booster', duration: '1h', advice: 'Use in PvP/WvW' },
  68444: { name: 'Karma Booster', duration: '1h', advice: 'Use during events/hearts' },
  78806: { name: 'Black Lion Booster', duration: '2h', advice: 'Best booster, save for intensive play' },
};

// ============================================================
// RESEARCH NOTES CRAFTING
// Items that can be salvaged for Research Notes
// ============================================================
const RESEARCH_NOTES_INFO = {
  advice: 'Salvage with Research Kit for Research Notes',
  note: 'Research Notes needed for Jade Bot upgrades and other EoD recipes',
  minRarity: 'Masterwork'
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
  ASCENDED: 68434,
  RESEARCH: 99959,
};

// Priority for sorting recommendations
// Priority for sorting recommendations (lower = higher priority)
const PRIORITY = {
  // Critical warnings first
  [RECOMMENDATION_TYPES.WARNING]: 0,
  
  // gw2stacks: Use/Unlock (valuable)
  [RECOMMENDATION_TYPES.USE_UNLOCK]: 1,
  [RECOMMENDATION_TYPES.OPEN_CONTAINER]: 2,
  
  // gw2stacks: Sell (make gold)
  [RECOMMENDATION_TYPES.SELL_TP]: 3,
  [RECOMMENDATION_TYPES.EXTRACT_UPGRADE]: 4,
  
  // gw2stacks: Salvage
  [RECOMMENDATION_TYPES.SALVAGE_RARE]: 5,
  [RECOMMENDATION_TYPES.SALVAGE]: 6,
  
  // gw2stacks: Vendor sell
  [RECOMMENDATION_TYPES.SELL_VENDOR]: 7,
  
  // gw2stacks: Gobble (converters)
  [RECOMMENDATION_TYPES.GOBBLE]: 8,
  
  // gw2stacks: Craft away / Craft luck
  [RECOMMENDATION_TYPES.CRAFT_AWAY]: 9,
  [RECOMMENDATION_TYPES.CRAFT_LUCK]: 10,
  
  // gw2stacks: Stack
  [RECOMMENDATION_TYPES.STACK]: 11,
  [RECOMMENDATION_TYPES.DEPOSIT]: 12,
  
  // gw2stacks: Play (consume)
  [RECOMMENDATION_TYPES.USE_BOOSTER]: 13,
  [RECOMMENDATION_TYPES.USE_FOOD]: 14,
  [RECOMMENDATION_TYPES.CONSUME]: 15,
  
  // gw2stacks: Delete
  [RECOMMENDATION_TYPES.DESTROY]: 16,
  [RECOMMENDATION_TYPES.DELETE_JUNK]: 17,
  
  // gw2stacks: Misc
  [RECOMMENDATION_TYPES.MISC_TIP]: 18,
  
  // Keep categories (lowest priority - no action needed)
  [RECOMMENDATION_TYPES.KEEP_KILLPROOF]: 20,
  [RECOMMENDATION_TYPES.KEEP_LEGENDARY]: 20,
  [RECOMMENDATION_TYPES.KEEP]: 21,
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
  
  // 11. Converter/Gobbler input materials - gw2stacks: Gobble
  const gobblerMat = GOBBLER_MATERIALS[item.id];
  if (gobblerMat && item.count >= gobblerMat.minKeep) {
    return {
      type: RECOMMENDATION_TYPES.GOBBLE,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.GOBBLE],
      message: `${gobblerMat.name}: ${gobblerMat.advice}`,
      gobblers: gobblerMat.gobblers,
      important: item.count >= gobblerMat.minKeep * 2 // Very important if 2+ stacks
    };
  }
  
  // 12. Craft Luck items - gw2stacks: Craft Luck
  const luckItem = LUCK_CRAFTABLE[item.id];
  if (luckItem && item.count >= 5) {
    return {
      type: RECOMMENDATION_TYPES.CRAFT_LUCK,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.CRAFT_LUCK],
      message: `${luckItem.name}: Combine 5 into ${luckItem.result}`,
      craftInfo: luckItem
    };
  }
  
  // 13. Consumables to use while playing - gw2stacks: Play
  const consumableInfo = CONSUMABLES_TO_USE[item.id];
  if (consumableInfo) {
    const typeMap = {
      'booster': RECOMMENDATION_TYPES.USE_BOOSTER,
      'tome': RECOMMENDATION_TYPES.CONSUME,
      'utility': RECOMMENDATION_TYPES.CONSUME,
      'currency': RECOMMENDATION_TYPES.KEEP
    };
    
    const recType = typeMap[consumableInfo.category] || RECOMMENDATION_TYPES.CONSUME;
    
    if (recType !== RECOMMENDATION_TYPES.KEEP) {
      return {
        type: recType,
        item,
        priority: PRIORITY[recType],
        message: `${consumableInfo.name}: ${consumableInfo.advice}`,
        category: consumableInfo.category
      };
    }
  }
  
  // 14. Containers to open - gw2stacks: Consume
  if (CONTAINERS_TO_OPEN.has(item.id)) {
    return {
      type: RECOMMENDATION_TYPES.OPEN_CONTAINER,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.OPEN_CONTAINER],
      message: 'Open this container for rewards'
    };
  }
  
  // 15. Craft Away items - gw2stacks: Craft Away
  const craftAwayInfo = CRAFT_AWAY_RECIPES[item.id];
  if (craftAwayInfo && item.count >= craftAwayInfo.threshold) {
    return {
      type: RECOMMENDATION_TYPES.CRAFT_AWAY,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.CRAFT_AWAY],
      message: `${craftAwayInfo.name}: ${craftAwayInfo.recipe} - ${craftAwayInfo.saves}`,
      craftInfo: craftAwayInfo
    };
  }
  
  // 16. Misc advice items - gw2stacks: Misc
  const miscInfo = MISC_ADVICE_ITEMS[item.id];
  if (miscInfo) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP],
      message: `${miscInfo.name}: ${miscInfo.advice}`,
      tip: miscInfo.tip
    };
  }
  
  // 17. Deceptive items that look like junk but aren't
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
  
  // 18. Rare salvage check - gw2stacks: Rare Salvage
  if (item.rarity === 'Rare' && ['Weapon', 'Armor'].includes(item.type)) {
    const price = prices[item.id];
    const ectoPrice = prices[19721]?.sells || 1500; // Ecto ID, default ~15s
    const avgEcto = 0.9; // Average ecto per salvage
    const salvageValue = avgEcto * ectoPrice;
    
    if (!price || price.sells < salvageValue) {
      return {
        type: RECOMMENDATION_TYPES.SALVAGE_RARE,
        item,
        priority: PRIORITY[RECOMMENDATION_TYPES.SALVAGE_RARE],
        message: `Salvage for Ecto (~${formatGold(salvageValue)}) - use Master/Mystic kit`,
        salvageValue
      };
    }
  }
  
  // 19. Valuable Sigils - Don't vendor!
  if (VALUABLE_SIGILS.has(item.id)) {
    const price = prices[item.id];
    if (price && price.sells > 500) { // Worth more than 5 silver
      return {
        type: RECOMMENDATION_TYPES.SELL_TP,
        item,
        priority: PRIORITY[RECOMMENDATION_TYPES.SELL_TP],
        tpPrice: price.sells * (item.count || 1),
        message: `Valuable Sigil - sell on TP for ${formatGold(price.sells * (item.count || 1))}`,
        important: price.sells > 5000 // Very valuable if over 50s
      };
    }
  }
  
  // 20. Valuable Runes - Don't vendor!
  if (VALUABLE_RUNES.has(item.id)) {
    const price = prices[item.id];
    if (price && price.sells > 500) {
      return {
        type: RECOMMENDATION_TYPES.SELL_TP,
        item,
        priority: PRIORITY[RECOMMENDATION_TYPES.SELL_TP],
        tpPrice: price.sells * (item.count || 1),
        message: `Valuable Rune - sell on TP for ${formatGold(price.sells * (item.count || 1))}`,
        important: price.sells > 5000
      };
    }
  }
  
  // 21. Festival Items - special handling
  const festivalInfo = FESTIVAL_ITEMS[item.id];
  if (festivalInfo) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP],
      message: `${festivalInfo.festival}: ${festivalInfo.name} - ${festivalInfo.advice}`,
      festival: festivalInfo.festival
    };
  }
  
  // 22. Map Currencies - Don't delete!
  const mapCurrencyInfo = MAP_CURRENCIES[item.id];
  if (mapCurrencyInfo) {
    return {
      type: RECOMMENDATION_TYPES.WARNING,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.WARNING] + 2,
      message: `${mapCurrencyInfo.name} (${mapCurrencyInfo.maps}): ${mapCurrencyInfo.advice}`,
      warning: true
    };
  }
  
  // 23. WvW Items - Special advice
  const wvwInfo = WVW_ITEMS[item.id];
  if (wvwInfo) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP],
      message: `WvW: ${wvwInfo.name} - ${wvwInfo.advice}`,
      gameMode: 'WvW'
    };
  }
  
  // 24. PvP Items - Special advice
  const pvpInfo = PVP_ITEMS[item.id];
  if (pvpInfo) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP],
      message: `PvP: ${pvpInfo.name} - ${pvpInfo.advice}`,
      gameMode: 'PvP'
    };
  }
  
  // 25. Fractal Items - Special advice
  const fractalInfo = FRACTAL_ITEMS[item.id];
  if (fractalInfo) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP],
      message: `Fractal: ${fractalInfo.name} - ${fractalInfo.advice}`,
      gameMode: 'Fractal'
    };
  }
  
  // 26. Raid Items - Keep for legendary!
  const raidInfo = RAID_ITEMS[item.id];
  if (raidInfo) {
    return {
      type: RECOMMENDATION_TYPES.WARNING,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.WARNING],
      message: `Raid: ${raidInfo.name} - ${raidInfo.advice}`,
      warning: true,
      important: item.id === 77302 || item.id === 91138 // LI/LD
    };
  }
  
  // 27. Valuable Infusions - Don't salvage!
  if (VALUABLE_INFUSIONS.has(item.id)) {
    return {
      type: RECOMMENDATION_TYPES.WARNING,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.WARNING],
      message: 'Valuable Infusion - don\'t salvage or destroy!',
      warning: true,
      important: true
    };
  }
  
  // 28. Refinement recipes - reduce stacks
  const refinementInfo = REFINEMENT_RECIPES[item.id];
  if (refinementInfo && item.count >= 250) {
    return {
      type: RECOMMENDATION_TYPES.CRAFT_AWAY,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.CRAFT_AWAY],
      message: `${refinementInfo.name}: Refine ${refinementInfo.ratio} into ${refinementInfo.into}`,
      craftInfo: refinementInfo
    };
  }
  
  // 29. Ascended gear - special salvage advice
  if (item.rarity === 'Ascended' && ['Weapon', 'Armor', 'Trinket', 'Back'].includes(item.type)) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP],
      message: `Ascended ${item.type}: Salvage for Stabilizing Matrix & Dark Matter (Ascended Salvage Kit)`,
      tip: ASCENDED_SALVAGE_INFO.note
    };
  }
  
  // 30. Additional Boosters
  const boosterInfo = ADDITIONAL_BOOSTERS[item.id];
  if (boosterInfo) {
    return {
      type: RECOMMENDATION_TYPES.USE_BOOSTER,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.USE_BOOSTER],
      message: `${boosterInfo.name} (${boosterInfo.duration}): ${boosterInfo.advice}`,
      duration: boosterInfo.duration
    };
  }
  
  // 31. Green gear at level 80 - Mystic Forge fodder
  if (item.rarity === 'Masterwork' && 
      ['Weapon', 'Armor'].includes(item.type) && 
      item.level >= 68 &&
      item.count >= 4) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP] + 1,
      message: 'Level 68+ Green gear: Throw 4 into Mystic Forge for chance at Rare (Ecto source)',
      tip: MYSTIC_FORGE_FODDER.advice
    };
  }
  
  // 32. Collection trophy check - safe to delete after unlocking
  if (item.type === 'Trophy' && item.description?.includes('collection')) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP],
      message: 'Collection Trophy: Safe to delete after it shows unlocked in collection',
      tip: 'Check right-click menu to verify collection credit'
    };
  }
  
  // 33. Agony Infusions - combine advice
  if (item.id >= 49424 && item.id <= 49432 && item.count >= 2) {
    const tier = item.id - 49423; // +1 = 49424, so tier = 1
    return {
      type: RECOMMENDATION_TYPES.CRAFT_AWAY,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.CRAFT_AWAY],
      message: `+${tier} Agony Infusion: Combine 2 at Artificer for +${tier + 1}`,
      tip: 'Combining saves inventory space'
    };
  }
  
  // 34. Keys and Lockpicks - use advice
  const keyInfo = KEYS_AND_LOCKPICKS[item.id];
  if (keyInfo) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP],
      message: `${keyInfo.name} (${keyInfo.map}): ${keyInfo.advice}`,
      mapSpecific: true
    };
  }
  
  // 35. Black Lion Items
  const blInfo = BLACK_LION_ITEMS[item.id];
  if (blInfo) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP],
      message: `Black Lion: ${blInfo.name} - ${blInfo.advice}`,
      important: item.id === 43992 // Claim tickets are valuable
    };
  }
  
  // 36. Ascended Time-gated Materials
  const ascMatInfo = ASCENDED_MATERIALS[item.id];
  if (ascMatInfo) {
    return {
      type: RECOMMENDATION_TYPES.WARNING,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.WARNING] + 1,
      message: `${ascMatInfo.name}: ${ascMatInfo.advice} (Time-gated!)`,
      warning: true,
      timegated: true
    };
  }
  
  // 37. Champion Bags - open advice
  const champBagInfo = CHAMPION_BAGS[item.id];
  if (champBagInfo) {
    return {
      type: RECOMMENDATION_TYPES.OPEN_CONTAINER,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.OPEN_CONTAINER],
      message: `${champBagInfo.name}: ${champBagInfo.advice}`,
      tip: 'Bag opener on lower level character gets different mats'
    };
  }
  
  // 38. Mystic Coin - valuable currency
  if (item.id === 19976) {
    const price = prices[item.id];
    return {
      type: RECOMMENDATION_TYPES.WARNING,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.WARNING],
      message: `Mystic Coin: Extremely valuable! ${price ? `TP: ${formatGold(price.sells * (item.count || 1))}` : 'Keep for legendary/Mystic Forge'}`,
      warning: true,
      important: true
    };
  }
  
  // 39. Spirit Shard - legendary currency
  if (item.id === 20820) {
    return {
      type: RECOMMENDATION_TYPES.WARNING,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.WARNING],
      message: 'Spirit Shard: Valuable for T5→T6 promotion, legendary crafting, Mystic Coins',
      warning: true
    };
  }
  
  // 40. Tonics - fun items
  const tonicInfo = TONICS[item.id];
  if (tonicInfo) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP] + 2,
      message: `${tonicInfo.name}: ${tonicInfo.advice}`,
      funItem: true
    };
  }
  
  // 41. Exotic gear - check salvage vs sell
  if (item.rarity === 'Exotic' && ['Weapon', 'Armor'].includes(item.type)) {
    const price = prices[item.id];
    if (price) {
      const salvageValue = 1500; // Approximate value from salvaging
      if (price.sells > salvageValue * 1.5) {
        return {
          type: RECOMMENDATION_TYPES.SELL_TP,
          item,
          priority: PRIORITY[RECOMMENDATION_TYPES.SELL_TP] + 1,
          tpPrice: price.sells,
          message: `Exotic ${item.type}: Sell on TP for ${formatGold(price.sells)} (better than salvage)`
        };
      } else {
        return {
          type: RECOMMENDATION_TYPES.SALVAGE,
          item,
          priority: PRIORITY[RECOMMENDATION_TYPES.SALVAGE],
          message: `Exotic ${item.type}: Salvage with Mystic/BL kit for inscriptions/mats`
        };
      }
    }
  }
  
  // 42. Recipe sheets - learn check
  if (item.type === 'Consumable' && item.name?.includes('Recipe')) {
    return {
      type: RECOMMENDATION_TYPES.CONSUME,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.CONSUME],
      message: 'Recipe: Right-click to check if learned, then use or sell',
      tip: RECIPE_ITEMS.warning
    };
  }
  
  // 43. Dye items - unlock check
  if (item.type === 'Consumable' && item.details?.type === 'Unlock' && item.name?.includes('Dye')) {
    return {
      type: RECOMMENDATION_TYPES.USE_UNLOCK,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.USE_UNLOCK],
      message: 'Dye: Use to unlock color, then sell duplicates on TP',
      unlockType: 'dye'
    };
  }
  
  // 44. Mini pets - unlock check
  if (item.type === 'MiniPet') {
    return {
      type: RECOMMENDATION_TYPES.USE_UNLOCK,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.USE_UNLOCK],
      message: 'Mini Pet: Use to unlock, duplicates can be sold',
      unlockType: 'mini'
    };
  }
  
  // 45. Salvageable Trophies - salvage for mats
  if (item.type === 'Trophy' && (item.flags?.includes('Salvageable') || item.description?.toLowerCase().includes('salvage'))) {
    return {
      type: RECOMMENDATION_TYPES.SALVAGE,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.SALVAGE],
      message: 'Salvageable Trophy: Use basic kit for crafting materials'
    };
  }
  
  // 46. Core map currencies
  const coreMapInfo = CORE_MAP_CURRENCIES[item.id];
  if (coreMapInfo) {
    return {
      type: RECOMMENDATION_TYPES.MISC_TIP,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.MISC_TIP],
      message: `${coreMapInfo.name} (${coreMapInfo.map}): ${coreMapInfo.advice}`,
      mapSpecific: true
    };
  }
  
  // 47. Low-level gear on level 80 character - salvage/vendor
  if (['Weapon', 'Armor'].includes(item.type) && 
      item.level < 68 && 
      item.rarity !== 'Exotic' && 
      item.rarity !== 'Ascended' &&
      item.rarity !== 'Legendary') {
    return {
      type: RECOMMENDATION_TYPES.SALVAGE,
      item,
      priority: PRIORITY[RECOMMENDATION_TYPES.SALVAGE] + 1,
      message: `Low-level ${item.rarity} ${item.type}: Salvage with basic kit for mats`
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
      // gw2stacks: Restack
      [RECOMMENDATION_TYPES.STACK]: 'Stack',
      
      // gw2stacks: Gobble
      [RECOMMENDATION_TYPES.GOBBLE]: 'Use Gobbler',
      
      // gw2stacks: Sell
      [RECOMMENDATION_TYPES.SELL_TP]: 'Sell on TP',
      [RECOMMENDATION_TYPES.SELL_VENDOR]: 'Sell to NPC',
      
      // gw2stacks: Salvage
      [RECOMMENDATION_TYPES.SALVAGE]: 'Salvage',
      [RECOMMENDATION_TYPES.SALVAGE_RARE]: 'Salvage (Ecto)',
      [RECOMMENDATION_TYPES.EXTRACT_UPGRADE]: 'Extract',
      
      // gw2stacks: Craft
      [RECOMMENDATION_TYPES.CRAFT_LUCK]: 'Craft Luck',
      [RECOMMENDATION_TYPES.CRAFT_AWAY]: 'Craft Away',
      
      // gw2stacks: Play/Consume
      [RECOMMENDATION_TYPES.USE_BOOSTER]: 'Use Booster',
      [RECOMMENDATION_TYPES.USE_FOOD]: 'Use Food',
      [RECOMMENDATION_TYPES.CONSUME]: 'Use',
      [RECOMMENDATION_TYPES.OPEN_CONTAINER]: 'Open',
      
      // gw2stacks: Delete
      [RECOMMENDATION_TYPES.DESTROY]: 'Destroy',
      [RECOMMENDATION_TYPES.DELETE_JUNK]: 'Delete',
      
      // gw2stacks: Misc
      [RECOMMENDATION_TYPES.WARNING]: 'Warning',
      [RECOMMENDATION_TYPES.MISC_TIP]: 'Tip',
      
      // Keep/Unlock
      [RECOMMENDATION_TYPES.USE_UNLOCK]: 'Unlock',
      [RECOMMENDATION_TYPES.KEEP_KILLPROOF]: 'Killproof',
      [RECOMMENDATION_TYPES.KEEP_LEGENDARY]: 'Legendary Mat',
      [RECOMMENDATION_TYPES.KEEP]: 'Keep',
      [RECOMMENDATION_TYPES.DEPOSIT]: 'Deposit',
    },
    tr: {
      // gw2stacks: Restack
      [RECOMMENDATION_TYPES.STACK]: 'Birleştir',
      
      // gw2stacks: Gobble
      [RECOMMENDATION_TYPES.GOBBLE]: 'Converter Kullan',
      
      // gw2stacks: Sell
      [RECOMMENDATION_TYPES.SELL_TP]: 'TP\'de Sat',
      [RECOMMENDATION_TYPES.SELL_VENDOR]: 'NPC\'ye Sat',
      
      // gw2stacks: Salvage
      [RECOMMENDATION_TYPES.SALVAGE]: 'Salvage',
      [RECOMMENDATION_TYPES.SALVAGE_RARE]: 'Salvage (Ecto)',
      [RECOMMENDATION_TYPES.EXTRACT_UPGRADE]: 'Çıkar',
      
      // gw2stacks: Craft
      [RECOMMENDATION_TYPES.CRAFT_LUCK]: 'Luck Craft',
      [RECOMMENDATION_TYPES.CRAFT_AWAY]: 'Craft Et',
      
      // gw2stacks: Play/Consume
      [RECOMMENDATION_TYPES.USE_BOOSTER]: 'Booster Kullan',
      [RECOMMENDATION_TYPES.USE_FOOD]: 'Yemek Kullan',
      [RECOMMENDATION_TYPES.CONSUME]: 'Kullan',
      [RECOMMENDATION_TYPES.OPEN_CONTAINER]: 'Aç',
      
      // gw2stacks: Delete
      [RECOMMENDATION_TYPES.DESTROY]: 'Yok Et',
      [RECOMMENDATION_TYPES.DELETE_JUNK]: 'Sil',
      
      // gw2stacks: Misc
      [RECOMMENDATION_TYPES.WARNING]: 'Uyarı',
      [RECOMMENDATION_TYPES.MISC_TIP]: 'İpucu',
      
      // Keep/Unlock
      [RECOMMENDATION_TYPES.USE_UNLOCK]: 'Aç',
      [RECOMMENDATION_TYPES.KEEP_KILLPROOF]: 'Killproof',
      [RECOMMENDATION_TYPES.KEEP_LEGENDARY]: 'Legendary Malz.',
      [RECOMMENDATION_TYPES.KEEP]: 'Tut',
      [RECOMMENDATION_TYPES.DEPOSIT]: 'Depola',
    }
  };
  
  return labels[language]?.[type] || labels.en[type] || type;
}

/**
 * Get color for recommendation type
 */
export function getRecommendationColor(type) {
  const colors = {
    // gw2stacks: Restack - Purple
    [RECOMMENDATION_TYPES.STACK]: '#9370DB',
    
    // gw2stacks: Gobble - Cyan
    [RECOMMENDATION_TYPES.GOBBLE]: '#00CED1',
    
    // gw2stacks: Sell - Gold/Silver
    [RECOMMENDATION_TYPES.SELL_TP]: '#FFD700',
    [RECOMMENDATION_TYPES.SELL_VENDOR]: '#C0C0C0',
    
    // gw2stacks: Salvage - Orange
    [RECOMMENDATION_TYPES.SALVAGE]: '#FFA500',
    [RECOMMENDATION_TYPES.SALVAGE_RARE]: '#FF8C00',
    [RECOMMENDATION_TYPES.EXTRACT_UPGRADE]: '#00BFFF',
    
    // gw2stacks: Craft - Teal
    [RECOMMENDATION_TYPES.CRAFT_LUCK]: '#20B2AA',
    [RECOMMENDATION_TYPES.CRAFT_AWAY]: '#48D1CC',
    
    // gw2stacks: Play/Consume - Green
    [RECOMMENDATION_TYPES.USE_BOOSTER]: '#7CFC00',
    [RECOMMENDATION_TYPES.USE_FOOD]: '#98FB98',
    [RECOMMENDATION_TYPES.CONSUME]: '#32CD32',
    [RECOMMENDATION_TYPES.OPEN_CONTAINER]: '#90EE90',
    
    // gw2stacks: Delete - Red
    [RECOMMENDATION_TYPES.DESTROY]: '#FF4444',
    [RECOMMENDATION_TYPES.DELETE_JUNK]: '#DC143C',
    
    // gw2stacks: Misc - Yellow/Orange
    [RECOMMENDATION_TYPES.WARNING]: '#FF6347',
    [RECOMMENDATION_TYPES.MISC_TIP]: '#FFE4B5',
    
    // Keep/Unlock
    [RECOMMENDATION_TYPES.USE_UNLOCK]: '#00FF00',
    [RECOMMENDATION_TYPES.KEEP_KILLPROOF]: '#FF00FF',
    [RECOMMENDATION_TYPES.KEEP_LEGENDARY]: '#FFA500',
    [RECOMMENDATION_TYPES.KEEP]: '#808080',
    [RECOMMENDATION_TYPES.DEPOSIT]: '#4169E1',
  };
  
  return colors[type] || '#FFFFFF';
}
