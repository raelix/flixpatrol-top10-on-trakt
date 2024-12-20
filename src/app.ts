
import type { CacheOptions } from './Flixpatrol';
import { FlixPatrol } from './Flixpatrol';
import { Netflix } from './Netflix';
import { logger, Utils } from './Utils';
import type { FlixPatrolMostWatched, FlixPatrolPopular, FlixPatrolTop10, NetflixTop10 } from './Utils/GetAndValidateConfigs';
import { GetAndValidateConfigs } from './Utils/GetAndValidateConfigs';
import type { TraktAPIOptions } from './Trakt';
import { TraktAPI } from './Trakt';

Utils.ensureConfigExist();

logger.info('Loading all configurations values');
const netflix = new Netflix();

const cacheOptions: CacheOptions = GetAndValidateConfigs.getCacheOptions();
const traktOptions: TraktAPIOptions = GetAndValidateConfigs.getTraktOptions();
const netflixTop10: NetflixTop10[] = GetAndValidateConfigs.getNetflixTop10();
const flixPatrolTop10: FlixPatrolTop10[] = GetAndValidateConfigs.getFlixPatrolTop10();
const flixPatrolPopulars: FlixPatrolPopular[] = GetAndValidateConfigs.getFlixPatrolPopular();
const flixPatrolMostWatched: FlixPatrolMostWatched[] = GetAndValidateConfigs.getFlixPatrolMostWatched();

logger.silly(`cacheOptions: ${JSON.stringify(cacheOptions)}`);
logger.silly(`traktOptions: ${JSON.stringify({ ...traktOptions, clientId: 'REDACTED', clientSecret: 'REDACTED' })}`);
logger.silly(`netflixTop10: ${JSON.stringify(netflixTop10)}`);
logger.silly(`flixPatrolTop10: ${JSON.stringify(flixPatrolTop10)}`);
logger.silly(`flixPatrolPopulars: ${JSON.stringify(flixPatrolPopulars)}`);
logger.silly(`flixPatrolMostWatched: ${JSON.stringify(flixPatrolMostWatched)}`);

const flixpatrol = new FlixPatrol(cacheOptions);
const trakt = new TraktAPI(traktOptions);

