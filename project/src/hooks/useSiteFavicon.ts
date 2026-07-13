import React from 'react';
import { getSafeAssetUrl } from '../lib/site';

export function useSiteFavicon(favicon?: string | null, logo?: string | null) {
  React.useEffect(() => {
    const iconUrl = getSafeAssetUrl(favicon) || getSafeAssetUrl(logo);
    if (!iconUrl) return;

    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = iconUrl;
  }, [favicon, logo]);
}
