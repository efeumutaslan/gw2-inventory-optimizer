# GW2 Inventory Manager V2 - Development Plan

## Overview
Comprehensive upgrade with smart item recommendations, locking system, and internationalization.

---

## Phase 1-6: COMPLETED ✅

### Phase 1: Core Bug Fixes ✅
- [x] All characters fetch (no 6 limit)
- [x] Material Storage max → 2750
- [x] Event item categories fixed

### Phase 2: Internationalization ✅
- [x] Turkish + English support
- [x] Language switcher
- [x] Browser detection + localStorage

### Phase 3: Item Locking ✅
- [x] Invisible bag auto-lock
- [x] Manual lock/unlock
- [x] Visual indicators

### Phase 4: Material Storage ✅
- [x] Fill limit system
- [x] Per-item limits (backend)

### Phase 5: Wardrobe Tracking ✅
- [x] Account skins/dyes/minis
- [x] Wallet (UFE tracking)
- [x] Legendary Armory

### Phase 6: Recommendations ✅
- [x] Recommendations Panel
- [x] All recommendation types
- [x] TP price integration
- [x] Killproof protection

---

## Recommendation Types

| Type | Icon | Description |
|------|------|-------------|
| WARNING | ⚠️ | Critical warnings |
| USE_UNLOCK | 🔓 | Use to unlock |
| SELL_TP | 💰 | Sell on Trading Post |
| EXTRACT | 🔧 | Extract rune/sigil |
| SALVAGE | 🔨 | Salvage for materials |
| SELL_VENDOR | 🪙 | Sell to NPC |
| DEPOSIT | 📥 | Deposit to Material Storage |
| DESTROY | 🗑️ | Safe to destroy |
| STACK | 📦 | Merge stacks |
| CONSUME | ✨ | Open/use |
| KILLPROOF | ⚔️ | Keep for KP |

---

## Special Item IDs

### Killproof (DON'T CONSUME)
- LI: 77302
- LD: 88485
- UCE: 81743

### Raid Coffers (DON'T OPEN)
W1: 78989, 79186, 78993
W2: 80252, 80264, 80269
W3: 80557, 80623, 80330, 80387
W4: 81490, 81462, 81225, 81267
W5: 88543, 88866, 88945, 88701
W6: 91270, 91246, 91175
W7: 91838, 91764, 91781

---

## Future (Phase 7)
- [ ] Per-item limits UI
- [ ] Bulk lock/unlock
- [ ] Achievement items
- [ ] Export/Import

---

## Deploy

```bash
npm run build
vercel deploy
# or netlify drag-drop
```
