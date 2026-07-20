from fastapi import HTTPException, status
from supabase import Client
from config import settings


class AuthService:
    def __init__(self, client: Client):
        self.client = client

    async def register(self, email: str, password: str, full_name: str):
        try:
            response = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {"data": {"full_name": full_name}},
            })
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed. The email may already be in use.",
            )
        return response

    async def login(self, email: str, password: str):
        try:
            response = self.client.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )
        return response

    async def logout(self, access_token: str):
        try:
            # Sign out the specific session identified by the JWT.
            # Falls back to a no-op if the admin key is unavailable.
            self.client.auth.admin.sign_out(access_token)
        except Exception:
            pass  # token already expired or admin key not set — treat as success

    async def get_user(self, access_token: str):
        try:
            response = self.client.auth.get_user(access_token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return response.user

    async def google_oauth_url(self) -> str:
        try:
            response = self.client.auth.sign_in_with_oauth({
                "provider": "google",
                "options": {"redirect_to": f"{settings.FRONTEND_URL}/auth/callback"},
            })
            return response.url
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not start Google sign-in: {str(e)}")

    async def github_oauth_url(self) -> str:
        try:
            response = self.client.auth.sign_in_with_oauth({
                "provider": "github",
                "options": {"redirect_to": f"{settings.FRONTEND_URL}/auth/callback", "scopes": "repo read:user"},
            })
            return response.url
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not start GitHub sign-in: {str(e)}")

    async def update_profile(self, user_id: str, full_name: str) -> dict:
        full_name = full_name.strip()
        if not full_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full name is required.")
        self.client.table("users").update({"full_name": full_name}).eq("id", user_id).execute()
        self.client.auth.admin.update_user_by_id(user_id, {"user_metadata": {"full_name": full_name}})
        return {"full_name": full_name}

    async def upload_avatar(self, user_id: str, filename: str, content: bytes, content_type: str | None) -> str:
        if not content_type or not content_type.startswith("image/"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload an image file.")
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image must be 5 MB or smaller.")
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
        path = f"{user_id}/avatar.{extension}"
        try:
            self.client.storage.from_("avatars").upload(path, content, {"content-type": content_type, "upsert": "true"})
            url = self.client.storage.from_("avatars").get_public_url(path)
            self.client.table("users").update({"avatar_url": url}).eq("id", user_id).execute()
            self.client.auth.admin.update_user_by_id(user_id, {"user_metadata": {"avatar_url": url}})
            return url
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not upload avatar: {str(e)}")
