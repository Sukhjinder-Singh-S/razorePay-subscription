"use strict"

require('dotenv').config()
const EXPRESS = require('express')
const app = EXPRESS()
const bodyParser = require('body-parser')
const subcontroller = require('./subscription')

app.use(EXPRESS.json()).use(bodyParser.urlencoded({extended:true}))

app.get('/', (req, res)=>{
    res.status(200).json({msg:"Server is working fine", status:200})
})

app.post('/customer', subcontroller.createRazorCustomer)
app.get('/getPlans', subcontroller.fetchPlanFromRazoro)
app.post('/subscription', subcontroller.createSubscriptionFromRazor)
app.post('/webhook', subcontroller.webhookEventMonitor)

app.listen(process.env.PORT,()=>{
    console.log(`Server is listening on the port ${process.env.PORT}`)
})

