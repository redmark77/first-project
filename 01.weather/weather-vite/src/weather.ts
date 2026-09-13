export interface GeoResult {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
}

export interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimItem {
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

export const WEATHER_CODES: Record<number, [string, string]> = {
  0: ['맑음', '☀️'],
  1: ['대체로 맑음', '🌤️'],
  2: ['구름 조금', '⛅'],
  3: ['흐림', '☁️'],
  45: ['안개', '🌫️'],
  48: ['짙은 안개', '🌫️'],
  51: ['가벼운 이슬비', '🌦️'],
  53: ['이슬비', '🌦️'],
  55: ['강한 이슬비', '🌧️'],
  56: ['어는 이슬비', '🌧️'],
  57: ['강한 어는 이슬비', '🌧️'],
  61: ['약한 비', '🌧️'],
  63: ['비', '🌧️'],
  65: ['강한 비', '🌧️'],
  66: ['어는 비', '🌧️'],
  67: ['강한 어는 비', '🌧️'],
  71: ['약한 눈', '🌨️'],
  73: ['눈', '🌨️'],
  75: ['강한 눈', '❄️'],
  77: ['싸락눈', '❄️'],
  80: ['약한 소나기', '🌦️'],
  81: ['소나기', '🌧️'],
  82: ['강한 소나기', '⛈️'],
  85: ['약한 눈 소나기', '🌨️'],
  86: ['강한 눈 소나기', '❄️'],
  95: ['뇌우', '⛈️'],
  96: ['우박 동반 뇌우', '⛈️'],
  99: ['강한 우박 동반 뇌우', '⛈️'],
};

export function describeWeather(code: number): [string, string] {
  return WEATHER_CODES[code] ?? ['알 수 없음', '❓'];
}

export async function fetchSuggestions(query: string): Promise<GeoResult[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=jsonv2&limit=5&addressdetails=1&accept-language=ko`;
  const res = await fetch(url);
  const data: NominatimItem[] = await res.json();

  return (data || []).map((item) => ({
    name:
      item.address?.city ??
      item.address?.town ??
      item.address?.village ??
      item.address?.county ??
      item.name ??
      item.display_name.split(',')[0],
    region: [item.address?.state, item.address?.country].filter(Boolean).join(', '),
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
  }));
}

export async function loadWeather(lat: number, lon: number): Promise<WeatherResponse> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('네트워크 오류');
  return res.json();
}
