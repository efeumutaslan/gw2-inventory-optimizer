# GW2 Inventory Manager V2 - Development Plan

## Overview
Comprehensive upgrade with smart item recommendations, locking system, and internationalization.

---

## Phase 1: Core Infrastructure & Bug Fixes ✅ COMPLETED
**Priority: CRITICAL**

### 1.1 Fix Character Limit ✅
- [x] Remove 6 character limit in API calls
- [x] Fetch ALL characters from account
- [x] Update character selection UI

### 1.2 Material Storage Limit ✅
- [x] Increase max limit from 2000 → 2750
- [x] Update UI presets

### 1.3 Fix Event Item Categories ✅
- [x] Research GW2 API material categories
- [x] Items correctly use API category data
- [x] canGoToMaterialStorage flag from API

---

## Phase 2: Internationalization (i18n) ✅ COMPLETED
**Priority: HIGH**

### 2.1 Language System Infrastructure ✅
- [x] Create i18n context provider
- [x] Create useTranslation hook
- [x] Language detection from browser

### 2.2 Language Files ✅
- [x] Create TR (Turkish) translations
- [x] Create EN (English) translations
- [x] Support for item names (from API)

### 2.3 Language Switcher UI ✅
- [x] Add language toggle in header
- [x] Persist language preference in localStorage

---

## Phase 3: Item Locking System ✅ COMPLETED
**Priority: HIGH**

### 3.1 Invisible Bag Detection ✅
- [x] Detect bag types from API (Invisible, Safe, etc.)
- [x] Auto-lock items in Invisible bags
- [x] Visual indicator for invisible bag items

### 3.2 Manual Lock/Unlock ✅
- [x] Add lock toggle per item
- [x] Lock icon on item cards
- [x] Persist locks in localStorage

### 3.3 Optimization Integration ✅
- [x] Exclude locked items from distribution
- [x] Subtract locked items from available slots
- [x] Show locked items count in stats

---

## Phase 4: Advanced Material Storage ✅ COMPLETED
**Priority: HIGH**

### 4.1 User-Defined Fill Limit ✅
- [x] Separate "max limit" vs "fill to" limit
- [x] UI: "Limit: 2000, Fill to: 1500"
- [x] Stop sending when "fill to" reached

### 4.2 Per-Item Limits (Backend Ready)
- [x] Allow setting custom limits per item type (Context ready)
- [ ] Default: stack limit (250-2000)
- [ ] UI for managing item-specific limits
- [x] Persist in localStorage

### 4.3 Smart Deposit Preview
- [x] Show what will happen if "Deposit All" used
- [x] Highlight items that will overflow
- [x] Suggest keeping some on character

---

## Phase 5: Wardrobe & Unlock Tracking
**Priority: MEDIUM**

### 5.1 API Integration
- [ ] Fetch /v2/account/dyes
- [ ] Fetch /v2/account/skins
- [ ] Fetch /v2/account/minis
- [ ] Fetch /v2/account/finishers
- [ ] Fetch /v2/account/outfits

### 5.2 Unlock Detection
- [ ] Check if item unlocks something
- [ ] Check if already unlocked on account
- [ ] Visual indicator (locked/unlocked icon)

### 5.3 Unlock Recommendations
- [ ] "Use this to unlock" suggestions
- [ ] Filter: Show only unlockable items
- [ ] Progress tracking (X/Y unlocked)

---

## Phase 6: Smart Item Recommendations (gw2stacks inspired)
**Priority: MEDIUM-HIGH**

### 6.1 Stack Merging
- [ ] Find incomplete stacks across locations
- [ ] Suggest merging same items
- [ ] Calculate space savings

### 6.2 Junk Item Detection
- [ ] Detect items with "Junk" rarity
- [ ] Trophy items from Renown Hearts
- [ ] "Sell to vendor" recommendations

### 6.3 Consumable Suggestions
- [ ] Detect unused consumables
- [ ] Festival items (fireworks, tonics)
- [ ] "Use or delete" recommendations

