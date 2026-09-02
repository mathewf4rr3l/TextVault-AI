export interface CatConfig {
  emoji: string;
  color: string;
  bg: string;
  label: string;
}

export const CATEGORY_CONFIG: Record<string, CatConfig> = {
  Notes:       { emoji: '📝', color: '#34C759', bg: 'rgba(52,199,89,0.12)',   label: 'Notes' },
  URL:         { emoji: '🔗', color: '#00F0FF', bg: 'rgba(0,240,255,0.12)',   label: 'Link' },
  PhoneNumber: { emoji: '📞', color: '#FF9500', bg: 'rgba(255,149,0,0.12)',   label: 'Phone' },
  Email:       { emoji: '📧', color: '#FF375F', bg: 'rgba(255,55,95,0.12)',   label: 'Email' },
  Date:        { emoji: '📅', color: '#5AC8FA', bg: 'rgba(90,200,250,0.12)',  label: 'Date' },
  Address:     { emoji: '📍', color: '#9D4CDD', bg: 'rgba(157,76,221,0.12)', label: 'Address' },
  Financial:   { emoji: '💳', color: '#F2A900', bg: 'rgba(242,169,0,0.12)',  label: 'Financial' },
  ID:          { emoji: '🪪', color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', label: 'ID' },
  Custom:      { emoji: '📂', color: '#8E8E93', bg: 'rgba(142,142,147,0.12)', label: 'Custom' },
};

export const CATEGORY_KEYS = ['Notes', 'URL', 'PhoneNumber', 'Email', 'Date', 'Address', 'Financial', 'ID', 'Custom'];
export const CATEGORY_FILTERS = ['All', ...CATEGORY_KEYS];
