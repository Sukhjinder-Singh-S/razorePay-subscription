const mongoose = require('mongoose')
const Schema = mongoose.Schema

const razorSchema = new Schema({
    customerId: { type: String, required: true },
    paymentId: { type: String, required: true },
    status: {
        type: String, enum: ["created", "authorized", "captured", "refunded", "failed"], default: "created"
    },
    userId: { type: Schema.Types.ObjectId, ref: 'user' } // user model name may vary confirm it
}, { timestamps: true })



module.exports = mongoose.model("subscription", razorSchema)