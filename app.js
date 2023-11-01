const express = require('express')
const config = require('config')
const path = require('path')
const mongoose = require('mongoose')
const cloudinary = require('cloudinary').v2
const PORT = config.get('port') || 5000
const app = express()
const http = require('http').createServer(app)
const chat = require("./socket/chat.js")(http)
const Chat = require("./models/Chat.js")

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "OPTIONS, GET, POST, PUT, PATCH, DELETE"
    );
    res.setHeader("Access-Control-Allow-Credentials", true)
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, token");
    next();
});

app.use(express.json({ extended: true, limit: "50mb" }))
app.use('/api/chats', require('./routes/chat.routes'))
app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/cities', require('./routes/cities.routes'))
app.use('/api/products', require('./routes/products.routes'))
app.use('/api/advertisements', require('./routes/advertisement.routes'))
app.use('/api/comments', require('./routes/comments.routes'))
app.use('/api/ratings', require('./routes/ratings.routes'))
app.use('/api/category', require('./routes/categories.routes'))
app.use('/api/users', require('./routes/user.routes'))

// if (process.env.NODE_ENV === 'production') {
//     app.use('/', express.static(path.resolve(__dirname, 'index.html')))

//     app.get('*', (req, res) => {
//         res.sendFile(path.resolve(__dirname, 'index.html'))
//     })
// }

//////////////////////////// CDN CONFIG ///////////////////////////
cloudinary.config({
    cloud_name: config.get("cndCloudName"),
    api_key: config.get("cdnKey"),
    api_secret: config.get("cdnSecret")
});

//////////////////////////// MONGODB CONFIG / SERVER START ///////////////////////////
async function start() {
    try {
        await mongoose.connect(config.get('mongoUri'), {
            useUnifiedTopology: true
        })
        await Chat.updateMany({}, { sockets: [] })
        http.listen(process.env.PORT || PORT, () => {
            console.log(`App has been started on port ${PORT} ...`)
        })
    } catch (e) {
        console.log('Server Error', e.message)
        process.exit(1)
    }
}


start()