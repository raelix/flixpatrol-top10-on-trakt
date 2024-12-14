import { NETFLIX_URL, TOP_10_PATH } from './const'
import type { AxiosRequestConfig } from 'axios';
import type { TraktTVIds } from '../Trakt';
import { TraktAPI } from '../Trakt';
import axios from 'axios';
import { logger } from '../Utils';
import { log } from 'console';
import { JSDOM } from 'jsdom';

export interface NetflixConfig {
  url: string;
  agent?: string;
}

const netflixTop10Location = ['world', 'afghanistan', 'albania', 'algeria', 'andorra', 'angola', 'antigua-and-barbuda',
  'argentina', 'armenia', 'australia', 'austria', 'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados',
  'belarus', 'belgium', 'belize', 'benin', 'bhutan', 'bolivia', 'bosnia-and-herzegovina', 'botswana', 'brazil',
  'brunei', 'bulgaria', 'burkina-faso', 'burundi', 'cambodia', 'cameroon', 'canada', 'cape-verde',
  'central-african-republic', 'chad', 'chile', 'china', 'colombia', 'comoros', 'costa-rica', 'croatia', 'cyprus',
  'czech-republic', 'democratic-republic-of-the-congo', 'denmark', 'djibouti', 'dominica', 'dominican-republic',
  'east-timor', 'ecuador', 'egypt', 'equatorial-guinea', 'eritrea', 'estonia', 'ethiopia', 'fiji', 'finland',
  'france', 'gabon', 'gambia', 'georgia', 'germany', 'ghana', 'greece', 'grenada', 'guadeloupe', 'guatemala',
  'guinea', 'guinea-bissau', 'guyana', 'haiti', 'honduras', 'hong-kong', 'hungary', 'iceland', 'india',
  'indonesia', 'iraq', 'ireland', 'israel', 'italy', 'ivory-coast', 'jamaica', 'japan', 'jordan', 'kazakhstan',
  'kenya', 'kiribati', 'kosovo', 'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho', 'liberia',
  'libya', 'liechtenstein', 'lithuania', 'luxembourg', 'madagascar', 'malawi', 'malaysia', 'maldives', 'mali',
  'malta', 'marshall-islands', 'martinique', 'mauritania', 'mauritius', 'mexico', 'micronesia', 'moldova',
  'monaco', 'mongolia', 'montenegro', 'morocco', 'mozambique', 'myanmar', 'namibia', 'nauru', 'nepal',
  'netherlands', 'new-caledonia', 'new-zealand', 'nicaragua', 'niger', 'nigeria', 'north-macedonia', 'norway',
  'oman', 'pakistan', 'palau', 'palestine', 'panama', 'papua-new-guinea', 'paraguay', 'peru', 'philippines',
  'poland', 'portugal', 'qatar', 'republic-of-the-congo', 'reunion', 'romania', 'russia', 'rwanda',
  'saint-kitts-and-nevis', 'saint-lucia', 'saint-vincent-and-the-grenadines', 'salvador', 'samoa', 'san-marino',
  'sao-tome-and-principe', 'saudi-arabia', 'senegal', 'serbia', 'seychelles', 'sierra-leone', 'singapore',
  'slovakia', 'slovenia', 'solomon-islands', 'somalia', 'south-africa', 'south-korea', 'south-sudan', 'spain',
  'sri-lanka', 'sudan', 'suriname', 'swaziland', 'sweden', 'switzerland', 'taiwan', 'tajikistan', 'tanzania',
  'thailand', 'togo', 'tonga', 'trinidad-and-tobago', 'tunisia', 'turkey', 'turkmenistan', 'tuvalu', 'uganda',
  'ukraine', 'united-arab-emirates', 'united-kingdom', 'united-states', 'uruguay', 'uzbekistan', 'vanuatu',
  'vatican-city', 'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe'];

export class Netflix {

  private config: NetflixConfig = {} as NetflixConfig;

  constructor() {
    this.config.url = `${NETFLIX_URL}/${TOP_10_PATH}`;
    this.config.agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';
  }

  private getHeaders(): AxiosRequestConfig {
    return {
      headers: {
        'User-Agent': this.config.agent,
      }
    }
  }

  public static async resolveIds(trakt: TraktAPI, movies: string[], isMovie: boolean = true): Promise<TraktTVIds> {
    const traktTVIds: TraktTVIds = [];
    for (const title of movies) {
      const item = await trakt.getFirstItemByQuery(isMovie ? 'movie' : 'show', title, null);
      let id = null;
      if (isMovie){
        id = item && item.movie && item.movie.ids.trakt ? item.movie.ids.trakt : null;
      } else {
        id = item && item.show && item.show.ids.trakt ? item.show.ids.trakt : null;
      }
      if (id !== null) {
        traktTVIds.push(id);
      }
      console.log(`Found ${title} with id ${id}`);
    }
    return traktTVIds;
  }

  public async getTopTen(country: string, isMovie: boolean = true): Promise<string | null> {
    const path = `${country === netflixTop10Location[0] ? '' : country}${isMovie ? '' : '/tv'}`;
    const res = await axios.get(`${this.config.url}/${path}`, this.getHeaders());
    logger.silly(`Status code: ${res.status}`);
    if (res.status !== 200) {
      return null;
    }
    return res.data as string;
  }

  public static parseTopTen(
    html: string,
    isMovie : boolean = true
  ): string[] {
    const expression = '//table/tbody/tr[*]/td[1]/button';
    return Netflix.parsePage(expression, html, isMovie);
  }

  private static parsePage(expression: string, html: string, isMovie : boolean = true): string[] {
    const dom = new JSDOM(html);
    const match = dom.window.document.evaluate(
      expression,
      dom.window.document,
      null,
      dom.window.XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
      null,
    );
    const results: string[] = [];

    let p = match.iterateNext();
    while (p !== null) {
      results.push(p.textContent as string);
      // results.push(isMovie ? p.textContent as string : p.textContent?.split(':')[0] as string);
      p = match.iterateNext();
    }
    logger.silly(`Xpath matches: ${results}`);
    return results;
  }

  public static isNetflixTop10Location = (x: string): x is string => netflixTop10Location.includes(x);



}
