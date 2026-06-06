// ==MiruExtension==
// @name        AniKoto
// @version     v0.0.11
// @author      zaini+copilot
// @lang        en
// @icon        https://anikototv.to/favicon.ico
// @package     anikoto
// @type        bangumi
// @webSite     https://anikototv.to
// @nsfw        false
// @tags        anime,english,streaming
// ==/MiruExtension==

export default class extends Extension {
  baseUrl = 'https://anikototv.to';

  async requestHtml(pathOrUrl) {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : this.baseUrl + pathOrUrl;
    const res = await this.request({ url, method: 'GET' });
    const parser = new DOMParser();
    return parser.parseFromString(res.data ?? res.body ?? res, 'text/html');
  }

  async search(query, page) {
    const url = this.baseUrl + '/filter?keyword=' + encodeURIComponent(query);
    const doc = await this.requestHtml(url);
    const results = [];
    doc.querySelectorAll('a[href*="/watch/"]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href && href.includes('/watch/')) {
        const img = a.querySelector('img');
        const alt = img?.getAttribute('alt') || 'Unknown';
        const src = img?.getAttribute('src') || '';
        results.push({ title: alt, cover: src ? this.abs(src) : '', url: this.abs(href) });
      }
    });
    return results;
  }

  async latest(page) {
    const doc = await this.requestHtml(this.baseUrl);
    const results = [];
    doc.querySelectorAll('a[href*="/watch/"]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href && href.includes('/watch/')) {
        const img = a.querySelector('img');
        const alt = img?.getAttribute('alt') || 'Unknown';
        const src = img?.getAttribute('src') || '';
        results.push({ title: alt, cover: src ? this.abs(src) : '', url: this.abs(href) });
      }
    });
    return results;
  }

  async detail(url) {
    const doc = await this.requestHtml(url || '');
    const titleEl = doc.querySelector('h1.title.d-title');
    const title = titleEl?.textContent || 'Unknown';
    const posterEl = doc.querySelector('.poster img');
    const poster = posterEl?.getAttribute('src') || '';
    const descEl = doc.querySelector('.description, .synopsis, .film-description');
    const description = descEl?.textContent || '';
    const episodes = await this.loadEpisodesFromDoc(doc);
    return { title, cover: poster ? this.abs(poster) : '', description, episodes, url: url || '' };
  }

  async loadEpisodesFromDoc(doc) {
    const eps = [];
    const selectors = ['#episodes ul.episodes', '#episodes', '.episodes', '.ep-list', '.list-episode', '.detail-infor-content'];
    let container = null;
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el) { container = el; break; }
    }
    if (!container) return eps;
    container.querySelectorAll('a[href*="/ep-"]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href) return;
      let rawNum = (a.getAttribute('data-num') || a.textContent || '').trim();
      rawNum = rawNum.replace(/[^0-9.]/g, '');
      const epNum = parseFloat(rawNum) || 0;
      const text = (a.textContent || '').toLowerCase();
      const hasSub = a.getAttribute('data-sub') === '1' || text.includes('sub');
      const hasDub = a.getAttribute('data-dub') === '1' || text.includes('dub');
      const ids = a.getAttribute('data-ids') || a.getAttribute('data-link-id') || '';
      eps.push({ title: 'Episode ' + rawNum, number: epNum, url: this.abs(href), extra: { hasSub, hasDub, ids } });
    });
    return eps;
  }

  async watch(episode) {
    const extra = episode.extra || {};
    const ids = extra.ids || '';
    const hasDub = !!extra.hasDub;
    const links = [];
    const decodeIfBase64 = (input) => {
      try {
        const decoded = atob(input || '');
        if (decoded.startsWith('http')) return decoded;
      } catch (e) {}
      return input || '';
    };
    if (ids) {
      const url = decodeIfBase64(ids);
      links.push({ url, quality: 'SUB', isM3u8: url.includes('.m3u8') });
    }
    if (hasDub) {
      const episodeUrl = episode.url || '';
      if (episodeUrl) {
        const doc = await this.requestHtml(episodeUrl);
        doc.querySelectorAll('li').forEach(li => {
          const text = (li.textContent || '').toLowerCase();
          if (text.includes('dub')) {
            const linkId = li.getAttribute('data-link-id') || li.getAttribute('data-ids') || '';
            if (linkId) {
              const url = decodeIfBase64(linkId);
              links.push({ url, quality: 'DUB', isM3u8: url.includes('.m3u8') });
              return;
            }
          }
        });
      }
    }
    return links;
  }

  abs(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return this.baseUrl + url;
    return this.baseUrl + '/' + url;
  }
}
