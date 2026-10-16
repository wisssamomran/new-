import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db } from './src/server/db';
import {
  authMiddleware,
  requireRoles,
  validateYemeniPhone,
  sanitizeListingForUser,
  recordAuditLog
} from './src/server/rbac';
import {
  Listing,
  ListingStatus,
  UserRole,
  VerificationBadge,
  VerificationRequest,
  ReportCase,
  SupportTicket
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body Parsers & CORS/Headers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Authentication & Role Resolver Middleware
app.use(authMiddleware);

// ==========================================
// 1. AUTHENTICATION & ROLE SWITCHER APIS
// ==========================================

// Get Current User Profile & Authenticated Role
app.get('/api/auth/me', (req: Request, res: Response) => {
  return res.json({
    user: req.currentUser,
    role: req.currentUser.role,
    authenticated: req.currentUser.role !== 'visitor'
  });
});

// Switch Role Simulator Endpoint
app.post('/api/auth/switch-role', (req: Request, res: Response) => {
  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ error: 'الدور مطلوب' });
  }

  const allUsers = db.getUsers();
  const targetUser = allUsers.find(u => u.role === role);

  if (!targetUser) {
    return res.status(404).json({ error: 'الدور المحدد غير موجود في سجل المستخدمين' });
  }

  recordAuditLog(
    targetUser,
    'تبديل دور الجلسة عبر المحاكي',
    'user',
    targetUser.id,
    'success',
    `تم تبديل دور الجلسة النشطة إلى: [${role}] - ${targetUser.name}`
  );

  return res.json({
    message: 'تم تبديل الدور بنجاح',
    user: targetUser
  });
});

// Simulate User Login / Phone Verification
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { phone, role = 'seeker', name } = req.body;

  if (phone) {
    const phoneCheck = validateYemeniPhone(phone);
    if (!phoneCheck.isValid) {
      return res.status(422).json({ error: phoneCheck.error });
    }
  }

  const allUsers = db.getUsers();
  let user = allUsers.find(u => u.role === role);

  if (!user) {
    user = {
      id: `usr-${Date.now()}`,
      name: name || 'مستخدم مسجل',
      phone: phone || '+967 770 000 000',
      phoneVerified: true,
      role: role as UserRole,
      activeStatus: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
  }

  recordAuditLog(
    user,
    'تسجيل الدخول للمنصة',
    'user',
    user.id,
    'success',
    `تسجيل دخول ناجح برقم هاتف موثق للمستخدم ${user.name}`
  );

  return res.json({
    message: 'تم تسجيل الدخول بنجاح',
    user
  });
});

// ==========================================
// 2. REAL ESTATE LISTINGS APIS
// ==========================================

// Get All Public Listings (Filtered & Sanitized with Geolocation Fuzzing)
app.get('/api/listings', (req: Request, res: Response) => {
  const { purpose, propertyType, governorate, status, search } = req.query;
  const listings = db.getListings();

  let filtered = listings;

  // By default, general public only sees 'published' listings
  const isPrivileged = ['system_admin', 'moderator', 'verifier'].includes(req.currentUser.role);
  if (!isPrivileged) {
    filtered = filtered.filter(l => l.status === 'published');
  } else if (status) {
    filtered = filtered.filter(l => l.status === status);
  }

  if (purpose && purpose !== 'all') {
    filtered = filtered.filter(l => l.purpose === purpose);
  }

  if (propertyType && propertyType !== 'all') {
    filtered = filtered.filter(l => l.propertyType === propertyType);
  }

  if (governorate && governorate !== 'all') {
    const govStr = String(governorate).trim();
    filtered = filtered.filter(l => {
      const g = l.location.governorate;
      if (govStr.includes('صنعاء')) return g.includes('صنعاء');
      if (govStr.includes('إب') || govStr.includes('اب')) return g.includes('إب') || g.includes('اب');
      if (govStr.includes('ذمار')) return g.includes('ذمار');
      if (govStr.includes('عدن')) return g.includes('عدن');
      if (govStr.includes('تعز')) return g.includes('تعز');
      if (govStr.includes('حضرموت')) return g.includes('حضرموت');
      if (govStr.includes('مأرب') || govStr.includes('مارب')) return g.includes('مأرب') || g.includes('مارب');
      return g.includes(govStr);
    });
  }

  if (search && typeof search === 'string' && search.trim()) {
    const s = search.toLowerCase().trim();
    filtered = filtered.filter(l =>
      l.title.toLowerCase().includes(s) ||
      l.description.toLowerCase().includes(s) ||
      l.location.district.toLowerCase().includes(s) ||
      l.location.city.toLowerCase().includes(s) ||
      l.listingNumber.toLowerCase().includes(s)
    );
  }

  // Sanitize all listings according to requester permissions
  const sanitized = filtered.map(l => sanitizeListingForUser(l, req.currentUser));
  return res.json({ listings: sanitized, count: sanitized.length });
});

