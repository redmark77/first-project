import './style.css';
import { fetchSuggestions, loadWeather, describeWeather, type GeoResult, type WeatherResponse } from './weather';

const cityInput = document.getElementById('cityInput') as HTMLInputElement;
const searchBtn = document.getElementById('searchBtn') as HTMLButtonElement;
const locBtn = document.getElementById('locBtn') as HTMLButtonElement;
const suggestionsEl = document.getElementById('suggestions') as HTMLUListElement;
const contentEl = document.getElementById('content') as HTMLElement;

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const query = cityInput.value.trim();
  if (query.length < 2) {
    hideSuggestions();
    return;
  }
  debounceTimer = setTimeout(() => runSearch(query), 600);
});

searchBtn.addEventListener('click', () => {
  const query = cityInput.value.trim();
  if (query) runSearch(query, true);
});

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const query = cityInput.value.trim();
    if (query) runSearch(query, true);
  }
});

locBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('이 브라우저는 위치 정보를 지원하지 않습니다.');
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    (pos) => selectWeather(pos.coords.latitude, pos.coords.longitude, '현재 위치'),
    () => showError('위치 정보를 가져올 수 없습니다.'),
  );
});

document.addEventListener('click', (e) => {
  if (!suggestionsEl.contains(e.target as Node) && e.target !== cityInput) {
    hideSuggestions();
  }
});

async function runSearch(query: string, autoPickFirst = false): Promise<void> {
  try {
    const results = await fetchSuggestions(query);

    if (results.length === 0) {
      if (autoPickFirst) showError(`"${query}"에 대한 검색 결과가 없습니다.`);
      hideSuggestions();
      return;
    }

    if (autoPickFirst) {
      selectPlace(results[0]);
      return;
    }

    renderSuggestions(results);
  } catch {
    showError('도시 검색 중 오류가 발생했습니다.');
  }
}

function renderSuggestions(results: GeoResult[]): void {
  suggestionsEl.innerHTML = '';
  results.forEach((place) => {
    const li = document.createElement('li');
    li.textContent = place.region ? `${place.name} (${place.region})` : place.name;
    li.addEventListener('click', () => selectPlace(place));
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.classList.remove('hidden');
}

function hideSuggestions(): void {
  suggestionsEl.classList.add('hidden');
  suggestionsEl.innerHTML = '';
}

function selectPlace(place: GeoResult): void {
  cityInput.value = place.name;
  hideSuggestions();
  showLoading();
  selectWeather(place.latitude, place.longitude, place.name);
}

function showLoading(): void {
  contentEl.innerHTML = '<p class="placeholder">불러오는 중...</p>';
}

function showError(message: string): void {
  contentEl.innerHTML = `<div class="error">${message}</div>`;
}

async function selectWeather(lat: number, lon: number, label: string): Promise<void> {
  try {
    const data = await loadWeather(lat, lon);
    renderWeather(data, label);
  } catch {
    showError('날씨 정보를 불러오지 못했습니다.');
  }
}

function renderWeather(data: WeatherResponse, label: string): void {
  const { current, daily } = data;
  const [desc, icon] = describeWeather(current.weather_code);

  const updated = new Date(current.time);
  const updatedStr = updated.toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  let forecastRows = '';
  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const dayLabel = i === 0 ? '오늘' : dayNames[date.getDay()] + '요일';
    const [, dIcon] = describeWeather(daily.weather_code[i]);
    forecastRows += `
      <div class="forecast-row">
        <span class="day">${dayLabel}</span>
        <span class="icon-small">${dIcon}</span>
        <span class="range"><span class="max">${Math.round(daily.temperature_2m_max[i])}°</span> / ${Math.round(daily.temperature_2m_min[i])}°</span>
      </div>`;
  }

  contentEl.innerHTML = `
    <div class="card">
      <div class="location">${label}</div>
      <div class="updated">${updatedStr} 기준</div>
      <div class="icon">${icon}</div>
      <div class="temp">${Math.round(current.temperature_2m)}°</div>
      <div class="desc">${desc}</div>
      <div class="details">
        <div class="detail-item">
          <span class="label">체감</span>
          <span class="value">${Math.round(current.apparent_temperature)}°</span>
        </div>
        <div class="detail-item">
          <span class="label">습도</span>
          <span class="value">${current.relative_humidity_2m}%</span>
        </div>
        <div class="detail-item">
          <span class="label">바람</span>
          <span class="value">${Math.round(current.wind_speed_10m)}km/h</span>
        </div>
      </div>
    </div>
    <div class="forecast">
      <h3>주간 예보</h3>
      ${forecastRows}
    </div>
  `;
}
