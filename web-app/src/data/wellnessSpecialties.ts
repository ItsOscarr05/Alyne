export interface SpecialtyOption {
  value: string;
  niche: string;
}

export const WELLNESS_NICHES = {
  fitness: 'Fitness & Exercise',
  mindBody: 'Mind-Body',
  nutrition: 'Nutrition',
  bodywork: 'Bodywork & Massage',
  mentalWellness: 'Mental Wellness',
  recovery: 'Recovery & Mobility',
  lifeStage: 'Life Stage',
  other: 'Other',
} as const;

export const WELLNESS_SPECIALTIES: SpecialtyOption[] = [
  { value: 'Personal Training', niche: WELLNESS_NICHES.fitness },
  { value: 'Strength Training', niche: WELLNESS_NICHES.fitness },
  { value: 'Cardio Conditioning', niche: WELLNESS_NICHES.fitness },
  { value: 'HIIT', niche: WELLNESS_NICHES.fitness },
  { value: 'Weight Loss Coaching', niche: WELLNESS_NICHES.fitness },
  { value: 'Athletic Performance', niche: WELLNESS_NICHES.fitness },
  { value: 'Functional Fitness', niche: WELLNESS_NICHES.fitness },
  { value: 'Bootcamp', niche: WELLNESS_NICHES.fitness },
  { value: 'Yoga', niche: WELLNESS_NICHES.mindBody },
  { value: 'Pilates', niche: WELLNESS_NICHES.mindBody },
  { value: 'Tai Chi', niche: WELLNESS_NICHES.mindBody },
  { value: 'Meditation', niche: WELLNESS_NICHES.mindBody },
  { value: 'Mindfulness', niche: WELLNESS_NICHES.mindBody },
  { value: 'Breathwork', niche: WELLNESS_NICHES.mindBody },
  { value: 'Qi Gong', niche: WELLNESS_NICHES.mindBody },
  { value: 'Barre', niche: WELLNESS_NICHES.mindBody },
  { value: 'Nutrition Coaching', niche: WELLNESS_NICHES.nutrition },
  { value: 'Weight Management', niche: WELLNESS_NICHES.nutrition },
  { value: 'Sports Nutrition', niche: WELLNESS_NICHES.nutrition },
  { value: 'Meal Planning', niche: WELLNESS_NICHES.nutrition },
  { value: 'Dietary Counseling', niche: WELLNESS_NICHES.nutrition },
  { value: 'Intuitive Eating', niche: WELLNESS_NICHES.nutrition },
  { value: 'Plant-Based Nutrition', niche: WELLNESS_NICHES.nutrition },
  { value: 'Massage Therapy', niche: WELLNESS_NICHES.bodywork },
  { value: 'Sports Massage', niche: WELLNESS_NICHES.bodywork },
  { value: 'Deep Tissue', niche: WELLNESS_NICHES.bodywork },
  { value: 'Swedish Massage', niche: WELLNESS_NICHES.bodywork },
  { value: 'Reflexology', niche: WELLNESS_NICHES.bodywork },
  { value: 'Reiki', niche: WELLNESS_NICHES.bodywork },
  { value: 'Myofascial Release', niche: WELLNESS_NICHES.bodywork },
  { value: 'Trigger Point Therapy', niche: WELLNESS_NICHES.bodywork },
  { value: 'Life Coaching', niche: WELLNESS_NICHES.mentalWellness },
  { value: 'Stress Management', niche: WELLNESS_NICHES.mentalWellness },
  { value: 'Sleep Coaching', niche: WELLNESS_NICHES.mentalWellness },
  { value: 'Habit Building', niche: WELLNESS_NICHES.mentalWellness },
  { value: 'Anxiety Support', niche: WELLNESS_NICHES.mentalWellness },
  { value: 'Burnout Recovery', niche: WELLNESS_NICHES.mentalWellness },
  { value: 'Mindset Coaching', niche: WELLNESS_NICHES.mentalWellness },
  { value: 'Stretching', niche: WELLNESS_NICHES.recovery },
  { value: 'Mobility Training', niche: WELLNESS_NICHES.recovery },
  { value: 'Injury Prevention', niche: WELLNESS_NICHES.recovery },
  { value: 'Recovery Coaching', niche: WELLNESS_NICHES.recovery },
  { value: 'Foam Rolling', niche: WELLNESS_NICHES.recovery },
  { value: 'Flexibility Training', niche: WELLNESS_NICHES.recovery },
  { value: 'Prenatal Fitness', niche: WELLNESS_NICHES.lifeStage },
  { value: 'Postnatal Fitness', niche: WELLNESS_NICHES.lifeStage },
  { value: 'Senior Fitness', niche: WELLNESS_NICHES.lifeStage },
  { value: 'Youth Fitness', niche: WELLNESS_NICHES.lifeStage },
  { value: 'Corporate Wellness', niche: WELLNESS_NICHES.lifeStage },
  { value: 'Holistic Health', niche: WELLNESS_NICHES.other },
  { value: 'Wellness Consulting', niche: WELLNESS_NICHES.other },
];

export function filterSpecialties(query: string): SpecialtyOption[] {
  if (!query.trim()) return WELLNESS_SPECIALTIES;
  const q = query.trim().toLowerCase();
  return WELLNESS_SPECIALTIES.filter((s) => s.value.toLowerCase().includes(q));
}
