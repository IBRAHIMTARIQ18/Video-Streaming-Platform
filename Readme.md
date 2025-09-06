# Combined Video Streaming & Twitter Platform's Backend

# 🎥📢 TwitVidStream Backend

A **production-ready Node.js backend** combining **video streaming/sharing** features (like YouTube) with **social microblogging** features (like Twitter).  
Built with **Express, MongoDB (Mongoose), JWT authentication, and media handling**.  

This backend supports **video upload & management, user authentication, social features (tweets, likes, subscriptions, comments), playlists, and analytics dashboard**.

---

## 🚀 Features

### 📹 Video Module
- `getAllVideos` → Paginated & searchable video feed.
- `publishAVideo` → Upload & publish a video.
- `getVideoById` → Fetch video details by ID.
- `updateVideo` → Update title, description, or thumbnail.
- `deleteVideo` → Delete a video (only by owner).
- `togglePublishStatus` → Publish/unpublish a video.

### 👤 User Module
- `registerUser` → Sign up with email & password.
- `loginUser` → Authenticate and get tokens.
- `logoutUser` → Invalidate refresh token.
- `refreshAccessToken` → Refresh JWT tokens.
- `changeCurrentPassword` → Update password securely.
- `getCurrentUser` → Get profile of the logged-in user.
- `updateAccountDetails` → Update name/email.
- `updateUserAvatar` → Change profile avatar (Cloudinary).
- `updateUserCoverImage` → Change cover image.
- `getUserChannelProfile` → Public channel profile (with stats).
- `getWatchHistory` → Retrieve watch history.

### 🐦 Tweet Module
- `createTweet` → Post a new tweet.
- `getUserTweets` → Fetch all tweets from a user.
- `updateTweet` → Edit tweet.
- `deleteTweet` → Delete tweet.

### 🔔 Subscription Module
- `toggleSubscription` → Subscribe/unsubscribe to a channel.
- `getUserChannelSubscribers` → List subscribers of a channel.
- `getSubscribedChannels` → Channels the user is subscribed to.

### 🎶 Playlist Module
- `createPlaylist` → Create new playlist.
- `getUserPlaylists` → Fetch playlists of a user.
- `getPlaylistById` → Get playlist details.
- `addVideoToPlaylist` → Add video to playlist.
- `removeVideoFromPlaylist` → Remove video from playlist.
- `deletePlaylist` → Delete playlist.
- `updatePlaylist` → Rename/update playlist.

### ❤️ Likes Module
- `toggleCommentLike` → Like/unlike a comment.
- `toggleTweetLike` → Like/unlike a tweet.
- `toggleVideoLike` → Like/unlike a video.
- `getLikedVideos` → Get all liked videos of user.

### 💬 Comments Module
- `getVideoComments` → Fetch comments under a video.
- `addComment` → Post a new comment.
- `updateComment` → Edit own comment.
- `deleteComment` → Delete own comment.

### 📊 Dashboard Module
- `getChannelStats` → Get stats for logged-in creator.
- `getChannelVideos` → List all videos of the creator.

### 🩺 Health Check
- `healthcheck` → Simple endpoint to verify backend status.

---

## 🛠️ Tech Stack

- **Node.js + Express** → Backend framework.
- **MongoDB + Mongoose** → Database & ODM.
- **Cloudinary** → Media storage (video, images).
- **Multer** → File uploads.
- **JWT + Refresh Tokens** → Secure authentication.
- **bcrypt** → Password hashing.
- **mongoose-aggregate-paginate-v2** → Efficient pagination for video feeds.
- **Express Middleware** → Auth, error handling, async handling.




