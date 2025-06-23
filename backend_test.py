#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime, timedelta
import uuid
import sys
from pprint import pprint

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://185e98d3-f213-4a55-a3ad-97cab92cfdce.preview.emergentagent.com/api"

# Test data with French names and FCFA currency values
TEST_USERS = {
    "super_admin": {
        "email": f"admin_{uuid.uuid4()}@railbf.com",
        "password": "SuperSecure123!",
        "full_name": "Amadou Traoré",
        "role": "super_admin"
    },
    "zone_admin": {
        "email": f"zone_{uuid.uuid4()}@railbf.com",
        "password": "ZoneSecure456!",
        "full_name": "Fatou Ouédraogo",
        "role": "zone_admin"
    },
    "field_agent": {
        "email": f"agent_{uuid.uuid4()}@railbf.com",
        "password": "FieldSecure789!",
        "full_name": "Ibrahim Konaté",
        "role": "field_agent"
    }
}

# Test data for zones, agencies, gares, and recharges
TEST_ZONE = {
    "name": "Zone Ouest Burkina",
    "description": "Région ferroviaire de l'ouest du Burkina Faso"
}

TEST_AGENCY = {
    "name": "Agence Bobo-Dioulasso",
    "description": "Agence principale de Bobo-Dioulasso"
}

TEST_GARE = {
    "name": "Gare Centrale de Bobo",
    "description": "Gare principale de Bobo-Dioulasso"
}

# Test data for connections
TEST_CONNECTION = {
    "line_number": f"ONG-CENTRAL-{uuid.uuid4().hex[:4]}",
    "operator": "Orange",
    "operator_type": "mobile",
    "connection_type": "Internet",
    "description": "Connexion mobile Orange pour la gare centrale"
}

# Test data for fiber connections
TEST_FIBER_CONNECTIONS = [
    {
        "line_number": f"ONATEL-FIBRE-{uuid.uuid4().hex[:4]}",
        "operator": "Onatel Fibre",
        "operator_type": "fibre",
        "connection_type": "Fibre Optique",
        "description": "Connexion fibre Onatel pour la gare centrale"
    },
    {
        "line_number": f"ORANGE-FIBRE-{uuid.uuid4().hex[:4]}",
        "operator": "Orange Fibre",
        "operator_type": "fibre",
        "connection_type": "Fibre Optique",
        "description": "Connexion fibre Orange pour la gare centrale"
    },
    {
        "line_number": f"TELECEL-FIBRE-{uuid.uuid4().hex[:4]}",
        "operator": "Telecel Fibre",
        "operator_type": "fibre",
        "connection_type": "Fibre Optique",
        "description": "Connexion fibre Telecel pour la gare centrale"
    },
    {
        "line_number": f"CANALBOX-{uuid.uuid4().hex[:4]}",
        "operator": "Canalbox",
        "operator_type": "fibre",
        "connection_type": "Fibre Optique",
        "description": "Connexion Canalbox pour la gare centrale"
    },
    {
        "line_number": f"FASONET-{uuid.uuid4().hex[:4]}",
        "operator": "Faso Net",
        "operator_type": "fibre",
        "connection_type": "Fibre Optique",
        "description": "Connexion Faso Net pour la gare centrale"
    },
    {
        "line_number": f"WAYODI-{uuid.uuid4().hex[:4]}",
        "operator": "Wayodi",
        "operator_type": "fibre",
        "connection_type": "Fibre Optique",
        "description": "Connexion Wayodi pour la gare centrale"
    }
]

TEST_RECHARGE = {
    "operator": "Orange",
    "volume": "50GB",
    "cost": 25000.0,  # in FCFA
    "payment_type": "prepaid"
}

# Store tokens and IDs
tokens = {}
created_ids = {
    "zone": None,
    "agency": None,
    "gare": None,
    "connection": None,
    "fiber_connections": {},
    "recharge": None,
    "alert": None
}

def print_header(title):
    """Print a formatted header for test sections"""
    print("\n" + "=" * 80)
    print(f" {title} ".center(80, "="))
    print("=" * 80)

def print_test_result(test_name, success, response=None, error=None):
    """Print the result of a test"""
    if success:
        print(f"✅ {test_name}: SUCCESS")
        if response:
            if isinstance(response, dict) and not response.get('access_token'):
                pprint(response)
            elif isinstance(response, list):
                print(f"  Items count: {len(response)}")
                if len(response) > 0:
                    print(f"  First item sample: {response[0]}")
    else:
        print(f"❌ {test_name}: FAILED")
        if error:
            print(f"  Error: {error}")
        if response:
            print(f"  Response: {response}")

