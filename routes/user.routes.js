const { Router } = require("express")
const auth = require("../middleware/auth.middleware")
const bcrypt = require("bcryptjs")
const config = require('config')
const { check, validationResult } = require("express-validator")
const Advertisement = require("../models/Advertisement")
const City = require("../models/City")
const Product = require("../models/Product")
const User = require("../models/User")
const cloudinary = require("cloudinary").v2

const router = Router()


router.post("/get-profile", auth, async (req, res) => {
    try {
        const { userId } = req.body
        const self = userId == req.user.userId ? true : false

        const user = await User.findOne({ _id: userId })
        const city = await City.findOne({ _id: user.city })

        const profile = {
            firstName: user.firstName,
            surName: user.surName,
            phoneNumber: user.phoneNumber,
            avatar: user.avatar,
            city: city.name,
            online: user.online,
            since: user.createdOn
        }

        const body = {
            profile: profile,
            self: self
        }

        return res.status(200).json(body)
    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again later." })
    }
})


router.post("/deactivate-user", auth, async (req, res) => {
    try {
        const { userId } = req.body
        const userJwt = req.user

        if (userId.toString() != userJwt.userId.toString())
            return res.status(400).json({ message: "You don't have such permission" })

        const user = await User.findOne({ _id: userId })

        if (user.deleated)
            return res.status(400).json({ message: "User has been already deleted" })

        user.deleated = true
        user.email = `${user.email.toString()}//deleted`
        user.avatar = "various/static/avatar-empty_xqyyk1"
        user.firstName = "Deleted"
        user.surName = "Account"

        const advertisements = await Advertisement.deleteMany({ createdBy: userId })
        const products = await Product.deleteMany({ createdBy: userId })

        user.save()

        const body = {
            message: "User has been deleted",
            advertisements: advertisements,
            products: products
        }

        return res.status(200).json(body)
    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again later." })
    }
})


router.post(
    '/update-user',
    auth,
    [
        check('newPassword', 'Password is too short').optional().isLength({ min: 8 }),
        check('newPassword', 'Password is too long').optional().isLength({ max: 20 }),
        check('firstName', 'Name is too short').optional().isLength({ min: 2 }),
        check('surName', 'Surname is too short').optional().isLength({ min: 2 }),
        check('firstName', 'Name is too long').optional().isLength({ max: 20 }),
        check('surName', 'Surname is too long').optional().isLength({ max: 20 }),
        check('phoneNumber', 'Incorrect Phone Number').optional().isLength({ min: 10, max: 12 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req)

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    errors: errors.array(),
                    message: 'Incorrect Data'
                })
            }

            const { firstName, surName, phoneNumber, avatar, newPassword, city, password } = req.body
            const userId = req.user.userId

            const userObj = await User.findOne({ _id: userId })

            if (!password) {
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": password,
                                "msg": "Invalid credentials",
                                "param": "password",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

            const isMatch = await bcrypt.compare(password, userObj.password)

            if (!isMatch) {
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": password,
                                "msg": "Invalid credentials",
                                "param": "password",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

            const timeStamp = Date.now()
            if (firstName) userObj.firstName = firstName
            if (surName) userObj.surName = surName
            if (phoneNumber) userObj.phoneNumber = phoneNumber
            if (avatar) userObj.avatar = config.get("cdnAvatars") + "avatar_" + userObj._id + "_" + timeStamp

            if (newPassword) {
                if (!/\d/.test(newPassword)) {
                    return res.status(400).json(
                        {
                            errors: [
                                {
                                    "value": newPassword,
                                    "msg": "Password should contain at least 1 digit",
                                    "param": "password",
                                    "location": "body"
                                }
                            ],
                            message: 'Incorrect Data'
                        }
                    )
                }

                if (!/[A-Z]/.test(newPassword)) {
                    return res.status(400).json(
                        {
                            errors: [
                                {
                                    "value": newPassword,
                                    "msg": "Password should contain at least 1 capital letter",
                                    "param": "password",
                                    "location": "body"
                                }
                            ],
                            message: 'Incorrect Data'
                        }
                    )
                }

                const hashedPassword = await bcrypt.hash(newPassword, 12)
                userObj.password = hashedPassword
            }

            if (phoneNumber) {
                if (isNaN(phoneNumber)) {
                    return res.status(400).json(
                        {
                            errors: [
                                {
                                    "value": phoneNumber,
                                    "msg": "Incorrect Phone Number",
                                    "param": "phoneNumber",
                                    "location": "body"
                                }
                            ],
                            message: 'Incorrect Data'
                        }
                    )
                }
            }

            if (city) {
                const cityObj = await City.findOne({ name: city })

                if (!cityObj) {
                    return res.status(400).json(
                        {
                            errors: [
                                {
                                    "value": city,
                                    "msg": "Incorrect City",
                                    "param": "city",
                                    "location": "body"
                                }
                            ],
                            message: 'Incorrect Data'
                        }
                    )
                }
                userObj.city = cityObj
            }

            if (avatar) 
                await cloudinary.uploader.upload(avatar, { public_id: "avatar_" + userObj._id + "_" + timeStamp, folder: config.get("cdnAvatars"), invalidate: true })
                
            await userObj.save()

            const body = {
                message: "User has been updated",
                user: userObj
            }

            return res.status(200).json(body)

        } catch (e) {
            return res.status(500).json({ message: 'Something went wrong, try again. ' })
        }
    }
)


// router.post("/create-img", async (req, res) => {

//     const { image } = req.body

//     const result = cloudinary.uploader.upload(image, { public_id: "test_img", folder: "various/avatars" })

//     return res.status(200).json({ message: "Image has been created", result: result })
// })


module.exports = router