from setuptools import setup, find_packages

setup(
    name="virtualpytest",
    version="1.0.0",
    description="A modular test automation framework for device testing",
    author="VirtualPyTest Team",
    author_email="team@virtualpytest.com",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.8",
    install_requires=[
        "pymongo>=4.8.0",
        "typing-extensions>=4.0.0",
    ],
    entry_points={
        "console_scripts": [
            "virtualpytest=main:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    include_package_data=True,
    package_data={
        "": ["*.json", "*.md"],
    },
) 