def run_tests():
    """Run all tests for the backend API"""
    test_authentication()
    test_zone_management()
    test_agency_management()
    test_gare_management()
    test_recharge_management()
    test_alert_system()
    test_dashboard_statistics()

def test_authentication():
    """Test user registration, login, and authentication"""
    print_header("AUTHENTICATION SYSTEM TESTS")
    
    # Test user registration for all roles
    for role, user_data in TEST_USERS.items():
        try:
            response = requests.post(
                f"{BACKEND_URL}/auth/register",
                json=user_data
            )
            success = response.status_code == 200
            print_test_result(f"Register {role}", success, response.json())
        except Exception as e:
            print_test_result(f"Register {role}", False, error=str(e))
    
    # Test user login for all roles
    for role, user_data in TEST_USERS.items():
        try:
            response = requests.post(
                f"{BACKEND_URL}/auth/login",
                json={
                    "email": user_data["email"],
                    "password": user_data["password"]
                }
            )
            success = response.status_code == 200
            if success:
                tokens[role] = response.json()["access_token"]
            print_test_result(f"Login {role}", success, response.json())
        except Exception as e:
            print_test_result(f"Login {role}", False, error=str(e))
    
    # Test protected endpoint access with valid tokens
    for role, token in tokens.items():
        try:
            response = requests.get(
                f"{BACKEND_URL}/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            success = response.status_code == 200
            print_test_result(f"Get user profile ({role})", success, response.json())
        except Exception as e:
            print_test_result(f"Get user profile ({role})", False, error=str(e))
    
    # Test protected endpoint with invalid token
    try:
        response = requests.get(
            f"{BACKEND_URL}/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        success = response.status_code == 401
        print_test_result("Access with invalid token", success, response.json())
    except Exception as e:
        print_test_result("Access with invalid token", False, error=str(e))

def test_zone_management():
    """Test zone CRUD operations"""
    print_header("ZONE MANAGEMENT TESTS")
    
    # Test zone creation (super_admin only)
    try:
        response = requests.post(
            f"{BACKEND_URL}/zones",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json=TEST_ZONE
        )
        success = response.status_code == 200
        if success:
            created_ids["zone"] = response.json()["id"]
        print_test_result("Create zone (super_admin)", success, response.json())
    except Exception as e:
        print_test_result("Create zone (super_admin)", False, error=str(e))
    
    # Test zone creation with zone_admin (should fail)
    try:
        response = requests.post(
            f"{BACKEND_URL}/zones",
            headers={"Authorization": f"Bearer {tokens['zone_admin']}"},
            json=TEST_ZONE
        )
        success = response.status_code == 403  # Should be forbidden
        print_test_result("Create zone (zone_admin)", success, response.json())
    except Exception as e:
        print_test_result("Create zone (zone_admin)", False, error=str(e))
    
    # Test get all zones
    try:
        response = requests.get(
            f"{BACKEND_URL}/zones",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get all zones", success, response.json())
    except Exception as e:
        print_test_result("Get all zones", False, error=str(e))
    
    # Test get zone by ID
    if created_ids["zone"]:
        try:
            response = requests.get(
                f"{BACKEND_URL}/zones/{created_ids['zone']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Get zone by ID", success, response.json())
        except Exception as e:
            print_test_result("Get zone by ID", False, error=str(e))
    
    # Test update zone
    if created_ids["zone"]:
        try:
            response = requests.put(
                f"{BACKEND_URL}/zones/{created_ids['zone']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"},
                json={
                    "name": "Zone Ouest Burkina (Updated)",
                    "description": "Région ferroviaire mise à jour"
                }
            )
            success = response.status_code == 200
            print_test_result("Update zone", success, response.json())
        except Exception as e:
            print_test_result("Update zone", False, error=str(e))
    
    # We'll test zone deletion after all other tests are complete

def test_agency_management():
    """Test agency CRUD operations"""
    print_header("AGENCY MANAGEMENT TESTS")
    
    if not created_ids["zone"]:
        print("❌ Cannot test agencies without a zone ID")
        return
    
    # Create test agency data with zone ID
    agency_data = TEST_AGENCY.copy()
    agency_data["zone_id"] = created_ids["zone"]
    
    # Test agency creation with super_admin
    try:
        response = requests.post(
            f"{BACKEND_URL}/agencies",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json=agency_data
        )
        success = response.status_code == 200
        if success:
            created_ids["agency"] = response.json()["id"]
        print_test_result("Create agency (super_admin)", success, response.json())
    except Exception as e:
        print_test_result("Create agency (super_admin)", False, error=str(e))
    
    # Test agency creation with zone_admin
    try:
        response = requests.post(
            f"{BACKEND_URL}/agencies",
            headers={"Authorization": f"Bearer {tokens['zone_admin']}"},
            json=agency_data
        )
        success = response.status_code == 200
        print_test_result("Create agency (zone_admin)", success, response.json())
    except Exception as e:
        print_test_result("Create agency (zone_admin)", False, error=str(e))
    
    # Test agency creation with field_agent (should fail)
    try:
        response = requests.post(
            f"{BACKEND_URL}/agencies",
            headers={"Authorization": f"Bearer {tokens['field_agent']}"},
            json=agency_data
        )
        success = response.status_code == 403  # Should be forbidden
        print_test_result("Create agency (field_agent)", success, response.json())
    except Exception as e:
        print_test_result("Create agency (field_agent)", False, error=str(e))
    
    # Test get all agencies
    try:
        response = requests.get(
            f"{BACKEND_URL}/agencies",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get all agencies", success, response.json())
    except Exception as e:
        print_test_result("Get all agencies", False, error=str(e))
    
    # Test get agencies by zone_id
    try:
        response = requests.get(
            f"{BACKEND_URL}/agencies?zone_id={created_ids['zone']}",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get agencies by zone_id", success, response.json())
    except Exception as e:
        print_test_result("Get agencies by zone_id", False, error=str(e))
    
    # Test get agency by ID
    if created_ids["agency"]:
        try:
            response = requests.get(
                f"{BACKEND_URL}/agencies/{created_ids['agency']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Get agency by ID", success, response.json())
        except Exception as e:
            print_test_result("Get agency by ID", False, error=str(e))
    
    # Test update agency
    if created_ids["agency"]:
        try:
            response = requests.put(
                f"{BACKEND_URL}/agencies/{created_ids['agency']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"},
                json={
                    "name": "Agence Bobo-Dioulasso (Updated)",
                    "description": "Agence principale mise à jour",
                    "zone_id": created_ids["zone"]
                }
            )
            success = response.status_code == 200
            print_test_result("Update agency", success, response.json())
        except Exception as e:
            print_test_result("Update agency", False, error=str(e))

def test_gare_management():
    """Test gare CRUD operations"""
    print_header("GARE MANAGEMENT TESTS")
    
    if not created_ids["agency"]:
        print("❌ Cannot test gares without an agency ID")
        return
    
    # Create test gare data with agency ID
    gare_data = TEST_GARE.copy()
    gare_data["agency_id"] = created_ids["agency"]
    
    # Test gare creation with super_admin
    try:
        response = requests.post(
            f"{BACKEND_URL}/gares",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json=gare_data
        )
        success = response.status_code == 200
        if success:
            created_ids["gare"] = response.json()["id"]
        print_test_result("Create gare (super_admin)", success, response.json())
    except Exception as e:
        print_test_result("Create gare (super_admin)", False, error=str(e))
    
    # Test gare creation with zone_admin
    try:
        response = requests.post(
            f"{BACKEND_URL}/gares",
            headers={"Authorization": f"Bearer {tokens['zone_admin']}"},
            json=gare_data
        )
        success = response.status_code == 200
        print_test_result("Create gare (zone_admin)", success, response.json())
    except Exception as e:
        print_test_result("Create gare (zone_admin)", False, error=str(e))
    
    # Test gare creation with field_agent
    try:
        response = requests.post(
            f"{BACKEND_URL}/gares",
            headers={"Authorization": f"Bearer {tokens['field_agent']}"},
            json=gare_data
        )
        success = response.status_code == 200
        print_test_result("Create gare (field_agent)", success, response.json())
    except Exception as e:
        print_test_result("Create gare (field_agent)", False, error=str(e))
    
    # Test get all gares
    try:
        response = requests.get(
            f"{BACKEND_URL}/gares",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get all gares", success, response.json())
    except Exception as e:
        print_test_result("Get all gares", False, error=str(e))
    
    # Test get gares by agency_id
    try:
        response = requests.get(
            f"{BACKEND_URL}/gares?agency_id={created_ids['agency']}",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get gares by agency_id", success, response.json())
    except Exception as e:
        print_test_result("Get gares by agency_id", False, error=str(e))
    
    # Test get gare by ID
    if created_ids["gare"]:
        try:
            response = requests.get(
                f"{BACKEND_URL}/gares/{created_ids['gare']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Get gare by ID", success, response.json())
        except Exception as e:
            print_test_result("Get gare by ID", False, error=str(e))
    
    # Test update gare
    if created_ids["gare"]:
        try:
            response = requests.put(
                f"{BACKEND_URL}/gares/{created_ids['gare']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"},
                json={
                    "name": "Gare Centrale de Bobo (Updated)",
                    "description": "Gare principale mise à jour",
                    "agency_id": created_ids["agency"]
                }
            )
            success = response.status_code == 200
            print_test_result("Update gare", success, response.json())
        except Exception as e:
            print_test_result("Update gare", False, error=str(e))

def test_recharge_management():
    """Test recharge CRUD operations"""
    print_header("RECHARGE MANAGEMENT TESTS")
    
    if not created_ids["gare"]:
        print("❌ Cannot test recharges without a gare ID")
        return
    
    # Create test recharge data with gare ID and dates
    recharge_data = TEST_RECHARGE.copy()
    recharge_data["gare_id"] = created_ids["gare"]
    recharge_data["start_date"] = datetime.now().isoformat()
    recharge_data["end_date"] = (datetime.now() + timedelta(days=30)).isoformat()
    
    # Test recharge creation
    try:
        response = requests.post(
            f"{BACKEND_URL}/recharges",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json=recharge_data
        )
        success = response.status_code == 200
        if success:
            created_ids["recharge"] = response.json()["id"]
        print_test_result("Create recharge", success, response.json())
    except Exception as e:
        print_test_result("Create recharge", False, error=str(e))
    
    # Test get all recharges
    try:
        response = requests.get(
            f"{BACKEND_URL}/recharges",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get all recharges", success, response.json())
    except Exception as e:
        print_test_result("Get all recharges", False, error=str(e))
    
    # Test get recharges by gare_id
    try:
        response = requests.get(
            f"{BACKEND_URL}/recharges?gare_id={created_ids['gare']}",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get recharges by gare_id", success, response.json())
    except Exception as e:
        print_test_result("Get recharges by gare_id", False, error=str(e))
    
    # Test get recharges by operator
    try:
        response = requests.get(
            f"{BACKEND_URL}/recharges?operator=Orange",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get recharges by operator", success, response.json())
    except Exception as e:
        print_test_result("Get recharges by operator", False, error=str(e))
    
    # Test get recharges by status
    try:
        response = requests.get(
            f"{BACKEND_URL}/recharges?status=active",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get recharges by status", success, response.json())
    except Exception as e:
        print_test_result("Get recharges by status", False, error=str(e))
    
    # Test get recharge by ID
    if created_ids["recharge"]:
        try:
            response = requests.get(
                f"{BACKEND_URL}/recharges/{created_ids['recharge']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Get recharge by ID", success, response.json())
        except Exception as e:
            print_test_result("Get recharge by ID", False, error=str(e))
    
    # Test update recharge
    if created_ids["recharge"]:
        try:
            response = requests.put(
                f"{BACKEND_URL}/recharges/{created_ids['recharge']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"},
                json={
                    "gare_id": created_ids["gare"],
                    "operator": "Telecel",  # Changed from Orange to Telecel
                    "volume": "100GB",  # Changed from 50GB to 100GB
                    "cost": 45000.0,  # Changed from 25000 to 45000 FCFA
                    "start_date": datetime.now().isoformat(),
                    "end_date": (datetime.now() + timedelta(days=30)).isoformat()
                }
            )
            success = response.status_code == 200
            print_test_result("Update recharge", success, response.json())
        except Exception as e:
            print_test_result("Update recharge", False, error=str(e))
    
    # Create an expiring soon recharge (expires in 2 days)
    expiring_recharge_data = TEST_RECHARGE.copy()
    expiring_recharge_data["gare_id"] = created_ids["gare"]
    expiring_recharge_data["operator"] = "Moov"
    expiring_recharge_data["start_date"] = datetime.now().isoformat()
    expiring_recharge_data["end_date"] = (datetime.now() + timedelta(days=2)).isoformat()
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/recharges",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json=expiring_recharge_data
        )
        success = response.status_code == 200
        print_test_result("Create expiring soon recharge", success, response.json())
    except Exception as e:
        print_test_result("Create expiring soon recharge", False, error=str(e))
    
    # Create an expired recharge
    expired_recharge_data = TEST_RECHARGE.copy()
    expired_recharge_data["gare_id"] = created_ids["gare"]
    expired_recharge_data["operator"] = "Orange"
    expired_recharge_data["start_date"] = (datetime.now() - timedelta(days=40)).isoformat()
    expired_recharge_data["end_date"] = (datetime.now() - timedelta(days=10)).isoformat()
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/recharges",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json=expired_recharge_data
        )
        success = response.status_code == 200
        print_test_result("Create expired recharge", success, response.json())
    except Exception as e:
        print_test_result("Create expired recharge", False, error=str(e))
    
    # Check if status updates automatically
    time.sleep(1)  # Wait a bit for status updates to process
    try:
        response = requests.get(
            f"{BACKEND_URL}/recharges?status=expired",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200 and len(response.json()) > 0
        print_test_result("Automatic status update (expired)", success, response.json())
    except Exception as e:
        print_test_result("Automatic status update (expired)", False, error=str(e))
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/recharges?status=expiring_soon",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200 and len(response.json()) > 0
        print_test_result("Automatic status update (expiring_soon)", success, response.json())
    except Exception as e:
        print_test_result("Automatic status update (expiring_soon)", False, error=str(e))

def test_alert_system():
    """Test alert system"""
    print_header("ALERT SYSTEM TESTS")
    
    # Test get alerts
    try:
        response = requests.get(
            f"{BACKEND_URL}/alerts",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        if success and len(response.json()) > 0:
            created_ids["alert"] = response.json()[0]["id"]
        print_test_result("Get alerts", success, response.json())
    except Exception as e:
        print_test_result("Get alerts", False, error=str(e))
    
    # Test dismiss alert
    if created_ids["alert"]:
        try:
            response = requests.put(
                f"{BACKEND_URL}/alerts/{created_ids['alert']}/dismiss",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Dismiss alert", success, response.json())
        except Exception as e:
            print_test_result("Dismiss alert", False, error=str(e))
        
        # Verify alert is dismissed
        try:
            response = requests.get(
                f"{BACKEND_URL}/alerts",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            dismissed = all(alert["id"] != created_ids["alert"] for alert in response.json())
            print_test_result("Verify alert dismissed", dismissed, response.json())
        except Exception as e:
            print_test_result("Verify alert dismissed", False, error=str(e))

def test_dashboard_statistics():
    """Test dashboard statistics API"""
    print_header("DASHBOARD STATISTICS TESTS")
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/dashboard/stats",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        
        # Verify all required statistics are present
        stats = response.json()
        required_fields = [
            "total_zones", "total_agencies", "total_gares", "total_recharges",
            "active_recharges", "expiring_recharges", "expired_recharges",
            "operator_stats", "pending_alerts"
        ]
        all_fields_present = all(field in stats for field in required_fields)
        
        print_test_result("Get dashboard statistics", success and all_fields_present, stats)
    except Exception as e:
        print_test_result("Get dashboard statistics", False, error=str(e))

def cleanup():
    """Clean up created resources"""
    print_header("CLEANUP")
    
    # Delete recharge
    if created_ids["recharge"]:
        try:
            response = requests.delete(
                f"{BACKEND_URL}/recharges/{created_ids['recharge']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Delete recharge", success, response.json())
        except Exception as e:
            print_test_result("Delete recharge", False, error=str(e))
    
    # Delete gare
    if created_ids["gare"]:
        try:
            response = requests.delete(
                f"{BACKEND_URL}/gares/{created_ids['gare']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Delete gare", success, response.json())
        except Exception as e:
            print_test_result("Delete gare", False, error=str(e))
    
    # Delete agency
    if created_ids["agency"]:
        try:
            response = requests.delete(
                f"{BACKEND_URL}/agencies/{created_ids['agency']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Delete agency", success, response.json())
        except Exception as e:
            print_test_result("Delete agency", False, error=str(e))
    
    # Delete zone
    if created_ids["zone"]:
        try:
            response = requests.delete(
                f"{BACKEND_URL}/zones/{created_ids['zone']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Delete zone", success, response.json())
        except Exception as e:
            print_test_result("Delete zone", False, error=str(e))

if __name__ == "__main__":
    print("Starting Burkina Faso Railway Recharge Management System Backend Tests")
    print(f"Backend URL: {BACKEND_URL}")
    
    try:
        run_tests()
        cleanup()
        print("\n✅ All tests completed!")
    except Exception as e:
        print(f"\n❌ Tests failed with error: {str(e)}")
        sys.exit(1)