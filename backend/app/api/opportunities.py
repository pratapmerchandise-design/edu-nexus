from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import Opportunity, OpportunityBookmark, User
from backend.app.schemas import OpportunityCreate, OpportunityOut
from backend.app.auth.security import get_current_user, get_current_admin

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])

DEFAULT_OPPORTUNITIES = [
    {
        "title": "International Global AI Hackathon 2026",
        "description": "Compete with ambitious student builders worldwide to design autonomous agents, vision tools, and machine learning software. Over $50,000 in grand prize funding.",
        "organization": "Nexus AI Research Institute",
        "type": "Hackathon",
        "deadline": "2026-09-30",
        "location": "Online / Global",
        "is_online": True,
        "eligibility": "Students aged 15-22",
        "age_requirements": "15-22",
        "grade_requirements": "High School & Undergrad",
        "category": "Artificial Intelligence",
        "external_url": "https://hackathon.example.com",
        "tags": "AI, Hackathon, Programming, Python",
        "status": "Open"
    },
    {
        "title": "Future Builder STEM Fellowship & Scholarship",
        "description": "A prestigious fellowship for young innovators pursuing robotics, astrophysics, and computational biology. Includes $10,000 grant and mentorship.",
        "organization": "Global Science Foundation",
        "type": "Scholarships",
        "deadline": "2026-10-15",
        "location": "Boston, MA / Hybrid",
        "is_online": False,
        "eligibility": "High school seniors & university students",
        "age_requirements": "16+",
        "grade_requirements": "Grade 11+",
        "category": "STEM Research",
        "external_url": "https://scholarship.example.com",
        "tags": "Scholarship, STEM, Research, Grant",
        "status": "Open"
    },
    {
        "title": "Undergraduate Quantum Computing Research Program",
        "description": "Conduct cutting-edge research alongside leading physicists on quantum error correction algorithms and qubit simulations.",
        "organization": "CERN & OpenQuantum Lab",
        "type": "Research",
        "deadline": "2026-11-01",
        "location": "Geneva, Switzerland / Remote",
        "is_online": True,
        "eligibility": "Demonstrated interest in Physics or CS",
        "age_requirements": "17+",
        "grade_requirements": "Grade 12+",
        "category": "Physics & Quantum",
        "external_url": "https://research.example.com",
        "tags": "Quantum, Physics, Research, Internship",
        "status": "Open"
    },
    {
        "title": "Young Founders Startup Pitch Competition",
        "description": "Pitch your hardware or software startup idea to real VC investors and student founder programs. Seed grants awarded to top 5 teams.",
        "organization": "Edu Nexus Ventures",
        "type": "Competitions",
        "deadline": "2026-09-15",
        "location": "Online",
        "is_online": True,
        "eligibility": "Student teams (1-4 members)",
        "age_requirements": "Any age",
        "grade_requirements": "All students",
        "category": "Entrepreneurship",
        "external_url": "https://founders.example.com",
        "tags": "Startup, Venture, Pitch, Competition",
        "status": "Open"
    }
]

def seed_opps_if_empty(db: Session):
    if db.query(Opportunity).count() == 0:
        for opp in DEFAULT_OPPORTUNITIES:
            o_obj = Opportunity(**opp)
            db.add(o_obj)
        db.commit()

def format_opp_out(opp: Opportunity, current_user_id: Optional[int], db: Session) -> dict:
    user_bookmarked = False
    if current_user_id:
        user_bookmarked = db.query(OpportunityBookmark).filter(
            OpportunityBookmark.opportunity_id == opp.id,
            OpportunityBookmark.user_id == current_user_id
        ).first() is not None

    return {
        "id": opp.id,
        "title": opp.title,
        "description": opp.description,
        "organization": opp.organization,
        "type": opp.type,
        "deadline": opp.deadline,
        "location": opp.location,
        "is_online": opp.is_online,
        "eligibility": opp.eligibility,
        "age_requirements": opp.age_requirements,
        "grade_requirements": opp.grade_requirements,
        "category": opp.category,
        "external_url": opp.external_url,
        "tags": opp.tags,
        "status": opp.status,
        "user_bookmarked": user_bookmarked,
        "created_at": opp.created_at
    }

@router.get("", response_model=List[OpportunityOut])
def get_opportunities(
    opp_type: Optional[str] = None,
    location: Optional[str] = None,
    category: Optional[str] = None,
    query: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    seed_opps_if_empty(db)
    opps_q = db.query(Opportunity)

    if opp_type:
        opps_q = opps_q.filter(Opportunity.type.ilike(f"%{opp_type.strip()}%"))
    if location:
        opps_q = opps_q.filter(Opportunity.location.ilike(f"%{location.strip()}%"))
    if category:
        opps_q = opps_q.filter(Opportunity.category.ilike(f"%{category.strip()}%"))
    if query:
        q_clean = f"%{query.strip().lower()}%"
        opps_q = opps_q.filter(
            (Opportunity.title.like(q_clean)) |
            (Opportunity.description.like(q_clean)) |
            (Opportunity.organization.like(q_clean)) |
            (Opportunity.tags.like(q_clean))
        )

    user_id = current_user.id if current_user else None
    opps = opps_q.order_by(Opportunity.created_at.desc()).all()
    return [format_opp_out(o, user_id, db) for o in opps]

@router.get("/saved", response_model=List[OpportunityOut])
def get_saved_opportunities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bookmarks = db.query(OpportunityBookmark).filter(OpportunityBookmark.user_id == current_user.id).all()
    opp_ids = [b.opportunity_id for b in bookmarks]
    opps = db.query(Opportunity).filter(Opportunity.id.in_(opp_ids)).all()
    return [format_opp_out(o, current_user.id, db) for o in opps]

@router.get("/{opp_id}", response_model=OpportunityOut)
def get_opportunity_detail(
    opp_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    user_id = current_user.id if current_user else None
    return format_opp_out(opp, user_id, db)

@router.post("/{opp_id}/bookmark")
def toggle_bookmark(
    opp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    existing = db.query(OpportunityBookmark).filter(
        OpportunityBookmark.opportunity_id == opp_id,
        OpportunityBookmark.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"bookmarked": False}
    else:
        b = OpportunityBookmark(opportunity_id=opp_id, user_id=current_user.id)
        db.add(b)
        db.commit()
        return {"bookmarked": True}

# Admin endpoints for opportunities
@router.post("", response_model=OpportunityOut)
def create_opportunity(
    data: OpportunityCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_opp = Opportunity(**data.model_dump())
    db.add(new_opp)
    db.commit()
    db.refresh(new_opp)
    return format_opp_out(new_opp, admin.id, db)
