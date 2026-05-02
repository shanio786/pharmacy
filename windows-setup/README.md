# PharmaCare — Windows LAN + Desktop Setup Guide

## Zaroorat kya hai? (Pehle yeh install karein)

| Software | Link | Notes |
|---|---|---|
| **Node.js LTS** | https://nodejs.org | "LTS" version download karein |
| **pnpm** | CMD mein: `npm install -g pnpm` | Node install hone ke baad |
| **PostgreSQL 15** | https://www.postgresql.org/download/windows/ | Password: `pharma123` rakho |
| **Git** | https://git-scm.com/download/win | Code download ke liye |

---

## STEP 1 — Code download karo (Pehli baar)

CMD (Command Prompt) mein:
```
git clone https://github.com/shanio786/pharmacy.git
cd pharmacy
pnpm install
```

---

## STEP 2 — Database setup karo (Pehli baar)

```
windows-setup\SETUP_DATABASE.bat
```

Yeh automatically:
- PostgreSQL mein database aur user banayega
- Tables create karega
- Admin user banayega (admin / admin123)
- Frontend build karega

---

## STEP 3 — Server start karo (Rozana)

```
windows-setup\START_SERVER.bat
```

Yeh screen par dikhayega:
```
  Is PC (server) par:    http://localhost:8081
  Dosre PCs par:         http://192.168.1.10:8081
```

---

## Dosre PCs / Counters par access

Server PC par START_SERVER.bat chalate rehne ke baad,
pharmacy ke dusre computers mein browser kholein aur daalo:

```
http://[SERVER_PC_KA_IP]:8081
```

**Server PC ka IP kaise pata karein:**
CMD mein `ipconfig` likho → "IPv4 Address" line dekho
(e.g. 192.168.1.10 ya 192.168.0.5)

---

## Firewall Setting (Ek baar karna hai)

Agar dosre PCs access nahi kar pa rahe, CMD **Admin mode** mein chalao:

```
netsh advfirewall firewall add rule name="PharmaCare API" dir=in action=allow protocol=TCP localport=8080
netsh advfirewall firewall add rule name="PharmaCare Web" dir=in action=allow protocol=TCP localport=8081
```

---

## Login Credentials

| Username | Password | Role |
|---|---|---|
| admin | admin123 | Admin (sab kuch) |
| manager | admin123 | Manager |

---

## Backup / Restore

**Rozana backup:**
```
windows-setup\BACKUP_DATA.bat
```
File `backups\` folder mein save hogi.

**Restore:**
```
windows-setup\RESTORE_DATA.bat
```

---

## Desktop App (.exe) — Bilkul Browser Nazar Na Aaye

Agar app ko bilkul browser ki tarah nahi, balke apni window mein khola chahte ho,
`pharmacare-electron\` folder mein Electron app hai.

```
cd windows-setup\pharmacare-electron
npm install
npm start
```

.exe installer banane ke liye:
```
npm run dist
```
`dist-installer\PharmaCare Setup 1.0.0.exe` ban jayega.

---

## Aam Masail

| Masla | Hal |
|---|---|
| "Port already in use" | Task Manager → node.exe band karo |
| Database connect nahi | Services.msc → postgresql-x64-15 → Start |
| Dosre PCs access nahi | Firewall rules (upar dekho) |
| Blank screen / error | SETUP_DATABASE.bat dobara chalao |
| Login nahi ho raha | admin / admin123 try karo |
