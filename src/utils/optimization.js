// Inventory Optimization Algorithm
// Best-Fit Decreasing bin packing with Material Storage limit handling

import { CATEGORIES, classifyItem } from './categories';

/**
 * Analyze items that can potentially go to Material Storage
 * CRITICAL: 
 * 1. Same item ID across multiple characters = SINGLE slot in Material Storage
 * 2. Each item type has a STACK LIMIT (default 250, max 2000 with expanders)
 * 3. Only items with canGoToMaterialStorage=true can be stored
 * 4. Locked items (including invisible bag items) are excluded
 * 
 * @param items - All inventory items (with isLocked property)
 * @param stackLimit - Global stack limit per item type
 * @param materialItemLimits - Per-item custom limits { itemId: maxAmount }
 */
export function analyzeMaterialStorageItems(items, stackLimit = 250, materialItemLimits = {}) {
  const inMaterialStorage = []; // Zaten material storage'da
  const canGoToMaterialStorage = []; // Gönderilebilecek (API'ye göre)
  const cannotGoToMaterialStorage = []; // Gidemeyecek (API'ye göre)
  const lockedItems = []; // Kilitli itemler (invisible bag dahil)
  
  // Material storage'da zaten olan item ID'leri ve miktarları
  const existingMaterialIds = new Set();
  const existingMaterialCounts = new Map(); // id -> current count in material storage
  
  // İlk geçiş: Material Storage'daki itemleri bul
  items.forEach(item => {
    if (item.source === 'materials' || item.isInMaterialStorage) {
      inMaterialStorage.push(item);
      existingMaterialIds.add(item.id);
      // Mevcut miktarı kaydet (Material Storage'daki miktar)
      const currentCount = existingMaterialCounts.get(item.id) || 0;
      existingMaterialCounts.set(item.id, currentCount + (item.count || 0));
    }
  });
  
  // İkinci geçiş: Karakterlerdeki/Bankadaki itemleri kategorize et
  items.forEach(item => {
    // Material Storage'dan gelen itemleri atla (zaten işlendi)
    if (item.source === 'materials' || item.isInMaterialStorage) {
      return;
    }
    
    // CRITICAL: Check if item is locked (manual lock or invisible bag)
    if (item.isLocked || item.isInInvisibleBag) {
      lockedItems.push(item);
      return;
    }
    
    // CRITICAL: canGoToMaterialStorage flag'i API'den geliyor
    // Bu flag false ise item kesinlikle Material Storage'a konamaz!
    if (item.canGoToMaterialStorage) {
      canGoToMaterialStorage.push(item);
    } else {
      cannotGoToMaterialStorage.push(item);
    }
  });
  
  // Her unique item ID için gruplama ve stack limit kontrolü
  const itemsByIdMap = new Map(); // id -> { items: [], totalCount: 0 }
  
  canGoToMaterialStorage.forEach(item => {
    if (!itemsByIdMap.has(item.id)) {
      itemsByIdMap.set(item.id, { items: [], totalCount: 0 });
    }
    const group = itemsByIdMap.get(item.id);
    group.items.push(item);
    group.totalCount += item.count || 1;
  });
  
  // Şimdi her unique ID için stack limit kontrolü yap
  const willAddToExistingStack = []; // Mevcut slot'a eklenecek
  const willNeedNewSlot = []; // Yeni slot gerektirecek
  const cannotFitDueToStackLimit = []; // Stack limiti dolduğu için gidemeyecek
  const newSlotGroups = []; // Her group = 1 slot kullanır
  
  // Debug bilgisi
  const debugInfo = {
    itemsWithStackLimitIssue: [],
    totalMaterialStorageItems: inMaterialStorage.length,
    totalCanGoItems: canGoToMaterialStorage.length,
    totalCannotGoItems: cannotGoToMaterialStorage.length,
    totalLockedItems: lockedItems.length
  };
  
  itemsByIdMap.forEach((group, itemId) => {
    // Use per-item limit if set, otherwise use global stack limit
    const itemStackLimit = materialItemLimits[itemId] ?? stackLimit;
    const currentInStorage = existingMaterialCounts.get(itemId) || 0;
    const availableSpace = Math.max(0, itemStackLimit - currentInStorage);
    const totalToSend = group.totalCount;
    
    if (existingMaterialIds.has(itemId)) {
      // Bu item ID zaten Material Storage'da var
      if (availableSpace <= 0) {
        // Stack limiti DOLU - hiçbiri gidemez!
        group.items.forEach(item => {
          cannotFitDueToStackLimit.push({ 
            ...item, 
            reason: 'stack_limit_full',
            currentInStorage,
            stackLimit,
            availableSpace: 0
          });
        });
        debugInfo.itemsWithStackLimitIssue.push({
          id: itemId,
          name: group.items[0]?.name,
          currentInStorage,
          stackLimit,
          wantToSend: totalToSend,
          canSend: 0,
          reason: 'DOLU'
        });
      } else if (totalToSend <= availableSpace) {
        // Hepsi sığar
        group.items.forEach(item => {
          willAddToExistingStack.push({ 
            ...item, 
            willAddToExistingStack: true,
            currentInStorage,
            availableSpace
          });
        });
      } else {
        // Kısmen sığar - sadece sığanı gönder
        let remainingSpace = availableSpace;
        
        // Items'ı count'a göre sırala (büyükten küçüğe)
        const sortedItems = [...group.items].sort((a, b) => (b.count || 1) - (a.count || 1));
        
        sortedItems.forEach(item => {
          const itemCount = item.count || 1;
          
          if (remainingSpace <= 0) {
            // Yer kalmadı
            cannotFitDueToStackLimit.push({ 
              ...item, 
              reason: 'stack_limit_partial',
              currentInStorage,
              stackLimit,
              availableSpace: 0
            });
          } else if (itemCount <= remainingSpace) {
            // Bu item tamamen sığar
            willAddToExistingStack.push({ 
              ...item, 
              willAddToExistingStack: true,
              currentInStorage,
              availableSpace: remainingSpace
            });
            remainingSpace -= itemCount;
          } else {
            // Bu item sığmıyor - karakterde kalsın
            cannotFitDueToStackLimit.push({ 
              ...item, 
              reason: 'stack_limit_partial',
              currentInStorage,
              stackLimit,
              availableSpace: remainingSpace,
              couldFit: remainingSpace,
              cannotFit: itemCount - remainingSpace
            });
            remainingSpace = 0;
          }
        });
        
        debugInfo.itemsWithStackLimitIssue.push({
          id: itemId,
          name: group.items[0]?.name,
          currentInStorage,
          stackLimit,
          wantToSend: totalToSend,
          canSend: availableSpace,
          reason: 'KISMI'
        });
      }
    } else {
      // Bu item ID yeni - Material Storage'da yok
      if (totalToSend <= stackLimit) {
        // Hepsi sığar (yeni slot açılır)
        newSlotGroups.push({
          itemId,
          items: group.items,
          totalCount: totalToSend,
          slotsNeeded: 1
        });
      } else {
        // Stack limitini aşıyor - sığanı gönder, kalanı karakterde kalsın
        let remainingSpace = stackLimit;
        const fittingItems = [];
        const notFittingItems = [];
        
        // Items'ı count'a göre sırala
        const sortedItems = [...group.items].sort((a, b) => (b.count || 1) - (a.count || 1));
        
        sortedItems.forEach(item => {
          const itemCount = item.count || 1;
          
          if (remainingSpace <= 0) {
            notFittingItems.push(item);
          } else if (itemCount <= remainingSpace) {
            fittingItems.push(item);
            remainingSpace -= itemCount;
          } else {
            notFittingItems.push(item);
          }
        });
        
        if (fittingItems.length > 0) {
          newSlotGroups.push({
            itemId,
            items: fittingItems,
            totalCount: fittingItems.reduce((sum, i) => sum + (i.count || 1), 0),
            slotsNeeded: 1
          });
        }
        
        notFittingItems.forEach(item => {
          cannotFitDueToStackLimit.push({
            ...item,
            reason: 'stack_limit_exceeded_new',
            stackLimit,
            currentInStorage: 0
          });
        });
        
        debugInfo.itemsWithStackLimitIssue.push({
          id: itemId,
          name: group.items[0]?.name,
          currentInStorage: 0,
          stackLimit,
          wantToSend: totalToSend,
          canSend: stackLimit,
          reason: 'YENİ_AŞIM'
        });
      }
    }
  });
  
  // Yeni slot gruplarını toplam count'a göre sırala (yüksek = öncelikli)
  newSlotGroups.sort((a, b) => b.totalCount - a.totalCount);
  
  // Grupları düzleştir
  newSlotGroups.forEach(group => {
    group.items.forEach((item, idx) => {
      willNeedNewSlot.push({ 
        ...item, 
        isFirstInGroup: idx === 0,
        groupTotalCount: group.totalCount
      });
    });
  });
  
  return {
    inMaterialStorage,
    willAddToExistingStack,
    willNeedNewSlot,
    cannotFitDueToStackLimit,
    newSlotGroups,
    cannotGoToMaterialStorage,
    lockedItems, // NEW: Items that are locked and excluded from optimization
    existingMaterialIds,
    existingMaterialCounts,
    currentSlotUsage: existingMaterialIds.size,
    uniqueNewSlotsNeeded: newSlotGroups.length,
    stackLimit,
    debugInfo
  };
}

