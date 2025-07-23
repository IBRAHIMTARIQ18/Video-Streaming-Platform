import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  // Get user data and files from frontend
  // Validatation of data - fields should not be empty
  // check if user already exists through email/username
  // check for image, check for avatar
  // upload images and avatar to cloudinary
  // create user object - create entry in database
  // check for user creation success?
  // remove password and refresh token field from response
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

// check for avatar and cover image
const avatarLocalPath = req.files?.avatar[0]?.path;
const coverImageLocalPath = req.files?.coverImage[0]?.path;

if (!avatarLocalPath) {
  throw new ApiError(400, "Avatar image is required");
}

// Upload image and avatar to Cloudinary
const avatar = await uploadOnCloudinary(avatarLocalPath);
const coverImage = await uploadOnCloudinary(coverImageLocalPath);

if (!avatar) {
  throw new ApiError(400, "Avatar file is required");
}

// Create user object
const user = await User.create({
  fullName,
  avatar: avatar.url,
  coverImage: coverImage?.url || "",
  email,
  password,
  username: username.toLowerCase(),
});

// Check if user creation was successful, also password and refresh token are removed.
const createdUser = await User.findById(user._id).select(
  "-password -refreshToken"
);

// Remove sensitive fields from response
export { registerUser };
