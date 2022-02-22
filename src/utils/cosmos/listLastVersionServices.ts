import {
  RetrievedService,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as T from "fp-ts/lib/Task";
import * as RA from "fp-ts/ReadonlyArray";

import * as AI from "../fp-ts/AsyncIterableTask";

/**
 * List all services, last version only
 *
 * @param serviceModel Services Cosmosdb model
 * @returns a task containing either an Error or the list of services
 */
export const listLastVersionServices = (
  serviceModel: ServiceModel
): TE.TaskEither<Error, ReadonlyArray<RetrievedService>> =>
  pipe(
    serviceModel.getCollectionIterator(),
    T.of,
    AI.foldTaskEither((_) => new Error(`Error retrieving data from cosmos.`)),
    TE.map(RA.flatten),
    TE.chainW((_) => {
      const lefts = RA.lefts(_);
      return lefts.length > 0
        ? TE.left<Error, ReadonlyArray<RetrievedService>>(
            new Error(`${lefts.length} service(s) with decoding errors found.`)
          )
        : TE.of<Error, ReadonlyArray<RetrievedService>>(RA.rights(_));
    }),
    TE.map(
      RA.reduce({} as Record<string, RetrievedService>, (acc, val) => {
        if (!acc[val.serviceId] || acc[val.serviceId].version < val.version) {
          // eslint-disable-next-line functional/immutable-data
          acc[val.serviceId] = val;
        }
        return acc;
      })
    ),
    TE.map((v) => Object.values(v))
  );
