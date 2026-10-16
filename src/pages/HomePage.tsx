import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Listing, PropertyType, ListingPurpose } from '../types';
import { DalaniMap } from '../components/DalaniMap';
import { ListingCard } from '../components/ListingCard';
import { YEMEN_GOVERNORATES } from '../data/yemenData';
import {
  Search,
  SlidersHorizontal,
  Key,
  DoorOpen,
  MapPin,
  Building,
  Home,
  Layers,
  Store,
  Briefcase,
  Compass,
  X,
  RotateCcw,
  Sun,
  ShieldCheck,
  Map,
  ListFilter,
  ChevronDown,
  Check
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: string, params?: any) => void;
  onSelectListing: (listing: Listing) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onSelectListing }) => {
  const { listings, organizations } = useApp();

  // Floating Filter States (Matching Screenshot)
  const [purpose, setPurpose] = useState<ListingPurpose>('sale');
  const [propertyType, setPropertyType] = useState<PropertyType | 'all'>('all');
  const [governorate, setGovernorate] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');

  // Dropdown list state for Cities (صنعاء، إب، ذمار، عدن...)
  const [cityDropdownOpen, setCityDropdownOpen] = useState<boolean>(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Close city dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cityOptions = [
    { id: 'all', label: 'كل المدن', fullGov: 'all' },
    { id: 'sanaa', label: 'صنعاء', fullGov: 'صنعاء (أمانة العاصمة)' },
    { id: 'ibb', label: 'إب', fullGov: 'إب' },
    { id: 'dhamar', label: 'ذمار', fullGov: 'ذمار' },
    { id: 'aden', label: 'عدن', fullGov: 'عدن' },
    { id: 'taiz', label: 'تعز', fullGov: 'تعز' },
    { id: 'hadramout', label: 'حضرموت', fullGov: 'حضرموت' },
    { id: 'hodeidah', label: 'الحديدة', fullGov: 'الحديدة' },
    { id: 'marib', label: 'مأرب', fullGov: 'مأرب' },
  ];

  const handleCitySelect = (gov: string) => {
    setGovernorate(gov);
    setSelectedListing(null);
    setCityDropdownOpen(false);
  };

  // View Mode: 'map' (default clean full map) or 'list'
  const [homeViewMode, setHomeViewMode] = useState<'map' | 'list'>('map');

  // Detailed Filter Modal State
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [currency, setCurrency] = useState<'all' | 'USD' | 'YER' | 'SAR'>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [hasSolarOnly, setHasSolarOnly] = useState<boolean>(false);

  // Selected Pin Preview Card (Floating at bottom above nav bar)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showOrgCard, setShowOrgCard] = useState<boolean>(true);

  // Featured Yemeni Organization (matching screenshot layout)
  const featuredOrg = organizations[0];

  // Strictly PUBLISHED listings only (Visitor Rule)
  const publishedListings = useMemo(() => {
    return listings.filter(l => {
      if (l.status !== 'published') return false;
      if (l.purpose !== purpose) return false;
      if (propertyType !== 'all' && l.propertyType !== propertyType) return false;
      if (governorate !== 'all') {
        const g = l.location.governorate;
        const matches =
          g === governorate ||
          g.includes(governorate) ||
          governorate.includes(g) ||
          (governorate.includes('صنعاء') && g.includes('صنعاء')) ||
          (governorate.includes('إب') && (g.includes('إب') || g.includes('اب')));
        if (!matches) return false;
      }
      if (currency !== 'all' && l.currency !== currency) return false;
      if (minPrice && l.price < Number(minPrice)) return false;
      if (maxPrice && l.price > Number(maxPrice)) return false;
      if (hasSolarOnly && !l.attributes.hasSolarSystem) return false;
      if (keyword.trim()) {
        const q = keyword.toLowerCase().trim();
        const matchTitle = l.title.toLowerCase().includes(q);
        const matchCity = l.location.city.toLowerCase().includes(q);
        const matchDistrict = l.location.district.toLowerCase().includes(q);
        if (!matchTitle && !matchCity && !matchDistrict) return false;
      }
      return true;
    });
  }, [listings, purpose, propertyType, governorate, currency, minPrice, maxPrice, hasSolarOnly, keyword]);

  const categoryChips = [
    { type: 'all', label: 'الكل' },
    { type: 'apartment', label: 'شقة' },
    { type: 'villa', label: 'فيلا' },
    { type: 'land', label: 'أرض' },
    { type: 'building', label: 'عمارة' },
    { type: 'commercial', label: 'محل' },
    { type: 'office', label: 'مكتب' },
    { type: 'chalet', label: 'استراحة' }
  ];

  const handleResetFilters = () => {
    setPropertyType('all');
    setGovernorate('all');
    setCurrency('all');
    setMinPrice('');
    setMaxPrice('');
    setHasSolarOnly(false);
    setKeyword('');
    setFilterModalOpen(false);
  };

  const activeFiltersCount =
    (propertyType !== 'all' ? 1 : 0) +
    (governorate !== 'all' ? 1 : 0) +
    (currency !== 'all' ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    (hasSolarOnly ? 1 : 0) +
    (keyword ? 1 : 0);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden select-none bg-slate-100 flex flex-col">
      {/* 1. TOP FLOATING SEARCH & PURPOSE BAR (Exact arrangement from screenshot) */}
      <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-25 max-w-xl mx-auto space-y-2 pointer-events-auto">
        {/* Main Bar: [ تصفية ] + [ قائمة منسدلة للمدن: صنعاء، إب، ذمار... ] + [ للبيع 🔑 | للإيجار 🚪 ] */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-1.5 shadow-lg border border-slate-200/90 flex items-center gap-1.5">
          {/* 1. Blue Filter Button */}
          <button
            onClick={() => setFilterModalOpen(true)}
            className="px-3 sm:px-3.5 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-colors flex-shrink-0"
            title="تصفية متقدمة"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">تصفية</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#0284c7] text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* 2. City Dropdown Menu (صنعاء، إب، ذمار، عدن، تعز، حضرموت...) */}
          <div className="relative flex-1 min-w-[120px]" ref={cityDropdownRef}>
            <button
              type="button"
              onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
              className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-black flex items-center justify-between gap-1 transition-all ${
                governorate !== 'all'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/40 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-[#16324F] border-slate-200'
              }`}
              title="اختر المدينة"
            >
              <div className="flex items-center gap-1.5 truncate min-w-0">
                <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${governorate !== 'all' ? 'text-emerald-600' : 'text-[#12A889]'}`} />
                <span className="truncate">
                  {cityOptions.find(c => c.fullGov === governorate || (governorate.includes('صنعاء') && c.id === 'sanaa') || (governorate.includes('إب') && c.id === 'ibb') || (governorate.includes('ذمار') && c.id === 'dhamar'))?.label || 'كل المدن'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${cityDropdownOpen ? 'rotate-180' : ''} ${governorate !== 'all' ? 'text-emerald-700' : 'text-slate-500'}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {cityDropdownOpen && (
              <div className="absolute top-full mt-1.5 right-0 w-48 sm:w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span>المدن والمحافظات</span>
                  {governorate !== 'all' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCitySelect('all');
                      }}
                      className="text-[#12A889] hover:underline font-bold"
                    >
                      عرض الكل
                    </button>
                  )}
                </div>
                {cityOptions.map(city => {
                  const isSelected =
                    governorate === city.fullGov ||
                    (city.id === 'all' && governorate === 'all') ||
                    (city.id === 'sanaa' && governorate.includes('صنعاء')) ||
                    (city.id === 'ibb' && (governorate.includes('إب') || governorate.includes('اب'))) ||
                    (city.id === 'dhamar' && governorate.includes('ذمار'));

                  const count = listings.filter(l =>
                    l.status === 'published' &&
                    l.purpose === purpose &&
                    (city.id === 'all' || l.location.governorate.includes(city.label) || l.location.city.includes(city.label))
                  ).length;

                  return (
                    <button
                      key={city.id}
                      onClick={() => handleCitySelect(city.fullGov)}
                      className={`w-full text-right px-3 py-2 flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 font-black'
                          : 'text-slate-700 hover:bg-slate-50 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>{city.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          {count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Segmented Purpose Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-black flex-shrink-0">
            <button
              onClick={() => {
                setPurpose('sale');
                setSelectedListing(null);
              }}
              className={`py-1.5 px-2.5 sm:px-3 rounded-lg flex items-center justify-center gap-1 transition-all ${
                purpose === 'sale'
                  ? 'bg-white text-[#16324F] shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>للبيع</span>
              <Key className="w-3 h-3 text-emerald-600" />
            </button>

            <button
              onClick={() => {
                setPurpose('rent');
                setSelectedListing(null);
              }}
              className={`py-1.5 px-2.5 sm:px-3 rounded-lg flex items-center justify-center gap-1 transition-all ${
                purpose === 'rent'
                  ? 'bg-white text-[#16324F] shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>للإيجار</span>
              <DoorOpen className="w-3 h-3 text-[#16324F]" />
            </button>
          </div>
        </div>

        {/* 2. HORIZONTAL SCROLLABLE CATEGORY CHIPS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none px-0.5">
          {categoryChips.map(chip => {
            const isSelected = propertyType === chip.type;
            return (
              <button
                key={chip.type}
                onClick={() => {
                  setPropertyType(chip.type as any);
                  setSelectedListing(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-xs border ${
                  isSelected
                    ? 'bg-white text-emerald-700 border-emerald-600 ring-2 ring-emerald-600/30 font-black'
                    : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FLOATING VERIFIED ORGANIZATION CARD (Top Right) */}
      {showOrgCard && homeViewMode === 'map' && (
        <div className="absolute top-28 right-3 sm:right-6 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 max-w-[240px] text-right pointer-events-auto animate-in fade-in duration-300 hidden sm:block">
          <button
            onClick={() => setShowOrgCard(false)}
            className="absolute top-2 left-2 text-slate-400 hover:text-slate-600 text-xs w-4 h-4 flex items-center justify-center"
          >
            ✕
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
              <img src={featuredOrg.logoUrl} alt={featuredOrg.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>منشأة معتمدة</span>
              </div>
              <h4 className="font-bold text-xs text-[#16324F] leading-tight line-clamp-1">{featuredOrg.name}</h4>
              <span className="text-[10px] text-slate-500 font-medium">عقارات معتمدة في صنعاء وعدن</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN VIEWPORT (Map Mode vs List Mode) */}
      {homeViewMode === 'map' ? (
        <div className="relative flex-1 w-full h-full z-0">
          <DalaniMap
            listings={publishedListings}
            selectedListingId={selectedListing?.id}
            onSelectListing={listing => setSelectedListing(listing)}
            height="100%"
            showFilters={false}
            selectedGovernorate={governorate}
          />
        </div>
      ) : (
        /* Alternate Clean List View (No bulky drawer underneath) */
        <div className="flex-1 overflow-y-auto pt-28 pb-8 px-4 sm:px-6 max-w-6xl mx-auto w-full z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm text-[#16324F]">
              العقارات المتاحة {purpose === 'sale' ? 'للبيع' : 'للإيجار'} ({publishedListings.length})
            </h3>
            <button
              onClick={() => setHomeViewMode('map')}
              className="px-3 py-1.5 bg-[#16324F] text-white text-xs font-bold rounded-xl flex items-center gap-1"
            >
              <Map className="w-3.5 h-3.5 text-[#12A889]" />
              <span>العودة للخريطة</span>
            </button>
          </div>

          {publishedListings.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
              <p className="text-xs text-slate-500">لا توجد عقارات مطابقة لمعايير البحث الحالية.</p>
              <button
                onClick={handleResetFilters}
                className="mt-3 px-4 py-1.5 bg-[#12A889] text-white text-xs font-bold rounded-xl"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedListings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onSelect={onSelectListing}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. FLOATING VIEW MODE TOGGLE PILL (At Bottom of Map) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-25 pointer-events-auto">
        <button
          onClick={() => setHomeViewMode(homeViewMode === 'map' ? 'list' : 'map')}
          className="px-4 py-2 rounded-full bg-[#16324F]/95 hover:bg-[#16324F] text-white text-xs font-black shadow-xl border border-slate-600/80 flex items-center gap-2 backdrop-blur-md transition-all transform hover:scale-105"
        >
          {homeViewMode === 'map' ? (
            <>
              <ListFilter className="w-4 h-4 text-[#12A889]" />
              <span>قائمة العقارات ({publishedListings.length})</span>
            </>
          ) : (
            <>
              <Map className="w-4 h-4 text-[#12A889]" />
              <span>عرض الخريطة الحية</span>
            </>
          )}
        </button>
      </div>

      {/* 6. FLOATING PROPERTY PREVIEW CARD (When a Pin is Tapped) */}
      {selectedListing && homeViewMode === 'map' && (
        <div className="absolute bottom-16 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-30 pointer-events-auto bg-white/95 backdrop-blur-md rounded-3xl p-3 shadow-2xl border border-slate-200/90 animate-in slide-in-from-bottom-4 duration-200">
          <div className="relative flex items-center gap-3">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
              <img
                src={(selectedListing.images && selectedListing.images[0]) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'}
                alt={selectedListing.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-[#12A889] text-white text-[9px] font-bold">
                {selectedListing.purpose === 'sale' ? 'للبيع' : 'للإيجار'}
              </span>
            </div>

            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-sm text-[#12A889]">
                  {selectedListing.currency === 'USD'
                    ? `$${(selectedListing.price || 0).toLocaleString()}`
                    : `${(selectedListing.price || 0).toLocaleString()} ${selectedListing.currency || 'YER'}`}
                </span>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <h4 className="font-bold text-xs text-[#16324F] truncate mb-1">{selectedListing.title}</h4>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2 truncate">
                <MapPin className="w-3 h-3 text-[#12A889] flex-shrink-0" />
                <span>{selectedListing.location?.city || ''} {selectedListing.location?.district ? `- ${selectedListing.location.district}` : ''}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-bold">{selectedListing.area || 0} {selectedListing.areaUnit || 'م²'}</span>
                <button
                  onClick={() => onSelectListing(selectedListing)}
                  className="px-3 py-1 bg-[#16324F] hover:bg-[#12A889] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>التفاصيل</span>
                  <span>←</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. ADVANCED FILTERS MODAL (Triggered by [ تصفية ]) */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-[#16324F] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0284c7]" />
                <span>تصفية عقارات اليمن المتقدمة</span>
              </h3>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Keyword */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">الكلمة المفتاحية أو الحي:</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="مثال: حدة، خورمكسر، بيت بوس..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Governorate */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">المحافظة:</label>
                <select
                  value={governorate}
                  onChange={e => setGovernorate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="all">جميع المحافظات اليمنية</option>
                  {YEMEN_GOVERNORATES.map(gov => (
                    <option key={gov.name} value={gov.name}>
                      {gov.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency & Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">العملة:</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="all">كل العملات</option>
                    <option value="USD">دولار أمريكي ($)</option>
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نطاق السعر:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={minPrice}
                      onChange={e => setMinPrice(e.target.value)}
                      placeholder="من"
                      className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
                      placeholder="إلى"
                      className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Solar check */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 font-bold text-amber-800">
                <input
                  type="checkbox"
                  checked={hasSolarOnly}
                  onChange={e => setHasSolarOnly(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  <span>عقارات مزودة بمنظومة طاقة شمسية فقط</span>
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة تعيين</span>
              </button>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                تطبيق الفلاتر ({publishedListings.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
