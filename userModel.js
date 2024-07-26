const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
    name: { type: String, required: true },
    email:{type:String, required:true},
    contact:{type:String, required:true},
    subscription:{type:Boolean, default:0},
    customerId:{type:String}
}, { timestamps: true })



module.exports = mongoose.model("user", userSchema)