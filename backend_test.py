import requests
import sys
import time
import json
from datetime import datetime

class WarehouseRobotAPITester:
    def __init__(self, base_url="https://warehouse-bot-aid.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=10):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data}"
                except:
                    details += f" - {response.text[:200]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_get_robots(self):
        """Test getting all robots"""
        success, response = self.run_test("Get All Robots", "GET", "robots", 200)
        if success:
            robots = response
            if len(robots) == 10:
                print(f"   ✓ Found expected 10 robots")
                # Check robot structure
                robot = robots[0]
                required_fields = ['bot_id', 'status', 'battery', 'position_x', 'position_y']
                missing_fields = [field for field in required_fields if field not in robot]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in robot data: {missing_fields}")
                else:
                    print(f"   ✓ Robot data structure is correct")
                return True, robots
            else:
                print(f"   ❌ Expected 10 robots, got {len(robots)}")
        return success, response

    def test_get_single_robot(self, bot_id):
        """Test getting a single robot"""
        return self.run_test(f"Get Robot {bot_id}", "GET", f"robots/{bot_id}", 200)

    def test_simulate_robots(self):
        """Test robot simulation"""
        return self.run_test("Simulate Robots", "POST", "robots/simulate", 200)

    def test_copilot_ask(self, error_code="ERR_001"):
        """Test AI copilot functionality"""
        success, response = self.run_test(
            "Ask AI Copilot", 
            "POST", 
            "copilot/ask", 
            200,
            data={"error_code": error_code, "bot_id": "BOT-001"}
        )
        
        if success:
            required_fields = ['error_code', 'title', 'description', 'recovery_steps']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️  Missing fields in copilot response: {missing_fields}")
            else:
                print(f"   ✓ Copilot response structure is correct")
                if response.get('llm_explanation'):
                    print(f"   ✓ LLM explanation provided")
                else:
                    print(f"   ⚠️  No LLM explanation (may indicate LLM integration issue)")
        
        return success, response

    def test_clear_error(self, bot_id):
        """Test clearing robot error"""
        return self.run_test(f"Clear Error {bot_id}", "POST", f"robots/{bot_id}/clear-error", 200)

    def test_invalid_endpoints(self):
        """Test error handling for invalid requests"""
        # Test invalid robot ID
        self.run_test("Invalid Robot ID", "GET", "robots/INVALID", 404)
        
        # Test invalid error code
        self.run_test("Invalid Error Code", "POST", "copilot/ask", 404, 
                     data={"error_code": "INVALID", "bot_id": "BOT-001"})

def main():
    print("🤖 Starting Warehouse Robot API Tests...")
    print("=" * 50)
    
    tester = WarehouseRobotAPITester()
    
    # Test API root
    tester.test_api_root()
    
    # Test robot endpoints
    success, robots = tester.test_get_robots()
    
    if success and robots:
        # Test getting individual robot
        first_robot = robots[0]
        tester.test_get_single_robot(first_robot['bot_id'])
        
        # Test simulation
        tester.test_simulate_robots()
        
        # Wait a moment and check if robots updated
        print("\n⏳ Waiting 2 seconds to check simulation effects...")
        time.sleep(2)
        success2, robots2 = tester.test_get_robots()
        
        if success2:
            # Check if any robot states changed
            changed = False
            for i, robot in enumerate(robots2):
                if robot['battery'] != robots[i]['battery'] or robot['status'] != robots[i]['status']:
                    changed = True
                    break
            
            if changed:
                print("   ✓ Simulation is working - robot states changed")
            else:
                print("   ⚠️  Simulation may not be working - no state changes detected")
    
    # Test AI Copilot
    tester.test_copilot_ask()
    
    # Test error clearing (use first robot)
    if robots:
        tester.test_clear_error(robots[0]['bot_id'])
    
    # Test error handling
    tester.test_invalid_endpoints()
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Summary: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - check details above")
        return 1

if __name__ == "__main__":
    sys.exit(main())