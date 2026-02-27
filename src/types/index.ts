// 用戶相關類型
export type UserRole = 'super_admin' | 'admin' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  role: UserRole;
  full_name?: string;
  email?: string;
  phone?: string;
  status: UserStatus;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreateInput {
  username: string;
  password: string;
  role: UserRole;
  full_name?: string;
  email?: string;
  phone?: string;
}

export interface UserUpdateInput {
  full_name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
}

// 物業相關類型
export interface Property {
  id: number;
  name: string;
  address?: string;
  owner_name?: string;
  owner_phone?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PropertyCreateInput {
  name: string;
  address?: string;
  owner_name?: string;
  owner_phone?: string;
}

// 房間相關類型
export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export interface Room {
  id: number;
  property_id: number;
  room_number: string;
  floor?: number;
  monthly_rent: number;
  deposit: number;
  status: RoomStatus;
  tenant_name?: string;
  tenant_phone?: string;
  check_in_date?: Date;
  check_out_date?: Date;
  contract_months?: number;
  created_at: Date;
  updated_at: Date;
}

export interface RoomCreateInput {
  property_id: number;
  room_number: string;
  floor?: number;
  monthly_rent: number;
  deposit: number;
  status?: RoomStatus;
}

export interface RoomUpdateInput {
  room_number?: string;
  floor?: number;
  monthly_rent?: number;
  deposit?: number;
  status?: RoomStatus;
  tenant_name?: string;
  tenant_phone?: string;
  check_in_date?: Date;
  check_out_date?: Date;
  contract_months?: number;
}

// 付款相關類型
export type PaymentType = 'rent' | 'deposit' | 'electricity' | 'other';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Payment {
  id: number;
  room_id: number;
  payment_type: PaymentType;
  month: string; // YYYY/MM 格式
  amount: number;
  electricity_usage?: number;
  electricity_rate?: number;
  electricity_fee?: number;
  total_amount: number;
  due_date: Date;
  paid_date?: Date;
  status: PaymentStatus;
  payment_method?: string;
  notes?: string;
  is_backfill?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentCreateInput {
  room_id: number;
  payment_type: PaymentType;
  month: string;
  amount: number;
  electricity_usage?: number;
  electricity_rate?: number;
  electricity_fee?: number;
  total_amount: number;
  due_date: Date;
  status?: PaymentStatus;
  payment_method?: string;
  notes?: string;
  is_backfill?: boolean;
}

// 維護相關類型
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Maintenance {
  id: number;
  property_id: number;
  room_id?: number;
  title: string;
  description?: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  estimated_cost?: number;
  actual_cost?: number;
  estimated_completion_date?: Date;
  actual_completion_date?: Date;
  technician?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// 水電費相關類型
export type UtilityType = 'water' | 'electricity' | 'gas' | 'internet' | 'other';

export interface UtilityExpense {
  id: number;
  property_id: number;
  utility_type: UtilityType;
  period: string; // YYYY/MM 格式
  amount: number;
  paid_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// 電錶記錄
export interface MeterReading {
  id: number;
  property_id: number;
  room_id: number;
  month: string; // YYYY/MM 格式
  reading_date: Date;
  current_reading: number;
  previous_reading: number;
  usage: number;
  fee: number;
  created_at: Date;
}

// JWT Token 類型
export interface JwtPayload {
  userId: number;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// API 響應類型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

// 分頁類型
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}