/**
 * Select which items to send to Material Storage based on stack limit
 * Note: Slot limit is not needed - GW2 API determines which items can go to Material Storage
 * @param items - All inventory items (with isLocked property)
 * @param stackLimit - Global per-item stack limit (250-2750)
 * @param materialItemLimits - Per-item custom limits { itemId: maxAmount }
 */
export function selectItemsForMaterialStorage(items, stackLimit = 250, materialItemLimits = {}) {
  const analysis = analyzeMaterialStorageItems(items, stackLimit, materialItemLimits);
  
  // Mevcut kullanım = Material Storage'daki unique item sayısı
  const currentUsedSlots = analysis.existingMaterialIds.size;
  
  // Material Storage'a gidecekler (canGoToMaterialStorage=true VE stack limiti uygun)
  const toMaterialStorage = [
    ...analysis.willAddToExistingStack,
    ...analysis.willNeedNewSlot
  ];
  
  // Stack limiti yüzünden gidemeyenler
  const stackLimitExceeded = analysis.cannotFitDueToStackLimit || [];
  
  // Locked items (excluded from optimization)
  const lockedItems = analysis.lockedItems || [];
  
  return {
    toMaterialStorage,
    couldNotFit: [], // Slot limit yok artık
    stackLimitExceeded,
    lockedItems, // NEW: Locked items that stay on character
    toCharacters: [
      ...analysis.cannotGoToMaterialStorage, 
      ...stackLimitExceeded
      // NOT including lockedItems here - they are handled separately
    ],
    stats: {
      stackLimit,
      currentUsedSlots,
      willUseNewSlots: analysis.uniqueNewSlotsNeeded,
      uniqueNewItemTypes: analysis.uniqueNewSlotsNeeded,
      addingToExistingStacks: analysis.willAddToExistingStack.length,
      couldNotFitDueToStackLimit: stackLimitExceeded.length,
      couldNotFitCount: stackLimitExceeded.length,
      totalToMaterialStorage: toMaterialStorage.length,
      totalCannotGo: analysis.cannotGoToMaterialStorage.length,
      totalLockedItems: lockedItems.length, // NEW
      afterOptimizationUsed: currentUsedSlots + analysis.uniqueNewSlotsNeeded
    }
  };
}

