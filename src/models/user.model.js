import mongoose from "mongoose";
import bcrypt from "bcrypt"

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required for creating a user"],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
    unique : [true, "Email already exist "]
  },
  name : {
    type : String,
    required : [true , "name is required"]
  },
  password : {
    type : String ,
    required : [true , "Password is required "],
    minlength : [6 , "Password Should conttain more than 6 character"], 
    select : false
  }
},{timestamps : true});

// Before saving the user data it will run a function
userSchema.pre("save" , async function (next) {
  if(!this.isModified("password")){
    return next()
  }
  const hash =  await bcrypt.hash(this.password , 10)
  this.password = hash

  return next()
})

userSchema.methods.comparePassword = async function (password){
  return await bcrypt.compare(password , this.password)
}
export const User = mongoose.model("User", userSchema);
