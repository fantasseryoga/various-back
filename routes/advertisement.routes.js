const { Router } = require('express')
const auth = require('../middleware/auth.middleware')
const { check, validationResult } = require('express-validator')
const config = require('config')
const Product = require('../models/Product')
const Comment = require('../models/Comment')
const AdvertisementStatus = require('../models/AdvertisementStatus')
const Rating = require('../models/Rating')
const User = require('../models/User')
const Advertisement = require('../models/Advertisement')
const City = require('../models/City')
const Category = require('../models/Category')
const cloudinary = require("cloudinary").v2

const router = Router()


router.post('/create-advertisement',
    auth,
    [
        check("title", "Title is too long").isLength({ max: 50 }),
        check("description", "Description is too long").isLength({ max: 200 }),
        check("title", "Title is too short").isLength({ min: 5 }),
        check("price", "Price can't be lower then 0").isFloat({ min: 0 }),
        check("price", "Price can't be that high").isFloat({ max: 1000000 }),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req)
            let countError = false

            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array(), message: "Incorrect data" })

            const { title, description, city, price, products, categories, image } = req.body
            const user = req.user.userId
            const productsObj = await Product.find({ _id: products.map(el => el.product), createdBy: user })

            if (!Object.keys(productsObj).length) {
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": productsObj,
                                "msg": "You should select at least 1 product",
                                "param": "products",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

            const advertisementProducts = productsObj.map(el => {
                const count = products.filter(obj => el.id === obj.product)[0].count

                if (count < 1 || count >= 10000) {
                    countError = true
                }

                const advPrObj = {
                    product: el,
                    count: count
                }

                return advPrObj
            });

            if (countError) {
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": products,
                                "msg": "Count for one of the projects is incorrect, it should be in range from 1 to 10000",
                                "param": "products",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

            const categoriesObj = await Category.find({ _id: categories })

            if (!Object.keys(categoriesObj).length) {
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": categoriesObj,
                                "msg": "You should select at least 1 category",
                                "param": "categories",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

            const cityObj = await City.find({ name: city })

            if (!cityObj) {
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": city,
                                "msg": "City is incorrect",
                                "param": "city",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

            let imageName = null
            if (image) {
                imageName = "advertisement_" + title.replaceAll(' ', '') + "_" + Date.now()
                await cloudinary.uploader.upload(image, { public_id: imageName, folder: config.get("cdnAdvertisements"), invalidate: true })
                imageName = config.get("cdnAdvertisements") + imageName
            }


            const advertisement = new Advertisement({
                title: title,
                description: description,
                createdBy: user,
                city: cityObj,
                price: price,
                products: advertisementProducts,
                categories: categoriesObj,
                status: "64064a569cf211501d40ae12",
                image: imageName
            })

            await advertisement.save()

            const body = {
                advertisement: advertisement
            }

            return res.status(201).json(body)

        } catch (e) {
            return res.status(500).json({ message: "Something went wrong, please try again later." })
        }
    }
)


router.post("/get-advertisement-by-id", auth, async (req, res) => {
    try {
        const { advertisementId } = req.body
        const advertisement = await Advertisement.findOne({ _id: advertisementId })

        if (!advertisement)
            return res.status(400).json({ message: "No advertisement has been found" })

        const user = await User.findOne({ _id: advertisement.createdBy })

        if (user._id != req.user.userId && advertisement.status != config.get("advActiveStatusId"))
            return res.status(400).json({ message: "No advertisement has been found" })

        const categories = await Category.find({ _id: advertisement.categories })
        const products = await Product.find({ _id: advertisement.products.map(el => el.product) })
        const cities = await City.find({ _id: advertisement.city })
        const comments = await Comment.find({ advertisement: advertisement._id }).sort("-createdOn")
        const ratings = await Rating.find({ advertisement: advertisement._id }).sort("-createdOn")
        const status = await AdvertisementStatus.find({ _id: advertisement.status })
        const usersComments = await User.find({ _id: comments.map(el => el.createdBy) })
        const usersRatings = await User.find({ _id: ratings.map(el => el.createdBy) })

        const advProductsFull = advertisement.products.map(el => {
            const productFull = products.filter(a => a._id.toString() === el.product.toString())[0]
            const product = {
                count: el.count,
                product: productFull
            }

            return product
        })

        const advComments = comments.map(el => {
            const userFull = usersComments.filter(a => a._id.toString() === el.createdBy.toString())[0]

            return (
                {
                    text: el.text,
                    createdBy: {
                        firstName: userFull.firstName,
                        surName: userFull.surName,
                        _id: userFull._id,
                        avatar: userFull.avatar
                    },
                    createdOn: el.createdOn,
                    _id: el._id
                }
            )
        })

        const advRatings = ratings.map(el => {
            const userFull = usersRatings.filter(a => a._id.toString() === el.createdBy.toString())[0]

            return (
                {
                    rating: el.rating,
                    text: el.comment,
                    createdBy: {
                        firstName: userFull.firstName,
                        surName: userFull.surName,
                        _id: userFull._id,
                        avatar: userFull.avatar
                    },
                    createdOn: el.createdOn,
                    _id: el._id
                }
            )
        })

        const rating = advertisement.ratingCount === 0 ? 0 : advertisement.ratingValue / advertisement.ratingCount

        const body = {
            advertisement: {
                price: advertisement.price,
                ratingCount: advertisement.ratingCount,
                ratingValue: advertisement.ratingValue,
                rating: Number(rating.toFixed(0)),
                createdOn: advertisement.createdOn,
                description: advertisement.description,
                title: advertisement.title,
                image: advertisement.image,
                status: status[0].name,
                advCategories: categories,
                advProducts: advProductsFull,
                advCities: cities,
                advComments: advComments,
                advRatings: advRatings,
                user: {
                    firstName: user.firstName,
                    surName: user.surName,
                    _id: user._id,
                    online: user.online
                }
            }
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again later." })
    }
})


router.post("/get-advertisements", auth, async (req, res) => {
    try {
        const { userId } = req.body
        let advertisements
        let self = false

        if (userId === req.user.userId) self = true

        if (userId && self) {
            advertisements = await Advertisement.find({ createdBy: userId }).sort("-createdOn")
        } else if (userId) {
            advertisements = await Advertisement.find({ createdBy: userId, status: config.get("advActiveStatusId") }).sort("-createdOn")
        } else {
            advertisements = await Advertisement.find({ status: config.get("advActiveStatusId") }).sort("-createdOn")
        }

        if (!Object.keys(advertisements).length) {
            return res.status(400).json({ message: "No advertisements has been found", self: self })
        }

        const categories = await Category.find({ _id: advertisements.map(el => el.categories).flat(1) })
        const products = await Product.find({ _id: advertisements.map(el => el.products).flat(1).map(el => el.product) })
        const users = await User.find({ _id: advertisements.map(el => el.createdBy) })
        const cities = await City.find({ _id: advertisements.map(el => el.city).flat(1) })
        const statuses = await AdvertisementStatus.find()

        const advertisementsMerged = advertisements.map(el => {
            const productsAdv = el.products.map(el2 => {
                const productFull = products.filter(a => a._id.toString() === el2.product.toString())[0]
                const product = {
                    count: el2.count,
                    product: productFull
                }

                return product
            })

            const categoriesAdv = el.categories.map(el3 => {
                const categoryFull = categories.filter(a => a._id.toString() === el3.toString())[0]

                return categoryFull
            })

            const citiesAdv = el.city.map(el4 => {
                const citiesFull = cities.filter(a => a._id.toString() === el4.toString())[0]

                return citiesFull
            })

            const createdBy = users.filter(a => a._id.toString() === el.createdBy.toString())[0]
            const statusAdv = statuses.filter(a => a._id.toString() === el.status.toString())[0]
            const rating = el.ratingCount === 0 ? 0 : el.ratingValue / el.ratingCount

            const adv = {
                _id: el._id,
                title: el.title,
                image: el.image,
                description: el.description,
                rating: Number(rating.toFixed(0)),
                price: el.price,
                status: statusAdv.name,
                createdOn: el.createdOn,
                createdBy: {
                    firstName: createdBy.firstName,
                    surName: createdBy.surName,
                    phoneNumber: createdBy.phoneNumber,
                    online: createdBy.online,
                },
                products: productsAdv,
                categories: categoriesAdv,
                cities: citiesAdv
            }

            return adv
        })

        const body = {
            advertisements: advertisementsMerged,
            self: self
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again later." })
    }
})


router.post('/delete-advertisement', auth, async (req, res) => {
    try {
        const { advertisementId } = req.body
        const userId = req.user.userId
        const advertisement = await Advertisement.findOne({ _id: advertisementId })

        if (userId.toString() != advertisement.createdBy.toString())
            return res.status(400).json({ message: "You don't have such permission" })

        await Advertisement.deleteOne({ _id: advertisementId })

        const body = {
            message: "Deleated Successfully"
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again." })
    }
})


router.post('/change-status', auth, async (req, res) => {
    try {
        const { status, advertisementId } = req.body
        const userId = req.user.userId
        const advertisement = await Advertisement.findOne({ _id: advertisementId })
        const advStatus = await AdvertisementStatus.findOne({ name: status })

        if (userId.toString() != advertisement.createdBy.toString() || !advStatus)
            return res.status(400).json({ message: "You don't have such permission" })

        advertisement.status = advStatus

        advertisement.save()

        const body = {
            message: "Advertisement was successfully updated",
            advertisement: advertisement
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again." })
    }
})


router.post("/get-advertisements-by-filter", async (req, res) => {
    try {
        const limit = config.get("advPaginationPerPage")
        const { byRating, categories, cities, priceMax, priceMin, title, page } = req.body
        const citiess = await City.find({ name: cities })
        const citiesIds = citiess.map(el => el._id)

        let query = {}
        if (cities) query.city = { $all: citiesIds }
        if (categories) query.categories = { $all: categories }
        if (priceMax) query.price = { $lte: Number(priceMax) }
        if (priceMin) query.price = { $gte: Number(priceMin) }
        if (priceMax && priceMin) query.price = { $lte: Number(priceMax), $gte: Number(priceMin) }
        if (title) {
            const reg = RegExp(title, "i")
            query.title = { $regex: reg }
        }
        query.status = config.get("advActiveStatusId")

        const advertisementsObj = await Advertisement.find(query).sort("-createdOn")
        const advertisementsNotPaginated = !byRating ? advertisementsObj : advertisementsObj.sort((a, b) => {
            if (!a.ratingCount && !b.ratingCount) return 0
            if (!a.ratingCount) return 1
            if (!b.ratingCount) return -1
            if (Number(a.ratingValue) / Number(a.ratingCount) > Number(b.ratingValue) / Number(b.ratingCount)) return -1;
            if (Number(a.ratingValue) / Number(a.ratingCount) < Number(b.ratingValue) / Number(b.ratingCount)) return 1;

            return 0
        })

        if (!Object.keys(advertisementsNotPaginated).length)
            return res.status(400).json({ message: "No advertisements has been found" })

        const advertisements = advertisementsNotPaginated.slice(Number(page) * limit, (Number(page) + 1) * limit)
        const pageCount = Math.ceil(Object.keys(advertisementsNotPaginated).length / limit)

        const categoriesObj = await Category.find({ _id: advertisements.map(el => el.categories).flat(1) })
        const productsObj = await Product.find({ _id: advertisements.map(el => el.products).flat(1).map(el => el.product) })
        const usersObj = await User.find({ _id: advertisements.map(el => el.createdBy) })
        const citiesObj = await City.find({ _id: advertisements.map(el => el.city).flat(1) })
        const statusesObj = await AdvertisementStatus.find()

        const advertisementsMerged = advertisements.map(el => {
            const productsAdv = el.products.map(el2 => {
                const productFull = productsObj.filter(a => a._id.toString() === el2.product.toString())[0]
                const product = {
                    count: el2.count,
                    product: productFull
                }

                return product
            })

            const categoriesAdv = el.categories.map(el3 => {
                const categoryFull = categoriesObj.filter(a => a._id.toString() === el3.toString())[0]

                return categoryFull
            })

            const citiesAdv = el.city.map(el4 => {
                const citiesFull = citiesObj.filter(a => a._id.toString() === el4.toString())[0]

                return citiesFull
            })

            const createdBy = usersObj.filter(a => a._id.toString() === el.createdBy.toString())[0]
            const statusAdv = statusesObj.filter(a => a._id.toString() === el.status.toString())[0]
            const rating = el.ratingCount === 0 ? 0 : el.ratingValue / el.ratingCount

            const adv = {
                _id: el._id,
                title: el.title,
                description: el.description,
                rating: Number(rating.toFixed(0)),
                price: el.price,
                status: statusAdv.name,
                image: el.image,
                createdOn: el.createdOn,
                createdBy: {
                    firstName: createdBy.firstName,
                    surName: createdBy.surName,
                    phoneNumber: createdBy.phoneNumber,
                    online: createdBy.online,
                },
                products: productsAdv,
                categories: categoriesAdv,
                cities: citiesAdv
            }

            return adv
        })

        const body = {
            advertisements: advertisementsMerged,
            pageCount: pageCount
        }

        return res.status(200).json(body)
        
    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again later." })
    }
})


module.exports = router