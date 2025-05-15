import re
from playwright.sync_api import Page
from utils import take_screenshot, activate_semantic_placeholder

def go_back(page: Page, trace_folder: str):
    print("go back")
    page.goBack('domcontentloaded')
    page.wait_for_timeout(10000)
    take_screenshot(page, trace_folder, 'go_back')


def get_element_id(page: Page, aria_label: str):
   # Locate the element inside the shadow DOM
    element = page.locator(f'flt-semantics[aria-label*="{aria_label}"]')
    # Get the 'id' attribute
    element_id = element.get_attribute('id')
    print(f"Element ID: {element_id} for aria-label: {aria_label}")
    return element_id


def pass_login(page: Page, trace_folder: str):
    try:
        activate_semantic_placeholder(page, trace_folder)
        page.wait_for_timeout(2000)
        page.wait_for_selector("#flt-semantic-node-6", state="visible")
        page.click("#flt-semantic-node-6")
        print('Login screen skipped')
        page.wait_for_timeout(10000)
        return True
    except Exception as e:
        print(f'Login screen not shown or skipped: {str(e)}')
        return True

def tvguide_livetv_zap(page: Page, trace_folder: str, aria_label: str = 'SRF 1'):
    take_screenshot(page, trace_folder, 'tvguide_livetv')
    page.locator(f'[aria-label*="{channel}"]').click()
    page.wait_for_timeout(5000)
    take_screenshot(page, trace_folder, 'click_channel')
    return True

def login(page: Page, url: str, username: str, password: str, trace_folder: str):
    print(f"Debug: Username in login: {username}")
    print(f"Debug: Password in login: {password}")
    if not username or not password:
        raise ValueError("Username and password must be provided")

    activate_semantic_placeholder(page, trace_folder)
    page.wait_for_timeout(2000)

    page.wait_for_selector("#onetrust-accept-btn-handler", state="visible")
    page.wait_for_timeout(1000)
    print("Accept cookies")
    take_screenshot(page, trace_folder, 'accept_cookies')
    page.locator("#onetrust-accept-btn-handler").click()
    
    page.wait_for_selector("#flt-semantic-node-6", state="visible")
    page.wait_for_timeout(1000)
    print("Click on username")
    page.locator("#flt-semantic-node-6").click()

    page.wait_for_selector("#username", state="visible")
    page.wait_for_timeout(1000)
    print("Fill username")
    page.locator("#username").fill(username)
    page.locator("#username").press("Tab")

    page.wait_for_selector("#password", state="visible")
    page.wait_for_timeout(1000)
    print("Fill password")
    page.locator("#password").fill(password)

    page.wait_for_selector("#kc-login", state="visible")
    take_screenshot(page, trace_folder, 'Filled username and password')
    page.wait_for_timeout(1000)
    print("Click on login")
    page.locator("#kc-login").click()
 
    print("Wait for 10 seconds")
    page.wait_for_timeout(15000)
    take_screenshot(page, trace_folder, 'wait for home')
    # Log cookies before reload for debugging
    cookies_before = page.context.cookies()
    print(f"Cookies before reload: {len(cookies_before)} cookies found")
    
    return is_logged_in(page, trace_folder)

def is_logged_in(page: Page, trace_folder: str):
    activate_semantic_placeholder(page, trace_folder)
    page.wait_for_timeout(1000)

    try:
        element = page.get_by_label(re.compile("Profil", re.IGNORECASE))
        if element.count() > 0 and element.is_visible():
            print('Test Success, Login successful')
            take_screenshot(page, trace_folder, 'login_success')
            return True
        else:
            print('Test Failed, Login failed')
            take_screenshot(page, trace_folder, 'login_failed')
            return False
    except Exception as e:
        print(f'Test Failed, Login failed: {str(e)}')
        take_screenshot(page, trace_folder, 'login_failed')
        return False