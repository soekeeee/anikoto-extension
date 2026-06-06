// ==MiruExtension==
// @name        AniKoto
// @version     v0.1.0
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
  async search(query, page) {
    return [];
  }

  async latest(page) {
    return [];
  }

  async detail(url) {
    return {
      title: '',
      cover: '',
      description: '',
      episodes: [],
      url: '',
    };
  }

  async watch(episode) {
    return [];
  }
}
