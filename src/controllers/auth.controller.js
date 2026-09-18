import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import "dotenv/config";
import cookieParser from "cookie-parser";
import bcyrpt from "bcrypt";
import { sendRegistrationEmail } from "../services/email.service.js";

/* userRegisterController*/
async function userRegisterController(req, res) {
  const { email, name, password } = req.body;

  const isExists = await User.findOne({ email });

  if (isExists) {
    return res.status(422).json({
      success: false,
      message: "User already exists with this email",
    });
  }

  const user = await User.create({
    email,
    password,
    name,
  });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  //Save the token in cookie
  res.cookie("token", token);

  res.status(201).json({
    success: true,
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
  await sendRegistrationEmail(user.email, user.name);
}

/*userLoginController*/
async function userLoginController(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      message: "Email or password is INVALID",
    });
  }
  const isPasswordCorrect = await user.comparePassword(password)

  if (!isPasswordCorrect) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  //Save the token in cookie
  res.cookie("token", token);

  res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
}
export { userRegisterController ,userLoginController };
