const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string;

export function initGA() {
  if (!GA_ID) return;
  const s = document.createElement('script');
  s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  const w = window as any; w.dataLayer = w.dataLayer || [];
  const g = function (...a: any[]) { w.dataLayer.push(a); } as any;
  w.gtag = g; g('js', new Date()); g('config', GA_ID, { send_page_view: false });
}

export function pageview(path: string, title?: string) {
  const w = window as any;
  if (!GA_ID || !w.gtag) return;
  w.gtag('event', 'page_view', { page_path: path, page_title: title || document.title });
}
