"use strict";

require("dotenv").config();
const EXPRESS = require("express");
const app = EXPRESS();
const bodyParser = require("body-parser");
const subcontroller = require("./subscription");
const mongoose = require("mongoose");
const PORT = process.env.PORT || 5000
const cors = require('cors')

app.use(EXPRESS.json()).use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.status(200).json({ msg: "Server is working fine", status: 200 });
});

app.use("/webhook", EXPRESS.raw({ type: "application/json" }));
app.use(cors())

app.post("/customer", subcontroller.createUser);
app.get("/getPlans", subcontroller.fetchPlanFromRazoro);
app.post("/subscription", subcontroller.createSubscriptionFromRazor);
app.post('/order', subcontroller.createOrder)
app.post("/verify", subcontroller.verifyPayment)
app.post("/webhook", subcontroller.webhookEventMonitor);

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.log(err);
    });

app.listen(PORT, () => {
    console.log(`Server is listening on the port ${process.env.PORT}`);
});
