# Resources Directory

This directory contains reference images used by the verification controllers for template matching and visual verification.

## Usage

### Image Verification Controller

The `ImageVerificationController` automatically searches for reference images in this directory when you provide a relative path:

```python
# These are equivalent:
image_verifier.waitForImageToAppear("login_button.png")
image_verifier.waitForImageToAppear("/full/path/to/automai/virtualpytest/src/resources/login_button.png")
```

### Directory Structure

Organize your reference images logically:

```
resources/
├── buttons/
│   ├── login_button.png
│   ├── submit_button.png
│   └── cancel_button.png
├── icons/
│   ├── loading_spinner.png
│   ├── error_icon.png
│   └── success_icon.png
├── screens/
│   ├── login_screen.png
│   ├── dashboard.png
│   └── settings_page.png
└── ui_elements/
    ├── menu_dropdown.png
    ├── search_box.png
    └── notification_popup.png
```

### Best Practices

1. **Naming Convention**: Use descriptive names that clearly indicate what the image represents
2. **File Format**: PNG is recommended for best quality and transparency support
3. **Resolution**: Capture images at the same resolution as your test environment
4. **Unique Elements**: Choose image regions that are unique and unlikely to appear elsewhere
5. **Stable Elements**: Avoid dynamic content like timestamps or counters

### Example Usage

```python
# Initialize image verification controller
image_verifier = ImageVerificationController(hdmi_controller)
image_verifier.connect()

# Wait for UI elements to appear
image_verifier.waitForImageToAppear("buttons/login_button.png", timeout=10.0, confidence=0.8)
image_verifier.waitForImageToAppear("screens/dashboard.png", timeout=15.0, confidence=0.9)

# Wait for elements to disappear
image_verifier.waitForImageToDisappear("icons/loading_spinner.png", timeout=30.0)
```

### Image Capture Tips

1. Use the same display settings as your test environment
2. Capture crisp, clear images without compression artifacts
3. Ensure good contrast between the element and background
4. Consider different states (hover, pressed, disabled) if needed
5. Test your reference images to ensure good matching confidence 