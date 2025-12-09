# GW2 Inventory Manager V2.3

Guild Wars 2 envanter yönetim, optimizasyon ve öneri aracı.

## ✨ Özellikler

### 🌍 Çoklu Dil Desteği
- 🇹🇷 Türkçe
- 🇬🇧 English

### 💡 Akıllı Öneriler
- **Wardrobe Tracking**: Açılmamış skin/dye/mini tespiti
- **Killproof Koruması**: LI, LD, UCE ve raid coffer'lar için uyarı
- **TP Fiyat Analizi**: Satılabilir itemlerin değeri
- **Stack Birleştirme**: Eksik stack'ların tespiti
- **Junk/Trophy**: NPC'ye satılabilir itemler

### 🔒 Item Kilitleme
- Invisible Bag otomatik kilitleme
- Manuel kilit/kilit açma
- Toplu kilitleme (filtrelenenleri kilitle/aç)
- Kilitli itemler optimizasyondan hariç

### 🗄️ Material Storage
- 250-2750 arası stack limit
- Fill limit (kısmi doldurma)
- Item başına özel limit
- Mevcut kullanım takibi

### 📊 Quick Stats Dashboard
- Toplam/benzersiz item sayısı
- Vendor değeri
- Rarity breakdown
- Quick action badges

### 🎨 Görsel İyileştirmeler
- Responsive grid görünümü (3 boyut seçeneği)
- Gruplu görünüm (kategori, nadirlik, kaynak, karakter)
- Geliştirilmiş tooltip'ler
- Daha temiz ve modern arayüz

## 🚀 Kurulum

```bash
npm install
npm run dev
# http://localhost:5173
```

## 🔑 API Key

https://account.arena.net/applications adresinden API key oluşturun.

### Gerekli İzinler
- `account` - Hesap bilgileri
- `inventories` - Envanter erişimi
- `characters` - Karakter erişimi

### Önerilen İzinler (Tam Özellik İçin)
- `unlocks` - Wardrobe/skin tespiti
- `wallet` - UFE takibi
- `tradingpost` - TP fiyatları

## 🌐 Deploy

### Vercel (Önerilen)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
# dist/ klasörünü netlify.com'a sürükle-bırak
```

### GitHub Pages
```bash
npm run build
npx gh-pages -d dist
```

## 📁 Proje Yapısı

```
src/
├── components/
│   ├── Dashboard.jsx              # Ana dashboard
│   ├── QuickStats.jsx             # Hızlı istatistikler
│   ├── RecommendationsPanel.jsx   # Öneri paneli
│   ├── OptimizationPanel.jsx      # Optimizasyon
│   ├── MaterialItemLimitsEditor.jsx # Item başına limit
│   ├── FilterSidebar.jsx          # Filtreler + bulk lock
│   ├── ItemPool.jsx               # Item listesi
│   └── ItemCard.jsx               # Item kartı
├── context/
│   ├── InventoryContext.jsx       # State yönetimi
│   └── I18nContext.jsx            # Dil desteği
├── services/
│   ├── gw2Api.js                  # GW2 API
│   └── recommendations.js         # Öneri algoritması
└── utils/
    ├── categories.js              # Kategori sistemi
    └── optimization.js            # Dağıtım algoritması
```

## 🎮 Kullanım

### 1. API Key Girin
İlk açılışta API key'inizi girin.

### 2. Envanter Yüklenecek
Tüm karakterler, banka, material storage ve shared inventory otomatik yüklenir.

### 3. Önerileri İnceleyin
💡 Recommendations panelinde:
- ⚠️ Uyarılar (killproof, değerli itemler)
- 🔓 Açılacak skinler
- 💰 TP'de satılabilir
- 🪙 NPC'ye satılabilir
- 📦 Birleştirilebilir stackler

### 4. Optimizasyon Çalıştırın
🎯 Optimization panelinde:
- Material Storage ayarlarını yapın
- Karakter slot'larını ayarlayın
- "Çalıştır" butonuna tıklayın
- Transfer planını takip edin

## 💾 localStorage Verileri

```javascript
gw2_api_key              // API key
gw2_items_cache          // Item cache
gw2_materials_categories // Kategori cache
gw2_material_stack_limit // Stack limit (250-2750)
gw2_material_fill_limit  // Fill limit
gw2_material_item_limits // Item başına limitler
gw2_locked_items         // Kilitli itemler
gw2_language             // Dil tercihi (tr/en)
```

## 🔗 Faydalı Linkler

- [GW2 API Docs](https://wiki.guildwars2.com/wiki/API:Main)
- [gw2stacks](https://gw.zweistein.cz/gw2stacks/) - İlham kaynağı
- [killproof.me](https://killproof.me/) - Killproof takibi

## 📝 Sürüm Notları

### V2.3 (Current)
- ✅ Çanta Planlama kaldırıldı (optimizasyon yeterli)
- ✅ Drag-drop bağımlılıkları kaldırıldı (daha küçük bundle)
- ✅ Geliştirilmiş grid görünümü (3 boyut seçeneği)
- ✅ Daha iyi tooltip'ler ve hover efektleri
- ✅ Temizlenmiş kod ve bağımlılıklar
- ✅ Geliştirilmiş API Key ekranı

### V2.2
- ✅ Quick Stats Dashboard
- ✅ Bulk Lock/Unlock (filtrelenenleri kilitle)
- ✅ Per-Item Material Limits UI

### V2.1
- ✅ Recommendations Panel
- ✅ Wardrobe Tracking
- ✅ Killproof Protection
- ✅ TP Price Integration

### V2.0
- ✅ Turkish/English i18n
- ✅ Item Locking System
- ✅ Invisible Bag Detection
- ✅ Fill Limit System
- ✅ Material Storage 2750 max

### V1.0
- ✅ Inventory Loading
- ✅ Category Filtering
- ✅ Optimization Algorithm
- ✅ Transfer Plan
