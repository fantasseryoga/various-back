const authSocket = require('../middleware/auth.socket.middleware')
const Chat = require('../models/Chat')
const Message = require('../models/Message')
const User = require('../models/User')
const cloudinary = require('cloudinary').v2

module.exports = (http) => {

    const io = require("socket.io")(http, {
        cors: {
            origin: "http://54.85.108.71:3000",
            methods: ["GET", "POST"]
        },
        maxHttpBufferSize: 1e8
    })


    io.use(authSocket).on("connection", async (socket) => {
        const user = await User.findOne({ _id: socket.user.userId })
        user.socket = socket.id
        user.online = true
        await user.save()

        let currentChatId

        console.log(user.firstName + " " + user.surName + " connected to the socket.")
        socket.emit("connected", null)

        socket.on("get-chats", async profile => {
            try {
                const userId = user._id
                const chats = await Chat.find({ $or: [{ createdBy: userId }, { createdTo: userId }] })

                let chatProfile
                if (profile.profileId) {
                    chatProfile = await Chat.findOne({ $or: [{ createdBy: profile.profileId, createdTo: userId }, { createdTo: profile.profileId, createdBy: userId }] })
                    if (!chatProfile) {
                        chatProfile = new Chat({
                            name: profile.profileId,
                            createdBy: userId,
                            createdTo: profile.profileId,
                            sockets: [socket.id]
                        })
                        chats.push(chatProfile)

                        await chatProfile.save()
                    } else {
                        const unreadMessages = await Message.updateMany({ chat: chatProfile._id, read: false, createdBy: profile.profileId }, { read: true })
                        chatProfile.sockets.push(socket.id)
                        await chatProfile.save()
                    }

                    currentChatId = chatProfile._id
                }

                if (!Object.keys(chats).length) {
                    return socket.emit("get-chats", null)
                }

                const companionsIds = chats.map(el => {
                    if (el.createdBy.toString() != userId.toString()) {
                        return el.createdBy
                    } else {
                        return el.createdTo
                    }
                })

                const companions = await User.find({ _id: companionsIds })
                const messagesUnread = await Message.find({ chat: chats.map(el => el._id), createdBy: { $ne: userId }, read: false })
                const currentChatMessages = chatProfile ? await Message.find({ chat: chatProfile._id }) : []
                const currentChatCompanion = chatProfile ? await User.findOne({ _id: profile.profileId }) : null

                const chatsMerged = chats.map(el => {
                    let current = profile.profileId ? (chatProfile._id.toString() === el._id.toString() ? true : false) : false

                    let companion
                    let unread = false
                    let messages = []
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
                    if (current) {
                        messages = currentChatMessages
                    }

                    return {
                        name: companion.firstName + " " + companion.surName,
                        companion: {
                            firstName: companion.firstName,
                            surName: companion.surName,
                            online: companion.online,
                            phoneNumber: companion.phoneNumber,
                            avatar: companion.avatar,
                            _id: companion._id
                        },
                        _id: el.id,
                        createdOn: el.createdOn,
                        createdBy: el.createdBy,
                        createdTo: el.createdTo,
                        unread: unread,
                        current: current,
                        messages: messages
                    }
                })

                const body = {
                    chats: chatsMerged
                }

                if (currentChatCompanion) {
                    const companionSocket = currentChatCompanion.socket
                    if (chatProfile.sockets.indexOf(companionSocket) != -1)
                        io.to([companionSocket]).emit("companion-entered")
                }
                socket.emit('get-chats', body)
            } catch (e) {
                socket.emit('server-error', null)
            }
        })


        socket.on("join-chat", async (chat) => {
            try {
                const chatCurrent = await Chat.findOne({ _id: chat.chatId })

                if (!chatCurrent) return
                if (chatCurrent.createdBy.toString() != user._id.toString() && chatCurrent.createdTo.toString() != user._id.toString()) return
                if (currentChatId)
                    if (chat.chatId.toString() === currentChatId.toString()) return

                chatCurrent.sockets.push(socket.id)

                const companionId = chatCurrent.createdBy.toString() === user._id.toString() ? chatCurrent.createdTo : chatCurrent.createdBy
                const companionUser = await User.findOne({ _id: companionId })
                const companion = {
                    _id: companionUser._id,
                    firstName: companionUser.firstName,
                    surName: companionUser.surName,
                    avatar: companionUser.avatar,
                    online: companionUser.online,
                    phoneNumber: companionUser.phoneNumber
                }
                const unreadMessages = await Message.updateMany({ chat: chatCurrent._id, read: false, createdBy: companionId }, { read: true })
                const messages = await Message.find({ chat: chatCurrent._id }).sort("createdOn")

                if (currentChatId) {
                    const oldChat = await Chat.findOne({ _id: currentChatId })
                    oldChat.sockets.splice(oldChat.sockets.indexOf(socket.id), 1)
                    oldChat.save()
                }
                await chatCurrent.save()
                currentChatId = chatCurrent._id

                const body = {
                    companion: companion,
                    chat: {
                        name: companion.firstName + " " + companion.surName,
                        companion: {
                            firstName: companion.firstName,
                            surName: companion.surName,
                            online: companion.online,
                            phoneNumber: companion.phoneNumber,
                            avatar: companion.avatar,
                        },
                        _id: chatCurrent.id,
                        createdOn: chatCurrent.createdOn,
                        createdBy: chatCurrent.createdBy,
                        createdTo: chatCurrent.createdTo,
                        current: true,
                        messages: messages
                    }
                }

                socket.emit('join-chat', body)

                const currentChatSockets = chatCurrent.sockets
                if (currentChatSockets.indexOf(companionUser.socket != -1)) {
                    io.to([companionUser.socket]).emit("companion-entered")
                }
            } catch (e) {
                socket.emit('server-error', null)
            }
        })


        socket.on("send-message", async message => {
            try {
                const chat = await Chat.findOne({ _id: message.chatId })
                console.log(message)
                if (!chat) return
                if (message.msg === '' && !message.attachment) return
                if (chat.createdBy.toString() != user._id.toString() && chat.createdTo.toString() != user._id.toString()) return

                const companionId = chat.createdBy.toString() === user._id.toString() ? chat.createdTo : chat.createdBy
                const companion = await User.findOne({ _id: companionId })
                const companionOnChat = chat.sockets.indexOf(companion.socket) === -1 ? false : true
                let fileName = null

                if (message.attachment) {
                    fileName = "message_" + message.chatId.replaceAll(' ', '') + "_" + Date.now()
                    await cloudinary.uploader.upload(message.attachment, { public_id: fileName, folder: "various/messages/", invalidate: true })
                }
                
                const newMessage = new Message({
                    text: message.msg,
                    chat: message.chatId,
                    createdBy: user._id,
                    read: companionOnChat,
                    attachment: fileName
                })
                await newMessage.save()

                if (companionOnChat) {
                    io.to(companion.socket).emit('send-message', { message: newMessage })
                } else {
                    io.to(companion.socket).emit('new-message-notification', {
                        msg: newMessage, user: {
                            _id: user._id,
                            avatar: user.avatar,
                            firstName: user.firstName,
                            surName: user.surName
                        }
                    })
                }
                socket.emit('send-message', { message: newMessage })
            } catch (e) {
                socket.emit('server-error', null)
            }
        })


        socket.on("leave-chat", async () => {
            try {
                if (currentChatId) {
                    const oldChat = await Chat.findOne({ _id: currentChatId })
                    oldChat.sockets.splice(oldChat.sockets.indexOf(socket.id), 1)
                    oldChat.save()
                    currentChatId = null
                }
            } catch (e) {
                socket.emit('server-error', null)
            }
        })


        socket.on("disconnect", async () => {
            try {
                console.log(user.firstName + " " + user.surName + " disconnected")
                if (currentChatId) {
                    const oldChat = await Chat.findOne({ _id: currentChatId })
                    oldChat.sockets.splice(oldChat.sockets.indexOf(socket.id), 1)
                    oldChat.save()
                    currentChatId = null
                }
                user.online = false
                user.socket = null
                await user.save()

                socket.disconnect()
            } catch (e) {
                socket.emit('server-error', null)
            }
        })
    })
}
