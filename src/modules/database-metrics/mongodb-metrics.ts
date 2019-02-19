import { Db, MongoClient } from 'mongodb';

import { IDatabaseCredentials } from '../../database-metrics-logger';
import { logger } from '../../helpers/logger';
import { Poller } from '../../helpers/poller';
import { DatabaseMetrics } from './database-metrics';

export class MongodbMetrics extends DatabaseMetrics {
  private mongoClient?: MongoClient;

  constructor(
    private credentials: IDatabaseCredentials
  ) {
    super();
  }

  public getMetrics(): MongodbMetrics {
    this.connect()
      .then(() => {
        const metricsPoller = new Poller({
          id: Poller.pollerIds.mongodb,
          interval: this.credentials.interval,
        });

        metricsPoller.onPoll(this.onPollMetrics.bind(this));
        this.setPoller(metricsPoller);
        this.pollById(Poller.pollerIds.mongodb);
      })
      .catch(error => logger.error(error));
    return this;
  }

  public disconnect(): void {
    if (this.mongoClient) {
      this.mongoClient.close();
      this.mongoClient = undefined;
    }
  }

  private async connect(): Promise<void> {
    const uri = this.credentials.uri;

    if (!this.isConnected()) {
      try {
        this.mongoClient = await MongoClient.connect(uri, { useNewUrlParser: true });
      } catch (error) {
        this.disconnect();
        return Promise.reject(error);
      }
    }
  }

  private isConnected(): boolean {
    return !!this.mongoClient && !!this.mongoClient.isConnected();
  }

  private async onPollMetrics(): Promise<void> {
    if (this.isConnected()) {
      const database = this.mongoClient.db(this.credentials.database);

      const promises = [
        database.command({ serverStatus: 1 }),
        database.command({ dbStats: 1, scale: 1024 }),
        this.getReplicationSetMetrics(),
      ];

      const [serverStatus, dbStats, replicationSetStatus] = await Promise.all(promises);

      const metrics = this.mapMetrics({ ...serverStatus, dbStats, replicationSetStatus });

      this.publish(undefined, this.credentials, metrics);
      this.pollById(Poller.pollerIds.mongodb);
    }
  }

  private async getReplicationSetMetrics(): Promise<void> {
    const database = this.mongoClient.db(this.credentials.database);
    const adminDatabase = database.admin();

    try {
      return await adminDatabase.command({ replSetGetStatus: 1 });
    } catch (error) {
      logger.info(error);
    }
  }

  private mapMetrics(metrics: any): any {
    const { connections, extra_info, globalLock, opcounters, dbStats } = metrics;
    return { connections, extra_info, globalLock, opcounters, dbStats };
  }
}

/*
export class MongodbMetrics extends DatabaseMetrics {
  private mongoClientPromise?: Promise<MongoClient | void>;

  constructor(
    private credentials: IDatabaseCredentials
  ) {
    super();
  }

  public getMetrics(): MongodbMetrics {
    this.getServerStatus();
    this.getDbStats();

    return this;
  }

  public async disconnect(): Promise<void> {
    const mongoClient = await this.getMongoClient();

    if (mongoClient) {
      mongoClient.close();
    }

    this.mongoClientPromise = undefined;
  }

  private async getMongoClient(): Promise<MongoClient | void> {
    const uri = this.credentials.uri;

    if (!this.mongoClientPromise) {
      this.mongoClientPromise = MongoClient.connect(uri, { useNewUrlParser: true })
        .catch(error => logger.error(error));
    }

    return this.mongoClientPromise;
  }

  private getServerStatus(): void {
    const serverStatusPoller = new Poller({
      id: Poller.pollerIds.mongodb.serverStatus,
      interval: this.credentials.interval,
    });

    serverStatusPoller.onPoll(this.onPollServerStatus.bind(this));
    this.initPollMetrics(serverStatusPoller);
  }

  private getDbStats(): void {
    const dbStatsPoller = new Poller({
      id: Poller.pollerIds.mongodb.dbStats,
      interval: this.credentials.interval,
    });

    dbStatsPoller.onPoll(this.onPollDbStats.bind(this));
    this.initPollMetrics(dbStatsPoller);
  }

  private async getDatabase(): Promise<Db | void> {
    const mongoClient = await this.getMongoClient();
    return mongoClient && mongoClient.isConnected() ? mongoClient.db(this.credentials.database) : undefined;
  }

  private async onPollServerStatus(): Promise<void> {
    const database = await this.getDatabase();

    if (database) {
      const serverStatus = await database.command({ serverStatus: 1 });
      this.publish(undefined, this.credentials, mapServerStatus(serverStatus));
      this.pollById(Poller.pollerIds.mongodb.serverStatus);
    }
  }

  private async onPollDbStats(): Promise<void> {
    const database = await this.getDatabase();

    if (database) {
      const dbStats = await database.command({ dbStats: 1, scale: 1024 });
      this.publish(undefined, this.credentials, dbStats);
      this.pollById(Poller.pollerIds.mongodb.dbStats);
    }
  }

  private initPollMetrics(poller: Poller): void {
    this.getMongoClient()
      .then(mongoClient => {
        if (mongoClient && mongoClient.isConnected()) {
          this.setPoller(poller);
          this.pollById(Poller.pollerIds.mongodb.serverStatus);
        }
      });
  }
}
*/
