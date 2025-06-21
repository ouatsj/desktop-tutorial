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
    # Opérateurs mobiles
    ORANGE = "Orange"
    TELECEL = "Telecel"
    MOOV = "Moov"
    # Opérateurs fibre
    ONATEL_FIBRE = "Onatel Fibre"
    ORANGE_FIBRE = "Orange Fibre"
    TELECEL_FIBRE = "Telecel Fibre"
    CANALBOX = "Canalbox"
    FASO_NET = "Faso Net"
    WAYODI = "Wayodi"

class OperatorType(str, Enum):
    MOBILE = "mobile"
    FIBRE = "fibre"

class PaymentType(str, Enum):
    PREPAID = "prepaid"  # Prépayé (recharge)
    POSTPAID = "postpaid"  # Postpayé (abonnement mensuel)

class ConnectionStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

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

class Connection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    line_number: str  # Numéro de ligne unique (ex: "ONG-001", "TEL-FIBRE-025")
    gare_id: str
    operator: Operator
    operator_type: OperatorType
    connection_type: str  # ex: "Internet", "Data", "Fibre Optique"
    status: ConnectionStatus = ConnectionStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = None
    last_recharge_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None

class ConnectionCreate(BaseModel):
    line_number: str
    gare_id: str
    operator: Operator
    operator_type: OperatorType
    connection_type: str
    description: Optional[str] = None

class Recharge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    connection_id: str  # Lié à une ligne spécifique
    line_number: str  # Copie pour faciliter les requêtes
    gare_id: str  # Copie pour faciliter les requêtes
    operator: Operator
    operator_type: OperatorType
    payment_type: PaymentType
    start_date: datetime
    end_date: datetime
    volume: str  # e.g., "10GB", "Unlimited", "100Mbps"
    cost: float
    status: RechargeStatus = RechargeStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    description: Optional[str] = None

class RechargeCreate(BaseModel):
    connection_id: str
    payment_type: PaymentType
    start_date: datetime
    end_date: datetime
    volume: str
    cost: float
    description: Optional[str] = None

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

# Connection routes
@api_router.post("/connections", response_model=Connection)
async def create_connection(connection_data: ConnectionCreate, current_user: User = Depends(get_current_user)):
    # Check if line number already exists
    existing_connection = await db.connections.find_one({"line_number": connection_data.line_number})
    if existing_connection:
        raise HTTPException(status_code=400, detail="Ce numéro de ligne existe déjà")
    
    connection = Connection(**connection_data.dict())
    await db.connections.insert_one(connection.dict())
    return connection

