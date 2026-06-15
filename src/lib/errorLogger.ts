import { supabase } from './supabase';

export function initErrorLogger() {
  const log = (message: string, stack?: string) => {
    supabase.from('error_logs').insert({
      message: message?.slice(0, 500) || 'unknown',
      stack: stack?.slice(0, 2000) || null,
      url: location.href,
      user_agent: navigator.userAgent,
    }).then(() => {}, () => {});
  };
  window.onerror = (_msg, _url, _line, _col, error) => { log(String(_msg), error?.stack); };
  window.addEventListener('unhandledrejection', (e) => {
    log(`UnhandledRejection: ${e.reason?.message || String(e.reason)}`, e.reason?.stack);
  });
}
