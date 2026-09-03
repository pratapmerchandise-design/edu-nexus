import os
import hmac
import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User, UserMembership, PaymentTransaction, Notification, Profile
from backend.app.auth.security import get_current_user
from backend.app import membership_config as mconfig
from backend.app.quotas import quota_status
from backend.app.schemas import (
    MembershipTierOut,
    UserMembershipOut,
    SubscribeRequest,
    EarlyBirdClaimRequest,
    PaymentTransactionOut,
    RazorpayOrderOut,
    VerifyPaymentRequest,
    PaymentConfigOut,
)

try:
    import razorpay
except ImportError:
    razorpay = None

router = APIRouter(tags=["Membership"])

PAID_TIERS = set(mconfig.MEMBERSHIP_TIERS.keys())
SUBSCRIPTION_DAYS = 30

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "").strip()


def get_razorpay_client():
    if razorpay and RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    return None


def calculate_days_remaining(expires_at: Optional[datetime]) -> Optional[int]:
    if not expires_at:
        return None
    now = datetime.now(timezone.utc)
    exp = expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    diff = (exp - now).total_seconds()
    if diff <= 0:
        return 0
    return max(1, int(diff // 86400) + 1)


@router.get("/config", response_model=PaymentConfigOut)
def payment_config():
    """Returns public payment configuration and active early bird status."""
    return {
        "razorpay_key_id": RAZORPAY_KEY_ID if RAZORPAY_KEY_ID else None,
        "currency": "INR",
        "is_live": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET),
        "early_bird_active": True,
    }


@router.get("/tiers")
def list_tiers():
    """Public list of all tiers (free + paid) with regular prices, early bird promos, and benefits."""
    tiers = mconfig.public_tiers_list()
    for t in tiers:
        if t.get('key') != 'free':
            t['original_price_inr'] = t.get('price_inr', 0)
            t['promotional_price_inr'] = 0
            t['promo_discount_percent'] = 100
            t['promo_label'] = "100% OFF • 30 DAYS FREE"
    return tiers


@router.get("/limits")
def my_limits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Current monthly outreach usage + caps for the signed-in user."""
    return {
        "new_conversations": quota_status(db, current_user.id, "new_conversation"),
        "group_joins": quota_status(db, current_user.id, "group_join"),
    }


@router.get("/me", response_model=Optional[UserMembershipOut])
def my_membership(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Current active membership for the signed-in user, auto-expiring lapsed plans."""
    membership = db.query(UserMembership).filter(
        UserMembership.user_id == current_user.id,
        UserMembership.status == 'active'
    ).order_by(UserMembership.expires_at.desc()).first()

    if not membership:
        return None

    # Check expiration
    if membership.expires_at:
        now = datetime.now(timezone.utc)
        exp = membership.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now:
            membership.status = 'expired'
            db.commit()
            return None

    cfg = mconfig.get_tier_config(membership.tier)
    days_left = calculate_days_remaining(membership.expires_at)

    tx = db.query(PaymentTransaction).filter(
        PaymentTransaction.user_id == current_user.id,
        PaymentTransaction.tier == membership.tier,
        PaymentTransaction.status == 'paid'
    ).order_by(PaymentTransaction.created_at.desc()).first()

    return {
        **{k: getattr(membership, k) for k in ['id', 'tier', 'status', 'started_at', 'expires_at', 'auto_renew', 'payment_provider']},
        "name": cfg['name'],
        "color": cfg['color'],
        "perks": cfg['perks'],
        "days_remaining": days_left,
        "invoice_number": tx.invoice_number if tx else None,
        "is_early_bird": (membership.payment_provider == 'early_bird_promo'),
    }


@router.post("/claim-early-bird", response_model=UserMembershipOut)
def claim_early_bird(
    data: EarlyBirdClaimRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Claim a 100% Free 30-Day Early Bird Pass for any premium tier."""
    tier = (data.tier or '').lower()
    if tier not in PAID_TIERS:
        raise HTTPException(status_code=400, detail="Invalid membership tier selected")

    cfg = mconfig.get_tier_config(tier)

    # Cancel any existing active memberships for clean upgrade/activation
    existing = db.query(UserMembership).filter(
        UserMembership.user_id == current_user.id,
        UserMembership.status == 'active'
    ).all()
    for m in existing:
        m.status = 'cancelled'

    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=SUBSCRIPTION_DAYS)
    order_id = f"eb_ord_{current_user.id}_{int(now.timestamp())}"
    payment_id = f"eb_pay_{current_user.id}_{uuid.uuid4().hex[:8]}"
    invoice_number = f"EDX-EB-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    # Update profile with user-entered student details if provided
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if profile:
        if data.institution_name and not profile.school:
            profile.school = data.institution_name.strip()
        if data.primary_goal:
            if not profile.goals:
                profile.goals = data.primary_goal.strip()

    # Create active membership
    membership = UserMembership(
        user_id=current_user.id,
        tier=tier,
        status='active',
        started_at=now,
        expires_at=expires,
        auto_renew=False,
        payment_provider='early_bird_promo',
        payment_id=payment_id,
        order_id=order_id,
    )
    db.add(membership)

    # Create PaymentTransaction audit record
    tx = PaymentTransaction(
        user_id=current_user.id,
        tier=tier,
        order_id=order_id,
        payment_id=payment_id,
        signature=f"promo_sig_{uuid.uuid4().hex[:12]}",
        amount_inr=0,
        currency="INR",
        status="paid",
        provider="early_bird_promo",
        invoice_number=invoice_number,
        plan_name=cfg['name'],
        created_at=now,
    )
    db.add(tx)

    # Celebratory Welcome Notification
    db.add(Notification(
        recipient_id=current_user.id,
        sender_id=current_user.id,
        type='announcement',
        title=f"🎉 Early Bird Pass Activated: {cfg['name']}!",
        body=f"Congratulations! Your 30-day free Early Bird Pass for {cfg['name']} is active. Enjoy your {cfg['name']} verification tick and {len(cfg['perks'])} premium student perks!",
        link="/app/membership"
    ))

    db.commit()
    db.refresh(membership)

    return {
        **{k: getattr(membership, k) for k in ['id', 'tier', 'status', 'started_at', 'expires_at', 'auto_renew', 'payment_provider']},
        "name": cfg['name'],
        "color": cfg['color'],
        "perks": cfg['perks'],
        "days_remaining": SUBSCRIPTION_DAYS,
        "invoice_number": invoice_number,
        "is_early_bird": True,
    }


@router.post("/subscribe", response_model=UserMembershipOut)
def subscribe(
    data: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Standard direct subscription / mock activation fallback."""
    tier = (data.tier or '').lower()
    if tier not in PAID_TIERS:
        raise HTTPException(status_code=400, detail="Invalid membership tier")

    cfg = mconfig.get_tier_config(tier)

    # Cancel previous active memberships
    existing = db.query(UserMembership).filter(
        UserMembership.user_id == current_user.id,
        UserMembership.status == 'active'
    ).all()
    for m in existing:
        m.status = 'cancelled'

    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=SUBSCRIPTION_DAYS)
    order_id = data.order_id or f"ord_mock_{current_user.id}_{int(now.timestamp())}"
    payment_id = data.payment_id or f"pay_mock_{current_user.id}_{uuid.uuid4().hex[:8]}"
    invoice_number = f"EDX-INV-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    membership = UserMembership(
        user_id=current_user.id,
        tier=tier,
        status='active',
        started_at=now,
        expires_at=expires,
        auto_renew=True,
        payment_provider='mock',
        payment_id=payment_id,
        order_id=order_id,
    )
    db.add(membership)

    tx = PaymentTransaction(
        user_id=current_user.id,
        tier=tier,
        order_id=order_id,
        payment_id=payment_id,
        amount_inr=cfg.get('price_inr', 0),
        currency="INR",
        status="paid",
        provider="mock",
        invoice_number=invoice_number,
        plan_name=cfg['name'],
        created_at=now,
    )
    db.add(tx)

    db.add(Notification(
        recipient_id=current_user.id,
        sender_id=current_user.id,
        type='announcement',
        title=f"Welcome to {cfg['name']}!",
        body=f"You now have a {cfg['name']} tick and {len(cfg['perks'])} member benefits. Thank you for supporting Edu Nexus!",
        link="/app/membership"
    ))

    db.commit()
    db.refresh(membership)

    return {
        **{k: getattr(membership, k) for k in ['id', 'tier', 'status', 'started_at', 'expires_at', 'auto_renew', 'payment_provider']},
        "name": cfg['name'],
        "color": cfg['color'],
        "perks": cfg['perks'],
        "days_remaining": SUBSCRIPTION_DAYS,
        "invoice_number": invoice_number,
        "is_early_bird": False,
    }


