import os
import uuid
from typing import Tuple, Optional
from app.config import settings

def upload_thesis_file(file_bytes: bytes, filename: str) -> Tuple[str, Optional[str]]:
    """
    Save uploaded thesis file.
    If CLOUDINARY_URL is configured, uploads to Cloudinary Cloud Blob Storage and returns (local_path, cloudinary_url).
    Always retains a local path for PyMuPDF text & image parsing.
    """
    safe_filename = f"{uuid.uuid4().hex}_{filename}"
    os.makedirs("uploads", exist_ok=True)
    local_path = os.path.join("uploads", safe_filename)

    with open(local_path, "wb") as f:
        f.write(file_bytes)

    cloudinary_url = None
    cloudinary_env = getattr(settings, "CLOUDINARY_URL", "") or os.getenv("CLOUDINARY_URL", "")

    if cloudinary_env:
        try:
            import cloudinary
            import cloudinary.uploader
            cloudinary.config(cloudinary_url=cloudinary_env)
            res = cloudinary.uploader.upload(
                local_path,
                resource_type="auto",
                public_id=f"thesis_uploads/{safe_filename}",
                unique_filename=False
            )

            cloudinary_url = res.get("secure_url")
            print(f"Uploaded thesis to Cloudinary: {cloudinary_url}")
        except Exception as e:
            print(f"Cloudinary upload warning: {e}")

    return local_path, cloudinary_url
