let songs = [];
let currentSongIndex = 0;
let isPlaying = false;
let ytPlayer = null;
let updateTimer = null;

// DOM Elements
const trendingGrid = document.getElementById('trending-grid');
const chartsList = document.getElementById('charts-list');
const libraryList = document.getElementById('library-list');
const searchResultsList = document.getElementById('search-results-list');
const playerThumb = document.getElementById('player-thumb');
const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const seekBar = document.getElementById('seek-bar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const heroPlayBtn = document.getElementById('hero-play-btn');

// Load YouTube API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = () => {
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'yt-hidden-player';
  iframeContainer.style.display = 'none';
  document.body.appendChild(iframeContainer);

  ytPlayer = new YT.Player('yt-hidden-player', {
    height: '0', width: '0',
    playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1 },
    events: {
      onReady: () => { fetchSongs(); setupEventListeners(); },
      onStateChange: onPlayerStateChange
    }
  });
};

async function fetchSongs() {
  try {
    const response = await fetch('songs.json');
    songs = await response.json();

    if (songs.length > 0) {
      renderTrendingGrid();
      renderChartsList(songs, chartsList);
      renderChartsList(songs, libraryList);
      loadTrack(0, false);
    }
  } catch (error) {
    console.error("Error loading songs.json:", error);
  }
}

function renderTrendingGrid() {
  trendingGrid.innerHTML = '';
  songs.forEach((song, index) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.onclick = () => playTrack(index);

    card.innerHTML = `
      <img src="${song.cover}" alt="${song.title}">
      <h3>${song.title}</h3>
      <p>${song.artist}</p>
    `;
    trendingGrid.appendChild(card);
  });
}

function renderChartsList(songList, container) {
  container.innerHTML = '';
  songList.forEach((song) => {
    const actualIndex = songs.findIndex(s => s.id === song.id);
    const item = document.createElement('div');
    item.className = 'song-card';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '12px';
    item.style.marginBottom = '10px';
    item.onclick = () => playTrack(actualIndex);

    item.innerHTML = `
      <img src="${song.cover}" style="width: 48px; height: 48px; border-radius: 8px;" alt="${song.title}">
      <div style="overflow: hidden;">
        <h3 style="font-size: 14px;">${song.title}</h3>
        <p style="font-size: 12px; color: var(--text-secondary);">${song.artist}</p>
      </div>
    `;
    container.appendChild(item);
  });
}

function loadTrack(index, autoPlay = true) {
  currentSongIndex = index;
  const song = songs[currentSongIndex];

  playerThumb.src = song.cover;
  playerTitle.textContent = song.title;
  playerArtist.textContent = song.artist;

  if (ytPlayer && ytPlayer.cueVideoById) {
    if (autoPlay) {
      ytPlayer.loadVideoById(song.youtubeId);
      isPlaying = true;
      btnPlay.textContent = '⏸';
    } else {
      ytPlayer.cueVideoById(song.youtubeId);
    }
  }
}

function playTrack(index) {
  loadTrack(index, true);
}

function togglePlay() {
  if (!ytPlayer) return;
  if (isPlaying) {
    ytPlayer.pauseVideo();
    btnPlay.textContent = '▶';
    isPlaying = false;
  } else {
    ytPlayer.playVideo();
    btnPlay.textContent = '⏸';
    isPlaying = true;
  }
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    btnPlay.textContent = '⏸';
    startProgressLoop();
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    btnPlay.textContent = '▶';
    clearInterval(updateTimer);
  } else if (event.data === YT.PlayerState.ENDED) {
    nextTrack();
  }
}

function nextTrack() {
  playTrack((currentSongIndex + 1) % songs.length);
}

function prevTrack() {
  playTrack((currentSongIndex - 1 + songs.length) % songs.length);
}

function startProgressLoop() {
  clearInterval(updateTimer);
  updateTimer = setInterval(() => {
    if (ytPlayer && isPlaying) {
      const currentTime = ytPlayer.getCurrentTime() || 0;
      const duration = ytPlayer.getDuration() || 0;
      if (duration > 0) {
        seekBar.value = (currentTime / duration) * 100;
        currentTimeEl.textContent = formatTime(currentTime);
        totalTimeEl.textContent = formatTime(duration);
      }
    }
  }, 500);
}

seekBar.addEventListener('input', () => {
  if (ytPlayer && ytPlayer.getDuration) {
    const duration = ytPlayer.getDuration();
    ytPlayer.seekTo((seekBar.value / 100) * duration, true);
  }
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Filter songs for search
function handleSearch(query) {
  const filtered = songs.filter(s => 
    s.title.toLowerCase().includes(query.toLowerCase()) || 
    s.artist.toLowerCase().includes(query.toLowerCase())
  );
  if (filtered.length > 0) {
    renderChartsList(filtered, searchResultsList);
  } else {
    searchResultsList.innerHTML = `<p style="color: var(--text-secondary);">No songs found for "${query}"</p>`;
  }
}

function setupEventListeners() {
  btnPlay.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', nextTrack);
  btnPrev.addEventListener('click', prevTrack);
  if (heroPlayBtn) heroPlayBtn.addEventListener('click', () => playTrack(0));

  // Search Inputs
  const searchInput = document.getElementById('search-input');
  const mobileSearchInput = document.getElementById('mobile-search-input');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  }
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  }

  // Mobile Bottom Nav Tab Switcher
  const navItems = document.querySelectorAll('.nav-item');
  const tabViews = document.querySelectorAll('.tab-view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetViewId = item.getAttribute('data-target');

      navItems.forEach(nav => nav.classList.remove('active'));
      tabViews.forEach(view => view.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(targetViewId).classList.add('active');
    });
  });
}
