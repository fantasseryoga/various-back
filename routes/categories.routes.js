const { Router } = require('express')
const Category = require('../models/Category')

const router = Router()


router.get('/get-categories', async (req, res) => {
    try {
        const categoriesSorted = await Category.find({}).sort({ name: 1 })

        const body = {
            categories: categoriesSorted
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again" })
    }
})


// router.post(
//     '/add-category',
//     async (req,res) => {
//         const {name} = req.body
//         const category = new Category({ name: name })
//         await category.save()

//         return res.status(201).json({ category })
//     }
// )

module.exports = router