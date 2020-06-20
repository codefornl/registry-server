//@ts-check
var mongoose = require('../lib/mongoose-connection')
var Schema = mongoose.Schema

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  password: {
    type: String
  },
  hash: { // TODO make virtual
    type: String
  }
})

module.exports = mongoose.model('User', userSchema);
