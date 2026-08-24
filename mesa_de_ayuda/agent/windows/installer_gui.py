"""
STIC Agent - Modern Windows GUI Installer (Tkinter)
Native Windows UI, zero external dependencies, 100% clean and antivirus-friendly.
"""

import os
import sys
import tkinter as tk
from tkinter import ttk, messagebox
import threading

from agent import install, uninstall, load_config, perform_sync
from collector import collect_system_data
from sync import sync_to_server

I18N = {
    "ES": {
        "title": "Instalador STIC Agent - Mesa de Ayuda",
        "header_title": "STIC Agent",
        "header_sub": "Asistente de Configuracion e Instalacion de Inventario",
        "lang_label": "Idioma / Language:",
        "server_label": "URL del Servidor Mesa de Ayuda:",
        "server_hint": "Ejemplo: https://mesa-de-ayuda-rho.vercel.app",
        "org_label": "Organizacion (Slug):",
        "org_hint": "Identificador de la entidad asignada (ejemplo: stic)",
        "interval_label": "Frecuencia de Sincronizacion (minutos):",
        "interval_hint": "Intervalo de tiempo entre recolecciones (recomendado: 30 min)",
        "btn_test": "Probar Conexion",
        "btn_install": "Instalar e Iniciar Servicio",
        "btn_uninstall": "Desinstalar Agente",
        "status_testing": "Probando conexion con el servidor...",
        "status_installing": "Instalando agente y registrando en el sistema...",
        "status_idle": "Listo para configurar e instalar.",
        "success_title": "Instalacion Exitosa",
        "success_msg": "El Agente STIC ha sido instalado correctamente.\n\nSe ha registrado en 'Programas y caracteristicas' y continuara sincronizandose en segundo plano.",
        "test_ok": "Conexion exitosa con el servidor.",
        "test_fail": "No se pudo contactar el servidor: ",
        "validation_err": "Por favor complete la URL del servidor y el slug de la organizacion.",
        "footer": "v2.0.0 (Windows Native) - Alcaldia de Yopal / STIC"
    },
    "EN": {
        "title": "STIC Agent Setup - Help Desk",
        "header_title": "STIC Agent",
        "header_sub": "Inventory Configuration and Installation Wizard",
        "lang_label": "Language / Idioma:",
        "server_label": "Help Desk Server URL:",
        "server_hint": "Example: https://mesa-de-ayuda-rho.vercel.app",
        "org_label": "Organization Slug:",
        "org_hint": "Identifier assigned to your organization (example: stic)",
        "interval_label": "Sync Frequency (minutes):",
        "interval_hint": "Time between inventory collections (recommended: 30 min)",
        "btn_test": "Test Connection",
        "btn_install": "Install and Start Service",
        "btn_uninstall": "Uninstall Agent",
        "status_testing": "Testing server connection...",
        "status_installing": "Installing agent and registering with system...",
        "status_idle": "Ready to configure and install.",
        "success_title": "Installation Complete",
        "success_msg": "STIC Agent has been successfully installed.\n\nRegistered in Windows Programs & Features and syncing in the background.",
        "test_ok": "Successfully connected to server.",
        "test_fail": "Could not connect to server: ",
        "validation_err": "Please enter both the server URL and organization slug.",
        "footer": "v2.0.0 (Windows Native) - STIC Help Desk"
    }
}


