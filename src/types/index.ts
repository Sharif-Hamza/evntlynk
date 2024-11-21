export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'club_admin' | 'user';
  is_admin: boolean;
  avatar_url: string | null;
  updated_at: string;
  club_id?: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  created_at: string;
  admin_email: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  admin_id: string;
  club_id?: string;
  created_at: string;
  likes: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  capacity: number;
  admin_id: string;
  club_id?: string;
  created_at: string;
  registered_count: number;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  email: string;
  message?: string;
  events?: Event;
}