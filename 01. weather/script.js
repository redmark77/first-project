const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locBtn = document.getElementById('locBtn');
const suggestionsEl = document.getElementById('suggestions');
const contentEl = document.getElementById('content');

const WEATHER_CODES = {
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

function describeWeather(code) {
  return WEATHER_CODES[code] || ['알 수 없음', '❓'];
}

let debounceTimer = null;

cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const query = cityInput.value.trim();
  if (query.length < 2) {
    hideSuggestions();
    return;
  }
  debounceTimer = setTimeout(() => fetchSuggestions(query), 600);
});

searchBtn.addEventListener('click', () => {
  const query = cityInput.value.trim();
  if (query) fetchSuggestions(query, true);
});

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const query = cityInput.value.trim();
    if (query) fetchSuggestions(query, true);
  }
});

locBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('이 브라우저는 위치 정보를 지원하지 않습니다.');
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      loadWeather(pos.coords.latitude, pos.coords.longitude, '현재 위치');
    },
    () => showError('위치 정보를 가져올 수 없습니다.')
  );
});

document.addEventListener('click', (e) => {
  if (!suggestionsEl.contains(e.target) && e.target !== cityInput) {
    hideSuggestions();
  }
});

async function fetchSuggestions(query, autoPickFirst = false) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
      `&format=jsonv2&limit=5&addressdetails=1&accept-language=ko`;
    const res = await fetch(url);
    const data = await res.json();
    const results = (data || []).map((item) => ({
      name: item.address?.city || item.address?.town || item.address?.village ||
            item.address?.county || item.name || item.display_name.split(',')[0],
      region: [item.address?.state, item.address?.country].filter(Boolean).join(', '),
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));

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
  } catch (err) {
    showError('도시 검색 중 오류가 발생했습니다.');
  }
}

function renderSuggestions(results) {
  suggestionsEl.innerHTML = '';
  results.forEach((place) => {
    const li = document.createElement('li');
    li.textContent = place.region ? `${place.name} (${place.region})` : place.name;
    li.addEventListener('click', () => selectPlace(place));
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.classList.remove('hidden');
}

function hideSuggestions() {
  suggestionsEl.classList.add('hidden');
  suggestionsEl.innerHTML = '';
}

function selectPlace(place) {
  cityInput.value = place.name;
  hideSuggestions();
  showLoading();
  loadWeather(place.latitude, place.longitude, place.name);
}

function showLoading() {
  contentEl.innerHTML = '<p class="placeholder">불러오는 중...</p>';
}

function showError(message) {
  contentEl.innerHTML = `<div class="error">${message}</div>`;
}

async function loadWeather(lat, lon, label) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('네트워크 오류');
    const data = await res.json();
    renderWeather(data, label);
  } catch (err) {
    showError('날씨 정보를 불러오지 못했습니다.');
  }
}

function renderWeather(data, label) {
  const current = data.current;
  const daily = data.daily;
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