class InstallerApp:
    def __init__(self, root):
        self.root = root
        self.current_lang = "ES"
        self.config = load_config()

        self.root.title(I18N[self.current_lang]["title"])
        self.root.geometry("560x570")
        self.root.resizable(False, False)
        self.root.configure(bg="#F8FAFC")

        # Center window
        self.root.eval('tk::PlaceWindow . center')

        self.setup_styles()
        self.build_ui()
        self.update_texts()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")
        
        style.configure("TLabel", background="#F8FAFC", font=("Segoe UI", 9))
        style.configure("TEntry", font=("Segoe UI", 10), padding=4)
        style.configure("Primary.TButton", font=("Segoe UI Semibold", 10), background="#0284C7", foreground="#FFFFFF", borderwidth=0, padding=8)
        style.map("Primary.TButton", background=[("active", "#0369A1")])
        style.configure("Secondary.TButton", font=("Segoe UI", 9), background="#E2E8F0", foreground="#1E293B", borderwidth=0, padding=6)
        style.map("Secondary.TButton", background=[("active", "#CBD5E1")])

    def build_ui(self):
        # 1. Header Panel
        header = tk.Frame(self.root, bg="#0F172A", height=85)
        header.pack(fill="x", side="top")

        self.lbl_head_title = tk.Label(header, text="STIC Agent", font=("Segoe UI", 15, "bold"), fg="#FFFFFF", bg="#0F172A")
        self.lbl_head_title.place(x=25, y=14)

        self.lbl_head_sub = tk.Label(header, text="", font=("Segoe UI", 9), fg="#94A3B8", bg="#0F172A")
        self.lbl_head_sub.place(x=25, y=46)

        # Language dropdown
        self.lang_var = tk.StringVar(value="Espanol")
        self.combo_lang = ttk.Combobox(header, textvariable=self.lang_var, values=["Espanol", "English"], state="readonly", width=10, font=("Segoe UI", 9))
        self.combo_lang.place(x=430, y=28)
        self.combo_lang.bind("<<ComboboxSelected>>", self.on_lang_change)

        self.lbl_lang_hint = tk.Label(header, text="Idioma", font=("Segoe UI", 8), fg="#94A3B8", bg="#0F172A")
        self.lbl_lang_hint.place(x=430, y=10)

        # 2. Main Content
        content = tk.Frame(self.root, bg="#F8FAFC", padx=25, pady=15)
        content.pack(fill="both", expand=True)

        # Field: Server URL
        self.lbl_server = tk.Label(content, text="", font=("Segoe UI Semibold", 9), fg="#1E293B", bg="#F8FAFC")
        self.lbl_server.pack(anchor="w", pady=(5, 2))

        self.entry_server = ttk.Entry(content, width=60)
        self.entry_server.insert(0, self.config.get("serverUrl", "https://mesa-de-ayuda-rho.vercel.app"))
        self.entry_server.pack(fill="x", pady=(0, 2))

        self.lbl_server_hint = tk.Label(content, text="", font=("Segoe UI", 8), fg="#64748B", bg="#F8FAFC")
        self.lbl_server_hint.pack(anchor="w", pady=(0, 10))

        # Field: Organization Slug
        self.lbl_org = tk.Label(content, text="", font=("Segoe UI Semibold", 9), fg="#1E293B", bg="#F8FAFC")
        self.lbl_org.pack(anchor="w", pady=(0, 2))

        self.entry_org = ttk.Entry(content, width=60)
        self.entry_org.insert(0, self.config.get("organizationSlug", "stic"))
        self.entry_org.pack(fill="x", pady=(0, 2))

        self.lbl_org_hint = tk.Label(content, text="", font=("Segoe UI", 8), fg="#64748B", bg="#F8FAFC")
        self.lbl_org_hint.pack(anchor="w", pady=(0, 10))

        # Field: Interval
        self.lbl_interval = tk.Label(content, text="", font=("Segoe UI Semibold", 9), fg="#1E293B", bg="#F8FAFC")
        self.lbl_interval.pack(anchor="w", pady=(0, 2))

        self.entry_interval = ttk.Entry(content, width=60)
        self.entry_interval.insert(0, str(self.config.get("syncIntervalMinutes", 30)))
        self.entry_interval.pack(fill="x", pady=(0, 2))

        self.lbl_interval_hint = tk.Label(content, text="", font=("Segoe UI", 8), fg="#64748B", bg="#F8FAFC")
        self.lbl_interval_hint.pack(anchor="w", pady=(0, 12))

        # Status text
        self.lbl_status = tk.Label(content, text="", font=("Segoe UI Italic", 8), fg="#0284C7", bg="#F8FAFC")
        self.lbl_status.pack(anchor="w", pady=(0, 10))

        # Action Buttons
        btn_frame = tk.Frame(content, bg="#F8FAFC")
        btn_frame.pack(fill="x", pady=(5, 0))

        self.btn_test = ttk.Button(btn_frame, text="", style="Secondary.TButton", command=self.on_test_connection)
        self.btn_test.pack(side="left", padx=(0, 8))

        self.btn_install = ttk.Button(btn_frame, text="", style="Primary.TButton", command=self.on_install)
        self.btn_install.pack(side="left", fill="x", expand=True)

        # 3. Footer
        footer = tk.Frame(self.root, bg="#F8FAFC", pady=10)
        footer.pack(fill="x", side="bottom")

        self.lbl_footer = tk.Label(footer, text="", font=("Segoe UI", 8), fg="#94A3B8", bg="#F8FAFC")
        self.lbl_footer.pack()

    def on_lang_change(self, event=None):
        self.current_lang = "EN" if self.lang_var.get() == "English" else "ES"
        self.update_texts()

    def update_texts(self):
        t = I18N[self.current_lang]
        self.root.title(t["title"])
        self.lbl_head_title.config(text=t["header_title"])
        self.lbl_head_sub.config(text=t["header_sub"])
        self.lbl_lang_hint.config(text=t["lang_label"])
        self.lbl_server.config(text=t["server_label"])
        self.lbl_server_hint.config(text=t["server_hint"])
        self.lbl_org.config(text=t["org_label"])
        self.lbl_org_hint.config(text=t["org_hint"])
        self.lbl_interval.config(text=t["interval_label"])
        self.lbl_interval_hint.config(text=t["interval_hint"])
        self.btn_test.config(text=t["btn_test"])
        self.btn_install.config(text=t["btn_install"])
        self.lbl_status.config(text=t["status_idle"])
        self.lbl_footer.config(text=t["footer"])

    def on_test_connection(self):
        server = self.entry_server.get().strip()
        org = self.entry_org.get().strip()
        t = I18N[self.current_lang]

        if not server or not org:
            messagebox.showwarning(t["title"], t["validation_err"])
            return

        self.lbl_status.config(text=t["status_testing"])
        self.root.update()

        def test_worker():
            payload = collect_system_data(org)
            ok, msg, aid = sync_to_server(payload, server_url=server)
            if ok:
                self.root.after(0, lambda: messagebox.showinfo(t["title"], f"{t['test_ok']}\n\nID de Activo: {aid}"))
                self.root.after(0, lambda: self.lbl_status.config(text=f"OK: {msg}"))
            else:
                self.root.after(0, lambda: messagebox.showerror(t["title"], f"{t['test_fail']}\n{msg}"))
                self.root.after(0, lambda: self.lbl_status.config(text=f"Fallo: {msg}"))

        threading.Thread(target=test_worker, daemon=True).start()

    def on_install(self):
        server = self.entry_server.get().strip()
        org = self.entry_org.get().strip()
        interval = self.entry_interval.get().strip()
        t = I18N[self.current_lang]

        if not server or not org:
            messagebox.showwarning(t["title"], t["validation_err"])
            return

        self.btn_install.config(state="disabled")
        self.lbl_status.config(text=t["status_installing"])
        self.root.update()

        def install_worker():
            try:
                ok = install(server_url=server, org_slug=org, interval=interval)
                if ok:
                    self.root.after(0, lambda: messagebox.showinfo(t["success_title"], t["success_msg"]))
                    self.root.after(0, self.root.destroy)
                else:
                    self.root.after(0, lambda: messagebox.showinfo(t["success_title"], f"Agente instalado en el sistema.\nNota de sincronizacion: Revise conexion al servidor."))
                    self.root.after(0, self.root.destroy)
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Error", str(e)))
                self.root.after(0, lambda: self.btn_install.config(state="normal"))

        threading.Thread(target=install_worker, daemon=True).start()


def main():
    root = tk.Tk()
    app = InstallerApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
