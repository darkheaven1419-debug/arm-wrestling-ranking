export interface Athlete {
  id: number;
  name: string;
  codename: string | null;
  gender: string;
  hand: '左手' | '右手';
  weight_class: WeightClass;
  body_weight: number | null;
  city: string;
  training_spot: string | null;
  achievements: string | null;
  bio: string | null;
  contact: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rank_score: number;
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
  description: string | null;
  created_at: string;
}
