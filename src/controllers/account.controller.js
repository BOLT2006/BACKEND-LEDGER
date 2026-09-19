import { Account } from "../models/account.model.js";

// CREATE ACCOUNT
async function createAccountContoller(req , res) {
    
    const user = req.user

    const account = await Account.create({
        user : user._id
    })

    res.status(201).json({
        account
    })
}
// GET ALL ACCOUNTS
async function getAccountsController(req , res) {
    const accounts = await Account.find({user : req.user._id})
    res.status(200).json({
        accounts
    })
}
// GET ACCOUNT Balance
async function getAccountBalanceController(req , res) {
    const {accountId} = req.params

    // Check if the account belongs to the user
    const account = await Account.findOne({_id : accountId , user : req.user._id})
    if(!account) {
        return res.status(404).json({
            message : "Account not found"
        })
    }

    // Calculate the balance
    const balance = await account.getBalance();

    res.status(200).json({
        message : "Account balance fetched successfully",
        balance
    })
}

export {createAccountContoller , getAccountsController , getAccountBalanceController}