/**
 * Group items by category
 */
export function groupItemsByCategory(items) {
  const groups = {};
  
  items.forEach(item => {
    const category = classifyItem(item);
    if (!groups[category]) {
      groups[category] = {
        category,
        categoryName: CATEGORIES[category]?.name || category,
        icon: CATEGORIES[category]?.icon || '❓',
        items: [],
        totalSlots: 0,
        totalCount: 0
      };
    }
    groups[category].items.push(item);
    groups[category].totalSlots += 1;
    groups[category].totalCount += item.count || 1;
  });
  
  return Object.values(groups).sort((a, b) => b.totalSlots - a.totalSlots);
}

/**
 * Group items by sub-category
 */
export function groupItemsBySubCategory(items) {
  const groups = {};
  
  items.forEach(item => {
    const mainCategory = classifyItem(item);
    const mainCat = CATEGORIES[mainCategory];
    
    let subCategoryKey = mainCategory;
    let subCategoryName = mainCat?.name || mainCategory;
    
    if (mainCat?.subCategories) {
      for (const [subKey, subCat] of Object.entries(mainCat.subCategories)) {
        if (subCat.filter(item)) {
          subCategoryKey = `${mainCategory}_${subKey}`;
          subCategoryName = `${mainCat.name} - ${subCat.name}`;
          break;
        }
      }
    }
    
    if (!groups[subCategoryKey]) {
      groups[subCategoryKey] = {
        category: mainCategory,
        subCategory: subCategoryKey,
        categoryName: subCategoryName,
        icon: mainCat?.icon || '❓',
        items: [],
        totalSlots: 0,
        totalCount: 0
      };
    }
    
    groups[subCategoryKey].items.push(item);
    groups[subCategoryKey].totalSlots += 1;
    groups[subCategoryKey].totalCount += item.count || 1;
  });
  
  return Object.values(groups).sort((a, b) => b.totalSlots - a.totalSlots);
}

