import time
import pytest
from bson import ObjectId

from backend.db.models import user as user_crud


class FakeSearchCollection:
    def __init__(self, docs):
        self._docs = list(docs)

    def find(self, filter_, projection):
        def matches(doc):
            if not filter_:
                return True
            conds = filter_.get("$or") or []
            for cond in conds:
                for field, spec in cond.items():
                    value = str(doc.get(field, ""))
                    pattern = spec.get("$regex", "")
                    options = spec.get("$options", "")
                    if "i" in options:
                        if pattern.lower() in value.lower():
                            return True
                    else:
                        if pattern in value:
                            return True
            return False

        filtered = [d for d in self._docs if matches(d)]

        class Cursor:
            def __init__(self, docs):
                self._docs = docs
                self._limit = None

            def limit(self, n: int):
                self._limit = n
                return self

            async def __aiter__(self):
                docs = self._docs if self._limit is None else self._docs[: self._limit]
                for doc in docs:
                    out = {}
                    for key, include in projection.items():
                        if include and key in doc:
                            out[key] = doc[key]
                    if "_id" in doc:
                        out["_id"] = doc["_id"]
                    yield out

        return Cursor(filtered)


@pytest.fixture
def fake_search_col_perf(monkeypatch):
    docs = []
    for i in range(2000):
        docs.append(
            {
                "_id": ObjectId(),
                "name": f"Usuario {i}",
                "username": f"user{i}",
                "email": f"user{i}@example.com",
                "avatar_url": None,
            }
        )
    # Sembrar coincidencias claras para la búsqueda "juan"
    for i in range(0, 2000, 100):
        docs[i]["name"] = f"Juan Perez {i}"
        docs[i]["username"] = f"juan{i}"

    col = FakeSearchCollection(docs)
    monkeypatch.setattr(user_crud, "USERS_COL", col, raising=True)
    return col


@pytest.mark.anyio
async def test_search_users_performance_large_dataset(fake_search_col_perf):
    start = time.perf_counter()
    results = await user_crud.search_users("juan", limit=20)
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert elapsed_ms < 80, f"Búsqueda lenta: {elapsed_ms:.2f} ms"
    assert len(results) <= 20
    assert any("juan" in u["username"].lower() or "juan" in u["name"].lower() for u in results)
