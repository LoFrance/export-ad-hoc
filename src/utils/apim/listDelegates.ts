import { ApiManagementClient, UserContract } from "@azure/arm-apimanagement";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { IConfig } from "../config";

export const listDelegate = (
  config: IConfig,
  apimClient: ApiManagementClient
): TE.TaskEither<Error, ReadonlyArray<UserContract>> =>
  pipe(
    TE.tryCatch(
      async () => {
        const resArray = [];
        // eslint-disable-next-line functional/no-let,prefer-const
        for await (let item of apimClient.user.listByService(
          config.APIM_RESOURCE_GROUP,
          config.APIM_SERVICE_NAME
        )) {
          // eslint-disable-next-line functional/immutable-data
          resArray.push(item);
        }
        return resArray;
      },
      () =>
        E.toError(
          "The provided subscription identifier is malformed or invalid or occur an Authetication Error."
        )
    ),
    TE.filterOrElse(
      (results) => results.length > 0,
      () => E.toError("Errore")
    )
  );
