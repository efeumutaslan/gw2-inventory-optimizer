import { useEffect, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from '../context/I18nContext';
import FilterSidebar from './FilterSidebar';
import ItemPool from './ItemPool';
import OptimizationPanel from './OptimizationPanel';
import RecommendationsPanel from './RecommendationsPanel';
import QuickStats from './QuickStats';
import LanguageSwitcher from './LanguageSwitcher';

export default function Dashboard() {
  const { 
    loadInventory, 
    isLoading, 
    loadingMessage, 
    error, 
    logout, 
    filters, 
    setFilters,
    stats 
  } = useInventory();
  const { t, language } = useTranslation();
  const [rightPanel, setRightPanel] = useState(null);

  useEffect(() => { 
    loadInventory(); 
  }, [loadInventory]);

  const togglePanel = (panel) => {
    setRightPanel(prev => prev === panel ? null : panel);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gw2-darker via-gw2-dark to-gw2-darker">
      {/* Header */}
      <header className="bg-gw2-dark/90 backdrop-blur-md border-b border-gray-700/50 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚔️</span>
              <h1 className="text-xl font-bold text-gw2-accent">{t('app_name')}</h1>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder={t('search')}
                value={filters.search || ''}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="input-field w-72 pl-10 text-sm h-9"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {filters.search && (
                <button 
                  onClick={() => setFilters({ search: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            
            <div className="h-6 w-px bg-gray-700 mx-1"></div>
            
            <button 
              onClick={() => togglePanel('recommendations')} 
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                rightPanel === 'recommendations' 
                  ? 'bg-gw2-accent text-gw2-darker shadow-lg shadow-gw2-accent/20' 
                  : 'bg-gw2-darker/50 text-gray-300 hover:bg-gw2-darker hover:text-white border border-gray-700'
              }`}
            >
              💡 {t('nav_recommendations')}
            </button>
            
            <button 
              onClick={() => togglePanel('optimizer')} 
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                rightPanel === 'optimizer' 
                  ? 'bg-gw2-accent text-gw2-darker shadow-lg shadow-gw2-accent/20' 
                  : 'bg-gw2-darker/50 text-gray-300 hover:bg-gw2-darker hover:text-white border border-gray-700'
              }`}
            >
              🎯 {t('nav_optimization')}
            </button>
            
            <div className="h-6 w-px bg-gray-700 mx-1"></div>
            
            <button 
              onClick={loadInventory} 
              disabled={isLoading} 
              className="px-3 py-1.5 rounded-lg text-sm bg-gw2-darker/50 text-gray-300 hover:bg-gw2-darker hover:text-white border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title={t('dashboard_reload')}
            >
              🔄
            </button>
            
            <button 
              onClick={logout} 
              className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title={t('dashboard_logout')}
            >
              {language === 'tr' ? 'Çıkış' : 'Logout'}
            </button>
          </div>
        </div>
      </header>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gw2-dark rounded-xl p-8 text-center border border-gray-700 shadow-2xl">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-white font-medium">{loadingMessage || t('loading')}</p>
            <p className="text-gray-500 text-sm mt-2">
              {language === 'tr' ? 'GW2 API\'den veriler alınıyor...' : 'Fetching data from GW2 API...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <span>⚠️</span>
            <span className="text-sm">{t('error')}: {error}</span>
          </div>
          <button 
            onClick={loadInventory} 
            className="text-sm text-red-300 hover:text-red-200 underline"
          >
            {t('dashboard_reload')}
          </button>
        </div>
      )}
      
      {/* Quick Stats Bar */}
      {!isLoading && !error && stats.totalItems > 0 && (
        <QuickStats onOpenRecommendations={() => setRightPanel('recommendations')} />
      )}
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <FilterSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <ItemPool />
        </div>
        
        {rightPanel === 'optimizer' && (
          <div className="w-[480px] border-l border-gray-700/50 bg-gw2-dark/30 backdrop-blur-sm overflow-hidden flex flex-col">
            <OptimizationPanel />
          </div>
        )}
        
        {rightPanel === 'recommendations' && (
          <div className="w-[420px] border-l border-gray-700/50 bg-gw2-dark/30 backdrop-blur-sm overflow-hidden flex flex-col">
            <RecommendationsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
