import React, { createContext, useContext, useState, useEffect } from 'react';
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
  createListing: (listingData: Omit<Listing, 'id' | 'listingNumber' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'favoritesCount' | 'statusTimeline'>) => Listing;
  updateListing: (id: string, updates: Partial<Listing>) => void;
  deleteListing: (id: string) => void;
  changeListingStatus: (id: string, newStatus: ListingStatus, reason?: string, notes?: string, missingFields?: string[]) => void;
  toggleFavorite: (listingId: string) => void;
  isFavorite: (listingId: string) => boolean;
  
  // Organization actions
  addOrgMember: (orgId: string, name: string, phone: string, roleInOrg: 'manager' | 'agent' | 'assistant') => void;
  toggleOrgMemberStatus: (orgId: string, memberId: string) => void;
  assignListingToAgent: (listingId: string, agentId: string, agentName: string) => void;
  
  // Verification actions
  submitVerificationRequest: (req: Omit<VerificationRequest, 'id' | 'createdAt' | 'status'>) => void;
  reviewVerificationRequest: (id: string, status: 'approved' | 'rejected' | 'needs_info', notes: string) => void;
  
  // Reports actions
  submitReport: (report: Omit<ReportCase, 'id' | 'caseNumber' | 'createdAt' | 'status'>) => void;
  resolveReport: (id: string, status: 'resolved_ad_suspended' | 'dismissed', resolutionReason: string) => void;
  
  // Support actions
  createTicket: (subject: string, category: SupportTicket['category'], priority: SupportTicket['priority'], initialMessage: string) => void;
  replyToTicket: (ticketId: string, text: string) => void;
  updateTicketStatus: (ticketId: string, status: SupportTicket['status']) => void;
  
  // Audit logger
  logAction: (action: string, targetType: AuditLogEntry['targetType'], targetId: string, result: 'success' | 'warning' | 'denied', details: string) => void;
  
  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  
  // Reset all data
  resetToInitialData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current active user / role
  const [currentRole, setCurrentRole] = useState<UserRole>('visitor');
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS['visitor']);

  // Main collections with localStorage persistence
  const [listings, setListings] = useState<Listing[]>(() => {
    const saved = localStorage.getItem('dalani_listings');
    return saved ? JSON.parse(saved) : INITIAL_LISTINGS;
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

  const setGoogleMapsApiKey = (key: string) => {
    setGoogleMapsApiKeyState(key);
    localStorage.setItem('dalani_gmaps_key', key);
    showToast('تم تحديث مفتاح Google Maps API بنجاح', 'success');
  };

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('dalani_listings', JSON.stringify(listings));
  }, [listings]);

  useEffect(() => {
    localStorage.setItem('dalani_orgs', JSON.stringify(organizations));
  }, [organizations]);

  useEffect(() => {
    localStorage.setItem('dalani_verifications', JSON.stringify(verificationRequests));
  }, [verificationRequests]);

  useEffect(() => {
    localStorage.setItem('dalani_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('dalani_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('dalani_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('dalani_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Update current user when role changes
  const setCurrentUserRole = (role: UserRole) => {
    setCurrentRole(role);
    const user = MOCK_USERS[role] || {
      id: `usr-${role}`,
      name: `مستخدم (${role})`,
      phone: '770000000',
      phoneVerified: true,
      role: role,
      activeStatus: true,
      createdAt: new Date().toISOString()
    };
    setCurrentUser(user);
    logAction('تبديل دور المستخدم', 'user', user.id, 'success', `تم التبديل إلى دور: ${role}`);
    showToast(`تم التبديل إلى دور: ${user.name}`, 'info');
  };

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
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

  const createListing = (data: Omit<Listing, 'id' | 'listingNumber' | 'createdAt' | 'updatedAt' | 'viewsCount' | 'favoritesCount' | 'statusTimeline'>): Listing => {
    const nextSeq = listings.length + 101;
    const listingNumber = `YEM-2026-${nextSeq}`;
    const now = new Date().toISOString().split('T')[0];
    const initialStatus = data.status || 'under_review';

    const newListing: Listing = {
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
          timestamp: new Date().toLocaleString('ar-YE'),
          changedBy: currentUser.name,
          userRole: currentUser.role,
          notes: 'إنشاء الإعلان وإرساله للمراجعة'
        }
      ]
    };

    setListings(prev => [newListing, ...prev]);
    logAction('إنشاء إعلان جديد', 'listing', newListing.id, 'success', `تم إنشاء الإعلان ${listingNumber} بحالة ${initialStatus}`);
    showToast(`تم حفظ الإعلان بنجاح برقم: ${listingNumber}`, 'success');
    return newListing;
  };

  const updateListing = (id: string, updates: Partial<Listing>) => {
    setListings(prev =>
      prev.map(l => (l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : l))
    );
    logAction('تعديل إعلان', 'listing', id, 'success', 'تم تعديل بيانات الإعلان');
    showToast('تم تحديث بيانات الإعلان بنجاح', 'success');
  };

  const deleteListing = (id: string) => {
    const listing = listings.find(l => l.id === id);
    setListings(prev => prev.filter(l => l.id !== id));
    logAction('حذف إعلان', 'listing', id, 'warning', `تم حذف الإعلان: ${listing?.title || id}`);
    showToast('تم حذف الإعلان', 'info');
  };

  const changeListingStatus = (
    id: string,
    newStatus: ListingStatus,
    reason?: string,
    notes?: string,
    missingFields?: string[]
  ) => {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;

    // Security & Business Rule check: Advertisers cannot approve their own listings
    if (currentUser.role === 'advertiser' && (newStatus === 'published' || newStatus === 'under_review')) {
      if (newStatus === 'published') {
        logAction('محاولة غير مصرح بها', 'listing', id, 'denied', 'المعلن لا يملك صلاحية اعتماد إعلانه بنفسه');
        showToast('غير مصرح للمعلن باعتماد الإعلان بنفسه، يتطلب مراجعة المشرف', 'error');
        return;
      }
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
    logAction('تعديل حالة عضو منشأة', 'organization', orgId, 'warning', `تعديل حالة العضو: ${memberId}`);
    showToast('تم تعديل حالة تفعيل العضو', 'info');
  };

  const assignListingToAgent = (listingId: string, agentId: string, agentName: string) => {
    setListings(prev =>
      prev.map(l => (l.id === listingId ? { ...l, assignedAgentId: agentId, assignedAgentName: agentName } : l))
    );
    logAction('إسناد إعلان إلى موظف', 'listing', listingId, 'success', `تم إسناد الإعلان إلى: ${agentName}`);
    showToast(`تم إسناد الإعلان إلى ${agentName}`, 'success');
  };

  const submitVerificationRequest = (req: Omit<VerificationRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReq: VerificationRequest = {
      ...req,
      id: 'ver-' + Date.now(),
      status: 'under_review',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setVerificationRequests(prev => [newReq, ...prev]);
    logAction('تقديم طلب تحقق', 'verification', newReq.id, 'success', `طلب تحقق لـ: ${req.targetName}`);
    showToast('تم تقديم طلب التحقق وسيقوم الفريق بمراجعته قريباً', 'success');
  };

  const reviewVerificationRequest = (id: string, status: 'approved' | 'rejected' | 'needs_info', notes: string) => {
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

    // If approved, update target listing badges if applicable
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
                    validityNote: 'مراجعة سارية',
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

    logAction('مراجعة طلب تحقق', 'verification', id, status === 'approved' ? 'success' : 'warning', `القرار: ${status} - ${notes}`);
    showToast(`تم تسجيل قرار التحقق: ${status}`, 'success');
  };

  const submitReport = (report: Omit<ReportCase, 'id' | 'caseNumber' | 'createdAt' | 'status'>) => {
    const nextCaseNo = `REP-2026-00${reports.length + 50}`;
    const newReport: ReportCase = {
      ...report,
      id: 'rep-' + Date.now(),
      caseNumber: nextCaseNo,
      status: 'new',
      createdAt: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })
    };
    setReports(prev => [newReport, ...prev]);
    logAction('تقديم بلاغ جديد', 'report', newReport.id, 'warning', `تم فتح البلاغ ${nextCaseNo} على الإعلان ${report.listingTitle}`);
    showToast('شكراً لحرصك، تم تسجيل البلاغ وسيتولى الفريق المختص التدقيق فيه بسرية تامة', 'success');
  };

  const resolveReport = (id: string, status: 'resolved_ad_suspended' | 'dismissed', resolutionReason: string) => {
    const rep = reports.find(r => r.id === id);
    if (!rep) return;

    setReports(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status,
              resolutionReason,
              resolvedAt: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })
            }
          : r
      )
    );

    if (status === 'resolved_ad_suspended') {
      // Suspend listing
      changeListingStatus(rep.listingId, 'suspended', 'إيقاف بناءً على معالجة بلاغ رقم ' + rep.caseNumber, resolutionReason);
    }

    logAction('معالجة بلاغ', 'report', id, 'success', `القرار: ${status} - ${resolutionReason}`);
    showToast(`تمت معالجة القضية بنجاح (${status})`, 'success');
  };

  const createTicket = (
    subject: string,
    category: SupportTicket['category'],
    priority: SupportTicket['priority'],
    initialMessage: string
  ) => {
    const nextTicketNo = `TKT-2026-${tickets.length + 805}`;
    const newTicket: SupportTicket = {
      id: 'tkt-' + Date.now(),
      ticketNumber: nextTicketNo,
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone || '770000000',
      subject,
      category,
      priority,
      status: 'open',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      messages: [
        {
          id: 'msg-' + Date.now(),
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: 'user',
          text: initialMessage,
          timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })
        }
      ]
    };
    setTickets(prev => [newTicket, ...prev]);
    logAction('إنشاء تذكرة دعم فني', 'ticket', newTicket.id, 'success', `تذكرة: ${subject}`);
    showToast('تم إرسال تذكرة الدعم بنجاح وسيتم الرد عليك قريباً', 'success');
  };

  const replyToTicket = (ticketId: string, text: string) => {
    const newMessage = {
      id: 'msg-' + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: (currentUser.role === 'support' || currentUser.role === 'system_admin' ? 'support' : 'user') as 'user' | 'support',
      text,
      timestamp: new Date().toLocaleString('ar-YE', { dateStyle: 'short', timeStyle: 'short' })
    };

    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId) {
          return {
            ...t,
            updatedAt: new Date().toISOString().split('T')[0],
            status: currentUser.role === 'support' ? 'in_progress' : t.status,
            messages: [...t.messages, newMessage]
          };
        }
        return t;
      })
    );
    showToast('تم إرسال الرد بنجاح', 'success');
  };

  const updateTicketStatus = (ticketId: string, status: SupportTicket['status']) => {
    setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, status } : t)));
    logAction('تحديث حالة تذكرة دعم', 'ticket', ticketId, 'success', `الحالة الجديدة: ${status}`);
    showToast(`تم تحديث حالة التذكرة إلى: ${status}`, 'info');
  };

  const resetToInitialData = () => {
    setListings(INITIAL_LISTINGS);
    setOrganizations(INITIAL_ORGANIZATIONS);
    setVerificationRequests(INITIAL_VERIFICATION_REQUESTS);
    setReports(INITIAL_REPORTS);
    setTickets(INITIAL_TICKETS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setFavorites(['list-101', 'list-103']);
    localStorage.clear();
    showToast('تمت استعادة البيانات الافتراضية لمنصة دلنّي بنجاح', 'success');
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
        resetToInitialData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
