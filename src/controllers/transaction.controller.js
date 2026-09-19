async function createTransaction(req, res) {

    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message:
                "FromAccount, toAccount, amount and idempotencyKey are required"
        });
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    });

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    });

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        });
    }

    /**
     * 2. Validate idempotency key
     */
    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    });

    if (isTransactionAlreadyExists) {

        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            });
        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            });
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            });
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            });
        }
    }

    /**
     * 3. Check account status
     */
    if (
        fromUserAccount.status !== "ACTIVE" ||
        toUserAccount.status !== "ACTIVE"
    ) {
        return res.status(400).json({
            message:
                "Both fromAccount and toAccount must be ACTIVE to process transaction"
        });
    }

    /**
     * 4. Derive sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance();

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        });
    }

    let transaction;

    try {

        /**
         * Start MongoDB transaction
         */
        const session = await mongoose.startSession();

        session.startTransaction();

        /**
         * 5. Create transaction with PENDING status
         */
        transaction = (
            await transactionModel.create(
                [{
                    fromAccount,
                    toAccount,
                    amount,
                    idempotencyKey,
                    status: "PENDING"
                }],
                { session }
            )
        )[0];

        /**
         * 6. Create DEBIT ledger entry
         */
        await ledgerModel.create(
            [{
                account: fromAccount,
                amount: amount,
                transaction: transaction._id,
                type: "DEBIT"
            }],
            { session }
        );

        console.log("DEBIT ledger entry created");

        /**
         * 7. Wait for 15 seconds using Promise
         */
        await new Promise((resolve) => {
            setTimeout(resolve, 15 * 1000);
        });

        console.log("15 seconds completed");

        /**
         * 8. Create CREDIT ledger entry
         */
        await ledgerModel.create(
            [{
                account: toAccount,
                amount: amount,
                transaction: transaction._id,
                type: "CREDIT"
            }],
            { session }
        );

        console.log("CREDIT ledger entry created");

        /**
         * 9. Mark transaction as COMPLETED
         */
        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        );

        /**
         * 10. Commit MongoDB transaction
         */
        await session.commitTransaction();

        session.endSession();

    } catch (error) {

        console.error("Transaction error:", error);

        return res.status(400).json({
            message:
                "Transaction is pending due to some issue, please retry after sometime",
            error: error.message
        });
    }

    /**
     * 11. Send email notification
     */
    try {
        await emailService.sendTransactionEmail(
            req.user.email,
            req.user.name,
            amount,
            toAccount
        );
    } catch (emailError) {
        console.error(
            "Transaction email failed:",
            emailError.message
        );
    }

    /**
     * 12. Send response
     */
    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    });
}