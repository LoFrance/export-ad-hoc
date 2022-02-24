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
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { SubscriptionContract, UserContract } from "@azure/arm-apimanagement";
import * as A from "fp-ts/Array";
import { getApiClient } from "./utils/apim/apim";
import { getConfigOrThrow } from "./utils/config";
import { cosmosdbClient } from "./utils/cosmos/cosmosdb";
import { listLastVersionServices } from "./utils/cosmos/listLastVersionServices";
import { listDelegate } from "./utils/apim/listDelegates";
import { subscritpionListByDelegateId } from "./utils/apim/subscriptionListDelegate";

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

const getDelegati = (): TE.TaskEither<
  Error,
  ReadonlyArray<{
    readonly delegato: UserContract;
    readonly subs: ReadonlyArray<SubscriptionContract>;
  }>
> =>
  pipe(
    listDelegate(config, apimClient),
    TE.map((list) => {
      console.log(`Users found: ${list.length}`);
      return list.slice(0, 99);
    }),
    TE.chain((delegati) =>
      pipe(
        delegati.map((delegato) =>
          pipe(
            delegato.name,
            NonEmptyString.decode,
            TE.fromEither,
            TE.chainW((name) =>
              subscritpionListByDelegateId(config, apimClient, name)
            ),
            TE.mapLeft(E.toError),
            TE.map((subs) => ({
              delegato,
              subs,
            }))
          )
        ),
        A.sequence(TE.ApplicativePar)
      )
    ),
    TE.mapLeft(E.toError)
  );

const subscriptions = async (ownerId: NonEmptyString): Promise<void> => {
  await pipe(
    subscritpionListByDelegateId(config, apimClient, ownerId),
    TE.map((list) => console.log(`Subscriptions found: ${list.length}`)),
    TE.mapLeft(() => console.error(`Cannot get subscriptions from Apim`))
  )();
};

servizi();

(async (): Promise<void> => {
  await pipe(
    getDelegati(),
    TE.map((arr) => console.log(`Subs: ${arr.length} ✨`)),
    TE.mapLeft((e) => console.log(e.message))
  )();
})();
/*
<E>(fa: TaskEither<E, unknown>) => TaskEither<E, void>'
'(b: () => TaskEither<Error, readonly { readonly delegato: UserContract; readonly subs: readonly SubscriptionContract[]; }[]>) => TaskEither<unknown, void>'.
*/
