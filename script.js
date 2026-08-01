let songs = [];
let recentlyPlayed = [];
let currentSongIndex = 0;
let isPlaying = false;
let ytPlayer = null;
let updateTimer = null;

// DOM References
const trendingGrid = document.getElementById('trending-grid');
const recentlyPlayedGrid = document.getElementById('recently-played-grid');
const chartsList = document.getElementById('charts-list');
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

// Full-Screen Modal References
const nowPlayingModal = document.getElementById('now-playing-modal');
const openPlayerModal = document.getElementById('open-player-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalThumb = document.getElementById('modal-thumb');
const modalTitle = document.getElementById('modal-title');
const modalArtist = document.getElementById('modal-artist');
const modalSeekBar = document.getElementById('modal-seek-bar');
const modalCurrentTime = document.getElementById('modal-current-time');
const modalTotalTime = document.getElementById('modal-total-time');
const modalBtnPlay = document.getElementById('modal-btn-play');
const modalBtnPrev = document.getElementById('modal-btn-prev');
const modalBtnNext = document.getElementById('modal-btn-next');

// Drawer References
const menuToggle = document.getElementById('menu-toggle');
const sideDrawer = document.getElementById('side-drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const closeDrawer = document.getElementById('close-drawer');

// YouTube API
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
      <p>${song.artist} • ${song.language}</p>
    `;
    trendingGrid.appendChild(card);
  });
}

function renderRecentlyPlayed() {
  if (recentlyPlayed.length === 0) return;
  recentlyPlayedGrid.innerHTML = '';
  recentlyPlayed.forEach((song) => {
    const actualIndex = songs.findIndex(s => s.id === song.id);
    const card = document.createElement('div');
    card.className = 'song-card';
    card.onclick = () => playTrack(actualIndex);

    card.innerHTML = `
      <img src="${song.cover}" alt="${song.title}">
      <h3>${song.title}</h3>
      <p>${song.artist}</p>
    `;
    recentlyPlayedGrid.appendChild(card);
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
        <p style="font-size: 12px; color: var(--text-secondary);">${song.artist} • ${song.language}</p>
      </div>
    `;
    container.appendChild(item);
  });
}

function loadTrack(index, autoPlay = true) {
  currentSongIndex = index;
  const song = songs[currentSongIndex];

  // Sync Bottom Mini Player
  playerThumb.src = song.cover;
  playerTitle.textContent = song.title;
  playerArtist.textContent = song.artist;

  // Sync Full Screen Modal
  modalThumb.src = song.cover;
  modalTitle.textContent = song.title;
  modalArtist.textContent = song.artist;

  // Add to Recently Played
  if (autoPlay && !recentlyPlayed.some(s => s.id === song.id)) {
    recentlyPlayed.unshift(song);
    renderRecentlyPlayed();
  }

  if (ytPlayer && ytPlayer.cueVideoById) {
    if (autoPlay) {
      ytPlayer.loadVideoById(song.youtubeId);
      isPlaying = true;
      updatePlayIcons(true);
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
    updatePlayIcons(false);
    isPlaying = false;
  } else {
    ytPlayer.playVideo();
    updatePlayIcons(true);
    isPlaying = true;
  }
}

function updatePlayIcons(playing) {
  const icon = playing ? '⏸' : '▶';
  btnPlay.textContent = icon;
  modalBtnPlay.textContent = icon;
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    updatePlayIcons(true);
    startProgressLoop();
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    updatePlayIcons(false);
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
        const percent = (currentTime / duration) * 100;
        seekBar.value = percent;
        modalSeekBar.value = percent;

        const currentFormatted = formatTime(currentTime);
        const durationFormatted = formatTime(duration);

        currentTimeEl.textContent = currentFormatted;
        totalTimeEl.textContent = durationFormatted;
        modalCurrentTime.textContent = currentFormatted;
        modalTotalTime.textContent = durationFormatted;
      }
    }
  }, 500);
}

seekBar.addEventListener('input', () => syncSeek(seekBar.value));
modalSeekBar.addEventListener('input', () => syncSeek(modalSeekBar.value));

function syncSeek(val) {
  if (ytPlayer && ytPlayer.getDuration) {
    const duration = ytPlayer.getDuration();
    ytPlayer.seekTo((val / 100) * duration, true);
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function handleSearch(query) {
  const filtered = songs.filter(s => 
    s.title.toLowerCase().includes(query.toLowerCase()) || 
    s.artist.toLowerCase().includes(query.toLowerCase()) ||
    s.language.toLowerCase().includes(query.toLowerCase())
  );
  if (filtered.length > 0) {
    renderChartsList(filtered, searchResultsList);
  } else {
    searchResultsList.innerHTML = `<p style="color: var(--text-secondary);">No songs found for "${query}"</p>`;
  }
}

function setupEventListeners() {
  // Mini Controls
  btnPlay.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', nextTrack);
  btnPrev.addEventListener('click', prevTrack);

  // Modal Controls
  modalBtnPlay.addEventListener('click', togglePlay);
  modalBtnNext.addEventListener('click', nextTrack);
  modalBtnPrev.addEventListener('click', prevTrack);

  if (heroPlayBtn) heroPlayBtn.addEventListener('click', () => playTrack(0));

  // Open / Close Full Screen Modal
  openPlayerModal.addEventListener('click', () => {
    nowPlayingModal.classList.add('active');
  });
  closeModalBtn.addEventListener('click', () => {
    nowPlayingModal.classList.remove('active');
  });

  // Drawer Menu Handlers
  menuToggle.addEventListener('click', () => {
    sideDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
  });
  const closeDrawerFunc = () => {
    sideDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
  };
  closeDrawer.addEventListener('click', closeDrawerFunc);
  drawerOverlay.addEventListener('click', closeDrawerFunc);

  // Single Search Box
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  }

  // Mobile Bottom Tab Navigation Switcher
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
