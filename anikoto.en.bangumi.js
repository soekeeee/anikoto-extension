// ==MiruExtension==
// @name        AniKoto
// @version     v0.0.5
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': this.baseUrl,
      },
    });

    const parser = new DOMParser();
    return parser.parseFromString(res.data ?? res.body ?? res, 'text/html');
  }

  async search(query, page) {
    try {
      const url = `${this.baseUrl}/filter?keyword=${encodeURIComponent(query)}`;
      const doc = await this.requestHtml(url);

      const results = [];
      const anchors = doc.querySelectorAll('a[href*="/watch/"]');

      anchors.forEach((a) => {
        const href = a.getAttribute('href');
        if (!href || !href.includes('/watch/')) return;

        const img = a.querySelector('img');
        const title = img?.getAttribute('alt') || 'Unknown';
        const poster = img?.getAttribute('src') || '';

        results.push({
          title: title || 'Unknown',
          cover: poster ? this.abs(poster) : '',
          url: this.abs(href) || '',
        });
      });

      return results;
    } catch (e) {
      return [];
    }
  }

  async latest(page) {
    try {
      const doc = await this.requestHtml(this.baseUrl);
      const results = [];
      const anchors = doc.querySelectorAll('a[href*="/watch/"]');

      anchors.forEach((a) => {
        const href = a.getAttribute('href');
        if (!href || !href.includes('/watch/')) return;

        const img = a.querySelector('img');
        const title = img?.getAttribute('alt') || 'Unknown';
        const poster = img?.getAttribute('src') || '';

        results.push({
          title: title || 'Unknown',
          cover: poster ? this.abs(poster) : '',
          url: this.abs(href) || '',
        });
      });

      return results;
    } catch (e) {
      return [];
    }
  }

  async detail(url) {
    try {
      const detailUrl = url || '';
      const doc = await this.requestHtml(detailUrl);

      const titleEl = doc.querySelector('h1.title.d-title');
      const title = titleEl?.textContent || 'Unknown';

      const poster = doc.querySelector('.poster img')?.getAttribute('src') || '';
      const desc = doc.querySelector('.description, .synopsis, .film-description')?.textContent || '';

      const episodes = await this.loadEpisodesFromDoc(doc);

      return {
        title: title || 'Unknown',
        cover: poster ? this.abs(poster) : '',
        description: desc || '',
        episodes: episodes || [],
        url: detailUrl || '',
      };
    } catch (e) {
      return {
        title: 'Unknown',
        cover: '',
        description: '',
        episodes: [],
        url: url || '',
      };
    }
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
    links.forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;

      let rawNum = (a.getAttribute('data-num') || a.textContent || '').trim();
      rawNum = rawNum.replace(/[^0-9.]/g, '');
      const epNum = parseFloat(rawNum) || 0;

      const text = (a.textContent || '').toLowerCase();
      const hasSub = a.getAttribute('data-sub') === '1' || text.includes('sub');
      const hasDub = a.getAttribute('data-dub') === '1' || text.includes('dub');

      const ids = a.getAttribute('data-ids') || a.getAttribute('data-link-id') || '';

      eps.push({
        title: `Episode ${rawNum}` || 'Unknown',
        number: epNum,
        url: this.abs(href) || '',
        extra: {
          hasSub: hasSub,
          hasDub: hasDub,
          ids: ids || '',
        },
      });
    });

    return eps;
  }

  async watch(episode) {
    const extra = episode.extra || {};
    const ids = extra.ids || '';
    const hasDub = extra.hasDub || false;

    const links = [];

    const decodeIfBase64 = (input) => {
      try {
        const decoded = atob(input || '');
        if (decoded.startsWith('http')) return decoded;
      } catch (e) {
        // ignore
      }
      return input || '';
    };

    if (ids) {
      const url = decodeIfBase64(ids);
      links.push({
        url: url || '',
        quality: 'SUB',
        isM3u8: (url || '').includes('.m3u8'),
      });
    }

    if (hasDub) {
      try {
        const episodeUrl = episode.url || '';
        if (episodeUrl) {
          const doc = await this.requestHtml(episodeUrl);
          const lis = doc.querySelectorAll('li');

          for (const li of lis) {
            const text = (li.textContent || '').toLowerCase();
            if (!text.includes('dub')) continue;

            const linkId = li.getAttribute('data-link-id') || li.getAttribute('data-ids') || '';
            if (!linkId) continue;

            const url = decodeIfBase64(linkId);
            links.push({
              url: url || '',
              quality: 'DUB',
              isM3u8: (url || '').includes('.m3u8'),
            });
            break;
          }
        }
      } catch (e) {
        // ignore dub errors
      }
    }

    return links;
  }

  abs(url) {
    if (!url) return '';
    const urlStr = url || '';
    if (urlStr.startsWith('http')) return urlStr;
    if (urlStr.startsWith('//')) return 'https:' + urlStr;
    if (urlStr.startsWith('/')) return this.baseUrl + urlStr;
    return this.baseUrl + '/' + urlStr;
  }
}
