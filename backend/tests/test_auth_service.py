import pytest
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from application.services.auth_service import AuthService
from domain.entities.user import User
from domain.repositories.user_repository import UserRepository


@pytest.fixture
def mock_user_repository():
    repo = MagicMock(spec=UserRepository)
    repo.create = AsyncMock()
    repo.get_by_email = AsyncMock()
    repo.get_by_id = AsyncMock()
    return repo


@pytest.fixture
def auth_service(mock_user_repository):
    return AuthService(
        user_repository=mock_user_repository,
        secret_key="test-secret-key",
        algorithm="HS256",
        access_token_expire_minutes=30,
        refresh_token_expire_days=7,
    )


@pytest.mark.asyncio
async def test_register_user_success(auth_service, mock_user_repository):
    mock_user_repository.get_by_email = AsyncMock(return_value=None)
    
    test_user = User(
        email="test@example.com",
        hashed_password="hashed_password",
        full_name="Test User",
    )
    mock_user_repository.create = AsyncMock(return_value=test_user)

    user = await auth_service.register_user("test@example.com", "password123", "Test User")

    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    mock_user_repository.create.assert_called_once()


@pytest.mark.asyncio
async def test_register_user_duplicate_email(auth_service, mock_user_repository):
    existing_user = User(
        email="test@example.com",
        hashed_password="hashed",
    )
    mock_user_repository.get_by_email = AsyncMock(return_value=existing_user)

    with pytest.raises(ValueError, match="Email already registered"):
        await auth_service.register_user("test@example.com", "password123")


@pytest.mark.asyncio
async def test_authenticate_user_success(auth_service, mock_user_repository):
    hashed_password = auth_service.hash_password("password123")
    test_user = User(
        email="test@example.com",
        hashed_password=hashed_password,
        is_active=True,
    )
    mock_user_repository.get_by_email = AsyncMock(return_value=test_user)

    user = await auth_service.authenticate_user("test@example.com", "password123")

    assert user is not None
    assert user.email == "test@example.com"


@pytest.mark.asyncio
async def test_authenticate_user_wrong_password(auth_service, mock_user_repository):
    hashed_password = auth_service.hash_password("password123")
    test_user = User(
        email="test@example.com",
        hashed_password=hashed_password,
        is_active=True,
    )
    mock_user_repository.get_by_email = AsyncMock(return_value=test_user)

    user = await auth_service.authenticate_user("test@example.com", "wrong_password")

    assert user is None


@pytest.mark.asyncio
async def test_authenticate_user_not_found(auth_service, mock_user_repository):
    mock_user_repository.get_by_email = AsyncMock(return_value=None)

    user = await auth_service.authenticate_user("nonexistent@example.com", "password123")

    assert user is None


def test_create_access_token(auth_service):
    user_id = uuid4()
    email = "test@example.com"

    token = auth_service.create_access_token(user_id, email)

    assert token is not None
    assert isinstance(token, str)


def test_create_refresh_token(auth_service):
    user_id = uuid4()
    email = "test@example.com"

    token = auth_service.create_refresh_token(user_id, email)

    assert token is not None
    assert isinstance(token, str)


def test_verify_token_valid(auth_service):
    user_id = uuid4()
    email = "test@example.com"
    token = auth_service.create_access_token(user_id, email)

    payload = auth_service.verify_token(token, "access")

    assert payload is not None
    assert payload["email"] == email
    assert payload["type"] == "access"


def test_verify_token_wrong_type(auth_service):
    user_id = uuid4()
    email = "test@example.com"
    token = auth_service.create_access_token(user_id, email)

    payload = auth_service.verify_token(token, "refresh")

    assert payload is None


def test_verify_token_invalid(auth_service):
    payload = auth_service.verify_token("invalid_token", "access")

    assert payload is None


def test_hash_and_verify_password(auth_service):
    password = "test_password_123"
    hashed = auth_service.hash_password(password)

    assert hashed != password
    assert auth_service.verify_password(password, hashed)
    assert not auth_service.verify_password("wrong_password", hashed)
