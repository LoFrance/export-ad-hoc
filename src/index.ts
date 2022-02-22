/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable no-console */

import {
  ServiceModel,
  SERVICE_COLLECTION_NAME,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import * as E from "fp-ts/lib/Either";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { getApiClient } from "./utils/apim/apim";
import { getConfigOrThrow } from "./utils/config";
import { cosmosdbClient } from "./utils/cosmos/cosmosdb";
import { listLastVersionServices } from "./utils/cosmos/listLastVersionServices";
import { listDelegate } from "./utils/apim/listDelegates";

const config = getConfigOrThrow();
const apimClient = getApiClient(
  {
    clientId: config.APIM_CLIENT_ID,
    secret: config.APIM_SECRET,
    tenantId: config.APIM_TENANT_ID,
  },
  config.APIM_SUBSCRIPTION_ID
);
const servicesContainer = cosmosdbClient
  .database(config.COSMOSDB_NAME)
  .container(SERVICE_COLLECTION_NAME);

const servizi = async (): Promise<void> => {
  const serviceModel = new ServiceModel(servicesContainer);
  await pipe(
    serviceModel,
    listLastVersionServices,
    TE.map(RA.filter((service) => service.isVisible)),
    TE.map((list) => console.log(`Services found: ${list.length}`)),
    TE.mapLeft(() => console.error(`Cannot get services from Cosmos`))
  )();
};

const delegati = async (): Promise<void> => {
  await pipe(
    listDelegate(config, apimClient),
    TE.map((list) => console.log(`Users found: ${list.length}`)),
    TE.mapLeft(() => console.error(`Cannot get users from Apim`))
  )();
};

servizi();
delegati();
