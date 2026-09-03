from backend.app.database import engine, Base
from backend.app.models import SchoolJoinRequest
Base.metadata.create_all(bind=engine)
print('Tables created successfully')
