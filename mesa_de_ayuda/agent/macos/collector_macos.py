"""
STIC Agent - macOS Hardware & Software Collector
Native macOS implementation using system_profiler, sysctl, and Apple bundle metadata.
Compatible with Apple Silicon (M1/M2/M3/M4) and Intel Macs.
Zero external pip dependencies, pure Python 3.
"""

import os
import sys
import socket
import platform
import uuid
import json
import shutil
import subprocess


def run_cmd_json(args, timeout=15):
    """Run command and parse JSON output."""
    try:
        res = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout)
        if res.returncode == 0 and res.stdout.strip():
            return json.loads(res.stdout)
    except Exception:
        pass
    return None


def run_cmd_text(args, timeout=5):
    """Run command and return trimmed text output."""
    try:
        res = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout)
        if res.returncode == 0:
            return res.stdout.strip()
    except Exception:
        pass
    return ""


def get_hardware_info():
    """Retrieve Mac Model, Chip/Processor, RAM, and Serial Number via system_profiler."""
    info = {
        "brand": "Apple Inc.",
        "model": "Mac",
        "serialNumber": "",
        "uuid": "",
        "cpu": "Apple Silicon / Intel",
        "ram": "Memoria Unificada",
        "motherboard": "Apple Logic Board"
    }

    sp_data = run_cmd_json(["system_profiler", "SPHardwareDataType", "-json"])
    if sp_data and "SPHardwareDataType" in sp_data and len(sp_data["SPHardwareDataType"]) > 0:
        hw = sp_data["SPHardwareDataType"][0]
        
        info["model"] = hw.get("machine_name") or hw.get("machine_model") or "Mac"
        info["serialNumber"] = hw.get("serial_number", "").strip()
        info["uuid"] = hw.get("platform_UUID", "").strip()
        
        # Processor info (Apple Silicon chip_type vs Intel cpu_type)
        chip = hw.get("chip_type") or hw.get("cpu_type")
        cores = hw.get("number_processors") or hw.get("total_number_cores")
        if chip:
            info["cpu"] = f"{chip} ({cores} Cores)" if cores else chip
        
        # RAM
        memory = hw.get("physical_memory")
        if memory:
            info["ram"] = f"{memory} Unificada/RAM"
    else:
        # Fallback to sysctl
        model_id = run_cmd_text(["sysctl", "-n", "hw.model"])
        cpu_brand = run_cmd_text(["sysctl", "-n", "machdep.cpu.brand_string"])
        mem_bytes = run_cmd_text(["sysctl", "-n", "hw.memsize"])
        
        if model_id: info["model"] = model_id
        if cpu_brand: info["cpu"] = cpu_brand
        if mem_bytes and mem_bytes.isdigit():
            gb = round(int(mem_bytes) / (1024 ** 3), 1)
            info["ram"] = f"{gb} GB"

    if not info["serialNumber"]:
        io_serial = run_cmd_text(["ioreg", "-l"])
        # Fallback uuid
        info["serialNumber"] = f"MAC-{uuid.getnode():012X}"

    return info


def get_disk_info():
    """Retrieve Macintosh HD primary disk usage."""
    try:
        total, used, free = shutil.disk_usage("/")
        total_gb = round(total / (1024 ** 3), 1)
        free_gb = round(free / (1024 ** 3), 1)
        return f"Macintosh HD (/): {total_gb} GB ({free_gb} GB libres)"
    except Exception:
        return "Desconocido"


def get_network_info():
    """Retrieve computer name, IP, and MAC address."""
    hostname = run_cmd_text(["scutil", "--get", "ComputerName"]) or socket.gethostname()
    ip_address = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
    except Exception:
        try:
            ip_address = socket.gethostbyname(socket.gethostname())
        except Exception:
            pass

    mac_hex = ':'.join(['{:02x}'.format((uuid.getnode() >> ele) & 0xff) for ele in range(0, 8*6, 8)][::-1])
    network_summary = f"IP: {ip_address} | MAC: {mac_hex}"
    
    return hostname, ip_address, network_summary


