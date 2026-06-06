// ==MiruExtension==
// @name        AniKoto
// @version     v0.0.10
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
    try {
      const url = `${this.baseUrl}/filter?keyword=${encodeURIComponent(query)}`;
      const doc = await this.requestHtml(url);

      const results = [];
      const anchors = doc.querySelectorAll('a[href*="/watch/"]');

      anchors.forEach((a) => {
        const href = a.getAttribute('href');
        if (!href || !href.includes('/watch/')) return;

        const img = a.querySelector('img');
        let title = 'Unknown';
        let cover = '';

        if (img) {
          const alt = img.getAttribute('alt');
          if (alt) {
            title = alt;
          }
          const src = img.getAttribute('src');
          if (src) {
            cover = this.abs(src);
          }
        }

        results.push({
          title: title,
          cover: cover,
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
        const href = a.getAttribute('href');
        if (!href || !href.includes('/watch/')) return;

        const img = a.querySelector('img');
        let title = 'Unknown';
        let cover = '';

        if (img) {
          const alt = img.getAttribute('alt');
          if (alt) {
            title = alt;
          }
          const src = img.getAttribute('src');
          if (src) {
            cover = this.abs(src);
          }
        }

        results.push({
          title: title,
          cover: cover,
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
      const detailUrl = url || '';
      const doc = await this.requestHtml(detailUrl);

      let title = 'Unknown';
      let cover = '';
      let description = '';

      const titleEl = doc.querySelector('h1.title.d-title');
      if (titleEl && titleEl.textContent) {
        title = titleEl.textContent;
      }

      const posterEl = doc.querySelector('.poster img');
      if (posterEl) {
        const src = posterEl.getAttribute('src');
        if (src) {
          cover = this.abs(src);
        }
      }

      const descEl = doc.querySelector('.description, .synopsis, .film-description');
      if (descEl && descEl.textContent) {
        description = descEl.textContent;
      }

      const episodes = await this.loadEpisodesFromDoc(doc);

      return {
        title: title,
        cover: cover,
        description: description,
        episodes: episodes,
        url: detailUrl,
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

      let rawNum = '';
      const dataNum = a.getAttribute('data-num');
      if (dataNum) {
        rawNum = dataNum;
      } else if (a.textContent) {
        rawNum = a.textContent;
      }

      rawNum = rawNum.trim();
      rawNum = rawNum.replace(/[^0-9.]/g, '');
      const epNum = parseFloat(rawNum) || 0;

      let text = '';
      if (a.textContent) {
        text = a.textContent.toLowerCase();
      }

      const dataSubAttr = a.getAttribute('data-sub');
      const dataDubAttr = a.getAttribute('data-dub');
      const hasSub = dataSubAttr === '1' || text.includes('sub');
      const hasDub = dataDubAttr === '1' || text.includes('dub');

      let ids = '';
      const idsAttr = a.getAttribute('data-ids');
      if (idsAttr) {
        ids = idsAttr;
      } else {
        const linkIdAttr = a.getAttribute('data-link-id');
        if (linkIdAttr) {
          ids = linkIdAttr;
        }
      }

      eps.push({
        title: 'Episode ' + rawNum,
        number: epNum,
        url: this.abs(href),
        extra: {
          hasSub: hasSub,
          hasDub: hasDub,
          ids: ids,
        },
      });
    });

    return eps;
  }

  async watch(episode) {
    const extra = episode.extra || {};
    let ids = '';
    if (extra.ids) {
      ids = extra.ids;
    }
    const hasDub = !!extra.hasDub;

    const links = [];

    const decodeIfBase64 = (input) => {
      try {
        if (!input) return '';
        const decoded = atob(input);
        if (decoded.startsWith('http')) return decoded;
      } catch (e) {
        //
      }
      return input || '';
    };

    if (ids) {
      const url = decodeIfBase64(ids);
      links.push({
        url: url,
        quality: 'SUB',
        isM3u8: url.includes('.m3u8'),
      });
    }

    if (hasDub) {
      try {
        const episodeUrl = episode.url || '';
        if (episodeUrl) {
          const doc = await this.requestHtml(episodeUrl);
          const lis = doc.querySelectorAll('li');

          for (const li of lis) {
            let text = '';
            if (li.textContent) {
              text = li.textContent.toLowerCase();
            }
            if (!text.includes('dub')) continue;

            let linkId = '';
            const linkIdAttr = li.getAttribute('data-link-id');
            if (linkIdAttr) {
              linkId = linkIdAttr;
            } else {
              const idsAttr = li.getAttribute('data-ids');
              if (idsAttr) {
                linkId = idsAttr;
              }
            }
            if (!linkId) continue;

            const url = decodeIfBase64(linkId);
            links.push({
              url: url,
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
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return this.baseUrl + url;
    return this.baseUrl + '/' + url;
  }
}
