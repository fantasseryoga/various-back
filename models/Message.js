const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
    text: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    important: {
        type: Boolean,
        default: false
    },
    attachment: {
        type: String,
        default: null
    },
    deleated: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: Types.ObjectId,
        ref: 'User'
    },
    chat: {
        type: Types.ObjectId,
        ref: "Chat"
    }
})

module.exports = model('Message', schema)