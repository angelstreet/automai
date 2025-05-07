import requests
import os
import argparse

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('--trace_folder', default="", help='Folder path to write trace files')
    args = parser.parse_args()

    print("Hello, World!")
    print(f"Requests version: {requests.__version__}")
    ftp_server = os.getenv('FTP_SERVER', 'Not set')
    print(f"FTP_SERVER: {ftp_server}")
    
    # Construct file path using trace_folder if provided
    file_path = os.path.join(args.trace_folder, 'helloworld.txt') if args.trace_folder else 'helloworld.txt'
    
    # Create trace_folder if it doesn't exist and a path was provided
    if args.trace_folder:
        os.makedirs(args.trace_folder, exist_ok=True)
    
    # Write to a file for testing purposes
    with open(file_path, 'w') as f:
        f.write('Hello, World! This file was created for testing.')
    print(f"Created {file_path}")
    print("Test Success")
    return 0

if __name__ == "__main__":
    exit(main())