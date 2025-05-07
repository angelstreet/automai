import requests
import os

def main():
    print("Hello, World!")
    print(f"Requests version: {requests.__version__}")
    ftp_server = os.getenv('FTP_SERVER', 'Not set')
    print(f"FTP_SERVER: {ftp_server}")
    # Write to a file for testing purposes
    with open('helloworld.txt', 'w') as f:
        f.write('Hello, World! This file was created for testing.')
    print("Created helloworld.txt")
    print("Test Success")
    return 0

if __name__ == "__main__":
    exit(main())