import { Account } from "../models/account.model.js";

async function createAccountContoller(req , res) {
    
    const user = req.user

    const account = await Account.create({
        user : user._id
    })

    res.status(201).json({
        account
    })
}

export {createAccountContoller}