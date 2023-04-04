const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    surName: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String
    },
    avatar: {
        type: String,
    },
    socket: {
        type: String
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    password: {
        type: String,
        required: true
    },
    deleated: {
        type: Boolean,
        default: false
    },
    online: {
        type: Boolean,
        default: true
    },
    city: {
        type: Types.ObjectId,
        ref: 'City'
    },
    advertisements: [{
        type: Types.ObjectId,
        ref: 'Advertisement'
    }],
    products: [{
        type: Types.ObjectId,
        ref: 'Product'
    }],
    chats: [{
        type: Types.ObjectId,
        ref: 'Chat'
    }],
    comments: [{
        type: Types.ObjectId,
        ref: 'Comment'
    }]
})

module.exports = model('User', schema)