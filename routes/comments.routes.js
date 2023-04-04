const { Router } = require('express')
const { check, validationResult } = require('express-validator')
const auth = require('../middleware/auth.middleware')
const Comment = require('../models/Comment')

const router = Router()


router.post('/create-comment', auth,
    [
        check("text", "Text is too long").isLength({ max: 200 }),
        check("text", "Text is too short").isLength({ min: 2 }),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req)

            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array(), message: 'Incorrect Data' })

            const user = req.user
            const { text, advertisementId } = req.body

            const comment = new Comment({
                text: text,
                createdBy: user.userId,
                advertisement: advertisementId
            })

            await comment.save()

            const body = {
                comment: comment
            }

            return res.status(201).json(body)

        } catch (e) {
            return res.status(500).json({ message: "Something went wrong, please try again." })
        }
    }
)


router.post('/delete-comment', auth, async (req, res) => {
    try {
        const { commentId } = req.body
        const userId = req.user.userId
        const comment = await Comment.findOne({ _id: commentId })

        if (userId.toString() != comment.createdBy.toString())
            return res.status(400).json({ message: "You don't have such permission" })

        const commentDeleted = await Comment.deleteOne({ _id: commentId })

        const body = {
            message: "Comment has been deleated.",
            product: commentDeleted
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again." })
    }
})


module.exports = router