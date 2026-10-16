import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Listing,
  User,
  UserRole,
  VerificationRequest,
  ReportCase,
  SupportTicket,
  AuditLogEntry,
  Organization,
  ListingStatus
} from '../types';
import {
  INITIAL_LISTINGS,
  INITIAL_ORGANIZATIONS,
  INITIAL_VERIFICATION_REQUESTS,
  INITIAL_REPORTS,
  INITIAL_TICKETS,
  INITIAL_AUDIT_LOGS,
  MOCK_USERS
} from '../data/yemenData';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppContextType {
  currentUser: User;
  setCurrentUserRole: (role: UserRole) => void;
  listings: Listing[];
  organizations: Organization[];
  verificationRequests: VerificationRequest[];
  reports: ReportCase[];
  tickets: SupportTicket[];
  auditLogs: AuditLogEntry[];
  favorites: string[];
  googleMapsApiKey: string;
  setGoogleMapsApiKey: (key: string) => void;
  
  // Listings CRUD & Transitions
  createListing: (listingData: Omit<Listing, 'id' | 'listingNumber' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'favoritesCount' | 'statusTimeline'>) => Promise<Listing | null>;
  updateListing: (id: string, updates: Partial<Listing>) => Promise<void>;
  deleteListing: (id: string) => Promise<void>;
  changeListingStatus: (id: string, newStatus: ListingStatus, reason?: string, notes?: string, missingFields?: string[]) => Promise<void>;
  toggleFavorite: (listingId: string) => void;
  isFavorite: (listingId: string) => boolean;
  
  // Organization actions
  addOrgMember: (orgId: string, name: string, phone: string, roleInOrg: 'manager' | 'agent' | 'assistant') => void;
  toggleOrgMemberStatus: (orgId: string, memberId: string) => void;
  assignListingToAgent: (listingId: string, agentId: string, agentName: string) => void;
  
  // Verification actions
  submitVerificationRequest: (req: Omit<VerificationRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  reviewVerificationRequest: (id: string, status: 'approved' | 'rejected' | 'needs_info', notes: string) => Promise<void>;
  
  // Reports actions
  submitReport: (report: Omit<ReportCase, 'id' | 'caseNumber' | 'createdAt' | 'status'>) => Promise<void>;
  resolveReport: (id: string, status: 'resolved_ad_suspended' | 'dismissed', resolutionReason: string) => Promise<void>;
  
  // Support actions
  createTicket: (subject: string, category: SupportTicket['category'], priority: SupportTicket['priority'], initialMessage: string) => Promise<void>;
  replyToTicket: (ticketId: string, text: string) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: SupportTicket['status']) => void;
  
  // Audit logger
  logAction: (action: string, targetType: AuditLogEntry['targetType'], targetId: string, result: 'success' | 'warning' | 'denied', details: string) => void;
  
  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  
  // Refresh & Reset
  refreshData: () => Promise<void>;
  resetToInitialData: () => void;
}

