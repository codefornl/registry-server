var Mustache = require('mustache');
var templateHelper = require('../template-helper');
var HttpStatus = require('http-status-codes');
var resumeHelper = require('../lib/resumeHelper')

var Pusher = require('pusher');
var pusher = null;
if (process.env.PUSHER_KEY) {
    pusher = new Pusher({
        appId: '83846',
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET
    });
};

var realTimeViews = 0;
var DEFAULT_THEME = 'modern';
var Resume = require('../models/resume');

module.exports = function renderResume(req, res, err) {
    realTimeViews++;

    var redis = req.redis;

    redis.get('views', function(err, views) {
        if (err) {
            redis.set('views', 0);
        } else {
            redis.set('views', views * 1 + 1, redis.print);

        }

        if (pusher !== null) {
            pusher.trigger('test_channel', 'my_event', {
                views: views
            });
        };
    });

    var theme = req.query.theme || DEFAULT_THEME;
    var uid = req.params.uid;
    var format = req.params.format || req.headers.accept || 'html';

    Resume.findOne({
        'jsonresume.username': uid
    }, function(err, resume) {
        if (err) {
            return next(err);
        }

        if (resume) resume = resume.toObject();

        if (!resume) {
            var page = Mustache.render(templateHelper.get('noresume'), {});
            res.status(HttpStatus.NOT_FOUND).send(page);
            return;
        }
        if (typeof resume.jsonresume.passphrase === 'string' && typeof req.body.passphrase === 'undefined') {

            var page = Mustache.render(templateHelper.get('password'), {});
            res.send(page);
            return;
        }
        if (typeof req.body.passphrase !== 'undefined' && req.body.passphrase !== resume.jsonresume.passphrase) {
            res.send('Password was wrong, go back and try again');
            return;
        }
        if (/json/.test(format)) {
            resumeHelper.sendAsJson(resume, res)
    
        } else if (/txt/.test(format)) {
            resumeHelper.sendAsText(resume, res)
    
        } else if (/md/.test(format)) {
            resumeHelper.sendAsMarkdown(resume, res)
    
        } else if (/pdf/.test(format)) {
            resumeHelper.sendAsPdf(resume, theme, res)
    
        } else {
            resumeHelper.sendAsHtml(resume, theme, res)
    
        }
    });
};
