// src/types.ts
// ===== Helpers =====
// type Maybe<T> = T | null | undefined;

const toBool = (v: any) =>
  v === true || v === "true"
    ? true
    : v === false || v === "false"
    ? false
    : !!v;

// ===== Users =====
export interface UserRow {
  id: string;
  name?: string | null;
  email?: string | null;
  dob?: string | null;
  gender?: string | null;
  language?: string | null;
  avatar?: string | null;
  phone?: string | null;
  address_apartment?: string | null;
  address_building?: string | null;
  address_block?: string | null;
  role?: string | null;
  creationdate?: string | null;
  first_login?: boolean | null;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  dob?: string;
  gender?: string;
  language?: string;
  avatar?: string;
  phone?: string;
  addressApartment?: string;
  addressBuilding?: string;
  addressBlock?: string;
  role?: string;
  creationDate?: string;
  firstLogin?: boolean | null;
}

export const fromDbUser = (r: UserRow): User => ({
  id: r.id,
  name: r.name ?? undefined,
  email: r.email ?? undefined,
  dob: r.dob ?? undefined,
  gender: r.gender ?? undefined,
  language: r.language ?? undefined,
  avatar: r.avatar ?? undefined,
  phone: r.phone ?? undefined,
  addressApartment: r.address_apartment ?? undefined,
  addressBuilding: r.address_building ?? undefined,
  addressBlock: r.address_block ?? undefined,
  role: r.role ?? undefined,
  creationDate: r.creationdate ?? undefined,
  firstLogin: r.first_login ?? null,
});

export const toDbUser = (u: Partial<User>): Partial<UserRow> => ({
  id: u.id!,
  name: u.name,
  email: u.email,
  dob: u.dob,
  gender: u.gender,
  language: u.language,
  avatar: u.avatar,
  phone: u.phone,
  address_apartment: u.addressApartment,
  address_building: u.addressBuilding,
  address_block: u.addressBlock,
  role: u.role,
});

// ===== Interests =====
export interface InterestRow {
  id: string;
  title: string;
  category: string;
  creationdate?: string | null;
}
export interface Interest {
  id: string;
  title: string;
  category: string;
  creationDate?: string;
}
export const fromDbInterest = (r: InterestRow): Interest => ({
  id: r.id,
  title: r.title,
  category: r.category,
  creationDate: r.creationdate ?? undefined,
});

// ===== Circles =====
export interface CircleRow {
  id: string;
  name?: string | null;
  description?: string | null;
  privacy?: "public" | "private" | string | null;
  creationdate?: string | null;
  circle_profile_url?: string | null;
}
export interface Circle {
  id: string;
  name?: string;
  description?: string;
  privacy?: string;
  creationDate?: string;
  circle_profile_url?: string;
  // optional helper scores in app state
  score?: number;
}
export const fromDbCircle = (r: CircleRow): Circle => ({
  id: r.id,
  name: r.name ?? undefined,
  description: r.description ?? undefined,
  privacy: r.privacy ?? undefined,
  creationDate: r.creationdate ?? undefined,
  circle_profile_url: r.circle_profile_url ?? undefined,
});

// ===== Events =====
export interface EventRow {
  id: string;
  title?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  location_url?: string | null;
  circleid?: string | null;
  visibility?: string | null;
  description?: string | null;
  createdby?: string | null;
  creationdate?: string | null;
  photo_url?: string | null;
}
export interface Event {
  id: string;
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  location_url?: string;
  circleId?: string;
  visibility?: string;
  description?: string;
  createdBy?: string;
  creationDate?: string;
  photo_url?: string;
}
export const fromDbEvent = (r: EventRow): Event => ({
  id: r.id,
  title: r.title ?? undefined,
  date: r.date ?? undefined,
  time: r.time ?? undefined,
  location: r.location ?? undefined,
  location_url: r.location_url ?? undefined,
  circleId: r.circleid ?? undefined,
  visibility: r.visibility ?? undefined,
  description: r.description ?? undefined,
  createdBy: r.createdby ?? undefined,
  creationDate: r.creationdate ?? undefined,
  photo_url: r.photo_url ?? undefined,
});
export const toDbEvent = (e: Partial<Event>): Partial<EventRow> => ({
  id: e.id!,
  title: e.title,
  date: e.date,
  time: e.time,
  location: e.location,
  location_url: e.location_url,
  circleid: e.circleId,
  visibility: e.visibility,
  description: e.description,
  createdby: e.createdBy,
});

// ===== Posts =====
export interface PostRow {
  id: string;
  userid?: string | null;
  content?: string | null;
  image?: string | null;
  circleid?: string | null;
  createdat?: string | null; // لو موجود
  creationdate?: string | null; // أو ده
  comments_count?: number | null;
  likes_count?: number | null;
}
export interface Post {
  id: string;
  userId?: string;
  content?: string;
  image?: string;
  circleId?: string;
  createdAt?: string;
  creationDate?: string;
  comments_count?: number;
  likes_count?: number;
}
export const fromDbPost = (r: PostRow): Post => ({
  id: r.id,
  userId: r.userid ?? undefined,
  content: r.content ?? undefined,
  image: r.image ?? undefined,
  circleId: r.circleid ?? undefined,
  createdAt: r.createdat ?? undefined,
  creationDate: r.creationdate ?? undefined,
  comments_count: r.comments_count ?? undefined,
  likes_count: r.likes_count ?? undefined,
});
export const toDbPost = (p: Partial<Post>): Partial<PostRow> => ({
  id: p.id!,
  userid: p.userId,
  content: p.content,
  image: p.image,
  circleid: p.circleId,
});

