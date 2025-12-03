# Video Search API

## Endpoint

`GET /api/videos`

## Description

Search and filter videos with pagination support. Returns public and link-only videos (hidden videos are excluded from search results).

## Authentication

Optional - If authenticated, may affect future features but currently works without auth.

## Query Parameters

| Parameter      | Type   | Required | Default | Description                                                |
| -------------- | ------ | -------- | ------- | ---------------------------------------------------------- |
| `q`            | string | No       | -       | Search query for title and description (case-insensitive)  |
| `uploaderName` | string | No       | -       | Filter by uploader's name (case-insensitive partial match) |
| `minLength`    | number | No       | -       | Minimum video length in seconds                            |
| `maxLength`    | number | No       | -       | Maximum video length in seconds                            |
| `sortBy`       | enum   | No       | `date`  | Sort field: `date`, `likes`, `length`, or `title`          |
| `sortOrder`    | enum   | No       | `desc`  | Sort direction: `asc` or `desc`                            |
| `page`         | number | No       | `1`     | Page number (1-based)                                      |
| `pageSize`     | number | No       | `20`    | Items per page (max: 100)                                  |

## Response Format

```json
{
  "videos": [
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "string",
      "description": "string",
      "visibility": "public" | "link-only",
      "likeCount": 0,
      "dislikeCount": 0,
      "date": "2025-12-03",
      "videoLength": 120,
      "video": "s3-key-or-url",
      "uploaderName": "string"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

## Example Requests

### Search by title/description

```
GET /api/videos?q=tutorial&page=1&pageSize=10
```

### Filter by uploader

```
GET /api/videos?uploaderName=John
```

### Filter by video length (5-10 minutes)

```
GET /api/videos?minLength=300&maxLength=600
```

### Sort by most likes

```
GET /api/videos?sortBy=likes&sortOrder=desc
```

### Combined filters

```
GET /api/videos?q=programming&uploaderName=Jane&minLength=600&sortBy=date&sortOrder=desc&page=2&pageSize=15
```

## Notes

- All text searches (title, description, uploader name) are case-insensitive
- Video length is measured in seconds
- Hidden videos are never returned in search results
- Public and link-only videos are included in results
- Page numbers are 1-based (first page is `page=1`)
- Maximum page size is 100 items
