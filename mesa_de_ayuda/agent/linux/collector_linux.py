"""
STIC Agent - Linux Hardware & Software Collector
Native Linux implementation using /sys, /proc, and standard package managers.
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


def read_file_safe(path):
    """Safely read a single line or content from a system file."""
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read().strip()
    except Exception:
        pass
    return ""


def get_dmi_info():
    """Retrieve Motherboard, Manufacturer, Model, and Serial Number via /sys/class/dmi/id."""
    dmi_path = "/sys/class/dmi/id"
    info = {
        "brand": read_file_safe(os.path.join(dmi_path, "sys_vendor")) or "Linux Device",
        "model": read_file_safe(os.path.join(dmi_path, "product_name")) or "Generic",
        "serialNumber": read_file_safe(os.path.join(dmi_path, "product_serial")),
        "uuid": read_file_safe(os.path.join(dmi_path, "product_uuid")),
        "motherboard": f"{read_file_safe(os.path.join(dmi_path, 'board_vendor'))} {read_file_safe(os.path.join(dmi_path, 'board_name'))}".strip() or "Standard Motherboard",
        "chassisType": read_file_safe(os.path.join(dmi_path, "chassis_type"))
    }

    # Filter out invalid placeholder serials
    if info["serialNumber"].lower() in ("none", "default string", "to be filled by o.e.m.", "0123456789", "system serial number", ""):
        info["serialNumber"] = ""

    # Fallback to /etc/machine-id or dbus machine-id
    if not info["serialNumber"]:
        machine_id = read_file_safe("/etc/machine-id") or read_file_safe("/var/lib/dbus/machine-id")
        if machine_id:
            info["serialNumber"] = f"LNX-{machine_id[:12].upper()}"
        else:
            info["serialNumber"] = f"LNX-{uuid.getnode():012X}"

    return info


def get_cpu_info():
    """Retrieve detailed CPU name and core count from /proc/cpuinfo."""
    cpu_model = "Procesador Generico"
    core_count = 0
    try:
        if os.path.exists("/proc/cpuinfo"):
            with open("/proc/cpuinfo", "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    if line.startswith("model name"):
                        cpu_model = line.split(":", 1)[1].strip()
                    elif line.startswith("processor"):
                        core_count += 1
    except Exception:
        pass

    if core_count > 0:
        return f"{cpu_model} ({core_count} Cores)"
    return cpu_model


def get_memory_info():
    """Retrieve total and available RAM in GB from /proc/meminfo."""
    try:
        mem_total_kb = 0
        mem_avail_kb = 0
        if os.path.exists("/proc/meminfo"):
            with open("/proc/meminfo", "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        mem_total_kb = int(line.split()[1])
                    elif line.startswith("MemAvailable:"):
                        mem_avail_kb = int(line.split()[1])

        if mem_total_kb > 0:
            total_gb = round(mem_total_kb / (1024 * 1024), 1)
            avail_gb = round(mem_avail_kb / (1024 * 1024), 1) if mem_avail_kb > 0 else 0
            return f"{total_gb} GB ({avail_gb} GB libre)"
    except Exception:
        pass
    return "Desconocida"


def get_disk_info():
    """Retrieve root partition storage capacity and free space."""
    try:
        total, used, free = shutil.disk_usage("/")
        total_gb = round(total / (1024 ** 3), 1)
        free_gb = round(free / (1024 ** 3), 1)
        return f"Disco Raiz (/): {total_gb} GB ({free_gb} GB libres)"
    except Exception:
        return "Desconocido"


def get_gpu_info():
    """Retrieve GPU information from lspci or drm subsystem."""
    gpu_list = []
    try:
        res = subprocess.run(["lspci"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        if res.returncode == 0:
            for line in res.stdout.splitlines():
                if "VGA" in line or "3D" in line or "Display" in line:
                    parts = line.split(":", 2)
                    gpu_list.append(parts[-1].strip() if len(parts) > 2 else line.strip())
    except Exception:
        pass

    if gpu_list:
        return ", ".join(gpu_list)
    return "Controlador Grafico Linux"


def get_network_info():
    """Retrieve local IP address, hostname and MAC."""
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
    network_summary = f"IP: {ip_address} | MAC: {mac_hex}"
    
    return hostname, ip_address, network_summary


def get_installed_software():
    """Retrieve installed software packages using native package managers (dpkg, rpm, pacman, snap)."""
    software_list = []
    seen = set()

    # 1. Debian / Ubuntu (dpkg)
    if shutil.which("dpkg-query"):
        try:
            res = subprocess.run(
                ["dpkg-query", "-W", "-f=${Package}|${Version}|${Maintainer}\n"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10
            )
            if res.returncode == 0:
                for line in res.stdout.splitlines():
                    parts = line.split("|")
                    if len(parts) >= 2 and parts[0].strip():
                        name = parts[0].strip()
                        version = parts[1].strip()
                        publisher = parts[2].strip() if len(parts) > 2 else "Debian/Ubuntu Package"
                        norm = f"{name}::{version}".lower()
                        if norm not in seen:
                            seen.add(norm)
                            software_list.append({"name": name, "version": version, "publisher": publisher})
        except Exception:
            pass

    # 2. RHEL / CentOS / Fedora / Rocky (rpm)
    elif shutil.which("rpm"):
        try:
            res = subprocess.run(
                ["rpm", "-qa", "--qf", "%{NAME}|%{VERSION}|%{VENDOR}\n"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10
            )
            if res.returncode == 0:
                for line in res.stdout.splitlines():
                    parts = line.split("|")
                    if len(parts) >= 2 and parts[0].strip():
                        name = parts[0].strip()
                        version = parts[1].strip()
                        publisher = parts[2].strip() if len(parts) > 2 else "RPM Package"
                        norm = f"{name}::{version}".lower()
                        if norm not in seen:
                            seen.add(norm)
                            software_list.append({"name": name, "version": version, "publisher": publisher})
        except Exception:
            pass

    # 3. Arch Linux (pacman)
    elif shutil.which("pacman"):
        try:
            res = subprocess.run(
                ["pacman", "-Q"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10
            )
            if res.returncode == 0:
                for line in res.stdout.splitlines():
                    parts = line.split()
                    if len(parts) >= 2:
                        name = parts[0].strip()
                        version = parts[1].strip()
                        software_list.append({"name": name, "version": version, "publisher": "Arch Linux"})
        except Exception:
            pass

    # 4. Snap Packages
    if shutil.which("snap"):
        try:
            res = subprocess.run(
                ["snap", "list"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5
            )
            if res.returncode == 0:
                lines = res.stdout.splitlines()[1:]
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 2:
                        name = f"snap:{parts[0]}"
                        version = parts[1]
                        publisher = parts[2] if len(parts) > 2 else "Canonical Snap"
                        software_list.append({"name": name, "version": version, "publisher": publisher})
        except Exception:
            pass

    software_list.sort(key=lambda x: x["name"].lower())
    return software_list


def detect_security(software_list):
    """Detect endpoint protection / security agents on Linux."""
    sec_keywords = [
        ("clamav", "ClamAV Antivirus"),
        ("falcon", "CrowdStrike Falcon Sensor"),
        ("sentinelone", "SentinelOne Agent"),
        ("wazuh", "Wazuh Agent"),
        ("osquery", "osquery Endpoint"),
        ("sophos", "Sophos Endpoint for Linux"),
        ("eset", "ESET Endpoint Security"),
        ("kaspersky", "Kaspersky Endpoint Security"),
        ("qualys", "Qualys Cloud Agent"),
        ("auditd", "Linux Audit Daemon"),
        ("apparmor", "AppArmor Security"),
        ("selinux", "SELinux Active")
    ]

    for s in software_list:
        name_lower = s["name"].lower()
        for kw, label in sec_keywords:
            if kw in name_lower:
                return label

    # Check active daemons in /proc or systemctl
    try:
        if os.path.exists("/usr/sbin/clamd") or os.path.exists("/usr/bin/freshclam"):
            return "ClamAV Antivirus"
    except Exception:
        pass

    return "Linux Native Security (AppArmor/SELinux)"


def detect_device_type(dmi_info):
    """
    Accurately classifies Linux computer hardware into:
    - 'Todo en Uno (AIO)'
    - 'Portátil (Laptop)'
    - 'PC de Escritorio (Desktop)'
    - 'Servidor (Server)'
    """
    chassis = str(dmi_info.get("chassisType", "")).strip()
    brand = (dmi_info.get("brand") or "").lower()
    model = (dmi_info.get("model") or "").lower()
    board = (dmi_info.get("motherboard") or "").lower()
    combined_str = f"{brand} {model} {board}".lower()

    # 1. 🖥️ All-in-One (AIO) Check
    # SMBIOS Chassis Type 13 = All-in-One
    if chassis == "13":
        return "Todo en Uno (AIO)"

    aio_keywords = [
        "all in one", "all-in-one", "all_in_one", "aio", "todo en uno",
        "touchsmart", "proone", "zen aio", "vivo aio", "expertcenter aio",
        "ideacentre aio", "thinkcentre aio", "optiplex aio", "vostro aio",
        "inspiron aio", "pavilion all-in-one", "pavilion aio", "imac",
        "surface studio"
    ]
    if any(kw in combined_str for kw in aio_keywords):
        return "Todo en Uno (AIO)"

    # Specific AIO model series
    if "optiplex" in combined_str and any(p in combined_str for p in ["74", "77", "54", "52", "32", "30"]) and ("aio" in combined_str or "all" in combined_str):
        return "Todo en Uno (AIO)"

    if "proone" in combined_str or "ideacentre aio" in combined_str:
        return "Todo en Uno (AIO)"

    # 2. 💻 Laptop / Portable Check
    # SMBIOS Chassis types: 8, 9, 10, 11, 14, 30, 31, 32 -> Laptop / Notebook / Subnotebook / Tablet
    if chassis in ("8", "9", "10", "11", "14", "30", "31", "32"):
        return "Portátil (Laptop)"

    laptop_keywords = [
        "laptop", "notebook", "thinkpad", "latitude", "elitebook", "probook",
        "surface book", "surface laptop", "surface pro", "surface go",
        "zenbook", "vivobook", "expertbook", "ideapad", "thinkbook", "yoga",
        "legion", "macbook", "pavilion x360", "envy x360", "spectre", "swift",
        "aspire", "travelmate", "predator", "nitro", "tuf gaming", "rog zephyrus",
        "rog strix", "alienware", "omen", "victus", "chromebook", "galaxy book",
        "vostro 13", "vostro 14", "vostro 15", "vostro 16",
        "inspiron 13", "inspiron 14", "inspiron 15", "inspiron 16"
    ]
    if any(kw in combined_str for kw in laptop_keywords):
        return "Portátil (Laptop)"

    # Check battery presence in /sys/class/power_supply
    if os.path.exists("/sys/class/power_supply"):
        try:
            supplies = os.listdir("/sys/class/power_supply")
            if any(s.startswith("BAT") for s in supplies):
                return "Portátil (Laptop)"
        except Exception:
            pass

    # 3. 🗄️ Server Check
    if chassis in ("17", "23", "28", "29"):
        return "Servidor (Server)"

    if any(k in combined_str for k in ["server", "proliant", "poweredge", "ucs", "primergy"]):
        return "Servidor (Server)"

    # 4. 🖥️ Default Desktop
    return "PC de Escritorio (Desktop)"



def collect_system_data(organization_slug="stic"):
    """Aggregate complete hardware and software inventory for Linux."""
    hostname, ip_address, network_summary = get_network_info()
    dmi = get_dmi_info()
    cpu = get_cpu_info()
    ram = get_memory_info()
    disk = get_disk_info()
    gpu = get_gpu_info()
    software = get_installed_software()
    security = detect_security(software)
    device_type = detect_device_type(dmi)

    username = os.environ.get("USER") or os.environ.get("LOGNAME") or "root"
    
    distro_name = ""
    try:
        if os.path.exists("/etc/os-release"):
            with open("/etc/os-release", "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("PRETTY_NAME="):
                        distro_name = line.split("=", 1)[1].strip().strip('"')
    except Exception:
        pass

    os_version = distro_name or f"{platform.system()} {platform.release()}"

    payload = {
        "hostname": hostname,
        "serialNumber": dmi["serialNumber"],
        "ipAddress": ip_address,
        "osType": "Linux",
        "osVersion": os_version,
        "status": "ONLINE",
        "brand": dmi["brand"],
        "model": dmi["model"],
        "deviceType": device_type,
        "cpuModel": cpu,
        "ramSummary": ram,
        "storageSummary": disk,
        "networkSummary": network_summary,
        "motherboard": dmi["motherboard"],
        "graphicsInfo": gpu,
        "displayInfo": "Servidor/Consola Linux",
        "assignedUser": username,
        "installedSoftware": software,
        "organizationSlug": organization_slug,
        "agentVersion": security
    }

    return payload


if __name__ == "__main__":
    print("Recolectando informacion del sistema Linux...")
    data = collect_system_data()
    print("\n--- RESUMEN RECOLECTADO (LINUX) ---")
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
    print(f"Software:      {len(data['installedSoftware'])} paquetes detectados")
