import { useState, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { RARITY_COLORS, SOURCE_LABELS, formatGoldValue } from '../utils/categories';

function ItemCard({ item, isDraggable = true, showSource = true, size = 'normal' }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${item.id}-${item.source}-${item.slotIndex || 0}`,
    data: item,
    disabled: !isDraggable
  });
  
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.Basic;
  
  const sizeClasses = { small: 'w-10 h-10', normal: 'w-12 h-12', large: 'w-16 h-16' };
  
  const handleMouseMove = (e) => setTooltipPos({ x: e.clientX + 10, y: e.clientY + 10 });
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
      className={`item-card ${sizeClasses[size]} ${isDragging ? 'opacity-50 z-50' : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ border: `2px solid ${rarityColor}` }} />
      
      {item.icon ? (
        <img src={item.icon} alt={item.name} className="w-full h-full object-cover rounded" loading="lazy" draggable={false} />
      ) : (
        <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">?</div>
      )}
      
      {item.count > 1 && <span className="item-count">{item.count > 999 ? '999+' : item.count}</span>}
      
      {showSource && (
        <div 
          className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full"
          style={{
            backgroundColor: item.source === 'character' ? '#4CAF50' : item.source === 'bank' ? '#2196F3' : item.source === 'materials' ? '#FF9800' : '#9C27B0'
          }}
        />
      )}
      
      {showTooltip && (
        <div className="fixed z-[100] pointer-events-none" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <div className="bg-gw2-darker/95 backdrop-blur border border-gray-600 rounded-lg p-3 shadow-xl max-w-xs">
            <h4 className="font-semibold mb-1" style={{ color: rarityColor }}>{item.name}</h4>
            <div className="text-xs text-gray-400 mb-2">{item.type}{item.level > 0 && ` • Level ${item.level}`}</div>
            {item.description && <p className="text-xs text-gray-300 mb-2">{item.description}</p>}
            {item.count > 1 && <div className="text-xs text-gray-400">Miktar: {item.count.toLocaleString()}</div>}
            {item.binding && <div className="text-xs text-yellow-500">{item.binding === 'Character' ? `${item.boundTo}'a bağlı` : 'Hesaba bağlı'}</div>}
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
              {SOURCE_LABELS[item.source]}{item.sourceName && ` • ${item.sourceName}`}
            </div>
            {item.vendorValue > 0 && <div className="text-xs text-gray-500">Değer: {formatGoldValue(item.vendorValue * (item.count || 1))}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ItemCard);
