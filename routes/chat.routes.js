const { Router } = require("express")
const auth = require("../middleware/auth.middleware")
const User = require("../models/User")
const Message = require("../models/Message")
const Chat = require("../models/Chat")

const router = Router()


router.post('/get-unread-messages', auth, async (req, res) => {
    try {
        const userId = req.user.userId
        const chats = await Chat.find({ $or: [{ createdBy: userId }, { createdTo: userId }] })
        const unreadMessages = await Message.find({ chat: chats.map(el => el._id), createdBy: { $ne: userId }, read: false })
        const unread = Object.keys(unreadMessages).length ? true : false
        const body = {
            unreadMessages: unreadMessages,
            unreadExists: unread
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again." })
    }
})


router.post('/get-chats-by-user', auth, async (req, res) => {
    try {
        const userId = req.user.userId
        const chats = await Chat.find({ $or: [{ createdBy: userId }, { createdTo: userId }] })

        if (!Object.keys(chats).length)
            return res.status(400).json({ message: "No chats has been found" })

        const companionsIds = chats.map(el => {
            if (el.createdBy.toString() != userId.toString()) {
                return el.createdBy
            } else {
                return el.createdTo
            }
        })

        const companions = await User.find({ _id: companionsIds })
        const messagesUnread = await Message.find({ chat: chats.map(el => el._id), createdBy: { $ne: userId }, read: false })

        const chatsMerged = chats.map(el => {
            let companion
            let unread = false
            messagesUnread.forEach(elM => {
                if (elM.chat.toString() === el._id.toString()) {
                    unread = true
                }
            })
            if (el.createdBy.toString() != userId.toString()) {
                companion = companions.filter(a => a._id.toString() === el.createdBy.toString())[0]
            } else {
                companion = companions.filter(a => a._id.toString() === el.createdTo.toString())[0]
            }

            return {
                name: companion.firstName + " " + companion.surName,
                companion: {
                    firstName: companion.firstName,
                    surName: companion.surName,
                    online: companion.online,
                    phoneNumber: companion.phoneNumber,
                    avatar: companion.avatar,
                },
                _id: el.id,
                createdOn: el.createdOn,
                createdBy: el.createdBy,
                createdTo: el.createdTo,
                unread: unread
            }
        })

        const body = {
            chats: chatsMerged
        }

        return res.status(200).json(body)

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again." })
    }
})


module.exports = router