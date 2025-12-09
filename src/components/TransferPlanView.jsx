import { useState } from 'react';
import { RARITY_COLORS } from '../utils/categories';

// Single transfer step component
function TransferStep({ step, stepNumber, isCompleted, onToggleComplete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getSourceIcon = (sourceType) => {
    switch (sourceType) {
      case 'character': return '👤';
      case 'bank': return '🏦';
      case 'shared': return '📦';
      default: return '📍';
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      isCompleted 
        ? 'border-green-500/50 bg-green-500/10' 
        : 'border-gray-700 bg-gw2-darker/50'
    }`}>
      <div 
        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-gw2-dark/30"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isCompleted 
              ? 'border-green-500 bg-green-500 text-white' 
              : 'border-gray-500 hover:border-gw2-accent'
          }`}
        >
          {isCompleted && '✓'}
        </button>
        
        {/* Step number */}
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-gw2-accent/20 text-gw2-accent'
        }`}>
          {stepNumber}
        </span>
        
        {/* Transfer info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">{getSourceIcon(step.fromType)}</span>
            <span className={`font-medium ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>
              {step.from}
            </span>
            <span className="text-gw2-accent">→</span>
            <span className="text-lg">{step.type === 'to_material_storage' ? '🗄️' : '👤'}</span>
            <span className={`font-medium ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>
              {step.type === 'to_material_storage' ? 'Material Storage' : step.to}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {step.itemCount} item transfer edilecek
          </div>
        </div>
        
        {/* Expand icon */}
        <span className={`transform transition-transform text-gray-500 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
      
      {/* Expanded item list */}
      {isExpanded && (
        <div className="p-3 border-t border-gray-700 bg-gw2-dark/30">
          <div className="text-xs text-gray-400 mb-2">Transfer edilecek itemler:</div>
          <div className="flex flex-wrap gap-2">
            {step.items.map((item, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 px-2 py-1 bg-gw2-darker rounded border"
                style={{ borderColor: RARITY_COLORS[item.rarity] || '#666' }}
              >
                {item.icon && (
                  <img src={item.icon} alt="" className="w-5 h-5 rounded" />
                )}
                <span className="text-sm text-white">{item.name}</span>
                {item.count > 1 && (
                  <span className="text-xs text-gray-400">x{item.count}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Source group component
function SourceGroup({ group, startIndex, completedSteps, onToggleStep }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const allCompleted = group.transfers.every((_, i) => completedSteps.has(startIndex + i));
  
  const getSourceIcon = (sourceType) => {
    switch (sourceType) {
      case 'character': return '👤';
      case 'bank': return '🏦';
      case 'shared': return '📦';
      default: return '📍';
    }
  };

  return (
    <div className="bg-gw2-darker/30 rounded-xl p-4 border border-gray-700">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getSourceIcon(group.sourceType)}</span>
          <div>
            <h4 className={`font-semibold ${allCompleted ? 'text-green-400' : 'text-white'}`}>
              {group.source}
            </h4>
            <p className="text-xs text-gray-500">
              {group.transfers.length} transfer işlemi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allCompleted && (
            <span className="text-green-400 text-sm">✓ Tamamlandı</span>
          )}
          <span className={`transform transition-transform text-gray-500 ${isCollapsed ? '' : 'rotate-180'}`}>
            ▼
          </span>
        </div>
      </button>
      
      {!isCollapsed && (
        <div className="space-y-2">
          {group.transfers.map((transfer, idx) => (
            <TransferStep
              key={idx}
              step={transfer}
              stepNumber={startIndex + idx + 1}
              isCompleted={completedSteps.has(startIndex + idx)}
              onToggleComplete={() => onToggleStep(startIndex + idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TransferPlanView({ report, onClose }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'materials', 'characters'
  
  if (!report || !report.transferPlan) {
    return null;
  }
  
  const { transferPlan, materialStorage } = report;
  
  const toggleStep = (index) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  
  const markAllComplete = () => {
    const allIndices = new Set();
    let idx = 0;
    transferPlan.materialStorageSteps.forEach(() => { allIndices.add(idx++); });
    transferPlan.groupedBySource.forEach(g => {
      g.transfers.forEach(() => { allIndices.add(idx++); });
    });
    setCompletedSteps(allIndices);
  };
  
  const resetProgress = () => {
    setCompletedSteps(new Set());
  };
  
  // Calculate progress
  let totalSteps = transferPlan.materialStorageSteps.length;
  transferPlan.groupedBySource.forEach(g => { totalSteps += g.transfers.length; });
  const completedCount = completedSteps.size;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  
  // Calculate step indices for material storage and character transfers
  let currentIndex = 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gw2-dark rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📋 Transfer Planı
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Adım adım envanter düzenleme talimatları
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 hover:bg-gw2-darker rounded-lg"
          >
            ✕
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="px-4 py-3 bg-gw2-darker/50 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">İlerleme</span>
            <span className="text-sm font-medium text-white">{completedCount}/{totalSteps} adım</span>
          </div>
          <div className="h-3 bg-gw2-dark rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-gw2-accent to-green-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={resetProgress} className="text-xs text-gray-400 hover:text-white">
              Sıfırla
            </button>
            <span className="text-gray-600">|</span>
            <button onClick={markAllComplete} className="text-xs text-gw2-accent hover:underline">
              Tümünü Tamamla
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-4 py-2 border-b border-gray-700 flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all' ? 'bg-gw2-accent text-gw2-darker' : 'text-gray-400 hover:text-white'
            }`}
          >
            Tümü ({totalSteps})
          </button>
          {transferPlan.materialStorageSteps.length > 0 && (
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'materials' ? 'bg-gw2-accent text-gw2-darker' : 'text-gray-400 hover:text-white'
              }`}
            >
              🗄️ Material Storage ({transferPlan.materialStorageSteps.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'characters' ? 'bg-gw2-accent text-gw2-darker' : 'text-gray-400 hover:text-white'
            }`}
          >
            👤 Karakterler ({transferPlan.groupedBySource.length})
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary */}
          <div className="bg-gw2-accent/10 border border-gw2-accent/30 rounded-xl p-4">
            <h3 className="font-semibold text-gw2-accent mb-2">📊 Özet</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Material Storage'a</div>
                <div className="text-white font-medium">{transferPlan.summary.totalMaterialStorageTransfers} item</div>
              </div>
              <div>
                <div className="text-gray-400">Karakterler arası</div>
                <div className="text-white font-medium">{transferPlan.summary.totalCharacterTransfers} item</div>
              </div>
              <div>
                <div className="text-gray-400">Kaynak sayısı</div>
                <div className="text-white font-medium">{transferPlan.summary.sourcesInvolved} konum</div>
              </div>
            </div>
          </div>
          
          {/* Material Storage Transfers */}
          {(activeTab === 'all' || activeTab === 'materials') && transferPlan.materialStorageSteps.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🗄️</span>
                Material Storage'a Gönder
                <span className="text-sm font-normal text-gray-500">
                  (Oyunda: Envanterdeki iteme sağ tıkla → "Deposit Material")
                </span>
              </h3>
              <div className="space-y-2">
                {transferPlan.materialStorageSteps.map((step, idx) => {
                  const stepIdx = currentIndex++;
                  return (
                    <TransferStep
                      key={idx}
                      step={step}
                      stepNumber={stepIdx + 1}
                      isCompleted={completedSteps.has(stepIdx)}
                      onToggleComplete={() => toggleStep(stepIdx)}
                    />
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Reset index for character transfers if we showed material storage */}
          {activeTab === 'materials' && (currentIndex = transferPlan.materialStorageSteps.length)}
          {activeTab === 'characters' && (currentIndex = transferPlan.materialStorageSteps.length)}
          
          {/* Character Transfers - Grouped by Source */}
          {(activeTab === 'all' || activeTab === 'characters') && transferPlan.groupedBySource.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">👤</span>
                Karakter Transferleri
                <span className="text-sm font-normal text-gray-500">
                  (Oyunda: Item'ı al → Banka/Mail ile aktar)
                </span>
              </h3>
              <div className="space-y-4">
                {transferPlan.groupedBySource.map((group, idx) => {
                  const startIdx = currentIndex;
                  currentIndex += group.transfers.length;
                  return (
                    <SourceGroup
                      key={idx}
                      group={group}
                      startIndex={startIdx}
                      completedSteps={completedSteps}
                      onToggleStep={toggleStep}
                    />
                  );
                })}
              </div>
            </div>
          )}
          
          {totalSteps === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">✅</span>
              <h3 className="text-xl font-semibold text-white mb-2">Transfer Gerekmiyor!</h3>
              <p className="text-gray-400">Tüm itemler zaten doğru konumda.</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            💡 İpucu: Adımları tamamladıkça işaretleyin
          </div>
          <button onClick={onClose} className="btn-primary">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
