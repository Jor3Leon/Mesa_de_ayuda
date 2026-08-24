"""
STIC Agent - Windows Hardware & Software Collector
Native Python implementation using Windows Registry and Win32 APIs.
No external subprocesses or suspicious command invocations.
"""

import os
import sys
import socket
import platform
import uuid
import json
import shutil
import ctypes
from ctypes import wintypes

try:
    import winreg
except ImportError:
    winreg = None


def get_memory_info():
    """Retrieve total and available RAM in GB using GlobalMemoryStatusEx."""
    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ("dwLength", wintypes.DWORD),
            ("dwMemoryLoad", wintypes.DWORD),
            ("ullTotalPhys", wintypes.ULARGE_INTEGER),
            ("ullAvailPhys", wintypes.ULARGE_INTEGER),
            ("ullTotalPageFile", wintypes.ULARGE_INTEGER),
            ("ullAvailPageFile", wintypes.ULARGE_INTEGER),
            ("ullTotalVirtual", wintypes.ULARGE_INTEGER),
            ("ullAvailVirtual", wintypes.ULARGE_INTEGER),
            ("ullAvailExtendedVirtual", wintypes.ULARGE_INTEGER),
        ]

    try:
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            total_gb = round(stat.ullTotalPhys / (1024 ** 3), 1)
            avail_gb = round(stat.ullAvailPhys / (1024 ** 3), 1)
            return f"{total_gb} GB ({avail_gb} GB libre)"
    except Exception:
        pass
    return "Desconocida"


def get_disk_info():
    """Retrieve primary storage disk summary."""
    try:
        total, used, free = shutil.disk_usage("C:\\")
        total_gb = round(total / (1024 ** 3), 1)
        free_gb = round(free / (1024 ** 3), 1)
        return f"Disco C: {total_gb} GB ({free_gb} GB libres)"
    except Exception:
        return "Desconocido"


def get_bios_info():
    """Retrieve Motherboard, Manufacturer, Model, and Serial Number via Registry."""
    info = {
        "brand": "Desconocida",
        "model": "Desconocido",
        "serialNumber": "",
        "motherboard": "Desconocida"
    }

    if not winreg:
        return info

    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\BIOS")
        
        def read_val(name):
            try:
                val, _ = winreg.QueryValueEx(key, name)
                return str(val).strip()
            except Exception:
                return ""

        mfg = read_val("SystemManufacturer")
        prod = read_val("SystemProductName")
        serial = read_val("SystemSerialNumber")
        board_mfg = read_val("BaseBoardManufacturer")
        board_prod = read_val("BaseBoardProduct")

        if mfg: info["brand"] = mfg
        if prod: info["model"] = prod
        if serial: info["serialNumber"] = serial
        if board_mfg or board_prod:
            info["motherboard"] = f"{board_mfg} {board_prod}".strip()

        winreg.CloseKey(key)
    except Exception:
        pass

    return info


def get_cpu_info():
    """Retrieve detailed CPU name and architecture."""
    cpu_name = platform.processor()
    if winreg:
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
            val, _ = winreg.QueryValueEx(key, "ProcessorNameString")
            if val:
                cpu_name = str(val).strip()
            winreg.CloseKey(key)
        except Exception:
            pass
    return cpu_name or "Desconocido"


def get_gpu_info():
    """Retrieve GPU information from Windows Display settings."""
    gpu_list = []
    if winreg:
        try:
            # Enumerate video adapters in registry
            video_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}")
            i = 0
            while True:
                try:
                    subkey_name = winreg.EnumKey(video_key, i)
                    if subkey_name.isdigit():
                        sub = winreg.OpenKey(video_key, subkey_name)
                        try:
                            driver_desc, _ = winreg.QueryValueEx(sub, "DriverDesc")
                            if driver_desc and str(driver_desc) not in gpu_list:
                                gpu_list.append(str(driver_desc))
                        except Exception:
                            pass
                        winreg.CloseKey(sub)
                    i += 1
                except OSError:
                    break
            winreg.CloseKey(video_key)
        except Exception:
            pass

    return ", ".join(gpu_list) if gpu_list else "Adaptador gráfico estándar"


def get_network_info():
    """Retrieve local IP address, hostname and MAC."""
    hostname = socket.gethostname()
    ip_address = "127.0.0.1"
    try:
        # Connect to external UDP socket to determine best local routing interface IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
    except Exception:
        try:
            ip_address = socket.gethostbyname(hostname)
        except Exception:
            pass

    mac_hex = ':'.join(['{:02x}'.format((uuid.getnode() >> ele) & 0xff) for ele in range(0, 8*6, 8)][::-1])
    network_summary = f"IP: {ip_address} | MAC: {mac_hex}"
    
    return hostname, ip_address, network_summary


