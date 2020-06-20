//@ts-check
var request = require('superagent');
var resumeHelper = require('../lib/resumeHelper')

const renderRemoteResume = (req, res, next) => {
    var themeName = req.query.theme;
    var resumeUrl = req.query.url;
    var format = req.query.format || req.headers.accept || 'html';

    //Download the JSON from the url and try to parse
    request
        .get(resumeUrl)
        .set('accept', 'json')
        .end(function (err, response) {
            if (err) {
                return next(err)
            }
            resumeHelper.processResume(JSON.parse(response.text), res, themeName, format)
        });

};

module.exports = renderRemoteResume