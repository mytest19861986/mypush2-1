import urllib.request
import json
import time
import sys

# Ensure UTF-8 output encoding for Windows consoles
sys.stdout.reconfigure(encoding='utf-8')

base = 'http://localhost:3002'

def test_endpoint(name, url, method='GET', data=None, headers=None):
    if headers is None:
        headers = {}
    if data:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    else:
        body = None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            print(f'[{name}] SUCCESS: status={resp.status}')
            try:
                j = json.loads(content)
                print(f'   success={j.get("success")}, message={j.get("message")}')
                return j
            except Exception:
                return content
    except urllib.error.HTTPError as e:
        content = e.read().decode('utf-8')
        print(f'[{name}] HTTP RESPONSE: status={e.code}')
        try:
            j = json.loads(content)
            print(f'   error={j.get("error")}')
            return j
        except Exception:
            print(f'   raw={content[:150]}')
            return content

print("=== STARTING QA AUDIT ON PORT 3002 ===")

# 1. Admin login test
admin_login = test_endpoint('1. Admin Login', f'{base}/api/v1/auth/login', 'POST', {'mobile': '09999999999', 'password': 'Admin@123456'})
admin_token = None
if isinstance(admin_login, dict):
    admin_token = admin_login.get('data', {}).get('accessToken')
print(f"Admin Token obtained: {bool(admin_token)}")

# 2. Regular user registration test
rand_mobile = f'0935{int(time.time()) % 10000000:07d}'
print(f"Registering user with mobile: {rand_mobile}")
reg_res = test_endpoint('2. User Register', f'{base}/api/v1/auth/register', 'POST', {
    'mobile': rand_mobile,
    'otpCode': '12345',
    'password': 'Password123!',
    'firstName': 'تست',
    'lastName': 'هات‌فیکس'
})

# 3. Regular user password login test (with correct password)
user_login = test_endpoint('3. User Password Login', f'{base}/api/v1/auth/login', 'POST', {
    'mobile': rand_mobile,
    'password': 'Password123!'
})

# 4. Wrong password test (expect 401)
wrong_login = test_endpoint('4. User Wrong Password', f'{base}/api/v1/auth/login', 'POST', {
    'mobile': rand_mobile,
    'password': 'WrongPassword!'
})

# 5. Doctor registration test (Needs user session first)
doc_user_mobile = f'0936{int(time.time()) % 10000000:07d}'
print(f"Registering base user for doctor with mobile: {doc_user_mobile}")
doc_user_reg = test_endpoint('5a. Doctor Base User Register', f'{base}/api/v1/auth/register', 'POST', {
    'mobile': doc_user_mobile,
    'otpCode': '12345',
    'password': 'DoctorPass123!',
    'firstName': 'دکتر آرش',
    'lastName': 'امیدی'
})
doc_user_token = None
if isinstance(doc_user_reg, dict):
    doc_user_token = doc_user_reg.get('data', {}).get('accessToken')

if doc_user_token:
    doc_headers = {'Authorization': f'Bearer {doc_user_token}'}
    doc_reg = test_endpoint('5b. Doctor Profile Submit', f'{base}/api/v1/doctor/register', 'POST', {
        'medicalCode': f'MED-{int(time.time()) % 100000:05d}',
        'specialty': 'دندانپزشکی ترمیمی',
        'clinicName': 'کلینیک دندان امید',
        'clinicAddress': 'تهران ولیعصر',
        'city': 'تهران',
        'province': 'تهران',
        'phone': '02188889999',
        'bio': 'متخصص دندانپزشکی با ۱۰ سال سابقه'
    }, headers=doc_headers)

# 6. Admin GET Users
if admin_token:
    headers = {'Authorization': f'Bearer {admin_token}'}
    users_res = test_endpoint('6. Admin GET Users', f'{base}/api/v1/users?limit=5', 'GET', headers=headers)
    
    # 7. Admin GET Doctors
    doctors_res = test_endpoint('7. Admin GET Doctors', f'{base}/api/v1/doctors?limit=5', 'GET', headers=headers)
    
    # 8. Test User Status and Details
    if isinstance(users_res, dict) and users_res.get('data'):
        first_user = users_res['data'][0]
        u_id = first_user['id']
        u_detail = test_endpoint('8. Admin GET User Details', f'{base}/api/v1/users/{u_id}', 'GET', headers=headers)
        u_edit = test_endpoint('9. Admin PATCH User Edit', f'{base}/api/v1/users/{u_id}', 'PATCH', data={'firstName': 'کاربر_ویرایش'}, headers=headers)
    
    # 9. Test Doctor Status and Details
    if isinstance(doctors_res, dict) and doctors_res.get('data'):
        first_doc = doctors_res['data'][0]
        d_id = first_doc['id']
        d_detail = test_endpoint('10. Admin GET Doctor Details', f'{base}/api/v1/doctors/{d_id}', 'GET', headers=headers)
        d_edit = test_endpoint('11. Admin PATCH Doctor Edit', f'{base}/api/v1/doctors/{d_id}', 'PATCH', data={'specialty': 'متخصص جراحی و ایمپلنت'}, headers=headers)

print("=== QA AUDIT RUN COMPLETED ===")
