"""
STIC Agent - Windows Hardware & Software Collector
Native Python implementation using Win32 kernel APIs and Windows Registry.
Zero external commands or suspicious subprocesses to ensure clean execution.
"""

import os
import sys
import socket
import platform
import uuid
import json
import shutil
import struct
import ctypes
from ctypes import wintypes

try:
    import winreg
except ImportError:
    winreg = None


def get_smbios_hardware_info():
    """
    Retrieve real hardware Serial Number and UUID from SMBIOS via GetSystemFirmwareTable.
    100% native kernel32 call, avoids WMI/PowerShell subprocesses.
    """
    info = {
        "serialNumber": "",
        "uuid": "",
        "baseboardSerial": ""
    }

    try:
        RSMB = 0x52534D42  # 'RSMB' table provider
        kernel32 = ctypes.windll.kernel32
        buf_size = kernel32.GetSystemFirmwareTable(RSMB, 0, None, 0)
        if buf_size <= 0:
            return info

        buf = ctypes.create_string_buffer(buf_size)
        if kernel32.GetSystemFirmwareTable(RSMB, 0, buf, buf_size) != buf_size:
            return info

        raw = buf.raw
        data = raw[8:]  # Skip RawSMBIOSData header
        idx = 0
        while idx < len(data) - 4:
            table_type = data[idx]
            length = data[idx + 1]
            if length < 4:
                break

            str_start = idx + length
            strings = []
            cur_str = b''
            p = str_start
            while p < len(data) - 1:
                if data[p] == 0:
                    if cur_str:
                        strings.append(cur_str.decode('utf-8', errors='ignore').strip())
                        cur_str = b''
                    if data[p + 1] == 0:
                        break
                else:
                    cur_str += bytes([data[p]])
                p += 1

            # Type 1: System Information (Manufacturer, Product, Serial, UUID)
            if table_type == 1:
                if length > 7:
                    sn_idx = data[idx + 7]
                    if 0 < sn_idx <= len(strings):
                        sn_val = strings[sn_idx - 1].strip()
                        if sn_val and sn_val.lower() not in ("none", "default string", "to be filled by o.e.m."):
                            info["serialNumber"] = sn_val
                if length >= 24:
                    raw_uuid = data[idx + 8:idx + 24]
                    if any(raw_uuid):
                        info["uuid"] = raw_uuid.hex().upper()

            # Type 2: Baseboard Information
            if table_type == 2:
                if length > 7:
                    sn_idx = data[idx + 7]
                    if 0 < sn_idx <= len(strings):
                        info["baseboardSerial"] = strings[sn_idx - 1].strip()

            next_idx = p + 2
            if next_idx <= idx:
                break
            idx = next_idx

    except Exception:
        pass

    return info


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
    """Retrieve Motherboard, Manufacturer, Model, and Serial Number via Registry & SMBIOS."""
    smbios = get_smbios_hardware_info()
    info = {
        "brand": "Desconocida",
        "model": "Desconocido",
        "serialNumber": smbios.get("serialNumber") or "",
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
        if not info["serialNumber"] and serial:
            info["serialNumber"] = serial
        if board_mfg or board_prod:
            info["motherboard"] = f"{board_mfg} {board_prod}".strip()

        winreg.CloseKey(key)
    except Exception:
        pass

    # Fallback to MachineGuid if no hardware serial exists
    if not info["serialNumber"]:
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography")
            guid, _ = winreg.QueryValueEx(key, "MachineGuid")
            info["serialNumber"] = f"ID-{str(guid)[:8].upper()}"
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

    return ", ".join(gpu_list) if gpu_list else "Intel(R) HD Graphics"


def get_network_info():
    """Retrieve local IP address, hostname, network adapter card name and MAC."""
    hostname = socket.gethostname()
    ip_address = "127.0.0.1"
    try:
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

    nic_name = ""
    if winreg:
        try:
            net_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}")
            i = 0
            while True:
                try:
                    subkey = winreg.EnumKey(net_key, i)
                    if subkey.isdigit():
                        sub = winreg.OpenKey(net_key, subkey)
                        try:
                            desc, _ = winreg.QueryValueEx(sub, "DriverDesc")
                            desc_str = str(desc).strip()
                            if desc_str and not any(skip in desc_str.lower() for skip in ["miniport", "kernel", "virtual", "tap-", "pseudo", "bluetooth", "pacer"]):
                                nic_name = desc_str
                                winreg.CloseKey(sub)
                                break
                        except Exception:
                            pass
                        winreg.CloseKey(sub)
                    i += 1
                except OSError:
                    break
            winreg.CloseKey(net_key)
        except Exception:
            pass

    if nic_name:
        network_summary = f"NIC: {nic_name} | IP: {ip_address} | MAC: {mac_hex}"
    else:
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

                    if name and system_component != "1" and not parent_key:
                        clean_name = name.replace('\xa0', ' ').strip()
                        norm = f"{clean_name}::{version}".lower()
                        if norm not in seen:
                            seen.add(norm)
                            software_list.append({
                                "name": clean_name,
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


def detect_antivirus(software_list):
    """
    Detect active antivirus / endpoint security software from installed applications.
    """
    av_keywords = [
        ("kaspersky", "Kaspersky Endpoint Security"),
        ("eset", "ESET Endpoint Security"),
        ("sophos", "Sophos Endpoint"),
        ("bitdefender", "Bitdefender Endpoint Security"),
        ("symantec", "Symantec Endpoint Protection"),
        ("norton", "Norton Security"),
        ("mcafee", "McAfee Endpoint Security"),
        ("trellix", "Trellix Endpoint Security"),
        ("trend micro", "Trend Micro Apex One"),
        ("crowdstrike", "CrowdStrike Falcon Sensor"),
        ("sentinelone", "SentinelOne Agent"),
        ("avast", "Avast Business Antivirus"),
        ("avg", "AVG AntiVirus"),
        ("malwarebytes", "Malwarebytes Endpoint"),
        ("defender", "Microsoft Defender Antivirus"),
    ]

    detected = []
    for s in software_list:
        name_lower = s["name"].lower()
        pub_lower = s["publisher"].lower()
        for kw, label in av_keywords:
            if kw in name_lower or kw in pub_lower:
                if "agente de red" in name_lower:
                    detected.append(s["name"])
                else:
                    detected.insert(0, s["name"])
                break

    if detected:
        return detected[0]

    return "Windows Defender"


def collect_system_data(organization_slug="stic"):
    """Aggregate complete hardware and software inventory."""
    hostname, ip_address, network_summary = get_network_info()
    bios = get_bios_info()
    cpu = get_cpu_info()
    ram = get_memory_info()
    disk = get_disk_info()
    gpu = get_gpu_info()
    software = get_installed_software()
    antivirus = detect_antivirus(software)

    username = os.environ.get("USERNAME") or os.environ.get("USER") or "Usuario Local"
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
        "agentVersion": antivirus
    }

    return payload


if __name__ == "__main__":
    print("Recolectando informacion del sistema con Python...")
    data = collect_system_data()
    print("\n--- RESUMEN RECOLECTADO ---")
    print(f"Equipo:        {data['hostname']}")
    print(f"ID Device / SN:{data['serialNumber']}")
    print(f"Antivirus:     {data['agentVersion']}")
    print(f"IP:            {data['ipAddress']}")
    print(f"Usuario:       {data['assignedUser']}")
    print(f"Marca/Modelo:  {data['brand']} / {data['model']}")
    print(f"CPU:           {data['cpuModel']}")
    print(f"RAM:           {data['ramSummary']}")
    print(f"Disco:         {data['storageSummary']}")
    print(f"Software:      {len(data['installedSoftware'])} programas detectados")
