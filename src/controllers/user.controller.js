import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";

const registerUser = asyncHandler(async (req, res) => {
  // Get user data and files from frontend
  // Validatation of data - fields should not be empty
  // check if user already exists through email/username
  // check for image, check for avatar
  // upload images and avatar to cloudinary
  // create user object - create entry in database
  // remove password and refresh token field from response
  // check for user creation success?
  // return response

  const { fullName, username, email, password } = req.body;

  // Validate required fields
  if (
    [fullName, username, email, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if user already exists
  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(408, "User already exists with this username or email");
  }
});

export { registerUser };
