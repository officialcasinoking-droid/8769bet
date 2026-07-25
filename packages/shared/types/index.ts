export interface User {
  id: string;
  supabaseId: string;
  username: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin' | 'god';
  balance: number;
  avatarUrl: string | null;
  withdrawalPinSet: boolean;
  withdrawalPinHash: string | null;
  withdrawalAccounts: WithdrawalAccount[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface WithdrawalAccount {
  id: string;
  type: 'jazzcash' | 'easypaisa' | 'bank' | 'upi' | 'paytm' | 'phonepe' | 'usdt' | 'btc';
  cnic: string;
  realName: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  permissions: Record<string, boolean>;
  isActive: boolean;
  lastLogin: string | null;
  failedLoginCount: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAccount {
  id: string;
  username: string;
  passwordHash: string;
  email: string | null;
  fullName: string | null;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  permissions: Record<string, boolean>;
  isActive: boolean;
  lastLogin: string | null;
  failedLoginCount: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  name: string;
  provider: string;
  category: 'Slots' | 'Crash' | 'Live' | 'Fishing' | 'Table' | 'Lottery';
  rtp: number;
  thumbnailUrl: string;
  maxMultiplier: string;
  isActive: boolean;
  description: string;
  slug: string;
  minBet: number;
  maxBet: number;
  aiEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceReason: string;
  orderIndex: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  provablyFair: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string | null;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'bonus' | 'refund';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  reference: string | null;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface Withdrawal {
  id: string;
  userId: string | null;
  amount: number;
  fee: number;
  netAmount: number;
  method: string;
  details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  method: string;
  transactionId: string | null;
  screenshotUrl: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'upi' | 'bank' | 'crypto' | 'wallet';
  country: 'pakistan' | 'india' | 'global';
  logoUrl: string | null;
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  dailyLimit: number;
  autoApprove: boolean;
  isActive: boolean;
  details: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AviatorGameState {
  id: string;
  roundId: string;
  phase: 'betting' | 'flying' | 'crashed';
  multiplier: number;
  crashPoint: number | null;
  countdown: number;
  serverSeed: string | null;
  serverSeedHash: string | null;
  startedAt: string | null;
  crashedAt: string | null;
  updatedAt: string;
}

export interface AviatorSettings {
  id: string;
  houseEdge: number;
  heMode: 'off' | 'smart' | 'aggressive';
  heTargetPct: number;
  heMinSecs: number;
  heMaxSecs: number;
  autoTargetSecs: number;
  waitTimeSeconds: number;
  tickIntervalMs: number;
  minBet: number;
  maxBet: number;
  maxCrash: number;
  isEnabled: boolean;
  updatedAt: string;
}

export interface AviatorBet {
  id: string;
  roundId: string;
  userId: string | null;
  username: string;
  amount: number;
  autoCashoutAt: number | null;
  cashedOutAt: number | null;
  cashedOutMultiplier: number | null;
  cashoutAmount: number | null;
  isBot: boolean;
  isDemo: boolean;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  wonAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameRound {
  id: string;
  roundId: string;
  gameSlug: string;
  serverSeed: string | null;
  serverSeedHash: string | null;
  crashPoint: number;
  status: 'betting' | 'running' | 'crashed' | 'cancelled';
  targetHouseEdge: number;
  betCount: number;
  totalBetAmount: number;
  totalExitAmount: number;
  houseProfit: number;
  startedAt: string | null;
  crashedAt: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorType: 'user' | 'admin' | 'system';
  actorId: string;
  actorUsername: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetUsername: string | null;
  details: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  severity: 'info' | 'warning' | 'critical';
  success: boolean;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string | null;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string | null;
  senderName: string;
  senderRole: 'user' | 'admin' | 'ai';
  message: string;
  language: string;
  isAi: boolean;
  isRead: boolean;
  createdAt: string;
}

export interface LandingContent {
  id: string;
  draftJson: LandingContentData;
  liveJson: LandingContentData;
  updatedAt: string;
}

export interface LandingContentData {
  title: string;
  subtitle: string;
  heroImage: string;
  logoUrl: string;
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
    success: string;
    warning: string;
    jackpot: string;
  };
  showAnnouncements: boolean;
  showJackpot: boolean;
  showCategories: boolean;
  showGameCards: boolean;
  gameCards: GameCard[];
  footerText: string;
  announcements: Announcement[];
  categories: Category[];
  headerBg: string;
  headerLogoUrl: string;
  headerSearchPlaceholder: string;
  headerShowLogin: boolean;
  headerShowSignup: boolean;
}

export interface GameCard {
  id: string;
  gameSlug: string;
  title: string;
  description: string;
  imageUrl: string;
}

export interface Announcement {
  id: string;
  text: string;
  expiry: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  level: number;
  bonusPaid: number;
  status: 'active' | 'revoked' | 'completed';
  createdAt: string;
}

export interface Bonus {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'referral' | 'manual' | 'signup' | 'promo';
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  reason: string | null;
  paidBy: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface JackpotTier {
  id: string;
  name: string;
  seedAmount: number;
  currentAmount: number;
  incrementPercent: number;
  isActive: boolean;
  updatedAt: string;
}

export interface AdminWallet {
  id: string;
  balance: number;
  drawdownPercent: number;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  withdrawalFeePercent: number;
  updatedAt: string;
}

export interface PlatformSettings {
  id: string;
  groqApiKey: string;
  supportIconEnabled: boolean;
  referralSettings: ReferralSettings;
  bonusRules: BonusRules;
  adminUsername: string;
  adminPassword: string;
  updatedAt: string;
}

export interface ReferralSettings {
  level1Percent: number;
  level2Percent: number;
  level3Percent: number;
  depositBonusPercent: number;
  minDepositForBonus: number;
  maxBonus: number;
  active: boolean;
}

export interface BonusRules {
  depositBonusEnabled: boolean;
  depositTiers: DepositTier[];
  referralBonusEnabled: boolean;
}

export interface DepositTier {
  min: number;
  max: number;
  percent: number;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  admin?: AdminUser;
  user?: User;
  error?: string;
  message?: string;
  isAdmin?: boolean;
  isAutoLoggedIn?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}