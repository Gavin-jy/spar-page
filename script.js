function createBenchmark(root, scenes) {
const grid = root.querySelector('.video-grid');
const playButton = root.querySelector('.play');
const seek = root.querySelector('.seek');
const time = root.querySelector('.time');
const status = root.querySelector('.player-note');
const scrollArea = root.querySelector('.comparison-table-scroll');
function updateScrollHint() {
  const overflow = scrollArea.scrollWidth > scrollArea.clientWidth + 2;
  root.querySelector('.scroll-hint').hidden = !overflow;
  root.querySelector('.comparison-scroll-shell').classList.toggle('more-right', overflow && scrollArea.scrollLeft + scrollArea.clientWidth < scrollArea.scrollWidth - 2);
}
scrollArea.addEventListener('scroll', updateScrollHint);
new ResizeObserver(updateScrollHint).observe(scrollArea);
let playbackSpeed = 1;
let selected = 0;
let videos = [];
let playing = false;
let version = 0;
let starting = false;
let currentFrame = -1;

function highlightTime(current) {
  const frames = scenes[selected].videos[0].frames;
  let nearest = 0;
  frames.forEach((frame, index) => {
    if (Math.abs(frame.time - current) < Math.abs(frames[nearest].time - current)) nearest = index;
  });
  if (nearest === currentFrame) return;
  currentFrame = nearest;
  root.querySelectorAll('.shared-timestamps span').forEach((label, index) => label.classList.toggle('is-current', index === nearest));
  root.querySelectorAll('.frame-strip').forEach(strip => {
    [...strip.children].forEach((button, index) => button.classList.toggle('is-current', index === nearest));
  });
}

function duration() {
  return videos.length && videos.every(video => Number.isFinite(video.duration))
    ? Math.min(...videos.map(video => video.duration)) : 0;
}

function pause() {
  version += 1;
  playing = false;
  starting = false;
  videos.forEach(video => video.pause());
  playButton.textContent = 'Play together';
}

async function play() {
  if (starting) return;
  const currentVersion = version;
  const activeVideos = [...videos];
  starting = true;
  playButton.textContent = 'Loading…';
  const results = await Promise.allSettled(activeVideos.map(video => video.play()));
  if (currentVersion !== version) return;
  starting = false;
  if (results.some(result => result.status === 'rejected')) {
    pause();
    status.textContent = 'Playback could not start. Try Play together again, or open a video individually.';
    return;
  }
  playing = true;
  playButton.textContent = 'Pause together';
  status.textContent = 'Synchronized playback · Original aspect ratios · Audio muted';
}

function renderScene() {
  currentFrame = -1;
  version += 1;
  pause();
  videos.forEach(video => { video.removeAttribute('src'); video.load(); });
  const scene = scenes[selected];
  root.querySelector('.scene-position').textContent = `Example ${selected + 1} of ${scenes.length} · ${scene.title}`;
  root.querySelector('.scene-meta').textContent = `${scene.benchmark} / ${scene.sample_id}`;
  root.querySelector('.scene-title').textContent = scene.title;
  root.querySelector('.prompt').textContent = scene.prompt;
  root.querySelectorAll('.scene-tab').forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
  const order = ['Wan2.2-TI2V-5B', 'CogVideoX1.5-5B', 'Cosmos3-Nano', 'HunyuanVideo-1.5', 'GeoPhys', 'WMReward', 'SPAR'];
  const included = [...scene.videos].sort((left, right) => order.indexOf(left.method) - order.indexOf(right.method));
  const timestamps = root.querySelector('.shared-timestamps');
  timestamps.replaceChildren();
  included[0].frames.forEach(frame => {
    const label = document.createElement('span');
    label.textContent = `t = ${frame.time.toFixed(2)} s`;
    timestamps.append(label);
  });
  grid.replaceChildren();
  grid.classList.toggle('expanded', included.length > 3);
  videos = included.map(item => {
    const figure = document.createElement('figure');
    figure.className = 'video-card';
    const caption = document.createElement('figcaption');
    const name = document.createElement('span');
    name.textContent = item.method === 'SPAR' ? 'SPAR (Ours)' : item.method;
    caption.append(name);
    const link = document.createElement('a');
    link.href = item.src;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open video ↗';
    link.setAttribute('aria-label', `Open ${item.method} video`);
    caption.append(link);
    const video = document.createElement('video');
    video.src = item.src;
    video.poster = item.poster;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.playbackRate = playbackSpeed;
    video.controls = false;
    video.setAttribute('aria-label', `${item.method}: ${scene.title}`);
    video.addEventListener('error', () => {
      if (!video.getAttribute('src')) return;
      pause();
      status.textContent = `Unable to load ${item.method}. Open the individual video or reload the page.`;
    });
    const media = document.createElement('div');
    media.className = 'method-video';
    const overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = 'video-play-overlay';
    overlay.textContent = '▶';
    overlay.setAttribute('aria-label', `Play ${item.method} video`);
    overlay.addEventListener('click', () => {
      video.play().catch(() => { status.textContent = 'Playback could not start. Try the video controls.'; });
    });
    video.addEventListener('play', () => {
      video.controls = true;
      overlay.hidden = true;
      media.classList.add('has-started');
    });
    video.addEventListener('timeupdate', () => { if (!playing) highlightTime(video.currentTime); });
    media.append(video, overlay);
    const strip = document.createElement('div');
    strip.className = 'frame-strip';
    strip.setAttribute('role', 'group');
    strip.setAttribute('aria-label', `${item.method} temporal frames`);
    item.frames.forEach(frame => {
      const button = document.createElement('button');
      button.className = 'frame-button';
      button.type = 'button';
      button.setAttribute('aria-label', `Seek all videos to ${frame.time.toFixed(2)} seconds`);
      button.dataset.hint = `Seek to ${frame.time.toFixed(2)} s`;
      const picture = document.createElement('img');
      picture.src = frame.src;
      picture.alt = `${item.method} at ${frame.time.toFixed(2)} seconds`;
      picture.loading = 'lazy';
      picture.width = 480;
      picture.height = 300;
      button.append(picture);
      button.addEventListener('click', () => {
        pause();
        videos.forEach(video => { if (video.readyState > 0) video.currentTime = Math.min(frame.time, video.duration); });
      });
      strip.append(button);
    });
    figure.append(caption, media, strip);
    grid.append(figure);
    return video;
  });
  seek.value = 0;
  time.textContent = '0.0 / 0.0 s';
  status.textContent = 'Synchronized playback · Original aspect ratios · Audio muted';
}

scenes.forEach((scene, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scene-tab';
  const meta = document.createElement('span');
  meta.className = 'example-id';
  meta.textContent = `Example ${scene.sample_id}`;
  const title = document.createElement('strong');
  title.textContent = scene.title;
  const preview = document.createElement('img');
  preview.src = scene.videos.find(video => video.method === 'SPAR').poster;
  preview.alt = '';
  preview.loading = 'lazy';
  const text = document.createElement('div');
  text.className = 'example-label';
  text.append(meta, title);
  button.append(preview, text);
  button.addEventListener('click', () => { selected = index; renderScene(); });
  root.querySelector('.scene-tabs').append(button);
});
playButton.addEventListener('click', () => {
  if (starting) return;
  if (playing) pause(); else play();
});
root.querySelector('.restart').addEventListener('click', () => { videos.forEach(video => { video.currentTime = 0; }); });
root.querySelectorAll('[data-speed]').forEach(button => button.addEventListener('click', () => {
  playbackSpeed = Number(button.dataset.speed);
  videos.forEach(video => { video.playbackRate = playbackSpeed; });
  root.querySelectorAll('[data-speed]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
}));
seek.addEventListener('input', () => {
  const target = Number(seek.value) / 1000 * duration();
  videos.forEach(video => { if (video.readyState > 0) video.currentTime = target; });
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

function tick() {
  if (root.hidden) {
    requestAnimationFrame(tick);
    return;
  }
  const end = duration();
  const current = videos[0]?.currentTime || 0;
  if (playing && end) {
    if (current >= end - 0.08 || videos.some(video => video.ended)) {
      videos.forEach(video => { video.currentTime = 0; });
      play();
    } else if (!videos.some(video => video.seeking)) {
      videos.slice(1).forEach(video => {
        if (Math.abs(video.currentTime - current) > 0.12) video.currentTime = current;
      });
    }
  }
  if (document.activeElement !== seek) seek.value = end ? Math.round(current / end * 1000) : 0;
  time.textContent = `${Math.min(current, end).toFixed(1)} / ${end.toFixed(1)} s`;
  if (playing) highlightTime(current);
  requestAnimationFrame(tick);
}

tick();
new IntersectionObserver(entries => {
  if (!entries[0].isIntersecting) pause();
}).observe(root);
return {
  activate() { if (!videos.length) renderScene(); },
  deactivate() {
    pause();
    videos.forEach(video => { video.removeAttribute('src'); video.load(); });
    videos = [];
    grid.replaceChildren();
  },
};
}

const benchmarkControllers = new Map();
for (const benchmark of ['Physics-IQ-Verified', 'VideoPhy2-Hard', 'PhyGenBench']) {
  const root = document.querySelector('#benchmark-template').content.firstElementChild.cloneNode(true);
  const scenes = window.SPAR_SCENES.filter(scene => scene.benchmark === benchmark);
  root.id = benchmark.toLowerCase();
  root.hidden = true;
  root.setAttribute('role', 'tabpanel');
  root.setAttribute('aria-labelledby', `tab-${root.id}`);
  root.querySelector('.benchmark-name').textContent = benchmark;
  root.querySelector('.benchmark-count').textContent = `${scenes.length} examples · 7 methods per example`;
  document.querySelector('#benchmark-results').append(root);
  benchmarkControllers.set(root.id, createBenchmark(root, scenes));
}

const benchmarkTabs = [...document.querySelectorAll('[data-benchmark]')];
function selectBenchmark(id) {
  benchmarkTabs.forEach(tab => {
    const selected = tab.dataset.benchmark === id;
    const panel = document.getElementById(tab.dataset.benchmark);
    const controller = benchmarkControllers.get(tab.dataset.benchmark);
    if (!selected && !panel.hidden) controller.deactivate();
    panel.hidden = !selected;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) controller.activate();
  });
}
benchmarkTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectBenchmark(tab.dataset.benchmark));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % benchmarkTabs.length;
    if (event.key === 'ArrowLeft') next = (index + benchmarkTabs.length - 1) % benchmarkTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = benchmarkTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    benchmarkTabs[next].focus();
    selectBenchmark(benchmarkTabs[next].dataset.benchmark);
  });
});
function openLinkedBenchmark() {
  const id = location.hash.slice(1);
  if (benchmarkControllers.has(id)) selectBenchmark(id);
}
selectBenchmark(benchmarkControllers.has(location.hash.slice(1)) ? location.hash.slice(1) : 'physics-iq-verified');
window.addEventListener('hashchange', openLinkedBenchmark);

const studyDesign = document.querySelector('.study-design');
const studyDetails = document.createElement('details');
studyDetails.className = 'study-details';
const studySummary = document.createElement('summary');
studySummary.textContent = 'Study details';
studyDetails.append(studySummary);
[...studyDesign.querySelectorAll(':scope > p')].forEach(paragraph => studyDetails.append(paragraph));
studyDesign.append(studyDetails);
const mobileStudy = window.matchMedia('(max-width: 850px)');
function updateStudyDetails() { studyDetails.open = !mobileStudy.matches; }
mobileStudy.addEventListener('change', updateStudyDetails);
updateStudyDetails();
