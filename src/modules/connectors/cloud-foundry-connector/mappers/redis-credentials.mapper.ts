import * as cfenv from 'cfenv';

import { IServiceCredentials } from '../../../../interfaces';
import { CloudFoundryServiceType } from '../enums';
import { serviceTypeDatabaseTypeMapper } from './service-types.mapper';

export const mapRedisCredentials = (cloudFoundryService: cfenv.IService): IServiceCredentials => {
  const credentials = cloudFoundryService.credentials as cfenv.IRedisCredentials;

  return {
    serviceType: serviceTypeDatabaseTypeMapper.get(CloudFoundryServiceType.Redis2),
    name: cloudFoundryService.name,
    host: credentials.host,
    port: credentials.port,
    password: credentials.password,
  };
};
