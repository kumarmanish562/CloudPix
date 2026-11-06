# CloudPix API testing guide

This guide covers the REST endpoints exposed by the backend controllers and how to exercise them in Postman. It does not claim that each request has been executed.

## Swagger UI and OpenAPI

With the backend running, open:

- Swagger UI: <http://localhost:8080/swagger-ui/index.html>
- OpenAPI JSON: <http://localhost:8080/v3/api-docs>

Swagger UI's **Authorize** button accepts a JWT access token. Paste the token value; Swagger sends it as a Bearer token. The docs routes are permitted without authentication. The first startup after adding the dependency needs Maven to download springdoc.

## Postman setup

Create a Postman environment with:

| Variable | Initial value |
|---|---|
| `baseUrl` | `http://localhost:8080` |
| `token` | blank |
| `refreshToken` | blank |
| `photoId` | blank |
| `albumId` | blank |
| `shareToken` | blank |
| `shareId` | blank |

For protected calls, set **Authorization → Bearer Token** to `{{token}}`. Set `Content-Type: application/json` for JSON request bodies. Register or log in, then copy `accessToken` and `refreshToken` from the response into the environment. (For convenience, a Postman Tests script can do this: `const d=pm.response.json(); pm.environment.set('token',d.accessToken); pm.environment.set('refreshToken',d.refreshToken);`.)

Success status codes below are the controller's expected success responses. Error responses can include `400` invalid input, `401` missing/invalid authentication, `404` missing resource, and `409` conflicts; exact error bodies depend on the exception handler.

## Authentication

| Method and path | Auth | Success | Example body |
|---|---|---:|---|
| `POST /api/auth/register` | No | `201` | `{"email":"tester@example.com","password":"ChangeMe123!","displayName":"Postman Tester"}` |
| `POST /api/auth/login` | No | `200` | `{"email":"tester@example.com","password":"ChangeMe123!"}` |
| `POST /api/auth/refresh` | No | `200` | `{"refreshToken":"{{refreshToken}}"}` |
| `POST /api/auth/logout` | No | `204` | `{"refreshToken":"{{refreshToken}}"}` (body optional) |
| `GET /api/auth/me` | Yes | `200` | — |

## Photos

All routes here require Bearer auth unless stated otherwise.

| Method and path | Success | Example / notes |
|---|---:|---|
| `GET /api/photos` | `200` | Query: `status=ACTIVE&page=0&size=24&q=&tag=&favorite=true&mimeType=image/jpeg&sort=newest`; optional filters may be omitted. |
| `GET /api/photos/{id}` | `200` | Set `{id}` to a UUID saved as `photoId`. |
| `POST /api/photos/upload` | `201` | Postman Body → form-data; key `file` (type File). Optional query `allowDuplicate=false`. |
| `POST /api/photos` | `201` | `{"imagekitFileId":"file-id","fileName":"photo.jpg","url":"https://ik.imagekit.io/...","thumbnailUrl":"https://ik.imagekit.io/...","mimeType":"image/jpeg","sizeBytes":12345,"width":800,"height":600}` |
| `PATCH /api/photos/{id}` | `200` | `{"favorite":true,"tags":["holiday","family"]}` (either field can be updated). |
| `GET /api/photos/tags` | `200` | — |
| `GET /api/photos/duplicates?page=0&size=24` | `200` | — |
| `GET /api/photos/memories?date=2025-11-06&page=0&size=24` | `200` | Date is optional; defaults to current UTC date. |
| `POST /api/photos/archive` | `204` | `{"photoIds":["{{photoId}}"]}` |
| `POST /api/photos/trash` | `204` | `{"photoIds":["{{photoId}}"]}` |
| `POST /api/photos/restore` | `204` | `{"photoIds":["{{photoId}}"]}` |
| `POST /api/photos/delete-permanent` | `204` | `{"photoIds":["{{photoId}}"]}` — permanently deletes photos. |
| `DELETE /api/photos/{id}` | `204` | Permanently deletes one photo. |
| `GET /api/photos/{id}/download` | `200` | Returns image bytes; use **Send and Download** in Postman. |

## Albums and sharing

| Method and path | Auth | Success | Example / notes |
|---|---|---:|---|
| `GET /api/albums` | Yes | `200` | List your albums. |
| `POST /api/albums` | Yes | `201` | `{"title":"Postman Test Album"}`; save response ID as `albumId`. |
| `GET /api/albums/{id}` | Yes | `200` | Use `{{albumId}}`. |
| `GET /api/albums/{id}/photos?page=0&size=24` | Yes | `200` | Lists album photos. |
| `PATCH /api/albums/{id}` | Yes | `200` | `{"title":"Updated album title","coverPhotoId":"{{photoId}}"}`; fields may be omitted. |
| `DELETE /api/albums/{id}` | Yes | `204` | Deletes album. |
| `POST /api/albums/{id}/photos` | Yes | `204` | `{"photoIds":["{{photoId}}"]}` |
| `DELETE /api/albums/{id}/photos/{photoId}` | Yes | `204` | Removes photo from album. |
| `POST /api/albums/{id}/shares` | Yes | `201` | `{"expiresInHours":24}`; save returned share token/ID. |
| `GET /api/albums/{id}/shares` | Yes | `200` | List album shares. |
| `DELETE /api/albums/{id}/shares/{shareId}` | Yes | `204` | Revoke share. |
| `GET /api/shared/{token}?page=0&size=24` | No | `200` | Public shared album view. |
| `GET /api/shared/{token}/photos/{photoId}?thumbnail=false` | No | `200` | Returns image bytes. |
| `GET /api/albums/{id}/download` | Yes | `200` | Returns archive bytes; use **Send and Download**. |

## Library and AI transforms

| Method and path | Auth | Success | Example body / notes |
|---|---|---:|---|
| `GET /api/library/storage` | Yes | `200` | Storage usage. |
| `GET /api/library/imagekit-assets` | Yes | `200` | Lists importable ImageKit assets. |
| `POST /api/library/import` | Yes | `200` | `{"imagekitFileIds":["file-id-1","file-id-2"]}` |
| `POST /api/photos/{photoId}/ai/preview` | Yes | `200` | `{"type":"REMOVE_BACKGROUND","prompt":"","width":null,"height":null,"focusObject":""}`. Use an enum value: `REMOVE_BACKGROUND`, `BACKGROUND_AND_SHADOW`, `CHANGE_BACKGROUND`, `GENERATIVE_FILL`, `SMART_CROP`, `OBJECT_CROP`, `RETOUCH`, `UPSCALE`, `AI_EDIT`. |
| `POST /api/photos/{photoId}/ai/apply` | Yes | `200` | Same body as preview; applies the transform. |

AI transform endpoints may require working ImageKit/AI service credentials. Validate effects with a test photo.

## Suggested Postman test scripts

Add a status assertion in the **Scripts → Post-response** tab for each request, using the status shown above. For example, for a `201 Created` endpoint:

```javascript
pm.test("returns 201 Created", function () {
  pm.response.to.have.status(201);
});
```

For JSON responses, also check the content type:

```javascript
pm.test("returns JSON", function () {
  pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});
```

Run requests in a safe order: register/login → list photos or upload a test photo → create album → add photo to album → create share → inspect share. Deletion and AI apply requests can alter data; use disposable test records. Do not store real credentials or production tokens in a shared Postman collection.
