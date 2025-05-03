import requests
import os

def main():
    print("Hello, World!")
    print(f"Requests version: {requests.__version__}")
    ftp_server = os.getenv('FTP_SERVER', 'Not set')
    print(f"FTP_SERVER: {ftp_server}")
    print("Test Success")
    return 0

if __name__ == "__main__":
    exit(main())