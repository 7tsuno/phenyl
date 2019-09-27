import {
  PhenylSessionClient,
  PhenylEntityClientOptions
} from "@phenyl/central-state";
import { createEntityClient } from "./create-entity-client";
import {
  PhenylClients,
  ResponseEntityMapOf,
  GeneralTypeMap,
  AuthCommandMapOf
} from "@phenyl/interfaces";
import { MongoDbConnection } from "./connection";

export function createPhenylClients<TM extends GeneralTypeMap>(
  conn: MongoDbConnection,
  options: PhenylEntityClientOptions<ResponseEntityMapOf<TM>> = {}
): PhenylClients<TM> {
  const entityClient = createEntityClient<ResponseEntityMapOf<TM>>(
    conn,
    options
  );
  const sessionClient = new PhenylSessionClient<AuthCommandMapOf<TM>>(
    entityClient.getDbClient()
  );

  return { entityClient, sessionClient };
}
