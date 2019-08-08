import * as cfenv from 'cfenv';

import { IServiceCredentials } from '../../../../interfaces';
import { CloudFoundryServiceType } from '../enums';
import { serviceTypeDatabaseTypeMapper } from './service-types.mapper';

export const mapMongodbCredentials = (cloudFoundryService: cfenv.IService): IServiceCredentials => {
  const credentials = cloudFoundryService.credentials as cfenv.IMongodbCredentials;

  return {
    serviceType: serviceTypeDatabaseTypeMapper.get(CloudFoundryServiceType.Mongodb2),
    name: cloudFoundryService.name,
    host: cloudFoundryService.credentials.host,
    uri: credentials.database_uri,
    username: credentials.username,
    password: credentials.password,
    database: credentials.database,
  };
};
