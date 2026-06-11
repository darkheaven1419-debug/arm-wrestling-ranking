export interface Athlete {
  id: number;
  name: string;
  codename: string | null;
  gender: string;
  hand: string | null;
  weight_class: WeightClass;
  body_weight: number | null;
  city: string;
  training_spot: string | null;
  achievements: string | null;
  bio: string | null;
  avatar_url: string | null;
  contact: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rank_score: number | null;
  rank_score_left: number | null;
  is_featured?: boolean;
  user_id: string | null;
  user_email: string | null;
  video_urls?: string[];
  created_at: string;
  updated_at: string;
}

export type WeightClass = '63kg' | '70kg' | '78kg' | '86kg' | '95kg' | '105kg' | '105kg+';
export type Hand = '左手' | '右手';

export interface AthleteFormData {
  name: string;
  codename: string;
  gender: string;
  hand: Hand;
  weight_class: WeightClass;
  city: string;
  training_spot: string;
  achievements: string;
  bio: string;
  contact: string;
}

export interface TrainingLocation {
  id: number;
  name: string;
  address: string | null;
  image_url: string | null;
  images?: string[];
  cover_index?: number;
  table_count: number | null;
  contact_person: string | null;
  contact_phone: string | null;
  schedule: string | null;
  description: string | null;
  status?: string;
  latitude: number | null;
  longitude: number | null;
  organization: string | null;
  created_at: string;
}

export interface ArmEvent {
  id: number;
  title: string;
  event_date: string;
  location: string | null;
  description: string | null;
  weight_classes: string[] | null;
  poster_url: string | null;
  poster_urls?: string[];
  contact_info: string | null;
  registration_fee: string | null;
  prizes: string | null;
  contact_person: string | null;
  created_at: string;
}

export interface BattleRecord {
  id: number;
  winner_id: number;
  loser_id: number;
  winner_name?: string;
  loser_name?: string;
  hand: string;
  event_name: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  category: 'technique' | 'training' | 'nutrition' | 'gear' | 'other';
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string | null;
  created_at: string;
}
