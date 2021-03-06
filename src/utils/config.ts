/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import * as t from "io-ts";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { CommaSeparatedListOf } from "@pagopa/ts-commons/lib/comma-separated-list";
import {
  IntegerFromString,
  NonNegativeInteger,
} from "@pagopa/ts-commons/lib/numbers";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { withDefault } from "@pagopa/ts-commons/lib/types";

const DEFAULT_MAX_SERVICES_ORCHESTRATOR_SIZE = 500;

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/ban-types
export const IConfig = t.interface({
  /* eslint-disable @typescript-eslint/naming-convention */
  APIM_CLIENT_ID: NonEmptyString,
  APIM_RESOURCE_GROUP: NonEmptyString,
  APIM_SECRET: NonEmptyString,
  APIM_SERVICE_NAME: NonEmptyString,
  APIM_SUBSCRIPTION_ID: NonEmptyString,
  APIM_TENANT_ID: NonEmptyString,

  // AssetsStorageConnection: NonEmptyString,
  // AzureWebJobsStorage: NonEmptyString,

  COSMOSDB_KEY: NonEmptyString,
  COSMOSDB_NAME: NonEmptyString,
  COSMOSDB_URI: NonEmptyString,

  MaxServicesOrchestratorSize: NonNegativeInteger,

  SERVICEID_EXCLUSION_LIST: withDefault(
    CommaSeparatedListOf(NonEmptyString),
    []
  ),

  // StorageConnection: NonEmptyString,

  isProduction: t.boolean,
});

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode({
  ...process.env,
  MaxServicesOrchestratorSize: pipe(
    IntegerFromString.decode(process.env.MAX_SERVICES_ORCHESTRATOR_SIZE),
    E.getOrElse(() => DEFAULT_MAX_SERVICES_ORCHESTRATOR_SIZE)
  ),
  isProduction: process.env.NODE_ENV === "production",
});

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
export const getConfig = (): t.Validation<IConfig> => errorOrConfig;

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
export const getConfigOrThrow = (): IConfig =>
  E.getOrElse<t.Errors, IConfig>((error) => {
    throw new Error(`Invalid configuration: ${readableReport(error)}`);
  })(errorOrConfig);
/*
  errorOrConfig.getOrElseL((errors: ReadonlyArray<ValidationError>) => {
    throw new Error(`Invalid configuration: ${readableReport(errors)}`);
  });
*/