export const normalizeListing = (l: any): Listing => {
  return {
    ...l,
    id: l.id || `list-${Date.now()}`,
    listingNumber: l.listingNumber || 'YEM-2026-000',
    title: l.title || 'عقار معروض',
    description: l.description || '',
    propertyType: l.propertyType || 'apartment',
    purpose: l.purpose || 'sale',
    status: l.status || 'under_review',
    price: typeof l.price === 'number' ? l.price : 0,
    currency: l.currency || 'YER',
    isNegotiable: Boolean(l.isNegotiable),
    area: typeof l.area === 'number' ? l.area : 0,
    areaUnit: l.areaUnit || 'م²',
    images: (Array.isArray(l.images) && l.images.length > 0)
      ? l.images
      : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'],
    location: {
      governorate: l.location?.governorate || 'صنعاء (أمانة العاصمة)',
      city: l.location?.city || 'صنعاء',
      district: l.location?.district || 'الأمانة',
      street: l.location?.street || '',
      lat: typeof l.location?.lat === 'number' ? l.location.lat : 15.312,
      lng: typeof l.location?.lng === 'number' ? l.location.lng : 44.187,
      isApproximate: l.location?.isApproximate ?? true
    },
    attributes: l.attributes || {},
    advertiser: {
      id: l.advertiser?.id || 'adv-unknown',
      name: l.advertiser?.name || 'معلن دلنّي',
      type: l.advertiser?.type || 'individual',
      phone: l.advertiser?.phone || '777000000',
      phoneVerified: l.advertiser?.phoneVerified ?? true,
      allowWhatsapp: l.advertiser?.allowWhatsapp ?? true,
      allowCall: l.advertiser?.allowCall ?? true,
      orgId: l.advertiser?.orgId,
      orgName: l.advertiser?.orgName
    },
    verificationBadges: Array.isArray(l.verificationBadges) ? l.verificationBadges : [],
    statusTimeline: Array.isArray(l.statusTimeline) ? l.statusTimeline : [],
    viewsCount: typeof l.viewsCount === 'number' ? l.viewsCount : 0,
    favoritesCount: typeof l.favoritesCount === 'number' ? l.favoritesCount : 0,
    createdAt: l.createdAt || new Date().toISOString().split('T')[0],
    updatedAt: l.updatedAt || new Date().toISOString().split('T')[0]
  };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current active user / role
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('dalani_current_user');
    return saved ? JSON.parse(saved) : MOCK_USERS['visitor'];
  });

  // Main collections
  const [listings, setListings] = useState<Listing[]>(() => {
    try {
      const saved = localStorage.getItem('dalani_listings');
      const raw = saved ? JSON.parse(saved) : INITIAL_LISTINGS;
      return Array.isArray(raw) ? raw.map(normalizeListing) : INITIAL_LISTINGS.map(normalizeListing);
    } catch {
      return INITIAL_LISTINGS.map(normalizeListing);
    }
  });

  const [organizations, setOrganizations] = useState<Organization[]>(() => {
    const saved = localStorage.getItem('dalani_orgs');
    return saved ? JSON.parse(saved) : INITIAL_ORGANIZATIONS;
  });

  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>(() => {
    const saved = localStorage.getItem('dalani_verifications');
    return saved ? JSON.parse(saved) : INITIAL_VERIFICATION_REQUESTS;
  });

  const [reports, setReports] = useState<ReportCase[]>(() => {
    const saved = localStorage.getItem('dalani_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem('dalani_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('dalani_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('dalani_favorites');
    return saved ? JSON.parse(saved) : ['list-101', 'list-103'];
  });

  const [googleMapsApiKey, setGoogleMapsApiKeyState] = useState<string>(() => {
    return localStorage.getItem('dalani_gmaps_key') || (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Helper for authenticated server requests
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'x-user-role': currentUser.role,
      'Authorization': `Bearer ${currentUser.id}`,
      ...(options.headers || {})
    };
    try {
      const res = await fetch(url, { ...options, headers });
      return res;
    } catch (err) {
      console.warn(`[Dalani API] Network error for ${url}:`, err);
      return null;
    }
  }, [currentUser]);

  // Sync data from Server API
  const refreshData = useCallback(async () => {
    try {
      const res = await apiFetch('/api/listings');
      if (res && res.ok) {
        const data = await res.json();
        if (data.listings && Array.isArray(data.listings)) {
          const normalized = data.listings.map(normalizeListing);
          setListings(normalized);
          localStorage.setItem('dalani_listings', JSON.stringify(normalized));
        }
      }

      // If privileged role, load audit logs
      if (currentUser.role === 'system_admin') {
        const auditRes = await apiFetch('/api/audit-logs');
        if (auditRes && auditRes.ok) {
          const auditData = await auditRes.json();
          if (auditData.logs) {
            setAuditLogs(auditData.logs);
          }
        }
      }
    } catch (e) {
      console.warn('[Dalani Client] Server sync fallback to local cache:', e);
    }
  }, [apiFetch, currentUser.role]);

  // Initial load and whenever role changes
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Local storage backup sync
  useEffect(() => {
    localStorage.setItem('dalani_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('dalani_listings', JSON.stringify(listings));
  }, [listings]);

  useEffect(() => {
    localStorage.setItem('dalani_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const setGoogleMapsApiKey = (key: string) => {
    setGoogleMapsApiKeyState(key);
    localStorage.setItem('dalani_gmaps_key', key);
    showToast('تم تحديث مفتاح Google Maps API بنجاح', 'success');
  };

  // Switch role simulator
  const setCurrentUserRole = async (role: UserRole) => {
    const user = MOCK_USERS[role] || {
      id: `usr-${role}-${Date.now()}`,
      name: `مستخدم تجريبي (${role})`,
      phone: '+967 770 000 000',
      phoneVerified: true,
      role: role,
      activeStatus: true,
      createdAt: new Date().toISOString()
    };

    setCurrentUser(user);

    // Notify backend
    try {
      await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
    } catch (e) {
      // offline fallback
    }

    logAction('تبديل دور المستخدم', 'user', user.id, 'success', `تم التبديل إلى دور: [${role}]`);
    showToast(`تم التبديل إلى دور: ${user.name}`, 'info');
  };

  const logAction = (
    action: string,
    targetType: AuditLogEntry['targetType'],
    targetId: string,
    result: 'success' | 'warning' | 'denied',
    details: string
  ) => {
    const newEntry: AuditLogEntry = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      targetType,
      targetId,
      result,
      details
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  // --- Listings Operations ---
  const createListing = async (
    data: Omit<Listing, 'id' | 'listingNumber' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'favoritesCount' | 'statusTimeline'>
  ): Promise<Listing | null> => {
    try {
      const res = await apiFetch('/api/listings', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (res) {
        const json = await res.json();
        if (!res.ok) {
          showToast(json.error || 'تعذر إنشاء الإعلان', 'error');
          return null;
        }

        const newListing: Listing = normalizeListing(json.listing);
        setListings(prev => [newListing, ...prev]);
        showToast(json.message || `تم حفظ الإعلان بنجاح برقم: ${newListing.listingNumber}`, 'success');
        return newListing;
      }
    } catch (err) {
      console.warn('API error during createListing, fallback to local creation:', err);
    }

    // Fallback local logic if server offline
    const nextSeq = listings.length + 101;
    const listingNumber = `YEM-2026-${nextSeq}`;
    const now = new Date().toISOString().split('T')[0];
    const initialStatus: ListingStatus = data.status || 'under_review';

    const fallbackListing: Listing = normalizeListing({
      ...data,
      id: 'list-' + Date.now(),
      listingNumber,
      status: initialStatus,
      viewsCount: 0,
      favoritesCount: 0,
      createdAt: now,
      updatedAt: now,
      statusTimeline: [
        {
          status: initialStatus,
          timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }),
          changedBy: currentUser.name,
          userRole: currentUser.role,
          notes: 'إنشاء الإعلان وإرساله للمراجعة'
        }
      ]
    });

    setListings(prev => [fallbackListing, ...prev]);
    showToast(`تم حفظ الإعلان بنجاح برقم: ${listingNumber}`, 'success');
    return fallbackListing;
  };

  const updateListing = async (id: string, updates: Partial<Listing>) => {
    try {
      const res = await apiFetch(`/api/listings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (res && !res.ok) {
        const json = await res.json();
        showToast(json.error || 'تعذر تحديث الإعلان', 'error');
        return;
      }
    } catch (e) {
      // offline fallback
    }

    setListings(prev =>
      prev.map(l => (l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : l))
    );
    showToast('تم تحديث بيانات الإعلان بنجاح', 'success');
  };

  const deleteListing = async (id: string) => {
    try {
      await apiFetch(`/api/listings/${id}`, { method: 'DELETE' });
    } catch (e) {
      // offline fallback
    }

    const listing = listings.find(l => l.id === id);
    setListings(prev => prev.filter(l => l.id !== id));
    logAction('حذف إعلان', 'listing', id, 'warning', `تم حذف الإعلان: ${listing?.title || id}`);
    showToast('تم حذف الإعلان', 'info');
  };

  const changeListingStatus = async (
    id: string,
    newStatus: ListingStatus,
    reason?: string,
    notes?: string,
    missingFields?: string[]
  ) => {
    // Client-side guard check
    if (currentUser.role === 'advertiser' && newStatus === 'published') {
      logAction('محاولة غير مصرح بها', 'listing', id, 'denied', 'المعلن لا يملك صلاحية اعتماد إعلانه بنفسه');
      showToast('غير مصرح للمعلن باعتماد الإعلان بنفسه، يتطلب مراجعة المشرف', 'error');
      return;
    }

    try {
      const res = await apiFetch(`/api/listings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, reason, notes, missingFields })
      });

      if (res && !res.ok) {
        const json = await res.json();
        showToast(json.error || 'تعذر تغيير حالة الإعلان', 'error');
        return;
      }
    } catch (e) {
      // offline fallback
    }

    const timelineEntry = {
      status: newStatus,
      timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' }),
      changedBy: currentUser.name,
      userRole: currentUser.role,
      reason,
      notes,
      missingFields
    };

    setListings(prev =>
      prev.map(l => {
        if (l.id === id) {
          return {
            ...l,
            status: newStatus,
            updatedAt: new Date().toISOString().split('T')[0],
            statusTimeline: [timelineEntry, ...l.statusTimeline]
          };
        }
        return l;
      })
    );

    logAction(
      `تغيير حالة إعلان إلى ${newStatus}`,
      'listing',
      id,
      'success',
      reason ? `السبب: ${reason}` : `تم التحويل بواسطة ${currentUser.name}`
    );
    showToast(`تم تحديث حالة الإعلان إلى: ${newStatus}`, 'success');
  };

  const toggleFavorite = (listingId: string) => {
    if (currentUser.role === 'visitor') {
      showToast('يجب تسجيل الدخول أو إنشاء حساب لحفظ العقارات في مفضلتك', 'warning');
      return;
    }
    setFavorites(prev => {
      const exists = prev.includes(listingId);
      const updated = exists ? prev.filter(id => id !== listingId) : [...prev, listingId];
      showToast(exists ? 'تمت إزالة العقار من المفضلة' : 'تمت إضافة العقار إلى المفضلة', 'info');
      return updated;
    });
  };

  const isFavorite = (listingId: string) => favorites.includes(listingId);

  // --- Organization Actions ---
  const addOrgMember = (orgId: string, name: string, phone: string, roleInOrg: 'manager' | 'agent' | 'assistant') => {
    const newMember = {
      id: 'mem-' + Date.now(),
      userId: 'usr-agent-' + Date.now(),
      name,
      phone,
      roleInOrg,
      isActive: true,
      assignedListingCount: 0,
      joinedAt: new Date().toISOString().split('T')[0]
    };

    setOrganizations(prev =>
      prev.map(org => {
        if (org.id === orgId) {
          return { ...org, members: [...org.members, newMember] };
        }
        return org;
      })
    );

    logAction('إضافة عضو منشأة', 'organization', orgId, 'success', `تمت إضافة العضو ${name} بدور ${roleInOrg}`);
    showToast(`تمت إضافة العضو ${name} بنجاح للمنشأة`, 'success');
  };

  const toggleOrgMemberStatus = (orgId: string, memberId: string) => {
    setOrganizations(prev =>
      prev.map(org => {
        if (org.id === orgId) {
          return {
            ...org,
            members: org.members.map(m => (m.id === memberId ? { ...m, isActive: !m.isActive } : m))
          };
        }
        return org;
      })
    );
    showToast('تم تعديل حالة تفعيل العضو', 'info');
  };

  const assignListingToAgent = (listingId: string, agentId: string, agentName: string) => {
    setListings(prev =>
      prev.map(l => (l.id === listingId ? { ...l, assignedAgentId: agentId, assignedAgentName: agentName } : l))
    );
    logAction('إسناد إعلان إلى موظف', 'listing', listingId, 'success', `تم إسناد الإعلان إلى: ${agentName}`);
    showToast(`تم إسناد الإعلان إلى ${agentName}`, 'success');
  };

  // --- Verification Actions ---
  const submitVerificationRequest = async (req: Omit<VerificationRequest, 'id' | 'createdAt' | 'status'>) => {
    try {
      await apiFetch('/api/verifications', {
        method: 'POST',
        body: JSON.stringify(req)
      });
    } catch (e) {
      // offline fallback
    }

    const newReq: VerificationRequest = {
      ...req,
      id: 'ver-' + Date.now(),
      status: 'under_review',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setVerificationRequests(prev => [newReq, ...prev]);
    showToast('تم تقديم طلب التحقق وسيقوم الفريق بمراجعته قريباً', 'success');
  };

  const reviewVerificationRequest = async (id: string, status: 'approved' | 'rejected' | 'needs_info', notes: string) => {
    try {
      await apiFetch(`/api/verifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes, badgeType: 'deed_reviewed', validityNote: notes })
      });
    } catch (e) {
      // offline fallback
    }

    setVerificationRequests(prev =>
      prev.map(v =>
        v.id === id
          ? {
              ...v,
              status,
              moderatorNotes: notes,
              reviewedBy: currentUser.name,
              reviewedAt: new Date().toISOString().split('T')[0]
            }
          : v
      )
    );

    const targetReq = verificationRequests.find(v => v.id === id);
    if (status === 'approved' && targetReq?.requestType === 'property_deed') {
      setListings(prev =>
        prev.map(l => {
          if (l.id === targetReq.targetId) {
            const hasDeedBadge = l.verificationBadges.some(b => b.type === 'deed_reviewed');
            if (!hasDeedBadge) {
              return {
                ...l,
                verificationBadges: [
                  ...l.verificationBadges,
                  {
                    type: 'deed_reviewed',
                    label: 'وثيقة البصيرة راجعها الفريق',
                    description: 'تمت مراجعة الوثيقة الثبوتية للبصيرة الشرعية للأرض أو العقار.',
                    verifiedAt: new Date().toISOString().split('T')[0],
                    verifiedBy: currentUser.name,
                    validityNote: 'مراجعة سارية ومطابقة',
                    disclaimer: 'المراجعة لا تُغني عن التحري الميداني في المحكمة وسؤال الجيران.'
                  }
                ]
              };
            }
          }
          return l;
        })
      );
    }

    showToast(`تم تسجيل قرار التحقق: ${status}`, 'success');
  };

  // --- Reports Actions ---
  const submitReport = async (report: Omit<ReportCase, 'id' | 'caseNumber' | 'createdAt' | 'status'>) => {
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify(report)
      });
    } catch (e) {
      // offline fallback
    }

    const nextCaseNo = `REP-2026-00${reports.length + 50}`;
    const newReport: ReportCase = {
      ...report,
      id: 'rep-' + Date.now(),
      caseNumber: nextCaseNo,
      status: 'new',
      createdAt: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })
    };
    setReports(prev => [newReport, ...prev]);
    showToast('تم استلام بلاغك وسيقوم فريق النزاعات بالتحقق الفوري', 'info');
  };

  const resolveReport = async (id: string, status: 'resolved_ad_suspended' | 'dismissed', resolutionReason: string) => {
    try {
      await apiFetch(`/api/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: status === 'resolved_ad_suspended' ? 'action_taken' : 'dismissed', resolutionNotes: resolutionReason })
      });
    } catch (e) {
      // offline fallback
    }

    setReports(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status,
              resolutionReason,
              resolvedAt: new Date().toISOString().split('T')[0],
              resolvedBy: currentUser.name
            }
          : r
      )
    );

    if (status === 'resolved_ad_suspended') {
      const rep = reports.find(r => r.id === id);
      if (rep) {
        changeListingStatus(rep.listingId, 'suspended', `إيقاف بموجب البلاغ ${rep.caseNumber}: ${resolutionReason}`);
      }
    }

    showToast('تمت معالجة البلاغ بنجاح', 'success');
  };

  // --- Support Actions ---
  const createTicket = async (
    subject: string,
    category: SupportTicket['category'],
    priority: SupportTicket['priority'],
    initialMessage: string
  ) => {
    try {
      const res = await apiFetch('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject, category, priority, message: initialMessage })
      });
      if (res && res.ok) {
        const json = await res.json();
        if (json.ticket) {
          setTickets(prev => [json.ticket, ...prev]);
          showToast('تم إرسال تذكرتك بنجاح، وسيقوم ممثل الدعم بالرد قريباً', 'success');
          return;
        }
      }
    } catch (e) {
      // offline fallback
    }

    const nextTktNo = `TKT-2026-${tickets.length + 101}`;
    const now = new Date().toISOString().split('T')[0];
    const isSupport = currentUser.role === 'support' || currentUser.role === 'system_admin';
    const senderRole: 'user' | 'support' = isSupport ? 'support' : 'user';

    const newTicket: SupportTicket = {
      id: 'tkt-' + Date.now(),
      ticketNumber: nextTktNo,
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      category,
      subject,
      priority,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: 'msg-1',
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole,
          text: initialMessage,
          timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    setTickets(prev => [newTicket, ...prev]);
    showToast('تم إرسال تذكرتك بنجاح، وسيقوم ممثل الدعم بالرد قريباً', 'success');
  };

  const replyToTicket = async (ticketId: string, text: string) => {
    try {
      await apiFetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: text })
      });
    } catch (e) {
      // offline fallback
    }

    const isSupport = currentUser.role === 'support' || currentUser.role === 'system_admin';
    const senderRole: 'user' | 'support' = isSupport ? 'support' : 'user';

    const newMessage = {
      id: 'msg-' + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole,
      text,
      timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
    };

    setTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? {
              ...t,
              updatedAt: new Date().toISOString().split('T')[0],
              messages: [...t.messages, newMessage]
            }
          : t
      )
    );
    showToast('تم إرسال الرد بنجاح', 'success');
  };

  const updateTicketStatus = (ticketId: string, status: SupportTicket['status']) => {
    setTickets(prev =>
      prev.map(t => (t.id === ticketId ? { ...t, status, lastUpdate: new Date().toISOString().split('T')[0] } : t))
    );
    showToast(`تم تغيير حالة التذكرة إلى: ${status}`, 'info');
  };

  const resetToInitialData = () => {
    localStorage.removeItem('dalani_listings');
    localStorage.removeItem('dalani_orgs');
    localStorage.removeItem('dalani_verifications');
    localStorage.removeItem('dalani_reports');
    localStorage.removeItem('dalani_tickets');
    localStorage.removeItem('dalani_audit_logs');
    localStorage.removeItem('dalani_favorites');

    setListings(INITIAL_LISTINGS);
    setOrganizations(INITIAL_ORGANIZATIONS);
    setVerificationRequests(INITIAL_VERIFICATION_REQUESTS);
    setReports(INITIAL_REPORTS);
    setTickets(INITIAL_TICKETS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setFavorites(['list-101', 'list-103']);

    showToast('تمت إعادة ضبط البيانات الأولية بنجاح', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUserRole,
        listings,
        organizations,
        verificationRequests,
        reports,
        tickets,
        auditLogs,
        favorites,
        googleMapsApiKey,
        setGoogleMapsApiKey,
        createListing,
        updateListing,
        deleteListing,
        changeListingStatus,
        toggleFavorite,
        isFavorite,
        addOrgMember,
        toggleOrgMemberStatus,
        assignListingToAgent,
        submitVerificationRequest,
        reviewVerificationRequest,
        submitReport,
        resolveReport,
        createTicket,
        replyToTicket,
        updateTicketStatus,
        logAction,
        toasts,
        showToast,
        removeToast,
        refreshData,
        resetToInitialData
      }}
    >
      {children}

      {/* Global Toast Notifications Banner */}
      <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : toast.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-800'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-800'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white text-base leading-none p-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
