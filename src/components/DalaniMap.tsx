import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Listing } from '../types';
import { YEMEN_GOVERNORATES } from '../data/yemenData';
import { useApp } from '../context/AppContext';
import { Layers, MapPin, Navigation, Eye, AlertCircle, Key, CheckCircle, List, Compass, Crosshair, Loader2 } from 'lucide-react';

interface DalaniMapProps {
  listings: Listing[];
  selectedListingId?: string;
  onSelectListing?: (listing: Listing) => void;
  className?: string;
  height?: string;
  showFilters?: boolean;
  selectedGovernorate?: string;
}

export const DalaniMap: React.FC<DalaniMapProps> = ({
  listings,
  selectedListingId,
  onSelectListing,
  className = '',
  height = '580px',
  showFilters = true,
  selectedGovernorate
}) => {
  const { googleMapsApiKey, setGoogleMapsApiKey, showToast } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  const [activeTileLayer, setActiveTileLayer] = useState<'streets' | 'satellite' | 'google_hybrid'>('google_hybrid');
  const [activeGovernorate, setActiveGovernorate] = useState<string>('صنعاء (أمانة العاصمة)');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyInputValue, setKeyInputValue] = useState<string>(googleMapsApiKey || '');
  const [viewMode, setViewMode] = useState<'map' | 'text_fallback'>('map');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Automatically fly to selected governorate when changed from external dropdown
  useEffect(() => {
    if (!selectedGovernorate || !mapInstanceRef.current) return;
    if (selectedGovernorate === 'all') {
      mapInstanceRef.current.flyTo([15.3694, 44.1910], 7, { duration: 1.2 });
      return;
    }
    const gov = YEMEN_GOVERNORATES.find(g =>
      g.name === selectedGovernorate ||
      g.name.includes(selectedGovernorate) ||
      selectedGovernorate.includes(g.name)
    );
    if (gov) {
      mapInstanceRef.current.flyTo([gov.lat, gov.lng], gov.zoom, { duration: 1.2 });
      setActiveGovernorate(gov.name);
    }
  }, [selectedGovernorate]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (viewMode === 'text_fallback' || !mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        // Center on Yemen (Sana'a / center of Yemen: 15.3694, 44.1910)
        const map = L.map(mapContainerRef.current, {
          center: [15.3694, 44.1910],
          zoom: 12,
          zoomControl: false,
          attributionControl: true
        });

        // Custom Zoom Control at bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Layers
        const streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap &amp; Dalani Yemen'
        });

        const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
        });

        const googleHybridTiles = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          attribution: 'Google Maps Hybrid Imagery'
        });

        // Default to Google Hybrid satellite for rich realistic visualization
        googleHybridTiles.addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;
        setMapLoaded(true);
      }
    } catch (err) {
      console.error('Error initializing map:', err);
      setMapError(true);
    }

    return () => {
      // Keep instance alive during state re-renders, destroyed on unmount
    };
  }, [viewMode]);

  // Handle Tile Layer switch
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove existing tile layers
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (activeTileLayer === 'streets') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    } else if (activeTileLayer === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri, Maxar'
      }).addTo(map);
    } else {
      // Google Hybrid
      L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps Hybrid &amp; Dalani'
      }).addTo(map);
    }
  }, [activeTileLayer]);

  // Update Markers when listings change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    // Only render published and active listings for map viewers
    const activeListings = listings.filter(l => l.status === 'published');

    activeListings.forEach(listing => {
      const { lat, lng } = listing.location;
      if (!lat || !lng) return;

      const formattedPrice =
        listing.currency === 'USD'
          ? `$${listing.price.toLocaleString()}`
          : listing.currency === 'SAR'
          ? `${listing.price.toLocaleString()} ر.س`
          : `${(listing.price / 1000000).toFixed(1)}M ر.ي`;

      const isSelected = listing.id === selectedListingId;

      // Custom HTML Pin with Dalani colors
      const pinHtml = `
        <div class="cursor-pointer transition-all duration-300 transform hover:scale-110 ${isSelected ? 'scale-115 z-50' : ''}">
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg font-bold text-xs border-2 ${
            isSelected
              ? 'bg-[#12A889] text-white border-white ring-4 ring-[#12A889]/30'
              : 'bg-[#16324F] text-white border-[#12A889]'
          }">
            <span class="w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-[#12A889]'} animate-pulse"></span>
            <span>${formattedPrice}</span>
          </div>
          <div class="w-2.5 h-2.5 bg-[#16324F] mx-auto transform rotate-45 -mt-1.5 border-r border-b border-[#12A889]"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'dalani-custom-pin',
        html: pinHtml,
        iconSize: [85, 34],
        iconAnchor: [42, 34]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Rich Yemen Property Popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-3 max-w-[270px] text-right font-sans';
      const mainImg = (listing.images && listing.images[0]) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';
      const locationText = `${listing.location?.city || ''} ${listing.location?.district ? `- ${listing.location.district}` : ''}`.trim() || 'اليمن';
      popupContent.innerHTML = `
        <div class="relative overflow-hidden rounded-lg mb-2">
          <img src="${mainImg}" alt="${listing.title}" class="w-full h-28 object-cover rounded-md" />
          <span class="absolute top-2 right-2 bg-[#12A889] text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
            ${listing.purpose === 'sale' ? 'للبيع' : listing.purpose === 'rent' ? 'للإيجار' : 'استثمار'}
          </span>
          <span class="absolute bottom-2 left-2 bg-[#16324F]/90 text-white text-[11px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
            ${formattedPrice}
          </span>
        </div>
        <h4 class="font-bold text-sm text-[#16324F] mb-1 line-clamp-1 leading-snug">${listing.title}</h4>
        <div class="flex items-center gap-1 text-xs text-slate-500 mb-2">
          <span>📍</span>
          <span>${locationText}</span>
        </div>
        <div class="flex items-center justify-between text-xs border-t border-slate-100 pt-2 mb-2 text-slate-600 font-medium">
          <span>المساحة: ${listing.area || 0} ${listing.areaUnit || 'م²'}</span>
          ${listing.attributes?.rooms ? `<span>${listing.attributes.rooms} غرف</span>` : ''}
        </div>
        <button id="view-listing-${listing.id}" class="w-full py-1.5 px-3 bg-[#16324F] hover:bg-[#12A889] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
          <span>معاينة التفاصيل الكاملة</span>
          <span>←</span>
        </button>
      `;

      // Bind click inside popup
      popupContent.querySelector(`#view-listing-${listing.id}`)?.addEventListener('click', () => {
        if (onSelectListing) {
          onSelectListing(listing);
        }
      });

      marker.bindPopup(popupContent, { maxWidth: 300 });

      marker.on('click', () => {
        if (onSelectListing) {
          onSelectListing(listing);
        }
      });

      markersLayer.addLayer(marker);
    });
  }, [listings, selectedListingId, onSelectListing]);

  // Quick Fly to Governorate
  const handleFlyToGov = (govName: string) => {
    setActiveGovernorate(govName);
    const gov = YEMEN_GOVERNORATES.find(g => g.name === govName);
    if (gov && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([gov.lat, gov.lng], gov.zoom, {
        duration: 1.2
      });
    }
  };

  // Locate User's Position with interactive beacon & accuracy radius
  const handleLocateMe = () => {
    if (!mapInstanceRef.current) return;

    // If user already located, fly directly to their location
    if (userLocation) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 1 });
      userMarkerRef.current?.openPopup();
      showToast('تمت إعادة التوسيط على موقعك الحالي', 'info');
      return;
    }

    setIsLocating(true);

    const setUserMapPosition = (lat: number, lng: number, accuracy: number = 80, label: string = 'موقعك الحالي') => {
      if (!mapInstanceRef.current) return;

      // Remove existing user marker/circle if any
      if (userMarkerRef.current) {
        mapInstanceRef.current.removeLayer(userMarkerRef.current);
      }
      if (userCircleRef.current) {
        mapInstanceRef.current.removeLayer(userCircleRef.current);
      }

      // Create pulse beacon icon
      const beaconIcon = L.divIcon({
        className: 'user-beacon-marker',
        html: `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 40px; height: 40px; border-radius: 9999px; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 9999px; background: rgba(37, 99, 235, 0.7); box-shadow: 0 0 12px rgba(59, 130, 246, 0.9);"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background: #ffffff; border: 3px solid #2563eb; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      // Accuracy radius circle
      const circle = L.circle([lat, lng], {
        radius: Math.max(accuracy, 60),
        color: '#2563eb',
        fillColor: '#60a5fa',
        fillOpacity: 0.15,
        weight: 1.5
      }).addTo(mapInstanceRef.current);

      // Marker
      const marker = L.marker([lat, lng], {
        icon: beaconIcon,
        zIndexOffset: 1000
      }).addTo(mapInstanceRef.current);

      marker.bindPopup(`
        <div style="text-align: center; padding: 6px 12px; font-family: sans-serif; direction: rtl;">
          <div style="font-weight: 800; font-size: 13px; color: #1e3a8a; display: flex; align-items: center; justify-content: center; gap: 4px;">
            <span>📍</span>
            <span>${label}</span>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
            دقة الإشارة: ±${Math.round(accuracy)} متر
          </div>
        </div>
      `, { closeButton: false, offset: [0, -12] });

      userMarkerRef.current = marker;
      userCircleRef.current = circle;
      setUserLocation({ lat, lng });

      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
      setTimeout(() => {
        marker.openPopup();
      }, 1200);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setIsLocating(false);
          setUserMapPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'أنت هنا (موقعك الحالي)');
          showToast('تم تحديد موقعك بدقة عالية عبر الـ GPS 🎯', 'success');
        },
        () => {
          setIsLocating(false);
          // Fallback location centered in Sana'a (Hadda)
          const fallbackLat = 15.3120;
          const fallbackLng = 44.1870;
          setUserMapPosition(fallbackLat, fallbackLng, 120, 'موقعك التقديري (صنعاء - حدة)');
          showToast('تم تحديد وتوسيط موقعك التقديري على الخريطة 🎯', 'info');
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    } else {
      setIsLocating(false);
      setUserMapPosition(15.3120, 44.1870, 150, 'موقعك التقديري (صنعاء)');
      showToast('تم تحديد موقعك التقديري على الخريطة 🎯', 'info');
    }
  };

  const handleSaveApiKey = () => {
    setGoogleMapsApiKey(keyInputValue.trim());
    setShowKeyModal(false);
  };

  return (
    <div className={`relative bg-white ${showFilters ? 'rounded-2xl shadow-sm border border-slate-200' : ''} overflow-hidden flex flex-col h-full w-full ${className}`}>
      {/* Top Map Control Bar (Only when showFilters is true, e.g. on SearchPage) */}
      {showFilters && (
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#12A889]/20 flex items-center justify-center text-[#12A889]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>خريطة عقارات اليمن التفاعلية</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              </h3>
              <p className="text-xs text-slate-400">
                {listings.filter(l => l.status === 'published').length} عقاراً منشوراً ومطابقاً للشروط العامة
              </p>
            </div>
          </div>

          {/* View Mode & Layer Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-700 text-xs">
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'map' ? 'bg-[#12A889] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>الخريطة الحية</span>
              </button>
              <button
                onClick={() => setViewMode('text_fallback')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'text_fallback' ? 'bg-[#12A889] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>البديل النصي</span>
              </button>
            </div>

            {viewMode === 'map' && (
              <div className="bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-700 text-xs">
                <button
                  onClick={() => setActiveTileLayer('google_hybrid')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    activeTileLayer === 'google_hybrid' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="أقمار صناعية هجينة من قوقل"
                >
                  قمر صناعي هجين
                </button>
                <button
                  onClick={() => setActiveTileLayer('streets')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    activeTileLayer === 'streets' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="خريطة الشوارع التخطيطية"
                >
                  شوارع
                </button>
              </div>
            )}

            <button
              onClick={() => setShowKeyModal(true)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                googleMapsApiKey
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900/60'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{googleMapsApiKey ? 'مفتاح Google مفعل' : 'تخصيص Google Key'}</span>
            </button>
          </div>
        </div>
      )}



      {/* Main Map Viewport */}
      {viewMode === 'map' ? (
        <div className="relative w-full h-full flex-1" style={{ minHeight: height === '100%' ? '100%' : height }}>
          {mapError ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
              <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
              <h4 className="font-bold text-slate-800 text-base mb-1">تعذر تحميل بيانات الخريطة</h4>
              <p className="text-xs text-slate-500 max-w-md mb-4">
                قد يكون السبب انقطاعاً في شبكة الإنترنت، يمكنك تفعيل البديل النصي فوراً.
              </p>
              <button
                onClick={() => setViewMode('text_fallback')}
                className="px-4 py-2 bg-[#12A889] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#0f8d73]"
              >
                فتح البديل النصي للقائمة
              </button>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full z-10" />
          )}

          {/* Floating Controls for Clean Fullscreen Mode (Positioned vertically at bottom of page as requested) */}
          {!showFilters && (
            <div className="absolute bottom-6 left-3 sm:left-6 z-25 flex flex-col gap-2 pointer-events-auto">
              {/* Satellite vs Streets Floating Button */}
              <button
                onClick={() => setActiveTileLayer(activeTileLayer === 'streets' ? 'google_hybrid' : 'streets')}
                className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg text-[#16324F] hover:bg-slate-50 flex items-center justify-center transition-all hover:scale-105"
                title={activeTileLayer === 'streets' ? 'التحويل للأقمار الصناعية' : 'التحويل لخريطة الشوارع'}
              >
                <Layers className="w-5 h-5 text-[#12A889]" />
              </button>

              {/* Locate My Position Button (القناصة) */}
              <button
                onClick={handleLocateMe}
                disabled={isLocating}
                className={`w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border shadow-lg flex items-center justify-center transition-all hover:scale-105 ${
                  userLocation
                    ? 'border-blue-400 bg-blue-50/90 text-blue-600 ring-2 ring-blue-400/40'
                    : 'border-slate-200 text-[#16324F] hover:bg-slate-50'
                }`}
                title="تحديد موقعي الحالي على الخريطة"
              >
                {isLocating ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <Crosshair className={`w-5 h-5 ${userLocation ? 'text-blue-600' : 'text-[#16324F]'}`} />
                )}
              </button>

              {/* Discrete Google API Key Config Trigger */}
              <button
                onClick={() => setShowKeyModal(true)}
                className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-all hover:scale-105"
                title="إعدادات مفتاح الخريطة"
              >
                <Key className="w-4 h-4 text-amber-600" />
              </button>
            </div>
          )}

          {/* Floating Map Legend (Compact - Positioned at bottom right) */}
          <div className="absolute bottom-6 right-16 sm:right-20 z-20 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/80 shadow-sm text-[10px] pointer-events-auto hidden md:block">
            <div className="font-bold text-[#16324F] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#12A889]"></span>
              <span>عقارات دلنّي باليمن</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 text-[10px]">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#16324F] inline-block"></span>
                <span>نشط</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#12A889] inline-block"></span>
                <span>المحدد</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Text Fallback View (Mandatory in requirements for resilience and accessibility) */
        <div className="p-4 overflow-y-auto bg-slate-50" style={{ height }}>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-3 text-xs text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold">البديل النصي التفاعلي مفعل:</span> يعرض جميع إحداثيات ومواقع العقارات المتاحة
              بالمدن والأحياء لسهولة التصفح في حال بطء الاتصال أو ضعف تحميل طبقات الخرائط.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {listings
              .filter(l => l.status === 'published')
              .map(listing => (
                <div
                  key={listing.id}
                  onClick={() => onSelectListing && onSelectListing(listing)}
                  className={`bg-white p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                    selectedListingId === listing.id ? 'border-[#12A889] ring-2 ring-[#12A889]/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#16324F]/10 text-[#16324F]">
                      {listing.location.governorate}
                    </span>
                    <span className="font-black text-sm text-[#12A889]">
                      {listing.currency === 'USD' ? `$${listing.price.toLocaleString()}` : `${listing.price.toLocaleString()} ${listing.currency}`}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 line-clamp-1 mb-1">{listing.title}</h4>
                  <p className="text-xs text-slate-500 mb-2">
                    {listing.location.city} - {listing.location.district} {listing.location.street ? `(${listing.location.street})` : ''}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 font-mono">
                    <span>خط العرض: {listing.location.lat.toFixed(4)}°</span>
                    <span>خط الطول: {listing.location.lng.toFixed(4)}°</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Google Maps Custom Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#16324F]/10 flex items-center justify-center text-[#16324F]">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#16324F]">إعداد مفتاح Google Maps API</h3>
                <p className="text-xs text-slate-500">تمكين وتفعيل خدمات Google Maps الحية الخاصة بك</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              الخريطة تعمل حالياً بنظام الخرائط الهجينة الحية والأقمار الصناعية (Google Satellite / Hybrid). إذا كان لديك مفتاح
              رسمي من Google Cloud وترغب في ربطه، يمكنك إدخاله هنا:
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مفتاح API Key الخاص بقوقل:</label>
                <input
                  type="text"
                  value={keyInputValue}
                  onChange={e => setKeyInputValue(e.target.value)}
                  placeholder="AIzaSy..."
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#12A889] text-left"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-600">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>الخرائط تعمل فورياً بدون توقف</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  حتى بدون مفتاح، نوفر تلقائياً طبقات صور الأقمار الصناعية وشبكة شوارع اليمن مع إحداثيات دقيقة لكل المحافظات.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-5 py-2 bg-[#12A889] hover:bg-[#0f8d73] text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                حفظ التفعيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
