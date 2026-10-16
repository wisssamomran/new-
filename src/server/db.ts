import fs from 'fs';
import path from 'path';
import {
  Listing,
  Organization,
  VerificationRequest,
  ReportCase,
  SupportTicket,
  AuditLogEntry,
  User,
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

interface DatabaseSchema {
  listings: Listing[];
  organizations: Organization[];
  verifications: VerificationRequest[];
  reports: ReportCase[];
  tickets: SupportTicket[];
  auditLogs: AuditLogEntry[];
  users: User[];
  meta: {
    lastUpdated: string;
    version: string;
  };
}

const DB_FILE_PATH = path.resolve(process.cwd(), '.data', 'dalani_database.json');

export function normalizeListing(l: any): Listing {
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
}

class LocalDatabase {
  private data: DatabaseSchema;
  private isInitialized = false;

  constructor() {
    this.data = this.loadOrSeed();
    this.isInitialized = true;
  }

  private loadOrSeed(): DatabaseSchema {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        if (fileContent.trim()) {
          const parsed = JSON.parse(fileContent);
          if (parsed && Array.isArray(parsed.listings)) {
            parsed.listings = parsed.listings.map(normalizeListing);
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('[Dalani DB] Failed to read existing db file, re-seeding default data:', err);
    }

    const defaultUsers = Object.values(MOCK_USERS);
    const initialData: DatabaseSchema = {
      listings: INITIAL_LISTINGS,
      organizations: INITIAL_ORGANIZATIONS,
      verifications: INITIAL_VERIFICATION_REQUESTS,
      reports: INITIAL_REPORTS,
      tickets: INITIAL_TICKETS,
      auditLogs: INITIAL_AUDIT_LOGS,
      users: defaultUsers,
      meta: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    this.persist(initialData);
    return initialData;
  }

  private persist(dataToSave: DatabaseSchema = this.data) {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      dataToSave.meta.lastUpdated = new Date().toISOString();
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Dalani DB] Error persisting database to disk:', err);
    }
  }

  // --- Listings Operations ---
  public getListings(): Listing[] {
    return [...this.data.listings];
  }

  public getListingById(id: string): Listing | undefined {
    return this.data.listings.find(l => l.id === id);
  }

  public addListing(listing: Listing): Listing {
    const normalized = normalizeListing(listing);
    this.data.listings.unshift(normalized);
    this.persist();
    return normalized;
  }

  public updateListing(id: string, updates: Partial<Listing>): Listing | undefined {
    const index = this.data.listings.findIndex(l => l.id === id);
    if (index === -1) return undefined;
    const merged = {
      ...this.data.listings[index],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    this.data.listings[index] = normalizeListing(merged);
    this.persist();
    return this.data.listings[index];
  }

  public deleteListing(id: string): boolean {
    const prevLength = this.data.listings.length;
    this.data.listings = this.data.listings.filter(l => l.id !== id);
    if (this.data.listings.length !== prevLength) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Organizations Operations ---
  public getOrganizations(): Organization[] {
    return [...this.data.organizations];
  }

  public getOrganizationById(id: string): Organization | undefined {
    return this.data.organizations.find(o => o.id === id);
  }

  public updateOrganization(id: string, updates: Partial<Organization>): Organization | undefined {
    const index = this.data.organizations.findIndex(o => o.id === id);
    if (index === -1) return undefined;
    this.data.organizations[index] = {
      ...this.data.organizations[index],
      ...updates
    };
    this.persist();
    return this.data.organizations[index];
  }

  // --- Verifications Operations ---
  public getVerifications(): VerificationRequest[] {
    return [...this.data.verifications];
  }

  public addVerification(req: VerificationRequest): VerificationRequest {
    this.data.verifications.unshift(req);
    this.persist();
    return req;
  }

  public updateVerification(id: string, updates: Partial<VerificationRequest>): VerificationRequest | undefined {
    const index = this.data.verifications.findIndex(v => v.id === id);
    if (index === -1) return undefined;
    this.data.verifications[index] = {
      ...this.data.verifications[index],
      ...updates
    };
    this.persist();
    return this.data.verifications[index];
  }

  // --- Reports Operations ---
  public getReports(): ReportCase[] {
    return [...this.data.reports];
  }

  public addReport(rep: ReportCase): ReportCase {
    this.data.reports.unshift(rep);
    this.persist();
    return rep;
  }

  public updateReport(id: string, updates: Partial<ReportCase>): ReportCase | undefined {
    const index = this.data.reports.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    this.data.reports[index] = {
      ...this.data.reports[index],
      ...updates
    };
    this.persist();
    return this.data.reports[index];
  }

  // --- Tickets Operations ---
  public getTickets(): SupportTicket[] {
    return [...this.data.tickets];
  }

  public addTicket(ticket: SupportTicket): SupportTicket {
    this.data.tickets.unshift(ticket);
    this.persist();
    return ticket;
  }

  public updateTicket(id: string, updates: Partial<SupportTicket>): SupportTicket | undefined {
    const index = this.data.tickets.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    this.data.tickets[index] = {
      ...this.data.tickets[index],
      ...updates
    };
    this.persist();
    return this.data.tickets[index];
  }

  // --- Audit Logs Operations ---
  public getAuditLogs(): AuditLogEntry[] {
    return [...this.data.auditLogs];
  }

  public addAuditLog(entry: AuditLogEntry): AuditLogEntry {
    this.data.auditLogs.unshift(entry);
    // Keep maximum 200 logs to optimize disk space
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    this.persist();
    return entry;
  }

  // --- Users Operations ---
  public getUsers(): User[] {
    return [...this.data.users];
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public updateUserRole(id: string, role: User['role']): User | undefined {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    this.data.users[index] = {
      ...this.data.users[index],
      role
    };
    this.persist();
    return this.data.users[index];
  }
}

export const db = new LocalDatabase();