def get_installed_software():
    """Retrieve installed applications from /Applications and system profiler."""
    software_list = []
    seen = set()

    # Fast scan of /Applications and /System/Applications
    search_paths = ["/Applications", "/System/Applications"]
    for base in search_paths:
        if not os.path.exists(base):
            continue
        try:
            entries = os.listdir(base)
            for item in entries:
                if item.endswith(".app"):
                    app_name = item[:-4]
                    plist_path = os.path.join(base, item, "Contents", "Info.plist")
                    version = "1.0"
                    
                    if os.path.exists(plist_path) and shutil.which("defaults"):
                        v = run_cmd_text(["defaults", "read", plist_path, "CFBundleShortVersionString"])
                        if v:
                            version = v
                    
                    norm = f"{app_name}::{version}".lower()
                    if norm not in seen:
                        seen.add(norm)
                        software_list.append({
                            "name": app_name,
                            "version": version,
                            "publisher": "Apple / macOS Application"
                        })
        except Exception:
            pass

    software_list.sort(key=lambda x: x["name"].lower())
    return software_list


def detect_security(software_list):
    """Detect endpoint protection / security solutions on macOS."""
    sec_keywords = [
        ("falcon", "CrowdStrike Falcon Sensor"),
        ("sentinelone", "SentinelOne macOS Agent"),
        ("defender", "Microsoft Defender for Endpoint (Mac)"),
        ("malwarebytes", "Malwarebytes for Mac"),
        ("sophos", "Sophos Endpoint Mac"),
        ("eset", "ESET Cyber Security"),
        ("kaspersky", "Kaspersky Endpoint Mac"),
        ("bitdefender", "Bitdefender Endpoint"),
        ("jamf", "Jamf Protect / Security"),
        ("carbon black", "VMware Carbon Black")
    ]

    for s in software_list:
        name_lower = s["name"].lower()
        for kw, label in sec_keywords:
            if kw in name_lower:
                return label

    return "Apple XProtect & Gatekeeper"


def detect_device_type(model_name):
    """
    Accurately classifies Apple Mac hardware into:
    - 'Todo en Uno (AIO)' (iMac)
    - 'Portátil (Laptop)' (MacBook / Air / Pro)
    - 'PC de Escritorio (Desktop)' (Mac mini / Mac Studio / Mac Pro)
    """
    model_lower = (model_name or "").lower()
    if "imac" in model_lower:
        return "Todo en Uno (AIO)"
    if any(k in model_lower for k in ["macbook", "air", "pro", "portable", "powerbook", "ibook"]):
        return "Portátil (Laptop)"
    return "PC de Escritorio (Desktop)"



def collect_system_data(organization_slug="stic"):
    """Aggregate complete hardware and software inventory for macOS."""
    hostname, ip_address, network_summary = get_network_info()
    hw = get_hardware_info()
    disk = get_disk_info()
    software = get_installed_software()
    security = detect_security(software)
    device_type = detect_device_type(hw["model"])

    username = os.environ.get("USER") or run_cmd_text(["whoami"]) or "Usuario Mac"
    
    os_ver_num = run_cmd_text(["sw_vers", "-productVersion"])
    os_build = run_cmd_text(["sw_vers", "-buildVersion"])
    os_version = f"macOS {os_ver_num} (Build {os_build})" if os_ver_num else f"macOS {platform.mac_ver()[0]}"

    payload = {
        "hostname": hostname,
        "serialNumber": hw["serialNumber"],
        "ipAddress": ip_address,
        "osType": "macOS",
        "osVersion": os_version,
        "status": "ONLINE",
        "brand": hw["brand"],
        "model": hw["model"],
        "deviceType": device_type,
        "cpuModel": hw["cpu"],
        "ramSummary": hw["ram"],
        "storageSummary": disk,
        "networkSummary": network_summary,
        "motherboard": hw["motherboard"],
        "graphicsInfo": "Apple Integrated GPU",
        "displayInfo": "Pantalla Retina / Integrada",
        "assignedUser": username,
        "installedSoftware": software,
        "organizationSlug": organization_slug,
        "agentVersion": security
    }

    return payload


if __name__ == "__main__":
    print("Recolectando informacion del sistema macOS...")
    data = collect_system_data()
    print("\n--- RESUMEN RECOLECTADO (MACOS) ---")
    print(f"Equipo:        {data['hostname']}")
    print(f"ID Device / SN:{data['serialNumber']}")
    print(f"Seguridad:     {data['agentVersion']}")
    print(f"SO:            {data['osVersion']}")
    print(f"IP:            {data['ipAddress']}")
    print(f"Usuario:       {data['assignedUser']}")
    print(f"Marca/Modelo:  {data['brand']} / {data['model']}")
    print(f"CPU:           {data['cpuModel']}")
    print(f"RAM:           {data['ramSummary']}")
    print(f"Disco:         {data['storageSummary']}")
    print(f"Software:      {len(data['installedSoftware'])} aplicaciones detectadas")
