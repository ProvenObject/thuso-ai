"""Sign language catalog + the user's chosen dialect.

GET /api/languages returns a static list for now. POST /api/user/language
just acknowledges the choice — nothing is persisted yet.
"""

from fastapi import APIRouter

from app.schemas import Language, SetUserLanguageRequest, SetUserLanguageResponse

router = APIRouter(tags=["languages"])

# PLACEHOLDER: replace with a real catalog (database table or config file)
# once more dialects/regions are supported.
LANGUAGES: list[Language] = [
    Language(code="ASL", name="American Sign Language", region="United States", flag="🇺🇸"),
    Language(code="BSL", name="British Sign Language", region="United Kingdom", flag="🇬🇧"),
    Language(code="AUSLAN", name="Auslan", region="Australia", flag="🇦🇺"),
    Language(code="LSF", name="Langue des Signes Française", region="France", flag="🇫🇷"),
    Language(code="DGS", name="German Sign Language", region="Germany", flag="🇩🇪"),
    Language(code="JSL", name="Japanese Sign Language", region="Japan", flag="🇯🇵"),
    Language(code="ISL", name="Irish Sign Language", region="Ireland", flag="🇮🇪"),
    Language(code="LSE", name="Spanish Sign Language", region="Spain", flag="🇪🇸"),
]


@router.get("/api/languages", response_model=list[Language])
def get_languages() -> list[Language]:
    return LANGUAGES


@router.post("/api/user/language", response_model=SetUserLanguageResponse)
def set_user_language(payload: SetUserLanguageRequest) -> SetUserLanguageResponse:
    # PLACEHOLDER: persist this against the authenticated user once auth
    # and a user store exist.
    return SetUserLanguageResponse(ok=True, language_code=payload.language_code)
