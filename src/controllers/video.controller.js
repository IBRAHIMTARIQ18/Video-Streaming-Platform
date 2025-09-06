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
    throw new ApiError(400, "Title or description is required");
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

  if (!videoFile.url) {
    throw new ApiError(400, "Error while uploading video file to cloudinary");
  }

  if (!thumbnailFile.url) {
    throw new ApiError(
      400,
      "Error while uploading thumbnail image to cloudinary"
    );
  }

  // Find the owner of the video to save in the video object created after.
  const VideoOwner = await User.findById(req.user?._id);

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
  if (!isValidObjectId(videoId)) {
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

//TODO: update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  // get video Id from params/url and video data from body
  const { videoId } = req.params;
  const { title, description } = req.body;

  // Validate videoId object but not title and desc because user may want to change title only or description only by validating we will restrict the user to update them both evertime update runs.
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is invalid");
  }

  // Check if video already exists through videoId and validate it
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Prepare update object and set fields in updated object
  const updateFields = {};

  if (title?.trim()) updateFields.title = title;
  if (description?.trim()) updateFields.description = description;

  // Check if a user has sent a new file to update thumbnail
  if (req.file?.path) {
    const thumbnail = await uploadOnCloudinary(req.file.path);
    if (!thumbnail?.url) {
      throw new ApiError(400, "Error while uploading thumbnail");
    }
    updateFields.thumbnail = thumbnail.url;
  }

  // Update Video
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateFields },
    { new: true }
  ).populate("owner", "name email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video details updated Successfully")
    );
});

//TODO: delete video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // validate
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is invalid");
  }

  //Find video by its videoId and validate it
  const video = await Video.findOne({
    _id: videoId,
    owner: req.user?._id,
  });

  if (!video) {
    throw new ApiError(404, "Video not found or not authorized to delete");
  }

  await video.deleteOne();

  return res
    .status(204)
    .json(new ApiResponse(204, null, "Video is deleted successfully"));
});

//TODO: toggle publish status functionality
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // validate the videoId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "VideoId is invalid");
  }

  // Find video by Id and validate it
  const video = await Video.findOne({ _id: videoId, owner: req.user?._id });

  if (!video) {
    throw new ApiError(404, "Video not found or unauthorized");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        video,
        `Video is ${video.isPublished ? "published" : "unpublished"} successfully`
      )
    );
});

//TODO: get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  // Validate sort inputs (whitelist to prevent injection / invalid fields)
  const ALLOWED_SORT_FIELDS = ["createdAt", "views", "duration", "title"];

  if (!ALLOWED_SORT_FIELDS.includes(sortBy)) sortBy = "createdAt";

  const sortDirection = sortType === "asc" ? 1 : -1;

  // Build base match (public feed shows only published)
  const match = {};

  // If caller is filtering by owner, we’ll set that; otherwise default to published only
  if (userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new ApiError(400, "userId is invalid");
    }
    match.owner = new mongoose.Types.ObjectId(userId);

    // if the requester is looking at someone else’s profile, keep only published
    if (!req.user || req.user._id.toString() !== userId.toString()) {
      match.isPublished = true;
    }
  } else {
    // No owner filter => public feed
    match.isPublished = true;
  }

  // Search by text (title/description) if query is provided
  if (query && query.trim()) {
    const q = query.trim();
    match.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  // Build aggregation pipeline
  const pipeline = [
    { $match: match },
    // Sort early for stable pagination. Add _id as a tiebreaker.
    { $sort: { [sortBy]: sortDirection, _id: 1 } },
    // Join owner info because aggregatePaginate doesn't populate for us
    {
      $lookup: {
        from: "users", // collection name for User model
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          { $project: { _id: 1, name: 1, email: 1, username: 1, avatar: 1 } },
        ],
      },
    },
    { $unwind: "$owner" },
    // Shape the output (avoid returning internal fields you don't need)
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        owner: 1,
      },
    },
  ];

  // Run paginated aggregation
  const aggregate = Video.aggregate(pipeline);

  const result = await Video.aggregatePaginate(aggregate, {
    page,
    limit,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Videos fetched successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
