from fastapi import APIRouter, HTTPException, status, Response, Request, Depends
from backend.db.models import user as user_crud
from backend.db.schemas.user import LogIn, TokenOut, UserPublic
from backend.core.security import verify_password, create_access_token, create_refresh_token, decode_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE = {"httponly": True, "samesite": "lax"}

@router.post("/login", response_model=TokenOut)
async def login(payload: LogIn, response: Response):
    '''
    Autentica al usuario, creat tokens y los guarda en cookies
    '''
    user = await user_crud.get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    access = create_access_token(user["email"])
    refresh = create_refresh_token(user["email"])
    response.set_cookie("access_token", access, max_age=60*30, **COOKIE)
    response.set_cookie("refresh_token", refresh, max_age=60*60*24*7, **COOKIE)
    return TokenOut(access_token=access, refresh_token=refresh)

@router.get("/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    '''
    Devuelve los datos del usuario autenticado
    '''
    return{
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "username": current_user.get("username"),
        "is_active": current_user["is_active"],
    }

@router.post("/refresh", response_model=TokenOut)
async def refresh(request: Request, response: Response):
    '''
    Renueva el acces token usando el refresh token
    '''
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No hay refresh token")
    data = decode_token(token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token inválido")
    new_access = create_access_token(data["sub"])
    response.set_cookie("access_token", new_access, max_age=60*30, **COOKIE)
    return TokenOut(access_token=new_access, refresh_token=token)

@router.post("/logout", status_code=204)
async def logout(response: Response):
    '''
    Elimina las cookies de la sessión
    '''
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return Response(status_code=204)