# =========================================================================
# Razorpay Endpoints (Pre-wired for when Razorpay keys are connected)
# =========================================================================

@router.post("/create-order", response_model=RazorpayOrderOut)
def create_razorpay_order(
    tier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a Razorpay order or test sandbox order with tier pricing in paise."""
    tier_key = (tier or '').lower()
    if tier_key not in PAID_TIERS:
        raise HTTPException(status_code=400, detail="Invalid membership tier")

    cfg = mconfig.get_tier_config(tier_key)
    amount_inr = cfg['price_inr']
    amount_paise = amount_inr * 100
    now = datetime.now(timezone.utc)
    receipt = f"rcpt_{current_user.id}_{int(now.timestamp())}"

    rzp = get_razorpay_client()
    if rzp:
        try:
            order_data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": {
                    "user_id": str(current_user.id),
                    "username": current_user.username,
                    "tier": tier_key,
                    "plan_name": cfg['name']
                }
            }
            order = rzp.order.create(data=order_data)
            order_id = order['id']
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {str(e)}")
    else:
        order_id = f"order_test_{current_user.id}_{uuid.uuid4().hex[:10]}"

    tx = PaymentTransaction(
        user_id=current_user.id,
        tier=tier_key,
        order_id=order_id,
        amount_inr=amount_inr,
        currency="INR",
        status="created",
        provider="razorpay",
        plan_name=cfg['name'],
        created_at=now,
    )
    db.add(tx)
    db.commit()

    return {
        "order_id": order_id,
        "amount": amount_paise,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID or "rzp_test_placeholder",
        "tier": tier_key,
        "plan_name": cfg['name'],
        "user_name": current_user.username,
        "user_email": current_user.email,
    }


@router.post("/verify-payment", response_model=UserMembershipOut)
def verify_payment(
    data: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cryptographically verifies Razorpay payment signature and activates membership."""
    tier = (data.tier or '').lower()
    if tier not in PAID_TIERS:
        raise HTTPException(status_code=400, detail="Invalid membership tier")

    cfg = mconfig.get_tier_config(tier)

    if RAZORPAY_KEY_SECRET:
        msg = f"{data.razorpay_order_id}|{data.razorpay_payment_id}".encode()
        expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, data.razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid payment signature verification")

    existing = db.query(UserMembership).filter(
        UserMembership.user_id == current_user.id,
        UserMembership.status == 'active'
    ).all()
    for m in existing:
        m.status = 'cancelled'

    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=SUBSCRIPTION_DAYS)
    invoice_number = f"EDX-RZP-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

    membership = UserMembership(
        user_id=current_user.id,
        tier=tier,
        status='active',
        started_at=now,
        expires_at=expires,
        auto_renew=True,
        payment_provider='razorpay',
        payment_id=data.razorpay_payment_id,
        order_id=data.razorpay_order_id,
    )
    db.add(membership)

    tx = db.query(PaymentTransaction).filter(
        PaymentTransaction.user_id == current_user.id,
        PaymentTransaction.order_id == data.razorpay_order_id
    ).first()

    if not tx:
        tx = PaymentTransaction(
            user_id=current_user.id,
            tier=tier,
            order_id=data.razorpay_order_id,
            amount_inr=cfg.get('price_inr', 0),
            currency="INR",
            provider="razorpay",
            plan_name=cfg['name'],
        )
        db.add(tx)

    tx.payment_id = data.razorpay_payment_id
    tx.signature = data.razorpay_signature
    tx.status = 'paid'
    tx.invoice_number = invoice_number
    tx.created_at = now

    db.add(Notification(
        recipient_id=current_user.id,
        sender_id=current_user.id,
        type='announcement',
        title=f"Payment Verified — Welcome to {cfg['name']}!",
        body=f"Your payment of ₹{cfg.get('price_inr', 0)} was successful. Invoice #{invoice_number} is ready. Thank you for supporting Edu Nexus!",
        link="/app/membership"
    ))

    db.commit()
    db.refresh(membership)

    return {
        **{k: getattr(membership, k) for k in ['id', 'tier', 'status', 'started_at', 'expires_at', 'auto_renew', 'payment_provider']},
        "name": cfg['name'],
        "color": cfg['color'],
        "perks": cfg['perks'],
        "days_remaining": SUBSCRIPTION_DAYS,
        "invoice_number": invoice_number,
        "is_early_bird": False,
    }