// Get My Ads (For Advertisers, Org Managers, and Agents)
app.get(
  '/api/listings/my-ads',
  requireRoles('advertiser', 'org_manager', 'org_agent', 'system_admin'),
  (req: Request, res: Response) => {
    const allListings = db.getListings();
    let myListings: Listing[];

    if (req.currentUser.role === 'system_admin') {
      myListings = allListings;
    } else if (req.currentUser.role === 'org_manager') {
      // Manager sees listings of their organization or listings created by them
      myListings = allListings.filter(
        l => l.advertiser.id === req.currentUser.id || (req.currentUser.orgId && l.advertiser.orgId === req.currentUser.orgId)
      );
    } else if (req.currentUser.role === 'org_agent') {
      // Agent sees listings assigned to them or created by them
      myListings = allListings.filter(
        l => l.assignedAgentId === req.currentUser.id || l.advertiser.id === req.currentUser.id
      );
    } else {
      // Individual advertiser
      myListings = allListings.filter(l => l.advertiser.id === req.currentUser.id);
    }

    return res.json({ listings: myListings });
  }
);

// Get Single Listing By ID
app.get('/api/listings/:id', (req: Request, res: Response) => {
  const listing = db.getListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'العقار غير موجود' });
  }

  // Record view count
  db.updateListing(listing.id, { viewsCount: (listing.viewsCount || 0) + 1 });

  const sanitized = sanitizeListingForUser(listing, req.currentUser);
  return res.json({ listing: sanitized });
});

// Create New Listing (Business Rules: Phone Validation + No Self-Approval + Initial Under Review)
app.post(
  '/api/listings',
  requireRoles('advertiser', 'org_manager', 'org_agent', 'seeker', 'system_admin'),
  (req: Request, res: Response) => {
    const data = req.body;

    // 1. Mandatory Yemeni Phone Number Check
    const advertiserPhone = data.advertiser?.phone || req.currentUser.phone;
    const phoneCheck = validateYemeniPhone(advertiserPhone);
    if (!phoneCheck.isValid) {
      return res.status(422).json({
        error: phoneCheck.error,
        field: 'phone'
      });
    }

    // 2. Strict Business Rule: Advertisers cannot self-approve listings to published
    let targetStatus: ListingStatus = 'under_review';
    if (data.status === 'draft') {
      targetStatus = 'draft';
    } else if (data.status === 'published') {
      if (req.currentUser.role !== 'system_admin' && req.currentUser.role !== 'moderator') {
        recordAuditLog(
          req.currentUser,
          'محاولة اعتماد ذاتي للإعلان',
          'listing',
          'new',
          'denied',
          'المعلن حاول نشر الإعلان ذاتياً مباشرة دون مراجعة المشرف، تم تحويله قسراً للمراجعة.'
        );
        targetStatus = 'under_review';
      } else {
        targetStatus = 'published';
      }
    }

    const nextSeq = db.getListings().length + 101;
    const listingNumber = `YEM-2026-${nextSeq}`;
    const now = new Date().toISOString().split('T')[0];

    const newListing: Listing = {
      propertyType: data.propertyType || 'apartment',
      purpose: data.purpose || 'sale',
      currency: data.currency || 'YER',
      price: typeof data.price === 'number' ? data.price : 0,
      area: typeof data.area === 'number' ? data.area : 0,
      areaUnit: data.areaUnit || 'م²',
      isNegotiable: Boolean(data.isNegotiable),
      title: data.title || 'عقار جديد',
      description: data.description || '',
      attributes: data.attributes || {},
      verificationBadges: Array.isArray(data.verificationBadges) ? data.verificationBadges : [],
      privateDocuments: Array.isArray(data.privateDocuments) ? data.privateDocuments : undefined,
      ...data,
      id: `list-${Date.now()}`,
      listingNumber,
      status: targetStatus,
      images: (Array.isArray(data.images) && data.images.length > 0)
        ? data.images
        : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'],
      location: {
        governorate: data.location?.governorate || 'صنعاء (أمانة العاصمة)',
        city: data.location?.city || 'صنعاء',
        district: data.location?.district || 'الأمانة',
        street: data.location?.street || '',
        lat: typeof data.location?.lat === 'number' ? data.location.lat : 15.312,
        lng: typeof data.location?.lng === 'number' ? data.location.lng : 44.187,
        isApproximate: data.location?.isApproximate ?? true
      },
      advertiser: {
        ...data.advertiser,
        id: req.currentUser.id,
        name: req.currentUser.name,
        phone: phoneCheck.normalized,
        phoneVerified: true,
        type: req.currentUser.role === 'org_manager' || req.currentUser.role === 'org_agent' ? 'organization' : 'individual',
        orgId: req.currentUser.orgId,
        orgName: req.currentUser.orgName
      },
      viewsCount: 0,
      favoritesCount: 0,
      createdAt: now,
      updatedAt: now,
      statusTimeline: [
        {
          status: targetStatus,
          timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }),
          changedBy: req.currentUser.name,
          userRole: req.currentUser.role,
          notes: targetStatus === 'draft' ? 'حفظ كمسودة' : 'إنشاء الإعلان وإرساله لطابور المراجعة والاعتماد'
        }
      ]
    };

    db.addListing(newListing);

    recordAuditLog(
      req.currentUser,
      'إنشاء إعلان عقاري جديد',
      'listing',
      newListing.id,
      'success',
      `تم إنشاء الإعلان ${listingNumber} بحالة [${targetStatus}] برقم هاتف موثق: ${phoneCheck.normalized}`
    );

    return res.status(201).json({
      message: `تم إنشاء الإعلان بنجاح برقم ${listingNumber}`,
      listing: newListing
    });
  }
);

