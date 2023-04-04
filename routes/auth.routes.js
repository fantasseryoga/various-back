const { Router } = require('express')
const bcrypt = require('bcryptjs')
const { check, validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
const config = require('config')
const City = require('../models/City')
const User = require('../models/User')

const router = Router()


router.post(
    '/register',
    [
        check('email', 'Incorrect Email').isEmail(),
        check('password', 'Password is too short').isLength({ min: 8 }),
        check('password', 'Password is too long').isLength({ max: 20 }),
        check('firstName', 'Name is too short').isLength({ min: 2 }),
        check('surName', 'Surname is too short').isLength({ min: 2 }),
        check('firstName', 'Name is too long').isLength({ max: 20 }),
        check('surName', 'Surname is too long').isLength({ max: 20 }),
        check('phoneNumber', 'Incorrect Phone Number').isLength({ min: 10, max: 12 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array(), message: 'Incorrect Data' })

            const { firstName, surName, phoneNumber, email, password, city } = req.body

            if (!/\d/.test(password)) {
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": password,
                                "msg": "Password should contain at least 1 digit",
                                "param": "password",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

            if (!/[A-Z]/.test(password)) {
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": password,
                                "msg": "Password should contain at least 1 capital letter",
                                "param": "password",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

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

            const existedUser = await User.findOne({ email: email, deleated: false })

            if (existedUser) {
                return res.status(400).json({
                    errors: [
                        {
                            "value": "",
                            "msg": "User already exists",
                            "param": "",
                            "location": "body"
                        }
                    ],
                    message: 'Incorrect Data'
                })
            }

            const hashedPassword = await bcrypt.hash(password, 12)
            const cityObj = await City.findOne({ name: city })

            if (!cityObj) {
                return res.status(400).json({
                    errors: [
                        {
                            "value": city,
                            "msg": "Incorrect City",
                            "param": "city",
                            "location": "body"
                        }
                    ],
                    message: 'Incorrect Data'
                })
            }

            const user = new User({
                email: email,
                password: hashedPassword,
                phoneNumber: phoneNumber,
                surName: surName,
                firstName: firstName,
                city: cityObj,
                avatar: "/various/static/avatar-empty_xqyyk1"
            })

            await user.save()

            res.status(201).json({ message: "User has been created" })

        } catch (e) {
            res.status(500).json({ message: 'Something went wrong, try again. ' })
        }
    }
)


router.post(
    '/login',
    [
        check('email', 'Enter correct email').normalizeEmail({ gmail_remove_dots: false }).isEmail(),
        check('password', 'Enter password').exists()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array(), message: "Incorrect Data" })

            const { email, password } = req.body
            const user = await User.findOne({ email })

            if (!user) {
                return res.status(400).json({
                    errors: [
                        {
                            "value": "",
                            "msg": "Invalid Credentials",
                            "param": "",
                            "location": "body"
                        }
                    ],
                    message: 'Incorrect Data'
                })
            }

            const isMatch = await bcrypt.compare(password, user.password)

            if (!isMatch) {
                return res.status(400).json(
                    {
                        errors: [
                            {
                                "value": "",
                                "msg": "Invalid Credentials",
                                "param": "",
                                "location": "body"
                            }
                        ],
                        message: 'Incorrect Data'
                    }
                )
            }

            const token = jwt.sign(
                { userId: user.id },
                config.get('jwtSecret'),
                { expiresIn: '1h' }
            )

            const body = {
                token: token,
                userId: user.id,
                userAvatar: user.avatar
            }

            return res.status(200).json(body)

        } catch (e) {
            return res.status(500).json({ message: 'Something went wrong, try again. ' })
        }
    }
)


module.exports = router