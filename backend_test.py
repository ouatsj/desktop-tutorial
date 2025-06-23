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
    test_connection_lines_system()  # New test for connection lines
    test_extended_fiber_operators()  # New test for fiber operators
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
    
    # Test update zone (super_admin)
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
            print_test_result("Update zone (super_admin)", success, response.json())
        except Exception as e:
            print_test_result("Update zone (super_admin)", False, error=str(e))
    
    # Test update zone with zone_admin (should fail)
    if created_ids["zone"]:
        try:
            response = requests.put(
                f"{BACKEND_URL}/zones/{created_ids['zone']}",
                headers={"Authorization": f"Bearer {tokens['zone_admin']}"},
                json={
                    "name": "Zone Ouest Burkina (Unauthorized Update)",
                    "description": "Tentative de mise à jour non autorisée"
                }
            )
            success = response.status_code == 403  # Should be forbidden
            print_test_result("Update zone (zone_admin)", success, response.json())
        except Exception as e:
            print_test_result("Update zone (zone_admin)", False, error=str(e))
    
    # Create a second zone for delete testing
    second_zone_id = None
    try:
        response = requests.post(
            f"{BACKEND_URL}/zones",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json={
                "name": "Zone Test Pour Suppression",
                "description": "Zone créée pour tester la suppression"
            }
        )
        success = response.status_code == 200
        if success:
            second_zone_id = response.json()["id"]
        print_test_result("Create second zone for delete testing", success, response.json())
    except Exception as e:
        print_test_result("Create second zone for delete testing", False, error=str(e))
    
    # Test delete zone (super_admin)
    if second_zone_id:
        try:
            response = requests.delete(
                f"{BACKEND_URL}/zones/{second_zone_id}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Delete zone (super_admin)", success, response.json())
        except Exception as e:
            print_test_result("Delete zone (super_admin)", False, error=str(e))
    
    # Test delete zone with zone_admin (should fail)
    if created_ids["zone"]:
        try:
            response = requests.delete(
                f"{BACKEND_URL}/zones/{created_ids['zone']}",
                headers={"Authorization": f"Bearer {tokens['zone_admin']}"}
            )
            success = response.status_code == 403  # Should be forbidden
            print_test_result("Delete zone (zone_admin)", success, response.json())
        except Exception as e:
            print_test_result("Delete zone (zone_admin)", False, error=str(e))

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
    
    # Test update agency (super_admin)
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
            print_test_result("Update agency (super_admin)", success, response.json())
        except Exception as e:
            print_test_result("Update agency (super_admin)", False, error=str(e))
    
    # Test update agency (zone_admin)
    if created_ids["agency"]:
        try:
            response = requests.put(
                f"{BACKEND_URL}/agencies/{created_ids['agency']}",
                headers={"Authorization": f"Bearer {tokens['zone_admin']}"},
                json={
                    "name": "Agence Bobo-Dioulasso (Zone Admin Update)",
                    "description": "Mise à jour par l'administrateur de zone",
                    "zone_id": created_ids["zone"]
                }
            )
            success = response.status_code == 200
            print_test_result("Update agency (zone_admin)", success, response.json())
        except Exception as e:
            print_test_result("Update agency (zone_admin)", False, error=str(e))
    
    # Test update agency (field_agent - should fail)
    if created_ids["agency"]:
        try:
            response = requests.put(
                f"{BACKEND_URL}/agencies/{created_ids['agency']}",
                headers={"Authorization": f"Bearer {tokens['field_agent']}"},
                json={
                    "name": "Agence Bobo-Dioulasso (Field Agent Update)",
                    "description": "Tentative de mise à jour non autorisée",
                    "zone_id": created_ids["zone"]
                }
            )
            success = response.status_code == 403  # Should be forbidden
            print_test_result("Update agency (field_agent)", success, response.json())
        except Exception as e:
            print_test_result("Update agency (field_agent)", False, error=str(e))
    
    # Create a second agency for delete testing
    second_agency_id = None
    try:
        response = requests.post(
            f"{BACKEND_URL}/agencies",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json={
                "name": "Agence Test Pour Suppression",
                "description": "Agence créée pour tester la suppression",
                "zone_id": created_ids["zone"]
            }
        )
        success = response.status_code == 200
        if success:
            second_agency_id = response.json()["id"]
        print_test_result("Create second agency for delete testing", success, response.json())
    except Exception as e:
        print_test_result("Create second agency for delete testing", False, error=str(e))
    
    # Test delete agency (super_admin)
    if second_agency_id:
        try:
            response = requests.delete(
                f"{BACKEND_URL}/agencies/{second_agency_id}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Delete agency (super_admin)", success, response.json())
        except Exception as e:
            print_test_result("Delete agency (super_admin)", False, error=str(e))
    
    # Test delete agency (zone_admin)
    if created_ids["agency"]:
        # First create another agency to delete
        try:
            response = requests.post(
                f"{BACKEND_URL}/agencies",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"},
                json={
                    "name": "Agence Test Pour Suppression Zone Admin",
                    "description": "Agence créée pour tester la suppression par zone admin",
                    "zone_id": created_ids["zone"]
                }
            )
            success = response.status_code == 200
            if success:
                zone_admin_agency_id = response.json()["id"]
                
                # Now try to delete it with zone_admin
                try:
                    response = requests.delete(
                        f"{BACKEND_URL}/agencies/{zone_admin_agency_id}",
                        headers={"Authorization": f"Bearer {tokens['zone_admin']}"}
                    )
                    success = response.status_code == 200
                    print_test_result("Delete agency (zone_admin)", success, response.json())
                except Exception as e:
                    print_test_result("Delete agency (zone_admin)", False, error=str(e))
            else:
                print_test_result("Create agency for zone_admin delete test", False, response.json())
        except Exception as e:
            print_test_result("Create agency for zone_admin delete test", False, error=str(e))
    
    # Test delete agency (field_agent - should fail)
    if created_ids["agency"]:
        try:
            response = requests.delete(
                f"{BACKEND_URL}/agencies/{created_ids['agency']}",
                headers={"Authorization": f"Bearer {tokens['field_agent']}"}
            )
            success = response.status_code == 403  # Should be forbidden
            print_test_result("Delete agency (field_agent)", success, response.json())
        except Exception as e:
            print_test_result("Delete agency (field_agent)", False, error=str(e))

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
    
    # Test update gare (super_admin)
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
            print_test_result("Update gare (super_admin)", success, response.json())
        except Exception as e:
            print_test_result("Update gare (super_admin)", False, error=str(e))
    
    # Test update gare (zone_admin)
    if created_ids["gare"]:
        try:
            response = requests.put(
                f"{BACKEND_URL}/gares/{created_ids['gare']}",
                headers={"Authorization": f"Bearer {tokens['zone_admin']}"},
                json={
                    "name": "Gare Centrale de Bobo (Zone Admin Update)",
                    "description": "Mise à jour par l'administrateur de zone",
                    "agency_id": created_ids["agency"]
                }
            )
            success = response.status_code == 200
            print_test_result("Update gare (zone_admin)", success, response.json())
        except Exception as e:
            print_test_result("Update gare (zone_admin)", False, error=str(e))
    
    # Test update gare (field_agent)
    if created_ids["gare"]:
        try:
            response = requests.put(
                f"{BACKEND_URL}/gares/{created_ids['gare']}",
                headers={"Authorization": f"Bearer {tokens['field_agent']}"},
                json={
                    "name": "Gare Centrale de Bobo (Field Agent Update)",
                    "description": "Mise à jour par l'agent de terrain",
                    "agency_id": created_ids["agency"]
                }
            )
            success = response.status_code == 200
            print_test_result("Update gare (field_agent)", success, response.json())
        except Exception as e:
            print_test_result("Update gare (field_agent)", False, error=str(e))
    
    # Create a second gare for delete testing
    second_gare_id = None
    try:
        response = requests.post(
            f"{BACKEND_URL}/gares",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json={
                "name": "Gare Test Pour Suppression",
                "description": "Gare créée pour tester la suppression",
                "agency_id": created_ids["agency"]
            }
        )
        success = response.status_code == 200
        if success:
            second_gare_id = response.json()["id"]
        print_test_result("Create second gare for delete testing", success, response.json())
    except Exception as e:
        print_test_result("Create second gare for delete testing", False, error=str(e))
    
    # Test delete gare (super_admin)
    if second_gare_id:
        try:
            response = requests.delete(
                f"{BACKEND_URL}/gares/{second_gare_id}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Delete gare (super_admin)", success, response.json())
        except Exception as e:
            print_test_result("Delete gare (super_admin)", False, error=str(e))