// ===== Comments =====
export interface CommentRow {
  id: string;
  postid?: string | null;
  userid?: string | null;
  text?: string | null;
  timestamp?: string | null;
  creationdate?: string | null;
}
export interface Comment {
  id: string;
  postId?: string;
  userId?: string;
  text?: string;
  timestamp?: string;
  creationDate?: string;
}
export const fromDbComment = (r: CommentRow): Comment => ({
  id: r.id,
  postId: r.postid ?? undefined,
  userId: r.userid ?? undefined,
  text: r.text ?? undefined,
  timestamp: r.timestamp ?? undefined,
  creationDate: r.creationdate ?? undefined,
});
export const toDbComment = (c: Partial<Comment>): Partial<CommentRow> => ({
  id: c.id!,
  postid: c.postId,
  userid: c.userId,
  text: c.text,
});

// ===== Circle Messages =====
export interface CircleMessageRow {
  id: string;
  circleid?: string | null;
  senderid?: string | null;
  content?: string | null;
  type?: string | null;
  attachment?: string | null;
  timestamp?: string | null;
  creationdate?: string | null;
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
export const fromDbCircleMessage = (r: CircleMessageRow): CircleMessage => ({
  id: r.id,
  circleId: r.circleid ?? undefined,
  senderId: r.senderid ?? undefined,
  content: r.content ?? undefined,
  type: r.type ?? undefined,
  attachment: r.attachment ?? undefined,
  timestamp: r.timestamp ?? undefined,
  creationDate: r.creationdate ?? undefined,
});

// ===== Notifications =====
export interface NotificationRow {
  id: string;
  userid?: string | null;
  type?: string | null;
  content?: string | null;
  read?: boolean | null;
  timestamp?: string | null;
  linkeditemid?: string | null;
  linkeditemtype?: string | null;
  creationdate?: string | null;
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
export const fromDbNotification = (r: NotificationRow): Notification => ({
  id: r.id,
  userId: r.userid ?? undefined,
  type: r.type ?? undefined,
  content: r.content ?? undefined,
  read: toBool(r.read),
  timestamp: r.timestamp ?? undefined,
  linkedItemId: r.linkeditemid ?? undefined,
  linkedItemType: r.linkeditemtype ?? undefined,
  creationDate: r.creationdate ?? undefined,
});
export const toDbNotification = (
  n: Partial<Notification>
): Partial<NotificationRow> => ({
  id: n.id!,
  userid: n.userId,
  type: n.type,
  content: n.content,
  read: n.read,
  linkeditemid: n.linkedItemId,
  linkeditemtype: n.linkedItemType,
});

// ===== Reports =====
export interface ReportRow {
  id: string;
  userid?: string | null;
  type?: string | null;
  targetid?: string | null;
  message?: string | null;
  status?: string | null;
  adminresponse?: string | null;
  timestamp?: string | null;
  creationdate?: string | null;
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
export const fromDbReport = (r: ReportRow): Report => ({
  id: r.id,
  userId: r.userid ?? undefined,
  type: r.type ?? undefined,
  targetId: r.targetid ?? undefined,
  message: r.message ?? undefined,
  status: r.status ?? undefined,
  adminResponse: r.adminresponse ?? undefined,
  timestamp: r.timestamp ?? undefined,
  creationDate: r.creationdate ?? undefined,
});

// ===== Join tables =====
export interface UserInterestRow {
  userid: string;
  interestid: string;
}
export interface UserInterest {
  userId: string;
  interestId: string;
}
export const toDbUserInterest = (x: UserInterest): UserInterestRow => ({
  userid: x.userId,
  interestid: x.interestId,
});

export interface UserCircleRow {
  userid: string;
  circleid: string;
  status?: string | null;
}
export interface UserCircle {
  userId: string;
  circleId: string;
  status?: string;
}
export const toDbUserCircle = (x: UserCircle): UserCircleRow => ({
  userid: x.userId,
  circleid: x.circleId,
  status: x.status ?? null,
});

export interface CircleInterestRow {
  circleid: string;
  interestid: string;
}
export interface CircleInterest {
  circleId: string;
  interestId: string;
}
export const toDbCircleInterest = (x: CircleInterest): CircleInterestRow => ({
  circleid: x.circleId,
  interestid: x.interestId,
});

export interface CircleAdminRow {
  circleid: string;
  userid: string;
}
export interface CircleAdmin {
  circleId: string;
  userId: string;
}
export const toDbCircleAdmin = (x: CircleAdmin): CircleAdminRow => ({
  circleid: x.circleId,
  userid: x.userId,
});

export interface EventInterestRow {
  eventid: string;
  interestid: string;
}
export interface EventInterest {
  eventId: string;
  interestId: string;
}
export const toDbEventInterest = (x: EventInterest): EventInterestRow => ({
  eventid: x.eventId,
  interestid: x.interestId,
});

export interface PostLikeRow {
  postid: string;
  userid: string;
}
export interface PostLike {
  postId: string;
  userId: string;
}
export const toDbPostLike = (x: PostLike): PostLikeRow => ({
  postid: x.postId,
  userid: x.userId,
});
