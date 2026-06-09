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
  rank_score: number;
  created_at: string;
  updated_at: string;
}

export type WeightClass = '63kg' | '70kg' | '78kg' | '86kg' | '95kg' | '105kg' | '105kg+';

export interface AthleteFormData {
  name: string;
  codename: string;
  gender: string;
  weight_class: WeightClass;
  body_weight: string;
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
  contact_person: string | null;
  contact_phone: string | null;
  schedule: string | null;
  description: string | null;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string | null;
  created_at: string;
}
