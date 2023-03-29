import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

import * as express from 'express';
import * as nunjucks from 'nunjucks';
import * as path from 'path';
import { ServerResponse, IncomingMessage } from 'http';
import { ServiceAccount } from 'firebase-admin';
import sqlite3 from 'sqlite3';
import { open as openDatabase } from 'sqlite';

import {
  AP,
  assertIsApCollection,
  assertIsApType,
  Plugin,
} from 'activitypub-core-types';
import { activityPub } from 'activitypub-core-server-express';
import { SqliteDbAdapter } from 'activitypub-core-db-sqlite';
import { FirebaseAuthAdapter } from 'activitypub-core-auth-firebase';
import { FtpStorageAdapter } from 'activitypub-core-storage-ftp';
import { DeliveryAdapter } from 'activitypub-core-delivery';

const SingleUserBlogPlugin: Plugin = {
  async getEntityPageProps(entity) {
    if (
      entity.name === 'Outbox' &&
      entity.type === AP.CollectionTypes.ORDERED_COLLECTION
    ) {
      assertIsApCollection(entity);

      return {
        actor:
          entity.attributedTo instanceof URL
            ? await this.adapters.db.findEntityById(entity.attributedTo)
            : null,
        outbox: await this.adapters.db.expandCollection(entity),
      };
    }
  },
};

(async () => {
  // Use Express for all routes.
  const app = express.default();

  // Static files.
  app.use(express.static(path.resolve(__dirname, '../static')));

  // Sets up Nunjucks views.
  const nunjucksConfig = nunjucks.configure('views', {
    autoescape: true,
  });

  function formatDate(date: Date): string {
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const [{ value: month }, , { value: day }, , { value: year }] =
      dateFormatter.formatToParts(date);

    return `${year}-${month}-${day}`;
  }

  function formatDateTime(date: Date, forDisplay?: boolean): string {
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: forDisplay ? 'America/New_York' : 'UTC',
    });

    const [
      { value: month },
      ,
      { value: day },
      ,
      { value: year },
      ,
      { value: hour },
      ,
      { value: minute },
      ,
      { value: second },
    ] = dateFormatter.formatToParts(date);

    if (forDisplay) {
      return `${year}-${month}-${day} ${hour}:${minute}:${second} ET`;
    } else {
      return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    }
  }

  // Sets up Nunjucks filters.
  nunjucksConfig.addFilter('formatDate', (string: string) =>
    formatDate(new Date(string)),
  );

  nunjucksConfig.addFilter('formatDateTime', (string: string) =>
    formatDateTime(new Date(string)),
  );

  nunjucksConfig.addFilter('formatDateTimeForDisplay', (string: string) =>
    formatDateTime(new Date(string), true),
  );

  // TODO Remove from ap-groups?
  app.get(
    '/',
    async (req: IncomingMessage, res: ServerResponse, next: Function) => {
      const hasUser = await sqliteDbAdapter.db.get(`SELECT * from username`);

      if (!hasUser) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.write(nunjucks.render('login.html'));
        res.end();
      }

      next();
    },
  );

  // activitypub-core Plugins.

  // Firebase Authentication adapter plugin.

  const envServiceAccount = process.env.AP_SERVICE_ACCOUNT;

  if (!envServiceAccount) {
    throw new Error('Bad Service Account.');
  }

  const firebaseServiceAccount: ServiceAccount = JSON.parse(
    decodeURIComponent(envServiceAccount),
  );

  const firebaseAuthAdapter = new FirebaseAuthAdapter(
    firebaseServiceAccount,
    'pickpuck-com',
  );

  // FTP Storage adapter plugin.

  const ftpStorageAdapter = new FtpStorageAdapter(
    JSON.parse(decodeURIComponent(process.env.AP_FTP_CONFIG)),
    '/uploads',
  );

  // SQLite Database adapter plugin.
  const sqliteDb = await openDatabase({
    filename: 'database.db',
    driver: sqlite3.verbose().Database,
  });

  const sqliteDbAdapter = new SqliteDbAdapter(sqliteDb);

  await sqliteDbAdapter.initializeDb();

  const defaultDeliveryAdapter = new DeliveryAdapter({
    adapters: {
      db: sqliteDbAdapter,
    },
  });

  // Use the activitypub-core Express plugin.

  app.use(
    activityPub({
      // TODO plugins key shouldnt be needed
      plugins: [SingleUserBlogPlugin],

      routes: {
        person: '/about',
        inbox: '/inbox',
        outbox: '/',
        followers: '/followers',
        following: '/following',
        liked: '/liked',
        stream: '/:slug',
        endpoint: '/:slug',
        note: '/note/:year/:month/:day/:guid',
        article: '/article/:slug',
      },
      pages: {
        login: async (): Promise<string> => {
          return nunjucks.render('login.html');
        },
        home: async (homePageProps: {
          actor: AP.Actor;
          shared: AP.Announce[];
          requests: AP.Follow[];
          members: AP.Actor[];
          blocks: AP.Block[];
        }): Promise<string> => {
          return nunjucks.render('home.html', homePageProps);
        },
        entity: async (entityPageProps: {
          entity: AP.Entity;
          actor?: AP.Actor;
          shared: AP.Announce[];
          followersCount: number;
        }): Promise<string> => {
          return nunjucks.render('entity.html', entityPageProps);
        },
      },

      adapters: {
        auth: firebaseAuthAdapter,
        db: sqliteDbAdapter,
        delivery: defaultDeliveryAdapter,
        storage: ftpStorageAdapter,
      },
    }),
  );

  app.listen(process.env.AP_PORT ?? 3000, () => {
    console.log('Running...');
  });
})();
