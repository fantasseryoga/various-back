const { Router } = require('express')
const { check, validationResult } = require('express-validator')
const auth = require('../middleware/auth.middleware')
const Rating = require('../models/Rating')
const Advertisement = require('../models/Advertisement')

const router = Router()


router.post('/create-rating', auth,
    [
        check("text", "Text is too long").isLength({ max: 200 }),
        check("ratingValue", "Rating can't be lower then 1").isFloat({ min: 1 }),
        check("ratingValue", "Rating can't be greater then 5").isFloat({ max: 5 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array(), message: 'Incorrect Data' })

            const user = req.user
            const { text, ratingValue, advertisementId } = req.body

            const ratingExists = await Rating.find({ advertisement: advertisementId, createdBy: user.userId })

            if (Object.keys(ratingExists).length) {
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": user,
                                "msg": "You've already rated this advertisement",
                                "param": "user",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

            const advObj = await Advertisement.findOne({ _id: advertisementId })
            if(user.userId === advObj.createdBy){
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": user,
                                "msg": "You can't rate yourself",
                                "param": "user",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

            advObj.ratingCount += 1
            advObj.ratingValue += Number(ratingValue)

            const rating = new Rating({
                comment: text,
                rating: ratingValue,
                advertisement: advertisementId,
                createdBy: user.userId
            })

            await advObj.save()
            await rating.save()

            const body = {
                rating: rating
            }

            return res.status(201).json(body)

        } catch (e) {
            return res.status(500).json({ message: "Something went wrong, please try again." })
        }
    }
)


router.post('/delete-rating', auth, async (req, res) => {
    try {
        const { ratingId } = req.body
        const userId = req.user.userId

        const rating = await Rating.findOne({ _id: ratingId })

        if (userId.toString() != rating.createdBy.toString())
            return res.status(400).json({ message: "You don't have such permission" })

        const advertisement = await Advertisement.findOne({ _id: rating.advertisement })
        advertisement.ratingCount -= 1
        advertisement.ratingValue -= Number(rating.rating)

        const ratingDeleted = await Rating.deleteOne({ _id: ratingId })

        advertisement.save()

        const body = {
            message: "Rating has been deleted.",
            rating: ratingDeleted,
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again." })
    }
})


module.exports = router