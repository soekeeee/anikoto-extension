// ==MiruExtension==
// @name        AniKoto
// @version     v0.1.0
// @author      zaini
// @lang        en
// @package     anikoto
// @type        bangumi
// @nsfw        false
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