// Update Listing
app.put(
  '/api/listings/:id',
  requireRoles('advertiser', 'org_manager', 'org_agent', 'system_admin'),
  (req: Request, res: Response) => {
    const existing = db.getListingById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'العقار غير موجود' });
    }

    // Permission check: Only owner or system admin
    const isOwner = existing.advertiser.id === req.currentUser.id;
    const isOrgManager = req.currentUser.role === 'org_manager' && existing.advertiser.orgId === req.currentUser.orgId;
    const isSysAdmin = req.currentUser.role === 'system_admin';

    if (!isOwner && !isOrgManager && !isSysAdmin) {
      return res.status(403).json({ error: 'غير مصرح لك بتعديل هذا الإعلان' });
    }

    const updates = req.body;

    // Check phone if provided in updates
    if (updates.advertiser?.phone) {
      const phoneCheck = validateYemeniPhone(updates.advertiser.phone);
      if (!phoneCheck.isValid) {
        return res.status(422).json({ error: phoneCheck.error });
      }
      updates.advertiser.phone = phoneCheck.normalized;
    }

    // Business Rule: If an ad was in 'needs_changes' and updated by advertiser, re-route to 'under_review'
    let newStatus = existing.status;
    if (existing.status === 'needs_changes' && req.currentUser.role !== 'system_admin') {
      newStatus = 'under_review';
    }

    // Prohibit self-publishing
    if (updates.status === 'published' && req.currentUser.role !== 'system_admin' && req.currentUser.role !== 'moderator') {
      delete updates.status;
    }

    const updated = db.updateListing(existing.id, {
      ...updates,
      status: newStatus
    });

    recordAuditLog(
      req.currentUser,
      'تعديل بيانات إعلان عقاري',
      'listing',
      existing.id,
      'success',
      `تم تحديث بيانات الإعلان ${existing.listingNumber}`
    );

    return res.json({ message: 'تم تحديث الإعلان بنجاح', listing: updated });
  }
);

// Delete Listing
app.delete(
  '/api/listings/:id',
  requireRoles('advertiser', 'org_manager', 'system_admin'),
  (req: Request, res: Response) => {
    const existing = db.getListingById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'العقار غير موجود' });
    }

    const isOwner = existing.advertiser.id === req.currentUser.id;
    const isSysAdmin = req.currentUser.role === 'system_admin';

    if (!isOwner && !isSysAdmin) {
      return res.status(403).json({ error: 'غير مصرح لك بحذف هذا الإعلان' });
    }

    db.deleteListing(existing.id);

    recordAuditLog(
      req.currentUser,
      'حذف إعلان عقاري',
      'listing',
      existing.id,
      'warning',
      `تم حذف الإعلان ${existing.listingNumber} - ${existing.title}`
    );

    return res.json({ message: 'تم حذف الإعلان بنجاح' });
  }
);

