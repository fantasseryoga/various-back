const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
    rating: {
        type: Number,
        required: true
    },
    comment: {
        type: String
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
        ref: 'Advertisement'
    }
})

module.exports = model('Rating', schema)