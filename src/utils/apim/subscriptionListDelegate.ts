import {
  ApiManagementClient,
  SubscriptionContract,
} from "@azure/arm-apimanagement";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { IConfig } from "../config";

export const subscritpionListByDelegateId = (
  config: IConfig,
  apimClient: ApiManagementClient,
  userId: NonEmptyString
): TE.TaskEither<Error, ReadonlyArray<SubscriptionContract>> =>
  pipe(
    TE.tryCatch(
      async () => {
        const resArray = [];
        // eslint-disable-next-line functional/no-let,prefer-const
        for await (let item of apimClient.userSubscription.list(
          config.APIM_RESOURCE_GROUP,
          config.APIM_SERVICE_NAME,
          userId
        )) {
          // eslint-disable-next-line functional/immutable-data
          resArray.push(item);
        }
        return resArray;
      },
      () =>
        E.toError(
          "The provided owner identifier is malformed or invalid or occur an Authetication Error."
        )
    ),
    TE.filterOrElse(
      (results) => results.length > 0,
      () => E.toError("Errore")
    )
  );
