import puppeteer, { Browser, Page } from 'puppeteer';
import cheerio, { CheerioAPI } from 'cheerio';

interface TsukiApi {
  pupBrowser: Browser;
  pages: Page[];
  urls: {
    home: string;
    manga: string;
    search: string;
  };
  options: object;
  selectors: {
    info: string;
    chapters: string;
    genres: string;
    sinopsis: string;
    releases: string;
  };
}

interface Info {
  id?: number;
  nome?: string;
  demografia?: string | null;
  generos?: string[];
  formato?: string;
  autor?: string;
  artista?: string;
  capitulos?: string;
  visualisacoes?: string;
  status?: string;
  ultimoCapitulo?: string;
  scans?: string[];
  error?: string;
  errorMessage?: string;
}

class TsukiApi {
  constructor(options = {}) {
    this.options = options;
    this.urls = {
      home: 'https://tsukimangas.com/',
      manga: 'https://tsukimangas.com/obra',
      search: 'https://tsukimangas.com/lista-completa'
    };
    this.selectors = {
      info: '#app > div.coint > div > div.all > div.lef > div.sipospe.atrib.mfolak',
      chapters:
        '#app > div.coint > div > div.all > div.rigt > div:nth-child(2) > div.tips > span',
      genres:
        '#app > div.coint > div > div.all > div.lef > div.sipospe.atrib.mfolak > div:nth-child(2) > span > a',
      sinopsis: '#app > div.coint > div > div.all > div.rigt',
      releases: '#app > div.coint > div > div > div.leflist > div.menao'
    };
  }

  async init() {
    this.pupBrowser = await puppeteer.launch(this.options);

    this.pages = await this.pupBrowser.pages();

  }

  async newPage() {
    const page = await this.pupBrowser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 OPR/78.0.4093.147'
    );

    this.pages.push(page);