def test_connection_lines_system():
    """Test connection lines system"""
    print_header("CONNECTION LINES SYSTEM TESTS")
    
    if not created_ids["gare"]:
        print("❌ Cannot test connections without a gare ID")
        return
    
    # Create test connection data with gare ID
    connection_data = TEST_CONNECTION.copy()
    connection_data["gare_id"] = created_ids["gare"]
    
    # Test connection creation
    try:
        response = requests.post(
            f"{BACKEND_URL}/connections",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json=connection_data
        )
        success = response.status_code == 200
        if success:
            created_ids["connection"] = response.json()["id"]
        print_test_result("Create connection", success, response.json())
    except Exception as e:
        print_test_result("Create connection", False, error=str(e))
    
    # Test duplicate line number (should fail)
    try:
        response = requests.post(
            f"{BACKEND_URL}/connections",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json=connection_data  # Same data with same line number
        )
        success = response.status_code == 400  # Should fail with 400 Bad Request
        print_test_result("Create duplicate line number (should fail)", success, response.json())
    except Exception as e:
        print_test_result("Create duplicate line number (should fail)", False, error=str(e))
    
    # Test get all connections
    try:
        response = requests.get(
            f"{BACKEND_URL}/connections",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get all connections", success, response.json())
    except Exception as e:
        print_test_result("Get all connections", False, error=str(e))
    
    # Test get connections by gare_id
    try:
        response = requests.get(
            f"{BACKEND_URL}/connections?gare_id={created_ids['gare']}",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get connections by gare_id", success, response.json())
    except Exception as e:
        print_test_result("Get connections by gare_id", False, error=str(e))
    
    # Test get connections by operator
    try:
        response = requests.get(
            f"{BACKEND_URL}/connections?operator=Orange",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get connections by operator", success, response.json())
    except Exception as e:
        print_test_result("Get connections by operator", False, error=str(e))
    
    # Test get connections by status
    try:
        response = requests.get(
            f"{BACKEND_URL}/connections?status=active",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get connections by status", success, response.json())
    except Exception as e:
        print_test_result("Get connections by status", False, error=str(e))
    
    # Test get connection by ID
    if created_ids["connection"]:
        try:
            response = requests.get(
                f"{BACKEND_URL}/connections/{created_ids['connection']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Get connection by ID", success, response.json())
        except Exception as e:
            print_test_result("Get connection by ID", False, error=str(e))
    
    # Test update connection
    if created_ids["connection"]:
        try:
            # Get the current connection to preserve the line number
            current_connection = requests.get(
                f"{BACKEND_URL}/connections/{created_ids['connection']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            ).json()
            
            response = requests.put(
                f"{BACKEND_URL}/connections/{created_ids['connection']}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"},
                json={
                    "line_number": current_connection["line_number"],  # Keep the same line number
                    "gare_id": created_ids["gare"],
                    "operator": "Telecel",  # Changed from Orange to Telecel
                    "operator_type": "mobile",
                    "connection_type": "Data",  # Changed from Internet to Data
                    "description": "Connexion mise à jour pour test"
                }
            )
            success = response.status_code == 200
            print_test_result("Update connection", success, response.json())
        except Exception as e:
            print_test_result("Update connection", False, error=str(e))
    
    # Create a second connection for delete testing
    second_connection_id = None
    try:
        response = requests.post(
            f"{BACKEND_URL}/connections",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"},
            json={
                "line_number": f"TEST-DELETE-{uuid.uuid4().hex[:4]}",
                "gare_id": created_ids["gare"],
                "operator": "Moov",
                "operator_type": "mobile",
                "connection_type": "Internet",
                "description": "Connexion créée pour tester la suppression"
            }
        )
        success = response.status_code == 200
        if success:
            second_connection_id = response.json()["id"]
        print_test_result("Create second connection for delete testing", success, response.json())
    except Exception as e:
        print_test_result("Create second connection for delete testing", False, error=str(e))
    
    # Test delete connection
    if second_connection_id:
        try:
            response = requests.delete(
                f"{BACKEND_URL}/connections/{second_connection_id}",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"}
            )
            success = response.status_code == 200
            print_test_result("Delete connection", success, response.json())
        except Exception as e:
            print_test_result("Delete connection", False, error=str(e))
    
    # Test delete protection for connection with active recharge
    if created_ids["connection"]:
        # First create a recharge for this connection
        try:
            recharge_data = {
                "connection_id": created_ids["connection"],
                "payment_type": "prepaid",
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
                "volume": "50GB",
                "cost": 25000.0
            }
            
            response = requests.post(
                f"{BACKEND_URL}/recharges",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"},
                json=recharge_data
            )
            success = response.status_code == 200
            print_test_result("Create recharge for connection delete protection test", success, response.json())
            
            # Now try to delete the connection (should fail)
            if success:
                try:
                    response = requests.delete(
                        f"{BACKEND_URL}/connections/{created_ids['connection']}",
                        headers={"Authorization": f"Bearer {tokens['super_admin']}"}
                    )
                    success = response.status_code == 400  # Should fail with 400 Bad Request
                    print_test_result("Delete connection with active recharge (should fail)", success, response.json())
                except Exception as e:
                    print_test_result("Delete connection with active recharge (should fail)", False, error=str(e))
        except Exception as e:
            print_test_result("Create recharge for connection delete protection test", False, error=str(e))

def test_extended_fiber_operators():
    """Test extended fiber operators"""
    print_header("EXTENDED FIBER OPERATORS TESTS")
    
    if not created_ids["gare"]:
        print("❌ Cannot test fiber connections without a gare ID")
        return
    
    # Test creation of connections for each fiber operator
    for fiber_connection in TEST_FIBER_CONNECTIONS:
        fiber_connection_data = fiber_connection.copy()
        fiber_connection_data["gare_id"] = created_ids["gare"]
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/connections",
                headers={"Authorization": f"Bearer {tokens['super_admin']}"},
                json=fiber_connection_data
            )
            success = response.status_code == 200
            if success:
                created_ids["fiber_connections"][fiber_connection["operator"]] = response.json()["id"]
            print_test_result(f"Create {fiber_connection['operator']} connection", success, response.json())
        except Exception as e:
            print_test_result(f"Create {fiber_connection['operator']} connection", False, error=str(e))
    
    # Test prepaid recharges for fiber operators
    for operator, connection_id in created_ids["fiber_connections"].items():
        if connection_id and operator in ["Canalbox", "Faso Net", "Wayodi"]:
            try:
                recharge_data = {
                    "connection_id": connection_id,
                    "payment_type": "prepaid",  # Test prepaid for fiber
                    "start_date": datetime.now().isoformat(),
                    "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
                    "volume": "100Mbps",
                    "cost": 35000.0
                }
                
                response = requests.post(
                    f"{BACKEND_URL}/recharges",
                    headers={"Authorization": f"Bearer {tokens['super_admin']}"},
                    json=recharge_data
                )
                success = response.status_code == 200
                print_test_result(f"Create prepaid recharge for {operator}", success, response.json())
            except Exception as e:
                print_test_result(f"Create prepaid recharge for {operator}", False, error=str(e))
    
    # Test postpaid recharges for fiber operators
    for operator, connection_id in created_ids["fiber_connections"].items():
        if connection_id and operator in ["Onatel Fibre", "Orange Fibre", "Telecel Fibre"]:
            try:
                recharge_data = {
                    "connection_id": connection_id,
                    "payment_type": "postpaid",
                    "start_date": datetime.now().isoformat(),
                    "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
                    "volume": "200Mbps",
                    "cost": 45000.0
                }
                
                response = requests.post(
                    f"{BACKEND_URL}/recharges",
                    headers={"Authorization": f"Bearer {tokens['super_admin']}"},
                    json=recharge_data
                )
                success = response.status_code == 200
                print_test_result(f"Create postpaid recharge for {operator}", success, response.json())
            except Exception as e:
                print_test_result(f"Create postpaid recharge for {operator}", False, error=str(e))
    
    # Test filtering connections by operator type
    try:
        response = requests.get(
            f"{BACKEND_URL}/connections",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        
        if success:
            connections = response.json()
            fiber_connections = [c for c in connections if c["operator_type"] == "fibre"]
            mobile_connections = [c for c in connections if c["operator_type"] == "mobile"]
            
            print(f"Total connections: {len(connections)}")
            print(f"Fiber connections: {len(fiber_connections)}")
            print(f"Mobile connections: {len(mobile_connections)}")
            
            # Check if we have connections for all fiber operators
            fiber_operators = set(c["operator"] for c in fiber_connections)
            print(f"Fiber operators found: {fiber_operators}")
            
            all_fiber_operators = {
                "Onatel Fibre", "Orange Fibre", "Telecel Fibre", 
                "Canalbox", "Faso Net", "Wayodi"
            }
            
            missing_operators = all_fiber_operators - fiber_operators
            if missing_operators:
                print(f"Missing fiber operators: {missing_operators}")
                success = False
        
        print_test_result("Filter connections by operator type", success)
    except Exception as e:
        print_test_result("Filter connections by operator type", False, error=str(e))

def test_recharge_management():
    """Test recharge CRUD operations"""
    print_header("RECHARGE MANAGEMENT TESTS")
    
    if not created_ids["connection"]:
        print("❌ Cannot test recharges without a connection ID")
        return
    
    # Create test recharge data with connection ID
    recharge_data = {
        "connection_id": created_ids["connection"],
        "payment_type": "prepaid",
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "volume": "50GB",
        "cost": 25000.0,
        "description": "Recharge test pour connexion mobile"
    }
    
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
    
    # Test get recharges by connection_id
    try:
        response = requests.get(
            f"{BACKEND_URL}/recharges?connection_id={created_ids['connection']}",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        success = response.status_code == 200
        print_test_result("Get recharges by connection_id", success, response.json())
    except Exception as e:
        print_test_result("Get recharges by connection_id", False, error=str(e))
    
    # Test get recharges by operator
    try:
        response = requests.get(
            f"{BACKEND_URL}/recharges?operator=Telecel",  # We updated the connection to Telecel
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
                    "connection_id": created_ids["connection"],
                    "payment_type": "prepaid",
                    "start_date": datetime.now().isoformat(),
                    "end_date": (datetime.now() + timedelta(days=60)).isoformat(),  # Changed from 30 to 60 days
                    "volume": "100GB",  # Changed from 50GB to 100GB
                    "cost": 45000.0,  # Changed from 25000 to 45000 FCFA
                    "description": "Recharge mise à jour pour test"
                }
            )
            success = response.status_code == 200
            print_test_result("Update recharge", success, response.json())
        except Exception as e:
            print_test_result("Update recharge", False, error=str(e))
    
    # Create an expiring soon recharge (expires in 2 days)
    expiring_recharge_data = {
        "connection_id": created_ids["connection"],
        "payment_type": "prepaid",
        "start_date": datetime.now().isoformat(),
        "end_date": (datetime.now() + timedelta(days=2)).isoformat(),
        "volume": "20GB",
        "cost": 15000.0,
        "description": "Recharge expirant bientôt pour test"
    }
    
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
    expired_recharge_data = {
        "connection_id": created_ids["connection"],
        "payment_type": "prepaid",
        "start_date": (datetime.now() - timedelta(days=40)).isoformat(),
        "end_date": (datetime.now() - timedelta(days=10)).isoformat(),
        "volume": "30GB",
        "cost": 20000.0,
        "description": "Recharge expirée pour test"
    }
    
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
    
    # Test delete recharge
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
            "total_zones", "total_agencies", "total_gares", 
            "total_connections", "total_recharges",
            "active_connections", "inactive_connections",
            "active_recharges", "expiring_recharges", "expired_recharges",
            "operator_stats", "payment_type_stats", "connection_type_stats",
            "pending_alerts"
        ]
        all_fields_present = all(field in stats for field in required_fields)
        
        # Check for new fiber operators in operator_stats
        if success and all_fields_present:
            operator_names = [op["operator"] for op in stats["operator_stats"]]
            new_fiber_operators = ["Canalbox", "Faso Net", "Wayodi"]
            all_fiber_operators_present = all(op in operator_names for op in new_fiber_operators)
            
            if not all_fiber_operators_present:
                print(f"Missing fiber operators in statistics. Found: {operator_names}")
                success = False
            
            # Check connection type stats
            if "connection_type_stats" in stats:
                if "mobile" not in stats["connection_type_stats"] or "fibre" not in stats["connection_type_stats"]:
                    print("Missing mobile or fibre in connection_type_stats")
                    success = False
            
            # Check payment type stats
            if "payment_type_stats" in stats:
                if "prepaid" not in stats["payment_type_stats"] or "postpaid" not in stats["payment_type_stats"]:
                    print("Missing prepaid or postpaid in payment_type_stats")
                    success = False
        
        print_test_result("Get dashboard statistics", success and all_fields_present, stats)
    except Exception as e:
        print_test_result("Get dashboard statistics", False, error=str(e))

def cleanup():
    """Clean up created resources"""
    print_header("CLEANUP")
    
    # Delete recharges
    try:
        response = requests.get(
            f"{BACKEND_URL}/recharges",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        if response.status_code == 200:
            recharges = response.json()
            for recharge in recharges:
                try:
                    delete_response = requests.delete(
                        f"{BACKEND_URL}/recharges/{recharge['id']}",
                        headers={"Authorization": f"Bearer {tokens['super_admin']}"}
                    )
                    print(f"Deleted recharge {recharge['id']}: {delete_response.status_code}")
                except Exception as e:
                    print(f"Error deleting recharge {recharge['id']}: {str(e)}")
    except Exception as e:
        print(f"Error getting recharges for cleanup: {str(e)}")
    
    # Delete connections
    try:
        response = requests.get(
            f"{BACKEND_URL}/connections",
            headers={"Authorization": f"Bearer {tokens['super_admin']}"}
        )
        if response.status_code == 200:
            connections = response.json()
            for connection in connections:
                try:
                    delete_response = requests.delete(
                        f"{BACKEND_URL}/connections/{connection['id']}",
                        headers={"Authorization": f"Bearer {tokens['super_admin']}"}
                    )
                    print(f"Deleted connection {connection['id']}: {delete_response.status_code}")
                except Exception as e:
                    print(f"Error deleting connection {connection['id']}: {str(e)}")
    except Exception as e:
        print(f"Error getting connections for cleanup: {str(e)}")
    
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