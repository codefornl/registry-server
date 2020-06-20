const mongoose = require('mongoose')

mongoose.connection.on('error', (err) => {
	console.error('Mongoose connection error', { err: err })
	throw new Error('database connection error')
});

mongoose.connection.on('open', () => {
	console.info('Mongoose connection open');
});

const mongoUrl = process.env.MONGOHQ_URL || 'mongodb://localhost:27017/jsonresume'

console.info('Using mongoUrl: ', mongoUrl)

mongoose.connect(mongoUrl, {useMongoCLient: true})

module.exports = mongoose
