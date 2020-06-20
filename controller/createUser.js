//@ts-check
var fs = require('fs')
var bcrypt = require('bcrypt-nodejs')
var Mustache = require('mustache')
var User = require('../models/user')

/**
 * @param {{ body: { email: any; username: any; password: string; }; session: { username: any; email: any; }; }} req
 * @param {{ status: (arg0: number) => { (): any; new (): any; json: { (arg0: { error?: { field: string; message: string; } | { field: string; message: string; }; email?: any; username?: any; message?: string; }): void; new (): any; }; }; }} res
 * @param {(arg0: any) => void} next
 */
const userController = (req, res, next) => {
    User.findOne({
        'email': req.body.email
    }, (err, user) => {

        if (user) {
            res.status(409).json({  // HTTP Status 409 Conflict
                error: {
                    field: 'email',
                    message: 'Email is already in use, maybe you forgot your password?'
                }
            })
        } else {

            User.findOne({
                'username': req.body.username
            }, (err, user) => {
                if (user) {
                    res.status(409).json({
                        // HTTP Status 409 Conflict
                        error: {
                            field: 'username',
                            message: 'This username is already taken, please try another one'
                        }
                    })
                } else {
                    const emailTemplate = fs.readFileSync('templates/email/welcome.html', 'utf8')
                    const emailCopy = Mustache.render(emailTemplate, {
                        username: req.body.username
                    })
                    const hash = bcrypt.hashSync(req.body.password)
                    try {
                        const postmark = require("postmark")(process.env.POSTMARK_API_KEY)
                        /**
                         * @param {{ message: string; }} error
                         */
                        postmark.send({
                            "From": "admin@jsonresume.org",
                            "To": req.body.email,
                            "Subject": "Json Resume - Community driven HR",
                            "TextBody": emailCopy
                        }, (error) => {
                            if (error) {
                                console.error("Unable to send via postmark: " + error.message)
                                return
                            }
                            console.info("Sent to postmark for delivery")
                        })
                    } catch (err) {
                        console.error("Postmark is not available, the system will not be able to send email")
                    }
                    const newUser = {
                        username: req.body.username,
                        email: req.body.email,
                        hash: hash
                    }

                    /**
                     * @param {any} err
                     * @param {{ username: any; email: any; }} user
                     */
                    User.create(newUser, (err, user) => {

                        console.error(err, user, 'create error')
                        if (err) {
                            return next(err)
                        }

                        req.session.username = user.username
                        req.session.email = user.email
                        // HTTP status 201 created
                        res.status(201).json({
                            email: user.email,
                            username: user.username,
                            message: "success"
                        })
                    })
                }
            })
        }

    })
}

module.exports = userController