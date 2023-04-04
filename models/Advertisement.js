const {Schema, model, Types} = require('mongoose')

const schema = new Schema({
    createdOn: {
        type: Date,
        default: Date.now
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    ratingValue: {
        type: Number,
        default: 0
    },
    price: {
        type: Number
    },
    image: {
        type: String
    },
    createdBy: {
        type: Types.ObjectId,
        ref: 'User'
    },
    city: [{
        type: Types.ObjectId,
        ref: 'City'
    }],
    ratings: [{
        type: Types.ObjectId,
        ref: 'Rating'
    }],
    products: [{
        count: {
            type: Number,
            default: 1
        },
        product: {
            type: Types.ObjectId,
            ref: 'Products'
        },
        _id: false
    }],
    status: {
        type: Types.ObjectId,
        ref: 'Status'
    },
    categories: [{
        type: Types.ObjectId,
        ref: 'Category'
    }],
    comments: [{
        type: Types.ObjectId,
        ref: 'Comment'
    }]
})

module.exports = model('Advertisement', schema)