/**
 * Main optimization function with Material Storage stack limit support
 */
export function optimizeDistribution(items, characterSlots, options = {}) {
  const { 
    useSubCategories = false,
    stackLimit = 250
  } = options;
  
  // 1. Material Storage seçimi (stack limit kontrolü)
  const materialSelection = selectItemsForMaterialStorage(items, stackLimit);
  
  // 2. Karakterlere dağıtılacakları kategorile
  const categoryGroups = useSubCategories 
    ? groupItemsBySubCategory(materialSelection.toCharacters) 
    : groupItemsByCategory(materialSelection.toCharacters);
  
  // 3. Karakter bin'leri
  const characters = characterSlots.map((char, index) => ({
    id: index,
    name: char.name || `Karakter ${index + 1}`,
    totalSlots: char.slots || 32,
    usedSlots: 0,
    freeSlots: char.slots || 32,
    categories: [],
    items: []
  }));
  
  const distribution = {
    characters,
    materialStorage: {
      items: materialSelection.toMaterialStorage,
      totalItems: materialSelection.toMaterialStorage.length,
      totalCount: materialSelection.toMaterialStorage.reduce((sum, i) => sum + (i.count || 1), 0),
      stats: materialSelection.stats
    },
    unassigned: [],
    stats: {
      totalItems: items.length,
      assignedItems: 0,
      toMaterialStorage: materialSelection.toMaterialStorage.length,
      materialStorageCouldNotFit: materialSelection.couldNotFit.length,
      unassignedItems: 0,
      efficiency: 0
    }
  };
  
  // 4. Best-Fit Decreasing dağıtım
  for (const category of categoryGroups) {
    let remainingItems = [...category.items];
    
    while (remainingItems.length > 0) {
      const itemsToPlace = remainingItems.length;
      
      // Best Fit
      let bestFitChar = null;
      let bestFitWaste = Infinity;
      
      for (const char of characters) {
        if (char.freeSlots >= itemsToPlace) {
          const waste = char.freeSlots - itemsToPlace;
          if (waste < bestFitWaste) {
            bestFitWaste = waste;
            bestFitChar = char;
          }
        }
      }
      
      // First Fit fallback
      if (!bestFitChar) {
        bestFitChar = characters
          .filter(c => c.freeSlots > 0)
          .sort((a, b) => b.freeSlots - a.freeSlots)[0];
      }
      
      if (!bestFitChar || bestFitChar.freeSlots === 0) {
        distribution.unassigned.push(...remainingItems);
        break;
      }
      
      const itemsToAssign = remainingItems.splice(0, bestFitChar.freeSlots);
      
      bestFitChar.items.push(...itemsToAssign);
      bestFitChar.usedSlots += itemsToAssign.length;
      bestFitChar.freeSlots -= itemsToAssign.length;
      
      const existingCategory = bestFitChar.categories.find(c => c.category === category.category);
      if (existingCategory) {
        existingCategory.items.push(...itemsToAssign);
        existingCategory.count += itemsToAssign.length;
      } else {
        bestFitChar.categories.push({
          category: category.category,
          subCategory: category.subCategory,
          categoryName: category.categoryName,
          icon: category.icon,
          items: itemsToAssign,
          count: itemsToAssign.length
        });
      }
    }
  }
  
  // 5. İstatistikler
  distribution.stats.assignedItems = characters.reduce((sum, c) => sum + c.items.length, 0);
  distribution.stats.unassignedItems = distribution.unassigned.length;
  
  const totalSlots = characters.reduce((sum, c) => sum + c.totalSlots, 0);
  const usedSlots = characters.reduce((sum, c) => sum + c.usedSlots, 0);
  distribution.stats.efficiency = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;
  distribution.stats.totalSlots = totalSlots;
  distribution.stats.usedSlots = usedSlots;
  distribution.stats.freeSlots = totalSlots - usedSlots;
  
  return distribution;
}

