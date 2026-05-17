require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';

app.use(cors());
app.use(express.json());
app.use('/components', express.static(path.join(__dirname, 'components')));
app.use(express.static(path.join(__dirname, 'public')));

// ===== IN-MEMORY CACHE =====
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cachedFetch(key, fetchFn) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  return fetchFn().then(data => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

// ===== TMDB HELPERS =====
function tmdbFetch(endpoint, lang = 'en-US') {
  if (!TMDB_KEY) return Promise.resolve(null);
  const cacheKey = `tmdb:${endpoint}|${lang}`;
  return cachedFetch(cacheKey, async () => {
    try {
      const { data } = await axios.get(`${TMDB_BASE}${endpoint}`, {
        params: { api_key: TMDB_KEY, language: lang }
      });
      return data;
    } catch { return null; }
  });
}

function imgPath(p, size = 'w500') { return p ? `https://image.tmdb.org/t/p/${size}${p}` : null; }

// ===== API ROUTES =====
app.get('/api/movie/:id', async (req, res) => {
  if (!TMDB_KEY) return res.status(503).json({ error: 'TMDB not configured' });
  const { id } = req.params;
  const lang = req.query.language || 'en-US';
  try {
    const [detail, external] = await Promise.all([
      tmdbFetch(`/movie/${id}`, lang),
      tmdbFetch(`/movie/${id}/external_ids`, lang)
    ]);
    if (!detail) return res.status(404).json({ error: 'Movie not found' });
    res.json({
      tmdb_id: detail.id,
      imdb_id: detail.imdb_id || (external ? external.imdb_id : null),
      title: detail.title,
      year: (detail.release_date || '').split('-')[0],
      release_date: detail.release_date,
      poster: imgPath(detail.poster_path),
      backdrop: imgPath(detail.backdrop_path, 'original'),
      rating: detail.vote_average,
      overview: detail.overview,
      genres: (detail.genres || []).map(g => g.name),
      runtime: detail.runtime
    });
  } catch { res.status(500).json({ error: 'Failed to fetch movie' }); }
});

app.get('/api/tv/:id', async (req, res) => {
  if (!TMDB_KEY) return res.status(503).json({ error: 'TMDB not configured' });
  const { id } = req.params;
  const lang = req.query.language || 'en-US';
  try {
    const [detail, external] = await Promise.all([
      tmdbFetch(`/tv/${id}`, lang),
      tmdbFetch(`/tv/${id}/external_ids`, lang)
    ]);
    if (!detail) return res.status(404).json({ error: 'TV show not found' });
    res.json({
      tmdb_id: detail.id,
      imdb_id: detail.imdb_id || (external ? external.imdb_id : null),
      title: detail.name,
      year: (detail.first_air_date || '').split('-')[0],
      first_air_date: detail.first_air_date,
      poster: imgPath(detail.poster_path),
      backdrop: imgPath(detail.backdrop_path, 'original'),
      rating: detail.vote_average,
      overview: detail.overview,
      genres: (detail.genres || []).map(g => g.name),
      seasons: (detail.seasons || []).map(s => ({
        season_number: s.season_number,
        episode_count: s.episode_count,
        name: s.name
      })).filter(s => s.season_number > 0)
    });
  } catch { res.status(500).json({ error: 'Failed to fetch TV show' }); }
});

app.get('/api/tv/:id/season/:season', async (req, res) => {
  if (!TMDB_KEY) return res.status(503).json({ error: 'TMDB not configured' });
  const { id, season } = req.params;
  const lang = req.query.language || 'en-US';
  try {
    const data = await tmdbFetch(`/tv/${id}/season/${season}`, lang);
    if (!data) return res.status(404).json({ error: 'Season not found' });
    res.json({
      season_number: data.season_number,
      episodes: (data.episodes || []).map(ep => ({
        episode_number: ep.episode_number,
        name: ep.name,
        still: imgPath(ep.still_path),
        overview: ep.overview
      }))
    });
  } catch { res.status(500).json({ error: 'Failed to fetch season' }); }
});

// ===== LEGACY API (unchanged) =====
app.post('/api/resolve', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'No ID provided' });
  try {
    const isImdb = /^tt\d{7,8}$/i.test(id.trim());
    const isTmdb = /^\d+$/.test(id.trim());
    if (!isImdb && !isTmdb) return res.status(400).json({ error: 'Invalid ID format' });
    if (isTmdb && TMDB_KEY) {
      const movie = await tmdbFetch(`/movie/${id.trim()}`);
      if (movie) return res.json({ meta: {
        tmdb_id: movie.id, imdb_id: movie.imdb_id, title: movie.title,
        year: (movie.release_date || '').split('-')[0],
        poster: imgPath(movie.poster_path), rating: movie.vote_average, overview: movie.overview
      }});
    }
    res.json({ meta: { imdb_id: isImdb ? id.trim() : null, tmdb_id: isTmdb ? id.trim() : null } });
  } catch { res.status(500).json({ error: 'Resolution failed' }); }
});

app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('No URL');
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url, 'Origin': new URL(url).origin },
      responseType: 'stream', timeout: 15000
    });
    res.set(response.headers);
    response.data.pipe(res);
  } catch { res.status(502).send('Proxy failed'); }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', tmdb: !!TMDB_KEY });
});

app.get('/disclaimer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'disclaimer.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/dmca', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dmca.html'));
});

app.get('/cookies', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cookies.html'));
});

app.get('/watch.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'watch.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MVSS running on http://localhost:${PORT}`);
});
