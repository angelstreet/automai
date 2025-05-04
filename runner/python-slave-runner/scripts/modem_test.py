import subprocess
import json
import platform
import argparse

def ping_test(host="8.8.8.8", count=4):
    """Test connectivity by pinging a host."""
    param = "-n" if platform.system().lower() == "windows" else "-c"
    cmd = ["ping", param, str(count), host]
    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"Ping to {host} successful.")
        return True
    except subprocess.CalledProcessError:
        print(f"Ping to {host} failed. No connectivity.")
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
        return None
    except json.JSONDecodeError as e:
        print(f"Error parsing iperf3 JSON output for {test_type}: {e}")
        print(f"iperf3 stdout: {result.stdout}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Test modem connectivity and speeds.")
    parser.add_argument("-ping_server", default="8.8.8.8", help="Ping server (default: 8.8.8.8).")
    parser.add_argument("-iperf_server", default="iperf.worldstream.nl", help="iperf3 server (default: iperf.worldstream.nl).")
    args = parser.parse_args()

    print("Starting modem test...")
    if not ping_test(args.ping_server):
        print("No connectivity. Aborting.")
        print("Test Fail")
        return 1

    print(f"\nRunning download test with {args.iperf_server}...")
    download_speed = run_iperf_test(args.iperf_server, test_type="download")
    if download_speed:
        print(f"Download Speed: {download_speed:.2f} Mbps")
    else:
        print("Download test failed.")
        print("Test Fail")
        return 1

    print(f"\nRunning upload test with {args.iperf_server}...")
    upload_speed = run_iperf_test(args.iperf_server, test_type="upload")
    if upload_speed:
        print(f"Upload Speed: {upload_speed:.2f} Mbps")
        print("Test Success")
        return 0
    else:
        print("Upload test failed.")
        print("Test Fail")
        return 1

    

if __name__ == "__main__":
    main()
