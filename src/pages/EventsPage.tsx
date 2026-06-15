import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Users, Gift, Phone, X, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import type { ArmEvent } from '@/types';
import { LikeButton } from '@/components/LikeButton';
import { CommentSection } from '@/components/CommentSection';

const evtDetailMarker = L.divIcon({ className: 'custom-marker', html: '<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);border:3px solid #fff;box-shadow:0 2px 10px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div>', iconSize: [28,28], iconAnchor: [14,14] });

function EventDetail({ event, onClose }: { event: ArmEvent; onClose: () => void }) {
  const [imgIndex, setImgIndex] = useState(0);
  const images = event.poster_urls?.length ? event.poster_urls : (event.poster_url ? [event.poster_url] : []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-stone-900/95 border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 flex items-center justify-center transition-colors z-10">
          <X className="w-4 h-4" />
        </button>

        {images.length > 0 && (
          <div className="relative">
            <img loading="lazy" src={images[imgIndex]} alt="" className="w-full h-56 sm:h-72 object-cover rounded-t-3xl" />
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIndex(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setImgIndex(i => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <span key={i} className={`w-2 h-2 rounded-full transition-all ${i === imgIndex ? 'bg-white w-4' : 'bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="p-5 sm:p-8 safe-bottom">
          <div className="mb-6">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30 mb-3">
              {new Date(event.event_date) >= new Date() ? '即将举行' : '已结束'}
            </span>
            <h2 className="text-2xl font-black text-white mb-1">{event.title}</h2>
            <p className="text-stone-400 text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(event.event_date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {event.location && (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 text-stone-400 text-xs mb-1"><MapPin className="w-3.5 h-3.5" />比赛地点</div>
                <p className="text-white text-sm font-semibold">{event.location}</p>
              </div>
            )}
            {event.weight_classes && event.weight_classes.length > 0 && (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 text-stone-400 text-xs mb-1"><Users className="w-3.5 h-3.5" />比赛级别</div>
                <p className="text-white text-sm font-semibold">{event.weight_classes.join(' · ')}</p>
              </div>
            )}
            {event.registration_fee && (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 text-stone-400 text-xs mb-1"><span className="text-sm font-bold">￥</span> 报名费</div>
                <p className="text-amber-400 text-sm font-semibold">{event.registration_fee}</p>
              </div>
            )}
            {event.contact_person && (
              <div className="glass rounded-xl p-4">
                <div className="flex items-center gap-2 text-stone-400 text-xs mb-1"><Phone className="w-3.5 h-3.5" />报名联系人</div>
                <p className="text-white text-sm font-semibold">{event.contact_person}</p>
              </div>
            )}
          </div>

          {event.latitude && event.longitude && (
            <div className="mb-6 h-[200px] rounded-xl overflow-hidden border border-white/10">
              <MapContainer center={[event.latitude, event.longitude]} zoom={15} className="h-full w-full z-0" zoomControl={false} attributionControl={false} dragging={false} scrollWheelZoom={false}>
                <TileLayer url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}" subdomains={['1','2','3','4']} />
                <Marker position={[event.latitude, event.longitude]} icon={evtDetailMarker} />
              </MapContainer>
            </div>
          )}

          {event.prizes && (
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-stone-400 text-xs mb-3"><Gift className="w-3.5 h-3.5" />奖金奖品</h3>
              <div className="glass rounded-xl p-5 text-sm text-white leading-relaxed whitespace-pre-line">{event.prizes}</div>
            </div>
          )}

          {event.description && (
            <div className="mb-6">
              <h3 className="text-stone-400 text-xs mb-2">赛事详情</h3>
              <p className="text-stone-300 text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {event.contact_info && (
            <p className="text-xs text-stone-500 pt-4 border-t border-white/5">📞 {event.contact_info}</p>
          )}

          <LikeButton targetType="event" targetId={event.id} />
          <CommentSection targetType="event" targetId={event.id} />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<ArmEvent | null>(null);
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true });
      return (data || []) as ArmEvent[];
    },
  });

  const upcoming = events?.filter((e) => new Date(e.event_date) >= new Date()) ?? [];
  const past = events?.filter((e) => new Date(e.event_date) < new Date()) ?? [];
  const eventsOnMap = (events || []).filter(e => e.latitude && e.longitude);
  const [showMap, setShowMap] = useState(false);

  const hasPoster = (e: ArmEvent) => !!(e.poster_url || (e.poster_urls && e.poster_urls.length > 0));
  const getPoster = (e: ArmEvent) => (e.poster_urls?.length ? e.poster_urls[0] : e.poster_url) ?? '';

  const evtMarker = L.divIcon({ className: 'custom-marker', html: '<div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);border:2px solid #fff;box-shadow:0 2px 8px rgba(239,68,68,0.4);display:flex;align-items:center;justify-content:center;font-size:12px;">📍</div>', iconSize: [24,24], iconAnchor: [12,12] });

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />返回首页
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="w-7 h-7 text-brand-400" />
          <h1 className="text-3xl font-bold text-white">赛事日历</h1>
        </div>

        {eventsOnMap.length > 0 && (
          <div className="mb-6">
            <button onClick={() => setShowMap(!showMap)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white text-sm mb-3 transition-all">
              <Globe className="w-4 h-4" />{showMap ? '收起地图' : '查看赛事地图'} ({eventsOnMap.length})
            </button>
            {showMap && (
              <div className="glass rounded-2xl overflow-hidden h-[350px]">
                <MapContainer center={[39.915,116.404]} zoom={11} className="h-full w-full z-0" zoomControl={false} attributionControl={false}>
                  <TileLayer url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}" subdomains={['1','2','3','4']} />
                  {eventsOnMap.map(evt => (
                    <Marker key={evt.id} position={[evt.latitude!, evt.longitude!]} icon={evtMarker}>
                      <Popup>
                        <div className="min-w-[150px]">
                          <h3 className="font-bold text-sm text-gray-900">{evt.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">📅 {evt.event_date}</p>
                          {evt.location && <p className="text-xs text-gray-500">📍 {evt.location}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="h-5 bg-white/5 rounded w-1/3 mb-3" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && upcoming.length === 0 && past.length === 0 && (
          <div className="glass rounded-3xl p-16 text-center">
            <Calendar className="w-16 h-16 text-stone-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-stone-400 mb-2">暂无赛事信息</h2>
            <p className="text-stone-600">赛事信息将由管理员发布</p>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />即将举行 ({upcoming.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcoming.map((evt) => (
                <motion.div key={evt.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedEvent(evt)}
                  className="glass rounded-2xl overflow-hidden hover:bg-white/[0.06] transition-all cursor-pointer group hover:border-brand-500/20">
                  {hasPoster(evt) ? (
                    <div className="relative h-40 overflow-hidden">
                      <img loading="lazy" src={getPoster(evt)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
                      <div className="absolute bottom-3 left-4 flex items-center gap-3">
                        <div className="shrink-0 w-12 h-12 rounded-xl bg-brand-500/90 flex flex-col items-center justify-center">
                          <span className="text-[10px] text-white/70">{new Date(evt.event_date).toLocaleDateString('zh-CN', { month: 'short' })}</span>
                          <span className="text-lg font-black text-white">{new Date(evt.event_date).getDate()}</span>
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg drop-shadow-lg">{evt.title}</h3>
                          {evt.location && <p className="text-white/70 text-xs drop-shadow">{evt.location}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5">
                      <div className="flex gap-4">
                        <div className="shrink-0 w-14 h-14 rounded-xl bg-brand-500/10 border border-brand-500/20 flex flex-col items-center justify-center">
                          <span className="text-[10px] text-stone-400">{new Date(evt.event_date).toLocaleDateString('zh-CN', { month: 'short' })}</span>
                          <span className="text-xl font-black text-white">{new Date(evt.event_date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-white mb-1 group-hover:text-brand-300 transition-colors">{evt.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap">
                            {evt.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{evt.location}</span>}
                            {evt.weight_classes && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{evt.weight_classes.join(' · ')}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="px-5 pb-4 flex items-center gap-4 text-xs flex-wrap">
                    {evt.registration_fee && <span className="text-amber-400 flex items-center gap-1"><span className="font-bold">￥</span>{evt.registration_fee}</span>}
                    {evt.prizes && <span className="text-emerald-400 flex items-center gap-1 truncate max-w-[160px]"><Gift className="w-3 h-3 shrink-0" />{evt.prizes.split('\n')[0]}</span>}
                    <span className="text-brand-400 ml-auto group-hover:translate-x-1 transition-transform text-xs">查看详情 →</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-stone-600 inline-block" />已结束 ({past.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60">
              {past.map((evt) => (
                <motion.div key={evt.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedEvent(evt)}
                  className="glass rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity flex">
                  {hasPoster(evt) && <div className="w-20 h-20 shrink-0"><img loading="lazy" src={getPoster(evt)} alt="" className="w-full h-full object-cover" /></div>}
                  <div className="p-3 flex-1 min-w-0">
                    <h3 className="text-white text-sm font-semibold truncate">{evt.title}</h3>
                    <p className="text-stone-500 text-xs mt-0.5">{new Date(evt.event_date).toLocaleDateString('zh-CN')}</p>
                    {evt.location && <p className="text-stone-600 text-xs mt-0.5 truncate">{evt.location}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {selectedEvent && <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
