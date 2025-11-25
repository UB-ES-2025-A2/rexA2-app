import pytest
from pydantic import ValidationError
from backend.db.schemas.user import (
    UserCreate,
    UserPublic,
    LogIn,
    TokenOut,
    ProfileStats,
    UserProfilePublic,
)


# ---------- Casos OK ----------

def test_user_create_ok():
    payload = {
        "email": "user@example.com",
        "username": "alice",
        "name": "Alice",
        "password": "S3guro!",
    }
    u = UserCreate(**payload)
    assert u.email == "user@example.com"
    assert u.username == "alice"
    assert u.name == "Alice"
    assert u.password == "S3guro!"

def test_user_public_ok():
    payload = {
        "email": "user@example.com",
        "username": "alice",
        "name": None,
        "id": "64fa0c8dbb5d2f0f12345678",
        "is_active": True,
    }
    up = UserPublic(**payload)
    assert up.id == "64fa0c8dbb5d2f0f12345678"
    assert up.is_active is True

def test_login_ok():
    l = LogIn(email="user@example.com", password="xxx")
    assert l.email == "user@example.com"
    assert l.password == "xxx"

def test_tokenout_defaults_bearer():
    t = TokenOut(access_token="a", refresh_token="b")
    assert t.token_type == "bearer"
    assert t.access_token == "a"
    assert t.refresh_token == "b"


# ---------- Validaciones que deben fallar ----------

def _assert_err_contains(err: ValidationError, text: str):
    joined = " | ".join([e.get("msg", "") for e in err.errors()])
    assert text in joined, f"'{text}' no encontrado en: {joined}"

def test_invalid_email():
    with pytest.raises(ValidationError) as exc:
        UserCreate(email="no-es-email", username="a", name=None, password="x")
    _assert_err_contains(exc.value, "value is not a valid email address")

def test_password_required():
    with pytest.raises(ValidationError) as exc:
        UserCreate(email="user@example.com", username="a", name=None, password=None)  # type: ignore[arg-type]
    _assert_err_contains(exc.value, "Input should be a valid string")



# ========== US-14: Perfil público (UserProfilePublic) ==========

def test_user_profile_public_exposes_only_public_fields():
    """
    UserProfilePublic debe exponer solo username, avatar_url y stats,
    sin campos sensibles como email o phone.
    """
    payload = {
        "username": "alice",
        "avatar_url": "https://example.com/avatar.png",
        "stats": {
            "routes_created": 3,
            "routes_completed": 5,
            "routes_favorites": 2,
        },
        # Campos extra que NO deberían aparecer en el output público
        "email": "alice@example.com",
        "phone": "+34...",
    }

    profile = UserProfilePublic(**payload)
    data = profile.model_dump()

    assert data["username"] == "alice"
    assert data["avatar_url"] == "https://example.com/avatar.png"
    assert isinstance(profile.stats, ProfileStats)

    # No queremos que se filtren datos sensibles en el perfil público:
    assert "email" not in data
    assert "phone" not in data


def test_user_profile_public_requires_username_and_stats():
    """
    UserProfilePublic necesita username y stats. Sin ellos debe fallar la validación.
    """
    # Falta username
    with pytest.raises(ValidationError):
        UserProfilePublic(
            avatar_url=None,
            stats={"routes_created": 0, "routes_completed": 0, "routes_favorites": 0},
        )

    # Falta stats
    with pytest.raises(ValidationError):
        UserProfilePublic(username="alice")  # type: ignore[call-arg]


def test_user_profile_public_accepts_stats_object():
    """
    Permite pasar un ProfileStats ya construido.
    """
    stats = ProfileStats(routes_created=1, routes_completed=2, routes_favorites=3)
    profile = UserProfilePublic(username="bob", avatar_url=None, stats=stats)

    data = profile.model_dump()
    assert data["username"] == "bob"
    assert data["stats"]["routes_created"] == 1
    assert data["stats"]["routes_completed"] == 2
    assert data["stats"]["routes_favorites"] == 3
