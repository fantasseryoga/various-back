const { Schema, model, Types } = require('mongoose')

const schema = new Schema({
    name: {
        type: String,
        required: true
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: Types.ObjectId,
        ref: 'User'
    },
    createdTo: {
        type: Types.ObjectId,
        ref: 'User'
    },
    messages: {
        type: Number,
        ref: 'Message',
        default: 0
    },
    sockets: [{
        type: String
    }]
})

module.exports = model('Chat', schema)