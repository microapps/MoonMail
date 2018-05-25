import Promise from "bluebird";
import ApiGatewayUtils from "./utils/ApiGatewayUtils";

export default function version(event, context, callback) {
  return Promise.resolve("0.0.1")
    .then(v =>
      callback(
        null,
        ApiGatewayUtils.buildResponse({ statusCode: 200, body: { version: v } })
      )
    )
    .catch(err => callback(err));
}
