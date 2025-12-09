import { createContext, useContext, useReducer, useCallback } from 'react';
import { getAllInventoryData, validateToken } from '../services/gw2Api';

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
  materialStorageUsedSlots: 0 // Mevcut material storage doluluk
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
  RESET: 'RESET'
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
  
  const value = {
    ...state,
    setApiKey,
    validateAndSetKey,
    loadInventory,
    setFilters,
    setSort,
    updateBagPlan,
    clearBagPlan,
    logout
  };
  
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
}

export default InventoryContext;
