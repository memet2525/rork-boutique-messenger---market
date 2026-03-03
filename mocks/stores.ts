export interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  images?: string[];
  description?: string;
  features?: string[];
}

export interface Store {
  id: string;
  name: string;
  avatar: string;
  description: string;
  category: string;
  city?: string;
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  products: Product[];
}

export const stores: Store[] = [
  {
    id: "1",
    name: "Bella Moda",
    city: "Istanbul",
    avatar: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop",
    description: "Trend kadın giyim ve aksesuarlar. Sezonun en şık parçaları burada!",
    category: "Moda",
    rating: 4.8,
    reviewCount: 234,
    isOnline: true,
    products: [
      { id: "p1", name: "Yazlık Elbise", price: "₺299", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop", description: "Hafif ve rahat yazlık elbise. Günlük kullanım için ideal.", features: ["100% Pamuk", "S-M-L-XL Beden", "Makinede yıkanabilir", "Türkiye üretimi"] },
      { id: "p2", name: "Deri Çanta", price: "₺449", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop", description: "El yapımı gerçek deri çanta. Şık ve dayanıklı.", features: ["Gerçek Deri", "30x25x10 cm", "Ayarlanabilir askı", "İç cepli"] },
      { id: "p3", name: "Güneş Gözlüğü", price: "₺189", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop", description: "UV400 korumalı polarize güneş gözlüğü.", features: ["UV400 Koruma", "Polarize cam", "Metal çerçeve", "Kutu dahil"] },
      { id: "p4", name: "Şal", price: "₺129", image: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400&h=400&fit=crop", description: "Yumuşak dokulu, dört mevsim kullanılabilen şal.", features: ["Kaşmir karışım", "180x70 cm", "Çeşitli renkler", "Hediye kutusunda"] },
    ],
  },
  {
    id: "2",
    name: "Tech Corner",
    city: "Ankara",
    avatar: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200&h=200&fit=crop",
    description: "En yeni teknoloji ürünleri ve aksesuarları uygun fiyatlarla.",
    category: "Teknoloji",
    rating: 4.6,
    reviewCount: 189,
    isOnline: true,
    products: [
      { id: "p5", name: "Kablosuz Kulaklık", price: "₺599", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop", description: "Aktif gürültü engelleme özellikli premium kablosuz kulaklık.", features: ["ANC Teknolojisi", "30 saat pil ömrü", "Bluetooth 5.3", "Katlanabilir tasarım"] },
      { id: "p6", name: "Akıllı Saat", price: "₺1.299", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop", description: "Sağlık takibi ve bildirim özellikli akıllı saat.", features: ["AMOLED Ekran", "SpO2 & Nabız ölçer", "5ATM Su geçirmez", "GPS dahili"] },
      { id: "p7", name: "Telefon Kılıfı", price: "₺89", image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop", description: "Darbelere karşı korumalı şık telefon kılıfı.", features: ["MagSafe uyumlu", "Askeri standart koruma", "Şeffaf tasarım", "Kablosuz şarj uyumlu"] },
      { id: "p8", name: "Powerbank", price: "₺349", image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop", description: "20.000 mAh kapasiteli hızlı şarj destekli powerbank.", features: ["20.000 mAh", "65W hızlı şarj", "USB-C & USB-A", "LED gösterge"] },
    ],
  },
  {
    id: "3",
    name: "Doğal Lezzetler",
    city: "Trabzon",
    avatar: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=200&h=200&fit=crop",
    description: "Köyden sofraya doğal, organik gıda ürünleri.",
    category: "Gıda",
    rating: 4.9,
    reviewCount: 312,
    isOnline: false,
    products: [
      { id: "p9", name: "Organik Bal", price: "₺189", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop", description: "Kaçkar Dağları'ndan süzme organik çiçek balı.", features: ["500g", "Organik sertifikalı", "Soğuk sıkım", "Cam kavanoz"] },
      { id: "p10", name: "Zeytinyağı", price: "₺249", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop", description: "Erken hasat, soğuk sıkım natürel sızma zeytinyağı.", features: ["1 Litre", "Soğuk sıkım", "0.3 asitlik", "Ege bölgesi"] },
      { id: "p11", name: "Kurutulmuş Meyve", price: "₺79", image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&h=400&fit=crop", description: "Doğal kurutulmuş karışık meyve paketi.", features: ["250g", "Katkısız", "Şekersiz", "6 çeşit meyve"] },
      { id: "p12", name: "Baharat Seti", price: "₺149", image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", description: "El yapımı öğütülmüş baharat koleksiyonu.", features: ["8 çeşit baharat", "Taze öğütülmüş", "Cam kavanozlarda", "Tarif kartı dahil"] },
    ],
  },
  {
    id: "4",
    name: "Ev & Dekor",
    city: "Izmir",
    avatar: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop",
    description: "Evinize şıklık katacak dekorasyon ürünleri ve el yapımı objeler.",
    category: "Dekorasyon",
    rating: 4.7,
    reviewCount: 156,
    isOnline: true,
    products: [
      { id: "p13", name: "Seramik Vazo", price: "₺219", image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400&h=400&fit=crop", description: "El yapımı seramik vazo, minimalist tasarım.", features: ["El yapımı", "25 cm yükseklik", "Su geçirmez iç", "Mat beyaz"] },
      { id: "p14", name: "Yastık Kılıfı", price: "₺99", image: "https://images.unsplash.com/photo-1584100936595-c0c175c0e199?w=400&h=400&fit=crop", description: "Kadife dokulu dekoratif yastık kılıfı.", features: ["45x45 cm", "Kadife kumaş", "Gizli fermuar", "Yastık dahil değil"] },
      { id: "p15", name: "Mum Seti", price: "₺159", image: "https://images.unsplash.com/photo-1602607700009-f1bcb7e14a6e?w=400&h=400&fit=crop", description: "Soya wax aromaterapi mum seti, 3'lü paket.", features: ["3 adet", "Soya wax", "40 saat yanma", "Doğal esans"] },
      { id: "p16", name: "Duvar Tablosu", price: "₺349", image: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=400&fit=crop", description: "Kanvas baskı modern sanat duvar tablosu.", features: ["50x70 cm", "Kanvas baskı", "Ahşap çerçeve", "Askı aparatı dahil"] },
    ],
  },
  {
    id: "5",
    name: "Spor Dünyası",
    city: "Antalya",
    avatar: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop",
    description: "Spor giyim, ekipman ve supplement ürünleri.",
    category: "Spor",
    rating: 4.5,
    reviewCount: 98,
    isOnline: true,
    products: [
      { id: "p17", name: "Spor Ayakkabı", price: "₺699", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop", description: "Hafif ve esnek koşu ayakkabısı.", features: ["38-45 numara", "Nefes alan mesh", "EVA taban", "Reflektif detay"] },
      { id: "p18", name: "Yoga Matı", price: "₺199", image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop", description: "Kaymaz yüzeyli profesyonel yoga matı.", features: ["183x61 cm", "6mm kalınlık", "TPE malzeme", "Taşıma kayışı dahil"] },
      { id: "p19", name: "Su Şişesi", price: "₺129", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop", description: "Paslanmaz çelik termos su şişesi.", features: ["750ml", "Çift cidarlı", "24 saat soğuk", "BPA free"] },
      { id: "p20", name: "Spor Çanta", price: "₺299", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop", description: "Geniş hacimli su geçirmez spor çantası.", features: ["45 Litre", "Su geçirmez", "Ayakkabı bölmesi", "Ayarlanabilir askı"] },
    ],
  },
  {
    id: "6",
    name: "Butik Atölye",
    city: "Bursa",
    avatar: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop",
    description: "El yapımı takı, aksesuar ve hediyelik eşyalar. Özel tasarım butik ürünler.",
    category: "Butik",
    rating: 4.9,
    reviewCount: 178,
    isOnline: true,
    products: [
      { id: "p21", name: "El Yapımı Kolye", price: "₺259", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop", description: "925 ayar gümüş üzerine el yapımı doğal taşlı kolye.", features: ["925 Ayar Gümüş", "Doğal Taş", "El Yapımı", "Hediye Kutusunda"] },
      { id: "p22", name: "Deri Bileklik", price: "₺149", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=400&fit=crop", description: "Gerçek deri üzerine el işlemeli unisex bileklik.", features: ["Gerçek Deri", "Ayarlanabilir", "Unisex", "El İşlemeli"] },
      { id: "p23", name: "Seramik Kupa", price: "₺119", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop", description: "El boyama seramik kahve kupası. Her biri benzersiz.", features: ["350ml", "El Boyama", "Bulaşık Makinesine Uygun", "Benzersiz Tasarım"] },
      { id: "p24", name: "Ahşap Çerçeve", price: "₺189", image: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=400&fit=crop", description: "Doğal ahşaptan el yapımı fotoğraf çerçevesi.", features: ["20x30 cm", "Doğal Ahşap", "El Yapımı", "Duvara Asılabilir"] },
    ],
  },
];