/**
 * Generate transfer plan
 */
export function generateTransferPlan(items, distribution) {
  const transferSteps = [];
  const materialStorageSteps = [];
  
  // Material Storage transferleri
  if (distribution.materialStorage.items.length > 0) {
    const bySource = {};
    distribution.materialStorage.items.forEach(item => {
      const source = item.sourceName || item.source;
      if (!bySource[source]) bySource[source] = [];
      bySource[source].push(item);
    });
    
    Object.entries(bySource).forEach(([source, sourceItems]) => {
      if (source !== 'materials') {
        materialStorageSteps.push({
          type: 'to_material_storage',
          from: source,
          fromType: sourceItems[0].source,
          items: sourceItems.map(i => ({
            id: i.id,
            name: i.name,
            count: i.count,
            icon: i.icon,
            rarity: i.rarity,
            willAddToExistingStack: i.willAddToExistingStack || false
          })),
          instruction: `${source} → Material Storage`,
          itemCount: sourceItems.length
        });
      }
    });
  }
  
  // Karakter transferleri
  distribution.characters.forEach((targetChar, targetIndex) => {
    const bySource = {};
    
    targetChar.items.forEach(item => {
      const currentSource = item.sourceName || item.source;
      
      if (item.source === 'character' && item.sourceName === targetChar.name) return;
      if (item.source === 'materials') return;
      
      if (!bySource[currentSource]) {
        bySource[currentSource] = { sourceType: item.source, items: [] };
      }
      bySource[currentSource].items.push(item);
    });
    
    Object.entries(bySource).forEach(([source, data]) => {
      if (data.items.length > 0) {
        transferSteps.push({
          type: 'transfer',
          from: source,
          fromType: data.sourceType,
          to: targetChar.name,
          toIndex: targetIndex,
          items: data.items.map(i => ({
            id: i.id,
            name: i.name,
            count: i.count,
            icon: i.icon,
            rarity: i.rarity
          })),
          instruction: `${source} → ${targetChar.name}`,
          itemCount: data.items.length
        });
      }
    });
  });
  
  const groupedBySource = {};
  transferSteps.forEach(step => {
    if (!groupedBySource[step.from]) {
      groupedBySource[step.from] = {
        source: step.from,
        sourceType: step.fromType,
        transfers: []
      };
    }
    groupedBySource[step.from].transfers.push(step);
  });
  
  return {
    materialStorageSteps,
    transferSteps,
    groupedBySource: Object.values(groupedBySource),
    summary: {
      totalMaterialStorageTransfers: materialStorageSteps.reduce((sum, s) => sum + s.itemCount, 0),
      totalCharacterTransfers: transferSteps.reduce((sum, s) => sum + s.itemCount, 0),
      sourcesInvolved: new Set([...materialStorageSteps.map(s => s.from), ...transferSteps.map(s => s.from)]).size
    }
  };
}

/**
 * Generate detailed report
 */
