import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { getAllInventoryData, validateToken } from '../services/gw2Api';

// Load locked items from localStorage
const loadLockedItems = () => {
  try {
    return JSON.parse(localStorage.getItem('gw2_locked_items') || '{}');
  } catch {
    return {};
  }
};

// Load per-item material limits from localStorage
const loadMaterialItemLimits = () => {
  try {
    return JSON.parse(localStorage.getItem('gw2_material_item_limits') || '{}');
  } catch {
    return {};
  }
};

const initialState = {
  apiKey: localStorage.getItem('gw2_api_key') || null,
  isValidated: false,
  isLoading: false,
  loadingMessage: '',
  error: null,
  items: [],
  characters: [],
  filters: { category: 'all', subCategory: null, rarities: [], sources: [], search: '' },
  sortBy: 'rarity',
  sortOrder: 'desc',
  bagPlan: JSON.parse(localStorage.getItem('gw2_bag_plan') || '[]'),
  stats: { totalItems: 0, uniqueItems: 0, bySource: {}, byRarity: {} },
  materialStorageUsedSlots: 0,
  // NEW: Locked items system
  lockedItems: loadLockedItems(), // { "uniqueKey": true }
  // NEW: Per-item material limits
  materialItemLimits: loadMaterialItemLimits() // { "itemId": maxAmount }
};

const ACTIONS = {
  SET_API_KEY: 'SET_API_KEY',
  SET_VALIDATED: 'SET_VALIDATED',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_ITEMS: 'SET_ITEMS',
  SET_FILTERS: 'SET_FILTERS',
  SET_SORT: 'SET_SORT',
  UPDATE_BAG_PLAN: 'UPDATE_BAG_PLAN',
  CLEAR_BAG_PLAN: 'CLEAR_BAG_PLAN',
  RESET: 'RESET',
  // NEW: Locking system
  TOGGLE_ITEM_LOCK: 'TOGGLE_ITEM_LOCK',
  SET_LOCKED_ITEMS: 'SET_LOCKED_ITEMS',
  // NEW: Per-item material limits
  SET_MATERIAL_ITEM_LIMIT: 'SET_MATERIAL_ITEM_LIMIT',
  REMOVE_MATERIAL_ITEM_LIMIT: 'REMOVE_MATERIAL_ITEM_LIMIT'
};

function inventoryReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_API_KEY:
      if (action.payload) localStorage.setItem('gw2_api_key', action.payload);
      else localStorage.removeItem('gw2_api_key');
      return { ...state, apiKey: action.payload, isValidated: false };
    
    case ACTIONS.SET_VALIDATED:
      return { ...state, isValidated: action.payload };
    
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload.loading, loadingMessage: action.payload.message || '' };
    
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    
    case ACTIONS.SET_ITEMS:
      const stats = {
        totalItems: action.payload.items.length,
        uniqueItems: action.payload.uniqueItems || new Set(action.payload.items.map(i => i.id)).size,
        bySource: {}, byRarity: {}
      };
      action.payload.items.forEach(item => {
        stats.bySource[item.source] = (stats.bySource[item.source] || 0) + 1;
        stats.byRarity[item.rarity] = (stats.byRarity[item.rarity] || 0) + 1;
      });
      return { 
        ...state, 
        items: action.payload.items, 
        characters: action.payload.characters || [], 
        stats, 
        materialStorageUsedSlots: action.payload.materialStorageUsedSlots || 0,
        isLoading: false, 
        error: null 
      };
    
    case ACTIONS.SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload } };
    
    case ACTIONS.SET_SORT:
      return { ...state, sortBy: action.payload.sortBy ?? state.sortBy, sortOrder: action.payload.sortOrder ?? state.sortOrder };
    
    case ACTIONS.UPDATE_BAG_PLAN:
      localStorage.setItem('gw2_bag_plan', JSON.stringify(action.payload));
      return { ...state, bagPlan: action.payload };
    
    case ACTIONS.CLEAR_BAG_PLAN:
      localStorage.removeItem('gw2_bag_plan');
      return { ...state, bagPlan: [] };
    
    case ACTIONS.RESET:
      localStorage.removeItem('gw2_api_key');
      localStorage.removeItem('gw2_bag_plan');
      return { ...initialState, apiKey: null };
    
    // NEW: Locking system
    case ACTIONS.TOGGLE_ITEM_LOCK: {
      const { uniqueKey, locked } = action.payload;
      const newLockedItems = { ...state.lockedItems };
      if (locked) {
        newLockedItems[uniqueKey] = true;
      } else {
        delete newLockedItems[uniqueKey];
      }
      localStorage.setItem('gw2_locked_items', JSON.stringify(newLockedItems));
      return { ...state, lockedItems: newLockedItems };
    }
    
    case ACTIONS.SET_LOCKED_ITEMS: {
      localStorage.setItem('gw2_locked_items', JSON.stringify(action.payload));
      return { ...state, lockedItems: action.payload };
    }
    
    // NEW: Per-item material limits
    case ACTIONS.SET_MATERIAL_ITEM_LIMIT: {
      const { itemId, limit } = action.payload;
      const newLimits = { ...state.materialItemLimits, [itemId]: limit };
      localStorage.setItem('gw2_material_item_limits', JSON.stringify(newLimits));
      return { ...state, materialItemLimits: newLimits };
    }
    
    case ACTIONS.REMOVE_MATERIAL_ITEM_LIMIT: {
      const newLimits = { ...state.materialItemLimits };
      delete newLimits[action.payload];
      localStorage.setItem('gw2_material_item_limits', JSON.stringify(newLimits));
      return { ...state, materialItemLimits: newLimits };
    }
    
    default:
      return state;
  }
}

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);
  
  const setApiKey = useCallback((key) => {
    dispatch({ type: ACTIONS.SET_API_KEY, payload: key });
  }, []);
  
  const validateAndSetKey = useCallback(async (key) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: { loading: true, message: 'API Key doğrulanıyor...' } });
    try {
      const result = await validateToken(key);
      if (result.valid) {
        dispatch({ type: ACTIONS.SET_API_KEY, payload: key });
        dispatch({ type: ACTIONS.SET_VALIDATED, payload: true });
        dispatch({ type: ACTIONS.SET_LOADING, payload: { loading: false } });
        return { success: true, name: result.name };
      } else {
        dispatch({ type: ACTIONS.SET_ERROR, payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  }, []);
  
  const loadInventory = useCallback(async () => {
    if (!state.apiKey) return;
    dispatch({ type: ACTIONS.SET_LOADING, payload: { loading: true, message: 'Envanter yükleniyor...' } });
    try {
      const data = await getAllInventoryData(state.apiKey, ({ detail }) => {
        dispatch({ type: ACTIONS.SET_LOADING, payload: { loading: true, message: detail } });
      });
      dispatch({ type: ACTIONS.SET_ITEMS, payload: data });
    } catch (error) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
    }
  }, [state.apiKey]);
  
  const setFilters = useCallback((filters) => {
    dispatch({ type: ACTIONS.SET_FILTERS, payload: filters });
  }, []);
  
  const setSort = useCallback((sortBy, sortOrder) => {
    dispatch({ type: ACTIONS.SET_SORT, payload: { sortBy, sortOrder } });
  }, []);
  
  const updateBagPlan = useCallback((plan) => {
    dispatch({ type: ACTIONS.UPDATE_BAG_PLAN, payload: plan });
  }, []);
  
  const clearBagPlan = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_BAG_PLAN });
  }, []);
  
  const logout = useCallback(() => {
    dispatch({ type: ACTIONS.RESET });
  }, []);
  
  // NEW: Item locking functions
  const toggleItemLock = useCallback((uniqueKey, locked) => {
    dispatch({ type: ACTIONS.TOGGLE_ITEM_LOCK, payload: { uniqueKey, locked } });
  }, []);
  
  const isItemLocked = useCallback((uniqueKey) => {
    return !!state.lockedItems[uniqueKey];
  }, [state.lockedItems]);
  
  const setLockedItems = useCallback((lockedItems) => {
    dispatch({ type: ACTIONS.SET_LOCKED_ITEMS, payload: lockedItems });
  }, []);
  
  // Helper to generate unique key for an item
  const getItemUniqueKey = useCallback((item) => {
    // For character items: characterName:bagIndex:slotIndex
    if (item.source === 'character' && item.bagIndex !== undefined && item.slotIndex !== undefined) {
      return `${item.sourceName}:${item.bagIndex}:${item.slotIndex}`;
    }
    // For bank items: bank:slotIndex
    if (item.source === 'bank' && item.slotIndex !== undefined) {
      return `bank:${item.slotIndex}`;
    }
    // For shared inventory: shared:slotIndex
    if (item.source === 'shared' && item.slotIndex !== undefined) {
      return `shared:${item.slotIndex}`;
    }
    // Fallback: use item id and a random identifier (not recommended)
    return `${item.source}:${item.id}:${item.count}`;
  }, []);
  
  // NEW: Per-item material limits functions
  const setMaterialItemLimit = useCallback((itemId, limit) => {
    dispatch({ type: ACTIONS.SET_MATERIAL_ITEM_LIMIT, payload: { itemId, limit } });
  }, []);
  
  const removeMaterialItemLimit = useCallback((itemId) => {
    dispatch({ type: ACTIONS.REMOVE_MATERIAL_ITEM_LIMIT, payload: itemId });
  }, []);
  
  const getMaterialItemLimit = useCallback((itemId, defaultLimit) => {
    return state.materialItemLimits[itemId] ?? defaultLimit;
  }, [state.materialItemLimits]);
  
  // Computed: items with lock status
  const itemsWithLockStatus = useMemo(() => {
    return state.items.map(item => {
      const uniqueKey = getItemUniqueKey(item);
      const isLocked = !!state.lockedItems[uniqueKey] || item.isInInvisibleBag;
      return {
        ...item,
        uniqueKey,
        isLocked,
        lockReason: item.isInInvisibleBag ? 'invisible_bag' : (state.lockedItems[uniqueKey] ? 'manual' : null)
      };
    });
  }, [state.items, state.lockedItems, getItemUniqueKey]);
  
  // Computed: locked items count per character
  const lockedItemsStats = useMemo(() => {
    const stats = { total: 0, byCharacter: {} };
    itemsWithLockStatus.forEach(item => {
      if (item.isLocked) {
        stats.total++;
        if (item.sourceName) {
          stats.byCharacter[item.sourceName] = (stats.byCharacter[item.sourceName] || 0) + 1;
        }
      }
    });
    return stats;
  }, [itemsWithLockStatus]);

  const value = {
    ...state,
    setApiKey,
    validateAndSetKey,
    loadInventory,
    setFilters,
    setSort,
    updateBagPlan,
    clearBagPlan,
    logout,
    // NEW: Locking
    toggleItemLock,
    isItemLocked,
    setLockedItems,
    getItemUniqueKey,
    itemsWithLockStatus,
    lockedItemsStats,
    // NEW: Material item limits
    setMaterialItemLimit,
    removeMaterialItemLimit,
    getMaterialItemLimit
  };
  
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
}

export default InventoryContext;
