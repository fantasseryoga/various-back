const jwt = require('jsonwebtoken')
const config = require('config')

function middlewareSocket(socket, next) {
    const token = socket.handshake.auth.token

    try{
        if (!token) {
            const err = new Error("not authorized");
            err.data = { content: "Please retry later" }
            next(err)
        }
    
        const decoded = jwt.verify(token, config.get('jwtSecret'))
        socket.user = decoded
    
        next()
    } catch(e) {
        const err = new Error("not authorized");
            err.data = { content: "Please retry later" }
            next(err)
    }
}

module.exports = middlewareSocket