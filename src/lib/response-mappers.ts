/**
 * Response Mappers
 *
 * Transforms Prisma model outputs into frontend-compatible shapes.
 * The frontend (lib/data.ts) expects specific field names and formats
 * that differ from the Prisma schema.
 */

// ============================================================================
// USER MAPPER
// ============================================================================

interface PrismaUserInput {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  dateOfBirth: Date | null;
  idNumber: string | null;
  county: string | null;
  city: string | null;
  emergencyContact: any;
  isBanned: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FrontendUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: 'attendee' | 'organizer' | 'admin';
  dateOfBirth: string;
  idNumber: string;
  county: string;
  city: string;
  emergencyContact: { name: string; phone: string; relationship: string };
  joinedDate: string;
  status: 'active' | 'inactive';
  bookedEvents: string[];
  likedEvents: string[];
}

export function mapUserToFrontend(user: PrismaUserInput): FrontendUser {
  const roleMap: Record<string, FrontendUser['role']> = {
    ATTENDEE: 'attendee',
    ORGANIZER: 'organizer',
    ADMIN: 'admin',
  };

  const ec = user.emergencyContact as { name?: string; phoneNumber?: string; phone?: string; relationship?: string } | null;

  return {
    id: user.id,
    name: user.fullName || user.email,
    email: user.email,
    phone: user.phoneNumber || '',
    avatar: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
    role: roleMap[user.role] || 'attendee',
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0]! : '',
    idNumber: user.idNumber || '',
    county: user.county || '',
    city: user.city || '',
    emergencyContact: {
      name: ec?.name || '',
      phone: ec?.phoneNumber || ec?.phone || '',
      relationship: ec?.relationship || '',
    },
    joinedDate: user.createdAt.toISOString().split('T')[0]!,
    status: user.isBanned ? 'inactive' : (user.isActive ? 'active' : 'inactive'),
    bookedEvents: [],
    likedEvents: [],
  };
}

// ============================================================================
// AUDIT LOG MAPPER
// ============================================================================

interface PrismaAuditLogInput {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  data: any;
  createdAt: Date;
  user?: {
    id: string;
    fullName: string | null;
    email: string;
  } | null;
}

export interface FrontendSystemLog {
  id: string;
  timestamp: string;
  userId?: string;
  user?: string;
  action: string;
  entity: string;
  entityId: string;
  ipAddress: string;
  status: 'success' | 'error' | 'warning';
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

/**
 * Derive log type from action string patterns
 */
function deriveLogType(action: string): FrontendSystemLog['type'] {
  const upper = action.toUpperCase();
  if (upper.includes('BANNED') || upper.includes('CANCELLED') || upper.includes('REJECTED') || upper.includes('SUSPENDED')) {
    return 'warning';
  }
  if (upper.includes('FAILED') || upper.includes('ERROR') || upper.includes('DENIED')) {
    return 'error';
  }
  if (upper.includes('CREATED') || upper.includes('APPROVED') || upper.includes('PUBLISHED') || upper.includes('COMPLETED') || upper.includes('UNBANNED')) {
    return 'success';
  }
  return 'info';
}

/**
 * Derive log status from action string patterns
 */
function deriveLogStatus(action: string): FrontendSystemLog['status'] {
  const type = deriveLogType(action);
  if (type === 'error') return 'error';
  if (type === 'warning') return 'warning';
  return 'success';
}

/**
 * Build a human-readable message from action and entity
 */
function buildLogMessage(action: string, entity: string, entityId: string | null, data: any): string {
  const actionReadable = action.replace(/_/g, ' ').toLowerCase();
  const entityLower = entity.toLowerCase();

  // Try to extract meaningful details from data
  const details: string[] = [];
  if (data) {
    if (data.reason) details.push(`Reason: ${data.reason}`);
    if (data.status) details.push(`Status: ${data.status}`);
    if (data.eventTitle) details.push(`Event: ${data.eventTitle}`);
    if (data.businessName) details.push(`Business: ${data.businessName}`);
  }

  let message = `${actionReadable} on ${entityLower}`;
  if (entityId) message += ` (${entityId.slice(0, 8)}...)`;
  if (details.length > 0) message += ` — ${details.join(', ')}`;

  // Capitalize first letter
  return message.charAt(0).toUpperCase() + message.slice(1);
}

export function mapAuditLogToFrontend(log: PrismaAuditLogInput): FrontendSystemLog {
  return {
    id: log.id,
    timestamp: log.createdAt.toISOString(),
    userId: log.user?.id,
    user: log.user?.fullName || log.user?.email || undefined,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId || '',
    ipAddress: log.ipAddress || '',
    status: deriveLogStatus(log.action),
    type: deriveLogType(log.action),
    message: buildLogMessage(log.action, log.entity, log.entityId, log.data),
  };
}

// ============================================================================
// EVENT MAPPER
// ============================================================================

interface PrismaTicketInput {
  id: string;
  category: string;
  name: string | null;
  price: any; // Decimal
  totalQuantity: number;
  availableQuantity: number;
}

interface PrismaEventInput {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date | null;
  location: any; // JSON { venue, address }
  posterUrl: string | null;
  videoUrl: string | null;
  category: string | null;
  organizerId: string;
  status: string;
  isPublished: boolean;
  isFeatured: boolean;
  maxCapacity: number | null;
  createdAt: Date;
  updatedAt: Date;
  organizer?: {
    id: string;
    fullName: string | null;
    email: string;
  };
  tickets?: PrismaTicketInput[];
  _count?: {
    orders?: number;
  };
}

export interface FrontendEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  county: string;
  city: string;
  posterUrl: string;
  category: string;
  organizerId: string;
  organizerName: string;
  ticketTypes: string[];
  pricing: Record<string, number>;
  capacity: Record<string, number>;
  sold: Record<string, number>;
  status: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapEventToFrontend(event: PrismaEventInput): FrontendEvent {
  const tickets = event.tickets || [];
  const pricing: Record<string, number> = {};
  const capacity: Record<string, number> = {};
  const sold: Record<string, number> = {};
  const ticketTypes: string[] = [];

  for (const ticket of tickets) {
    const cat = ticket.category.toLowerCase();
    ticketTypes.push(cat);
    pricing[cat] = Number(ticket.price) || 0;
    capacity[cat] = ticket.totalQuantity;
    sold[cat] = ticket.totalQuantity - ticket.availableQuantity;
  }

  // If no tickets, provide defaults
  if (ticketTypes.length === 0) {
    ticketTypes.push('regular');
    pricing.regular = 0;
    capacity.regular = event.maxCapacity || 0;
    sold.regular = 0;
  }

  const loc = event.location as { venue?: string; address?: string } | null;

  // Map backend status (UPPERCASE) to frontend status (lowercase)
  const statusMap: Record<string, string> = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    POSTPONED: 'postponed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
  };