def get_installed_software():
    """
    Read installed applications directly from 64-bit, 32-bit and User Registry hives.
    Fast, reliable, and does not trigger heuristic antivirus blockers.
    """
    if not winreg:
        return []

    software_list = []
    seen = set()

    hives_and_flags = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_WOW64_64KEY),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_WOW64_32KEY),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", 0),
    ]

    for hive, subkey_path, flags in hives_and_flags:
        try:
            access = winreg.KEY_READ | flags if flags else winreg.KEY_READ
            uninstall_key = winreg.OpenKey(hive, subkey_path, 0, access)
            count = winreg.QueryInfoKey(uninstall_key)[0]

            for i in range(count):
                try:
                    app_key_name = winreg.EnumKey(uninstall_key, i)
                    app_key = winreg.OpenKey(uninstall_key, app_key_name, 0, access)

                    def get_val(name):
                        try:
                            val, _ = winreg.QueryValueEx(app_key, name)
                            return str(val).strip()
                        except Exception:
                            return ""

                    name = get_val("DisplayName")
                    version = get_val("DisplayVersion")
                    publisher = get_val("Publisher")
                    system_component = get_val("SystemComponent")
                    parent_key = get_val("ParentKeyName")

                    # Skip system components, updates, or empty names
                    if name and system_component != "1" and not parent_key:
                        norm = f"{name}::{version}".lower()
                        if norm not in seen:
                            seen.add(norm)
                            software_list.append({
                                "name": name,
                                "version": version or "1.0",
                                "publisher": publisher or "Desconocido"
                            })

                    winreg.CloseKey(app_key)
                except Exception:
                    continue

            winreg.CloseKey(uninstall_key)
        except Exception:
            continue

    software_list.sort(key=lambda x: x["name"].lower())
    return software_list


def collect_system_data(organization_slug="stic"):
    """Aggregate complete hardware and software inventory."""
    hostname, ip_address, network_summary = get_network_info()
    bios = get_bios_info()
    cpu = get_cpu_info()
    ram = get_memory_info()
    disk = get_disk_info()
    gpu = get_gpu_info()
    software = get_installed_software()

    # Determine assigned user
    username = os.environ.get("USERNAME") or os.environ.get("USER") or "Usuario Local"
    user_domain = os.environ.get("USERDOMAIN")
    if user_domain and user_domain.lower() != hostname.lower():
        assigned_user = f"{user_domain}\\{username}"
    else:
        assigned_user = username

    os_type = "Windows"
    os_version = f"{platform.system()} {platform.release()} (Build {platform.version()})"

    device_type = "PC de Escritorio (Desktop)"
    brand_lower = bios["brand"].lower()
    model_lower = bios["model"].lower()
    if any(k in model_lower or k in brand_lower for k in ["laptop", "notebook", "thinkpad", "latitude", "elitebook", "surface", "zenbook"]):
        device_type = "Portatil (Laptop)"

    payload = {
        "hostname": hostname,
        "serialNumber": bios["serialNumber"] or f"SN-{hostname}",
        "ipAddress": ip_address,
        "osType": os_type,
        "osVersion": os_version,
        "status": "ONLINE",
        "brand": bios["brand"],
        "model": bios["model"],
        "deviceType": device_type,
        "cpuModel": cpu,
        "ramSummary": ram,
        "storageSummary": disk,
        "networkSummary": network_summary,
        "motherboard": bios["motherboard"],
        "graphicsInfo": gpu,
        "displayInfo": "Pantalla principal",
        "assignedUser": assigned_user,
        "installedSoftware": software,
        "organizationSlug": organization_slug,
        "agentVersion": "2.0.0-py"
    }

    return payload


if __name__ == "__main__":
    print("Recolectando informacion del sistema con Python...")
    data = collect_system_data()
    print("\n--- RESUMEN RECOLECTADO ---")
    print(f"Equipo:        {data['hostname']}")
    print(f"IP:            {data['ipAddress']}")
    print(f"Usuario:       {data['assignedUser']}")
    print(f"SO:            {data['osVersion']}")
    print(f"CPU:           {data['cpuModel']}")
    print(f"RAM:           {data['ramSummary']}")
    print(f"Disco:         {data['storageSummary']}")
    print(f"Marca/Modelo:  {data['brand']} / {data['model']}")
    print(f"Serial:        {data['serialNumber']}")
    print(f"Software:      {len(data['installedSoftware'])} programas detectados")
    print("\nPrimeros 5 programas detectados:")
    for s in data['installedSoftware'][:5]:
        print(f"  - {s['name']} (v{s['version']}) [{s['publisher']}]")
