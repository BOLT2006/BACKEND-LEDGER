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
  },
  // systemUser is a boolean field that indicates whether the user is a system user or not. System users are created by the system and cannot be modified or deleted by regular users. This field is immutable, meaning it cannot be changed after the user is created.
  systemUser : {
    type : Boolean,
    default : false,
    immutable : true,
    select : false
  }
},{timestamps : true});

// Before saving the user data it will run a function
userSchema.pre("save" , async function () {
  if(!this.isModified("password")){
    return 
  }
  const hash =  await bcrypt.hash(this.password , 10)
  this.password = hash

  return 
})

userSchema.methods.comparePassword = async function (password){
  return await bcrypt.compare(password , this.password)
}
export const User = mongoose.model("User", userSchema);