// ==========================================
// 3. MODERATION & WORKFLOW STATUS APIS
// ==========================================

// Get Moderation Queue
app.get(
  '/api/moderation/queue',
  requireRoles('moderator', 'system_admin'),
  (req: Request, res: Response) => {
    const listings = db.getListings();
    const queue = listings.filter(
      l => l.status === 'under_review' || l.status === 'needs_changes' || l.status === 'pending_verification'
    );
    return res.json({ queue, count: queue.length });
  }
);

// Change Listing Status (Approve, Reject, Request Changes, Suspend)
app.patch(
  '/api/listings/:id/status',
  requireRoles('moderator', 'system_admin', 'reporter_admin'),
  (req: Request, res: Response) => {
    const { status, reason, notes, missingFields } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'الحالة الجديدة مطلوبة' });
    }

    const existing = db.getListingById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'العقار غير موجود' });
    }

    const timelineEntry = {
      status: status as ListingStatus,
      timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }),
      changedBy: req.currentUser.name,
      userRole: req.currentUser.role,
      reason,
      notes,
      missingFields
    };

    const updated = db.updateListing(existing.id, {
      status,
      statusTimeline: [timelineEntry, ...existing.statusTimeline]
    });

    recordAuditLog(
      req.currentUser,
      `تحديث حالة الإعلان إلى [${status}]`,
      'listing',
      existing.id,
      'success',
      `تم تغيير حالة الإعلان ${existing.listingNumber} إلى ${status}. ${reason ? 'السبب: ' + reason : ''}`
    );

    return res.json({
      message: `تم تحديث حالة الإعلان إلى ${status}`,
      listing: updated
    });
  }
);

// ==========================================
// 4. VERIFICATION & BADGE APIS
// ==========================================

// Get All Verification Requests
app.get(
  '/api/verifications',
  requireRoles('verifier', 'system_admin'),
  (req: Request, res: Response) => {
    return res.json({ verifications: db.getVerifications() });
  }
);

// Submit Verification Request
app.post(
  '/api/verifications',
  requireRoles('advertiser', 'org_manager', 'system_admin'),
  (req: Request, res: Response) => {
    const { requestType, targetId, targetName, notes } = req.body;

    const newRequest: VerificationRequest = {
      id: `ver-${Date.now()}`,
      requestType,
      targetId,
      targetName,
      submittedBy: req.currentUser.name,
      submittedByPhone: req.currentUser.phone,
      status: 'under_review',
      documents: [],
      moderatorNotes: notes,
      createdAt: new Date().toISOString().split('T')[0]
    };

    db.addVerification(newRequest);

    recordAuditLog(
      req.currentUser,
      'تقديم طلب توثيق رسمي',
      'verification',
      newRequest.id,
      'success',
      `طلب توثيق نوع [${requestType}] للهدف: ${targetName}`
    );

    return res.status(201).json({
      message: 'تم استلام طلب التوثيق وسيقوم المسؤول بمراجعته',
      verification: newRequest
    });
  }
);

// Approve or Reject Verification (Grant Official Badges)
app.patch(
  '/api/verifications/:id',
  requireRoles('verifier', 'system_admin'),
  (req: Request, res: Response) => {
    const { status, badgeType, validityNote } = req.body;
    const existing = db.getVerifications().find(v => v.id === req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'طلب التحقق غير موجود' });
    }

    const updated = db.updateVerification(existing.id, {
      status,
      reviewedBy: req.currentUser.name,
      reviewedAt: new Date().toISOString().split('T')[0]
    });

    // If approved, attach verification badge to target listing or organization
    if (status === 'approved' && badgeType) {
      if (existing.requestType === 'property_deed') {
        const listing = db.getListingById(existing.targetId);
        if (listing) {
          const badge: VerificationBadge = {
            type: 'deed_reviewed',
            label: 'صك ملكية مفحوص (بصيرة)',
            description: 'تم فحص أصل البصيرة وسندات الملكية ومطابقتها قانونياً عبر طاقم التحقق.',
            verifiedAt: new Date().toISOString().split('T')[0],
            verifiedBy: req.currentUser.name,
            validityNote: validityNote || 'سارية ومطابقة',
            disclaimer: 'إخلاء مسؤولية: لا يعتبر هذا الفحص بديلاً عن التحري لدى الأمين الشرعي أو السجل العقاري.'
          };
          db.updateListing(listing.id, {
            verificationBadges: [badge, ...(listing.verificationBadges || [])]
          });
        }
      } else if (existing.requestType === 'organization') {
        const org = db.getOrganizationById(existing.targetId);
        if (org) {
          db.updateOrganization(org.id, {
            isVerified: true,
            verifiedAt: new Date().toISOString().split('T')[0]
          });
        }
      }
    }

    recordAuditLog(
      req.currentUser,
      `اتخاذ قرار بالتحقق [${status}]`,
      'verification',
      existing.id,
      'success',
      `طلب التحقق ${existing.targetName} تم تحويله إلى ${status}`
    );

    return res.json({ message: `تم تحديث الطلب إلى ${status}`, verification: updated });
  }
);

