import mongoose from "mongoose";
import { Ledger } from "./ledger.model.js";
const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Accounnt must be associated with a user"],
      index: true, // it is used for faster Searching
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "FROZEN", "CLOSED"],
        message: "Status can be either ACTIVE , FROZEN or CLOSED",
      },
      default: "ACTIVE",
    },
    // We cannot store balance in database for this we use ledger
    currency: {
      type: String,
      required: [true, "Currency is required for creating an account"],
      default: "INR",
    },
  },
  { timestamps: true },
);

// Create a compund index : tells MongoDB to create an index that makes searches involving user and status faster.
accountSchema.index({ user: 1, status: 1 });

// get account balance from ledger
accountSchema.methods.getBalance = async function () {
  // get all ledger entries for this account and calculate balance
  const balanceData = await Ledger.aggregate([
    // Match ledger entries for this account
    { $match: { account: this._id } },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0],
          },
        },
        totalCredit: {
          $sum: {
            $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        balance: {
          $subtract: ["$totalCredit", "$totalDebit"],
        },
      },
    },
  ]);

  // If there are no ledger entries, return 0 balance
    if (balanceData.length === 0) {
      return 0;
    }
    return balanceData[0].balance;
};

export const Account = mongoose.model("Account", accountSchema);
