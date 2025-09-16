
export interface User {
  id: string;
  name?: string;
  email?: string;
  dob?: string;
  gender?: string;
  language?: string;
  avatar?: string;
  phone?: string;
  address_apartment?: string;
  address_building?: string;
  address_block?: string;
  role?: string;
  creationDate?: string;
}

export interface Interest {
  id: string;
  title: string;
  category: string;
  creationDate?: string;
}

export interface Circle {
  id: string;
  name?: string;
  description?: string;
  privacy?: string;
  creationDate?: string;
}

export interface Event {
  id: string;
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  circleId?: string;
  visibility?: string;
  description?: string;
  createdBy?: string;
  creationDate?: string;
}

// =====================================================
// BOOKING SYSTEM TYPES
// =====================================================

export interface Place {
  id: string;
  name: string;
  description?: string;
  location?: any; // JSONB type
  capacity?: number;
  admin_user_id: string;
  timezone: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Space {
  id: string;
  place_id: string;
  name: string;
  description?: string;
  capacity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaceHours {
  id: string;
  place_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  open_time: string; // TIME format
  close_time: string; // TIME format
  effective_from: string; // DATE format
  effective_to?: string; // DATE format, NULL for indefinite
  created_at: string;
}

export interface Blackout {
  id: string;
  place_id: string;
  space_id?: string; // NULL for place-wide blackout
  reason?: string;
  starts_at: string; // TIMESTAMPTZ
  ends_at: string; // TIMESTAMPTZ
  created_by?: string;
  created_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  place_id: string;
  space_id: string;
  user_id: string;
  status: BookingStatus;
  starts_at: string; // TIMESTAMPTZ
  ends_at: string; // TIMESTAMPTZ
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Input types for creating/updating
export interface CreatePlaceInput {
  name: string;
  description?: string;
  location?: any;
  capacity?: number;
  timezone?: string;
}

export interface UpdatePlaceInput extends Partial<CreatePlaceInput> {
  is_active?: boolean;
}

export interface CreateSpaceInput {
  place_id: string;
  name: string;
  description?: string;
  capacity?: number;
}

export interface UpdateSpaceInput extends Partial<CreateSpaceInput> {
  is_active?: boolean;
}

export interface CreatePlaceHoursInput {
  place_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  effective_from?: string;
  effective_to?: string;
}

export interface CreateBlackoutInput {
  place_id: string;
  space_id?: string;
  reason?: string;
  starts_at: string;
  ends_at: string;
}

export interface CreateBookingInput {
  place_id: string;
  space_id: string;
  starts_at: string;
  ends_at: string;
  notes?: string;
}

export interface UpdateBookingInput {
  status?: BookingStatus;
  starts_at?: string;
  ends_at?: string;
  notes?: string;
}

// RPC function return types
export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
}

// Query filter types
export interface BookingFilter {
  place_id?: string;
  space_id?: string;
  user_id?: string;
  status?: BookingStatus;
  date_from?: string;
  date_to?: string;
}

export interface Post {
  id: string;
  userId?: string;
  content?: string;
  image?: string;
  circleId?: string;
  createdAt?: string;
  creationDate?: string;
}

export interface Comment {
  id: string;
  postId?: string;
  userId?: string;
  text?: string;
  timestamp?: string;
  creationDate?: string;
}

export interface CircleMessage {
  id: string;
  circleId?: string;
  senderId?: string;
  content?: string;
  type?: string;
  attachment?: string;
  timestamp?: string;
  creationDate?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  type?: string;
  content?: string;
  read?: boolean;
  timestamp?: string;
  linkedItemId?: string;
  linkedItemType?: string;
  creationDate?: string;
}

export interface Report {
  id: string;
  userId?: string;
  type?: string;
  targetId?: string;
  message?: string;
  status?: string;
  adminResponse?: string;
  timestamp?: string;
  creationDate?: string;
}

// Join table types
export interface UserInterest {
  userId: string;
  interestId: string;
}

export interface UserCircle {
  userId: string;
  circleId: string;
}

export interface CircleInterest {
  circleId: string;
  interestId: string;
}

export interface CircleAdmin {
  circleId: string;
  userId: string;
}

export interface EventInterest {
  eventId: string;
  interestId: string;
}

export interface PostLike {
  postId: string;
  userId: string;
}
