from supabase import create_client, Client
from config import settings


def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def get_supabase_admin() -> Client:
    """Service-role client — bypasses RLS. Use only in trusted server code."""
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    return create_client(settings.SUPABASE_URL, key)


# Module-level singletons
supabase: Client = get_supabase()
supabase_admin: Client = get_supabase_admin()