trakt.connect().then(async () => {
  for (const top10 of netflixTop10) {
    let listName: string;
    if (top10.name) {
      listName = top10.name.toLowerCase().replace(/\s+/g, '-');
    } else {
      listName = `netflix-${top10.location}-top10-without-fallback`;
    }
    if (top10.type === 'movies' || top10.type === 'both') {
      logger.info('==============================');
      logger.info(`Getting movies for ${listName}`);
      const isMovie : boolean = true;
      const html = await netflix.getTopTen(top10.location, isMovie);
      if (html !== null) {
        const top10Movies = await Netflix.parseTopTen(html, isMovie);
        const traktResults = await Netflix.resolveIds(trakt, top10Movies, isMovie);
        logger.debug(`${top10} movies: ${top10Movies}`);
        await trakt.pushToList(traktResults, listName, 'movie', top10.privacy);
        logger.info(`List ${listName} updated with ${top10Movies.length} new movies`);
      }
    }
    if (top10.type === 'shows' || top10.type === 'both') {
      logger.info('==============================');
      logger.info(`Getting movies for ${listName}`);
      const isMovie : boolean = false;
      const html = await netflix.getTopTen(top10.location, isMovie);
      if (html !== null) {
        const top10Movies = await Netflix.parseTopTen(html, isMovie);
        const traktResults = await Netflix.resolveIds(trakt, top10Movies, isMovie);
        logger.debug(`${top10} movies: ${top10Movies}`);
        await trakt.pushToList(traktResults, listName, 'show', top10.privacy);
        logger.info(`List ${listName} updated with ${top10Movies.length} new shows`);
      }
    }
  }

  for (const top10 of flixPatrolTop10) {
    let listName: string;
    if (top10.name) {
      listName = top10.name.toLowerCase().replace(/\s+/g, '-');
    } else {
      listName = `${top10.platform}-${top10.location}-top10-${top10.fallback === false ? 'without-fallback' : `with-${top10.fallback}-fallback`}`;
    }

    const html = await flixpatrol.getFlixPatrolHTMLPage(`/top10/${top10.platform}/${top10.location}`);

    if (top10.type === 'movies' || top10.type === 'both') {
      logger.info('==============================');
      logger.info(`Getting movies for ${listName}`);
      const top10Movies = await flixpatrol.getTop10('Movies', top10, trakt, html);
      logger.debug(`${top10.platform} movies: ${top10Movies}`);
      await trakt.pushToList(top10Movies, listName, 'movie', top10.privacy);
      logger.info(`List ${listName} updated with ${top10Movies.length} new movies`);
    }
    if (top10.type === 'shows' || top10.type === 'both') {
      logger.info('==============================');
      logger.info(`Getting shows for ${listName}`);
      const top10Shows = await flixpatrol.getTop10('TV Shows', top10, trakt, html);
      logger.debug(`${top10.platform} shows: ${top10Shows}`);
      await trakt.pushToList(top10Shows, listName, 'show', top10.privacy);
      logger.info(`List ${listName} updated with ${top10Shows.length} new shows`);
    }
  }


  for (const popular of flixPatrolPopulars) {
    let listName: string;
    if (popular.name) {
      listName = popular.name.toLowerCase().replace(/\s+/g, '-');
    } else {
      listName = `${popular.platform}-popular`;
    }

    if (popular.type === 'movies' || popular.type === 'both') {
      logger.info('==============================');
      logger.info(`Getting movies for ${listName}`);
      const popularMovies = await flixpatrol.getPopular('Movies', popular, trakt);
      logger.debug(`${popular.platform} movies: ${popularMovies}`);
      await trakt.pushToList(popularMovies, listName, 'movie', popular.privacy);
      logger.info(`List ${listName} updated with ${popularMovies.length} new movies`);
    }

    if (popular.type === 'shows' || popular.type === 'both') {
      logger.info('==============================');
      logger.info(`Getting shows for ${listName}`);
      const popularShows = await flixpatrol.getPopular('TV Shows', popular, trakt);
      logger.debug(`${popular.platform} shows: ${popularShows}`);
      await trakt.pushToList(popularShows, listName, 'show', popular.privacy);
      logger.info(`List ${listName} updated with ${popularShows.length} new shows`);
    }
  }

  for (const mostWatched of flixPatrolMostWatched) {
    if (mostWatched.enabled) {
      let listName: string;
      if (mostWatched.name) {
        listName = mostWatched.name.toLowerCase().replace(/\s+/g, '-');
      } else {
        listName = `most-watched-${mostWatched.year}-netflix`;
        listName = mostWatched.original !== undefined ? `${listName}-original` : listName;
        listName = mostWatched.premiere !== undefined ? `${listName}-${mostWatched.premiere}-premiere` : listName;
        listName = mostWatched.country !== undefined ? `${listName}-from-${mostWatched.country}` : listName;
      }

      if (mostWatched.type === 'movies' || mostWatched.type === 'both') {
        logger.info('==============================');
        logger.info(`Getting movies for ${listName}`);
        const mostWatchedMovies = await flixpatrol.getMostWatched('Movies', mostWatched, trakt);
        logger.debug(`most-watched movies: ${mostWatchedMovies}`);
        await trakt.pushToList(mostWatchedMovies, listName, 'movie', mostWatched.privacy);
        logger.info(`List ${listName} updated with ${mostWatchedMovies.length} new movies`);
      }

      if (mostWatched.type === 'shows' || mostWatched.type === 'both') {
        logger.info('==============================');
        logger.info(`Getting shows for ${listName}`);
        const mostWatchedShows = await flixpatrol.getMostWatched('TV Shows', mostWatched, trakt);
        logger.debug(`most-watched shows: ${mostWatchedShows}`);
        await trakt.pushToList(mostWatchedShows, listName, 'show', mostWatched.privacy);
        logger.info(`List ${listName} updated with ${mostWatchedShows.length} new shows`);
      }
    }
  }
});

process.on('SIGINT', () => {
  logger.info('System: Receive SIGINT signal');
  logger.info('System: Application stopped');
  process.exit();
});
