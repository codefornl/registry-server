//@ts-check
require('dotenv').load()

const redis = require('./lib/redis-connection')
const theme = require('./lib/theme')
const express = require("express")

const bodyParser = require('body-parser')
const app = express()
const request = require('superagent')
const expressSession = require('express-session')
const cookieParser = require('cookie-parser')
const compress = require('compression')
const minify = require('express-minify')
const controller = require('./controller')
const themeHandler = require('./lib/themeHelper')
const DEFAULT_THEME = 'modern'

const RedisStore = require('connect-redis')(expressSession)

app.use(compress());
app.use(minify({
    cache: __dirname + '/cache'
}))
app.use(require('./middleware/allow-cross-domain'))
app.use(cookieParser())
app.use(expressSession({
    store: new RedisStore({
        client: redis
    }),
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true
}))
//app.use(expressSession({secret:'somesecrettokenhere'}));

app.use(express.static(__dirname + '/editor', {
    maxAge: 21600 * 1000
}))

app.use(bodyParser());
app.get('/themes.json', themeHandler.controllers.info)
app.get('/theme/:theme', theme)
app.post('/theme/:theme', theme)

app.all('/*', (req, res, next) => {
    //res.header("Access-Control-Allow-Origin", "*");
    //res.header("Access-Control-Allow-Headers", "X-Requested-With");

    /**
     * Make the db accessible to the router
     * probably not the most performant way to pass the db's around
     * 
     * TODO find a better way
     */
    
    // @ts-ignore
    req.redis = redis;
    next()
})

app.get('/session', controller.checkSession)
app.delete('/session/:id', controller.deleteSession)
app.get('/members', controller.renderMembersPage)
app.get('/stats', controller.showStats)

/**
 * Export pdf route
 * this code is used by resume-cli for pdf export,
 * see line ~188 for web-based export
 */ 
app.get('/pdf', (req, res) => {
    const pdf = require('pdfcrowd')
    const client = new pdf.Pdfcrowd(
        process.env.PDFCROWD_USER || 'thomasdavis', 
        process.env.PDFCROWD_KEY || '7d2352eade77858f102032829a2ac64e',
        null
    )
    request
        .post('./theme/' + req.body.theme)
        .send({
            resume: req.body.resume
        })
        .set('Content-Type', 'application/json')
        .end((err, response) => {
            client.convertHtml(response.text, pdf.sendHttpResponse(res), {
                use_print_media: "true"
            })
        })
})

app.get('/resume', controller.renderRemoteResume)
app.get('/:uid.:format', controller.renderResume)
app.get('/:uid', controller.renderResume)
app.post('/resume', controller.upsertResume)
app.put('/resume', controller.updateTheme)
app.post('/user', controller.createUser)
app.post('/session', controller.createSession)
app.put('/account', controller.changePassword)
app.delete('/account', controller.deleteUser)
app.post('/:uid', controller.renderResume)

process.addListener('uncaughtException', (err) => {
    console.error('Uncaught error in server.js', {
        err: err
        // hide stack in production
        //, stack: err.stack
    })
    // TODO some sort of notification
});

const port = Number(process.env.PORT || 5000)

app.listen(port, () => {
    console.info("Listening on " + port);
})

module.exports = app
module.exports.DEFAULT_THEME = DEFAULT_THEME
