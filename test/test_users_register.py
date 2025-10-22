import pytest

@pytest.mark.asyncio
async def test_register_creates_user(client):
    ac, fake_db = client
    payload = {"email": "newuser@example.com", "username": "newuser", "password": "proba1234"}

    r = await ac.post("/users", json=payload)
    assert r.status_code == 201
    body = r.json()

    assert body["email"] == "newuser@example.com"
    assert body["username"] == "newuser"
    assert body["is_active"] is True
    assert "id" in body

    assert "hashed_password" not in body
    assert "password" not in body

    user = await fake_db.users.find_one({"email": "newuser@example.com"})
    assert user is not None
    assert user["email"] == "newuser@example.com"
    assert user["hashed_password"].startswith("fakehash:")

@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    ac, fake_db = client

    await fake_db.users.insert_one({
        "email": "dup@example.com",
        "username": "dupuser",
        "hashed_password": "fakehash:xxx",
        "is_active": True,
    })

    payload = {"email": "dup@example.com", "username": "other", "password": "123456"}
    r = await ac.post("/users", json=payload)

    assert r.status_code == 409
    assert r.json()["detail"] == "Email ya registrado"

@pytest.mark.asyncio
async def test_register_invalid_input(client):
    ac, _ = client
    bad = {"email": "notanemail", "username": "xx", "password": "1"} 
    r = await ac.post("/users", json=bad)
    assert r.status_code == 422
