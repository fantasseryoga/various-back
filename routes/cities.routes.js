const {Router} = require('express')
const City = require('../models/City')

const router = Router()


router.get('/get-cities', async (req, res) => {
    try{
        const citiesSorted = await City.find({}).sort({ name: 1 })

        const body = {
            cities: citiesSorted
        }

        return res.status(200).json({ cities: citiesSorted })
        
    } catch (e) {
        return res.status(500).json({ message: "Something went wrong, please try again"})
    }
})


// router.post(
//     '/add-city',
//     async (req,res) => {
//         const {name} = req.body
//         const city = new City({ name: name })
//         await city.save()

//         return res.status(201).json({ city })
//     }
// )

module.exports = router