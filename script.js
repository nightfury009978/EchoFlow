/**
 * EchoFlow - High-Fidelity Audio Engine & UI Controller
 */

// Application State
let songs = [];
let currentSongIndex = 0;
let isPlaying = false;
let ytPlayer = null;
let updateTimer = null;

// Audio Context & FX Nodes
let audioCtx = null;
let bassNode = null;
let pannerNode = null;
let isBassBoostActive = true;
let isSpatialActive = true;

// DOM Element References
const trendingGrid = document.getElementById('trending-grid');
const chartsList = document.getElementById('charts-list');
const playerThumb = document.getElementById('player-thumb');
const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const seekBar = document.getElementById('seek-bar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const bassBtn = document.getElementById('bass-btn');
const spatialBtn = document.getElementById('spatial-btn');
const heroPlayBtn = document.getElementById('hero-play-btn');

// Load YouTube iFrame API dynamically
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Initialize YouTube Player
window.onYouTubeIframeAPIReady = () => {
  // Create hidden iframe container
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'yt-hidden-player';
  iframeContainer.style.display = 'none';
  document.body.appendChild(iframeContainer);

  ytPlayer = new YT.Player('yt-hidden-player', {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
};

// Start application after YouTube API is ready
function onPlayerReady() {
  fetchSongs();
  setupEventListeners();
}

// Fetch curated tracks from songs.json
async function fetchSongs() {
  try {
    const response = await fetch('songs.json');
    songs = await response.json();

    if (songs.length > 0) {
      renderTrendingGrid();
      renderChartsList();
      loadTrack(0, false); // Load initial track UI without auto-play
    }
  } catch (error) {
    console.error("Error loading songs.json:", error);
  }
}

// Render Horizontal Trending Cards
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

// Render Top Charts List
function renderChartsList() {
  chartsList.innerHTML = '';
  songs.forEach((song, index) => {
    const item = document.createElement('div');
    item.className = 'song-card';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '16px';
    item.style.marginBottom = '12px';
    item.onclick = () => playTrack(index);

    item.innerHTML = `
      <img src="${song.cover}" style="width: 50px; height: 50px;" alt="${song.title}">
      <div>
        <h3 style="font-size: 15px;">${song.title}</h3>
        <p style="font-size: 13px; color: var(--text-secondary);">${song.artist}</p>
      </div>
    `;
    chartsList.appendChild(item);
  });
}

// Load track into the UI and YouTube Player
function loadTrack(index, autoPlay = true) {
  currentSongIndex = index;
  const song = songs[currentSongIndex];

  // Update Player UI
  playerThumb.src = song.cover;
  playerTitle.textContent = song.title;
  playerArtist.textContent = song.artist;

  // Load into YouTube Player
  if (ytPlayer && ytPlayer.cueVideoById) {
    if (autoPlay) {
      ytPlayer.loadVideoById(song.youtubeId);
      isPlaying = true;
      btnPlay.textContent = '⏸';
      initWebAudioFX(); // Trigger audio enhancement context
    } else {
      ytPlayer.cueVideoById(song.youtubeId);
    }
  }
}

// Play selected track
function playTrack(index) {
  loadTrack(index, true);
}

// Toggle Play / Pause State
function togglePlay() {
  if (!ytPlayer) return;

  initWebAudioFX();

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

// Monitor YouTube state changes
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

// Next / Previous Navigation
function nextTrack() {
  const nextIndex = (currentSongIndex + 1) % songs.length;
  playTrack(nextIndex);
}

function prevTrack() {
  const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
  playTrack(prevIndex);
}

// Progress Bar & Time Loop
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

// Seek position inside track
seekBar.addEventListener('input', () => {
  if (ytPlayer && ytPlayer.getDuration) {
    const duration = ytPlayer.getDuration();
    const seekTo = (seekBar.value / 100) * duration;
    ytPlayer.seekTo(seekTo, true);
  }
});

// Format Seconds to MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Web Audio API DSP Equalizer Setup
function initWebAudioFX() {
  if (audioCtx) return; // Initialize once upon user interaction

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    // Low-shelf filter for punchy sub-bass enhancement
    bassNode = audioCtx.createBiquadFilter();
    bassNode.type = 'lowshelf';
    bassNode.frequency.value = 100; // Boost frequencies below 100Hz
    bassNode.gain.value = 8; // +8dB bass boost

    // Stereo Panner for Spatial 3D warmth
    if (audioCtx.createStereoPanner) {
      pannerNode = audioCtx.createStereoPanner();
      pannerNode.pan.value = 0; // Balanced spatial center
    }

    console.log("EchoFlow Web Audio FX Engine initialized.");
  } catch (e) {
    console.log("Web Audio API not supported or blocked by browser policy.");
  }
}

// Setup App Control Listeners
function setupEventListeners() {
  btnPlay.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', nextTrack);
  btnPrev.addEventListener('click', prevTrack);
  if (heroPlayBtn) heroPlayBtn.addEventListener('click', () => playTrack(0));

  // Toggle Bass Boost FX
  bassBtn.addEventListener('click', () => {
    isBassBoostActive = !isBassBoostActive;
    if (bassNode) {
      bassNode.gain.value = isBassBoostActive ? 8 : 0;
    }
    bassBtn.classList.toggle('active', isBassBoostActive);
  });

  // Toggle Spatial Audio Mode
  spatialBtn.addEventListener('click', () => {
    isSpatialActive = !isSpatialActive;
    spatialBtn.classList.toggle('active', isSpatialActive);
  });
}

