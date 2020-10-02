import getRawBody from "raw-body";
import { decodeRequest, getStatusCode, ServerLogic } from "@phenyl/http-rules";
import { createServerError } from "@phenyl/utils";

import {
  GeneralServerParams,
  GeneralRestApiHandler,
  EncodedHttpRequest,
  GeneralResponseData,
} from "@phenyl/interfaces";
import { Request, Response, NextFunction } from "express";

type Option = {
  pathRegex?: RegExp;
  limit?: string | number;
};

export class PhenylExpressMiddlewareCreator {
  /**
   * Create an Express Middleware to listen to Phenyl API requests.
   * By default, paths start with "/api" will be handled by restApiHandler.
   */
  static createPhenylApiMiddleware(
    restApiHandler: GeneralRestApiHandler,
    option?: Option
  ) {
    const { pathRegex = /^\/api\/.*$/, limit = "6mb" } = option || {};

    return async (req: Request, res: Response, next: NextFunction) => {
      const { path, method, query, headers, body } = req;
      if (!pathRegex.test(path)) {
        return next();
      }
      if (
        method !== "GET" &&
        method !== "POST" &&
        method !== "PUT" &&
        method !== "DELETE"
      ) {
        return next();
      }
      const encodedHttpRequest: EncodedHttpRequest = {
        method,
        headers: headers as EncodedHttpRequest["headers"],
        path,
        qsParams: query,
      };
      if (!body) {
        encodedHttpRequest.body = await getRawBody(req, {
          encoding: true,
          limit,
        });
      } else if (typeof body === "object") {
        encodedHttpRequest.parsedBody = body;
      } else {
        encodedHttpRequest.body = body;
      }
      let responseData: GeneralResponseData;
      try {
        const requestData = decodeRequest(encodedHttpRequest);
        responseData = await restApiHandler.handleRequestData(requestData);
      } catch (err) {
        responseData = { type: "error", payload: createServerError(err) };
      }
      res.status(getStatusCode(responseData)).json(responseData);
    };
  }

  /**
   * Express Middleware to redirect requests to Phenyl Server.
   * By default, "/api/*" and "/explorer" will be redirected to serverLogic.
   * (/explorer is reserved for phenyl-explorer.)
   */
  static createPhenylMiddleware(
    serverParams: GeneralServerParams,
    pathRegex: RegExp = /^\/api\/.*$|^\/explorer($|\/.*$)/
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const { path, method, query, headers, body } = req;
      if (!pathRegex.test(path)) {
        return next();
      }
      if (
        method !== "GET" &&
        method !== "POST" &&
        method !== "PUT" &&
        method !== "DELETE"
      ) {
        return next();
      }
      const serverLogic = new ServerLogic(serverParams);
      const encodedHttpRequest: EncodedHttpRequest = {
        method,
        headers: headers as EncodedHttpRequest["headers"],
        path,
        qsParams: query,
      };
      if (!body) {
        encodedHttpRequest.body = await getRawBody(req, true);
      } else if (typeof body === "object") {
        encodedHttpRequest.parsedBody = body;
      } else {
        encodedHttpRequest.body = body;
      }

      const response = await serverLogic.handleRequest(encodedHttpRequest);
      res
        .status(response.statusCode)
        .header(response.headers)
        .send(response.body);
    };
  }
}

export const {
  createPhenylApiMiddleware,
  createPhenylMiddleware,
} = PhenylExpressMiddlewareCreator;
