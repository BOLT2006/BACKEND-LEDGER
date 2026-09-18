import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : [true , "Accounnt must be associated with a user"],
        index : true // it is used for faster Searching
    },
    status : {
        type : String,
        enum : {
            values : ["ACTIVE" , "FROZEN" , "CLOSED"],
            message : "Status can be either ACTIVE , FROZEN or CLOSED"
        },
        default : "ACTIVE"
    },
    // We cannot store balance in database for this we use ledger
    currency : {
        type : String,
        required : [true , "Currency is required for creating an account"],
        default : "INR"
    }
} ,{timestamps : true});


// Create a compund index : tells MongoDB to create an index that makes searches involving user and status faster.
accountSchema.index({user : 1 , status : 1})


export const Account = mongoose.model("Account" , accountSchema)