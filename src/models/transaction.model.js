import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Transaction must be associated with a from account"],
      index: true,
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Transaction must be associated with a to account"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
        message: "Status can be either PENDING, COMPLETED, FAILED or REVERSED",
      },
      default: "PENDING",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required for creating a transaction"],
      min: [0, "Transaction amount cannot be negative"],
    },
    // This key is used to track transactions
    idempotencyKey: {
      type: String,
      required: [
        true,
        "Idempotency Key is required for creating a transaction",
      ],
      index: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Transaction = mongoose.model("Transaction" , transactionSchema)