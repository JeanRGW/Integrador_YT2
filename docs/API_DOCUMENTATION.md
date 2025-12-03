# API Documentation - Integrador_YT2

Complete API reference for the video sharing platform backend.

**Base URL:** `http://localhost:3000/api`

**Authentication:** Most endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

---

## Table of Contents

- [Authentication](#authentication)
- [Users](#users)
- [Videos](#videos)
- [Comments](#comments)
- [Likes](#likes)
- [Error Responses](#error-responses)

---

## Authentication

### How to Authenticate

1. Create an account using `POST /users`
2. Sign in using `POST /users/signin` to receive a JWT token
3. Include the token in the `Authorization` header for protected endpoints

**Token Format:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Users

### Create User

Create a new user account.

**Endpoint:** `POST /api/users`

**Auth Required:** No

**Request Body:**

```typescript
{
	name: string; // min 1 character
	email: string; // valid email format
	password: string; // min 8 characters
}
```

**Example Request:**

```json
{
	"name": "John Doe",
	"email": "john@example.com",
	"password": "securepassword123"
}
```

**Success Response:** `201 Created`

```typescript
{
	id: string; // UUID
	name: string;
	email: string; // lowercase normalized
	photoUrl: string | null;
	// Note: pwHash is excluded from response
}
```

**Example Response:**

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"name": "John Doe",
	"email": "john@example.com",
	"photoUrl": null
}
```

**Error Responses:**

- `400 Bad Request` - Validation error (invalid email, password too short)
- `409 Conflict` - Email already registered

---

### Sign In

Authenticate and receive a JWT token.

**Endpoint:** `POST /api/users/signin`

**Auth Required:** No

**Request Body:**

```typescript
{
	email: string; // valid email format
	password: string; // min 8 characters
}
```

**Example Request:**

```json
{
	"email": "john@example.com",
	"password": "securepassword123"
}
```

**Success Response:** `200 OK`

```typescript
{
	user: {
		id: string;
		name: string;
		email: string;
		photoUrl: string | null;
	}
	token: string; // JWT token
}
```

**Example Response:**

```json
{
	"user": {
		"id": "550e8400-e29b-41d4-a716-446655440000",
		"name": "John Doe",
		"email": "john@example.com",
		"photoUrl": null
	},
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid credentials

---

### Get Current User

Get the authenticated user's profile.

**Endpoint:** `GET /api/users/me`

**Auth Required:** Yes

**Success Response:** `200 OK`

```typescript
{
	id: string;
	name: string;
	email: string;
	photoUrl: string | null;
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - User not found

---

### Update Current User

Update the authenticated user's profile.

**Endpoint:** `PUT /api/users/me`

**Auth Required:** Yes

**Request Body:** (all fields optional)

```typescript
{
  name?: string;           // min 1 character
  email?: string;          // valid email format
  password?: string;       // min 8 characters
  oldPassword?: string;    // required if changing password
}
```

**Example Request:**

```json
{
	"name": "John Smith",
	"oldPassword": "securepassword123",
	"password": "newsecurepassword456"
}
```

**Success Response:** `200 OK`

```typescript
{
	id: string;
	name: string;
	email: string;
	photoUrl: string | null;
}
```

**Error Responses:**

- `400 Bad Request` - Validation error or incorrect old password
- `401 Unauthorized` - Missing or invalid token
- `409 Conflict` - Email already in use

---

### Upload User Photo

Upload a profile photo (direct upload).

**Endpoint:** `POST /api/users/me/photo`

**Auth Required:** Yes

**Content-Type:** `multipart/form-data`

**Form Fields:**

- `photo`: Image file (JPEG, PNG, GIF)
  - Max size: 5MB
  - Allowed types: `image/jpeg`, `image/png`, `image/gif`

**Example Request (using FormData):**

```javascript
const formData = new FormData();
formData.append("photo", fileInput.files[0]);

fetch("/api/users/me/photo", {
	method: "POST",
	headers: {
		Authorization: `Bearer ${token}`,
	},
	body: formData,
});
```

**Success Response:** `200 OK`

```typescript
{
	id: string;
	name: string;
	email: string;
	photoUrl: string; // S3 URL to uploaded photo
}
```

**Error Responses:**

- `400 Bad Request` - No file uploaded or invalid file type
- `401 Unauthorized` - Missing or invalid token
- `413 Payload Too Large` - File exceeds 5MB

---

### Remove User Photo

Remove the authenticated user's profile photo.

**Endpoint:** `DELETE /api/users/me/photo`

**Auth Required:** Yes

**Success Response:** `200 OK`

```typescript
{
	id: string;
	name: string;
	email: string;
	photoUrl: null;
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - No photo to remove

---

## Videos

### Search/List Videos

Search and filter videos with pagination.

**Endpoint:** `GET /api/videos`

**Auth Required:** Optional (some videos may be hidden without auth)

**Query Parameters:**

```typescript
{
  q?: string;                           // Search query for title/description
  uploaderName?: string;                // Filter by uploader name
  minLength?: number;                   // Min video length in seconds
  maxLength?: number;                   // Max video length in seconds
  sortBy?: "date" | "likes" | "length" | "title";  // Default: "date"
  sortOrder?: "asc" | "desc";           // Default: "desc"
  page?: number;                        // Page number (min: 1, default: 1)
  pageSize?: number;                    // Results per page (1-100, default: 20)
}
```

**Example Request:**

```
GET /api/videos?q=tutorial&sortBy=likes&sortOrder=desc&page=1&pageSize=10
```

**Success Response:** `200 OK`

```typescript
{
	videos: Array<{
		id: string;
		userId: string;
		title: string;
		description: string;
		visibility: "hidden" | "link-only" | "public";
		likeCount: number;
		dislikeCount: number;
		date: string; // ISO date
		videoLength: number; // seconds
		video: string; // S3 key
		owner: {
			id: string;
			name: string;
			email: string;
			photoUrl: string | null;
		};
	}>;
	pagination: {
		page: number;
		pageSize: number;
		totalResults: number;
		totalPages: number;
	}
}
```

**Error Responses:**

- `400 Bad Request` - Invalid query parameters

---

### Initiate Video Upload

Start a presigned video upload process.

**Endpoint:** `POST /api/videos/initiate`

**Auth Required:** Yes

**Request Body:**

```typescript
{
	title: string; // min 1 character
	description: string; // min 1 character
	visibility: "hidden" | "link-only" | "public"; // default: "public"
	filename: string; // original filename
	contentType: string; // MIME type (e.g., "video/mp4")
}
```

**Example Request:**

```json
{
	"title": "My Tutorial Video",
	"description": "Learn how to build amazing things",
	"visibility": "public",
	"filename": "tutorial.mp4",
	"contentType": "video/mp4"
}
```

**Success Response:** `200 OK`

```typescript
{
  key: string;              // Upload key to use for completion
  upload: {
    url: string;            // S3 presigned POST URL
    fields: {               // Form fields to include in POST
      key: string;
      bucket: string;
      "X-Amz-Algorithm": string;
      "X-Amz-Credential": string;
      "X-Amz-Date": string;
      Policy: string;
      "X-Amz-Signature": string;
    };
  };
}
```

**Upload Instructions:**

1. Use the returned presigned POST data to upload directly to S3
2. Include all `fields` in your multipart/form-data POST
3. Attach the video file
4. Call `POST /api/videos/complete` with the `key` after successful upload

**Error Responses:**

- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid token
- `429 Too Many Requests` - User has too many concurrent uploads (max 2)

---

### Complete Video Upload

Finalize a video upload and queue for transcoding.

**Endpoint:** `POST /api/videos/complete`

**Auth Required:** Yes

**Request Body:**

```typescript
{
  key: string;                                      // Key from initiate response
  title?: string;                                   // Optional: override title
  description?: string;                             // Optional: override description
  visibility?: "hidden" | "link-only" | "public";   // Optional: override visibility
}
```

**Example Request:**

```json
{
	"key": "uploads/550e8400-e29b-41d4-a716-446655440000/123e4567-e89b-12d3-a456-426614174000.mp4"
}
```

**Success Response:** `202 Accepted`

```typescript
{
	message: string; // "Upload received; processing queued"
	key: string; // The upload key
}
```

**Error Responses:**

- `400 Bad Request` - Missing key or file not found in S3
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Pending upload not found

---

### Get Video by ID

Retrieve a specific video's details.

**Endpoint:** `GET /api/videos/:id`

**Auth Required:** Optional (required for non-public videos)

**URL Parameters:**

- `id`: Video UUID

**Example Request:**

```
GET /api/videos/550e8400-e29b-41d4-a716-446655440000
```

**Success Response:** `200 OK`

```typescript
{
	id: string;
	userId: string;
	title: string;
	description: string;
	visibility: "hidden" | "link-only" | "public";
	likeCount: number;
	dislikeCount: number;
	date: string; // ISO date
	videoLength: number; // seconds
	video: string; // S3 key
	owner: {
		id: string;
		name: string;
		email: string;
		photoUrl: string | null;
	}
}
```

**Error Responses:**

- `403 Forbidden` - Video is not accessible to requester
- `404 Not Found` - Video not found

---

### Update Video

Update video metadata (owner only).

**Endpoint:** `PUT /api/videos/:id`

**Auth Required:** Yes (must be video owner)

**URL Parameters:**

- `id`: Video UUID

**Request Body:** (all fields optional)

```typescript
{
  title?: string;                                   // min 1 character
  description?: string;                             // min 1 character
  visibility?: "hidden" | "link-only" | "public";
}
```

**Example Request:**

```json
{
	"title": "Updated Tutorial Video",
	"visibility": "public"
}
```

**Success Response:** `200 OK`

```typescript
{
	id: string;
	userId: string;
	title: string;
	description: string;
	visibility: "hidden" | "link-only" | "public";
	likeCount: number;
	dislikeCount: number;
	date: string;
	videoLength: number;
	video: string;
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Not the video owner

### Delete Video

Permanently delete a video and its associated file from storage (owner only).

**Endpoint:** `DELETE /api/videos/:id`

**Auth Required:** Yes (must be video owner)

**URL Parameters:**

- `id`: Video UUID

**Example Request:**

```
DELETE /api/videos/550e8400-e29b-41d4-a716-446655440000
```

**Success Response:** `200 OK`

```typescript
{
	message: string; // "Video deleted successfully"
}
```

**Example Response:**

```json
{
	"message": "Video deleted successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Not the video owner
- `404 Not Found` - Video not found

**Note:** This action is permanent and cannot be undone. The video file will be deleted from S3 storage and all associated data (comments, likes) will be removed due to database cascade deletion.

---

- `404 Not Found` - Video not found

---

### Get Video Stream URL

Get a presigned URL to stream the video.

**Endpoint:** `GET /api/videos/:id/stream`

**Auth Required:** Optional (required for non-public videos)

**URL Parameters:**

- `id`: Video UUID

**Example Request:**

```
GET /api/videos/550e8400-e29b-41d4-a716-446655440000/stream
```

**Success Response:** `200 OK`

```typescript
{
	url: string; // Presigned S3 URL (valid for limited time)
}
```

**Example Response:**

```json
{
	"url": "https://s3.amazonaws.com/bucket/videos/processed/..."
}
```

**Error Responses:**

- `403 Forbidden` - Video is not accessible to requester
- `404 Not Found` - Video not found

---

### Get User's Videos

Retrieve all videos from a specific user.

**Endpoint:** `GET /api/videos/user/:userId`

**Auth Required:** Optional (affects visibility filtering)

**URL Parameters:**

- `userId`: User UUID

**Query Parameters:**

```typescript
{
  page?: number;        // Page number (default: 1)
  pageSize?: number;    // Results per page (default: 20)
}
```

**Example Request:**

```
GET /api/videos/user/550e8400-e29b-41d4-a716-446655440000?page=1&pageSize=10
```

**Success Response:** `200 OK`

```typescript
{
	videos: Array<{
		id: string;
		userId: string;
		title: string;
		description: string;
		visibility: "hidden" | "link-only" | "public";
		likeCount: number;
		dislikeCount: number;
		date: string;
		videoLength: number;
		video: string;
	}>;
	pagination: {
		page: number;
		pageSize: number;
		totalResults: number;
		totalPages: number;
	}
}
```

**Error Responses:**

- `404 Not Found` - User not found

---

### Get User's Pending Uploads

Get the current user's pending/processing uploads.

**Endpoint:** `GET /api/videos/pending`

**Auth Required:** Yes

**Success Response:** `200 OK`

```typescript
Array<{
	id: number;
	userId: string;
	key: string;
	filename: string | null;
	contentType: string | null;
	title: string | null;
	description: string | null;
	visibility: "hidden" | "link-only" | "public" | null;
	createdAt: string; // ISO timestamp
	expiresAt: string; // ISO timestamp
	status: "initiated" | "uploaded" | "processing" | "done" | "failed";
}>;
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token

---

### Get Next Transcoding Job (Transcoder Only)

Internal endpoint for the transcoder service to fetch the next job.

**Endpoint:** `GET /api/videos/jobs/next`

**Auth Required:** Transcoder auth token

**Success Response:** `200 OK`

```typescript
{
  id: number;
  key: string;
  userId: string;
  title: string | null;
  description: string | null;
  visibility: "hidden" | "link-only" | "public" | null;
} | null
```

**Error Responses:**

- `401 Unauthorized` - Invalid transcoder token

---

### Complete Transcoding Job (Transcoder Only)

Mark a transcoding job as complete.

**Endpoint:** `POST /api/videos/jobs/complete`

**Auth Required:** Transcoder auth token

**Request Body:**

```typescript
{
  jobId: number;
  finalKey: string;
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
}
```

**Success Response:** `200 OK`

```typescript
{
	message: string;
	video: {
		id: string;
		title: string;
		// ... video object
	}
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid transcoder token
- `404 Not Found` - Job not found

---

### Fail Transcoding Job (Transcoder Only)

Mark a transcoding job as failed.

**Endpoint:** `POST /api/videos/jobs/fail`

**Auth Required:** Transcoder auth token

**Request Body:**

```typescript
{
  jobId: number;
  error?: string;
}
```

**Success Response:** `200 OK`

```typescript
{
	message: string;
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid transcoder token
- `404 Not Found` - Job not found

---

## Comments

### Create Comment

Post a comment on a video.

**Endpoint:** `POST /api/comments/:videoId`

**Auth Required:** Yes

**URL Parameters:**

- `videoId`: Video UUID

**Request Body:**

```typescript
{
	text: string; // 1-5000 characters
}
```

**Example Request:**

```json
{
	"text": "Great video! Very helpful tutorial."
}
```

**Success Response:** `201 Created`

```typescript
{
	id: string; // UUID
	userId: string;
	videoId: string;
	text: string;
	date: string; // ISO date
	user: {
		id: string;
		name: string;
		email: string;
		photoUrl: string | null;
	}
}
```

**Error Responses:**

- `400 Bad Request` - Validation error (text too short/long)
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Video not found

---

### Get Video Comments

Retrieve all comments for a video with pagination.

**Endpoint:** `GET /api/comments/:videoId`

**Auth Required:** Optional

**URL Parameters:**

- `videoId`: Video UUID

**Query Parameters:**

```typescript
{
  page?: number;                  // Page number (default: 1)
  pageSize?: number;              // Results per page (1-100, default: 20)
  sortOrder?: "asc" | "desc";     // Sort by date (default: "desc")
}
```

**Example Request:**

```
GET /api/comments/550e8400-e29b-41d4-a716-446655440000?page=1&pageSize=10&sortOrder=desc
```

**Success Response:** `200 OK`

```typescript
{
	comments: Array<{
		id: string;
		userId: string;
		videoId: string;
		text: string;
		date: string;
		user: {
			id: string;
			name: string;
			email: string;
			photoUrl: string | null;
		};
	}>;
	pagination: {
		page: number;
		pageSize: number;
		totalResults: number;
		totalPages: number;
	}
}
```

**Error Responses:**

- `400 Bad Request` - Invalid query parameters
- `404 Not Found` - Video not found

---

### Get Comment Count

Get the total number of comments on a video.

**Endpoint:** `GET /api/comments/:videoId/count`

**Auth Required:** Optional

**URL Parameters:**

- `videoId`: Video UUID

**Success Response:** `200 OK`

```typescript
{
	count: number;
}
```

**Example Response:**

```json
{
	"count": 42
}
```

**Error Responses:**

- `404 Not Found` - Video not found

---

### Get Single Comment

Retrieve a specific comment by ID.

**Endpoint:** `GET /api/comments/comment/:commentId`

**Auth Required:** Optional

**URL Parameters:**

- `commentId`: Comment UUID

**Success Response:** `200 OK`

```typescript
{
	id: string;
	userId: string;
	videoId: string;
	text: string;
	date: string;
	user: {
		id: string;
		name: string;
		email: string;
		photoUrl: string | null;
	}
}
```

**Error Responses:**

- `404 Not Found` - Comment not found

---

### Update Comment

Update a comment (owner only).

**Endpoint:** `PUT /api/comments/comment/:commentId`

**Auth Required:** Yes (must be comment owner)

**URL Parameters:**

- `commentId`: Comment UUID

**Request Body:**

```typescript
{
	text: string; // 1-5000 characters
}
```

**Example Request:**

```json
{
	"text": "Great video! Very helpful tutorial. Edit: Added more info."
}
```

**Success Response:** `200 OK`

```typescript
{
	id: string;
	userId: string;
	videoId: string;
	text: string;
	date: string;
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Not the comment owner
- `404 Not Found` - Comment not found

---

### Delete Comment

Delete a comment (owner only).

**Endpoint:** `DELETE /api/comments/comment/:commentId`

**Auth Required:** Yes (must be comment owner)

**URL Parameters:**

- `commentId`: Comment UUID

**Success Response:** `200 OK`

```typescript
{
	message: string; // "Comment deleted successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Not the comment owner
- `404 Not Found` - Comment not found

---

## Likes

### Toggle Like/Dislike

Add or update a like/dislike on a video.

**Endpoint:** `POST /api/likes/:videoId`

**Auth Required:** Yes

**URL Parameters:**

- `videoId`: Video UUID

**Request Body:**

```typescript
{
	type: "like" | "dislike";
}
```

**Example Request:**

```json
{
	"type": "like"
}
```

**Behavior:**

- If no reaction exists: Creates new like/dislike
- If same reaction exists: No change
- If opposite reaction exists: Updates to new type

**Success Response:** `200 OK`

```typescript
{
	id: string; // UUID
	userId: string;
	videoId: string;
	type: "like" | "dislike";
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Video not found

---

### Get User's Like Status

Check the current user's like/dislike status for a video.

**Endpoint:** `GET /api/likes/:videoId/status`

**Auth Required:** Yes

**URL Parameters:**

- `videoId`: Video UUID

**Success Response:** `200 OK`

```typescript
{
	status: "like" | "dislike" | "none";
}
```

**Example Response:**

```json
{
	"status": "like"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Video not found

---

### Get Video Like Counts

Get like and dislike counts for a video.

**Endpoint:** `GET /api/likes/:videoId/counts`

**Auth Required:** Optional

**URL Parameters:**

- `videoId`: Video UUID

**Success Response:** `200 OK`

```typescript
{
	likes: number;
	dislikes: number;
}
```

**Example Response:**

```json
{
	"likes": 1234,
	"dislikes": 56
}
```

**Error Responses:**

- `404 Not Found` - Video not found

---

### Remove Like/Dislike

Remove your reaction from a video.

**Endpoint:** `DELETE /api/likes/:videoId`

**Auth Required:** Yes

**URL Parameters:**

- `videoId`: Video UUID

**Success Response:** `200 OK`

```typescript
{
	message: string; // "Like removed successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - Video or like not found

---

## Error Responses

All errors follow a consistent format:

### Standard Error Format

```typescript
{
  message: string;      // Human-readable error message
  code?: number;        // HTTP status code
}
```

### Common HTTP Status Codes

| Code  | Meaning               | Description                                        |
| ----- | --------------------- | -------------------------------------------------- |
| `400` | Bad Request           | Invalid request data or validation error           |
| `401` | Unauthorized          | Missing or invalid authentication token            |
| `403` | Forbidden             | Authenticated but not authorized for this resource |
| `404` | Not Found             | Resource does not exist                            |
| `409` | Conflict              | Resource conflict (e.g., duplicate email)          |
| `413` | Payload Too Large     | File upload exceeds size limit                     |
| `429` | Too Many Requests     | Rate limit exceeded                                |
| `500` | Internal Server Error | Server-side error                                  |

### Validation Errors (Zod)

When validation fails, the response includes detailed field errors:

```typescript
{
	message: string;
	errors: Array<{
		path: string[]; // Field path
		message: string; // Error message
	}>;
}
```

**Example Validation Error:**

```json
{
	"message": "Validation error",
	"errors": [
		{
			"path": ["email"],
			"message": "Invalid email"
		},
		{
			"path": ["password"],
			"message": "String must contain at least 8 character(s)"
		}
	]
}
```

---

## Data Types Reference

### User Object

```typescript
{
	id: string; // UUID
	name: string;
	email: string; // Lowercase normalized
	photoUrl: string | null; // S3 URL or null
}
```

### Video Object

```typescript
{
	id: string; // UUID
	userId: string; // Owner UUID
	title: string;
	description: string;
	visibility: "hidden" | "link-only" | "public";
	likeCount: number;
	dislikeCount: number;
	date: string; // ISO date string
	videoLength: number; // Duration in seconds
	video: string; // S3 key
}
```

### Comment Object

```typescript
{
	id: string; // UUID
	userId: string; // Author UUID
	videoId: string; // Video UUID
	text: string; // 1-5000 characters
	date: string; // ISO date string
}
```

### Like Object

```typescript
{
	id: string; // UUID
	userId: string; // User UUID
	videoId: string; // Video UUID
	type: "like" | "dislike";
}
```

### Pending Upload Object

```typescript
{
	id: number; // Serial ID
	userId: string; // UUID
	key: string; // S3 upload key
	filename: string | null;
	contentType: string | null; // MIME type
	title: string | null;
	description: string | null;
	visibility: "hidden" | "link-only" | "public" | null;
	createdAt: string; // ISO timestamp
	expiresAt: string; // ISO timestamp
	status: "initiated" | "uploaded" | "processing" | "done" | "failed";
}
```

---

## Rate Limits & Restrictions

### Upload Limits

- **Max concurrent pending uploads per user:** 2
- **Upload expiry:** 30 minutes after initiation
- **Max video file size:** 2GB (2000 MB)
- **Max photo file size:** 5MB

### Pagination Limits

- **Default page size:** 20
- **Max page size:** 100
- **Min page number:** 1

### Content Limits

- **Comment text:** 1-5000 characters
- **User name:** min 1 character
- **Password:** min 8 characters
- **Video title:** min 1 character
- **Video description:** min 1 character

---

## Video Visibility Levels

| Level       | Description         | Access                              |
| ----------- | ------------------- | ----------------------------------- |
| `public`    | Visible to everyone | Listed in search, accessible to all |
| `link-only` | Hidden from search  | Only accessible via direct link     |
| `hidden`    | Private             | Only accessible to owner            |

---

## Presigned Upload Flow

### Complete Upload Process

1. **Initiate Upload**

   ```
   POST /api/videos/initiate
   {
     "title": "My Video",
     "description": "Description",
     "visibility": "public",
     "filename": "video.mp4",
     "contentType": "video/mp4"
   }
   ```

2. **Upload to S3**
   Use the returned presigned POST data:

   ```javascript
   const formData = new FormData();
   // Add all fields from response
   Object.entries(response.upload.fields).forEach(([key, value]) => {
   	formData.append(key, value);
   });
   // Add the video file last
   formData.append("file", videoFile);

   // POST to the presigned URL
   await fetch(response.upload.url, {
   	method: "POST",
   	body: formData,
   });
   ```

3. **Complete Upload**

   ```
   POST /api/videos/complete
   {
     "key": "uploads/user-id/video-id.mp4"
   }
   ```

4. **Check Status**
   ```
   GET /api/videos/pending
   ```
   Monitor the `status` field for processing progress.

---

## Environment Variables

Required environment variables for the API:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT Authentication
JWT_SECRET=your-secret-key-here

# S3/Object Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_UPLOADS_BUCKET=your-uploads-bucket
S3_VIDEOS_BUCKET=your-videos-bucket

# Transcoder (optional)
TRANSCODER_SECRET=transcoder-auth-token

# Server
PORT=3000  # Optional, defaults to 3000
```

---

## Notes

### Authentication

- `auth()` - Requires valid JWT token
- `auth(true)` - Optional authentication (endpoint works with or without token)
- Owner-only endpoints check that `req.user.id === resource.userId`

### Date Format

All dates are returned as ISO 8601 strings:

```
2025-12-03T10:30:00.000Z
```

### UUIDs

All entity IDs use UUID v4 format:

```
550e8400-e29b-41d4-a716-446655440000
```

### S3 Keys

Videos are stored with keys in the format:

- Uploads: `uploads/{userId}/{uuid}.{ext}`
- Processed: `videos/processed/{uuid}.m3u8` (HLS format)

---

## Support

For issues or questions:

- Check the error message in the response
- Verify authentication token is valid
- Ensure request body matches schema requirements
- Check that resource IDs are valid UUIDs

---

**Last Updated:** December 3, 2025  
**API Version:** 1.0.0
