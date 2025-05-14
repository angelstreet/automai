import subprocess
import json
import platform
import argparse
import requests
import time
import socket
import getpass
import sys

def get_host_ip():
    """Get the IP address of the machine running the script."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        print(f"Error getting host IP: {e}")
        return "Unknown"

def get_default_gateway():
    """Get the default gateway IP using system commands."""
    if platform.system().lower() == "windows":
        cmd = ["ipconfig"]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            for line in result.stdout.splitlines():
                if "Default Gateway" in line:
                    return line.split(":")[1].strip()
            return "Unknown"
        except Exception as e:
            print(f"Error getting default gateway on Windows: {e}")
            return "Unknown"
    elif platform.system().lower() == "darwin":  # macOS
        cmd = ["netstat", "-nr"]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            for line in result.stdout.splitlines():
                if "default" in line:
                    parts = line.split()
                    if len(parts) > 1:
                        return parts[1]
            return "Unknown"
        except Exception as e:
            print(f"Error getting default gateway on macOS: {e}")
            return "Unknown"
    else:  # Linux
        cmd = ["ip", "route"]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            for line in result.stdout.splitlines():
                if "default via" in line:
                    return line.split("via")[1].split()[0]
            return "Unknown"
        except Exception as e:
            print(f"Error getting default gateway on Linux: {e}")
            return "Unknown"

def get_public_gateway_url():
    """Get the public IP address of the network."""
    try:
        response = requests.get('https://api.ipify.org', timeout=5)
        if response.status_code == 200:
            return response.text
        else:
            print(f"Error getting public gateway URL: Status code {response.status_code}")
            return "Unknown"
    except Exception as e:
        print(f"Error getting public gateway URL: {e}")
        return "Unknown"

def get_ssid():
    """Get the SSID of the connected Wi-Fi network."""
    if platform.system().lower() == "windows":
        cmd = ["netsh", "wlan", "show", "interfaces"]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            for line in result.stdout.splitlines():
                if "SSID" in line:
                    return line.split(":")[1].strip()
            return "Unknown"
        except Exception as e:
            print(f"Error getting SSID on Windows: {e}")
            return "Unknown"
    elif platform.system().lower() == "darwin":  # macOS
        cmd = ["networksetup", "-getairportnetwork", "en0"]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            for line in result.stdout.splitlines():
                if "Current Wi-Fi Network:" in line:
                    return line.split(":")[1].strip()
            return "Unknown"
        except Exception as e:
            print(f"Error getting SSID on macOS with networksetup: {e}")
            # Fallback to airport command
            try:
                cmd_fallback = ["/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport", "-I"]
                result = subprocess.run(cmd_fallback, capture_output=True, text=True, check=True)
                for line in result.stdout.splitlines():
                    if " SSID:" in line:
                        return line.split(":")[1].strip()
                return "Unknown"
            except Exception as e2:
                print(f"Fallback error getting SSID on macOS with airport: {e2}")
                return "Unknown"
    else:  # Linux
        cmd = ["iwgetid", "-r"]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return result.stdout.strip()
        except Exception as e:
            print(f"Error getting SSID on Linux: {e}")
            return "Unknown"

def ping_test(host="8.8.8.8", count=4):
    """Test connectivity by making HTTP requests instead of using ping."""
    try:
        # Convert IP address to URL if needed
        if host == "8.8.8.8":
            url = "https://www.google.com"
        else:
            # If host is already a domain, use it, otherwise prepend https://
            url = host if host.startswith(("http://", "https://")) else f"https://{host}"
        
        print(f"Testing connectivity to {url}...")
        start_time = time.time()
        response = requests.get(url, timeout=5)
        end_time = time.time()
        
        if response.status_code < 400:
            print(f"Connection to {url} successful (Status: {response.status_code}, Time: {(end_time-start_time)*1000:.2f}ms)")
            return True
        else:
            print(f"Connection to {url} failed (Status: {response.status_code})")
            return False
    except requests.exceptions.RequestException as e:
        print(f"Connection to {host} failed: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error during connectivity test: {e}")
        return False

def run_iperf_test(server_ip, port=5201, test_type="download"):
    """Run iperf3 test for download or upload."""
    iperf_cmd = "C:\\Users\\sunri\\Desktop\\iperf3\\iperf3.exe" if platform.system().lower() == "windows" else "iperf3"
    if test_type == "download":
        cmd = [iperf_cmd, "-c", server_ip, "-p", str(port), "-t", "5", "-J"]
    else:
        cmd = [iperf_cmd, "-c", server_ip, "-p", str(port), "-t", "5", "-R", "-J"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        bandwidth = data["end"]["sum_received"]["bits_per_second"] / 1_000_000
        return bandwidth
    except subprocess.CalledProcessError as e:
        print(f"Error running iperf3 for {test_type} on {server_ip}: {e}")
        print(f"iperf3 stderr: {e.stderr}")
        return False
    except json.JSONDecodeError as e:
        print(f"Error parsing iperf3 JSON output for {test_type}: {e}")
        print(f"iperf3 stdout: {result.stdout}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Test modem connectivity and speeds.")
    parser.add_argument("-ping_server", default="8.8.8.8", help="Ping server (default: 8.8.8.8).")
    parser.add_argument("-iperf_server", default="iperf.worldstream.nl", help="iperf3 server (default: iperf.worldstream.nl).")
    args, unknown = parser.parse_known_args()  # Ignore unrecognized arguments

    print("Gathering system information before modem test...")
    host_ip = get_host_ip()
    username = getpass.getuser()
    default_gateway = get_default_gateway()
    public_gateway = get_public_gateway_url()
    ssid = get_ssid()

    print(f"Host IP: {host_ip}")
    print(f"Username: {username}")
    print(f"Default Gateway: {default_gateway}")
    print(f"Public Gateway URL: {public_gateway}")
    print(f"SSID: {ssid}")
    
    print("-" * 50 + "\n")  # Add separator line

    print("Starting modem test...")
    if not ping_test(args.ping_server):
        print("No connectivity. Aborting.")
        print("Test Fail")
        return sys.exit(1)

    print(f"\nRunning download test with {args.iperf_server}...")
    download_speed = run_iperf_test(args.iperf_server, test_type="download")
    if download_speed:
        print(f"Download Speed: {download_speed:.2f} Mbps")
    else:
        print("Test Failed: Download test failed.")
        return sys.exit(1)

    print(f"\nRunning upload test with {args.iperf_server}...")
    upload_speed = run_iperf_test(args.iperf_server, test_type="upload")
    if upload_speed:
        print(f"Upload Speed: {upload_speed:.2f} Mbps")
        print("Test Success")
        return sys.exit(0)
    else:
        print("Upload test failed.")
        print("Test Fail")
        return sys.exit(1)  

if __name__ == "__main__":
    main()