    return this.pages.indexOf(page);
  }

  async destroy(): Promise<void> {
    this.pupBrowser.close();
  }

  async getMangaInfo(id: number): Promise<Info> {
    if (typeof id !== 'number') {
      throw new Error(`ID tem que ser "number", recebi "${typeof id}"`);
    }
    const pageIndex = await this.newPage();
    const page = this.pages[pageIndex];

    let infoElem;
    let err: boolean = false;
    let errorMessage: string = '';

    try {
      await page.goto(`${this.urls.manga}/${id}`);
      infoElem = await page.waitForSelector(this.selectors.info, {
        timeout: 8000
      });
    } catch (e: any) {
      err = true;
      errorMessage = e.message;
    }

    if (err) {
      return {
        id: id,
        error: 'Alguma coisa deu errada, provavelmente o ID está errado.',
        errorMessage: errorMessage
      };
    }

    const infoHtml = await infoElem?.evaluate((el) => el.outerHTML);

    const sinopsisElem = await page.waitForSelector(
      this.selectors.sinopsis
    );

    const sinopsisHtml = await sinopsisElem?.evaluate((el) => el.outerHTML);

    page.close();

    let $info: CheerioAPI;
    let $sinopsis: CheerioAPI;

    if (sinopsisHtml && infoHtml) {
      $info = cheerio.load(infoHtml);
      $sinopsis = cheerio.load(sinopsisHtml);
    } else {
      throw new Error("Talvez esse manga não exista.");
    }

    const genres = (t = false) => {
      let genres: string[] = [];
      $info(`div:nth-child(${t ? '1' : '2'}) > span > a`).each((_, e) => {
        genres.push($info(e).text());
      });

      return genres;
    };

    if ($info.html().includes('Demografia')) {
      const sinopsis = {
        id: id,
        nome: $sinopsis('.tity h2').text().replace('\n', '').trim(),
        demografia: $info('div:nth-child(1) > span > a').text(),
        generos: genres(),
        formato: $info('div:nth-child(3)').text().split(' ')[1],
        autor: $info('div:nth-child(4)').text().split(' ').slice(1).join(' '),
        artista: $info('div:nth-child(5)').text().split(' ').slice(1).join(' '),
        capitulos: $info('div:nth-child(6)').text().split(' ')[1],
        visualizacoes: $info('div:nth-child(7)').text().split(' ')[1],
        status: $info('div:nth-child(8)').text().split(' ')[1]
      };

      return sinopsis;
    } else {
      const sinopsis = {
        id: id,
        name: $sinopsis('.tity h2').text().replace('\n', '').trim(),
        demography: null,
        genres: genres(true),
        format: $info('div:nth-child(2)').text().split(' ')[1],
        author: $info('div:nth-child(3)').text().split(' ').slice(1).join(' '),
        artist: $info('div:nth-child(4)').text().split(' ').slice(1).join(' '),
        chapters: $info('div:nth-child(5)').text().split(' ')[1],
        visualizations: $info('div:nth-child(6)').text().split(' ')[1],
        status: $info('div:nth-child(7)').text().split(' ')[1]
      };

      return sinopsis;
    }
  }

  async getDemography(id: number): Promise<null | string> {
    if (typeof id !== 'number') {
      throw new Error(`ID tem que ser 'number', recebi "${typeof id}"`);
    }

    const { demografia, error } = await this.getMangaInfo(id);

    if (error) {
      return error;
    }

    return demografia!;
  }

  async getGenres(id: number): Promise<null | string[] | string> {
    if (typeof id !== 'number') {
      throw new Error(`ID tem que ser "number", recebi "${typeof id}"`);
    }

    const { generos, error } = await this.getMangaInfo(id);

    if (error) {
      return error;
    }

    return generos!;
  }

  async getFormat(id: number): Promise<null | string> {
    if (typeof id !== 'number') {
      throw new Error(`ID tem que ser "number", recebi "${typeof id}"`);
    }

    const { formato, error } = await this.getMangaInfo(id);

    if (error) {
      return error;
    }

    return formato!;
  }

  async getAuthor(id: number): Promise<null | string> {
    if (typeof id !== 'number') {
      throw new Error(`ID tem que ser "number", recebi "${typeof id}"`);
    }

    const { autor, error } = await this.getMangaInfo(id);

    if (error) {
      return error;
    }
    return autor!;
  }

  async getArtist(id: number): Promise<null | string> {
    if (typeof id !== 'number') {
      throw new Error(`ID tem que ser "number", recebi "${typeof id}"`);
    }

    const { artista, error } = await this.getMangaInfo(id);

    if (error) {
      return error;
    }

    return artista!;
  }

  async getChapters(id: number): Promise<null | string> {
    if (typeof id !== 'number') {
      throw new Error(`ID tem que ser "number", recebi"${typeof id}"`);
    }

    const { capitulos, error } = await this.getMangaInfo(id);

    if (error) {
      return error;
    }

    return capitulos!;
  }

  async getStatus(id: number): Promise<null | string> {
    if (typeof id !== 'number') {
      throw new Error(`ID tem que ser "number", recebi "${typeof id}"`);
    }

    const { status, error } = await this.getMangaInfo(id);

    if (error) {
      return error;
    }

    return status!;
  }

  async getName(id: number): Promise<null | string> {
    if (typeof id !== 'number') {
      throw new Error(`ID tem que ser "number", recebi "${typeof id}"`);
    }

    const { nome, error } = await this.getMangaInfo(id);

    if (error) {
      return error;
    }

    return nome!;
  }

  async getReleases(): Promise<Info[]> {
    const page = this.pages[0];

    await page.goto(this.urls.home);

    await page.waitForSelector(
      '#app > div.coint > div > div > div.leflist > div.menao > .maska',
      {
        timeout: 10000
      }
    );

    const outer = await page.$eval(
      'div.leflist > div.menao',
      (e: Element) => e.outerHTML
    );

    page.close();

    let content: Info[] = [];
    const $ = cheerio.load(outer);

    $('.card > .listleft > .mm20 > a').each((_, e) => {
      const id = parseInt($(e).attr('href')?.split('/')[2]!)
      content.push({
        id: id,
        nome: $(e).text()
      });
    });

    $('.card > div > a').each((i, e) => {
      const format = $(e).text();
      content[i] = { ...content[i], formato: format };
    });

    $('.card > .listleft > .scansdpe').each((i, e) => {
      const scans: string[] = [];
      const html = $(e).html()!;
      const $e = cheerio.load(html);

      $e('a').each((_, el) => {
        scans.push($e(el).text().replace('group ', ''));
      });

      content[i] = {
        ...content[i],
        scans: scans
      }
    })

    $('.card > .listleft > .m10px > li:last-child > a').each((i, e) => {
      content[i] = { ...content[i], ultimoCapitulo: $(e).text() };
    });

    $('.card > .listleft > .m10px > li:first-child > a').each((i, e) => {
      const cap = $(e).text();
      if (parseInt(cap) > parseInt(content[i].ultimoCapitulo!)) {
        content[i].ultimoCapitulo = cap;
      }
    });

    return content;
  }

  async getByName(name: string, options = { maxResults: 1 }): Promise<Info[]> {
    if (!name) {
      throw new Error(`"name" tem que ser "string", recebi ${typeof name}`);
    }
    const page = this.pages[0];
    await page.goto(this.urls.search);

    await page.waitForSelector(
      '#app > div.coint > div > div > div:nth-child(1) > input',
      { timeout: 10000 }
    )

    const input = await page.$('#app > div.coint > div > div > div:nth-child(1) > input');

    await input?.type(name, { delay: 120 });

    await input?.press('Enter');

    await page.waitForSelector('#app > div.coint > div > div > div.adclixo', { timeout: 4000 });

    const outer = await page.$eval('#app > div.coint > div > div > div.adclixo',
      (e: Element) => e.outerHTML
    );

    const $ = cheerio.load(outer);

    const elements: CheerioAPI[] = [];

    $('.midgame').each((i, e) => {
      if (i + 1 <= options.maxResults) {
        elements.push(cheerio.load($(e).html()!));
      }
    })

    const results: Info[] = [];

    elements.map(item => {
      results.push({
        id: parseInt(item('a').attr('href')?.split('/')[2].trim()!),
        nome: item('.titlemangasal').text().trim(),
        capitulos: item('.titlemangasal3').text().replace('Capítulos: ', ''),
        formato: item('.notaslistm2').text()
      })
    })

    return results;
  }
}

export default TsukiApi;
