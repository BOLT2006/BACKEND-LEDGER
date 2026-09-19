import Account from "../models/account.model.js";
import Transaction from "../models/transaction.model.js";
import Ledger from "../models/ledger.model.js";
import mongoose from "mongoose";
import { sendTransactionEmail, sendTransactionFailureEmail } from "../services/email.service.js";
import {authmiddleware} from "../middleware/auth.middleware.js";

/* Create a new transaction */
// 10 Steps to create a new transaction
// 1. Validate request
// 2. Validate idempotency key
// 3. Check account status
// 4. Derive sender balance from ledger
// 5. Create transaction (PENDING)
// 6. Create Debit ledger entry
// 7. Create credit ledger entry
// 8. Mark  transaction COMPLETED
// 9. Commit MongoDB session
// 10.Send email notification

async function createTransaction(req , res) {

    /* 1. Validate request */
    const {fromAccount , toAccount , amount , idempotencyKey } = req.body

    if(!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({message : "Missing required fields"})
    }

        // check if fromAccount and toAccount are exist
        const formUserAccount = await Account.findOne({ _id: fromAccount });

        const toUserAccount = await Account.findOne({ _id: toAccount });

        if (!formUserAccount || !toUserAccount) {
            return res.status(400).json({ message: "Account not found" });
        }

        /* 2. Validate idempotency key */

        // check if transaction with the same idempotency key already exists
        const existingTransaction = await Transaction.findOne({ idempotencyKey });

        if (existingTransaction) {
            if(existingTransaction.status === "COMPLETED") {
                return res.status(200).json({ message: "Transaction already completed" });
            }

            if(existingTransaction.status === "PENDING") {
                return res.status(200).json({ message: "Transaction is still pending" });
            }

            if(existingTransaction.status === "FAILED") {
                return res.status(200).json({ message: "Transaction has failed" });
            }

            if(existingTransaction.status === "REVERSED") {
                return res.status(200).json({ message: "Transaction has been reversed" });
            }
        }

        /* 3. Check account status */

        // check if both accounts are active
        if (formUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
            return res.status(400).json({ message: "One or both accounts are not active" });
        }

        /* 4. Derive sender balance from ledger */

        // get sender balance from ledger
        const balance = await formUserAccount.getBalance();

        // check if sender has sufficient balance
        if (balance < amount) {
            return res.status(400).json({ message: `Insufficient balance. Current balance: ${balance}. Requested amount: ${amount}` });
        }

        /* 5. Create transaction (PENDING) */

        //create session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        // create transaction
        const transaction = new Transaction({
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        } , { session });

        // debit leder entry
        const debitLedgerEntry = await Ledger.create({
            account: fromAccount,
            transaction: transaction._id,
            type: "DEBIT",
        } , { session });

        // credit ledger entry
        const creditLedgerEntry = await Ledger.create({
            account: toAccount,
            transaction: transaction._id,
            type: "CREDIT",
        } , { session });

        // mark transaction as COMPLETED
        transaction.status = "COMPLETED";
        await transaction.save({ session });
        
        // commit transaction
        await session.commitTransaction();
        await session.endSession();

        /* 10. Send email notification */

        await sendTransactionEmail(
            req.user.email,
            req.user.name,
            amount,
            toAccount
        );

        return res.status(201).json({ message: "Transaction completed successfully", transaction: transaction });


    }

    export { createTransaction };