export function generateDistributionReport(distribution, items) {
  const transferPlan = generateTransferPlan(items, distribution);
  
  return {
    summary: {
      totalItems: distribution.stats.totalItems,
      assignedItems: distribution.stats.assignedItems,
      toMaterialStorage: distribution.stats.toMaterialStorage,
      materialStorageCouldNotFit: distribution.stats.materialStorageCouldNotFit,
      unassignedItems: distribution.stats.unassignedItems,
      efficiency: distribution.stats.efficiency,
      totalSlots: distribution.stats.totalSlots,
      usedSlots: distribution.stats.usedSlots,
      freeSlots: distribution.stats.freeSlots
    },
    materialStorage: {
      itemCount: distribution.materialStorage.totalItems,
      totalCount: distribution.materialStorage.totalCount,
      stats: distribution.materialStorage.stats,
      items: distribution.materialStorage.items.map(item => ({
        id: item.id,
        name: item.name,
        count: item.count,
        rarity: item.rarity,
        icon: item.icon,
        currentLocation: item.sourceName || item.source,
        willAddToExistingStack: item.willAddToExistingStack || false
      }))
    },
    characters: distribution.characters.map(char => ({
      name: char.name,
      totalSlots: char.totalSlots,
      usedSlots: char.usedSlots,
      freeSlots: char.freeSlots,
      fillPercentage: Math.round((char.usedSlots / char.totalSlots) * 100),
      categories: char.categories.map(cat => ({
        name: cat.categoryName,
        icon: cat.icon,
        count: cat.count,
        items: cat.items.map(item => ({
          id: item.id,
          name: item.name,
          count: item.count,
          rarity: item.rarity,
          icon: item.icon,
          currentLocation: item.sourceName || item.source
        }))
      }))
    })),
    unassigned: distribution.unassigned.map(item => ({
      id: item.id,
      name: item.name,
      count: item.count,
      rarity: item.rarity,
      category: classifyItem(item),
      canGoToMaterialStorage: item.canGoToMaterialStorage
    })),
    transferPlan
  };
}

/**
 * Suggest optimal slot distribution
 */
export function suggestSlotDistribution(items, numCharacters = 3, stackLimit = 250) {
  const materialSelection = selectItemsForMaterialStorage(items, stackLimit);
  const categoryGroups = groupItemsByCategory(materialSelection.toCharacters);
  const totalItems = materialSelection.toCharacters.length;
  const avgPerChar = Math.ceil(totalItems / numCharacters);
  
  const suggestions = [];
  let remainingItems = totalItems;
  
  for (let i = 0; i < numCharacters; i++) {
    const isLast = i === numCharacters - 1;
    const recommendedSlots = isLast ? remainingItems : Math.min(avgPerChar + 10, 160);
    
    suggestions.push({
      character: i + 1,
      recommendedSlots: Math.max(recommendedSlots, 20),
      reason: isLast ? 'Kalan itemler için' : 'Dengeli dağılım için'
    });
    
    remainingItems -= recommendedSlots;
  }
  
  return {
    balanced: suggestions,
    totalItems,
    itemsToMaterialStorage: materialSelection.toMaterialStorage.length,
    materialStorageCouldNotFit: materialSelection.couldNotFit.length,
    itemsToCharacters: materialSelection.toCharacters.length,
    categoryBreakdown: categoryGroups.map(g => ({
      name: g.categoryName,
      icon: g.icon,
      slots: g.totalSlots,
      items: g.totalCount
    })),
    materialStorageStats: materialSelection.stats
  };
}

// Legacy export for compatibility
export function separateMaterialStorageItems(items) {
  const analysis = analyzeMaterialStorageItems(items);
  return {
    toMaterialStorage: [...analysis.willAddToExistingStack, ...analysis.willNeedNewSlot],
    toCharacters: analysis.cannotGoToMaterialStorage
  };
}

export default {
  analyzeMaterialStorageItems,
  selectItemsForMaterialStorage,
  separateMaterialStorageItems,
  groupItemsByCategory,
  groupItemsBySubCategory,
  optimizeDistribution,
  generateTransferPlan,
  generateDistributionReport,
  suggestSlotDistribution
};
