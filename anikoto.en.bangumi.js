// ==MiruExtension==
// @name        AniKoto
// @version     v0.0.2
// @author      zaini+copilot
// @lang        en
// @icon        https://anikototv.to/favicon.ico
// @package     anikoto_en_bangumi
// @type        bangumi
// @webSite     https://anikototv.to
// @nsfw        false
// @tags        anime,english,streaming
// ==/MiruExtension==

export default class extends Extension {
  baseUrl = 'https://anikototv.to';

  async requestHtml(pathOrUrl) {
    const url = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : this.baseUrl + pathOrUrl;

    const res = await this.request({
      url,
      method: 'GET',
    });

    const parser = new DOMParser();
    return parser.parseFromString(res.data ?? res.body ?? res, 'text/html');
  }

  async search(query, page) {
    const url = `${this.baseUrl}/filter?keyword=${encodeURIComponent(query)}`;
    const doc = await this.requestHtml(url);

    const results = [];
    const anchors = doc.querySelectorAll('a[href*="/watch/"]');

    anchors.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href.includes('/watch/')) return;

      const img = a.querySelector('img');
      const title = (img?.getAttribute('alt') || '').trim() || 'Unknown';
      const poster = (img?.getAttribute('src') || '').trim();

      results.push({
        title: String(title),
        cover: String(poster ? this.abs(poster) : ''),
        url: String(this.abs(href)),
      });
    });

    return results;
  }

  async latest(page) {
    const doc = await this.requestHtml(this.baseUrl);
    const results = [];
    const anchors = doc.querySelectorAll('a[href*="/watch/"]');

    anchors.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href.includes('/watch/')) return;

      const img = a.querySelector('img');
      const title = (img?.getAttribute('alt') || '').trim() || 'Unknown';
      const poster = (img?.getAttribute('src') || '').trim();

      results.push({
        title: String(title),
        cover: String(poster ? this.abs(poster) : ''),
        url: String(this.abs(href)),
      });
    });

    return results;
  }

  async detail(url) {
    const doc = await this.requestHtml(url);

    const titleEl = doc.querySelector('h1.title.d-title');
    const title = (titleEl?.textContent || '').trim() || 'Unknown';

    const posterSrc = doc.querySelector('.poster img')?.getAttribute('src') || '';
    const cover = posterSrc ? this.abs(posterSrc) : '';
    const description = (doc
      .querySelector('.description, .synopsis, .film-description')
      ?.textContent || '').trim();

    const episodes = await this.loadEpisodesFromDoc(doc);

    return {
      title: String(title),
      cover: String(cover),
      description: String(description),
      episodes: episodes || [],
      url: String(url),
    };
  }

  async loadEpisodesFromDoc(doc) {
    const eps = [];

    const selectors = [
      '#episodes ul.episodes',
      '#episodes',
      '.episodes',
      '.ep-list',
      '.list-episode',
      '.detail-infor-content',
    ];

    let container = null;
    for (const sel of selectors) {
      container = doc.querySelector(sel);
      if (container) break;
    }
    if (!container) return eps;

    const links = container.querySelectorAll('a[href*="/ep-"]');
    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href) return;

      let rawNum =
        (a.getAttribute('data-num') || a.textContent || '').trim();
      rawNum = rawNum.replace(/[^0-9.]/g, '');
      const epNum = parseFloat(rawNum) || 0;

      const text = (a.textContent || '').toLowerCase();
      const hasSub =
        a.getAttribute('data-sub') === '1' || text.includes('sub');
      const hasDub =
        a.getAttribute('data-dub') === '1' || text.includes('dub');

      const ids = String(
        a.getAttribute('data-ids') ||
        a.getAttribute('data-link-id') ||
        ''
      );

      eps.push({
        title: String(`Episode ${rawNum || ''}`.trim()),
        number: epNum,
        url: String(this.abs(href)),
        extra: {
          hasSub,
          hasDub,
          ids,
        },
      });
    });

    return eps;
  }

  async watch(episode) {
    const extra = episode.extra || {};
    const ids = String(extra.ids || '');
    const hasDub = !!extra.hasDub;

    const links = [];

    const decodeIfBase64 = (input) => {
      try {
        const decoded = atob(String(input));
        if (decoded.startsWith('http')) return decoded;
      } catch (_) {}
      return String(input);
    };

    if (ids) {
      const url = decodeIfBase64(ids);
      links.push({
        url: String(url),
        quality: 'SUB',
        isM3u8: url.includes('.m3u8'),
      });
    }

    if (hasDub) {
      const episodeUrl = String(episode.url || '');
      if (episodeUrl) {
        const doc = await this.requestHtml(episodeUrl);

        const lis = doc.querySelectorAll('li');
        for (const li of lis) {
          const text = (li.textContent || '').toLowerCase();
          if (!text.includes('dub')) continue;

          const linkId = String(
            li.getAttribute('data-link-id') ||
            li.getAttribute('data-ids') ||
            ''
          );
          if (!linkId) continue;

          const url = decodeIfBase64(linkId);
          links.push({
            url: String(url),
            quality: 'DUB',
            isM3u8: url.includes('.m3u8'),
          });
          break;
        }
      }
    }

    return links;
  }

  abs(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return this.baseUrl + url;
    return this.baseUrl + '/' + url;
  }
}