@api_router.get("/connections", response_model=List[Connection])
async def get_connections(
    gare_id: Optional[str] = None,
    operator: Optional[Operator] = None,
    status: Optional[ConnectionStatus] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if gare_id:
        query["gare_id"] = gare_id
    if operator:
        query["operator"] = operator.value
    if status:
        query["status"] = status.value
    
    connections = await db.connections.find(query).sort("created_at", -1).to_list(1000)
    return [Connection(**connection) for connection in connections]

@api_router.get("/connections/{connection_id}", response_model=Connection)
async def get_connection(connection_id: str, current_user: User = Depends(get_current_user)):
    connection = await db.connections.find_one({"id": connection_id})
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    return Connection(**connection)

@api_router.put("/connections/{connection_id}", response_model=Connection)
async def update_connection(connection_id: str, connection_data: ConnectionCreate, current_user: User = Depends(get_current_user)):
    # Check if new line number conflicts with existing one (except current)
    if connection_data.line_number:
        existing_connection = await db.connections.find_one({
            "line_number": connection_data.line_number,
            "id": {"$ne": connection_id}
        })
        if existing_connection:
            raise HTTPException(status_code=400, detail="Ce numéro de ligne existe déjà")
    
    result = await db.connections.update_one(
        {"id": connection_id},
        {"$set": connection_data.dict()}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    connection = await db.connections.find_one({"id": connection_id})
    return Connection(**connection)

@api_router.delete("/connections/{connection_id}")
async def delete_connection(connection_id: str, current_user: User = Depends(get_current_user)):
    # Check if connection has active recharges
    active_recharges = await db.recharges.count_documents({
        "connection_id": connection_id,
        "status": {"$in": ["active", "expiring_soon"]}
    })
    
    if active_recharges > 0:
        raise HTTPException(status_code=400, detail="Impossible de supprimer une ligne avec des recharges actives")
    
    result = await db.connections.delete_one({"id": connection_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    return {"message": "Connection deleted successfully"}

# Recharge routes (updated)
@api_router.post("/recharges", response_model=Recharge)
async def create_recharge(recharge_data: RechargeCreate, current_user: User = Depends(get_current_user)):
    # Get connection info
    connection = await db.connections.find_one({"id": recharge_data.connection_id})
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    recharge_dict = recharge_data.dict()
    recharge_dict["created_by"] = current_user.id
    recharge_dict["line_number"] = connection["line_number"]
    recharge_dict["gare_id"] = connection["gare_id"]
    recharge_dict["operator"] = connection["operator"]
    recharge_dict["operator_type"] = connection["operator_type"]
    
    recharge = Recharge(**recharge_dict)
    await db.recharges.insert_one(recharge.dict())
    
    # Update connection with last recharge info
    await db.connections.update_one(
        {"id": recharge_data.connection_id},
        {
            "$set": {
                "last_recharge_date": recharge.start_date,
                "expiry_date": recharge.end_date
            }
        }
    )
    
    # Create alert for this recharge
    alert_date = recharge.end_date - timedelta(days=3)
    alert = Alert(
        recharge_id=recharge.id,
        alert_date=alert_date,
        days_before_expiry=3,
        message=f"Ligne {connection['line_number']} ({recharge.operator.value}) expire dans 3 jours"
    )
    await db.alerts.insert_one(alert.dict())
    
    return recharge

@api_router.get("/recharges", response_model=List[Recharge])
async def get_recharges(
    gare_id: Optional[str] = None,
    connection_id: Optional[str] = None,
    operator: Optional[Operator] = None,
    status: Optional[RechargeStatus] = None,
    current_user: User = Depends(get_current_user)
):
    await update_recharge_statuses()
    
    query = {}
    if gare_id:
        query["gare_id"] = gare_id
    if connection_id:
        query["connection_id"] = connection_id
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

# Reports and exports
@api_router.get("/reports/gare/{gare_id}")
async def get_gare_report(gare_id: str, current_user: User = Depends(get_current_user)):
    await update_recharge_statuses()
    
    # Get gare info
    gare = await db.gares.find_one({"id": gare_id})
    if not gare:
        raise HTTPException(status_code=404, detail="Gare not found")
    
    # Get agency and zone info
    agency = await db.agencies.find_one({"id": gare["agency_id"]})
    zone = await db.zones.find_one({"id": agency["zone_id"]}) if agency else None
    
    # Get all recharges for this gare
    recharges = await db.recharges.find({"gare_id": gare_id}).sort("created_at", -1).to_list(1000)
    
    # Calculate statistics
    total_recharges = len(recharges)
    active_recharges = len([r for r in recharges if r["status"] == "active"])
    expired_recharges = len([r for r in recharges if r["status"] == "expired"])
    expiring_recharges = len([r for r in recharges if r["status"] == "expiring_soon"])
    total_cost = sum([r["cost"] for r in recharges])
    
    # Group by operator
    operator_stats = {}
    for recharge in recharges:
        op = recharge["operator"]
        if op not in operator_stats:
            operator_stats[op] = {"count": 0, "cost": 0, "active": 0}
        operator_stats[op]["count"] += 1
        operator_stats[op]["cost"] += recharge["cost"]
        if recharge["status"] == "active":
            operator_stats[op]["active"] += 1
    
    return {
        "gare": gare,
        "agency": agency,
        "zone": zone,
        "recharges": recharges,
        "statistics": {
            "total_recharges": total_recharges,
            "active_recharges": active_recharges,
            "expired_recharges": expired_recharges,
            "expiring_recharges": expiring_recharges,
            "total_cost": total_cost,
            "operator_stats": operator_stats
        },
        "generated_at": datetime.utcnow()
    }

@api_router.get("/reports/agency/{agency_id}")
async def get_agency_report(agency_id: str, current_user: User = Depends(get_current_user)):
    await update_recharge_statuses()
    
    # Get agency info
    agency = await db.agencies.find_one({"id": agency_id})
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")
    
    # Get zone info
    zone = await db.zones.find_one({"id": agency["zone_id"]})
    
    # Get all gares in this agency
    gares = await db.gares.find({"agency_id": agency_id}).to_list(1000)
    gare_ids = [g["id"] for g in gares]
    
    # Get all recharges for gares in this agency
    recharges = await db.recharges.find({"gare_id": {"$in": gare_ids}}).sort("created_at", -1).to_list(1000)
    
    # Calculate statistics
    total_recharges = len(recharges)
    active_recharges = len([r for r in recharges if r["status"] == "active"])
    expired_recharges = len([r for r in recharges if r["status"] == "expired"])
    expiring_recharges = len([r for r in recharges if r["status"] == "expiring_soon"])
    total_cost = sum([r["cost"] for r in recharges])
    
    # Group by operator and gare
    operator_stats = {}
    gare_stats = {}
    for recharge in recharges:
        op = recharge["operator"]
        gare_id = recharge["gare_id"]
        
        if op not in operator_stats:
            operator_stats[op] = {"count": 0, "cost": 0, "active": 0}
        operator_stats[op]["count"] += 1
        operator_stats[op]["cost"] += recharge["cost"]
        if recharge["status"] == "active":
            operator_stats[op]["active"] += 1
            
        if gare_id not in gare_stats:
            gare_name = next((g["name"] for g in gares if g["id"] == gare_id), "Unknown")
            gare_stats[gare_id] = {"name": gare_name, "count": 0, "cost": 0, "active": 0}
        gare_stats[gare_id]["count"] += 1
        gare_stats[gare_id]["cost"] += recharge["cost"]
        if recharge["status"] == "active":
            gare_stats[gare_id]["active"] += 1
    
    return {
        "agency": agency,
        "zone": zone,
        "gares": gares,
        "recharges": recharges,
        "statistics": {
            "total_gares": len(gares),
            "total_recharges": total_recharges,
            "active_recharges": active_recharges,
            "expired_recharges": expired_recharges,
            "expiring_recharges": expiring_recharges,
            "total_cost": total_cost,
            "operator_stats": operator_stats,
            "gare_stats": gare_stats
        },
        "generated_at": datetime.utcnow()
    }

@api_router.get("/reports/zone/{zone_id}")
async def get_zone_report(zone_id: str, current_user: User = Depends(get_current_user)):
    await update_recharge_statuses()
    
    # Get zone info
    zone = await db.zones.find_one({"id": zone_id})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Get all agencies in this zone
    agencies = await db.agencies.find({"zone_id": zone_id}).to_list(1000)
    agency_ids = [a["id"] for a in agencies]
    
    # Get all gares in these agencies
    gares = await db.gares.find({"agency_id": {"$in": agency_ids}}).to_list(1000)
    gare_ids = [g["id"] for g in gares]
    
    # Get all recharges for gares in this zone
    recharges = await db.recharges.find({"gare_id": {"$in": gare_ids}}).sort("created_at", -1).to_list(1000)
    
    # Calculate statistics
    total_recharges = len(recharges)
    active_recharges = len([r for r in recharges if r["status"] == "active"])
    expired_recharges = len([r for r in recharges if r["status"] == "expired"])
    expiring_recharges = len([r for r in recharges if r["status"] == "expiring_soon"])
    total_cost = sum([r["cost"] for r in recharges])
    
    # Group by operator, agency, and gare
    operator_stats = {}
    agency_stats = {}
    for recharge in recharges:
        op = recharge["operator"]
        gare_id = recharge["gare_id"]
        gare = next((g for g in gares if g["id"] == gare_id), None)
        agency_id = gare["agency_id"] if gare else None
        
        if op not in operator_stats:
            operator_stats[op] = {"count": 0, "cost": 0, "active": 0}
        operator_stats[op]["count"] += 1
        operator_stats[op]["cost"] += recharge["cost"]
        if recharge["status"] == "active":
            operator_stats[op]["active"] += 1
            
        if agency_id and agency_id not in agency_stats:
            agency_name = next((a["name"] for a in agencies if a["id"] == agency_id), "Unknown")
            agency_stats[agency_id] = {"name": agency_name, "count": 0, "cost": 0, "active": 0, "gares": 0}
        if agency_id:
            agency_stats[agency_id]["count"] += 1
            agency_stats[agency_id]["cost"] += recharge["cost"]
            if recharge["status"] == "active":
                agency_stats[agency_id]["active"] += 1
    
    # Count gares per agency
    for agency_id in agency_stats:
        agency_stats[agency_id]["gares"] = len([g for g in gares if g["agency_id"] == agency_id])
    
    return {
        "zone": zone,
        "agencies": agencies,
        "gares": gares,
        "recharges": recharges,
        "statistics": {
            "total_agencies": len(agencies),
            "total_gares": len(gares),
            "total_recharges": total_recharges,
            "active_recharges": active_recharges,
            "expired_recharges": expired_recharges,
            "expiring_recharges": expiring_recharges,
            "total_cost": total_cost,
            "operator_stats": operator_stats,
            "agency_stats": agency_stats
        },
        "generated_at": datetime.utcnow()
    }

# WhatsApp sharing endpoint
@api_router.post("/reports/share/whatsapp")
async def share_report_whatsapp(
    report_data: dict,
    phone_number: str,
    current_user: User = Depends(get_current_user)
):
    # Generate WhatsApp message
    report_type = report_data.get("type", "general")
    entity_name = report_data.get("entity_name", "")
    stats = report_data.get("statistics", {})
    
    message = f"""📊 *Rapport {report_type.upper()} - {entity_name}*
📅 Généré le: {datetime.utcnow().strftime('%d/%m/%Y à %H:%M')}

📈 *Statistiques:*
• Recharges totales: {stats.get('total_recharges', 0)}
• Recharges actives: {stats.get('active_recharges', 0)}
• Recharges expirées: {stats.get('expired_recharges', 0)}
• Recharges expirant bientôt: {stats.get('expiring_recharges', 0)}
• Coût total: {stats.get('total_cost', 0):,.0f} FCFA

🏢 Système de gestion des recharges - Burkina Faso"""
    
    # WhatsApp Web URL - using urllib.parse for proper URL encoding
    from urllib.parse import quote
    encoded_message = quote(message)
    whatsapp_url = f"https://wa.me/{phone_number}?text={encoded_message}"
    
    return {
        "message": "WhatsApp link generated",
        "whatsapp_url": whatsapp_url,
        "formatted_message": message
    }

# Dashboard statistics (updated)
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    await update_recharge_statuses()
    
    # Get counts
    total_zones = await db.zones.count_documents({})
    total_agencies = await db.agencies.count_documents({})
    total_gares = await db.gares.count_documents({})
    total_connections = await db.connections.count_documents({})
    total_recharges = await db.recharges.count_documents({})
    
    # Get connection statistics
    active_connections = await db.connections.count_documents({"status": "active"})
    inactive_connections = await db.connections.count_documents({"status": "inactive"})
    
    # Get recharge statistics
    active_recharges = await db.recharges.count_documents({"status": "active"})
    expiring_recharges = await db.recharges.count_documents({"status": "expiring_soon"})
    expired_recharges = await db.recharges.count_documents({"status": "expired"})
    
    # Get operator statistics (updated with new operators)
    all_operators = [
        "Orange", "Telecel", "Moov", 
        "Onatel Fibre", "Orange Fibre", "Telecel Fibre", 
        "Canalbox", "Faso Net", "Wayodi"
    ]
    operator_stats = []
    for operator in all_operators:
        count = await db.recharges.count_documents({"operator": operator, "status": "active"})
        connections_count = await db.connections.count_documents({"operator": operator, "status": "active"})
        total_cost = 0
        recharges = await db.recharges.find({"operator": operator}).to_list(1000)
        total_cost = sum([r["cost"] for r in recharges])
        operator_stats.append({
            "operator": operator, 
            "recharge_count": count,
            "connections_count": connections_count,
            "total_cost": total_cost,
            "type": "fibre" if operator in ["Onatel Fibre", "Orange Fibre", "Telecel Fibre", "Canalbox", "Faso Net", "Wayodi"] else "mobile"
        })
    
    # Get payment type statistics
    prepaid_count = await db.recharges.count_documents({"payment_type": "prepaid", "status": "active"})
    postpaid_count = await db.recharges.count_documents({"payment_type": "postpaid", "status": "active"})
    
    # Get connection type statistics
    mobile_connections = await db.connections.count_documents({"operator_type": "mobile", "status": "active"})
    fibre_connections = await db.connections.count_documents({"operator_type": "fibre", "status": "active"})
    
    # Get pending alerts
    pending_alerts = await db.alerts.count_documents({"status": "pending"})
    
    return {
        "total_zones": total_zones,
        "total_agencies": total_agencies,
        "total_gares": total_gares,
        "total_connections": total_connections,
        "total_recharges": total_recharges,
        "active_connections": active_connections,
        "inactive_connections": inactive_connections,
        "active_recharges": active_recharges,
        "expiring_recharges": expiring_recharges,
        "expired_recharges": expired_recharges,
        "operator_stats": operator_stats,
        "payment_type_stats": {
            "prepaid": prepaid_count,
            "postpaid": postpaid_count
        },
        "connection_type_stats": {
            "mobile": mobile_connections,
            "fibre": fibre_connections
        },
        "pending_alerts": pending_alerts
    }

# Test route
@api_router.get("/")
async def root():
    return {"message": "Burkina Faso Railway Recharge Management System API"}

# Admin endpoint to reset database (remove all test data)
@api_router.delete("/admin/reset-database")
async def reset_database(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only Super Admin can reset database")
    
    try:
        # Clear all collections
        await db.users.delete_many({})
        await db.zones.delete_many({})
        await db.agencies.delete_many({})
        await db.gares.delete_many({})
        await db.recharges.delete_many({})
        await db.alerts.delete_many({})
        
        return {
            "message": "Database reset successfully",
            "collections_cleared": ["users", "zones", "agencies", "gares", "recharges", "alerts"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error resetting database: {str(e)}")

# Simple reset endpoint without authentication (for initial setup)
@api_router.post("/admin/clear-test-data")
async def clear_test_data():
    try:
        # Clear all collections
        users_deleted = await db.users.delete_many({})
        zones_deleted = await db.zones.delete_many({})
        agencies_deleted = await db.agencies.delete_many({})
        gares_deleted = await db.gares.delete_many({})
        connections_deleted = await db.connections.delete_many({})
        recharges_deleted = await db.recharges.delete_many({})
        alerts_deleted = await db.alerts.delete_many({})
        
        return {
            "message": "All test data cleared successfully",
            "deleted_counts": {
                "users": users_deleted.deleted_count,
                "zones": zones_deleted.deleted_count,
                "agencies": agencies_deleted.deleted_count,
                "gares": gares_deleted.deleted_count,
                "connections": connections_deleted.deleted_count,
                "recharges": recharges_deleted.deleted_count,
                "alerts": alerts_deleted.deleted_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing test data: {str(e)}")

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