import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";

// TODO: get video, upload to cloudinary, create video
const publishAVideo = asyncHandler(async (req, res) => {
  // get video data from the req.body
  const { title, description } = req.body;

  // validate video data
  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title or description is missing");
  }

  // check for video file and thumbnail image
  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailFileLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video File is required");
  }

  if (!thumbnailFileLocalPath) {
    throw new ApiError(400, "Thumbnail image is required");
  }

  // Upload video file and thumbnail file to cloudinary and also validate them
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnailFile = await uploadOnCloudinary(thumbnailFileLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Error while uploading video file to cloudinary");
  }

  if (!thumbnailFile) {
    throw new ApiError(
      400,
      "Error while uploading thumbnail image to cloudinary"
    );
  }

  // Find the owner of the video to save in the video object created after.
  const VideoOwner = User.findById(req.user?._id);

  // Create video object
  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnailFile.url,
    title,
    description,
    duration: videoFile.duration.toFixed(0),
    owner: VideoOwner,
  });

  // Check video object is created or not
  if (!video) {
    throw new ApiError(500, "Video object creation failed");
  }

  // return response
  return res
    .status(200)
    .json(new ApiResponse(200, video, "video Published Successfully"));
});

//TODO: get video by id
const getVideoById = asyncHandler(async (req, res) => {
  // get video Id from params/url
  const { videoId } = req.params;

  // validate videoId
  if (isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId not valid");
  }

  // Find video in the DB
  const video = await Video.findById(videoId).populate("owner", "name email");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

export { publishAVideo, getVideoById };
