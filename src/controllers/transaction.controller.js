import { Account } from "../models/account.model.js";
import { Transaction } from "../models/transaction.model.js";
import { Ledger } from "../models/ledger.model.js";
import mongoose from "mongoose";
import { sendTransactionEmail } from "../services/email.service.js";

// Create a new transaction
// 1. Validate request
// 2. Validate idempotency key
// 3. Check account status
// 4. Derive sender balance from ledger
// 5. Create transaction (PENDING)
// 6. Create Debit ledger entry
// 7. Create Credit ledger entry
// 8. Mark transaction COMPLETED
// 9. Commit MongoDB session
// 10. Send email notification

async function createTransaction(req, res) {
    try {
        // 1. Validate request
        const {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey
        } = req.body;

        if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0"
            });
        }

        // Check if fromAccount and toAccount exist
        const fromUserAccount = await Account.findOne({
            _id: fromAccount
        });

        const toUserAccount = await Account.findOne({
            _id: toAccount
        });

        if (!fromUserAccount || !toUserAccount) {
            return res.status(404).json({
                success: false,
                message: "Account not found"
            });
        }

        // Make sure the logged-in user owns the sender account
        if (fromUserAccount.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to use this account"
            });
        }

        // 2. Validate idempotency key
        const existingTransaction = await Transaction.findOne({
            idempotencyKey
        });

        if (existingTransaction) {
            if (existingTransaction.status === "COMPLETED") {
                return res.status(200).json({
                    success: true,
                    message: "Transaction already completed",
                    transaction: existingTransaction
                });
            }

            if (existingTransaction.status === "PENDING") {
                return res.status(200).json({
                    success: true,
                    message: "Transaction is still pending",
                    transaction: existingTransaction
                });
            }

            if (existingTransaction.status === "FAILED") {
                return res.status(200).json({
                    success: false,
                    message: "Transaction has failed",
                    transaction: existingTransaction
                });
            }

            if (existingTransaction.status === "REVERSED") {
                return res.status(200).json({
                    success: false,
                    message: "Transaction has been reversed",
                    transaction: existingTransaction
                });
            }
        }

        // 3. Check account status
        if (
            fromUserAccount.status !== "ACTIVE" ||
            toUserAccount.status !== "ACTIVE"
        ) {
            return res.status(400).json({
                success: false,
                message: "One or both accounts are not active"
            });
        }

        // 4. Derive sender balance from ledger
        const balance = await fromUserAccount.getBalance();

        if (balance < numericAmount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Current balance: ${balance}. Requested amount: ${numericAmount}`
            });
        }

        // 5-9. MongoDB transaction
        const session = await mongoose.startSession();

        let transaction;

        try {
            session.startTransaction();

            // 5. Create transaction with PENDING status
            transaction = new Transaction({
                fromAccount: fromAccount,
                toAccount: toAccount,
                amount: numericAmount,
                idempotencyKey: idempotencyKey,
                status: "PENDING"
            });

            await transaction.save({ session });

            // 6. Create DEBIT ledger entry
            await Ledger.create(
                [
                    {
                        account: fromAccount,
                        amount: numericAmount,
                        transaction: transaction._id,
                        type: "DEBIT"
                    }
                ],
                { session }
            );

            // 7. Create CREDIT ledger entry
            await Ledger.create(
                [
                    {
                        account: toAccount,
                        amount: numericAmount,
                        transaction: transaction._id,
                        type: "CREDIT"
                    }
                ],
                { session }
            );

            // 8. Mark transaction as COMPLETED
            transaction.status = "COMPLETED";

            await transaction.save({ session });

            // 9. Commit transaction
            await session.commitTransaction();

        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }

            console.error("Transaction failed:", error);

            return res.status(500).json({
                success: false,
                message: "Transaction failed",
                error: error.message
            });

        } finally {
            await session.endSession();
        }

        // 10. Send email after successful commit
        try {
            await sendTransactionEmail(
                req.user.email,
                req.user.name,
                numericAmount,
                toAccount
            );
        } catch (emailError) {
            console.error("Transaction email failed:", emailError.message);
        }

        return res.status(201).json({
            success: true,
            message: "Transaction completed successfully",
            transaction
        });

    } catch (error) {
        console.error("Create transaction error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}


// Create initial fund transfer
// System User → New User
//
// This creates exactly TWO ledger entries:
//
// 1. System Account → DEBIT
// 2. User Account   → CREDIT

async function createInitialFundTransfer(req, res) {
    try {
        const {
            toAccount,
            amount,
            idempotencyKey
        } = req.body;

        // 1. Validate request
        if (!toAccount || !amount || !idempotencyKey) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0"
            });
        }

        // 2. Check idempotency key
        const existingTransaction = await Transaction.findOne({
            idempotencyKey
        });

        if (existingTransaction) {
            return res.status(200).json({
                success: true,
                message: "Initial fund transfer already processed",
                transaction: existingTransaction
            });
        }

        // 3. Find receiver account
        const toUserAccount = await Account.findOne({
            _id: toAccount,
            status: "ACTIVE"
        });

        if (!toUserAccount) {
            return res.status(404).json({
                success: false,
                message: "To account not found or inactive"
            });
        }

        // 4. Find System User's account
        //
        // IMPORTANT:
        // systemUser belongs to User, NOT Account.
        //
        // authSystemUserMiddleware has already verified:
        // req.user.systemUser === true
        //
        // So here we only need to find the account
        // belonging to req.user.

        const fromUserAccount = await Account.findOne({
            user: req.user._id,
            status: "ACTIVE"
        });

        if (!fromUserAccount) {
            return res.status(404).json({
                success: false,
                message: "System user account not found"
            });
        }

        // 5-8. MongoDB transaction
        const session = await mongoose.startSession();

        let transaction;

        try {
            session.startTransaction();

            // 5. Create transaction with PENDING status
            transaction = new Transaction({
                fromAccount: fromUserAccount._id,
                toAccount: toUserAccount._id,
                amount: numericAmount,
                idempotencyKey: idempotencyKey,
                status: "PENDING"
            });

            // Save transaction first
            // so transaction._id exists in Atlas
            await transaction.save({ session });

            // 6. Create DEBIT ledger entry
            await Ledger.create(
                [
                    {
                        account: fromUserAccount._id,
                        amount: numericAmount,
                        transaction: transaction._id,
                        type: "DEBIT"
                    }
                ],
                { session }
            );

            // 7. Create CREDIT ledger entry
            await Ledger.create(
                [
                    {
                        account: toUserAccount._id,
                        amount: numericAmount,
                        transaction: transaction._id,
                        type: "CREDIT"
                    }
                ],
                { session }
            );

            // 8. Mark transaction as COMPLETED
            transaction.status = "COMPLETED";

            await transaction.save({ session });

            // 9. Commit everything
            await session.commitTransaction();

        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }

            console.error("Initial fund transfer failed:", error);

            return res.status(500).json({
                success: false,
                message: "Initial fund transfer failed",
                error: error.message
            });

        } finally {
            await session.endSession();
        }

        return res.status(201).json({
            success: true,
            message: "Initial fund transfer completed successfully",
            transaction
        });

    } catch (error) {
        console.error("Initial fund transfer error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}


export {
    createTransaction,
    createInitialFundTransfer
};