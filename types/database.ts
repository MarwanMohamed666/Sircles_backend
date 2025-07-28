
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
  title?: string;
  category?: string;
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
