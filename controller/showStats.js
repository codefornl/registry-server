///@ts-check
const User = require('../models/user')
const Resume = require('../models/resume')

/**
 * @param {{ redis: any; }} req
 * @param {{ send: (arg0: { userCount: number; resumeCount: number; views: number; }) => void; }} res
 * @param {(arg0: any) => void} next
 */
const stats = (req, res, next) => {

    const redis = req.redis

    /**
     * @param {Error} err
     * @param {number} views
     */
    redis.get('views', (err, views) => {
        User.count({}, (err, usercount) => {
            if (err) {
                return next(err);
            }

            Resume.count({}, (err, resumecount) => {
                if (err) {
                    return next(err)
                }

                res.send({
                    userCount: usercount,
                    resumeCount: resumecount,
                    views: views * 1
                })
            })
        })
    })
}

module.exports = stats