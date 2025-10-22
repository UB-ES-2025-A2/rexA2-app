import pytest

async def _attempt_login(ac, identifier: str, password: str):
    """
    Intenta loguear contra /auth/login o /login,
    primero con JSON (email/password), y si no, con form OAuth2 (username/password).
    Devuelve (response, used_path, used_mode)
      - used_path in {"/auth/login", "/login"}
      - used_mode in {"json", "form"}
    """
    # /auth/login con JSON {email,password}
    r = await ac.post("/auth/login", json={"email": identifier, "password": password})
    if r.status_code not in (404, 405):
        return r, "/auth/login", "json"

    # /login con JSON
    r = await ac.post("/login", json={"email": identifier, "password": password})
    if r.status_code not in (404, 405):
        return r, "/login", "json"

    # /auth/login con form (OAuth2PasswordRequestForm: username/password)
    r = await ac.post(
        "/auth/login",
        data={"username": identifier, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if r.status_code not in (404, 405):
        return r, "/auth/login", "form"

    # /login con form
    r = await ac.post(
        "/login",
        data={"username": identifier, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    return r, "/login", "form"


@pytest.mark.asyncio
async def test_login_ok_returns_tokens(client):
    ac, fake_db = client

    await fake_db.users.insert_one({
        "email": "user@example.com",
        "username": "user",
        "hashed_password": "fakehash:secret",  
        "is_active": True,
    })

    r, used_path, used_mode = await _attempt_login(ac, "user@example.com", "secret")
    assert r.status_code == 200, f"status={r.status_code}, path={used_path}, mode={used_mode}, body={r.text}"
    data = r.json()

    access = data.get("access_token") or data.get("access") or data.get("token")
    assert isinstance(access, str) and access, "Debe devolver un token de acceso"
    assert access.startswith("access."), f"Token inesperado: {access}"

    refresh = data.get("refresh_token") or data.get("refresh")
    if refresh is not None:
        assert isinstance(refresh, str) and refresh
        assert refresh.startswith("refresh.")

    ttype = data.get("token_type")
    if ttype is not None:
        assert ttype.lower() in ("bearer", "access")


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401_or_400(client):
    ac, fake_db = client

    await fake_db.users.insert_one({
        "email": "user2@example.com",
        "username": "user2",
        "hashed_password": "fakehash:correct",  
        "is_active": True,
    })

    r, used_path, used_mode = await _attempt_login(ac, "user2@example.com", "wrong")
    assert r.status_code in (400, 401, 403), f"status={r.status_code}, body={r.text}"
    body = r.json()
    assert "detail" in body


@pytest.mark.asyncio
async def test_login_unknown_user_returns_404_or_401(client):
    ac, _ = client

    r, used_path, used_mode = await _attempt_login(ac, "noexiste@example.com", "whatever")
    assert r.status_code in (401, 404, 400), f"status={r.status_code}, body={r.text}"
    body = r.json()
    assert "detail" in body


@pytest.mark.asyncio
async def test_login_requires_fields_422(client):
    ac, _ = client

    r = await ac.post("/auth/login", json={"email": "user@example.com"})
    if r.status_code in (404, 405):
        r = await ac.post("/login", json={"email": "user@example.com"})
    assert r.status_code in (400, 422), r.text
