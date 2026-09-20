import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from data.seed_data import seed_database

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database()

def test_chatbot_suggestions():
    res = client.get("/api/v1/chatbot/suggestions")
    assert res.status_code == 200
    data = res.json()
    assert "suggestions" in data
    assert len(data["suggestions"]) >= 4

def test_chatbot_system_summary():
    res = client.get("/api/v1/chatbot/system-summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_defects" in data
    assert "p0_critical_emergencies" in data

def test_chatbot_chat_flow():
    res = client.post("/api/v1/chatbot/chat", json={
        "message": "Show critical P0 defects in the network",
        "history": []
    })
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert len(data["reply"]) > 10

def test_chatbot_optimization_query():
    res = client.post("/api/v1/chatbot/chat", json={
        "message": "Run CP-SAT optimization for tomorrow",
        "history": []
    })
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
