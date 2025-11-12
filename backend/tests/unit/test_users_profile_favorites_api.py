# import pytest
# from fastapi import FastAPI
# from httpx import AsyncClient, ASGITransport

# from backend.routers.users_profile import router as users_profile_router
# from backend.routers import users_profile as users_profile_mod
# from backend.db.models import route as route_crud
# from backend.db.models import favorite as favorite_crud


# @pytest.fixture
# def profile_app():
 
#     app = FastAPI()
#     app.include_router(users_profile_router)

#     async def fake_current_user(_request=None):
#         return {
#             "_id": "64fa0c8dbb5d2f0f12345678",
#             "email": "me@example.com",
#             "username": "me",
#             "is_active": True,
#         }

#     app.dependency_overrides[users_profile_mod.get_current_user] = fake_current_user
#     return app


# @pytest.fixture
# async def ac_profile(profile_app):
#     transport = ASGITransport(app=profile_app)
#     async with AsyncClient(transport=transport, base_url="http://test") as client:
#         yield client


# # ----------- GET /users/me/routes/favorites -----------

# @pytest.mark.anyio
# async def test_list_my_favorite_routes_empty(ac_profile, monkeypatch):
#     #Si el usuario no tiene favoritos, el endpoint debe devolver [] y NO debe llamar a get_routes_by_ids.

#     async def fake_list_favorites(user_id: str):
#         assert user_id == "64fa0c8dbb5d2f0f12345678"
#         return []

#     async def fake_get_routes_by_ids(route_ids):
#         raise AssertionError("get_routes_by_ids no debe llamarse si no hay favoritos")

#     monkeypatch.setattr(favorite_crud, "list_favorites", fake_list_favorites, raising=True)
#     monkeypatch.setattr(route_crud, "get_routes_by_ids", fake_get_routes_by_ids, raising=True)

#     res = await ac_profile.get("/users/me/routes/favorites")
#     assert res.status_code == 200
#     assert res.json() == []


# # @pytest.mark.anyio
# # async def test_list_my_favorite_routes_ok_order_and_mapping(ac_profile, monkeypatch):

# #     async def fake_list_favorites(user_id: str):
# #         assert user_id == "64fa0c8dbb5d2f0f12345678"
# #         # Orden de favoritos
# #         return ["r1", "r2", "r3"]

# #     async def fake_get_routes_by_ids(route_ids):
# #         # El endpoint debe pasar todos los favoritos tal cual
# #         assert route_ids == ["r1", "r2", "r3"]
# #         # Devolvemos docs en otro orden y mezclando _id / id
# #         return [
# #             {
# #                 "_id": "r2",
# #                 "name": "R2",
# #                 "visibility": True,
# #                 "owner_id": "u",
# #                 "points": [{"latitude": 1, "longitude": 1}] * 3,
# #                 "description": "d2",
# #                 "category": "c2",
# #                 "created_at": "2025-01-01T00:00:00Z",
# #             },
# #             {
# #                 "id": "r1",
# #                 "name": "R1",
# #                 "visibility": True,
# #                 "owner_id": "u",
# #                 "points": [{"latitude": 1, "longitude": 1}] * 3,
# #                 "description": "d1",
# #                 "category": "c1",
# #                 "created_at": "2025-01-01T00:00:00Z",
# #             },
# #             {
# #                 "_id": "r3",
# #                 "name": "R3",
# #                 "visibility": False,
# #                 "owner_id": "u",
# #                 "points": [{"latitude": 1, "longitude": 1}] * 3,
# #                 "description": "d3",
# #                 "category": "c3",
# #                 "created_at": "2025-01-01T00:00:00Z",
# #             },
# #         ]

# #     monkeypatch.setattr(favorite_crud, "list_favorites", fake_list_favorites, raising=True)
# #     monkeypatch.setattr(route_crud, "get_routes_by_ids", fake_get_routes_by_ids, raising=True)

# #     res = await ac_profile.get("/users/me/routes/favorites")
# #     assert res.status_code == 200
# #     data = res.json()

# #     # El orden debe seguir la lista de favoritos: r1, r2, r3
# #     assert [r["id"] for r in data] == ["r1", "r2", "r3"]
# #     assert [r["name"] for r in data] == ["R1", "R2", "R3"]


# @pytest.mark.anyio
# async def test_list_my_favorite_routes_respects_skip_and_limit(ac_profile, monkeypatch):
#     """
#     Comprobar que skip y limit se aplican sobre la lista de favoritos
#     antes de llamar a get_routes_by_ids.
#     """

#     async def fake_list_favorites(user_id: str):
#         assert user_id == "64fa0c8dbb5d2f0f12345678"
#         # 5 favoritos
#         return ["r1", "r2", "r3", "r4", "r5"]

#     seen = {}

#     async def fake_get_routes_by_ids(route_ids):
#         # Guardamos qué IDs se han pedido
#         seen["route_ids"] = list(route_ids)
#         docs = []
#         for rid in route_ids:
#             docs.append(
#                 {
#                     "_id": rid,
#                     "name": f"R-{rid}",
#                     "visibility": True,
#                     "owner_id": "u",
#                     "points": [{"latitude": 1, "longitude": 1}] * 3,
#                     "description": "d",
#                     "category": "c",
#                     "created_at": "2025-01-01T00:00:00Z",
#                 }
#             )
#         return docs

#     monkeypatch.setattr(favorite_crud, "list_favorites", fake_list_favorites, raising=True)
#     monkeypatch.setattr(route_crud, "get_routes_by_ids", fake_get_routes_by_ids, raising=True)

#     # skip=1, limit=2 -> deberían salir r2 y r3
#     res = await ac_profile.get("/users/me/routes/favorites", params={"skip": 1, "limit": 2})
#     assert res.status_code == 200
#     data = res.json()

#     # Se han pedido solo r2 y r3 a get_routes_by_ids
#     assert seen["route_ids"] == ["r2", "r3"]
#     assert [r["id"] for r in data] == ["r2", "r3"]
