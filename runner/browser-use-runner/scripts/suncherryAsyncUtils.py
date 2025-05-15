import re
from playwright.async_api import Page
from datetime import datetime

async def go_back(page: Page, trace_folder: str):
    print("go back")
    await page.go_back('domcontentloaded')
    await page.wait_for_timeout(10000)
    await take_screenshot(page, trace_folder, 'go_back')


async def get_element_id(page: Page, aria_label: str):
   # Locate the element inside the shadow DOM
    element = page.locator(f'flt-semantics[aria-label*="{aria_label}"]')
    # Get the 'id' attribute
    element_id = await element.get_attribute('id')
    print(f"Element ID: {element_id} for aria-label: {aria_label}")
    return element_id

async def take_screenshot(page: Page, trace_subfolder: str, name: str = 'screenshot') -> str:
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    screenshot_path = f"{trace_subfolder}/{name.replace(' ', '_')}_{timestamp}.png"
    try:
        await page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
        print(f"Screenshot saved to: {screenshot_path}")
        return screenshot_path
    except Exception as e:
        print(f"Error taking screenshot: {str(e)}")
        return ''

async def activate_semantic_placeholder(page: Page, trace_folder: str):
    shadow_root_selector = 'body > flutter-view > flt-glass-pane'
    element_inside_shadow_dom_selector = 'flt-semantics-placeholder'
    await take_screenshot(page, trace_folder, 'semantic_placeholder_start')
    try:
        flutter_view_present = await page.locator(shadow_root_selector).count() > 0
        print(f"Page state check: Flutter view present: {flutter_view_present}")
        if not flutter_view_present:
            print("Skipping semantic placeholder activation as flutter view is not present.")
            return False
        await page.wait_for_selector(shadow_root_selector, state="hidden", timeout=10000)
        clicked = await page.evaluate(
            '''
                ([shadowRootSelector, elementSelector]) => {
                    const shadowHost = document.querySelector(shadowRootSelector);
                    if (shadowHost) {
                        const shadowRoot = shadowHost.shadowRoot;
                        if (shadowRoot) {
                            const element = shadowRoot.querySelector(elementSelector);
                            if (element) {
                                element.click();
                                return true;
                            }
                        }
                    }
                    return false;
                }
            ''', [shadow_root_selector, element_inside_shadow_dom_selector])

        if clicked:
            print("Semantic placeholder activated.")
            await take_screenshot(page, trace_folder, 'semantic_placeholder_end')
            return True
        else:
            print("Error activating semantic placeholder")
            await take_screenshot(page, trace_folder, 'semantic_placeholder_error')
            return False
    except Exception as e:
        print(f"Error in semantic placeholder activation: {str(e)}")
        await take_screenshot(page, trace_folder, 'semantic_placeholder_error')
        return False


async def pass_login(page: Page, trace_folder: str):
    try:
        await activate_semantic_placeholder(page, trace_folder)
        await page.wait_for_timeout(2000)
        await page.wait_for_selector("#flt-semantic-node-6", state="visible")
        await page.click("#flt-semantic-node-6")
        print('Login screen skipped')
        await page.wait_for_timeout(10000)
        return True
    except Exception as e:
        print(f'Login screen not shown or skipped: {str(e)}')
        return True

async def tvguide_livetv_zap(page: Page, trace_folder: str, aria_label: str = 'SRF 1'):
    await take_screenshot(page, trace_folder, 'tvguide_livetv')
    await page.locator(f'[aria-label*="{aria_label}"]').click()
    await page.wait_for_timeout(5000)
    await take_screenshot(page, trace_folder, 'click_channel')
    return True

async def login(page: Page, url: str, username: str, password: str, trace_folder: str):
    print(f"Debug: Username in login: {username}")
    print(f"Debug: Password in login: {password}")
    if not username or not password:
        raise ValueError("Username and password must be provided")

    activate_semantic_placeholder(page, trace_folder)
    await page.wait_for_timeout(2000)

    await page.wait_for_selector("#onetrust-accept-btn-handler", state="visible")
    await page.wait_for_timeout(1000)
    print("Accept cookies")
    await take_screenshot(page, trace_folder, 'accept_cookies')
    await page.locator("#onetrust-accept-btn-handler").click()
    
    await page.wait_for_selector("#flt-semantic-node-6", state="visible")
    await page.wait_for_timeout(1000)
    print("Click on username")
    await page.locator("#flt-semantic-node-6").click()

    await page.wait_for_selector("#username", state="visible")
    await page.wait_for_timeout(1000)
    print("Fill username")
    await page.locator("#username").fill(username)
    await page.locator("#username").press("Tab")

    await page.wait_for_selector("#password", state="visible")
    await page.wait_for_timeout(1000)
    print("Fill password")
    await page.locator("#password").fill(password)

    await page.wait_for_selector("#kc-login", state="visible")
    await take_screenshot(page, trace_folder, 'Filled username and password')
    await page.wait_for_timeout(1000)
    print("Click on login")
    await page.locator("#kc-login").click()
 
    print("Wait for 10 seconds")
    await page.wait_for_timeout(15000)
    take_screenshot(page, trace_folder, 'wait for home')
    # Log cookies before reload for debugging
    cookies_before = await page.context.cookies()
    print(f"Cookies before reload: {len(cookies_before)} cookies found")
    return await is_logged_in(page, trace_folder)

async def is_logged_in(page: Page, trace_folder: str):
    activate_semantic_placeholder(page, trace_folder)
    await page.wait_for_timeout(1000)

    try:
        element = await page.get_by_label(re.compile("Profil", re.IGNORECASE))
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