const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
    text: {
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
    advertisement: {
        type: Types.ObjectId,
        ref: "Advertisement"
    }
})

module.exports = model('Comment', schema)