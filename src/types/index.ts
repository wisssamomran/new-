export type UserRole =
  | 'visitor'         // زائر غير مسجل
  | 'seeker'          // باحث مسجل عن عقار
  | 'advertiser'      // معلن فرد موثق
  | 'org_manager'     // مدير منشأة عقارية
  | 'org_agent'       // موظف إعلانات منشأة
  | 'moderator'       // مسؤول مراجعة المحتوى
  | 'verifier'        // مسؤول التحقق والمستندات
  | 'reporter_admin'  // مسؤول البلاغات والقضايا
  | 'support'         // مسؤول الدعم الفني
  | 'system_admin';   // مدير النظام

export type PropertyType =
  | 'apartment'    // شقة
  | 'villa'        // فيلا / دار
  | 'land'         // أرض / لبن
  | 'building'     // عمارة / برج
  | 'commercial'   // محل / معرض تجاري
  | 'office'       // مكتب إداري
  | 'chalet';      // استراحة / مزرعة

export type ListingPurpose =
  | 'sale'         // للبيع
  | 'rent'         // للإيجار
  | 'investment';  // للاستثمار / تشغيل

export type Currency = 'YER' | 'USD' | 'SAR';

export type AreaUnit = 'م²' | 'لبنة عشاري' | 'قصبة' | 'هكتار';

export type ListingStatus =
  | 'draft'                 // مسودة
  | 'pending_completion'    // بانتظار الاستكمال
  | 'under_review'          // قيد المراجعة
  | 'pending_verification'  // بانتظار التحقق
  | 'needs_changes'         // مطلوب تعديله
  | 'published'             // منشور ونشط
  | 'suspended'             // موقوف مؤقتاً
  | 'expired'               // منتهٍ
  | 'rejected'              // مرفوض
  | 'cancelled';            // ملغى

export interface VerificationBadge {
  type: 'phone_verified' | 'advertiser_reviewed' | 'org_reviewed' | 'deed_reviewed';
  label: string;
  description: string;
  verifiedAt: string;
  verifiedBy: string;
  validityNote: string;
  disclaimer: string;
}

export interface PrivateDocument {
  id: string;
  title: string;
  type: 'identity' | 'ownership' | 'authorization' | 'cr';
  url: string;
  uploadedAt: string;
  sizeMb: number;
}

export interface StatusTimelineEntry {
  status: ListingStatus;
  timestamp: string;
  changedBy: string;
  userRole: UserRole;
  reason?: string;
  notes?: string;
  missingFields?: string[];
}

export interface AdvertiserInfo {
  id: string;
  name: string;
  type: 'individual' | 'organization';
  phone: string;
  phoneVerified: boolean;
  allowWhatsapp: boolean;
  allowCall: boolean;
  orgId?: string;
  orgName?: string;
  licenseNumber?: string; // فقط إذا كان موثقاً فعلياً
  reputationYears?: number;
  avatarUrl?: string;
}

export interface Listing {
  id: string;
  listingNumber: string; // e.g. YEM-2026-1042
  title: string;
  description: string;
  propertyType: PropertyType;
  purpose: ListingPurpose;
  status: ListingStatus;
  
  price: number;
  currency: Currency;
  isNegotiable: boolean;
  
  area: number;
  areaUnit: AreaUnit;
  
  // الموقع
  location: {
    governorate: string; // صنعاء، عدن، تعز، ...
    city: string;
    district: string;
    street?: string;
    lat: number;
    lng: number;
    isApproximate: boolean; // حماية الخصوصية
  };
  
  // الخصائص بحسب النوع
  attributes: {
    rooms?: number;
    bathrooms?: number;
    livingRooms?: number;
    floorNumber?: number;
    totalFloors?: number;
    parkingSpaces?: number;
    buildingAgeYears?: number;
    streetWidthMeters?: number;
    streetDirection?: 'شمالي' | 'جنوبي' | 'شرقي' | 'غربي' | 'رأسي على شارعين';
    hasElevator?: boolean;
    hasWaterNetwork?: boolean;
    hasElectricity?: boolean;
    hasSolarSystem?: boolean; // شائع جداً وضروري في اليمن
    isFurnished?: boolean;
    zoningType?: 'سكني' | 'تجاري' | 'صناعي' | 'زراعي';
  };
  
  images: string[];
  privateDocuments?: PrivateDocument[]; // لا تظهر للعامة
  
  advertiser: AdvertiserInfo;
  assignedAgentId?: string;
  assignedAgentName?: string;
  
  verificationBadges: VerificationBadge[];
  statusTimeline: StatusTimelineEntry[];
  
  viewsCount: number;
  favoritesCount: number;
  featuredOrder?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  phoneVerified: boolean;
  email?: string;
  role: UserRole;
  orgId?: string;
  orgName?: string;
  isOrgAdmin?: boolean;
  activeStatus: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  userId: string;
  name: string;
  phone: string;
  roleInOrg: 'manager' | 'agent' | 'assistant';
  isActive: boolean;
  assignedListingCount: number;
  joinedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  commercialRegNo: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  isVerified: boolean;
  verifiedAt?: string;
  managerId: string;
  managerName: string;
  members: OrgMember[];
  logoUrl?: string;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  requestType: 'individual_advertiser' | 'organization' | 'property_deed';
  targetId: string;
  targetName: string;
  submittedBy: string;
  submittedByPhone: string;
  status: 'pending' | 'under_review' | 'needs_info' | 'approved' | 'rejected';
  documents: PrivateDocument[];
  moderatorNotes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ReportCase {
  id: string;
  caseNumber: string;
  listingId: string;
  listingTitle: string;
  listingSnapshotPrice: string;
  listingSnapshotAdvertiser: string;
  
  // سرية هوية المبلغ - لا تكشف للمعلن
  reporterName: string;
  reporterPhone: string;
  reporterConfidentialNotes?: string;
  
  reason: 'false_information' | 'duplicate_listing' | 'price_fraud' | 'unauthorized_seller' | 'offensive_content' | 'already_sold';
  details: string;
  evidenceUrls?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'advertiser_contacted' | 'resolved_ad_suspended' | 'dismissed';
  resolutionReason?: string;
  assignedOfficer?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  subject: string;
  category: 'account' | 'listing_issue' | 'verification' | 'technical' | 'inquiry';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  messages: {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: 'user' | 'support';
    text: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetType: 'listing' | 'user' | 'organization' | 'verification' | 'report' | 'ticket' | 'system_setting';
  targetId: string;
  result: 'success' | 'warning' | 'denied';
  details: string;
}

export interface GovernorateData {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  cities: {
    name: string;
    districts: string[];
  }[];
}
