const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '';

export interface SearchResult {
  lat: number;
  lng: number;
  name: string;
}

/**
 * 高德输入提示 API（搜索建议，支持模糊搜索、品牌名）
 * 文档: https://lbs.amap.com/api/webservice/guide/api/inputtips
 */
async function amapInputTips(keywords: string): Promise<SearchResult[]> {
  const url = `https://restapi.amap.com/v3/assistant/inputtips?key=${AMAP_KEY}&keywords=${encodeURIComponent(keywords)}&city=110000&citylimit=true`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== '1' || !data.tips) return [];
  return data.tips
    .filter((t: any) => t.location && t.location !== '0,0')
    .slice(0, 6)
    .map((t: any) => {
      const [lng, lat] = t.location.split(',').map(Number);
      return { lat, lng, name: t.name + (t.district ? `，${t.district}` : '') };
    });
}

/**
 * 高德地理编码（地址 → 坐标）
 * 文档: https://lbs.amap.com/api/webservice/guide/api/georegeo
 */
async function amapGeocode(address: string): Promise<SearchResult[]> {
  const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&city=北京`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== '1' || !data.geocodes?.length) return [];
  return data.geocodes.slice(0, 3).map((g: any) => {
    const [lng, lat] = g.location.split(',').map(Number);
    return { lat, lng, name: g.formatted_address || g.name || '' };
  });
}

// ─── OSM 回退（高德 Key 未配置时使用）───
async function osmSearch(query: string): Promise<SearchResult[]> {
  const q = encodeURIComponent(query);
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5&accept-language=zh`,
      { signal: controller.signal },
    );
    clearTimeout(t);
    const data = await res.json();
    return (data || []).slice(0, 5).map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      name: item.display_name?.split(',')[0] || '未知位置',
    }));
  } catch {
    return [];
  }
}

// ─── 公开 API ───

/** 搜索地点（优先高德，回退 OSM） */
export async function searchPlaces(query: string): Promise<{
  results: SearchResult[];
  source: string;
  error?: string;
}> {
  if (query.length < 2) return { results: [], source: '' };

  if (AMAP_KEY) {
    const results = await amapInputTips(query);
    if (results.length > 0) return { results, source: 'amap' };
    const geo = await amapGeocode(`北京${query}`);
    if (geo.length > 0) return { results: geo, source: 'amap-geocode' };
    return {
      results: [],
      source: 'amap',
      error: '未找到匹配地点。试试更具体的关键词，或直接在高德地图上点击位置。',
    };
  }

  const results = await osmSearch(`北京 ${query}`);
  if (results.length === 0) {
    return {
      results: [],
      source: 'osm',
      error: '未找到匹配地点。试试输入完整名称，或直接在高德地图上点击位置标注。',
    };
  }
  return { results, source: 'osm' };
}

/** 地址 → 坐标 */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  if (AMAP_KEY) {
    const results = await amapGeocode(`北京${address}`);
    if (results.length > 0) return { lat: results[0].lat, lng: results[0].lng };
    return null;
  }
  const results = await osmSearch(`北京 ${address}`);
  return results.length > 0 ? { lat: results[0].lat, lng: results[0].lng } : null;
}
