(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const loading = $('#loading');
  const error = $('#error');
  const playerSection = $('#player-section');
  const movieId = $('#movie-id');
  const loadBtn = $('#load-btn');
  const errorMsg = $('#error-msg');
  const errorBack = $('#error-back-btn');
  const playerInner = $('.player-inner');
  const sourceRow = $('#source-row');

  let plyr = null;

  function resetPlayer() {
    if (plyr) { plyr.destroy(); plyr = null; }
    playerInner.innerHTML = '<video id="player" playsinline controls></video>';
    sourceRow.innerHTML = '';
  }

  function loadSource(src) {
    resetPlayer();
    if (src.type === 'iframe') {
      playerInner.innerHTML =
        `<iframe src="${src.url}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
    }
    playerSection.classList.remove('hidden');
    error.classList.add('hidden');
    loading.classList.add('hidden');
    $$('.source-btn').forEach(b => b.classList.toggle('active', b.dataset.src === src.name));
    setTimeout(() => playerSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }

  function renderSources(list) {
    sourceRow.innerHTML = '';
    list.forEach((src, i) => {
      const btn = document.createElement('button');
      btn.className = `source-btn${i === 0 ? ' active' : ''}`;
      btn.textContent = src.name;
      btn.dataset.src = src.name;
      btn.addEventListener('click', () => loadSource(src));
      sourceRow.appendChild(btn);
    });
    if (list.length) loadSource(list[0]);
  }

  async function loadMovie(id) {
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    playerSection.classList.add('hidden');
    resetPlayer();

    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      loading.classList.add('hidden');
      renderSources(data.sources || []);
    } catch (err) {
      loading.classList.add('hidden');
      errorMsg.textContent = err.message || 'Failed to load movie.';
      error.classList.remove('hidden');
    }
  }

  function handleSubmit() {
    const id = movieId.value.trim();
    if (!id) return;
    loadMovie(id);
  }

  function init() {
    movieId.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
    loadBtn.addEventListener('click', handleSubmit);
    errorBack.addEventListener('click', () => { error.classList.add('hidden'); movieId.focus(); });
    $$('.example-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        movieId.value = btn.dataset.id;
        handleSubmit();
      });
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('#how-it-works, #faq').forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });

    movieId.focus();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