# =========================================================================
# Transaction History & Invoice Endpoints
# =========================================================================

@router.get("/transactions", response_model=List[PaymentTransactionOut])
def list_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List of all past payments, subscriptions and promotional claims for the user."""
    return db.query(PaymentTransaction).filter(
        PaymentTransaction.user_id == current_user.id
    ).order_by(PaymentTransaction.created_at.desc()).all()


@router.get("/invoice/{invoice_number}")
def get_invoice_details(
    invoice_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Itemized receipt / invoice data for display and printing."""
    tx = db.query(PaymentTransaction).filter(
        PaymentTransaction.invoice_number == invoice_number,
        PaymentTransaction.user_id == current_user.id
    ).first()

    if not tx:
        raise HTTPException(status_code=404, detail="Invoice not found")

    cfg = mconfig.get_tier_config(tx.tier)
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()

    is_promo = (tx.provider == 'early_bird_promo' or tx.amount_inr == 0)
    original_price = cfg.get('price_inr', 0)
    discount_amount = original_price if is_promo else 0
    final_paid = 0 if is_promo else tx.amount_inr

    return {
        "invoice_number": tx.invoice_number,
        "issue_date": tx.created_at.isoformat() if tx.created_at else datetime.now(timezone.utc).isoformat(),
        "status": tx.status.upper(),
        "provider": tx.provider,
        "payment_id": tx.payment_id,
        "order_id": tx.order_id,
        "student": {
            "name": profile.full_name if profile and profile.full_name else current_user.username,
            "username": current_user.username,
            "email": current_user.email,
            "school": profile.school if profile else None,
            "country": profile.country if profile else None,
        },
        "plan": {
            "tier": tx.tier,
            "name": cfg.get('name', 'Membership'),
            "color": cfg.get('color', '#22E079'),
            "perks": cfg.get('perks', []),
            "validity_days": SUBSCRIPTION_DAYS,
        },
        "billing": {
            "currency": tx.currency or "INR",
            "original_amount": original_price,
            "discount_name": "Early Bird Launch Promotion (100% OFF)" if is_promo else None,
            "discount_amount": discount_amount,
            "tax_amount": 0,
            "net_paid": final_paid,
            "is_early_bird": is_promo,
        }
    }


@router.post("/cancel", response_model=UserMembershipOut)
def cancel_membership(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Cancel auto-renew. Access remains until the current period expires."""
    membership = db.query(UserMembership).filter(
        UserMembership.user_id == current_user.id,
        UserMembership.status == 'active'
    ).order_by(UserMembership.expires_at.desc()).first()
    if not membership:
        raise HTTPException(status_code=404, detail="No active membership found")

    membership.auto_renew = False
    membership.status = 'cancelled'
    db.commit()
    db.refresh(membership)
    cfg = mconfig.get_tier_config(membership.tier)
    days_left = calculate_days_remaining(membership.expires_at)
    return {
        **{k: getattr(membership, k) for k in ['id', 'tier', 'status', 'started_at', 'expires_at', 'auto_renew', 'payment_provider']},
        "name": cfg['name'],
        "color": cfg['color'],
        "perks": cfg['perks'],
        "days_remaining": days_left,
        "invoice_number": None,
        "is_early_bird": (membership.payment_provider == 'early_bird_promo'),
    }
