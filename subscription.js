"use strict";

const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("./subscriptionModel");
const User = require("./userModel");

function nanoid() {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000);
    return `receipt_${timestamp}_${randomNum}`;
}

let rzp = new Razorpay({
    key_id: process.env.KEY_ID, // your `KEY_ID`
    key_secret: process.env.KEY_SECRET, // your `KEY_SECRET`
});

let subscriptionController = {};

/**
 * create new user for subscription
 */
subscriptionController.createUser = async (req, res) => {
    try {
        let { name, email, contact } = req.body;
        if (!name && !email) {
            return res
                .status(400)
                .json({ msg: "Name and Email are required", status: 400 });
        }
        let user = await User.findOne({ email }).lean();
        if (user) {
            return res.status(400).json({ msg: "User already exists", status: 400 });
        }
        let customer = await rzp.customers.create({
            name,
            email,
            contact,
        });
        console.log(customer, "razor pay customer");
        if (!customer) {
            return res
                .status(400)
                .json({ msg: "Failed to create customer", status: 400 });
        }
        let createUser = await User.create({
            name,
            email,
            contact,
            customerId: customer.id,
        });
        res
            .status(200)
            .json({ msg: "user registered successfully", user: createUser });
    } catch (err) {
        console.log(err);
        res
            .status(500)
            .json({ msg: "Internal server error", status: 500, error: err });
    }
};

/**
 * Retrieve the plans for the subscription
 */
subscriptionController.fetchPlanFromRazoro = async (req, res) => {
    try {
        let fetchPlan = await rzp.plans.all();
        //Subscription plan details
        console.log("Here is all plans in detail", fetchPlan);
        res
            .status(200)
            .json({ msg: "Successfully fetched all plans from razro", status: 200 });
    } catch (err) {
        res.status(500).json({ msg: "Internal server error", status: 500 });
    }
};

/**
 * Create subscription for the customer with a plan id
 */
subscriptionController.createSubscriptionFromRazor = async (req, res) => {
    try {
        // let currentDateTimeString = new Date()
        // currentDateTimeString = Math.floor(currentDateTimeString.setMinutes(currentDateTimeString.getMinutes() + 1))
        // console.log('current date time string : ', currentDateTimeString)
        let { plan_id, total_count, customerId, userId } = req.body;
        let createSubscription = await rzp.subscriptions.create({
            plan_id,
            total_count,
        });
        console.log(
            "subscription is created now complete the payment",
            createSubscription
        );
        /**
         *  get customer id and plan id from the frontend don't send in subscription instance after subscription is created in response we
         *  get the subscription id and we already have the customer id so store in db
         *  and after the with webhook monitor the subscription instance if user make the payment then check its subscription id and associated customer id in db
         *  then if subscription is successfull then change user status in db that user is subscribe
         *  also remember to monitor that if user cancel the subscription the check the starting date and cancel subscription acording to that
         **/
        // save customer and subscription id in db with current login userid
        let createPayment = await Payment.create({
            customerId,
            subscriptionId: createSubscription.id,
            userId,
        });
        res
            .status(200)
            .json({
                msg: "Subscription is created",
                subscriptionId: createSubscription.id,
                customerId,
                paymentLink: createSubscription.short_url,
            });
    } catch (err) {
        res.status(500).json({ msg: err.message, status: 500, Error: err });
    }
};

subscriptionController.webhookEventMonitor = async (req, res) => {
    try {
        const body = req.body;
        const razorpayWebhookSecret = process.env.WEBHOOK_SECRET;
        const payload = JSON.stringify(req.body);
        const expectedSignature = req.get("X-Razorpay-Signature");

        //generate a  signature to verify with the razorpay signature
        const generateSignature = crypto
            .createHmac("sha256", razorpayWebhookSecret)
            .update(JSON.stringify(body))
            .digest("hex");

        if (generateSignature === expectedSignature) {
            console.log("Webhook verified successfully");
            console.log("Received webhook event:", body.event);
            console.log("Webhook payload:", body.payload);

            // Handle the webhook event based on its type
            switch (body.event) {
                // case 'subscription.created':
                //     console.log('Subscription created:', body.payload.subscription.entity)
                //     break
                // case 'subscription.authenticated': // Sent when the first payment is made on the subscription
                //     console.log("subscription.authenticated: ", body.payload.subscription.entity)
                //     await Payment.findOneAndUpdate({ subscriptionId: body.payload.subscription.entity.id }, { status: 'authenticated' })
                //     break
                case "subscription.activated": // Sent when the subscription moves to the active state
                    console.log(
                        "subscription.activated: ",
                        body.payload.subscription.entity
                    );
                    let subscriptionInstance = await Payment.findOneAndUpdate(
                        { subscriptionId: body.payload.subscription.entity.id },
                        { status: "active" },
                        { new: true }
                    );
                    console.log(
                        subscriptionInstance,
                        "subscription updated instance with containing the customer id: ",
                        subscriptionInstance.id
                    );
                    await User.findOneAndUpdate(
                        { customerId: subscriptionInstance.customerId },
                        { subscription: true }
                    );
                    // await rzp.subscriptions.update(body.payload.subscription.entity.id, { start_at: currentDateTimeString })
                    break;
                // case 'subscription.charged': // Sent every time a successful charge is made on the subscription
                //     console.log("subscription.charged: ", body.payload.subscription)
                //     break
                // case 'subscription.completed': // Sent when all the invoices are generated for a subscription and the subscription moves to the completed state.
                //     console.log("subscription.completed: ", body.payload.subscription)
                //     break
                // case 'subscription.cancelled':
                //     console.log('Subscription cancelled:', body.payload.subscription)
                //     break

                default:
                    console.log("Unhandled event:", body.event);
            }
        }
    } catch (error) {
        console.log("Error occur", error);
        res
            .status(500)
            .json({ msg: "Internal server error occur", status: 500, error });
    }
};

/**
 * create checkout for order products
 */
subscriptionController.createOrder = async (req, res) => {
    try {
        let { amount, currency, customerId } = req.body;
        let options = {
            amount: amount * 100,
            currency,
            receipt: nanoid()
        };
        let order = await rzp.orders.create(options);
        console.log(order, "User order details");
        res
            .status(200)
            .json({ msg: "order created successfully", orderLink: order });
    } catch (err) {
        res.status(500).json({ msg: "Internal server error", err });
    }
};

subscriptionController.verifyPayment = async (req, res) => {
    try { 
        body = req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id;
        let expectedSignature = crypto.createHmac('sha256', process.env.KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        // Compare the signatures
        if (expectedSignature === req.body.razorpay_signature) {
            // if same, then find the previosuly stored record using orderId,
            // and update paymentId and signature, and set status to paid.
           console.log("Signature verify successfully");
           res.status(200).json({msg:"Payment verify successfully"})
        } else {
            res.render('pages/payment/fail', {
                title: "Payment verification failed",
            })
        }
    } catch (err) {
        res.status(500).json({ msg: "Internal server error", err });
    }
}





module.exports = subscriptionController;
