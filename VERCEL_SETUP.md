# Vercel Setup Anleitung

## Supabase Umgebungsvariablen in Vercel konfigurieren

Das Login-System benötigt folgende Umgebungsvariablen in Vercel:

### 1. Öffne Vercel Dashboard
https://vercel.com/thomassander-pngs-projects/socialdash-dashboard/settings/environment-variables

### 2. Füge folgende Umgebungsvariablen hinzu:

**NEXT_PUBLIC_SUPABASE_URL**
```
https://gbjqrnoewwstnyuxflab.supabase.co
```

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdianFybm9ld3dzdG55dXhmbGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzM1NjIsImV4cCI6MjA4Mjk0OTU2Mn0.HLraj4p5iolSYgIYb6k7rMt65_WaYbE_wN-tm-yQ30A
```

### 3. Wähle die Umgebungen aus:
- ✅ Production
- ✅ Preview  
- ✅ Development

### 4. Speichere die Änderungen

### 5. Triggere ein neues Deployment
Gehe zu: https://vercel.com/thomassander-pngs-projects/socialdash-dashboard/deployments

Klicke auf "Redeploy" beim letzten Deployment.

## Login-Daten

Nach dem Deployment können Sie sich mit folgenden Daten anmelden:

**Login-URL:** https://socialdash-dashboard.vercel.app/auth/signin

**Email:** thomas.sander@famefact.com  
**Passwort:** SocialDAsh26ff.!!

## Wie das Login-System funktioniert

1. Benutzer öffnet `/auth/signin`
2. Gibt Email und Passwort ein
3. Supabase Auth validiert die Anmeldedaten
4. Bei Erfolg: JWT-Token wird in einem sicheren Cookie gespeichert
5. Middleware prüft bei jeder Anfrage ob der Token gültig ist
6. Wenn Token ungültig: Redirect zu `/auth/signin`
7. Logout: Cookie wird gelöscht und Redirect zu `/auth/signin`

## Sicherheitsfeatures

- ✅ JWT-Token mit 24h Gültigkeitsdauer
- ✅ Sichere Cookies (HttpOnly, Secure, SameSite=Strict)
- ✅ Middleware schützt alle Routen außer `/auth/signin`
- ✅ Supabase Auth für Benutzerverwaltung
- ✅ Logout-Funktion in der Sidebar