  return {
    id: event.id,
    title: event.title,
    description: event.description || '',
    date: event.startTime.toISOString().split('T')[0]!,
    time: event.startTime.toTimeString().slice(0, 5),
    venue: loc?.venue || '',
    county: loc?.address || '',
    city: '',
    posterUrl: event.posterUrl || '',
    category: event.category || '',
    organizerId: event.organizerId,
    organizerName: event.organizer?.fullName || event.organizer?.email || '',
    ticketTypes,
    pricing,
    capacity,
    sold,
    status: statusMap[event.status] || event.status.toLowerCase(),
    featured: event.isFeatured,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

// ============================================================================
// ORGANIZER REQUEST MAPPER
// ============================================================================

interface PrismaOrganizerAppInput {
  id: string;
  userId: string;
  businessName: string;
  description: string;
  status: string;
  createdAt: Date;
  user?: {
    id: string;
    fullName: string | null;
    email: string;
  };
}

export interface FrontendOrganizerRequest {
  id: string;
  userId: string;
  userName: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  documents: string;
}

export function mapOrganizerRequestToFrontend(app: PrismaOrganizerAppInput): FrontendOrganizerRequest {
  return {
    id: app.id,
    userId: app.userId,
    userName: app.user?.fullName || app.user?.email || '',
    email: app.user?.email || '',
    status: app.status.toLowerCase() as FrontendOrganizerRequest['status'],
    requestDate: app.createdAt.toISOString().split('T')[0]!,
    documents: app.description || '',
  };
}

// ============================================================================
// REFUND REQUEST MAPPER
// ============================================================================

interface PrismaRefundRequestInput {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: string;
  amount: any; // Decimal
  createdAt: Date;
  user?: {
    id: string;
    fullName: string | null;
    email: string;
  };
  order?: {
    id: string;
    totalAmount: any;
    event?: {
      id: string;
      title: string;
    };
  };
}

export interface FrontendRefundRequest {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  eventTitle: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  amount: number;
}

export function mapRefundRequestToFrontend(req: PrismaRefundRequestInput): FrontendRefundRequest {
  return {
    id: req.id,
    ticketId: req.orderId, // Using orderId as reference
    userId: req.userId,
    userName: req.user?.fullName || req.user?.email || '',
    eventTitle: req.order?.event?.title || '',
    reason: req.reason,
    status: req.status.toLowerCase() as FrontendRefundRequest['status'],
    requestDate: req.createdAt.toISOString().split('T')[0]!,
    amount: Number(req.amount) || 0,
  };
}
