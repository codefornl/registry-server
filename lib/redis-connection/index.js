//@ts-check
var rtg = require("url").parse(process.env.REDISTOGO_URL)
if (process.env.REDISTOGO_URL) {
    var redis = require("redis").createClient(parseInt(rtg.port), rtg.hostname, {})
    if (rtg.auth) {
        redis.auth(rtg.auth.split(":")[1])
    }

} else {
    var redis = require("redis").createClient()
}

redis.on("error", (err) => {
    var rtg = require("url").parse(process.env.REDISTOGO_URL)
    console.error("error event - " + rtg.host + ":" + rtg.port + " - " + err)
})

module.exports = redis
