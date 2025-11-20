export const formatMatchDate = (value: string) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  } catch (error) {
    console.warn('Failed to format match date:', error);
    return value;
  }
};
