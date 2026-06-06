// ==MiruExtension==
// @name        AniKoto
// @version     v0.0.8
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

  safe(value) {
    if (value === null || value === undefined) return '';
    return value;
  }

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
        const href = this.safe(a.getAttribute('href'));
        if (!href || !href.includes('/watch/')) return;

        const img = a.querySelector('img');
        const alt = this.safe(img?.getAttribute('alt'));
        const src = this.safe(img?.getAttribute('src'));
        
        const title = alt.trim() ? alt.trim() : 'Unknown';
        const poster = src.trim() || '';

        results.push({
          title,
          cover: poster ? this.abs(poster) : '',
          url: this.abs(href),
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
        const href = this.safe(a.getAttribute('href'));
        if (!href || !href.includes('/watch/')) return;

        const img = a.querySelector('img');
        const alt = this.safe(img?.getAttribute('alt'));
        const src = this.safe(img?.getAttribute('src'));
        
        const title = alt.trim() ? alt.trim() : 'Unknown';
        const poster = src.trim() || '';

        results.push({
          title,
          cover: poster ? this.abs(poster) : '',
          url: this.abs(href),
        });
      });

      return results;
    } catch (e) {
      return [];
    }
  }

  async detail(url) {
    try {
      const detailUrl = this.safe(url);
      const doc = await this.requestHtml(detailUrl);

      const titleEl = doc.querySelector('h1.title.d-title');
      const titleText = this.safe(titleEl?.textContent);
      const title = titleText.trim() ? titleText.trim() : 'Unknown';

      const posterEl = doc.querySelector('.poster img');
      const posterSrc = this.safe(posterEl?.getAttribute('src'));
      const poster = posterSrc.trim() || '';

      const descEl = doc.querySelector('.description, .synopsis, .film-description');
      const descText = this.safe(descEl?.textContent);
      const description = descText.trim() || '';

      const episodes = await this.loadEpisodesFromDoc(doc);

      return {
        title,
        cover: poster ? this.abs(poster) : '',
        description,
        episodes,
        url: detailUrl,
      };
    } catch (e) {
      return {
        title: 'Unknown',
        cover: '',
        description: '',
        episodes: [],
        url: this.safe(url),
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
      const href = this.safe(a.getAttribute('href'));
      if (!href) return;

      let rawNum = this.safe(a.getAttribute('data-num') || a.textContent || '').trim();
      rawNum = rawNum.replace(/[^0-9.]/g, '');
      const epNum = parseFloat(rawNum) || 0;

      const text = this.safe(a.textContent || '').toLowerCase();
      const hasSub = a.getAttribute('data-sub') === '1' || text.includes('sub');
      const hasDub = a.getAttribute('data-dub') === '1' || text.includes('dub');

      const idsAttr = this.safe(a.getAttribute('data-ids'));
      const linkIdAttr = this.safe(a.getAttribute('data-link-id'));
      const ids = idsAttr || linkIdAttr || '';

      eps.push({
        title: ('Episode ' + rawNum).trim() || 'Unknown',
        number: epNum,
        url: this.abs(href),
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
    const ids = this.safe(extra.ids).trim();
    const hasDub = !!extra.hasDub;

    const links = [];

    const decodeIfBase64 = (input) => {
      try {
        const inputStr = this.safe(input);
        const decoded = atob(inputStr);
        if (decoded.startsWith('http')) return decoded;
      } catch (e) {
        //
      }
      return this.safe(input);
    };

    if (ids) {
      const url = decodeIfBase64(ids);
      links.push({
        url,
        quality: 'SUB',
        isM3u8: url.includes('.m3u8'),
      });
    }

    if (hasDub) {
      try {
        const episodeUrl = this.safe(episode.url);
        if (episodeUrl) {
          const doc = await this.requestHtml(episodeUrl);
          const lis = doc.querySelectorAll('li');

          for (const li of lis) {
            const text = this.safe(li.textContent || '').toLowerCase();
            if (!text.includes('dub')) continue;

            const linkIdAttr = this.safe(li.getAttribute('data-link-id'));
            const idsAttr = this.safe(li.getAttribute('data-ids'));
            const linkId = linkIdAttr || idsAttr || '';
            if (!linkId) continue;

            const url = decodeIfBase64(linkId);
            links.push({
              url,
              quality: 'DUB',
              isM3u8: url.includes('.m3u8'),
            });
            break;
          }
        }
      } catch (e) {
        //
      }
    }

    return links;
  }

  abs(url) {
    if (!url) return '';
    const urlStr = this.safe(url);
    if (urlStr.startsWith('http')) return urlStr;
    if (urlStr.startsWith('//')) return 'https:' + urlStr;
    if (urlStr.startsWith('/')) return this.baseUrl + urlStr;
    return this.baseUrl + '/' + urlStr;
  }
}
