//@ts-check
var mongoose = require('../lib/mongoose-connection');

var Schema = mongoose.Schema;

var resumeSchema = new Schema({}, { strict: false });

module.exports = mongoose.model('Resume', resumeSchema);
