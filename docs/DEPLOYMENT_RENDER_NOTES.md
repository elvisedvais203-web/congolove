# Render deployment variables

Ajouts pour upload direct signe Cloudinary:

- `MEDIA_PROVIDER=cloudinary`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Endpoint backend:

- `POST /media/upload/sign` (auth + csrf requis)

Exemple payload:

```json
{
  "folder": "posts",
  "resourceType": "image",
  "publicId": "optional-custom-id"
}
```

Reponse:

- `signature`, `timestamp`, `apiKey`, `cloudName`, `uploadUrl`

Le client mobile/web peut ensuite uploader directement vers Cloudinary sans faire transiter les gros fichiers via le backend.
