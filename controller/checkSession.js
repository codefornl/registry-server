
//@ts-check
/**
 * This checks the current users auth
 * It runs before Backbones router is started
 * we should return a csrf token for Backbone to use
 * 
 * @param {*} req 
 * @param {*} res 
 */
const checkSession = (req, res) => {
    if (typeof req.session.username !== 'undefined') {
        res.send({
            auth: true,
            id: req.session.id,
            username: req.session.username,
            _csrf: req.session._csrf
        })
    } else {
        res.send({
            auth: false,
            _csrf: req.session._csrf
        })
    }
}

module.exports = checkSession
