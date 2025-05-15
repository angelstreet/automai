import re
from playwright.sync_api import Page
from utils import take_screenshot, activate_semantic_placeholder

def go_back(page: Page, trace_folder: str):
    print("** go_back **")
    page.goBack('domcontentloaded')
    page.wait_for_timeout(10000)
    take_screenshot(page, trace_folder, 'go_back')


def get_element_id(page: Page, aria_label: str):
    print("** get_element_id **")
   # Locate the element inside the shadow DOM
    element = page.locator(f'flt-semantics[aria-label*="{aria_label}"]')
    # Get the 'id' attribute
    element_id = element.get_attribute('id')
    print(f"Element ID: {element_id} for aria-label: {aria_label}")
    return element_id

def pass_install_app(page: Page, trace_folder: str):
    try:
        page.wait_for_selector("aria-label=NICHT JETZT", state="visible", timeout=2000)
        print('App download screen')
        take_screenshot(page, trace_folder, 'app_download_screen')
        page.click("aria-label=NICHT JETZT")
        page.wait_for_timeout(1000)
        print('App download screen skipped')
    except Exception as e:
        print(f'App download screen not shown or skipped: {str(e)}')

def pass_login(page: Page, trace_folder: str):
    print("** pass_login **")
    try:
        activate_semantic_placeholder(page, trace_folder)
        page.wait_for_timeout(1000)
        page.wait_for_selector("#flt-semantic-node-6", state="visible")
        page.click("#flt-semantic-node-6")
        print('Login screen skipped')

        pass_install_app(page, trace_folder)

        page.wait_for_timeout(10000)
    except Exception as e:
        print(f'Login screen not shown or skipped: {str(e)}')
        return True

def tvguide_livetv_zap(page: Page, trace_folder: str, aria_label: str = 'SRF 1'):
    print("** tvguide_livetv_zap **")
    take_screenshot(page, trace_folder, 'tvguide_livetv')
    page.locator(f'[aria-label*="{aria_label}"]').click()
    page.wait_for_timeout(5000)
    take_screenshot(page, trace_folder, 'click_channel')
    return True

def login(page: Page, url: str, username: str, password: str, trace_folder: str):
    print("** login **")
    activate_semantic_placeholder(page, trace_folder)
    page.wait_for_timeout(2000)
    try :
        page.wait_for_selector("#onetrust-accept-btn-handler", state="visible", timeout=1000)
        print("Accept cookies")
        take_screenshot(page, trace_folder, 'accept_cookies')
        page.locator("#onetrust-accept-btn-handler").click()
        page.wait_for_timeout(2000)
    except Exception as e:
        print(f'Cookies pop up not shown: {str(e)}')
    
    print("Click on login button")
    page.wait_for_selector("#flt-semantic-node-6", state="visible")
    page.locator("#flt-semantic-node-6").click()

    print("Click on username")
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
    page.wait_for_timeout(3000)
    pass_install_app(page, trace_folder)
    
    print("Wait for 15 seconds")
    page.wait_for_timeout(15000)
    take_screenshot(page, trace_folder, 'wait for home')
    # Log cookies before reload for debugging
    cookies_before = page.context.cookies()
    print(f"Cookies before reload: {len(cookies_before)} cookies found")
    
    return is_logged_in(page, url, trace_folder)

def is_logged_in(page: Page, url: str, trace_folder: str):
    print("** is_logged_in **")
    print(f"Current Page url: {page.url}, destination url: {url}")
    if page.url != url:
        print(f"Navigating to {url}")
        page.goto(url, timeout=20000)
        page.wait_for_timeout(5000)
    

    try:
        activate_semantic_placeholder(page, trace_folder)
        page.wait_for_timeout(1000)
        element = page.get_by_label(re.compile("Profil", re.IGNORECASE))
        if element.count() > 0 and element.is_visible():
            print('User is logged in')
            take_screenshot(page, trace_folder, 'login_success')
            return True
        else:
            print('User is not logged in')
            take_screenshot(page, trace_folder, 'login_failed')
            return False
    except Exception as e:
        print(f'Is logged in check failed: {str(e)}')
        take_screenshot(page, trace_folder, 'login_failed')
        return False