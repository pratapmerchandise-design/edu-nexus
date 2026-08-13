import sys
from fastapi.testclient import TestClient
from backend.app.main import app

def run_tests():
    print("--- Testing Edu Nexus API Endpoints ---")
    with TestClient(app) as client:
        # 1. Health check
        res = client.get("/")
        assert res.status_code == 200, f"Root endpoint failed: {res.text}"
        print("1. Root API Status: OK")

        # 2. Login demo student
        res = client.post("/api/auth/login", json={"email_or_username": "aarav", "password": "password123"})
        assert res.status_code == 200, f"Login failed: {res.text}"
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("2. Demo Student Login: OK")

        # 3. Get /auth/me
        res = client.get("/api/auth/me", headers=headers)
        assert res.status_code == 200, f"Get me failed: {res.text}"
        print("3. Authenticated /auth/me: OK")

        # 4. Create Post (COLLAB)
        res = client.post("/api/posts", json={
            "title": "Building Quantum Simulation Pipeline",
            "content": "Looking for python & physics collaborators interested in quantum error correction.",
            "post_type": "COLLAB"
        }, headers=headers)
        assert res.status_code == 200, f"Create post failed: {res.text}"
        post_id = res.json()["id"]
        print("4. Create Post: OK")

        # 5. Like Post
        res = client.post(f"/api/posts/{post_id}/like", headers=headers)
        assert res.status_code == 200, f"Like post failed: {res.text}"
        print("5. Toggle Like: OK")

        # 6. Add Comment
        res = client.post(f"/api/posts/{post_id}/comments", json={"content": "Count me in for this research!"}, headers=headers)
        assert res.status_code == 200, f"Add comment failed: {res.text}"
        print("6. Add Comment: OK")

        # 7. Discover Students
        res = client.get("/api/discover/students?query=aarav", headers=headers)
        assert res.status_code == 200, f"Discover students failed: {res.text}"
        print("7. Discover Students: OK")

        # 8. Opportunities
        res = client.get("/api/opportunities", headers=headers)
        assert res.status_code == 200, f"Opportunities list failed: {res.text}"
        opp_id = res.json()[0]["id"]
        print("8. Get Opportunities: OK")

        # 9. Bookmark Opportunity
        res = client.post(f"/api/opportunities/{opp_id}/bookmark", headers=headers)
        assert res.status_code == 200, f"Bookmark opp failed: {res.text}"
        print("9. Bookmark Opportunity: OK")

        # 10. Forums
        res = client.get("/api/forums/categories", headers=headers)
        assert res.status_code == 200, f"Forum categories failed: {res.text}"
        cat_id = res.json()[0]["id"]

        res = client.post("/api/forums/threads", json={
            "category_id": cat_id,
            "title": "How to prepare for ISEF 2027?",
            "content": "Any advice on literature review and methodology for science fair?",
            "is_anonymous": True
        }, headers=headers)
        assert res.status_code == 200, f"Create forum thread failed: {res.text}"
        print("10. Forums & Anonymous Thread Creation: OK")

        # 11. Notifications
        res = client.get("/api/notifications", headers=headers)
        assert res.status_code == 200, f"Notifications failed: {res.text}"
        print("11. Get Notifications: OK")

        # 12. Admin Login & Authorization
        res = client.post("/api/auth/login", json={"email_or_username": "admin", "password": "admin123"})
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        admin_token = res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        res = client.get("/api/admin/users", headers=admin_headers)
        assert res.status_code == 200, f"Admin users failed: {res.text}"
        print("12. Admin Protected Routes: OK")

        print("\nALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