// ==========================================
// 5. ORGANIZATIONS MANAGEMENT APIS
// ==========================================

// Get All Organizations
app.get('/api/organizations', (req: Request, res: Response) => {
  return res.json({ organizations: db.getOrganizations() });
});

// Update Organization Profile
app.put(
  '/api/organizations/:id',
  requireRoles('org_manager', 'system_admin'),
  (req: Request, res: Response) => {
    const org = db.getOrganizationById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'المنشأة غير موجودة' });
    }

    if (req.currentUser.role !== 'system_admin' && org.managerId !== req.currentUser.id) {
      return res.status(403).json({ error: 'غير مصرح لك بتعديل بيانات هذه المنشأة' });
    }

    const updated = db.updateOrganization(org.id, req.body);
    recordAuditLog(
      req.currentUser,
      'تحديث بيانات المنشأة العقارية',
      'organization',
      org.id,
      'success',
      `تحديث ملف المنشأة ${org.name}`
    );

    return res.json({ message: 'تم تحديث بيانات المنشأة بنجاح', organization: updated });
  }
);

// ==========================================
// 6. REPORTS & DISPUTES APIS
// ==========================================

// Get All Reports
app.get(
  '/api/reports',
  requireRoles('reporter_admin', 'system_admin'),
  (req: Request, res: Response) => {
    return res.json({ reports: db.getReports() });
  }
);

