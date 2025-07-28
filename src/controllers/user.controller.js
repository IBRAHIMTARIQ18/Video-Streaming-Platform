import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Function to generate access and refresh tokens
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccesToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating tokens");
  }
};

// Register user controller
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

  if (!createdUser) {
    throw new ApiError(500, "User creation failed");
  }

  // Return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// Login user controller
const loginUser = asyncHandler(async (req, res) => {
  // get user data from frontend through req.body
  // validate required fields - email or username
  // check if user exists through email/username
  // check if password is matches in DB
  // if user exists, generate access token and refresh token
  // send cookies with tokens
  // return response with user data and tokens

  // user data through req.body
  const { email, username, password } = req.body;

  // Validate required fields
  if (!(email || username)) {
    throw new ApiError(400, "Email or username is required");
  }

  // user exists check
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // password match check
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // Generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Updated user object without password and refresh token
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Set cookies with tokens
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

// Logout user controller
const logoutUser = asyncHandler(async (req, res) => {
  // Check if user is authenticated and delete refresh token
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  // Clear cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// Refresh access token controller
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Check if refresh token exists in cookies
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized: No refresh token provided");
  }
  try {
    // Verify the refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Check if the user exists with the decoded token
    const user = await User.findById(decodedToken?.id);

    if (!user) {
      throw new ApiError(404, "Invalid refresh token: User not found");
    }

    // Check if the refresh token matches the one stored in the user document
    if (user?.refreshToken !== incomingRefreshToken) {
      throw new ApiError(
        401,
        "Unauthorized: refresh token is expired or invalid"
      );
    }

    // Generate new access and refresh tokens
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // Return new tokens in cookies
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Change current password controller
const changeCurrentPassword = asyncHandler(async (req, res) => {
  // Get user data from request body
  const { currentPassword, newPassword } = req.body;

  // Check if user exists
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if current password is correct
  const isCurrentPasswordValid = await user.isPasswordCorrect(currentPassword); // ret
  // urns true or false

  if (!isCurrentPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  // Update the user's password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// Get current user controller
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// Update account details controller
const updateAccountDetails = asyncHandler(async (req, res) => {
  // Get user data from request body
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "Full name or email is required");
  }

  // Update user details
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// Update user avatar controller
const upadateUserAvatar = asyncHandler(async (req, res) => {
  // Check if avatar file is provided
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // Upload avatar to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar to Cloudinary");
  }

  // Update user avatar in the database
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "User avatar updated successfully"));
});

const upadateUserCoverImage = asyncHandler(async (req, res) => {
  // Check if coverImage file is provided
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }

  // Upload coverImage to Cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading Cover Image to Cloudinary");
  }

  // Update user coverImage in the database
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "User Cover Image updated successfully"));
});

// export controllers
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  upadateUserAvatar,
  upadateUserCoverImage,
};
