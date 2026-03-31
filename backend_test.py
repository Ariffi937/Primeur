import requests
import sys
from datetime import datetime

class PrimeurBoudalAPITester:
    def __init__(self, base_url="https://produce-platform.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login with correct credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={"username": "ishaqRR", "password": "Boudal@2026!Secure"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_auth_me(self):
        """Test GET /api/auth/me with Bearer token"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "api/auth/me",
            200
        )
        if success:
            print(f"   User: {response.get('name', 'N/A')} - Role: {response.get('role', 'N/A')}")
        return success

    def test_get_products(self):
        """Test GET /api/products returns active products"""
        success, response = self.run_test(
            "Get Products",
            "GET",
            "api/products",
            200
        )
        if success:
            products_count = len(response) if isinstance(response, list) else 0
            print(f"   Found {products_count} active products")
            if products_count == 55:
                print("   ✅ Correct number of products (55)")
            else:
                print(f"   ⚠️  Expected 55 products, got {products_count}")
        return success

    def test_get_subcategory_images(self):
        """Test GET /api/subcategory-images"""
        success, response = self.run_test(
            "Get Subcategory Images",
            "GET",
            "api/subcategory-images",
            200
        )
        if success:
            images_count = len(response) if isinstance(response, dict) else 0
            print(f"   Found {images_count} subcategory images")
        return success

    def test_create_order(self):
        """Test POST /api/orders creates order with especes payment"""
        order_data = {
            "customer_name": "Test Customer",
            "customer_phone": "0123456789",
            "customer_email": "test@example.com",
            "customer_address": "123 Rue Test, Nimes",
            "delivery_method": "livraison",
            "payment_method": "especes",
            "global_comment": "Test order",
            "total_amount": 25.50,
            "items": [
                {
                    "product_id": "test-product-1",
                    "product_name": "Pomme Gala",
                    "quantity": 1.0,
                    "mode": "weight",
                    "item_note": "Test item",
                    "line_total": 25.50
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Order with Email (Phase 2)",
            "POST",
            "api/orders",
            200,
            data=order_data
        )
        if success:
            order_id = response.get('id')
            customer_email = response.get('customer_email')
            print(f"   Order created with ID: {order_id}")
            print(f"   Customer email stored: {customer_email}")
            if customer_email == "test@example.com":
                print("   ✅ Email field correctly stored")
            else:
                print(f"   ⚠️  Email mismatch: expected test@example.com, got {customer_email}")
            return order_id
        return None

    def test_get_orders(self):
        """Test GET /api/orders (admin) returns orders list"""
        success, response = self.run_test(
            "Get Orders (Admin)",
            "GET",
            "api/orders",
            200
        )
        if success:
            orders_count = len(response) if isinstance(response, list) else 0
            print(f"   Found {orders_count} orders")
        return success

    def test_get_order_detail(self, order_id):
        """Test GET /api/orders/{id} returns order detail with customer_email"""
        if not order_id:
            print("❌ No order ID available for detail test")
            return False
            
        success, response = self.run_test(
            "Get Order Detail (with Email)",
            "GET",
            f"api/orders/{order_id}",
            200
        )
        if success:
            customer_email = response.get('customer_email')
            print(f"   Order detail retrieved")
            print(f"   Customer email in detail: {customer_email}")
            if customer_email == "test@example.com":
                print("   ✅ Email field correctly retrieved in order detail")
            else:
                print(f"   ⚠️  Email mismatch in detail: expected test@example.com, got {customer_email}")
        return success

    def test_update_order_status(self, order_id):
        """Test PUT /api/orders/{id}/status updates order status"""
        if not order_id:
            print("❌ No order ID available for status update test")
            return False
            
        success, response = self.run_test(
            "Update Order Status",
            "PUT",
            f"api/orders/{order_id}/status",
            200,
            data={"status": "processing"}
        )
        if success:
            print(f"   Status updated to: processing")
        return success

def main():
    print("🚀 Starting Primeur BOUDAL API Tests")
    print("=" * 50)
    
    # Setup
    tester = PrimeurBoudalAPITester()
    
    # Test sequence
    print("\n📋 Testing Authentication...")
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    if not tester.test_auth_me():
        print("❌ Auth verification failed")
        return 1
    
    print("\n📋 Testing Product APIs...")
    tester.test_get_products()
    tester.test_get_subcategory_images()
    
    print("\n📋 Testing Order APIs...")
    order_id = tester.test_create_order()
    tester.test_get_orders()
    
    if order_id:
        tester.test_get_order_detail(order_id)
        tester.test_update_order_status(order_id)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"\n✨ Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())