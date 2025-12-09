// Internationalization (i18n) System
import { createContext, useContext, useState, useEffect } from 'react';

// Translations
const translations = {
  tr: {
    // App
    app_name: 'GW2 Envanter Yöneticisi',
    loading: 'Yükleniyor...',
    error: 'Hata',
    save: 'Kaydet',
    cancel: 'İptal',
    confirm: 'Onayla',
    close: 'Kapat',
    search: 'Ara...',
    all: 'Tümü',
    none: 'Hiçbiri',
    
    // Navigation
    nav_inventory: 'Envanter',
    nav_optimization: 'Optimizasyon',
    nav_recommendations: 'Öneriler',
    
    // API Key Screen
    api_title: 'GW2 API Anahtarı',
    api_description: 'Guild Wars 2 hesabınıza bağlanmak için API anahtarınızı girin.',
    api_placeholder: 'API anahtarınızı yapıştırın...',
    api_connect: 'Bağlan',
    api_help: 'API anahtarı oluşturmak için',
    api_help_link: 'tıklayın',
    api_permissions: 'Gerekli izinler: account, inventories, characters',
    api_invalid: 'Geçersiz API anahtarı',
    api_missing_permissions: 'Eksik izinler',
    
    // Dashboard
    dashboard_title: 'Envanter Özeti',
    dashboard_total_items: 'Toplam Item',
    dashboard_unique_items: 'Farklı Item',
    dashboard_characters: 'Karakter',
    dashboard_reload: 'Yeniden Yükle',
    dashboard_logout: 'Çıkış',
    
    // Categories
    cat_all: 'Tümü',
    cat_equipment: 'Ekipman',
    cat_weapons: 'Silahlar',
    cat_armor: 'Zırh',
    cat_trinkets: 'Takılar',
    cat_back: 'Sırt',
    cat_consumables: 'Tüketilebilir',
    cat_food: 'Yiyecek',
    cat_utility: 'Utility',
    cat_crafting: 'Craft Malzemeleri',
    cat_upgrades: 'Yükseltmeler',
    cat_runes: 'Rune',
    cat_sigils: 'Sigil',
    cat_containers: 'Konteynerler',
    cat_bags: 'Çantalar',
    cat_boxes: 'Kutular',
    cat_collectibles: 'Koleksiyonlar',
    cat_minis: 'Miniler',
    cat_gizmos: 'Gizmolar',
    cat_tools: 'Araçlar',
    cat_trophies: 'Ganimetler',
    cat_other: 'Diğer',
    
    // Sources
    source_character: 'Karakter',
    source_bank: 'Banka',
    source_materials: 'Material Storage',
    source_shared: 'Shared Inventory',
    
    // Rarities
    rarity_junk: 'Çöp',
    rarity_basic: 'Temel',
    rarity_fine: 'İyi',
    rarity_masterwork: 'Usta',
    rarity_rare: 'Nadir',
    rarity_exotic: 'Egzotik',
    rarity_ascended: 'Ascended',
    rarity_legendary: 'Efsanevi',
    
    // Optimization Panel
    opt_title: 'Envanter Optimizasyonu',
    opt_run: 'Optimizasyonu Çalıştır',
    opt_reset: 'Sıfırla',
    opt_total_stacks: 'Toplam Stack',
    opt_to_material_storage: "Material Storage'a",
    opt_to_characters: 'Karakterlere',
    opt_total_slots: 'Toplam Slot',
    opt_efficiency: 'Verimlilik',
    opt_distribution_results: 'Dağıtım Sonuçları',
    opt_expand_all: 'Tümünü Aç',
    opt_collapse_all: 'Tümünü Kapat',
    opt_view_transfer_plan: 'Transfer Planını Görüntüle',
    opt_step_by_step: 'Adım adım hangi itemin nereye gideceğini göster',
    opt_unassigned: 'Yerleştirilemeyen',
    opt_increase_slots: 'Slot sayısını artırın.',
    
    // Material Storage
    ms_title: 'Material Storage Ayarları',
    ms_stack_limit: 'Stack Limiti (Her İtem İçin)',
    ms_stack_limit_desc: 'Her item türünden max kaç adet depolanabilir. Material Storage Expander satın alarak artırılır.',
    ms_used_slots: 'Kullanılan Slot',
    ms_eligible: 'Gönderilebilecek',
    ms_determined_by_gw2: 'Material Storage\'a hangi itemlerin gidebileceği GW2 tarafından belirlenir.',
    ms_send_to: "Material Storage'a Gönderilecek",
    ms_stacks: 'stack',
    ms_items: 'adet',
    ms_status: 'Durum',
    ms_new_types: 'Yeni tür',
    ms_adding_to_existing: 'Mevcut\'a eklenen',
    ms_stack_limit_full: 'Stack limiti dolu',
    ms_cannot_fit: 'karakterde kalacak',
    ms_deposit_tip: 'Oyunda: Sağ tık → "Deposit Material" veya çanta → "Deposit All Materials"',
    ms_to_existing_slot: 'Mevcut slot\'a',
    ms_new_slot: 'Yeni slot',
    ms_per_item_limits: 'Item Başına Limit',
    
    // Character Slots
    char_slots_title: 'Karakter Slot Ayarları',
    char_add: 'Karakter Ekle',
    char_remove: 'Kaldır',
    char_slots: 'slot',
    char_auto_suggestion: 'Otomatik Öneri',
    
    // Transfer Plan
    transfer_title: 'Transfer Planı',
    transfer_from: 'Kaynak',
    transfer_to: 'Hedef',
    transfer_items: 'Itemler',
    transfer_step: 'Adım',
    transfer_completed: 'Tamamlandı',
    transfer_pending: 'Bekliyor',
    transfer_progress: 'İlerleme',
    transfer_bank_tip: 'Banka ile: Kaynak karakter → Bankaya koy → Hedef karakter → Bankadan al',
    transfer_mail_tip: 'Mail ile: Kaynak karakter → Mail gönder → Hedef karakter → Mailden al',
    
    // Item Locking
    lock_title: 'Kilitli Itemler',
    lock_item: 'Kilitle',
    lock_unlock: 'Kilidi Aç',
    lock_locked: 'Kilitli',
    lock_description: 'Kilitli itemler optimizasyona dahil edilmez ve karakterde kalır.',
    lock_invisible_bag: 'Invisible Bag',
    lock_auto_locked: 'Otomatik kilitlendi (Invisible Bag)',
    
    // Recommendations
    rec_title: 'Öneriler',
    rec_sell: 'Sat',
    rec_destroy: 'Yok Et',
    rec_use: 'Kullan',
    rec_salvage: 'Salvage Et',
    rec_extract: 'Çıkar',
    rec_keep: 'Tut',
    rec_unlock: 'Aç',
    rec_stack: 'Birleştir',
    rec_junk: 'Çöp - NPC\'ye sat',
    rec_trophy: 'Ganimet - NPC\'ye sat',
    rec_already_unlocked: 'Zaten açık - yok edebilirsin',
    rec_can_unlock: 'Kullanarak açabilirsin',
    rec_can_sell_tp: 'TP\'de satabilirsin',
    rec_killproof: 'Killproof için sakla - açma!',
    rec_extract_worth: 'Çıkarmaya değer',
    rec_extract_not_worth: 'Çıkarmaya değmez',
    rec_legendary_salvage: 'Legendary var, salvage edebilirsin',
    
    // Filters
    filter_title: 'Filtreler',
    filter_category: 'Kategori',
    filter_rarity: 'Nadirlik',
    filter_source: 'Kaynak',
    filter_character: 'Karakter',
    filter_clear: 'Filtreleri Temizle',
    
    // Sorting
    sort_title: 'Sıralama',
    sort_rarity: 'Nadirlik',
    sort_name: 'İsim',
    sort_level: 'Seviye',
    sort_count: 'Miktar',
    sort_type: 'Tip',
    sort_value: 'Değer',
    sort_asc: 'Artan',
    sort_desc: 'Azalan',
    
    // Language
    lang_title: 'Dil',
    lang_turkish: 'Türkçe',
    lang_english: 'English',
  },
  
  en: {
    // App
    app_name: 'GW2 Inventory Manager',
    loading: 'Loading...',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    search: 'Search...',
    all: 'All',
    none: 'None',
    
    // Navigation
    nav_inventory: 'Inventory',
    nav_optimization: 'Optimization',
    nav_recommendations: 'Recommendations',
    
    // API Key Screen
    api_title: 'GW2 API Key',
    api_description: 'Enter your API key to connect to your Guild Wars 2 account.',
    api_placeholder: 'Paste your API key...',
    api_connect: 'Connect',
    api_help: 'To create an API key',
    api_help_link: 'click here',
    api_permissions: 'Required permissions: account, inventories, characters',
    api_invalid: 'Invalid API key',
    api_missing_permissions: 'Missing permissions',
    
    // Dashboard
    dashboard_title: 'Inventory Summary',
    dashboard_total_items: 'Total Items',
    dashboard_unique_items: 'Unique Items',
    dashboard_characters: 'Characters',
    dashboard_reload: 'Reload',
    dashboard_logout: 'Logout',
    
    // Categories
    cat_all: 'All',
    cat_equipment: 'Equipment',
    cat_weapons: 'Weapons',
    cat_armor: 'Armor',
    cat_trinkets: 'Trinkets',
    cat_back: 'Back',
    cat_consumables: 'Consumables',
    cat_food: 'Food',
    cat_utility: 'Utility',
    cat_crafting: 'Crafting Materials',
    cat_upgrades: 'Upgrades',
    cat_runes: 'Runes',
    cat_sigils: 'Sigils',
    cat_containers: 'Containers',
    cat_bags: 'Bags',
    cat_boxes: 'Boxes',
    cat_collectibles: 'Collectibles',
    cat_minis: 'Minis',
    cat_gizmos: 'Gizmos',
    cat_tools: 'Tools',
    cat_trophies: 'Trophies',
    cat_other: 'Other',
    
    // Sources
    source_character: 'Character',
    source_bank: 'Bank',
    source_materials: 'Material Storage',
    source_shared: 'Shared Inventory',
    
    // Rarities
    rarity_junk: 'Junk',
    rarity_basic: 'Basic',
    rarity_fine: 'Fine',
    rarity_masterwork: 'Masterwork',
    rarity_rare: 'Rare',
    rarity_exotic: 'Exotic',
    rarity_ascended: 'Ascended',
    rarity_legendary: 'Legendary',
    
    // Optimization Panel
    opt_title: 'Inventory Optimization',
    opt_run: 'Run Optimization',
    opt_reset: 'Reset',
    opt_total_stacks: 'Total Stacks',
    opt_to_material_storage: 'To Material Storage',
    opt_to_characters: 'To Characters',
    opt_total_slots: 'Total Slots',
    opt_efficiency: 'Efficiency',
    opt_distribution_results: 'Distribution Results',
    opt_expand_all: 'Expand All',
    opt_collapse_all: 'Collapse All',
    opt_view_transfer_plan: 'View Transfer Plan',
    opt_step_by_step: 'Show step by step where each item goes',
    opt_unassigned: 'Unassigned',
    opt_increase_slots: 'Increase slot count.',
    
    // Material Storage
    ms_title: 'Material Storage Settings',
    ms_stack_limit: 'Stack Limit (Per Item)',
    ms_stack_limit_desc: 'Max amount per item type. Increase by purchasing Material Storage Expander.',
    ms_used_slots: 'Used Slots',
    ms_eligible: 'Eligible',
    ms_determined_by_gw2: 'Which items can go to Material Storage is determined by GW2.',
    ms_send_to: 'Send to Material Storage',
    ms_stacks: 'stacks',
    ms_items: 'items',
    ms_status: 'Status',
    ms_new_types: 'New types',
    ms_adding_to_existing: 'Adding to existing',
    ms_stack_limit_full: 'Stack limit full',
    ms_cannot_fit: 'will stay on character',
    ms_deposit_tip: 'In-game: Right-click → "Deposit Material" or bag → "Deposit All Materials"',
    ms_to_existing_slot: 'To existing slot',
    ms_new_slot: 'New slot',
    ms_per_item_limits: 'Per-Item Limits',
    
    // Character Slots
    char_slots_title: 'Character Slot Settings',
    char_add: 'Add Character',
    char_remove: 'Remove',
    char_slots: 'slots',
    char_auto_suggestion: 'Auto Suggestion',
    
    // Transfer Plan
    transfer_title: 'Transfer Plan',
    transfer_from: 'From',
    transfer_to: 'To',
    transfer_items: 'Items',
    transfer_step: 'Step',
    transfer_completed: 'Completed',
    transfer_pending: 'Pending',
    transfer_progress: 'Progress',
    transfer_bank_tip: 'Via Bank: Source character → Put in bank → Target character → Take from bank',
    transfer_mail_tip: 'Via Mail: Source character → Send mail → Target character → Receive mail',
    
    // Item Locking
    lock_title: 'Locked Items',
    lock_item: 'Lock',
    lock_unlock: 'Unlock',
    lock_locked: 'Locked',
    lock_description: 'Locked items are excluded from optimization and stay on character.',
    lock_invisible_bag: 'Invisible Bag',
    lock_auto_locked: 'Auto-locked (Invisible Bag)',
    
    // Recommendations
    rec_title: 'Recommendations',
    rec_sell: 'Sell',
    rec_destroy: 'Destroy',
    rec_use: 'Use',
    rec_salvage: 'Salvage',
    rec_extract: 'Extract',
    rec_keep: 'Keep',
    rec_unlock: 'Unlock',
    rec_stack: 'Stack',
    rec_junk: 'Junk - sell to NPC',
    rec_trophy: 'Trophy - sell to NPC',
    rec_already_unlocked: 'Already unlocked - can destroy',
    rec_can_unlock: 'Use to unlock',
    rec_can_sell_tp: 'Can sell on TP',
    rec_killproof: 'Keep for killproof - don\'t open!',
    rec_extract_worth: 'Worth extracting',
    rec_extract_not_worth: 'Not worth extracting',
    rec_legendary_salvage: 'Have legendary, can salvage',
    
    // Filters
    filter_title: 'Filters',
    filter_category: 'Category',
    filter_rarity: 'Rarity',
    filter_source: 'Source',
    filter_character: 'Character',
    filter_clear: 'Clear Filters',
    
    // Sorting
    sort_title: 'Sorting',
    sort_rarity: 'Rarity',
    sort_name: 'Name',
    sort_level: 'Level',
    sort_count: 'Count',
    sort_type: 'Type',
    sort_value: 'Value',
    sort_asc: 'Ascending',
    sort_desc: 'Descending',
    
    // Language
    lang_title: 'Language',
    lang_turkish: 'Türkçe',
    lang_english: 'English',
  }
};

// Context
const I18nContext = createContext(null);

// Provider Component
export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('gw2_language');
    if (saved && translations[saved]) return saved;
    
    // Then check browser language
    const browserLang = navigator.language?.split('-')[0];
    if (browserLang === 'tr') return 'tr';
    
    // Default to English
    return 'en';
  });
  
  useEffect(() => {
    localStorage.setItem('gw2_language', language);
  }, [language]);
  
  const t = (key, params = {}) => {
    let text = translations[language]?.[key] || translations['en']?.[key] || key;
    
    // Replace parameters like {name} with actual values
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
    });
    
    return text;
  };
  
  const value = {
    language,
    setLanguage,
    t,
    languages: [
      { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
      { code: 'en', name: 'English', flag: '🇬🇧' }
    ]
  };
  
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

// Export translations for external use
export { translations };
