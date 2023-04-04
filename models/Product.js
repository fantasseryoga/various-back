const {Schema, model, Types} = require('mongoose')

const schema = new Schema ({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    image: {
        type: String
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: Types.ObjectId,
        ref: 'User'
    }
})

module.exports = model('Product', schema)