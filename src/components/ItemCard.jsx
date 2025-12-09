import { useState, memo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RARITY_COLORS, formatGoldValue } from '../utils/categories';
import { useInventory } from '../context/InventoryContext';
import { useTranslation } from '../context/I18nContext';

function ItemCard({ item, showSource = true, size = 'normal', showLockToggle = true }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const cardRef = useRef(null);
  const { toggleItemLock, getItemUniqueKey } = useInventory();
  const { t, language } = useTranslation();
  
  const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.Basic;
  
  const sizeClasses = {
    small: 'w-10 h-10',
    normal: 'w-12 h-12',
    large: 'w-16 h-16'
  };
  
  const countSizeClasses = {
    small: 'text-[9px] px-0.5 min-w-[14px]',
    normal: 'text-[10px] px-1 min-w-[18px]',
    large: 'text-xs px-1 min-w-[20px]'
  };

  const updateTooltipPosition = useCallback(() => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 260;
    const tooltipHeight = 280;
    
    let left, top;
    
    // Try right side first
    if (rect.right + tooltipWidth + 8 < viewportWidth) {
      left = rect.right + 8;
    } else if (rect.left - tooltipWidth - 8 > 0) {
      // Try left side
      left = rect.left - tooltipWidth - 8;
    } else {
      // Center horizontally
      left = Math.max(8, (viewportWidth - tooltipWidth) / 2);
    }
    
    // Vertical positioning - align with item top
    top = rect.top;
    
    // Adjust if goes below viewport
    if (top + tooltipHeight > viewportHeight - 8) {
      top = viewportHeight - tooltipHeight - 8;
    }
    
    // Ensure not above viewport
    if (top < 8) {
      top = 8;
    }
    
    setTooltipStyle({ left, top });
  }, []);

  const handleMouseEnter = useCallback(() => {
    updateTooltipPosition();
    setShowTooltip(true);
  }, [updateTooltipPosition]);

  const handleMouseMove = useCallback(() => {
    if (showTooltip) {
      updateTooltipPosition();
    }
  }, [showTooltip, updateTooltipPosition]);
  
  const handleLockToggle = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const uniqueKey = item.uniqueKey || getItemUniqueKey(item);
    toggleItemLock(uniqueKey, !item.isLocked);
  }, [item, getItemUniqueKey, toggleItemLock]);
  
  const formatCount = (count) => {
    if (count >= 10000) return `${Math.floor(count / 1000)}k`;
    if (count > 999) return count.toLocaleString();
    return count;
  };

  const getSourceLabel = () => {
    const sourceLabels = {
      'character': language === 'tr' ? 'Karakter' : 'Character',
      'bank': language === 'tr' ? 'Banka' : 'Bank',
      'materials': 'Material Storage',
      'shared': language === 'tr' ? 'Paylaşılan Envanter' : 'Shared Inventory'
    };
    return sourceLabels[item.source] || item.source;
  };

  const getBindingLabel = () => {
    if (!item.binding) return null;
    if (item.binding === 'Character') {
      return language === 'tr' 
        ? `${item.boundTo || 'Karakter'}'a Bağlı`
        : `Bound to ${item.boundTo || 'Character'}`;
    }
    return language === 'tr' ? 'Hesaba Bağlı' : 'Account Bound';
  };

  // Source indicator colors
  const sourceColors = {
    character: '#22c55e', // green
    bank: '#3b82f6',      // blue
    materials: '#f97316', // orange
    shared: '#a855f7'     // purple
  };
  
  return (
    <div
      ref={cardRef}
      className={`item-card group ${sizeClasses[size]} ${item.isLocked ? 'ring-2 ring-yellow-500/50' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
      onMouseMove={handleMouseMove}
    >
      {/* Rarity border */}
      <div 
        className="absolute inset-0 rounded-lg pointer-events-none" 
        style={{ border: `2px solid ${rarityColor}` }} 
      />
      
      {/* Item icon */}
      {item.icon ? (
        <img 
          src={item.icon} 
          alt={item.name} 
          className={`w-full h-full object-cover rounded-md ${item.isLocked ? 'opacity-60' : ''}`} 
          loading="lazy" 
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-gray-700 rounded-md flex items-center justify-center text-gray-500 text-xs">
          ?
        </div>
      )}
      
      {/* Count badge */}
      {item.count > 1 && (
        <span className={`item-count ${countSizeClasses[size]}`}>
          {formatCount(item.count)}
        </span>
      )}
      
      {/* Lock indicator */}
      {item.isLocked && (
        <div 
          className="absolute top-0 right-0 w-4 h-4 bg-yellow-500/90 rounded-bl-md rounded-tr-md flex items-center justify-center"
          title={item.lockReason === 'invisible_bag' ? t('lock_invisible_bag') : t('lock_locked')}
        >
          <span className="text-[8px]">🔒</span>
        </div>
      )}
      
      {/* Source indicator */}
      {showSource && !item.isLocked && (
        <div 
          className="absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full border border-black/30"
          style={{ backgroundColor: sourceColors[item.source] || '#666' }}
          title={getSourceLabel()}
        />
      )}
      
      {/* Invisible bag indicator */}
      {item.isInInvisibleBag && !item.isLocked && (
        <div 
          className="absolute bottom-0.5 left-0.5 w-3.5 h-3.5 bg-purple-600/90 rounded-sm flex items-center justify-center"
          title={t('lock_invisible_bag')}
        >
          <span className="text-[7px]">👁</span>
        </div>
      )}
      
      {/* Lock toggle button - appears on hover */}
      {showLockToggle && item.lockReason !== 'invisible_bag' && (
        <button 
          onClick={handleLockToggle}
          className="absolute -bottom-1 -right-1 w-5 h-5 bg-gw2-dark hover:bg-gw2-darker rounded-full flex items-center justify-center text-[10px] border border-gray-600 z-20 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          title={item.isLocked ? t('lock_unlock') : t('lock_item')}
        >
          {item.isLocked ? '🔓' : '🔒'}
        </button>
      )}
      
      {/* Tooltip - rendered via portal to body */}
      {showTooltip && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{ 
            left: tooltipStyle.left, 
            top: tooltipStyle.top,
            width: '260px'
          }}
        >
          <div className="bg-gw2-darker/98 backdrop-blur-md border border-gray-600 rounded-lg p-3 shadow-2xl">
            {/* Item name */}
            <h4 className="font-bold text-sm leading-tight mb-1" style={{ color: rarityColor }}>
              {item.name}
            </h4>
            
            {/* Type and level */}
            <div className="text-xs text-gray-400 mb-2 flex items-center gap-2">
              <span>{item.type}</span>
              {item.level > 0 && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>Level {item.level}</span>
                </>
              )}
            </div>
            
            {/* Description */}
            {item.description && (
              <p className="text-xs text-gray-300 mb-2 leading-relaxed line-clamp-3">
                {item.description}
              </p>
            )}
            
            {/* Stats section */}
            <div className="space-y-1 text-xs">
              {/* Count */}
              {item.count > 1 && (
                <div className="flex justify-between text-gray-400">
                  <span>{t('sort_count')}:</span>
                  <span className="text-white">{item.count.toLocaleString()}</span>
                </div>
              )}
              
              {/* Rarity */}
              <div className="flex justify-between text-gray-400">
                <span>{language === 'tr' ? 'Nadirlik' : 'Rarity'}:</span>
                <span style={{ color: rarityColor }}>{item.rarity}</span>
              </div>
              
              {/* Binding */}
              {item.binding && (
                <div className="text-yellow-500 text-xs mt-1">
                  {getBindingLabel()}
                </div>
              )}
            </div>
            
            {/* Lock status */}
            {item.isLocked && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="text-xs text-yellow-400 flex items-center gap-1">
                  <span>🔒</span>
                  <span>
                    {item.lockReason === 'invisible_bag' 
                      ? t('lock_auto_locked')
                      : t('lock_locked')
                    }
                  </span>
                </div>
              </div>
            )}
            
            {/* Footer - Source and Value */}
            <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: sourceColors[item.source] }}
                />
                <span>{getSourceLabel()}</span>
                {item.sourceName && (
                  <>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-400">{item.sourceName}</span>
                  </>
                )}
              </div>
              
              {item.vendorValue > 0 && (
                <div className="text-xs text-gray-500">
                  {language === 'tr' ? 'Satış' : 'Vendor'}: {formatGoldValue(item.vendorValue * (item.count || 1))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default memo(ItemCard);
