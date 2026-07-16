from fastapi import HTTPException, status
from supabase import Client


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
