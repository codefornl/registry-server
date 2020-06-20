const server = require('../../server')
const request = require('supertest')(server)
const should = require('should')

describe('/stats', () => {
  it('should return stats', (done) => {
    request.get('/stats')
      .expect(200, (err, res) => {
        should.not.exist(err)
        // TODO acturlly test stat numbers
        res.body.should.have.property('userCount')
        res.body.should.have.property('resumeCount')
        res.body.should.have.property('views')

        done()
      })
  })
})
