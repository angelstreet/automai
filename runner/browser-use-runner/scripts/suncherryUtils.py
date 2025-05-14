from playwright.sync_api import Page

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


def tvguide_livetv_zap(page: Page, trace_folder: str, aria_label: str = 'SRF 1'):
    take_screenshot(page, trace_folder, 'tvguide_livetv')
    page.locator(f'[aria-label*="{channel}"]').click()
    page.wait_for_timeout(5000)
    take_screenshot(page, trace_folder, 'click_channel')
    return True