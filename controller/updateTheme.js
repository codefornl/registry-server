var bcrypt = require('bcrypt-nodejs');
var User = require('../models/user');
var Resume = require('../models/resume');

const updateTheme = (req, res) => {

    var db = req.db
    var redis = req.redis

    var password = req.body.password
    var email = req.body.email
    var theme = req.body.theme
    console.info(theme, "theme update starting");
    User.findOne({
        'email': email
    }, function(err, user) {

        redis.get(req.body.session, (err, valueExists) => {
            console.error(err, valueExists, 'theme redis');

            if (!valueExists && user && bcrypt.compareSync(password, user.hash)) {

                Resume.update({
                    //query
                    'jsonresume.username': user.username
                }, {
                    // update set new theme
                    'jsonresume.theme': theme
                }, function(err, resume) {
                    res.send({
                        url: 'https://registry.jsonresume.org/' + user.username
                    });
                });
            } else if (valueExists === null) {
                res.send({
                    sessionError: 'invalid session'
                });
            } else if (valueExists === 'true') {
                console.log('redis session success');
                Resume.update({
                    //query
                    'jsonresume.username': user.username
                }, {
                    // update set new theme
                    'jsonresume.theme': theme
                }, (err, resume) => {
                    res.send({
                        url: 'https://registry.jsonresume.org/' + user.username
                    });
                });

            } else {
                console.log('deleted');
                res.send({
                    message: 'authentication error'
                });
            }
        });
    });

}

module.exports = updateTheme