import type { WeightClass } from '@/types';

export const WEIGHT_CLASSES: { value: WeightClass; label: string; icon: string }[] = [
  { value: '63kg', label: '63kg', icon: '💪' },
  { value: '70kg', label: '70kg', icon: '🔥' },
  { value: '78kg', label: '78kg', icon: '⚡' },
  { value: '86kg', label: '86kg', icon: '🦾' },
  { value: '95kg', label: '95kg', icon: '🏋️' },
  { value: '105kg', label: '105kg', icon: '💎' },
  { value: '105kg+', label: '105kg+', icon: '👑' },
];

export const CITIES = [
  '东城区', '西城区', '朝阳区', '丰台区', '石景山区',
  '海淀区', '顺义区', '通州区', '大兴区', '房山区',
  '门头沟区', '昌平区', '平谷区', '密云区', '怀柔区', '延庆区',
];

export const SITE_NAME = '北京腕力排行榜';
export const SITE_DESC = '北京腕力运动员排名与信息平台';
