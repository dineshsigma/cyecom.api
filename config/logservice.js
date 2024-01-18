const { createLogger, transports, format } = require("winston");
const  LokiTransport = require("winston-loki");

// decleration
let  types = ['emerg', 'alert', 'crit', 'error', 'warning', 'notice', 'info', 'debug']

// configutaions
const  logger = createLogger({
    transports: [
        new  LokiTransport({
            host:  process.env.LOG_URL || "https://loki.iipl.app",
            labels: { app: process.env.APP_NAME || "CYECOM-API-ACTIONS", env : process.env.ENV || "dev" },
            json:  true,
            format:  format.json(),
            replaceTimestamp:  true,
            interval:  30,
            basicAuth:  process.env.LOG_BASIC_AUTH || "dev:mlbi4a1iWagAKaw",
            onConnectionError: (err) =>  console.error(err)
        }),
        new  transports.Console({
            format:  format.combine(format.simple(), format.colorize())
        })
    ]
})
// log functions
exports.log = function (type, req = null, message) {
    var  params = {}
    if (req != null) {
        params.path = req.path;
        params.method = req.method;
        params.headers = req.headers;
        params.query = req.query;
        params.params = req.params;
        if (params.method.toLowerCase() == "post" || params.method.toLowerCase() == "put") {
            params.body = req.body
        }
    }
    if (types.indexOf(type) == -1) {
        return;
    }
    logger.log({ level:  type, message:  message, params:  params })
}