### 6.4 Binding-Based Recommendations
```
IF item.binding == "Account" AND isUnlocked(item):
    → "Already unlocked, can DESTROY"
    
IF item.binding == null AND isUnlockable(item):
    → "Can SELL on TP or UNLOCK"
    
IF item.binding == "Account" AND NOT isUnlocked(item):
    → "USE to unlock"
```

### 6.5 Achievement Items
- [ ] Fetch /v2/account/achievements
- [ ] Detect items for completed achievements
- [ ] "Safe to sell/destroy" recommendations

### 6.6 Killproof Items
- [ ] Identify LI, LD, UFE, etc.
- [ ] Detect unopened killproof containers
- [ ] "Don't open - use for killproof" warning

### 6.7 Rune/Sigil Extraction
- [ ] Detect equipment with upgrades
- [ ] Fetch upgrade component prices
- [ ] Fetch Upgrade Extractor price
- [ ] Compare: extractor cost vs component value
- [ ] "Extract worth it" recommendations

### 6.8 Legendary Integration
- [ ] Detect legendary equipment ownership
- [ ] Suggest salvaging exotic/ascended duplicates
- [ ] "You have legendary, can salvage" tips

---

## Phase 7: UI/UX Improvements
**Priority: LOW**

### 7.1 Dashboard Enhancements
- [ ] Quick stats overview
- [ ] "Clean up" action buttons
- [ ] Recommendation summary

### 7.2 Filters & Search
- [ ] Filter by recommendation type
- [ ] "Show sellable only"
- [ ] "Show unlockables only"

### 7.3 Bulk Actions
- [ ] Select multiple items
- [ ] Bulk lock/unlock
- [ ] Bulk recommendations

---

## API Endpoints Needed

### Current (Already Using)
- /v2/account
- /v2/characters
- /v2/characters/:id/inventory
- /v2/account/bank
- /v2/account/materials
- /v2/account/inventory
- /v2/materials
- /v2/items

### New for V2
- /v2/account/dyes (wardrobe)
- /v2/account/skins (wardrobe)
- /v2/account/minis (wardrobe)
- /v2/account/achievements (achievement tracking)
- /v2/commerce/prices (TP prices for extraction calc)
- /v2/items (upgrade_from for rune/sigil detection)

---

## Data Structures

### Locked Items (localStorage)
```javascript
{
  "locked_items": {
    "character_name:bag_index:slot_index": true,
    // or by item instance
    "unique_item_key": true
  }
}
```

### Per-Item Material Limits (localStorage)
```javascript
{
  "material_item_limits": {
    "19721": 500,  // Candy Corn max 500
    "24276": 1000, // Iron Ore max 1000
    // default: stackLimit
  }
}
```

### Language (localStorage)
```javascript
{
  "language": "tr" | "en"
}
```

---

## Execution Order

1. **Phase 1** - Fix critical bugs first
2. **Phase 2** - i18n early (affects all UI)
3. **Phase 3** - Locking (core feature)
4. **Phase 4** - Material Storage enhancements
5. **Phase 5** - Wardrobe tracking
6. **Phase 6** - Smart recommendations
7. **Phase 7** - Polish

---

## Timeline Estimate

| Phase | Effort | Status |
|-------|--------|--------|
| Phase 1 | 1-2 hours | 🔲 Not Started |
| Phase 2 | 2-3 hours | 🔲 Not Started |
| Phase 3 | 2-3 hours | 🔲 Not Started |
| Phase 4 | 2-3 hours | 🔲 Not Started |
| Phase 5 | 3-4 hours | 🔲 Not Started |
| Phase 6 | 4-6 hours | 🔲 Not Started |
| Phase 7 | 2-3 hours | 🔲 Not Started |

**Total: ~16-24 hours of development**

---

## Notes

- gw2stacks reference: https://gw.zweistein.cz/gw2stacks/
- All new features should support both TR and EN
- Mobile-responsive design considerations
- Performance: Cache API responses appropriately
