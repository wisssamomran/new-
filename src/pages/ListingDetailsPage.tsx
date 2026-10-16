import React, { useState } from 'react';
import { Listing, ReportCase } from '../types';
import { useApp } from '../context/AppContext';
import { DalaniMap } from '../components/DalaniMap';
import { ListingCard } from '../components/ListingCard';
import {
  Heart,
  Share2,
  Flag,
  MapPin,
  ShieldCheck,
  Phone,
  MessageCircle,
  Building,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Layers,
  Calendar,
  Compass,
  ArrowRight,
  Info,
  Check,
  Eye
} from 'lucide-react';

interface ListingDetailsPageProps {
  listing: Listing;
  onBack: () => void;
  onSelectListing: (listing: Listing) => void;
  onOpenAuth?: (mode: 'login' | 'register', reason?: string) => void;
  onOpenVisitorGate?: (title: string, reason: string) => void;
}

export const ListingDetailsPage: React.FC<ListingDetailsPageProps> = ({
  listing,
  onBack,
  onSelectListing,
  onOpenAuth,
  onOpenVisitorGate
}) => {
  const { currentUser, isFavorite, toggleFavorite, submitReport, showToast, listings } = useApp();
  const favorited = isFavorite(listing.id);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportCase['reason']>('false_information');
  const [reportDetails, setReportDetails] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');

  // Safe images fallback
  const safeImages = (listing.images && listing.images.length > 0)
    ? listing.images
    : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80'];

  // Format Price
  const formattedPrice = () => {
    const p = listing.price || 0;
    if (listing.currency === 'USD') {
      return `$${p.toLocaleString()}`;
    }
    if (listing.currency === 'SAR') {
      return `${p.toLocaleString()} ر.س`;
    }
    return `${p.toLocaleString()} ريال يمني`;
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('تم نسخ رابط الإعلان إلى الحافظة بنجاح', 'success');
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDetails.trim() || !reporterName.trim() || !reporterPhone.trim()) {
      showToast('يرجى ملء جميع الحقول المطلوبة لضمان متابعة البلاغ', 'warning');
      return;
    }

    submitReport({
      listingId: listing.id,
      listingTitle: listing.title,
      listingSnapshotPrice: formattedPrice(),
      listingSnapshotAdvertiser: listing.advertiser?.name || 'معلن',
      reporterName,
      reporterPhone,
      reason: reportReason,
      details: reportDetails,
      priority: 'medium'
    });

    setShowReportModal(false);
    setReportDetails('');
    setReporterName('');
    setReporterPhone('');
  };

  // Find similar listings in same governorate
  const similarListings = listings
    .filter(
      l =>
        l.id !== listing.id &&
        l.status === 'published' &&
        (l.location?.governorate === listing.location?.governorate || l.propertyType === listing.propertyType)
    )
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs md:text-sm font-bold text-slate-600 hover:text-[#12A889] transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع إلى القائمة</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Share */}
          <button
            onClick={handleShare}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>مشاركة</span>
          </button>

          {/* Favorite */}
          <button
            onClick={() => {
              if (currentUser.role === 'visitor') {
                if (onOpenVisitorGate) {
                  onOpenVisitorGate('مفضلة العقارات تتطلب حساباً', 'سجل دخولك لحفظ وتتبع العقارات التي تهمك عبر أي جهاز.');
                } else {
                  showToast('يجب تسجيل الدخول أولاً لحفظ العقارات في المفضلة', 'warning');
                }
                return;
              }
              toggleFavorite(listing.id);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              favorited
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${favorited ? 'fill-current text-rose-500' : ''}`} />
            <span>{favorited ? 'في المفضلة' : 'حفظ بالمفضلة'}</span>
          </button>

          {/* Report */}
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
          >
            <Flag className="w-3.5 h-3.5 text-rose-500" />
            <span>إبلاغ عن مخالفة</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Gallery & Details vs Sticky Contact Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Photos Gallery */}
          <div className="space-y-3">
            <div className="relative rounded-3xl overflow-hidden h-[340px] md:h-[480px] bg-slate-900 border border-slate-200 shadow-sm">
              <img
                src={safeImages[activeImageIndex] || safeImages[0]}
                alt={listing.title}
                className="w-full h-full object-cover transition-all duration-300"
              />
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="px-3 py-1 bg-[#12A889] text-white text-xs font-bold rounded-lg shadow-sm">
                  {listing.purpose === 'sale' ? 'للبيع' : listing.purpose === 'rent' ? 'للإيجار' : 'استثمار'}
                </span>
                <span className="px-3 py-1 bg-[#16324F]/90 backdrop-blur-xs text-white text-xs font-bold rounded-lg shadow-sm">
                  رقم الإعلان: {listing.listingNumber}
                </span>
              </div>
            </div>

            {/* Thumbnail Row */}
            {safeImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                {safeImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                      activeImageIndex === idx ? 'border-[#12A889] ring-2 ring-[#12A889]/30' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Core Location */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                  <MapPin className="w-4 h-4 text-[#12A889]" />
                  <span>
                    {listing.location.governorate} • {listing.location.city} • {listing.location.district}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-[#16324F] leading-snug">{listing.title}</h1>
              </div>

              <div className="text-right md:text-left flex-shrink-0">
                <div className="text-2xl md:text-3xl font-black text-[#12A889]">{formattedPrice()}</div>
                {listing.isNegotiable && (
                  <div className="text-xs text-slate-500 font-bold mt-0.5">قابل للتفاوض الجاد</div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-sm text-[#16324F] mb-2">الوصف العام للعقار:</h3>
              <p className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-black text-base text-[#16324F] flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-[#12A889]" />
              <span>المواصفات والخصائص التفصيلية</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-0.5">المساحة الإجمالية</span>
                <span className="font-bold text-sm text-slate-800">
                  {listing.area} {listing.areaUnit}
                </span>
              </div>

              {listing.attributes.rooms && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">عدد الغرف</span>
                  <span className="font-bold text-sm text-slate-800">{listing.attributes.rooms} غرف</span>
                </div>
              )}

              {listing.attributes.bathrooms && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">دورات المياه</span>
                  <span className="font-bold text-sm text-slate-800">{listing.attributes.bathrooms} حمامات</span>
                </div>
              )}

              {listing.attributes.livingRooms && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">الصالات والمجالس</span>
                  <span className="font-bold text-sm text-slate-800">{listing.attributes.livingRooms} مجالس</span>
                </div>
              )}

              {listing.attributes.floorNumber !== undefined && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">رقم الدور</span>
                  <span className="font-bold text-sm text-slate-800">الدور {listing.attributes.floorNumber}</span>
                </div>
              )}

              {listing.attributes.streetWidthMeters && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">عرض الشارع</span>
                  <span className="font-bold text-sm text-slate-800">{listing.attributes.streetWidthMeters} متر</span>
                </div>
              )}

              {listing.attributes.streetDirection && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">اتجاه الواجهة</span>
                  <span className="font-bold text-sm text-slate-800">{listing.attributes.streetDirection}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-0.5">منظومة الطاقة الشمسية</span>
                <span className="font-bold text-sm text-slate-800 flex items-center gap-1">
                  {listing.attributes.hasSolarSystem ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <Sun className="w-4 h-4" /> متوفرة
                    </span>
                  ) : (
                    <span>غير مشمولة</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Transparent Verification Badges (Comprehensive Rules Enforcement) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-[#16324F] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>شارات التحقق والشفافية القانونية للإعلان</span>
              </h3>
              <span className="text-xs text-slate-400">معايير دلنّي للسوق اليمني</span>
            </div>

            {listing.verificationBadges.length === 0 ? (
              <div className="text-xs text-slate-500 py-3">
                لم يتم طلب أو إرفاق شارات تحقق إضافية لهذا الإعلان. يرجى التحري المعتاد عند التفاوض.
              </div>
            ) : (
              <div className="space-y-4">
                {listing.verificationBadges.map((badge, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="font-black text-sm text-[#16324F]">{badge.label}</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        {badge.validityNote} ({badge.verifiedAt})
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed pr-6">{badge.description}</p>

                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 pr-3 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">ما الذي لا تعنيه هذه الشارة: </span>
                        <span>{badge.disclaimer}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Map Location Preview */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#16324F] flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#12A889]" />
                <span>الموقع على الخريطة</span>
              </h3>
              <span className="text-xs text-slate-500">
                {listing.location.isApproximate ? '📍 الموقع تقريبي حفاظاً على الخصوصية' : '📍 الموقع دقيق'}
              </span>
            </div>

            <DalaniMap listings={[listing]} selectedListingId={listing.id} height="360px" />
          </div>
        </div>

        {/* Right Sticky Column (Advertiser Card & Contact) */}
        <div className="lg:col-span-4 sticky top-24 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            {/* Advertiser Header */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border-2 border-slate-200">
                <img
                  src={
                    listing.advertiser.avatarUrl ||
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
                  }
                  alt={listing.advertiser.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
                  {listing.advertiser.type === 'organization' ? 'منشأة عقارية معتمدة' : 'معلن فرد موثق'}
                </span>
                <h4 className="font-black text-sm text-[#16324F] line-clamp-1">{listing.advertiser.name}</h4>
                {listing.advertiser.orgName && (
                  <span className="text-xs text-[#12A889] font-bold block">{listing.advertiser.orgName}</span>
                )}
              </div>
            </div>

            {/* Direct Communication Buttons */}
            <div className="space-y-2.5 pt-2">
              {listing.advertiser.allowWhatsapp && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser.role === 'visitor') {
                      if (onOpenVisitorGate) {
                        onOpenVisitorGate('تسجيل الدخول مطلوب للتواصل', 'يتطلب التواصل المباشر مع المعلن المعتمد تسجيل الدخول لتوثيق الاستفسار وحماية الطرفين.');
                      } else {
                        showToast('يرجى تسجيل الدخول أولاً للتواصل المباشر مع المعلن', 'warning');
                      }
                      return;
                    }
                    window.open(
                      `https://wa.me/967${listing.advertiser.phone.replace(/^0+/, '')}?text=${encodeURIComponent(
                        `مرحباً، أستفسر عن إعلان ${listing.listingNumber} المعروض على منصة دلنّي`
                      )}`,
                      '_blank'
                    );
                  }}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تواصل عبر واتساب المعتمد</span>
                </button>
              )}

              {listing.advertiser.allowCall && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser.role === 'visitor') {
                      if (onOpenVisitorGate) {
                        onOpenVisitorGate('تسجيل الدخول مطلوب للاتصال', 'يتطلب الاتصال المباشر بالمعلن تسجيل الدخول لضمان موثوقية المعاملات العقارية.');
                      } else {
                        showToast('يرجى تسجيل الدخول أولاً للاتصال بالمعلن', 'warning');
                      }
                      return;
                    }
                    window.location.href = `tel:${listing.advertiser.phone}`;
                  }}
                  className="w-full py-3 px-4 bg-[#16324F] hover:bg-[#12A889] text-white text-xs md:text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>اتصال هاتفي مباشر ({listing.advertiser.phone})</span>
                </button>
              )}
            </div>

            {/* Safety & Guidelines reminder */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>إرشادات السلامة في السوق العقاري:</span>
              </div>
              <p>• لا تقم بتحويل أي عربون أو مبالغ مالية قبل المعاينة الميدانية والتأكد من صك الملكية والبصيرة الشرعية.</p>
              <p>• تحقق من صفة الوسيط أو البائع بحضور الشهود والمختصين وفق الأعراف المعتمدة باليمن.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Listings Carousel */}
      {similarListings.length > 0 && (
        <div className="pt-8 border-t border-slate-200 space-y-4">
          <h3 className="font-black text-lg text-[#16324F]">عقارات مشابهة قد تهمك في نفس المنطقة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {similarListings.map(sim => (
              <ListingCard key={sim.id} listing={sim} onSelect={onSelectListing} />
            ))}
          </div>
        </div>
      )}

      {/* Report Listing Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-base text-rose-700 flex items-center gap-2">
                <Flag className="w-5 h-5 text-rose-600" />
                <span>تقديم بلاغ عن إعلان مخالف</span>
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 mb-4 leading-relaxed">
              <span className="font-bold">حماية سرية المبلّغ: </span>
              تضمن منصة «دلنّي» عدم كشف بياناتك أو رقم هاتفك للمعلن إطلاقاً، وتُستخدم معلوماتك فقط لتواصل فريق الإشراف
              والتحقق معك عند الحاجة.
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">سبب البلاغ:</label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="false_information">معلومات غير صحيحة أو وصف مضلل</option>
                  <option value="duplicate_listing">إعلان مكرر لنفس العقار</option>
                  <option value="price_fraud">سعر وهمي أو احتيالي</option>
                  <option value="unauthorized_seller">معلن غير مخول ببيع العقار</option>
                  <option value="already_sold">العقار مباع أو مؤجر بالفعل</option>
                  <option value="offensive_content">محتوى أو صور غير لائقة</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تفاصيل المخالفة والأدلة:</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                  placeholder="اشرح سبب البلاغ بالتفصيل لمساعدة فريق التحقق..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#12A889]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسمك الكامل:</label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={e => setReporterName(e.target.value)}
                    placeholder="مقدم البلاغ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم هاتفك للتواصل:</label>
                  <input
                    type="text"
                    value={reporterPhone}
                    onChange={e => setReporterPhone(e.target.value)}
                    placeholder="770000000"
                    dir="ltr"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-left font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs"
                >
                  إرسال البلاغ للتحقيق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
