const { Router } = require('express')
const { check, validationResult } = require('express-validator')
const auth = require('../middleware/auth.middleware')
const config = require('config')
const Product = require('../models/Product')
const Advertisement = require('../models/Advertisement')
const cloudinary = require("cloudinary").v2

const router = Router()


router.post('/create-product', auth,
    [
        check("name", "Product name is too long").isLength({ max: 50 }),
        check("name", "Product name is too short").isLength({ min: 2 }),
        check("description", "Product description is too long").isLength({ max: 200 }),

    ],
    async (req, res) => {
        try {
            const errors = validationResult(req)

            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array(), message: 'Incorrect Data' })

            const { name, description, image } = req.body
            const user = req.user.userId

            let imagePath = null
            if (image) {
                imagePath = "product_" + name.replaceAll(' ', '') + "_" + Date.now()
                await cloudinary.uploader.upload(image, { public_id: imagePath, folder: config.get("cdnProducts"), invalidate: true })
                imagePath = config.get("cdnProducts") + imagePath
            }

            const product = new Product({
                name,
                description,
                image: imagePath,
                createdBy: user
            })

            await product.save()

            const body = {
                product: product
            }

            return res.status(201).json(body)

        } catch (e) {
            return res.status(500).json({ message: "Something went wrong, please try again." })
        }
    }
)


router.post('/get-product-by-id', auth, async (req, res) => {
    try {
        const { productId } = req.body
        const product = await Product.findOne({ _id: productId })

        if (!product)
            return res.status(400).json({ message: "No product has been found" })

        const body = {
            product: product
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again." })
    }
})


router.post('/get-products-by-user', auth, async (req, res) => {
    try {
        const userId = req.user.userId
        const products = await Product.find({ createdBy: userId })

        if (!Object.keys(products).length)
            return res.status(400).json({ message: "No products has been found" })

        const body = {
            products: products
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again." })
    }
})


router.post('/delete-product', auth, async (req, res) => {
    try {
        const { productId } = req.body
        const userId = req.user.userId

        const product = await Product.findOne({ _id: productId })

        if (userId.toString() != product.createdBy.toString())
            return res.status(400).json({ message: "You don't have such permission" })

        const advertisementProduct = await Advertisement.deleteMany({ "products.product": productId })
        const productDeleated = await Product.deleteMany({ _id: productId })

        const body = {
            message: "Product with releated advertisements have been deleated.",
            product: productDeleated,
            realeatedAdvertisements: advertisementProduct
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again." })
    }
})


router.post('/update-product', auth,
    [
        check("name", "Product name is too long").optional().isLength({ max: 50 }),
        check("name", "Product name is too short").optional().isLength({ min: 2 }),
        check("description", "Product description is too short").optional().isLength({ min: 2 }),
        check("description", "Product description is too long").optional().isLength({ max: 200 }),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req)

            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array(), message: "Incorrect data" })


            const { name, description, image, productId } = req.body
            const userId = req.user.userId
            const product = await Product.findOne({ _id: productId })

            if (userId.toString() != product.createdBy.toString())
                return res.status(400).json({ message: "You don't have such permission" })

            if (name) product.name = name
            if (description) product.description = description
            if (image) product.image = image

            await product.save()

            const body = {
                product: product
            }

            res.status(200).json(body)

        } catch (e) {
            return res.status(500).json({ message: "Something went wrong, please try again." })
        }
    }
)


module.exports = router