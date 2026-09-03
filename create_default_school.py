from backend.app.database import SessionLocal
from backend.app.models import User, School, SchoolMember
db = SessionLocal()
admin_user = db.query(User).filter(User.role == 'admin').first()
if admin_user:
    print(f"Admin found: {admin_user.email}")
    school = db.query(School).first()
    if not school:
        school = School(name='Delhi Public School', description='Official hub for DPSR students and clubs.')
        db.add(school)
        db.commit()
        db.refresh(school)
        print("School created")
    
    member = db.query(SchoolMember).filter(SchoolMember.user_id == admin_user.id).first()
    if not member:
        member = SchoolMember(school_id=school.id, user_id=admin_user.id, role='admin')
        db.add(member)
        db.commit()
        print("Admin added to school")
else:
    print("No admin user found")