// Submit New Report
app.post('/api/reports', (req: Request, res: Response) => {
  const { listingId, listingTitle, reasonCategory, description } = req.body;
  if (!listingId || !description) {
    return res.status(400).json({ error: 'بيانات البلاغ غير مكتملة' });
  }

  const newReport: ReportCase = {
    id: `rep-${Date.now()}`,
    caseNumber: `REP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    listingId,
    listingTitle: listingTitle || 'عقار يمني',
    listingSnapshotPrice: 'غير محدد',
    listingSnapshotAdvertiser: 'معلن منصة',
    reporterName: req.currentUser.name,
    reporterPhone: req.currentUser.phone || 'غير مسجل',
    reason: (reasonCategory as ReportCase['reason']) || 'false_information',
    details: description,
    priority: 'medium',
    status: 'new',
    createdAt: new Date().toISOString().split('T')[0]
  };

  db.addReport(newReport);

  recordAuditLog(
    req.currentUser,
    'تقديم بلاغ جديد ضد إعلان',
    'report',
    newReport.id,
    'warning',
    `بلاغ ضد الإعلان ${listingId} بسبب: ${reasonCategory || 'مخالفة'}`
  );

  return res.status(201).json({
    message: 'تم استلام بلاغك وسيقوم فريق النزاعات بالتحقق الفوري',
    report: newReport
  });
});

// Update Report Action
app.patch(
  '/api/reports/:id',
  requireRoles('reporter_admin', 'system_admin'),
  (req: Request, res: Response) => {
    const { status, resolutionNotes } = req.body;
    const existing = db.getReports().find(r => r.id === req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'البلاغ غير موجود' });
    }

    const updated = db.updateReport(existing.id, {
      status,
      resolutionReason: resolutionNotes,
      resolvedAt: new Date().toISOString().split('T')[0]
    });

    // If report accepted & action taken, suspend the listing
    if (status === 'resolved_ad_suspended' && existing.listingId) {
      db.updateListing(existing.listingId, { status: 'suspended' });
    }

    recordAuditLog(
      req.currentUser,
      `معالجة البلاغ [${status}]`,
      'report',
      existing.id,
      'success',
      `تم إغلاق البلاغ بحالة ${status}. الملاحظات: ${resolutionNotes || 'بدون'}`
    );

    return res.json({ message: 'تم اتخاذ الإجراء بنجاح', report: updated });
  }
);

// ==========================================
// 7. SUPPORT TICKETS APIS
// ==========================================

// Get Tickets
app.get('/api/support/tickets', (req: Request, res: Response) => {
  const allTickets = db.getTickets();
  const isStaff = req.currentUser.role === 'support' || req.currentUser.role === 'system_admin';

  if (isStaff) {
    return res.json({ tickets: allTickets });
  }

  // Regular user only sees their own tickets
  const myTickets = allTickets.filter(
    t => t.userName === req.currentUser.name || t.userPhone === req.currentUser.phone || t.userId === req.currentUser.id
  );
  return res.json({ tickets: myTickets });
});

// Create Support Ticket
app.post('/api/support/tickets', (req: Request, res: Response) => {
  const { subject, category, priority = 'medium', message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'موضوع التذكرة والرسالة مطلوبان' });
  }

  const now = new Date().toISOString().split('T')[0];
  const isSupport = req.currentUser.role === 'support' || req.currentUser.role === 'system_admin';
  const senderRole: 'user' | 'support' = isSupport ? 'support' : 'user';

  const newTicket: SupportTicket = {
    id: `tkt-${Date.now()}`,
    ticketNumber: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
    userId: req.currentUser.id,
    userName: req.currentUser.name,
    userPhone: req.currentUser.phone || '+967 770 000 000',
    subject,
    category: category || 'inquiry',
    priority,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `msg-${Date.now()}`,
        senderId: req.currentUser.id,
        senderName: req.currentUser.name,
        senderRole,
        text: message,
        timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
      }
    ]
  };

  db.addTicket(newTicket);
  recordAuditLog(
    req.currentUser,
    'إنشاء تذكرة دعم فني',
    'ticket',
    newTicket.id,
    'success',
    `تذكرة رقم ${newTicket.ticketNumber}: ${subject}`
  );

  return res.status(201).json({ message: 'تم فتح التذكرة بنجاح', ticket: newTicket });
});

// Reply to Ticket
app.post('/api/support/tickets/:id/messages', (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'نص الرد مطلوب' });
  }

  const ticket = db.getTickets().find(t => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'التذكرة غير موجودة' });
  }

  const isSupport = req.currentUser.role === 'support' || req.currentUser.role === 'system_admin';
  const senderRole: 'user' | 'support' = isSupport ? 'support' : 'user';

  const newMessage = {
    id: `msg-${Date.now()}`,
    senderId: req.currentUser.id,
    senderName: req.currentUser.name,
    senderRole,
    text: message,
    timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
  };

  const updated = db.updateTicket(ticket.id, {
    updatedAt: new Date().toISOString().split('T')[0],
    messages: [...ticket.messages, newMessage]
  });

  return res.json({ message: 'تم إرسال الرد بنجاح', ticket: updated });
});

// ==========================================
// 8. AUDIT LOGS APIS (System Admin Only)
// ==========================================

app.get(
  '/api/audit-logs',
  requireRoles('system_admin'),
  (req: Request, res: Response) => {
    const logs = db.getAuditLogs();
    return res.json({ logs, count: logs.length });
  }
);

// System Health Check
app.get('/api/health', (req: Request, res: Response) => {
  return res.json({
    status: 'healthy',
    platform: 'Dalani Yemen Real Estate API',
    timestamp: new Date().toISOString(),
    databaseListingsCount: db.getListings().length
  });
});

// ==========================================
// 9. CLIENT SERVING (Vite Dev & Production)
// ==========================================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In development mode, dynamically hook Vite middlewares into Express
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT
      },
      appType: 'spa'
    });

    app.use(vite.middlewares);
    console.log('[Dalani Server] Vite middlewares mounted for fast SPA development.');
  } else {
    // In production, serve pre-built assets from /dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 [Dalani Engine] Full-Stack Server Running on Port ${PORT}`);
    console.log(`📡 API Endpoints live at http://0.0.0.0:${PORT}/api/*`);
    console.log(`🔒 RBAC & Geolocation Privacy Enforcement: ACTIVE`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('[Dalani Server] Fatal error starting server:', err);
  process.exit(1);
});
