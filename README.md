# GW2 Inventory Manager

Guild Wars 2 envanter yönetim ve optimizasyon aracı.

## 🚀 Kurulum

```bash
npm install
npm run dev
# http://localhost:5173
```

## 🌐 Deploy (Vercel)

### Yol 1: Vercel CLI (GitHub'sız)
```bash
npm i -g vercel
cd gw2-inventory-manager
vercel
```

### Yol 2: GitHub + Vercel
1. GitHub'a push et:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/gw2-inventory-manager.git
git push -u origin main
```
2. [vercel.com](https://vercel.com) → "Add New Project"
3. GitHub repo'nu seç → Deploy!

### Yol 3: Netlify
```bash
npm run build
# dist/ klasörünü netlify.com'a sürükle-bırak
```

## 🔑 API Key

https://account.arena.net/applications → `account`, `inventories`, `characters`

---

## ✨ Yeni Özellikler

### 🗄️ Material Storage Limit Desteği

Material Storage'ın slot limiti artık dikkate alınıyor:
- **Varsayılan limit**: 250 slot
- **Maximum**: 2000 slot (Material Storage Expander ile)
- **Limit ayarı**: Optimizasyon panelinde ayarlanabilir

```
╔════════════════════════════════════════╗
║  🗄️ Material Storage Limiti           ║
╠════════════════════════════════════════╣
║  [  500  ] slot                        ║
║                                        ║
║  [250] [500] [750] [1000] [1500] [2000]║
║                                        ║
║  ████████████░░░░░░░░  Kullanılan: 180 ║
║                        Boş: 320        ║
╚════════════════════════════════════════╝
```

### 📊 Akıllı Material Storage Dağıtımı

Algoritma şu mantıkla çalışır:

1. **Mevcut stack'e eklenecekler** → Yeni slot kullanmaz, önce bunlar gider
2. **Yeni slot gerektirenler** → Boş slot varsa gider, yoksa karakterlere dağıtılır
3. **Sığmayanlar** → Otomatik olarak karakterlere dahil edilir

```
Örnek:
├── Material Storage Limiti: 500
├── Kullanılan Slot: 400
├── Boş Slot: 100
│
├── Karakter 1'deki Iron Ore → Zaten var, stack'e eklenir (slot kullanmaz)
├── Karakter 2'deki Gold Ore → Yeni, 1 slot kullanır (99 boş kalır)
├── Banka'daki Platinum Ore → Yeni, 1 slot kullanır (98 boş kalır)
│
└── 120 farklı yeni materyal varsa:
    ├── İlk 98'i → Material Storage'a
    └── Kalan 22'si → Karakterlere dağıtılır
```

### 📋 Geliştirilmiş Transfer Planı

```
📋 TRANSFER PLANI
═══════════════════════════════════════════

🗄️ MATERIAL STORAGE'A GÖNDER
───────────────────────────────────────────
✓ Karakter1 → Material Storage
  ├── Iron Ore (x250) [mevcut stack'e]
  ├── Mithril Ore (x180) [mevcut stack'e]
  └── Gold Ore (x95) [yeni slot]

☐ Karakter2 → Material Storage  
  └── Gossamer Scrap (x42) [yeni slot]

👤 KARAKTER TRANSFERLERİ
───────────────────────────────────────────
📍 Karakter1'den:
  ☐ Karakter1 → Karakter2
     ├── Superior Rune of Scholar
     └── Glob of Ectoplasm (x15)
          
  ☐ Karakter1 → Karakter3
     └── Exotic Sword

📍 Banka'dan:
  ☐ Banka → Karakter2
     └── Mini Llama

═══════════════════════════════════════════
İlerleme: [████████░░░░░░] 2/4 adım
```

---

## 🎯 Optimizasyon Algoritması

### Best-Fit Decreasing + Material Storage Limit

```
1. Material Storage limit kontrolü
   ├── Mevcut slot kullanımı API'den alınır
   ├── Kullanıcının belirlediği limit okunur
   └── Boş slot = limit - kullanılan

2. Material Storage'a gidecekler seçilir
   ├── Önce: Mevcut stack'lere eklenecekler (slot kullanmaz)
   ├── Sonra: Yeni slot gerektirenler (boş slot dahilinde)
   └── Sığmayanlar: Karakter listesine eklenir

3. Karakterlere dağıtım
   ├── Kategoriler büyükten küçüğe sıralanır
   ├── Her kategori için Best-Fit ile karakter seçilir
   └── Tamamı sığarsa en küçük uygun çanta seçilir

4. Transfer planı oluşturulur
   ├── Kaynak bazlı gruplandırma
   ├── Adım adım talimatlar
   └── İlerleme takibi
```

---

## 📁 Proje Yapısı

```
src/
├── components/
│   ├── OptimizationPanel.jsx   ← Limit kontrolü, optimizasyon
│   ├── TransferPlanView.jsx    ← Adım adım plan
│   └── ...
├── services/
│   └── gw2Api.js               ← Material Storage kullanım takibi
├── context/
│   └── InventoryContext.jsx    ← materialStorageUsedSlots
└── utils/
    └── optimization.js         ← selectItemsForMaterialStorage
```

---

## 🎮 Oyun İçi Uygulama

### Material Storage'a Gönderme
```
1. Karaktere giriş yap
2. Sağ tık → "Deposit Material"
   VEYA
   Çanta simgesi → "Deposit All Materials"
```

### Karakter Transferi
```
Banka ile:
1. Kaynak karakter → Bankaya koy
2. Hedef karakter → Bankadan al

Mail ile:
1. Kaynak karakter → Mail gönder
2. Hedef karakter → Mailden al
```

---

## 💾 Veri Saklama

- **Material Storage Limiti**: localStorage'da saklanır
- **API Key**: localStorage'da saklanır
- **Item Cache**: localStorage'da saklanır (24 saat)
