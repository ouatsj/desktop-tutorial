from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from enum import Enum
import bcrypt
import jwt
from jwt import PyJWTError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
SECRET_KEY = "your-secret-key-here"  # In production, use environment variable
ALGORITHM = "HS256"

# Enums
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ZONE_ADMIN = "zone_admin"
    FIELD_AGENT = "field_agent"

class Operator(str, Enum):
    ORANGE = "Orange"
    TELECEL = "Telecel"
    MOOV = "Moov"

class RechargeStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    EXPIRING_SOON = "expiring_soon"

class AlertStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DISMISSED = "dismissed"

# Models
class Zone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    admin_users: List[str] = []

class ZoneCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Agency(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    zone_id: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    admin_users: List[str] = []

class AgencyCreate(BaseModel):
    name: str
    zone_id: str
    description: Optional[str] = None

class Gare(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    agency_id: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    field_agents: List[str] = []

class GareCreate(BaseModel):
    name: str
    agency_id: str
    description: Optional[str] = None

class Recharge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gare_id: str
    operator: Operator
    start_date: datetime
    end_date: datetime
    volume: str  # e.g., "10GB", "Unlimited"
    cost: float
    status: RechargeStatus = RechargeStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str

class RechargeCreate(BaseModel):
    gare_id: str
    operator: Operator
    start_date: datetime
    end_date: datetime
    volume: str
    cost: float

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    hashed_password: str
    full_name: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_zones: List[str] = []
    assigned_agencies: List[str] = []
    assigned_gares: List[str] = []

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole
    assigned_zones: List[str] = []
    assigned_agencies: List[str] = []
    assigned_gares: List[str] = []

class UserLogin(BaseModel):
    email: str
    password: str

class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recharge_id: str
    alert_date: datetime
    days_before_expiry: int
    message: str
    status: AlertStatus = AlertStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AlertCreate(BaseModel):
    recharge_id: str
    days_before_expiry: int
    message: str

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def update_recharge_statuses():
    """Update recharge statuses based on expiry dates"""
    now = datetime.utcnow()
    
    # Mark expired recharges
    await db.recharges.update_many(
        {"end_date": {"$lt": now}, "status": {"$ne": "expired"}},
        {"$set": {"status": "expired"}}
    )
    
    # Mark expiring soon (within 3 days)
    expiring_date = now + timedelta(days=3)
    await db.recharges.update_many(
        {
            "end_date": {"$gte": now, "$lte": expiring_date},
            "status": "active"
        },
        {"$set": {"status": "expiring_soon"}}
    )

# Authentication routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    user_dict.pop("password")
    user_dict["hashed_password"] = hashed_password
    
    user = User(**user_dict)
    await db.users.insert_one(user.dict())
    
    return {"message": "User created successfully", "user_id": user.id}

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="User account is disabled")
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Zone routes
@api_router.post("/zones", response_model=Zone)
async def create_zone(zone_data: ZoneCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can create zones")
    
    zone = Zone(**zone_data.dict())
    await db.zones.insert_one(zone.dict())
    return zone

@api_router.get("/zones", response_model=List[Zone])
async def get_zones(current_user: User = Depends(get_current_user)):
    zones = await db.zones.find().to_list(1000)
    return [Zone(**zone) for zone in zones]

@api_router.get("/zones/{zone_id}", response_model=Zone)
async def get_zone(zone_id: str, current_user: User = Depends(get_current_user)):
    zone = await db.zones.find_one({"id": zone_id})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return Zone(**zone)

@api_router.put("/zones/{zone_id}", response_model=Zone)
async def update_zone(zone_id: str, zone_data: ZoneCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can update zones")
    
    result = await db.zones.update_one(
        {"id": zone_id},
        {"$set": zone_data.dict()}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    zone = await db.zones.find_one({"id": zone_id})
    return Zone(**zone)

@api_router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can delete zones")
    
    result = await db.zones.delete_one({"id": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    return {"message": "Zone deleted successfully"}

# Agency routes
@api_router.post("/agencies", response_model=Agency)
async def create_agency(agency_data: AgencyCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ZONE_ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    agency = Agency(**agency_data.dict())
    await db.agencies.insert_one(agency.dict())
    return agency

@api_router.get("/agencies", response_model=List[Agency])
async def get_agencies(zone_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if zone_id:
        query["zone_id"] = zone_id
    
    agencies = await db.agencies.find(query).to_list(1000)
    return [Agency(**agency) for agency in agencies]

@api_router.get("/agencies/{agency_id}", response_model=Agency)
async def get_agency(agency_id: str, current_user: User = Depends(get_current_user)):
    agency = await db.agencies.find_one({"id": agency_id})
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    return Agency(**agency)

@api_router.put("/agencies/{agency_id}", response_model=Agency)
async def update_agency(agency_id: str, agency_data: AgencyCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ZONE_ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await db.agencies.update_one(
        {"id": agency_id},
        {"$set": agency_data.dict()}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    agency = await db.agencies.find_one({"id": agency_id})
    return Agency(**agency)

@api_router.delete("/agencies/{agency_id}")
async def delete_agency(agency_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ZONE_ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await db.agencies.delete_one({"id": agency_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    return {"message": "Agency deleted successfully"}

# Gare routes
@api_router.post("/gares", response_model=Gare)
async def create_gare(gare_data: GareCreate, current_user: User = Depends(get_current_user)):
    gare = Gare(**gare_data.dict())
    await db.gares.insert_one(gare.dict())
    return gare

@api_router.get("/gares", response_model=List[Gare])
async def get_gares(agency_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if agency_id:
        query["agency_id"] = agency_id
    
    gares = await db.gares.find(query).to_list(1000)
    return [Gare(**gare) for gare in gares]

@api_router.get("/gares/{gare_id}", response_model=Gare)
async def get_gare(gare_id: str, current_user: User = Depends(get_current_user)):
    gare = await db.gares.find_one({"id": gare_id})
    if not gare:
        raise HTTPException(status_code=404, detail="Gare not found")
    return Gare(**gare)

@api_router.put("/gares/{gare_id}", response_model=Gare)
async def update_gare(gare_id: str, gare_data: GareCreate, current_user: User = Depends(get_current_user)):
    result = await db.gares.update_one(
        {"id": gare_id},
        {"$set": gare_data.dict()}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Gare not found")
    
    gare = await db.gares.find_one({"id": gare_id})
    return Gare(**gare)

@api_router.delete("/gares/{gare_id}")
async def delete_gare(gare_id: str, current_user: User = Depends(get_current_user)):
    result = await db.gares.delete_one({"id": gare_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gare not found")
    
    return {"message": "Gare deleted successfully"}

# Recharge routes
@api_router.post("/recharges", response_model=Recharge)
async def create_recharge(recharge_data: RechargeCreate, current_user: User = Depends(get_current_user)):
    recharge_dict = recharge_data.dict()
    recharge_dict["created_by"] = current_user.id
    
    recharge = Recharge(**recharge_dict)
    await db.recharges.insert_one(recharge.dict())
    
    # Create alert for this recharge
    alert_date = recharge.end_date - timedelta(days=3)
    alert = Alert(
        recharge_id=recharge.id,
        alert_date=alert_date,
        days_before_expiry=3,
        message=f"Recharge for {recharge.operator.value} expires in 3 days"
    )
    await db.alerts.insert_one(alert.dict())
    
    return recharge

@api_router.get("/recharges", response_model=List[Recharge])
async def get_recharges(
    gare_id: Optional[str] = None,
    operator: Optional[Operator] = None,
    status: Optional[RechargeStatus] = None,
    current_user: User = Depends(get_current_user)
):
    await update_recharge_statuses()
    
    query = {}
    if gare_id:
        query["gare_id"] = gare_id
    if operator:
        query["operator"] = operator.value
    if status:
        query["status"] = status.value
    
    recharges = await db.recharges.find(query).sort("created_at", -1).to_list(1000)
    return [Recharge(**recharge) for recharge in recharges]

@api_router.get("/recharges/{recharge_id}", response_model=Recharge)
async def get_recharge(recharge_id: str, current_user: User = Depends(get_current_user)):
    recharge = await db.recharges.find_one({"id": recharge_id})
    if not recharge:
        raise HTTPException(status_code=404, detail="Recharge not found")
    return Recharge(**recharge)

@api_router.put("/recharges/{recharge_id}", response_model=Recharge)
async def update_recharge(recharge_id: str, recharge_data: RechargeCreate, current_user: User = Depends(get_current_user)):
    result = await db.recharges.update_one(
        {"id": recharge_id},
        {"$set": recharge_data.dict()}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Recharge not found")
    
    recharge = await db.recharges.find_one({"id": recharge_id})
    return Recharge(**recharge)

@api_router.delete("/recharges/{recharge_id}")
async def delete_recharge(recharge_id: str, current_user: User = Depends(get_current_user)):
    result = await db.recharges.delete_one({"id": recharge_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recharge not found")
    
    return {"message": "Recharge deleted successfully"}

# Alert routes
@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(current_user: User = Depends(get_current_user)):
    alerts = await db.alerts.find({"status": {"$ne": "dismissed"}}).sort("alert_date", 1).to_list(1000)
    return [Alert(**alert) for alert in alerts]

@api_router.put("/alerts/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str, current_user: User = Depends(get_current_user)):
    result = await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {"status": "dismissed"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Alert dismissed"}

# Dashboard routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    await update_recharge_statuses()
    
    # Get counts
    total_zones = await db.zones.count_documents({})
    total_agencies = await db.agencies.count_documents({})
    total_gares = await db.gares.count_documents({})
    total_recharges = await db.recharges.count_documents({})
    
    # Get recharge statistics
    active_recharges = await db.recharges.count_documents({"status": "active"})
    expiring_recharges = await db.recharges.count_documents({"status": "expiring_soon"})
    expired_recharges = await db.recharges.count_documents({"status": "expired"})
    
    # Get operator statistics
    operator_stats = []
    for operator in ["Orange", "Telecel", "Moov"]:
        count = await db.recharges.count_documents({"operator": operator, "status": "active"})
        operator_stats.append({"operator": operator, "count": count})
    
    # Get pending alerts
    pending_alerts = await db.alerts.count_documents({"status": "pending"})
    
    return {
        "total_zones": total_zones,
        "total_agencies": total_agencies,
        "total_gares": total_gares,
        "total_recharges": total_recharges,
        "active_recharges": active_recharges,
        "expiring_recharges": expiring_recharges,
        "expired_recharges": expired_recharges,
        "operator_stats": operator_stats,
        "pending_alerts": pending_alerts
    }

# Test route
@api_router.get("/")
async def root():
    return {"message": "Burkina Faso Railway Recharge Management System API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()