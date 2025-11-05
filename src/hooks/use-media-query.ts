import { useEffect, useState } from 'react';

/**
 * Media query hook for responsive design
 * Breakpoints follow Tailwind CSS conventions:
 * - Mobile: < 768px
 * - Tablet: >= 768px and < 1024px
 * - Desktop: >= 1024px
 */

export const useMediaQuery = () => {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>(
    'desktop'
  );

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      if (width < 768) setDevice('mobile');
      else if (width < 1024) setDevice('tablet');
      else setDevice('desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return {
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    device,
  };
};
